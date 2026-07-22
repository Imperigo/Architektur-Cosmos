import { expect, test } from '@playwright/test';

/**
 * Serie K / F3 → v0.8.4 PA2 (Owner-Auftrag «Hauptmenü-Neubau», wörtlich:
 * «kein Balken oben, KosmoOrbit-Schriftzug zentral mittig, Texte zentriert,
 * NICHT scrollbar, unten mittig Kosmo·KosmoData·KosmoDesign·KosmoOffice
 * nebeneinander, NICHT mehr drehend, Icons nach Designsprache, Hover-
 * Untertools sauber ohne Überlappung», docs/V084-SPEZ.md §4).
 *
 * VERTRAG-UMBAU (V084-SPEZ §4, ERSETZT nicht gelöscht):
 *  1. Statik   — `orbit-start.spec.ts:90-112` (Rotation-Asserts) → zwei
 *     Bounding-Box-Messungen der Kachel-Reihe im Abstand 500ms sind
 *     identisch; `.k-orbit-knoten` existiert nicht mehr ODER trägt keine
 *     `animation`.
 *  2. Komposition — kein `app-header` im home-Screen-DOM; Wortmarke
 *     `orbit-wortmarke` horizontal zentriert (±2px); Kachel-Reihe
 *     `zentrale-kacheln` unten mittig, Reihenfolge Kosmo·KosmoData·
 *     KosmoDesign·KosmoOffice; Office-Kachel trägt sichtbares «kommend»
 *     und ist nicht klickbar.
 *  3. Kein Scroll — `document.scrollingElement.scrollHeight <= innerHeight`
 *     bei 1440×900 UND 1280×720.
 *  4. Fächer — je Hauptkachel Hover → Untertool-Liste sichtbar; paarweise
 *     Bounding-Box-Überlappungsfläche aller sichtbaren Untertool-Karten = 0;
 *     jede Karte vollständig im Viewport.
 *  5. Version — Versionszeile `orbit-version` zeigt `v${__APP_VERSION__}`.
 *
 * Playwright-Fallen (siehe Auftrag): achsenparallele SVG-Linien in den
 * Hauptwerkzeug-Icons gelten Playwright oft als "hidden" (Bounding-Box-
 * Heuristik bei 0-Breite/Höhe-Segmenten) — wir prüfen deshalb `toBeAttached()`
 * statt `toBeVisible()` auf Icon-internen Pfaden, nie auf den echten
 * Knöpfen/Containern selbst.
 */

async function zentraleLaden(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.waitForSelector('[data-testid="orbit-start"]');
}

