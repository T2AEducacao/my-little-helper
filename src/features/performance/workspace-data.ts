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

  const activeActions = useMemo(
    () => alerts.filter((alert) => alert.status === "open" || alert.status === "analyzing"),
    [alerts],
  );

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
      goals: [],
      snapshots,
      progressSummary: {
        resolvedToday: 0,
        peopleWithResolvedActions: 0,
        generatedFollowUps: 0,
        openActionsCount: activeActions.length,
      },
      resolveAction,
      isMocked: false,
    }),
    [activeActions, employees, resolveAction, snapshots],
  );
}
