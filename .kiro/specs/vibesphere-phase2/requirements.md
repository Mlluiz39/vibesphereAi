# Requisitos — VibeSphere AI (Fase 2 / Beta)

## Introdução

A Fase 2 agrega capacidades de negócio sobre o MVP: **CRM**, **Analytics**, **Flow Builder**
(automações visuais) e **Marketplace** de templates. Mantém os princípios da Fase 1: isolamento
multi-tenant (tenant_id + RLS), módulos NestJS desacoplados e processamento assíncrono via filas.

### Escopo

- CRM: leads, pipelines, estágios e oportunidades; vínculo com contatos/conversas
- Analytics: KPIs e métricas (mensagens, conversas, conversão, leads, tempo de resposta)
- Flow Builder: automações com nós (mensagem, condição, delay, webhook, IA, etc.)
- Marketplace: instalar templates (fluxos, agentes, bases) por categoria

---

## Requisitos

### Requisito 1 — CRM: Leads

**User Story:** Como usuário do tenant, quero gerenciar leads, para acompanhar oportunidades de
negócio.

#### Acceptance Criteria

1. WHEN um usuário cria um lead THEN o sistema SHALL persistir nome, telefone, email, empresa,
   origem e status, associados ao tenant.
2. THE sistema SHALL permitir vincular um lead a um contato e/ou conversa existente.
3. WHEN um contato novo é criado pela engine THEN o sistema MAY criar/atualizar um lead
   correspondente (captura automática).
4. THE sistema SHALL permitir listar, filtrar e atualizar o status de leads.

### Requisito 2 — CRM: Pipeline e Oportunidades

**User Story:** Como gestor, quero um funil de vendas, para acompanhar negociações.

#### Acceptance Criteria

1. THE sistema SHALL permitir criar pipelines com estágios ordenados (ex.: Novo, Qualificado,
   Proposta, Negociação, Fechado, Perdido).
2. WHEN uma oportunidade é criada THEN o sistema SHALL associá-la a um lead, um pipeline e um
   estágio, com valor estimado.
3. WHEN uma oportunidade muda de estágio THEN o sistema SHALL registrar a mudança.
4. THE sistema SHALL respeitar o isolamento por tenant em todas as entidades de CRM.

### Requisito 3 — Analytics

**User Story:** Como gestor, quero indicadores, para medir a operação.

#### Acceptance Criteria

1. THE sistema SHALL expor KPIs por período: total de mensagens, conversas, leads e oportunidades.
2. THE sistema SHALL calcular tempo médio de primeira resposta e taxa de conversão do funil.
3. THE sistema SHALL escopar todas as métricas ao tenant.

### Requisito 4 — Flow Builder

**User Story:** Como usuário, quero criar automações visuais, para orquestrar atendimentos sem
código.

#### Acceptance Criteria

1. THE sistema SHALL permitir criar um flow com nós (nodes) e conexões (edges).
2. THE sistema SHALL suportar tipos de nó: mensagem, condição, delay, webhook, IA e fim.
3. WHEN um flow é ativado por um gatilho THEN o sistema SHALL executar os nós de forma assíncrona.
4. THE sistema SHALL persistir o estado de execução de cada flow.

### Requisito 5 — Marketplace

**User Story:** Como empresa, quero instalar templates prontos, para acelerar a configuração.

#### Acceptance Criteria

1. THE sistema SHALL listar templates por categoria (vendas, clínicas, imobiliárias, etc.).
2. WHEN um template é instalado THEN o sistema SHALL criar os recursos correspondentes (agente,
   fluxo e/ou base) no tenant.
3. THE sistema SHALL impedir instalação que exceda os limites do plano do tenant.
