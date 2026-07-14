import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * v0.7.8 Welle 1 / Paket P3 («Intelligente Werkzeugtabs», Herzstück) —
 * Beweis für den neuen Dock (`shell/dock/DockFlaeche.tsx` + Solver
 * `state/dock-kern.ts`): kollisionsfrei statt handgetunter absolute-Offsets.
 *
 * Bootstrap wie `bauablauf.spec.ts`/`kv-schaetzung.spec.ts`: `load-tkb`
 * direkt nach `page.goto('/')` (landet bereits in KosmoDesign). Die
 * bestehenden Öffnen-Knöpfe (`raster-toggle`, `kv-oeffnen`, …) bleiben
 * unverändert die einzige Art, ein Panel sichtbar zu machen — dieser Spec
 * klickt NUR sie, nie einen neuen Mechanismus.
 *
 * Alle BoundingBox-Messungen warten auf `stabileBox()`/`wartenAufRuhe()`
 * statt eines festen `waitForTimeout` — die Reflow-Motion (.28s,
 * `dock-flaeche.css`) braucht unter Last (SwiftShader-Software-Rendering +
 * die laufende 3D-Szene) empirisch nachgewiesen WESENTLICH länger als
 * 280ms, bis `getBoundingClientRect()` einen stabilen Endwert liefert.
 */

const FIXE_ELEMENTE = ['geschossleiste', 'entwurf-dock', 'kennzahlen', 'statusleiste'] as const;

async function oeffneDesignMitTkb(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible();
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BenannteBox {
  name: string;
  box: Box;
}

function gleich(a: Box | null, b: Box | null): boolean {
  return (
    !!a &&
    !!b &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5 &&
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5
  );
}

/** Pollt `locator.boundingBox()`, bis der Wert für mindestens `ruheMs` am
 *  Stück unverändert bleibt (s. ausführliche Begründung in
 *  `dock-interaktion.spec.ts`s gleichnamiger Funktion — derselbe Anlaufpuffer-
 *  Trick, weil ein reiner 2-Messungen-Vergleich ohne Anlaufpuffer nachweislich
 *  die alte, noch nicht transitionierte Grösse als "stabil" akzeptierte). */
async function stabileBox(
  locator: Locator,
  timeoutMs = 4000,
  intervalMs = 100,
  anlaufMs = 700,
  ruheMs = 300,
): Promise<Box> {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, anlaufMs));
  let letzte = await locator.boundingBox();
  let stabilSeitMs = 0;
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const jetzt = await locator.boundingBox();
    if (gleich(letzte, jetzt)) {
      stabilSeitMs += intervalMs;
      if (stabilSeitMs >= ruheMs) return jetzt!;
    } else {
      stabilSeitMs = 0;
    }
    letzte = jetzt;
  }
  return letzte!;
}

function ueberlappenSich(a: Box, b: Box, toleranz = 1): boolean {
  return (
    a.x < b.x + b.width - toleranz &&
    a.x + a.width - toleranz > b.x &&
    a.y < b.y + b.height - toleranz &&
    a.y + a.height - toleranz > b.y
  );
}

/** BEKANNTE, VORBESTEHENDE Kollisionen ausserhalb dieses Pakets — beide
 *  reproduzierbar auch auf dem unveränderten `main`, PER Probe-Skript
 *  nachgemessen, unabhängig vom Dock:
 *   1. Bei genug Geschossen (die TKB-Demo hat 7, `demo-tkb.ts`) wächst die
 *      Geschossleiste (`top:0`, Karteikarten-Liste) so weit nach unten, dass
 *      sie den vertikal MITTIG verankerten EntwurfsDock (`orbit065-dock`,
 *      `top:50%`) überlappt (1400×900: Geschossleiste y 139-476,
 *      EntwurfsDock y 386-653).
 *   2. `KennzahlenPanel` (`top:44`, `maxHeight:calc(100% - 56px)`) kann bei
 *      genug Befunden so tief wachsen, dass es die Statusleiste
 *      (`bottom:12`) überlappt (1400×900: Kennzahlen bis y≈888,
 *      Statusleiste ab y≈862).
 *  Beide Paare bestehen aus Elementen, die «NICHT ins Dock wandern» (Auftrag,
 *  Abschnitt 3) bzw. laut Auftrag in Welle 1 «unangetastet» bleiben
 *  (KennzahlenPanel, Welle 2) — ihre gegenseitige Kollision zu beheben ist
 *  NICHT Teil von P3 (weder Solver noch migrierte Panels sind daran
 *  beteiligt). Diese zwei Paare bleiben darum bewusst von der Prüfung
 *  ausgenommen; JEDES andere Paar (jedes migrierte Panel gegen jedes
 *  Chrome-Element, Panels untereinander) wird weiterhin hart geprüft. */
