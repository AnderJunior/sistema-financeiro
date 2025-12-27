# Estrutura do Sistema de Administração de Usuários

## 📋 Visão Geral

Sistema para administradores cadastrarem novos usuários, escolherem planos e valores, baseado na tabela `admin_users` e seguindo o layout/design do sistema atual.

---

## 🗄️ Estrutura do Banco de Dados

### Schema Completo do Supabase

#### 1. Tabela: `admin_users`
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Função Helper:**
```sql
CREATE OR REPLACE FUNCTION is_user_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM admin_users WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2. Tabela: `assinantes`
```sql
CREATE TABLE assinantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  dominio VARCHAR(255),
  api_key VARCHAR(255) UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'teste', 'suspenso', 'cancelado', 'pendente_ativacao')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plano_nome VARCHAR(100),
  valor DECIMAL(10, 2),
  periodo VARCHAR(20) CHECK (periodo IN ('mensal', 'trimestral', 'semestral', 'anual')),
  asaas_customer_id VARCHAR(255),
  asaas_subscription_id VARCHAR(255),
  data_ativacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_vencimento TIMESTAMP WITH TIME ZONE,
  ultima_verificacao TIMESTAMP WITH TIME ZONE,
  proxima_verificacao TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day'),
  versao_sistema VARCHAR(50),
  ip_ultimo_acesso INET,
  user_agent_ultimo_acesso TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. Tabela: `clientes`
```sql
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  tipo_pessoa VARCHAR(2) NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ')),
  cpf_cnpj VARCHAR(18) UNIQUE,
  email VARCHAR(255),
  telefone VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'a_iniciar' CHECK (status IN ('a_iniciar', 'em_andamento', 'finalizado')),
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  origem VARCHAR(100),
  observacoes TEXT,
  asaas_customer_id VARCHAR(255) UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. Tabela: `servicos`
```sql
CREATE TABLE servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('recorrente', 'assinatura', 'avulso', 'projeto')),
  valor_base DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unidade_cobranca VARCHAR(20) NOT NULL CHECK (unidade_cobranca IN ('mensal', 'semestral', 'anual', 'projeto')),
  data_vencimento_faturas DATE,
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. Tabela: `grupos`
```sql
CREATE TABLE grupos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo_grupo VARCHAR(20) NOT NULL CHECK (tipo_grupo IN ('plano', 'projeto', 'turma', 'interno')),
  data_inicio DATE,
  data_fim DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado', 'em_andamento')),
  responsavel VARCHAR(255),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 6. Tabela: `clientes_grupos`
```sql
CREATE TABLE clientes_grupos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  data_entrada DATE DEFAULT CURRENT_DATE,
  data_saida DATE,
  papel VARCHAR(100),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cliente_id, grupo_id)
);
```

#### 7. Tabela: `projetos`
```sql
CREATE TABLE projetos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  cliente_principal_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL,
  descricao TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido', 'cancelado')),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim_prevista DATE,
  data_fim_real DATE,
  valor_previsto DECIMAL(10, 2) DEFAULT 0,
  valor_fechado DECIMAL(10, 2) DEFAULT 0,
  progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
  responsavel VARCHAR(255),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 8. Tabela: `financeiro_categorias`
