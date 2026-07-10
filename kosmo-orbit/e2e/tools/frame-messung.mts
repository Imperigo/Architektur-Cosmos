/**
 * V-M1 Commit 2 (v0.6.6 W2 Stream D) — Beweis-Skript für den on-demand-
 * Renderloop: zählt gerenderte Frames (`window.__kosmoViewport.frameCount()`,
 * s. Viewport3D.tsx) im 10s-Idle und in 5s aktiver Orbit-Bewegung, jeweils
 * mit dem Flag `renderBeiBedarf` AUS (alter Dauerloop) und AN (on-demand),
 * und vergleicht das Bild nach dem Aufbau (SHA-256 des Screenshots nach
 * einem deterministischen `renderOnce()`) zwischen beiden Läufen.
 *
 * Muster `e2e/tools/kritik-shots-065.mts`: playwright-core, Chromium unter
 * /opt/pw-browsers/chromium mit SwiftShader-Args (kein GPU nötig).
 * Voraussetzung: ein laufender Preview-Server (Default :5234, override per
 * FRAME_MESSUNG_URL).
 *
 * Hartes Beweis-Gate (schlägt mit Exit-Code 1 fehl, wenn verfehlt):
 *   - ≥80% weniger gerenderte Frames im 10s-Idle (on-demand vs. Dauerloop)
 *   - identisches Bild nach dem Aufbau (Screenshot-Hash on-demand === Dauerloop)
 *   - Bewegung bleibt flüssig: Frames während 5s aktivem Orbit fallen nicht
 *     unter GATE_BEWEGUNG_MINDESTANTEIL des Dauerloop-Werts
 *
 * Nutzung: npx tsx e2e/tools/frame-messung.mts   (cwd kosmo-orbit/)
 */
import { chromium, type Page } from 'playwright-core';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL_ = process.env.FRAME_MESSUNG_URL ?? 'http://localhost:5234';
const OUT_DIR = new URL('../../e2e-results/', import.meta.url).pathname;
mkdirSync(OUT_DIR, { recursive: true });

const IDLE_SEKUNDEN = 10;
const BEWEGUNG_SEKUNDEN = 5;
/** Beweis-Gate-Schwellen (s. Datei-Kopf). */
const GATE_IDLE_MINDEST_REDUKTION = 0.8;
const GATE_BEWEGUNG_MINDESTANTEIL = 0.6; // grosszügig: SwiftShader-Timing ist nicht taktgenau reproduzierbar

