'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../lib/api';
import { Button, Card, Field, Input, colors } from '../../components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(subdomain.trim(), email.trim(), password);
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
      }}
    >
      <Card style={{ width: 360 }}>
        <h1 style={{ marginTop: 0, fontSize: 22 }}>VibeSphere AI</h1>
        <p style={{ color: colors.muted, marginTop: 0 }}>Entrar no painel</p>
        <form onSubmit={onSubmit}>
          <Field label="Subdomínio">
            <Input value={subdomain} onChange={(e) => setSubdomain(e.target.value)} placeholder="acme" required />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Senha">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <p style={{ color: '#f87171', fontSize: 14 }}>{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
