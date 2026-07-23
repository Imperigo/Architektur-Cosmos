import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import {
  DESIGN_INSELN,
  designInselKonfig,
  type InselKonfig,
  type IslandId,
  type IslandWerkzeug,
} from './island-katalog';
import { ISLAND_PILL_GLYPHEN } from './island-glyphen';
import { useOverlaySchliessen } from '@kosmo/ui';
import { bevorzugtReduzierteBewegung } from '../../../state/cursor-zustand';
import { useProject } from '../../../state/project-store';
import { touchUndoGesteAktiv } from '../../../state/touch-undo';
import { werkzeugInPhaseSichtbar } from '../../../state/phasen-matrix';
import { designInhaltsRegistry, type InhaltsRegistry } from './inhalte/registry';
// Registrierung der Stufe-2/3-Inhalte als Import-Seiteneffekt (Fable-Naht
// für PD3a ‖ PD3b — s. `inhalte/registry.ts`-Kopfkommentar).
import './inhalte/zeichnen';
import './inhalte/ansicht';
import './inhalte/projekt';
import './inhalte/austausch';
// v0.9.2 P-P2 (`docs/V092-SPEZ.md` §P-P2): Profil-Manager — additiver
// fünfter Import, registriert das neue PROJEKT-Werkzeug `profil` (eigene
// Datei statt `inhalte/projekt.tsx`, um deren Dateikreis nicht anzufassen).
import './inhalte/profile';
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

/** PB2 (Owner: «nach 1s»): 1000ms Rückklapp-Timer nach Pointer-Verlassen
 *  (§4.2, Prototyp `islLeave` — war 900ms bis v0.8.3). */
const RUECKKLAPP_MS = 1000;
/** Toast-Anzeigedauer für Werkzeuge ohne Popup (§4.2, Prototyp `pickTool`). */
const TOAST_MS = 1700;
/** PB2 (Bauauftrag Punkt 2): Verzögerung, bevor der Lang-Hover-Tooltip am
 *  Werkzeugknopf erscheint. */
const TOOLTIP_VERZOEGERUNG_MS = 600;

/**
 * PB2 (`docs/V084-SPEZ.md` §7 Sanktion 3, E8): rendert eine Katalog-`glyphe`
 * — ein echtes Icon (`ComponentType`) gewinnt, ein `string` bleibt der
 * Text-Kürzel-Fallback (aktuell nur `skizze`, s. `island-katalog.ts`-
 * Kopfkommentar; auch künftige Stations-Konfigs ohne Icon-Zuordnung fallen
 * hierauf zurück, statt zu crashen).
 */
function WerkzeugGlyphe({ glyphe, size }: { glyphe: string | ComponentType<{ size?: number }>; size: number }) {
  if (typeof glyphe === 'string') return <>{glyphe}</>;
  const Icon = glyphe;
  return <Icon size={size} />;
}

/**
 * PB2 (Bauauftrag Punkt 4, D15-Folgefund): drei Insel-Werkzeuge committen
 * ihre eigentliche Handlung über einen Klick AUSSERHALB der Insel (Plan-/
 * Viewport-Canvas) WÄHREND ihr Popup/Fenster offen bleibt — Öffnung (Klick
 * auf eine Wand), Messen (Klickkette bis Doppelklick/Esc) und Kommentar
 * (Klick setzt den Punkt, das Formular erscheint danach IM selben Popup,
 * `e2e/masskette-kommentar.spec.ts`). Ein generisches App-weites
 * Aussenklick-Schliessen (§1.1) würde ihr Popup schon beim ERSTEN
 * Arbeits-Klick wegreissen, bevor der Nutzer fertig ist — bewiesen durch
 * genau diese Spec (»Kommentar: Klick setzt NUR den Punkt … das Formular
 * erscheint jetzt«, prüft `island-kommentar-text` NACH einem Canvas-Klick
 * bei weiterhin offenem Popup). Diese drei bleiben darum von der neuen
 * Aussenklick-Regel ausgenommen; Esc schliesst sie trotzdem (kollidiert mit
 * keinem bestehenden Test, s. Bauagenten-Bericht).
 */
