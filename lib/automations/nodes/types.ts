// lib/automations/nodes/types.ts

export type NodeCategory = 'gatilho' | 'acao' | 'transformacao';

export type NodeParamType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'json'
  | 'code'
  | 'date';

export interface NodeInput {
  id: string;
  label: string;
}

export interface NodeOutput {
  id: string;
  label: string;
}

export interface NodeParam {
  id: string;
  label: string;
  type: NodeParamType;
  options?: string[];
  required?: boolean;
  default?: any;
}

export interface NodeDefinition {
  id: string;
  label: string;
  category: NodeCategory;
  color: string;
  icon: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  params: NodeParam[];
  description: string;
}

export interface NodesSpec {
  gatilhos: NodeDefinition[];
  acoes: NodeDefinition[];
  transformacoes: NodeDefinition[];
}
















