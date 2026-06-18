'use client';

import type { CSSProperties, ReactNode } from 'react';

export const colors = {
  bg: '#0f172a',
  panel: '#1e293b',
  border: '#334155',
  text: '#e2e8f0',
  muted: '#94a3b8',
  primary: '#6366f1',
};

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  type = 'button',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? colors.border : colors.primary,
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '10px 16px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: '10px 12px',
        width: '100%',
        ...props.style,
      }}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', color: colors.muted, marginBottom: 6, fontSize: 14 }}>
        {label}
      </span>
      {children}
    </label>
  );
}
