import { expect, type Page } from '@playwright/test';
import type { SimSzenario } from './szenarien';

/**
 * Serie H (Buildplan `docs/SERIE-H-BUILDPLAN.md`, Abschnitt 1.3) —
 * wiederverwendbare Journey-Bausteine für die Haustyp-Simulationen
 * (`e2e/sim-<typ>.spec.ts`). Jede Funktion nimmt `page: Page` als erstes
 * Argument, AGIERT (klickt/ruft Commands) UND ASSERTET — Journeys rufen
 * fast nur noch Bausteine auf, statt 200-Zeilen-Monolithen.
 *
 * H1a implementiert die aus den zwei grünen Saat-Specs (`sim-umbau.spec.ts`,
 * `sim-mfh.spec.ts`) extrahierbaren Bausteine 1–4, 9–13, 16–18. Bausteine
 * 5–8 und 14–15 kommen erst mit ihren ersten Nutzern (H1b/H2) — bis dahin
 * bleiben sie als TODO deklariert (kein toter «getesteter» Code).
 *
 * ── Robustheits-Regeln (1.4) — die Lehren aus den entfernten EFH-/
 *    Hochhaus-Specs, hart für JEDEN neuen Baustein ───────────────────────
 * R1  Nie fixe SVG-Pfadzahlen für geschichtete Darstellungen: das Poché
 *     rendert EINEN Pfad je Materialschicht — `count() > 0` bzw.
 *     Deltas/Monotonie, nie `toHaveCount(3)` auf Schraffur-/Umbau-Flächen.
 * R2  Nur verifizierte Selektoren: jede `data-testid`-Zeile trägt einen
 *     Quellkommentar (Datei/Zeile). Fehlt ein Testid → Command-Weg +
 *     UI-Assert, oder (einzige erlaubte Produkt-Berührung in Serie H) ein
 *     reines Attribut-Testid im App-Code — nie erfundene Selektoren.
 * R3  Zustands-Assertions über `__kosmo.state()` mit `expect.poll` statt
 *     `waitForTimeout`: Command-Wirkung landet asynchron im React-Render —
 *     gepollt wird das Doc, nicht das DOM; das DOM erst danach.
 * R4  Unsichtbar ≠ falsch: SVG-Elemente mit Bounding-Höhe/Breite 0 (flaches
 *     Terrain, deckungsgleiche Linien) sind für Playwright nie «visible» —
 *     Attribute prüfen (`points`, `stroke-dasharray`), nicht `toBeVisible()`.
 * R5  Layout abwarten, dann messen: vor `boundingBox()`/Maus-Drags erst
 *     `toBeVisible()` auf beiden Enden; spät erzeugte Nodes ins Sichtfeld
 *     rücken.
 * R6  cwd-Falle: alle Läufe aus `kosmo-orbit/` (dort liegt
 *     `playwright.config.ts`) — aus dem Repo-Root findet `npx playwright
 *     test` weder Config noch webServer.
 * R7  Helferserver sterben im Container zwischen Läufen → mit `setsid` als
 *     eigene Prozesse starten; Bridge-abhängige Abschnitte laufen nur nach
 *     `bridgeVerfuegbar()`.
 * R8  Seriell: `workers: 1` bleibt; Journeys einzeln startbar, eine Journey
 *     = ein `test()` mit `test.setTimeout(180_000)`.
 * R9  Kosmo-Antworten: grosszügige, aber begrenzte Timeouts (15 s Muster);
 *     nur bewiesene Mock-Intents.
 * R10 Downloads immer `Promise.all([waitForEvent('download'), click])` —
 *     nie click-dann-warten.
 */

// ─────────────────────────────────────────────────────────────────────────
// Ambient Typ für den Test-Hook `window.__kosmo`
// (`apps/kosmo-orbit/src/App.tsx` Z. 268–275 — run/state/open).
// ─────────────────────────────────────────────────────────────────────────
interface KosmoEntity {
  id: string;
  kind: string;
  name?: string;
  storeyId?: string;
  raumTyp?: string;
  placements?: { id: string; umbau?: string }[];
  [key: string]: unknown;
}

