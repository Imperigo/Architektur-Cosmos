import { expect, test, type Page } from '@playwright/test';

/**
 * v0.8.1 / P15 (Orbit-Hub-Vollausbau, docs/V081-SPEZ.md §7(f)/§9.5 C-34) —
 * beweist zwei Dinge am lebenden Objekt, die `e2e/orbit-start.spec.ts`/
 * `e2e/zentrale-kacheln.spec.ts` (Bestand, W3/W7) noch nicht explizit
 * prüften:
 *
 * 1. **Vollausbau**: alle 14 realen Stationen (`shell/stations-werkzeuge.ts`
 *    STATIONS_MODUL_IDS, inkl. der seit P11/P14 neuen `trust`/`paket`) sind
 *    über den Hub als `module-<id>`-Kachel erreichbar — keine 12er-Reste-
 *    Zählung mehr.
 * 2. **Responsives Layout**: die Zwei-Spalten-Achse (Begrüssung/Projekte
 *    links, Orbit-Ring rechts, `.orbit065-home-grid`) kollabiert unterhalb
 *    ihres bestehenden 860px-Breakpoints (`orbit-065.css`) auf eine Spalte,
 *    OHNE dass der Hub-Inhalt selbst horizontal überläuft. **Deklarierte
 *    Grenze** (V080B-DESIGN-SPEZ.md §9.16 B-138, «Desktop-CAD-Shell», seit
 *    W0 nicht Ziel von W0–W9): die volle Kopfleiste der App (Sync/Speichern/
 *    Kosmo-Umschalter etc.) ist bewusst KEIN responsives Mobil-Chrome — sie
 *    bleibt unterhalb ihrer eigenen, unveränderten Mindestbreite (≈864px)
 *    horizontal scrollbar, das ist schon vor P15 so und kein Ziel dieses
 *    Pakets (Companion, nicht die volle Desktop-Shell, ist die getestete
 *    Mobil-Ansicht, s. `e2e/companion-responsive.spec.ts`).
 */

const ALLE_14_STATIONEN = [
  'design',
  'draw',
  'sketch',
  'data',
  'vis',
  'publish',
  'prepare',
  'asset',
  'dev',
  'speak',
  'doc',
  'train',
  'trust',
  'paket',
];

async function zentraleLaden(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="orbit-start"]');
}

test('alle 14 realen Stationen sind über den Hub erreichbar (module-<id>), inkl. trust/paket seit P11/P14', async ({
  page,
}) => {
  await zentraleLaden(page);
  // «Modell» (orbit-sub-modell) verweist bewusst ein zweites Mal auf
  // `module-design` (s. `shell/orbit-werkzeuge.ts` Kopfkommentar) — das zählt
  // NICHT als 15. Station, `module-<id>` bleibt genau einmal je reale
  // Station im DOM.
  for (const id of ALLE_14_STATIONEN) {
    await expect(page.locator(`[data-testid="module-${id}"]`)).toHaveCount(1);
  }
  await expect(page.locator('[data-testid^="module-"]')).toHaveCount(ALLE_14_STATIONEN.length);
});

test('Kosmo-Fächer zeigt die neuen Trust-/Package-Stationen mit ihrem echten Kurzbeschrieb', async ({ page }) => {
  await zentraleLaden(page);
  await page.locator('[data-testid="orbit-haupt-kosmo"]').hover();
  const faecher = page.locator('[data-testid="orbit-faecher-kosmo"]');
  await expect(faecher).toHaveClass(/\boffen\b/);

  const trust = faecher.locator('[data-testid="module-trust"]');
  await expect(trust).toContainText('Trust');
  await expect(trust).toContainText('kxp-Viewer');

  const paket = faecher.locator('[data-testid="module-paket"]');
  await expect(paket).toContainText('Package');
  await expect(paket).toContainText('Export-Hub');
});

test('Klick auf Trust/Package öffnet die echten Stationen (keine Attrappen-Kacheln)', async ({ page }) => {
  await zentraleLaden(page);
  await page.locator('[data-testid="orbit-haupt-kosmo"]').hover();
  await page.locator('[data-testid="orbit-faecher-kosmo"] [data-testid="module-trust"]').click();
  await expect(page.locator('[data-testid="kxp-werkzeugleiste"]')).toBeVisible();
});

test('responsives Layout: unter 860px kollabiert die Home-Achse auf eine Spalte, kein erreichbarer horizontaler Scroll im Hub-Bereich', async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 900 });
  await zentraleLaden(page);

  const gridColumns = await page.evaluate(
    () => getComputedStyle(document.querySelector('.orbit065-home-grid')!).gridTemplateColumns,
  );
  // Eine Spalte, keine "minmax(0, 1fr) minmax(0, 1fr)"-Zwei-Spalten-Vorlage mehr.
  expect(gridColumns.trim().split(/\s+/)).toHaveLength(1);

  // `.app-zentrale-scroll` (der scrollende Container der Zentrale, s. dessen
  // Kommentar in `app.css`) trägt `overflow-x: hidden` — kein Scrollbalken,
  // kein Maus-/Trackpad-erreichbarer horizontaler Scroll für echte
  // Nutzer:innen. Der reine `scrollWidth`-Zahlenwert bleibt bewusst
  // ungeprüft: er liegt wegen des Harten Vertrags "Fächer immer im DOM mit
  // realer Boxgrösse" (`OrbitStart.tsx`-Kopfkommentar) auch bei
  // unsichtbaren, geschlossenen Fächern > Containerbreite — das ist nie
  // sichtbar und per `overflow-x: hidden` nie per Maus/Trackpad erreichbar
  // (nur `element.scrollLeft = …` per Skript kann das umgehen, kein
  // realer Nutzungsweg). `document.documentElement` bleibt hier bewusst
  // aussen vor — die volle Desktop-Kopfleiste hat ihre eigene, unveränderte
  // Mindestbreite (~864px, ausserhalb P15-Scope, s. Kopfkommentar B-138).
  const overflowX = await page.evaluate(
    () => getComputedStyle(document.querySelector('.app-zentrale-scroll')!).overflowX,
  );
  expect(overflowX).toBe('hidden');

  // Die sichtbaren, interaktiven Teile des Hubs (Ring + alle 4 Hauptwerkzeug-
  // Knöpfe) bleiben innerhalb des Viewports — das ist der eigentliche
  // Praxis-Test für "responsiv", unabhängig vom scrollWidth-Grenzfall oben.
  await expect(page.locator('[data-testid="orbit-start"]')).toBeVisible();
  for (const id of ['design', 'data', 'kosmo', 'office']) {
    const box = await page.locator(`[data-testid="orbit-haupt-${id}"]`).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(820 + 1);
  }
  await expect(page.locator('[data-testid="module-design"]')).toBeAttached();
});

test('Neues-Projekt-Zeile bricht unter 480px um statt den Viewport zu sprengen (app.css additive Mobil-Regel)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await zentraleLaden(page);
  const feld = page.locator('[data-testid="projekt-neu-name"]');
  await expect(feld).toBeVisible();
  const box = await feld.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(400);
});
