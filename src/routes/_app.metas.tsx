import { EmptyState } from "@/components/php/EmptyState";
import { MetricCard } from "@/components/php/MetricCard";
import { PageHeader } from "@/components/php/PageHeader";
import { ProgressBar } from "@/components/php/ProgressBar";
import { SectionCard } from "@/components/php/SectionCard";
import { StatusBadge, type StatusBadgeTone } from "@/components/php/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  usePerformanceWorkspaceData,
  type PerformanceEmployee,
  type PerformanceGoal,
  type PerformanceGoalStatus,
} from "@/features/performance/workspace-data";
import { useEmployees } from "@/lib/php-data";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ListChecks,
  Target,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_app/metas")({
  head: () => ({
    meta: [
      { title: "Metas e KPIs · People Performance Hub" },
      {
        name: "description",
        content: "Acompanhe metas em risco, metas no prazo, responsáveis, progresso e vencimentos.",
      },
    ],
  }),
  component: GoalsPage,
});

const GOAL_STATUS_META: Record<
  PerformanceGoalStatus,
  { label: string; tone: StatusBadgeTone; order: number }
> = {
  risk: { label: "Em risco", tone: "risk", order: 0 },
  on_track: { label: "No prazo", tone: "good", order: 1 },
  achieved: { label: "Atingida", tone: "excellent", order: 2 },
};

function GoalsPage() {
  const { data: employees = [], isLoading } = useEmployees();
  const performanceData = usePerformanceWorkspaceData(employees);
  const performanceEmployees = performanceData.employees;
  const goals = performanceData.goals;

  const employeeById = useMemo(
    () => new Map(performanceEmployees.map((employee) => [employee.id, employee] as const)),
    [performanceEmployees],
  );

  const sortedGoals = useMemo(
    () =>
      [...goals].sort((a, b) => {
        const statusOrder = GOAL_STATUS_META[a.status].order - GOAL_STATUS_META[b.status].order;
        if (statusOrder !== 0) return statusOrder;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }),
    [goals],
  );

  const riskGoals = goals.filter((goal) => goal.status === "risk");
  const onTrackGoals = goals.filter((goal) => goal.status === "on_track");
  const achievedGoals = goals.filter((goal) => goal.status === "achieved");
  const averageProgress =
    goals.length > 0
      ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length)
      : 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Metas e KPIs"
        description="Veja rapidamente o que está em risco, no prazo e atingido por responsável."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/alertas">
              <ListChecks className="h-4 w-4" />
              Ver ações
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Metas em risco"
          icon={AlertTriangle}
          value={riskGoals.length}
          isEmpty={!isLoading && riskGoals.length === 0}
          emptyMessage="Nenhuma meta em risco."
          footer="Priorize metas com prazo próximo ou progresso abaixo do esperado."
          className="border-status-risk/30"
        />
        <MetricCard
          label="Dentro do esperado"
          icon={TrendingUp}
          value={onTrackGoals.length}
          isEmpty={!isLoading && onTrackGoals.length === 0}
          emptyMessage="Nenhuma meta no prazo."
          footer="Metas evoluindo sem necessidade de intervenção imediata."
        />
        <MetricCard
          label="Atingidas"
          icon={CheckCircle2}
          value={achievedGoals.length}
          isEmpty={!isLoading && achievedGoals.length === 0}
          emptyMessage="Nenhuma meta atingida."
          footer="Resultados concluídos que podem gerar reconhecimento."
          className="border-status-excellent/30"
        />
        <MetricCard
          label="Progresso médio"
          icon={Target}
          value={`${averageProgress}%`}
          isEmpty={!isLoading && goals.length === 0}
          emptyMessage="Sem metas para calcular."
          footer="Média simples das metas em acompanhamento."
        />
      </div>

      <SectionCard
        title="Metas em acompanhamento"
        description="Lista priorizada por risco e prazo para orientar a rotina do gestor."
      >
        {isLoading ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            Carregando metas...
          </div>
        ) : sortedGoals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Nenhuma meta para exibir"
            description="Cadastre colaboradores reais para visualizar metas temporárias vinculadas à equipe."
          />
        ) : (
          <div className="divide-y divide-border">
            {sortedGoals.map((goal) => (
              <GoalRow key={goal.id} goal={goal} employee={employeeById.get(goal.employee_id)} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function GoalRow({ goal, employee }: { goal: PerformanceGoal; employee?: PerformanceEmployee }) {
  const status = GOAL_STATUS_META[goal.status];
  const progressTone =
    goal.status === "achieved" ? "excellent" : goal.status === "on_track" ? "good" : "risk";

  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {goal.category}
            </span>
            <span className="text-xs text-muted-foreground">
              Prazo: {formatGoalDate(goal.due_date)}
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_180px] lg:items-start">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{goal.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Responsável: {employee?.name ?? "Colaborador não encontrado"}
              </p>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-foreground/80">
                {goal.description}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium tabular-nums text-foreground">{goal.progress}%</span>
              </div>
              <ProgressBar value={goal.progress} tone={progressTone} />
              <p className="mt-2 text-xs text-muted-foreground">
                {goal.current}
                {goal.unit === "%" ? "%" : ` ${goal.unit}`} de {goal.target}
                {goal.unit === "%" ? "%" : ` ${goal.unit}`}
              </p>
            </div>
          </div>
        </div>

        <Button asChild size="sm" variant="outline">
          {employee && !employee.is_mock ? (
            <Link to="/colaboradores/$id" params={{ id: employee.id }} search={{ tab: "goals" }}>
              Ver responsável
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link to="/metas">
              Ver contexto
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </Button>
      </div>
    </article>
  );
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