const BEKANNTE_VORBESTEHENDE_KOLLISIONEN: readonly [string, string][] = [
  ['geschossleiste', 'entwurf-dock'],
  ['kennzahlen', 'statusleiste'],
];

/** Sammelt die STABILE BoundingBox jedes sichtbaren Selektors aus
 *  `namenUndSelektoren` (übersprungen, falls nicht im DOM/nicht sichtbar)
 *  und prüft PAARWEISE Disjunktion (Toleranz 1px, Auftrag). Wirft mit einer
 *  sprechenden Meldung, welches Paar sich überlappt. */
async function pruefeDisjunktion(page: Page, namenUndSelektoren: Record<string, string>): Promise<void> {
  const boxen: BenannteBox[] = [];
  for (const [name, selektor] of Object.entries(namenUndSelektoren)) {
    const loc = page.locator(selektor);
    if ((await loc.count()) === 0) continue;
    if (!(await loc.first().isVisible())) continue;
    const box = await stabileBox(loc.first());
    boxen.push({ name, box });
  }
  for (let i = 0; i < boxen.length; i++) {
    for (let j = i + 1; j < boxen.length; j++) {
      const paar = new Set([boxen[i]!.name, boxen[j]!.name]);
      const istBekannt = BEKANNTE_VORBESTEHENDE_KOLLISIONEN.some(([a, b]) => paar.has(a) && paar.has(b));
      if (istBekannt) continue;
      const ueberlappt = ueberlappenSich(boxen[i]!.box, boxen[j]!.box);
      expect(ueberlappt, `"${boxen[i]!.name}" überlappt "${boxen[j]!.name}"`).toBe(false);
    }
  }
}

/** Baut die Standard-Selektor-Map: feste Chrome-Elemente + alle aktuell
 *  offenen Dock-Panels (exakter `data-testid`, NICHT das Präfix — sonst
 *  träfe es auch die Kopf-Knöpfe `dock-panel-<id>-pin`/`-einklappen`/`-tab`,
 *  die als Kinder DENSELBEN Präfix tragen). */
function selektorMap(offenePanelIds: readonly string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const id of FIXE_ELEMENTE) map[id] = `[data-testid="${id}"]`;
  for (const id of offenePanelIds) map[id] = `[data-testid="dock-panel-${id}"]`;
  return map;
}

test('zwei Panels gleichzeitig offen: keine Überlappung mit Chrome + Viewport bleibt ≥380px', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="view-split"]');

  await page.click('[data-testid="raster-toggle"]');
  await expect(page.locator('[data-testid="dock-panel-rasterOffen"]')).toBeVisible();
  await page.click('[data-testid="kv-oeffnen"]');
  await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toBeVisible();

  await pruefeDisjunktion(page, selektorMap(['rasterOffen', 'kvOffen']));

  const viewportBox = await page.locator('[data-testid="viewport3d"]').boundingBox();
  expect(viewportBox!.width).toBeGreaterThanOrEqual(380);
});

test('drei Panels gleichzeitig offen (links + rechts gemischt): keine Überlappung', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="view-split"]');

  await page.click('[data-testid="raster-toggle"]');
  await page.click('[data-testid="kv-oeffnen"]');
  await page.click('[data-testid="draw-toggle"]'); // rechte Spalte
  await expect(page.locator('[data-testid="dock-panel-rasterOffen"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-drawOffen"]')).toBeVisible();

  await pruefeDisjunktion(page, selektorMap(['rasterOffen', 'kvOffen', 'drawOffen']));

  const planBox = await page.locator('[data-testid="planview"]').boundingBox();
  expect(planBox!.width).toBeGreaterThanOrEqual(380);
});

