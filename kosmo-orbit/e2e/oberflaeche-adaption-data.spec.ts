import { expect, test, type Page } from '@playwright/test';

/**
 * Serie J2 / Batch B1 (docs/SERIE-J2-IMMERSIVE-OBERFLAECHE.md Abschnitt 4) —
 * derselbe Adaptions-Kern wie KosmoDesign (`e2e/oberflaeche-adaption.spec.ts`),
 * jetzt an KosmoData angeschlossen. Exakt dieselbe Machart, übertragen auf die
 * Daten-Matrix (`state/oberflaeche-adaption-data.ts`): (1) Suche bleibt/wird
 * primär, solange getippt wird; (2) Sync tritt beim Tippen auf `selten`
 * zurück; (3) das Dossier wird nie gedimmt, solange eine Referenz gewählt
 * ist. Reiner Offline-Seed, keine Helferserver nötig (wie
 * `kosmodata-dossier.spec.ts`).
 */

async function oeffneKosmoData(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();
  await page.click('[data-testid="module-data"]');
  await page.waitForSelector('[data-testid="ref-card"]');
}

/**
 * Alle `data-testid`s der festen Werkzeugleisten-Anker innerhalb der
 * KosmoData-Werkzeugleiste, in DOM-Reihenfolge — OHNE `adaption-hinweis`
 * (Muster: `werkzeugleistenTestids` in `oberflaeche-adaption.spec.ts` — der
 * Hinweis ist immer gemountet, sein Sichtbarwerden wird separat geprüft).
 */
async function referenzenWerkzeugleistenTestids(page: Page): Promise<string[]> {
  const alle = await page
    .locator('[data-testid="referenzen-werkzeugleiste"] [data-testid]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-testid')!));
  return alle.filter((id) => id !== 'adaption-hinweis');
}

test('Ruhezustand: Suche/Sync auf T7-Basis sekundär, kein Adaptions-Hinweis', async ({ page }) => {
  await oeffneKosmoData(page);

  const sucheGruppe = page.locator('[data-testid="leiste-gruppe-suche"]');
  const syncGruppe = page.locator('[data-testid="leiste-gruppe-sync"]');
  await expect(sucheGruppe).toHaveClass(/k-sekundaer/);
  await expect(syncGruppe).toHaveClass(/k-sekundaer/);

  // Fable-Review-2-Auflage J3c-0a (Design) gilt hier ebenso: `adaption-hinweis`
  // ist IMMER gemountet, im Ruhezustand nur unsichtbar (kein Layout-Ruck).
  const hinweis = page.locator('[data-testid="adaption-hinweis"]');
  await expect(hinweis).toBeHidden();
});

test('Text in data-search tippen: Suche → primär, Sync → selten, Adaptions-Hinweis sichtbar und nennt «Sync»', async ({
  page,
}) => {
  await oeffneKosmoData(page);

  const sucheGruppe = page.locator('[data-testid="leiste-gruppe-suche"]');
  const syncGruppe = page.locator('[data-testid="leiste-gruppe-sync"]');
  const hinweis = page.locator('[data-testid="adaption-hinweis"]');

  await page.fill('[data-testid="data-search"]', 'Villa');
  await expect(sucheGruppe).toHaveClass(/k-primaer/);
  await expect(syncGruppe).toHaveClass(/k-selten/);

  await expect(hinweis).toBeVisible();
  const titel = await hinweis.getAttribute('title');
  expect(titel).toContain('zurückgestellt');
  expect(titel).toContain('Sync');

  // Suchfeld leeren: sofort zurück auf Basis (kein künstliches Warten bei
  // einem reinen Ruhezustand-Übergang, analog Design).
  await page.fill('[data-testid="data-search"]', '');
  await expect(sucheGruppe).toHaveClass(/k-sekundaer/);
  await expect(hinweis).toBeHidden();
});

test('feste Anker: die DOM-Reihenfolge der Werkzeugleisten-testids ändert sich NIE, egal welche Fokus-Stufe gerade gilt', async ({
  page,
}) => {
  await oeffneKosmoData(page);

  const vorher = await referenzenWerkzeugleistenTestids(page);
  expect(vorher.length).toBeGreaterThan(8);

  await page.fill('[data-testid="data-search"]', 'Villa');
  await expect(page.locator('[data-testid="leiste-gruppe-sync"]')).toHaveClass(/k-selten/); // Umgruppierung wirklich geschehen
  const waehrendTippen = await referenzenWerkzeugleistenTestids(page);
  expect(waehrendTippen).toEqual(vorher);

  await page.fill('[data-testid="data-search"]', '');
  await expect(page.locator('[data-testid="leiste-gruppe-sync"]')).toHaveClass(/k-sekundaer/);
  const nachher = await referenzenWerkzeugleistenTestids(page);
  expect(nachher).toEqual(vorher);
});

