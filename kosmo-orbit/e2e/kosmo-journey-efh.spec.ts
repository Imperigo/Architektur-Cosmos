import { expect, test } from '@playwright/test';
import type { SzenarioSkript } from '@kosmo/ai';
import { kosmoChatSkript, projektStarten, viewportAufnahme } from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';

/**
 * v0.6.7 Simulationsrunde 1 / Journey A — «EFH kompakt, komplett über Kosmo»
 * (Fable als Nutzer). Anders als die Serie-H-Journeys (window.__kosmo.run)
 * baut diese Journey das Haus AUSSCHLIESSLICH über den echten Kosmo-Chat:
 * ScriptedProvider → ChatSession → Validierung → Kontext-Defaults →
 * Diff-Karten-Pakete → Freigabe. Danach der volle Vis-Weg: Drei Stimmungen,
 * Render (Fake-Worker), Viewport-Aufnahme, Kuratieren, Prompt-Transparenz.
 *
 * Die Journey ist zugleich lebende Doku des «Kosmo-als-Werkzeug»-Vertrags:
 * — $neu:N referenziert Paket-intern erstellte Elemente (KosmoPanel:796).
 * — storeyId/assemblyId kommen aus den App-Kontext-Defaults, nie aus dem
 *   Skript (personas.ts «rate NIE IDs»).
 * Reibungen aus dem Erstlauf sind als BEFUND-Kommentare markiert und im
 * SIM-BEFUNDE-Journal (H-Reihe) triagiert.
 */

const EFH_SKRIPT: SzenarioSkript = {
  id: 'journey-efh',
  zuege: [
    {
      nutzerErwartung: 'aufbau',
      antwortText: 'Ich lege zuerst einen Sichtbeton-Aussenwand-Aufbau in den Katalog.',
      toolCalls: [
        {
          name: 'design_aufbauErstellen',
          args: {
            name: 'AW Sichtbeton 39',
            target: 'wall',
            layers: [
              { material: 'beton', thickness: 250, function: 'tragend' },
              { material: 'daemmung-mw', thickness: 140, function: 'daemmung' },
            ],
          },
        },
      ],
    },
    {
      nutzerErwartung: 'rohbau',
      antwortText:
        'Ich zeichne die vier Aussenwände 10 × 8 m und setze zwei Fenster und die Haustür — ein Paket, ein Entscheid.',
      toolCalls: [
        { name: 'design_wandZeichnen', args: { a: { x: 0, y: 0 }, b: { x: 10000, y: 0 } } },
        { name: 'design_wandZeichnen', args: { a: { x: 10000, y: 0 }, b: { x: 10000, y: 8000 } } },
        { name: 'design_wandZeichnen', args: { a: { x: 10000, y: 8000 }, b: { x: 0, y: 8000 } } },
        { name: 'design_wandZeichnen', args: { a: { x: 0, y: 8000 }, b: { x: 0, y: 0 } } },
        {
          name: 'design_oeffnungSetzen',
          args: { wallId: '$neu:0', openingType: 'fenster', center: 2500, width: 1600, height: 1400, sill: 900 },
        },
        {
          name: 'design_oeffnungSetzen',
          args: { wallId: '$neu:2', openingType: 'fenster', center: 5000, width: 2400, height: 2200, sill: 300 },
        },
        {
          name: 'design_oeffnungSetzen',
          args: { wallId: '$neu:3', openingType: 'tuer', center: 4000, width: 1000, height: 2100, sill: 0 },
        },
      ],
    },
    {
      nutzerErwartung: 'decke',
      antwortText: 'Die Erdgeschossdecke kommt als 25-cm-Platte über den ganzen Grundriss.',
      toolCalls: [
        {
          name: 'design_deckeZeichnen',
          args: {
            outline: [
              { x: 0, y: 0 },
              { x: 10000, y: 0 },
              { x: 10000, y: 8000 },
              { x: 0, y: 8000 },
            ],
            thickness: 250,
          },
        },
      ],
    },
    {
      nutzerErwartung: 'treppe',
      antwortText: 'Eine gerade Treppe an der Ostwand, 1 m Laufbreite.',
      toolCalls: [
        {
          name: 'design_treppeErstellen',
          args: { a: { x: 9200, y: 1200 }, b: { x: 9200, y: 5200 }, width: 1000, form: 'gerade' },
        },
      ],
    },
    {
      nutzerErwartung: 'zonen',
      antwortText: 'Ich lege Wohnen und Bad als Zonen an und setze gleich die Raumtypen.',
      toolCalls: [
        {
          name: 'design_zoneErstellen',
          args: {
            name: 'Wohnen / Essen',
            sia: 'HNF',
            outline: [
              { x: 400, y: 400 },
              { x: 6800, y: 400 },
              { x: 6800, y: 7600 },
              { x: 400, y: 7600 },
            ],
          },
        },
        {
          name: 'design_zoneErstellen',
          args: {
            name: 'Bad',
            sia: 'NNF',
            outline: [
              { x: 7200, y: 5600 },
              { x: 8800, y: 5600 },
              { x: 8800, y: 7600 },
              { x: 7200, y: 7600 },
            ],
          },
        },
        { name: 'design_raumTypSetzen', args: { zoneId: '$neu:0', raumTyp: 'wohnen' } },
        { name: 'design_raumTypSetzen', args: { zoneId: '$neu:1', raumTyp: 'bad' } },
      ],
    },
    {
      nutzerErwartung: 'dach',
      antwortText: 'Zum Schluss das Walmdach mit 35 Grad und einem halben Meter Vordach.',
      toolCalls: [
        {
          name: 'design_dachErstellen',
          args: {
            outline: [
              { x: 0, y: 0 },
              { x: 10000, y: 0 },
              { x: 10000, y: 8000 },
              { x: 0, y: 8000 },
            ],
            pitch: 35,
            overhang: 500,
          },
        },
      ],
    },
  ],
};

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => {
        doc: { byKind: (k: string) => Array<{ id: string; name?: string }> };
        activeStoreyId: string;
      };
    };
  }
}

