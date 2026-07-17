import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { BlattVorschlag } from '@kosmo/kernel';

/**
 * v0.8.2/P3 «Signal-Erfassung» + B1 «Stop-Knopf» (`docs/V082-SPEZ.md` §4/§6.3) —
 * die drei im Paket zugesagten E2E-Beweise:
 *  - Ablehnen mit Grund → Log-Eintrag → Export enthält das DPO-Rohpaar (§4.1
 *    C-18/C-19).
 *  - Auto-Pack umordnen+anwenden → `art:'layout'`-Signal (§4.5 C-30).
 *  - Stop-Knopf bricht den laufenden Stream ab (§6.3 B1, `req.signal` endlich
 *    verdrahtet).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[]; summary?: string };
      state: () => {
        activeStoreyId: string | null;
        doc: { byKind: (k: string) => { id: string; name?: string }[] };
      };
      open: (s: string) => void;
    };
  }
}

/** kosmo-signal/v1-Zeilenform (§3.2), so weit wie die Tests sie brauchen. */
interface SignalZeile {
  art: 'journal' | 'proposal' | 'reparatur' | 'transkript' | 'layout';
  ts: string;
  visibility: 'public' | 'private';
  payload: Record<string, unknown>;
  meta: { quelle: string; sessionId?: string };
}

async function starteAlsMockKosmo(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
    // Panel-Default ist zu (Symbol zuerst) — dieselbe Öffnung wie
    // `e2e/abnahme.spec.ts`s Kosmo-Test, damit `kosmo-input` direkt sichtbar ist.
    localStorage.setItem('kosmo.panelOffen', '1');
  });
  await page.goto('/');
  await page.click('[data-testid="module-design"]');
}

test.describe('P3 «Signal-Erfassung»: Ablehnen mit Grund → DPO-Rohpaar im Export', () => {
  test('Ablehnen mit Grund erfasst grund+folgeKorrektur; Export (kosmo-signal/v1) enthält das Rohpaar', async ({
    page,
  }) => {
    await starteAlsMockKosmo(page);

    // 1) Kosmo schlägt eine Wand vor (MockProvider-Wand-Regex, gated).
    await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 bis 6,0');
    await page.click('[data-testid="kosmo-send"]');
    await expect(page.locator('[data-testid="reject-proposal"]')).toBeVisible({ timeout: 15_000 });

    // 2) «Ablehnen» klicken → NICHT sofort ablehnen, sondern die additive
    // Grund-Eingabe zeigen (§4.1 C-19).
    await page.click('[data-testid="reject-proposal"]');
    await expect(page.locator('[data-testid="reject-grund-eingabe"]')).toBeVisible();
    await expect(page.locator('[data-testid="proposal-governance-gate"]')).toHaveCount(0);

    await page.screenshot({ path: 'test-results/p3-082-grund-eingabe.png' });

    const grundText = 'Wandstärke falsch, sollte mit 200mm-Aufbau stehen';
    await page.fill('[data-testid="reject-grund-input"]', grundText);
    await page.click('[data-testid="reject-grund-bestaetigen"]');

    // Karte ist entschieden (abgelehnt) — verschwindet aus der offenen Liste.
    await expect(page.locator('[data-testid="proposal-card"]')).toHaveCount(0);

    // 3) Manuelle Korrektur — der Architekt zeichnet die Wand selbst (Actor
    // 'benutzer' per Default in `execute()`) — DAS ist «die nächste manuelle
    // Aktion», die als `folgeKorrektur` verknüpft wird (§4.1 DPO-Rohpaar-Kern).
    const korrekturCommandId = 'design.wandZeichnen';
    await page.evaluate((commandId) => {
      const k = window.__kosmo;
      const st = k.state();
      const aw = st.doc.byKind('assembly').find((a) => (a as { name?: string }).name?.startsWith('AW'))!;
      k.run(commandId, {
        storeyId: st.activeStoreyId,
        a: { x: 0, y: 0 },
        b: { x: 6000, y: 0 },
        assemblyId: aw.id,
      });
    }, korrekturCommandId);

    // 4) Export öffnen (Einstellungen → «Lernjournal exportieren») — der
    // Export-Dialog zeigt die Zahlen VOR dem Download (§4.4/§5).
    await page.click('[aria-label="Einstellungen"]');
    await page.click('[data-testid="journal-export"]');
    await expect(page.locator('[data-testid="kosmo-signal-export-dialog"]')).toBeVisible();
    await page.screenshot({ path: 'test-results/p3-082-export-dialog.png' });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="kosmo-signal-export-download"]'),
    ]);
    const pfad = await download.path();
    const inhalt = readFileSync(pfad!, 'utf8');
    const zeilen = inhalt
      .split('\n')
      .filter(Boolean)
      .map((z) => JSON.parse(z) as SignalZeile);

    const abgelehnt = zeilen.find(
      (z) => z.art === 'proposal' && z.payload['ausgang'] === 'abgelehnt' && z.payload['grund'] === grundText,
    );
    expect(abgelehnt, 'Export muss die Ablehnung inkl. Grund enthalten').toBeTruthy();
    expect(abgelehnt!.visibility).toBe('public');
    const folgeKorrektur = abgelehnt!.payload['folgeKorrektur'] as { commandId: string } | undefined;
    expect(folgeKorrektur, 'DPO-Rohpaar: die Ablehnung muss die manuelle Folge-Korrektur tragen').toBeTruthy();
    expect(folgeKorrektur!.commandId).toBe(korrekturCommandId);
  });
});

