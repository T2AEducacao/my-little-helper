import { cn } from "@/lib/utils";
import type { ScoreStatus } from "./types";

interface Props {
  value: number;
  max?: number;
  tone?: ScoreStatus;
  className?: string;
}

const TONE_FILL: Record<ScoreStatus, string> = {
  excellent: "bg-status-excellent",
  good: "bg-status-good",
  attention: "bg-status-attention",
  risk: "bg-status-risk",
  critical: "bg-status-critical",
  neutral: "bg-status-neutral",
};

export function ProgressBar({ value, max = 100, tone = "neutral", className }: Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all", TONE_FILL[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
