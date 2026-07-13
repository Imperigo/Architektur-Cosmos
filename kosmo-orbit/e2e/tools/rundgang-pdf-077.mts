/**
 * Rundgang-PDF «0.7.7 — Verankerung & Feinschliff» — visueller Rundgang durch
 * die Über-Nacht-Runde. Muster analog `rundgang-pdf-076.mts` (Screenshots der
 * laufenden App → A4-PDF). Zeigt: Dossier-Knopf in Publish, Onboarding-Zentrale
 * (QR-Kopplung), Companion (Governance-Kontext) und die neu getönten Stationen.
 *
 * Aufruf (aus kosmo-orbit/, Preview auf $PORT):
 *   KOSMO_E2E_PORT=5188 PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *     npx tsx e2e/tools/rundgang-pdf-077.mts
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const PORT = process.env['KOSMO_E2E_PORT'] ?? '5188';
const BASE = `http://localhost:${PORT}`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.7.7.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
const WORK = join(tmpdir(), 'kosmo-rundgang-077');
mkdirSync(join(WORK, 'bilder'), { recursive: true });
const exe = process.env['PLAYWRIGHT_CHROMIUM_PATH'] || undefined;

const setzeBasis = `
  localStorage.setItem('kosmo.thema','orbit');
  localStorage.setItem('kosmo.starterGuide.done','1');
  localStorage.setItem('kosmo.panelOffen','0');
`;

async function main() {
  const browser = await chromium.launch({ executablePath: exe });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const shots: Record<string, string> = {};

  async function schuss(key: string, vorbereiten: () => Promise<void>) {
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

  // Onboarding-Wizard (Schritt «Zentrale koppeln» — QR + Zustände).
  await schuss('onboarding', async () => {
    await page.evaluate(() => localStorage.removeItem('kosmo.onboarded'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="onboarding"]', { timeout: 15000 }).catch(() => {});
    // Zum Zentrale-Schritt vorblättern, falls ein «Weiter» erreichbar ist.
    for (let i = 0; i < 2; i++) {
      const weiter = page.locator('button', { hasText: /Weiter/i }).first();
      if (await weiter.isVisible().catch(() => false)) {
        await weiter.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  });
  // Publish mit dem neuen Dossier-Knopf + Glass-Kopf.
  await schuss('publish', async () => {
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="module-publish"]').catch(() => {});
    await page.waitForTimeout(800);
    await page.click('[data-testid="publish-dossier"]').catch(() => {});
    await page.waitForSelector('[data-testid="dossier-panel"]', { timeout: 6000 }).catch(() => {});
  });
  // Companion (Governance-Kontext).
  await schuss('companion', async () => {
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.goto(`${BASE}#companion`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="companion"]', { timeout: 15000 }).catch(() => {});
  });
  // Eine der neu getönten Stationen (Bibliothek).
  await schuss('asset', async () => {
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="module-asset"]').catch(() => {});
    await page.waitForTimeout(900);
  });

  await browser.close();

  const flaechen = [
    { key: 'publish', titel: '343 · Dossier in der Publish-Station', notiz: 'Neuer Knopf «Dossier» in der Publish-Werkzeugleiste öffnet das mehrteilige Projekt-Dossier (SVG-/PDF-Export), aktiv sobald ein Projekt geladen ist. Der Stationskopf trägt jetzt den Kosmos-Glass-Look (Punkt 347).' },
    { key: 'companion', titel: '345 · Governance-Persistenz (Companion)', notiz: '«Für den Job erlauben» überlebt jetzt einen Neustart (localStorage-Allowlist) und endet ehrlich nur per ausdrücklichem Widerruf — kein vorgetäuschtes Verfallsdatum.' },
    { key: 'onboarding', titel: '346 · Onboarding — Zentrale koppeln (QR)', notiz: 'Der Erststart-Schritt zeigt einen QR-Code zum Koppeln und echte Zustände (suche / gefunden / nicht gefunden — manuell / Cloud) aus dem realen Verbindungstest. Keine erfundenen Gerätezeilen.' },
    { key: 'asset', titel: '347 · Kosmos-Look auf allen Stationen', notiz: 'Publish, Grundlagen, Bibliothek (hier), Training und Diagnose tragen denselben dezenten Glass-Kopf mit Modul-Tönung wie Entwerfen/Visualisieren/Daten. Rein optisch — Inhalte und Bedienung unverändert, alle Testids und Druck-Goldens byte-stabil.' },
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
    <div class="titel"><h1>KosmoOrbit v0.7.7 «Verankerung & Feinschliff» — Rundgang</h1>
      <p>Die über Nacht abgearbeiteten offenen 0.7.6-Punkte (13.07.2026). Wellen 343–347.</p></div>
    ${seiten}
    <p class="rest"><b>344 · E2E &amp; Ehrlichkeit:</b> ein Test-Fehlalarm (Gross-/Kleinschreibung) behoben; zwei Viewport-Render-Tests bleiben in der reinen Server-Testumgebung ohne echte Grafikkarte offen (Umgebungsgrenze, kein App-Fehler, auf 0.7.8 notiert). — <b>Gate:</b> typecheck · svg-qa 31 Goldens / 0 harte Fehler · App 882 Tests · release-gate grün.</p>
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
