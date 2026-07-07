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
 * `sim-mfh.spec.ts`) extrahierbaren Bausteine 1–4, 9–13, 16–18. H1b ergänzt
 * die Bridge-/KI-Bausteine 14–15 (`renderUeberBridge`, `bridgeVerfuegbar`)
 * und friert danach die API ein (ab H2 nur noch append-only — neue Bausteine
 * werden nur ANGEHÄNGT, bestehende nie geändert). H2a ergänzt Baustein 5
 * (Dach) + 6 (Treppe, erster Nutzer `sim-efh.spec.ts`), H2b Baustein 7
 * (`tragwerkAusRaster`) + 8 (`fassade`, erster Nutzer `sim-hochhaus.spec.ts`).
 * Damit sind die Bausteine 1–18 alle implementiert.
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
    // [Quelle: apps/kosmo-orbit/src/modules/design/Viewport3D.tsx Z.1161-1180]
    __kosmoViewport: {
      renderOnce: () => void;
      resume: () => void;
      setCamera: (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => void;
      getCamera: () => { px: number; py: number; pz: number; tx: number; ty: number; tz: number };
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
        // Mehrhöhen-Bonus optional durchreichen (Fable-Review-1, Auflage 3);
        // exactOptionalPropertyTypes: nur setzen, wenn beide Werte da sind.
        ...(parzelle.mehrHoehenAb !== undefined ? { mehrHoehenAb: parzelle.mehrHoehenAb } : {}),
        ...(parzelle.mehrHoehenAnteil !== undefined ? { mehrHoehenAnteil: parzelle.mehrHoehenAnteil } : {}),
      }); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.baugrenzeSetzen' Z.1027-1028]
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

    // Regel R3 (Fable-Review-1, Auflage 1): das Checks-Panel rendert nach dem
    // Command asynchron — retrykendes `toContainText` statt one-shot `innerText`.
    await expect(page.locator('[data-testid="checks"]')).toContainText(
      `Zonenregel «${szenario.zonenRegel.name}»`,
    ); // [Quelle: KennzahlenPanel.tsx Z.123 / packages/kosmo-kernel/src/derive/checks.ts Z.356]

    await page.evaluate((id) => window.__kosmo.run('design.loeschen', { entityId: id }), probeId); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.loeschen']
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 3 — phaseSchalten
// ─────────────────────────────────────────────────────────────────────────
/**
 * Liefert eine STABILE Pfadzahl des Plan-SVG (Fable-Review-1, Auflage 4):
 * der Plan rendert nach einem Phasenwechsel asynchron neu — ein one-shot
 * `count()` direkt nach dem Doc-Poll kann einen nachlaufenden Render
 * verpassen und die Monotonie-Zahl verfälschen. Wir warten auf zwei gleiche
 * Messungen in Folge (> 0), bevor wir die Zahl herausgeben.
 */
async function stabilePfadzahl(page: Page): Promise<number> {
  const pfade = page.locator('[data-testid="planview"] path'); // [Quelle: apps/kosmo-orbit/src/modules/design/PlanView.tsx Z.195]
  let vorige = -1;
  await expect
    .poll(
      async () => {
        const c = await pfade.count();
        const stabil = c > 0 && c === vorige;
        vorige = c;
        return stabil;
      },
      { timeout: 10_000, message: 'Plan-SVG-Pfadzahl stabilisiert sich nicht' },
    )
    .toBe(true);
  return vorige;
}

