import os

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api_models import (
    AnalyzeReviewPayload,
    AssistantReplyPayload,
    LegalQuestionPayload,
    RegistrationPayload,
)
from services.assistant_service import create_assistant_reply
from services.internal_auth import require_internal_api_key
from services.legal_qa_service import ask_legal_question, get_legal_qa_readiness
from services.rag_agent import verify_registration_data
from services.review_service import analyze_submission

load_dotenv()


def _get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
    if not raw_origins:
        return ["*"]

    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["*"]


def create_app() -> FastAPI:
    app = FastAPI(
        title="V-Legal: Agentic GraphRAG",
        description="Hệ thống AI pháp lý cho hỏi đáp pháp lý và phân tích hồ sơ thủ tục",
        version="2.0.0",
    )

    allowed_origins = _get_allowed_origins()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=allowed_origins != ["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    public_router = APIRouter(prefix="/api/v1")
    internal_router = APIRouter(
        prefix="/internal/v1",
        dependencies=[Depends(require_internal_api_key)],
    )

    @public_router.post("/ask")
    async def ask_legal_question_public(payload: LegalQuestionPayload):
        return await ask_legal_question(payload.model_dump())

    @public_router.post("/verify-registration")
    async def verify_registration(payload: RegistrationPayload):
        try:
            return await verify_registration_data(payload.model_dump())
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    @public_router.get("/verify-registration")
    async def legacy_verify_registration_health():
        return {
            "status": "deprecated",
            "message": "Use /internal/v1/reviews/analyze through the gateway",
        }

    @internal_router.post("/reviews/analyze")
    async def analyze_review(payload: AnalyzeReviewPayload):
        return analyze_submission(payload.model_dump())

    @internal_router.post("/assistant/reply")
    async def assistant_reply(payload: AssistantReplyPayload):
        return await create_assistant_reply(payload.model_dump())

    @internal_router.post("/legal/ask")
    async def ask_legal_question_internal(payload: LegalQuestionPayload):
        return await ask_legal_question(payload.model_dump())

    @app.get("/health")
    async def health_check():
        readiness = get_legal_qa_readiness()
        return {
            "status": "OK",
            "service": "fastapi-ai",
            "version": "2.0.0",
            **readiness,
        }

    app.include_router(public_router)
    app.include_router(internal_router)

    return app
