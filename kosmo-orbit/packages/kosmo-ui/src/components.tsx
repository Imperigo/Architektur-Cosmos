import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

/**
 * Aura-Basiskomponenten — bewusst schlank, CSS-Variablen-getrieben.
 * Alles Weitere wächst mit der App; keine Komponenten auf Vorrat.
 */

type Tone = 'accent' | 'quiet' | 'ghost' | 'danger';

export interface KButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  size?: 'sm' | 'md';
}

const buttonBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  border: '1px solid transparent',
  borderRadius: 'var(--k-radius-sm)',
  cursor: 'pointer',
  fontWeight: 500,
  transition: 'background var(--k-motion-fast), border-color var(--k-motion-fast), color var(--k-motion-fast), opacity var(--k-motion-fast)',
  userSelect: 'none',
  whiteSpace: 'nowrap',
};

const toneStyle: Record<Tone, React.CSSProperties> = {
  accent: { background: 'var(--k-accent)', color: 'var(--k-accent-ink)' },
  quiet: {
    background: 'var(--k-raised)',
    color: 'var(--k-ink)',
    borderColor: 'var(--k-line-strong)',
  },
  ghost: { background: 'transparent', color: 'var(--k-ink-soft)' },
  danger: { background: 'transparent', color: 'var(--k-danger)', borderColor: 'var(--k-danger)' },
};

export function KButton({ tone = 'quiet', size = 'md', style, disabled, ...rest }: KButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        ...buttonBase,
        ...toneStyle[tone],
        padding: size === 'sm' ? '3px 10px' : '6px 14px',
        fontSize: size === 'sm' ? '12.5px' : '14px',
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'default' : 'pointer',
        ...style,
      }}
    />
  );
}

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  pad?: boolean;
}

export function Panel({ pad = true, style, ...rest }: PanelProps) {
  return (
    <div
      {...rest}
      style={{
        background: 'var(--k-surface)',
        border: '1px solid var(--k-line)',
        borderRadius: 'var(--k-radius-md)',
        padding: pad ? 14 : 0,
        ...style,
      }}
    />
  );
}

export function Hairline({ vertical = false }: { vertical?: boolean }) {
  return (
    <div
      aria-hidden
      style={
        vertical
          ? { width: 1, alignSelf: 'stretch', background: 'var(--k-line)' }
          : { height: 1, width: '100%', background: 'var(--k-line)' }
      }
    />
  );
}

export interface BadgeProps {
  children: ReactNode;
  hue?: string;
}

export function Badge({ children, hue }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: hue ?? 'var(--k-ink-faint)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: hue ?? 'var(--k-ink-faint)',
        }}
      />
      {children}
    </span>
  );
}

/** Massangabe in Mono mit tabellarischen Ziffern. */
export function Measure({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: '12.5px', ...style }}>{children}</span>
  );
}
