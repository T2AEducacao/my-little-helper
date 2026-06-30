import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentCompanyId } from "@/lib/php-data";

export type GoalStatus = "pending" | "completed";

export type GoalRow = {
  id: string;
  company_id: string;
  employee_id: string;
  created_by: string | null;
  name: string;
  deadline: string | null;
  status: GoalStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const COLS =
  "id,company_id,employee_id,created_by,name,deadline,status,completed_at,created_at,updated_at";

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select(COLS)
        .order("deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as GoalRow[];
    },
  });
}

export function useMyEmployeeGoals() {
  return useQuery({
    queryKey: ["goals", "me"],
    queryFn: async () => {
      // RLS already filters to current employee for non-managers.
      const { data, error } = await supabase
        .from("goals")
        .select(COLS)
        .order("deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as GoalRow[];
    },
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; employee_id: string; deadline: string | null }) => {
      const companyId = await getCurrentCompanyId();
      if (!companyId) throw new Error("Sessão sem empresa identificada.");
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("goals")
        .insert({
          company_id: companyId,
          employee_id: input.employee_id,
          created_by: u.user?.id ?? null,
          name: input.name.trim(),
          deadline: input.deadline,
          status: "pending" as GoalStatus,
        })
        .select(COLS)
        .single();
      if (error) throw error;
      return data as GoalRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useCompleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("goals")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export type CurrentUserRole = "admin" | "manager" | "employee";

export type CurrentAccessContext = {
  role: CurrentUserRole | null;
  roles: CurrentUserRole[];
  employeeId: string | null;
  isEmployeePortalUser: boolean;
};

export async function getCurrentAccessContext(): Promise<CurrentAccessContext> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) {
    return {
      role: null,
      roles: [],
      employeeId: null,
      isEmployeePortalUser: false,
    };
  }

  const [{ data: rolesData, error: rolesError }, { data: employeeData, error: employeeError }] =
    await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      supabase.from("employees").select("id").eq("profile_id", u.user.id).maybeSingle(),
    ]);

  if (rolesError) throw rolesError;
  if (employeeError) throw employeeError;

  const roles = (rolesData ?? []).map((r) => r.role as CurrentUserRole);
  const employeeId = employeeData?.id ?? null;

  if (employeeId) {
    return {
      role: "employee",
      roles,
      employeeId,
      isEmployeePortalUser: true,
    };
  }

  const role = roles.includes("admin")
    ? "admin"
    : roles.includes("manager")
      ? "manager"
      : roles.includes("employee")
        ? "employee"
        : null;

  return {
    role,
    roles,
    employeeId,
    isEmployeePortalUser: role === "employee",
  };
}

export async function getCurrentUserRole(): Promise<CurrentUserRole | null> {
  const context = await getCurrentAccessContext();
  return context.role;
}
