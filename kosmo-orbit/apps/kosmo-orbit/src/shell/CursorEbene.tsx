import { useEffect, useRef, useState } from 'react';
import { EIGENCURSOR_EINSTELLUNG_EVENT, eigencursorAktiv, useCursorZustand, type CursorZustand } from '../state/cursor-zustand';
import { installiereKosmoZustandSender } from './kosmo-zustand-bruecke';
import { WerkzeugGlyphe, type WerkzeugGlyphenArt } from './werkzeug-glyphen';
import './cursor-ebene.css';

/**
 * CursorEbene (v0.7.2 §8, Paket 08, Stream W3-F) — der eigene Zeiger.
 * App.tsx (fremder Dateibesitz, W2-C) ersetzt EXAKT den Anker-Kommentar
 * `{/* v072: cursor-ebene *}/` durch `<CursorEbene />`, sonst nichts hier.
 *
 * Architektur (Spec §8, wörtlich «drei Schachteln»):
 *  Wrapper (rAF-Translate, NIE React-State pro Frame)
 *   → Rotor (CSS-`transition: transform 140ms --k-ease-entrance`, Winkel
 *     akkumuliert + auf ±180° normalisiert — siehe `naechsterWinkel()` unten
 *     — damit der Browser beim Interpolieren IMMER den kürzeren Weg nimmt,
 *     nie einmal ganz herum)
 *    → SVG-Box (Morph-Kollaps/Entfalten + separat verschachtelt der
 *      Klick-Feder-Pop — "Pop nie auf dem Rotor").
 *
 * Reduced-motion (§0 Regel 4): ALLE Zeitsteuerung dieser Komponente läuft
 * über CSS-Transitions/-Keyframes (`cursor-ebene.css`) — der GLOBALE
 * reduced-motion-Riegel in `aura.css` erzwingt `transition-duration`/
 * `animation-duration` auf 0.01ms `!important` überall. Die JS-Zustands-
 * maschine unten hört ausschliesslich auf `onAnimationEnd` (nie auf einen
 * hartcodierten `setTimeout`), springt darum unter reduced-motion praktisch
 * synchron durch Kollaps→Entfalten — kein Timer wartet je länger, als die
 * tatsächliche (ggf. auf 0.01ms gekürzte) CSS-Dauer tatsächlich braucht.
 * Das ist der "rAF prüft matchMedia selbst"-Vertrag aus Spec §0/§8: hier
 * gibt es keinen JS-Timer, der reduced-motion getrennt prüfen müsste, weil
 * keiner an der echten (ungekürzten) Dauer hängt. Die einzige echte
 * rAF-Schleife (Wrapper-Position) ist selbst keine Animation — sie schreibt
 * pro Frame die aktuelle Zeigerposition, unabhängig von reduced-motion.
 *
 * Zonen (Spec §8): `data-cursor-zone="praezision"|"eigen"` werden NICHT von
 * dieser Komponente gesetzt (fremder Dateibesitz: PlanView/SketchOverlay/
 * NodeCanvas verdrahten das erst in W4-H/Kritik-Auflagen). Solange kein
 * Element diese Attribute trägt, greift eine defensive HEURISTIK:
 *  - Inputs/Textarea/Select/`isContentEditable` ⇒ IMMER Layer aus + Cursor
 *    `auto` (explizite DOM-Prüfung, keine Heuristik).
 *  - `data-cursor-zone="praezision"` (falls vorhanden) ⇒ Fadenkreuz-Morph.
 *  - `data-cursor-zone="eigen"` (falls vorhanden) ⇒ Layer aus.
 *  - SONST: `getComputedStyle(ziel).cursor` — ist er NICHT `auto`/`default`/
 *    `pointer`/leer (z.B. ein Canvas mit eigenem `cursor: crosshair`/`grab`/
 *    `none`), wird das als "Element hat einen eigenen Cursor-Wunsch"
 *    gewertet und der Layer versteckt sich. `pointer` ist BEWUSST von der
 *    Heuristik ausgenommen: `aura.css` setzt `cursor: pointer` auf praktisch
 *    jedem Knopf/Link der ganzen App (KButton, `.k-druck`, …) — das ist nur
 *    "klickbar", kein Canvas/Werkzeug-Signal. Ohne diese Ausnahme würde der
 *    Eigencursor über jedem Knopf verschwinden und in der Praxis kaum je
 *    sichtbar sein. **Ehrliche Grenze:** das bleibt eine Heuristik, kein
 *    Vertrag — ein Canvas, der bewusst `cursor: pointer`/`default`/gar
 *    keinen eigenen Wert setzt, aber trotzdem sein EIGENES Overlay zeichnen
 *    will, wird von dieser Heuristik NICHT erkannt (sieht für uns aus wie
 *    "normales" Element) und bekommt unseren Layer weiterhin obendrauf.
 *    `getComputedStyle` pro `pointermove` ist zudem ein (kleiner) Zusatz-
 *    aufwand — vertretbar für eine rein dekorative Komfort-Ebene, aber kein
 *    Free-Lunch.
 *
 * Harter Vertrag (Spec §11): unter `navigator.webdriver` bleibt die Ebene
 * PER DEFAULT aus (kein `cursor:none`, kein DOM-Overlay) — die ~40 Specs,
 * die `module-design` direkt anklicken, dürfen nie einen unsichtbaren
 * System-Cursor sehen. `window.__kosmoCursor.aktivieren()/deaktivieren()`
 * ist der dokumentierte Test-Pfad, um die Ebene GEZIELT in einer eigenen
 * Spec einzuschalten (siehe `e2e/cursor-ebene.spec.ts`).
 */

