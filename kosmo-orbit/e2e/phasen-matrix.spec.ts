import { expect, test, type Page } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * V0812-SPEZ E-M (P-M «Phasen-Matrix deklarativ») — `state/phasen-matrix.ts`s
 * `PHASEN_MATRIX`/`werkzeugInPhaseSichtbar()` konsumiert in der ZEICHNEN-
 * Insel-Leiste (`modules/design/island/IslandShell.tsx`): Werkzeuge
 * ausserhalb der aktiven `doc.settings.siaPhase` werden HART aus der Leiste
 * entfernt (kein Dimmen — Kopfkommentar `phasen-matrix.ts`). Von den 11
 * ZEICHNEN-Werkzeugen betrifft das laut Konzepttabelle
 * (`docs/KONZEPT-PHASEN-PREPARE-DATA.md` §1.2, R7) genau zwei: Volumen und
 * Mesh — beide fallen ab «4 AUSSCHREIBUNG» heraus, sind in «1 STRATEGIE»
 * (und jeder früheren/mittleren Phase bis Bewilligung/Ausführung) sichtbar.
 * Diese Suite beweist genau diesen einzigen echten Fall der Etappe S.
 *
 * `shell/BodenDock.tsx` konsumiert dieselbe Funktion für die 8 Stations-Ids
 * — das Konzept beschreibt dafür keine eigene Zeile, alle 8 bleiben in jeder
 * Phase sichtbar (die zweite Suite unten beweist den No-op ausdrücklich,
 * damit die Verdrahtung nicht unbemerkt regressiert).
 *
 * **ZWEI verschiedene Oberflächen, bewusst:**
 * - Die ZEICHNEN-Suite braucht den ECHTEN Produktions-Default
 *   `designOberflaeche:'island'` (kein globaler Manuell-Seed) — dieselbe
 *   Ausnahme wie `island-ui.spec.ts` (`test.use({ storageState: { cookies:
 *   [], origins: [] } })`). **Fund dieses Bauagenten:** im Island-Modus
 *   blendet `App.tsx`s `bodenDockAusgeblendet`-Guard (PD3c, Owner-Befehl
 *   17.07., «alles in die islands») NICHT NUR das `BodenDock`, sondern den
 *   GANZEN `app-header` aus — UND DAMIT AUCH `PhasenLeiste` (App.tsx Z.777:
 *   `{!bodenDockAusgeblendet && screen !== 'home' && (<header>...
 *   <PhasenLeiste/>...</header>)}`). Die Phase lässt sich im Island-Modus
 *   darum NUR über die PROJEKT-Insel (`island-werkzeug-phase` →
 *   `island-phase-sia-select`, `modules/design/island/inhalte/projekt.tsx`)
 *   setzen — das ist «der bestehende siaPhase-Weg» in DIESER Oberfläche.
 * - Die Boden-Dock-Suite braucht umgekehrt den globalen Manuell-Seed
 *   (`playwright.config.ts`s Default, KEIN `storageState`-Override) — nur
 *   dort ist `bodenDockAusgeblendet` false und `BodenDock`/`PhasenLeiste`
 *   existieren überhaupt im DOM (exakt das Muster von `boden-dock.spec.ts`,
 *   das denselben Default nutzt).
 */

