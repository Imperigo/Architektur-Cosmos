import { expect, test, type Page } from '@playwright/test';

/**
 * K3 (Owner-Rundgang 0.6.2, S. 8): «Popup-Texte dürfen niemals den Block
 * verlassen; Textblöcke dürfen niemals überlappen» — Beispiel des Owners:
 * Geschossleiste (das Verschieben-/Geschoss-Wechsel-Element links oben)
 * und das Volumenstudien-Panel. Beide sassen bei `left:12`, nur 40 px
 * Top-Abstand auseinander (`top:12` vs. `top:52`) — schon mit den
 * Standard-Geschossen EG/1.OG ragt die Geschossleiste tiefer als 40 px und
 * überdeckte das Studien-Panel. Fix (`DesignWorkspace.tsx`): das Studien-
 * Panel misst die tatsächliche Geschossleisten-Höhe und rückt IMMER
 * darunter. Dieser Test ist die Bounding-Box-Assertion: keine Überlappung,
 * unabhängig von der Geschosszahl (hier 4 Geschosse, mehr als der
 * Standard-Bootstrap).
 */

test('K3: Geschossleiste und Volumenstudien-Panel überlappen nie (Bounding-Box, auch bei mehreren Geschossen)', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/1.OG
  await page.click('[data-testid="view-2d"]');

  // Zwei weitere Geschosse — die Geschossleiste wächst über die alten
  // 40 px hinaus (das war der Reproduktionsfall des Owner-Befunds).
  await page.evaluate(() => {
    const k = window.__kosmo as { run: (id: string, p: unknown) => unknown };
    k.run('design.geschossErstellen', { name: '2.OG', index: 2, elevation: 6000, height: 3000 });
    k.run('design.geschossErstellen', { name: '3.OG', index: 3, elevation: 9000, height: 3000 });
  });

  const geschossleiste = page.locator('[data-testid="geschossleiste"]');
  await expect(geschossleiste).toBeVisible();

  // Studien-Panel öffnen (Owner-Beispiel: «Volumenstudien-Block»)
  await page.click('[data-testid="studie-toggle"]');
  const studienPanel = page.locator('[data-testid="studien-panel"]');
  await expect(studienPanel).toBeVisible();

  const gBox = await geschossleiste.boundingBox();
  const sBox = await studienPanel.boundingBox();
  expect(gBox).not.toBeNull();
  expect(sBox).not.toBeNull();

  // Keine Überlappung: die beiden Rechtecke berühren sich höchstens, sie
  // dürfen sich nicht durchdringen (Achsen-getrennte Rechtecke).
  const getrennt =
    gBox!.x + gBox!.width <= sBox!.x ||
    sBox!.x + sBox!.width <= gBox!.x ||
    gBox!.y + gBox!.height <= sBox!.y ||
    sBox!.y + sBox!.height <= gBox!.y;
  expect(getrennt).toBe(true);

  // Und zusätzlich explizit die vom Owner benannte Konstellation: das
  // Studien-Panel beginnt UNTERHALB der Geschossleiste (rückt darunter).
  expect(sBox!.y).toBeGreaterThanOrEqual(gBox!.y + gBox!.height);
});

