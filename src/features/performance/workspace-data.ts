import { useCallback, useEffect, useMemo, useState } from "react";
import type { AlertRow, EmployeeRow, SnapshotRow } from "@/lib/php-data";

export type PerformanceEmployee = EmployeeRow & {
  is_mock?: boolean;
};

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
  employees: PerformanceEmployee[];
  actions: AlertRow[];
  resolvedActions: AlertRow[];
  goals: PerformanceGoal[];
  snapshots: SnapshotRow[];
  resolveAction: (actionId: string) => void;
  isMocked: boolean;
};

const RESOLVED_ACTIONS_STORAGE_KEY = "people-performance.mock.resolved-actions.v1";

export function usePerformanceWorkspaceData(employees: EmployeeRow[]): PerformanceWorkspaceData {
  const [resolvedActionIds, setResolvedActionIds] = useState<Set<string>>(() => new Set());
  const [storageLoaded, setStorageLoaded] = useState(false);

  useEffect(() => {
    setResolvedActionIds(readResolvedActionIds());
    setStorageLoaded(true);
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;
    writeResolvedActionIds(resolvedActionIds);
  }, [resolvedActionIds, storageLoaded]);

  const resolveAction = useCallback((actionId: string) => {
    setResolvedActionIds((current) => {
      if (current.has(actionId)) return current;
      const next = new Set(current);
      next.add(actionId);
      return next;
    });
  }, []);

  const performanceEmployees = useMemo(() => buildPerformanceEmployees(employees), [employees]);

  const baseActions = useMemo(() => buildMockActions(performanceEmployees), [performanceEmployees]);

  const actions = useMemo(
    () =>
      baseActions
        .filter((action) => !resolvedActionIds.has(action.id))
        .map((action) => ({
          ...action,
          status: action.status === "resolved" ? "open" : action.status,
        })),
    [baseActions, resolvedActionIds],
  );

  const resolvedActions = useMemo(
    () =>
      baseActions
        .filter((action) => resolvedActionIds.has(action.id))
        .map((action) => ({ ...action, status: "resolved" as const })),
    [baseActions, resolvedActionIds],
  );

  return useMemo(
    () => ({
      employees: performanceEmployees,
      actions,
      resolvedActions,
      goals: buildMockGoals(performanceEmployees),
      snapshots: buildMockSnapshots(performanceEmployees),
      resolveAction,
      isMocked: true,
    }),
    [actions, performanceEmployees, resolveAction, resolvedActions],
  );
}

function buildPerformanceEmployees(employees: EmployeeRow[]): PerformanceEmployee[] {
  const usableEmployees = employees.filter((employee) => employee.status !== "inactive");
  const realEmployees = usableEmployees.length > 0 ? usableEmployees : employees;
  const mockNeeded = Math.max(0, 6 - realEmployees.length);

  return [
    ...realEmployees.map((employee) => ({ ...employee, is_mock: false })),
    ...DEMO_EMPLOYEES.slice(0, mockNeeded),
  ];
}

function readResolvedActionIds(): Set<string> {
  if (typeof window === "undefined") return new Set();

  try {
    const raw = window.localStorage.getItem(RESOLVED_ACTIONS_STORAGE_KEY);
    if (!raw) return new Set();
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? new Set(value.filter((item) => typeof item === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

function writeResolvedActionIds(actionIds: Set<string>): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(RESOLVED_ACTIONS_STORAGE_KEY, JSON.stringify([...actionIds]));
  } catch {
    // Local persistence is a convenience for mock data and should never break the UI.
  }
}

function buildMockActions(employees: PerformanceEmployee[]): AlertRow[] {
  const activeEmployees = employees.filter((employee) => employee.status !== "inactive");
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

function buildMockGoals(employees: PerformanceEmployee[]): PerformanceGoal[] {
  const activeEmployees = employees.filter((employee) => employee.status !== "inactive");
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

function buildMockSnapshots(employees: PerformanceEmployee[]): SnapshotRow[] {
  const activeEmployees = employees.filter((employee) => employee.status !== "inactive");
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

const DEMO_EMPLOYEES: PerformanceEmployee[] = [
  {
    id: "mock-employee-ana-costa",
    name: "Ana Costa",
    email: "ana.costa@demo.local",
    role: "Analista Comercial",
    status: "active",
    avatar_url: null,
    department_id: null,
    manager_id: null,
    seniority: "Pleno",
    hire_date: "2024-02-12",
    notes: null,
    location: "São Paulo",
    contract_type: "CLT",
    behavioral_profile: null,
    is_mock: true,
  },
  {
    id: "mock-employee-bruno-lima",
    name: "Bruno Lima",
    email: "bruno.lima@demo.local",
    role: "Coordenador de Operações",
    status: "active",
    avatar_url: null,
    department_id: null,
    manager_id: null,
    seniority: "Coordenador",
    hire_date: "2023-08-21",
    notes: null,
    location: "Curitiba",
    contract_type: "CLT",
    behavioral_profile: null,
    is_mock: true,
  },
  {
    id: "mock-employee-carla-mendes",
    name: "Carla Mendes",
    email: "carla.mendes@demo.local",
    role: "Especialista de Sucesso",
    status: "active",
    avatar_url: null,
    department_id: null,
    manager_id: null,
    seniority: "Sênior",
    hire_date: "2022-11-03",
    notes: null,
    location: "Remoto",
    contract_type: "PJ",
    behavioral_profile: null,
    is_mock: true,
  },
  {
    id: "mock-employee-diego-rocha",
    name: "Diego Rocha",
    email: "diego.rocha@demo.local",
    role: "Assistente Administrativo",
    status: "active",
    avatar_url: null,
    department_id: null,
    manager_id: null,
    seniority: "Júnior",
    hire_date: "2025-01-15",
    notes: null,
    location: "Belo Horizonte",
    contract_type: "CLT",
    behavioral_profile: null,
    is_mock: true,
  },
  {
    id: "mock-employee-elisa-nunes",
    name: "Elisa Nunes",
    email: "elisa.nunes@demo.local",
    role: "Gerente de Atendimento",
    status: "active",
    avatar_url: null,
    department_id: null,
    manager_id: null,
    seniority: "Gerente",
    hire_date: "2021-05-18",
    notes: null,
    location: "Rio de Janeiro",
    contract_type: "CLT",
    behavioral_profile: null,
    is_mock: true,
  },
  {
    id: "mock-employee-felipe-alves",
    name: "Felipe Alves",
    email: "felipe.alves@demo.local",
    role: "Analista Financeiro",
    status: "active",
    avatar_url: null,
    department_id: null,
    manager_id: null,
    seniority: "Pleno",
    hire_date: "2023-03-07",
    notes: null,
    location: "Porto Alegre",
    contract_type: "CLT",
    behavioral_profile: null,
    is_mock: true,
  },
];
