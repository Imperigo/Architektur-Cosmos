import { expect, test, type Page } from '@playwright/test';
import type { SzenarioSkript } from '@kosmo/ai';

/**
 * v0.8.6/PB1 «Autopilot-Dialog + Lauf-Bibliothek» (`docs/V086-SPEZ.md` §3
 * E4, C-10..C-13) — beweist den `lauf_planen`-Dialog-Weg END-TO-END im
 * echten Browser, additiv zu `e2e/autopilot-kern.spec.ts` (das PA3/den
 * `__kosmoLauf`-Testhook-Weg deckt, hier UNANGETASTET):
 *
 *   - Kosmo-Bitte über einen skriptbaren Provider (`ScriptedProvider`,
 *     Muster `e2e/kosmo-scripted.spec.ts`) → `lauf_planen`-Tool-Call → Lauf-
 *     VORSCHLAGSKARTE (`lauf-vorschlag-root`) — KEIN Command lief, das Doc
 *     bleibt unverändert (Sanktion 2+3, V086-SPEZ §6).
 *   - «Lauf starten» ruft `lauf-runtime.starte()` — DERSELBE Weg wie der
 *     `__kosmoLauf`-Testhook: die Schrittliste (`lauf-plan-root`) läuft bis
 *     FERTIG, jeder Schritt bleibt sein EIGENER Undo-Schritt (Ctrl+Z je Zug).
 *   - «Ablehnen» verwirft die Karte spurlos, das Doc bleibt unverändert.
 *   - Lauf-Bibliothek (`lauf-bibliothek-root`): ein kuratiertes Drehbuch
 *     wählen zeigt DIESELBE Vorschlagskarte (kein zweiter Start-Weg) — auch
 *     mit @ref-Platzhaltern, die `lauf-runtime.ts` progressiv gegen den
 *     Live-Doc auflöst (C-13).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        doc: {
          byKind: (k: string) => { id: string }[];
        };
      };
    };
    __kosmoLauf: {
      starte: (plan: unknown) => void;
      abbrechen: () => void;
      zustand: () => {
        plan: { titel: string; schritte: unknown[] } | null;
        schritte: { status: string; ergebnis?: string; fehler?: string }[];
        status: string;
      };
    };
    __kosmoSkripte?: Record<string, SzenarioSkript>;
  }
}

async function frischOhnePanel(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
}

async function oeffnePanel(page: Page): Promise<void> {
  await page.dblclick('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();
}

/** Registriert ein Ein-Zug-Skript mit GENAU einem `lauf_planen`-Aufruf und
 * öffnet das Panel FRISCH mit dem `scripted`-Provider — Muster
 * `e2e/kosmo-scripted.spec.ts` («H-28»-Test: manueller Aufbau statt
 * `kosmoChatSkript`, weil dieser Test die Karte selbst beobachten will). */
async function registriereLaufPlanenSkript(
  page: Page,
  skriptId: string,
  plan: { titel: string; schritte: { commandId: string; params: unknown; begruendung: string }[] },
): Promise<void> {
  const skript: SzenarioSkript = {
    id: skriptId,
    zuege: [
      {
        antwortText: 'Gerne — ich schlage einen Lauf vor.',
        toolCalls: [{ name: 'lauf_planen', args: plan }],
      },
    ],
  };
  // ERST navigieren (localStorage ist erst NACH einem `goto` auf die
  // App-Origin zugreifbar — sonst SecurityError, `about:blank` hat keine
  // Origin) + Onboarding überspringen, EINMAL neu laden (Muster
  // `frischOhnePanel` oben). DANACH Skript-Registry + scripted-Provider auf
  // der bereits geladenen Seite setzen, OHNE erneutes `reload()` — ein
  // zweiter Reload würde `__kosmoSkripte` (nur ein Fenster-Property, kein
  // `addInitScript`) wieder löschen. Das Panel FRISCH mounten
  // (`loadSettings()` läuft im `useState`-Init) genügt, um die neuen
  // Settings zu übernehmen — Muster `kosmoChatSkript`/H-28-Test,
  // `e2e/kosmo-scripted.spec.ts`.
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
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
  // DOPPELKLICK, nicht Einfachklick: seit v0.8.4 PB4 «Orb-Gesetz»
  // (KosmoSymbol.tsx-Kopfkommentar) öffnet ein Einfachklick nur noch die
  // kleine `kosmo-karte`-Konversationskarte, ERST der Doppelklick das grosse
  // Panel mit `kosmo-input` (Muster `autopilot-kern.spec.ts#oeffnePanel`).
  // Ehrlicher Befund am Rande: `e2e/kosmo-scripted.spec.ts`/`e2e/sim/
  // bausteine.ts#kosmoChatSkript` nutzen noch den alten Einfachklick und sind
  // dadurch unabhängig von diesem Paket bereits auf dem 0.8.6-Stand rot
  // (PB4 kam NACH ihnen) — kein Fund dieses Auftrags, hier nur vermieden.
  await page.dblclick('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-input"]')).toBeVisible();
}

