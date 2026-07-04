import { useSyncExternalStore } from 'react';
import { KButton } from './components';

/**
 * Meldungen (V1-Finish P1) — das eine Sprachrohr der App: `melde()` ersetzt
 * jedes `alert()`, `bestaetigen()` jedes `confirm()`. Eigenbau ohne Store-
 * Abhängigkeit (useSyncExternalStore), Werkplan-Ästhetik, aria-live.
 * Regel: Fehler bleiben länger stehen und tragen, wo sinnvoll, eine Aktion.
 */

export interface Meldung {
  id: number;
  text: string;
  ton: 'info' | 'erfolg' | 'fehler';
  aktion?: { label: string; run: () => void };
}

let meldungen: Meldung[] = [];
let naechsteId = 1;
const hoerer = new Set<() => void>();
const timer = new Map<number, ReturnType<typeof setTimeout>>();

function benachrichtige(): void {
  for (const h of hoerer) h();
}

function entferne(id: number): void {
  const t = timer.get(id);
  if (t) clearTimeout(t);
  timer.delete(id);
  meldungen = meldungen.filter((m) => m.id !== id);
  benachrichtige();
}

/** Toast zeigen. Fehler stehen 8 s, alles andere 4 s; ✕ schliesst sofort. */
export function melde(
  text: string,
  opts?: { ton?: Meldung['ton']; dauerMs?: number; aktion?: Meldung['aktion'] },
): void {
  const ton = opts?.ton ?? 'info';
  const m: Meldung = { id: naechsteId++, text, ton, ...(opts?.aktion ? { aktion: opts.aktion } : {}) };
  meldungen = [...meldungen.slice(-3), m]; // nie mehr als 4 aufs Mal
  timer.set(m.id, setTimeout(() => entferne(m.id), opts?.dauerMs ?? (ton === 'fehler' ? 8000 : 4000)));
  benachrichtige();
}

/** Kurzform für Fehlerpfade (catch-Blöcke): nimmt Error oder Text. */
export function meldeFehler(err: unknown, aktion?: Meldung['aktion']): void {
  const text = err instanceof Error ? err.message : String(err);
  melde(text, { ton: 'fehler', ...(aktion ? { aktion } : {}) });
}

function abonniere(cb: () => void): () => void {
  hoerer.add(cb);
  return () => hoerer.delete(cb);
}

const TON_FARBE: Record<Meldung['ton'], string> = {
  info: 'var(--k-ink-soft)',
  erfolg: 'var(--k-success)',
  fehler: 'var(--k-danger)',
};

/** Host — einmal in der Shell mounten. */
export function KMeldungen() {
  const liste = useSyncExternalStore(abonniere, () => meldungen);
  if (liste.length === 0) return null;
  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 'min(520px, calc(100vw - 32px))',
      }}
    >
      {liste.map((m) => (
        <div
          key={m.id}
          data-testid={`meldung-${m.ton}`}
          className="k-meldung"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--k-raised)',
            border: '1px solid var(--k-line-strong)',
            borderLeft: `3px solid ${TON_FARBE[m.ton]}`,
            boxShadow: 'var(--k-shadow-overlay)',
            padding: '9px 12px',
            fontSize: 13,
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>{m.text}</span>
          {m.aktion && (
            <KButton
              size="sm"
              tone="quiet"
              onClick={() => {
                m.aktion!.run();
                entferne(m.id);
              }}
            >
              {m.aktion.label}
            </KButton>
          )}
          <button
            aria-label="Meldung schliessen"
            onClick={() => entferne(m.id)}
            style={{ all: 'unset', cursor: 'pointer', color: 'var(--k-ink-faint)', fontSize: 12, padding: '0 2px' }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Bestätigung (ersetzt confirm) ────────────────────────────────────

interface BestaetigungAnfrage {
  titel: string;
  text?: string;
  bestaetigen?: string;
  gefaehrlich?: boolean;
  resolve: (ok: boolean) => void;
}

let anfrage: BestaetigungAnfrage | null = null;
const dialogHoerer = new Set<() => void>();

function dialogBenachrichtige(): void {
  for (const h of dialogHoerer) h();
}

/** Promise-basierter Bestätigungsdialog — `if (!(await bestaetigen({...}))) return;` */
export function bestaetigen(opts: {
  titel: string;
  text?: string;
  bestaetigen?: string;
  gefaehrlich?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    anfrage?.resolve(false); // eine offene Anfrage aufs Mal
    anfrage = { titel: opts.titel, resolve, ...(opts.text ? { text: opts.text } : {}), ...(opts.bestaetigen ? { bestaetigen: opts.bestaetigen } : {}), ...(opts.gefaehrlich ? { gefaehrlich: true } : {}) };
    dialogBenachrichtige();
  });
}

function dialogAbonniere(cb: () => void): () => void {
  dialogHoerer.add(cb);
  return () => dialogHoerer.delete(cb);
}

/** Host — einmal in der Shell mounten. Esc = abbrechen. */
export function KBestaetigung() {
  const offen = useSyncExternalStore(dialogAbonniere, () => anfrage);
  if (!offen) return null;
  const schliesse = (ok: boolean) => {
    offen.resolve(ok);
    anfrage = null;
    dialogBenachrichtige();
  };
  return (
    <div
      role="dialog"
      aria-modal
      aria-label={offen.titel}
      data-testid="bestaetigung"
      onKeyDown={(e) => e.key === 'Escape' && schliesse(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 210,
        background: 'color-mix(in srgb, var(--k-ink) 22%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={() => schliesse(false)}
    >
      <div
        className="k-karte"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--k-raised)', padding: '16px 18px', width: 'min(420px, calc(100vw - 48px))', display: 'grid', gap: 10 }}
      >
        <div className="k-titel" style={{ fontSize: 13, fontWeight: 650 }}>{offen.titel}</div>
        {offen.text && <div style={{ fontSize: 13, color: 'var(--k-ink-soft)' }}>{offen.text}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <KButton size="sm" tone="ghost" data-testid="bestaetigung-nein" onClick={() => schliesse(false)}>
            Abbrechen
          </KButton>
          <KButton
            size="sm"
            tone={offen.gefaehrlich ? 'danger' : 'accent'}
            data-testid="bestaetigung-ja"
            autoFocus
            onClick={() => schliesse(true)}
          >
            {offen.bestaetigen ?? 'Bestätigen'}
          </KButton>
        </div>
      </div>
    </div>
  );
}
