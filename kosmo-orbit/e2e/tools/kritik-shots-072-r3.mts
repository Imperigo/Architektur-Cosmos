/**
 * Kritik-Shots v0.7.2 Runde 3 — nach W3-F (Cursor + Charakter), W4-G
 * (Companion) und W4-H (Einstellungen/Restfixe): Companion mit echtem
 * Auftrag (Test-Hook `__kosmoCompanion`), Cursor-Ebene default + precision-
 * Zone, Einstellungen «Bewegung & Klang», Charakter-Fallback-Orb (=
 * KosmoOrb im Hauptfenster), Header breit (volle Phasen-Labels) vs. schmal
 * (Nummern-Pills) — orbit UND paper-Kontrolle.
 * Läuft gegen den frischen Preview auf :5183 (Bundle==dist vorher geprüft).
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/kritik-shots-072-r3.mts
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/rundgang/kritik-072';
mkdirSync(OUT, { recursive: true });
const URL_ = 'http://localhost:5183';

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });

async function frisch(
  thema: 'orbit' | 'paper',
  breite = 1440,
  extra: Record<string, string> = {},
  hash = '',
): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(
    (init) => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.starterGuide.done', '1');
      localStorage.setItem('kosmo.thema', init.thema);
      for (const [k, v] of Object.entries(init.extra)) localStorage.setItem(k, v);
    },
    { thema, extra },
  );
  await page.goto(URL_ + hash);
  await page.waitForTimeout(1600);
  return page;
}

// 1 — Companion (#companion) mit echtem Auftragsbuch-Eintrag, orbit + paper
for (const thema of ['orbit', 'paper'] as const) {
  const page = await frisch(thema, 900, {}, '/#companion');
  await page.evaluate(() => {
    const c = (window as never as Record<string, any>)['__kosmoCompanion'];
    c?.erfasseAuftrag?.('Fassadenschnitt Ost als Werkplan ableiten');
  });
  // Kritik-3-Auflage 2: auf die echte Karte warten, nicht blind schiessen —
  // sonst zeigt der Shot nur den Leerzustand.
  await page.locator('[data-testid^="companion-job-"]').first().waitFor({ timeout: 5000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/r3-${thema}-companion.png` });
  await page.context().close();
}

// 2 — Einstellungen «Bewegung & Klang» (orbit)
{
  const page = await frisch('orbit');
  await page.click('[data-testid="einstellungen-oeffnen"]');
  await page.waitForTimeout(600);
  const sounds = page.locator('[data-testid="einstellung-sounds"]');
  await sounds.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/r3-orbit-einstellungen-bewegung-klang.png` });
  await page.context().close();
}

// 3 — Cursor-Ebene: default über der Zentrale + precision über dem Plan
{
  const page = await frisch('orbit', 1440, { 'kosmo.eigencursor': '1' });
  // Kritik-3-Auflage 1: unter webdriver ist die Ebene per Hartvertrag AUS —
  // für den Sichtbeweis den Test-Hook nutzen (derselbe wie cursor-ebene.spec).
  await page.evaluate(() => {
    (window as never as { __kosmoCursor?: { aktivieren(): void } }).__kosmoCursor?.aktivieren();
  });
  await page.mouse.move(720, 450);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/r3-orbit-cursor-default.png` });
  await page.click('[data-testid="module-design"]');
  await page.waitForTimeout(1200);
  // Grundriss-Sicht, Maus über den Plan (data-cursor-zone="praezision")
  await page.click('[data-testid="view-2d"]').catch(() => {});
  await page.waitForTimeout(600);
  await page.mouse.move(700, 500);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/r3-orbit-cursor-precision-plan.png` });
  await page.context().close();
}

// 4 — Header: breit 1600 (volle Phasen-Labels) vs. schmal 1400 (Nummern-Pills)
{
  const breit = await frisch('orbit', 1600);
  await breit.locator('header').first().screenshot({ path: `${OUT}/r3-orbit-header-1600.png` });
  await breit.context().close();
  const schmal = await frisch('orbit', 1400);
  await schmal.locator('header').first().screenshot({ path: `${OUT}/r3-orbit-header-1400-pills.png` });
  await schmal.context().close();
}

// 5 — Charakter-Fallback: der Orb im Hauptfenster im dispatching-Zustand
{
  const page = await frisch('orbit');
  await page.evaluate(() => {
    (window as never as { __kosmoStatus?: { setzeZustand(z: string): void } }).__kosmoStatus?.setzeZustand('dispatching');
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/r3-orbit-charakter-fallback-orb.png` });
  await page.context().close();
}

await browser.close();
console.log('kritik-shots-072-r3: Shots →', OUT);