test.describe('P3 «Signal-Erfassung»: Auto-Pack-Layout-Signal', () => {
  test('Umordnen + Anwenden erzeugt ein art:\'layout\'-Signal mit vorschlag ≠ endzustand', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.starterGuide.done', '1');
    });
    await page.goto('/');
    await page.click('[data-testid="module-design"]');

    await page.evaluate(() => {
      const k = window.__kosmo;
      const st = k.state();
      const storeyId = st.activeStoreyId!;
      const aw = st.doc.byKind('assembly').find((a) => (a as { name?: string }).name?.startsWith('AW'))!;
      const W = (a: unknown, b: unknown) => k.run('design.wandZeichnen', { storeyId, a, b, assemblyId: aw.id });
      W({ x: 0, y: 0 }, { x: 7000, y: 0 });
      W({ x: 7000, y: 0 }, { x: 7000, y: 5000 });
      W({ x: 7000, y: 5000 }, { x: 0, y: 5000 });
      W({ x: 0, y: 5000 }, { x: 0, y: 0 });
      k.run('design.deckeZeichnen', {
        storeyId,
        outline: [
          { x: 0, y: 0 },
          { x: 7000, y: 0 },
          { x: 7000, y: 5000 },
          { x: 0, y: 5000 },
        ],
      });
      k.open('publish');
    });

    await page.click('[data-testid="add-sheet"]');
    await expect(page.locator('[data-testid="sheet-canvas"]')).toBeVisible();
    await page.click('[data-testid="publish-autopack"]');
    await expect(page.locator('[data-testid="autopack-panel"]')).toBeVisible();

    // Vor dem Anwenden: kein Layout-Signal im Store (sauberer Ausgangspunkt).
    const vorher = await page.evaluate(() => localStorage.getItem('kosmo.vorschlagslog'));
    const vorherAnzahlLayout = vorher
      ? (JSON.parse(vorher) as SignalZeile[]).filter((z) => z.art === 'layout').length
      : 0;

    // Axonometrie dreimal nach oben — Vorschlag/Endzustand weichen danach
    // sichtbar vom Heuristik-Default ab (Muster `auto-pack-editor.spec.ts`).
    const raufAxo = page.locator('[data-testid="autopack-rauf-axo"]');
    await raufAxo.click();
    await raufAxo.click();
    await raufAxo.click();
    await expect(page.locator('[data-testid="autopack-vorschau-eintrag-0"]')).toContainText('Axonometrie');

    await page.click('[data-testid="autopack-anwenden"]');
    await expect(page.locator('[data-testid="meldung-info"]')).toContainText('Platziert:');

    const nachher = await page.evaluate(() => localStorage.getItem('kosmo.vorschlagslog'));
    expect(nachher).toBeTruthy();
    const zeilen = (JSON.parse(nachher!) as SignalZeile[]).filter((z) => z.art === 'layout');
    expect(zeilen.length).toBe(vorherAnzahlLayout + 1);

    const eintrag = zeilen[zeilen.length - 1]!;
    const vorschlag = eintrag.payload['vorschlag'] as { reihenfolge: BlattVorschlag['art'][] };
    const endzustand = eintrag.payload['endzustand'] as { reihenfolge: BlattVorschlag['art'][] };
    const optionen = eintrag.payload['optionen'] as { reihenfolge: BlattVorschlag['art'][] };

    // Heuristik-Default (`REIHENFOLGE_STANDARD`) beginnt mit Grundriss …
    expect(vorschlag.reihenfolge[0]).toBe('grundriss');
    // … der tatsächlich angewendete Entwurf beginnt nach dem Umordnen mit Axo.
    expect(endzustand.reihenfolge[0]).toBe('axo');
    expect(endzustand).toEqual(optionen);
    expect(vorschlag.reihenfolge).not.toEqual(endzustand.reihenfolge);

    await page.screenshot({ path: 'test-results/p3-082-layout-signal.png' });
  });
});

