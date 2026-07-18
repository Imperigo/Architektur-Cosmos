import { beforeEach, describe, expect, it } from 'vitest';
import { usePublishRuntime } from '../src/modules/publish/publish-runtime';

/**
 * PC3 (`docs/V084-SPEZ.md` §5 W3, C-19) — die additiven Island-UI-Felder in
 * `publish-runtime.ts` (aktives Blatt/ausgewählte Platzierung/Zoom-
 * Fernauslöser). Reine Store-Logik, keine `BlattZoomBuehne`-Abhängigkeit.
 * Muster `test/vis-island-runtime.test.ts` (PC1).
 */

beforeEach(() => {
  usePublishRuntime.setState({
    aktiverSheetId: null,
    selectedPlacementId: null,
    canvasBefehl: null,
  });
});

describe('publish-runtime — PC3 Island-UI-Felder', () => {
  it('aktiverSheetId: Default null, setzbar', () => {
    expect(usePublishRuntime.getState().aktiverSheetId).toBeNull();
    usePublishRuntime.getState().setAktiverSheetId('sheet-1');
    expect(usePublishRuntime.getState().aktiverSheetId).toBe('sheet-1');
  });

  it('selectedPlacementId: Default null, setzbar', () => {
    expect(usePublishRuntime.getState().selectedPlacementId).toBeNull();
    usePublishRuntime.getState().setSelectedPlacementId('pl-1');
    expect(usePublishRuntime.getState().selectedPlacementId).toBe('pl-1');
    usePublishRuntime.getState().setSelectedPlacementId(null);
    expect(usePublishRuntime.getState().selectedPlacementId).toBeNull();
  });

  it('canvasBefehl: sendeCanvasBefehl erhöht die Nonce bei JEDEM Aufruf, auch bei identischem Typ hintereinander', () => {
    expect(usePublishRuntime.getState().canvasBefehl).toBeNull();
    usePublishRuntime.getState().sendeCanvasBefehl('zoom-in');
    const erster = usePublishRuntime.getState().canvasBefehl;
    expect(erster?.typ).toBe('zoom-in');
    expect(erster?.nonce).toBe(1);
    usePublishRuntime.getState().sendeCanvasBefehl('zoom-in');
    const zweiter = usePublishRuntime.getState().canvasBefehl;
    // NEUES Objekt UND höhere Nonce — ein Effekt mit `[canvasBefehl]`-Deps
    // (Objekt-Referenz-Vergleich) feuert darum bei jedem Klick erneut.
    expect(zweiter).not.toBe(erster);
    expect(zweiter?.nonce).toBe(2);
  });

  it('canvasBefehl: zoom-fit und zoom-out sind eigene Typen', () => {
    usePublishRuntime.getState().sendeCanvasBefehl('zoom-fit');
    expect(usePublishRuntime.getState().canvasBefehl?.typ).toBe('zoom-fit');
    usePublishRuntime.getState().sendeCanvasBefehl('zoom-out');
    expect(usePublishRuntime.getState().canvasBefehl?.typ).toBe('zoom-out');
  });
});
