import { Document, Schema, Types, model } from 'mongoose';

export interface ISubmissionFileDocument extends Document {
  submissionId: Types.ObjectId;
  userId: Types.ObjectId;
  documentType:
    | 'citizen-id'
    | 'application'
    | 'lease-contract'
    | 'authorization'
    | 'practice-license'
    | 'household-member-consent'
    | 'license'
    | 'other';
  label: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  sizeLabel: string;
  format: string;
  fileKind: 'image' | 'doc';
  storagePath: string;
  publicUrl: string;
  ocrStatus: 'pending' | 'processing' | 'completed';
  validationStatus: 'uploaded' | 'verified';
  ocrText?: string | null;
  ocrSummary?: string | null;
  ocrError?: string | null;
  ocrCompletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const submissionFileSchema = new Schema<ISubmissionFileDocument>(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentType: {
      type: String,
      enum: [
        'citizen-id',
        'application',
        'lease-contract',
        'authorization',
        'practice-license',
        'household-member-consent',
        'license',
        'other',
      ],
      default: 'other',
    },
    label: { type: String, required: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sizeLabel: { type: String, required: true },
    format: { type: String, required: true },
    fileKind: { type: String, enum: ['image', 'doc'], required: true },
    storagePath: { type: String, required: true },
    publicUrl: { type: String, required: true },
    ocrStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed'],
      default: 'processing',
    },
    validationStatus: {
      type: String,
      enum: ['uploaded', 'verified'],
      default: 'uploaded',
    },
    ocrText: { type: String, default: null },
    ocrSummary: { type: String, default: null },
    ocrError: { type: String, default: null },
    ocrCompletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const SubmissionFileModel = model<ISubmissionFileDocument>(
  'SubmissionFile',
  submissionFileSchema,
);