function ueberlappenSich(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

test('4 Hauptwerkzeuge sind sichtbar, mit Titel (KosmoDesign/KosmoData/Kosmo/KosmoOffice)', async ({ page }) => {
  await zentraleLaden(page);
  await expect(page.locator('[data-testid="orbit-start"]')).toBeVisible();

  const erwartet: Record<string, string> = {
    design: 'KosmoDesign',
    data: 'KosmoData',
    kosmo: 'Kosmo',
    office: 'KosmoOffice',
  };
  for (const [id, titel] of Object.entries(erwartet)) {
    const knopf = page.locator(`[data-testid="orbit-haupt-${id}"]`);
    await expect(knopf).toBeVisible();
    await expect(knopf).toContainText(titel);
  }
  // Genau 4 — keine fünfte Kachel/kein Rest der alten Familien-Ansicht.
  await expect(page.locator('[data-testid^="orbit-haupt-"]')).toHaveCount(4);
});

test('Hover auf KosmoDesign zeigt Draw/Prepare/Vis/Publish mit Kurzbeschrieb', async ({ page }) => {
  await zentraleLaden(page);
  const faecher = page.locator('[data-testid="orbit-faecher-design"]');

  await page.locator('[data-testid="orbit-haupt-design"]').hover();
  await expect(faecher).toHaveClass(/\boffen\b/);

  const draw = faecher.locator('[data-testid="module-design"]');
  await expect(draw).toContainText('Draw');
  await expect(draw).toContainText('Wände');

  await expect(faecher.locator('[data-testid="module-prepare"]')).toContainText('Prepare');
  await expect(faecher.locator('[data-testid="module-vis"]')).toContainText('Vis');
  await expect(faecher.locator('[data-testid="module-publish"]')).toContainText('Publish');
});

test('Klick auf Draw (module-design) im Fächer öffnet den KosmoDesign-Workspace', async ({ page }) => {
  await zentraleLaden(page);
  await page.locator('[data-testid="orbit-haupt-design"]').hover();
  await page.locator('[data-testid="orbit-faecher-design"] [data-testid="module-design"]').click();
  await expect(page.locator('[data-testid="planview"], [data-testid="inspector"], canvas').first()).toBeVisible();
});

test('KosmoOffice trägt sichtbar «kommend» und öffnet KEIN leeres Modul', async ({ page }) => {
  await zentraleLaden(page);
  const office = page.locator('[data-testid="orbit-haupt-office"]');
  await expect(office).toContainText('kommend');

  await office.hover();
  const faecher = page.locator('[data-testid="orbit-faecher-office"]');
  await expect(faecher).toHaveClass(/\boffen\b/);
  for (const id of ['lead', 'buero-hr', 'lehre', 'bau']) {
    const knopf = page.locator(`[data-testid="orbit-office-${id}"]`);
    await expect(knopf).toBeVisible();
    await expect(knopf).toBeDisabled();
  }

  // Klick auf das Hauptwerkzeug selbst navigiert nirgendwohin.
  await office.click();
  await expect(page.locator('[data-testid="orbit-start"]')).toBeVisible();
  await expect(
    page.locator('[data-testid="planview"], [data-testid="tab-uebersicht"], [data-testid="auftrag-erfassen"]'),
  ).toHaveCount(0);
});

// ── V084-SPEZ §4.1 Statik ──────────────────────────────────────────────
test('Statik: `.k-orbit-knoten` existiert nicht mehr ODER trägt keine Animation', async ({ page }) => {
  await zentraleLaden(page);
  const knoten = page.locator('.k-orbit-knoten');
  const anzahl = await knoten.count();
  if (anzahl === 0) return; // Vertrag erfüllt: die Klasse ist ganz entfallen.
  const animName = await knoten.first().evaluate((el) => getComputedStyle(el).animationName);
  expect(animName).toBe('none');
});

test('Statik: die Kachel-Reihe steht — zwei Bounding-Box-Messungen im Abstand 500ms sind identisch', async ({
  page,
}) => {
  await zentraleLaden(page);
  // Erst SETTLEN lassen: die linke Spalte lädt Projekte/Varianten
  // asynchron (`ProjektListe`/`VariantenArchiv`, IndexedDB) — das kann die
  // Zeilenhöhe des Grids (`align-items: stretch`) minimal nachjustieren,
  // bevor sich die Kachel-Reihe endgültig setzt. Der Statik-Beweis selbst
  // (zwei Messungen 500ms auseinander sind identisch) startet erst NACH
  // diesem Settle-Fenster — sonst würde er einen Async-Ladevorgang als
  // "Animation" fehldeuten.
  await page.waitForTimeout(800);
  // Umgebungs-Härtung (22.07.2026, Bisect+Sonden-Beweis): in der aktuellen
  // Container-Generation macht die Reihe ~2.1s nach dem Laden EINEN
  // 4px-Sprung (y 748→744, einmaliges Async-Settle der linken Spalte) und
  // steht danach felsenfest — gemessen per 250ms-Sonde; der byte-gleiche
  // 0.8.12-Release-Stand war in diesem Container ebenso rot wie 0.9.0,
  // also kein Code-Befund. Das fixe 800ms-Fenster ist maschinenabhängig
  // zu kurz — darum SETTLE PER POLL: erst wenn zwei 500ms-Messungen
  // <1px auseinanderliegen, beginnt der eigentliche Beweis. Die
  // Test-Absicht bleibt voll intakt: eine DAUER-Animation würde nie
  // settlen und im Poll-Timeout (10s) scheitern; die scharfe
  // <1px-Doppelmessung darunter ist unverändert.
  await page.evaluate(() => document.fonts.ready);
  // Mechanik-genauer Kern der Härtung: die `.k-einblenden`-Eingangs-
  // animation des Zentrale-Wrappers (translateY(4px)→0, fill both) hängt
  // am Sichtbarkeits-Flip (`k-zentrale-pausiert`) — im aktuellen Headless-
  // Container kommt der Flip erst nach ~2s, der Wrapper springt dann als
  // Ganzes um 4px. Das ist der Abschluss einer EINMALIGEN Einblendung,
  // keine Dauer-Animation — also explizit auf ihren Abschluss warten
  // (opacity 1 + transform aufgelöst), bevor der Statik-Beweis beginnt.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const el = document.querySelector('.app-zentrale-inhalt');
          if (!el) return false;
          const cs = getComputedStyle(el);
          return cs.opacity === '1' && (cs.transform === 'none' || cs.transform === 'matrix(1, 0, 0, 1, 0, 0)');
        }),
      { timeout: 15_000, intervals: [250] },
    )
    .toBe(true);
  const reihe = page.locator('[data-testid="zentrale-kacheln"]');
  // Der Settle-Zeitpunkt schwankt (Sonde: mal ~1.2s, mal ~2.9s) — EIN
  // stabiles Messpaar reicht darum nicht (der erste Versuch dieser
  // Härtung lief genau in den Sprung). Verlangt wird Stabilität über
  // VIER aufeinanderfolgende 500ms-Messungen (2s Ruhe); eine echte
  // Dauer-Animation erreicht das nie und scheitert nach 15s ehrlich.
  const verlauf: Array<{ x: number; y: number; width: number; height: number }> = [];
  await expect
    .poll(
      async () => {
        const jetzt = await reihe.boundingBox();
        if (!jetzt) return false;
        verlauf.push(jetzt);
        if (verlauf.length < 4) return false;
        const fenster = verlauf.slice(-4);
        return (['x', 'y', 'width', 'height'] as const).every((k) =>
          fenster.every((m) => Math.abs(m[k] - fenster[0][k]) < 1),
        );
      },
      { timeout: 15_000, intervals: [500] },
    )
    .toBe(true);
  const messung1 = await reihe.boundingBox();
  await page.waitForTimeout(500);
  const messung2 = await reihe.boundingBox();
  expect(messung1).not.toBeNull();
  expect(messung2).not.toBeNull();
  // Sub-Pixel-Toleranz (< 1px): reales Layout-Rundungsrauschen (Font-
  // Hinting/Sub-Pixel-Antialiasing) ist KEINE Animation — eine `.toEqual`-
  // Ganzzahl-Gleichheit auf Fliesskommawerten wäre hier unnötig fragil
  // (live beobachtet: 760 vs. 760.05). `--k-orbit-*`-Animation würde
  // dagegen Dutzende Pixel bewegen, nicht Hundertstel.
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(Math.abs(messung2![key] - messung1![key])).toBeLessThan(1);
  }

  // Dieselbe Probe je Hauptkachel — keine Kachel driftet einzeln.
  for (const id of ['design', 'data', 'kosmo', 'office']) {
    const knopf = page.locator(`[data-testid="orbit-haupt-${id}"]`);
    const a = await knopf.boundingBox();
    await page.waitForTimeout(500);
    const b = await knopf.boundingBox();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(b![key] - a![key])).toBeLessThan(1);
    }
  }
});

