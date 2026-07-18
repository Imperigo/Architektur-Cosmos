import { expect, test, type Page } from '@playwright/test';

/**
 * PB4 (`docs/V084-SPEZ.md` §3 E2 «Orb-Gesetz», §8 C-25) — beweist die
 * Orb-Gesetz-Tabelle END-TO-END über BEIDE Orb-Erscheinungen im
 * PB4-Dateikreis:
 *
 *   | Interaktion       | Verhalten                                        |
 *   |--------------------|--------------------------------------------------|
 *   | Ruhe               | Hülle neutral-glasig, NIE Gold-/Farb-Fläche       |
 *   | Hover/Focus         | Mini-Popup mit Textverlauf                        |
 *   | Einfachklick        | Konversationskarte                                |
 *   | Doppelklick         | KosmoPanel (grosses Kosmo-Menü)                   |
 *   | Esc / Aussenklick   | schliesst Popup/Karte                             |
 *
 * (a) `shell/KosmoSymbol.tsx` (frei schwebend, Home/Zentrale) — der
 *     bisherige Direktweg «Klick öffnet sofort das Panel» ist mit diesem
 *     Paket abgelöst (s. auch die angepassten `kosmo-symbol.spec.ts`/
 *     `kosmo-panel-choreografie.spec.ts`).
 * (b) `modules/design/island/KosmoOrb.tsx` (Island-Modus der design-
 *     Station) — bekommt mit diesem Paket zusätzlich das bisher fehlende
 *     Hover-Mini-Popup UND den Doppelklick-Weg zum Panel (Einfachklick→
 *     Karte war bereits PD4-Bestand, bleibt WÖRTLICH unverändert, s.
 *     `island-ui.spec.ts`, die dieses Paket NICHT anfasst).
 *
 * Ruhe-Hülle: die früheren Gold-Hexwerte (`--f-gold`, `island.css` vor
 * diesem Paket) waren `#8c6f2e` (Papier) / `#cbb06a` (Orbit) — beide sind
 * jetzt ERSATZLOS entfallen (`island.css`-Diff), die Hülle läuft über
 * dieselbe `--f-glass`-Familie wie jede andere Insel-Glasfläche. Diese Suite
 * misst live gegen den Browser (`getComputedStyle`), nicht nur den Quelltext.
 */

const GOLD_PAPIER = 'rgb(140, 111, 46)'; // #8c6f2e
const GOLD_ORBIT = 'rgb(203, 176, 106)'; // #cbb06a

async function frischOhnePanel(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
}

