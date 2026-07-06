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

/** Hebt ein zu schwaches Cloud-Modell auf das Minimum Opus 4.8 an. */
export function mindestensOpus(modell?: string): string {
  const m = (modell ?? '').trim().toLowerCase();
  if (!m) return CLOUD_MODELL_MIN;
  // Schwächere Stufen (Haiku/Sonnet) auf den Boden anheben; Opus/eigenes lassen.
  if (m.includes('haiku') || m.includes('sonnet')) return CLOUD_MODELL_MIN;
  return (modell as string).trim();
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
  return {
    betriebsart: ein.betriebsart,
    provider: 'ollama',
    llmBaseUrl: `http://${host}:11434`,
    bridgeUrl: `http://${host}:8600`,
    syncUrl: `ws://${host}:8700`,
    cloudModell: mindestensOpus(ein.cloudModell),
    cloud: false,
  };
}
