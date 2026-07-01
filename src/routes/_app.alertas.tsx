import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/alertas")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
