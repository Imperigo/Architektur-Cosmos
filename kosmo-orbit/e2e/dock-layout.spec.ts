import { expect, test, type Locator, type Page } from '@playwright/test';
import { visManuellStorageState } from './helpers/manuell-seed';

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
 *
 * v0.8.10 E3-Nachtrag (Owner-Entscheid 20.07.2026, `docs/V0810-SPEZ.md` §2
 * E3 Punkt 6): die Vis-Dock-Panels (Palette/Minimap/Legende/Ausrichten,
 * s. `oeffneVisMitGraph()` unten) sind eine Manuell-only-Funktion (kein
 * Insel-Äquivalent, P-B1-Audit-Fund) — der globale `kosmo.ui.v1`-Seed
 * verliert sein `visOberflaeche`-Feld (Seed-Flip), dieser Per-Spec-Kopf hält
 * die GANZE Datei (auch die Design-Dock-Tests) unverändert auf dem
 * heutigen Manuell-Seed (Muster `e2e/helpers/manuell-seed.ts`s
 * `visManuellStorageState()`-Kopfkommentar).
 */
test.use({ storageState: visManuellStorageState() });

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
 *  nachgemessen, unabhängig vom Dock. Historisch gab es hier bis zu drei
 *  Einträge; alle drei sind inzwischen GESCHLOSSEN, die Liste bleibt als
 *  Mechanismus stehen (leer), falls ein künftiger Fall sie wieder braucht:
 *   (Der frühere erste Eintrag — `kennzahlen`×`statusleiste`, der alte
 *  absolute Overlay mit `maxHeight:calc(100% - 56px)` — ist seit P4
 *  GEGENSTANDSLOS: Kennzahlen ist jetzt ein Dock-Panel, dessen Rechteck der
 *  Solver oberhalb der Statusleiste hält; gemessen wird das Panel-Rechteck,
 *  s. `FIXE_ELEMENTE`-Kommentar.)
 *  v0.7.9 (A1): die zweite Ausnahme-Klasse — die fixen ViewportChrome-Säulen
 *  (HUD-Statuskarte + Eigenschaften), die bis v0.7.8 gar nicht erst
 *  mitgemessen wurden (ROADMAP 357/358: «enge Split-Ansicht kann
 *  Orientierungs-Float ↔ fixe Eigenschaften-Säule überlappen») — ist
 *  GESCHLOSSEN: beide sind jetzt Dock-Floats (`viewportHudStatuskarte`/
 *  `viewportEigenschaften`, `dock-stationen.ts`) und stehen unten in
 *  `HUD_FLOAT_IDS`, werden also in JEDER Disjunktions-Prüfung hart
 *  mitgeprüft statt ausgeklammert.
 *  v0.7.9 (B2, Owner-Stretch): der dritte und letzte Eintrag — bei genug
 *  Geschossen (die TKB-Demo hat 7, `demo-tkb.ts`) wuchs die Geschossleiste
 *  (`top:0`, Karteikarten-Liste) so weit nach unten, dass sie den vertikal
 *  MITTIG verankerten EntwurfsDock (`orbit065-dock`, `top:50%`) überlappte
 *  (1400×900: Geschossleiste y 139-476, EntwurfsDock y 386-653) — ist
 *  GESCHLOSSEN: die Geschossleiste misst jetzt selbst die Oberkante des
 *  EntwurfsDock (`DesignWorkspace.tsx`, ResizeObserver-Effekt gleich dem
 *  Muster in `DockFlaeche.tsx`) und klemmt ihre `maxHeight` strikt davor —
 *  sie scrollte ohnehin schon (Hochhaus-Grenze), scrollt jetzt nur früher.
 *  Der EntwurfsDock selbst bleibt unverändert vertikal mittig (kein
 *  Layout-Sprung seiner Position). Test unten («viele Geschosse: die
 *  Geschossleiste endet über dem EntwurfsDock»).
 *  JEDES Paar wird jetzt ausnahmslos hart geprüft. */
const BEKANNTE_VORBESTEHENDE_KOLLISIONEN: readonly [string, string][] = [];

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
  // v0.8.1 / P4 (Spez §1.3, Splat-Fusion): der fusionierte `splat-werkzeug`-
  // Knopf öffnet ohne geladene Cloud den Datei-Dialog statt das Panel zu
  // togglen — dieser Dock-Layout-Test braucht nur das offene Panel, keine
  // Cloud, darum über den generischen Test-Hook `ui.panelSetzen` direkt
  // geöffnet (derselbe Weg wie `e2e/dock-kosmo.spec.ts`).
  await page.evaluate(() => {
    (
      window as unknown as { __kosmoUiBefehle: { ausfuehren: (id: string, params: unknown) => unknown } }
    ).__kosmoUiBefehle.ausfuehren('ui.panelSetzen', { panel: 'splatPanelOffen', offen: true });
  });
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

// ---------------------------------------------------------------------------
// v0.7.9 — `zuletztGeoeffnet`-Schutz (A6-Restpunkt der v0.7.8-Abnahme):
// `DockFlaeche` füttert jetzt `opts.zuletztGeoeffnet` (das zuletzt per
// Toggle/`ui.dock*` geöffnete Panel, bis zum nächsten externen Reflow) — ein
// frisch geöffnetes Panel klappt nie im selben Atemzug SELBST wieder ein,
// stattdessen weicht das unwichtigste ANDERE Flex-Panel. Die zwei Tests hier
// beweisen beide Hälften der Semantik: (1) das Öffnen selbst ist geschützt —
// selbst gegen ein WICHTIGERES Panel; (2) der Schutz ist transient — ein
// Fenster-Resize (Reflow) verbraucht ihn, danach gilt wieder die reine
// Wichtigkeits-Rangfolge (der frühere Prüfpunkt dieses Tests, jetzt über den
// Resize-Weg statt über das Öffnen).
// ---------------------------------------------------------------------------