interface KosmoStorey {
  id: string;
  name: string;
  index: number;
}

interface KosmoDoc {
  byKind: <T extends KosmoEntity = KosmoEntity>(kind: string) => T[];
  storeysOrdered: () => KosmoStorey[];
  settings: { phase: string; [key: string]: unknown };
}

interface KosmoState {
  doc: KosmoDoc;
  activeStoreyId: string | null;
  select: (ids: string[]) => void;
}

declare global {
  interface Window {
    __kosmo: {
      run: (commandId: string, params: unknown) => { patches: { id: string }[] };
      state: () => KosmoState;
      open: (screen: string) => void;
    };
  }
}

interface Punkt2 {
  x: number;
  y: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 1 — projektStarten
// ─────────────────────────────────────────────────────────────────────────
/**
 * Onboarding + KosmoDesign öffnen + Projektstandort setzen. Mock-LLM-Provider
 * wird VOR dem `reload()` gesetzt — Provider wird beim App-Start gelesen
 * (die klassische Falle).
 */
export async function projektStarten(page: Page, szenario: SimSzenario): Promise<void> {
  await page.goto('/'); // [Quelle: sim-umbau.spec.ts Z.32 / sim-mfh.spec.ts Z.31]
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  }); // [Quelle: sim-umbau.spec.ts Z.33-36 / sim-mfh.spec.ts Z.32-35]
  await page.reload(); // [Quelle: sim-umbau.spec.ts Z.37 / sim-mfh.spec.ts Z.36]
  await page.click('[data-testid="module-design"]'); // [Quelle: sim-umbau.spec.ts Z.38 / sim-mfh.spec.ts Z.37]
  await page.click('[data-testid="view-2d"]'); // [Quelle: sim-umbau.spec.ts Z.39 / sim-mfh.spec.ts Z.38]
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible(); // [Quelle: sim-mfh.spec.ts Z.39]

  await page.evaluate(
    (standort) => window.__kosmo.run('design.standortSetzen', standort),
    szenario.standort,
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.standortSetzen']

  // Das Standort-Label steckt im Sonne-Panel, das erst nach dem Toggle im
  // DOM ist (`sonneOffen`-State) — Muster oberflaeche-adaption.spec.ts.
  await page.click('[data-testid="sonne-toggle"]'); // [Quelle: DesignWorkspace.tsx Z.1028 / oberflaeche-adaption.spec.ts Z.93]
  const label = page.locator('[data-testid="sonne-standort-label"]'); // [Quelle: DesignWorkspace.tsx Z.1298]
  await expect(label).toBeVisible();
  await expect(label).toContainText(szenario.standort.label);
  await page.click('[data-testid="sonne-toggle"]'); // Panel wieder schliessen — neutraler Zustand für den Rest der Journey
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 2 — parzelleSetzen
// ─────────────────────────────────────────────────────────────────────────
/**
 * Setzt Baugrenze + Zonenregel des Szenarios. Fehlt der Baugrenze ein
 * eigener `grenzabstand`, prüft dieser Baustein zusätzlich den
 * Regressions-Anker ROADMAP 153: ein bewusst knapp innerhalb platzierter
 * Probekörper muss die Zonenregel als Quelle im Befundtext tragen — danach
 * wird der Probekörper wieder entfernt (`design.loeschen`).
 */
export async function parzelleSetzen(page: Page, szenario: SimSzenario): Promise<void> {
  const storeyId = await page.evaluate(() => window.__kosmo.state().activeStoreyId);

  await page.evaluate(
    ({ storeyId, parzelle, zonenRegel }) => {
      const k = window.__kosmo;
      k.run('design.baugrenzeSetzen', {
        storeyId,
        outline: parzelle.outline,
        maxHoehe: parzelle.maxHoehe,
        grenzabstand: parzelle.grenzabstand,
      }); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.baugrenzeSetzen']
      k.run('design.zonenRegelSetzen', zonenRegel); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.zonenRegelSetzen']
    },
    { storeyId, parzelle: szenario.parzelle, zonenRegel: szenario.zonenRegel },
  );

  const grenze = await page.evaluate(
    (storeyId) => window.__kosmo.state().doc.byKind('boundary').find((b) => b.storeyId === storeyId) ?? null,
    storeyId,
  );
  expect(grenze).not.toBeNull();

  if (szenario.parzelle.grenzabstand === null && szenario.zonenRegel.grenzabstandKlein) {
    const probeId = await page.evaluate(
      ({ storeyId, outline, grenzabstandKlein }) => {
        const k = window.__kosmo;
        const st = k.state();
        const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!; // [Quelle: sim-umbau.spec.ts Z.49]
        // Probekörper knapp innerhalb der ersten Baugrenzenkante: Kantenmitte,
        // Richtung Zentroid um einen Bruchteil des Grenzabstands versetzt —
        // garantiert innerhalb des Polygons und näher an der Kante als soll.
        const cx = outline.reduce((s, p) => s + p.x, 0) / outline.length;
        const cy = outline.reduce((s, p) => s + p.y, 0) / outline.length;
        const a = outline[0]!;
        const b = outline[1]!;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const dx = cx - mx;
        const dy = cy - my;
        const len = Math.hypot(dx, dy) || 1;
        const inset = grenzabstandKlein * 0.3;
        const p1 = { x: mx + (dx / len) * inset, y: my + (dy / len) * inset };
        const p2 = { x: p1.x + (b.x - a.x) * 0.05, y: p1.y + (b.y - a.y) * 0.05 };
        return k.run('design.wandZeichnen', { storeyId, a: p1, b: p2, assemblyId: aw.id }).patches[0]!.id; // [Quelle: sim-umbau.spec.ts Z.51-52]
      },
      { storeyId, outline: szenario.parzelle.outline, grenzabstandKlein: szenario.zonenRegel.grenzabstandKlein },
    );

    const checksText = await page.locator('[data-testid="checks"]').innerText(); // [Quelle: KennzahlenPanel.tsx Z.123]
    expect(checksText).toContain(`Zonenregel «${szenario.zonenRegel.name}»`); // [Quelle: packages/kosmo-kernel/src/derive/checks.ts Z.356]

    await page.evaluate((id) => window.__kosmo.run('design.loeschen', { entityId: id }), probeId); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.loeschen']
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 3 — phaseSchalten
// ─────────────────────────────────────────────────────────────────────────
/**
 * Schaltet die SIA-Phase; liefert die Pfadzahl im Plan-SVG danach zurück —
 * der Aufrufer prüft die Monotonie `werkplan ≥ bauprojekt ≥ vorprojekt` am
 * SELBEN Modellstand (Regel R1: nie fixe Pfadzahlen).
 */
export async function phaseSchalten(
  page: Page,
  phase: 'vorprojekt' | 'bauprojekt' | 'werkplan',
): Promise<number> {
  await page.evaluate(
    (phase) => window.__kosmo.run('design.phaseSetzen', { phase }),
    phase,
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.phaseSetzen']
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.settings.phase))
    .toBe(phase); // Regel R3: Doc pollen, nicht das DOM
  return page.locator('[data-testid="planview"] path').count(); // [Quelle: apps/kosmo-orbit/src/modules/design/PlanView.tsx Z.195]
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 4 — waendeZeichnen
// ─────────────────────────────────────────────────────────────────────────
/**
 * Zeichnet eine Reihe von Wandkanten mit EINEM Aufbau (per Namenspräfix,
 * z.B. «AW»/«IW», aus `byKind('assembly')` aufgelöst) und liefert die
 * erzeugten Wand-IDs zurück. Assertet den exakten Wandanzahl-Delta.
 */
export async function waendeZeichnen(
  page: Page,
  kanten: { a: Punkt2; b: Punkt2 }[],
  aufbauName: string,
): Promise<string[]> {
  const vorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length); // [Quelle: sim-umbau.spec.ts Z.63]
  const ids = await page.evaluate(
    ({ kanten, aufbauName }) => {
      const k = window.__kosmo;
      const st = k.state();
      const assembly = st.doc.byKind('assembly').find((a) => a.name?.startsWith(aufbauName))!; // [Quelle: sim-umbau.spec.ts Z.49-50]
      return kanten.map(
        (kante) =>
          k.run('design.wandZeichnen', {
            storeyId: st.activeStoreyId,
            a: kante.a,
            b: kante.b,
            assemblyId: assembly.id,
          }).patches[0]!.id, // [Quelle: sim-umbau.spec.ts Z.51-52]
      );
    },
    { kanten, aufbauName },
  );
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length))
    .toBe(vorher + kanten.length); // [Quelle: sim-umbau.spec.ts Z.63 'Wandanzahl-Delta exakt']
  return ids;
}

