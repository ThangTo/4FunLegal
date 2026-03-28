import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { AuthPageShell } from '../components/AuthPageShell';
import { useAuth } from '../features/auth/AuthContext';
import { getPostAuthRedirect, sanitizeAuthRedirect } from '../features/auth/auth-routing';
import { redirectToGoogleAuth } from '../features/auth/google-auth';
import { api } from '../lib/api';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const AuthLoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = sanitizeAuthRedirect(searchParams.get('redirect'));
  const oauthError = searchParams.get('error');
  const { login, isLoading, user } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isLoading && user) {
      navigate(getPostAuthRedirect(user, redirectTarget), { replace: true });
    }
  }, [isLoading, navigate, redirectTarget, user]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      setErrorMessage('');
      const nextUser = await login(values);
      navigate(getPostAuthRedirect(nextUser, redirectTarget), { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể đăng nhập.');
    }
  });

  return (
    <AuthPageShell
      title="Đăng nhập để tiếp tục hồ sơ"
      subtitle="Khôi phục đúng phiên làm việc, lịch sử hồ sơ và dữ liệu đã lưu của bạn trên toàn bộ hệ thống."
      alternateText="Chưa có tài khoản?"
      alternateLabel="Đăng ký ngay"
      alternateTo={`/auth/register?redirect=${encodeURIComponent(redirectTarget)}`}
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-secondary">
            Welcome back
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-brand-deep">
            Đăng nhập
          </h2>
        </div>

        {oauthError ? (
          <div className="rounded-2xl border border-state-warning/20 bg-state-warning/10 px-4 py-3 text-sm text-state-warning">
            Google đăng nhập chưa hoàn tất. Bạn có thể thử lại hoặc dùng email và mật khẩu.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-state-error/20 bg-state-error/10 px-4 py-3 text-sm text-state-error">
            {errorMessage}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-text-muted">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="input-base h-14"
              placeholder="ban@example.com"
              {...register('email')}
            />
            {errors.email ? (
              <p className="mt-2 text-sm text-state-error">{errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-sm font-semibold text-text-muted"
            >
              Mật khẩu
            </label>
            <input
              id="login-password"
              type="password"
              className="input-base h-14"
              placeholder="Nhập mật khẩu"
              {...register('password')}
            />
            {errors.password ? (
              <p className="mt-2 text-sm text-state-error">{errors.password.message}</p>
            ) : null}
          </div>

          <button type="submit" className="btn-primary h-14 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </form>

        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
          <div className="h-px flex-1 bg-border-base" />
          <span>Hoặc tiếp tục với</span>
          <div className="h-px flex-1 bg-border-base" />
        </div>

        <button
          type="button"
          onClick={() => redirectToGoogleAuth(api.getGoogleStartUrl(redirectTarget))}
          className="btn-outline h-14 w-full justify-center"
        >
          <span className="text-base font-black text-brand-primary">G</span>
          Tiếp tục với Google
        </button>
      </div>
    </AuthPageShell>
  );
};
