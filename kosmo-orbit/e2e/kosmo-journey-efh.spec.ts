import { expect, test, type Page } from '@playwright/test';
import type { SzenarioSkript } from '@kosmo/ai';
import { kosmoChatSkript, projektStarten, viewportAufnahme } from './sim/bausteine';
import { SZENARIEN } from './sim/szenarien';
import { waehleOptionInScope } from './helfer/waehleOption';

/**
 * v0.8.10 / P-B1 (`docs/V0810-SPEZ.md` §2 E2, Matrix C-4/C-5) — nur das
 * VIS-Kapitel (Akt 2-4, ab «Stationswechsel») wechselt auf Island-Bootstrap;
 * Akt 1/1b/1c bleiben unangetastet auf KosmoDesign. Ein voll leerer
 * `storageState` würde ALLE vier Stationen auf Island kippen und damit in
 * Design's Manuell-Modus eingreifen (Sanktion 6, `view-2d`/`kosmo-panel-
 * schliessen`/`undo` oben brauchen die heutige Design-Chrome unverändert) —
 * TEIL-Seed (design/publish/prepare bleiben 'manuell', `visOberflaeche`
 * fehlt bewusst → echter Produktions-Default 'island' über `ui-zustand.ts`s
 * Fehlertoleranz) statt des globalen `manuell-seed.ts`-Helfers (bleibt
 * unangetastet), Muster `e2e/vis-editor.spec.ts`s H-36/`e2e/vis-
 * automatik.spec.ts`. Vis-Bootstrap läuft über die GRAPH-/STIMMUNG-Inseln;
 * die Node-Ebene bleibt unverändert (Sanktion 6).
 */
const JOURNEY_PORT = process.env['KOSMO_E2E_PORT'] ?? '5183';
test.use({
  storageState: {
    cookies: [],
    origins: [
      {
        origin: `http://localhost:${JOURNEY_PORT}`,
        localStorage: [
          {
            name: 'kosmo.ui.v1',
            value: JSON.stringify({
              version: 1,
              modusAutomatik: false,
              modusFesthalten: false,
              phasenFokus: null,
              designOberflaeche: 'manuell',
              publishOberflaeche: 'manuell',
              prepareOberflaeche: 'manuell',
            }),
          },
          {
            name: 'kosmo.leistung.v1',
            value: JSON.stringify({ version: 1, zustimmungErteilt: false, override: 'auto', renderBeiBedarf: false }),
          },
          { name: 'kosmo.dock.presetInit.v1', value: '1' },
        ],
      },
    ],
  },
});

/** Muster `e2e/blender-bridge.spec.ts`s `oeffneVisWerkzeug`. */
async function oeffneVisWerkzeug(page: Page, island: string, werkzeugId: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-root"]`);
  await expect(page.locator(`[data-testid="island-werkzeug-${werkzeugId}"]`)).toBeVisible();
  await page.click(`[data-testid="island-werkzeug-${werkzeugId}"]`);
}

