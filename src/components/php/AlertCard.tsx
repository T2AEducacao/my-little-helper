import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export type AlertSeverity = "info" | "attention" | "risk" | "critical";

const SEVERITY_META: Record<
  AlertSeverity,
  { label: string; icon: typeof Info; tone: "info" | "attention" | "risk" | "critical" }
> = {
  info: { label: "Informação", icon: Info, tone: "info" },
  attention: { label: "Atenção", icon: AlertTriangle, tone: "attention" },
  risk: { label: "Risco", icon: AlertTriangle, tone: "risk" },
  critical: { label: "Crítico", icon: AlertOctagon, tone: "critical" },
};

interface Props {
  title: string;
  severity: AlertSeverity;
  explanation?: string | null;
  suggestedAction?: string | null;
  employeeName?: string | null;
  onView?: () => void;
  onResolve?: () => void;
  onIgnore?: () => void;
  className?: string;
}

export function AlertCard({
  title,
  severity,
  explanation,
  suggestedAction,
  employeeName,
  onView,
  onResolve,
  onIgnore,
  className,
}: Props) {
  const meta = SEVERITY_META[severity];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", {
            "bg-status-info-soft text-status-info": severity === "info",
            "bg-status-attention-soft text-status-attention-foreground": severity === "attention",
            "bg-status-risk-soft text-status-risk": severity === "risk",
            "bg-status-critical-soft text-status-critical": severity === "critical",
          })}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          </div>
          {employeeName && (
            <p className="mt-0.5 text-xs text-muted-foreground">Colaborador: {employeeName}</p>
          )}
        </div>
      </div>

      {explanation && <p className="text-sm text-foreground/80">{explanation}</p>}
      {suggestedAction && (
        <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Ação sugerida:</span> {suggestedAction}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {onView && (
          <Button size="sm" variant="default" onClick={onView}>
            Ver detalhes
          </Button>
        )}
        {onResolve && (
          <Button size="sm" variant="outline" onClick={onResolve}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Marcar como resolvido
          </Button>
        )}
        {onIgnore && (
          <Button size="sm" variant="ghost" onClick={onIgnore}>
            <X className="h-3.5 w-3.5" />
            Ignorar
          </Button>
        )}
      </div>
    </div>
  );
}
