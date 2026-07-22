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

  it('pruefeOllama: leere URL → sofort nicht-verbunden, `modelle` bleibt undefined (kein Server-Kontakt)', async () => {
    setzeLocalStorage();
    const { pruefeOllama } = await import('../src/state/home-server');
    const erg = await pruefeOllama('');
    expect(erg).toEqual({ status: 'nicht-verbunden' });
  });

  it('pruefeOllama: Netzfehler (kein Ollama-Prozess, ECONNREFUSED) → ehrlich nicht-verbunden, `modelle` bleibt undefined', async () => {
    setzeLocalStorage();
    vi.stubGlobal('fetch', (async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch);
    const { pruefeOllama } = await import('../src/state/home-server');
    expect(await pruefeOllama('http://100.88.48.73:11434')).toEqual({ status: 'nicht-verbunden' });
  });

  it('pruefeOllama: HTTP-Fehlerstatus (z.B. 500) → nicht-verbunden, `modelle` bleibt undefined', async () => {
    setzeLocalStorage();
    vi.stubGlobal('fetch', (async () => ({ ok: false, status: 500 })) as unknown as typeof fetch);
    const { pruefeOllama } = await import('../src/state/home-server');
    expect(await pruefeOllama('http://100.88.48.73:11434')).toEqual({ status: 'nicht-verbunden' });
  });

  it('pruefeOllama: Timeout (kein Ereignis, `AbortSignal`) → ehrlich nicht-verbunden', async () => {
    setzeLocalStorage();
    vi.stubGlobal('fetch', (async (_url: unknown, init?: RequestInit) => {
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('AbortError')));
      });
    }) as unknown as typeof fetch);
    const { pruefeOllama, PROBE_TIMEOUT_MS } = await import('../src/state/home-server');
    expect(PROBE_TIMEOUT_MS).toBeGreaterThan(0);
    expect(await pruefeOllama('http://100.88.48.73:11434')).toEqual({ status: 'nicht-verbunden' });
  });

  it('pruefeOllama: Server antwortet 200, aber Zeichner/Leiter fehlen (nur Fremd-Modell installiert) → ehrlich nicht-verbunden, Modellliste bleibt aber gefüllt', async () => {
    setzeLocalStorage();
    vi.stubGlobal('fetch', (async (url: unknown) => {
      expect(String(url)).toBe('http://100.88.48.73:11434/api/tags');
      return {
        ok: true,
        json: async () => ({ models: [{ name: 'llama3.2:latest' }] }),
      } as unknown as Response;
    }) as unknown as typeof fetch);
    const { pruefeOllama } = await import('../src/state/home-server');
    expect(await pruefeOllama('http://100.88.48.73:11434')).toEqual({
      status: 'nicht-verbunden',
      modelle: ['llama3.2:latest'],
    });
  });

  it('pruefeOllama: Zeichner ODER Leiter vorhanden → verbunden (Owner-Fall aus `docs/HOMESERVER-STATUS.md`: Meister qwen3:72b fehlt bewusst, Leiter+Zeichner installiert)', async () => {
    setzeLocalStorage();
    vi.stubGlobal('fetch', (async () => ({
      ok: true,
      json: async () => ({ models: [{ name: 'qwen3-coder:30b' }, { name: 'qwen3:30b' }, { name: 'llama3.2' }] }),
    })) as unknown as typeof fetch);
    const { pruefeOllama } = await import('../src/state/home-server');
    const erg = await pruefeOllama('http://100.88.48.73:11434');
    expect(erg.status).toBe('verbunden');
    expect(erg.modelle).toEqual(['qwen3-coder:30b', 'qwen3:30b', 'llama3.2']);
  });

  it('pruefeOllama: nur der Zeichner allein reicht bereits für verbunden', async () => {
    setzeLocalStorage();
    vi.stubGlobal('fetch', (async () => ({
      ok: true,
      json: async () => ({ models: [{ name: 'qwen3-coder:30b' }] }),
    })) as unknown as typeof fetch);
    const { pruefeOllama } = await import('../src/state/home-server');
    expect((await pruefeOllama('http://100.88.48.73:11434')).status).toBe('verbunden');
  });

  it('pruefeOllama: 200 aber kaputtes/leeres JSON → ehrlich leere Modellliste statt Crash, nicht-verbunden', async () => {
    setzeLocalStorage();
    vi.stubGlobal('fetch', (async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
    })) as unknown as typeof fetch);
    const { pruefeOllama } = await import('../src/state/home-server');
    expect(await pruefeOllama('http://100.88.48.73:11434')).toEqual({ status: 'nicht-verbunden', modelle: [] });
  });
});

