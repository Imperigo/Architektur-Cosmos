import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  FakeLoraTrainer,
  LORA_ADAPTER_REGISTRY,
  baueKosmoSftAusJournal,
  baueLoraDatensatzAusEintraegen,
  baueLoraTrainDateien,
  baueLoraTrainManifest,
  generalisiereLoraTrainBericht,
  learningZuKosmoSftBeispiel,
  sha256Hex,
  type Learning,
} from '../src';

/**
 * v0.8.2 / P5 «Trainer-Contract + Trainingspaket» (`docs/V082-SPEZ.md` §6.5)
 * — additive Tests NEBEN `lora-training.test.ts` (18 Bestandstests bleiben
 * byte-gleich, s. dort). Diese Datei testet ausschliesslich die NEUEN
 * Exporte: `kosmo-sft/v1`-Aufbereitung, Manifest-Hashing, Bericht-
 * Generalisierung, Adapter-Registry.
 */

const KURATIERT: Learning = {
  ts: '2026-07-10T08:00:00.000Z',
  sentiment: 'schlecht',
  context: 'Dach vergessen.',
  note: 'Immer zuerst nach dem Dach fragen.',
};
const OHNE_NOTIZ: Learning = { ts: '2026-07-11T08:00:00.000Z', sentiment: 'gut', context: 'Wand sauber gesetzt.' };

describe('learningZuKosmoSftBeispiel — Playbook journal-zu-sft.md als Code', () => {
  it('ein kuratierter Eintrag (mit Notiz) wird zu einem kosmo-sft/v1-Beispiel', () => {
    const r = learningZuKosmoSftBeispiel(KURATIERT);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unerwartet');
    expect(r.beispiel.messages).toHaveLength(3);
    expect(r.beispiel.messages[0]).toEqual({ role: 'system', content: expect.stringContaining('Kosmo') });
    expect(r.beispiel.messages[1]).toEqual({ role: 'user', content: 'Dach vergessen.' });
    expect(r.beispiel.messages[2]?.content).toBe('Vermeide künftig: Immer zuerst nach dem Dach fragen.');
    expect(r.beispiel.meta.adapter).toBe('kosmo-buero');
    expect(r.beispiel.meta.quelle).toBe(`journal:${KURATIERT.ts}`);
    expect(r.beispiel.meta.visibility).toBe('private');
  });

  it('respektiert eine explizit übergebene visibility', () => {
    const r = learningZuKosmoSftBeispiel(KURATIERT, 'public');
    if (!r.ok) throw new Error('unerwartet');
    expect(r.beispiel.meta.visibility).toBe('public');
  });

  it('ein Eintrag OHNE Notiz wird ehrlich verworfen — Notiz ist der Trainings-Kern, nicht der Kontext', () => {
    const r = learningZuKosmoSftBeispiel(OHNE_NOTIZ);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unerwartet');
    expect(r.grund).toMatch(/Notiz fehlt/);
  });

  it('ein Eintrag mit ungültigem sentiment wird verworfen', () => {
    const kaputt = { ts: 'x', sentiment: 'neutral', context: 'y', note: 'z' } as unknown as Learning;
    const r = learningZuKosmoSftBeispiel(kaputt);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unerwartet');
    expect(r.grund).toMatch(/sentiment/);
  });
});

describe('baueKosmoSftAusJournal — Batch, nichts geht verloren', () => {
  it('trennt kuratierte von unkuratierten Einträgen mit Begründung', () => {
    const { beispiele, verworfen } = baueKosmoSftAusJournal([KURATIERT, OHNE_NOTIZ]);
    expect(beispiele).toHaveLength(1);
    expect(verworfen).toHaveLength(1);
    expect(verworfen[0]!.index).toBe(1);
    expect(verworfen[0]!.grund).toMatch(/Notiz fehlt/);
  });

  it('leeres Journal → leeres Ergebnis, kein Crash', () => {
    expect(baueKosmoSftAusJournal([])).toEqual({ beispiele: [], verworfen: [] });
  });
});

/** Referenz-Hash über Node-`crypto` (unabhängig von `sha256Hex`s Web-Crypto-
 * Implementierung) — dynamisch berechnet statt als Hex-Literal eingebettet:
 * das beweist die Hash-FUNKTION gegen eine zweite Implementierung, statt nur
 * einen eingefrorenen Wert zu vergleichen (und vermeidet, dass `tools/
 * secret-scan.mjs` ein literales 64-Hex-Zeichen für einen echten Token hält). */
function referenzSha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

