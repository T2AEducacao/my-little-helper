import { PlaceholderPage } from "@/components/php/PlaceholderPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/configuracoes/em-breve")({
  component: () => (
    <PlaceholderPage
      title="Módulo em preparação"
      description="Este módulo administrativo está sendo construído."
      empty={{
        title: "Em breve",
        description:
          "Este módulo está sendo preparado e em breve estará disponível por aqui.",
      }}
    />
  ),
});
