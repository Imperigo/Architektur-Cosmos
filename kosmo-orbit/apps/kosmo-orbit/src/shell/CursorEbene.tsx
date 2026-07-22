import { useEffect, useRef, useState } from 'react';
import {
  EIGENCURSOR_EINSTELLUNG_EVENT,
  eigencursorAktiv,
  formVonComputedCursor,
  useCursorZustand,
  type CursorZustand,
  type ZonenForm,
} from '../state/cursor-zustand';
import { installiereKosmoZustandSender } from './kosmo-zustand-bruecke';
import { WerkzeugGlyphe, type WerkzeugGlyphenArt } from './werkzeug-glyphen';
import './cursor-ebene.css';

/**
 * CursorEbene (v0.7.2 §8, Paket 08, Stream W3-F) — der eigene Zeiger.
 * App.tsx (fremder Dateibesitz, W2-C) ersetzt EXAKT den Anker-Kommentar
 * `{/* v072: cursor-ebene *}/` durch `<CursorEbene />`, sonst nichts hier.
 *
 * Architektur (Spec §8, wörtlich «drei Schachteln»):
 *  Wrapper (direkter translate3d-Style-Write im pointermove, NIE React-State
 *   pro Frame; seit v0.9.1 ohne Dauer-rAF-Schleife — Owner-Punkt «laggt»)
 *   → Rotor (Struktur-Schachtel; die frühere Richtungs-Rotation ist seit
 *     v0.9.0 entfernt — Owner-Punkt 22.07.2026, s. Notiz unten — der Pfeil
 *     steht immer aufrecht, die CSS-Transition bleibt als toter, harmloser
 *     Rest des reduced-motion-Beweises)
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
 * keiner an der echten (ungekürzten) Dauer hängt. Die Wrapper-Position ist
 * selbst keine Animation — der pointermove-Handler schreibt sie direkt als
 * Style (seit v0.9.1 ohne rAF-Zwischenschritt), unabhängig von
 * reduced-motion.
 *
 * Zonen (v0.8.4 PA1, docs/V084-SPEZ.md §2 D1-Fix — ERSETZT die alte
 * Versteck-Heuristik): `data-cursor-zone="praezision"` wird NICHT von dieser
 * Komponente gesetzt (fremder Dateibesitz: PlanView/SketchOverlay
 * verdrahten das, s. W4-H/Kritik-Auflagen) — sie wird hier nur GELESEN.
 *  - Inputs/Textarea/Select/`isContentEditable` ⇒ IMMER Layer aus + Cursor
 *    `auto` (explizite DOM-Prüfung, keine Heuristik) — EINZIGE verbleibende
 *    Versteck-Bedingung, unverändert gegenüber vorher.
 *  - `data-cursor-zone="praezision"` (falls vorhanden) ⇒ `precision`-Morph
 *    (Fadenkreuz, explizite Zonen-Attribut-Zusage der jeweiligen Station).
 *  - SONST: `getComputedStyle(ziel).cursor` wird auf eine `ZonenForm`
 *    GEMAPPT (`formVonComputedCursor`, `state/cursor-zustand.ts`) —
 *    crosshair/grab/grabbing/col-resize/row-resize/not-allowed ergeben je
 *    eine EIGENE gezeichnete Form (`fadenkreuz`/`greifen`/`greift`/`spalte`/
 *    `zeile`/`gesperrt`, s. `ZeichneForm` unten). `auto`/`default`/`pointer`
 *    (und alles sonst Unbekannte) bleiben neutral — der Store-/Morph-
 *    Zustand scheint durch. Die Ebene VERSTECKT sich über keiner dieser
 *    Zonen mehr — sie zeigt statt des System-Zeigers immer eine der eigenen
 *    Formen (D1: "CursorEbene liegt NIE hinter Layern … VERSTECKT sich per
 *    Heuristik" ist damit behoben, nicht nur überlagert).
 *
 *    **Der eigentliche Fund hinter D1** (s. ausführlicher Kommentar bei
 *    `CSS_CURSOR_ZU_FORM` in `state/cursor-zustand.ts`): `cursor` ist eine
 *    VERERBTE CSS-Eigenschaft. `:root[data-eigencursor='an']{cursor:none}`
 *    (`cursor-ebene.css`) liefert darum auf JEDEM Element ohne eigene
 *    Cursor-Regel den COMPUTED Wert `"none"` (live mit Playwright
 *    nachgemessen), NICHT `"auto"`. Die alte Heuristik schloss `"none"`
 *    nicht aus — sie versteckte sich darum nicht nur über den paar
 *    explizit gestylten Zonen, sondern über praktisch jedem unbestylten
 *    Element der ganzen App, während gleichzeitig der System-Zeiger selbst
 *    unsichtbar war (`cursor:none`) — daher das vom Owner beschriebene
 *    "buggt weg" (kein Zeiger sichtbar, nicht nur ein falscher). Die neue
 *    Tabelle in `state/cursor-zustand.ts` kennt nur die sechs vertraglichen
 *    Werte — `"none"` fällt jetzt auf `null` (neutral) zurück.
 *
 *    `data-cursor-zone="eigen"` (NodeCanvas.tsx, fremder Dateibesitz) hat
 *    KEINE Sonderbedeutung mehr — dieser Baustein liest ihn nicht mehr aus.
 *    NodeCanvas' eigener Kopfkommentar dort ("CursorEbene versteckt sich
 *    hier komplett") ist seit diesem Fix nicht mehr aktuell; die Attribut-
 *    Entfernung selbst gehört PC1 (fremder Dateibesitz, W2, Hotspot-Matrix
 *    §5) — ehrliche Grenze dieses Pakets (Dateikreis erlaubt hier keine
 *    NodeCanvas.tsx-Änderung). Auf der blanken Canvas-Fläche (kein eigenes
 *    `cursor` gesetzt) ist der computed Wert ohnehin nur das oben
 *    beschriebene `"none"`-Artefakt ⇒ mappt neu auf neutral/sichtbar statt
 *    auf "Layer aus".
 *
 *    `getComputedStyle` läuft seit v0.9.1 nur noch bei Ziel-Wechsel oder
 *    nach pointerdown/-up (Owner-Punkt «laggt») — nicht mehr bei jeder
 *    Bewegung; Details im Effect-Kommentar unten.
 *
 * Harter Vertrag (Spec §11): unter `navigator.webdriver` bleibt die Ebene
 * PER DEFAULT aus (kein `cursor:none`, kein DOM-Overlay) — die ~40 Specs,
 * die `module-design` direkt anklicken, dürfen nie einen unsichtbaren
 * System-Cursor sehen. `window.__kosmoCursor.aktivieren()/deaktivieren()`
 * ist der dokumentierte Test-Pfad, um die Ebene GEZIELT in einer eigenen
 * Spec einzuschalten (siehe `e2e/cursor-ebene.spec.ts`).
 */

