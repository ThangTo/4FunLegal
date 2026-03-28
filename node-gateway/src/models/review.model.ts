import { Document, Schema, Types, model } from 'mongoose';

export interface IReviewDocument extends Document {
  submissionId: Types.ObjectId;
  userId: Types.ObjectId;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  timeline: Array<Record<string, unknown>>;
  etaSeconds: number;
  provider?: string | null;
  errorMessage?: string | null;
  providerMetadata?: Record<string, unknown> | null;
  result: {
    statusBanner: Record<string, unknown>;
    summaryItems: Array<Record<string, unknown>>;
    findings: Array<Record<string, unknown>>;
    missingDocuments: Array<Record<string, unknown>>;
    nextActions: Array<Record<string, unknown>>;
    references: string[];
  } | null;
  startedAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReviewDocument>(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'processing',
    },
    timeline: { type: [Object], default: [] },
    etaSeconds: { type: Number, default: 120 },
    provider: { type: String, default: null },
    errorMessage: { type: String, default: null },
    providerMetadata: { type: Schema.Types.Mixed, default: null },
    result: { type: Schema.Types.Mixed, default: null },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const ReviewModel = model<IReviewDocument>('Review', reviewSchema);
