import { expect, test, type Page } from '@playwright/test';
import { waehleOption } from './helfer/waehleOption';

/**
 * Serie J / Batch J3b — Tätigkeits-Adaption in der KosmoDesign-Werkzeugleiste
 * (SERIE-J-BUILDPLAN.md Abschnitt 2/3, Abnahme Abschnitt 5 "J3b"). Die
 * Werkzeuggruppen tragen jetzt eine dynamische Fokus-Klasse
 * (`adaptiveFokusStufe`) statt einer festen T7-Basis — diese Suite beweist
 * die drei harten Anti-Nerv-Regeln am lebenden Objekt:
 *
 * 1. Feste Anker: NIE DOM-Umordnung, nur className (Regel 2.3.1) — die
 *    Reihenfolge der Werkzeug-`data-testid`s bleibt exakt gleich, egal welche
 *    Fokus-Stufe gerade gilt.
 * 2. Freeze während einer Aktion (Punktkette offen) + 2s-Debounce danach,
 *    bevor eine Zeichnen-Demotion wieder einfällt (Regel 2.3.2).
 * 3. Transparenz: `adaption-hinweis` erscheint nur, wenn etwas wirklich unter
 *    seine T7-Basis gedimmt ist (Regel 2.3.5).
 *
 * Hinweis zur Phase: ein frisch bootstrapptes Projekt startet in der Phase
 * `werkplan` (`packages/kosmo-kernel/src/model/doc.ts`) — dort hebt die
 * Matrix (2.2) die Export-Demotion planmässig gleich wieder an (bereits
 * J3a-getestet: "Werkplan braucht Export laufend"). Tests, die die reine
 * Zeichnen-Demotion von Export beweisen wollen, setzen die Phase daher
 * explizit auf `vorprojekt`; die `ebenen`-Gruppe demotet dagegen in JEDER
 * Phase gleich (keine Phase-Hebung) und dient als phasenneutraler Beweis für
 * Freeze/Debounce/Anker.
 *
 * Muster: `e2e/oberflaeche-hierarchie.spec.ts` (T7-Statik) — hier die
 * dynamische Fortsetzung.
 */

async function oeffneKosmoDesign(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG + Standard-Aufbauten
  await page.click('[data-testid="view-2d"]'); // volle Breite, einfache Plan-Klicks
}

/** Phase auf `vorprojekt` setzen (Default eines neuen Projekts ist `werkplan`
 *  — dort hebt die Matrix die Export-Demotion planmässig gleich wieder an). */
async function setzePhaseVorprojekt(page: Page): Promise<void> {
  await page.click('[data-testid="projekt-menu-toggle"]');
  await waehleOption(page, 'phase-stil', 'vorprojekt');
  await page.click('[data-testid="projekt-menu-toggle"]'); // Menü wieder schliessen
}

/**
 * Alle `data-testid`s der festen Werkzeugleisten-Anker, in DOM-Reihenfolge —
 * OHNE `adaption-hinweis`: der ist zwar seit J3c-0a IMMER gemountet (nur
 * seine `visibility` wechselt, Regel 2.3.5 + Fable-Review-2-Auflage J3c-0a),
 * aber sein Sichtbarwerden wird separat per `toBeVisible()`/`toBeHidden()`
 * geprüft, nicht über die Reihenfolge der übrigen Werkzeug-testids.
 */
async function werkzeugleistenTestids(page: Page): Promise<string[]> {
  const alle = await page
    .locator('[data-testid="design-werkzeugleiste"] [data-testid]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-testid')!));
  return alle.filter((id) => id !== 'adaption-hinweis');
}

