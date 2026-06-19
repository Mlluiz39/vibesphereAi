/**
 * Catálogo de templates do Marketplace (estático em código) — Requisito 5.1.
 * Cada template descreve os recursos a criar no tenant: agente, base e/ou flow.
 */

export interface TemplateAgent {
  name: string;
  goal?: string;
  personality?: string;
  systemPrompt: string;
  model?: string;
}

export interface TemplateFlow {
  name: string;
  nodes: { key: string; type: string; config?: Record<string, unknown> }[];
  edges: { from: string; to: string; label?: string }[];
}

export interface MarketplaceTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  agent?: TemplateAgent;
  knowledgeBaseName?: string;
  flow?: TemplateFlow;
}

export const TEMPLATES: MarketplaceTemplate[] = [
  {
    id: 'sales-sdr',
    category: 'Vendas',
    title: 'SDR de Vendas',
    description: 'Agente que qualifica leads e agenda reuniões.',
    agent: {
      name: 'SDR',
      goal: 'Qualificar leads e agendar reuniões',
      personality: 'Proativo, cordial e objetivo',
      systemPrompt:
        'Você é um SDR. Qualifique o lead com perguntas curtas (orçamento, necessidade, prazo) e proponha uma reunião.',
    },
    knowledgeBaseName: 'Base de Vendas',
  },
  {
    id: 'clinic-scheduling',
    category: 'Clínicas',
    title: 'Atendimento de Clínica',
    description: 'Agente para triagem e agendamento de consultas.',
    agent: {
      name: 'Recepção Clínica',
      goal: 'Triagem e agendamento de consultas',
      personality: 'Empático e acolhedor',
      systemPrompt:
        'Você é a recepção de uma clínica. Faça triagem inicial, informe horários e ajude no agendamento. Não dê diagnósticos médicos.',
    },
  },
  {
    id: 'realestate-qualifier',
    category: 'Imobiliárias',
    title: 'Corretor Virtual',
    description: 'Agente que qualifica interesse em imóveis.',
    agent: {
      name: 'Corretor Virtual',
      goal: 'Entender preferências e indicar imóveis',
      personality: 'Consultivo',
      systemPrompt:
        'Você é um corretor virtual. Pergunte tipo de imóvel, região, orçamento e finalidade, e sugira próximos passos.',
    },
    flow: {
      name: 'Boas-vindas Imobiliária',
      nodes: [
        { key: 'start', type: 'start' },
        { key: 'welcome', type: 'message', config: { text: 'Olá! Procura imóvel para comprar ou alugar?' } },
        { key: 'end', type: 'end' },
      ],
      edges: [
        { from: 'start', to: 'welcome' },
        { from: 'welcome', to: 'end' },
      ],
    },
  },
  {
    id: 'support-faq',
    category: 'Suporte',
    title: 'Suporte com FAQ',
    description: 'Agente de suporte que responde a partir da base de conhecimento.',
    agent: {
      name: 'Suporte',
      goal: 'Resolver dúvidas com base na documentação',
      personality: 'Paciente e claro',
      systemPrompt:
        'Você é o suporte. Responda com base no contexto fornecido. Se não souber, oriente a falar com um atendente.',
    },
    knowledgeBaseName: 'Base de Suporte',
  },
];

export function findTemplate(id: string): MarketplaceTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
