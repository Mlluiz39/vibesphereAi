# Plano de Implementação — VibeSphere AI (Fase 2 / Beta)

- [x] 1. CRM (módulo `crm`)
  - [x] 1.1 Schema: leads, pipelines, pipeline_stages, opportunities (+ RLS)
    - _Requisitos: 1.1, 2.1, 2.4_
  - [x] 1.2 CRUD de leads com filtros e status; vínculo a contato/conversa
    - _Requisitos: 1.1, 1.2, 1.4_
  - [x] 1.3 Pipelines, estágios e oportunidades; mudança de estágio com histórico
    - _Requisitos: 2.1, 2.2, 2.3_
  - [x] 1.4 Captura automática de lead na criação de contato (engine)
    - _Requisitos: 1.3_
  - [x] 1.5 Telas de CRM no dashboard (leads + funil)
    - _Requisitos: 1, 2_

- [x] 2. Analytics (módulo `analytics`)
  - [x] 2.1 KPIs por período (mensagens, conversas, leads, oportunidades)
    - _Requisitos: 3.1, 3.3_
  - [x] 2.2 Tempo médio de primeira resposta e taxa de conversão
    - _Requisitos: 3.2_
  - [x] 2.3 Tela de dashboard de Analytics
    - _Requisitos: 3_

- [x] 3. Flow Builder (módulo `flow`)
  - [x] 3.1 Schema: flows, flow_nodes, flow_edges, flow_runs (+ RLS)
    - _Requisitos: 4.1, 4.4_
  - [x] 3.2 CRUD de flows (nós/edges) e validação do grafo
    - _Requisitos: 4.1, 4.2_
  - [x] 3.3 Motor de execução assíncrono (worker) com tipos de nó
    - _Requisitos: 4.2, 4.3, 4.4_
  - [x] 3.4 Editor visual no dashboard
    - _Requisitos: 4_

- [x] 4. Marketplace (módulo `marketplace`)
  - [x] 4.1 Catálogo de templates por categoria
    - _Requisitos: 5.1_
  - [x] 4.2 Instalação de template criando recursos no tenant (respeitando limites)
    - _Requisitos: 5.2, 5.3_
  - [x] 4.3 Tela de Marketplace no dashboard
    - _Requisitos: 5_
