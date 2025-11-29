#!/bin/bash

# Script para build e deploy do Sistema Financeiro
# Uso: ./build-and-deploy.sh [versao]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variáveis
VERSION=${1:-latest}
IMAGE_NAME="sistema-financeiro"
STACK_NAME="sistema-financeiro"

echo -e "${GREEN}=== Build e Deploy do Sistema Financeiro ===${NC}\n"

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo -e "${RED}Erro: Arquivo .env não encontrado!${NC}"
    echo "Crie um arquivo .env baseado no env.example"
    exit 1
fi

# Carregar variáveis do .env
source .env

# Verificar variáveis obrigatórias
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}Erro: Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias!${NC}"
    exit 1
fi

echo -e "${YELLOW}1. Fazendo build da imagem Docker...${NC}"
docker build \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -t ${IMAGE_NAME}:${VERSION} \
    -t ${IMAGE_NAME}:latest \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build concluído com sucesso!${NC}\n"
else
    echo -e "${RED}✗ Erro no build!${NC}"
    exit 1
fi

# Verificar se está em um ambiente Docker Swarm
if docker info | grep -q "Swarm: active"; then
    echo -e "${YELLOW}2. Docker Swarm detectado. Fazendo deploy da stack...${NC}"
    
    # Verificar se a rede existe
    if ! docker network ls | grep -q "REDE_INTERNA"; then
        echo -e "${YELLOW}Criando rede REDE_INTERNA...${NC}"
        docker network create --driver overlay --attachable REDE_INTERNA
    fi
    
    # Deploy da stack
    docker stack deploy -c stack.yml ${STACK_NAME}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Stack deployada com sucesso!${NC}\n"
        echo -e "${YELLOW}3. Verificando status do serviço...${NC}"
        sleep 5
        docker service ls | grep ${STACK_NAME}
        echo -e "\n${GREEN}Para ver os logs: docker service logs -f ${STACK_NAME}_sistema-financeiro${NC}"
    else
        echo -e "${RED}✗ Erro no deploy da stack!${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}2. Docker Swarm não detectado.${NC}"
    echo -e "${YELLOW}   Para fazer deploy no Portainer:${NC}"
    echo -e "   1. Acesse o Portainer"
    echo -e "   2. Vá em Stacks > Add stack"
    echo -e "   3. Cole o conteúdo do arquivo stack.yml"
    echo -e "   4. Configure as variáveis de ambiente"
    echo -e "   5. Deploy a stack"
fi

echo -e "\n${GREEN}=== Concluído! ===${NC}"
