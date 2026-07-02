import { KosmoDoc, execute, type ExecutionResult } from '@kosmo/kernel';
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

  useProject.setState({
    doc,
    journal: [],
    revision: useProject.getState().revision + 1,
    activeStoreyId: firstStoreyId,
    selection: [],
  });
}
