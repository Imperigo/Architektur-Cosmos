import { expect, test, type Page } from '@playwright/test';

/**
 * PD4 Abschluss (`docs/ISLAND-UI-SPEZ.md` §7 PD4-Zeile, `docs/V082-SPEZ.md`
 * §9.9 C-39/C-40) — die Island-Abschluss-Suite: alle vier Islands über die
 * volle Stufen-0-3-Kette (je EIN Werkzeug pro Insel bis zum Einstellungs-
 * fenster), beide Farbwelten (PAPIER/KOSMOS), der Manuell-Umschalter
 * beidseitig, der echte Kosmo-Orb (Karte + Handoff) und der reduced-motion-
 * Fall. Ergänzt (nicht ersetzt) `e2e/island-verdrahtung.spec.ts` (Default-
 * Flip/echte Werkzeug-Wirkung) und `e2e/island-inhalte-*.spec.ts` (Inhalts-
 * Details je Werkzeug) — diese Datei ist der PD4-Abschlussbeweis am
 * lebenden Objekt.
 *
 * **Diese Spec setzt den globalen Manuell-Seed selbst ausser Kraft**
 * (`test.use({ storageState: { cookies: [], origins: [] } })`, exakt wie
 * `island-verdrahtung.spec.ts`/`island-leer.spec.ts`) — nur ein leerer
 * Kontext beweist den echten Produktions-Default `'island'` ohne jeden Seed.
 *
 * **Je Insel EIN Werkzeug bis Stufe 3** (Gate «kein Werkzeug endet bei
 * Stufe 1» ist bereits `e2e/island-inhalte-*.spec.ts`s Aufgabe für alle 29 —
 * diese Suite beweist die Stufenkette selbst, nicht die Inhalts-Vollständig-
 * keit): ZEICHNEN → Wand (Referenzmuster, funktioniert auch ohne
 * Wand-Fixture — `WandStufe2`/`WandStufe3` zeigen ehrlich «keine Auswahl»),
 * ANSICHT → Sonne (Referenzmuster), PROJEKT → Kennzahlen (immer aktiv, kein
 * Fixture nötig), AUSTAUSCH → Export (Format-Kurzwahl, kein Fixture nötig).
 */

test.use({ storageState: { cookies: [], origins: [] } });

async function ueberspringeOnboarding(page: Page, thema?: 'paper' | 'orbit'): Promise<void> {
  await page.goto('/');
  await page.evaluate((t) => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
    if (t) localStorage.setItem('kosmo.thema', t);
  }, thema);
  await page.reload();
}

/** Hover statt Klick — `.click()` bewegt die Maus zuerst auf die Pill, was
 *  `onMouseEnter` (`IslandShell.tsx`) SCHON auslöst und die Pill synchron
 *  durch die Leiste ersetzt (s. `island-verdrahtung.spec.ts`-Kommentar). */
async function oeffneInsel(page: Page, island: string): Promise<void> {
  await page.hover(`[data-testid="island-${island}-root"]`);
  await expect(page.locator(`[data-testid="island-${island}-leiste"]`)).toBeVisible();
}

interface InselWerkzeug {
  island: 'zeichnen' | 'ansicht' | 'projekt' | 'austausch';
  werkzeug: string;
  /** Ein Stufe-2-Inhalts-testid, das ohne jede Fixture real rendert. */
  stufe2Inhalt: string;
  stufe3Inhalt: string;
}

const JE_INSEL_EIN_WERKZEUG: readonly InselWerkzeug[] = [
  { island: 'zeichnen', werkzeug: 'wand', stufe2Inhalt: 'island-wand-stufe2', stufe3Inhalt: 'island-wand-stufe3' },
  { island: 'ansicht', werkzeug: 'sonne', stufe2Inhalt: 'island-sonne-datum', stufe3Inhalt: 'island-sonne-standort' },
  {
    island: 'projekt',
    werkzeug: 'kennzahlen',
    stufe2Inhalt: 'island-kennzahlen-stufe2',
    stufe3Inhalt: 'island-kennzahlen-stufe3',
  },
  {
    island: 'austausch',
    werkzeug: 'export',
    stufe2Inhalt: 'island-export-stufe2',
    stufe3Inhalt: 'island-export-stufe3',
  },
];

