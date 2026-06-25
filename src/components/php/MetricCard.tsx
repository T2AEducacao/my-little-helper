import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

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
}

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
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      {isEmpty ? (
        <p className="text-sm text-muted-foreground">{emptyMessage ?? "Sem dados ainda."}</p>
      ) : (
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-semibold tracking-tight text-foreground">{value}</div>
          {hint && <div className="text-sm text-muted-foreground">{hint}</div>}
        </div>
      )}

      {!isEmpty && trend && (
        <div
          className={cn(
            "inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium",
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

      {footer && <div className="pt-1 text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}
