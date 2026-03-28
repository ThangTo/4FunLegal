import os
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from pydantic import BaseModel, Field

from services.assistant_service import create_assistant_reply
from services.internal_auth import require_internal_api_key
from services.review_service import analyze_submission

load_dotenv()

app = FastAPI(
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
        "service": "fastapi-ai",
        "provider": os.getenv("AI_PROVIDER", "deterministic"),
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
