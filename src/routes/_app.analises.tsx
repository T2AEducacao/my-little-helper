import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { gerarAnaliseEmpresa } from "@/lib/analises-ai.functions";
import { Loader2, Wand2 } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  LineChart as LineChartIcon,
  ListChecks,
  Minus,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/php/EmptyState";
import { FilterBar } from "@/components/php/FilterBar";
import { PageHeader } from "@/components/php/PageHeader";
import { SectionCard } from "@/components/php/SectionCard";
import { SCORE_RANGES, scoreLabel, scoreToStatus, type ScoreStatus } from "@/components/php/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  buildEvolutionSeries,
  initials,
  latestSnapshotsByEmployee,
  useDepartments,
  useEmployees,
  type DepartmentRow,
} from "@/lib/php-data";
import {
  usePerformanceWorkspaceData,
  type PerformanceEmployee,
} from "@/features/performance/workspace-data";

export const Route = createFileRoute("/_app/analises")({
  head: () => ({
    meta: [
      { title: "Análises · Performativo" },
      {
        name: "description",
        content:
          "Painel executivo de performance: tendências, comparativos entre áreas, carga dos gestores e distribuição da equipe.",
      },
    ],
  }),
  component: AnalisesPage,
});

// =============================================================
// Range filter
// =============================================================
const RANGE_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
] as const;
type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];
const RANGE_LABEL: Record<RangeValue, string> = {
  "7": "últimos 7 dias",
  "30": "últimos 30 dias",
  "90": "últimos 90 dias",
};

// =============================================================
// Modelo único — todos os blocos consomem este objeto
// =============================================================
type ScoredEmployee = {
  employee: PerformanceEmployee;
  current: number;
  previous: number | null;
  delta: number | null;
  status: ScoreStatus;
};

type AreaStat = {
  id: string | null;
  name: string;
  headcount: number;
  scoredCount: number;
  avg: number | null;
  prevAvg: number | null;
  delta: number | null;
  attentionShare: number;
  riskShare: number;
  concernCount: number;
};

type ManagerStat = {
  id: string;
  name: string;
  reportsCount: number;
  good: number;
  attention: number;
  risk: number;
  critical: number;
};

type DistributionItem = {
  status: ScoreStatus;
  count: number;
  share: number;
};

type Bottleneck = {
  id: string;
  subject: string;
  fact: string;
  tone: "critical" | "risk" | "attention";
  to: "/alertas" | "/metas" | "/colaboradores";
  ctaLabel: string;
};

type AnaliseModel = {
  range: RangeValue;
  rangeLabel: string;
  scored: ScoredEmployee[];
  activeCount: number;
  teamScore: number | null;
  teamDelta: number | null;
  attentionRiskShare: number;
  attentionRiskCount: number;
  alertsCount: number;
  criticalAlertsCount: number;
  goalsAtRiskCount: number;
  evolution: { date: string; score: number }[];
  evolutionDelta: number | null;
  areas: AreaStat[];
  topRisingAreas: AreaStat[];
  topFallingAreas: AreaStat[];
  managers: ManagerStat[];
  distribution: DistributionItem[];
  bottlenecks: Bottleneck[];
};

