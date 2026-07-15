import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * v0.7.8 Welle 3 / Paket P8 («Geführte Tour», letztes Bau-Paket) —
 * `shell/dock/DockTour.tsx` (7-Schritte-Rundgang mit Spotlight) +
 * `shell/dock/DockRegeln.tsx` (aus der Registry generiertes Regeln-Panel).
 *
 * Bootstrap wie `dock-layout.spec.ts`/`dock-kosmo.spec.ts`: `load-tkb`
 * landet direkt in der Design-Station mit EG/OG (Kennzahlen-Panel sichtbar).
 * `reducedMotion:'reduce'` ist Suite-Default (`playwright.config.ts`) — die
 * `.28s`-Reflow-Transition (`dock-flaeche.css`) läuft darum ohne die
 * Federkurve. `DockFlaeche.tsx`s eigene Feld-Messung bleibt aber
 * rAF-debounced (ein Tick Verzug zwischen Store-Änderung und final
 * gemessener Breite ist möglich) — `wartenAufStabileBoxen()` unten pollt
 * darum wie `dock-layout.spec.ts`s/`dock-interaktion.spec.ts`s eigene
 * `stabileBox()`, bis zwei aufeinanderfolgende Messungen übereinstimmen.
 */

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function box(locator: Locator): Promise<Box> {
  const b = await locator.boundingBox();
  if (!b) throw new Error('boundingBox() lieferte null — Element nicht sichtbar/gerendert?');
  return b;
}

function ueberlappenSich(a: Box, b: Box, toleranz = 1): boolean {
  return (
    a.x < b.x + b.width - toleranz &&
    a.x + a.width - toleranz > b.x &&
    a.y < b.y + b.height - toleranz &&
    a.y + a.height - toleranz > b.y
  );
}

async function oeffneDesignMitTkb(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();
}

async function starteTourUeberEinstellungen(page: Page): Promise<void> {
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toBeVisible();
  await page.click('[data-testid="einstellungen-dock-tour"]');
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="dock-tour"]')).toBeVisible();
}

interface BenannteBox extends Box {
  id: string;
}

/** Alle aktuell sichtbaren Dock-Panel-WURZELN (nicht die verschachtelten
 *  Knopf-/Tab-Testids, die denselben Präfix teilen, s. `DockPanel.tsx`) —
 *  bewusst OHNE die schwebenden Viewport-HUD-Floats (`data-schwebend=
 *  "true"`): deren Kollisionsvermeidung läuft über `placeFloats()`/
 *  `separate()` GEGEN ANDERE FLOATS (dock-kern.ts, dort unit-getestet),
 *  nicht gegen die angedockten Spalten — genau das, was diese Tour zeigt
 *  und wovon sie ihre Layout-Garantie ableitet, ist die STACK-Geometrie
 *  (links/rechts angedockte Panels + `kennzahlen`), nicht die Floats. */
async function sichtbareDockPanelBoxen(page: Page): Promise<BenannteBox[]> {
  const roh = await page.evaluate(() => {
    // '-pin-badge' (Abnahme-Fix C4) VOR '-pin' unnötig — endsWith prüft jeden
    // Suffix einzeln; das neue Kopf-Badge muss aber explizit dabei sein, sonst
    // zählte es als eigene "Panel-Wurzel" und überlappte trivialerweise sein
    // eigenes Panel.
    const suffixe = ['-tab', '-kosmo-badge', '-pin-badge', '-pin', '-popout', '-redock', '-einklappen', '-schliessen'];
    return Array.from(document.querySelectorAll('[data-testid^="dock-panel-"]'))
      .filter((el) => {
        const id = el.getAttribute('data-testid') ?? '';
        if (suffixe.some((s) => id.endsWith(s))) return false;
        return el.getAttribute('data-schwebend') !== 'true';
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { id: el.getAttribute('data-testid') ?? '', x: r.x, y: r.y, width: r.width, height: r.height };
      });
  });
  return roh.sort((a, b) => a.id.localeCompare(b.id));
}

