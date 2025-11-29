# 🚀 Guia Rápido de Deploy

## ⚡ Início Rápido

### **Método Mais Rápido (Recomendado)**

1. **Execute o script automatizado:**
   ```bash
   chmod +x deploy-producao.sh
   ./deploy-producao.sh
   ```

2. **Configure a stack no Portainer** (veja `DEPLOY_PRODUCAO.md` passo 8)

3. **Pronto!** 🎉

---

## 📚 Documentação Completa

- **`DEPLOY_PRODUCAO.md`** - Guia completo passo a passo
- **`GUIA_INSTALACAO_PORTAINER.md`** - Guia detalhado com troubleshooting
- **`stack.yml`** - Arquivo de configuração da stack Docker Swarm
- **`SOLUCAO_ERRO_DOCKERFILE.md`** - Solução para erros comuns

---

## 🔧 Informações da VPS

- **IP:** `38.242.245.229`
- **Usuário:** `root`
- **Domínio:** `analiscode.com`
- **Diretório:** `/opt/sistema-financeiro`

---

## ✅ Checklist Rápido

- [ ] Arquivos transferidos para VPS
- [ ] Arquivo `.env` criado na VPS
- [ ] Imagem Docker buildada
- [ ] Rede `REDE_INTERNA` criada
- [ ] Stack configurada no Portainer
- [ ] Variáveis de ambiente configuradas
- [ ] Stack deployada
- [ ] Sistema acessível em `https://analiscode.com`

---

## 🆘 Precisa de Ajuda?

1. Veja `DEPLOY_PRODUCAO.md` para guia completo
2. Veja `SOLUCAO_ERRO_DOCKERFILE.md` para problemas comuns
3. Verifique logs: `docker service logs -f sistema-financeiro_sistema-financeiro`




