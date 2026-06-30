import { useCallback, useEffect, useState } from "react";

export type LocalGoalStatus = "pending" | "completed";

export type LocalGoal = {
  id: string;
  nome: string;
  funcionario_id: string;
  funcionario_nome: string;
  prazo: string; // ISO date (yyyy-mm-dd)
  status: LocalGoalStatus;
  created_at: string;
  completed_at?: string;
};

const STORAGE_KEY = "performativo:custom-goals";

function readStorage(): LocalGoal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalGoal[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(goals: LocalGoal[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  } catch {
    /* ignore */
  }
}

export function useLocalGoals() {
  const [goals, setGoals] = useState<LocalGoal[]>(() => readStorage());

  useEffect(() => {
    writeStorage(goals);
  }, [goals]);

  const addGoal = useCallback(
    (input: { nome: string; funcionario_id: string; funcionario_nome: string; prazo: string }) => {
      const goal: LocalGoal = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        nome: input.nome.trim(),
        funcionario_id: input.funcionario_id,
        funcionario_nome: input.funcionario_nome,
        prazo: input.prazo,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      setGoals((prev) => [goal, ...prev]);
      return goal;
    },
    [],
  );

  const completeGoal = useCallback((id: string) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id && g.status !== "completed"
          ? { ...g, status: "completed", completed_at: new Date().toISOString() }
          : g,
      ),
    );
  }, []);

  const removeGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  return { goals, addGoal, completeGoal, removeGoal };
}
