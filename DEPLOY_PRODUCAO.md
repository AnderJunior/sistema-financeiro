# 🚀 Deploy em Produção - Guia Direto

> **IP da VPS:** `38.242.245.229`  
> **Domínio:** `analiscode.com`  
> **Usuário:** `root`

## ⚡ Passo a Passo Completo

### **1. Conectar na VPS e Preparar Diretório**

Abra o PowerShell ou CMD e execute:

```powershell
# Conectar na VPS via SSH
ssh root@38.242.245.229

# Após conectar, na VPS, execute:
mkdir -p /opt/sistema-financeiro
cd /opt/sistema-financeiro
```

### **2. Transferir Arquivos do Projeto (SEM node_modules)**

**IMPORTANTE:** Feche a conexão SSH (digite `exit`) e volte para o PowerShell no seu computador Windows.

No PowerShell, no diretório do projeto (`C:\Users\playh\OneDrive\Área de Trabalho\sistema_financeiro`), execute:

**Método Recomendado - Transferir arquivos específicos (mais rápido):**

```powershell
# Primeiro, transferir arquivos de configuração
scp Dockerfile package.json package-lock.json next.config.js tsconfig.json tailwind.config.ts postcss.config.js root@38.242.245.229:/opt/sistema-financeiro/

# Depois, transferir diretórios do projeto (SEM node_modules)
scp -r app root@38.242.245.229:/opt/sistema-financeiro/
scp -r components root@38.242.245.229:/opt/sistema-financeiro/
scp -r lib root@38.242.245.229:/opt/sistema-financeiro/
scp -r hooks root@38.242.245.229:/opt/sistema-financeiro/
scp -r contexts root@38.242.245.229:/opt/sistema-financeiro/
scp -r types root@38.242.245.229:/opt/sistema-financeiro/
scp -r public root@38.242.245.229:/opt/sistema-financeiro/
scp -r supabase root@38.242.245.229:/opt/sistema-financeiro/
```

**OU use este método com exclusão (se tiver muitos arquivos):**

```powershell
# No PowerShell, criar lista de arquivos para transferir (excluindo node_modules)
# Primeiro, transferir arquivos individuais
Get-ChildItem -File | Where-Object { $_.Name -notlike "*.log" } | ForEach-Object {
    scp $_.FullName root@38.242.245.229:/opt/sistema-financeiro/
}

# Depois, transferir diretórios (excluindo node_modules e .next)
Get-ChildItem -Directory | Where-Object { $_.Name -notin @('node_modules', '.next', '.git') } | ForEach-Object {
    scp -r $_.FullName root@38.242.245.229:/opt/sistema-financeiro/
}
```

**Método Mais Simples (recomendado para Windows):**

Se você já iniciou a transferência com `scp -r *` e quer cancelar:
1. Pressione `Ctrl+C` para cancelar
2. Use os comandos acima para transferir sem node_modules

Ou se já transferiu tudo, pode limpar depois na VPS (veja passo 3).

### **3. Conectar na VPS Novamente e Verificar Arquivos**

```powershell
# Conectar na VPS
ssh root@38.242.245.229

# Na VPS, verificar se os arquivos foram transferidos
cd /opt/sistema-financeiro
ls -la

# Verificar se Dockerfile existe (MUITO IMPORTANTE!)
ls -la Dockerfile

# Se o Dockerfile não existir, você verá um erro
# Nesse caso, volte ao passo 2 e transfira novamente

# Se você transferiu node_modules por engano, remova-o (RECOMENDADO):
rm -rf node_modules
# O Docker vai criar o node_modules durante o build, então não precisa dele agora
# Isso vai economizar espaço e tornar o build mais rápido
```

### **4. Criar Arquivo .env na VPS**

```bash
# Ainda na VPS, no diretório /opt/sistema-financeiro
nano .env
```

**Cole e ajuste com seus valores reais:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
ASAAS_API_TOKEN=seu_token_asaas_aqui
NEXT_PUBLIC_ASAAS_ENVIRONMENT=production
```

**Para salvar no nano:**
1. Pressione `Ctrl+X`
2. Pressione `Y` (para confirmar)
3. Pressione `Enter`

### **5. Criar/Verificar Rede Docker Swarm**

```bash
# Ainda na VPS
# Verificar se a rede existe
docker network ls | grep REDE_INTERNA

