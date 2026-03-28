import { Document, Schema, model } from 'mongoose';

export interface INewsletterSubscriptionDocument extends Document {
  email: string;
  source: string;
  status: 'active' | 'unsubscribed';
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSubscriptionSchema = new Schema<INewsletterSubscriptionDocument>(
  {
    email: { type: String, required: true, trim: true, unique: true },
    source: { type: String, default: 'library' },
    status: {
      type: String,
      enum: ['active', 'unsubscribed'],
      default: 'active',
    },
  },
  { timestamps: true },
);

export const NewsletterSubscriptionModel = model<INewsletterSubscriptionDocument>(
  'NewsletterSubscription',
  newsletterSubscriptionSchema,
);
