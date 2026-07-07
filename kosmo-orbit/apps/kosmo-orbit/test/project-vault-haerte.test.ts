import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import {
  vaultTx,
  oeffneProjekt,
  oeffneJsonAlsNeuesProjekt,
  aktivesProjektId,
  type VaultEintrag,
} from '../src/state/project-vault';
import { useProject } from '../src/state/project-store';

/**
 * Serie I / Batch B7 — Parser-Robustheit: Tresor-Records (IndexedDB) laufen
 * nie durch `JSON.parse`, sind aber ebenso «fremd» wie eine `.kosmo`-Datei
 * (ein manipulierter Browser-Speicher, ein künftiges Sync-Ziel). Ein
 * beschädigter Record darf beim Öffnen weder crashen noch — das ist der
 * eigentliche Fund dieses Batches — den «aktives Projekt»-Zeiger auf ein nie
 * geladenes Projekt umstellen (State-Write VOR der Validierung wäre stille
 * Verseuchung).
 */

describe('oeffneProjekt — beschädigter Tresor-Record', () => {
  it('lehnt entities-als-Nicht-Array ab, OHNE den aktiven Zeiger oder den Doc-State zu verändern', async () => {
    const vorherId = aktivesProjektId();
    const vorherDoc = useProject.getState().doc;

    const boese = {
      id: 'boese-vault-1',
      name: 'Böse',
      updatedAt: new Date().toISOString(),
      elemente: 0,
      json: { schema: 'kosmo.model/v1', settings: {}, entities: 'nicht-array' },
    } as unknown as VaultEintrag;
    await vaultTx('projekte', 'readwrite', (s) => s.put(boese));

    await expect(oeffneProjekt('boese-vault-1')).rejects.toThrow(/beschädigt/);

    // Kein State-Write: weder der aktive Zeiger noch der lebende Doc haben
    // sich verändert — die Ablehnung kam VOR jeder Mutation.
    expect(aktivesProjektId()).toBe(vorherId);
    expect(useProject.getState().doc).toBe(vorherDoc);
  });

  it('lehnt eine Entity ohne gültige id/kind ab, ohne State zu schreiben', async () => {
    const vorherId = aktivesProjektId();
    const vorherDoc = useProject.getState().doc;

    const boese = {
      id: 'boese-vault-2',
      name: 'Böse 2',
      updatedAt: new Date().toISOString(),
      elemente: 1,
      json: { schema: 'kosmo.model/v1', settings: {}, entities: [{ foo: 'bar' }] },
    } as unknown as VaultEintrag;
    await vaultTx('projekte', 'readwrite', (s) => s.put(boese));

    await expect(oeffneProjekt('boese-vault-2')).rejects.toThrow(/beschädigt/);
    expect(aktivesProjektId()).toBe(vorherId);
    expect(useProject.getState().doc).toBe(vorherDoc);
  });

  it('unbekannte id → klarer Fehler, kein Crash', async () => {
    await expect(oeffneProjekt('gibt-es-nicht')).rejects.toThrow(/nicht gefunden/);
  });
});

describe('oeffneJsonAlsNeuesProjekt — beschädigte Variante/Archiv-JSON', () => {
  it('wirft bei kaputter Struktur, OHNE den aktiven Zeiger umzustellen', () => {
    const vorherId = aktivesProjektId();
    const vorherDoc = useProject.getState().doc;

    expect(() =>
      oeffneJsonAlsNeuesProjekt({ schema: 'kosmo.model/v1', settings: {}, entities: null } as never),
    ).toThrow(/beschädigt/);

    expect(aktivesProjektId()).toBe(vorherId);
    expect(useProject.getState().doc).toBe(vorherDoc);
  });

  it('gültiges Doc-JSON öffnet weiterhin normal (Positivfall) und stellt den Zeiger um', () => {
    const vorherId = aktivesProjektId();
    oeffneJsonAlsNeuesProjekt({ schema: 'kosmo.model/v1', settings: {}, entities: [] } as never);
    expect(aktivesProjektId()).not.toBe(vorherId);
    expect(useProject.getState().doc.entities.size).toBe(0);
  });
});
