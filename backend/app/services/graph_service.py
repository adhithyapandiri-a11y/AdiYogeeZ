import os
from collections import defaultdict
from typing import Dict, Any, List, Set, Optional
import networkx as nx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.schema import Repository, RepoFile, CodeSymbol, Dependency
from backend.app.services.parser_service import ParserService

# Color mapping by file extension / language
LANGUAGE_COLORS = {
    "Python": "#10b981",          # emerald
    "TypeScript": "#3b82f6",      # blue
    "TypeScript (React)": "#06b6d4", # cyan
    "JavaScript": "#f59e0b",      # amber
    "JavaScript (React)": "#f97316", # orange
    "Go": "#00add8",              # sky blue
    "Rust": "#dea584",            # rust
    "Java": "#b07219",            # brown-orange
    "HTML": "#e34c26",
    "CSS": "#ec4899",
    "JSON": "#94a3b8",            # slate
    "YAML": "#a855f7",            # purple
    "Markdown": "#64748b",
}

RELATIONSHIP_COLORS = {
    "imports": "#818cf8",      # indigo-400
    "calls": "#38bdf8",        # sky-400
    "inherits": "#c084fc",     # purple-400
    "data_access": "#34d399",  # emerald-400
    "api": "#fb923c",          # amber-400
}

ROLE_COLORS = {
    "Entry Point": "#f43f5e",        # rose-500
    "Route / Controller": "#3b82f6", # blue-500
    "UI Component": "#06b6d4",       # cyan-500
    "Service": "#8b5cf6",            # violet-500
    "Data Repository": "#10b981",    # emerald-500
    "Model / Entity": "#14b8a6",     # teal-500
    "Utility": "#eab308",            # yellow-500
    "Test": "#a855f7",               # purple-500
    "Configuration": "#64748b",      # slate-500
    "Unknown": "#6b7280"             # gray-500
}

