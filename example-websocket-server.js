/**
 * Servidor WebSocket para logs de execução de fluxos de automação
 * 
 * Este servidor recebe eventos de execução de workflows e os retransmite
 * para todos os clientes conectados ao mesmo workflow.
 * 
 * Uso: node example-websocket-server.js
 */

const WebSocket = require('ws');

// Configuração
const PORT = process.env.WS_PORT || 3001;
const HOST = process.env.WS_HOST || 'localhost';

// Armazenar conexões por workflow
const workflowConnections = new Map(); // workflowId -> Set<WebSocket>

// Criar servidor WebSocket
const wss = new WebSocket.Server({ 
  port: PORT,
  host: HOST,
  perMessageDeflate: false // Desabilitar compressão para melhor performance
});

console.log(`🚀 Servidor WebSocket iniciado em ws://${HOST}:${PORT}`);
console.log(`📡 Aguardando conexões...\n`);

// Função para adicionar conexão a um workflow
function addConnection(workflowId, ws) {
  if (!workflowConnections.has(workflowId)) {
    workflowConnections.set(workflowId, new Set());
  }
  workflowConnections.get(workflowId).add(ws);
  console.log(`✅ Cliente conectado ao workflow: ${workflowId} (Total: ${workflowConnections.get(workflowId).size})`);
}

// Função para remover conexão de um workflow
function removeConnection(workflowId, ws) {
  if (workflowConnections.has(workflowId)) {
    workflowConnections.get(workflowId).delete(ws);
    const count = workflowConnections.get(workflowId).size;
    console.log(`❌ Cliente desconectado do workflow: ${workflowId} (Restantes: ${count})`);
    
    // Limpar entrada se não houver mais conexões
    if (count === 0) {
      workflowConnections.delete(workflowId);
    }
  }
}

// Função para broadcast de evento para todos os clientes de um workflow
function broadcastToWorkflow(workflowId, event) {
  const connections = workflowConnections.get(workflowId);
  if (!connections || connections.size === 0) {
    return;
  }

  const message = JSON.stringify(event);
  let sentCount = 0;
  let errorCount = 0;

  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
        sentCount++;
      } catch (error) {
        console.error(`Erro ao enviar mensagem para cliente:`, error.message);
        errorCount++;
        // Remover conexão com erro
        removeConnection(workflowId, ws);
      }
    } else {
      // Remover conexão fechada
      removeConnection(workflowId, ws);
    }
  });

  if (sentCount > 0) {
    console.log(`📤 Evento "${event.type}" enviado para ${sentCount} cliente(s) do workflow ${workflowId}`);
  }
}

// Processar novas conexões
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/').filter(p => p);
  
  // Extrair workflowId da URL: /workflow/:workflowId/execution
  let workflowId = null;
  if (pathParts.length >= 2 && pathParts[0] === 'workflow' && pathParts[2] === 'execution') {
    workflowId = pathParts[1];
  } else {
    console.warn(`⚠️  URL inválida: ${req.url}. Esperado: /workflow/:workflowId/execution`);
    ws.close(1008, 'URL inválida. Use: /workflow/:workflowId/execution');
    return;
  }

  // Adicionar conexão ao workflow
  addConnection(workflowId, ws);

  // Enviar mensagem de boas-vindas
  ws.send(JSON.stringify({
    type: 'connection:established',
    workflowId,
    timestamp: new Date().toISOString(),
    message: 'Conectado ao servidor de logs de execução'
  }));

  // Processar mensagens recebidas
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Log da mensagem recebida
      console.log(`📥 Mensagem recebida do workflow ${workflowId}:`, message.type);

      // Processar diferentes tipos de mensagens
      switch (message.type) {
        case 'execution:start':
        case 'execution:stop':
        case 'execution:pause':
        case 'execution:resume':
          // Comandos de controle - apenas retransmitir para outros clientes
          // (o executor já processa localmente)
          broadcastToWorkflow(workflowId, {
            ...message,
            timestamp: new Date().toISOString()
          });
          break;

        case 'execution:started':
        case 'execution:completed':
        case 'execution:failed':
        case 'execution:paused':
        case 'node:started':
        case 'node:completed':
        case 'node:failed':
        case 'node:waiting':
        case 'edge:activated':
        case 'log:added':
          // Eventos de execução - retransmitir para todos os clientes
          broadcastToWorkflow(workflowId, {
            ...message,
            timestamp: message.timestamp || new Date().toISOString()
          });
          break;

        case 'ping':
          // Responder a ping com pong
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;

        default:
          console.warn(`⚠️  Tipo de mensagem desconhecido: ${message.type}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao processar mensagem:`, error.message);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Erro ao processar mensagem: ' + error.message,
        timestamp: new Date().toISOString()
      }));
    }
  });

  // Processar erros
  ws.on('error', (error) => {
    console.error(`❌ Erro na conexão WebSocket:`, error.message);
  });

  // Processar fechamento
  ws.on('close', (code, reason) => {
    if (workflowId) {
      removeConnection(workflowId, ws);
    }
    console.log(`🔌 Conexão fechada (código: ${code}, motivo: ${reason || 'N/A'})`);
  });

  // Enviar ping periódico para manter conexão viva
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000); // Ping a cada 30 segundos

  ws.on('close', () => {
    clearInterval(pingInterval);
  });
});

// Tratamento de erros do servidor
wss.on('error', (error) => {
  console.error(`❌ Erro no servidor WebSocket:`, error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor WebSocket...');
  
  // Fechar todas as conexões
  workflowConnections.forEach((connections, workflowId) => {
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1001, 'Servidor encerrando');
      }
    });
  });
  
  // Fechar servidor
  wss.close(() => {
    console.log('✅ Servidor WebSocket encerrado');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando servidor WebSocket...');
  wss.close(() => {
    console.log('✅ Servidor WebSocket encerrado');
    process.exit(0);
  });
});

// Log de estatísticas periódicas
setInterval(() => {
  const totalConnections = Array.from(workflowConnections.values())
    .reduce((sum, set) => sum + set.size, 0);
  const activeWorkflows = workflowConnections.size;
  
  if (totalConnections > 0 || activeWorkflows > 0) {
    console.log(`📊 Estatísticas: ${totalConnections} conexão(ões) ativa(s) em ${activeWorkflows} workflow(s)`);
  }
}, 60000); // A cada 1 minuto








