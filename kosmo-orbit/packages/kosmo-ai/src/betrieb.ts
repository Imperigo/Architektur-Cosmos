/**
 * Betriebsarten (Owner-Auftrag «drei Versionen»): eine reine Abbildung von
 * der gewählten Betriebsart auf konkrete Provider-/Server-Adressen. Bewusst
 * ohne DOM/localStorage — testbar und in KosmoPanel + Setup-Assistent gleich
 * verwendet.
 *
 * - **standard** — der HomePC selbst: lokales LLM (Ollama) + alle Werkzeuge
 *   (Render-Bridge, Sync) auf `localhost`. Volle Leistung, keine Cloud.
 * - **remote**  — dünner Client über VPN auf denselben HomePC: dieselben
 *   Dienste, aber unter der VPN-Adresse (`remoteHost`). Das MacBook/Laptop
 *   bleibt dünn, die Leistung kommt vom Heim-PC.
 * - **cloud**   — voll Claude-abhängig (Owner: «mind. Opus 4.8»): kein lokales
 *   Modell, keine HomeStation-Werkzeuge; die Browser-Fallbacks (Web-Speech,
 *   Fake-Render) tragen, was Cycles/Whisper zuhause tun würden.
 *
 * Netz/Firewall (Serie I / Batch B8, R10, siehe `docs/FIREWALL-KONZEPT.md`):
 * Remote kann optional `remoteTls: true` setzen, wenn ein WireGuard-Gateway
 * oder Reverse-Proxy TLS terminiert — dann werden `https`/`wss` statt
 * `http`/`ws` gebaut. Ohne das Flag (Default) bleibt alles wie bisher.
 */

export type Betriebsart = 'standard' | 'remote' | 'cloud';

/**
 * Cloud-Anmeldeart (Owner: «Mit Claude anmelden» — auch mit einem Claude-Abo
 * per Browser-Login, nicht nur mit eingetipptem API-Schlüssel).
 * - **schluessel** — klassischer API-Schlüssel, `x-api-key`.
 * - **abo**        — OAuth-Bearer-Token aus der lokalen Anthropic-Anmeldung
 *   (Desktop-only, siehe `docs/CLOUD-LOGIN-ABO.md`); Web/PWA bleibt beim
 *   Schlüssel, weil sie den lokalen Anmelde-Helfer nicht starten kann.
 * Rein additiv — ändert `betriebKonfig()` nicht, nur das Vokabular, das
 * KosmoPanel für die Anmeldeart-Auswahl teilt.
 */
export type CloudAuthArt = 'schluessel' | 'abo';

/** Minimum-Cloud-Modell — der Owner verlangt mindestens Opus 4.8. */
export const CLOUD_MODELL_MIN = 'claude-opus-4-8';

/**
 * Installer-Edition (der Build weiss, als was er ausgeliefert wurde).
 * Bestimmt nur die Vorauswahl beim allerersten Start — der Nutzer kann die
 * Betriebsart danach jederzeit umstellen.
 */
export type Edition = 'standard' | 'remote' | 'cloud';

export interface EditionInfo {
  edition: Edition;
  titel: string;
  kurz: string;
  betriebsart: Betriebsart;
}

export const EDITIONEN: Record<Edition, EditionInfo> = {
  standard: {
    edition: 'standard',
    titel: 'KosmoOrbit — HomePC',
    kurz: 'Volle Leistung am Heim-PC: lokales LLM + alle Werkzeuge.',
    betriebsart: 'standard',
  },
  remote: {
    edition: 'remote',
    titel: 'KosmoOrbit — Remote (VPN)',
    kurz: 'Dünner Client, greift per VPN auf die Leistung des HomePC.',
    betriebsart: 'remote',
  },
  cloud: {
    edition: 'cloud',
    titel: 'KosmoOrbit — Cloud',
    kurz: 'Voll über Claude (mind. Opus 4.8), ohne Heim-PC.',
    betriebsart: 'cloud',
  },
};

