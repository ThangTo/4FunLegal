import { readFile } from 'node:fs/promises';

import axios, { AxiosError } from 'axios';

import { ISubmissionFileDocument } from '../models/document.model';
import { AppError } from '../utils/app-error';
import { SubmissionDocumentType, SubmissionDraftShape } from '../utils/submission-helpers';

type AnalyzeDocumentPayload = {
  id: string;
  documentType: SubmissionDocumentType;
  label: string;
  originalName: string;
  mimeType: string;
  fileKind: 'image' | 'doc';
  contentBase64: string;
  existingOcrText?: string | null;
  existingExtractedFields?: Record<string, unknown> | null;
};

type AnalyzeSubmissionPayload = {
  submissionId: string;
  submissionCode: string;
  type: 'household' | 'business';
  draft: SubmissionDraftShape;
  documents: AnalyzeDocumentPayload[];
};

type AnalyzeSubmissionResponse = {
  provider: string;
  documents: Array<{
    id: string;
    ocrStatus: 'completed';
    validationStatus: 'uploaded' | 'verified';
    ocrText?: string | null;
    ocrSummary?: string | null;
    extractedFields?: Record<string, unknown>;
    extractionConfidence?: 'low' | 'medium' | 'high' | null;
    semanticStatus?:
      | 'checklist_only'
      | 'matched'
      | 'mismatch'
      | 'insufficient_evidence'
      | 'possible_type_mismatch';
    semanticIssues?: Array<Record<string, unknown>>;
  }>;
  review: {
    statusBanner: Record<string, unknown>;
    summaryItems: Array<Record<string, unknown>>;
    findings: Array<Record<string, unknown>>;
    missingDocuments: Array<Record<string, unknown>>;
    nextActions: Array<Record<string, unknown>>;
    references: string[];
    documentChecks?: Array<Record<string, unknown>>;
    fieldComparisons?: Array<Record<string, unknown>>;
    legalBasis?: string[];
  };
};

type AssistantReplyPayload = {
  submission: SubmissionDraftShape & {
    submissionCode: string;
    status: string;
  };
  documents: Array<{
    id: string;
    label: string;
    documentType: SubmissionDocumentType;
    originalName?: string | null;
    ocrSummary?: string | null;
    ocrText?: string | null;
    extractedFields?: Record<string, unknown> | null;
    extractionConfidence?: string | null;
    semanticStatus?: string | null;
    semanticIssues?: Array<Record<string, unknown>>;
  }>;
  reviewResult: {
    findings: Array<Record<string, unknown>>;
    missingDocuments: Array<Record<string, unknown>>;
    documentChecks: Array<Record<string, unknown>>;
    fieldComparisons: Array<Record<string, unknown>>;
    references: string[];
    legalBasis: string[];
  };
  threadMessages: Array<{
    role: string;
    paragraphs: string[];
  }>;
  question: string;
};

type AssistantReplyResponse = {
  provider: string;
  paragraphs: string[];
  references: string[];
  actions?: Array<Record<string, unknown>>;
  suggestedPrompts?: string[];
};

type FastApiHealthResponse = {
  status: string;
  service: string;
  version: string;
  serviceMode: string;
  neo4jReady: boolean;
  chromaReady: boolean;
  geminiConfigured: boolean;
  legalQaReady: boolean;
};

type LegalQuestionPayload = {
  question: string;
  history?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  context?: {
    documentTitle?: string;
    documentSummary?: string;
    documentSlug?: string;
    sourceName?: string;
    sourceUrl?: string;
    documentNumber?: string;
    highlights?: string[];
    roadmap?: Array<Record<string, unknown>>;
    officialLinks?: Array<Record<string, unknown>>;
  } | null;
};

type LegalQuestionResponse = {
  provider: string;
  routeType: 'LOOKUP' | 'ADVISORY' | 'INVALID';
  answer: string;
  citations: string[];
  confidenceScore: number;
  validationNotes: string;
  suggestedPrompts?: string[];
  stats?: Record<string, unknown>;
};

const DEFAULT_FASTAPI_BASE_URL = 'http://localhost:8000';
const DEFAULT_FASTAPI_TIMEOUT_MS = 60_000;
const DEFAULT_FASTAPI_INTERNAL_KEY = 'dev-fastapi-internal-key';

const getFastApiBaseUrl = () =>
  process.env.FASTAPI_AI_BASE_URL?.trim() || DEFAULT_FASTAPI_BASE_URL;

const getFastApiTimeout = () => {
  const rawValue = Number(process.env.FASTAPI_TIMEOUT_MS ?? DEFAULT_FASTAPI_TIMEOUT_MS);
  return Number.isFinite(rawValue) && rawValue > 0
    ? rawValue
    : DEFAULT_FASTAPI_TIMEOUT_MS;
};

