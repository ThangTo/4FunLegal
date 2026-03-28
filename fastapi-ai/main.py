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
import os
from typing import Any, Literal

from dotenv import load_dotenv
import os
from fastapi import Depends, FastAPI
from pydantic import BaseModel, Field

from services.assistant_service import create_assistant_reply
from services.internal_auth import require_internal_api_key
from services.review_service import analyze_submission

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
    title="Legal Fact-Checking AI Service",
    description="Internal OCR and dossier reasoning service for household-business flows",
    version="2.0.0",
)


class SubmissionOwnerPayload(BaseModel):
    ownerName: str
    nationalId: str
    birthDate: str
    phone: str
    email: str
    address: str
    submittedByProxy: bool
    proxyName: str
    proxyRelationship: str


class SubmissionBusinessPayload(BaseModel):
    businessName: str
    businessModel: str
    businessAddress: str
    startDate: str
    businessDescription: str
    householdMembers: str


class SubmissionIndustryPayload(BaseModel):
    mainIndustry: str
    subIndustry: str
    expectedCapital: str
    laborScale: str
    salesChannel: str
    note: str
    requiresPracticeLicense: bool


class SubmissionDraftPayload(BaseModel):
    owner: SubmissionOwnerPayload
    business: SubmissionBusinessPayload
    industry: SubmissionIndustryPayload


class AnalyzeDocumentPayload(BaseModel):
    id: str
    documentType: str
    label: str
    originalName: str
    mimeType: str
    fileKind: Literal["image", "doc"]
    contentBase64: str = ""
    existingOcrText: str | None = None


class AnalyzeReviewPayload(BaseModel):
    submissionId: str
    submissionCode: str
    type: Literal["household", "business"]
    draft: SubmissionDraftPayload
    documents: list[AnalyzeDocumentPayload]


class AssistantDocumentPayload(BaseModel):
    id: str
    label: str
    documentType: str
    ocrSummary: str | None = None


class AssistantMessagePayload(BaseModel):
    role: str
    paragraphs: list[str]


class AssistantReviewPayload(BaseModel):
    findings: list[dict[str, Any]] = Field(default_factory=list)
    missingDocuments: list[dict[str, Any]] = Field(default_factory=list)
    references: list[str] = Field(default_factory=list)


class AssistantSubmissionPayload(BaseModel):
    owner: SubmissionOwnerPayload
    business: SubmissionBusinessPayload
    industry: SubmissionIndustryPayload
    submissionCode: str
    status: str


class AssistantReplyPayload(BaseModel):
    submission: AssistantSubmissionPayload
    documents: list[AssistantDocumentPayload]
    reviewResult: AssistantReviewPayload
    threadMessages: list[AssistantMessagePayload]
    question: str


@app.post(
    "/internal/v1/reviews/analyze",
    dependencies=[Depends(require_internal_api_key)],
)
async def analyze_review(payload: AnalyzeReviewPayload):
    return analyze_submission(payload.model_dump())


@app.post(
    "/internal/v1/assistant/reply",
    dependencies=[Depends(require_internal_api_key)],
)
async def assistant_reply(payload: AssistantReplyPayload):
    return create_assistant_reply(payload.model_dump())


@app.get("/api/v1/verify-registration")
async def legacy_verify_registration_health():
    return {
        "status": "deprecated",
        "message": "Use /internal/v1/reviews/analyze through the gateway",
    }



@app.get("/health")
async def health_check():
    return {
        "status": "OK",
        "service": "V-Legal Agentic GraphRAG",
        "version": "2.0.0",
    }

    return {
        "status": "OK",
        "service": "fastapi-ai",
        "provider": os.getenv("AI_PROVIDER", "deterministic"),
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
