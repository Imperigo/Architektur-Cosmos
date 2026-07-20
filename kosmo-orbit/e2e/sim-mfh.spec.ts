import { expect, test } from '@playwright/test';
import * as B from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';
import { visManuellStorageState } from './helpers/manuell-seed';

// v0.8.10 E3-Nachtrag Seed-Flip — NOTWENDIGE Folgeänderung (P-B1-Audit-
// Lücke, kein deklariertes Dateikreis-Mitglied von P-B2, aber vom eigenen
// Vor-/Nach-Flip-Vollsuiten-Vergleich gefunden): `sim/bausteine.ts`s
// geteilter Baustein 14 (`renderUeberBridge`) klickt `[data-testid="drei-
// stimmungen"]` — ein Manuell-only-Testid, das im Island-Default nicht
// existiert. Ohne diesen Kopf würde der Seed-Flip diese Journey (und die
// vier weiteren Journeys, die denselben Baustein aufrufen — sim-blockrand/
// -efh/-hochhaus/-stadthaus) von grün auf rot kippen.
test.use({ storageState: visManuellStorageState() });

/**
 * V1-Vollsimulation Mehrfamilienhaus (Owner-QA): EIN durchgehender
 * Architekten-Arbeitsgang für einen MFH-Ersatzneubau auf einer realistischen
 * städtischen Schweizer Parzelle (`SZENARIEN.mfh`, `e2e/sim/szenarien.ts`:
 * Zürich-Altstetten, Regelgeschoss ~30 × 14 m, zweibündiger Grundriss mit
 * Mittelkorridor, Erschliessungskern mit Treppenhaus). Jeder Meilenstein
 * reproduziert eine im Repo bereits bewiesene Kette (e2e/module.spec.ts:
 * «Wohnungs-Segmentierer», «Erschliessungskern», «Grundriss-Generator»,
 * «Geschoss stapeln») — Geometrie und HNF-Zahlen sind bewusst aus genau
 * diesen Fixtures übernommen, damit die Assertions nicht raten müssen.
 *
 * Ehrlicher Hinweis zum «Wohnungsmix»: der Segmentierer unterscheidet nur
 * zwei Owner-Kategorien (marktgerecht/preisgünstig, keine Zimmerzahl-
 * Typologie 2.5/3.5/4.5). Diese Simulation nutzt darum «preisgünstig»
 * (~75 m² HNF, grössenordnungsmässig eine 3.5-Zi-Wohnung) als tragenden Typ
 * fürs Regelgeschoss und fügt «marktgerecht» erst später als noch nicht
 * gebautes Programm hinzu (Berechnungsliste, Schritt 6).
 *
 * Serie H / H1a: auf die wiederverwendbaren Journey-Bausteine
 * (`e2e/sim/bausteine.ts`) umgestellt — reine Extraktion, die geprüften
 * Bedingungen (Mix 4, %-Erfüllung, Geschosszahlen) bleiben unverändert.
 */

