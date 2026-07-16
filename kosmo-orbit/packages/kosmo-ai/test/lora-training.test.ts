import { describe, expect, it } from 'vitest';
import {
  FakeLoraTrainer,
  LearningJournal,
  baueLoraDatensatzAusEintraegen,
  baueLoraDatensatzAusJsonl,
  exportiereUndTrainiere,
  type Learning,
  type MemoryStore,
} from '../src';

function speicher(initial: Learning[] = []): MemoryStore {
  let entries = initial;
  return {
    load: () => entries,
    save: (e) => {
      entries = e;
    },
  };
}

const GUT: Learning = { ts: '2026-07-01T10:00:00.000Z', sentiment: 'gut', context: 'Wand sauber gesetzt.' };
const SCHLECHT: Learning = {
  ts: '2026-07-02T11:00:00.000Z',
  sentiment: 'schlecht',
  context: 'Dach vergessen.',
  note: 'Immer zuerst nach dem Dach fragen.',
};

describe('baueLoraDatensatzAusEintraegen — Validierung/Aufbereitung', () => {
  it('gültige Einträge werden zu Trainingsbeispielen (Notiz ist der Kern, sonst Kontext)', () => {
    const ds = baueLoraDatensatzAusEintraegen([GUT, SCHLECHT]);
    expect(ds.beispiele).toHaveLength(2);
    expect(ds.aussortiert).toHaveLength(0);
    expect(ds.beispiele[0]!.vervollstaendigung).toBe('BEIBEHALTEN: Wand sauber gesetzt.');
    expect(ds.beispiele[1]!.vervollstaendigung).toBe('VERMEIDE: Immer zuerst nach dem Dach fragen.');
    expect(ds.beispiele[0]!.quelleTs).toBe(GUT.ts);
    expect(ds.beispiele[0]!.prompt).toContain('Wand sauber gesetzt.');
  });

  it('fehlendes/ungültiges sentiment wird ehrlich aussortiert', () => {
    const kaputt = { ts: 'x', sentiment: 'neutral', context: 'irgendwas' } as unknown as Learning;
    const ds = baueLoraDatensatzAusEintraegen([kaputt]);
    expect(ds.beispiele).toHaveLength(0);
    expect(ds.aussortiert).toHaveLength(1);
    expect(ds.aussortiert[0]!.grund).toMatch(/sentiment/);
  });

  it('leerer context wird aussortiert, Begründung erklärt warum', () => {
    const leer: Learning = { ts: 'x', sentiment: 'gut', context: '   ' };
    const ds = baueLoraDatensatzAusEintraegen([leer]);
    expect(ds.beispiele).toHaveLength(0);
    expect(ds.aussortiert[0]!.grund).toMatch(/context ist leer/);
  });

  it('fehlender ts wird aussortiert (keine Rückverfolgung möglich)', () => {
    const ohneTs = { sentiment: 'gut', context: 'etwas' } as unknown as Learning;
    const ds = baueLoraDatensatzAusEintraegen([ohneTs]);
    expect(ds.beispiele).toHaveLength(0);
    expect(ds.aussortiert[0]!.grund).toMatch(/ts fehlt/);
  });

  it('leeres Journal → leerer Datensatz, kein Crash', () => {
    expect(baueLoraDatensatzAusEintraegen([])).toEqual({ beispiele: [], aussortiert: [] });
  });

  it('gemischter Datensatz: gültige und untaugliche Einträge nebeneinander, nichts geht verloren', () => {
    const kaputt = { ts: 'x', context: '' } as unknown as Learning;
    const ds = baueLoraDatensatzAusEintraegen([GUT, kaputt, SCHLECHT]);
    expect(ds.beispiele).toHaveLength(2);
    expect(ds.aussortiert).toHaveLength(1);
    expect(ds.aussortiert[0]!.index).toBe(1);
  });
});

describe('baueLoraDatensatzAusJsonl — der wörtliche toJsonl()-Konsument', () => {
  it('parst eine echte toJsonl()-Ausgabe zeilenweise', () => {
    const journal = new LearningJournal(speicher([GUT, SCHLECHT]));
    const ds = baueLoraDatensatzAusJsonl(journal.toJsonl());
    expect(ds.beispiele).toHaveLength(2);
    expect(ds.aussortiert).toHaveLength(0);
  });

  it('eine kaputte einzelne Zeile wirft den Rest des Exports nicht weg', () => {
    const jsonl = `${JSON.stringify(GUT)}\nnicht-json{{{\n${JSON.stringify(SCHLECHT)}`;
    const ds = baueLoraDatensatzAusJsonl(jsonl);
    expect(ds.beispiele).toHaveLength(2);
    expect(ds.aussortiert).toHaveLength(1);
    expect(ds.aussortiert[0]!.grund).toMatch(/kein gültiges JSON/);
  });

  it('leere Zeilen werden übersprungen (kein Aussortier-Eintrag dafür)', () => {
    const jsonl = `${JSON.stringify(GUT)}\n\n\n${JSON.stringify(SCHLECHT)}`;
    const ds = baueLoraDatensatzAusJsonl(jsonl);
    expect(ds.beispiele).toHaveLength(2);
    expect(ds.aussortiert).toHaveLength(0);
  });

  it('leerer String → leerer Datensatz', () => {
    expect(baueLoraDatensatzAusJsonl('')).toEqual({ beispiele: [], aussortiert: [] });
  });
});

