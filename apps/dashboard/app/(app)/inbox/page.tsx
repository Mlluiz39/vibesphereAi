'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { Button, Card, Input, colors } from '../../../components/ui';

interface Conversation {
  id: string;
  state: string;
  contact?: { name?: string; phone: string };
  messages?: { content: string; direction: string }[];
}

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  createdAt: string;
}

interface ConversationDetail extends Conversation {
  messages: Message[];
}

const STATES = ['', 'ai', 'human', 'waiting', 'closed'];

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stateFilter, setStateFilter] = useState('');
  const [active, setActive] = useState<ConversationDetail | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const q = stateFilter ? `?state=${stateFilter}` : '';
      setConversations(await apiFetch<Conversation[]>(`/inbox/conversations${q}`));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter]);

  async function open(id: string) {
    setActive(await apiFetch<ConversationDetail>(`/inbox/conversations/${id}`));
  }

  async function assume() {
    if (!active) return;
    await apiFetch(`/inbox/conversations/${active.id}/assign`, { method: 'POST' });
    await open(active.id);
  }

  async function send() {
    if (!active || !text.trim()) return;
    try {
      await apiFetch(`/inbox/conversations/${active.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setText('');
      await open(active.id);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 56px)' }}>
      <div style={{ width: 320 }}>
        <h1 style={{ marginTop: 0 }}>Inbox</h1>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          style={{
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: 8,
            marginBottom: 12,
            width: '100%',
          }}
        >
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s === '' ? 'Todos os estados' : s}
            </option>
          ))}
        </select>
        <div style={{ display: 'grid', gap: 8 }}>
          {conversations.map((c) => (
            <Card key={c.id} style={{ padding: 12, cursor: 'pointer' }}>
              <div onClick={() => open(c.id)}>
                <strong>{c.contact?.name || c.contact?.phone || 'Contato'}</strong>
                <div style={{ color: colors.muted, fontSize: 13 }}>
                  {c.state} · {c.messages?.[0]?.content?.slice(0, 40) ?? ''}
                </div>
              </div>
            </Card>
          ))}
          {conversations.length === 0 && <p style={{ color: colors.muted }}>Sem conversas.</p>}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
        {!active && <p style={{ color: colors.muted }}>Selecione uma conversa.</p>}
        {active && (
          <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{active.contact?.name || active.contact?.phone}</strong>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: colors.muted, fontSize: 13 }}>{active.state}</span>
                {active.state !== 'human' && <Button onClick={assume}>Assumir</Button>}
              </div>
            </div>
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                margin: '16px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {active.messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.direction === 'outbound' ? 'flex-end' : 'flex-start',
                    background: m.direction === 'outbound' ? colors.primary : colors.border,
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: 10,
                    maxWidth: '70%',
                  }}
                >
                  {m.content}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Mensagem..."
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <Button onClick={send}>Enviar</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
