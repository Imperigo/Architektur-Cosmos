import { expect, test, type Page } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * V0.7.2 W2-C (Paket 03, `docs/V072-VISUELLES-UPDATE-SPEZ.md` §4 «Phasen &
 * Ordnung») — `PhasenLeiste.tsx` (Segmented-Pill der 5 SIA-112-Gruppen).
 * Ergänzt `sia-phase-select`/`statusleiste-phase` (KosmoDesign, fein) —
 * beide bleiben unverändert funktionsfähig (Harter Vertrag, Spec §11),
 * dieselbe `design.siaPhaseSetzen`-Quelle.
 *
 * E-K5 (`docs/V0812-SPEZ.md`, Sanktion 4, 21.07.2026): die `PhasenLeiste`
 * ist eine Projekt-Eigenschaft geworden — sie rendert nicht mehr im
 * App-Header/`.app-heim-werkzeuge`, sondern eingebettet in den Projekt-
 * Einstellungen (`shell/Einstellungen.tsx`, Sektion `einstellungen-phase`).
 * MIGRATION dieser Datei (Bauagenten-Grep-Rechenschaft, `docs/V0812-SPEZ.md`
 * §E-K5): jeder Test öffnet jetzt zuerst die Einstellungen
 * (`einstellungen-oeffnen`) — die Locator/Assertions auf `phasen-leiste*`
 * selbst bleiben WÖRTLICH unverändert (dieselbe Komponente, derselbe
 * Testid-Vertrag), nur der Weg dorthin ist neu. Wo ein Test danach ein
 * Element AUSSERHALB des Einstellungen-Panels prüft (z. B.
 * `statusleiste-phase`), schliesst er das Panel zuerst wieder (Escape,
 * bestehender Schliess-Weg aus `Einstellungen.tsx`).
 */

async function zentraleLaden(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

/** E-K5: PhasenLeiste ist nur bei geöffneten Projekt-Einstellungen im DOM
 *  sichtbar — Standardweg für jeden Test dieser Datei. */
async function einstellungenOeffnen(page: Page): Promise<void> {
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="einstellungen-phase"]')).toBeVisible();
}

/** Schliesst die Einstellungen wieder (Escape, s. `Einstellungen.tsx`) —
 *  gebraucht, wenn ein Test danach ein Element AUSSERHALB des Panels
 *  prüft (z. B. `statusleiste-phase` in KosmoDesign). */
async function einstellungenSchliessen(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toHaveCount(0);
}

const SEGMENT_LABEL: Record<number, string> = {
  1: '1 STRATEGIE',
  2: '2 VORSTUDIE',
  3: '3 PROJEKTIERUNG',
  4: '4 AUSSCHREIBUNG',
  5: '5 REALISIERUNG',
};

test('PhasenLeiste: sichtbar mit genau 5 Segmenten, Labels 1..5 (in den Projekt-Einstellungen)', async ({ page }) => {
  await zentraleLaden(page);
  await einstellungenOeffnen(page);
  const leiste = page.locator('[data-testid="phasen-leiste"]');
  await expect(leiste).toBeVisible();

  for (const [n, label] of Object.entries(SEGMENT_LABEL)) {
    const segment = page.locator(`[data-testid="phasen-leiste-${n}"]`);
    await expect(segment).toBeVisible();
    await expect(segment).toContainText(label);
  }
  await expect(page.locator('[data-testid^="phasen-leiste-"]')).toHaveCount(5);
});

test('Default-Projektstand (Wettbewerb) markiert genau Segment 2 aktiv', async ({ page }) => {
  await zentraleLaden(page);
  await einstellungenOeffnen(page);
  await expect(page.locator('[data-testid="phasen-leiste-2"]')).toHaveAttribute('aria-pressed', 'true');
  for (const n of [1, 3, 4, 5]) {
    await expect(page.locator(`[data-testid="phasen-leiste-${n}"]`)).toHaveAttribute('aria-pressed', 'false');
  }
});

test('Klick auf «4 AUSSCHREIBUNG» ruft design.siaPhaseSetzen — sichtbar im statusleiste-phase-Badge (KosmoDesign)', async ({
  page,
}) => {
  await zentraleLaden(page);
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG (Muster faehigkeiten-phasen.spec.ts)

  await einstellungenOeffnen(page);
  await page.click('[data-testid="phasen-leiste-4"]');
  await expect(page.locator('[data-testid="phasen-leiste-4"]')).toHaveAttribute('aria-pressed', 'true');
  await einstellungenSchliessen(page);
  await expect(page.locator('[data-testid="statusleiste-phase"]')).toContainText('Ausschreibung');
});

test('Feinere echte Phase (Baueingabe/bewilligung) aktiviert die richtige Gruppe (3 PROJEKTIERUNG) und trägt die feine title-Beschriftung', async ({
  page,
}) => {
  await zentraleLaden(page);
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="projekt-menu-toggle"]');
  await waehleOption(page, 'sia-phase-select', 'bewilligung');

  await einstellungenOeffnen(page);
  const segment3 = page.locator('[data-testid="phasen-leiste-3"]');
  await expect(segment3).toHaveAttribute('aria-pressed', 'true');
  await expect(segment3).toHaveAttribute('title', /Baueingabe/);
  // Die anderen vier bleiben inaktiv — genau EIN Segment aktiv.
  for (const n of [1, 2, 4, 5]) {
    await expect(page.locator(`[data-testid="phasen-leiste-${n}"]`)).toHaveAttribute('aria-pressed', 'false');
  }
});

test('Klick auf ein Segment normalisiert IMMER auf die repräsentative Phase der Gruppe — auch wenn die Gruppe schon (feiner) aktiv war', async ({
  page,
}) => {
  await zentraleLaden(page);
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="projekt-menu-toggle"]');
  await waehleOption(page, 'sia-phase-select', 'bewilligung'); // Gruppe 3, aber NICHT die repräsentative Phase (bauprojekt)

  await einstellungenOeffnen(page);
  await page.click('[data-testid="phasen-leiste-3"]');
  await einstellungenSchliessen(page);
  // Repräsentative Phase von Gruppe 3 ist 'bauprojekt' (Spec §4) —
  // siaPhaseLabel('bauprojekt') = 'Bauprojekt (SIA 32)', NICHT mehr
  // 'Baueingabe (SIA 33)'.
  await expect(page.locator('[data-testid="statusleiste-phase"]')).toContainText('Bauprojekt (SIA 32)');
});

test('reduced-motion: Segmente bleiben voll funktionsfähig (Klick/aria-pressed unverändert, keine blockierende Transition)', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await zentraleLaden(page);

  await einstellungenOeffnen(page);
  await page.click('[data-testid="phasen-leiste-5"]');
  await expect(page.locator('[data-testid="phasen-leiste-5"]')).toHaveAttribute('aria-pressed', 'true');

  // Globaler Riegel (aura.css: `@media (prefers-reduced-motion: reduce)`
  // kappt JEDE Transition auf 0.01ms) — greift automatisch, kein eigener
  // Sonderfall in `orbit-065.css` nötig (reine CSS-Transition, kein `rAF`).
  const dauer = await page
    .locator('[data-testid="phasen-leiste-5"]')
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(dauer).not.toBe('');
  // Browser normiert 0.01ms auf Sekunden, oft in wissenschaftlicher Notation
  // (z.B. "1e-05s") — hier zählt nur "verschwindend klein", kein exaktes
  // String-Format.
  const sekunden = Number.parseFloat(dauer);
  expect(sekunden).toBeLessThan(0.001);
});
