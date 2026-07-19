import { expect, test, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * PBL4-089 (`docs/V089-SPEZ.md` §9 E9/E17, Sanktion 12) — Bake-Rückweg:
 * «Modell backen (HomeStation)» in `AssetWorkspace.tsx`. Beweist den
 * Fake-/Container-Endzustand (`kein-blender-worker`, NIE running/done ohne
 * echten Blender-Worker) UND den Kern der Ehrlichkeitssanktion: kein
 * Bake-Endzustand ausser `done` schreibt ein Asset in den Vault.
 *
 * Eigene, dedizierte Bridge auf Port 8604 (Muster `homestation-kette.spec.ts`)
 * — bewusst NICHT die Standard-Bridge :8600 des Containers: die lief zu
 * Beginn dieses Pakets noch mit einem VOR PBL1 gestarteten Prozessabbild
 * ohne `/jobs/bake` (leere Speicher-Neustart-Übernahme des Codes bleibt
 * einem `python3`-Prozess ohne `--reload` verwehrt) — ein 405 auf
 * `POST /jobs/bake` bewies das. Ein eigener, kurzlebiger Prozess (eigener
 * `KOSMO_JOB_STORE`-Tempordner, in `afterAll` gekillt) umgeht das UND hält
 * sich fern von jedem parallelen Blender-Paket (PBL1–3), das denselben Port
 * 8601 nach demselben Muster belegen könnte. Ohne python3/fastapi
 * überspringt sich die Suite ehrlich (Skip-Guard), statt einen grünen
 * Schein vorzutäuschen.
 */

const BRIDGE = join(__dirname, '..', 'tools', 'homestation-bridge', 'kosmo_bridge', 'main.py');
const PORT = 8604;
const BRIDGE_URL = `http://127.0.0.1:${PORT}`;

let bridge: ChildProcess | null = null;
let bridgeBereit = false;

function starteBridge(): Promise<boolean> {
  if (!existsSync(BRIDGE)) return Promise.resolve(false);
  const store = mkdtempSync(join(tmpdir(), 'kosmo-bake-089-'));
  const kind = spawn('python3', [BRIDGE, '--fake-worker', '--port', String(PORT)], {
    env: { ...process.env, KOSMO_JOB_STORE: store },
    stdio: 'ignore',
  });
  bridge = kind;
  kind.on('error', () => undefined); // python3 fehlt → unten via Health-Timeout ehrlich skippen
  return new Promise((resolve) => {
    const t0 = Date.now();
    const poll = async () => {
      try {
        const r = await fetch(`${BRIDGE_URL}/health`, { signal: AbortSignal.timeout(500) });
        if (r.ok) return resolve(true);
      } catch {
        /* noch nicht oben */
      }
      if (Date.now() - t0 > 12_000) return resolve(false);
      setTimeout(poll, 250);
    };
    void poll();
  });
}

async function oeffneAssetMitEigenerBridge(page: Page): Promise<void> {
  await page.addInitScript((bridgeUrl) => {
    localStorage.setItem('kosmo.onboarded', '1');
    // localhost (nicht 127.0.0.1): die App-CSP erlaubt connect-src nur für
    // localhost/127.0.0.1 gleichermassen — Muster `homestation-kette.spec.ts`.
    localStorage.setItem('kosmo.bridge', bridgeUrl);
  }, BRIDGE_URL.replace('127.0.0.1', 'localhost'));
  await page.goto('/');
  await page.click('[data-testid="module-asset"]');
  await page.click('[data-testid="tab-objekte"]');
}

const KEIN_WORKER_TEXT =
  'Diese Bridge hat keinen Blender-Worker angeschlossen — der Smart-UV-Unwrap + AO-Bake braucht Blender headless auf der HomeStation (5090). Ein unverändertes Modell wird nicht als gebackt ausgegeben.';

test.describe.serial('Bake-Rückweg (PBL4-089)', () => {
  test.beforeAll(async () => {
    bridgeBereit = await starteBridge();
  });

  test.afterAll(() => {
    bridge?.kill('SIGKILL');
  });

  test('AO-Bake anstossen → Status endet als kein-blender-worker, Bridge-Nachricht WORTGLEICH sichtbar (erwartetes Verhalten)', async ({
    page,
  }) => {
    test.skip(!bridgeBereit, 'python3/fastapi-Bridge nicht verfügbar — Kette ehrlich übersprungen');
    test.setTimeout(60_000);

    await oeffneAssetMitEigenerBridge(page);

    await expect(page.locator('[data-testid="bake-panel"]')).toBeVisible();
    await page.click('[data-testid="bake-anstossen"]');

    const status = page.locator('[data-testid="bake-status"]');
    await expect(status).toBeVisible({ timeout: 10_000 });
    // Der Fake-Worker-Zweig (`kind:'bake'`) meldet den Endzustand innerhalb
    // eines Loop-Durchlaufs (max. ~1s) — der UI-Poll (2s) holt ihn spätestens
    // beim zweiten Tick; 15s Deckel bleibt grosszügig gegen CI-Jitter.
    await expect(status).toContainText('Kein Blender-Worker angeschlossen', { timeout: 15_000 });
    // Sanktion 12 wörtlich: die Bridge-Begründung erscheint UNVERÄNDERT, keine
    // eigene Umformulierung («Physik/Geometrie wird nicht erfunden»).
    await expect(status).toContainText(KEIN_WORKER_TEXT);

    // «Ins Modell laden» darf bei diesem Endzustand NIE erscheinen — es gibt
    // kein gespeichertes Ergebnis-Asset.
    await expect(page.locator('[data-testid="bake-ins-modell"]')).toHaveCount(0);

    await page.screenshot({ path: 'e2e-results/bake-rueckweg-kein-blender-worker.png' });
  });

  test('Sanktion 12 — Kern-Beweis: nach dem kein-blender-worker-Ende ist KEIN neues Asset im Vault entstanden', async ({
    page,
  }) => {
    test.skip(!bridgeBereit, 'python3/fastapi-Bridge nicht verfügbar — Kette ehrlich übersprungen');
    test.setTimeout(60_000);

    await oeffneAssetMitEigenerBridge(page);

    // Asset-Zählung VOR dem Bake — frischer Test-Browserkontext, daher leere
    // Bibliothek (dieselbe `asset-card`-Zähl-Naht wie `kosmoasset-bibliothek.
    // spec.ts`/`p3.spec.ts`).
    const karten = page.locator('[data-testid="asset-card"]');
    await expect(karten).toHaveCount(0);

    await page.click('[data-testid="bake-anstossen"]');
    await expect(page.locator('[data-testid="bake-status"]')).toContainText('Kein Blender-Worker angeschlossen', {
      timeout: 15_000,
    });

    // Realzeit-Nachlauf (bewusst kein Zustands-Poll-Ersatz, s. Lehre v0.8.8
    // §2 «nicht pollbar ehrlich benennen»): der UI-Poll läuft alle 2s weiter
    // — ein fälschliches `ladeBakeErgebnis`-Schreiben nach dem Endzustand
    // hätte hier Zeit dazu.
    await page.waitForTimeout(3_000);

    await expect(karten).toHaveCount(0);
    await expect(page.locator('[data-testid="bake-ins-modell"]')).toHaveCount(0);
  });

  // «Abbrechen während queued» (Auftragspunkt 3c) — bewusst WEGGELASSEN statt
  // vorgetäuscht: der Fake-Worker-Loop (`main.py::_fake_worker_loop`) tickt
  // fest alle 1s, UNABHÄNGIG vom Job-Erstellzeitpunkt — das «queued»-Fenster
  // ist empirisch zwischen ~0ms und ~1000ms uniform verteilt (gemessen gegen
  // eine frisch gestartete Bridge: 13 Polls im ~85ms-Raster zeigten «queued»
  // bis 0.925s, danach `kein-blender-worker`). Ein Playwright-Klick auf
  // «Abbrechen» in diesem Fenster ist ein Rennen ohne deterministischen
  // Ausgang — ein Test, der das als bestanden meldet, würde Zufall als Beweis
  // verkaufen. Die Auftragsvorgabe erlaubt genau das: «falls der Fake-Worker
  // das Fenster lässt — sonst ehrlich dokumentieren und weglassen.» Der
  // `abbrechenBakeAuftrag`-Pfad selbst ist trotzdem real (Bridge-Vertrag
  // `bridgeRoutes.jobCancel`, UI-Knopf sichtbar solange `bakeOffen` — s.
  // `AssetWorkspace.tsx`), nur die E2E-Deckung dieses einen Zeitfensters fehlt
  // ehrlich.
});
