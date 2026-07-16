import { describe, expect, it } from 'vitest';
import { execute, KosmoDoc, type Opening, type Wall, type Zone } from '@kosmo/kernel';
import {
  baueSystemprompt,
  dossierBlock,
  projektKontextBlock,
  rolleBlock,
  schaetzeTokens,
  STANDARD_TOKEN_BUDGET,
  type SystemPromptBlock,
} from '../src/systemprompt';
import { modelQueryTool } from '../src/tools';

/**
 * v0.8.1 KI2 (§3 Kandidat 4+5, `docs/V081-SPEZ.md`) — der Systemprompt-Bauer
 * und die reichere Modellkontext-Selektion. Kernbeweis: Kappung + Priorität
 * («Kritik überlebt, Deko fällt»), plus die doc-abgeleiteten Blöcke gegen
 * ein Fixture-Doc.
 */

describe('schaetzeTokens — ehrlich dokumentierte Näherung (~4 Zeichen/Token)', () => {
  it('leerer/blanker Text → 0 Token', () => {
    expect(schaetzeTokens('')).toBe(0);
    expect(schaetzeTokens('   ')).toBe(0);
  });

  it('rundet auf (ceil), nie ab — ein knapper Block darf nicht fälschlich als billiger gelten', () => {
    expect(schaetzeTokens('abcde')).toBe(Math.ceil(5 / 4)); // 2
    expect(schaetzeTokens('abcd')).toBe(1);
  });
});

describe('baueSystemprompt — Priorisierung + Budget-Kappung (Budget-Beweis)', () => {
  it('ohne Blöcke bleibt die Basis unverändert (kein Trenner, keine Deko)', () => {
    expect(baueSystemprompt('Basis-Text', [])).toBe('Basis-Text');
  });

  it('leere/blanke Blöcke fallen lautlos weg, ohne das Budget zu belasten', () => {
    const bloecke: SystemPromptBlock[] = [
      { label: 'kritik-journal', text: '' },
      { label: 'dossier-nogo', text: '   ' },
      { label: 'rolle', text: 'Rolle: Entwurf' },
    ];
    expect(baueSystemprompt('Basis', bloecke)).toBe('Basis\n\nRolle: Entwurf');
  });

  it('Kappung + Priorisierung: bei knappem Budget überlebt Kritik-Journal (höchste Priorität), die Deko («Kontext», tiefste Priorität) fällt', () => {
    // Reihenfolge IST die Priorität: Kritik-Journal > Dossier-NO-GOs > Rolle > Kontext.
    const kritik = 'VERMEIDE: nie ohne Freigabe löschen'; // ~9 Token
    const dossier = 'NO-GO: kein Attikageschoss'; // ~7 Token
    const rolle = 'Rolle: Entwurf'; // ~4 Token
    // Künstlich gross — reine Deko/Zusammenfassung, darf als erstes fallen.
    const kontext = 'Projekt-Kontext: '.padEnd(400, 'x'); // ~100 Token, sprengt das enge Budget klar

    const bloecke: SystemPromptBlock[] = [
      { label: 'kritik-journal', text: kritik },
      { label: 'dossier-nogo', text: dossier },
      { label: 'rolle', text: rolle },
      { label: 'kontext', text: kontext },
    ];

    // Budget reicht für Kritik+Dossier+Rolle (~20 Token), aber NICHT mehr für den Kontext-Block obendrauf.
    const ergebnis = baueSystemprompt('Basis-Persona', bloecke, { tokenBudget: 25 });

    expect(ergebnis).toContain(kritik);
    expect(ergebnis).toContain(dossier);
    expect(ergebnis).toContain(rolle);
    expect(ergebnis).not.toContain('Projekt-Kontext:');
    // Basis (Persona-Identität) bleibt so oder so unangetastet.
    expect(ergebnis.startsWith('Basis-Persona')).toBe(true);
  });

  it('ein übergrosser HÖHER priorisierter Block fällt, ein SPÄTERER kleinerer Block darf ihn überholen (Bin-Packing, kein starrer Abbruch)', () => {
    const riesigesDossier = 'NO-GO: '.padEnd(2000, 'y'); // sprengt das Budget allein schon
    const kurzeRolle = 'Rolle: Admin';

    const bloecke: SystemPromptBlock[] = [
      { label: 'dossier-nogo', text: riesigesDossier },
      { label: 'rolle', text: kurzeRolle },
    ];

    const ergebnis = baueSystemprompt('Basis', bloecke, { tokenBudget: 10 });

    expect(ergebnis).not.toContain('NO-GO:');
    expect(ergebnis).toContain(kurzeRolle);
  });

  it('STANDARD_TOKEN_BUDGET ist grosszügig genug für den Alltag (Journal ≤ 8 Einträge + Dossier ≤ 20 Zeilen + Rolle)', () => {
    const alltag: SystemPromptBlock[] = [
      { label: 'kritik-journal', text: Array.from({ length: 8 }, (_, i) => `- BEIBEHALTEN: Eintrag ${i}`).join('\n') },
      { label: 'dossier-nogo', text: Array.from({ length: 20 }, (_, i) => `- NO-GO: Punkt ${i}`).join('\n') },
      { label: 'rolle', text: 'Arbeitsrolle des Menschen: entwurf — Volumen, Grundrisse zuerst.' },
    ];
    const ergebnis = baueSystemprompt('Basis', alltag, { tokenBudget: STANDARD_TOKEN_BUDGET });
    for (const b of alltag) expect(ergebnis).toContain(b.text);
  });
});

