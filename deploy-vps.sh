#!/bin/bash

# Script Bash para Deploy do Sistema Financeiro na VPS
# Uso: bash deploy-vps.sh
# Requer: rsync instalado (vem com WSL ou Git Bash)

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configurações
VPS_IP="38.242.245.229"
VPS_USER="root"
VPS_PATH="/opt/sistema-financeiro"
DOMAIN="app.analiscode.com"

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Deploy Sistema Financeiro - Produção  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar se está no diretório do projeto
if [ ! -f "Dockerfile" ] || [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Erro: Execute este script no diretório raiz do projeto!${NC}"
    exit 1
fi

# Verificar se rsync está instalado
if ! command -v rsync &> /dev/null; then
    echo -e "${RED}✗ Erro: rsync não está instalado!${NC}"
    echo -e "${YELLOW}  Instale com: sudo apt install rsync${NC}"
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

echo -e "${YELLOW}=== PASSO 2: Criando diretório na VPS ===${NC}"
ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${VPS_PATH}"
echo -e "${GREEN}✓ Diretório criado/verificado${NC}\n"

echo -e "${YELLOW}=== PASSO 3: Verificando/Criando arquivo .env na VPS ===${NC}"
if ssh ${VPS_USER}@${VPS_IP} "test -f ${VPS_PATH}/.env" 2>/dev/null; then
    echo -e "${GREEN}✓ Arquivo .env encontrado na VPS${NC}"
    echo -e "${CYAN}  Verificando variáveis obrigatórias...${NC}"
    
    envVars=$(ssh ${VPS_USER}@${VPS_IP} "cd ${VPS_PATH} && cat .env | grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|LICENSE_EMAIL|LICENSE_DOMAIN|LICENSE_API_URL)=' || echo 'missing'")
    
    if [[ "$envVars" == *"missing"* ]]; then
        echo -e "${YELLOW}⚠ Algumas variáveis podem estar faltando${NC}"
    fi
else
    echo -e "${RED}✗ Arquivo .env NÃO encontrado na VPS!${NC}"
    echo ""
    echo -e "${YELLOW}  Você precisa criar o arquivo .env na VPS com as seguintes variáveis:${NC}"
    echo ""
    echo -e "${CYAN}  # Supabase${NC}"
    echo -e "  NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co"
    echo -e "  NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui"
    echo -e "  SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui"
    echo ""
    echo -e "${CYAN}  # Licenciamento${NC}"
    echo -e "  LICENSE_EMAIL=seu-email@exemplo.com"
    echo -e "  LICENSE_DOMAIN=${DOMAIN}"
    echo -e "  LICENSE_API_URL=https://${DOMAIN}/api/license/verify"
    echo ""
    echo -e "${YELLOW}  Execute:${NC}"
    echo -e "    ssh ${VPS_USER}@${VPS_IP}"
    echo -e "    cd ${VPS_PATH}"
    echo -e "    nano .env"
    echo ""
    read -p "Pressione Enter após criar o .env na VPS, ou Ctrl+C para cancelar..."
fi
echo ""

echo -e "${YELLOW}=== PASSO 4: Transferindo arquivos para VPS com rsync ===${NC}"
echo -e "${BLUE}Isso pode levar alguns minutos...${NC}\n"

# Usar rsync para transferir arquivos (muito mais eficiente)
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  --exclude 'Thumbs.db' \
  ./ ${VPS_USER}@${VPS_IP}:${VPS_PATH}/

echo ""
echo -e "${GREEN}✓ Arquivos transferidos${NC}\n"

echo -e "${YELLOW}=== PASSO 5: Verificando arquivos na VPS ===${NC}"
files=("Dockerfile" "package.json" "docker-entrypoint.sh")
for file in "${files[@]}"; do
    if ssh ${VPS_USER}@${VPS_IP} "test -f ${VPS_PATH}/${file}" 2>/dev/null; then
        echo -e "  ${GREEN}✓ ${file}${NC}"
    else
        echo -e "  ${RED}✗ ${file} FALTANDO${NC}"
    fi
done

if ssh ${VPS_USER}@${VPS_IP} "test -d ${VPS_PATH}/app" 2>/dev/null; then
    echo -e "  ${GREEN}✓ app/${NC}"
else
    echo -e "  ${RED}✗ app/ FALTANDO${NC}"
fi
echo ""

echo -e "${YELLOW}=== PASSO 6: Verificando/Criando rede Docker ===${NC}"
if ssh ${VPS_USER}@${VPS_IP} "docker network ls | grep -q sistema_financeiro_web" 2>/dev/null; then
    echo -e "${GREEN}✓ Rede sistema_financeiro_web já existe${NC}\n"
else
    echo -e "${YELLOW}Criando rede sistema_financeiro_web...${NC}"
    ssh ${VPS_USER}@${VPS_IP} "docker network create --driver overlay --attachable sistema_financeiro_web"
    echo -e "${GREEN}✓ Rede criada${NC}\n"
fi

echo -e "${YELLOW}=== PASSO 7: Validando variáveis de ambiente ===${NC}"
ssh ${VPS_USER}@${VPS_IP} "cd ${VPS_PATH} && \
  if [ ! -f .env ]; then
    echo 'ERRO: Arquivo .env não encontrado!'
    exit 1
  fi && \
  source .env 2>/dev/null || true && \
  if [ -z \"\${NEXT_PUBLIC_SUPABASE_URL}\" ]; then
    echo 'ERRO: NEXT_PUBLIC_SUPABASE_URL não está definida no .env'
    exit 1
  fi && \
  if [ -z \"\${NEXT_PUBLIC_SUPABASE_ANON_KEY}\" ]; then
    echo 'ERRO: NEXT_PUBLIC_SUPABASE_ANON_KEY não está definida no .env'
    exit 1
  fi && \
  echo '✓ Variáveis de ambiente validadas'"

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}✗ Erro: Variáveis de ambiente não configuradas corretamente!${NC}"
    echo -e "${YELLOW}  Verifique o arquivo .env na VPS${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Variáveis de ambiente OK${NC}\n"

echo -e "${YELLOW}=== PASSO 8: Fazendo build da imagem Docker ===${NC}"
echo -e "${BLUE}Isso pode levar vários minutos... Seja paciente!${NC}\n"

# Build da imagem
echo -e "${CYAN}Iniciando build...${NC}"
ssh ${VPS_USER}@${VPS_IP} "cd ${VPS_PATH} && \
  source .env 2>/dev/null || true && \
  docker build --no-cache \
    --build-arg NEXT_PUBLIC_SUPABASE_URL=\"\${NEXT_PUBLIC_SUPABASE_URL}\" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=\"\${NEXT_PUBLIC_SUPABASE_ANON_KEY}\" \
    -t sistema-financeiro:latest . 2>&1"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Build concluído com sucesso!${NC}\n"
else
    echo ""
    echo -e "${RED}✗ Erro no build!${NC}"
    echo ""
    echo -e "${YELLOW}Possíveis causas:${NC}"
    echo -e "  1. Variáveis de ambiente não configuradas corretamente"
    echo -e "  2. Falta de memória/disco na VPS"
    echo -e "  3. Erro no código fonte"
    echo -e "  4. Problemas de conexão durante download de dependências"
    echo ""
    echo -e "${YELLOW}Verifique os logs acima para mais detalhes.${NC}"
    exit 1
fi

echo -e "${YELLOW}=== PASSO 9: Verificando imagem criada ===${NC}"
ssh ${VPS_USER}@${VPS_IP} "docker images | grep sistema-financeiro"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Build Concluído com Sucesso!      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}=== PRÓXIMOS PASSOS ===${NC}"
echo ""
echo -e "${CYAN}1. Acesse a VPS:${NC}"
echo -e "   ssh ${VPS_USER}@${VPS_IP}"
echo ""
echo -e "${CYAN}2. Verifique se o arquivo .env está completo:${NC}"
echo -e "   cd ${VPS_PATH}"
echo -e "   cat .env"
echo ""
echo -e "${CYAN}3. Faça o deploy da stack:${NC}"
echo -e "   cd ${VPS_PATH}"
echo -e "   docker stack deploy -c stack.yml sistema-financeiro"
echo ""
echo -e "${CYAN}4. Verifique o status:${NC}"
echo -e "   docker service ls"
echo -e "   docker service logs -f sistema-financeiro_sistema-financeiro"
echo ""
echo -e "${CYAN}5. Acesse o sistema:${NC}"
echo -e "   https://${DOMAIN}"
echo ""
echo -e "${YELLOW}⚠ IMPORTANTE: Certifique-se de que:${NC}"
echo -e "   - O domínio ${DOMAIN} aponta para o IP ${VPS_IP}"
echo -e "   - O Traefik está configurado corretamente"
echo -e "   - O certificado SSL está sendo gerado automaticamente"
echo ""