```sql
CREATE TABLE financeiro_categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 9. Tabela: `contas_financeiras`
```sql
CREATE TABLE contas_financeiras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('bancaria', 'carteira_digital', 'caixa_fisico')),
  agencia VARCHAR(10),
  conta VARCHAR(20),
  cor VARCHAR(7),
  banco_id VARCHAR(10),
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 10. Tabela: `financeiro_lancamentos`
```sql
CREATE TABLE financeiro_lancamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria_id UUID REFERENCES financeiro_categorias(id) ON DELETE SET NULL,
  conta_id UUID REFERENCES contas_financeiras(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL,
  servico_id UUID REFERENCES servicos(id) ON DELETE SET NULL,
  descricao VARCHAR(500) NOT NULL,
  data_competencia DATE NOT NULL,
  data_vencimento DATE,
  data_pagamento DATE,
  valor DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'previsto' CHECK (status IN ('previsto', 'pago', 'em_atraso', 'cancelado')),
  forma_pagamento VARCHAR(20) CHECK (forma_pagamento IN ('pix', 'boleto', 'cartao', 'transferencia', 'dinheiro', 'outro')),
  origem VARCHAR(20) DEFAULT 'manual' CHECK (origem IN ('manual', 'importacao', 'outro')),
  asaas_payment_id VARCHAR(255),
  asaas_subscription_id VARCHAR(255),
  invoice_url TEXT,
  observacoes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 11. Tabela: `transferencias_bancarias`
```sql
CREATE TABLE transferencias_bancarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  banco_origem_id UUID NOT NULL REFERENCES contas_financeiras(id) ON DELETE RESTRICT,
  banco_recebedor_id UUID NOT NULL REFERENCES contas_financeiras(id) ON DELETE RESTRICT,
  valor_enviado DECIMAL(10, 2) NOT NULL CHECK (valor_enviado > 0),
  data_transferencia DATE NOT NULL,
  descricao TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (banco_origem_id != banco_recebedor_id)
);
```

#### 12. Tabela: `notificacoes_log`
```sql
CREATE TABLE notificacoes_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pagamento', 'projeto', 'cobranca')),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  data_referencia TIMESTAMP WITH TIME ZONE NOT NULL,
  link VARCHAR(500),
  relacionado_id UUID,
  relacionado_tipo VARCHAR(20) CHECK (relacionado_tipo IN ('cliente', 'projeto', 'lancamento')),
  lida BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 13. Tabela: `tarefas`
```sql
CREATE TABLE tarefas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_inicio DATE,
  data_vencimento TIMESTAMP WITH TIME ZONE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  prioridade VARCHAR(20) CHECK (prioridade IN ('urgente', 'alta', 'normal', 'baixa')),
  status VARCHAR(255) NOT NULL DEFAULT 'pendente',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 14. Tabela: `tarefas_atividades`
```sql
CREATE TABLE tarefas_atividades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarefa_id UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('criacao', 'alteracao', 'status', 'comentario', 'vinculacao', 'desvinculacao')),
  campo_alterado VARCHAR(100),
  valor_anterior TEXT,
  valor_novo TEXT,
  descricao TEXT NOT NULL,
  usuario_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 15. Tabela: `tarefas_comentarios`
```sql
CREATE TABLE tarefas_comentarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarefa_id UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  comentario TEXT NOT NULL,
  usuario_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 16. Tabela: `tarefas_kanban_colunas`
```sql
CREATE TABLE tarefas_kanban_colunas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  cor VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 17. Tabela: `configuracoes_sistema`
```sql
CREATE TABLE configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave VARCHAR(255) NOT NULL UNIQUE,
  valor TEXT,
  tipo VARCHAR(50),
  categoria VARCHAR(100),
  descricao TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 18. Tabela: `fluxos_automacao`
```sql
CREATE TABLE fluxos_automacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo_automacao VARCHAR(50) NOT NULL CHECK (tipo_automacao IN ('notificacao', 'cobranca', 'relatorio', 'integracao', 'backup', 'limpeza', 'sincronizacao', 'outro')),
  status VARCHAR(20) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('ativo', 'inativo', 'rascunho')),
  configuracao JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 19. Tabela: `workflow_executions`
```sql
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL,
  execution_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'paused')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  node_states JSONB DEFAULT '{}'::jsonb,
  edge_states JSONB DEFAULT '{}'::jsonb,
  logs JSONB DEFAULT '[]'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 20. Tabela: `workflow_execution_node_states`
```sql
CREATE TABLE workflow_execution_node_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('idle', 'running', 'success', 'error', 'waiting')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  output JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Observações Importantes

