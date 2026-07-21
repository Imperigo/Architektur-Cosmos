import { expect, test, type Locator, type Page } from '@playwright/test';
import { visManuellStorageState } from './helpers/manuell-seed';

/**
 * v0.8.0 / Paket PD2 («Default-Oberflächen» — Presets-UI) — Beweis für
 * `state/dock-preset-anwendung.ts` (die geteilte Anwend-Funktion),
 * `Einstellungen.tsx`s Preset-Wähler, den Kontextzeilen-Schnellzugriff
 * (`dock-preset-fokus|arbeiten|pruefen`, Design-Statusleiste + Vis-Toolbar)
 * und den Kosmo-Befehl `ui.dockPresetSetzen` (`state/dock-befehle.ts`).
 *
 * Vier Teile (Auftrag):
 *   (a) je Station (design/vis) jedes Preset anwenden → BBox-Disjunktion +
 *       Aufgeräumt-Kriterium für Fokus (harte Assertion: 0 sichtbare
 *       Werkzeug-Panels, abgeleitet aus `DESIGN_FOKUS.offen=[]`/
 *       `VIS_FOKUS.offen=[]`, `dock-presets.ts`).
 *   (b) Erststart ohne localStorage → Fokus aktiv (für BEIDE Stationen).
 *   (c) Bestandsschutz: vorhandenes `kosmo.dock.v1` → KEINE Preset-Anwendung.
 *   (d) `ui.dockPresetSetzen` über den Kosmo-Chat-Weg → Quittung sichtbar
 *       (`kosmo-ui-aktion-dock`), Layout wechselt tatsächlich.
 *
 * BBox-Disjunktions-/`stabileBox()`-Muster 1:1 aus `dock-layout.spec.ts`
 * übernommen (eigene Kopie hier, kein Cross-Spec-Import — Konvention dieser
 * Suite, s. `dock-interaktion.spec.ts`/`dock-tour.spec.ts`, die dieselben
 * Helfer ebenfalls je eigenständig führen).
 *
 * v0.8.10 E3-Nachtrag (Owner-Entscheid 20.07.2026, `docs/V0810-SPEZ.md` §2
 * E3 Punkt 6): die Vis-Preset-Panels sind eine Manuell-only-Funktion (kein
 * Insel-Äquivalent, P-B1-Audit-Fund) — der globale `kosmo.ui.v1`-Seed
 * verliert sein `visOberflaeche`-Feld (Seed-Flip), dieser Per-Spec-Kopf hält
 * die GANZE Datei unverändert auf dem heutigen Manuell-Seed (Muster
 * `e2e/helpers/manuell-seed.ts`s `visManuellStorageState()`-Kopfkommentar).
 * Die Erststart-Tests unten löschen weiterhin gezielt NUR `kosmo.dock.v1`/
 * `kosmo.dock.presetInit.v1` per `page.evaluate` — ein anderer localStorage-
 * Schlüssel als `kosmo.ui.v1`, keine Kollision mit diesem Seed.
 */
test.use({ storageState: visManuellStorageState() });

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
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

interface BenannteBox {
  name: string;
  box: Box;
}

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
      const ueberlappt = ueberlappenSich(boxen[i]!.box, boxen[j]!.box);
      expect(ueberlappt, `"${boxen[i]!.name}" überlappt "${boxen[j]!.name}"`).toBe(false);
    }
  }
}

// ---------------------------------------------------------------------------
// Registry-Kuration (dock-presets.ts), hier als Literale — Konvention dieser
// Suite: e2e-Specs importieren nie aus `src/`, sondern spiegeln die für den
// Test relevanten Registry-Werte als eigene Konstanten (Muster
// `dock-layout.spec.ts`s `HUD_FLOAT_IDS`).
// ---------------------------------------------------------------------------

/** Die elf `offenFaehigeIds('design')` — dieselbe Menge, die
 *  `dock-presets.test.ts` als «design: genau elf Panel-IDs sind offen-fähig»
 *  hart prüft. */
const DESIGN_WERKZEUG_PANEL_IDS = [
  'rasterOffen',
  'cwSetzenOffen',
  'splatPanelOffen',
  'maengelOffen',
  'submissionOffen',
  'bauablaufOffen',
  'kvOffen',
  'listeOffen',
  'variantenPanelOffen',
  'studieOffen',
  'drawOffen',
] as const;

const DESIGN_HUD_FLOAT_IDS = [
  'viewportModusLeiste',
  'viewportModusKarte',
  'viewportWerkzeugRail',
  'viewportOrientierung',
  'viewportHudStatuskarte',
  'viewportEigenschaften',
] as const;

const DESIGN_FIXE_ELEMENTE = ['geschossleiste', 'entwurf-dock', 'statusleiste'] as const;

