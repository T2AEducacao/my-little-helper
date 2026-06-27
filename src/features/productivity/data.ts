import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";

import type {
  DailyUsagePoint,
  DeviceUsageSummary,
  MonitoredDevice,
  ProductivityDashboardRange,
  ProductivitySummary,
  SourceUsageSummary,
  UsageInterval,
  UsageIntervalWithSource,
  UsageSource,
  UsageSourceType,
} from "./types";

export const PRODUCTIVITY_TABLES = {
  devices: "monitored_devices",
  sources: "usage_sources",
  intervals: "usage_intervals",
} as const;

export const PRODUCTIVITY_QUERY_KEYS = {
  devices: ["productivity", "devices"] as const,
  sources: ["productivity", "sources"] as const,
  intervals: (range: ProductivityDashboardRange) => ["productivity", "intervals", range] as const,
  summary: (range: ProductivityDashboardRange) => ["productivity", "summary", range] as const,
};

export const USAGE_SOURCE_LABEL: Record<UsageSourceType, string> = {
  app: "Aplicativo",
  website: "Site",
};

const DEVICE_COLS =
  "id,company_id,user_id,name,platform,external_key,last_seen_at,created_at,updated_at";
const SOURCE_COLS = "id,company_id,source_type,name,identifier,metadata,created_at,updated_at";
const INTERVAL_COLS =
  "id,company_id,user_id,device_id,source_id,started_at,ended_at,duration_seconds,created_at";

type ProductivityQueryResult<T> = {
  data: T[] | null;
  error: { code?: string; details?: string; hint?: string; message?: string } | null;
};

type ProductivityQuery<T> = PromiseLike<ProductivityQueryResult<T>> & {
  gte(column: string, value: string): ProductivityQuery<T>;
  order(column: string, options?: { ascending?: boolean }): ProductivityQuery<T>;
  limit(count: number): ProductivityQuery<T>;
};

type ProductivityTable = {
  select<T>(columns: string): ProductivityQuery<T>;
};

type ProductivityClient = {
  from(table: string): ProductivityTable;
};

const productivityClient = supabase as unknown as ProductivityClient;

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

