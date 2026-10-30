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
        files = files_res.scalars().all()

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
        files = files_res.scalars().all()

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
        files = files_res.scalars().all()

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

        # Build stages deterministically based on actual indexed codebase
        stages: List[Dict[str, Any]] = []

        # Find entry point
        entry_file = None
        for f in files:
            if f.architectural_role == "Entry Point":
                entry_file = f
                break
        if not entry_file and files:
            for f in files:
                p = f.file_path.lower()
                if "index." in p or "app." in p or "main." in p or "express." in p:
                    entry_file = f
                    break
        if not entry_file and files:
            entry_file = files[0]

        # Find router / controller
        router_file = None
        for f in files:
            if f.architectural_role == "Route / Controller":
                router_file = f
                break
        if not router_file:
            for f in files:
                if "router" in f.file_path.lower() or "route" in f.file_path.lower():
                    router_file = f
                    break

        # Find middleware or service
        service_file = None
        for f in files:
            if f.architectural_role == "Service":
                service_file = f
                break
        if not service_file:
            for f in files:
                if "middleware" in f.file_path.lower() or "layer" in f.file_path.lower():
                    service_file = f
                    break

        # Find response / model / utility
        response_file = None
        for f in files:
            if "response" in f.file_path.lower() or "view" in f.file_path.lower() or "model" in f.file_path.lower():
                response_file = f
                break

        # Find error handler
        error_file = None
        for f in files:
            if "error" in f.file_path.lower() or "status" in f.file_path.lower():
                error_file = f
                break

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
            snippet = "\n".join(lines[start - 1:end])
            return {
                "file_path": f.file_path,
                "start_line": start,
                "end_line": end,
                "snippet": snippet
            }

        # Stage 1: Entry Point
        if entry_file:
            stages.append({
                "stage_number": 1,
                "title": "Application Entry & Initialization",
                "component": entry_file.file_path,
                "role": entry_file.architectural_role or "Entry Point",
                "function_or_symbol": "createApplication / export",
                "description": f"Incoming HTTP request arrives at the primary entry module '{os.path.basename(entry_file.file_path)}', configuring application prototypes and dispatch channels.",
                "input_spec": "Incoming HTTP Connection / Request Header",
                "output_spec": "Application Context & Dispatch Handlers",
                "code_reference": get_snippet(entry_file, "express"),
                "is_error_stage": False
            })

        # Stage 2: Routing / Dispatch
        if router_file:
            stages.append({
                "stage_number": 2,
                "title": "Route Matching & Layer Traversal",
                "component": router_file.file_path,
                "role": router_file.architectural_role or "Route / Controller",
                "function_or_symbol": "handle / dispatch",
                "description": f"The router iterates matched route stacks in '{os.path.basename(router_file.file_path)}', testing URL path expressions against registered handlers.",
                "input_spec": "Parsed Request URL & HTTP Method",
                "output_spec": "Matching Route Handler Closure",
                "code_reference": get_snippet(router_file, "handle"),
                "is_error_stage": False
            })

        # Stage 3: Middleware Execution / Business Logic
        if service_file:
            stages.append({
                "stage_number": 3,
                "title": "Middleware Pipeline Execution",
                "component": service_file.file_path,
                "role": service_file.architectural_role or "Service",
                "function_or_symbol": "handle_request / next()",
                "description": f"Executes sequential middleware in '{os.path.basename(service_file.file_path)}', evaluating guards, headers, and transforming the request state.",
                "input_spec": "Request (req), Response (res), and next callback",
                "output_spec": "Transformed context or early termination",
                "code_reference": get_snippet(service_file, "next"),
                "is_error_stage": False
            })

        # Stage 4: Response Generation
        if response_file:
            stages.append({
                "stage_number": 4,
                "title": "Response Formatting & Transmission",
                "component": response_file.file_path,
                "role": response_file.architectural_role or "Data / Output",
                "function_or_symbol": "send / json / format",
                "description": f"Serializes output payloads in '{os.path.basename(response_file.file_path)}', formatting headers, content-type negotiation, and flushing socket buffers.",
                "input_spec": "JSON Body / Render Template / Status Code",
                "output_spec": "HTTP 200/201 Byte Stream to Client",
                "code_reference": get_snippet(response_file, "send"),
                "is_error_stage": False
            })

        # Stage 5: Error Boundary Fallback
        fallback_file = error_file or router_file or entry_file
        if fallback_file:
            stages.append({
                "stage_number": 5,
                "title": "Error Propagation & Fallback",
                "component": fallback_file.file_path,
                "role": "Error Boundary",
                "function_or_symbol": "handle_error(err, req, res, next)",
                "description": f"Catches unhandled rejections or explicitly passed errors, formatting HTTP 500/404 payloads safely via '{os.path.basename(fallback_file.file_path)}'.",
                "input_spec": "Error Object (err) caught in pipeline",
                "output_spec": "Structured Error Response (HTTP 4xx / 5xx)",
                "code_reference": get_snippet(fallback_file, "error"),
                "is_error_stage": True
            })

        # Convert stages to React Flow nodes and edges
        nodes = []
        edges = []
        x_offset = 60
        y_offset = 120

        for idx, stage in enumerate(stages):
            node_id = f"stage-{stage['stage_number']}"
            nodes.append({
                "id": node_id,
                "type": "featureStageNode",
                "position": {"x": x_offset + (idx * 320), "y": y_offset if not stage["is_error_stage"] else y_offset + 180},
                "data": stage
            })

            if idx > 0 and not stage["is_error_stage"]:
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
        if len(stages) >= 5:
            edges.append({
                "id": "e-stage-error-branch",
                "source": "stage-2",
                "target": "stage-5",
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
    # VIEW 4: EXECUTION PATH (Callers & Callees Tracing)
    # =========================================================================
    async def get_execution_path(self, session: AsyncSession, repo_id: int, symbol_name: str) -> Dict[str, Any]:
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
        if not target:
            return {"error": f"Symbol '{symbol_name}' not found in indexed codebase."}

        # Fetch file for target
        file_res = await session.execute(select(RepoFile).where(RepoFile.id == target.file_id))
        target_file = file_res.scalar_one_or_none()

        # Find incoming callers (dependencies where target_symbol == target.name)
        callers_stmt = select(Dependency).where(
            Dependency.repository_id == repo_id,
            func.lower(Dependency.target_symbol) == symbol_name.lower(),
            Dependency.relationship_type.in_(["calls", "imports"])
        )
        callers_res = await session.execute(callers_stmt)
        callers_deps = callers_res.scalars().all()

        # Find downstream callees (dependencies where source_file == target.file_path and relationship_type == 'calls')
        callees_stmt = select(Dependency).where(
            Dependency.repository_id == repo_id,
            Dependency.source_file_path == target.file_path,
            Dependency.relationship_type == "calls"
        )
        callees_res = await session.execute(callees_stmt)
        callees_deps = callees_res.scalars().all()

        callers_list = []
        for cd in callers_deps[:10]:
            callers_list.append({
                "name": cd.source_symbol or cd.source_file_path.split("/")[-1],
                "symbol_type": "caller",
                "file_path": cd.source_file_path,
                "lines": str(cd.evidence_line or 1),
                "source_code": cd.evidence_snippet or f"{symbol_name}() call"
            })

        callees_list = []
        for c in callees_deps[:10]:
            callees_list.append({
                "name": c.target_symbol,
                "symbol_type": "function",
                "file_path": c.target_file_path or target.file_path,
                "lines": str(c.evidence_line or 1),
                "source_code": c.evidence_snippet or f"invocation of {c.target_symbol}()"
            })

        # Construct Flow Chain: CALLERS -> TARGET -> CALLEES
        flow_chain = []
        for c in callers_list[:2]:
            flow_chain.append({
                "stage": "CALLER",
                "name": c["name"],
                "symbol_name": c["name"],
                "title": f"Upstream: {c['name']}",
                "symbol_type": "caller",
                "file_path": c["file_path"],
                "lines": c["lines"],
                "snippet": c["source_code"],
                "source_code": c["source_code"],
                "role": "Caller"
            })

        flow_chain.append({
            "stage": "TARGET",
            "name": target.name,
            "symbol_name": target.name,
            "title": f"Target: {target.name}()",
            "symbol_type": target.symbol_type,
            "file_path": target.file_path,
            "lines": f"{target.start_line}-{target.end_line}",
            "snippet": target.source_code[:500] if target.source_code else f"def {target.name}(...)",
            "source_code": target.source_code or "",
            "role": target_file.architectural_role if target_file else "Function"
        })

        for c in callees_list[:3]:
            flow_chain.append({
                "stage": "CALLEE",
                "name": c["name"],
                "symbol_name": c["name"],
                "title": f"Downstream: {c['name']}()",
                "symbol_type": c["symbol_type"],
                "file_path": c["file_path"],
                "lines": c["lines"],
                "snippet": c["source_code"],
                "source_code": c["source_code"],
                "role": "Callee"
            })

        return {
            "target_symbol": {
                "name": target.name,
                "symbol_type": target.symbol_type,
                "file_path": target.file_path,
                "start_line": target.start_line,
                "end_line": target.end_line,
                "source_code": target.source_code or ""
            },
            "callers": callers_list,
            "callees": callees_list,
            "flow_chain": flow_chain,
            "static_analysis_notice": "Static invocation mapping reconstructed from AST symbol call expressions."
        }

    # =========================================================================
    # VIEW 5: NEURAL NETWORK COSMOS GRAPH (Branch Palettes & Depth Gradients)
    # =========================================================================
    @staticmethod
    def _hsl_to_hex(h: float, s: float, l: float) -> str:
        s_norm = max(0.0, min(100.0, s)) / 100.0
        l_norm = max(0.0, min(100.0, l)) / 100.0
        h_norm = h % 360.0

        c = (1.0 - abs(2.0 * l_norm - 1.0)) * s_norm
        x = c * (1.0 - abs(((h_norm / 60.0) % 2.0) - 1.0))
        m = l_norm - c / 2.0

        if 0 <= h_norm < 60:
            r_prime, g_prime, b_prime = c, x, 0
        elif 60 <= h_norm < 120:
            r_prime, g_prime, b_prime = x, c, 0
        elif 120 <= h_norm < 180:
            r_prime, g_prime, b_prime = 0, c, x
        elif 180 <= h_norm < 240:
            r_prime, g_prime, b_prime = 0, x, c
        elif 240 <= h_norm < 300:
            r_prime, g_prime, b_prime = x, 0, c
        else:
            r_prime, g_prime, b_prime = c, 0, x

        r = int(round((r_prime + m) * 255))
        g = int(round((g_prime + m) * 255))
        b = int(round((b_prime + m) * 255))
        return f"#{r:02x}{g:02x}{b:02x}"

    async def get_obsidian_graph(self, session: AsyncSession, repo_id: int) -> Dict[str, Any]:
        """
        Builds the Neural Network Knowledge Graph of the repository:
        - Each top-level root folder receives a distinct vibrant neon hue.
        - Child sub-folders inherit the hue and become lighter.
        - Sub-files and leaf nodes become even lighter glowing tints.
        - Synapses map both structural containment and cross-module import calls.
        """
        files_stmt = select(RepoFile).where(RepoFile.repository_id == repo_id)
        files_res = await session.execute(files_stmt)
        files = files_res.scalars().all()

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

        # 10 Distinct Vibrant Neon Branch Palettes
        BRANCH_PALETTES = [
            {"name": "Cyber Violet", "h": 265, "s": 92, "base_l": 52},
            {"name": "Neon Cyan", "h": 190, "s": 96, "base_l": 48},
            {"name": "Radiant Emerald", "h": 155, "s": 86, "base_l": 44},
            {"name": "Electric Amber", "h": 38, "s": 96, "base_l": 50},
            {"name": "Cyber Rose", "h": 345, "s": 92, "base_l": 55},
            {"name": "Neon Blue", "h": 218, "s": 94, "base_l": 55},
            {"name": "Solar Orange", "h": 22, "s": 95, "base_l": 52},
            {"name": "Neon Fuchsia", "h": 295, "s": 88, "base_l": 54},
            {"name": "Acid Lime", "h": 95, "s": 88, "base_l": 46},
            {"name": "Seafoam Teal", "h": 172, "s": 90, "base_l": 45},
        ]
        ROOT_FILE_PALETTE = {"name": "Titanium Slate", "h": 215, "s": 25, "base_l": 62}

        # Identify top-level root folders
        top_folder_counts = defaultdict(int)
        for f in files:
            parts = f.file_path.split("/")
            if len(parts) > 1:
                top_folder_counts[parts[0]] += 1
            else:
                top_folder_counts["__root__"] += 1

        sorted_top_folders = sorted(
            [k for k in top_folder_counts.keys() if k != "__root__"],
            key=lambda k: top_folder_counts[k],
            reverse=True
        )

        folder_palettes = {}
        for idx, folder in enumerate(sorted_top_folders):
            folder_palettes[folder] = BRANCH_PALETTES[idx % len(BRANCH_PALETTES)]
        folder_palettes["__root__"] = ROOT_FILE_PALETTE

        # Aggregate directories
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
                            "root_folder": parts[0]
                        }
                    dirs[cur_path]["files"].append(f.file_path)
                    if i > 0:
                        parent_path = os.path.dirname(cur_path)
                        if parent_path in dirs:
                            dirs[parent_path]["subdirs"].add(cur_path)

        nodes: List[Dict[str, Any]] = []
        links: List[Dict[str, Any]] = []

        # Root Core Node
        root_core_id = "dir:root"
        nodes.append({
            "id": root_core_id,
            "name": "Neural Core",
            "type": "directory",
            "path": "",
            "size": 30,
            "color": "#6366f1",
            "baseColor": "#6366f1",
            "rootFolder": "Core",
            "depth": 0,
            "fileCount": len(files),
            "directoryCount": len(dirs)
        })

        # Add Directory Nodes with Depth-Lightened Tints
        for dpath, dinfo in sorted(dirs.items(), key=lambda x: x[1]["depth"]):
            dir_node_id = f"dir:{dpath}"
            root_f = dinfo["root_folder"]
            pal = folder_palettes.get(root_f, ROOT_FILE_PALETTE)
            d_depth = dinfo["depth"]

            # Main Folder (depth 0) is darkest/most saturated; deeper subfolders become lighter
            dir_lightness = pal["base_l"] + min(d_depth * 10, 24)
            dir_color = self._hsl_to_hex(pal["h"], pal["s"], dir_lightness)
            base_color = self._hsl_to_hex(pal["h"], pal["s"], pal["base_l"])

            nodes.append({
                "id": dir_node_id,
                "name": dinfo["name"],
                "type": "directory",
                "path": dpath,
                "size": 24 if d_depth == 0 else 16,
                "color": dir_color,
                "baseColor": base_color,
                "rootFolder": root_f,
                "depth": d_depth,
                "fileCount": len(dinfo["files"]),
                "folderCount": len(dinfo["subdirs"]),
            })

            parent_id = f"dir:{dinfo['parent']}" if dinfo["parent"] else root_core_id
            links.append({
                "source": parent_id,
                "target": dir_node_id,
                "type": "contains",
                "value": 1,
                "branchColor": base_color,
                "color": dir_color
            })

        # Add File Nodes with progressive sub-file lightening
        for f in files:
            file_node_id = f"file:{f.file_path}"
            f_syms = sym_by_file[f.file_path]
            parts = f.file_path.split("/")
            
            if len(parts) > 1:
                root_f = parts[0]
                f_depth = len(parts) - 1
                f_dir = os.path.dirname(f.file_path)
                parent_id = f"dir:{f_dir}" if f_dir in dirs else root_core_id
            else:
                root_f = "__root__"
                f_depth = 1
                parent_id = root_core_id

            pal = folder_palettes.get(root_f, ROOT_FILE_PALETTE)

            # Files are lighter than their parent folders: depth-based progressive tinting
            file_lightness = min(88, pal["base_l"] + 16 + min(f_depth * 8, 30))
            file_sat = max(45, pal["s"] - f_depth * 6)
            file_color = self._hsl_to_hex(pal["h"], file_sat, file_lightness)
            base_color = self._hsl_to_hex(pal["h"], pal["s"], pal["base_l"])

            node_size = max(8, min(18, 8 + (f.line_count // 150) + in_degree[f.file_path]))

            nodes.append({
                "id": file_node_id,
                "name": os.path.basename(f.file_path),
                "type": "file",
                "path": f.file_path,
                "size": node_size,
                "color": file_color,
                "baseColor": base_color,
                "rootFolder": root_f if root_f != "__root__" else "Root Files",
                "depth": f_depth,
                "language": f.language,
                "lineCount": f.line_count,
                "fileSize": f.file_size,
                "functionCount": len([s for s in f_syms if s.symbol_type in ("function", "method")]),
                "classCount": len([s for s in f_syms if s.symbol_type == "class"]),
                "inDegree": in_degree[f.file_path],
                "outDegree": out_degree[f.file_path],
                "architecturalRole": f.architectural_role or "Unknown"
            })

            links.append({
                "source": parent_id,
                "target": file_node_id,
                "type": "contains",
                "value": 1,
                "branchColor": base_color,
                "color": file_color
            })

        # Add Cross-File Dependency Links (Synapses)
        file_paths_set = {f.file_path for f in files}
        for d in deps:
            if d.source_file_path in file_paths_set and d.target_file_path in file_paths_set:
                links.append({
                    "source": f"file:{d.source_file_path}",
                    "target": f"file:{d.target_file_path}",
                    "type": d.relationship_type or "imports",
                    "value": 2,
                    "color": RELATIONSHIP_COLORS.get(d.relationship_type, "#818cf8"),
                    "branchColor": "#818cf8"
                })

        # Summary of root folder clusters for frontend filter bar
        root_folders_summary = []
        for folder in sorted_top_folders:
            pal = folder_palettes[folder]
            root_folders_summary.append({
                "name": folder,
                "color": self._hsl_to_hex(pal["h"], pal["s"], pal["base_l"]),
                "file_count": top_folder_counts[folder]
            })

        if top_folder_counts["__root__"] > 0:
            root_folders_summary.append({
                "name": "Root Files",
                "color": self._hsl_to_hex(ROOT_FILE_PALETTE["h"], ROOT_FILE_PALETTE["s"], ROOT_FILE_PALETTE["base_l"]),
                "file_count": top_folder_counts["__root__"]
            })

        return {
            "nodes": nodes,
            "links": links,
            "root_folders": root_folders_summary,
            "stats": {
                "total_nodes": len(nodes),
                "total_links": len(links),
                "total_directories": len(dirs),
                "total_files": len(files)
            }
        }

    # =========================================================================
    # BACKWARD COMPATIBLE LEGACY METHODS
    # =========================================================================
    async def get_architecture_flow(self, session: AsyncSession, repo_id: int) -> Dict[str, Any]:
        """Backward compatibility for existing callers."""
        return await self.get_dependency_map(session, repo_id, level="files")
