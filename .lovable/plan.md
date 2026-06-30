## Análises — Botão "Analisar com IA"

Adicionar ação no canto superior direito da página `/analises` que dispara uma análise textual gerada por IA sobre a situação atual da empresa (metas + colaboradores), exibida em um modal.

### Mudanças

1. **Botão no header** (`src/routes/_app.analises.tsx`)
   - No `PageHeader`, prop `actions`: novo `<Button>` "Analisar com IA" com ícone `Sparkles` (lucide-react), variant `default`.
   - Ao clicar, abre `Dialog` (shadcn) com o resultado.

2. **Server function de análise** (`src/lib/analises-ai.functions.ts`)
   - `createServerFn({ method: "POST" })` com `requireSupabaseAuth` middleware.
   - No handler: agrega dados reais via `supabase` do contexto:
     - Total de colaboradores ativos, distribuição de score (excelente/bom/atenção/risco/crítico).
     - Metas: total, em risco, próximas do prazo, atrasadas, concluídas (de `performance_alerts` + snapshots).
     - Áreas com maior concentração de risco.
   - Monta prompt factual com esses números e chama Lovable AI Gateway (`google/gemini-3-flash-preview`) via AI SDK `generateText`.
   - System prompt: tom profissional, objetivo, em PT-BR; sem inventar dados; estruturado em 3 seções curtas (Visão geral, Pontos de atenção, Destaques positivos); ~250-350 palavras; markdown simples.
   - Retorna `{ analysis: string, generatedAt: string }`.

3. **Modal de resultado** (no próprio `_app.analises.tsx`)
   - `Dialog` com título "Análise da empresa", subtítulo com timestamp.
   - Estado: `loading` (skeleton + texto "Gerando análise…"), `error` (mensagem + botão "Tentar novamente"), `success` (texto renderizado).
   - Render do markdown: instalar `react-markdown` e usar com classes `prose prose-sm dark:prose-invert` para legibilidade.
   - Botões no footer: "Fechar" e "Gerar novamente".
   - Trigger usa `useMutation` (TanStack Query) chamando a server fn via `useServerFn`.

4. **Middleware bearer** — verificar que `src/start.ts` já tem `functionMiddleware` que anexa o token Supabase (já existe no projeto pelos prompts anteriores). Se faltar, não mexer agora — a fn já roda autenticada pelos padrões do template.

5. **Dependências**
   - `react-markdown` (nova).
   - `ai` + `@ai-sdk/openai-compatible` se ainda não instalados; reutilizar helper `createLovableAiGatewayProvider` se já existir em `src/lib/ai-gateway.server.ts`, senão criar conforme padrão Lovable AI Gateway.

### Notas

- Sem persistência da análise (gerada sob demanda).
- Sem alterar o resto da página `/analises` — apenas o header ganha o botão e o modal é adicional.
- A IA é usada **apenas dentro do modal**, mantendo a página principal factual conforme decisão anterior.
