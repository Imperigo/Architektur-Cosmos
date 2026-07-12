import { expect, test, type Page } from '@playwright/test';

/**
 * v0.7.3 Bau-Agent S5 — Boden-Dock (additiver Navigations-Layer unten Mitte,
 * `shell/BodenDock.tsx`). v073 S5b: der Dock erscheint NUR in einer Arbeits-
 * Modul-Ansicht, NICHT auf der Zentrale/Home (dort ist der OrbitStart-Hub
 * bereits die Navigation — s. erster Test). Harte Beweise:
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
 * v0.7.4 P3 (Owner-Wunschfeature «Kosmo-Orb ins Dock»): der Kosmo-Orb ist
 * jetzt tatsächlich als DOM-Kind von `boden-dock` eingebettet (rechter Slot,
 * `.boden-dock-kosmo-slot`, `KosmoSymbol.tsx` `eingebettet`-Variante).
 * App.tsx rendert das freistehende `<KosmoSymbol>` nur noch auf der
 * Zentrale/Home (`screen === 'home'`) — in einer Modul-Ansicht existiert
 * deshalb genau EIN `data-testid="kosmo-symbol"`-Knoten (hier im Dock),
 * niemals zwei (Playwright-Strict bleibt unverletzt).
 */

async function seed(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

/** v073 S5b: der Boden-Dock ist ein Modul-Navigations-Layer und erscheint NUR
 *  in einer Arbeits-Modul-Ansicht (nicht auf der Zentrale/Home). Alle Dock-
 *  Beweise öffnen deshalb zuerst ein Modul. */
async function oeffneModulAnsicht(page: Page): Promise<void> {
  await seed(page);
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG + Standard-Aufbauten
}

async function oeffneKosmoDesign(page: Page): Promise<void> {
  await oeffneModulAnsicht(page);
  await page.click('[data-testid="view-2d"]'); // Statusleiste ist im 2D-Plan am ruhigsten positioniert
}

function ueberlappenSich(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

test('Boden-Dock erscheint in einer Modul-Ansicht, NICHT auf der Zentrale', async ({ page }) => {
  // v073 S5b: auf der Zentrale/Home IST der OrbitStart-Hub die Navigation —
  // der Dock würde dort doppeln und mit den Hub-Teasern kollidieren.
  await seed(page);
  await expect(page.locator('[data-testid="boden-dock"]')).toHaveCount(0);

  // Modul öffnen → der Dock erscheint als zusätzlicher Navigations-Layer.
  await page.click('[data-testid="module-design"]');
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
  await oeffneModulAnsicht(page);

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
  await oeffneModulAnsicht(page);

  // K11-Vertrag bleibt unverändert: Kosmo-Symbol ist der Erstkontakt.
  // v0.7.4 P3: in einer Modul-Ansicht ist es genau EIN Knoten, eingebettet
  // im Dock (rechter Slot) — kein zweiter, freistehender Knoten daneben.
  await expect(page.locator('[data-testid="kosmo-symbol"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="boden-dock"] [data-testid="kosmo-symbol"]')).toBeVisible();

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

test('Einzel-Instanz-Invariante: Klick im Dock öffnet das Panel, Symbol verschwindet, Schliessen bringt genau eine Instanz zurück', async ({
  page,
}) => {
  await oeffneModulAnsicht(page);

  await expect(page.locator('[data-testid="kosmo-symbol"]')).toHaveCount(1);
  await page.click('[data-testid="kosmo-symbol"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();
  // Panel offen → nirgends im Dock ODER app-weit ein zweites Symbol.
  await expect(page.locator('[data-testid="kosmo-symbol"]')).toHaveCount(0);
  // Boden-Dock selbst bleibt (Werkzeuge weiter erreichbar), nur der Slot leert sich.
  await expect(page.locator('[data-testid="boden-dock"]')).toBeVisible();

  await page.click('[aria-label="Schliessen"]');
  await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveCount(0);
  // Wieder genau EINE Instanz, weiterhin eingebettet im Dock (Screen ist
  // nicht Home).
  await expect(page.locator('[data-testid="kosmo-symbol"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="boden-dock"] [data-testid="kosmo-symbol"]')).toBeVisible();
});

test('Kollaps unter ~1100px: nur Top-3-Knöpfe sichtbar, Rest bleibt im DOM', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await oeffneModulAnsicht(page);

  const alleKnoepfe = page.locator('[data-testid="boden-dock"] .boden-dock-knopf');
  expect(await alleKnoepfe.count()).toBe(8); // KEIN DOM-Entfall

  let sichtbar = 0;
  for (let i = 0; i < 8; i++) {
    if (await alleKnoepfe.nth(i).isVisible()) sichtbar++;
  }
  expect(sichtbar).toBe(3);
});
