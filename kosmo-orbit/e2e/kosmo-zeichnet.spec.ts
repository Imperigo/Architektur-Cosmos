import { expect, test, type Page } from '@playwright/test';
import type { SzenarioSkript } from '@kosmo/ai';
import { kosmoChatSkript } from './sim/bausteine';

/**
 * v0.7.2 §7 «Kosmo zeichnet sichtbar» (Paket 06.8, Stufe 1 — Stream W3-E):
 * Das Abspiel-Overlay (`modules/design/KosmoZeichnet.tsx` + `state/
 * abspiel-ebene.ts`) läuft als VORSPIEL vor `KosmoPanel.applyPaket` — der
 * Apply selbst bleibt der unveränderte, atomare `runCommand`-Weg (§11).
 *
 * Beweise hier:
 *  (a) unter webdriver (JEDER normale Playwright-Lauf, insbesondere die
 *      kosmo-journey*-Specs) erscheint NIE ein Overlay — Direkt-Apply,
 *      atomar: EIN Undo räumt das ganze Paket.
 *  (b) erzwungen (Test-Hook `kosmo.abspielen='erzwingen'` hebt NUR die
 *      webdriver-Sperre auf, s. abspiel-ebene.ts; reduced-motion muss dafür
 *      per emulateMedia weggenommen werden, weil die Suite global mit
 *      `reducedMotion:'reduce'` fährt, s. playwright.config.ts) erscheint
 *      das Overlay, der Apply folgt DANACH — und bleibt EIN Undo-Schritt.
 *  (c) reduced-motion gewinnt gegen alles: selbst mit 'erzwingen' kein
 *      Overlay, Direkt-Apply.
 *  (d) ESC = Stopp: das Vorspiel löst sofort auf, der Apply läuft sofort;
 *      Leertaste toggelt die Pause (data-pausiert-Attribut).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => { doc: { byKind: (k: string) => { id: string }[] } };
    };
    __kosmoAbspiel: {
      aktiv: () => boolean;
      spuren: () => number;
      pausiert: () => boolean;
      stoppen: () => void;
    };
  }
}

const waende = (page: Page) => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);

async function tkbLaden(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  // TKB: aktive Storey + Wand-Aufbau = die App-Kontext-Defaults für
  // design_wandZeichnen. [Quelle: kosmo-scripted.spec.ts Z.32-33]
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible();
}

/** N Wand-Züge als EIN Paket (>1 Tool-Call ⇒ paket-card). y-versetzt, damit jede Wand echt entsteht. */
function wandPaket(id: string, n: number): SzenarioSkript {
  return {
    id,
    zuege: [
      {
        nutzerErwartung: 'wand',
        antwortText: 'Gerne — ich zeichne die Wände.',
        toolCalls: Array.from({ length: n }, (_, i) => ({
          name: 'design_wandZeichnen',
          args: { a: { x: 0, y: i * 1000 }, b: { x: 4000, y: i * 1000 } },
        })),
      },
    ],
  };
}

/**
 * Manuelle Variante von `kosmoChatSkript` (Muster kosmo-scripted.spec H-28):
 * Skript registrieren, Panel FRISCH mounten, Zug senden — aber das
 * «Anwenden» NICHT selbst klicken, damit der Test das Overlay zwischen
 * Klick und Apply beobachten kann. Liefert die paket-card.
 */
async function paketVorbereiten(page: Page, skriptId: string, skript: SzenarioSkript) {
  await page.evaluate(
    ({ skriptId, skript }) => {
      const w = window as unknown as { __kosmoSkripte?: Record<string, unknown> };
      w.__kosmoSkripte = { ...(w.__kosmoSkripte ?? {}), [skriptId]: skript };
      localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'scripted', skriptId }));
    },
    { skriptId, skript },
  );
  if (await page.locator('[data-testid="kosmo-input"]').isVisible()) {
    await page.locator('[data-testid="kosmo-panel-schliessen"]').click();
    await expect(page.locator('[data-testid="kosmo-input"]')).toBeHidden();
  }
  await page.click('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-input"]')).toBeVisible();
  await page.fill('[data-testid="kosmo-input"]', 'Zeichne bitte die Wände');
  await page.click('[data-testid="kosmo-send"]');
  const paket = page.locator('[data-testid="paket-card"]').last();
  await expect(paket).toBeVisible({ timeout: 15_000 });
  return paket;
}

