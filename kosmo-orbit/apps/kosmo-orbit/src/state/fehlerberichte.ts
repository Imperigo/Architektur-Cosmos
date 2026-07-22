/**
 * Fehlermeldeweg (v0.9.0, Owner-Auftrag 22.07.2026: «richte ein das wenn
 * kosmo fehlermeldungen bekommt das direkt über repo hier an dich gesendet
 * wird und auf liste gesetzt wird problem zu beheben in nächster
 * versionspush») — die App-Seite der Kette:
 *
 *   App-Fehler (Fehler-Toast `melde(ton:'fehler')` via `kosmo-fehlermeldung`-
 *   Event aus `@kosmo/ui`, plus window `error`/`unhandledrejection`)
 *     → lokaler Ringpuffer (`kosmo.fehlerberichte.v1`, max 50, dedupe)
 *     → gebündelt an die HomeServer-Bridge `POST /fehlerbericht`
 *     → die Bridge hängt sie als JSONL an `KOSMO_FEHLERBERICHT_PFAD` und
 *       committet/pusht sie (wenn `KOSMO_FEHLERBERICHT_GIT=1` und der Pfad
 *       im Repo-Klon liegt) auf den Entwicklungs-Branch — dort liest der
 *       Repo-Agent den Eingang vor jedem Release (`docs/RELEASE-ABLAUF.md`
 *       §0b) und setzt die Punkte auf die Fix-Liste der nächsten Version.
 *
 * Ehrlichkeit: ohne verbundene Bridge bleiben die Berichte LOKAL liegen
 * (sichtbar in der Diagnose als «N erfasst, M übertragen») — nichts wird
 * vorgetäuscht. Kein Klartext-Kontext, keine Dokumentinhalte: nur
 * Fehlertext, Quelle, Zeit und App-Version.
 */

const SPEICHER_KEY = 'kosmo.fehlerberichte.v1';
const MAX_BERICHTE = 50;
/** Identischer Text innerhalb dieses Fensters wird nicht doppelt erfasst
 *  (Fehler-Schleifen — z.B. ein Poll, der alle 2s scheitert — sollen den
 *  Puffer nicht fluten). */
const DEDUPE_FENSTER_MS = 60_000;
/** Frühestens alle 30s ein Übertragungsversuch (Bündel, fire-and-forget). */
const SENDE_INTERVALL_MS = 30_000;

export interface Fehlerbericht {
  zeit: string;
  text: string;
  quelle: 'meldung' | 'window' | 'promise';
  version: string;
  uebertragen: boolean;
}

function leseBerichte(): Fehlerbericht[] {
  try {
    const roh = localStorage.getItem(SPEICHER_KEY);
    const arr = roh ? (JSON.parse(roh) as unknown) : [];
    return Array.isArray(arr) ? (arr as Fehlerbericht[]) : [];
  } catch {
    return [];
  }
}

function schreibeBerichte(berichte: Fehlerbericht[]): void {
  try {
    localStorage.setItem(SPEICHER_KEY, JSON.stringify(berichte.slice(-MAX_BERICHTE)));
  } catch {
    /* voller/gesperrter Storage darf nie einen Folgefehler auslösen */
  }
}

/** Für die Diagnose: (erfasst, übertragen). */
export function fehlerberichtStand(): { erfasst: number; uebertragen: number } {
  const b = leseBerichte();
  return { erfasst: b.length, uebertragen: b.filter((x) => x.uebertragen).length };
}

function erfasse(text: string, quelle: Fehlerbericht['quelle']): void {
  const sauber = text.trim().slice(0, 500);
  if (!sauber) return;
  const berichte = leseBerichte();
  const jetzt = Date.now();
  const doppelt = berichte.some(
    (b) => b.text === sauber && jetzt - Date.parse(b.zeit) < DEDUPE_FENSTER_MS,
  );
  if (doppelt) return;
  berichte.push({
    zeit: new Date().toISOString(),
    text: sauber,
    quelle,
    version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '?',
    uebertragen: false,
  });
  schreibeBerichte(berichte);
}

/** Bridge-Adresse/-Token — dieselben localStorage-Schlüssel wie
 *  `state/home-server.ts`/`modules/vis/vis-jobs.ts` (bewusst dupliziert
 *  statt importiert: state/ zieht keine Stations-Module). */
function bridgeZiel(): { url: string; token: string } | null {
  try {
    const url = (localStorage.getItem('kosmo.bridge') ?? '').replace(/\/$/, '');
    if (!url) return null;
    return { url, token: (localStorage.getItem('kosmo.bridge.token') ?? '').trim() };
  } catch {
    return null;
  }
}

let letzterSendeversuch = 0;
let sendetGerade = false;

async function uebertrage(): Promise<void> {
  if (sendetGerade) return;
  const jetzt = Date.now();
  if (jetzt - letzterSendeversuch < SENDE_INTERVALL_MS) return;
  const ziel = bridgeZiel();
  if (!ziel) return;
  const offene = leseBerichte().filter((b) => !b.uebertragen);
  if (offene.length === 0) return;
  letzterSendeversuch = jetzt;
  sendetGerade = true;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (ziel.token) headers['X-Kosmo-Token'] = ziel.token;
    const res = await fetch(`${ziel.url}/fehlerbericht`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ berichte: offene.map(({ uebertragen: _u, ...rest }) => rest) }),
    });
    if (res.ok) {
      const uebertrageneSchluessel = new Set(offene.map((b) => `${b.zeit}|${b.text}`));
      schreibeBerichte(
        leseBerichte().map((b) =>
          uebertrageneSchluessel.has(`${b.zeit}|${b.text}`) ? { ...b, uebertragen: true } : b,
        ),
      );
    }
  } catch {
    /* Bridge offline — Berichte bleiben lokal, nächster Versuch beim nächsten Fehler/Intervall. */
  } finally {
    sendetGerade = false;
  }
}

/**
 * Einmal beim App-Start verdrahten (App.tsx). Rückgabe: Aufräum-Funktion.
 * Erfasst NUR echte Fehlersignale — keine Info-/Erfolgs-Toasts.
 */
export function installiereFehlerberichte(): () => void {
  const aufMeldung = (e: Event) => {
    const text = (e as CustomEvent<{ text?: string }>).detail?.text ?? '';
    erfasse(text, 'meldung');
    void uebertrage();
  };
  const aufWindowFehler = (e: ErrorEvent) => {
    erfasse(e.message || 'Unbekannter Fehler (window.onerror)', 'window');
    void uebertrage();
  };
  const aufPromise = (e: PromiseRejectionEvent) => {
    const grund = e.reason instanceof Error ? e.reason.message : String(e.reason ?? '');
    erfasse(grund || 'Unbehandelte Promise-Ablehnung', 'promise');
    void uebertrage();
  };
  window.addEventListener('kosmo-fehlermeldung', aufMeldung);
  window.addEventListener('error', aufWindowFehler);
  window.addEventListener('unhandledrejection', aufPromise);
  return () => {
    window.removeEventListener('kosmo-fehlermeldung', aufMeldung);
    window.removeEventListener('error', aufWindowFehler);
    window.removeEventListener('unhandledrejection', aufPromise);
  };
}
