import { expect, test, type Page } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';
import { visManuellStorageState } from './helpers/manuell-seed';

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
 * Test 3 (Stimmung-Insel) setzt den globalen Seed wie `vis-island.spec.ts`
 * bewusst ausser Kraft (leerer Kontext), weil die STIMMUNG-Insel nur im
 * Island-Modus lebt — UND setzt das Token-Override über `page.addInitScript`
 * VOR jeder Navigation (der Canvas zeichnet nur EINMAL beim Mount, s.
 * `stimmung.tsx`-Kopfkommentar — ein Override NACH dem Mount würde nie
 * sichtbar).
 *
 * v0.8.10 / P-B1 (`docs/V0810-SPEZ.md` §2 E2, Matrix C-4/C-5): NUR die zwei
 * Setup-Tests «Port-Kreis-fill» und «Theme-Flip» wechseln auf Island-
 * Bootstrap (`test.use({ storageState: { cookies: [], origins: [] } })`,
 * eigenes verschachteltes `test.describe` — Muster `e2e/blender-bridge.
 * spec.ts:49`); sie brauchen nur EINEN `prompt`-Node (GRAPH-Insel-Palette,
 * `visisl-graph-erstellen` + `island-palette-eintrag-prompt`) und prüfen
 * danach ausschliesslich die Node-Ebene (`port-out-prompt`, unverändert).
 * «Legende-Punkt» bleibt UNMIGRIERT auf Manuell — die Legende (`vis-legende`,
 * DockFlaeche-Panel) ist NUR `!islandModus` gerendert (`NodeCanvas.tsx`) und
 * hatte zum Migrationszeitpunkt KEIN Insel-Äquivalent — die Spec blieb
 * darum teilmigriert. (Stand heute: v0.8.11 E4 hat der ANSICHT-Insel eine
 * eigene Legende gegeben; K35 hat die Minimap überall entfernt — beides
 * ändert an dieser Manuell-Spec nichts.)
 * Theme-Sanity-Werte (rgb(39,140,93) orbit) bleiben gültig — Island ändert
 * das Theme nicht.
 *
 * v0.8.10 E3-Nachtrag (Owner-Entscheid 20.07.2026, `docs/V0810-SPEZ.md` §2
 * E3 Punkt 6, Matrix C-6/C-7): die Legende ist genau eine der vier Manuell-
 * only-Funktionen ohne Insel-Äquivalent, die den Nachtrag ausgelöst haben
 * (P-B1-Audit). Der globale `kosmo.ui.v1`-Seed verliert sein
 * `visOberflaeche`-Feld (Seed-Flip) — NUR das Legende-`describe` unten
 * bekommt darum einen eigenen `test.use({ storageState:
 * visManuellStorageState() })`-Kopf (Muster `e2e/helpers/manuell-seed.ts`);
 * die zwei Island-Setup-Tests oben und der Stimmungs-Canvas-Test unten
 * bleiben unverändert bei ihrem je eigenen leeren Kontext.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
    };
  }
}

