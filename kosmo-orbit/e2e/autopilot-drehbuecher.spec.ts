import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * v0.8.5 PB2 «Autopilot-Drehbücher + Eval» (`docs/V085-SPEZ.md` §3 E4,
 * C-11/C-12) — C-11-BEWEIS: lädt die Drehbücher `grundriss-rohbau` und
 * `vis-demolauf` (`wissen/training/eval/kosmo-laufplaene/*.json`) je über
 * `window.__kosmoLauf.starte(plan)` (Muster `e2e/autopilot-kern.spec.ts` —
 * dieselbe Naht, KEIN UI-Klick ersetzt den Auslöser, kein Auto-Start/C-10)
 * und beweist das ECHTE Endergebnis im Doc.
 *
 * PLATZHALTER-AUFLÖSUNG (s. `wissen/training/eval/kosmo-laufplaene/
 * README.md` «Platzhalter-Konvention»): `LaufPlan`/`LaufRunner` (PA3-
 * Bestand, für PB2 GESPERRT — nur nutzen) sind bewusst rein statisch, ohne
 * Interpolation zwischen Schritten; der Kernel vergibt jede Entity-ID aber
 * erst zur Laufzeit, zufällig (`model/ids.ts#newId`). Die Drehbücher
 * referenzieren deshalb IDs, die ein früherer Schritt DESSELBEN Drehbuchs
 * erst erzeugt, über `@ref:<kind>:<name>`-Platzhalter. Ein einzelner
 * `starte()`-Aufruf kann diese nicht auflösen (die Parameter ALLER Schritte
 * stehen vor dem Start fest) — darum fährt dieser Beweis jedes Drehbuch in
 * PHASEN: nach jeder Phase (bis `status: 'fertig'`) lesen wir den ECHTEN
 * Doc-Zustand (`window.__kosmo.state().doc`), lösen die Platzhalter der
 * NÄCHSTEN Phase auf und rufen `starte()` erneut — jede einzelne Phase geht
 * dabei unverändert über `window.__kosmoLauf.starte(...)` → `LaufRunner` →
 * `runCommand` (Sanktion 3, V085-SPEZ §6), NIE an `runCommand` vorbei. Diese
 * Phasenbildung lebt AUSSCHLIESSLICH hier im Test (kein Runner-/Kernel-
 * Umbau) — exakt die Stelle, an der ein künftiger echter Kosmo-Dialog
 * ohnehin stünde (er sieht den Doc-Zustand und verfasst den nächsten
 * Teil-Plan mit bereits aufgelösten IDs).
 */

// `__dirname` statt `import.meta.url` — Playwright transformiert `.spec.ts`
// hier zu CommonJS (kein `"type": "module"` in `package.json`), Muster
// `e2e/homestation-kette.spec.ts`.
const LAUFPLAENE_DIR = resolve(__dirname, '../../wissen/training/eval/kosmo-laufplaene');
const BRIDGE = 'http://localhost:8600';

interface RoherSchritt {
  commandId: string;
  params: unknown;
  begruendung: string;
}
interface RohesDrehbuch {
  titel: string;
  schritte: RoherSchritt[];
}

function ladeDrehbuch(datei: string): RohesDrehbuch {
  const roh = JSON.parse(readFileSync(resolve(LAUFPLAENE_DIR, datei), 'utf8')) as RohesDrehbuch & { beschreibung?: string };
  return { titel: roh.titel, schritte: roh.schritte };
}

