import type { ProductivitySummary, UsageIntervalWithSource, UsageSourceType } from "./types";

export const PRODUCTIVITY_TABLES = {
  devices: "monitored_devices",
  sources: "usage_sources",
  intervals: "usage_intervals",
} as const;

export const PRODUCTIVITY_QUERY_KEYS = {
  devices: ["productivity", "devices"] as const,
  sources: ["productivity", "sources"] as const,
  intervals: ["productivity", "intervals"] as const,
  summary: ["productivity", "summary"] as const,
};

export const USAGE_SOURCE_LABEL: Record<UsageSourceType, string> = {
  app: "Aplicativo",
  website: "Site",
};

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

export function summarizeUsage(intervals: UsageIntervalWithSource[]): ProductivitySummary {
  const devices = new Set<string>();
  const sources = new Set<string>();

  return intervals.reduce<ProductivitySummary>(
    (summary, interval) => {
      devices.add(interval.device_id);
      sources.add(interval.source_id);

      const duration = interval.duration_seconds;
      summary.totalSeconds += duration;
      if (interval.source.source_type === "app") summary.appSeconds += duration;
      if (interval.source.source_type === "website") summary.websiteSeconds += duration;
      summary.deviceCount = devices.size;
      summary.sourceCount = sources.size;

      return summary;
    },
    {
      totalSeconds: 0,
      appSeconds: 0,
      websiteSeconds: 0,
      deviceCount: 0,
      sourceCount: 0,
    },
  );
}
