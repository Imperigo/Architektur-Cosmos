import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import 'fake-indexeddb/auto';
import { TrainWorkspace } from '../src/modules/train/TrainWorkspace';

/**
 * v0.8.2 / P5 «Trainer-Contract + Trainingspaket» (`docs/V082-SPEZ.md` §6.5)
 * — Regressionsschutz für die neue Trainingspaket-Fläche in `TrainWorkspace`:
 * die Adapter-Registry-Statuszeilen (§2.4/§5.2) müssen rendern, und der
 * «Trainingspaket schnüren»-Knopf darf ohne kuratierte Journal-Einträge
 * (mit Notiz) NICHT anklickbar sein (kein leeres/erfundenes Paket). Muster
 * `test/app-deinstallieren.test.tsx` (statisches Rendern reicht, um
 * Inhalt/testids zu prüfen — die interaktive Schnüren→Download-Kette ist
 * Sache der E2E-Spec `train-paket-schnueren.spec.ts`, Port 5176).
 */

const ADAPTER_IDS = [
  'kosmo-buero',
  'kosmo-zeichner-grundriss',
  'kosmo-zeichner-commands',
  'kosmo-buero-dpo',
  'whisper-ch',
  'kosmo-werkplan',
];

describe('TrainWorkspace — Trainingspaket-Adapterstatus (v0.8.2/P5)', () => {
  it('zeigt alle 6 Adapter der Zielkompetenz-Karte mit ehrlicher Statuszeile', () => {
    const html = renderToStaticMarkup(<TrainWorkspace />);
    expect(html).toContain('data-testid="train-paket"');
    expect(html).toContain('data-testid="train-adapter-registry"');
    for (const id of ADAPTER_IDS) {
      expect(html).toContain(`data-testid="train-adapter-${id}"`);
      expect(html).toContain(`data-testid="train-adapter-status-${id}"`);
    }
    // whisper-ch/kosmo-werkplan: ehrlich "wartet", kein Trainingslauf-Versprechen
    expect(html).toContain('wartet auf Owner/HomeStation');
  });

  it('«Trainingspaket schnüren» ist ohne kuratierte (mit Notiz versehene) Journal-Einträge deaktiviert', () => {
    const html = renderToStaticMarkup(<TrainWorkspace />);
    expect(html).toMatch(/data-testid="train-paket-schnueren"[^>]*disabled=""/);
  });

  it('der Fake-Probelauf-Knopf ist vorhanden und trägt keine Trainingslauf-Behauptung im Label', () => {
    const html = renderToStaticMarkup(<TrainWorkspace />);
    expect(html).toContain('data-testid="train-fake-probelauf"');
    expect(html).toContain('Fake-Probelauf');
  });
});