// ─────────────────────────────────────────────────────────────────────────
// Bausteine 5–8, 14–15 — TODO, kommen mit ihren ersten Nutzern (H1b/H2)
// ─────────────────────────────────────────────────────────────────────────
// TODO (H2a): dachSetzen(page, params) — design.dachErstellen; Assert
//   byKind('roof')===1 und Dach-Mesh in der 3D-Szene sichtbar
//   (view-quad → __kosmoViewport.renderOnce()); bewusst KEINE
//   2D-Plansymbol-Assertion (V2-Lücke).
// TODO (H2a): treppeSetzen(page, params) — design.treppeErstellen; Assert
//   byKind('stair')-Delta + Treppensymbol im Plan-SVG (≥1 Element).
// TODO (H2b): tragwerkAusRaster(page, raster) — design.rasterSetzen +
//   design.stuetzenAusRaster; Assert Stützenzahl = Achsen-Produkt und
//   Achslabels bijektiv (Regressions-Anker Befund 2, «AA» bei Achse 27).
// TODO (H2b/H2c): fassade(page, module) — design.modulSpeichern,
//   fassadenModulZuweisen, fensterAusModulen; Assert Öffnungszahl > 0 und
//   Süd-/Nordwand tragen unterschiedliche Module (Regressions-Anker 154).
// TODO (H1b): renderUeberBridge(page) — KosmoVis-Kette (Muster
//   visgraph.spec.ts): drei-stimmungen → render-ausfuehren → render-bild
//   sichtbar → Blatt-Node verbinden → blatt-ablegen → Assert Bild auf
//   byKind('sheet'). Vorher bridgeVerfuegbar(page).
// TODO (H1b): bridgeVerfuegbar() — beforeAll-Probe: fetch
//   http://127.0.0.1:8600/health (Node-Kontext); bei Fehlschlag klarer
//   Skip-Fehlertext («Bridge :8600 mit --fake-worker starten, siehe
//   CLAUDE.md») statt kryptischem Timeout mitten in der Journey.

