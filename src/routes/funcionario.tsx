import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovableCloudAuth } from "@/integrations/lovable/auth";
import { getCurrentAccessContext } from "@/lib/goals-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { BarChart3, LogOut, Moon, Sun, Target, UserRound } from "lucide-react";

export const Route = createFileRoute("/funcionario")({
  ssr: false,
  component: EmployeeLayout,
});

const NAV_ITEMS = [
  { title: "Minhas Metas", url: "/funcionario", icon: Target, exact: true },
  { title: "Perfil", url: "/funcionario/perfil", icon: UserRound, exact: true },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/funcionario": "Minhas Metas",
  "/funcionario/perfil": "Perfil",
};

function EmployeeLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [ready, setReady] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored ? stored === "dark" : prefers;
    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const auth = await lovableCloudAuth.getVerifiedSession({ ensureProfile: false });
        if (!auth) {
          navigate({ to: "/auth", replace: true });
          return;
        }
        const access = await getCurrentAccessContext();
        if (!mounted) return;
        if (!access.isEmployeePortalUser) {
          navigate({ to: "/", replace: true });
          return;
        }
        setReady(true);
      } catch {
        if (mounted) navigate({ to: "/auth", replace: true });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const title = PAGE_TITLES[pathname] ?? "Portal do colaborador";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <EmployeeSidebar pathname={pathname} />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 min-w-0 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur sm:px-4 md:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="min-w-0 truncate text-sm font-medium text-foreground">{title}</div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
                title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
                className="h-9 w-9 bg-card shadow-[var(--shadow-soft)]"
                onClick={toggleTheme}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sair"
                className="h-9 w-9"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="min-w-0 flex-1 px-3 pb-10 pt-5 sm:px-4 md:px-8 md:pt-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function EmployeeSidebar({ pathname }: { pathname: string }) {
  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link to="/funcionario" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">Performativo</span>
            <span className="text-[11px] text-sidebar-foreground/60">Portal do colaborador</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url, item.exact)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-3 group-data-[collapsible=icon]:hidden">
        <p className="px-2 text-[11px] text-sidebar-foreground/60">
          Acompanhe suas metas e mantenha seu perfil atualizado.
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