/**
 * Schaltet die SIA-Phase; liefert die (stabilisierte) Pfadzahl im Plan-SVG
 * danach zurück — der Aufrufer prüft die Monotonie
 * `werkplan ≥ bauprojekt ≥ vorprojekt` am SELBEN Modellstand (Regel R1: nie
 * fixe Pfadzahlen).
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
  return stabilePfadzahl(page);
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
// Baustein 5 — dachSetzen (H2a)
// ─────────────────────────────────────────────────────────────────────────
/**
 * Erstellt ein Dach (`design.dachErstellen` — V1 kennt nur die Walmdach-Form,
 * kein eigenes Satteldach-Command; Leitideen, die ein «Satteldach» nennen,
 * werden darum bewusst mit dem Walmdach-Command modelliert, siehe H-Eintrag
 * in SIM-BEFUNDE) über dem gegebenen Grundriss. Assert: `byKind('roof')`-
 * Delta exakt 1 UND das Dach steht sichtbar in der 3D-Szene (`view-quad` →
 * `__kosmoViewport.renderOnce()` läuft ohne Fehler, der Viewport-Canvas
 * bleibt sichtbar). BEWUSST KEINE 2D-Plansymbol-Assertion — PlanView.tsx
 * rendert für `roof` keine eigene Grundriss-Projektion (bekannte V2-Lücke,
 * in SIM-BEFUNDE referenziert, nicht «rot getestet», Regel 1.4.2).
 */
export interface DachParams {
  storeyId: string;
  outline: Punkt2[];
  pitch?: number;
  overhang?: number;
}

export async function dachSetzen(page: Page, params: DachParams): Promise<string> {
  const vorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('roof').length);
  const dachId = await page.evaluate(
    (p) => window.__kosmo.run('design.dachErstellen', p).patches[0]!.id,
    params,
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.dachErstellen' Z.365-366]
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('roof').length))
    .toBe(vorher + 1);

  await page.click('[data-testid="view-quad"]'); // [Quelle: apps/kosmo-orbit/src/modules/design/DesignWorkspace.tsx Z.859-871 view-${id}]
  await page.evaluate(() => window.__kosmoViewport.renderOnce()); // [Quelle: Viewport3D.tsx Z.1161-1166 / e2e/module.spec.ts Z.1117]
  await expect(page.locator('[data-testid="viewport3d"]')).toBeVisible(); // [Quelle: Viewport3D.tsx Z.1259]
  await expect(page.locator('[data-testid="viewport3d"] canvas')).toBeVisible(); // Dach-Mesh rendert in genau diesem WebGL-Canvas (Viewport3D.tsx Z.260 mount.appendChild)
  return dachId;
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 6 — treppeSetzen (H2a)
// ─────────────────────────────────────────────────────────────────────────
/**
 * Erstellt eine Treppe (`design.treppeErstellen`). Assert `byKind('stair')`-
 * Delta exakt 1 UND mindestens ein Treppensymbol im Plan-SVG DES Geschosses,
 * dem die Treppe gehört (Regel R1: nie eine fixe Zahl, `count() > 0` —
 * die Lauf-/Podest-Regionen aus derive/plan.ts tragen die Klasse `treppe`
 * je Lauf-/Podestrechteck, nicht eine feste Anzahl). Setzt voraus, dass das
 * Ziel-Geschoss (params.storeyId) beim Aufruf bereits aktiv ist — sonst
 * zeigt der Plan ein anderes Geschoss und die Assertion schlägt (korrekt)
 * fehl.
 */
export interface TreppeParams {
  storeyId: string;
  a: Punkt2;
  b: Punkt2;
  width?: number;
  form?: 'gerade' | 'podest' | 'u' | 'l';
  ecke?: Punkt2;
}

export async function treppeSetzen(page: Page, params: TreppeParams): Promise<string> {
  const vorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('stair').length);
  const treppeId = await page.evaluate(
    (p) => window.__kosmo.run('design.treppeErstellen', p).patches[0]!.id,
    params,
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.treppeErstellen' Z.935-936]
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('stair').length))
    .toBe(vorher + 1);

  await page.click('[data-testid="view-2d"]'); // [Quelle: DesignWorkspace.tsx Z.859-871 view-${id} / bausteine.ts Baustein 1]
  const treppenSymbole = page.locator('[data-testid="planview"] path.treppe'); // [Quelle: packages/kosmo-kernel/src/derive/plan.ts Z.465-511 classes ['projection','treppe',...] / PlanView.tsx Z.373-386 className={r.classes.join(' ')}]
  await expect.poll(() => treppenSymbole.count()).toBeGreaterThan(0);
  return treppeId;
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 7 — tragwerkAusRaster (H2b)
// ─────────────────────────────────────────────────────────────────────────
export interface RasterParams {
  /** Hauptachs-Abstand in mm (SZENARIEN.hochhaus.geometrie.raster). */
  raster: number;
  /** Anzahl Hauptachsen (1…N). */
  anzahl: number;
  /** Anzahl Querachsen (A…) — bewusst > 26 (Regressions-Anker Befund 2). */
  querAnzahl: number;
  /** Querachs-Abstand in mm. */
  querAchsmass: number;
}