function useAnaliseModel(range: RangeValue): AnaliseModel {
  const { data: employees = [] } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const workspace = usePerformanceWorkspaceData(employees);

  return useMemo(() => {
    const all = workspace.employees;
    const active = all.filter((e) => e.status !== "inactive");
    const latest = latestSnapshotsByEmployee(workspace.snapshots);

    const scored: ScoredEmployee[] = active
      .map((employee) => {
        const snap = latest.get(employee.id);
        if (!snap || snap.current === null) return null;
        const current = Number(snap.current);
        const previous = snap.previous !== null ? Number(snap.previous) : null;
        return {
          employee,
          current,
          previous,
          delta: previous !== null ? current - previous : null,
          status: scoreToStatus(current),
        } satisfies ScoredEmployee;
      })
      .filter((x): x is ScoredEmployee => x !== null);

    const teamScore =
      scored.length > 0 ? scored.reduce((s, x) => s + x.current, 0) / scored.length : null;
    const withPrev = scored.filter((x) => x.previous !== null);
    const teamDelta =
      withPrev.length > 0
        ? withPrev.reduce((s, x) => s + (x.current - (x.previous ?? 0)), 0) / withPrev.length
        : null;

    const attentionRiskCount = scored.filter(
      (x) => x.status === "attention" || x.status === "risk" || x.status === "critical",
    ).length;
    const attentionRiskShare = scored.length > 0 ? attentionRiskCount / scored.length : 0;

    const alerts = workspace.actions;
    const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;
    const goalsAtRisk = workspace.goals.filter((g) => g.status === "risk").length;

    const evolution = buildEvolutionSeries(workspace.snapshots, Number(range));
    const evolutionDelta =
      evolution.length >= 2
        ? evolution[evolution.length - 1].score - evolution[0].score
        : null;

    const areas = buildAreaStats(active, scored, departments);
    const topRisingAreas = [...areas]
      .filter((a) => a.delta !== null && a.scoredCount > 0 && (a.delta ?? 0) > 0)
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
      .slice(0, 3);
    const topFallingAreas = [...areas]
      .filter((a) => a.delta !== null && a.scoredCount > 0 && (a.delta ?? 0) < 0)
      .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
      .slice(0, 3);

    const managers = buildManagerStats(active, scored);
    const distribution = buildDistributionLocal(scored);
    const bottlenecks = buildBottlenecks({
      areas,
      managers,
      criticalAlerts,
      goalsAtRisk,
      workspaceGoals: workspace.goals,
      departments,
    });

    return {
      range,
      rangeLabel: RANGE_LABEL[range],
      scored,
      activeCount: active.length,
      teamScore,
      teamDelta,
      attentionRiskShare,
      attentionRiskCount,
      alertsCount: alerts.length,
      criticalAlertsCount: criticalAlerts,
      goalsAtRiskCount: goalsAtRisk,
      evolution,
      evolutionDelta,
      areas,
      topRisingAreas,
      topFallingAreas,
      managers,
      distribution,
      bottlenecks,
    } satisfies AnaliseModel;
  }, [employees, departments, workspace, range]);
}

function buildAreaStats(
  active: PerformanceEmployee[],
  scored: ScoredEmployee[],
  departments: DepartmentRow[],
): AreaStat[] {
  const headByArea = new Map<string | null, PerformanceEmployee[]>();
  for (const e of active) {
    const list = headByArea.get(e.department_id) ?? [];
    list.push(e);
    headByArea.set(e.department_id, list);
  }
  const scoredByArea = new Map<string | null, ScoredEmployee[]>();
  for (const s of scored) {
    const list = scoredByArea.get(s.employee.department_id) ?? [];
    list.push(s);
    scoredByArea.set(s.employee.department_id, list);
  }
  const deptName = new Map(departments.map((d) => [d.id, d.name] as const));

  const result: AreaStat[] = [];
  for (const [areaId, members] of headByArea.entries()) {
    const scoredMembers = scoredByArea.get(areaId) ?? [];
    const avg =
      scoredMembers.length > 0
        ? scoredMembers.reduce((s, x) => s + x.current, 0) / scoredMembers.length
        : null;
    const withPrev = scoredMembers.filter((x) => x.previous !== null);
    const prevAvg =
      withPrev.length > 0
        ? withPrev.reduce((s, x) => s + (x.previous ?? 0), 0) / withPrev.length
        : null;
    const delta = avg !== null && prevAvg !== null ? avg - prevAvg : null;
    const attention = scoredMembers.filter((x) => x.status === "attention").length;
    const risk = scoredMembers.filter((x) => x.status === "risk" || x.status === "critical").length;
    const concernCount = attention + risk;

    result.push({
      id: areaId,
      name: areaId ? (deptName.get(areaId) ?? "Sem área") : "Sem área",
      headcount: members.length,
      scoredCount: scoredMembers.length,
      avg,
      prevAvg,
      delta,
      attentionShare: scoredMembers.length > 0 ? attention / scoredMembers.length : 0,
      riskShare: scoredMembers.length > 0 ? risk / scoredMembers.length : 0,
      concernCount,
    });
  }
  return result.sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
}