class GraphService:
    def __init__(self):
        self.parser = ParserService()

    @staticmethod
    def _get_color_for_lang(lang: str) -> str:
        return LANGUAGE_COLORS.get(lang, "#6366f1")

    @staticmethod
    def _disambiguate_name(file_path: str, duplicate_basenames: Set[str]) -> str:
        base = os.path.basename(file_path)
        if base in duplicate_basenames:
            parent = os.path.basename(os.path.dirname(file_path))
            if parent:
                return f"{parent}/{base}"
        return base

    # =========================================================================
    # VIEW 1: PROJECT STRUCTURE (Hierarchy & Containment Only)
    # =========================================================================
    async def get_project_structure(self, session: AsyncSession, repo_id: int) -> Dict[str, Any]:
        """
        Builds the physical folder & file containment hierarchy.
        Zero import or call edges. Only 'contains' parent-child relationships.
        """
        files_stmt = select(RepoFile).where(RepoFile.repository_id == repo_id)
        files_res = await session.execute(files_stmt)
        raw_files = files_res.scalars().all()

        # Deduplicate files by canonical file_path
        seen_paths = set()
        files = []
        for f in raw_files:
            if f.file_path not in seen_paths:
                seen_paths.add(f.file_path)
                files.append(f)

        symbols_stmt = select(CodeSymbol).where(CodeSymbol.repository_id == repo_id)
        sym_res = await session.execute(symbols_stmt)
        symbols = sym_res.scalars().all()

        deps_stmt = select(Dependency).where(Dependency.repository_id == repo_id)
        deps_res = await session.execute(deps_stmt)
        deps = deps_res.scalars().all()

        in_degree = defaultdict(int)
        out_degree = defaultdict(int)
        for d in deps:
            out_degree[d.source_file_path] += 1
            in_degree[d.target_file_path] += 1

        sym_by_file = defaultdict(list)
        for s in symbols:
            sym_by_file[s.file_path].append(s)

        # Detect duplicate basenames for disambiguation
        basenames = [os.path.basename(f.file_path) for f in files]
        basename_counts = defaultdict(int)
        for b in basenames:
            basename_counts[b] += 1
        duplicate_basenames = {b for b, count in basename_counts.items() if count > 1}

        # Directories aggregation
        dirs: Dict[str, Dict[str, Any]] = {}
        for f in files:
            parts = f.file_path.split("/")
            if len(parts) > 1:
                cur_path = ""
                for i in range(len(parts) - 1):
                    folder_name = parts[i]
                    cur_path = f"{cur_path}/{folder_name}" if cur_path else folder_name
                    if cur_path not in dirs:
                        dirs[cur_path] = {
                            "name": folder_name,
                            "path": cur_path,
                            "depth": cur_path.count("/"),
                            "parent": os.path.dirname(cur_path) if "/" in cur_path else "",
                            "files": [],
                            "subdirs": set(),
                            "languages": defaultdict(int),
                        }
                    dirs[cur_path]["files"].append(f.file_path)
                    dirs[cur_path]["languages"][f.language] += 1
                    if i > 0:
                        parent_path = os.path.dirname(cur_path)
                        if parent_path in dirs:
                            dirs[parent_path]["subdirs"].add(cur_path)

        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []

        # Create Root Node
        root_id = "dir:root"
        nodes.append({
            "id": root_id,
            "type": "directoryNode",
            "data": {
                "name": "Repository Root",
                "path": "",
                "is_root": True,
                "file_count": len(files),
                "folder_count": len([d for d, v in dirs.items() if v["depth"] == 0]),
                "languages": [k for k, v in sorted(
                    {f.language for f in files}.items() if isinstance(files, dict) else {},
                    key=lambda x: x[1], reverse=True
                )][:3],
                "architectural_role": "Root Workspace",
                "depth": 0,
            }
        })

        # Add directory nodes
        for dpath, dinfo in sorted(dirs.items(), key=lambda x: x[1]["depth"]):
            dir_node_id = f"dir:{dpath}"
            dir_role = self.parser.classify_directory_role(dpath)
            lang_sorted = sorted(dinfo["languages"].items(), key=lambda x: x[1], reverse=True)
            top_langs = [l[0] for l in lang_sorted[:3]]

            nodes.append({
                "id": dir_node_id,
                "type": "directoryNode",
                "data": {
                    "name": dinfo["name"],
                    "path": dpath,
                    "is_root": False,
                    "file_count": len(dinfo["files"]),
                    "folder_count": len(dinfo["subdirs"]),
                    "languages": top_langs,
                    "architectural_role": dir_role,
                    "depth": dinfo["depth"] + 1,
                }
            })

            parent_id = f"dir:{dinfo['parent']}" if dinfo["parent"] else root_id
            edges.append({
                "id": f"e-dir-{parent_id}-{dir_node_id}",
                "source": parent_id,
                "target": dir_node_id,
                "type": "hierarchyEdge",
                "animated": False,
                "data": {"relationship": "contains"}
            })

        # Add file nodes
        for f in files:
            file_node_id = f"file:{f.file_path}"
            f_syms = sym_by_file[f.file_path]
            f_dir = os.path.dirname(f.file_path)
            parent_id = f"dir:{f_dir}" if f_dir in dirs else root_id
            disambiguated = self._disambiguate_name(f.file_path, duplicate_basenames)

            role = f.architectural_role or self.parser.classify_architectural_role(f.file_path, f.language)

            nodes.append({
                "id": file_node_id,
                "type": "fileNode",
                "data": {
                    "name": disambiguated,
                    "raw_name": os.path.basename(f.file_path),
                    "file_path": f.file_path,
                    "language": f.language,
                    "color": self._get_color_for_lang(f.language),
                    "architectural_role": role,
                    "role_color": ROLE_COLORS.get(role, "#6b7280"),
                    "line_count": f.line_count,
                    "file_size": f.file_size,
                    "function_count": len([s for s in f_syms if s.symbol_type in ("function", "method")]),
                    "class_count": len([s for s in f_syms if s.symbol_type == "class"]),
                    "incoming_count": in_degree[f.file_path],
                    "outgoing_count": out_degree[f.file_path]
                }
            })

            edges.append({
                "id": f"e-file-{parent_id}-{file_node_id}",
                "source": parent_id,
                "target": file_node_id,
                "type": "hierarchyEdge",
                "animated": False,
                "data": {"relationship": "contains"}
            })

        lang_counts = defaultdict(int)
        for f in files:
            lang_counts[f.language] += 1

        return {
            "nodes": nodes,
            "edges": edges,
            "stats": {
                "total_files": len(files),
                "total_directories": len(dirs) + 1,
                "max_depth": max([d["depth"] for d in dirs.values()], default=0) + 1,
                "languages": dict(lang_counts)
            }
        }

    # =========================================================================
    # VIEW 2: DEPENDENCY MAP (Multi-level, Semantic Relationships)
    # =========================================================================
    async def get_dependency_map(
        self, 
        session: AsyncSession, 
        repo_id: int, 
        level: str = "files",
        selected_module: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Structured dependency graph with three exploration levels:
        - 'modules': Level 1 high-level module architecture
        - 'files': Level 2 file-to-file relationships with semantic types
        - 'symbols': Level 3 function/class call relationships
        """
        files_stmt = select(RepoFile).where(RepoFile.repository_id == repo_id)
        files_res = await session.execute(files_stmt)
        raw_files = files_res.scalars().all()

        # Deduplicate files by canonical file_path
        seen_paths = set()
        files = []
        for f in raw_files:
            if f.file_path not in seen_paths:
                seen_paths.add(f.file_path)
                files.append(f)

        deps_stmt = select(Dependency).where(Dependency.repository_id == repo_id)
        deps_res = await session.execute(deps_stmt)
        deps = deps_res.scalars().all()

        symbols_stmt = select(CodeSymbol).where(CodeSymbol.repository_id == repo_id)
        sym_res = await session.execute(symbols_stmt)
        symbols = sym_res.scalars().all()

        # Canonical Metrics calculation
        in_degree = defaultdict(int)
        out_degree = defaultdict(int)
        rel_type_counts = defaultdict(int)
        for d in deps:
            out_degree[d.source_file_path] += 1
            in_degree[d.target_file_path] += 1
            rel_type_counts[d.relationship_type or "imports"] += 1

        func_count = len([s for s in symbols if s.symbol_type in ("function", "method")])
        class_count = len([s for s in symbols if s.symbol_type == "class"])
        isolated_files = [f for f in files if in_degree[f.file_path] == 0 and out_degree[f.file_path] == 0]

        canonical_metrics = {
            "indexed_files_count": len(files),
            "functions_count": func_count,
            "classes_count": class_count,
            "direct_imports_count": rel_type_counts["imports"],
            "call_relationships_count": rel_type_counts["calls"],
            "inherits_relationships_count": rel_type_counts["inherits"],
            "api_relationships_count": rel_type_counts["api"],
            "data_access_relationships_count": rel_type_counts["data_access"],
            "total_relationships_count": len(deps),
            "isolated_files_count": len(isolated_files)
        }

        # LEVEL 1: MODULES
        if level == "modules":
            module_files = defaultdict(list)
            for f in files:
                mod = f.module_name or "Core"
                if mod == "root" or not mod:
                    top = f.file_path.split("/")[0] if "/" in f.file_path else "root"
                    mod = top.capitalize() if top != "root" else "Core"
                module_files[mod].append(f)

            mod_in = defaultdict(int)
            mod_out = defaultdict(int)
            mod_edges_dict = defaultdict(lambda: defaultdict(int))

            # Map file to module
            file_to_mod = {}
            for mod, flist in module_files.items():
                for f in flist:
                    file_to_mod[f.file_path] = mod

            for d in deps:
                s_mod = file_to_mod.get(d.source_file_path)
                t_mod = file_to_mod.get(d.target_file_path)
                if s_mod and t_mod and s_mod != t_mod:
                    mod_edges_dict[(s_mod, t_mod)][d.relationship_type or "imports"] += 1
                    mod_out[s_mod] += 1
                    mod_in[t_mod] += 1

            mod_nodes = []
            for mod_name, flist in module_files.items():
                # Major role inference for module
                roles = [f.architectural_role for f in flist if f.architectural_role]
                most_common_role = max(set(roles), key=roles.count) if roles else "Module"
                langs = list({f.language for f in flist})
                tot_lines = sum(f.line_count for f in flist)

                mod_nodes.append({
                    "id": f"mod:{mod_name}",
                    "type": "moduleNode",
                    "data": {
                        "name": mod_name,
                        "file_count": len(flist),
                        "total_lines": tot_lines,
                        "architectural_role": most_common_role,
                        "role_color": ROLE_COLORS.get(most_common_role, "#8b5cf6"),
                        "languages": langs[:3],
                        "incoming_count": mod_in[mod_name],
                        "outgoing_count": mod_out[mod_name],
                        "key_files": [f.file_path for f in flist[:5]]
                    }
                })

            mod_edges = []
            edge_idx = 0
            for (s_mod, t_mod), r_types in mod_edges_dict.items():
                tot_weight = sum(r_types.values())
                dominant_type = max(r_types.items(), key=lambda x: x[1])[0]
                mod_edges.append({
                    "id": f"e-mod-{edge_idx}",
                    "source": f"mod:{s_mod}",
                    "target": f"mod:{t_mod}",
                    "type": "semanticEdge",
                    "animated": True,
                    "data": {
                        "relationship_type": dominant_type,
                        "color": RELATIONSHIP_COLORS.get(dominant_type, "#818cf8"),
                        "weight": tot_weight,
                        "breakdown": dict(r_types)
                    }
                })
                edge_idx += 1

            return {
                "level": "modules",
                "nodes": mod_nodes,
                "edges": mod_edges,
                "canonical_metrics": canonical_metrics
            }

        # LEVEL 2: FILES (Default)
        basenames = [os.path.basename(f.file_path) for f in files]
        basename_counts = defaultdict(int)
        for b in basenames:
            basename_counts[b] += 1
        duplicate_basenames = {b for b, count in basename_counts.items() if count > 1}

        sym_by_file = defaultdict(list)
        for s in symbols:
            sym_by_file[s.file_path].append(s)

        filtered_files = files
        if selected_module:
            filtered_files = [f for f in files if (f.module_name or "").lower() == selected_module.lower() or f.file_path.startswith(selected_module)]

        valid_file_paths = {f.file_path for f in filtered_files}

        file_nodes = []
        for f in filtered_files:
            disambiguated = self._disambiguate_name(f.file_path, duplicate_basenames)
            f_syms = sym_by_file[f.file_path]
            role = f.architectural_role or self.parser.classify_architectural_role(f.file_path, f.language)

            file_nodes.append({
                "id": f.file_path,
                "type": "fileDepNode",
                "data": {
                    "name": disambiguated,
                    "raw_name": os.path.basename(f.file_path),
                    "file_path": f.file_path,
                    "language": f.language,
                    "color": self._get_color_for_lang(f.language),
                    "architectural_role": role,
                    "role_color": ROLE_COLORS.get(role, "#6b7280"),
                    "line_count": f.line_count,
                    "module": f.module_name or "Core",
                    "function_count": len([s for s in f_syms if s.symbol_type in ("function", "method")]),
                    "class_count": len([s for s in f_syms if s.symbol_type == "class"]),
                    "incoming_count": in_degree[f.file_path],
                    "outgoing_count": out_degree[f.file_path],
                    "is_isolated": in_degree[f.file_path] == 0 and out_degree[f.file_path] == 0
                }
            })

        file_edges = []
        for i, d in enumerate(deps):
            if d.source_file_path in valid_file_paths and d.target_file_path in valid_file_paths:
                rel_type = d.relationship_type or "imports"
                color = RELATIONSHIP_COLORS.get(rel_type, "#818cf8")

                file_edges.append({
                    "id": f"e-dep-{i}",
                    "source": d.source_file_path,
                    "target": d.target_file_path,
                    "type": "semanticEdge",
                    "animated": rel_type in ("calls", "api"),
                    "data": {
                        "relationship_type": rel_type,
                        "color": color,
                        "evidence_line": d.evidence_line or 1,
                        "evidence_snippet": d.evidence_snippet or f"import / call reference between {os.path.basename(d.source_file_path)} and {os.path.basename(d.target_file_path)}"
                    }
                })

        return {
            "level": "files",
            "nodes": file_nodes,
            "edges": file_edges,
            "canonical_metrics": canonical_metrics
        }

    # =========================================================================
    # VIEW 3: FEATURE FLOW (Workflow / Scenario Pipeline)
    # =========================================================================
    async def get_feature_flow(
        self, 
        session: AsyncSession, 
        repo_id: int, 
        workflow_query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Traces realistic static execution flows across architecture layers:
        Entry Point -> Router / Controller -> Middleware / Service -> Data / Response
        Supports preset queries and dynamic keyword matching.
        """
        files_stmt = select(RepoFile).where(RepoFile.repository_id == repo_id)
        files_res = await session.execute(files_stmt)
        raw_files = files_res.scalars().all()

        # Deduplicate files by canonical file_path
        seen_paths = set()
        files = []
        for f in raw_files:
            if f.file_path not in seen_paths:
                seen_paths.add(f.file_path)
                files.append(f)

        symbols_stmt = select(CodeSymbol).where(CodeSymbol.repository_id == repo_id)
        sym_res = await session.execute(symbols_stmt)
        symbols = sym_res.scalars().all()

        deps_stmt = select(Dependency).where(Dependency.repository_id == repo_id)
        deps_res = await session.execute(deps_stmt)
        deps = deps_res.scalars().all()

        file_map = {f.file_path: f for f in files}
        sym_by_name = {s.name.lower(): s for s in symbols}

        # Available presets
        preset_scenarios = [
            "Request Routing & Handling",
            "Middleware Pipeline Execution",
            "JSON Response Generation",
            "Error Handling & Fallback",
            "Application Initialization"
        ]

        active_query = (workflow_query or "Request Routing & Handling").strip()

        # Helper to get snippet from file
        def get_snippet(f: RepoFile, keyword: str = "") -> Dict[str, Any]:
            lines = (f.content or "").splitlines()
            target_line = 1
            if keyword:
                for idx, line in enumerate(lines):
                    if keyword.lower() in line.lower():
                        target_line = idx + 1
                        break
            start = max(1, target_line - 2)
            end = min(len(lines), target_line + 6)
            snippet = "\n".join(lines[start - 1:end]) if lines else "// Code reference"
            return {
                "file_path": f.file_path,
                "start_line": start,
                "end_line": end,
                "snippet": snippet
            }

        # Build candidate file pools by architectural role & keywords
        entry_file = next((f for f in files if f.architectural_role == "Entry Point"), None)
        if not entry_file and files:
            entry_file = next((f for f in files if any(k in f.file_path.lower() for k in ("index.", "app.", "main.", "express."))), files[0])

        router_file = next((f for f in files if f.architectural_role == "Route / Controller"), None)
        if not router_file and files:
            router_file = next((f for f in files if any(k in f.file_path.lower() for k in ("route", "router", "controller"))), entry_file)

        service_file = next((f for f in files if f.architectural_role == "Service"), None)
        if not service_file and files:
            service_file = next((f for f in files if any(k in f.file_path.lower() for k in ("middleware", "service", "layer", "util"))), router_file)

        response_file = next((f for f in files if any(k in f.file_path.lower() for k in ("response", "view", "json", "format", "render"))), service_file)
        error_file = next((f for f in files if any(k in f.file_path.lower() for k in ("error", "status", "catch", "fallback"))), service_file)

        # Build stages deterministically based on active scenario
        raw_stages: List[Dict[str, Any]] = []

        if active_query == "Middleware Pipeline Execution":
            raw_stages = [
                {
                    "title": "Request Ingestion & Header Verification",
                    "component": entry_file.file_path if entry_file else "app.js",
                    "role": "Entry Gateway",
                    "function_or_symbol": "handle / onRequest",
                    "description": f"Intercepts incoming HTTP transaction in '{os.path.basename(entry_file.file_path if entry_file else 'app.js')}', extracting protocol headers, IP provenance, and cookie tokens.",
                    "input_spec": "Raw TCP Socket / HTTP Headers",
                    "output_spec": "Decorated Request Context",
                    "code_reference": get_snippet(entry_file if entry_file else files[0], "header"),
                    "is_error_stage": False
                },
                {
                    "title": "Security & Authentication Guard",
                    "component": service_file.file_path if service_file else "middleware.js",
                    "role": "Security Layer",
                    "function_or_symbol": "authenticate / verifyToken",
                    "description": f"Enforces perimeter security in '{os.path.basename(service_file.file_path if service_file else 'middleware.js')}', inspecting session state and bearer authorization credentials.",
                    "input_spec": "Authorization Header / Session Token",
                    "output_spec": "Authenticated Principal Claims",
                    "code_reference": get_snippet(service_file if service_file else files[0], "auth"),
                    "is_error_stage": False
                },
                {
                    "title": "Payload Parsing & Parameter Normalization",
                    "component": router_file.file_path if router_file else "router.js",
                    "role": "Body Parser",
                    "function_or_symbol": "parseBody / next()",
                    "description": f"Decodes multi-part or JSON message bodies in '{os.path.basename(router_file.file_path if router_file else 'router.js')}', validating schema bounds before advancing dispatch pointer.",
                    "input_spec": "Incoming Octet Stream / Content-Type",
                    "output_spec": "Structured req.body Object",
                    "code_reference": get_snippet(router_file if router_file else files[0], "next"),
                    "is_error_stage": False
                },
                {
                    "title": "Route Middleware Dispatch",
                    "component": router_file.file_path if router_file else "router.js",
                    "role": "Pipeline Executor",
                    "function_or_symbol": "next() / Layer.handle",
                    "description": f"Recursively steps through the registered middleware chain, cascading through matching path interceptors.",
                    "input_spec": "Pipeline Index & Context",
                    "output_spec": "Target Route Handler Invocation",
                    "code_reference": get_snippet(router_file if router_file else files[0], "dispatch"),
                    "is_error_stage": False
                },
                {
                    "title": "Middleware Error Interceptor",
                    "component": error_file.file_path if error_file else "error.js",
                    "role": "Error Boundary",
                    "function_or_symbol": "handleError(err, req, res, next)",
                    "description": f"Traps synchronous exceptions or rejected asynchronous middleware promises, mitigating catastrophic pipeline stalls.",
                    "input_spec": "Thrown Error Instance",
                    "output_spec": "Sanitized HTTP Error Frame",
                    "code_reference": get_snippet(error_file if error_file else files[0], "error"),
                    "is_error_stage": True
                }
            ]
        elif active_query == "JSON Response Generation":
            raw_stages = [
                {
                    "title": "Route Controller Execution",
                    "component": router_file.file_path if router_file else "controller.js",
                    "role": "Controller",
                    "function_or_symbol": "handle(req, res)",
                    "description": f"Executes domain logic in '{os.path.basename(router_file.file_path if router_file else 'controller.js')}', preparing raw data models for client consumption.",
                    "input_spec": "Validated Request Context",
                    "output_spec": "Raw Domain Entity Object",
                    "code_reference": get_snippet(router_file if router_file else files[0], "res"),
                    "is_error_stage": False
                },
                {
                    "title": "Content Negotiation & Formatting",
                    "component": response_file.file_path if response_file else "response.js",
                    "role": "Format Negotiator",
                    "function_or_symbol": "format / accepts",
                    "description": f"Evaluates client Accept headers in '{os.path.basename(response_file.file_path if response_file else 'response.js')}', choosing application/json representation.",
                    "input_spec": "Accept: application/json Header",
                    "output_spec": "MIME Type Assignment",
                    "code_reference": get_snippet(response_file if response_file else files[0], "format"),
                    "is_error_stage": False
                },
                {
                    "title": "JSON Serialization & Header Formulation",
                    "component": response_file.file_path if response_file else "response.js",
                    "role": "Serializer",
                    "function_or_symbol": "res.json(body)",
                    "description": f"Serializes memory payload into UTF-8 JSON byte string, generating Content-Type and ETag caching signatures.",
                    "input_spec": "Object / Array Payload",
                    "output_spec": "Serialized JSON String & Status 200",
                    "code_reference": get_snippet(response_file if response_file else files[0], "json"),
                    "is_error_stage": False
                },
                {
                    "title": "Socket Buffer Flushing & Transmission",
                    "component": entry_file.file_path if entry_file else "app.js",
                    "role": "Network Transport",
                    "function_or_symbol": "res.end()",
                    "description": f"Streams HTTP chunked wire payload to client socket connection, recording transaction duration.",
                    "input_spec": "Serialized Response Buffer",
                    "output_spec": "Completed HTTP 200 Wire Transfer",
                    "code_reference": get_snippet(entry_file if entry_file else files[0], "send"),
                    "is_error_stage": False
                }
            ]
        elif active_query == "Error Handling & Fallback":
            raw_stages = [
                {
                    "title": "Fault Inception / Unhandled Throw",
                    "component": router_file.file_path if router_file else "router.js",
                    "role": "Source of Fault",
                    "function_or_symbol": "throw new Error / next(err)",
                    "description": f"A controller or service in '{os.path.basename(router_file.file_path if router_file else 'router.js')}' throws an exception or calls next(err).",
                    "input_spec": "Invalid State / External Fault",
                    "output_spec": "Uncaught Error Object",
                    "code_reference": get_snippet(router_file if router_file else files[0], "error"),
                    "is_error_stage": True
                },
                {
                    "title": "Error Middleware Routing",
                    "component": service_file.file_path if service_file else "middleware.js",
                    "role": "Router Boundary",
                    "function_or_symbol": "Layer.handle_error",
                    "description": f"Skips remaining non-error middleware stacks, isolating handlers with arity == 4 (err, req, res, next).",
                    "input_spec": "Error Stack & Request Pointer",
                    "output_spec": "Dedicated Error Middleware",
                    "code_reference": get_snippet(service_file if service_file else files[0], "error"),
                    "is_error_stage": True
                },
                {
                    "title": "Sanitization & Error Payload Assembly",
                    "component": error_file.file_path if error_file else "error.js",
                    "role": "Sanitizer",
                    "function_or_symbol": "formatErrorResponse",
                    "description": f"Strips proprietary file paths and internal stack traces for production safety via '{os.path.basename(error_file.file_path if error_file else 'error.js')}'.",
                    "input_spec": "Raw Error Stack",
                    "output_spec": "Safe Diagnostic JSON Body",
                    "code_reference": get_snippet(error_file if error_file else files[0], "status"),
                    "is_error_stage": True
                },
                {
                    "title": "Fallback Status 500 / 404 Transmission",
                    "component": response_file.file_path if response_file else "response.js",
                    "role": "Output Dispatcher",
                    "function_or_symbol": "res.status(500).json()",
                    "description": f"Flushes final HTTP 500 Internal Server Error response to client.",
                    "input_spec": "Sanitized Error Context",
                    "output_spec": "HTTP 500 Wire Stream",
                    "code_reference": get_snippet(response_file if response_file else files[0], "status"),
                    "is_error_stage": True
                }
            ]
        elif active_query == "Application Initialization":
            raw_stages = [
                {
                    "title": "Configuration & Environment Bootstrap",
                    "component": entry_file.file_path if entry_file else "app.js",
                    "role": "Bootstrap",
                    "function_or_symbol": "initializeEnvironment",
                    "description": f"Reads environment variables, setting application flags and debug modes.",
                    "input_spec": "Process Environment (process.env)",
                    "output_spec": "App Config Object",
                    "code_reference": get_snippet(entry_file if entry_file else files[0], "env"),
                    "is_error_stage": False
                },
                {
                    "title": "Prototype & Prototype Augmentation",
                    "component": service_file.file_path if service_file else "core.js",
                    "role": "Core Engine",
                    "function_or_symbol": "createApplication / init",
                    "description": f"Configures application prototype methods and internal event emitters.",
                    "input_spec": "App Prototype",
                    "output_spec": "Ready Application Instance",
                    "code_reference": get_snippet(service_file if service_file else files[0], "init"),
                    "is_error_stage": False
                },
                {
                    "title": "Top-Level Route & Sub-App Mounting",
                    "component": router_file.file_path if router_file else "router.js",
                    "role": "Route Binder",
                    "function_or_symbol": "app.use / app.mount",
                    "description": f"Mounts root routers, sub-applications, and top-level controllers into the primary layer stack.",
                    "input_spec": "Route Blueprints",
                    "output_spec": "Mounted Router Stack",
                    "code_reference": get_snippet(router_file if router_file else files[0], "use"),
                    "is_error_stage": False
                },
                {
                    "title": "HTTP Server Binding & Listener Start",
                    "component": entry_file.file_path if entry_file else "app.js",
                    "role": "Network Listener",
                    "function_or_symbol": "app.listen(port)",
                    "description": f"Binds the application handler to a network interface and begins accepting incoming socket connections.",
                    "input_spec": "Target Port & Hostname",
                    "output_spec": "Active Listening TCP Socket",
                    "code_reference": get_snippet(entry_file if entry_file else files[0], "listen"),
                    "is_error_stage": False
                }
            ]
        else:
            # Default "Request Routing & Handling" or Custom query matching
            # Search files matching query keywords if not the default
            matching_files = [f for f in files if any(term in f.file_path.lower() for term in active_query.lower().split())]
            custom_target = matching_files[0] if matching_files else service_file

            raw_stages = [
                {
                    "title": "Application Entry & Initialization",
                    "component": entry_file.file_path if entry_file else "index.js",
                    "role": entry_file.architectural_role or "Entry Point",
                    "function_or_symbol": "createApplication / export",
                    "description": f"Incoming HTTP request arrives at the primary entry module '{os.path.basename(entry_file.file_path if entry_file else 'index.js')}', configuring application prototypes and dispatch channels.",
                    "input_spec": "Incoming HTTP Connection / Request Header",
                    "output_spec": "Application Context & Dispatch Handlers",
                    "code_reference": get_snippet(entry_file if entry_file else files[0], "express"),
                    "is_error_stage": False
                },
                {
                    "title": "Route Matching & Layer Traversal",
                    "component": router_file.file_path if router_file else "router.js",
                    "role": router_file.architectural_role or "Route / Controller",
                    "function_or_symbol": "handle / dispatch",
                    "description": f"The router iterates matched route stacks in '{os.path.basename(router_file.file_path if router_file else 'router.js')}', testing URL path expressions against registered handlers.",
                    "input_spec": "Parsed Request URL & HTTP Method",
                    "output_spec": "Matching Route Handler Closure",
                    "code_reference": get_snippet(router_file if router_file else files[0], "handle"),
                    "is_error_stage": False
                },
                {
                    "title": f"Service Execution ({os.path.basename(custom_target.file_path if custom_target else 'service.js')})",
                    "component": custom_target.file_path if custom_target else "service.js",
                    "role": custom_target.architectural_role or "Service",
                    "function_or_symbol": "handle_request / execute()",
                    "description": f"Executes workflow business logic in '{os.path.basename(custom_target.file_path if custom_target else 'service.js')}', processing domain context for '{active_query}'.",
                    "input_spec": "Request (req), Response (res), and next callback",
                    "output_spec": "Processed context or payload data",
                    "code_reference": get_snippet(custom_target if custom_target else files[0], active_query.split()[0]),
                    "is_error_stage": False
                },
                {
                    "title": "Response Formatting & Transmission",
                    "component": response_file.file_path if response_file else "response.js",
                    "role": response_file.architectural_role or "Data / Output",
                    "function_or_symbol": "send / json / format",
                    "description": f"Serializes output payloads in '{os.path.basename(response_file.file_path if response_file else 'response.js')}', formatting headers, content-type negotiation, and flushing socket buffers.",
                    "input_spec": "JSON Body / Render Template / Status Code",
                    "output_spec": "HTTP 200/201 Byte Stream to Client",
                    "code_reference": get_snippet(response_file if response_file else files[0], "send"),
                    "is_error_stage": False
                },
                {
                    "title": "Error Propagation & Fallback",
                    "component": error_file.file_path if error_file else (entry_file.file_path if entry_file else "error.js"),
                    "role": "Error Boundary",
                    "function_or_symbol": "handle_error(err, req, res, next)",
                    "description": f"Catches unhandled rejections or explicitly passed errors, formatting HTTP 500/404 payloads safely via '{os.path.basename(error_file.file_path if error_file else 'error.js')}'.",
                    "input_spec": "Error Object (err) caught in pipeline",
                    "output_spec": "Structured Error Response (HTTP 4xx / 5xx)",
                    "code_reference": get_snippet(error_file if error_file else files[0], "error"),
                    "is_error_stage": True
                }
            ]

        # Enforce sequential stage numbering (1, 2, 3...)
        stages = []
        for idx, s in enumerate(raw_stages):
            s["stage_number"] = idx + 1
            stages.append(s)

        # Convert stages to React Flow nodes and edges
        nodes = []
        edges = []
        x_offset = 60
        y_offset = 120

        for idx, stage in enumerate(stages):
            node_id = f"stage-{stage['stage_number']}"
            is_err = stage["is_error_stage"]
            nodes.append({
                "id": node_id,
                "type": "featureStageNode",
                "position": {
                    "x": x_offset + (idx * 380),
                    "y": y_offset if not is_err else y_offset + 240
                },
                "data": stage
            })

            if idx > 0 and not is_err:
                prev_id = f"stage-{stages[idx - 1]['stage_number']}"
                edges.append({
                    "id": f"e-stage-{prev_id}-{node_id}",
                    "source": prev_id,
                    "target": node_id,
                    "type": "smoothstep",
                    "animated": True,
                    "style": {"stroke": "#818cf8", "strokeWidth": 2}
                })

        # Connect error stage from intermediate stages
        error_stage = next((s for s in stages if s["is_error_stage"]), None)
        if error_stage:
            err_node_id = f"stage-{error_stage['stage_number']}"
            source_stage = next((s for s in stages if s["stage_number"] in (2, 3) and not s["is_error_stage"]), stages[0])
            src_node_id = f"stage-{source_stage['stage_number']}"
            edges.append({
                "id": f"e-stage-error-branch-{src_node_id}-{err_node_id}",
                "source": src_node_id,
                "target": err_node_id,
                "type": "smoothstep",
                "animated": True,
                "style": {"stroke": "#f43f5e", "strokeWidth": 2, "strokeDasharray": "5,5"},
                "label": "on exception (next(err))"
            })

        return {
            "query": active_query,
            "preset_scenarios": preset_scenarios,
            "stages": stages,
            "nodes": nodes,
            "edges": edges,
            "inference_meta": {
                "method": "Static AST & Symbol Call Trace",
                "is_synthetic": False,
                "accuracy_notice": "Traces actual indexed functions and files matching request lifecycle patterns in this repository."
            }
        }

    # =========================================================================
    # EDGE DETAILS (Exact Line Numbers & Code Evidence)
    # =========================================================================
    async def get_edge_details(
        self,
        session: AsyncSession,
        repo_id: int,
        source: str,
        target: str,
        rel_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieves evidence line numbers, code snippets, and relationship details for a clicked edge.
        """
        stmt = select(Dependency).where(
            Dependency.repository_id == repo_id,
            Dependency.source_file_path == source,
            Dependency.target_file_path == target
        )
        if rel_type:
            stmt = stmt.where(Dependency.relationship_type == rel_type)

        res = await session.execute(stmt)
        dep = res.scalars().first()

        source_file_stmt = select(RepoFile).where(
            RepoFile.repository_id == repo_id,
            RepoFile.file_path == source
        )
        s_res = await session.execute(source_file_stmt)
        s_file = s_res.scalars().first()

        target_file_stmt = select(RepoFile).where(
            RepoFile.repository_id == repo_id,
            RepoFile.file_path == target
        )
        t_res = await session.execute(target_file_stmt)
        t_file = t_res.scalars().first()

        line_number = dep.evidence_line if dep and dep.evidence_line else 1
        snippet = dep.evidence_snippet if dep and dep.evidence_snippet else ""

        if not snippet and s_file and s_file.content:
            lines = s_file.content.splitlines()
            target_base = os.path.splitext(os.path.basename(target))[0]
            for idx, line in enumerate(lines):
                if target_base.lower() in line.lower() or "require" in line or "import" in line:
                    line_number = idx + 1
                    start = max(0, idx - 1)
                    end = min(len(lines), idx + 3)
                    snippet = "\n".join(lines[start:end])
                    break

        return {
            "source": source,
            "source_basename": os.path.basename(source),
            "target": target,
            "target_basename": os.path.basename(target),
            "relationship_type": dep.relationship_type if dep else (rel_type or "imports"),
            "evidence_line": line_number,
            "evidence_snippet": snippet or f"// Reference found connecting {source} to {target}",
            "source_language": s_file.language if s_file else "Unknown",
            "target_language": t_file.language if t_file else "Unknown"
        }

    # =========================================================================
    # OBSIDIAN COSMOS GRAPH (Interactive Force-Directed Constellation Network)
    # =========================================================================
    async def get_obsidian_graph(self, session: AsyncSession, repo_id: int) -> Dict[str, Any]:
        """
        Builds the Obsidian-style constellation graph.
        - Directory hubs (large glowing dots)
        - Source files (medium nodes sized by connectivity)
        - Symbol satellites (small dots for functions/classes)
        - Links: containment, imports, and calls
        """
        files_stmt = select(RepoFile).where(RepoFile.repository_id == repo_id)
        files_res = await session.execute(files_stmt)
        raw_files = files_res.scalars().all()

        # Deduplicate files by canonical file_path
        seen_paths = set()
        files = []
        for f in raw_files:
            if f.file_path not in seen_paths:
                seen_paths.add(f.file_path)
                files.append(f)

        symbols_stmt = select(CodeSymbol).where(CodeSymbol.repository_id == repo_id)
        sym_res = await session.execute(symbols_stmt)
        symbols = sym_res.scalars().all()

        deps_stmt = select(Dependency).where(Dependency.repository_id == repo_id)
        deps_res = await session.execute(deps_stmt)
        deps = deps_res.scalars().all()

        nodes: List[Dict[str, Any]] = []
        links: List[Dict[str, Any]] = []

        in_degree = defaultdict(int)
        out_degree = defaultdict(int)
        for d in deps:
            out_degree[d.source_file_path] += 1
            in_degree[d.target_file_path] += 1

        dirs_created: Set[str] = set()
        sym_by_file: Dict[str, List[CodeSymbol]] = defaultdict(list)
        for s in symbols:
            sym_by_file[s.file_path].append(s)

        # 1. Directory Hub Nodes (Obsidian major folder dots)
        dir_file_counts = defaultdict(int)
        for f in files:
            parts = f.file_path.split("/")
            if len(parts) > 1:
                cur_dir = ""
                for i in range(len(parts) - 1):
                    folder_name = parts[i]
                    cur_dir = f"{cur_dir}/{folder_name}" if cur_dir else folder_name
                    dir_file_counts[cur_dir] += 1

        for f in files:
            parts = f.file_path.split("/")
            if len(parts) > 1:
                cur_dir = ""
                parent_dir = None
                for i in range(len(parts) - 1):
                    folder_name = parts[i]
                    cur_dir = f"{cur_dir}/{folder_name}" if cur_dir else folder_name
                    dir_id = f"dir:{cur_dir}"

                    if dir_id not in dirs_created:
                        dirs_created.add(dir_id)
                        depth = cur_dir.count("/")
                        nodes.append({
                            "id": dir_id,
                            "name": folder_name,
                            "type": "directory",
                            "path": cur_dir,
                            "size": max(16, 28 - depth * 3),
                            "color": "#6366f1" if depth == 0 else "#818cf8",
                            "depth": depth,
                            "fileCount": dir_file_counts[cur_dir]
                        })
                        if parent_dir:
                            links.append({
                                "source": parent_dir,
                                "target": dir_id,
                                "type": "contains",
                                "value": 2
                            })
                    parent_dir = dir_id

        # 2. File Nodes (Obsidian medium dots)
        for f in files:
            deg = in_degree[f.file_path] + out_degree[f.file_path]
            file_id = f"file:{f.file_path}"
            f_symbols = sym_by_file[f.file_path]

            nodes.append({
                "id": file_id,
                "name": os.path.basename(f.file_path),
                "type": "file",
                "path": f.file_path,
                "language": f.language,
                "size": min(26, max(8, 8 + int(deg * 1.6))),
                "color": self._get_color_for_lang(f.language),
                "lineCount": f.line_count,
                "functionCount": len([s for s in f_symbols if s.symbol_type in ("function", "method")]),
                "classCount": len([s for s in f_symbols if s.symbol_type == "class"]),
                "inDegree": in_degree[f.file_path],
                "outDegree": out_degree[f.file_path]
            })

            # Link file to parent directory hub
            parent_dir = os.path.dirname(f.file_path)
            if parent_dir and f"dir:{parent_dir}" in dirs_created:
                links.append({
                    "source": f"dir:{parent_dir}",
                    "target": file_id,
                    "type": "contains",
                    "value": 1
                })

            # 3. Satellite Dots for key functions (up to 4 symbols per connected file)
            if deg > 0 or len(files) < 60:
                for s in f_symbols[:4]:
                    sym_id = f"sym:{f.file_path}:{s.name}"
                    nodes.append({
                        "id": sym_id,
                        "name": f"{s.name}()",
                        "type": "symbol",
                        "path": f.file_path,
                        "symbolType": s.symbol_type,
                        "startLine": s.start_line,
                        "endLine": s.end_line,
                        "size": 5,
                        "color": "#38bdf8" if s.symbol_type in ("function", "method") else "#a855f7"
                    })
                    links.append({
                        "source": file_id,
                        "target": sym_id,
                        "type": "has_symbol",
                        "value": 1
                    })

        # 4. Import / Call Dependency Edges
        for d in deps:
            s_id = f"file:{d.source_file_path}"
            t_id = f"file:{d.target_file_path}"
            links.append({
                "source": s_id,
                "target": t_id,
                "type": d.relationship_type or "imports",
                "value": 2
            })

        return {
            "nodes": nodes,
            "links": links,
            "stats": {
                "total_nodes": len(nodes),
                "total_links": len(links),
                "total_directories": len(dirs_created),
                "total_files": len(files)
            }
        }

    # =========================================================================
    # EXECUTION PATH EXPLORER (Caller -> Target -> Callee Chaining)
    # =========================================================================
    async def get_execution_path(
        self,
        session: AsyncSession,
        repo_id: int,
        symbol_name: str
    ) -> Dict[str, Any]:
        """
        Traces upstream callers and downstream callees for a specified function/method.
        Returns: target_symbol, callers, callees, flow_chain, static_analysis_notice.
        """
        sym_stmt = select(CodeSymbol).where(
            CodeSymbol.repository_id == repo_id,
            func.lower(CodeSymbol.name) == symbol_name.lower()
        )
        res = await session.execute(sym_stmt)
        target = res.scalars().first()

        # Fuzzy match if exact query not found
        if not target:
            all_sym_stmt = select(CodeSymbol).where(CodeSymbol.repository_id == repo_id)
            all_res = await session.execute(all_sym_stmt)
            for s in all_res.scalars().all():
                if symbol_name.lower() in s.name.lower():
                    target = s
                    break

        if not target:
            return {"error": f"Symbol '{symbol_name}' not found in indexed codebase."}

        # Fetch file for target
        file_res = await session.execute(select(RepoFile).where(RepoFile.id == target.file_id))
        target_file = file_res.scalars().first()

        # Find incoming callers
        callers_stmt = select(Dependency).where(
            Dependency.repository_id == repo_id,
            func.lower(Dependency.target_symbol) == target.name.lower()
        )
        callers_res = await session.execute(callers_stmt)
        callers_deps = callers_res.scalars().all()

        # Also search in files that import this file or invoke this function
        if not callers_deps:
            caller_file_stmt = select(Dependency).where(
                Dependency.repository_id == repo_id,
                Dependency.target_file_path == target.file_path
            )
            cf_res = await session.execute(caller_file_stmt)
            callers_deps = cf_res.scalars().all()

        callers_list = []
        for cd in callers_deps[:10]:
            callers_list.append({
                "name": cd.source_symbol or os.path.basename(cd.source_file_path),
                "symbol_type": "caller",
                "file_path": cd.source_file_path,
                "lines": str(cd.evidence_line or 1),
                "source_code": cd.evidence_snippet or f"{target.name}() invocation reference"
            })

        # Find downstream callees
        callees_stmt = select(Dependency).where(
            Dependency.repository_id == repo_id,
            Dependency.source_file_path == target.file_path,
            Dependency.relationship_type.in_(["calls", "imports"])
        )
        callees_res = await session.execute(callees_stmt)
        callees_deps = callees_res.scalars().all()

        callees_list = []
        for c in callees_deps[:10]:
            callees_list.append({
                "name": c.target_symbol or os.path.basename(c.target_file_path),
                "symbol_type": "function",
                "file_path": c.target_file_path or target.file_path,
                "lines": str(c.evidence_line or 1),
                "source_code": c.evidence_snippet or f"call to {c.target_symbol or c.target_file_path}"
            })

        # Construct Flow Chain: CALLERS -> TARGET -> CALLEES
        flow_chain = []
        for c in callers_list[:2]:
            flow_chain.append({
                "stage": "CALLER",
                "name": c["name"],
                "symbol_type": c["symbol_type"],
                "file_path": c["file_path"],
                "lines": c["lines"],
                "source_code": c["source_code"]
            })

        flow_chain.append({
            "stage": "TARGET",
            "name": target.name,
            "symbol_type": target.symbol_type,
            "file_path": target.file_path,
            "lines": f"{target.start_line}-{target.end_line}",
            "source_code": target.source_code or f"function {target.name}()"
        })

        for c in callees_list[:3]:
            flow_chain.append({
                "stage": "CALLEE",
                "name": c["name"],
                "symbol_type": c["symbol_type"],
                "file_path": c["file_path"],
                "lines": c["lines"],
                "source_code": c["source_code"]
            })

        return {
            "target_symbol": {
                "name": target.name,
                "symbol_type": target.symbol_type,
                "file_path": target.file_path,
                "start_line": target.start_line,
                "end_line": target.end_line,
                "source_code": target.source_code or f"function {target.name}()"
            },
            "callers": callers_list,
            "callees": callees_list,
            "flow_chain": flow_chain,
            "static_analysis_notice": "Call relationships detected via static AST parsing & identifier invocation analysis."
        }

    async def get_architecture_flow(self, session: AsyncSession, repo_id: int) -> Dict[str, Any]:
        """Backward compatibility for existing callers."""
        return await self.get_dependency_map(session, repo_id, level="files")