test('eine Referenz öffnen, während weiter getippt wird: leiste-gruppe-dossier bleibt primär, nie gedimmt', async ({
  page,
}) => {
  await oeffneKosmoData(page);

  // "Villa Savoye" trifft im Seed genau eine Referenz mit has_3d=true
  // (Muster: kosmodata-dossier.spec.ts).
  await page.fill('[data-testid="data-search"]', 'Villa Savoye');
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(1);
  await page.click('[data-testid="ref-card"]');
  await expect(page.locator('[data-testid="ref-detail-dossier"]')).toBeVisible();

  const dossierGruppe = page.locator('[data-testid="leiste-gruppe-dossier"]');
  await expect(dossierGruppe).toHaveClass(/k-primaer/);

  // Weiter tippen (Referenz bleibt ausgewählt, auch wenn die Trefferliste
  // dahinter jetzt leer läuft) — das Dossier bleibt trotzdem primär.
  await page.fill('[data-testid="data-search"]', 'Villa SavoyeXXX');
  await expect(page.locator('[data-testid="ref-detail-dossier"]')).toBeVisible();
  await expect(dossierGruppe).toHaveClass(/k-primaer/);
});

test('Suchfeld leeren + 2s Debounce: Gruppen fallen zurück auf Basis, nicht sofort', async ({ page }) => {
  await oeffneKosmoData(page);

  const sucheGruppe = page.locator('[data-testid="leiste-gruppe-suche"]');
  const syncGruppe = page.locator('[data-testid="leiste-gruppe-sync"]');

  const box = page.locator('[data-testid="data-search"]');
  await box.pressSequentially('Villa', { delay: 30 });
  await expect(sucheGruppe).toHaveClass(/k-primaer/);
  await expect(syncGruppe).toHaveClass(/k-selten/);

  // Debounce (`ADAPTION_DEBOUNCE_MS`, aus dem Kern importiert statt lokal
  // dupliziert — dieselbe geteilte Konstante, die auch Design verwendet):
  // ein reiner Werkzeugwechsel im Ruhezustand griffe sofort, aber HIER endet
  // eine laufende Tätigkeit (aktionLaeuft war wahr) — die Demotion/Anti-Dimm
  // hält 2s, bevor die Basis-Stufen wieder einfallen.
  await box.fill('');
  await page.waitForTimeout(2300);
  await expect(sucheGruppe).toHaveClass(/k-sekundaer/);
  await expect(syncGruppe).toHaveClass(/k-sekundaer/);
});

test('Opt-out-Schalter: Umschalten wirkt sofort ohne Reload — aus liefert exakt die T7-Basisklassen; Reset löscht nur das Profil, localStorage-Schlüssel bleibt kosmo.adaption.v1', async ({
  page,
}) => {
  await oeffneKosmoData(page);

  const sucheGruppe = page.locator('[data-testid="leiste-gruppe-suche"]');
  const syncGruppe = page.locator('[data-testid="leiste-gruppe-sync"]');
  const schalter = page.locator('[data-testid="adaption-schalter"]');

  await page.fill('[data-testid="data-search"]', 'Villa');
  await expect(sucheGruppe).toHaveClass(/k-primaer/);
  await expect(syncGruppe).toHaveClass(/k-selten/);

  await expect(schalter).toBeChecked(); // Default an
  await schalter.uncheck();

  // Sofort (kein Reload): exakt die T7-Basisklassen, kein Hinweis mehr.
  await expect(sucheGruppe).toHaveClass(/k-sekundaer/);
  await expect(syncGruppe).toHaveClass(/k-sekundaer/);
  await expect(page.locator('[data-testid="adaption-hinweis"]')).toBeHidden();

  // Wieder einschalten: die Demotion greift sofort wieder.
  await schalter.check();
  await expect(sucheGruppe).toHaveClass(/k-primaer/);
  await expect(syncGruppe).toHaveClass(/k-selten/);

  // Reset (bei ausgeschaltetem Schalter, wie im Design-Pendant): löscht NUR
  // das Profil, der Schalter bleibt exakt wie zuletzt gesetzt. Derselbe
  // localStorage-Schlüssel wie KosmoDesign (Entscheid 2, geteilter Speicher).
  await schalter.uncheck();
  await page.click('[data-testid="adaption-reset"]');
  await expect(schalter).not.toBeChecked();

  const gespeichert = await page.evaluate(() => localStorage.getItem('kosmo.adaption.v1'));
  expect(gespeichert).not.toBeNull();
  const geparst = JSON.parse(gespeichert!) as { aktiv: boolean; profil: { zaehler: Record<string, number> } };
  expect(geparst.aktiv).toBe(false);
  expect(geparst.profil.zaehler).toEqual({});
});

