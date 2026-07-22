import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  istZeitUeberschritten,
  memoKey,
  RENDER_TIMEOUT_MS_DEFAULT,
  type NodeLauf,
} from '../src/modules/vis/vis-runtime';
import {
  BridgeHttpError,
  bridgeVermutlichCspGeblockt,
  istAuthFehler,
  mappeJobStatus,
} from '../src/modules/vis/vis-jobs';

/**
 * V2-Technik Block 1 / HS3 — die reinen Bausteine der Client-Zustandsmaschine
 * (Timeout-Wächter + Bridge→Client-Status-Mapper) getestet ohne DOM/Bridge.
 */

describe('istZeitUeberschritten (HS3 Timeout-Wächter)', () => {
  const basis = (status: NodeLauf['status'], gestartetUm?: number): Pick<NodeLauf, 'status' | 'gestartetUm'> =>
    gestartetUm === undefined ? { status } : { status, gestartetUm };

  it('schlägt an, wenn ein offener Lauf das Limit überschreitet', () => {
    expect(istZeitUeberschritten(basis('rendert', 0), 11 * 60 * 1000, RENDER_TIMEOUT_MS_DEFAULT)).toBe(true);
    expect(istZeitUeberschritten(basis('wartetGpu', 0), 11 * 60 * 1000, RENDER_TIMEOUT_MS_DEFAULT)).toBe(true);
    expect(istZeitUeberschritten(basis('gesendet', 0), 11 * 60 * 1000, RENDER_TIMEOUT_MS_DEFAULT)).toBe(true);
  });

  it('bleibt ruhig innerhalb des Limits', () => {
    expect(istZeitUeberschritten(basis('rendert', 0), 5 * 60 * 1000, RENDER_TIMEOUT_MS_DEFAULT)).toBe(false);
  });

  it('zählt Warten auf Freigabe NIE als überschritten (der Mensch entscheidet)', () => {
    expect(istZeitUeberschritten(basis('wartetFreigabe', 0), 999 * 60 * 1000, RENDER_TIMEOUT_MS_DEFAULT)).toBe(false);
  });

  it('braucht einen Startzeitpunkt (ohne bleibt es false)', () => {
    expect(istZeitUeberschritten(basis('rendert'), 999 * 60 * 1000, RENDER_TIMEOUT_MS_DEFAULT)).toBe(false);
  });

  it('lässt Endzustände in Ruhe (fertig/fehler/abgebrochen)', () => {
    expect(istZeitUeberschritten(basis('fertig', 0), 999 * 60 * 1000, 1000)).toBe(false);
    expect(istZeitUeberschritten(basis('fehler', 0), 999 * 60 * 1000, 1000)).toBe(false);
    expect(istZeitUeberschritten(basis('abgebrochen', 0), 999 * 60 * 1000, 1000)).toBe(false);
  });
});

describe('mappeJobStatus (HS3 Bridge→Client-Mapper)', () => {
  it('übersetzt jeden Bridge-Zustand ehrlich', () => {
    expect(mappeJobStatus({ status: 'awaiting_approval' })).toBe('wartetFreigabe');
    expect(mappeJobStatus({ status: 'queued' })).toBe('wartetGpu');
    expect(mappeJobStatus({ status: 'running' })).toBe('rendert');
    expect(mappeJobStatus({ status: 'done' })).toBe('fertig');
    expect(mappeJobStatus({ status: 'error' })).toBe('fehler');
    expect(mappeJobStatus({ status: 'cancelled' })).toBe('abgebrochen');
  });

  it('ein eingebettetes Ergebnis gewinnt (auch wenn der Status hinterherhinkt)', () => {
    expect(mappeJobStatus({ status: 'running', result: { images: [] } })).toBe('fertig');
  });

  it('unbekannter Status fällt auf einen Wartezustand (nie stiller Fertig, nie vorgetäuschtes «läuft»)', () => {
    expect(mappeJobStatus({ status: 'irgendwas-neues' })).toBe('wartetGpu');
  });
});

