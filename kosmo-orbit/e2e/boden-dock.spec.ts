import { expect, test, type Page } from '@playwright/test';

/**
 * v0.7.3 Bau-Agent S5 — Boden-Dock (app-weit, additiver Navigations-Layer
 * unten Mitte, `shell/BodenDock.tsx`). Drei harte Beweise:
 *
 * 1. BoundingBox-Disjunktion: der Dock überlappt NICHT die bestehende
 *    KosmoDesign-Statusleiste (`data-testid="statusleiste"`,
 *    `oberflaeche-minimal.spec.ts`) — beide sichtbar gleichzeitig in
 *    KosmoDesign, das ist der einzige Screen mit einer Statusleiste.
 * 2. Klick-Durchlässigkeit AUSSERHALB der Knöpfe: der Dock-Container selbst
 *    trägt `pointer-events:none` (Auftragslehre «kein unsichtbares Klick-
 *    Overlay», arbeitsmodi:111) — ein Klick in eine Lücke IM Dock-Bereich
 *    (nicht auf einem Knopf) muss ein darunterliegendes Element erreichen.
 * 3. Kosmo-Orb (`kosmo-symbol`) ist sichtbar, der Dock zeigt seine Rang-
 *    Kreise mit Rollenfarben.
 *
 * ABWEICHUNG (ehrlich dokumentiert, s. Kopfkommentar `BodenDock.tsx`): der
 * Kosmo-Orb ist NICHT als DOM-Kind von `boden-dock` eingebettet — App.tsx
 * rendert `<KosmoSymbol>` bereits an anderer, nicht anfassbarer Stelle
 * (Zeile ~930, WÖRTLICH unverändert). Eine zweite Instanz hier hätte zwei
 * `data-testid="kosmo-symbol"`-Knoten erzeugt (Playwright-Strict-Mode-Bruch,
 * u.a. in `kosmo-symbol.spec.ts`). Test 3 beweist deshalb nur Sichtbarkeit,
 * keine DOM-Verschachtelung.
 */

async function oeffneKosmoDesign(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG + Standard-Aufbauten
  await page.click('[data-testid="view-2d"]'); // Statusleiste ist im 2D-Plan am ruhigsten positioniert
}

function ueberlappenSich(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

test('Boden-Dock ist app-weit sichtbar (auch auf der Zentrale)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await expect(page.locator('[data-testid="boden-dock"]')).toBeVisible();
  // Mindestens ein Werkzeug-Knopf ist im Dock (die 8 Canvas-Werkzeuge aus
  // `ALLE_TOOL_IDS`, `state/orbit-rang.ts`).
  await expect(page.locator('[data-testid="boden-dock"] .boden-dock-knopf').first()).toBeVisible();
});

test('BoundingBox-Disjunktion: Boden-Dock überlappt die Statusleiste nicht', async ({ page }) => {
  await oeffneKosmoDesign(page);

  const dock = page.locator('[data-testid="boden-dock"]');
  const statusleiste = page.locator('[data-testid="statusleiste"]');
  await expect(dock).toBeVisible();
  await expect(statusleiste).toBeVisible();

  const dockBox = await dock.boundingBox();
  const statusBox = await statusleiste.boundingBox();
  expect(dockBox).not.toBeNull();
  expect(statusBox).not.toBeNull();

  expect(ueberlappenSich(dockBox!, statusBox!)).toBe(false);
});

test('Klick-Durchlässigkeit: eine Lücke im Dock-Bereich (ausserhalb der Knöpfe) blockiert keinen Klick', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();

  const dock = page.locator('[data-testid="boden-dock"]');
  await expect(dock).toBeVisible();
  const dockBox = (await dock.boundingBox())!;

  // Ein Punkt am oberen Rand der Dock-BoundingBox, innerhalb des Innenabstands
  // (`padding: 10px 16px`, `boden-dock.css`) — oberhalb der Knopfreihe, also
  // garantiert NICHT auf einem `.boden-dock-knopf`, aber innerhalb der
  // sichtbaren Glas-Fläche des Containers.
  const x = dockBox.x + dockBox.width / 2;
  const y = dockBox.y + 3;

  // Splash-Spec-Muster (`splash.spec.ts`): ein echter Testknopf HINTER dem
  // Dock, exakt an diesem Punkt, niedrigerer z-index als der Dock (108).
  await page.evaluate(
    ({ x, y }) => {
      const knopf = document.createElement('button');
      knopf.id = 'boden-dock-klick-test';
      knopf.style.position = 'fixed';
      knopf.style.left = `${x - 20}px`;
      knopf.style.top = `${y - 20}px`;
      knopf.style.width = '40px';
      knopf.style.height = '40px';
      knopf.style.zIndex = '50';
      knopf.addEventListener('click', () => knopf.setAttribute('data-geklickt', 'ja'));
      document.body.appendChild(knopf);
    },
    { x, y },
  );

  // Kommt der Klick durch, ist bewiesen: der Dock-Container (`pointer-events:
  // none`) fängt an dieser Lücken-Stelle nichts ab. Playwright würfe von
  // selbst einen sprechenden «intercepts pointer events»-Fehler, träfe der
  // Klick stattdessen auf den Dock-Container — kein `force:true`.
  await page.mouse.click(x, y);
  await expect(page.locator('#boden-dock-klick-test')).toHaveAttribute('data-geklickt', 'ja');
});

test('Kosmo-Orb sichtbar, Boden-Dock zeigt Rang-Kreise mit Rollenfarben', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();

  // K11-Vertrag bleibt unverändert: Kosmo-Symbol ist der Erstkontakt.
  await expect(page.locator('[data-testid="kosmo-symbol"]')).toBeVisible();

  const knoepfe = page.locator('[data-testid="boden-dock"] .boden-dock-knopf');
  await expect(knoepfe.first()).toBeVisible();
  expect(await knoepfe.count()).toBe(8); // ALLE_TOOL_IDS: 8 Canvas-Werkzeuge

  // Jeder Knopf trägt eine Rollenfarbe NICHT nur über Farbe (Status-Regel) —
  // `aria-label`/`title` nennen die Rolle im Klartext.
  const erster = knoepfe.first();
  await expect(erster).toHaveAttribute('aria-label', /Rolle/);
  await expect(erster).toHaveAttribute('title', /Rolle/);

  // Top-3 (Rang-Position 0-2) tragen die Rollenfarben-Border/Glow-Klasse.
  const innenKreise = page.locator('[data-testid="boden-dock"] .boden-dock-knopf--innen');
  expect(await innenKreise.count()).toBe(3);
});

test('Kollaps unter ~1100px: nur Top-3-Knöpfe sichtbar, Rest bleibt im DOM', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();

  const alleKnoepfe = page.locator('[data-testid="boden-dock"] .boden-dock-knopf');
  expect(await alleKnoepfe.count()).toBe(8); // KEIN DOM-Entfall

  let sichtbar = 0;
  for (let i = 0; i < 8; i++) {
    if (await alleKnoepfe.nth(i).isVisible()) sichtbar++;
  }
  expect(sichtbar).toBe(3);
});
