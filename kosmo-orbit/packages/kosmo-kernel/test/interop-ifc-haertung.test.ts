import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import { KosmoDoc } from '../src/model/doc';
import { execute } from '../src/commands/core';
import '../src/commands/design';
import { exportIfc } from '../src/ifc/export';

/**
 * v0.7.0 Stream 6A — IFC-Struktur-Härtung (Owner-Auftrag: Finch-Interop-Brücke
 * ehrlich härten). Der bestehende IFC4-Exporter (`ifc/export.ts`, Owner-Q10)
 * ist ein eigener SPF-Writer ohne Bibliothek — diese Tests prüfen die
 * SCHEMA-KONSISTENZ des erzeugten Textes strukturell (GUID-Eindeutigkeit,
 * Referenz-Integrität IFCRELCONTAINEDINSPATIALSTRUCTURE, vollständiger
 * Spatial-Tree) plus einen normalisierten Fixture-Vergleich gegen ein
 * committetes Referenz-IFC. Ergänzt (nicht ersetzt) die bestehenden
 * IFC-Assertions in kernel.test.ts — insbesondere den dort schon belegten,
 * ehrlichen V1-Stand «kein IFCWINDOW/IFCDOOR, Fenster bleiben
 * IFCOPENINGELEMENT (Void)», der hier unverändert bestätigt wird.
 */

/** Alle Top-Level-Produkt-Entities, die laut Exporter-Quelltext (ifc/export.ts)
 * je Geschoss in `storey.elements` gesammelt und danach über
 * IFCRELCONTAINEDINSPATIALSTRUCTURE ins Geschoss gehängt werden. */
const SPATIAL_PRODUKT_TYPEN = [
  'IFCWALL',
  'IFCSLAB',
  'IFCCOLUMN',
  'IFCBEAM',
  'IFCSPACE',
  'IFCBUILDINGELEMENTPROXY',
  'IFCFURNISHINGELEMENT',
] as const;

/** Parst die flache SPF-Zeilenstruktur `#N=TYP(args);` in eine Map id→typ
 * plus die Reihenfolge — genug für Referenz-/Eindeutigkeits-Checks, ohne
 * einen vollen STEP-Parser zu brauchen (bewusst schlank, testinternes Tool). */
