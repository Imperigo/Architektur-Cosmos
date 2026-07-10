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
 * Abschlussbericht nummeriert; wo ein Zug über den Chat-Weg NICHT (oder nicht
 * korrekt) lösbar ist, steht hier ein klar kommentierter
 * `window.__kosmo.run`-Fallback (Befund 6 — kein Chat-Command wechselt das
 * aktive Geschoss, `design.dachErstellen` landet über den Chat darum immer
 * auf dem falschen (untersten) Geschoss).
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
  // Schliessen-Knopf im offenen Panel trägt kein data-testid, nur
  // `aria-label="Schliessen"` (KosmoPanel.tsx Z.895). `projektStarten`
  // (Baustein 1) setzt `kosmo.panelOffen=1` — das Panel ist hier also
  // bereits offen; der `kosmoChatSkript`-Baustein selbst geht (wie diese
  // Stelle ursprünglich auch) von `[data-testid="kosmo-symbol"]` als
  // Schliessen-Knopf aus und würde sich an genau diesem Klick aufhängen
  // (Timeout) — siehe Absicherung vor dem Baustein-Aufruf weiter unten.
  if (await page.locator('[data-testid="kosmo-input"]').isVisible()) {
    await page.locator('[aria-label="Schliessen"]').click();
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
  // ZÜGE 2–9 über den echten `kosmoChatSkript`-Baustein (Züge 2–9 des
  // gemeinsamen SzenarioSkripts `MFH_SKRIPT` — Zug-Index 1..8).
  // =======================================================================
  // Fallback für Befund 1 (siehe oben): das Panel VOR dem Baustein-Aufruf
  // schliessen, damit `kosmoChatSkript`s eigener `kosmo-symbol`-Klick auf ein
  // bereits geschlossenes Panel trifft (dort funktioniert er — das Symbol
  // existiert dann) statt sich am nicht-existenten Schliessen-Symbol
  // aufzuhängen.
  await page.locator('[aria-label="Schliessen"]').click();
  await expect(page.locator('[data-testid="kosmo-input"]')).toBeHidden();

  const protokoll = await kosmoChatSkript(
    page,
    'journey-b-mfh-rest',
    { id: 'journey-b-mfh-rest', zuege: MFH_SKRIPT.zuege.slice(1) },
    { nutzerTexte: MFH_NUTZERTEXTE.slice(1) },
  );

  expect(protokoll).toHaveLength(8);
  for (const [i, eintrag] of protokoll.entries()) {
    expect(eintrag.fehler, `Zug ${i + 2} («${MFH_NUTZERTEXTE[i + 1]}») meldet einen Fehler`).toBeUndefined();
  }
  // Erwartete Proposal-Zahlen je Zug (Wände=4 Paket, Rest Einzelvorschläge).
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
  // -----------------------------------------------------------------------
  expect(nachher.slabsEg, 'Befund 2: Decke scheitert über den Chat an der auto-injizierten Wand-assemblyId').toBe(0);

  // Fallback (dokumentiert, KEIN Chat-Weg vorhanden, der die generische
  // assemblyId-Vorbelegung umgeht): die Decken direkt über
  // window.__kosmo.run anlegen — auf JEDEM Geschoss, das bereits existiert
  // (EG + die beiden von Zug 7 gestapelten Geschosse trugen wegen des
  // Befunds nie eine Decke, da Zug 7 zeitlich VOR dieser Korrektur lief).
  const storeyIdsFuerDecke = await page.evaluate(() =>
    window.__kosmo.state().doc.storeysOrdered().map((s) => s.id),
  );
  await page.evaluate(
    ({ storeyIds, outline }) => {
      const k = window.__kosmo;
      for (const storeyId of storeyIds) {
        k.run('design.deckeZeichnen', { storeyId, outline });
      }
    },
    { storeyIds: storeyIdsFuerDecke, outline: GEBAEUDE_OUTLINE },
  );
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('slab').length))
    .toBe(storeyIdsFuerDecke.length);

  // -----------------------------------------------------------------------
  // Befund 6 — Beweis: das Walmdach landet über den Chat auf dem FALSCHEN
  // (untersten, weil nie gewechselten) Geschoss — es gibt keinen Chat-Command,
  // der das aktive Geschoss wechselt (kein design.geschossAktivSetzen o.ä.,
  // siehe e2e/sim/skripte-mfh.ts Kopfkommentar). `applyDefaults()` füllt
  // storeyId darum IMMER mit dem seit Projektstart unveränderten EG.
  // -----------------------------------------------------------------------
  expect(nachher.roofStoreyId, 'Befund 6: Dach landet chat-seitig auf EG statt dem obersten Geschoss').toBe(
    egId,
  );

  // Fallback (dokumentiert, KEIN Chat-Weg vorhanden): falsches Dach löschen,
  // korrektes Dach direkt über window.__kosmo.run auf dem obersten Geschoss
  // anlegen — damit die restliche Journey (Vis/Screenshots) ein plausibles
  // Gebäude zeigt.
  const { wrongRoofId, topStoreyId } = await page.evaluate(() => {
    const doc = window.__kosmo.state().doc;
    const storeys = doc.storeysOrdered();
    const top = storeys[storeys.length - 1]!;
    const roof = doc.byKind<{ id: string }>('roof')[0]!;
    return { wrongRoofId: roof.id, topStoreyId: top.id };
  });
  await page.evaluate(
    ({ wrongRoofId, topStoreyId, outline }) => {
      const k = window.__kosmo;
      k.run('design.loeschen', { entityId: wrongRoofId });
      k.run('design.dachErstellen', { storeyId: topStoreyId, outline, pitch: 35, overhang: 500 });
    },
    { wrongRoofId, topStoreyId, outline: GEBAEUDE_OUTLINE },
  );
  await expect
    .poll(() =>
      page.evaluate(() => window.__kosmo.state().doc.byKind<{ storeyId: string }>('roof')[0]?.storeyId),
    )
    .toBe(topStoreyId);

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

  // Vergleich Bridge-Bild vs. Aufnahme — NICHT über die Kuratier-Fläche
  // (Befund 7: die zeigt nur `render`-Nodes, siehe apps/kosmo-orbit/src/
  // modules/vis/NodeCanvas.tsx `kuratierKarten = graph.nodes.filter(n =>
  // n.typ === 'render')` — ein `aufnahme`-Node erscheint dort NIE), sondern
  // über einen eigenständigen `vergleich`-Node (Muster e2e/vis-aufnahme.spec.ts).
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

  // Kuratieren (Stern) — nur der ausgeführte Render-Node hat ein fertiges
  // Bild, darum genau EINE Kuratier-Karte.
  await page.click('[data-testid="vis-kuratier-toggle"]');
  await expect(page.locator('[data-testid="vis-kuratier-flaeche"]')).toBeVisible();
  const kuratierKarten = page.locator('[data-testid="vis-kuratier-karte"]');
  await expect(kuratierKarten).toHaveCount(1);
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
