/**
 * Serie J / J1+J2 — einheitliches Eingabemodell Touch ↔ Maus fürs 3D.
 *
 * Einzige Quelle der Wahrheit für die Kamera-Belegung. Viewport3D ist der dünne
 * Adapter: er füttert camera-controls und übersetzt die abstrakte `KameraAktion`
 * an genau einer Stelle in `CameraControls.ACTION.*`. Diese Datei bleibt
 * three-/DOM-frei und ist damit ohne WebGL/Touch unit-testbar (Muster A4,
 * `sketch-3d.ts`).
 *
 * Grundsatz: Orbit/Pan/Zoom/Fokus sind EINE Kamera-Logik; Touch und Maus sind
 * nur verschiedene Zeilen derselben Belegungstabelle. Wer zwischen iPad-Finger,
 * Trackpad und Maus wechselt, findet sich sofort zurecht.
 */

export type NavModus = 'orbit' | 'pan' | 'zoom';

/** Abstrakte Kamera-Aktion — an der Naht auf `CameraControls.ACTION` gemappt. */
export type KameraAktion = 'rotate' | 'truck' | 'dolly' | 'none';

const NAV_AKTION: Record<NavModus, KameraAktion> = {
  orbit: 'rotate',
  pan: 'truck',
  zoom: 'dolly',
};

export interface MausBelegung {
  /** Linker Klick folgt dem gewählten Werkzeug-/NavLeiste-Modus. */
  left: KameraAktion;
  /** Mitteltaste = Orbit; Shift+Mitte = Pan (Blender/ArchiCAD-Muskelgedächtnis). */
  middle: KameraAktion;
  /** Rechte Taste bleibt Pan (bestehend, kein Funktionsverlust). */
  right: KameraAktion;
}

/**
 * Maus-Belegung. `left` folgt dem NavModus (Default Orbit, damit Trackpad ohne
 * Mitteltaste bedienbar bleibt); `middle` ist Orbit, mit Shift Pan; `right`
 * ist immer Pan. Rad = Zoom-zum-Cursor liegt in camera-controls (`dollyToCursor`)
 * und braucht keine Modus-Belegung.
 */
export function mausBelegung(navModus: NavModus, shiftKey: boolean): MausBelegung {
  return {
    left: NAV_AKTION[navModus],
    middle: shiftKey ? 'truck' : 'rotate',
    right: 'truck',
  };
}

export interface TouchBelegung {
  /** 1 Finger = Orbit um den Pivot. */
  one: KameraAktion;
  /** 2 Finger = Pan + Pinch-Zoom zugleich (Zoom zum Pinch-Zentrum). */
  two: 'dollyTruck';
  /** 3 Finger = reines Pan. */
  three: KameraAktion;
}

/**
 * Touch-Belegung (Tabelle 1.1). Bewusst KEIN 2-Finger-Twist-Rotate: das
 * kollidiert mit dem 1-Finger-Orbit und stört am Gerät als versehentliches
 * Verdrehen — das stabile, erwartbare Muster (1 Orbit · 2 Pan/Zoom · 3 Pan)
 * trägt besser.
 */
export function touchBelegung(): TouchBelegung {
  return { one: 'rotate', two: 'dollyTruck', three: 'truck' };
}

/**
 * Pencil-Trennung — darf camera-controls dieses Pointer-Event fürs Navigieren
 * verarbeiten?
 *   - `pen`   → false: der Stift zeichnet IMMER, navigiert NIE.
 *   - `touch` → true:  der Finger navigiert IMMER — auch im Skizzenmodus
 *                       (der Skizzier-Weg ignoriert Touch entsprechend).
 *   - Maus    → ausserhalb des Skizzenmodus true (alle Tasten navigieren wie
 *                       gehabt); im Skizzenmodus false NUR für die linke Taste
 *                       (Button 0 zeichnet), true für Mitte/Rechts/Rad, damit
 *                       die Kamera am Trackpad/der Maus bedienbar bleibt.
 *
 * Viewport3D setzt daraus `controls.enabled` je Geste (im Capture-Phase-
 * `pointerdown`), statt die Kamera im Skizzenmodus hart abzuschalten — so
 * navigiert der Finger, während der Stift zeichnet.
 */