test('Journey A: EFH komplett über Kosmo-Chat bauen, dann Vis-Kette bis Kuratieren', async ({ page }) => {
  test.setTimeout(180_000);
  await projektStarten(page, SZENARIEN.efh);

  // ── Akt 1: das Haus entsteht NUR über Kosmo-Chat-Pakete ────────────────
  const protokoll = await kosmoChatSkript(page, 'journey-efh', EFH_SKRIPT, {
    nutzerTexte: [
      'Leg bitte einen Sichtbeton-Aufbau für die Aussenwände an',
      'Bau den Rohbau: 10 auf 8 Meter, zwei Fenster, eine Haustür',
      'Jetzt die Decke übers Erdgeschoss',
      'Eine gerade Treppe bitte',
      'Zonen: grosses Wohnen, kleines Bad — mit Raumtypen',
      'Und zum Schluss ein Walmdach',
    ],
  });

  expect(protokoll).toHaveLength(6);
  for (const zug of protokoll) expect(zug.fehler, `Zug ${zug.zug}: ${zug.fehler ?? ''}`).toBeUndefined();

  // Das Doc trägt jetzt das ganze Haus — alles durch Freigaben entstanden.
  const doc = () => page.evaluate(() => ({
    walls: window.__kosmo.state().doc.byKind('wall').length,
    slabs: window.__kosmo.state().doc.byKind('slab').length,
    stairs: window.__kosmo.state().doc.byKind('stair').length,
    zones: window.__kosmo.state().doc.byKind('zone').length,
    roofs: window.__kosmo.state().doc.byKind('roof').length,
    openings: window.__kosmo.state().doc.byKind('opening').length,
  }));
  await expect.poll(doc).toEqual({ walls: 4, slabs: 1, stairs: 1, zones: 2, roofs: 1, openings: 3 });

  // ── Akt 2: Sehen — Drei Stimmungen, Render, Prompt-Transparenz ────────
  // Das offene Kosmo-Panel verdeckt die Stations-Navigation (Sim-Befund
  // 0.6.7, H-29: behoben — Schliessen-Knopf trägt jetzt data-testid
  // `kosmo-panel-schliessen`, KosmoPanel.tsx).
  await page.locator('[data-testid="kosmo-panel-schliessen"]').click();
  // Stationswechsel aus KosmoDesign heraus: derselbe __kosmo.open()-Weg wie
  // vis-automatik.spec/module.spec (module-vis lebt nur in der Zentrale).
  await page.evaluate(() => (window.__kosmo as unknown as { open: (s: string) => void }).open('vis'));
  await page.click('[data-testid="drei-stimmungen"]');
  const ersterRender = page.locator('[data-testid="vis-node-render"]').first();
  await expect(ersterRender).toBeVisible();

  // Prompt-Transparenz: Formularfelder fliessen sichtbar in den finalen Prompt.
  await ersterRender.locator('[data-testid="render-formular-szene"]').selectOption('Aussenansicht vom Hof');
  await ersterRender.locator('[data-testid="render-formular-jahreszeit"]').selectOption('Winter');
  const finalPrompt = ersterRender.locator('[data-testid="render-final-prompt"]');
  await expect(finalPrompt).toContainText(/hof/i);
  await expect(finalPrompt).toContainText(/winter/i);

  // H-32 behoben (V1-Welle Auflage 0): der Veraltet-Vergleich nutzt jetzt
  // denselben kombinierten Prompt wie das Absenden (NodeCanvas.tsx) — die
  // Journey setzt die Formularfelder und rendert direkt, kein Workaround
  // mehr nötig (Beweis: render-bild wird trotz gesetztem Formular sichtbar).
  await ersterRender.locator('[data-testid="render-ausfuehren"]').click();
  await expect(ersterRender.locator('[data-testid="render-bild"]')).toBeVisible({ timeout: 25_000 });

  // ── Akt 3: Viewport-Aufnahme als zweite, ehrliche Bildquelle ──────────
  await viewportAufnahme(page);
  await page.selectOption('[data-testid="node-hinzu"]', 'aufnahme');
  const aufnahmeNode = page.locator('[data-testid="vis-node-aufnahme"]');
  await expect(aufnahmeNode).toBeVisible();
  const aufnahmeBild = aufnahmeNode.locator('img');
  await expect(aufnahmeBild).toBeVisible();
  expect(await aufnahmeBild.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

  // ── Akt 4: Kuratieren — Render-Bild merken ─────────────────────────────
  await page.click('[data-testid="vis-kuratier-toggle"]');
  const kuratierFlaeche = page.locator('[data-testid="vis-kuratier-flaeche"]');
  await expect(kuratierFlaeche).toBeVisible();
  await kuratierFlaeche.locator('[data-testid="vis-kuratier-stern"]').first().click();
});
