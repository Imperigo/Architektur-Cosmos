import { expect, test, type Page } from '@playwright/test';

/**
 * K20 (Owner wörtlich, `docs/OWNER-KORREKTUREN-2026-07.md` S.6: «auch bei
 * der kosmo darstellung sollte der 3d viewer der hintergrund weiss sein,
 * nicht schwarz bitte») — Beweis, dass der 3D-Himmel des Viewports nicht
 * mehr das alte `orbit`-Schwarz (`#101012`) trägt.
 *
 * Der `orbit`-Override von `--k-viewport-sky` ist in `aura.css` ersatzlos
 * entfernt worden (s. Kommentar dort) — BEIDE Themes fallen jetzt auf den
 * gemeinsamen `:root`-Wert `#edeae2` zurück. `Viewport3D.tsx:813` liest den
 * Wert zur Laufzeit per `getComputedStyle(...).getPropertyValue(
 * '--k-viewport-sky')` — genau DAS ist der Laufzeitweg, den Test (a) prüft.
 *
 * Test (b) ist bewusst KEINE Pixel-/Helligkeits-Assertion: im Repo existiert
 * keine PNG-Dekodier-Hilfe (grep `e2e/` nach `pngjs`/`sharp` — kein Treffer),
 * und Playwright-Screenshot-Vergleiche (`toMatchSnapshot`) sind für einen
 * einzelnen Owner-Sichtbeweis wie hier bewusst vermieden (Flake-Risiko bei
 * three.js-Antialiasing/Schatten, kein Grafik-Regressions-Bedarf für DIESES
 * Paket). (b) legt darum nur einen benannten Beweis-Screenshot für die
 * Fable-Sichtung ab und beweist zusätzlich (per DOM), dass 2D-Planblatt
 * (`--k-plan-paper #fdfcf9`) und 3D-Himmel (`--k-viewport-sky #edeae2`)
 * weiterhin ZWEI unterschiedliche Werte sind — das Planblatt bleibt vom
 * hellen 3D-Himmel unterscheidbar (keine schwache Pseudo-Assertion auf
 * Pixelfarben, die hier nichts beweisen könnte).
 *
 * Wand-Erzeugung 1:1 aus `e2e/viewport3d-auswahl.spec.ts` übernommen
 * (`zeichneWand`-Muster): reines `module-design` liefert nur leere EG/OG-
 * Geschosse OHNE Geometrie («Keine Fläche» im Kennzahlen-Panel) — für einen
 * Owner-tauglichen Sicht-Beweis («Geometrie sichtbar») zeichnet dieser Test
 * zwei echte Wände über den bestehenden `design.wandZeichnen`-Command, bei
 * (0,0)-(6000,0) und (0,0)-(0,6000). Bewusst KEINE eigene Kamera gesetzt:
 * die Wände liegen nahe dem Ursprung, direkt im Sichtfeld der Viewport3D-
 * DEFAULT-Kamera (`controls.setLookAt(18,14,18,4,0,-4)`, Viewport3D.tsx
 * ~Z.817) — geprüft per Probe-Screenshot, byte-identisch reproduzierbar.
 */

async function starteDesignMitModell(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG (Beispielprojekt)
}

async function zeichneWand(page: Page, a: { x: number; y: number }, b: { x: number; y: number }): Promise<void> {
  await page.evaluate(
    ({ a, b }) => {
      const k = window.__kosmo;
      const st = k.state();
      const aw = st.doc.byKind('assembly').find((x) => x.name?.startsWith('AW'))!;
      k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a, b, assemblyId: aw.id });
    },
    { a, b },
  );
}

test('K20 (a): --k-viewport-sky löst im Standard-Theme (orbit) auf #edeae2 auf, nicht mehr #101012', async ({ page }) => {
  await starteDesignMitModell(page);

  // Standard-Theme ist `orbit` (kein Theme-Wechsel nötig) — s.
  // `App.tsx:502`/`Companion.tsx:330` (`gespeichert ?? 'orbit'`).
  const theme = await page.evaluate(() => document.documentElement.dataset['theme']);
  expect(theme).toBe('orbit');

  const himmel = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--k-viewport-sky').trim(),
  );
  expect(himmel).toBe('#edeae2');
  expect(himmel).not.toBe('#101012'); // das vom Owner bemängelte alte Schwarz
});

test('K20 (b): 3D-Ansicht mit Modell auf hellem Himmel — Beweis-Screenshot, Planblatt bleibt vom Himmel unterscheidbar', async ({ page }) => {
  await starteDesignMitModell(page);
  await zeichneWand(page, { x: 0, y: 0 }, { x: 6000, y: 0 });
  await zeichneWand(page, { x: 0, y: 0 }, { x: 0, y: 6000 });

  await page.click('[data-testid="view-3d"]');
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.waitForFunction(() => !!window.__kosmoViewport);
  // wartetEchteZeit: 800ms VOR dem `renderOnce()`-Aufruf, nicht danach —
  // reine Wanduhrzeit, kein Zustands-Poll möglich (der Mesh-Sync-Pfad läuft
  // nicht synchron mit `entityMeshCount()`; ein Poll darauf liefert 2, BEVOR
  // die Wand-Geometrie selbst fertig aufgebaut ist — Befund dieses Pakets,
  // reproduzierbar per Probe-Skript). Nach dieser Wartezeit rendert EIN
  // `renderOnce()` den fertigen Frame, `page.screenshot()` folgt sofort
  // (Muster bewiesen: mehrere Probe-Läufe, Wände immer sichtbar).
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__kosmoViewport?.renderOnce?.());

  await page.screenshot({ path: 'e2e-results/k20-viewport-himmel-3d.png' });

  // Planblatt (`--k-plan-paper`) und 3D-Himmel (`--k-viewport-sky`) bleiben
  // ZWEI unterschiedliche Token-Werte — die K20-Korrektur vereinheitlicht
  // NUR den Himmel über beide Themes, nicht Himmel und Planblatt.
  const [himmel, planPapier] = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return [cs.getPropertyValue('--k-viewport-sky').trim(), cs.getPropertyValue('--k-plan-paper').trim()];
  });
  expect(himmel).toBe('#edeae2');
  expect(planPapier).toBe('#fdfcf9');
  expect(himmel).not.toBe(planPapier);
});

test('K20 (c): 2D-Grundriss bleibt vom hellen 3D-Himmel-Token unbeeinflusst — Beweis-Screenshot', async ({ page }) => {
  await starteDesignMitModell(page);

  await page.click('[data-testid="view-2d"]');
  await expect(page.locator('svg').first()).toBeVisible();
  await page.screenshot({ path: 'e2e-results/k20-viewport-himmel-2d-plan.png' });
});

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        doc: {
          byKind: (k: string) => { id: string; name?: string }[];
        };
      };
    };
    __kosmoViewport?: {
      renderOnce: () => void;
    };
  }
}