interface KosmoViewportHook {
  frameCount: () => number;
  resetFrameCount: () => void;
  renderOnce: () => void;
  resume: () => void;
  setCamera: (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => void;
  renderBeiBedarfAktiv: () => boolean;
}
interface KosmoTestHook {
  run: (id: string, p: unknown) => { patches: { id: string }[] };
  state: () => { activeStoreyId: string | null };
}
declare global {
  interface Window {
    __kosmoViewport: KosmoViewportHook;
    __kosmo: KosmoTestHook;
  }
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.setDefaultTimeout(30000);

/** Frischer Boot: onboarded, Reduced-Motion/Arbeitsmodi-Automatik AUS (wie
 *  playwright.config.ts storageState), `renderBeiBedarf` explizit gesetzt —
 *  dann Design-Station + ein Volumenkörper (nicht-triviales Bild) + eine
 *  deterministische Kamera-Pose. */
async function bootstrap(renderBeiBedarf: boolean): Promise<void> {
  await page.goto(URL_);
  await page.evaluate((an) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem(
      'kosmo.ui.v1',
      JSON.stringify({ version: 1, modusAutomatik: false, modusFesthalten: false, phasenFokus: null }),
    );
    localStorage.setItem(
      'kosmo.leistung.v1',
      JSON.stringify({ version: 1, zustimmungErteilt: false, override: 'auto', renderBeiBedarf: an }),
    );
  }, renderBeiBedarf);
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.waitForSelector('[data-testid="viewport3d"]');
  await page.evaluate(() => {
    const st = window.__kosmo.state();
    window.__kosmo.run('design.volumenErstellen', {
      storeyId: st.activeStoreyId,
      outline: [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
        { x: 4000, y: 4000 },
        { x: 0, y: 4000 },
      ],
      height: 3000,
    });
  });
  await page.evaluate(() => window.__kosmoViewport.setCamera(18, 14, 18, 4, 0, -4));
  // Modell-Sync (Worker/Sync-Effekt) + Kamera-Transition abklingen lassen —
  // gross genug für beide Modi (der alte Dauerloop rendert das ohnehin ab
  // Frame 1 mit; on-demand fasst über die Invalidierungs-Kette nach).
  await page.waitForTimeout(1200);
}

/** SHA-256 eines deterministischen Einzelframes (`renderOnce()`) — beweist,
 *  dass on-demand am Ende dasselbe Bild zeigt wie der alte Dauerloop, egal
 *  wie viele Zwischenframes übersprungen wurden. */
async function screenshotHash(p: Page): Promise<string> {
  await p.evaluate(() => window.__kosmoViewport.renderOnce());
  const box = (await p.locator('[data-testid="viewport3d"]').boundingBox())!;
  const buf = await p.screenshot({ clip: box });
  await p.evaluate(() => window.__kosmoViewport.resume());
  return createHash('sha256').update(buf).digest('hex');
}

async function messeIdle(p: Page, sekunden: number): Promise<number> {
  await p.evaluate(() => window.__kosmoViewport.resetFrameCount());
  await p.waitForTimeout(sekunden * 1000);
  return p.evaluate(() => window.__kosmoViewport.frameCount());
}

/** Aktiver Maus-Orbit über `sekunden` — Kamerabewegung ist der Fall, in dem
 *  on-demand genauso oft rendern MUSS wie der alte Dauerloop (Punkt (a) des
 *  Buildplans: camera-controls-`update`-Signal). */
async function messeBewegung(p: Page, sekunden: number): Promise<number> {
  const box = (await p.locator('[data-testid="viewport3d"]').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await p.evaluate(() => window.__kosmoViewport.resetFrameCount());
  await p.mouse.move(cx, cy);
  await p.mouse.down({ button: 'left' });
  const start = Date.now();
  let schritt = 0;
  while (Date.now() - start < sekunden * 1000) {
    schritt++;
    const dx = Math.sin(schritt / 4) * 120;
    const dy = Math.cos(schritt / 4) * 60;
    await p.mouse.move(cx + dx, cy + dy, { steps: 2 });
    await p.waitForTimeout(40);
  }
  await p.mouse.up({ button: 'left' });
  return p.evaluate(() => window.__kosmoViewport.frameCount());
}

async function laufMessen(renderBeiBedarf: boolean) {
  await bootstrap(renderBeiBedarf);
  const flagAktiv = await page.evaluate(() => window.__kosmoViewport.renderBeiBedarfAktiv());
  const bildHash = await screenshotHash(page);
  const idleFrames = await messeIdle(page, IDLE_SEKUNDEN);
  const bewegungFrames = await messeBewegung(page, BEWEGUNG_SEKUNDEN);
  return { renderBeiBedarfGesetzt: renderBeiBedarf, flagAktivGelesen: flagAktiv, bildHash, idleFrames, bewegungFrames };
}

console.log(`Messe gegen ${URL_} …`);
const alt = await laufMessen(false);
console.log('alt (Dauerloop):', alt);
const neu = await laufMessen(true);
console.log('neu (on-demand):', neu);

await browser.close();

const idleReduktion = alt.idleFrames > 0 ? 1 - neu.idleFrames / alt.idleFrames : 0;
const bildIdentisch = alt.bildHash === neu.bildHash;
const bewegungAnteil = alt.bewegungFrames > 0 ? neu.bewegungFrames / alt.bewegungFrames : 0;

const gate = {
  idleReduktion: { wert: idleReduktion, mindest: GATE_IDLE_MINDEST_REDUKTION, bestanden: idleReduktion >= GATE_IDLE_MINDEST_REDUKTION },
  bildIdentisch: { bestanden: bildIdentisch },
  bewegungFluessig: {
    anteil: bewegungAnteil,
    mindestanteil: GATE_BEWEGUNG_MINDESTANTEIL,
    bestanden: bewegungAnteil >= GATE_BEWEGUNG_MINDESTANTEIL,
  },
};
const bestanden = gate.idleReduktion.bestanden && gate.bildIdentisch.bestanden && gate.bewegungFluessig.bestanden;

const report = {
  zeitpunkt: new Date().toISOString(),
  url: URL_,
  idleSekunden: IDLE_SEKUNDEN,
  bewegungSekunden: BEWEGUNG_SEKUNDEN,
  alt,
  neu,
  gate,
  bestanden,
};

const reportPfad = `${OUT_DIR}frame-messung.json`;
writeFileSync(reportPfad, JSON.stringify(report, null, 2));
console.log('\nReport →', reportPfad);
console.log(JSON.stringify(gate, null, 2));
console.log(bestanden ? '\n✓ Beweis-Gate bestanden' : '\n✗ Beweis-Gate NICHT bestanden');

process.exitCode = bestanden ? 0 : 1;
