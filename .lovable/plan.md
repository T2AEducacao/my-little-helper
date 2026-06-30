## Metas — UI de criação e finalização (front-end)

Renomear "Metas e KPIs" para **Metas** e adicionar um fluxo simples de criação/conclusão de metas, com estado local (sem backend).

### Mudanças

1. **Renomear menu** — em `src/components/php/AppSidebar.tsx` e `MobileBottomNav.tsx`, trocar o label "Metas e KPIs" por "Metas". Atualizar também o `<title>` em `src/routes/_app.metas.tsx`.

2. **Store local de metas customizadas** — criar `src/features/goals/local-goals-store.ts`:
   - Hook `useLocalGoals()` com `useState` + persistência em `localStorage` (chave `performativo:custom-goals`).
   - Tipo `LocalGoal { id, nome, funcionario_id, funcionario_nome, prazo, status: "pending" | "completed", created_at }`.
   - Métodos: `addGoal`, `completeGoal`, `removeGoal`.

3. **Botão "+ Criar Meta"** — adicionado no `PageHeader` de `_app.metas.tsx`, ao lado do "Ver ações".

4. **Modal de criação** — novo `src/components/php/CreateGoalDialog.tsx` (shadcn `Dialog`):
   - Campo **Nome da meta** (`Input`).
   - Campo **Funcionário atribuído** (`Select`, populado de `useEmployees()` — lista real já existente; quando vazia, mostra placeholder "Nenhum colaborador cadastrado").
   - Campo **Prazo** (shadcn DatePicker com `Popover` + `Calendar`, `pointer-events-auto`).
   - Botão **Criar Meta** (desabilitado até os 3 campos preenchidos) → chama `addGoal` e fecha modal.

5. **Lista de metas criadas** — nova seção `SectionCard` "Minhas metas" no topo da página (acima dos grupos atuais de risco/prazo/etc.), exibindo as metas locais como linhas compactas no mesmo estilo visual do `GoalRow` existente:
   - Nome, avatar/nome do funcionário, prazo (com label relativo tipo "Em 5d" / "2d atrasada"), badge de status.
   - Botão **"Meta finalizada"** (`Button` variant outline + ícone `CheckCircle2`) à direita.
   - Ao concluir: status vira `completed`, badge fica verde ("Concluída"), botão é substituído por um rótulo discreto "Concluída em <data>".
   - Estado vazio: `EmptyState` curto "Nenhuma meta criada ainda. Clique em + Criar Meta para começar."

6. **Compatibilidade com o que já existe** — os blocos atuais (Em risco / Próximas do prazo / No prazo / Concluídas), os KPIs do hero e o filtro de responsável continuam intactos, alimentados pelos dados mockados de `usePerformanceWorkspaceData`. A nova seção de metas locais é independente e não interfere neles.

### Estrutura de dados (local)

```text
LocalGoal {
  id: string            // crypto.randomUUID()
  nome: string
  funcionario_id: string
  funcionario_nome: string
  prazo: string         // ISO date
  status: "pending" | "completed"
  created_at: string
  completed_at?: string
}
```

Persistido em `localStorage`, pronto para futura troca por chamadas reais ao backend (mesma forma de hook).
