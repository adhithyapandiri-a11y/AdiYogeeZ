from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.app.models.schema import CodeSymbol
from backend.app.services.graph_service import GraphService

router = APIRouter(prefix="/execution-path", tags=["Execution Path Explorer"])
graph_service = GraphService()

@router.get("/symbols/{repo_id}")
async def list_available_symbols(repo_id: int, db: AsyncSession = Depends(get_db)):
    """Provides auto-complete options for function and method search."""
    stmt = select(CodeSymbol.name, CodeSymbol.symbol_type, CodeSymbol.file_path)\
        .where(CodeSymbol.repository_id == repo_id, CodeSymbol.symbol_type.in_(["function", "method"]))\
        .order_by(CodeSymbol.name)\
        .limit(100)
    res = await db.execute(stmt)
    rows = res.all()
    return [{"name": r[0], "symbol_type": r[1], "file_path": r[2]} for r in rows]

@router.get("/trace/{repo_id}")
async def trace_execution_path(
    repo_id: int, 
    symbol: str = Query(...), 
    db: AsyncSession = Depends(get_db)
):
    """Traces callers and callees for the specified function/method."""
    result = await graph_service.get_execution_path(db, repo_id, symbol)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
