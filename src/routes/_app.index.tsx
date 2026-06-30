import { AlertCard } from "@/components/php/AlertCard";
import { EmployeeMiniCard } from "@/components/php/EmployeeMiniCard";
import { EmptyState } from "@/components/php/EmptyState";
import { FilterBar } from "@/components/php/FilterBar";
import { MetricCard } from "@/components/php/MetricCard";
import { PageHeader } from "@/components/php/PageHeader";
import { ProgressBar } from "@/components/php/ProgressBar";
import { ScoreCard } from "@/components/php/ScoreCard";
import { SectionCard } from "@/components/php/SectionCard";
import { SCORE_RANGES, scoreLabel, scoreToStatus, type ScoreStatus } from "@/components/php/types";
import { Button } from "@/components/ui/button";
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
  ListChecks,
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
      { title: "Central de Gestão · People Performance Hub" },
      {
        name: "description",
        content:
          "Priorize ações, acompanhe riscos e tome decisões rápidas sobre a performance do efetivo.",
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

  const actionCount = openAlerts.length + attention.length + withoutRecentScore;
  const distribution = buildDistribution(performanceEmployees, latest);
  const series = buildEvolutionSeries(snapshots, Number(range));
  const goalsAtRisk = goals.filter((goal) => goal.status === "risk").length;
  const riskMomentum =
    enteredAttention.length + drops.length > leftRisk.length + improvements.length
      ? "up"
      : leftRisk.length + improvements.length > enteredAttention.length + drops.length
        ? "down"
        : "flat";
  const topRecentChanges = [
    ...drops.slice(0, 2).map((item) => ({
      id: `drop-${item.employee.id}`,
      title: `${item.employee.name} piorou ${Math.abs(item.current - (item.previous ?? item.current)).toFixed(1)} pts`,
      reason: "Priorize uma conversa objetiva para entender bloqueios recentes.",
      to: item.employee.is_mock ? "/alertas" : "/colaboradores/$id",
      params: item.employee.is_mock ? undefined : { id: item.employee.id },
    })),
    ...enteredAttention.slice(0, 2).map((item) => ({
      id: `attention-${item.employee.id}`,
      title: `${item.employee.name} entrou em atenção`,
      reason: "O status saiu da zona saudável e exige acompanhamento próximo.",
      to: item.employee.is_mock ? "/alertas" : "/colaboradores/$id",
      params: item.employee.is_mock ? undefined : { id: item.employee.id },
    })),
    ...improvements.slice(0, 2).map((item) => ({
      id: `improvement-${item.employee.id}`,
      title: `${item.employee.name} melhorou ${Math.abs(item.current - (item.previous ?? item.current)).toFixed(1)} pts`,
      reason: "Boa oportunidade para reforço positivo ou reconhecimento.",
      to: item.employee.is_mock ? "/alertas" : "/colaboradores/$id",
      params: item.employee.is_mock ? undefined : { id: item.employee.id },
    })),
  ].slice(0, 4);

  const recommended = useMemo(() => {
    const items: {
      title: string;
      reason: string;
      priority: "alta" | "média" | "baixa";
      to: string;
    }[] = [];

    if (criticalAlerts > 0) {
      items.push({
        title: `Resolver ${criticalAlerts} alerta(s) crítico(s)`,
        reason: "Há sinais que exigem ação rápida do gestor.",
        priority: "alta",
        to: "/alertas",
      });
    }

    if (drops.length > 0) {
      items.push({
        title: `Investigar ${drops.length} queda(s) de desempenho`,
        reason: "Quedas recentes podem indicar bloqueios, desalinhamento ou sobrecarga.",
        priority: "alta",
        to: "/colaboradores",
      });
    }

    if (attention.length > 0) {
      items.push({
        title: `Acompanhar ${attention.length} colaborador(es) em atenção`,
        reason: "Priorize conversas objetivas e remoção de bloqueios.",
        priority: "média",
        to: "/colaboradores",
      });
    }

    if (highlights.length > 0) {
      items.push({
        title: `Reconhecer ${highlights.length} colaborador(es) em alto desempenho`,
        reason: "Reconhecimento reforça comportamento consistente e referência para a equipe.",
        priority: "média",
        to: "/colaboradores",
      });
    }

    if (withoutRecentScore > 0) {
      items.push({
        title: `Registrar KPI de ${withoutRecentScore} colaborador(es) ativo(s)`,
        reason: "Sem dados recentes, o gestor perde visibilidade para decidir.",
        priority: "baixa",
        to: "/colaboradores",
      });
    }

    return items;
  }, [attention.length, criticalAlerts, drops.length, highlights.length, withoutRecentScore]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <PageHeader
        title="Central de Gestão"
        description="Abra o dia sabendo onde agir: riscos, pessoas em atenção, destaques e próximos passos."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/colaboradores">
                <Users className="h-4 w-4" />
                Pessoas
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/alertas">
                <ListChecks className="h-4 w-4" />
                Ver ações
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Link to="/alertas" className="block lg:col-span-2">
          <MetricCard
            label="O que preciso fazer hoje?"
            icon={ListChecks}
            value={actionCount}
            hint="ações"
            isEmpty={actionCount === 0 && !loadingEmployees}
            emptyMessage="Nenhuma ação crítica no momento."
            footer={
              actionCount > 0
                ? `${openAlerts.length} alerta(s), ${attention.length} pessoa(s) em atenção e ${withoutRecentScore} sem KPI recente.`
                : "Acompanhe novamente quando novos dados forem registrados."
            }
            className={
              actionCount > 0
                ? "h-full border-status-critical/30 bg-status-critical-soft/30 transition hover:border-status-critical/60"
                : "h-full transition hover:border-primary/40"
            }
          />
        </Link>

        <Link to="/colaboradores" className="block">
          <MetricCard
            label="Quem precisa de atenção?"
            icon={AlertTriangle}
            value={attention.length}
            isEmpty={scoredActive.length === 0}
            emptyMessage="Sem KPIs suficientes."
            footer={
              attention.length > 0
                ? "Score abaixo de 75 ou queda relevante."
                : "Nenhum colaborador em atenção."
            }
            className="h-full transition hover:border-status-attention/70"
          />
        </Link>

        <Link to="/colaboradores" className="block">
          <MetricCard
            label="Quem merece reconhecimento?"
            icon={Sparkles}
            value={highlights.length}
            isEmpty={scoredActive.length === 0}
            emptyMessage="Sem dados suficientes."
            footer={
              highlights.length > 0
                ? "Score igual ou acima de 90."
                : "Nenhum destaque identificado ainda."
            }
            className="h-full transition hover:border-status-excellent/70"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Link to="/colaboradores" className="block">
          <ScoreCard
            score={teamScore}
            description={
              scoredActive.length > 0
                ? `Saúde geral baseada em ${scoredActive.length} colaborador(es) com KPI recente.`
                : undefined
            }
          />
        </Link>

        <Link to="/metas" className="block">
          <MetricCard
            label="Quais metas estão em risco?"
            icon={Target}
            value={goalsAtRisk}
            isEmpty={goalsAtRisk === 0}
            emptyMessage="Nenhuma meta em risco."
            footer={
              goalsAtRisk > 0
                ? "Clique para revisar metas que precisam de correção de rota."
                : "Metas simuladas aparecem aqui quando entram em risco."
            }
            className="h-full transition hover:border-primary/40"
          />
        </Link>

        <Link to="/colaboradores" className="block">
          <MetricCard
            label="O que mudou recentemente?"
            icon={drops.length > improvements.length ? TrendingDown : TrendingUp}
            value={drops.length + improvements.length}
            hint="movimentos"
            isEmpty={scoredActive.length === 0}
            emptyMessage="Sem comparativo recente."
            footer={`${drops.length} queda(s) e ${improvements.length} melhora(s) relevantes.`}
            trend={
              drops.length > improvements.length
                ? { direction: "down", label: "Mais quedas que melhorias", positive: false }
                : improvements.length > 0
                  ? { direction: "up", label: "Evolução positiva", positive: true }
                  : { direction: "flat", label: "Sem mudança relevante" }
            }
            className="h-full transition hover:border-primary/40"
          />
        </Link>
      </div>

      <SectionCard
        title="Mudanças desde a última atualização"
        description="O que mudou no time e pode alterar a prioridade do gestor hoje."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/alertas">
              Resolver mudanças
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Melhoraram"
            icon={TrendingUp}
            value={improvements.length}
            isEmpty={improvements.length === 0}
            emptyMessage="Sem melhora relevante."
            footer="Score subiu 5 pontos ou mais."
            trend={{ direction: "up", label: "Evolução positiva", positive: true }}
          />
          <MetricCard
            label="Pioraram"
            icon={TrendingDown}
            value={drops.length}
            isEmpty={drops.length === 0}
            emptyMessage="Sem queda relevante."
            footer="Score caiu 5 pontos ou mais."
            trend={{ direction: "down", label: "Exige atenção", positive: false }}
          />
          <MetricCard
            label="Novos em atenção"
            icon={AlertTriangle}
            value={enteredAttention.length}
            isEmpty={enteredAttention.length === 0}
            emptyMessage="Ninguém entrou em atenção."
            footer="Mudança de saudável para atenção, risco ou crítico."
          />
          <MetricCard
            label="Saíram do risco"
            icon={CheckCircle2}
            value={leftRisk.length}
            isEmpty={leftRisk.length === 0}
            emptyMessage="Ninguém saiu do risco."
            footer={
              riskMomentum === "up"
                ? "Mais quedas/entradas em atenção do que recuperações."
                : riskMomentum === "down"
                  ? "Mais recuperações/melhoras do que novos riscos."
                  : "Entradas e saídas de risco equilibradas."
            }
            trend={{
              direction: riskMomentum === "up" ? "down" : riskMomentum === "down" ? "up" : "flat",
              label:
                riskMomentum === "up"
                  ? "Riscos aumentando"
                  : riskMomentum === "down"
                    ? "Riscos diminuindo"
                    : "Riscos estáveis",
              positive: riskMomentum !== "up",
            }}
          />
        </div>

        {topRecentChanges.length > 0 && (
          <div className="mt-5 divide-y divide-border rounded-xl border border-border bg-muted/20">
            {topRecentChanges.map((change) => (
              <Link
                key={change.id}
                to={change.to}
                params={change.params}
                className="flex flex-wrap items-center justify-between gap-3 p-3 transition hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{change.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{change.reason}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Fila de decisão"
          description="As ações mais importantes para o gestor começar o dia."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/alertas">
                Abrir ações
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        >
          {recommended.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nada crítico para agir agora"
              description="Quando surgirem alertas, quedas de performance ou KPIs pendentes, eles aparecerão aqui."
            />
          ) : (
            <ul className="divide-y divide-border">
              {recommended.slice(0, 5).map((item) => (
                <li key={item.title} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    to={item.to}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg p-2 transition hover:bg-muted/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.reason}</p>
                    </div>
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[11px] font-medium " +
                        (item.priority === "alta"
                          ? "bg-status-critical-soft text-status-critical"
                          : item.priority === "média"
                            ? "bg-status-attention-soft text-status-attention-foreground"
                            : "bg-status-info-soft text-status-info")
                      }
                    >
                      Prioridade {item.priority}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Alertas prioritários"
          description="Sinais abertos por gravidade."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/alertas">
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        >
          {sortedAlerts.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Sem alertas abertos"
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
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Pessoas em atenção"
          description="Clique no colaborador para abrir o perfil e agir com contexto."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/colaboradores">
                Ver pessoas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        >
          {attention.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nenhum colaborador em atenção"
              description="A equipe não tem quedas ou scores baixos registrados agora."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {attention.slice(0, 4).map((item) => {
                const delta =
                  item.previous !== null ? Number(item.current) - Number(item.previous) : null;

                return (
                  <Link
                    key={item.employee.id}
                    to={item.employee.is_mock ? "/alertas" : "/colaboradores/$id"}
                    params={item.employee.is_mock ? undefined : { id: item.employee.id }}
                    className="block"
                  >
                    <EmployeeMiniCard
                      name={item.employee.name}
                      role={item.employee.role}
                      department={departmentName.get(item.employee.department_id ?? "") ?? null}
                      avatarUrl={item.employee.avatar_url}
                      score={item.current}
                      delta={delta}
                      reason={
                        delta !== null && delta < 0
                          ? "Queda no score em relação à última avaliação."
                          : "Score abaixo da faixa saudável."
                      }
                      suggestedAction="Abrir perfil, revisar metas e registrar próximo passo."
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Destaques para reconhecer"
          description="Alto desempenho deve gerar reforço positivo, não só observação."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/colaboradores">
                Ver ranking
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        >
          {highlights.length === 0 ? (
            <EmptyState
              title="Ainda não há destaques"
              description="Quando colaboradores alcançarem alto desempenho, eles aparecerão aqui."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {highlights.slice(0, 4).map((item) => (
                <Link
                  key={item.employee.id}
                  to={item.employee.is_mock ? "/alertas" : "/colaboradores/$id"}
                  params={item.employee.is_mock ? undefined : { id: item.employee.id }}
                  className="block"
                >
                  <EmployeeMiniCard
                    name={item.employee.name}
                    role={item.employee.role}
                    department={departmentName.get(item.employee.department_id ?? "") ?? null}
                    avatarUrl={item.employee.avatar_url}
                    score={item.current}
                    highlight="Score acima de 90 na última avaliação."
                  />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

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
          <div className="h-64 w-full">
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
        title="Distribuição do efetivo por desempenho"
        description="Mapa rápido de saúde do time por faixa de score."
      >
        {scoredActive.length === 0 ? (
          <EmptyState
            title="Ainda não há dados suficientes para esta distribuição"
            description="Cadastre colaboradores e registre KPIs para visualizar a faixa de cada pessoa."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {distribution
              .filter((bucket) => bucket.status !== "neutral" || bucket.count > 0)
              .map((bucket) => (
                <DistributionRow
                  key={bucket.status}
                  status={bucket.status}
                  count={bucket.count}
                  total={activeEmployees.length}
                />
              ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function DistributionRow({
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

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <span className="text-sm tabular-nums text-muted-foreground">{count}</span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {range ? `Score ${range.min}-${range.max}` : "Sem score registrado"}
      </p>
      <div className="mt-3">
        <ProgressBar
          value={percentage}
          tone={scoreToStatus(range ? (range.min + range.max) / 2 : null)}
        />
      </div>
    </div>
  );
}
