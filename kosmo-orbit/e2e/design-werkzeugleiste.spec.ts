import { expect, test, type Page } from '@playwright/test';

/**
 * v0.6.5 (W2, SK-D1/D3/D4 — UI-KONZEPT-065 §4, UI-SELBSTKRITIK-064): Beweis
 * für die neu geordnete Werkzeugleiste von KosmoDesign.
 *
 * Vorher: EIN Flex-Container (`design-werkzeugleiste`) mit `flexWrap:'wrap'`,
 * der bei genug Gruppen (Zeichnen/Ansicht/Export/Ebenen/Fähigkeiten/Projekt/
 * Verlauf) unkontrolliert in 2-3 Zeilen umbrach (SK-D1, ROADMAP 253 — die
 * Leiste überdeckte nachweislich Plan-Klicks).
 *
 * Nachher: GENAU eine Hauptzeile (`design-werkzeugleiste-haupt`: Zeichnen |
 * Ansicht-Segmentgruppe | rechts Projekt-Menü/Einstellungen) und höchstens
 * eine klar abgesetzte Kontextzeile (`design-werkzeugleiste-kontext`:
 * Export/Ebenen/Fähigkeiten/Verlauf + situative Selects), nie eine dritte.
 * Export bleibt ein echter Auf/Zu-Trigger (`export-menu-toggle`), Default
 * OFFEN — bestehende Specs ausserhalb dieses Streams klicken `export-*`/
 * `import-*` direkt, ohne das Menü zu öffnen; sie rühren den neuen Trigger
 * nie an, sehen die Gruppe also unverändert (dokumentierte Wahl, s. Bericht).
 */

async function oeffneKosmoDesign(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/1.OG
}

/** Nimmt die vertikale MITTE jeder sichtbaren Knopf-/Select-Bounding-Box
 *  innerhalb `parent` (nicht die Oberkante — Knöpfe unterschiedlicher Höhe,
 *  z.B. die 30px-Fähigkeiten-Icons neben 24px-KButtons, sitzen per
 *  `align-items:center` auf derselben Zeile, obwohl ihre Oberkanten leicht
 *  auseinanderliegen) und zählt die verschiedenen Y-Bänder (12px-Raster) —
 *  das ist die "Zeilen zählen über getBoundingClientRect-Gruppierung" aus
 *  dem Auftrag. */
async function zeilenBaender(page: Page, parentTestid: string): Promise<number[]> {
  const ys = await page
    .locator(`[data-testid="${parentTestid}"] button, [data-testid="${parentTestid}"] select`)
    .evaluateAll((els) =>
      els
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => Math.round((r.top + r.height / 2) / 12) * 12),
    );
  return [...new Set(ys)].sort((a, b) => a - b);
}

test('Werkzeugleiste: genau eine Hauptzeile und höchstens eine Kontextzeile, nie eine dritte', async ({ page }) => {
  await oeffneKosmoDesign(page);

  await expect(page.locator('[data-testid="design-werkzeugleiste-haupt"]')).toBeVisible();
  await expect(page.locator('[data-testid="design-werkzeugleiste-kontext"]')).toBeVisible();

  // Hauptzeile: alle Knöpfe (Zeichnen/Ansicht/Projekt/Einstellungen) auf
  // genau einem Y-Band.
  const haupt = await zeilenBaender(page, 'design-werkzeugleiste-haupt');
  expect(haupt.length).toBe(1);

  // Kontextzeile: alle Knöpfe/Selects (Export/Ebenen/Fähigkeiten/Verlauf)
  // ebenfalls auf genau einem Y-Band — zusammen mit der Hauptzeile also
  // höchstens 2 Bänder für die gesamte Werkzeugleiste, nie 3.
  const kontext = await zeilenBaender(page, 'design-werkzeugleiste-kontext');
  expect(kontext.length).toBe(1);
  expect(haupt[0]).not.toBe(kontext[0]);

  // Auch mit aktivem Wand-Werkzeug (Assembly-Select erscheint zusätzlich in
  // der Kontextzeile) bleibt es bei den zwei Bändern — kein dritter Umbruch.
  await page.click('[data-testid="tool-wand"]');
  const kontextMitAssembly = await zeilenBaender(page, 'design-werkzeugleiste-kontext');
  expect(kontextMitAssembly.length).toBe(1);
  const hauptMitAssembly = await zeilenBaender(page, 'design-werkzeugleiste-haupt');
  expect(hauptMitAssembly.length).toBe(1);
});

