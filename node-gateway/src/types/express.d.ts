declare global {
  namespace Express {
    interface Request {
      currentUser?: {
        id: string;
        fullName: string;
        email: string;
        phone?: string | null;
        status: string;
        role: 'user' | 'admin';
        defaultSubmissionId?: string | null;
        avatarUrl?: string | null;
        profileCompleted: boolean;
        missingProfileFields: string[];
        sessionId: string;
      };
    }
  }
}

export {};
