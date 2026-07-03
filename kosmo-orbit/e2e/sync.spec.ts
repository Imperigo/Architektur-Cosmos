import { expect, test } from '@playwright/test';

/**
 * Sync-Härtetest: zwei Clients, ein Raum — Konvergenz auch im Konfliktfall
 * (Entity-genaues LWW über Yjs). Braucht den laufenden Sync-Server auf
 * :8700 (`node tools/sync-server/src/server.mjs`) — ohne ihn wird die
 * Suite ehrlich übersprungen (CI startet keinen Sync-Server).
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        doc: {
          byKind: (k: string) => { id: string; name?: string; a?: { x: number; y: number } }[];
        };
      };
    };
  }
}

async function serverErreichbar(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:8700', { signal: AbortSignal.timeout(1500) });
    return res.status < 600;
  } catch {
    return false;
  }
}

test('Zwei Clients konvergieren — auch bei Verschieben-gegen-Löschen', async ({ browser }) => {
  test.skip(!(await serverErreichbar()), 'Sync-Server auf :8700 läuft nicht');
  test.setTimeout(60_000);
  const raum = `konflikt-${Math.random().toString(36).slice(2, 8)}`;

  const auf = async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
    await page.reload();
    // Erst das Projekt-Bootstrap (Design-Modul), dann verbinden
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="sync-toggle"]');
    await page.fill('[data-testid="sync-url"]', 'ws://localhost:8700');
    await page.fill('[data-testid="sync-room"]', raum);
    await page.click('[data-testid="sync-connect"]');
    await expect(page.getByText(/Sync live/)).toBeVisible({ timeout: 10_000 });
    return page;
  };
  const a = await auf();
  const b = await auf();

  // 1) A zeichnet — B sieht die Wand
  const wandId = await a.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((x) => x.name?.startsWith('AW'))!.id;
    return k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 6000, y: 0 },
      assemblyId: aw,
    }).patches[0]!.id;
  });
  await expect
    .poll(() => b.evaluate(() => window.__kosmo.state().doc.byKind('wall').length), { timeout: 10_000 })
    .toBe(1);

  // 2) Konflikt: A verschiebt, B löscht — gleichzeitig
  await Promise.all([
    a.evaluate((id) => window.__kosmo.run('design.verschieben', { entityId: id, dx: 2000, dy: 1000 }), wandId),
    b.evaluate((id) => window.__kosmo.run('design.loeschen', { entityId: id }), wandId),
  ]);
  await a.waitForTimeout(1500);

  // Konvergenz: beide Clients sehen exakt denselben Stand (Gewinner egal)
  const stand = (p: typeof a) =>
    p.evaluate(() =>
      window.__kosmo
        .state()
        .doc.byKind('wall')
        .map((w) => ({ id: w.id, a: w.a }))
        .sort((x, y) => x.id.localeCompare(y.id)),
    );
  const standA = await stand(a);
  const standB = await stand(b);
  expect(standA).toEqual(standB);

  // Raum-Verwaltung (D4): der Server meldet den aktiven Raum mit 2 Teilnehmern
  const liste = (await (await fetch('http://localhost:8700/raeume')).json()) as {
    raeume: { name: string; verbindungen: number }[];
  };
  const eintrag = liste.raeume.find((r) => r.name === raum);
  expect(eintrag).toBeDefined();
  expect(eintrag!.verbindungen).toBe(2);
});
