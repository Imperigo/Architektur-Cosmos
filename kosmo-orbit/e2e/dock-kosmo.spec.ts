import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * v0.7.8 Welle 3 / Paket P7 («Kosmo ordnet») — Kosmo steuert das Dock über
 * echte `ui.dock*`-Befehle (`apps/kosmo-orbit/src/state/dock-befehle.ts`),
 * sichtbar über den goldenen Orb + die «KOSMO»-Kopf-Badge
 * (`shell/dock/KosmoOrdnetOrb.tsx`, `DockPanel.tsx`) und quittiert im Chat
 * wie jeder andere `ui.*`-Befehl (`kosmo-ui-aktion-dock`, Muster
 * `kosmo-ui-bruecke.spec.ts`).
 *
 *  (a) Chat-Weg: Mock-Provider-Session löst `ui.dockEinklappen` aus — die
 *      Chat-Zeile erscheint, das Panel klappt sichtbar ein.
 *  (b) Direktweg: `window.__kosmoUiBefehle.ausfuehren` (Test-Hook,
 *      `dock-befehle.ts`) spielt die «Planprüfung»-Sequenz nach — nach jedem
 *      Schritt zeigen Orb + Badge auf das richtige Panel, nichts überlappt,
 *      STOPP beendet beides sofort.
 *  (c) Chat-Weg: `ui.dockSetzen` mit `dock:'float'` im Modus B → eine
 *      ehrliche Fehlermeldung im Chat, keine `kosmo-ui-aktion-dock`-Zeile.
 */

declare global {
  interface Window {
    __kosmoUiBefehle: { ausfuehren: (id: string, params: unknown) => unknown };
    __kosmo: {
      run: (commandId: string, params: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        doc: { byKind: (k: string) => { id: string; target?: string }[] };
        select: (ids: string[]) => void;
      };
    };
  }
}

async function bootstrapMock(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG + AW-Aufbau (project-store.ts)
  await expect(page.locator('[data-testid="dock-panel-kennzahlen"]')).toBeVisible();
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function ueberlappenSich(a: Box, b: Box, toleranz = 1): boolean {
  return (
    a.x < b.x + b.width - toleranz &&
    a.x + a.width - toleranz > b.x &&
    a.y < b.y + b.height - toleranz &&
    a.y + a.height - toleranz > b.y
  );
}

async function box(locator: Locator): Promise<Box> {
  const b = await locator.boundingBox();
  if (!b) throw new Error('boundingBox() lieferte null — Element nicht sichtbar/gerendert?');
  return b;
}

/** Pollt `locator.boundingBox()`, bis DREI aufeinanderfolgende Messungen
 *  übereinstimmen — dieser Test hebt `reducedMotion` bewusst wieder auf
 *  (Gate für den Orb, s. u.), darum läuft die `.28s`-Reflow-Transition
 *  (`dock-flaeche.css`) hier ECHT (anders als in den meisten Specs, wo
 *  `aura.css`s globaler `prefers-reduced-motion`-Riegel sie auf 0.01ms
 *  kappt) — zwei Messungen im Abstand von nur 80ms können mitten in der
 *  Federkurve zufällig einmal übereinstimmen; drei in Folge über einen
 *  längeren Abstand (Muster `dock-layout.spec.ts`s gleichnamige Funktion,
 *  hier mit `anlaufMs`-Mindestwartezeit vor der ersten Messung). */
async function stabileBox(locator: Locator, timeoutMs = 3000, intervalMs = 150, anlaufMs = 350): Promise<Box> {
  await new Promise((r) => setTimeout(r, anlaufMs));
  const start = Date.now();
  let treffer = 0;
  let letzte: Box | null = null;
  for (;;) {
    const aktuelle = await box(locator);
    if (
      letzte &&
      Math.abs(letzte.x - aktuelle.x) < 0.5 &&
      Math.abs(letzte.y - aktuelle.y) < 0.5 &&
      Math.abs(letzte.width - aktuelle.width) < 0.5 &&
      Math.abs(letzte.height - aktuelle.height) < 0.5
    ) {
      treffer += 1;
      if (treffer >= 3) return aktuelle;
    } else {
      treffer = 0;
    }
    letzte = aktuelle;
    if (Date.now() - start > timeoutMs) return aktuelle;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

test.describe('(a) Chat-Weg — ui.dockEinklappen über den Mock-Provider', () => {
  test('Chat-Zeile kosmo-ui-aktion-dock erscheint, das Kennzahlen-Panel klappt sichtbar ein', async ({ page }) => {
    await bootstrapMock(page);
    await expect(page.locator('[data-testid="dock-panel-kennzahlen-tab"]')).toHaveCount(0);

    await page.fill('[data-testid="kosmo-input"]', 'Klapp das Kennzahlen-Panel im Dock ein');
    await page.click('[data-testid="kosmo-send"]');

    const zeile = page.locator('[data-testid="kosmo-ui-aktion-dock"]');
    await expect(zeile).toBeVisible({ timeout: 15_000 });
    await expect(zeile).toContainText('Kennzahlen');
    await expect(zeile).toContainText('eingeklappt');

    // Sichtbar eingeklappt: der volle Kopf ist weg, der schmale Tab da.
    await expect(page.locator('[data-testid="dock-panel-kennzahlen-tab"]')).toBeVisible();
  });
});

test.describe('(c) Chat-Weg — ui.dockSetzen float im Modus B → ehrliche Fehlermeldung', () => {
  test('keine kosmo-ui-aktion-dock-Zeile, aber eine ehrliche Fehlerantwort im Chat', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.starterGuide.done', '1');
      localStorage.setItem('kosmo.panelOffen', '1');
      localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
      // Modus B VOR dem Mount setzen (Muster `dock-layout.spec.ts`s
      // `oeffneDesignInModus` — `useDockZustand`s Store liest `kosmo.dock.v1`
      // einmal beim Modul-Import, ein späteres `setItem` allein reicht nicht).
      localStorage.setItem('kosmo.dock.v1', JSON.stringify({ version: 1, modus: 'B', layouts: {} }));
    });
    await page.reload();
    await page.click('[data-testid="module-design"]');
    await expect(page.locator('[data-testid="dock-panel-kennzahlen"]')).toBeVisible();

    await page.fill('[data-testid="kosmo-input"]', 'Docke das Kennzahlen-Panel schwebend');
    await page.click('[data-testid="kosmo-send"]');

    // Ehrliche Fehlermeldung (MockProvider surfaced FEHLER: … statt einer
    // generischen Bestätigung, s. `packages/kosmo-ai/src/provider.ts`).
    await expect(page.getByText(/Das ging nicht/, { exact: false })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Modus A/, { exact: false })).toBeVisible();
    // KEINE Aktionszeile — der Befehl ist nie erfolgreich gelaufen.
    await expect(page.locator('[data-testid="kosmo-ui-aktion-dock"]')).toHaveCount(0);
    // Das Panel blieb tatsächlich unverändert angedockt (kein stiller Teilerfolg).
    await expect(page.locator('[data-testid="dock-panel-kennzahlen"][data-schwebend="false"]')).toBeVisible();
  });
});