/* v0.9.0 Owner-Punkt 22.07.2026 («entferne wieder das die mausrichtung sich
   dreht, mach die maus wieder normal»): die Richtungs-Rotation des Rotors
   ist ENTFERNT — der Pfeil steht immer aufrecht wie ein System-Zeiger. Die
   Rotor-Schachtel selbst bleibt (Struktur + reduced-motion-Beweis in
   `e2e/cursor-ebene.spec.ts` unverändert), sie dreht nur nie mehr. Die
   frueheren Helfer `normalisiereAufPlusMinus180`/`naechsterWinkel` und die
   3px-Schwelle sind mit der Rotation gefallen. */

function istEingabefeld(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return (el as HTMLElement).isContentEditable === true;
}

/** Zonen-Signal der Elementkette — reiner DOM-Lesezugriff, keine
 *  Interpretation (die Abbildung auf eine `ZonenForm` übernimmt die reine
 *  Funktion `formVonComputedCursor`, `state/cursor-zustand.ts`).
 *
 *  v0.9.0 (Owner-Punkt 22.07.2026 «überall die kosmo maus»): `cursor` wird
 *  seither GLOBAL per `cursor:none !important` erzwungen (`cursor-ebene.
 *  css`) — der computed `cursor` ist damit überall `none` und trägt kein
 *  Zonen-Signal mehr. Die Zonen deklarieren ihre Form deshalb über die
 *  ebenso VERERBTE Custom Property `--k-zeiger` (Spiegel direkt neben der
 *  jeweiligen `cursor:`-Regel, grep `--k-zeiger:`); der computed-cursor-
 *  Fallback bleibt für den Fall, dass die Ebene ohne globales `none` läuft
 *  (z.B. Webdriver-Testpfad). Inline-Setzer (Viewport3D) spiegeln per
 *  `style.setProperty('--k-zeiger', …)`. */
