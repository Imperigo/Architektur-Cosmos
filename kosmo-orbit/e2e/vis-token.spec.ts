import { expect, test, type Page } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * PA4-088 (`docs/V088-SPEZ.md` §2 D7/§3 E-Zeile, §7 C-10) — Token-Brücke Vis:
 * `NodeCanvas.tsx`s `PORT_FARBE` und `island/inhalte/stimmung.tsx`s
 * Gradient-Hex kommen jetzt aus `aura.css` (`--k-port-*`/`--k-stimmung-*`).
 * Diese Spec MISST (nicht behauptet), dass ein Token-Override die
 * gerenderte Portfarbe (SVG `fill`, `var()`-nativ, D7-Beweis) UND den
 * gezeichneten Stimmungs-Canvas-Pixel (echtes 2D-`CanvasRenderingContext2D`,
 * `cssVar()`-Read beim Mount) tatsächlich ändert — Muster «temporäres
 * Setzen der CSS-Property + Neuzeichnen».
 *
 * Test 1+2 laufen im globalen Manuell-Seed (`playwright.config.ts`,
 * `e2e/helpers/manuell-seed.ts`) wie `visgraph.spec.ts` — dieselbe
 * Node-Canvas-Chrome, kein Extra-Setup. Test 3 (Stimmung-Insel) setzt den
 * globalen Seed wie `vis-island.spec.ts` bewusst ausser Kraft (leerer
 * Kontext), weil die STIMMUNG-Insel nur im Island-Modus lebt — UND setzt
 * das Token-Override über `page.addInitScript` VOR jeder Navigation (der
 * Canvas zeichnet nur EINMAL beim Mount, s. `stimmung.tsx`-Kopfkommentar —
 * ein Override NACH dem Mount würde nie sichtbar).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
    };
  }
}

test.describe('PA4-088 — Port-Farbe folgt dem Token (SVG, manuell)', () => {
  test('Port-Kreis-fill (Ausgang) wechselt sofort nach --k-port-prompt-Override, ohne Reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.click('[data-testid="module-vis"]');
    await page.click('[data-testid="graph-neu"]');
    await waehleOption(page, 'node-hinzu', 'prompt');

    const promptNode = page.locator('[data-testid="vis-node-prompt"]');
    await expect(promptNode).toBeVisible();
    const port = promptNode.locator('[data-testid="port-out-prompt"]');
    await expect(port).toBeVisible();

    const vorher = await port.evaluate((el) => getComputedStyle(el).fill);
    // Sanity: die Sonde-Farbe ist nicht zufällig schon der Default-Wert
    // (--k-port-prompt = #1e6b47 = rgb(30, 107, 71) in BEIDEN Themes, s.
    // aura.css-Kommentar «theme-invariant»).
    expect(vorher).toBe('rgb(30, 107, 71)');

    await page.evaluate(() => {
      document.documentElement.style.setProperty('--k-port-prompt', '#ff00ff');
    });
    const nachher = await port.evaluate((el) => getComputedStyle(el).fill);
    expect(nachher).toBe('rgb(255, 0, 255)');
    expect(nachher).not.toBe(vorher);
  });

  test('Legende-Punkt (--_farbe-Durchreichung) wechselt sofort nach --k-port-prompt-Override', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.click('[data-testid="module-vis"]');
    await page.click('[data-testid="graph-neu"]');
    await waehleOption(page, 'node-hinzu', 'prompt');
    await expect(page.locator('[data-testid="vis-node-prompt"]')).toBeVisible();

    // Legende (`vis-legende`, DockFlaeche-Panel) zeigt eine Zeile je im
    // Graphen vorkommendem Porttyp — der frische Graph hat genau EINEN
    // Node (prompt), dessen Ausgang vom Typ `prompt` ist.
    const punkt = page.locator('[data-testid="vis-legende"] .vis-legende-zeile', { hasText: 'Prompt' }).locator('.vis-legende-punkt');
    await expect(punkt).toBeVisible();

    const vorher = await punkt.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(vorher).toBe('rgb(30, 107, 71)');

    await page.evaluate(() => document.documentElement.style.setProperty('--k-port-prompt', '#ff00ff'));
    const nachher = await punkt.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(nachher).toBe('rgb(255, 0, 255)');
    expect(nachher).not.toBe(vorher);
  });
});

