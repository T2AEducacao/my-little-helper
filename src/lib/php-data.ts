import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { scoreToStatus, type ScoreStatus } from "@/components/php/types";

export type EmployeeRow = {
  id: string;
  name: string;
  role: string | null;
  status: "active" | "vacation" | "leave" | "inactive";
  avatar_url: string | null;
  department_id: string | null;
};

export type SnapshotRow = {
  id: string;
  employee_id: string;
  snapshot_date: string;
  overall_score: number | null;
};

export type AlertRow = {
  id: string;
  employee_id: string | null;
  title: string;
  severity: "info" | "attention" | "risk" | "critical";
  explanation: string | null;
  suggested_action: string | null;
  status: "open" | "analyzing" | "resolved" | "ignored";
  created_at: string;
};

export type DepartmentRow = { id: string; name: string };

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id,name,role,status,avatar_url,department_id");
      if (error) throw error;
      return (data ?? []) as EmployeeRow[];
    },
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id,name");
      if (error) throw error;
      return (data ?? []) as DepartmentRow[];
    },
  });
}

export function useSnapshots() {
  return useQuery({
    queryKey: ["snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_snapshots")
        .select("id,employee_id,snapshot_date,overall_score")
        .order("snapshot_date", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as SnapshotRow[];
    },
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_alerts")
        .select("id,employee_id,title,severity,explanation,suggested_action,status,created_at")
        .in("status", ["open", "analyzing"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AlertRow[];
    },
  });
}

export type LatestByEmployee = Map<string, { current: number | null; previous: number | null }>;

export function latestSnapshotsByEmployee(snapshots: SnapshotRow[]): LatestByEmployee {
  const map: LatestByEmployee = new Map();
  // snapshots are already ordered desc by date
  for (const s of snapshots) {
    const entry = map.get(s.employee_id);
    if (!entry) {
      map.set(s.employee_id, { current: s.overall_score, previous: null });
    } else if (entry.previous === null) {
      map.set(s.employee_id, { current: entry.current, previous: s.overall_score });
    }
  }
  return map;
}

export type Bucket = { status: ScoreStatus; count: number };

export function buildDistribution(employees: EmployeeRow[], latest: LatestByEmployee): Bucket[] {
  const counts: Record<ScoreStatus, number> = {
    excellent: 0,
    good: 0,
    attention: 0,
    risk: 0,
    critical: 0,
    neutral: 0,
  };
  for (const e of employees) {
    if (e.status !== "active") continue;
    const score = latest.get(e.id)?.current ?? null;
    counts[scoreToStatus(score)]++;
  }
  return (
    ["excellent", "good", "attention", "risk", "critical", "neutral"] as ScoreStatus[]
  ).map((status) => ({ status, count: counts[status] }));
}

export function buildEvolutionSeries(
  snapshots: SnapshotRow[],
  rangeDays: number,
): { date: string; score: number }[] {
  if (snapshots.length === 0) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - rangeDays);

  const byDay = new Map<string, number[]>();
  for (const s of snapshots) {
    if (s.overall_score === null) continue;
    const d = new Date(s.snapshot_date);
    if (d < cutoff) continue;
    const key = s.snapshot_date;
    const arr = byDay.get(key) ?? [];
    arr.push(Number(s.overall_score));
    byDay.set(key, arr);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, scores]) => ({
      date,
      score: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));
}
