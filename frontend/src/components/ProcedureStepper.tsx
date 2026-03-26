import { ProcedureStep, procedureSteps } from "../features/procedure/procedureDraft";

type ProcedureStepperProps = {
  currentStep: ProcedureStep;
};

export const ProcedureStepper = ({ currentStep }: ProcedureStepperProps) => {
  return (
    <section className="mb-14">
      <div className="-mx-2 overflow-x-auto px-2 pb-2">
        <div className="relative flex min-w-[760px] items-start justify-between gap-3 md:min-w-full">
          <div className="absolute left-6 right-6 top-6 h-1 -translate-y-1/2 rounded-full bg-surface-hero" />
          {procedureSteps.map((step) => {
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;

            return (
              <div
                key={step.id}
                className="relative z-10 flex min-w-[112px] flex-1 flex-col items-center gap-3 text-center"
              >
                <div
                  className={
                    isActive
                      ? "flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary font-bold text-text-inverse shadow-panel ring-4 ring-surface-card"
                      : isDone
                        ? "flex h-12 w-12 items-center justify-center rounded-full bg-brand-secondary font-bold text-text-inverse shadow-card"
                        : "flex h-12 w-12 items-center justify-center rounded-full bg-surface-hero font-bold text-text-muted"
                  }
                >
                  {isDone ? (
                    <span className="material-symbols-outlined text-[20px]">check</span>
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={
                    isActive || isDone
                      ? "text-xs font-bold text-brand-deep md:text-sm"
                      : "text-xs font-medium text-text-muted md:text-sm"
                  }
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
