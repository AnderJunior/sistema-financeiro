# 🚀 Guia Completo de Deploy na VPS

Este guia vai te ajudar a fazer o deploy do sistema financeiro na sua VPS de forma simples e direta.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:

- ✅ Acesso SSH à VPS (IP: `38.242.245.229`, usuário: `root`)
- ✅ Docker e Docker Swarm instalados na VPS
- ✅ Portainer instalado e acessível
- ✅ Traefik configurado com Let's Encrypt
- ✅ Domínio configurado (`analiscode.com`) apontando para a VPS
- ✅ Variáveis de ambiente do Supabase e Asaas em mãos

---

## 🎯 Método Rápido (Recomendado)

Se você quer fazer o deploy rapidamente, use o script automatizado:

### No Windows PowerShell:

```powershell
# 1. Navegue até o diretório do projeto
cd "C:\Users\playh\OneDrive\Área de Trabalho\sistema_financeiro"

# 2. Execute o script de deploy (se tiver Git Bash ou WSL)
bash deploy-producao.sh

# OU siga os passos manuais abaixo
```

---

## 📝 Método Manual - Passo a Passo

### **PASSO 1: Preparar o arquivo .env**

Primeiro, crie um arquivo `.env` na VPS com suas variáveis de ambiente:

```powershell
# No PowerShell do Windows, conecte na VPS
ssh root@38.242.245.229

# Na VPS, crie o diretório e o arquivo .env
mkdir -p /opt/sistema-financeiro
cd /opt/sistema-financeiro
nano .env
```

**Cole o seguinte conteúdo no arquivo `.env`:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# Asaas (opcional)
ASAAS_API_TOKEN=seu_token_do_asaas_aqui
NEXT_PUBLIC_ASAAS_ENVIRONMENT=production
```

**Para salvar no nano:**
1. Pressione `Ctrl+X`
2. Pressione `Y` (para confirmar)
3. Pressione `Enter`

---

### **PASSO 2: Transferir arquivos do projeto para a VPS**

**IMPORTANTE:** Feche a conexão SSH (digite `exit`) e volte para o PowerShell no Windows.

No PowerShell, no diretório do projeto, execute:

```powershell
# Conectar na VPS e criar diretório
ssh root@38.242.245.229 "mkdir -p /opt/sistema-financeiro"

# Transferir arquivos essenciais (excluindo node_modules e .next)
scp Dockerfile package.json package-lock.json next.config.js tsconfig.json tailwind.config.ts postcss.config.js root@38.242.245.229:/opt/sistema-financeiro/

# Transferir diretórios do projeto
scp -r app root@38.242.245.229:/opt/sistema-financeiro/
scp -r components root@38.242.245.229:/opt/sistema-financeiro/
scp -r lib root@38.242.245.229:/opt/sistema-financeiro/
scp -r hooks root@38.242.245.229:/opt/sistema-financeiro/
scp -r contexts root@38.242.245.229:/opt/sistema-financeiro/
scp -r types root@38.242.245.229:/opt/sistema-financeiro/
scp -r supabase root@38.242.245.229:/opt/sistema-financeiro/

# Se tiver diretório public, transfira também
if (Test-Path "public") { scp -r public root@38.242.245.229:/opt/sistema-financeiro/ }
```

**OU use rsync (se disponível no Windows via WSL ou Git Bash):**

```bash
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '*.log' \
  ./ root@38.242.245.229:/opt/sistema-financeiro/
```

---

### **PASSO 3: Verificar arquivos na VPS**

```powershell
# Conectar na VPS
ssh root@38.242.245.229

# Verificar se os arquivos foram transferidos
cd /opt/sistema-financeiro
ls -la

# Verificar se Dockerfile existe (MUITO IMPORTANTE!)
ls -la Dockerfile

# Se o Dockerfile não existir, você verá um erro
# Nesse caso, volte ao passo 2 e transfira novamente
```

---

### **PASSO 4: Criar/Verificar rede Docker**

```bash
# Ainda na VPS
# Verificar se a rede existe
docker network ls | grep REDE_INTERNA

