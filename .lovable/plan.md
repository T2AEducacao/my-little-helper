## Objetivo
Adicionar suporte a modo escuro no portal do funcionário (`/funcionario` e `/funcionario/perfil`) e refinar a UI/UX sem criar novas funcionalidades.

## Escopo

### 1. Toggle de tema no header do portal
Arquivo: `src/routes/funcionario.tsx`
- Adicionar botão Sol/Lua ao lado do botão "Sair" no header.
- Reutilizar a mesma lógica já usada no `AppHeader.tsx` do painel do líder: ler `localStorage.theme`, aplicar/remover classe `dark` no `<html>`, respeitar `prefers-color-scheme` como fallback.
- Persistir a escolha em `localStorage` (mesma chave `theme`) para manter consistência entre os dois portais.

### 2. Refinamento visual (sem novas funções)
Apenas ajustes de estilo nos arquivos existentes:

**`src/routes/funcionario.tsx` (layout)**
- Fundo do app: trocar `bg-muted/20` por um gradiente suave via tokens (`bg-background` com sutil sobreposição), garantindo contraste em light e dark.
- Header: aumentar hierarquia visual — título Performativo com peso maior, subtítulo em `text-muted-foreground` mais discreto; adicionar leve `shadow-sm`.
- Tabs: aumentar área de clique, refinar estado ativo (borda inferior mais nítida + leve highlight de fundo no hover), melhorar espaçamento.

**`src/routes/funcionario.index.tsx` (Minhas Metas)**
- Cabeçalho da seção: reforçar título e subtítulo.
- Cards de meta (`ActiveGoalRow` / `CompletedGoalRow`): melhorar padding vertical, adicionar hover sutil (`hover:bg-muted/40`), refinar tipografia do prazo com ícone melhor alinhado.
- Tabs de contagem: refinar o "pill" de contagem para ficar mais legível em ambos os temas.

**`src/routes/funcionario.perfil.tsx`**
- Melhorar o card de upload de avatar: espaçamento, hierarquia entre nome/e-mail/foto, feedback visual no hover do botão de upload.
- Garantir uso de tokens semânticos (`bg-card`, `text-foreground`, `border-border`) em vez de cores hardcoded, se houver.

### 3. Verificação de tokens
- Passar pelos três arquivos e substituir qualquer classe fixa (`text-white`, `bg-white`, `bg-gray-*`) por tokens semânticos, se encontrar. Isso garante que o dark mode funcione corretamente.

## O que NÃO será feito
- Nenhuma nova rota, componente ou funcionalidade.
- Nenhuma alteração no banco, hooks, `goals-data`, autenticação ou lógica de negócio.
- Sem mexer no portal do líder.

## Resultado esperado
O colaborador vê um botão de sol/lua no topo do portal, alterna entre claro/escuro com persistência, e o portal ganha um polimento visual coerente com o painel do líder mantendo a mesma estrutura atual.