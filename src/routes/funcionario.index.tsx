import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, CheckCircle2, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { EmptyState } from "@/components/php/EmptyState";
import { StatusBadge } from "@/components/php/StatusBadge";
import { useMyEmployeeGoals, type GoalRow } from "@/lib/goals-data";

export const Route = createFileRoute("/funcionario/")({
  component: EmployeeGoalsPage,
});

function EmployeeGoalsPage() {
  const { data: goals = [], isLoading } = useMyEmployeeGoals();
  const pending = useMemo(() => goals.filter((g) => g.status === "pending"), [goals]);
  const completed = useMemo(
    () =>
      goals
        .filter((g) => g.status === "completed")
        .sort(
          (a, b) =>
            new Date(b.completed_at ?? b.updated_at).getTime() -
            new Date(a.completed_at ?? a.updated_at).getTime(),
        ),
    [goals],
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Minhas Metas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe as metas atribuídas pelo seu líder.
        </p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Em andamento
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {pending.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="done">
            Concluídas
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {completed.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {isLoading ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              Carregando…
            </div>
          ) : pending.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Nenhuma meta em andamento"
              description="Quando seu líder atribuir uma meta, ela aparecerá aqui."
            />
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {pending.map((g) => (
                <ActiveGoalRow key={g.id} goal={g} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="done" className="mt-4">
          {completed.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Sem metas concluídas ainda"
              description="Seu histórico de metas finalizadas aparecerá aqui."
            />
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {completed.map((g) => (
                <CompletedGoalRow key={g.id} goal={g} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ActiveGoalRow({ goal }: { goal: GoalRow }) {
  const dueInfo = getDueInfo(goal.deadline);
  return (
    <article className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-medium text-foreground">{goal.name}</h3>
        {goal.deadline && (
          <div
            className={cn(
              "mt-1 inline-flex items-center gap-1 text-xs font-medium tabular-nums",
              dueInfo.tone === "risk" && "text-status-risk",
              dueInfo.tone === "attention" && "text-status-attention-foreground",
              dueInfo.tone === "neutral" && "text-muted-foreground",
              dueInfo.tone === "good" && "text-muted-foreground",
            )}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            {dueInfo.label} · {formatDate(goal.deadline)}
          </div>
        )}
      </div>
      <StatusBadge tone="attention">Em andamento</StatusBadge>
    </article>
  );
}

function CompletedGoalRow({ goal }: { goal: GoalRow }) {
  return (
    <article className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-medium text-foreground">{goal.name}</h3>
        <div className="mt-1 text-xs text-muted-foreground">
          {goal.completed_at
            ? `Concluída em ${formatDate(goal.completed_at)}`
            : "Concluída"}
        </div>
      </div>
      <StatusBadge tone="excellent">
        <CheckCircle2 className="h-3 w-3" />
        Concluída
      </StatusBadge>
    </article>
  );
}

function getDueInfo(
  date: string | null,
): { label: string; tone: "risk" | "attention" | "good" | "neutral" } {
  if (!date) return { label: "Sem prazo", tone: "neutral" };
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return { label: "Sem prazo", tone: "neutral" };
  const now = new Date();
  const a = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((a.getTime() - b.getTime()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d atrasada`, tone: "risk" };
  if (days === 0) return { label: "Vence hoje", tone: "risk" };
  if (days <= 7) return { label: `Em ${days}d`, tone: "attention" };
  return { label: `Em ${days}d`, tone: "good" };
}

function formatDate(value: string): string {
  try {
    return format(new Date(value), "dd MMM yyyy", { locale: ptBR });
  } catch {
    return value;
  }
}
