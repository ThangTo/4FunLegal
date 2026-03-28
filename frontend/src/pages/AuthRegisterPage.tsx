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

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
    email: z.string().email('Email không hợp lệ'),
    phone: z.string().min(9, 'Số điện thoại không hợp lệ'),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    confirmPassword: z.string().min(8, 'Vui lòng nhập lại mật khẩu'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export const AuthRegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = sanitizeAuthRedirect(searchParams.get('redirect'));
  const { register: registerAccount, isLoading, user } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
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
      const nextUser = await registerAccount({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });
      navigate(getPostAuthRedirect(nextUser, redirectTarget), { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tạo tài khoản.');
    }
  });

  return (
    <AuthPageShell
      title="Tạo tài khoản để lưu tiến độ"
      subtitle="Chỉ cần vài thông tin cơ bản để đồng bộ hồ sơ, lịch sử xử lý và kết quả AI theo đúng tài khoản của bạn."
      alternateText="Đã có tài khoản?"
      alternateLabel="Đăng nhập"
      alternateTo={`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`}
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-secondary">
            New account
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-brand-deep">
            Đăng ký tài khoản
          </h2>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-state-error/20 bg-state-error/10 px-4 py-3 text-sm text-state-error">
            {errorMessage}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="register-fullName"
              className="mb-2 block text-sm font-semibold text-text-muted"
            >
              Họ và tên
            </label>
            <input
              id="register-fullName"
              type="text"
              className="input-base h-14"
              placeholder="Nhập họ tên đầy đủ"
              {...register('fullName')}
            />
            {errors.fullName ? (
              <p className="mt-2 text-sm text-state-error">{errors.fullName.message}</p>
            ) : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="register-email"
                className="mb-2 block text-sm font-semibold text-text-muted"
              >
                Email
              </label>
              <input
                id="register-email"
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
                htmlFor="register-phone"
                className="mb-2 block text-sm font-semibold text-text-muted"
              >
                Số điện thoại
              </label>
              <input
                id="register-phone"
                type="tel"
                className="input-base h-14"
                placeholder="09xx xxx xxx"
                {...register('phone')}
              />
              {errors.phone ? (
                <p className="mt-2 text-sm text-state-error">{errors.phone.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="register-password"
                className="mb-2 block text-sm font-semibold text-text-muted"
              >
                Mật khẩu
              </label>
              <input
                id="register-password"
                type="password"
                className="input-base h-14"
                placeholder="Ít nhất 8 ký tự"
                {...register('password')}
              />
              {errors.password ? (
                <p className="mt-2 text-sm text-state-error">{errors.password.message}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="register-confirmPassword"
                className="mb-2 block text-sm font-semibold text-text-muted"
              >
                Xác nhận mật khẩu
              </label>
              <input
                id="register-confirmPassword"
                type="password"
                className="input-base h-14"
                placeholder="Nhập lại mật khẩu"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword ? (
                <p className="mt-2 text-sm text-state-error">
                  {errors.confirmPassword.message}
                </p>
              ) : null}
            </div>
          </div>

          <button type="submit" className="btn-primary h-14 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            <span className="material-symbols-outlined text-[20px]">person_add</span>
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
