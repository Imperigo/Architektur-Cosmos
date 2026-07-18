import { expect, test, type Page } from '@playwright/test';

/**
 * v0.7.2 §8 (Paket 08, Stream W3-F) — CursorEbene: der eigene Zeiger.
 *
 * Hartvertrag (Spec §11): unter `navigator.webdriver` (== Playwright/
 * Chromium-Automation, immer `true` in dieser Suite) bleibt die Ebene PER
 * DEFAULT aus — die ~40 Bestands-Specs, die `module-design` direkt anklicken,
 * dürfen nie einen unsichtbaren System-Cursor (`cursor:none`) bekommen.
 * Diese Suite schaltet die Ebene darum GEZIELT über den dokumentierten
 * Test-Pfad `window.__kosmoCursor.aktivieren()` ein (siehe
 * `shell/CursorEbene.tsx` Kopfkommentar) — genau der von der Aufgabe
 * verlangte «Testpfad».
 */

async function geladen(page: Page, vorabLocalStorage?: Record<string, string>): Promise<void> {
  await page.goto('/');
  await page.evaluate((seed) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    for (const [k, v] of Object.entries(seed ?? {})) localStorage.setItem(k, v);
  }, vorabLocalStorage);
  await page.reload();
}

test.describe('Default-Sperre unter navigator.webdriver (Hartvertrag §11)', () => {
  test('ohne Test-Hook bleibt die Ebene aus — kein Layer, kein cursor:none', async ({ page }) => {
    await geladen(page);
    await expect(page.locator('[data-testid="cursor-ebene"]')).toHaveCount(0);
    const eigencursorAttr = await page.evaluate(() => document.documentElement.dataset.eigencursor);
    expect(eigencursorAttr).toBe('aus');
  });

  test('Test-Hook window.__kosmoCursor existiert immer (App-Mount), unabhängig vom Aktiv-Zustand', async ({
    page,
  }) => {
    await geladen(page);
    const hookVorhanden = await page.evaluate(
      () => typeof (window as unknown as { __kosmoCursor?: unknown }).__kosmoCursor === 'object',
    );
    expect(hookVorhanden).toBe(true);
  });
});

test.describe('Eingeschaltet über den Test-Pfad (window.__kosmoCursor.aktivieren())', () => {
  test('Layer erscheint, [data-eigencursor="an"] gesetzt, echter Cursor unsichtbar', async ({ page }) => {
    await geladen(page);
    await page.evaluate(() => (window as unknown as { __kosmoCursor: { aktivieren: () => void } }).__kosmoCursor.aktivieren());
    await expect(page.locator('[data-testid="cursor-ebene"]')).toBeAttached();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.eigencursor)).toBe('an');
    const cursorStil = await page.evaluate(() => getComputedStyle(document.documentElement).cursor);
    expect(cursorStil).toBe('none');
  });

  test('Mausbewegung positioniert den Wrapper (translate3d folgt dem Zeiger)', async ({ page }) => {
    await geladen(page);
    await page.evaluate(() => (window as unknown as { __kosmoCursor: { aktivieren: () => void } }).__kosmoCursor.aktivieren());
    const wrapper = page.locator('[data-testid="cursor-ebene"]');
    await page.mouse.move(300, 200);
    await expect.poll(() => wrapper.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none');
    const transformBei300 = await wrapper.evaluate((el) => getComputedStyle(el).transform);
    await page.mouse.move(500, 400);
    await expect.poll(() => wrapper.evaluate((el) => getComputedStyle(el).transform)).not.toBe(transformBei300);
  });
});

test.describe('Opt-out: kosmo.eigencursor = "0" gewinnt IMMER (Spec §8)', () => {
  test('bleibt aus, selbst wenn der Test-Hook den webdriver-Riegel umgeht', async ({ page }) => {
    await geladen(page, { 'kosmo.eigencursor': '0' });
    await page.evaluate(() => (window as unknown as { __kosmoCursor: { aktivieren: () => void } }).__kosmoCursor.aktivieren());
    await expect(page.locator('[data-testid="cursor-ebene"]')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.eigencursor)).toBe('aus');
    const cursorStil = await page.evaluate(() => getComputedStyle(document.documentElement).cursor);
    expect(cursorStil).not.toBe('none');
  });
});

