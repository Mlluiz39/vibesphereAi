# Design — VibeSphere AI (MVP / Fase 1)

## Visão Geral

O MVP é implementado como um **monólito modular** em NestJS (TypeScript). Cada domínio do PRD vira
um **módulo NestJS** com fronteiras claras (controllers, services, repositórios) para que, na Fase 3,
cada módulo possa ser extraído como microsserviço com baixo atrito. Processamento pesado (mensagens
WhatsApp, ingestão de documentos) é assíncrono via **BullMQ + Redis**. Persistência em
**PostgreSQL + pgvector**, com isolamento multi-tenant por `tenant_id` e Row-Level Security (RLS).

### Objetivos de design

- Isolamento de tenant garantido por padrão (defesa em profundidade: app + RLS).
- Trocar de provider de LLM e de WhatsApp sem alterar a lógica de negócio (Strategy/Adapter).
- Caminho de evolução para microsserviços sem reescrita (módulos desacoplados + filas).

### Mapeamento Requisitos → Componentes

| Requisito | Componente principal |
|-----------|----------------------|
| R1 Auth | `AuthModule` (JWT, refresh, guards) |
| R2 RBAC | `AuthModule` + `RolesGuard` + decorators |
| R3 Multi-tenant | `TenantModule` + `TenantContext` + RLS |
| R4 Empresas/Usuários | `TenantModule`, `UserModule` |
| R5 Agentes | `AgentModule` + `LLMProvider` layer |
| R6 RAG | `KnowledgeModule` + worker de ingestão + pgvector |
| R7 WhatsApp | `WhatsAppModule` + `WhatsAppProvider` adapters |
| R8 Engine | `ConversationModule` + worker de mensagens |
| R9 Inbox | `InboxModule` |
| R10 Billing | `BillingModule` + `PaymentProvider` (Stripe) |
| R11 Auditoria/Segurança | `AuditModule`, interceptors, rate limit, RLS |

---

## Arquitetura

```
                       ┌─────────────────────────────┐
   WhatsApp Cliente ──▶│  WhatsApp Webhook Controller │
                       └──────────────┬──────────────┘
                                      │ enqueue
                                      ▼
   Dashboard (Next.js) ─REST─▶  ┌──────────────┐      ┌──────────────────┐
                                │  API NestJS  │─────▶│ Redis + BullMQ    │
                                │ (monólito    │      │  - messages queue │
                                │  modular)    │      │  - ingestion queue│
                                └──────┬───────┘      └─────────┬─────────┘
                                       │                        │
                                       ▼                        ▼
                            ┌────────────────────┐    ┌───────────────────┐
                            │ PostgreSQL+pgvector │◀───│ Workers           │
                            │  (RLS por tenant)   │    │ - msg processor   │
                            └────────────────────┘    │ - doc ingestion   │
                                                       └─────────┬─────────┘
                                                                 ▼
                                                       ┌───────────────────┐
                                                       │ LLM Providers      │
                                                       │ OpenAI/Claude/...  │
                                                       └───────────────────┘
```

### Stack

| Camada | Tecnologia |
|--------|-----------|
| API | NestJS (TypeScript) |
| ORM | Prisma |
| Banco | PostgreSQL 16 + pgvector |
| Cache/Filas | Redis + BullMQ |
| Dashboard | Next.js (App Router) + React |
| Auth | JWT (access) + refresh token rotativo |
| Infra dev | Docker Compose |
| Monorepo | pnpm workspaces + Turborepo |

---

## Estrutura do Monorepo

```
vibesphere/
├── apps/
│   ├── api/                 # NestJS (monólito modular)
│   │   └── src/modules/{auth,tenant,user,agent,knowledge,whatsapp,conversation,inbox,billing,audit}
│   ├── worker/              # processadores BullMQ (mensagens, ingestão)
│   └── dashboard/           # Next.js
├── packages/
│   ├── database/            # schema Prisma + client + migrations + RLS
│   ├── llm/                 # LLMProvider abstraction + adapters
│   ├── shared/              # tipos, DTOs, constantes, planos
│   └── config/              # tsconfig, eslint, env schema
├── docker-compose.yml       # postgres+pgvector, redis
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Camada de Abstração de LLM

```typescript
export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }

export interface LLMProvider {
  chat(input: { model: string; messages: ChatMessage[]; temperature?: number }): Promise<{ content: string; usage: TokenUsage }>;
  embeddings(input: { model: string; input: string[] }): Promise<number[][]>;
  completion(input: { model: string; prompt: string }): Promise<string>;
}
```

- Adapters: `OpenAIProvider`, `ClaudeProvider`, `GeminiProvider`, `DeepSeekProvider`, `OpenRouterProvider`.
- `LLMProviderFactory` resolve o provider a partir da config do agente.
- `ResilientLLMProvider` decora um provider com retry + fallback para um secundário (R5.5).

## Camada de Abstração de WhatsApp

```typescript
export interface WhatsAppProvider {
  sendText(input: { to: string; text: string }): Promise<{ providerMessageId: string }>;
  verifyWebhook(req: WebhookRequest): boolean;
  parseInbound(payload: unknown): InboundMessage[];
}
```

- MVP: `MetaCloudProvider`. Extensível para `EvolutionProvider`, `BaileysProvider`.

---

## Modelo de Dados (multi-tenant shared schema)

Todas as tabelas de domínio possuem `tenant_id UUID NOT NULL` (exceto `tenants`, `plans`).

```
tenants(id, name, subdomain[unique], branding_json, status, created_at)
plans(id, code[starter|pro|enterprise], limits_json)
subscriptions(id, tenant_id, plan_id, status, stripe_subscription_id, current_period_end)
users(id, tenant_id, email, password_hash, role[super_admin|owner|manager|attendant], status)
refresh_tokens(id, user_id, token_hash, expires_at, revoked_at)

