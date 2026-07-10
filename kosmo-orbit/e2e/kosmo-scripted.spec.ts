import { expect, test } from '@playwright/test';
import type { SzenarioSkript } from '@kosmo/ai';
import { kosmoChatSkript } from './sim/bausteine';

/**
 * v0.6.7 Phase 0 — ScriptedProvider (`packages/kosmo-ai/src/scripted.ts`)
 * durch den ECHTEN App-Pfad: `KosmoPanel`s `session`-Aufbau (Provider-Fall
 * 'scripted', `apps/kosmo-orbit/src/shell/KosmoPanel.tsx`) + der reale
 * `ChatSession`-Umlauf (Validierung → Defaults aus dem App-Kontext →
 * Diff-Karte → Freigabe → `AUSGEFÜHRT`-Tool-Result → Quittierung). Die
 * Unit-Tests in `packages/kosmo-ai/test/scripted.test.ts` beweisen die
 * Provider-Mechanik isoliert; dieser Test beweist die Verdrahtung im
 * laufenden Browser (Registry-Injektion via `addInitScript`, Settings-
 * Umschaltung, echte KosmoPanel-Diff-Karten).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => { doc: { byKind: (k: string) => { id: string }[] } };
    };
  }
}

test('ScriptedProvider spielt ein Skript via kosmoChatSkript durch den echten ChatSession/KosmoPanel-Pfad', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  // TKB laden: liefert eine aktive Storey + eine Wand-Aufbau — genau die
  // App-Kontext-Defaults, die ChatSession.applyDefaults() für
  // design_wandZeichnen braucht (KosmoPanel.tsx contextDefaults).
  await page.click('[data-testid="load-tkb"]'); // [Quelle: vis-automatik.spec.ts Z.43]
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible(); // [Quelle: vis-automatik.spec.ts Z.44]

  const waendeVorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);

  const skript: SzenarioSkript = {
    id: 'p0-demo-wand',
    zuege: [
      {
        // String statt RegExp: eine RegExp überlebt die JSON-Serialisierung
        // der evaluate-Argumente nicht (s. kosmoChatSkript-Hinweis).
        nutzerErwartung: 'wand',
        antwortText: 'Gerne — ich zeichne die Wand.',
        toolCalls: [{ name: 'design_wandZeichnen', args: { a: { x: 0, y: 0 }, b: { x: 4000, y: 0 } } }],
      },
    ],
  };

  const protokoll = await kosmoChatSkript(page, 'p0-demo-wand', skript, {
    nutzerTexte: ['Zeichne bitte eine Wand'],
  });

  expect(protokoll).toHaveLength(1);
  expect(protokoll[0]!.proposals).toBe(1); // ein Tool-Call → Einzel-Vorschlag (kein Paket)
  expect(protokoll[0]!.fehler).toBeUndefined();

  // ECHTER Weg: die Diff-Karte lief durch validateToolCall + applyDefaults
  // (storeyId/assemblyId aus dem App-Kontext, nicht aus dem Skript) und
  // wurde über denselben runCommand-Pfad wie ein Handgriff ausgeführt.
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length))
    .toBe(waendeVorher + 1);
});
