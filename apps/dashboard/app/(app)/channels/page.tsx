'use client';

import { useEffect, useState } from 'react';
import { API_URL, apiFetch } from '../../../lib/api';
import { Button, Card, Field, Input, colors } from '../../../components/ui';

interface Agent {
  id: string;
  name: string;
}

interface Channel {
  id: string;
  phoneNumber: string;
  provider: string;
  status: string;
  defaultAgentId?: string | null;
}

const empty = {
  phoneNumber: '',
  phoneNumberId: '',
  accessToken: '',
  appSecret: '',
  verifyToken: '',
  defaultAgentId: '',
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const [ch, ag] = await Promise.all([
        apiFetch<Channel[]>('/whatsapp-channels'),
        apiFetch<Agent[]>('/agents'),
      ]);
      setChannels(ch);
      setAgents(ag);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: Record<string, string> = {
        phoneNumber: form.phoneNumber,
        phoneNumberId: form.phoneNumberId,
        accessToken: form.accessToken,
      };
      if (form.appSecret) payload.appSecret = form.appSecret;
      if (form.verifyToken) payload.verifyToken = form.verifyToken;
      if (form.defaultAgentId) payload.defaultAgentId = form.defaultAgentId;

      await apiFetch('/whatsapp-channels', { method: 'POST', body: JSON.stringify(payload) });
      setForm({ ...empty });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h1>Canais de WhatsApp</h1>
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Conectar canal (Meta Cloud API)</h3>
        <form onSubmit={create}>
          <Field label="Número (com DDI)">
            <Input value={form.phoneNumber} onChange={set('phoneNumber')} placeholder="5511999990000" required />
          </Field>
          <Field label="Phone Number ID">
            <Input value={form.phoneNumberId} onChange={set('phoneNumberId')} required />
          </Field>
          <Field label="Access Token">
            <Input value={form.accessToken} onChange={set('accessToken')} required />
          </Field>
          <Field label="App Secret (opcional, valida assinatura do webhook)">
            <Input value={form.appSecret} onChange={set('appSecret')} />
          </Field>
          <Field label="Verify Token (opcional, handshake do webhook)">
            <Input value={form.verifyToken} onChange={set('verifyToken')} />
          </Field>
          <Field label="Agente padrão">
            <select
              value={form.defaultAgentId}
              onChange={(e) => setForm((f) => ({ ...f, defaultAgentId: e.target.value }))}
              style={{
                background: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: 10,
                width: '100%',
              }}
            >
              <option value="">— Nenhum —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          {error && <p style={{ color: '#f87171' }}>{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Conectando...' : 'Conectar canal'}
          </Button>
        </form>
      </Card>

      <div style={{ display: 'grid', gap: 12 }}>
        {channels.map((c) => (
          <Card key={c.id}>
            <strong>{c.phoneNumber}</strong>
            <div style={{ color: colors.muted, fontSize: 14 }}>
              {c.provider} · {c.status}
            </div>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <span style={{ color: colors.muted }}>Webhook URL:</span>
              <code style={{ display: 'block', marginTop: 4, wordBreak: 'break-all' }}>
                {API_URL}/webhooks/whatsapp/{c.id}
              </code>
            </div>
          </Card>
        ))}
        {channels.length === 0 && <p style={{ color: colors.muted }}>Nenhum canal conectado.</p>}
      </div>
    </div>
  );
}
