import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { AuthPageShell } from '../components/AuthPageShell';
import { useAuth } from '../features/auth/AuthContext';
import { sanitizeAuthRedirect } from '../features/auth/auth-routing';

const completeProfileSchema = z.object({
  phone: z.string().min(9, 'Số điện thoại không hợp lệ'),
});

type CompleteProfileValues = z.infer<typeof completeProfileSchema>;

export const AuthCompleteProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = sanitizeAuthRedirect(searchParams.get('redirect'));
  const { completeProfile, isLoading, logout, user } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompleteProfileValues>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      phone: user?.phone ?? '',
    },
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate(`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`, {
        replace: true,
      });
      return;
    }

    if (!isLoading && user?.profileCompleted) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isLoading, navigate, redirectTarget, user]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      setErrorMessage('');
      await completeProfile(values);
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Không thể hoàn tất hồ sơ tài khoản.',
      );
    }
  });

  return (
    <AuthPageShell
      title="Hoàn tất hồ sơ tối thiểu"
      subtitle="Google đã xác thực danh tính của bạn. Chỉ cần bổ sung số điện thoại để tiếp tục toàn bộ luồng nộp và kiểm tra hồ sơ."
      alternateText="Muốn quay lại trang đăng nhập?"
      alternateLabel="Mở trang đăng nhập"
      alternateTo="/auth/login"
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-secondary">
            One more step
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-brand-deep">
            Bổ sung số điện thoại
          </h2>
          {user?.email ? (
            <p className="mt-3 text-sm text-text-muted">
              Tài khoản đang xác thực với email <strong>{user.email}</strong>
            </p>
          ) : null}
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-state-error/20 bg-state-error/10 px-4 py-3 text-sm text-state-error">
            {errorMessage}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="complete-profile-phone"
              className="mb-2 block text-sm font-semibold text-text-muted"
            >
              Số điện thoại
            </label>
            <input
              id="complete-profile-phone"
              type="tel"
              className="input-base h-14"
              placeholder="09xx xxx xxx"
              {...register('phone')}
            />
            {errors.phone ? (
              <p className="mt-2 text-sm text-state-error">{errors.phone.message}</p>
            ) : null}
          </div>

          <button type="submit" className="btn-primary h-14 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Đang lưu...' : 'Hoàn tất và tiếp tục'}
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </button>
        </form>

        <button
          type="button"
          onClick={() => void logout().then(() => navigate('/auth/login', { replace: true }))}
          className="btn-outline h-14 w-full justify-center"
        >
          Đăng xuất và dùng tài khoản khác
        </button>
      </div>
    </AuthPageShell>
  );
};
