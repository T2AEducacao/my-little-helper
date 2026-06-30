import { Link, useRouterState } from "@tanstack/react-router";
import { ChartNoAxesCombined, LayoutDashboard, ListChecks, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { title: "Visão", url: "/", icon: LayoutDashboard },
  { title: "Ações", url: "/alertas", icon: ListChecks },
  { title: "Pessoas", url: "/colaboradores", icon: Users },
  { title: "KPIs", url: "/metas", icon: Target },
  { title: "Análises", url: "/analises", icon: ChartNoAxesCombined },
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
