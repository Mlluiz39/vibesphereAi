'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { Button, Card, Field, Input, colors } from '../../../components/ui';

interface Agent {
  id: string;
  name: string;
  model: string;
  provider: string;
  goal?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setAgents(await apiFetch<Agent[]>('/agents'));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/agents', {
        method: 'POST',
        body: JSON.stringify({ name, systemPrompt }),
      });
      setName('');
      setSystemPrompt('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h1>Agentes</h1>
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Novo agente</h3>
        <form onSubmit={create}>
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Prompt do sistema">
            <Input
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Você é um assistente de vendas..."
              required
            />
          </Field>
          {error && <p style={{ color: '#f87171' }}>{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar agente'}
          </Button>
        </form>
      </Card>

      <div style={{ display: 'grid', gap: 12 }}>
        {agents.map((a) => (
          <Card key={a.id}>
            <strong>{a.name}</strong>
            <div style={{ color: colors.muted, fontSize: 14 }}>
              {a.provider} · {a.model}
            </div>
            {a.goal && <p style={{ marginBottom: 0 }}>{a.goal}</p>}
          </Card>
        ))}
        {agents.length === 0 && <p style={{ color: colors.muted }}>Nenhum agente ainda.</p>}
      </div>
    </div>
  );
}
