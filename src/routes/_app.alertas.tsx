import { EmptyState } from "@/components/php/EmptyState";
import { MetricCard } from "@/components/php/MetricCard";
import { PageHeader } from "@/components/php/PageHeader";
import { SectionCard } from "@/components/php/SectionCard";
import { StatusBadge, type StatusBadgeTone } from "@/components/php/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAlerts, useEmployees, type AlertRow, type EmployeeRow } from "@/lib/php-data";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Info,
  MessageSquare,
  Sparkles,
  Target,
} from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_app/alertas")({
  head: () => ({
    meta: [
      { title: "Ações · People Performance Hub" },
      {
        name: "description",
        content:
          "Centralize prioridades, pendências e próximos passos para a rotina diária de gestão.",
      },
    ],
  }),
  component: ActionsPage,
});

const PRIORITY_META: Record<
  AlertRow["severity"],
  { label: string; order: number; tone: StatusBadgeTone; icon: typeof AlertTriangle }
> = {
  critical: { label: "Crítica", order: 0, tone: "critical", icon: AlertTriangle },
  risk: { label: "Alta", order: 1, tone: "risk", icon: AlertTriangle },
  attention: { label: "Média", order: 2, tone: "attention", icon: CalendarClock },
  info: { label: "Baixa", order: 3, tone: "info", icon: Info },
};

function ActionsPage() {
  const { data: alerts = [], isLoading: loadingAlerts } = useAlerts();
  const { data: employees = [] } = useEmployees();

  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee] as const)),
    [employees],
  );

  const priorityItems = useMemo(
    () =>
      [...alerts].sort((a, b) => {
        const priority = PRIORITY_META[a.severity].order - PRIORITY_META[b.severity].order;
        if (priority !== 0) return priority;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [alerts],
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Ações"
        description="Organize o dia do gestor por urgência, impacto e próximo passo."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <CheckCircle2 className="h-4 w-4" />
              Voltar à visão geral
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Críticas"
          icon={AlertTriangle}
          value="—"
          isEmpty
          emptyMessage="Sem ações críticas carregadas."
          footer="Prioridade máxima para riscos e quedas relevantes."
          className="border-status-critical/30"
        />
        <MetricCard
          label="Para hoje"
          icon={CalendarClock}
          value="—"
          isEmpty
          emptyMessage="Nenhuma ação do dia carregada."
          footer="Pendências que devem orientar a rotina diária."
        />
        <MetricCard
          label="Metas e KPIs"
          icon={Target}
          value="—"
          isEmpty
          emptyMessage="Nenhuma meta em risco carregada."
          footer="Metas em risco e KPIs pendentes aparecerão aqui."
        />
        <MetricCard
          label="Reconhecimentos"
          icon={Sparkles}
          value="—"
          isEmpty
          emptyMessage="Nenhuma sugestão carregada."
          footer="Ações positivas também devem entrar na rotina."
          className="border-status-excellent/30"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <SectionCard
          title="Fila de prioridades"
          description="Prioridades que exigem decisão do gestor, da mais urgente para a menos urgente."
        >
          {loadingAlerts ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
              Carregando prioridades...
            </div>
          ) : priorityItems.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Nenhuma prioridade carregada"
              description="Quando houver alertas, pessoas em atenção ou KPIs pendentes, eles aparecerão nesta fila."
            />
          ) : (
            <div className="divide-y divide-border">
              {priorityItems.map((alert) => (
                <PriorityQueueItem
                  key={alert.id}
                  alert={alert}
                  employee={alert.employee_id ? employeeById.get(alert.employee_id) : undefined}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Próximos passos"
          description="Atalhos para as fontes de contexto do gestor."
          contentClassName="space-y-3"
        >
          <ActionShortcut
            icon={AlertTriangle}
            title="Riscos e quedas"
            description="Sinais que exigem análise rápida."
          />
          <ActionShortcut
            icon={MessageSquare}
            title="Conversas pendentes"
            description="Feedbacks, alinhamentos e 1:1s."
          />
          <ActionShortcut
            icon={Target}
            title="Metas em atenção"
            description="Indicadores que precisam de correção de rota."
          />
        </SectionCard>
      </div>
    </div>
  );
}

function PriorityQueueItem({ alert, employee }: { alert: AlertRow; employee?: EmployeeRow }) {
  const meta = PRIORITY_META[alert.severity];
  const Icon = meta.icon;
  const category = alert.employee_id ? "Colaborador" : "Gestão";
  const responsible =
    employee?.name ?? (alert.employee_id ? "Colaborador não encontrado" : "Gestão");
  const actionLabel = employee ? "Ver colaborador" : "Ver contexto";

  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {category}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatActionDate(alert.created_at)}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-5 text-foreground">{alert.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Responsável: {responsible}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <ActionDetail
              label="Impacto"
              value={alert.explanation ?? "Impacto ainda não informado."}
            />
            <ActionDetail
              label="Ação recomendada"
              value={alert.suggested_action ?? "Analisar contexto e definir próximo passo."}
            />
          </div>
        </div>

        <div className="flex shrink-0 lg:justify-end">
          {employee ? (
            <Button asChild size="sm">
              <Link to="/colaboradores/$id" params={{ id: employee.id }}>
                {actionLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline">
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function ActionDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-foreground/85">{value}</p>
    </div>
  );
}

function ActionShortcut({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function formatActionDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}