// K35 (Owner-Korrekturen 2026-07, S.14): `visMinimap` ist mitsamt der Minimap entfernt.
const VIS_PANEL_IDS = ['visPalette', 'visAusrichten', 'visLegende'] as const;

function selektorMapDesign(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const id of DESIGN_FIXE_ELEMENTE) map[id] = `[data-testid="${id}"]`;
  for (const id of [...DESIGN_WERKZEUG_PANEL_IDS, 'kennzahlen', 'inspector', ...DESIGN_HUD_FLOAT_IDS]) {
    map[id] = `[data-testid="dock-panel-${id}"]`;
  }
  return map;
}

function selektorMapVis(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const id of VIS_PANEL_IDS) map[id] = `[data-testid="dock-panel-${id}"]`;
  return map;
}

async function oeffneDesignMitTkb(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
  await page.click('[data-testid="load-tkb"]');
  await page.click('[data-testid="view-split"]');
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();
}

async function oeffneVisMitGraph(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
  await page.click('[data-testid="module-vis"]');
  await page.click('[data-testid="graph-neu"]');
  await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();
}

async function visNodeHinzu(page: Page, typ: string): Promise<void> {
  await page.click('[data-testid="node-hinzu"]');
  await page.waitForSelector('[data-testid="node-hinzu-popup"]');
  await page.click(`[data-testid="node-hinzu-popup"] [data-value="${typ}"]`);
  await page.waitForSelector('[data-testid="node-hinzu-popup"]', { state: 'hidden' });
}

// ---------------------------------------------------------------------------
// (a) Design-Station — drei Presets über den Kontextzeilen-Schnellzugriff
// ---------------------------------------------------------------------------

for (const preset of ['fokus', 'arbeiten', 'pruefen'] as const) {
  test(`Design-Station · Preset «${preset}»: anwenden über die Kontextzeile, Panels bleiben disjunkt`, async ({ page }) => {
    await oeffneDesignMitTkb(page);

    // "Prüfen" braucht ein sichtbares drawOffen-Ergebnis — sonst wäre die
    // Kuration selbst identisch zu "arbeiten" (offen=[] bei beiden), darum
    // hier bereits VOR dem Preset ein anderes Panel offen, das das Preset
    // dann wieder schliessen MUSS (Beweis, dass wirklich der volle
    // Ziel-Zustand angewendet wird, nicht nur additiv geöffnet wird).
    await page.click('[data-testid="kv-oeffnen"]');
    await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toBeVisible();

    await page.click(`[data-testid="dock-preset-${preset}"]`);
    await expect(page.locator(`[data-testid="dock-preset-${preset}"]`)).toHaveAttribute('aria-pressed', 'true');
    // Die anderen beiden Preset-Knöpfe sind NICHT aktiv markiert.
    for (const andere of ['fokus', 'arbeiten', 'pruefen'] as const) {
      if (andere === preset) continue;
      await expect(page.locator(`[data-testid="dock-preset-${andere}"]`)).toHaveAttribute('aria-pressed', 'false');
    }

    if (preset === 'fokus') {
      // Aufgeräumt-Kriterium (hart, N=0): DESIGN_FOKUS.offen=[] — KEINES der
      // elf Werkzeug-Panels ist sichtbar (weder voll noch eingeklappt —
      // `DockFlaeche.tsx` rendert geschlossene Panels gar nicht).
      for (const id of DESIGN_WERKZEUG_PANEL_IDS) {
        await expect(page.locator(`[data-testid="dock-panel-${id}"]`)).toHaveCount(0);
      }
      // Kennzahlen bleibt als Daten-Guard sichtbar, aber eingeklappt.
      await expect(page.locator('[data-testid="dock-panel-kennzahlen-tab"]')).toBeVisible();
    } else if (preset === 'arbeiten') {
      // v0.8.0 P11 (P9-Abnahmefund, Spez §7.1 «1-2 sinnvoll ausgewählte
      // Panels offen»): GENAU listeOffen (Berechnungsliste) + drawOffen
      // (Modellbaum/Mengen/Ausmass) sind offen — beide nach Registry-
      // WICHTIGKEIT gewählt (`dock-presets.ts` `DESIGN_ARBEITEN`), alle
      // anderen neun Werkzeug-Panels (inkl. des zuvor manuell geöffneten
      // kvOffen) sind zu. Kennzahlen NICHT eingeklappt — der Unterschied zu
      // "fokus".
      const ARBEITEN_OFFEN = ['listeOffen', 'drawOffen'];
      for (const id of ARBEITEN_OFFEN) {
        await expect(page.locator(`[data-testid="dock-panel-${id}"]`)).toBeVisible();
      }
      for (const id of DESIGN_WERKZEUG_PANEL_IDS) {
        if (ARBEITEN_OFFEN.includes(id)) continue;
        await expect(page.locator(`[data-testid="dock-panel-${id}"]`)).toHaveCount(0);
      }
      await expect(page.locator('[data-testid="dock-panel-kennzahlen-tab"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="dock-panel-kennzahlen"]')).toBeVisible();
    } else {
      // "pruefen": GENAU drawOffen ist offen, alle anderen zehn Werkzeug-
      // Panels (inkl. des zuvor manuell geöffneten kvOffen) sind zu.
      await expect(page.locator('[data-testid="dock-panel-drawOffen"]')).toBeVisible();
      for (const id of DESIGN_WERKZEUG_PANEL_IDS) {
        if (id === 'drawOffen') continue;
        await expect(page.locator(`[data-testid="dock-panel-${id}"]`)).toHaveCount(0);
      }
      // Kennzahlen ist gross+angeheftet, NICHT eingeklappt.
      await expect(page.locator('[data-testid="dock-panel-kennzahlen-tab"]')).toHaveCount(0);
      const kennzahlenBox = await stabileBox(page.locator('[data-testid="dock-panel-kennzahlen"]'));
      expect(kennzahlenBox.height).toBeGreaterThan(300); // groesse:480 statt Registry-Default 380
    }

    await pruefeDisjunktion(page, selektorMapDesign());
  });
}

