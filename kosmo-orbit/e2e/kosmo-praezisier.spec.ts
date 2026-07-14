import { expect, test } from '@playwright/test';
import type { SzenarioSkript } from '@kosmo/ai';

/**
 * V2-E5-iv («Kosmo-Präzisier», `docs/V070-KONZEPT.md`, Finch-«Archie»-
 * Äquivalent): Beweis der drei neuen deterministischen Kernel-Commands
 * (`design.tuerenPlatzieren`, `design.komplianzFixes`,
 * `design.einheitTypAktualisieren`, `packages/kosmo-kernel/src/commands/
 * design.ts`) durch den ECHTEN App-Pfad — Muster `e2e/kosmo-scripted.spec.ts`:
 * ScriptedProvider (`packages/kosmo-ai/src/scripted.ts`) über die reale
 * `ChatSession`/`KosmoPanel`-Verdrahtung (Diff-Karte → Freigabe →
 * `runCommand`). Läuft isoliert unter `KOSMO_E2E_PORT=5177` (eigener
 * Preview-Prozess, kollidiert nicht mit der Hauptsuite auf :5183).
 *
 * Geometrie wird bewusst NICHT aus der TKB-Demo übernommen (die ist bereits
 * durchkomponiert — keine unerschlossenen Räume, keine Compliance-Lücken),
 * sondern frisch über `window.__kosmo.run()` angelegt (derselbe Weg wie
 * `e2e/sim/bausteine.ts`), damit die Befunde reproduzierbar entstehen.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (commandId: string, params: unknown) => { patches: { id: string }[] };
      state: () => {
        doc: {
          byKind: <T = { id: string }>(kind: string) => T[];
        };
      };
    };
    __kosmoSkripte?: Record<string, unknown>;
  }
}

/** Panel FRISCH mit dem ScriptedProvider öffnen (Muster kosmo-scripted.spec.ts). */
async function oeffnePanelMitSkript(page: import('@playwright/test').Page, skriptId: string, skript: SzenarioSkript) {
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
}

