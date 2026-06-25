
# People Performance Hub — Prompt 1 (Base + Dashboard)

Vou implementar a primeira fase do SaaS conforme o anexo: estrutura geral, banco de dados inicial, Dashboard de Performance e componentes reutilizáveis. Visão Admin/Gestor.

## 1. Backend (Lovable Cloud)

Ativar Lovable Cloud e criar migração com as tabelas:
- `companies`, `profiles`, `departments`, `employees`
- `performance_snapshots`, `performance_alerts`, `activity_logs`
- Enum `app_role` + tabela `user_roles` + função `has_role` (segurança)
- RLS habilitado em todas as tabelas, isolando por `company_id` via função `get_user_company_id()` (security definer)
- GRANTs explícitos para `authenticated` e `service_role`

Sem seed de dados fictícios. Tudo começa vazio.

## 2. Layout geral

- `src/routes/_app.tsx` — layout autenticado com Sidebar fixa (desktop) + bottom nav (mobile) + Header
- Sidebar com os 10 itens: Dashboard, Colaboradores, Metas e Indicadores, Avaliações, Feedbacks, Reuniões 1:1, Desenvolvimento, Alertas, Insights IA, Configurações
- Header: título da página, busca rápida, botão de ações
- Rotas placeholder (com EmptyState próprio) para os itens que ainda não foram especificados; o Dashboard fica completo

## 3. Dashboard (`/`)

Move o conteúdo do index para o dashboard completo:
- Header: "Dashboard de Performance" + subtítulo + botões Novo colaborador / Registrar avaliação / Gerar insight IA
- 6 MetricCards: Score médio, Colaboradores ativos, Em destaque (≥90), Em atenção (40–74), Alertas abertos, Feedbacks pendentes
- Seção **Urgente agora** — alertas ordenados por gravidade (critical → info), com ações Ver / Resolver / Ignorar
- Seção **Pessoas em destaque** — EmployeeMiniCards de score alto
- Seção **Pessoas que precisam de atenção** — tom cuidadoso, com motivo + ação sugerida
- **Gráfico de evolução** (Recharts LineChart) com filtros 7/30/90/ano
- **Distribuição de performance** por faixa (Excelente/Bom/Atenção/Risco/Crítico)
- **Ações recomendadas para hoje** — derivadas por regras simples dos dados existentes

Todos com EmptyState bem escrito quando não houver dados.

## 4. Componentes reutilizáveis (`src/components/php/`)

`StatusBadge`, `ScoreCard`, `EmptyState`, `AlertCard`, `EmployeeMiniCard`, `MetricCard`, `PageHeader`, `SectionCard`, `ProgressBar`, `FilterBar`.

## 5. Design system

- Visual B2B premium, muito espaçamento, bordas suaves, sombras discretas
- Tokens semânticos em `src/styles.css`: `--status-excellent` (verde), `--status-good`, `--status-attention` (amarelo), `--status-risk`, `--status-critical` (vermelho), `--status-info` (azul), `--status-neutral` (cinza)
- Tipografia: Inter para corpo, com tamanho generoso; sem visual poluído

## Detalhes técnicos

- Stack: TanStack Start + TanStack Query + Supabase (via Lovable Cloud), Recharts, shadcn/ui
- Score do time = média do `overall_score` do último `performance_snapshot` por colaborador ativo (faixas conforme spec)
- Queries Supabase no client (publishable key + RLS), via `useQuery`
- Variação mês a mês calculada comparando snapshots; quando faltar histórico, EmptyState
- Sem autenticação visível ainda — RLS preparado para `auth.uid()` com função `get_user_company_id()` retornando `null` se sem sessão (queries retornam vazio sem quebrar)
- Idioma: pt-BR em toda a UI

## Fora de escopo (próximos prompts)

CRUD de colaboradores, telas internas de Metas/Avaliações/Feedbacks/1:1/Desenvolvimento/Insights IA, autenticação completa, edição de configurações.
