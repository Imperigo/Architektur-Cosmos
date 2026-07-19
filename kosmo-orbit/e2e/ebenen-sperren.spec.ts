import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * PA2-089 E2 (`docs/V089-SPEZ.md` §3 E2, §7 C-3/C-4) — CAD-Ebenen als
 * DXF-Interop + Sperren. Owner-Entscheid: NUR DXF-Interop + Sperrschutz,
 * KEIN Sichtbarkeits-Panel (Sanktion 4).
 *
 * **Ehrlicher Geltungsbereich (wichtig für's Lesen dieser Datei):** die
 * `locked`-Durchsetzung («Verschieben/Griff-Drag/Löschen greifen nicht»,
 * §7 C-3) läuft NUR über den Inspector-Interaktionspfad — Löschen via
 * `[data-testid="inspector-delete"]` und alle kind-spezifischen
 * Eigenschaftsfelder (`Inspector.tsx`, PA2-exklusiv). Canvas-Drag/
 * Griff-Ziehen (`DesignWorkspace.tsx` `onMoveStart`/`onGriffStart`) und
 * Tastatur-Löschen (`DesignWorkspace.tsx`-Keydown-Handler) sassen in
 * Cluster B und waren für das PA2-Paket TABU — der v0.8.9-Fable-Nachzug
 * hat die drei Guards (onMoveStart/onGriffStart/Delete via `istGesperrt`)
 * direkt danach eingelöst: Test (e) unten beweist Canvas-Drag- und
 * Delete-Tasten-Schutz Ende-zu-Ende (a–d stammen aus dem PA2-Paket).
 *
 * Muster: `flaechennachweis.spec.ts` (Download-Beweis über den
 * `window.__kosmo`-Testhook) + `griffe.spec.ts` (`weltZuBildschirm`/
 * `zeichneWand`/`waehle`-Helfer, Canvas-Klick-Beweis für Findbarkeit).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[]; summary: string };
      state: () => {
        doc: {
          get: (id: string) => { id: string; meta?: { locked?: boolean; layer?: string } } | undefined;
          byKind: (k: string) => Array<{ id: string }>;
        };
        selection: string[];
        select: (ids: string[]) => void;
        undo: () => void;
      };
      open: (s: string) => void;
    };
  }
}

async function starteManuell(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
}

/** Wörtlich aus `griffe.spec.ts` (Muster-Vorgabe des Dispatch). */
async function weltZuBildschirm(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ x, y }) => {
      const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
      const g = svg.querySelector('g') as SVGGElement;
      const pt = svg.createSVGPoint();
      pt.x = x;
      pt.y = -y;
      const transformed = pt.matrixTransform(g.getScreenCTM()!);
      return { x: transformed.x, y: transformed.y };
    },
    { x, y },
  );
}

async function zeichneWand(page: Page, a: { x: number; y: number }, b: { x: number; y: number }): Promise<string> {
  return page.evaluate(
    ({ a, b }) => {
      const k = window.__kosmo;
      const st = k.state() as unknown as { activeStoreyId: string; doc: { byKind: (k: string) => { id: string; name?: string }[] } };
      const aw = st.doc.byKind('assembly').find((x) => (x as unknown as { name?: string }).name?.startsWith('AW'))!;
      const r = k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a, b, assemblyId: aw.id });
      return r.patches[0]!.id;
    },
    { a, b },
  );
}

const auswahl = (page: Page) => page.evaluate(() => window.__kosmo.state().selection as string[]);
const waehle = (page: Page, ids: string[]) => page.evaluate((ids) => window.__kosmo.state().select(ids), ids);
const wandExistiert = (page: Page, id: string) =>
  page.evaluate((id) => !!window.__kosmo.state().doc.get(id), id);
const gesperrtStatus = (page: Page, id: string) =>
  page.evaluate((id) => window.__kosmo.state().doc.get(id)?.meta?.locked === true, id);
const layerStatus = (page: Page, id: string) =>
  page.evaluate((id) => window.__kosmo.state().doc.get(id)?.meta?.layer, id);