function buildManagerStats(
  active: PerformanceEmployee[],
  scored: ScoredEmployee[],
): ManagerStat[] {
  const nameById = new Map(active.map((e) => [e.id, e.name] as const));
  const reportsByMgr = new Map<string, PerformanceEmployee[]>();
  for (const e of active) {
    if (!e.manager_id) continue;
    const list = reportsByMgr.get(e.manager_id) ?? [];
    list.push(e);
    reportsByMgr.set(e.manager_id, list);
  }
  const scoredById = new Map(scored.map((s) => [s.employee.id, s] as const));

  const result: ManagerStat[] = [];
  for (const [mgrId, reports] of reportsByMgr.entries()) {
    let good = 0,
      attention = 0,
      risk = 0,
      critical = 0;
    for (const r of reports) {
      const s = scoredById.get(r.id);
      if (!s) continue;
      if (s.status === "excellent" || s.status === "good") good++;
      else if (s.status === "attention") attention++;
      else if (s.status === "risk") risk++;
      else if (s.status === "critical") critical++;
    }
    result.push({
      id: mgrId,
      name: nameById.get(mgrId) ?? "Gestor",
      reportsCount: reports.length,
      good,
      attention,
      risk,
      critical,
    });
  }
  return result.sort(
    (a, b) => b.critical + b.risk + b.attention - (a.critical + a.risk + a.attention),
  );
}

function buildDistributionLocal(scored: ScoredEmployee[]): DistributionItem[] {
  const order: ScoreStatus[] = ["excellent", "good", "attention", "risk", "critical"];
  const total = scored.length || 1;
  return order.map((status) => {
    const count = scored.filter((x) => x.status === status).length;
    return { status, count, share: count / total };
  });
}

function buildBottlenecks(args: {
  areas: AreaStat[];
  managers: ManagerStat[];
  criticalAlerts: number;
  goalsAtRisk: number;
  workspaceGoals: { status: string; employee_id?: string | null }[];
  departments: DepartmentRow[];
}): Bottleneck[] {
  const out: Bottleneck[] = [];

  // Áreas com concentração de atenção/risco ≥30%
  const concerning = args.areas
    .filter((a) => a.scoredCount >= 2)
    .map((a) => ({ area: a, share: a.attentionShare + a.riskShare }))
    .filter(({ share }) => share >= 0.3)
    .sort((a, b) => b.share - a.share)
    .slice(0, 2);
  for (const { area, share } of concerning) {
    out.push({
      id: `area-share-${area.id ?? "none"}`,
      subject: area.name,
      fact: `${Math.round(share * 100)}% em atenção ou risco (${area.concernCount} de ${area.scoredCount} pessoas).`,
      tone: share >= 0.5 ? "critical" : "risk",
      to: "/colaboradores",
      ctaLabel: "Ver pessoas",
    });
  }

  // Áreas com queda ≥ 3 pts
  const falling = args.areas
    .filter((a) => a.delta !== null && a.scoredCount >= 2 && (a.delta ?? 0) <= -3)
    .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
    .slice(0, 2);
  for (const a of falling) {
    out.push({
      id: `area-drop-${a.id ?? "none"}`,
      subject: a.name,
      fact: `queda média de ${Math.abs(a.delta ?? 0).toFixed(1)} pts no período.`,
      tone: (a.delta ?? 0) <= -5 ? "critical" : "risk",
      to: "/colaboradores",
      ctaLabel: "Ver pessoas",
    });
  }

  // Gestores com ≥2 liderados em risco/crítico
  const overloaded = args.managers
    .filter((m) => m.risk + m.critical >= 2)
    .slice(0, 2);
  for (const m of overloaded) {
    out.push({
      id: `mgr-${m.id}`,
      subject: m.name,
      fact: `${m.risk + m.critical} de ${m.reportsCount} liderados em risco ou crítico.`,
      tone: m.critical > 0 ? "critical" : "risk",
      to: "/colaboradores",
      ctaLabel: "Ver equipe",
    });
  }

  // Área com mais metas em risco
  if (args.goalsAtRisk > 0) {
    const goalsRiskByArea = new Map<string | null, number>();
    const deptByEmp = new Map<string, string | null>();
    // We don't have employees here; fallback to total count.
    void goalsRiskByArea;
    void deptByEmp;
    out.push({
      id: "goals-risk",
      subject: "Metas em risco",
      fact: `${args.goalsAtRisk} meta(s) com progresso aquém do necessário.`,
      tone: args.goalsAtRisk >= 3 ? "risk" : "attention",
      to: "/metas",
      ctaLabel: "Abrir metas",
    });
  }

  // Alertas críticos abertos
  if (args.criticalAlerts > 0) {
    out.push({
      id: "critical-alerts",
      subject: "Alertas críticos",
      fact: `${args.criticalAlerts} sem resolução.`,
      tone: "critical",
      to: "/alertas",
      ctaLabel: "Abrir ações",
    });
  }

  return out.slice(0, 6);
}