agents(id, tenant_id, name, goal, personality, temperature, system_prompt, provider, model, knowledge_base_id?)
knowledge_bases(id, tenant_id, name)
documents(id, tenant_id, knowledge_base_id, filename, type, status[pending|processing|done|error])
embeddings(id, tenant_id, document_id, chunk_text, embedding vector(1536))

whatsapp_channels(id, tenant_id, provider, phone_number, credentials_encrypted, status)
contacts(id, tenant_id, phone, name, metadata_json)
conversations(id, tenant_id, contact_id, channel_id, agent_id?, state[ai|human|waiting|closed], assigned_user_id?)
messages(id, tenant_id, conversation_id, direction[inbound|outbound], content, provider_message_id, created_at)
conversation_notes(id, tenant_id, conversation_id, user_id, body)
labels(id, tenant_id, name) / conversation_labels(conversation_id, label_id)

usage_counters(id, tenant_id, period, conversations_count, ...)
audit_logs(id, tenant_id?, actor_user_id?, action, resource, metadata_json, created_at)
```

### Índices e RLS

- Índice composto `(tenant_id, ...)` nas tabelas de alto volume (`messages`, `conversations`, `embeddings`).
- Índice vetorial `ivfflat`/`hnsw` em `embeddings.embedding`.
- RLS: política `USING (tenant_id = current_setting('app.current_tenant')::uuid)` em todas as
  tabelas de domínio. A conexão da request seta `app.current_tenant` a partir do `TenantContext`.

---

## Fluxos Principais

### Autenticação (R1, R2)

1. `POST /auth/login` valida credenciais → emite access JWT (curto) + refresh token (hash no banco).
2. Requests autenticadas passam por `JwtAuthGuard` → popula `req.user` (com `tenantId`, `role`).
3. `TenantContextInterceptor` seta `app.current_tenant` na transação do Prisma.
4. `RolesGuard` + `@Roles()` validam permissão (R2).
5. `POST /auth/refresh` rotaciona o refresh token (revoga o antigo).

### Ingestão de Documento — RAG (R6)

1. `POST /knowledge/:id/documents` salva arquivo + cria `document(status=pending)` e enfileira job.
2. Worker: extrai texto → chunking → `embeddings()` via LLMProvider → insere em `embeddings`.
3. Atualiza `document.status=done` (ou `error`, permitindo reprocessar).

### Mensagem WhatsApp → Resposta IA (R7, R8)

1. Webhook recebe payload → `verifyWebhook` → enfileira `InboundMessage` (responde 200 rápido).
2. Worker: resolve tenant pelo canal → upsert contato/conversa → persiste mensagem inbound.
3. Se `conversation.state == ai`: checa limite de billing → monta contexto (memória + RAG) →
   `LLMProvider.chat()` → persiste outbound → `WhatsAppProvider.sendText()` (retry/backoff).
4. Se `state == human`: não responde automaticamente; aparece no Inbox para o atendente.

### Billing (R10)

- `plans` define limites; `usage_counters` acumula uso por período.
- Webhook Stripe (idempotente por event id) atualiza `subscriptions`/status do tenant.
- Guards de limite (`PlanLimitGuard`) bloqueiam criação de agentes/canais e novas conversas.

---

## Tratamento de Erros

- Filtro global de exceções → resposta JSON padronizada `{ code, message, details? }`.
- Erros de autorização entre tenants (R3.4) geram `audit_log` + 403.
- Jobs com falha: retry com backoff exponencial (BullMQ); após N tentativas vão para dead-letter e
  marcam o recurso com status `error`.
- Webhooks de pagamento e de WhatsApp são **idempotentes** (dedupe por id de evento/mensagem).

## Segurança (R11)

- Senhas com argon2/bcrypt; segredos de provider criptografados (AES-256) em repouso.
- Rate limiting (`@nestjs/throttler`) em `/auth/*` e webhooks.
- Validação de DTOs com `class-validator`; sanitização de entradas.
- Audit log para operações sensíveis; suporte a exclusão/anonimização LGPD.

## Estratégia de Testes

- **Unit**: services de domínio, `LLMProvider`/`WhatsAppProvider` adapters (mockados), guards.
- **Integração**: rotas de auth, isolamento de tenant (garantir que tenant A não lê dados de B),
  pipeline de ingestão (com banco de teste), idempotência de webhooks.
- **e2e** (smoke): fluxo login → criar agente → simular mensagem → resposta.

## Evolução para Microsserviços (Fase 3)

Cada módulo já isola domínio e comunica-se por interfaces + filas. A extração consiste em: promover
o módulo a serviço próprio, substituir chamadas in-process por mensageria (RabbitMQ) e separar
schema quando necessário (Enterprise). Nada na lógica de negócio precisa ser reescrito.
