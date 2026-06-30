import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useAlerts,
  useSnapshots,
  type AlertRow,
  type EmployeeRow,
  type SnapshotRow,
} from "@/lib/php-data";
import { useGoals, type GoalRow } from "@/lib/goals-data";

export type PerformanceEmployee = EmployeeRow;

export type PerformanceGoalStatus = "risk" | "on_track" | "achieved";

export type PerformanceGoal = {
  id: string;
  employee_id: string;
  title: string;
  category: string;
  progress: number;
  target: number;
  current: number;
  unit: string;
  due_date: string;
  status: PerformanceGoalStatus;
  description: string;
};

export type PerformanceProgressSummary = {
  resolvedToday: number;
  peopleWithResolvedActions: number;
  generatedFollowUps: number;
  openActionsCount: number;
};

export type PerformanceWorkspaceData = {
  employees: PerformanceEmployee[];
  actions: AlertRow[];
  resolvedActions: AlertRow[];
  goals: PerformanceGoal[];
  snapshots: SnapshotRow[];
  progressSummary: PerformanceProgressSummary;
  resolveAction: (actionId: string) => void;
  isMocked: boolean;
};

export function usePerformanceWorkspaceData(employees: EmployeeRow[]): PerformanceWorkspaceData {
  const queryClient = useQueryClient();
  const { data: alerts = [] } = useAlerts();
  const { data: snapshots = [] } = useSnapshots();
  const { data: dbGoals = [] } = useGoals();

  const activeActions = useMemo(
    () => alerts.filter((alert) => alert.status === "open" || alert.status === "analyzing"),
    [alerts],
  );
  const performanceGoals = useMemo(() => dbGoals.map(goalRowToPerformanceGoal), [dbGoals]);
  const goalSnapshots = useMemo(
    () => buildGoalDerivedSnapshots(employees, dbGoals),
    [employees, dbGoals],
  );
  const mergedSnapshots = useMemo(
    () => [...snapshots, ...goalSnapshots].sort(sortSnapshotsDesc),
    [goalSnapshots, snapshots],
  );
  const resolvedToday = useMemo(() => countCompletedToday(dbGoals), [dbGoals]);

  const resolveAction = useCallback(
    (actionId: string) => {
      void supabase
        .from("performance_alerts")
        .update({ status: "resolved" })
        .eq("id", actionId)
        .then(() => {
          void queryClient.invalidateQueries({ queryKey: ["alerts"] });
        });
    },
    [queryClient],
  );

  return useMemo(
    () => ({
      employees,
      actions: activeActions,
      resolvedActions: [],
      goals: performanceGoals,
      snapshots: mergedSnapshots,
      progressSummary: {
        resolvedToday,
        peopleWithResolvedActions: new Set(
          dbGoals.filter((goal) => goal.status === "completed").map((goal) => goal.employee_id),
        ).size,
        generatedFollowUps: resolvedToday,
        openActionsCount: activeActions.length,
      },
      resolveAction,
      isMocked: false,
    }),
    [
      activeActions,
      dbGoals,
      employees,
      mergedSnapshots,
      performanceGoals,
      resolveAction,
      resolvedToday,
    ],
  );
}

function goalRowToPerformanceGoal(goal: GoalRow): PerformanceGoal {
  const timing = getGoalTiming(goal);
  const score = scoreGoal(goal);
  const status: PerformanceGoalStatus =
    goal.status === "completed" ? "achieved" : timing.isOverdue ? "risk" : "on_track";

  return {
    id: goal.id,
    employee_id: goal.employee_id,
    title: goal.name,
    category: "Meta",
    progress:
      goal.status === "completed" ? 100 : timing.isOverdue ? 20 : timing.daysUntil <= 7 ? 60 : 45,
    target: 100,
    current:
      goal.status === "completed" ? 100 : timing.isOverdue ? 20 : timing.daysUntil <= 7 ? 60 : 45,
    unit: "%",
    due_date: goal.deadline ?? goal.created_at,
    status,
    description: describeGoal(goal, score),
  };
}

