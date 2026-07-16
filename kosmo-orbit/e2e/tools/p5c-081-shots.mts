import { chromium } from '@playwright/test';

/**
 * v0.8.1 / P5c (systematischer Zwei-Stufen-Rollout, `docs/V081-SPEZ.md`
 * §2.4 P5c) — Abnahme-Screenshots von vier repräsentativen migrierten
 * Panels in beiden Stufen (Muster `p5b-081-shots.mts`). Läuft gegen den
 * eigenen Preview-Build auf :5174.
 *
 * 8 Screenshots (4 Panels × offen/kompakt):
 *  1-2  p5c-081-maengel-{offen,kompakt}.png     — Mängel (Tabellenartig,
 *       EIN Tab, Kernkennzahl «N Einträge», min bewusst UNVERÄNDERT →
 *       Kompakt-Stufe floort ehrlich auf 180px, s. Abschlussbericht).
 *  3-4  p5c-081-kv-{offen,kompakt}.png           — Kostenschätzung
 *       (Kernkennzahl = Kostentotal-Summe, min GESENKT → Kompakt-Stufe
 *       schrumpft spürbar).
 *  5-6  p5c-081-splat-{offen,kompakt}.png        — Splat (ECHTER Zwei-
 *       Tab-Schnitt Bearbeiten/Video-Import, hier ohne geladene Cloud
 *       geöffnet → Default-Tab «Video-Import»).
 *  7-8  p5c-081-inspector-{offen,kompakt}.png    — Inspector (Kernkennzahl
 *       Elementtyp + Kurzbezeichnung, z.B. «WAND · …»).
 */

const BASE = process.env['KOSMO_SHOT_URL'] ?? 'http://localhost:5174';
const OUT = 'test-results';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function neueSeite() {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.goto(BASE);
  await page.waitForSelector('[data-testid="load-tkb"]', { timeout: 25_000 });
  await page.click('[data-testid="load-tkb"]');
  await page.waitForTimeout(2600);
  return page;
}

// 1+2) Mängel
{
  const page = await neueSeite();
  await page.click('[data-testid="maengel-oeffnen"]');
  const panel = page.locator('[data-testid="maengel-panel"]');
  await panel.waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
  await panel.screenshot({ path: `${OUT}/p5c-081-maengel-offen.png` });

  await page.click('[data-testid="maengel-panel-koerper-umschalten"]');
  await page.waitForTimeout(300);
  await panel.screenshot({ path: `${OUT}/p5c-081-maengel-kompakt.png` });
  await page.close();
}

// 3+4) Kostenschätzung (KV)
{
  const page = await neueSeite();
  await page.click('[data-testid="kv-oeffnen"]');
  const panel = page.locator('[data-testid="kv-panel"]');
  await panel.waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
  await panel.screenshot({ path: `${OUT}/p5c-081-kv-offen.png` });

  await page.click('[data-testid="kv-panel-koerper-umschalten"]');
  await page.waitForTimeout(300);
  await panel.screenshot({ path: `${OUT}/p5c-081-kv-kompakt.png` });
  await page.close();
}

// 5+6) Splat (ohne geladene Cloud — echter Zwei-Tab-Schnitt, Default «Video-Import»)
{
  const page = await neueSeite();
  await page.evaluate(() => {
    (
      window as unknown as { __kosmoUiBefehle: { ausfuehren: (id: string, params: unknown) => unknown } }
    ).__kosmoUiBefehle.ausfuehren('ui.panelSetzen', { panel: 'splatPanelOffen', offen: true });
  });
  const panel = page.locator('[data-testid="splat-panel"]');
  await panel.waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
  await panel.screenshot({ path: `${OUT}/p5c-081-splat-offen.png` });

  await page.click('[data-testid="splat-panel-koerper-umschalten"]');
  await page.waitForTimeout(300);
  await panel.screenshot({ path: `${OUT}/p5c-081-splat-kompakt.png` });
  await page.close();
}

// 7+8) Inspector (Wand zeichnen + auswählen)
{
  const page = await neueSeite();
  await page.click('[data-testid="view-2d"]');
  await page.evaluate(() => {
    const k = (window as unknown as {
      __kosmo: {
        run: (id: string, p: unknown) => { patches: { id: string }[] };
        state: () => { activeStoreyId: string | null; doc: { byKind: (k: string) => { id: string; name?: string }[] } };
      };
    }).__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const r = k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 8000, y: 0 },
      assemblyId: aw.id,
    });
    (window as unknown as { __kosmo: { state: () => { select: (ids: string[]) => void } } }).__kosmo
      .state()
      .select([r.patches[0]!.id]);
  });
  const panel = page.locator('[data-testid="inspector"]');
  await panel.waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
  await panel.screenshot({ path: `${OUT}/p5c-081-inspector-offen.png` });

  await page.click('[data-testid="inspector-koerper-umschalten"]');
  await page.waitForTimeout(300);
  await panel.screenshot({ path: `${OUT}/p5c-081-inspector-kompakt.png` });
  await page.close();
}

await browser.close();
console.log('OK — 8 Screenshots geschrieben nach test-results/p5c-081-*.png');
