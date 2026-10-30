import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Repository(Base):
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    owner = Column(String(100), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    github_url = Column(String(255), unique=True, nullable=False, index=True)
    default_branch = Column(String(50), default="main")
    primary_language = Column(String(50), default="Unknown")
    description = Column(Text, default="")
    stars = Column(Integer, default=0)
    forks = Column(Integer, default=0)
    indexed_at = Column(DateTime, default=datetime.datetime.utcnow)
    indexing_status = Column(String(50), default="pending") # pending, indexing, completed, failed
    status_message = Column(String(255), default="")
    progress_percent = Column(Integer, default=0)
    
    # Aggregated Stats
    file_count = Column(Integer, default=0)
    function_count = Column(Integer, default=0)
    class_count = Column(Integer, default=0)
    languages_json = Column(JSON, default=dict)
    dependency_count = Column(Integer, default=0)
    module_count = Column(Integer, default=0)

    # Relationships
    files = relationship("RepoFile", back_populates="repository", cascade="all, delete-orphan")
    symbols = relationship("CodeSymbol", back_populates="repository", cascade="all, delete-orphan")
    dependencies = relationship("Dependency", back_populates="repository", cascade="all, delete-orphan")
    chunks = relationship("CodeChunk", back_populates="repository", cascade="all, delete-orphan")
    commits = relationship("RepoCommit", back_populates="repository", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="repository", cascade="all, delete-orphan")

class RepoFile(Base):
    __tablename__ = "repo_files"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False, index=True)
    language = Column(String(50), default="Text")
    content = Column(Text, nullable=False)
    file_size = Column(Integer, default=0)
    line_count = Column(Integer, default=0)
    module_name = Column(String(100), default="root")
    architectural_role = Column(String(50), default="Unknown")

    repository = relationship("Repository", back_populates="files")
    symbols = relationship("CodeSymbol", back_populates="file", cascade="all, delete-orphan")
    chunks = relationship("CodeChunk", back_populates="file", cascade="all, delete-orphan")

class CodeSymbol(Base):
    __tablename__ = "code_symbols"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    file_id = Column(Integer, ForeignKey("repo_files.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    symbol_type = Column(String(50), nullable=False, index=True) # function, method, class, interface
    start_line = Column(Integer, nullable=False)
    end_line = Column(Integer, nullable=False)
    source_code = Column(Text, default="")
    parent_symbol = Column(String(255), default="")
    file_path = Column(String(500), nullable=False)

    repository = relationship("Repository", back_populates="symbols")
    file = relationship("RepoFile", back_populates="symbols")

class Dependency(Base):
    __tablename__ = "dependencies"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    source_file_path = Column(String(500), nullable=False, index=True)
    target_file_path = Column(String(500), nullable=False, index=True)
    source_symbol = Column(String(255), default="")
    target_symbol = Column(String(255), default="")
    relationship_type = Column(String(50), default="imports") # imports, calls, inherits, api, data_access
    evidence_line = Column(Integer, default=1)
    evidence_snippet = Column(String(500), default="")

    repository = relationship("Repository", back_populates="dependencies")

class CodeChunk(Base):
    __tablename__ = "code_chunks"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    file_id = Column(Integer, ForeignKey("repo_files.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False, index=True)
    start_line = Column(Integer, nullable=False)
    end_line = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    symbol_name = Column(String(255), default="")
    embedding_json = Column(JSON, default=list) # List of floats

    repository = relationship("Repository", back_populates="chunks")
    file = relationship("RepoFile", back_populates="chunks")

class RepoCommit(Base):
    __tablename__ = "repo_commits"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    commit_sha = Column(String(64), nullable=False, index=True)
    author = Column(String(100), default="Unknown")
    author_avatar = Column(String(255), default="")
    message = Column(Text, default="")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    changed_files_count = Column(Integer, default=0)
    files_changed_json = Column(JSON, default=list)

    repository = relationship("Repository", back_populates="commits")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="New Exploration")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    repository = relationship("Repository", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False) # user, assistant
    content = Column(Text, nullable=False)
    citations_json = Column(JSON, default=list) # [{file_path, start_line, end_line, snippet}]
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
