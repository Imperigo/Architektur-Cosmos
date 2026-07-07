import { describe, expect, it } from 'vitest';
import { bauWorkorder, ergebnisFuerAuftrag, type Auftrag } from '../src/state/auftragsbuch';
import type { DevJobResult } from '@kosmo/contracts';

/**
 * V2-Technik Block 2 / AB3 (Buildplan E4) — die reinen Bausteine des
 * Auftragsbuch-Kreises (Workorder bauen, Ergebnis zuordnen) getestet ohne
 * IndexedDB/DOM. Der IndexedDB-/Bridge-Teil (`uebergebeWorkorder`,
 * `pruefeDevJobs`, `setzeAuftragErgebnis`) braucht einen echten Tresor/eine
 * echte Bridge und ist bewusst NICHT hier — nur die reinen Funktionen.
 */

const beispielAuftrag = (overrides: Partial<Auftrag> = {}): Auftrag => ({
  id: 'auftrag-1',
  ts: '2026-07-07T09:00:00.000Z',
  text: 'Türanschlag wählbar machen',
  quelle: 'gesprochen',
  station: 'KosmoDesign',
  status: 'offen',
  ...overrides,
});

describe('bauWorkorder (Buildplan E2/E4 — Envelope für POST /jobs/dev)', () => {
  it('baut die Workorder-Hülle mit schema-Literal und mappt die Felder 1:1', () => {
    const w = bauWorkorder(
      [beispielAuftrag({ ort: 'Werkzeugleiste' })],
      'TKB',
      '2026-07-07T10:00:00.000Z',
    );
    expect(w.schema).toBe('kosmodev.workorder/v1');
    expect(w.projekt).toBe('TKB');
    expect(w.erzeugt_um).toBe('2026-07-07T10:00:00.000Z');
    expect(w.auftraege).toEqual([
      {
        id: 'auftrag-1',
        ts: '2026-07-07T09:00:00.000Z',
        text: 'Türanschlag wählbar machen',
        quelle: 'gesprochen',
        station: 'KosmoDesign',
        ort: 'Werkzeugleiste',
      },
    ]);
  });

  it('lässt `ort` weg, wenn nicht gesetzt (exactOptionalPropertyTypes — kein `ort: undefined`)', () => {
    const w = bauWorkorder([beispielAuftrag()], 'TKB', '2026-07-07T10:00:00.000Z');
    expect(w.auftraege[0]).not.toHaveProperty('ort');
    expect(Object.keys(w.auftraege[0]!)).toEqual(['id', 'ts', 'text', 'quelle', 'station']);
  });

  it('mappt mehrere Aufträge in der übergebenen Reihenfolge', () => {
    const w = bauWorkorder(
      [beispielAuftrag({ id: 'a' }), beispielAuftrag({ id: 'b', station: 'KosmoPublish' })],
      'TKB',
      '2026-07-07T10:00:00.000Z',
    );
    expect(w.auftraege.map((a) => a.id)).toEqual(['a', 'b']);
    expect(w.auftraege[1]!.station).toBe('KosmoPublish');
  });

  it('wirft bei leerer Liste (eine Workorder ohne Aufträge ist sinnlos)', () => {
    expect(() => bauWorkorder([], 'TKB', '2026-07-07T10:00:00.000Z')).toThrow();
  });
});

describe('ergebnisFuerAuftrag (Buildplan E4/E5 — Rückkanal auf den Auftrag mappen)', () => {
  const result: DevJobResult = {
    worker: 'claude-code-homestation',
    abgeschlossen_um: '2026-07-07T12:00:00.000Z',
    ergebnisse: [
      { auftrag_id: 'a', umgesetzt: true, commit: 'abc1234', notiz: 'Umgesetzt in Commit abc1234' },
      { auftrag_id: 'b', umgesetzt: false, notiz: 'Zurückgestellt' },
    ],
  };

  it('findet das passende Ergebnis und übernimmt commit + notiz', () => {
    expect(ergebnisFuerAuftrag(result, 'a')).toEqual({
      worker: 'claude-code-homestation',
      commit: 'abc1234',
      notiz: 'Umgesetzt in Commit abc1234',
    });
  });

  it('lässt `commit` weg, wenn keiner gemeldet wurde (exactOptionalPropertyTypes)', () => {
    const ergebnis = ergebnisFuerAuftrag(result, 'b');
    expect(ergebnis).not.toBeNull();
    expect(ergebnis).not.toHaveProperty('commit');
    expect(ergebnis!.notiz).toBe('Zurückgestellt');
  });

  it('gibt null bei einer fremden auftrag_id (kein falsches Ergebnis untergeschoben)', () => {
    expect(ergebnisFuerAuftrag(result, 'nicht-im-result')).toBeNull();
  });

  it('reicht den worker unverändert durch — fake-worker bleibt fake-worker (E5: daran hängt das UI-Label «Simulation»)', () => {
    const fakeResult: DevJobResult = {
      worker: 'fake-worker',
      abgeschlossen_um: '2026-07-07T12:00:00.000Z',
      ergebnisse: [{ auftrag_id: 'a', umgesetzt: false, notiz: 'Simulation — keine echte Umsetzung' }],
    };
    const ergebnis = ergebnisFuerAuftrag(fakeResult, 'a');
    expect(ergebnis?.worker).toBe('fake-worker');
    expect(ergebnis).not.toHaveProperty('commit');
    expect(ergebnis?.notiz).toBe('Simulation — keine echte Umsetzung');
  });
});