/** Fixture-Doc mit Geschossen, echten Räumen (keine Parzelle/Nachbar) und einer Öffnung. */
function fixtureDoc(): KosmoDoc {
  const doc = new KosmoDoc();
  doc.settings.projectName = 'Kosmo-Testbau';
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  execute(doc, 'design.geschossErstellen', { name: 'OG', index: 1, elevation: 3000, height: 3000 });
  const egId = (eg.patches[0] as { id: string }).id;
  doc.entities.set('z1', {
    id: 'z1',
    kind: 'zone',
    storeyId: egId,
    outline: [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 4000 },
      { x: 0, y: 4000 },
    ],
    name: 'Wohnen',
    sia: 'HNF',
  } as Zone);
  doc.entities.set('parzelle', {
    id: 'parzelle',
    kind: 'zone',
    storeyId: egId,
    outline: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ],
    name: 'Parzelle',
    sia: 'KF',
    zonenArt: 'parzelle',
  } as Zone);
  // Für `projektKontextBlock` genügt eine Öffnung als reine Entität — die
  // referenzierte Wand muss dafür nicht existieren (die Funktion zählt nur
  // `byKind('opening')`, prüft keine Wand-Referenz).
  doc.entities.set('o1', {
    id: 'o1',
    kind: 'opening',
    wallId: 'unbenutzt',
    openingType: 'tuer',
    center: 2000,
    width: 900,
    height: 2100,
    sill: 0,
  } as unknown as Opening);
  return doc;
}

describe('dossierBlock / rolleBlock / projektKontextBlock — aus dem Doc, gegen Fixture-Doc', () => {
  it('dossierBlock: leer ohne Dossier-Einträge', () => {
    const doc = fixtureDoc();
    expect(dossierBlock(doc)).toBe('');
  });

  it('dossierBlock: NO-GOs zuerst, dann GEFORDERT, dann FAKT — unabhängig von der Eingabe-Reihenfolge', () => {
    const doc = fixtureDoc();
    doc.settings.dossier = [
      { typ: 'fakt', text: 'Grundstück ist Hanglage' },
      { typ: 'do', text: 'Attikageschoss gefordert' },
      { typ: 'dont', text: 'kein Flachdach' },
    ];
    const block = dossierBlock(doc);
    const posNoGo = block.indexOf('NO-GO: kein Flachdach');
    const posGefordert = block.indexOf('GEFORDERT: Attikageschoss gefordert');
    const posFakt = block.indexOf('FAKT: Grundstück ist Hanglage');
    expect(posNoGo).toBeGreaterThanOrEqual(0);
    expect(posNoGo).toBeLessThan(posGefordert);
    expect(posGefordert).toBeLessThan(posFakt);
  });

  it('rolleBlock: leer ohne gesetzte Rolle, sonst die passende Fokus-Zeile', () => {
    const doc = fixtureDoc();
    expect(rolleBlock(doc)).toBe('');
    doc.settings.rolle = 'ausfuehrung';
    expect(rolleBlock(doc)).toContain('ausfuehrung');
    expect(rolleBlock(doc)).toContain('Werkpläne');
  });

  it('projektKontextBlock: Projekt/Räume/Öffnungen-Zusammenfassung — Parzellen-Zonen zählen NICHT als Raum', () => {
    const doc = fixtureDoc();
    const block = projektKontextBlock(doc);
    expect(block).toContain('Kosmo-Testbau');
    expect(block).toContain('2 Geschoss(e)');
    expect(block).toContain('1 Raum/Räume'); // «Parzelle» ausgenommen
    expect(block).toContain('1 Öffnung(en)');
  });

  it('projektKontextBlock: leer bei einem komplett leeren Doc (kein Deko-Satz ohne Substanz)', () => {
    expect(projektKontextBlock(new KosmoDoc())).toBe('');
  });
});

