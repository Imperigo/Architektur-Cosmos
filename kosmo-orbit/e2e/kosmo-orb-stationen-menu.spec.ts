import { expect, test, type Page } from '@playwright/test';

/**
 * P-F2 (v0.9.2, Owner-Feedback 23.07. + bindende AskUserQuestion-Antwort,
 * revidiert die ursprüngliche Zurückstellung dieses Bauagenten): die
 * frühere «Kosmo»-Hauptkachel in der Zentrale-Reihe (`OrbitStart.tsx`,
 * `KACHEL_REIHENFOLGE`) ist entfallen. Owner wörtlich: «der Kosmo-Orb
 * rechts unten übernimmt die 8 Unter-Stationen … über ein Menü am Orb …
 * Kein Strand: alle 8 Stationen müssen über den Orb erreichbar SEIN und
 * per E2E bewiesen werden.»
 *
 * Diese Suite ist genau dieser Beweis: der Kosmo-Orb (`shell/
 * KosmoSymbol.tsx`, testid `kosmo-symbol`) öffnet per RECHTSKLICK
 * (`contextmenu`) ein Menü (`kosmo-stationen-menu`) mit den 8 echten
 * Kosmo-Untertools (Speak/Sketch/Modell/Train/Dev/Doc/Trust/Package,
 * dieselbe Registry wie zuvor `orbit-werkzeuge.ts` `id:'kosmo'`) — jede
 * Testid ist dieselbe `module-<id>`/`testidOverride`-Konvention wie vorher
 * an der Zentrale-Kachel, damit Bestands-Specs nur einen vorangestellten
 * Rechtsklick brauchen (kein zweiter Testid-Namensraum).
 *
 * Rechtsklick als Geste ist bewusst gewählt, nicht neu erfunden: Hover
 * (Mini-Popup), Einfachklick (Konversationskarte) und Doppelklick (Panel)
 * sind laut Orb-Gesetz (PB4/V084) bereits vergeben — `contextmenu` war auf
 * `kosmo-symbol` bislang ungenutzt.
 *
 * Übernommene/verschobene Beweise aus anderen Specs (dort entfernt, s.
 * jeweiliger P-F2-Kommentar): `e2e/zentrale-bloecke.spec.ts` («Kosmo-Fächer,
 * 8 Blöcke, linksbündig» + iPad-Tap).
 */

