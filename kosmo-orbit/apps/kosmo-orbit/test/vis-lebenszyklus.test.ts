import { describe, expect, it } from 'vitest';
import {
  istZeitUeberschritten,
  memoKey,
  RENDER_TIMEOUT_MS_DEFAULT,
  type NodeLauf,
} from '../src/modules/vis/vis-runtime';
import { mappeJobStatus } from '../src/modules/vis/vis-jobs';

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
