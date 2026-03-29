import { AssistantThreadModel } from '../models/assistant.model';
import { SubmissionFileModel } from '../models/document.model';
import { ReviewModel } from '../models/review.model';
import { AppError } from '../utils/app-error';
import {
  buildAssistantSessionContext,
  buildAssistantWelcome,
  buildReviewResult,
} from '../utils/review-helpers';
import { aiService } from './ai.service';
import { assertOwnedSubmission } from './submission.service';

const getContextData = async (submissionId: string, userId: string) => {
  const submission = await assertOwnedSubmission(submissionId, userId);
  const [documents, latestReview] = await Promise.all([
    SubmissionFileModel.find({ submissionId, userId }).sort({ createdAt: -1 }),
    submission.latestReviewId
      ? ReviewModel.findOne({ _id: submission.latestReviewId, submissionId, userId })
      : Promise.resolve(null),
  ]);

  const fallbackResult = buildReviewResult(
    submission,
    documents.map((item) => item.documentType),
  );

  return {
    submission,
    documents,
    latestReview,
    result: latestReview?.result ?? fallbackResult,
  };
};

export const assistantService = {
  async getSession(submissionId: string, userId: string) {
    const { submission, documents, latestReview, result } = await getContextData(
      submissionId,
      userId,
    );
    let thread = await AssistantThreadModel.findOne({ submissionId, userId }).sort({
      updatedAt: -1,
    });

    const sessionContext = buildAssistantSessionContext(
      {
        owner: submission.owner,
        business: submission.business,
        industry: submission.industry,
        submissionCode: submission.submissionCode,
      },
      documents.map((document) => ({
        id: document.id,
        label: document.label,
        name: document.originalName,
        size: document.sizeLabel,
        format: document.format,
        type: document.fileKind,
        documentType: document.documentType,
        semanticStatus: document.semanticStatus ?? 'pending',
        semanticStatusLabel:
          document.semanticStatus === 'matched'
            ? 'Khớp với kê khai'
            : document.semanticStatus === 'mismatch'
              ? 'Lệch thông tin'
              : document.semanticStatus === 'insufficient_evidence'
                ? 'Không đủ bằng chứng'
                : document.semanticStatus === 'possible_type_mismatch'
                  ? 'Có thể sai loại tài liệu'
                  : document.semanticStatus === 'checklist_only'
                    ? 'Kiểm tra checklist'
                    : null,
        extractionConfidence: document.extractionConfidence ?? null,
        semanticIssues: document.semanticIssues ?? [],
      })),
      (result.findings as Array<{ id: string; title: string }>) ?? [],
    );

    const currentReviewId = latestReview?._id ?? null;
    const shouldResetThread =
      !thread ||
      String(thread.contextReviewId ?? '') !== String(currentReviewId ?? '');

    if (!thread) {
      thread = await AssistantThreadModel.create({
        submissionId,
        userId,
        contextReviewId: currentReviewId,
        messages: [buildAssistantWelcome(submission.business.businessName)],
        suggestedPrompts: sessionContext.suggestedPrompts,
        references: result.references,
      });
    } else if (shouldResetThread) {
      thread.contextReviewId = currentReviewId;
      thread.messages = [buildAssistantWelcome(submission.business.businessName)];
      thread.suggestedPrompts = sessionContext.suggestedPrompts;
      thread.references = result.references;
      await thread.save();
    }

    return {
      threadId: thread.id,
      messages: thread.messages,
      references: thread.references,
      ...sessionContext,
    };
  },

  async createMessage(submissionId: string, userId: string, message: string) {
    const { submission, documents, latestReview, result } = await getContextData(
      submissionId,
      userId,
    );
    const thread = await AssistantThreadModel.findOne({ submissionId, userId }).sort({
      updatedAt: -1,
    });

    if (!thread) {
      throw new AppError('Assistant session not found', 404, 'ASSISTANT_THREAD_NOT_FOUND');
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      paragraphs: [message],
    };

    const reply = await aiService.createAssistantReply({
      submission: {
        owner: submission.owner,
        business: submission.business,
        industry: submission.industry,
        submissionCode: submission.submissionCode,
        status: submission.status,
      },
      documents: documents.map((document) => ({
        id: document.id,
        label: document.label,
        documentType: document.documentType,
        originalName: document.originalName,
        ocrSummary: document.ocrSummary ?? null,
        ocrText: document.ocrText ?? null,
        extractedFields: (document.extractedFields as Record<string, unknown> | null) ?? null,
        extractionConfidence: document.extractionConfidence ?? null,
        semanticStatus: document.semanticStatus ?? null,
        semanticIssues: (document.semanticIssues as Array<Record<string, unknown>>) ?? [],
      })),
      reviewResult: {
        findings: (result.findings as Array<Record<string, unknown>>) ?? [],
        missingDocuments: (result.missingDocuments as Array<Record<string, unknown>>) ?? [],
        documentChecks: (result.documentChecks as Array<Record<string, unknown>>) ?? [],
        fieldComparisons: (result.fieldComparisons as Array<Record<string, unknown>>) ?? [],
        references: result.references ?? [],
        legalBasis: (result.legalBasis as string[]) ?? [],
      },
      threadMessages: thread.messages
        .slice(-8)
        .map((item) => ({
          role: String(item.role ?? 'assistant'),
          paragraphs: Array.isArray(item.paragraphs)
            ? (item.paragraphs as string[])
            : [],
        })),
      question: message,
    });

    const assistantReply = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      paragraphs: reply.paragraphs,
      references: reply.references,
      actions: reply.actions,
    };

    thread.contextReviewId = latestReview?._id ?? null;
    thread.messages = [...thread.messages, userMessage, assistantReply];
    thread.references = reply.references;
    thread.suggestedPrompts = reply.suggestedPrompts ?? thread.suggestedPrompts;
    await thread.save();

    return {
      threadId: thread.id,
      reply: assistantReply,
      messages: thread.messages,
      suggestedPrompts: thread.suggestedPrompts,
      context: buildAssistantSessionContext(
        {
          owner: submission.owner,
          business: submission.business,
          industry: submission.industry,
          submissionCode: submission.submissionCode,
        },
        documents.map((document) => ({
          id: document.id,
          label: document.label,
          name: document.originalName,
          size: document.sizeLabel,
          format: document.format,
          type: document.fileKind,
          documentType: document.documentType,
          semanticStatus: document.semanticStatus ?? 'pending',
          semanticStatusLabel:
            document.semanticStatus === 'matched'
              ? 'Khớp với kê khai'
              : document.semanticStatus === 'mismatch'
                ? 'Lệch thông tin'
                : document.semanticStatus === 'insufficient_evidence'
                  ? 'Không đủ bằng chứng'
                  : document.semanticStatus === 'possible_type_mismatch'
                    ? 'Có thể sai loại tài liệu'
                    : document.semanticStatus === 'checklist_only'
                      ? 'Kiểm tra checklist'
                      : null,
          extractionConfidence: document.extractionConfidence ?? null,
          semanticIssues: document.semanticIssues ?? [],
        })),
        (result.findings as Array<{ id: string; title: string }>) ?? [],
      ).context,
    };
  },
};
