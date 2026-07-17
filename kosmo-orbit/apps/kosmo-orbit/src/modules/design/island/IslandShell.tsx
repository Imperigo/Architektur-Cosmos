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
import { inhaltFuer } from './inhalte/registry';
// Registrierung der Stufe-2/3-Inhalte als Import-Seiteneffekt (Fable-Naht
// für PD3a ‖ PD3b — s. `inhalte/registry.ts`-Kopfkommentar).
import './inhalte/zeichnen';
import './inhalte/ansicht';
import './inhalte/projekt';
import './inhalte/austausch';
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
  /**
   * PD2 (`docs/ISLAND-UI-SPEZ.md` §7 PD2-Zeile, Bullet 1 «Klick... aktiviert
   * das ECHTE Werkzeug»): optionaler Aufruf bei JEDER Erst-Aktivierung eines
   * Werkzeugs (einmal pro Übergang zu einem neuen `w.id`, s. `aufWerkzeugKlick`
   * unten) — der eigentliche Command-/Store-Aufruf lebt beim Aufrufer
   * (`DesignWorkspace.tsx`s `aktiviereIslandWerkzeug()`), NICHT hier (dieser
   * Automat bleibt reiner Präsentationszustand, s. Datei-Kopfkommentar).
   * Optional, damit der PD1-Unit-Test (`island-shell.test.tsx`, rendert
   * `IslandShell` STANDALONE ohne dieses Prop) unverändert grün bleibt.
   */
  onWerkzeugAktion?: (werkzeug: IslandWerkzeug) => void;
}

/** Eine einzelne Island — Zustandsmaschine + Rendering für Pill/Leiste/Popup/Fenster. */
export function IslandShell({ island, onWerkzeugAktion }: IslandShellProps) {
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
      // Sofort-Umschaltung (Achsen-Toggle/Manuell, §4.4) — Erst-Aktivierung,
      // exakt EIN Aufruf, wie beim Popup-Pfad unten.
      onWerkzeugAktion?.(w);
      return;
    }
    if (stufe === 'popup' && aktivesWerkzeugId === w.id) {
      setStufe('fenster');
      return;
    }
    // Erst-Aktivierung dieses Werkzeugs (Wechsel auf eine neue/andere Id) —
    // die Eskalation Popup→Fenster (Zweig oben) ruft NICHT erneut auf,
    // dasselbe Werkzeug ist bereits aktiv.
    if (aktivesWerkzeugId !== w.id) onWerkzeugAktion?.(w);
    setAktivesWerkzeugId(w.id);
    setStufe('popup');
  }

  /**
   * Zweiter Klick auf die offene Popup-FLÄCHE selbst (Hintergrund/Ränder)
   * eskaliert zum Fenster. Fable-Gate-Fix PD3: NUR wenn der Klick wirklich
   * die Fläche trifft (`target === currentTarget`) — Klicks auf die
   * Stufe-2-Schnelleinstellungen (Selects/Knöpfe der `inhalte/`-Module)
   * bedienen das Werkzeug und dürfen NICHT eskalieren. Der zweite Klick aufs
   * Werkzeug-SYMBOL eskaliert weiterhin über `aufWerkzeugKlick`.
   */
  function aufPopupKlick(e: { target: EventTarget; currentTarget: EventTarget }): void {
    if (e.target !== e.currentTarget) return;
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
          {/* PD3-Registry zuerst (Stufe-2-Inhalt aus `inhalte/`); sonst der
              PD2-Hinweis (Werkzeug ohne echte Aktion) bzw. PD1-Rahmen. */}
          {(() => {
            const Inhalt = inhaltFuer(aktivesWerkzeug.id)?.Stufe2;
            return Inhalt ? <Inhalt /> : null;
          })()}
          {!inhaltFuer(aktivesWerkzeug.id)?.Stufe2 && aktivesWerkzeug.hinweis ? (
            <p className="isl-popup-hinweis" data-testid={`island-${aktivesWerkzeug.id}-popup-hinweis`}>
              {aktivesWerkzeug.hinweis}
            </p>
          ) : null}
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
          {/* PD3-Registry zuerst (Stufe-3-Inhalt aus `inhalte/`); sonst der
              PD2-Hinweis bzw. PD1-Rahmen. */}
          {(() => {
            const Inhalt = inhaltFuer(aktivesWerkzeug.id)?.Stufe3;
            return Inhalt ? <Inhalt /> : null;
          })()}
          {!inhaltFuer(aktivesWerkzeug.id)?.Stufe3 && aktivesWerkzeug.hinweis ? (
            <p className="isl-popup-hinweis" data-testid={`island-${aktivesWerkzeug.id}-fenster-hinweis`}>
              {aktivesWerkzeug.hinweis}
            </p>
          ) : null}
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

export interface IslandBuehneProps {
  /** PD2: durchgereicht an jede der vier `IslandShell`-Instanzen, s. dortigen Kommentar. */
  onWerkzeugAktion?: (werkzeug: IslandWerkzeug) => void;
}

/**
 * Alle vier Islands an ihren Rändern (§1/§2) — der PD2-Einbindungspunkt in
 * `DesignWorkspace.tsx` (Default-Flip, nur im Island-Modus gerendert).
 */
export function IslandBuehne({ onWerkzeugAktion }: IslandBuehneProps = {}) {
  return (
    <>
      {ISLAND_REIHENFOLGE.map((island) => (
        <IslandShell key={island} island={island} {...(onWerkzeugAktion ? { onWerkzeugAktion } : {})} />
      ))}
    </>
  );
}
