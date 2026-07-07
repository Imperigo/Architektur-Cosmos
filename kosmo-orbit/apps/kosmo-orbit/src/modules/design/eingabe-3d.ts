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
}

/**
 * Serie J / J1b — Gesten-Detektor als reiner Zustandsautomat (Muster A4): wird
 * mit PointerSamples gefüttert und meldet Tap / Doppel-Tap / Long-Press. Kein
 * DOM, kein Timer — die Zeit kommt als Parameter herein (`pruefeLongPress`
 * ruft der Aufrufer aus dem Renderloop mit `performance.now()`). Mehr als ein
 * gleichzeitiger Pointer (Pinch) bricht die Tap-/Long-Press-Erkennung ab.
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
      if (e.typ === 'cancel' || mehrfach || bewegt || !warAktiv) return {};
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
