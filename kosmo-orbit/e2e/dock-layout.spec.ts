import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * v0.7.8 Welle 1 / Paket P3 («Intelligente Werkzeugtabs», Herzstück) —
 * Beweis für den neuen Dock (`shell/dock/DockFlaeche.tsx` + Solver
 * `state/dock-kern.ts`): kollisionsfrei statt handgetunter absolute-Offsets.
 *
 * Bootstrap wie `bauablauf.spec.ts`/`kv-schaetzung.spec.ts`: `load-tkb`
 * direkt nach `page.goto('/')` (landet bereits in KosmoDesign). Die
 * bestehenden Öffnen-Knöpfe (`raster-toggle`, `kv-oeffnen`, …) bleiben
 * unverändert die einzige Art, ein Panel sichtbar zu machen — dieser Spec
 * klickt NUR sie, nie einen neuen Mechanismus.
 *
 * Alle BoundingBox-Messungen warten auf `stabileBox()`/`wartenAufRuhe()`
 * statt eines festen `waitForTimeout` — die Reflow-Motion (.28s,
 * `dock-flaeche.css`) braucht unter Last (SwiftShader-Software-Rendering +
 * die laufende 3D-Szene) empirisch nachgewiesen WESENTLICH länger als
 * 280ms, bis `getBoundingClientRect()` einen stabilen Endwert liefert.
 */

// v0.7.8 Welle 2 (P4): `kennzahlen` ist KEIN fixes Chrome-Element mehr — es
// ist selbst ein Dock-Panel der rechten Spalte (`dock-stationen.ts`). Für die
// Disjunktions-Prüfung zählt jetzt sein PANEL-Rechteck (`dock-panel-
// kennzahlen`, immer offen — steht darum in jedem `selektorMap`-Aufruf unten
// in der Panel-Liste). Der INHALT (`data-testid="kennzahlen"`) taugt seit P4
// nicht mehr als Mess-Ziel: er liegt in einem Scroll-Container
// (`.k-dock-panel-inhalt`) und sein BoundingRect ist die UNGECLIPPTE
// Layout-Höhe (real gemessen: ~850px Inhalt in einem ~550px-Panel), die
// visuell gar nicht gerendert wird — geometrische Vergleiche damit wären
// Phantom-Überlappungen.
const FIXE_ELEMENTE = ['geschossleiste', 'entwurf-dock', 'statusleiste'] as const;

async function oeffneDesignMitTkb(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
  await page.click('[data-testid="load-tkb"]');
  // v0.7.8 Welle 2 (P4): vorher `locator('text=KENNZAHLEN')` — seit
  // `kennzahlen` selbst ein Dock-Panel ist, trägt auch dessen Dock-Kopf
  // («Doppel-Chrome», `DockPanel.tsx`) den Titel «Kennzahlen» als Text,
  // zusätzlich zur schon vorher vorhandenen Badge im Panel-Inhalt — ein
  // reiner Text-Locator träfe jetzt beide (Playwright-Strict-Bruch). Der
  // testid-Locator auf den Panel-INHALT selbst bleibt eindeutig.
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BenannteBox {
  name: string;
  box: Box;
}

function gleich(a: Box | null, b: Box | null): boolean {
  return (
    !!a &&
    !!b &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5 &&
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5
  );
}

/** Pollt `locator.boundingBox()`, bis der Wert für mindestens `ruheMs` am
 *  Stück unverändert bleibt (s. ausführliche Begründung in
 *  `dock-interaktion.spec.ts`s gleichnamiger Funktion — derselbe Anlaufpuffer-
 *  Trick, weil ein reiner 2-Messungen-Vergleich ohne Anlaufpuffer nachweislich
 *  die alte, noch nicht transitionierte Grösse als "stabil" akzeptierte). */
async function stabileBox(
  locator: Locator,
  timeoutMs = 4000,
  intervalMs = 100,
  anlaufMs = 700,
  ruheMs = 300,
): Promise<Box> {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, anlaufMs));
  let letzte = await locator.boundingBox();
  let stabilSeitMs = 0;
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const jetzt = await locator.boundingBox();
    if (gleich(letzte, jetzt)) {
      stabilSeitMs += intervalMs;
      if (stabilSeitMs >= ruheMs) return jetzt!;
    } else {
      stabilSeitMs = 0;
    }
    letzte = jetzt;
  }
  return letzte!;
}

