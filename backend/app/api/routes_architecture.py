import os
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.app.models.schema import Repository, RepoFile, CodeSymbol, Dependency
from backend.app.services.graph_service import GraphService

router = APIRouter(prefix="/architecture", tags=["Architecture Explorer"])
graph_service = GraphService()

class FeatureFlowRequest(BaseModel):
    repo_id: int
    workflow_query: Optional[str] = None

@router.get("/project-structure/{repo_id}")
async def get_project_structure(repo_id: int, db: AsyncSession = Depends(get_db)):
    """Physical folder and file hierarchy (containment only)."""
    return await graph_service.get_project_structure(db, repo_id)

@router.get("/dependency-map/{repo_id}")
async def get_dependency_map(
    repo_id: int,
    level: str = Query("files", description="Level of exploration: 'modules' or 'files'"),
    selected_module: Optional[str] = Query(None, description="Optional module filter"),
    db: AsyncSession = Depends(get_db)
):
    """Structured dependency graph with canonical metrics and semantic relationship types."""
    return await graph_service.get_dependency_map(db, repo_id, level=level, selected_module=selected_module)

@router.post("/feature-flow")
async def get_feature_flow(
    req: FeatureFlowRequest,
    db: AsyncSession = Depends(get_db)
):
    """Execution pipeline tracing real workflows across architecture layers."""
    return await graph_service.get_feature_flow(db, req.repo_id, workflow_query=req.workflow_query)

@router.get("/edge-details/{repo_id}")
async def get_edge_details(
    repo_id: int,
    source: str = Query(..., description="Source file path"),
    target: str = Query(..., description="Target file path"),
    rel_type: Optional[str] = Query(None, description="Relationship type"),
    db: AsyncSession = Depends(get_db)
):
    """Exact line number and code evidence for a clicked relationship edge."""
    return await graph_service.get_edge_details(db, repo_id, source=source, target=target, rel_type=rel_type)

