import { describe, expect, it } from 'vitest';
import type { Learning } from '@kosmo/ai';
import { gedaechtnisQuerverweise } from '../src/modules/data/data-runtime';

/**
 * K8 (v0.6.8, erweitert v0.6.9 Stream B «Wissen antwortet»): die
 * Gedächtnis-Querverweise im Referenz-Dossier nutzten bislang AUSSCHLIESSLICH
 * Text-Match (Titel/Id wörtlich im Kontext oder in der Notiz genannt) — das
 * Lernjournal hatte keine persistierte Referenz-Kante. Seit `Learning.refId`
 * (additiv, `packages/kosmo-ai/src/memory.ts`) gehen refId-Treffer IMMER vor,
 * Text-Match bleibt der ehrliche Fallback für Alteinträge ohne `refId`.
 */
function eintrag(overrides: Partial<Learning> & Pick<Learning, 'ts' | 'sentiment' | 'context'>): Learning {
  return overrides;
}

const pantheon = { id: 'ref-pantheon', title: 'Pantheon' };

describe('gedaechtnisQuerverweise — refId zuerst, Text-Match als Fallback', () => {
  it('Alteintrag ohne refId, der den Titel wörtlich nennt: weiterhin ein Text-Treffer (bestehendes Verhalten unverändert)', () => {
    const eintraege: Learning[] = [
      eintrag({ ts: '2026-07-01T08:00:00.000Z', sentiment: 'gut', context: 'Pantheon Oculus als Referenz notiert' }),
    ];
    const treffer = gedaechtnisQuerverweise(eintraege, pantheon);
    expect(treffer).toHaveLength(1);
    expect(treffer[0]!.matchArt).toBe('text');
  });

  it('Eintrag mit passender refId wird gefunden, auch wenn der Text den Titel NICHT nennt', () => {
    const eintraege: Learning[] = [
      eintrag({ ts: '2026-07-01T08:00:00.000Z', sentiment: 'gut', context: 'Im Dossier als passend bewertet', refId: 'ref-pantheon' }),
    ];
    const treffer = gedaechtnisQuerverweise(eintraege, pantheon);
    expect(treffer).toHaveLength(1);
    expect(treffer[0]!.matchArt).toBe('verknuepft');
  });

  it('refId-Treffer kommt vor Text-Treffer, unabhängig vom Zeitstempel (verknüpft geht IMMER vor)', () => {
    const eintraege: Learning[] = [
      eintrag({ ts: '2026-07-01T08:00:00.000Z', sentiment: 'gut', context: 'Älterer Text-Treffer: Pantheon erwähnt' }),
      eintrag({ ts: '2026-06-01T08:00:00.000Z', sentiment: 'gut', context: 'Viel älter, aber verknüpft', refId: 'ref-pantheon' }),
    ];
    const treffer = gedaechtnisQuerverweise(eintraege, pantheon);
    expect(treffer).toHaveLength(2);
    expect(treffer[0]!.matchArt).toBe('verknuepft');
    expect(treffer[1]!.matchArt).toBe('text');
  });

  it('ein Eintrag mit refId auf eine ANDERE Referenz zählt nicht als Treffer für diese Referenz', () => {
    const eintraege: Learning[] = [
      eintrag({ ts: '2026-07-01T08:00:00.000Z', sentiment: 'gut', context: 'Für eine andere Referenz', refId: 'ref-parthenon' }),
    ];
    const treffer = gedaechtnisQuerverweise(eintraege, pantheon);
    expect(treffer).toHaveLength(0);
  });

  it('refId-Treffer werden nicht doppelt als Text-Treffer nachgezählt, auch wenn ihr Text den Titel ebenfalls nennt', () => {
    const eintraege: Learning[] = [
      eintrag({
        ts: '2026-07-01T08:00:00.000Z',
        sentiment: 'gut',
        context: 'Pantheon im Dossier als passend bewertet',
        refId: 'ref-pantheon',
      }),
    ];
    const treffer = gedaechtnisQuerverweise(eintraege, pantheon);
    expect(treffer).toHaveLength(1);
    expect(treffer[0]!.matchArt).toBe('verknuepft');
  });

  it('gedeckelt auf `max`, refId-Treffer verdrängen Text-Treffer nie ausser durch die Kappung', () => {
    const eintraege: Learning[] = [
      eintrag({ ts: '2026-07-01T08:00:00.000Z', sentiment: 'gut', context: 'refId 1', refId: 'ref-pantheon' }),
      eintrag({ ts: '2026-07-02T08:00:00.000Z', sentiment: 'gut', context: 'refId 2', refId: 'ref-pantheon' }),
      eintrag({ ts: '2026-07-03T08:00:00.000Z', sentiment: 'gut', context: 'Pantheon Text-Treffer' }),
    ];
    const treffer = gedaechtnisQuerverweise(eintraege, pantheon, 1);
    expect(treffer).toHaveLength(1);
    expect(treffer[0]!.matchArt).toBe('verknuepft');
  });

  it('kein Treffer: weder refId noch Text nennen die Referenz', () => {
    const eintraege: Learning[] = [
      eintrag({ ts: '2026-07-01T08:00:00.000Z', sentiment: 'schlecht', context: 'Ohne Referenzbezug: Wand ohne Aufbau vorgeschlagen' }),
    ];
    expect(gedaechtnisQuerverweise(eintraege, pantheon)).toHaveLength(0);
  });
});