test.describe('PA4-088 — Stimmungs-Canvas-Pixel folgt dem Token (2D-Canvas, cssVar())', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  async function oeffneStimmungIsland(page: Page): Promise<void> {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.reload();
    await page.click('[data-testid="module-vis"]');
    await page.hover('[data-testid="island-stimmung-root"]');
    await expect(page.locator('[data-testid="island-stimmung-leiste"]')).toBeVisible();
    await page.click('[data-testid="island-werkzeug-stimmung"]');
    await expect(page.locator('[data-testid="island-stimmung-stufe2"]')).toBeVisible();
  }

  /** Liest den GANZ obersten Canvas-Pixel (Zeile 0) der «morgen»-Kachel —
   * praktisch Farbstopp 0 des vertikalen Gradienten (`--k-stimmung-morgen-a`,
   * aura.css). NICHT byte-exakt vergleichbar: Canvas sampelt Gradienten am
   * PIXEL-MITTELPUNKT (Zeile 0 liegt bei y=0.5 von 44px Höhe), darum ist
   * selbst Zeile 0 bereits ~1 % Richtung Stopp 0.55 (`-b`) gemischt — Zeile 1
   * lag im ersten Anlauf dieser Probe schon messbar weiter weg (Owner-Lehre:
   * erst nachmessen, dann urteilen). `NAHE()` unten toleriert genau dieses
   * Sub-Pixel-Sampling, bleibt aber eng genug, um jede ECHTE Farbe (Default
   * vs. Sonde) sicher zu unterscheiden. */
  async function obererPixelMorgen(page: Page): Promise<[number, number, number, number]> {
    const kachel = page.locator('[data-testid="island-stimmung-morgen"] canvas');
    await expect(kachel).toBeVisible();
    return kachel.evaluate((el) => {
      const canvas = el as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const d = ctx.getImageData(1, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3]] as [number, number, number, number];
    });
  }

  /** Toleranz-Vergleich für den Sub-Pixel-Gradientenversatz (s.o.) — max. 6
   * Werte je Kanal, weit unter dem Abstand zwischen Default- und Sonde-Farbe
   * (>100 je Kanal in beiden Tests unten). */
  function nahe(ist: readonly number[], soll: readonly number[]): void {
    for (let i = 0; i < soll.length; i++) {
      expect(Math.abs(ist[i]! - soll[i]!), `Kanal ${i}: ${ist[i]} vs. erwartet ~${soll[i]}`).toBeLessThanOrEqual(6);
    }
  }

  /** Registriert das CSS-Property-Override VOR jedem Skript der Seite — der
   * Canvas zeichnet nur EINMAL beim Mount (`zeichneVorschau`, kein
   * Redraw-Takt), `cssVar()` muss den neuen Wert also schon beim allerersten
   * Effekt-Lauf lesen. `document.documentElement` ist im allerfrühesten
   * Injektions-Moment von Playwrights `addInitScript` nachweislich noch
   * `null` (gemessen: ein direkter Zugriff wirft `TypeError`, BEIDE
   * Navigationen dieser Seite betroffen) — der Retry über `setTimeout(0)`
   * wartet exakt einen Tick, bis der HTML-Parser die Wurzel eingehängt hat,
   * garantiert lange vor dem ersten React-Commit. */
  async function ueberschreibeVorMount(page: Page, name: string, wert: string): Promise<void> {
    await page.addInitScript(
      ({ name, wert }) => {
        const setzen = () => {
          if (document.documentElement) {
            document.documentElement.style.setProperty(name, wert);
          } else {
            setTimeout(setzen, 0);
          }
        };
        setzen();
      },
      { name, wert },
    );
  }

  test('ohne Override zeigt der oberste Pixel den Default-Ton (--k-stimmung-morgen-a = #5c7fa8)', async ({ page }) => {
    await oeffneStimmungIsland(page);
    const [r, g, b] = await obererPixelMorgen(page);
    nahe([r, g, b], [0x5c, 0x7f, 0xa8]);
  });

  test('mit Override (VOR dem Mount gesetzt) zeigt der oberste Pixel die Sonde-Farbe', async ({ page }) => {
    await ueberschreibeVorMount(page, '--k-stimmung-morgen-a', '#00ff00');
    await oeffneStimmungIsland(page);
    const [r, g, b] = await obererPixelMorgen(page);
    nahe([r, g, b], [0x00, 0xff, 0x00]);
    // Der reale Abstand zum Default ist riesig (>100 je Kanal) — kein
    // Toleranz-Grenzfall.
    expect(Math.abs(r - 0x5c) + Math.abs(g - 0x7f) + Math.abs(b - 0xa8)).toBeGreaterThan(100);
  });
});