// ─────────────────────────────────────────────────────────────────────────
// Baustein 9 — segmentieren / grundrissFuellen
// ─────────────────────────────────────────────────────────────────────────
async function zonenAnzahl(page: Page): Promise<number> {
  return page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length); // [Quelle: sim-mfh.spec.ts Z.65/88/109]
}

export interface SegmentiererErwartung {
  typ: string;
  sollErwartet: number;
  mindestIst: number;
  mindestZonenDelta: number;
  kern?: { treppenhaus: number; treppen: number };
}

/**
 * Wohnungs-Segmentierer (V2-F5), optional mit Erschliessungskern (A3):
 * Soll-Mix ablesen, Vorschlag rechnen, Mix kontrollieren, übernehmen.
 */
export async function segmentieren(
  page: Page,
  erwartung: SegmentiererErwartung,
): Promise<{ ist: number; soll: number }> {
  const zonenVorher = await zonenAnzahl(page);
  await page.click('[data-testid="liste-toggle"]'); // [Quelle: sim-mfh.spec.ts Z.72]
  if (erwartung.kern) {
    await page.check('[data-testid="segmentierer-kern"]'); // [Quelle: sim-mfh.spec.ts Z.73]
  }
  await page.click('[data-testid="segmentierer-lauf"]'); // [Quelle: sim-mfh.spec.ts Z.74]

  const ergebnis = page.locator('[data-testid="segmentierer-ergebnis"]'); // [Quelle: sim-mfh.spec.ts Z.76]
  await expect(ergebnis).toBeVisible();
  await expect(ergebnis).toContainText(erwartung.typ);
  const ergebnisText = await ergebnis.innerText();
  const mixMatch = ergebnisText.match(new RegExp(`${erwartung.typ}\\D{0,5}(\\d+)\\s*\\/\\s*(\\d+)`)); // [Quelle: sim-mfh.spec.ts Z.80]
  expect(mixMatch, `Mix-Zeile nicht lesbar:\n${ergebnisText}`).not.toBeNull();
  const [, ist, soll] = mixMatch!;
  expect(Number(soll)).toBe(erwartung.sollErwartet);
  expect(Number(ist)).toBeGreaterThanOrEqual(erwartung.mindestIst);

  await page.click('[data-testid="segmentierer-uebernehmen"]'); // [Quelle: sim-mfh.spec.ts Z.86]
  await expect
    .poll(() => zonenAnzahl(page))
    .toBeGreaterThanOrEqual(zonenVorher + erwartung.mindestZonenDelta); // [Quelle: sim-mfh.spec.ts Z.87-89]

  if (erwartung.kern) {
    const kernStand = await page.evaluate(() => {
      const doc = window.__kosmo.state().doc;
      return {
        treppenhaus: doc.byKind('zone').filter((z) => z.raumTyp === 'treppenhaus').length,
        treppen: doc.byKind('stair').length,
      };
    }); // [Quelle: sim-mfh.spec.ts Z.92-98]
    expect(kernStand.treppenhaus).toBe(erwartung.kern.treppenhaus);
    expect(kernStand.treppen).toBe(erwartung.kern.treppen);
  }

  return { ist: Number(ist), soll: Number(soll) };
}

