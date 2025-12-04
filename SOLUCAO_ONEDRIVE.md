# Solução para Erro EBUSY no Logout (OneDrive)

## Problema
O erro `EBUSY: resource busy or locked` ocorre quando o OneDrive tenta sincronizar arquivos da pasta `.next` enquanto o Next.js está tentando acessá-los durante o logout.

## Soluções Implementadas

### 1. Arquivo `.onedriveignore`
Foi criado um arquivo `.onedriveignore` na raiz do projeto para excluir pastas de build e cache da sincronização do OneDrive.

### 2. Tratamento de Erro no Logout
O código de logout agora captura e trata especificamente erros EBUSY, permitindo que o logout seja concluído mesmo se houver conflito com o OneDrive.

## Configuração Manual do OneDrive (Recomendado)

Se o problema persistir, você pode configurar o OneDrive para não sincronizar a pasta `.next`:

### Opção 1: Excluir pasta específica
1. Clique com o botão direito no ícone do OneDrive na bandeja do sistema
2. Selecione "Configurações" > "Conta"
3. Clique em "Escolher pastas"
4. Desmarque a pasta `.next` dentro do seu projeto

### Opção 2: Mover projeto para fora do OneDrive (Recomendado)
A melhor solução é mover o projeto para uma pasta fora do OneDrive, como:
- `C:\Projetos\sistema_financeiro`
- `C:\Dev\sistema_financeiro`
- `D:\Projetos\sistema_financeiro`

Isso evita completamente conflitos de sincronização durante o desenvolvimento.

### Opção 3: Pausar sincronização durante desenvolvimento
Você pode pausar temporariamente a sincronização do OneDrive enquanto desenvolve:
1. Clique com o botão direito no ícone do OneDrive
2. Selecione "Pausar sincronização" > "2 horas" (ou o tempo necessário)

## Nota
O erro EBUSY não impede o funcionamento do sistema - o logout é concluído mesmo com o erro. As alterações implementadas garantem que o usuário seja redirecionado corretamente mesmo se o erro ocorrer.

