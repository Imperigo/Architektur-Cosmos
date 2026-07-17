import { useEffect, useRef, useState } from 'react';
import {
  ISLAND_LABEL,
  ISLAND_ORIENTIERUNG,
  ISLAND_REIHENFOLGE,
  werkzeugeFuerIsland,
  type IslandId,
  type IslandWerkzeug,
} from './island-katalog';
import { bevorzugtReduzierteBewegung } from '../../../state/cursor-zustand';
import './island.css';

/**
 * IslandShell (PD1 Fundament, `docs/ISLAND-UI-SPEZ.md` §4.1/§4.2/§4.3).
 *
 * Zustandsmaschine EINER Island: `pill` ↔ `leiste` ↔ `popup` ↔ `fenster`.
 * PD1 rendert Pill+Leiste vollständig; Popup/Fenster sind bewusst minimale,
 * leere Rahmen mit korrekter Animation/testid — Inhalte kommen erst PD3
 * (§7-Tabelle, PD1-Zeile: «Stufen 0–1 mit statischem Werkzeug-Katalog»).
 *
 * Ablageort app-lokal (Fable-Entscheid, kein zweiter Ort in `packages/kosmo-ui`
 * — Promotion erst, wenn eine zweite Station die Island-UI braucht).
 *
 * **App-lokal statt `state/ui-zustand.ts`:** dieser Automat ist reiner
 * Präsentations-/UI-Zustand einer einzelnen Insel (Stufe, aktives Werkzeug,
 * Toast) — kein Store-Feld, das Kosmo/E2E/Persistenz brauchen (anders als
 * `tool`/`viewMode`). Die echte `ToolId`-Verdrahtung (PD2) wird DIESEN
 * lokalen Zustand mit dem bestehenden `useUiZustand`-Store verbinden, ihn
 * aber nicht ersetzen — «Stufe» ist nirgends heute im Store abgebildet.
 */

/** 900ms Rückklapp-Timer nach Pointer-Verlassen (§4.2, Prototyp `islLeave`). */
const RUECKKLAPP_MS = 900;
/** Toast-Anzeigedauer für Werkzeuge ohne Popup (§4.2, Prototyp `pickTool`). */
const TOAST_MS = 1700;

export type IslandStufe = 'pill' | 'leiste' | 'popup' | 'fenster';

/** Rand-Position + Zentrierung je Island (§1/§2: links/oben/rechts/unten, 14px, mittig). */
const ISLAND_RAND_KLASSE: Readonly<Record<IslandId, string>> = {
  zeichnen: 'isl-rand-links',
  ansicht: 'isl-rand-oben',
  projekt: 'isl-rand-rechts',
  austausch: 'isl-rand-unten',
};

/**
 * Liest `prefers-reduced-motion: reduce` initial UND hält es über die
 * Lebensdauer der Komponente aktuell (MediaQueryList-`change`-Event) — anders
 * als der einmalige Lese-Helfer `bevorzugtReduzierteBewegung()` selbst
 * (`state/cursor-zustand.ts`, wiederverwendet statt eines zweiten
 * `matchMedia`-Aufrufmusters).
 */
function useReduzierteBewegung(): boolean {
  const [reduziert, setReduziert] = useState(() => bevorzugtReduzierteBewegung());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aufAenderung = () => setReduziert(mql.matches);
    mql.addEventListener('change', aufAenderung);
    return () => mql.removeEventListener('change', aufAenderung);
  }, []);

  return reduziert;
}

export interface IslandShellProps {
  island: IslandId;
}

