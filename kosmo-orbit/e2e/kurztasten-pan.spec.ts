import { test, expect } from '@playwright/test';

/**
 * v0.6.4, F5+F9 — zwei Owner-Befunde aus dem 0.6.3-Test:
 *
 * F5 («beim modellieren des grundrisses eine tastenkombination oder so
 * einbauen um mich intuitiv bewegen zu können wie archicad»): Werkzeug-
 * Kurztasten (A/W/Z/…, `kurztasten.ts`) mit Fokus-Guard, plus Leertaste
 * halten + Ziehen = Pan im 2D-Plan (ArchiCAD/Photoshop-Muskelgedächtnis),
 * zusätzlich zum bestehenden Mitteltaste-/Rechtsklick-/`navModus2d`-Pan.
 *
 * F9 («die maus sollte sich zudem an die verschiedenen bereichen anpassen
 * können, sprich sie sollte auf die umgebung reagieren»): der Cursor auf dem
 * Plan-SVG wechselt kontextabhängig (`cursor2dFuer`), gespiegelt im
 * `data-cursor`-Attribut des `[data-testid="planview"]`-SVG (verlässlicher
 * als der berechnete CSS-`cursor`, den Playwright nicht direkt abfragt).
 *
 * Playwright-Falle: achsenparallele SVG-Linien/-Gruppen meldet Playwright oft
 * als „hidden“ (kein sichtbarer Rand) → `toBeAttached()` statt `toBeVisible()`.
 */

async function oeffneKosmoDesign(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    localStorage.setItem('kosmo.panelOffen', '1');
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]');
  await expect(page.locator('[data-testid="planview"]')).toBeAttached();
}

/** Tone «accent» (aktives Werkzeug) — seit v0.6.6 trägt KButton CSS-Klassen
 * (`k-btn-accent`) statt Inline-Styles (MOTION-KONZEPT-066, Phase 0); der
 * frühere `style.background`-Check lief deshalb ins Leere. */
async function werkzeugIstAktiv(page: import('@playwright/test').Page, testid: string): Promise<boolean> {
  return page.locator(`[data-testid="${testid}"]`).evaluate((el) => el.classList.contains('k-btn-accent'));
}

test('W-Taste wechselt aufs Wand-Werkzeug; Fokus in einem Eingabefeld blockiert die Kurztaste', async ({ page }) => {
  await oeffneKosmoDesign(page);

  // Startzustand: Auswahl-Werkzeug (ArchiCAD-Gefühl, siehe DesignWorkspace.tsx)
  expect(await werkzeugIstAktiv(page, 'tool-auswahl')).toBe(true);
  expect(await werkzeugIstAktiv(page, 'tool-wand')).toBe(false);

  // Ein Eingabefeld hat den Fokus (Stellvertreter für eine Kosmo-Chat-Eingabe) —
  // die Kurztaste darf hier NIE feuern (kurztasten.ts, `istEingabefeld`).
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.setAttribute('data-testid', 'kurztasten-test-eingabe');
    document.body.appendChild(input);
    input.focus();
  });
  await page.keyboard.press('w');
  expect(await werkzeugIstAktiv(page, 'tool-wand')).toBe(false);
  expect(await werkzeugIstAktiv(page, 'tool-auswahl')).toBe(true);

  // Eingabefeld entfernt (Fokus fällt automatisch zurück auf <body>) — jetzt
  // wechselt dieselbe Taste tatsächlich das Werkzeug.
  await page.evaluate(() => document.querySelector('[data-testid="kurztasten-test-eingabe"]')?.remove());
  await page.keyboard.press('w');
  expect(await werkzeugIstAktiv(page, 'tool-wand')).toBe(true);

  // Esc bleibt wie bisher: zurück zur Auswahl
  await page.keyboard.press('Escape');
  expect(await werkzeugIstAktiv(page, 'tool-auswahl')).toBe(true);
});

