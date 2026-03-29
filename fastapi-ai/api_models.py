from typing import Any, Literal

from pydantic import BaseModel, Field


class LegalQuestionHistoryItem(BaseModel):
    role: Literal["user", "assistant", "system"] = "user"
    content: str


class LegalQuestionContextPayload(BaseModel):
    documentTitle: str | None = None
    documentSummary: str | None = None
    documentSlug: str | None = None
    sourceName: str | None = None
    sourceUrl: str | None = None
    documentNumber: str | None = None
    highlights: list[str] = Field(default_factory=list)
    roadmap: list[dict[str, Any]] = Field(default_factory=list)
    officialLinks: list[dict[str, Any]] = Field(default_factory=list)


class LegalQuestionPayload(BaseModel):
    question: str
    history: list[LegalQuestionHistoryItem] = Field(default_factory=list)
    context: LegalQuestionContextPayload | None = None


class RegistrationPayload(BaseModel):
    companyName: str
    businessType: str
    capital: float


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
    existingExtractedFields: dict[str, Any] | None = None


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
    originalName: str | None = None
    ocrText: str | None = None
    extractedFields: dict[str, Any] = Field(default_factory=dict)
    extractionConfidence: str | None = None
    semanticStatus: str | None = None
    semanticIssues: list[dict[str, Any]] = Field(default_factory=list)


class AssistantMessagePayload(BaseModel):
    role: str
    paragraphs: list[str]


class AssistantReviewPayload(BaseModel):
    findings: list[dict[str, Any]] = Field(default_factory=list)
    missingDocuments: list[dict[str, Any]] = Field(default_factory=list)
    documentChecks: list[dict[str, Any]] = Field(default_factory=list)
    fieldComparisons: list[dict[str, Any]] = Field(default_factory=list)
    references: list[str] = Field(default_factory=list)
    legalBasis: list[str] = Field(default_factory=list)


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