// ---------------------------------------------------------------------------
// (a) Vis-Station — drei Presets über die Toolbar-Gruppe «Oberfläche»
// ---------------------------------------------------------------------------

for (const preset of ['fokus', 'arbeiten', 'pruefen'] as const) {
  test(`Vis-Station · Preset «${preset}»: anwenden über die Toolbar, Panels bleiben disjunkt`, async ({ page }) => {
    await oeffneVisMitGraph(page);
    // Alle sechs Porttypen im Graphen (Legende-Daten-Guard).
    for (const typ of ['modell', 'material', 'prompt', 'zahl', 'kamera', 'render']) {
      await visNodeHinzu(page, typ);
    }
    await expect(page.locator('[data-testid="dock-panel-visLegende"]')).toBeVisible();
    // K35: das frühere `visMinimap`-Panel existiert nicht mehr.
    await expect(page.locator('[data-testid="dock-panel-visMinimap"]')).toHaveCount(0);

    await page.click(`[data-testid="dock-preset-${preset}"]`);
    await expect(page.locator(`[data-testid="dock-preset-${preset}"]`)).toHaveAttribute('aria-pressed', 'true');

    if (preset === 'fokus') {
      // Aufgeräumt-Kriterium (hart, N=0): VIS_FOKUS.offen=[] — visPalette
      // (der einzige echte Werkzeug-Panel-Hebel dieser Station) ist zu.
      await expect(page.locator('[data-testid="dock-panel-visPalette"]')).toHaveCount(0);
    } else if (preset === 'arbeiten') {
      await expect(page.locator('[data-testid="dock-panel-visPalette"]')).toBeVisible();
    } else {
      await expect(page.locator('[data-testid="dock-panel-visPalette"]')).toHaveCount(0);
      const legendeBox = await stabileBox(page.locator('[data-testid="dock-panel-visLegende"]'));
      // Override fw:130/fh:170 statt Registry-Default fw:90/fh:124.
      expect(legendeBox.width).toBeGreaterThan(100);
      expect(legendeBox.height).toBeGreaterThan(140);
    }

    await pruefeDisjunktion(page, selektorMapVis());
  });
}

// ---------------------------------------------------------------------------
// (b) Erststart = Fokus (NUR ohne gespeichertes Layout)
// ---------------------------------------------------------------------------

test('Erststart (kein kosmo.dock.v1, kein Marker): Fokus wird automatisch für design UND vis aktiv', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('kosmo.dock.v1');
    localStorage.removeItem('kosmo.dock.presetInit.v1');
  });
  await page.reload();

  await page.click('[data-testid="load-tkb"]');
  // NICHT `[data-testid="kennzahlen"]` (der Panel-INHALT) — Fokus hat
  // Kennzahlen bereits beim allerersten Laden eingeklappt, darum rendert nur
  // der Tab-Kopf, nicht der Inhalt (s. `DockPanel.tsx`). Die Panel-WURZEL
  // (`dock-panel-kennzahlen`) existiert in beiden Zuständen.
  await expect(page.locator('[data-testid="dock-panel-kennzahlen"]')).toBeVisible();
  // Fokus ist bereits aktiv, OHNE dass ein Preset-Knopf geklickt wurde.
  await expect(page.locator('[data-testid="dock-preset-fokus"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-testid="dock-panel-kennzahlen-tab"]')).toBeVisible();

  const gespeichert = await page.evaluate(() => {
    const roh = localStorage.getItem('kosmo.dock.v1');
    return roh ? (JSON.parse(roh) as { aktivesPreset?: Record<string, string> }) : null;
  });
  expect(gespeichert?.aktivesPreset?.['design']).toBe('fokus');
  expect(gespeichert?.aktivesPreset?.['vis']).toBe('fokus');
  expect(await page.evaluate(() => localStorage.getItem('kosmo.dock.presetInit.v1'))).toBe('1');
});