function ueberlappenSich(a: Box, b: Box, toleranz = 1): boolean {
  return (
    a.x < b.x + b.width - toleranz &&
    a.x + a.width - toleranz > b.x &&
    a.y < b.y + b.height - toleranz &&
    a.y + a.height - toleranz > b.y
  );
}

/** BEKANNTE, VORBESTEHENDE Kollisionen ausserhalb dieses Pakets —
 *  reproduzierbar auch auf dem unveränderten `main`, PER Probe-Skript
 *  nachgemessen, unabhängig vom Dock:
 *   1. Bei genug Geschossen (die TKB-Demo hat 7, `demo-tkb.ts`) wächst die
 *      Geschossleiste (`top:0`, Karteikarten-Liste) so weit nach unten, dass
 *      sie den vertikal MITTIG verankerten EntwurfsDock (`orbit065-dock`,
 *      `top:50%`) überlappt (1400×900: Geschossleiste y 139-476,
 *      EntwurfsDock y 386-653).
 *  (Der frühere zweite Eintrag — `kennzahlen`×`statusleiste`, der alte
 *  absolute Overlay mit `maxHeight:calc(100% - 56px)` — ist seit P4
 *  GEGENSTANDSLOS: Kennzahlen ist jetzt ein Dock-Panel, dessen Rechteck der
 *  Solver oberhalb der Statusleiste hält; gemessen wird das Panel-Rechteck,
 *  s. `FIXE_ELEMENTE`-Kommentar.)
 *  Das verbleibende Paar besteht aus Elementen, die «NICHT ins Dock wandern»
 *  (Auftrag, Abschnitt 3) — ihre gegenseitige Kollision zu beheben ist NICHT
 *  Teil dieses Pakets. JEDES andere Paar (jedes migrierte Panel gegen jedes
 *  Chrome-Element, Panels untereinander) wird weiterhin hart geprüft. */
const BEKANNTE_VORBESTEHENDE_KOLLISIONEN: readonly [string, string][] = [
  ['geschossleiste', 'entwurf-dock'],
];

/** Sammelt die STABILE BoundingBox jedes sichtbaren Selektors aus
 *  `namenUndSelektoren` (übersprungen, falls nicht im DOM/nicht sichtbar)
 *  und prüft PAARWEISE Disjunktion (Toleranz 1px, Auftrag). Wirft mit einer
 *  sprechenden Meldung, welches Paar sich überlappt. */
async function pruefeDisjunktion(page: Page, namenUndSelektoren: Record<string, string>): Promise<void> {
  const boxen: BenannteBox[] = [];
  for (const [name, selektor] of Object.entries(namenUndSelektoren)) {
    const loc = page.locator(selektor);
    if ((await loc.count()) === 0) continue;
    if (!(await loc.first().isVisible())) continue;
    const box = await stabileBox(loc.first());
    boxen.push({ name, box });
  }
  for (let i = 0; i < boxen.length; i++) {
    for (let j = i + 1; j < boxen.length; j++) {
      const paar = new Set([boxen[i]!.name, boxen[j]!.name]);
      const istBekannt = BEKANNTE_VORBESTEHENDE_KOLLISIONEN.some(([a, b]) => paar.has(a) && paar.has(b));
      if (istBekannt) continue;
      const ueberlappt = ueberlappenSich(boxen[i]!.box, boxen[j]!.box);
      expect(ueberlappt, `"${boxen[i]!.name}" überlappt "${boxen[j]!.name}"`).toBe(false);
    }
  }
}

/** Baut die Standard-Selektor-Map: feste Chrome-Elemente + alle aktuell
 *  offenen Dock-Panels (exakter `data-testid`, NICHT das Präfix — sonst
 *  träfe es auch die Kopf-Knöpfe `dock-panel-<id>-pin`/`-einklappen`/`-tab`,
 *  die als Kinder DENSELBEN Präfix tragen). */
function selektorMap(offenePanelIds: readonly string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const id of FIXE_ELEMENTE) map[id] = `[data-testid="${id}"]`;
  for (const id of offenePanelIds) map[id] = `[data-testid="dock-panel-${id}"]`;
  return map;
}

