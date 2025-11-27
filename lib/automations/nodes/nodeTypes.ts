// lib/automations/nodes/nodeTypes.ts

import { nodesSpec } from './nodesSpec';
import { createNodeComponent } from './createNodeComponent';

export const nodeTypes = (() => {
  const mapping: Record<string, any> = {};

  [
    ...nodesSpec.gatilhos,
    ...nodesSpec.acoes,
    ...nodesSpec.transformacoes
  ].forEach((def) => {
    mapping[def.id] = createNodeComponent(def);
  });

  return mapping;
})();





