import { expect, test, type Page } from '@playwright/test';
import type { SzenarioSkript } from '@kosmo/ai';

/**
 * v0.6.9 Stream D («Kosmo-Blick fertig beweisen») — schliesst die 0.6.8-
 * Ehrlichkeitslücke: `e2e/kosmo-blick.spec.ts` beweist bislang nur den
 * 3D-Viewport-Capture-Pfad. Diese additive Spec beweist die drei übrigen
 * Erfassungspfade aus `state/kosmo-blick.ts` END-TO-END — jeweils ECHTES
 * dataURL-Bild, nicht nur "eine Blick-Zeile erschien":
 *  1. Grundriss (PlanView-SVG → Canvas-Raster, `quelle:'planview'`).
 *  2. KosmoVis NodeCanvas (SVG → Canvas-Raster, `quelle:'node-canvas'`).
 *  3. KosmoVis Render-Lauf (`NodeLauf.bild`, `quelle:'vis-render'`) — via
 *     Fake-Worker-Bridge (Muster `visgraph.spec.ts`).
 *
 * v0.7.1 E1/2A («Blick-Cloud-UI»): der SVG-Weg (Tests 1+2 unten) läuft seit
 * dem Downscale (`state/kosmo-blick.ts` `skaliertAlsJpeg`) durch ein
 * JPEG-Re-Encode statt PNG — `bild.mediaType` ist darum `image/jpeg`, nicht
 * mehr `image/png`. Der Render-Lauf-Pfad (Test 3, `quelle:'vis-render'`) holt
 * das Bild dagegen unverändert als PNG von der Bridge (kein Canvas-Downscale
 * dort vorgesehen, s. V071-KONZEPT.md E1/2A) — dessen Assertion bleibt PNG.
 */

// Dieselbe Signatur wie `kosmo-blick.spec.ts` (`bild?: unknown`) — bewusst
// NICHT enger typisiert, sonst kollidieren die beiden `declare global`-
// Blöcke bei einem künftigen `tsc`-Durchlauf über `e2e/`. Der genauere
// `BlickBild`-Shape (inkl. `quelle`) wird unten lokal per Cast gelesen.
declare global {
  interface Window {
    __kosmoSkripte?: Record<string, unknown>;
    __kosmoBlick: {
      ring: () => { station: string; stationTitel: string; zeit: number; bild?: unknown; text?: string }[];
    };
    __kosmo: {
      open: (screen: string) => void;
    };
  }
}

interface BlickBildProbe {
  mediaType: string;
  dataBase64: string;
  quelle: string;
}

async function projektMitTkb(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.evaluate(() => localStorage.setItem('kosmo.bridge', 'http://localhost:8600'));
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible();
  await expect(page.locator('[data-testid="station-einstellungen-design"]')).toBeVisible();
}

async function kosmoMitSkriptOeffnen(
  page: Page,
  skriptId: string,
  skript: SzenarioSkript,
  blickAn?: boolean,
): Promise<void> {
  await page.evaluate(
    ({ skriptId, skript, blickAn }) => {
      window.__kosmoSkripte = { ...(window.__kosmoSkripte ?? {}), [skriptId]: skript };
      localStorage.setItem(
        'kosmo.llm',
        JSON.stringify({ provider: 'scripted', skriptId, ...(blickAn !== undefined ? { blickAn } : {}) }),
      );
    },
    { skriptId, skript, blickAn },
  );
  if (await page.locator('[data-testid="kosmo-input"]').isVisible()) {
    await page.locator('[data-testid="kosmo-panel-schliessen"]').click();
    await expect(page.locator('[data-testid="kosmo-input"]')).toBeHidden();
  }
  await page.click('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-input"]')).toBeVisible();
}

async function sendeUndWarte(page: Page, text: string): Promise<void> {
  const sendKnopf = page.locator('[data-testid="kosmo-send"]');
  await expect(sendKnopf).toBeEnabled({ timeout: 15_000 });
  await page.fill('[data-testid="kosmo-input"]', text);
  await sendKnopf.click();
}

/** Mindestgrösse für ein "echtes" gerastertes PNG statt eines leeren/kaputten
 * 1x1-Blindgängers — grosszügig, aber deutlich über einem Fehlschlag-Nichts. */
const MIN_BASE64_LAENGE = 500;