test('a) design.ebeneSetzen: DXF-Export trägt den Layer-Namen VOR der Semantik-Regel (String-Assertion)', async ({
  page,
}) => {
  await starteManuell(page);
  const wallId = await zeichneWand(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
  await page.evaluate(
    (wallId) => window.__kosmo.run('design.ebeneSetzen', { entityId: wallId, layer: 'ARCH-SPEZIAL' }),
    wallId,
  );
  expect(await layerStatus(page, wallId)).toBe('ARCH-SPEZIAL');

  // Modulwechsel Design → Publish über denselben Testhook wie die
  // Home-Zentrale (`window.__kosmo.open`, App.tsx `gehZu`/:551) — die
  // `module-publish`-Kachel selbst sitzt auf dem Home-Screen und ist aus
  // einem bereits offenen Modul (hier Design/2D) nicht klickbar. Die
  // Publish-„Manuell"-Oberfläche (Default, `publishOberflaeche` nicht
  // `'island'`) zeigt den DXF-Export-Knopf direkt im Kopf
  // (`PublishWorkspace.tsx:1018` `data-testid="export-dxf"`) — kein
  // Insel-Umweg nötig.
  await page.evaluate(() => window.__kosmo.open('publish'));

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="export-dxf"]'),
  ]);
  const pfad = await download.path();
  const dxf = readFileSync(pfad!, 'utf8');

  // Layer-Tabelle deklariert ARCH-SPEZIAL, die Wand-POLYLINE nutzt ihn
  // (Gruppencode 8) — DXF-String-Assertion wie packages/kosmo-kernel/test/
  // dxf-export.test.ts / dxf-layer-lock.test.ts.
  expect(dxf).toContain('2\nARCH-SPEZIAL\n');
  expect(dxf).toContain('8\nARCH-SPEZIAL\n');
});

test('b) sperren via Inspector: Löschen greift nicht (state()-Beweis), Element bleibt anwählbar, Inspector zeigt «gesperrt»', async ({
  page,
}) => {
  await starteManuell(page);
  const wallId = await zeichneWand(page, { x: 0, y: 0 }, { x: 6000, y: 0 });
  await waehle(page, [wallId]);
  await expect(page.locator('[data-testid="inspector"]')).toBeVisible();
  await expect(page.locator('[data-testid="inspector-sperren"]')).not.toBeChecked();
  await expect(page.locator('[data-testid="inspector-gesperrt-hinweis"]')).toHaveCount(0);

  // Sperren.
  await page.locator('[data-testid="inspector-sperren"]').check({ force: true });
  expect(await gesperrtStatus(page, wallId)).toBe(true);
  await expect(page.locator('[data-testid="inspector-sperren"]')).toBeChecked();
  await expect(page.locator('[data-testid="inspector-gesperrt-hinweis"]')).toBeVisible();
  await expect(page.locator('[data-testid="inspector-delete"]')).toBeDisabled();

  // Vollbild UND ein Ausschnitt exklusiv auf den Inspector-Sperr-Bereich
  // (der Inspector-Körper scrollt intern — `toBeVisible()` oben ist davon
  // unberührt, ein Mensch beim Sichten des Screenshots sähe ohne
  // `scrollIntoViewIfNeeded` aber nur die oberen Felder).
  await page.screenshot({ path: 'test-results/pa2-089-gesperrt-vollbild.png' });
  await page.locator('[data-testid="inspector-gesperrt-hinweis"]').scrollIntoViewIfNeeded();
  await page.locator('[data-testid="inspector"]').screenshot({ path: 'test-results/pa2-089-gesperrt-inspector.png' });

  // Löschversuch über den Inspector-Knopf (deaktiviert) — state()-Beweis:
  // die Wand bleibt exakt so vorhanden wie vorher (kein «Verschwinden»).
  await page.locator('[data-testid="inspector-delete"]').click({ force: true });
  expect(await wandExistiert(page, wallId)).toBe(true);

  // Sanktion 3: findbar bleibt findbar — Deselektieren + echter Klick auf
  // die Wand im Plan wählt sie wieder an (Beweis über den realen
  // pickEntityAt-Pfad, nicht nur über den direkten select()-Testhook).
  await waehle(page, []);
  const p = await weltZuBildschirm(page, 3000, 0);
  await page.mouse.click(p.x, p.y);
  expect(await auswahl(page)).toEqual([wallId]);
  await expect(page.locator('[data-testid="inspector-sperren"]')).toBeChecked();
});

test('c) entsperren via Inspector: Löschen wirkt wieder', async ({ page }) => {
  await starteManuell(page);
  const wallId = await zeichneWand(page, { x: 0, y: 0 }, { x: 6000, y: 0 });
  await page.evaluate((wallId) => window.__kosmo.run('design.sperren', { entityId: wallId, locked: true }), wallId);
  await waehle(page, [wallId]);
  await expect(page.locator('[data-testid="inspector-sperren"]')).toBeChecked();
  await expect(page.locator('[data-testid="inspector-delete"]')).toBeDisabled();

  // Entsperren.
  await page.locator('[data-testid="inspector-sperren"]').uncheck({ force: true });
  expect(await gesperrtStatus(page, wallId)).toBe(false);
  await expect(page.locator('[data-testid="inspector-gesperrt-hinweis"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="inspector-delete"]')).toBeEnabled();

  await page.locator('[data-testid="inspector-delete"]').click();
  expect(await wandExistiert(page, wallId)).toBe(false);
});

