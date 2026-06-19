'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { Button, Card, colors } from '../../../components/ui';

interface Template {
  id: string;
  category: string;
  title: string;
  description: string;
}

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Template[]>('/marketplace/templates')
      .then(setTemplates)
      .catch((err) => setError((err as Error).message));
  }, []);

  async function install(id: string) {
    setError('');
    setInfo('');
    setInstalling(id);
    try {
      await apiFetch(`/marketplace/templates/${id}/install`, { method: 'POST' });
      setInfo(`Template "${id}" instalado! Confira em Agentes / Flows.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setInstalling(null);
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <h1>Marketplace</h1>
      <p style={{ color: colors.muted }}>Instale templates prontos no seu tenant.</p>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {info && <p style={{ color: '#34d399' }}>{info}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {templates.map((t) => (
          <Card key={t.id}>
            <span
              style={{
                fontSize: 12,
                color: colors.primary,
                background: 'rgba(99,102,241,0.15)',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              {t.category}
            </span>
            <h3 style={{ margin: '10px 0 4px' }}>{t.title}</h3>
            <p style={{ color: colors.muted, fontSize: 14, minHeight: 40 }}>{t.description}</p>
            <Button onClick={() => install(t.id)} disabled={installing === t.id}>
              {installing === t.id ? 'Instalando...' : 'Instalar'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
