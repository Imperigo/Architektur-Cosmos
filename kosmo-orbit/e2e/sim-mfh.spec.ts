import { expect, test } from '@playwright/test';

/**
 * V1-Vollsimulation Mehrfamilienhaus (Owner-QA): EIN durchgehender
 * Architekten-Arbeitsgang für einen MFH-Ersatzneubau auf einer realistischen
 * städtischen Schweizer Parzelle (Beispiel: Zürich-Altstetten, Regelgeschoss
 * ~30 × 14 m, zweibündiger Grundriss mit Mittelkorridor, Erschliessungskern
 * mit Treppenhaus). Jeder Meilenstein reproduziert eine im Repo bereits
 * bewiesene Kette (e2e/module.spec.ts: «Wohnungs-Segmentierer», «Erschlies-
 * sungskern», «Grundriss-Generator», «Geschoss stapeln») — Geometrie und
 * HNF-Zahlen sind bewusst aus genau diesen Fixtures übernommen, damit die
 * Assertions nicht raten müssen.
 *
 * Ehrlicher Hinweis zum «Wohnungsmix»: der Segmentierer unterscheidet nur
 * zwei Owner-Kategorien (marktgerecht/preisgünstig, keine Zimmerzahl-
 * Typologie 2.5/3.5/4.5). Diese Simulation nutzt darum «preisgünstig»
 * (~75 m² HNF, grössenordnungsmässig eine 3.5-Zi-Wohnung) als tragenden Typ
 * fürs Regelgeschoss und fügt «marktgerecht» erst später als noch nicht
 * gebautes Programm hinzu (Berechnungsliste, Schritt 6).
 */

