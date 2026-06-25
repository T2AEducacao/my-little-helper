import { PlaceholderPage } from "@/components/php/PlaceholderPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/desenvolvimento")({
  component: () => (
    <PlaceholderPage
      title="Desenvolvimento"
      description="Trilhas, PDIs e ações de evolução da equipe."
      empty={{
        title: "Nenhum plano de desenvolvimento criado",
        description:
          "Crie PDIs e trilhas para acelerar o crescimento dos seus colaboradores.",
      }}
    />
  ),
});
