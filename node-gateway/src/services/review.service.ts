import { SubmissionFileModel } from '../models/document.model';
import { ReviewModel } from '../models/review.model';
import { AppError } from '../utils/app-error';
import { processingTimelineTemplate } from '../utils/constants';
import { buildProcessingSummary, getReviewProgressStage } from '../utils/review-helpers';
import {
  getRequiredDocumentChecklist,
  getSubmissionStepValidity,
} from '../utils/submission-helpers';
import { aiService } from './ai.service';
import { assertOwnedSubmission } from './submission.service';

const DEFAULT_REVIEW_STALE_BUFFER_MS = 15_000;

const getReviewStaleAfterMs = () => {
  const fastApiTimeoutMs = Number(process.env.FASTAPI_TIMEOUT_MS ?? 60_000);
  const safeTimeout =
    Number.isFinite(fastApiTimeoutMs) && fastApiTimeoutMs > 0 ? fastApiTimeoutMs : 60_000;

  return safeTimeout + DEFAULT_REVIEW_STALE_BUFFER_MS;
};

const buildTimelineWithState = (
  startedAt: Date,
  status: 'queued' | 'processing' | 'completed' | 'failed',
) => {
  if (status === 'completed') {
    return processingTimelineTemplate.map((item) => ({
      ...item,
      state: 'completed',
    }));
  }

  const currentStage = status === 'queued' ? 1 : getReviewProgressStage(startedAt);

  return processingTimelineTemplate.map((item, index) => {
    const stepNumber = index + 1;

    return {
      ...item,
      state:
        stepNumber < currentStage
          ? 'completed'
          : stepNumber === currentStage
            ? 'current'
            : 'pending',
    };
  });
};

const buildUploadedFilesSummary = async (submissionId: string, userId: string) => {
  const documents = await SubmissionFileModel.find({ submissionId, userId }).sort({
    createdAt: -1,
  });

  return {
    documents,
    uploadedFiles: documents.map((document) => ({
      id: document.id,
      label: document.label,
      name: document.originalName,
      size: document.sizeLabel,
      format: document.format,
      type: document.fileKind,
      preview: document.fileKind === 'image' ? document.publicUrl : undefined,
      icon: document.fileKind === 'doc' ? 'description' : undefined,
      status: document.validationStatus === 'verified' ? 'verified' : 'processing',
    })),
  };
};

