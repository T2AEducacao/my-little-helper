import { Button } from "@/components/ui/button";
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
  ClipboardCheck,
  LineChart as LineChartIcon,
  MessageSquare,
  Sparkles,
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
      { title: "Dashboard de Performance · People Performance Hub" },
      {
        name: "description",
        content:
          "Acompanhe metas, entregas, evolução e feedbacks da sua equipe com clareza e foco em desenvolvimento.",
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
    () => new Map(departments.map((d) => [d.id, d.name] as const)),
    [departments],
  );
  const employeeById = useMemo(
    () => new Map(employees.map((e) => [e.id, e] as const)),
    [employees],
  );
  const latest = useMemo(() => latestSnapshotsByEmployee(snapshots), [snapshots]);

  const activeEmployees = employees.filter((e) => e.status === "active");

  const scoredActive = activeEmployees
    .map((e) => {
      const l = latest.get(e.id);
      return { employee: e, current: l?.current ?? null, previous: l?.previous ?? null };
    })
    .filter((x) => x.current !== null) as {
      employee: (typeof employees)[number];
      current: number;
      previous: number | null;
    }[];

  const teamScore =
    scoredActive.length > 0
      ? scoredActive.reduce((sum, x) => sum + Number(x.current), 0) / scoredActive.length
      : null;

  const highlights = scoredActive.filter((x) => x.current >= 90);
  const attention = scoredActive
    .filter((x) => x.current >= 40 && x.current <= 74)
    .sort((a, b) => {
      const da = (a.current ?? 0) - (a.previous ?? a.current ?? 0);
      const db = (b.current ?? 0) - (b.previous ?? b.current ?? 0);
      return da - db; // bigger drops first
    });

  const openAlerts = alerts;
  const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;
  const attentionAlerts = alerts.filter((a) => a.severity === "attention").length;

  const sortedAlerts = [...openAlerts].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  const distribution = buildDistribution(employees, latest);
  const series = buildEvolutionSeries(snapshots, Number(range));

  const recommended = useMemo(() => {
    const items: { title: string; reason: string; priority: "alta" | "média" | "baixa" }[] = [];
    const drops = scoredActive.filter(
      (x) => x.previous !== null && (x.current ?? 0) - (x.previous ?? 0) <= -5,
    );
    if (drops.length > 0) {
      items.push({
        title: `Fazer 1:1 com ${drops.length} colaborador(es) com queda de score`,
        reason: "Quedas recentes podem indicar bloqueios ou desmotivação.",
        priority: "alta",
      });
    }
    if (criticalAlerts > 0) {
      items.push({
        title: `Revisar ${criticalAlerts} alerta(s) crítico(s)`,
        reason: "Alertas críticos exigem ação imediata.",
        priority: "alta",
      });
    }
    if (highlights.length > 0) {
      items.push({
        title: `Reconhecer ${highlights.length} pessoa(s) em alta performance`,
        reason: "Reforço positivo sustenta consistência ao longo do tempo.",
        priority: "média",
      });
    }
    if (activeEmployees.length > 0 && scoredActive.length < activeEmployees.length) {
      items.push({
        title: "Registrar avaliação dos colaboradores sem snapshot",
        reason: `${activeEmployees.length - scoredActive.length} pessoa(s) ainda sem score recente.`,
        priority: "média",
      });
    }
    return items;
  }, [scoredActive, criticalAlerts, highlights.length, activeEmployees.length]);

  const hasAnyEmployee = employees.length > 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <PageHeader
        title="Dashboard de Performance"
        description="Visão geral da equipe, evolução, riscos e ações recomendadas."
        actions={
          <>
            <Button variant="outline" size="sm">
              <UserPlus className="h-4 w-4" />
              Novo colaborador
            </Button>
            <Button variant="outline" size="sm">
              <ClipboardCheck className="h-4 w-4" />
              Registrar avaliação
            </Button>
            <Button size="sm">
              <Sparkles className="h-4 w-4" />
              Gerar insight IA
            </Button>
          </>
        }
      />

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ScoreCard
          score={teamScore}
          description={
            scoredActive.length > 0
              ? `Baseado em ${scoredActive.length} colaborador(es) ativo(s).`
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
              ? `${employees.length - activeEmployees.length} fora do ativo (férias, licença ou inativo).`
              : undefined
          }
        />
        <MetricCard
          label="Pessoas em destaque"
          icon={TrendingUp}
          value={highlights.length}
          isEmpty={scoredActive.length === 0}
          emptyMessage="Sem dados suficientes para identificar destaques."
          footer={highlights.length > 0 ? "Colaboradores com score ≥ 90." : undefined}
        />
        <MetricCard
          label="Pessoas em atenção"
          icon={AlertTriangle}
          value={attention.length}
          isEmpty={scoredActive.length === 0}
          emptyMessage="Sem dados suficientes para identificar atenção."
          footer={attention.length > 0 ? "Score entre 40 e 74. Priorize quem teve queda." : undefined}
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
          emptyMessage="Tabela de feedbacks ainda não populada. Disponível em breve."
        />
      </div>

      {/* Urgente agora */}
      <SectionCard
        title="Urgente agora"
        description="Alertas mais importantes em ordem de gravidade."
      >
        {sortedAlerts.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nenhum alerta crítico no momento"
            description="Continue acompanhando metas, feedbacks e avaliações para manter o radar atualizado."
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
                  alert.employee_id ? employeeById.get(alert.employee_id)?.name ?? null : null
                }
                onView={() => {}}
                onResolve={() => {}}
                onIgnore={() => {}}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Destaques + Atenção */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Pessoas em destaque"
          description="Colaboradores com melhor performance recente."
        >
          {highlights.length === 0 ? (
            <EmptyState
              title="Ainda não há destaques para mostrar"
              description="Registre avaliações para identificar quem está performando bem."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {highlights.slice(0, 4).map((x) => (
                <EmployeeMiniCard
                  key={x.employee.id}
                  name={x.employee.name}
                  role={x.employee.role}
                  department={departmentName.get(x.employee.department_id ?? "") ?? null}
                  avatarUrl={x.employee.avatar_url}
                  score={x.current}
                  highlight="Score acima de 90 na última avaliação."
                  onOpen={() => {}}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Pessoas que precisam de atenção"
          description="Tom cuidadoso: foco em desenvolvimento, não em julgamento."
        >
          {attention.length === 0 ? (
            <EmptyState
              title="Ninguém em atenção neste momento"
              description="Sem registros de queda de score ou pendências importantes."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {attention.slice(0, 4).map((x) => {
                const delta =
                  x.previous !== null ? Number(x.current) - Number(x.previous) : null;
                return (
                  <EmployeeMiniCard
                    key={x.employee.id}
                    name={x.employee.name}
                    role={x.employee.role}
                    department={departmentName.get(x.employee.department_id ?? "") ?? null}
                    avatarUrl={x.employee.avatar_url}
                    score={x.current}
                    delta={delta}
                    reason={
                      delta !== null && delta < 0
                        ? "Queda no score em relação à última avaliação."
                        : "Score em faixa de atenção."
                    }
                    suggestedAction="Agendar uma 1:1 e revisar metas e bloqueios."
                    actionLabel="Abrir perfil"
                    onOpen={() => {}}
                  />
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Gráfico evolução */}
      <SectionCard
        title="Evolução da equipe"
        description="Score médio ao longo do tempo."
        action={<FilterBar<RangeValue> value={range} onChange={setRange} options={[...RANGE_OPTIONS]} />}
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
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
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

      {/* Distribuição */}
      <SectionCard
        title="Distribuição de performance"
        description="Quantos colaboradores existem em cada faixa."
      >
        {scoredActive.length === 0 ? (
          <EmptyState
            title="Ainda não há dados suficientes para esta distribuição"
            description="Cadastre colaboradores e registre avaliações para visualizar a faixa de cada pessoa."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {distribution
              .filter((b) => b.status !== "neutral" || b.count > 0)
              .map((b) => (
                <DistributionRow
                  key={b.status}
                  status={b.status}
                  count={b.count}
                  total={activeEmployees.length}
                />
              ))}
          </div>
        )}
      </SectionCard>

      {/* Ações recomendadas */}
      <SectionCard
        title="Ações recomendadas para hoje"
        description="Sugestões geradas com base nos dados atuais."
      >
        {recommended.length === 0 ? (
          <EmptyState
            title="Sem ações recomendadas no momento"
            description="Conforme novos dados forem registrados, sugestões personalizadas aparecerão aqui."
          />
        ) : (
          <ul className="divide-y divide-border">
            {recommended.map((item, i) => (
              <li key={i} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
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
  const range = SCORE_RANGES.find((r) => r.status === status);
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <span className="text-sm tabular-nums text-muted-foreground">{count}</span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {range ? `Score ${range.min}–${range.max}` : "Sem score registrado"}
      </p>
      <div className="mt-3">
        <ProgressBar value={pct} tone={scoreToStatus(range ? (range.min + range.max) / 2 : null)} />
      </div>
    </div>
  );
}
