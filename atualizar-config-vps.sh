#!/bin/bash

# Script Bash para Atualizar Apenas Arquivos de Configuração na VPS
# Uso: bash atualizar-config-vps.sh
# Este script transfere apenas os arquivos de configuração atualizados

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configurações
VPS_IP="38.242.245.229"
VPS_USER="root"
VPS_PATH="/opt/sistema-financeiro"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Atualizar Configurações na VPS       ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar se está no diretório do projeto
if [ ! -f "Dockerfile" ] || [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Erro: Execute este script no diretório raiz do projeto!${NC}"
    exit 1
fi

echo -e "${YELLOW}=== PASSO 1: Verificando conexão com VPS ===${NC}"
if ssh -o ConnectTimeout=5 ${VPS_USER}@${VPS_IP} "echo 'Conexão OK'" 2>/dev/null; then
    echo -e "${GREEN}✓ Conexão com VPS estabelecida${NC}\n"
else
    echo -e "${RED}✗ Erro: Não foi possível conectar na VPS${NC}"
    echo -e "${YELLOW}  Verifique:${NC}"
    echo -e "  - IP correto: ${VPS_IP}"
    echo -e "  - Usuário correto: ${VPS_USER}"
    echo -e "  - SSH configurado"
    exit 1
fi

echo -e "${YELLOW}=== PASSO 2: Transferindo arquivos de configuração ===${NC}"
echo ""

# Lista de arquivos de configuração para transferir
configFiles=(
    "Dockerfile"
    "next.config.js"
    "docker-entrypoint.sh"
    ".dockerignore"
    "stack.yml"
)

transferred=0
failed=0

for file in "${configFiles[@]}"; do
    if [ -f "$file" ]; then
        echo -e "Transferindo ${CYAN}$file${NC}..."
        if scp "$file" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/" 2>/dev/null; then
            echo -e "  ${GREEN}✓ $file transferido${NC}"
            ((transferred++))
        else
            echo -e "  ${RED}✗ Erro ao transferir $file${NC}"
            ((failed++))
        fi
    else
        echo -e "  ${YELLOW}⚠ $file não encontrado (pulando)${NC}"
    fi
done

echo ""
if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ Todos os arquivos foram transferidos com sucesso!${NC}"
    echo -e "${CYAN}  Total: $transferred arquivo(s)${NC}"
else
    echo -e "${YELLOW}⚠ Alguns arquivos falharam ao transferir${NC}"
    echo -e "${GREEN}  Transferidos: $transferred${NC}"
    echo -e "${RED}  Falhas: $failed${NC}"
fi

echo ""
echo -e "${YELLOW}=== PASSO 3: Verificando arquivos na VPS ===${NC}"

for file in "${configFiles[@]}"; do
    if [ -f "$file" ]; then
        if ssh ${VPS_USER}@${VPS_IP} "test -f ${VPS_PATH}/${file}" 2>/dev/null; then
            echo -e "  ${GREEN}✓ $file existe na VPS${NC}"
        else
            echo -e "  ${RED}✗ $file NÃO encontrado na VPS${NC}"
        fi
    fi
done

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Arquivos Atualizados!             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}=== PRÓXIMOS PASSOS ===${NC}"
echo ""
echo -e "${CYAN}1. Conecte na VPS:${NC}"
echo -e "   ssh ${VPS_USER}@${VPS_IP}"
echo ""
echo -e "${CYAN}2. Navegue até o diretório:${NC}"
echo -e "   cd ${VPS_PATH}"
echo ""
echo -e "${CYAN}3. Valide as variáveis de ambiente:${NC}"
echo -e "   source .env"
echo -e "   echo \$NEXT_PUBLIC_SUPABASE_URL"
echo ""
echo -e "${CYAN}4. Faça o rebuild da imagem:${NC}"
echo -e "   docker build --no-cache --build-arg NEXT_PUBLIC_SUPABASE_URL=\"\${NEXT_PUBLIC_SUPABASE_URL}\" --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=\"\${NEXT_PUBLIC_SUPABASE_ANON_KEY}\" -t sistema-financeiro:latest ."
echo ""
echo -e "${CYAN}5. Atualize a stack:${NC}"
echo -e "   docker stack deploy -c stack.yml sistema-financeiro"
echo ""
echo -e "${CYAN}6. Verifique os logs:${NC}"
echo -e "   docker service logs -f sistema-financeiro_sistema-financeiro"
echo ""