const ROTATIONS_SCHWELLE_PX = 3;

function istEingabefeld(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return (el as HTMLElement).isContentEditable === true;
}

/** Heuristik-Grenze: siehe Kopfkommentar oben — bewusst kein Vertrag.
 *  `pointer` zählt NICHT als "eigener Cursor" (das ist nur "klickbar", kein
 *  Canvas/Werkzeug-Signal — sonst verschwände die Ebene über jedem Knopf). */
function hatEigenenComputedCursor(el: Element | null): boolean {
  if (!el) return false;
  try {
    const c = getComputedStyle(el).cursor;
    return c !== '' && c !== 'auto' && c !== 'default' && c !== 'pointer';
  } catch {
    return false;
  }
}

function zoneVon(el: Element | null): 'praezision' | 'eigen' | null {
  const attr = el?.closest('[data-cursor-zone]')?.getAttribute('data-cursor-zone') ?? null;
  return attr === 'praezision' || attr === 'eigen' ? attr : null;
}

/** Δ auf ±180° normalisiert (Spec §8, wörtlich) — damit die CSS-Transition
 *  beim Interpolieren zwischen `vorher` und dem Rückgabewert IMMER den
 *  kürzeren Weg nimmt statt einmal ganz herumzudrehen. `vorher` ist der
 *  AKKUMULIERTE (unbeschränkte) Winkel, `rohesZiel` liegt in (-180, 180]. */
function normalisiereAufPlusMinus180(grad: number): number {
  let g = grad % 360;
  if (g > 180) g -= 360;
  if (g <= -180) g += 360;
  return g;
}
function naechsterWinkel(vorher: number, rohesZiel: number): number {
  const delta = normalisiereAufPlusMinus180(rohesZiel - vorher);
  return vorher + delta;
}

type MorphPhase = 'ruhe' | 'kollaps' | 'entfalten';

interface CursorEbeneTestHook {
  aktivieren: () => void;
  deaktivieren: () => void;
  istAktiv: () => boolean;
}

function ArtValidiert(art: string): WerkzeugGlyphenArt | null {
  const bekannt: readonly string[] = [
    'chat',
    'pipeline',
    'draw',
    'data',
    'viz',
    'publish',
    'prepare',
    'connect',
    'office',
    'zentrale',
    'odysseus',
    'orbit',
    'skizze',
    'lernen',
  ];
  return bekannt.includes(art) ? (art as WerkzeugGlyphenArt) : null;
}

