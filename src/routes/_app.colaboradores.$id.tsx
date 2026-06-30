import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  type LucideIcon,
  ArrowLeft,
  Pencil,
  ClipboardCheck,
  MessageSquare,
  CalendarPlus,
  Sparkles,
  Target,
  LineChart as LineChartIcon,
  Activity,
  History,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CalendarClock,
  Users,
  MapPin,
  Mail,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/php/PageHeader";
import { SectionCard } from "@/components/php/SectionCard";
import { StatusBadge } from "@/components/php/StatusBadge";
import { EmptyState } from "@/components/php/EmptyState";
import { ScoreCard } from "@/components/php/ScoreCard";
import { MetricCard } from "@/components/php/MetricCard";
import { AlertCard } from "@/components/php/AlertCard";
import { FilterBar } from "@/components/php/FilterBar";
import { EmployeeFormDialog } from "@/components/php/EmployeeFormDialog";
import { scoreToStatus, scoreLabel } from "@/components/php/types";
import {
  usePerformanceWorkspaceData,
  type PerformanceGoal,
} from "@/features/performance/workspace-data";
import {
  useEmployee,
  useEmployees,
  useDepartments,
  useEmployeeSnapshots,
  useEmployeeAlerts,
  useEmployeeActivity,
  buildEvolutionSeries,
  initials,
  STATUS_LABEL,
} from "@/lib/php-data";

const EMPLOYEE_PROFILE_TABS = [
  "overview",
  "goals",
  "indicators",
  "reviews",
  "feedbacks",
  "oneonone",
  "development",
  "history",
] as const;

type EmployeeProfileTab = (typeof EMPLOYEE_PROFILE_TABS)[number];

export const Route = createFileRoute("/_app/colaboradores/$id")({
  validateSearch: (search): { tab?: EmployeeProfileTab } => ({
    tab: parseEmployeeProfileTab(search.tab),
  }),
  component: EmployeeProfilePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="text-lg font-semibold">Colaborador não encontrado</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Este colaborador pode ter sido removido ou você não tem acesso.
      </p>
      <Button asChild className="mt-4" variant="outline">
        <Link to="/colaboradores">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para colaboradores
        </Link>
      </Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-md py-16 text-center text-sm text-status-risk">
      {error.message}
    </div>
  ),
});

