# 🚀 Guia Completo de Deploy na VPS

Este guia vai te ajudar a fazer o deploy do sistema na sua VPS.

## 📋 Informações da VPS

- **IP**: 38.242.245.229
- **Domínio**: app.analiscode.com
- **Usuário**: root (ou o usuário configurado no SSH)

## 🔧 Pré-requisitos

1. **SSH configurado** para acessar a VPS
2. **Docker e Docker Swarm** instalados na VPS
3. **Traefik** configurado e rodando
4. **Rede Docker** `REDE_INTERNA` criada
5. **Credenciais do Supabase** (URL, Anon Key, Service Role Key)
6. **Email e domínio** para licenciamento

## 📝 Passo 1: Preparar Variáveis de Ambiente

### 1.1. Criar arquivo .env na VPS

Conecte na VPS e crie o arquivo `.env`:

```bash
ssh root@38.242.245.229
mkdir -p /opt/sistema-financeiro
cd /opt/sistema-financeiro
nano .env
```

### 1.2. Adicionar variáveis no .env

```bash
# Supabase (mesmo para todos os clientes)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# Licenciamento (obrigatórias)
LICENSE_EMAIL=seu-email@exemplo.com
LICENSE_DOMAIN=app.analiscode.com
LICENSE_API_URL=https://app.analiscode.com/api/license/verify
```

**⚠️ IMPORTANTE**: 
- Substitua os valores pelos seus dados reais
- O `LICENSE_EMAIL` deve ser o email cadastrado na tabela `assinantes` do Supabase
- O `LICENSE_DOMAIN` deve ser exatamente `app.analiscode.com`

## 📦 Passo 2: Transferir Código para VPS

### ⭐ Opção A: Usar Script PowerShell (RECOMENDADO - Windows)

O script automatiza todo o processo de transferência:

```powershell
.\deploy-vps-completo.ps1
```

**Vantagens:**
- ✅ Automatiza todo o processo
- ✅ Verifica conexão antes de transferir
- ✅ Transfere apenas arquivos necessários
- ✅ Funciona nativamente no Windows

### Opção B: Transferir Manualmente com SCP (Windows)

**⚠️ IMPORTANTE**: Execute estes comandos do **Windows**, no diretório raiz do projeto (`sistema_financeiro`).

Se preferir transferir manualmente, use o `scp` (OpenSSH):

```powershell
# IMPORTANTE: Certifique-se de estar no diretório raiz do projeto
# O diretório deve conter o Dockerfile, package.json, etc.
# Navegue até o diretório do projeto no Windows:
cd "C:\Users\playh\OneDrive\Área de Trabalho\sistema_financeiro"

# OU use o caminho relativo se já estiver na pasta:
# cd ".\sistema_financeiro"

# Verificar se o Dockerfile existe antes de transferir
if (Test-Path Dockerfile) {
    Write-Host "✓ Dockerfile encontrado!" -ForegroundColor Green
} else {
    Write-Host "✗ ERRO: Dockerfile não encontrado! Certifique-se de estar no diretório correto." -ForegroundColor Red
    exit
}

# Criar diretório na VPS primeiro
ssh root@38.242.245.229 "mkdir -p /opt/sistema-financeiro"

# Transferir arquivos essenciais (execute do Windows!)
scp Dockerfile root@38.242.245.229:/opt/sistema-financeiro/
scp package.json root@38.242.245.229:/opt/sistema-financeiro/
scp package-lock.json root@38.242.245.229:/opt/sistema-financeiro/
scp next.config.js root@38.242.245.229:/opt/sistema-financeiro/
scp tsconfig.json root@38.242.245.229:/opt/sistema-financeiro/
scp tailwind.config.ts root@38.242.245.229:/opt/sistema-financeiro/
scp postcss.config.js root@38.242.245.229:/opt/sistema-financeiro/
scp middleware.ts root@38.242.245.229:/opt/sistema-financeiro/
scp docker-entrypoint.sh root@38.242.245.229:/opt/sistema-financeiro/
scp stack.yml root@38.242.245.229:/opt/sistema-financeiro/

# Transferir diretórios
scp -r app root@38.242.245.229:/opt/sistema-financeiro/
scp -r components root@38.242.245.229:/opt/sistema-financeiro/
scp -r lib root@38.242.245.229:/opt/sistema-financeiro/
scp -r hooks root@38.242.245.229:/opt/sistema-financeiro/
scp -r contexts root@38.242.245.229:/opt/sistema-financeiro/
scp -r types root@38.242.245.229:/opt/sistema-financeiro/
scp -r supabase root@38.242.245.229:/opt/sistema-financeiro/
scp -r scripts root@38.242.245.229:/opt/sistema-financeiro/

# Transferir public se existir
if (Test-Path "public") {
    scp -r public root@38.242.245.229:/opt/sistema-financeiro/
}
```

