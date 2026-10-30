import asyncio
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.app.database import get_db, AsyncSessionLocal
from backend.app.models.schema import Repository, RepoFile, CodeSymbol
from backend.app.services.github_service import GitHubService
from backend.app.services.indexer_service import IndexerService

router = APIRouter(prefix="/repos", tags=["Repositories"])

class ConnectRepoRequest(BaseModel):
    url: str

async def run_indexing_task(repo_id: int):
    async with AsyncSessionLocal() as session:
        indexer = IndexerService()
        await indexer.index_repository(session, repo_id)

@router.post("/connect")
async def connect_repository(
    payload: ConnectRepoRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    github = GitHubService()
    try:
        owner, repo_name = github.parse_repo_url(payload.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Check if already indexed
    clean_url = f"https://github.com/{owner}/{repo_name}"
    stmt = select(Repository).where(Repository.github_url == clean_url)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()

    if existing and existing.indexing_status == "completed":
        return {
            "status": "already_indexed",
            "repo_id": existing.id,
            "message": "Repository is already indexed and ready."
        }

    # Fetch initial validation
    try:
        details = await github.get_repo_details(owner, repo_name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to access GitHub repository: {str(e)}")

    if existing:
        repo = existing
        repo.indexing_status = "pending"
        repo.progress_percent = 5
        repo.status_message = "Initiating re-indexing..."
    else:
        repo = Repository(
            owner=details["owner"],
            name=details["name"],
            github_url=details["github_url"],
            default_branch=details["default_branch"],
            primary_language=details["primary_language"],
            description=details["description"],
            stars=details["stars"],
            forks=details["forks"],
            indexing_status="pending",
            progress_percent=5,
            status_message="Initiating indexing pipeline..."
        )
        db.add(repo)

    await db.commit()
    await db.refresh(repo)

    # Launch background indexing
    background_tasks.add_task(run_indexing_task, repo.id)

    return {
        "status": "indexing_started",
        "repo_id": repo.id,
        "repo": {
            "id": repo.id,
            "name": repo.name,
            "owner": repo.owner,
            "github_url": repo.github_url,
            "stars": repo.stars,
            "forks": repo.forks,
            "description": repo.description,
            "primary_language": repo.primary_language
        }
    }

@router.get("")
async def list_repositories(db: AsyncSession = Depends(get_db)):
    """List all connected repositories for switcher and dashboard."""
    stmt = select(Repository).order_by(desc(Repository.indexed_at))
    res = await db.execute(stmt)
    repos = res.scalars().all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "owner": r.owner,
            "github_url": r.github_url,
            "primary_language": r.primary_language,
            "description": r.description,
            "stars": r.stars,
            "forks": r.forks,
            "indexing_status": r.indexing_status,
            "progress_percent": r.progress_percent,
            "file_count": r.file_count,
            "function_count": r.function_count,
            "class_count": r.class_count,
            "dependency_count": r.dependency_count,
            "module_count": r.module_count,
            "languages": r.languages_json or {},
            "indexed_at": r.indexed_at.isoformat() if r.indexed_at else None
        }
        for r in repos
    ]

@router.get("/{repo_id}")
async def get_repository(repo_id: int, db: AsyncSession = Depends(get_db)):
    """Get single repository metadata & live indexing status."""
    stmt = select(Repository).where(Repository.id == repo_id)
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    return {
        "id": repo.id,
        "name": repo.name,
        "owner": repo.owner,
        "github_url": repo.github_url,
        "default_branch": repo.default_branch,
        "primary_language": repo.primary_language,
        "description": repo.description,
        "stars": repo.stars,
        "forks": repo.forks,
        "indexing_status": repo.indexing_status,
        "status_message": repo.status_message,
        "progress_percent": repo.progress_percent,
        "file_count": repo.file_count,
        "function_count": repo.function_count,
        "class_count": repo.class_count,
        "dependency_count": repo.dependency_count,
        "module_count": repo.module_count,
        "languages": repo.languages_json or {},
        "indexed_at": repo.indexed_at.isoformat() if repo.indexed_at else None
    }

@router.get("/{repo_id}/files")
async def list_repo_files(repo_id: int, db: AsyncSession = Depends(get_db)):
    """List indexed files for the file browser and code viewer."""
    stmt = select(RepoFile.id, RepoFile.file_path, RepoFile.language, RepoFile.line_count, RepoFile.file_size)\
        .where(RepoFile.repository_id == repo_id)\
        .order_by(RepoFile.file_path)
    res = await db.execute(stmt)
    rows = res.all()
    return [
        {
            "id": r[0],
            "file_path": r[1],
            "language": r[2],
            "line_count": r[3],
            "file_size": r[4]
        }
        for r in rows
    ]

@router.get("/{repo_id}/file-content")
async def get_file_content(
    repo_id: int, 
    path: str = Query(...), 
    db: AsyncSession = Depends(get_db)
):
    """Retrieve raw source code of a file by path."""
    stmt = select(RepoFile).where(RepoFile.repository_id == repo_id, RepoFile.file_path == path)
    res = await db.execute(stmt)
    rf = res.scalar_one_or_none()
    if not rf:
        raise HTTPException(status_code=404, detail="File not found in indexed repository.")

    # Also fetch symbols in this file
    sym_stmt = select(CodeSymbol).where(CodeSymbol.file_id == rf.id)
    sym_res = await db.execute(sym_stmt)
    syms = sym_res.scalars().all()

    return {
        "file_path": rf.file_path,
        "language": rf.language,
        "content": rf.content,
        "line_count": rf.line_count,
        "symbols": [
            {
                "name": s.name,
                "symbol_type": s.symbol_type,
                "start_line": s.start_line,
                "end_line": s.end_line
            }
            for s in syms
        ]
    }