test.describe('Input-Ausnahme (Spec §8: Inputs/Textarea/Select/contenteditable)', () => {
  test('über einem Input versteckt sich die Ebene (Opacity 0), cursor bleibt auto', async ({ page }) => {
    await geladen(page);
    await page.evaluate(() => (window as unknown as { __kosmoCursor: { aktivieren: () => void } }).__kosmoCursor.aktivieren());
    // `projekt-neu-name` (Zentrale) ist ein einfaches <input> ohne Sonderfall.
    const input = page.locator('[data-testid="projekt-neu-name"]');
    await expect(input).toBeVisible();
    const box = await input.boundingBox();
    if (!box) throw new Error('Input hat keine BoundingBox');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const wrapper = page.locator('[data-testid="cursor-ebene"]');
    await expect.poll(() => wrapper.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    const inputCursor = await input.evaluate((el) => getComputedStyle(el).cursor);
    expect(inputCursor).toBe('auto');
  });
});

test.describe('reduced-motion: Morph/Rotor strukturell statisch (Spec §0/§8)', () => {
  test('Rotor-Transition und Morph-Keyframes sind auf 0.01ms gekürzt', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await geladen(page);
    await page.evaluate(() => (window as unknown as { __kosmoCursor: { aktivieren: () => void } }).__kosmoCursor.aktivieren());
    const rotor = page.locator('.cursor-ebene-rotor');
    await expect(rotor).toBeAttached();
    const transitionDuration = await rotor.evaluate((el) => getComputedStyle(el).transitionDuration);
    // Chromium meldet `getComputedStyle().transitionDuration` für 0.01ms als
    // "1e-05s" (wissenschaftliche Schreibweise in Sekunden) — praktisch
    // unsichtbar/synchron, der eigentliche Beweis für den globalen
    // aura.css-Riegel. Ein numerischer Vergleich ist robuster als exakte
    // String-Varianten verschiedener Engines/Rundungen.
    const sekunden = Number.parseFloat(transitionDuration);
    expect(sekunden).toBeLessThan(0.001);
  });
});

/**
 * v0.8.4 PA1 (D1-Fix, docs/V084-SPEZ.md §2 D1): `data-cursor-zone="praezision"`
 * bleibt die einzige explizite Zonen-Attribut-Zusage (PlanView/SketchOverlay,
 * W4-H). Der frühere zweite Wert `"eigen"` (NodeCanvas) hatte VOR diesem
 * Fix die Sonderbedeutung "Layer komplett aus" — genau die D1-Heuristik, die
 * dieses Paket ersetzt (s. `CursorEbene.tsx` Kopfkommentar). `eigen` wird
 * seither NICHT mehr ausgelesen; der frühere Test dazu ("versteckt
 * komplett") ist ERSETZT durch die Zustands-Matrix-Suite direkt darunter
 * ("Zone → Form sichtbar", nicht mehr "Zone → Layer aus").
 */
test.describe('Cursor-Zonen (Spec §8, W4-H: data-cursor-zone="praezision")', () => {
  test('praezision-Zone (PlanView) trägt das Attribut, morpht auf das Fadenkreuz, Ebene bleibt sichtbar', async ({
    page,
  }) => {
    await geladen(page);
    await page.evaluate(() => (window as unknown as { __kosmoCursor: { aktivieren: () => void } }).__kosmoCursor.aktivieren());
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="view-2d"]');

    const plan = page.locator('[data-testid="planview"]');
    await expect(plan).toHaveAttribute('data-cursor-zone', 'praezision');

    const box = await plan.boundingBox();
    if (!box) throw new Error('PlanView hat keine BoundingBox');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    // Fadenkreuz-Morph (Spec §8: "precision Fadenkreuz") — eigener SVG-Klassenname.
    await expect(page.locator('.cursor-ebene-precision')).toBeAttached();
    // v0.8.4 PA1 (D1-Fix): die Ebene darf HIER — wie überall ausserhalb von
    // Eingabefeldern — nie verschwinden.
    const wrapper = page.locator('[data-testid="cursor-ebene"]');
    await expect(wrapper).not.toHaveClass(/cursor-ebene--versteckt/);
  });
});

