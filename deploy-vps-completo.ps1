# Script PowerShell Completo para Deploy do Sistema Financeiro na VPS
# Uso: .\deploy-vps-completo.ps1

param(
    [string]$VPS_IP = "38.242.245.229",
    [string]$VPS_USER = "root",
    [string]$VPS_PATH = "/opt/sistema-financeiro",
    [string]$DOMAIN = "app.analiscode.com"
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
    $testCmd = "echo 'Conexao OK'"
    $result = ssh -o ConnectTimeout=5 "${VPS_USER}@${VPS_IP}" $testCmd 2>&1
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
$mkdirCmd = "mkdir -p $VPS_PATH"
ssh "${VPS_USER}@${VPS_IP}" $mkdirCmd
Write-Host "✓ Diretório criado/verificado" -ForegroundColor Green
Write-Host ""

Write-Host "=== PASSO 3: Verificando/Criando arquivo .env na VPS ===" -ForegroundColor Yellow
$envCheckCmd = "test -f $VPS_PATH/.env"
$envCheckResult = ssh "${VPS_USER}@${VPS_IP}" $envCheckCmd
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Arquivo .env encontrado na VPS" -ForegroundColor Green
    Write-Host "  Verificando variáveis obrigatórias..." -ForegroundColor Cyan
    
    $grepCmd = "cd $VPS_PATH; cat .env | grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|LICENSE_EMAIL|LICENSE_DOMAIN|LICENSE_API_URL)='"
    $envVars = ssh "${VPS_USER}@${VPS_IP}" $grepCmd
    
    if ($envVars -eq "" -or $envVars -eq $null) {
        Write-Host "⚠ Algumas variáveis podem estar faltando" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ Arquivo .env NÃO encontrado na VPS!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Você precisa criar o arquivo .env na VPS com as seguintes variáveis:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  # Supabase" -ForegroundColor Cyan
    Write-Host "  NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co" -ForegroundColor White
    Write-Host "  NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui" -ForegroundColor White
    Write-Host "  SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui" -ForegroundColor White
    Write-Host ""
    Write-Host "  # Licenciamento" -ForegroundColor Cyan
    Write-Host "  LICENSE_EMAIL=seu-email@exemplo.com" -ForegroundColor White
    Write-Host "  LICENSE_DOMAIN=$DOMAIN" -ForegroundColor White
    Write-Host "  LICENSE_API_URL=https://$DOMAIN/api/license/verify" -ForegroundColor White
    Write-Host ""
    Write-Host "  Execute:" -ForegroundColor Yellow
    Write-Host "    ssh ${VPS_USER}@${VPS_IP}" -ForegroundColor White
    Write-Host "    cd ${VPS_PATH}" -ForegroundColor White
    Write-Host "    nano .env" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Pressione Enter após criar o .env na VPS, ou Ctrl+C para cancelar"
}
Write-Host ""

Write-Host "=== PASSO 4: Transferindo arquivos para VPS ===" -ForegroundColor Yellow
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
    "next-env.d.ts",
    "docker-entrypoint.sh",
    "stack.yml"
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
    "supabase",
    "scripts"
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

Write-Host "=== PASSO 5: Verificando arquivos na VPS ===" -ForegroundColor Yellow
$checkFiles = @("Dockerfile", "package.json", "docker-entrypoint.sh")
foreach ($file in $checkFiles) {
    $checkCmd = "test -f $VPS_PATH/$file"
    ssh "${VPS_USER}@${VPS_IP}" $checkCmd | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file FALTANDO" -ForegroundColor Red
    }
}

$checkDirCmd = "test -d $VPS_PATH/app"
ssh "${VPS_USER}@${VPS_IP}" $checkDirCmd | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ app/" -ForegroundColor Green
} else {
    Write-Host "  ✗ app/ FALTANDO" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== PASSO 6: Verificando/Criando rede Docker ===" -ForegroundColor Yellow
$networkCheckCmd = "docker network ls | grep -q sistema_financeiro_web"
ssh "${VPS_USER}@${VPS_IP}" $networkCheckCmd | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Rede sistema_financeiro_web já existe" -ForegroundColor Green
} else {
    Write-Host "Criando rede sistema_financeiro_web..." -ForegroundColor Yellow
    $createNetworkCmd = "docker network create --driver overlay --attachable sistema_financeiro_web"
    ssh "${VPS_USER}@${VPS_IP}" $createNetworkCmd
    Write-Host "✓ Rede criada" -ForegroundColor Green
}
Write-Host ""

