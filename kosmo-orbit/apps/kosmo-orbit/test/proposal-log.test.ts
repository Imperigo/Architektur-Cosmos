// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { ProposalLog, proposalLogStore, type ProposalKorrekturSchritt } from '../src/state/proposal-log';

/**
 * v0.8.2/P3 «Signal-Erfassung» (`docs/V082-SPEZ.md` §4.1/§4.2/§4.5, neu) —
 * der Vorschlags-Log: jeder Diff-Karten-Ausgang, jede Parameter-Reparatur,
 * jedes Auto-Pack-Layout-Signal, plus die DPO-Rohpaar-Verknüpfung
 * («Ablehnung → nächste manuelle Aktion») und der `kosmo-signal/v1`-Export
 * (§4.4, visibility-gefiltert, Owner-Entscheid 1).
 */

beforeEach(() => {
  localStorage.clear();
});

describe('ProposalLog.protokolliereProposal (§4.1/C-18)', () => {
  it('hält commandId/params/summary/ausgang fest, Default-Visibility public', () => {
    const log = new ProposalLog(proposalLogStore());
    log.protokolliereProposal({
      commandId: 'design.wandZeichnen',
      params: { a: { x: 0, y: 0 }, b: { x: 1000, y: 0 } },
      summary: 'Wand 1.0 m',
      ausgang: 'angenommen',
    });

    expect(log.all).toHaveLength(1);
    const [eintrag] = log.all;
    expect(eintrag!.art).toBe('proposal');
    expect(eintrag!.visibility).toBe('public');
    expect(eintrag!.payload).toMatchObject({
      commandId: 'design.wandZeichnen',
      ausgang: 'angenommen',
    });
    expect(typeof eintrag!.ts).toBe('string');
  });

  it('persistiert über den Store — ein neu gebautes ProposalLog sieht den Eintrag', () => {
    const store = proposalLogStore();
    const log = new ProposalLog(store);
    log.protokolliereProposal({
      commandId: 'design.wandZeichnen',
      params: {},
      summary: 'Wand',
      ausgang: 'angenommen',
    });

    const neuGeladen = new ProposalLog(store);
    expect(neuGeladen.all).toHaveLength(1);
  });

  it('ohne Kappung: mehr als 200 Einträge bleiben alle erhalten (anders als das Lernjournal)', () => {
    const log = new ProposalLog(proposalLogStore());
    for (let i = 0; i < 210; i++) {
      log.protokolliereProposal({
        commandId: 'design.wandZeichnen',
        params: { i },
        summary: `Wand ${i}`,
        ausgang: 'angenommen',
      });
    }
    expect(log.all).toHaveLength(210);
  });
});

describe('ProposalLog.verknuepfeNaechsteKorrektur (§4.1/C-19, DPO-Rohpaar-Kern)', () => {
  it('verknüpft die NÄCHSTE manuelle Aktion nach einer Ablehnung als folgeKorrektur', () => {
    const log = new ProposalLog(proposalLogStore());
    log.protokolliereProposal({
      commandId: 'design.wandZeichnen',
      params: { dicke: 100 },
      summary: 'Wand (falsch)',
      ausgang: 'abgelehnt',
      grund: 'Wandstärke falsch',
    });
    const korrektur: ProposalKorrekturSchritt = {
      commandId: 'design.wandZeichnen',
      params: { dicke: 200 },
      summary: 'Wand (korrigiert)',
    };
    log.verknuepfeNaechsteKorrektur(korrektur);

    const [eintrag] = log.all;
    expect(eintrag!.payload).toMatchObject({ folgeKorrektur: korrektur });
  });

  it('verknüpft NUR die erste manuelle Aktion danach, nicht jede weitere', () => {
    const log = new ProposalLog(proposalLogStore());
    log.protokolliereProposal({
      commandId: 'design.wandZeichnen',
      params: {},
      summary: 'Abgelehnt',
      ausgang: 'abgelehnt',
    });
    log.verknuepfeNaechsteKorrektur({ commandId: 'a', params: {}, summary: 'Erste' });
    log.verknuepfeNaechsteKorrektur({ commandId: 'b', params: {}, summary: 'Zweite' });

    const [eintrag] = log.all;
    expect(eintrag!.payload).toMatchObject({
      folgeKorrektur: { commandId: 'a', summary: 'Erste' },
    });
  });

  it('ohne offene Ablehnung: verknuepfeNaechsteKorrektur ist ein No-Op', () => {
    const log = new ProposalLog(proposalLogStore());
    log.protokolliereProposal({
      commandId: 'design.wandZeichnen',
      params: {},
      summary: 'Angenommen',
      ausgang: 'angenommen',
    });
    expect(() =>
      log.verknuepfeNaechsteKorrektur({ commandId: 'x', params: {}, summary: 'x' }),
    ).not.toThrow();
    expect(log.all[0]!.payload).not.toHaveProperty('folgeKorrektur');
  });

  it('eine zweite Ablehnung öffnet erneut ein Warten, unabhängig von der ersten', () => {
    const log = new ProposalLog(proposalLogStore());
    log.protokolliereProposal({ commandId: 'a', params: {}, summary: 'A', ausgang: 'abgelehnt' });
    log.verknuepfeNaechsteKorrektur({ commandId: 'a-fix', params: {}, summary: 'A-Fix' });
    log.protokolliereProposal({ commandId: 'b', params: {}, summary: 'B', ausgang: 'abgelehnt' });
    log.verknuepfeNaechsteKorrektur({ commandId: 'b-fix', params: {}, summary: 'B-Fix' });

    const [ersterEintrag, zweiterEintrag] = log.all;
    expect(ersterEintrag!.payload).toMatchObject({ folgeKorrektur: { commandId: 'a-fix' } });
    expect(zweiterEintrag!.payload).toMatchObject({ folgeKorrektur: { commandId: 'b-fix' } });
  });
});