const processReviewInBackground = async (
  reviewId: string,
  submissionId: string,
  userId: string,
) => {
  const review = await ReviewModel.findOne({ _id: reviewId, submissionId, userId });

  if (!review) {
    return;
  }

  const reviewStartedAt = review.startedAt;

  await ReviewModel.updateOne(
    {
      _id: reviewId,
      submissionId,
      userId,
      status: { $in: ['queued', 'processing'] },
    },
    {
      $set: {
        status: 'processing',
        timeline: buildTimelineWithState(reviewStartedAt, 'processing'),
        etaSeconds: 60,
        errorMessage: null,
      },
    },
  );

  try {
    const submission = await assertOwnedSubmission(submissionId, userId);
    const documents = await SubmissionFileModel.find({ submissionId, userId }).sort({
      createdAt: -1,
    });

    const analysis = await aiService.analyzeSubmission({
      submissionId,
      submissionCode: submission.submissionCode,
      type: submission.type,
      draft: {
        owner: submission.owner,
        business: submission.business,
        industry: submission.industry,
      },
      documents: await aiService.buildAnalyzeDocumentsPayload(documents),
    });

    await Promise.all(
      analysis.documents.map(async (documentResult) => {
        const document = documents.find((item) => item.id === documentResult.id);

        if (!document) {
          return;
        }

        document.ocrStatus = documentResult.ocrStatus;
        document.validationStatus = documentResult.validationStatus;
        document.ocrText = documentResult.ocrText ?? null;
        document.ocrSummary = documentResult.ocrSummary ?? null;
        document.ocrError = null;
        document.ocrCompletedAt = new Date();
        document.extractedFields = documentResult.extractedFields ?? null;
        document.extractionConfidence = documentResult.extractionConfidence ?? null;
        document.semanticStatus = documentResult.semanticStatus ?? 'checklist_only';
        document.semanticIssues = documentResult.semanticIssues ?? [];
        await document.save();
      }),
    );

    const completedAt = new Date();

    const updateResult = await ReviewModel.updateOne(
      {
        _id: reviewId,
        submissionId,
        userId,
        status: { $in: ['queued', 'processing'] },
      },
      {
        $set: {
          status: 'completed',
          provider: analysis.provider,
          errorMessage: null,
          providerMetadata: {
            completedAt: completedAt.toISOString(),
            analyzedDocumentCount: analysis.documents.length,
          },
          etaSeconds: 0,
          completedAt,
          result: analysis.review,
          timeline: buildTimelineWithState(reviewStartedAt, 'completed'),
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      return;
    }

    submission.status =
      analysis.review.missingDocuments.length > 0 || analysis.review.findings.length > 0
        ? 'needs_fix'
        : 'eligible';
    submission.currentStep = 6;
    submission.completionPercent = 100;
    submission.latestReviewId = review._id;
    await submission.save();
  } catch (error) {
    const reviewError = error instanceof Error ? error.message : 'AI review failed';
    const submission = await assertOwnedSubmission(submissionId, userId).catch(() => null);
    const documents = await SubmissionFileModel.find({ submissionId, userId }).sort({
      createdAt: -1,
    });

    await Promise.all(
      documents.map(async (document) => {
        if (document.ocrStatus !== 'completed') {
          document.ocrStatus = 'completed';
          document.validationStatus = document.validationStatus === 'verified' ? 'verified' : 'uploaded';
          document.ocrError = reviewError;
          document.ocrCompletedAt = new Date();
          document.semanticStatus = document.semanticStatus ?? 'pending';
          await document.save();
        }
      }),
    );

    const completedAt = new Date();

    const updateResult = await ReviewModel.updateOne(
      {
        _id: reviewId,
        submissionId,
        userId,
        status: { $in: ['queued', 'processing'] },
      },
      {
        $set: {
          status: 'failed',
          errorMessage: reviewError,
          providerMetadata: {
            failedAt: completedAt.toISOString(),
          },
          etaSeconds: 0,
          completedAt,
          timeline: buildTimelineWithState(reviewStartedAt, 'failed'),
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      return;
    }

    if (submission) {
      submission.status = 'documents_pending';
      submission.currentStep = 4;
      submission.completionPercent = 100;
      submission.latestReviewId = review._id;
      await submission.save();
    }
  }
};

export const reviewService = {
  async create(submissionId: string, userId: string) {
    const submission = await assertOwnedSubmission(submissionId, userId);

    if (submission.status === 'processing') {
      throw new AppError('A review is already in progress.', 409, 'REVIEW_ALREADY_PROCESSING');
    }

    if (submission.status === 'submitted') {
      throw new AppError('Submitted dossiers cannot be reviewed again.', 409, 'SUBMISSION_READ_ONLY');
    }

    const stepValidity = getSubmissionStepValidity(submission);

    if (!stepValidity.owner || !stepValidity.business || !stepValidity.industry) {
      throw new AppError(
        'Complete all registration steps before starting the AI review.',
        422,
        'SUBMISSION_INCOMPLETE',
        {
          owner: stepValidity.owner,
          business: stepValidity.business,
          industry: stepValidity.industry,
        },
      );
    }

    const documents = await SubmissionFileModel.find({ submissionId, userId }).sort({
      createdAt: -1,
    });
    const checklist = getRequiredDocumentChecklist(
      submission,
      documents.map((item) => item.documentType),
    );
    const missingRequiredDocuments = checklist.filter(
      (item) => item.status === 'missing_required',
    );

    if (missingRequiredDocuments.length > 0) {
      throw new AppError(
        'Upload all required documents before starting the review.',
        422,
        'DOCUMENTS_REQUIRED',
        {
          missingDocuments: missingRequiredDocuments.map((item) => item.id),
        },
      );
    }

    const startedAt = new Date();
    const review = await ReviewModel.create({
      submissionId,
      userId,
      status: 'queued',
      provider: 'fastapi-ai',
      timeline: buildTimelineWithState(startedAt, 'queued'),
      etaSeconds: 120,
      result: null,
      startedAt,
      errorMessage: null,
      providerMetadata: null,
    });

    submission.status = 'processing';
    submission.currentStep = 5;
    submission.latestReviewId = review._id;
    await submission.save();

    void processReviewInBackground(review.id, submissionId, userId);

    return {
      id: review.id,
      submissionId,
      status: review.status,
      startedAt: review.startedAt,
    };
  },

  async getLatest(submissionId: string, userId: string) {
    const submission = await assertOwnedSubmission(submissionId, userId);

    if (!submission.latestReviewId) {
      throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    }

    const review = await ReviewModel.findOne({
      _id: submission.latestReviewId,
      submissionId,
      userId,
    });

    if (!review) {
      throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    }

    let currentStatus = review.status;
    let currentErrorMessage = review.errorMessage ?? null;
    let currentTimeline = review.timeline;
    let currentEtaSeconds = review.etaSeconds;

    const isInFlight = currentStatus === 'queued' || currentStatus === 'processing';
    const elapsedMs = Date.now() - review.startedAt.getTime();

    if (isInFlight && elapsedMs > getReviewStaleAfterMs()) {
      const completedAt = new Date();
      const staleErrorMessage =
        'Phiên phân tích đang mất lâu hơn dự kiến và đã được dừng để bạn có thể thử lại.';
      const staleTimeline = buildTimelineWithState(review.startedAt, 'failed');

      const staleUpdate = await ReviewModel.updateOne(
        {
          _id: review._id,
          submissionId,
          userId,
          status: { $in: ['queued', 'processing'] },
        },
        {
          $set: {
            status: 'failed',
            errorMessage: staleErrorMessage,
            providerMetadata: {
              failedAt: completedAt.toISOString(),
              failureReason: 'processing_timeout',
            },
            etaSeconds: 0,
            completedAt,
            timeline: staleTimeline,
          },
        },
      );

      if (staleUpdate.matchedCount > 0) {
        submission.status = 'documents_pending';
        submission.currentStep = 4;
        submission.completionPercent = 100;
        submission.latestReviewId = review._id;
        await submission.save();

        currentStatus = 'failed';
        currentErrorMessage = staleErrorMessage;
        currentTimeline = staleTimeline;
        currentEtaSeconds = 0;
      }
    }

    const stillInFlight = currentStatus === 'queued' || currentStatus === 'processing';
    const timeline = stillInFlight
      ? buildTimelineWithState(review.startedAt, currentStatus)
      : currentTimeline;
    const etaSeconds = stillInFlight
      ? Math.max(
          5,
          60 - Math.min(55, Math.floor((Date.now() - review.startedAt.getTime()) / 1000)),
        )
      : currentEtaSeconds;

    const { uploadedFiles } = await buildUploadedFilesSummary(submissionId, userId);

    return {
      id: review.id,
      status: currentStatus,
      startedAt: review.startedAt.toISOString(),
      etaSeconds,
      isComplete: currentStatus === 'completed',
      timeline,
      errorMessage: currentErrorMessage,
      canRetry: currentStatus === 'failed',
      summary: {
        ownerName: submission.owner.ownerName,
        businessName: submission.business.businessName,
        contact: submission.owner.phone,
        uploadedCount: uploadedFiles.length,
        uploadedFiles,
        processing: buildProcessingSummary(uploadedFiles, submission.owner.ownerName),
      },
    };
  },

  async getLatestResult(submissionId: string, userId: string) {
    const submission = await assertOwnedSubmission(submissionId, userId);

    if (!submission.latestReviewId) {
      throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    }

    const review = await ReviewModel.findOne({
      _id: submission.latestReviewId,
      submissionId,
      userId,
    });

    if (!review) {
      throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    }

    if (review.status === 'failed') {
      throw new AppError(
        review.errorMessage || 'Review failed',
        409,
        'REVIEW_FAILED',
      );
    }

    if (review.status !== 'completed' || !review.result) {
      throw new AppError('Review is still processing', 409, 'REVIEW_IN_PROGRESS');
    }

    const { documents } = await buildUploadedFilesSummary(submissionId, userId);

    return {
      id: review.id,
      submissionId,
      status: review.status,
      submissionStatus: submission.status,
      ownerName: submission.owner.ownerName,
      submissionCode: submission.submissionCode,
      businessName: submission.business.businessName,
      uploadedFiles: documents.map((document) => ({
        id: document.id,
        label: document.label,
        name: document.originalName,
        type: document.fileKind,
        semanticStatus: document.semanticStatus ?? 'pending',
        extractionConfidence: document.extractionConfidence ?? null,
      })),
      finalSubmission:
        submission.finalSubmission?.submittedAt && submission.finalSubmission.confirmationNumber
          ? {
              submittedAt: submission.finalSubmission.submittedAt,
              confirmationNumber: submission.finalSubmission.confirmationNumber,
            channel: submission.finalSubmission.channel,
            externalTrackingCode: submission.finalSubmission.externalTrackingCode ?? null,
          }
          : null,
      ...review.result,
      documentChecks: Array.isArray(review.result.documentChecks)
        ? review.result.documentChecks
        : [],
      fieldComparisons: Array.isArray(review.result.fieldComparisons)
        ? review.result.fieldComparisons
        : [],
      legalBasis: Array.isArray(review.result.legalBasis) ? review.result.legalBasis : [],
    };
  },
};
