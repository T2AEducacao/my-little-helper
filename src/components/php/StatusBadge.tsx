import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ScoreStatus } from "./types";

type Severity = "info" | "attention" | "risk" | "critical";
export type StatusBadgeTone = ScoreStatus | Severity;

const TONE_CLASSES: Record<StatusBadgeTone, string> = {
  excellent: "bg-status-excellent-soft text-status-excellent",
  good: "bg-status-good-soft text-status-good",
  attention: "bg-status-attention-soft text-status-attention-foreground",
  risk: "bg-status-risk-soft text-status-risk",
  critical: "bg-status-critical-soft text-status-critical",
  info: "bg-status-info-soft text-status-info",
  neutral: "bg-status-neutral-soft text-muted-foreground",
};

const DOT_CLASSES: Record<StatusBadgeTone, string> = {
  excellent: "bg-status-excellent",
  good: "bg-status-good",
  attention: "bg-status-attention",
  risk: "bg-status-risk",
  critical: "bg-status-critical",
  info: "bg-status-info",
  neutral: "bg-status-neutral",
};

interface Props {
  tone: StatusBadgeTone;
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function StatusBadge({ tone, children, icon: Icon, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium leading-none",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {Icon ? (
        <Icon className="h-3 w-3" />
      ) : (
        <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[tone])} />
      )}
      {children}
    </span>
  );
}
