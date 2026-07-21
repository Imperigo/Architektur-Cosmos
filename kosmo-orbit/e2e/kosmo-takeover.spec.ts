import { expect, test, type Page } from '@playwright/test';
import type { SzenarioSkript } from '@kosmo/ai';

/**
 * v0.7.4 Welle 3 P9 — Takeover-Trigger «Grosses Paket» (Owner-Entscheid,
 * verbindlich): der Vollbild-Takeover-Rahmen (`kosmo-orb-takeover`,
 * `shell/KosmoOrb.tsx`/`shell/KosmoTakeoverWaechter.tsx`) löst NUR aus, wenn
 * `KosmoPanel.applyPaket` autonom ein Paket mit MINDESTENS
 * `SCHWELLE_GROSSES_PAKET` (= 8) Schritten anwendet.
 *
 * Beweis-Strategie (ehrlich benannt): unter normalem `navigator.webdriver`
 * (jeder gewöhnliche Playwright-Lauf) löst die Abspiel-Ebene
 * (`state/abspiel-ebene.ts`) NIE aus — der ganze `applyPaket`-Umlauf läuft
 * synchron durch, `zustand==='takeover'` würde dieselbe Millisekunde wieder
 * von `'dispatching'` überschrieben, BEVOR React je rendert. Das ist keine
 * Test-Schwäche, sondern dieselbe Gate-Semantik wie
 * `e2e/kosmo-zeichnet.spec.ts`: um den Rahmen tatsächlich stehen zu sehen,
 * wird hier — genau wie dort — der bestehende Test-Hook
 * `localStorage['kosmo.abspielen']='erzwingen'` genutzt (hebt NUR die
 * webdriver-Sperre auf, reduced-motion bleibt ein hartes Veto), zusammen mit
 * der `KosmoZeichnet`-Bühne (Design-Workspace, PlanView), damit das Vorspiel
 * eine ECHTE, beobachtbare Zeitspanne offen bleibt — genau die Spanne, in
 * der der Takeover-Rahmen bei einem grossen Paket sichtbar sein soll.
 *
 * (c) («kein Takeover unter der Schwelle») braucht diese Erzwingung nicht:
 * ein <8-Schritte-Paket darf den Rahmen so oder so nie zeigen, auch nicht
 * kurz.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => unknown;
      state: () => { doc: { byKind: (k: string) => { id: string }[] } };
    };
    __kosmoStatus: {
      setzeZustand: (z: string) => void;
      zustand: () => string;
      beschaeftigt: () => boolean;
    };
  }
}

const waende = (page: Page) => page.evaluate(() => window.__kosmo.state().doc.byKind('wall').length);

async function tkbLaden(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kosmo.onboarded', '1'));
  // TKB: aktive Storey + Wand-Aufbau = App-Kontext-Defaults für
  // design_wandZeichnen. [Quelle: kosmo-scripted.spec.ts / kosmo-zeichnet.spec.ts]
  await page.click('[data-testid="load-tkb"]');
  // v0.7.8 Welle 2 (P4): testid statt Text-Locator (Doppel-Chrome-Kollision
  // mit dem Dock-Kopf-Titel des migrierten `kennzahlen`-Panels, s.
  // `dock-layout.spec.ts` Kommentar).
  await expect(page.locator('[data-testid="kennzahlen"]')).toBeVisible();
}

/** N Wand-Züge als EIN Paket (>1 Tool-Call ⇒ paket-card). y-versetzt, damit jede Wand echt entsteht. */
function wandPaket(id: string, n: number): SzenarioSkript {
  return {
    id,
    zuege: [
      {
        nutzerErwartung: 'wand',
        antwortText: 'Gerne — ich zeichne die Wände.',
        toolCalls: Array.from({ length: n }, (_, i) => ({
          name: 'design_wandZeichnen',
          args: { a: { x: 0, y: i * 1000 }, b: { x: 4000, y: i * 1000 } },
        })),
      },
    ],
  };
}

/** Manuelle Variante von `kosmoChatSkript` (Muster kosmo-zeichnet.spec.ts):
 *  Skript registrieren, Panel FRISCH mounten, Zug senden — «Anwenden» NICHT
 *  selbst klicken, damit der Test das Verhalten ZWISCHEN Klick und Apply
 *  beobachten kann. Liefert die `paket-card`. */
async function paketVorbereiten(page: Page, skriptId: string, skript: SzenarioSkript) {
  await page.evaluate(
    ({ skriptId, skript }) => {
      const w = window as unknown as { __kosmoSkripte?: Record<string, unknown> };
      w.__kosmoSkripte = { ...(w.__kosmoSkripte ?? {}), [skriptId]: skript };
      localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'scripted', skriptId }));
    },
    { skriptId, skript },
  );
  if (await page.locator('[data-testid="kosmo-input"]').isVisible()) {
    await page.locator('[data-testid="kosmo-panel-schliessen"]').click();
    await expect(page.locator('[data-testid="kosmo-input"]')).toBeHidden();
  }
  // Orb-Gesetz-Nachzug (Rotlisten-Runde 21.07.2026, Muster kosmo-blick-2
  // .spec.ts:99-111 / ROADMAP 543-Befund): seit PB4-084 öffnet erst der
  // DOPPELklick das Panel — der Einfachklick zeigt nur die
  // Konversationskarte. Der Zugang ist modus-bewusst: Island-Modus über
  // den Kosmo-Orb, Manuell-Modus über das BodenDock-Symbol.
  const orbKnopf = page.locator('[data-testid="kosmo-orb-knopf"]');
  if ((await orbKnopf.count()) > 0) {
    await page.dblclick('[data-testid="kosmo-orb-knopf"]');
  } else {
    await page.dblclick('[data-testid="kosmo-symbol"]');
  }
  await expect(page.locator('[data-testid="kosmo-input"]')).toBeVisible();
  await page.fill('[data-testid="kosmo-input"]', 'Zeichne bitte die Wände');
  await page.click('[data-testid="kosmo-send"]');
  const paket = page.locator('[data-testid="paket-card"]').last();
  await expect(paket).toBeVisible({ timeout: 15_000 });
  return paket;
}