### Opção C: Usar Git Bash ou WSL (se tiver instalado)

Se você tem Git Bash ou WSL instalado, pode usar rsync:

```bash
# No Git Bash ou WSL
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.local' \
  ./ root@38.242.245.229:/opt/sistema-financeiro/
```

## 🏗️ Passo 3: Build da Imagem Docker

### 3.1. Conectar na VPS

```bash
ssh root@38.242.245.229
cd /opt/sistema-financeiro
```

### 3.2. Validar Variáveis de Ambiente

**⚠️ IMPORTANTE:** Sempre valide as variáveis antes do build:

```bash
cd /opt/sistema-financeiro
source .env

# Verificar se as variáveis estão definidas
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "ERRO: Variáveis de ambiente não configuradas!"
  echo "Verifique o arquivo .env"
  exit 1
fi

echo "✓ Variáveis OK"
echo "  NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:0:30}..."
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:30}..."
```

### 3.3. Fazer Build

```bash
cd /opt/sistema-financeiro
source .env

docker build \
  --no-cache \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -t sistema-financeiro:latest . 2>&1 | tee build.log
```

**⏱️ Isso pode levar 5-15 minutos dependendo da conexão e recursos da VPS.**

**💡 Dica:** O flag `--no-cache` garante um build limpo. Se o build for bem-sucedido, você pode removê-lo em builds futuros para acelerar.

**📋 Verificar se o build foi bem-sucedido:**

```bash
# Verificar se a imagem foi criada
docker images | grep sistema-financeiro

# Verificar logs do build (se salvou em build.log)
tail -n 50 build.log
```

## 🌐 Passo 4: Configurar Rede Docker

### 4.1. Verificar se a rede existe

```bash
docker network ls | grep sistema_financeiro_web
```

### 4.2. Criar rede se não existir

```bash
docker network create --driver overlay --attachable sistema_financeiro_web
```

## 🚀 Passo 5: Deploy da Stack

### 5.1. Verificar stack.yml

Certifique-se de que o `stack.yml` está com o domínio correto:

```yaml
- traefik.http.routers.sistema-financeiro.rule=Host(`app.analiscode.com`)
```

### 5.2. Fazer Deploy

```bash
cd /opt/sistema-financeiro
docker stack deploy -c stack.yml sistema-financeiro
```

### 5.3. Verificar Status

```bash
# Ver serviços
docker service ls

# Ver logs
docker service logs -f sistema-financeiro_sistema-financeiro

# Ver detalhes do serviço
docker service ps sistema-financeiro_sistema-financeiro
```

## ✅ Passo 6: Verificar Funcionamento

### 6.1. Verificar Logs

```bash
docker service logs sistema-financeiro_sistema-financeiro
```

Você deve ver:
```
==========================================
Verificando licença do sistema...
==========================================
Verificando licença para:
  Email: seu-email@exemplo.com
  Domínio: app.analiscode.com
  API: https://app.analiscode.com/api/license/verify

✓ Licença verificada com sucesso!
Status: ativo
==========================================
Licença verificada - Iniciando sistema...
==========================================
```

### 6.2. Testar Acesso

Acesse no navegador:
```
https://app.analiscode.com
```

### 6.3. Verificar Certificado SSL

O Traefik deve gerar automaticamente o certificado SSL via Let's Encrypt.