test.describe('P3/B1 «Stop-Knopf»: req.signal bricht den laufenden Stream ab', () => {
  test('Stop während des Streams: kein Vorschlag, ehrliche Abbruch-Zeile, Senden kommt zurück', async ({
    page,
  }) => {
    // MockProviders Wand-Regex-Pfad wartet ECHTE 60ms (`setTimeout`) VOR dem
    // ersten Yield (`provider.ts`) — ein reales Zeitfenster, das gegen einen
    // echten Playwright-Klick (Aktionierbarkeits-/Stabilitäts-Wartezeit) zu
    // knapp ist (per Messung: ein blosser `page.click()`-Wettlauf verliert
    // zuverlässig). Playwrights Clock-API virtualisiert die Browser-Timer
    // VOR jeder Navigation — der `setTimeout(60)` feuert dann erst, wenn der
    // Test selbst die Zeit vorspult: kein Wettlauf mehr, sondern ein
    // deterministischer Beweis, ohne `provider.ts` selbst anzufassen.
    await page.clock.install();
    await page.clock.pauseAt(Date.now());

    await starteAlsMockKosmo(page);

    await page.fill('[data-testid="kosmo-input"]', 'Zeichne eine Wand von 0,0 bis 6,0');
    await page.click('[data-testid="kosmo-send"]');

    // Der Stop-Knopf ersetzt «Senden» NUR solange `busy` — erscheint, sobald
    // `onBusy(true)` feuert (Start von `turn()`, VOR dem Provider-Aufruf,
    // synchron — braucht keine virtuelle Zeit).
    await expect(page.locator('[data-testid="kosmo-stop"]')).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'test-results/p3-082-stop-knopf.png' });
    await page.click('[data-testid="kosmo-stop"]');

    // Jetzt erst die virtuelle Zeit vorspulen — der (bereits abgebrochene)
    // `setTimeout(60)` im Provider darf jetzt «feuern»; `chat.ts`s Schleife
    // verwirft das Ergebnis, weil `abort.signal.aborted` längst gesetzt ist.
    await page.clock.fastForward(200);

    // Die ehrliche Abbruch-Zeile (additiver `onAborted`-Hook, `chat.ts`) —
    // erscheint, sobald `turn()` das Signal bemerkt.
    await expect(page.locator('[data-testid="kosmo-ui-aktion-abgebrochen"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="kosmo-ui-aktion-abgebrochen"]')).toContainText('Abgebrochen');

    // Kein Vorschlag ist je entstanden — der Abbruch hat den Tool-Call-Teil
    // der Antwort nie verarbeitet.
    await expect(page.locator('[data-testid="proposal-card"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="proposal-governance-gate"]')).toHaveCount(0);

    // Senden ist wieder da (busy zurück auf false).
    await expect(page.locator('[data-testid="kosmo-send"]')).toBeVisible();
    await expect(page.locator('[data-testid="kosmo-stop"]')).toHaveCount(0);
  });

  test('Stop-Knopf ist unsichtbar, solange nichts läuft (kein Dauer-Stopp-Zustand)', async ({ page }) => {
    await starteAlsMockKosmo(page);
    await expect(page.locator('[data-testid="kosmo-stop"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="kosmo-send"]')).toBeVisible();
  });
});
