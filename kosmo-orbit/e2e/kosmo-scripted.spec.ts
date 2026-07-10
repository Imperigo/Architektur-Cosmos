import { expect, test } from '@playwright/test';
import type { SzenarioSkript } from '@kosmo/ai';
import { kosmoChatSkript } from './sim/bausteine';

/**
 * v0.6.7 Phase 0 — ScriptedProvider (`packages/kosmo-ai/src/scripted.ts`)
 * durch den ECHTEN App-Pfad: `KosmoPanel`s `session`-Aufbau (Provider-Fall
 * 'scripted', `apps/kosmo-orbit/src/shell/KosmoPanel.tsx`) + der reale
 * `ChatSession`-Umlauf (Validierung → Defaults aus dem App-Kontext →
 * Diff-Karte → Freigabe → `AUSGEFÜHRT`-Tool-Result → Quittierung). Die
 * Unit-Tests in `packages/kosmo-ai/test/scripted.test.ts` beweisen die
 * Provider-Mechanik isoliert; dieser Test beweist die Verdrahtung im
 * laufenden Browser (Registry-Injektion via `addInitScript`, Settings-
 * Umschaltung, echte KosmoPanel-Diff-Karten).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => { doc: { byKind: (k: string) => { id: string }[] } };
    };
  }
}

test('ScriptedProvider spielt ein Skript via kosmoChatSkript durch den echten ChatSession/KosmoPanel-Pfad', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  // TKB laden: liefert eine aktive Storey + eine Wand-Aufbau — genau die
  // App-Kontext-Defaults, die ChatSession.applyDefaults() für
  // design_wandZeichnen braucht (KosmoPanel.tsx contextDefaults).
  await page.click('[data-testid="load-tkb"]'); // [Quelle: vis-automatik.spec.ts Z.43]
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible(); // [Quelle: vis-automatik.spec.ts Z.44]

  const waendeVorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);

  const skript: SzenarioSkript = {
    id: 'p0-demo-wand',
    zuege: [
      {
        // String statt RegExp: eine RegExp überlebt die JSON-Serialisierung
        // der evaluate-Argumente nicht (s. kosmoChatSkript-Hinweis).
        nutzerErwartung: 'wand',
        antwortText: 'Gerne — ich zeichne die Wand.',
        toolCalls: [{ name: 'design_wandZeichnen', args: { a: { x: 0, y: 0 }, b: { x: 4000, y: 0 } } }],
      },
    ],
  };

  const protokoll = await kosmoChatSkript(page, 'p0-demo-wand', skript, {
    nutzerTexte: ['Zeichne bitte eine Wand'],
  });

  expect(protokoll).toHaveLength(1);
  expect(protokoll[0]!.proposals).toBe(1); // ein Tool-Call → Einzel-Vorschlag (kein Paket)
  expect(protokoll[0]!.fehler).toBeUndefined();

  // ECHTER Weg: die Diff-Karte lief durch validateToolCall + applyDefaults
  // (storeyId/assemblyId aus dem App-Kontext, nicht aus dem Skript) und
  // wurde über denselben runCommand-Pfad wie ein Handgriff ausgeführt.
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length))
    .toBe(waendeVorher + 1);
});

/**
 * H-28 (`docs/SIM-BEFUNDE.md`) — Nachweis additiv zum Skript-Test oben.
 *
 * ERKENNTNIS beim Bau dieses Tests (gehört in den Abschlussbericht, nicht nur
 * hierhin): `validateToolCall` (`packages/kosmo-ai/src/tools.ts`) prüft die
 * Tool-Argumente ausschliesslich per zod-`safeParse` GEGEN DAS SCHEMA. Ein
 * Fehler dort (z.B. `outline` mit nur 2 Punkten, `.min(3)`) geht als
 * `FEHLER: …`-Tool-Result an das Modell zurück, BEVOR überhaupt eine
 * Diff-Karte entsteht (`chat.ts` Zeile ~139-146) — es gibt für einen reinen
 * Validierungsfehler also gar keine anwendbare Karte, an der H-28 sich zeigen
 * könnte. Was zod NICHT prüft (das Schema kennt nur `z.string()`), sind
 * fachliche Vorbedingungen, die erst `run()` in `packages/kosmo-kernel`
 * durchsetzt — z.B. `design.deckeZeichnen` mit einer `storeyId`, die im Doc
 * nicht existiert (`require<Storey>(doc, p.storeyId, 'storey')` wirft
 * `storey «…» existiert nicht`, `commands/design.ts`). Ein SOLCHER Fehler
 * entsteht garantiert erst beim Anwenden (`applyCard` → `runCommand` →
 * `run()`), NIE bei der Validierung — genau der Fall, den H-28 verlangt.
 */
