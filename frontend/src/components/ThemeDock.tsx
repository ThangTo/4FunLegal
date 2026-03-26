import { cn } from "../lib/cn";
import { APP_THEMES, AppTheme } from "../theme/themes";

type ThemeDockProps = {
  theme: AppTheme;
  onChange: (theme: AppTheme) => void;
};

export const ThemeDock = ({ theme, onChange }: ThemeDockProps) => {
  return (
    <div className="fixed bottom-4 left-4 z-50 w-[calc(100vw-6rem)] max-w-[18rem] rounded-panel border border-border-base/80 bg-surface-card/90 p-3 shadow-panel backdrop-blur-xl sm:bottom-6 sm:left-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
          <span className="material-symbols-outlined text-[20px]">palette</span>
        </div>
        <div>
          <p className="text-sm font-bold text-text-base">Xem theme</p>
          <p className="text-xs text-text-muted">Preview nền tảng giao diện</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {APP_THEMES.map((option) => {
          const active = option.id === theme;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className={cn(
                "rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition",
                active
                  ? "border-brand-primary bg-brand-primary text-text-inverse shadow-card"
                  : "border-border-base bg-surface-subtle text-text-base hover:border-brand-primary/40 hover:bg-surface-card-alt/60",
              )}
            >
              <span className="block">{option.label}</span>
              <span
                className={cn(
                  "mt-1 block text-[11px] font-medium",
                  active ? "text-text-inverse/80" : "text-text-muted",
                )}
              >
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
