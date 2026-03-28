import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ProcedureStepper } from '../components/ProcedureStepper';
import { SiteLayout } from '../components/SiteLayout';
import { useAuth } from '../features/auth/AuthContext';
import {
  ProcedureDraft,
  RegistrationStep,
  formatPhone,
  initialProcedureDraft,
} from '../features/procedure/procedureDraft';
import { api, ApiRequestError, SubmissionDetail } from '../lib/api';
import { withSubmissionId } from '../lib/procedure';

const sectionTitles: Record<RegistrationStep, string> = {
  1: 'Bước 1: Thông tin chủ hộ',
  2: 'Bước 2: Thông tin hộ kinh doanh',
  3: 'Bước 3: Ngành nghề và quy mô',
};

const sectionDescriptions: Record<RegistrationStep, string> = {
  1: 'Khai báo chính xác thông tin nhận diện của chủ hộ và người nộp hồ sơ.',
  2: 'Hoàn thiện thông tin vận hành cơ bản của hộ kinh doanh để chuẩn bị bộ hồ sơ.',
  3: 'Chốt ngành nghề, vốn, quy mô và các điều kiện phát sinh để xây checklist tài liệu động.',
};

const ownerFields: Array<keyof ProcedureDraft> = [
  'ownerName',
  'nationalId',
  'birthDate',
  'phone',
  'email',
  'address',
  'submittedByProxy',
  'proxyName',
  'proxyRelationship',
];

const businessFields: Array<keyof ProcedureDraft> = [
  'businessName',
  'businessModel',
  'businessAddress',
  'startDate',
  'businessDescription',
  'householdMembers',
];

const industryFields: Array<keyof ProcedureDraft> = [
  'mainIndustry',
  'subIndustry',
  'expectedCapital',
  'laborScale',
  'salesChannel',
  'note',
  'requiresPracticeLicense',
];

const pickDraftFields = (
  draft: ProcedureDraft,
  fields: Array<keyof ProcedureDraft>,
) => {
  const payload: Partial<ProcedureDraft> = {};
  const nextPayload = payload as Record<
    keyof ProcedureDraft,
    ProcedureDraft[keyof ProcedureDraft]
  >;

  fields.forEach((field) => {
    nextPayload[field] = draft[field];
  });

  return payload;
};

const buildRouteFromSubmission = (
  submission: SubmissionDetail,
  requestedStep?: number,
) => {
  if (submission.resumeTarget.route === '/register') {
    const resolvedStep =
      requestedStep && requestedStep >= 1 && requestedStep <= 3
        ? (requestedStep as RegistrationStep)
        : submission.resumeTarget.step ?? 1;

    return withSubmissionId(`/register?step=${resolvedStep}`, submission.id);
  }

  return withSubmissionId(submission.resumeTarget.route, submission.id);
};

const extractFieldErrors = (error: unknown) => {
  if (!(error instanceof ApiRequestError) || !error.details || typeof error.details !== 'object') {
    return {};
  }

  return Object.entries(error.details as Record<string, unknown>).reduce(
    (accumulator, [field, message]) => {
      if (typeof message === 'string') {
        accumulator[field] = message;
      }
      return accumulator;
    },
    {} as Record<string, string>,
  );
};

