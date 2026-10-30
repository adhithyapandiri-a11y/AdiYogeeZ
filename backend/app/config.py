import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend/.env or root .env
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

class Settings:
    PROJECT_NAME: str = "RepoMind"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./repomind.db")
    
    # LLM & Embedding models
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    
    # Guardrails
    MAX_FILE_SIZE_BYTES: int = 500 * 1024  # 500 KB limit per file to index
    MAX_FILES_PER_REPO: int = 1500         # guardrail for large repos
    
    # Storage dir for cloned repos
    REPOS_DIR: Path = Path(__file__).resolve().parent.parent / "storage" / "repos"

settings = Settings()
settings.REPOS_DIR.mkdir(parents=True, exist_ok=True)