describe('E-L (v0.9.0) — ehrlicher Staffelungs-Abgleich in pruefeHomeServer/verbindeHomeServer (`llmModelle`, additiv)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('Ollama nicht erreichbar (Container-Ehrlichkeitsbeweis): `llmModelle` fehlt GANZ — kein erfundener Rollen-Abgleich ohne Server-Kontakt', async () => {
    setzeLocalStorage();
    stubWebSocket('open');
    vi.stubGlobal('fetch', (async (url: unknown) => {
      const s = String(url);
      if (s.includes(':8600')) return { ok: true } as Response;
      if (s.includes(':11434')) throw new Error('ECONNREFUSED');
      return { ok: false } as Response;
    }) as unknown as typeof fetch);
    const { pruefeHomeServer } = await import('../src/state/home-server');
    const erg = await pruefeHomeServer('100.88.48.73');
    expect(erg.llm).toBe('nicht-verbunden');
    expect(erg.llmModelle).toBeUndefined();
    expect('llmModelle' in erg).toBe(false);
  });

  it('Ollama antwortet, Meister fehlt (Owner-Fall) → `llmModelle` zeigt Meister fehlend + Leiter/Zeichner vorhanden + deklarierten Fallback', async () => {
    setzeLocalStorage();
    stubWebSocket('open');
    vi.stubGlobal('fetch', (async (url: unknown) => {
      const s = String(url);
      if (s.includes(':11434')) {
        return {
          ok: true,
          json: async () => ({ models: [{ name: 'qwen3-coder:30b' }, { name: 'qwen3:30b' }] }),
        } as unknown as Response;
      }
      return { ok: true } as Response;
    }) as unknown as typeof fetch);
    const { pruefeHomeServer } = await import('../src/state/home-server');
    const erg = await pruefeHomeServer('100.88.48.73');
    expect(erg.llm).toBe('verbunden');
    expect(erg.llmModelle).toBeDefined();
    expect(erg.llmModelle?.verfuegbar).toEqual(['qwen3-coder:30b', 'qwen3:30b']);
    expect(erg.llmModelle?.rollen).toEqual([
      { rolle: 'meister', modell: 'qwen3:72b', vorhanden: false },
      { rolle: 'leiter', modell: 'qwen3:30b', vorhanden: true },
      { rolle: 'zeichner', modell: 'qwen3-coder:30b', vorhanden: true },
    ]);
    expect(erg.llmModelle?.meisterFallbackAufLeiter).toBe(true);
  });

  it('Ollama antwortet, aber kein einziges Staffelungs-Modell installiert (nur Fremd-Modell) → llm bleibt ehrlich nicht-verbunden, `llmModelle` zeigt trotzdem alle drei als fehlend', async () => {
    setzeLocalStorage();
    stubWebSocket('open');
    vi.stubGlobal('fetch', (async (url: unknown) => {
      const s = String(url);
      if (s.includes(':11434')) {
        return { ok: true, json: async () => ({ models: [{ name: 'llama3.2:latest' }] }) } as unknown as Response;
      }
      return { ok: true } as Response;
    }) as unknown as typeof fetch);
    const { pruefeHomeServer } = await import('../src/state/home-server');
    const erg = await pruefeHomeServer('100.88.48.73');
    expect(erg.llm).toBe('nicht-verbunden');
    expect(erg.llmModelle?.rollen.every((r) => !r.vorhanden)).toBe(true);
    expect(erg.llmModelle?.meisterFallbackAufLeiter).toBe(true);
  });

  it('Ollama antwortet mit allen drei Staffelungs-Modellen: kein Fallback nötig, alle Rollen vorhanden', async () => {
    setzeLocalStorage();
    stubWebSocket('open');
    vi.stubGlobal('fetch', (async (url: unknown) => {
      const s = String(url);
      if (s.includes(':11434')) {
        return {
          ok: true,
          json: async () => ({
            models: [{ name: 'qwen3:72b' }, { name: 'qwen3:30b' }, { name: 'qwen3-coder:30b' }],
          }),
        } as unknown as Response;
      }
      return { ok: true } as Response;
    }) as unknown as typeof fetch);
    const { pruefeHomeServer } = await import('../src/state/home-server');
    const erg = await pruefeHomeServer('100.88.48.73');
    expect(erg.llm).toBe('verbunden');
    expect(erg.llmModelle?.rollen.every((r) => r.vorhanden)).toBe(true);
    expect(erg.llmModelle?.meisterFallbackAufLeiter).toBe(false);
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
