from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.models.schema import Repository, RepoFile, CodeSymbol
from backend.app.services.github_service import GitHubService
from backend.app.services.llm_service import LLMService

router = APIRouter(prefix="/contribution", tags=["Contribution Assistant"])
github_service = GitHubService()
llm_service = LLMService()

class RoadmapRequest(BaseModel):
    repo_id: int
    issue_number: int
    issue_title: str
    issue_body: Optional[str] = ""
    beginner_mode: bool = False

@router.get("/issues/{repo_id}")
async def list_repo_issues(repo_id: int, db: AsyncSession = Depends(get_db)):
    """Fetches open GitHub issues for the repository."""
    stmt = select(Repository).where(Repository.id == repo_id)
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    try:
        issues = await github_service.get_issues(repo.owner, repo.name)
        return issues
    except Exception as e:
        # If GitHub API fails or rate limited, return sample/empty list gracefully
        return []

@router.post("/roadmap")
async def generate_contribution_roadmap(payload: RoadmapRequest, db: AsyncSession = Depends(get_db)):
    """Generates structured contribution roadmap grounded in actual repository files."""
    stmt = select(Repository).where(Repository.id == payload.repo_id)
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    # Match relevant files based on keywords in issue title and body
    tokens = set((payload.issue_title + " " + (payload.issue_body or "")).lower().replace("_", " ").split())
    
    files_stmt = select(RepoFile.file_path).where(RepoFile.repository_id == repo.id)
    files_res = await db.execute(files_stmt)
    all_file_paths = files_res.scalars().all()

    relevant_files = []
    for fp in all_file_paths:
        if any(t in fp.lower() for t in tokens if len(t) > 2):
            relevant_files.append(fp)

    if not relevant_files:
        relevant_files = all_file_paths[:10]

    # Sample symbol context
    syms_stmt = select(CodeSymbol.name, CodeSymbol.file_path, CodeSymbol.symbol_type)\
        .where(CodeSymbol.repository_id == repo.id)\
        .limit(20)
    syms_res = await db.execute(syms_stmt)
    syms = syms_res.all()
    symbols_context = ", ".join([f"{s[0]} ({s[1]})" for s in syms])

    issue_dict = {
        "number": payload.issue_number,
        "title": payload.issue_title,
        "body": payload.issue_body or ""
    }

    roadmap = await llm_service.generate_contribution_roadmap(
        issue=issue_dict,
        relevant_files=relevant_files,
        symbols_context=symbols_context,
        beginner_mode=payload.beginner_mode
    )

    return {
        "issue_number": payload.issue_number,
        "beginner_mode": payload.beginner_mode,
        "roadmap": roadmap,
        "relevant_files": relevant_files[:8]
    }