async function seed(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

test.describe('Phasen-Matrix — ZEICHNEN-Insel-Leiste (harte Ausblendung, kein Dimmen)', () => {
  // Echter Produktions-Default `island` — s. Kopfkommentar. Ohne diesen
  // Override säh diese Suite den globalen Manuell-Seed und damit die
  // klassische Werkzeugleiste statt der Inseln.
  test.use({ storageState: { cookies: [], origins: [] } });

  /** Hover öffnet die Insel-Leiste (Muster `island-ui.spec.ts`s
   *  `oeffneInsel`) — explizit VOR jeder Zählung erneut aufgerufen, damit
   *  der 1000ms-Rückklapp-Timer (`IslandShell.tsx` `RUECKKLAPP_MS`)
   *  zwischen einer Aktion in einer ANDEREN Insel und der Zählung hier nie
   *  dazwischenfunkt. */
  async function oeffneZeichnenLeiste(page: Page): Promise<void> {
    await page.hover('[data-testid="island-zeichnen-root"]');
    await expect(page.locator('[data-testid="island-zeichnen-leiste"]')).toBeVisible();
  }

  /** Setzt die SIA-Teilphase über die PROJEKT-Insel (`island-werkzeug-phase`
   *  → Stufe 2 zeigt sofort `PhaseAuswahl`, `inhalte/projekt.tsx`) — der
   *  EINZIGE siaPhase-Schreibweg im Island-Modus (s. Kopfkommentar: die
   *  Kopfzeilen-`PhasenLeiste` existiert hier nicht). Derselbe Command
   *  (`design.siaPhaseSetzen`) wie die Kopfzeile in `phasen-leiste.spec.ts`. */
  async function setzeSiaPhaseUeberInsel(page: Page, siaPhase: string): Promise<void> {
    await page.hover('[data-testid="island-projekt-root"]');
    await expect(page.locator('[data-testid="island-projekt-leiste"]')).toBeVisible();
    // Ein zweiter Klick auf ein BEREITS offenes Popup-Werkzeug eskaliert zu
    // Stufe 3 (`IslandShell.tsx`s `aufWerkzeugKlick`) — dieser Helfer wird
    // in EINEM Test mehrfach aufgerufen (Phasenwechsel), darum immer zuerst
    // sauber auf `leiste` zurückschliessen, falls das Phase-Popup aus einem
    // vorigen Aufruf noch offen steht.
    const popupSchliessen = page.locator('[data-testid="island-phase-popup-schliessen"]');
    if (await popupSchliessen.isVisible()) await popupSchliessen.click();
    await page.click('[data-testid="island-werkzeug-phase"]');
    await expect(page.locator('[data-testid="island-phase-popup"]')).toBeVisible();
    await waehleOption(page, 'island-phase-sia-select', siaPhase);
  }

  const ZEICHNEN_OHNE_R7 = ['auswahl', 'wand', 'oeffnung', 'zone', 'dach', 'treppe', 'stuetze', 'skizze', 'messen'];

  // v0.9.1 P-B2/P-B1: ZEICHNEN 11→13 (gelaender/rampe additiv; beide stehen bewusst NICHT in phasen-matrix.ts — ungelistete Ids bleiben in jeder Phase sichtbar, s. P-B2-Entscheid ROADMAP 621), Ausschreibung damit 13−2=11.
  test('1 STRATEGIE: alle 13 ZEICHNEN-Werkzeuge, inkl. Volumen/Mesh', async ({ page }) => {
    await seed(page);
    await page.click('[data-testid="module-design"]');

    await setzeSiaPhaseUeberInsel(page, 'strategie');
    await oeffneZeichnenLeiste(page);

    await expect(page.locator('[data-testid="island-zeichnen-leiste"] .isl-werkzeug')).toHaveCount(13);
    await expect(page.locator('[data-testid="island-werkzeug-volumen"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-werkzeug-mesh"]')).toBeVisible();
  });

  test('4 AUSSCHREIBUNG: Volumen + Mesh fallen hart heraus, die übrigen 11 bleiben erreichbar', async ({ page }) => {
    await seed(page);
    await page.click('[data-testid="module-design"]');

    await setzeSiaPhaseUeberInsel(page, 'ausschreibung');
    await oeffneZeichnenLeiste(page);

    await expect(page.locator('[data-testid="island-zeichnen-leiste"] .isl-werkzeug')).toHaveCount(11);
    await expect(page.locator('[data-testid="island-werkzeug-volumen"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="island-werkzeug-mesh"]')).toHaveCount(0);
    for (const id of ZEICHNEN_OHNE_R7) {
      await expect(page.locator(`[data-testid="island-werkzeug-${id}"]`), `Werkzeug ${id}`).toBeVisible();
    }
  });

  test('Phasenwechsel Strategie→Ausschreibung ändert den sichtbaren Werkzeugbestand beweisbar (13 → 11), Undo stellt Strategie + Volumen/Mesh wieder her', async ({
    page,
  }) => {
    await seed(page);
    await page.click('[data-testid="module-design"]');

    await setzeSiaPhaseUeberInsel(page, 'strategie');
    await oeffneZeichnenLeiste(page);
    await expect(page.locator('[data-testid="island-zeichnen-leiste"] .isl-werkzeug')).toHaveCount(13);

    await setzeSiaPhaseUeberInsel(page, 'ausschreibung');
    await oeffneZeichnenLeiste(page);
    await expect(page.locator('[data-testid="island-zeichnen-leiste"] .isl-werkzeug')).toHaveCount(11);
    await expect(page.locator('[data-testid="island-werkzeug-volumen"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="island-werkzeug-mesh"]')).toHaveCount(0);

    // Kernel-Undo (dieselbe Taste wie überall im Repo, z.B. `griffe.spec.ts`)
    // — `design.siaPhaseSetzen` ist ein gewöhnlicher, undo-fähiger Command
    // (Konzeptdokument §1.4: «einziger Schreibweg... damit Undo/Yjs/.kosmo
    // unverändert stimmen»).
    await page.keyboard.press('Control+z');
    await oeffneZeichnenLeiste(page);
    await expect(page.locator('[data-testid="island-zeichnen-leiste"] .isl-werkzeug')).toHaveCount(13);
    await expect(page.locator('[data-testid="island-werkzeug-volumen"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-werkzeug-mesh"]')).toBeVisible();
  });
});

test.describe('Phasen-Matrix — Boden-Dock (8 Stations-Ids, Konzept kennt keine Stations-Zeilen)', () => {
  // Bewusst OHNE storageState-Override: der globale Manuell-Seed
  // (`playwright.config.ts`, `kosmoUiV1SeedMitManuell()`) ist hier nötig,
  // WEIL `BodenDock` im Island-Modus der design-Station gar nicht existiert
  // (`App.tsx`s `bodenDockAusgeblendet`-Guard, s. Kopfkommentar) — exakt
  // derselbe Default wie `boden-dock.spec.ts`.
  //
  // Migrations-Fund E-K5 (`docs/V0812-SPEZ.md`, Sanktion 4, Bauagenten-
  // Rechenschaft): die `PhasenLeiste` existierte hier bisher im
  // `app-header` (dieser Suite-Modus blendet ihn NICHT aus, anders als der
  // Island-Modus oben) — sie klickte `phasen-leiste-4`/`-1` also wörtlich
  // im Kopf. Seit E-K5 rendert `PhasenLeiste` NIRGENDS mehr im Header; der
  // einzige verbleibende Schreibweg hier ist die eingebettete `PhasenLeiste`
  // in den Projekt-Einstellungen (`shell/Einstellungen.tsx`, Sektion
  // `einstellungen-phase`) — dieselbe Komponente/Testids, nur hinter
  // `einstellungen-oeffnen` erreichbar. Kein Konsum-Verhalten geändert (das
  // BodenDock bleibt ein No-op-Konsument), nur der Phasenwechsel-Weg.
  test('Boden-Dock bleibt bei jedem Phasenwechsel bei genau 8 Knöpfen (No-op-Konsum, wörtlich verdrahtet)', async ({
    page,
  }) => {
    await seed(page);
    await page.click('[data-testid="module-design"]');
    await expect(page.locator('[data-testid="boden-dock"] .boden-dock-knopf')).toHaveCount(8);

    await page.click('[data-testid="einstellungen-oeffnen"]');
    await page.click('[data-testid="phasen-leiste-4"]');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="einstellungen-panel"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="boden-dock"] .boden-dock-knopf')).toHaveCount(8);

    await page.click('[data-testid="einstellungen-oeffnen"]');
    await page.click('[data-testid="phasen-leiste-1"]');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="einstellungen-panel"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="boden-dock"] .boden-dock-knopf')).toHaveCount(8);
  });
});
