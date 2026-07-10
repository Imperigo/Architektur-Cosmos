/**
 * Haptik (v0.6.6 / Welle 2 Stream C, MOTION-KONZEPT-066 §6) — kurze, spürbare
 * Vibrations-Impulse für Touch-Geräte: `tick()` (10ms, kurzes Antippen —
 * Werkzeugwechsel, Fang-Einrasten, Longpress-Auslösung) und `bestaetigt()`
 * (12/30/12ms-Muster — eine abgeschlossene Aktion).
 *
 * Streng feature-detected: `navigator.vibrate` fehlt auf Desktop/Tauri (und
 * in vielen Browsern) fast überall — dort passiert bewusst NICHTS, kein
 * Fake-Feedback, kein Fehler, kein Log-Rauschen (Owner-Prinzip «Ehrlichkeit
 * vor Politur»: was die Plattform nicht hergibt, wird nicht vorgetäuscht).
 * `vibrate()` selbst kann laut Spec `false` liefern oder werfen (manche
 * Browser lehnen Aufrufe ausserhalb einer Nutzergeste ab) — beides wird
 * still geschluckt, Haptik ist immer ein Nice-to-have, nie ein Kritischer Pfad.
 */

function kannVibrieren(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function vibrieren(muster: number | number[]): void {
  if (!kannVibrieren()) return;
  try {
    navigator.vibrate(muster);
  } catch {
    /* manche Browser werfen ausserhalb einer Nutzergeste — Haptik ist optional */
  }
}

/** Kurzer Antipp-Impuls (10ms) — Werkzeugwechsel, Fang-Einrasten, Longpress-Auslösung. */
export function tick(): void {
  vibrieren(10);
}

/** Bestätigungs-Muster (12/30/12ms) — eine abgeschlossene Aktion. */
export function bestaetigt(): void {
  vibrieren([12, 30, 12]);
}