/**
 * Grundriss-Generator (Finch-Kern): jede Wohnungs-Zone mit Zimmern, Flur
 * und Möbeln füllen; setzt automatisch Zonentüren.
 */
export async function grundrissFuellen(
  page: Page,
  erwartung: { mindestZonenDelta: number; mindestMoebel: number },
): Promise<{ moebel: number; tueren: number }> {
  const zonenVorher = await zonenAnzahl(page);
  await page.click('[data-testid="grundrisse-fuellen"]'); // [Quelle: sim-mfh.spec.ts Z.107]
  await expect
    .poll(() => zonenAnzahl(page))
    .toBeGreaterThan(zonenVorher + erwartung.mindestZonenDelta); // [Quelle: sim-mfh.spec.ts Z.108-110]
  const gefuellt = await page.evaluate(() => {
    const doc = window.__kosmo.state().doc;
    return { moebel: doc.byKind('furniture').length, tueren: doc.byKind('zonentuer').length };
  }); // [Quelle: sim-mfh.spec.ts Z.111-114]
  expect(gefuellt.moebel).toBeGreaterThanOrEqual(erwartung.mindestMoebel);
  expect(gefuellt.tueren).toBeGreaterThan(0);
  await expect(page.locator('[data-testid="moebel"]').first()).toBeVisible(); // [Quelle: sim-mfh.spec.ts Z.117]
  return gefuellt;
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 10 — geschosseStapeln
// ─────────────────────────────────────────────────────────────────────────
export interface GeschossStapelErwartung {
  minZonenOberstes: number;
  minMoebelOberstes: number;
}

/**
 * Stapelt das aktive Geschoss n×; assertet die exakte Geschosszahl, dass
 * das oberste Geschoss Zonen+Möbel UND (falls vorhanden) Tragstruktur mit
 * trägt (Regressions-Anker Befund 1), und dass die Geschossleiste
 * bedienbar bleibt (Regressions-Anker Befund 3).
 */
export async function geschosseStapeln(
  page: Page,
  n: number,
  erwartung: GeschossStapelErwartung,
): Promise<void> {
  const geschosseVorher = await page.evaluate(() => window.__kosmo.state().doc.storeysOrdered().length); // [Quelle: sim-mfh.spec.ts Z.125]
  for (let i = 0; i < n; i++) {
    await page.click('[data-testid="geschoss-stapeln"]'); // [Quelle: sim-mfh.spec.ts Z.126-127]
  }
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.storeysOrdered().length))
    .toBe(geschosseVorher + n); // [Quelle: sim-mfh.spec.ts Z.128-130]

  const oberstesGeschoss = await page.evaluate(() => {
    const doc = window.__kosmo.state().doc;
    const geordnet = doc.storeysOrdered();
    const letztes = geordnet[geordnet.length - 1]!;
    const spaltenGesamt = doc.byKind('column').length + doc.byKind('beam').length;
    const spaltenOben =
      doc.byKind('column').filter((c) => c.storeyId === letztes.id).length +
      doc.byKind('beam').filter((b) => b.storeyId === letztes.id).length;
    return {
      name: letztes.name,
      zonen: doc.byKind('zone').filter((z) => z.storeyId === letztes.id).length,
      moebel: doc.byKind('furniture').filter((f) => f.storeyId === letztes.id).length,
      spaltenGesamt,
      spaltenOben,
    };
  }); // [Quelle: sim-mfh.spec.ts Z.132-141]
  expect(oberstesGeschoss.zonen).toBeGreaterThan(erwartung.minZonenOberstes);
  expect(oberstesGeschoss.moebel).toBeGreaterThanOrEqual(erwartung.minMoebelOberstes);
  // Regressions-Anker Befund 1 (Tragstruktur mitstapeln, commands/design.ts
  // 'design.geschossKopieren'): existiert irgendwo im Doc eine Tragstruktur,
  // MUSS sie auch im gerade gestapelten obersten Geschoss stehen.
  if (oberstesGeschoss.spaltenGesamt > 0) {
    expect(oberstesGeschoss.spaltenOben).toBeGreaterThan(0);
  }
  // Regressions-Anker Befund 3 (Geschossleiste-Scroll, DesignWorkspace.tsx):
  await expect(page.locator(`[data-testid="storey-${oberstesGeschoss.name}"]`)).toBeVisible(); // [Quelle: sim-mfh.spec.ts Z.144]
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 11 — checksLesen
// ─────────────────────────────────────────────────────────────────────────
export interface ChecksBefund {
  text: string;
  fluchtwegLaengenM: number[];
  grenzabstandZeilen: string[];
  zonenregelZeilen: string[];
}