# Se não existir, criar
docker network create --driver overlay --attachable REDE_INTERNA
```

### **6. Build da Imagem Docker**

**IMPORTANTE:** O Dockerfile foi atualizado para usar `npm install` ao invés de `npm ci`, o que resolve problemas com `package-lock.json` inconsistente.

```bash
# Ainda na VPS, no diretório /opt/sistema-financeiro
# Certifique-se de estar no diretório correto
pwd
# Deve mostrar: /opt/sistema-financeiro

# Verificar se Dockerfile está atualizado (deve usar Node.js 20 e npm install)
head -n 12 Dockerfile
# Deve mostrar: FROM node:20-alpine AS base
# E na linha 11: RUN npm install

# Se o Dockerfile não estiver atualizado, transfira novamente:
# No Windows PowerShell: scp Dockerfile root@38.242.245.229:/opt/sistema-financeiro/

# Carregar variáveis do .env
source .env

# Verificar se as variáveis foram carregadas (opcional)
echo "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"

# Build da imagem (isso pode levar vários minutos)
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT="${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production}" \
  -t sistema-financeiro:latest .

# Aguarde o build terminar completamente
```

> ✅ **Nota:** O Dockerfile agora usa `npm install` que é mais tolerante com `package-lock.json` inconsistente. Certifique-se de ter o Dockerfile atualizado na VPS (deve usar Node.js 20).

### **7. Verificar Imagem Criada**

```bash
# Verificar se a imagem foi criada
docker images | grep sistema-financeiro
```

Deve mostrar algo como:
```
sistema-financeiro   latest   abc123def456   2 minutes ago   500MB
```

Se não aparecer, o build falhou. Verifique os erros acima e tente novamente.

### **8. Configurar Stack no Portainer**

> ✅ **Pré-requisito:** Você já deve ter feito o build da imagem (passo 6) e ela deve estar disponível na VPS.

#### 8.1. Acessar Portainer

1. Abra seu navegador
2. Acesse: `https://seu-portainer.com` (ou `http://38.242.245.229:9000` se configurado)
3. Faça login no Portainer

#### 8.2. Criar Nova Stack

1. No menu lateral esquerdo, clique em **"Stacks"**
2. Clique no botão **"Add stack"** (canto superior direito)
3. Preencha:
   - **Name**: `sistema-financeiro`
   - **Build method**: Selecione **"Web editor"** (não "Repository")

#### 8.3. Colar Configuração da Stack

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

#### 8.4. Configurar Variáveis de Ambiente no Portainer

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

**⚠️ ATENÇÃO:** Use os MESMOS valores que você colocou no arquivo `.env` na VPS (passo 4).

#### 8.5. Fazer Deploy da Stack

1. Após colar a configuração YAML e adicionar as variáveis de ambiente
2. Role até o final da página
3. Clique no botão **"Deploy the stack"** (canto inferior direito)
4. Aguarde alguns segundos enquanto o Portainer cria o serviço
5. Você será redirecionado para a lista de stacks

#### 8.6. Verificar Status do Deploy

1. Na lista de stacks, encontre **"sistema-financeiro"**
2. Verifique se o status está **verde** (Running) ou **amarelo** (Starting)
3. Se estiver verde, o serviço está rodando! ✅
4. Se estiver vermelho ou com erro, clique no nome da stack para ver os detalhes

### **9. Verificar Logs e Status**

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

### **10. Testar Acesso ao Sistema**

1. Abra seu navegador (Chrome, Firefox, Edge, etc.)
2. Acesse: `https://analiscode.com`
3. Verifique se aparece um **cadeado verde** no navegador (SSL funcionando)
4. Se aparecer uma página de erro ou não carregar:
   - Aguarde alguns minutos (pode estar iniciando)
   - Verifique os logs (passo 9)
   - Verifique se o DNS está apontando para o IP correto
5. Se carregar normalmente, teste fazer login no sistema

**Se o SSL não funcionar imediatamente:**
- Aguarde 5-10 minutos (o Traefik precisa gerar o certificado)
- Verifique se o DNS está apontando corretamente para `38.242.245.229`
- Verifique os logs do Traefik se necessário

---

## ✅ Checklist Final - Siga na Ordem

Use este checklist para não perder nenhum passo:

