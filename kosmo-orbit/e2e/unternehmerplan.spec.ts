import { expect, test, type Page } from '@playwright/test';

/**
 * C4b-Overlay (C-E5, docs/SUBMISSION-KONZEPT.md): der DXF-Rücklauf des
 * Unternehmers als Referenz-Overlay im Grundriss. Robustheits-Doktrin wie
 * `freemesh.spec.ts`/`plan-interaktion.spec.ts`: der gesegnete
 * `__kosmo.run`-Weg fürs Modell (2 Wände), stabile UI-testids für den Rest.
 *
 * Die DXF-Datei kommt NICHT aus einem separaten Kernel-Aufruf im Node-
 * Kontext (parseDxf/planToDxf sind Browser-seitig gebündelt, `window.__kosmo`
 * bietet keinen `planToDxf`-Zugriff — siehe `App.tsx` Z.279ff.), sondern aus
 * dem echten Export-Weg der App selbst: der Architekt exportiert seinen
 * eigenen Grundriss als DXF (`export-dxf`, Playwright-Download), das ist der
 * ehrliche Rundlauf-Fall («Unternehmer liefert unverändert zurück») und
 * beweist nebenbei, dass Export/Import zueinander passen. Die Datei geht
 * anschliessend über den echten Dateiwahl-Dialog (`filechooser`-Event) in
 * `import-dxf` — dasselbe Playwright-Muster wie `import-ifc`/`splat-werkzeug`
 * (seit v0.8.1/P4 Splat-Fusion der fusionierte Knopf, vormals `import-splat`)
 * in `module.spec.ts`/`splat.spec.ts` (das dort vom Auftrag vorgeschlagene
 * `page.setInputFiles` griffe hier ins Leere: der `<input type="file">` wird
 * dynamisch erzeugt und nie ins DOM gehängt, exakt wie bei den beiden
 * Nachbar-Importen).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        doc: {
          byKind: (k: string) => { id: string; name?: string }[];
          // C4b: `get` ergänzt für die Wandachsen-Assertion der dritten
          // Karte-anwenden-Prüfung (Vorbild `plan-interaktion.spec.ts`).
          get: (id: string) => { a: { x: number; y: number }; b: { x: number; y: number } } | undefined;
        };
      };
    };
  }
}

async function bootstrapDesign(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG
  await page.click('[data-testid="view-2d"]'); // volle Breite, ruhigere Plan-Koordinaten
}

/** 2 Wände über den gesegneten `__kosmo.run`-Weg — Geometrie ist Nebensache. */
async function zweiWaendeZeichnen(page: Page) {
  await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
      assemblyId: aw.id,
    });
    k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 5000, y: 0 },
      b: { x: 5000, y: 4000 },
      assemblyId: aw.id,
    });
  });
}

test('Unternehmerplan-Overlay: DXF laden → Toggle erscheint → Overlay sichtbar/aus', async ({ page }) => {
  await bootstrapDesign(page);
  await zweiWaendeZeichnen(page);

  // Ohne geladenen Unternehmerplan gibt es weder Toggle noch Overlay.
  await expect(page.locator('[data-testid="unternehmerplan-toggle"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="unternehmerplan-overlay"]')).toHaveCount(0);

  // Eigenen Grundriss als DXF exportieren (Rundlauf: der «Unternehmer»
  // liefert ihn unverändert zurück) und den Download-Inhalt einlesen.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="export-dxf"]'),
  ]);
  const pfad = await download.path();
  const { readFileSync } = await import('node:fs');
  const dxfInhalt = readFileSync(pfad!);

  // Import über den echten Dateiwahl-Dialog, wie bei import-ifc/splat-werkzeug.
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="import-dxf"]'),
  ]);
  await chooser.setFiles({ name: 'unternehmer.dxf', mimeType: 'application/dxf', buffer: dxfInhalt });

  // Erfolgs-Meldung: der ehrliche Ein-Absatz-Bericht (importBerichtText)
  // enthält immer die Match-Quote, bei Abweichungen zusätzlich «Vorschlag».
  const erfolg = page.locator('[data-testid="meldung-erfolg"]').first();
  await expect(erfolg).toBeVisible({ timeout: 10_000 });
  await expect(erfolg).toContainText(/Vorschlag|Quote/);

  // Toggle erscheint jetzt (dxf geladen) und ist aktiv — der Import schaltet
  // den Overlay beim ersten Laden einmalig ein.
  const toggle = page.locator('[data-testid="unternehmerplan-toggle"]');
  await expect(toggle).toBeVisible();
  await expect(page.locator('[data-testid="unternehmerplan-overlay"]')).toBeVisible();

  // Toggle aus → Overlay weg.
  await toggle.click();
  await expect(page.locator('[data-testid="unternehmerplan-overlay"]')).toHaveCount(0);

  // Toggle wieder an → Overlay wieder da.
  await toggle.click();
  await expect(page.locator('[data-testid="unternehmerplan-overlay"]')).toBeVisible();
});

