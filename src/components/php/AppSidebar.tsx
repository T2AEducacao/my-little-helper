import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, ChartNoAxesCombined, LayoutDashboard, ListChecks, Settings, Target, Users } from "lucide-react";

const NAV_ITEMS = [
  { title: "Visão Geral", url: "/", icon: LayoutDashboard },
  { title: "Ações", url: "/alertas", icon: ListChecks },
  { title: "Pessoas", url: "/colaboradores", icon: Users },
  { title: "Metas e KPIs", url: "/metas", icon: Target },
  { title: "Análises", url: "/analises", icon: ChartNoAxesCombined },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
] as const;

export function AppSidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => (url === "/" ? currentPath === "/" : currentPath.startsWith(url));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">Performativo</span>
            <span className="text-[11px] text-sidebar-foreground/60">Performance de Efetivo</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
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
          Acompanhe KPIs, metas, evolução e desempenho do efetivo.
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
