import { expect, test, type Page, type Route } from '@playwright/test';
import type { SzenarioSkript } from '@kosmo/ai';

/**
 * v0.7.1 E1/2A («Blick-Cloud-UI») — schliesst die in `V071-KONZEPT.md`
 * benannte Ehrlichkeitslücke von 0.6.8: der Anthropic-Bild-Block-Weg
 * existiert seit 0.6.8 vollständig (`anthropic.ts`), aber bislang bewies
 * KEINE E2E-Spec einen echten Bild-Request-Bau gegen `api.anthropic.com`.
 * Diese Spec beweist drei Dinge END-TO-END:
 *  1. Betriebsart cloud MIT (Fake-)Schlüssel: der abgefangene Request-Body
 *     an `https://api.anthropic.com/v1/messages` trägt tatsächlich einen
 *     `{type:'image'}`-Block mit `media_type:'image/jpeg'` (Downscale-Re-
 *     Encode aus `state/kosmo-blick.ts`) — eine gefakte SSE-Antwort fliesst
 *     sichtbar in den Chat.
 *  2. Betriebsart cloud OHNE Schlüssel: die HEUTIGE, im Code tatsächlich
 *     vorhandene Meldung erscheint (`anthropic.ts`: Status 401 →
 *     «API-Schlüssel prüfen (Einstellungen ⚙).», mit dem `⚠ `-Präfix aus
 *     `KosmoPanel.tsx` `onError`) — nichts Neues erfunden, nur der reale
 *     Code-Pfad nachgestellt (ein leerer/ungültiger Schlüssel führt bei der
 *     echten Anthropic-API ebenfalls zu 401).
 *  3. ScriptedProvider + Blick an: die Antwort enthält den Bild-Beweis-
 *     Marker «[Blick empfangen: N Bild(er)]» aus `scripted.ts` (1A-Härtung)
 *     — der bild-freie Provider-Weg, der ohne jedes Netz läuft.
 *
 * Ehrlichkeitsgrenze (wie in V071-KONZEPT.md benannt): ein echter Call
 * gegen die ECHTE Anthropic-API mit einem echten Owner-Schlüssel bleibt
 * Owner-Abnahme — diese Spec beweist den Request-BAU, nicht die Antwort
 * des echten Dienstes.
 */

declare global {
  interface Window {
    __kosmoSkripte?: Record<string, unknown>;
    __kosmo: {
      open: (screen: string) => void;
    };
  }
}

interface AnthropicInhaltsBlock {
  type: string;
  source?: { type: string; media_type: string; data: string };
  text?: string;
}

interface AnthropicRequestBody {
  model: string;
  messages: { role: string; content: AnthropicInhaltsBlock[] }[];
}

/** Onboarding + TKB-Beispielprojekt, Grundriss (view-2d) sichtbar — Muster
 * `kosmo-blick.spec.ts`/`kosmo-blick-2.spec.ts` `projektMitTkb`, hier
 * zusätzlich auf den Grundriss geschaltet (garantiert ein echtes,
 * gerastertes SVG statt des 3D-Viewports — deterministischer Bild-Inhalt). */
async function projektMitGrundriss(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible();
  await expect(page.locator('[data-testid="station-einstellungen-design"]')).toBeVisible();
  await page.click('[data-testid="view-2d"]');
  await expect(page.locator('[data-testid="planview"]')).toBeVisible();
}

/** Schreibt `kosmo.llm` direkt (schneller als über die Einstellungen-UI zu
 * klicken) und öffnet das Kosmo-Panel FRISCH — `KosmoPanel`s
 * `useState(loadSettings)`-Initialiser liest `kosmo.llm` nur beim Mount,
 * darum schliesst diese Hilfe ein bereits offenes Panel zuerst (Muster
 * `kosmoMitSkriptOeffnen` in `kosmo-blick.spec.ts`). */