function ueberlappenSich(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function zentraleLaden(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
  await page.waitForSelector('[data-testid="orbit-start"]');
}

/** Die 8 realen Kosmo-Untertools mit ihrer Testid (testidOverride bei
 *  «Modell», sonst `module-<moduleId>`) + erwarteter Klartext-Titel —
 *  dieselbe Quelle wie `KosmoSymbol.tsx`s `KOSMO_STATIONEN`. */
const KOSMO_EINTRAEGE: { testid: string; titel: string }[] = [
  { testid: 'module-speak', titel: 'Speak' },
  { testid: 'module-sketch', titel: 'Sketch' },
  { testid: 'orbit-sub-modell', titel: 'Modell' },
  { testid: 'module-train', titel: 'Train' },
  { testid: 'module-dev', titel: 'Dev' },
  { testid: 'module-doc', titel: 'Doc' },
  { testid: 'module-trust', titel: 'Trust' },
  { testid: 'module-paket', titel: 'Package' },
];

test('Rechtsklick auf den Kosmo-Orb öffnet das Stationen-Menü mit allen 8 Einträgen', async ({ page }) => {
  await zentraleLaden(page);
  await expect(page.locator('[data-testid="kosmo-stationen-menu"]')).toHaveCount(0);

  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  const menu = page.locator('[data-testid="kosmo-stationen-menu"]');
  await expect(menu).toBeVisible();

  for (const { testid, titel } of KOSMO_EINTRAEGE) {
    const eintrag = menu.locator(`[data-testid="${testid}"]`);
    await expect(eintrag).toBeVisible();
    await expect(eintrag).toContainText(titel);
  }
});

test('Stationen-Menü: alle 8 Einträge linksbündig UND paarweise überlappungsfrei (kein Text-Gewusel)', async ({
  page,
}) => {
  await zentraleLaden(page);
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  const menu = page.locator('[data-testid="kosmo-stationen-menu"]');
  await expect(menu).toBeVisible();

  const boxen: { x: number; y: number; width: number; height: number }[] = [];
  for (const { testid } of KOSMO_EINTRAEGE) {
    const box = await menu.locator(`[data-testid="${testid}"]`).boundingBox();
    expect(box, `${testid} fehlt`).not.toBeNull();
    boxen.push(box!);
  }
  for (const box of boxen) {
    expect(Math.abs(box.x - boxen[0]!.x)).toBeLessThan(1);
  }
  for (let i = 0; i < boxen.length; i++) {
    for (let j = i + 1; j < boxen.length; j++) {
      expect(ueberlappenSich(boxen[i]!, boxen[j]!)).toBe(false);
    }
  }
});

test('Esc und Aussenklick schliessen das Stationen-Menü', async ({ page }) => {
  await zentraleLaden(page);
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await expect(page.locator('[data-testid="kosmo-stationen-menu"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="kosmo-stationen-menu"]')).toHaveCount(0);

  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await expect(page.locator('[data-testid="kosmo-stationen-menu"]')).toBeVisible();
  await page.mouse.click(20, 20);
  await expect(page.locator('[data-testid="kosmo-stationen-menu"]')).toHaveCount(0);
});

// «Kein Strand»: jede der 8 Stationen öffnet über den Orb wirklich —
// dieselbe Prüfung, die vorher die Zentrale-Kachel bewies (Klick auf die
// entfallene `orbit-haupt-kosmo`-Kachel + ihren Fächer), jetzt am Orb.
test('Kein Strand: alle 8 Kosmo-Stationen öffnen über das Orb-Menü die echte Station', async ({ page }) => {
  await zentraleLaden(page);

  // Speak: öffnet das Kosmo-Panel (kein eigener Screen, Owner-Wortlaut
  // «keine eigene Station-Route» — unverändert seit `pb4-orb-gesetz`).
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="module-speak"]');
  await expect(page.locator('[data-testid="kosmo-input"]')).toBeVisible();
  await page.click('[aria-label="Schliessen"]');

  // Sketch: aktiviert das Skizze-Werkzeug in KosmoDesign (Deep-Link).
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="module-sketch"]');
  await expect(page.locator('[data-testid="tool-skizze"]')).toBeVisible();
  await page.click('header button[aria-label="Zur Zentrale"]');

  // Modell: verweist ehrlich auf Draw in KosmoDesign (testidOverride,
  // s. `orbit-werkzeuge.ts`-Kopfkommentar — kein eigenständiges Werkzeug).
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="orbit-sub-modell"]');
  await expect(page.locator('[data-testid="planview"], [data-testid="inspector"], canvas').first()).toBeVisible();
  await page.click('header button[aria-label="Zur Zentrale"]');

  // Train: KosmoTrain-Werkstatt.
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="module-train"]');
  await expect(page.locator('[data-testid="orbit-start"]')).toHaveCount(0);
  await page.click('header button[aria-label="Zur Zentrale"]');

  // Dev: Auftragsbuch.
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="module-dev"]');
  await expect(page.locator('[data-testid="auftrag-erfassen"]')).toBeVisible();
  await page.click('header button[aria-label="Zur Zentrale"]');

  // Doc: Diagnose/Hilfe.
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="module-doc"]');
  await expect(page.locator('[data-testid="doc-tab-diagnose"]')).toBeVisible();
  await page.click('header button[aria-label="Zur Zentrale"]');

  // Trust: .kxp-Viewer/Freigabe-Werkzeugleiste.
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="module-trust"]');
  await expect(page.locator('[data-testid="kxp-werkzeugleiste"]')).toBeVisible();
  await page.click('header button[aria-label="Zur Zentrale"]');

  // Package: Export-Hub.
  await page.click('[data-testid="kosmo-symbol"]', { button: 'right' });
  await page.click('[data-testid="module-paket"]');
  await expect(page.locator('[data-testid="paket-werkzeugleiste"]')).toBeVisible();
});

test.describe('iPad 1024×768 (Touch)', () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true });

  test('Stationen-Menü lässt sich per Touch öffnen und bedienen (Tap auf den Orb, Tap auf einen Eintrag)', async ({
    page,
  }) => {
    await zentraleLaden(page);
    // Playwright kennt für Touch kein natives Rechtsklick-Äquivalent — ein
    // `contextmenu`-Event ist auch auf Touch-Geräten (Langdruck) real; wir
    // lösen es hier direkt aus (dieselbe Handler-Zuordnung, die ein echter
    // Langdruck im Browser auch triggert), statt eine Zeit-basierte
    // Langdruck-Simulation nachzubauen.
    await page.locator('[data-testid="kosmo-symbol"]').dispatchEvent('contextmenu');
    const menu = page.locator('[data-testid="kosmo-stationen-menu"]');
    await expect(menu).toBeVisible();

    for (const { testid } of KOSMO_EINTRAEGE) {
      const box = await menu.locator(`[data-testid="${testid}"]`).boundingBox();
      expect(box, `${testid} fehlt`).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(43.5);
    }

    await menu.locator('[data-testid="module-train"]').tap();
    await expect(page.locator('[data-testid="orbit-start"]')).toHaveCount(0);
  });
});
