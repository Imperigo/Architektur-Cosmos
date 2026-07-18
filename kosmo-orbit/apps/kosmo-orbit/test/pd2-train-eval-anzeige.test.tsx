import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import 'fake-indexeddb/auto';
import { TrainWorkspace } from '../src/modules/train/TrainWorkspace';

/**
 * v0.8.4 / PD2 «Eval-Harness kosmo-zeichner-commands» (`docs/V084-SPEZ.md`
 * D14/C-23) — additiver Regressionsschutz für die NEUE Eval-Zeile in der
 * Adapter-Registry-Anzeige (`TrainWorkspace.tsx`). Eigene Datei statt
 * Erweiterung von `train-paket.test.tsx` (dessen bestehende 3 Tests bleiben
 * unangetastet — dasselbe Render-Muster (`renderToStaticMarkup`, kein DOM/
 * Interaktion nötig), aber ein eigener, additiver Prüfpunkt statt eines
 * Eingriffs in eine laufende, grüne Datei).
 */

describe('TrainWorkspace — Eval-Zeile der Adapter-Registry (v0.8.4/PD2)', () => {
  it('zeigt die Eval-Zeile NUR für kosmo-zeichner-commands, mit der 25/25-Quote', () => {
    const html = renderToStaticMarkup(<TrainWorkspace />);
    expect(html).toContain('data-testid="train-adapter-eval-kosmo-zeichner-commands"');
    expect(html).toContain('25/25');
    expect(html).toContain('PD2');
  });

  it('zeigt KEINE Eval-Zeile für Adapter ohne eval-Feld (kein erfundener Eval-Stand)', () => {
    const html = renderToStaticMarkup(<TrainWorkspace />);
    for (const id of ['kosmo-buero', 'kosmo-zeichner-grundriss', 'kosmo-buero-dpo', 'whisper-ch', 'kosmo-werkplan']) {
      expect(html).not.toContain(`data-testid="train-adapter-eval-${id}"`);
    }
  });
});
