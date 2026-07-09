import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute } from '@kosmo/kernel';
import { vorschauFuerProposal } from '../src/state/proposal-vorschau';

/**
 * Owner-Befund K8 / V0.6.3 Batch B1 — Vorschau-Ableitung für Kosmo-Vorschläge:
 * `vorschauFuerProposal` führt den Command auf einer Kopie aus, mutiert das
 * echte Doc nie, und liefert einen einfachen ID-Diff samt Mini-SVG oder
 * ehrlich `null`. Diese Suite prüft genau diese Garantien.
 */

function baueDoc(): { doc: KosmoDoc; storeyId: string; assemblyId: string } {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  return { doc, storeyId, assemblyId };
}

describe('vorschauFuerProposal — Mutationsfreiheit', () => {
  it('lässt das übergebene Doc byte-identisch (JSON-Vergleich vorher/nachher)', () => {
    const { doc, storeyId, assemblyId } = baueDoc();
    const vorher = JSON.stringify(doc.toJSON());
    const ergebnis = vorschauFuerProposal(doc, 'design.wandZeichnen', {
      storeyId,
      assemblyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 0 },
    });
    expect(ergebnis).not.toBeNull();
    expect(JSON.stringify(doc.toJSON())).toBe(vorher);
    // Revision/History-Zähler des echten Docs ebenfalls unberührt
    expect(doc.byKind('wall')).toHaveLength(0);
  });
});

describe('vorschauFuerProposal — Diff-Erkennung', () => {
  it('eine neue Wand: 1 Eintrag „neu", Vorher/Nachher-SVG unterscheiden sich, kein Typologie-Hinweis', () => {
    const { doc, storeyId, assemblyId } = baueDoc();
    const ergebnis = vorschauFuerProposal(doc, 'design.wandZeichnen', {
      storeyId,
      assemblyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 0 },
    });
    expect(ergebnis).not.toBeNull();
    expect(ergebnis!.storeyId).toBe(storeyId);
    expect(ergebnis!.eintraege).toHaveLength(1);
    expect(ergebnis!.eintraege[0]!.art).toBe('neu');
    expect(ergebnis!.eintraege[0]!.kind).toBe('wall');
    expect(ergebnis!.vorherSvg).not.toBe(ergebnis!.nachherSvg);
    expect(ergebnis!.nachherSvg).toContain('<svg');
    expect(ergebnis!.typologieHinweis).toBeNull();
  });

  it('Geschoss stapeln (mehrere Elemente): Typologie-Hinweis nennt Anzahl je Art', () => {
    const { doc, storeyId, assemblyId } = baueDoc();
    // Zwei Wände + eine Zone im Quellgeschoss, damit die Kopie mehrere Arten trifft
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 0, y: 0 }, b: { x: 4000, y: 0 } });
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId, a: { x: 4000, y: 0 }, b: { x: 4000, y: 4000 } });
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
        { x: 4000, y: 4000 },
        { x: 0, y: 4000 },
      ],
      name: 'Wohnen',
      sia: 'HNF',
    });

    const ergebnis = vorschauFuerProposal(doc, 'design.geschossKopieren', { storeyId, anzahl: 1 });
    expect(ergebnis).not.toBeNull();
    expect(ergebnis!.eintraege.length).toBeGreaterThan(1);
    expect(ergebnis!.typologieHinweis).not.toBeNull();
    expect(ergebnis!.typologieHinweis).toContain('Typologie-Vorschlag:');
    expect(ergebnis!.typologieHinweis).toContain('Wände');
    // Neues Geschoss, nicht das Quellgeschoss — die Vorschau bezieht sich auf den Zielstand
    expect(ergebnis!.storeyId).not.toBe(storeyId);
  });
});

describe('vorschauFuerProposal — Fehlerpfad', () => {
  it('unbekannte Command-ID → null statt Wurf', () => {
    const { doc } = baueDoc();
    expect(() => vorschauFuerProposal(doc, 'design.gibtsNicht', {})).not.toThrow();
    expect(vorschauFuerProposal(doc, 'design.gibtsNicht', {})).toBeNull();
  });

  it('ungültige Parameter (Schema-Fehler) → null statt Wurf', () => {
    const { doc, storeyId } = baueDoc();
    expect(
      vorschauFuerProposal(doc, 'design.wandZeichnen', { storeyId, a: { x: 0, y: 0 } /* b fehlt, assemblyId fehlt */ }),
    ).toBeNull();
  });

  it('Command ohne Wirkung (0 Patches) → null, keine leere Vorschau', () => {
    const { doc, storeyId } = baueDoc();
    // raumTypSetzen auf eine nicht existierende Zone wirft (Command-Fehler) → auch das ist null
    expect(vorschauFuerProposal(doc, 'design.raumTypSetzen', { zoneId: 'nicht-vorhanden', raumTyp: 'wohnen' })).toBeNull();
    void storeyId;
  });
});

describe('vorschauFuerProposal — Deckel', () => {
  it('Doc weit über dem Entity-Deckel → ehrlich null statt Hänger', () => {
    const { doc, storeyId, assemblyId } = baueDoc();
    // Synthetische Masse ohne Bezug zu echten Kernel-Invarianten — es zählt
    // nur die Grösse der Entity-Map für den Deckel-Check.
    for (let i = 0; i < 4500; i++) {
      (doc.entities as Map<string, unknown>).set(`fuell-${i}`, { id: `fuell-${i}`, kind: 'mangel' });
    }
    expect(doc.entities.size).toBeGreaterThan(4000);
    const ergebnis = vorschauFuerProposal(doc, 'design.wandZeichnen', {
      storeyId,
      assemblyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 0 },
    });
    expect(ergebnis).toBeNull();
  });
});