test('Export-Menü: Trigger klappt zu/auf, PDF-Eintrag bleibt bei jedem offenen Zustand klickbar', async ({ page }) => {
  await oeffneKosmoDesign(page);

  const trigger = page.locator('[data-testid="export-menu-toggle"]');
  const gruppe = page.locator('[data-testid="leiste-gruppe-export"]');
  const pdf = page.locator('[data-testid="export-pdf"]');

  // Default: offen (Begründung Kommentar am Trigger in DesignWorkspace.tsx) —
  // bestehende Specs ausserhalb W2 finden `export-pdf` unverändert vor.
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(gruppe).toBeVisible();
  await expect(pdf).toBeVisible();
  await expect(pdf).toBeEnabled();

  // Zuklappen: Gruppe verschwindet wirklich (kein unsichtbares Klick-Overlay
  // über dem Viewport, s. Bericht/Grenzen — ROADMAP-253-Lehre).
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(gruppe).toHaveCount(0);

  // Wieder aufklappen: PDF-Knopf ist wieder da und klickbar (löst den
  // bestehenden Export-Pfad aus — derselbe Handler wie vor v0.6.5).
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(pdf).toBeVisible();
  await expect(pdf).toBeEnabled();
  await pdf.click();
});

test('Geschoss-Leiter: gerahmter Karteikarten-Container (45°-Ecke, --k-line-strong) statt loser Knöpfe', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);

  const leiste = page.locator('[data-testid="geschossleiste"]');
  await expect(leiste).toBeVisible();
  await expect(leiste).toHaveClass(/k-karte/);

  const stil = await leiste.evaluate((el) => {
    const cs = getComputedStyle(el);
    // Farbvergleich über ein Sondier-Element in DERSELBEN Rechen-Einheit
    // (rgb(...)), statt den rohen --k-line-strong-Hex-String gegen den vom
    // Browser aufgelösten `rgb()`-Wert zu vergleichen (Format-Falle).
    const sonde = document.createElement('div');
    sonde.style.color = 'var(--k-line-strong)';
    document.body.appendChild(sonde);
    const erwartet = getComputedStyle(sonde).color;
    sonde.remove();
    return { borderColor: cs.borderTopColor, clipPath: cs.clipPath, erwarteteRandfarbe: erwartet };
  });
  expect(stil.clipPath).not.toBe('none'); // 45°-Ecke (clip-path) aktiv
  expect(stil.borderColor).toBe(stil.erwarteteRandfarbe);

  // Bestehender Vertrag unverändert: testids + sichtbarer Text bleiben.
  await expect(page.locator('[data-testid="storey-EG"]')).toHaveText('EG');
  await expect(page.locator('[data-testid="storey-1.OG"]')).toHaveText('1.OG');
});

test('Split-Ansicht (3D | Plan): die Plan-Hälfte zentriert das Modell automatisch beim Öffnen', async ({ page }) => {
  await oeffneKosmoDesign(page);

  // Ein Bauteil ausserhalb des neutralen Startausschnitts anlegen, DANN erst
  // in den reinen 3D-Modus wechseln — würde ohne Auto-Fit beim Öffnen der
  // Plan-Hälfte teils ausserhalb des sichtbaren Bereichs liegen (SK-D4-
  // Befund). `view-3d` unmountet PlanView (der Zweig `viewMode !== '3d'`
  // entfällt); der anschliessende Klick auf `view-split` ist ein ECHTER
  // Erstmount, der bestehende `einpassen()`-Mount-Effekt (`PlanView.tsx`)
  // greift dabei unverändert — kein Eingriff in W3-Gebiet nötig (s. Bericht/
  // Grenzen: ein zusätzlicher `key`-erzwungener Remount bei jedem split↔2d-
  // Wechsel wurde verworfen, weil er PlanView-lokalen UI-Zustand wie
  // `achsen-toggle` zurücksetzte — nachweislich eine Regression in
  // `module.spec.ts`).
  const mitte = await page.evaluate(() => {
    const k = window.__kosmo as {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => { activeStoreyId: string | null; doc: { byKind: (k: string) => { name?: string; id: string }[] } };
    };
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW')) as { id: string };
    k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 8000, y: 6000 },
      b: { x: 14000, y: 6000 },
      assemblyId: aw.id,
    });
    return { x: 11000, y: 6000 };
  });
  await page.click('[data-testid="view-3d"]');

  await page.click('[data-testid="view-split"]');
  await page.waitForTimeout(200); // frischer PlanView-Mount + einpassen()

  const svg = page.locator('[data-testid="planview"]');
  await expect(svg).toBeVisible();
  const paneBox = (await svg.boundingBox())!;
  const transform = await svg.locator('> g').first().getAttribute('transform');
  const [tx, ty, scale, negCx, cy] = transform!.match(/-?\d+\.?\d*/g)!.map(Number);
  const bildschirm = {
    x: paneBox.x + tx! + scale! * (mitte.x + negCx!),
    y: paneBox.y + ty! + scale! * (cy! - mitte.y),
  };

  // Zentriert heisst hier: der Wandmittelpunkt projiziert INNERHALB der
  // Plan-Viewport-Bounding-Box, nicht ausserhalb (unzentriert, SK-D4-Befund).
  expect(bildschirm.x).toBeGreaterThanOrEqual(paneBox.x);
  expect(bildschirm.x).toBeLessThanOrEqual(paneBox.x + paneBox.width);
  expect(bildschirm.y).toBeGreaterThanOrEqual(paneBox.y);
  expect(bildschirm.y).toBeLessThanOrEqual(paneBox.y + paneBox.height);
});

declare global {
  interface Window {
    __kosmo: unknown;
  }
}