async function bridgeVerfuegbar(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE}/health`);
    if (!res.ok) return false;
    const daten = (await res.json()) as { ok?: boolean };
    return daten.ok === true;
  } catch {
    return false;
  }
}

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        doc: {
          byKind: (k: string) => Record<string, unknown>[];
          settings: { visRenderAuftrag?: Record<string, unknown> | null };
        };
      };
    };
    __kosmoLauf: {
      starte: (plan: { titel: string; schritte: RoherSchritt[] }) => void;
      abbrechen: () => void;
      zustand: () => {
        plan: { titel: string; schritte: unknown[] } | null;
        schritte: { status: string; ergebnis?: string; fehler?: string }[];
        status: string;
      };
    };
    __pb2LoeseWertAuf: (wert: unknown, doc: unknown) => unknown;
  }
}

/** Installiert die Platzhalter-Auflösung EINMAL auf `window` — spätere
 * `page.evaluate()`-Aufrufe (je Phase) rufen sie darüber auf (Playwright
 * serialisiert Funktionen pro `evaluate()`-Aufruf einzeln, ein `window`-
 * Anschluss teilt sie über mehrere Aufrufe hinweg, Muster `lauf-runtime.ts`s
 * `__kosmoLauf`-Testhook). */
async function installiereAufloeser(page: Page): Promise<void> {
  await page.evaluate(() => {
    function loeseWertAuf(wert: unknown, doc: { byKind: (k: string) => Record<string, unknown>[] }): unknown {
      if (typeof wert === 'string' && wert.startsWith('@ref:')) {
        const rumpf = wert.slice('@ref:'.length);
        const teile = rumpf.split(':');
        const kindRoh = teile[0]!;
        if (kindRoh === 'node') {
          const graphName = teile[1]!;
          const typ = teile[2]!;
          const graph = doc.byKind('visgraph').find((g) => g.name === graphName) as
            | { nodes?: { id: string; typ: string }[] }
            | undefined;
          if (!graph) throw new Error(`@ref:node — Graph «${graphName}» nicht gefunden`);
          const node = (graph.nodes ?? []).find((n) => n.typ === typ);
          if (!node) throw new Error(`@ref:node — Node-Typ «${typ}» nicht im Graphen «${graphName}»`);
          return node.id;
        }
        const kindKarte: Record<string, string> = { storey: 'storey', aufbau: 'assembly', sheet: 'sheet', graph: 'visgraph' };
        const kind = kindKarte[kindRoh];
        const name = teile.slice(1).join(':');
        if (!kind || !name) throw new Error(`Unbekannter/unvollständiger Platzhalter: ${wert}`);
        const treffer = doc.byKind(kind).filter((e) => e.name === name);
        if (treffer.length !== 1) throw new Error(`@ref:${kind}:${name} — ${treffer.length} Treffer statt genau 1`);
        return treffer[0]!.id;
      }
      if (Array.isArray(wert)) return wert.map((w) => loeseWertAuf(w, doc));
      if (wert !== null && typeof wert === 'object') {
        return Object.fromEntries(Object.entries(wert as Record<string, unknown>).map(([k, v]) => [k, loeseWertAuf(v, doc)]));
      }
      return wert;
    }
    window.__pb2LoeseWertAuf = loeseWertAuf as never;
  });
}

/** Baut eine Phase (Teilmenge der Schritte eines Drehbuchs, Platzhalter
 * gegen den AKTUELLEN Doc-Zustand aufgelöst) und startet sie über den
 * ECHTEN `window.__kosmoLauf.starte()`-Weg — wartet bis `status: 'fertig'`. */
async function fahrePhase(page: Page, titel: string, schritte: RoherSchritt[]): Promise<void> {
  await page.evaluate(
    ({ titel, schritte }) => {
      const doc = window.__kosmo.state().doc;
      const aufgeloest = schritte.map((s) => ({
        commandId: s.commandId,
        params: window.__pb2LoeseWertAuf(s.params, doc),
        begruendung: s.begruendung,
      }));
      window.__kosmoLauf.starte({ titel, schritte: aufgeloest });
    },
    { titel, schritte },
  );
  await expect
    .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), {
      timeout: 20_000,
      message: `Phase «${titel}» kam nicht auf «fertig»`,
    })
    .toBe('fertig');
}

async function frischOhnePanel(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
}

async function oeffnePanel(page: Page): Promise<void> {
  await page.dblclick('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();
}

test('C-11: Drehbuch «grundriss-rohbau» als LaufPlan — Geschoss + 4 Wände + Zone im Doc', async ({ page }) => {
  test.setTimeout(60_000);
  const drehbuch = ladeDrehbuch('grundriss-rohbau.json');
  // Phasengrenze nach den ID-erzeugenden Schritten (Geschoss+Aufbau) —
  // Schritte 2-6 (4 Wände + Zone) referenzieren beide über @ref.
  const [vorbereitung, hauptlauf] = [drehbuch.schritte.slice(0, 2), drehbuch.schritte.slice(2)];

  await frischOhnePanel(page);
  await oeffnePanel(page);
  await installiereAufloeser(page);

  await fahrePhase(page, `${drehbuch.titel} — Vorbereitung`, vorbereitung!);
  await fahrePhase(page, `${drehbuch.titel} — Hauptlauf`, hauptlauf!);

  // Schrittliste FERTIG (letzte Phase — 4 Wände + Zone, alle 'ok').
  const root = page.locator('[data-testid="lauf-plan-root"]');
  await expect(root).toBeVisible();
  for (let i = 0; i < hauptlauf!.length; i++) {
    await expect(page.locator(`[data-testid="lauf-schritt-${i}"]`)).toHaveClass(/lauf-schritt--ok/);
  }
  // Viewport-Screenshot statt `fullPage: true` — der Inhalt passt ohnehin in
  // den 1400×900-Viewport (kein Scroll), und ein fullPage-Capture (eigener
  // CDP-Resize-Umweg) erwies sich hier als eine zusätzliche, unnötige
  // Race-Quelle gegen das fixierte Panel (beobachtet: leeres Panel im Bild
  // trotz vorher grün bestätigter Sichtbarkeit/Klassen).
  await page.screenshot({ path: 'e2e-results/pb2-grundriss-rohbau-schrittliste.png' });

  // Endergebnis im Doc: 1 Geschoss, 4 Wände, 1 Zone — derselbe runCommand-
  // Weg wie ein Handgriff des Architekten (Sanktion 3, V085-SPEZ §6).
  const zustand = await page.evaluate(() => {
    const doc = window.__kosmo.state().doc;
    return {
      storeys: doc.byKind('storey').length,
      waende: doc.byKind('wall').length,
      zonen: doc.byKind('zone').length,
      zoneName: (doc.byKind('zone')[0] as { name?: string } | undefined)?.name,
    };
  });
  expect(zustand.storeys).toBe(1);
  expect(zustand.waende).toBe(4);
  expect(zustand.zonen).toBe(1);
  expect(zustand.zoneName).toBe('Wohnen Rohbau');
});

test('C-11: Drehbuch «vis-demolauf» als LaufPlan — gleiches Endergebnis wie e2e/vis-demolauf.spec.ts', async ({ page }) => {
  test.setTimeout(150_000);
  const drehbuch = ladeDrehbuch('vis-demolauf.json');
  // Phase 1: Graph (Schritt 0). Phase 2: die 6 Nodes (Schritte 1-6, brauchen
  // nur graphId). Phase 3: Verbinden ×5 + Parametrieren + Render (Schritte
  // 7-13, brauchen graphId + die in Phase 2 erzeugten Node-IDs).
  const phase1 = drehbuch.schritte.slice(0, 1);
  const phase2 = drehbuch.schritte.slice(1, 7);
  const phase3 = drehbuch.schritte.slice(7);
  expect(phase1.length + phase2.length + phase3.length).toBe(drehbuch.schritte.length);

  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.evaluate((bridge) => localStorage.setItem('kosmo.bridge', bridge), BRIDGE);
  await page.click('[data-testid="module-vis"]');

  // Kosmo-Panel offen (Muster `e2e/autopilot-kern.spec.ts`) — `lauf-plan-
  // root`/`lauf-schritt-i` rendern nur INNERHALB des Panels; app-weite
  // Einzel-Instanz (`kosmo-symbol`), unabhängig vom aktiven Modul (hier vis).
  await page.dblclick('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();

  // Deterministische Bridge-Bereitschaft VOR dem Render-Auftrag (Muster
  // `e2e/vis-demolauf.spec.ts`).
  await expect
    .poll(() => bridgeVerfuegbar(), {
      timeout: 20_000,
      message: 'Fake-Worker-Bridge :8600 antwortet nicht auf /health — mit --fake starten (Regel 5 der PB2-Dispatch-Disziplin).',
    })
    .toBe(true);

  await installiereAufloeser(page);
  await fahrePhase(page, `${drehbuch.titel} — Graph`, phase1);
  await fahrePhase(page, `${drehbuch.titel} — Nodes`, phase2);
  await fahrePhase(page, `${drehbuch.titel} — Verbinden + Stimmung + Render-Auftrag`, phase3);

  // Schrittliste FERTIG (letzte Phase).
  const root = page.locator('[data-testid="lauf-plan-root"]');
  await expect(root).toBeVisible();
  for (let i = 0; i < phase3.length; i++) {
    await expect(page.locator(`[data-testid="lauf-schritt-${i}"]`)).toHaveClass(/lauf-schritt--ok/);
  }

  // Beweis 1: der Render-Auftrag steht ehrlich im Doc — genau wie
  // `e2e/vis-demolauf.spec.ts` zuerst den SettingsPatch prüft, bevor es die
  // Job-Erwartung stellt.
  const wunsch = await page.evaluate(() => window.__kosmo.state().doc.settings.visRenderAuftrag);
  expect(wunsch).not.toBeNull();
  expect(wunsch?.kameraWahl).toBe('auto');
  expect(wunsch?.stimmungPreset).toBe('abend');
  expect(wunsch?.backbone).toBe('flux2-klein');

  // Beweis 2: derselbe Fake-Job-Weg wie im Original-Demolauf — der
  // Executor-Watcher in `VisWorkspace.tsx` beobachtet `visRenderAuftrag` und
  // stösst den Fake-Bridge-Job an, ganz ohne UI-Klick auf «Ausführen».
  const status = page.locator('[data-testid="render-status"]').first();
  await expect
    .poll(async () => (await status.textContent()) ?? '', {
      timeout: 60_000,
      message: 'Render-Job kam nicht in einen Endzustand (fertig/fehler)',
    })
    .toMatch(/^(fertig|fehler)$/);
  expect(await status.textContent(), 'Fake-Render-Job endete mit Fehler statt fertig').toBe('fertig');

  const bild = page.locator('[data-testid="render-bild"]').first();
  await expect(bild).toBeVisible({ timeout: 10_000 });
  const bildBreite = await bild.evaluate((el) => (el as HTMLImageElement).naturalWidth);
  expect(bildBreite).toBeGreaterThan(0);

  // Viewport-Screenshot statt `fullPage: true` — Begründung s. Kommentar
  // beim grundriss-rohbau-Screenshot oben.
  await page.screenshot({ path: 'e2e-results/pb2-vis-demolauf-schrittliste.png' });
});

