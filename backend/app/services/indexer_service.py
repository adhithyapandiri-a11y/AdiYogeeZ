import os
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Set
from collections import Counter
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.config import settings
from backend.app.models.schema import Repository, RepoFile, CodeSymbol, Dependency, CodeChunk, RepoCommit
from backend.app.services.github_service import GitHubService
from backend.app.services.parser_service import ParserService
from backend.app.services.rag_service import RAGService
from backend.app.services.llm_service import LLMService

class IndexerService:
    def __init__(self):
        self.github = GitHubService()
        self.parser = ParserService()
        self.llm = LLMService()
        self.rag = RAGService(self.llm)

    async def index_repository(self, session: AsyncSession, repo_id: int):
        """Executes the complete 8-stage intelligence indexing pipeline."""
        stmt = select(Repository).where(Repository.id == repo_id)
        res = await session.execute(stmt)
        repo = res.scalar_one_or_none()
        if not repo:
            return

        try:
            # Stage 1: Connecting to GitHub
            await self._update_status(session, repo_id, "Connecting to GitHub...", 10)
            owner, repo_name = repo.owner, repo.name
            meta = await self.github.get_repo_details(owner, repo_name)
            
            repo.stars = meta.get("stars", 0)
            repo.forks = meta.get("forks", 0)
            repo.description = meta.get("description", "")
            repo.default_branch = meta.get("default_branch", "main")
            repo.primary_language = meta.get("primary_language", "Unknown")
            await session.commit()

            # Stage 2: Retrieving repository files
            await self._update_status(session, repo_id, "Retrieving repository file tree...", 20)
            tree_items = await self.github.get_tree(owner, repo_name, repo.default_branch)

            # Filter source files
            source_candidates = [
                item for item in tree_items 
                if item.get("type") == "blob" and self.parser.is_source_code(item.get("path", ""))
            ]
            # Cap candidates to avoid hitting GitHub API limits
            candidate_files = source_candidates[:settings.MAX_FILES_PER_REPO]

            # Stage 3: Identifying programming languages & Downloading contents
            await self._update_status(session, repo_id, f"Downloading & analyzing {len(candidate_files)} files...", 35)
            
            languages_counter = Counter()
            all_file_paths: Set[str] = {item["path"] for item in candidate_files}
            files_to_insert: List[RepoFile] = []

            # Concurrently fetch files in batches of 10
            batch_size = 10
            for i in range(0, len(candidate_files), batch_size):
                batch = candidate_files[i:i + batch_size]
                tasks = [
                    self.github.get_file_content(owner, repo_name, item["path"], repo.default_branch)
                    for item in batch
                ]
                contents = await asyncio.gather(*tasks, return_exceptions=True)

                for item, content in zip(batch, contents):
                    if isinstance(content, str) and content.strip():
                        f_path = item["path"]
                        lang = self.parser.detect_language(f_path)
                        languages_counter[lang] += 1
                        
                        f_size = item.get("size", len(content.encode("utf-8")))
                        line_count = len(content.splitlines())
                        parts = f_path.split("/")
                        module_name = parts[0] if len(parts) > 1 else "root"

                        rf = RepoFile(
                            repository_id=repo_id,
                            file_path=f_path,
                            language=lang,
                            content=content,
                            file_size=f_size,
                            line_count=line_count,
                            module_name=module_name
                        )
                        files_to_insert.append(rf)

            session.add_all(files_to_insert)
            await session.commit()

            # Stage 4 & 5: Parsing source code & Extracting functions, classes, symbols
            await self._update_status(session, repo_id, "Parsing AST & extracting functions/classes...", 55)
            
            symbols_to_insert: List[CodeSymbol] = []
            file_symbols_map: Dict[str, List[Dict[str, Any]]] = {}
            file_imports_map: Dict[str, List[Dict[str, Any]]] = {}
            file_calls_map: Dict[str, List[Dict[str, Any]]] = {}
            file_inherits_map: Dict[str, List[Dict[str, Any]]] = {}
            file_api_map: Dict[str, List[Dict[str, Any]]] = {}
            file_data_map: Dict[str, List[Dict[str, Any]]] = {}

            total_functions = 0
            total_classes = 0

            for rf in files_to_insert:
                parsed = self.parser.parse_file(rf.file_path, rf.content)
                rf.architectural_role = parsed.get("architectural_role", "Unknown")
                file_symbols_map[rf.file_path] = parsed["symbols"]
                file_imports_map[rf.file_path] = parsed["imports"]
                file_calls_map[rf.file_path] = parsed["calls"]
                file_inherits_map[rf.file_path] = parsed.get("inherits", [])
                file_api_map[rf.file_path] = parsed.get("api_routes", [])
                file_data_map[rf.file_path] = parsed.get("data_ops", [])

                for s in parsed["symbols"]:
                    if s["symbol_type"] in ("function", "method"):
                        total_functions += 1
                    elif s["symbol_type"] == "class":
                        total_classes += 1

                    symbols_to_insert.append(CodeSymbol(
                        repository_id=repo_id,
                        file_id=rf.id,
                        name=s["name"],
                        symbol_type=s["symbol_type"],
                        start_line=s["start_line"],
                        end_line=s["end_line"],
                        source_code=s["source_code"],
                        parent_symbol=s["parent_symbol"],
                        file_path=rf.file_path
                    ))

            session.add_all(symbols_to_insert)
            await session.commit()

            # Stage 6: Building dependency relationships
            await self._update_status(session, repo_id, "Building dependency & call graph...", 70)
            
            dependencies_to_insert: List[Dependency] = []
            seen_deps = set()

            for rf in files_to_insert:
                # 1. Imports
                imports = file_imports_map.get(rf.file_path, [])
                for imp in imports:
                    mod_name = imp.get("module", "")
                    target_file = self.parser.resolve_import_path(rf.file_path, mod_name, all_file_paths)
                    if target_file and target_file != rf.file_path:
                        dep_key = (rf.file_path, target_file, "imports")
                        if dep_key not in seen_deps:
                            seen_deps.add(dep_key)
                            dependencies_to_insert.append(Dependency(
                                repository_id=repo_id,
                                source_file_path=rf.file_path,
                                target_file_path=target_file,
                                relationship_type="imports",
                                evidence_line=imp.get("line", 1),
                                evidence_snippet=imp.get("snippet", f"require('{mod_name}')")[:500]
                            ))

                # 2. Inheritance
                for inh in file_inherits_map.get(rf.file_path, []):
                    # Check if parent class matches another file in repo
                    dep_key = (rf.file_path, inh.get("parent", ""), "inherits")
                    if dep_key not in seen_deps:
                        seen_deps.add(dep_key)
                        dependencies_to_insert.append(Dependency(
                            repository_id=repo_id,
                            source_file_path=rf.file_path,
                            target_file_path=rf.file_path,
                            source_symbol=inh.get("child", ""),
                            target_symbol=inh.get("parent", ""),
                            relationship_type="inherits",
                            evidence_line=inh.get("line", 1),
                            evidence_snippet=f"class {inh.get('child')} extends {inh.get('parent')}"
                        ))

                # 3. Call sites (sample top calls)
                for call_site in file_calls_map.get(rf.file_path, [])[:8]:
                    target_sym = call_site.get("target_symbol", "")
                    dep_key = (rf.file_path, target_sym, "calls")
                    if dep_key not in seen_deps:
                        seen_deps.add(dep_key)
                        dependencies_to_insert.append(Dependency(
                            repository_id=repo_id,
                            source_file_path=rf.file_path,
                            target_file_path=rf.file_path,
                            target_symbol=target_sym,
                            relationship_type="calls",
                            evidence_line=call_site.get("line", 1),
                            evidence_snippet=f"{target_sym}() invocation"
                        ))

            session.add_all(dependencies_to_insert)
            await session.commit()

            # Stage 7: Generating searchable code chunks & embeddings
            await self._update_status(session, repo_id, "Generating code embeddings & search index...", 85)
            
            chunks_to_insert: List[CodeChunk] = []
            for rf in files_to_insert:
                syms = file_symbols_map.get(rf.file_path, [])
                chunks = self.rag.chunk_file(rf.file_path, rf.content, syms)
                for ch in chunks[:8]:  # Index top chunks per file
                    chunks_to_insert.append(CodeChunk(
                        repository_id=repo_id,
                        file_id=rf.id,
                        file_path=ch["file_path"],
                        start_line=ch["start_line"],
                        end_line=ch["end_line"],
                        content=ch["content"],
                        symbol_name=ch.get("symbol_name", ""),
                        embedding_json=[]
                    ))

            # Batch generate embeddings for top 40 key chunks to stay blazing fast
            for i, ch_obj in enumerate(chunks_to_insert[:40]):
                emb = await self.llm.generate_embedding(ch_obj.content)
                ch_obj.embedding_json = emb

            session.add_all(chunks_to_insert)
            await session.commit()

            # Stage 8: Fetching Git Commits & Preparing repository intelligence
            await self._update_status(session, repo_id, "Fetching commits & finalizing intelligence...", 95)
            try:
                commits = await self.github.get_commits(owner, repo_name, per_page=20)
                commits_to_insert = [
                    RepoCommit(
                        repository_id=repo_id,
                        commit_sha=c["sha"],
                        author=c["author"],
                        author_avatar=c["author_avatar"],
                        message=c["message"],
                        timestamp=datetime.fromisoformat(c["date"].replace("Z", "+00:00")) if c.get("date") else datetime.utcnow()
                    )
                    for c in commits
                ]
                session.add_all(commits_to_insert)
                await session.commit()
            except Exception as e:
                print(f"Non-critical commit fetch error: {e}")

            # Finalize Stats
            distinct_modules = len({f.module_name for f in files_to_insert})
            repo.file_count = len(files_to_insert)
            repo.function_count = total_functions
            repo.class_count = total_classes
            repo.dependency_count = len(dependencies_to_insert)
            repo.module_count = distinct_modules
            repo.languages_json = dict(languages_counter)
            repo.indexing_status = "completed"
            repo.status_message = "Repository intelligence ready."
            repo.progress_percent = 100
            repo.indexed_at = datetime.utcnow()
            await session.commit()

        except Exception as e:
            repo.indexing_status = "failed"
            repo.status_message = f"Indexing failed: {str(e)}"
            await session.commit()
            print(f"Error indexing repo {repo_id}: {e}")

    @staticmethod
    async def _update_status(session: AsyncSession, repo_id: int, message: str, percent: int):
        await session.execute(
            update(Repository)
            .where(Repository.id == repo_id)
            .values(
                indexing_status="indexing",
                status_message=message,
                progress_percent=percent
            )
        )
        await session.commit()
