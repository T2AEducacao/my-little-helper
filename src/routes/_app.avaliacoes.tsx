import { PlaceholderPage } from "@/components/php/PlaceholderPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/avaliacoes")({
  component: () => (
    <PlaceholderPage
      title="Avaliações"
      description="Registre avaliações periódicas e acompanhe a evolução."
      empty={{
        title: "Nenhuma avaliação registrada ainda",
        description:
          "Registre a primeira avaliação para começar a montar o histórico de performance.",
      }}
    />
  ),
});
