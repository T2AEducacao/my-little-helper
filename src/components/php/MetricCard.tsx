import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export type MetricCardSize = "hero" | "default" | "compact";

interface Props {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  trend?: { direction: "up" | "down" | "flat"; label: string; positive?: boolean };
  footer?: React.ReactNode;
  className?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
  size?: MetricCardSize;
}

const SIZE_CLASSES: Record<MetricCardSize, { wrap: string; value: string; label: string; pad: string }> = {
  hero: {
    wrap: "gap-3",
    value: "text-4xl font-semibold tracking-tight",
    label: "text-sm font-medium",
    pad: "p-5",
  },
  default: {
    wrap: "gap-2",
    value: "text-2xl font-semibold tracking-tight",
    label: "text-xs font-medium uppercase tracking-wide",
    pad: "p-4",
  },
  compact: {
    wrap: "gap-1",
    value: "text-lg font-semibold tracking-tight",
    label: "text-[11px] font-medium uppercase tracking-wide",
    pad: "p-3",
  },
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  footer,
  className,
  emptyMessage,
  isEmpty,
  size = "default",
}: Props) {
  const sz = SIZE_CLASSES[size];
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]",
        sz.wrap,
        sz.pad,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-muted-foreground", sz.label)}>{label}</p>
        {Icon && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      {isEmpty ? (
        <p className="text-sm text-muted-foreground">{emptyMessage ?? "Sem dados ainda."}</p>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <div className={cn("tabular-nums text-foreground", sz.value)}>{value}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      )}

      {!isEmpty && trend && (
        <div
          className={cn(
            "inline-flex w-fit items-center gap-1 text-xs font-medium",
            trend.direction === "flat"
              ? "text-muted-foreground"
              : (trend.positive ?? trend.direction === "up")
                ? "text-status-excellent"
                : "text-status-critical",
          )}
        >
          {trend.direction === "up" && <ArrowUpRight className="h-3 w-3" />}
          {trend.direction === "down" && <ArrowDownRight className="h-3 w-3" />}
          {trend.direction === "flat" && <Minus className="h-3 w-3" />}
          {trend.label}
        </div>
      )}

      {footer && size !== "compact" && (
        <div className="mt-auto pt-1 text-xs text-muted-foreground">{footer}</div>
      )}
    </div>
  );
}
