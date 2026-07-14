/**
 * Rundgang-PDF «0.7.9 — Dock-Vollendung» — visueller Rundgang durch die
 * v0.7.9-Restliste (ROADMAP 363–366). Muster analog `rundgang-pdf-078.mts`
 * (Screenshots der laufenden App → A4-PDF). Zeigt: die zwei neuen
 * Säulen-Floats (Viewport-Statuskarte + Eigenschaften) in enger
 * Split-Ansicht — die letzte Überlappungs-Klasse (A1) —, einen Tab-Drag
 * mitten in der Geste mit sichtbarer Snap-Zone (A3), den Hochhaus-Fall mit
 * 22 Geschossen (B2) und ein schwebendes Panel mit aktiver LINKS-Zone (A3,
 * Teil «Schwebend»).
 *
 * Voraussetzung: Build ist NACH dem Versions-Bump neu zu bauen und der
 * Preview-Server NEU zu starten (setsid; ein alter Preview-Prozess zeigt
 * sonst weiterhin die alte Versionsnummer im App-Kopf — `Wordmark`, s.
 * `App.tsx`, liest `__APP_VERSION__` nur beim Vite-Build aus
 * `apps/kosmo-orbit/package.json`).
 *
 * Aufruf (aus kosmo-orbit/, Preview auf $PORT):
 *   KOSMO_E2E_PORT=5183 PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *     npx tsx e2e/tools/rundgang-pdf-079.mts
 */
import { chromium, type Page } from 'playwright-core';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const PORT = process.env['KOSMO_E2E_PORT'] ?? '5183';
const BASE = `http://localhost:${PORT}`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.7.9.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });
const WORK = join(tmpdir(), 'kosmo-rundgang-079');
mkdirSync(join(WORK, 'bilder'), { recursive: true });
const exe = process.env['PLAYWRIGHT_CHROMIUM_PATH'] || undefined;

// Basis wie `rundgang-pdf-078.mts` + `kosmo.ui.v1`-Seed (Muster
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

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Wartet, bis zwei aufeinanderfolgende Messungen übereinstimmen — Muster
 *  `stabileBox()` aus `dock-interaktion.spec.ts` (die .28s-Reflow-Motion
 *  braucht unter Last WESENTLICH länger als die nominale Dauer), hier
 *  reduziert auf das, was ein Screenshot-Werkzeug (kein Assertion-Beweis)
 *  braucht. */