/**
 * Stützenraster (`design.rasterSetzen`) + eine Stütze auf jede Kreuzung
 * (`design.stuetzenAusRaster`) — das RasterPanel selbst hat für die
 * Querachsen-Eingabe kein eigenes Testid (Coverage-Lücke H-5, siehe
 * SIM-BEFUNDE): dieser Baustein bleibt darum command-getrieben und macht das
 * Ergebnis über den `achsen-toggle`-Knopf im Plan sichtbar. Assertet:
 * Stützenzahl = Achsen-Produkt (jede Haupt×Quer-Kreuzung erhält GENAU eine
 * Stütze, `design.stuetzenAusRaster` schneidet alle typ==='haupt'-Achsenpaare
 * paarweise — parallele Paare liefern keinen Schnittpunkt) UND die
 * Achslabels sind bijektiv — Regressions-Anker Befund 2: die 27. Querachse
 * (0-indexiert j=26) MUSS «AA» heissen (bijektive Basis-26-Beschriftung
 * `querLabel()` in `design.rasterSetzen`, statt des früheren naiven `j % 26`,
 * das Achse 1 und Achse 27 beide «A» nennen liess).
 */
export async function tragwerkAusRaster(page: Page, raster: RasterParams): Promise<void> {
  const storeyId = await page.evaluate(() => window.__kosmo.state().activeStoreyId);
  await page.evaluate(
    ({ storeyId, raster }) => {
      const k = window.__kosmo;
      k.run('design.rasterSetzen', {
        storeyId,
        achsmass: raster.raster,
        anzahl: raster.anzahl,
        querAchsmass: raster.querAchsmass,
        querAnzahl: raster.querAnzahl,
      }); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.rasterSetzen' Z.1756-1824]
      k.run('design.stuetzenAusRaster', { storeyId }); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.stuetzenAusRaster' Z.798-858]
    },
    { storeyId, raster },
  );

  // Stützenzahl = Achsen-Produkt (Regel R3: Doc pollen statt DOM).
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('column').length))
    .toBe(raster.anzahl * raster.querAnzahl);

  // Achslabels bijektiv (Regressions-Anker Befund 2): sichtbar über den
  // Achsen-Knopf im Plan, ausgelesen über die `grid-achse`-Texte.
  await page.click('[data-testid="achsen-toggle"]'); // [Quelle: apps/kosmo-orbit/src/modules/design/PlanView.tsx Z.180-192]
  const labelTexte = page.locator('[data-testid="grid-achse"] text'); // [Quelle: PlanView.tsx Z.530,545-553]
  await expect(labelTexte.first()).toBeVisible();
  const labels = await labelTexte.allTextContents();
  const zaehlung = new Map<string, number>();
  for (const l of labels) zaehlung.set(l, (zaehlung.get(l) ?? 0) + 1);
  // Jede Achse trägt ihr Label an BEIDEN Enden (PlanView.tsx Z.540-556) —
  // bijektiv heisst: jedes Label kommt aus GENAU EINER Achse, also genau 2×.
  for (const [label, n] of zaehlung) {
    expect(n, `Achslabel «${label}» erscheint nicht genau 2× (Achsen-Kollision?)`).toBe(2);
  }
  expect(zaehlung.size).toBe(raster.anzahl + raster.querAnzahl);
  expect(zaehlung.get('AA'), 'Achse 27 (Querachse j=26) muss «AA» heissen').toBe(2);
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 8 — fassade (H2b)
// ─────────────────────────────────────────────────────────────────────────
export type Fassadenrichtung = 'sued' | 'nord' | 'west' | 'ost';

export interface FassadenElement {
  x: number;
  y: number;
  b: number;
  h: number;
  typ: 'fenster' | 'paneel';
}