test('Leertaste halten + Ziehen verschiebt die Ansicht (Pan) und pausiert das Werkzeug — keine Wand entsteht', async ({ page }) => {
  await oeffneKosmoDesign(page);
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="nav-fit"]');
  // Ersetzt: fixe 300ms nach dem Fit-Klick — die echte Bedingung ist «die
  // Plan-transform-Matrix ist fertig geschrieben» (Dock-Solver-Nachkorrektur
  // möglich), nicht eine geschätzte Dauer; `wartetBisRuhig` (unten in dieser
  // Datei, function-hoisted) beobachtet genau dieses Attribut per
  // MutationObserver statt zu raten.
  await wartetBisRuhig(page, 250);
  await page.click('[data-testid="tool-wand"]');
  expect(await werkzeugIstAktiv(page, 'tool-wand')).toBe(true);
  // Der Werkzeug-Klick lässt den Knopf fokussiert zurück — ein echter User
  // hätte die Maus schon auf dem Plan, nicht mehr auf dem Knopf.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  const holeVerschiebung = () =>
    page.evaluate(() => {
      const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
      const inhalt = svg.querySelector('g') as SVGGElement;
      const m = inhalt.getScreenCTM()!;
      return { e: m.e, f: m.f };
    });
  const waendeAnzahl = () =>
    page.evaluate(() => (window.__kosmo.state().doc.byKind('wall') as unknown[]).length);

  const vor = await holeVerschiebung();
  const waendeVor = await waendeAnzahl();

  const box = (await page.locator('[data-testid="planview"]').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.keyboard.down('Space');
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 140, cy + 90, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Space');

  const nach = await holeVerschiebung();
  const waendeNach = await waendeAnzahl();

  // Die Plan-Inhalts-Gruppe hat sich sichtbar verschoben (Pan hat gewirkt) …
  expect(Math.abs(nach.e - vor.e) + Math.abs(nach.f - vor.f)).toBeGreaterThan(30);
  // … aber das aktive Wand-Werkzeug hat währenddessen NICHT gezeichnet
  // (Owner-Auflage: das Gummiband pausiert, solange die Leertaste gehalten wird).
  expect(waendeNach).toBe(waendeVor);
});

/** Wie `holeVerschiebung` im Pan-Test oben — eigenständig, weil jeder Test
 *  isoliert läuft (kein modulweiter State zwischen Playwright-Tests). */
async function holeVerschiebung(page: import('@playwright/test').Page): Promise<{ e: number; f: number }> {
  return page.evaluate(() => {
    const svg = document.querySelector('[data-testid="planview"]') as SVGSVGElement;
    const inhalt = svg.querySelector('g') as SVGGElement;
    const m = inhalt.getScreenCTM()!;
    return { e: m.e, f: m.f };
  });
}

