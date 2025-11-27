# 🔧 Solução Rápida - Erro "Dockerfile: no such file or directory"

## ⚠️ Problema

Ao executar o comando `docker build`, você recebeu o erro:
```
ERROR: failed to build: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
```

## ✅ Solução Rápida

### Passo 1: Verificar onde você está

Na sua VPS, execute:

```bash
pwd
```

Deve mostrar: `/opt/sistema-financeiro`

Se não estiver nesse diretório, execute:
```bash
cd /opt/sistema-financeiro
```

### Passo 2: Verificar se o Dockerfile existe

```bash
ls -la Dockerfile
```

**Se o arquivo NÃO existir**, você verá:
```
ls: cannot access 'Dockerfile': No such file or directory
```

### Passo 3: Transferir o Dockerfile

**Do seu computador local** (onde está o projeto), execute:

```bash
# Certifique-se de estar no diretório do projeto no seu computador local
cd /caminho/para/sistema_financeiro

# Transferir o Dockerfile
scp Dockerfile usuario@seu-ip-vps:/opt/sistema-financeiro/
```

**Substitua:**
- `usuario` pelo seu usuário SSH
- `seu-ip-vps` pelo IP ou domínio da sua VPS

### Passo 4: Verificar novamente

Na VPS, execute:

```bash
cd /opt/sistema-financeiro
ls -la Dockerfile
```

Agora deve mostrar informações do arquivo.

### Passo 5: Transferir TODOS os arquivos necessários

Se apenas o Dockerfile não resolveu, transfira todos os arquivos do projeto:

**Do seu computador local:**

```bash
# Usando rsync (recomendado)
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.local' \
  ./ usuario@seu-ip-vps:/opt/sistema-financeiro/
```

Ou usando scp:

```bash
scp -r \
  Dockerfile \
  package.json \
  package-lock.json \
  next.config.js \
  tsconfig.json \
  tailwind.config.ts \
  postcss.config.js \
  app \
  components \
  lib \
  hooks \
  contexts \
  types \
  public \
  supabase \
  usuario@seu-ip-vps:/opt/sistema-financeiro/
```

### Passo 6: Verificar estrutura completa

Na VPS, execute:

```bash
cd /opt/sistema-financeiro

# Verificar arquivos essenciais
ls -la | grep -E "Dockerfile|package.json|next.config.js"

# Verificar estrutura de diretórios
ls -d app/ components/ lib/ 2>/dev/null && echo "Diretórios OK" || echo "Alguns diretórios faltando"
```

### Passo 7: Tentar build novamente

```bash
cd /opt/sistema-financeiro

# Carregar variáveis do .env
source .env

# Fazer build
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT="${NEXT_PUBLIC_ASAAS_ENVIRONMENT:-production}" \
  -t sistema-financeiro:latest .
```

## 🔍 Checklist de Verificação

Antes de fazer o build, certifique-se de ter:

- [ ] Está no diretório correto: `/opt/sistema-financeiro`
- [ ] Dockerfile existe: `test -f Dockerfile && echo "OK"`
- [ ] package.json existe: `test -f package.json && echo "OK"`
- [ ] next.config.js existe: `test -f next.config.js && echo "OK"`
- [ ] Diretório `app/` existe: `test -d app && echo "OK"`
- [ ] Arquivo `.env` existe (ou será criado): `test -f .env && echo "OK"`

## 💡 Dica: Usar Script de Verificação

Você pode usar o script `verificar-arquivos.sh` para verificar automaticamente:

```bash
# Na VPS
cd /opt/sistema-financeiro
chmod +x verificar-arquivos.sh
./verificar-arquivos.sh
```

## 🚨 Se Ainda Não Funcionar

1. **Verifique permissões:**
   ```bash
   ls -la /opt/sistema-financeiro
   ```

2. **Verifique se o diretório foi criado corretamente:**
   ```bash
   mkdir -p /opt/sistema-financeiro
   cd /opt/sistema-financeiro
   ```

3. **Liste TODOS os arquivos para debug:**
   ```bash
   find . -maxdepth 1 -type f | head -20
   ```

4. **Verifique espaço em disco:**
   ```bash
   df -h /opt
   ```

## ✅ Próximos Passos

Após resolver o problema do Dockerfile:

1. Certifique-se de que o arquivo `.env` está configurado
2. Execute o build novamente
3. Verifique os logs do build para outros erros
4. Continue com o deploy da stack no Portainer

---

**Última atualização:** $(date)


