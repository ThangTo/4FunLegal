import { unlinkSync } from 'node:fs';

import {
  ISubmissionFileDocument,
  SubmissionFileModel,
} from '../models/document.model';
import { AppError } from '../utils/app-error';
import {
  getRequiredDocumentChecklist,
  getSubmissionStepValidity,
  normalizeDocumentType,
  SubmissionDocumentType,
} from '../utils/submission-helpers';
import {
  formatBytesToLabel,
  inferDocumentLabel,
  inferDocumentTypeFromName,
  inferFileKind,
} from '../utils/review-helpers';
import {
  assertOwnedSubmission,
  clearDerivedArtifacts,
  ensureSubmissionIsEditable,
} from './submission.service';

const allowedDocumentTypes: SubmissionDocumentType[] = [
  'citizen-id',
  'application',
  'lease-contract',
  'authorization',
  'practice-license',
  'household-member-consent',
  'other',
  'license',
];

const getDocumentIcon = (documentType: SubmissionDocumentType) => {
  if (documentType === 'application') return 'description';
  if (documentType === 'lease-contract') return 'article';
  if (documentType === 'practice-license') return 'verified';
  if (documentType === 'household-member-consent') return 'groups';
  return 'description';
};

const buildStatusLabel = (file: ISubmissionFileDocument) => {
  if (file.ocrError) {
    return 'OCR thất bại';
  }

  if (file.ocrStatus === 'processing') {
    return 'Đang xử lý OCR';
  }

  if (file.ocrStatus === 'pending') {
    return 'Chờ OCR';
  }

  return 'OCR hoàn tất';
};

const buildUploadedFilePayload = (file: ISubmissionFileDocument) => {
  const documentType = normalizeDocumentType(file.documentType);

  return {
    id: file.id,
    label: inferDocumentLabel(documentType),
    name: file.originalName,
    size: file.sizeLabel,
    format: file.format,
    type: file.fileKind,
    documentType,
    preview: file.fileKind === 'image' ? file.publicUrl : undefined,
    icon: file.fileKind === 'doc' ? getDocumentIcon(documentType) : undefined,
    status: file.validationStatus === 'verified' ? 'verified' : 'processing',
    statusLabel: buildStatusLabel(file),
  };
};

const buildAiHint = (
  checklist: ReturnType<typeof getRequiredDocumentChecklist>,
  businessName: string,
) => {
  const missingRequired = checklist.filter((item) => item.status === 'missing_required');

  if (missingRequired.length > 0) {
    return `Hồ sơ "${businessName}" vẫn còn thiếu ${missingRequired[0].label.toLowerCase()}.`;
  }

  const missingOptional = checklist.filter((item) => item.status === 'missing_optional');

  if (missingOptional.length > 0) {
    return `Lưu ý thêm: ${missingOptional[0].label.toLowerCase()} có thể vẫn cần bổ sung.`;
  }

  return 'Tất cả tài liệu bắt buộc đã sẵn sàng cho bước phân tích AI.';
};

const buildDocumentsState = async (submissionId: string, userId: string) => {
  const submission = await assertOwnedSubmission(submissionId, userId);
  const documents = await SubmissionFileModel.find({ submissionId, userId }).sort({
    createdAt: -1,
  });
  const checklist = getRequiredDocumentChecklist(
    submission,
    documents.map((item) => item.documentType),
  );
  const stepValidity = getSubmissionStepValidity(submission);
  const requiredChecklist = checklist.filter((item) => item.required);
  const uploadedRequiredCount = requiredChecklist.filter((item) => item.status === 'uploaded').length;
  const missingRequiredCount = requiredChecklist.filter(
    (item) => item.status === 'missing_required',
  ).length;

  return {
    uploadedFiles: documents.map((item) => buildUploadedFilePayload(item)),
    checklist,
    summary: {
      ownerName: submission.owner.ownerName,
      businessName: submission.business.businessName,
      uploadedCount: documents.length,
      uploadedRequiredCount,
      requiredCount: requiredChecklist.length,
      missingRequiredCount,
      canStartReview:
        missingRequiredCount === 0 &&
        stepValidity.owner &&
        stepValidity.business &&
        stepValidity.industry,
      aiHint: buildAiHint(checklist, submission.business.businessName || 'your submission'),
    },
  };
};