function ZeichneForm({ zustand, tool }: { zustand: CursorZustand; tool: { art: string; rolle?: string } | null }) {
  if (zustand === 'loading') {
    return (
      <svg className="cursor-ebene-svg" width={32} height={32} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle
          className="cursor-ebene-loading-ring"
          cx={16}
          cy={4}
          r={11}
          stroke="var(--k-signal)"
          strokeWidth={2}
          strokeDasharray="8 6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (zustand === 'kosmo') {
    return (
      <svg className="cursor-ebene-svg" width={32} height={32} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx={16} cy={4} r={13} stroke="var(--k-signal)" strokeWidth={1.3} strokeDasharray="2 4.4" opacity={0.6} />
        <circle className="cursor-ebene-kosmo-kern" cx={16} cy={4} r={7} fill="var(--k-signal)" />
      </svg>
    );
  }
  if (zustand === 'tool') {
    const art = tool ? ArtValidiert(tool.art) : null;
    if (art) {
      return (
        <div className="cursor-ebene-tool">
          <WerkzeugGlyphe art={art} size={26} {...(tool?.rolle ? { rolle: tool.rolle } : {})} />
        </div>
      );
    }
    // unbekannte/fehlende Werkzeug-Art: defensiv auf den Standardpfeil zurückfallen
    return <ZeichneForm zustand="default" tool={null} />;
  }
  if (zustand === 'precision') {
    return (
      <svg className="cursor-ebene-svg cursor-ebene-precision" width={32} height={32} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx={16} cy={4} r={13} stroke="var(--k-signal)" strokeWidth={1.3} />
        <path
          d="M16 -11 v6 M16 19 v6 M-1 4 h6 M27 4 h6"
          stroke="var(--k-signal)"
          strokeWidth={1.3}
          strokeLinecap="round"
        />
        <circle cx={16} cy={4} r={1.6} fill="var(--k-signal)" />
      </svg>
    );
  }
  // default: Pfeil (Spec §8, exakter Pfad — Spitze = Hotspot 16,4)
  return (
    <svg className="cursor-ebene-svg cursor-ebene-pfeil" width={32} height={32} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 4 L25 26 Q16 21.5 7 26 Z" fill="var(--kcur-fill)" stroke="var(--k-signal)" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

export function CursorEbene() {
  const storeZustand = useCursorZustand((s) => s.zustand);
  const tool = useCursorZustand((s) => s.tool);

  const [erzwungenAn, setErzwungenAn] = useState(false);
  const [erzwungenAus, setErzwungenAus] = useState(false);
  const [sichtbar, setSichtbar] = useState(false);
  const [versteckt, setVersteckt] = useState(false);
  const [praezision, setPraezision] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const rotorRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: -100, y: -100 });
  const winkelAkkumuliertRef = useRef(0);
  const letzteWinkelPositionRef = useRef<{ x: number; y: number } | null>(null);
  // Refs, die der pointermove-Handler unten synchron lesen/schreiben kann,
  // ohne bei jedem Aufruf einen veralteten Closure-Stand des jeweiligen
  // State zu sehen (der Handler selbst wird nur einmal pro `aktiv`-Wechsel
  // neu registriert, siehe Effect weiter unten).
  const sichtbarRef = useRef(false);
  const versteckterRef = useRef(false);
  const praezisionRef = useRef(false);
  sichtbarRef.current = sichtbar;
  versteckterRef.current = versteckt;
  praezisionRef.current = praezision;

  const effektiverZustand: CursorZustand = praezision ? 'precision' : storeZustand;
  const [angezeigterZustand, setAngezeigterZustand] = useState<CursorZustand>(effektiverZustand);
  const [morphPhase, setMorphPhase] = useState<MorphPhase>('ruhe');
  const zielZustandRef = useRef<CursorZustand>(effektiverZustand);
  const [klickPop, setKlickPop] = useState(false);

  // Test-Hook (Muster wie `window.__kosmoStatus`, `state/kosmo-status.ts`):
  // erlaubt e2e/cursor-ebene.spec.ts, die Ebene GEZIELT ein-/auszuschalten,
  // ohne den Hartvertrag "unter navigator.webdriver per Default aus" zu
  // brechen (Spec §11).
  useEffect(() => {
    const hook: CursorEbeneTestHook = {
      aktivieren: () => {
        setErzwungenAus(false);
        setErzwungenAn(true);
      },
      deaktivieren: () => {
        setErzwungenAn(false);
        setErzwungenAus(true);
      },
      istAktiv: () => aktivRef.current,
    };
    (window as unknown as Record<string, unknown>)['__kosmoCursor'] = hook;
    return () => {
      delete (window as unknown as Record<string, unknown>)['__kosmoCursor'];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // v0.7.2 W4-H (Einstellungs-Verdrahtung): `eigencursorAktiv()` liest
  // `localStorage` nur beim Aufruf — ein Re-Render-Trigger, wenn
  // `Einstellungen.tsx` (fremder Komponentenbaum) den Wert ändert (s.
  // Kopfkommentar `EIGENCURSOR_EINSTELLUNG_EVENT` in `state/cursor-zustand.ts`).
  const [, erzwingeEigencursorNeuLesen] = useState(0);
  useEffect(() => {
    const aufAenderung = () => erzwingeEigencursorNeuLesen((n) => n + 1);
    window.addEventListener(EIGENCURSOR_EINSTELLUNG_EVENT, aufAenderung);
    return () => window.removeEventListener(EIGENCURSOR_EINSTELLUNG_EVENT, aufAenderung);
  }, []);
  const eigencursorEinstellungAn = eigencursorAktiv();
  const webdriverAktiv = typeof navigator !== 'undefined' && navigator.webdriver === true;
  const aktiv = !erzwungenAus && eigencursorEinstellungAn && (erzwungenAn || !webdriverAktiv);
  const aktivRef = useRef(aktiv);
  aktivRef.current = aktiv;

  // Bridge zu Tauri (Paket 07, §9): nur ein no-op ausserhalb von Tauri.
  useEffect(() => installiereKosmoZustandSender(), []);

  useEffect(() => {
    document.documentElement.dataset.eigencursor = aktiv ? 'an' : 'aus';
    return () => {
      delete document.documentElement.dataset.eigencursor;
    };
  }, [aktiv]);

  useEffect(() => {
    if (!aktiv) return;

    function aufPointerBewegung(e: PointerEvent) {
      positionRef.current = { x: e.clientX, y: e.clientY };
      if (!sichtbarRef.current) {
        sichtbarRef.current = true;
        setSichtbar(true);
      }

      const ziel = e.target as Element | null;
      if (istEingabefeld(ziel)) {
        if (!versteckterRef.current) {
          versteckterRef.current = true;
          setVersteckt(true);
        }
        if (praezisionRef.current) {
          praezisionRef.current = false;
          setPraezision(false);
        }
        return;
      }

      const zone = zoneVon(ziel);
      const naechstePraezision = zone === 'praezision';
      const naechstesVersteckt = zone === 'eigen' || (zone === null && hatEigenenComputedCursor(ziel));

      if (naechstesVersteckt !== versteckterRef.current) {
        versteckterRef.current = naechstesVersteckt;
        setVersteckt(naechstesVersteckt);
      }
      if (naechstePraezision !== praezisionRef.current) {
        praezisionRef.current = naechstePraezision;
        setPraezision(naechstePraezision);
      }

      // Rotor-Winkel: nur ab 3px Bewegung seit dem letzten Winkel-Update
      // neu berechnen (Spec §8 "Update ab 3px") — sonst würde Zittern in
      // Mini-Bewegungen den Pfeil ständig neu ausrichten.
      const letzte = letzteWinkelPositionRef.current;
      if (letzte) {
        const dx = e.clientX - letzte.x;
        const dy = e.clientY - letzte.y;
        if (dx * dx + dy * dy >= ROTATIONS_SCHWELLE_PX * ROTATIONS_SCHWELLE_PX) {
          const rohesZiel = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
          winkelAkkumuliertRef.current = naechsterWinkel(winkelAkkumuliertRef.current, rohesZiel);
          letzteWinkelPositionRef.current = { x: e.clientX, y: e.clientY };
          if (rotorRef.current) {
            rotorRef.current.style.transform = `rotate(${winkelAkkumuliertRef.current}deg)`;
          }
        }
      } else {
        letzteWinkelPositionRef.current = { x: e.clientX, y: e.clientY };
      }
    }

    function aufKlick() {
      setKlickPop(true);
    }

    window.addEventListener('pointermove', aufPointerBewegung, { passive: true });
    window.addEventListener('pointerdown', aufKlick, { passive: true });

    let frame = requestAnimationFrame(function schreibePosition() {
      if (wrapperRef.current) {
        const { x, y } = positionRef.current;
        wrapperRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
      frame = requestAnimationFrame(schreibePosition);
    });

    return () => {
      window.removeEventListener('pointermove', aufPointerBewegung);
      window.removeEventListener('pointerdown', aufKlick);
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktiv]);

  // Morph-Zustandsmaschine (Spec §8: Kollaps → Signal-Punkt-Feder → Entfalten).
  useEffect(() => {
    zielZustandRef.current = effektiverZustand;
    if (effektiverZustand !== angezeigterZustand && morphPhase === 'ruhe') {
      setMorphPhase('kollaps');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effektiverZustand]);

  if (!aktiv) return null;

  const morphKlasse =
    morphPhase === 'kollaps'
      ? 'cursor-ebene-morph cursor-ebene-morph--kollaps'
      : morphPhase === 'entfalten'
        ? 'cursor-ebene-morph cursor-ebene-morph--entfalten'
        : 'cursor-ebene-morph';

  return (
    <div
      ref={wrapperRef}
      className={`cursor-ebene-wrapper${versteckt ? ' cursor-ebene--versteckt' : ''}${!sichtbar ? ' cursor-ebene--unsichtbar' : ''}`}
      aria-hidden="true"
      data-testid="cursor-ebene"
    >
      <div ref={rotorRef} className="cursor-ebene-rotor">
        <div
          className={morphKlasse}
          onAnimationEnd={(e) => {
            if (e.animationName === 'k-cursor-kollaps') {
              setAngezeigterZustand(zielZustandRef.current);
              setMorphPhase('entfalten');
            } else if (e.animationName === 'k-cursor-entfalten') {
              setMorphPhase(zielZustandRef.current === angezeigterZustand ? 'ruhe' : 'kollaps');
            }
          }}
        >
          <div
            className={`cursor-ebene-pop${klickPop ? ' cursor-ebene-pop--aktiv' : ''}`}
            onAnimationEnd={(e) => {
              if (e.animationName === 'k-cursor-klick-pop') setKlickPop(false);
            }}
          >
            <ZeichneForm zustand={angezeigterZustand} tool={tool} />
          </div>
        </div>
      </div>
    </div>
  );
}