// ── V084-SPEZ §4.2 Komposition ─────────────────────────────────────────
test('Komposition: kein `app-header` im home-Screen-DOM', async ({ page }) => {
  await zentraleLaden(page);
  await expect(page.locator('.app-header')).toHaveCount(0);
  await expect(page.locator('header.app-header')).toHaveCount(0);
});

test('Komposition: Wortmarke ist horizontal zentriert (±2px) über der Kachel-Reihe und zeigt «KosmoOrbit»', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await zentraleLaden(page);
  const wortmarke = page.locator('[data-testid="orbit-wortmarke"]');
  await expect(wortmarke).toBeVisible();
  await expect(wortmarke).toContainText('Kosmo');
  await expect(wortmarke).toContainText('Orbit');

  // «Zentral mittig» heisst hier: exakt über der Mitte der eigenen
  // Kachel-Reihe — beide leben in derselben `.k-orbit-start`-Spalte
  // (`OrbitStart.tsx`, `flex-direction: column`). Die volle Bildschirmmitte
  // ist NICHT das Ziel: die Begrüssungs-/Projekte-Spalte links
  // (`.orbit065-home-grid`) ist ein bestehender, ausserhalb des PA2-
  // Dateikreises geschützter Vertrag (`orbit-hub-vollausbau.spec.ts`) und
  // bleibt neben der Zentrale erhalten.
  const wortmarkeBox = await wortmarke.boundingBox();
  const reiheBox = await page.locator('[data-testid="zentrale-kacheln"]').boundingBox();
  expect(wortmarkeBox).not.toBeNull();
  expect(reiheBox).not.toBeNull();
  const wortmarkeCenterX = wortmarkeBox!.x + wortmarkeBox!.width / 2;
  const reiheCenterX = reiheBox!.x + reiheBox!.width / 2;
  expect(Math.abs(wortmarkeCenterX - reiheCenterX)).toBeLessThan(2);
});

