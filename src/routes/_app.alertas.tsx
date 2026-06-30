import { EmptyState } from "@/components/php/EmptyState";
import { FilterBar } from "@/components/php/FilterBar";
import { MetricCard } from "@/components/php/MetricCard";
import { PageHeader } from "@/components/php/PageHeader";
import { SectionCard } from "@/components/php/SectionCard";
import { StatusBadge, type StatusBadgeTone } from "@/components/php/StatusBadge";
import { Button } from "@/components/ui/button";
import { usePerformanceWorkspaceData } from "@/features/performance/workspace-data";
import { useEmployees, type AlertRow, type EmployeeRow } from "@/lib/php-data";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Info,
  MessageSquare,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";

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

const ACTION_VIEW_OPTIONS = [
  { value: "pending", label: "Pendentes" },
  { value: "resolved", label: "Resolvidas" },
] as const;

type ActionView = (typeof ACTION_VIEW_OPTIONS)[number]["value"];

function ActionsPage() {
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();
  const [actionView, setActionView] = useState<ActionView>("pending");
  const performanceData = usePerformanceWorkspaceData(employees);
  const alerts = performanceData.actions;
  const resolvedAlerts = performanceData.resolvedActions;

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
  const resolvedItems = useMemo(
    () =>
      [...resolvedAlerts].sort((a, b) => {
        const priority = PRIORITY_META[a.severity].order - PRIORITY_META[b.severity].order;
        if (priority !== 0) return priority;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [resolvedAlerts],
  );
  const visibleItems = actionView === "pending" ? priorityItems : resolvedItems;
  const isResolvedView = actionView === "resolved";
  const criticalActions = priorityItems.filter((alert) => alert.severity === "critical").length;
  const todayActions = priorityItems.filter((alert) => isToday(alert.created_at)).length;
  const goalActions = priorityItems.filter(
    (alert) => getActionContext(alert).tab === "goals",
  ).length;
  const resolvedActions = resolvedItems.length;

  function handleResolveAction(alert: AlertRow) {
    performanceData.resolveAction(alert.id);
    toast.success("Ação marcada como resolvida", {
      description: "A fila foi atualizada e o item saiu das pendências.",
    });
  }

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
          value={criticalActions}
          isEmpty={criticalActions === 0}
          emptyMessage="Sem ações críticas."
          footer="Prioridade máxima para riscos e quedas relevantes."
          className="border-status-critical/30"
        />
        <MetricCard
          label="Para hoje"
          icon={CalendarClock}
          value={todayActions}
          isEmpty={todayActions === 0}
          emptyMessage="Nenhuma ação do dia."
          footer="Pendências que devem orientar a rotina diária."
        />
        <MetricCard
          label="Metas e KPIs"
          icon={Target}
          value={goalActions}
          isEmpty={goalActions === 0}
          emptyMessage="Nenhuma meta em risco."
          footer="Metas em risco e KPIs pendentes aparecerão aqui."
        />
        <MetricCard
          label="Resolvidas"
          icon={CheckCircle2}
          value={resolvedActions}
          isEmpty={resolvedActions === 0}
          emptyMessage="Nenhuma ação resolvida."
          footer="Itens concluídos saem da fila principal."
          className="border-status-excellent/30"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <SectionCard
          title="Fila de prioridades"
          description="Prioridades que exigem decisão do gestor, da mais urgente para a menos urgente."
          action={
            <FilterBar<ActionView>
              value={actionView}
              onChange={setActionView}
              options={[...ACTION_VIEW_OPTIONS]}
            />
          }
        >
          {loadingEmployees ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
              Carregando prioridades...
            </div>
          ) : visibleItems.length === 0 ? (
            <EmptyState
              icon={isResolvedView ? CheckCircle2 : ClipboardCheck}
              title={isResolvedView ? "Nenhuma ação resolvida" : "Nenhuma prioridade pendente"}
              description={
                isResolvedView
                  ? "Quando o gestor concluir pendências, elas ficarão disponíveis aqui para conferência."
                  : "Quando houver alertas, pessoas em atenção ou KPIs pendentes, eles aparecerão nesta fila."
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {visibleItems.map((alert) => (
                <PriorityQueueItem
                  key={alert.id}
                  alert={alert}
                  employee={alert.employee_id ? employeeById.get(alert.employee_id) : undefined}
                  isResolved={isResolvedView}
                  onResolve={handleResolveAction}
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

function PriorityQueueItem({
  alert,
  employee,
  isResolved,
  onResolve,
}: {
  alert: AlertRow;
  employee?: EmployeeRow;
  isResolved?: boolean;
  onResolve: (alert: AlertRow) => void;
}) {
  const meta = PRIORITY_META[alert.severity];
  const Icon = meta.icon;
  const category = alert.employee_id ? "Colaborador" : "Gestão";
  const responsible =
    employee?.name ?? (alert.employee_id ? "Colaborador não encontrado" : "Gestão");
  const destination = resolveActionDestination(alert, employee);

  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <Link
          to={destination.to}
          params={destination.params}
          search={destination.search}
          className="min-w-0 rounded-xl outline-none transition hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
            {isResolved && <StatusBadge tone="good">Resolvida</StatusBadge>}
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
        </Link>

        <div className="flex shrink-0 lg:justify-end">
          <div className="flex flex-wrap justify-end gap-2">
            {!isResolved && (
              <Button size="sm" onClick={() => onResolve(alert)}>
                <CheckCircle2 className="h-4 w-4" />
                Marcar como resolvida
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to={destination.to} params={destination.params} search={destination.search}>
                {isResolved ? "Ver contexto" : destination.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

type ActionDestination = {
  to: "/colaboradores/$id" | "/metas" | "/avaliacoes" | "/feedbacks" | "/alertas";
  params?: { id: string };
  search?: { tab?: string };
  label: string;
};

function resolveActionDestination(alert: AlertRow, employee?: EmployeeRow): ActionDestination {
  const action = getActionContext(alert);
  if (employee) {
    return {
      to: "/colaboradores/$id",
      params: { id: employee.id },
      search: action.tab ? { tab: action.tab } : undefined,
      label: action.employeeLabel,
    };
  }

  if (action.fallbackRoute) {
    return {
      to: action.fallbackRoute,
      label: action.fallbackLabel,
    };
  }

  return {
    to: "/alertas",
    label: "Ver contexto",
  };
}

function getActionContext(alert: AlertRow) {
  return getActionIntent(getActionText(alert));
}

function getActionText(alert: AlertRow): string {
  return normalizeActionText(
    [alert.title, alert.explanation, alert.suggested_action].filter(Boolean).join(" "),
  );
}

function getActionIntent(text: string): {
  tab?: string;
  employeeLabel: string;
  fallbackRoute?: "/metas" | "/avaliacoes" | "/feedbacks";
  fallbackLabel: string;
} {
  if (includesAny(text, ["feedback", "conversa", "alinhamento", "reconhecimento", "elogio"])) {
    return {
      tab: "feedbacks",
      employeeLabel: "Registrar feedback",
      fallbackRoute: "/feedbacks",
      fallbackLabel: "Ver feedbacks",
    };
  }
  if (includesAny(text, ["avaliacao", "avaliacoes", "score", "ciclo"])) {
    return {
      tab: "reviews",
      employeeLabel: "Abrir avaliação",
      fallbackRoute: "/avaliacoes",
      fallbackLabel: "Ver avaliações",
    };
  }
  if (includesAny(text, ["meta", "metas", "kpi", "indicador", "indicadores"])) {
    return {
      tab: "goals",
      employeeLabel: "Ver metas",
      fallbackRoute: "/metas",
      fallbackLabel: "Ver metas",
    };
  }
  if (includesAny(text, ["desenvolvimento", "pdi", "plano"])) {
    return {
      tab: "development",
      employeeLabel: "Ver desenvolvimento",
      fallbackLabel: "Ver contexto",
    };
  }
  if (includesAny(text, ["1:1", "reuniao", "reunioes", "one on one"])) {
    return {
      tab: "oneonone",
      employeeLabel: "Agendar 1:1",
      fallbackLabel: "Ver contexto",
    };
  }

  return {
    employeeLabel: "Ver colaborador",
    fallbackLabel: "Ver contexto",
  };
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function normalizeActionText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

function isToday(value: string): boolean {
  const date = new Date(value);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}
