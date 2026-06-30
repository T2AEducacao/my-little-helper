
# Sprint UX/UI — Análise + Plano de Refinamento

Foco exclusivo em hierarquia, organização, densidade e consistência. Sem mexer em lógica, dados, rotas ou backend.

---

## 1. Diagnóstico por tela

### Visão Geral (`/`)
**Forte:** narrativa clara ("o que fazer hoje", "quem precisa de atenção", "o que mudou"); copy orientada a decisão; estados vazios bem escritos.
**Problemas:**
- **Excesso de cards no mesmo nível**: 3 blocos de métricas (4 + 3 + 4) + "Progresso gerado hoje" (3) + "Mudanças" (4) = ~18 cards visualmente equivalentes. O olho não sabe onde pousar primeiro.
- **"O que preciso fazer hoje?"** (a métrica mais crítica) ocupa 2 colunas em um card visualmente idêntico aos vizinhos — não lê como hero.
- Score médio do time fica em um card de 1/3 numa segunda fila, perdendo destaque.
- Mistura registros muito diferentes na mesma linha (pergunta vs. label seca).
- Falta de uma faixa de status agregado de equipe ("X em risco · Y em atenção · Z saudáveis") visível em < 1s.
- "Progresso gerado hoje" e "Mudanças" competem com prioridade — ambos parecem igualmente importantes.

### Ações (`/alertas`)
**Forte:** fila ordenada por severidade; CTA "Marcar como resolvida" claro; resolução com toast.
**Problemas:**
- Linha de prioridade é muito alta verticalmente (badge + ícone + título + 2 cards de detalhe + 2 botões). Numa fila de 10+ itens vira rolagem cansativa.
- Os retângulos "Impacto" e "Ação recomendada" em `bg-muted/40` duplicam peso visual; deveriam ser inline secundários, não cards.
- Faixa colorida lateral por severidade ausente — perde escaneabilidade.
- "Próximos passos" na direita são placeholders inertes que ocupam 35% da largura sem ação.
- Toggle Pendentes/Resolvidas escondido como `action` do SectionCard — deveria ser um segmented control mais visível, com contadores.

### Pessoas (`/colaboradores`)
**Forte:** tabela + cards, filtros completos, métricas no topo, estados vazios distintos.
**Problemas:**
- **4 métricas no topo + barra de busca + 6 filtros**: antes de ver uma pessoa, o gestor enfrenta 11 widgets. Densidade alta demais antes da tabela.
- 6 selects em linha viram um campo de minas em desktop estreito; sem chips de filtros ativos.
- Tabela com 8 colunas, sem ordenação visível, sem zebra/hover destacado, score mostrado só como número (sem mini barra ou cor de fundo na célula).
- "Tendência" e "Score" em colunas separadas — poderiam ser uma só célula compacta.
- Importar/Exportar tratados como botões primários — ocupam espaço sem função real.
- Falta densidade compacta opcional (ver mais pessoas por tela).

### Perfil do Colaborador (`/colaboradores/$id`)
**Forte:** card de decisão à direita do header é excelente conceito (status + razão + 3 KPIs + ação principal).
**Problemas:**
- Header + 5 cards de resumo (3 deles com valor "—" e copy "Disponível em breve") + 8 abas + 4 seções no overview = poluição visual real.
- Os 5 cards de resumo logo abaixo do header **repetem** dados que o painel de decisão já mostra (Score, alertas) e introduzem cards com "—" — quebram a sensação de profissionalismo.
- 8 abas em linha rolável: muitas delas levam a "Em breve". Deveriam ser agrupadas ou marcadas como inativas.
- "Pontos fortes" sempre vazio polui — esconder seção quando vazia.
- Falta hierarquia "estado → próxima ação → contexto → histórico" anunciada explicitamente.