test('H-28: ein beim Anwenden (nicht bei der Validierung) scheiternder Vorschlag hinterlässt eine bleibende Fehlerspur im Chat', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible();
  const deckenVorher = await page.evaluate(() => window.__kosmo.state().doc.byKind('slab').length);

  const skript: SzenarioSkript = {
    id: 'h28-decke-unbekannte-storey',
    zuege: [
      {
        nutzerErwartung: 'decke',
        antwortText: 'Ich zeichne die Decke ein.',
        toolCalls: [
          {
            name: 'design_deckeZeichnen',
            args: {
              // Zod lässt jede nicht-leere Zeichenkette durch (kein FK-Check
              // im Schema) — `run()` schlägt erst hier fehl, siehe Kommentar
              // oben. `outline` hat bewusst 4 gültige Punkte (kein
              // Validierungsfehler soll die Karte vorher schon verhindern).
              storeyId: 'geschoss-existiert-nicht',
              outline: [
                { x: 0, y: 0 },
                { x: 4000, y: 0 },
                { x: 4000, y: 4000 },
                { x: 0, y: 4000 },
              ],
            },
          },
        ],
      },
    ],
  };

  // Bewusst NICHT über `kosmoChatSkript` (der Baustein klickt «Anwenden»
  // bereits selbst und wäre danach schon am fertigen Zustand) — dieser Test
  // will die Anwenden-Reaktion selbst schrittweise beobachten. Aufbau darum
  // von Hand, im selben Muster wie `kosmoChatSkript` (Registry setzen, Panel
  // FRISCH mounten, Zug senden).
  await page.evaluate(
    ({ skriptId, skript }) => {
      const w = window as unknown as { __kosmoSkripte?: Record<string, unknown> };
      w.__kosmoSkripte = { ...(w.__kosmoSkripte ?? {}), [skriptId]: skript };
      localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'scripted', skriptId }));
    },
    { skriptId: 'h28-decke-unbekannte-storey', skript },
  );
  if (await page.locator('[data-testid="kosmo-input"]').isVisible()) {
    await page.locator('[data-testid="kosmo-panel-schliessen"]').click();
    await expect(page.locator('[data-testid="kosmo-input"]')).toBeHidden();
  }
  await page.click('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-input"]')).toBeVisible();
  await page.fill('[data-testid="kosmo-input"]', 'Zeichne die Decke im unbekannten Geschoss');
  await page.click('[data-testid="kosmo-send"]');

  const proposal = page.locator('[data-testid="proposal-card"]').last();
  await expect(proposal).toBeVisible({ timeout: 15_000 });
  await proposal.locator('[data-testid="apply-proposal"]').click();

  // 1) Die Karte bleibt sichtbar (als `proposal-card-fehler`) mit einer
  //    kleinen Fehlerzeile — statt spurlos aus dem DOM zu verschwinden.
  const fehlerKarte = page.locator('[data-testid="proposal-card-fehler"]').last();
  await expect(fehlerKarte).toBeVisible({ timeout: 15_000 });
  const fehlerZeile = fehlerKarte.locator('[data-testid="diff-karte-fehler"]');
  await expect(fehlerZeile).toContainText('existiert nicht');

  // 2) Eine bleibende Kosmo-Bubble im Chatverlauf (Muster der Mikrofon-
  //    Fehlerbubbles) nennt denselben Grund.
  const fehlerBubble = page.getByText(/⚠ Anwenden fehlgeschlagen: .*existiert nicht/);
  await expect(fehlerBubble).toBeVisible({ timeout: 15_000 });
  // scrollIntoViewIfNeeded: `toBeVisible()` prüft nur CSS-Sichtbarkeit +
  // Bounding-Box, nicht ob der Panel-eigene Scrollbereich die Zeile gerade
  // zeigt — für den Beweis-Screenshot soll sie tatsächlich im Bild stehen.
  await fehlerBubble.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'e2e-results-d2/h28-fehlerzeile-und-bubble.png' });

  // 3) NACH weiterem Chat-Verkehr ist die Spur immer noch da (H-28 verlangt
  //    «bleibende» Spur, nicht nur einen flüchtigen Toast).
  await expect(page.locator('[data-testid="kosmo-send"]')).toBeEnabled({ timeout: 15_000 });
  await page.fill('[data-testid="kosmo-input"]', 'Danke, was noch?');
  await page.click('[data-testid="kosmo-send"]');
  await expect(page.locator('[data-testid="kosmo-send"]')).toBeEnabled({ timeout: 15_000 });
  await expect(fehlerZeile).toBeVisible();
  await expect(fehlerBubble).toBeVisible();

  // Kein Halbschritt am Modell: die Decke wurde NICHT zusätzlich angelegt
  // (kein stiller Teilerfolg — genau das «grundlos scheitern» aus H-27/H-28).
  // Die TKB-Demo (`load-tkb`) bringt bereits eigene Decken mit — darum ein
  // Delta, kein absolutes Null.
  const deckenNachher = await page.evaluate(() => window.__kosmo.state().doc.byKind('slab').length);
  expect(deckenNachher).toBe(deckenVorher);
});