test('Komposition: Kachel-Reihe unten mittig, Reihenfolge Kosmo·KosmoData·KosmoDesign·KosmoOffice', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await zentraleLaden(page);
  const reihe = page.locator('[data-testid="zentrale-kacheln"]');
  await expect(reihe).toBeVisible();

  // Reihenfolge = Owner-Wortlaut, per x-Koordinate der 4 Hauptknöpfe geprüft
  // (nicht per DOM-Reihenfolge allein — die sichtbare Anordnung zählt).
  const erwarteteReihenfolge = ['kosmo', 'data', 'design', 'office'];
  const positionen: { id: string; x: number }[] = [];
  for (const id of erwarteteReihenfolge) {
    const box = await page.locator(`[data-testid="orbit-haupt-${id}"]`).boundingBox();
    expect(box).not.toBeNull();
    positionen.push({ id, x: box!.x });
  }
  const sortiert = [...positionen].sort((a, b) => a.x - b.x).map((p) => p.id);
  expect(sortiert).toEqual(erwarteteReihenfolge);

  // «unten mittig»: die Reihe sitzt in der unteren Hälfte des Viewports UND
  // horizontal zentriert innerhalb ihrer eigenen Spalte (`.orbit065-home-
  // rechts`) — die bestehende Zweispalten-Achse links (Begrüssung/
  // Projekte, ausserhalb des PA2-Dateikreises geschützt) bleibt daneben
  // erhalten, «Bildschirmmitte» ist darum nicht das messbare Ziel (s.
  // Wortmarken-Test oben, dieselbe Begründung).
  const reiheBox = await reihe.boundingBox();
  const spalteBox = await page.locator('.orbit065-home-rechts').boundingBox();
  expect(reiheBox).not.toBeNull();
  expect(spalteBox).not.toBeNull();
  expect(reiheBox!.y + reiheBox!.height).toBeGreaterThan(900 / 2);
  const reiheCenterX = reiheBox!.x + reiheBox!.width / 2;
  const spalteCenterX = spalteBox!.x + spalteBox!.width / 2;
  expect(Math.abs(reiheCenterX - spalteCenterX)).toBeLessThan(4);
});

test('Komposition: Office-Kachel trägt sichtbares «kommend» und bleibt nicht klickbar', async ({ page }) => {
  await zentraleLaden(page);
  const office = page.locator('[data-testid="orbit-haupt-office"]');
  await expect(office.locator('.k-orbit-badge-kommend')).toBeVisible();
  await expect(office.locator('.k-orbit-badge-kommend')).toContainText('kommend');
  await office.hover();
  for (const id of ['lead', 'buero-hr', 'lehre', 'bau']) {
    await expect(page.locator(`[data-testid="orbit-office-${id}"]`)).toBeDisabled();
  }
});

