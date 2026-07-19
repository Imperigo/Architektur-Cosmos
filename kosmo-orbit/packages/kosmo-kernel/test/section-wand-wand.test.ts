import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute, deriveSection, invertPatches, type SectionFace } from '../src';

/**
 * Wand↔Wand-Schnittverschneidung (v0.8.9 E1, A1-Rest, `docs/V089-SPEZ.md`
 * §2 D1, §3 E1) — Kernel-Test-only für `wandWandVerschneiden`
 * (`derive/section.ts`, additiv neben `wandDeckeVerschneiden`).
 *
 * Geometrische Grundidee der Fixtures: `miterWallEnds` (derive/scene.ts)
 * mitert die meisten Wandenden bereits korrekt und lässt dort NICHTS für
 * `wandWandVerschneiden` übrig (bewiesen unten im "normaler 90°-T-Stoss"-
 * Fall: byte-still, keine Überlapp-Gruppe). Zwei Konstruktionen erzeugen
 * gezielt echte Rest-Überlappung:
 *  – «flacher T-Stoss»: eine Wand trifft im flachen Winkel (|dm|<0.3) auf
 *    die Achse einer anderen — GENAU der in `miterWallEnds` dokumentierte
 *    "stumpf lassen"-Fall (Zeile ~520 dort). Produktions-realistisch.
 *  – «Kreuzung» (Stellvertreter für Eckfall/Gehrungs-Exzess): zwei Wände
 *    ohne gemeinsamen Endpunkt kreuzen sich rechtwinklig mitten im Körper
 *    — `miterWallEnds` retrahiert dort NICHTS (keine der beiden Wände hat
 *    ein Ende in der Nähe des Kreuzungspunkts), die Körper durchdringen
 *    sich also strukturell genauso wie bei einem Gehrungs-Exzess- oder
 *    Mehrfachknoten-Degenerationsfall. Bewusst als robuste, leicht
 *    nachrechenbare Konstruktion gewählt statt eines exakten
 *    Winkel-Schwellwerts (ehrlich benannt statt stillschweigend
 *    gleichgesetzt — s. Abschlussbericht Punkt 6).
 *
 * Beide Fixture-Familien schneiden längs zur einen Wand (Schnittlinie
 * parallel zu deren Achse, leicht versetzt in den Wandkörper hinein) —
 * das zeigt die durchlaufende Wand als langes Band und die querende Wand
 * als schmales, über die volle Geschosshöhe laufendes Band im selben
 * (s,z)-Bild, exakt wie ein Längsschnitt durch einen Korridor mit
 * kreuzender Trennwand.
 */

function basis() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  return { doc, storeyId };
}

function aufbau(doc: KosmoDoc, material: string, thickness: number): string {
  const r = execute(doc, 'design.aufbauErstellen', {
    name: `AW ${material} ${thickness}`,
    target: 'wall',
    layers: [{ material, thickness, function: 'tragend' }],
  });
  return (r.patches[0] as { id: string }).id;
}

/** Shoelace-Fläche über alle Loops eines Face (Löcher heben sich per
 * Vorzeichen nicht auf — hier immer nur einfache, lochfreie Rechtecke,
 * darum Betrag je Loop summiert, wie im Bestand `loopFlaeche` in
 * kernel.test.ts). */
function flaeche(loops: { s: number; z: number }[][]): number {
  let f = 0;
  for (const l of loops) {
    let lf = 0;
    for (let i = 0; i < l.length; i++) {
      const a = l[i]!;
      const b = l[(i + 1) % l.length]!;
      lf += a.s * b.z - b.s * a.z;
    }
    f += Math.abs(lf) / 2;
  }
  return f;
}

const finde = (faces: readonly SectionFace[], material: string): SectionFace | undefined =>
  faces.find((f) => f.material === material);

