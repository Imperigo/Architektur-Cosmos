import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { sheetToSvg, type DocJson } from '@kosmo/kernel';
import { baueHerkunft, docHashVon, herkunftKennzeichnung, svgMitHerkunft } from '../src/state/herkunft';
import { packProject } from '../src/state/project-io';
import { useProject } from '../src/state/project-store';

/**
 * Serie I / Batch B5 — Anti-Copy Stufe 1 (Fingerprint in Exporten).
 *
 * Diese Suite belegt zwei Dinge, wörtlich gegen den Bauplan:
 * (1) der Herkunfts-Fingerprint (`editionId`/`exportedAt`/`docHash`) sitzt
 *     NUR im `.kosmo`-Export-Wrapper (`kosmo.project.json`) bzw. in
 *     PDF-/SVG-Metadaten — NIE im Doc-Modell (`model/model.json`), das durch
 *     Yjs/Undo/Sync läuft («Laufzeit ≠ Modell»);
 * (2) der Golden-Pfad (`sheetToSvg`/`plansvg.ts`) bleibt dabei unberührt —
 *     `svgMitHerkunft` fügt nur ein `<metadata>`-Element ein; entfernt man es
 *     wieder, steht exakt das `sheetToSvg`-Original da (byte-identisch).
 * Die eigentlichen Golden-Dateien (`grundriss-testhaus.svg`,
 * `ansicht-sued-testhaus.svg`) werden unverändert vom bestehenden
 * `kernel.test.ts` geprüft — dieser Batch rührt `sheet.ts`/`plansvg.ts` nicht an.
 */

function leererDocJson(): DocJson {
  return { schema: 'kosmo.model/v1', settings: {}, entities: [] } as DocJson;
}

describe('docHashVon — deterministischer, kanonischer Doc-Hash', () => {
  it('liefert für denselben Inhalt denselben Hash, unabhängig von Schlüssel-Reihenfolge', () => {
    const a = leererDocJson();
    const b = JSON.parse('{"entities":[],"schema":"kosmo.model/v1","settings":{}}') as DocJson;
    expect(docHashVon(a)).toBe(docHashVon(b));
    // Zweiter Aufruf mit demselben Objekt: exakt derselbe Hash (kein Zufall/Zeit-Anteil).
    expect(docHashVon(a)).toBe(docHashVon(a));
  });

  it('ändert sich, wenn ein Entity dazukommt', () => {
    const leer = leererDocJson();
    const mitEntity: DocJson = {
      schema: 'kosmo.model/v1',
      settings: {},
      entities: [{ id: 'e1', kind: 'storey', name: 'EG', index: 0, elevation: 0, height: 3000 } as never],
    };
    expect(docHashVon(leer)).not.toBe(docHashVon(mitEntity));
  });
});

describe('baueHerkunft — reine Funktion: exportedAt/editionId kommen vom Aufrufer', () => {
  it('übernimmt exportedAt/editionId 1:1, kein Date.now()/Umgebungs-Zugriff intern', () => {
    const json = leererDocJson();
    const h1 = baueHerkunft({ json, editionId: 'standard', exportedAt: '2020-01-01T00:00:00.000Z' });
    const h2 = baueHerkunft({ json, editionId: 'standard', exportedAt: '2020-01-01T00:00:00.000Z' });
    expect(h1).toEqual(h2); // gleiche Eingabe -> exakt gleiche Ausgabe
    expect(h1.editionId).toBe('standard');
    expect(h1.exportedAt).toBe('2020-01-01T00:00:00.000Z');
    expect(h1.docHash).toBe(docHashVon(json));
  });
});

describe('packProject — .kosmo-Export-Wrapper trägt herkunft, model.json bleibt unverändert', () => {
  it('herkunft steht im Manifest (kosmo.project.json), NICHT im Doc-Modell (model/model.json)', () => {
    useProject.getState().runCommand('design.geschossErstellen', {
      name: 'EG',
      index: 0,
      elevation: 0,
      height: 3000,
    });
    const docJson = useProject.getState().doc.toJSON();

    const bytes = packProject({ editionId: 'standard', exportedAt: '2026-07-07T00:00:00.000Z' });
    const files = unzipSync(bytes);
    const manifest = JSON.parse(strFromU8(files['kosmo.project.json']!));
    const model = JSON.parse(strFromU8(files['model/model.json']!));

    expect(manifest.herkunft).toEqual({
      editionId: 'standard',
      exportedAt: '2026-07-07T00:00:00.000Z',
      docHash: docHashVon(docJson),
    });
    // additiv: das Doc-Modell selbst trägt KEINE Herkunftskennung.
    expect(model).toEqual(docJson);
    expect(model.herkunft).toBeUndefined();
  });

  it('editionId fällt ehrlich auf "unbekannt" zurück, wenn keine Edition bekannt ist', () => {
    const bytes = packProject({ exportedAt: '2026-07-07T00:00:00.000Z' });
    const manifest = JSON.parse(strFromU8(unzipSync(bytes)['kosmo.project.json']!));
    // Im Test-/CI-Build ist VITE_KOSMO_EDITION nicht gesetzt.
    expect(manifest.herkunft.editionId).toBe('unbekannt');
  });

  it('docHash ändert sich, wenn der Doc-Inhalt zwischen zwei Exporten wächst', () => {
    const vorher = packProject({ editionId: 'standard', exportedAt: 't1' });
    useProject.getState().runCommand('design.geschossErstellen', {
      name: '1.OG',
      index: 1,
      elevation: 3000,
      height: 2800,
    });
    const nachher = packProject({ editionId: 'standard', exportedAt: 't1' });
    const hashVon = (b: Uint8Array) => JSON.parse(strFromU8(unzipSync(b)['kosmo.project.json']!)).herkunft.docHash;
    expect(hashVon(vorher)).not.toBe(hashVon(nachher));
  });
});

describe('Golden-Beweis: svgMitHerkunft rührt nicht am sheetToSvg-Markup selbst', () => {
  it('sheetToSvg (Golden-Pfad) bleibt unverändert erreichbar — unbekannte Blatt-ID liefert das Leer-Markup', () => {
    const { doc } = useProject.getState();
    const leer = sheetToSvg(doc, 'gibt-es-nicht', { projectName: 'Test' });
    expect(leer).toBe('<svg xmlns="http://www.w3.org/2000/svg"/>');
  });

  it('svgMitHerkunft fügt nur ein <metadata>-Element ein — Entfernen ergibt wieder EXAKT das sheetToSvg-Original', () => {
    const { doc } = useProject.getState();
    const original = sheetToSvg(doc, 'gibt-es-nicht', { projectName: 'Test' });
    const h = baueHerkunft({ json: doc.toJSON(), editionId: 'standard', exportedAt: 't1' });
    const markiert = svgMitHerkunft(original, h);

    expect(markiert).not.toBe(original);
    expect(markiert).toContain(`<metadata>${herkunftKennzeichnung(h)}</metadata>`);
    const entfernt = markiert.replace(`<metadata>${herkunftKennzeichnung(h)}</metadata>`, '');
    expect(entfernt).toBe(original); // byte-identisch nach Entfernen der Kennung — die Kennung sitzt strikt darüber
  });
});