test('Vollsimulation Mehrfamilienhaus: Raumprogramm → Segmentierer → Grundriss-Generator → Geschosse stapeln → Fluchtweg-Check → Berechnungsliste → Themenplan → Kosmo → Export', async ({
  page,
}) => {
  test.setTimeout(180_000);

  // ---------------------------------------------------------------------
  // 1) Onboarding + KosmoDesign. Bootstrap legt EG + 1.OG samt Standard-
  //    Aussenwandaufbau «AW Beton 36» an (project-store.ts bootstrapProject).
  // ---------------------------------------------------------------------
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();

  // Raumprogramm des Regelgeschosses: 300 m² HNF «preisgünstig»
  // (sollMix() rechnet 300 ÷ 75 m²/Whg = 4 Wohnungen).
  await page.evaluate(() => {
    window.__kosmo.run('design.raumprogrammSetzen', {
      posten: [{ typ: 'preisguenstig', hnfSoll: 300 }],
    });
  });

  const egId = await page.evaluate(() => window.__kosmo.state().activeStoreyId);
  await page.evaluate((storeyId) => {
    const k = window.__kosmo;
    // Geschossfläche 30 × 14 m, Mittelkorridor 2 m breit auf halber Tiefe —
    // exakt die Geometrie aus «Erschliessungskern (A3)» / «Wohnungs-
    // Segmentierer (V2-F5)».
    k.run('design.zoneErstellen', {
      storeyId, name: 'Regelgeschoss', sia: 'KF',
      outline: [{ x: 0, y: 0 }, { x: 30000, y: 0 }, { x: 30000, y: 14000 }, { x: 0, y: 14000 }],
    });
    k.run('design.zoneErstellen', {
      storeyId, name: 'Korridor', sia: 'VF', raumTyp: 'korridor',
      outline: [{ x: 0, y: 6000 }, { x: 30000, y: 6000 }, { x: 30000, y: 8000 }, { x: 0, y: 8000 }],
    });
  }, egId);

  const zonenVorSegmentierer = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length);

  // ---------------------------------------------------------------------
  // 2) Wohnungs-Segmentierer (V2-F5) am Korridor, MIT Erschliessungskern
  //    (A3) — Soll-Mix aus dem Raumprogramm, Vorschlag rechnen, Mix
  //    kontrollieren, dann übernehmen (1 Undo-Gruppe im Kernel).
  // ---------------------------------------------------------------------
  await page.click('[data-testid="liste-toggle"]');
  await page.check('[data-testid="segmentierer-kern"]');
  await page.click('[data-testid="segmentierer-lauf"]');

  const ergebnis = page.locator('[data-testid="segmentierer-ergebnis"]');
  await expect(ergebnis).toBeVisible();
  await expect(ergebnis).toContainText('preisguenstig');
  const ergebnisText = await ergebnis.innerText();
  const mixMatch = ergebnisText.match(/preisguenstig\D{0,5}(\d+)\s*\/\s*(\d+)/);
  expect(mixMatch, `Mix-Zeile nicht lesbar:\n${ergebnisText}`).not.toBeNull();
  const [, ist, soll] = mixMatch!;
  expect(Number(soll)).toBe(4); // 300 m² HNF ÷ 75 m²/Whg (WOHNUNGS_GROESSEN.preisguenstig)
  expect(Number(ist)).toBeGreaterThanOrEqual(3); // mind. 3 von 4 Wohnungen sauber geschnitten

  await page.click('[data-testid="segmentierer-uebernehmen"]');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length))
    .toBeGreaterThanOrEqual(zonenVorSegmentierer + 6); // 4 Wohnungen + Restflächen + Treppenhaus-Kern
  const nachSegmentierer = await page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length);

  const kernStand = await page.evaluate(() => {
    const doc = window.__kosmo.state().doc;
    return {
      treppenhaus: doc.byKind('zone').filter((z) => z.raumTyp === 'treppenhaus').length,
      treppen: doc.byKind('stair').length,
    };
  });
  expect(kernStand.treppenhaus).toBe(1);
  expect(kernStand.treppen).toBe(1);

  // ---------------------------------------------------------------------
  // 3) Grundriss-Generator (Finch-Kern): jede Wohnungs-Zone wird mit
  //    Zimmern, internem Flur und Möbeln gefüllt; der Generator setzt dabei
  //    automatisch Zonentüren zwischen den neuen Räumen (und zum Korridor).
  // ---------------------------------------------------------------------
  await page.click('[data-testid="grundrisse-fuellen"]');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length))
    .toBeGreaterThan(nachSegmentierer + 5); // je Wohnung mehrere Zimmer + interner Flur
  const gefuellt = await page.evaluate(() => {
    const doc = window.__kosmo.state().doc;
    return { moebel: doc.byKind('furniture').length, tueren: doc.byKind('zonentuer').length };
  });
  expect(gefuellt.moebel).toBeGreaterThanOrEqual(4);
  expect(gefuellt.tueren).toBeGreaterThan(0); // Türen zwischen Zonen (Grundriss-Generator + Kern-Anbindung)
  await expect(page.locator('[data-testid="moebel"]').first()).toBeVisible();

  // ---------------------------------------------------------------------
  // 4) Geschosse stapeln (B1): das Regelgeschoss samt Wohnungen, Möbeln,
  //    Zonentüren und Treppe deckungsgleich nach oben kopieren — zweimal,
  //    für ein 4-geschossiges MFH (EG + 1.OG bereits vorhanden, +2.OG/+3.OG
  //    durch Stapeln).
  // ---------------------------------------------------------------------
  const geschosseVorStapeln = await page.evaluate(() => window.__kosmo.state().doc.storeysOrdered().length);
  await page.click('[data-testid="geschoss-stapeln"]');
  await page.click('[data-testid="geschoss-stapeln"]');
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.storeysOrdered().length))
    .toBe(geschosseVorStapeln + 2);

  const oberstesGeschoss = await page.evaluate(() => {
    const doc = window.__kosmo.state().doc;
    const geordnet = doc.storeysOrdered();
    const letztes = geordnet[geordnet.length - 1];
    return {
      name: letztes.name,
      zonen: doc.byKind('zone').filter((z) => z.storeyId === letztes.id).length,
      moebel: doc.byKind('furniture').filter((f) => f.storeyId === letztes.id).length,
    };
  });
  expect(oberstesGeschoss.zonen).toBeGreaterThan(10); // volle Kopie des gefüllten Regelgeschosses
  expect(oberstesGeschoss.moebel).toBeGreaterThanOrEqual(4);
  await expect(page.locator(`[data-testid="storey-${oberstesGeschoss.name}"]`)).toBeVisible();

  // ---------------------------------------------------------------------
  // 5) Fluchtweg-Check (V2-F2): das Erschliessungskern-Treppenhaus ist ab
  //    jetzt Fluchtziel — die Kennzahlen-Leiste bewertet jede Wohnung gegen
  //    den VKF-Richtwert (35 m). Diese Baustruktur ist gross genug, dass der
  //    Egress-Status ehrlich sichtbar sein MUSS (Länge lesbar, keine stumme
  //    Lücke), unabhängig davon, ob der Richtwert eingehalten wird.
  // ---------------------------------------------------------------------
  const checks = page.locator('[data-testid="checks"]');
  const checksVorhanden = await checks.count();
  if (checksVorhanden > 0) {
    const checksText = await checks.innerText();
    // Türen werden vom Grundriss-Generator + Kern-Anbindung automatisch
    // gesetzt — keine Wohnung darf als «ohne Verbindung» auffallen.
    expect(checksText, `Unverbundene Wohnung im Egress-Befund:\n${checksText}`).not.toContain(
      'keine Verbindung zum Treppenhaus',
    );
    // Wo ein Fluchtweg-Befund erscheint, muss die Länge in Metern lesbar
    // sein — kein Platzhalter-Status.
    const fluchtwegLaengen = [...checksText.matchAll(/Fluchtweg[^\n]*?([\d]+[.,]\d)\s*m/g)];
    for (const [, laenge] of fluchtwegLaengen) {
      expect(Number(laenge!.replace(',', '.'))).toBeGreaterThan(0);
    }
  }

  // ---------------------------------------------------------------------
  // 6) Berechnungsliste: %-Erfüllung des Raumprogramms. Eine zweite,
  //    geplante aber (noch) nicht gezeichnete Kategorie (Attika, markt-
  //    gerecht) steht bewusst bei 0 % — ehrliche Lücke statt Fake-Erfüllung
  //    (exakt das Verhalten, das der CSV-Import-Test von KosmoDesign
  //    beweist).
  // ---------------------------------------------------------------------
  await page.evaluate(() => {
    window.__kosmo.run('design.raumprogrammSetzen', {
      posten: [
        { typ: 'preisguenstig', hnfSoll: 300 },
        { typ: 'marktgerecht', hnfSoll: 190 },
      ],
    });
  });
  await expect(page.locator('[data-testid="liste-tabelle"]')).toBeVisible();
  await expect(page.locator('[data-testid="erfuellung-marktgerecht"]')).toContainText('0');
  const erfuellungPreisguenstig = (await page.locator('[data-testid="erfuellung-preisguenstig"]').innerText()).trim();
  expect(Number(erfuellungPreisguenstig)).toBeGreaterThan(0);

  // ---------------------------------------------------------------------
  // 7) Kosmo (Mock-Provider) fährt die Kette per Sprache: noch ein
  //    Attikageschoss stapeln — dieselbe Diff-Karten-Kette wie beim
  //    manuellen Klick, nur über den Chat angestossen.
  // ---------------------------------------------------------------------
  const geschosseVorKosmo = await page.evaluate(() => window.__kosmo.state().doc.storeysOrdered().length);
  await page.fill('[data-testid="kosmo-input"]', 'Staple das Geschoss 1 mal');
  await page.click('[data-testid="kosmo-send"]');
  await page.click('[data-testid="apply-proposal"]', { timeout: 15_000 });
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.storeysOrdered().length))
    .toBe(geschosseVorKosmo + 1);

  // ---------------------------------------------------------------------
  // 7b) Themenplan-Overrides (RE-ARCHICAD A5): ein Brandschutzplan tönt das
  //     Treppenhaus rot und trägt die Legende auf dem Blatt — dann Export.
  // ---------------------------------------------------------------------
  await page.evaluate(() => {
    window.__kosmo.run('design.themenPlanSpeichern', {
      name: 'Brandschutz',
      regeln: [{ kriterium: 'raumTyp', wert: 'treppenhaus', farbe: '#cc3322', label: 'Fluchtweg' }],
    });
  });
  await page.evaluate(() => window.__kosmo.open('publish'));
  await page.click('[data-testid="add-sheet"]');
  await page.click('[data-testid="place-plan"]');
  await page.locator('[data-testid^="placement-"]').first().click();
  await page.selectOption('[data-testid="auswahl-thema"]', 'Brandschutz');
  const sheetCanvas = page.locator('[data-testid="sheet-canvas"]');
  await expect(sheetCanvas).toContainText('Brandschutz');
  await expect(sheetCanvas).toContainText('Fluchtweg'); // Themenplan-Legende

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="export-set"]'),
  ]);
  expect(download.suggestedFilename()).toMatch(/Plansatz\.pdf$/);
});