function buildGoalDerivedSnapshots(employees: EmployeeRow[], goals: GoalRow[]): SnapshotRow[] {
  const activeEmployeeIds = new Set(
    employees.filter((e) => e.status !== "inactive").map((e) => e.id),
  );
  const goalsByEmployee = new Map<string, GoalRow[]>();

  for (const goal of goals) {
    if (!activeEmployeeIds.has(goal.employee_id)) continue;
    const group = goalsByEmployee.get(goal.employee_id) ?? [];
    group.push(goal);
    goalsByEmployee.set(goal.employee_id, group);
  }

  const today = toDateKey(new Date());
  const yesterday = toDateKey(addDays(new Date(), -1));
  const snapshots: SnapshotRow[] = [];

  for (const [employeeId, employeeGoals] of goalsByEmployee.entries()) {
    const currentScore = average(employeeGoals.map(scoreGoal));
    const previousScore = average(employeeGoals.map(scoreGoalBeforeToday));

    snapshots.push(makeGoalSnapshot(employeeId, today, currentScore, employeeGoals, "current"));

    if (previousScore !== currentScore) {
      snapshots.push(
        makeGoalSnapshot(employeeId, yesterday, previousScore, employeeGoals, "previous"),
      );
    }
  }

  return snapshots;
}

function makeGoalSnapshot(
  employeeId: string,
  snapshotDate: string,
  score: number,
  goals: GoalRow[],
  suffix: string,
): SnapshotRow {
  const overdueOpen = goals.filter(
    (goal) => goal.status === "pending" && getGoalTiming(goal).isOverdue,
  ).length;
  const completed = goals.filter((goal) => goal.status === "completed").length;

  return {
    id: `goals-derived-${employeeId}-${snapshotDate}-${suffix}`,
    employee_id: employeeId,
    snapshot_date: snapshotDate,
    overall_score: score,
    delivery_score: score,
    quality_score: null,
    goals_score: score,
    behavior_score: null,
    evolution_score: score,
    explanation:
      goals.length === 0
        ? null
        : `Score calculado a partir de ${goals.length} meta(s): ${completed} concluída(s), ${overdueOpen} atrasada(s) em aberto.`,
    status: score >= 75 ? "healthy" : score >= 60 ? "attention" : "risk",
  };
}

function scoreGoal(goal: GoalRow): number {
  const timing = getGoalTiming(goal);

  if (goal.status === "completed") {
    if (!goal.deadline || !goal.completed_at) return 100;
    return new Date(goal.completed_at).getTime() <= endOfDay(goal.deadline).getTime() ? 100 : 70;
  }

  if (timing.isOverdue) return 35;
  if (timing.daysUntil <= 0) return 55;
  if (timing.daysUntil <= 7) return 70;
  return 82;
}

function scoreGoalBeforeToday(goal: GoalRow): number {
  if (goal.status !== "completed") return scoreGoal(goal);
  const completedAt = goal.completed_at ? new Date(goal.completed_at) : null;
  if (!completedAt || toDateKey(completedAt) !== toDateKey(new Date())) return scoreGoal(goal);

  const deadline = goal.deadline ? toLocalDate(goal.deadline) : null;
  if (deadline && deadline < startOfDay(new Date())) return 35;
  if (deadline && toDateKey(deadline) === toDateKey(new Date())) return 55;
  return 70;
}

function describeGoal(goal: GoalRow, score: number): string {
  if (goal.status === "completed") {
    return score >= 90 ? "Meta concluída dentro do prazo." : "Meta concluída após o prazo.";
  }
  const timing = getGoalTiming(goal);
  if (timing.isOverdue) return "Meta atrasada e ainda em aberto.";
  if (timing.daysUntil <= 7) return "Meta próxima do prazo.";
  return "Meta em andamento.";
}

function getGoalTiming(goal: GoalRow): { daysUntil: number; isOverdue: boolean } {
  if (!goal.deadline) return { daysUntil: Number.POSITIVE_INFINITY, isOverdue: false };
  const today = startOfDay(new Date());
  const deadline = startOfDay(toLocalDate(goal.deadline));
  const daysUntil = Math.round((deadline.getTime() - today.getTime()) / 86400000);
  return { daysUntil, isOverdue: goal.status !== "completed" && daysUntil < 0 };
}

function countCompletedToday(goals: GoalRow[]): number {
  const today = toDateKey(new Date());
  return goals.filter(
    (goal) =>
      goal.status === "completed" && goal.completed_at && toDateKey(goal.completed_at) === today,
  ).length;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sortSnapshotsDesc(a: SnapshotRow, b: SnapshotRow): number {
  return b.snapshot_date.localeCompare(a.snapshot_date);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(value: string): Date {
  const date = toLocalDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(value: Date | string): string {
  const date = typeof value === "string" ? toLocalDate(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDate(value: string): Date {
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateOnly) return new Date(value);
  return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
}