function boxenGleich(a: readonly BenannteBox[], b: readonly BenannteBox[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((box, i) => {
    const andere = b[i]!;
    return (
      box.id === andere.id &&
      Math.abs(box.x - andere.x) < 0.5 &&
      Math.abs(box.y - andere.y) < 0.5 &&
      Math.abs(box.width - andere.width) < 0.5 &&
      Math.abs(box.height - andere.height) < 0.5
    );
  });
}

/** Pollt `sichtbareDockPanelBoxen()`, bis die Messung für mindestens `ruheMs`
 *  am Stück unverändert bleibt — 1:1 dasselbe Anlaufpuffer-Muster wie
 *  `dock-layout.spec.ts`s/`dock-interaktion.spec.ts`s eigene `stabileBox()`
 *  (dortige Begründung: ein reiner Zwei-Messungen-Vergleich OHNE Anlaufpuffer
 *  akzeptiert nachweislich eine noch nicht fertig transitionierte
 *  Zwischengrösse als "stabil", weil `DockFlaeche.tsx`s Reflow — bei zehn
 *  gleichzeitig um/ausklappenden Panels wie Tour-Schritt 4 — mehrere hundert
 *  Millisekunden braucht, bis `getBoundingClientRect()` den fertigen
 *  Endwert liefert). */
async function wartenAufStabileBoxen(
  page: Page,
  timeoutMs = 8000,
  intervalMs = 100,
  anlaufMs = 300,
  ruheMs = 600,
): Promise<BenannteBox[]> {
  await new Promise((r) => setTimeout(r, anlaufMs));
  const start = Date.now();
  let letzte: BenannteBox[] | null = null;
  let ruhigSeit = 0;
  for (;;) {
    const aktuelle = await sichtbareDockPanelBoxen(page);
    if (letzte && boxenGleich(letzte, aktuelle)) {
      ruhigSeit += intervalMs;
      if (ruhigSeit >= ruheMs) return aktuelle;
    } else {
      ruhigSeit = 0;
    }
    letzte = aktuelle;
    if (Date.now() - start > timeoutMs) return aktuelle;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

function keineUeberlappung(boxen: readonly BenannteBox[]): void {
  for (let i = 0; i < boxen.length; i++) {
    for (let j = i + 1; j < boxen.length; j++) {
      expect(ueberlappenSich(boxen[i]!, boxen[j]!)).toBe(false);
    }
  }
}

const SCHRITT_TITEL = [
  'Ausgangslage',
  'Öffnen → Nachbarn schrumpfen',
  'Balken selbst ziehen',
  'Anheften schützt · zu eng → Einklappen',
  'Schwebende HUDs weichen aus',
  'Neu andocken',
  'Kontrast · Konzept B: Raster-Kachel',
] as const;

test('Dock-Tour: 7 Schritte, Spotlight je Schritt, keine Panel-Überlappung, letzter Schritt zeigt Konzept B', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);
  await starteTourUeberEinstellungen(page);

  for (let i = 0; i < SCHRITT_TITEL.length; i++) {
    const schrittKarte = page.locator('[data-testid="dock-tour-schritt"]');
    await expect(schrittKarte).toContainText(SCHRITT_TITEL[i]!);
    await expect(page.locator('[data-testid="dock-tour-spotlight"]')).toBeVisible();

    const boxen = await wartenAufStabileBoxen(page);
    expect(boxen.length).toBeGreaterThan(0);
    keineUeberlappung(boxen);

    if (i < SCHRITT_TITEL.length - 1) {
      await page.click('[data-testid="dock-tour-weiter"]');
    }
  }

  // Schritt 7 (letzter): «Weiter» ist am Ende deaktiviert, Konzept B ist
  // aktiv — die Kostenschätzung (in diesem Schritt offen) ist NIE
  // schwebend (Konzept B kennt kein Schweben, `dock-kern.ts` `solve()`).
  await expect(page.locator('[data-testid="dock-tour-weiter"]')).toBeDisabled();
  await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toHaveAttribute('data-schwebend', 'false');
});

test('Dock-Tour: Zurück springt zum vorherigen Schritt (deterministisch in beide Richtungen)', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  await starteTourUeberEinstellungen(page);

  await expect(page.locator('[data-testid="dock-tour-zurueck"]')).toBeDisabled();
  await page.click('[data-testid="dock-tour-weiter"]');
  await page.click('[data-testid="dock-tour-weiter"]');
  await expect(page.locator('[data-testid="dock-tour-schritt"]')).toContainText('Balken selbst ziehen');

  await page.click('[data-testid="dock-tour-zurueck"]');
  await expect(page.locator('[data-testid="dock-tour-schritt"]')).toContainText('Öffnen → Nachbarn schrumpfen');
  await expect(page.locator('[data-testid="dock-tour-zurueck"]')).toBeEnabled();

  await page.click('[data-testid="dock-tour-zurueck"]');
  await expect(page.locator('[data-testid="dock-tour-schritt"]')).toContainText('Ausgangslage');
  await expect(page.locator('[data-testid="dock-tour-zurueck"]')).toBeDisabled();
});