export const RegistrationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const submissionId = searchParams.get('submissionId');
  const mode = searchParams.get('mode');
  const requestedStep = Number(searchParams.get('step') || '1');

  const [draft, setDraft] = useState<ProcedureDraft>(initialProcedureDraft);
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1);
  const [submissionCode, setSubmissionCode] = useState('');
  const [completion, setCompletion] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const applySubmission = (submission: SubmissionDetail) => {
      setDraft(submission.draft);
      setSubmissionCode(submission.submissionCode);
      setCompletion(submission.completionPercent);
      setCurrentStep(
        Math.min(
          3,
          Math.max(
            1,
            requestedStep || submission.resumeTarget.step || submission.currentStep || 1,
          ),
        ) as RegistrationStep,
      );
    };

    const createNewSubmission = async () => {
      const createdSubmission = await api.createSubmission();

      if (cancelled) {
        return;
      }

      navigate(withSubmissionId('/register?step=1', createdSubmission.id), { replace: true });
    };

    const syncSubmission = async () => {
      setIsLoading(true);
      setErrorMessage('');
      setFieldErrors({});

      try {
        if (submissionId) {
          const submission = await api.getSubmission(submissionId);

          if (cancelled) {
            return;
          }

          if (submission.isLocked) {
            navigate(buildRouteFromSubmission(submission, requestedStep), { replace: true });
            return;
          }

          applySubmission(submission);
          return;
        }

        if (mode === 'new') {
          await createNewSubmission();
          return;
        }

        if (user?.defaultSubmissionId) {
          const defaultSubmission = await api.getSubmission(user.defaultSubmissionId);

          if (cancelled) {
            return;
          }

          if (defaultSubmission.resumeTarget.route === '/submit') {
            await createNewSubmission();
            return;
          }

          if (defaultSubmission.resumeTarget.route !== '/register') {
            navigate(buildRouteFromSubmission(defaultSubmission, requestedStep), { replace: true });
            return;
          }

          applySubmission(defaultSubmission);
          navigate(buildRouteFromSubmission(defaultSubmission, requestedStep), { replace: true });
          return;
        }

        await createNewSubmission();
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Không thể tải hồ sơ thủ tục.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void syncSubmission();

    return () => {
      cancelled = true;
    };
  }, [mode, navigate, requestedStep, submissionId, user?.defaultSubmissionId]);

  const currentHint = useMemo(() => {
    if (currentStep === 1) {
      return 'Hoàn tất thông tin chủ hộ và xác định người nộp hồ sơ.';
    }

    if (currentStep === 2) {
      return 'Tên hộ kinh doanh và mô tả hoạt động sẽ ảnh hưởng trực tiếp đến kết quả phân tích.';
    }

    return 'Bước này quyết định checklist tài liệu điều kiện ở màn hình tiếp theo.';
  }, [currentStep]);

  const updateField = <K extends keyof ProcedureDraft>(field: K, value: ProcedureDraft[K]) => {
    setIsDraftSaved(false);
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const persistStep = async (step: RegistrationStep) => {
    if (!submissionId) {
      return null;
    }

    setIsSaving(true);
    setErrorMessage('');
    setFieldErrors({});

    try {
      if (step === 1) {
        return await api.updateSubmissionOwner(submissionId, pickDraftFields(draft, ownerFields));
      }

      if (step === 2) {
        return await api.updateSubmissionBusiness(
          submissionId,
          pickDraftFields(draft, businessFields),
        );
      }

      return await api.updateSubmissionIndustry(
        submissionId,
        pickDraftFields(draft, industryFields),
      );
    } catch (error) {
      setFieldErrors(extractFieldErrors(error));
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const applyUpdatedSubmission = (submission: SubmissionDetail) => {
    setDraft(submission.draft);
    setSubmissionCode(submission.submissionCode);
    setCompletion(submission.completionPercent);
  };

  const handleNext = async () => {
    try {
      const updated = await persistStep(currentStep);

      if (!updated) {
        return;
      }

      applyUpdatedSubmission(updated);
      const nextStep = (currentStep < 3 ? currentStep + 1 : currentStep) as RegistrationStep;
      setCurrentStep(nextStep);
      navigate(withSubmissionId(`/register?step=${nextStep}`, updated.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu bước hiện tại.');
    }
  };

  const handleBack = () => {
    const nextStep = (currentStep > 1 ? currentStep - 1 : currentStep) as RegistrationStep;
    setCurrentStep(nextStep);
    navigate(withSubmissionId(`/register?step=${nextStep}`, submissionId));
  };

  const handleSaveDraft = async () => {
    try {
      const updated = await persistStep(currentStep);

      if (updated) {
        applyUpdatedSubmission(updated);
        setIsDraftSaved(true);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu nháp.');
    }
  };

  const handleFinalize = async () => {
    try {
      const updated = await persistStep(3);

      if (!updated) {
        return;
      }

      applyUpdatedSubmission(updated);
      navigate(withSubmissionId('/documents', updated.id));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Không thể hoàn thiện bước đăng ký.',
      );
    }
  };

  if (isLoading) {
    return (
      <SiteLayout>
        <main className="page-shell pt-28 md:pt-32">
          <div className="container">
            <div className="card-soft rounded-feature p-10 text-center text-text-muted">
              Đang tải hồ sơ đăng ký...
            </div>
          </div>
        </main>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <main className="page-shell pt-28 md:pt-32">
        <div className="container">
          <header className="mb-12 text-center md:text-left">
            <h1 className="text-[3rem] font-black leading-tight text-brand-deep md:text-[3.5rem]">
              Đăng ký Hộ Kinh Doanh
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-text-muted">
              Hoàn thành từng bước kê khai để hệ thống tạo checklist tài liệu đúng với hồ sơ thực tế của bạn.
            </p>
            {submissionCode ? (
              <p className="mt-3 text-sm font-medium text-brand-primary">
                Mã hồ sơ: {submissionCode}
              </p>
            ) : null}
          </header>

          <ProcedureStepper currentStep={currentStep} />

          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
            <div className="card-base rounded-feature p-8 shadow-panel md:p-12 lg:col-span-8">
              <div className="mb-8 border-l-4 border-brand-secondary pl-4">
                <h2 className="text-2xl font-bold text-brand-deep">{sectionTitles[currentStep]}</h2>
                <p className="mt-2 text-text-muted">{sectionDescriptions[currentStep]}</p>
              </div>

              {errorMessage ? (
                <div className="mb-6 rounded-xl border border-state-error/20 bg-state-error/10 px-4 py-3 text-sm text-state-error">
                  {errorMessage}
                </div>
              ) : null}

              <form className="space-y-10" onSubmit={(event) => event.preventDefault()}>
                {currentStep === 1 ? (
                  <OwnerStep draft={draft} updateField={updateField} fieldErrors={fieldErrors} />
                ) : currentStep === 2 ? (
                  <BusinessStep draft={draft} updateField={updateField} fieldErrors={fieldErrors} />
                ) : (
                  <IndustryStep draft={draft} updateField={updateField} fieldErrors={fieldErrors} />
                )}

                <div className="flex flex-col justify-between gap-4 border-t border-border-base/60 pt-8 md:flex-row">
                  <div className="flex gap-4">
                    {currentStep > 1 ? (
                      <button type="button" onClick={handleBack} className="btn-outline px-8 py-3">
                        Quay lại
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void handleSaveDraft()}
                      className="btn-outline px-8 py-3"
                      disabled={isSaving}
                    >
                      Lưu nháp
                    </button>
                  </div>

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => void handleNext()}
                      className="btn-primary px-10 py-3"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Đang lưu...' : 'Tiếp tục'}
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleFinalize()}
                      className="btn-primary px-10 py-3"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Đang lưu...' : 'Sang bước tài liệu'}
                      <span className="material-symbols-outlined text-[20px]">description</span>
                    </button>
                  )}
                </div>
              </form>
            </div>

            <aside className="space-y-8 lg:sticky lg:top-32 lg:col-span-4">
              <div className="card-soft rounded-feature p-8 shadow-card">
                <h3 className="mb-6 flex items-center gap-2 text-xl font-black text-brand-deep">
                  <span className="material-symbols-outlined text-brand-secondary">description</span>
                  Tóm tắt hồ sơ
                </h3>

                <div className="mb-8">
                  <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
                    <span>Tiến độ hoàn thành</span>
                    <span>{completion}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-card">
                    <div
                      className="h-full rounded-full bg-brand-secondary transition-all duration-300"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <SummaryItem label="Chủ hộ" value={draft.ownerName || 'Chưa cập nhật'} />
                  <SummaryItem label="Số định danh" value={draft.nationalId || 'Chưa cập nhật'} />
                  <SummaryItem label="Liên hệ" value={formatPhone(draft.phone || 'Chưa cập nhật')} />
                  <SummaryItem
                    label="Người nộp hồ sơ"
                    value={draft.submittedByProxy ? draft.proxyName || 'Người nộp thay' : 'Chủ hộ trực tiếp nộp'}
                  />
                  <SummaryItem
                    label="Hộ kinh doanh"
                    value={draft.businessName || 'Chưa cập nhật'}
                  />
                  <SummaryItem
                    label="Ngành nghề chính"
                    value={draft.mainIndustry || 'Chưa cập nhật'}
                  />

                  <div className="border-t border-brand-primary/8 pt-4">
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <span
                        className="material-symbols-outlined text-state-warning"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        info
                      </span>
                      <span>{currentHint}</span>
                    </div>
                    {isDraftSaved ? (
                      <p className="mt-3 text-sm font-medium text-brand-secondary">
                        Bản nháp đã được lưu thành công trên hệ thống.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-feature bg-gradient-to-br from-brand-secondary to-brand-primary p-6 text-text-inverse shadow-panel">
                <h4 className="text-lg font-bold">Bạn cần hỗ trợ?</h4>
                <p className="mt-2 text-sm leading-relaxed text-text-inverse/85">
                  Trợ lý AI sẽ dùng chính dữ liệu kê khai hiện tại để gợi ý cách điền hồ sơ và bộ tài liệu phù hợp.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/guide')}
                    className="btn-outline border-white/30 bg-white text-brand-secondary hover:bg-white/90"
                  >
                    <span className="material-symbols-outlined text-[18px]">smart_display</span>
                    Xem hướng dẫn
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </SiteLayout>
  );
};

type StepProps = {
  draft: ProcedureDraft;
  updateField: <K extends keyof ProcedureDraft>(field: K, value: ProcedureDraft[K]) => void;
  fieldErrors: Record<string, string>;
};

const OwnerStep = ({ draft, updateField, fieldErrors }: StepProps) => (
  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
    <Field label="Họ và tên chủ hộ" required hint="Nhập đúng như trên giấy tờ pháp lý.">
      <InputWithIcon
        value={draft.ownerName}
        onChange={(value) => updateField('ownerName', value)}
        placeholder="Nhập đầy đủ họ và tên"
        icon="person"
        iconClassName="text-brand-secondary"
      />
      <ValidationMessage message={fieldErrors.ownerName} />
    </Field>

    <Field label="Số CCCD/CMND" required>
      <InputWithIcon
        value={draft.nationalId}
        onChange={(value) => updateField('nationalId', value)}
        placeholder="9 - 12 chữ số"
        icon="verified_user"
        iconClassName="text-brand-secondary"
        filled
      />
      <ValidationMessage message={fieldErrors.nationalId} />
    </Field>

    <Field label="Ngày sinh" required>
      <input
        type="date"
        className="input-base h-14"
        value={draft.birthDate}
        onChange={(event) => updateField('birthDate', event.target.value)}
      />
      <ValidationMessage message={fieldErrors.birthDate} />
    </Field>

    <Field label="Số điện thoại" required>
      <input
        type="tel"
        className="input-base h-14"
        value={draft.phone}
        onChange={(event) => updateField('phone', event.target.value)}
        placeholder="0xxx xxx xxx"
      />
      <ValidationMessage message={fieldErrors.phone} />
    </Field>

    <Field label="Email" className="md:col-span-2">
      <input
        type="email"
        className="input-base h-14"
        value={draft.email}
        onChange={(event) => updateField('email', event.target.value)}
        placeholder="example@domain.com"
      />
      <ValidationMessage message={fieldErrors.email} />
    </Field>

    <Field
      label="Địa chỉ thường trú"
      required
      className="md:col-span-2"
      hint="Nhập địa chỉ theo giấy tờ tùy thân hoặc sổ hộ khẩu."
    >
      <textarea
        rows={4}
        className="textarea-base"
        value={draft.address}
        onChange={(event) => updateField('address', event.target.value)}
        placeholder="Số nhà, tên đường, phường/xã..."
      />
      <ValidationMessage message={fieldErrors.address} />
    </Field>

    <Field
      label="Người nộp hồ sơ"
      required
      className="md:col-span-2"
      hint="Chọn đúng để hệ thống xác định có cần giấy ủy quyền hay không."
    >
      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => updateField('submittedByProxy', false)}
          className={`rounded-2xl border px-4 py-4 text-left transition ${
            !draft.submittedByProxy
              ? 'border-brand-secondary bg-brand-secondary/10 text-brand-deep'
              : 'border-border-base/60 bg-surface-card'
          }`}
        >
          Chủ hộ trực tiếp nộp
        </button>
        <button
          type="button"
          onClick={() => updateField('submittedByProxy', true)}
          className={`rounded-2xl border px-4 py-4 text-left transition ${
            draft.submittedByProxy
              ? 'border-brand-secondary bg-brand-secondary/10 text-brand-deep'
              : 'border-border-base/60 bg-surface-card'
          }`}
        >
          Người khác nộp thay
        </button>
      </div>
    </Field>

    {draft.submittedByProxy ? (
      <>
        <Field label="Họ tên người nộp thay" required>
          <input
            type="text"
            className="input-base h-14"
            value={draft.proxyName}
            onChange={(event) => updateField('proxyName', event.target.value)}
            placeholder="Nhập họ tên người nộp thay"
          />
          <ValidationMessage message={fieldErrors.proxyName} />
        </Field>

        <Field label="Mối quan hệ với chủ hộ" required>
          <input
            type="text"
            className="input-base h-14"
            value={draft.proxyRelationship}
            onChange={(event) => updateField('proxyRelationship', event.target.value)}
            placeholder="Ví dụ: Vợ/chồng, người được ủy quyền"
          />
          <ValidationMessage message={fieldErrors.proxyRelationship} />
        </Field>
      </>
    ) : null}
  </div>
);

const BusinessStep = ({ draft, updateField, fieldErrors }: StepProps) => (
  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
    <Field label="Tên hộ kinh doanh dự kiến" required>
      <input
        type="text"
        className="input-base h-14"
        value={draft.businessName}
        onChange={(event) => updateField('businessName', event.target.value)}
        placeholder="Ví dụ: Hộ kinh doanh Minh An Quận 1"
      />
      <ValidationMessage message={fieldErrors.businessName} />
    </Field>

    <Field label="Loại hình" required>
      <select
        className="select-base h-14"
        value={draft.businessModel}
        onChange={(event) => updateField('businessModel', event.target.value)}
      >
        <option>Hộ kinh doanh cá thể</option>
        <option>Hộ kinh doanh có thành viên hộ gia đình</option>
        <option>Doanh nghiệp tư nhân</option>
      </select>
      <ValidationMessage message={fieldErrors.businessModel} />
    </Field>

    <Field label="Địa điểm kinh doanh" required className="md:col-span-2">
      <textarea
        rows={4}
        className="textarea-base"
        value={draft.businessAddress}
        onChange={(event) => updateField('businessAddress', event.target.value)}
        placeholder="Địa chỉ nơi đặt cửa hàng hoặc địa điểm kinh doanh chính"
      />
      <ValidationMessage message={fieldErrors.businessAddress} />
    </Field>

    <Field label="Ngày dự kiến bắt đầu hoạt động" required>
      <input
        type="date"
        className="input-base h-14"
        value={draft.startDate}
        onChange={(event) => updateField('startDate', event.target.value)}
      />
      <ValidationMessage message={fieldErrors.startDate} />
    </Field>

    <Field label="Thành viên hộ gia đình cùng tham gia">
      <input
        type="text"
        className="input-base h-14"
        value={draft.householdMembers}
        onChange={(event) => updateField('householdMembers', event.target.value)}
        placeholder="Ví dụ: 02 thành viên cùng góp vốn"
      />
    </Field>

    <Field
      label="Mô tả hoạt động kinh doanh"
      required
      className="md:col-span-2"
      hint="Mô tả rõ hàng hóa/dịch vụ và cách bạn bán hàng để AI đối chiếu đúng hơn."
    >
      <textarea
        rows={5}
        className="textarea-base"
        value={draft.businessDescription}
        onChange={(event) => updateField('businessDescription', event.target.value)}
        placeholder="Ví dụ: Bán lẻ thực phẩm khô tại cửa hàng và nhận đơn online trong nội thành."
      />
      <ValidationMessage message={fieldErrors.businessDescription} />
    </Field>
  </div>
);

const IndustryStep = ({ draft, updateField, fieldErrors }: StepProps) => (
  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
    <Field label="Ngành nghề kinh doanh chính" required>
      <select
        className="select-base h-14"
        value={draft.mainIndustry}
        onChange={(event) => updateField('mainIndustry', event.target.value)}
      >
        <option value="">Chọn ngành nghề chính</option>
        <option>Bán lẻ thực phẩm trong các cửa hàng chuyên doanh</option>
        <option>Dịch vụ ăn uống phục vụ lưu động</option>
        <option>Dịch vụ cắt tóc, gội đầu</option>
        <option>Sửa chữa thiết bị gia đình</option>
      </select>
      <ValidationMessage message={fieldErrors.mainIndustry} />
    </Field>

    <Field label="Ngành nghề bổ sung">
      <input
        type="text"
        className="input-base h-14"
        value={draft.subIndustry}
        onChange={(event) => updateField('subIndustry', event.target.value)}
        placeholder="Ví dụ: Bán lẻ hàng tiêu dùng thiết yếu"
      />
    </Field>

    <Field label="Vốn dự kiến" required>
      <input
        type="number"
        className="input-base h-14"
        value={draft.expectedCapital}
        onChange={(event) => updateField('expectedCapital', event.target.value)}
        placeholder="300000000"
      />
      <ValidationMessage message={fieldErrors.expectedCapital} />
    </Field>

    <Field label="Quy mô lao động" required>
      <select
        className="select-base h-14"
        value={draft.laborScale}
        onChange={(event) => updateField('laborScale', event.target.value)}
      >
        <option value="">Chọn quy mô lao động</option>
        <option>1 - 2 lao động</option>
        <option>3 - 5 lao động</option>
        <option>6 - 9 lao động</option>
        <option>Trên 10 lao động</option>
      </select>
      <ValidationMessage message={fieldErrors.laborScale} />
    </Field>

    <Field label="Kênh bán hàng dự kiến" required>
      <select
        className="select-base h-14"
        value={draft.salesChannel}
        onChange={(event) => updateField('salesChannel', event.target.value)}
      >
        <option value="">Chọn kênh bán hàng</option>
        <option>Tại cửa hàng và online</option>
        <option>Chỉ tại cửa hàng</option>
        <option>Chỉ online</option>
        <option>Bán lưu động</option>
      </select>
      <ValidationMessage message={fieldErrors.salesChannel} />
    </Field>

    <Field
      label="Ngành nghề có yêu cầu chứng chỉ hành nghề?"
      className="md:col-span-2"
      hint="Dùng để hệ thống thêm hoặc bỏ chứng chỉ hành nghề khỏi checklist tài liệu."
    >
      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => updateField('requiresPracticeLicense', false)}
          className={`rounded-2xl border px-4 py-4 text-left transition ${
            !draft.requiresPracticeLicense
              ? 'border-brand-secondary bg-brand-secondary/10 text-brand-deep'
              : 'border-border-base/60 bg-surface-card'
          }`}
        >
          Không yêu cầu
        </button>
        <button
          type="button"
          onClick={() => updateField('requiresPracticeLicense', true)}
          className={`rounded-2xl border px-4 py-4 text-left transition ${
            draft.requiresPracticeLicense
              ? 'border-brand-secondary bg-brand-secondary/10 text-brand-deep'
              : 'border-border-base/60 bg-surface-card'
          }`}
        >
          Có yêu cầu chứng chỉ
        </button>
      </div>
    </Field>

    <Field label="Ghi chú thêm" className="md:col-span-2">
      <textarea
        rows={4}
        className="textarea-base"
        value={draft.note}
        onChange={(event) => updateField('note', event.target.value)}
        placeholder="Các ghi chú đặc thù để hệ thống gợi ý tài liệu phù hợp hơn"
      />
    </Field>
  </div>
);

type FieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
};

const Field = ({ label, required = false, hint, className, children }: FieldProps) => (
  <div className={className}>
    <label className="mb-2 block pl-1 text-sm font-semibold text-text-muted">
      {label} {required ? <span className="text-state-error">*</span> : null}
    </label>
    {children}
    {hint ? <p className="mt-2 pl-1 text-xs italic text-text-muted/80">{hint}</p> : null}
  </div>
);

const ValidationMessage = ({ message }: { message?: string }) =>
  message ? <p className="mt-2 pl-1 text-sm text-state-error">{message}</p> : null;

type InputWithIconProps = {
  value: string;
  placeholder: string;
  icon: string;
  onChange: (value: string) => void;
  iconClassName?: string;
  filled?: boolean;
};

const InputWithIcon = ({
  value,
  placeholder,
  icon,
  onChange,
  iconClassName = 'text-text-muted',
  filled = false,
}: InputWithIconProps) => (
  <div className="relative">
    <input
      type="text"
      className="input-base h-14 pr-12"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
    <span
      className={`material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 ${iconClassName}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {icon}
    </span>
  </div>
);

type SummaryItemProps = {
  label: string;
  value: string;
};

const SummaryItem = ({ label, value }: SummaryItemProps) => (
  <div className="space-y-1">
    <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-text-muted">
      {label}
    </p>
    <p className="text-base font-semibold text-brand-deep">{value}</p>
  </div>
);
