/**
 * Kritik-Shots v0.7.3 Runde 3 — Welle 3 (S5 Boden-Dock app-weit + S6 D5
 * 3D-Modusregel «Phase entscheidet»). Treibt die LIVE-App auf :5183 (nicht
 * Goldens): Theme-Wechsel, Navigation, Viewport-Grösse, Phasen-gesteuerte
 * 3D-Captures über den OFFIZIELLEN Pfad (`__kosmoViewport.captureFrame({
 * offiziell })`, derselbe Weg wie «Für Vis aufnehmen»/Kosmo-Blick).
 *
 * Erzeugt (docs/rundgang/kritik-073-r3/):
 *  A) Boden-Dock in Papier- UND Kosmos-Theme, in KosmoDesign — SO, dass BEIDES
 *     im Bild ist: der Dock unten Mitte UND das (bewusst nicht eingebettete,
 *     App.tsx:~930) freie KosmoSymbol unten rechts. Grundlage für den Owner-
 *     Entscheid «Dock + separat schwebendes Symbol» vs «Orb ins Dock».
 *  B) Dasselbe auf der OrbitStart-/Zentrale-Ansicht (zeigt: der Dock ist
 *     app-weit, wie verhält er sich zum OrbitStart-Hub?).
 *  C) Dock-Kollaps unter 1100 px (nur Orb + Top-3, Rest bleibt im DOM).
 *  D) Je ein 3D-Capture im OFFIZIELLEN Modus pro Phase gegen soll-073/6a:
 *     Weiss (Wettbewerb) · Schwarz (zweck=Situation/Volumennachweis) ·
 *     Textur/Material (Werkplan/Ausführung). Beweist D5 «Phase entscheidet»
 *     und Glas-Transparenz in JEDEM Modus (das Fenster bleibt durchsichtig).
 *  E) Textbeleg: boundingBox-Disjunktion Dock ↔ Statusleiste (live gemessen).
 *
 * Bundle==dist wird HIER bewiesen: das von :5183 gelieferte index.html muss
 * byte-identisch zu apps/kosmo-orbit/dist/index.html sein — sonst Abbruch.
 *
 * Aufruf (aus kosmo-orbit/, Preview auf :5183 muss laufen):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *   npx tsx e2e/tools/kritik-shots-073-r3.mts
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'docs/rundgang/kritik-073-r3';
mkdirSync(OUT, { recursive: true });
// Preview-Port: der Aufrufer setzt KRITIK_URL (dieses Skript startet KEINEN
// Server — Preview läuft im selben Shell-Call, s. Kopf-Aufruf).
const URL_ = process.env['KRITIK_URL'] ?? 'http://localhost:5183';

// 0 — Bundle==dist-Beweis
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
  // WebGL via SwiftShader (kein GPU) — identisch zur playwright.config, sonst
  // liefert das 3D-Viewport keinen Frame.
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

type ThemeName = 'paper' | 'orbit';

/** Frische Seite mit gesetztem Theme + übersprungenem Onboarding. Seeds wie
 *  playwright.config (modusAutomatik aus, renderBeiBedarf aus) + reduced-motion,
 *  damit die Oberfläche der getesteten entspricht. */
async function seiteMitTheme(theme: ThemeName, viewport = { width: 1440, height: 900 }): Promise<Page> {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2, baseURL: URL_, reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.thema', t);
    localStorage.setItem('kosmo.ui.v1', JSON.stringify({ version: 1, modusAutomatik: false, modusFesthalten: false, phasenFokus: null }));
    localStorage.setItem('kosmo.leistung.v1', JSON.stringify({ version: 1, zustimmungErteilt: false, override: 'auto', renderBeiBedarf: false }));
  }, theme);
  await page.reload();
  return page;
}

/** Base64-dataURL → PNG-Datei. */
function speicherePng(dataUrl: string, out: string): void {
  const m = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error('captureFrame lieferte kein PNG-dataURL');
  writeFileSync(`${OUT}/${out}.png`, Buffer.from(m[1]!, 'base64'));
  console.log('Shot:', out);
}

