import { Document, Schema, Types, model } from 'mongoose';

export interface ISubmissionDocument extends Document {
  userId: Types.ObjectId;
  submissionCode: string;
  type: 'household' | 'business';
  currentStep: number;
  status:
    | 'draft'
    | 'documents_pending'
    | 'processing'
    | 'needs_fix'
    | 'eligible'
    | 'submitted';
  completionPercent: number;
  latestReviewId?: Types.ObjectId | null;
  finalSubmission?: {
    submittedAt: Date;
    confirmationNumber: string;
    channel: 'internal';
    externalTrackingCode?: string | null;
  } | null;
  owner: {
    ownerName: string;
    nationalId: string;
    birthDate: string;
    phone: string;
    email: string;
    address: string;
    submittedByProxy: boolean;
    proxyName: string;
    proxyRelationship: string;
  };
  business: {
    businessName: string;
    businessModel: string;
    businessAddress: string;
    startDate: string;
    businessDescription: string;
    householdMembers: string;
  };
  industry: {
    mainIndustry: string;
    subIndustry: string;
    expectedCapital: string;
    laborScale: string;
    salesChannel: string;
    note: string;
    requiresPracticeLicense: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmissionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submissionCode: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['household', 'business'],
      default: 'household',
    },
    currentStep: { type: Number, default: 1 },
    status: {
      type: String,
      enum: [
        'draft',
        'documents_pending',
        'processing',
        'needs_fix',
        'eligible',
        'submitted',
      ],
      default: 'draft',
    },
    completionPercent: { type: Number, default: 25 },
    latestReviewId: { type: Schema.Types.ObjectId, ref: 'Review', default: null },
    finalSubmission: {
      submittedAt: { type: Date, default: null },
      confirmationNumber: { type: String, default: null },
      channel: {
        type: String,
        enum: ['internal'],
        default: null,
      },
      externalTrackingCode: { type: String, default: null },
    },
    owner: {
      ownerName: { type: String, default: '' },
      nationalId: { type: String, default: '' },
      birthDate: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      address: { type: String, default: '' },
      submittedByProxy: { type: Boolean, default: false },
      proxyName: { type: String, default: '' },
      proxyRelationship: { type: String, default: '' },
    },
    business: {
      businessName: { type: String, default: '' },
      businessModel: { type: String, default: 'Hộ kinh doanh cá thể' },
      businessAddress: { type: String, default: '' },
      startDate: { type: String, default: '' },
      businessDescription: { type: String, default: '' },
      householdMembers: { type: String, default: '' },
    },
    industry: {
      mainIndustry: { type: String, default: '' },
      subIndustry: { type: String, default: '' },
      expectedCapital: { type: String, default: '' },
      laborScale: { type: String, default: '' },
      salesChannel: { type: String, default: '' },
      note: { type: String, default: '' },
      requiresPracticeLicense: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export const SubmissionModel = model<ISubmissionDocument>('Submission', submissionSchema);