/** GRAPH-Insel Node-Palette (Ersatz für `waehleOption(page, 'node-hinzu', typ)`). */
async function islandNodeHinzu(page: Page, typ: string): Promise<void> {
  await oeffneVisWerkzeug(page, 'graph', 'palette');
  const eintrag = page.locator(`[data-testid="island-palette-eintrag-${typ}"]`);
  await expect(eintrag).toBeVisible();
  await eintrag.click();
}

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

  // ── Akt 1b: Fenster parametrieren (v0.6.9 Stream F) ────────────────────
  // ScriptedProvider-Skripte sind STATISCH (H-37, packages/kosmo-ai/src/
  // scripted.ts Kopfkommentar) — ein `SzenarioSkript` kann NICHT auf eine
  // erst zur Laufzeit vom `rohbau`-Zug oben erzeugte `openingId` reagieren
  // (`$neu:N` löst nur paket-INTERNE Rückverweise DESSELBEN Zugs auf). Darum
  // bleibt EFH_SKRIPT oben unverändert (Zug-Zählung/Assertionen unangetastet)
  // und dieser neue Zug läuft als eigener, zweiter `kosmoChatSkript`-Aufruf:
  // die reale Id wird jetzt — NACH dem Rohbau — aus dem Doc gelesen und in
  // einem frisch gemounteten Skript-Container real referenziert.
  const wohnzimmerfensterId = await page.evaluate(() => {
    const openings = window.__kosmo.state().doc.byKind('opening') as unknown as Array<{
      id: string;
      openingType: string;
      width: number;
    }>;
    // Das breitere der beiden Rohbau-Fenster (2400 mm, Südwand, Brüstung
    // 300 — bodennahe Verglasung) ist das Wohnzimmerfenster; das schmalere
    // (1600 mm, Brüstung 900) liegt an der Ostwand (Bad/Nebenraum).
    return openings
      .filter((o) => o.openingType === 'fenster')
      .reduce((a, b) => (b.width > a.width ? b : a)).id;
  });

  const FENSTER_SKRIPT: SzenarioSkript = {
    id: 'journey-efh-fenster',
    zuege: [
      {
        nutzerErwartung: 'zweiflügelig',
        antwortText: 'Ich mache das Wohnzimmerfenster zweiflügelig mit einer Sprosse in der Mitte.',
        toolCalls: [
          {
            name: 'design_fensterParametrieren',
            args: { openingId: wohnzimmerfensterId, fensterTyp: 'zweifluegel', teilungN: 2, teilungM: 1, swing: 'links' },
          },
        ],
      },
    ],
  };
  const fensterProtokoll = await kosmoChatSkript(page, 'journey-efh-fenster', FENSTER_SKRIPT, {
    nutzerTexte: ['Mach das Wohnzimmerfenster zweiflügelig mit Sprosse'],
  });
  expect(fensterProtokoll).toHaveLength(1);
  expect(fensterProtokoll[0]!.fehler, fensterProtokoll[0]!.fehler ?? '').toBeUndefined();

  // Doc: das Opening trägt jetzt den parametrischen Fenstertyp + die Sprosse
  // (teilung 2×1 = ein vertikaler Steg).
  const fensterZustand = await page.evaluate((id) => {
    const o = window.__kosmo.state().doc.byKind('opening').find((x) => x.id === id) as unknown as
      | { fensterTyp?: string; teilung?: { n: number; m: number } }
      | undefined;
    return { fensterTyp: o?.fensterTyp, teilung: o?.teilung };
  }, wohnzimmerfensterId);
  expect(fensterZustand).toEqual({ fensterTyp: 'zweifluegel', teilung: { n: 2, m: 1 } });

  // Plan-Sichtbarkeit: der Öffnungsbogen (`fenster-bogen`, derive/plan.ts,
  // erst bei gesetztem fensterTyp+swing gezeichnet) erscheint jetzt im
  // Grundriss — Regressions-Anker für PlanView.tsx (Arc-`className`,
  // vorher wurden `plan.arcs`-Klassen beim Rendern verworfen).
  await page.click('[data-testid="view-2d"]');
  const fensterBogen = page.locator('[data-testid="planview"] path.fenster-bogen');
  await expect.poll(() => fensterBogen.count()).toBeGreaterThan(0);

  // ── Akt 1c: Fenster auf Drehkipp stellen (v0.7.1 E5, docs/V071-KONZEPT.md
  //    Kernentscheid E5/4B) ────────────────────────────────────────────────
  // Gleiches Muster wie Akt 1b: eigener, dritter `kosmoChatSkript`-Container
  // (ScriptedProvider-Skripte sind STATISCH — die reale openingId kann nur
  // NACH dem Rohbau real referenziert werden, EFH_SKRIPT/FENSTER_SKRIPT oben
  // bleiben unangetastet). `design.eigenschaftSetzen` ändert GENAU ein Feld
  // (fluegelTyp) am bestehenden, bereits zweiflügligen Wohnzimmerfenster —
  // steuert die SIA-Öffnungssymbolik in Ansicht/Grundriss.
  const FLUEGELTYP_SKRIPT: SzenarioSkript = {
    id: 'journey-efh-fluegeltyp',
    zuege: [
      {
        nutzerErwartung: 'drehkipp',
        antwortText: 'Ich stelle das Wohnzimmerfenster auf Drehkipp.',
        toolCalls: [
          {
            name: 'design_eigenschaftSetzen',
            args: { entityId: wohnzimmerfensterId, feld: 'fluegelTyp', wert: 'drehkipp' },
          },
        ],
      },
    ],
  };
  const fluegeltypProtokoll = await kosmoChatSkript(page, 'journey-efh-fluegeltyp', FLUEGELTYP_SKRIPT, {
    nutzerTexte: ['Stell das Wohnzimmerfenster auf Drehkipp'],
  });
  expect(fluegeltypProtokoll).toHaveLength(1);
  expect(fluegeltypProtokoll[0]!.fehler, fluegeltypProtokoll[0]!.fehler ?? '').toBeUndefined();
  // EIN Tool-Call → genau EINE Diff-Karte (`proposal-card`/`apply-proposal`,
  // Baustein 23 `kosmoChatSkript`) ist bereits durch den Klick durchgelaufen —
  // `proposals === 1` belegt, dass sie erschien und angewendet wurde.
  expect(fluegeltypProtokoll[0]!.proposals).toBe(1);

  // Doc: die Öffnung trägt jetzt fluegelTyp 'drehkipp'.
  const fluegelTypAusgelesen = () =>
    page.evaluate((id) => {
      const o = window.__kosmo.state().doc.byKind('opening').find((x) => x.id === id) as unknown as
        | { fluegelTyp?: string }
        | undefined;
      return o?.fluegelTyp;
    }, wohnzimmerfensterId);
  await expect.poll(fluegelTypAusgelesen).toBe('drehkipp');

  // Undo: `design.eigenschaftSetzen` liefert GENAU EIN Patch
  // (`[{ id, before, after }]`, packages/kosmo-kernel/src/commands/design.ts
  // `setProperty`) — EIN Klick auf «Rückgängig» hebt den fluegelTyp wieder
  // vollständig auf (kein Rest-Zustand, der zweiflüglige Fenstertyp aus
  // Akt 1b bleibt davon unberührt).
  await page.click('[data-testid="undo"]');
  await expect.poll(fluegelTypAusgelesen).toBeUndefined();

  // ── Akt 2: Sehen — Drei Stimmungen, Render, Prompt-Transparenz ────────
  // Das offene Kosmo-Panel verdeckt die Stations-Navigation (Sim-Befund
  // 0.6.7, H-29: behoben — Schliessen-Knopf trägt jetzt data-testid
  // `kosmo-panel-schliessen`, KosmoPanel.tsx).
  await page.locator('[data-testid="kosmo-panel-schliessen"]').click();
  // Stationswechsel aus KosmoDesign heraus: derselbe __kosmo.open()-Weg wie
  // vis-automatik.spec/module.spec (module-vis lebt nur in der Zentrale).
  await page.evaluate(() => (window.__kosmo as unknown as { open: (s: string) => void }).open('vis'));
  await oeffneVisWerkzeug(page, 'stimmung', 'stimmung');
  await page.click('[data-testid="island-drei-stimmungen"]');
  const ersterRender = page.locator('[data-testid="vis-node-render"]').first();
  await expect(ersterRender).toBeVisible();

  // Prompt-Transparenz: Formularfelder fliessen sichtbar in den finalen Prompt.
  // H-30 (0.6.8): die Options-Values sind stabile Schlüssel, nicht mehr die
  // Prompt-Langtexte selbst — `formularZusatz` (vis-jobs.ts) übersetzt sie
  // zurück, die Regex-Assertionen unten bleiben darum unverändert gültig.
  await waehleOptionInScope(ersterRender, 'render-formular-szene', 'hof');
  await waehleOptionInScope(ersterRender, 'render-formular-jahreszeit', 'winter');
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
  await islandNodeHinzu(page, 'aufnahme');
  const aufnahmeNode = page.locator('[data-testid="vis-node-aufnahme"]');
  await expect(aufnahmeNode).toBeVisible();
  const aufnahmeBild = aufnahmeNode.locator('img');
  await expect(aufnahmeBild).toBeVisible();
  expect(await aufnahmeBild.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

  // ── Akt 4: Kuratieren — Render-Bild merken ─────────────────────────────
  // Island-Hotspot (Muster `e2e/vis-editor.spec.ts`s H-36-Fix): der Insel-
  // Einstellungs-Kreis überdeckt den Kuratier-Knopf oben rechts.
  try {
    await page.locator('[data-testid="vis-kuratier-toggle"]').click({ timeout: 8000 });
  } catch {
    await page.locator('[data-testid="vis-kuratier-toggle"]').dispatchEvent('click');
  }
  const kuratierFlaeche = page.locator('[data-testid="vis-kuratier-flaeche"]');
  await expect(kuratierFlaeche).toBeVisible();
  await kuratierFlaeche.locator('[data-testid="vis-kuratier-stern"]').first().click();
});