test('tool-wand stellt Export/Ebenen zurück (.k-selten) und zeigt den Adaptions-Hinweis; tool-auswahl stellt sie zurück', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);
  await setzePhaseVorprojekt(page); // Phase ohne die Export-Hebung aus 2.2 (die gilt nur in werkplan)

  // Ruhezustand (Auswahl-Werkzeug, Basis-Start): Export/Ebenen auf T7-Basis
  // sekundär, kein Hinweis — die Adaption hat noch nichts zurückgestellt.
  const exportGruppe = page.locator('[data-testid="leiste-gruppe-export"]');
  const ebenenGruppe = page.locator('[data-testid="leiste-gruppe-ebenen"]');
  await expect(exportGruppe).toHaveClass(/k-sekundaer/);
  await expect(ebenenGruppe).toHaveClass(/k-sekundaer/);
  // Fable-Review-2-Auflage J3c-0a: `adaption-hinweis` ist IMMER gemountet
  // (Platz bleibt reserviert, kein Layout-Ruck) — im Ruhezustand nur
  // unsichtbar (`visibility: hidden`), nicht aus dem DOM entfernt.
  const hinweis = page.locator('[data-testid="adaption-hinweis"]');
  await expect(hinweis).toBeHidden();

  // Zeichenwerkzeug wählen (Tätigkeits-Matrix 2.2: Export/Ebenen → selten)
  await page.click('[data-testid="tool-wand"]');
  await expect(exportGruppe).toHaveClass(/k-selten/);
  await expect(ebenenGruppe).toHaveClass(/k-selten/);

  await expect(hinweis).toBeVisible();
  const titel = await hinweis.getAttribute('title');
  expect(titel).toContain('zurückgestellt');
  expect(titel).toContain('Export');
  expect(titel).toContain('Ebenen');

  // Feste Anker (Regel 2.3.1): ein in .k-selten gedimmter Knopf bleibt
  // klickbar/funktional — Sonne-Umschalter (Ebenen-Gruppe) öffnet sein Panel.
  await expect(page.locator('[data-testid="sonne-standort-label"]')).toHaveCount(0);
  await page.click('[data-testid="sonne-toggle"]');
  await expect(page.locator('[data-testid="sonne-standort-label"]')).toBeVisible();
  // Fable-Review-2-Auflage J3c-0b: Sonne-Panel offen → die Ebenen-Gruppe
  // wird nie gedimmt, unabhängig von der Zeichnen-Demotion (panelOffen).
  await expect(ebenenGruppe).toHaveClass(/k-sekundaer/);
  await page.click('[data-testid="sonne-toggle"]'); // Panel wieder schliessen

  // Zurück zur Auswahl: keine Zeichentätigkeit mehr → sofort auf Basis, kein
  // künstliches Warten (das 2s-Debounce gilt nur für das Ende einer Aktion,
  // nicht für einen reinen Werkzeugwechsel im Ruhezustand).
  await page.click('[data-testid="tool-auswahl"]');
  await expect(exportGruppe).toHaveClass(/k-sekundaer/);
  await expect(hinweis).toBeHidden();
});

test('feste Anker: die DOM-Reihenfolge der Werkzeug-testids ändert sich NIE, egal welche Fokus-Stufe gerade gilt', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);
  await setzePhaseVorprojekt(page);

  const vorher = await werkzeugleistenTestids(page);
  expect(vorher.length).toBeGreaterThan(10);

  // Werkzeugwechsel löst Umgruppierung (className) aus — die Reihenfolge der
  // testids im DOM darf sich dabei NIE verändern (Regel 2.3.1, "feste Anker").
  await page.click('[data-testid="tool-wand"]');
  await expect(page.locator('[data-testid="leiste-gruppe-export"]')).toHaveClass(/k-selten/); // Umgruppierung wirklich geschehen
  const waehrendZeichnen = await werkzeugleistenTestids(page);
  expect(waehrendZeichnen).toEqual(vorher);

  await page.click('[data-testid="tool-auswahl"]');
  await expect(page.locator('[data-testid="leiste-gruppe-export"]')).toHaveClass(/k-sekundaer/);
  const nachher = await werkzeugleistenTestids(page);
  expect(nachher).toEqual(vorher);
});

