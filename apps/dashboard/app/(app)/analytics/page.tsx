'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { Card, colors } from '../../../components/ui';

interface Kpis {
  totals: {
    messages: number;
    conversations: number;
    leads: number;
    opportunities: number;
    wonOpportunities: number;
  };
  conversionRate: number;
  avgFirstResponseSeconds: number | null;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card style={{ flex: 1, minWidth: 160 }}>
      <div style={{ color: colors.muted, fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Kpis>('/analytics/kpis')
      .then(setKpis)
      .catch((err) => setError((err as Error).message));
  }, []);

  return (
    <div style={{ maxWidth: 900 }}>
      <h1>Analytics</h1>
      <p style={{ color: colors.muted }}>Últimos 30 dias</p>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {!kpis && !error && <p style={{ color: colors.muted }}>Carregando...</p>}
      {kpis && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <Metric label="Mensagens" value={kpis.totals.messages} />
            <Metric label="Conversas" value={kpis.totals.conversations} />
            <Metric label="Leads" value={kpis.totals.leads} />
            <Metric label="Oportunidades" value={kpis.totals.opportunities} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Metric label="Negócios ganhos" value={kpis.totals.wonOpportunities} />
            <Metric label="Taxa de conversão" value={`${(kpis.conversionRate * 100).toFixed(1)}%`} />
            <Metric
              label="Tempo médio 1ª resposta"
              value={kpis.avgFirstResponseSeconds != null ? `${kpis.avgFirstResponseSeconds}s` : '—'}
            />
          </div>
        </>
      )}
    </div>
  );
}