/**
 * v0.8.1 / P2 (Technik-/Flake-Härtung, ROADMAP 390/393-Diagnose
 * «SwiftShader-Timing») — Diagnose des Fling/Momentum-Tests unten: die
 * PHYSIK selbst ist bereits deterministisch — `flingSchritt()`
 * (`modules/design/eingabe-3d.ts`) dämpft über das ECHTE `dt` zwischen zwei
 * `requestAnimationFrame`-Aufrufen (`performance.now()`-Differenz, gedeckelt
 * auf 48ms gegen rAF-Aussetzer), NIE über eine angenommene Wanduhr-Framerate
 * — «Momentum aus rAF-Delta statt Wanduhr» ist also schon der Produktstand,
 * kein Fix nötig (und `PlanView.tsx`/`eingabe-3d.ts` liegen ausserhalb des
 * Dateikreises dieses Auftrags — Solver/Render-Kern anderer Pakete).
 *
 * Die Flake-Quelle sitzt auf der TEST-Seite: der Vorbestand nahm mit ZWEI
 * FESTEN Wartezeiten (150ms bzw. 3500ms+300ms) implizit eine ungefähre
 * ~60fps-Rendertaktung an. Unter SwiftShader-Softwarerendering (+ der
 * laufenden 3D-Szene daneben) feuert `requestAnimationFrame` unter Last
 * SELTENER und UNREGELMÄSSIG — ein einzelnes 150ms-Fenster kann dann
 * zufällig ganz ohne einen einzigen Frame bleiben (Momentum-Delta ≈ 0,
 * Assertion «läuft aus» flackert), oder umgekehrt bleiben nach 3500ms noch
 * Frames aus, deren longsame Restbewegung sich erst danach zeigt (Assertion
 * «stoppt von selbst» flackert).
 *
 * Fix bleibt eine TEST-Härtung (kein Assertion-Abbau — beide Beweise bleiben
 * exakt dieselben Behauptungen, nur zeitlich robuster gemessen): Pollen über
 * ein grosszügiges Fenster statt EINER festen Wartezeit — dieselbe Idee wie
 * `stabileBox()` in `dock-interaktion.spec.ts`, hier auf den CTM-Transform
 * angewendet. `wartetBisRuhig()` liefert erst zurück, wenn die Position für
 * `ruheMs` am Stück TATSÄCHLICH unverändert blieb, mit grosszügigem
 * Gesamt-Timeout (deckt auch seltene rAF-Taktung sicher ab).
 *
 * v0.8.1/P2 — NACHBESSERUNG (HEAD-bewiesen, s. Verifikationsbericht): die
 * erste Fassung pollte `getScreenCTM()` von AUSSEN (Node→Browser-IPC,
 * 100ms-Intervall) und liess die Ruhe-Uhr ab dem AUFRUF-Zeitpunkt laufen —
 * dieselbe Klasse Race wie bei `warteAufSolveStabilitaet()` in
 * `dock-interaktion.spec.ts`: kam der reguläre Drag-Render-Nachlauf (der
 * `<g transform=…>`-Knoten in `PlanView.tsx`, GANZ OHNE eigenes Momentum)
 * erst NACH Ablauf von `ruheMs` seit Aufruf an, galt die Position fälschlich
 * schon als «ruhig», BEVOR der Nachlauf überhaupt landete — real reproduziert
 * (reduced-motion-Test lieferte exakt 160, die Distanz des LETZTEN
 * synthetischen Mouse-Move-Schritts, als vermeintliches «Momentum»). Fix wie
 * dort: ein `MutationObserver` auf dem `transform`-Attribut des Plan-Inhalts-
 * `<g>` LÄUFT IM BROWSER und hält die Ruhe-Uhr über die gesamte
 * Beobachtungsdauer offen — jede tatsächliche Attribut-Änderung (auch eine
 * späte) setzt sie zurück, kein Node↔Browser-Poll-Intervall kann eine
 * Mutation verpassen oder zu früh „ruhig“ urteilen.
 */
