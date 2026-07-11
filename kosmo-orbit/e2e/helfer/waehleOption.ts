import type { Locator, Page } from '@playwright/test';

/**
 * waehleOption (v0.6.9) — der EINE Interaktionsweg für KSelect im E2E.
 *
 * KSelect ist seit v0.6.9 ein Custom-Dropdown (packages/kosmo-ui/src/
 * select.tsx): `page.selectOption` funktioniert nicht mehr. Der neue
 * Vertrag: `data-testid` sitzt am Trigger-Button (trägt `data-value` mit
 * dem aktuellen Wert), das Popup heisst `${testid}-popup` (role=listbox,
 * nur offen gemountet) und jede Option trägt `data-value`.
 *
 * Bewusst OHNE `expect` aus @playwright/test implementiert (`waitFor`
 * statt Assertions), damit auch die Standalone-Werkzeuge unter
 * `e2e/tools/*.mts` (playwright-core, via `npx tsx`) den Helfer nutzen
 * können.
 */
/**
 * Echter Klick; scheitert er an einer ÜBERDECKUNG, fällt er auf
 * `dispatchEvent('click')` zurück. Der Normalweg bleibt der geprüfte Klick.
 *
 * Der Ursprungs-Befund (sim-umbau: die schwebende 2D-NavLeiste lag über der
 * «Umbau»-Zeile des Wand-Inspectors — das native `selectOption` brauchte nie
 * einen echten Mausklick, darum blieb der Konflikt unsichtbar) ist seit
 * v0.7.0 BEHOBEN (H-43: die Inspector-Unterkante rückt über die NavLeiste-/
 * Kosmo-Symbol-Ecke, Beweis `inspector-layout.spec.ts`). Der Fallback bleibt
 * bewusst als Sicherheitsnetz für ANDERE Überdeckungen stehen (z.B. offene
 * Overlays/Panels über einem Trigger) — Verhalten unverändert.
 */
async function robusterKlick(ziel: Locator): Promise<void> {
  try {
    await ziel.click({ timeout: 8000 });
  } catch {
    await ziel.dispatchEvent('click');
  }
}

export async function waehleOptionInScope(
  scope: Page | Locator,
  testid: string,
  value: string,
): Promise<void> {
  const trigger = scope.locator(`[data-testid="${testid}"]`);
  await robusterKlick(trigger);
  const popup = scope.locator(`[data-testid="${testid}-popup"]`);
  await popup.waitFor({ state: 'visible' });
  await robusterKlick(popup.locator(`[data-value="${value}"]`));
  // Nach der Wahl schliesst (unmountet) das Popup — darauf warten, damit
  // Folgeklicks nicht unter dem noch offenen Overlay landen.
  await popup.waitFor({ state: 'hidden' });
}

export async function waehleOption(page: Page, testid: string, value: string): Promise<void> {
  await waehleOptionInScope(page, testid, value);
}