export function useMonitoredDevices() {
  return useQuery({
    queryKey: PRODUCTIVITY_QUERY_KEYS.devices,
    queryFn: async () => {
      const { data, error } = await productivityClient
        .from(PRODUCTIVITY_TABLES.devices)
        .select<MonitoredDevice>(DEVICE_COLS)
        .order("name", { ascending: true });

      if (isProductivitySchemaPending(error)) return [];
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUsageSources() {
  return useQuery({
    queryKey: PRODUCTIVITY_QUERY_KEYS.sources,
    queryFn: async () => {
      const { data, error } = await productivityClient
        .from(PRODUCTIVITY_TABLES.sources)
        .select<UsageSource>(SOURCE_COLS)
        .order("name", { ascending: true });

      if (isProductivitySchemaPending(error)) return [];
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUsageIntervals(range: ProductivityDashboardRange) {
  return useQuery({
    queryKey: PRODUCTIVITY_QUERY_KEYS.intervals(range),
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - Number(range));

      const { data, error } = await productivityClient
        .from(PRODUCTIVITY_TABLES.intervals)
        .select<UsageInterval>(INTERVAL_COLS)
        .gte("started_at", cutoff.toISOString())
        .order("started_at", { ascending: true })
        .limit(5000);

      if (isProductivitySchemaPending(error)) return [];
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProductivityOverview(range: ProductivityDashboardRange) {
  const devicesQuery = useMonitoredDevices();
  const sourcesQuery = useUsageSources();
  const intervalsQuery = useUsageIntervals(range);

  const intervals = useMemo(
    () =>
      enrichUsageIntervals(
        intervalsQuery.data ?? [],
        sourcesQuery.data ?? [],
        devicesQuery.data ?? [],
      ),
    [devicesQuery.data, intervalsQuery.data, sourcesQuery.data],
  );

  const summary = useMemo(() => summarizeUsage(intervals), [intervals]);
  const sourceSummaries = useMemo(() => buildSourceUsageSummary(intervals), [intervals]);
  const deviceSummaries = useMemo(() => buildDeviceUsageSummary(intervals), [intervals]);
  const dailySeries = useMemo(() => buildDailyUsageSeries(intervals), [intervals]);

  return {
    devices: devicesQuery.data ?? [],
    sources: sourcesQuery.data ?? [],
    intervals,
    summary,
    sourceSummaries,
    deviceSummaries,
    dailySeries,
    isLoading: devicesQuery.isLoading || sourcesQuery.isLoading || intervalsQuery.isLoading,
    isError: devicesQuery.isError || sourcesQuery.isError || intervalsQuery.isError,
    error: devicesQuery.error ?? sourcesQuery.error ?? intervalsQuery.error ?? null,
  };
}

export function enrichUsageIntervals(
  intervals: UsageInterval[],
  sources: UsageSource[],
  devices: MonitoredDevice[],
): UsageIntervalWithSource[] {
  const sourceById = new Map(sources.map((source) => [source.id, source] as const));
  const deviceById = new Map(devices.map((device) => [device.id, device] as const));

  return intervals.flatMap((interval) => {
    const source = sourceById.get(interval.source_id);
    const device = deviceById.get(interval.device_id);
    if (!source || !device) return [];

    return {
      ...interval,
      source: {
        id: source.id,
        name: source.name,
        source_type: source.source_type,
        identifier: source.identifier,
      },
      device: {
        id: device.id,
        name: device.name,
        platform: device.platform,
      },
    };
  });
}

export function buildSourceUsageSummary(
  intervals: UsageIntervalWithSource[],
): SourceUsageSummary[] {
  const totalSeconds = intervals.reduce((sum, interval) => sum + interval.duration_seconds, 0);
  const bySource = new Map<string, SourceUsageSummary>();

  for (const interval of intervals) {
    const existing = bySource.get(interval.source_id);
    if (existing) {
      existing.totalSeconds += interval.duration_seconds;
      existing.intervalCount += 1;
      continue;
    }

    bySource.set(interval.source_id, {
      sourceId: interval.source_id,
      name: interval.source.name,
      identifier: interval.source.identifier,
      sourceType: interval.source.source_type,
      totalSeconds: interval.duration_seconds,
      intervalCount: 1,
      percentage: 0,
    });
  }

  return Array.from(bySource.values())
    .map((item) => ({
      ...item,
      percentage: totalSeconds > 0 ? (item.totalSeconds / totalSeconds) * 100 : 0,
    }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);
}

export function buildDeviceUsageSummary(
  intervals: UsageIntervalWithSource[],
): DeviceUsageSummary[] {
  const totalSeconds = intervals.reduce((sum, interval) => sum + interval.duration_seconds, 0);
  const byDevice = new Map<string, DeviceUsageSummary>();

  for (const interval of intervals) {
    const existing = byDevice.get(interval.device_id);
    if (existing) {
      existing.totalSeconds += interval.duration_seconds;
      existing.intervalCount += 1;
      continue;
    }

    byDevice.set(interval.device_id, {
      deviceId: interval.device_id,
      name: interval.device.name,
      platform: interval.device.platform,
      totalSeconds: interval.duration_seconds,
      intervalCount: 1,
      percentage: 0,
    });
  }

  return Array.from(byDevice.values())
    .map((item) => ({
      ...item,
      percentage: totalSeconds > 0 ? (item.totalSeconds / totalSeconds) * 100 : 0,
    }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);
}

export function buildDailyUsageSeries(intervals: UsageIntervalWithSource[]): DailyUsagePoint[] {
  const byDay = new Map<string, DailyUsagePoint>();

  for (const interval of intervals) {
    const day = interval.started_at.slice(0, 10);
    const existing =
      byDay.get(day) ??
      ({
        date: day,
        totalSeconds: 0,
        appSeconds: 0,
        websiteSeconds: 0,
      } satisfies DailyUsagePoint);

    existing.totalSeconds += interval.duration_seconds;
    if (interval.source.source_type === "app") existing.appSeconds += interval.duration_seconds;
    if (interval.source.source_type === "website") {
      existing.websiteSeconds += interval.duration_seconds;
    }
    byDay.set(day, existing);
  }

  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function isProductivitySchemaPending(error: ProductivityQueryResult<unknown>["error"]): boolean {
  if (!error) return false;

  const message = error.message?.toLowerCase() ?? "";
  const details = error.details?.toLowerCase() ?? "";
  const hint = error.hint?.toLowerCase() ?? "";
  const text = `${message} ${details} ${hint}`;

  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    text.includes("could not find the table") ||
    text.includes("monitored_devices") ||
    text.includes("usage_sources") ||
    text.includes("usage_intervals") ||
    (text.includes("relation") && text.includes("does not exist"))
  );
}
