import type { ReactNode } from 'react';

export const metadata = {
  title: 'VibeSphere AI',
  description: 'Plataforma SaaS multi-tenant de agentes de IA para WhatsApp',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