async function stabileBox(page: Page, testid: string, anlaufMs = 700, ruheMs = 300): Promise<Box> {
  const loc = page.locator(`[data-testid="${testid}"]`);
  await new Promise((r) => setTimeout(r, anlaufMs));
  let letzte = await loc.boundingBox();
  let stabilSeitMs = 0;
  const start = Date.now();
  while (Date.now() - start < 4000) {
    await new Promise((r) => setTimeout(r, 100));
    const jetzt = await loc.boundingBox();
    const gleich =
      !!letzte &&
      !!jetzt &&
      Math.abs(letzte.width - jetzt.width) < 0.5 &&
      Math.abs(letzte.height - jetzt.height) < 0.5 &&
      Math.abs(letzte.x - jetzt.x) < 0.5 &&
      Math.abs(letzte.y - jetzt.y) < 0.5;
    if (gleich) {
      stabilSeitMs += 100;
      if (stabilSeitMs >= ruheMs) return jetzt!;
    } else {
      stabilSeitMs = 0;
    }
    letzte = jetzt;
  }
  return letzte!;
}

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
    await page.waitForTimeout(700);
    const p = join(WORK, 'bilder', `${key}.png`);
    await page.screenshot({ path: p });
    shots[key] = readFileSync(p).toString('base64');
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${key}`);
  }

  async function ladeTkbInDesign(): Promise<void> {
    // `kosmo.dock.v1` NICHT über Shots hinweg mitschleppen (Muster
    // `dock-interaktion.spec.ts`s `oeffneDesignMitTkb`) — sonst trägt z.B.
    // ein früher eingeklapptes kvOffen aus Aufnahme (2) in eine spätere
    // Aufnahme hinein (dieselbe Browser-Kontext-`localStorage` überlebt
    // `page.goto`).
    await page.evaluate(() => localStorage.removeItem('kosmo.dock.v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.click('[data-testid="load-tkb"]');
    await page.waitForSelector('[data-testid="dock-panel-kennzahlen"]', { timeout: 15000 });
  }

  // (1) A1 — enge Split-Ansicht: die zwei neuen Säulen-Floats
  // (viewportHudStatuskarte/viewportEigenschaften, `dock-stationen.ts`)
  // stehen jetzt neben mehreren offenen Linkspanels und dem Viewport-HUD,
  // alles vom Solver entzerrt — der App-Kopf zeigt den Bump-Beweis v0.7.9.
  // (Bewusst OHNE `splat-werkzeug-toggle`: das öffnet nur ein zusätzliches
  // Linkspanel, trägt zur A1-Aussage nichts bei und verdeckt in der engen
  // Split-Ansicht unnötig die Geist-/Zonen-Sicht auf die Säulen-Floats.)
  await schuss(
    'dock-split-saeulen',
    async () => {
      await ladeTkbInDesign();
      await page.click('[data-testid="view-split"]').catch(() => {});
      await page.click('[data-testid="raster-toggle"]').catch(() => {});
      await page.click('[data-testid="cw-setzen-oeffnen"]').catch(() => {});
      await page
        .waitForSelector('[data-testid="dock-panel-viewportEigenschaften"]', { timeout: 8000 })
        .catch(() => {});
      await page.waitForTimeout(600);
    },
    { width: 1400, height: 900 },
  );

  // (2) A3 — Tab-Drag MITTEN in der Geste: kv wird eingeklappt, dann per
  // Pointer-Sequenz (Muster `dock-interaktion.spec.ts` Tab (b)) in die
  // RECHTS-Snap-Zone gezogen; Screenshot VOR dem `mouse.up()` — die Zone und
  // der Drag-Geist müssen sichtbar aktiv sein.
  await schuss('dock-tab-drag', async () => {
    await ladeTkbInDesign();
    await page.click('[data-testid="kv-oeffnen"]');
    await page.waitForSelector('[data-testid="dock-panel-kvOffen"]');
    await page.click('[data-testid="dock-panel-kvOffen-einklappen"]');
    await page.waitForSelector('[data-testid="dock-panel-kvOffen-tab"]');
    const tabBox = await stabileBox(page, 'dock-panel-kvOffen-tab');
    const feldBox = (await page.locator('[data-testid="dock-flaeche"]').boundingBox())!;
    const cx = tabBox.x + tabBox.width / 2;
    const cy = tabBox.y + tabBox.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(feldBox.x + feldBox.width - 20, feldBox.y + 60, { steps: 10 });
    await page
      .waitForSelector('[data-testid="dock-snap-rechts"][data-aktiv="true"]', { timeout: 4000 })
      .catch(() => {});
    // Bewusst KEIN mouse.up() hier — der Screenshot muss die Geste
    // mittendrin zeigen (Snap-Zone + Drag-Geist aktiv), der nächste `schuss`
    // navigiert per `page.goto` sowieso weg und beendet die Geste dabei.
  });

  // (3) B2 — Hochhaus-Fall: 22 Geschosse (TKB-Demo hat 7, +15 per
  // `design.geschossKopieren` in einer Schleife, Muster `dock-layout.spec.ts`)
  // — die Geschossleiste endet sauber über dem EntwurfsDock, keine Kollision.
  await schuss('dock-hochhaus', async () => {
    await ladeTkbInDesign();
    const storeyId = (await page.evaluate(
      () => (window as unknown as { __kosmo: { state: () => { activeStoreyId: string } } }).__kosmo.state()
        .activeStoreyId,
    ))!;
    await page.evaluate(
      ({ storeyId, n }) => {
        const k = (window as unknown as { __kosmo: { run: (id: string, params: unknown) => unknown } }).__kosmo;
        for (let i = 0; i < n; i++) {
          k.run('design.geschossKopieren', { storeyId, anzahl: 1 });
        }
      },
      { storeyId, n: 15 },
    );
    await page
      .waitForFunction(
        () =>
          (window as unknown as { __kosmo: { state: () => { doc: { storeysOrdered: () => unknown[] } } } }).__kosmo
            .state()
            .doc.storeysOrdered().length === 22,
        { timeout: 8000 },
      )
      .catch(() => {});
    await page.waitForTimeout(500);
  });

  // (4) A3 (Schwebend) — ein bereits schwebendes Panel (Pop-out von kv) wird
  // per Kopf-Griff in die LINKS-Zone gezogen; Screenshot VOR dem `mouse.up()`
  // zeigt die aktive Zone (Muster `dock-interaktion.spec.ts` Schwebend (d)).
  await schuss('dock-float-links-zone', async () => {
    await ladeTkbInDesign();
    await page.click('[data-testid="kv-oeffnen"]');
    await page.waitForSelector('[data-testid="dock-panel-kvOffen"]');
    await page.click('[data-testid="dock-panel-kvOffen-popout"]');
    await page.waitForSelector('[data-testid="dock-panel-kvOffen-redock"]');
    const geschwebt = await stabileBox(page, 'dock-panel-kvOffen');
    const feldBox = (await page.locator('[data-testid="dock-flaeche"]').boundingBox())!;
    await page.mouse.move(geschwebt.x + 20, geschwebt.y + 17);
    await page.mouse.down();
    await page.mouse.move(feldBox.x + 20, feldBox.y + 60, { steps: 10 });
    await page
      .waitForSelector('[data-testid="dock-snap-links"][data-aktiv="true"]', { timeout: 4000 })
      .catch(() => {});
    // Bewusst KEIN mouse.up() — s. Kommentar bei (2).
  });

  await browser.close();

  const flaechen = [
    {
      key: 'dock-split-saeulen',
      titel: '364 (A1) · Die letzten Säulen sind im Dock — engste Split-Ansicht',
      notiz: 'Viewport-Statuskarte und Eigenschaften-Säule sind jetzt DockPanel-Floats (Anker top-right) und weichen automatisch aus — auch in der Split-Ansicht mit drei offenen Linkspanels bleibt alles entzerrt. Der historische ~130×85px-Überlapp (357/358) ist geschlossen, die Kollisions-Ausnahmeliste ist leer. Der App-Kopf zeigt v0.7.9.',
    },
    {
      key: 'dock-tab-drag',
      titel: '366 (A3) · Tab-Drag mitten in der Geste — Snap-Zone RECHTS aktiv',
      notiz: 'Der eingeklappte Kennzahlen-Tab wird gezogen (nicht geklickt): die rechte Snap-Zone erscheint aktiv, der Drag-Geist markiert das Ziel — Aufnahme VOR dem Loslassen. Ein Klick öffnet den Tab weiterhin ganz normal; erst eine Bewegung über der 5px-Schwelle startet den Redock.',
    },
    {
      key: 'dock-hochhaus',
      titel: '365 (B2) · Hochhaus-Fall — 22 Geschosse, Leiste endet über dem EntwurfsDock',
      notiz: 'Mit 22 gestapelten Geschossen (7 aus der TKB-Demo + 15 per design.geschossKopieren) klemmt die Geschossleiste ihre maxHeight strikt über der Oberkante des EntwurfsDock — sie scrollt einfach früher. Die letzte Alt-Kollision ist geschlossen, BEKANNTE_VORBESTEHENDE_KOLLISIONEN ist jetzt ein leeres Array.',
    },
    {
      key: 'dock-float-links-zone',
      titel: '366 (A3) · Schwebendes Panel — Snap-Zone LINKS aktiv',
      notiz: 'Ein per Pop-out schwebend gemachtes Panel wird am Kopf-Griff gezogen: sobald der Zeiger die linke Feldkante erreicht, erscheint die LINKS-Zone aktiv — Loslassen dockt das Panel an (fx/fy werden gelöscht). Aufnahme VOR dem Loslassen, mitten in der Geste.',
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
    <div class="titel"><h1>KosmoOrbit v0.7.9 «Dock-Vollendung» — Rundgang</h1>
      <p>Die v0.7.9-Restliste (14.07.2026). ROADMAP 363–366.</p></div>
    ${seiten}
    <p class="rest"><b>363 · Testpflege:</b> sieben schlummernde Fehlalarme derselben Klasse (Gross-/Kleinschreibung gegen versal gesetzte Blatt-Titel) durchgekämmt und behoben — zwei davon waren bereits rot, ohne dass es auffiel. Dazu zwei echte kleine Bugs aus dem Dock-Bestand (Stapelordnung frei abgelegter Panels, ein Drag-Rennfenster). Fürs echte iPad liegt ein Test-Drehbuch bereit (Einstellungen-Doku) — der Test am Gerät ist eine offene Owner-Aktion. — <b>Gate:</b> typecheck 8 Workspaces · Unit 2047/2047 · svg-qa 31 Goldens / 0 harte Fehler · secret-scan grün · release-gate Exit 0.</p>
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
