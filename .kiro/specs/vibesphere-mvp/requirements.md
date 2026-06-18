# Requisitos — VibeSphere AI (MVP / Fase 1)

## Introdução

A VibeSphere AI é uma plataforma SaaS multi-tenant que permite a empresas criar, configurar e
operar agentes de IA especializados para WhatsApp. Este documento cobre o escopo da **Fase 1
(MVP)** descrita no PRD: autenticação, multi-tenancy, integração WhatsApp, agentes de IA, RAG
(base de conhecimento), inbox e billing.

### Escopo do MVP

Incluído nesta fase:

- Autenticação e autorização (JWT + refresh token, RBAC com 4 perfis)
- Isolamento multi-tenant (shared schema com `tenant_id` + RLS)
- Cadastro e gestão de empresas (tenants) e usuários
- CRUD de agentes de IA com camada de abstração de provider (LLM)
- Base de conhecimento com pipeline RAG (upload → chunking → embeddings → pgvector)
- Integração WhatsApp (recebimento via webhook + envio de respostas)
- Orquestração agente ↔ conversa (mensagem entra → IA responde)
- Inbox omnichannel básico (conversas, estados, transferência IA→humano)
- Billing com planos e limites de uso (Starter/Pro/Enterprise)

Fora de escopo nesta fase (fases posteriores): CRM, Flow Builder, Marketplace, MCP, Analytics
avançado, microsserviços, SSO/SAML, schema/DB dedicado.

### Decisões de arquitetura do MVP

- **Monólito modular** em NestJS (TypeScript), com fronteiras de módulo bem definidas para
  facilitar a futura extração em microsserviços (Fase 3).
- **PostgreSQL + pgvector** como banco principal e vector store.
- **Redis + BullMQ** para filas (processamento assíncrono de mensagens e documentos).
- Isolamento multi-tenant **shared schema** com coluna `tenant_id` e Row-Level Security (RLS).

---

## Requisitos

### Requisito 1 — Autenticação

**User Story:** Como usuário de uma empresa, quero fazer login com segurança, para acessar apenas
os recursos do meu tenant.

#### Acceptance Criteria

1. WHEN um usuário envia email e senha válidos THEN o sistema SHALL retornar um access token (JWT)
   e um refresh token.
2. WHEN um usuário envia credenciais inválidas THEN o sistema SHALL retornar erro 401 sem revelar
   se o email existe.
3. WHEN um access token expira AND o refresh token é válido THEN o sistema SHALL emitir um novo
   access token.
4. WHEN um refresh token é usado para renovação THEN o sistema SHALL rotacionar o refresh token e
   invalidar o anterior.
5. WHERE uma senha é armazenada, the sistema SHALL persistir apenas o hash (bcrypt/argon2), nunca
   em texto plano.
6. WHEN um usuário faz logout THEN o sistema SHALL invalidar o refresh token correspondente.

### Requisito 2 — Autorização (RBAC)

**User Story:** Como dono da empresa, quero controlar o que cada usuário pode fazer, para proteger
operações sensíveis.

#### Acceptance Criteria

1. THE sistema SHALL suportar os perfis Super Admin, Owner, Manager e Attendant.
2. WHEN um usuário acessa um endpoint protegido THEN o sistema SHALL validar a permissão do perfil
   antes de executar a ação.
3. IF um usuário não possui permissão para uma ação THEN o sistema SHALL retornar erro 403.
4. THE perfil Super Admin SHALL ter acesso transversal a operações de plataforma, independente de
   tenant.
5. WHEN um Owner gerencia usuários do próprio tenant THEN o sistema SHALL permitir criar, editar e
   remover usuários somente dentro do seu tenant.

### Requisito 3 — Isolamento Multi-Tenant

**User Story:** Como empresa, quero que meus dados sejam isolados de outras empresas, para garantir
privacidade e segurança.

#### Acceptance Criteria

1. THE sistema SHALL associar todo registro de domínio a um `tenant_id`.
2. WHEN uma requisição autenticada consulta dados THEN o sistema SHALL retornar apenas registros do
   `tenant_id` do usuário.
3. THE sistema SHALL aplicar Row-Level Security (RLS) no PostgreSQL como defesa adicional contra
   vazamento entre tenants.
4. IF uma query tenta acessar dados de outro tenant THEN o sistema SHALL bloquear e registrar a
   tentativa em audit log.
5. WHEN um novo tenant é criado THEN o sistema SHALL provisionar o registro do tenant, o usuário
   Owner inicial e o plano contratado.

### Requisito 4 — Gestão de Empresas e Usuários

**User Story:** Como Owner, quero cadastrar minha empresa e gerenciar usuários, para organizar a
operação.

#### Acceptance Criteria

1. WHEN uma empresa se cadastra THEN o sistema SHALL criar o tenant com nome, e subdomínio único.
2. IF o subdomínio já existe THEN o sistema SHALL rejeitar o cadastro com erro de conflito.
3. WHEN um Owner ou Manager convida um usuário THEN o sistema SHALL criar o usuário com um perfil
   atribuído e enviar credenciais/convite.
4. THE sistema SHALL permitir configurar branding básico (nome, logo) por tenant.

### Requisito 5 — Agentes de IA

**User Story:** Como usuário do tenant, quero criar e configurar agentes de IA, para automatizar
atendimentos no WhatsApp.

#### Acceptance Criteria

1. WHEN um usuário cria um agente THEN o sistema SHALL persistir nome, objetivo, personalidade,
   temperatura, prompt do sistema, modelo e provider.