### Metas e KPIs (`/metas`)
**Forte:** 4 métricas claras, ordenação por risco + prazo, mini-card de progresso por linha.
**Problemas:**
- Cada linha tem grid interno `1fr 180px` que em telas médias quebra mal; mini-card de progresso parece um sub-card dentro de uma linha.
- Sem agrupamento visual por status (Em risco / No prazo / Atingidas) — apenas ordenado, exige leitura sequencial.
- Categoria, prazo, badge competem no mesmo nível tipográfico.
- Faltam atalhos para filtrar por responsável.

---

## 2. Princípios do design system a fixar

1. **Uma única hero por tela.** Métrica mais importante 2× maior visualmente que as demais.
2. **Hierarquia em 3 níveis:** Hero (decisão) → Métricas de apoio → Contexto/histórico.
3. **Densidade controlada:** linhas de fila/tabela com `py-3` (não `py-4`), `text-sm` consistente, números tabulares.
4. **Cor com função, não decoração:** faixa lateral 3px nos itens críticos/risco; soft backgrounds só em badges; cards de métrica neutros por padrão.
5. **Esconder o vazio.** Cards com valor `—` e copy "em breve" não aparecem.
6. **Tipografia:** títulos de seção `text-base font-semibold`, descrição `text-xs`, números `tabular-nums`. Sair de `text-[28px]` no PageHeader para `text-2xl` + tracking apertado.
7. **Espaçamento de página:** `gap-6` entre seções (não 8); `gap-4` interno; padding de card `p-5` padrão.
8. **Sem chrome desnecessário:** remover `shadow-card` em cards aninhados, manter apenas no nível externo.

---

## 3. Plano incremental (6 fases, sem alterar lógica)

Cada fase é independente, pode ser aprovada/revertida isoladamente. Nenhuma toca em queries, mutations, rotas ou tipos.

### Fase 1 — Fundação do design system *(arquivos: `src/styles.css`, `PageHeader`, `SectionCard`, `MetricCard`, `StatusBadge`)*
- Refinar tokens: ajustar `--shadow-card` mais sutil, adicionar `--shadow-elevated`, `--radius` para 0.625rem.
- `PageHeader`: título `text-2xl`, tracking apertado, descrição `text-sm text-muted-foreground/80`, separador inferior opcional.
- `SectionCard`: padrão `p-5`, título `text-base font-semibold`, descrição `text-xs`, header com borda inferior só quando tem `action`.
- `MetricCard`: 3 tamanhos (`hero`, `default`, `compact`); número em `text-3xl font-semibold tabular-nums`; ícone em badge `8x8` `bg-muted`; estado `isEmpty` mais leve (sem footer extenso).
- `StatusBadge`: altura fixa `h-6`, capitalize, ícone opcional 12px.

### Fase 2 — Visão Geral como Central de Comando
- **Hero row**: 1 card grande à esquerda "O que preciso fazer hoje" (ocupa 2/3) com lista resumida das 3 ações mais críticas inline + CTA principal. À direita, Score médio do time com mini-sparkline (já temos a série).
- **Faixa de status da equipe**: linha enxuta com 4 mini-stats horizontais ("X críticos · Y em risco · Z atenção · W saudáveis"), separadores verticais, sem cards.
- **Mudanças** condensada em 1 SectionCard com 4 mini-stats inline (não 4 MetricCards).
- **Progresso gerado hoje** vira mini-seção secundária na coluna direita ou rodapé, não compete com hero.
- "Quem precisa de atenção" e "Quem merece reconhecimento" viram listas de 3 pessoas com mini-card (avatar + nome + score + delta) — mais informação útil que um número solto.

### Fase 3 — Ações como lista de trabalho
- Linha compacta: faixa lateral de 3px por severidade; uma linha com `[badge prioridade][título em negrito][· responsável][· tempo]`; impacto/ação recomendada como `text-xs text-muted-foreground` em 1 linha truncada; expand on hover/click revela detalhes.
- Botão primário "Resolver" como ícone-button + tooltip; "Ver contexto" como link `text-xs`.
- Segmented control "Pendentes (n) · Resolvidas (n)" no topo da seção, visível.
- "Próximos passos" lateral substituído por "Resumo do dia": 3 linhas (alta/média/baixa) com contadores; ou removido para dar mais largura à fila.