- **Isolamento por Usuário:** Todas as tabelas principais possuem `user_id` para isolamento de dados (SaaS multi-tenant)
- **RLS (Row Level Security):** Todas as tabelas possuem RLS habilitado para segurança
- **Triggers:** Triggers automáticos para atualizar `updated_at` em todas as tabelas
- **Índices:** Índices criados para otimização de queries nas colunas mais consultadas
- **Constraints:** Validações de dados através de CHECK constraints e FOREIGN KEYS

---

## 🎨 Design e Layout

### Paleta de Cores (Tailwind)
- **Primary:** `#0284c7` (primary-600), `#0369a1` (primary-700)
- **Background:** `#FFFFFF` (branco), `#F8FAFC` (cinza claro)
- **Text:** `#111827` (gray-900), `#6B7280` (gray-500)
- **Borders:** `#E2E8F0` (gray-200), `#D1D5DB` (gray-300)
- **Success:** Verde para ações positivas
- **Error:** Vermelho para erros

### Componentes UI Utilizados
- **Card:** `bg-white rounded-xl shadow-sm border border-gray-200 p-6`
- **Input:** `border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500`
- **Botões Primários:** `bg-primary-600 text-white rounded-lg hover:bg-primary-700`
- **Botões Secundários:** `bg-white text-gray-700 border border-gray-300 hover:bg-gray-50`

### Ícones (Lucide React)
- `Shield` - Administração
- `UserPlus` - Adicionar usuário
- `Users` - Lista de usuários
- `Search` - Busca
- `Loader2` - Loading spinner

---

## 📁 Estrutura de Arquivos

```
app/
  admin/
    clientes/
      page.tsx              # Página principal de gerenciamento de clientes que utilizam o sistema
      [id]/
        page.tsx            # Detalhes/edição de usuário específico

components/
  modals/
    UsuarioModal.tsx       # Modal para cadastrar/editar usuário
    PlanoModal.tsx         # Modal para escolher/editar plano
  admin/
    UsuariosList.tsx       # Lista de clientes cadastrados
    PlanoSelector.tsx      # Seletor de planos

api/
  admin/
    clientes/
      route.ts             # API para CRUD de clientes (POST, GET, PUT, DELETE)
    planos/
      route.ts             # API para gerenciar planos disponíveis
```

---

## 🔧 Funcionalidades Principais

### 1. Cadastro de Novo Usuário
**Campos do Formulário:**
- Nome completo (obrigatório)
- Email (obrigatório, único)
- Senha (obrigatório, mínimo 6 caracteres)
- Confirmar senha (obrigatório)
- Plano (dropdown com opções)
- Valor (decimal, obrigatório)
- Período (mensal, trimestral, semestral, anual)
- Status inicial (ativo, teste, pendente_ativacao)
- Data de vencimento (opcional)

**Fluxo:**
1. Admin preenche formulário
2. Validação de email único
3. Criação do usuário no `auth.users` via Supabase Admin API
4. Criação do registro em `assinantes` com plano e valores
5. Notificação de sucesso/erro

### 2. Listagem de Usuários
**Funcionalidades:**
- Lista todos os usuários cadastrados
- Busca por email ou nome
- Filtros por status, plano, período
- Paginação (se necessário)
- Ações: Editar, Visualizar, Suspender, Cancelar

**Layout:**
- Card com lista de usuários
- Cada item mostra: nome, email, plano, valor, status, data vencimento
- Botões de ação por item

### 3. Edição de Usuário
**Campos Editáveis:**
- Nome completo
- Email (com validação de unicidade)
- Plano atual
- Valor
- Período
- Status
- Data de vencimento
- Resetar senha (opcional)

### 4. Seleção de Planos
**Componente PlanoSelector:**
- Dropdown com planos pré-definidos
- Opções sugeridas: Básico, Pro, Premium, Enterprise
- Campos customizados para valores e períodos
- Validação de valores mínimos/máximos

---

## 🔐 Segurança e Permissões

