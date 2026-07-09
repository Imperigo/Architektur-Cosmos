import { elementFang, magnetFang, type ElementFangKandidaten, type ElementFangPunkt, type FangKandidaten, type Pt } from '@kosmo/kernel';

/**
 * Zeichenhilfen (T3): ArchiCAD-Gefühl beim Setzen von Punkten (Wand, Zone,
 * Volumen, Polygon) — reine Funktionen, unabhängig von React/SVG/three.js,
 * damit sie unit-testbar sind. Die Overlays (Hilfslinien-Kreuz, Fluchtlinien)
 * malen PlanView/Viewport3D aus `fluchtlinien`/`orthoAktiv`.
 *
 * Rangfolge (höchste zuerst):
 *  1. Shift fixiert den Winkel zum letzten Punkt auf ein 45°-Vielfaches
 *     (ortho45) — die Distanz bleibt frei, wie in ArchiCAD/Blender.
 *  2. Element-Fang auf gezeichnete Bauteile (v0.6.4 F4, Owner-Befund):
 *     Wand-/Treppen-Enden, Wandmitten, Stützen, Polygon-Ecken, dann Kanten —
 *     das gebaute Element gewinnt vor dem Tragraster (ArchiCAD-Verhalten);
 *     bei aktiver Ortho-Sperre bleibt er aus, sonst bräche der fixierte Winkel.
 *  3. Der bestehende Stützenraster-Magnet (Kreuzung > Achslinie, derive/fang.ts).
 *  4. Eine Fluchtlinie an einem bestehenden Punkt (gleiches x oder y, z.B.
 *     Wandecke) zieht die Koordinate exakt heran.
 *  5. Sonst das gewöhnliche 250-mm-Raster (Fallback der aufrufenden Stelle).
 */

export interface Fluchtlinie {
  achse: 'x' | 'y';
  wert: number;
}

export interface ZeichenErgebnis {
  p: Pt;
  /** Sichtbare Führungslinien fürs Overlay — leer, wenn Ortho oder Stützenraster gewonnen haben. */
  fluchtlinien: Fluchtlinie[];
  /** Shift hat den Winkel zum letzten Punkt fixiert (fürs Overlay/Statuszeile). */
  orthoAktiv: boolean;
  /** F4: getroffener Element-Fangpunkt — PlanView malt daraus den sichtbaren
   *  Marker (Quadrat=Endpunkt, Kreis=Mitte, Kreuz=Kante). Null, wenn ein
   *  anderer Snap gewonnen hat oder nichts in Reichweite liegt. */
  fang: ElementFangPunkt | null;
}

const WINKEL_SCHRITT = (45 * Math.PI) / 180;

/**
 * ArchiCAD/Blender-Geste: Shift fixiert den Winkel zum Referenzpunkt (letzter
 * gesetzter Punkt der Kette) auf ein Vielfaches von 45° — horizontal, vertikal
 * oder diagonal exakt. Die Distanz zum Cursor bleibt frei.
 */
export function ortho45(ref: Pt, p: Pt): Pt {
  const dx = p.x - ref.x;
  const dy = p.y - ref.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return { x: ref.x, y: ref.y };
  const winkel = Math.round(Math.atan2(dy, dx) / WINKEL_SCHRITT) * WINKEL_SCHRITT;
  return {
    x: Math.round(ref.x + Math.cos(winkel) * dist),
    y: Math.round(ref.y + Math.sin(winkel) * dist),
  };
}

/**
 * Ausrichtung an bestehenden Punkten (Wandecken, Stützen, Zonen-Eckpunkte):
 * liegt eine Kandidaten-Koordinate innerhalb der Toleranz, zieht sie die
 * jeweilige Achse exakt heran und liefert die Fluchtlinie fürs Overlay.
 * Bei mehreren Treffern gewinnt der nächstliegende je Achse (x und y getrennt).
 */
export function fluchtFang(
  p: Pt,
  kandidaten: readonly Pt[],
  toleranzMm: number,
): { p: Pt; fluchtlinien: Fluchtlinie[] } {
  let bestX: { d: number; wert: number } | null = null;
  let bestY: { d: number; wert: number } | null = null;
  for (const k of kandidaten) {
    const dx = Math.abs(k.x - p.x);
    if (dx <= toleranzMm && (!bestX || dx < bestX.d)) bestX = { d: dx, wert: k.x };
    const dy = Math.abs(k.y - p.y);
    if (dy <= toleranzMm && (!bestY || dy < bestY.d)) bestY = { d: dy, wert: k.y };
  }
  const fluchtlinien: Fluchtlinie[] = [];
  if (bestX) fluchtlinien.push({ achse: 'x', wert: bestX.wert });
  if (bestY) fluchtlinien.push({ achse: 'y', wert: bestY.wert });
  return { p: { x: bestX ? bestX.wert : p.x, y: bestY ? bestY.wert : p.y }, fluchtlinien };
}