/** Zwei `design.geschossErstellen`-Schritte — dasselbe Muster wie
 * `autopilot-kern.spec.ts#geschossPlan`, hier als `lauf_planen`-Argument. */
function geschossPlan(anzahl: number) {
  return {
    titel: 'Geschosse per Dialog',
    schritte: Array.from({ length: anzahl }, (_, i) => ({
      commandId: 'design.geschossErstellen',
      params: { name: `Dialog-Geschoss ${i}`, index: i, elevation: i * 3000 },
      begruendung: `Legt Geschoss ${i} für den Dialog-Lauf an`,
    })),
  };
}

test('Chat-Bitte → Vorschlagskarte (Doc unverändert) → «Lauf starten» → FERTIG (Doc verändert) → Ctrl+Z je Schritt', async ({
  page,
}) => {
  const plan = geschossPlan(2);
  await registriereLaufPlanenSkript(page, 'pb1-lauf-planen-start', plan);

  const sendKnopf = page.locator('[data-testid="kosmo-send"]');
  await expect(sendKnopf).toBeEnabled({ timeout: 15_000 });
  await page.fill('[data-testid="kosmo-input"]', 'Baue mir zwei Geschosse für den Rohbau');
  await sendKnopf.click();

  const vorschlag = page.locator('[data-testid="lauf-vorschlag-root"]');
  await expect(vorschlag).toBeVisible({ timeout: 15_000 });
  await expect(vorschlag).toContainText('Geschosse per Dialog');
  await expect(page.locator('[data-testid="lauf-vorschlag-schritt-0"]')).toContainText(
    'Legt Geschoss 0 für den Dialog-Lauf an',
  );
  await expect(page.locator('[data-testid="lauf-vorschlag-schritt-1"]')).toContainText(
    'Legt Geschoss 1 für den Dialog-Lauf an',
  );

  // Sanktion 2+3 (V086-SPEZ §6): der Tool-Call wurde NIE ausgeführt — KEIN
  // Command lief, das Doc ist unverändert, solange die Karte offen ist.
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length)).toBe(0);
  await expect(page.locator('[data-testid="lauf-plan-root"]')).toHaveCount(0);

  await page.screenshot({ path: 'e2e-results/pb1-lauf-vorschlag-karte.png' });

  await page.locator('[data-testid="lauf-vorschlag-starten"]').click();

  // Die Vorschlagskarte weicht der laufenden/fertigen Schrittliste.
  await expect(vorschlag).toHaveCount(0);
  const root = page.locator('[data-testid="lauf-plan-root"]');
  await expect(root).toBeVisible();

  await expect
    .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), { timeout: 10_000 })
    .toBe('fertig');
  await expect(page.locator('[data-testid="lauf-schritt-0"]')).toHaveClass(/lauf-schritt--ok/);
  await expect(page.locator('[data-testid="lauf-schritt-1"]')).toHaveClass(/lauf-schritt--ok/);

  await page.screenshot({ path: 'e2e-results/pb1-lauf-fertig-liste.png' });

  // «Lauf starten» ging über DENSELBEN Weg wie der `__kosmoLauf`-Testhook —
  // zwei echte Geschosse stehen im Doc (Sanktion 3, kein Vorbeilaufen an
  // `runCommand`).
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length)).toBe(2);

  // EIN Ctrl+Z je Schritt (E4: jeder Schritt bekommt eine EIGENE
  // Undo-Gruppe) — Fokus weg vom Chat-Eingabefeld (App.tsx lässt Ctrl+Z in
  // einem <input>/<textarea> bewusst durch, Muster `autopilot-kern.spec.ts`).
  await root.click();
  await page.keyboard.press('Control+z');
  await expect
    .poll(async () => page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length))
    .toBe(1);
  await page.keyboard.press('Control+z');
  await expect
    .poll(async () => page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length))
    .toBe(0);
});

