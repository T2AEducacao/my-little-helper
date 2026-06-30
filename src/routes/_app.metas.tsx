import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ListChecks,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  usePerformanceWorkspaceData,
  type PerformanceEmployee,
  type PerformanceGoal,
  type PerformanceGoalStatus,
} from "@/features/performance/workspace-data";
import { useEmployees } from "@/lib/php-data";
import type { ScoreStatus } from "@/components/php/types";

export const Route = createFileRoute("/_app/metas")({
  head: () => ({
    meta: [
      { title: "Metas e KPIs · People Performance Hub" },
      {
        name: "description",
        content: "Leia em segundos o que está em risco, perto do prazo, no caminho e concluído.",
      },
    ],
  }),
  component: GoalsPage,
});

type GroupKey = "risk" | "due_soon" | "on_track" | "achieved";

const GROUP_META: Record<
  GroupKey,
  { label: string; tone: ScoreStatus; description: string; defaultOpen: boolean }
> = {
  risk: {
    label: "Em risco",
    tone: "risk",
    description: "Progresso abaixo do esperado ou prazo estourado.",
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
  const [openGroups, setOpenGroups] = useState<Record<GroupKey, boolean>>({
    risk: true,
    due_soon: true,
    on_track: false,
    achieved: false,
  });

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
  const averageProgress =
    filteredGoals.length > 0
      ? Math.round(filteredGoals.reduce((sum, g) => sum + g.progress, 0) / filteredGoals.length)
      : 0;

  const toggleGroup = (key: GroupKey) =>
    setOpenGroups((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        title="Metas e KPIs"
        description="Veja em segundos o que precisa de atenção e o que está caminhando bem."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/alertas">
              <ListChecks className="h-4 w-4" />
              Ver ações
            </Link>
          </Button>
        }
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3">
          <div className="flex items-center gap-3">
            <Target className="h-4 w-4 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">Progresso médio da equipe</div>
            <div className="text-base font-semibold tabular-nums text-foreground">
              {filteredGoals.length === 0 ? "—" : `${averageProgress}%`}
            </div>
            <div className="hidden h-1.5 w-40 overflow-hidden rounded-full bg-muted sm:block">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${averageProgress}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Responsável</span>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="h-8 w-[200px] text-xs">
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
        "flex items-start gap-3 border-border p-5 [&:not(:last-child)]:border-r",
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
        <div className="flex items-center gap-3 min-w-0">
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
  const progressTone: ScoreStatus =
    goal.status === "achieved"
      ? "excellent"
      : groupKey === "risk"
        ? "risk"
        : groupKey === "due_soon"
          ? "attention"
          : "good";
  const fillCls: Record<ScoreStatus, string> = {
    excellent: "bg-status-excellent",
    good: "bg-status-good",
    attention: "bg-status-attention",
    risk: "bg-status-risk",
    critical: "bg-status-critical",
    neutral: "bg-status-neutral",
  };
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
    <article className="relative grid items-center gap-4 px-5 py-3.5 hover:bg-muted/20 lg:grid-cols-[minmax(0,1fr)_200px_140px_120px]">
      {showStripe && (
        <span
          aria-hidden
          className={cn("absolute inset-y-2 left-0 w-[3px] rounded-full", stripeCls[progressTone])}
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
            {employee?.avatar_url && <AvatarImage src={employee.avatar_url} alt={employee.name} />}
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

      {/* Progress */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium tabular-nums text-foreground">{goal.progress}%</span>
          <span className="text-muted-foreground tabular-nums">
            {goal.current}
            {goal.unit === "%" ? "%" : ` ${goal.unit}`} / {goal.target}
            {goal.unit === "%" ? "%" : ` ${goal.unit}`}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", fillCls[progressTone])}
            style={{ width: `${Math.max(0, Math.min(100, goal.progress))}%` }}
          />
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
      <div className="flex items-center justify-end gap-2">
        <StatusBadge tone={STATUS_TONE[goal.status]}>{STATUS_LABEL[goal.status]}</StatusBadge>
        {employee && !employee.is_mock && (
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
  result.on_track.sort((a, b) => b.progress - a.progress);
  result.achieved.sort(
    (a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime(),
  );
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