2. THE sistema SHALL respeitar o limite de agentes do plano contratado do tenant.
3. IF o tenant atingiu o limite de agentes do plano THEN o sistema SHALL bloquear a criação e
   informar o limite atingido.
4. THE sistema SHALL expor uma camada de abstração de provider (`LLMProvider`) com operações de
   chat, embeddings e completion.
5. WHEN um provider configurado falha THEN o sistema SHALL permitir fallback para um provider
   alternativo configurado.
6. THE sistema SHALL suportar associar uma base de conhecimento a um agente.

### Requisito 6 — Base de Conhecimento (RAG)

**User Story:** Como usuário do tenant, quero subir documentos, para que o agente responda com base
no meu conteúdo.

#### Acceptance Criteria

1. THE sistema SHALL aceitar upload de PDF, DOCX, TXT, CSV, XLSX, Markdown e URL/HTML.
2. WHEN um documento é enviado THEN o sistema SHALL enfileirar um job de processamento (chunking +
   embeddings) de forma assíncrona.
3. WHEN o processamento conclui THEN o sistema SHALL armazenar os embeddings no pgvector associados
   ao `tenant_id` e à base de conhecimento.
4. WHEN um agente responde com RAG habilitado THEN o sistema SHALL recuperar os chunks mais
   relevantes da base associada antes de gerar a resposta.
5. IF o processamento de um documento falha THEN o sistema SHALL marcar o documento com status de
   erro e permitir reprocessamento.

### Requisito 7 — Integração WhatsApp

**User Story:** Como empresa, quero conectar meu número de WhatsApp, para que clientes conversem com
os agentes.

#### Acceptance Criteria

1. THE sistema SHALL suportar pelo menos um provider de WhatsApp (Meta Cloud API) com arquitetura
   extensível para Evolution API e Baileys.
2. WHEN uma mensagem chega via webhook THEN o sistema SHALL validar a assinatura/origem e enfileirar
   a mensagem para processamento.
3. THE sistema SHALL respeitar o limite de números de WhatsApp do plano do tenant.
4. WHEN o agente gera uma resposta THEN o sistema SHALL enviá-la ao cliente pelo provider de
   WhatsApp do tenant.
5. IF o envio falha THEN o sistema SHALL aplicar retentativa com backoff e registrar a falha.

### Requisito 8 — Orquestração de Conversa (Engine)

**User Story:** Como cliente final, quero enviar uma mensagem no WhatsApp e receber uma resposta
relevante do agente, para resolver minha demanda.

#### Acceptance Criteria

1. WHEN uma mensagem de cliente é processada THEN o sistema SHALL identificar/criar o contato e a
   conversa correspondente no tenant.
2. WHEN a conversa está no estado "IA" THEN o sistema SHALL gerar a resposta via agente e provider
   de LLM configurado.
3. THE sistema SHALL persistir todas as mensagens (entrada e saída) com timestamp e direção.
4. WHEN o limite de conversas do plano é atingido THEN o sistema SHALL bloquear novas conversas
   conforme regra de billing.
5. THE sistema SHALL manter contexto/memória da conversa para o agente dentro de uma janela
   configurável.

### Requisito 9 — Inbox Omnichannel

**User Story:** Como atendente, quero visualizar e assumir conversas, para dar suporte humano quando
necessário.

#### Acceptance Criteria

1. THE sistema SHALL listar conversas do tenant com filtros por estado (IA, Humano, Aguardando,
   Finalizado).
2. WHEN um atendente assume uma conversa THEN o sistema SHALL mudar o estado para "Humano" e pausar
   as respostas automáticas da IA.
3. WHEN uma conversa é transferida THEN o sistema SHALL registrar o histórico da transferência.
4. THE sistema SHALL permitir anotações internas e etiquetas em conversas.
5. WHEN um atendente envia mensagem THEN o sistema SHALL entregá-la ao cliente pelo provider de
   WhatsApp.

### Requisito 10 — Billing e Planos

**User Story:** Como plataforma, quero cobrar e limitar o uso por plano, para sustentar o negócio.

#### Acceptance Criteria

1. THE sistema SHALL definir os planos Starter (1 WhatsApp, 3 agentes, 1.000 conversas/mês), Pro
   (5 WhatsApps, 20 agentes, 20.000 conversas/mês) e Enterprise (ilimitado).
2. WHEN um tenant assina um plano THEN o sistema SHALL registrar a subscription e aplicar os limites
   correspondentes.
3. THE sistema SHALL integrar com Stripe para assinaturas recorrentes, com arquitetura extensível
   para Mercado Pago e PIX.
4. WHEN um webhook de pagamento é recebido THEN o sistema SHALL atualizar o status financeiro do
   tenant de forma idempotente.
5. WHEN o uso de um recurso atinge o limite do plano THEN o sistema SHALL bloquear a operação e
   sinalizar a necessidade de upgrade.

### Requisito 11 — Auditoria e Segurança

**User Story:** Como plataforma, quero registrar operações sensíveis e proteger os dados, para
conformidade (LGPD) e segurança.

#### Acceptance Criteria

1. THE sistema SHALL registrar em audit log operações sensíveis (login, criação/remoção de
   usuários, mudanças de plano, acessos negados entre tenants).
2. THE sistema SHALL aplicar rate limiting nos endpoints públicos e de autenticação.
3. THE sistema SHALL transmitir dados sobre TLS e armazenar segredos/credenciais de forma
   criptografada.
4. THE sistema SHALL validar e sanitizar entradas para prevenir injeção.
5. WHERE dados pessoais são tratados, the sistema SHALL suportar exclusão/anonimização sob demanda
   (LGPD).