describe('modelQueryTool — Wand-Budget-Selektion (Kandidat 5: aktives Geschoss zuerst, dann Budget)', () => {
  function docMitWaenden(nProEgOg: number) {
    const doc = new KosmoDoc();
    const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const og = execute(doc, 'design.geschossErstellen', { name: 'OG', index: 1, elevation: 3000, height: 3000 });
    const aufbau = execute(doc, 'design.aufbauErstellen', {
      name: 'AW Beton 20',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
    });
    const egId = (eg.patches[0] as { id: string }).id;
    const ogId = (og.patches[0] as { id: string }).id;
    const assemblyId = (aufbau.patches[0] as { id: string }).id;
    for (let i = 0; i < nProEgOg; i++) {
      execute(doc, 'design.wandZeichnen', {
        storeyId: egId,
        a: { x: 0, y: i * 100 },
        b: { x: 3000, y: i * 100 },
        assemblyId,
      });
      execute(doc, 'design.wandZeichnen', {
        storeyId: ogId,
        a: { x: 0, y: i * 100 },
        b: { x: 3000, y: i * 100 },
        assemblyId,
      });
    }
    return { doc, egId, ogId };
  }

  it('ohne Budget-Deckel (grosszügig) erscheinen alle Wände wie bisher', () => {
    const { doc } = docMitWaenden(3);
    const tool = modelQueryTool(doc);
    const out = tool.execute();
    expect(out).toContain('WÄNDE: 6');
    expect(out).not.toContain('nicht aufgeführt');
  });

  it('bei engem Budget: Wände des AKTIVEN Geschosses zuerst, der Rest fällt mit ehrlichem Hinweis', () => {
    const { doc, egId } = docMitWaenden(10); // 20 Wände total, 10 im aktiven EG
    const tool = modelQueryTool(doc, () => ({ storeyId: egId }), { wandBudgetTokens: 60 });
    const out = tool.execute();
    const egWaende = doc.byKind<Wall>('wall').filter((w) => w.storeyId === egId);
    const ogWaende = doc.byKind<Wall>('wall').filter((w) => w.storeyId !== egId);
    // Mindestens ein Teil der EG-Wände muss durchkommen …
    const egTreffer = egWaende.filter((w) => out.includes(w.id)).length;
    expect(egTreffer).toBeGreaterThan(0);
    // … und JEDE ausgegebene OG-Wand-Zeile erscheint erst NACH allen ausgegebenen EG-Zeilen
    // (aktives Geschoss hat Priorität) — geprüft über die erste OG-Trefferposition.
    const ersteOgPos = ogWaende.map((w) => out.indexOf(w.id)).find((p) => p >= 0);
    const letzteEgPos = Math.max(...egWaende.map((w) => out.indexOf(w.id)).filter((p) => p >= 0));
    if (ersteOgPos !== undefined) expect(ersteOgPos).toBeGreaterThan(letzteEgPos);
    expect(out).toContain('nicht aufgeführt');
  });

  it('ohne Kontext-Lieferant (z.B. reine Tool-Tests): Budget wirkt trotzdem, einfach ohne Geschoss-Priorität', () => {
    const { doc } = docMitWaenden(20); // 40 Wände
    const tool = modelQueryTool(doc, undefined, { wandBudgetTokens: 40 });
    const out = tool.execute();
    expect(out).toContain('WÄNDE: 40');
    expect(out).toContain('nicht aufgeführt');
  });
});
