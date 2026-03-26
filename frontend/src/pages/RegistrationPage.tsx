import { ReactNode, useMemo, useState } from "react";

import {
  ProcedureDraft,
  RegistrationStep,
  formatPhone,
} from "../features/procedure/procedureDraft";
import { ProcedureStepper } from "../components/ProcedureStepper";
import { SiteLayout } from "../components/SiteLayout";

type RegistrationPageProps = {
  draft: ProcedureDraft;
  currentStep: RegistrationStep;
  onDraftChange: (draft: ProcedureDraft) => void;
  onStepChange: (step: RegistrationStep) => void;
  onNavigate: (path: string) => void;
};

const completionByStep: Record<RegistrationStep, number> = {
  1: 25,
  2: 50,
  3: 75,
};

const sectionTitles: Record<RegistrationStep, string> = {
  1: "Bước 1: Thông tin chủ hộ",
  2: "Bước 2: Thông tin hộ kinh doanh",
  3: "Bước 3: Ngành nghề và quy mô",
};

const sectionDescriptions: Record<RegistrationStep, string> = {
  1: "Điền thông tin định danh và liên hệ của chủ hộ kinh doanh theo đúng giấy tờ pháp lý.",
  2: "Khai báo thông tin cơ bản của hộ kinh doanh để hệ thống chuẩn bị cấu trúc hồ sơ phù hợp.",
  3: "Xác định ngành nghề, quy mô dự kiến và mức vốn để hoàn thiện bộ tài liệu nộp hồ sơ.",
};