test.describe('PD4 — vier Islands × Stufen 0-3, beide Farbwelten', () => {
  for (const thema of ['paper', 'orbit'] as const) {
    for (const { island, werkzeug, stufe2Inhalt, stufe3Inhalt } of JE_INSEL_EIN_WERKZEUG) {
      test(`${thema}: ${island}/${werkzeug} durchläuft Pill → Leiste → Popup → Fenster`, async ({ page }) => {
        await ueberspringeOnboarding(page, thema);
        await page.click('[data-testid="module-design"]');

        // Stufe 0 (Pill).
        await expect(page.locator(`[data-testid="island-${island}-pill"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="island-werkzeug-${werkzeug}"]`)).toHaveCount(0);

        // Stufe 1 (Leiste).
        await oeffneInsel(page, island);
        const werkzeugKnopf = page.locator(`[data-testid="island-werkzeug-${werkzeug}"]`);
        await expect(werkzeugKnopf).toBeVisible();

        // Stufe 2 (Mini-Popup) — erster Klick.
        await werkzeugKnopf.click();
        await expect(page.locator(`[data-testid="island-${werkzeug}-popup"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${stufe2Inhalt}"]`)).toBeVisible();

        // Stufe 3 (Einstellungsfenster) — zweiter Klick auf dasselbe Symbol.
        await page.click(`[data-testid="island-werkzeug-${werkzeug}"]`);
        await expect(page.locator(`[data-testid="island-${werkzeug}-fenster"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${stufe3Inhalt}"]`)).toBeVisible();
        await page.screenshot({ path: `test-results/pd4-082-${thema}-${island}-${werkzeug}-stufe3.png` });

        // `icX`-Schliessen-Knopf (§4.1) — zurück auf `leiste`, nicht `pill`.
        await page.click(`[data-testid="island-${werkzeug}-fenster-schliessen"]`);
        await expect(page.locator(`[data-testid="island-${werkzeug}-fenster"]`)).toHaveCount(0);
        await expect(werkzeugKnopf).toBeVisible();
      });
    }
  }
});

test.describe('PD4 — Manuell-Umschalter-Roundtrip', () => {
  test('Island → Manuell → Island, beidseitig, übersteht einen Reload', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    await expect(page.locator('[data-testid="island-zeichnen-pill"]')).toBeVisible();

    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-manuell"]');
    await expect(page.locator('[data-testid="design-werkzeugleiste"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-zeichnen-pill"]')).toHaveCount(0);

    await page.click('[data-testid="island-zurueck"]');
    await expect(page.locator('[data-testid="island-zeichnen-pill"]')).toBeVisible();
    await expect(page.locator('[data-testid="design-werkzeugleiste"]')).toHaveCount(0);

    await page.reload();
    await page.click('[data-testid="module-design"]');
    await expect(page.locator('[data-testid="island-zeichnen-pill"]')).toBeVisible();
  });
});

