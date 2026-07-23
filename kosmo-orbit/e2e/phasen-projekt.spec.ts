import { expect, test, type Page } from '@playwright/test';

/**
 * V0812-SPEZ E-K5 «Phase wird Projekt-Eigenschaft» (`docs/V0812-SPEZ.md`,
 * Sanktion 4, Matrix C-7) — die `PhasenLeiste` (App.tsx:1194ff) ist aus dem
 * Kopf/`app-heim-werkzeuge` gezogen; die SIA-112-Phase lebt jetzt als
 * Projekt-Eigenschaft in den Projekt-Einstellungen
 * (`shell/Einstellungen.tsx`, Sektion `einstellungen-phase`), unverändert
 * über den bestehenden `design.siaPhaseSetzen`-Command-Weg. Zusätzlich ein
 * «Transformieren»-Schritt (Beispiel Wettbewerb → Vorprojekt,
 * `docs/KONZEPT-PHASEN-PREPARE-DATA.md` §1.3) über den bestehenden
 * `bestaetigen()`-Bestätigungsweg — bewusst KEIN neuer Modal-Mechanismus
 * (Spec §E-K5 wörtlich), darum der einfache Ja/Nein-Dialog statt der
 * reicheren Vier-Block-Vorschau, die das Konzeptdokument für eine spätere
 * Etappe (M) beschreibt.
 *
 * Diese Suite beweist die drei harten Verträge aus der Spec:
 * 1. Anzeige — die Phase erscheint in den Einstellungen.
 * 2. Wechsel wirkt BEWEISBAR — der sichtbare Werkzeugbestand der ZEICHNEN-
 *    Insel ändert sich gemäss `state/phasen-matrix.ts` (dasselbe Paar
 *    Volumen/Mesh, 13→11 (v0.9.1: +gelaender/rampe), wie `e2e/phasen-matrix.spec.ts`s ZEICHNEN-Suite —
 *    hier über den NEUEN Einstellungen-Weg statt der PROJEKT-Insel).
 * 3. Transformieren-Dialog mit Bestätigung, Abbrechen bleibt wirkungslos,
 *    Undo stellt zurück.
 */

