# Plano de Implementação — VibeSphere AI (MVP / Fase 1)

> Cada tarefa é incremental e referencia os requisitos correspondentes (`requirements.md`).
> A ordem prioriza uma fatia vertical funcional cedo (auth + multi-tenant) e depois agrega valor.

- [ ] 1. Fundação do monorepo e ambiente de desenvolvimento
  - Criar monorepo pnpm + Turborepo com `apps/{api,worker,dashboard}` e `packages/{database,llm,shared,config}`
  - Configurar TypeScript base, ESLint/Prettier e schema de variáveis de ambiente
  - Adicionar `docker-compose.yml` com PostgreSQL+pgvector e Redis
  - _Requisitos: base para todos_

- [ ] 2. Camada de banco e modelo multi-tenant (package `database`)
  - [ ] 2.1 Definir schema Prisma com todas as tabelas do design e `tenant_id` nas tabelas de domínio
    - _Requisitos: 3.1, 4, 5, 6, 7, 8, 9, 10, 11_
  - [ ] 2.2 Criar migration inicial + habilitar extensão pgvector e índice vetorial
    - _Requisitos: 6.3_
  - [ ] 2.3 Implementar RLS (políticas por tenant) e setagem de `app.current_tenant` por request
    - _Requisitos: 3.2, 3.3, 3.4_
  - [ ] 2.4 Seed de `plans` (Starter/Pro/Enterprise) com limites
    - _Requisitos: 10.1_

- [ ] 3. Autenticação e contexto de tenant (módulo `auth` + `tenant`) — primeira fatia vertical
  - [ ] 3.1 Implementar registro de tenant (empresa + Owner inicial + plano) e validação de subdomínio
    - _Requisitos: 3.5, 4.1, 4.2_
  - [ ] 3.2 Implementar login com hash de senha (argon2) e emissão de access + refresh token
    - _Requisitos: 1.1, 1.2, 1.5_
  - [ ] 3.3 Implementar refresh com rotação e logout com revogação
    - _Requisitos: 1.3, 1.4, 1.6_
  - [ ] 3.4 Implementar `JwtAuthGuard`, `TenantContextInterceptor` e `RolesGuard` + `@Roles()`
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 3.2_
  - [ ] 3.5 Testes de integração de isolamento de tenant (A não acessa dados de B)
    - _Requisitos: 3.2, 3.4_

- [ ] 4. Gestão de usuários e empresa (módulo `user` + `tenant`)
  - [ ] 4.1 CRUD de usuários escopado ao tenant com atribuição de perfil
    - _Requisitos: 2.5, 4.3_
  - [ ] 4.2 Configuração de branding básico do tenant
    - _Requisitos: 4.4_

- [ ] 5. Camada de abstração de LLM (package `llm`)
  - [ ] 5.1 Definir interface `LLMProvider` (chat/embeddings/completion) e DTOs
    - _Requisitos: 5.4_
  - [ ] 5.2 Implementar `OpenAIProvider` e `LLMProviderFactory`
    - _Requisitos: 5.4_
  - [ ] 5.3 Implementar `ResilientLLMProvider` (retry + fallback)
    - _Requisitos: 5.5_

- [x] 6. Agentes (módulo `agent`)
  - [x] 6.1 CRUD de agentes com config completa e associação a base de conhecimento
    - _Requisitos: 5.1, 5.6_
  - [x] 6.2 `PlanLimitGuard` para limite de agentes por plano
    - _Requisitos: 5.2, 5.3_

- [ ] 7. Base de conhecimento e pipeline RAG (módulo `knowledge` + worker)
  - [ ] 7.1 CRUD de bases e upload de documentos com criação de job de ingestão
    - _Requisitos: 6.1, 6.2_
  - [ ] 7.2 Worker de ingestão: extração → chunking → embeddings → pgvector
    - _Requisitos: 6.2, 6.3_
  - [ ] 7.3 Recuperação de chunks relevantes para uso em resposta (retriever)
    - _Requisitos: 6.4_
  - [ ] 7.4 Tratamento de falha de ingestão + reprocessamento
    - _Requisitos: 6.5_

- [ ] 8. Integração WhatsApp (módulo `whatsapp`)
  - [ ] 8.1 Interface `WhatsAppProvider` + `MetaCloudProvider` (envio + parse)
    - _Requisitos: 7.1, 7.4_
  - [ ] 8.2 Webhook com verificação de assinatura e enfileiramento (resposta rápida)
    - _Requisitos: 7.2_
  - [ ] 8.3 Envio com retry/backoff e registro de falha
    - _Requisitos: 7.5_
  - [ ] 8.4 Cadastro de canal por tenant com limite de números do plano
    - _Requisitos: 7.3_

- [ ] 9. Engine de orquestração de conversa (módulo `conversation` + worker)
  - [ ] 9.1 Worker de mensagens: resolver tenant/contato/conversa e persistir inbound
    - _Requisitos: 8.1, 8.3_
  - [ ] 9.2 Geração de resposta via agente (memória + RAG) quando estado = IA
    - _Requisitos: 8.2, 8.5_
  - [ ] 9.3 Bloqueio por limite de conversas do plano
    - _Requisitos: 8.4, 10.5_

- [ ] 10. Inbox omnichannel (módulo `inbox`)
  - [ ] 10.1 Listagem de conversas com filtros por estado
    - _Requisitos: 9.1_
  - [ ] 10.2 Assumir conversa (IA→Humano) pausando respostas automáticas
    - _Requisitos: 9.2_
  - [ ] 10.3 Transferência com histórico, anotações e etiquetas
    - _Requisitos: 9.3, 9.4_
  - [ ] 10.4 Envio de mensagem pelo atendente
    - _Requisitos: 9.5_

- [ ] 11. Billing (módulo `billing`)
  - [ ] 11.1 Subscriptions e aplicação de limites por plano
    - _Requisitos: 10.1, 10.2_
  - [ ] 11.2 Integração Stripe (assinaturas) com arquitetura extensível
    - _Requisitos: 10.3_
  - [ ] 11.3 Webhook de pagamento idempotente atualizando status do tenant
    - _Requisitos: 10.4_
  - [ ] 11.4 `usage_counters` e sinalização de upgrade ao atingir limite
    - _Requisitos: 10.5_

- [ ] 12. Auditoria e segurança transversais (módulo `audit`)
  - [ ] 12.1 Audit log de operações sensíveis e acessos negados entre tenants
    - _Requisitos: 11.1, 3.4_
  - [ ] 12.2 Rate limiting em `/auth/*` e webhooks
    - _Requisitos: 11.2_
  - [ ] 12.3 Criptografia de segredos de provider + validação/sanitização de DTOs
    - _Requisitos: 11.3, 11.4_
  - [ ] 12.4 Exclusão/anonimização de dados pessoais (LGPD)
    - _Requisitos: 11.5_

- [ ] 13. Dashboard (app `dashboard`, Next.js)
  - [ ] 13.1 Fluxo de login/refresh e contexto de tenant no front
    - _Requisitos: 1, 2, 3_
  - [ ] 13.2 Telas de Agentes, Base de Conhecimento e Inbox
    - _Requisitos: 5, 6, 9_

- [ ] 14. Smoke e2e do fluxo principal
  - Login → criar agente → conectar canal (mock) → simular mensagem → resposta gerada
  - _Requisitos: 1, 5, 7, 8_