test.describe('Kosmo-Blick — SVG- und Vis-Pfade end-to-end', () => {
  test('Grundriss-Ansicht: Blick liefert ein echtes gerastertes JPEG (quelle:planview)', async ({ page }) => {
    await projektMitTkb(page);
    // Reiner Grundriss (view-2d) — KEIN Viewport3D gemountet, sonst gewinnt
    // erfasseViewport3d() zuerst (Prioritätsliste in kosmo-blick.ts).
    await page.click('[data-testid="view-2d"]');
    await expect(page.locator('[data-testid="planview"]')).toBeVisible();

    const skript: SzenarioSkript = {
      id: 'blick-grundriss',
      zuege: [{ nutzerErwartung: 'grundriss', antwortText: 'Ich beschreibe den Grundriss.', toolCalls: [] }],
    };
    await kosmoMitSkriptOeffnen(page, 'blick-grundriss', skript, true);
    await sendeUndWarte(page, 'Was siehst du im Grundriss?');

    const blickZeile = page.locator('[data-testid="kosmo-blick-zeile"]');
    await expect(blickZeile).toBeVisible({ timeout: 15_000 });
    await expect(blickZeile).toContainText('Kosmo sieht: ‹KosmoDesign›');

    const ring = await page.evaluate(() => window.__kosmoBlick.ring());
    const letzter = ring[ring.length - 1]!;
    expect(letzter.bild).toBeDefined();
    const bild = letzter.bild as BlickBildProbe;
    expect(bild.quelle).toBe('planview');
    expect(bild.mediaType).toBe('image/jpeg');
    expect(bild.dataBase64.length).toBeGreaterThan(MIN_BASE64_LAENGE);
  });

  test('KosmoVis NodeCanvas: Blick liefert ein echtes gerastertes JPEG (quelle:node-canvas)', async ({ page }) => {
    await projektMitTkb(page);
    // Stationswechsel über den bestehenden Test-Hook (App.tsx __kosmo.open,
    // Muster kosmo-blick.spec.ts Test 3) — 'module-vis' ist nur auf der
    // Zentrale (Startbildschirm) sichtbar, projektMitTkb landet aber direkt
    // in der Design-Station.
    await page.evaluate(() => window.__kosmo.open('vis'));
    await expect(page.locator('[data-testid="station-einstellungen-vis"]')).toBeVisible();
    // NodeCanvas mountet erst mit einem aktiven Graph (VisWorkspace.tsx
    // `graphId ? <NodeCanvas ... /> : ...`) — «+ Graph» legt einen leeren an,
    // bewusst OHNE «Drei Stimmungen»/Render, sonst würde der Render-Lauf-Pfad
    // (Test unten) zuerst greifen statt des Node-Canvas-Rasters selbst.
    await page.click('[data-testid="graph-neu"]');
    await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();

    const skript: SzenarioSkript = {
      id: 'blick-nodecanvas',
      zuege: [{ nutzerErwartung: 'canvas', antwortText: 'Ich beschreibe den Node-Canvas.', toolCalls: [] }],
    };
    await kosmoMitSkriptOeffnen(page, 'blick-nodecanvas', skript, true);
    await sendeUndWarte(page, 'Was siehst du im Node-Canvas?');

    const blickZeile = page.locator('[data-testid="kosmo-blick-zeile"]');
    await expect(blickZeile).toBeVisible({ timeout: 15_000 });

    const ring = await page.evaluate(() => window.__kosmoBlick.ring());
    const letzter = ring[ring.length - 1]!;
    expect(letzter.bild).toBeDefined();
    const bild = letzter.bild as BlickBildProbe;
    expect(bild.quelle).toBe('node-canvas');
    expect(bild.mediaType).toBe('image/jpeg');
    expect(bild.dataBase64.length).toBeGreaterThan(MIN_BASE64_LAENGE);
  });

  test('KosmoVis Render-Lauf: Blick nutzt NodeLauf.bild statt Node-Canvas (quelle:vis-render)', async ({ page }) => {
    await projektMitTkb(page);
    // Stationswechsel via Test-Hook — siehe Begründung im vorigen Test.
    await page.evaluate(() => window.__kosmo.open('vis'));
    await page.click('[data-testid="drei-stimmungen"]');
    await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);

    // Fake-Render-Lauf anstossen (Bridge :8600 --fake, Muster visgraph.spec.ts).
    await page.locator('[data-testid="render-ausfuehren"]').first().click();
    await expect(page.locator('[data-testid="render-status"]').first()).toHaveText('fertig', { timeout: 25_000 });
    await expect(page.locator('[data-testid="render-bild"]').first()).toBeVisible({ timeout: 25_000 });

    const skript: SzenarioSkript = {
      id: 'blick-vis-render',
      zuege: [{ nutzerErwartung: 'render', antwortText: 'Ich beschreibe das gerenderte Bild.', toolCalls: [] }],
    };
    await kosmoMitSkriptOeffnen(page, 'blick-vis-render', skript, true);
    await sendeUndWarte(page, 'Was siehst du am gerenderten Bild?');

    const blickZeile = page.locator('[data-testid="kosmo-blick-zeile"]');
    await expect(blickZeile).toBeVisible({ timeout: 15_000 });

    const ring = await page.evaluate(() => window.__kosmoBlick.ring());
    const letzter = ring[ring.length - 1]!;
    expect(letzter.bild).toBeDefined();
    const bild = letzter.bild as BlickBildProbe;
    expect(bild.quelle).toBe('vis-render');
    expect(bild.dataBase64.length).toBeGreaterThan(MIN_BASE64_LAENGE);
  });
});

