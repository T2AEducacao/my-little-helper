import { PageHeader } from "@/components/php/PageHeader";
import { SectionCard } from "@/components/php/SectionCard";
import { StatusBadge } from "@/components/php/StatusBadge";
import { cn } from "@/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownUp,
  Briefcase,
  Building2,
  ChevronRight,
  FolderTree,
  Gauge,
  History,
  Lock,
  MapPin,
  MessageSquare,
  Palette,
  Plug,
  Target,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

type ItemStatus = "em-desenvolvimento" | "planejado";

interface SettingsItemData {
  icon: LucideIcon;
  name: string;
  description: string;
  status: ItemStatus;
}

interface SettingsGroup {
  title: string;
  description: string;
  items: SettingsItemData[];
}

const GROUPS: SettingsGroup[] = [
  {
    title: "Empresa",
    description: "Informações institucionais e identidade visual.",
    items: [
      {
        icon: Building2,
        name: "Dados da empresa",
        description: "Razão social, CNPJ e informações de contato.",
        status: "em-desenvolvimento",
      },
      {
        icon: Palette,
        name: "Identidade visual",
        description: "Logo e cores aplicadas ao sistema.",
        status: "planejado",
      },
    ],
  },
  {
    title: "Organização",
    description: "Estrutura organizacional da operação.",
    items: [
      {
        icon: FolderTree,
        name: "Departamentos",
        description: "Organize as áreas e equipes da empresa.",
        status: "em-desenvolvimento",
      },
      {
        icon: Briefcase,
        name: "Cargos",
        description: "Cargos, senioridades e trilhas.",
        status: "planejado",
      },
      {
        icon: MapPin,
        name: "Unidades",
        description: "Filiais, escritórios e localidades.",
        status: "planejado",
      },
    ],
  },
  {
    title: "Pessoas",
    description: "Usuários, gestores e controle de acesso.",
    items: [
      {
        icon: Users,
        name: "Usuários",
        description: "Gerencie quem tem acesso ao sistema.",
        status: "em-desenvolvimento",
      },
      {
        icon: UserCog,
        name: "Gestores",
        description: "Defina líderes e suas equipes diretas.",
        status: "planejado",
      },
      {
        icon: Lock,
        name: "Permissões",
        description: "Controle os níveis de acesso por papel.",
        status: "planejado",
      },
    ],
  },
  {
    title: "Performance",
    description: "Parâmetros de avaliação e acompanhamento.",
    items: [
      {
        icon: Gauge,
        name: "Escala de score",
        description: "Faixas e cores que representam performance.",
        status: "planejado",
      },
      {
        icon: MessageSquare,
        name: "Categorias de feedback",
        description: "Tipos e tags usados nos feedbacks.",
        status: "planejado",
      },
      {
        icon: Target,
        name: "Tipos de meta",
        description: "Categorias e unidades disponíveis para metas.",
        status: "planejado",
      },
    ],
  },
  {
    title: "Sistema",
    description: "Operação, integrações e dados da plataforma.",
    items: [
      {
        icon: Plug,
        name: "Integrações",
        description: "Conecte ferramentas externas ao sistema.",
        status: "planejado",
      },
      {
        icon: History,
        name: "Auditoria",
        description: "Histórico de alterações sensíveis.",
        status: "planejado",
      },
      {
        icon: ArrowDownUp,
        name: "Importação e exportação",
        description: "Mova dados em massa entre sistemas.",
        status: "planejado",
      },
    ],
  },
];

function SettingsItem({ icon: Icon, name, description, status }: SettingsItemData) {
  return (
    <Link
      to="/configuracoes/em-breve"
      className={cn(
        "group grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg px-2 py-3 transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{name}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      {status === "em-desenvolvimento" ? (
        <StatusBadge tone="info">Em desenvolvimento</StatusBadge>
      ) : (
        <StatusBadge tone="neutral">Planejado</StatusBadge>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

function ConfiguracoesPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Configurações"
        description="Administre empresa, estrutura organizacional, pessoas, performance e sistema em um único lugar."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {GROUPS.map((group) => (
          <SectionCard
            key={group.title}
            title={group.title}
            description={group.description}
            contentClassName="px-3 pb-3 pt-1"
          >
            <div className="flex flex-col divide-y divide-border/60">
              {group.items.map((item) => (
                <SettingsItem key={item.name} {...item} />
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_app/configuracoes")({
  component: ConfiguracoesPage,
});