test('(a) webdriver: Direkt-Apply unverändert atomar — kein Overlay, EIN Undo räumt das ganze Paket', async ({ page }) => {
  await tkbLaden(page);
  const vorher = await waende(page);

  // Gate-Beweis: unter webdriver (+ suiteweiter reduced-motion) ist die
  // Abspiel-Ebene AUS — genau der Pfad, den alle Journeys sehen.
  expect(await page.evaluate(() => window.__kosmoAbspiel.aktiv())).toBe(false);

  const protokoll = await kosmoChatSkript(page, 'kz-direkt-apply', wandPaket('kz-direkt-apply', 2), {
    nutzerTexte: ['Zeichne zwei Wände'],
  });
  expect(protokoll[0]!.proposals).toBe(2);
  expect(protokoll[0]!.fehler).toBeUndefined();

  // Kein Overlay erschienen (es rendert nur während einer laufenden Spur).
  await expect(page.locator('[data-testid="kosmo-zeichnet"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__kosmoAbspiel.spuren())).toBe(0);

  await expect.poll(() => waende(page)).toBe(vorher + 2);

  // Atomar: EIN Undo-Klick (DesignWorkspace `undo`) räumt BEIDE Wände.
  // [Quelle: plan-interaktion.spec.ts Z.92]
  await page.click('[data-testid="undo"]');
  await expect.poll(() => waende(page)).toBe(vorher);
});

test('(b) erzwungene Abspiel-Ebene: Overlay erscheint VOR dem Apply, zeichnet mit Chip — Apply folgt danach, EIN Undo-Schritt', async ({ page }) => {
  // Die Suite-Config deklariert global reducedMotion:'reduce'
  // (playwright.config.ts Z.30; kommt in dieser Umgebung zwar nicht im
  // Browser an — Befund s. Test (c) —, hier trotzdem EXPLIZIT auf
  // no-preference, damit dieser Test nie davon abhängt).
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await tkbLaden(page);
  // Test-Hook: hebt NUR die webdriver-Sperre auf (abspiel-ebene.ts).
  await page.evaluate(() => localStorage.setItem('kosmo.abspielen', 'erzwingen'));
  expect(await page.evaluate(() => window.__kosmoAbspiel.aktiv())).toBe(true);

  const vorher = await waende(page);
  const paket = await paketVorbereiten(page, 'kz-overlay', wandPaket('kz-overlay', 3));
  await paket.locator('[data-testid="apply-paket"]').click();

  // 1) Das Overlay erscheint — der Apply ist zu diesem Zeitpunkt noch NICHT
  //    gelaufen (Vorspiel dauert ≥ 3 × (320+120) ms, s. KosmoZeichnet.tsx).
  const overlay = page.locator('[data-testid="kosmo-zeichnet"]');
  await expect(overlay).toBeVisible();
  expect(await waende(page)).toBe(vorher);

  // 2) Der Etikett-Chip nennt den Schritt (summary «Wand …», UPPERCASE via CSS).
  await expect(page.locator('[data-testid="kosmo-zeichnet-chip"]')).toContainText(/Wand/i);

  // 3) Danach läuft der unveränderte atomare Apply; das Overlay blendet aus.
  await expect.poll(() => waende(page), { timeout: 20_000 }).toBe(vorher + 3);
  await expect(overlay).toHaveCount(0, { timeout: 5_000 });

  // 4) Undo-Atomarität trotz Vorspiel: EIN Undo räumt alle 3 Wände.
  await page.click('[data-testid="undo"]');
  await expect.poll(() => waende(page)).toBe(vorher);
});

test('(c) reduced-motion gewinnt gegen alles: selbst mit "erzwingen" kein Overlay — Direkt-Apply', async ({ page }) => {
  // reduced-motion EXPLIZIT emulieren: das `reducedMotion:'reduce'` der
  // Suite-Config kommt in dieser Umgebung nachweislich NICHT im Browser an
  // (matchMedia meldet no-preference — Befund dieses Streams; gleiches
  // Muster: orbit-start.spec.ts ruft emulateMedia ebenfalls selbst).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await tkbLaden(page);
  await page.evaluate(() => localStorage.setItem('kosmo.abspielen', 'erzwingen'));
  expect(await page.evaluate(() => window.__kosmoAbspiel.aktiv())).toBe(false);

  const vorher = await waende(page);
  const paket = await paketVorbereiten(page, 'kz-reduced', wandPaket('kz-reduced', 2));
  await paket.locator('[data-testid="apply-paket"]').click();

  await expect(paket.locator('[data-testid="apply-paket"]')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('[data-testid="kosmo-zeichnet"]')).toHaveCount(0);
  await expect.poll(() => waende(page)).toBe(vorher + 2);
});

test('(d) Leertaste pausiert, ESC stoppt: das Vorspiel löst sofort auf, der Apply läuft sofort', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await tkbLaden(page);
  await page.evaluate(() => localStorage.setItem('kosmo.abspielen', 'erzwingen'));

  const vorher = await waende(page);
  // 6 Schritte ⇒ Vorspiel ≥ ~2.6 s — genug Fenster für Pause + ESC.
  const paket = await paketVorbereiten(page, 'kz-esc', wandPaket('kz-esc', 6));
  await paket.locator('[data-testid="apply-paket"]').click();

  const overlay = page.locator('[data-testid="kosmo-zeichnet"]');
  await expect(overlay).toBeVisible();
  expect(await waende(page)).toBe(vorher);

  // Leertaste = Pause/Weiter (data-pausiert spiegelt den Store).
  await page.keyboard.press(' ');
  await expect(overlay).toHaveAttribute('data-pausiert', '1');
  await page.keyboard.press(' ');
  await expect(overlay).toHaveAttribute('data-pausiert', '0');

  // ESC = Stopp ⇒ Promise löst auf, der atomare Apply läuft SOFORT.
  await page.keyboard.press('Escape');
  await expect.poll(() => waende(page), { timeout: 10_000 }).toBe(vorher + 6);
  await expect(overlay).toHaveCount(0, { timeout: 5_000 });

  // Auch der ESC-Pfad bleibt EIN Undo-Schritt.
  await page.click('[data-testid="undo"]');
  await expect.poll(() => waende(page)).toBe(vorher);
});