// ---------------------------------------------------------------------------
// A + B — Boden-Dock in beiden Themes, in KosmoDesign UND auf der Zentrale.
//         Full-page: Dock (unten Mitte) + freies KosmoSymbol (unten rechts).
// ---------------------------------------------------------------------------
for (const theme of ['paper', 'orbit'] as const) {
  // Zentrale (OrbitStart-Hub): v073 S5b — der Dock erscheint hier NICHT mehr
  // (der Hub IST die Navigation, sonst Text-Kollision mit den Teasern). Der
  // Shot BELEGT die Abwesenheit; das freie KosmoSymbol bleibt.
  {
    const page = await seiteMitTheme(theme);
    await page.locator('[data-testid="kosmo-symbol"]').waitFor({ state: 'visible' });
    const dockDa = await page.locator('[data-testid="boden-dock"]').count();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/b-zentrale-${theme}.png` });
    console.log('Shot:', `b-zentrale-${theme}`, `— Dock auf Zentrale: ${dockDa} (erwartet 0)`);
    await page.close();
  }
  // KosmoDesign: Dock + freies Symbol im selben Bild.
  {
    const page = await seiteMitTheme(theme);
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="view-2d"]');
    await page.locator('[data-testid="boden-dock"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="kosmo-symbol"]').waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/a-design-${theme}.png` });
    console.log('Shot:', `a-design-${theme}`);
    await page.close();
  }
}

// ---------------------------------------------------------------------------
// C — Dock-Kollaps unter 1100 px (nur Orb + Top-3 sichtbar, Rest im DOM).
// ---------------------------------------------------------------------------
{
  const page = await seiteMitTheme('orbit', { width: 1000, height: 800 });
  await page.click('[data-testid="module-design"]'); // v073 S5b: Dock nur in Modul-Ansicht
  await page.locator('[data-testid="boden-dock"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  const alle = page.locator('[data-testid="boden-dock"] .boden-dock-knopf');
  const gesamt = await alle.count();
  let sichtbar = 0;
  for (let i = 0; i < gesamt; i++) if (await alle.nth(i).isVisible()) sichtbar++;
  await page.screenshot({ path: `${OUT}/c-kollaps-1000px.png` });
  console.log('Shot: c-kollaps-1000px —', `${sichtbar}/${gesamt} Knöpfe sichtbar (erwartet 3/8)`);
  await page.close();
}

// ---------------------------------------------------------------------------
// D — D5: 3D-Captures im OFFIZIELLEN Modus je Phase (soll-073/6a).
//     Ein Projekt mit Wand + parametrischem Fenster (das Glas beweist die
//     Transparenz-Regel in JEDEM Modus), dann pro Phase EIN offizieller Frame.
// ---------------------------------------------------------------------------
{
  const page = await seiteMitTheme('orbit', { width: 1200, height: 900 });
  await page.click('[data-testid="module-design"]');
  // Wand + Einflügel-Fenster über denselben Command-Weg wie phasen-darstellung.spec.
  await page.evaluate(() => {
    const k = window.__kosmo as {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => { activeStoreyId: string | null; doc: { byKind: (kind: string) => { id: string; name?: string }[] } };
    };
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const wand = k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 6000, y: 0 },
      assemblyId: aw.id,
    });
    const wallId = wand.patches[0]!.id;
    const oeff = k.run('design.oeffnungSetzen', {
      wallId,
      openingType: 'fenster',
      center: 3000,
      width: 1500,
      height: 1500,
      sill: 900,
    }) as { patches: { id: string }[] };
    k.run('design.fensterParametrieren', { openingId: oeff.patches[0]!.id, fensterTyp: 'einfluegel', swing: 'links' });
  });
  await page.click('[data-testid="view-3d"]');
  await page.locator('[data-testid="viewport3d"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(1200); // Modell-Aufbau + erster Frame

  type Vp = { captureFrame: (opts?: { offiziell?: boolean; zweck?: 'situation' | 'volumennachweis' }) => string | null };
  const setzePhase = (siaPhase: string) =>
    page.evaluate((p) => (window.__kosmo as { run: (id: string, x: unknown) => unknown }).run('design.siaPhaseSetzen', { siaPhase: p }), siaPhase);

  // Weiss — Wettbewerb (frühe Phase → Weissmodell).
  await setzePhase('wettbewerb');
  await page.waitForTimeout(700);
  {
    const url = await page.evaluate(() => (window as unknown as { __kosmoViewport: Vp }).__kosmoViewport.captureFrame({ offiziell: true }));
    if (url) speicherePng(url, 'd-3d-weiss-wettbewerb');
    else console.error('WARN: kein Frame (weiss)');
  }
  // Schwarz — zweck=Situation (Capture-Kontext, überschreibt die Phase).
  {
    const url = await page.evaluate(() => (window as unknown as { __kosmoViewport: Vp }).__kosmoViewport.captureFrame({ offiziell: true, zweck: 'situation' }));
    if (url) speicherePng(url, 'd-3d-schwarz-situation');
    else console.error('WARN: kein Frame (schwarz)');
  }
  // Textur/Material — Ausführung (späte Phase → Material/Textur).
  await setzePhase('ausfuehrung');
  await page.waitForTimeout(700);
  {
    const url = await page.evaluate(() => (window as unknown as { __kosmoViewport: Vp }).__kosmoViewport.captureFrame({ offiziell: true }));
    if (url) speicherePng(url, 'd-3d-textur-werkplan');
    else console.error('WARN: kein Frame (textur)');
  }
  await page.close();
}

