import { Document, Schema, model } from 'mongoose';

export interface IUserDocument extends Document {
  fullName: string;
  email: string;
  phone?: string | null;
  status: 'active' | 'inactive';
  role: 'user' | 'admin';
  passwordHash?: string | null;
  googleSub?: string | null;
  avatarUrl?: string | null;
  defaultSubmissionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, trim: true, default: null },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    passwordHash: { type: String, default: null },
    googleSub: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    avatarUrl: { type: String, default: null },
    defaultSubmissionId: { type: String, default: null },
  },
  { timestamps: true },
);

export const UserModel = model<IUserDocument>('User', userSchema);
