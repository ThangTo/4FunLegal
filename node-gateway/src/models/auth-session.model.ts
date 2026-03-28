import { Document, Schema, Types, model } from 'mongoose';

export interface IAuthSessionDocument extends Document {
  userId: Types.ObjectId;
  sessionId: string;
  refreshTokenHash: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedBySessionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const authSessionSchema = new Schema<IAuthSessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    refreshTokenHash: { type: String, required: true },
    userAgent: { type: String, default: null },
    ipAddress: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBySessionId: { type: String, default: null, index: true },
  },
  { timestamps: true },
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthSessionModel = model<IAuthSessionDocument>(
  'AuthSession',
  authSessionSchema,
);
