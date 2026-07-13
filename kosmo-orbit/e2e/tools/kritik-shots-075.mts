/**
 * Kritik-Shots v0.7.5 — frische Screenshots für den Owner-Rundgang zu den
 * drei 0.7.5-Punkten (Vorbild strikt `kritik-shots-074-r2.mts`):
 *
 *  1. A1 Beschlag-Katalog S2 — Inspector-Mehrfachauswahl an einer
 *     angewählten Tür, gruppiert nach Kategorie (Tür/Fenster/Sicherheit),
 *     testids `beschlag-s2-<key>` (`Inspector.tsx`, `design.beschlaegeSetzen`).
 *     Fixture identisch zu `testhausBeschlagS2()`
 *     (`packages/kosmo-kernel/test/fixtures.ts`): Tür mit 3 Beschlägen
 *     (tuerdruecker-garnitur, tuerband-scharnier, einsteckschloss).
 *  2. A2 Projekt-Stammdaten — StammdatenPanel im Projekt-Menü, Felder
 *     Bauherr/Adresse/Parzellennr/Verfasser, testids `stammdaten-*`.
 *     Fixture identisch zu `testhausStammdaten()`.
 *
 * Bundle==dist wird hier bewiesen (Muster `kritik-shots-073-r1.mts` /
 * `kritik-shots-074-r2.mts`), nicht nur behauptet.
 *
 * Aufruf (aus kosmo-orbit/, Preview auf :5183 + Helferserver müssen laufen):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *   npx tsx e2e/tools/kritik-shots-075.mts
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = 'docs/rundgang/kritik-075';
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

const browser = await chromium.launch({
  executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'],
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

type KosmoHook = {
  run: (id: string, params: unknown) => { patches: { id: string }[] };
  state: () => { select: (ids: string[]) => void };
};

/** Frischer Kontext, Onboarding/Modus-Automatik/Leistungs-Seed wie playwright.config.ts. */
async function frisch(breite = 1500, hoehe = 1500): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem(
      'kosmo.ui.v1',
      JSON.stringify({ version: 1, modusAutomatik: false, modusFesthalten: false, phasenFokus: null }),
    );
    localStorage.setItem(
      'kosmo.leistung.v1',
      JSON.stringify({ version: 1, zustimmungErteilt: false, override: 'auto', renderBeiBedarf: false }),
    );
  });
  await page.goto(URL_);
  await page.waitForTimeout(1200);
  return page;
}

// 1 — A1 Beschlag-Katalog S2: Tür mit 3 Beschlägen, Inspector offen.
{
  const page = await frisch();
  await page.click('[data-testid="module-design"]');
  await page.waitForTimeout(600);

  const openingId = await page.evaluate(() => {
    const k = (window as unknown as { __kosmo: KosmoHook }).__kosmo;
    const eg = k.run('design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
    const storeyId = eg.patches[0]!.id;
    const aufbau = k.run('design.aufbauErstellen', {
      name: 'AW Beton 36',
      target: 'wall',
      layers: [
        { material: 'beton', thickness: 250, function: 'tragend' },
        { material: 'daemmung', thickness: 160, function: 'daemmung' },
      ],
    });
    const assemblyId = aufbau.patches[0]!.id;
    const wand = k.run('design.wandZeichnen', {
      storeyId,
      a: { x: 0, y: 0 },
      b: { x: 8000, y: 0 },
      assemblyId,
    });
    const wallId = wand.patches[0]!.id;
    const oeffnung = k.run('design.oeffnungSetzen', {
      wallId,
      openingType: 'tuer',
      center: 4000,
      width: 1000,
      height: 2100,
      sill: 0,
    });
    const openingId_ = oeffnung.patches[0]!.id;
    k.run('design.beschlaegeSetzen', {
      openingId: openingId_,
      beschlaege: ['tuerdruecker-garnitur', 'tuerband-scharnier', 'einsteckschloss'],
    });
    k.state().select([openingId_]);
    return openingId_;
  });
  console.log('Tür angelegt + 3 Beschläge zugewiesen, Öffnung', openingId);

  await page.locator('[data-testid="beschlag-s2-tuerdruecker-garnitur"]').waitFor({ timeout: 5000 });
  // Sicherheit-Kategorie (unterster Abschnitt) in den sichtbaren Bereich
  // scrollen, damit die volle Kategorien-Gruppierung im Screenshot Platz hat.
  await page.locator('[data-testid="beschlag-s2-tuerspion"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="inspector"]').screenshot({ path: `${OUT}/a1-beschlag-s2-inspector.png` });
  await page.context().close();
  console.log('1 — A1 Beschlag-Katalog S2 (Inspector, Mehrfachauswahl) →', `${OUT}/a1-beschlag-s2-inspector.png`);
}

// 2 — A2 Projekt-Stammdaten: StammdatenPanel im Projekt-Menü, alle vier Felder gesetzt.
{
  const page = await frisch(1600, 700);
  await page.click('[data-testid="module-design"]');
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    const k = (window as unknown as { __kosmo: KosmoHook }).__kosmo;
    k.run('design.projektNameSetzen', { name: 'Wohnhaus Ahornweg' });
    k.run('design.projektInfoSetzen', {
      bauherr: 'Baugenossenschaft Ahorn',
      adresse: 'Ahornweg 12, 6000 Luzern',
      parzelleNr: '1847',
      verfasser: 'Baubüro Andrin',
    });
  });

  await page.click('[data-testid="projekt-menu-toggle"]');
  await page.locator('[data-testid="stammdaten-panel"]').waitFor({ timeout: 5000 });
  await page.waitForTimeout(500);
  const bauherrWert = await page.locator('[data-testid="stammdaten-bauherr"]').inputValue();
  if (bauherrWert !== 'Baugenossenschaft Ahorn') {
    throw new Error(`Stammdaten-Feld zeigt nicht den gesetzten Wert (bauherr=«${bauherrWert}»)`);
  }
  await page.locator('[data-testid="projekt-menu"]').screenshot({ path: `${OUT}/a2-stammdaten-panel.png` });
  await page.context().close();
  console.log('2 — A2 Projekt-Stammdaten (StammdatenPanel im Projekt-Menü) →', `${OUT}/a2-stammdaten-panel.png`);
}