test('d) Undo-Kette: ebeneSetzen und sperren räumen bei Ctrl+Z sauber auf', async ({ page }) => {
  await starteManuell(page);
  const wallId = await zeichneWand(page, { x: 0, y: 0 }, { x: 6000, y: 0 });

  await page.evaluate(
    (wallId) => window.__kosmo.run('design.ebeneSetzen', { entityId: wallId, layer: 'ARCH-01' }),
    wallId,
  );
  expect(await layerStatus(page, wallId)).toBe('ARCH-01');
  await page.evaluate(() => window.__kosmo.state().undo());
  expect(await layerStatus(page, wallId)).toBeUndefined();

  await page.evaluate((wallId) => window.__kosmo.run('design.sperren', { entityId: wallId, locked: true }), wallId);
  expect(await gesperrtStatus(page, wallId)).toBe(true);
  await page.evaluate(() => window.__kosmo.state().undo());
  expect(await gesperrtStatus(page, wallId)).toBe(false);

  // Die Wand selbst ist von beiden Undo-Schritten unberührt geblieben.
  expect(await wandExistiert(page, wallId)).toBe(true);
});

test('e) Cluster-B-Nachzug (v0.8.9 Fable): Canvas-Drag und Delete-Taste greifen bei gesperrten Elementen nicht', async ({
  page,
}) => {
  await starteManuell(page);
  const wallId = await zeichneWand(page, { x: 1000, y: 1000 }, { x: 5000, y: 1000 });
  await page.evaluate((id) => window.__kosmo.run('design.sperren', { entityId: id, locked: true }), wallId);
  expect(await gesperrtStatus(page, wallId)).toBe(true);

  const geometrie = () =>
    page.evaluate((id) => {
      const e = window.__kosmo.state().doc.get(id) as unknown as {
        a?: { x: number; y: number };
        b?: { x: number; y: number };
      };
      return JSON.stringify({ a: e?.a ?? null, b: e?.b ?? null });
    }, wallId);
  const vor = await geometrie();

  // Klick (ohne Zug): Findbarkeit — gesperrt bleibt anwählbar (Sanktion 3).
  const mitte = await weltZuBildschirm(page, 3000, 1000);
  const ziel = await weltZuBildschirm(page, 3000, 4000);
  await page.mouse.click(mitte.x, mitte.y);
  await expect.poll(() => auswahl(page)).toEqual([wallId]);

  // Canvas-Drag: `onMoveStart` lehnt den Zug ab (`istGesperrt`-Guard) —
  // die Geometrie bleibt exakt. Der abgelehnte Move fällt in PlanView aufs
  // Gummiband zurück (dasselbe Bestandsverhalten wie bei nicht-beweglichen
  // Kinds, erster Lauf bewies es) — darum nach dem Drag KEINE
  // Auswahl-Assertion, nur der Geometrie-Beweis.
  await page.mouse.move(mitte.x, mitte.y);
  await page.mouse.down();
  await page.mouse.move(ziel.x, ziel.y, { steps: 5 });
  await page.mouse.up();
  expect(await geometrie()).toBe(vor);

  // Delete-Taste: erst wieder anwählen (das Gummiband oben ersetzte die
  // Auswahl), dann löschen — die gesperrte Wand überlebt und BLEIBT
  // ausgewählt (sichtbar, was stehen blieb — der Inspector zeigt «gesperrt»).
  await page.mouse.click(mitte.x, mitte.y);
  await expect.poll(() => auswahl(page)).toEqual([wallId]);
  await page.keyboard.press('Delete');
  expect(await wandExistiert(page, wallId)).toBe(true);
  await expect.poll(() => auswahl(page)).toEqual([wallId]);

  // Entsperren → derselbe Drag wirkt wieder (Gegenprobe).
  await page.evaluate((id) => window.__kosmo.run('design.sperren', { entityId: id, locked: false }), wallId);
  await page.mouse.move(mitte.x, mitte.y);
  await page.mouse.down();
  await page.mouse.move(ziel.x, ziel.y, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => geometrie()).not.toBe(vor);
});