/**
 * v0.8.4 PA1 (D1-Fix, docs/V084-SPEZ.md §2 D1 + §3, §7 Sanktion #7 "keine
 * Zone versteckt die Ebene mehr"): die Zustands-Matrix Zone → Form.
 * `CursorEbene.tsx` liest den COMPUTED `cursor` der Elementkette unter dem
 * Zeiger (`formVonComputedCursor`, `state/cursor-zustand.ts`) und zeigt
 * statt des Systemzeigers immer eine EIGENE Form — ERSETZT die alte "Layer
 * aus"-Heuristik (D1: `CursorEbene.tsx:80-88`), nicht nur überlagert. Drei
 * repräsentative, real im Produktcode gestylte Zonen:
 *  - vis-canvas (Node-Port-Hitkreis, `.vis-node-port-hit { cursor:
 *    crosshair }`, `vis-visual.css:213`) → Form `fadenkreuz`
 *  - dock-splitter (`.k-dock-splitter[data-art="col-left"] { cursor:
 *    col-resize }`, `dock-flaeche.css:349`) → Form `spalte`
 *  - dock-drag (Panel-Kopf-Ziehgriff, `.k-dock-panel-kopf { cursor: grab }`,
 *    `dock-flaeche.css:143`) → Form `greifen`
 * Die übrigen drei Formen (`greift`/`zeile`/`gesperrt`, aus grabbing/
 * row-resize/not-allowed) sind PUR — ohne Browser/DOM — in
 * `test/cursor-zustand.test.ts` bewiesen (`formVonComputedCursor`); diese
 * Suite hier deckt die drei Zonen ab, in denen ein echter Browser
 * tatsächlich über ein echtes, im Produktcode gestyltes Element fährt.
 */
test.describe('Zustands-Matrix: Zonen-Formen aus computed-cursor (v0.8.4 PA1, D1-Fix)', () => {
  async function aktiviert(page: Page): Promise<void> {
    await page.evaluate(() => (window as unknown as { __kosmoCursor: { aktivieren: () => void } }).__kosmoCursor.aktivieren());
  }

  test('vis-canvas: Node-Port-Hitkreis (crosshair) zeigt die Fadenkreuz-Form, Ebene bleibt sichtbar', async ({
    page,
  }) => {
    await geladen(page);
    await aktiviert(page);
    await page.click('[data-testid="module-vis"]');
    await page.click('[data-testid="graph-neu"]');
    // Direkter Kernel-Weg (Muster `e2e/vis-editor.spec.ts` `knotenSetzen`) —
    // ein Node mit Ports ist die kürzeste, deterministische Route zu einer
    // ECHTEN `cursor: crosshair`-Zone (`.vis-node-port-hit`).
    await page.evaluate(() => {
      const k = (
        window as unknown as {
          __kosmo: {
            run: (id: string, p: unknown) => unknown;
            state: () => { doc: { byKind: (k: string) => Array<{ id: string }> } };
          };
        }
      ).__kosmo;
      const graph = k.state().doc.byKind('visgraph')[0]!;
      k.run('vis.nodeSetzen', { graphId: graph.id, typ: 'prompt', x: 100, y: 100 });
    });

    const port = page.locator('[data-testid="port-out-prompt"]');
    await expect(port).toBeVisible();
    const box = await port.boundingBox();
    if (!box) throw new Error('Node-Port hat keine BoundingBox');
    // Der sichtbare Port-Punkt (`data-testid`) und sein grösserer transparenter
    // Hitkreis (`.vis-node-port-hit`, `cursor: crosshair`) teilen dasselbe
    // Zentrum (`NodeCanvas.tsx`) — der Hitkreis liegt im DOM DANACH, also
    // oben; die Bildmitte trifft ihn.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    await expect(page.locator('.cursor-ebene-fadenkreuz')).toBeAttached();
    const wrapper = page.locator('[data-testid="cursor-ebene"]');
    await expect(wrapper).not.toHaveClass(/cursor-ebene--versteckt/);
    await page.screenshot({ path: 'e2e-results/pa1-084-fadenkreuz.png' });
  });

  test('dock-splitter: Spalten-Splitter (col-resize) zeigt die Spalte-Form, Ebene bleibt sichtbar', async ({
    page,
  }) => {
    await geladen(page);
    await aktiviert(page);
    await page.click('[data-testid="load-tkb"]');
    await expect(page.locator('[data-testid="dock-panel-kennzahlen"]')).toBeVisible();
    await page.click('[data-testid="kv-oeffnen"]');

    const splitter = page.locator('[data-testid="dock-splitter-spL"]');
    await expect(splitter).toBeVisible();
    const box = await splitter.boundingBox();
    if (!box) throw new Error('Dock-Splitter hat keine BoundingBox');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    await expect(page.locator('.cursor-ebene-spalte')).toBeAttached();
    const wrapper = page.locator('[data-testid="cursor-ebene"]');
    await expect(wrapper).not.toHaveClass(/cursor-ebene--versteckt/);
    await page.screenshot({ path: 'e2e-results/pa1-084-spalte.png' });
  });

  test('dock-drag: Panel-Kopf-Ziehgriff (grab) zeigt die Greifen-Form, Ebene bleibt sichtbar', async ({ page }) => {
    await geladen(page);
    await aktiviert(page);
    await page.click('[data-testid="load-tkb"]');
    const panel = page.locator('[data-testid="dock-panel-kennzahlen"]');
    await expect(panel).toBeVisible();

    // 20px vom linken Rand — garantiert kein Knopf (die sitzen rechts, Muster
    // `kopfGriff()` in `e2e/dock-interaktion.spec.ts`).
    const kopf = panel.locator('.k-dock-panel-kopf');
    const box = await kopf.boundingBox();
    if (!box) throw new Error('Dock-Panel-Kopf hat keine BoundingBox');
    await page.mouse.move(box.x + 20, box.y + box.height / 2);

    await expect(page.locator('.cursor-ebene-greifen')).toBeAttached();
    const wrapper = page.locator('[data-testid="cursor-ebene"]');
    await expect(wrapper).not.toHaveClass(/cursor-ebene--versteckt/);
    await page.screenshot({ path: 'e2e-results/pa1-084-greifen.png' });
  });
});

