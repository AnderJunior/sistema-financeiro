# Script PowerShell para Deploy do Sistema Financeiro na VPS
# Uso: .\deploy-vps.ps1

param(
    [string]$VPS_IP = "38.242.245.229",
    [string]$VPS_USER = "root",
    [string]$VPS_PATH = "/opt/sistema-financeiro"
)

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Deploy Sistema Financeiro - Produção  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório do projeto
if (-not (Test-Path "Dockerfile") -or -not (Test-Path "package.json")) {
    Write-Host "✗ Erro: Execute este script no diretório raiz do projeto!" -ForegroundColor Red
    exit 1
}

Write-Host "=== PASSO 1: Verificando conexão com VPS ===" -ForegroundColor Yellow
try {
    $result = ssh -o ConnectTimeout=5 "${VPS_USER}@${VPS_IP}" "echo 'Conexão OK'" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Conexão com VPS estabelecida" -ForegroundColor Green
    } else {
        throw "Falha na conexão"
    }
} catch {
    Write-Host "✗ Erro: Não foi possível conectar na VPS" -ForegroundColor Red
    Write-Host "  Verifique:" -ForegroundColor Yellow
    Write-Host "  - IP correto: $VPS_IP"
    Write-Host "  - Usuário correto: $VPS_USER"
    Write-Host "  - SSH configurado"
    exit 1
}
Write-Host ""

Write-Host "=== PASSO 2: Criando diretório na VPS ===" -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_IP}" "mkdir -p ${VPS_PATH}"
Write-Host "✓ Diretório criado/verificado" -ForegroundColor Green
Write-Host ""

Write-Host "=== PASSO 3: Transferindo arquivos para VPS ===" -ForegroundColor Yellow
Write-Host "Isso pode levar alguns minutos..." -ForegroundColor Cyan
Write-Host ""

# Lista de arquivos para transferir
$filesToTransfer = @(
    "Dockerfile",
    "package.json",
    "package-lock.json",
    "next.config.js",
    "tsconfig.json",
    "tailwind.config.ts",
    "postcss.config.js",
    "middleware.ts",
    "next-env.d.ts"
)

# Transferir arquivos individuais
foreach ($file in $filesToTransfer) {
    if (Test-Path $file) {
        Write-Host "Transferindo $file..." -ForegroundColor Gray
        scp $file "${VPS_USER}@${VPS_IP}:${VPS_PATH}/"
    }
}

# Lista de diretórios para transferir
$dirsToTransfer = @(
    "app",
    "components",
    "lib",
    "hooks",
    "contexts",
    "types",
    "supabase"
)

# Transferir diretórios
foreach ($dir in $dirsToTransfer) {
    if (Test-Path $dir) {
        Write-Host "Transferindo diretório $dir/..." -ForegroundColor Gray
        scp -r $dir "${VPS_USER}@${VPS_IP}:${VPS_PATH}/"
    }
}

# Transferir diretório public se existir
if (Test-Path "public") {
    Write-Host "Transferindo diretório public/..." -ForegroundColor Gray
    scp -r public "${VPS_USER}@${VPS_IP}:${VPS_PATH}/"
}

Write-Host ""
Write-Host "✓ Arquivos transferidos" -ForegroundColor Green
Write-Host ""

Write-Host "=== PASSO 4: Verificando arquivos na VPS ===" -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_IP}" "cd ${VPS_PATH} && `"
    test -f Dockerfile && echo '✓ Dockerfile' || echo '✗ Dockerfile FALTANDO' && `"
    test -f package.json && echo '✓ package.json' || echo '✗ package.json FALTANDO' && `"
    test -d app && echo '✓ app/' || echo '✗ app/ FALTANDO'"
Write-Host ""

Write-Host "=== PASSO 5: Verificando/Criando rede Docker ===" -ForegroundColor Yellow
$networkCheck = ssh "${VPS_USER}@${VPS_IP}" "docker network ls | grep -q REDE_INTERNA && echo 'exists' || echo 'not_exists'"
if ($networkCheck -eq "exists") {
    Write-Host "✓ Rede REDE_INTERNA já existe" -ForegroundColor Green
} else {
    Write-Host "Criando rede REDE_INTERNA..." -ForegroundColor Yellow
    ssh "${VPS_USER}@${VPS_IP}" "docker network create --driver overlay --attachable REDE_INTERNA"
    Write-Host "✓ Rede criada" -ForegroundColor Green
}
Write-Host ""

Write-Host "=== PASSO 6: Verificando arquivo .env na VPS ===" -ForegroundColor Yellow
$envCheck = ssh "${VPS_USER}@${VPS_IP}" "test -f ${VPS_PATH}/.env && echo 'exists' || echo 'not_exists'"
if ($envCheck -eq "exists") {
    Write-Host "✓ Arquivo .env encontrado na VPS" -ForegroundColor Green
} else {
    Write-Host "✗ Arquivo .env NÃO encontrado na VPS!" -ForegroundColor Red
    Write-Host "  Você precisa criar o arquivo .env na VPS antes de continuar." -ForegroundColor Yellow
    Write-Host "  Execute:" -ForegroundColor Yellow
    Write-Host "    ssh ${VPS_USER}@${VPS_IP}"
    Write-Host "    cd ${VPS_PATH}"
    Write-Host "    nano .env"
    Write-Host ""
    Write-Host "  Adicione as variáveis:" -ForegroundColor Yellow
    Write-Host "    NEXT_PUBLIC_SUPABASE_URL=..."
    Write-Host "    NEXT_PUBLIC_SUPABASE_ANON_KEY=..."
    Write-Host "    SUPABASE_SERVICE_ROLE_KEY=..."
    Write-Host "    ASAAS_API_TOKEN=..."
    Write-Host "    NEXT_PUBLIC_ASAAS_ENVIRONMENT=production"
    Write-Host ""
    $continue = Read-Host "Pressione Enter após criar o .env na VPS, ou Ctrl+C para cancelar"
}
Write-Host ""

Write-Host "=== PASSO 7: Fazendo build da imagem Docker ===" -ForegroundColor Yellow
Write-Host "Isso pode levar vários minutos... Seja paciente!" -ForegroundColor Cyan
Write-Host ""

$buildCommand = @"
cd ${VPS_PATH} && ``
source .env 2>/dev/null || true && ``
docker build ``
  --build-arg NEXT_PUBLIC_SUPABASE_URL="`${NEXT_PUBLIC_SUPABASE_URL}" ``
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="`${NEXT_PUBLIC_SUPABASE_ANON_KEY}" ``
  --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT="`${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production}" ``
  -t sistema-financeiro:latest .
"@

ssh "${VPS_USER}@${VPS_IP}" $buildCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Build concluído com sucesso!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "✗ Erro no build!" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "=== PASSO 8: Verificando imagem criada ===" -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_IP}" "docker images | grep sistema-financeiro"
Write-Host ""

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     Build Concluído com Sucesso!      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Acesse o Portainer: https://seu-portainer.com"
Write-Host "2. Vá em Stacks → Add stack"
Write-Host "3. Nome: sistema-financeiro"
Write-Host "4. Cole o conteúdo do arquivo stack.yml (ou use o GUIA_DEPLOY_VPS.md)"
Write-Host "5. Configure as variáveis de ambiente"
Write-Host "6. Deploy a stack"
Write-Host ""
Write-Host "Consulte o arquivo GUIA_DEPLOY_VPS.md para instruções detalhadas" -ForegroundColor Cyan
Write-Host ""




