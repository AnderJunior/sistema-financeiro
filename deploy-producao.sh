#!/bin/bash

# Script de Deploy Automatizado para Produção
# Uso: ./deploy-producao.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
VPS_USER="root"
VPS_IP="38.242.245.229"
VPS_PATH="/opt/sistema-financeiro"
IMAGE_NAME="sistema-financeiro:latest"
STACK_NAME="sistema-financeiro"
NETWORK_NAME="REDE_INTERNA"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Deploy Sistema Financeiro - Produção  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

# Verificar se está no diretório do projeto
if [ ! -f "Dockerfile" ] || [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Erro: Execute este script no diretório raiz do projeto!${NC}"
    exit 1
fi

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ Arquivo .env não encontrado localmente.${NC}"
    echo -e "${YELLOW}  Certifique-se de criar o .env na VPS antes do build.${NC}\n"
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

echo -e "${YELLOW}=== PASSO 2: Criando diretório na VPS ===${NC}"
ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${VPS_PATH}"
echo -e "${GREEN}✓ Diretório criado/verificado${NC}\n"

echo -e "${YELLOW}=== PASSO 3: Transferindo arquivos para VPS ===${NC}"
echo -e "${BLUE}Isso pode levar alguns minutos...${NC}\n"

# Transferir arquivos essenciais
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '*.log' \
  ./ ${VPS_USER}@${VPS_IP}:${VPS_PATH}/

echo -e "\n${GREEN}✓ Arquivos transferidos${NC}\n"

echo -e "${YELLOW}=== PASSO 4: Verificando arquivos na VPS ===${NC}"
ssh ${VPS_USER}@${VPS_IP} "cd ${VPS_PATH} && \
  test -f Dockerfile && echo '✓ Dockerfile' || echo '✗ Dockerfile FALTANDO' && \
  test -f package.json && echo '✓ package.json' || echo '✗ package.json FALTANDO' && \
  test -d app && echo '✓ app/' || echo '✗ app/ FALTANDO'"

echo ""

echo -e "${YELLOW}=== PASSO 5: Verificando/Criando rede Docker ===${NC}"
if ssh ${VPS_USER}@${VPS_IP} "docker network ls | grep -q ${NETWORK_NAME}"; then
    echo -e "${GREEN}✓ Rede ${NETWORK_NAME} já existe${NC}\n"
else
    echo -e "${YELLOW}Criando rede ${NETWORK_NAME}...${NC}"
    ssh ${VPS_USER}@${VPS_IP} "docker network create --driver overlay --attachable ${NETWORK_NAME}"
    echo -e "${GREEN}✓ Rede criada${NC}\n"
fi

echo -e "${YELLOW}=== PASSO 6: Verificando arquivo .env na VPS ===${NC}"
if ssh ${VPS_USER}@${VPS_IP} "test -f ${VPS_PATH}/.env"; then
    echo -e "${GREEN}✓ Arquivo .env encontrado na VPS${NC}\n"
else
    echo -e "${RED}✗ Arquivo .env NÃO encontrado na VPS!${NC}"
    echo -e "${YELLOW}  Você precisa criar o arquivo .env na VPS antes de continuar.${NC}"
    echo -e "${YELLOW}  Execute:${NC}"
    echo -e "  ssh ${VPS_USER}@${VPS_IP}"
    echo -e "  cd ${VPS_PATH}"
    echo -e "  nano .env"
    echo -e "\n${YELLOW}  Adicione as variáveis:${NC}"
    echo -e "  NEXT_PUBLIC_SUPABASE_URL=..."
    echo -e "  NEXT_PUBLIC_SUPABASE_ANON_KEY=..."
    echo -e "  SUPABASE_SERVICE_ROLE_KEY=..."
    echo -e "  ASAAS_API_TOKEN=..."
    echo -e "  NEXT_PUBLIC_ASAAS_ENVIRONMENT=production"
    echo ""
    read -p "Pressione Enter após criar o .env na VPS, ou Ctrl+C para cancelar..."
fi

echo -e "${YELLOW}=== PASSO 7: Fazendo build da imagem Docker ===${NC}"
echo -e "${BLUE}Isso pode levar vários minutos...${NC}\n"

ssh ${VPS_USER}@${VPS_IP} "cd ${VPS_PATH} && \
  source .env 2>/dev/null || true && \
  docker build \
    --build-arg NEXT_PUBLIC_SUPABASE_URL=\"\${NEXT_PUBLIC_SUPABASE_URL}\" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=\"\${NEXT_PUBLIC_SUPABASE_ANON_KEY}\" \
    --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT=\"\${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production}\" \
    -t ${IMAGE_NAME} ."

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Build concluído com sucesso!${NC}\n"
else
    echo -e "\n${RED}✗ Erro no build!${NC}"
    exit 1
fi

echo -e "${YELLOW}=== PASSO 8: Verificando imagem criada ===${NC}"
ssh ${VPS_USER}@${VPS_IP} "docker images | grep sistema-financeiro"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Build Concluído com Sucesso!      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}\n"

echo -e "${YELLOW}Próximos passos:${NC}"
echo -e "1. Acesse o Portainer: https://seu-portainer.com"
echo -e "2. Vá em Stacks → Add stack"
echo -e "3. Nome: ${STACK_NAME}"
echo -e "4. Cole o conteúdo do arquivo stack.yml"
echo -e "5. Configure as variáveis de ambiente"
echo -e "6. Deploy a stack"
echo ""
echo -e "${BLUE}Ou use o arquivo DEPLOY_PRODUCAO.md para instruções detalhadas${NC}\n"


