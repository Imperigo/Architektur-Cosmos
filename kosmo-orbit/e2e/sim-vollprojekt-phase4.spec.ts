import { expect, test } from '@playwright/test';
import * as B from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';

// Der Undo-Beweis (Akt 5) läuft im Publish-Workspace — dessen Werkzeugleiste
// hat KEINEN eigenen «undo»-Knopf (der lebt nur in `DesignWorkspace.tsx`,
// `data-testid="undo"`). Muster `e2e/baugesuch.spec.ts` Z.22-36: derselbe
// lokale Test-Hook-Cast auf `window.__kosmo.state().undo()`.
declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        undo: () => void;
        doc: { byKind: (k: string) => { id: string; name?: string }[] };
      };
      open: (s: string) => void;
    };
  }
}

/**
 * VP6 Phase 4 — Bewilligungsverfahren (v0.6.3,
 * `docs/V063-VOLLPROJEKT-KONZEPT.md` §2 «Phase 33» (Bewilligungs-Teil),
 * Owner-Hauptaufgabe K22) — vierte von sechs eigenständig lauffähigen
 * Phasen-Specs, s. Kopfkommentar `sim-vollprojekt-phase1.spec.ts`.
 *
 * Muster `e2e/baugesuch.spec.ts` (VP2): Baugrenze setzen (Voraussetzung für
 * die Situation), einen Schnitt platzieren (Voraussetzung «mind. 1 Schnitt»,
 * `derive/baugesuch.ts` Z.109), dann den «Baugesuch»-Knopf → Set «Baugesuch»
 * + Ausnützungsnachweis-Blatt + die ehrliche Fehlliste (die
 * Fassaden/Ansichten-Lücke ist STRUKTURELL immer da — `SheetPlacement.view`
 * kennt keinen Fassaden-Typ, `derive/baugesuch.ts` Z.126-129) → EIN Undo
 * räumt alles weg.
 */