async function wartetBisRuhig(
  page: import('@playwright/test').Page,
  ruheMs = 700,
  timeoutMs = 10000,
): Promise<{ e: number; f: number }> {
  await page.evaluate(
    ({ ruheMs, timeoutMs }) => {
      return new Promise<void>((resolve) => {
        const svg = document.querySelector('[data-testid="planview"]');
        const inhalt = svg?.querySelector('g') ?? null;
        if (!inhalt) {
          resolve();
          return;
        }
        const start = performance.now();
        let letzteAenderung = start;
        const beobachter = new MutationObserver(() => {
          letzteAenderung = performance.now();
        });
        beobachter.observe(inhalt, { attributes: true, attributeFilter: ['transform'] });
        const tick = () => {
          const jetzt = performance.now();
          if (jetzt - letzteAenderung >= ruheMs || jetzt - start >= timeoutMs) {
            beobachter.disconnect();
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    },
    { ruheMs, timeoutMs },
  );
  return holeVerschiebung(page);
}

test('Fling/Momentum: schnelles Maus-Drag-Pan-Loslassen läuft aus und stoppt von selbst (MOTION-KONZEPT-066 §5)', async ({ page }) => {
  // §7: Bewegung wird HIER gezielt geprüft — eigene Spec-Zeile ohne die
  // projektweite reduced-motion-Fixture (Playwright-Default), s. playwright.config.ts.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await oeffneKosmoDesign(page);
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="nav-fit"]');
  // Ersetzt: fixe 300ms nach dem Fit-Klick, s. Begründung im ersten Test oben.
  await wartetBisRuhig(page, 250);
  // Pan-Modus über die Nav-Leiste (kein Werkzeug-Gummiband im Weg).
  await page.click('[data-testid="nav-pan"]');

  const box = (await page.locator('[data-testid="planview"]').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // v0.8.1/P2 — WEITERER, TIEFERER Befund (HEAD-bewiesen per direkter
  // Zeitstempel-Messung am `pointermove`-Event, nicht durch das Poll-Fenster
  // oben abgedeckt): `flingTracker.sample()` (eingabe-3d.ts) verwirft jede
  // Probe älter als `FLING_SAMPLE_FENSTER_MS` (80ms) VOR der jeweils
  // neuesten — bleibt dabei `< 2` Proben übrig, liefert `loslassGeschwindigkeit()`
  // `null`: **kein Fling startet überhaupt** (`momentumDelta` real als exakte
  // 0 beobachtet, nicht nur «knapp zu klein»). Direkt gemessen (In-Page-
  // Listener + `performance.now()`): jeder EINZELN AWAITED `page.mouse.
  // move()`-Aufruf (auch mit `steps`) ist ein eigener CDP-Roundtrip und
  // landet in DIESER Umgebung real ~100–250ms nach dem vorigen — WEIT über
  // den 80ms, unabhängig von zusätzlicher Last (auch in einem isolierten
  // Probe-Lauf ohne jede Fremdlast reproduziert). Das ist keine reine
  // Zeitfenster-Frage der MESSUNG (wie oben), sondern eine Eigenschaft der
  // SYNTHETISCHEN EINGABE selbst: ihre realen Browser-Zeitstempel hängen vom
  // CDP-Roundtrip dieser Umgebung ab.
  // AUSPROBIERT UND VERWORFEN: eine rohe CDP-Session
  // (`Input.dispatchMouseEvent` ohne Einzel-Await, `Promise.all`) erzeugte
  // zwar nachweislich <30ms-Zwischenproben (statt 100–250ms) — löste aber
  // real einen App-Absturz aus («KosmoDesign ist auf einen Fehler gelaufen…
  // Cannot read properties of null (reading 'cx')», reproduzierbar isoliert
  // NUR mit dieser Dispatch-Art, ein identischer plain-`page.mouse`-Zug
  // crasht NICHT). Ursache nicht abschliessend geklärt — verworfen zugunsten
  // des Plain-Playwright-Wegs unten.
  //
  // v0.8.1/P4 — ECHTER FIX statt Zufalls-Retry (P2-Übergabe, Owner-Auftrag
  // §1.6 der V081-SPEZ): `eingabe-3d.ts` bekam einen TEST-ONLY Browser-Hook
  // (`window.__kosmoFling.setSampleFensterMs`, Produktions-Default
  // `FLING_SAMPLE_FENSTER_MS`/80ms bleibt für `PlanView.tsx` UNVERÄNDERT) —
  // dieser Test weitet das Sample-Fenster VOR der Geste testweise auf 500ms:
  // damit fallen praktisch ALLE CDP-getakteten Zwischenproben (~100–250ms
  // auseinander) sicher ins Fenster, unabhängig vom genauen Roundtrip-Timing.
  // Die vormals bis zu 6-fache Wiederholschleife (grösserer Zug + mehr
  // Schritte je Versuch, bis zufällig ein <80ms-Paar traf) schrumpft auf
  // EINEN einzigen, deterministisch verlässlichen Versuch.
  await page.evaluate(() => {
    (window as unknown as { __kosmoFling: { setSampleFensterMs: (ms: number) => void } }).__kosmoFling.setSampleFensterMs(
      500,
    );
  });

  const zugWeite = 380;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  // EIN interpolierter Zug mit vielen Zwischenpunkten — im geweiteten
  // 500ms-Fenster liegen davon garantiert mehrere beisammen.
  await page.mouse.move(cx + zugWeite, cy, { steps: 30 });
  await page.mouse.up();

  // Erst settlen lassen (derselbe Render-Nachlauf-Grund wie im reduced-
  // motion-Test unten — die Baseline soll NICHT den regulären Drag-Render
  // nachlaufend als «Momentum» missverstehen). ACHTUNG: hier NICHT
  // `wartetBisRuhig()` (das wartet auf ECHTE Stille, d.h. bis der Fling
  // FERTIG ist — genau das würde die Baseline zur Endposition machen und
  // `momentumDelta` strukturell auf ~0 zwingen). Die echte Bedingung ist
  // stattdessen «zwei echte Frames sind gemalt» — genug, damit React den
  // letzten synthetischen `pointermove` sicher gerendert hat, ohne auf das
  // Ende der (hier gewollt noch laufenden) Fling-Animation zu warten.
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
  const sofortNachLoslassen = await holeVerschiebung(page);

  // v0.8.1/P2 (s. `wartetBisRuhig()`-Kopfkommentar) — Assertion #1 bleibt
  // dieselbe Behauptung («die Ansicht bewegt sich nach dem Loslassen WEITER,
  // ohne dass Maus/Taste noch aktiv sind») und dieselbe Mindest-Distanz
  // (>3px), nur über ein grosszügigeres Poll-Fenster (statt eines EINEN
  // festen 150ms-Zeitpunkts, der unter seltener rAF-Taktung zufällig leer
  // bleiben kann) gemessen: die WEITESTE seither erreichte Position zählt.
  let weiteste = sofortNachLoslassen;
  const momentumStart = Date.now();
  while (Date.now() - momentumStart < 1500) {
    await new Promise((r) => setTimeout(r, 50));
    const probe = await holeVerschiebung(page);
    const deltaJetzt = Math.abs(probe.e - sofortNachLoslassen.e) + Math.abs(probe.f - sofortNachLoslassen.f);
    const deltaBisher = Math.abs(weiteste.e - sofortNachLoslassen.e) + Math.abs(weiteste.f - sofortNachLoslassen.f);
    if (deltaJetzt > deltaBisher) weiteste = probe;
  }
  const momentumDelta = Math.abs(weiteste.e - sofortNachLoslassen.e) + Math.abs(weiteste.f - sofortNachLoslassen.f);
  expect(momentumDelta).toBeGreaterThan(3);
  // Bewegungsrichtung des Fling stimmt mit der Zugrichtung überein (nach rechts
  // gezogen → Inhalt wandert weiter nach rechts, e wächst weiter).
  expect(weiteste.e).toBeGreaterThan(sofortNachLoslassen.e);

  // … und der Fling stoppt von selbst (Dämpfung 0.95/Frame, Stopp < 0.02 px/ms
  // Restgeschwindigkeit). Assertion #2 bleibt dieselbe Behauptung («die
  // Position bleibt danach unverändert»), jetzt über `wartetBisRuhig()`
  // (grosszügiges Poll-Timeout statt einer festen 3500ms-Annahme) — s.
  // Kopfkommentar dort.
  const spaeterA = await wartetBisRuhig(page);
  // Ersetzt: fixe 300ms Zusatzwarten, um «bleibt stabil» zu behaupten. Ein
  // ZWEITER `wartetBisRuhig`-Aufruf beweist das ECHT: mutiert das
  // transform-Attribut doch noch (Restdrift), verlängert das die Ruhe-Uhr
  // real und `spaeterB` fängt es auf — statt eine feste Dauer blind
  // abzuwarten und dann zu hoffen, dass nichts mehr passiert ist.
  const spaeterB = await wartetBisRuhig(page);
  expect(Math.abs(spaeterB.e - spaeterA.e) + Math.abs(spaeterB.f - spaeterA.f)).toBeLessThan(2);
});

test('Fling/Momentum: bei reduced-motion läuft NACH dem Loslassen nichts mehr aus', async ({ page }) => {
  // Playwright-Projektstandard IST `reducedMotion: 'reduce'` (playwright.config.ts)
  // — explizit gesetzt statt nur verlassen: dieselbe, im Repo bereits
  // dokumentierte Chromium/Playwright-Lücke wie in `App.tsx` (Kommentar bei
  // `gehZu`) — `matchMedia('(prefers-reduced-motion: reduce)')` spiegelt den
  // reinen Kontext-Default NICHT immer zuverlässig, ein expliziter
  // `emulateMedia`-Aufruf schon (CDP setzt die Media-Feature-Emulation hart).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await oeffneKosmoDesign(page);
  await page.click('[data-testid="view-2d"]');
  await page.click('[data-testid="nav-fit"]');
  // Ersetzt: fixe 300ms nach dem Fit-Klick, s. Begründung im ersten Test oben.
  await wartetBisRuhig(page, 250);
  await page.click('[data-testid="nav-pan"]');
  // `emulateMedia` setzt sich manchmal erst NACH dem `reload()` in
  // `oeffneKosmoDesign` durch (Race, dieselbe Chromium/Playwright-Lücke wie
  // in App.tsx dokumentiert) — hart auf den tatsächlichen matchMedia-Zustand
  // warten, statt ihn nur anzunehmen, macht den Test deterministisch statt
  // gelegentlich flau.
  await expect
    .poll(() => page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches))
    .toBe(true);

  const box = (await page.locator('[data-testid="planview"]').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 90, cy, { steps: 1 });
  await page.mouse.move(cx + 220, cy, { steps: 1 });
  await page.mouse.move(cx + 380, cy, { steps: 1 });
  await page.mouse.up();

  // ERST den letzten Pan-Move (regulärer Drag-Pfad, unverändert) vollständig
  // rendern lassen (die schnellen synthetischen Moves können den Render
  // kurz ins Hintertreffen bringen — belegt per Diagnose: der `<g>`-Transform
  // «nachzog» sonst noch bis zu ~350ms nach `mouseup`), DANN erst die
  // Momentum-losigkeits-Baseline lesen — sonst verwechselt der Test
  // Render-Nachlauf des regulären Drags mit einem (hier NICHT gewollten) Fling.
  // v0.8.1/P2 — bei der Last-Verifikation dieses Auftrags real beobachtet:
  // die FESTEN 400ms/300ms nahmen (wie die Chevron/row-Splitter-Flakes
  // oben) implizit an, der reguläre Render-Nachlauf sei nach 400ms IMMER
  // fertig. Unter echter Last (paralleler zweiter E2E-Lauf im selben
  // Container) reichte das nicht — die Baseline «sofort» traf noch mitten im
  // Nachlauf, «danach» sah dessen Rest als vermeintliches Momentum (real:
  // Δ=160 statt <0.5). Fix: `wartetBisRuhig()` (echte Ruhe statt Annahme,
  // s. dortiger Kopfkommentar) statt des ersten festen Waits — dieselbe
  // Assertion (<0.5) bleibt unangetastet.
  const sofort = await wartetBisRuhig(page);
  // Ersetzt: fixe 300ms Zusatzwarten (dieselbe «bleibt stabil»-Behauptung wie
  // im Fling-Test oben) — ein zweiter `wartetBisRuhig`-Aufruf bestätigt ECHTE
  // Ruhe über ein weiteres Fenster statt eine feste Dauer zu erraten.
  const danach = await wartetBisRuhig(page);
  // Keine Weiterbewegung ohne gehaltene Maustaste — der Pan endet exakt dort,
  // wo losgelassen wurde (kein Fake-Momentum unter reduced-motion).
  expect(Math.abs(danach.e - sofort.e) + Math.abs(danach.f - sofort.f)).toBeLessThan(0.5);
});

test('Cursor-Attribut des Plans wechselt je Werkzeug/Modus (F9 — kontextabhängige Maus)', async ({ page }) => {
  await oeffneKosmoDesign(page);
  await page.click('[data-testid="view-2d"]');
  const plan = page.locator('[data-testid="planview"]');

  // Auswahl-Werkzeug, freie Fläche: Standard-Cursor
  await expect(plan).toHaveAttribute('data-cursor', 'default');

  // Zeichenwerkzeug: Fadenkreuz
  await page.click('[data-testid="tool-wand"]');
  await expect(plan).toHaveAttribute('data-cursor', 'crosshair');

  // zurück zur Auswahl: wieder Standard
  await page.click('[data-testid="tool-auswahl"]');
  await expect(plan).toHaveAttribute('data-cursor', 'default');

  // Leertaste gehalten (Pan-Bereitschaft): Greifhand
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.down('Space');
  await expect(plan).toHaveAttribute('data-cursor', 'grab');
  await page.keyboard.up('Space');
  await expect(plan).toHaveAttribute('data-cursor', 'default');
});
