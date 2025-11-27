# Guia Completo de Instalação - Sistema Financeiro no Portainer

Este guia fornece instruções passo a passo para implantar o Sistema Financeiro em sua VPS usando Portainer com Docker Swarm e Traefik.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:

- ✅ VPS com Docker Swarm inicializado
- ✅ Portainer instalado e configurado
- ✅ Traefik configurado como reverse proxy
- ✅ Rede Docker Swarm criada (ex: `REDE_INTERNA`)
- ✅ Domínio configurado apontando para o IP da VPS
- ✅ Certificado SSL configurado no Traefik (Let's Encrypt)

---

## 🚀 Passo a Passo Completo

### **PASSO 1: Preparar o Ambiente na VPS**

#### 1.1. Conectar via SSH na sua VPS

```bash
ssh usuario@seu-ip-vps
```

#### 1.2. Criar diretório para o projeto

```bash
mkdir -p /opt/sistema-financeiro
cd /opt/sistema-financeiro
```

#### 1.3. Verificar se a rede Docker Swarm existe

```bash
docker network ls | grep REDE_INTERNA
```

Se não existir, crie a rede:

```bash
docker network create --driver overlay --attachable REDE_INTERNA
```

---

### **PASSO 2: Preparar a Imagem Docker**

Você tem duas opções:

#### **OPÇÃO A: Build Local na VPS (Recomendado para desenvolvimento)**

#### 2.1. Transferir os arquivos do projeto para a VPS

**IMPORTANTE:** Certifique-se de transferir TODOS os arquivos necessários, incluindo o `Dockerfile`, `package.json`, `next.config.js`, etc.

No seu computador local, use `scp` ou `rsync`:

**Opção 1: Usando rsync (Recomendado - mais eficiente)**

```bash
# No seu computador local, no diretório do projeto
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.local' \
  --include 'Dockerfile' \
  --include 'package.json' \
  --include 'package-lock.json' \
  --include 'next.config.js' \
  --include 'tsconfig.json' \
  --include 'tailwind.config.ts' \
  --include 'postcss.config.js' \
  --include 'app/' \
  --include 'components/' \
  --include 'lib/' \
  --include 'hooks/' \
  --include 'contexts/' \
  --include 'types/' \
  --include 'public/' \
  --include 'supabase/' \
  ./ usuario@seu-ip-vps:/opt/sistema-financeiro/
```

**Opção 2: Usando scp (Mais simples, mas mais lento)**

```bash
# No seu computador local, no diretório do projeto
scp -r \
  Dockerfile \
  package.json \
  package-lock.json \
  next.config.js \
  tsconfig.json \
  tailwind.config.ts \
  postcss.config.js \
  app \
  components \
  lib \
  hooks \
  contexts \
  types \
  public \
  supabase \
  usuario@seu-ip-vps:/opt/sistema-financeiro/
```

**Opção 3: Transferir tudo e excluir depois (Mais seguro)**

```bash
# No seu computador local
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.local' \
  ./ usuario@seu-ip-vps:/opt/sistema-financeiro/
```

#### 2.2. Verificar arquivos transferidos na VPS

**DICA:** Você pode usar o script de verificação para checar se todos os arquivos estão presentes:

```bash
# Copiar o script de verificação para a VPS (do seu computador local)
scp verificar-arquivos.sh usuario@seu-ip-vps:/opt/sistema-financeiro/

# Na VPS, dar permissão de execução e executar
chmod +x verificar-arquivos.sh
./verificar-arquivos.sh
```

Ou verificar manualmente:

**IMPORTANTE:** Antes de fazer o build, verifique se os arquivos essenciais foram transferidos:

```bash
# Conectar na VPS
ssh usuario@seu-ip-vps

# Ir para o diretório do projeto
cd /opt/sistema-financeiro

# Verificar se os arquivos essenciais existem
ls -la | grep -E "Dockerfile|package.json|next.config.js"

# Verificar estrutura de diretórios
ls -la

# Se o Dockerfile não estiver presente, você verá um erro
# Nesse caso, verifique se está no diretório correto:
pwd
# Deve mostrar: /opt/sistema-financeiro

# Listar todos os arquivos para debug
find . -maxdepth 1 -type f -name "Dockerfile" -o -name "package.json" -o -name "next.config.js"
```

**Se o Dockerfile não estiver presente:**

1. Verifique se você está no diretório correto: `pwd`
2. Liste os arquivos: `ls -la`
3. Se necessário, transfira novamente usando um dos métodos acima
4. Ou copie o Dockerfile manualmente:

```bash
# No seu computador local
scp Dockerfile usuario@seu-ip-vps:/opt/sistema-financeiro/
```

#### 2.3. Criar arquivo .env na VPS

```bash
cd /opt/sistema-financeiro

# Criar arquivo .env com suas variáveis de ambiente
nano .env
```

Adicione as seguintes variáveis no arquivo `.env`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# Asaas (opcional)
ASAAS_API_TOKEN=seu_token_do_asaas_aqui
NEXT_PUBLIC_ASAAS_ENVIRONMENT=production
```

#### 2.4. Verificar variáveis de ambiente antes do build

```bash
# Carregar variáveis do arquivo .env
source .env

# Verificar se as variáveis foram carregadas
echo "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "Supabase Key: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:20}..." # Mostra apenas primeiros 20 caracteres
```

#### 2.5. Build da imagem Docker

**IMPORTANTE:** Certifique-se de estar no diretório correto que contém o Dockerfile:

```bash
# Verificar que está no diretório correto
pwd
# Deve mostrar: /opt/sistema-financeiro