test('Dock-Tour: Beenden stellt den Vor-Tour-Zustand exakt wieder her (Dock-Store + UI-Stichprobe)', async ({ page }) => {
  const vorTourLayout = {
    version: 1,
    modus: 'A',
    layouts: {
      'A:design': {
        leftW: 288,
        panels: {
          kvOffen: { angeheftet: true, groesse: 350 },
        },
      },
    },
    // v0.8.0 / Paket PD1 hat `aktivesPreset` additiv ins `DockSpeicher`-Schema
    // aufgenommen — `persistiere()` (dock-zustand.ts) schreibt dieses Feld
    // seither IMMER mit (auch als leeres `{}`), u.a. wenn `zustandWiederherstellen`
    // (diese Tour, «Beenden») am Ende erneut persistiert. Ohne dieses Feld hier
    // im Vor-Tour-Seed wäre der `toEqual`-Vergleich unten strukturell schief:
    // die Tour selbst rührt kein Preset an, das Feld bleibt beidseitig `{}` —
    // nur der SEED muss das jetzt explizit tragen, damit «exakt wiederhergestellt»
    // wirklich Gleiches mit Gleichem vergleicht.
    aktivesPreset: {},
  };
  await page.goto('/');
  await page.evaluate((layout) => {
    localStorage.setItem('kosmo.dock.v1', JSON.stringify(layout));
  }, vorTourLayout);
  // `dock-zustand.ts` liest `kosmo.dock.v1` EINMAL beim Modul-Import — ein
  // `reload()` ist nötig, damit der frisch gesetzte Wert tatsächlich in den
  // Store einzieht (Muster `dock-kosmo.spec.ts` (c) / `dock-layout.spec.ts`
  // `oeffneDesignInModus`).
  await page.reload();
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();

  // Eigener Vor-Tour-Zustand der Sichtbarkeits-Booleans: Mängel OFFEN, KV ZU
  // — bewusst der GEGENSATZ dessen, was die Tour selbst in ihren Schritten
  // zeigt, damit eine unvollständige Wiederherstellung sichtbar auffiele.
  await page.click('[data-testid="maengel-oeffnen"]');
  await expect(page.locator('[data-testid="dock-panel-maengelOffen"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toHaveCount(0);

  const vorTourStorage = await page.evaluate(() => localStorage.getItem('kosmo.dock.v1'));

  await starteTourUeberEinstellungen(page);
  // Ein paar Schritte weiterklicken, inkl. des Schritts, der `kvOffen`
  // anheftet UND alle zehn linken Panels öffnet (Schritt 4) — genau das
  // Override/Booleans, deren Rückbau geprüft werden soll.
  await page.click('[data-testid="dock-tour-weiter"]');
  await page.click('[data-testid="dock-tour-weiter"]');
  await page.click('[data-testid="dock-tour-weiter"]');
  await expect(page.locator('[data-testid="dock-tour-schritt"]')).toContainText('Anheften schützt');
  await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toBeVisible();

  await page.click('[data-testid="dock-tour-beenden"]');
  await expect(page.locator('[data-testid="dock-tour"]')).toHaveCount(0);

  // Inhaltlicher (nicht byte-wörtlicher) Vergleich: `persistiere()` schreibt
  // Objekte in ihrer eigenen Feld-Reihenfolge weg (s. `normalisierePanelOverride()`,
  // `dock-zustand.ts`) — dieselben WERTE können darum in einer anderen
  // JSON-Schlüsselreihenfolge landen, ohne dass sich am Zustand selbst etwas
  // geändert hätte. `toEqual` auf den geparsten Objekten ist die tatsächlich
  // relevante Prüfung («exakt wiederhergestellt» heisst gleiche Daten, nicht
  // gleiche Bytes).
  const nachTourStorage = await page.evaluate(() => localStorage.getItem('kosmo.dock.v1'));
  expect(JSON.parse(nachTourStorage!)).toEqual(JSON.parse(vorTourStorage!));
  const geparst = JSON.parse(nachTourStorage!) as { layouts: Record<string, { leftW?: number; panels: Record<string, unknown> }> };
  expect(geparst.layouts['A:design']?.leftW).toBe(288);
  expect(geparst.layouts['A:design']?.panels['kvOffen']).toEqual({ angeheftet: true, groesse: 350 });

  // UI-Stichprobe: exakt der Vor-Tour-Zustand der Booleans, nicht der
  // Zwischenzustand der Tour.
  await expect(page.locator('[data-testid="dock-panel-maengelOffen"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toHaveCount(0);
});

test('Dock-Tour: schmales Fenster (600×800) schaltet live auf die Bottom-Sheet-Variante ohne Spotlight-Zwang', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);
  await starteTourUeberEinstellungen(page);
  await expect(page.locator('[data-testid="dock-tour-spotlight"]')).toBeVisible();

  await page.setViewportSize({ width: 600, height: 800 });
  await expect(page.locator('[data-testid="dock-tour-spotlight"]')).toHaveCount(0);
  const karteBox = await box(page.locator('[data-testid="dock-tour-schritt"]'));
  expect(karteBox.width).toBeGreaterThan(500);
  // Grosse Tap-Ziele bleiben bedienbar.
  await page.click('[data-testid="dock-tour-weiter"]');
  await expect(page.locator('[data-testid="dock-tour-schritt"]')).toContainText('Öffnen → Nachbarn schrumpfen');
});

test('Einstellungen: «Werkzeug-Dock kennenlernen» zeigt ausserhalb der Design-Station einen ehrlichen Hinweis', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="module-design"]'); // Zentrale/Home — keine DockFlaeche gemountet.

  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.click('[data-testid="einstellungen-dock-tour"]');
  await expect(page.locator('[data-testid="einstellungen-dock-tour-hinweis"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-tour"]')).toHaveCount(0);
});

test('Regeln-Panel: Rangfolge-Tabelle wird aus der Registry erzeugt (kennzahlen/inspector enthalten)', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="dock-regeln-oeffnen"]');

  const regeln = page.locator('[data-testid="dock-regeln"]');
  await expect(regeln).toBeVisible();
  await expect(page.locator('[data-testid="dock-regeln-zeile-kennzahlen"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-regeln-zeile-inspector"]')).toBeVisible();
  await expect(regeln).toContainText('Kennzahlen');
  await expect(regeln).toContainText('Inspector');

  // Rangfolge stimmt inhaltlich: das unwichtigste Panel (Stützenraster,
  // Wichtigkeit 38) steht VOR dem wichtigsten (Inspector, 82).
  const zeilenText = await page.locator('[data-testid="dock-regeln-rangfolge"] tbody tr').allTextContents();
  const rasterZeile = zeilenText.findIndex((t) => t.includes('Stützenraster'));
  const inspectorZeile = zeilenText.findIndex((t) => t.includes('Inspector'));
  expect(rasterZeile).toBeGreaterThan(-1);
  expect(inspectorZeile).toBeGreaterThan(rasterZeile);
});