test('«Ablehnen» verwirft die Vorschlagskarte spurlos — Doc bleibt unverändert', async ({ page }) => {
  const plan = geschossPlan(1);
  await registriereLaufPlanenSkript(page, 'pb1-lauf-planen-ablehnen', plan);

  const sendKnopf = page.locator('[data-testid="kosmo-send"]');
  await expect(sendKnopf).toBeEnabled({ timeout: 15_000 });
  await page.fill('[data-testid="kosmo-input"]', 'Baue mir ein Geschoss');
  await sendKnopf.click();

  const vorschlag = page.locator('[data-testid="lauf-vorschlag-root"]');
  await expect(vorschlag).toBeVisible({ timeout: 15_000 });

  await page.locator('[data-testid="lauf-vorschlag-ablehnen"]').click();

  await expect(vorschlag).toHaveCount(0);
  await expect(page.locator('[data-testid="lauf-plan-root"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length)).toBe(0);

  // Kosmo bekommt die Ablehnung als Tool-Ergebnis zurück und quittiert —
  // der Chat bleibt bedienbar (kein hängender Zug).
  await expect(sendKnopf).toBeEnabled({ timeout: 15_000 });
});

test('Lauf-Bibliothek: Drehbuch wählen zeigt DIESELBE Vorschlagskarte, «Lauf starten» löst @refs am Live-Doc auf', async ({
  page,
}) => {
  await frischOhnePanel(page);
  await oeffnePanel(page);

  const bibliothek = page.locator('[data-testid="lauf-bibliothek-root"]');
  await expect(bibliothek).toBeVisible();
  await expect(page.locator('[data-testid="lauf-bibliothek-grundriss-rohbau"]')).toBeVisible();
  await expect(page.locator('[data-testid="lauf-bibliothek-vis-demolauf"]')).toBeVisible();
  await expect(page.locator('[data-testid="lauf-bibliothek-publish-blatt"]')).toBeVisible();

  await page.locator('[data-testid="lauf-bibliothek-grundriss-rohbau"]').click();

  // Auswahl zeigt DIESELBE Vorschlagskarte wie ein Kosmo-Dialog-Vorschlag
  // (kein zweiter Start-Weg, C-13) — identische testids.
  const vorschlag = page.locator('[data-testid="lauf-vorschlag-root"]');
  await expect(vorschlag).toBeVisible();
  await expect(vorschlag).toContainText('Rohbau-Grundriss');
  await expect(page.locator('[data-testid="lauf-vorschlag-schritt-0"]')).toBeVisible();
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(0);

  await page.locator('[data-testid="lauf-vorschlag-starten"]').click();

  await expect
    .poll(async () => page.evaluate(() => window.__kosmoLauf.zustand().status), { timeout: 10_000 })
    .toBe('fertig');

  // Das Drehbuch referenziert das SELBST erzeugte Geschoss über
  // `@ref:storey:Rohbau EG` — nur bei erfolgreicher progressiver
  // @ref-Auflösung (`lauf-runtime.ts#baueFuehreAus`, `@kosmo/ai#
  // loeseLaufPlanRefs`) landen die 4 Wände + die Zone WIRKLICH im Doc.
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('storey').length)).toBe(1);
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length)).toBe(4);
  expect(await page.evaluate(() => window.__kosmo.state().doc.byKind('zone').length)).toBe(1);
});
