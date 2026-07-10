import { expect, test, type Page } from '@playwright/test';
import type { SzenarioSkript } from '@kosmo/ai';

/**
 * v0.6.8 («Kosmo sieht mit», Owner-Nachtrag) — Kosmo ist visuell immer dabei.
 * Deckt den ECHTEN App-Pfad ab (KosmoPanel → ChatSession → ScriptedProvider,
 * Muster `kosmo-scripted.spec.ts`/`kosmo-ui-bruecke.spec.ts`):
 *  1. Auto-Blick-Zeile «Kosmo sieht: ‹KosmoDesign›» beim Senden in der
 *     Design-Station (Toggle explizit AN — der Default bleibt für
 *     `scripted`/`mock` bewusst AUS, s. `KosmoPanel.tsx istVisionFaehig`,
 *     damit KEINE bestehende ScriptedProvider-Suite unbemerkt einen echten
 *     Viewport-Capture pro Zug bekommt).
 *  2. Toggle AUS → keine Blick-Zeile.
 *  3. Nach einem Stationswechsel enthält der Ringpuffer (`state/kosmo-blick.ts`)
 *     weiterhin den Blick der vorherigen Station.
 *  4. `ereignisse_lesen` (ReadTool, `state/project-store.ts` `formatiereEreignisse`)
 *     liefert nach zwei Commands beide Zusammenfassungen — über den ECHTEN
 *     `ChatSession`-Werkzeugweg (ScriptedProvider ruft das Tool).
 *
 * Test-Hooks: `window.__kosmoBlick.ring()`/`window.__kosmoChat.history()`
 * (`KosmoPanel.tsx`, Muster `window.__kosmo`/`window.__kosmoViewport`) —
 * reine Lesefenster in Laufzeit-Zustand, der sonst nicht im DOM sichtbar ist.
 */

declare global {
  interface Window {
    __kosmoSkripte?: Record<string, unknown>;
    __kosmoBlick: {
      ring: () => { station: string; stationTitel: string; zeit: number; bild?: unknown; text?: string }[];
    };
    __kosmoChat: {
      history: () => { role: string; content: string; toolName?: string }[];
    };
    __kosmo: {
      open: (screen: string) => void;
    };
  }
}

/** Onboarding + TKB-Beispielprojekt (liefert Geschoss/Wandaufbau als
 * ChatSession-Kontext-Defaults) → landet in der Design-Station. Muster
 * `kosmo-scripted.spec.ts`. */
async function projektMitTkb(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible();
  await expect(page.locator('[data-testid="station-einstellungen-design"]')).toBeVisible();
}

/** Registriert ein Skript + öffnet das Kosmo-Panel frisch mit `provider:
 * 'scripted'` + optionalem `blickAn` — Muster `e2e/sim/bausteine.ts`
 * `kosmoChatSkript`, hier lokal (die geteilte Hilfe kennt `blickAn` nicht). */
async function kosmoMitSkriptOeffnen(
  page: Page,
  skriptId: string,
  skript: SzenarioSkript,
  blickAn?: boolean,
): Promise<void> {
  await page.evaluate(
    ({ skriptId, skript, blickAn }) => {
      window.__kosmoSkripte = { ...(window.__kosmoSkripte ?? {}), [skriptId]: skript };
      localStorage.setItem(
        'kosmo.llm',
        JSON.stringify({ provider: 'scripted', skriptId, ...(blickAn !== undefined ? { blickAn } : {}) }),
      );
    },
    { skriptId, skript, blickAn },
  );
  if (await page.locator('[data-testid="kosmo-input"]').isVisible()) {
    await page.locator('[data-testid="kosmo-panel-schliessen"]').click();
    await expect(page.locator('[data-testid="kosmo-input"]')).toBeHidden();
  }
  await page.click('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-input"]')).toBeVisible();
}

async function sendeUndWarte(page: Page, text: string): Promise<void> {
  const sendKnopf = page.locator('[data-testid="kosmo-send"]');
  await expect(sendKnopf).toBeEnabled({ timeout: 15_000 });
  await page.fill('[data-testid="kosmo-input"]', text);
  await sendKnopf.click();
}

test('Auto-Blick: «Kosmo sieht: ‹KosmoDesign›» erscheint beim Senden in der Design-Station', async ({ page }) => {
  await projektMitTkb(page);
  const skript: SzenarioSkript = {
    id: 'blick-design-sieht',
    zuege: [{ nutzerErwartung: 'siehst', antwortText: 'Ich beschreibe, was ich sehe.', toolCalls: [] }],
  };
  await kosmoMitSkriptOeffnen(page, 'blick-design-sieht', skript, true);

  await sendeUndWarte(page, 'Was siehst du gerade?');

  const blickZeile = page.locator('[data-testid="kosmo-blick-zeile"]');
  await expect(blickZeile).toBeVisible({ timeout: 15_000 });
  await expect(blickZeile).toContainText('Kosmo sieht: ‹KosmoDesign›');
});