# Verificar se o Dockerfile existe
ls -la Dockerfile
# Deve mostrar informações do arquivo

# Carregar variáveis do .env (se ainda não carregou)
source .env

# Fazer o build da imagem
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT="${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production}" \
  -t sistema-financeiro:latest .

# O ponto (.) no final indica o diretório atual como contexto de build
```

**Se ainda der erro "Dockerfile not found":**

1. Verifique o diretório atual: `pwd`
2. Liste os arquivos: `ls -la`
3. Verifique se o Dockerfile está presente: `test -f Dockerfile && echo "OK" || echo "FALTANDO"`
4. Se necessário, copie manualmente o Dockerfile do seu computador local

#### **OPÇÃO B: Usar Registry Docker (Recomendado para produção)**

#### 2.1. Build e push para um registry

No seu computador local ou em um CI/CD:

```bash
# Build da imagem
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY} \
  --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT=${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production} \
  -t seu-registry.com/sistema-financeiro:latest .

# Push para o registry
docker push seu-registry.com/sistema-financeiro:latest
```

#### 2.2. Na VPS, fazer pull da imagem

```bash
docker pull seu-registry.com/sistema-financeiro:latest
docker tag seu-registry.com/sistema-financeiro:latest sistema-financeiro:latest
```

---

### **PASSO 3: Configurar a Stack no Portainer**

#### 3.1. Acessar o Portainer

1. Abra seu navegador e acesse: `https://seu-portainer.com`
2. Faça login no Portainer

#### 3.2. Criar a Stack

1. No menu lateral, clique em **"Stacks"**
2. Clique no botão **"Add stack"**
3. Preencha os campos:
   - **Name**: `sistema-financeiro`
   - **Build method**: Selecione **"Web editor"**

#### 3.3. Copiar e Colar o conteúdo do arquivo `stack.yml`

Cole o conteúdo completo do arquivo `stack.yml` no editor web do Portainer.

#### 3.4. Configurar Variáveis de Ambiente

Antes de fazer o deploy, você precisa configurar as variáveis de ambiente. No Portainer:

1. Role até a seção **"Environment variables"**
2. Clique em **"Add environment variable"**
3. Adicione cada variável:

```
NEXT_PUBLIC_SUPABASE_URL = https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY = sua_chave_service_role_aqui
ASAAS_API_TOKEN = seu_token_do_asaas_aqui
NEXT_PUBLIC_ASAAS_ENVIRONMENT = production
```

**OU** você pode criar um arquivo `.env` na VPS e referenciá-lo no stack.yml:

No arquivo `stack.yml`, adicione na seção do serviço:

```yaml
env_file:
  - /opt/sistema-financeiro/.env
```

#### 3.5. Ajustar o Domínio

No arquivo `stack.yml`, localize e altere o domínio:

