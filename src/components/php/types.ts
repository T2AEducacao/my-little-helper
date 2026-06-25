export type ScoreStatus = "excellent" | "good" | "attention" | "risk" | "critical" | "neutral";

export const SCORE_RANGES: { status: Exclude<ScoreStatus, "neutral">; label: string; min: number; max: number }[] = [
  { status: "excellent", label: "Excelente", min: 90, max: 100 },
  { status: "good", label: "Bom", min: 75, max: 89 },
  { status: "attention", label: "Atenção", min: 60, max: 74 },
  { status: "risk", label: "Risco", min: 40, max: 59 },
  { status: "critical", label: "Crítico", min: 0, max: 39 },
];

export function scoreToStatus(score: number | null | undefined): ScoreStatus {
  if (score === null || score === undefined || Number.isNaN(score)) return "neutral";
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "attention";
  if (score >= 40) return "risk";
  return "critical";
}

export function scoreLabel(status: ScoreStatus): string {
  return (
    {
      excellent: "Excelente",
      good: "Bom",
      attention: "Atenção",
      risk: "Risco",
      critical: "Crítico",
      neutral: "Sem dados",
    } as const
  )[status];
}
