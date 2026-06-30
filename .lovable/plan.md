# Portal do Funcionário

Interface dedicada para colaboradores acompanharem metas e atualizarem foto de perfil. Totalmente separada do painel do líder, com login próprio e gate por papel.

## 1. Banco de dados

### Nova tabela `public.goals`
Substitui o store local (`local-goals-store.ts`) por persistência real, multi-tenant:
- `id`, `company_id` (FK), `employee_id` (FK employees), `created_by` (FK auth.users — o líder)
- `name` (text), `deadline` (date), `status` (`pending` | `completed`)
- `created_at`, `updated_at`, `completed_at`

GRANTs e RLS:
- `authenticated`: SELECT/INSERT/UPDATE/DELETE
- `service_role`: ALL
- Política SELECT: líder/admin vê metas da própria empresa; funcionário vê só as suas (via `employees.profile_id = auth.uid()`)
- Política INSERT/UPDATE/DELETE: apenas admin/manager da empresa

### Ligar funcionário ↔ usuário auth
Adicionar `employees.profile_id uuid` referenciando `profiles.id` (= `auth.users.id`). Permite que a sessão do funcionário encontre o próprio registro.

### Bucket de storage `avatars`
- Público (leitura aberta), pasta `{user_id}/...`
- Política de INSERT/UPDATE/DELETE em `storage.objects`: só o próprio usuário em sua pasta
- Upload grava a URL pública em `employees.avatar_url`

## 2. Autenticação e papéis

- Enum `app_role` já tem `employee` — reaproveitar
- Página de auth (`/auth`) já existe para o líder. Adicionar fluxo: quando o usuário entra e o papel é `employee`, redirecionar para `/funcionario`; quando é `admin`/`manager`, mantém o painel atual
- Criar função RPC `is_employee()` (security definer) consultando `user_roles`
- Cadastro de funcionários: ao criar um colaborador, o líder pode enviar convite (fora de escopo agora). Por ora, o admin pode anexar um `profile_id` existente ao colaborador via banco (campo no formulário virá depois). **Pré-requisito de teste:** o usuário precisa criar uma conta `employee` manualmente e vincular `employees.profile_id` ao `auth.users.id` correspondente.

## 3. Frontend — Portal do funcionário

Rotas novas, fora de `_app` (que é o painel do líder):

```
src/routes/_employee.tsx              -> gate: exige papel "employee", senão redirect
src/routes/_employee.index.tsx        -> Minhas metas
src/routes/_employee.perfil.tsx       -> Editar perfil (foto)
```

Layout próprio, minimalista: header com nome/avatar + logout + link entre as duas seções. Sem sidebar de admin.

### Tela "Minhas Metas"
Duas abas (`Tabs` shadcn):
- **Minhas Metas** — lista `goals` com `status = pending` atribuídas ao funcionário logado. Cada linha: nome, prazo (formatado e relativo), badge de status. Sem botões de edição.
- **Concluídas** — `status = completed`. Mostra nome, data de conclusão, badge ✔.

Atualização automática: `useQuery` no Supabase + realtime opcional (postpor). Quando o líder marca como concluída no painel, o funcionário vê na próxima refetch.

### Tela "Editar Perfil"
- Mostra avatar atual (ou iniciais)
- Botão **Trocar foto** → `<input type="file" accept="image/*">` → upload para bucket `avatars/{user_id}/avatar.{ext}` → atualiza `employees.avatar_url`
- Botão **Remover foto** → apaga arquivo e zera `avatar_url`
- Sem URL externa, sem outros campos

## 4. Painel do líder (ajustes mínimos)

- `src/routes/_app.metas.tsx` e `CreateGoalDialog.tsx`: trocar `useLocalGoals` por hooks novos `useGoals`/`useCreateGoal`/`useCompleteGoal` lendo de `public.goals`. Migrar a seção "Minhas metas" para mostrar metas reais do banco.
- Manter UI atual (filtros, agrupamento por status, botão "Meta finalizada").
- Não tocar nas outras telas (Dashboard, Análises etc.).

## 5. Detalhes técnicos

- Hooks novos em `src/lib/goals-data.ts` (TanStack Query): `useGoals(filter)`, `useEmployeeGoals(employeeId)`, `useCreateGoal`, `useCompleteGoal`, `useDeleteGoal`.
- Auth gate em `_employee.tsx`: client-side `ssr: false`, checa sessão + chama `has_role(uid, 'employee')`. Sem `_authenticated/` da integração para não conflitar com o gate do painel.
- Após login em `/auth`, ler papel e redirecionar:
  - `admin` ou `manager` → `/` (painel atual)
  - `employee` → `/funcionario`
- Upload de avatar usando `supabase.storage.from('avatars').upload(...)` direto do cliente (RLS no bucket protege).

## 6. Fora de escopo (avisar ao usuário)

- Convite por email de funcionário ainda não existe — para testar, o líder precisa criar um usuário em `/auth` e o admin precisa vincular manualmente `employees.profile_id` (pode virar feature depois).
- Realtime de metas (sincronização instantânea) fica para próximo passo; por ora as listas atualizam ao re-entrar/refazer fetch.

## Ordem de execução

1. Migration: tabela `goals`, coluna `employees.profile_id`, bucket `avatars` + políticas
2. Hooks `goals-data.ts`
3. Rotas `/funcionario` e `/funcionario/perfil` + layout `_employee`
4. Redirect por papel em `/auth`
5. Refatorar `_app.metas.tsx` para usar banco em vez de localStorage
6. Remover `local-goals-store.ts`