/**
 * Zeichen-Snap fürs Werkzeug-Gummiband: komponiert Ortho-Sperre, Stützenraster-
 * Magnet und Fluchtlinien zu EINEM Zielpunkt. `rasterRunden` ist der bestehende
 * Fallback (250-mm-Raster) der aufrufenden Stelle — bleibt unverändert, nur der
 * Weg dorthin bekommt die neuen Hilfen vorgeschaltet.
 */
/**
 * V-H1 «Zahlen zur Hand» (v0.6.4, VORFORM-UI-KONZEPT §1.4): während einer
 * laufenden Zeichenkette baut Tippen von Ziffern einen Eingabepuffer auf;
 * Enter setzt den Punkt in der AKTUELLEN Cursor-Richtung mit exakt der
 * getippten Länge (Meter). Pur und ohne DOM — der Aufrufer verdrahtet
 * Fokus-Guard und Punkt-Commit.
 *
 * Rückgabe null = Taste geht diese Funktion nichts an (andere Handler dürfen).
 */
export function masseingabeTaste(
  puffer: string,
  key: string,
): { puffer: string; commit: number | null } | null {
  if (/^[0-9]$/.test(key)) {
    // führende Nullen erlauben (0.5), aber Puffer sinnvoll deckeln
    if (puffer.length >= 7) return { puffer, commit: null };
    return { puffer: puffer + key, commit: null };
  }
  if (key === '.' || key === ',') {
    if (puffer.includes('.')) return { puffer, commit: null };
    return { puffer: (puffer === '' ? '0' : puffer) + '.', commit: null };
  }
  if (key === 'Backspace' && puffer !== '') {
    return { puffer: puffer.slice(0, -1), commit: null };
  }
  if (key === 'Enter' && puffer !== '') {
    const meter = Number.parseFloat(puffer);
    if (Number.isFinite(meter) && meter > 0) return { puffer: '', commit: meter };
    return { puffer: '', commit: null };
  }
  return null;
}

/**
 * V-H1: exakter Punkt in Richtung des Cursors — Referenz = letzter Punkt der
 * Kette, Richtung = ref→cursor (bereits gesnappter Cursor, d.h. Ortho/Fang
 * bestimmen die Richtung, die getippte Zahl die Distanz). Null bei
 * entarteter Richtung (Cursor auf dem Referenzpunkt).
 */
export function punktInRichtung(ref: Pt, cursor: Pt, meter: number): Pt | null {
  const dx = cursor.x - ref.x;
  const dy = cursor.y - ref.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const mm = meter * 1000;
  return { x: Math.round(ref.x + (dx / len) * mm), y: Math.round(ref.y + (dy / len) * mm) };
}

export function zeichenSnap(
  rawP: Pt,
  ref: Pt | null,
  shiftKey: boolean,
  magnet: FangKandidaten | undefined,
  kandidaten: readonly Pt[],
  toleranzMm: number,
  rasterRunden: (p: Pt) => Pt,
  elemente?: ElementFangKandidaten,
): ZeichenErgebnis {
  const orthoAktiv = !!(ref && shiftKey);
  const nachOrtho = orthoAktiv ? ortho45(ref!, rawP) : rawP;

  if (!orthoAktiv && elemente) {
    const treffer = elementFang(nachOrtho, elemente);
    if (treffer) return { p: treffer.p, fluchtlinien: [], orthoAktiv, fang: treffer };
  }

  const magnetTreffer = magnet ? magnetFang(nachOrtho, magnet) : null;
  if (magnetTreffer) return { p: magnetTreffer, fluchtlinien: [], orthoAktiv, fang: null };

  if (!orthoAktiv) {
    const flucht = fluchtFang(nachOrtho, kandidaten, toleranzMm);
    if (flucht.fluchtlinien.length > 0) {
      return { p: flucht.p, fluchtlinien: flucht.fluchtlinien, orthoAktiv, fang: null };
    }
  }

  return { p: rasterRunden(nachOrtho), fluchtlinien: [], orthoAktiv, fang: null };
}