@router.get("/node-details/{repo_id}")
async def get_node_details(
    repo_id: int,
    path: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Slide-out inspector drawer data for a clicked node (handles files, directory hubs, and symbols)."""
    raw_path = path.strip()
    clean_path = raw_path.removeprefix("file:").removeprefix("dir:").removeprefix("sym:").strip("/")

    # Check if path had symbol prefix/suffix like "file_path:symbol"
    if ":" in clean_path and not clean_path.startswith("http"):
        parts = clean_path.split(":")
        clean_path = parts[0]

    # 1. Exact RepoFile match
    stmt = select(RepoFile).where(RepoFile.repository_id == repo_id, RepoFile.file_path == clean_path)
    res = await db.execute(stmt)
    rf = res.scalars().first()

    # 2. Flexible file match (case-insensitive, ends-with, or raw)
    if not rf:
        stmt = select(RepoFile).where(
            RepoFile.repository_id == repo_id,
            or_(
                func.lower(RepoFile.file_path) == clean_path.lower(),
                RepoFile.file_path.endswith("/" + clean_path),
                RepoFile.file_path == raw_path
            )
        )
        res = await db.execute(stmt)
        rf = res.scalars().first()

    if rf:
        sym_stmt = select(CodeSymbol).where(CodeSymbol.file_id == rf.id)
        sym_res = await db.execute(sym_stmt)
        symbols = sym_res.scalars().all()

        in_deps_stmt = select(Dependency).where(
            Dependency.repository_id == repo_id, Dependency.target_file_path == rf.file_path
        )
        in_res = await db.execute(in_deps_stmt)
        incoming_deps = in_res.scalars().all()

        out_deps_stmt = select(Dependency).where(
            Dependency.repository_id == repo_id, Dependency.source_file_path == rf.file_path
        )
        out_res = await db.execute(out_deps_stmt)
        outgoing_deps = out_res.scalars().all()

        return {
            "file_path": rf.file_path,
            "language": rf.language or "Text",
            "line_count": rf.line_count or 0,
            "file_size": rf.file_size or 0,
            "architectural_role": rf.architectural_role or "File Module",
            "module_name": rf.module_name or (rf.file_path.split("/")[0] if "/" in rf.file_path else "Root"),
            "preview": rf.content[:3500] if rf.content else "// No preview content available",
            "functions": [
                {"name": s.name, "lines": f"{s.start_line}-{s.end_line}", "type": s.symbol_type}
                for s in symbols if s.symbol_type in ("function", "method")
            ],
            "classes": [
                {"name": s.name, "lines": f"{s.start_line}-{s.end_line}", "type": s.symbol_type}
                for s in symbols if s.symbol_type == "class"
            ],
            "incoming_dependencies": [
                {"file_path": d.source_file_path, "relationship_type": d.relationship_type or "imports", "evidence_line": d.evidence_line}
                for d in incoming_deps
            ],
            "outgoing_dependencies": [
                {"file_path": d.target_file_path, "relationship_type": d.relationship_type or "imports", "evidence_line": d.evidence_line}
                for d in outgoing_deps
            ],
            "is_directory": False,
            "contained_files": []
        }

    # 3. Directory Hub resolution (prefix match, directory path, or subfolder)
    dir_stmt = select(RepoFile).where(
        RepoFile.repository_id == repo_id,
        or_(
            RepoFile.file_path.startswith(clean_path + "/"),
            RepoFile.file_path.contains("/" + clean_path + "/"),
            RepoFile.file_path.endswith("/" + clean_path),
            RepoFile.file_path == clean_path
        )
    )
    dir_res = await db.execute(dir_stmt)
    dir_files = dir_res.scalars().all()

    if not dir_files and clean_path:
        folder_name = clean_path.split("/")[-1]
        fallback_stmt = select(RepoFile).where(
            RepoFile.repository_id == repo_id,
            RepoFile.file_path.contains("/" + folder_name + "/")
        )
        dir_res = await db.execute(fallback_stmt)
        dir_files = dir_res.scalars().all()

    if not dir_files:
        raise HTTPException(status_code=404, detail=f"Node '{path}' not found in repository.")

    dir_file_paths = [f.file_path for f in dir_files]
    dir_file_ids = [f.id for f in dir_files]
    folder_display_name = clean_path.split("/")[-1] or clean_path
    total_lines = sum(f.line_count or 0 for f in dir_files)
    total_size = sum(f.file_size or 0 for f in dir_files)

    # Dominant language
    lang_counts = {}
    for f in dir_files:
        l = f.language or "Text"
        lang_counts[l] = lang_counts.get(l, 0) + 1
    dominant_lang = max(lang_counts.items(), key=lambda x: x[1])[0] if lang_counts else "Directory"

    # Aggregated symbols in this directory (up to 30)
    syms_stmt = select(CodeSymbol).where(CodeSymbol.file_id.in_(dir_file_ids)).limit(40)
    syms_res = await db.execute(syms_stmt)
    all_syms = syms_res.scalars().all()

    # External dependencies
    in_deps_stmt = select(Dependency).where(
        Dependency.repository_id == repo_id,
        Dependency.target_file_path.in_(dir_file_paths),
        ~Dependency.source_file_path.in_(dir_file_paths)
    ).limit(30)
    in_res = await db.execute(in_deps_stmt)
    dir_in_deps = in_res.scalars().all()

    out_deps_stmt = select(Dependency).where(
        Dependency.repository_id == repo_id,
        Dependency.source_file_path.in_(dir_file_paths),
        ~Dependency.target_file_path.in_(dir_file_paths)
    ).limit(30)
    out_res = await db.execute(out_deps_stmt)
    dir_out_deps = out_res.scalars().all()

    # ASCII file tree for preview
    preview_lines = [
        f"Directory Hub: {clean_path}",
        f"Contained Files: {len(dir_files)} | Total Lines: {total_lines:,} | Size: {round(total_size / 1024, 1)} KB",
        "--------------------------------------------------",
    ]
    for df in dir_files[:15]:
        rel = df.file_path[len(clean_path):].lstrip("/") if df.file_path.startswith(clean_path) else os.path.basename(df.file_path)
        preview_lines.append(f"  • {rel}  ({df.language}, {df.line_count or 0} lines)")
    if len(dir_files) > 15:
        preview_lines.append(f"  ... and {len(dir_files) - 15} more files")

    contained_list = [
        {
            "file_path": f.file_path,
            "name": os.path.basename(f.file_path),
            "language": f.language or "Text",
            "lines": f.line_count or 0,
            "role": f.architectural_role or "File"
        }
        for f in dir_files
    ]

    return {
        "file_path": clean_path,
        "language": f"{dominant_lang} (Directory)",
        "line_count": total_lines,
        "file_size": total_size,
        "architectural_role": "Directory Hub / Package Module",
        "module_name": folder_display_name,
        "preview": "\n".join(preview_lines),
        "functions": [
            {"name": s.name, "lines": f"{s.start_line}-{s.end_line}", "type": s.symbol_type}
            for s in all_syms if s.symbol_type in ("function", "method")
        ][:25],
        "classes": [
            {"name": s.name, "lines": f"{s.start_line}-{s.end_line}", "type": s.symbol_type}
            for s in all_syms if s.symbol_type == "class"
        ][:20],
        "incoming_dependencies": [
            {"file_path": d.source_file_path, "relationship_type": d.relationship_type or "imports", "evidence_line": d.evidence_line}
            for d in dir_in_deps
        ],
        "outgoing_dependencies": [
            {"file_path": d.target_file_path, "relationship_type": d.relationship_type or "imports", "evidence_line": d.evidence_line}
            for d in dir_out_deps
        ],
        "is_directory": True,
        "contained_files": contained_list
    }

# Obsidian Constellation Graph Endpoint
@router.get("/obsidian/{repo_id}")
async def get_obsidian_graph(repo_id: int, db: AsyncSession = Depends(get_db)):
    """Interactive force-directed constellation network of directory hubs, files, and functions."""
    return await graph_service.get_obsidian_graph(db, repo_id)

@router.get("/flow/{repo_id}")
async def get_architecture_flow(repo_id: int, db: AsyncSession = Depends(get_db)):
    return await graph_service.get_dependency_map(db, repo_id, level="files")
