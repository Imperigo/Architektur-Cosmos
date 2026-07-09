import { expect, test } from '@playwright/test';

/**
 * Baugesuch-Blattsatz (v0.6.3 VP2, `docs/V063-VOLLPROJEKT-KONZEPT.md`
 * Abschnitt 4, Lücken-Batch 2, Owner-Hauptaufgabe K22) — Owner-Journey: TKB
 * laden → Publish öffnen → eine Wand + einen Schnitt anlegen (Vorbedingung
 * «mind. 1 Schnitt» — die TKB-Demo zeichnet nur Zonen/Decken, noch keine
 * Wände, s. `e2e/plan-lod.spec.ts`-Kommentar) → «Baugesuch»-Knopf → mehrere
 * Blätter + Set «Baugesuch» existiert + Ausnützungsnachweis-Blatt-Text
 * sichtbar → EIN Undo räumt ALLES weg.
 *
 * `window.__kosmo` (Test-Hook, `App.tsx`) baut die Wand direkt über
 * `design.wandZeichnen`/`design.aufbauErstellen` — dasselbe Muster wie
 * `e2e/sim-efh.spec.ts`/`e2e/module.spec.ts`. Publish-UI-Klicks
 * (`add-sheet`/`place-section`/`baugesuch-erstellen`) bleiben echte
 * Nutzer-Interaktion, kein Test-Hook-Shortcut für den eigentlichen Auftrag.
 *
 * NICHT im Worktree ausgeführt (Owner-Auftrag) — der Koordinator fährt ihn
 * nach dem Einpflegen.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        undo: () => void;
        doc: {
          byKind: (k: string) => { id: string; name?: string }[];
        };
      };
      open: (s: string) => void;
    };
  }
}

test('Baugesuch: TKB → Publish → Wand + Schnitt → Baugesuch-Knopf → mehrere Blätter + Set + Ausnützungsnachweis sichtbar → Undo räumt alles', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="load-tkb"]');
  await page.waitForSelector('text=KENNZAHLEN');

  // Die TKB-Demo hat noch keine Wände/Volumen — `schnittLinie()` im
  // Publish-Workspace braucht Bauteile für die Schnittebenen-Bbox. Eine
  // einfache Wand direkt über den Test-Hook (wie `e2e/sim-efh.spec.ts`).
  await page.evaluate(() => {
    const k = window.__kosmo;
    const storeyId = k.state().activeStoreyId;
    const aufbau = k.run('design.aufbauErstellen', {
      name: 'AW Beton 36',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
    });
    const assemblyId = aufbau.patches[0]!.id;
    const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      k.run('design.wandZeichnen', { storeyId, a, b, assemblyId });
    wand({ x: 0, y: 0 }, { x: 10000, y: 0 });
    wand({ x: 10000, y: 0 }, { x: 10000, y: 6000 });
    wand({ x: 10000, y: 6000 }, { x: 0, y: 6000 });
    wand({ x: 0, y: 6000 }, { x: 0, y: 0 });
  });

  await page.evaluate(() => window.__kosmo.open('publish'));
  const sheetsVorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('sheet').length);

  // Vorbedingung «mind. 1 Schnitt»: ein Arbeitsblatt mit einer platzierten Schnittlinie.
  // H-24-Fix (SIM-BEFUNDE): die Schnittlinie ist bei achsenparalleler
  // Schnittebene ein SVG-`line` mit Bounding-Breite 0 (x1===x2) — für
  // Playwright nie «visible» (dieselbe R4-Regel wie Baustein 18
  // `terrainSetzen`, `e2e/sim/bausteine.ts`). `toBeAttached` beweist die
  // Existenz der Linie, ohne von der zufälligen Schnittrichtung abzuhängen.
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="place-section"]');
  await expect(page.locator('[data-testid="sheet-canvas"] line').first()).toBeAttached();

  // Baugesuch-Knopf
  await page.click('[data-testid="baugesuch-erstellen"]');

  // Mehrere neue Blätter entstanden (Grundriss(e) + Schnitt + Ausnützungsnachweis)
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('sheet').length))
    .toBeGreaterThan(sheetsVorher + 2);

  // Set «Baugesuch» existiert in der Sets-Liste
  await expect(page.locator('[data-testid="pubset-karte"]', { hasText: 'Baugesuch' })).toBeVisible();

  // Ausnützungsnachweis-Blatt anwählen (als letztes erzeugt → höchster Index →
  // letzter Eintrag der Blattliste) — Titel-Text ist echter SVG-Text
  // (sheetToSvg rendert den Bild-Slot-Titel als <text>, nicht als Pixel im
  // eingebetteten Bild), darum genügt ein textbasierter Sichtbarkeits-Check.
  await page.locator('[data-testid^="sheet-"]:not([data-testid="sheet-canvas"])').last().click();
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText('Ausnützungsnachweis');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText('Prüfung durch die Behörde');

  // EIN Undo räumt ALLES weg: Blätter zurück auf den Vorzustand vor dem
  // Baugesuch-Knopf (nur noch das manuell angelegte Arbeitsblatt mit dem
  // Schnitt bleibt), Set «Baugesuch» verschwindet restlos.
  await page.evaluate(() => window.__kosmo.state().undo());
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('sheet').length))
    .toBe(sheetsVorher + 1);
  await expect(page.locator('[data-testid="pubset-karte"]', { hasText: 'Baugesuch' })).toHaveCount(0);
});

test('Baugesuch auf leerem Modell: EIN Blatt (Ausnützungsnachweis) + ehrliche Fehlliste in der Meldung', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.evaluate(() => window.__kosmo.open('publish'));

  await page.click('[data-testid="baugesuch-erstellen"]');

  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('sheet').length))
    .toBe(1);
  await expect(page.locator('[data-testid="pubset-karte"]', { hasText: 'Baugesuch' })).toBeVisible();
  // Ehrliche Lücken-Meldung (kein Schnitt, keine Parzelle) statt stillem Erfolg
  await expect(page.locator('text=Kein Schnitt')).toBeVisible();
});
