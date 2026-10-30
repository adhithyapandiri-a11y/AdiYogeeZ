from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.models.schema import Repository, Conversation, Message
from backend.app.services.rag_service import RAGService
from backend.app.services.llm_service import LLMService

router = APIRouter(prefix="/chat", tags=["AI Codebase Chat"])

llm_service = LLMService()
rag_service = RAGService(llm_service)

class ChatQueryRequest(BaseModel):
    repository_id: int
    query: str
    conversation_id: Optional[int] = None

@router.post("/query")
async def query_codebase(payload: ChatQueryRequest, db: AsyncSession = Depends(get_db)):
    # 1. Fetch Repository
    stmt = select(Repository).where(Repository.id == payload.repository_id)
    res = await db.execute(stmt)
    repo = res.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    # 2. Get or create conversation
    conv_id = payload.conversation_id
    if not conv_id:
        conv = Conversation(
            repository_id=repo.id,
            title=payload.query[:60]
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        conv_id = conv.id

    # 3. Save User Message
    user_msg = Message(
        conversation_id=conv_id,
        role="user",
        content=payload.query
    )
    db.add(user_msg)
    await db.commit()

    # 4. Fetch Conversation History
    hist_stmt = select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at)
    hist_res = await db.execute(hist_stmt)
    history_messages = [
        {"role": m.role, "content": m.content} 
        for m in hist_res.scalars().all()
    ]

    # 5. Hybrid RAG Search
    retrieved_chunks = await rag_service.search(
        session=db,
        repo_id=repo.id,
        query=payload.query,
        top_k=6
    )

    # 6. Generate Grounded AI Response
    repo_meta = {
        "name": repo.name,
        "owner": repo.owner,
        "primary_language": repo.primary_language,
        "description": repo.description
    }

    ai_result = await llm_service.generate_chat_response(
        query=payload.query,
        repo_metadata=repo_meta,
        retrieved_chunks=retrieved_chunks,
        chat_history=history_messages
    )

    # 7. Save Assistant Message
    assistant_msg = Message(
        conversation_id=conv_id,
        role="assistant",
        content=ai_result["answer"],
        citations_json=ai_result["citations"]
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return {
        "conversation_id": conv_id,
        "message_id": assistant_msg.id,
        "role": "assistant",
        "answer": ai_result["answer"],
        "citations": ai_result["citations"],
        "retrieved_sources": [
            {
                "file_path": c["file_path"],
                "start_line": c["start_line"],
                "end_line": c["end_line"],
                "symbol_name": c["symbol_name"],
                "score": c.get("relevance_score", 0)
            }
            for c in retrieved_chunks
        ]
    }

@router.get("/conversations/{repo_id}")
async def get_conversations(repo_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Conversation).where(Conversation.repository_id == repo_id).order_by(desc(Conversation.created_at))
    res = await db.execute(stmt)
    convs = res.scalars().all()
    return [
        {
            "id": c.id,
            "title": c.title,
            "created_at": c.created_at.isoformat()
        }
        for c in convs
    ]

@router.get("/history/{conversation_id}")
async def get_chat_history(conversation_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)
    res = await db.execute(stmt)
    msgs = res.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "citations": m.citations_json or [],
            "created_at": m.created_at.isoformat()
        }
        for m in msgs
    ]