describe('ProposalLog.protokolliereReparatur (§4.2/C-21)', () => {
  it('hält vorher/nachher fest', () => {
    const log = new ProposalLog(proposalLogStore());
    log.protokolliereReparatur({
      vorher: "{'a':1,}",
      nachher: { commandId: 'design.wandZeichnen', params: { a: 1 }, summary: 'Wand' },
    });
    const [eintrag] = log.all;
    expect(eintrag!.art).toBe('reparatur');
    expect(eintrag!.payload).toMatchObject({ vorher: "{'a':1,}" });
  });
});

describe('ProposalLog.protokolliereLayout (§4.5/C-30)', () => {
  it('hält sheetId/vorschlag/endzustand/optionen fest', () => {
    const log = new ProposalLog(proposalLogStore());
    const vorschlag = { reihenfolge: ['grundriss'], spaltenZielMm: 90 };
    const endzustand = { reihenfolge: ['schnitt', 'grundriss'], spaltenZielMm: 120 };
    log.protokolliereLayout({ sheetId: 'blatt-1', vorschlag, endzustand, optionen: endzustand });

    const [eintrag] = log.all;
    expect(eintrag!.art).toBe('layout');
    expect(eintrag!.payload).toMatchObject({ sheetId: 'blatt-1', vorschlag, endzustand });
  });
});

describe('ProposalLog.toKosmoSignalJsonl (§4.4/§5, Owner-Entscheid 1)', () => {
  it('Default public filtert private Einträge heraus', () => {
    const log = new ProposalLog(proposalLogStore());
    log.protokolliereProposal({ commandId: 'a', params: {}, summary: 'Öffentlich', ausgang: 'angenommen' });
    log.protokolliereProposal(
      { commandId: 'b', params: {}, summary: 'Privat', ausgang: 'angenommen' },
      { visibility: 'private' },
    );

    const zeilen = log.toKosmoSignalJsonl().split('\n').filter(Boolean);
    expect(zeilen).toHaveLength(1);
    const geparst = JSON.parse(zeilen[0]!) as { payload: { summary: string } };
    expect(geparst.payload.summary).toBe('Öffentlich');
  });

  it('"alle" liefert auch private Einträge', () => {
    const log = new ProposalLog(proposalLogStore());
    log.protokolliereProposal(
      { commandId: 'b', params: {}, summary: 'Privat', ausgang: 'angenommen' },
      { visibility: 'private' },
    );
    expect(log.toKosmoSignalJsonl('alle').split('\n').filter(Boolean)).toHaveLength(1);
  });

  it('leerer Log → leerer String', () => {
    const log = new ProposalLog(proposalLogStore());
    expect(log.toKosmoSignalJsonl()).toBe('');
  });

  it('jede Zeile ist bereits kosmo-signal/v1-schemakonform (art/ts/visibility/payload/meta)', () => {
    const log = new ProposalLog(proposalLogStore());
    log.protokolliereLayout({ sheetId: 's', vorschlag: {}, endzustand: {}, optionen: {} });
    const [zeile] = log.toKosmoSignalJsonl().split('\n');
    const geparst = JSON.parse(zeile!) as Record<string, unknown>;
    expect(Object.keys(geparst).sort()).toEqual(['art', 'meta', 'payload', 'ts', 'visibility']);
  });
});
