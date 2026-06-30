# Análises — Painel Executivo de Performance

Substituir o placeholder de `/analises` por uma página objetiva, executiva e de leitura. Responde perguntas sobre a empresa com base em fatos derivados dos dados. **Não sugere ações, não simula IA, não recomenda decisões.** A execução continua na Central de Gestão, Ações e Perfil do Colaborador.

## Princípios

- **Apenas fatos.** Cada bloco mostra um dado verificável (média, contagem, %, Δ, ranking). Sem frases avaliativas, sem "nossa IA", sem "sugestão", sem "possível tendência".
- **Pergunta → resposta.** Cada bloco abre com um título-pergunta e responde de forma direta no conteúdo.
- **Não duplica a Central de Gestão.** Central = "o que faço hoje". Análises = "como a empresa está e como evoluiu".
- **Pouco gráfico, muita leitura.** 1 linha de tendência + 1 barra de distribuição. O resto são tabelas e linhas escaneáveis com mini-barras.
- **Navegação para execução.** Quando faz sentido, cada item leva à tela onde a ação acontece (Pessoas, Metas, Ações).
- **Modular.** Cada bloco é um componente independente alimentado por um único `useAnaliseModel(range)`. Acrescentar/remover bloco no futuro = 1 linha na composição.

## Arquitetura

```text
src/routes/_app.analises.tsx
├── useAnaliseModel(range)            ← agrega snapshots/employees/alerts/goals
│   └── retorna AnaliseModel          ← objeto único consumido pelos blocos
├── <AnalisesPage>                    ← composição + filtro de período no header
│   ├── <ExecutiveSummaryBlock>       ← Bloco 1 — Resumo executivo
│   ├── <TrendBlock>                  ← Bloco 2 — Tendência da empresa
│   ├── <AreaComparisonBlock>         ← Bloco 3 — Comparativo entre áreas
│   ├── <AreaRankingsBlock>           ← Bloco 4 — Ranking de áreas
│   ├── <ManagerLoadBlock>            ← Bloco 5 — Carga dos gestores
│   ├── <DistributionBlock>           ← Bloco 6 — Distribuição de performance
│   └── <BottlenecksBlock>            ← Bloco 7 — Principais gargalos identificados
```

Cada bloco recebe **apenas** `model` (ou subconjunto). Sem fetch próprio, sem estado interno. Filtro de período único no `PageHeader` (7/30/90d), espelhado pelo bloco de Tendência.

## Blocos

1. **Resumo executivo** — 4 KPIs: Score médio da equipe (+ Δ no período), % em atenção/risco (+ contagem), Alertas abertos (+ críticos), Metas em risco. Sem leitura subjetiva — só números e variação.
2. **Tendência da empresa** — `LineChart` do score médio diário no período + Δ entre início e fim. Filtro 7/30/90d.
3. **Comparativo entre áreas** — tabela densa: Área · Pessoas · Score médio (número + mini-barra colorida) · Δ período · % em atenção+risco · seta para `/colaboradores`.
4. **Ranking de áreas** — duas colunas (Maiores altas / Maiores quedas), top 3 cada, ordenadas por Δ no período. Apenas fatos: "Comercial: +2,4 pts · 18 pessoas · score 81".
5. **Carga dos gestores** — linha por gestor com avatar, nº de liderados e barra empilhada (bom / atenção / risco / crítico). Ordenado pela concentração em atenção+risco. Cada linha leva a `/colaboradores`.
6. **Distribuição de performance** — **uma** barra horizontal segmentada nas 5 faixas + 5 mini-cards clicáveis (`/colaboradores`) com contagem e %. Mostra a forma da curva.
7. **Principais gargalos identificados** — observações factuais agregadas, **não recomendações**. Exemplos do texto exato exibido:
   - "Comercial: 35% em atenção ou risco (7 de 20 pessoas)."
   - "Financeiro concentra 4 metas em risco no ciclo."
   - "TI: queda média de 4,0 pts no período."
   - "João Lima: 5 liderados em atenção ou risco."
   - "3 alertas críticos sem resolução."
   Cada item leva à tela responsável (`/colaboradores`, `/metas`, `/alertas`). Zero verbo no imperativo, zero "deve", zero "recomenda".

## Regras dos gargalos (apenas leitura agregada)

Derivadas dos dados existentes:

- Área com **≥30%** dos liderados scored em atenção+risco/crítico → linha de área.
- Área com **Δ ≤ −3 pts** no período → linha de queda da área.
- Gestor com **≥2** liderados em risco/crítico → linha de gestor.
- Contagem total de alertas críticos abertos (`severity = critical`).
- Contagem de metas em risco (`status = risk`).

Saída sempre no formato "**[Sujeito]**: [fato numérico]." Nada de interpretação.

## Decisões de UX/UI

- **Filtro de período único** no `PageHeader` (7/30/90), espelhado pelo bloco de Tendência.
- **Tabela em comparativos**: densidade alta + comparabilidade real.
- **Δ tipográfico** (↑ verde / ↓ vermelho / — neutro) em vez de mini-gráficos por linha.
- **Distribuição como barra segmentada única** — "forma da curva", não 5 métricas isoladas.
- **Sem CTAs imperativos** ("Resolver", "Conversar"). Apenas "Ver pessoas", "Abrir metas", "Abrir ações".
- **Sem badges "Beta", "IA", "Smart"**. Cabeçalhos sóbrios.

## Como complementa a Central de Gestão

| Central (`/`) | Análises (`/analises`) |
| --- | --- |
| "O que faço hoje?" | "Como a empresa está e evoluiu?" |
| Worklist + pessoas específicas | Padrões, áreas, gestores, distribuição |
| Janela curta | 7/30/90d com comparativo |
| Decisão individual | Leitura tática/estratégica |

## Detalhes técnicos

- Arquivo único: substitui `src/routes/_app.analises.tsx` mantendo `createFileRoute("/_app/analises")`.
- `useAnaliseModel(range)` puro/memoizado, devolve `AnaliseModel` (scored, areas, managers, distribution, evolution, bottlenecks).
- Reaproveita `PageHeader`, `SectionCard`, `FilterBar`, `StatusBadge`, `EmptyState`, `Avatar`, Recharts `LineChart`, tokens de status.
- Sem novas dependências, sem migrations, sem alterações em `php-data.ts`/`workspace-data.ts` (somente leitura).
- Navegação via `<Link to="/colaboradores" | "/metas" | "/alertas">`.

## Fora do escopo

- **Bloco de recomendações / insights / IA** — removido completamente da página.
- Configuração de regras pelo usuário, exportação CSV/PDF, drill-down em modal, backend novo.