test('C-12: Drehbuch «publish-blatt» als LaufPlan — Blatt + 2 Ansichten im Doc', async ({ page }) => {
  test.setTimeout(60_000);
  const drehbuch = ladeDrehbuch('publish-blatt.json');
  // Phase 1: Blatt anlegen (Schritt 0). Phase 2: beide Ansichten (Schritte
  // 1-2, brauchen sheetId aus Phase 1).
  const phase1 = drehbuch.schritte.slice(0, 1);
  const phase2 = drehbuch.schritte.slice(1);

  await frischOhnePanel(page);
  await oeffnePanel(page);
  await installiereAufloeser(page);

  await fahrePhase(page, `${drehbuch.titel} — Blatt`, phase1);
  await fahrePhase(page, `${drehbuch.titel} — Ansichten`, phase2);

  const zustand = await page.evaluate(() => {
    const doc = window.__kosmo.state().doc;
    const blaetter = doc.byKind('sheet') as { placements: { view: string }[] }[];
    return {
      blaetter: blaetter.length,
      ansichten: blaetter[0]?.placements.length ?? 0,
      views: blaetter[0]?.placements.map((p) => p.view) ?? [],
    };
  });
  expect(zustand.blaetter).toBe(1);
  expect(zustand.ansichten).toBe(2);
  expect(zustand.views).toEqual(['axo', 'schnitt']);
});
