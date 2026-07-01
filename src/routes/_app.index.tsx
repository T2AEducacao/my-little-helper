import { AlertCard } from "@/components/php/AlertCard";
import { EmployeeMiniCard } from "@/components/php/EmployeeMiniCard";
import { EmptyState } from "@/components/php/EmptyState";
import { FilterBar } from "@/components/php/FilterBar";
import { MetricCard } from "@/components/php/MetricCard";
import { PageHeader } from "@/components/php/PageHeader";
import { ProgressBar } from "@/components/php/ProgressBar";
import { ScoreCard } from "@/components/php/ScoreCard";
import { SectionCard } from "@/components/php/SectionCard";
import { StatusBadge } from "@/components/php/StatusBadge";
import { SCORE_RANGES, scoreLabel, scoreToStatus, type ScoreStatus } from "@/components/php/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildDistribution,
  buildEvolutionSeries,
  latestSnapshotsByEmployee,
  useDepartments,
  useEmployees,
} from "@/lib/php-data";
import { usePerformanceWorkspaceData } from "@/features/performance/workspace-data";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  LineChart as LineChartIcon,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SEVERITY_ORDER = { critical: 0, risk: 1, attention: 2, info: 3 } as const;

const RANGE_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "365", label: "Ano" },
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Central de Gestão · Performativo" },
      {
        name: "description",
        content:
          "Acompanhe riscos, metas e evolução para tomar decisões rápidas sobre a performance do efetivo.",
      },
    ],
  }),
  component: ManagementCenterPage,
});

