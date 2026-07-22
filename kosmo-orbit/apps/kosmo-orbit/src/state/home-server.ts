import {
  betriebKonfig,
  KOSMO_ROLLEN,
  loeseRollenModelleMitVerfuegbarkeit,
  STANDARD_ROLLEN_MODELL_KARTE,
  type KosmoRolle,
} from '@kosmo/ai';
import { loadSettings, type KosmoSettings } from '../shell/KosmoPanel';

/**
 * E-H «Ein-Klick-HomeServer» (`docs/V0812-SPEZ.md` §E-H, Sanktion 7, Matrix
 * C-11). Owner wörtlich: «ziel ist es das ich synchro auf ipad per oneklick
 * aktivieren kann … onecklick ganze verbindung mit home pc aktiv macht».
 *
 * ERKUNDUNG (vor diesem Modul, s. Bau-Auftrag): die App kennt bereits GENAU
 * EINEN Weg, wie Betriebsart + Remote-Adressen gesetzt werden —
 * `KosmoPanel.tsx`s `wechsleBetriebsart()` (nicht exportiert, Komponenten-
 * intern): `loadSettings()`/`localStorage['kosmo.llm']` für die
 * `KosmoSettings` (Betriebsart/`remoteHost`/Provider/`baseUrl`) +
 * `localStorage['kosmo.bridge']`/`localStorage['kosmo.sync.url']` für
 * Bridge/Sync, alles über die reine Abbildung `betriebKonfig()` aus
 * `@kosmo/ai` (`packages/kosmo-ai/src/betrieb.ts`). Dieses Modul erfindet
 * KEINEN Parallel-Zustand — es ruft exakt dieselbe Abbildung und schreibt in
 * dieselben drei localStorage-Schlüssel, nur von ausserhalb der Komponente
 * aufrufbar (reine Funktionen, ohne React). Einzig NEU: der HomeServer-Host
 * selbst lebt unter einem eigenen Schlüssel (`kosmo.homeserver.host`,
 * Spec-Vorgabe), statt direkt in `remoteHost` — so bleibt ein späterer
 * manueller Remote-Host (KosmoPanel-Betriebsart-Reiter) unabhängig vom
 * HomeServer-Preset.
 *
 * EHRLICHKEIT (Sanktion 7): `verbindeHomeServer()` markiert einen Kanal nur
 * dann `verbunden`, wenn der jeweilige Probe wirklich erfolgreich war —
 * Ollama ist im Container/Dev-Setup bewusst NICHT gestartet (Ehrlichkeits-
 * beweis) und bleibt darum ehrlich `nicht-verbunden`, auch wenn Bridge/Sync
 * längst stehen (gemischtes Bild, kein Alles-oder-nichts-Fake).
 *
 * v0.9.0 / E-L («Kosmo-LLM: Ollama als Remote-Default + ehrliche
 * Modell-Anzeige», `docs/V090-SPEZ.md` §E-L, Sanktion 3): der Owner sah in
 * der Mac-App bisher nur ein PAUSCHALES «llm nicht verbunden»
 * (`shell/Einstellungen.tsx`s `homeServerChip()`) — egal ob der Ollama-
 * Server lief, aber das erwartete Modell fehlte, oder ob er gar nicht
 * erreichbar war. `pruefeOllama()` liest jetzt zusätzlich `/api/tags` aus
 * und meldet die rohe Modellliste zurück; `pruefeHomeServer()`/
 * `verbindeHomeServer()` bauen daraus — additiv, KEIN neues Zustandssystem —
 * den `llmModelle`-Rollen-Abgleich (Meister/Leiter/Zeichner je vorhanden
 * ja/nein + deklarierter Meister→Leiter-Fallback, s.
 * `@kosmo/ai`s `loeseRollenModelleMitVerfuegbarkeit`). `llmModelle` fehlt
 * ganz, wenn der Server gar nicht geantwortet hat (Netzfehler/Timeout) —
 * genau der bisherige Ehrlichkeits-Fall bleibt textgleich «NICHT VERBUNDEN»
 * ohne jede erfundene Rollen-Angabe. Der `llm`-Kanalstatus selbst wird
 * strenger: «verbunden» gilt nur noch, wenn der Server antwortet UND
 * mindestens Leiter ODER Zeichner installiert ist (Sanktion 7 aus 0.8.12
 * gilt unverändert — nie grün ohne Modell).
 */

export const HOMESERVER_HOST_KEY = 'kosmo.homeserver.host';
export const HOMESERVER_VERBUNDEN_KEY = 'kosmo.homeserver.verbunden';
export const BRIDGE_TOKEN_KEY = 'kosmo.bridge.token';
export const HOMESERVER_HOST_DEFAULT = '100.88.48.73';