# Se não existir, criar
docker network create --driver overlay --attachable REDE_INTERNA
```

---

### **PASSO 5: Build da imagem Docker**

```bash
# Ainda na VPS, no diretório /opt/sistema-financeiro
cd /opt/sistema-financeiro

# Verificar se está no diretório correto
pwd
# Deve mostrar: /opt/sistema-financeiro

# Carregar variáveis do .env
source .env

# Verificar se as variáveis foram carregadas (opcional)
echo "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"

# Build da imagem (isso pode levar vários minutos - seja paciente!)
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT="${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production}" \
  -t sistema-financeiro:latest .

# Aguarde o build terminar completamente
```

**⏱️ O build pode levar 5-15 minutos dependendo da velocidade da VPS.**

---

### **PASSO 6: Verificar imagem criada**

```bash
# Verificar se a imagem foi criada
docker images | grep sistema-financeiro
```

Deve mostrar algo como:
```
sistema-financeiro   latest   abc123def456   2 minutes ago   500MB
```

Se não aparecer, o build falhou. Verifique os erros acima e tente novamente.

---

### **PASSO 7: Configurar Stack no Portainer**

#### 7.1. Acessar Portainer

1. Abra seu navegador
2. Acesse o Portainer (ex: `https://seu-portainer.com` ou `http://38.242.245.229:9000`)
3. Faça login

#### 7.2. Criar Nova Stack

1. No menu lateral esquerdo, clique em **"Stacks"**
2. Clique no botão **"Add stack"** (canto superior direito)
3. Preencha:
   - **Name**: `sistema-financeiro`
   - **Build method**: Selecione **"Web editor"** (não "Repository")

#### 7.3. Colar Configuração da Stack

**Copie TODO o conteúdo abaixo e cole no editor do Portainer:**

```yaml
version: "3.7"
services:

  sistema-financeiro:
    image: sistema-financeiro:latest
    networks:
      - REDE_INTERNA

    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - ASAAS_API_TOKEN=${ASAAS_API_TOKEN}
      - NEXT_PUBLIC_ASAAS_ENVIRONMENT=${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production}
      
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
        - node.role == manager
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      labels:
      - traefik.enable=1
      - traefik.http.routers.sistema-financeiro.rule=Host(`analiscode.com`)
      - traefik.http.routers.sistema-financeiro.entrypoints=websecure
      - traefik.http.routers.sistema-financeiro.priority=1
      - traefik.http.routers.sistema-financeiro.tls.certresolver=letsencryptresolver
      - traefik.http.routers.sistema-financeiro.middlewares=default-headers
      - traefik.http.routers.sistema-financeiro.service=sistema-financeiro
      - traefik.http.services.sistema-financeiro.loadbalancer.server.port=3000
      - traefik.http.services.sistema-financeiro.loadbalancer.passHostHeader=true
      - traefik.http.routers.sistema-financeiro-http.rule=Host(`analiscode.com`)
      - traefik.http.routers.sistema-financeiro-http.entrypoints=web
      - traefik.http.routers.sistema-financeiro-http.middlewares=redirect-to-https
      - traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https
      - traefik.http.middlewares.default-headers.headers.frameDeny=true
      - traefik.http.middlewares.default-headers.headers.sslRedirect=true
      - traefik.http.middlewares.default-headers.headers.browserXssFilter=true
      - traefik.http.middlewares.default-headers.headers.contentTypeNosniff=true
      - traefik.http.middlewares.default-headers.headers.forceSTSHeader=true
      - traefik.http.middlewares.default-headers.headers.stsIncludeSubdomains=true
      - traefik.http.middlewares.default-headers.headers.stsPreload=true
      - traefik.http.middlewares.default-headers.headers.stsSeconds=31536000

networks:
  REDE_INTERNA:
    external: true
    name: REDE_INTERNA
```

