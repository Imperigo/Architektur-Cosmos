import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * E-H «Ein-Klick-HomeServer» (`docs/V0812-SPEZ.md` §E-H, Sanktion 7, Matrix
 * C-11) — reine Logik von `state/home-server.ts`: URL-Ableitung (EIN Host →
 * die drei Dienst-Adressen über die bestehende `betriebKonfig()`-Abbildung)
 * + Zustandslogik (`verbindeHomeServer`/`trenneHomeServer` schreiben in
 * dieselben localStorage-Schlüssel wie `KosmoPanel.tsx`s bestehender
 * `wechsleBetriebsart()`-Weg). Probes (`fetch`/`WebSocket`) sind gemockt
 * (Muster `bake-auftrag.test.ts`s `setzeLocalStorage`/`vi.stubGlobal`) —
 * kein echtes Netz nötig für diese Suite.
 */

function setzeLocalStorage(werte: Record<string, string> = {}): void {
  const speicher = new Map<string, string>(Object.entries(werte));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => speicher.get(k) ?? null,
    setItem: (k: string, v: string) => {
      speicher.set(k, v);
    },
    removeItem: (k: string) => {
      speicher.delete(k);
    },
    clear: () => speicher.clear(),
  });
}

/** Minimaler `WebSocket`-Stub: öffnet synchron (Microtask) oder scheitert,
 *  je nach `verhalten`. Kein echter Socket. */
function stubWebSocket(verhalten: 'open' | 'error' | 'nie'): void {
  class FakeSocket {
    onopen: (() => void) | null = null;
    onerror: (() => void) | null = null;
    closed = false;
    constructor(_url: string) {
      if (verhalten === 'open') {
        queueMicrotask(() => this.onopen?.());
      } else if (verhalten === 'error') {
        queueMicrotask(() => this.onerror?.());
      }
      // 'nie': ruft nie onopen/onerror auf — treibt den Timeout-Zweig.
    }
    close(): void {
      this.closed = true;
    }
  }
  vi.stubGlobal('WebSocket', FakeSocket as unknown as typeof WebSocket);
}

describe('homeServerHost / setHomeServerHost / homeServerEndpunkte (rein)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('Default-Host ohne gesetzten Schlüssel ist die Owner-Tailnet-Adresse', async () => {
    setzeLocalStorage();
    const { homeServerHost, HOMESERVER_HOST_DEFAULT } = await import('../src/state/home-server');
    expect(homeServerHost()).toBe(HOMESERVER_HOST_DEFAULT);
    expect(HOMESERVER_HOST_DEFAULT).toBe('100.88.48.73');
  });

  it('setHomeServerHost schreibt unter kosmo.homeserver.host, homeServerHost liest ihn zurück (getrimmt)', async () => {
    setzeLocalStorage();
    const { homeServerHost, setHomeServerHost, HOMESERVER_HOST_KEY } = await import('../src/state/home-server');
    setHomeServerHost('  100.87.3.2  ');
    expect(localStorage.getItem(HOMESERVER_HOST_KEY)).toBe('100.87.3.2');
    expect(homeServerHost()).toBe('100.87.3.2');
  });

  it('homeServerEndpunkte leitet Bridge/Sync/Ollama aus EINEM Host ab (:8600/:8700/:11434)', async () => {
    setzeLocalStorage();
    const { homeServerEndpunkte } = await import('../src/state/home-server');
    const ep = homeServerEndpunkte('100.88.48.73');
    expect(ep).toEqual({
      host: '100.88.48.73',
      bridgeUrl: 'http://100.88.48.73:8600',
      syncUrl: 'ws://100.88.48.73:8700',
      ollamaUrl: 'http://100.88.48.73:11434',
    });
  });

  it('homeServerEndpunkte ohne Argument fällt auf den gespeicherten/Default-Host zurück', async () => {
    setzeLocalStorage({ 'kosmo.homeserver.host': 'kosmo-heim' });
    const { homeServerEndpunkte } = await import('../src/state/home-server');
    expect(homeServerEndpunkte().bridgeUrl).toBe('http://kosmo-heim:8600');
  });
});