function computedCursorVon(el: Element | null): string {
  if (!el) return '';
  try {
    const stil = getComputedStyle(el);
    const zeiger = stil.getPropertyValue('--k-zeiger').trim();
    return zeiger || stil.cursor;
  } catch {
    return '';
  }
}

/** Nur noch `praezision` hat eine Sonderbedeutung (explizites Zonen-
 *  Attribut, fremder Dateibesitz PlanView/SketchOverlay) — `eigen` wird
 *  bewusst NICHT mehr erkannt (s. Kopfkommentar, D1-Fix). */
function istPraezisionsZone(el: Element | null): boolean {
  return el?.closest('[data-cursor-zone]')?.getAttribute('data-cursor-zone') === 'praezision';
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

/** Fadenkreuz-Geometrie, gemeinsam genutzt von `precision` (explizite
 *  `data-cursor-zone="praezision"`-Zusage, PlanView/SketchOverlay) UND
 *  `fadenkreuz` (v0.8.4 PA1, computed-cursor-Mapping `crosshair` →
 *  `formVonComputedCursor`) — zwei Auslöser, EINE Form (eigener CSS-
 *  Klassenname je Zustand bleibt für E2E-Assertions unterscheidbar). */
function FadenkreuzSvg({ klasse }: { klasse: string }) {
  return (
    <svg className={`cursor-ebene-svg ${klasse}`} width={32} height={32} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx={16} cy={4} r={13} stroke="var(--k-signal)" strokeWidth={1.3} />
      <path d="M16 -11 v6 M16 19 v6 M-1 4 h6 M27 4 h6" stroke="var(--k-signal)" strokeWidth={1.3} strokeLinecap="round" />
      <circle cx={16} cy={4} r={1.6} fill="var(--k-signal)" />
    </svg>
  );
}

/**
 * v0.8.4 PA1 (D1-Fix, docs/V084-SPEZ.md §2 D1 + §3): die sechs neuen
 * Zonen-Formen (`state/cursor-zustand.ts`, `ZonenForm`) — Bauvorschrift wie
 * `modules/design/werkzeug-icons.tsx:21-29`/`shell/werkzeug-glyphen.tsx`
 * ("1.75/24-Strich, runde Kappen/Joins, GENAU EIN Akzent-Punkt"), auf die
 * 32er-Zeichenfläche dieser Datei übertragen (Hotspot weiterhin (16,4) wie
 * beim Pfeil/`precision`/`kosmo` oben — jede Form trägt ihren EINEN
 * Akzent-Punkt exakt dort). `var(--k-danger)` NUR für `gesperrt` (sichtbar
 * "blockiert", dieselbe Gefahrenfarbe wie z.B. `.k-dock-panel-knopf--
 * schliessen`), alle anderen fünf in `var(--k-signal)` wie der Rest der
 * Cursor-Familie.
 */
function GreifenSvg({ geschlossen }: { geschlossen: boolean }) {
  return (
    <svg
      className={`cursor-ebene-svg ${geschlossen ? 'cursor-ebene-greift' : 'cursor-ebene-greifen'}`}
      width={32}
      height={32}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      {geschlossen ? (
        <path d="M9 10 h3 M13 8 h3 M17 8 h3 M21 10 h3" stroke="var(--k-signal)" strokeWidth={1.75} strokeLinecap="round" />
      ) : (
        <path d="M10 12 V7 M14 12 V4 M18 12 V4 M22 12 V7" stroke="var(--k-signal)" strokeWidth={1.75} strokeLinecap="round" />
      )}
      <path
        d="M8 12 v3 a8 8 0 0 0 8 8 a8 8 0 0 0 8 -8 v-3"
        stroke="var(--k-signal)"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={16} cy={4} r={1.7} fill="var(--k-signal)" />
    </svg>
  );
}

function ResizeSvg({ achse }: { achse: 'spalte' | 'zeile' }) {
  const d =
    achse === 'spalte'
      ? 'M6 4 h20 M6 4 l4 -4 M6 4 l4 4 M26 4 l-4 -4 M26 4 l-4 4'
      : 'M16 -6 v20 M16 -6 l-4 4 M16 -6 l4 4 M16 14 l-4 -4 M16 14 l4 -4';
  return (
    <svg className={`cursor-ebene-svg cursor-ebene-${achse}`} width={32} height={32} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d={d} stroke="var(--k-signal)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={16} cy={4} r={1.7} fill="var(--k-signal)" />
    </svg>
  );
}

function GesperrtSvg() {
  return (
    <svg className="cursor-ebene-svg cursor-ebene-gesperrt" width={32} height={32} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx={16} cy={4} r={9} stroke="var(--k-danger)" strokeWidth={1.75} />
      <line x1={10} y1={-2} x2={22} y2={10} stroke="var(--k-danger)" strokeWidth={1.75} strokeLinecap="round" />
      <circle cx={16} cy={4} r={1.7} fill="var(--k-danger)" />
    </svg>
  );
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
    return <FadenkreuzSvg klasse="cursor-ebene-precision" />;
  }
  // v0.8.4 PA1 — die sechs Zonen-Formen (computed-cursor-Mapping, s. Kopfkommentar)
  if (zustand === 'fadenkreuz') {
    return <FadenkreuzSvg klasse="cursor-ebene-fadenkreuz" />;
  }
  if (zustand === 'greifen') {
    return <GreifenSvg geschlossen={false} />;
  }
  if (zustand === 'greift') {
    return <GreifenSvg geschlossen={true} />;
  }
  if (zustand === 'spalte' || zustand === 'zeile') {
    return <ResizeSvg achse={zustand} />;
  }
  if (zustand === 'gesperrt') {
    return <GesperrtSvg />;
  }
  // default: Pfeil (Spec §8, exakter Pfad — Spitze = Hotspot 16,4).
  // v0.9.1 Owner-Punkt 22.07.2026 («der mauszeiger ist nicht schräg»): der
  // Drachen ist um FESTE 15° um den Hotspot gedreht — die vertraute
  // Systemzeiger-Schräge (Körper läuft nach rechts unten), als statisches
  // SVG-Attribut, NICHT als Laufzeit-Rotation (die Richtungs-Rotation bleibt
  // entfernt, s. Kopf-Notiz v0.9.0). Hotspot (16,4) ist Drehpunkt und damit
  // unverändert — Klickziel und Zeichnung bleiben deckungsgleich.
  return (
    <svg className="cursor-ebene-svg cursor-ebene-pfeil" width={32} height={32} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 4 L25 26 Q16 21.5 7 26 Z" transform="rotate(15 16 4)" fill="var(--kcur-fill)" stroke="var(--k-signal)" strokeWidth={1.5} strokeLinejoin="round" />
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
  // v0.8.4 PA1 (D1-Fix) — die computed-cursor-abgeleitete Zonen-Form; `null`
  // heisst "kein Zonen-Signal", der Store-/Morph-Zustand scheint durch.
  const [zonenForm, setZonenForm] = useState<ZonenForm | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: -100, y: -100 });
  // Refs, die der pointermove-Handler unten synchron lesen/schreiben kann,
  // ohne bei jedem Aufruf einen veralteten Closure-Stand des jeweiligen
  // State zu sehen (der Handler selbst wird nur einmal pro `aktiv`-Wechsel
  // neu registriert, siehe Effect weiter unten).
  const sichtbarRef = useRef(false);
  const versteckterRef = useRef(false);
  const praezisionRef = useRef(false);
  const zonenFormRef = useRef<ZonenForm | null>(null);
  sichtbarRef.current = sichtbar;
  versteckterRef.current = versteckt;
  praezisionRef.current = praezision;
  zonenFormRef.current = zonenForm;

  const effektiverZustand: CursorZustand = praezision ? 'precision' : (zonenForm ?? storeZustand);
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

    // v0.9.1 Owner-Punkt 22.07.2026 («er scheint zu laggen … mach die
    // effizienter»): zwei Kostenquellen dieses Handlers sind raus —
    //  1. Die frühere Dauer-rAF-Schleife schrieb den Transform in JEDEM
    //     Frame (auch bei stiller Maus) und immer einen Frame NACH dem
    //     Ereignis. Jetzt schreibt der pointermove-Handler den Transform
    //     direkt — der Browser koalesziert pointermove ohnehin auf den
    //     Frame-Takt (bei 120 Hz also bis 120×/s), der Zeiger folgt ohne
    //     Zusatz-Frame Latenz, und bei stiller Maus arbeitet gar nichts.
    //  2. `getComputedStyle` (die teuerste Zeile hier) läuft nur noch, wenn
    //     sich das Ziel-Element geändert hat oder seit dem letzten Move ein
    //     pointerdown/-up lag (grab→grabbing wechselt die Form auf DEMSELBEN
    //     Element) — nicht mehr bei jeder Bewegung über demselben Element.
    let letztesZiel: Element | null = null;
    let zonenPruefungFaellig = true;

    function aufPointerBewegung(e: PointerEvent) {
      positionRef.current = { x: e.clientX, y: e.clientY };
      if (wrapperRef.current) {
        wrapperRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
      if (!sichtbarRef.current) {
        sichtbarRef.current = true;
        setSichtbar(true);
      }

      const ziel = e.target as Element | null;
      if (ziel === letztesZiel && !zonenPruefungFaellig) return;
      letztesZiel = ziel;
      zonenPruefungFaellig = false;
      if (istEingabefeld(ziel)) {
        // Einzige verbleibende Versteck-Bedingung (unverändert, Spec §8
        // wörtlich) — Eingabefelder behalten IMMER den System-Text-Cursor.
        if (!versteckterRef.current) {
          versteckterRef.current = true;
          setVersteckt(true);
        }
        if (praezisionRef.current) {
          praezisionRef.current = false;
          setPraezision(false);
        }
        if (zonenFormRef.current !== null) {
          zonenFormRef.current = null;
          setZonenForm(null);
        }
        return;
      }
      // Verlässt der Zeiger ein Eingabefeld wieder, muss die Ebene sofort
      // zurück sichtbar werden — sie darf ausserhalb von Eingabefeldern in
      // KEINER Zone mehr verschwinden (v0.8.4 PA1, D1-Fix).
      if (versteckterRef.current) {
        versteckterRef.current = false;
        setVersteckt(false);
      }

      const naechstePraezision = istPraezisionsZone(ziel);
      const naechsteForm = naechstePraezision ? null : formVonComputedCursor(computedCursorVon(ziel));

      if (naechstePraezision !== praezisionRef.current) {
        praezisionRef.current = naechstePraezision;
        setPraezision(naechstePraezision);
      }
      if (naechsteForm !== zonenFormRef.current) {
        zonenFormRef.current = naechsteForm;
        setZonenForm(naechsteForm);
      }

      // Richtungs-Rotation entfernt (Owner-Punkt 22.07.2026, s. Kopf-Notiz):
      // der Pfeil bleibt aufrecht — hier passiert bewusst nichts mehr.
    }

    function aufKlick() {
      zonenPruefungFaellig = true;
      setKlickPop(true);
    }

    // pointerup ändert oft die Zonen-Form auf demselben Element
    // (grabbing→grab nach einem Drag) — nur den Prüf-Merker setzen, die
    // nächste Bewegung liest dann frisch.
    function aufLoslassen() {
      zonenPruefungFaellig = true;
    }

    window.addEventListener('pointermove', aufPointerBewegung, { passive: true });
    window.addEventListener('pointerdown', aufKlick, { passive: true });
    window.addEventListener('pointerup', aufLoslassen, { passive: true });

    // Erstposition einmalig schreiben (Ebene gerade aktiviert, Zeiger steht
    // evtl. schon im Fenster) — vorher erledigte das die rAF-Schleife.
    if (wrapperRef.current) {
      const { x, y } = positionRef.current;
      wrapperRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    return () => {
      window.removeEventListener('pointermove', aufPointerBewegung);
      window.removeEventListener('pointerdown', aufKlick);
      window.removeEventListener('pointerup', aufLoslassen);
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
      <div className="cursor-ebene-rotor">
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
