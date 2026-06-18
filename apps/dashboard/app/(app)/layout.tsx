'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthenticated, logout } from '../../lib/api';
import { colors } from '../../components/ui';

const NAV = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/agents', label: 'Agentes' },
  { href: '/knowledge', label: 'Conhecimento' },
  { href: '/channels', label: 'Canais' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: colors.bg,
        color: colors.text,
        fontFamily: 'system-ui',
      }}
    >
      <aside
        style={{
          width: 220,
          borderRight: `1px solid ${colors.border}`,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0 }}>VibeSphere</h2>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              color: pathname?.startsWith(item.href) ? '#fff' : colors.muted,
              textDecoration: 'none',
              padding: '8px 10px',
              borderRadius: 8,
              background: pathname?.startsWith(item.href) ? colors.primary : 'transparent',
            }}
          >
            {item.label}
          </Link>
        ))}
        <button
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
          style={{
            marginTop: 'auto',
            background: 'transparent',
            color: colors.muted,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: '8px 10px',
            cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </aside>
      <main style={{ flex: 1, padding: 28, overflow: 'auto' }}>{children}</main>
    </div>
  );
}
