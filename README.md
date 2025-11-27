# Sistema Financeiro ERP

Sistema completo de gestão financeira e clientes desenvolvido com Next.js, TypeScript e Supabase.

## 🚀 Tecnologias

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Banco de Dados**: PostgreSQL (via Supabase)
- **UI**: Componentes customizados com design moderno

## 📋 Funcionalidades

### Módulos Principais

1. **Dashboard**
   - Visão geral financeira
   - Gráficos de entradas e saídas
   - Estatísticas do mês
   - Transações recentes

2. **Clientes**
   - Cadastro completo de clientes (PF/PJ)
   - Visualização de projetos realizados
   - Acompanhamento de projetos ativos com progresso
   - Histórico financeiro por cliente

3. **Serviços**
   - Cadastro de serviços e planos
   - Tipos: recorrente, avulso, projeto
   - Controle de valores e unidades de cobrança

4. **Grupos**
   - Organização de clientes em grupos
   - Tipos: plano, projeto, turma, interno
   - Controle de datas e responsáveis

5. **Financeiro**
   - Lançamentos de entradas e saídas
   - Categorização de transações
   - Controle de contas/carteiras
   - Status: previsto, pago, em atraso, cancelado
   - Vinculação com clientes, projetos, grupos e serviços

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd sistema_financeiro
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o Supabase:
   - Crie um projeto no [Supabase](https://supabase.com)
   - Execute o script SQL em `supabase/schema.sql` no SQL Editor do Supabase
   - Copie as credenciais do projeto

4. Configure as variáveis de ambiente:
```bash
cp .env.local.example .env.local
```

Edite `.env.local` com suas credenciais do Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

5. Execute o projeto:
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 📁 Estrutura do Projeto

```
sistema_financeiro/
├── app/                    # Páginas Next.js (App Router)
│   ├── dashboard/         # Dashboard principal
│   ├── clientes/          # Módulo de clientes
│   ├── servicos/          # Módulo de serviços
│   ├── grupos/            # Módulo de grupos
│   └── financeiro/        # Módulo financeiro
├── components/            # Componentes React
│   ├── ui/               # Componentes de UI reutilizáveis
│   └── ...               # Componentes específicos
├── lib/                  # Utilitários e configurações
│   └── supabase/         # Clientes Supabase
├── types/                # Tipos TypeScript
├── supabase/             # Scripts SQL
└── public/               # Arquivos estáticos
```

## 🗄️ Banco de Dados

O schema do banco de dados está em `supabase/schema.sql`. As principais tabelas são:

- `clientes` - Cadastro de clientes
- `servicos` - Serviços oferecidos
- `grupos` - Grupos de clientes
- `clientes_grupos` - Relação cliente-grupo
- `projetos` - Projetos dos clientes
- `financeiro_categorias` - Categorias financeiras
- `contas_financeiras` - Contas/carteiras
- `financeiro_lancamentos` - Lançamentos financeiros

## 🎨 Design

O sistema utiliza um design moderno e limpo, inspirado em dashboards financeiros profissionais, com:
- Cards informativos
- Tabelas responsivas
- Gráficos interativos
- Cores intuitivas (verde para entradas, vermelho para saídas)
- Interface responsiva

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run start` - Inicia servidor de produção
- `npm run lint` - Executa o linter
- `npm run type-check` - Verifica tipos TypeScript

## 🔐 Segurança

- As chaves do Supabase devem ser mantidas em segredo
- Use variáveis de ambiente para configurações sensíveis
- O Supabase gerencia autenticação e autorização

## 🚀 Deploy em Produção

Para fazer o deploy do sistema na sua VPS, consulte o guia completo:

### **📖 Guia Completo de Deploy**

👉 **[GUIA_DEPLOY_VPS.md](./GUIA_DEPLOY_VPS.md)** - Guia passo a passo completo

### **⚡ Deploy Rápido**

**No Windows PowerShell:**

```powershell
# Execute o script automatizado
.\deploy-vps.ps1
```

**Ou siga os passos manuais:**

1. **Preparar arquivo `.env` na VPS** com as variáveis de ambiente
2. **Transferir arquivos** para a VPS (`/opt/sistema-financeiro`)
3. **Fazer build da imagem Docker** na VPS
4. **Configurar stack no Portainer** com o arquivo `stack.yml`
5. **Deploy e testar** o acesso

### **📋 Informações da VPS**

- **IP:** `38.242.245.229`
- **Usuário:** `root`
- **Domínio:** `analiscode.com`
- **Diretório:** `/opt/sistema-financeiro`

### **📚 Documentação Adicional**

- `GUIA_DEPLOY_VPS.md` - Guia completo passo a passo
- `DEPLOY_PRODUCAO.md` - Documentação detalhada (alternativa)
- `RESUMO_RAPIDO_DEPLOY.md` - Resumo rápido
- `stack.yml` - Configuração da stack Docker Swarm
- `Dockerfile` - Configuração da imagem Docker

---

## 📄 Licença

Este projeto é privado e de uso interno.

