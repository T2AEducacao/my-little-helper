import { EmptyState } from "@/components/php/EmptyState";
import { FilterBar } from "@/components/php/FilterBar";
import { MetricCard } from "@/components/php/MetricCard";
import { PageHeader } from "@/components/php/PageHeader";
import { SectionCard } from "@/components/php/SectionCard";
import { StatusBadge, type StatusBadgeTone } from "@/components/php/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  usePerformanceWorkspaceData,
  type PerformanceEmployee,
} from "@/features/performance/workspace-data";
import { initials, useEmployees, type AlertRow } from "@/lib/php-data";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Info,
  MessageSquare,
  Target,
  Users,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export const Route = createFileRoute("/_app/alertas")({
  head: () => ({
    meta: [
      { title: "Ações · Performativo" },
      {
        name: "description",
        content:
          "Backlog de ações priorizadas por urgência, responsável e prazo para a rotina de gestão.",
      },
    ],
  }),
  component: ActionsPage,
});

type Severity = AlertRow["severity"];

const PRIORITY_META: Record<
  Severity,
  {
    label: string;
    short: string;
    order: number;
    tone: StatusBadgeTone;
    slaDays: number;
    bar: string;
  }
> = {
  critical: {
    label: "Crítica",
    short: "P1",
    order: 0,
    tone: "critical",
    slaDays: 1,
    bar: "bg-status-critical",
  },
  risk: { label: "Alta", short: "P2", order: 1, tone: "risk", slaDays: 3, bar: "bg-status-risk" },
  attention: {
    label: "Média",
    short: "P3",
    order: 2,
    tone: "attention",
    slaDays: 7,
    bar: "bg-status-attention",
  },
  info: { label: "Baixa", short: "P4", order: 3, tone: "info", slaDays: 14, bar: "bg-status-info" },
};

const ACTION_VIEW_OPTIONS = [
  { value: "pending", label: "Pendentes" },
  { value: "resolved", label: "Resolvidas" },
] as const;

type ActionView = (typeof ACTION_VIEW_OPTIONS)[number]["value"];

type PriorityFilter = "all" | Severity;
const PRIORITY_FILTERS: { value: PriorityFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "critical", label: "Crítica" },
  { value: "risk", label: "Alta" },
  { value: "attention", label: "Média" },
  { value: "info", label: "Baixa" },
];

type CategoryKey =
  | "all"
  | "goals"
  | "reviews"
  | "feedbacks"
  | "oneonone"
  | "development"
  | "general";
const CATEGORY_FILTERS: { value: CategoryKey; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "goals", label: "Metas" },
  { value: "feedbacks", label: "Feedback" },
  { value: "reviews", label: "Avaliação" },
  { value: "oneonone", label: "1:1" },
  { value: "development", label: "Desenvolvimento" },
  { value: "general", label: "Geral" },
];

const CATEGORY_LABEL: Record<Exclude<CategoryKey, "all">, string> = {
  goals: "Metas",
  feedbacks: "Feedback",
  reviews: "Avaliação",
  oneonone: "1:1",
  development: "Desenvolvimento",
  general: "Geral",
};

type Bucket = "overdue" | "today" | "week" | "later";
const BUCKET_META: Record<Bucket, { title: string; description: string; tone: StatusBadgeTone }> = {
  overdue: {
    title: "Atrasadas",
    description: "Passaram do prazo previsto pelo nível de urgência.",
    tone: "critical",
  },
  today: { title: "Para hoje", description: "Vencem nas próximas 24 horas.", tone: "risk" },
  week: { title: "Esta semana", description: "Dentro dos próximos 7 dias.", tone: "attention" },
  later: { title: "Mais tarde", description: "Sem urgência imediata.", tone: "info" },
};
const BUCKET_ORDER: Bucket[] = ["overdue", "today", "week", "later"];

