from collections import defaultdict
from typing import Dict, Any, List, Set
import networkx as nx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.schema import RepoFile, CodeSymbol, Dependency
from backend.app.services.llm_service import LLMService

class ImpactService:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    async def analyze_impact(
        self, 
        session: AsyncSession, 
        repo_id: int, 
        proposed_change: str
    ) -> Dict[str, Any]:
        """
        Calculates blast radius of a proposed code change across the dependency graph.
        """
        # Fetch repo files, symbols and dependencies
        files_res = await session.execute(select(RepoFile).where(RepoFile.repository_id == repo_id))
        all_files = files_res.scalars().all()

        deps_res = await session.execute(select(Dependency).where(Dependency.repository_id == repo_id))
        all_deps = deps_res.scalars().all()

        symbols_res = await session.execute(select(CodeSymbol).where(CodeSymbol.repository_id == repo_id))
        all_symbols = symbols_res.scalars().all()

        # Build reverse dependency graph (target_file -> source_file that imports it)
        # because if file B changes, file A (which imports B) is impacted!
        rev_graph = nx.DiGraph()
        for f in all_files:
            rev_graph.add_node(f.file_path, file_obj=f)

        for d in all_deps:
            # d.source_file_path imports d.target_file_path
            # Ripple direction: target -> source
            rev_graph.add_edge(d.target_file_path, d.source_file_path, rel=d.relationship_type)

        # 1. Identify Seed Files from proposed change query
        query_words = set(proposed_change.lower().replace("-", " ").replace("_", " ").split())
        seed_files: Set[str] = set()
        matched_symbols: List[str] = []

        for f in all_files:
            p_lower = f.file_path.lower()
            if any(w in p_lower for w in query_words if len(w) > 2):
                seed_files.add(f.file_path)

        for s in all_symbols:
            s_lower = s.name.lower()
            if any(w in s_lower for w in query_words if len(w) > 2):
                seed_files.add(s.file_path)
                matched_symbols.append(s.name)

        # If no seeds matched by keyword, pick the most relevant file or fallback
        if not seed_files and all_files:
            seed_files.add(all_files[0].file_path)

        # 2. Compute Transitive Impact Blast Radius
        high_impact: List[Dict[str, Any]] = []
        med_impact: List[Dict[str, Any]] = []
        low_impact: List[Dict[str, Any]] = []

        visited = set(seed_files)

        # Direct Seed Files (High Impact)
        for s_file in seed_files:
            high_impact.append({
                "file_path": s_file,
                "tier": "HIGH",
                "reason": "Direct target of the proposed change (matched keywords or symbols).",
                "is_seed": True
            })

        # Level 1 Dependents (Direct Callers / Importers -> High Impact)
        level_1 = set()
        for s_file in seed_files:
            if s_file in rev_graph:
                for successor in rev_graph.successors(s_file):
                    if successor not in visited:
                        visited.add(successor)
                        level_1.add(successor)
                        high_impact.append({
                            "file_path": successor,
                            "tier": "HIGH",
                            "reason": f"Directly imports/depends on '{s_file}'.",
                            "is_seed": False
                        })

        # Level 2 Dependents (Transitive Callers -> Medium Impact)
        level_2 = set()
        for l1_file in level_1:
            if l1_file in rev_graph:
                for successor in rev_graph.successors(l1_file):
                    if successor not in visited:
                        visited.add(successor)
                        level_2.add(successor)
                        med_impact.append({
                            "file_path": successor,
                            "tier": "MEDIUM",
                            "reason": f"Transitively depends on '{l1_file}'.",
                            "is_seed": False
                        })

        # Peripheral & Test Files (Low Impact)
        for f in all_files:
            if f.file_path not in visited:
                p_lower = f.file_path.lower()
                if "test" in p_lower or "spec" in p_lower:
                    low_impact.append({
                        "file_path": f.file_path,
                        "tier": "LOW",
                        "reason": "Test suite file; should be run to prevent regressions.",
                        "is_seed": False
                    })
                elif any(k in p_lower for k in ["config", "doc", "readme", ".json"]):
                    low_impact.append({
                        "file_path": f.file_path,
                        "tier": "LOW",
                        "reason": "Configuration or documentation asset.",
                        "is_seed": False
                    })

        all_affected = high_impact + med_impact + low_impact[:5]

        # 3. AI Blast Radius Explanation
        ai_assessment = await self.llm.analyze_impact(
            proposed_change=proposed_change,
            affected_files=all_affected[:10],
            callers=matched_symbols[:8]
        )

        return {
            "proposed_change": proposed_change,
            "seed_files": list(seed_files),
            "total_affected_count": len(all_affected),
            "tiers": {
                "high": high_impact,
                "medium": med_impact,
                "low": low_impact[:6]
            },
            "ai_assessment": ai_assessment,
            "disclaimer": "This is a static, evidence-based dependency analysis. Runtime dynamic imports and external API contracts should also be verified."
        }