export function kameraDarfSehen(pointerType: string, button: number, sketchMode: boolean): boolean {
  if (pointerType === 'pen') return false;
  if (pointerType === 'touch') return true;
  // Maus (oder unbekannt): im Skizzenmodus zeichnet nur die linke Taste.
  if (sketchMode) return button !== 0;
  return true;
}

/**
 * Serie J / J2 — Kontextcursor je Werkzeug/Modus (CSS-`cursor`-Wert). Zeigt vor
 * dem Klick, was er täte: Zeichnen/Skizzieren = Fadenkreuz, Auswahl = Zeiger,
 * Pan-Modus = Greifhand. Reine Funktion, three-/DOM-frei testbar.
 */
export function werkzeugCursorFuer(tool: string, navModus: NavModus): string {
  if (navModus === 'pan') return 'grab';
  if (tool === 'auswahl') return 'default';
  if (tool === 'skizze') return 'crosshair';
  // alle übrigen sind Zeichen-/Setz-Werkzeuge (Wand/Zone/Volumen/Dach/…).
  return 'crosshair';
}

// Serie J / J1b — Gesten-Schwellen (px/ms).
export const KLICK_RADIUS_PX = 4;
export const DOPPELTAP_MS = 300;
export const DOPPELTAP_RADIUS_PX = 24;
export const LONGPRESS_MS = 500;
export const LONGPRESS_RADIUS_PX = 8;

// v0.6.6 / Welle 2 Stream C (MOTION-KONZEPT-066 §5) — Swipe-Schwellen: 40px
// Mindeststrecke UND 0.5 px/ms Mindestgeschwindigkeit, sonst zählt die Geste
// als reines Ziehen, kein Swipe.
export const SWIPE_MIN_PX = 40;
export const SWIPE_MIN_GESCHWINDIGKEIT = 0.5; // px/ms

// v0.6.6 / Welle 2 Stream C — Fling/Momentum-Konstanten (§5): Dämpfung 0.95
// je 60Hz-Frame (~16.6667ms), Stopp unter 0.02 px/ms. Das Geschwindigkeits-
// fenster (letzte ~80ms Bewegung vor dem Loslassen) sammelt der `flingTracker`.
export const FLING_DAEMPFUNG = 0.95;
export const FLING_STOPP_GESCHWINDIGKEIT = 0.02; // px/ms
export const FLING_SAMPLE_FENSTER_MS = 80;
const FLING_FRAME_MS = 1000 / 60; // Bezugsrahmen für die 0.95-Dämpfung/Frame

export type SwipeRichtung = 'links' | 'rechts' | 'hoch' | 'runter';

export interface PointerSample {
  typ: 'down' | 'move' | 'up' | 'cancel';
  t: number;
  x: number;
  y: number;
  pointerId: number;
  pointerType: string;
}

/** Was der Detektor bei `ereignis()`/`pruefeLongPress()` meldet. */
export interface GestenEreignis {
  tap?: { x: number; y: number };
  doppelTap?: { x: number; y: number };
  longPress?: { x: number; y: number };
  /** Serie J / Welle 2 Stream C: schnelles, gerades Ziehen über die Schwelle
   *  (Richtung + tatsächliche Geschwindigkeit px/ms). Feuert NUR beim Loslassen,
   *  zusätzlich zum (weiterhin fehlenden) Tap — bewegte Gesten melden nie einen Tap. */
  swipe?: { richtung: SwipeRichtung; geschwindigkeit: number };
}