async function kosmoMitEinstellungenOeffnen(page: Page, einstellungen: Record<string, unknown>): Promise<void> {
  await page.evaluate((s) => localStorage.setItem('kosmo.llm', JSON.stringify(s)), einstellungen);
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

/** Gefakte SSE-Antwort im selben Format wie die echte Anthropic-Messages-API
 * (`anthropic.ts` liest `content_block_delta`/`message_stop`-Zeilen) — Muster
 * `packages/kosmo-ai/test/ai.test.ts` `sseResponse`, hier als Playwright-
 * `route.fulfill`-Body statt eines echten `ReadableStream`. */
function sseKoerper(text: string): string {
  return (
    `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n` +
    `data: ${JSON.stringify({ type: 'message_stop' })}\n\n`
  );
}

test.describe('Kosmo-Blick — Cloud (Anthropic), Bild-Request + ehrlicher Schlüssel-Zustand', () => {
  test('Betriebsart cloud MIT Schlüssel: der Request-Body trägt einen image/jpeg-Block, die SSE-Antwort erscheint im Chat', async ({
    page,
  }) => {
    const requests: AnthropicRequestBody[] = [];
    await page.route('https://api.anthropic.com/v1/messages', async (route: Route) => {
      const body = JSON.parse(route.request().postData() ?? '{}') as AnthropicRequestBody;
      requests.push(body);
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sseKoerper('Ich sehe den Grundriss'),
      });
    });

    await projektMitGrundriss(page);
    await kosmoMitEinstellungenOeffnen(page, {
      provider: 'anthropic',
      betriebsart: 'cloud',
      anthropicKey: 'sk-ant-fake' /* bewusst <20 Zeichen Suffix — Secret-Scan-Muster (RE_ANTHROPIC) darf den Test-Dummy nicht treffen */,
      anthropicModel: 'claude-opus-4-8',
      cloudAuth: 'schluessel',
      blickAn: true,
    });

    await sendeUndWarte(page, 'Was siehst du im Grundriss?');

    // Die Blick-Zeile («Kosmo sieht: ‹KosmoDesign›») UND die gefakte
    // SSE-Antwort erscheinen — der ECHTE ChatSession-Weg, kein Test-Stub.
    await expect(page.locator('[data-testid="kosmo-blick-zeile"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=Ich sehe den Grundriss')).toBeVisible({ timeout: 15_000 });

    expect(requests.length).toBeGreaterThan(0);
    const gesendet = requests[requests.length - 1]!;
    const nutzerNachricht = gesendet.messages.find((m) => m.role === 'user' && Array.isArray(m.content));
    expect(nutzerNachricht).toBeDefined();
    const bildBlock = nutzerNachricht!.content.find((c) => c.type === 'image');
    expect(bildBlock).toBeDefined();
    expect(bildBlock!.source?.media_type).toBe('image/jpeg');
    expect(bildBlock!.source?.data.length).toBeGreaterThan(0);
  });

  test('Betriebsart cloud OHNE Schlüssel: die heutige, reale Anthropic-401-Meldung erscheint (nichts Neues erfunden)', async ({
    page,
  }) => {
    // Ein leerer/ungültiger Schlüssel führt bei der ECHTEN Anthropic-API
    // ebenfalls zu 401 — dieser Mock stellt exakt das nach, was `anthropic.ts`
    // heute bei Status 401 meldet (`API-Schlüssel prüfen (Einstellungen ⚙).`),
    // ohne einen echten Netz-Roundtrip zu riskieren.
    await page.route('https://api.anthropic.com/v1/messages', async (route: Route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":{"message":"invalid x-api-key"}}' });
    });

    await projektMitGrundriss(page);
    await kosmoMitEinstellungenOeffnen(page, {
      provider: 'anthropic',
      betriebsart: 'cloud',
      anthropicKey: '',
      anthropicModel: 'claude-opus-4-8',
      cloudAuth: 'schluessel',
      blickAn: true,
    });

    await sendeUndWarte(page, 'Was siehst du im Grundriss?');

    // Der reale Fehlerpfad aus `anthropic.ts` (Status 401 → deutscher,
    // konkreter Hinweis statt eines generischen Textes).
    await expect(page.locator('text=Anthropic antwortet mit 401')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=API-Schlüssel prüfen')).toBeVisible();
  });

  test('ScriptedProvider + Blick an: die Antwort trägt den Bild-Beweis-Marker «[Blick empfangen:» (1A-Härtung, ohne Netz)', async ({
    page,
  }) => {
    const skript: SzenarioSkript = {
      id: 'blick-cloud-scripted-beweis',
      zuege: [{ nutzerErwartung: 'grundriss', antwortText: 'Ich beschreibe den Grundriss.', toolCalls: [] }],
    };

    await projektMitGrundriss(page);
    await page.evaluate(
      ({ skriptId, skript }) => {
        window.__kosmoSkripte = { ...(window.__kosmoSkripte ?? {}), [skriptId]: skript };
      },
      { skriptId: skript.id, skript },
    );
    await kosmoMitEinstellungenOeffnen(page, { provider: 'scripted', skriptId: skript.id, blickAn: true });

    await sendeUndWarte(page, 'Was siehst du im Grundriss?');

    await expect(page.locator('[data-testid="kosmo-blick-zeile"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=[Blick empfangen:')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Kosmo-Blick — Kosten-/Grössen-Hinweis (nur Betriebsart cloud)', () => {
  test('Der Hinweis «verkleinert auf ~1 MP» erscheint nur in Betriebsart cloud, sonst nicht', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.panelOffen', '1');
    });
    await page.reload();
    await page.click('[data-testid="module-design"]');
    await page.click('[aria-label="Einstellungen"]');

    // Standard/HomePC: kein Hinweis.
    await expect(page.locator('[data-testid="betriebsart"]')).toBeVisible();
    await expect(page.locator('[data-testid="kosmo-blick-cloud-hinweis"]')).toHaveCount(0);

    // Cloud: der dezente Hinweis erscheint.
    await page.click('[data-testid="betriebsart-cloud"]');
    const hinweis = page.locator('[data-testid="kosmo-blick-cloud-hinweis"]');
    await expect(hinweis).toBeVisible();
    await expect(hinweis).toContainText('Blick geht als Bild an Claude (Cloud)');
    await expect(hinweis).toContainText('~1 MP');

    // Zurück auf Standard: Hinweis verschwindet wieder.
    await page.click('[data-testid="betriebsart-standard"]');
    await expect(page.locator('[data-testid="kosmo-blick-cloud-hinweis"]')).toHaveCount(0);
  });
});