export interface FassadenModulDef {
  name: string;
  breite: number;
  hoehe: number;
  elemente: FassadenElement[];
}

export interface FassadenParams {
  storeyId: string;
  /** Volumenkörper (`design.volumenErstellen`), dessen Umriss-Kanten den
   *  Himmelsrichtungen zugewiesen werden. */
  massId: string;
  /** Umriss-Kante (1-basiert) je Himmelsrichtung — aus der Reihenfolge der
   *  MassBody-outline abgeleitet (Rechteck im Uhrzeigersinn Süd→Ost→Nord→West
   *  ergibt Kanten 1..4 — dieselbe Bbox-Konvention wie
   *  `kantenRichtung()`/`richtungsModule()` in
   *  `packages/kosmo-kernel/src/derive/fassadenmodule.ts` Z.109-152). */
  kanten: Partial<Record<Fassadenrichtung, number>>;
  /** Modul je Himmelsrichtung; mind. Süd + Nord für den Regressions-Anker 154. */
  module: Partial<Record<Fassadenrichtung, FassadenModulDef>>;
  /** Default-Modul für `design.fensterAusModulen` (modul=), i.d.R. das Süd-Modul. */
  vorgabe: string;
  /** Aussenwand-IDs je Himmelsrichtung (aus `waendeZeichnen`, Baustein 4) —
   *  für die seitenrichtige Auswertung der gestanzten Öffnungen. */
  waende: Partial<Record<Fassadenrichtung, string[]>>;
}

/**
 * Fassadenmodule je Himmelsrichtung speichern (`design.modulSpeichern`), dem
 * Volumenkörper zuweisen (`design.fassadenModulZuweisen`) und Fenster in die
 * echten Aussenwände stanzen (`design.fensterAusModulen`). Assertet:
 * Öffnungszahl > 0 UND seitenrichtige Fensterstanzung — Regressions-Anker
 * ROADMAP 154 (die Fassaden-Zuweisung am Volumenkörper war früher von den
 * echten Aussenwänden entkoppelt, `richtungsModule()` verbindet beide über
 * dieselbe Bbox-Richtungslogik): Süd- und Nordwand tragen NACHWEISLICH
 * unterschiedliche Fensterbreiten.
 */
