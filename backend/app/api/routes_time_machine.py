from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.models.schema import Repository, RepoCommit
from backend.app.services.github_service import GitHubService
from backend.app.services.llm_service import LLMService

router = APIRouter(prefix="/time-machine", tags=["Codebase Time Machine"])
github_service = GitHubService()
llm_service = LLMService()

class ExplainCommitRequest(BaseModel):
    repo_id: int
    commit_sha: str
    diff_summary: str
    message: str

@router.get("/commits/{repo_id}")
async def list_commits(repo_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch stored commits for repository."""
    stmt = select(RepoCommit).where(RepoCommit.repository_id == repo_id).order_by(desc(RepoCommit.timestamp))
    res = await db.execute(stmt)
    commits = res.scalars().all()
    return [
        {
            "id": c.id,
            "sha": c.commit_sha,
            "author": c.author,
            "author_avatar": c.author_avatar,
            "message": c.message,
            "timestamp": c.timestamp.isoformat() if c.timestamp else None
        }
        for c in commits
    ]

@router.get("/details/{repo_id}")
async def get_commit_diff(
    repo_id: int, 
    sha: str = Query(...), 
    db: AsyncSession = Depends(get_db)
):
    """Fetches real file changes and diffs for a selected commit from GitHub."""
    stmt = select(Repository).where(Repository.id == repo_id)
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    try:
        details = await github_service.get_commit_details(repo.owner, repo.name, sha)
        return details
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch commit diff: {str(e)}")

@router.post("/explain")
async def explain_commit(payload: ExplainCommitRequest):
    """Uses Gemini to explain the architectural implications of the commit diff."""
    commit_meta = {
        "message": payload.message,
        "author": "Contributor",
        "changed_files_count": len(payload.diff_summary.splitlines())
    }
    explanation = await llm_service.explain_commit(commit_meta, payload.diff_summary)
    return {"explanation": explanation}
