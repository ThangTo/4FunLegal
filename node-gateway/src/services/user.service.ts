import { UserModel } from '../models/user.model';
import { AppError } from '../utils/app-error';
import { UserRole } from '../utils/auth';

type UserLike = {
  _id: string | { toString(): string };
  fullName: string;
  email: string;
  phone?: string | null;
  status: 'active' | 'inactive';
  role: UserRole;
  defaultSubmissionId?: string | null;
  avatarUrl?: string | null;
};

export const toUserResponse = (user: UserLike) => {
  const missingProfileFields = user.phone ? [] : ['phone'];

  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? null,
    status: user.status,
    role: user.role,
    defaultSubmissionId: user.defaultSubmissionId ?? null,
    avatarUrl: user.avatarUrl ?? null,
    profileCompleted: missingProfileFields.length === 0,
    missingProfileFields,
  };
};

export const userService = {
  async getCurrentUser(userId: string) {
    const user = await UserModel.findOne({ _id: userId, status: 'active' }).lean();

    if (!user) {
      throw new AppError('Current user not found', 404, 'CURRENT_USER_NOT_FOUND');
    }

    return toUserResponse(user);
  },

  async setDefaultSubmission(userId: string, submissionId: string) {
    await UserModel.findByIdAndUpdate(userId, {
      defaultSubmissionId: submissionId,
    });
  },

  async clearDefaultSubmission(userId: string) {
    await UserModel.findByIdAndUpdate(userId, {
      defaultSubmissionId: null,
    });
  },

  async clearDefaultSubmissionIfMatches(userId: string, submissionId: string) {
    await UserModel.findOneAndUpdate(
      { _id: userId, defaultSubmissionId: submissionId },
      { defaultSubmissionId: null },
    );
  },
};
