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
  useAlerts,
  useDepartments,
  useEmployees,
  useSnapshots,
} from "@/lib/php-data";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  LineChart as LineChartIcon,
  MessageSquare,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
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
      { title: "Performance de Efetivo · People Performance Hub" },
      {
        name: "description",
        content:
          "Acompanhe KPIs, metas, evolução e alertas de desempenho do efetivo com clareza gerencial.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();
  const { data: snapshots = [] } = useSnapshots();
  const { data: alerts = [] } = useAlerts();
  const { data: departments = [] } = useDepartments();

  const [range, setRange] = useState<RangeValue>("30");

  const departmentName = useMemo(
    () => new Map(departments.map((department) => [department.id, department.name] as const)),
    [departments],
  );
  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee] as const)),
    [employees],
  );
  const latest = useMemo(() => latestSnapshotsByEmployee(snapshots), [snapshots]);

  const activeEmployees = employees.filter((employee) => employee.status === "active");

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
    employee: (typeof employees)[number];
    current: number;
    previous: number | null;
  }[];

  const teamScore =
    scoredActive.length > 0
      ? scoredActive.reduce((sum, item) => sum + Number(item.current), 0) / scoredActive.length
      : null;

  const highlights = scoredActive.filter((item) => item.current >= 90);
  const attention = scoredActive
    .filter((item) => item.current >= 40 && item.current <= 74)
    .sort((a, b) => {
      const aDelta = a.current - (a.previous ?? a.current);
      const bDelta = b.current - (b.previous ?? b.current);
      return aDelta - bDelta;
    });

  const openAlerts = alerts;
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
  const attentionAlerts = alerts.filter((alert) => alert.severity === "attention").length;
  const sortedAlerts = [...openAlerts].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  const distribution = buildDistribution(employees, latest);
  const series = buildEvolutionSeries(snapshots, Number(range));

  const recommended = useMemo(() => {
    const items: { title: string; reason: string; priority: "alta" | "média" | "baixa" }[] = [];
    const drops = scoredActive.filter(
      (item) => item.previous !== null && item.current - item.previous <= -5,
    );

    if (drops.length > 0) {
      items.push({
        title: `Fazer 1:1 com ${drops.length} colaborador(es) com queda de desempenho`,
        reason: "Quedas recentes podem indicar bloqueios, desalinhamento de metas ou sobrecarga.",
        priority: "alta",
      });
    }

    if (criticalAlerts > 0) {
      items.push({
        title: `Revisar ${criticalAlerts} alerta(s) crítico(s)`,
        reason: "Alertas críticos exigem ação rápida do gestor responsável.",
        priority: "alta",
      });
    }

    if (highlights.length > 0) {
      items.push({
        title: `Reconhecer ${highlights.length} colaborador(es) em alto desempenho`,
        reason:
          "Reconhecimento ajuda a manter consistência, engajamento e referência para a equipe.",
        priority: "média",
      });
    }

    if (activeEmployees.length > 0 && scoredActive.length < activeEmployees.length) {
      items.push({
        title: "Registrar KPIs dos colaboradores sem avaliação recente",
        reason: `${activeEmployees.length - scoredActive.length} colaborador(es) ainda sem snapshot de desempenho.`,
        priority: "média",
      });
    }

    return items;
  }, [activeEmployees.length, criticalAlerts, highlights.length, scoredActive]);

  const hasAnyEmployee = employees.length > 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <PageHeader
        title="Performance de Efetivo"
        description="Visão gerencial dos colaboradores, KPIs, metas, evolução e riscos por equipe."
        actions={
          <>
            <Button variant="outline" size="sm">
              <UserPlus className="h-4 w-4" />
              Novo colaborador
            </Button>
            <Button variant="outline" size="sm">
              <Target className="h-4 w-4" />
              Registrar KPI
            </Button>
            <Button size="sm">
              <Sparkles className="h-4 w-4" />
              Gerar insight
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ScoreCard
          score={teamScore}
          description={
            scoredActive.length > 0
              ? `Baseado em ${scoredActive.length} colaborador(es) ativo(s) com KPI recente.`
              : undefined
          }
        />
        <MetricCard
          label="Colaboradores ativos"
          icon={Users}
          value={activeEmployees.length}
          isEmpty={!hasAnyEmployee && !loadingEmployees}
          emptyMessage="Nenhum colaborador cadastrado ainda."
          footer={
            hasAnyEmployee
              ? `${employees.length - activeEmployees.length} fora do ativo, incluindo férias, licença ou inativos.`
              : undefined
          }
        />
        <MetricCard
          label="Alto desempenho"
          icon={TrendingUp}
          value={highlights.length}
          isEmpty={scoredActive.length === 0}
          emptyMessage="Sem dados suficientes para identificar destaques."
          footer={
            highlights.length > 0 ? "Colaboradores com score igual ou acima de 90." : undefined
          }
        />
        <MetricCard
          label="Efetivo em atenção"
          icon={AlertTriangle}
          value={attention.length}
          isEmpty={scoredActive.length === 0}
          emptyMessage="Sem dados suficientes para identificar atenção."
          footer={
            attention.length > 0 ? "Score entre 40 e 74. Priorize quem teve queda." : undefined
          }
        />
        <MetricCard
          label="Alertas abertos"
          icon={AlertOctagon}
          value={openAlerts.length}
          isEmpty={openAlerts.length === 0}
          emptyMessage="Nenhum alerta aberto no momento."
          footer={
            openAlerts.length > 0
              ? `${criticalAlerts} crítico(s) · ${attentionAlerts} em atenção`
              : undefined
          }
        />
        <MetricCard
          label="Feedbacks pendentes"
          icon={MessageSquare}
          value={0}
          isEmpty
          emptyMessage="Ainda sem feedbacks pendentes registrados."
          footer="Módulo pronto para evoluir nas próximas tasks."
        />
      </div>

      <SectionCard
        title="Alertas prioritários"
        description="Ocorrências mais importantes em ordem de gravidade."
      >
        {sortedAlerts.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nenhum alerta crítico no momento"
            description="Continue acompanhando KPIs, metas e avaliações para manter o radar atualizado."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {sortedAlerts.slice(0, 6).map((alert) => (
              <AlertCard
                key={alert.id}
                title={alert.title}
                severity={alert.severity}
                explanation={alert.explanation}
                suggestedAction={alert.suggested_action}
                employeeName={
                  alert.employee_id ? (employeeById.get(alert.employee_id)?.name ?? null) : null
                }
                onView={() => {}}
                onResolve={() => {}}
                onIgnore={() => {}}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Colaboradores em alto desempenho"
          description="Pessoas com melhores indicadores recentes."
        >
          {highlights.length === 0 ? (
            <EmptyState
              title="Ainda não há destaques para mostrar"
              description="Registre KPIs e avaliações para identificar quem está performando bem."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {highlights.slice(0, 4).map((item) => (
                <EmployeeMiniCard
                  key={item.employee.id}
                  name={item.employee.name}
                  role={item.employee.role}
                  department={departmentName.get(item.employee.department_id ?? "") ?? null}
                  avatarUrl={item.employee.avatar_url}
                  score={item.current}
                  highlight="Score acima de 90 na última avaliação."
                  onOpen={() => {}}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Colaboradores que precisam de atenção"
          description="Foco em desenvolvimento, alinhamento e remoção de bloqueios."
        >
          {attention.length === 0 ? (
            <EmptyState
              title="Ninguém em atenção neste momento"
              description="Sem registros de queda de score ou pendências importantes."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {attention.slice(0, 4).map((item) => {
                const delta =
                  item.previous !== null ? Number(item.current) - Number(item.previous) : null;

                return (
                  <EmployeeMiniCard
                    key={item.employee.id}
                    name={item.employee.name}
                    role={item.employee.role}
                    department={departmentName.get(item.employee.department_id ?? "") ?? null}
                    avatarUrl={item.employee.avatar_url}
                    score={item.current}
                    delta={delta}
                    reason={
                      delta !== null && delta < 0
                        ? "Queda no score em relação à última avaliação."
                        : "Score em faixa de atenção."
                    }
                    suggestedAction="Agendar uma 1:1 e revisar metas, entregas e bloqueios."
                    actionLabel="Abrir perfil"
                    onOpen={() => {}}
                  />
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Evolução de performance"
        description="Score médio da equipe ao longo do período selecionado."
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
        description="Quantidade de colaboradores em cada faixa de score."
      >
        {scoredActive.length === 0 ? (
          <EmptyState
            title="Ainda não há dados suficientes para esta distribuição"
            description="Cadastre colaboradores e registre avaliações para visualizar a faixa de cada pessoa."
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

      <SectionCard
        title="Próximas ações gerenciais"
        description="Sugestões com base nos indicadores atuais do efetivo."
      >
        {recommended.length === 0 ? (
          <EmptyState
            title="Sem ações recomendadas no momento"
            description="Conforme novos dados forem registrados, sugestões personalizadas aparecerão aqui."
          />
        ) : (
          <ul className="divide-y divide-border">
            {recommended.map((item) => (
              <li
                key={item.title}
                className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.reason}</p>
                </div>
                <div className="flex items-center gap-2">
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
                  <Button size="sm" variant="outline">
                    Ver ação
                  </Button>
                </div>
              </li>
            ))}
          </ul>
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
