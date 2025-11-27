// lib/automations/nodes/nodesSpec.ts

import { NodesSpec } from './types';

export const nodesSpec: NodesSpec = {
  gatilhos: [
    {
      id: 'gatilhoManual',
      label: 'Gatilho Manual',
      category: 'gatilho',
      color: '#3B82F6',
      icon: 'Zap',
      inputs: [],
      outputs: [{ id: 'next', label: 'Início' }],
      params: [],
      description: 'Inicia o fluxo apenas quando acionado manualmente.'
    },
    {
      id: 'gatilhoNovaCobranca',
      label: 'Nova Cobrança',
      category: 'gatilho',
      color: '#3B82F6',
      icon: 'DollarSign',
      inputs: [],
      outputs: [{ id: 'next', label: 'Nova cobrança' }],
      params: [],
      description: 'Fluxo inicia quando uma cobrança é criada.'
    },
    {
      id: 'gatilhoNovoCliente',
      label: 'Novo Cliente',
      category: 'gatilho',
      color: '#3B82F6',
      icon: 'User',
      inputs: [],
      outputs: [{ id: 'next', label: 'Novo cliente' }],
      params: [],
      description: 'Dispara quando um novo cliente entra no sistema.'
    },
    {
      id: 'gatilhoNovoProjeto',
      label: 'Novo Projeto',
      category: 'gatilho',
      color: '#3B82F6',
      icon: 'Folder',
      inputs: [],
      outputs: [{ id: 'next', label: 'Novo projeto' }],
      params: [],
      description: 'Dispara ao criar um novo projeto.'
    },
    {
      id: 'gatilhoDataAgenda',
      label: 'Agendado por Data',
      category: 'gatilho',
      color: '#3B82F6',
      icon: 'Calendar',
      inputs: [],
      outputs: [{ id: 'next', label: 'Executar' }],
      params: [
        { id: 'date', label: 'Data específica', type: 'date' },
        { id: 'dayOfMonth', label: 'Dia do mês', type: 'number' },
        { id: 'time', label: 'Horário', type: 'string' }
      ],
      description:
        'Executa o fluxo em uma data definida ou todo mês no mesmo dia.'
    },
    {
      id: 'gatilhoMudancaStatusCobranca',
      label: 'Status da Cobrança Alterado',
      category: 'gatilho',
      color: '#3B82F6',
      icon: 'RefreshCw',
      inputs: [],
      outputs: [{ id: 'next', label: 'Status alterado' }],
      params: [
        {
          id: 'statusNovo',
          label: 'Novo status',
          type: 'select',
          options: ['pago', 'pendente', 'atrasado', 'cancelado']
        }
      ],
      description: 'Dispara ao detectar mudança de status em uma cobrança.'
    },
    {
      id: 'gatilhoVencimentoProximo',
      label: 'Vencimento Próximo',
      category: 'gatilho',
      color: '#3B82F6',
      icon: 'Hourglass',
      inputs: [],
      outputs: [{ id: 'next', label: 'Executar' }],
      params: [
        {
          id: 'diasAntes',
          label: 'Dias antes',
          type: 'number',
          required: true
        }
      ],
      description: 'Executa X dias antes do vencimento.'
    },
    {
      id: 'gatilhoVolumeFinanceiro',
      label: 'Volume Financeiro',
      category: 'gatilho',
      color: '#3B82F6',
      icon: 'TrendingUp',
      inputs: [],
      outputs: [{ id: 'next', label: 'Executar' }],
      params: [
        {
          id: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: ['entrada', 'saida', 'saldo'],
          required: true
        },
        {
          id: 'operador',
          label: 'Operador',
          type: 'select',
          options: ['>', '<', '='],
          required: true
        },
        {
          id: 'valor',
          label: 'Valor',
          type: 'number',
          required: true
        }
      ],
      description:
        'Dispara quando o volume financeiro atingir uma condição estabelecida.'
    },
    {
      id: 'gatilhoWebhookEntrada',
      label: 'Webhook (Entrada)',
      category: 'gatilho',
      color: '#3B82F6',
      icon: 'Globe',
      inputs: [],
      outputs: [{ id: 'next', label: 'Evento externo' }],
      params: [
        { id: 'secret', label: 'Segredo opcional', type: 'string' }
      ],
      description: 'Recebe eventos externos via requisição HTTP (POST, por exemplo).'
    }
  ],

  acoes: [
    {
      id: 'acaoCondicional',
      label: 'Condicional (IF)',
      category: 'acao',
      color: '#10B981',
      icon: 'GitBranch',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [
        { id: 'true', label: 'Verdadeiro' },
        { id: 'false', label: 'Falso' }
      ],
      params: [
        { id: 'campo', label: 'Campo', type: 'string' },
        {
          id: 'operador',
          label: 'Operador',
          type: 'select',
          options: ['=', '>', '<', '!=']
        },
        { id: 'valor', label: 'Valor', type: 'string' }
      ],
      description: 'Executa caminhos diferentes dependendo da condição.'
    },
    {
      id: 'acaoSwitch',
      label: 'Switch (Multi-condição)',
      category: 'acao',
      color: '#10B981',
      icon: 'Route',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [
        { id: 'c1', label: 'Caso 1' },
        { id: 'c2', label: 'Caso 2' },
        { id: 'default', label: 'Padrão' }
      ],
      params: [
        {
          id: 'campo',
          label: 'Campo',
          type: 'string',
          required: true
        },
        {
          id: 'casos',
          label: 'Casos (JSON)',
          type: 'json'
        }
      ],
      description:
        'Divide o fluxo em múltiplos caminhos com base no valor de um campo.'
    },
    {
      id: 'acaoLoop',
      label: 'Loop (Para cada item)',
      category: 'acao',
      color: '#10B981',
      icon: 'Repeat',
      inputs: [{ id: 'in', label: 'Lista' }],
      outputs: [
        { id: 'item', label: 'Item' },
        { id: 'end', label: 'Fim' }
      ],
      params: [
        {
          id: 'listaCampo',
          label: 'Campo da lista',
          type: 'string'
        }
      ],
      description: 'Itera sobre cada item de uma lista.'
    },
    {
      id: 'acaoCriarCobranca',
      label: 'Criar Cobrança',
      category: 'acao',
      color: '#10B981',
      icon: 'DollarSign',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [{ id: 'next', label: 'Criado' }],
      params: [
        {
          id: 'clienteId',
          label: 'ID do Cliente',
          type: 'string',
          required: true
        },
        {
          id: 'valor',
          label: 'Valor',
          type: 'number',
          required: true
        },
        {
          id: 'descricao',
          label: 'Descrição',
          type: 'string'
        },
        {
          id: 'vencimento',
          label: 'Data de vencimento',
          type: 'date'
        }
      ],
      description: 'Cria uma nova cobrança no sistema.'
    },
    {
      id: 'acaoCriarProjeto',
      label: 'Criar Projeto',
      category: 'acao',
      color: '#10B981',
      icon: 'FolderOpen',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [{ id: 'next', label: 'Criado' }],
      params: [
        {
          id: 'clienteId',
          label: 'ID do Cliente',
          type: 'string',
          required: true
        },
        {
          id: 'servicoId',
          label: 'ID do Serviço',
          type: 'string',
          required: true
        },
        {
          id: 'valor',
          label: 'Valor',
          type: 'number',
          required: true
        },
        {
          id: 'dataVencimento',
          label: 'Data de Vencimento',
          type: 'date',
          required: true
        },
        {
          id: 'descricao',
          label: 'Descrição',
          type: 'string',
          required: false
        },
        {
          id: 'statusServico',
          label: 'Status do Serviço',
          type: 'select',
          options: ['pendente', 'em_andamento', 'finalizado'],
          required: true
        }
      ],
      description: 'Adiciona um serviço/projeto ao cliente criando um lançamento financeiro vinculado.'
    },
    {
      id: 'acaoCriarEntrada',
      label: 'Criar Entrada Financeira',
      category: 'acao',
      color: '#10B981',
      icon: 'Plus',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [{ id: 'next', label: 'Criada' }],
      params: [
        {
          id: 'valor',
          label: 'Valor',
          type: 'number',
          required: true
        },
        {
          id: 'descricao',
          label: 'Descrição',
          type: 'string'
        }
      ],
      description: 'Cria uma entrada financeira (receita).'
    },
    {
      id: 'acaoCriarSaida',
      label: 'Criar Saída Financeira',
      category: 'acao',
      color: '#10B981',
      icon: 'Minus',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [{ id: 'next', label: 'Criada' }],
      params: [
        {
          id: 'valor',
          label: 'Valor',
          type: 'number',
          required: true
        },
        {
          id: 'descricao',
          label: 'Descrição',
          type: 'string'
        }
      ],
      description: 'Cria uma saída financeira (despesa).'
    },
    {
      id: 'acaoAtualizarRegistro',
      label: 'Atualizar Registro',
      category: 'acao',
      color: '#10B981',
      icon: 'Edit',
      inputs: [{ id: 'in', label: 'Registro' }],
      outputs: [{ id: 'next', label: 'Atualizado' }],
      params: [
        {
          id: 'tipo',
          label: 'Tipo',
          type: 'select',
          options: ['cliente', 'cobranca', 'projeto', 'financeiro']
        },
        {
          id: 'dados',
          label: 'Dados (JSON)',
          type: 'json'
        }
      ],
      description: 'Atualiza qualquer registro do sistema com os dados informados.'
    },
    {
      id: 'acaoNotificacaoInterna',
      label: 'Notificação Interna',
      category: 'acao',
      color: '#10B981',
      icon: 'Bell',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [{ id: 'next', label: 'Enviado' }],
      params: [
        {
          id: 'usuarioId',
          label: 'Usuário interno',
          type: 'string'
        },
        {
          id: 'mensagem',
          label: 'Mensagem',
          type: 'string'
        }
      ],
      description: 'Envia notificação interna para usuários do sistema.'
    },
    {
      id: 'acaoDelay',
      label: 'Delay (Esperar)',
      category: 'acao',
      color: '#10B981',
      icon: 'Hourglass',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [{ id: 'next', label: 'Após o tempo' }],
      params: [
        {
          id: 'tempo',
          label: 'Tempo em segundos',
          type: 'number'
        }
      ],
      description: 'Aguarda um tempo antes de continuar o fluxo.'
    },
    {
      id: 'acaoHTTPRequest',
      label: 'Requisição HTTP',
      category: 'acao',
      color: '#10B981',
      icon: 'Globe',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [{ id: 'next', label: 'Resposta' }],
      params: [
        {
          id: 'metodo',
          label: 'Método',
          type: 'select',
          options: ['GET', 'POST', 'PUT', 'DELETE']
        },
        {
          id: 'url',
          label: 'URL',
          type: 'string',
          required: true
        },
        {
          id: 'headers',
          label: 'Headers (JSON)',
          type: 'json'
        },
        {
          id: 'body',
          label: 'Body (JSON)',
          type: 'json'
        }
      ],
      description: 'Chama APIs externas via HTTP.'
    },
    {
      id: 'acaoTag',
      label: 'Gerenciar Tags',
      category: 'acao',
      color: '#10B981',
      icon: 'Tag',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [{ id: 'next', label: 'OK' }],
      params: [
        {
          id: 'tipo',
          label: 'Ação',
          type: 'select',
          options: ['adicionar', 'remover']
        },
        {
          id: 'tag',
          label: 'Tag',
          type: 'string'
        }
      ],
      description: 'Adiciona ou remove tags de registros.'
    },
  ],

  transformacoes: [
    {
      id: 'transformCodigo',
      label: 'Código (JS/Python)',
      category: 'transformacao',
      color: '#8B5CF6',
      icon: 'Code',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [{ id: 'next', label: 'Resultado' }],
      params: [
        {
          id: 'linguagem',
          label: 'Linguagem',
          type: 'select',
          options: ['javascript', 'python']
        },
        {
          id: 'codigo',
          label: 'Código',
          type: 'code'
        }
      ],
      description: 'Executa código personalizado em JavaScript ou Python.'
    },
    {
      id: 'transformEditarCampos',
      label: 'Editar Campos',
      category: 'transformacao',
      color: '#8B5CF6',
      icon: 'Edit',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [{ id: 'next', label: 'Editado' }],
      params: [
        {
          id: 'modificacoes',
          label: 'Modificações (JSON)',
          type: 'json'
        }
      ],
      description:
        'Edita ou adiciona campos ao objeto recebido, conforme JSON de modificações.'
    },
    {
      id: 'transformFiltro',
      label: 'Filtro',
      category: 'transformacao',
      color: '#8B5CF6',
      icon: 'Search',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [
        { id: 'passed', label: 'Aprovado' },
        { id: 'rejected', label: 'Rejeitado' }
      ],
      params: [
        { id: 'campo', label: 'Campo', type: 'string' },
        {
          id: 'operador',
          label: 'Operador',
          type: 'select',
          options: ['=', '>', '<', '!=']
        },
        { id: 'valor', label: 'Valor', type: 'string' }
      ],
      description: 'Filtra dados conforme a condição configurada.'
    },
    {
      id: 'transformMapper',
      label: 'Mapeamento de Campos',
      category: 'transformacao',
      color: '#8B5CF6',
      icon: 'Puzzle',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [{ id: 'next', label: 'Mapeado' }],
      params: [
        {
          id: 'mapeamento',
          label: 'Mapeamento (JSON)',
          type: 'json'
        }
      ],
      description: 'Transforma campos de um formato para outro via mapeamento JSON.'
    },
    {
      id: 'transformGroupBy',
      label: 'Group By',
      category: 'transformacao',
      color: '#8B5CF6',
      icon: 'Book',
      inputs: [{ id: 'in', label: 'Lista' }],
      outputs: [{ id: 'next', label: 'Grupos' }],
      params: [
        {
          id: 'campo',
          label: 'Agrupar por',
          type: 'string'
        }
      ],
      description: 'Agrupa itens de uma lista com base em um campo.'
    },
    {
      id: 'transformSort',
      label: 'Ordenação',
      category: 'transformacao',
      color: '#8B5CF6',
      icon: 'ArrowUpDown',
      inputs: [{ id: 'in', label: 'Lista' }],
      outputs: [{ id: 'next', label: 'Ordenado' }],
      params: [
        {
          id: 'campo',
          label: 'Campo',
          type: 'string'
        },
        {
          id: 'ordem',
          label: 'Ordem',
          type: 'select',
          options: ['asc', 'desc']
        }
      ],
      description: 'Ordena uma lista pelo campo desejado.'
    },
    {
      id: 'transformMath',
      label: 'Cálculo (Math)',
      category: 'transformacao',
      color: '#8B5CF6',
      icon: 'Calculator',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [{ id: 'next', label: 'Resultado' }],
      params: [
        {
          id: 'expressao',
          label: 'Expressão',
          type: 'string'
        }
      ],
      description:
        'Executa cálculos matemáticos com base em uma expressão definida (ex: valor * 0.1).'
    },
    {
      id: 'transformDateHelper',
      label: 'Datas (Helper)',
      category: 'transformacao',
      color: '#8B5CF6',
      icon: 'Calendar',
      inputs: [{ id: 'in', label: 'Entrada' }],
      outputs: [{ id: 'next', label: 'Resultado' }],
      params: [
        {
          id: 'operacao',
          label: 'Operação',
          type: 'select',
          options: ['add', 'subtract', 'diff', 'format']
        },
        {
          id: 'valor',
          label: 'Valor',
          type: 'string'
        }
      ],
      description: 'Manipula datas e horários (somar, subtrair, formatar etc.).'
    },
  ]
};