// ---------------------------------------------------------------------------
// (c) Bestandsschutz: vorhandenes kosmo.dock.v1 → KEINE Preset-Anwendung
// ---------------------------------------------------------------------------

test('Bestandsschutz: vorhandenes kosmo.dock.v1 verhindert die automatische Preset-Anwendung', async ({ page }) => {
  const bestandsLayout = {
    version: 1,
    modus: 'A',
    layouts: { 'A:design': { leftW: 333, panels: {} } },
  };
  await page.goto('/');
  await page.evaluate((layout) => {
    localStorage.removeItem('kosmo.dock.presetInit.v1');
    localStorage.setItem('kosmo.dock.v1', JSON.stringify(layout));
  }, bestandsLayout);
  await page.reload();

  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();

  // Kein Preset ist aktiv — Fokus hätte Kennzahlen eingeklappt, das ist NICHT
  // der Fall (das harte Abnahmekriterium: Bestandsnutzer erleben keine
  // Layout-Änderung).
  await expect(page.locator('[data-testid="dock-panel-kennzahlen-tab"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="dock-panel-kennzahlen"]')).toBeVisible();

  await page.click('[data-testid="einstellungen-oeffnen"]');
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toBeVisible();
  // Scope auf den Einstellungen-Wähler — dieselben testids existieren
  // GLEICHZEITIG auch im Kontextzeilen-Schnellzugriff der Statusleiste
  // dahinter (bewusst identische testids für UI und Kosmo-Weg, s.
  // `dock-preset-anwendung.ts`-Kopfkommentar), ein ungescopter Locator wäre
  // hier ein Playwright-Strict-Mode-Verstoss (zwei Treffer).
  const waehler = page.locator('[data-testid="dock-preset-waehler"]');
  for (const id of ['fokus', 'arbeiten', 'pruefen'] as const) {
    await expect(waehler.locator(`[data-testid="dock-preset-${id}"]`)).toHaveAttribute('aria-pressed', 'false');
  }
  await page.click('[data-testid="einstellungen-panel"] [aria-label="Schliessen"]');

  // Der Bestand selbst blieb unangetastet (leftW 333), Marker wurde gesetzt
  // (verhindert künftige Re-Prüfung, s. `dock-preset-anwendung.ts`).
  const gespeichert = await page.evaluate(() => {
    const roh = localStorage.getItem('kosmo.dock.v1');
    return roh ? (JSON.parse(roh) as { layouts: Record<string, { leftW?: number }>; aktivesPreset?: Record<string, string> }) : null;
  });
  expect(gespeichert?.layouts['A:design']?.leftW).toBe(333);
  expect(gespeichert?.aktivesPreset?.['design']).toBeUndefined();
  expect(await page.evaluate(() => localStorage.getItem('kosmo.dock.presetInit.v1'))).toBe('1');
});

// ---------------------------------------------------------------------------
// (d) ui.dockPresetSetzen über den Kosmo-Chat-Weg
// ---------------------------------------------------------------------------

test.describe('Kosmo-Weg — ui.dockPresetSetzen über den Mock-Provider', () => {
  test('«Räum die Oberfläche auf» → Quittung kosmo-ui-aktion-dock, Layout wechselt auf Fokus', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.starterGuide.done', '1');
      localStorage.setItem('kosmo.panelOffen', '1');
      localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
      localStorage.removeItem('kosmo.dock.v1');
    });
    await page.reload();
    await page.click('[data-testid="module-design"]');
    await expect(page.locator('[data-testid="dock-panel-kennzahlen"]')).toBeVisible();

    // Vor der Aktion: kennzahlen NICHT eingeklappt, kvOffen manuell offen —
    // beides muss durch die Preset-Anwendung verschwinden/wechseln.
    await page.click('[data-testid="kv-oeffnen"]');
    await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toBeVisible();
    await expect(page.locator('[data-testid="dock-panel-kennzahlen-tab"]')).toHaveCount(0);

    await page.fill('[data-testid="kosmo-input"]', 'Räum die Oberfläche auf');
    await page.click('[data-testid="kosmo-send"]');

    const zeile = page.locator('[data-testid="kosmo-ui-aktion-dock"]');
    await expect(zeile).toBeVisible({ timeout: 15_000 });
    await expect(zeile).toContainText('Fokus');

    // Layout wechselte tatsächlich: kvOffen ist zu, kennzahlen eingeklappt —
    // exakt die Design-Fokus-Kuration.
    await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="dock-panel-kennzahlen-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="dock-preset-fokus"]')).toHaveAttribute('aria-pressed', 'true');
  });
});
