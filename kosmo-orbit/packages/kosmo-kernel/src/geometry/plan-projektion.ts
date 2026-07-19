import type { Pt } from '../model/units';

/**
 * Plan-Projektions-Util (E2, V087-SPEZ `docs/V087-SPEZ.md` §3 D4/E2) — EINE
 * Wahrheit für die App-seitigen Öffnungs-Griffe
 * (`apps/kosmo-orbit/src/modules/design/PlanView.tsx` und byte-identisch
 * `DesignWorkspace.tsx`, dort für die Live-Vorschau bzw. den Commit) UND für
 * `oeffnungWeltpos` (`apps/kosmo-orbit/src/modules/design/plan-hit-test.ts`,
 * Umkehrfunktion). Herkunft: `PlanView.tsx:59-68` (`projiziereOeffnungCenter`,
 * seit v0.8.6 E5 «Öffnungs-Griff») und `PlanView.tsx:74-78`
 * (`wandAchsenPunkt`) — hier byte-genau (Rundung/Clamp unverändert)
 * hierher gezogen, damit es nur noch EINE Formel statt zweier gepflegter
 * Kopien gibt (Sanktion 3: 1 mm Abweichung = ungültig). Die App-seitigen
 * Duplikate selbst fallen in PA4 (Fable), nicht in diesem Paket.
 */

/**
 * Projiziert einen Weltpunkt auf die Achse einer Wand und clampt das
 * Ergebnis gegen `width/2 … wandLaenge−width/2` — dieselben Grenzen wie
 * `planeOeffnungsBilanz` im Kernel (`commands/design.ts`, E1).
 */
export function projiziereOeffnungCenter(wall: { a: Pt; b: Pt }, width: number, p: Pt): number {
  const dx = wall.b.x - wall.a.x;
  const dy = wall.b.y - wall.a.y;
  const len = Math.hypot(dx, dy);
  const halbeBreite = width / 2;
  if (len === 0) return halbeBreite;
  const roh = ((p.x - wall.a.x) * dx + (p.y - wall.a.y) * dy) / len;
  const obereGrenze = Math.max(halbeBreite, len - halbeBreite);
  return Math.round(Math.min(Math.max(roh, halbeBreite), obereGrenze));
}

/** Weltpunkt auf der Wandachse a→b für ein gegebenes `center` (mm ab a) —
 *  dieselbe Formel wie `oeffnungWeltpos` in `plan-hit-test.ts`, hier
 *  parametrisiert nutzbar (Live-Vorschau mit einem NOCH nicht gespeicherten
 *  Center-Wert, statt `o.center` aus dem Doc). */
export function wandAchsenPunkt(wall: { a: Pt; b: Pt }, center: number): Pt {
  const dx = wall.b.x - wall.a.x;
  const dy = wall.b.y - wall.a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: wall.a.x + (dx / len) * center, y: wall.a.y + (dy / len) * center };
}