/**
 * Serie J / J1b — Gesten-Detektor als reiner Zustandsautomat (Muster A4): wird
 * mit PointerSamples gefüttert und meldet Tap / Doppel-Tap / Long-Press / Swipe.
 * Kein DOM, kein Timer — die Zeit kommt als Parameter herein (`pruefeLongPress`
 * ruft der Aufrufer aus dem Renderloop mit `performance.now()`). Mehr als ein
 * gleichzeitiger Pointer (Pinch) bricht die Tap-/Long-Press-/Swipe-Erkennung
 * ab. Touch UND Maus füttern denselben Automaten mit denselben Konstanten
 * (§5 «ein Kern») — ein `pointerType: 'mouse'`-Sample braucht keine eigene
 * Fassung; `PlanView.tsx` speist hier auch Maus-Doppelklicks/-Longpress ein.
 */
export function gestenDetektor(): {
  ereignis(e: PointerSample): GestenEreignis;
  pruefeLongPress(tJetzt: number): GestenEreignis;
} {
  let downX = 0;
  let downY = 0;
  let downT = 0;
  let downId = -1;
  let bewegt = false; // über KLICK_RADIUS hinaus bewegt
  let aktiv = false; // genau ein Pointer unten
  let mehrfach = false; // zweiter Pointer war unten → keine Geste
  let longPressGefeuert = false;
  let letzterTapX = 0;
  let letzterTapY = 0;
  let letzterTapT = -Infinity;

  return {
    ereignis(e: PointerSample): GestenEreignis {
      if (e.typ === 'down') {
        if (aktiv) {
          // zweiter Finger → Pinch, keine Tap-/Long-Press-Geste
          mehrfach = true;
          return {};
        }
        aktiv = true;
        mehrfach = false;
        bewegt = false;
        longPressGefeuert = false;
        downX = e.x;
        downY = e.y;
        downT = e.t;
        downId = e.pointerId;
        return {};
      }
      if (e.typ === 'move') {
        if (aktiv && e.pointerId === downId && Math.hypot(e.x - downX, e.y - downY) > KLICK_RADIUS_PX) {
          bewegt = true;
        }
        return {};
      }
      // up | cancel
      if (e.pointerId !== downId) return {};
      const warAktiv = aktiv;
      aktiv = false;
      if (e.typ === 'cancel' || mehrfach || !warAktiv) return {};
      if (bewegt) {
        // Swipe: gerades, schnelles Ziehen ECHT über die Schwelle (strikt
        // > 40px, nicht nur erreicht) — bewegte Gesten melden weiterhin NIE
        // einen Tap (kein Verhaltenswechsel für bestehende Ziehen-/Zeichnen-
        // Pfade, nur ein zusätzliches Signal oberhalb der bisherigen
        // Bewegt-Schwelle `KLICK_RADIUS_PX`). Die strikte Ungleichung hält
        // den bestehenden Vertrag "40px/60ms bewegt = kein Tap, {}" intakt.
        const dx = e.x - downX;
        const dy = e.y - downY;
        const dt = e.t - downT;
        const dist = Math.hypot(dx, dy);
        if (dt > 0 && dist > SWIPE_MIN_PX) {
          const v = dist / dt;
          if (v >= SWIPE_MIN_GESCHWINDIGKEIT) {
            const richtung: SwipeRichtung =
              Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'rechts' : 'links') : dy > 0 ? 'runter' : 'hoch';
            return { swipe: { richtung, geschwindigkeit: v } };
          }
        }
        return {};
      }
      // Tap: kurz, kaum bewegt.
      const istDoppel =
        e.t - letzterTapT <= DOPPELTAP_MS &&
        Math.hypot(e.x - letzterTapX, e.y - letzterTapY) <= DOPPELTAP_RADIUS_PX;
      letzterTapX = e.x;
      letzterTapY = e.y;
      letzterTapT = e.t;
      if (istDoppel) {
        letzterTapT = -Infinity; // ein Doppel-Tap verbraucht den vorherigen
        return { doppelTap: { x: e.x, y: e.y } };
      }
      return { tap: { x: e.x, y: e.y } };
    },
    pruefeLongPress(tJetzt: number): GestenEreignis {
      if (aktiv && !mehrfach && !bewegt && !longPressGefeuert && tJetzt - downT >= LONGPRESS_MS) {
        longPressGefeuert = true;
        return { longPress: { x: downX, y: downY } };
      }
      return {};
    },
  };
}

