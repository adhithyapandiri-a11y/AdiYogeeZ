from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.services.llm_service import LLMService
from backend.app.services.impact_service import ImpactService

router = APIRouter(prefix="/impact", tags=["Impact Analyzer"])
llm_service = LLMService()
impact_service = ImpactService(llm_service)

class AnalyzeImpactRequest(BaseModel):
    repo_id: int
    proposed_change: str

@router.post("/analyze")
async def analyze_code_change_impact(payload: AnalyzeImpactRequest, db: AsyncSession = Depends(get_db)):
    """Computes dependency blast radius and assigns High/Medium/Low tiers with explanations."""
    if not payload.proposed_change.strip():
        raise HTTPException(status_code=400, detail="Proposed change description cannot be empty.")

    result = await impact_service.analyze_impact(
        session=db,
        repo_id=payload.repo_id,
        proposed_change=payload.proposed_change
    )
    return result