- [ ] **Passo 1:** Conectei na VPS e criei o diretório `/opt/sistema-financeiro`
- [ ] **Passo 2:** Transfiri todos os arquivos do projeto para a VPS
- [ ] **Passo 3:** Verifiquei que o Dockerfile existe na VPS (`ls -la Dockerfile`)
- [ ] **Passo 4:** Criei o arquivo `.env` na VPS com todas as variáveis
- [ ] **Passo 5:** Criei/verifiquei a rede `REDE_INTERNA` no Docker Swarm
- [ ] **Passo 6:** Fiz o build da imagem Docker (`sistema-financeiro:latest`)
- [ ] **Passo 7:** Verifiquei que a imagem foi criada (`docker images | grep sistema-financeiro`)
- [ ] **Passo 8.1:** Acessei o Portainer no navegador
- [ ] **Passo 8.2:** Criei uma nova stack chamada `sistema-financeiro`
- [ ] **Passo 8.3:** Colei a configuração YAML completa no editor
- [ ] **Passo 8.4:** Configurei TODAS as variáveis de ambiente no Portainer
- [ ] **Passo 8.5:** Fiz o deploy da stack
- [ ] **Passo 8.6:** Verifiquei que o serviço está com status verde (Running)
- [ ] **Passo 9:** Verifiquei os logs e não há erros críticos
- [ ] **Passo 10:** Acessei `https://analiscode.com` e o sistema está funcionando
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

### ❌ Erro: "Imagem não encontrada" no Portainer

**Causa:** A imagem Docker não foi buildada ou não está disponível.

**Solução:**
```bash
# Na VPS, verificar se a imagem existe
docker images | grep sistema-financeiro

# Se não existir, fazer build novamente (volte ao passo 6)
cd /opt/sistema-financeiro
source .env
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT="${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production}" \
  -t sistema-financeiro:latest .
```

### ❌ Erro: "npm ci failed" ou "package.json and package-lock.json are out of sync"

**Causa:** O Dockerfile está usando `npm ci` que é muito rigoroso e requer `package-lock.json` perfeitamente sincronizado.

**Solução DEFINITIVA - Atualizar Dockerfile:**

```bash
# Na VPS, atualizar o Dockerfile
cd /opt/sistema-financeiro
nano Dockerfile
```

**Altere a linha 11 de:**
```
RUN npm ci || npm install
```
**Para:**
```
RUN npm install
```

**Salve:** `Ctrl+X`, depois `Y`, depois `Enter`

**Depois, tente o build novamente:**
```bash
source .env
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT="${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production}" \
  -t sistema-financeiro:latest .
```

**OU transfira o Dockerfile atualizado do seu computador:**
```powershell
# No Windows PowerShell, no diretório do projeto
scp Dockerfile root@38.242.245.229:/opt/sistema-financeiro/
```

O Dockerfile atualizado já usa `npm install` que resolve este problema automaticamente.

### ❌ Erro: "Unsupported engine" - Node.js versão incorreta

**Causa:** O Dockerfile está usando Node.js 18, mas os pacotes requerem Node.js 20+.

**Solução:**
```bash
# Na VPS, editar o Dockerfile
cd /opt/sistema-financeiro
nano Dockerfile

# Alterar a primeira linha de:
# FROM node:18-alpine AS base
# Para:
# FROM node:20-alpine AS base

# Salvar (Ctrl+X, Y, Enter)

# OU transfira o Dockerfile atualizado do seu computador:
# No Windows PowerShell:
scp Dockerfile root@38.242.245.229:/opt/sistema-financeiro/
```

### ❌ Erro: "Permission denied" ao executar `next` ou `npm run build`

**Causa:** Os binários do node_modules não têm permissão de execução.

**Solução:**
```bash
# Transfira o Dockerfile atualizado do seu computador:
# No Windows PowerShell:
scp Dockerfile root@38.242.245.229:/opt/sistema-financeiro/

# OU edite manualmente na VPS:
cd /opt/sistema-financeiro
nano Dockerfile

# Na linha do "RUN npm run build", altere para:
# RUN npx next build

# E adicione antes do COPY . . (na seção builder):
# RUN chmod -R +x node_modules/.bin || true

# Salvar (Ctrl+X, Y, Enter)

# Tentar build novamente
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
   scp -r * root@38.242.245.229:/opt/sistema-financeiro/
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

1. ✅ Transferir arquivos para VPS
2. ✅ Criar `.env` na VPS
3. ✅ Criar rede Docker
4. ✅ Build da imagem Docker
5. ✅ Configurar stack no Portainer
6. ✅ Configurar variáveis no Portainer
7. ✅ Deploy da stack
8. ✅ Testar acesso

---

**🎉 Pronto! Seu sistema está em produção!**

Se tiver dúvidas, consulte a seção "Problemas Comuns" acima ou verifique os logs.