/**
 * pointer:fine-Gate (Spec §8: "Default AN nur bei pointer:fine"): Playwright
 * emuliert in dieser Chromium-Version **immer** `pointer:fine` — es gibt
 * keinen `page.emulateMedia`-Hebel für `pointer`/`hover` (nur
 * `reducedMotion`/`colorScheme`/`forcedColors`). Ein `hasTouch`-Browser-
 * Kontext ändert die Touch-Fähigkeit, spiegelt aber nicht zuverlässig auf
 * `matchMedia('(pointer: coarse)')` in Headless-Chromium (mit SwiftShader),
 * wie der Vorab-Check unten zeigt — darum bricht dieser Test bewusst ab
 * (`test.skip`), statt einen falschen grünen Haken vorzutäuschen. Die
 * eigentliche Regel («ohne gespeicherten Wert entscheidet `pointer:fine`»)
 * ist stattdessen in `test/cursor-zustand.test.ts` (Vitest, `matchMedia`
 * gemockt) hart geprüft — DAS ist hier die massgebliche, verlässliche
 * Absicherung. Ehrliche Grenze, wie von der Aufgabe verlangt.
 */
test.describe('pointer:fine-Gate — Grenze dieser E2E-Suite', () => {
  test('coarse-pointer lässt sich in dieser Chromium/Playwright-Kombination nicht zuverlässig emulieren', async ({
    browser,
  }) => {
    const kontext = await browser.newContext({ hasTouch: true, isMobile: true });
    const seite = await kontext.newPage();
    await seite.goto('/');
    const istCoarse = await seite.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
    await kontext.close();
    test.skip(
      !istCoarse,
      'hasTouch:true spiegelt in dieser Umgebung nicht auf matchMedia("(pointer: coarse)") — ' +
        'dokumentierte Grenze, siehe Kopfkommentar. Die Default-AN-nur-bei-pointer:fine-Regel ' +
        'ist stattdessen per Vitest (gemocktes matchMedia) hart abgesichert.',
    );
    expect(istCoarse).toBe(true);
  });
});
