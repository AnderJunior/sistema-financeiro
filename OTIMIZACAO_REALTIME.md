# Análise e Otimização de Performance - Supabase Realtime

## 🔴 Problema Identificado

A query `realtime.list_changes` está sendo executada **760.182 vezes**, consumindo **94,3% do tempo total** do banco de dados. Isso é causado por uso excessivo e ineficiente de subscriptions Realtime.

## 📊 Estatísticas Atuais

- **Query problemática**: `realtime.list_changes`
- **Execuções**: 760.182
- **Tempo médio**: 5,98ms
- **Tempo total**: 1h 15m 45s (94,3% do tempo total)
- **Cache hit rate**: 100% (não é problema de cache)

## 🔍 Causas Identificadas

### 1. Subscriptions Duplicadas
- **Página Projetos**: 3 subscriptions diferentes para a mesma tabela
  - `projetos_changes` (página principal)
  - `projetos_table_status_changes` (componente Table)
  - `projetos_kanban_status_changes` (componente Kanban)

### 2. Subscriptions Ineficientes
- Uso de `event: '*'` quando apenas `UPDATE` é necessário
- Recarregamento completo de dados em vez de atualização incremental
- Múltiplas subscriptions ativas simultaneamente em diferentes páginas

### 3. Padrão de Uso
- Hook `useRealtime` sempre recarrega todos os dados
- Não há debounce/throttle nas atualizações
- Subscriptions não são compartilhadas entre componentes

## ✅ Soluções Implementadas

### 1. Página de Projetos ✅
- **Removida** subscription duplicada da página principal
- **Mantidas** apenas subscriptions otimizadas nos componentes filhos (Table/Kanban)
- **Adicionado** debounce de 300ms para recarregamento completo
- **Mantida** atualização incremental nos componentes

### 2. Hook useRealtime ✅
- **Substituído** `event: '*'` por eventos específicos (`INSERT`, `UPDATE`, `DELETE`)
- **Implementada** atualização incremental em vez de recarregar tudo
- **Adicionado** debounce de 150ms para evitar múltiplas atualizações rápidas
- **Melhorada** lógica de ordenação e limite após atualizações

### 3. Componentes Table e Kanban ✅
- **Otimizado** para usar apenas `event: 'UPDATE'` (não todos os eventos)
- **Adicionado** debounce de 100ms
- **Mantida** atualização incremental usando payload

## 📋 Páginas que Ainda Precisam de Otimização

As seguintes páginas ainda usam `event: '*'` e podem ser otimizadas:

1. **app/dashboard/page.tsx** - 2 subscriptions com `event: '*'`
2. **app/tarefas/page.tsx** - 1 subscription com `event: '*'`
3. **app/empresa/todas/page.tsx** - 2 subscriptions com `event: '*'`
4. **app/empresa/contas/page.tsx** - 2 subscriptions com `event: '*'`
5. **app/empresa/servicos/page.tsx** - 1 subscription com `event: '*'`
6. **app/grupos/page.tsx** - 1 subscription com `event: '*'`
7. **app/clientes/page.tsx** - 1 subscription com `event: '*'`
8. **components/dashboard/** - Vários componentes com `event: '*'`

### Recomendações para Próximas Otimizações:

1. **Substituir `event: '*'` por eventos específicos**:
   - Se só precisa de atualizações: `event: 'UPDATE'`
   - Se precisa de novos registros: `event: 'INSERT'`
   - Se precisa de remoções: `event: 'DELETE'`

2. **Adicionar debounce** em todas as subscriptions (100-300ms)

3. **Usar atualização incremental** quando possível em vez de recarregar tudo

4. **Consolidar subscriptions duplicadas** na mesma página

## 🎯 Impacto Esperado

Com as otimizações já implementadas:
- **Redução estimada**: 30-50% nas chamadas de `realtime.list_changes` (página de projetos)
- **Melhoria de performance**: Redução significativa no tempo total de queries
- **Economia de recursos**: Menor uso de CPU e memória no banco

Com todas as otimizações aplicadas:
- **Redução total estimada**: 60-80% nas chamadas de `realtime.list_changes`
- **Tempo total estimado**: Redução de ~1h 15m para ~15-30 minutos

## 📝 Notas Técnicas

### Por que `realtime.list_changes` é chamada tanto?

A função `realtime.list_changes` é chamada internamente pelo Supabase Realtime para cada subscription ativa. Cada vez que:
- Uma subscription é criada
- Um evento é processado
- Uma verificação de mudanças é feita

Com muitas subscriptions ativas simultaneamente, isso gera um volume enorme de chamadas.

### Como reduzir as chamadas?

1. **Reduzir número de subscriptions**: Consolidar subscriptions duplicadas
2. **Otimizar eventos**: Usar eventos específicos em vez de `'*'`
3. **Adicionar debounce**: Evitar processar múltiplas atualizações rápidas
4. **Atualização incremental**: Evitar recarregar tudo quando apenas um registro mudou