test('Punktkette offen: Stufen bleiben eingefroren; nach Abschluss greift die Demotion erst nach 2s Debounce', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);
  // `ebenen` demotet phasenunabhängig (anders als `export`, das in werkplan
  // gleich wieder gehoben wird) — hier zählt nur der Freeze-/Debounce-Effekt.
  await page.click('[data-testid="tool-wand"]');

  const ebenenGruppe = page.locator('[data-testid="leiste-gruppe-ebenen"]');
  await expect(ebenenGruppe).toHaveClass(/k-selten/); // Ruhezustand, Zeichen-Demotion aktiv
  const hinweis = page.locator('[data-testid="adaption-hinweis"]');
  await expect(hinweis).toBeVisible();

  const plan = page.locator('[data-testid="planview"]');
  const box = (await plan.boundingBox())!;

  // Erster Klick: Punktkette beginnt (points.length 0→1) — die Anti-Nerv-
  // Wache hebt die Gruppe SOFORT zurück auf Basis (ein aktives Element wird
  // nie gedimmt), kein Hinweis mehr solange die Kette offen ist (Fable-
  // Review-2-Auflage J3c-0a: bleibt gemountet, nur unsichtbar).
  await plan.click({ position: { x: box.width * 0.3, y: box.height * 0.3 } });
  await expect(ebenenGruppe).toHaveClass(/k-sekundaer/);
  await expect(hinweis).toBeHidden();

  // Zweiter Klick setzt die Kette fort (Wand-Kettenzeichnen: Endpunkt wird
  // neuer Anfang) — die Stufe bleibt eingefroren auf sekundär, springt nicht.
  await plan.click({ position: { x: box.width * 0.5, y: box.height * 0.3 } });
  await expect(ebenenGruppe).toHaveClass(/k-sekundaer/);

  // Dritter Klick MIT Shift beendet die Kette (points → []) — aktionLaeuft
  // wird falsch, aber die Demotion darf laut Regel 2.3.2 erst 2s später
  // wieder einfallen: unmittelbar danach bleibt die Gruppe noch auf sekundär.
  await plan.click({ position: { x: box.width * 0.5, y: box.height * 0.5 }, modifiers: ['Shift'] });
  await expect(ebenenGruppe).toHaveClass(/k-sekundaer/);

  // Nach Ablauf des Debounce-Fensters fällt die Zeichnen-Demotion wieder ein.
  await page.waitForTimeout(2300);
  await expect(ebenenGruppe).toHaveClass(/k-selten/);
  await expect(page.locator('[data-testid="adaption-hinweis"]')).toBeVisible();
});

/**
 * Serie J / Batch J3c — Nutzer-Lernen, Reset, Transparenz (SERIE-J-BUILDPLAN.md
 * Abschnitt 2.2 Schlussabsatz + Abschnitt 3 "J3c", Fable-Review-2-Auflagen
 * J3c-1/J3c-2/J3c-4). Diese drei Tests beweisen am lebenden Objekt:
 *
 * 1. Element-Hebung: ein oft genutztes Element bleibt eine Stufe höher als
 *    seine (aktuelle) Gruppe — die multiplikative CSS-opacity-Falle (J3c-2)
 *    ist real behoben (Geschwister zeigen 0.92, das gehobene Element 1).
 * 2. Opt-out: der Schalter wirkt sofort, ohne Reload, exakt auf T7-Basis.
 * 3. Reset: löscht nur das gelernte Profil, der Schalter bleibt unverändert.
 */

test('Element-Hebung: ein oft genutztes Ebenen-Element bleibt nach Werkzeugwechsel eine Stufe höher als seine Gruppe', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);
  await setzePhaseVorprojekt(page);

  const texturButton = page.locator('[data-testid="textur-toggle"]');
  const sonneButton = page.locator('[data-testid="sonne-toggle"]');
  const ebenenGruppe = page.locator('[data-testid="leiste-gruppe-ebenen"]');

  // Drei Klicks im Ruhezustand (tool=auswahl): zählt im Store, ändert aber
  // sichtbar (noch) nichts — `tool`/`phase`/Punktkette/Panel ändern sich
  // dabei nicht, das Nutzungsprofil wird erst zusammen mit `stabilerKontext`
  // aufgefrischt (Fable-Review-2-Auflage J3c-4), nicht bei jedem Klick.
  await texturButton.click();
  await texturButton.click();
  await texturButton.click();

  // Werkzeugwechsel: `tool` ändert sich → Kontext + Profil-Snapshot frischen
  // gemeinsam auf. Dieselbe Nutzung hebt hier zugleich die ganze Gruppe
  // (Top-3-Hebung, 2.2 Schlussabsatz: selten→sekundär, deckt sich mit der
  // T7-Basis) UND, obendrauf, "Textur" selbst nochmals eine Stufe über die
  // Gruppe (primär) — Geschwister (Sonne) bleiben auf Gruppen-Niveau.
  await page.click('[data-testid="tool-wand"]');
  await expect(ebenenGruppe).toHaveClass(/k-sekundaer/);
  await expect(texturButton).toHaveCSS('opacity', '1');
  await expect(sonneButton).toHaveCSS('opacity', '0.92');

  // Werkzeugwechsel zurück zur Auswahl: Textur bleibt weiterhin eine Stufe
  // höher als ihre (jetzt wieder auf T7-Basis stehende) Gruppe.
  await page.click('[data-testid="tool-auswahl"]');
  await expect(ebenenGruppe).toHaveClass(/k-sekundaer/);
  await expect(texturButton).toHaveCSS('opacity', '1');
  await expect(sonneButton).toHaveCSS('opacity', '0.92');
});

