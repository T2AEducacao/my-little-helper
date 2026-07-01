import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovableCloudAuth } from "@/integrations/lovable/auth";
import { getCurrentAccessContext } from "@/lib/goals-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BarChart3, LogOut, Moon, Sun, Target, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/funcionario")({
  ssr: false,
  component: EmployeeLayout,
});

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-card/80 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Performativo</h1>
            <p className="text-xs text-muted-foreground">Portal do colaborador</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
              title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
              onClick={toggleTheme}
              className="h-9 w-9"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 px-2 sm:px-4">
          <TabLink to="/funcionario" active={pathname === "/funcionario"} icon={Target}>
            Minhas Metas
          </TabLink>
          <TabLink
            to="/funcionario/perfil"
            active={pathname === "/funcionario/perfil"}
            icon={UserRound}
          >
            Perfil
          </TabLink>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

function TabLink({
  to,
  active,
  icon: Icon,
  children,
}: {
  to: string;
  active: boolean;
  icon: typeof Target;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}