describe('Probes (gemockt) — pruefeBridge/pruefeSync/pruefeOllama', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('pruefeBridge: 200 → verbunden, sendet X-Kosmo-Token wenn gesetzt', async () => {
    setzeLocalStorage({ 'kosmo.bridge.token': 'geheim-xyz' });
    let gesehenerHeader: string | undefined;
    vi.stubGlobal('fetch', (async (url: unknown, init?: RequestInit) => {
      expect(String(url)).toBe('http://100.88.48.73:8600/health');
      gesehenerHeader = (init?.headers as Record<string, string> | undefined)?.['X-Kosmo-Token'];
      return { ok: true } as Response;
    }) as unknown as typeof fetch);

    const { pruefeBridge } = await import('../src/state/home-server');
    const status = await pruefeBridge('http://100.88.48.73:8600');
    expect(status).toBe('verbunden');
    expect(gesehenerHeader).toBe('geheim-xyz');
  });

  it('pruefeBridge: fetch wirft (Netz/Timeout) → ehrlich nicht-verbunden, kein Crash', async () => {
    setzeLocalStorage();
    vi.stubGlobal('fetch', (async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch);
    const { pruefeBridge } = await import('../src/state/home-server');
    expect(await pruefeBridge('http://localhost:9')).toBe('nicht-verbunden');
  });

  it('pruefeBridge: HTTP-Fehlerstatus → nicht-verbunden', async () => {
    setzeLocalStorage();
    vi.stubGlobal('fetch', (async () => ({ ok: false, status: 500 })) as unknown as typeof fetch);
    const { pruefeBridge } = await import('../src/state/home-server');
    expect(await pruefeBridge('http://100.88.48.73:8600')).toBe('nicht-verbunden');
  });

  it('pruefeBridge: leere URL → sofort nicht-verbunden, kein fetch-Aufruf', async () => {
    setzeLocalStorage();
    let aufrufe = 0;
    vi.stubGlobal('fetch', (async () => {
      aufrufe++;
      return { ok: true } as Response;
    }) as unknown as typeof fetch);
    const { pruefeBridge } = await import('../src/state/home-server');
    expect(await pruefeBridge('')).toBe('nicht-verbunden');
    expect(aufrufe).toBe(0);
  });

  it('pruefeSync: echter WebSocket-Handshake — onopen → verbunden', async () => {
    stubWebSocket('open');
    const { pruefeSync } = await import('../src/state/home-server');
    expect(await pruefeSync('ws://100.88.48.73:8700')).toBe('verbunden');
  });

  it('pruefeSync: onerror → nicht-verbunden', async () => {
    stubWebSocket('error');
    const { pruefeSync } = await import('../src/state/home-server');
    expect(await pruefeSync('ws://100.88.48.73:8700')).toBe('nicht-verbunden');
  });

  it('pruefeSync: kein Ereignis innert Timeout → nicht-verbunden (kurzer Test-Timeout statt PROBE_TIMEOUT_MS)', async () => {
    stubWebSocket('nie');
    const { pruefeSync } = await import('../src/state/home-server');
    expect(await pruefeSync('ws://100.88.48.73:8700', 20)).toBe('nicht-verbunden');
  });

  it('pruefeOllama: /api/tags 200 → verbunden; Netzfehler (kein Ollama-Prozess) → ehrlich nicht-verbunden', async () => {
    setzeLocalStorage();
    vi.stubGlobal('fetch', (async (url: unknown) => {
      expect(String(url)).toBe('http://100.88.48.73:11434/api/tags');
      return { ok: true } as Response;
    }) as unknown as typeof fetch);
    const { pruefeOllama } = await import('../src/state/home-server');
    expect(await pruefeOllama('http://100.88.48.73:11434')).toBe('verbunden');

    vi.stubGlobal('fetch', (async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch);
    const { pruefeOllama: pruefeOllama2 } = await import('../src/state/home-server');
    expect(await pruefeOllama2('http://100.88.48.73:11434')).toBe('nicht-verbunden');
  });
});

describe('verbindeHomeServer / trenneHomeServer — Zustandslogik (bestehender KosmoPanel-Weg)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('verbindeHomeServer setzt Betriebsart remote + alle drei Endpunkte in EINEM Zug (gemischtes Probe-Ergebnis, Sanktion 7)', async () => {
    setzeLocalStorage({ 'kosmo.llm': JSON.stringify({ betriebsart: 'standard', remoteHost: '', provider: 'ollama', baseUrl: 'http://localhost:11434' }) });
    stubWebSocket('open');
    vi.stubGlobal('fetch', (async (url: unknown) => {
      const s = String(url);
      if (s.includes(':8600')) return { ok: true } as Response;
      if (s.includes(':11434')) throw new Error('ECONNREFUSED'); // Ollama bewusst nicht gestartet
      return { ok: false } as Response;
    }) as unknown as typeof fetch);

    const { verbindeHomeServer, warZuletztVerbunden } = await import('../src/state/home-server');
    const ergebnis = await verbindeHomeServer('100.88.48.73');

    // Gemischtes, EHRLICHES Bild — genau die Ehrlichkeits-Sanktion 7.
    expect(ergebnis).toEqual({ bridge: 'verbunden', sync: 'verbunden', llm: 'nicht-verbunden' });

    const settings = JSON.parse(localStorage.getItem('kosmo.llm') ?? '{}');
    expect(settings.betriebsart).toBe('remote');
    expect(settings.remoteHost).toBe('100.88.48.73');
    expect(settings.provider).toBe('ollama');
    expect(settings.baseUrl).toBe('http://100.88.48.73:11434');
    expect(localStorage.getItem('kosmo.bridge')).toBe('http://100.88.48.73:8600');
    expect(localStorage.getItem('kosmo.sync.url')).toBe('ws://100.88.48.73:8700');
    expect(warZuletztVerbunden()).toBe(true);
  });

  it('verbindeHomeServer bewahrt die übrigen KosmoSettings-Felder (kein Datenverlust beim Umschreiben)', async () => {
    setzeLocalStorage({
      'kosmo.llm': JSON.stringify({
        betriebsart: 'cloud',
        remoteHost: '',
        provider: 'anthropic',
        baseUrl: '',
        anthropicKey: 'sk-test-bleibt',
        anthropicModel: 'claude-opus-4-8',
      }),
    });
    stubWebSocket('error');
    vi.stubGlobal('fetch', (async () => ({ ok: false } as Response)) as unknown as typeof fetch);
    const { verbindeHomeServer } = await import('../src/state/home-server');
    await verbindeHomeServer('100.88.48.73');
    const settings = JSON.parse(localStorage.getItem('kosmo.llm') ?? '{}');
    expect(settings.anthropicKey).toBe('sk-test-bleibt');
  });

  it('trenneHomeServer stellt die lokale (Standard) Betriebsart wieder her und löscht den Verbunden-Merker', async () => {
    setzeLocalStorage({
      'kosmo.llm': JSON.stringify({ betriebsart: 'remote', remoteHost: '100.88.48.73', provider: 'ollama', baseUrl: 'http://100.88.48.73:11434' }),
      'kosmo.bridge': 'http://100.88.48.73:8600',
      'kosmo.sync.url': 'ws://100.88.48.73:8700',
      'kosmo.homeserver.verbunden': '1',
    });
    const { trenneHomeServer, warZuletztVerbunden } = await import('../src/state/home-server');
    trenneHomeServer();
    const settings = JSON.parse(localStorage.getItem('kosmo.llm') ?? '{}');
    expect(settings.betriebsart).toBe('standard');
    expect(settings.remoteHost).toBe('');
    expect(localStorage.getItem('kosmo.bridge')).toBe('http://localhost:8600');
    expect(localStorage.getItem('kosmo.sync.url')).toBe('ws://localhost:8700');
    expect(warZuletztVerbunden()).toBe(false);
  });

  it('pruefeHomeServer prüft ohne die Betriebsart anzufassen (reiner Re-Probe-Weg)', async () => {
    setzeLocalStorage({ 'kosmo.llm': JSON.stringify({ betriebsart: 'standard', remoteHost: '', provider: 'ollama', baseUrl: 'http://localhost:11434' }) });
    stubWebSocket('open');
    vi.stubGlobal('fetch', (async () => ({ ok: true } as Response)) as unknown as typeof fetch);
    const { pruefeHomeServer } = await import('../src/state/home-server');
    await pruefeHomeServer('100.88.48.73');
    const settings = JSON.parse(localStorage.getItem('kosmo.llm') ?? '{}');
    // Unverändert: pruefeHomeServer schreibt NICHTS in die Settings.
    expect(settings.betriebsart).toBe('standard');
  });
});
