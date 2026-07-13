/**
 * Rundgang-PDF «0.7.6 — Kosmo-Viz» — visueller Rundgang durch die sechs
 * ClaudeDesign-Flächen (Teil B). Muster analog `rundgang-pdf-075.mts`
 * (HTML → PDF über Chromiums print), aber UI-fokussiert: je Fläche ein
 * frischer Screenshot aus der laufenden App + eine ehrliche Notiz. Das
 * Report-Dossier wird als eingebettetes Golden-SVG gezeigt (das Panel ist
 * bewusst noch nicht ins Publish-Menü eingehängt — 0.7.7).
 *
 * Aufruf (aus kosmo-orbit/, Preview muss auf $PORT laufen):
 *   KOSMO_E2E_PORT=5188 PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *     npx tsx e2e/tools/rundgang-pdf-076.mts
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const PORT = process.env['KOSMO_E2E_PORT'] ?? '5188';
const BASE = `http://localhost:${PORT}`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.7.6.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
const WORK = join(tmpdir(), 'kosmo-rundgang-076');
mkdirSync(join(WORK, 'bilder'), { recursive: true });
const exe = process.env['PLAYWRIGHT_CHROMIUM_PATH'] || undefined;

type Flaeche = { key: string; titel: string; cap: string; notiz: string };
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
    await page.waitForTimeout(1200);
    const p = join(WORK, 'bilder', `${key}.png`);
    await page.screenshot({ path: p });
    shots[key] = readFileSync(p).toString('base64');
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${key}`);
  }

  // Onboarding-Wizard: onboarded-Flag zurücksetzen, damit der Assistent erscheint.
  await schuss('onboarding', async () => {
    await page.evaluate(() => localStorage.removeItem('kosmo.onboarded'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="onboarding"]', { timeout: 15000 }).catch(() => {});
  });
  // Viewport-Chrome (Design-Station, orbit-Theme).
  await schuss('viewport', async () => {
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="module-design"]').catch(() => {});
    await page.waitForSelector('[data-testid="viewport-modus-badge"]', { timeout: 15000 }).catch(() => {});
  });
  // Datenstationen — Referenz-Tabelle.
  await schuss('daten', async () => {
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="module-data"]').catch(() => {});
    await page.click('[data-testid="tab-referenzen"]').catch(() => {});
    await page.waitForSelector('[data-testid="ref-card"]', { timeout: 15000 }).catch(() => {});
  });
  // Vis-Kuratierfläche.
  await schuss('vis', async () => {
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="module-vis"]').catch(() => {});
    await page.click('[data-testid="vis-kuratier-toggle"]').catch(() => {});
    await page.waitForTimeout(600);
  });
  // Companion — orb-zentrierte Vollansicht (#companion).
  await schuss('companion', async () => {
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.goto(`${BASE}#companion`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="companion"]', { timeout: 15000 }).catch(() => {});
  });

  await browser.close();

  const dossierSvg = readFileSync(`${ROOT}packages/kosmo-kernel/test/golden/dossier.svg`, 'utf8');

  const flaechen: Flaeche[] = [
    { key: 'viewport', titel: '336 · 3D-Viewport-Chrome', cap: 'Design-Station, Kosmos-Theme (orbit)', notiz: 'Drei Bearbeitungsmodi (Modellieren/Kamera/Review) mit Rollenfarbe + Badge, Glass-HUD mit echten Kamera-/Szene-Werten, Achsenkreuz mit Kompass-Label, Zoom-Steuerung. Overlays liegen als pointer-transparente Schale über der Live-three.js-Bühne — Klicks auf Zeichnung und Design-Möblierung gehen durch.' },
    { key: 'vis', titel: '337 · Vis-Kuratierfläche', cap: 'KosmoVis, Kuratier-Fläche geöffnet', notiz: '3-spaltiges Varianten-Raster mit Filter (Alle/Favoriten/Verworfen), Umschalter Raster/Vergleich, A/B-Parameter-Diff-Tabelle und Inspektor (Herkunft + Bewertung). Ehrlich: keine erfundene Seed-Nummer, Sterne aus den vorhandenen Qualitäts-Werten.' },
    { key: 'companion', titel: '338 · Companion (orb-zentriert)', cap: 'Companion-Vollansicht (#companion)', notiz: 'Grosser Kosmo-Orb mit neun echten Zuständen im Mittelpunkt, Agenten- und Auftragsliste. Neu: abgestuftes Governance-Gate (Einmal / Für den Job / Nachfragen / Ablehnen) — jede Stufe mit echter Wirkung.' },
    { key: 'daten', titel: '339 · Datenstationen-Tabelle', cap: 'KosmoData, Referenzkatalog', notiz: 'Referenzen als Tabelle (ID/Objekt/Quelle/Epoche/Material/Status) mit Quellen- und Epochen-Leiste. Ehrlich: Epoche aus dem Baujahr abgeleitet, Status Indexiert/Sync/Lokal aus vorhandenen Feldern konstruiert.' },
    { key: 'onboarding', titel: '340 · Onboarding-Wizard', cap: 'Erststart-Assistent', notiz: '4-Schritt-Assistent (Konto & Büro, Kosmo-Zentrale koppeln, Modelle & Core laden, erstes Projekt) mit klickbarem Fortschritts-Stepper. Hardware-Kopplung und Download benennen offen, was erst mit der Zentrale kommt.' },
  ];

  const seiten = flaechen
    .map(
      (f) => `<section>
      <h2>${f.titel}</h2>
      <img class="shot" src="data:image/png;base64,${shots[f.key] ?? ''}" />
      <p class="cap">${f.cap}</p>
      <p class="notiz">${f.notiz}</p>
    </section>`,
    )
    .join('\n');

  const dossierSeite = `<section>
      <h2>341 · Report-Dossier (Golden-Beleg)</h2>
      <div class="svgwrap">${dossierSvg}</div>
      <p class="cap">packages/kosmo-kernel/test/golden/dossier.svg — additiver Deriver</p>
      <p class="notiz">Neues, mehrteiliges Projekt-Dossier (A4, reiner Kernel-Deriver, harte Farbliterale, byte-stabiles Golden). SVG-/PDF-Export vorhanden; das Publish-Panel wird in 0.7.7 ins Menü eingehängt. Die fünf bestehenden Report-Blätter bleiben unverändert.</p>
    </section>`;

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #14130f; margin: 0; }
    .titel { padding: 0 0 10mm; }
    .titel h1 { font-size: 24px; margin: 0 0 4px; }
    .titel p { color: #5c574d; margin: 0; font-size: 12px; }
    section { page-break-inside: avoid; margin-bottom: 10mm; }
    h2 { font-size: 15px; margin: 0 0 6px; color: #0b0d12; }
    .shot { width: 100%; border: 1px solid #c9c4b6; border-radius: 4px; display: block; }
    .svgwrap { width: 62%; margin: 0 auto; border: 1px solid #c9c4b6; }
    .svgwrap svg { width: 100%; height: auto; display: block; }
    .cap { font-size: 10.5px; color: #8f897b; margin: 4px 0 2px; font-family: 'IBM Plex Mono', monospace; }
    .notiz { font-size: 11.5px; color: #14130f; margin: 0; line-height: 1.4; }
  </style></head><body>
    <div class="titel"><h1>KosmoOrbit v0.7.6 «Kosmo-Viz» — Rundgang</h1>
      <p>ClaudeDesign Teil B: die sechs Flächen in den echten Stack (13.07.2026). Additives Kosmos-Fundament (335), Wellen 336–341.</p></div>
    ${seiten}
    ${dossierSeite}
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
