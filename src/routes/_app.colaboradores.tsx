import { PlaceholderPage } from "@/components/php/PlaceholderPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/colaboradores")({
  component: () => (
    <PlaceholderPage
      title="Colaboradores"
      description="Cadastre, organize e acompanhe sua equipe."
      empty={{
        title: "Nenhum colaborador cadastrado ainda",
        description:
          "Cadastre a primeira pessoa da equipe para começar a acompanhar performance, metas e feedbacks.",
      }}
    />
  ),
});
