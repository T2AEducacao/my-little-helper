import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ListChecks,
  Plus,
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/php/EmptyState";
import { PageHeader } from "@/components/php/PageHeader";
import { SectionCard } from "@/components/php/SectionCard";
import { StatusBadge, type StatusBadgeTone } from "@/components/php/StatusBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePerformanceWorkspaceData,
  type PerformanceEmployee,
  type PerformanceGoal,
  type PerformanceGoalStatus,
} from "@/features/performance/workspace-data";
import { useEmployees, type EmployeeRow } from "@/lib/php-data";
import type { ScoreStatus } from "@/components/php/types";
import { CreateGoalDialog } from "@/components/php/CreateGoalDialog";
import { useGoals, useCreateGoal, useCompleteGoal, type GoalRow } from "@/lib/goals-data";

export const Route = createFileRoute("/_app/metas")({
  head: () => ({
    meta: [
      { title: "Metas · Performativo" },
      {
        name: "description",
        content: "Leia em segundos o que está em risco, perto do prazo, no caminho e concluído.",
      },
    ],
  }),
  component: GoalsPage,
});

type GroupKey = "risk" | "due_soon" | "on_track" | "achieved";
type DbGoalFilter = "all" | "pending" | "completed" | "overdue";

const GROUP_META: Record<
  GroupKey,
  { label: string; tone: ScoreStatus; description: string; defaultOpen: boolean }
> = {
  risk: {
    label: "Em risco",
    tone: "risk",
    description: "Prazo estourado ou status exigindo ação do gestor.",
    defaultOpen: true,
  },
  due_soon: {
    label: "Próximas do prazo",
    tone: "attention",
    description: "Vencem nos próximos 7 dias e ainda não concluídas.",
    defaultOpen: true,
  },
  on_track: {
    label: "No prazo",
    tone: "good",
    description: "Evolução saudável, sem necessidade de intervenção.",
    defaultOpen: false,
  },
  achieved: {
    label: "Concluídas",
    tone: "excellent",
    description: "Metas atingidas no ciclo.",
    defaultOpen: false,
  },
};

const STATUS_TONE: Record<PerformanceGoalStatus, StatusBadgeTone> = {
  risk: "risk",
  on_track: "good",
  achieved: "excellent",
};

const STATUS_LABEL: Record<PerformanceGoalStatus, string> = {
  risk: "Em risco",
  on_track: "No prazo",
  achieved: "Atingida",
};

