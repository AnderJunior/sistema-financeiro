# Documentação Completa do Sistema Financeiro ERP

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Objetivo do Sistema](#objetivo-do-sistema)
3. [Tecnologias Utilizadas](#tecnologias-utilizadas)
4. [Estrutura de Páginas e Rotas](#estrutura-de-páginas-e-rotas)
5. [Funcionalidades Principais](#funcionalidades-principais)
6. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
7. [APIs e Endpoints](#apis-e-endpoints)
8. [Autenticação e Segurança](#autenticação-e-segurança)
9. [Sistema de Automações](#sistema-de-automações)
10. [Componentes Principais](#componentes-principais)
11. [Integrações](#integrações)
12. [Considerações para App Mobile](#considerações-para-app-mobile)

---

## 🎯 Visão Geral

Sistema completo de gestão financeira e clientes desenvolvido com Next.js 14, TypeScript e Supabase. O sistema oferece controle completo de clientes, projetos, tarefas, finanças e automações de processos.

---

## 🎯 Objetivo do Sistema

O Sistema Financeiro ERP foi desenvolvido para:

- **Gestão de Clientes**: Controle completo de clientes (PF/PJ) com histórico de projetos e serviços
- **Gestão Financeira**: Lançamentos de entradas e saídas, categorização, controle de contas e carteiras
- **Gestão de Projetos**: Acompanhamento de projetos com controle de progresso, valores e prazos
- **Gestão de Serviços**: Cadastro e controle de serviços oferecidos (recorrentes, assinaturas, avulsos, projetos)
- **Automações**: Sistema de workflows visuais para automação de processos
- **Tarefas**: Gerenciamento de tarefas com visualização Kanban e calendário
- **Relatórios e Dashboards**: Visualização de métricas, gráficos e análises financeiras

---

## 🚀 Tecnologias Utilizadas

### Frontend
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Lucide React** (Ícones)
- **ApexCharts / Recharts** (Gráficos)
- **ReactFlow** (Automações visuais)
- **TipTap** (Editor de texto rico)

### Backend
- **Next.js API Routes**
- **Supabase** (Backend as a Service)
  - PostgreSQL (Banco de dados)
  - Autenticação
  - Row Level Security (RLS)
  - Realtime subscriptions

### Outras
- **Axios** (HTTP client)
- **date-fns** (Manipulação de datas)
- **WS** (WebSockets para realtime)

---

## 📱 Estrutura de Páginas e Rotas

### Páginas de Autenticação
- `/login` - Página de login
- `/register` - Página de registro
- `/forgot-password` - Recuperação de senha
- `/reset-password` - Redefinição de senha

### Páginas Principais

#### Dashboard
- `/dashboard` - Dashboard principal com:
  - Estatísticas do mês (clientes, entradas)
  - Gráficos de análise
  - Serviços próximos ao vencimento
  - Configurações iniciais

#### Clientes
- `/clientes` - Lista de clientes (visualização lista/Kanban)
- `/clientes/novo` - Cadastro de novo cliente
- `/clientes/[id]` - Detalhes do cliente
  - Informações do cliente
  - Projetos vinculados
  - Serviços ativos
  - Histórico financeiro
  - Cobranças
- `/clientes/[id]/editar` - Edição de cliente

#### Grupos
- `/grupos` - Lista de grupos de clientes
- `/grupos/[id]` - Detalhes do grupo
- `/grupos/[id]/editar` - Edição de grupo

#### Projetos
- `/projetos` - Lista de projetos (ativos e concluídos)
  - Visualização Kanban
  - Filtros por status
  - Acompanhamento de progresso

#### Tarefas
- `/tarefas` - Lista de tarefas (visualização Kanban)
- `/tarefas/calendario` - Calendário de tarefas

#### Empresa (Financeiro)
- `/empresa` - Dashboard financeiro da empresa
- `/empresa/todas` - Todas as movimentações financeiras
- `/empresa/contas` - Gestão de contas/carteiras
- `/empresa/servicos` - Gestão de serviços
- `/empresa/categorias` - Categorias financeiras
- `/empresa/novo` - Novo lançamento financeiro

#### Financeiro (Alternativo)
- `/financeiro` - Dashboard financeiro
- `/financeiro/todas` - Todas as movimentações
- `/financeiro/contas` - Contas financeiras
- `/financeiro/categorias` - Categorias financeiras
- `/financeiro/novo` - Novo lançamento

#### Automações
- `/automacoes` - Lista de fluxos de automação
- `/automacoes/[id]` - Editor visual de automação (ReactFlow)

#### Configurações
- `/configuracoes` - Configurações do sistema

#### Serviços
- `/servicos` - Lista de serviços

---

## ⚙️ Funcionalidades Principais

### 1. Gestão de Clientes

#### Funcionalidades:
- **Cadastro Completo**:
  - Nome
  - Tipo de pessoa (PF/PJ)
  - CPF/CNPJ (único)
  - Email
  - Telefone
  - Status (a_iniciar, em_andamento, finalizado)
  - Origem
  - Observações
  - Integração com Asaas (asaas_customer_id)

- **Visualizações**:
  - Lista (tabela)
  - Kanban (por status)

- **Filtros**:
  - Por grupo
  - Por status
  - Por período

- **Detalhes do Cliente**:
  - Informações completas
  - Projetos vinculados
  - Serviços ativos
  - Histórico financeiro
  - Cobranças pendentes
  - Grupos associados

### 2. Gestão Financeira

#### Funcionalidades:
- **Lançamentos**:
  - Entradas e saídas
  - Categorização
  - Vinculação com:
    - Cliente
    - Projeto
    - Grupo
    - Serviço
  - Múltiplas contas/carteiras
  - Status (previsto, pago, em_atraso, cancelado)
  - Forma de pagamento (PIX, boleto, cartão, transferência, dinheiro, outro)
  - Datas (competência, vencimento, pagamento)

- **Categorias**:
  - Entrada/Saída
  - Nome e descrição
  - Status ativo/inativo
  - Categorias coringas (sistema)
  - Categorias personalizadas por usuário

- **Contas Financeiras**:
  - Tipos: bancária, carteira digital, caixa físico
  - Dados bancários (agência, conta, banco)
  - Cor personalizada
  - Status ativo/inativo

- **Transferências Bancárias**:
  - Transferências entre contas
  - Controle de valores enviados
  - Data e descrição

- **Visualizações**:
  - Lista de lançamentos
  - Carousel de contas
  - Gráficos (entradas/saídas)
  - Filtros por período, categoria, conta, status

### 3. Gestão de Projetos

#### Funcionalidades:
- **Cadastro**:
  - Nome e descrição
  - Cliente principal
  - Grupo vinculado (opcional)
  - Status (em_andamento, concluido, cancelado)
  - Datas (início, fim prevista, fim real)
  - Valores (previsto, fechado)
  - Progresso (0-100%)
  - Responsável

- **Visualizações**:
  - Lista
  - Kanban (por status)
  - Projetos ativos
  - Projetos concluídos

- **Controle Automático**:
  - Quando progresso = 100%, status muda para "concluido" automaticamente

### 4. Gestão de Serviços

#### Funcionalidades:
- **Cadastro**:
  - Nome e descrição
  - Tipo:
    - Recorrente
    - Assinatura
    - Avulso
    - Projeto
  - Valor base
  - Unidade de cobrança (mensal, semestral, anual, projeto)
  - Data de vencimento de faturas
  - Status ativo/inativo
  - Observações

- **Funcionalidades**:
  - Lista de serviços
  - Filtros
  - Vinculação com lançamentos financeiros

### 5. Gestão de Grupos

#### Funcionalidades:
- **Cadastro**:
  - Nome e descrição
  - Tipo de grupo:
    - Plano
    - Projeto
    - Turma
    - Interno
  - Datas (início, fim)
  - Status (ativo, encerrado, em_andamento)
  - Responsável

- **Relacionamento**:
  - Muitos clientes podem estar em muitos grupos
  - Data de entrada e saída
  - Papel do cliente no grupo

### 6. Gestão de Tarefas

#### Funcionalidades:
- **Cadastro**:
  - Nome e descrição
  - Data de início
  - Data de vencimento (timestamp)
  - Cliente vinculado (opcional)
  - Projeto vinculado (opcional)
  - Prioridade (urgente, alta, normal, baixa)
  - Status (customizável via colunas Kanban)

- **Visualizações**:
  - Kanban (colunas customizáveis)
  - Lista
  - Calendário

- **Funcionalidades Extras**:
  - Comentários
  - Histórico de atividades
  - Log de mudanças

### 7. Sistema de Automações

#### Funcionalidades:
- **Editor Visual**:
  - Interface drag-and-drop (ReactFlow)
  - Nós de gatilho
  - Nós de ação
  - Nós de transformação
  - Conexões entre nós

- **Tipos de Gatilhos**:
  - Manual
  - Nova Cobrança
  - Novo Cliente
  - Novo Projeto
  - Agendado por Data
  - Mudança de Status de Cobrança
  - Webhook de Entrada

- **Tipos de Ações**:
  - Enviar Email
  - Criar Lançamento
  - Atualizar Cliente
  - Criar Notificação
  - Webhook de Saída
  - Delay/Atraso

- **Execução**:
  - Execução manual
  - Execução automática (via triggers)
  - Logs de execução
  - Histórico de execuções

### 8. Dashboard e Relatórios

#### Funcionalidades:
- **Estatísticas**:
  - Clientes cadastrados no período
  - Clientes finalizados
  - Clientes pendentes
  - Entradas do mês

- **Gráficos**:
  - Clientes por mês
  - Clientes por mês por grupo
  - Valor por tipo de serviço
  - Serviços próximos ao vencimento

- **Filtros**:
  - Período customizável (DateRangePicker)

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### 1. `clientes`
Gerencia o cadastro de clientes.

```sql
- id: UUID (PK)
- nome: VARCHAR(255) NOT NULL
- tipo_pessoa: VARCHAR(2) CHECK ('PF', 'PJ')
- cpf_cnpj: VARCHAR(18) UNIQUE
- email: VARCHAR(255)
- telefone: VARCHAR(20)
- status: VARCHAR(20) DEFAULT 'a_iniciar' CHECK ('a_iniciar', 'em_andamento', 'finalizado')
- data_cadastro: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- origem: VARCHAR(100)
- observacoes: TEXT
- asaas_customer_id: VARCHAR(255) UNIQUE
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Índices:**
- `idx_clientes_status`
- `idx_clientes_tipo_pessoa`
- `idx_clientes_asaas_customer_id`

#### 2. `servicos`
Cadastro de serviços oferecidos.

```sql
- id: UUID (PK)
- nome: VARCHAR(255) NOT NULL
- descricao: TEXT
- tipo: VARCHAR(20) CHECK ('recorrente', 'assinatura', 'avulso', 'projeto')
- valor_base: DECIMAL(10, 2) NOT NULL DEFAULT 0
- unidade_cobranca: VARCHAR(20) CHECK ('mensal', 'semestral', 'anual', 'projeto')
- data_vencimento_faturas: DATE
- ativo: BOOLEAN DEFAULT true
- observacoes: TEXT
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### 3. `grupos`
Grupos de clientes (planos, projetos, turmas, internos).

```sql
- id: UUID (PK)
- nome: VARCHAR(255) NOT NULL
- descricao: TEXT
- tipo_grupo: VARCHAR(20) CHECK ('plano', 'projeto', 'turma', 'interno')
- data_inicio: DATE
- data_fim: DATE
- status: VARCHAR(20) DEFAULT 'ativo' CHECK ('ativo', 'encerrado', 'em_andamento')
- responsavel: VARCHAR(255)
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### 4. `clientes_grupos`
Relação muitos-para-muitos entre clientes e grupos.

```sql
- id: UUID (PK)
- cliente_id: UUID (FK -> clientes)
- grupo_id: UUID (FK -> grupos)
- data_entrada: DATE DEFAULT CURRENT_DATE
- data_saida: DATE
- papel: VARCHAR(100)
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
UNIQUE(cliente_id, grupo_id)
```

#### 5. `projetos`
Projetos vinculados a clientes.

```sql
- id: UUID (PK)
- nome: VARCHAR(255) NOT NULL
- cliente_principal_id: UUID (FK -> clientes)
- grupo_id: UUID (FK -> grupos)
- descricao: TEXT
- status: VARCHAR(20) DEFAULT 'em_andamento' CHECK ('em_andamento', 'concluido', 'cancelado')
- data_inicio: DATE NOT NULL DEFAULT CURRENT_DATE
- data_fim_prevista: DATE
- data_fim_real: DATE
- valor_previsto: DECIMAL(10, 2) DEFAULT 0
- valor_fechado: DECIMAL(10, 2) DEFAULT 0
- progresso: INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100)
- responsavel: VARCHAR(255)
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Índices:**
- `idx_projetos_cliente`
- `idx_projetos_status`

**Triggers:**
- Auto-atualiza status para "concluido" quando progresso >= 100

#### 6. `financeiro_categorias`
Categorias para lançamentos financeiros.

```sql
- id: UUID (PK)
- tipo: VARCHAR(10) CHECK ('entrada', 'saida')
- nome: VARCHAR(255) NOT NULL
- descricao: TEXT
- ativo: BOOLEAN DEFAULT true
- is_coringa: BOOLEAN (categorias padrão do sistema)
- user_id: UUID (NULL = categorias do sistema)
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### 7. `contas_financeiras`
Contas/carteiras financeiras.

```sql
- id: UUID (PK)
- nome: VARCHAR(255) NOT NULL
- tipo: VARCHAR(20) CHECK ('bancaria', 'carteira_digital', 'caixa_fisico')
- agencia: VARCHAR(10)
- conta: VARCHAR(20)
- cor: VARCHAR(7) (hex color)
- banco_id: VARCHAR(10)
- descricao: TEXT
- ativo: BOOLEAN DEFAULT true
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### 8. `financeiro_lancamentos`
Lançamentos financeiros (entradas e saídas).

```sql
- id: UUID (PK)
- tipo: VARCHAR(10) CHECK ('entrada', 'saida')
- categoria_id: UUID (FK -> financeiro_categorias)
- conta_id: UUID (FK -> contas_financeiras)
- cliente_id: UUID (FK -> clientes)
- projeto_id: UUID (FK -> projetos)
- grupo_id: UUID (FK -> grupos)
- servico_id: UUID (FK -> servicos)
- descricao: VARCHAR(500) NOT NULL
- data_competencia: DATE NOT NULL
- data_vencimento: DATE
- data_pagamento: DATE
- valor: DECIMAL(10, 2) NOT NULL
- status: VARCHAR(20) DEFAULT 'previsto' CHECK ('previsto', 'pago', 'em_atraso', 'cancelado')
- status_servico: VARCHAR(20) CHECK ('pendente', 'em_andamento', 'finalizado')
- forma_pagamento: VARCHAR(20) CHECK ('pix', 'boleto', 'cartao', 'transferencia', 'dinheiro', 'outro')
- origem: VARCHAR(20) DEFAULT 'manual' CHECK ('manual', 'importacao', 'outro')
- asaas_payment_id: VARCHAR(255)
- asaas_subscription_id: VARCHAR(255)
- invoice_url: TEXT
- observacoes: TEXT
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Índices:**
- `idx_lancamentos_tipo`
- `idx_lancamentos_status`
- `idx_lancamentos_data_competencia`
- `idx_lancamentos_cliente`
- `idx_lancamentos_projeto`
- `idx_lancamentos_asaas_payment_id`
- `idx_lancamentos_asaas_subscription_id`

#### 9. `transferencias_bancarias`
Transferências entre contas.

```sql
- id: UUID (PK)
- banco_origem_id: UUID (FK -> contas_financeiras)
- banco_recebedor_id: UUID (FK -> contas_financeiras)
- valor_enviado: DECIMAL(10, 2) NOT NULL CHECK (valor_enviado > 0)
- data_transferencia: DATE NOT NULL
- descricao: TEXT
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
CHECK (banco_origem_id != banco_recebedor_id)
```

**Índices:**
- `idx_transferencias_origem`
- `idx_transferencias_recebedor`
- `idx_transferencias_data`

#### 10. `tarefas`
Tarefas do sistema.

```sql
- id: UUID (PK)
- nome: VARCHAR(255) NOT NULL
- descricao: TEXT
- data_inicio: DATE
- data_vencimento: TIMESTAMP WITH TIME ZONE
- cliente_id: UUID (FK -> clientes)
- projeto_id: UUID (FK -> projetos)
- prioridade: VARCHAR(20) CHECK ('urgente', 'alta', 'normal', 'baixa')
- status: VARCHAR(255) NOT NULL DEFAULT 'pendente'
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Índices:**
- `idx_tarefas_cliente`
- `idx_tarefas_projeto`
- `idx_tarefas_status`
- `idx_tarefas_data_vencimento`

#### 11. `tarefas_atividades`
Log de atividades das tarefas.

```sql
- id: UUID (PK)
- tarefa_id: UUID (FK -> tarefas)
- tipo: VARCHAR(50) CHECK ('criacao', 'alteracao', 'status', 'comentario', 'vinculacao', 'desvinculacao')
- campo_alterado: VARCHAR(100)
- valor_anterior: TEXT
- valor_novo: TEXT
- descricao: TEXT NOT NULL
- usuario_id: UUID
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### 12. `tarefas_comentarios`
Comentários em tarefas.

```sql
- id: UUID (PK)
- tarefa_id: UUID (FK -> tarefas)
- comentario: TEXT NOT NULL
- usuario_id: UUID
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### 13. `tarefas_kanban_colunas`
Colunas do Kanban de tarefas (customizáveis).

```sql
- id: UUID (PK)
- nome: VARCHAR(255) NOT NULL
- cor: VARCHAR(7) NOT NULL DEFAULT '#3B82F6'
- ordem: INTEGER NOT NULL DEFAULT 0
- ativo: BOOLEAN NOT NULL DEFAULT true
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Colunas Padrão:**
- Pendente (#FBBF24)
- Em andamento (#2563EB)
- Concluídas (#16A34A)
- Canceladas (#DC2626)

#### 14. `kanban_colunas`
Colunas Kanban genéricas (para serviços, etc).

```sql
- id: UUID (PK)
- nome: VARCHAR(255) NOT NULL
- cor: VARCHAR(7)
- ordem: INTEGER
- status_servico: VARCHAR(20) CHECK ('pendente', 'em_andamento', 'finalizado')
- ativo: BOOLEAN
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### 15. `notificacoes_log`
Log de notificações do sistema.

```sql
- id: UUID (PK)
- tipo: VARCHAR(20) CHECK ('pagamento', 'projeto', 'cobranca')
- titulo: VARCHAR(255) NOT NULL
- descricao: TEXT NOT NULL
- data_referencia: TIMESTAMP WITH TIME ZONE NOT NULL
- link: VARCHAR(500)
- relacionado_id: UUID
- relacionado_tipo: VARCHAR(20) CHECK ('cliente', 'projeto', 'lancamento')
- lida: BOOLEAN DEFAULT false
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Índices:**
- `idx_notificacoes_tipo`
- `idx_notificacoes_data_referencia`
- `idx_notificacoes_lida`
- `idx_notificacoes_relacionado`

#### 16. `fluxos_automacao`
Fluxos de automação (workflows).

```sql
- id: UUID (PK)
- nome: VARCHAR(255) NOT NULL
- descricao: TEXT
- tipo_automacao: VARCHAR(50) CHECK ('notificacao', 'cobranca', 'relatorio', 'integracao', 'backup', 'limpeza', 'sincronizacao', 'outro')
- status: VARCHAR(20) DEFAULT 'rascunho' CHECK ('ativo', 'inativo', 'rascunho')
- configuracao: JSONB DEFAULT '{}' (nodes, edges, etc)
- ativo: BOOLEAN DEFAULT true
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Índices:**
- `idx_fluxos_automacao_tipo`
- `idx_fluxos_automacao_status`
- `idx_fluxos_automacao_ativo`

#### 17. `workflow_executions`
Execuções de workflows.

```sql
- id: UUID (PK)
- workflow_id: UUID NOT NULL
- execution_id: VARCHAR(255) NOT NULL
- status: VARCHAR(20) CHECK ('running', 'completed', 'failed', 'paused')
- started_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- completed_at: TIMESTAMP WITH TIME ZONE
- duration_ms: INTEGER
- node_states: JSONB DEFAULT '{}'
- edge_states: JSONB DEFAULT '{}'
- logs: JSONB DEFAULT '[]'
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### 18. `workflow_execution_node_states`
Estados dos nós durante execução.

```sql
- id: UUID (PK)
- execution_id: UUID (FK -> workflow_executions)
- node_id: VARCHAR(255) NOT NULL
- status: VARCHAR(20) CHECK ('idle', 'running', 'success', 'error', 'waiting')
- started_at: TIMESTAMP WITH TIME ZONE
- completed_at: TIMESTAMP WITH TIME ZONE
- error: TEXT
- output: JSONB
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### 19. `assinantes`
Tabela de assinantes/licenciamento.

```sql
- id: UUID (PK)
- email: VARCHAR(255) NOT NULL UNIQUE
- dominio: VARCHAR(255) NOT NULL UNIQUE
- api_key: VARCHAR(255) UNIQUE
- status: VARCHAR(20) DEFAULT 'ativo' CHECK ('ativo', 'suspenso', 'cancelado', 'pendente_ativacao', 'teste')
- user_id: UUID (FK -> auth.users)
- asaas_customer_id: VARCHAR(255)
- asaas_subscription_id: VARCHAR(255)
- plano_nome: VARCHAR(255)
- data_ativacao: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- data_vencimento: TIMESTAMP WITH TIME ZONE
- ultima_verificacao: TIMESTAMP WITH TIME ZONE
- proxima_verificacao: TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day')
- versao_sistema: VARCHAR(50)
- ip_ultimo_acesso: INET
- user_agent_ultimo_acesso: TEXT
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Índices:**
- `idx_assinantes_email`
- `idx_assinantes_dominio`
- `idx_assinantes_status`
- `idx_assinantes_api_key`
- `idx_assinantes_user_id`
- `idx_assinantes_proxima_verificacao`

#### 20. `configuracoes_sistema`
Configurações gerais do sistema.

```sql
- id: UUID (PK)
- chave: VARCHAR(255) NOT NULL UNIQUE
- valor: TEXT
- descricao: TEXT
- created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Triggers e Funções

#### Função `update_updated_at_column()`
Atualiza automaticamente o campo `updated_at` em todas as tabelas que possuem trigger associado.

#### Triggers de `updated_at`
Presentes em todas as tabelas principais para atualização automática.

#### Trigger `update_projeto_status_on_progress`
Quando `progresso >= 100` e `status = 'em_andamento'`, atualiza automaticamente para `status = 'concluido'` e define `data_fim_real`.

### Row Level Security (RLS)

Todas as tabelas principais possuem políticas RLS para isolamento de dados por usuário (`user_id`). A tabela `assinantes` possui políticas especiais para acesso apenas via Service Role.

---

## 🔌 APIs e Endpoints

### API Routes do Next.js

#### 1. `/api/license/verify`
**Método:** POST

Verifica se um assinante está ativo no sistema de licenciamento.

**Body:**
```json
{
  "email": "string",
  "dominio": "string",
  "api_key": "string (opcional)"
}
```

**Response:**
```json
{
  "status": "ativo" | "inativo" | "invalido" | "erro",
  "message": "string",
  "data": {
    "assinante": { ... }
  }
}
```

#### 2. `/api/webhook/[flowId]`
**Método:** POST / GET

Endpoint para acionar workflows via webhook.

**POST:**
- Executa o fluxo de automação especificado
- Valida segredo se configurado
- Retorna resultado da execução

**GET:**
- Retorna informações sobre o webhook

**Headers:**
- `x-webhook-secret` (opcional, se configurado no fluxo)

#### 3. `/api/verificar-servicos-atrasados`
**Método:** GET

Verifica serviços atrasados e gera notificações.

**Response:**
```json
{
  "success": true,
  "message": "string"
}
```

#### 4. `/api/limpar-metadados-usuario`
**Método:** POST

Limpa metadados corrompidos de usuários.

**Body:**
```json
{
  "userId": "UUID"
}
```

### Integração com Supabase

O sistema utiliza o cliente Supabase para todas as operações de banco de dados:

- **Cliente Server:** `lib/supabase/server.ts`
- **Cliente Client:** `lib/supabase/client.ts`

**Operações:**
- CRUD em todas as tabelas
- Queries com filtros, ordenação, paginação
- Realtime subscriptions
- Autenticação

---

## 🔐 Autenticação e Segurança

### Autenticação

O sistema utiliza **Supabase Auth** para autenticação:

- **Login/Registro:** Email e senha
- **Recuperação de Senha:** Fluxo completo via email
- **Sessões:** Gerenciadas pelo Supabase com cookies HTTP-only
- **Middleware:** Proteção de rotas via `middleware.ts`

### Segurança

#### Row Level Security (RLS)
Todas as tabelas principais possuem políticas RLS para isolamento de dados por usuário.

**Políticas principais:**
- Usuários só podem acessar seus próprios dados
- Service Role tem acesso total (apenas no backend)
- Políticas específicas para `assinantes` (apenas Service Role)

#### Middleware de Proteção
O `middleware.ts` protege todas as rotas (exceto públicas):

1. Verifica autenticação
2. Verifica assinatura ativa
3. Redireciona para login se não autenticado
4. Redireciona se não tiver assinatura ativa

#### Rotas Públicas
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- Rotas de API (com validação própria)

### Assinatura/Licenciamento

O sistema possui controle de assinatura:

- Verificação no middleware
- Status: `ativo`, `teste`, `suspenso`, `cancelado`
- Integração com Asaas (opcional)
- API de verificação de licença

---

## 🤖 Sistema de Automações

### Estrutura

O sistema de automações utiliza uma interface visual baseada em **ReactFlow**:

- **Editor Visual:** Drag-and-drop de nós
- **Execução:** Motor de execução de workflows
- **Triggers:** Gatilhos automáticos e manuais

### Tipos de Nós

#### Gatilhos (Triggers)
1. **Gatilho Manual** - Execução manual
2. **Nova Cobrança** - Dispara ao criar lançamento financeiro
3. **Novo Cliente** - Dispara ao criar cliente
4. **Novo Projeto** - Dispara ao criar projeto
5. **Agendado por Data** - Execução agendada
6. **Mudança de Status de Cobrança** - Dispara ao alterar status
7. **Webhook de Entrada** - Recebe requisições HTTP

#### Ações
1. **Enviar Email**
2. **Criar Lançamento**
3. **Atualizar Cliente**
4. **Criar Notificação**
5. **Webhook de Saída**
6. **Delay/Atraso**

#### Transformações
1. **Manipular Dados**
2. **Condicionais**
3. **Loops**

### Execução

- **Manual:** Via interface do editor
- **Automática:** Via triggers do sistema
- **Webhook:** Via endpoint `/api/webhook/[flowId]`

### Armazenamento

Os fluxos são armazenados na tabela `fluxos_automacao`:
- `configuracao` (JSONB): Contém nodes, edges e configurações
- Execuções são logadas em `workflow_executions`

---

## 🧩 Componentes Principais

### Componentes de UI

#### Componentes Base (`components/ui/`)
- `Card.tsx` - Card genérico
- `Input.tsx` - Input de formulário
- `Select.tsx` - Select dropdown
- `Modal.tsx` - Modal genérico
- `Loading.tsx` - Loading spinner
- `StatCard.tsx` - Card de estatísticas
- `DateRangePicker.tsx` - Seletor de período
- `Switch.tsx` - Switch/Toggle
- `Combobox.tsx` - Combobox autocomplete

### Componentes Específicos

#### Layout
- `Sidebar.tsx` - Menu lateral
- `TopBar.tsx` - Barra superior com notificações
- `LayoutWrapper.tsx` - Wrapper principal do layout
- `PageLoading.tsx` - Loading de página

#### Clientes
- `ClientesTable.tsx` - Tabela de clientes
- `ClientesKanban.tsx` - Visualização Kanban de clientes
- `ClienteDetailWrapper.tsx` - Wrapper de detalhes
- `ClienteStatusEditor.tsx` - Editor de status
- `CobrancasCliente.tsx` - Lista de cobranças do cliente
- `ServicosCliente.tsx` - Serviços do cliente
- `HistoricoFinanceiro.tsx` - Histórico financeiro
- `GruposCliente.tsx` - Grupos do cliente

#### Financeiro
- `FinanceiroTable.tsx` - Tabela de lançamentos
- `ContasCarousel.tsx` - Carousel de contas
- `TransferenciasList.tsx` - Lista de transferências

#### Projetos
- `ProjetosTable.tsx` - Tabela de projetos
- `ProjetosKanban.tsx` - Kanban de projetos
- `ProjetosAtivos.tsx` - Projetos ativos
- `ProjetosConcluidos.tsx` - Projetos concluídos

#### Tarefas
- `TarefasTable.tsx` - Tabela de tarefas
- `TarefasKanban.tsx` - Kanban de tarefas
- `calendar/CalendarView.tsx` - Visualização de calendário
- `calendar/CalendarSidebar.tsx` - Sidebar do calendário

#### Dashboard
- `dashboard/ClientesPorMesChart.tsx` - Gráfico de clientes por mês
- `dashboard/ClientesPorMesPorGrupoChart.tsx` - Gráfico por grupo
- `dashboard/ValorPorTipoServicoChart.tsx` - Gráfico de valores
- `dashboard/ServicosProximosVencimento.tsx` - Serviços próximos vencimento
- `dashboard/ConfiguracoesIniciais.tsx` - Configurações iniciais

#### Automações
- `workflow/WorkflowCanvas.tsx` - Canvas do editor
- `workflow/WorkflowShell.tsx` - Shell do editor
- `workflow/CustomNode.tsx` - Nó customizado
- `workflow/AnimatedEdge.tsx` - Conexão animada
- `workflow/ExecutionLogsPanel.tsx` - Painel de logs
- `FluxosAutomacaoTable.tsx` - Tabela de fluxos

#### Outros
- `NotificationsDropdown.tsx` - Dropdown de notificações
- `GruposTable.tsx` - Tabela de grupos
- `ServicosTable.tsx` - Tabela de serviços

### Modals (`components/modals/`)

- `ClienteModal.tsx` - Modal de cliente
- `LancamentoModal.tsx` - Modal de lançamento
- `ContaModal.tsx` - Modal de conta
- `CategoriaModal.tsx` - Modal de categoria
- `ServicoModal.tsx` - Modal de serviço
- `GrupoModal.tsx` - Modal de grupo
- `TarefaModal.tsx` - Modal de tarefa
- `TarefaDetailModal.tsx` - Modal de detalhes de tarefa
- `EditarCobrancaModal.tsx` - Modal de edição de cobrança
- `FluxoAutomacaoModal.tsx` - Modal de fluxo de automação
- `AlertModal.tsx` - Modal de alerta
- `ConfirmModal.tsx` - Modal de confirmação

### Contexts

- `AuthContext.tsx` - Contexto de autenticação
- `ModalContext.tsx` - Contexto de modais
- `AssinaturaContext.tsx` - Contexto de assinatura
- `AutomationTriggerProvider.tsx` - Provider de triggers

### Hooks

- `useAuth.ts` - Hook de autenticação
- `useWorkflowExecution.ts` - Hook de execução de workflows
- `useAssinaturaAtiva.ts` - Hook de assinatura
- `useRealtime.ts` - Hook de realtime

---

## 🔗 Integrações

### Asaas (Gateway de Pagamento)

O sistema possui integração com **Asaas**:

- **Clientes:** `asaas_customer_id` na tabela `clientes`
- **Lançamentos:** 
  - `asaas_payment_id` (pagamentos únicos)
  - `asaas_subscription_id` (assinaturas)
  - `invoice_url` (URL da fatura)

**Funcionalidades:**
- Criação de clientes no Asaas
- Criação de cobranças
- Webhooks de atualização de status
- Assinaturas recorrentes

### Webhooks

O sistema suporta webhooks:

- **Entrada:** Via gatilho "Webhook de Entrada" em automações
- **Saída:** Via ação "Webhook de Saída" em automações
- **Endpoint:** `/api/webhook/[flowId]`

---

## 📱 Considerações para App Mobile

### API Recommendations

Para criar o app mobile com React Native, recomenda-se:

#### 1. Usar o Cliente Supabase Diretamente
O Supabase possui SDK oficial para React Native:
- `@supabase/supabase-js`
- Autenticação nativa
- Realtime subscriptions
- Storage

#### 2. Estrutura de Dados

Todas as tabelas e campos estão documentados acima. Os tipos TypeScript estão em:
- `types/database.types.ts`

#### 3. Autenticação Mobile

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY'
)

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'email@example.com',
  password: 'password'
})

// Verificar sessão
const { data: { session } } = await supabase.auth.getSession()
```

#### 4. Endpoints Essenciais para Mobile

**Queries principais:**
- Clientes: `supabase.from('clientes').select('*')`
- Lançamentos: `supabase.from('financeiro_lancamentos').select('*')`
- Projetos: `supabase.from('projetos').select('*')`
- Tarefas: `supabase.from('tarefas').select('*')`
- Contas: `supabase.from('contas_financeiras').select('*')`

**Filtros comuns:**
- Por período: `.gte('data_competencia', startDate).lte('data_competencia', endDate)`
- Por status: `.eq('status', 'pago')`
- Por cliente: `.eq('cliente_id', clienteId)`

#### 5. Realtime para Mobile

```javascript
// Escutar mudanças em tempo real
const subscription = supabase
  .channel('lancamentos')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'financeiro_lancamentos' },
    (payload) => {
      console.log('Mudança:', payload)
    }
  )
  .subscribe()
```

#### 6. Funcionalidades Prioritárias para Mobile

**Tela Inicial (Dashboard):**
- Estatísticas resumidas
- Gráficos principais
- Notificações

**Clientes:**
- Lista de clientes
- Detalhes do cliente
- Cadastro/edição

**Financeiro:**
- Lista de lançamentos
- Novo lançamento (entrada/saída)
- Filtros básicos

**Tarefas:**
- Lista de tarefas
- Kanban simplificado
- Criar/editar tarefa

**Projetos:**
- Lista de projetos
- Detalhes do projeto
- Atualizar progresso

#### 7. Segurança Mobile

- Usar apenas `SUPABASE_ANON_KEY` no app (RLS protege os dados)
- Armazenar tokens de forma segura (ex: `@react-native-async-storage/async-storage` com criptografia)
- Validar assinatura ativa antes de permitir uso (usar endpoint `/api/license/verify`)

#### 8. Offline Support (Opcional)

Para suporte offline:
- Usar `@supabase/realtime-js` para cache local
- Implementar sincronização quando voltar online
- Usar bibliotecas como `redux-persist` ou `zustand` com persistência

#### 9. Estrutura de Pastas Sugerida para React Native

```
src/
├── screens/
│   ├── Dashboard/
│   ├── Clientes/
│   ├── Financeiro/
│   ├── Projetos/
│   └── Tarefas/
├── components/
│   ├── ui/
│   └── ...
├── services/
│   ├── supabase.ts
│   ├── clientes.ts
│   ├── financeiro.ts
│   └── ...
├── hooks/
│   ├── useAuth.ts
│   ├── useClientes.ts
│   └── ...
├── types/
│   └── database.types.ts
└── utils/
```

#### 10. Bibliotecas Recomendadas

- **Navegação:** `@react-navigation/native`
- **Estado:** `zustand` ou `redux-toolkit`
- **Forms:** `react-hook-form`
- **UI:** `react-native-paper` ou `native-base`
- **Gráficos:** `react-native-chart-kit` ou `victory-native`
- **Datas:** `date-fns` (mesmo do web)
- **Async Storage:** `@react-native-async-storage/async-storage`

---

## 📝 Notas Finais

### Variáveis de Ambiente Necessárias

Para o app mobile, você precisará:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

### Limitações Atuais

- Sistema web-first (algumas funcionalidades podem precisar de adaptação)
- Editor de automações visual (ReactFlow) pode não ser adequado para mobile
- Dashboard com muitos gráficos pode precisar de versão simplificada

### Melhorias Sugeridas para Mobile

1. **API REST Adicional:** Criar endpoints REST específicos para mobile (opcional, Supabase já fornece)
2. **Notificações Push:** Implementar push notifications para alertas importantes
3. **Biometria:** Autenticação biométrica para maior segurança
4. **Modo Offline:** Cache local e sincronização

---

## 📞 Suporte

Para dúvidas sobre a estrutura do sistema, consulte:
- `README.md` - Documentação básica
- `types/database.types.ts` - Tipos TypeScript completos
- `supabase/schema.sql` - Schema completo do banco
- Código-fonte dos componentes para referência

---

**Documentação gerada em:** Dezembro 2024
**Versão do Sistema:** 1.0.0

