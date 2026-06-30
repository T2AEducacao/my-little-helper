import { useMemo } from "react";
import type { AlertRow, EmployeeRow, SnapshotRow } from "@/lib/php-data";

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

export type PerformanceWorkspaceData = {
  actions: AlertRow[];
  goals: PerformanceGoal[];
  snapshots: SnapshotRow[];
  isMocked: boolean;
};

export function usePerformanceWorkspaceData(employees: EmployeeRow[]): PerformanceWorkspaceData {
  return useMemo(
    () => ({
      actions: buildMockActions(employees),
      goals: buildMockGoals(employees),
      snapshots: buildMockSnapshots(employees),
      isMocked: true,
    }),
    [employees],
  );
}

function buildMockActions(employees: EmployeeRow[]): AlertRow[] {
  const activeEmployees = employees.filter((employee) => employee.status === "active");
  const [first, second, third, fourth] = activeEmployees;
  const actions: AlertRow[] = [];

  if (first) {
    actions.push({
      id: `mock-action-feedback-${first.id}`,
      employee_id: first.id,
      title: `${first.name} está há 32 dias sem feedback`,
      severity: "risk",
      explanation: "Risco de perda de acompanhamento e desalinhamento de expectativas.",
      suggested_action: "Registrar feedback de acompanhamento",
      status: "open",
      created_at: daysAgo(1),
    });
  }

  if (second) {
    actions.push({
      id: `mock-action-review-${second.id}`,
      employee_id: second.id,
      title: `${second.name} teve queda relevante no score`,
      severity: "critical",
      explanation: "Queda simulada de desempenho exige revisão do ciclo atual.",
      suggested_action: "Abrir avaliação e revisar pontos de bloqueio",
      status: "open",
      created_at: daysAgo(0),
    });
  }

  if (third) {
    actions.push({
      id: `mock-action-goal-${third.id}`,
      employee_id: third.id,
      title: `Meta de ${third.name} entrou em risco`,
      severity: "attention",
      explanation: "A evolução projetada está abaixo do necessário para cumprir o período.",
      suggested_action: "Ver metas e combinar correção de rota",
      status: "analyzing",
      created_at: daysAgo(3),
    });
  }

  if (fourth) {
    actions.push({
      id: `mock-action-oneonone-${fourth.id}`,
      employee_id: fourth.id,
      title: `Agendar 1:1 com ${fourth.name}`,
      severity: "info",
      explanation: "Acompanhamento preventivo ajuda a manter clareza de prioridades.",
      suggested_action: "Agendar 1:1 e registrar próximos passos",
      status: "open",
      created_at: daysAgo(5),
    });
  }

  if (activeEmployees.length > 0) {
    actions.push({
      id: "mock-action-team-kpi-risk",
      employee_id: null,
      title: "Produtividade da equipe caiu 8% na última semana",
      severity: "attention",
      explanation: "Duas metas simuladas entraram em risco e precisam de análise do gestor.",
      suggested_action: "Ver metas e KPIs da equipe",
      status: "open",
      created_at: daysAgo(2),
    });
  }

  return actions;
}

function buildMockGoals(employees: EmployeeRow[]): PerformanceGoal[] {
  const activeEmployees = employees.filter((employee) => employee.status === "active");
  const templates = [
    {
      title: "Atingir meta de entregas do ciclo",
      category: "Produtividade",
      progress: 62,
      target: 100,
      current: 62,
      unit: "%",
      dueDays: 9,
      status: "risk",
      description: "Ritmo abaixo do necessário para fechar o ciclo dentro do esperado.",
    },
    {
      title: "Manter qualidade nas entregas",
      category: "Qualidade",
      progress: 84,
      target: 95,
      current: 80,
      unit: "%",
      dueDays: 18,
      status: "on_track",
      description: "Indicador segue saudável, com pequena margem para melhoria.",
    },
    {
      title: "Concluir plano de desenvolvimento",
      category: "Desenvolvimento",
      progress: 100,
      target: 4,
      current: 4,
      unit: "ações",
      dueDays: -2,
      status: "achieved",
      description: "Todas as ações previstas para o ciclo foram concluídas.",
    },
    {
      title: "Reduzir retrabalho no período",
      category: "Eficiência",
      progress: 48,
      target: 10,
      current: 16,
      unit: "ocorrências",
      dueDays: 6,
      status: "risk",
      description: "Volume de retrabalho acima da meta combinada para o período.",
    },
    {
      title: "Cumprir rotina de acompanhamento",
      category: "Gestão",
      progress: 76,
      target: 8,
      current: 6,
      unit: "check-ins",
      dueDays: 14,
      status: "on_track",
      description: "Rotina de acompanhamento evoluindo sem necessidade de intervenção imediata.",
    },
  ] as const;

  return activeEmployees.slice(0, templates.length).map((employee, index) => {
    const template = templates[index];
    return {
      id: `mock-goal-${employee.id}-${index}`,
      employee_id: employee.id,
      title: template.title,
      category: template.category,
      progress: template.progress,
      target: template.target,
      current: template.current,
      unit: template.unit,
      due_date: dateOnly(daysAgo(-template.dueDays)),
      status: template.status,
      description: template.description,
    };
  });
}

function buildMockSnapshots(employees: EmployeeRow[]): SnapshotRow[] {
  const activeEmployees = employees.filter((employee) => employee.status === "active");
  const baseScores = [92, 68, 73, 84, 89, 61, 77, 95, 71, 86];

  return activeEmployees.flatMap((employee, index) => {
    const current = baseScores[index % baseScores.length];
    const previous = clampScore(current + previousDelta(index));

    return [
      buildSnapshot(employee.id, current, 7, "current"),
      buildSnapshot(employee.id, previous, 37, "previous"),
    ];
  });
}

function buildSnapshot(
  employeeId: string,
  overallScore: number,
  days: number,
  version: "current" | "previous",
): SnapshotRow {
  return {
    id: `mock-snapshot-${version}-${employeeId}`,
    employee_id: employeeId,
    snapshot_date: dateOnly(daysAgo(days)),
    overall_score: overallScore,
    delivery_score: clampScore(overallScore + 3),
    quality_score: clampScore(overallScore - 2),
    goals_score: clampScore(overallScore - 5),
    behavior_score: clampScore(overallScore + 1),
    evolution_score: clampScore(overallScore - 1),
    explanation: "Snapshot temporário gerado para validação visual do dashboard.",
    status: null,
  };
}

function previousDelta(index: number): number {
  const deltas = [-4, 12, 6, -3, -7, 9, 2, -5, 8, -2];
  return deltas[index % deltas.length];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}