function ActionsPage() {
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();
  const [actionView, setActionView] = useState<ActionView>("pending");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey>("all");
  const performanceData = usePerformanceWorkspaceData(employees);
  const performanceEmployees = performanceData.employees;
  const pending = performanceData.actions;
  const resolved = performanceData.resolvedActions;

  const employeeById = useMemo(
    () => new Map(performanceEmployees.map((employee) => [employee.id, employee] as const)),
    [performanceEmployees],
  );

  const decorate = useCallback(
    (alert: AlertRow): DecoratedAction => {
      const employee = alert.employee_id ? employeeById.get(alert.employee_id) : undefined;
      const meta = PRIORITY_META[alert.severity];
      const due = new Date(new Date(alert.created_at).getTime() + meta.slaDays * 86_400_000);
      const ctx = getActionContext(alert);
      const category: Exclude<CategoryKey, "all"> =
        (ctx.tab as Exclude<CategoryKey, "all"> | undefined) ?? "general";
      return { alert, employee, meta, due, category, ctx };
    },
    [employeeById],
  );

  const pendingDecorated = useMemo(() => pending.map(decorate), [pending, decorate]);
  const resolvedDecorated = useMemo(() => resolved.map(decorate), [resolved, decorate]);

  const now = Date.now();
  const overdueCount = pendingDecorated.filter((a) => a.due.getTime() < now).length;
  const todayCount = pendingDecorated.filter((a) => bucketOf(a.due, now) === "today").length;
  const weekCount = pendingDecorated.filter((a) => {
    const b = bucketOf(a.due, now);
    return b === "today" || b === "week";
  }).length;
  const resolvedCount = resolvedDecorated.length;

  const source = actionView === "pending" ? pendingDecorated : resolvedDecorated;
  const filtered = source.filter((a) => {
    if (priorityFilter !== "all" && a.alert.severity !== priorityFilter) return false;
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
    return true;
  });

  const grouped = useMemo(() => {
    const byBucket = new Map<Bucket, DecoratedAction[]>();
    for (const item of filtered) {
      const b = actionView === "resolved" ? "later" : bucketOf(item.due, now);
      const arr = byBucket.get(b) ?? [];
      arr.push(item);
      byBucket.set(b, arr);
    }
    for (const arr of byBucket.values()) {
      arr.sort((a, b) => {
        const p = a.meta.order - b.meta.order;
        if (p !== 0) return p;
        return a.due.getTime() - b.due.getTime();
      });
    }
    return byBucket;
  }, [filtered, actionView, now]);

  const isResolvedView = actionView === "resolved";

  function handleResolveAction(alert: AlertRow) {
    performanceData.resolveAction(alert.id);
    toast.success("Ação marcada como resolvida", {
      description: "A fila foi atualizada e o item saiu das pendências.",
    });
  }

  const hasAny = filtered.length > 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Ações"
        description="Backlog priorizado por urgência, responsável e prazo."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <CheckCircle2 className="h-4 w-4" />
              Voltar à visão geral
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          label="Atrasadas"
          icon={AlertTriangle}
          value={overdueCount}
          isEmpty={overdueCount === 0}
          emptyMessage="Nenhuma pendência fora do prazo."
          footer="Itens cujo SLA por prioridade já foi ultrapassado."
          className={cn(overdueCount > 0 && "border-status-critical/30")}
        />
        <MetricCard
          label="Para hoje"
          icon={Clock}
          value={todayCount}
          isEmpty={todayCount === 0}
          emptyMessage="Nenhuma ação vence hoje."
          footer="Ações com prazo nas próximas 24 horas."
        />
        <MetricCard
          label="Esta semana"
          icon={CalendarClock}
          value={weekCount}
          isEmpty={weekCount === 0}
          emptyMessage="Nada para esta semana."
          footer="Inclui hoje e próximos 7 dias."
        />
        <MetricCard
          label="Resolvidas"
          icon={CheckCircle2}
          value={resolvedCount}
          isEmpty={resolvedCount === 0}
          emptyMessage="Nenhuma ação resolvida."
          footer="Itens concluídos saem da fila principal."
          className={cn(resolvedCount > 0 && "border-status-excellent/30")}
        />
      </div>

      <SectionCard
        title="Backlog de ações"
        description="Priorizado por urgência e prazo, agrupado por janela de execução."
        action={
          <FilterBar<ActionView>
            value={actionView}
            onChange={setActionView}
            options={[...ACTION_VIEW_OPTIONS]}
          />
        }
      >
        <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4">
          <FilterChips
            label="Prioridade"
            value={priorityFilter}
            options={PRIORITY_FILTERS}
            onChange={setPriorityFilter}
          />
          <FilterChips
            label="Categoria"
            value={categoryFilter}
            options={CATEGORY_FILTERS}
            onChange={setCategoryFilter}
          />
        </div>

        {loadingEmployees ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            Carregando backlog...
          </div>
        ) : !hasAny ? (
          <EmptyState
            icon={isResolvedView ? CheckCircle2 : ClipboardCheck}
            title={isResolvedView ? "Nenhuma ação resolvida" : "Backlog limpo"}
            description={
              isResolvedView
                ? "Itens concluídos aparecerão aqui para conferência."
                : "Quando houver alertas, pessoas em atenção ou KPIs pendentes, eles entrarão neste backlog."
            }
          />
        ) : (
          <div className="flex flex-col gap-6">
            {BUCKET_ORDER.map((bucket) => {
              const items = grouped.get(bucket);
              if (!items || items.length === 0) return null;
              const meta = BUCKET_META[bucket];
              return (
                <div key={bucket} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={meta.tone}>{meta.title}</StatusBadge>
                      <span className="text-xs text-muted-foreground">{meta.description}</span>
                    </div>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {items.map((item) => (
                      <BacklogRow
                        key={item.alert.id}
                        item={item}
                        isResolved={isResolvedView}
                        onResolve={handleResolveAction}
                        now={now}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

type DecoratedAction = {
  alert: AlertRow;
  employee?: PerformanceEmployee;
  meta: (typeof PRIORITY_META)[Severity];
  due: Date;
  category: Exclude<CategoryKey, "all">;
  ctx: ReturnType<typeof getActionContext>;
};

function BacklogRow({
  item,
  isResolved,
  onResolve,
  now,
}: {
  item: DecoratedAction;
  isResolved: boolean;
  onResolve: (a: AlertRow) => void;
  now: number;
}) {
  const { alert, employee, meta, due, category, ctx } = item;
  const destination = resolveActionDestination(alert, employee, ctx);
  const overdue = !isResolved && due.getTime() < now;
  const dueLabel = formatRelativeDue(due, now, isResolved);
  const ownerName = employee?.name ?? (alert.employee_id ? "Colaborador" : "Gestão");

  return (
    <li className="group relative flex items-stretch">
      <span aria-hidden className={cn("w-1 shrink-0", meta.bar, isResolved && "opacity-30")} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
        <Link
          to={destination.to}
          params={destination.params}
          search={destination.search}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span
            className={cn(
              "inline-flex h-6 shrink-0 items-center rounded-md border px-1.5 text-[11px] font-semibold tabular-nums",
              priorityChipStyles(alert.severity),
            )}
            title={meta.label}
          >
            {meta.short}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{alert.title}</p>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {alert.explanation ?? alert.suggested_action ?? "Sem contexto adicional."}
            </p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground md:inline-flex">
            {CATEGORY_LABEL[category]}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="h-7 w-7">
              {employee?.avatar_url ? (
                <AvatarImage src={employee.avatar_url} alt={ownerName} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">
                {employee ? initials(ownerName) : <Users className="h-3.5 w-3.5" />}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 flex-col leading-tight md:flex">
              <span className="truncate text-xs font-medium text-foreground">{ownerName}</span>
              {employee?.role && (
                <span className="truncate text-[11px] text-muted-foreground">{employee.role}</span>
              )}
            </div>
          </div>

          <div
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium tabular-nums",
              overdue
                ? "bg-status-critical/10 text-status-critical"
                : "bg-muted text-muted-foreground",
            )}
            title={`Prazo: ${formatAbsolute(due)}`}
          >
            <Clock className="h-3 w-3" />
            {dueLabel}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {!isResolved && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                onClick={() => onResolve(alert)}
                title="Marcar como resolvida"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="sr-only">Resolver</span>
              </Button>
            )}
            <Button asChild size="sm" variant="ghost" className="h-8 px-2">
              <Link to={destination.to} params={destination.params} search={destination.search}>
                <ArrowRight className="h-4 w-4" />
                <span className="sr-only">{destination.label}</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

function FilterChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "h-7 rounded-full border px-2.5 text-xs font-medium transition",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function priorityChipStyles(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "border-status-critical/30 bg-status-critical/10 text-status-critical";
    case "risk":
      return "border-status-risk/30 bg-status-risk/10 text-status-risk";
    case "attention":
      return "border-status-attention/30 bg-status-attention/10 text-status-attention";
    case "info":
    default:
      return "border-status-info/30 bg-status-info/10 text-status-info";
  }
}

function bucketOf(due: Date, now: number): Bucket {
  const diffMs = due.getTime() - now;
  if (diffMs < 0) return "overdue";
  const day = 86_400_000;
  if (diffMs <= day) return "today";
  if (diffMs <= 7 * day) return "week";
  return "later";
}

function formatRelativeDue(due: Date, now: number, isResolved: boolean): string {
  if (isResolved) return formatAbsolute(due);
  const diffMs = due.getTime() - now;
  const day = 86_400_000;
  const days = Math.round(diffMs / day);
  if (diffMs < 0) {
    const overdueDays = Math.max(1, Math.ceil(-diffMs / day));
    return overdueDays === 1 ? "Atrasada 1d" : `Atrasada ${overdueDays}d`;
  }
  if (Math.abs(diffMs) < day) {
    const hours = Math.max(1, Math.round(diffMs / 3_600_000));
    return `em ${hours}h`;
  }
  if (days === 1) return "em 1 dia";
  if (days <= 14) return `em ${days} dias`;
  return formatAbsolute(due);
}

function formatAbsolute(due: Date): string {
  try {
    return due.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return due.toISOString().slice(0, 10);
  }
}

type ActionDestination = {
  to: "/colaboradores/$id" | "/metas" | "/avaliacoes" | "/feedbacks" | "/alertas";
  params?: { id: string };
  search?: { tab?: string };
  label: string;
};

function resolveActionDestination(
  alert: AlertRow,
  employee: PerformanceEmployee | undefined,
  action: ReturnType<typeof getActionContext>,
): ActionDestination {
  if (employee) {
    return {
      to: "/colaboradores/$id",
      params: { id: employee.id },
      search: action.tab ? { tab: action.tab } : undefined,
      label: action.employeeLabel,
    };
  }
  if (action.fallbackRoute) {
    return { to: action.fallbackRoute, label: action.fallbackLabel };
  }
  return { to: "/alertas", label: "Ver contexto" };
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
    return { tab: "oneonone", employeeLabel: "Agendar 1:1", fallbackLabel: "Ver contexto" };
  }
  return { employeeLabel: "Ver colaborador", fallbackLabel: "Ver contexto" };
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

// silence unused import warnings for icons referenced only in side imports
void Info;
void MessageSquare;
void Target;
