import { PlaceholderPage } from "@/components/php/PlaceholderPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/analises")({
  component: () => (
    <PlaceholderPage
      title="Análises"
      description="Compare áreas, equipes, tendências e evolução de performance."
      empty={{
        title: "Análises em construção",
        description:
          "Aqui ficarão rankings, comparativos, tendências e relatórios gerenciais nas próximas fases.",
      }}
    />
  ),
});