## 🔍 Troubleshooting

### Erro no Build da Imagem Docker

#### Sintoma: Build falha com erro genérico

**Possíveis causas e soluções:**

1. **Variáveis de ambiente não configuradas:**
   ```bash
   # Verificar se o .env existe e tem as variáveis corretas
   ssh root@38.242.245.229
   cd /opt/sistema-financeiro
   cat .env
   ```
   
   Deve conter:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
   ```

2. **Falta de memória/disco na VPS:**
   ```bash
   # Verificar espaço em disco
   df -h
   
   # Verificar memória
   free -h
   
   # Limpar imagens Docker antigas
   docker system prune -a
   ```

3. **Erro: "Build standalone não foi gerado":**
   - Verifique se `next.config.js` tem `output: 'standalone'`
   - Verifique se não há erros de TypeScript/ESLint bloqueando o build
   - Tente fazer build local primeiro: `npm run build`

4. **Erro: "server.js não encontrado":**
   - O build standalone não foi gerado corretamente
   - Verifique os logs do build para erros específicos
   - Certifique-se de que todos os arquivos foram transferidos

5. **Erro de dependências:**
   ```bash
   # Limpar cache do npm no build
   docker build --no-cache --build-arg NEXT_PUBLIC_SUPABASE_URL="..." ...
   ```

6. **Erro de permissões:**
   ```bash
   # Verificar permissões do docker-entrypoint.sh
   ls -la docker-entrypoint.sh
   chmod +x docker-entrypoint.sh
   ```

#### Verificar logs detalhados do build:

```bash
# Fazer build com output detalhado
ssh root@38.242.245.229
cd /opt/sistema-financeiro
source .env
docker build \
  --progress=plain \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -t sistema-financeiro:latest . 2>&1 | tee build.log
```

#### Erro específico: "npm ERR!"

Se o erro for relacionado ao npm:

```bash
# Verificar versão do Node no Dockerfile
# Deve ser node:20-alpine ou superior

# Limpar cache do npm
docker build --no-cache ...

