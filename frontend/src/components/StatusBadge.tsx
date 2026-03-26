import { PropsWithChildren } from "react";

import { cn } from "../lib/cn";

type StatusTone = "success" | "warning" | "error" | "info";

const toneClasses: Record<StatusTone, string> = {
  success: "badge-status-success",
  warning: "badge-status-warning",
  error: "badge-status-error",
  info: "badge-status-info",
};

type StatusBadgeProps = PropsWithChildren<{
  tone?: StatusTone;
  className?: string;
}>;

export const StatusBadge = ({
  tone = "info",
  className,
  children,
}: StatusBadgeProps) => {
  return (
    <span className={cn("badge-base", toneClasses[tone], className)}>
      {children}
    </span>
  );
};
