import { FilterQuery } from 'mongoose';

import { AssistantThreadModel } from '../models/assistant.model';
import { ReviewModel } from '../models/review.model';
import { ISubmissionDocument, SubmissionModel } from '../models/submission.model';
import { AppError } from '../utils/app-error';
import {
  buildSubmissionCode,
  createEmptySubmissionDraft,
  getNextIncompleteRegistrationStep,
  getSubmissionResumeTarget,
  getSubmissionStepValidity,
  inferSubmissionCompletion,
  mapSubmissionToDraft,
  normalizeSubmissionType,
  SubmissionStatus,
  validateBusinessDraft,
  validateIndustryDraft,
  validateOwnerDraft,
} from '../utils/submission-helpers';
import { userService } from './user.service';

type SubmissionStatusFilter = SubmissionStatus | 'all';

type CurrentUserLike = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
};

const toStepValidationError = (
  message: string,
  details: Record<string, string>,
) => new AppError(message, 422, 'SUBMISSION_VALIDATION_ERROR', details);

const buildConfirmationNumber = (submission: ISubmissionDocument) =>
  `SUB-${submission.submissionCode}-${Date.now().toString().slice(-6)}`;

const buildFinalSubmissionResponse = (submission: ISubmissionDocument) => {
  if (
    !submission.finalSubmission?.submittedAt ||
    !submission.finalSubmission?.confirmationNumber ||
    !submission.finalSubmission?.channel
  ) {
    return null;
  }

  return {
    submittedAt: submission.finalSubmission.submittedAt,
    confirmationNumber: submission.finalSubmission.confirmationNumber,
    channel: submission.finalSubmission.channel,
    externalTrackingCode: submission.finalSubmission.externalTrackingCode ?? null,
  };
};

export const buildSubmissionDetail = (submission: ISubmissionDocument) => {
  const stepValidity = getSubmissionStepValidity(submission);

  return {
    id: submission.id,
    submissionCode: submission.submissionCode,
    type: submission.type,
    currentStep: submission.currentStep,
    status: submission.status,
    completionPercent: submission.completionPercent,
    latestReviewId: submission.latestReviewId ? String(submission.latestReviewId) : null,
    draft: mapSubmissionToDraft(submission),
    stepValidity,
    resumeTarget: getSubmissionResumeTarget(submission),
    isLocked: submission.status === 'processing' || submission.status === 'submitted',
    finalSubmission: buildFinalSubmissionResponse(submission),
    updatedAt: submission.updatedAt,
    createdAt: submission.createdAt,
  };
};

export const assertOwnedSubmission = async (submissionId: string, userId: string) => {
  const submission = await SubmissionModel.findOne({
    _id: submissionId,
    userId,
  });

  if (!submission) {
    throw new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
  }

  return submission;
};

export const ensureSubmissionIsEditable = (submission: ISubmissionDocument) => {
  if (submission.status === 'processing') {
    throw new AppError('Submission is currently being analyzed.', 409, 'SUBMISSION_LOCKED');
  }

  if (submission.status === 'submitted') {
    throw new AppError('Submitted submissions are read only.', 409, 'SUBMISSION_READ_ONLY');
  }
};

export const clearDerivedArtifacts = async (submission: ISubmissionDocument) => {
  submission.latestReviewId = null;
  await AssistantThreadModel.deleteMany({
    submissionId: submission._id,
    userId: submission.userId,
  });
};

const applySubmissionProgress = (
  submission: ISubmissionDocument,
  fallbackStep: 1 | 2 | 3,
) => {
  const stepValidity = getSubmissionStepValidity(submission);

  submission.type = normalizeSubmissionType(submission.business.businessModel);
  submission.completionPercent = inferSubmissionCompletion(stepValidity);

  if (stepValidity.owner && stepValidity.business && stepValidity.industry) {
    submission.currentStep = 4;
    submission.status = 'documents_pending';
    return stepValidity;
  }

  submission.status = 'draft';
  submission.currentStep = Math.max(
    fallbackStep,
    getNextIncompleteRegistrationStep(stepValidity),
  );

  return stepValidity;
};

const shouldInvalidateReview = (submission: ISubmissionDocument) =>
  Boolean(submission.latestReviewId) ||
  submission.status === 'needs_fix' ||
  submission.status === 'eligible';