**⚠️ IMPORTANTE:** Se seu domínio for diferente de `analiscode.com`, altere nas linhas:
- `traefik.http.routers.sistema-financeiro.rule=Host(\`seu-dominio.com\`)`
- `traefik.http.routers.sistema-financeiro-http.rule=Host(\`seu-dominio.com\`)`

#### 7.4. Configurar Variáveis de Ambiente no Portainer

**IMPORTANTE:** Antes de fazer o deploy, você DEVE configurar as variáveis de ambiente.

No Portainer, role a página até encontrar a seção **"Environment variables"** ou **"Environment"**.

Clique em **"Add environment variable"** e adicione cada uma das seguintes variáveis:

| Nome da Variável | Valor |
|-----------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://seu-projeto.supabase.co` (substitua pelo seu valor real) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sua_chave_anon_aqui` (substitua pelo seu valor real) |
| `SUPABASE_SERVICE_ROLE_KEY` | `sua_chave_service_role_aqui` (substitua pelo seu valor real) |
| `ASAAS_API_TOKEN` | `seu_token_asaas_aqui` (substitua pelo seu valor real) |
| `NEXT_PUBLIC_ASAAS_ENVIRONMENT` | `production` |

**⚠️ ATENÇÃO:** Use os MESMOS valores que você colocou no arquivo `.env` na VPS (passo 1).

#### 7.5. Fazer Deploy da Stack

1. Após colar a configuração YAML e adicionar as variáveis de ambiente
2. Role até o final da página
3. Clique no botão **"Deploy the stack"** (canto inferior direito)
4. Aguarde alguns segundos enquanto o Portainer cria o serviço
5. Você será redirecionado para a lista de stacks

#### 7.6. Verificar Status do Deploy

1. Na lista de stacks, encontre **"sistema-financeiro"**
2. Verifique se o status está **verde** (Running) ou **amarelo** (Starting)
3. Se estiver verde, o serviço está rodando! ✅
4. Se estiver vermelho ou com erro, clique no nome da stack para ver os detalhes

---

### **PASSO 8: Verificar Logs e Status**

**Opção 1: Via Portainer (Mais Fácil)**

1. Vá em **Stacks** → **sistema-financeiro**
2. Clique no nome do serviço `sistema-financeiro`
3. Vá na aba **"Logs"**
4. Verifique se há erros ou se está tudo OK

**Opção 2: Via SSH na VPS**

```bash
# Conectar na VPS
ssh root@38.242.245.229

# Ver logs do serviço
docker service logs sistema-financeiro_sistema-financeiro

# Ver logs em tempo real
docker service logs -f sistema-financeiro_sistema-financeiro

# Ver status do serviço
docker service ls | grep sistema-financeiro
```

---

### **PASSO 9: Testar Acesso ao Sistema**

1. Abra seu navegador (Chrome, Firefox, Edge, etc.)
2. Acesse: `https://analiscode.com`
3. Verifique se aparece um **cadeado verde** no navegador (SSL funcionando)
4. Se aparecer uma página de erro ou não carregar:
   - Aguarde alguns minutos (pode estar iniciando)
   - Verifique os logs (passo 8)
   - Verifique se o DNS está apontando para o IP correto
5. Se carregar normalmente, teste fazer login no sistema

**Se o SSL não funcionar imediatamente:**
- Aguarde 5-10 minutos (o Traefik precisa gerar o certificado)
- Verifique se o DNS está apontando corretamente para `38.242.245.229`
- Verifique os logs do Traefik se necessário

---

## ✅ Checklist Final

Use este checklist para não perder nenhum passo:

- [ ] **Passo 1:** Criei o arquivo `.env` na VPS com todas as variáveis
- [ ] **Passo 2:** Transfiri todos os arquivos do projeto para a VPS
- [ ] **Passo 3:** Verifiquei que o Dockerfile existe na VPS (`ls -la Dockerfile`)
- [ ] **Passo 4:** Criei/verifiquei a rede `REDE_INTERNA` no Docker Swarm
- [ ] **Passo 5:** Fiz o build da imagem Docker (`sistema-financeiro:latest`)
- [ ] **Passo 6:** Verifiquei que a imagem foi criada (`docker images | grep sistema-financeiro`)
- [ ] **Passo 7.1:** Acessei o Portainer no navegador
- [ ] **Passo 7.2:** Criei uma nova stack chamada `sistema-financeiro`
- [ ] **Passo 7.3:** Colei a configuração YAML completa no editor
- [ ] **Passo 7.4:** Configurei TODAS as variáveis de ambiente no Portainer
- [ ] **Passo 7.5:** Fiz o deploy da stack
- [ ] **Passo 7.6:** Verifiquei que o serviço está com status verde (Running)
- [ ] **Passo 8:** Verifiquei os logs e não há erros críticos
- [ ] **Passo 9:** Acessei `https://analiscode.com` e o sistema está funcionando
- [ ] **Bônus:** Testei fazer login e está funcionando corretamente

---

## 🔧 Comandos Úteis

### Ver Status do Serviço
```bash
docker service ls | grep sistema-financeiro
```

### Ver Logs em Tempo Real
```bash
docker service logs -f sistema-financeiro_sistema-financeiro
```

### Reiniciar Serviço
```bash
docker service update --force sistema-financeiro_sistema-financeiro
```

### Parar Serviço
```bash
docker service scale sistema-financeiro_sistema-financeiro=0
```

### Iniciar Serviço
```bash
docker service scale sistema-financeiro_sistema-financeiro=1
```

---

## 🐛 Problemas Comuns e Soluções

### ❌ Erro: "Dockerfile not found" ao fazer build

**Causa:** O Dockerfile não foi transferido para a VPS ou você está no diretório errado.

**Solução:**
```bash
# Na VPS
cd /opt/sistema-financeiro
pwd  # Deve mostrar: /opt/sistema-financeiro
ls -la Dockerfile  # Deve mostrar informações do arquivo

# Se não existir, volte ao passo 2 e transfira novamente
# No seu Windows PowerShell:
scp Dockerfile root@38.242.245.229:/opt/sistema-financeiro/
```

### ❌ Erro: "Rede não encontrada" no Portainer

**Causa:** A rede `REDE_INTERNA` não foi criada no Docker Swarm.

**Solução:**
```bash
# Na VPS
ssh root@38.242.245.229
docker network create --driver overlay --attachable REDE_INTERNA
```

### ❌ Erro: "Module not found: Can't resolve 'react-apexcharts'"

**Causa:** O pacote `react-apexcharts` não está instalado ou não está no `package.json`.

**Solução:**

1. **Verificar se o `package.json` está atualizado** com as dependências:
   ```bash
   # No seu computador Windows, verifique se o package.json tem:
   # "react-apexcharts": "^1.8.0"
   # "apexcharts": "^4.0.0"
   ```

2. **Transferir o `package.json` atualizado para a VPS:**
   ```powershell
   # No PowerShell do Windows
   scp package.json root@38.242.245.229:/opt/sistema-financeiro/
   ```

3. **Fazer build novamente:**
   ```bash
   # Na VPS
   cd /opt/sistema-financeiro
   source .env
   docker build \
     --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
     --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT="${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production}" \
     -t sistema-financeiro:latest .
   ```

**Nota:** O `package.json` já foi atualizado com as dependências necessárias e versões compatíveis. Certifique-se de transferir o arquivo atualizado antes de fazer o build.

### ❌ Erro: "ERESOLVE unable to resolve dependency tree" (Conflito de versões apexcharts)

**Causa:** Conflito de versões entre `apexcharts` e `react-apexcharts`. Versões antigas não são compatíveis.

**Solução DEFINITIVA:**

1. **O `package.json` já foi atualizado** com versões compatíveis:
   - `apexcharts: ^4.0.0` (atualizado de 3.x para 4.x)
   - `react-apexcharts: ^1.8.0` (atualizado para versão compatível)

