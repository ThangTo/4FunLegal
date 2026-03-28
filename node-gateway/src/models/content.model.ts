import { Document, Schema, model } from 'mongoose';

export interface IContentPageDocument extends Document {
  slug: 'landing' | 'guide';
  title: string;
  payload: Record<string, unknown>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const contentPageSchema = new Schema<IContentPageDocument>(
  {
    slug: {
      type: String,
      enum: ['landing', 'guide'],
      required: true,
      unique: true,
    },
    title: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export const ContentPageModel = model<IContentPageDocument>(
  'ContentPage',
  contentPageSchema,
);