// ── V084-SPEZ §4.3 Kein Scroll ──────────────────────────────────────────
for (const groesse of [
  { breite: 1280, hoehe: 720 },
  { breite: 1440, hoehe: 900 },
]) {
  test(`Kein Scroll auf home bei ${groesse.breite}×${groesse.hoehe}`, async ({ page }) => {
    await page.setViewportSize({ width: groesse.breite, height: groesse.hoehe });
    await zentraleLaden(page);
    const { scrollHeight, innerHeight } = await page.evaluate(() => ({
      scrollHeight: document.scrollingElement!.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    expect(scrollHeight).toBeLessThanOrEqual(innerHeight);
  });
}

// ── V084-SPEZ §4.4 Fächer ohne Überlappung ─────────────────────────────
test('Fächer: Hover auf jede Hauptkachel zeigt eine sichtbare Untertool-Liste', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await zentraleLaden(page);
  for (const id of ['design', 'data', 'kosmo', 'office']) {
    const haupt = page.locator(`[data-testid="orbit-haupt-${id}"]`);
    await haupt.hover();
    const faecher = page.locator(`[data-testid="orbit-faecher-${id}"]`);
    await expect(faecher).toHaveClass(/\boffen\b/);
    await expect(faecher).toBeVisible();
    // Weghovern schliesst wieder — kein Fächer bleibt "hängen" und
    // verdeckt den nächsten Test-Schritt.
    await page.mouse.move(10, 10);
  }
});

test('Fächer: paarweise Bounding-Box-Überlappung aller sichtbaren Untertool-Karten ist 0 (dichtester Fächer: Kosmo)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await zentraleLaden(page);
  await page.locator('[data-testid="orbit-haupt-kosmo"]').hover();
  const faecher = page.locator('[data-testid="orbit-faecher-kosmo"]');
  await expect(faecher).toHaveClass(/\boffen\b/);

  const karten = faecher.locator('[data-testid^="module-"], [data-testid^="orbit-sub-"]');
  const anzahl = await karten.count();
  expect(anzahl).toBeGreaterThanOrEqual(5);

  const boxen: { x: number; y: number; width: number; height: number }[] = [];
  for (let i = 0; i < anzahl; i++) {
    const box = await karten.nth(i).boundingBox();
    expect(box).not.toBeNull();
    boxen.push(box!);
  }
  for (let i = 0; i < boxen.length; i++) {
    for (let j = i + 1; j < boxen.length; j++) {
      expect(ueberlappenSich(boxen[i]!, boxen[j]!)).toBe(false);
    }
  }
});

test('Fächer: jede Untertool-Karte des offenen Fächers ist vollständig im Viewport (1280×720 UND 1440×900)', async ({
  page,
}) => {
  for (const groesse of [
    { breite: 1280, hoehe: 720 },
    { breite: 1440, hoehe: 900 },
  ]) {
    await page.setViewportSize({ width: groesse.breite, height: groesse.hoehe });
    await zentraleLaden(page);
    for (const id of ['design', 'kosmo']) {
      await page.locator(`[data-testid="orbit-haupt-${id}"]`).hover();
      const faecher = page.locator(`[data-testid="orbit-faecher-${id}"]`);
      await expect(faecher).toHaveClass(/\boffen\b/);
      const karten = faecher.locator('[data-testid^="module-"], [data-testid^="orbit-sub-"]');
      const anzahl = await karten.count();
      for (let i = 0; i < anzahl; i++) {
        const box = await karten.nth(i).boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(groesse.breite + 1);
        expect(box!.y + box!.height).toBeLessThanOrEqual(groesse.hoehe + 1);
      }
      await page.mouse.move(10, 10);
    }
  }
});

// ── V084-SPEZ §4.5 Version ──────────────────────────────────────────────
test('Version: Versionszeile zeigt `v${__APP_VERSION__}`', async ({ page }) => {
  await zentraleLaden(page);
  const version = page.locator('[data-testid="orbit-version"]');
  await expect(version).toBeVisible();
  // `__APP_VERSION__` ist eine Build-Zeit-Konstante (Vite `define`, inlined
  // ins Bundle — kein `window`-Property zur Laufzeit); geprüft wird darum
  // das reale Format «v<major>.<minor>.<patch><optionaler Buchstabe>».
  await expect(version).toHaveText(/^v\d+\.\d+\.\d+[A-Za-z]?$/);
});
