# 🔧 Comandos Úteis - Gerenciamento do Sistema

## 📦 Build e Deploy

### Build da Imagem
```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="sua_url" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="sua_chave" \
  --build-arg NEXT_PUBLIC_ASAAS_ENVIRONMENT="production" \
  -t sistema-financeiro:latest .
```

### Build com Versão Específica
```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="sua_url" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="sua_chave" \
  -t sistema-financeiro:v1.0.0 \
  -t sistema-financeiro:latest .
```

### Deploy da Stack (via CLI)
```bash
docker stack deploy -c stack.yml sistema-financeiro
```

### Atualizar Stack
```bash
# Após fazer build de nova imagem
docker stack deploy -c stack.yml sistema-financeiro
```

---

## 📊 Monitoramento

### Ver Status dos Serviços
```bash
docker service ls
docker service ls | grep sistema-financeiro
```

### Ver Detalhes do Serviço
```bash
docker service ps sistema-financeiro_sistema-financeiro
```

### Ver Logs em Tempo Real
```bash
docker service logs -f sistema-financeiro_sistema-financeiro
```

### Ver Últimas 100 Linhas de Logs
```bash
docker service logs --tail 100 sistema-financeiro_sistema-financeiro
```

### Ver Logs com Timestamp
```bash
docker service logs -f --timestamps sistema-financeiro_sistema-financeiro
```

---

## 🔄 Gerenciamento

### Escalar Serviço (Aumentar Réplicas)
```bash
# Edite o stack.yml e altere replicas: 1 para replicas: 3
docker stack deploy -c stack.yml sistema-financeiro

# Ou via comando direto
docker service scale sistema-financeiro_sistema-financeiro=3
```

### Reiniciar Serviço
```bash
docker service update --force sistema-financeiro_sistema-financeiro
```

### Parar Serviço
```bash
docker service scale sistema-financeiro_sistema-financeiro=0
```

### Remover Stack
```bash
docker stack rm sistema-financeiro
```

---

## 🌐 Rede

### Listar Redes
```bash
docker network ls
```

### Ver Detalhes da Rede
```bash
docker network inspect REDE_INTERNA
```

### Criar Rede (se não existir)
```bash
docker network create --driver overlay --attachable REDE_INTERNA
```

### Remover Rede
```bash
docker network rm REDE_INTERNA
```

---

## 🐳 Imagens Docker

### Listar Imagens
```bash
docker images | grep sistema-financeiro
```

### Remover Imagem
```bash
docker rmi sistema-financeiro:latest
```

### Remover Imagens Não Utilizadas
```bash
docker image prune -a
```

### Ver Tamanho das Imagens
```bash
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

---

## 🔍 Troubleshooting

### Verificar se Container Está Rodando
```bash
docker ps | grep sistema-financeiro
```

### Entrar no Container (Debug)
```bash
docker exec -it $(docker ps -q -f name=sistema-financeiro) sh
```

### Verificar Variáveis de Ambiente no Container
```bash
docker exec $(docker ps -q -f name=sistema-financeiro) env | grep -E "SUPABASE|ASAAS|NEXT"
```

### Testar Conectividade Interna
```bash
docker exec $(docker ps -q -f name=sistema-financeiro) wget -O- http://localhost:3000
```

### Ver Uso de Recursos
```bash
docker stats $(docker ps -q -f name=sistema-financeiro)
```

---

## 🔐 Segurança

### Criar Docker Secrets
```bash
# Criar secret para chave do Supabase
echo "sua_chave_service_role" | docker secret create supabase_service_role_key -

# Criar secret para token do Asaas
echo "seu_token_asaas" | docker secret create asaas_api_token -

# Listar secrets
docker secret ls
```

### Remover Secrets
```bash
docker secret rm supabase_service_role_key
docker secret rm asaas_api_token
```

---

## 📝 Logs do Traefik

### Ver Logs do Traefik
```bash
docker service logs -f traefik_traefik
```

### Ver Logs do Traefik com Filtro
```bash
docker service logs traefik_traefik | grep sistema-financeiro
```

---

## 🧹 Limpeza

### Limpar Sistema Docker
```bash
# Remover containers parados
docker container prune

# Remover volumes não utilizados
docker volume prune

# Remover tudo (cuidado!)
docker system prune -a --volumes
```

### Limpar Logs Antigos
```bash
# Limpar logs do Docker (requer configuração de log rotation)
# Configure em /etc/docker/daemon.json:
# {
#   "log-driver": "json-file",
#   "log-opts": {
#     "max-size": "10m",
#     "max-file": "3"
#   }
# }
```

---

## 📦 Backup

### Exportar Imagem
```bash
docker save sistema-financeiro:latest | gzip > sistema-financeiro-backup.tar.gz
```

### Importar Imagem
```bash
gunzip -c sistema-financeiro-backup.tar.gz | docker load
```

---

## 🚀 Deploy Rápido (Script)

### Usar Script de Deploy
```bash
# Dar permissão de execução
chmod +x build-and-deploy.sh

# Executar
./build-and-deploy.sh

# Com versão específica
./build-and-deploy.sh v1.0.0
```

---

## 📋 Checklist de Verificação

### Após Deploy, Verificar:

```bash
# 1. Serviço está rodando?
docker service ls | grep sistema-financeiro

# 2. Logs sem erros?
docker service logs --tail 50 sistema-financeiro_sistema-financeiro

# 3. Container está saudável?
docker service ps sistema-financeiro_sistema-financeiro

# 4. Rede está conectada?
docker network inspect REDE_INTERNA | grep sistema-financeiro

# 5. Porta está respondendo?
curl -I http://localhost:3000
```

---

## 💡 Dicas

1. **Sempre faça backup** antes de atualizar
2. **Teste em staging** antes de produção
3. **Monitore os logs** após cada deploy
4. **Use tags de versão** para facilitar rollback
5. **Documente mudanças** em cada versão

---

## 📞 Comandos de Emergência

### Parar Tudo Rapidamente
```bash
docker service scale sistema-financeiro_sistema-financeiro=0
```

### Rollback Rápido
```bash
# 1. Parar serviço atual
docker service scale sistema-financeiro_sistema-financeiro=0

# 2. Alterar imagem no stack.yml para versão anterior
# 3. Deploy novamente
docker stack deploy -c stack.yml sistema-financeiro
```

### Verificar Saúde Completa
```bash
echo "=== Serviços ===" && \
docker service ls && \
echo -e "\n=== Logs Recentes ===" && \
docker service logs --tail 20 sistema-financeiro_sistema-financeiro && \
echo -e "\n=== Recursos ===" && \
docker stats --no-stream $(docker ps -q -f name=sistema-financeiro)
```


