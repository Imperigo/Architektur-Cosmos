/**
 * Kritik-Shots v0.7.3 Runde 1 — Welle 1 (S1 Stilblatt/D1-Sammelwechsel +
 * S2 D7-Theme-Paar): Einstellungen mit 2-Segment-Wähler PAPIER/KOSMOS,
 * App im Papier-Theme (Abnahme gegen docs/soll-073/8a), App im Kosmos-Theme
 * (gegen 8b), Planblatt (Grundriss-Sicht) in BEIDEN Themes (Invarianz-Regel,
 * gegen 8c) sowie 3 repräsentative D1-Goldens als Vorher/Nachher-Rendering
 * (Vorher = Stand D1a-Refactor, per `git show` extrahiert; Pfad via
 * GOLDEN_VORHER_DIR).
 *
 * Bundle==dist wird HIER IM SKRIPT bewiesen (nicht nur behauptet): das vom
 * Preview auf :5183 ausgelieferte index.html muss byte-identisch zu
 * apps/kosmo-orbit/dist/index.html sein — sonst Abbruch.
 *
 * Aufruf (aus kosmo-orbit/, Preview auf :5183 muss laufen):
 *   GOLDEN_VORHER_DIR=/pfad/zu/vorher-svgs \
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *   npx tsx e2e/tools/kritik-shots-073-r1.mts
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = 'docs/rundgang/kritik-073';
mkdirSync(OUT, { recursive: true });
const URL_ = 'http://localhost:5183';

// 0 — Bundle==dist-Beweis: Preview liefert exakt das gebaute index.html
{
  const dist = readFileSync('apps/kosmo-orbit/dist/index.html', 'utf8');
  const live = await (await fetch(`${URL_}/`)).text();
  if (dist !== live) {
    console.error('ABBRUCH: Preview auf :5183 liefert NICHT dist/index.html (Bundle!=dist).');
    process.exit(1);
  }
  console.log('Bundle==dist bewiesen: index.html byte-identisch (', dist.length, 'Bytes ).');
}

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });

async function frisch(thema: 'orbit' | 'paper', breite = 1440): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.thema', t);
  }, thema);
  await page.goto(URL_);
  await page.waitForTimeout(1600);
  return page;
}

// 1 — Einstellungen mit 2-Segment-Thema-Wähler PAPIER/KOSMOS (beide Themes)
for (const thema of ['paper', 'orbit'] as const) {
  const page = await frisch(thema);
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.locator('[data-testid="einstellung-thema"]').waitFor({ timeout: 5000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/r1-${thema}-einstellungen-2segmente.png` });
  await page.context().close();
}

// 2 — App (KosmoDesign, 3D|Plan-Split, TKB-Beispielprojekt) im Papier- und
//     Kosmos-Theme (Abnahme gegen soll-073/8a bzw. 8b — Boden-Dock ist
//     Welle-3-Stand S5, fehlt hier bewusst noch). Das Beispielprojekt liefert
//     echte Plangrafik (Waende, Masse) statt eines leeren Blatts.
async function designMitProjekt(thema: 'orbit' | 'paper'): Promise<Page> {
  const page = await frisch(thema, 1600);
  await page.click('[data-testid="load-tkb"]');
  await page.waitForTimeout(2200);
  return page;
}
for (const thema of ['paper', 'orbit'] as const) {
  const page = await designMitProjekt(thema);
  await page.click('[data-testid="view-split"]');
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/r1-${thema}-app-design-split.png` });
  await page.context().close();
}

// 3 — Invarianz «Papier ist Papier» (8c): der PLAN-Bereich (PlanView,
//     `--k-plan-paper`) in BEIDEN Themes — die Plangrafik muss identisch
//     weiss/schwarz bleiben, nur das UI-Chrome wechselt. Clip auf die rechte
//     Split-Haelfte (der PlanView-Pane); die dunkle Zeichenflaeche der
//     Grundriss-Arbeitssicht ist bewusst NICHT Gegenstand der Invarianz
//     (Arbeits-Canvas = UI-Flaeche, kein Papier).
for (const thema of ['paper', 'orbit'] as const) {
  const page = await designMitProjekt(thema);
  await page.click('[data-testid="view-split"]');
  await page.waitForTimeout(1400);
  await page.screenshot({
    path: `${OUT}/r1-${thema}-planblatt-invarianz.png`,
    clip: { x: 800, y: 140, width: 800, height: 760 },
  });
  await page.context().close();
}

// 4 — D1-Golden-Wechsel: 3 repräsentative Goldens Vorher/Nachher rendern
//     (Vorher = D1a-Refactor-Stand, byte-identisch zum 0.7.2-Bestand).
const VORHER = process.env['GOLDEN_VORHER_DIR'];
const REPRAESENTATIV = [
  'grundriss-testhaus.svg', // Grau-Flip geschnitten/ideell im Grundriss
  'ansicht-fluegeltypen.svg', // D2-Leibung + Symbolik-Grau in der Ansicht
  'schnitt-satteldach-querschnitt.svg', // groesster Diff: Projektion #444->#666
];
if (VORHER) {
  const seite = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  for (const name of REPRAESENTATIV) {
    const basis = name.replace(/\.svg$/, '');
    for (const [stand, dir] of [
      ['vorher', VORHER],
      ['nachher', 'packages/kosmo-kernel/test/golden'],
    ] as const) {
      const pfad = resolve(dir, name);
      if (!existsSync(pfad)) {
        console.error(`FEHLT: ${pfad}`);
        continue;
      }
      await seite.goto(`file://${pfad}`);
      await seite.waitForTimeout(400);
      await seite.screenshot({ path: `${OUT}/r1-golden-${basis}-${stand}.png` });
    }
  }
  await seite.close();
} else {
  console.log('GOLDEN_VORHER_DIR nicht gesetzt — Golden-Renderings uebersprungen.');
}

await browser.close();
console.log('kritik-shots-073-r1: Shots →', OUT);
