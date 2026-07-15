import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
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
  /**
   * NEU (v0.8.0B / P2, Spez §3 B-35) — `command`: Mono-Kommandozeile, 48px,
   * optionaler ⌘-Kbd-Chip (`kbd`-Prop). Additiv: bestehende Aufrufer ohne
   * `variant` rendern weiterhin GENAU ein `<input>`, byte-gleich zu vorher.
   */
  variant?: 'default' | 'command';
  /** Sichtbarer Tastenkürzel-Chip, NUR bei `variant="command"` (z.B. "⌘K"). */
  kbd?: string;
}

export function KInput({ size = 'md', mono = false, variant = 'default', kbd, className, ...rest }: KInputProps) {
  const klassen = [
    'k-input',
    `k-input--${size}`,
    mono || variant === 'command' ? 'k-input--mono' : '',
    variant === 'command' ? 'k-input--command' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  if (variant === 'command') {
    return (
      <span className="k-input-wrap k-input-wrap--command">
        <input {...rest} className={klassen} />
        {kbd !== undefined && (
          <span className="k-input-kbd" aria-hidden="true">
            {kbd}
          </span>
        )}
      </span>
    );
  }
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
  /**
   * NEU (v0.8.0B / P2, Spez §3 B-37) — additive Varianten. Default `'chip'`
   * rendert BYTE-GLEICH die bisherige `<span className="k-chip …">` (Alt-
   * Vertrag unverändert). `'status'` = Status-Chip (radius 999, Mono, 2px/8px
   * Padding, gleiche `hue`/`tone`-Optik). `'geschlossen'` = Closed-Chip
   * («+ NAME»), gestrichelter Glass-Rand, Mono 9.5px — rendert einen
   * `<button>` (klickbar, öffnet das eingeklappte Panel wieder), darum
   * eigenes `onClick` statt `onRemove`.
   */
  variant?: 'chip' | 'status' | 'geschlossen';
  onRemove?: () => void;
  onClick?: () => void;
  'data-testid'?: string;
}

export function KChip({ children, hue, size = 'md', tone = 'linie', variant = 'chip', onRemove, onClick, ...rest }: KChipProps) {
  const farbe = hue ?? 'var(--k-ink-soft)';

  if (variant === 'geschlossen') {
    return (
      <button type="button" className="k-chip-geschlossen k-uebergang-schnell" onClick={onClick} {...rest}>
        <span className="k-chip-geschlossen-plus" aria-hidden="true">
          +
        </span>
        {children}
      </button>
    );
  }

  if (variant === 'status') {
    return (
      <span className={`k-chip k-status-chip k-status-chip--${size}`} style={{ color: farbe, borderColor: farbe }} {...rest}>
        {children}
      </span>
    );
  }

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

// ── KWerkzeugKreis ──────────────────────────────────────────────────

/**
 * KWerkzeugKreis (v0.8.0B / P2, Spez §3 B-39) — das Kreis-Werkzeug der
 * Rail-/Toolbar-Grammatik: 32px-Kreis, Icon-Stroke 1.75 (Standard-`KIcon`),
 * aktiv entweder INVERTIERT (Fläche/Text getauscht) oder 1.5px
 * Akzent-/Rollenrand + 4px-Rollenpunkt (bottom, Regel 1: Rollenfarbe nur als
 * Punkt/Hairline, nie flächig). Einsatz im Rail/BodenDock ist W3-Scope, hier
 * nur die Komponente + Tests.
 */
export interface KWerkzeugKreisProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  aktiv?: boolean;
  /** Rollen-/Modusfarbe (CSS-Farbwert) für Rand + Punkt bei `aktiv`. Default `--k-accent`. */
  rolle?: string;
  /** true = aktiv zeigt eine invertierte Fläche statt Rand+Punkt. */
  invertiert?: boolean;
  'data-testid'?: string;
}

export function KWerkzeugKreis({ aktiv = false, rolle, invertiert = false, className, style, children, ...rest }: KWerkzeugKreisProps) {
  const klassen = [
    'k-werkzeug-kreis',
    'k-druck',
    aktiv ? (invertiert ? 'k-werkzeug-kreis--invertiert' : 'k-werkzeug-kreis--aktiv') : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      aria-pressed={aktiv}
      className={klassen}
      style={rolle !== undefined ? { ['--_rolle' as string]: rolle, ...style } : style}
      {...rest}
    >
      {children}
      {aktiv && !invertiert && <span className="k-werkzeug-kreis-punkt" aria-hidden="true" />}
    </button>
  );
}
