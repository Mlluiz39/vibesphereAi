'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register } from '../../lib/api';
import { Button, Card, Field, Input, colors } from '../../components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: '',
    subdomain: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        ...form,
        subdomain: form.subdomain.trim().toLowerCase(),
        ownerEmail: form.ownerEmail.trim(),
      });
      router.push('/inbox');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: colors.bg,
        color: colors.text,
        fontFamily: 'system-ui',
        padding: 20,
      }}
    >
      <Card style={{ width: 400 }}>
        <h1 style={{ marginTop: 0, fontSize: 22 }}>Criar empresa</h1>
        <p style={{ color: colors.muted, marginTop: 0 }}>Cadastre sua empresa na VibeSphere</p>
        <form onSubmit={onSubmit}>
          <Field label="Nome da empresa">
            <Input value={form.companyName} onChange={set('companyName')} required />
          </Field>
          <Field label="Subdomínio">
            <Input value={form.subdomain} onChange={set('subdomain')} placeholder="acme" required />
          </Field>
          <Field label="Seu nome">
            <Input value={form.ownerName} onChange={set('ownerName')} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.ownerEmail} onChange={set('ownerEmail')} required />
          </Field>
          <Field label="Senha (mín. 8 caracteres)">
            <Input
              type="password"
              value={form.ownerPassword}
              onChange={set('ownerPassword')}
              minLength={8}
              required
            />
          </Field>
          {error && <p style={{ color: '#f87171', fontSize: 14 }}>{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar conta'}
          </Button>
        </form>
        <p style={{ color: colors.muted, fontSize: 14, marginBottom: 0 }}>
          Já tem conta?{' '}
          <Link href="/login" style={{ color: colors.primary }}>
            Entrar
          </Link>
        </p>
      </Card>
    </main>
  );
}
