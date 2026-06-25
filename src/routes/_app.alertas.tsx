import { PlaceholderPage } from "@/components/php/PlaceholderPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/alertas")({
  component: () => (
    <PlaceholderPage
      title="Alertas"
      description="Sinais que merecem ação: queda de performance, metas em risco e pendências."
      empty={{
        title: "Nenhum alerta encontrado",
        description:
          "Os alertas aparecerão quando houver metas em risco, queda de performance ou pendências importantes.",
      }}
    />
  ),
});
