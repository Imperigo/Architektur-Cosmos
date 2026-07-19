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
    zeigeBemassung: true,
    zeigeZonen: true,
    zeigeRaumtypen: true,
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

/**
 * PB3 (v0.8.5, `docs/V085-SPEZ.md` §3 E5 + §7 C-19) — die zwei echten
 * Blatt-Darstellungs-Toggles («Bemassung»/«Zonen», DARSTELLUNG-Insel
 * `SichtbarkeitStufe2`). Default `true` erhält den heutigen Anzeige-Zustand
 * (Bestandsschutz) — s. `publish-runtime.ts`-Kopfkommentar für die volle
 * Begründung (Laufzeit-Store statt `doc.settings`, CSS-Filterung statt
 * Kernel-Änderung).
 */
describe('publish-runtime — PB3 Sichtbarkeits-Toggles (C-19)', () => {
  it('zeigeBemassung: Default true (Bestandsschutz — heutige Anzeige unverändert, bis aktiv ausgeschaltet)', () => {
    expect(usePublishRuntime.getState().zeigeBemassung).toBe(true);
    usePublishRuntime.getState().setZeigeBemassung(false);
    expect(usePublishRuntime.getState().zeigeBemassung).toBe(false);
    usePublishRuntime.getState().setZeigeBemassung(true);
    expect(usePublishRuntime.getState().zeigeBemassung).toBe(true);
  });

  it('zeigeZonen: Default true, unabhängig von zeigeBemassung setzbar', () => {
    expect(usePublishRuntime.getState().zeigeZonen).toBe(true);
    usePublishRuntime.getState().setZeigeZonen(false);
    expect(usePublishRuntime.getState().zeigeZonen).toBe(false);
    // Bemassung bleibt vom Zonen-Toggle unberührt — zwei unabhängige Felder.
    expect(usePublishRuntime.getState().zeigeBemassung).toBe(true);
  });

  it('beide Felder überleben einen Store-Zugriff, der KEIN neues `usePublishRuntime.setState()` auslöst (Modul-Singleton, «Zustand überlebt Insel-Schliessen»)', () => {
    usePublishRuntime.getState().setZeigeBemassung(false);
    usePublishRuntime.getState().setZeigeZonen(false);
    // Ein simulierter Insel-Schliessen/-Öffnen-Zyklus liest denselben
    // Modul-Singleton neu aus (kein Reset, anders als eine lokale
    // Komponenten-`useState`, s. `BlattCanvas.tsx`-Kopfkommentar).
    expect(usePublishRuntime.getState().zeigeBemassung).toBe(false);
    expect(usePublishRuntime.getState().zeigeZonen).toBe(false);
  });
});

/**
 * PA3 (v0.8.6 §3 E3 + §7 C-6/C-7) — dritter Sichtbarkeits-Toggle
 * «Raumtypen», UNABHÄNGIG von «Zonen» (Parzellen-/Nachbarkontext bleibt
 * unverändert). S. `publish-runtime.ts`-Kopfkommentar zu `zeigeRaumtypen`
 * für die volle Begründung (`derive/plansvg.ts`s `opts.datenAttribute` wird
 * NUR im Publish-Blatt-Renderpfad aktiv gesetzt, golden-still überall
 * sonst).
 */
describe('publish-runtime — PA3 Raumtypen-Toggle (E3, C-6/C-7)', () => {
  it('zeigeRaumtypen: Default true, unabhängig von zeigeZonen/zeigeBemassung setzbar', () => {
    expect(usePublishRuntime.getState().zeigeRaumtypen).toBe(true);
    usePublishRuntime.getState().setZeigeRaumtypen(false);
    expect(usePublishRuntime.getState().zeigeRaumtypen).toBe(false);
    // Zonen/Bemassung bleiben vom Raumtypen-Toggle unberührt.
    expect(usePublishRuntime.getState().zeigeZonen).toBe(true);
    expect(usePublishRuntime.getState().zeigeBemassung).toBe(true);
    usePublishRuntime.getState().setZeigeRaumtypen(true);
    expect(usePublishRuntime.getState().zeigeRaumtypen).toBe(true);
  });

  it('zeigeZonen-Toggle lässt zeigeRaumtypen unberührt (zwei unabhängige Felder, C-7)', () => {
    usePublishRuntime.getState().setZeigeZonen(false);
    expect(usePublishRuntime.getState().zeigeRaumtypen).toBe(true);
  });

  it('zeigeRaumtypen überlebt einen Store-Zugriff ohne neues setState (Modul-Singleton)', () => {
    usePublishRuntime.getState().setZeigeRaumtypen(false);
    expect(usePublishRuntime.getState().zeigeRaumtypen).toBe(false);
  });
});
