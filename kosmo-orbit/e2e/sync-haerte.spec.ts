import { expect, test } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Sync-Betriebshärte (D4): Token-Pflicht und Offline-Warteschlange gegen
 * einen EIGENS gestarteten Server (eigener Port, Wegwerf-DB) — die Tests
 * überspringen sich ehrlich, wenn die Server-Abhängigkeiten fehlen (CI
 * installiert tools/sync-server nicht).
 */

const SERVER = 'tools/sync-server/src/server.mjs';
const depsDa = existsSync('tools/sync-server/node_modules/@hocuspocus/server');

function startServer(port: number, token?: string): Promise<ChildProcess> {
  const db = join(mkdtempSync(join(tmpdir(), 'kosmo-sync-')), 'test.sqlite');
  const child = spawn('node', [SERVER], {
    env: {
      ...process.env,
      KOSMO_SYNC_PORT: String(port),
      KOSMO_SYNC_DB: db,
      ...(token ? { KOSMO_SYNC_TOKEN: token } : {}),
    },
    stdio: 'ignore',
  });
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const poll = async () => {
      try {
        await fetch(`http://localhost:${port}/raeume`, { signal: AbortSignal.timeout(500) });
        resolve(child);
      } catch {
        if (Date.now() - t0 > 10_000) reject(new Error('Server startet nicht'));
        else setTimeout(poll, 250);
      }
    };
    void poll();
  });
}

test('Token-Pflicht: falscher Token wird abgelehnt, richtiger verbindet', async ({ page }) => {
  test.skip(!depsDa, 'tools/sync-server nicht installiert');
  test.setTimeout(60_000);
  const server = await startServer(8701, 'buero-geheim');
  try {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.reload();
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="sync-toggle"]');
    await page.fill('[data-testid="sync-url"]', 'ws://localhost:8701');
    await page.fill('[data-testid="sync-room"]', 'token-test');
    await page.fill('[data-testid="sync-token"]', 'falsch');
    await page.click('[data-testid="sync-connect"]');
    await expect(page.locator('[data-testid="sync-abgelehnt"]')).toBeVisible({ timeout: 10_000 });
    // Richtiger Token → live
    await page.fill('[data-testid="sync-token"]', 'buero-geheim');
    await page.click('[data-testid="sync-connect"]');
    await expect(page.getByText(/Sync live/)).toBeVisible({ timeout: 10_000 });
  } finally {
    server.kill();
  }
});

test('Offline-Warteschlange: Änderungen ohne Server fliessen beim Reconnect nach', async ({ browser }) => {
  test.skip(!depsDa, 'tools/sync-server nicht installiert');
  test.setTimeout(120_000);
  const raum = `offline-${Math.random().toString(36).slice(2, 8)}`;
  let server = await startServer(8702);

  const auf = async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.reload();
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="sync-toggle"]');
    await page.fill('[data-testid="sync-url"]', 'ws://localhost:8702');
    await page.fill('[data-testid="sync-room"]', raum);
    await page.click('[data-testid="sync-connect"]');
    await expect(page.getByText(/Sync live/)).toBeVisible({ timeout: 10_000 });
    return page;
  };

  const a = await auf();
  const wand = (x: number) =>
    a.evaluate((xx) => {
      const k = window.__kosmo;
      const st = k.state();
      const aw = st.doc.byKind('assembly').find((w) => w.name?.startsWith('AW'))!;
      k.run('design.wandZeichnen', {
        storeyId: st.activeStoreyId,
        a: { x: xx, y: 0 },
        b: { x: xx, y: 4000 },
        assemblyId: aw.id,
      });
    }, x);
  await wand(0);

  // Server stirbt → Client meldet getrennt; Änderungen landen in der Warteschlange
  server.kill();
  await expect(a.getByText(/getrennt/)).toBeVisible({ timeout: 20_000 });
  await wand(3000);
  await wand(6000);
  await expect(a.locator('[data-testid="sync-wartend"]')).toContainText('2 Änderungen');

  // Server kommt zurück → Provider reconnectet, Warteschlange fliesst nach
  server = await startServer(8702);
  await expect(a.getByText(/Sync live/)).toBeVisible({ timeout: 45_000 });

  // Zweiter Client sieht ALLE drei Wände (inkl. der offline gezeichneten)
  const b = await auf();
  await expect
    .poll(() => b.evaluate(() => window.__kosmo.state().doc.byKind('wall').length), { timeout: 15_000 })
    .toBe(3);
  server.kill();
});

/**
 * Serie I / Batch B3 (R2, höchstes Risiko): Sync-Server-Härtung.
 * (a) `/raeume` verrät bei Token-Pflicht keine Raumnamen ohne gültigen Token.
 * (b) eine übergrosse Nachricht sprengt den `maxPayload`-Deckel — die
 *     Verbindung wird verworfen statt den Server mit Speicher zu fluten.
 */
test('Räume-Schutz: /raeume ohne Token wird bei Token-Pflicht abgewiesen, mit Token beantwortet', async () => {
  test.skip(!depsDa, 'tools/sync-server nicht installiert');
  test.setTimeout(30_000);
  const server = await startServer(8703, 'raeume-geheim');
  try {
    const ohneToken = await fetch('http://localhost:8703/raeume');
    expect(ohneToken.status).toBe(401);

    const falscherToken = await fetch('http://localhost:8703/raeume', {
      headers: { Authorization: 'Bearer falsch' },
    });
    expect(falscherToken.status).toBe(401);

    const mitToken = await fetch('http://localhost:8703/raeume', {
      headers: { Authorization: 'Bearer raeume-geheim' },
    });
    expect(mitToken.status).toBe(200);
    const json = (await mitToken.json()) as { raeume: unknown[]; tokenPflicht: boolean };
    expect(json.tokenPflicht).toBe(true);
    expect(Array.isArray(json.raeume)).toBe(true);
  } finally {
    server.kill();
  }
});

test('Grössendeckel: eine übergrosse Nachricht wird verworfen, die Verbindung getrennt', async () => {
  test.skip(!depsDa, 'tools/sync-server nicht installiert');
  test.setTimeout(30_000);
  const port = 8704;
  const db = join(mkdtempSync(join(tmpdir(), 'kosmo-sync-')), 'test.sqlite');
  const child = spawn('node', [SERVER], {
    env: {
      ...process.env,
      KOSMO_SYNC_PORT: String(port),
      KOSMO_SYNC_DB: db,
      KOSMO_SYNC_MAX_BYTES: '2048', // kleiner Test-Deckel, damit die Probe eindeutig darüberliegt
    },
    stdio: 'ignore',
  });
  try {
    const t0 = Date.now();
    for (;;) {
      try {
        await fetch(`http://localhost:${port}/raeume`, { signal: AbortSignal.timeout(500) });
        break;
      } catch {
        if (Date.now() - t0 > 10_000) throw new Error('Server startet nicht');
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    const beendet = await new Promise<boolean>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}/uebergross-test`);
      const timeout = setTimeout(
        () => reject(new Error('Verbindung bleibt offen — Grössendeckel griff nicht')),
        10_000,
      );
      ws.addEventListener('open', () => {
        ws.send(new Uint8Array(200_000)); // deutlich über dem 2048-Byte-Testdeckel
      });
      ws.addEventListener('close', () => {
        clearTimeout(timeout);
        resolve(true);
      });
      ws.addEventListener('error', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
    expect(beendet).toBe(true);
  } finally {
    child.kill();
  }
});