describe('sha256Hex — deterministischer Web-Crypto-Hash', () => {
  it('stimmt mit einer unabhängigen Node-crypto-Referenzimplementierung überein (leerer String / "hallo")', async () => {
    expect(await sha256Hex('')).toBe(referenzSha256(''));
    expect(await sha256Hex('hallo')).toBe(referenzSha256('hallo'));
    expect(await sha256Hex('hallo')).toHaveLength(64);
  });

  it('ist deterministisch: derselbe Text liefert immer denselben Hash', async () => {
    const a = await sha256Hex('mehrzeiliger\ninhalt\n');
    const b = await sha256Hex('mehrzeiliger\ninhalt\n');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});

describe('baueLoraTrainDateien / baueLoraTrainManifest — Manifest-Hash-Gate', () => {
  it('hasht jede Datei; ändert sich der Inhalt, ändert sich der Hash', async () => {
    const [v1] = await baueLoraTrainDateien([
      { pfad: 'a.jsonl', inhalt: 'zeile-1\n', format: 'kosmo-sft/v1', visibility: 'private' },
    ]);
    const [v2] = await baueLoraTrainDateien([
      { pfad: 'a.jsonl', inhalt: 'zeile-1-geaendert\n', format: 'kosmo-sft/v1', visibility: 'private' },
    ]);
    expect(v1!.sha256).not.toBe(v2!.sha256);
  });

  it('zwei Läufe über denselben Datenstand liefern denselben Hash (reproduzierbar)', async () => {
    const eingabe = [{ pfad: 'a.jsonl', inhalt: 'gleicher-inhalt\n', format: 'kosmo-sft/v1' as const, visibility: 'private' as const }];
    const [lauf1] = await baueLoraTrainDateien(eingabe);
    const [lauf2] = await baueLoraTrainDateien(eingabe);
    expect(lauf1!.sha256).toBe(lauf2!.sha256);
  });

  it('zählt JSONL-Zeilen korrekt (leere Zeilen übersprungen)', async () => {
    const [datei] = await baueLoraTrainDateien([
      { pfad: 'a.jsonl', inhalt: 'a\n\nb\nc\n', format: 'kosmo-sft/v1', visibility: 'private' },
    ]);
    expect(datei!.anzahlZeilen).toBe(3);
  });

  it('baueLoraTrainManifest: Manifest-Hash beweisbar gegen den realen Inhalt der Datei', async () => {
    const inhalt = JSON.stringify({ x: 1 }) + '\n' + JSON.stringify({ x: 2 });
    const manifest = await baueLoraTrainManifest({
      adapter: 'kosmo-buero',
      dateien: [{ pfad: 'kosmo-buero-sft.jsonl', inhalt, format: 'kosmo-sft/v1', visibility: 'private' }],
      rezept: 'docs/KOSMOTRAIN.md §3',
      visibility: 'private',
    });
    expect(manifest.schema).toBe('kosmo.lora-train/v1');
    expect(manifest.adapter).toBe('kosmo-buero');
    expect(manifest.dateien[0]!.anzahlZeilen).toBe(2);
    // Der Hash-Beweis: unabhängig neu berechnet muss er exakt übereinstimmen.
    const erwarteterHash = await sha256Hex(inhalt);
    expect(manifest.dateien[0]!.sha256).toBe(erwarteterHash);
  });

  it('optionale Felder (evalSuite/hinweis) fehlen ganz, statt undefined zu tragen (exactOptionalPropertyTypes)', async () => {
    const manifest = await baueLoraTrainManifest({
      adapter: 'kosmo-buero',
      dateien: [{ pfad: 'a.jsonl', inhalt: 'x', format: 'kosmo-sft/v1', visibility: 'private' }],
      rezept: 'docs/KOSMOTRAIN.md §3',
      visibility: 'private',
    });
    expect('evalSuite' in manifest).toBe(false);
    expect('hinweis' in manifest).toBe(false);
  });
});

describe('generalisiereLoraTrainBericht — 1:1 zu LoraTrainBerichtV1 (@kosmo/contracts)', () => {
  it('übersetzt einen FakeLoraTrainer-Bericht in die verallgemeinerte Form', () => {
    const trainer = new FakeLoraTrainer();
    const datensatz = baueLoraDatensatzAusEintraegen([KURATIERT]);
    const bericht = trainer.trainiere(datensatz);
    const generalisiert = generalisiereLoraTrainBericht(bericht, 'kosmo-buero');
    expect(generalisiert.schema).toBe('kosmo.lora-train-bericht/v1');
    expect(generalisiert.adapter).toBe('kosmo-buero');
    expect(generalisiert.fake).toBe(true);
    expect(generalisiert.beispiele).toBe(bericht.anzahlBeispiele);
    expect(generalisiert.verworfen).toBe(bericht.anzahlAussortiert);
    expect(generalisiert.fingerprint).toBe(bericht.laufKennzeichen);
    expect(generalisiert.hinweise).toEqual([bericht.hinweis]);
  });
});

describe('LORA_ADAPTER_REGISTRY — die Adapter-Registry-Logik (§2.4/§5.2)', () => {
  it('führt genau die 6 Adapter der Zielkompetenz-Karte', () => {
    expect(LORA_ADAPTER_REGISTRY.map((r) => r.id)).toEqual([
      'kosmo-buero',
      'kosmo-zeichner-grundriss',
      'kosmo-zeichner-commands',
      'kosmo-buero-dpo',
      'whisper-ch',
      'kosmo-werkplan',
    ]);
  });

  it('kosmo-buero ist ehrlich als "wächst", whisper-ch/kosmo-werkplan als "wartet" markiert', () => {
    const buero = LORA_ADAPTER_REGISTRY.find((r) => r.id === 'kosmo-buero');
    const whisper = LORA_ADAPTER_REGISTRY.find((r) => r.id === 'whisper-ch');
    const werkplan = LORA_ADAPTER_REGISTRY.find((r) => r.id === 'kosmo-werkplan');
    expect(buero?.status).toBe('wächst');
    expect(whisper?.status).toBe('wartet');
    expect(werkplan?.status).toBe('wartet');
    expect(whisper?.hinweis).toMatch(/Owner\/HomeStation/);
  });
});
