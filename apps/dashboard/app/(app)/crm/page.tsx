'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { Button, Card, Field, Input, colors } from '../../../components/ui';

interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  status: string;
}

interface Stage {
  id: string;
  name: string;
  order: number;
}

interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

interface Opportunity {
  id: string;
  title: string;
  value?: string | number;
  stageId: string;
  lead?: { id: string; name: string };
}

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', email: '', company: '' });
  const [error, setError] = useState('');

  async function load() {
    try {
      const [l, p] = await Promise.all([
        apiFetch<Lead[]>('/crm/leads'),
        apiFetch<Pipeline[]>('/crm/pipelines'),
      ]);
      setLeads(l);
      setPipelines(p);
      if (p[0]) {
        setOpps(await apiFetch<Opportunity[]>(`/crm/opportunities?pipelineId=${p[0].id}`));
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const payload: Record<string, string> = { name: leadForm.name };
      if (leadForm.phone) payload.phone = leadForm.phone;
      if (leadForm.email) payload.email = leadForm.email;
      if (leadForm.company) payload.company = leadForm.company;
      await apiFetch('/crm/leads', { method: 'POST', body: JSON.stringify(payload) });
      setLeadForm({ name: '', phone: '', email: '', company: '' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function createDefaultPipeline() {
    await apiFetch('/crm/pipelines', { method: 'POST', body: JSON.stringify({ name: 'Funil de Vendas' }) });
    await load();
  }

  const pipeline = pipelines[0];

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1>CRM</h1>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}

      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Novo lead</h3>
        <form onSubmit={createLead} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Nome"><Input value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} required /></Field>
          <Field label="Telefone"><Input value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} /></Field>
          <Field label="Empresa"><Input value={leadForm.company} onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })} /></Field>
          <div style={{ gridColumn: '1 / -1' }}><Button type="submit">Adicionar lead</Button></div>
        </form>
      </Card>

      <h3>Leads ({leads.length})</h3>
      <div style={{ display: 'grid', gap: 8, marginBottom: 32 }}>
        {leads.map((l) => (
          <Card key={l.id} style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{l.name}</strong>
                <div style={{ color: colors.muted, fontSize: 13 }}>
                  {[l.phone, l.email, l.company].filter(Boolean).join(' · ')}
                </div>
              </div>
              <span style={{ color: colors.muted, fontSize: 13 }}>{l.status}</span>
            </div>
          </Card>
        ))}
        {leads.length === 0 && <p style={{ color: colors.muted }}>Nenhum lead ainda.</p>}
      </div>

      <h3>Funil</h3>
      {!pipeline && <Button onClick={createDefaultPipeline}>Criar funil padrão</Button>}
      {pipeline && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
          {pipeline.stages.map((s) => {
            const stageOpps = opps.filter((o) => o.stageId === s.id);
            return (
              <div key={s.id} style={{ minWidth: 200 }}>
                <div style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>
                  {s.name} ({stageOpps.length})
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {stageOpps.map((o) => (
                    <Card key={o.id} style={{ padding: 12 }}>
                      <strong style={{ fontSize: 14 }}>{o.title}</strong>
                      <div style={{ color: colors.muted, fontSize: 12 }}>{o.lead?.name}</div>
                      {o.value != null && (
                        <div style={{ fontSize: 13, marginTop: 4 }}>R$ {String(o.value)}</div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
