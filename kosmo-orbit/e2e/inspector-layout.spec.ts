import { expect, test } from '@playwright/test';

/**
 * H-43 (v0.7.0, Stream 1B) — Inspector-Panel vs. schwebende Leisten.
 *
 * Befund (SIM-BEFUNDE v0.6.9-Statusrunde): der rechts-unten verankerte
 * Inspector lag mit seinen untersten Zeilen («Umbau»-KSelect, «Löschen»)
 * GENAU im Streifen von NavLeiste (right:88/bottom:50, z-5) und Kosmo-Symbol
 * (z-110) — deren Klickflächen gewannen, Inspector-Trigger darunter waren nur
 * per dispatchEvent erreichbar (der ehrliche Fallback in
 * `e2e/helfer/waehleOption.ts`). Der Fix hebt die Inspector-Unterkante über
 * diese Ecke (Inspector.tsx). Diese Spec beweist mit ECHTEN Playwright-Klicks
 * (Actionability-Check: ein verdecktes Ziel liesse den Klick scheitern —
 * bewusst KEIN dispatchEvent, KEIN `force`), dass bei offenem Inspector alle
 * beteiligten Blöcke bedienbar bleiben.
 */

// H-43 wurde bei ~1280 px Breite gemeldet — die Spec fährt bewusst das
// schmale Fenster statt des Suite-Defaults (1400×900).
test.use({ viewport: { width: 1280, height: 800 } });

test('H-43: Inspector offen (1280×800) — Umbau-KSelect, NavLeiste und linke Leiste per echtem Klick bedienbar', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Block-E-Guide fängt sonst Klicks unter seiner Karte ab (Muster module.spec).
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await page.click('[data-testid="view-2d"]');

  // Wand bauen und anwählen → der (lange) Wand-Inspector öffnet sich.
  const wallId = await page.evaluate(() => {
    const k = window.__kosmo;
    const st = k.state();
    const aw = st.doc.byKind('assembly').find((a) => a.name?.startsWith('AW'))!;
    const r = k.run('design.wandZeichnen', {
      storeyId: st.activeStoreyId,
      a: { x: 0, y: 0 },
      b: { x: 8000, y: 0 },
      assemblyId: aw.id,
    });
    return r.patches[0]!.id;
  });
  await page.evaluate((id) => window.__kosmo.state().select([id]), wallId);
  const inspector = page.locator('[data-testid="inspector"]');
  await expect(inspector).toBeVisible();

  // Kein physischer Überlapp mehr: Inspector-Rechteck schneidet weder die
  // NavLeiste (nav-fit als Stellvertreter) noch das Kosmo-Symbol.
  // v0.7.8 Welle 2 (P4): gemessen wird das DOCK-PANEL-Rechteck — der
  // Inspector ist jetzt ein Dock-Panel der rechten Spalte; sein INHALT
  // (`data-testid="inspector"`) liegt in einem Scroll-Container, dessen
  // BoundingRect die UNGECLIPPTE Layout-Höhe meldet (ragt rechnerisch unter
  // das sichtbar gerenderte Panel hinaus). Die H-43-Garantie «keine
  // physische Überdeckung» gilt für die GEMALTEN Pixel, also das
  // Panel-Rechteck; die Klick-Beweise unten (der eigentliche Kern von H-43)
  // bleiben unverändert echte Playwright-Klicks.
  const inspBox = (await page.locator('[data-testid="dock-panel-inspector"]').boundingBox())!;
  for (const testid of ['nav-fit', 'kosmo-symbol']) {
    const box = await page.locator(`[data-testid="${testid}"]`).boundingBox();
    expect(box, `${testid} muss sichtbar sein`).not.toBeNull();
    const schneidet =
      box!.x < inspBox.x + inspBox.width &&
      box!.x + box!.width > inspBox.x &&
      box!.y < inspBox.y + inspBox.height &&
      box!.y + box!.height > inspBox.y;
    expect(schneidet, `${testid} darf den Inspector nicht schneiden`).toBe(false);
  }

  // 1) Die vorher verdeckte «Umbau»-Zeile: echter Klick öffnet das KSelect-
  //    Popup, echter Klick wählt — exakt der Weg, der vor dem Fix nur über
  //    den dispatchEvent-Fallback funktionierte.
  await page.click('[data-testid="inspector-renovation"]', { timeout: 8000 });
  const popup = page.locator('[data-testid="inspector-renovation-popup"]');
  await expect(popup).toBeVisible();
  await popup.locator('[data-value="bestand"]').click({ timeout: 8000 });
  await expect(page.locator('[data-testid="inspector-renovation"]')).toHaveAttribute('data-value', 'bestand');

  // 2) NavLeiste bleibt bedienbar (sie hatte den Klick vorher «gewonnen» —
  //    jetzt haben beide Blöcke ihre eigene Fläche): echter Klick auf Fit.
  await page.click('[data-testid="nav-fit"]', { timeout: 8000 });

  // 3) Linke Leiste (EntwurfsDock): ein Element ist bei offenem Inspector
  //    per echtem Klick erreichbar — «CAD» ist der aktive Default-Modus,
  //    der Klick ist zustandsneutral und muss schlicht durchkommen.
  await page.click('[data-testid="entwurf-cad"]', { timeout: 8000 });
  await expect(page.locator('[data-testid="entwurf-cad"]')).toHaveAttribute('aria-pressed', 'true');

  // Inspector ist nach alldem unverändert offen (nichts hat ihn weggeklickt).
  await expect(inspector).toBeVisible();
});
