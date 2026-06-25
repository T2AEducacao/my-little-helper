import { PlaceholderPage } from "@/components/php/PlaceholderPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/metas")({
  component: () => (
    <PlaceholderPage
      title="Metas e Indicadores"
      description="Defina e acompanhe metas individuais e da equipe."
      empty={{
        title: "Nenhuma meta cadastrada ainda",
        description:
          "Defina metas claras para a equipe e acompanhe o progresso aqui.",
      }}
    />
  ),
});
