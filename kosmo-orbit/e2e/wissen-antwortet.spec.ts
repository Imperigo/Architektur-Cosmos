import { expect, test, type Page } from '@playwright/test';
import type { SzenarioSkript } from '@kosmo/ai';

/**
 * v0.6.9 (Stream B, «Wissen antwortet») — Beweis, dass der 0.6.8-Docling-
 * Import (`tools/docling-ingest/ingest.py` → `wissen/vault/Import/` →
 * `public/wissen/import-sammlung.json`) nicht mehr nur eine Anzeige-Liste
 * im Wissen-Tab ist, sondern in die BESTEHENDE RAG-Kette eingehängt ist:
 *
 *   `import-sammlung.json` (exaktes Format der übrigen Basis-Korpora)
 *   → `knowledge.ts` `importiereBasis('import')` (WIEDERVERWENDET, kein
 *     neuer Lade-Weg) → IndexedDB `kosmo-wissen`
 *   → `state/quellen.ts` `sucheQuellen()` (bereits durchsucht IndexedDB via
 *     `searchKnowledge`)
 *   → Kosmo-ReadTool `quellen_suchen` (KosmoPanel.tsx, unverändert) mit
 *     [Qn]-Zitierzwang.
 *
 * Deckt den ECHTEN App-Pfad ab (Muster `e2e/kosmo-blick.spec.ts` Test 4
 * «ereignisse_lesen» — genau derselbe ReadTool-über-Skript-Weg): der
 * ScriptedProvider ruft `quellen_suchen`, das Werkzeug-Ergebnis in der
 * Chat-History trägt eine [Qn]-Marke, deren Quelle die committete
 * Fixture-Notiz «Bauteilkatalog-Aussenwand» ist
 * (`wissen/vault/Import/bauteilkatalog-aussenwand-*.md`, `werkzeug:
 * fixture`). Die sichtbare Zitat-Chip-Zeile unter der Kosmo-Antwort trägt
 * dieselbe Marke — der Beweis endet nicht im Werkzeug-Result.
 */

declare global {
  interface Window {
    __kosmoSkripte?: Record<string, unknown>;
    __kosmoChat: {
      history: () => { role: string; content: string; toolName?: string }[];
    };
  }
}

/** Registriert ein Skript + öffnet das Kosmo-Panel frisch mit `provider:
 * 'scripted'` — Muster `e2e/kosmo-blick.spec.ts` `kosmoMitSkriptOeffnen`. */
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

test('Wissen antwortet: Import-Sammlung laden → quellen_suchen findet die Fixture-Notiz mit [Qn]-Beleg', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.reload();

  // 1) Import-Sammlung im Wissen-Tab laden — über den vorhandenen
  //    `importiereBasis('import')`-Weg, kein neuer Lade-Weg. Muster
  //    `e2e/kosmodata-wissen.spec.ts`: kein TKB-Projekt nötig, «Zentrale»
  //    (OrbitStart) reicht — `module-data` ist nur dort sichtbar.
  await page.click('[data-testid="module-data"]');
  await page.click('[data-testid="tab-wissen"]');
  await expect(page.locator('[data-testid="kosmodata-wissen"]')).toBeVisible();

  const ladenKnopf = page.locator('[data-testid="wissen-import-laden"]');
  await expect(ladenKnopf).toBeVisible({ timeout: 15_000 });
  await ladenKnopf.click();
  await expect(page.locator('[data-testid="wissen-import-status"]')).toContainText('geladen', {
    timeout: 15_000,
  });

  // 2) Kosmo fragen — ScriptedProvider ruft `quellen_suchen` (ECHTER
  //    ChatSession/KosmoPanel-Weg, ReadTool läuft sofort, kein Diff-Karten-
  //    Gate — genau wie `ereignisse_lesen` in kosmo-blick.spec.ts Test 4).
  const skript: SzenarioSkript = {
    id: 'wissen-antwortet-quellen',
    zuege: [
      {
        nutzerErwartung: 'aussenwand',
        antwortText: 'Ich habe die Angaben zum Bauteilkatalog gefunden [Q1].',
        toolCalls: [{ name: 'quellen_suchen', args: { suchbegriff: 'Aussenwand' } }],
      },
    ],
  };
  await kosmoMitSkriptOeffnen(page, 'wissen-antwortet-quellen', skript);

  await sendeUndWarte(page, 'Was steht im Bauteilkatalog zur Aussenwand?');

  // 3) Beweis A — das Werkzeug-Result selbst trägt eine [Qn]-Marke, deren
  //    Quelle die Fixture-Notiz «Bauteilkatalog-Aussenwand» ist. «kosmo-send»
  //    wird schon wieder aktiv, sobald der STREAMING-Zug fertig ist — VOR der
  //    asynchronen Werkzeug-Ausführung (`quellen_suchen` liest IndexedDB,
  //    `ChatSession.turn()` setzt `onBusy(false)` bereits nach dem Stream,
  //    bevor die Read-Tools laufen). Deshalb auf den tatsächlichen
  //    Werkzeug-Eintrag pollen statt auf ein festes Fertig-Signal zu bauen
  //    (Serie-H-Regel R3: Zustands-Assertions über Poll, nicht Timing).
  await expect
    .poll(
      async () => {
        const history = await page.evaluate(() => window.__kosmoChat.history());
        return history.some((m) => m.role === 'tool' && m.toolName === 'quellen_suchen');
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  const history = await page.evaluate(() => window.__kosmoChat.history());
  const werkzeugResultat = [...history].reverse().find((m) => m.role === 'tool' && m.toolName === 'quellen_suchen');
  expect(werkzeugResultat).toBeDefined();
  expect(werkzeugResultat!.content).toMatch(/\[Q\d+\]/);
  expect(werkzeugResultat!.content).toMatch(/Bauteilkatalog.Aussenwand/);

  // 4) Beweis B — die sichtbare Zitat-Chip-Zeile unter der Kosmo-Antwort
  //    trägt dieselbe Marke (KosmoPanel.tsx, `quelle-chip`, unverändert).
  const chip = page.locator('[data-testid="quelle-chip"]').first();
  await expect(chip).toBeVisible({ timeout: 15_000 });
  await expect(chip).toContainText(/Q\d+/);
  await expect(chip).toContainText(/Bauteilkatalog.Aussenwand/);
});
