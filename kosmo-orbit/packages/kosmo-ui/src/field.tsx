import type { HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { KIcon } from './icons';

/**
 * KField/KInput/KChip/KToolbar/KToolGruppe (W0, UI-KONZEPT-065 §3) — ersetzt
 * die 10 lokalen `inputStyle`-Konstanten und die drei Badge-Implementierungen.
 */

// ── KField ──────────────────────────────────────────────────────────

export interface KFieldProps {
  label: string;
  hinweis?: string;
  fehler?: string;
  children: ReactNode;
  'data-testid'?: string;
}

/** Label über dem Kind; Hinweis ODER Fehler darunter (Fehler hat Vorrang). */
export function KField({ label, hinweis, fehler, children, ...rest }: KFieldProps) {
  return (
    <div className="k-field" {...rest}>
      <span className="k-field-label">{label}</span>
      {children}
      {fehler !== undefined ? (
        <span className="k-field-fehler">{fehler}</span>
      ) : hinweis !== undefined ? (
        <span className="k-field-hinweis">{hinweis}</span>
      ) : null}
    </div>
  );
}

// ── KInput ──────────────────────────────────────────────────────────

export interface KInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md';
  /** Mono-Variante (`--k-font-mono`) für Masse/Werte. */
  mono?: boolean;
}

export function KInput({ size = 'md', mono = false, className, ...rest }: KInputProps) {
  const klassen = ['k-input', `k-input--${size}`, mono ? 'k-input--mono' : '', className]
    .filter(Boolean)
    .join(' ');
  return <input {...rest} className={klassen} />;
}

// ── KChip ───────────────────────────────────────────────────────────

export interface KChipProps {
  children: ReactNode;
  /** Zeichenfarbe (CSS-Farbwert) — NIE eine Füllfläche (ausser `tone:'fuellung'`,
   * die dann ausschliesslich `--k-accent-wash` verwendet, nicht den `hue`-Ton). */
  hue?: string;
  size?: 'sm' | 'md';
  tone?: 'linie' | 'fuellung';
  onRemove?: () => void;
  'data-testid'?: string;
}

export function KChip({ children, hue, size = 'md', tone = 'linie', onRemove, ...rest }: KChipProps) {
  const farbe = hue ?? 'var(--k-ink-soft)';
  return (
    <span
      className={`k-chip k-chip--${size} k-chip--${tone}`}
      style={{ color: farbe, borderColor: farbe }}
      {...rest}
    >
      {children}
      {onRemove !== undefined && (
        <button type="button" aria-label="entfernen" className="k-chip-entfernen" onClick={onRemove}>
          <KIcon name="schliessen" size={14} />
        </button>
      )}
    </span>
  );
}

// ── KToolbar / KToolGruppe ──────────────────────────────────────────

export interface KToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Kleineres Padding für Stationen mit wenig Platz. */
  dicht?: boolean;
}

/** EINE Werkzeugzeile — Gruppen (KToolGruppe) darin werden durch Hairlines
 * getrennt; Überlauf gehört in ein KMenu «Mehr», nicht in eine zweite Zeile. */
export function KToolbar({ dicht = false, className, ...rest }: KToolbarProps) {
  const klassen = ['k-toolbar', dicht ? 'k-toolbar--dicht' : '', className].filter(Boolean).join(' ');
  return <div className={klassen} {...rest} />;
}

export interface KToolGruppeProps extends HTMLAttributes<HTMLDivElement> {
  /** Kleinbeschriftung (`--k-t-xs`, VERSAL, `--k-ink-faint`) über der Gruppe. */
  label?: string;
}

export function KToolGruppe({ label, children, className, ...rest }: KToolGruppeProps) {
  const klassen = ['k-toolgruppe', className].filter(Boolean).join(' ');
  return (
    <div className={klassen} {...rest}>
      {label !== undefined && <span className="k-toolgruppe-label">{label}</span>}
      {children}
    </div>
  );
}