export async function fassade(page: Page, p: FassadenParams): Promise<void> {
  await page.evaluate((module) => {
    const k = window.__kosmo;
    const gespeichert = new Set<string>();
    (['sued', 'nord', 'west', 'ost'] as const).forEach((richtung) => {
      const def = module[richtung];
      if (!def || gespeichert.has(def.name)) return;
      gespeichert.add(def.name);
      k.run('design.modulSpeichern', {
        name: def.name,
        breite: def.breite,
        hoehe: def.hoehe,
        elemente: def.elemente,
      }); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.modulSpeichern' Z.1273-1307]
    });
  }, p.module);

  await page.evaluate(
    ({ massId, kanten, module }) => {
      const k = window.__kosmo;
      (['sued', 'nord', 'west', 'ost'] as const).forEach((richtung) => {
        const kante = kanten[richtung];
        const def = module[richtung];
        if (kante === undefined || !def) return;
        k.run('design.fassadenModulZuweisen', { massId, kante, modul: def.name }); // [Quelle: design.ts 'design.fassadenModulZuweisen' Z.1245-1271]
      });
    },
    { massId: p.massId, kanten: p.kanten, module: p.module },
  );

  await page.evaluate(
    ({ storeyId, vorgabe }) => window.__kosmo.run('design.fensterAusModulen', { storeyId, modul: vorgabe }),
    { storeyId: p.storeyId, vorgabe: p.vorgabe },
  ); // [Quelle: packages/kosmo-kernel/src/commands/design.ts 'design.fensterAusModulen' Z.1109-1181]

  const stand = await page.evaluate((waende) => {
    const doc = window.__kosmo.state().doc;
    const fenster = doc
      .byKind('opening')
      .filter((o) => (o as unknown as { openingType: string }).openingType === 'fenster');
    const breitenJeRichtung: Record<string, number[]> = {};
    for (const [richtung, ids] of Object.entries(waende)) {
      breitenJeRichtung[richtung] = fenster
        .filter((o) => (ids as string[]).includes((o as unknown as { wallId: string }).wallId))
        .map((o) => (o as unknown as { width: number }).width)
        .sort((a, b) => a - b);
    }
    return { gesamt: fenster.length, breitenJeRichtung };
  }, p.waende);

  expect(stand.gesamt).toBeGreaterThan(0);
  const sued = stand.breitenJeRichtung['sued'] ?? [];
  const nord = stand.breitenJeRichtung['nord'] ?? [];
  expect(sued.length, 'Südwand hat keine gestanzten Fenster').toBeGreaterThan(0);
  expect(nord.length, 'Nordwand hat keine gestanzten Fenster').toBeGreaterThan(0);
  // Regressions-Anker ROADMAP 154: seitenrichtige Fensterstanzung — Süd- und
  // Nordmodul unterscheiden sich NACHWEISLICH an den gestanzten Öffnungen.
  expect(JSON.stringify(sued)).not.toBe(JSON.stringify(nord));
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 15 — bridgeVerfuegbar (H1b)
// ─────────────────────────────────────────────────────────────────────────
/**
 * Hinweistext bei toter Bridge (Regel R7) — kein kryptischer Timeout mitten
 * in der Journey, sondern eine klare Anleitung.
 */
export const BRIDGE_FEHLT_HINWEIS =
  'HomeStation-Bridge :8600 nicht erreichbar — mit `--fake-worker` starten ' +
  '(siehe CLAUDE.md): setsid python3 tools/homestation-bridge/kosmo_bridge/main.py ' +
  '--fake-worker --port 8600';

/**
 * Health-Probe der Fake-Bridge aus dem NODE-Kontext (nicht `page`) — als
 * `beforeAll`/Segment-Gate. `true` nur bei `{ ok: true }` von `/health`.
 * Der Aufrufer entscheidet: ganze Bridge-Journey `test.skip(!ok,
 * BRIDGE_FEHLT_HINWEIS)` oder ein einzelnes Segment ehrlich überspringen
 * (mit `console.warn(BRIDGE_FEHLT_HINWEIS)` — nie stiller Pass, Regel R7).
 */
export async function bridgeVerfuegbar(): Promise<boolean> {
  try {
    const res = await fetch('http://127.0.0.1:8600/health'); // [Quelle: tools/homestation-bridge/kosmo_bridge/main.py '/health']
    if (!res.ok) return false;
    const daten = (await res.json()) as { ok?: boolean };
    return daten.ok === true;
  } catch {
    return false; // Verbindung verweigert = Bridge läuft nicht
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Baustein 14 — renderUeberBridge (H1b)
// ─────────────────────────────────────────────────────────────────────────
/**
 * KosmoVis-Render-Kette über die (Fake-)Bridge, Muster `visgraph.spec.ts`:
 * «Drei Stimmungen» → Render ausführen → Bild am Node → Blatt-Node verbinden
 * (spät erzeugte Node mit `vis.nodeSchieben` ins Sichtfeld, Regel R5) →
 * «Aufs Blatt» → Assert: das Bild liegt auf einem `sheet`. Prüft DEN WEG
 * durch die Bridge, nicht die Bildqualität (H3). Setzt eine laufende Bridge
 * voraus — Aufrufer gatet mit `bridgeVerfuegbar()` (Regel R7).
 */
export async function renderUeberBridge(page: Page): Promise<void> {
  await page.evaluate(() => window.__kosmo.open('vis')); // [Quelle: visgraph.spec.ts Z.29 (module-vis) / App.tsx __kosmo.open]
  const bilderVorher = await page.evaluate(
    () => window.__kosmo.state().doc.byKind('sheet').reduce((s, sh) => s + ((sh.bilder as unknown[])?.length ?? 0), 0),
  ); // [Quelle: visgraph.spec.ts Z.55-57]

  await page.click('[data-testid="drei-stimmungen"]'); // [Quelle: visgraph.spec.ts Z.30]
  await expect(page.locator('[data-testid="vis-node-render"]')).toHaveCount(3); // [Quelle: visgraph.spec.ts Z.33]

  await page.locator('[data-testid="render-ausfuehren"]').first().click(); // [Quelle: visgraph.spec.ts Z.38]
  await expect(page.locator('[data-testid="render-status"]').first()).not.toHaveText('bereit'); // [Quelle: visgraph.spec.ts Z.39]
  await expect(page.locator('[data-testid="render-bild"]').first()).toBeVisible({ timeout: 25_000 }); // [Quelle: visgraph.spec.ts Z.40]

  await page.selectOption('[data-testid="node-hinzu"]', 'blatt'); // [Quelle: visgraph.spec.ts Z.43]
  await page.evaluate(() => {
    const k = window.__kosmo;
    const graph = k.state().doc.byKind('visgraph')[0] as unknown as {
      id: string;
      nodes: { id: string; typ: string }[];
    };
    const render = graph.nodes.find((n) => n.typ === 'render')!;
    const blatt = graph.nodes.find((n) => n.typ === 'blatt')!;
    k.run('vis.verbinden', { graphId: graph.id, from: render.id, fromPort: 'bild', to: blatt.id, toPort: 'bild' });
    k.run('vis.nodeSchieben', { graphId: graph.id, nodeId: blatt.id, x: 620, y: 320 }); // ins Sichtfeld (Regel R5)
  }); // [Quelle: visgraph.spec.ts Z.44-52]
  await page.locator('[data-testid="blatt-ablegen"]').click(); // [Quelle: visgraph.spec.ts Z.53]
  await expect(page.locator('[data-testid="meldung-erfolg"]')).toContainText('Render liegt auf', { timeout: 15_000 }); // [Quelle: visgraph.spec.ts Z.54]

  await expect
    .poll(() =>
      page.evaluate(
        () => window.__kosmo.state().doc.byKind('sheet').reduce((s, sh) => s + ((sh.bilder as unknown[])?.length ?? 0), 0),
      ),
    )
    .toBeGreaterThan(bilderVorher); // [Quelle: visgraph.spec.ts Z.55-58]
}

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
  // Regel R4 (Fable-Review-1-Nachzug / SIM-BEFUNDE H-12): ein Terrain-Profil,
  // das nur entlang der schnitt-senkrechten Achse variiert (EFH: gewachsen
  // 15 % Süd → in «Ansicht Süd» eine deckungsgleiche, 0 px breite Linie),
  // ist für Playwright nie «visible» — auf `toBeAttached` + Attribut prüfen,
  // nicht `toBeVisible`. Für nicht-degenerierte Profile (Umbau) bleibt das
  // Element ohnehin attached; die Dash-Signatur ist die eigentliche Aussage.
  await expect(gewachsen).toBeAttached();
  await expect(gewachsen).toHaveAttribute('stroke-dasharray', '200 120'); // [Quelle: sim-umbau.spec.ts Z.112]

  const neu = page.locator('[data-testid="terrain-neu"]').first(); // [Quelle: sim-umbau.spec.ts Z.114]
  await expect(neu).not.toHaveAttribute('stroke-dasharray', /.*/); // neues Terrain durchgezogen (kein gewachsen-Dash) [Quelle: sim-umbau.spec.ts Z.116]
  // Fable-Review-1, Auflage 2: die flache-Profil-Assertion (`,0 …,0$`) gilt
  // NUR für ein tatsächlich flaches Neu-Profil (jedes z===0, z.B. Umbau). Ein
  // terrassiertes Neu-Terrain (EFH-Hangsprung) hätte Nicht-null-Höhen → dort
  // nur das generische Attribut prüfen (Punkte vorhanden), Regel R4.
  const neuFlach = profil.neu.every((p) => p.z === 0);
  if (neuFlach) {
    await expect(neu).toHaveAttribute('points', /,0 .*,0$/); // [Quelle: sim-umbau.spec.ts Z.115]
  } else {
    await expect(neu).toHaveAttribute('points', /\d/); // mind. eine Koordinate — kein leeres Profil
  }
}
