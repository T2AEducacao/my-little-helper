import { EmptyState } from "@/components/php/EmptyState";
import { MetricCard } from "@/components/php/MetricCard";
import { PageHeader } from "@/components/php/PageHeader";
import { SectionCard } from "@/components/php/SectionCard";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  MessageSquare,
  Sparkles,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/_app/alertas")({
  head: () => ({
    meta: [
      { title: "Ações · People Performance Hub" },
      {
        name: "description",
        content:
          "Centralize prioridades, pendências e próximos passos para a rotina diária de gestão.",
      },
    ],
  }),
  component: ActionsPage,
});

function ActionsPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Ações"
        description="Organize o dia do gestor por urgência, impacto e próximo passo."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <CheckCircle2 className="h-4 w-4" />
              Voltar à visão geral
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Críticas"
          icon={AlertTriangle}
          value="—"
          isEmpty
          emptyMessage="Sem ações críticas carregadas."
          footer="Prioridade máxima para riscos e quedas relevantes."
          className="border-status-critical/30"
        />
        <MetricCard
          label="Para hoje"
          icon={CalendarClock}
          value="—"
          isEmpty
          emptyMessage="Nenhuma ação do dia carregada."
          footer="Pendências que devem orientar a rotina diária."
        />
        <MetricCard
          label="Metas e KPIs"
          icon={Target}
          value="—"
          isEmpty
          emptyMessage="Nenhuma meta em risco carregada."
          footer="Metas em risco e KPIs pendentes aparecerão aqui."
        />
        <MetricCard
          label="Reconhecimentos"
          icon={Sparkles}
          value="—"
          isEmpty
          emptyMessage="Nenhuma sugestão carregada."
          footer="Ações positivas também devem entrar na rotina."
          className="border-status-excellent/30"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <SectionCard
          title="Fila de prioridades"
          description="Prioridades que exigem decisão do gestor, da mais urgente para a menos urgente."
        >
          <EmptyState
            icon={ClipboardCheck}
            title="Nenhuma prioridade carregada"
            description="Quando houver alertas, pessoas em atenção ou KPIs pendentes, eles aparecerão nesta fila."
          />
        </SectionCard>

        <SectionCard
          title="Próximos passos"
          description="Atalhos para as fontes de contexto do gestor."
          contentClassName="space-y-3"
        >
          <ActionShortcut
            icon={AlertTriangle}
            title="Riscos e quedas"
            description="Sinais que exigem análise rápida."
          />
          <ActionShortcut
            icon={MessageSquare}
            title="Conversas pendentes"
            description="Feedbacks, alinhamentos e 1:1s."
          />
          <ActionShortcut
            icon={Target}
            title="Metas em atenção"
            description="Indicadores que precisam de correção de rota."
          />
        </SectionCard>
      </div>
    </div>
  );
}

function ActionShortcut({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
