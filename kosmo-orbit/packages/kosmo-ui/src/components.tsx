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

/** Werkplan-Karteikarte: geschnittene Ecke + Mono-Laufnummer (Referenzposter). */
export function Karteikarte({
  nr,
  style,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { nr?: number }) {
  return (
    <div {...rest} className="k-karte" style={{ display: 'flex', alignItems: 'stretch', ...style }}>
      {nr !== undefined && (
        <div
          aria-hidden
          style={{
            fontFamily: 'var(--k-font-mono)',
            fontWeight: 700,
            fontSize: 14,
            padding: '10px 8px 0 10px',
            borderRight: '1px solid var(--k-line-strong)',
            minWidth: 42,
            textAlign: 'right',
            color: 'var(--k-ink)',
          }}
        >
          {String(nr).padStart(2, '0')}.
        </div>
      )}
      <div style={{ padding: '10px 12px', flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

/** Bauzeichnungs-Leerzustand: Messrahmen mit Schnittmarken, Achsenkreuz und
 * Mono-Beschriftung — Gegenstand (noch) nicht vorhanden, Rahmen vermasst. */
export function Messrahmen({
  caption,
  height = 200,
  style,
}: {
  caption: string;
  height?: number | string;
  style?: React.CSSProperties;
}) {
  const mark = (rot: number, pos: React.CSSProperties) => (
    <svg aria-hidden width="14" height="14" style={{ position: 'absolute', ...pos, transform: `rotate(${rot}deg)` }}>
      <path d="M 13 6.5 H 6.5 V 13" fill="none" stroke="var(--k-technik)" strokeWidth="1" />
    </svg>
  );
  return (
    <div
      style={{
        position: 'relative',
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{ position: 'absolute', inset: 10, border: '1px dashed var(--k-line-strong)' }}
      />
      {mark(0, { top: 0, left: 0 })}
      {mark(90, { top: 0, right: 0 })}
      {mark(270, { bottom: 0, left: 0 })}
      {mark(180, { bottom: 0, right: 0 })}
      {/* Achsenkreuz unten links */}
      <svg aria-hidden width="46" height="46" style={{ position: 'absolute', left: 20, bottom: 18 }}>
        <path d="M 6 40 V 10 M 6 10 l -3 5 h 6 z" fill="var(--k-technik)" stroke="var(--k-technik)" strokeWidth="1" />
        <path d="M 6 40 H 36 M 36 40 l -5 -3 v 6 z" fill="var(--k-technik)" stroke="var(--k-technik)" strokeWidth="1" />
        <text x="1" y="8" fontSize="8" fontFamily="var(--k-font-mono)" fill="var(--k-technik)">Z</text>
        <text x="39" y="43" fontSize="8" fontFamily="var(--k-font-mono)" fill="var(--k-technik)">X</text>
      </svg>
      {/* Passermarke rechts */}
      <svg aria-hidden width="22" height="22" style={{ position: 'absolute', right: 22, top: '50%', marginTop: -11 }}>
        <circle cx="11" cy="11" r="6" fill="none" stroke="var(--k-technik)" strokeWidth="1" />
        <path d="M 11 1 V 21 M 1 11 H 21" stroke="var(--k-technik)" strokeWidth="1" />
      </svg>
      <div
        style={{
          fontFamily: 'var(--k-font-mono)',
          fontSize: 11.5,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--k-ink-soft)',
          textAlign: 'center',
          maxWidth: '70%',
        }}
      >
        {caption}
      </div>
    </div>
  );
}
