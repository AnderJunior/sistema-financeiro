# Servidor WebSocket para Logs de Fluxos

Este servidor WebSocket permite visualizar em tempo real os logs de execução dos fluxos de automação.

## Como Usar

### Iniciar o Servidor

Você pode iniciar o servidor de duas formas:

#### Opção 1: Usando o script batch (Windows)
```bash
iniciar-websocket-server.bat
```

#### Opção 2: Usando o script PowerShell
```powershell
.\iniciar-websocket-server.ps1
```

#### Opção 3: Executar diretamente com Node.js
```bash
node example-websocket-server.js
```

### Configuração

O servidor usa as seguintes configurações padrão:
- **Porta**: 3001
- **Host**: localhost
- **URL**: `ws://localhost:3001`

Você pode alterar essas configurações usando variáveis de ambiente:
```bash
# Windows PowerShell
$env:WS_PORT=3002
$env:WS_HOST="0.0.0.0"
node example-websocket-server.js

# Linux/Mac
WS_PORT=3002 WS_HOST=0.0.0.0 node example-websocket-server.js
```

## Como Funciona

O servidor WebSocket:

1. **Aceita conexões** de clientes em URLs no formato:
   ```
   ws://localhost:3001/workflow/:workflowId/execution
   ```

2. **Recebe eventos** de execução dos workflows, como:
   - `execution:started` - Início da execução
   - `execution:completed` - Execução concluída
   - `execution:failed` - Execução falhou
   - `node:started` - Nó iniciado
   - `node:completed` - Nó concluído
   - `node:failed` - Nó falhou
   - `edge:activated` - Edge ativada
   - `log:added` - Log adicionado

3. **Retransmite eventos** para todos os clientes conectados ao mesmo workflow

4. **Gerencia conexões** automaticamente, removendo conexões fechadas

## Integração com o Sistema

O servidor é usado pelo hook `useWorkflowExecution` que está em `hooks/useWorkflowExecution.ts`. 

Quando o servidor está rodando, os componentes que usam esse hook podem:
- Visualizar logs em tempo real
- Ver o estado de execução dos nós
- Acompanhar o progresso das execuções

## Logs e Monitoramento

O servidor exibe logs no console mostrando:
- Conexões estabelecidas
- Mensagens recebidas e enviadas
- Erros e desconexões
- Estatísticas periódicas (a cada 1 minuto)

## Encerrar o Servidor

Para encerrar o servidor, pressione `Ctrl+C` no terminal onde ele está rodando.

O servidor fará um encerramento gracioso:
- Fechará todas as conexões ativas
- Limpará recursos
- Encerrará o processo

## Solução de Problemas

### Porta já em uso
Se a porta 3001 já estiver em uso, você pode:
1. Alterar a porta usando a variável de ambiente `WS_PORT`
2. Encerrar o processo que está usando a porta

### Cliente não conecta
Verifique:
1. Se o servidor está rodando
2. Se a URL do WebSocket está correta
3. Se não há firewall bloqueando a conexão

### Eventos não aparecem
Certifique-se de que:
1. O cliente está enviando eventos para o servidor
2. O workflowId está correto na URL
3. O formato dos eventos está correto (JSON válido)

## Estrutura dos Eventos

Todos os eventos devem seguir este formato:

```json
{
  "type": "evento:tipo",
  "executionId": "exec-1234567890",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "payload": {
    // Dados específicos do evento
  }
}
```

## Exemplo de Uso Programático

```javascript
const ws = new WebSocket('ws://localhost:3001/workflow/meu-workflow/execution');

ws.onopen = () => {
  console.log('Conectado ao servidor WebSocket');
  
  // Enviar evento de início
  ws.send(JSON.stringify({
    type: 'execution:started',
    executionId: 'exec-123',
    timestamp: new Date().toISOString(),
    payload: {}
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Evento recebido:', data);
};

ws.onerror = (error) => {
  console.error('Erro no WebSocket:', error);
};

ws.onclose = () => {
  console.log('Conexão fechada');
};
```








