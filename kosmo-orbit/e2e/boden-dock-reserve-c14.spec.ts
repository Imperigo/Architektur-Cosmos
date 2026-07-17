import { expect, test, type Page } from '@playwright/test';

/**
 * v0.8.1 P16-Fixes / C-14 (`docs/V081-SPEZ.md` §4.3/§9, Nachzug zu P11/W2-P3)
 * — BodenDock-Reserve-Verifikation für die vier Stationen, die
 * `dock-stationen.ts`s Kopfkommentar bisher als «NICHT Teil dieser Runde»
 * auswies: `daten`/`wissen` (beide `DataWorkspace.tsx`, Tabs `referenzen`/
 * `wissen`), `chat` (KosmoPanel, `deepLink:'speak'`) und `pipeline`
 * (`dev`-Screen, `DevWorkspace.tsx`). Diese vier Stationen haben KEINE
 * `DockFlaeche` (die misst die reale Boden-Dock-Position live) — ohne
 * eigene Reserve lief der unterste Scroll-Inhalt strukturell hinter die
 * fixe Boden-Dock-Pille (`bottom:96px`, `boden-dock.css`).
 *
 * Befund (Trockenlauf gegen :5174, s. Abschlussbericht P16-Fixes):
 * - `daten`/`wissen`: ECHTE Kollision — die letzte Tabellenzeile/Kartenreihe
 *   blieb am Ende des Scrollbereichs permanent unter der Pille hängen
 *   (max. `scrollTop` liess sie exakt am unteren Rand des Containers
 *   stehen, wo die Pille liegt) → gefixt: `DataWorkspace.tsx`s `.kd-scroll`
 *   bekommt zusätzliches Bottom-Padding in Höhe von `BODEN_DOCK_RESERVE_PX`
 *   (Reserve-Konsum-Muster wie `PublishWorkspace.tsx`).
 * - `pipeline` (dev): dieselbe echte Kollision bei einer gefüllten
 *   Auftragsliste (mit 0 Aufträgen unsichtbar, ab der ersten Karte real)
 *   → gefixt: `DevWorkspace.tsx`s `.dev-viewport` bekommt dieselbe Reserve.
 * - `chat` (KosmoPanel): KEINE Kollision — das Panel ist eine rechte
 *   340px-Spalte (`kp-panel`), die horizontale Boden-Dock-Zone
 *   (`left:50%`, zentriert, `max-width:640px`) erreicht sie nie → bleibt
 *   ohne Fix, die Prüfung unten bleibt ein additiver Bestandsschutz-Vertrag.
 *
 * Die eigentliche Kollisionsfrage bei einem FIXEN Bottom-Element über einem
 * scrollenden Bereich ist NICHT «überlappt die Gesamt-Container-BoundingBox
 * die Pille?» (die überlappt praktisch immer, weil der Container die volle
 * Stations-Höhe einnimmt) — sondern «kann der/die Nutzer:in das letzte
 * Element vollständig über die Pille scrollen, oder bleibt es dort für
 * immer unerreichbar hängen?». Das ist die BoundingBox-Disjunktion, die
 * hier je Station geprüft wird (Inhalt nach Scroll-zum-Ende vs. Boden-
 * Dock-Container).
 */

function ueberDemDock(
  inhalt: { y: number; height: number },
  dock: { y: number },
): boolean {
  return inhalt.y + inhalt.height <= dock.y;
}

async function seed(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
}

/** Scrollt den Container an den Boden, bis `scrollHeight` zwischen zwei
 *  Versuchen stabil bleibt — die Datenstation justiert die Feld-Höhe nach
 *  dem ersten Scroll noch nach (Such-/Filter-Adaption, Messrahmen-Reflow),
 *  ein fester Scroll-Zähler wäre hier flakiges Timing. Bricht spätestens
 *  nach 8 Versuchen ab (grosszügig, bleibt weit unter dem Test-Timeout). */