// =============================================================
// Página
// =============================================================
function AnalisesPage() {
  const [range, setRange] = useState<RangeValue>("30");
  const model = useAnaliseModel(range);
  const [aiOpen, setAiOpen] = useState(false);

  const callAi = useServerFn(gerarAnaliseEmpresa);
  const aiMutation = useMutation({
    mutationFn: () =>
      callAi({
        data: {
          rangeLabel: model.rangeLabel,
          activeCount: model.activeCount,
          teamScore: model.teamScore,
          teamDelta: model.teamDelta,
          attentionRiskCount: model.attentionRiskCount,
          attentionRiskShare: model.attentionRiskShare,
          alertsCount: model.alertsCount,
          criticalAlertsCount: model.criticalAlertsCount,
          goalsAtRiskCount: model.goalsAtRiskCount,
          evolutionDelta: model.evolutionDelta,
          topRisingAreas: model.topRisingAreas.slice(0, 5).map((a) => ({
            name: a.name,
            score: a.score,
            delta: a.delta,
            count: a.scoredCount,
            riskCount: a.riskCount ?? 0,
          })),
          topFallingAreas: model.topFallingAreas.slice(0, 5).map((a) => ({
            name: a.name,
            score: a.score,
            delta: a.delta,
            count: a.scoredCount,
            riskCount: a.riskCount ?? 0,
          })),
          bottlenecks: model.bottlenecks.slice(0, 10).map((b) => b.title),
        },
      }),
  });

  const openAndRun = () => {
    setAiOpen(true);
    if (!aiMutation.isPending) aiMutation.mutate();
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Análises"
        description="Leitura objetiva da performance da empresa: padrões, comparativos e evolução nos dados."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FilterBar<RangeValue>
              value={range}
              onChange={setRange}
              options={[...RANGE_OPTIONS]}
            />
            <Button onClick={openAndRun} className="gap-2">
              <Wand2 className="h-4 w-4" />
              Analisar com IA
            </Button>
          </div>
        }
      />

      <ExecutiveSummaryBlock model={model} />
      <TrendBlock model={model} range={range} onRangeChange={setRange} />
      <AreaComparisonBlock model={model} />
      <AreaRankingsBlock model={model} />
      <ManagerLoadBlock model={model} />
      <DistributionBlock model={model} />
      <BottlenecksBlock model={model} />

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Análise da empresa
            </DialogTitle>
            <DialogDescription>
              Resumo gerado por IA com base nos {model.rangeLabel}.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {aiMutation.isPending && (
              <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando análise…
              </div>
            )}
            {aiMutation.isError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Não foi possível gerar a análise agora. Tente novamente em instantes.
              </div>
            )}
            {aiMutation.isSuccess && aiMutation.data && (
              <article className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{aiMutation.data.analysis}</ReactMarkdown>
              </article>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => aiMutation.mutate()}
              disabled={aiMutation.isPending}
            >
              Gerar novamente
            </Button>
            <Button onClick={() => setAiOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================
// Bloco 1 — Resumo executivo
// =============================================================
function ExecutiveSummaryBlock({ model }: { model: AnaliseModel }) {
  const cards: ExecCard[] = [
    {
      label: "Score médio da equipe",
      value: model.teamScore !== null ? Math.round(model.teamScore).toString() : "—",
      hint:
        model.teamScore !== null
          ? scoreLabel(scoreToStatus(model.teamScore))
          : "Sem dados no período",
      delta: model.teamDelta,
      deltaSuffix: "pts",
      icon: Sparkles,
    },
    {
      label: "Em atenção ou risco",
      value:
        model.scored.length > 0
          ? `${Math.round(model.attentionRiskShare * 100)}%`
          : "—",
      hint:
        model.scored.length > 0
          ? `${model.attentionRiskCount} de ${model.scored.length} pessoas`
          : "Sem KPIs registrados",
      tone:
        model.attentionRiskShare >= 0.3
          ? "risk"
          : model.attentionRiskShare >= 0.15
            ? "attention"
            : "good",
      icon: AlertTriangle,
    },
    {
      label: "Alertas abertos",
      value: model.alertsCount.toString(),
      hint:
        model.criticalAlertsCount > 0
          ? `${model.criticalAlertsCount} crítico(s)`
          : "Nenhum crítico no momento",
      tone:
        model.criticalAlertsCount > 0
          ? "critical"
          : model.alertsCount > 0
            ? "attention"
            : "good",
      icon: ListChecks,
    },
    {
      label: "Metas em risco",
      value: model.goalsAtRiskCount.toString(),
      hint: model.goalsAtRiskCount > 0 ? "Progresso aquém do necessário" : "Nenhuma meta em risco",
      tone:
        model.goalsAtRiskCount >= 2
          ? "risk"
          : model.goalsAtRiskCount === 1
            ? "attention"
            : "good",
      icon: Target,
    },
  ];

  return (
    <SectionCard
      title="Resumo executivo"
      description={`Pulso atual da empresa, comparado aos ${model.rangeLabel}.`}
      contentClassName="px-0 pb-0 pt-0"
    >
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {cards.map((card, i) => (
          <ExecutiveSummaryCard key={i} card={card} />
        ))}
      </div>
    </SectionCard>
  );
}

type ExecTone = "good" | "attention" | "risk" | "critical";
type ExecCard = {
  label: string;
  value: string;
  hint: string;
  delta?: number | null;
  deltaSuffix?: string;
  tone?: ExecTone;
  icon: typeof Sparkles;
};

function ExecutiveSummaryCard({ card }: { card: ExecCard }) {
  const toneBg: Record<ExecTone, string> = {
    good: "bg-status-good-soft text-status-good",
    attention: "bg-status-attention-soft text-status-attention-foreground",
    risk: "bg-status-risk-soft text-status-risk",
    critical: "bg-status-critical-soft text-status-critical",
  };
  const Icon = card.icon;
  const iconClass = card.tone ? toneBg[card.tone] : "bg-muted text-muted-foreground";

  return (
    <div className="flex items-start gap-3 p-5">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {card.label}
        </div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{card.value}</span>
          {card.delta !== undefined && card.delta !== null && (
            <DeltaTag value={card.delta} suffix={card.deltaSuffix} />
          )}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{card.hint}</div>
      </div>
    </div>
  );
}

// =============================================================
// Bloco 2 — Tendência da empresa
// =============================================================
function TrendBlock({
  model,
  range,
  onRangeChange,
}: {
  model: AnaliseModel;
  range: RangeValue;
  onRangeChange: (v: RangeValue) => void;
}) {
  return (
    <SectionCard
      title="Tendência da empresa"
      description="Score médio diário no período."
      action={
        <div className="flex items-center gap-3">
          {model.evolutionDelta !== null && (
            <DeltaTag value={model.evolutionDelta} suffix="pts no período" />
          )}
          <FilterBar<RangeValue>
            value={range}
            onChange={onRangeChange}
            options={[...RANGE_OPTIONS]}
          />
        </div>
      }
    >
      {model.evolution.length < 2 ? (
        <EmptyState
          icon={LineChartIcon}
          title="Histórico insuficiente"
          description="Conforme novas avaliações forem registradas, a tendência aparecerá aqui."
        />
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={model.evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
  );
}

// =============================================================
// Bloco 3 — Comparativo entre áreas
// =============================================================
function AreaComparisonBlock({ model }: { model: AnaliseModel }) {
  return (
    <SectionCard
      title="Comparativo entre áreas"
      description="Score médio, variação no período e concentração em atenção+risco."
      action={
        <Button asChild variant="ghost" size="sm">
          <Link to="/colaboradores">
            Ver pessoas
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      }
      contentClassName="px-0 pb-0 pt-0"
    >
      {model.areas.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            icon={BarChart3}
            title="Nenhuma área para comparar"
            description="Cadastre áreas e registre KPIs para liberar este comparativo."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-2 text-left">Área</th>
                <th className="px-3 py-2 text-right">Pessoas</th>
                <th className="px-3 py-2 text-left">Score médio</th>
                <th className="px-3 py-2 text-right">Δ período</th>
                <th className="px-3 py-2 text-right">Em atenção+risco</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody>
              {model.areas.map((area) => (
                <AreaRow key={area.id ?? "none"} area={area} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function AreaRow({ area }: { area: AreaStat }) {
  const status = scoreToStatus(area.avg);
  const fill: Record<ScoreStatus, string> = {
    excellent: "bg-status-excellent",
    good: "bg-status-good",
    attention: "bg-status-attention",
    risk: "bg-status-risk",
    critical: "bg-status-critical",
    neutral: "bg-status-neutral",
  };
  const concern = area.attentionShare + area.riskShare;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/20">
      <td className="px-5 py-3">
        <div className="font-medium text-foreground">{area.name}</div>
      </td>
      <td className="px-3 py-3 text-right text-xs tabular-nums text-muted-foreground">
        {area.headcount}
      </td>
      <td className="px-3 py-3">
        {area.avg === null ? (
          <span className="text-xs text-muted-foreground">Sem dados</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-8 text-sm font-medium tabular-nums text-foreground">
              {Math.round(area.avg)}
            </span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", fill[status])}
                style={{ width: `${Math.max(0, Math.min(100, area.avg))}%` }}
              />
            </div>
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        {area.delta === null ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <DeltaTag value={area.delta} suffix="pts" compact />
        )}
      </td>
      <td className="px-3 py-3 text-right text-xs tabular-nums">
        {area.scoredCount === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span
            className={cn(
              "font-medium",
              concern >= 0.4
                ? "text-status-risk"
                : concern >= 0.2
                  ? "text-status-attention-foreground"
                  : "text-muted-foreground",
            )}
          >
            {Math.round(concern * 100)}%
          </span>
        )}
      </td>
      <td className="px-5 py-3 text-right">
        <Button asChild variant="ghost" size="icon" className="h-7 w-7">
          <Link to="/colaboradores" aria-label={`Ver pessoas de ${area.name}`}>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </td>
    </tr>
  );
}

// =============================================================
// Bloco 4 — Ranking de áreas
// =============================================================
function AreaRankingsBlock({ model }: { model: AnaliseModel }) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <SectionCard
        title="Maiores altas"
        description="Áreas com maior aumento de score no período."
      >
        {model.topRisingAreas.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Sem áreas em alta"
            description="Nenhuma área registrou avanço significativo no período."
          />
        ) : (
          <ul className="space-y-2">
            {model.topRisingAreas.map((area, i) => (
              <RankingRow key={area.id ?? `up-${i}`} rank={i + 1} area={area} tone="good" />
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Maiores quedas"
        description="Áreas com maior recuo de score no período."
      >
        {model.topFallingAreas.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Sem áreas em queda"
            description="Todas as áreas mantêm ou melhoram o score no período."
          />
        ) : (
          <ul className="space-y-2">
            {model.topFallingAreas.map((area, i) => (
              <RankingRow key={area.id ?? `dn-${i}`} rank={i + 1} area={area} tone="risk" />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function RankingRow({
  rank,
  area,
  tone,
}: {
  rank: number;
  area: AreaStat;
  tone: "good" | "risk";
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 hover:bg-muted/20">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
          tone === "good"
            ? "bg-status-good-soft text-status-good"
            : "bg-status-risk-soft text-status-risk",
        )}
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{area.name}</div>
        <div className="text-xs text-muted-foreground">
          {area.headcount} pessoa(s) ·{" "}
          {area.avg !== null ? `score ${Math.round(area.avg)}` : "sem score"}
        </div>
      </div>
      {area.delta !== null && <DeltaTag value={area.delta} suffix="pts" compact />}
      <Button asChild variant="ghost" size="icon" className="h-7 w-7">
        <Link to="/colaboradores" aria-label={`Abrir ${area.name}`}>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </li>
  );
}

// =============================================================
// Bloco 5 — Carga dos gestores
// =============================================================
function ManagerLoadBlock({ model }: { model: AnaliseModel }) {
  return (
    <SectionCard
      title="Carga dos gestores"
      description="Distribuição dos liderados de cada gestor por faixa de desempenho."
      action={
        <Button asChild variant="ghost" size="sm">
          <Link to="/colaboradores">
            Ver pessoas
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      }
    >
      {model.managers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sem dados de gestão"
          description="Vincule liderados a gestores para visualizar esta análise."
        />
      ) : (
        <div className="space-y-2">
          {model.managers.slice(0, 6).map((m) => (
            <ManagerRow key={m.id} manager={m} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ManagerRow({ manager }: { manager: ManagerStat }) {
  const total = manager.good + manager.attention + manager.risk + manager.critical;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <Link
      to="/colaboradores"
      className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] items-center gap-4 rounded-lg border border-border bg-card px-3 py-2.5 hover:bg-muted/20"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-primary/10 text-[11px] text-primary">
            {initials(manager.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{manager.name}</div>
          <div className="text-xs text-muted-foreground">{manager.reportsCount} liderado(s)</div>
        </div>
      </div>

      <div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
          {manager.good > 0 && (
            <span
              className="h-full bg-status-good"
              style={{ width: `${pct(manager.good)}%` }}
              title={`${manager.good} bom/excelente`}
            />
          )}
          {manager.attention > 0 && (
            <span
              className="h-full bg-status-attention"
              style={{ width: `${pct(manager.attention)}%` }}
              title={`${manager.attention} em atenção`}
            />
          )}
          {manager.risk > 0 && (
            <span
              className="h-full bg-status-risk"
              style={{ width: `${pct(manager.risk)}%` }}
              title={`${manager.risk} em risco`}
            />
          )}
          {manager.critical > 0 && (
            <span
              className="h-full bg-status-critical"
              style={{ width: `${pct(manager.critical)}%` }}
              title={`${manager.critical} crítico`}
            />
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-muted-foreground">
          <span>{manager.good} bom</span>
          <span>·</span>
          <span>{manager.attention} atenção</span>
          <span>·</span>
          <span className={manager.risk + manager.critical > 0 ? "text-status-risk" : ""}>
            {manager.risk + manager.critical} risco
          </span>
        </div>
      </div>

      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

// =============================================================
// Bloco 6 — Distribuição de performance
// =============================================================
function DistributionBlock({ model }: { model: AnaliseModel }) {
  const total = model.scored.length;
  const fill: Record<ScoreStatus, string> = {
    excellent: "bg-status-excellent",
    good: "bg-status-good",
    attention: "bg-status-attention",
    risk: "bg-status-risk",
    critical: "bg-status-critical",
    neutral: "bg-status-neutral",
  };

  return (
    <SectionCard
      title="Distribuição de performance"
      description="Composição da equipe scored por faixa de desempenho."
    >
      {total === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Sem distribuição para mostrar"
          description="Registre KPIs para visualizar a faixa de cada pessoa."
        />
      ) : (
        <div className="space-y-3">
          <div className="flex h-3 w-full overflow-hidden rounded-full border border-border bg-muted">
            {model.distribution.map((item) =>
              item.count === 0 ? null : (
                <span
                  key={item.status}
                  className={fill[item.status]}
                  style={{ width: `${item.share * 100}%` }}
                  title={`${SCORE_RANGES.find((r) => r.status === item.status)?.label}: ${item.count}`}
                />
              ),
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {model.distribution.map((item) => {
              const range = SCORE_RANGES.find((r) => r.status === item.status);
              return (
                <Link
                  key={item.status}
                  to="/colaboradores"
                  className="rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-muted/20"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", fill[item.status])} />
                    <span className="text-xs font-medium text-foreground">{range?.label}</span>
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {item.count}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({Math.round(item.share * 100)}%)
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// =============================================================
// Bloco 7 — Principais gargalos identificados
// (apenas fatos agregados — não recomenda ações)
// =============================================================
function BottlenecksBlock({ model }: { model: AnaliseModel }) {
  return (
    <SectionCard
      title="Principais gargalos identificados"
      description="Observações factuais extraídas dos dados do período. A ação acontece nas telas de destino."
    >
      {model.bottlenecks.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nenhum gargalo relevante"
          description="A leitura agregada do período não acusou concentrações de risco."
        />
      ) : (
        <ul className="space-y-2">
          {model.bottlenecks.map((b) => (
            <BottleneckRow key={b.id} item={b} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function BottleneckRow({ item }: { item: Bottleneck }) {
  const stripe: Record<Bottleneck["tone"], string> = {
    critical: "bg-status-critical",
    risk: "bg-status-risk",
    attention: "bg-status-attention",
  };
  return (
    <li className="relative flex items-start gap-3 rounded-lg border border-border bg-card py-3 pl-4 pr-3 hover:bg-muted/20">
      <span
        aria-hidden
        className={cn("absolute inset-y-2 left-0 w-[3px] rounded-full", stripe[item.tone])}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          <span className="font-medium">{item.subject}:</span>{" "}
          <span className="text-muted-foreground">{item.fact}</span>
        </p>
      </div>
      <Button asChild variant="ghost" size="sm" className="shrink-0 text-xs">
        <Link to={item.to}>
          {item.ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </li>
  );
}

// =============================================================
// Util visual
// =============================================================
function DeltaTag({
  value,
  suffix,
  compact,
}: {
  value: number;
  suffix?: string;
  compact?: boolean;
}) {
  const tone =
    value > 0.1
      ? "text-status-good"
      : value < -0.1
        ? "text-status-risk"
        : "text-muted-foreground";
  const Icon = value > 0.1 ? ArrowUpRight : value < -0.1 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium tabular-nums",
        compact ? "text-xs" : "text-xs",
        tone,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}
      {suffix && <span className="ml-1 font-normal text-muted-foreground">{suffix}</span>}
    </span>
  );
}

// Mantém ícones disponíveis para uso futuro sem reimport
void TrendingDown;
