import { expect, test, type Page } from '@playwright/test';
import type { SzenarioSkript } from '@kosmo/ai';

/**
 * v0.8.3/P2 (`docs/V083-SPEZ.md` §6/E6) — KosmoData im Chat: das
 * `referenzen_suchen`-Werkzeug zitiert jetzt über die geteilte BM25-
 * Maschinerie (`state/referenz-index.ts`) mit `[Qn]`-Belegen (§6.2/E6b,
 * dieselbe `quellenMap`/`quellenZaehler`-Mechanik wie `quellen_suchen`,
 * Muster `e2e/wissen-antwortet.spec.ts`), UND ein Klick auf einen
 * Referenz-`[Qn]`-Chip rendert zusätzlich die `RefKarte` direkt im
 * Chatverlauf (§6.3/E6c, C-3-Abnahme). Läuft den ECHTEN
 * `ChatSession`/`KosmoPanel`-Weg über den `ScriptedProvider` (kein Mock-
 * Regex, reproduzierbares Drehbuch).
 */

declare global {
  interface Window {
    __kosmoSkripte?: Record<string, unknown>;
    __kosmoChat: {
      history: () => { role: string; content: string; toolName?: string }[];
    };
  }
}

async function kosmoMitSkriptOeffnen(page: Page, skriptId: string, skript: SzenarioSkript): Promise<void> {
  await page.evaluate(
    ({ skriptId, skript }) => {
      window.__kosmoSkripte = { ...(window.__kosmoSkripte ?? {}), [skriptId]: skript };
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
}

async function sendeUndWarte(page: Page, text: string): Promise<void> {
  const sendKnopf = page.locator('[data-testid="kosmo-send"]');
  await expect(sendKnopf).toBeEnabled({ timeout: 15_000 });
  await page.fill('[data-testid="kosmo-input"]', text);
  await sendKnopf.click();
}

test('referenzen_suchen: BM25-Treffer mit [Qn]-Beleg + Chip, Klick öffnet die RefKarte im Chatverlauf', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  // «chandigarh» trifft im Seed genau EINEN Eintrag (BM25 über Titel/Ort/
  // Autoren/Themen/Kurztext) — deterministisch EIN [Qn]-Beleg.
  const skript: SzenarioSkript = {
    id: 'kosmodata-chat-referenz',
    zuege: [
      {
        nutzerErwartung: 'chandigarh',
        antwortText: 'Chandigarh von Le Corbusier passt hier gut als Referenz [Q1].',
        toolCalls: [{ name: 'referenzen_suchen', args: { suchbegriff: 'Chandigarh' } }],
      },
    ],
  };
  await kosmoMitSkriptOeffnen(page, 'kosmodata-chat-referenz', skript);

  await sendeUndWarte(page, 'Kennst du eine gute Referenz wie Chandigarh?');

  // Beweis A — das Werkzeug-Result trägt den [Qn]-Beleg, BM25 statt naivem
  // `.includes()` (§6.1/E6a): der Treffer trägt Titel + Jahr + Autoren.
  await expect
    .poll(
      async () => {
        const history = await page.evaluate(() => window.__kosmoChat.history());
        return history.some((m) => m.role === 'tool' && m.toolName === 'referenzen_suchen');
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  const history = await page.evaluate(() => window.__kosmoChat.history());
  const werkzeugResultat = [...history].reverse().find((m) => m.role === 'tool' && m.toolName === 'referenzen_suchen');
  expect(werkzeugResultat).toBeDefined();
  expect(werkzeugResultat!.content).toMatch(/\[Q1\]/);
  expect(werkzeugResultat!.content).toContain('Chandigarh');
  expect(werkzeugResultat!.content).toContain('Le Corbusier');

  // Beweis B — [Qn] im Antworttext == genau EIN gerenderter Chip (Gate
  // «[Qn]==Chip-Anzahl», §12.1 C-2).
  const chips = page.locator('[data-testid="quelle-chip"]');
  await expect(chips).toHaveCount(1, { timeout: 15_000 });
  await expect(chips.first()).toContainText('Q1');
  await expect(chips.first()).toContainText('Chandigarh');

  await page.screenshot({ path: 'test-results/p2-083-qn-chip-referenz.png' });

  // Beweis C — Klick auf den Referenz-Chip rendert die RefKarte MIT
  // RefHeroBild direkt im Chatverlauf (§6.3/E6c, C-3-Abnahme) — additiv zum
  // bestehenden Stations-Sprung (`kosmo.data.openRef`), der weiterhin feuert.
  await chips.first().click();
  const refKarte = page.locator('[data-testid="ref-karte"]');
  await expect(refKarte).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid="ref-karte-titel"]')).toContainText('Chandigarh');
  await expect(page.locator('[data-testid="ref-karte-bild"]')).toBeVisible();

  await page.screenshot({ path: 'test-results/p2-083-refkarte-chat.png' });

  // Schliessen-Knopf räumt die Karte wieder weg (additiv, kein Pflicht-Zustand).
  await page.locator('[data-testid="ref-karte-schliessen"]').click();
  await expect(refKarte).toBeHidden();
});

test('referenzen_suchen: zwei Treffer → zwei [Qn]-Marken, zwei Chips (Mengen-Beweis)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  // «pilotis» trifft im Seed genau ZWEI Einträge (Villa Savoye, Unité
  // d'Habitation) — deterministisch zwei [Qn]-Belege in EINEM Werkzeug-Aufruf.
  const skript: SzenarioSkript = {
    id: 'kosmodata-chat-referenz-zwei',
    zuege: [
      {
        nutzerErwartung: 'pilotis',
        antwortText: 'Zwei Bauten mit Pilotis passen hier: Villa Savoye [Q1] und die Unité d’Habitation [Q2].',
        toolCalls: [{ name: 'referenzen_suchen', args: { suchbegriff: 'Pilotis' } }],
      },
    ],
  };
  await kosmoMitSkriptOeffnen(page, 'kosmodata-chat-referenz-zwei', skript);

  await sendeUndWarte(page, 'Welche Bauten zeigen Pilotis?');

  await expect
    .poll(
      async () => {
        const history = await page.evaluate(() => window.__kosmoChat.history());
        return history.some((m) => m.role === 'tool' && m.toolName === 'referenzen_suchen');
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  const history = await page.evaluate(() => window.__kosmoChat.history());
  const werkzeugResultat = [...history].reverse().find((m) => m.role === 'tool' && m.toolName === 'referenzen_suchen');
  expect(werkzeugResultat!.content).toMatch(/\[Q1\]/);
  expect(werkzeugResultat!.content).toMatch(/\[Q2\]/);

  const chips = page.locator('[data-testid="quelle-chip"]');
  await expect(chips).toHaveCount(2, { timeout: 15_000 });
});