test('zwei Panels gleichzeitig offen: keine Überlappung mit Chrome + Viewport bleibt ≥380px', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="view-split"]');

  await page.click('[data-testid="raster-toggle"]');
  await expect(page.locator('[data-testid="dock-panel-rasterOffen"]')).toBeVisible();
  await page.click('[data-testid="kv-oeffnen"]');
  await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toBeVisible();

  // `kennzahlen` ist seit P4 immer als Dock-Panel offen — in jeder Prüfung dabei.
  await pruefeDisjunktion(page, selektorMap(['rasterOffen', 'kvOffen', 'kennzahlen']));

  const viewportBox = await page.locator('[data-testid="viewport3d"]').boundingBox();
  expect(viewportBox!.width).toBeGreaterThanOrEqual(380);
});

test('drei Panels gleichzeitig offen (links + rechts gemischt): keine Überlappung', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="view-split"]');

  await page.click('[data-testid="raster-toggle"]');
  await page.click('[data-testid="kv-oeffnen"]');
  await page.click('[data-testid="draw-toggle"]'); // rechte Spalte
  await expect(page.locator('[data-testid="dock-panel-rasterOffen"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-drawOffen"]')).toBeVisible();

  await pruefeDisjunktion(page, selektorMap(['rasterOffen', 'kvOffen', 'drawOffen', 'kennzahlen']));

  const planBox = await page.locator('[data-testid="planview"]').boundingBox();
  expect(planBox!.width).toBeGreaterThanOrEqual(380);
});

test('vier Panels gleichzeitig offen: keine Überlappung, bestehende Toggles bleiben unverändert klickbar', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="view-split"]');

  await page.click('[data-testid="raster-toggle"]');
  await page.click('[data-testid="kv-oeffnen"]');
  await page.click('[data-testid="bauablauf-oeffnen"]');
  await page.click('[data-testid="draw-toggle"]');

  // Bestandsschutz: die Panel-INHALTE sind exakt wie vorher erreichbar —
  // dieselben testids/aria-Labels, nur ohne eigenen absolute-Wrapper.
  await expect(page.locator('[data-testid="raster-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="raster-panel"] [aria-label="Schliessen"]')).toBeVisible();
  await expect(page.locator('[data-testid="bauablauf-panel"]')).toBeVisible();

  await pruefeDisjunktion(page, selektorMap(['rasterOffen', 'kvOffen', 'bauablaufOffen', 'drawOffen', 'kennzahlen']));

  const viewportBox = await page.locator('[data-testid="viewport3d"]').boundingBox();
  expect(viewportBox!.width).toBeGreaterThanOrEqual(380);
});

test('schmales Fenster (1000×800): unwichtigstes offenes Panel klappt zum Tab, nichts überlappt', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="view-split"]');

  // Fünf linke Panels — Summe der Mindesthöhen sprengt das schmale Fenster
  // sicher (`dock-stationen.ts`: raster 160 + cwSetzen 170 + splat 160 +
  // maengel 180 + submission 170 = 840px Minimum + Gaps). `raster`
  // (wichtigkeit 38) ist unter diesen fünf das mit Abstand unwichtigste —
  // es muss zuerst einklappen (`dock-kern.ts`s `stack()`-Solver wählt
  // deterministisch das kleinste `wichtigkeit`).
  await page.click('[data-testid="raster-toggle"]');
  await page.click('[data-testid="cw-setzen-oeffnen"]');
  await page.click('[data-testid="splat-werkzeug-toggle"]');
  await page.click('[data-testid="maengel-oeffnen"]');
  await page.click('[data-testid="faehigkeit-submission"]');

  await expect(page.locator('[data-testid="dock-panel-rasterOffen-tab"]')).toBeVisible();

  const offenePanelIds = ['rasterOffen', 'cwSetzenOffen', 'splatPanelOffen', 'maengelOffen', 'submissionOffen', 'kennzahlen'];
  await pruefeDisjunktion(page, selektorMap(offenePanelIds));

  const viewportBox = await page.locator('[data-testid="viewport3d"]').boundingBox();
  expect(viewportBox!.width).toBeGreaterThanOrEqual(380);
});

