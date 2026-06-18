'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { Button, Card, Field, Input, colors } from '../../../components/ui';

interface Flow {
  id: string;
  name: string;
  status: string;
  triggerType: string;
  _count?: { nodes: number };
}

const EXAMPLE = JSON.stringify(
  {
    nodes: [
      { key: 'start', type: 'start' },
      { key: 'msg', type: 'message', config: { text: 'Olá {{nome}}, bem-vindo!' } },
      { key: 'ai', type: 'ai', config: { prompt: 'Resuma em uma frase: {{nome}}', outputVar: 'resumo' } },
      { key: 'end', type: 'end' },
    ],
    edges: [
      { from: 'start', to: 'msg' },
      { from: 'msg', to: 'ai' },
      { from: 'ai', to: 'end' },
    ],
  },
  null,
  2,
);

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [name, setName] = useState('');
  const [graph, setGraph] = useState(EXAMPLE);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function load() {
    try {
      setFlows(await apiFetch<Flow[]>('/flows'));
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
    setInfo('');
    try {
      const parsed = JSON.parse(graph);
      await apiFetch('/flows', {
        method: 'POST',
        body: JSON.stringify({ name, nodes: parsed.nodes, edges: parsed.edges }),
      });
      setName('');
      await load();
      setInfo('Flow criado.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function run(id: string) {
    setError('');
    setInfo('');
    try {
      const res = await apiFetch<{ runId: string }>(`/flows/${id}/run`, {
        method: 'POST',
        body: JSON.stringify({ context: { vars: { nome: 'Cliente' } } }),
      });
      setInfo(`Execução iniciada: ${res.runId}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <h1>Flows</h1>
      <p style={{ color: colors.muted }}>
        Editor simplificado (JSON). Tipos de nó: start, message, condition, delay, webhook, ai, end.
      </p>

      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Novo flow</h3>
        <form onSubmit={create}>
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Grafo (nodes + edges)">
            <textarea
              value={graph}
              onChange={(e) => setGraph(e.target.value)}
              rows={14}
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: 13,
                background: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: 12,
              }}
            />
          </Field>
          {error && <p style={{ color: '#f87171' }}>{error}</p>}
          {info && <p style={{ color: '#34d399' }}>{info}</p>}
          <Button type="submit">Criar flow</Button>
        </form>
      </Card>

      <div style={{ display: 'grid', gap: 12 }}>
        {flows.map((f) => (
          <Card key={f.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{f.name}</strong>
                <div style={{ color: colors.muted, fontSize: 13 }}>
                  {f.status} · {f.triggerType} · {f._count?.nodes ?? 0} nós
                </div>
              </div>
              <Button onClick={() => run(f.id)}>Executar</Button>
            </div>
          </Card>
        ))}
        {flows.length === 0 && <p style={{ color: colors.muted }}>Nenhum flow ainda.</p>}
      </div>
    </div>
  );
}