/**
 * Aufgabe 3 (Paket-Zusammenfassung) — additiv, eigenes Mehr-Karten-Skript.
 * `kosmo-scripted.spec.ts` enthielt vor diesem Batch noch KEIN Skript mit
 * mehr als einem Tool-Call pro Zug (die vorhandenen Pakete stecken nur in
 * den Journey-Specs, ausserhalb der additiven Eigentumsgrenze dieser Datei)
 * — dieser Test legt eines an, statt eines zu «nutzen».
 */
test('Aufgabe 3: ein Paket mit ≥2 Schritten zeigt eine aggregierte Zusammenfassungszeile über der Kartenserie', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  await page.click('[data-testid="load-tkb"]');
  await expect(page.locator('text=KENNZAHLEN')).toBeVisible();

  const skript: SzenarioSkript = {
    id: 'paket-zusammenfassung-demo',
    zuege: [
      {
        nutzerErwartung: 'wand',
        antwortText: 'Gerne — ich baue die Ecke.',
        toolCalls: [
          { name: 'design_wandZeichnen', args: { a: { x: 0, y: 0 }, b: { x: 3000, y: 0 } } },
          { name: 'design_wandZeichnen', args: { a: { x: 3000, y: 0 }, b: { x: 3000, y: 3000 } } },
          {
            name: 'design_deckeZeichnen',
            args: {
              outline: [
                { x: 0, y: 0 },
                { x: 3000, y: 0 },
                { x: 3000, y: 3000 },
                { x: 0, y: 3000 },
              ],
            },
          },
        ],
      },
    ],
  };

  const protokoll = await kosmoChatSkript(page, 'paket-zusammenfassung-demo', skript, {
    nutzerTexte: ['Baue mir eine Ecke mit zwei Wänden und einer Decke'],
  });
  expect(protokoll).toHaveLength(1);
  expect(protokoll[0]!.proposals).toBe(3);
  expect(protokoll[0]!.fehler).toBeUndefined();

  // `kosmoChatSkript` hat das Paket bereits über `apply-paket` freigegeben —
  // die Zusammenfassungszeile muss trotzdem (rückwirkend am angewendeten
  // Paket) sichtbar geblieben sein: `diff-paket-zusammenfassung` hängt nur
  // an `schritte.length >= 2`, nicht am offen/angewendet-Status.
  const zusammenfassung = page.locator('[data-testid="diff-paket-zusammenfassung"]').last();
  await expect(zusammenfassung).toBeVisible({ timeout: 15_000 });
  await expect(zusammenfassung).toContainText('Kosmo schlägt 3 Schritte vor');
  await expect(zusammenfassung).toContainText('2× Wand');
  await expect(zusammenfassung).toContainText('1× Decke');
  await page.screenshot({ path: 'e2e-results-d2/paket-zusammenfassung.png' });

  // Bestehende Karten-Texte/-testids bleiben unangetastet: die Aktionsketten-
  // Karte selbst zählt weiterhin korrekt "3 Schritte".
  await expect(page.locator('[data-testid="paket-card"]').last()).toContainText('3 Schritte');
});
