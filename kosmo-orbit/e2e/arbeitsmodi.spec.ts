import { expect, test, type Page } from '@playwright/test';

/**
 * Stream B (W1b, Aufgabe 9) — Arbeitsmodi-Automatik (BEWEGUNGSKONZEPT-066
 * §2-§5). Der Playwright-Default (`playwright.config.ts`) seedet
 * `kosmo.ui.v1` mit `modusAutomatik: false` — DIESE Suite ist die einzige
 * (neben einer künftigen `kosmo-ui-bruecke.spec.ts`), die die Automatik
 * ausdrücklich per `localStorage` wieder EINSCHALTET, um den Erkennungs-,
 * Chip- und Übersteuerungs-Pfad am lebenden Objekt zu beweisen — alle
 * anderen Bestandsspecs bleiben unberührt (s. `oberflaeche-*.spec.ts`).
 *
 * Deterministisch statt Sleep-Gambling: `page.clock.install()` +
 * `fastForward()` (Playwright 1.61) spult die 5s-Hysterese
 * (`HYSTERESE_MS`, `state/arbeitsmodi-kern.ts`) virtuell vor — kein
 * `waitForTimeout` auf echte Zeit.
 *
 * D1 (0.6.7) Härtung: `page.clock.install()` ALLEIN friert die Uhr NICHT
 * ein — laut Playwright-Doku («Clock.pauseAt») laufen Timer nach `install()`
 * normal in Echtzeit weiter, bis `pauseAt`/`runFor`/`fastForward`/`resume`
 * aufgerufen wird. Ohne das direkt folgende `pauseAt()` war die 5s-Hysterese
 * (`HYSTERESE_MS`) in Wahrheit ein ECHTER 5s-Timer, der zufällig meist VOR
 * jeder Prüfung fertig war (schnelle CI) — unter Last (paralleler
 * Sandbox-Nachbar) oder mit minimal mehr Rendergewicht lief er dem
 * Playwright-Standard-Assertion-Timeout (ebenfalls 5000ms) knapp davon und
 * die «noch nicht gewechselt»-Prüfungen wurden flaky. `pauseAt()` direkt
 * nach `install()` macht die Uhr wirklich deterministisch, wie der
 * Kommentar unten es schon immer beschrieb.
 */

async function oeffneMitAutomatikAn(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    // Überschreibt den Playwright-Default (`modusAutomatik: false`) gezielt
    // für diese Suite — Konzept §8: nur NEUE Specs schalten die Automatik
    // ausdrücklich ein.
    localStorage.setItem(
      'kosmo.ui.v1',
      JSON.stringify({ version: 1, modusAutomatik: true, modusFesthalten: false, phasenFokus: null }),
    );
  });
  await page.reload();
  // Uhr einfrieren, BEVOR die Design-Werkstatt (und damit die Arbeitsmodi-
  // Erkennung) überhaupt mountet — jeder danach gesetzte `setTimeout`
  // (Hysterese-Timer) ist ab hier virtuell steuerbar. `pauseAt()` ist der
  // Teil, der die Uhr TATSÄCHLICH anhält (`install()` allein lässt sie in
  // Echtzeit weiterlaufen, s. Suiten-Kommentar oben).
  await page.clock.install();
  await page.clock.pauseAt(Date.now());
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG + Standard-Aufbauten
}

const chip = (page: Page) => page.locator('[data-testid="modus-chip"]');

test('(a)+(b) 2D-Plan + Wandwerkzeug → Modus «Zeichnen» erst nach der 5s-Hysterese, Chip zeigt Modus + «automatisch»', async ({
  page,
}) => {
  await oeffneMitAutomatikAn(page);
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="tool-wand"]');

  // Signale stehen sofort (viewMode 2D + Zeichenwerkzeug), der Modus
  // wechselt aber NICHT sofort — Regel 2.3.2-Analogon auf Schicht 1: erst
  // nach `HYSTERESE_MS` (5s) Signal-Stabilität.
  // D1 (0.6.7, C-Befund): der Chip-Fallback heisst jetzt «Alle Werkzeuge»
  // statt des blossen «Voll» (DesignWorkspace.tsx ~Z.2942).
  await expect(chip(page)).toContainText('Alle Werkzeuge');
  await expect(chip(page)).toContainText('automatisch');

  await page.clock.fastForward(5001);

  await expect(chip(page)).toContainText('Modus: Zeichnen');
  await expect(chip(page)).toContainText('automatisch');
  // Ehrlichkeits-UI (§5): der Tooltip nennt die Begründung («2D-Plan
  // aktiv», «Zeichenwerkzeug aktiv…»).
  await expect(chip(page)).toHaveAttribute('title', /2D-Plan|Zeichenwerkzeug/);
});