test('Unternehmerplan-Import: DWG wird ehrlich abgelehnt (C-E7), kein Ladeversuch', async ({ page }) => {
  await bootstrapDesign(page);
  await zweiWaendeZeichnen(page);

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="import-dxf"]'),
  ]);
  await chooser.setFiles({
    name: 'unternehmer.dwg',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('fake dwg content, niemals geparst'),
  });

  const fehler = page.locator('[data-testid="meldung-fehler"]').first();
  await expect(fehler).toBeVisible();
  await expect(fehler).toContainText('DWG ist proprietär');

  // Kein Ladeversuch: weder Toggle noch Overlay erscheinen.
  await expect(page.locator('[data-testid="unternehmerplan-toggle"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="unternehmerplan-overlay"]')).toHaveCount(0);
});

/**
 * C4b-Kern: Stufe-1-Karte anwenden (C-E4). Zwei WEIT auseinander liegende,
 * freistehende Wände mit einem eigenen Ein-Schicht-Aufbau (300 mm, eine
 * einzige `tragend`-Schicht) — bewusst NICHT `zweiWaendeZeichnen` von oben
 * (die berühren sich an einer Ecke und ihre Pochés verschmelzen zu EINER
 * unionierten Region wie im C4a-Test) und bewusst NICHT der Bootstrap-Aufbau
 * «AW Beton 36» (drei Schichten Putz/Dämmung/Beton → der Export splittet die
 * TRAGEND-Region auf die reine Beton-Teildicke, was den String-Edit unnötig
 * verkompliziert). Mit zwei getrennten Wänden und einer einzigen Schicht ist
 * jede TRAGEND-Poché-Region ein simples 4-Vertex-Rechteck — robust genug für
 * einen gezielten String-Edit im rohen DXF-Text.
 *
 * Verschoben wird NUR EIN Ring-Vertexpaar (eine Kante), nicht der ganze
 * Ring: exakt die C4a-Testdoktrin («Ganz-Region vs. Ausrichtungs-Schätzung»,
 * s. Kommentar in `unternehmerplan.test.ts` (c)) — eine Kante bleibt exakt
 * `verschoben` (Länge/Richtung erhalten, Mittelpunkt 50 mm versetzt), die
 * beiden Nachbarkanten ändern durch den einseitigen Versatz ihre Länge und
 * werden separat (Stufe 2, `entfernt`/`neu`) gemeldet — wie im
 * Nachbar-Kernel-Test. So bleibt GENAU eine Stufe-1-Karte übrig, und
 * `.first()` auf den Anwenden-Knopf ist unzweideutig richtig.
 */
