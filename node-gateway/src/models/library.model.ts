import { Document, Schema, model } from 'mongoose';

export type LibraryCategory = 'procedure' | 'forms' | 'terms' | 'faq' | 'industry';
export type LibraryAccent = 'primary' | 'secondary' | 'warning';
export type LibraryFeatured = 'hero' | 'side' | 'none';
export type LibraryActionKind = 'learn' | 'download';
export type LibraryOfficialLinkKind = 'source' | 'download' | 'reference';

export interface ILibraryRoadmapStep {
  step: number;
  title: string;
  description: string;
}

export interface ILibraryOfficialLink {
  label: string;
  url: string;
  kind: LibraryOfficialLinkKind;
}

export interface ILibraryDocument extends Document {
  slug: string;
  title: string;
  summary: string;
  category: LibraryCategory;
  updatedAtLabel: string;
  tag: string;
  accent: LibraryAccent;
  featured: LibraryFeatured;
  eyebrow?: string;
  image?: string;
  actionKind: LibraryActionKind;
  keywords: string[];
  relatedConditions: string[];
  sourceName: string;
  sourceUrl: string;
  downloadUrl?: string;
  downloadLabel?: string;
  documentNumber?: string;
  issuedBy?: string;
  issuedDateLabel?: string;
  effectiveDateLabel?: string;
  highlights: string[];
  roadmap: ILibraryRoadmapStep[];
  officialLinks: ILibraryOfficialLink[];
  createdAt: Date;
  updatedAt: Date;
}

const libraryRoadmapStepSchema = new Schema<ILibraryRoadmapStep>(
  {
    step: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false },
);

const libraryOfficialLinkSchema = new Schema<ILibraryOfficialLink>(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
    kind: {
      type: String,
      enum: ['source', 'download', 'reference'],
      required: true,
    },
  },
  { _id: false },
);

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
    sourceName: { type: String, required: true },
    sourceUrl: { type: String, required: true },
    downloadUrl: { type: String, default: '' },
    downloadLabel: { type: String, default: '' },
    documentNumber: { type: String, default: '' },
    issuedBy: { type: String, default: '' },
    issuedDateLabel: { type: String, default: '' },
    effectiveDateLabel: { type: String, default: '' },
    highlights: { type: [String], default: [] },
    roadmap: { type: [libraryRoadmapStepSchema], default: [] },
    officialLinks: { type: [libraryOfficialLinkSchema], default: [] },
  },
  { timestamps: true },
);

export const LibraryDocumentModel = model<ILibraryDocument>(
  'LibraryDocument',
  libraryDocumentSchema,
);
