import { PlaceholderPage } from "@/components/php/PlaceholderPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/configuracoes")({
  component: () => (
    <PlaceholderPage
      title="Configurações"
      description="Empresa, áreas, papéis e preferências do sistema."
      empty={{
        title: "Configurações em breve",
        description:
          "Em breve você poderá personalizar empresa, departamentos, papéis e integrações.",
      }}
    />
  ),
});