export const submissionService = {
  async createDraft(currentUser: CurrentUserLike) {
    const count = await SubmissionModel.countDocuments();
    const draft = createEmptySubmissionDraft({
      ownerName: currentUser.fullName,
      email: currentUser.email,
      phone: currentUser.phone ?? '',
    });

    const submission = await SubmissionModel.create({
      userId: currentUser.id,
      submissionCode: buildSubmissionCode(count + 1),
      type: 'household',
      currentStep: 1,
      status: 'draft',
      completionPercent: 25,
      ...draft,
    });

    return buildSubmissionDetail(submission);
  },

  async getById(submissionId: string, userId: string) {
    const submission = await assertOwnedSubmission(submissionId, userId);
    return buildSubmissionDetail(submission);
  },

  async updateOwner(
    submissionId: string,
    userId: string,
    payload: Record<string, string | boolean | undefined>,
  ) {
    const submission = await assertOwnedSubmission(submissionId, userId);
    ensureSubmissionIsEditable(submission);

    submission.owner = {
      ...submission.owner,
      ...payload,
      submittedByProxy:
        typeof payload.submittedByProxy === 'boolean'
          ? payload.submittedByProxy
          : submission.owner.submittedByProxy,
    };

    const errors = validateOwnerDraft(submission.owner);

    if (Object.keys(errors).length > 0) {
      throw toStepValidationError('Owner information is invalid.', errors);
    }

    if (shouldInvalidateReview(submission)) {
      await clearDerivedArtifacts(submission);
    }

    applySubmissionProgress(submission, 2);
    submission.markModified('owner');
    await submission.save();
    return buildSubmissionDetail(submission);
  },

  async updateBusiness(
    submissionId: string,
    userId: string,
    payload: Record<string, string | boolean | undefined>,
  ) {
    const submission = await assertOwnedSubmission(submissionId, userId);
    ensureSubmissionIsEditable(submission);

    submission.business = { ...submission.business, ...payload };

    const errors = validateBusinessDraft(submission.business);

    if (Object.keys(errors).length > 0) {
      throw toStepValidationError('Business information is invalid.', errors);
    }

    if (shouldInvalidateReview(submission)) {
      await clearDerivedArtifacts(submission);
    }

    applySubmissionProgress(submission, 3);
    submission.markModified('business');
    await submission.save();
    return buildSubmissionDetail(submission);
  },

  async updateIndustry(
    submissionId: string,
    userId: string,
    payload: Record<string, string | boolean | undefined>,
  ) {
    const submission = await assertOwnedSubmission(submissionId, userId);
    ensureSubmissionIsEditable(submission);

    submission.industry = {
      ...submission.industry,
      ...payload,
      requiresPracticeLicense:
        typeof payload.requiresPracticeLicense === 'boolean'
          ? payload.requiresPracticeLicense
          : submission.industry.requiresPracticeLicense,
    };

    const errors = validateIndustryDraft(submission.industry);

    if (Object.keys(errors).length > 0) {
      throw toStepValidationError('Industry information is invalid.', errors);
    }

    if (shouldInvalidateReview(submission)) {
      await clearDerivedArtifacts(submission);
    }

    applySubmissionProgress(submission, 3);
    submission.markModified('industry');
    await submission.save();
    return buildSubmissionDetail(submission);
  },

  async list(
    userId: string,
    query: {
      search?: string;
      status?: SubmissionStatusFilter;
      type?: 'household' | 'business' | 'all';
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(20, query.limit ?? 10));
    const filter: FilterQuery<ISubmissionDocument> = { userId };

    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }

    if (query.type && query.type !== 'all') {
      filter.type = query.type;
    }

    if (query.search?.trim()) {
      const normalizedSearch = query.search.trim();
      filter.$or = [
        { submissionCode: { $regex: normalizedSearch, $options: 'i' } },
        { 'business.businessName': { $regex: normalizedSearch, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      SubmissionModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      SubmissionModel.countDocuments(filter),
    ]);

    const reviewIds = items
      .map((item) => (item.latestReviewId ? String(item.latestReviewId) : null))
      .filter(Boolean) as string[];
    const reviews = reviewIds.length
      ? await ReviewModel.find({ _id: { $in: reviewIds } }).lean()
      : [];
    const reviewMap = new Map(reviews.map((review) => [String(review._id), review]));

    return {
      items: items.map((item) => {
        const review = item.latestReviewId
          ? reviewMap.get(String(item.latestReviewId))
          : null;

        return {
          id: item.id,
          submissionCode: item.submissionCode,
          name: item.business.businessName || 'Untitled submission',
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          status: item.status,
          issueCount:
            item.status === 'needs_fix' || item.status === 'eligible'
              ? Array.isArray(review?.result?.findings)
                ? review.result.findings.length
                : 0
              : null,
          type: item.type,
          resumeTarget: getSubmissionResumeTarget(item),
          finalSubmission: buildFinalSubmissionResponse(item),
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  },

  async submit(submissionId: string, userId: string) {
    const submission = await assertOwnedSubmission(submissionId, userId);

    if (submission.status !== 'eligible') {
      throw new AppError(
        'Only eligible submissions can be officially submitted.',
        409,
        'SUBMISSION_NOT_ELIGIBLE',
      );
    }

    if (!submission.latestReviewId) {
      throw new AppError('The review result is no longer valid.', 409, 'REVIEW_STALE');
    }

    const latestReview = await ReviewModel.findOne({
      _id: submission.latestReviewId,
      submissionId,
      userId,
    });

    if (!latestReview || latestReview.status !== 'completed' || !latestReview.result) {
      throw new AppError('The review result is no longer valid.', 409, 'REVIEW_STALE');
    }

    const findings = Array.isArray(latestReview.result.findings)
      ? latestReview.result.findings
      : [];
    const missingDocuments = Array.isArray(latestReview.result.missingDocuments)
      ? latestReview.result.missingDocuments
      : [];

    if (findings.length > 0 || missingDocuments.length > 0) {
      throw new AppError(
        'Resolve all findings before submitting the dossier.',
        422,
        'SUBMISSION_NOT_READY',
      );
    }

    submission.status = 'submitted';
    submission.currentStep = 6;
    submission.finalSubmission = {
      submittedAt: new Date(),
      confirmationNumber: buildConfirmationNumber(submission),
      channel: 'internal',
      externalTrackingCode: null,
    };
    await submission.save();
    await userService.clearDefaultSubmissionIfMatches(userId, submissionId);

    return buildSubmissionDetail(submission);
  },
};