test('(c) ausgeblendete Gruppen (Export/Fähigkeiten) bleiben über «Mehr…» vollständig erreichbar', async ({ page }) => {
  await oeffneMitAutomatikAn(page);
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="tool-wand"]');
  await page.clock.fastForward(5001);
  await expect(chip(page)).toContainText('Modus: Zeichnen');

  // Schicht 1: Export tritt im Modus «Zeichnen» ganz zurück (nur im Modus
  // «Exportieren» selbst prominent) — der Trigger ist NICHT mehr im Haupt-
  // band, kein unsichtbares Klick-Overlay (ROADMAP-253-Lehre).
  await expect(page.locator('[data-testid="export-menu-toggle"]')).toHaveCount(0);
  // «Fähigkeiten» (redundanter Zweitzugang zu «Ebenen») tritt ebenfalls
  // zurück, sobald ein Modus feststeht.
  await expect(page.locator('[data-testid="leiste-gruppe-faehigkeiten"]')).toHaveCount(0);

  // Erreichbarkeits-Garantie: beide Gruppen sind vollständig im
  // «Mehr…»-Überlaufmenü — nichts ist unerreichbar, nur unprominent.
  const mehr = page.locator('[data-testid="werkzeuge-mehr"]');
  await expect(mehr).toBeVisible();
  await mehr.click();
  const liste = page.locator('[data-testid="werkzeuge-mehr-liste"]');
  await expect(liste).toBeVisible();
  await expect(liste.locator('[data-testid="werkzeuge-mehr-eintrag-export-pdf"]')).toBeVisible();
  await expect(liste.locator('[data-testid="werkzeuge-mehr-eintrag-faehigkeiten-submission"]')).toBeVisible();

  // Ein Klick funktioniert wie der Original-Knopf — One-Click statt
  // unerreichbar.
  await liste.locator('[data-testid="werkzeuge-mehr-eintrag-faehigkeiten-submission"]').click();
  await expect(page.locator('[data-testid="submission-panel"]')).toBeVisible();
});

test('(d) manuelle Übersteuerung: Modus per Chip-Menü wechseln → «festgehalten», Automatik greift nicht mehr ein', async ({
  page,
}) => {
  await oeffneMitAutomatikAn(page);
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="tool-wand"]');
  await page.clock.fastForward(5001);
  await expect(chip(page)).toContainText('Modus: Zeichnen');
  await expect(chip(page)).toContainText('automatisch');

  // Chip-Menü öffnen (KMenu-Muster), einen ANDEREN Modus von Hand wählen.
  await chip(page).click();
  const menu = page.locator('[data-testid="modus-menu"]');
  await expect(menu).toBeVisible();
  await page.click('[data-testid="modus-item-exportieren"]');
  await expect(menu).toHaveCount(0); // Menü schliesst nach der Wahl

  await expect(chip(page)).toContainText('Modus: PDF exportieren');
  await expect(chip(page)).toContainText('festgehalten');

  // Die starken «Zeichnen»-Signale bleiben aktiv (tool=wand, viewMode=2d) —
  // ohne Übersteuerung würde die Automatik nach der Hysterese zurück auf
  // «Zeichnen» wechseln. Mit `modusFesthalten` greift sie NICHT mehr ein,
  // auch nicht nach reichlich weiterer virtueller Zeit.
  await page.clock.fastForward(20_000);
  await expect(chip(page)).toContainText('Modus: PDF exportieren');
  await expect(chip(page)).toContainText('festgehalten');
});

test('(e) Automatik aus → sofort Voll-UI, exakt wie der Playwright-Default', async ({ page }) => {
  await oeffneMitAutomatikAn(page);
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="tool-wand"]');
  await page.clock.fastForward(5001);
  await expect(chip(page)).toContainText('Modus: Zeichnen');
  await expect(page.locator('[data-testid="export-menu-toggle"]')).toHaveCount(0);

  await chip(page).click();
  await page.click('[data-testid="modus-automatik"]');

  // «modusAutomatik: aus schaltet die Erkennung ganz ab — dann zeigt die
  // Oberfläche wie heute alles» (Konzept §3, wörtlich): sofort Voll-UI,
  // kein Warten auf einen weiteren Signalwechsel.
  await expect(chip(page)).toContainText('Modus: Alle Werkzeuge');
  await expect(chip(page)).toContainText('automatik aus');
  await expect(page.locator('[data-testid="export-menu-toggle"]')).toBeVisible();
  await expect(page.locator('[data-testid="leiste-gruppe-faehigkeiten"]')).toBeVisible();

  // Auch nach beliebig viel weiterer virtueller Zeit bleibt es bei Voll-UI
  // — die Automatik ist wirklich abgeschaltet, kein verzögertes Nachholen.
  await page.clock.fastForward(30_000);
  await expect(chip(page)).toContainText('Modus: Alle Werkzeuge');
});
