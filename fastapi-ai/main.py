"""
V-Legal: Agentic GraphRAG API cho Luật Doanh nghiệp 2020.

Endpoints:
- POST /api/v1/ask         → Hỏi đáp pháp lý (Agentic GraphRAG)
- POST /api/v1/verify-registration → Kiểm tra đăng ký doanh nghiệp
- GET  /health             → Health check
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="V-Legal: Agentic GraphRAG",
    description="Hệ thống tư vấn Luật Doanh nghiệp 2020 bằng Multi-Agent GraphRAG",
    version="2.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# MODELS
# ==============================================================================

class QuestionPayload(BaseModel):
    question: str


class RegistrationPayload(BaseModel):
    companyName: str
    businessType: str
    capital: float


# ==============================================================================
# ORCHESTRATOR (lazy init)
# ==============================================================================

_orchestrator = None


def get_orchestrator():
    global _orchestrator
    if _orchestrator is None:
        from src.agents.orchestrator import Orchestrator
        _orchestrator = Orchestrator()
    return _orchestrator


# ==============================================================================
# ENDPOINTS
# ==============================================================================

@app.post("/api/v1/ask")
async def ask_legal_question(payload: QuestionPayload):
    """
    Endpoint chính: Hỏi đáp pháp lý bằng Agentic GraphRAG.

    Flow: Router → (Lookup | Researcher) → Synthesizer → Validator
    """
    try:
        orchestrator = get_orchestrator()
        result = await orchestrator.process(payload.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/verify-registration")
async def verify_registration(payload: RegistrationPayload):
    """Kiểm tra đăng ký doanh nghiệp (placeholder)."""
    from services.rag_agent import verify_registration_data
    try:
        result = await verify_registration_data(payload.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {
        "status": "OK",
        "service": "V-Legal Agentic GraphRAG",
        "version": "2.0.0",
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