/** Geschwindigkeitsvektor in px/ms (Bildschirmraum). */
export interface FlingVektor {
  vx: number;
  vy: number;
}

/**
 * Serie J / Welle 2 Stream C (MOTION-KONZEPT-066 §5) — Ein Dämpfungsschritt
 * des Fling/Momentum: Faktor `FLING_DAEMPFUNG` (0.95) bezogen auf einen
 * 60Hz-Frame (~16.6667ms), auf das tatsächliche `dt` skaliert (rAF liefert
 * selten exakt 16.6667ms). Fällt die resultierende Geschwindigkeit unter
 * `FLING_STOPP_GESCHWINDIGKEIT`, ist der Fling vorbei (`null` statt eines
 * de-facto-Stillstands, den der Aufrufer sonst extra prüfen müsste). Reine
 * Funktion — kein `requestAnimationFrame`, kein DOM; der Aufrufer (PlanView)
 * ruft sie je Frame mit der zuletzt aktuellen Geschwindigkeit und dem
 * gemessenen `dt` seit dem letzten Frame.
 */
export function flingSchritt(v: FlingVektor, dt: number): FlingVektor | null {
  if (dt <= 0) return v;
  const faktor = Math.pow(FLING_DAEMPFUNG, dt / FLING_FRAME_MS);
  const vx = v.vx * faktor;
  const vy = v.vy * faktor;
  if (Math.hypot(vx, vy) < FLING_STOPP_GESCHWINDIGKEIT) return null;
  return { vx, vy };
}

/**
 * v0.8.1 / P4 (Owner-Auftrag §1.6, P2-Übergabe aus der v0.8.1/P2-Technik-
 * Härtung, `e2e/kurztasten-pan.spec.ts` Fling-Test): TEST-ONLY Überschreibung
 * des Sample-Fensters. Produktions-Default bleibt `FLING_SAMPLE_FENSTER_MS`
 * (80ms, UNVERÄNDERT) — `flingTracker()` ohne Argument nutzt weiterhin exakt
 * diesen Wert, kein Verhaltenswechsel für `PlanView.tsx` (ruft `flingTracker()`
 * ohne Parameter auf, ausserhalb des Dateikreises dieses Pakets).
 *
 * Hintergrund (HEAD-bewiesen, s. `kurztasten-pan.spec.ts`-Kopfkommentar am
 * Fling-Test): einzeln awaitete `page.mouse.move()`-Aufrufe landen in dieser
 * Cloud-Umgebung real ~100–250ms auseinander (CDP-Roundtrip) — WEIT über den
 * 80ms des Produktions-Fensters. Der Vorbestand kompensierte das mit einer
 * bis zu 6-fachen Wiederholschleife (mehr/dichtere `mouse.move`-Zwischen-
 * schritte je Versuch), bis zufällig ein <80ms-Probenpaar traf. Diese
 * Überschreibung erlaubt der E2E-Spec stattdessen, das Fenster GEZIELT zu
 * weiten (`setFlingSampleFensterMsFuerTests`, Browser-Testhook
 * `window.__kosmoFling`, Muster `window.__kosmoUiBefehle` in
 * `state/dock-befehle.ts`) — die Retry-Schleife kann dadurch schrumpfen statt
 * auf reinem Zufall zu beruhen. Wirkt NUR auf `flingTracker()`-Instanzen ohne
 * expliziten Parameter (s.u.) und wird live in `sample()` gelesen (nicht bei
 * `flingTracker()`-Aufruf eingefroren) — betrifft darum auch einen VOR dem
 * Testhook-Aufruf bereits erzeugten Tracker (z.B. `PlanView.tsx`s
 * `flingRef.current`, der beim ersten Render entsteht).
 */
let fensterMsUeberschreibungFuerTests: number | null = null;