test.describe('(a) shell/KosmoSymbol.tsx — Orb-Gesetz-Tabelle', () => {
  test('Ruhe: die Hülle ist NIE eine Gold-Fläche (Kern+Punkte dürfen stationsfarbig sein)', async ({ page }) => {
    await frischOhnePanel(page);
    const huelle = page.locator('[data-testid="kosmo-symbol"]');
    await expect(huelle).toBeVisible();
    const bg = await huelle.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe(GOLD_PAPIER);
    expect(bg).not.toBe(GOLD_ORBIT);
  });

  test('Hover: Mini-Popup mit Textverlauf', async ({ page }) => {
    await frischOhnePanel(page);
    await page.hover('[data-testid="kosmo-symbol"]');
    const mini = page.locator('[data-testid="kosmo-mini"]');
    await expect(mini).toBeVisible();
    // `.k-einblenden` (aura.css) fährt EIN `animation:…both`-Fill — unter
    // `reducedMotion` läuft sie mit 0.01ms, `toBeVisible()` allein prüft nur
    // Bounding-Box/`visibility`, NICHT `opacity` (Playwright-Eigenheit) —
    // erst der explizite Opacity-Check beweist, dass die Karte auch WIRKLICH
    // sichtbar (nicht nur `opacity:0` im Fill-Mode «from») angekommen ist.
    await expect(mini).toHaveCSS('opacity', '1');
    expect((await mini.innerText()).trim().length).toBeGreaterThan(0);
  });

  test('Einfachklick: Konversationskarte (kosmo-karte) — NICHT das Panel', async ({ page }) => {
    await frischOhnePanel(page);
    await page.click('[data-testid="kosmo-symbol"]');
    const karte = page.locator('[data-testid="kosmo-karte"]');
    await expect(karte).toBeVisible();
    await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveCount(0);
    expect((await page.locator('[data-testid="kosmo-karte-text"]').innerText()).trim().length).toBeGreaterThan(0);
  });

  test('Doppelklick: KosmoPanel öffnet direkt', async ({ page }) => {
    await frischOhnePanel(page);
    await page.dblclick('[data-testid="kosmo-symbol"]');
    await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="kosmo-karte"]')).toHaveCount(0);
  });

  test('Esc schliesst die offene Konversationskarte', async ({ page }) => {
    await frischOhnePanel(page);
    await page.click('[data-testid="kosmo-symbol"]');
    await expect(page.locator('[data-testid="kosmo-karte"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="kosmo-karte"]')).toHaveCount(0);
  });

  test('Aussenklick schliesst die offene Konversationskarte', async ({ page }) => {
    await frischOhnePanel(page);
    await page.click('[data-testid="kosmo-symbol"]');
    await expect(page.locator('[data-testid="kosmo-karte"]')).toBeVisible();
    await page.mouse.click(20, 20);
    await expect(page.locator('[data-testid="kosmo-karte"]')).toHaveCount(0);
  });
});

test.describe('(b) modules/design/island/KosmoOrb.tsx — Orb-Gesetz-Tabelle (Island-Modus)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  async function oeffneDesignIsland(page: Page): Promise<void> {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kosmo.onboarded', '1');
      localStorage.setItem('kosmo.starterGuide.done', '1');
    });
    await page.reload();
    await page.click('[data-testid="module-design"]');
    await expect(page.locator('[data-testid="kosmo-orb-knopf"]')).toBeVisible();
  }

  test('Ruhe: die Hülle ist NIE eine Gold-Fläche', async ({ page }) => {
    await oeffneDesignIsland(page);
    const orb = page.locator('[data-testid="kosmo-orb-knopf"]');
    const bg = await orb.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe(GOLD_PAPIER);
    expect(bg).not.toBe(GOLD_ORBIT);
  });

  test('Hover: Mini-Popup mit Textverlauf (PB4-Ergänzung, fehlte vor diesem Paket)', async ({ page }) => {
    await oeffneDesignIsland(page);
    await page.hover('[data-testid="kosmo-orb-knopf"]');
    const mini = page.locator('[data-testid="kosmo-orb-mini"]');
    await expect(mini).toBeVisible();
    // s. Kommentar im shell/KosmoSymbol-Pendant oben (`.k-einblenden`-Fill-
    // Mode-Race, `toBeVisible()` allein prüft `opacity` nicht).
    await expect(mini).toHaveCSS('opacity', '1');
    expect((await mini.innerText()).trim().length).toBeGreaterThan(0);
  });

  test('Einfachklick: Konversationskarte (kosmo-orb-karte, PD4-Bestand, unverändert)', async ({ page }) => {
    await oeffneDesignIsland(page);
    await page.click('[data-testid="kosmo-orb-knopf"]');
    const karte = page.locator('[data-testid="kosmo-orb-karte"]');
    await expect(karte).toBeVisible();
    await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveCount(0);
  });

  test('Doppelklick: KosmoPanel öffnet direkt (PB4-Ergänzung, existierte vor diesem Paket nirgends)', async ({
    page,
  }) => {
    await oeffneDesignIsland(page);
    await page.dblclick('[data-testid="kosmo-orb-knopf"]');
    await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="kosmo-orb-karte"]')).toHaveCount(0);
  });

  test('Esc schliesst die offene Konversationskarte (PB4-Ergänzung)', async ({ page }) => {
    await oeffneDesignIsland(page);
    await page.click('[data-testid="kosmo-orb-knopf"]');
    await expect(page.locator('[data-testid="kosmo-orb-karte"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="kosmo-orb-karte"]')).toHaveCount(0);
  });

  test('Aussenklick schliesst die offene Konversationskarte (PB4-Ergänzung)', async ({ page }) => {
    await oeffneDesignIsland(page);
    await page.click('[data-testid="kosmo-orb-knopf"]');
    await expect(page.locator('[data-testid="kosmo-orb-karte"]')).toBeVisible();
    await page.mouse.click(20, 20);
    await expect(page.locator('[data-testid="kosmo-orb-karte"]')).toHaveCount(0);
  });
});