/** Timeout je Probe (Spec-Vorgabe, dasselbe Mass wie `StartSequenz.tsx`/
 *  `WerkzeugSetup.tsx`s bestehende `/health`-Pings). */
export const PROBE_TIMEOUT_MS = 1500;

export type KanalStatus = 'verbunden' | 'nicht-verbunden';

export interface HomeServerEndpunkte {
  host: string;
  bridgeUrl: string;
  syncUrl: string;
  ollamaUrl: string;
}

/** Ein Rollen-Eintrag im ehrlichen Staffelungs-Abgleich (E-L) — Standard-
 *  Modellname je Rolle + ob er in der `/api/tags`-Liste tatsächlich vorkam. */
export interface HomeServerRollenEintrag {
  rolle: KosmoRolle;
  modell: string;
  vorhanden: boolean;
}

/** Ehrlicher Staffelungs-Abgleich für den KOSMO-LLM-Chip (E-L, v0.9.0) — nur
 *  vorhanden, wenn der Ollama-Server überhaupt geantwortet hat. */
export interface HomeServerLlmAbgleich {
  /** Rohe Modellnamen aus `/api/tags` (kann leer sein — Server erreichbar, aber kein Modell installiert). */
  verfuegbar: string[];
  /** Meister/Leiter/Zeichner je mit Standard-Modellname + vorhanden ja/nein. */
  rollen: HomeServerRollenEintrag[];
  /** `true`, wenn der Meister fehlt und (deklariert, s. `staffelung.ts`) auf das Leiter-Modell zurückfällt. */
  meisterFallbackAufLeiter: boolean;
}

export interface HomeServerProbeErgebnis {
  bridge: KanalStatus;
  sync: KanalStatus;
  llm: KanalStatus;
  /** Additiv (E-L, v0.9.0): fehlt ganz, wenn Ollama nicht geantwortet hat
   *  (Netzfehler/Timeout/HTTP-Fehler) — dann bleibt der Chip textgleich wie
   *  vor E-L, ohne erfundenen Rollen-Abgleich (Sanktion 7). */
  llmModelle?: HomeServerLlmAbgleich;
}

/** Aktueller HomeServer-Host — EINE Quelle (Spec: `kosmo.homeserver.host`),
 *  Default die Owner-Tailnet-Adresse (`docs/VPN-HOMEPC-ANLEITUNG.md`). */
export function homeServerHost(): string {
  try {
    return (localStorage.getItem(HOMESERVER_HOST_KEY) ?? '').trim() || HOMESERVER_HOST_DEFAULT;
  } catch {
    return HOMESERVER_HOST_DEFAULT;
  }
}

export function setHomeServerHost(host: string): void {
  localStorage.setItem(HOMESERVER_HOST_KEY, host.trim());
}

/** Persistierter Merker («war zuletzt verbunden») — treibt NUR die
 *  Auto-Reprobe beim nächsten Öffnen der Einstellungen, NIE direkt einen
 *  Chip-Status (der kommt immer aus einem frischen Probe-Lauf, Sanktion 7). */
