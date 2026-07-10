import { expect, test } from '@playwright/test';
import { SZENARIEN } from './sim/szenarien';
import { projektStarten, parzelleSetzen, kosmoChatSkript, viewportAufnahme } from './sim/bausteine';
import { MFH_SKRIPT, MFH_NUTZERTEXTE } from './sim/skripte-mfh';

/**
 * v0.6.7 Nachtkampagne — Journey B «Mehrfamilienhaus»: EINE Benutzersimulation,
 * die den Rohbau AUSSCHLIESSLICH über den Kosmo-Chat baut (ScriptedProvider,
 * `packages/kosmo-ai/src/scripted.ts` + Baustein `kosmoChatSkript`,
 * `e2e/sim/bausteine.ts`). Der Rahmen (Projekt/Standort/Parzelle) läuft über
 * die etablierten Bausteine `projektStarten`/`parzelleSetzen` — DAS ist kein
 * Chat-Bau, sondern Szenario-Setup, wie in `sim-mfh.spec.ts` üblich.
 *
 * Nach dem Chat-Bau läuft die Visualisierung KOMPLETT über die UI: drei
 * Stimmungen → Render über die Fake-Worker-Bridge → Viewport-Aufnahme →
 * Vergleich Bridge-Bild vs. Aufnahme → Kuratieren (Stern) → aufs Blatt.
 *
 * Befund-Protokoll (Kernzweck dieser Journey): jede Reibung ist im
 * Abschlussbericht nummeriert.
 *
 * 0.6.8-ABLÖSUNG (vormals Befund 6): der Geschosswechsel vor dem Dach lief
 * früher über einen `window.__kosmo.run`-Fallback (falsches Dach löschen,
 * korrektes auf dem obersten Geschoss neu anlegen), weil kein Chat-Command
 * das aktive Geschoss wechseln konnte. `ui.geschossSetzen` (H-33) schliesst
 * diese Lücke jetzt echt — Zug 8 in `e2e/sim/skripte-mfh.ts` wechselt das
 * aktive Geschoss über den ECHTEN Chat-Weg. Weil `ui.geschossSetzen` ein
 * Read-Tool ist (App-Zustand, sofort, KEINE Diff-Karte — siehe Kopfkommentar
 * in `skripte-mfh.ts`), passt dieser Zug nicht ins `kosmoChatSkript`-Muster
 * (das je Zug genau eine Karte erwartet) — er läuft darum manuell, wie
 * Zug 1, zwischen den zwei `kosmoChatSkript`-Abschnitten unten.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      open: (screen: string) => void;
      state: () => {
        doc: {
          byKind: <T = { id: string; storeyId?: string; name?: string; [k: string]: unknown }>(
            k: string,
          ) => T[];
          storeysOrdered: () => { id: string; name: string; index: number }[];
          settings: { fassadenModule: { name: string; elemente: unknown[] }[]; [k: string]: unknown };
        };
        activeStoreyId: string | null;
      };
    };
    __kosmoViewport: {
      renderOnce: () => void;
    };
  }
}

const GEBAEUDE_OUTLINE = [
  { x: 0, y: 0 },
  { x: 24000, y: 0 },
  { x: 24000, y: 14000 },
  { x: 0, y: 14000 },
];

test('Journey B «Mehrfamilienhaus»: Rohbau ausschliesslich über den Kosmo-Chat, Vis über die UI', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const szenario = SZENARIEN.mfh;

  // ---------------------------------------------------------------------
  // Rahmen (erlaubt, kein Chat-Bau): Projekt + Standort + Parzelle/Zonenregel.
  // Bootstrap legt EG + 1.OG samt Standard-Aussenwandaufbau «AW Beton 36» an
  // (project-store.ts bootstrapProject) — genau der App-Kontext, den
  // ChatSession.applyDefaults() für storeyId/assemblyId braucht.
  // ---------------------------------------------------------------------
  await projektStarten(page, szenario);
  await parzelleSetzen(page, szenario);

  const egId = await page.evaluate(() => window.__kosmo.state().activeStoreyId);
  expect(egId).not.toBeNull();

  const vorher = await page.evaluate(() => {
    const doc = window.__kosmo.state().doc;
    return {
      columns: doc.byKind('column').length,
      grid: doc.byKind('grid').length,
      walls: doc.byKind('wall').length,
      slabs: doc.byKind('slab').length,
      zones: doc.byKind('zone').length,
      storeys: doc.storeysOrdered().length,
      assemblies: doc.byKind('assembly').length,
    };
  });

  // =======================================================================
  // ZUG 1 (manuell statt über den Baustein): Raster + Stützen — EIN Paket
  // aus 2 Tool-Calls. Manuell nachgebildet (identisches Protokoll wie
  // `kosmoChatSkript`, siehe e2e/sim/bausteine.ts), NUR um den geforderten
  // Screenshot «Chat mit Paket-Karten» VOR dem Anwenden einzufangen — die
  // restlichen 8 Züge laufen über den echten `kosmoChatSkript`-Baustein.
  // =======================================================================
  await page.evaluate(
    ({ skriptId, skript }) => {
      const w = window as unknown as { __kosmoSkripte?: Record<string, unknown> };
      w.__kosmoSkripte = { ...(w.__kosmoSkripte ?? {}), [skriptId]: skript };
      localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'scripted', skriptId }));
    },
    { skriptId: 'journey-b-mfh-zug1', skript: { id: 'journey-b-mfh-zug1', zuege: [MFH_SKRIPT.zuege[0]!] } },
  ); // [Quelle: packages/kosmo-ai/src/scripted.ts globaleSkriptRegistry() / e2e/sim/bausteine.ts kosmoChatSkript]

  // Befund 1: `[data-testid="kosmo-symbol"]` schliesst NICHTS — das Symbol
  // wird nur gerendert, wenn das Panel bereits ZU ist (`{!kosmoOpen &&
  // <KosmoSymbol/>}`, apps/kosmo-orbit/src/App.tsx Z.888). Der echte
  // Schliessen-Knopf im offenen Panel trägt jetzt `data-testid=
  // "kosmo-panel-schliessen"` (Sim-Befund 0.6.7, H-29: behoben,
  // KosmoPanel.tsx). `projektStarten` (Baustein 1) setzt
  // `kosmo.panelOffen=1` — das Panel ist hier also bereits offen; der
  // `kosmoChatSkript`-Baustein selbst geht (wie diese Stelle ursprünglich
  // auch) von `[data-testid="kosmo-symbol"]` als Schliessen-Knopf aus und
  // würde sich an genau diesem Klick aufhängen (Timeout) — siehe
  // Absicherung vor dem Baustein-Aufruf weiter unten.
  if (await page.locator('[data-testid="kosmo-input"]').isVisible()) {
    await page.locator('[data-testid="kosmo-panel-schliessen"]').click();
    await expect(page.locator('[data-testid="kosmo-input"]')).toBeHidden();
  }
  await page.click('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-input"]')).toBeVisible();

  await page.fill('[data-testid="kosmo-input"]', MFH_NUTZERTEXTE[0]!);
  await page.click('[data-testid="kosmo-send"]');

  const zug1Paket = page.locator('[data-testid="paket-card"]').last();
  await expect(zug1Paket).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: 'e2e-results-journey/01-chat-paket-karte.png' });

  await zug1Paket.locator('[data-testid="apply-paket"]').click();
  await expect(zug1Paket.locator('[data-testid="apply-paket"]')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('[data-testid="kosmo-send"]')).toBeEnabled({ timeout: 15_000 });

  // Zug 1 wirklich durch: Stützenzahl = Achsen-Produkt, Raster = 5+3 Achsen.
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('column').length))
    .toBe(vorher.columns + 15);
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('grid').length))
    .toBe(vorher.grid + 8);

  // =======================================================================
  // ZÜGE 2–7 über den echten `kosmoChatSkript`-Baustein (Zug-Index 1..6:
  // Wände, Decke, Zonen, Fassadenmodul, Fenster, Geschosse stapeln).
  // =======================================================================
  // Fallback für Befund 1 (siehe oben): das Panel VOR dem Baustein-Aufruf
  // schliessen, damit `kosmoChatSkript`s eigener `kosmo-symbol`-Klick auf ein
  // bereits geschlossenes Panel trifft (dort funktioniert er — das Symbol
  // existiert dann) statt sich am nicht-existenten Schliessen-Symbol
  // aufzuhängen.
  await page.locator('[data-testid="kosmo-panel-schliessen"]').click();
  await expect(page.locator('[data-testid="kosmo-input"]')).toBeHidden();

  const protokollA = await kosmoChatSkript(
    page,
    'journey-b-mfh-a',
    { id: 'journey-b-mfh-a', zuege: MFH_SKRIPT.zuege.slice(1, 7) },
    { nutzerTexte: MFH_NUTZERTEXTE.slice(1, 7) },
  );

  // =======================================================================
  // ZUG 8 (Geschosswechsel, Zug-Index 7) — MANUELL statt über
  // `kosmoChatSkript`: `ui_geschossSetzen` ist ein Read-Tool (App-Zustand,
  // sofort ausgeführt, KEINE Diff-Karte, siehe Kopfkommentar in
  // `e2e/sim/skripte-mfh.ts`) — `kosmoChatSkript` erwartet für jeden Zug mit
  // genau einem Tool-Call eine `proposal-card`, die hier nie entsteht.
  // Gleiches Remount-Muster wie `kosmoChatSkript` selbst (eigene
  // Skript-Registrierung, Panel zu/auf), damit der ScriptedProvider mit
  // frischem `zugIndex` genau diesen einen Zug spielt.
  // =======================================================================
  await page.evaluate(
    ({ skriptId, skript }) => {
      const w = window as unknown as { __kosmoSkripte?: Record<string, unknown> };
      w.__kosmoSkripte = { ...(w.__kosmoSkripte ?? {}), [skriptId]: skript };
      localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'scripted', skriptId }));
    },
    { skriptId: 'journey-b-mfh-geschoss', skript: { id: 'journey-b-mfh-geschoss', zuege: [MFH_SKRIPT.zuege[7]!] } },
  );
  if (await page.locator('[data-testid="kosmo-input"]').isVisible()) {
    await page.locator('[data-testid="kosmo-panel-schliessen"]').click();
    await expect(page.locator('[data-testid="kosmo-input"]')).toBeHidden();
  }
  await page.click('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-input"]')).toBeVisible();

  const sendKnopfGeschoss = page.locator('[data-testid="kosmo-send"]');
  await expect(sendKnopfGeschoss).toBeEnabled({ timeout: 15_000 });
  await page.fill('[data-testid="kosmo-input"]', MFH_NUTZERTEXTE[7]!);
  await sendKnopfGeschoss.click();
  // Read-Tool: kein Karten-Klick — nur auf den Antwort-/Quittierungs-Umlauf
  // warten (derselbe Vertrag, den `kosmoChatSkript` nach einem Karten-Klick
  // prüft: `kosmo-send` wieder aktiv).
  await expect(sendKnopfGeschoss).toBeEnabled({ timeout: 15_000 });
  expect(
    await page.locator('[data-testid="proposal-card"]').count(),
    'ui_geschossSetzen ist ein Read-Tool — es darf KEINE Diff-Karte erzeugen',
  ).toBe(0);

  const topStoreyId = await page.evaluate(() => window.__kosmo.state().activeStoreyId);
  expect(topStoreyId, 'Der Chat-Geschosswechsel muss activeStoreyId wirklich ändern').not.toBe(egId);
  const topStoreyName = await page.evaluate(
    (id) => window.__kosmo.state().doc.storeysOrdered().find((s) => s.id === id)?.name ?? null,
    topStoreyId,
  );
  expect(topStoreyName, 'ui_geschossSetzen({name:"3.OG"}) muss über den Chat wirklich das 3.OG aktivieren').toBe(
    '3.OG',
  );

  // =======================================================================
  // ZÜGE 9–10 über `kosmoChatSkript` (Zug-Index 8..9: Dach, Material) — das
  // Dach landet jetzt dank Zug 8 ehrlich auf dem obersten Geschoss.
  // =======================================================================
  const protokollB = await kosmoChatSkript(
    page,
    'journey-b-mfh-b',
    { id: 'journey-b-mfh-b', zuege: MFH_SKRIPT.zuege.slice(8) },
    { nutzerTexte: MFH_NUTZERTEXTE.slice(8) },
  );

  const protokoll = [...protokollA, ...protokollB];
  // 0-basierte Indices in MFH_SKRIPT.zuege für die kombinierten Protokoll-
  // einträge — Zug-Index 7 (Geschosswechsel) fehlt bewusst, der ist oben
  // schon separat geprüft.
  const kombinierteZugIndices = [1, 2, 3, 4, 5, 6, 8, 9];
  expect(protokoll).toHaveLength(8);
  for (const [i, eintrag] of protokoll.entries()) {
    const zugIndex = kombinierteZugIndices[i]!;
    expect(eintrag.fehler, `Zug ${zugIndex + 1} («${MFH_NUTZERTEXTE[zugIndex]}») meldet einen Fehler`).toBeUndefined();
  }
  // Erwartete Proposal-Zahlen je Zug (Wände=4 Paket, Rest Einzelvorschläge) —
  // unverändert gegenüber vor der ui_geschossSetzen-Ablösung: der neue Zug 8
  // läuft separat und trägt keinen Proposal.
  expect(protokoll.map((p) => p.proposals)).toEqual([4, 1, 3, 1, 1, 1, 1, 1]);

  // -----------------------------------------------------------------------
  // Nachher-Deltas: der Rohbau steht.
  // -----------------------------------------------------------------------
  const nachher = await page.evaluate((egId) => {
    const doc = window.__kosmo.state().doc;
    return {
      wallsGesamt: doc.byKind('wall').length,
      wallsEg: doc.byKind<{ storeyId: string }>('wall').filter((w) => w.storeyId === egId).length,
      slabsGesamt: doc.byKind('slab').length,
      slabsEg: doc.byKind<{ storeyId: string }>('slab').filter((s) => s.storeyId === egId).length,
      zonesGesamt: doc.byKind('zone').length,
      zonesEg: doc.byKind<{ storeyId: string }>('zone').filter((z) => z.storeyId === egId).length,
      storeys: doc.storeysOrdered().length,
      assemblies: doc.byKind('assembly').length,
      fassadenModule: doc.settings.fassadenModule,
      fenster: doc
        .byKind<{ openingType: string }>('opening')
        .filter((o) => o.openingType === 'fenster').length,
      roofs: doc.byKind('roof').length,
      roofStoreyId: doc.byKind<{ storeyId: string }>('roof')[0]?.storeyId ?? null,
      aufbauNamen: doc.byKind<{ name: string }>('assembly').map((a) => a.name),
    };
  }, egId);

  // EG (das Geschoss, das der Chat tatsächlich bebaut hat) trägt exakt die
  // gezeichneten Elemente; die Gesamtzahl ist ×3, weil design.geschossKopieren
  // (Zug 7) das EG samt Inhalt auf die 2 neuen Geschosse mitkopiert.
  expect(nachher.wallsEg).toBe(4);
  expect(nachher.wallsGesamt).toBe(vorher.walls + 4 * 3);
  expect(nachher.zonesEg).toBe(3);
  expect(nachher.zonesGesamt).toBe(vorher.zones + 3 * 3);
  expect(nachher.storeys).toBe(vorher.storeys + 2);
  expect(nachher.fassadenModule.map((m) => m.name)).toContain('Lochfassade MFH');
  expect(nachher.fenster, 'Fensteranteil nach den Modulen muss > 0 sein').toBeGreaterThan(0);
  expect(nachher.roofs).toBe(1);
  expect(nachher.aufbauNamen).toContain('AW Klinker 36');

  // -----------------------------------------------------------------------
  // Befund 2 — Beweis: Zug 3 («Decke») erzeugt über den Chat KEINE Decke.
  // Ursache: `KosmoPanel.tsx`s `contextDefaults` (Z.399-406) befüllt
  // `assemblyId` GENERISCH für jeden Command, der ein Feld dieses Namens
  // besitzt — mit der ID des ersten WAND-Aufbaus, unabhängig vom Zielbefehl.
  // `design.deckeZeichnen` bekommt dadurch automatisch «AW Beton 36»
  // (target «wall») als `assemblyId` untergeschoben, obwohl der Nutzer nie
  // einen Aufbau nannte — der Command lehnt sich selbst ab («ist kein
  // Decken-Aufbau», commands/design.ts Z.160). Für den Baustein
  // `kosmoChatSkript` ist das UNSICHTBAR: `applyCard()` (KosmoPanel.tsx
  // Z.777-789) entfernt die Proposal-Karte bei Erfolg UND bei einem
  // abgelehnten/fehlerhaften `runCommand`-Aufruf gleichermassen — das
  // Protokoll meldet in beiden Fällen `fehler: undefined`. Nur ein
  // Doc-Delta-Vergleich (wie hier) deckt das auf.
  // BEHOBEN in Sim-Runde 1 (H-27): applyDefaults füllt Kontext-Defaults nur
  // noch in PFLICHT-Felder — das optionale Decken-assemblyId bleibt leer,
  // die Chat-Decke gelingt. Der obige Befund-Kommentar bleibt als Historie;
  // dieser Assert ist der Regressions-Anker für den Fix.
  // -----------------------------------------------------------------------
  expect(nachher.slabsEg, 'H-27-Fix: Chat-Decke gelingt (kein Wand-Aufbau-Leck mehr)').toBe(1);

  // Rest-Fallback nur noch für die von Zug 7 gestapelten Geschosse: das
  // Stapeln lief VOR der Decke, die Chat-Decke deckt nur das EG — die
  // Obergeschosse ziehen wir wie ein Nutzer per Handgriff nach.
  const storeyIdsFuerDecke = await page.evaluate(() =>
    window.__kosmo.state().doc.storeysOrdered().map((s) => s.id),
  );
  await page.evaluate(
    ({ storeyIds, outline }) => {
      const k = window.__kosmo;
      const ohneDecke = storeyIds.filter(
        (sid) => !k.state().doc.byKind('slab').some((sl) => (sl as { storeyId?: string }).storeyId === sid),
      );
      for (const storeyId of ohneDecke) {
        k.run('design.deckeZeichnen', { storeyId, outline });
      }
    },
    { storeyIds: storeyIdsFuerDecke, outline: GEBAEUDE_OUTLINE },
  );
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('slab').length))
    .toBe(storeyIdsFuerDecke.length);

  // -----------------------------------------------------------------------
  // 0.6.8-Ablösung (vormals Befund 6): das Walmdach landet über den ECHTEN
  // Chat-Weg jetzt auf dem RICHTIGEN (obersten) Geschoss — Zug 8
  // (`ui_geschossSetzen`) hat `activeStoreyId` vor dem Dach-Zug umgestellt,
  // `applyDefaults()` füllt storeyId darum mit `topStoreyId`, nicht mehr mit
  // dem unveränderten EG. Kein Lösch-/Neubau-Fallback mehr nötig — das ist
  // der Regressions-Anker für den echten Fix.
  // -----------------------------------------------------------------------
  expect(
    nachher.roofStoreyId,
    'ui_geschossSetzen-Fix: Dach landet über den Chat-Weg auf dem obersten Geschoss, nicht auf EG',
  ).toBe(topStoreyId);

  // Fertiges 3D — Schlüsselmoment-Screenshot.
  await page.click('[data-testid="view-quad"]');
  await expect(page.locator('[data-testid="viewport3d"]')).toBeVisible();
  await page.evaluate(() => window.__kosmoViewport.renderOnce());
  await expect(page.locator('[data-testid="viewport3d"] canvas')).toBeVisible();
  await page.screenshot({ path: 'e2e-results-journey/02-fertiges-3d.png' });

  // =======================================================================
  // VIS — komplett über die UI (kein Chat mehr).
  // =======================================================================
  // `[data-testid="module-vis"]` ist NUR der Einstiegsknopf auf dem
  // OrbitStart-Hub (apps/kosmo-orbit/src/shell/OrbitStart.tsx Z.239) — sobald
  // man (wie hier über `projektStarten`) bereits IN einem Modul ist, gibt es
  // dafür keinen sichtbaren Knopf mehr; der bewiesene Weg (Muster
  // `renderUeberBridge`/`viewportAufnahme`, e2e/sim/bausteine.ts) ist
  // `window.__kosmo.open(screen)`.
  await page.evaluate(() => window.__kosmo.open('vis'));
  await page.click('[data-testid="drei-stimmungen"]');
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3);

  // Prompt-Assertion: die Fassade-Auswahl am ersten Render-Node zeigt die aus
  // dem Modell abgeleiteten Bausteine (derive/renderprompt.ts
  // renderPromptBausteine) — Materialphrase (Aufbau AW Beton 36 → Putz
  // aussen) UND Fensteranteil (aus dem gespeicherten Fassadenmodul).
  const ersterRenderNode = page.locator('[data-testid="vis-node-render"]').first();
  const fassadeSelect = ersterRenderNode.locator('[data-testid="render-formular-fassade"]');
  const fassadenOptionen = await fassadeSelect.locator('option').allTextContents();
  expect(fassadenOptionen.some((t) => t.includes('Fensteranteil'))).toBe(true);
  expect(fassadenOptionen.some((t) => /verputzte Fassade|Sichtbeton|Klinker/.test(t))).toBe(true);
  const fensteranteilOption = fassadenOptionen.find((t) => t.includes('Fensteranteil'))!;
  await fassadeSelect.selectOption({ label: fensteranteilOption });
  await expect(ersterRenderNode.locator('[data-testid="render-final-prompt"]')).toContainText('Fensteranteil');

  // Befund 8 — echter Bug (nicht nur eine Reibung): die «veraltet»-Prüfung
  // (NodeCanvas.tsx Z.776 `veraltet = lauf.memoKey !== memoKey(auftrag)`)
  // vergleicht den beim Absenden GESPEICHERTEN memoKey (der den
  // Formular-Zusatz `formularZusatz(node.params)` MIT einrechnet, Z.474-488
  // `ausfuehren()`) gegen `memoKey(auswertung.renderAuftraege.get(id))` — DAS
  // ist der rohe Prompt OHNE den Formular-Zusatz. Jeder Render, der mit
  // ausgefülltem Formularfeld (Fassade/Szene/Jahreszeit/Personen/Freitext)
  // ausgeführt wird, gilt darum SOFORT und DAUERHAFT als «veraltet» — und
  // `[data-testid="render-bild"]` rendert nur bei `status === 'fertig'`
  // (Z.1724), NIE bei `status === 'veraltet'` (Z.1523): das fertige Bild
  // bleibt für immer unsichtbar, obwohl der Bridge-Job wirklich fertig ist.
  // Fallback: die Formularauswahl vor dem Ausführen wieder zurücksetzen —
  // die Materialphrase/Fensteranteil-Assertion oben ist damit bereits
  // erbracht, unabhängig vom tatsächlich ausgeführten Job.
  await fassadeSelect.selectOption('');

  await ersterRenderNode.locator('[data-testid="render-ausfuehren"]').click();
  await expect(ersterRenderNode.locator('[data-testid="render-status"]')).not.toHaveText('bereit');
  await expect(ersterRenderNode.locator('[data-testid="render-bild"]')).toBeVisible({ timeout: 25_000 });
  const renderBildBreite = await ersterRenderNode
    .locator('[data-testid="render-bild"]')
    .evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(renderBildBreite).toBeGreaterThan(0);

  // Viewport-Aufnahme (Baustein 24) — Design → 3D → renderOnce → «Für Vis
  // aufnehmen» → zurück zu KosmoVis.
  await viewportAufnahme(page);

  await page.selectOption('[data-testid="node-hinzu"]', 'aufnahme');
  await expect(page.locator('[data-testid="vis-node-aufnahme"]')).toHaveCount(1);
  const aufnahmeBild = page.locator('[data-testid="vis-node-aufnahme"] [data-testid="aufnahme-bild"]');
  await expect(aufnahmeBild).toBeVisible();
  const aufnahmeBreite = await aufnahmeBild.evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(aufnahmeBreite).toBeGreaterThan(0);

  // Vergleich Bridge-Bild vs. Aufnahme über einen eigenständigen
  // `vergleich`-Node (Muster e2e/vis-aufnahme.spec.ts). Historie: Befund 7
  // (H-36) — die Kuratier-Fläche zeigte damals nur `render`-Nodes; seit dem
  // V1-Fix nimmt sie auch `aufnahme`-Nodes auf (Assertion unten), der
  // Pixel-Vergleich nebeneinander bleibt aber Sache des vergleich-Nodes.
  // «Drei Stimmungen» (VisWorkspace.tsx Z.170) legt bereits SELBST einen
  // `vergleich`-Node an (Vergleich der drei Stimmungen) — es gibt nach diesem
  // Zug also ZWEI `vergleich`-Nodes; `node-hinzu` fügt den unseren dazu, wir
  // greifen ihn über den zuletzt erzeugten (`nodes.filter(...).at(-1)`).
  await page.selectOption('[data-testid="node-hinzu"]', 'vergleich');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const graph = k.state().doc.byKind<{ id: string; nodes: { id: string; typ: string }[] }>('visgraph')[0]!;
    const render = graph.nodes.find((n) => n.typ === 'render')!;
    const aufnahme = graph.nodes.find((n) => n.typ === 'aufnahme')!;
    const vergleich = graph.nodes.filter((n) => n.typ === 'vergleich').at(-1)!;
    k.run('vis.verbinden', { graphId: graph.id, from: render.id, fromPort: 'bild', to: vergleich.id, toPort: 'bild1' });
    k.run('vis.verbinden', { graphId: graph.id, from: aufnahme.id, fromPort: 'bild', to: vergleich.id, toPort: 'bild2' });
    k.run('vis.nodeSchieben', { graphId: graph.id, nodeId: vergleich.id, x: 620, y: 40 });
  });
  const vergleichKnoten = page.locator('[data-testid="vis-node-vergleich"]').last();
  const vergleichFlaeche = vergleichKnoten.locator('[data-testid="vergleich-bilder"]');
  await expect(vergleichFlaeche).toBeVisible();
  await expect(vergleichFlaeche.locator('img')).toHaveCount(2, { timeout: 15_000 });
  await page.screenshot({ path: 'e2e-results-journey/03-vis-graph-vergleich.png' });

  // Kuratieren (Stern) — seit dem H-36-Fix (Welle V1) zeigt die Fläche neben
  // dem ausgeführten Render-Node auch den aufnahme-Node mit Viewport-Bild:
  // genau ZWEI Karten (Regressions-Anker für den geheilten Zustand).
  await page.click('[data-testid="vis-kuratier-toggle"]');
  await expect(page.locator('[data-testid="vis-kuratier-flaeche"]')).toBeVisible();
  const kuratierKarten = page.locator('[data-testid="vis-kuratier-karte"]');
  await expect(kuratierKarten).toHaveCount(2);
  const stern = kuratierKarten.first().locator('[data-testid="vis-kuratier-stern"]');
  await stern.click();
  await expect(stern).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-testid="vis-kuratier-toggle"]'); // wieder schliessen

  // Aufs Blatt.
  const bilderVorher = await page.evaluate(() =>
    window.__kosmo
      .state()
      .doc.byKind<{ bilder?: unknown[] }>('sheet')
      .reduce((s, sh) => s + (sh.bilder?.length ?? 0), 0),
  );
  await page.selectOption('[data-testid="node-hinzu"]', 'blatt');
  await page.evaluate(() => {
    const k = window.__kosmo;
    const graph = k.state().doc.byKind<{ id: string; nodes: { id: string; typ: string }[] }>('visgraph')[0]!;
    const render = graph.nodes.find((n) => n.typ === 'render')!;
    const blatt = graph.nodes.find((n) => n.typ === 'blatt')!;
    k.run('vis.verbinden', { graphId: graph.id, from: render.id, fromPort: 'bild', to: blatt.id, toPort: 'bild' });
    k.run('vis.nodeSchieben', { graphId: graph.id, nodeId: blatt.id, x: 620, y: 320 });
  });
  await page.locator('[data-testid="blatt-ablegen"]').click();
  await expect(
    page.locator('[data-testid="meldung-erfolg"]', { hasText: 'Render liegt auf' }),
  ).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__kosmo
          .state()
          .doc.byKind<{ bilder?: unknown[] }>('sheet')
          .reduce((s, sh) => s + (sh.bilder?.length ?? 0), 0),
      ),
    )
    .toBeGreaterThan(bilderVorher);
});