test.describe('PD4 — Kosmo-Orb', () => {
  test('Klick öffnet die 320px-Karte mit echtem Companion-Vorschlag + 2 Aktions-Chips + Eingabezeile', async ({
    page,
  }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    // Bleibt AUSSERHALB der vier Islands (§1) — sichtbar unabhängig davon,
    // ob eine Insel gerade offen ist.
    const orb = page.locator('[data-testid="kosmo-orb-knopf"]');
    await expect(orb).toBeVisible();
    await expect(page.locator('[data-testid="kosmo-orb-karte"]')).toHaveCount(0);

    // PD5 (Owner-Befund, Screenshot-Review 17.07.2026, «gib kosmo wieder
    // seine animationen und richtiges symbol»): der Orb-Inhalt ist der ECHTE
    // `shell/KosmoOrb.tsx`-Kern (`data-testid="kosmo-orb"`, dasselbe, das
    // `KosmoSymbol.tsx` zeigt) — kein leblos-statisches «K»-Glyph mehr, echter
    // `data-zustand` (idle/thinking/…) treibt die Zustands-Choreografie.
    const echterOrbKern = orb.locator('[data-testid="kosmo-orb"]');
    await expect(echterOrbKern).toBeVisible();
    await expect(echterOrbKern).toHaveAttribute('data-zustand', /.+/);
    await expect(orb.locator('.isl-orb-glyphe')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/pd5-082-kosmo-orb-animiert.png' });

    await orb.click();
    const karte = page.locator('[data-testid="kosmo-orb-karte"]');
    await expect(karte).toBeVisible();

    // Echter Companion-Vorschlag (`greeting()`/`useKosmoStatus`, s.
    // `island/KosmoOrb.tsx`-Kopfkommentar) — kein leerer/Platzhaltertext.
    const vorschlag = await page.locator('[data-testid="kosmo-orb-karte-text"]').textContent();
    expect((vorschlag ?? '').trim().length).toBeGreaterThan(10);

    await expect(page.locator('[data-testid="kosmo-orb-karte-antworten"]')).toBeVisible();
    await expect(page.locator('[data-testid="kosmo-orb-karte-spaeter"]')).toBeVisible();
    await expect(page.locator('[data-testid="kosmo-orb-karte-eingabe"]')).toBeVisible();
    await expect(page.locator('[data-testid="kosmo-orb-karte-senden"]')).toBeVisible();

    await page.screenshot({ path: 'test-results/pd5-082-paper-kosmo-orb-karte.png' });

    // «Später» schliesst nur die Karte — kein Panel-Öffnen.
    await page.click('[data-testid="kosmo-orb-karte-spaeter"]');
    await expect(karte).toHaveCount(0);
    await expect(page.locator('[data-testid="kosmo-panel"]')).toHaveCount(0);

    // «Antworten» übergibt an KosmoPanel — derselbe requestKosmoFokus/
    // onKosmoOeffnen-Weg wie K16 A6 (App.tsx), das Panel öffnet fokussiert.
    await orb.click();
    await page.click('[data-testid="kosmo-orb-karte-antworten"]');
    await expect(page.locator('[data-testid="kosmo-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="kosmo-orb-karte"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="kosmo-input"]')).toBeFocused();
  });
});

test.describe('PD4 — reduced-motion', () => {
  test('Kein Puls am Kosmo-Orb, keine Eintritts-Animation an der Insel-Leiste', async ({ page }) => {
    // Fable-Gate-Fix (island-ui.spec.ts, verifiziert per Diagnose-Lauf):
    // `test.use({ storageState: { cookies: [], origins: [] } })` (Datei-Kopf,
    // nötig für den echten Island-Default ohne Seed) ersetzt den kompletten
    // Kontext — dabei geht `playwright.config.ts`s projektweiter
    // `reducedMotion:'reduce'`-Default NACHWEISLICH verloren (`matchMedia
    // (...).matches` liefert sonst `false`, s. `git`-Diff-Kommentar). Explizit
    // gesetzt, VOR der ersten Navigation — derselbe Weg wie `kurztasten-pan.
    // spec.ts`s expliziter `emulateMedia`-Aufruf, nur hier zwingend statt
    // defensiv.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    await expect(page.locator('[data-testid="kosmo-orb-wurzel"]')).toHaveAttribute('data-reduziert', 'true');
    await expect(page.locator('[data-testid="kosmo-orb-knopf"]')).not.toHaveClass(/isl-orb-anim-puls/);

    await oeffneInsel(page, 'zeichnen');
    await expect(page.locator('[data-testid="island-zeichnen-root"]')).toHaveAttribute('data-reduziert', 'true');
    await expect(page.locator('[data-testid="island-zeichnen-leiste"]')).not.toHaveClass(/isl-anim-islIn/);
  });
});

/**
 * P8 (`docs/V083-SPEZ.md` §10.2, §12.6 C-21) — Zwei-Finger-Doppeltipp-Undo
 * am lebenden Objekt: HINTER `kosmo.touch-undo-geste` (Default AUS), löst
 * bei aktiver Einstellung `history.undo()` aus (bewiesen über das echte Doc,
 * `window.__kosmo`-Test-Hook — kein Mock). §8-1 (`docs/ISLAND-UI-SPEZ.md`
 * §8 Punkt 1) bleibt Owner-offen — dieser Test beweist nur die Geste HINTER
 * der Einstellung, keine Owner-Entscheidung.
 *
 * Zwei synthetische Finger via `window.dispatchEvent(new Event(...))` +
 * angehängten `touches`/`changedTouches`-Arrays (Chromium akzeptiert
 * beliebige Eigenschaften auf einem `Event`-Objekt) — dasselbe Muster wie
 * der App-Unit-Test (`test/island-shell.test.tsx`), hier gegen die echte
 * `IslandBuehne`-Instanz statt gegen eine isolierte Komponente.
 */
test.describe('P8 — Zwei-Finger-Doppeltipp-Undo (§10.2, Default AUS)', () => {
  interface KosmoTestHook {
    run: (commandId: string, params: unknown) => unknown;
    state: () => { doc: { byKind: (kind: string) => { id: string; name?: string }[] } };
  }

  /** Zwei Finger, ein sauberer Tap (kein Pinch — keine Bewegung, kurze Haltedauer). */
  async function zweiFingerTap(page: Page): Promise<void> {
    await page.evaluate(() => {
      const touches = [
        { identifier: 1, clientX: 400, clientY: 400 },
        { identifier: 2, clientX: 500, clientY: 400 },
      ];
      const start = new Event('touchstart', { bubbles: true });
      Object.assign(start, { touches, changedTouches: touches });
      window.dispatchEvent(start);
      const end = new Event('touchend', { bubbles: true });
      Object.assign(end, { touches: [], changedTouches: touches });
      window.dispatchEvent(end);
    });
  }

  /** Legt ein eindeutig benanntes Geschoss an (Muster `e2e/popup-kollision.
   *  spec.ts`s K3-Test) — reine Fixture, kein Bestandteil der eigentlichen
   *  Prüfung. */
  async function legeTestgeschossAn(page: Page): Promise<void> {
    await page.evaluate(() => {
      const k = (window as unknown as { __kosmo: KosmoTestHook }).__kosmo;
      k.run('design.geschossErstellen', { name: 'P8-TESTGESCHOSS', index: 2, elevation: 6000, height: 3000 });
    });
  }

  async function hatTestgeschoss(page: Page): Promise<boolean> {
    return page.evaluate(() => {
      const k = (window as unknown as { __kosmo: KosmoTestHook }).__kosmo;
      return k.state().doc.byKind('storey').some((s) => s.name === 'P8-TESTGESCHOSS');
    });
  }

  test('Default AUS: ein Zwei-Finger-Doppeltipp löst KEIN Undo aus', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');
    await legeTestgeschossAn(page);
    expect(await hatTestgeschoss(page)).toBe(true);

    await zweiFingerTap(page);
    await zweiFingerTap(page);
    expect(await hatTestgeschoss(page)).toBe(true); // unverändert — Einstellung ist AUS
  });

  test('Einstellung AN: ein Zwei-Finger-Doppeltipp löst echtes history.undo() aus', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.evaluate(() => localStorage.setItem('kosmo.touch-undo-geste', '1'));
    await page.click('[data-testid="module-design"]');
    await legeTestgeschossAn(page);
    expect(await hatTestgeschoss(page)).toBe(true);

    await zweiFingerTap(page); // erster Tap allein — noch kein Doppeltipp
    expect(await hatTestgeschoss(page)).toBe(true);

    await zweiFingerTap(page); // zweiter Tap innerhalb des Doppeltipp-Fensters
    await expect.poll(() => hatTestgeschoss(page)).toBe(false);
  });

  test('Einstellungen-Panel: Schalter «Zwei-Finger-Doppeltipp» steuert dieselbe Einstellung wie die Geste', async ({
    page,
  }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');
    await page.click('[data-testid="island-einstellungen-kreis"]');
    const schalter = page.locator('[data-testid="einstellung-touch-undo-geste"]');
    await expect(schalter).toBeVisible();
    await expect(schalter).not.toBeChecked(); // Default AUS
    await schalter.click();
    expect(await page.evaluate(() => localStorage.getItem('kosmo.touch-undo-geste'))).toBe('1');
  });
});

