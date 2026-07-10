import { expect, test } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * W1 (v0.6.5, UI-KONZEPT-065 §5) — KosmoVis-Oberfläche: die vier neuen
 * Bedienelemente/-eigenschaften, die visgraph.spec.ts/vis-automatik.spec.ts
 * nicht abdecken: Zoom-Steuerleiste, Fit nach Pan, überlappungsfreies
 * «Drei Stimmungen»-Layout, SK-V3-Klapptext (Karte wächst NICHT von selbst).
 *
 * Bootstrap-Muster wie e2e/visgraph.spec.ts. Eigene Fake-Worker-Bridge auf
 * Port 8600 (Hauptbaum-Bridge) — hier nicht gebraucht (keine Render-Jobs
 * in dieser Suite), `kosmo.bridge` wird trotzdem gesetzt, damit ein zufälliger
 * Poll (Timeout-Wächter im NodeCanvas) nie gegen den Hauptbaum-Port 8600 läuft.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => {
        doc: {
          byKind: (k: string) => { id: string; nodes?: { id: string; typ: string; x: number; y: number }[] }[];
        };
      };
    };
  }
}

/** viewBox="x y w h" → { w, h } — für Zoom-/Fit-Vergleiche. */
function parseViewBox(vb: string): { x: number; y: number; w: number; h: number } {
  const [x, y, w, h] = vb.split(' ').map(Number);
  return { x: x!, y: y!, w: w!, h: h! };
}

async function oeffneVis(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.evaluate(() => localStorage.setItem('kosmo.bridge', 'http://localhost:8600'));
  await page.click('[data-testid="module-vis"]');
}

type Box = { x: number; y: number; width: number; height: number };

