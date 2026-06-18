-- Row-Level Security (RLS) — Requisito 3.3 / 3.4
-- Aplicar após `prisma migrate`. Cada conexão de request seta:
--   SELECT set_config('app.current_tenant', '<tenant_uuid>', true);
-- e o Super Admin pode setar app.bypass_rls = 'on' para operações de plataforma.

-- Extensão de busca vetorial (Requisito 6.3)
CREATE EXTENSION IF NOT EXISTS vector;

-- Helper: tenant atual da sessão
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_tenant', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- Helper: bypass para Super Admin / jobs de plataforma
CREATE OR REPLACE FUNCTION app_bypass_rls() RETURNS boolean AS $$
  SELECT COALESCE(current_setting('app.bypass_rls', true), 'off') = 'on';
$$ LANGUAGE sql STABLE;

-- Habilita RLS e cria política padrão por tenant_id em todas as tabelas tenant-scoped.
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'subscriptions','users','agents','knowledge_bases','documents','embeddings',
    'whatsapp_channels','contacts','conversations','messages','usage_counters',
    'conversation_notes','labels','conversation_labels',
    'leads','pipelines','pipeline_stages','opportunities'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON %I
      USING (app_bypass_rls() OR tenant_id = app_current_tenant())
      WITH CHECK (app_bypass_rls() OR tenant_id = app_current_tenant());
    $p$, t);
  END LOOP;
END $$;

-- audit_logs: tenant_id pode ser NULL (eventos de plataforma); leitura restrita por tenant.
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_logs
  USING (app_bypass_rls() OR tenant_id = app_current_tenant() OR tenant_id IS NULL)
  WITH CHECK (true);

-- Índice vetorial para busca por similaridade (ajustar lists conforme volume).
CREATE INDEX IF NOT EXISTS embeddings_embedding_idx
  ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