test('Vollsimulation Mehrfamilienhaus: Raumprogramm → Segmentierer → Grundriss-Generator → Geschosse stapeln → Fluchtweg-Check → Berechnungsliste → Themenplan → Kosmo → Export', async ({
  page,
}) => {
  test.setTimeout(180_000);

  const szenario = SZENARIEN.mfh;

  // ---------------------------------------------------------------------
  // 1) Onboarding + Standort (Baustein 1). Bootstrap legt EG + 1.OG samt
  //    Standard-Aussenwandaufbau «AW Beton 36» an (project-store.ts
  //    bootstrapProject).
  // ---------------------------------------------------------------------
  await B.projektStarten(page, szenario);

  // Raumprogramm des Regelgeschosses: 300 m² HNF «preisgünstig»
  // (sollMix() rechnet 300 ÷ 75 m²/Whg = 4 Wohnungen). Kein genereller
  // Baustein (design.raumprogrammSetzen ist journey-eigenes Setup).
  await page.evaluate((posten) => {
    window.__kosmo.run('design.raumprogrammSetzen', { posten });
  }, [szenario.raumprogramm[0]!]);

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

  // ---------------------------------------------------------------------
  // 2) Wohnungs-Segmentierer (V2-F5) am Korridor, MIT Erschliessungskern
  //    (A3) — Soll-Mix aus dem Raumprogramm, Vorschlag rechnen, Mix
  //    kontrollieren, dann übernehmen (1 Undo-Gruppe im Kernel). Baustein 9.
  // ---------------------------------------------------------------------
  await B.segmentieren(page, {
    typ: 'preisguenstig',
    sollErwartet: 4, // 300 m² HNF ÷ 75 m²/Whg (WOHNUNGS_GROESSEN.preisguenstig)
    mindestIst: 3, // mind. 3 von 4 Wohnungen sauber geschnitten
    mindestZonenDelta: 6, // 4 Wohnungen + Restflächen + Treppenhaus-Kern
    kern: { treppenhaus: 1, treppen: 1 },
  });

  // ---------------------------------------------------------------------
  // 3) Grundriss-Generator (Finch-Kern): jede Wohnungs-Zone wird mit
  //    Zimmern, internem Flur und Möbeln gefüllt; der Generator setzt dabei
  //    automatisch Zonentüren zwischen den neuen Räumen (und zum Korridor).
  //    Baustein 9.
  // ---------------------------------------------------------------------
  await B.grundrissFuellen(page, { mindestZonenDelta: 5, mindestMoebel: 4 });

  // ---------------------------------------------------------------------
  // 4) Geschosse stapeln (B1): das Regelgeschoss samt Wohnungen, Möbeln,
  //    Zonentüren und Treppe deckungsgleich nach oben kopieren — zweimal,
  //    für ein 4-geschossiges MFH (EG + 1.OG bereits vorhanden, +2.OG/+3.OG
  //    durch Stapeln). Baustein 10.
  // ---------------------------------------------------------------------
  await B.geschosseStapeln(page, 2, { minZonenOberstes: 10, minMoebelOberstes: 4 });

  // ---------------------------------------------------------------------
  // 5) Fluchtweg-Check (V2-F2): das Erschliessungskern-Treppenhaus ist ab
  //    jetzt Fluchtziel — die Kennzahlen-Leiste bewertet jede Wohnung gegen
  //    den VKF-Richtwert (35 m). Diese Baustruktur ist gross genug, dass der
  //    Egress-Status ehrlich sichtbar sein MUSS (Länge lesbar, keine stumme
  //    Lücke), unabhängig davon, ob der Richtwert eingehalten wird.
  //    Baustein 11.
  // ---------------------------------------------------------------------
  const befund = await B.checksLesen(page);
  expect(befund, 'Checks-Panel liefert keinen Befund').not.toBeNull();
  // Türen werden vom Grundriss-Generator + Kern-Anbindung automatisch
  // gesetzt — keine Wohnung darf als «ohne Verbindung» auffallen.
  expect(befund!.text, `Unverbundene Wohnung im Egress-Befund:\n${befund!.text}`).not.toContain(
    'keine Verbindung zum Treppenhaus',
  );
  // Wo ein Fluchtweg-Befund erscheint, muss die Länge in Metern lesbar sein.
  // (Die MFH-Wohnungen liegen konform nah am zentralen Kern → der Egress ist
  //  hier still. Die scharfe «≥1 lesbare Länge»-Pinnung (Fable-Review-2,
  //  Auflage 1) sitzt in der Hochhaus-Journey, wo bewusst ein Fluchtweg-
  //  FEHLER > 35 m erzwungen wird — ein Fehler sortiert im Panel nach oben
  //  (`checks.ts` fehler-zuerst) und ist damit truncation-fest sichtbar.)
  for (const laenge of befund!.fluchtwegLaengenM) {
    expect(laenge).toBeGreaterThan(0);
  }

  // ---------------------------------------------------------------------
  // 6) Berechnungsliste: %-Erfüllung des Raumprogramms. Eine zweite,
  //    geplante aber (noch) nicht gezeichnete Kategorie (Attika, markt-
  //    gerecht) steht bewusst bei 0 % — ehrliche Lücke statt Fake-Erfüllung
  //    (exakt das Verhalten, das der CSV-Import-Test von KosmoDesign
  //    beweist). Baustein 12.
  // ---------------------------------------------------------------------
  await page.evaluate((posten) => {
    window.__kosmo.run('design.raumprogrammSetzen', { posten });
  }, szenario.raumprogramm);
  await B.berechnungslistePruefen(page, { gebaut: ['preisguenstig'], geplant: ['marktgerecht'] });

  // ---------------------------------------------------------------------
  // 7) Kosmo (Mock-Provider) fährt die Kette per Sprache: noch ein
  //    Attikageschoss stapeln — dieselbe Diff-Karten-Kette wie beim
  //    manuellen Klick, nur über den Chat angestossen. Baustein 13, Modus
  //    «vorschlag».
  // ---------------------------------------------------------------------
  const geschosseVorKosmo = await page.evaluate(() => window.__kosmo.state().doc.storeysOrdered().length);
  await B.kosmoFragen(page, 'Staple das Geschoss 1 mal', {
    modus: 'vorschlag',
    nachher: () => page.evaluate(() => window.__kosmo.state().doc.storeysOrdered().length),
    erwartetWert: geschosseVorKosmo + 1,
  });

  // ---------------------------------------------------------------------
  // 7c) KosmoVis-Render über die (Fake-)Bridge (H3): «Drei Stimmungen» →
  //     Render → Bild am Node → aufs Blatt. Prüft DEN WEG durch die Bridge,
  //     nicht die Bildqualität. Nur bei laufender :8600-Fake-Bridge (Regel
  //     R7); fehlt sie, wird das Segment ehrlich mit Anleitung übersprungen —
  //     kein stiller Pass. Baustein 14 (bewiesen aus einem Aufrufer, H1b).
  // ---------------------------------------------------------------------
  if (await B.bridgeVerfuegbar()) {
    await B.renderUeberBridge(page);
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[sim-mfh] Render-Segment übersprungen — ${B.BRIDGE_FEHLT_HINWEIS}`);
  }

  // ---------------------------------------------------------------------
  // 7b) Themenplan-Overrides (RE-ARCHICAD A5): ein Brandschutzplan tönt das
  //     Treppenhaus rot und trägt die Legende auf dem Blatt — dann Export.
  //     Baustein 16 (Blatt-Aufbau) + Baustein 17 (Export).
  // ---------------------------------------------------------------------
  await page.evaluate(() => {
    window.__kosmo.run('design.themenPlanSpeichern', {
      name: 'Brandschutz',
      regeln: [{ kriterium: 'raumTyp', wert: 'treppenhaus', farbe: '#cc3322', label: 'Fluchtweg' }],
    });
  });
  await B.blattPublizieren(page, { thema: 'Brandschutz' });
  const sheetCanvas = page.locator('[data-testid="sheet-canvas"]');
  await expect(sheetCanvas).toContainText('Brandschutz');
  await expect(sheetCanvas).toContainText('Fluchtweg'); // Themenplan-Legende

  await B.exportPruefen(page, 'export-set', /Plansatz\.pdf$/);
});
