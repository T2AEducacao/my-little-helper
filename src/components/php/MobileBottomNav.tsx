import { Link, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, LayoutDashboard, Sparkles, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { title: "Início", url: "/", icon: LayoutDashboard },
  { title: "Pessoas", url: "/colaboradores", icon: Users },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Alertas", url: "/alertas", icon: AlertTriangle },
  { title: "IA", url: "/insights", icon: Sparkles },
] as const;

export function MobileBottomNav() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur md:hidden">
      {ITEMS.map((item) => {
        const active = item.url === "/" ? currentPath === "/" : currentPath.startsWith(item.url);
        return (
          <Link
            key={item.url}
            to={item.url}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2.5 text-[11px]",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