/** Roher Editions-String (aus `VITE_KOSMO_EDITION`) → sichere Edition. */
export function leseEdition(roh: string | undefined): Edition {
  const e = (roh ?? '').trim().toLowerCase();
  return e === 'remote' || e === 'cloud' ? e : 'standard';
}

/** Edition → Betriebsart für den Erststart. */
export function editionBetriebsart(edition: Edition): Betriebsart {
  return EDITIONEN[edition].betriebsart;
}

export interface BetriebEingabe {
  betriebsart: Betriebsart;
  /** Remote: VPN-Host des HomePC (IP oder Name), z.B. «100.87.3.2» oder «kosmo». */
  remoteHost?: string;
  /** Cloud: gewünschtes Claude-Modell; unter Opus 4.8 wird auf Opus angehoben. */
  cloudModell?: string;
  /**
   * Remote: TLS-Terminierung vorhanden (WireGuard-Gateway/Reverse-Proxy mit
   * `wss`/mTLS, siehe `docs/FIREWALL-KONZEPT.md`, Batch B8/R10) → Adressen
   * werden mit `https://`/`wss://` statt `http://`/`ws://` gebaut. Wirkt nur
   * im Remote-Modus; Standard bleibt bewusst immer beim Klartext-Schema im
   * vertrauenswürdigen Büro-LAN. Default (`undefined`/`false`) ändert am
   * bisherigen Verhalten nichts.
   */
  remoteTls?: boolean;
}

export interface BetriebKonfig {
  betriebsart: Betriebsart;
  provider: 'ollama' | 'anthropic';
  /** Ollama-Basis (`''` bei Cloud). */
  llmBaseUrl: string;
  /** Render/STT/TTS-Bridge (`''` bei Cloud → Browser-Fallbacks). */
  bridgeUrl: string;
  /** Yjs-Sync als ws-Adresse (`''` bei Cloud → kein Sync-Server). */
  syncUrl: string;
  /** Cloud-Modell, immer mindestens Opus 4.8. */
  cloudModell: string;
  cloud: boolean;
  /**
   * Nur vorhanden (und `true`) wenn die Adressen mit `https`/`wss` gebaut
   * wurden (Remote + `remoteTls: true`). Fehlt sonst ganz — kein
   * `remoteTls: false`-Rauschen (`exactOptionalPropertyTypes`).
   */
  remoteTls?: boolean;
}

/**
 * Reduziert eine getippte Remote-Adresse auf den blossen Host. Nimmt
 * `http://kosmo.local:11434/`, `kosmo.local` oder `100.87.3.2:8600` und gibt
 * `kosmo.local` bzw. `100.87.3.2` zurück — die drei Dienste hängen ihre
 * eigenen Ports an.
 */