2. **O `Dockerfile` já foi atualizado** para usar `--legacy-peer-deps` como fallback:
   ```dockerfile
   RUN npm install --legacy-peer-deps
   ```

3. **Transferir arquivos atualizados para a VPS:**
   ```powershell
   # No PowerShell do Windows
   scp package.json Dockerfile root@38.242.245.229:/opt/sistema-financeiro/
   ```

4. **Fazer build novamente:**
   ```bash
   # Na VPS
   cd /opt/sistema-financeiro
   source .env
   docker build \
     --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
     --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT="${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production}" \
     -t sistema-financeiro:latest .
   ```

**Nota:** Esta solução resolve definitivamente o conflito de dependências. As versões agora são compatíveis entre si.

### ❌ Erro: "Imagem não encontrada" no Portainer

**Causa:** A imagem Docker não foi buildada ou não está disponível.

**Solução:**
```bash
# Na VPS, verificar se a imagem existe
docker images | grep sistema-financeiro

# Se não existir, fazer build novamente (volte ao passo 5)
cd /opt/sistema-financeiro
source .env
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT="${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production}" \
  -t sistema-financeiro:latest .
```

### ❌ Erro 502 Bad Gateway ao acessar o site

**Causa:** O serviço não está rodando ou há problema na configuração do Traefik.

**Solução:**
```bash
# Verificar se o serviço está rodando
docker service ls | grep sistema-financeiro

# Ver logs para identificar o problema
docker service logs sistema-financeiro_sistema-financeiro --tail 100

# Verificar se a porta está correta (deve ser 3000)
# Verificar se o Traefik está configurado corretamente
```

### ❌ SSL não funciona / Certificado não é gerado

**Causa:** DNS não está apontando corretamente ou Traefik não está configurado.

**Solução:**
1. Verifique se o DNS de `analiscode.com` está apontando para `38.242.245.229`
2. Aguarde 5-10 minutos após o deploy (certificado leva tempo para ser gerado)
3. Verifique os logs do Traefik se necessário
4. Certifique-se de que o `certresolver=letsencryptresolver` está configurado no Traefik

### ❌ Variáveis de ambiente não funcionam

**Causa:** Variáveis não foram configuradas corretamente no Portainer.

**Solução:**
1. No Portainer, vá em **Stacks** → **sistema-financeiro** → **Editor**
2. Verifique se as variáveis estão na seção "Environment variables"
3. Certifique-se de que não há espaços extras nos nomes das variáveis
4. Use os mesmos valores do arquivo `.env` da VPS
5. Após alterar, clique em **"Update the stack"**

### ❌ Erro: "Property 'clientes' does not exist on type" (Erro de TypeScript)

**Causa:** Erro de tipagem do TypeScript ao fazer joins no Supabase. O TypeScript não reconhece as propriedades relacionadas retornadas pela query.

**Solução:**

O arquivo `app/api/asaas/create-charge/route.ts` já foi corrigido. Se você encontrar erros similares em outros arquivos:

1. **Tipar explicitamente o resultado da query:**
   ```typescript
   const { data: lancamentoData, error } = await supabase
     .from('financeiro_lancamentos')
     .select(`
       *,
       clientes!inner (*),
       servicos!inner (*)
     `)
     .single()
   
   // Tipar como any para evitar erros do TypeScript
   const lancamento = lancamentoData as any
   const cliente = lancamento.clientes
   const servico = lancamento.servicos
   ```

2. **Ou usar tipagem mais específica:**
   ```typescript
   interface LancamentoWithRelations {
     [key: string]: any
     clientes?: any
     servicos?: any
   }
   
   const lancamento = lancamentoData as LancamentoWithRelations
   ```

**Nota:** O arquivo `app/api/asaas/create-charge/route.ts` já foi corrigido com essa solução.

### ❌ Erro: "Argument of type '{ asaas_subscription_id: string; invoice_url: string | null; }' is not assignable" (Erro de TypeScript no update)