test.describe('Kosmo-Präzisier (5B): Türen platzieren + Kompliance-Fixes als echte Diff-Karten', () => {
  test('Zug 1 — design_tuerenPlatzieren: Diff-Karte nennt die ehrliche Türen-Zusammenfassung, Anwenden setzt die Zonentür im Doc', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.click('[data-testid="load-tkb"]');
    // v0.7.8 Welle 2 (P4): testid statt Text-Locator (Doppel-Chrome-Kollision
    // mit dem Dock-Kopf-Titel des migrierten `kennzahlen`-Panels, s.
    // `dock-layout.spec.ts` Kommentar).
    await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();

    // Frisches Geschoss mit Korridor + Zimmer, OFFEN aneinandergrenzend (keine
    // Wand, keine Tür) — genau das Muster aus `packages/kosmo-kernel/test/
    // kosmo-praezisier.test.ts` (`raumGraph()` liefert eine «offen»-Kante).
    const { storeyId } = await page.evaluate(() => {
      const geschoss = window.__kosmo.run('design.geschossErstellen', {
        name: 'Präzisier E2E',
        index: 9,
        elevation: 30000,
        height: 3000,
      });
      const storeyId = geschoss.patches[0]!.id;
      window.__kosmo.run('design.zoneErstellen', {
        storeyId,
        name: 'Korridor',
        sia: 'VF',
        raumTyp: 'korridor',
        outline: [
          { x: 0, y: 0 },
          { x: 2000, y: 0 },
          { x: 2000, y: 6000 },
          { x: 0, y: 6000 },
        ],
      });
      window.__kosmo.run('design.zoneErstellen', {
        storeyId,
        name: 'Zimmer 1',
        sia: 'HNF',
        raumTyp: 'zimmer',
        outline: [
          { x: 2000, y: 0 },
          { x: 6000, y: 0 },
          { x: 6000, y: 6000 },
          { x: 2000, y: 6000 },
        ],
      });
      return { storeyId };
    });

    const skript: SzenarioSkript = {
      id: 'praezisier-tueren-platzieren',
      zuege: [
        {
          nutzerErwartung: 'türen',
          antwortText: 'Ich ergänze die fehlende Erschliessungstür.',
          toolCalls: [{ name: 'design_tuerenPlatzieren', args: { storeyId } }],
        },
      ],
    };
    await oeffnePanelMitSkript(page, 'praezisier-tueren-platzieren', skript);

    await page.fill('[data-testid="kosmo-input"]', 'Ergänze bitte die fehlenden Türen auf dem neuen Geschoss');
    await page.click('[data-testid="kosmo-send"]');

    const proposal = page.locator('[data-testid="proposal-card"]').last();
    await expect(proposal).toBeVisible({ timeout: 15_000 });
    // Ehrliche Vorher-Zusammenfassung (validateToolCall ruft summarize() auf
    // dem UNVERÄNDERTEN Doc auf — kosmo-praezisier.test.ts dokumentiert den
    // Vertrag im Detail): genau 1 Tür, mit Klarnamen der betroffenen Zonen.
    await expect(proposal).toContainText('1 Tür ergänzt');
    await expect(proposal).toContainText('Zimmer 1↔Korridor');
    await page.screenshot({ path: 'e2e-results-d2/kosmo-praezisier-tueren-karte.png' });

    await proposal.locator('[data-testid="apply-proposal"]').click();
    await expect(proposal.locator('[data-testid="apply-proposal"]')).toHaveCount(0, { timeout: 15_000 });

    // Die Zonentür steckt jetzt im Doc — mittig auf der gemeinsamen Kante.
    await expect
      .poll(() =>
        page.evaluate(
          (sid) =>
            window.__kosmo
              .state()
              .doc.byKind<{ storeyId: string; at: { x: number; y: number } }>('zonentuer')
              .filter((t) => t.storeyId === sid).length,
          storeyId,
        ),
      )
      .toBe(1);
    const tuer = await page.evaluate(
      (sid) =>
        window.__kosmo
          .state()
          .doc.byKind<{ storeyId: string; at: { x: number; y: number } }>('zonentuer')
          .find((t) => t.storeyId === sid)!,
      storeyId,
    );
    expect(tuer.at).toEqual({ x: 2000, y: 3000 });
  });

  test('Zug 2 — design_komplianzFixes: gemischtes Ergebnis, die Diff-Karte zeigt den «manuell:»-Teil ehrlich mit', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.click('[data-testid="load-tkb"]');
    // v0.7.8 Welle 2 (P4): testid statt Text-Locator (Doppel-Chrome-Kollision
    // mit dem Dock-Kopf-Titel des migrierten `kennzahlen`-Panels, s.
    // `dock-layout.spec.ts` Kommentar).
    await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();

    // Zwei UNABHÄNGIGE Befunde: ein zu schmales Zimmer (2.0 m < 2.40 m
    // Richtwert — NICHT automatisierbar, bleibt «manuell») und eine zu
    // schmale Tür (700 mm < 800 mm SIA-500-Minimum — automatisierbar, Feld-
    // Bump auf 800 mm). Selbes Muster wie `kosmo-praezisier.test.ts`.
    const { storeyId, wallId } = await page.evaluate(() => {
      const geschoss = window.__kosmo.run('design.geschossErstellen', {
        name: 'Präzisier E2E Fixes',
        index: 10,
        elevation: 33000,
        height: 3000,
      });
      const storeyId = geschoss.patches[0]!.id;
      window.__kosmo.run('design.zoneErstellen', {
        storeyId,
        name: 'Schmales Zimmer',
        sia: 'HNF',
        raumTyp: 'zimmer',
        outline: [
          { x: 0, y: 0 },
          { x: 2000, y: 0 },
          { x: 2000, y: 4000 },
          { x: 0, y: 4000 },
        ],
      });
      const aufbau = window.__kosmo.run('design.aufbauErstellen', {
        name: 'IW 15 Präzisier',
        target: 'wall',
        layers: [{ material: 'kalksandstein', thickness: 150, function: 'tragend' }],
      });
      const assemblyId = aufbau.patches[0]!.id;
      const wand = window.__kosmo.run('design.wandZeichnen', {
        storeyId,
        assemblyId,
        a: { x: 10000, y: 0 },
        b: { x: 13000, y: 0 },
      });
      const wallId = wand.patches[0]!.id;
      window.__kosmo.run('design.oeffnungSetzen', {
        wallId,
        openingType: 'tuer',
        center: 1500,
        width: 700,
        height: 2100,
        sill: 0,
      });
      return { storeyId, wallId };
    });

    const skript: SzenarioSkript = {
      id: 'praezisier-komplianz-fixes',
      zuege: [
        {
          nutzerErwartung: 'checks',
          antwortText: 'Ich fixe, was sich sauber beheben lässt.',
          toolCalls: [{ name: 'design_komplianzFixes', args: { storeyId } }],
        },
      ],
    };
    await oeffnePanelMitSkript(page, 'praezisier-komplianz-fixes', skript);

    await page.fill('[data-testid="kosmo-input"]', 'Behebe bitte die Grundriss-Checks auf diesem Geschoss');
    await page.click('[data-testid="kosmo-send"]');

    const proposal = page.locator('[data-testid="proposal-card"]').last();
    await expect(proposal).toBeVisible({ timeout: 15_000 });
    await expect(proposal).toContainText('Türbreite');
    await expect(proposal).toContainText('manuell:');
    await expect(proposal).toContainText('Zimmerbreite');
    await page.screenshot({ path: 'e2e-results-d2/kosmo-praezisier-komplianz-karte.png' });

    await proposal.locator('[data-testid="apply-proposal"]').click();
    await expect(proposal.locator('[data-testid="apply-proposal"]')).toHaveCount(0, { timeout: 15_000 });

    // NUR die Tür wurde gefixt (700 → 800 mm) — die Zimmerbreite blieb
    // unangetastet, weil sie einen Entwurfsentscheid braucht. Nach `wallId`
    // gefiltert, nicht doc-weit: die TKB-Demo bringt bereits eigene 800-mm-
    // Türen mit, ein absolutes Doc-weites `toBe(1)` wäre falsch.
    await expect
      .poll(() =>
        page.evaluate(
          (wid) =>
            window.__kosmo
              .state()
              .doc.byKind<{ openingType: string; width: number; wallId: string }>('opening')
              .filter((o) => o.wallId === wid && o.openingType === 'tuer' && o.width === 800).length,
          wallId,
        ),
      )
      .toBe(1);
    const zimmerBreite = await page.evaluate(
      (sid) =>
        window.__kosmo
          .state()
          .doc.byKind<{ storeyId: string; name: string; outline: { x: number; y: number }[] }>('zone')
          .find((z) => z.storeyId === sid && z.name === 'Schmales Zimmer')!.outline,
      storeyId,
    );
    expect(zimmerBreite.some((p) => p.x === 2000)).toBe(true);
  });
});
