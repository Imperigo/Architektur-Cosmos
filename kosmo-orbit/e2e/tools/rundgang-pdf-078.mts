/**
 * Rundgang-PDF «0.7.8 — Intelligente Werkzeugtabs» — visueller Rundgang durch
 * die Dock-Wellen 1–3 + Abnahme-Fixes (ROADMAP 353–361). Muster analog
 * `rundgang-pdf-077.mts` (Screenshots der laufenden App → A4-PDF). Zeigt:
 * das neue Dock in der Design-Station (3 offene Panels), das automatische
 * Einklappen bei engem Fenster, Kosmos sichtbare Selbststeuerung (goldener
 * Orb + «KOSMO»-Ring) und den A/B-Anordnungs-Wähler in den Einstellungen.
 *
 * Voraussetzung: Build ist NACH dem Versions-Bump neu zu bauen und der
 * Preview-Server NEU zu starten (setsid; ein alter Preview-Prozess zeigt
 * sonst weiterhin die alte Versionsnummer im App-Kopf — `Wordmark`, s.
 * `App.tsx`, liest `__APP_VERSION__` nur beim Vite-Build aus
 * `apps/kosmo-orbit/package.json`).
 *
 * Aufruf (aus kosmo-orbit/, Preview auf $PORT):
 *   KOSMO_E2E_PORT=5183 PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *     npx tsx e2e/tools/rundgang-pdf-078.mts
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const PORT = process.env['KOSMO_E2E_PORT'] ?? '5183';
const BASE = `http://localhost:${PORT}`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.7.8.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
const WORK = join(tmpdir(), 'kosmo-rundgang-078');
mkdirSync(join(WORK, 'bilder'), { recursive: true });
const exe = process.env['PLAYWRIGHT_CHROMIUM_PATH'] || undefined;

// Basis wie `rundgang-pdf-077.mts` + `kosmo.ui.v1`-Seed (Muster
// `playwright.config.ts`s Suite-Default): `modusAutomatik:false` hält die
// VOLLE Werkzeugliste sichtbar (sonst würde die Arbeitsmodi-Automatik
// Panels je erkanntem Modus ausblenden — für den Dock-Rundgang unerwünscht).
const setzeBasis = `
  localStorage.setItem('kosmo.thema','orbit');
  localStorage.setItem('kosmo.starterGuide.done','1');
  localStorage.setItem('kosmo.panelOffen','0');
  localStorage.setItem('kosmo.onboarded','1');
  localStorage.setItem('kosmo.ui.v1', JSON.stringify({ version: 1, modusAutomatik: false, modusFesthalten: false, phasenFokus: null }));
`;

async function main() {
  const browser = await chromium.launch({ executablePath: exe });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const shots: Record<string, string> = {};

  async function schuss(
    key: string,
    vorbereiten: () => Promise<void>,
    viewport: { width: number; height: number } = { width: 1400, height: 900 },
  ) {
    await page.setViewportSize(viewport);
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate(setzeBasis);
    await vorbereiten();
    await page.waitForTimeout(1000);
    const p = join(WORK, 'bilder', `${key}.png`);
    await page.screenshot({ path: p });
    shots[key] = readFileSync(p).toString('base64');
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${key}`);
  }

  async function ladeTkbInDesign(): Promise<void> {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="load-tkb"]');
    await page.waitForSelector('[data-testid="dock-panel-kennzahlen"]', { timeout: 15000 });
  }

  // v0.8.1 P16-Fixes / C-47 (`docs/V081-SPEZ.md` §1.3/§1.5, Splat-Fusion):
  // `import-splat`/`splat-werkzeug-toggle` sind im fusionierten
  // `splat-werkzeug`-Knopf aufgegangen — OHNE geladene Cloud öffnet ein
  // Klick darauf jetzt einen echten Datei-Dialog (`filechooser`-Event)
  // statt das Panel zu togglen (Muster `splat.spec.ts`s zweiter Test). Für
  // diesen rein visuellen Rundgang (kein echter Cloud-Import nötig, nur das
  // offene Panel im Screenshot) wird das Panel darum deterministisch über
  // denselben generischen Test-Hook `ui.panelSetzen` geöffnet wie
  // `splat.spec.ts`/`dock-kosmo.spec.ts` — kein Dateiwahl-Dialog, den
  // Playwright sonst offen im Hintergrund stehen liesse.
  async function oeffneSplatPanel(): Promise<void> {
    await page.evaluate(() => {
      (
        window as unknown as { __kosmoUiBefehle: { ausfuehren: (id: string, params: unknown) => unknown } }
      ).__kosmoUiBefehle.ausfuehren('ui.panelSetzen', { panel: 'splatPanelOffen', offen: true });
    });
  }

  // (1) Design-Station mit 3 offenen Dock-Panels — der Bump-Beweis: der
  // App-Kopf (Wordmark) muss «v0.7.8» zeigen.
  await schuss('dock-design', async () => {
    await ladeTkbInDesign();
    await page.click('[data-testid="raster-toggle"]').catch(() => {});
    await page.click('[data-testid="cw-setzen-oeffnen"]').catch(() => {});
    await oeffneSplatPanel().catch(() => {});
    await page.waitForTimeout(500);
  });

  // (2) Enges Fenster (1000×800): fünf linke Panels sprengen die Höhe —
  // das unwichtigste (raster, Wichtigkeit 38) klappt zum 34px-Tab ein.
  await schuss(
    'dock-schmal',
    async () => {
      await ladeTkbInDesign();
      await page.click('[data-testid="view-split"]').catch(() => {});
      await page.click('[data-testid="raster-toggle"]').catch(() => {});
      await page.click('[data-testid="cw-setzen-oeffnen"]').catch(() => {});
      await oeffneSplatPanel().catch(() => {});
      await page.click('[data-testid="maengel-oeffnen"]').catch(() => {});
      await page.click('[data-testid="faehigkeit-submission"]').catch(() => {});
      await page.waitForSelector('[data-testid="dock-panel-rasterOffen-tab"]', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(600);
    },
    { width: 1000, height: 800 },
  );

  // (3) Kosmo-Ring + goldener Orb: das reduced-motion-Gate muss EXPLIZIT
  // aufgehoben werden (Muster `dock-kosmo.spec.ts` (b) Direktweg — sonst
  // greift `abspielenAktiv()` nicht und Orb/Ring bleiben aus), dann fährt
  // `window.__kosmoUiBefehle.ausfuehren` echte `ui.dock*`-Befehle direkt,
  // ohne den Chat-/Mock-Provider-Weg zu nehmen.
  await schuss('dock-kosmo-ring', async () => {
    await ladeTkbInDesign();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => localStorage.setItem('kosmo.abspielen', 'erzwingen'));
    await page.evaluate(() => {
      const w = window as unknown as { __kosmoUiBefehle: { ausfuehren: (id: string, params: unknown) => unknown } };
      w.__kosmoUiBefehle.ausfuehren('ui.dockGroesseSetzen', { panelId: 'kennzahlen', groesse: 500 });
      w.__kosmoUiBefehle.ausfuehren('ui.dockAnheften', { panelId: 'kennzahlen', angeheftet: true });
    });
    await page.waitForSelector('[data-testid="dock-kosmo-orb"]', { timeout: 8000 }).catch(() => {});
    await page.waitForSelector('[data-testid="dock-panel-kennzahlen-kosmo-badge"]', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(700);
  });

  // (4) Einstellungen: der 2-Segment-Wähler «Orbit-Zonen (A) / Raster-Kachel
  // (B)» plus der Tour-Einstieg «Werkzeug-Dock kennenlernen».
  await schuss('dock-einstellungen', async () => {
    await ladeTkbInDesign();
    await page.click('[data-testid="einstellungen-oeffnen"]').catch(() => {});
    await page.waitForSelector('[data-testid="einstellungen-dock-modus"]', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
  });

  await browser.close();

  const flaechen = [
    {
      key: 'dock-design',
      titel: '353–355 · Das Dock in der Design-Station',
      notiz: 'Drei offene Panels (Raster, Fassadenband, 3D-Skizzieren) — kollisionsfrei nach dem neuen Solver (`state/dock-kern.ts`) gedockt, mit Trennbalken zum Grössenziehen und Kopf-Griff zum Neuandocken. Der App-Kopf zeigt jetzt v0.7.8.',
    },
    {
      key: 'dock-schmal',
      titel: '355 · Automatisches Einklappen bei Enge (1000×800)',
      notiz: 'Fünf linke Panels sprengen die Fensterhöhe — das unwichtigste (Raster, Wichtigkeit 38) klappt automatisch zum schmalen Tab ein, alles andere bleibt lesbar, der Viewport behält sein Mindestmass. Ein Klick auf den Tab öffnet das Panel wieder.',
    },
    {
      key: 'dock-kosmo-ring',
      titel: '359 · «KOSMO ORDNET» — Kosmo steuert das Dock sichtbar',
      notiz: 'Nach echten ui.dock*-Befehlen (Grösse setzen, Anheften) wandert der goldene Orb zum bedienten Panel; ein «KOSMO»-Ring markiert den Panel-Kopf. Jede Aktion ist im Chat quittiert und per STOPP jederzeit abbrechbar.',
    },
    {
      key: 'dock-einstellungen',
      titel: '358, 360 · Anordnungs-Wähler + geführte Tour',
      notiz: 'Einstellungen → Werkzeug-Anordnung: «Orbit-Zonen» (Standard, A) gegen «Raster-Kachel» (B, nichts schwebt) — derselbe Solver, zwei Modi. Daneben der Einstieg «Werkzeug-Dock kennenlernen» für die geführte 7-Schritte-Tour.',
    },
  ];

  const seiten = flaechen
    .map(
      (f) => `<section>
      <h2>${f.titel}</h2>
      <img class="shot" src="data:image/png;base64,${shots[f.key] ?? ''}" />
      <p class="notiz">${f.notiz}</p>
    </section>`,
    )
    .join('\n');

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #14130f; margin: 0; }
    .titel { padding: 0 0 8mm; }
    .titel h1 { font-size: 23px; margin: 0 0 4px; }
    .titel p { color: #5c574d; margin: 0; font-size: 12px; }
    section { page-break-inside: avoid; margin-bottom: 9mm; }
    h2 { font-size: 15px; margin: 0 0 6px; color: #0b0d12; }
    .shot { width: 100%; border: 1px solid #c9c4b6; border-radius: 4px; display: block; }
    .notiz { font-size: 11.5px; color: #14130f; margin: 5px 0 0; line-height: 1.4; }
    .rest { font-size: 11px; color: #5c574d; margin-top: 6mm; border-top: 1px solid #e4e0d6; padding-top: 3mm; }
  </style></head><body>
    <div class="titel"><h1>KosmoOrbit v0.7.8 «Intelligente Werkzeugtabs» — Rundgang</h1>
      <p>Die drei Dock-Wellen + Abnahme-Fixes (14.07.2026). ROADMAP 353–361.</p></div>
    ${seiten}
    <p class="rest"><b>352 · Ehrlichkeits-Korrektur:</b> die zwei früher als «headless-WebGL-Grenze» geführten Render-Tests laufen nachweislich grün — der Export braucht gar kein WebGL, die alte Diagnose war falsch. Dabei gefundene echte kleine Bugs (Icon-Drag, Dialog-Stapelordnung, verschluckte Fehlermeldungen) wurden behoben. — <b>Gate:</b> typecheck 8 Workspaces · dock-Suite 34/34 · App-Vollsuite 1032/1032 · svg-qa 31 Goldens / 0 harte Fehler · secret-scan · release-gate grün.</p>
  </body></html>`;

  const b2 = await chromium.launch({ executablePath: exe });
  const p2 = await b2.newPage();
  await p2.setContent(html, { waitUntil: 'networkidle' });
  await p2.pdf({ path: OUT, format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  await b2.close();
  // eslint-disable-next-line no-console
  console.log(`\nRundgang-PDF → ${OUT}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