test.describe('PA4-088 — Port-Farbe folgt dem Token (SVG, Island-Bootstrap)', () => {
  // v0.8.10 / P-B1: nur diese zwei Setup-Tests wechseln auf Island (s.
  // Datei-Kopf) — eigener leerer Kontext, Muster `e2e/blender-bridge.
  // spec.ts:49`.
  test.use({ storageState: { cookies: [], origins: [] } });

  /** Muster `e2e/blender-bridge.spec.ts`s `oeffneVisWerkzeug`. */
  async function oeffneVisWerkzeug(page: Page, island: string, werkzeugId: string): Promise<void> {
    await page.hover(`[data-testid="island-${island}-root"]`);
    await expect(page.locator(`[data-testid="island-werkzeug-${werkzeugId}"]`)).toBeVisible();
    await page.click(`[data-testid="island-werkzeug-${werkzeugId}"]`);
  }

  test('Port-Kreis-fill (Ausgang) wechselt sofort nach --k-port-prompt-Override, ohne Reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.click('[data-testid="module-vis"]');
    await oeffneVisWerkzeug(page, 'graph', 'palette');
    await page.click('[data-testid="visisl-graph-erstellen"]');
    await oeffneVisWerkzeug(page, 'graph', 'palette');
    await page.click('[data-testid="island-palette-eintrag-prompt"]');

    const promptNode = page.locator('[data-testid="vis-node-prompt"]');
    await expect(promptNode).toBeVisible();
    const port = promptNode.locator('[data-testid="port-out-prompt"]');
    await expect(port).toBeVisible();

    const vorher = await port.evaluate((el) => getComputedStyle(el).fill);
    // Sanity: die Sonde-Farbe ist nicht zufällig schon der Default-Wert.
    // Seit v0.8.9 E6 (Owner-Wahl «K2 Ausgewogen») ist --k-port-prompt
    // theme-abhängig: der E2E-Default ist das orbit-Theme → #278c5d =
    // rgb(39, 140, 93) (aura.css `[data-theme='orbit']`-Override; Papier
    // behält #1e6b47, s. Theme-Flip-Test unten).
    expect(vorher).toBe('rgb(39, 140, 93)');

    await page.evaluate(() => {
      document.documentElement.style.setProperty('--k-port-prompt', '#ff00ff');
    });
    const nachher = await port.evaluate((el) => getComputedStyle(el).fill);
    expect(nachher).toBe('rgb(255, 0, 255)');
    expect(nachher).not.toBe(vorher);
  });

  // v0.8.9 E6 (Owner-Wahl «K2 Ausgewogen», 19.07.2026): die Port-Tokens
  // sind NICHT mehr theme-invariant — orbit hebt fünf der sechs Werte auf
  // ein ≥4.6:1-Kontrastband, Papier behält die Basiswerte. Dieser Test
  // MISST den Flip am gerenderten Port (kein reiner Token-Read): dasselbe
  // `data-theme`-Attribut, das App.tsx setzt, wird direkt umgeschaltet —
  // die SVG-fill folgt ohne Reload, weil der `var()`-Kanal (D7) den
  // aktuellen Kaskadenwert liest.
  test('Theme-Flip orbit→paper wechselt die Portfarbe auf den Basiswert (E6-Override)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.click('[data-testid="module-vis"]');
    await oeffneVisWerkzeug(page, 'graph', 'palette');
    await page.click('[data-testid="visisl-graph-erstellen"]');
    await oeffneVisWerkzeug(page, 'graph', 'palette');
    await page.click('[data-testid="island-palette-eintrag-prompt"]');
    const port = page.locator('[data-testid="vis-node-prompt"]').locator('[data-testid="port-out-prompt"]');
    await expect(port).toBeVisible();

    // orbit (E2E-Default): K2-Override #278c5d.
    expect(await port.evaluate((el) => getComputedStyle(el).fill)).toBe('rgb(39, 140, 93)');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'paper';
    });
    // paper: Basiswert #1e6b47 bleibt der Bestand (E6: «Papier behält die
    // Bestandswerte»).
    expect(await port.evaluate((el) => getComputedStyle(el).fill)).toBe('rgb(30, 107, 71)');
  });
});

// UNMIGRIERT (s. Datei-Kopf): die Legende (`vis-legende`, DockFlaeche-Panel)
// ist nur `!islandModus` gerendert und hat kein Insel-Äquivalent. v0.8.10
// E3-Nachtrag: eigener `test.use`-Kopf statt des entfallenen globalen
// Manuell-Seeds (Seed-Flip, `playwright.config.ts`).
test.describe('PA4-088 — Legende-Punkt folgt dem Token (DOM, manuell — kein Insel-Äquivalent)', () => {
  test.use({ storageState: visManuellStorageState() });

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
    // orbit-Default seit v0.8.9 E6, s. Kommentar im Test oben.
    expect(vorher).toBe('rgb(39, 140, 93)');

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