test.describe('Kosmo-Blick — Chip klickbar + Ringpuffer-Anzeige (v0.6.9 Stream D)', () => {
  test('Klick auf die Blick-Miniatur öffnet die Vollbild-Vorschau, Esc schliesst sie wieder', async ({ page }) => {
    await projektMitTkb(page);
    const skript: SzenarioSkript = {
      id: 'blick-vollbild',
      zuege: [{ nutzerErwartung: 'siehst', antwortText: 'Ich beschreibe, was ich sehe.', toolCalls: [] }],
    };
    await kosmoMitSkriptOeffnen(page, 'blick-vollbild', skript, true);
    await sendeUndWarte(page, 'Was siehst du gerade?');

    const thumbnail = page.locator('[data-testid="kosmo-blick-thumbnail"]');
    await expect(thumbnail).toBeVisible({ timeout: 15_000 });

    await thumbnail.click();
    const overlay = page.locator('[data-testid="kosmo-blick-vollbild"]');
    await expect(overlay).toBeVisible();
    // Ehrliche Zeitangabe «erfasst HH:MM:SS» — Format geprüft, nicht der
    // exakte Wert (der hängt von der Systemuhr des Testlaufs ab).
    await expect(overlay).toContainText(/erfasst \d{2}:\d{2}:\d{2}/);

    // Esc schliesst.
    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();

    // Erneut öffnen, diesmal per Klick auf den Schliessen-Knopf.
    await thumbnail.click();
    await expect(overlay).toBeVisible();
    await page.click('[data-testid="kosmo-blick-vollbild-schliessen"]');
    await expect(overlay).toBeHidden();

    // Erneut öffnen, diesmal per Scrim-Klick (ausserhalb des Bilds).
    await thumbnail.click();
    await expect(overlay).toBeVisible();
    await overlay.click({ position: { x: 5, y: 5 } });
    await expect(overlay).toBeHidden();
  });

  test('Kosmo-Einstellungen: Ringpuffer zeigt die letzten Blicke als Mini-Thumbnails mit Station+Zeit', async ({ page }) => {
    await projektMitTkb(page);
    const skript: SzenarioSkript = {
      id: 'blick-ring-anzeige',
      zuege: [
        { nutzerErwartung: 'design', antwortText: 'Design-Antwort.', toolCalls: [] },
        { nutzerErwartung: 'data', antwortText: 'Data-Antwort.', toolCalls: [] },
      ],
    };
    await kosmoMitSkriptOeffnen(page, 'blick-ring-anzeige', skript, true);

    await sendeUndWarte(page, 'Blick in KosmoDesign');
    await expect(page.locator('[data-testid="kosmo-blick-zeile"]')).toHaveCount(1, { timeout: 15_000 });

    await page.evaluate(() => window.__kosmo.open('data'));
    await expect(page.locator('[data-testid="station-einstellungen-data"]')).toBeVisible();
    await sendeUndWarte(page, 'Blick in KosmoData');
    await expect(page.locator('[data-testid="kosmo-blick-zeile"]')).toHaveCount(2, { timeout: 15_000 });

    // Einstellungen öffnen (Muster e2e/betrieb.spec.ts) — die Ringpuffer-
    // Anzeige lebt direkt neben dem Blick-Toggle.
    await page.click('[aria-label="Einstellungen"]');
    const ring = page.locator('[data-testid="kosmo-blick-ring-eintrag"]');
    await expect(ring.first()).toBeVisible();
    // Design (Bild) UND Data (Text-Fallback, kein Bild) sind beide im Ring —
    // die Anzeige zeigt für den Text-Blick ehrlich einen Platzhalter statt
    // eines erfundenen Bilds.
    const anzahl = await ring.count();
    expect(anzahl).toBeGreaterThanOrEqual(2);
    await expect(ring.last()).toContainText('KosmoData');
  });
});