function GoalsPage() {
  const { data: employees = [], isLoading } = useEmployees();
  const performanceData = usePerformanceWorkspaceData(employees);
  const performanceEmployees = performanceData.employees;
  const goals = performanceData.goals;
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: dbGoals = [] } = useGoals();
  const createGoalMut = useCreateGoal();
  const completeGoalMut = useCompleteGoal();
  const employeesById = useMemo(
    () => new Map(employees.map((e) => [e.id, e] as const)),
    [employees],
  );
  const [openGroups, setOpenGroups] = useState<Record<GroupKey, boolean>>({
    risk: true,
    due_soon: true,
    on_track: false,
    achieved: false,
  });

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ id: e.id, name: e.name })),
    [employees],
  );

  const employeeById = useMemo(
    () => new Map(performanceEmployees.map((e) => [e.id, e] as const)),
    [performanceEmployees],
  );

  const ownerOptions = useMemo(() => {
    const ids = new Set(goals.map((g) => g.employee_id));
    return performanceEmployees.filter((e) => ids.has(e.id));
  }, [goals, performanceEmployees]);

  const filteredGoals = useMemo(
    () => (ownerFilter === "all" ? goals : goals.filter((g) => g.employee_id === ownerFilter)),
    [goals, ownerFilter],
  );

  const grouped = useMemo(() => groupGoals(filteredGoals), [filteredGoals]);

  const riskCount = grouped.risk.length;
  const dueSoonCount = grouped.due_soon.length;
  const onTrackCount = grouped.on_track.length;
  const achievedCount = grouped.achieved.length;

  const toggleGroup = (key: GroupKey) => setOpenGroups((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        title="Metas"
        description="Veja em segundos o que precisa de atenção e o que está caminhando bem."
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:w-auto">
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link to="/alertas">
                <ListChecks className="h-4 w-4" />
                Ver ações
              </Link>
            </Button>
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Criar Meta
            </Button>
          </div>
        }
      />

      <CreateGoalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employees={employeeOptions}
        onCreate={(input) =>
          createGoalMut.mutate({
            name: input.nome,
            employee_id: input.funcionario_id,
            deadline: input.prazo,
          })
        }
      />

      <DbGoalsSection
        goals={dbGoals}
        employeesById={employeesById}
        onComplete={(id) => completeGoalMut.mutate(id)}
      />

      {/* Hero KPIs */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <KpiCell
            label="Em risco"
            value={riskCount}
            icon={AlertTriangle}
            tone="risk"
            hint={riskCount === 0 ? "Nada crítico agora" : "Exige ação esta semana"}
            emphasis
          />
          <KpiCell
            label="Próximas do prazo"
            value={dueSoonCount}
            icon={CalendarClock}
            tone="attention"
            hint="Vencem em até 7 dias"
          />
          <KpiCell
            label="No prazo"
            value={onTrackCount}
            icon={TrendingUp}
            tone="good"
            hint="Evolução saudável"
          />
          <KpiCell
            label="Concluídas"
            value={achievedCount}
            icon={CheckCircle2}
            tone="excellent"
            hint="Reconhecimento sugerido"
          />
        </div>
        <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 sm:px-5 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-4 w-4 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">Metas no recorte atual</div>
            <div className="text-base font-semibold tabular-nums text-foreground">
              {filteredGoals.length}
            </div>
            <div className="hidden text-xs text-muted-foreground sm:block">
              leitura baseada em prazo e status
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-xs text-muted-foreground">Responsável</span>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="h-8 w-full text-xs sm:w-[200px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {ownerOptions.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <SectionCard title="Metas em acompanhamento">
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            Carregando metas...
          </div>
        </SectionCard>
      ) : filteredGoals.length === 0 ? (
        <SectionCard title="Metas em acompanhamento">
          <EmptyState
            icon={Target}
            title="Nenhuma meta para exibir"
            description="Cadastre colaboradores reais para visualizar metas vinculadas à equipe."
          />
        </SectionCard>
      ) : (
        <div className="flex flex-col gap-4">
          {(Object.keys(GROUP_META) as GroupKey[]).map((key) => {
            const meta = GROUP_META[key];
            const items = grouped[key];
            if (items.length === 0) return null;
            const isOpen = openGroups[key];
            return (
              <GoalGroup
                key={key}
                groupKey={key}
                label={meta.label}
                description={meta.description}
                tone={meta.tone}
                count={items.length}
                isOpen={isOpen}
                onToggle={() => toggleGroup(key)}
              >
                <div className="divide-y divide-border">
                  {items.map((goal) => (
                    <GoalRow
                      key={goal.id}
                      goal={goal}
                      employee={employeeById.get(goal.employee_id)}
                      groupKey={key}
                    />
                  ))}
                </div>
              </GoalGroup>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiCell({
  label,
  value,
  icon: Icon,
  tone,
  hint,
  emphasis,
}: {
  label: string;
  value: number;
  icon: typeof Target;
  tone: ScoreStatus;
  hint: string;
  emphasis?: boolean;
}) {
  const toneBg: Record<ScoreStatus, string> = {
    excellent: "bg-status-excellent-soft text-status-excellent",
    good: "bg-status-good-soft text-status-good",
    attention: "bg-status-attention-soft text-status-attention-foreground",
    risk: "bg-status-risk-soft text-status-risk",
    critical: "bg-status-critical-soft text-status-critical",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <div
      className={cn(
        "flex items-start gap-3 border-border p-4 odd:border-r first:border-b second:border-b sm:p-5 lg:[&:not(:last-child)]:border-r lg:first:border-b-0 lg:second:border-b-0",
        emphasis && value > 0 && "bg-status-risk/5",
      )}
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", toneBg[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}

function GoalGroup({
  groupKey,
  label,
  description,
  tone,
  count,
  isOpen,
  onToggle,
  children,
}: {
  groupKey: GroupKey;
  label: string;
  description: string;
  tone: ScoreStatus;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const dot: Record<ScoreStatus, string> = {
    excellent: "bg-status-excellent",
    good: "bg-status-good",
    attention: "bg-status-attention",
    risk: "bg-status-risk",
    critical: "bg-status-critical",
    neutral: "bg-status-neutral",
  };
  const emphasized = groupKey === "risk" || groupKey === "due_soon";
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]",
        emphasized ? "border-border" : "border-border/70",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-muted/30"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", dot[tone])} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{label}</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                {count}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>
      {isOpen && <div className="border-t border-border">{children}</div>}
    </section>
  );
}

function GoalRow({
  goal,
  employee,
  groupKey,
}: {
  goal: PerformanceGoal;
  employee?: PerformanceEmployee;
  groupKey: GroupKey;
}) {
  const dueInfo = getDueInfo(goal.due_date, goal.status);
  const signalTone: ScoreStatus =
    goal.status === "achieved"
      ? "excellent"
      : groupKey === "risk"
        ? "risk"
        : groupKey === "due_soon"
          ? "attention"
          : "good";
  const stripeCls: Record<ScoreStatus, string> = {
    excellent: "bg-status-excellent",
    good: "bg-status-good",
    attention: "bg-status-attention",
    risk: "bg-status-risk",
    critical: "bg-status-critical",
    neutral: "bg-status-neutral",
  };
  const showStripe = groupKey === "risk" || groupKey === "due_soon";

  return (
    <article className="relative grid items-start gap-3 px-4 py-4 hover:bg-muted/20 sm:px-5 lg:grid-cols-[minmax(0,1fr)_150px_140px] lg:items-center lg:gap-4 lg:py-3.5">
      {showStripe && (
        <span
          aria-hidden
          className={cn("absolute inset-y-2 left-0 w-[3px] rounded-full", stripeCls[signalTone])}
        />
      )}

      {/* Title + owner + category */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-medium text-foreground">{goal.title}</h4>
          <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:inline">
            {goal.category}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="h-5 w-5">
            {(employee?.avatar_display_url || employee?.avatar_url) && (
              <AvatarImage
                src={employee.avatar_display_url ?? employee.avatar_url ?? ""}
                alt={employee.name}
              />
            )}
            <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
              {initials(employee?.name ?? "?")}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{employee?.name ?? "Sem responsável"}</span>
          {employee?.role && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="truncate">{employee.role}</span>
            </>
          )}
        </div>
      </div>

      {/* Due */}
      <div className="text-xs">
        <div
          className={cn(
            "inline-flex items-center gap-1 font-medium tabular-nums",
            dueInfo.tone === "risk" && "text-status-risk",
            dueInfo.tone === "attention" && "text-status-attention-foreground",
            dueInfo.tone === "neutral" && "text-muted-foreground",
            dueInfo.tone === "good" && "text-foreground",
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {dueInfo.label}
        </div>
        <div className="mt-0.5 text-muted-foreground">{formatGoalDate(goal.due_date)}</div>
      </div>

      {/* Status + action */}
      <div className="flex items-center justify-between gap-2 lg:justify-end">
        <StatusBadge tone={STATUS_TONE[goal.status]}>{STATUS_LABEL[goal.status]}</StatusBadge>
        {employee && (
          <Button asChild variant="ghost" size="icon" className="h-7 w-7">
            <Link
              to="/colaboradores/$id"
              params={{ id: employee.id }}
              search={{ tab: "goals" }}
              aria-label="Ver responsável"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}

function groupGoals(goals: PerformanceGoal[]): Record<GroupKey, PerformanceGoal[]> {
  const result: Record<GroupKey, PerformanceGoal[]> = {
    risk: [],
    due_soon: [],
    on_track: [],
    achieved: [],
  };
  for (const goal of goals) {
    if (goal.status === "achieved") {
      result.achieved.push(goal);
      continue;
    }
    if (goal.status === "risk") {
      result.risk.push(goal);
      continue;
    }
    const days = daysUntil(goal.due_date);
    if (days !== null && days <= 7) {
      result.due_soon.push(goal);
    } else {
      result.on_track.push(goal);
    }
  }
  // sort: most urgent first
  result.risk.sort((a, b) => (daysUntil(a.due_date) ?? 0) - (daysUntil(b.due_date) ?? 0));
  result.due_soon.sort((a, b) => (daysUntil(a.due_date) ?? 0) - (daysUntil(b.due_date) ?? 0));
  result.on_track.sort((a, b) => (daysUntil(a.due_date) ?? 9999) - (daysUntil(b.due_date) ?? 9999));
  result.achieved.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  return result;
}

function daysUntil(date: string): number | null {
  try {
    const target = new Date(date);
    if (Number.isNaN(target.getTime())) return null;
    const now = new Date();
    const a = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function getDueInfo(
  date: string,
  status: PerformanceGoalStatus,
): { label: string; tone: "risk" | "attention" | "good" | "neutral" } {
  if (status === "achieved") return { label: "Concluída", tone: "neutral" };
  const days = daysUntil(date);
  if (days === null) return { label: "Sem prazo", tone: "neutral" };
  if (days < 0) return { label: `${Math.abs(days)}d atrasada`, tone: "risk" };
  if (days === 0) return { label: "Vence hoje", tone: "risk" };
  if (days <= 7) return { label: `Em ${days}d`, tone: "attention" };
  return { label: `Em ${days}d`, tone: "good" };
}

function formatGoalDate(value: string): string {
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

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function DbGoalsSection({
  goals,
  employeesById,
  onComplete,
}: {
  goals: GoalRow[];
  employeesById: Map<string, EmployeeRow>;
  onComplete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<DbGoalFilter>("all");
  const pendingGoals = goals.filter((goal) => goal.status === "pending");
  const completedGoals = goals.filter((goal) => goal.status === "completed");
  const overdueGoals = pendingGoals.filter(isGoalOverdue);
  const visiblePendingGoals =
    filter === "all" || filter === "pending"
      ? pendingGoals
      : filter === "overdue"
        ? overdueGoals
        : [];
  const visibleCompletedGoals = filter === "all" || filter === "completed" ? completedGoals : [];
  const visibleCount = visiblePendingGoals.length + visibleCompletedGoals.length;
  const visibleOverdueCount = visiblePendingGoals.filter(isGoalOverdue).length;
  const visibleCompletedCount = visibleCompletedGoals.length;
  const filters: { value: DbGoalFilter; label: string; count: number }[] = [
    { value: "all", label: "Todas", count: goals.length },
    { value: "pending", label: "Em andamento", count: pendingGoals.length },
    { value: "completed", label: "Concluídas", count: completedGoals.length },
    { value: "overdue", label: "Atrasadas", count: overdueGoals.length },
  ];
  const activeFilterLabel = filters.find((item) => item.value === filter)?.label ?? "Todas";

  return (
    <SectionCard
      title="Minhas metas"
      description="Metas atribuídas pelo líder. O colaborador vê a versão dele em /funcionario."
    >
      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta criada ainda"
          description='Clique em "+ Criar Meta" para começar.'
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex flex-wrap gap-2 border-b border-border bg-card px-4 py-3">
            {filters.map((item) => {
              const active = filter === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={cn(
                    "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                      active ? "bg-primary-foreground/20" : "bg-muted",
                    )}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 border-b border-border bg-muted/10 px-4 py-3 sm:grid-cols-3">
            <FilterSummaryItem
              label={`Metas em "${activeFilterLabel}"`}
              value={visibleCount}
              hint={visibleCount === 1 ? "meta exibida" : "metas exibidas"}
            />
            <FilterSummaryItem
              label="Atrasadas abertas"
              value={visibleOverdueCount}
              hint={visibleOverdueCount === 0 ? "sem atraso no filtro" : "exigem atenção"}
              tone={visibleOverdueCount > 0 ? "risk" : "neutral"}
            />
            <FilterSummaryItem
              label="Concluídas"
              value={visibleCompletedCount}
              hint={
                visibleCompletedCount === 0
                  ? "nenhuma concluída no filtro"
                  : "já finalizadas no filtro"
              }
              tone={visibleCompletedCount > 0 ? "excellent" : "neutral"}
            />
          </div>
          <div className="hidden grid-cols-[minmax(220px,1fr)_180px_140px_250px] items-center gap-6 border-b border-border bg-muted/20 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:grid">
            <span>Meta</span>
            <span>Responsável</span>
            <span>Prazo</span>
            <span className="text-right">Status</span>
          </div>
          {visibleCount === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Target}
                title="Nenhuma meta neste filtro"
                description="Troque o filtro para visualizar outras metas cadastradas."
              />
            </div>
          ) : (
            <div>
              {visiblePendingGoals.length > 0 && (
                <DbGoalsGroup
                  title={filter === "overdue" ? "Atrasadas" : "Em andamento"}
                  goals={visiblePendingGoals}
                  employeesById={employeesById}
                  onComplete={onComplete}
                />
              )}
              {visibleCompletedGoals.length > 0 && (
                <DbGoalsGroup
                  title="Concluídas"
                  goals={visibleCompletedGoals}
                  employeesById={employeesById}
                  onComplete={onComplete}
                  muted
                />
              )}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function FilterSummaryItem({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "neutral" | "risk" | "excellent";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={cn(
            "text-xl font-semibold tabular-nums",
            tone === "risk" && "text-status-risk",
            tone === "excellent" && "text-status-excellent",
            tone === "neutral" && "text-foreground",
          )}
        >
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
    </div>
  );
}

function DbGoalsGroup({
  title,
  goals,
  employeesById,
  onComplete,
  muted = false,
}: {
  title: string;
  goals: GoalRow[];
  employeesById: Map<string, EmployeeRow>;
  onComplete: (id: string) => void;
  muted?: boolean;
}) {
  return (
    <section className="border-b border-border last:border-b-0">
      <div
        className={cn(
          "flex items-center justify-between border-b border-border/60 px-4 py-2",
          muted ? "bg-muted/10" : "bg-card",
        )}
      >
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {goals.length}
        </span>
      </div>
      <div className="divide-y divide-border">
        {goals.map((goal) => (
          <DbGoalRow
            key={goal.id}
            goal={goal}
            employee={employeesById.get(goal.employee_id)}
            onComplete={onComplete}
          />
        ))}
      </div>
    </section>
  );
}

function DbGoalRow({
  goal,
  employee,
  onComplete,
}: {
  goal: GoalRow;
  employee?: EmployeeRow;
  onComplete: (id: string) => void;
}) {
  const isDone = goal.status === "completed";
  const dueInfo = getLocalDueInfo(goal.deadline, goal.status);
  const employeeName = employee?.name ?? "Colaborador";
  const avatarUrl = employee?.avatar_display_url ?? employee?.avatar_url;

  return (
    <article className="grid gap-3 px-4 py-3 hover:bg-muted/20 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[minmax(220px,1fr)_180px_140px_250px] lg:gap-6">
      <div className="min-w-0">
        <h4
          className={cn(
            "truncate text-sm font-medium text-foreground",
            isDone && "text-muted-foreground line-through",
          )}
        >
          {goal.name}
        </h4>
        <div className="mt-1 text-xs text-muted-foreground">
          Criada em {formatGoalDate(goal.created_at)}
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <Avatar className="h-6 w-6 shrink-0">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={employeeName} />}
          <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
            {initials(employeeName)}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 truncate">{employeeName}</span>
      </div>

      <div className="min-w-0 text-xs">
        <div
          className={cn(
            "inline-flex items-center gap-1 font-medium tabular-nums",
            dueInfo.tone === "risk" && "text-status-risk",
            dueInfo.tone === "attention" && "text-status-attention-foreground",
            dueInfo.tone === "neutral" && "text-muted-foreground",
            dueInfo.tone === "good" && "text-foreground",
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {dueInfo.label}
        </div>
        {goal.deadline && (
          <div className="mt-0.5 text-muted-foreground">{formatGoalDate(goal.deadline)}</div>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:justify-end">
        {isDone ? (
          <StatusBadge tone="excellent">
            <CheckCircle2 className="h-3 w-3" />
            Concluída
          </StatusBadge>
        ) : (
          <>
            <StatusBadge tone="neutral">Em andamento</StatusBadge>
            <Button size="sm" variant="outline" onClick={() => onComplete(goal.id)}>
              <CheckCircle2 className="h-4 w-4" />
              Meta finalizada
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

function getLocalDueInfo(
  date: string | null,
  status: "pending" | "completed",
): { label: string; tone: "risk" | "attention" | "good" | "neutral" } {
  if (status === "completed") return { label: "Concluída", tone: "neutral" };
  if (!date) return { label: "Sem prazo", tone: "neutral" };
  const days = daysUntil(date);
  if (days === null) return { label: "Sem prazo", tone: "neutral" };
  if (days < 0) return { label: `${Math.abs(days)}d atrasada`, tone: "risk" };
  if (days === 0) return { label: "Vence hoje", tone: "risk" };
  if (days <= 7) return { label: `Em ${days}d`, tone: "attention" };
  return { label: `Em ${days}d`, tone: "good" };
}

function isGoalOverdue(goal: GoalRow): boolean {
  if (goal.status !== "pending" || !goal.deadline) return false;
  const days = daysUntil(goal.deadline);
  return days !== null && days < 0;
}