test('Reset-Knopf räumt Overrides der Design-Station', async ({ page }) => {
  await oeffneDesignMitTkb(page);

  await page.click('[data-testid="kv-oeffnen"]');
  const panel = page.locator('[data-testid="dock-panel-kvOffen"]');
  await expect(panel).toBeVisible();
  const vorher = await stabileBox(panel);

  // Linke Spaltenbreite manuell verändern (col-left-Splitter, Maus-Drag) —
  // ändert `leftW` in `kosmo.dock.v1`.
  const splitter = page.locator('[data-testid="dock-splitter-spL"]');
  const sBox = (await splitter.boundingBox())!;
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2 + 80, sBox.y + sBox.height / 2, { steps: 5 });
  await page.mouse.up();

  const nachDrag = await stabileBox(panel);
  expect(Math.abs(nachDrag.width - vorher.width)).toBeGreaterThan(20);

  const gespeichert = await page.evaluate(() => localStorage.getItem('kosmo.dock.v1'));
  expect(gespeichert).toContain('leftW');

  await page.click('[data-testid="dock-zuruecksetzen"]');
  const gespeichertNachReset = await page.evaluate(() => {
    const roh = localStorage.getItem('kosmo.dock.v1');
    if (!roh) return null;
    return JSON.parse(roh) as { layouts?: Record<string, unknown> };
  });
  // Der aktive Layout-Schlüssel (`A:design`) ist nach dem Reset weg — die
  // Spaltenbreite fällt zurück auf `DOCK_KONSTANTEN.DEF_LEFT`.
  expect(gespeichertNachReset?.layouts?.['A:design']).toBeUndefined();

  // `expect.poll` statt `stabileBox()`: hier kennen wir den ERWARTETEN
  // Zielwert (`vorher.width`, der Default `DOCK_KONSTANTEN.DEF_LEFT`) schon
  // — direkt darauf pollen ist robuster als "auf irgendeinen stabilen Wert
  // warten", falls die Reflow-Motion unter Last (lange Suiten, viele
  // vorangegangene Tests im selben Worker) länger braucht als der
  // Stabilitäts-Puffer von `stabileBox()`.
  await expect
    .poll(async () => (await panel.boundingBox())?.width, { timeout: 5000 })
    .toBeLessThanOrEqual(vorher.width + 1);
});

// ---------------------------------------------------------------------------
// v0.7.8 Welle 2 / Paket P4 («Rechts-Stack-Migration») — `kennzahlen`
// (IMMER sichtbar) und `inspector` (Daten-Guard: Selektion) sind jetzt Dock-
// Panels derselben rechten Spalte wie `unternehmerplan`/`draw`. Diese zwei
// Tests decken genau das ab, was Welle 1 strukturell noch nicht prüfen
// konnte: einen VOLLEN rechten Stack (bis zu vier Panels) und die neue
// Wichtigkeits-Rangfolge zwischen den P4-Neuzugängen und den Welle-1-Panels.
// ---------------------------------------------------------------------------

test('rechter Stack voll (Kennzahlen + Inspector + Draw gleichzeitig): keine Überlappung', async ({ page }) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="view-split"]');

  // Inspector erscheint nur bei Selektion (Daten-Guard) — Wand zeichnen + auswählen.
  const wallId = await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const r = k.run('design.wandZeichnen', { storeyId: st.activeStoreyId, a: { x: 0, y: 0 }, b: { x: 8000, y: 0 }, assemblyId: aw.id });
    return r.patches[0]!.id;
  });
  await page.evaluate((id) => window.__kosmo.state().select([id]), wallId);
  await expect(page.locator('[data-testid="dock-panel-inspector"]')).toBeVisible();

  await page.click('[data-testid="draw-toggle"]');
  await expect(page.locator('[data-testid="dock-panel-drawOffen"]')).toBeVisible();
  // Kennzahlen ist ohne eigenen Klick bereits da (kein Toggle, Daten-Guard "immer").
  await expect(page.locator('[data-testid="dock-panel-kennzahlen"]')).toBeVisible();

  await pruefeDisjunktion(page, selektorMap(['drawOffen', 'inspector', 'kennzahlen']));

  const planBox = await page.locator('[data-testid="planview"]').boundingBox();
  expect(planBox!.width).toBeGreaterThanOrEqual(380);
});

