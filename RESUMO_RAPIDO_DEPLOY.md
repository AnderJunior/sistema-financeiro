# 🚀 Resumo Rápido - Deploy no Portainer

## Checklist Pré-Deploy

- [ ] VPS com Docker Swarm ativo
- [ ] Portainer instalado e acessível
- [ ] Traefik configurado com Let's Encrypt
- [ ] Rede `REDE_INTERNA` criada no Swarm
- [ ] Domínio apontando para a VPS
- [ ] Variáveis de ambiente do Supabase e Asaas em mãos

---

## Passos Rápidos

### 1️⃣ Preparar Imagem Docker

**IMPORTANTE:** Antes de fazer o build, certifique-se de que o `Dockerfile` está presente no diretório!

**Opção A: Build na VPS**

```bash
# Na VPS
cd /opt/sistema-financeiro

# VERIFICAR se o Dockerfile existe (IMPORTANTE!)
ls -la Dockerfile
# Se não existir, transfira do seu computador local:
# scp Dockerfile usuario@seu-ip-vps:/opt/sistema-financeiro/

# Carregar variáveis do .env
source .env

# Build da imagem
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT="${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production}" \
  -t sistema-financeiro:latest .
```

**Se der erro "Dockerfile not found":**
- Verifique se está no diretório correto: `pwd` (deve ser `/opt/sistema-financeiro`)
- Verifique se o arquivo existe: `ls -la Dockerfile`
- Se não existir, transfira do seu computador: `scp Dockerfile usuario@ip:/opt/sistema-financeiro/`
- Veja `SOLUCAO_ERRO_DOCKERFILE.md` para mais detalhes

**Opção B: Build local e push para registry**
```bash
# Local
docker build -t seu-registry.com/sistema-financeiro:latest .
docker push seu-registry.com/sistema-financeiro:latest

# Na VPS
docker pull seu-registry.com/sistema-financeiro:latest
docker tag seu-registry.com/sistema-financeiro:latest sistema-financeiro:latest
```

### 2️⃣ Criar/Verificar Rede

```bash
docker network create --driver overlay --attachable REDE_INTERNA
```

### 3️⃣ Configurar Stack no Portainer

1. Acesse Portainer → **Stacks** → **Add stack**
2. Nome: `sistema-financeiro`
3. Cole o conteúdo do arquivo `stack.yml`
4. **IMPORTANTE**: Altere o domínio na linha:
   ```yaml
   - traefik.http.routers.sistema-financeiro.rule=Host(`seu-dominio.com.br`)
   ```
5. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ASAAS_API_TOKEN` (opcional)
   - `NEXT_PUBLIC_ASAAS_ENVIRONMENT` (opcional)

### 4️⃣ Deploy

1. Clique em **"Deploy the stack"**
2. Aguarde o serviço iniciar
3. Verifique os logs em **Stacks** → **sistema-financeiro** → **Logs**

### 5️⃣ Verificar

```bash
# Ver status do serviço
docker service ls | grep sistema-financeiro

# Ver logs
docker service logs -f sistema-financeiro_sistema-financeiro
```

### 6️⃣ Acessar

Abra no navegador: `https://seu-dominio.com.br`

---

## ⚠️ Problemas Comuns

| Problema | Solução |
|----------|---------|
| **Dockerfile not found** | Verifique diretório (`pwd`), transfira Dockerfile: `scp Dockerfile usuario@ip:/opt/sistema-financeiro/` |
| Erro 502 | Verifique se o serviço está rodando e se a porta está correta (3000) |
| SSL não funciona | Verifique DNS e certresolver do Traefik |
| Variáveis não funcionam | Verifique se estão configuradas corretamente no Portainer |
| Rede não encontrada | Crie a rede: `docker network create --driver overlay REDE_INTERNA` |

---

## 📝 Arquivos Importantes

- `stack.yml` - Configuração da stack Docker Swarm
- `Dockerfile` - Build da imagem
- `.env` - Variáveis de ambiente (não commitar!)
- `GUIA_INSTALACAO_PORTAINER.md` - Guia completo detalhado

---

## 🔄 Atualizar Sistema

1. Faça build de nova imagem: `docker build -t sistema-financeiro:v1.1 .`
2. No Portainer, edite a stack
3. Altere `image: sistema-financeiro:latest` para `image: sistema-financeiro:v1.1`
4. Clique em **"Update the stack"**

