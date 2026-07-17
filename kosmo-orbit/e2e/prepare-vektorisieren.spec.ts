import { expect, test } from '@playwright/test';

/**
 * v0.8.2 / P7a (B2, ROADMAP 1318, `docs/V082-SPEZ.md` §6.6/C-24) —
 * `knowledge.ts`s `importiereBasis({onProgress})`/`vektorisiereFehlende()`
 * (v0.8.1/KI1 gebaut, ROADMAP 395: «Folge-Ticket … PrepareWorkspace-
 * Ladeanzeige an onProgress + «Nachträglich vektorisieren»-Knopf») bekommen
 * hier ihren ersten echten UI-Aufrufer (`PrepareWorkspace.tsx`s
 * `BasisSection`/`NachtraeglichVektorisierenSection`). Beide Tests laufen
 * gegen die ECHTE Fake-Bridge (`--fake`, Port 8600) — `page.route()`
 * fängt NUR den `/embed`-Aufruf ab (Verzögerung bzw. gezielter Abbruch),
 * damit die Ladeanzeige/das ehrliche Ergebnis deterministisch beobachtbar
 * sind, statt auf zufällig lange Batch-Timings zu hoffen.
 */

test('Basis-Import zeigt echten Fortschritt (Quelle X/Y) während des Ladens + «alles bereits vektorisiert» danach', async ({
  page,
}) => {
  // Fake-Bridge künstlich verlangsamen (real erreichbar, nur langsam) — die
  // Ladeanzeige bekommt dadurch genug Zeit, um beobachtet zu werden, ohne
  // dass die Suite selbst lange braucht (projektwissen: 11 Quellen).
  await page.route('**/embed', async (route) => {
    await new Promise((r) => setTimeout(r, 300));
    await route.continue();
  });

  await page.goto('/');
  await page.click('[data-testid="module-prepare"]');
  await expect(page.locator('[data-testid="basis-sektion"]')).toBeVisible();

  await page.click('[data-testid="basis-laden-projektwissen"]');

  const fortschritt = page.locator('[data-testid="basis-fortschritt-projektwissen"]');
  await expect(fortschritt).toBeVisible();
  await expect(fortschritt).toContainText('Quelle');
  await expect(fortschritt).toContainText('/ 11');
  await expect(fortschritt).toContainText('Abschnitte vektorisiert');

  // Fertig geladen: Badge ersetzt den Lade-Knopf, Fortschrittstext verschwindet.
  await expect(page.locator('[data-testid="basis-laden-projektwissen"]')).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator('[data-testid="basis-projektwissen"]')).toContainText('geladen');
  await expect(page.locator('[data-testid="basis-fortschritt-projektwissen"]')).toHaveCount(0);

  // Ehrliches Ergebnis: die Bridge war die ganze Zeit erreichbar (nur
  // verzögert) — alle Abschnitte sind bereits vektorisiert, «Nachträglich
  // vektorisieren» hat nichts mehr zu tun (gesamt===0, keine erfundene 0/0).
  await page.click('[data-testid="vektorisiere-fehlende"]');
  await expect(page.locator('[data-testid="vektorisieren-ergebnis"]')).toContainText(
    'Alle Abschnitte sind bereits vektorisiert.',
    { timeout: 15000 },
  );
});

test('Nachträglich vektorisieren: ehrliches 0/N-Ergebnis solange die Bridge fehlt, echtes N/N nach ihrer Rückkehr', async ({
  page,
}) => {
  // Bridge während des Basis-Imports BLOCKIERT (kein Timeout-Warten nötig —
  // `route.abort()` lässt den Fetch sofort scheitern): `importiereBasis`
  // speichert die Chunks trotzdem (BM25-Fallback), aber ohne Vektor.
  let blockiert = true;
  await page.route('**/embed', async (route) => {
    if (blockiert) {
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto('/');
  await page.click('[data-testid="module-prepare"]');
  await page.click('[data-testid="basis-laden-briefings"]');
  await expect(page.locator('[data-testid="basis-briefings"]')).toContainText('geladen', { timeout: 15000 });

  // Bridge bleibt blockiert: «Nachträglich vektorisieren» meldet ehrlich
  // 0 von 172 (alle 172 Abschnitte der «briefings»-Sammlung, s. index.json)
  // — NICHT stillschweigend «Erfolg», sondern wörtlich «Bridge nicht
  // erreichbar».
  await page.click('[data-testid="vektorisiere-fehlende"]');
  const ergebnis = page.locator('[data-testid="vektorisieren-ergebnis"]');
  await expect(ergebnis).toContainText('0 von 172', { timeout: 15000 });
  await expect(ergebnis).toContainText('Bridge nicht (mehr) erreichbar');

  // Bridge kommt zurück: derselbe Knopf liefert jetzt das echte N/N.
  blockiert = false;
  await page.click('[data-testid="vektorisiere-fehlende"]');
  await expect(ergebnis).toContainText('172 von 172', { timeout: 15000 });
  await expect(ergebnis).toContainText('nachträglich vektorisiert');
});