/**
 * Liest den Freitext des Checks-Panels (Coverage-Lücke: kein strukturiertes
 * regel/schwere-Attribut, siehe V1-TESTLAUF-BEFUNDE) und parst
 * Fluchtweg-Längen sowie Grenzabstand-/Zonenregel-Zeilen heraus.
 */
export async function checksLesen(page: Page): Promise<ChecksBefund | null> {
  const checks = page.locator('[data-testid="checks"]'); // [Quelle: apps/kosmo-orbit/src/modules/design/KennzahlenPanel.tsx Z.123 / sim-mfh.spec.ts Z.153]
  if ((await checks.count()) === 0) return null;
  const text = await checks.innerText(); // [Quelle: sim-mfh.spec.ts Z.156]
  const fluchtwegLaengenM = [...text.matchAll(/Fluchtweg[^\n]*?([\d]+[.,]\d)\s*m/g)].map(([, m]) =>
    Number(m!.replace(',', '.')),
  ); // [Quelle: sim-mfh.spec.ts Z.164]
  const grenzabstandZeilen = text.split('\n').filter((z) => z.includes('Grenzabstand')); // [Quelle: packages/kosmo-kernel/src/derive/checks.ts 'Grenzabstand']
  const zonenregelZeilen = text.split('\n').filter((z) => z.includes('Zonenregel')); // [Quelle: packages/kosmo-kernel/src/derive/checks.ts 'Zonenregel']
  return { text, fluchtwegLaengenM, grenzabstandZeilen, zonenregelZeilen };
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 12 — berechnungslistePruefen
// ─────────────────────────────────────────────────────────────────────────
/**
 * Berechnungsliste (%-Erfüllung des Raumprogramms): gebaute Typen > 0 %,
 * geplante (noch nicht gezeichnete) Typen exakt 0 % — ehrliche Lücke statt
 * Fake-Erfüllung.
 */
export async function berechnungslistePruefen(
  page: Page,
  erwartung: { gebaut: string[]; geplant: string[] },
): Promise<void> {
  await expect(page.locator('[data-testid="liste-tabelle"]')).toBeVisible(); // [Quelle: sim-mfh.spec.ts Z.185]
  for (const typ of erwartung.geplant) {
    await expect(page.locator(`[data-testid="erfuellung-${typ}"]`)).toContainText('0'); // [Quelle: sim-mfh.spec.ts Z.186]
  }
  for (const typ of erwartung.gebaut) {
    const wert = (await page.locator(`[data-testid="erfuellung-${typ}"]`).innerText()).trim(); // [Quelle: sim-mfh.spec.ts Z.187]
    expect(Number(wert)).toBeGreaterThan(0); // [Quelle: sim-mfh.spec.ts Z.188]
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 13 — kosmoFragen
// ─────────────────────────────────────────────────────────────────────────
export type KosmoErwartung =
  | { modus: 'quelle'; chipEnthaelt: string; sprungTestid: string; sprungEnthaelt: string }
  | { modus: 'vorschlag'; nachher: () => Promise<number>; erwartetWert: number };

/**
 * Kosmo (Mock-Provider) fragen — zwei Modi: `quelle` (Diff-Karte zitiert
 * das Dossier, Quellensprung, Muster sim-umbau.spec.ts 6a) und `vorschlag`
 * (Diff-Karte anwenden, Doc-Delta per `expect.poll`, Muster sim-mfh.spec.ts
 * Schritt 7). Nur im Mock-Provider bewiesene Prompts verwenden (R9).
 */
export async function kosmoFragen(page: Page, frage: string, erwartung: KosmoErwartung): Promise<void> {
  await page.fill('[data-testid="kosmo-input"]', frage); // [Quelle: sim-umbau.spec.ts Z.183 / sim-mfh.spec.ts Z.196]
  await page.click('[data-testid="kosmo-send"]'); // [Quelle: sim-umbau.spec.ts Z.184 / sim-mfh.spec.ts Z.197]

  if (erwartung.modus === 'quelle') {
    const chip = page.locator('[data-testid="quelle-chip"]').first(); // [Quelle: sim-umbau.spec.ts Z.185]
    await expect(chip).toBeVisible({ timeout: 15_000 });
    await expect(chip).toContainText(erwartung.chipEnthaelt);
    await chip.click();
    const sprung = page.locator(`[data-testid="${erwartung.sprungTestid}"]`); // [Quelle: sim-umbau.spec.ts Z.189, Testid 'quelle-sprung-dossier']
    await expect(sprung).toBeVisible();
    await expect(sprung).toContainText(erwartung.sprungEnthaelt);
  } else {
    const proposal = page.locator('[data-testid="proposal-card"]').first(); // [Quelle: apps/kosmo-orbit/src/shell/KosmoPanel.tsx Z.1130]
    await expect(proposal).toBeVisible({ timeout: 15_000 });
    await page.click('[data-testid="apply-proposal"]', { timeout: 15_000 }); // [Quelle: sim-mfh.spec.ts Z.198]
    await expect.poll(erwartung.nachher).toBe(erwartung.erwartetWert); // [Quelle: sim-mfh.spec.ts Z.199-201]
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 16 — blattPublizieren
// ─────────────────────────────────────────────────────────────────────────
export interface BlattOptionen {
  art?: 'plan' | 'section' | 'axo' | 'storey';
  thema?: string;
  umbau?: 'bestand' | 'abbruch' | 'neu';
  massstab?: string;
}

/**
 * KosmoPublish: Blatt anlegen, Ansicht platzieren, Platzierung wählen,
 * optional Thema/Umbau-Filter/Massstab setzen. Journey-spezifische
 * Inhalts-Assertions (Legende, Titel, Farben) bleiben in der Spec — dieser
 * Baustein liefert nur den generischen Aufbau + Sichtbarkeits-Beweis.
 */
export async function blattPublizieren(page: Page, opts: BlattOptionen = {}): Promise<void> {
  await page.evaluate(() => window.__kosmo.open('publish')); // [Quelle: sim-umbau.spec.ts Z.137 / sim-mfh.spec.ts Z.213]
  await page.click('[data-testid="add-sheet"]'); // [Quelle: apps/kosmo-orbit/src/modules/publish/PublishWorkspace.tsx Z.345 / sim-umbau.spec.ts Z.138]
  await page.click(`[data-testid="place-${opts.art ?? 'plan'}"]`); // [Quelle: PublishWorkspace.tsx Z.485/501/504/507 / sim-umbau.spec.ts Z.139]
  await page.locator('[data-testid^="placement-"]').first().click(); // [Quelle: PublishWorkspace.tsx Z.770 / sim-umbau.spec.ts Z.148]
  if (opts.thema !== undefined) {
    await page.selectOption('[data-testid="auswahl-thema"]', opts.thema); // [Quelle: PublishWorkspace.tsx Z.576 / sim-mfh.spec.ts Z.217]
  }
  if (opts.umbau !== undefined) {
    await page.selectOption('[data-testid="auswahl-umbau"]', opts.umbau); // [Quelle: PublishWorkspace.tsx Z.557 / sim-umbau.spec.ts Z.149]
  }
  if (opts.massstab !== undefined) {
    await page.selectOption('[data-testid="auswahl-massstab"]', opts.massstab); // [Quelle: PublishWorkspace.tsx Z.541]
  }
  await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible(); // [Quelle: PublishWorkspace.tsx Z.695 / sim-mfh.spec.ts Z.218]
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 17 — exportPruefen
// ─────────────────────────────────────────────────────────────────────────
export type ExportArt = 'export-ifc' | 'export-set' | 'export-dxf' | 'pubset-pdf';

/**
 * Export anstossen (Regel R10: nie click-dann-warten), Dateiname-Muster +
 * Mindestgrösse assertieren; liefert den lokalen Download-Pfad für
 * journey-spezifische Inhalts-Marker (z.B. `Pset_KosmoUmbau` im IFC).
 */
export async function exportPruefen(page: Page, art: ExportArt, dateinameMuster: RegExp): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click(`[data-testid="${art}"]`),
  ]); // [Quelle: sim-umbau.spec.ts Z.197-200 / sim-mfh.spec.ts Z.222-225]
  expect(download.suggestedFilename()).toMatch(dateinameMuster);
  const pfad = await download.path();
  const { statSync } = await import('node:fs');
  expect(statSync(pfad!).size).toBeGreaterThan(100);
  return pfad!;
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 18 — terrainSetzen
// ─────────────────────────────────────────────────────────────────────────
export interface TerrainProfil {
  gewachsen: { x: number; y: number; z: number }[];
  neu: { x: number; y: number; z: number }[];
}

/**
 * Setzt gewachsenes + neues Terrain und wechselt in die 3D-Ansicht. Ein
 * flaches Neu-Profil hat Bounding-Höhe 0 → nie «visible» für Playwright
 * (Regel R4): Attribute (`points`, `stroke-dasharray`) statt `toBeVisible()`.
 */
export async function terrainSetzen(page: Page, profil: TerrainProfil): Promise<void> {
  await page.evaluate((profil) => {
    const k = window.__kosmo;
    k.run('design.terrainSetzen', { typ: 'gewachsen', punkte: profil.gewachsen }); // [Quelle: sim-umbau.spec.ts Z.94-100]
    k.run('design.terrainSetzen', { typ: 'neu', punkte: profil.neu }); // [Quelle: sim-umbau.spec.ts Z.101-107]
  }, profil);
  await page.click('[data-testid="view-quad"]'); // [Quelle: sim-umbau.spec.ts Z.109]

  const gewachsen = page.locator('[data-testid="terrain-gewachsen"]').first(); // [Quelle: sim-umbau.spec.ts Z.110]
  await expect(gewachsen).toBeVisible();
  await expect(gewachsen).toHaveAttribute('stroke-dasharray', '200 120'); // [Quelle: sim-umbau.spec.ts Z.112]

  const neu = page.locator('[data-testid="terrain-neu"]').first(); // [Quelle: sim-umbau.spec.ts Z.114]
  await expect(neu).toHaveAttribute('points', /,0 .*,0$/); // [Quelle: sim-umbau.spec.ts Z.115]
  await expect(neu).not.toHaveAttribute('stroke-dasharray', /.*/); // [Quelle: sim-umbau.spec.ts Z.116]
}
