# Script PowerShell para Atualizar Apenas Arquivos de Configuração na VPS
# Uso: .\atualizar-config-vps.ps1
# Este script transfere apenas os arquivos de configuração atualizados

param(
    [string]$VPS_IP = "38.242.245.229",
    [string]$VPS_USER = "root",
    [string]$VPS_PATH = "/opt/sistema-financeiro"
)

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Atualizar Configurações na VPS       ║" -ForegroundColor Cyan
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

Write-Host "=== PASSO 2: Transferindo arquivos de configuração ===" -ForegroundColor Yellow
Write-Host ""

# Lista de arquivos de configuração para transferir
$configFiles = @(
    "Dockerfile",
    "next.config.js",
    "docker-entrypoint.sh",
    ".dockerignore",
    "stack.yml"
)

$transferred = 0
$failed = 0

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "Transferindo $file..." -ForegroundColor Gray
        try {
            scp $file "${VPS_USER}@${VPS_IP}:${VPS_PATH}/" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ $file transferido" -ForegroundColor Green
                $transferred++
            } else {
                Write-Host "  ✗ Erro ao transferir $file" -ForegroundColor Red
                $failed++
            }
        } catch {
            Write-Host "  ✗ Erro ao transferir $file: $_" -ForegroundColor Red
            $failed++
        }
    } else {
        Write-Host "  ⚠ $file não encontrado (pulando)" -ForegroundColor Yellow
    }
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "✓ Todos os arquivos foram transferidos com sucesso!" -ForegroundColor Green
    Write-Host "  Total: $transferred arquivo(s)" -ForegroundColor Cyan
} else {
    Write-Host "⚠ Alguns arquivos falharam ao transferir" -ForegroundColor Yellow
    Write-Host "  Transferidos: $transferred" -ForegroundColor Green
    Write-Host "  Falhas: $failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== PASSO 3: Verificando arquivos na VPS ===" -ForegroundColor Yellow

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        $checkCmd = "test -f $VPS_PATH/$file"
        ssh "${VPS_USER}@${VPS_IP}" $checkCmd | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ $file existe na VPS" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $file NÃO encontrado na VPS" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     Arquivos Atualizados!             ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "=== PRÓXIMOS PASSOS ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Conecte na VPS:" -ForegroundColor Cyan
Write-Host "   ssh ${VPS_USER}@${VPS_IP}" -ForegroundColor White
Write-Host ""
Write-Host "2. Navegue até o diretório:" -ForegroundColor Cyan
Write-Host "   cd ${VPS_PATH}" -ForegroundColor White
Write-Host ""
Write-Host "3. Valide as variáveis de ambiente:" -ForegroundColor Cyan
Write-Host "   source .env" -ForegroundColor White
Write-Host "   echo `$NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor White
Write-Host ""
Write-Host "4. Faça o rebuild da imagem:" -ForegroundColor Cyan
Write-Host "   docker build --no-cache --build-arg NEXT_PUBLIC_SUPABASE_URL=`"`$NEXT_PUBLIC_SUPABASE_URL`" --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=`"`$NEXT_PUBLIC_SUPABASE_ANON_KEY`" -t sistema-financeiro:latest ." -ForegroundColor White
Write-Host ""
Write-Host "5. Atualize a stack:" -ForegroundColor Cyan
Write-Host "   docker stack deploy -c stack.yml sistema-financeiro" -ForegroundColor White
Write-Host ""
Write-Host "6. Verifique os logs:" -ForegroundColor Cyan
Write-Host "   docker service logs -f sistema-financeiro_sistema-financeiro" -ForegroundColor White
Write-Host ""




