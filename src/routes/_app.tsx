import { AppHeader } from "@/components/php/AppHeader";
import { AppSidebar } from "@/components/php/AppSidebar";
import { MobileBottomNav } from "@/components/php/MobileBottomNav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { lovableCloudAuth } from "@/integrations/lovable/auth";
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/": "Visão Geral",
  "/alertas": "Ações",
  "/colaboradores": "Pessoas",
  "/metas": "Metas e KPIs",
  "/analises": "Análises",
  "/avaliacoes": "Avaliações",
  "/feedbacks": "Feedbacks",
  "/reunioes": "Reuniões 1:1",
  "/desenvolvimento": "Desenvolvimento",
  "/insights": "Insights IA",
  "/configuracoes": "Configurações",
};

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    const redirectToAuth = () => {
      setChecked(false);
      navigate({ to: "/auth", replace: true });
    };

    lovableCloudAuth
      .getVerifiedSession({ ensureProfile: true })
      .then((auth) => {
        if (!mounted) return;
        if (!auth) redirectToAuth();
        else setChecked(true);
      })
      .catch((err) => {
        console.error("Lovable Cloud protected route auth error", err);
        if (mounted) redirectToAuth();
      });

    const unsubscribe = lovableCloudAuth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session) {
        lovableCloudAuth
          .getVerifiedSession({ ensureProfile: true })
          .then((auth) => {
            if (!mounted) return;
            if (auth) setChecked(true);
            else redirectToAuth();
          })
          .catch((err) => {
            console.error("Lovable Cloud auth state error", err);
            if (mounted) redirectToAuth();
          });
        return;
      }
      if (event === "SIGNED_OUT") {
        redirectToAuth();
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [navigate]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const title = PAGE_TITLES[pathname] ?? "Performativo";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <AppHeader title={title} />
          <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
            <Outlet />
          </main>
        </SidebarInset>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
