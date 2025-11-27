export type AutomationNodeType =
  | 'start'
  | 'condition'
  | 'webhook'
  | 'delay'
  | 'message'
  | 'end'
  | string; // Permite novos tipos de nós dinâmicos (gatilhos, ações, transformações)

export interface AutomationNodeData {
  label: string;
  description?: string;
  url?: string;
  method?: 'GET' | 'POST';
  messageTemplate?: string;
  conditionExpression?: string;
  delaySeconds?: number;
  values?: Record<string, any>; // Valores dos parâmetros dos nós dinâmicos
  onChange?: (paramId: string, value: any) => void; // Handler para mudanças (não serializado)
  onDelete?: (nodeId: string) => void; // Handler para deletar (não serializado)
  onDuplicate?: (nodeId: string) => void; // Handler para duplicar (não serializado)
}

export interface AutomationNode {
  id: string;
  type: AutomationNodeType;
  position: { x: number; y: number };
  data: AutomationNodeData;
}

export interface AutomationEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface AutomationFlow {
  id: string;
  name: string;
  nodes: AutomationNode[];
  edges: AutomationEdge[];
  updatedAt: string;
}

// ============================================
// EXECUTION RUNTIME TYPES
// ============================================

export type NodeExecutionStatus = 'idle' | 'running' | 'success' | 'error' | 'waiting'

export interface NodeExecutionState {
  nodeId: string
  status: NodeExecutionStatus
  startedAt?: string
  completedAt?: string
  error?: string
  output?: any
}

export interface EdgeExecutionState {
  edgeId: string
  isActive: boolean
  activatedAt?: string
}

export interface ExecutionLogEntry {
  id: string
  nodeId: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  data?: any
}

export interface WorkflowExecutionState {
  executionId: string
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused'
  startedAt?: string
  completedAt?: string
  currentNodeId?: string
  nodeStates: Record<string, NodeExecutionState>
  edgeStates: Record<string, EdgeExecutionState>
  logs: ExecutionLogEntry[]
}

// ============================================
// WEBSOCKET EVENT TYPES
// ============================================

export type WorkflowEventType =
  | 'execution:started'
  | 'execution:completed'
  | 'execution:failed'
  | 'execution:paused'
  | 'node:started'
  | 'node:completed'
  | 'node:failed'
  | 'node:waiting'
  | 'edge:activated'
  | 'log:added'

export interface WorkflowEvent {
  type: WorkflowEventType
  executionId: string
  timestamp: string
  payload: any
}

export interface NodeStartedEvent extends WorkflowEvent {
  type: 'node:started'
  payload: {
    nodeId: string
  }
}

export interface NodeCompletedEvent extends WorkflowEvent {
  type: 'node:completed'
  payload: {
    nodeId: string
    output: any
  }
}

export interface NodeFailedEvent extends WorkflowEvent {
  type: 'node:failed'
  payload: {
    nodeId: string
    error: string
  }
}

export interface EdgeActivatedEvent extends WorkflowEvent {
  type: 'edge:activated'
  payload: {
    edgeId: string
    sourceNodeId: string
    targetNodeId: string
  }
}

export interface LogAddedEvent extends WorkflowEvent {
  type: 'log:added'
  payload: ExecutionLogEntry
}