// v0.8.1 Welle 4 / Paket P5c (Zwei-Stufen-Rollout, `docs/V081-SPEZ.md`
// §2.4/§8 Sanktion 5) — additive Kompakt-Stufen-Assertion: dieselbe
// K3-Kollisionsgarantie (kein Überlapp mit EntwurfsDock/Geschossleiste) muss
// auch in der neuen, kleineren Kompakt-Stufe eines migrierten Panels gelten
// (ein kleineres Rechteck kann strukturell nicht NEU kollidieren, wenn die
// grosse Stufe es schon nicht tat — dieser Test beweist es trotzdem explizit,
// statt es nur anzunehmen). Bestehende Assertion oben bleibt unverändert.
test('P5c Kompakt-Stufe: Kv-Panel überlappt EntwurfsDock/Geschossleiste auch in der Kompakt-Stufe nicht', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');

  await page.click('[data-testid="kv-oeffnen"]');
  await expect(page.locator('[data-testid="kv-panel"]')).toBeVisible();
  await page.click('[data-testid="kv-panel-koerper-umschalten"]');
  await expect(page.locator('[data-testid="kv-panel-koerper"]')).toHaveClass(/k-panel-zwei--kompakt/);

  const kvBox = (await page.locator('[data-testid="dock-panel-kvOffen"]').boundingBox())!;
  for (const testid of ['entwurf-dock', 'geschossleiste']) {
    const box = await page.locator(`[data-testid="${testid}"]`).boundingBox();
    expect(box, `${testid} muss sichtbar sein`).not.toBeNull();
    const schneidet =
      box!.x < kvBox.x + kvBox.width &&
      box!.x + box!.width > kvBox.x &&
      box!.y < kvBox.y + kvBox.height &&
      box!.y + box!.height > kvBox.y;
    expect(schneidet, `${testid} darf das kompakte KV-Panel nicht schneiden`).toBe(false);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// P8 (`docs/V083-SPEZ.md` §10.1, §12.6 C-20) — Island-Popup-Bounding-Box-
// Sweep über ALLE 29 Insel-Werkzeuge im iPad-Viewport. Additiver Zusatz zu
// den beiden BESTEHENDEN K3-/P5c-Tests oben (byte-gleich, nur die eigene
// `test.describe`-Gruppe unten trägt den eigenen `storageState`/`viewport`-
// Override — die bestehenden Tests behalten den globalen Manuell-Seed +
// 1400×900 unverändert, s. `playwright.config.ts`).
//
// **Datei-Namens-Kollision, offen dokumentiert statt still umgangen:** der
// Bauauftrag benannte `e2e/popup-kollision.spec.ts` als «neu», das Repo
// hatte diesen Dateinamen aber bereits (K3/P5c-Kollisionstests oben, v0.6.2/
// v0.8.1) — kein Widerspruch zum Auftragsinhalt selbst, thematisch sogar
// näher («Popup-Kollision» ⊇ «Popup verlässt den Viewport»). Aufgelöst
// zugunsten des additiven, sichereren Wegs (Lehre `wissen/training/claude/
// lehren/v0.8.2.md` «Konvention»: Spez-interne Widersprüche werden offen
// aufgelöst, nie still überschrieben) statt die bestehenden K3-/P5c-Tests zu
// überschreiben.
// ─────────────────────────────────────────────────────────────────────────

test.describe('P8 — Island-Popup-Bounding-Box-Sweep (§10.1, docs/V083-SPEZ.md)', () => {
  test.use({
    storageState: { cookies: [], origins: [] },
    viewport: { width: 1024, height: 768 },
  });

  const VIEWPORT_BREITE = 1024;
  const VIEWPORT_HOEHE = 768;
  /** Kleine Toleranz für Subpixel-Rundung (Chromium liefert gelegentlich
   *  Werte wie 1023.99609375). */
  const EPSILON = 0.5;

  async function ueberspringeOnboarding(page: Page): Promise<void> {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.starterGuide.done', '1');
    });
    await page.reload();
  }

  /** Hover statt Klick — `.click()` bewegt die Maus zuerst auf die Pill, was
   *  `onMouseEnter` (`IslandShell.tsx`) SCHON auslöst (s. `island-verdrahtung.
   *  spec.ts`-Kopfkommentar). */
  async function oeffneInsel(page: Page, island: string): Promise<void> {
    await page.hover(`[data-testid="island-${island}-pill"]`);
    await expect(page.locator(`[data-testid="island-${island}-leiste"]`)).toBeVisible();
  }

  interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  function pruefeInnerhalbViewport(box: Box | null, ort: string): void {
    expect(box, `${ort}: boundingBox() lieferte null (nicht sichtbar?)`).not.toBeNull();
    const b = box!;
    expect(b.x, `${ort}: linker Rand (${b.x}) verlässt den Viewport links`).toBeGreaterThanOrEqual(-EPSILON);
    expect(b.y, `${ort}: oberer Rand (${b.y}) verlässt den Viewport oben`).toBeGreaterThanOrEqual(-EPSILON);
    expect(
      b.x + b.width,
      `${ort}: rechter Rand (${b.x + b.width}) verlässt den Viewport rechts (Breite ${VIEWPORT_BREITE})`,
    ).toBeLessThanOrEqual(VIEWPORT_BREITE + EPSILON);
    expect(
      b.y + b.height,
      `${ort}: unterer Rand (${b.y + b.height}) verlässt den Viewport unten (Höhe ${VIEWPORT_HOEHE})`,
    ).toBeLessThanOrEqual(VIEWPORT_HOEHE + EPSILON);
  }

  /** 1:1 `island-katalog.ts` (§3.1–§3.4) — Id + `hatPopup`, in Katalog-
   *  Reihenfolge. Die zwei `hatPopup:false`-Fälle (Achsen/Manuell, §4.4) sind
   *  hier explizit markiert; Manuell bleibt bewusst das LETZTE Element der
   *  Gesamtliste — ein Klick darauf schaltet sofort auf `designOberflaeche:
   *  'manuell'` um und lässt die ganze Insel-Bühne verschwinden. */
  interface KatalogEintrag {
    island: 'zeichnen' | 'ansicht' | 'projekt' | 'austausch';
    id: string;
    hatPopup: boolean;
  }

  const ZEICHNEN: readonly KatalogEintrag[] = [
    'auswahl',
    'wand',
    'oeffnung',
    'volumen',
    'zone',
    'dach',
    'treppe',
    'stuetze',
    'skizze',
    'mesh',
    'messen',
    // v0.9.1 P-B2 (docs/V091-SPEZ.md §P-B2): additiv ans Ende gehängt —
    // dieselbe Reihenfolge wie `island-katalog.ts`s ZEICHNEN-Array.
    'gelaender',
    'rampe',
  ].map((id) => ({ island: 'zeichnen' as const, id, hatPopup: true }));

  const ANSICHT: readonly KatalogEintrag[] = [
    { island: 'ansicht', id: 'darstellung', hatPopup: true },
    { island: 'ansicht', id: 'sonne', hatPopup: true },
    { island: 'ansicht', id: 'ebenen', hatPopup: true },
    { island: 'ansicht', id: 'achsen', hatPopup: false },
    { island: 'ansicht', id: 'trace', hatPopup: true },
    { island: 'ansicht', id: 'graph', hatPopup: true },
  ];

  const PROJEKT: readonly KatalogEintrag[] = ['kennzahlen', 'checks', 'varianten', 'phase', 'liste', 'kommentare'].map(
    (id) => ({ island: 'projekt' as const, id, hatPopup: true }),
  );

  const AUSTAUSCH: readonly KatalogEintrag[] = [
    { island: 'austausch', id: 'export', hatPopup: true },
    { island: 'austausch', id: 'import', hatPopup: true },
    { island: 'austausch', id: 'rendern', hatPopup: true },
    { island: 'austausch', id: 'blaetter', hatPopup: true },
    { island: 'austausch', id: 'sync', hatPopup: true },
    { island: 'austausch', id: 'manuell', hatPopup: false }, // MUSS zuletzt bleiben
  ];

  const GESAMTKATALOG: readonly KatalogEintrag[] = [...ZEICHNEN, ...ANSICHT, ...PROJEKT, ...AUSTAUSCH];

  test('Bounding-Box-Sweep — 31/31 Werkzeuge (v0.9.1 P-B2: 29→31), kein Popup/Fenster verlässt den 1024×768-Viewport', async ({
    page,
  }) => {
    expect(GESAMTKATALOG, 'Katalog muss exakt 31 Einträge haben (ursprünglich 29, §14 Beleg 13; v0.9.1 P-B2 hängt gelaender/rampe additiv an ZEICHNEN)').toHaveLength(31);
    expect(GESAMTKATALOG[GESAMTKATALOG.length - 1]!.id).toBe('manuell');

    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    let aktuelleInsel: string | null = null;
    const geprueft: string[] = [];

    for (const { island, id, hatPopup } of GESAMTKATALOG) {
      if (aktuelleInsel !== island) {
        await oeffneInsel(page, island);
        aktuelleInsel = island;
      }

      const werkzeugKnopf = page.locator(`[data-testid="island-werkzeug-${id}"]`);
      await expect(werkzeugKnopf, `Werkzeug-Knopf fehlt: ${island}/${id}`).toBeVisible();

      if (!hatPopup) {
        // §4.4-Ausnahme (Achsen/Manuell): Toast statt Popup/Fenster — kein
        // Rahmen, der den Viewport verlassen könnte.
        await werkzeugKnopf.click();
        await expect(page.locator(`[data-testid="island-${id}-popup"]`)).toHaveCount(0);
        await expect(page.locator(`[data-testid="island-${id}-fenster"]`)).toHaveCount(0);
        geprueft.push(`${island}/${id} (kein Popup, §4.4-Ausnahme, geprüft: kein Rahmen im DOM)`);
        continue; // 'manuell' beendet die Insel-Bühne — danach folgt kein weiterer Sweep-Schritt
      }

      // Stufe 2 (Mini-Popup) — erster Klick.
      await werkzeugKnopf.click();
      const popup = page.locator(`[data-testid="island-${id}-popup"]`);
      await expect(popup, `Popup fehlt: ${island}/${id}`).toBeVisible();
      pruefeInnerhalbViewport(await popup.boundingBox(), `${island}/${id} Popup (Stufe 2)`);

      // Stufe 3 (Einstellungsfenster) — zweiter Klick auf dasselbe Symbol.
      await werkzeugKnopf.click();
      const fenster = page.locator(`[data-testid="island-${id}-fenster"]`);
      await expect(fenster, `Fenster fehlt: ${island}/${id}`).toBeVisible();
      pruefeInnerhalbViewport(await fenster.boundingBox(), `${island}/${id} Fenster (Stufe 3)`);

      geprueft.push(`${island}/${id} (Popup+Fenster innerhalb 1024×768)`);
    }

    expect(geprueft).toHaveLength(31);
  });

  test('Bounding-Box-Einzelbeweis — hohe ZEICHNEN-Insel (13 Werkzeuge, §10.1-Fund ROADMAP 427; v0.9.1 P-B2: 11→13)', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');
    await oeffneInsel(page, 'zeichnen');

    // «Rampe» ist jetzt das LETZTE der 13 ZEICHNEN-Werkzeuge (island-
    // katalog.ts, v0.9.1 P-B2 hängt gelaender/rampe additiv hinter Messen
    // an) — die Leiste ist an diesem Punkt komplett aufgefächert (voller
    // Katalog), exakt der Fall aus ROADMAP 427 («Popup-Position der hohen
    // ZEICHNEN-Insel nahe der Statusleiste»).
    const knopf = page.locator('[data-testid="island-werkzeug-rampe"]');
    await knopf.click();
    const fenster = page.locator('[data-testid="island-rampe-fenster"]');
    await knopf.click();
    await expect(fenster).toBeVisible();
    pruefeInnerhalbViewport(
      await fenster.boundingBox(),
      'zeichnen/rampe Fenster (13. Werkzeug, volle Leistenhöhe)',
    );
    await page.screenshot({ path: 'test-results/p8-083-zeichnen-hoch-geklammert.png' });
  });

  test('Trace-Select-Überdeckung (ROADMAP 427) — strukturell aufgelöst seit PD3c: nie beide gleichzeitig im DOM', async ({
    page,
  }) => {
    // PD3c (ROADMAP 431, `docs/ISLAND-UI-SPEZ.md` §6 Sanktion 7) hat
    // PlanView.tsx's eigene HUD-Zeile (inkl. `trace-select`) auf
    // `designOberflaeche === 'manuell'` beschränkt (PlanView.tsx:655) — im
    // Island-Modus (`AnsichtsInfo` sichtbar) rendert `trace-select` seither
    // GAR NICHT mehr im DOM. Der ROADMAP-427-Befund («leichte Trace-Select-
    // Überdeckung durch die Ansichts-Info») war ein PD2-Zwischenstand VOR
    // diesem Umbau — dieser Test beweist am lebenden Objekt, dass die beiden
    // Elemente heute strukturell nie gleichzeitig existieren, in BEIDEN
    // Richtungen.
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    // Island-Modus (Default ohne Seed): Ansichts-Info da, Trace-Select nicht.
    await expect(page.locator('[data-testid="ansichts-info-root"]')).toBeVisible();
    await expect(page.locator('[data-testid="trace-select"]')).toHaveCount(0);

    // Umschalten zu Manuell: Trace-Select da, Ansichts-Info nicht.
    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-manuell"]');
    await expect(page.locator('[data-testid="trace-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="ansichts-info-root"]')).toHaveCount(0);
  });
});