describe('Wand↔Wand-Schnittverschneidung im Schnitt (v0.8.9 E1, A1-Rest)', () => {
  it('flacher T-Stoss (miterWallEnds |dm|<0.3 "stumpf"): niedrigere Prioritaet weicht, hoehere bleibt unveraendert', () => {
    const { doc, storeyId } = basis();
    const asmB = aufbau(doc, 'beton', 300); // Prio 900 — die durchlaufende Wand
    const asmA = aufbau(doc, 'holz', 200); // Prio 680 — trifft flach auf B's Achse
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmB, a: { x: 0, y: 0 }, b: { x: 8000, y: 0 } });
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmA, a: { x: 4000, y: 0 }, b: { x: 7000, y: 600 } });
    const g = deriveSection(doc, { a: { x: 4500, y: -1000 }, b: { x: 4500, y: 4000 }, depth: 30000, lookLeft: true });
    const beton = finde(g.faces, 'beton')!;
    const holz = finde(g.faces, 'holz')!;
    expect(beton, 'Beton (hoehere Prioritaet)').toBeDefined();
    expect(holz, 'Holz (niedrigere Prioritaet)').toBeDefined();
    // Beton (Prio 900, nichts im Schnittband hat höhere Priorität) bleibt
    // exakt seine rohe Rechteckfläche 300mm Dicke × 3000mm Höhe.
    expect(flaeche(beton.loops)).toBeCloseTo(300 * 3000, 0);
    // Holz (Prio 680 < 900) wird im echten Überlapp zurückgeschnitten: die
    // rohe (unkorrigierte) Fläche wäre 611882.28 mm² (empirisch mit
    // deaktivierter wandWandVerschneiden nachgewiesen) — nach dem Schnitt
    // bleiben 156000 mm².
    expect(flaeche(holz.loops)).toBeCloseTo(156000, 0);
    expect(flaeche(holz.loops)).toBeLessThan(611882);
    // Die verbleibende Holz-Kante stösst exakt an Betons Kante (s=1150) —
    // kein Rest-Überlapp, keine Lücke (Fugen-Schwelle greift exakt an der
    // neuen gemeinsamen Grenze).
    const holzMinS = Math.min(...holz.loops.flat().map((p) => p.s));
    const betonMaxS = Math.max(...beton.loops.flat().map((p) => p.s));
    expect(holzMinS).toBeCloseTo(betonMaxS, 0);
  });

  it('flacher T-Stoss, umgekehrte Richtung: Stahl (hoeher) bleibt unveraendert, Beton (niedriger) weicht', () => {
    const { doc, storeyId } = basis();
    const asmB = aufbau(doc, 'beton', 300); // Prio 900 — jetzt die niedrigere Seite
    const asmA = aufbau(doc, 'stahl', 200); // Prio 920 — höher als Beton
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmB, a: { x: 0, y: 0 }, b: { x: 8000, y: 0 } });
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmA, a: { x: 4000, y: 0 }, b: { x: 7000, y: 600 } });
    const g = deriveSection(doc, { a: { x: 4500, y: -1000 }, b: { x: 4500, y: 4000 }, depth: 30000, lookLeft: true });
    const beton = finde(g.faces, 'beton')!;
    const stahl = finde(g.faces, 'stahl')!;
    expect(beton, 'Beton (jetzt niedrigere Prioritaet)').toBeDefined();
    expect(stahl, 'Stahl (hoehere Prioritaet)').toBeDefined();
    // Stahl bleibt exakt seine rohe (unretrahierte) Fläche — bit-genau
    // dieselbe wie die rohe Holz-Fläche im Test oben (identische Geometrie,
    // nur das Material/die Prioritaet ist getauscht).
    expect(flaeche(stahl.loops)).toBeCloseTo(611882.28, 1);
    // Beton weicht jetzt zurück (900 < 920): deutlich unter der rohen
    // 300×3000-Flaeche.
    expect(flaeche(beton.loops)).toBeCloseTo(444000, 0);
    expect(flaeche(beton.loops)).toBeLessThan(300 * 3000);
  });

  it('Kreuzung (Eckfall-Stellvertreter): Wand ohne hoehere Prioritaet im Ueberlapp verschwindet vollstaendig', () => {
    const { doc, storeyId } = basis();
    const asmB = aufbau(doc, 'beton', 300); // Prio 900
    const asmA = aufbau(doc, 'holz', 400); // Prio 680 — vollstaendig innerhalb von B's Band
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmB, a: { x: -3000, y: 0 }, b: { x: 3000, y: 0 } });
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmA, a: { x: 0, y: -3000 }, b: { x: 0, y: 3000 } });
    expect(asmA).not.toBe(asmB); // ungleiche assemblyId (D1/E1-Testliste) — verschiedene Aufbauten, nicht nur Material
    const g = deriveSection(doc, { a: { x: -4000, y: -50 }, b: { x: 4000, y: -50 }, depth: 30000, lookLeft: true });
    // Holz (400×3000, vollstaendig in Betons 6000×3000-Band enthalten) wird
    // KOMPLETT konsumiert — die A1-Semantik lässt an dieser Schnittstelle
    // nichts vom niedriger priorisierten Material übrig, das Face fällt aus
    // `faces` (leere Loops werden gefiltert, wie im Bestand).
    expect(finde(g.faces, 'holz')).toBeUndefined();
    const beton = finde(g.faces, 'beton')!;
    // Beton selbst bleibt roh unveraendert (nichts im Band hat hoehere Prio).
    expect(flaeche(beton.loops)).toBeCloseTo(6000 * 3000, 0);
  });

  it('Kreuzung, umgekehrte Richtung: hoehere Prioritaet bleibt voll, niedrigere wird mittig gespalten', () => {
    const { doc, storeyId } = basis();
    const asmB = aufbau(doc, 'beton', 300); // Prio 900 — jetzt die niedrigere Seite
    const asmA = aufbau(doc, 'stahl', 400); // Prio 920
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmB, a: { x: -3000, y: 0 }, b: { x: 3000, y: 0 } });
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmA, a: { x: 0, y: -3000 }, b: { x: 0, y: 3000 } });
    const g = deriveSection(doc, { a: { x: -4000, y: -50 }, b: { x: 4000, y: -50 }, depth: 30000, lookLeft: true });
    const stahl = finde(g.faces, 'stahl')!;
    const beton = finde(g.faces, 'beton')!;
    // Stahl (hoehere Prio) bleibt exakt seine rohe Flaeche, EIN Loop.
    expect(stahl.loops).toHaveLength(1);
    expect(flaeche(stahl.loops)).toBeCloseTo(400 * 3000, 0);
    // Beton wird von Stahls Kerbe in zwei Teile (links/rechts) gespalten —
    // die Stahl-Kerbe reicht ueber die volle Hoehe (0..3000), trennt Betons
    // Rechteck also vollstaendig durch. Flaechensumme = 18 000 000 − 1 200 000.
    expect(beton.loops).toHaveLength(2);
    expect(flaeche(beton.loops)).toBeCloseTo(6000 * 3000 - 400 * 3000, 0);
  });

  it('gleiche Prioritaet: BEIDE Waende bleiben roh unveraendert (dokumentierter Tie-Break wie wandDeckeVerschneiden)', () => {
    const { doc, storeyId } = basis();
    const asmB = aufbau(doc, 'beton', 300);
    const asmA = aufbau(doc, 'beton', 400); // gleiches Material = gleiche Prioritaet, ungleiche assemblyId (Dicke)
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmB, a: { x: -3000, y: 0 }, b: { x: 3000, y: 0 } });
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmA, a: { x: 0, y: -3000 }, b: { x: 0, y: 3000 } });
    const g = deriveSection(doc, { a: { x: -4000, y: -50 }, b: { x: 4000, y: -50 }, depth: 30000, lookLeft: true });
    expect(g.faces).toHaveLength(2);
    const flaechen = g.faces.map((f) => flaeche(f.loops)).sort((a, b) => a - b);
    // Beide Rechtecke bleiben unbeschnitten trotz echter Ueberlappung —
    // keine gewinnt, keine weicht (strikt `>`, nicht `>=`, wie im Bestand).
    expect(flaechen[0]).toBeCloseTo(400 * 3000, 0);
    expect(flaechen[1]).toBeCloseTo(6000 * 3000, 0);
  });

  it('normaler 90-Grad-T-Stoss: miterWallEnds gehrt bereits korrekt, keine Ueberlapp-Gruppe entsteht (byte-still)', () => {
    const { doc, storeyId } = basis();
    const asmB = aufbau(doc, 'beton', 300);
    const asmA = aufbau(doc, 'holz', 200);
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmB, a: { x: 0, y: 0 }, b: { x: 8000, y: 0 } });
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmA, a: { x: 4000, y: 0 }, b: { x: 4000, y: 3000 } });
    const g = deriveSection(doc, { a: { x: 3950, y: -1000 }, b: { x: 3950, y: 4000 }, depth: 30000, lookLeft: true });
    const beton = finde(g.faces, 'beton')!;
    const holz = finde(g.faces, 'holz')!;
    // Beton (Durchlaufwand) bleibt seine volle rohe Querschnittsflaeche.
    expect(flaeche(beton.loops)).toBeCloseTo(300 * 3000, 0);
    // Holz (Stichwand) ist bereits von miterWallEnds korrekt auf die
    // Fugenflaeche zurueckgezogen (150mm Rueckzug = Betons Halbdicke) — MEINE
    // Funktion greift hier gar nicht ein (keine Gruppe, da unter der
    // Fugen-Schwelle): 2850mm Restlaenge × 3000mm Hoehe.
    expect(flaeche(holz.loops)).toBeCloseTo(2850 * 3000, 0);
  });

  it('>2-Wand-Knoten: drei Waende in EINER Ueberlapp-Gruppe bleiben komplett unangetastet (Sanktion 5)', () => {
    const { doc, storeyId } = basis();
    const asmB = aufbau(doc, 'beton', 300); // Prio 900 — waere ohne Ausschluss die hoechste
    const asmA = aufbau(doc, 'holz', 400); // Prio 680 — waere ohne Ausschluss die niedrigste
    const asmC = aufbau(doc, 'mauerwerk', 400); // Prio 780 — dazwischen; ueberlappt SOWOHL A als auch B
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmB, a: { x: -3000, y: 0 }, b: { x: 3000, y: 0 } });
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmA, a: { x: 0, y: -3000 }, b: { x: 0, y: 3000 } });
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmC, a: { x: 300, y: -3000 }, b: { x: 300, y: 3000 } });
    const g = deriveSection(doc, { a: { x: -4000, y: -50 }, b: { x: 4000, y: -50 }, depth: 30000, lookLeft: true });
    const beton = finde(g.faces, 'beton')!;
    const holz = finde(g.faces, 'holz')!;
    const mauerwerk = finde(g.faces, 'mauerwerk')!;
    expect(beton, 'Beton').toBeDefined();
    expect(holz, 'Holz').toBeDefined();
    expect(mauerwerk, 'Mauerwerk').toBeDefined();
    // Trotz echter, sogar wechselseitiger Ueberlappung (A×B, C×B, UND A×C
    // ueberlappen sich alle paarweise ueber der Fugen-Schwelle) bleibt JEDE
    // der drei Flaechen exakt ihre rohe Ausgangsflaeche — kein Face wird
    // geschnitten, weil die Ueberlapp-Gruppe DREI verschiedene entityIds
    // zaehlt (kontrollierter Ausschluss statt eines stillen Falschbilds).
    expect(flaeche(beton.loops)).toBeCloseTo(6000 * 3000, 0);
    expect(flaeche(holz.loops)).toBeCloseTo(400 * 3000, 0);
    expect(flaeche(mauerwerk.loops)).toBeCloseTo(400 * 3000, 0);
  });

  it('Determinismus: zweimaliger deriveSection-Aufruf auf demselben Doc liefert identische Faces', () => {
    const { doc, storeyId } = basis();
    const asmB = aufbau(doc, 'beton', 300);
    const asmA = aufbau(doc, 'stahl', 400);
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmB, a: { x: -3000, y: 0 }, b: { x: 3000, y: 0 } });
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmA, a: { x: 0, y: -3000 }, b: { x: 0, y: 3000 } });
    const spec = { a: { x: -4000, y: -50 }, b: { x: 4000, y: -50 }, depth: 30000, lookLeft: true } as const;
    const g1 = deriveSection(doc, spec);
    const g2 = deriveSection(doc, spec);
    expect(g2.faces).toEqual(g1.faces);
    expect(g1.faces).toHaveLength(2); // beide Materialien vorhanden (Stahl voll, Beton gespalten)
  });

  it('Undo-Sauberkeit: Wand-Entfernen per invertPatches macht die Wand↔Wand-Verschneidung rueckstandslos rueckgaengig', () => {
    const { doc, storeyId } = basis();
    const asmB = aufbau(doc, 'beton', 300);
    const asmA = aufbau(doc, 'holz', 200);
    execute(doc, 'design.wandZeichnen', { storeyId, assemblyId: asmB, a: { x: 0, y: 0 }, b: { x: 8000, y: 0 } });
    const spec = { a: { x: 4500, y: -1000 }, b: { x: 4500, y: 4000 }, depth: 30000, lookLeft: true } as const;
    const basisG = deriveSection(doc, spec);
    expect(basisG.faces).toHaveLength(1); // nur Beton, voll (keine zweite Wand vorhanden)
    const betonBasisFlaeche = flaeche(finde(basisG.faces, 'beton')!.loops);

    const res = execute(doc, 'design.wandZeichnen', {
      storeyId,
      assemblyId: asmA,
      a: { x: 4000, y: 0 },
      b: { x: 7000, y: 600 },
    });
    const nachher = deriveSection(doc, spec);
    expect(nachher.faces).toHaveLength(2); // Holz erscheint, Beton bleibt unveraendert (hoehere Prio)
    expect(flaeche(finde(nachher.faces, 'beton')!.loops)).toBeCloseTo(betonBasisFlaeche, 0);

    doc.apply(invertPatches(res.patches));
    const zurueck = deriveSection(doc, spec);
    // Nach dem Undo ist wieder GENAU der Basiszustand da — keine Rueckstaende
    // aus der Wand↔Wand-Verschneidung (RawFace wird bei jedem deriveSection-
    // Aufruf frisch aus dem Doc abgeleitet, nichts wird zwischen Aufrufen
    // auf dem Doc oder anderswo persistiert).
    expect(zurueck.faces).toHaveLength(1);
    expect(flaeche(finde(zurueck.faces, 'beton')!.loops)).toBeCloseTo(betonBasisFlaeche, 0);
    expect(zurueck.faces).toEqual(basisG.faces);
  });
});
