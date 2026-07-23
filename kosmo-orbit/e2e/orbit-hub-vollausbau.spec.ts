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

// P-F2 (v0.9.2, bindende Owner-Entscheidung nach AskUserQuestion): 7 der 14
// Stationen (sketch/dev/speak/doc/train/trust/paket — die frühere
// «Kosmo»-Fächer-Gruppe) sind keine Zentrale-Kachel mehr; sie hängen jetzt
// NUR, solange das Kosmo-Orb-Rechtsklick-Menü offen ist (kein Harter
// Vertrag mehr für diese Gruppe). Die übrigen 7 (design-Gruppe: design/draw/
// vis/publish/prepare; data-Gruppe: data/asset) bleiben unverändert IMMER
// im DOM.
const ZENTRALE_KACHEL_STATIONEN = ['design', 'draw', 'vis', 'publish', 'prepare', 'data', 'asset'];
const KOSMO_ORB_STATIONEN = ['sketch', 'dev', 'speak', 'doc', 'train', 'trust', 'paket'];

test('alle 14 realen Stationen sind erreichbar (module-<id>), inkl. trust/paket seit P11/P14 — 7 an Zentrale-Kacheln, 7 am Kosmo-Orb-Menü', async ({
  page,
}) => {
  await zentraleLaden(page);
  // «Modell» (orbit-sub-modell) verweist bewusst ein zweites Mal auf
  // `module-design` (s. `shell/orbit-werkzeuge.ts` Kopfkommentar) — das zählt
  // NICHT als 15. Station, `module-<id>` bleibt genau einmal je reale
  // Station im DOM.
  for (const id of ZENTRALE_KACHEL_STATIONEN) {
    await expect(page.locator(`[data-testid="module-${id}"]`)).toHaveCount(1);
  }
  await expect(page.locator('[data-testid^="module-"]')).toHaveCount(ZENTRALE_KACHEL_STATIONEN.length);

  // Kosmo-Gruppe: noch NICHT im DOM, bevor das Orb-Menü öffnet.
  for (const id of KOSMO_ORB_STATIONEN) {
    await expect(page.locator(`[data-testid="module-${id}"]`)).toHaveCount(0);
  }

  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  for (const id of KOSMO_ORB_STATIONEN) {
    await expect(page.locator(`[data-testid="module-${id}"]`)).toHaveCount(1);
  }
  await expect(page.locator('[data-testid^="module-"]')).toHaveCount(ALLE_14_STATIONEN.length);
});

// P-F2 (v0.9.2, bindende Owner-Entscheidung nach AskUserQuestion): «Kosmo»
// ist keine Zentrale-Kachel mehr — Trust/Package laufen jetzt über das
// Rechtsklick-Menü des Kosmo-Orbs (`kosmo-stationen-menu`), dieselben
// `module-trust`/`module-paket`-Testids.
test('Kosmo-Orb-Menü zeigt die Trust-/Package-Stationen mit ihrem echten Klartext', async ({ page }) => {
  await zentraleLaden(page);
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  const menu = page.locator('[data-testid="kosmo-stationen-menu"]');
  await expect(menu).toBeVisible();

  const trust = menu.locator('[data-testid="module-trust"]');
  await expect(trust).toContainText('Trust');

  const paket = menu.locator('[data-testid="module-paket"]');
  await expect(paket).toContainText('Package');
});

test('Klick auf Trust/Package öffnet die echten Stationen (keine Attrappen-Kacheln)', async ({ page }) => {
  await zentraleLaden(page);
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.locator('[data-testid="kosmo-stationen-menu"] [data-testid="module-trust"]').click();
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

  // v0.8.4 PA2 (V084-SPEZ §4 «Scroll-Vertrag → kein Scroll auf home»,
  // ERSETZT den alten reinen `overflow-x`-Check): `.app-zentrale-scroll`
  // (der Home-Container, s. Kommentar in `app.css`) trägt seit PA2
  // `overflow: hidden` auf BEIDEN Achsen und eine definite Höhe (die
  // gesamte Flex-/Grid-Kette bis zur Kachel-Reihe ist `flex:1;min-height:0`)
  // — die ganze Zentrale bleibt darum wörtlich «nicht scrollbar» (Owner-
  // Auftrag), auch bei dieser schmalen 820px-Breite, wo `.orbit065-home-
  // grid` auf eine Spalte kollabiert (s. oben) und die linke Spalte
  // (Begrüssung/Projekte/Varianten) am längsten wird. Root-Scroll bleibt
  // dabei strukturell unmöglich: `document.scrollingElement.scrollHeight`
  // darf `innerHeight` nie überschreiten.
  const { scrollHeight, innerHeight, overflowX, overflowY } = await page.evaluate(() => ({
    scrollHeight: document.scrollingElement!.scrollHeight,
    innerHeight: window.innerHeight,
    overflowX: getComputedStyle(document.querySelector('.app-zentrale-scroll')!).overflowX,
    overflowY: getComputedStyle(document.querySelector('.app-zentrale-scroll')!).overflowY,
  }));
  expect(overflowX).toBe('hidden');
  expect(overflowY).toBe('hidden');
  expect(scrollHeight).toBeLessThanOrEqual(innerHeight);

  // Die sichtbaren, interaktiven Teile des Hubs (Ring + alle Hauptwerkzeug-
  // Knöpfe) bleiben innerhalb des Viewports — das ist der eigentliche
  // Praxis-Test für "responsiv", unabhängig vom scrollWidth-Grenzfall oben.
  // P-F2 (v0.9.2): 'kosmo' ist keine Zentrale-Kachel mehr, s. Kopfkommentar
  // der Trust/Package-Tests oben.
  await expect(page.locator('[data-testid="orbit-start"]')).toBeVisible();
  for (const id of ['design', 'data', 'office']) {
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