function ManagementCenterPage() {
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const performanceData = usePerformanceWorkspaceData(employees);
  const performanceEmployees = performanceData.employees;
  const snapshots = performanceData.snapshots;
  const alerts = performanceData.actions;
  const goals = performanceData.goals;

  const [range, setRange] = useState<RangeValue>("30");

  const departmentName = useMemo(
    () => new Map(departments.map((department) => [department.id, department.name] as const)),
    [departments],
  );
  const employeeById = useMemo(
    () => new Map(performanceEmployees.map((employee) => [employee.id, employee] as const)),
    [performanceEmployees],
  );
  const latest = useMemo(() => latestSnapshotsByEmployee(snapshots), [snapshots]);

  const activeEmployees = performanceEmployees.filter((employee) => employee.status !== "inactive");

  const scoredActive = activeEmployees
    .map((employee) => {
      const snapshot = latest.get(employee.id);
      return {
        employee,
        current: snapshot?.current ?? null,
        previous: snapshot?.previous ?? null,
      };
    })
    .filter((item) => item.current !== null) as {
    employee: (typeof performanceEmployees)[number];
    current: number;
    previous: number | null;
  }[];

  const teamScore =
    scoredActive.length > 0
      ? scoredActive.reduce((sum, item) => sum + Number(item.current), 0) / scoredActive.length
      : null;

  const highlights = scoredActive
    .filter((item) => item.current >= 90)
    .sort((a, b) => b.current - a.current);
  const attention = scoredActive
    .filter((item) => item.current < 75)
    .sort((a, b) => {
      const aDelta = a.current - (a.previous ?? a.current);
      const bDelta = b.current - (b.previous ?? b.current);
      return aDelta - bDelta;
    });
  const drops = scoredActive.filter(
    (item) => item.previous !== null && item.current - item.previous <= -5,
  );
  const improvements = scoredActive.filter(
    (item) => item.previous !== null && item.current - item.previous >= 5,
  );
  const enteredAttention = scoredActive.filter(
    (item) =>
      item.previous !== null &&
      scoreToStatus(item.previous) !== "critical" &&
      scoreToStatus(item.previous) !== "risk" &&
      scoreToStatus(item.previous) !== "attention" &&
      (scoreToStatus(item.current) === "critical" ||
        scoreToStatus(item.current) === "risk" ||
        scoreToStatus(item.current) === "attention"),
  );
  const leftRisk = scoredActive.filter(
    (item) =>
      item.previous !== null &&
      (scoreToStatus(item.previous) === "critical" ||
        scoreToStatus(item.previous) === "risk" ||
        scoreToStatus(item.previous) === "attention") &&
      scoreToStatus(item.current) !== "critical" &&
      scoreToStatus(item.current) !== "risk" &&
      scoreToStatus(item.current) !== "attention",
  );
  const withoutRecentScore = Math.max(0, activeEmployees.length - scoredActive.length);

  const openAlerts = alerts;
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
  const sortedAlerts = [...openAlerts].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  const priorityCount = openAlerts.length + attention.length + withoutRecentScore;
  const distribution = buildDistribution(performanceEmployees, latest);
  const series = buildEvolutionSeries(snapshots, Number(range));
  const goalsAtRisk = goals.filter((goal) => goal.status === "risk").length;
  const achievedGoals = goals.filter((goal) => goal.status === "achieved").length;
  const onTrackGoals = goals.filter((goal) => goal.status === "on_track").length;

  // Team status strip buckets
  const statusBuckets = useMemo(() => {
    const map = new Map<ScoreStatus, number>([
      ["excellent", 0],
      ["good", 0],
      ["attention", 0],
      ["risk", 0],
      ["critical", 0],
    ]);
    for (const item of scoredActive) {
      const s = scoreToStatus(item.current);
      if (s !== "neutral") map.set(s, (map.get(s) ?? 0) + 1);
    }
    return map;
  }, [scoredActive]);

  // Sparkline data (last 14 points, normalized)
  const sparklineData = useMemo(() => buildEvolutionSeries(snapshots, 30), [snapshots]);
  const sparkDelta =
    sparklineData.length >= 2
      ? sparklineData[sparklineData.length - 1].score - sparklineData[0].score
      : null;

  const topPriorities = useMemo(() => {
    const items: {
      id: string;
      title: string;
      reason: string;
      priority: "alta" | "média" | "baixa";
      to: "/colaboradores/$id" | "/colaboradores";
      params?: { id: string };
    }[] = [];

    drops.slice(0, 2).forEach((item) =>
      items.push({
        id: `drop-${item.employee.id}`,
        title: `${item.employee.name} caiu ${Math.abs(item.current - (item.previous ?? item.current)).toFixed(1)} pts`,
        reason: "Abra o perfil para entender metas, histórico e contexto.",
        priority: "alta",
        to: "/colaboradores/$id",
        params: { id: item.employee.id },
      }),
    );
    attention.slice(0, 2).forEach((item) =>
      items.push({
        id: `att-${item.employee.id}`,
        title: `${item.employee.name} em atenção`,
        reason: "Score abaixo da faixa saudável. Revise o contexto individual.",
        priority: "média",
        to: "/colaboradores/$id",
        params: { id: item.employee.id },
      }),
    );
    if (withoutRecentScore > 0) {
      items.push({
        id: "missing-goals",
        title: `${withoutRecentScore} ativo(s) sem metas recentes`,
        reason: "Sem dados, a leitura da equipe fica incompleta.",
        priority: "baixa",
        to: "/colaboradores",
      });
    }
    return items.slice(0, 4);
  }, [drops, attention, withoutRecentScore]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Central de Gestão"
        description="Abra o dia sabendo onde agir: riscos, pessoas em atenção, destaques e próximos passos."
        actions={
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:flex-wrap lg:w-auto">
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link to="/colaboradores">
                <Users className="h-4 w-4" />
                Colaboradores
              </Link>
            </Button>
          </div>
        }
      />

      {/* Status strip da equipe — leitura em < 1s */}
      <TeamStatusStrip
        buckets={statusBuckets}
        withoutScore={withoutRecentScore}
        total={activeEmployees.length}
      />

      {/* Hero row: Prioridades do dia (2/3) + Score da equipe com sparkline (1/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TodayPriorityPanel
          priorityCount={priorityCount}
          openAlertsCount={openAlerts.length}
          attentionCount={attention.length}
          withoutScoreCount={withoutRecentScore}
          priorities={topPriorities}
          loading={loadingEmployees}
        />
        <TeamScorePanel score={teamScore} series={sparklineData} delta={sparkDelta} />
      </div>

      {/* Pessoas: atenção + destaques */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Pessoas em atenção"
          description="Clique para abrir o perfil e agir com contexto."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/colaboradores">
                Ver pessoas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
          contentClassName="space-y-2"
        >
          {attention.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nenhum colaborador em atenção"
              description="A equipe não tem quedas ou scores baixos registrados agora."
            />
          ) : (
            attention.slice(0, 3).map((item) => {
              const delta =
                item.previous !== null ? Number(item.current) - Number(item.previous) : null;
              return (
                <PersonRow
                  key={item.employee.id}
                  name={item.employee.name}
                  role={item.employee.role}
                  department={departmentName.get(item.employee.department_id ?? "") ?? null}
                  avatarUrl={item.employee.avatar_display_url ?? item.employee.avatar_url}
                  score={item.current}
                  delta={delta}
                  to="/colaboradores/$id"
                  params={{ id: item.employee.id }}
                />
              );
            })
          )}
        </SectionCard>

        <SectionCard
          title="Destaques para reconhecer"
          description="Alto desempenho merece reforço positivo."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/colaboradores">
                Ver ranking
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
          contentClassName="space-y-2"
        >
          {highlights.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Ainda não há destaques"
              description="Quando colaboradores alcançarem alto desempenho, eles aparecerão aqui."
            />
          ) : (
            highlights.slice(0, 3).map((item) => {
              const delta =
                item.previous !== null ? Number(item.current) - Number(item.previous) : null;
              return (
                <PersonRow
                  key={item.employee.id}
                  name={item.employee.name}
                  role={item.employee.role}
                  department={departmentName.get(item.employee.department_id ?? "") ?? null}
                  avatarUrl={item.employee.avatar_display_url ?? item.employee.avatar_url}
                  score={item.current}
                  delta={delta}
                  to="/colaboradores/$id"
                  params={{ id: item.employee.id }}
                />
              );
            })
          )}
        </SectionCard>
      </div>

      {/* Mudanças desde a última atualização (consolidada em 1 seção) */}
      <SectionCard
        title="Mudanças desde a última atualização"
        description="O que mudou no time e pode mover sua prioridade hoje."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InlineStat
            icon={TrendingUp}
            label="Melhoraram"
            value={improvements.length}
            tone="excellent"
          />
          <InlineStat icon={TrendingDown} label="Pioraram" value={drops.length} tone="critical" />
          <InlineStat
            icon={AlertTriangle}
            label="Em atenção"
            value={enteredAttention.length}
            tone="attention"
          />
          <InlineStat
            icon={CheckCircle2}
            label="Saíram do risco"
            value={leftRisk.length}
            tone="good"
          />
        </div>
      </SectionCard>

      {/* Tendência + Distribuição lado a lado */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard
          title="Tendência da equipe"
          description="Score médio ao longo do período selecionado."
          action={
            <FilterBar<RangeValue> value={range} onChange={setRange} options={[...RANGE_OPTIONS]} />
          }
        >
          {series.length < 2 ? (
            <EmptyState
              icon={LineChartIcon}
              title="Ainda não há histórico suficiente"
              description="Conforme novas avaliações forem registradas, a evolução aparecerá aqui."
            />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-muted-foreground)"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-muted-foreground)"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Distribuição por desempenho"
          description="Mapa rápido de saúde por faixa de score."
          contentClassName="space-y-2"
        >
          {scoredActive.length === 0 ? (
            <EmptyState
              title="Sem dados para distribuir"
              description="Registre metas para visualizar a faixa de cada pessoa."
            />
          ) : (
            distribution
              .filter((bucket) => bucket.status !== "neutral" || bucket.count > 0)
              .map((bucket) => (
                <DistributionInline
                  key={bucket.status}
                  status={bucket.status}
                  count={bucket.count}
                  total={activeEmployees.length}
                />
              ))
          )}
        </SectionCard>
      </div>

      {/* Sinais + cobertura de indicadores */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Sinais prioritários" description="Riscos e pontos de atenção ativos.">
          {sortedAlerts.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Sem sinais críticos"
              description="Nenhum risco crítico registrado no momento."
            />
          ) : (
            <div className="space-y-3">
              {sortedAlerts.slice(0, 3).map((alert) => (
                <AlertCard
                  key={alert.id}
                  title={alert.title}
                  severity={alert.severity}
                  explanation={alert.explanation}
                  suggestedAction={alert.suggested_action}
                  employeeName={
                    alert.employee_id ? (employeeById.get(alert.employee_id)?.name ?? null) : null
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Cobertura de indicadores"
          description="Qualidade dos dados disponíveis para decisão."
          contentClassName="space-y-3"
        >
          <ProgressLine
            icon={CheckCircle2}
            label="Colaboradores com metas"
            value={scoredActive.length}
            tone={scoredActive.length > 0 ? "good" : "neutral"}
          />
          <ProgressLine
            icon={Target}
            label="Metas em risco"
            value={goalsAtRisk}
            tone={goalsAtRisk > 0 ? "risk" : "neutral"}
          />
          <ProgressLine
            icon={CheckCircle2}
            label="Metas no prazo"
            value={onTrackGoals}
            tone="good"
          />
          <ProgressLine
            icon={Sparkles}
            label="Metas atingidas"
            value={achievedGoals}
            tone="excellent"
          />
        </SectionCard>
      </div>
    </div>
  );
}

/* ============ Subcomponents (puros, apresentacionais) ============ */

function TeamStatusStrip({
  buckets,
  withoutScore,
  total,
}: {
  buckets: Map<ScoreStatus, number>;
  withoutScore: number;
  total: number;
}) {
  if (total === 0) return null;
  const items: { status: ScoreStatus | "missing"; label: string; count: number }[] = [
    { status: "excellent", label: "Excelente", count: buckets.get("excellent") ?? 0 },
    { status: "good", label: "Bom", count: buckets.get("good") ?? 0 },
    { status: "attention", label: "Atenção", count: buckets.get("attention") ?? 0 },
    { status: "risk", label: "Risco", count: buckets.get("risk") ?? 0 },
    { status: "critical", label: "Crítico", count: buckets.get("critical") ?? 0 },
    { status: "missing", label: "Sem metas", count: withoutScore },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-soft)] sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-stretch lg:gap-x-6 lg:gap-y-3 lg:px-5">
      {items.map((item, idx) => {
        const tone: ScoreStatus =
          item.status === "missing" ? "neutral" : (item.status as ScoreStatus);
        return (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-2 lg:rounded-none lg:bg-transparent lg:px-0 lg:py-0",
              idx > 0 && "lg:border-l lg:border-border/70 lg:pl-6",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                tone === "excellent" && "bg-status-excellent",
                tone === "good" && "bg-status-good",
                tone === "attention" && "bg-status-attention",
                tone === "risk" && "bg-status-risk",
                tone === "critical" && "bg-status-critical",
                tone === "neutral" && "bg-status-neutral",
              )}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{item.count}</span>
          </div>
        );
      })}
    </div>
  );
}

function TodayPriorityPanel({
  priorityCount,
  openAlertsCount,
  attentionCount,
  withoutScoreCount,
  priorities,
  loading,
}: {
  priorityCount: number;
  openAlertsCount: number;
  attentionCount: number;
  withoutScoreCount: number;
  priorities: {
    id: string;
    title: string;
    reason: string;
    priority: "alta" | "média" | "baixa";
    to: "/colaboradores/$id" | "/colaboradores";
    params?: { id: string };
  }[];
  loading: boolean;
}) {
  const isUrgent = priorityCount > 0;
  return (
    <section
      className={cn(
        "relative col-span-1 flex flex-col gap-4 overflow-hidden rounded-xl border bg-card p-5 shadow-[var(--shadow-elevated)] lg:col-span-2",
        isUrgent ? "border-status-critical/40" : "border-border",
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          isUrgent ? "bg-status-critical" : "bg-status-good",
        )}
      />
      <div className="flex flex-col gap-3 pl-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Prioridades do dia
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tight tabular-nums text-foreground">
              {priorityCount}
            </span>
            <span className="text-sm text-muted-foreground">
              {priorityCount === 1 ? "sinal" : "sinais"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {openAlertsCount} alerta(s) · {attentionCount} pessoa(s) em atenção ·{" "}
            {withoutScoreCount} sem metas recentes
          </p>
        </div>
      </div>

      <div className="pl-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando prioridades...</p>
        ) : priorities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nada crítico agora. Acompanhe metas e reconheça os destaques da equipe.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border/70 bg-background/40">
            {priorities.map((priority) => {
              const dotTone =
                priority.priority === "alta"
                  ? "bg-status-critical"
                  : priority.priority === "média"
                    ? "bg-status-attention"
                    : "bg-status-info";
              return (
                <li key={priority.id}>
                  <Link
                    to={priority.to}
                    params={priority.params}
                    className="flex items-center gap-3 px-3 py-3 transition hover:bg-muted/40 sm:py-2.5"
                  >
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", dotTone)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {priority.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{priority.reason}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function TeamScorePanel({
  score,
  series,
  delta,
}: {
  score: number | null;
  series: { date: string; score: number }[];
  delta: number | null;
}) {
  const hasScore = score !== null && !Number.isNaN(score);
  const status = scoreToStatus(score);
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Score médio da equipe
        </p>
        {hasScore && <StatusBadge tone={status}>{scoreLabel(status)}</StatusBadge>}
      </div>
      {hasScore ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
              {Math.round(score!)}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
            {delta !== null && Math.abs(delta) >= 0.1 && (
              <span
                className={cn(
                  "ml-auto inline-flex items-center gap-0.5 text-xs font-medium",
                  delta > 0 ? "text-status-excellent" : "text-status-critical",
                )}
              >
                {delta > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)} pts
              </span>
            )}
          </div>
          <div className="h-16 w-full">
            {series.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="pt-3 text-xs text-muted-foreground">
                Ainda sem histórico suficiente para tendência.
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ainda não há avaliações suficientes para calcular o score médio.
        </p>
      )}
    </section>
  );
}

function InlineStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: number;
  tone: ScoreStatus;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          tone === "excellent" && "bg-status-excellent-soft text-status-excellent",
          tone === "good" && "bg-status-good-soft text-status-good",
          tone === "attention" && "bg-status-attention-soft text-status-attention-foreground",
          tone === "risk" && "bg-status-risk-soft text-status-risk",
          tone === "critical" && "bg-status-critical-soft text-status-critical",
          tone === "neutral" && "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  );
}

function PersonRow({
  name,
  role,
  department,
  avatarUrl,
  score,
  delta,
  to,
  params,
}: {
  name: string;
  role?: string | null;
  department?: string | null;
  avatarUrl?: string | null;
  score: number;
  delta: number | null;
  to: "/colaboradores/$id";
  params?: { id: string };
}) {
  const status = scoreToStatus(score);
  return (
    <Link
      to={to}
      params={params}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-muted/40"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          initials(name)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[role, department].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {delta !== null && Math.abs(delta) >= 0.1 && (
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              delta > 0 ? "text-status-excellent" : "text-status-critical",
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}
          </span>
        )}
        <StatusBadge tone={status}>{Math.round(score)}</StatusBadge>
      </div>
    </Link>
  );
}

function DistributionInline({
  status,
  count,
  total,
}: {
  status: ScoreStatus;
  count: number;
  total: number;
}) {
  const label = status === "neutral" ? "Sem avaliação" : scoreLabel(status);
  const range = SCORE_RANGES.find((item) => item.status === status);
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const tone = scoreToStatus(range ? (range.min + range.max) / 2 : null);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {count} · {Math.round(percentage)}%
        </span>
      </div>
      <div className="mt-1.5">
        <ProgressBar value={percentage} tone={tone} />
      </div>
    </div>
  );
}

function ProgressLine({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: number;
  tone: ScoreStatus | "info";
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          tone === "excellent" && "bg-status-excellent-soft text-status-excellent",
          tone === "good" && "bg-status-good-soft text-status-good",
          tone === "attention" && "bg-status-attention-soft text-status-attention-foreground",
          tone === "risk" && "bg-status-risk-soft text-status-risk",
          tone === "critical" && "bg-status-critical-soft text-status-critical",
          tone === "info" && "bg-status-info-soft text-status-info",
          tone === "neutral" && "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="min-w-0 flex-1 text-sm text-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}