test('vier Panels gleichzeitig offen: keine Überlappung, bestehende Toggles bleiben unverändert klickbar', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="view-split"]');

  await page.click('[data-testid="raster-toggle"]');
  await page.click('[data-testid="kv-oeffnen"]');
  await page.click('[data-testid="bauablauf-oeffnen"]');
  await page.click('[data-testid="draw-toggle"]');

  // Bestandsschutz: die Panel-INHALTE sind exakt wie vorher erreichbar —
  // dieselben testids/aria-Labels, nur ohne eigenen absolute-Wrapper.
  await expect(page.locator('[data-testid="raster-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="raster-panel"] [aria-label="Schliessen"]')).toBeVisible();
  await expect(page.locator('[data-testid="bauablauf-panel"]')).toBeVisible();

  await pruefeDisjunktion(page, selektorMap(['rasterOffen', 'kvOffen', 'bauablaufOffen', 'drawOffen']));

  const viewportBox = await page.locator('[data-testid="viewport3d"]').boundingBox();
  expect(viewportBox!.width).toBeGreaterThanOrEqual(380);
});

test('schmales Fenster (1000×800): unwichtigstes offenes Panel klappt zum Tab, nichts überlappt', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="view-split"]');

  // Fünf linke Panels — Summe der Mindesthöhen sprengt das schmale Fenster
  // sicher (`dock-stationen.ts`: raster 160 + cwSetzen 170 + splat 160 +
  // maengel 180 + submission 170 = 840px Minimum + Gaps). `raster`
  // (wichtigkeit 38) ist unter diesen fünf das mit Abstand unwichtigste —
  // es muss zuerst einklappen (`dock-kern.ts`s `stack()`-Solver wählt
  // deterministisch das kleinste `wichtigkeit`).
  await page.click('[data-testid="raster-toggle"]');
  await page.click('[data-testid="cw-setzen-oeffnen"]');
  await page.click('[data-testid="splat-werkzeug-toggle"]');
  await page.click('[data-testid="maengel-oeffnen"]');
  await page.click('[data-testid="faehigkeit-submission"]');

  await expect(page.locator('[data-testid="dock-panel-rasterOffen-tab"]')).toBeVisible();

  const offenePanelIds = ['rasterOffen', 'cwSetzenOffen', 'splatPanelOffen', 'maengelOffen', 'submissionOffen'];
  await pruefeDisjunktion(page, selektorMap(offenePanelIds));

  const viewportBox = await page.locator('[data-testid="viewport3d"]').boundingBox();
  expect(viewportBox!.width).toBeGreaterThanOrEqual(380);
});

test('Reset-Knopf räumt Overrides der Design-Station', async ({ page }) => {
  await oeffneDesignMitTkb(page);

  await page.click('[data-testid="kv-oeffnen"]');
  const panel = page.locator('[data-testid="dock-panel-kvOffen"]');
  await expect(panel).toBeVisible();
  const vorher = await stabileBox(panel);

  // Linke Spaltenbreite manuell verändern (col-left-Splitter, Maus-Drag) —
  // ändert `leftW` in `kosmo.dock.v1`.
  const splitter = page.locator('[data-testid="dock-splitter-spL"]');
  const sBox = (await splitter.boundingBox())!;
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2 + 80, sBox.y + sBox.height / 2, { steps: 5 });
  await page.mouse.up();

  const nachDrag = await stabileBox(panel);
  expect(Math.abs(nachDrag.width - vorher.width)).toBeGreaterThan(20);

  const gespeichert = await page.evaluate(() => localStorage.getItem('kosmo.dock.v1'));
  expect(gespeichert).toContain('leftW');

  await page.click('[data-testid="dock-zuruecksetzen"]');
  const gespeichertNachReset = await page.evaluate(() => {
    const roh = localStorage.getItem('kosmo.dock.v1');
    if (!roh) return null;
    return JSON.parse(roh) as { layouts?: Record<string, unknown> };
  });
  // Der aktive Layout-Schlüssel (`A:design`) ist nach dem Reset weg — die
  // Spaltenbreite fällt zurück auf `DOCK_KONSTANTEN.DEF_LEFT`.
  expect(gespeichertNachReset?.layouts?.['A:design']).toBeUndefined();

  // `expect.poll` statt `stabileBox()`: hier kennen wir den ERWARTETEN
  // Zielwert (`vorher.width`, der Default `DOCK_KONSTANTEN.DEF_LEFT`) schon
  // — direkt darauf pollen ist robuster als "auf irgendeinen stabilen Wert
  // warten", falls die Reflow-Motion unter Last (lange Suiten, viele
  // vorangegangene Tests im selben Worker) länger braucht als der
  // Stabilitäts-Puffer von `stabileBox()`.
  await expect
    .poll(async () => (await panel.boundingBox())?.width, { timeout: 5000 })
    .toBeLessThanOrEqual(vorher.width + 1);
});
