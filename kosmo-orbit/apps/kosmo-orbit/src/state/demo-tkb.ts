import { KosmoDoc, execute, segmentiere, sollMix, type ExecutionResult } from '@kosmo/kernel';
import { useProject } from './project-store';

/**
 * TKB «Bibliothek Hönggerberg» — das mitgelieferte Beispielprojekt
 * (Owner-Entscheid Q15). Programm aus der echten Wettbewerbs-Kette der
 * HomeStation (Tagesbericht 01.07.2026): 7 Geschosse, Σ2814 m².
 * Flächen-getreue, schematische Platten (wie in der KosmoPublish-Kette);
 * Geschosshöhe 3.5 m = dokumentierte Annahme.
 */

const programm: { name: string; index: number; flaeche: number; nutzung: string }[] = [
  { name: 'EG', index: 0, flaeche: 522, nutzung: 'Foyer / Ausleihe' },
  { name: '1.OG', index: 1, flaeche: 448, nutzung: 'Freihandbibliothek' },
  { name: '2.OG', index: 2, flaeche: 448, nutzung: 'Freihandbibliothek' },
  { name: '3.OG', index: 3, flaeche: 448, nutzung: 'Arbeitsplätze' },
  { name: '4.OG', index: 4, flaeche: 448, nutzung: 'Arbeitsplätze' },
  { name: '5.OG', index: 5, flaeche: 448, nutzung: 'Verwaltung / Seminar' },
  { name: 'Dach', index: 6, flaeche: 52, nutzung: 'Technik / Dachzugang' },
];

const GESCHOSSHOEHE = 3500;

export function loadTkbDemo(): void {
  const doc = new KosmoDoc();
  doc.settings = { ...doc.settings, projectName: 'TKB Bibliothek Hönggerberg' };
  const run = (id: string, p: unknown): ExecutionResult => execute(doc, id, p);

  run('design.aufbauErstellen', {
    name: 'AW Beton 40',
    target: 'wall',
    layers: [
      { material: 'putz', thickness: 20, function: 'bekleidung' },
      { material: 'daemmung-mw', thickness: 200, function: 'daemmung' },
      { material: 'beton', thickness: 180, function: 'tragend' },
    ],
  });
  run('design.aufbauErstellen', {
    name: 'IW Beton 20',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 200, function: 'tragend' }],
  });

  let firstStoreyId: string | null = null;
  for (const g of programm) {
    const res = run('design.geschossErstellen', {
      name: g.name,
      index: g.index,
      elevation: g.index * GESCHOSSHOEHE,
      height: GESCHOSSHOEHE,
    });
    const storeyId = (res.patches[0] as { id: string }).id;
    if (g.index === 0) firstStoreyId = storeyId;

    // Flächen-getreues Quadrat, zentriert (wie program_massing.py der HomeStation)
    const side = Math.round(Math.sqrt(g.flaeche) * 1000);
    const half = Math.round(side / 2);
    const outline = [
      { x: -half, y: -half },
      { x: half, y: -half },
      { x: half, y: half },
      { x: -half, y: half },
    ];
    run('design.deckeZeichnen', { storeyId, outline, thickness: 300 });
    run('design.zoneErstellen', {
      storeyId,
      outline,
      name: g.nutzung,
      sia: g.name === 'Dach' ? 'FF' : 'HNF',
      program: 'bibliothek',
    });
  }

  // ── Wohnhof (Demo der Generator-Kette, Abendbatch C1) ────────────
  // Neben der Bibliothek (Versatz +40 m): Raumprogramm → schneiden (mit
  // Kern) → Grundrisse generieren → Wände bauen → Fenster stanzen.
  // Offline und deterministisch — zeigt die komplette Kette beim Öffnen.
  if (firstStoreyId) {
    const sid = firstStoreyId;
    const X = 40000;
    run('design.raumprogrammSetzen', {
      posten: [
        { typ: 'marktgerecht', hnfSoll: 190 },
        { typ: 'preisguenstig', hnfSoll: 150 },
      ],
    });
    const footprint = [
      { x: X, y: 0 }, { x: X + 30000, y: 0 },
      { x: X + 30000, y: 14000 }, { x: X, y: 14000 },
    ];
    const korridor = [
      { x: X, y: 6000 }, { x: X + 30000, y: 6000 },
      { x: X + 30000, y: 8000 }, { x: X, y: 8000 },
    ];
    run('design.zoneErstellen', { storeyId: sid, outline: korridor, name: 'Korridor Wohnhof', sia: 'VF', raumTyp: 'korridor' });
    const erg = segmentiere(footprint, korridor, sollMix(doc), { kern: true });
    const wohnungIds: string[] = [];
    let nr = 0;
    for (const w of erg.wohnungen) {
      nr++;
      const res = run('design.zoneErstellen', {
        storeyId: sid, outline: w.outline,
        name: w.typ ? `Whg ${nr} (${w.typ})` : 'Restfläche', sia: 'HNF',
        ...(w.typ ? { program: w.typ } : {}),
      });
      if (w.typ) wohnungIds.push((res.patches[0] as { id: string }).id);
    }
    if (erg.kern) {
      run('design.zoneErstellen', { storeyId: sid, outline: erg.kern.outline, name: 'Treppenhaus', sia: 'VF', raumTyp: 'treppenhaus' });
      const kxs = erg.kern.outline.map((p) => p.x);
      const kys = erg.kern.outline.map((p) => p.y);
      run('design.treppeErstellen', {
        storeyId: sid,
        a: { x: (Math.min(...kxs) + Math.max(...kxs)) / 2, y: Math.min(...kys) + 600 },
        b: { x: (Math.min(...kxs) + Math.max(...kxs)) / 2, y: Math.max(...kys) - 600 },
        width: 1200,
      });
    }
    for (const id of wohnungIds) {
      try {
        run('design.grundrissGenerieren', { zoneId: id, korridorSeite: 'auto' });
      } catch {
        /* zu klein — ehrlich ausgelassen */
      }
    }
    run('design.modulSpeichern', {
      name: 'TKB Fensterband', breite: 2500, hoehe: GESCHOSSHOEHE,
      elemente: [
        { x: 300, y: 1000, b: 1900, h: 1800, typ: 'fenster' },
        { x: 0, y: 0, b: 2500, h: 1000, typ: 'paneel' },
      ],
    });
    run('design.waendeAusZonen', { storeyId: sid });
    run('design.fensterAusModulen', { storeyId: sid, modul: 'TKB Fensterband' });
  }

  useProject.setState({
    doc,
    journal: [],
    revision: useProject.getState().revision + 1,
    activeStoreyId: firstStoreyId,
    selection: [],
  });
}