function EmployeeProfilePage() {
  const { id } = useParams({ from: "/_app/colaboradores/$id" });
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/colaboradores/$id" });
  const { data: employee, isLoading } = useEmployee(id);
  const { data: employees = [] } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const { data: snapshots = [] } = useEmployeeSnapshots(id);
  const { data: alerts = [] } = useEmployeeAlerts(id);
  const { data: activity = [] } = useEmployeeActivity(id);
  const performanceData = usePerformanceWorkspaceData(employees);

  const [editOpen, setEditOpen] = useState(false);
  const [rangeDays, setRangeDays] = useState(90);

  const deptName = useMemo(
    () => departments.find((d) => d.id === employee?.department_id)?.name ?? "—",
    [departments, employee],
  );
  const managerName = useMemo(
    () => employees.find((e) => e.id === employee?.manager_id)?.name ?? "—",
    [employees, employee],
  );

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">Carregando perfil...</div>
    );
  }
  if (!employee) throw notFound();

  const latest = snapshots[0] ?? null;
  const previous = snapshots[1] ?? null;
  const diff =
    latest?.overall_score != null && previous?.overall_score != null
      ? latest.overall_score - previous.overall_score
      : null;
  const openAlerts = alerts.filter((a) => a.status === "open" || a.status === "analyzing");
  const employeeGoals = performanceData.goals.filter((goal) => goal.employee_id === employee.id);
  const decisionSummary = buildDecisionSummary({
    score: latest?.overall_score ?? null,
    diff,
    openAlerts,
    goals: employeeGoals,
  });
  const ActionIcon = decisionSummary.actionIcon;

  const placeholderTabs = new Set<EmployeeProfileTab>([
    "goals",
    "indicators",
    "reviews",
    "feedbacks",
    "oneonone",
    "development",
  ]);
  const activeTab: EmployeeProfileTab = tab ?? "overview";
  const scoreStatus = scoreToStatus(latest?.overall_score ?? null);

  return (
    <div className="space-y-5">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 text-xs text-muted-foreground"
        >
          <Link to="/colaboradores">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Colaboradores
          </Link>
        </Button>
      </div>

      {/* Hero: identity + state/next action */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
          <div className="flex items-start gap-4 p-5">
            <Avatar className="h-14 w-14 shrink-0">
              {employee.avatar_url && <AvatarImage src={employee.avatar_url} alt={employee.name} />}
              <AvatarFallback className="bg-primary/10 text-base font-medium text-primary">
                {initials(employee.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  {employee.name}
                </h1>
                {employee.status !== "active" && (
                  <StatusBadge tone="neutral">{STATUS_LABEL[employee.status]}</StatusBadge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {employee.role ?? "—"}
                {employee.seniority && <span className="text-muted-foreground/70"> · {employee.seniority}</span>}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                <MetaPill icon={Users} label="Área" value={deptName} />
                <MetaPill icon={Users} label="Gestor" value={managerName} />
                <MetaPill
                  icon={CalendarClock}
                  label="Entrada"
                  value={employee.hire_date ? formatDate(employee.hire_date) : "—"}
                />
                <MetaPill icon={MapPin} label="Local" value={employee.location ?? "—"} />
                <MetaPill icon={Mail} label="E-mail" value={employee.email ?? "—"} />
                {employee.contract_type && (
                  <MetaPill icon={ClipboardCheck} label="Contrato" value={employee.contract_type} />
                )}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex flex-col gap-3 border-t border-border p-5 lg:border-l lg:border-t-0",
              decisionSummary.tone === "critical" && "bg-status-critical/5",
              decisionSummary.tone === "attention" && "bg-status-attention/5",
              decisionSummary.tone === "good" && "bg-status-good/5",
              decisionSummary.tone === "info" && "bg-muted/30",
              decisionSummary.tone === "risk" && "bg-status-risk/5",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <StatusBadge tone={decisionSummary.tone}>{decisionSummary.statusLabel}</StatusBadge>
              <span className="text-[11px] font-medium text-muted-foreground">
                {decisionSummary.trendLabel}
              </span>
            </div>
            <p className="text-sm font-medium leading-5 text-foreground">{decisionSummary.reason}.</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm" onClick={() => toast(decisionSummary.actionToast)}>
                <ActionIcon className="h-4 w-4" />
                {decisionSummary.actionLabel}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border bg-muted/20 px-5 py-3">
          <StatItem
            label="Score"
            value={latest?.overall_score != null ? Math.round(latest.overall_score) : "—"}
            sublabel={latest ? scoreLabel(scoreStatus) : "Sem dados"}
            tone={scoreStatus}
          />
          <StatItem
            label="Tendência"
            value={
              diff === null ? (
                "—"
              ) : (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    diff > 0 && "text-status-good",
                    diff < 0 && "text-status-risk",
                  )}
                >
                  {diff > 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : diff < 0 ? (
                    <ArrowDownRight className="h-4 w-4" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                  {diff > 0 ? "+" : ""}
                  {diff.toFixed(1)}
                </span>
              )
            }
            sublabel="vs. período anterior"
          />
          <StatItem
            label="Alertas abertos"
            value={openAlerts.length}
            sublabel={openAlerts.length === 0 ? "Sem alertas" : "Requerem ação"}
            tone={openAlerts.length === 0 ? "good" : "attention"}
          />
          <StatItem
            label="Metas em risco"
            value={employeeGoals.filter((g) => g.status === "risk").length}
            sublabel={`${employeeGoals.length} meta(s) total`}
            tone={employeeGoals.some((g) => g.status === "risk") ? "risk" : "neutral"}
          />
          <StatItem
            label="Última avaliação"
            value={latest ? formatDate(latest.snapshot_date) : "—"}
            sublabel={latest ? "Snapshot recente" : "Pendente"}
          />
        </div>
      </div>

      {/* Tab strip */}
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          navigate({
            params: { id },
            search: {
              tab: value === "overview" ? undefined : parseEmployeeProfileTab(value),
            },
            replace: true,
          })
        }
        className="w-full"
      >
        <div className="-mx-1 overflow-x-auto">
          <TabsList className="inline-flex h-10 w-max gap-1 bg-transparent p-0">
            <ProfileTab value="overview" icon={Sparkles} label="Visão geral" />
            <ProfileTab value="goals" icon={Target} label="Metas" soon={placeholderTabs.has("goals")} />
            <ProfileTab value="indicators" icon={LineChartIcon} label="Indicadores" soon={placeholderTabs.has("indicators")} />
            <ProfileTab value="reviews" icon={ClipboardCheck} label="Avaliações" soon={placeholderTabs.has("reviews")} />
            <ProfileTab value="feedbacks" icon={MessageSquare} label="Feedbacks" soon={placeholderTabs.has("feedbacks")} />
            <ProfileTab value="oneonone" icon={CalendarPlus} label="1:1" soon={placeholderTabs.has("oneonone")} />
            <ProfileTab value="development" icon={Activity} label="Desenvolvimento" soon={placeholderTabs.has("development")} />
            <ProfileTab value="history" icon={History} label="Histórico" />
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <SectionCard
              title="Resumo de performance"
              description="Síntese baseada em dados registrados."
              className="lg:col-span-2"
            >
              {latest?.explanation ? (
                <p className="text-sm leading-relaxed text-foreground">{latest.explanation}</p>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Ainda não há dados suficientes para gerar um resumo de performance. Cadastre
                  metas, avaliações ou feedbacks para acompanhar a evolução deste colaborador.
                </p>
              )}

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SubBlock title="Pontos fortes">
                  <p className="text-xs text-muted-foreground">
                    Nenhum ponto forte registrado ainda.
                  </p>
                </SubBlock>
                <SubBlock title="Pontos de atenção">
                  {openAlerts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhum ponto de atenção registrado no momento.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-foreground">
                      {openAlerts.slice(0, 4).map((a) => (
                        <li key={a.id} className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-status-attention-foreground" />
                          <span>{a.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </SubBlock>
              </div>
            </SectionCard>

            <SectionCard title="Composição do score" description="Blocos que formam a avaliação.">
              <ScoreBreakdown snapshot={latest} />
            </SectionCard>
          </div>

          <SectionCard
            title="Evolução recente"
            description="Score individual ao longo do tempo."
            action={
              <FilterBar
                value={String(rangeDays)}
                onChange={(v) => setRangeDays(Number(v))}
                options={[
                  { value: "30", label: "30 dias" },
                  { value: "90", label: "90 dias" },
                  { value: "180", label: "6 meses" },
                  { value: "365", label: "1 ano" },
                ]}
              />
            }
          >
            <EvolutionChart snapshots={snapshots} rangeDays={rangeDays} />
          </SectionCard>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <SectionCard
              title="Alertas vinculados"
              description="Pontos abertos para este colaborador."
            >
              {openAlerts.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="Sem alertas no momento"
                  description="Quando o sistema identificar quedas, riscos ou padrões relevantes, eles aparecerão aqui."
                />
              ) : (
                <div className="space-y-3">
                  {openAlerts.map((a) => (
                    <AlertCard
                      key={a.id}
                      title={a.title}
                      severity={a.severity}
                      explanation={a.explanation}
                      suggestedAction={a.suggested_action}
                    />
                  ))}
                </div>
              )}
            </SectionCard>
            <SectionCard
              title="Ações recomendadas"
              description="Sugestões a partir dos dados atuais."
            >
              <Recommendations
                hasAnySnapshot={snapshots.length > 0}
                latestScore={latest?.overall_score ?? null}
                previousScore={previous?.overall_score ?? null}
              />
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="goals" className="mt-5">
          <ComingSoonTab
            title="Metas ainda não cadastradas"
            description="O módulo de metas e indicadores chega em breve. Cadastre metas para acompanhar o cumprimento por ciclo."
          />
        </TabsContent>
        <TabsContent value="indicators" className="mt-5">
          <ComingSoonTab
            title="Indicadores ainda não configurados"
            description="Em breve você poderá vincular indicadores quantitativos ao colaborador."
          />
        </TabsContent>
        <TabsContent value="reviews" className="mt-5">
          <ComingSoonTab
            title="Nenhuma avaliação registrada ainda"
            description="As avaliações de ciclo aparecerão aqui quando o módulo de avaliações for ativado."
          />
        </TabsContent>
        <TabsContent value="feedbacks" className="mt-5">
          <ComingSoonTab
            title="Nenhum feedback registrado"
            description="Feedbacks positivos, de melhoria, alerta e reconhecimento aparecerão aqui."
          />
        </TabsContent>
        <TabsContent value="oneonone" className="mt-5">
          <ComingSoonTab
            title="Nenhuma reunião 1:1 registrada"
            description="Você poderá agendar 1:1s, registrar pautas e acompanhar combinados."
          />
        </TabsContent>
        <TabsContent value="development" className="mt-5">
          <ComingSoonTab
            title="Nenhum plano de desenvolvimento"
            description="Crie planos individuais com objetivos, ações e prazos."
          />
        </TabsContent>

        <TabsContent value="history" className="mt-5">
          <SectionCard
            title="Histórico do colaborador"
            description="Eventos registrados em ordem cronológica."
          >
            {activity.length === 0 ? (
              <EmptyState
                icon={History}
                title="Sem eventos por enquanto"
                description="O histórico deste colaborador aparecerá conforme avaliações, feedbacks, metas e ações forem registradas."
              />
            ) : (
              <Timeline items={activity} />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      <EmployeeFormDialog open={editOpen} onOpenChange={setEditOpen} employee={employee} />
    </div>
  );
}

function MetaPill({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate font-medium text-foreground">{value}</span>
    </div>
  );
}

function StatItem({
  label,
  value,
  sublabel,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  tone?: "excellent" | "good" | "attention" | "risk" | "critical" | "neutral";
}) {
  return (
    <div className="flex min-w-[120px] flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-lg font-semibold tabular-nums text-foreground",
            tone === "excellent" && "text-status-excellent",
            tone === "good" && "text-status-good",
            tone === "attention" && "text-status-attention",
            tone === "risk" && "text-status-risk",
            tone === "critical" && "text-status-critical",
          )}
        >
          {value}
        </span>
      </div>
      {sublabel && <span className="text-[11px] text-muted-foreground">{sublabel}</span>}
    </div>
  );
}

function ProfileTab({
  value,
  icon: Icon,
  label,
  soon,
}: {
  value: EmployeeProfileTab;
  icon: LucideIcon;
  label: string;
  soon?: boolean;
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "relative h-9 gap-1.5 rounded-md border border-transparent bg-transparent px-3 text-xs font-medium text-muted-foreground transition data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {soon && (
        <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          em breve
        </span>
      )}
    </TabsTrigger>
  );
}


function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate text-foreground">{value}</span>
    </div>
  );
}

type DecisionInput = {
  score: number | null;
  diff: number | null;
  openAlerts: { severity: "info" | "attention" | "risk" | "critical" }[];
  goals: PerformanceGoal[];
};

function buildDecisionSummary({ score, diff, openAlerts, goals }: DecisionInput): {
  statusLabel: string;
  tone: "info" | "attention" | "risk" | "critical" | "good";
  trendLabel: string;
  reason: string;
  actionLabel: string;
  actionToast: string;
  actionIcon: LucideIcon;
} {
  const hasCriticalAlert = openAlerts.some((alert) => alert.severity === "critical");
  const hasRiskAlert = openAlerts.some((alert) => alert.severity === "risk");
  const riskGoals = goals.filter((goal) => goal.status === "risk").length;
  const isFalling = diff !== null && diff <= -5;
  const isImproving = diff !== null && diff >= 5;

  const status =
    hasCriticalAlert || (score !== null && score < 60)
      ? "critical"
      : hasRiskAlert || riskGoals > 0 || isFalling || (score !== null && score < 75)
        ? "attention"
        : "healthy";

  const trendLabel =
    diff === null
      ? "Sem comparativo"
      : isImproving
        ? `Melhorando +${diff.toFixed(1)} pts`
        : isFalling
          ? `Piorando ${diff.toFixed(1)} pts`
          : "Estável";

  if (status === "critical") {
    return {
      statusLabel: "Crítico",
      tone: "critical",
      trendLabel,
      reason: hasCriticalAlert
        ? "alerta crítico aberto exige ação imediata do gestor"
        : "score abaixo da zona segura para este colaborador",
      actionLabel: "Agendar 1:1",
      actionToast: "Disponível em breve: agendar 1:1 para tratar o risco.",
      actionIcon: CalendarPlus,
    };
  }

  if (riskGoals > 0) {
    return {
      statusLabel: "Atenção",
      tone: "attention",
      trendLabel,
      reason: "meta em risco precisa de revisão e correção de rota",
      actionLabel: "Revisar metas",
      actionToast: "Disponível em breve: revisar metas deste colaborador.",
      actionIcon: Target,
    };
  }

  if (status === "attention") {
    return {
      statusLabel: "Atenção",
      tone: "attention",
      trendLabel,
      reason: isFalling
        ? "queda recente de performance pede conversa de acompanhamento"
        : "sinais de atenção indicam necessidade de acompanhamento próximo",
      actionLabel: "Registrar feedback",
      actionToast: "Disponível em breve: registrar feedback de acompanhamento.",
      actionIcon: MessageSquare,
    };
  }

  if (score !== null && score >= 85) {
    return {
      statusLabel: "Saudável",
      tone: "good",
      trendLabel,
      reason: "performance saudável com oportunidade de reforço positivo",
      actionLabel: "Reconhecer",
      actionToast: "Disponível em breve: registrar reconhecimento.",
      actionIcon: MessageSquare,
    };
  }

  return {
    statusLabel: "Saudável",
    tone: "good",
    trendLabel,
    reason: "nenhum risco relevante identificado no momento",
    actionLabel: "Acompanhar",
    actionToast: "Disponível em breve: registrar acompanhamento.",
    actionIcon: MessageSquare,
  };
}

function SubBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="mb-1.5 text-xs font-medium text-foreground">{title}</div>
      {children}
    </div>
  );
}

function ScoreBreakdown({
  snapshot,
}: {
  snapshot: {
    delivery_score: number | null;
    quality_score: number | null;
    goals_score: number | null;
    behavior_score: number | null;
    evolution_score: number | null;
  } | null;
}) {
  const blocks = [
    { label: "Entregas", value: snapshot?.delivery_score ?? null },
    { label: "Qualidade", value: snapshot?.quality_score ?? null },
    { label: "Metas", value: snapshot?.goals_score ?? null },
    { label: "Comportamento profissional", value: snapshot?.behavior_score ?? null },
    { label: "Evolução", value: snapshot?.evolution_score ?? null },
  ];
  const allEmpty = blocks.every((b) => b.value === null);

  return (
    <div className="space-y-3">
      {allEmpty && (
        <p className="text-xs text-muted-foreground">
          Ainda não há score calculado para este colaborador. O score será gerado a partir de metas,
          avaliações e indicadores registrados.
        </p>
      )}
      <div className="space-y-2.5">
        {blocks.map((b) => {
          const status = scoreToStatus(b.value);
          return (
            <div key={b.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{b.label}</span>
                {b.value === null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className="font-medium tabular-nums text-foreground">
                    {Math.round(b.value)} · {scoreLabel(status)}
                  </span>
                )}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={
                    "h-full rounded-full transition-all " +
                    (status === "excellent"
                      ? "bg-status-excellent"
                      : status === "good"
                        ? "bg-status-good"
                        : status === "attention"
                          ? "bg-status-attention"
                          : status === "risk"
                            ? "bg-status-risk"
                            : status === "critical"
                              ? "bg-status-critical"
                              : "bg-muted-foreground/30")
                  }
                  style={{ width: `${b.value ?? 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EvolutionChart({
  snapshots,
  rangeDays,
}: {
  snapshots: {
    snapshot_date: string;
    overall_score: number | null;
    employee_id: string;
    id: string;
  }[];
  rangeDays: number;
}) {
  const series = useMemo(
    () =>
      buildEvolutionSeries(
        snapshots.map((s) => ({
          id: s.id,
          employee_id: s.employee_id,
          snapshot_date: s.snapshot_date,
          overall_score: s.overall_score,
          delivery_score: null,
          quality_score: null,
          goals_score: null,
          behavior_score: null,
          evolution_score: null,
          explanation: null,
          status: null,
        })),
        rangeDays,
      ),
    [snapshots, rangeDays],
  );

  if (series.length === 0) {
    return (
      <EmptyState
        icon={LineChartIcon}
        title="Sem dados no período"
        description="Quando snapshots de performance forem registrados, a evolução aparecerá aqui."
      />
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            domain={[0, 100]}
            tickLine={false}
          />
          <ReTooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Recommendations({
  hasAnySnapshot,
  latestScore,
  previousScore,
}: {
  hasAnySnapshot: boolean;
  latestScore: number | null;
  previousScore: number | null;
}) {
  const recs: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
  }[] = [];

  if (!hasAnySnapshot) {
    recs.push({
      icon: ClipboardCheck,
      title: "Registrar a primeira avaliação",
      description:
        "Comece um ciclo de avaliação para estabelecer um ponto de partida de performance.",
    });
  }
  if (latestScore !== null && previousScore !== null && latestScore - previousScore <= -5) {
    recs.push({
      icon: TrendingDown,
      title: "Agendar uma reunião 1:1",
      description:
        "O score apresentou queda recente. Uma conversa estruturada pode ajudar a entender o contexto.",
    });
  }
  if (latestScore !== null && latestScore >= 85) {
    recs.push({
      icon: TrendingUp,
      title: "Reconhecer publicamente",
      description:
        "Performance consistente alta — considere registrar um feedback de reconhecimento.",
    });
  }
  recs.push({
    icon: MessageSquare,
    title: "Registrar feedback do período",
    description: "Feedbacks frequentes ajudam o colaborador a manter o senso de direção.",
  });

  return (
    <ul className="space-y-3">
      {recs.map((r, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
        >
          <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-background text-foreground">
            <r.icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">{r.title}</div>
            <p className="text-xs text-muted-foreground">{r.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ComingSoonTab({ title, description }: { title: string; description: string }) {
  return <EmptyState icon={Sparkles} title={title} description={description} />;
}

function Timeline({
  items,
}: {
  items: { id: string; action: string | null; description: string | null; created_at: string }[];
}) {
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {items.map((it) => (
        <li key={it.id} className="relative">
          <span className="absolute -left-[27px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-foreground/70" />
          <div className="text-xs text-muted-foreground">{formatDateTime(it.created_at)}</div>
          <div className="mt-0.5 text-sm font-medium text-foreground">{humanAction(it.action)}</div>
          {it.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{it.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

function humanAction(a: string | null): string {
  switch (a) {
    case "employee.created":
      return "Cadastro criado";
    case "employee.updated":
      return "Dados atualizados";
    case "employee.deactivated":
      return "Colaborador desativado";
    default:
      return a ?? "Evento";
  }
}

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
}
function formatDateTime(s: string): string {
  try {
    return new Date(s).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

function parseEmployeeProfileTab(value: unknown): EmployeeProfileTab | undefined {
  return typeof value === "string" && EMPLOYEE_PROFILE_TABS.includes(value as EmployeeProfileTab)
    ? (value as EmployeeProfileTab)
    : undefined;
}
