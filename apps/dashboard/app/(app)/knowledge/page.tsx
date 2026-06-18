'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { Button, Card, Field, Input, colors } from '../../../components/ui';

interface KnowledgeBase {
  id: string;
  name: string;
  _count?: { documents: number };
}

interface DocumentItem {
  id: string;
  filename: string;
  type: string;
  status: string;
}

export default function KnowledgePage() {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadBases() {
    try {
      setBases(await apiFetch<KnowledgeBase[]>('/knowledge-bases'));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function loadDocs(id: string) {
    setSelected(id);
    setDocs(await apiFetch<DocumentItem[]>(`/knowledge-bases/${id}/documents`));
  }

  useEffect(() => {
    void loadBases();
  }, []);

  async function createBase(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/knowledge-bases', { method: 'POST', body: JSON.stringify({ name }) });
      setName('');
      await loadBases();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function upload() {
    if (!selected || !fileRef.current?.files?.[0]) return;
    const form = new FormData();
    form.append('file', fileRef.current.files[0]);
    try {
      await apiFetch(`/knowledge-bases/${selected}/documents`, { method: 'POST', body: form });
      await loadDocs(selected);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <h1>Base de Conhecimento</h1>
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Nova base</h3>
        <form onSubmit={createBase} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Field label="Nome">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
          </div>
          <Button type="submit">Criar</Button>
        </form>
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
      </Card>

      <div style={{ display: 'grid', gap: 12 }}>
        {bases.map((b) => (
          <Card key={b.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{b.name}</strong>
                <div style={{ color: colors.muted, fontSize: 14 }}>
                  {b._count?.documents ?? 0} documento(s)
                </div>
              </div>
              <Button onClick={() => loadDocs(b.id)}>Ver documentos</Button>
            </div>

            {selected === b.id && (
              <div style={{ marginTop: 16, borderTop: `1px solid ${colors.border}`, paddingTop: 16 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input ref={fileRef} type="file" style={{ color: colors.muted }} />
                  <Button onClick={upload}>Enviar</Button>
                </div>
                {docs.map((d) => (
                  <div key={d.id} style={{ fontSize: 14, padding: '4px 0' }}>
                    {d.filename} — <span style={{ color: colors.muted }}>{d.status}</span>
                  </div>
                ))}
                {docs.length === 0 && <span style={{ color: colors.muted }}>Sem documentos.</span>}
              </div>
            )}
          </Card>
        ))}
        {bases.length === 0 && <p style={{ color: colors.muted }}>Nenhuma base ainda.</p>}
      </div>
    </div>
  );
}