```yaml
- traefik.http.routers.sistema-financeiro.rule=Host(`sistema-financeiro.seudominio.com.br`)
```

Substitua `sistema-financeiro.seudominio.com.br` pelo seu domínio real.

#### 3.6. Verificar Configurações do Traefik

Certifique-se de que:
- O entrypoint `websecure` existe no Traefik
- O certresolver `letsencryptresolver` está configurado
- O entrypoint `web` existe para redirecionamento HTTP

---

### **PASSO 4: Fazer o Deploy**

#### 4.1. Deploy da Stack

1. No Portainer, após colar o conteúdo do `stack.yml` e configurar as variáveis
2. Clique em **"Deploy the stack"**
3. Aguarde o processo de deploy

#### 4.2. Verificar o Status

1. Vá para **"Stacks"** → **"sistema-financeiro"**
2. Verifique se o serviço está rodando (status verde)
3. Clique no nome do serviço para ver logs em tempo real

---

### **PASSO 5: Verificar Logs e Troubleshooting**

#### 5.1. Ver Logs no Portainer

1. Acesse **"Stacks"** → **"sistema-financeiro"**
2. Clique no serviço `sistema-financeiro`
3. Vá para a aba **"Logs"**
4. Verifique se há erros

#### 5.2. Ver Logs via SSH

```bash
# Ver logs do serviço
docker service logs sistema-financeiro_sistema-financeiro

# Seguir logs em tempo real
docker service logs -f sistema-financeiro_sistema-financeiro
```

#### 5.3. Verificar se o serviço está rodando

```bash
docker service ls | grep sistema-financeiro
```

#### 5.4. Verificar conectividade

```bash
# Verificar se o container está acessível
docker service ps sistema-financeiro_sistema-financeiro

# Testar conectividade interna
docker exec -it $(docker ps -q -f name=sistema-financeiro) wget -O- http://localhost:3000
```

---

### **PASSO 6: Configurar DNS**

#### 6.1. Configurar Registro DNS

No seu provedor de DNS (Cloudflare, Route53, etc.), adicione um registro:

- **Tipo**: A ou CNAME
- **Nome**: `sistema-financeiro` (ou o subdomínio desejado)
- **Valor**: IP da sua VPS (para A) ou domínio principal (para CNAME)
- **TTL**: 300 (ou automático)

#### 6.2. Aguardar Propagação DNS

Aguarde alguns minutos para a propagação do DNS (geralmente 5-15 minutos).

---

### **PASSO 7: Testar o Sistema**

#### 7.1. Acessar via Navegador

1. Abra seu navegador
2. Acesse: `https://sistema-financeiro.seudominio.com.br`
3. Verifique se o certificado SSL está funcionando (cadeado verde)
4. Teste o login e funcionalidades básicas

#### 7.2. Verificar Certificado SSL

O Traefik deve gerar automaticamente o certificado SSL via Let's Encrypt. Verifique:

```bash
# Ver certificados no Traefik
docker exec -it $(docker ps -q -f name=traefik) ls -la /letsencrypt/acme.json
```

---

## 🔧 Configurações Adicionais

### **Atualizar a Stack**

Para atualizar o sistema:

1. Faça build de uma nova imagem com tag diferente (ex: `sistema-financeiro:v1.1`)
2. No Portainer, edite a stack
3. Altere a tag da imagem no `stack.yml`
4. Clique em **"Update the stack"**

### **Escalar o Serviço**

Para aumentar o número de réplicas:

1. Edite a stack no Portainer
2. Altere `replicas: 1` para o número desejado
3. Atualize a stack

### **Backup**

Recomenda-se fazer backup regular do banco de dados Supabase através do painel do Supabase.

---

## 🐛 Troubleshooting Comum

### **Problema: Serviço não inicia**

**Solução:**
```bash
# Ver logs detalhados
docker service logs sistema-financeiro_sistema-financeiro --tail 100

# Verificar se a rede existe
docker network inspect REDE_INTERNA

# Verificar se a imagem existe
docker images | grep sistema-financeiro
```

### **Problema: Erro 502 Bad Gateway**

