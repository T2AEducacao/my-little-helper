import { EmptyState } from "@/components/php/EmptyState";
import { FilterBar } from "@/components/php/FilterBar";
import { MetricCard } from "@/components/php/MetricCard";
import { PageHeader } from "@/components/php/PageHeader";
import { SectionCard } from "@/components/php/SectionCard";
import {
  USAGE_SOURCE_LABEL,
  formatDuration,
  useProductivityOverview,
} from "@/features/productivity";
import type {
  DeviceUsageSummary,
  ProductivityDashboardRange,
  SourceUsageSummary,
} from "@/features/productivity";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AppWindow,
  BarChart3,
  Clock3,
  Database,
  Globe2,
  HardDrive,
  Laptop,
  MonitorDot,
  MousePointerClick,
  Radar,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RANGE_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
] as const;

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Dashboard de Produtividade · People Performance Hub" },
      {
        name: "description",
        content:
          "Acompanhe tempo de uso por aplicativos, sites e dispositivos conectados ao Lovable Cloud.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [range, setRange] = useState<ProductivityDashboardRange>("30");
  const { summary, sourceSummaries, deviceSummaries, dailySeries, isLoading, isError, error } =
    useProductivityOverview(range);

  const hasUsageData = summary.totalSeconds > 0;
  const appPercentage =
    summary.totalSeconds > 0 ? Math.round((summary.appSeconds / summary.totalSeconds) * 100) : 0;
  const websitePercentage =
    summary.totalSeconds > 0
      ? Math.round((summary.websiteSeconds / summary.totalSeconds) * 100)
      : 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <PageHeader
        title="Dashboard de Produtividade"
        description="Visão inicial do tempo monitorado por aplicativos, sites e dispositivos."
        actions={
          <FilterBar<ProductivityDashboardRange>
            value={range}
            onChange={setRange}
            options={[...RANGE_OPTIONS]}
          />
        }
      />

      {isError && (
        <EmptyState
          icon={Database}
          title="Não foi possível carregar os dados de produtividade"
          description={getErrorMessage(error)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tempo monitorado"
          icon={Clock3}
          value={formatDuration(summary.totalSeconds)}
          isEmpty={!hasUsageData && !isLoading}
          emptyMessage="Nenhum tempo registrado no período."
          footer={isLoading ? "Carregando dados do Lovable Cloud..." : `Últimos ${range} dias.`}
        />
        <MetricCard
          label="Aplicativos"
          icon={AppWindow}
          value={formatDuration(summary.appSeconds)}
          hint={hasUsageData ? `${appPercentage}%` : undefined}
          isEmpty={!hasUsageData && !isLoading}
          emptyMessage="Sem uso de aplicativos registrado."
          footer="Tempo classificado como app."
        />
        <MetricCard
          label="Sites"
          icon={Globe2}
          value={formatDuration(summary.websiteSeconds)}
          hint={hasUsageData ? `${websitePercentage}%` : undefined}
          isEmpty={!hasUsageData && !isLoading}
          emptyMessage="Sem uso de sites registrado."
          footer="Tempo classificado como website."
        />
        <MetricCard
          label="Dispositivos ativos"
          icon={Laptop}
          value={summary.deviceCount}
          isEmpty={!hasUsageData && !isLoading}
          emptyMessage="Nenhum dispositivo com atividade."
          footer={
            summary.sourceCount > 0
              ? `${summary.sourceCount} fonte(s) monitorada(s) no período.`
              : "Aguardando envio de dados."
          }
        />
      </div>

      <SectionCard
        title="Uso diário"
        description="Evolução do tempo monitorado no período selecionado."
      >
        {dailySeries.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Ainda não há histórico de uso"
            description="Quando intervalos de uso forem registrados no Lovable Cloud, a tendência diária aparecerá aqui."
          />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="usageArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-muted-foreground)"
                  tickFormatter={(value) => formatDuration(Number(value))}
                />
                <Tooltip
                  formatter={(value) => formatDuration(Number(value))}
                  labelFormatter={(label) => `Dia ${label}`}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalSeconds"
                  name="Tempo monitorado"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#usageArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Aplicativos e sites mais usados"
          description="Fontes ordenadas pelo tempo total registrado."
        >
          {sourceSummaries.length === 0 ? (
            <EmptyState
              icon={MousePointerClick}
              title="Nenhuma fonte monitorada ainda"
              description="Apps e sites aparecerão aqui assim que houver intervalos de uso vinculados a eles."
            />
          ) : (
            <UsageSourceList items={sourceSummaries.slice(0, 8)} />
          )}
        </SectionCard>

        <SectionCard
          title="Dispositivos com atividade"
          description="Computadores que enviaram intervalos de uso no período."
        >
          {deviceSummaries.length === 0 ? (
            <EmptyState
              icon={HardDrive}
              title="Nenhum dispositivo ativo"
              description="A base já está preparada para múltiplos computadores, mas ainda não há atividade registrada."
            />
          ) : (
            <DeviceUsageList items={deviceSummaries.slice(0, 8)} />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Status da base de monitoramento"
        description="O que já está pronto para receber dados de produtividade."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatusItem
            icon={ShieldCheck}
            title="Isolamento por empresa"
            description="As leituras passam pelo RLS do Lovable Cloud usando o vínculo de empresa do usuário."
          />
          <StatusItem
            icon={MonitorDot}
            title="Estrutura multi-dispositivo"
            description="A base aceita múltiplos computadores por conta para suportar o coletor futuro."
          />
          <StatusItem
            icon={Radar}
            title="Coletor ainda não criado"
            description="Esta etapa não instala nada no computador; apenas mostra os dados quando existirem."
          />
        </div>
      </SectionCard>
    </div>
  );
}

function UsageSourceList({ items }: { items: SourceUsageSummary[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <UsageRow
          key={item.sourceId}
          icon={item.sourceType === "app" ? AppWindow : Globe2}
          title={item.name}
          subtitle={`${USAGE_SOURCE_LABEL[item.sourceType]} · ${item.identifier}`}
          totalSeconds={item.totalSeconds}
          percentage={item.percentage}
        />
      ))}
    </div>
  );
}

function DeviceUsageList({ items }: { items: DeviceUsageSummary[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <UsageRow
          key={item.deviceId}
          icon={Laptop}
          title={item.name}
          subtitle={item.platform ?? "Plataforma não informada"}
          totalSeconds={item.totalSeconds}
          percentage={item.percentage}
        />
      ))}
    </div>
  );
}

function UsageRow({
  icon: Icon,
  title,
  subtitle,
  totalSeconds,
  percentage,
}: {
  icon: typeof Activity;
  title: string;
  subtitle: string;
  totalSeconds: number;
  percentage: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {formatDuration(totalSeconds)}
          </p>
          <p className="text-xs text-muted-foreground">{Math.round(percentage)}%</p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(3, Math.min(100, percentage))}%` }}
        />
      </div>
    </div>
  );
}

function StatusItem({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Verifique se a migration de produtividade foi aplicada no Lovable Cloud.";
}