**Causa:** Erro de tipagem do TypeScript ao fazer `.update()` no Supabase. Os campos `asaas_subscription_id`, `asaas_payment_id` ou `invoice_url` podem não estar definidos no tipo `Update` da tabela.

**Solução:**

O arquivo `app/api/asaas/create-charge/route.ts` já foi corrigido. Se você encontrar erros similares:

**Adicionar `as any` ao objeto de update:**
```typescript
// Antes (com erro):
await supabase
  .from('financeiro_lancamentos')
  .update({ 
    asaas_subscription_id: subscription.id,
    invoice_url: invoiceUrl
  })
  .eq('id', lancamentoId)

// Depois (corrigido):
await supabase
  .from('financeiro_lancamentos')
  .update({ 
    asaas_subscription_id: subscription.id,
    invoice_url: invoiceUrl
  } as any)
  .eq('id', lancamentoId)
```

**Nota:** O arquivo `app/api/asaas/create-charge/route.ts` já foi corrigido com essa solução em ambos os `.update()` (linhas 106 e 141).

### ❌ Serviço não inicia / Fica em loop de restart

**Causa:** Erro na aplicação ou variáveis de ambiente incorretas.

**Solução:**
```bash
# Ver logs detalhados
docker service logs sistema-financeiro_sistema-financeiro --tail 200

# Verificar variáveis de ambiente no container
docker service ps sistema-financeiro_sistema-financeiro --no-trunc

# Verificar se o .env na VPS está correto
cat /opt/sistema-financeiro/.env
```

---

## 🔄 Como Atualizar o Sistema (Quando Fizer Mudanças)

Quando você fizer alterações no código e quiser atualizar em produção:

### **Método 1: Via Portainer (Recomendado)**

1. **Transferir arquivos atualizados para VPS:**
   ```powershell
   # No seu Windows PowerShell, no diretório do projeto
   scp -r app components lib hooks contexts types root@38.242.245.229:/opt/sistema-financeiro/
   ```

2. **Na VPS, fazer build da nova imagem:**
   ```bash
   ssh root@38.242.245.229
   cd /opt/sistema-financeiro
   source .env
   docker build \
     --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
     --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT="${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production}" \
     -t sistema-financeiro:latest .
   ```

3. **No Portainer, reiniciar o serviço:**
   - Vá em **Stacks** → **sistema-financeiro**
   - Clique no serviço `sistema-financeiro`
   - Clique em **"Recreate"** ou **"Restart"**
   - Ou vá em **Editor** → **"Update the stack"**

### **Método 2: Via SSH (Mais Rápido)**

```bash
# Na VPS, após fazer o build da nova imagem
docker service update --force sistema-financeiro_sistema-financeiro
```

Isso vai reiniciar o serviço com a nova imagem.

---

## 📞 Comandos de Verificação Rápida

Se algo não estiver funcionando, execute estes comandos na VPS para diagnosticar:

```bash
# Conectar na VPS
ssh root@38.242.245.229

# 1. Verificar status do serviço
docker service ls | grep sistema-financeiro

# 2. Ver logs recentes
docker service logs sistema-financeiro_sistema-financeiro --tail 50

# 3. Verificar se a imagem existe
docker images | grep sistema-financeiro

# 4. Verificar se a rede existe
docker network ls | grep REDE_INTERNA

# 5. Verificar detalhes do serviço
docker service ps sistema-financeiro_sistema-financeiro

# 6. Verificar se o arquivo .env existe
cat /opt/sistema-financeiro/.env
```

---

## 🎯 Resumo dos Passos Principais

1. ✅ Criar `.env` na VPS
2. ✅ Transferir arquivos para VPS
3. ✅ Criar rede Docker
4. ✅ Build da imagem Docker
5. ✅ Configurar stack no Portainer
6. ✅ Configurar variáveis no Portainer
7. ✅ Deploy da stack
8. ✅ Testar acesso

---

**🎉 Pronto! Seu sistema está em produção!**

Se tiver dúvidas, consulte a seção "Problemas Comuns" acima ou verifique os logs.