const getInternalApiKey = () =>
  process.env.FASTAPI_INTERNAL_API_KEY?.trim() || DEFAULT_FASTAPI_INTERNAL_KEY;

const toIntegrationError = (error: unknown, fallbackMessage: string): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const typedError = error as AxiosError<{
      detail?: string;
      message?: string;
    }>;
    const detail =
      typedError.response?.data?.detail ||
      typedError.response?.data?.message ||
      typedError.message;

    if (typedError.code === 'ECONNABORTED' || /timeout/i.test(detail || '')) {
      return new AppError(
        'Dịch vụ AI đang xử lý chậm hơn thời gian chờ hiện tại. Vui lòng thử lại sau ít giây.',
        504,
        'FASTAPI_AI_TIMEOUT',
      );
    }

    return new AppError(
      detail || fallbackMessage,
      502,
      'FASTAPI_AI_UNAVAILABLE',
    );
  }

  return new AppError(fallbackMessage, 502, 'FASTAPI_AI_UNAVAILABLE');
};

const toLegalAssistantIntegrationError = (
  error: unknown,
  fallbackMessage: string,
): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const typedError = error as AxiosError<{
      detail?: string;
      message?: string;
    }>;
    const detail =
      typedError.response?.data?.detail ||
      typedError.response?.data?.message ||
      typedError.message;

    if (typedError.response?.status === 503) {
      return new AppError(
        detail || fallbackMessage,
        503,
        'LEGAL_ASSISTANT_UNAVAILABLE',
      );
    }
  }

  return toIntegrationError(error, fallbackMessage);
};

const readDocumentContent = async (document: ISubmissionFileDocument) => {
  try {
    const buffer = await readFile(document.storagePath);
    return buffer.toString('base64');
  } catch {
    return '';
  }
};

const buildDocumentPayload = async (
  document: ISubmissionFileDocument,
): Promise<AnalyzeDocumentPayload> => ({
  id: document.id,
  documentType: document.documentType,
  label: document.label,
  originalName: document.originalName,
  mimeType: document.mimeType,
  fileKind: document.fileKind,
  contentBase64: await readDocumentContent(document),
  existingOcrText: document.ocrText ?? null,
  existingExtractedFields: document.extractedFields ?? null,
});

export const aiService = {
  async analyzeSubmission(
    submission: AnalyzeSubmissionPayload,
  ): Promise<AnalyzeSubmissionResponse> {
    try {
      const response = await axios.post<AnalyzeSubmissionResponse>(
        `${getFastApiBaseUrl()}/internal/v1/reviews/analyze`,
        submission,
        {
          headers: {
            'x-internal-api-key': getInternalApiKey(),
          },
          timeout: getFastApiTimeout(),
        },
      );

      return response.data;
    } catch (error) {
      throw toIntegrationError(error, 'Dịch vụ phân tích FastAPI AI hiện không phản hồi.');
    }
  },

  async createAssistantReply(
    payload: AssistantReplyPayload,
  ): Promise<AssistantReplyResponse> {
    try {
      const response = await axios.post<AssistantReplyResponse>(
        `${getFastApiBaseUrl()}/internal/v1/assistant/reply`,
        payload,
        {
          headers: {
            'x-internal-api-key': getInternalApiKey(),
          },
          timeout: getFastApiTimeout(),
        },
      );

      return response.data;
    } catch (error) {
      throw toIntegrationError(error, 'Dịch vụ trợ lý hồ sơ FastAPI AI hiện không phản hồi.');
    }
  },

  async getHealth() {
    try {
      const response = await axios.get<FastApiHealthResponse>(
        `${getFastApiBaseUrl()}/health`,
        {
          timeout: getFastApiTimeout(),
        },
      );

      return response.data;
    } catch (error) {
      throw toIntegrationError(error, 'Dịch vụ health FastAPI AI hiện không phản hồi.');
    }
  },

  async askLegalQuestion(
    payload: LegalQuestionPayload,
  ): Promise<LegalQuestionResponse> {
    try {
      const response = await axios.post<LegalQuestionResponse>(
        `${getFastApiBaseUrl()}/internal/v1/legal/ask`,
        payload,
        {
          headers: {
            'x-internal-api-key': getInternalApiKey(),
          },
          timeout: getFastApiTimeout(),
        },
      );

      return response.data;
    } catch (error) {
      throw toLegalAssistantIntegrationError(
        error,
        'Dịch vụ trợ lý pháp lý FastAPI hiện không phản hồi.',
      );
    }
  },

  async buildAnalyzeDocumentsPayload(documents: ISubmissionFileDocument[]) {
    return Promise.all(documents.map((document) => buildDocumentPayload(document)));
  },
};
