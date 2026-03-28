import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api, AuthUser } from '../../lib/api';

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

type CompleteProfilePayload = {
  phone: string;
};

export type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  refreshSession: () => Promise<AuthUser | null>;
  completeProfile: (payload: CompleteProfilePayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      try {
        const currentUser = await api.getAuthMe();

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login: async (payload) => {
        const nextUser = await api.loginAuth(payload);
        setUser(nextUser);
        return nextUser;
      },
      register: async (payload) => {
        const nextUser = await api.registerAuth(payload);
        setUser(nextUser);
        return nextUser;
      },
      refreshSession: async () => {
        try {
          const nextUser = await api.refreshAuth();
          setUser(nextUser);
          return nextUser;
        } catch {
          setUser(null);
          return null;
        }
      },
      completeProfile: async (payload) => {
        const nextUser = await api.completeProfile(payload);
        setUser(nextUser);
        return nextUser;
      },
      logout: async () => {
        try {
          await api.logoutAuth();
        } finally {
          setUser(null);
        }
      },
    }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