/** Test-Hook: weitet (oder engt) das Fling-Sample-Fenster für ALLE künftigen
 *  `sample()`-Aufrufe, unabhängig davon, wann der jeweilige `flingTracker()`
 *  erzeugt wurde. `null`/`resetFlingSampleFensterMsFuerTests()` stellt den
 *  Produktions-Default (`FLING_SAMPLE_FENSTER_MS`) wieder her. */
export function setFlingSampleFensterMsFuerTests(ms: number): void {
  fensterMsUeberschreibungFuerTests = ms;
}

/** Test-Hook: hebt die Überschreibung auf — künftige `sample()`-Aufrufe ohne
 *  expliziten `flingTracker(fensterMs)`-Parameter nutzen wieder den echten
 *  Produktions-Default `FLING_SAMPLE_FENSTER_MS`. */
export function resetFlingSampleFensterMsFuerTests(): void {
  fensterMsUeberschreibungFuerTests = null;
}

// Browser-Testhook (Playwright), Muster `window.__kosmoUiBefehle`
// (`state/dock-befehle.ts`) — nur gesetzt, wenn `window` existiert (Vitest/
// Node-Umgebungen ohne jsdom bleiben unberührt, `typeof window`-Guard wie
// dort). Reines Test-Werkzeug, kein Produktionspfad ruft dies auf.
if (typeof window !== 'undefined') {
  (window as never as Record<string, unknown>)['__kosmoFling'] = {
    setSampleFensterMs: (ms: number) => setFlingSampleFensterMsFuerTests(ms),
    resetSampleFensterMs: () => resetFlingSampleFensterMsFuerTests(),
  };
}

/**
 * Serie J / Welle 2 Stream C — Loslass-Geschwindigkeit aus den Samples der
 * letzten `FLING_SAMPLE_FENSTER_MS` (~80ms) vor dem Loslassen: eine kleine,
 * DOM-freie Ringpuffer-Sammlung, die der Aufrufer (PlanView) während einer
 * Pan-Geste (Maus-Drag ODER Touch-Zwei-Finger-Pan) mit `sample(t, x, y)`
 * füttert — bei jedem `pointermove`. `loslassGeschwindigkeit()` liefert beim
 * Loslassen die mittlere Geschwindigkeit über das Fenster (älteste vs.
 * neueste Probe im Fenster), `null` ohne genug Daten (kein Fling).
 *
 * v0.8.1 / P4: optionaler `fensterMs`-Parameter (Test-Hook/Unit-Test-
 * Konfigurierbarkeit, s.o.) — fehlt er (jeder bestehende Aufrufer, allen
 * voran `PlanView.tsx`), gilt weiterhin exakt der Produktions-Default
 * `FLING_SAMPLE_FENSTER_MS` (80ms, UNVERÄNDERT), sofern kein E2E-Testhook
 * (`window.__kosmoFling`) das Fenster überschrieben hat.
 */
export function flingTracker(fensterMs?: number): {
  sample(t: number, x: number, y: number): void;
  reset(): void;
  loslassGeschwindigkeit(): FlingVektor | null;
} {
  let proben: { t: number; x: number; y: number }[] = [];
  return {
    sample(t, x, y) {
      proben.push({ t, x, y });
      const aktivesFenster = fensterMs ?? fensterMsUeberschreibungFuerTests ?? FLING_SAMPLE_FENSTER_MS;
      const grenze = t - aktivesFenster;
      // Chronologisch sortierte Proben — von vorn abschneiden reicht.
      while (proben.length > 1 && proben[0]!.t < grenze) proben.shift();
    },
    reset() {
      proben = [];
    },
    loslassGeschwindigkeit(): FlingVektor | null {
      if (proben.length < 2) return null;
      const erste = proben[0]!;
      const letzte = proben[proben.length - 1]!;
      const dt = letzte.t - erste.t;
      if (dt <= 0) return null;
      return { vx: (letzte.x - erste.x) / dt, vy: (letzte.y - erste.y) / dt };
    },
  };
}