const markSubmissionDocumentsPending = async (
  submission: Awaited<ReturnType<typeof assertOwnedSubmission>>,
) => {
  submission.status = 'documents_pending';
  submission.currentStep = 4;
  submission.completionPercent = 100;
  await submission.save();
};

const shouldInvalidateReview = (
  submission: Awaited<ReturnType<typeof assertOwnedSubmission>>,
) =>
  Boolean(submission.latestReviewId) ||
  submission.status === 'needs_fix' ||
  submission.status === 'eligible';

export const documentService = {
  async list(submissionId: string, userId: string) {
    return buildDocumentsState(submissionId, userId);
  },

  async upload(
    submissionId: string,
    userId: string,
    files: Express.Multer.File[],
  ) {
    const submission = await assertOwnedSubmission(submissionId, userId);
    ensureSubmissionIsEditable(submission);

    if (!files.length) {
      throw new AppError('No files uploaded', 400, 'DOCUMENTS_REQUIRED');
    }

    await Promise.all(
      files.map((file) => {
        const inferredType = inferDocumentTypeFromName(file.originalname);
        const documentType = normalizeDocumentType(inferredType);

        return SubmissionFileModel.create({
          submissionId,
          userId,
          documentType,
          label: inferDocumentLabel(documentType),
          originalName: file.originalname,
          storedName: file.filename,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          sizeLabel: formatBytesToLabel(file.size),
          format: file.originalname.split('.').pop()?.toUpperCase() ?? 'FILE',
          fileKind: inferFileKind(file.mimetype),
          storagePath: file.path,
          publicUrl: `/uploads/submissions/${submissionId}/${file.filename}`,
          ocrStatus: 'pending',
          validationStatus: 'uploaded',
          ocrText: null,
          ocrSummary: null,
          ocrError: null,
          ocrCompletedAt: null,
        });
      }),
    );

    if (shouldInvalidateReview(submission)) {
      await clearDerivedArtifacts(submission);
    }

    await markSubmissionDocumentsPending(submission);

    return buildDocumentsState(submissionId, userId);
  },

  async updateType(
    submissionId: string,
    userId: string,
    documentId: string,
    documentType: SubmissionDocumentType,
  ) {
    const submission = await assertOwnedSubmission(submissionId, userId);
    ensureSubmissionIsEditable(submission);

    const normalizedType = normalizeDocumentType(documentType);

    if (!allowedDocumentTypes.includes(normalizedType)) {
      throw new AppError('Document type is not supported', 422, 'DOCUMENT_TYPE_INVALID');
    }

    const document = await SubmissionFileModel.findOne({
      _id: documentId,
      submissionId,
      userId,
    });

    if (!document) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    document.documentType = normalizedType;
    document.label = inferDocumentLabel(normalizedType);
    await document.save();

    if (shouldInvalidateReview(submission)) {
      await clearDerivedArtifacts(submission);
    }

    await markSubmissionDocumentsPending(submission);

    return buildDocumentsState(submissionId, userId);
  },

  async remove(submissionId: string, userId: string, documentId: string) {
    const submission = await assertOwnedSubmission(submissionId, userId);
    ensureSubmissionIsEditable(submission);

    const document = await SubmissionFileModel.findOne({
      _id: documentId,
      submissionId,
      userId,
    });

    if (!document) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    try {
      unlinkSync(document.storagePath);
    } catch {
      // Ignore missing local files in demo mode or tests.
    }

    await document.deleteOne();

    if (shouldInvalidateReview(submission)) {
      await clearDerivedArtifacts(submission);
    }

    await markSubmissionDocumentsPending(submission);

    const nextState = await buildDocumentsState(submissionId, userId);

    return {
      deleted: true,
      ...nextState,
    };
  },
};