// 3 — Golden-Rasterung `werkplan-beschlag-s2.svg`: Ausschnitt Südwand mit
//     den drei Beschlag-Piktogrammen + Katalogtext (Pfad B, plansvg.ts).
//     Golden ist A4 420×297mm; Bild-Skala 6 px/mm, Crop in mm bestimmt aus
//     der Zeichen-Transform `translate(121.45, 178.05) scale(0.02)` (Wand
//     global x≈117–326mm, y≈54–182mm; Piktogramme+Text darunter bis y≈237mm).
{
  const PXPERMM = 6;
  const svgRoh = readFileSync('packages/kosmo-kernel/test/golden/werkplan-beschlag-s2.svg', 'utf8');
  const svg = svgRoh.replace('width="420mm" height="297mm"', `width="${420 * PXPERMM}" height="${297 * PXPERMM}"`);
  const ctx = await browser.newContext({ viewport: { width: 420 * PXPERMM, height: 297 * PXPERMM } });
  const page = await ctx.newPage();
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
  await page.waitForTimeout(200);
  await page.screenshot({
    path: `${OUT}/a1-golden-werkplan-beschlag-s2.png`,
    clip: { x: 95 * PXPERMM, y: 168 * PXPERMM, width: 250 * PXPERMM, height: 75 * PXPERMM },
  });
  await ctx.close();
  console.log(
    '3 — Golden werkplan-beschlag-s2.svg gerastert (Südwand-Ausschnitt) →',
    `${OUT}/a1-golden-werkplan-beschlag-s2.png`,
  );
}

// 4 — Golden-Rasterung `plankopf-stammdaten.svg`: die volle Plankopf-Zeile
//     (Titel/Untertitel links, Massstab/Datum rechts, NEU darunter die
//     Bauherr-/Verfasser-Zeile) — diese vier Texte stehen absolut (nicht in
//     der Zeichen-Transform), Sheet-Koordinaten x:0–420mm, y:265–297mm.
{
  const PXPERMM = 6;
  const svgRoh = readFileSync('packages/kosmo-kernel/test/golden/plankopf-stammdaten.svg', 'utf8');
  const svg = svgRoh.replace('width="420mm" height="297mm"', `width="${420 * PXPERMM}" height="${297 * PXPERMM}"`);
  const ctx = await browser.newContext({ viewport: { width: 420 * PXPERMM, height: 297 * PXPERMM } });
  const page = await ctx.newPage();
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
  await page.waitForTimeout(200);
  await page.screenshot({
    path: `${OUT}/a2-golden-plankopf-stammdaten.png`,
    clip: { x: 0, y: 265 * PXPERMM, width: 420 * PXPERMM, height: 32 * PXPERMM },
  });
  await ctx.close();
  console.log(
    '4 — Golden plankopf-stammdaten.svg gerastert (volle Plankopf-Zeile inkl. neuer Stammdaten-Zeile) →',
    `${OUT}/a2-golden-plankopf-stammdaten.png`,
  );
}

await browser.close();
console.log('kritik-shots-075: Shots →', OUT);
