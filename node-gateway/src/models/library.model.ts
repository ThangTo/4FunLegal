import { Document, Schema, model } from 'mongoose';

export interface ILibraryDocument extends Document {
  slug: string;
  title: string;
  summary: string;
  category: 'procedure' | 'forms' | 'terms' | 'faq' | 'industry';
  updatedAtLabel: string;
  tag: string;
  accent: 'primary' | 'secondary' | 'warning';
  featured: 'hero' | 'side' | 'none';
  eyebrow?: string;
  image?: string;
  actionKind: 'learn' | 'download';
  keywords: string[];
  relatedConditions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const libraryDocumentSchema = new Schema<ILibraryDocument>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    category: {
      type: String,
      enum: ['procedure', 'forms', 'terms', 'faq', 'industry'],
      required: true,
    },
    updatedAtLabel: { type: String, required: true },
    tag: { type: String, default: '' },
    accent: { type: String, enum: ['primary', 'secondary', 'warning'], default: 'primary' },
    featured: { type: String, enum: ['hero', 'side', 'none'], default: 'none' },
    eyebrow: { type: String, default: '' },
    image: { type: String, default: '' },
    actionKind: { type: String, enum: ['learn', 'download'], default: 'learn' },
    keywords: { type: [String], default: [] },
    relatedConditions: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const LibraryDocumentModel = model<ILibraryDocument>(
  'LibraryDocument',
  libraryDocumentSchema,
);
