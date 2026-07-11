// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * v0.7.2 §9 (Paket 07): `shell/kosmo-zustand-bruecke.ts` — der Web-Teil der
 * «Haupt emittet `kosmo-zustand`»-Brücke (Spec §9/§12). `state/kosmo-status.ts`
 * selbst (fremder Dateibesitz W2-D) bleibt dabei unangetastet — dieses Modul
 * hängt sich nur von aussen an `useKosmoStatus.subscribe` an.
 */

const emitMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@tauri-apps/api/event', () => ({
  emit: emitMock,
}));

function setzeTauriMerkmal(vorhanden: boolean): void {
  if (vorhanden) {
    (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] = {};
  } else {
    delete (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'];
  }
}

beforeEach(() => {
  vi.resetModules();
  emitMock.mockClear();
  setzeTauriMerkmal(false);
});

afterEach(() => {
  setzeTauriMerkmal(false);
});

describe('installiereKosmoZustandSender — ausserhalb von Tauri (Web/PWA)', () => {
  it('ist ein reines No-op: kein Import von @tauri-apps/api/event, Cleanup wirft nicht', async () => {
    const { installiereKosmoZustandSender } = await import('../src/shell/kosmo-zustand-bruecke');
    const aufraeumen = installiereKosmoZustandSender();
    expect(emitMock).not.toHaveBeenCalled();
    expect(() => aufraeumen()).not.toThrow();
  });
});

describe('installiereKosmoZustandSender — innerhalb von Tauri (simuliert)', () => {
  it('sendet den Initialzustand sofort ("idle")', async () => {
    setzeTauriMerkmal(true);
    const { installiereKosmoZustandSender } = await import('../src/shell/kosmo-zustand-bruecke');
    const { useKosmoStatus } = await import('../src/state/kosmo-status');
    expect(useKosmoStatus.getState().zustand).toBe('idle');

    const aufraeumen = installiereKosmoZustandSender();
    await vi.waitFor(() => expect(emitMock).toHaveBeenCalledWith('kosmo-zustand', 'idle'));
    aufraeumen();
  });

  it('sendet JEDEN echten Zustandswechsel, aber nicht bei unveränderten Feldern', async () => {
    setzeTauriMerkmal(true);
    const { installiereKosmoZustandSender } = await import('../src/shell/kosmo-zustand-bruecke');
    const { useKosmoStatus } = await import('../src/state/kosmo-status');

    const aufraeumen = installiereKosmoZustandSender();
    await vi.waitFor(() => expect(emitMock).toHaveBeenCalledWith('kosmo-zustand', 'idle'));
    emitMock.mockClear();

    useKosmoStatus.getState().setzeZustand('thinking');
    await vi.waitFor(() => expect(emitMock).toHaveBeenCalledWith('kosmo-zustand', 'thinking'));

    emitMock.mockClear();
    // Ein Feld, das NICHT `zustand` ist, ändert sich — kein zusätzliches Event.
    useKosmoStatus.getState().setzeLetzteAktivitaet('Testnachricht');
    expect(emitMock).not.toHaveBeenCalled();

    aufraeumen();
  });

  it('doppelte Installation bleibt harmlos (Modul-Singleton-Guard)', async () => {
    setzeTauriMerkmal(true);
    const { installiereKosmoZustandSender } = await import('../src/shell/kosmo-zustand-bruecke');
    const ersteAufraeumung = installiereKosmoZustandSender();
    const zweiteAufraeumung = installiereKosmoZustandSender();
    expect(() => {
      ersteAufraeumung();
      zweiteAufraeumung();
    }).not.toThrow();
  });
});
