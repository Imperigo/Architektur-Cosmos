import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ISLAND_LABEL,
  ISLAND_ORIENTIERUNG,
  ISLAND_REIHENFOLGE,
  werkzeugeFuerIsland,
  type IslandId,
  type IslandWerkzeug,
} from './island-katalog';
import { bevorzugtReduzierteBewegung } from '../../../state/cursor-zustand';
import { useProject } from '../../../state/project-store';
import { touchUndoGesteAktiv } from '../../../state/touch-undo';
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
/**
 * Exportiert (PD4-Ergänzung, additiv): `island/KosmoOrb.tsx` braucht
 * denselben Live-`prefers-reduced-motion`-Zustand für seinen Puls-Ring
 * (`orbPulse`, §4.3-Tabelle) — ein zweiter, unabhängiger `matchMedia`-Aufruf
 * wäre unnötige Duplikation desselben Musters. Verhalten/Signatur bleiben
 * exakt wie zuvor, nur die Sichtbarkeit ändert sich (`function` → `export
 * function`).
 */
export function useReduzierteBewegung(): boolean {
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

/**
 * §10.1 (`docs/V083-SPEZ.md`, Bounding-Box-Clamping analog `design.css:186-
 * 198`s `.dw-dropdown`-Präzedenzfall «Scroll statt Überlapp»): stösst ein
 * Popup/Fenster, dessen `getBoundingClientRect()` den Viewport verlässt,
 * über zwei additive CSS-Custom-Properties (`--isl-clamp-x`/`-y`, `island.
 * css`) wieder zurück in die sichtbare Fläche. Die Properties wirken additiv
 * ZUR bestehenden `translateX(-50%)`-Zentrierung jeder Insel-Rand-Position
 * (`island.css`s vier `.isl-rand-*`-Anker bleiben unverändert) — kein
 * Eingriff in die Anker-Logik selbst, nur ein nachträglicher Korrekturvektor
 * je gerendertem Popup/Fenster. IMMER zuerst auf `0px` zurückgesetzt, bevor
 * neu gemessen wird — sonst würde ein bereits angewandter alter Offset die
 * neue Messung verfälschen (kumulative Fehlrechnung bei mehrfachem Aufruf,
 * z. B. durch den ResizeObserver unten).
 */
const ISL_VIEWPORT_RAND_PX = 8;
/** Abstand Popup↔Leiste nach einer Kollisions-Ausweichung (s. u.). */
const ISL_LEISTE_ABSTAND_PX = 6;

function klammereInViewport(el: HTMLElement): void {
  if (typeof window === 'undefined') return;
  el.style.setProperty('--isl-clamp-x', '0px');
  el.style.setProperty('--isl-clamp-y', '0px');
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let dx = 0;
  let dy = 0;
  if (r.left < ISL_VIEWPORT_RAND_PX) dx = ISL_VIEWPORT_RAND_PX - r.left;
  else if (r.right > vw - ISL_VIEWPORT_RAND_PX) dx = vw - ISL_VIEWPORT_RAND_PX - r.right;
  if (r.top < ISL_VIEWPORT_RAND_PX) dy = ISL_VIEWPORT_RAND_PX - r.top;
  else if (r.bottom > vh - ISL_VIEWPORT_RAND_PX) dy = vh - ISL_VIEWPORT_RAND_PX - r.bottom;

  // W2-Quergate-Fund (18.07.2026): die reine Viewport-Klammer kann das Popup
  // ÜBER die eigene Werkzeug-Leiste schieben (hohe ZEICHNEN-Insel @1024×768:
  // Clamp-Y -81px legte das Messen-Popup auf den Messen-Knopf — der zweite
  // Klick zur Stufe-3-Eskalation war abgefangen, elementFromPoint-bewiesen).
  // Darum: überdeckt das geklammerte Popup die Leiste, weicht es QUER zur
  // Insel-Orientierung aus (vertikale Leiste → seitlich, horizontale →
  // darüber/darunter), auf die Seite mit mehr Platz. Interaktion schlägt
  // Randabstand: die Ausweichung wird nur weich nachgeklammert, nie zurück
  // in die Überdeckung.
  const wurzel = el.closest('.isl-root');
  const leiste = wurzel?.querySelector('.isl-leiste');
  if (leiste) {
    const l = leiste.getBoundingClientRect();
    const g = { left: r.left + dx, right: r.right + dx, top: r.top + dy, bottom: r.bottom + dy };
    const ueberdeckt = g.left < l.right && g.right > l.left && g.top < l.bottom && g.bottom > l.top;
    if (ueberdeckt) {
      if (wurzel!.classList.contains('isl-vertikal')) {
        const platzRechts = vw - ISL_VIEWPORT_RAND_PX - l.right;
        const platzLinks = l.left - ISL_VIEWPORT_RAND_PX;
        dx =
          platzRechts >= r.width || platzRechts >= platzLinks
            ? l.right + ISL_LEISTE_ABSTAND_PX - r.left
            : l.left - ISL_LEISTE_ABSTAND_PX - r.right;
      } else {
        const platzUnten = vh - ISL_VIEWPORT_RAND_PX - l.bottom;
        const platzOben = l.top - ISL_VIEWPORT_RAND_PX;
        dy =
          platzUnten >= r.height || platzUnten >= platzOben
            ? l.bottom + ISL_LEISTE_ABSTAND_PX - r.top
            : l.top - ISL_LEISTE_ABSTAND_PX - r.bottom;
      }
    }
  }

  el.style.setProperty('--isl-clamp-x', `${dx}px`);
  el.style.setProperty('--isl-clamp-y', `${dy}px`);
}

/**
 * Misst+klammert das übergebene Element sofort nach dem Mount/Stufenwechsel
 * (`useLayoutEffect` — läuft VOR dem ersten Paint, kein sichtbares
 * Nachrücken) und erneut bei jeder Grössenänderung des Elements selbst
 * (`ResizeObserver`, z. B. wenn ein Stufe-3-Inhalt seinen Aufbau-Katalog
 * aufklappt) sowie bei jeder Viewport-Grössenänderung (iPad-Drehung).
 * `ResizeObserver` existiert in jsdom nicht — defensiv übersprungen, die
 * Erstmessung greift trotzdem (Unit-Tests bleiben unberührt).
 */
function useViewportKlammer(ref: { current: HTMLElement | null }, aktiv: boolean): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!aktiv || !el) return;
    klammereInViewport(el);
    const aufResize = () => klammereInViewport(el);
    window.addEventListener('resize', aufResize);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(aufResize);
      ro.observe(el);
    }
    return () => {
      window.removeEventListener('resize', aufResize);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktiv]);
}