async function scrolleZumBoden(page: Page, containerSel: string): Promise<void> {
  let vorher = -1;
  for (let i = 0; i < 8; i++) {
    const nachher = await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return -1;
      el.scrollTop = el.scrollHeight;
      return el.scrollHeight;
    }, containerSel);
    if (nachher === vorher) return;
    vorher = nachher;
    await page.waitForTimeout(300);
  }
}

test.describe('BodenDock-Reserve — daten/wissen/chat/pipeline (C-14)', () => {
  test('daten (Referenzen-Tab): letzte Tabellenzeile lässt sich vollständig über die Boden-Dock-Pille scrollen', async ({
    page,
  }) => {
    await seed(page);
    await page.click('[data-testid="module-data"]');
    await expect(page.locator('[data-testid="boden-dock"]')).toBeVisible();
    await expect(page.locator('[data-testid="ref-card"]').first()).toBeVisible();

    await scrolleZumBoden(page, '.kd-scroll');

    const dockBox = (await page.locator('[data-testid="boden-dock"]').boundingBox())!;
    const letzteZeile = page.locator('[data-testid="ref-card"]').last();
    const zeileBox = (await letzteZeile.boundingBox())!;
    expect(ueberDemDock(zeileBox, dockBox)).toBe(true);
  });

  test('wissen-Tab: letzter Wissensbasis-Eintrag lässt sich vollständig über die Boden-Dock-Pille scrollen', async ({
    page,
  }) => {
    await seed(page);
    await page.click('[data-testid="module-data"]');
    await page.click('[data-testid="tab-wissen"]');
    await expect(page.locator('[data-testid="boden-dock"]')).toBeVisible();
    const inhalt = page.locator('.kd-content');
    await expect(inhalt).toBeVisible();

    await scrolleZumBoden(page, '.kd-scroll');

    const dockBox = (await page.locator('[data-testid="boden-dock"]').boundingBox())!;
    const letztesElement = page.locator('.kd-content button').last();
    const box = (await letztesElement.boundingBox())!;
    expect(ueberDemDock(box, dockBox)).toBe(true);
  });

  test('chat (KosmoPanel): rechte Spalte erreicht die zentrierte Boden-Dock-Zone nie — additiver Bestandsschutz', async ({
    page,
  }) => {
    await seed(page);
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="kosmo-symbol"]');
    await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="boden-dock"]')).toBeVisible();

    const dockBox = (await page.locator('[data-testid="boden-dock"]').boundingBox())!;
    const panelBox = (await page.locator('[data-testid="kosmo-panel"]').boundingBox())!;
    const ueberlappenSich =
      dockBox.x < panelBox.x + panelBox.width &&
      dockBox.x + dockBox.width > panelBox.x &&
      dockBox.y < panelBox.y + panelBox.height &&
      dockBox.y + dockBox.height > panelBox.y;
    expect(ueberlappenSich).toBe(false);
  });

  test('pipeline (dev): letzte Auftragskarte lässt sich vollständig über die Boden-Dock-Pille scrollen', async ({
    page,
  }) => {
    await seed(page);
    await page.click('[data-testid="module-dev"]');
    await expect(page.locator('[data-testid="boden-dock"]')).toBeVisible();

    // Auftragsbuch ist frisch leer — ohne Karten ist die Kollisionsfrage
    // nicht beantwortbar, also erst ein paar Aufträge erfassen (Muster
    // `auftragsbuch`-Erfassungsfeld, reale UI-Interaktion, kein Store-Mock).
    for (let i = 0; i < 6; i++) {
      await page.fill('[data-testid="auftrag-text"]', `Testauftrag Nr. ${i + 1} (C-14-Kollisionsprüfung)`);
      await page.click('[data-testid="auftrag-erfassen"]');
      await expect(page.locator('[data-testid="auftrag-karte"]')).toHaveCount(i + 1);
    }

    await scrolleZumBoden(page, '.dev-viewport');

    const dockBox = (await page.locator('[data-testid="boden-dock"]').boundingBox())!;
    const letzteKarte = page.locator('[data-testid="auftrag-karte"]').last();
    const karteBox = (await letzteKarte.boundingBox())!;
    expect(ueberDemDock(karteBox, dockBox)).toBe(true);
  });
});