test('Auto-Blick-Toggle AUS: keine Blick-Zeile beim Senden', async ({ page }) => {
  await projektMitTkb(page);
  const skript: SzenarioSkript = {
    id: 'blick-design-aus',
    zuege: [{ nutzerErwartung: 'siehst', antwortText: 'Ich antworte ganz normal.', toolCalls: [] }],
  };
  await kosmoMitSkriptOeffnen(page, 'blick-design-aus', skript, false);

  await sendeUndWarte(page, 'Was siehst du gerade?');

  // Die normale Kosmo-Antwort kommt trotzdem — nur ohne Blick-Zeile davor.
  await expect(page.locator('text=Ich antworte ganz normal.')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid="kosmo-blick-zeile"]')).toHaveCount(0);
});

test('Ringpuffer: nach einem Stationswechsel enthält er weiterhin den Blick der vorherigen Station', async ({ page }) => {
  await projektMitTkb(page);
  const skript: SzenarioSkript = {
    id: 'blick-ringpuffer',
    zuege: [
      { nutzerErwartung: 'design', antwortText: 'Design-Antwort.', toolCalls: [] },
      { nutzerErwartung: 'data', antwortText: 'Data-Antwort.', toolCalls: [] },
    ],
  };
  await kosmoMitSkriptOeffnen(page, 'blick-ringpuffer', skript, true);

  // Zug 1 — Design-Station (bereits aktiv nach projektMitTkb).
  await sendeUndWarte(page, 'Blick in KosmoDesign');
  await expect(page.locator('[data-testid="kosmo-blick-zeile"]')).toHaveCount(1, { timeout: 15_000 });

  // Stationswechsel über den bestehenden Test-Hook (App.tsx __kosmo.open) —
  // KEIN Reload (die Session/das Doc müssen erhalten bleiben).
  await page.evaluate(() => window.__kosmo.open('data'));
  await expect(page.locator('[data-testid="station-einstellungen-data"]')).toBeVisible();

  // Zug 2 — KosmoData-Station (Text-Fallback, kein Bild-Erfassen dort vorgesehen).
  await sendeUndWarte(page, 'Blick in KosmoData');
  await expect(page.locator('[data-testid="kosmo-blick-zeile"]')).toHaveCount(2, { timeout: 15_000 });

  const ring = await page.evaluate(() => window.__kosmoBlick.ring());
  expect(ring.length).toBeGreaterThanOrEqual(2);
  expect(ring.some((b) => b.station === 'design')).toBe(true);
  expect(ring.some((b) => b.station === 'data')).toBe(true);
});

test('ereignisse_lesen: liefert nach zwei Commands beide Zusammenfassungen (ScriptedProvider ruft das Tool)', async ({ page }) => {
  await projektMitTkb(page);
  const skript: SzenarioSkript = {
    id: 'blick-ereignisse',
    zuege: [
      {
        nutzerErwartung: 'wände',
        antwortText: 'Ich zeichne zwei Wände als ein Paket.',
        toolCalls: [
          { name: 'design_wandZeichnen', args: { a: { x: 0, y: 0 }, b: { x: 3000, y: 0 } } },
          { name: 'design_wandZeichnen', args: { a: { x: 3000, y: 0 }, b: { x: 3000, y: 3000 } } },
        ],
      },
      {
        nutzerErwartung: 'ereignisse',
        antwortText: 'Ich schaue in den Ereignissen nach.',
        toolCalls: [{ name: 'ereignisse_lesen', args: {} }],
      },
    ],
  };
  // blickAn bewusst weggelassen — dieser Test prüft den Ereignis-Mitschnitt,
  // nicht das Sehen (Default für 'scripted' ist ohnehin AUS).
  await kosmoMitSkriptOeffnen(page, 'blick-ereignisse', skript);

  // Zug 1: zwei Wände als EIN Paket senden + anwenden (zwei echte Commands).
  await sendeUndWarte(page, 'Zeichne zwei Wände bitte');
  const paket = page.locator('[data-testid="paket-card"]').last();
  await expect(paket).toBeVisible({ timeout: 15_000 });
  await paket.locator('[data-testid="apply-paket"]').click();
  await expect(paket.locator('[data-testid="apply-paket"]')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('[data-testid="kosmo-send"]')).toBeEnabled({ timeout: 15_000 });

  // Zug 2: ereignisse_lesen — ein ReadTool, läuft SOFORT (kein Diff-Karten-Gate).
  await sendeUndWarte(page, 'Was geschah zuletzt? (ereignisse)');
  await expect(page.locator('[data-testid="kosmo-send"]')).toBeEnabled({ timeout: 15_000 });

  const history = await page.evaluate(() => window.__kosmoChat.history());
  const werkzeugResultat = [...history].reverse().find((m) => m.role === 'tool' && m.toolName === 'ereignisse_lesen');
  expect(werkzeugResultat).toBeDefined();
  const treffer = werkzeugResultat!.content.match(/Wand/g) ?? [];
  expect(treffer.length).toBeGreaterThanOrEqual(2);
});
