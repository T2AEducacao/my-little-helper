import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { scoreToStatus, type ScoreStatus } from "@/components/php/types";

export type EmployeeStatus = "active" | "vacation" | "leave" | "inactive";

export type EmployeeRow = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  status: EmployeeStatus;
  avatar_url: string | null;
  avatar_display_url?: string | null;
  department_id: string | null;
  manager_id: string | null;
  seniority: string | null;
  hire_date: string | null;
  notes: string | null;
  location: string | null;
  contract_type: string | null;
  behavioral_profile: string | null;
  profile_id?: string | null;
};

export type SnapshotRow = {
  id: string;
  employee_id: string;
  snapshot_date: string;
  overall_score: number | null;
  delivery_score: number | null;
  quality_score: number | null;
  goals_score: number | null;
  behavior_score: number | null;
  evolution_score: number | null;
  explanation: string | null;
  status: string | null;
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

export type DepartmentRow = {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
};

export type ActivityLogRow = {
  id: string;
  action: string | null;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  created_at: string;
};

const EMPLOYEE_COLS =
  "id,name,email,role,status,avatar_url,department_id,manager_id,seniority,hire_date,notes,location,contract_type,behavioral_profile,profile_id";

const SNAPSHOT_COLS =
  "id,employee_id,snapshot_date,overall_score,delivery_score,quality_score,goals_score,behavior_score,evolution_score,explanation,status";

const AVATAR_SIGNED_TTL = 60 * 60;

export async function getCurrentCompanyId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_user_company_id");
  if (error) return null;
  return (data as string | null) ?? null;
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select(EMPLOYEE_COLS).order("name");
      if (error) throw error;
      return withSignedEmployeeAvatars((data ?? []) as EmployeeRow[]);
    },
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ["employee", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(EMPLOYEE_COLS)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return withSignedEmployeeAvatar((data as EmployeeRow | null) ?? null);
    },
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id,name,description,manager_id")
        .order("name");
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
        .select(SNAPSHOT_COLS)
        .order("snapshot_date", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as SnapshotRow[];
    },
  });
}

export function useEmployeeSnapshots(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["snapshots", "employee", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_snapshots")
        .select(SNAPSHOT_COLS)
        .eq("employee_id", employeeId!)
        .order("snapshot_date", { ascending: false });
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

export function useEmployeeAlerts(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["alerts", "employee", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_alerts")
        .select("id,employee_id,title,severity,explanation,suggested_action,status,created_at")
        .eq("employee_id", employeeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AlertRow[];
    },
  });
}

export function useEmployeeActivity(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["activity", "employee", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id,action,description,entity_type,entity_id,actor_id,created_at")
        .eq("entity_type", "employee")
        .eq("entity_id", employeeId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ActivityLogRow[];
    },
  });
}

async function logActivity(
  companyId: string,
  action: string,
  entityId: string,
  description: string,
) {
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("activity_logs").insert({
    company_id: companyId,
    actor_id: u.user?.id ?? null,
    action,
    entity_type: "employee",
    entity_id: entityId,
    description,
  });
}

export type EmployeeInput = {
  name: string;
  email: string | null;
  role: string | null;
  department_id: string | null;
  manager_id: string | null;
  seniority: string | null;
  hire_date: string | null;
  avatar_url: string | null;
  notes: string | null;
  location: string | null;
  contract_type: string | null;
  behavioral_profile: string | null;
  status: EmployeeStatus;
};

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployeeInput) => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) {
        throw new Error("Sessão não identificada. Faça login para cadastrar colaboradores.");
      }
      const { data, error } = await supabase
        .from("employees")
        .insert({ ...input, company_id: companyId })
        .select(EMPLOYEE_COLS)
        .single();
      if (error) throw error;
      await logActivity(companyId, "employee.created", data.id, `Cadastro criado: ${data.name}`);
      return withSignedEmployeeAvatar(data as EmployeeRow);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<EmployeeInput> }) => {
      const companyId = await getCurrentCompanyId();
      const { data, error } = await supabase
        .from("employees")
        .update(input)
        .eq("id", id)
        .select(EMPLOYEE_COLS)
        .single();
      if (error) throw error;
      if (companyId) await logActivity(companyId, "employee.updated", id, `Dados atualizados`);
      return withSignedEmployeeAvatar(data as EmployeeRow);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employee", vars.id] });
      qc.invalidateQueries({ queryKey: ["activity", "employee", vars.id] });
    },
  });
}

export function useDeactivateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const companyId = await getCurrentCompanyId();
      const { error } = await supabase
        .from("employees")
        .update({ status: "inactive" as EmployeeStatus })
        .eq("id", id);
      if (error) throw error;
      if (companyId)
        await logActivity(companyId, "employee.deactivated", id, "Colaborador desativado");
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employee", id] });
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string | null;
      manager_id?: string | null;
    }) => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error("Sessão não identificada. Faça login para criar áreas.");
      const { data, error } = await supabase
        .from("departments")
        .insert({
          company_id: companyId,
          name: input.name,
          description: input.description ?? null,
          manager_id: input.manager_id ?? null,
        })
        .select("id,name,description,manager_id")
        .single();
      if (error) throw error;
      return data as DepartmentRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export type LatestByEmployee = Map<string, { current: number | null; previous: number | null }>;

export function latestSnapshotsByEmployee(snapshots: SnapshotRow[]): LatestByEmployee {
  const map: LatestByEmployee = new Map();
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
  return (["excellent", "good", "attention", "risk", "critical", "neutral"] as ScoreStatus[]).map(
    (status) => ({ status, count: counts[status] }),
  );
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

export const STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: "Ativo",
  vacation: "Férias",
  leave: "Afastado",
  inactive: "Inativo",
};

export const SENIORITY_OPTIONS = [
  "Estagiário",
  "Júnior",
  "Pleno",
  "Sênior",
  "Especialista",
  "Coordenador",
  "Gerente",
  "Diretor",
] as const;

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

async function withSignedEmployeeAvatars(employees: EmployeeRow[]): Promise<EmployeeRow[]> {
  const results = await Promise.all(employees.map((e) => withSignedEmployeeAvatar(e)));
  return results.filter((e): e is EmployeeRow => e !== null);
}

async function withSignedEmployeeAvatar<T extends EmployeeRow | null>(employee: T): Promise<T> {
  if (!employee?.avatar_url || isPublicAvatarUrl(employee.avatar_url)) return employee;

  const { data, error } = await supabase.storage
    .from("avatars")
    .createSignedUrl(employee.avatar_url, AVATAR_SIGNED_TTL);

  if (error || !data?.signedUrl) return employee;
  return { ...employee, avatar_display_url: data.signedUrl } as T;
}

function isPublicAvatarUrl(value: string): boolean {
  return /^https?:\/\//.test(value) || value.startsWith("data:");
}
