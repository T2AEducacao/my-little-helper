export type UsageSourceType = "app" | "website";

export type MonitoredDevice = {
  id: string;
  company_id: string;
  user_id: string | null;
  name: string;
  platform: string | null;
  external_key: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UsageSource = {
  id: string;
  company_id: string;
  source_type: UsageSourceType;
  name: string;
  identifier: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type UsageInterval = {
  id: string;
  company_id: string;
  user_id: string | null;
  device_id: string;
  source_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  created_at: string;
};

export type UsageIntervalWithSource = UsageInterval & {
  source: Pick<UsageSource, "id" | "name" | "source_type" | "identifier">;
  device: Pick<MonitoredDevice, "id" | "name" | "platform">;
};

export type ProductivityDashboardRange = "7" | "30" | "90";

export type ProductivitySummary = {
  totalSeconds: number;
  appSeconds: number;
  websiteSeconds: number;
  deviceCount: number;
  sourceCount: number;
};

export type SourceUsageSummary = {
  sourceId: string;
  name: string;
  identifier: string;
  sourceType: UsageSourceType;
  totalSeconds: number;
  intervalCount: number;
  percentage: number;
};

export type DeviceUsageSummary = {
  deviceId: string;
  name: string;
  platform: string | null;
  totalSeconds: number;
  intervalCount: number;
  percentage: number;
};

export type DailyUsagePoint = {
  date: string;
  totalSeconds: number;
  appSeconds: number;
  websiteSeconds: number;
};
