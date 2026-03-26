import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { cn } from '../lib/cn';
import { StatusBadge } from './StatusBadge';

// Define the validation schema using Zod
const registrationSchema = z.object({
  companyName: z.string().min(5, 'Company name must be at least 5 characters'),
  businessType: z.enum(['LLC', 'JSC', 'Partnership', 'Sole Proprietorship']),
  capital: z.number().min(1000000, 'Minimum capital is 1,000,000 VND'),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export const RegistrationForm: React.FC = () => {
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);
    setError(null);
    setSubmissionResult(null);

    try {
      const apiUrl = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000/api/v1/proxy/register';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit registration for verification');
      }

      const result = await response.json();
      setSubmissionResult(result);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card-base mx-auto mt-10 max-w-2xl p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-brand-deep md:text-3xl">
            Kiểm tra nhanh hồ sơ kinh doanh
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted md:text-base">
            Biểu mẫu mẫu dùng semantic theme mới để kiểm tra các variant input,
            button và trạng thái phản hồi.
          </p>
        </div>
        <StatusBadge tone="info">Demo UI form</StatusBadge>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Company Name */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-text-base">
            Tên doanh nghiệp / hộ kinh doanh
          </label>
          <input
            {...register('companyName')}
            className={cn(
              'input-base',
              errors.companyName &&
                'border-state-error focus:border-state-error focus:ring-state-error/15',
            )}
            placeholder="Ví dụ: Hộ kinh doanh Minh Phát"
          />
          {errors.companyName && (
            <p className="mt-2 text-sm text-state-error">
              {errors.companyName.message}
            </p>
          )}
        </div>

        {/* Business Type */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-text-base">
            Loại hình đăng ký
          </label>
          <select
            {...register('businessType')}
            className={cn(
              'select-base',
              errors.businessType &&
                'border-state-error focus:border-state-error focus:ring-state-error/15',
            )}
          >
            <option value="LLC">Limited Liability Company (LLC)</option>
            <option value="JSC">Joint Stock Company (JSC)</option>
            <option value="Partnership">Partnership</option>
            <option value="Sole Proprietorship">Sole Proprietorship</option>
          </select>
          {errors.businessType && (
            <p className="mt-2 text-sm text-state-error">
              {errors.businessType.message}
            </p>
          )}
        </div>

        {/* Capital */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-text-base">
            Vốn đăng ký (VND)
          </label>
          <input
            type="number"
            {...register('capital', { valueAsNumber: true })}
            className={cn(
              'input-base',
              errors.capital &&
                'border-state-error focus:border-state-error focus:ring-state-error/15',
            )}
            placeholder="1000000"
          />
          {errors.capital && (
            <p className="mt-2 text-sm text-state-error">
              {errors.capital.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full justify-center py-3 text-base"
        >
          {isLoading ? 'Đang kiểm tra...' : 'Kiểm tra hồ sơ'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-2xl border border-state-error/30 bg-state-error/10 p-4 text-state-error">
          {error}
        </div>
      )}

      {/* Success / AI Result */}
      {submissionResult && (
        <div className="mt-6 rounded-panel border border-state-success/25 bg-state-success/10 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-state-success">
              Kết quả đánh giá AI
            </h3>
            <StatusBadge tone="success">{submissionResult.prediction}</StatusBadge>
          </div>
          <p className="text-text-base">
            <strong>Confidence:</strong> {submissionResult.confidenceScore * 100}%
          </p>
          
          <div className="mt-2">
            <strong>Feedback:</strong>
            <ul className="mt-2 list-disc pl-5 text-sm text-state-success">
              {submissionResult.feedback.map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
