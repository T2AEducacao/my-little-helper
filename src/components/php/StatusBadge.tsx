import { cn } from "@/lib/utils";
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

interface Props {
  tone: StatusBadgeTone;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ tone, children, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", {
          "bg-status-excellent": tone === "excellent",
          "bg-status-good": tone === "good",
          "bg-status-attention": tone === "attention",
          "bg-status-risk": tone === "risk",
          "bg-status-critical": tone === "critical",
          "bg-status-info": tone === "info",
          "bg-status-neutral": tone === "neutral",
        })}
      />
      {children}
    </span>
  );
}
