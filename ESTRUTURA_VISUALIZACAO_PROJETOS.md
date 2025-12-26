# Estrutura de Visualização - Página de Projetos

## Visualização do Card (Kanban)

### Estrutura do Card
```
┌─────────────────────────────────┐
│ [Avatar] Cliente                │
│        Serviço                  │
├─────────────────────────────────┤
│ 💰 Valor Cobranças Ativas       │
│ 📅 Próxima Data Vencimento      │
└─────────────────────────────────┘
```

**Campos exibidos:**
- **Avatar**: Inicial do nome do serviço (círculo colorido)
- **Cliente**: `projeto.clientes?.nome`
- **Serviço**: `projeto.servicos?.nome`
- **Valor**: `projeto.valorCobrancasAtivas` (soma das cobranças não pagas)
- **Data**: `projeto.proximaDataVencimento` (próxima data de vencimento)

## Busca no Banco de Dados

### Tabela Principal
**`financeiro_lancamentos`**

### Query de Busca
```sql
SELECT 
  financeiro_lancamentos.*,
  servicos.*,
  clientes.*
FROM financeiro_lancamentos
LEFT JOIN servicos ON financeiro_lancamentos.servico_id = servicos.id
LEFT JOIN clientes ON financeiro_lancamentos.cliente_id = clientes.id
WHERE financeiro_lancamentos.servico_id IS NOT NULL
ORDER BY financeiro_lancamentos.created_at DESC
```

**Filtro aplicado:**
- `servico_id IS NOT NULL` (apenas projetos)

## Status da Coluna em FInanceiros

### Onde está armazenado
**Campo:** `financeiro_lancamentos.status_servico`

**Tipo:** `VARCHAR` (armazena UUID da coluna)

### Relação com Status de projetos
**Tabela:** `kanban_colunas`

**Estrutura:**
- `id` (UUID) - Identificador único da coluna
- `nome` - Nome da coluna (ex: "Pendente", "Em Andamento")
- `cor` - Cor hexadecimal (ex: "#3B82F6")
- `ordem` - Ordem de exibição
- `status_servico` - ID da própria coluna (UUID como string)
- `ativo` - Se a coluna está ativa

### Como funciona
1. Cada coluna do kanban tem um `id` único (UUID)
2. O campo `status_servico` em `financeiro_lancamentos` armazena o `id` da coluna
3. Projetos são agrupados por coluna comparando `projeto.status_servico === coluna.id`
4. Projetos sem status (`status_servico IS NULL`) aparecem na coluna "Não atribuído"

### Atualização do Status
```sql
UPDATE financeiro_lancamentos
SET status_servico = 'uuid-da-coluna'
WHERE id = 'id-do-lancamento'
```

**Localização no código:**
- Busca: `app/projetos/page.tsx` → `loadProjetos()`
- Atualização: `components/ProjetosKanban.tsx` → `handleDrop()`
- Colunas: `components/ProjetosKanban.tsx` → `loadColunas()`

