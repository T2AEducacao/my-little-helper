import { PlaceholderPage } from "@/components/php/PlaceholderPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/insights")({
  component: () => (
    <PlaceholderPage
      title="Insights IA"
      description="Recomendações inteligentes para apoiar suas decisões."
      empty={{
        title: "Sem insights gerados ainda",
        description:
          "Conforme houver dados suficientes, a IA gerará insights e ações recomendadas aqui.",
      }}
    />
  ),
});
