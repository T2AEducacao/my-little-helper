import { PlaceholderPage } from "@/components/php/PlaceholderPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/feedbacks")({
  component: () => (
    <PlaceholderPage
      title="Feedbacks"
      description="Troque feedbacks contínuos com foco em desenvolvimento."
      empty={{
        title: "Nenhum feedback registrado ainda",
        description:
          "Registre feedbacks contínuos para acelerar a evolução da sua equipe.",
      }}
    />
  ),
});