/** Eine einzelne Island — Zustandsmaschine + Rendering für Pill/Leiste/Popup/Fenster. */
export function IslandShell({ island }: IslandShellProps) {
  const werkzeuge = werkzeugeFuerIsland(island);
  const orientierung = ISLAND_ORIENTIERUNG[island];
  const reduziert = useReduzierteBewegung();

  const [stufe, setStufe] = useState<IslandStufe>('pill');
  const [aktivesWerkzeugId, setAktivesWerkzeugId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const rueckklappTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer beim Unmount räumen — kein Leck über Test-/Panel-Wechsel hinweg.
  useEffect(
    () => () => {
      if (rueckklappTimer.current) clearTimeout(rueckklappTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  function raeumeRueckklappTimer(): void {
    if (rueckklappTimer.current) {
      clearTimeout(rueckklappTimer.current);
      rueckklappTimer.current = null;
    }
  }

  /** Hover/Tap öffnet die Leiste (§4.1 Stufe 1, §4.2 iPad-Regel: erster Tap = Hover). */
  function oeffneLeiste(): void {
    raeumeRueckklappTimer();
    setStufe((s) => (s === 'pill' ? 'leiste' : s));
  }

  /** Pointer betritt die Insel wieder — der Rückklapp-Timer wird storniert. */
  function aufPointerEnter(): void {
    raeumeRueckklappTimer();
    if (stufe === 'pill') setStufe('leiste');
  }

  /**
   * Pointer verlässt die Insel — 900ms-Rückklapp-Timer (§4.2). Ein offenes
   * Popup/Fenster hält die Insel offen (`popup.island===id`-Guard im
   * Prototyp): der Timer wird dann gar nicht erst gestellt.
   */
  function aufPointerLeave(): void {
    raeumeRueckklappTimer();
    if (stufe === 'popup' || stufe === 'fenster') return;
    rueckklappTimer.current = setTimeout(() => {
      setStufe('pill');
      setAktivesWerkzeugId(null);
    }, RUECKKLAPP_MS);
  }

  function zeigeToast(werkzeugName: string): void {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(`${werkzeugName.toUpperCase()} AKTIV`);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  /**
   * Klick auf ein Werkzeug in der Leiste (§4.1 Stufe 2, §4.2 Toast-Regel).
   * Ohne Popup (`hatPopup===false`): Toast, Stufe bleibt `leiste`. Mit
   * Popup: erster Klick → `popup`; zweiter Klick auf DASSELBE Werkzeug
   * (Symbol oder Popup-Fläche) → `fenster` (§4.1 Stufe 3).
   */
  function aufWerkzeugKlick(w: IslandWerkzeug): void {
    if (!w.hatPopup) {
      zeigeToast(w.name);
      return;
    }
    if (stufe === 'popup' && aktivesWerkzeugId === w.id) {
      setStufe('fenster');
      return;
    }
    setAktivesWerkzeugId(w.id);
    setStufe('popup');
  }

  /** Zweiter Klick auf die offene Popup-Fläche selbst eskaliert ebenfalls zum Fenster. */
  function aufPopupKlick(): void {
    setStufe('fenster');
  }

  /** `icX`-Schliessen-Knopf (§4.1 Stufe 3) — geht zurück auf `leiste`, nicht auf `pill`. */
  function schliessePopupOderFenster(): void {
    setStufe('leiste');
    setAktivesWerkzeugId(null);
  }

  const aktivesWerkzeug = aktivesWerkzeugId ? werkzeuge.find((w) => w.id === aktivesWerkzeugId) : undefined;
  const label = ISLAND_LABEL[island];

  return (
    <div
      className={`isl-root isl-${orientierung} ${ISLAND_RAND_KLASSE[island]}`}
      data-testid={`island-${island}-root`}
      data-reduziert={reduziert ? 'true' : 'false'}
      onMouseEnter={aufPointerEnter}
      onMouseLeave={aufPointerLeave}
    >
      {stufe === 'pill' ? (
        <button
          type="button"
          className="isl-pill"
          data-testid={`island-${island}-pill`}
          aria-label={`${label} öffnen`}
          onClick={oeffneLeiste}
        >
          <span className="isl-pill-glyphe" aria-hidden="true">
            {label.slice(0, 2)}
          </span>
        </button>
      ) : (
        <div className={`isl-leiste${reduziert ? '' : ' isl-anim-islIn'}`} data-testid={`island-${island}-leiste`}>
          <div className="isl-leiste-kopf">{label}</div>
          <div className="isl-leiste-werkzeuge">
            {werkzeuge.map((w) => (
              <button
                key={w.id}
                type="button"
                className="isl-werkzeug"
                data-testid={`island-werkzeug-${w.id}`}
                aria-pressed={aktivesWerkzeugId === w.id}
                onClick={() => aufWerkzeugKlick(w)}
              >
                <span className="isl-werkzeug-glyphe" aria-hidden="true">
                  {w.glyphe}
                </span>
                <span className="isl-werkzeug-titel">{w.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {stufe === 'popup' && aktivesWerkzeug ? (
        <div
          className={`isl-popup${reduziert ? '' : ' isl-anim-popIn'}`}
          data-testid={`island-${aktivesWerkzeug.id}-popup`}
          onClick={aufPopupKlick}
        >
          <button
            type="button"
            className="isl-schliessen"
            data-testid={`island-${aktivesWerkzeug.id}-popup-schliessen`}
            aria-label="Schliessen"
            onClick={(e) => {
              e.stopPropagation();
              schliessePopupOderFenster();
            }}
          >
            ✕
          </button>
          {/* Leerer Rahmen (PD1) — Stufe-2-Inhalte (2–4 Schnelleinstellungen je §4.4) kommen PD3. */}
          <p className="isl-popup-hinweis">NOCHMALS KLICKEN → ALLE EINSTELLUNGEN</p>
        </div>
      ) : null}

      {stufe === 'fenster' && aktivesWerkzeug ? (
        <div
          className={`isl-fenster${reduziert ? '' : ' isl-anim-winIn'}`}
          data-testid={`island-${aktivesWerkzeug.id}-fenster`}
        >
          <button
            type="button"
            className="isl-schliessen"
            data-testid={`island-${aktivesWerkzeug.id}-fenster-schliessen`}
            aria-label="Schliessen"
            onClick={schliessePopupOderFenster}
          >
            ✕
          </button>
          {/* Leerer Rahmen (PD1) — Einstellungsfenster-Inhalte (Stufe-3-Quelle je §4.4) kommen PD3. */}
        </div>
      ) : null}

      {toast ? (
        <div className="isl-toast" data-testid="island-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Alle vier Islands an ihren Rändern (§1/§2) — für PD1s Eigenständigkeits-
 * Anforderung («muss exportiert und eigenständig renderbar sein») UND als
 * spätere Einbindungsstelle für PD2 (Default-Flip in `DesignWorkspace.tsx`,
 * noch NICHT verdrahtet in PD1).
 */
export function IslandBuehne() {
  return (
    <>
      {ISLAND_REIHENFOLGE.map((island) => (
        <IslandShell key={island} island={island} />
      ))}
    </>
  );
}
