import { Document, Schema, Types, model } from 'mongoose';

export interface IAssistantThreadDocument extends Document {
  submissionId: Types.ObjectId;
  userId: Types.ObjectId;
  contextReviewId?: Types.ObjectId | null;
  messages: Array<Record<string, unknown>>;
  suggestedPrompts: string[];
  references: string[];
  createdAt: Date;
  updatedAt: Date;
}

const assistantThreadSchema = new Schema<IAssistantThreadDocument>(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contextReviewId: { type: Schema.Types.ObjectId, ref: 'Review', default: null },
    messages: { type: [Object], default: [] },
    suggestedPrompts: { type: [String], default: [] },
    references: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const AssistantThreadModel = model<IAssistantThreadDocument>(
  'AssistantThread',
  assistantThreadSchema,
);
