/**
 * Onboarding Schritt 02 «Kosmo-Zentrale koppeln» (v0.7.7 Stream B2) — echte
 * Hilfsfunktionen statt Attrappe: ein `/health`-Ping, der die ECHTEN Felder
 * der Bridge-Antwort liefert (kein erfundenes «GPU 24 GB»), plus derselbe
 * QR-Pairing-Link wie das bestehende «iPad koppeln» (`App.tsx`, P4
 * QR-Pairing) — hier NICHT neu erfunden, nur wiederverwendet: exakt dasselbe
 * `#sync=…&raum=…&token=…`-Fragment, das `App.tsx` beim Laden bereits
 * auswertet (Hash-Aufräumen + Auto-Connect), also funktioniert ein Scan von
 * hier aus genauso wie der bestehende Pairing-Weg — ohne `App.tsx`
 * anzufassen.
 */
import { BridgeHealth } from '@kosmo/contracts';
import { STANDARD_SYNC_URL } from '@kosmo/ai';
import { qrSvg } from '../state/qr';

export interface ZentralePing {
  /** War der `/health`-Endpunkt erreichbar (HTTP ok)? */
  ok: boolean;
  /** Echt geparste Health-Antwort — `null`, wenn nicht erreichbar ODER die
   * Antwort nicht zum Contract passt (dann ehrlich ohne Detailfelder, nie
   * mit erfundenen Werten aufgefüllt). */
  health: BridgeHealth | null;
}

/** Live-Ping mit Timeout — dieselbe 1400ms-Grenze wie die übrigen
 * Erreichbarkeits-Prüfungen im Wizard (`pruefeErreichbar`), zusätzlich mit
 * echtem JSON-Parse der `/health`-Antwort für die ehrlichen Detailfelder. */
export async function pingeZentrale(url: string): Promise<ZentralePing> {
  if (!url) return { ok: false, health: null };
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 1400);
    const res = await fetch(`${url.replace(/\/$/, '')}/health`, { signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return { ok: false, health: null };
    let health: BridgeHealth | null = null;
    try {
      const roh = (await res.json()) as unknown;
      const geprueft = BridgeHealth.safeParse(roh);
      if (geprueft.success) health = geprueft.data;
    } catch {
      // Antwort kein gültiges JSON — Bridge gilt trotzdem als erreichbar,
      // nur ohne Detailfelder (ehrlich: nichts erfinden).
    }
    return { ok: true, health };
  } catch {
    return { ok: false, health: null };
  }
}

/** Dienste-Zeile aus der echten Health-Antwort — nur was tatsächlich an ist,
 * nie ein vorgetäuschter Wert, wenn die Antwort fehlt. */
export function diensteZeile(health: BridgeHealth | null): string {
  if (!health) return 'kommt mit deiner Zentrale';
  const an = Object.entries(health.services)
    .filter(([, v]) => v)
    .map(([name]) => name);
  return an.length ? an.join(', ') : '— keine Dienste erreichbar —';
}

/** GPU-Zeile — die Bridge liefert dieses Feld nur, wenn es einen echten
 * (oder im Fake-Modus ehrlich benannten) GPU-Status gibt. Fehlt es, wird
 * NICHTS erfunden («GEFUNDEN KZ-24 / GPU 24 GB» gibt es hier nicht) —
 * stattdessen der ehrliche Hinweis, dass das Feld mit der Zentrale kommt. */
export function gpuZeile(health: BridgeHealth | null): string {
  if (!health?.gpu) return 'kommt mit deiner Zentrale';
  const { name, idle } = health.gpu;
  const zustand = idle === undefined ? '' : idle ? ' · Leerlauf' : ' · belegt';
  return `${name ?? 'unbenannt'}${zustand}`;
}

/** Derselbe Pairing-Link wie das bestehende «iPad koppeln» (App.tsx): das
 * URL-Fragment trägt Sync-Adresse, Raum und optionalen Token — nie in
 * Server-Logs. `App.tsx` liest `#sync=…` bereits beim Laden aus und
 * verbindet automatisch; ein Scan von hier profitiert davon, ohne dass
 * dieser Wizard selbst irgendetwas verbindet. */
export function zentralePairingLink(): string {
  const syncUrl = localStorage.getItem('kosmo.sync.url') ?? STANDARD_SYNC_URL;
  const syncRoom = localStorage.getItem('kosmo.sync.room') ?? 'projekt-1';
  const syncToken = (localStorage.getItem('kosmo.sync.token') ?? '').trim();
  const basis = `${window.location.origin}${window.location.pathname}`;
  return `${basis}#sync=${encodeURIComponent(syncUrl)}&raum=${encodeURIComponent(syncRoom)}${
    syncToken ? `&token=${encodeURIComponent(syncToken)}` : ''
  }`;
}

/** SVG des Pairing-Codes — `qrEncode` wirft bei Überlänge (>271 Byte, siehe
 * `state/qr.ts`), darum abgesichert wie beim bestehenden «iPad koppeln». */
export function zentralePairingSvg(): { svg: string | null; grund?: string } {
  try {
    return { svg: qrSvg(zentralePairingLink()) };
  } catch {
    return { svg: null, grund: 'Adresse + Raum + Token sind zu lang für einen QR-Code — Token kürzen oder manuell koppeln.' };
  }
}
