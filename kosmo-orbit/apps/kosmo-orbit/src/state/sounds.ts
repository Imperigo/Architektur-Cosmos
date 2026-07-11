/**
 * Sounds (v0.7.2 §5, Paket 04) — kurze WebAudio-Oscillator-Envelopes fürs
 * Interaktions-Feedback: `klick` (Fertig), `snap` (Einrasten/Bestätigung),
 * `plopp` (Schlucken — z.B. Charakter-Fenster schliesst, §7/§9) und `wusch`
 * (Losschicken/Dispatching). KEINE Audio-Assets — alles synthetisch erzeugt
 * (Sine/Triangle-Oszillator + Gain-Hüllkurve, 30–120ms, Gain ≤ 0,08).
 *
 * Vorbild `state/haptik.ts`: streng feature-detected, niemals ein Fehler
 * oder Log-Rauschen, wenn WebAudio (noch) nicht verfügbar ist oder der
 * Browser einen Aufruf ausserhalb einer Nutzergeste ablehnt — Sound ist
 * IMMER ein Nice-to-have, nie ein kritischer Pfad (Owner-Prinzip
 * «Ehrlichkeit vor Politur»).
 *
 * Einstellung `kosmo.sounds` (localStorage, `'1'` = an) — Owner-Entscheid
 * 11.07. (V072-SPEZ §0/§5): **Default AUS**. Der Schalter selbst kommt erst
 * mit Stream W4-H (`Einstellungen.tsx`, s. V072-SPEZ §12) — hier wird der
 * Key nur GELESEN, nie ein UI-Schalter dafür gebaut.
 */

type Wellenform = 'sine' | 'triangle';

interface Envelope {
  frequenzHz: number;
  dauerMs: number;
  wellenform: Wellenform;
  /** Spitzen-Gain, hart auf 0.08 gedeckelt (Spec-Obergrenze) — Default 0.08. */
  gain?: number;
}

/** Minimale Typen für den `webkitAudioContext`-Präfix älterer Safari-Versionen. */
interface FensterMitWebkitAudio {
  webkitAudioContext?: typeof AudioContext;
}

let audioCtx: AudioContext | null = null;
let initVersucht = false;

function kannAudio(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as FensterMitWebkitAudio;
  return typeof AudioContext !== 'undefined' || typeof w.webkitAudioContext !== 'undefined';
}

/** Baut den (einzigen) AudioContext lazily — erst beim ersten tatsächlichen Sound-Wunsch. */
function holeContext(): AudioContext | null {
  if (audioCtx) return audioCtx;
  if (initVersucht || !kannAudio()) return null;
  initVersucht = true;
  try {
    const Ctor = typeof AudioContext !== 'undefined' ? AudioContext : (window as unknown as FensterMitWebkitAudio).webkitAudioContext!;
    audioCtx = new Ctor();
  } catch {
    audioCtx = null;
  }
  return audioCtx;
}

/** true, wenn der Mensch Sounds explizit eingeschaltet hat (Default AUS). */
export function sindSoundsAn(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('kosmo.sounds') === '1';
  } catch {
    return false;
  }
}

/** Schreibt `kosmo.sounds` (Einstellungen.tsx, Schalter `einstellung-
 *  sounds») — wirkt sofort, ohne Zutun: `spiele()` liest `sindSoundsAn()`
 *  bei JEDEM Sound-Wunsch frisch (kein gecachter Zustand hier), ein Re-Read-
 *  Mechanismus wie bei `state/cursor-zustand.ts` ist darum nicht nötig. */
export function setSoundsAn(an: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem('kosmo.sounds', an ? '1' : '0');
  } catch {
    /* localStorage kann in seltenen Umgebungen werfen — Einstellung ist optional */
  }
}

function spiele(env: Envelope): void {
  if (!sindSoundsAn()) return;
  const ctx = holeContext();
  if (!ctx) return;
  // Browser suspendieren den AudioContext bis zur ersten Nutzergeste —
  // `resume()` ist auch danach harmlos (no-op, wenn schon 'running').
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {
      /* Geste fehlt noch — der nächste Sound-Wunsch versucht es erneut */
    });
  }
  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = env.wellenform;
    osc.frequency.setValueAtTime(env.frequenzHz, ctx.currentTime);
    const gainSpitze = Math.min(env.gain ?? 0.08, 0.08);
    const dauerS = env.dauerMs / 1000;
    // Kurze lineare Attack (schützt vor Klick-Artefakten bei t=0), dann
    // exponentieller Decay auf (praktisch) Null — klassische Perkussions-
    // Hüllkurve für ein 30–120ms-Feedback-Geräusch.
    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(gainSpitze, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dauerS);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dauerS + 0.02);
  } catch {
    /* WebAudio kann trotz Feature-Detection in seltenen Umgebungen werfen — Sound ist optional */
  }
}

/** Heller, kurzer Klick — Kosmo-Zustand «Fertig» (`KosmoOrb` §6 Punkt 6). */
export function klick(): void {
  spiele({ frequenzHz: 880, dauerMs: 60, wellenform: 'sine' });
}

/** Kurzes «Einrasten» — Bestätigung/Erfolg (§5 Erfolgs-Pop-Begleitton). */
export function snap(): void {
  spiele({ frequenzHz: 660, dauerMs: 40, wellenform: 'triangle' });
}

/** Weicher, tiefer «Schluck»-Ton — z.B. Charakter-Fenster schliesst (§7/§9). */
export function plopp(): void {
  spiele({ frequenzHz: 220, dauerMs: 120, wellenform: 'sine' });
}

/** Kurzes «Wusch» — z.B. Losschicken/Dispatching (§6 Punkt 5). */
export function wusch(): void {
  spiele({ frequenzHz: 440, dauerMs: 90, wellenform: 'triangle' });
}
