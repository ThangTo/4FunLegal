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
  }>;
  review: {
    statusBanner: Record<string, unknown>;
    summaryItems: Array<Record<string, unknown>>;
    findings: Array<Record<string, unknown>>;
    missingDocuments: Array<Record<string, unknown>>;
    nextActions: Array<Record<string, unknown>>;
    references: string[];
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
    ocrSummary?: string | null;
  }>;
  reviewResult: {
    findings: Array<Record<string, unknown>>;
    missingDocuments: Array<Record<string, unknown>>;
    references: string[];
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

const DEFAULT_FASTAPI_BASE_URL = 'http://localhost:8000';
const DEFAULT_FASTAPI_TIMEOUT_MS = 20_000;
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

    return new AppError(
      detail || fallbackMessage,
      502,
      'FASTAPI_AI_UNAVAILABLE',
    );
  }

  return new AppError(fallbackMessage, 502, 'FASTAPI_AI_UNAVAILABLE');
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
      throw toIntegrationError(error, 'FastAPI AI review service is unavailable.');
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
      throw toIntegrationError(error, 'FastAPI AI assistant service is unavailable.');
    }
  },

  async buildAnalyzeDocumentsPayload(documents: ISubmissionFileDocument[]) {
    return Promise.all(documents.map((document) => buildDocumentPayload(document)));
  },
};