### Fase 4 — Pessoas, escaneável
- Métricas no topo: reduzir para 2 hero cards (Score médio do time + Precisam de atenção) + 1 linha de mini-stats; OU colapsar atrás de um botão "Resumo".
- Barra de filtros: busca + 3 filtros visíveis (Área, Status, Faixa de desempenho) + botão "Mais filtros" abrindo popover com o resto; chips dos filtros ativos abaixo, com X para limpar.
- Tabela:
  - colunas reorganizadas: Pessoa (avatar+nome+cargo), Área, Gestor, Score (número + mini-barra + delta inline), Status, ações;
  - `py-2.5` por linha, hover destacado, score com cor de status em background sutil da célula;
  - cabeçalho com ordenação clicável (visual; ordenação real fica para outra sprint se necessário — pode ser somente affordance se a lógica não puder mudar — confirmar com o usuário).
- Importar/Exportar viram itens em menu "kebab" do header, liberando espaço.

### Fase 5 — Perfil do Colaborador, hub de decisão
- **Bloco 1 — Estado atual**: header + painel de decisão (manter conceito, refinar visual).
- **Bloco 2 — Próxima melhor ação**: promover "Ações recomendadas" para logo abaixo do header, em destaque (1 card largo, ação primária visível).
- **Bloco 3 — Contexto**: Score breakdown + Evolução lado a lado.
- **Bloco 4 — Histórico**: timeline ao final.
- Remover os 5 mini-cards de resumo logo abaixo do header (duplicam o painel).
- Abas: reduzir para 4 visíveis (Visão geral, Metas, Avaliações, Histórico); restantes em menu "Mais"; abas com "em breve" recebem badge cinza "em breve" e ficam ocultas até ter dados.
- Esconder "Pontos fortes" quando vazio (em vez de mostrar mensagem).

### Fase 6 — Metas, leitura em segundos
- Agrupar lista em 3 grupos visuais (Em risco · No prazo · Atingidas) com cabeçalho colapsável e contador; Em risco aberto por padrão.
- Linha compacta: faixa lateral por status; título + responsável (com avatar 20px) + categoria como chip discreto + prazo + barra de progresso slim 4px com cor de status + `current/target` em `text-xs`.
- Tirar o mini-card aninhado de progresso — virou inline.
- Adicionar filtro rápido por responsável (Select reutilizando `managerOptions`).
- KPIs do topo: manter, padronizar com nova `MetricCard`.

---

## 4. Detalhes técnicos

- Stack: Tailwind v4 + tokens semânticos existentes em `src/styles.css`; shadcn/ui; Recharts.
- Tudo vive em `src/components/php/*` e nos route files das 5 telas. Sem novas dependências.
- Sem alteração em: `php-data.ts`, `workspace-data.ts`, tipos, migrations, queries/mutations, rotas, `_app.tsx`, sidebar, header.
- Eventuais novos componentes: `MiniStatRow`, `PersonRow`, `PriorityRowCompact`, `GoalGroup` — apresentacionais puros, props derivadas dos dados já carregados.
- Responsividade mantida (mobile bottom nav inalterado); ajustes só em breakpoints e grid das telas afetadas.

---

## 5. Forma de trabalho

Aguardo aprovação antes de implementar. Sugiro aplicar **uma fase por vez** (começando pela Fase 1, que destrava as demais), para você revisar visualmente o impacto antes de seguir. Se preferir, posso entregar Fase 1+2 juntas (sistema + dashboard) por dar o salto visual mais perceptível na primeira leva.

Confirma o plano ou quer ajustes em alguma fase (escopo, ordem, agressividade)?
