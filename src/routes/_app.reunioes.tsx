import { PlaceholderPage } from "@/components/php/PlaceholderPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/reunioes")({
  component: () => (
    <PlaceholderPage
      title="Reuniões 1:1"
      description="Planeje, registre e dê continuidade às suas conversas individuais."
      empty={{
        title: "Nenhuma 1:1 agendada",
        description:
          "Agende e registre conversas individuais com foco em desenvolvimento e desbloqueios.",
      }}
    />
  ),
});
