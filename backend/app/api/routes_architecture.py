from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
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
    """Slide-out inspector drawer data for a clicked node."""
    stmt = select(RepoFile).where(RepoFile.repository_id == repo_id, RepoFile.file_path == path)
    res = await db.execute(stmt)
    rf = res.scalars().first()
    if not rf:
        raise HTTPException(status_code=404, detail="File node not found.")

    sym_stmt = select(CodeSymbol).where(CodeSymbol.file_id == rf.id)
    sym_res = await db.execute(sym_stmt)
    symbols = sym_res.scalars().all()

    # In/Out dependencies with relationship types
    in_deps_stmt = select(Dependency).where(
        Dependency.repository_id == repo_id, Dependency.target_file_path == path
    )
    in_res = await db.execute(in_deps_stmt)
    incoming_deps = in_res.scalars().all()

    out_deps_stmt = select(Dependency).where(
        Dependency.repository_id == repo_id, Dependency.source_file_path == path
    )
    out_res = await db.execute(out_deps_stmt)
    outgoing_deps = out_res.scalars().all()

    incoming_list = [
        {"file_path": d.source_file_path, "relationship_type": d.relationship_type or "imports", "evidence_line": d.evidence_line}
        for d in incoming_deps
    ]
    outgoing_list = [
        {"file_path": d.target_file_path, "relationship_type": d.relationship_type or "imports", "evidence_line": d.evidence_line}
        for d in outgoing_deps
    ]

    return {
        "file_path": rf.file_path,
        "language": rf.language,
        "line_count": rf.line_count,
        "file_size": rf.file_size,
        "architectural_role": rf.architectural_role or "Unknown",
        "module_name": rf.module_name or "Core",
        "preview": rf.content[:2500],
        "functions": [
            {"name": s.name, "lines": f"{s.start_line}-{s.end_line}", "type": s.symbol_type} 
            for s in symbols if s.symbol_type in ("function", "method")
        ],
        "classes": [
            {"name": s.name, "lines": f"{s.start_line}-{s.end_line}", "type": s.symbol_type} 
            for s in symbols if s.symbol_type == "class"
        ],
        "incoming_dependencies": incoming_list,
        "outgoing_dependencies": outgoing_list
    }

# Legacy endpoints for backward compatibility
@router.get("/obsidian/{repo_id}")
async def get_obsidian_graph(repo_id: int, db: AsyncSession = Depends(get_db)):
    return await graph_service.get_project_structure(db, repo_id)

@router.get("/flow/{repo_id}")
async def get_architecture_flow(repo_id: int, db: AsyncSession = Depends(get_db)):
    return await graph_service.get_dependency_map(db, repo_id, level="files")