function parseSpfZeilen(ifc: string): { id: string; typ: string; args: string }[] {
  const zeilen = ifc.split('\n').filter((z) => /^#\d+=/.test(z));
  return zeilen.map((z) => {
    const m = /^(#\d+)=([A-Z0-9_]+)\((.*)\);$/.exec(z.trim());
    if (!m) throw new Error(`SPF-Zeile unlesbar (Test-Parser): ${z.slice(0, 80)}`);
    return { id: m[1]!, typ: m[2]!, args: m[3]! };
  });
}

/** Alle 22-Zeichen-GlobalIds (newGuid()-Alphabet) im Text, in Reihenfolge. */
function alleGuids(ifc: string): string[] {
  return [...ifc.matchAll(/'([0-9A-Za-z_$]{22})'/g)].map((m) => m[1]!);
}

/** Referenzen (#N) innerhalb eines Arg-Strings, z.B. aus einer `(#3,#7)`-Liste. */
function referenzenIn(args: string): string[] {
  return [...args.matchAll(/#\d+/g)].map((m) => m[0]);
}

function referenzDoc(): { doc: KosmoDoc; storeyId: string; wallId: string } {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW', target: 'wall', layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });
  const w1 = wand({ x: 0, y: 0 }, { x: 6000, y: 0 });
  const wallId = (w1.patches[0] as { id: string }).id;
  wand({ x: 6000, y: 0 }, { x: 6000, y: 4000 });
  wand({ x: 6000, y: 4000 }, { x: 0, y: 4000 });
  wand({ x: 0, y: 4000 }, { x: 0, y: 0 });

  // Parametrisches Fenster — bleibt IFCOPENINGELEMENT (V1-Stand, s.o.).
  const fenster = execute(doc, 'design.oeffnungSetzen', {
    wallId, openingType: 'fenster', center: 3000, width: 1600, height: 1400, sill: 900,
  });
  const fensterId = (fenster.patches[0] as { id: string }).id;
  execute(doc, 'design.fensterParametrieren', {
    openingId: fensterId, fensterTyp: 'zweifluegel', teilungN: 2, teilungM: 1, rahmenbreite: 80, swing: 'links',
  });

  execute(doc, 'design.deckeZeichnen', {
    storeyId, outline: [{ x: 0, y: 0 }, { x: 6000, y: 0 }, { x: 6000, y: 4000 }, { x: 0, y: 4000 }], thickness: 250,
  });
  execute(doc, 'design.stuetzeSetzen', { storeyId, at: { x: 3000, y: 2000 }, b: 300 });
  execute(doc, 'design.unterzugZeichnen', { storeyId, a: { x: 0, y: 2000 }, b: { x: 6000, y: 2000 }, breite: 300, hoehe: 400 });
  execute(doc, 'design.zoneErstellen', {
    storeyId, outline: [{ x: 200, y: 200 }, { x: 5800, y: 200 }, { x: 5800, y: 3800 }, { x: 200, y: 3800 }],
    name: 'Wohnen', sia: 'HNF',
  });
  execute(doc, 'design.volumenErstellen', {
    storeyId, outline: [{ x: 0, y: -4000 }, { x: 2000, y: -4000 }, { x: 2000, y: -1000 }, { x: 0, y: -1000 }],
    height: 3000, program: 'wohnen',
  });
  execute(doc, 'design.meshErstellen', {
    form: 'quader', storeyId, at: { x: -3000, y: 0 }, breite: 500, laenge: 500, hoehe: 500, name: 'Test-Quader',
  });
  execute(doc, 'design.moebelSetzen', { storeyId, typ: 'bett-doppel', at: { x: 1000, y: 1000 }, rotationGrad: 0 });

  return { doc, storeyId, wallId };
}

describe('IFC-Struktur-Härtung (Schema-Konsistenz auf dem Export-String), v0.7.0 6A', () => {
  const { doc } = referenzDoc();
  const ifc = exportIfc(doc, 'Haertungs-Test');
  const zeilen = parseSpfZeilen(ifc);
  const bekannteIds = new Set(zeilen.map((z) => z.id));

  it('jede GlobalId (22-Zeichen-Base64-Variante) ist eindeutig — keine Kollisionen unter vielen Entities', () => {
    const guids = alleGuids(ifc);
    expect(guids.length).toBeGreaterThan(10); // Modell mit vielen benannten Entities
    expect(new Set(guids).size).toBe(guids.length);
  });

  it('jede #Referenz im Dokument zeigt auf eine tatsächlich definierte Zeile (#N=...) — keine hängenden Zeiger', () => {
    let referenzen = 0;
    for (const z of zeilen) {
      for (const ref of referenzenIn(z.args)) {
        referenzen += 1;
        expect(bekannteIds.has(ref), `${z.id}=${z.typ}(...) referenziert ${ref}, das nirgends definiert ist`).toBe(true);
      }
    }
    expect(referenzen).toBeGreaterThan(0);
  });

  it('IFCRELCONTAINEDINSPATIALSTRUCTURE: das Ziel jeder Relation ist ein tatsächliches IFCBUILDINGSTOREY', () => {
    const storeyIds = new Set(zeilen.filter((z) => z.typ === 'IFCBUILDINGSTOREY').map((z) => z.id));
    expect(storeyIds.size).toBeGreaterThan(0);
    const rels = zeilen.filter((z) => z.typ === 'IFCRELCONTAINEDINSPATIALSTRUCTURE');
    expect(rels.length).toBeGreaterThan(0);
    for (const rel of rels) {
      // Format: 'guid',$,$,$,(#a,#b,...),#storey — letzte Referenz ist das Geschoss.
      const refs = referenzenIn(rel.args);
      const storeyRef = refs[refs.length - 1]!;
      expect(storeyIds.has(storeyRef), `${rel.id} referenziert Geschoss ${storeyRef}, das kein IFCBUILDINGSTOREY ist`).toBe(true);
    }
  });

  it('alle Spatial-Produkt-Entities (Wand/Decke/Stütze/Unterzug/Space/Proxy/Möbel) hängen in GENAU einer Containment-Relation', () => {
    const containedIds = new Set<string>();
    const doppelt = new Set<string>();
    for (const rel of zeilen.filter((z) => z.typ === 'IFCRELCONTAINEDINSPATIALSTRUCTURE')) {
      const refs = referenzenIn(rel.args);
      const elemente = refs.slice(0, -1); // letzte Referenz = Geschoss, Rest = Elemente
      for (const e of elemente) {
        if (containedIds.has(e)) doppelt.add(e);
        containedIds.add(e);
      }
    }
    expect(doppelt.size).toBe(0);

    const produktEntities = zeilen.filter((z) => (SPATIAL_PRODUKT_TYPEN as readonly string[]).includes(z.typ));
    // Am Referenz-Doc mindestens ein Vorkommen je Typ (belegt die Vollständigkeit
    // des Fixture-Aufbaus selbst).
    for (const typ of SPATIAL_PRODUKT_TYPEN) {
      expect(zeilen.some((z) => z.typ === typ), `Fixture enthält kein ${typ}`).toBe(true);
    }
    for (const p of produktEntities) {
      expect(containedIds.has(p.id), `${p.id}=${p.typ}(...) hängt in KEINER IFCRELCONTAINEDINSPATIALSTRUCTURE`).toBe(true);
    }
  });

  it('FreeMesh (IFCBUILDINGELEMENTPROXY/IFCFACETEDBREP) und Öffnungen (IFCOPENINGELEMENT/IFCRELVOIDSELEMENT) ' +
    'sind referenz-konsistent: jedes Void referenziert eine tatsächliche Wand', () => {
    const wallIds = new Set(zeilen.filter((z) => z.typ === 'IFCWALL').map((z) => z.id));
    const voids = zeilen.filter((z) => z.typ === 'IFCRELVOIDSELEMENT');
    expect(voids.length).toBeGreaterThan(0);
    for (const v of voids) {
      const refs = referenzenIn(v.args); // (wallId, openingId)
      expect(refs.length).toBe(2);
      expect(wallIds.has(refs[0]!), `${v.id} referenziert keine bekannte Wand`).toBe(true);
      const openingId = refs[1]!;
      expect(zeilen.some((z) => z.id === openingId && z.typ === 'IFCOPENINGELEMENT')).toBe(true);
    }
    // Das Fixture bringt zusätzlich einen FreeMesh-Quader mit — der geht als
    // echter B-Rep (IFCFACETEDBREP), referenziert aber keine Wand/Void und
    // gehört daher nicht zu dieser Prüfung, ist aber ein Beleg, dass beide
    // Geometrie-Pfade nebeneinander bestehen.
    expect(zeilen.some((z) => z.typ === 'IFCFACETEDBREP')).toBe(true);
  });

  it('ehrlicher V1-Stand bleibt: das parametrische Fenster erzeugt NUR IFCOPENINGELEMENT, ' +
    'nie IFCWINDOW/IFCDOOR (unabhängig re-belegt, ergänzt kernel.test.ts)', () => {
    expect(ifc).not.toContain('IFCWINDOW');
    expect(ifc).not.toContain('IFCDOOR');
    expect(zeilen.filter((z) => z.typ === 'IFCOPENINGELEMENT').length).toBeGreaterThan(0);
  });

  it('leerer Storey ohne Elemente erzeugt keine IFCRELCONTAINEDINSPATIALSTRUCTURE-Zeile (kein Absturz, keine leere Liste)', () => {
    const leer = new KosmoDoc();
    execute(leer, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const ifcLeer = exportIfc(leer, 'Leer');
    expect(() => exportIfc(leer, 'Leer')).not.toThrow();
    expect(ifcLeer).not.toContain('IFCRELCONTAINEDINSPATIALSTRUCTURE');
    expect(ifcLeer.trim().endsWith('END-ISO-10303-21;')).toBe(true);
  });
});

/** Entfernt die beiden nicht-deterministischen Anteile des Exports (Zeitstempel
 * im FILE_NAME-Header, zufällige GlobalIds) — der Rest (Entity-Reihenfolge,
 * IDs #N, Struktur) ist bei fixem Doc-Aufbau deterministisch und damit
 * golden-fähig. */
function normalisiereIfc(ifc: string): string {
  return ifc
    .replace(/'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'/, "'<ZEITSTEMPEL>'")
    .replace(/'[0-9A-Za-z_$]{22}'/g, "'<GUID>'");
}

describe('IFC-Fixture-Vergleich gegen committetes Referenz-IFC (normalisiert), v0.7.0 6A', () => {
  it('exportIfc(Referenz-Doc) ist — nach Zeitstempel-/GUID-Normalisierung — byte-identisch zum Golden', () => {
    const { doc } = referenzDoc();
    const ifc = exportIfc(doc, 'Referenz');
    const normalisiert = normalisiereIfc(ifc);
    pruefeGolden(normalisiert, new URL('./golden/interop-referenz-normalisiert.ifc', import.meta.url));
  });
});
