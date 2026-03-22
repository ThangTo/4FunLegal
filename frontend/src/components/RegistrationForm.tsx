import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

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
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Business Registration Fact-Check</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Company Name</label>
          <input
            {...register('companyName')}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 ${errors.companyName ? 'border-red-500' : ''}`}
            placeholder="e.g. Acme Corporation"
          />
          {errors.companyName && <p className="mt-1 text-sm text-red-500">{errors.companyName.message}</p>}
        </div>

        {/* Business Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Business Type</label>
          <select
            {...register('businessType')}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 ${errors.businessType ? 'border-red-500' : ''}`}
          >
            <option value="LLC">Limited Liability Company (LLC)</option>
            <option value="JSC">Joint Stock Company (JSC)</option>
            <option value="Partnership">Partnership</option>
            <option value="Sole Proprietorship">Sole Proprietorship</option>
          </select>
          {errors.businessType && <p className="mt-1 text-sm text-red-500">{errors.businessType.message}</p>}
        </div>

        {/* Capital */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Capital (VND)</label>
          <input
            type="number"
            {...register('capital', { valueAsNumber: true })}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 ${errors.capital ? 'border-red-500' : ''}`}
            placeholder="1000000"
          />
          {errors.capital && <p className="mt-1 text-sm text-red-500">{errors.capital.message}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {isLoading ? 'Verifying...' : 'Verify Registration'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Success / AI Result */}
      {submissionResult && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="text-lg font-medium text-green-800 mb-2">AI Verification Result</h3>
          <p><strong>Status:</strong> {submissionResult.prediction}</p>
          <p><strong>Confidence:</strong> {submissionResult.confidenceScore * 100}%</p>
          
          <div className="mt-2">
            <strong>Feedback:</strong>
            <ul className="list-disc pl-5 text-sm text-green-700 mt-1">
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