function ueberlappt(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Wiederverwendet von beiden Overlap-Tests (Welle 3: auch vom Zweifach-Klick-Test). */
async function pruefeAlleDisjunkt(nodes: import('@playwright/test').Locator): Promise<void> {
  const anzahl = await nodes.count();
  const boxen: Box[] = [];
  for (let i = 0; i < anzahl; i++) {
    const b = await nodes.nth(i).boundingBox();
    expect(b).not.toBeNull();
    boxen.push(b!);
  }
  for (let i = 0; i < boxen.length; i++) {
    for (let j = i + 1; j < boxen.length; j++) {
      expect(ueberlappt(boxen[i]!, boxen[j]!), `Node ${i} und ${j} überlappen`).toBe(false);
    }
  }
}

const ALLE_KETTEN_NODE_TESTIDS =
  '[data-testid="vis-node-modell"], [data-testid="vis-node-material"], [data-testid="vis-node-stimmung"], [data-testid="vis-node-kombinierer"], [data-testid="vis-node-render"], [data-testid="vis-node-vergleich"]';

test('Zoom-Steuerleiste: Plus/Minus ändern die viewBox-Skalierung', async ({ page }) => {
  await oeffneVis(page);
  await page.click('[data-testid="drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);

  const canvas = page.locator('[data-testid="node-canvas"]');
  const vbVorher = parseViewBox((await canvas.getAttribute('viewBox'))!);

  // Plus verkleinert die viewBox (mehr Zoom → weniger Canvas-Fläche sichtbar).
  await page.click('[data-testid="vis-zoom-plus"]');
  const vbNachPlus = parseViewBox((await canvas.getAttribute('viewBox'))!);
  expect(vbNachPlus.w).toBeLessThan(vbVorher.w);

  // Minus (zweimal, um den Plus-Schritt zu überholen) vergrössert sie wieder.
  await page.click('[data-testid="vis-zoom-minus"]');
  await page.click('[data-testid="vis-zoom-minus"]');
  const vbNachMinus = parseViewBox((await canvas.getAttribute('viewBox'))!);
  expect(vbNachMinus.w).toBeGreaterThan(vbNachPlus.w);
});

test('Fit nach manuellem Pan zentriert die Ansicht wieder auf die Nodes', async ({ page }) => {
  await oeffneVis(page);
  await page.click('[data-testid="drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);

  const canvas = page.locator('[data-testid="node-canvas"]');
  // Referenz-Fit EINMAL per Klick auslesen (nicht den Mount-Auto-Fit direkt
  // nehmen: die Canvas-Fläche kann sich kurz nach dem Mount noch per
  // ResizeObserver nachjustieren — ein Klick auf «Fit» liest sie IMMER frisch,
  // das ist der stabile Vergleichspunkt für «vorher/nachher»).
  await page.click('[data-testid="vis-zoom-fit"]');
  const vbSoll = (await canvas.getAttribute('viewBox'))!;

  // Manuell wegpannen (wie die F6-Tests in visgraph.spec.ts).
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2, { steps: 8 });
  await page.mouse.up();
  const vbNachPan = (await canvas.getAttribute('viewBox'))!;
  expect(vbNachPan).not.toBe(vbSoll);

  // «Fit» ruft dieselbe Einpass-Funktion wie der Mount-Auto-Fit — bei
  // unveränderter Nodemenge und Canvas-Fläche ist das Ergebnis identisch.
  await page.click('[data-testid="vis-zoom-fit"]');
  await expect(canvas).toHaveAttribute('viewBox', vbSoll);
});

test('Drei Stimmungen: alle Node-Bounding-Boxen sind paarweise disjunkt (kein Overlap)', async ({ page }) => {
  await oeffneVis(page);
  await page.click('[data-testid="drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);

  // 2 Quellen (Modell/Material) + 3× (Stimmung/Kombinierer/Render) + Vergleich = 12
  const nodes = page.locator(ALLE_KETTEN_NODE_TESTIDS);
  await expect(nodes).toHaveCount(12);
  await pruefeAlleDisjunkt(nodes);
});

/**
 * V-H5-Nachbaraufgabe (Welle 3, Ketten-Überlappung, Rundgang-Befund 0.6.5,
 * docs/rundgang/bilder/17-vis-graph.png): «Drei Stimmungen» setzte seine
 * Ketten früher auf FESTE Koordinaten — ein zweiter Klick auf denselben
 * Graphen (eine «Default-Kette» ist schon da) legte die neue Kette exakt auf
 * die erste. Fix in VisWorkspace.tsx (`dreiStimmungen`, Basis-Y-Versatz unter
 * der tiefsten Unterkante aller bestehenden Nodes) — Beweis: zweiter Klick,
 * alle 24 Node-Boxen bleiben paarweise disjunkt.
 */
test('Ketten-Überlappung (Rundgang-Befund 0.6.5): zweiter «Drei Stimmungen»-Klick überlappt die erste Kette nicht', async ({
  page,
}) => {
  await oeffneVis(page);
  await page.click('[data-testid="drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);
  await page.click('[data-testid="drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(6);

  const nodes = page.locator(ALLE_KETTEN_NODE_TESTIDS);
  await expect(nodes).toHaveCount(24);

  // Beweis-Screenshot: eingepasst, damit beide Ketten sichtbar sind.
  await page.click('[data-testid="vis-zoom-fit"]');
  await pruefeAlleDisjunkt(nodes);
  await page.screenshot({ path: 'e2e-results/vis-ketten-entzerrt.png' });
});

test('Node-Palette: Kategorien sichtbar, Klick fügt einen Node hinzu — node-hinzu bedient das KSelect-Dropdown (waehleOption)', async ({
  page,
}) => {
  await oeffneVis(page);
  await page.click('[data-testid="graph-neu"]');
  await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();

  // Seit v0.6.9 ist KSelect ein Custom-Dropdown — bedient per waehleOption.
  await waehleOption(page, 'node-hinzu', 'modell');
  await expect(page.locator('[data-testid="vis-node-modell"]')).toHaveCount(1);

  // Palette ZUSÄTZLICH: öffnen, alle vier Kategorien sichtbar.
  await page.click('[data-testid="vis-palette-toggle"]');
  await expect(page.locator('[data-testid="vis-palette"]')).toBeVisible();
  await expect(page.locator('[data-testid="vis-palette-kategorie-quelle"]')).toBeVisible();
  await expect(page.locator('[data-testid="vis-palette-kategorie-wandler"]')).toBeVisible();
  await expect(page.locator('[data-testid="vis-palette-kategorie-render"]')).toBeVisible();
  await expect(page.locator('[data-testid="vis-palette-kategorie-ausgabe"]')).toBeVisible();

  // Klick auf einen Palette-Eintrag fügt den Node über dieselbe Spiral-
  // Platzsuche ein wie der native Select.
  await page.click('[data-testid="vis-palette-eintrag-material"]');
  await expect(page.locator('[data-testid="vis-node-material"]')).toHaveCount(1);
  await expect(page.locator(ALLE_KETTEN_NODE_TESTIDS)).toHaveCount(2);

  await page.screenshot({ path: 'e2e-results/vis-palette.png' });
});

/**
 * V-H5 Kuratier-Fläche: Renderbilder als Karten (Tusche-Rahmen), markieren
 * (Stern), verwerfen (→ Ablage, NICHTS wird gelöscht), zwei Bilder in der
 * Vergleichsfläche nebeneinander (derselbe Bildvergleich-Baustein wie der
 * `vergleich`-Node). Laufzeitdaten (Job/Bild/Kuration) leben in vis-runtime.
 */
test('V-H5 Kuratier-Fläche: Karten markieren, verwerfen (Ablage), zwei Bilder vergleichen', async ({ page }) => {
  await oeffneVis(page);
  await page.click('[data-testid="drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);

  // Zwei Render-Nodes ausführen (Fake-Worker) — die Kuratier-Fläche zeigt
  // ausschliesslich Nodes mit einem FERTIGEN Bild.
  const renderNodes = page.locator('[data-testid="vis-node-render"]');
  await renderNodes.nth(0).locator('[data-testid="render-ausfuehren"]').click();
  await renderNodes.nth(1).locator('[data-testid="render-ausfuehren"]').click();
  await expect(page.locator('[data-testid="render-bild"]')).toHaveCount(2, { timeout: 25000 });

  await page.click('[data-testid="vis-kuratier-toggle"]');
  await expect(page.locator('[data-testid="vis-kuratier-flaeche"]')).toBeVisible();
  const karten = page.locator('[data-testid="vis-kuratier-karte"]');
  await expect(karten).toHaveCount(2);

  // Markieren (Stern) an der ersten Karte.
  const sternErsteKarte = karten.nth(0).locator('[data-testid="vis-kuratier-stern"]');
  await sternErsteKarte.click();
  await expect(sternErsteKarte).toHaveAttribute('aria-pressed', 'true');

  // Verwerfen an der zweiten Karte — sie wandert in die Ablage, bleibt aber
  // im DOM (nichts gelöscht, VORFORM-UI-KONZEPT §1.5 «Layout 02»).
  await karten.nth(1).locator('[data-testid="vis-kuratier-verwerfen"]').click();
  await expect(page.locator('[data-testid="vis-kuratier-ablage"]')).toBeVisible();
  await expect(page.locator('[data-testid="vis-kuratier-karte"]')).toHaveCount(2);

  // Vergleich: beide Karten anhaken → Vergleichsfläche mit zwei Bildern.
  const checkboxen = page.locator('[data-testid="vis-kuratier-vergleich-wahl"]');
  await checkboxen.nth(0).check();
  await checkboxen.nth(1).check();
  const vergleichFlaeche = page.locator('[data-testid="vis-kuratier-vergleich-flaeche"]');
  await expect(vergleichFlaeche).toBeVisible();
  await expect(vergleichFlaeche.locator('img')).toHaveCount(2, { timeout: 15000 });

  await page.screenshot({ path: 'e2e-results/vis-kuratier.png' });
});

test('SK-V3 Prompt-Clamp: langer Text lässt die Karte NICHT wachsen, node-expand zeigt den vollen Text', async ({
  page,
}) => {
  await oeffneVis(page);
  await page.click('[data-testid="graph-neu"]');
  await waehleOption(page, 'node-hinzu', 'prompt');
  await waehleOption(page, 'node-hinzu', 'kombinierer');

  const promptNode = page.locator('[data-testid="vis-node-prompt"]');
  const kombNode = page.locator('[data-testid="vis-node-kombinierer"]');
  await expect(promptNode).toBeVisible();
  await expect(kombNode).toBeVisible();

  // Basis-Höhe VOR dem langen Text (Kombinierer ist noch leer/kurz).
  const hoeheLeer = (await kombNode.boundingBox())!.height;

  // prompt.prompt → kombinierer.stil verbinden (Port-Drag, wie in
  // visgraph.spec.ts «Node-Canvas-Handwerk»).
  const ausPort = promptNode.locator('[data-testid="port-out-prompt"]');
  const einPort = kombNode.locator('[data-testid="port-in-stil"]');
  const aus = (await ausPort.boundingBox())!;
  const ein = (await einPort.boundingBox())!;
  await page.mouse.move(aus.x + aus.width / 2, aus.y + aus.height / 2);
  await page.mouse.down();
  await page.mouse.move((aus.x + ein.x) / 2, (aus.y + ein.y) / 2, { steps: 6 });
  await page.mouse.move(ein.x + ein.width / 2, ein.y + ein.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('[data-testid="vis-edge"]')).toHaveCount(1, { timeout: 5000 });

  // Ein langer Stil-Text — der Kombinierer-Prompt reicht weit über 3 Zeilen.
  const langerText = Array.from({ length: 24 }, (_, i) => `Merkmal ${i + 1}`).join(', ');
  await promptNode.locator('[data-testid="prompt-text"]').fill(langerText);
  await page.locator('[data-testid="node-canvas"]').click({ position: { x: 30, y: 30 } });
  await expect(kombNode.locator('[data-testid="kombinierer-prompt"]')).toContainText('Merkmal 1,');

  // Die Karte wächst NICHT von selbst — 3-Zeilen-Clamp hält die Höhe fest
  // (kleine Toleranz für Sub-Pixel-Rundung zwischen zwei Messungen).
  const hoeheMitLangText = (await kombNode.boundingBox())!.height;
  expect(Math.abs(hoeheMitLangText - hoeheLeer)).toBeLessThan(1.5);

  // node-expand klappt den Node auf — die Karte wächst SICHTBAR, und der
  // Knopf-Text wechselt (Beweis: der volle Text ist jetzt ungeklammert).
  const mehrKnopf = kombNode.locator('[data-testid="node-expand"]');
  await expect(mehrKnopf).toHaveText('… mehr');
  await mehrKnopf.click();
  await expect(mehrKnopf).toHaveText('weniger');
  const hoeheOffen = (await kombNode.boundingBox())!.height;
  expect(hoeheOffen).toBeGreaterThan(hoeheMitLangText + 10);
  // Der volle Text steht im DOM (nicht nur ein CSS-Clamp-Trick auf Teiltext).
  await expect(kombNode.locator('[data-testid="kombinierer-prompt"]')).toContainText('Merkmal 24');
});

/**
 * Minimap (Welle 3): kleine Übersichtskarte unten links, Default AN ab
 * MINIMAP_KNOTEN_MIN (5) Nodes. Prüft zusätzlich die Kollisionsfreiheit mit
 * den bestehenden Ecken-Elementen (Palette oben links, Kuratier-Stern oben
 * rechts, Zoom-Leiste unten rechts) und dass der historische Canvas-
 * Testpunkt (30, 30) — Lehre aus Stream F (Palette-Toggle musste deswegen
 * auf top:56 wandern) — weiterhin frei/klickbar bleibt.
 */
test('Minimap: ab 5 Nodes standardmässig sichtbar, verdeckt keine bestehende Fläche', async ({ page }) => {
  await oeffneVis(page);
  await page.click('[data-testid="drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);

  const minimap = page.locator('[data-testid="vis-minimap"]');
  await expect(minimap).toBeVisible();
  await expect(page.locator('[data-testid="vis-minimap-viewport"]')).toBeVisible();
  // Kategorie-getönte Rechtecke für alle 12 Nodes der «Drei Stimmungen»-Kette.
  await expect(minimap.locator('rect')).toHaveCount(12 + 1); // +1 Viewport-Rahmen

  // Kollisionsfreiheit: Minimap überlappt keine der vier Ecken-Flächen.
  const minimapBox = (await minimap.boundingBox())!;
  const andere = [
    'vis-palette-toggle',
    'vis-kuratier-toggle',
    'vis-zoom-minus',
    'vis-zoom-fit',
    'vis-zoom-plus',
  ];
  for (const testid of andere) {
    const box = await page.locator(`[data-testid="${testid}"]`).boundingBox();
    expect(box).not.toBeNull();
    expect(ueberlappt(minimapBox, box!), `Minimap überlappt ${testid}`).toBe(false);
  }

  // Historischer Canvas-Testpunkt (30, 30) bleibt frei — der Klick muss den
  // Canvas selbst treffen (kein interceptor-Fehler durch die neue Fläche).
  await page.locator('[data-testid="node-canvas"]').click({ position: { x: 30, y: 30 } });
});

/**
 * Klick/Drag auf die Minimap verschiebt den bestehenden Zoom/Pan-Viewport
 * des Canvas DIREKT (kein Easing) — derselbe `view`-State, den auch
 * vis-zoom-fit liest/schreibt. Zoom (Skalierung) bleibt beim Klick
 * unverändert, nur das Zentrum (viewBox x/y) wandert.
 */
test('Minimap: Klick verschiebt den Viewport (Zentrum wandert, Zoom bleibt gleich)', async ({ page }) => {
  await oeffneVis(page);
  await page.click('[data-testid="drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);
  await expect(page.locator('[data-testid="vis-minimap"]')).toBeVisible();

  const canvas = page.locator('[data-testid="node-canvas"]');
  const vbVorher = parseViewBox((await canvas.getAttribute('viewBox'))!);

  const minimap = page.locator('[data-testid="vis-minimap"]');
  const box = (await minimap.boundingBox())!;
  // Klick in die obere linke Ecke der Minimap — das Viewport-Zentrum muss
  // dorthin wandern (x/y der viewBox sinken), der Zoom (Breite) bleibt fix.
  await page.mouse.click(box.x + 8, box.y + 8);

  const vbNachher = parseViewBox((await canvas.getAttribute('viewBox'))!);
  expect(vbNachher.x).toBeLessThan(vbVorher.x);
  expect(vbNachher.y).toBeLessThan(vbVorher.y);
  expect(vbNachher.w).toBeCloseTo(vbVorher.w, 1);
  expect(vbNachher.h).toBeCloseTo(vbVorher.h, 1);
});

/**
 * Toggle-Knopf (`vis-minimap-toggle`): unter der 5-Node-Schwelle ist die
 * Minimap standardmässig AUS, ein Klick zeigt/versteckt sie unabhängig von
 * der Nodemenge.
 */
test('Minimap-Toggle: unter 5 Nodes standardmässig aus, Klick zeigt/versteckt sie', async ({ page }) => {
  await oeffneVis(page);
  await page.click('[data-testid="graph-neu"]');
  await waehleOption(page, 'node-hinzu', 'modell');
  await waehleOption(page, 'node-hinzu', 'material');
  await expect(page.locator(ALLE_KETTEN_NODE_TESTIDS)).toHaveCount(2);

  const toggle = page.locator('[data-testid="vis-minimap-toggle"]');
  await expect(toggle).toBeVisible();
  await expect(page.locator('[data-testid="vis-minimap"]')).toHaveCount(0);

  await toggle.click();
  await expect(page.locator('[data-testid="vis-minimap"]')).toBeVisible();

  await toggle.click();
  await expect(page.locator('[data-testid="vis-minimap"]')).toHaveCount(0);
});