test('enges Fenster (1400×520): Draw (48) klappt zugunsten Kennzahlen (60) zuerst ein', async ({ page }) => {
  // Gleiches Höhenrahmen-Muster wie `dock-interaktion.spec.ts`s Pin-Test —
  // erzwingt eine vertikale Kollision im rechten Stack mit nur EINEM Klick
  // (kennzahlen ist ohnehin immer offen, min 200 + draw min 170 + Gap
  // sprengt die knappe Höhe sicher). Höhe 520 statt 420, damit nach dem
  // Einklappen von Draw (Tab, 34px) die verbleibende Höhe noch für
  // Kennzahlens min (200) reicht — bei 420 klappte auch Kennzahlen ein
  // (Feld ≈ 223: 223−10−34 = 179 < 200), was hier nicht der Prüfpunkt ist
  // (die Rangfolge ist es).
  await page.setViewportSize({ width: 1400, height: 520 });
  await oeffneDesignMitTkb(page);

  await page.click('[data-testid="draw-toggle"]');

  // Kennzahlen (wichtigkeit 60) ist wichtiger als Draw (48) — der Solver
  // wählt bei Platzmangel deterministisch das unwichtigste Flex-Panel
  // (`stack()`, `dock-kern.ts`) — das ist hier Draw, nicht Kennzahlen.
  await expect(page.locator('[data-testid="dock-panel-drawOffen-tab"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-kennzahlen-tab"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();

  await pruefeDisjunktion(page, selektorMap(['drawOffen', 'kennzahlen']));
});

// ---------------------------------------------------------------------------
// v0.7.8 Welle 2 / Paket P5 («HUDs als echte Dock-Floats») — die vier
// Viewport-HUDs (Modus-Leiste/-Karte/-Werkzeug-Rail/-Orientierungskreuz,
// `dock-stationen.ts` `dock:'float'`) sind jetzt `DockPanel`-Floats
// derselben Design-Station wie die Spalten-Panels — ein EINZIGER
// `solve()`-Lauf platziert beides, Disjunktion ist darum strukturell
// gratis, wird hier aber wie jede andere Panel-Kombination hart geprüft.
// Default-`viewMode` ist `'split'` (`ui-zustand.ts`) — die HUDs sind ohne
// weiteren Klick schon da.
// ---------------------------------------------------------------------------

const HUD_FLOAT_IDS = ['viewportModusLeiste', 'viewportModusKarte', 'viewportWerkzeugRail', 'viewportOrientierung'] as const;

test('3D-/Split-Ansicht: alle vier Viewport-HUD-Floats + zwei offene Dock-Panels — keine Überlappung untereinander/gegen die Spalten', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);
  for (const id of HUD_FLOAT_IDS) {
    await expect(page.locator(`[data-testid="dock-panel-${id}"]`)).toBeVisible();
  }

  await page.click('[data-testid="raster-toggle"]');
  await page.click('[data-testid="kv-oeffnen"]');
  await expect(page.locator('[data-testid="dock-panel-rasterOffen"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toBeVisible();

  await pruefeDisjunktion(page, selektorMap([...HUD_FLOAT_IDS, 'rasterOffen', 'kvOffen', 'kennzahlen']));
});

test('schmaler Viewport (1400×900, volle linke + rechte Spalte): HUD-Floats bleiben im zentralen Feld geklemmt, keine Überlappung mit den Spalten', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="raster-toggle"]');
  await page.click('[data-testid="cw-setzen-oeffnen"]');
  await page.click('[data-testid="kv-oeffnen"]');
  await page.click('[data-testid="draw-toggle"]');
  await expect(page.locator('[data-testid="dock-panel-rasterOffen"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-drawOffen"]')).toBeVisible();

  await pruefeDisjunktion(
    page,
    selektorMap([...HUD_FLOAT_IDS, 'rasterOffen', 'cwSetzenOffen', 'kvOffen', 'drawOffen', 'kennzahlen']),
  );

  // `placeFloats()` (dock-kern.ts) klemmt jeden Float strukturell auf das
  // zentrale `vp`-Rechteck (zwischen den Spalten) — hier zusätzlich explizit
  // gegen das gemessene Feld geprüft (kein Float ragt über die Fläche hinaus).
  const feldBox = (await page.locator('[data-testid="dock-flaeche"]').boundingBox())!;
  for (const id of HUD_FLOAT_IDS) {
    const box = await stabileBox(page.locator(`[data-testid="dock-panel-${id}"]`));
    expect(box.x).toBeGreaterThanOrEqual(feldBox.x - 1);
    expect(box.y).toBeGreaterThanOrEqual(feldBox.y - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(feldBox.x + feldBox.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(feldBox.y + feldBox.height + 1);
  }
});
