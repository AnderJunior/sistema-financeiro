// lib/automations/nodes/registry.ts

import { nodesSpec } from './nodesSpec';
import { NodeDefinition, NodeCategory } from './types';

const allNodes: NodeDefinition[] = [
  ...nodesSpec.gatilhos,
  ...nodesSpec.acoes,
  ...nodesSpec.transformacoes
];

export function getAllNodes(): NodeDefinition[] {
  return allNodes;
}

export function getNodeById(id: string): NodeDefinition | undefined {
  return allNodes.find((n) => n.id === id);
}

export function getNodesByCategory(
  category: NodeCategory
): NodeDefinition[] {
  return allNodes.filter((n) => n.category === category);
}

export function getSidebarGroups() {
  return [
    {
      id: 'gatilhos',
      label: 'Gatilhos',
      nodes: nodesSpec.gatilhos
    },
    {
      id: 'acoes',
      label: 'Ações',
      nodes: nodesSpec.acoes
    },
    {
      id: 'transformacoes',
      label: 'Transformações',
      nodes: nodesSpec.transformacoes
    }
  ];
}