test('Unternehmerplan: Stufe-1-Karte anwenden → Wandachse verschoben, Undo exakt zurück', async ({ page }) => {
  await bootstrapDesign(page);

  const { wallAId, wallBId } = await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const auf = k.run('design.aufbauErstellen', {
      name: 'Testwand 300',
      target: 'wall',
      layers: [{ material: 'beton', thickness: 300, function: 'tragend' }],
    });
    const aid = (auf.patches[0] as { id: string }).id;
    const a = k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 0 },
      assemblyId: aid,
    });
    const b = k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 20000 },
      b: { x: 4000, y: 20000 },
      assemblyId: aid,
    });
    return { wallAId: a.patches[0]!.id, wallBId: b.patches[0]!.id };
  });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="export-dxf"]'),
  ]);
  const pfad = await download.path();
  const { readFileSync } = await import('node:fs');
  const dxfText = readFileSync(pfad!, 'utf-8');

  // Wand A (bei y≈0) liegt als LETZTE POLYLINE-Entity vor ENDSEC im Export
  // (Wand B, bei y≈20000, kommt zuerst) — eindeutig über ihre absoluten
  // Koordinaten identifizierbar, niemals verwechselbar mit Wand B.
  const marker = '0\nPOLYLINE';
  const start = dxfText.lastIndexOf(marker);
  const ende = dxfText.indexOf('0\nENDSEC', start);
  expect(start).toBeGreaterThan(0);
  expect(ende).toBeGreaterThan(start);
  const ringBlock = dxfText.slice(start, ende);

  // Innerhalb dieses einen Rings NUR die zwei VERTEX-Einträge mit
  // Gruppencode 20 (Y) = -150 verschieben (die lange Kante bei Welt-y=150 —
  // DXF spiegelt y) — Code 10 (X) davor um +50 erhöhen. Zeilenweise statt
  // Regex-Ersetzung, um Gruppencode/Wert-Paare nicht zu verwechseln.
  const zeilen = ringBlock.split('\n');
  let getroffen = 0;
  for (let i = 0; i < zeilen.length; i++) {
    if (zeilen[i] === '20' && zeilen[i + 1] === '-150' && zeilen[i - 2] === '10') {
      zeilen[i - 1] = String(Number(zeilen[i - 1]) + 50);
      getroffen += 1;
    }
  }
  expect(getroffen).toBe(2); // genau die zwei Vertices der einen Kante
  const verschobenerBlock = zeilen.join('\n');
  const editiertesDxf = dxfText.slice(0, start) + verschobenerBlock + dxfText.slice(ende);

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-testid="import-dxf"]'),
  ]);
  await chooser.setFiles({
    name: 'unternehmer-verschoben.dxf',
    mimeType: 'application/dxf',
    buffer: Buffer.from(editiertesDxf, 'utf-8'),
  });

  const erfolg = page.locator('[data-testid="meldung-erfolg"]').first();
  await expect(erfolg).toBeVisible({ timeout: 10_000 });

  // Panel sichtbar (Daten-Guard: dxf geladen) mit genau einer Stufe-1-Karte.
  const panel = page.locator('[data-testid="unternehmerplan-panel"]');
  await expect(panel).toBeVisible();
  const anwendenKnoepfe = panel.locator('[data-testid^="karte-anwenden-"]');
  await expect(anwendenKnoepfe).toHaveCount(1);

  const vorher = await page.evaluate((id) => window.__kosmo.state().doc.get(id)!, wallAId);
  expect(vorher.a).toEqual({ x: 0, y: 0 });
  expect(vorher.b).toEqual({ x: 4000, y: 0 });

  await anwendenKnoepfe.first().click();

  // Übernehmen läuft über runCommand (design.verschieben, derselbe Weg wie
  // ein Klick/`apply-proposal`) — die Wandachse wandert exakt um die im
  // Befund gemessene Verschiebung (50 mm in x).
  await expect
    .poll(() => page.evaluate((id) => window.__kosmo.state().doc.get(id)!.a, wallAId))
    .toEqual({ x: 50, y: 0 });
  const nachAnwenden = await page.evaluate((id) => window.__kosmo.state().doc.get(id)!, wallAId);
  expect(nachAnwenden.b).toEqual({ x: 4050, y: 0 });
  await expect(page.locator('[data-testid="meldung-erfolg"]').last()).toContainText('übernommen');

  // Wand B (weit entfernt, nicht Teil des Befunds) bleibt unangetastet.
  const wandB = await page.evaluate((id) => window.__kosmo.state().doc.get(id)!, wallBId);
  expect(wandB.a).toEqual({ x: 0, y: 20000 });
  expect(wandB.b).toEqual({ x: 4000, y: 20000 });

  // Undo — derselbe globale Verlauf wie jede andere Modelländerung.
  await page.click('[data-testid="undo"]');
  await expect
    .poll(() => page.evaluate((id) => window.__kosmo.state().doc.get(id)!.a, wallAId))
    .toEqual({ x: 0, y: 0 });
  const nachUndo = await page.evaluate((id) => window.__kosmo.state().doc.get(id)!, wallAId);
  expect(nachUndo.b).toEqual({ x: 4000, y: 0 });
});
