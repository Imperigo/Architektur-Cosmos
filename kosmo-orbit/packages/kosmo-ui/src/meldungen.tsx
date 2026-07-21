import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
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

/** Host — einmal in der Shell mounten.
 *
 * v0.8.0B / P2 (Spez §3: KSelect/KDialog/KMenu/Meldungen → Glass-/
 * Flächenstufen-Optik, Verhalten unverändert) — die Inline-Styles wandern in
 * `.k-meldungen-host`/`.k-meldung-karte`/… (`aura.css`); `aria-live`,
 * `data-testid="meldung-{ton}"` und die Ton-Farbe (weiterhin ein CSS-
 * Variablen-Wert, `TON_FARBE`, kein rohes Hex) bleiben byte-gleich.
 */
export function KMeldungen() {
  const liste = useSyncExternalStore(abonniere, () => meldungen, () => meldungen);
  if (liste.length === 0) return null;
  return (
    <div aria-live="polite" className="k-meldungen-host">
      {liste.map((m) => (
        <div
          key={m.id}
          data-testid={`meldung-${m.ton}`}
          className="k-meldung k-meldung-karte"
          style={{ ['--_ton' as string]: TON_FARBE[m.ton] }}
        >
          <span className="k-meldung-text">{m.text}</span>
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
          <button aria-label="Meldung schliessen" className="k-meldung-schliessen" onClick={() => entferne(m.id)}>
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

/**
 * Host — einmal in der Shell mounten. Esc = abbrechen.
 *
 * E-K5 (`docs/V0812-SPEZ.md`, Sanktion 4, 21.07.2026, Bauagenten-Fund): der
 * neue Phasen-«Transformieren»-Weg ruft `bestaetigen()` erstmals AUS einem
 * bereits offenen Panel heraus (Projekt-Einstellungen). Ohne `createPortal`
 * rendert dieser Host irgendwo im normalen React-Baum (unter `App.tsx`s
 * `.app-wurzel`) — `aura.css`s `#root { position: relative; z-index: 1; }`
 * (dort für den Papier-Korn-Hintergrund `body::before` nötig) spannt damit
 * einen eigenen Stacking-Context auf: JEDES `position:fixed`-Kind von
 * `#root`, egal wie hoch sein EIGENER `z-index`, bleibt auf Rang «1»
 * gegenüber Body-Geschwistern gefangen. `Einstellungen.tsx`s Scrim portalt
 * dagegen direkt nach `document.body` (`z-index:250`) — gewann darum immer,
 * `bestaetigung-nein`/`-ja` waren unklickbar («subtree intercepts pointer
 * events»). Ein höherer `zIndex` allein (erster, unzureichender Versuch:
 * 210→900) behebt das NICHT, weil er nur INNERHALB des `#root`-Stacking-
 * Context zählt. Richtiger Fix: derselbe `createPortal(..., document.body)`-
 * Weg wie `Einstellungen.tsx` — dann vergleicht der Browser die z-index-Werte
 * wirklich auf oberster Ebene, `900` schlägt jeden heute existierenden
 * INTERAKTIVEN Overlay (`kosmo-panel.css`s `.kp-export-scrim`/
 * `.kp-vollbild-scrim` 500 sind die nächsthöchsten; die beiden Overlays über
 * 900 — `kosmo-feedback.css` 2000, `cursor-ebene.css` ~2.1 Mrd. — sind
 * `pointer-events:none` und blockieren ohnehin keinen Klick).
 */
export function KBestaetigung() {
  const offen = useSyncExternalStore(dialogAbonniere, () => anfrage, () => anfrage);
  if (!offen) return null;
  const schliesse = (ok: boolean) => {
    offen.resolve(ok);
    anfrage = null;
    dialogBenachrichtige();
  };
  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-label={offen.titel}
      data-testid="bestaetigung"
      className="k-dialog-scrim k-bestaetigung-scrim"
      onKeyDown={(e) => e.key === 'Escape' && schliesse(false)}
      style={{ zIndex: 900 }}
      onClick={() => schliesse(false)}
    >
      <div
        className="k-dialog-box k-skalieren-ein k-dialog k-bestaetigung-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="k-titel k-bestaetigung-titel">{offen.titel}</div>
        {offen.text && <div className="k-bestaetigung-text">{offen.text}</div>}
        <div className="k-bestaetigung-aktionen">
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
    </div>,
    document.body,
  );
}
