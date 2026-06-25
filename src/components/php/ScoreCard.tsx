import { cn } from "@/lib/utils";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";
import { scoreLabel, scoreToStatus } from "./types";

interface Props {
  score: number | null | undefined;
  label?: string;
  description?: string;
  emptyMessage?: string;
  className?: string;
}

export function ScoreCard({
  score,
  label = "Score médio da equipe",
  description,
  emptyMessage = "Ainda não há avaliações suficientes para calcular o score médio.",
  className,
}: Props) {
  const status = scoreToStatus(score);
  const hasScore = score !== null && score !== undefined && !Number.isNaN(score);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {hasScore && <StatusBadge tone={status}>{scoreLabel(status)}</StatusBadge>}
      </div>

      {hasScore ? (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold tracking-tight text-foreground">
              {Math.round(score!)}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <ProgressBar value={score!} tone={status} />
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  );
}