test.describe('(b) Direktweg — fuehreUiBefehlAus spielt die «Planprüfung»-Sequenz nach', () => {
  test('Orb + Badge wandern mit jedem Schritt zum richtigen Panel, nichts überlappt, STOPP beendet beides sofort', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.starterGuide.done', '1');
    });
    await page.reload();
    await page.click('[data-testid="module-design"]');
    await expect(page.locator('[data-testid="dock-panel-kennzahlen"]')).toBeVisible();

    // Gate für die sichtbare Kosmo-Steuerung aufheben: dieselbe Machart wie
    // `kosmo-zeichnet.spec.ts` (b) — `kosmo.abspielen='erzwingen'` hebt NUR
    // die webdriver-Sperre auf (`abspiel-ebene.ts`, von `dock-orb-runtime.ts`
    // wiederverwendet), reduced-motion muss dafür EXPLIZIT weggenommen werden
    // (Suite-weiter `reducedMotion:'reduce'`-Default, `playwright.config.ts`).
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => localStorage.setItem('kosmo.abspielen', 'erzwingen'));

    // Schritt 1: Kennzahlen-Panel gross + anheften («checks gross+anheften»).
    await page.evaluate(() => {
      window.__kosmoUiBefehle.ausfuehren('ui.dockGroesseSetzen', { panelId: 'kennzahlen', groesse: 500 });
      window.__kosmoUiBefehle.ausfuehren('ui.dockAnheften', { panelId: 'kennzahlen', angeheftet: true });
    });
    await expect(page.locator('[data-testid="dock-kosmo-orb"]')).toBeVisible();
    await expect(page.locator('[data-testid="dock-panel-kennzahlen-kosmo-badge"]')).toBeVisible();
    let orbBox = await stabileBox(page.locator('[data-testid="dock-kosmo-orb"]'));
    let kennzahlenBox = await stabileBox(page.locator('[data-testid="dock-panel-kennzahlen"]'));
    // Orb-Position = Panel-Rechteck + 17px (Kopfleiste, `KosmoOrdnetOrb.tsx`)
    // — liegt darum INNERHALB des Panel-Rechtecks, kein Widerspruch zur
    // «nichts überlappt»-Prüfung unten (die gilt zwischen PANELS, nicht
    // zwischen Panel und seinem eigenen Orb).
    expect(ueberlappenSich(orbBox, kennzahlenBox)).toBe(true);

    // Schritt 2: Inspector einklappen — braucht zuerst eine Auswahl, sonst
    // gibt es das Panel (Daten-Guard, `dock-stationen.ts`) noch gar nicht.
    await page.evaluate(() => {
      const s = window.__kosmo.state();
      const assembly = s.doc.byKind('assembly').find((a) => a.target === 'wall')!;
      const res = window.__kosmo.run('design.wandZeichnen', {
        storeyId: s.activeStoreyId,
        assemblyId: assembly.id,
        a: { x: 0, y: 0 },
        b: { x: 4000, y: 0 },
      });
      window.__kosmo.state().select([res.patches[0]!.id]);
    });
    await expect(page.locator('[data-testid="dock-panel-inspector"]')).toBeVisible();
    await page.evaluate(() => {
      window.__kosmoUiBefehle.ausfuehren('ui.dockEinklappen', { panelId: 'inspector', eingeklappt: true });
    });
    await expect(page.locator('[data-testid="dock-panel-inspector-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="dock-panel-inspector-kosmo-badge"]')).toBeVisible();
    // Das VORHERIGE Ziel (Kennzahlen) trägt die Badge jetzt NICHT mehr — genau
    // EIN Panel zeigt sie zu jedem Zeitpunkt (`badgePanelId`, `dock-orb-runtime.ts`).
    await expect(page.locator('[data-testid="dock-panel-kennzahlen-kosmo-badge"]')).toHaveCount(0);

    // Nichts überlappt: die aktuell sichtbaren Dock-Panels bleiben disjunkt.
    kennzahlenBox = await stabileBox(page.locator('[data-testid="dock-panel-kennzahlen"]'));
    const inspectorTabBox = await stabileBox(page.locator('[data-testid="dock-panel-inspector"]'));
    expect(ueberlappenSich(kennzahlenBox, inspectorTabBox)).toBe(false);

    // Schritt 3: ein LINKS gedocktes Panel deutlich vergrössern («leftW
    // breiter» aus dem Auftrag — TEIL A kennt keinen eigenen Spaltenbreiten-
    // Befehl (nur `ui.dockGroesseSetzen`s Panel-`groesse`), darum hier als
    // ehrlicher Ersatz: das Raster-Panel öffnen (bestehendes `ui.panelSetzen`
    // — Sichtbarkeit bleibt exklusiv `ui-zustand.ts`, s. `dock-zustand.ts`s
    // Kopfkommentar) und in der linken Spalte vergrössern, s. Abschlussbericht.
    await page.evaluate(() => {
      window.__kosmoUiBefehle.ausfuehren('ui.panelSetzen', { panel: 'rasterOffen', offen: true });
      window.__kosmoUiBefehle.ausfuehren('ui.dockGroesseSetzen', { panelId: 'rasterOffen', groesse: 400 });
    });
    await expect(page.locator('[data-testid="dock-panel-rasterOffen-kosmo-badge"]')).toBeVisible();
    orbBox = await stabileBox(page.locator('[data-testid="dock-kosmo-orb"]'));
    const rasterBox = await stabileBox(page.locator('[data-testid="dock-panel-rasterOffen"]'));
    expect(ueberlappenSich(orbBox, rasterBox)).toBe(true);

    // Schritt 4: zurücksetzen — die Overrides sind wirklich weg.
    await page.evaluate(() => {
      window.__kosmoUiBefehle.ausfuehren('ui.dockZuruecksetzen', {});
    });
    const snapshot = await page.evaluate(() => window.__kosmoUiBefehle.ausfuehren('ui.dockLayoutLesen', {})) as {
      panels: Record<string, unknown>;
    };
    expect(snapshot.panels['kennzahlen']).toBeUndefined();
    expect(snapshot.panels['rasterOffen']).toBeUndefined();

    // STOPP: Orb + Badge verschwinden sofort.
    await page.click('[data-testid="dock-kosmo-stopp"]');
    await expect(page.locator('[data-testid="dock-kosmo-orb"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="dock-panel-rasterOffen-kosmo-badge"]')).toHaveCount(0);
  });
});