async function zentraleLaden(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

async function einstellungenSchliessen(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toHaveCount(0);
}

test.describe('Phase als Projekt-Eigenschaft — Anzeige in den Projekt-Einstellungen', () => {
  test('Kopf/app-heim-werkzeuge zeigen keine PhasenLeiste mehr — sie erscheint in den Projekt-Einstellungen mit dem Default-Projektstand (Wettbewerb, Segment 2)', async ({
    page,
  }) => {
    await zentraleLaden(page);

    // Harter Vertrag (Matrix C-7): Kopf ohne PhasenLeiste — weder im
    // `app-heim-werkzeuge`-Eck-Cluster der Zentrale...
    await expect(page.locator('[data-testid="app-heim-werkzeuge"] [data-testid="phasen-leiste"]')).toHaveCount(0);
    // ...noch als eigenständiges Element ausserhalb der Einstellungen.
    await expect(page.locator('[data-testid="phasen-leiste"]')).toHaveCount(0);

    await page.click('[data-testid="einstellungen-oeffnen"]');
    await expect(page.locator('[data-testid="einstellungen-panel"]')).toBeVisible();

    const sektion = page.locator('[data-testid="einstellungen-phase"]');
    await expect(sektion).toBeVisible();
    await expect(sektion).toContainText('Wettbewerb');

    const leiste = sektion.locator('[data-testid="phasen-leiste"]');
    await expect(leiste).toBeVisible();
    await expect(page.locator('[data-testid="phasen-leiste-2"]')).toHaveAttribute('aria-pressed', 'true');
    for (const n of [1, 3, 4, 5]) {
      await expect(page.locator(`[data-testid="phasen-leiste-${n}"]`)).toHaveAttribute('aria-pressed', 'false');
    }
  });
});

test.describe('Phase als Projekt-Eigenschaft — Wechsel wirkt beweisbar (ZEICHNEN-Insel, Phasen-Matrix)', () => {
  // Echter Produktions-Default `island` (Muster `phasen-matrix.spec.ts`) —
  // die ZEICHNEN-Insel existiert nur dort; die Einstellungen selbst öffnen
  // sich im Island-Modus über den Einstellungs-Kreis (`island-einstellungen-
  // kreis`, App.tsx PD4-Ersatz für den ausgeblendeten Header), nicht über
  // `einstellungen-oeffnen` (der sitzt im dort ausgeblendeten Header).
  test.use({ storageState: { cookies: [], origins: [] } });

  async function oeffneZeichnenLeiste(page: Page): Promise<void> {
    await page.hover('[data-testid="island-zeichnen-root"]');
    await expect(page.locator('[data-testid="island-zeichnen-leiste"]')).toBeVisible();
  }

  test('Segment-Wechsel in den Einstellungen (Wettbewerb → Ausschreibung) ändert den ZEICHNEN-Werkzeugbestand (13 → 11), Undo stellt Wettbewerb + Volumen/Mesh wieder her', async ({
    page,
  }) => {
    await zentraleLaden(page);
    await page.click('[data-testid="module-design"]');

    await oeffneZeichnenLeiste(page);
    await expect(page.locator('[data-testid="island-zeichnen-leiste"] .isl-werkzeug')).toHaveCount(14);
    await expect(page.locator('[data-testid="island-werkzeug-volumen"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-werkzeug-mesh"]')).toBeVisible();

    await page.click('[data-testid="island-einstellungen-kreis"]');
    await expect(page.locator('[data-testid="einstellungen-phase"]')).toBeVisible();
    await page.click('[data-testid="phasen-leiste-4"]');
    await expect(page.locator('[data-testid="phasen-leiste-4"]')).toHaveAttribute('aria-pressed', 'true');
    await einstellungenSchliessen(page);

    await oeffneZeichnenLeiste(page);
    await expect(page.locator('[data-testid="island-zeichnen-leiste"] .isl-werkzeug')).toHaveCount(12);
    await expect(page.locator('[data-testid="island-werkzeug-volumen"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="island-werkzeug-mesh"]')).toHaveCount(0);

    // Kernel-Undo (dieselbe Taste wie `phasen-matrix.spec.ts`) —
    // `design.siaPhaseSetzen` ist ein gewöhnlicher, undo-fähiger Command,
    // egal über welche Oberfläche er geschrieben wurde.
    await page.keyboard.press('Control+z');
    await oeffneZeichnenLeiste(page);
    await expect(page.locator('[data-testid="island-zeichnen-leiste"] .isl-werkzeug')).toHaveCount(14);
    await expect(page.locator('[data-testid="island-werkzeug-volumen"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-werkzeug-mesh"]')).toBeVisible();
  });
});

test.describe('Phase als Projekt-Eigenschaft — «Transformieren»-Dialog (bestehender bestaetigen()-Weg)', () => {
  test('Transformieren zeigt den bestehenden Bestätigungsdialog (Wettbewerb → Vorprojekt); Abbrechen wirkt nicht, Bestätigen schreibt design.siaPhaseSetzen, Undo stellt zurück', async ({
    page,
  }) => {
    await zentraleLaden(page);
    await page.click('[data-testid="einstellungen-oeffnen"]');

    const transformKnopf = page.locator('[data-testid="einstellungen-phase-transformieren"]');
    await expect(transformKnopf).toBeVisible();
    await expect(transformKnopf).toBeEnabled();
    await expect(transformKnopf).toContainText('Vorprojekt');

    // Kein neuer Modal-Mechanismus (Spec §E-K5 wörtlich) — derselbe
    // `bestaetigen()`-Dialog wie überall sonst im Repo (`bestaetigung`/
    // `bestaetigung-ja`/`bestaetigung-nein`).
    await transformKnopf.click();
    const dialog = page.locator('[data-testid="bestaetigung"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Wettbewerb');
    await expect(dialog).toContainText('Vorprojekt');

    // Abbrechen: Phase bleibt unverändert.
    await page.click('[data-testid="bestaetigung-nein"]');
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('[data-testid="phasen-leiste-2"]')).toHaveAttribute('aria-pressed', 'true');

    // Bestätigen: schreibt design.siaPhaseSetzen('vorprojekt') — Gruppe 3
    // (PROJEKTIERUNG) aktiv, feine title-Beschriftung «Vorprojekt (SIA 31)»
    // (dasselbe Muster wie `phasen-leiste.spec.ts`s Baueingabe-Fall).
    await transformKnopf.click();
    await expect(dialog).toBeVisible();
    await page.click('[data-testid="bestaetigung-ja"]');
    await expect(dialog).toHaveCount(0);

    const segment3 = page.locator('[data-testid="phasen-leiste-3"]');
    await expect(segment3).toHaveAttribute('aria-pressed', 'true');
    await expect(segment3).toHaveAttribute('title', /Vorprojekt/);
    await expect(page.locator('[data-testid="einstellungen-phase"]')).toContainText('Vorprojekt');

    // Undo (Kernel-Command, s.o.) stellt Wettbewerb/Segment 2 wieder her.
    await einstellungenSchliessen(page);
    await page.keyboard.press('Control+z');
    await page.click('[data-testid="einstellungen-oeffnen"]');
    await expect(page.locator('[data-testid="phasen-leiste-2"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="einstellungen-phase"]')).toContainText('Wettbewerb');
  });
});