**Solução:**
- Verifique se o serviço está rodando: `docker service ls`
- Verifique se a porta está correta no Traefik (3000)
- Verifique os logs do Traefik: `docker service logs traefik_traefik`

### **Problema: Certificado SSL não é gerado**

**Solução:**
- Verifique se o DNS está apontando corretamente
- Verifique se o certresolver está configurado no Traefik
- Verifique os logs do Traefik para erros do Let's Encrypt

### **Problema: Variáveis de ambiente não funcionam**

**Solução:**
- Verifique se as variáveis estão configuradas no Portainer
- Verifique se o formato está correto (sem espaços extras)
- Reinicie o serviço após alterar variáveis

### **Problema: Erro "Dockerfile: no such file or directory"**

**Solução:**

Este erro ocorre quando o Dockerfile não está presente no diretório de build. Siga estes passos:

1. **Verificar diretório atual:**
   ```bash
   pwd
   # Deve mostrar: /opt/sistema-financeiro
   ```

2. **Verificar se o Dockerfile existe:**
   ```bash
   ls -la Dockerfile
   # Se não existir, você verá: ls: cannot access 'Dockerfile': No such file or directory
   ```

3. **Listar todos os arquivos no diretório:**
   ```bash
   ls -la
   # Verifique se você está no diretório correto
   ```

4. **Se o Dockerfile não estiver presente, transfira novamente:**
   
   **Do seu computador local:**
   ```bash
   # Certifique-se de estar no diretório do projeto
   scp Dockerfile usuario@seu-ip-vps:/opt/sistema-financeiro/
   ```
   
   Ou transfira todos os arquivos novamente usando rsync:
   ```bash
   rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
     ./ usuario@seu-ip-vps:/opt/sistema-financeiro/
   ```

5. **Verificar novamente:**
   ```bash
   # Na VPS
   cd /opt/sistema-financeiro
   test -f Dockerfile && echo "Dockerfile encontrado!" || echo "Dockerfile AINDA não encontrado!"
   ```

6. **Se ainda não funcionar, verifique permissões:**
   ```bash
   ls -la | grep Dockerfile
   # Deve mostrar algo como: -rw-r--r-- 1 usuario usuario 1234 Jan 1 12:00 Dockerfile
   ```

---

## 📝 Checklist Final

Antes de considerar a instalação completa, verifique:

- [ ] Stack criada e rodando no Portainer
- [ ] Serviço com status verde (running)
- [ ] DNS configurado e propagado
- [ ] Certificado SSL funcionando
- [ ] Sistema acessível via HTTPS
- [ ] Login funcionando corretamente
- [ ] Conexão com Supabase funcionando
- [ ] Logs sem erros críticos

---

## 🔐 Segurança

### **Recomendações:**

1. **Nunca commite o arquivo `.env`** no Git
2. **Use senhas fortes** para todas as variáveis de ambiente
3. **Mantenha o sistema atualizado** regularmente
4. **Configure firewall** na VPS para permitir apenas portas necessárias
5. **Use secrets do Docker Swarm** para informações sensíveis (recomendado)

### **Usar Docker Secrets (Opcional mas Recomendado)**

Para maior segurança, você pode usar Docker Secrets:

```bash
# Criar secrets
echo "sua_chave_supabase" | docker secret create supabase_service_role_key -
echo "seu_token_asaas" | docker secret create asaas_api_token -
```

No `stack.yml`, adicione:

```yaml
secrets:
  - supabase_service_role_key
  - asaas_api_token

services:
  sistema-financeiro:
    secrets:
      - supabase_service_role_key
      - asaas_api_token
    environment:
      - SUPABASE_SERVICE_ROLE_KEY_FILE=/run/secrets/supabase_service_role_key
      - ASAAS_API_TOKEN_FILE=/run/secrets/asaas_api_token
```

---

## 📞 Suporte

Se encontrar problemas durante a instalação:

1. Verifique os logs do serviço
2. Verifique os logs do Traefik
3. Verifique a documentação do Traefik
4. Verifique a documentação do Docker Swarm

---

## ✅ Conclusão

Após seguir todos os passos, seu Sistema Financeiro estará rodando em produção na sua VPS com Portainer, Traefik e Docker Swarm!

**Última atualização:** $(date)