export function warZuletztVerbunden(): boolean {
  try {
    return localStorage.getItem(HOMESERVER_VERBUNDEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Host → die drei Dienst-Adressen, über dieselbe `betriebKonfig()`-
 *  Abbildung wie `KosmoPanel.tsx`/`WerkzeugSetup.tsx` (Betriebsart `remote`). */
export function homeServerEndpunkte(host: string = homeServerHost()): HomeServerEndpunkte {
  const k = betriebKonfig({ betriebsart: 'remote', remoteHost: host });
  return { host, bridgeUrl: k.bridgeUrl, syncUrl: k.syncUrl, ollamaUrl: k.llmBaseUrl };
}

async function mitTimeout<T>(f: (signal: AbortSignal) => Promise<T>, ms: number = PROBE_TIMEOUT_MS): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await f(ctl.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** Bridge `/health` — mit `X-Kosmo-Token` aus `kosmo.bridge.token`, wenn
 *  gesetzt (Serie-I-Härtung, `docs/VPN-HOMEPC-ANLEITUNG.md` §9). */
export async function pruefeBridge(bridgeUrl: string): Promise<KanalStatus> {
  if (!bridgeUrl) return 'nicht-verbunden';
  try {
    const token = (localStorage.getItem(BRIDGE_TOKEN_KEY) ?? '').trim();
    const res = await mitTimeout((signal) =>
      fetch(`${bridgeUrl.replace(/\/$/, '')}/health`, {
        signal,
        ...(token ? { headers: { 'X-Kosmo-Token': token } } : {}),
      }),
    );
    return res.ok ? 'verbunden' : 'nicht-verbunden';
  } catch {
    return 'nicht-verbunden';
  }
}

/** Sync — ein echter WebSocket-Handshake (das `open`-Ereignis beweist den
 *  vollständigen HTTP-Upgrade-Roundtrip zum Sync-Server), kein blosser
 *  HTTP-Ping. Wird die Verbindung nicht innert `PROBE_TIMEOUT_MS` geöffnet
 *  (oder scheitert sie), gilt der Kanal ehrlich als nicht verbunden. */
export function pruefeSync(syncUrl: string, ms: number = PROBE_TIMEOUT_MS): Promise<KanalStatus> {
  if (!syncUrl) return Promise.resolve('nicht-verbunden');
  return new Promise<KanalStatus>((resolve) => {
    let entschieden = false;
    let sock: WebSocket;
    const abschliessen = (status: KanalStatus) => {
      if (entschieden) return;
      entschieden = true;
      clearTimeout(timer);
      try {
        sock?.close();
      } catch {
        /* leer */
      }
      resolve(status);
    };
    const timer = setTimeout(() => abschliessen('nicht-verbunden'), ms);
    try {
      sock = new WebSocket(syncUrl);
    } catch {
      clearTimeout(timer);
      resolve('nicht-verbunden');
      return;
    }
    sock.onopen = () => abschliessen('verbunden');
    sock.onerror = () => abschliessen('nicht-verbunden');
  });
}

/** `/api/tags`-Antwort → rohe Modellnamen. Robust gegen ein unerwartetes/
 *  fehlendes JSON-Format — ein Server, der zwar 200 antwortet, aber kein
 *  gültiges `{models:[...]}` liefert, gilt ehrlich als «kein Modell», NIE
 *  als Crash. */
async function leseModellNamen(res: Response): Promise<string[]> {
  try {
    const daten = (await res.json()) as { models?: Array<{ name?: unknown }> } | undefined;
    if (!daten || !Array.isArray(daten.models)) return [];
    return daten.models.map((m) => m?.name).filter((n): n is string => typeof n === 'string');
  } catch {
    return [];
  }
}

export interface OllamaProbeErgebnis {
  status: KanalStatus;
  /** `undefined`, wenn der Server NICHT geantwortet hat (Netzfehler/Timeout/
   *  HTTP-Fehler) — sonst die rohen `/api/tags`-Modellnamen (auch ein leeres
   *  Array ist ein gültiges, ehrliches Ergebnis: Server erreichbar, nichts
   *  installiert). */
  modelle?: string[];
}

/** Ollama `/api/tags` — dasselbe Muster wie `WerkzeugSetup.tsx`s
 *  `pruefe('ollama')`. Läuft Ollama nicht (Container-Dev-Betrieb bewusst
 *  ohne, Ehrlichkeitsbeweis), bleibt der Kanal ehrlich `nicht-verbunden`,
 *  `modelle` bleibt `undefined`.
 *
 *  E-L (v0.9.0, Sanktion 7 aus 0.8.12 gilt weiter): «verbunden» heisst NICHT
 *  mehr nur «Server hat mit 200 geantwortet» — erst wenn der Server ZUSÄTZLICH
 *  mindestens den Leiter ODER den Zeichner installiert hat, gilt der Kanal
 *  als verbunden. Ein antwortender Server ohne jedes Staffelungs-Modell wäre
 *  sonst ein stillschweigendes Grün ohne echte Nutzbarkeit — genau das
 *  Pauschalurteil, das dieses Paket behebt (statt nur den Text zu ändern). */
export async function pruefeOllama(ollamaUrl: string): Promise<OllamaProbeErgebnis> {
  if (!ollamaUrl) return { status: 'nicht-verbunden' };
  try {
    const res = await mitTimeout((signal) => fetch(`${ollamaUrl.replace(/\/$/, '')}/api/tags`, { signal }));
    if (!res.ok) return { status: 'nicht-verbunden' };
    const modelle = await leseModellNamen(res);
    const { leiter, zeichner } = STANDARD_ROLLEN_MODELL_KARTE.lokal;
    const vorhanden = new Set(modelle);
    const status: KanalStatus = vorhanden.has(leiter) || vorhanden.has(zeichner) ? 'verbunden' : 'nicht-verbunden';
    return { status, modelle };
  } catch {
    return { status: 'nicht-verbunden' };
  }
}

/** Rohe `/api/tags`-Modellliste → der Staffelungs-Abgleich für den Chip
 *  (Meister/Leiter/Zeichner je vorhanden ja/nein + deklarierter Meister-
 *  Fallback) — reine Ableitung über `@kosmo/ai`s
 *  `loeseRollenModelleMitVerfuegbarkeit`, kein Parallel-Zustand. */
function baueLlmAbgleich(verfuegbar: string[]): HomeServerLlmAbgleich {
  const { meisterFallbackAufLeiter } = loeseRollenModelleMitVerfuegbarkeit({ provider: 'ollama' }, verfuegbar);
  const vorhanden = new Set(verfuegbar);
  const rollen: HomeServerRollenEintrag[] = KOSMO_ROLLEN.map((rolle) => {
    const modell = STANDARD_ROLLEN_MODELL_KARTE.lokal[rolle];
    return { rolle, modell, vorhanden: vorhanden.has(modell) };
  });
  return { verfuegbar, rollen, meisterFallbackAufLeiter };
}

/** Alle drei Kanäle parallel prüfen, OHNE die Betriebsart anzufassen — der
 *  Weg für die Auto-Reprobe beim Wiedereröffnen der Einstellungen. */
export async function pruefeHomeServer(host: string = homeServerHost()): Promise<HomeServerProbeErgebnis> {
  const ep = homeServerEndpunkte(host);
  const [bridge, sync, ollama] = await Promise.all([
    pruefeBridge(ep.bridgeUrl),
    pruefeSync(ep.syncUrl),
    pruefeOllama(ep.ollamaUrl),
  ]);
  return {
    bridge,
    sync,
    llm: ollama.status,
    ...(ollama.modelle !== undefined ? { llmModelle: baueLlmAbgleich(ollama.modelle) } : {}),
  };
}

/**
 * EIN Klick: setzt die BESTEHENDE Betriebsart-/Remote-Konfiguration
 * (derselbe Weg wie `KosmoPanel.tsx`s `wechsleBetriebsart('remote', host)`)
 * in einem Zug auf alle drei Endpunkte, dann echte Probes gegen alle drei
 * Kanäle. Persistiert den «war verbunden»-Merker (Nutzer-Absicht, s.
 * `warZuletztVerbunden` oben) — unabhängig davon, ob am Ende jeder einzelne
 * Kanal wirklich erreichbar war (Sanktion 7 gilt für die CHIP-Anzeige, nicht
 * für diesen reinen Absichts-Merker).
 */
export async function verbindeHomeServer(host: string = homeServerHost()): Promise<HomeServerProbeErgebnis> {
  setHomeServerHost(host);
  const bestehend = loadSettings();
  const k = betriebKonfig({ betriebsart: 'remote', remoteHost: host, cloudModell: bestehend.anthropicModel });
  const neu: KosmoSettings = {
    ...bestehend,
    betriebsart: 'remote',
    remoteHost: host,
    provider: k.provider,
    baseUrl: k.llmBaseUrl,
  };
  localStorage.setItem('kosmo.llm', JSON.stringify(neu));
  localStorage.setItem('kosmo.bridge', k.bridgeUrl);
  localStorage.setItem('kosmo.sync.url', k.syncUrl);

  const ergebnis = await pruefeHomeServer(host);
  localStorage.setItem(HOMESERVER_VERBUNDEN_KEY, '1');
  return ergebnis;
}

/**
 * Trennen: stellt die lokale (Standard/HomePC-lokal) Betriebsart wieder her
 * — dieselbe `betriebKonfig({betriebsart:'standard'})`-Abbildung, die auch
 * der «Standard»-Reiter im Kosmo-Panel benutzt. Bewusst KEIN Zurückspulen zu
 * einem vorherigen (evtl. Cloud-)Zustand: der HomeServer-Knopf ist ein
 * Zwei-Zustands-Schalter (verbunden ↔ lokal), kein History-Stack.
 */
export function trenneHomeServer(): void {
  const bestehend = loadSettings();
  const k = betriebKonfig({ betriebsart: 'standard', cloudModell: bestehend.anthropicModel });
  const neu: KosmoSettings = {
    ...bestehend,
    betriebsart: 'standard',
    remoteHost: '',
    provider: k.provider,
    baseUrl: k.llmBaseUrl,
  };
  localStorage.setItem('kosmo.llm', JSON.stringify(neu));
  localStorage.setItem('kosmo.bridge', k.bridgeUrl);
  localStorage.setItem('kosmo.sync.url', k.syncUrl);
  localStorage.setItem(HOMESERVER_VERBUNDEN_KEY, '0');
}
