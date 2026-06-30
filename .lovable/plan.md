
## Configurações — Hub Administrativo

Substituir o placeholder de `/configuracoes` por um hub organizado em 5 categorias, com cards listando módulos administrativos. Sem backend, sem CRUD — apenas arquitetura visual reaproveitando o Design System.

### Arquitetura

Página única (`src/routes/_app.configuracoes.tsx`):

1. `PageHeader` — "Configurações" + descrição curta.
2. Grid responsivo (`grid-cols-1 lg:grid-cols-2`) com 5 `SectionCard`, um por categoria.
3. Em cada card, lista vertical de `SettingsItem` (componente inline na própria rota).

### Categorias e módulos

| Categoria   | Módulos (ícone · nome · descrição · status)                                                                                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empresa     | Building2 · Dados da empresa · "Razão social, CNPJ, contato" · Em desenvolvimento<br>Palette · Identidade visual · "Logo e cores do sistema" · Planejado                                                                      |
| Organização | FolderTree · Departamentos · "Organize as áreas da empresa" · Em desenvolvimento<br>Briefcase · Cargos · "Cargos e senioridades" · Planejado<br>MapPin · Unidades · "Filiais e localidades" · Planejado                       |
| Pessoas     | Users · Usuários · "Gerencie usuários do sistema" · Em desenvolvimento<br>UserCog · Gestores · "Defina líderes e suas equipes" · Planejado<br>Lock · Permissões · "Controle o acesso dos usuários" · Planejado               |
| Performance | Gauge · Escala de Score · "Faixas e cores de performance" · Planejado<br>MessageSquare · Categorias de Feedback · "Tipos e tags de feedback" · Planejado<br>Target · Tipos de Meta · "Categorias e unidades de meta" · Planejado |
| Sistema     | Plug · Integrações · "Conecte ferramentas externas" · Planejado<br>History · Auditoria · "Histórico de alterações" · Planejado<br>ArrowDownUp · Importação / Exportação · "Mova dados em massa" · Planejado                  |

### Status

Apenas dois rótulos nesta fase, via `StatusBadge`:

- **Em desenvolvimento** — tom `info`
- **Planejado** — tom `neutral`

Quando um módulo virar realidade, o status passa para "Disponível".

### Linha do item (`SettingsItem`)

Botão clicável ocupando a linha:

```text
[ícone 36px]  Nome do módulo                  [StatusBadge]  ›
              Descrição curta em muted
```

Hover suave (`hover:bg-muted/40`), divisor sutil entre itens, sem bordas pesadas. Componente inline na rota — não cria padrão global novo.

### Navegação

Todos os itens apontam para uma **única** rota placeholder compartilhada:

- Nova rota `src/routes/_app.configuracoes.em-breve.tsx` reaproveitando `PlaceholderPage` com cópia genérica ("Este módulo está sendo preparado. Em breve estará disponível aqui.").

Sem rotas dinâmicas por slug. Quando um módulo começar a ser desenvolvido de verdade (Departamentos, Usuários etc.), ele ganha sua própria rota e o link no hub é atualizado pontualmente.

### Arquivos

- **Editar** `src/routes/_app.configuracoes.tsx` — implementa o hub.
- **Criar** `src/routes/_app.configuracoes.em-breve.tsx` — placeholder único.

### Fora do escopo

CRUD, backend, permissões reais, integrações, auditoria, importação/exportação.