export function bereinigeHost(roh: string): string {
  let h = (roh ?? '').trim();
  if (!h) return '';
  h = h.replace(/^[a-z]+:\/\//i, ''); // Schema weg
  h = h.replace(/[/?#].*$/, ''); // Pfad/Query weg
  h = h.replace(/:\d+$/, ''); // angehängter Port weg (IPv4/Name)
  return h;
}

/**
 * Cloud-Modell mit Vorgabe: leer → Opus 4.8 (Qualitäts-VORGABE aus der
 * KI-Modell-Guideline), eine EXPLIZITE Wahl bleibt unangetastet.
 *
 * v0.6.4 / F1 (Owner wörtlich: «zudem möchte ich das man das modell von
 * claude auswählen kann»): bis 0.6.3 hob diese Funktion Haiku/Sonnet STILL
 * auf Opus an — das machte die neue Modellwahl im Kosmo-Panel wirkungslos,
 * sobald die Betriebsart Cloud erneut gesetzt wurde (der Wechsel läuft über
 * betriebKonfig und überschrieb die Wahl beim nächsten Klick/Reload-Pfad).
 * Die Owner-Entscheidung schlägt die alte stille Politik: gewählt ist
 * gewählt; die Guideline bleibt als Default für den Leer-Fall.
 */
export function mindestensOpus(modell?: string): string {
  const m = (modell ?? '').trim();
  return m === '' ? CLOUD_MODELL_MIN : m;
}

/** Betriebsart → konkrete Adressen. Rein, ohne Seiteneffekt. */
export function betriebKonfig(ein: BetriebEingabe): BetriebKonfig {
  if (ein.betriebsart === 'cloud') {
    return {
      betriebsart: 'cloud',
      provider: 'anthropic',
      llmBaseUrl: '',
      bridgeUrl: '',
      syncUrl: '',
      cloudModell: mindestensOpus(ein.cloudModell),
      cloud: true,
    };
  }
  const host = ein.betriebsart === 'remote' ? bereinigeHost(ein.remoteHost ?? '') || 'localhost' : 'localhost';
  // TLS nur relevant/erlaubt im Remote-Modus (WireGuard-Gateway/Reverse-Proxy
  // terminiert `wss`/`https`, siehe FIREWALL-KONZEPT.md); Standard bleibt
  // immer beim bisherigen Klartext-Schema im Büro-LAN.
  const tls = ein.betriebsart === 'remote' && ein.remoteTls === true;
  const httpSchema = tls ? 'https' : 'http';
  const wsSchema = tls ? 'wss' : 'ws';
  return {
    betriebsart: ein.betriebsart,
    provider: 'ollama',
    llmBaseUrl: `${httpSchema}://${host}:11434`,
    bridgeUrl: `${httpSchema}://${host}:8600`,
    syncUrl: `${wsSchema}://${host}:8700`,
    cloudModell: mindestensOpus(ein.cloudModell),
    cloud: false,
    ...(tls ? { remoteTls: true } : {}),
  };
}

/**
 * Lizenz-Hinweis (Serie I / Batch B6 — Anti-Copy Stufe 2, siehe
 * `docs/SERIE-I-BUILDPLAN.md` §3 und `docs/LIZENZ.md`): reine Klassifikation
 * eines `@kosmo/lizenz`-Verify-Ergebnisses in einen UI-Zustand. Der
 * eigentliche Web-Crypto-Aufruf (`verifiziereLizenz`) lebt bewusst in
 * `KosmoPanel.tsx` (App-Schicht) — diese Funktion bleibt reine Logik, ohne
 * Crypto/Storage, und ist deshalb ohne DOM testbar.
 *
 * **Ehrlich, nie hart aussperrend**: egal welcher Status — die lokale Arbeit
 * bleibt IMMER möglich. Nur Cloud/Sync/Render verlangen serverseitig
 * (Server-Bindung, der einzige harte Hebel) eine gültige Lizenz.
 *
 * `pubKeyKonfiguriert=false` (kein Public Key im Build/Env) ist der Default:
 * dann bleibt alles wie vor B6 — `status: 'keine-pflicht'`, kein Hinweistext.
 */
export type LizenzStatus = 'keine-pflicht' | 'fehlt' | 'gueltig' | 'abgelaufen' | 'ungueltig';

export interface LizenzHinweis {
  status: LizenzStatus;
  /** Leer bei `keine-pflicht` — sonst ein UI-tauglicher, ehrlicher Hinweistext. */
  text: string;
}

const LIZENZ_HINWEIS_SUFFIX =
  'Cloud/Sync/Render brauchen eine gültige Lizenz; lokale Arbeit bleibt möglich.';

export function lizenzHinweis(
  pubKeyKonfiguriert: boolean,
  ergebnis: { gueltig: boolean; grund?: string } | null,
): LizenzHinweis {
  if (!pubKeyKonfiguriert) return { status: 'keine-pflicht', text: '' };
  if (!ergebnis) return { status: 'fehlt', text: `Lizenz fehlt — ${LIZENZ_HINWEIS_SUFFIX}` };
  if (ergebnis.gueltig) return { status: 'gueltig', text: 'Lizenz gültig.' };
  if (ergebnis.grund === 'abgelaufen') {
    return { status: 'abgelaufen', text: `Lizenz abgelaufen — ${LIZENZ_HINWEIS_SUFFIX}` };
  }
  return { status: 'ungueltig', text: `Lizenz ungültig — ${LIZENZ_HINWEIS_SUFFIX}` };
}