Write-Host "=== PASSO 7: Validando variáveis de ambiente ===" -ForegroundColor Yellow
$validateEnvCmd = @"
cd $VPS_PATH
if [ ! -f .env ]; then
    echo "ERRO: Arquivo .env não encontrado!"
    exit 1
fi
source .env 2>/dev/null || true
if [ -z "\$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "ERRO: NEXT_PUBLIC_SUPABASE_URL não está definida no .env"
    exit 1
fi
if [ -z "\$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "ERRO: NEXT_PUBLIC_SUPABASE_ANON_KEY não está definida no .env"
    exit 1
fi
echo "✓ Variáveis de ambiente validadas"
"@

ssh "${VPS_USER}@${VPS_IP}" $validateEnvCmd
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ Erro: Variáveis de ambiente não configuradas corretamente!" -ForegroundColor Red
    Write-Host "  Verifique o arquivo .env na VPS" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Variáveis de ambiente OK" -ForegroundColor Green
Write-Host ""

Write-Host "=== PASSO 8: Fazendo build da imagem Docker ===" -ForegroundColor Yellow
Write-Host "Isso pode levar vários minutos... Seja paciente!" -ForegroundColor Cyan
Write-Host ""

# Construir comando de build em partes
$buildCmd1 = "cd $VPS_PATH"
$buildCmd2 = "source .env 2>/dev/null || true"
$buildCmd3 = "docker build --no-cache --build-arg NEXT_PUBLIC_SUPABASE_URL=`"`$NEXT_PUBLIC_SUPABASE_URL`" --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=`"`$NEXT_PUBLIC_SUPABASE_ANON_KEY`" -t sistema-financeiro:latest . 2>&1"
$fullBuildCmd = "$buildCmd1; $buildCmd2; $buildCmd3"

Write-Host "Iniciando build..." -ForegroundColor Cyan
$buildOutput = ssh "${VPS_USER}@${VPS_IP}" $fullBuildCmd 2>&1
$buildExitCode = $LASTEXITCODE

# Mostrar output do build
Write-Host $buildOutput

if ($buildExitCode -eq 0) {
    Write-Host ""
    Write-Host "✓ Build concluído com sucesso!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "✗ Erro no build!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Yellow
    Write-Host "  1. Variáveis de ambiente não configuradas corretamente" -ForegroundColor White
    Write-Host "  2. Falta de memória/disco na VPS" -ForegroundColor White
    Write-Host "  3. Erro no código fonte" -ForegroundColor White
    Write-Host "  4. Problemas de conexão durante download de dependências" -ForegroundColor White
    Write-Host ""
    Write-Host "Verifique os logs acima para mais detalhes." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

Write-Host "=== PASSO 9: Verificando imagem criada ===" -ForegroundColor Yellow
$imageCheckCmd = "docker images | grep sistema-financeiro"
ssh "${VPS_USER}@${VPS_IP}" $imageCheckCmd
Write-Host ""

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     Build Concluído com Sucesso!      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "=== PRÓXIMOS PASSOS ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Acesse a VPS:" -ForegroundColor Cyan
Write-Host "   ssh ${VPS_USER}@${VPS_IP}" -ForegroundColor White
Write-Host ""
Write-Host "2. Verifique se o arquivo .env está completo:" -ForegroundColor Cyan
Write-Host "   cd ${VPS_PATH}" -ForegroundColor White
Write-Host "   cat .env" -ForegroundColor White
Write-Host ""
Write-Host "3. Faça o deploy da stack:" -ForegroundColor Cyan
Write-Host "   cd ${VPS_PATH}" -ForegroundColor White
Write-Host "   docker stack deploy -c stack.yml sistema-financeiro" -ForegroundColor White
Write-Host ""
Write-Host "4. Verifique o status:" -ForegroundColor Cyan
Write-Host "   docker service ls" -ForegroundColor White
Write-Host "   docker service logs -f sistema-financeiro_sistema-financeiro" -ForegroundColor White
Write-Host ""
Write-Host "5. Acesse o sistema:" -ForegroundColor Cyan
Write-Host "   https://${DOMAIN}" -ForegroundColor White
Write-Host ""
Write-Host "⚠ IMPORTANTE: Certifique-se de que:" -ForegroundColor Yellow
Write-Host "   - O domínio ${DOMAIN} aponta para o IP ${VPS_IP}" -ForegroundColor White
Write-Host "   - O Traefik está configurado corretamente" -ForegroundColor White
Write-Host "   - O certificado SSL está sendo gerado automaticamente" -ForegroundColor White
Write-Host ""
