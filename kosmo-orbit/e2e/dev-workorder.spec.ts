import { expect, test } from '@playwright/test';

/**
 * V2-Technik Block 2 / AB4 (Buildplan `docs/V2-TECHNIK-BLOCK2-BUILDPLAN.md`,
 * Abnahme-Kriterien §3): der volle KosmoDev-Kreis gegen die Fake-Bridge —
 * Auftrag erfassen → «An HomeStation übergeben» → Fake-Worker schliesst das
 * Protokoll (claim → result, Buildplan E3/E5) → Karte springt auf
 * «erledigt · Simulation», nie einen erfundenen Commit-Beleg (E5 — die
 * Blender-Regel: Zahlen/Belege werden nicht gefakt).
 *
 * `p3.spec.ts` (Erfassen + Download-Export als Offline-Fallback, Kriterium 5)
 * bleibt unangetastet — hier geht es NUR um den Bridge-Kreis (E4).
 */

test('Voller Kreis: erfassen → übergeben → Fake-Worker → erledigt · Simulation', async ({ page }) => {
  // Ehrlicher Skip ohne laufende Fake-Bridge — dasselbe Muster wie
  // module.spec.ts («Vis → Blatt: Fake-Bridge-Render …»): CI startet keine
  // Bridge, der Test darf dann nicht rot werden, sondern übergeht sich ehrlich.
  let bridgeLebt = false;
  try {
    bridgeLebt = (await fetch('http://localhost:8600/jobs', { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    /* offline */
  }
  test.skip(!bridgeLebt, 'Fake-Bridge auf :8600 läuft nicht');
  test.setTimeout(90_000);

  const auftragText = 'E2E: Türanschlag wählbar machen';

  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  // P-F2 (v0.9.2): «Dev» ist keine Zentrale-Kachel mehr — der frühere
  // Direktklick lief über die entfallene «Kosmo»-Fächer-Kachel (Harter
  // Vertrag, immer im DOM). Jetzt am Kosmo-Orb-Rechtsklick-Menü, `module-
  // dev` bleibt dieselbe Testid (s. `KosmoSymbol.tsx`).
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="module-dev"]');

  // Auftrag erfassen (Buildplan E4-Voraussetzung) — Karte erscheint mit
  // unserem markanten Text, damit die folgenden Asserts nicht in fremde
  // Karten aus demselben Buch laufen können.
  await page.fill('[data-testid="auftrag-text"]', auftragText);
  await page.click('[data-testid="auftrag-erfassen"]');
  const karte = page.locator('[data-testid="auftrag-karte"]').filter({ hasText: auftragText });
  await expect(karte).toHaveCount(1);

  // Übergeben — die Bridge nimmt den Job an (POST /jobs/dev), die
  // Job-Statuszeile erscheint (Poll läuft jetzt, Buildplan E4).
  await page.click('[data-testid="workorder-uebergeben"]');
  const jobStatus = page.locator('[data-testid="dev-job-status"]');
  await expect(jobStatus).toBeVisible({ timeout: 10_000 });

  // Job-ID aus der Statuszeile lesen (die Badge zeigt `p.jobId` roh, siehe
  // DevWorkspace.tsx) — damit die Bridge-Gegenprobe unten GENAU unseren Job
  // trifft und nicht irgendeinen aus dem geteilten Store (frühere Läufe/
  // parallele Specs häufen dort weitere dev-Jobs an, Buildplan-Auftrag AB4).
  // `textContent`, NICHT `innerText`: die Badge trägt `text-transform:
  // uppercase` nur als CSS-Stil — `innerText` liefert den gerenderten (GROSS-
  // geschriebenen) Text, `textContent` das rohe `job_id` aus dem DOM.
  const statusText = (await jobStatus.textContent()) ?? '';
  const jobIdMatch = statusText.match(/dev-\d+-[0-9a-f]{6}/);
  expect(jobIdMatch, `Job-ID nicht in der Statuszeile gefunden: "${statusText}"`).not.toBeNull();
  const jobId = jobIdMatch![0];

  // Fake-Worker schliesst den Protokoll-Kreis (claim → result, 1-s-Ticks,
  // also ~2–3 s) und der 2.5-s-Client-Poll übernimmt das Ergebnis — 20 s
  // Puffer ist unter Volllast (serielle ~142-Test-Suite, geteilte Bridge)
  // begründet grosszügig, kein `waitForTimeout`-Gefrickel nötig.
  const ergebnis = karte.locator('[data-testid="auftrag-ergebnis"]');
  await expect(ergebnis).toBeVisible({ timeout: 20_000 });
  await expect(ergebnis).toContainText('Simulation');
  // Der Fake erfindet nie einen Commit-Beleg (Buildplan E5) — die Notiz sagt
  // ehrlich, dass nichts umgesetzt wurde, das Commit-Feld fehlt im UI ganz.
  await expect(ergebnis).not.toContainText('Commit');
  // Status-Badge der Karte (der <span>, NICHT die gleichnamigen Status-
  // Knöpfe darunter, die immer «offen»/«an-worker»/«erledigt» anbieten —
  // darum ein span-Selektor statt reinem Text-Contains auf der Karte).
  await expect(karte.locator('span').filter({ hasText: /^erledigt$/ })).toBeVisible();

  // Beweis über die Bridge selbst (Abnahme-Kriterien 1 und 3): erst die
  // Jobliste GET /jobs/dev — unser Job (per job_id-Treffer, robust gegen
  // Store-Akkumulation aus früheren Läufen/parallelen Specs) steht dort als
  // kind dev-workorder, status done. Das Ergebnis (`result`) hängt die
  // Bridge nur an den EINZEL-Job (GET /jobs/dev/{id}), nicht an die Liste —
  // also zusätzlich der Einzel-Abruf für Worker/Commit-Beweis.
  const listenTreffer = await page.evaluate(async (id: string) => {
    const res = await fetch('http://localhost:8600/jobs/dev');
    const jobs = (await res.json()) as Array<{ job_id: string; kind: string; status: string }>;
    return jobs.find((j) => j.job_id === id) ?? null;
  }, jobId);
  expect(listenTreffer, `Job ${jobId} nicht in GET /jobs/dev gefunden`).not.toBeNull();
  expect(listenTreffer!.kind).toBe('dev-workorder');
  expect(listenTreffer!.status).toBe('done');

  const beweis = await page.evaluate(async (id: string) => {
    const res = await fetch(`http://localhost:8600/jobs/dev/${id}`);
    return (await res.json()) as {
      kind: string;
      status: string;
      result?: { worker: string; ergebnisse: Array<{ auftrag_id: string; umgesetzt: boolean; commit?: string }> };
    };
  }, jobId);
  expect(beweis.kind).toBe('dev-workorder');
  expect(beweis.status).toBe('done');
  expect(beweis.result?.worker).toBe('fake-worker');
  expect(beweis.result?.ergebnisse.length ?? 0).toBeGreaterThan(0);
  expect(beweis.result?.ergebnisse.every((e) => e.commit === undefined)).toBe(true);

  await page.screenshot({ path: 'e2e-results/dev-workorder-kreis.png' });
});

test('Offline ehrlich: Übergeben ohne Bridge nennt den Zustand, Aufträge bleiben offen', async ({ page }) => {
  // Toter Port :8699 — nichts lauscht, aber die CSP erlaubt localhost/127.0.0.1
  // generell, also ist das ein echter Connection-Refused-Fehler, kein
  // CSP-Block (Muster homestation-kette.spec.ts, «Offline: tote Bridge»).
  await page.addInitScript(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.bridge', 'http://localhost:8699');
  });
  await page.goto('/');
  // P-F2 (v0.9.2): s. Kommentar oben — «Dev» läuft jetzt über den
  // Kosmo-Orb-Rechtsklick, `module-dev` bleibt dieselbe Testid.
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="module-dev"]');

  const auftragText = 'E2E-Offline: Fensterbreite prüfen';
  await page.fill('[data-testid="auftrag-text"]', auftragText);
  await page.click('[data-testid="auftrag-erfassen"]');
  const karte = page.locator('[data-testid="auftrag-karte"]').filter({ hasText: auftragText });
  await expect(karte).toHaveCount(1);

  await page.click('[data-testid="workorder-uebergeben"]');

  // `uebergebeWorkorder()` (state/auftragsbuch.ts) wirft den Netzfehler beim
  // POST, BEVOR die betroffenen Aufträge auf «an-worker» gesetzt werden —
  // die Übergabe scheitert also ehrlich vor jedem Statuswechsel. Dieselbe
  // ehrliche Meldung wie KosmoVis (bridgeVermutlichCspGeblockt/istAuthFehler
  // in vis-jobs.ts): «Bridge nicht erreichbar», kein kryptischer Rohtext.
  await expect(page.locator('[data-testid="meldung-fehler"]').last()).toContainText('Bridge nicht erreichbar', {
    timeout: 10_000,
  });
  // Die Karte bleibt unangetastet «offen» — nichts wurde auf an-worker
  // gestellt (Status-Badge-Span, nicht die gleichnamigen Status-Knöpfe).
  await expect(karte.locator('span').filter({ hasText: /^offen$/ })).toBeVisible();
});