describe('istAuthFehler (KLEIN 8 — 401/403 nicht mehr still verschlucken)', () => {
  it('erkennt einen 401/403 als Auth-Fehler', () => {
    expect(istAuthFehler(new BridgeHttpError(401, 'Job x'))).toBe(true);
    expect(istAuthFehler(new BridgeHttpError(403, 'Job x'))).toBe(true);
  });

  it('lässt andere HTTP-Fehler (404/500) NICHT als Auth durchgehen', () => {
    expect(istAuthFehler(new BridgeHttpError(404, 'Job x'))).toBe(false);
    expect(istAuthFehler(new BridgeHttpError(500, 'Job x'))).toBe(false);
  });

  it('behandelt transiente Netzfehler (TypeError) nicht als Auth', () => {
    expect(istAuthFehler(new TypeError('Failed to fetch'))).toBe(false);
    expect(istAuthFehler(new Error('irgendwas'))).toBe(false);
  });

  it('trägt den Status-Code für ehrliche Meldungen', () => {
    expect(new BridgeHttpError(401, 'Job x').status).toBe(401);
    expect(new BridgeHttpError(401, 'Job x').message).toContain('401');
  });
});

describe('bridgeVermutlichCspGeblockt (KLEIN 9 — LAN-IP ehrlich benennen)', () => {
  const setzeBridge = (url: string | null) => {
    const store: Record<string, string> = url === null ? {} : { 'kosmo.bridge': url };
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
  };
  afterEach(() => vi.unstubAllGlobals());

  it('meldet eine LAN-IPv4-Bridge auf einem FREMDEN Port als (vermutlich) CSP-geblockt', () => {
    setzeBridge('http://192.168.1.20:9999');
    expect(bridgeVermutlichCspGeblockt()).toBe(true);
    setzeBridge('http://10.0.0.5:8601');
    expect(bridgeVermutlichCspGeblockt()).toBe(true);
  });

  it('deckt IP-Bridges auf den HomeServer-Ports 8600/8700/11434 (v0.9.0 CSP-Freigabe, Owner-Live-Befund 22.07.2026)', () => {
    setzeBridge('http://100.88.48.73:8600');
    expect(bridgeVermutlichCspGeblockt()).toBe(false);
    setzeBridge('http://192.168.1.20:8600');
    expect(bridgeVermutlichCspGeblockt()).toBe(false);
    setzeBridge('http://100.88.48.73:8700');
    expect(bridgeVermutlichCspGeblockt()).toBe(false);
    setzeBridge('http://100.88.48.73:11434');
    expect(bridgeVermutlichCspGeblockt()).toBe(false);
  });

  it('lässt localhost/127.0.0.1 in Ruhe (die CSP deckt sie)', () => {
    setzeBridge('http://localhost:8600');
    expect(bridgeVermutlichCspGeblockt()).toBe(false);
    setzeBridge('http://127.0.0.1:8600');
    expect(bridgeVermutlichCspGeblockt()).toBe(false);
  });

  it('markiert Hostnamen NICHT vorschnell (könnten lokal auflösbar sein)', () => {
    setzeBridge('http://homestation.local:8600');
    expect(bridgeVermutlichCspGeblockt()).toBe(false);
  });

  it('fällt beim Default (localhost) sauber auf false', () => {
    setzeBridge(null);
    expect(bridgeVermutlichCspGeblockt()).toBe(false);
  });
});

describe('memoKey (HS5 «Nur Cycles» im Schlüssel)', () => {
  const basis = { prompt: 'Morgenlicht', faithful: 0.8, samples: 128 };

  it('ändert sich, wenn nurCycles umschaltet — sonst löge der Node «aktuell»', () => {
    const ki = memoKey({ ...basis, nurCycles: false });
    const cycles = memoKey({ ...basis, nurCycles: true });
    expect(ki).not.toBe(cycles);
  });

  it('behandelt fehlendes nurCycles wie false (rückwärtskompatibel)', () => {
    expect(memoKey(basis)).toBe(memoKey({ ...basis, nurCycles: false }));
  });

  it('bleibt für gleiche Parameter stabil (deterministisch)', () => {
    expect(memoKey({ ...basis, nurCycles: true })).toBe(memoKey({ ...basis, nurCycles: true }));
  });
});