export const RegistrationPage = ({
  draft,
  currentStep,
  onDraftChange,
  onStepChange,
  onNavigate,
}: RegistrationPageProps) => {
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  const completion = completionByStep[currentStep];

  const currentHint = useMemo(() => {
    if (currentStep === 1) {
      return "Đang ở bước nhập liệu cơ bản";
    }

    if (currentStep === 2) {
      return "Đã có thông tin chủ hộ, tiếp tục hoàn thiện hộ kinh doanh";
    }

    return "Sau bước này bạn có thể chuyển sang phần tải và kiểm tra tài liệu";
  }, [currentStep]);

  const updateField = <K extends keyof ProcedureDraft>(
    field: K,
    value: ProcedureDraft[K],
  ) => {
    setIsDraftSaved(false);
    onDraftChange({ ...draft, [field]: value });
  };

  const handleNext = () => {
    onStepChange((currentStep < 3 ? currentStep + 1 : currentStep) as RegistrationStep);
  };

  const handleBack = () => {
    onStepChange((currentStep > 1 ? currentStep - 1 : currentStep) as RegistrationStep);
  };

  const handleSaveDraft = () => {
    setIsDraftSaved(true);
  };

  const handleFinalize = () => {
    onStepChange(3);
    onNavigate("/documents");
  };

  const renderOwnerStep = () => (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <Field
        label="Họ và tên chủ hộ"
        required
        hint="Nhập theo đúng thông tin trên căn cước công dân."
      >
        <InputWithIcon
          value={draft.ownerName}
          onChange={(value) => updateField("ownerName", value)}
          placeholder="Nhập đầy đủ họ và tên"
          icon="check_circle"
          iconClassName="text-brand-secondary"
        />
      </Field>

      <Field label="Số CCCD/CMND" required>
        <InputWithIcon
          value={draft.nationalId}
          onChange={(value) => updateField("nationalId", value)}
          placeholder="12 chữ số"
          icon="verified_user"
          iconClassName="text-brand-secondary"
          filled
        />
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-secondary">
          <span className="material-symbols-outlined text-sm">check</span>
          Đã xác thực với cơ sở dữ liệu quốc gia
        </p>
      </Field>

      <Field label="Ngày sinh" required>
        <input
          type="date"
          className="input-base h-14"
          value={draft.birthDate}
          onChange={(event) => updateField("birthDate", event.target.value)}
        />
      </Field>

      <Field label="Số điện thoại" required>
        <input
          type="tel"
          className="input-base h-14"
          value={draft.phone}
          onChange={(event) => updateField("phone", event.target.value)}
          placeholder="0xxx xxx xxx"
        />
      </Field>

      <Field label="Email" className="md:col-span-2">
        <input
          type="email"
          className="input-base h-14"
          value={draft.email}
          onChange={(event) => updateField("email", event.target.value)}
          placeholder="example@domain.com"
        />
      </Field>

      <Field
        label="Địa chỉ thường trú"
        required
        className="md:col-span-2"
        hint="Nhập địa chỉ theo sổ hộ khẩu hoặc căn cước công dân."
      >
        <textarea
          rows={4}
          className="textarea-base"
          value={draft.address}
          onChange={(event) => updateField("address", event.target.value)}
          placeholder="Số nhà, tên đường, phường/xã..."
        />
      </Field>
    </div>
  );

  const renderBusinessStep = () => (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <Field label="Tên hộ kinh doanh dự kiến" required>
        <input
          type="text"
          className="input-base h-14"
          value={draft.businessName}
          onChange={(event) => updateField("businessName", event.target.value)}
          placeholder="Ví dụ: Hộ kinh doanh Minh An"
        />
      </Field>

      <Field label="Loại hình" required>
        <select
          className="select-base h-14"
          value={draft.businessModel}
          onChange={(event) => updateField("businessModel", event.target.value)}
        >
          <option>Hộ kinh doanh cá thể</option>
          <option>Hộ kinh doanh có thành viên hộ gia đình</option>
        </select>
      </Field>

      <Field label="Địa điểm kinh doanh" required className="md:col-span-2">
        <textarea
          rows={4}
          className="textarea-base"
          value={draft.businessAddress}
          onChange={(event) => updateField("businessAddress", event.target.value)}
          placeholder="Địa chỉ nơi đặt cửa hàng hoặc địa điểm kinh doanh chính"
        />
      </Field>

      <Field label="Ngày dự kiến bắt đầu hoạt động" required>
        <input
          type="date"
          className="input-base h-14"
          value={draft.startDate}
          onChange={(event) => updateField("startDate", event.target.value)}
        />
      </Field>

      <Field label="Thành viên hộ gia đình cùng tham gia">
        <input
          type="text"
          className="input-base h-14"
          value={draft.householdMembers}
          onChange={(event) => updateField("householdMembers", event.target.value)}
          placeholder="Ví dụ: 01 thành viên hỗ trợ"
        />
      </Field>

      <Field
        label="Mô tả hoạt động kinh doanh"
        required
        className="md:col-span-2"
        hint="Mô tả ngắn gọn sản phẩm hoặc dịch vụ chính bạn dự kiến kinh doanh."
      >
        <textarea
          rows={5}
          className="textarea-base"
          value={draft.businessDescription}
          onChange={(event) => updateField("businessDescription", event.target.value)}
          placeholder="Ví dụ: Bán lẻ thực phẩm, đồ gia dụng, dịch vụ ăn uống..."
        />
      </Field>
    </div>
  );

  const renderIndustryStep = () => (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <Field label="Ngành nghề kinh doanh chính" required>
        <select
          className="select-base h-14"
          value={draft.mainIndustry}
          onChange={(event) => updateField("mainIndustry", event.target.value)}
        >
          <option>Bán lẻ thực phẩm trong các cửa hàng chuyên doanh</option>
          <option>Dịch vụ ăn uống phục vụ lưu động</option>
          <option>Dịch vụ cắt tóc, gội đầu</option>
          <option>Sửa chữa thiết bị gia đình</option>
        </select>
      </Field>

      <Field label="Ngành nghề bổ sung">
        <input
          type="text"
          className="input-base h-14"
          value={draft.subIndustry}
          onChange={(event) => updateField("subIndustry", event.target.value)}
          placeholder="Ví dụ: Bán lẻ hàng tiêu dùng thiết yếu"
        />
      </Field>

      <Field label="Vốn dự kiến" required>
        <input
          type="number"
          className="input-base h-14"
          value={draft.expectedCapital}
          onChange={(event) => updateField("expectedCapital", event.target.value)}
          placeholder="300000000"
        />
      </Field>

      <Field label="Quy mô lao động" required>
        <select
          className="select-base h-14"
          value={draft.laborScale}
          onChange={(event) => updateField("laborScale", event.target.value)}
        >
          <option>1 - 2 lao động</option>
          <option>3 - 5 lao động</option>
          <option>6 - 9 lao động</option>
          <option>Trên 10 lao động</option>
        </select>
      </Field>

      <Field label="Kênh bán hàng dự kiến" required>
        <select
          className="select-base h-14"
          value={draft.salesChannel}
          onChange={(event) => updateField("salesChannel", event.target.value)}
        >
          <option>Tại cửa hàng và online</option>
          <option>Chỉ tại cửa hàng</option>
          <option>Chỉ online</option>
          <option>Bán lưu động</option>
        </select>
      </Field>

      <Field label="Ghi chú thêm" className="md:col-span-2">
        <textarea
          rows={4}
          className="textarea-base"
          value={draft.note}
          onChange={(event) => updateField("note", event.target.value)}
          placeholder="Các ghi chú đặc thù để hệ thống gợi ý tài liệu phù hợp hơn"
        />
      </Field>
    </div>
  );

  const renderCurrentStep = () => {
    if (currentStep === 1) {
      return renderOwnerStep();
    }

    if (currentStep === 2) {
      return renderBusinessStep();
    }

    return renderIndustryStep();
  };

  return (
    <SiteLayout>
      <main className="page-shell pt-28 md:pt-32">
        <div className="container">
          <header className="mb-12 text-center md:text-left">
            <h1 className="text-[3rem] font-black leading-tight text-brand-deep md:text-[3.5rem]">
              Đăng ký Hộ Kinh Doanh
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-text-muted">
              Vui lòng hoàn thành các bước dưới đây để khởi tạo hồ sơ kinh
              doanh của bạn một cách nhanh chóng, rõ ràng và chính xác.
            </p>
          </header>

          <ProcedureStepper currentStep={currentStep} />

          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
            <div className="card-base rounded-feature p-8 shadow-panel md:p-12 lg:col-span-8">
              <div className="mb-8 border-l-4 border-brand-secondary pl-4">
                <h2 className="text-2xl font-bold text-brand-deep">
                  {sectionTitles[currentStep]}
                </h2>
                <p className="mt-2 text-text-muted">
                  {sectionDescriptions[currentStep]}
                </p>
              </div>

              <form
                className="space-y-10"
                onSubmit={(event) => event.preventDefault()}
              >
                {renderCurrentStep()}

                <div className="flex flex-col justify-between gap-4 border-t border-border-base/60 pt-8 md:flex-row">
                  <div className="flex gap-4">
                    {currentStep > 1 ? (
                      <button
                        type="button"
                        onClick={handleBack}
                        className="btn-outline px-8 py-3"
                      >
                        Quay lại
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="btn-outline px-8 py-3"
                    >
                      Lưu nháp
                    </button>
                  </div>

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="btn-primary px-10 py-3"
                    >
                      Tiếp tục
                      <span className="material-symbols-outlined text-[20px]">
                        arrow_forward
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFinalize}
                      className="btn-primary px-10 py-3"
                    >
                      Hoàn thiện tài liệu
                      <span className="material-symbols-outlined text-[20px]">
                        description
                      </span>
                    </button>
                  )}
                </div>
              </form>
            </div>

            <aside className="space-y-8 lg:sticky lg:top-32 lg:col-span-4">
              <div className="card-soft rounded-feature p-8 shadow-card">
                <h3 className="mb-6 flex items-center gap-2 text-xl font-black text-brand-deep">
                  <span className="material-symbols-outlined text-brand-secondary">
                    description
                  </span>
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
                  <SummaryItem label="Chủ hộ" value={draft.ownerName} />
                  <SummaryItem label="Số định danh" value={draft.nationalId} />
                  <SummaryItem label="Liên hệ" value={formatPhone(draft.phone)} />
                  <SummaryItem
                    label="Hộ kinh doanh"
                    value={draft.businessName || "Chưa cập nhật"}
                  />
                  <SummaryItem
                    label="Ngành nghề chính"
                    value={draft.mainIndustry || "Chưa cập nhật"}
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
                        Bản nháp đã được lưu tạm trong phiên làm việc hiện tại.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-feature bg-gradient-to-br from-brand-secondary to-brand-primary p-6 text-text-inverse shadow-panel">
                <h4 className="text-lg font-bold">Bạn cần hỗ trợ?</h4>
                <p className="mt-2 text-sm leading-relaxed text-text-inverse/85">
                  Trợ lý AI của chúng tôi sẵn sàng giúp bạn điền tờ khai nhanh
                  chóng thông qua giọng nói hoặc video hướng dẫn.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate("/guide")}
                    className="btn-outline border-white/30 bg-white text-brand-secondary hover:bg-white/90"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      smart_display
                    </span>
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

type FieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
};

const Field = ({
  label,
  required = false,
  hint,
  className,
  children,
}: FieldProps) => {
  return (
    <div className={className}>
      <label className="mb-2 block pl-1 text-sm font-semibold text-text-muted">
        {label} {required ? <span className="text-state-error">*</span> : null}
      </label>
      {children}
      {hint ? (
        <p className="mt-2 pl-1 text-xs italic text-text-muted/80">{hint}</p>
      ) : null}
    </div>
  );
};

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
  iconClassName = "text-text-muted",
  filled = false,
}: InputWithIconProps) => {
  return (
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
};

type SummaryItemProps = {
  label: string;
  value: string;
};

const SummaryItem = ({ label, value }: SummaryItemProps) => {
  return (
    <div className="space-y-1">
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-text-muted">
        {label}
      </p>
      <p className="text-base font-semibold text-brand-deep">{value}</p>
    </div>
  );
};