test('Opt-out-Schalter: Umschalten wirkt sofort ohne Reload — aus liefert exakt die T7-Basisklassen', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);
  await setzePhaseVorprojekt(page);

  // Zeichnen-Demotion sichtbar (Adaption an, Default).
  await page.click('[data-testid="tool-wand"]');
  const exportGruppe = page.locator('[data-testid="leiste-gruppe-export"]');
  const ebenenGruppe = page.locator('[data-testid="leiste-gruppe-ebenen"]');
  await expect(exportGruppe).toHaveClass(/k-selten/);
  await expect(ebenenGruppe).toHaveClass(/k-selten/);

  // Schalter im Projekt-Menü ausschalten.
  await page.click('[data-testid="projekt-menu-toggle"]');
  const schalter = page.locator('[data-testid="adaption-schalter"]');
  await expect(schalter).toBeChecked(); // Default an
  await schalter.uncheck();
  await page.click('[data-testid="projekt-menu-toggle"]'); // Menü wieder schliessen

  // Sofort (kein Reload): exakt die T7-Basisklassen, keine Zeichnen-Demotion,
  // kein Adaptions-Hinweis mehr — ein expliziter React-State macht's möglich
  // (Fable-Review-2-Auflage J3c-1), kein Verlass auf zufälligen Re-Render.
  await expect(exportGruppe).toHaveClass(/k-sekundaer/);
  await expect(ebenenGruppe).toHaveClass(/k-sekundaer/);
  await expect(page.locator('[data-testid="adaption-hinweis"]')).toBeHidden();

  // Wieder einschalten: die Demotion greift sofort wieder.
  await page.click('[data-testid="projekt-menu-toggle"]');
  await schalter.check();
  await page.click('[data-testid="projekt-menu-toggle"]');
  await expect(exportGruppe).toHaveClass(/k-selten/);
  await expect(ebenenGruppe).toHaveClass(/k-selten/);
});

test('adaption-reset löscht nur das gelernte Profil — der Opt-out-Schalter bleibt unverändert; localStorage bleibt sauber versioniert', async ({
  page,
}) => {
  await oeffneKosmoDesign(page);
  await setzePhaseVorprojekt(page);

  // Nutzung aufbauen (Textur oft genutzt) und Snapshot per Werkzeugwechsel auffrischen.
  const texturButton = page.locator('[data-testid="textur-toggle"]');
  await texturButton.click();
  await texturButton.click();
  await texturButton.click();
  await page.click('[data-testid="tool-wand"]');
  await expect(texturButton).toHaveCSS('opacity', '1'); // gehoben, Beweis dass Nutzung zählte

  // Schalter zuerst AUSSCHALTEN, DANN zurücksetzen — Reset darf ein zuvor
  // gesetztes Opt-out nicht heimlich rückgängig machen (Fable-Review-2-
  // Auflage J3c-1: getrennte Semantik von Schalter und Reset).
  await page.click('[data-testid="projekt-menu-toggle"]');
  const schalter = page.locator('[data-testid="adaption-schalter"]');
  await schalter.uncheck();
  await page.click('[data-testid="adaption-reset"]');
  await expect(schalter).not.toBeChecked(); // Schalter bleibt aus

  // localStorage: Versionsschlüssel bleibt sauber (kosmo.adaption.v1), das
  // Profil ist geleert, `aktiv` bleibt exakt wie vom Schalter gesetzt. Vor
  // dem Schliessen des Menüs geprüft — ein weiterer Klick auf
  // `projekt-menu-toggle` würde selbst wieder `nutzungMelden('projekt:menu')`
  // auslösen und das (frisch geleerte) Profil verfälschen.
  const gespeichert = await page.evaluate(() => localStorage.getItem('kosmo.adaption.v1'));
  expect(gespeichert).not.toBeNull();
  const geparst = JSON.parse(gespeichert!) as { aktiv: boolean; profil: { zaehler: Record<string, number> } };
  expect(geparst.aktiv).toBe(false);
  expect(geparst.profil.zaehler).toEqual({});
});
