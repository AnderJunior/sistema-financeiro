#!/bin/bash

# Script para verificar se todos os arquivos necessários estão presentes antes do build

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Verificação de Arquivos Necessários ===${NC}\n"

# Arquivos obrigatórios
FILES=(
    "Dockerfile"
    "package.json"
    "package-lock.json"
    "next.config.js"
    "tsconfig.json"
)

# Diretórios obrigatórios
DIRS=(
    "app"
    "components"
    "lib"
)

# Verificar arquivos
echo -e "${YELLOW}Verificando arquivos obrigatórios...${NC}"
MISSING_FILES=0

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file encontrado"
    else
        echo -e "${RED}✗${NC} $file NÃO encontrado"
        MISSING_FILES=1
    fi
done

# Verificar diretórios
echo -e "\n${YELLOW}Verificando diretórios obrigatórios...${NC}"
MISSING_DIRS=0

for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $dir/ encontrado"
    else
        echo -e "${RED}✗${NC} $dir/ NÃO encontrado"
        MISSING_DIRS=1
    fi
done

# Verificar arquivo .env
echo -e "\n${YELLOW}Verificando arquivo .env...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env encontrado"
    
    # Verificar variáveis obrigatórias
    source .env 2>/dev/null || true
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        echo -e "${RED}⚠${NC} NEXT_PUBLIC_SUPABASE_URL não definida no .env"
    else
        echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_URL definida"
    fi
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
        echo -e "${RED}⚠${NC} NEXT_PUBLIC_SUPABASE_ANON_KEY não definida no .env"
    else
        echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_ANON_KEY definida"
    fi
else
    echo -e "${YELLOW}⚠${NC} .env não encontrado (será necessário criar antes do build)"
fi

# Resumo
echo -e "\n${YELLOW}=== Resumo ===${NC}"

if [ $MISSING_FILES -eq 0 ] && [ $MISSING_DIRS -eq 0 ]; then
    echo -e "${GREEN}✓ Todos os arquivos e diretórios necessários estão presentes!${NC}"
    echo -e "${GREEN}Você pode prosseguir com o build.${NC}\n"
    exit 0
else
    echo -e "${RED}✗ Alguns arquivos ou diretórios estão faltando!${NC}"
    echo -e "${YELLOW}Por favor, transfira os arquivos faltantes antes de fazer o build.${NC}\n"
    exit 1
fi