### RLS (Row Level Security)
- Apenas usuários com `is_user_admin() = true` podem acessar
- Service Role pode gerenciar tudo
- Usuários normais não têm acesso

### API Routes
- Verificar se usuário é admin antes de processar
- Usar Service Role Key para criar usuários no Supabase Auth
- Validar todos os inputs
- Sanitizar dados antes de inserir no banco

---

## 📝 Exemplo de Implementação

### Página Principal (`app/admin/usuarios/page.tsx`)
```typescript
'use client'

import { useState, useEffect } from 'react'
import { AdminGuard } from '@/components/AdminGuard'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { UsuarioModal } from '@/components/modals/UsuarioModal'
import { UsuariosList } from '@/components/admin/UsuariosList'
import { UserPlus, Users, Search } from 'lucide-react'

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  
  // Carregar usuários
  // Abrir modal de cadastro
  // Filtrar usuários
  // Renderizar lista
}
```

### Modal de Cadastro (`components/modals/UsuarioModal.tsx`)
```typescript
'use client'

import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { PlanoSelector } from '@/components/admin/PlanoSelector'

interface UsuarioModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function UsuarioModal({ isOpen, onClose, onSuccess }: UsuarioModalProps) {
  // Estados do formulário
  // Validações
  // Submit para API
  // Renderizar formulário
}
```

### API Route (`app/api/admin/usuarios/route.ts`)
```typescript
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // 1. Verificar se usuário é admin
  // 2. Validar dados recebidos
  // 3. Criar usuário no Supabase Auth (Service Role)
  // 4. Criar registro em assinantes
  // 5. Retornar sucesso/erro
}
```

---

## 🎯 Planos

### Plano Básico
- Valor: R$ 47,00/mês
- Período: mensal/semestral/anual
- Recursos básicos

### Plano Pro
- Valor: R$ 99,90/mês
- Período: mensal/semestral/anual
- Recursos intermediários

### Plano Premium
- Valor: R$ 120,00/mês
- Período: mensal/semestral/anual
- Recursos avançados

---

## 📊 Validações Importantes

1. **Email:** Único, formato válido
2. **Senha:** Mínimo 6 caracteres
3. **Valor:** Decimal positivo, mínimo R$ 0,01
4. **Período:** Apenas valores permitidos
5. **Status:** Apenas valores permitidos
6. **Data Vencimento:** Se informada, deve ser futura

---

## 🔄 Fluxo Completo de Cadastro

1. Admin acessa `/clientes`
2. Clica em "Adicionar Novo Usuário"
3. Preenche formulário:
   - Dados pessoais (nome, email, senha)
   - Plano e valores (plano, valor, período)
   - Configurações (status, data vencimento)
4. Submete formulário
5. Sistema valida dados
6. Cria usuário no Supabase Auth
7. Cria registro em `assinantes`
8. Retorna sucesso
9. Atualiza lista de usuários
10. Fecha modal

---

## 📱 Responsividade

- Desktop: Layout em grid, 2-3 colunas
- Tablet: Layout adaptado, 1-2 colunas
- Mobile: Layout empilhado, 1 coluna
- Breakpoints Tailwind: `md:`, `lg:`, `xl:`

---

## 🎨 Padrões de Código

- TypeScript com tipagem forte
- Componentes funcionais com hooks
- Estados gerenciados com `useState` e `useEffect`
- Validação no cliente e servidor
- Mensagens de erro claras
- Loading states em todas as ações assíncronas
- Confirmação para ações destrutivas

---

## 📌 Notas Importantes

1. **Service Role Key:** Necessária para criar usuários no Supabase Auth
2. **AdminGuard:** Componente que protege rotas de admin
3. **RLS Policies:** Configuradas para permitir apenas admins
4. **Validações:** Sempre validar no cliente E servidor
5. **Segurança:** Nunca expor Service Role Key no cliente
6. **Auditoria:** Registrar `created_by` ao criar usuários

---
