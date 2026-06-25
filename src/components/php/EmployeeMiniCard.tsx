import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { StatusBadge } from "./StatusBadge";
import { scoreLabel, scoreToStatus } from "./types";

interface Props {
  name: string;
  role?: string | null;
  department?: string | null;
  avatarUrl?: string | null;
  score: number | null | undefined;
  highlight?: string;
  reason?: string;
  suggestedAction?: string;
  delta?: number | null;
  actionLabel?: string;
  onOpen?: () => void;
  className?: string;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

export function EmployeeMiniCard({
  name,
  role,
  department,
  avatarUrl,
  score,
  highlight,
  reason,
  suggestedAction,
  delta,
  actionLabel = "Ver perfil",
  onOpen,
  className,
}: Props) {
  const status = scoreToStatus(score);
  const hasScore = score !== null && score !== undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback className="bg-primary/10 text-primary">{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">{name}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {[role, department].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        {hasScore && <StatusBadge tone={status}>{scoreLabel(status)}</StatusBadge>}
      </div>

      {hasScore && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {Math.round(score!)}
            </span>
            {delta !== undefined && delta !== null && (
              <span
                className={cn("inline-flex items-center gap-0.5 text-xs font-medium", {
                  "text-status-excellent": delta > 0,
                  "text-status-critical": delta < 0,
                  "text-muted-foreground": delta === 0,
                })}
              >
                {delta > 0 && <ArrowUpRight className="h-3 w-3" />}
                {delta < 0 && <ArrowDownRight className="h-3 w-3" />}
                {delta === 0 && <Minus className="h-3 w-3" />}
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)} pts
              </span>
            )}
          </div>
          <ProgressBar value={score!} tone={status} />
        </div>
      )}

      {highlight && (
        <p className="rounded-lg bg-status-excellent-soft/60 px-3 py-2 text-xs text-foreground/80">
          <span className="font-medium">Destaque:</span> {highlight}
        </p>
      )}
      {reason && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Motivo:</span> {reason}
        </p>
      )}
      {suggestedAction && (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Ação sugerida:</span> {suggestedAction}
        </p>
      )}

      {onOpen && (
        <Button size="sm" variant="outline" onClick={onOpen} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
