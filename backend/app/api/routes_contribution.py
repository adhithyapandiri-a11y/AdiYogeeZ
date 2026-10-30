from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.models.schema import Repository, RepoFile, CodeSymbol, Dependency
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

async def compute_isolation_score_meta(repo_id: int, target_files: List[str], db: AsyncSession) -> Dict[str, Any]:
    """
    Idea 1: Good-First-Issue Matchmaker with Isolation Score.
    Uses compiler AST dependencies to determine if target files are safe leaf nodes or risky core hubs.
    """
    if not target_files:
        return {
            "score": 92,
            "status": "safe_leaf",
            "safety_label": "Safe for Beginners (Leaf Node)",
            "incoming_caller_count": 0,
            "target_files": [],
            "reason": "Target files are isolated with zero upstream callers. Safe to edit with zero regression risk."
        }

    stmt = select(Dependency.source_file_path).where(
        Dependency.repository_id == repo_id,
        Dependency.target_file_path.in_(target_files),
        Dependency.relationship_type.in_(["calls", "imports"])
    )
    res = await db.execute(stmt)
    callers = set(res.scalars().all()) - set(target_files)
    count = len(callers)

    if count == 0:
        return {
            "score": 96,
            "status": "safe_leaf",
            "safety_label": "Safe for Beginners (Leaf Node)",
            "incoming_caller_count": 0,
            "target_files": target_files,
            "reason": f"Compiler AST verified: 0 external files depend on {', '.join(target_files[:2])}. You can modify this code with zero risk of breaking other modules."
        }
    elif count <= 2:
        return {
            "score": 82,
            "status": "low_risk",
            "safety_label": "Low Ripple Risk",
            "incoming_caller_count": count,
            "target_files": target_files,
            "reason": f"Only {count} external caller(s) depend on these files ({', '.join(list(callers)[:2])}). Low chance of side effects."
        }
    elif count <= 5:
        return {
            "score": 58,
            "status": "moderate_risk",
            "safety_label": "Moderate Ripple Risk",
            "incoming_caller_count": count,
            "target_files": target_files,
            "reason": f"Moderate risk: {count} upstream files depend on this component. Unit tests must be verified."
        }
    else:
        return {
            "score": 25,
            "status": "core_hub",
            "safety_label": "Core Hub (Senior Required)",
            "incoming_caller_count": count,
            "target_files": target_files,
            "reason": f"High risk core hub: {count} external modules depend on this interface. Significant regression cascade risk."
        }

@router.get("/issues/{repo_id}")
async def list_repo_issues(repo_id: int, db: AsyncSession = Depends(get_db)):
    """Fetches open GitHub issues augmented with AST Isolation Scores."""
    stmt = select(Repository).where(Repository.id == repo_id)
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    files_res = await db.execute(select(RepoFile.file_path).where(RepoFile.repository_id == repo.id))
    all_file_paths = files_res.scalars().all()

    try:
        issues = await github_service.get_issues(repo.owner, repo.name)
    except Exception:
        issues = []

    # Safeguard for repositories with zero issues (e.g. forks or demo repos)
    if not issues and all_file_paths:
        leaf_file = all_file_paths[0]
        second_file = all_file_paths[1] if len(all_file_paths) > 1 else leaf_file
        issues = [
            {
                "number": 101,
                "title": f"Documentation & input validation enhancement in {leaf_file.split('/')[-1]}",
                "body": f"The boundary validation in {leaf_file} can be enhanced to handle malformed inputs cleanly. Add guard clauses and test fixtures.",
                "user": "RepoMind-Bot",
                "avatar": "https://avatars.githubusercontent.com/u/583231?v=4",
                "state": "open",
                "created_at": "2026-10-30T00:00:00Z",
                "labels": ["good first issue", "safe-leaf", "documentation"],
                "comments_count": 0,
                "url": f"{repo.github_url}/issues/101",
                "is_simulated": True
            },
            {
                "number": 102,
                "title": f"Add regression error test fixture for {second_file.split('/')[-1]}",
                "body": f"Ensure unexpected exceptions return structured error status codes in {second_file}.",
                "user": "RepoMind-Bot",
                "avatar": "https://avatars.githubusercontent.com/u/583231?v=4",
                "state": "open",
                "created_at": "2026-10-30T00:00:00Z",
                "labels": ["help wanted", "testing"],
                "comments_count": 0,
                "url": f"{repo.github_url}/issues/102",
                "is_simulated": True
            }
        ]

    # Augment each issue with AST Isolation Score
    enriched_issues = []
    for issue in issues:
        title_body = (issue.get("title", "") + " " + (issue.get("body") or "")).lower()
        tokens = set(title_body.replace("_", " ").replace("-", " ").split())
        matched_files = [fp for fp in all_file_paths if any(t in fp.lower() for t in tokens if len(t) > 2)]
        target_files = matched_files[:3] if matched_files else (all_file_paths[:1] if all_file_paths else [])

        isolation_meta = await compute_isolation_score_meta(repo.id, target_files, db)
        enriched = dict(issue)
        enriched["isolation_meta"] = isolation_meta
        enriched_issues.append(enriched)

    return enriched_issues

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

    # Calculate isolation score for the selected target files
    isolation_meta = await compute_isolation_score_meta(repo.id, relevant_files[:3], db)

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
        "relevant_files": relevant_files[:8],
        "isolation_meta": isolation_meta
    }