describe('FakeLoraTrainer — deterministischer Fake-Stub (Muster Fake-Bridge)', () => {
  it('ist ehrlich als Fake gekennzeichnet', () => {
    const trainer = new FakeLoraTrainer();
    expect(trainer.id).toContain('fake');
    const bericht = trainer.trainiere({ beispiele: [], aussortiert: [] });
    expect(bericht.fake).toBe(true);
    expect(bericht.hinweis).toMatch(/kein.*Training|Fake/i);
  });

  it('derselbe Datensatz liefert dasselbe Laufkennzeichen (deterministisch)', () => {
    const trainer = new FakeLoraTrainer();
    const ds = baueLoraDatensatzAusEintraegen([GUT, SCHLECHT]);
    const b1 = trainer.trainiere(ds);
    const b2 = trainer.trainiere(ds);
    expect(b1.laufKennzeichen).toBe(b2.laufKennzeichen);
    expect(b1.anzahlBeispiele).toBe(2);
  });

  it('ein anderer Datensatz liefert ein anderes Laufkennzeichen', () => {
    const trainer = new FakeLoraTrainer();
    const b1 = trainer.trainiere(baueLoraDatensatzAusEintraegen([GUT]));
    const b2 = trainer.trainiere(baueLoraDatensatzAusEintraegen([SCHLECHT]));
    expect(b1.laufKennzeichen).not.toBe(b2.laufKennzeichen);
  });

  it('leerer Datensatz meldet ehrlich "kein Lauf durchgeführt"', () => {
    const trainer = new FakeLoraTrainer();
    const bericht = trainer.trainiere({ beispiele: [], aussortiert: [] });
    expect(bericht.hinweis).toMatch(/kein einziges taugliches Beispiel/);
    expect(bericht.anzahlBeispiele).toBe(0);
  });

  it('zählt aussortierte Einträge im Bericht mit', () => {
    const trainer = new FakeLoraTrainer();
    const ds = baueLoraDatensatzAusEintraegen([GUT, { ts: 'x', context: '' } as unknown as Learning]);
    const bericht = trainer.trainiere(ds);
    expect(bericht.anzahlBeispiele).toBe(1);
    expect(bericht.anzahlAussortiert).toBe(1);
  });
});

describe('exportiereUndTrainiere — der geschlossene Pfad Journal → toJsonl() → Datensatz → Trainer', () => {
  it('nimmt ein echtes LearningJournal, liefert Datensatz + Fake-Bericht', async () => {
    const journal = new LearningJournal(speicher([GUT, SCHLECHT]));
    const { datensatz, bericht } = await exportiereUndTrainiere(journal);
    expect(datensatz.beispiele).toHaveLength(2);
    expect(bericht.fake).toBe(true);
    expect(bericht.anzahlBeispiele).toBe(2);
  });

  it('funktioniert mit einem frisch kuratierten Journal (add/entfernen wirkt sich auf den Export aus)', async () => {
    const journal = new LearningJournal(speicher());
    journal.add({ sentiment: 'gut', context: 'Erster Eintrag' });
    const erster = await exportiereUndTrainiere(journal);
    expect(erster.datensatz.beispiele).toHaveLength(1);

    journal.add({ sentiment: 'schlecht', context: 'Zweiter Eintrag', note: 'nicht wiederholen' });
    const zweiter = await exportiereUndTrainiere(journal);
    expect(zweiter.datensatz.beispiele).toHaveLength(2);
    expect(zweiter.bericht.laufKennzeichen).not.toBe(erster.bericht.laufKennzeichen);
  });

  it('akzeptiert einen eigenen (custom) Trainer statt des Fake-Defaults', async () => {
    const journal = new LearningJournal(speicher([GUT]));
    const eigenerTrainer = {
      id: 'test-trainer',
      trainiere: (ds: { beispiele: unknown[] }) => ({
        trainerId: 'test-trainer',
        fake: false,
        anzahlBeispiele: ds.beispiele.length,
        anzahlAussortiert: 0,
        laufKennzeichen: 'test-lauf',
        hinweis: 'eigener Trainer',
      }),
    };
    const { bericht } = await exportiereUndTrainiere(journal, eigenerTrainer);
    expect(bericht.trainerId).toBe('test-trainer');
    expect(bericht.fake).toBe(false);
  });
});