# Verificar se package-lock.json está atualizado
# No seu ambiente local:
npm install
git add package-lock.json
```

#### Erro específico: "Cannot find module"

Se aparecer erro de módulo não encontrado:

1. Verifique se todos os arquivos foram transferidos:
   ```bash
   ssh root@38.242.245.229
   cd /opt/sistema-financeiro
   ls -la
   # Deve ter: app/, components/, lib/, etc.
   ```

2. Verifique se o .dockerignore não está excluindo arquivos necessários

3. Re-transfira os arquivos usando o script de deploy

### Erro: "Dockerfile: No such file or directory" ao usar scp

**Sintoma:**
```
scp: stat local "Dockerfile": No such file or directory
```

**Causa:** Você está tentando executar o comando `scp` do lugar errado.

**Solução:**

1. **Se você executou o comando no servidor remoto** (por exemplo, `root@vmi2915531`):
   - ❌ **ERRADO**: Executar `scp` de dentro do servidor remoto
   - ✅ **CORRETO**: Execute os comandos `scp` do **Windows**, na raiz do projeto

2. **Verifique se está no diretório correto no Windows:**
   ```powershell
   # Deve mostrar o caminho do projeto no Windows
   pwd
   
   # Deve retornar True
   Test-Path Dockerfile
   ```

3. **Navegue até o diretório correto antes de executar os comandos scp:**
   ```powershell
   cd "C:\Users\playh\OneDrive\Área de Trabalho\sistema_financeiro"
   ```

4. **Lembre-se:** Os comandos `scp` na seção "Opção B" devem ser executados do **Windows**, não do servidor remoto!

### Erro: "WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED" ou "Host key verification failed"

**Sintoma:**
```
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Host key verification failed.
```

**Causa:** A chave SSH do servidor mudou (pode acontecer após reinstalação ou configuração do servidor). O SSH bloqueia a conexão por segurança para evitar ataques man-in-the-middle.

**Solução:**

1. **Remover a chave antiga do arquivo known_hosts:**

   No PowerShell do Windows:
   ```powershell
   # Método 1: Editar o arquivo manualmente
   notepad $env:USERPROFILE\.ssh\known_hosts
   ```
   - Abra o arquivo e delete a linha 6 (ou a linha que contém o IP `38.242.245.229`)

   **OU** use o comando para remover automaticamente (RECOMENDADO):
   ```powershell
   # Método 2: Remover automaticamente usando ssh-keygen
   ssh-keygen -R 38.242.245.229
   ```
   
   Este comando:
   - ✅ Remove automaticamente todas as entradas do IP do arquivo `known_hosts`
   - ✅ Faz backup do arquivo original (`.known_hosts.old`)
   - ✅ É mais rápido e seguro que editar manualmente

2. **Tentar conectar novamente:**
   
   O SSH vai perguntar se você quer adicionar a nova chave:
   ```powershell
   ssh root@38.242.245.229
   ```
   - Digite `yes` quando perguntado

3. **Depois disso, os comandos scp funcionarão normalmente:**
   ```powershell
   scp Dockerfile root@38.242.245.229:/opt/sistema-financeiro/
   ```

**⚠️ IMPORTANTE:** 
- Se você tem certeza de que o servidor é legítimo, pode prosseguir com segurança
- Se você não sabe por que a chave mudou, entre em contato com o administrador do servidor antes de prosseguir

### Container não inicia

**Verificar logs:**
```bash
docker service logs sistema-financeiro_sistema-financeiro
```

**Possíveis problemas:**
1. **Licença inválida**: Verifique se o email está cadastrado na tabela `assinantes`
2. **Variáveis faltando**: Verifique o arquivo `.env`
3. **Rede não existe**: Crie a rede `sistema_financeiro_web`

### Erro de conexão com API de licença

**Verificar se a API está acessível:**
```bash
curl -X POST "https://app.analiscode.com/api/license/verify" \
  -H "Content-Type: application/json" \
  -d '{"email":"seu-email@exemplo.com","dominio":"app.analiscode.com"}'
```

### Traefik não está roteando

**Verificar labels do Traefik:**
```bash
docker service inspect sistema-financeiro_sistema-financeiro
```

**Verificar se o Traefik está rodando:**
```bash
docker service ls | grep traefik
```

### Certificado SSL não está sendo gerado

**Verificar logs do Traefik:**
```bash
docker service logs traefik
```

**Verificar se o domínio aponta para o IP:**
```bash
dig app.analiscode.com
# Deve retornar: 38.242.245.229
```

## 🔄 Atualizar Sistema

Para atualizar o sistema:

```bash
# 1. Transferir novos arquivos (usar script ou rsync)
# 2. Conectar na VPS
ssh root@38.242.245.229
cd /opt/sistema-financeiro

# 3. Validar variáveis e rebuild da imagem
source .env

# Validar variáveis
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "ERRO: Variáveis de ambiente não configuradas!"
  exit 1
fi

docker build \
  --no-cache \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -t sistema-financeiro:latest . 2>&1 | tee build.log

# 4. Atualizar stack
docker stack deploy -c stack.yml sistema-financeiro

# 5. Verificar atualização
docker service update --force sistema-financeiro_sistema-financeiro
```

## 📊 Monitoramento

### Ver logs em tempo real

```bash
docker service logs -f sistema-financeiro_sistema-financeiro
```

### Ver uso de recursos

```bash
docker stats $(docker ps -q --filter "name=sistema-financeiro")
```

### Verificar verificação periódica de licença

```bash
# Dentro do container
docker exec -it $(docker ps -q --filter "name=sistema-financeiro") cat /var/log/license-check.log
```

## 🔐 Segurança

1. **Nunca commite o arquivo `.env`** no Git
2. **Use chaves SSH** ao invés de senha
3. **Mantenha o Docker atualizado**
4. **Configure firewall** na VPS
5. **Monitore logs** regularmente

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do serviço
2. Verifique os logs do Traefik
3. Verifique se todas as variáveis estão configuradas
4. Verifique se a licença está ativa no Supabase

