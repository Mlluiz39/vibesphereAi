# VibeSphere AI

Plataforma **SaaS multi-tenant** para criar, configurar e operar **agentes de IA** especializados para WhatsApp. Cada empresa (tenant) possui ambiente isolado, agentes próprios, base de conhecimento, contatos, integrações e número de WhatsApp.

> Status: **MVP / Fase 1** em desenvolvimento. Veja a spec em [`.kiro/specs/vibesphere-mvp`](.kiro/specs/vibesphere-mvp).

---

## Sumário

- [Visão geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Stack](#stack)
- [Estrutura do monorepo](#estrutura-do-monorepo)
- [Pré-requisitos](#pré-requisitos)
- [Setup local](#setup-local)
- [Scripts úteis](#scripts-úteis)
- [Multi-tenancy e segurança](#multi-tenancy-e-segurança)
- [Spec do projeto](#spec-do-projeto)
- [Roadmap](#roadmap)

---

## Visão geral

A VibeSphere permite que a empresa conecte seu WhatsApp e, em poucos minutos, tenha agentes (SDR, Comercial, Suporte, Financeiro, Pós-venda) operando 24/7, com base de conhecimento própria (RAG), inbox omnichannel e billing por plano.

O **MVP (Fase 1)** cobre:

- Autenticação (JWT + refresh token rotativo) e RBAC (Super Admin, Owner, Manager, Attendant)
- Isolamento multi-tenant (shared schema com `tenant_id` + Row-Level Security)
- Gestão de empresas e usuários
- Agentes de IA com camada de abstração de provider (LLM)
- Base de conhecimento com pipeline RAG (upload → chunking → embeddings → pgvector)
- Integração WhatsApp (webhook + envio)
- Engine de orquestração de conversa (mensagem → IA → resposta)
- Inbox omnichannel
- Billing com planos e limites de uso

---

## Arquitetura

O MVP é um **monólito modular** em NestJS, com fronteiras de módulo bem definidas para facilitar a futura extração em microsserviços (Fase 3). Processamento pesado (mensagens e ingestão de documentos) roda de forma assíncrona via filas.

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
                            │ PostgreSQL+pgvector │◀───│ Workers            │
                            │  (RLS por tenant)   │    │ (mensagens/ingest) │
                            └────────────────────┘    └─────────┬─────────┘
                                                                ▼
                                                       ┌───────────────────┐
                                                       │ LLM Providers      │
                                                       │ OpenAI/Claude/...  │
                                                       └───────────────────┘
```

---

## Stack

| Camada      | Tecnologia                         |
| ----------- | ---------------------------------- |
| API         | NestJS (TypeScript)                |
| ORM         | Prisma                             |
| Banco       | PostgreSQL 16 + pgvector           |
| Cache/Filas | Redis + BullMQ                     |
| Dashboard   | Next.js (App Router) + React       |
| Auth        | JWT (access) + refresh rotativo    |
| Infra (dev) | Docker Compose                     |
| Monorepo    | pnpm workspaces + Turborepo        |

---

## Estrutura do monorepo

```
vibesphere/
├── apps/
│   ├── api/            # NestJS (monólito modular): auth, tenant, user, audit
│   ├── worker/         # Processadores BullMQ (mensagens, ingestão de documentos)
│   └── dashboard/      # Next.js (painel administrativo)
├── packages/
│   ├── database/       # Schema Prisma + client + RLS + seed
│   ├── llm/            # LLMProvider abstraction + adapters (OpenAI) + resiliência
│   ├── shared/         # Tipos, enums (roles), planos/limites, nomes de filas
│   └── config/         # tsconfig base
├── docker-compose.yml  # PostgreSQL (pgvector) + Redis
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Pré-requisitos

- **Node.js** >= 20
- **pnpm** >= 9 (`corepack enable` ou `npm i -g pnpm`)
- **Docker** + Docker Compose
- Uma chave de API de LLM (ex.: `OPENAI_API_KEY`) para usar os agentes

---

## Setup local

```bash
# 1. Clone
git clone https://github.com/Mlluiz39/vibesphereAi.git
cd vibesphereAi

# 2. Variáveis de ambiente
cp .env.example .env        # preencha os segredos (DB, JWT, OPENAI_API_KEY, etc.)

# 3. Infraestrutura (Postgres + Redis)
docker compose up -d

# 4. Dependências
pnpm install

# 5. Banco de dados
pnpm db:generate            # gera o Prisma Client
pnpm db:migrate             # cria as tabelas
psql "$DATABASE_URL" -f packages/database/prisma/rls.sql   # habilita RLS + pgvector + índice vetorial
pnpm db:seed                # popula os planos (Starter/Pro/Enterprise)

# 6. Sobe a API
pnpm --filter @vibesphere/api dev
# API em http://localhost:3001/api
```

> O arquivo `packages/database/prisma/rls.sql` ativa a Row-Level Security e a extensão `pgvector`. Rode-o após cada `migrate` que crie novas tabelas tenant-scoped.

### Testando o fluxo de auth

```bash
# Registrar empresa + Owner
curl -X POST http://localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"companyName":"Acme","subdomain":"acme","ownerEmail":"owner@acme.com","ownerPassword":"senha12345","ownerName":"Owner"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"subdomain":"acme","email":"owner@acme.com","password":"senha12345"}'
```

---

## Scripts úteis

| Comando              | Descrição                                  |
| -------------------- | ------------------------------------------ |
| `pnpm dev`           | Sobe os apps em modo watch (via Turbo)     |
| `pnpm build`         | Build de todos os pacotes/apps             |
| `pnpm typecheck`     | Checagem de tipos                          |
| `pnpm lint`          | Lint                                       |
| `pnpm db:migrate`    | Migrations do Prisma                       |
| `pnpm db:seed`       | Seed dos planos                            |
| `pnpm infra:up`      | `docker compose up -d`                     |
| `pnpm infra:down`    | `docker compose down`                      |

---

## Multi-tenancy e segurança

- Toda tabela de domínio possui `tenant_id`. As consultas rodam dentro de `withTenant()`, que seta `app.current_tenant` na transação.
- **Row-Level Security (RLS)** no PostgreSQL garante isolamento mesmo em caso de bug na aplicação (defesa em profundidade).
- Super Admin opera com `bypassRls` para ações transversais de plataforma.
- Senhas com **argon2**; segredos de provider criptografados (AES-256).
- Rate limiting em `/auth/*` e webhooks; audit log para operações sensíveis.

---

## Spec do projeto

A spec do MVP fica em [`.kiro/specs/vibesphere-mvp`](.kiro/specs/vibesphere-mvp):

- **`requirements.md`** — requisitos no formato EARS
- **`design.md`** — arquitetura, modelo de dados, fluxos e decisões técnicas
- **`tasks.md`** — plano de implementação incremental (referenciando os requisitos)

---

## Roadmap

| Fase | Escopo                                                        |
| ---- | ------------------------------------------------------------- |
| 1 — MVP        | Auth, Multi-Tenant, WhatsApp, Agentes, RAG, Inbox, Billing |
| 2 — Beta       | CRM, Analytics, Flow Builder, Marketplace                  |
| 3 — Produção   | Microsserviços, Multi-Provider AI, escalabilidade          |
| 4 — Enterprise | SSO, MCP, schema/cluster dedicado                          |