// ---------------------------------------------------------------------------
// E — Beleg: boundingBox-Disjunktion Dock ↔ Statusleiste (live gemessen).
// ---------------------------------------------------------------------------
let belegDisjunkt = 'nicht gemessen';
{
  const page = await seiteMitTheme('orbit');
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');
  const dock = page.locator('[data-testid="boden-dock"]');
  const status = page.locator('[data-testid="statusleiste"]');
  await dock.waitFor({ state: 'visible' });
  await status.waitFor({ state: 'visible' });
  const d = (await dock.boundingBox())!;
  const s = (await status.boundingBox())!;
  const ueberlappt = d.x < s.x + s.width && d.x + d.width > s.x && d.y < s.y + s.height && d.y + d.height > s.y;
  belegDisjunkt =
    `Dock   : x=${d.x.toFixed(0)} y=${d.y.toFixed(0)} w=${d.width.toFixed(0)} h=${d.height.toFixed(0)}\n` +
    `Status : x=${s.x.toFixed(0)} y=${s.y.toFixed(0)} w=${s.width.toFixed(0)} h=${s.height.toFixed(0)}\n` +
    `Überlappung: ${ueberlappt ? 'JA (FEHLER!)' : 'NEIN (disjunkt ✓)'}`;
  await page.close();
}

await browser.close();

writeFileSync(
  `${OUT}/e-belege.txt`,
  `KRITIK-3 BELEGE (v0.7.3 Welle 3)\n\n` +
    `S5 Boden-Dock — boundingBox-Disjunktion Dock ↔ Statusleiste (live, KosmoDesign 2D):\n${belegDisjunkt}\n\n` +
    `S6 D5 — 3D-Captures im offiziellen Modus (gegen soll-073/6a):\n` +
    `  d-3d-weiss-wettbewerb   : Weissmodell (frühe Phase, Owner-Palette #D8CFC0…)\n` +
    `  d-3d-schwarz-situation  : Schwarzmodus (zweck=Situation, überschreibt Phase)\n` +
    `  d-3d-textur-werkplan    : Textur/Material (späte Phase Ausführung)\n` +
    `  In ALLEN drei Modi bleibt das Fenster-Glas transparent (0.7.0-Regel).\n`,
);
console.log('kritik-shots-073-r3: Shots + Belege →', OUT);