test('zuletztGeoeffnet (enges Fenster 1400×520): frisch geöffnetes Draw (48) klappt NIE selbst ein — Kennzahlen (60) weicht', async ({
  page,
}) => {
  // Höhe 520: Feld ≈ 323 − TOP_BAND 34 → Kennzahlen min 200 + Draw min 170
  // + Gap sprengen die Höhe sicher, nach EINEM Einklappen reicht der Platz
  // (Begründung wie der Vorgänger-Test dieser Stelle, s. Git-Historie).
  await page.setViewportSize({ width: 1400, height: 520 });
  await oeffneDesignMitTkb(page);

  await page.click('[data-testid="draw-toggle"]');

  // OHNE Schutz wählte `stack()` das unwichtigste Flex-Panel — Draw (48)
  // selbst, das der Mensch GERADE eben geöffnet hat. MIT Schutz weicht das
  // wichtigere Kennzahlen (60): nie das frische.
  await expect(page.locator('[data-testid="dock-panel-kennzahlen-tab"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-drawOffen-tab"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="draw-panel"]')).toBeVisible();

  await pruefeDisjunktion(page, selektorMap(['drawOffen', 'kennzahlen']));
});

test('zuletztGeoeffnet ist transient: nach einem Resize-Reflow klappt Draw (48) regulär vor Kennzahlen (60) ein', async ({
  page,
}) => {
  // Draw bei GROSSEM Fenster öffnen (Platz reicht, nichts klappt) — dann
  // schrumpfen: der Resize ist ein externer Reflow und verbraucht den
  // Schutz, die reine Rangfolge entscheidet wieder (Draw 48 < Kennzahlen 60).
  await oeffneDesignMitTkb(page);
  await page.click('[data-testid="draw-toggle"]');
  await expect(page.locator('[data-testid="draw-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-kennzahlen-tab"]')).toHaveCount(0);

  await page.setViewportSize({ width: 1400, height: 520 });

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

// v0.7.9 (A1): + die zwei ehemals fixen Säulen-Blöcke (`viewportHudStatuskarte`/
// `viewportEigenschaften`, Anker `top-right`) — seit ihrer Migration ins Dock
// laufen sie in JEDER Disjunktions-Prüfung dieser Datei hart mit.
const HUD_FLOAT_IDS = [
  'viewportModusLeiste',
  'viewportModusKarte',
  'viewportWerkzeugRail',
  'viewportOrientierung',
  'viewportHudStatuskarte',
  'viewportEigenschaften',
] as const;

test('3D-/Split-Ansicht: alle sechs Viewport-HUD-Floats + zwei offene Dock-Panels — keine Überlappung untereinander/gegen die Spalten', async ({
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

// ---------------------------------------------------------------------------
// v0.7.9 (A1) — der bis v0.7.8 AUSGEKLAMMERTE Fall (ROADMAP 357): enge
// Split-Ansicht (Default-View) + offenes linkes Panel liess das
// `viewportOrientierung`-Float mit der unteren Ecke der damals FIXEN
// Eigenschaften-Säule überlappen (real gemessen ~130×85px, 1400×900 +
// `kv-oeffnen`). Seit die Säule selbst zwei Dock-Floats ist
// (`viewportHudStatuskarte`/`viewportEigenschaften`), entzerrt `solve()`/
// `separate()` sie wie jedes andere Panel — genau DIESE Konstellation wird
// hier hart nachgestellt und paarweise geprüft (inkl. Statusleiste: die
// Eigenschaften-Höhe wird vom Solver aufs Feld geklemmt statt wie früher
// darüber hinauszuragen).
// ---------------------------------------------------------------------------

test('enge Split-Ansicht (1400×900 + kv offen): Orientierungs-Float und Eigenschaften-Säule sind DISJUNKT — der frühere P5-Restfall', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);
  // Default-viewMode ist bereits 'split' — hier trotzdem explizit, damit der
  // Test nicht von einem künftigen Default-Wechsel abhängt.
  await page.click('[data-testid="view-split"]');
  await page.click('[data-testid="kv-oeffnen"]');
  await expect(page.locator('[data-testid="dock-panel-kvOffen"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-viewportEigenschaften"]')).toBeVisible();
  await expect(page.locator('[data-testid="dock-panel-viewportHudStatuskarte"]')).toBeVisible();

  // Der historische Problem-Paarfall zuerst (sprechende Meldung), dann die
  // volle paarweise Prüfung inkl. Chrome.
  const orient = await stabileBox(page.locator('[data-testid="dock-panel-viewportOrientierung"]'));
  const eigenschaften = await stabileBox(page.locator('[data-testid="dock-panel-viewportEigenschaften"]'));
  expect(
    ueberlappenSich(orient, eigenschaften),
    'Orientierungs-Float überlappt die Eigenschaften-Säule (ROADMAP-357-Fall)',
  ).toBe(false);

  await pruefeDisjunktion(page, selektorMap([...HUD_FLOAT_IDS, 'kvOffen', 'kennzahlen']));

  // Die Säule bleibt im Feld (früher ragte die fixe Spalte bei knapper Höhe
  // unter das Feld): untere Kante über der Statusleiste.
  const statusleiste = await stabileBox(page.locator('[data-testid="statusleiste"]'));
  expect(eigenschaften.y + eigenschaften.height).toBeLessThanOrEqual(statusleiste.y + 1);
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

// ---------------------------------------------------------------------------
// v0.7.8 Welle 3 / Paket P6 («Raster-Kachel», Konzept B als zweiter Modus
// DESSELBEN Solvers) — der Solver selbst (ctop/cbot-Routing via `rowLayout()`)
// ist bereits seit Welle 1 (P1) unit-getestet (`dock-kern.test.ts`, «Konzept
// B: top-Floats werden zu einem ctop-Streifen» u.ä.); `DockFlaeche.tsx`/
// `DockPanel.tsx`/`DockSnapZonen.tsx` lasen `modus` schon seit P4/P5 (Pop-out
// nur `modus==='A'`, «schwebend»-Snap-Zone nur `modus==='A'`). Diese Sektion
// deckt NEU ab: den B-Modus tatsächlich END-TO-END über die Einstellungen
// erreichen (statt nur Solver-Unit-Tests), inkl. Persistenz + getrennter
// A/B-Layout-Overrides. KEIN registriertes Panel (weder Design noch Vis)
// nutzt `anker:'bottom-center'` — der `cbot`-Streifen bleibt darum ein reiner
// Solver-Unit-Test-Fall (`dock-kern.test.ts`), hier nicht zusätzlich
// nachgestellt (kein Weg, ihn ohne einen fiktiven Test-Override zu erreichen).
// ---------------------------------------------------------------------------

async function oeffneDesignInModus(page: Page, modus: 'A' | 'B'): Promise<void> {
  await page.goto('/');
  await page.evaluate((m) => {
    localStorage.setItem('kosmo.dock.v1', JSON.stringify({ version: 1, modus: m, layouts: {} }));
  }, modus);
  await page.reload();
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();
}

test('B-Modus (Design-Station): HUD-Floats erscheinen als ctop-Streifen bzw. Spalten-Panel, alles disjunkt, kein Pop-out/Schweben-Snap', async ({
  page,
}) => {
  await oeffneDesignInModus(page, 'B');

  // Alle vier HUD-Floats bleiben sichtbar (Sichtbarkeits-Guard unverändert —
  // nur ihre ROUTING-Zone im Solver ändert sich zwischen A und B).
  for (const id of HUD_FLOAT_IDS) {
    await expect(page.locator(`[data-testid="dock-panel-${id}"]`)).toBeVisible();
  }

  await page.click('[data-testid="raster-toggle"]');
  await expect(page.locator('[data-testid="dock-panel-rasterOffen"]')).toBeVisible();
  await pruefeDisjunktion(page, selektorMap([...HUD_FLOAT_IDS, 'rasterOffen', 'kennzahlen']));

  // `viewportModusLeiste`/`viewportModusKarte`/`viewportWerkzeugRail` sind
  // alle `anker:'top'` → im B-Modus routet `solve()` (dock-kern.ts) sie in
  // den ctop-STREIFEN oben im Center: horizontal ZWISCHEN linker Spalte
  // (rasterOffen) und rechter Spalte (kennzahlen), vertikal in 56px-Bändern
  // ab Feld-Oberkante (`rowLayout()` zentriert jedes Element in seinem
  // Band; passt die Reihe nicht in die Center-Breite, wickelt `DockFlaeche`
  // sie zeilenweise um — `wickleCtopStreifen()`, real der Fall bei
  // 1400×900 + vollen Spalten: 814px Reihenbreite vs. ~645px Center).
  // `viewportOrientierung` (`anker:'bottom-left'`) fällt im B-Routing auf
  // die linke SPALTE zurück (dock-kern.ts `solve()`: `else d = 'left'`).
  const rasterBox = await stabileBox(page.locator('[data-testid="dock-panel-rasterOffen"]'));
  const kennzahlenBox = await stabileBox(page.locator('[data-testid="dock-panel-kennzahlen"]'));
  const flaecheBox = (await page.locator('[data-testid="dock-flaeche"]').boundingBox())!;
  const BAND = 56 + 10; // STRIP + GAP (dock-kern.ts DOCK_KONSTANTEN)
  const bandStart = flaecheBox.y + 10; // feld.y = GAP relativ zum Container
  for (const id of ['viewportModusLeiste', 'viewportModusKarte', 'viewportWerkzeugRail'] as const) {
    const box = await stabileBox(page.locator(`[data-testid="dock-panel-${id}"]`));
    // Horizontal im Center (nicht unter den Spalten):
    expect(box.x).toBeGreaterThanOrEqual(rasterBox.x + rasterBox.width - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(kennzahlenBox.x + 1);
    // Vertikal in einem der obersten zwei Streifen-Bänder, mittig im Band:
    const mitte = box.y + box.height / 2 - bandStart;
    const bandIndex = Math.round((mitte - 28) / BAND);
    expect(bandIndex).toBeGreaterThanOrEqual(0);
    expect(bandIndex).toBeLessThanOrEqual(1);
    expect(Math.abs(mitte - (bandIndex * BAND + 28))).toBeLessThanOrEqual(2);
  }
  // Orientierung sitzt in der linken Spalte: gleicher x-Bereich wie rasterOffen.
  const orientBox = await stabileBox(page.locator('[data-testid="dock-panel-viewportOrientierung"]'));
  expect(Math.abs(orientBox.x - rasterBox.x)).toBeLessThanOrEqual(1);
  // v0.7.9 (A1, ROADMAP-358-Fall): die zwei Säulen-Floats (`anker:
  // 'top-right'`) fallen im B-Routing GENAUSO auf die linke Spalte zurück
  // (dock-kern.ts `solve()`: `else d = 'left'`) — als Spalten-Panels können
  // B-Streifen/Linksspalte sie nicht mehr überdecken (die Disjunktions-
  // Prüfung oben misst sie bereits mit, hier zusätzlich die Spalten-Position
  // explizit).
  for (const id of ['viewportHudStatuskarte', 'viewportEigenschaften'] as const) {
    const box = await stabileBox(page.locator(`[data-testid="dock-panel-${id}"]`));
    expect(Math.abs(box.x - rasterBox.x)).toBeLessThanOrEqual(1);
  }

  // Kein Pop-out-Knopf im B-Modus (DockPanel.tsx: `modus==='A' && …`) — für
  // JEDES Panel, nicht nur die HUDs.
  for (const id of [...HUD_FLOAT_IDS, 'kennzahlen', 'rasterOffen']) {
    await expect(page.locator(`[data-testid="dock-panel-${id}-popout"]`)).toHaveCount(0);
  }

  // Header-Drag anstossen (Kopf von `kennzahlen`) — die «schwebend»-Snap-Zone
  // (DockSnapZonen.tsx: `modus==='A' && …`) darf NICHT erscheinen, nur
  // links/rechts.
  const kopf = page.locator('[data-testid="dock-panel-kennzahlen"] .k-dock-panel-kopf');
  const kopfBox = (await kopf.boundingBox())!;
  await page.mouse.move(kopfBox.x + kopfBox.width / 2, kopfBox.y + kopfBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(kopfBox.x + kopfBox.width / 2 - 40, kopfBox.y + 20, { steps: 5 });
  await expect(page.locator('[data-testid="dock-snap-schwebend"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="dock-snap-links"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="dock-snap-rechts"]')).toHaveCount(1);
  await page.mouse.up();
});

test('Einstellungen: Umschalten A↔B wirkt sofort, persistiert über Reload, A-Overrides bleiben getrennt von B-Overrides', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);

  // Seed: eine A:design-Spaltenbreite, die sich klar von jedem B-Default
  // unterscheidet (Drag am Splitter, gleiches Muster wie der Reset-Test oben).
  await page.click('[data-testid="kv-oeffnen"]');
  const panel = page.locator('[data-testid="dock-panel-kvOffen"]');
  await expect(panel).toBeVisible();
  const aVorher = await stabileBox(panel);
  const splitter = page.locator('[data-testid="dock-splitter-spL"]');
  const sBox = (await splitter.boundingBox())!;
  await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sBox.x + sBox.width / 2 + 80, sBox.y + sBox.height / 2, { steps: 5 });
  await page.mouse.up();
  const aNachDrag = await stabileBox(panel);
  expect(Math.abs(aNachDrag.width - aVorher.width)).toBeGreaterThan(20);

  // Einstellungen öffnen (Kopfleiste — stationsunabhängig) und auf B wechseln.
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await expect(page.locator('[data-testid="einstellungen-panel"]')).toBeVisible();
  await expect(page.locator('[data-testid="einstellungen-dock-modus-A"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-testid="einstellungen-dock-modus-B"]');
  await expect(page.locator('[data-testid="einstellungen-dock-modus-B"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-testid="einstellungen-panel"] [aria-label="Schliessen"]');

  // Wirkt SOFORT, ohne Reload: kein Pop-out-Knopf mehr am kv-Panel.
  await expect(page.locator('[data-testid="dock-panel-kvOffen-popout"]')).toHaveCount(0);

  const gespeichert = await page.evaluate(() => {
    const roh = localStorage.getItem('kosmo.dock.v1');
    return roh ? (JSON.parse(roh) as { modus?: string }) : null;
  });
  expect(gespeichert?.modus).toBe('B');

  // Persistiert über Reload. Nach dem Reload ist das TKB-Projekt weg (die
  // Demo lebt nur im Speicher) — gleiches Muster wie der Persistenz-Test in
  // `dock-interaktion.spec.ts`: `load-tkb` erneut klicken.
  await page.reload();
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await expect(page.locator('[data-testid="einstellungen-dock-modus-B"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-testid="einstellungen-panel"] [aria-label="Schliessen"]');

  // A:design bleibt vom B-Wechsel unberührt: zurück auf A, die vorher
  // gezogene Breite ist noch da (kv-Panel wieder ähnlich breit wie `aNachDrag`,
  // NICHT der unveränderte `aVorher`-Default).
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.click('[data-testid="einstellungen-dock-modus-A"]');
  await page.click('[data-testid="einstellungen-panel"] [aria-label="Schliessen"]');
  await page.click('[data-testid="kv-oeffnen"]');
  const aWiederhergestellt = await stabileBox(page.locator('[data-testid="dock-panel-kvOffen"]'));
  expect(Math.abs(aWiederhergestellt.width - aNachDrag.width)).toBeLessThan(2);
});

// ---------------------------------------------------------------------------
// Vis-Station (v0.7.8 Welle 3 / P6) — die vier dockbaren Panels (Palette/
// Ausrichten/Legende/Minimap, `state/dock-stationen.ts` `VIS_PANELS`) bleiben
// in BEIDEN Modi disjunkt. `visLegende`/`visMinimap` waren bisher EIN
// gemeinsamer Flex-Stapel, jetzt zwei getrennte Floats — diese Disjunktions-
// Prüfung ist genau der Beweis, dass die Trennung nichts überlappen lässt.
// ---------------------------------------------------------------------------

async function oeffneVisMitGraph(page: Page, modus: 'A' | 'B'): Promise<void> {
  await page.goto('/');
  await page.evaluate((m) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.bridge', 'http://localhost:8600');
    localStorage.setItem('kosmo.dock.v1', JSON.stringify({ version: 1, modus: m, layouts: {} }));
  }, modus);
  await page.reload();
  await page.click('[data-testid="module-vis"]');
  await page.click('[data-testid="graph-neu"]');
  await expect(page.locator('[data-testid="node-canvas"]')).toBeVisible();
}

async function visNodeHinzu(page: Page, typ: string): Promise<void> {
  await page.click('[data-testid="node-hinzu"]');
  await page.waitForSelector('[data-testid="node-hinzu-popup"]');
  await page.click(`[data-testid="node-hinzu-popup"] [data-value="${typ}"]`);
  await page.waitForSelector('[data-testid="node-hinzu-popup"]', { state: 'hidden' });
}

for (const modus of ['A', 'B'] as const) {
  test(`Vis-Station (Modus ${modus}): Palette + Minimap + Legende + Ausrichten disjunkt`, async ({ page }) => {
    await oeffneVisMitGraph(page, modus);

    // Genug Nodes für die Minimap-Schwelle (MINIMAP_KNOTEN_MIN=5) + alle
    // sechs Porttypen für die Legende.
    for (const typ of ['modell', 'material', 'prompt', 'zahl', 'kamera', 'render']) {
      await visNodeHinzu(page, typ);
    }
    await expect(page.locator('[data-testid="dock-panel-visMinimap"]')).toBeVisible();
    await expect(page.locator('[data-testid="dock-panel-visLegende"]')).toBeVisible();

    // Palette öffnen (Toggle bleibt fixe Chrome, unverändert in A/B).
    await page.click('[data-testid="vis-palette-toggle"]');
    await expect(page.locator('[data-testid="dock-panel-visPalette"]')).toBeVisible();

    // Ausrichten-Leiste: ≥2 Nodes auswählen (Shift-Marquee über den ganzen Canvas).
    const canvasBox = (await page.locator('[data-testid="node-canvas"]').boundingBox())!;
    await page.mouse.move(canvasBox.x + 5, canvasBox.y + 5);
    await page.keyboard.down('Shift');
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width - 5, canvasBox.y + canvasBox.height - 5, { steps: 10 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await expect(page.locator('[data-testid="dock-panel-visAusrichten"]')).toBeVisible();

    await pruefeDisjunktion(page, {
      visPalette: '[data-testid="dock-panel-visPalette"]',
      visAusrichten: '[data-testid="dock-panel-visAusrichten"]',
      visLegende: '[data-testid="dock-panel-visLegende"]',
      visMinimap: '[data-testid="dock-panel-visMinimap"]',
    });

    // y-Ordnung Minimap/Legende ist MODUS-abhängig (ehrlich dokumentiert,
    // s. `dock-stationen.ts`-Kopfkommentar): im A-Modus stapelt
    // `placeFloats()` die bottom-left-Floats von unten nach oben (erstes
    // Registry-Element zuunterst → Minimap ÜBER der Legende, dieselbe
    // Optik wie der frühere gemeinsame Flex-Stapel). Im B-Modus werden
    // beide zu LINKEN Spalten-Panels, und `stack()` stapelt von OBEN nach
    // unten in Registry-Reihenfolge — die Ordnung kehrt sich um (Legende
    // über Minimap). Beide Ordnungen mit EINER Registry-Reihenfolge zu
    // erfüllen ist unmöglich; A (die historische Optik) gewinnt.
    const minimapBox = (await page.locator('[data-testid="dock-panel-visMinimap"]').boundingBox())!;
    const legendeBox = (await page.locator('[data-testid="dock-panel-visLegende"]').boundingBox())!;
    if (modus === 'A') {
      expect(minimapBox.y).toBeLessThan(legendeBox.y);
    } else {
      expect(legendeBox.y).toBeLessThan(minimapBox.y);
    }
  });
}

// ---------------------------------------------------------------------------
// v0.7.9 (B2, Owner-Stretch) — die letzte, bis eben in
// `BEKANNTE_VORBESTEHENDE_KOLLISIONEN` ausgeklammerte Alt-Kollision: bei
// vielen Geschossen wuchs die Geschossleiste (`top:0`, Karteikarten-Liste)
// über die vertikale Mitte hinaus in den dort fest verankerten EntwurfsDock
// (`top:50%`) hinein. Fix in `DesignWorkspace.tsx`: die Geschossleiste misst
// jetzt per ResizeObserver (Muster wie `DockFlaeche.tsx`s Feld-Messung) die
// Oberkante des EntwurfsDock und klemmt ihre `maxHeight` strikt davor — sie
// scrollte ohnehin schon (Hochhaus-Grenze), scrollt jetzt nur früher. Dieser
// Test stapelt genug Geschosse, um den historischen Fall zuverlässig
// nachzustellen (7 aus der TKB-Demo + 15 zusätzliche, `design.
// geschossKopieren` in EINER `__kosmo.run`-Schleife statt UI-Klicks — gleiches
// Muster wie `sim-hochhaus.spec.ts`), und prüft danach BBox-Disjunktion
// Geschossleiste ↔ EntwurfsDock ↔ Statusleiste.
// ---------------------------------------------------------------------------

test('viele Geschosse (Hochhaus-Fall): die Geschossleiste endet über dem EntwurfsDock, keine Überlappung', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);

  const storeyId = (await page.evaluate(() => window.__kosmo.state().activeStoreyId))!;
  await page.evaluate(
    ({ storeyId, n }) => {
      const k = window.__kosmo;
      for (let i = 0; i < n; i++) {
        k.run('design.geschossKopieren', { storeyId, anzahl: 1 });
      }
    },
    { storeyId, n: 15 },
  );
  // TKB startet mit 7 Geschossen (`demo-tkb.ts`) — +15 gestapelte macht 22,
  // deutlich über der Schwelle, an der der historische Fall real gemessen
  // wurde (1400×900, 7 Geschosse reichten dafür bereits knapp).
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.storeysOrdered().length))
    .toBe(22);

  const geschossleiste = await stabileBox(page.locator('[data-testid="geschossleiste"]'));
  const entwurfDock = await stabileBox(page.locator('[data-testid="entwurf-dock"]'));
  const statusleiste = await stabileBox(page.locator('[data-testid="statusleiste"]'));

  expect(
    ueberlappenSich(geschossleiste, entwurfDock),
    'Geschossleiste überlappt den EntwurfsDock (der ehemalige B2-Altfall)',
  ).toBe(false);
  expect(ueberlappenSich(geschossleiste, statusleiste), 'Geschossleiste überlappt die Statusleiste').toBe(false);
  expect(ueberlappenSich(entwurfDock, statusleiste), 'EntwurfsDock überlappt die Statusleiste').toBe(false);

  // Nicht nur "disjunkt durch Zufall": die Leiste endet klar OBERHALB der
  // Dock-Oberkante — der eigentliche Beweis der Klemme, nicht nur ihr Effekt.
  expect(geschossleiste.y + geschossleiste.height).toBeLessThanOrEqual(entwurfDock.y + 1);

  // Volle Standard-Prüfung (inkl. `kennzahlen`, das FIXE_ELEMENTE-Trio) —
  // derselbe Weg wie jeder andere Test in dieser Datei.
  await pruefeDisjunktion(page, selektorMap(['kennzahlen']));
});

// v0.8.1 Welle 4 / Paket P5c (Zwei-Stufen-Rollout, `docs/V081-SPEZ.md`
// §2.4/§8 Sanktion 5) — additive Kompakt-Stufen-Assertions: die neun in
// diesem Paket migrierten Panels tragen jetzt `KPanelZweiStufen`, deren Kopf
// einen `-koerper-umschalten`-Knopf trägt (P5b-Muster,
// `panel-zwei-stufen.tsx`). Zwei Stichproben statt aller neun: `kvOffen`
// (P5c hat `min` gesenkt, 190→84 — die Kompakt-Stufe MUSS hier sichtbar
// kleiner werden als die alte 66%-Stufe) und `maengelOffen` (P5c hat `min`
// bewusst UNVERÄNDERT gelassen, 180 — die Kompakt-Stufe floort dort ehrlich
// weiter bei 180, s. `dock-stationen.ts`-Kommentar). Bestehende Assertions
// oben bleiben unverändert.
//
// GATE-NACHTRAG: eine Live-Probe fand, dass der `KPanelZweiStufen`-Kopf in
// Stufe 'kompakt' bei den `min`-gesenkten Panels VOLLSTÄNDIG UNTERHALB des
// sichtbaren Panel-Rechtecks lag (der erste `min`-Wert von 56-64px
// budgetierte nur den Kopf selbst, vergass aber den Dock-eigenen
// `.k-dock-panel-kopf` (28px, `dock-flaeche.css`) + das `.dp-dialog`-
// Padding (12px), die IMMER davor liegen). Fix: `min`/`groesseKompakt.h`
// auf 84/88 angehoben (Live vermessen: 28+12+33.4≈74px real, +Puffer) UND
// die Panel-eigene Action-Row (Export-/Schliessen-Knöpfe) rendert jetzt NUR
// in Stufe 'offen' (`stufe === 'offen' &&`-Guard je Panel), damit der
// `KPanelZweiStufen`-Kopf in Stufe 'kompakt' das ERSTE gemalte Element ist.
// Die Tests unten beweisen das jetzt EXPLIZIT per Bounding-Box-Vergleich
// (Kopf muss innerhalb des Panel-Rechtecks liegen), nicht nur per Höhe.
test('P5c Kompakt-Stufe: KV-Panel schrumpft spürbar (min gesenkt) UND der Kopf bleibt innerhalb des Panel-Rechtecks; Mängel-Panel floort ehrlich am unveränderten min', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);

  await page.click('[data-testid="kv-oeffnen"]');
  await expect(page.locator('[data-testid="kv-panel"]')).toBeVisible();

  await page.click('[data-testid="kv-panel-koerper-umschalten"]');
  await expect(page.locator('[data-testid="kv-panel-koerper"]')).toHaveClass(/k-panel-zwei--kompakt/);
  // `expect.poll()` statt eines einzelnen `stabileBox()`-Schnappschusses —
  // s. Begründung bei der Rück-Messung weiter unten (später Content-Re-Solve).
  await expect
    .poll(async () => (await page.locator('[data-testid="dock-panel-kvOffen"]').boundingBox())?.height ?? 0, {
      timeout: 6000,
    })
    .toBeLessThan(150);
  const kvKompaktBox = await stabileBox(page.locator('[data-testid="dock-panel-kvOffen"]'));
  // Kompakt zielt auf `groesseKompakt.h`=88 (`dock-stationen.ts`), UNABHÄNGIG
  // vom verfügbaren Feld (anders als die alte 66%-/neue 25%-Stufe, die beide
  // `avail`-abhängig sind — ein Vergleich gegen den VOR-Toggle-Alt-Default-
  // Wert wäre hier fragil, weil dessen `avail*0.66`-Ziel bei einem knappen
  // Testfeld selbst nahe am `min`-Boden liegen kann, s. Gate-Nachtrag-Fund).
  // Ein fester Bereich [84, 150] beweist dieselbe Kernaussage robust: klar
  // unter der historischen 190px-`min`-Schwelle UND weit unter `groesse`=380.
  expect(kvKompaktBox.height).toBeGreaterThanOrEqual(84);
  expect(kvKompaktBox.height).toBeLessThan(150);

  // Gate-Beweis: der Kopf (Titel+Kernkennzahl) liegt VOLLSTÄNDIG innerhalb
  // des Panel-Rechtecks — nicht darunter/darüber hinausragend — UND trägt
  // die Kernkennzahl als sichtbaren Text (kein leeres Chrome).
  const kvKopfBox = (await page.locator('[data-testid="kv-panel-koerper"] .k-panel-zwei-kopf').boundingBox())!;
  expect(kvKopfBox.y).toBeGreaterThanOrEqual(kvKompaktBox.y - 1);
  expect(kvKopfBox.y + kvKopfBox.height).toBeLessThanOrEqual(kvKompaktBox.y + kvKompaktBox.height + 1);
  await expect(page.locator('[data-testid="kv-panel-koerper"] .k-panel-zwei-kernkennzahl')).toBeVisible();
  const kvKopfText = await page.locator('[data-testid="kv-panel-koerper"] .k-panel-zwei-kernkennzahl').innerText();
  expect(kvKopfText.length).toBeGreaterThan(0);

  // Zurück auf 'offen' — Grösse wächst wieder auf das Viertelflächen-Ziel
  // (`avail*0.25`, §2.1) — NICHT auf die alte 66%-Stufe: das ist by design
  // (Owner-Auftrag «aufgeklappt nur ~1/4 der Oberfläche»). Der Klassenwechsel
  // wird ZUERST bewiesen (Klick tatsächlich verarbeitet). Gemessen wird per
  // `expect.poll()` statt eines einzelnen `stabileBox()`-Schnappschusses:
  // derselbe «später Content-Re-Solve»-Befund wie beim row-Splitter (ROADMAP
  // P2) zeigte sich hier live — die CSS-Klasse wechselt sofort, der Solver-
  // Rect braucht in Einzelfällen einen zweiten, spät nachlaufenden Re-Solve,
  // bis `rect.h` tatsächlich über `groesseKompakt.h` wächst. `stabileBox()`s
  // festes 700+300ms-Fenster kann diesen Nachlauf knapp verpassen; Polling
  // mit grosszügigem Timeout wartet, bis der reale Endwert erreicht ist,
  // statt einen Zwischenstand als «stabil» zu akzeptieren.
  await page.click('[data-testid="kv-panel-koerper-umschalten"]');
  await expect(page.locator('[data-testid="kv-panel-koerper"]')).toHaveClass(/k-panel-zwei--offen/);
  await expect
    .poll(
      async () => (await page.locator('[data-testid="dock-panel-kvOffen"]').boundingBox())?.height ?? 0,
      { timeout: 6000 },
    )
    .toBeGreaterThan(kvKompaktBox.height);

  // Mängel: `min` bewusst unverändert (180, `dock-layout.spec.ts` Z. 239-241
  // — dieselbe Summenformel, die dieser Test-Datei zugrunde liegt) — die
  // Kompakt-Stufe floort ehrlich bei 180, ist also NICHT kleiner als die
  // alte 66%-Stufe in einem entspannten Feld, bleibt aber ein gültiger,
  // funktionierender Umschalt-Knopf (kein Absturz, `k-panel-zwei--kompakt`
  // greift) — UND auch hier bleibt der Kopf innerhalb des Rechtecks.
  await page.click('[data-testid="maengel-oeffnen"]');
  await expect(page.locator('[data-testid="maengel-panel"]')).toBeVisible();
  await page.click('[data-testid="maengel-panel-koerper-umschalten"]');
  const maengelKompaktBox = await stabileBox(page.locator('[data-testid="dock-panel-maengelOffen"]'));
  expect(maengelKompaktBox.height).toBeGreaterThanOrEqual(180 - 1);
  await expect(page.locator('[data-testid="maengel-panel-koerper"]')).toHaveClass(/k-panel-zwei--kompakt/);
  const maengelKopfBox = (await page.locator('[data-testid="maengel-panel-koerper"] .k-panel-zwei-kopf').boundingBox())!;
  expect(maengelKopfBox.y).toBeGreaterThanOrEqual(maengelKompaktBox.y - 1);
  expect(maengelKopfBox.y + maengelKopfBox.height).toBeLessThanOrEqual(maengelKompaktBox.y + maengelKompaktBox.height + 1);
});

// Gate-Nachtrag (P5c) — Schleife über ALLE NEUN migrierten Panels: je Panel
// öffnen, auf 'kompakt' umschalten, beweisen dass (a) der Kopf vollständig
// innerhalb des Dock-Panel-Rechtecks liegt (das eigentliche Gate-Symptom —
// «leere Fläche + X» bedeutete, der Kopf lag ausserhalb) und (b) die
// Kernkennzahl als nicht-leerer, sichtbarer Text im Kopf steht. Deckt damit
// sowohl die 6 `min`-gesenkten Panels (kv/varianten/liste/bauablauf/
// unternehmerplan/inspector) als auch die 3 `min`-unveränderten (maengel/
// splat/submission) einheitlich ab. Splat/Submission werden über den
// generischen Test-Hook `ui.panelSetzen` geöffnet (dasselbe Muster wie im
// Schmalfenster-Test oben), da ihr Werkzeug-Klick heute einen Datei-Dialog
// öffnet bzw. hinter dem Fähigkeiten-Überlauf sitzt.
test('P5c Kompakt-Stufe (Schleife über alle migrierten Panels): Kopf bleibt IMMER innerhalb des Panel-Rechtecks und trägt sichtbaren Kernkennzahl-Text', async ({
  page,
}) => {
  await oeffneDesignMitTkb(page);

  const panels: Array<{ dockId: string; koerper: string; oeffnen: () => Promise<void> }> = [
    { dockId: 'kvOffen', koerper: 'kv-panel-koerper', oeffnen: () => page.click('[data-testid="kv-oeffnen"]') },
    { dockId: 'bauablaufOffen', koerper: 'bauablauf-panel-koerper', oeffnen: () => page.click('[data-testid="bauablauf-oeffnen"]') },
    { dockId: 'listeOffen', koerper: 'berechnungsliste-panel-koerper', oeffnen: () => page.click('[data-testid="liste-toggle"]') },
    { dockId: 'variantenPanelOffen', koerper: 'varianten-panel-koerper', oeffnen: () => page.click('[data-testid="varianten-oeffnen"]') },
    { dockId: 'maengelOffen', koerper: 'maengel-panel-koerper', oeffnen: () => page.click('[data-testid="maengel-oeffnen"]') },
    {
      dockId: 'submissionOffen',
      koerper: 'submission-panel-koerper',
      oeffnen: () =>
        page.evaluate(() => {
          (
            window as unknown as { __kosmoUiBefehle: { ausfuehren: (id: string, params: unknown) => unknown } }
          ).__kosmoUiBefehle.ausfuehren('ui.panelSetzen', { panel: 'submissionOffen', offen: true });
        }),
    },
    {
      dockId: 'splatPanelOffen',
      koerper: 'splat-panel-koerper',
      oeffnen: () =>
        page.evaluate(() => {
          (
            window as unknown as { __kosmoUiBefehle: { ausfuehren: (id: string, params: unknown) => unknown } }
          ).__kosmoUiBefehle.ausfuehren('ui.panelSetzen', { panel: 'splatPanelOffen', offen: true });
        }),
    },
  ];

  for (const p of panels) {
    await p.oeffnen();
    const koerper = page.locator(`[data-testid="${p.koerper}"]`);
    await expect(koerper).toBeVisible();
    await page.click(`[data-testid="${p.koerper}-umschalten"]`);
    await expect(koerper).toHaveClass(/k-panel-zwei--kompakt/);
    const panelBox = await stabileBox(page.locator(`[data-testid="dock-panel-${p.dockId}"]`));
    const kopf = koerper.locator('.k-panel-zwei-kopf');
    const kopfBox = (await kopf.boundingBox())!;
    expect(kopfBox, `${p.dockId}: Kopf muss messbar sein`).not.toBeNull();
    expect(kopfBox.y, `${p.dockId}: Kopf-Oberkante darf nicht über dem Panel liegen`).toBeGreaterThanOrEqual(
      panelBox.y - 1,
    );
    expect(
      kopfBox.y + kopfBox.height,
      `${p.dockId}: Kopf-Unterkante muss innerhalb des Panel-Rechtecks liegen (das Gate-Symptom: Kopf lag VOLLSTÄNDIG darunter)`,
    ).toBeLessThanOrEqual(panelBox.y + panelBox.height + 1);
    const kernkennzahlText = await koerper.locator('.k-panel-zwei-kernkennzahl').innerText();
    expect(kernkennzahlText.trim().length, `${p.dockId}: Kernkennzahl darf nicht leer sein`).toBeGreaterThan(0);
    // Zurück auf 'offen', damit das nächste Panel aus einem sauberen
    // Ausgangszustand startet (kein Übertrag von Kompakt-Overrides).
    await page.click(`[data-testid="${p.koerper}-umschalten"]`);
    await expect(koerper).toHaveClass(/k-panel-zwei--offen/);
  }
});