test('VP6 Phase 4 — Bewilligung: Preset (KV+Sonne) → Schnitt platzieren → Baugesuch-Blattsatz + ehrliche Fehlliste → Undo', async ({
  page,
}) => {
  test.setTimeout(180_000);

  const szenario = SZENARIEN.mfh;

  // ---------------------------------------------------------------------
  // Akt 1 — Teilphase «Bewilligung» (Baustein 21, Preset: KV+Sonne im
  // Fokus, Umbau-Filter-Empfehlung «neu») + Plan-Detaillierungsgrad
  // «Bauprojekt» (Baustein 3 — SIA 33 fasst Bauprojekt/Bewilligung im
  // Detaillierungsgrad zusammen).
  // ---------------------------------------------------------------------
  await B.projektStarten(page, szenario);
  await B.phaseWechseln(page, 'bewilligung', true);

  // Preset-Assertion (Owner-Auftrag, `phasen-presets.ts` PHASEN_PRESETS.bewilligung.imFokus): KV + Sonne im Fokus.
  await expect(page.locator('[data-testid="faehigkeit-kv"]')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-testid="faehigkeit-sonne"]')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-testid="faehigkeit-bauablauf"]')).toHaveCSS('opacity', '0.6'); // gedämpft, nicht entfernt

  // ---------------------------------------------------------------------
  // Akt 2 — Baugrenze (Boundary) — Voraussetzung für die Situation im
  // Baugesuch-Satz — plus Rohbau EG (Wände+Decke).
  // ---------------------------------------------------------------------
  await B.parzelleSetzen(page, szenario);
  const egId = await page.evaluate(() => window.__kosmo.state().activeStoreyId);
  const regelgeschoss = [
    { x: 0, y: 0 },
    { x: 30000, y: 0 },
    { x: 30000, y: 14000 },
    { x: 0, y: 14000 },
  ];
  await B.waendeZeichnen(
    page,
    [
      { a: regelgeschoss[0]!, b: regelgeschoss[1]! },
      { a: regelgeschoss[1]!, b: regelgeschoss[2]! },
      { a: regelgeschoss[2]!, b: regelgeschoss[3]! },
      { a: regelgeschoss[3]!, b: regelgeschoss[0]! },
    ],
    'AW',
  );
  await page.evaluate(
    ({ storeyId, outline }) => window.__kosmo.run('design.deckeZeichnen', { storeyId, outline }),
    { storeyId: egId, outline: regelgeschoss },
  );
  // Plan-Detaillierungsgrad «Bauprojekt» (Baustein 3) — ERST nachdem echte
  // Geometrie steht UND NOCH in KosmoDesign (Baustein 3 braucht die Plan-
  // Ansicht, nicht Publish).
  await B.phaseSchalten(page, 'bauprojekt');

  // ---------------------------------------------------------------------
  // Akt 3 — Vorbedingung «mind. 1 Schnitt» (Baustein 16, `place-section`).
  // ---------------------------------------------------------------------
  await page.evaluate(() => window.__kosmo.open('publish'));
  const sheetsVorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('sheet').length);
  await B.blattPublizieren(page, { art: 'section' });
  // H-24 (SIM-BEFUNDE): eine achsenparallele Schnittlinie hat Bounding-Breite
  // 0 (x1===x2) — nie «visible» für Playwright (R4, wie Baustein 18
  // `terrainSetzen`). `toBeAttached` beweist die Existenz, unabhängig von
  // der zufälligen Schnittrichtung.
  await expect(page.locator('[data-testid="sheet-canvas"] line').first()).toBeAttached();

  // ---------------------------------------------------------------------
  // Akt 4 — Baugesuch-Knopf: mehrere neue Blätter (Situation + Grundriss(e)
  // + Schnitt + Ausnützungsnachweis), Set «Baugesuch» existiert, die
  // ehrliche Fehlliste (Fassaden/Ansichten) steht in der Meldung.
  // ---------------------------------------------------------------------
  await page.click('[data-testid="baugesuch-erstellen"]'); // [Quelle: PublishWorkspace.tsx Z.416-421]
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('sheet').length))
    .toBeGreaterThan(sheetsVorher + 2);
  await expect(page.locator('[data-testid="pubset-karte"]', { hasText: 'Baugesuch' })).toBeVisible();

  const meldung = page.locator('[data-testid="meldung-info"]').first(); // [Quelle: PublishWorkspace.tsx Z.242-250 — «Fehlt/Lücke» → ton 'info']
  await expect(meldung).toBeVisible();
  await expect(meldung).toContainText('Fehlt/Lücke');
  await expect(meldung).toContainText('Fassaden/Ansichten'); // [Quelle: derive/baugesuch.ts Z.126-129 — strukturelle Lücke, immer vorhanden]

  // Ausnützungsnachweis-Blatt (als letztes erzeugt → letzter Eintrag der Blattliste).
  await page.locator('[data-testid^="sheet-"]:not([data-testid="sheet-canvas"])').last().click();
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText('Ausnützungsnachweis');
  await expect(page.locator('[data-testid="sheet-canvas"]')).toContainText('Prüfung durch die Behörde'); // [Quelle: derive/ausnuetzungsnachweis.ts BAUGESUCH_HINWEIS]

  // ---------------------------------------------------------------------
  // Akt 5 — Undo-Beweis: EIN Undo räumt den ganzen Baugesuch-Satz weg (nur
  // das manuell angelegte Schnitt-Blatt bleibt), Set «Baugesuch» verschwindet.
  // Publish-Workspace hat keinen eigenen «undo»-Knopf (s. Kommentar oben) —
  // derselbe globale Verlauf über den Test-Hook, wie `baugesuch.spec.ts`.
  // ---------------------------------------------------------------------
  await page.evaluate(() => window.__kosmo.state().undo());
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('sheet').length))
    .toBe(sheetsVorher + 1);
  await expect(page.locator('[data-testid="pubset-karte"]', { hasText: 'Baugesuch' })).toHaveCount(0);

  // 🔒 Der grösste 🔒-Punkt der ganzen Kette (Konzept §2, Phase 33, Punkt e):
  // die eigentliche Behörden-Einreichung, die Bewilligung selbst,
  // Einsprachefristen und Nachbarrecht sind reine Realakte — Kosmo stellt
  // hier NUR die Unterlagen zusammen, ersetzt nie das Bauamt.
});