/**
 * §10.2 (`docs/V083-SPEZ.md`, `docs/ISLAND-UI-SPEZ.md` §8 Punkt 1 bleibt
 * OWNER-OFFEN): Zwei-Finger-Doppeltipp auf dem Viewport löst `history.undo()`
 * aus — NUR wenn `kosmo.touch-undo-geste` aktiv ist (Default aus,
 * `state/touch-undo.ts`, Schalter in `Einstellungen.tsx` Sektion «Bewegung &
 * Klang»). Rein additiv: `{ passive: true }`, nie `preventDefault`/
 * `stopPropagation` — kein bestehender Touch-Handler (Pinch/Pan/Zeichnen in
 * `Viewport3D.tsx`/`PlanView.tsx`) wird berührt oder unterdrückt, dieser
 * Listener liest nur zusätzlich mit. Ein Bewegungs- und Zeit-Schwellwert
 * unterscheidet den Tap von einem Pinch/Pan-Zoom mit zwei Fingern (dieselben
 * zwei Finger, die sonst die Kamera steuern).
 */
const ZWEI_FINGER_TAP_MAX_MS = 300;
const ZWEI_FINGER_DOPPELTIPP_MS = 400;
const ZWEI_FINGER_BEWEGUNG_PX = 24;

interface ZweiFingerPunkt {
  x: number;
  y: number;
  zeit: number;
}

function useZweiFingerUndoGeste(): void {
  const start = useRef<Map<number, ZweiFingerPunkt> | null>(null);
  const letzterTap = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function aufTouchStart(e: TouchEvent): void {
      if (e.touches.length !== 2) {
        start.current = null;
        return;
      }
      const punkte = new Map<number, ZweiFingerPunkt>();
      const zeit = performance.now();
      for (const t of Array.from(e.touches)) punkte.set(t.identifier, { x: t.clientX, y: t.clientY, zeit });
      start.current = punkte;
    }

    function aufTouchEnd(e: TouchEvent): void {
      const startPunkte = start.current;
      // Beide Finger müssen zusammen losgelassen werden (letzter Finger oben)
      // — ein noch aufliegender Finger ist kein sauberer Zwei-Finger-Tap.
      if (!startPunkte || startPunkte.size !== 2 || e.touches.length !== 0) {
        start.current = null;
        return;
      }
      start.current = null;

      let treffer = 0;
      let ungueltig = false;
      for (const t of Array.from(e.changedTouches)) {
        const s = startPunkte.get(t.identifier);
        if (!s) continue;
        treffer += 1;
        if (Math.hypot(t.clientX - s.x, t.clientY - s.y) > ZWEI_FINGER_BEWEGUNG_PX) ungueltig = true;
        if (performance.now() - s.zeit > ZWEI_FINGER_TAP_MAX_MS) ungueltig = true;
      }
      if (treffer < 2 || ungueltig) return;

      const jetzt = performance.now();
      if (jetzt - letzterTap.current < ZWEI_FINGER_DOPPELTIPP_MS) {
        letzterTap.current = 0;
        if (touchUndoGesteAktiv()) useProject.getState().undo();
      } else {
        letzterTap.current = jetzt;
      }
    }

    window.addEventListener('touchstart', aufTouchStart, { passive: true });
    window.addEventListener('touchend', aufTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', aufTouchStart);
      window.removeEventListener('touchend', aufTouchEnd);
    };
  }, []);
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

  // §10.1 Viewport-Klammer (s. `useViewportKlammer`-Kopfkommentar oben) — je
  // ein Ref für Popup/Fenster, nur AKTIV, solange die jeweilige Stufe wirklich
  // gerendert ist (sonst zeigt der Ref ins Leere).
  const popupRef = useRef<HTMLDivElement | null>(null);
  const fensterRef = useRef<HTMLDivElement | null>(null);
  useViewportKlammer(popupRef, stufe === 'popup');
  useViewportKlammer(fensterRef, stufe === 'fenster');

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
          ref={popupRef}
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
          ref={fensterRef}
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
 *
 * §10.2 (P8): `useZweiFingerUndoGeste()` hängt hier (nicht in jeder einzelnen
 * `IslandShell`) — EIN Listener-Paar auf `window` für den ganzen Viewport,
 * genau einmal gemountet/entfernt mit der Bühne selbst, kein Vervierfachen
 * über die vier Insel-Instanzen.
 */
export function IslandBuehne({ onWerkzeugAktion }: IslandBuehneProps = {}) {
  useZweiFingerUndoGeste();
  return (
    <>
      {ISLAND_REIHENFOLGE.map((island) => (
        <IslandShell key={island} island={island} {...(onWerkzeugAktion ? { onWerkzeugAktion } : {})} />
      ))}
    </>
  );
}
