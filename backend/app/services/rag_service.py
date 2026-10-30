import math
import re
from typing import List, Dict, Any, Tuple
import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.schema import CodeChunk, RepoFile
from backend.app.services.llm_service import LLMService

class RAGService:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    @staticmethod
    def chunk_file(file_path: str, content: str, symbols: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Chunks code files by symbol boundaries and sliding window for non-symbol code.
        """
        lines = content.splitlines()
        chunks: List[Dict[str, Any]] = []
        covered_lines = set()

        # 1. Chunk by extracted symbols
        for sym in symbols:
            s_line = sym.get("start_line", 1)
            e_line = sym.get("end_line", s_line + 10)
            
            # Bound within file
            s_idx = max(0, s_line - 1)
            e_idx = min(len(lines), e_line)
            
            chunk_text = "\n".join(lines[s_idx:e_idx])
            if chunk_text.strip():
                chunks.append({
                    "file_path": file_path,
                    "start_line": s_line,
                    "end_line": e_line,
                    "symbol_name": sym.get("name", ""),
                    "content": chunk_text
                })
                for l in range(s_line, e_line + 1):
                    covered_lines.add(l)

        # 2. Window chunking for remaining code (e.g. script files or code outside functions)
        window_size = 40
        overlap = 10
        i = 0
        while i < len(lines):
            # Check if region is already covered
            if not any(l in covered_lines for l in range(i + 1, min(len(lines), i + window_size) + 1)):
                chunk_slice = lines[i:i + window_size]
                chunk_text = "\n".join(chunk_slice)
                if chunk_text.strip() and len(chunk_text.strip()) > 30:
                    chunks.append({
                        "file_path": file_path,
                        "start_line": i + 1,
                        "end_line": min(len(lines), i + window_size),
                        "symbol_name": "",
                        "content": chunk_text
                    })
            i += (window_size - overlap)

        return chunks

    @staticmethod
    def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        if not vec_a or not vec_b:
            return 0.0
        a = np.array(vec_a, dtype=float)
        b = np.array(vec_b, dtype=float)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    @staticmethod
    def _bm25_token_match(query: str, text: str, file_path: str, symbol_name: str) -> float:
        """Lightweight keyword boost for exact code tokens."""
        q_tokens = set(re.findall(r'[a-zA-Z0-9_]+', query.lower()))
        if not q_tokens:
            return 0.0
        
        target = f"{file_path} {symbol_name} {text}".lower()
        score = 0.0
        for token in q_tokens:
            if len(token) < 2:
                continue
            if token in symbol_name.lower():
                score += 1.5
            if token in file_path.lower():
                score += 1.0
            if token in target:
                score += 0.5
        return score / max(1, len(q_tokens))

    async def search(
        self, 
        session: AsyncSession, 
        repo_id: int, 
        query: str, 
        top_k: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Performs hybrid retrieval (Semantic Vector + BM25 Keyword) on repository code chunks.
        """
        # 1. Generate query embedding
        query_embedding = await self.llm.generate_embedding(query)
        has_query_embedding = any(query_embedding)

        # 2. Fetch repo chunks
        stmt = select(CodeChunk).where(CodeChunk.repository_id == repo_id)
        result = await session.execute(stmt)
        chunks = result.scalars().all()

        if not chunks:
            return []

        scored_chunks: List[Tuple[float, CodeChunk]] = []

        for chunk in chunks:
            semantic_score = 0.0
            if has_query_embedding and chunk.embedding_json:
                semantic_score = self._cosine_similarity(query_embedding, chunk.embedding_json)

            keyword_score = self._bm25_token_match(
                query=query, 
                text=chunk.content, 
                file_path=chunk.file_path, 
                symbol_name=chunk.symbol_name or ""
            )

            # Combined hybrid score (70% semantic, 30% keyword match)
            total_score = (semantic_score * 0.7) + (keyword_score * 0.3)
            scored_chunks.append((total_score, chunk))

        # Sort descending by score
        scored_chunks.sort(key=lambda x: x[0], reverse=True)

        top_results = []
        for score, ch in scored_chunks[:top_k]:
            top_results.append({
                "id": ch.id,
                "file_path": ch.file_path,
                "start_line": ch.start_line,
                "end_line": ch.end_line,
                "symbol_name": ch.symbol_name,
                "content": ch.content,
                "relevance_score": round(score, 4)
            })

        return top_results