test.describe('Screenshots (Gate-Beleg, PB4-Bericht)', () => {
  test('Orb-Hover-Popup, Konversationskarte, KosmoPanel nach Doppelklick — shell/KosmoSymbol', async ({ page }) => {
    await frischOhnePanel(page);
    await page.hover('[data-testid="kosmo-symbol"]');
    const mini = page.locator('[data-testid="kosmo-mini"]');
    await expect(mini).toBeVisible();
    // `.k-einblenden`-Fill-Mode-Race (s. Kommentar oben) — ohne den
    // Opacity-Check zeigt der Screenshot manchmal die `from`-Phase
    // (opacity:0), obwohl `toBeVisible()` selbst schon grün ist.
    await expect(mini).toHaveCSS('opacity', '1');
    await page.screenshot({ path: 'e2e-results/pb4-orb-hover-popup.png' });

    await page.click('[data-testid="kosmo-symbol"]');
    const karte = page.locator('[data-testid="kosmo-karte"]');
    await expect(karte).toBeVisible();
    await expect(karte).toHaveCSS('opacity', '1');
    await page.screenshot({ path: 'e2e-results/pb4-orb-konversationskarte.png' });

    await page.dblclick('[data-testid="kosmo-symbol"]');
    await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();
    await page.screenshot({ path: 'e2e-results/pb4-kosmo-panel-doppelklick.png' });
  });

  test.describe('Publish-Island (echter Default, kein Manuell-Seed)', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('Orb in Publish (bereits gemountet, PC3-Bestand) — Sichtbarkeitsbeleg', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('kosmo.onboarded', '1');
        localStorage.setItem('kosmo.starterGuide.done', '1');
      });
      await page.reload();
      await page.click('[data-testid="module-publish"]');
      await expect(page.locator('[data-testid="kosmo-orb-wurzel"]')).toBeVisible();
      await page.screenshot({ path: 'e2e-results/pb4-orb-publish.png' });
    });
  });

  test.describe('Prepare-Island (echter Default, kein Manuell-Seed)', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('Orb in Prepare — C-25 vollzogen (PB4-Nachzug in PrepareWorkspace)', async ({ page }) => {
      // PB4s Bauagent durfte den Mount nicht setzen (die «kein Kosmo-Orb
      // hier»-Assertion in `e2e/prepare-island.spec.ts` lag ausserhalb seines
      // Dateikreises und wäre rot geworden) — der Nachzug kam darum atomar
      // durch Fable: `PrepareWorkspace.tsx` mountet denselben
      // `island/KosmoOrb` wie Publish, die prepare-island-Assertion ist auf
      // `toBeVisible()` gedreht. Damit gilt das E2-Orb-Gesetz in allen vier
      // Island-Stationen.
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('kosmo.onboarded', '1');
        localStorage.setItem('kosmo.starterGuide.done', '1');
      });
      await page.reload();
      await page.click('[data-testid="module-prepare"]');
      await expect(page.locator('[data-testid="prepare-island-fuellen"]')).toBeVisible();
      await expect(page.locator('[data-testid="kosmo-orb-wurzel"]')).toBeVisible();
      await page.screenshot({ path: 'e2e-results/pb4-orb-prepare.png' });
    });
  });
});