test('(a) Paket mit ≥8 Schritten: der Vollbild-Takeover-Rahmen erscheint während der sichtbaren Anwende-Phase', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await tkbLaden(page);
  await page.evaluate(() => localStorage.setItem('kosmo.abspielen', 'erzwingen'));

  const vorher = await waende(page);
  const paket = await paketVorbereiten(page, 'kt-8-schritte', wandPaket('kt-8-schritte', 8));
  await expect(paket).toContainText('8 Schritte');
  await paket.locator('[data-testid="apply-paket"]').click();

  // Der Rahmen steht, solange das Vorspiel läuft (≥ 8 × (320+120) ms).
  const rahmen = page.locator('[data-testid="kosmo-orb-takeover"]');
  await expect(rahmen).toBeVisible();
  await expect(rahmen).toContainText('KOSMO ARBEITET');
  expect(await waende(page)).toBe(vorher); // Apply noch nicht gelaufen

  // Danach läuft der unveränderte atomare Apply; der Rahmen verschwindet
  // wieder (Zustand fällt spätestens bei 'dispatching' aus 'takeover').
  await expect.poll(() => waende(page), { timeout: 20_000 }).toBe(vorher + 8);
  await expect(rahmen).toHaveCount(0, { timeout: 5_000 });

  // Undo-Atomarität bleibt trotz Takeover-Vorspiel gewahrt: EIN Undo räumt alle 8 Wände.
  await page.click('[data-testid="undo"]');
  await expect.poll(() => waende(page)).toBe(vorher);
});

test('(b) globaler ESC beendet den sichtbaren Takeover-Rahmen sofort — der Apply läuft trotzdem (kein Abbruch der Anwendung)', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await tkbLaden(page);
  await page.evaluate(() => localStorage.setItem('kosmo.abspielen', 'erzwingen'));

  const vorher = await waende(page);
  const paket = await paketVorbereiten(page, 'kt-esc', wandPaket('kt-esc', 9));
  await paket.locator('[data-testid="apply-paket"]').click();

  const rahmen = page.locator('[data-testid="kosmo-orb-takeover"]');
  await expect(rahmen).toBeVisible();
  expect(await waende(page)).toBe(vorher); // Apply noch nicht gelaufen — nur die Schau läuft

  await page.keyboard.press('Escape');
  // Der Rahmen ist SOFORT weg — unabhängig davon, ob/wann der Apply selbst fertig wird.
  await expect(rahmen).toHaveCount(0, { timeout: 2_000 });

  // EHRLICHKEIT (hart, s. Commit/Bericht): ESC bricht NICHT die Anwendung
  // ab — das Paket wird trotzdem vollständig angewendet (Vertrag der
  // Abspiel-Ebene: «das Vorspiel kann den Apply nur verzögern, nie
  // verhindern»). Ein Abbruch ist nur über Undo möglich (danach geprüft).
  await expect.poll(() => waende(page), { timeout: 20_000 }).toBe(vorher + 9);

  await page.click('[data-testid="undo"]');
  await expect.poll(() => waende(page)).toBe(vorher);
});

test('(c) Paket mit weniger als 8 Schritten: kein Takeover-Rahmen, auch nicht kurz', async ({ page }) => {
  await tkbLaden(page);
  const vorher = await waende(page);
  const paket = await paketVorbereiten(page, 'kt-7-schritte', wandPaket('kt-7-schritte', 7));
  await expect(paket).toContainText('7 Schritte');
  await paket.locator('[data-testid="apply-paket"]').click();

  await expect.poll(() => waende(page), { timeout: 15_000 }).toBe(vorher + 7);
  // Kein Zeitfenster verpasst: unter normalem webdriver (kein 'erzwingen')
  // läuft der ganze Umlauf synchron durch — der Rahmen war zu KEINEM
  // Zeitpunkt im DOM.
  await expect(page.locator('[data-testid="kosmo-orb-takeover"]')).toHaveCount(0);
});

test('(d) Schwellenwert direkt am Store: setzeZustand("takeover") bei geschlossenem Panel zeigt den Rahmen exakt einmal', async ({
  page,
}) => {
  // Ergänzender, rein deterministischer Nachweis der Rendering-Seite
  // (unabhängig vom Timing eines echten Pakets) — deckt NUR die
  // Store→DOM-Kopplung ab, nicht den Schwellenwert-Trigger selbst (der ist
  // Gegenstand von (a)/(c) oben). Panel bleibt zu ⇒ `KosmoSymbol` zeigt den
  // Rahmen (nicht die neue `KosmoTakeoverWaechter`-Wache, die nur bei
  // OFFENEM Panel greift, s. Datei-Kopf dort) — genau EINE Instanz.
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    localStorage.setItem('kosmo.llm', JSON.stringify({ provider: 'mock' }));
  });
  await page.reload();
  await page.evaluate(() => window.__kosmoStatus.setzeZustand('takeover'));
  await expect(page.locator('[data-testid="kosmo-orb-takeover"]')).toHaveCount(1);
});
