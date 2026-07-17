import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import 'fake-indexeddb/auto';
import { TrainWorkspace } from '../src/modules/train/TrainWorkspace';

/**
 * v0.8.2 / P6 «Staffelung + Kuratier-Flow» (`docs/V082-SPEZ.md` §6.7) —
 * Regressionsschutz für den neuen Kuratier-Flow-Block in `TrainWorkspace`:
 * der Weg Journal → Kuration (sichten + aussortieren MIT Grund) muss
 * strukturell vorhanden sein, auch ganz ohne Journal-Einträge (leerer
 * Ausgangspunkt, honest empty state). Muster `train-paket.test.tsx`
 * (statisches Rendern reicht für die Struktur-/testid-Prüfung — der
 * interaktive Fake-Probelauf-Lauf mit echten aussortierten Zeilen ist Sache
 * der E2E-Spec `e2e/staffelung-kuratier.spec.ts`).
 */
describe('TrainWorkspace — Kuratier-Flow (v0.8.2/P6 §6.7)', () => {
  it('zeigt den Kuratier-Flow-Block mit ehrlichem Leer-Zustand ohne Journal-Einträge', () => {
    const html = renderToStaticMarkup(<TrainWorkspace />);
    expect(html).toContain('data-testid="train-kuratier-flow"');
    expect(html).toContain('data-testid="train-kuratier-verworfen-leer"');
    expect(html).toContain('Kein Journal-Eintrag aussortiert');
    // Ohne Einträge gibt es (noch) keine Aussortierungszeile.
    expect(html).not.toContain('data-testid="train-kuratier-verworfen-eintrag"');
  });

  it('der Kuratier-Flow-Block liegt in der Trainingspaket-Fläche (bei P5s Sektion, nicht separat)', () => {
    const html = renderToStaticMarkup(<TrainWorkspace />);
    const paketIdx = html.indexOf('data-testid="train-paket"');
    const kuratierIdx = html.indexOf('data-testid="train-kuratier-flow"');
    const fakeIdx = html.indexOf('data-testid="train-fake-probelauf"');
    expect(paketIdx).toBeGreaterThan(-1);
    expect(kuratierIdx).toBeGreaterThan(paketIdx);
    expect(fakeIdx).toBeGreaterThan(kuratierIdx);
  });

  it('der Fake-Probelauf-Bericht kann eine Aussortierungs-Liste tragen (Container vorbereitet, additiv)', () => {
    // Ohne Klick bleibt `probelauf` null → kein `train-fake-bericht`-Block —
    // dieselbe Erwartung wie die bestehende P5-Regression
    // (`train-paket.test.tsx`), hier zusätzlich geprüft, dass der neue
    // `train-kuratier-aussortiert`-Container NICHT vor einem Lauf erscheint
    // (kein erfundenes Ergebnis ohne Klick).
    const html = renderToStaticMarkup(<TrainWorkspace />);
    expect(html).not.toContain('data-testid="train-fake-bericht"');
    expect(html).not.toContain('data-testid="train-kuratier-aussortiert"');
  });
});