test.describe('PD5 — Kopfbalken-Ersatz Bereinigung (Owner-Befehl + Owner-Korrektur, 17.07.2026)', () => {
  test('Island-Modus: Kopfbalken NICHT im DOM, KosmoOrbit + KosmoDesign + Stationen-Orb + Einstellungs-Kreis EINHEITLICH, ohne Überlagerung', async ({
    page,
  }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    // Bestehende Kopfbalken-testids fehlen komplett — nicht bloss unsichtbar.
    await expect(page.locator('[data-testid="sync-toggle"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="save-project"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="open-project"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="kosmo-toggle"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="starter-guide-start"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="einstellungen-oeffnen"]')).toHaveCount(0);

    // PD5 Owner-Korrektur (wörtlich «links oben kosmoorbit und kosmodesign
    // in gleicher grösse wie einstellungsknopf»): beide Logos bleiben, jetzt
    // im selben Glas-Kreis-Stil wie Stationen-Orb/Einstellungs-Kreis.
    const orbitLogo = page.locator('[data-testid="island-kopf-logo-orbit"]');
    const designLogo = page.locator('[data-testid="island-kopf-logo-design"]');
    await expect(orbitLogo).toBeVisible();
    await expect(designLogo).toBeVisible();
    await expect(page.locator('[data-testid="island-einstellungen-kreis"]')).toBeVisible();

    // PD5 «einheitlicher Kreis-Stil für alle vier Kopf-Elemente» (Owner,
    // wörtlich): KosmoOrbit, KosmoDesign, Stationen-Orb, Einstellungs-Kreis
    // teilen sich exakt dieselbe visuelle Grösse (38px sichtbar/44px
    // Trefferfläche, `.isl-stationen-orb-pill`-Basisregel).
    const orbitBox = await orbitLogo.boundingBox();
    const designBox = await designLogo.boundingBox();
    const stationenOrbBox = await page.locator('[data-testid="stationen-orb-pill"]').boundingBox();
    const ansichtsInfoBox = await page.locator('[data-testid="ansichts-info-label"]').boundingBox();
    const einstellungenKreisBox = await page.locator('[data-testid="island-einstellungen-kreis"]').boundingBox();
    for (const box of [orbitBox, designBox, stationenOrbBox, einstellungenKreisBox]) {
      expect(box).not.toBeNull();
    }
    for (const box of [designBox, stationenOrbBox, einstellungenKreisBox]) {
      expect(box?.width).toBeCloseTo(orbitBox?.width ?? -1, 0);
      expect(box?.height).toBeCloseTo(orbitBox?.height ?? -1, 0);
    }

    // PD5 «Überlagerung beheben, saubere Abstände in der Reihe KosmoOrbit →
    // KosmoDesign → AK-Orb → Ansichts-Info» (Owner, wörtlich) — jedes Paar
    // benachbarter Kopf-Elemente bleibt disjunkt.
    function disjunkt(
      a: { x: number; y: number; width: number; height: number } | null,
      b: { x: number; y: number; width: number; height: number } | null,
    ): boolean {
      if (!a || !b) return false;
      return a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
    }
    expect(disjunkt(orbitBox, designBox)).toBe(true);
    expect(disjunkt(designBox, stationenOrbBox)).toBe(true);
    expect(disjunkt(stationenOrbBox, ansichtsInfoBox)).toBe(true);

    await page.screenshot({ path: 'test-results/pd5-082-orbit-kopf-bereinigt.png' });

    // KosmoOrbit-Symbol bleibt klickbar (Owner, wörtlich «kosmoorbit symbol
    // klickbar was zum hauptmenü zurückführt») — derselbe `gehZu('home')`-Weg
    // wie die Kopfbalken-Wortmarke; die Zentrale-Kachel ist danach wieder da.
    await orbitLogo.click();
    await expect(page.locator('[data-testid="module-design"]')).toBeVisible();
    await page.click('[data-testid="module-design"]');

    // Einstellungs-Kreis öffnet dasselbe zentrale Panel wie das Zahnrad.
    await page.click('[data-testid="island-einstellungen-kreis"]');
    await expect(page.locator('[data-testid="einstellungen-panel"]')).toBeVisible();
  });

  test('Island-Modus: «Zentrale» zusätzlich additiv im Stationen-Orb-Popover erreichbar', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    await page.hover('[data-testid="stationen-orb-root"]');
    const zentraleEintrag = page.locator('[data-testid="stationen-orb-eintrag-zentrale"]');
    await expect(zentraleEintrag).toBeVisible();
    // Bewusst der ERSTE Eintrag im Popover (s. `StationenOrb.tsx`-Kopfkommentar).
    await expect(page.locator('[data-testid="stationen-orb-popover"] > *').first()).toHaveAttribute(
      'data-testid',
      'stationen-orb-eintrag-zentrale',
    );

    await zentraleEintrag.click();
    // WÖRTLICH derselbe `gehZu('home')`-Weg wie der KosmoOrbit-Logo-Klick —
    // ein zweiter, additiver Zugang, kein Ersatz (Owner: «kann bleiben»).
    await expect(page.locator('[data-testid="module-design"]')).toBeVisible();
    await expect(page.locator('[data-testid="stationen-orb-popover"]')).toHaveCount(0);
  });

  test('Manuell-Modus: Kopfbalken vollständig da (Bestand unverändert)', async ({ page }) => {
    await ueberspringeOnboarding(page);
    await page.click('[data-testid="module-design"]');

    await oeffneInsel(page, 'austausch');
    await page.click('[data-testid="island-werkzeug-manuell"]');

    await expect(page.locator('[data-testid="sync-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="save-project"]')).toBeVisible();
    await expect(page.locator('[data-testid="open-project"]')).toBeVisible();
    await expect(page.locator('[data-testid="kosmo-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="einstellungen-oeffnen"]')).toBeVisible();
    await expect(page.locator('[data-testid="island-kopf-logo-orbit"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="island-einstellungen-kreis"]')).toHaveCount(0);
  });
});
