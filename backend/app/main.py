from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import init_db
from backend.app.api.routes_repo import router as repo_router
from backend.app.api.routes_chat import router as chat_router
from backend.app.api.routes_architecture import router as arch_router
from backend.app.api.routes_execution_path import router as exec_router
from backend.app.api.routes_time_machine import router as time_router
from backend.app.api.routes_contribution import router as contrib_router
from backend.app.api.routes_impact import router as impact_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup
    await init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="RepoMind — AI-powered developer platform for intelligent codebase exploration and architecture understanding.",
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all modules under /api
app.include_router(repo_router, prefix=settings.API_V1_PREFIX)
app.include_router(chat_router, prefix=settings.API_V1_PREFIX)
app.include_router(arch_router, prefix=settings.API_V1_PREFIX)
app.include_router(exec_router, prefix=settings.API_V1_PREFIX)
app.include_router(time_router, prefix=settings.API_V1_PREFIX)
app.include_router(contrib_router, prefix=settings.API_V1_PREFIX)
app.include_router(impact_router, prefix=settings.API_V1_PREFIX)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "github_configured": bool(settings.GITHUB_TOKEN)
    }