/**
 * W4 (UI-KONZEPT-065 §4/§4.5 «Leerzustände sind gezeichnet», Chefbefund 5) —
 * Begründung für die Anpassung an dieser (Adaptions-)Spec-Datei: sie ist per
 * Dateibesitz die einzige Data-Spec, die dieser Stream erweitern darf, und
 * `oeffneKosmoData()`/die Offline-Seed-Fixtur leben bereits hier. «De
 * architectura» ist im Seed EIN eindeutiger Treffer ohne `hero`-Bild (Repro
 * geprüft: `apps/kosmo-orbit/public/kosmodata-seed.json`) — die Karte muss
 * das gezeichnete Signet + den ehrlichen Satz zeigen, NICHT eine leere
 * Fläche und KEIN Fake-Thumbnail.
 *
 * R1-Fix (Kritik-065 p-07/i-07, «Leerbild-Signet fehlt auf ~108 von 112
 * Karten»): die alte Bedingung (`e.hero ? <img> : <DataLeerbild>`) traf nur
 * die ~33 Einträge OHNE `hero`-Feld — die ~79 mit einer echten (externen,
 * hier unerreichbaren) `hero`-URL blieben als leere Fläche stehen, weil ihr
 * `onError`-Handler das kaputte `<img>` nur versteckte, statt auf das
 * Signet umzuschalten. Gehärtet (statt nur die EINE gefilterte Karte zu
 * prüfen): im UNGEFILTERTEN Ruhezustand (112 Referenzen, keine erreichbaren
 * externen Bilder in dieser Umgebung) zeigt eine deutliche Mehrheit (> 50)
 * der Karten das Signet — nicht nur die von Haus aus bildlosen.
 */
test('Referenz-Karte ohne Bild zeigt das gezeichnete Leerbild-Signet statt einer leeren Fläche', async ({ page }) => {
  await oeffneKosmoData(page);

  // Ungefiltert: die Karten sitzen in `loading="lazy"` <img>s — ausserhalb
  // des Sichtfensters starten sie ihren Ladeversuch erst gar nicht. Den
  // scrollenden Container (kein eigener testid) über die erste Karte finden
  // und schrittweise bis ans Ende scrollen, damit JEDE Karte ihren
  // Ladeversuch (Erfolg ODER Fehlschlag) tatsächlich auslöst.
  await expect(page.locator('[data-testid="ref-card"]')).toHaveCount(112);
  const scrollHandle = await page.locator('[data-testid="ref-card"]').first().evaluateHandle((el) => {
    let node: HTMLElement | null = el.parentElement;
    while (node && node.scrollHeight <= node.clientHeight) node = node.parentElement;
    return node ?? el;
  });
  const scroller = scrollHandle.asElement();
  if (scroller) {
    for (let i = 0; i < 12; i++) {
      await scroller.evaluate((el, frac) => {
        el.scrollTop = (el.scrollHeight * frac) / 12;
      }, i + 1);
      await page.waitForTimeout(150);
    }
  }
  // Alle <img>-Ladeversuche (Erfolg ODER Fehlschlag) abwarten, dann zählen,
  // wie viele Karten auf das Signet umgeschaltet haben.
  await expect
    .poll(
      async () => {
        const laufen = await page.locator('[data-testid="ref-card"] img').evaluateAll(
          (imgs) => imgs.filter((img) => !(img as HTMLImageElement).complete).length,
        );
        return laufen;
      },
      { timeout: 30_000 },
    )
    .toBe(0);
  const signetAnzahlUngefiltert = await page.locator('[data-testid="karte-leerbild"]').count();
  expect(signetAnzahlUngefiltert).toBeGreaterThan(50);

  await page.fill('[data-testid="data-search"]', 'De architectura');
  const karte = page.locator('[data-testid="ref-card"]');
  await expect(karte).toHaveCount(1);

  const signet = karte.locator('[data-testid="karte-leerbild"]');
  await expect(signet).toBeVisible();
  await expect(karte).toContainText('kein Bild hinterlegt');

  // Ehrlich: kein <img> im Karten-Kopf, wo das Signet steht — kein
  // Fake-Thumbnail, kein generiertes Bild (Owner-Mandat).
  await expect(karte.locator('img')).toHaveCount(0);
});
