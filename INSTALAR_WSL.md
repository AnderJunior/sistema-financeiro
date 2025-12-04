# 🐧 Instalar WSL (Windows Subsystem for Linux)

WSL é a melhor opção para usar `rsync` no Windows. Ele oferece um ambiente Linux completo.

## 📋 Instalação Rápida

### Opção 1: Instalação Automática (Recomendado)

Execute no PowerShell como **Administrador**:

```powershell
wsl --install
```

Isso vai:
- Instalar WSL2
- Instalar Ubuntu (distribuição padrão)
- Configurar tudo automaticamente

**Após a instalação, reinicie o computador.**

### Opção 2: Instalação Manual

Se a opção automática não funcionar:

```powershell
# 1. Habilitar recursos do Windows
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 2. Reiniciar o computador

# 3. Baixar e instalar WSL2
wsl --set-default-version 2

# 4. Instalar Ubuntu
wsl --install -d Ubuntu
```

## ✅ Verificar Instalação

Após reiniciar, abra um novo terminal e execute:

```powershell
wsl --list --verbose
```

Você deve ver algo como:
```
  NAME      STATE           VERSION
* Ubuntu    Running         2
```

## 🔧 Configurar Ubuntu

Na primeira vez que abrir o WSL, você precisará:

1. Criar um usuário (nome de usuário e senha)
2. Atualizar o sistema:

```bash
sudo apt update
sudo apt upgrade -y
```

## 📦 Instalar rsync (se não vier instalado)

```bash
sudo apt install rsync -y
```

## 🚀 Usar rsync

Agora você pode usar o script bash que criamos:

```bash
# No WSL, navegue até o diretório do projeto
cd /mnt/c/Users/playh/OneDrive/Área\ de\ Trabalho/sistema_financeiro

# Execute o script
bash deploy-vps.sh
```

## 🔄 Alternativa: Git Bash (Mais Leve)

Se preferir algo mais leve, pode instalar Git Bash:

1. Baixe o Git para Windows: https://git-scm.com/download/win
2. Durante a instalação, certifique-se de marcar "Git Bash Here"
3. Git Bash já vem com `rsync` incluído

### Usar Git Bash:

1. Clique com botão direito no diretório do projeto
2. Selecione "Git Bash Here"
3. Execute: `bash deploy-vps.sh`

## 📝 Nota

- **WSL**: Melhor para desenvolvimento, ambiente Linux completo
- **Git Bash**: Mais leve, suficiente para usar rsync

Recomendamos **WSL** se você vai fazer mais desenvolvimento ou precisa de ferramentas Linux.