const AUSSENKLICK_AUSNAHME = new Set(['oeffnung', 'messen', 'kommentare']);

export type IslandStufe = 'pill' | 'leiste' | 'popup' | 'fenster';

// PC0 v0.8.4: die Rand-Klassen leben jetzt in der `InselKonfig`
// (`island-katalog.ts`s `DESIGN_INSELN` für design) — die Shell liest nur
// noch `konfig.randKlasse` und ist damit stationsagnostisch (V084-SPEZ E1).

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
  /**
   * PC0 v0.8.4: `string` statt der design-`IslandId`-Union. OHNE `konfig`
   * wird die Id gegen die design-Defaults (`DESIGN_INSELN`) aufgelöst —
   * jeder Bestands-Aufrufer (`<IslandShell island="zeichnen"/>`, Unit-Tests,
   * IslandBuehne) verhält sich byte-gleich weiter.
   */
  island: string;
  /** Stations-Konfig (V084-SPEZ E1) — andere Stationen übergeben sie explizit. */
  konfig?: InselKonfig;
  /** Inhalts-Registry der Station — Default: die design-Registry. */
  registry?: InhaltsRegistry;
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
export function IslandShell({ island, konfig, registry, onWerkzeugAktion }: IslandShellProps) {
  const inselKonfig = konfig ?? designInselKonfig(island as IslandId);
  const inhalte = registry ?? designInhaltsRegistry;
  const werkzeuge = inselKonfig.werkzeuge;
  const orientierung = inselKonfig.orientierung;
  const reduziert = useReduzierteBewegung();

  /**
   * V0812-SPEZ E-M (P-M) — Konsum von `PHASEN_MATRIX`/`werkzeugInPhaseSichtbar`:
   * harte Ausblendung ausserhalb der aktiven `doc.settings.siaPhase` (kein
   * Dimmen). `IslandShell` ist stationsübergreifend geteilte Infrastruktur
   * (Kopfkommentar oben) — die 19er-Register-Domäne kennt heute nur die 8
   * Stations-Ids + die 11 ZEICHNEN-Ids; `werkzeugInPhaseSichtbar()` ist für
   * jede andere Id (ANSICHT/PROJEKT/AUSTAUSCH sowie vis-/publish-/prepare-
   * Inseln) defensiv `true` — diese Zeile beschneidet darum NUR die
   * ZEICHNEN-Insel-Leiste sichtbar, alle übrigen Inseln bleiben byte-gleich.
   */
  const siaPhase = useProject((s) => s.doc.settings.siaPhase);
  const sichtbareWerkzeuge = werkzeuge.filter((w) => werkzeugInPhaseSichtbar(w.id, siaPhase));

  const [stufe, setStufe] = useState<IslandStufe>('pill');
  const [aktivesWerkzeugId, setAktivesWerkzeugId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** PB2 (Bauauftrag Punkt 2): welches Werkzeug gerade seinen Lang-Hover-
   *  Tooltip zeigt (`null` = keiner) — unabhängig von `stufe`. */
  const [tooltipWerkzeugId, setTooltipWerkzeugId] = useState<string | null>(null);

  const rueckklappTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // §10.1 Viewport-Klammer (s. `useViewportKlammer`-Kopfkommentar oben) — je
  // ein Ref für Popup/Fenster, nur AKTIV, solange die jeweilige Stufe wirklich
  // gerendert ist (sonst zeigt der Ref ins Leere).
  const popupRef = useRef<HTMLDivElement | null>(null);
  const fensterRef = useRef<HTMLDivElement | null>(null);
  useViewportKlammer(popupRef, stufe === 'popup');
  useViewportKlammer(fensterRef, stufe === 'fenster');
  /** PB2 (Bauauftrag Punkt 2): derselbe Klammer-Mechanismus für den
   *  Werkzeug-Tooltip — «nie abgeschnitten», wiederverwendet statt neu
   *  erfunden. */
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  useViewportKlammer(tooltipRef, tooltipWerkzeugId !== null);

  // PB2 (Bauauftrag Punkt 4, E3): der Insel-Wurzelknoten ist der `ref` für
  // BEIDE `useOverlaySchliessen`-Aufrufe unten (Popup/Fenster-Schliessen +
  // Tooltip-Esc) — dieselbe Empfehlung wie `overlay-schliessen.ts`s
  // Rollout-Kommentar («ref = der Insel-Wurzelknoten»).
  const wurzelRef = useRef<HTMLDivElement | null>(null);

  // Timer beim Unmount räumen — kein Leck über Test-/Panel-Wechsel hinweg.
  useEffect(
    () => () => {
      if (rueckklappTimer.current) clearTimeout(rueckklappTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
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

  // PB2 (Bauauftrag Punkt 4, E3 «Insel-Popups/Fenster adoptieren
  // useOverlaySchliessen»): Esc + Aussenklick schliessen ein offenes
  // Popup/Fenster zurück auf `leiste` — der `icX`-Knopf (`schliessePopup
  // OderFenster` oben) bleibt unverändert ein zweiter, direkter Weg. Esc ist
  // IMMER aktiv (kollidiert mit keinem bestehenden Escape-Handler, s.
  // Bauagenten-Bericht); Aussenklick ist es NUR ausserhalb der drei
  // Canvas-Klickketten-Werkzeuge (`AUSSENKLICK_AUSNAHME` oben).
  const popupOderFensterOffen = stufe === 'popup' || stufe === 'fenster';
  useOverlaySchliessen(wurzelRef, schliessePopupOderFenster, {
    esc: popupOderFensterOffen,
    aussenklick: popupOderFensterOffen && !(aktivesWerkzeugId !== null && AUSSENKLICK_AUSNAHME.has(aktivesWerkzeugId)),
  });

  // PB2 (Bauauftrag Punkt 2): derselbe Hook schliesst den Lang-Hover-
  // Tooltip auf Esc — Aussenklick bleibt aus (der Tooltip klappt sowieso
  // schon beim Weg-Hover zu, s. `aufWerkzeugTooltipLeave` unten).
  useOverlaySchliessen(wurzelRef, () => setTooltipWerkzeugId(null), {
    esc: tooltipWerkzeugId !== null,
    aussenklick: false,
  });

  function raeumeTooltipTimer(): void {
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
      tooltipTimer.current = null;
    }
  }

  /** Lang-Hover startet den Tooltip-Timer (§Bauauftrag Punkt 2, ~600ms). */
  function aufWerkzeugTooltipEnter(werkzeugId: string): void {
    raeumeTooltipTimer();
    tooltipTimer.current = setTimeout(() => setTooltipWerkzeugId(werkzeugId), TOOLTIP_VERZOEGERUNG_MS);
  }

  /** Weg-Hover storniert den Timer UND schliesst einen bereits gezeigten Tooltip sofort. */
  function aufWerkzeugTooltipLeave(): void {
    raeumeTooltipTimer();
    setTooltipWerkzeugId(null);
  }

  const aktivesWerkzeug = aktivesWerkzeugId ? werkzeuge.find((w) => w.id === aktivesWerkzeugId) : undefined;
  const label = inselKonfig.label;
  /** PB2 (Bauauftrag Punkt 1): Icon für die Pille dieser Insel — `undefined`
   *  bei Stationen ohne Eintrag (Text-Fallback unten, `label.slice(0,2)`). */
  const PillIcon = ISLAND_PILL_GLYPHEN[island];

  return (
    <div
      ref={wurzelRef}
      className={`isl-root isl-${orientierung} ${inselKonfig.randKlasse}`}
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
          {/* PB2 (Bauauftrag Punkt 1, C-13): die Pille zeigt NUR noch das
              Icon — der Text-Zweiletter-Fallback bleibt für Stationen ohne
              `ISLAND_PILL_GLYPHEN`-Eintrag (E1-Generalisierung, künftige
              PC-Konfigs). */}
          <span className="isl-pill-glyphe" aria-hidden="true">
            {PillIcon ? <PillIcon size={20} /> : label.slice(0, 2)}
          </span>
        </button>
      ) : (
        <div className={`isl-leiste${reduziert ? '' : ' isl-anim-islIn'}`} data-testid={`island-${island}-leiste`}>
          <div className="isl-leiste-kopf">{label}</div>
          <div className="isl-leiste-werkzeuge">
            {sichtbareWerkzeuge.map((w) => (
              <button
                key={w.id}
                type="button"
                className="isl-werkzeug"
                data-testid={`island-werkzeug-${w.id}`}
                aria-pressed={aktivesWerkzeugId === w.id}
                onClick={() => aufWerkzeugKlick(w)}
                onPointerEnter={() => aufWerkzeugTooltipEnter(w.id)}
                onPointerLeave={aufWerkzeugTooltipLeave}
              >
                <span className="isl-werkzeug-glyphe" aria-hidden="true">
                  <WerkzeugGlyphe glyphe={w.glyphe} size={20} />
                </span>
                {/* Der Werkzeug-NAME bleibt als Textzeile unter dem Icon in
                    der Leiste (Bauauftrag Punkt 1) — nur die Pille oben
                    zeigt ausschliesslich das Icon. */}
                <span className="isl-werkzeug-titel">{w.name}</span>
                {/* PB2 (Bauauftrag Punkt 2, D15): Lang-Hover-Tooltip ersetzt
                    den früheren Popup-Hinweisblock — viewport-geklammert
                    (`useViewportKlammer`, dieselbe Technik wie Popup/
                    Fenster), schliesst über Weg-Hover ODER Esc
                    (`useOverlaySchliessen` oben). */}
                {tooltipWerkzeugId === w.id ? (
                  <div
                    ref={tooltipRef}
                    className="isl-werkzeug-tooltip"
                    role="tooltip"
                    data-testid={`island-werkzeug-${w.id}-tooltip`}
                  >
                    {w.name}
                    {w.hinweis ? ` — ${w.hinweis}` : ''}
                  </div>
                ) : null}
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
          {/* PB2 (D15, Bauauftrag Punkt 2): der frühere Katalog-Hinweisblock
              («PD2-Hinweis») + die feste «NOCHMALS KLICKEN → ALLE
              EINSTELLUNGEN»-Zeile sind RAUS — beide sassen im geklammerten
              Popup und konnten am unteren linken Bildschirmrand abgeschnitten
              werden (D15-Fundstelle). Der Hinweistext lebt jetzt im
              Lang-Hover-Tooltip am Werkzeugknopf (s. Leiste oben); der
              «nochmals klicken»-Hinweis war ohnehin nur ein statischer
              Bedienhinweis, kein Werkzeug-Inhalt — das Popup zeigt seither
              NUR noch den echten Stufe-2-Inhalt aus `inhalte/`. */}
          {(() => {
            const Inhalt = inhalte.inhaltFuer(aktivesWerkzeug.id)?.Stufe2;
            return Inhalt ? <Inhalt /> : null;
          })()}
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
            const Inhalt = inhalte.inhaltFuer(aktivesWerkzeug.id)?.Stufe3;
            return Inhalt ? <Inhalt /> : null;
          })()}
          {!inhalte.inhaltFuer(aktivesWerkzeug.id)?.Stufe3 && aktivesWerkzeug.hinweis ? (
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
  /**
   * PC0 v0.8.4 (V084-SPEZ E1): Insel-Konfigs der Station — Default sind die
   * vier design-Inseln (`DESIGN_INSELN`), byte-gleiches Bestandsverhalten.
   * Andere Stationen (PC1/PC3/PC4/PC5) übergeben hier ihren eigenen Satz.
   */
  inseln?: readonly InselKonfig[];
  /** Inhalts-Registry der Station — Default: die design-Registry. */
  registry?: InhaltsRegistry;
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
export function IslandBuehne({ onWerkzeugAktion, inseln = DESIGN_INSELN, registry }: IslandBuehneProps = {}) {
  useZweiFingerUndoGeste();
  return (
    <>
      {inseln.map((konfig) => (
        <IslandShell
          key={konfig.id}
          island={konfig.id}
          konfig={konfig}
          {...(registry ? { registry } : {})}
          {...(onWerkzeugAktion ? { onWerkzeugAktion } : {})}
        />
      ))}
    </>
  );
}
