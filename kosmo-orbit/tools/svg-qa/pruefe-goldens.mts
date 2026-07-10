/**
 * SVG-QA-Loop v1 (v0.6.9, «Werkplan-Härte», Visual-SDPO-Denkfigur aus der
 * Scan-Auswertung) — rastert JEDES Golden-SVG in echtem Chromium
 * (playwright-core; cairosvg gibt es im Container NICHT) und prüft
 * automatisiert, statt sich auf «die Bytes stimmen» allein zu verlassen:
 *
 *   (a) Rendering-Validität: lädt fehlerfrei (kein `pageerror`, keine
 *       `console`-Fehler, kein XML-Parserfehler, ein `<svg>`-Wurzelelement
 *       existiert), hat eine echte Fläche (Root-`getBBox()` nicht 0×0) UND
 *       einen messbaren Anteil nicht-weisser Pixel (gerastert via In-Page-
 *       `<canvas>`, s.u.) — ein leeres/kaputtes SVG fällt hier durch.
 *   (b) viewBox-Fitting: JEDES Geometrie-Element (`path`, `line`,
 *       `polyline`, `polygon`, `circle`, `rect`, `ellipse`) liegt via
 *       `getBBox()` — umgerechnet in Root-viewBox-Koordinaten, s.u. — innerhalb
 *       der viewBox ± Toleranz.
 *   (c) Text-Containment: jedes `<text>` liegt (dieselbe Umrechnung)
 *       innerhalb der viewBox ± Toleranz (harte Prüfung wie (b)); zusätzlich
 *       Text↔Text-BBox-Überlappung als reine WARNUNG (nie Exit-Fehler, s.
 *       Schwellen-Begründung unten).
 *
 * Aufruf:
 *   npx tsx tools/svg-qa/pruefe-goldens.mts                 # alle Kernel-Goldens
 *   npx tsx tools/svg-qa/pruefe-goldens.mts --dir=pfad/zu/svgs
 *   PLAYWRIGHT_CHROMIUM_PATH=/anderer/pfad npx tsx tools/svg-qa/pruefe-goldens.mts
 *
 * Exit-Code: 0 nur wenn (a), (b) und der Containment-Teil von (c) für ALLE
 * geprüften Dateien grün sind (harte Kriterien) — sonst 1. Text-Overlaps
 * (zweiter Teil von (c)) lösen NIE einen harten Fehler aus, nur ⚠ in der
 * Tabelle — s. Schwellen-Begründung.
 *
 * Warum getCTM()-Differenz statt getBBox() direkt vergleichen:
 * `getBBox()` liefert die BBox eines Elements im LOKALEN Koordinatenraum,
 * UNVERÄNDERT durch Vorfahren-`transform` (z.B. die Grundriss-Goldens
 * zeichnen ihre Weltgeometrie in `<g transform="translate(…) scale(0.01)">`
 * — `getBBox()` einer `<path>` darin liefert also rohe Welt-mm-Zahlen wie
 * 8045, nicht Papier-mm). Ein direkter Vergleich mit der Papier-viewBox
 * (0..420) wäre witzlos. `getCTM()` bildet dagegen auf den VIEWPORT
 * (gerenderte CSS-Pixel, abhängig von der aktuellen Fenstergrösse!) ab,
 * nicht auf viewBox-Einheiten — auch das ist nicht direkt vergleichbar.
 * Der Trick: für das äusserste `<svg>` beschreibt `root.getCTM()` GENAU
 * die viewBox→Viewport-Skalierung (Spezial-Fall des Wurzelelements ohne
 * eigenen Vorfahren-Viewport). Also liefert
 * `root.getCTM().inverse().multiply(el.getCTM())` die Abbildung von der
 * lokalen Elementebene auf die viewBox-EIGENEN Root-Koordinaten —
 * unabhängig von der tatsächlichen Fenstergrösse der Playwright-Page.
 *
 * Warum ein `<canvas>` statt `page.screenshot()` für den Pixel-Test:
 * Root-SVGs ohne `width`/`height` (nur `viewBox`, z.B. alle `ansicht-*`/
 * `schnitt-*`-Goldens) strecken sich beim direkten Laden als Dokument auf
 * die Page-Viewport-Grösse — ein Screenshot bräuchte also eine pro Datei
 * passende Viewport-Konfiguration UND einen PNG-Decoder in Node (den es
 * hier nicht gibt). Stattdessen: das SVG wird im Browser selbst als
 * `data:image/svg+xml`-Bild in ein `<canvas>` mit fester, aus der viewBox
 * abgeleiteter Zielgrösse gezeichnet (`drawImage` mit expliziter Ziel-
 * breite/-höhe umgeht die Grössen-Unschärfe) und dort direkt per
 * `getImageData` ausgewertet — kein Node-seitiger Bild-Decoder nötig, kein
 * cairosvg, keine neue Abhängigkeit.
 *
 * SCHWELLEN (Bestand ZUERST vermessen, 10.07.2026, alle 16 Goldens unter
 * packages/kosmo-kernel/test/golden/ — s. Ersterlauf-Tabelle im
 * v0.6.9-Abschlussbericht):
 *
 *   - NICHT_WEISS_MIN = 0.0005 (0.05 %): der Bestand liegt zwischen 1.9 %
 *     und 21.6 % nicht-weissen Pixeln (Report-/Plan-/Ansicht-Mischung) —
 *     0.05 % liegt weit darunter, lässt aber ein leeres/fehlgeschlagenes
 *     Rendering (0 %) sofort durchfallen.
 *   - GEOM_TOL = max(2, 0.05 * max(vbW, vbH)) («5 % + 2-Einheiten-Boden»):
 *     11 der 16 Bestandsgoldens haben exakt 0 Überstand; die 5 Ansicht-/
 *     Schnitt-Goldens (Hidden-Line-Renderer, `ansicht-*`/`schnitt-*`) haben
 *     alle GENAU 300 Welt-mm Überstand — die gestrichelte graue
 *     «Bodenlinie» ragt bewusst über die Gebäudekontur hinaus, die viewBox
 *     wird aber aus der Gebäudekontur berechnet, nicht aus der Bodenlinie
 *     (bewusste, bestehende Renderer-Konvention, kein Fehler). Relativ zur
 *     jeweiligen viewBox-Diagonale reicht das von 1.4 % (grosses Testhaus)
 *     bis 3.6 % (kleines Fenster-Detail) — 5 % lässt diese bekannte
 *     Überzeichnung mit ~40 % Sicherheitsspanne durch, meldet aber jeden
 *     Skalierungsfehler (typischerweise 10×/100×) oder verschobene/NaN-
 *     Koordinaten sofort hart.
 *   - TEXT_TOL = max(1, 0.015 * max(vbW, vbH)): alle 16 Bestandsgoldens
 *     haben 0 Text-Überstand — enger gefasst als GEOM_TOL, weil Text im
 *     Bestand nie über den Rand ragt.
 *   - EPS_OVERLAP = 0.1 (Welt-Einheiten in BEIDEN Achsen, reine Warnung):
 *     genau EINE legitime Text↔Text-Überlappung existiert im Bestand
 *     (abnahmeprotokoll.svg: Status-Badge-Text «Behoben (15.07.2026)»
 *     über einem Platzhalter-Strich «—», ~12×11 Einheiten) — 0.1 filtert
 *     nur Sub-Pixel-Berührungen an gemeinsamen Kanten (Gleitkomma-Rauschen
 *     zweier exakt aneinanderstossender BBoxen), lässt aber genau diese
 *     eine bekannte Überlappung als ⚠ sichtbar statt sie zu verstecken.
 */
import { chromium, type Page } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(HIER, '../..');

const NICHT_WEISS_MIN = 0.0005;
const GEOM_TOL_MIN = 2;
const GEOM_TOL_FRACTION = 0.05;
const TEXT_TOL_MIN = 1;
const TEXT_TOL_FRACTION = 0.015;
const EPS_OVERLAP = 0.1;

interface Overshoot {
  ok: boolean;
  max: number;
  toleranz: number;
  anzahlVerletzt: number;
  gesamt: number;
}

interface PruefErgebnis {
  datei: string;
  validitaet: { ok: boolean; grund: string; nichtWeissAnteil: number | null };
  fitting: Overshoot;
  textContainment: Overshoot;
  textOverlap: { warn: boolean; anzahl: number };
}

/** In-Page-Auswertung: läuft komplett im Browser-Kontext (keine Node-DOM-Libs
 * nötig). Liefert rohe Zahlen zurück, die Node danach nur noch formatiert. */
async function pruefeSeite(
  page: Page,
): Promise<Omit<PruefErgebnis, 'datei'>> {
  const consoleFehler: string[] = [];
  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === 'error') consoleFehler.push(msg.text());
  };
  const pageErrors: string[] = [];
  const onPageError = (err: Error) => pageErrors.push(String(err));
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  try {
    const svgHandle = await page.$('svg');
    const parserError = await page.$('parsererror');
    if (parserError) {
      return {
        validitaet: { ok: false, grund: 'XML-Parserfehler beim Laden', nichtWeissAnteil: null },
        fitting: { ok: true, max: 0, toleranz: 0, anzahlVerletzt: 0, gesamt: 0 },
        textContainment: { ok: true, max: 0, toleranz: 0, anzahlVerletzt: 0, gesamt: 0 },
        textOverlap: { warn: false, anzahl: 0 },
      };
    }
    if (!svgHandle) {
      return {
        validitaet: { ok: false, grund: 'kein <svg>-Wurzelelement gefunden', nichtWeissAnteil: null },
        fitting: { ok: true, max: 0, toleranz: 0, anzahlVerletzt: 0, gesamt: 0 },
        textContainment: { ok: true, max: 0, toleranz: 0, anzahlVerletzt: 0, gesamt: 0 },
        textOverlap: { warn: false, anzahl: 0 },
      };
    }

    if (consoleFehler.length > 0 || pageErrors.length > 0) {
      return {
        validitaet: {
          ok: false,
          grund: `Lade-Fehler: ${[...pageErrors, ...consoleFehler].slice(0, 2).join(' | ')}`,
          nichtWeissAnteil: null,
        },
        fitting: { ok: true, max: 0, toleranz: 0, anzahlVerletzt: 0, gesamt: 0 },
        textContainment: { ok: true, max: 0, toleranz: 0, anzahlVerletzt: 0, gesamt: 0 },
        textOverlap: { warn: false, anzahl: 0 },
      };
    }

    const geometrieUndText = await page.evaluate(
      ({ geomTolMin, geomTolFraction, textTolMin, textTolFraction, epsOverlap }) => {
        const svg = document.querySelector('svg')!;
        const vbAttr = svg.getAttribute('viewBox');
        const teile = (vbAttr ?? '0 0 100 100').split(/\s+/).map(Number);
        const [minX, minY, vbW, vbH] = teile as [number, number, number, number];
        const maxX = minX + vbW;
        const maxY = minY + vbH;
        const maxDim = Math.max(vbW, vbH);
        const geomTol = Math.max(geomTolMin, geomTolFraction * maxDim);
        const textTol = Math.max(textTolMin, textTolFraction * maxDim);

        // Root-BBox: 0×0-Flächen-Check (Validität).
        let rootBBox = { width: 0, height: 0 };
        try {
          rootBBox = svg.getBBox();
        } catch {
          // kein Inhalt / nicht gerendert — bleibt 0×0, wird unten als Fehler gemeldet
        }

        const rootCTM = (svg as SVGGraphicsElement).getCTM();
        const rootInv = rootCTM ? rootCTM.inverse() : null;

        function lokalZuViewBox(el: SVGGraphicsElement): { minX: number; maxX: number; minY: number; maxY: number } | null {
          let bbox: DOMRect;
          try {
            bbox = el.getBBox();
          } catch {
            return null;
          }
          let m = el.getCTM();
          if (!m) return null;
          if (rootInv) m = rootInv.multiply(m);
          const ecken = [
            [bbox.x, bbox.y],
            [bbox.x + bbox.width, bbox.y],
            [bbox.x, bbox.y + bbox.height],
            [bbox.x + bbox.width, bbox.y + bbox.height],
          ].map(([x, y]) => ({ x: m!.a * x! + m!.c * y! + m!.e, y: m!.b * x! + m!.d * y! + m!.f }));
          const xs = ecken.map((p) => p.x);
          const ys = ecken.map((p) => p.y);
          return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
        }

        const geomEls = [...svg.querySelectorAll('path, line, polyline, polygon, circle, rect, ellipse')] as SVGGraphicsElement[];
        let geomMaxUeber = 0;
        let geomVerletzt = 0;
        for (const el of geomEls) {
          const b = lokalZuViewBox(el);
          if (!b) continue;
          const ueber = Math.max(minX - b.minX, b.maxX - maxX, minY - b.minY, b.maxY - maxY, 0);
          if (ueber > geomMaxUeber) geomMaxUeber = ueber;
          if (ueber > geomTol) geomVerletzt++;
        }

        const textEls = [...svg.querySelectorAll('text')] as SVGGraphicsElement[];
        const textBoxen = textEls.map((el) => lokalZuViewBox(el)).filter((b): b is NonNullable<typeof b> => b !== null);
        let textMaxUeber = 0;
        let textVerletzt = 0;
        for (const b of textBoxen) {
          const ueber = Math.max(minX - b.minX, b.maxX - maxX, minY - b.minY, b.maxY - maxY, 0);
          if (ueber > textMaxUeber) textMaxUeber = ueber;
          if (ueber > textTol) textVerletzt++;
        }
        let overlapAnzahl = 0;
        for (let i = 0; i < textBoxen.length; i++) {
          for (let j = i + 1; j < textBoxen.length; j++) {
            const a = textBoxen[i]!;
            const b = textBoxen[j]!;
            const ix = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
            const iy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
            if (ix > epsOverlap && iy > epsOverlap) overlapAnzahl++;
          }
        }

        return {
          rootFlaeche: rootBBox.width * rootBBox.height,
          geomTotal: geomEls.length,
          geomMaxUeber,
          geomTol,
          geomVerletzt,
          textTotal: textBoxen.length,
          textMaxUeber,
          textTol,
          textVerletzt,
          overlapAnzahl,
        };
      },
      { geomTolMin: GEOM_TOL_MIN, geomTolFraction: GEOM_TOL_FRACTION, textTolMin: TEXT_TOL_MIN, textTolFraction: TEXT_TOL_FRACTION, epsOverlap: EPS_OVERLAP },
    );

    if (geometrieUndText.rootFlaeche <= 0) {
      return {
        validitaet: { ok: false, grund: '0×0-Fläche (kein sichtbarer Inhalt)', nichtWeissAnteil: null },
        fitting: { ok: true, max: 0, toleranz: 0, anzahlVerletzt: 0, gesamt: 0 },
        textContainment: { ok: true, max: 0, toleranz: 0, anzahlVerletzt: 0, gesamt: 0 },
        textOverlap: { warn: false, anzahl: 0 },
      };
    }

    // Nicht-weisser Pixelanteil via In-Page-<canvas> (s. Kopfkommentar).
    const pixelErgebnis = await page.evaluate(async () => {
      const svg = document.querySelector('svg')!;
      const vbAttr = svg.getAttribute('viewBox');
      const teile = (vbAttr ?? '0 0 100 100').split(/\s+/).map(Number);
      const vbW = teile[2] ?? 100;
      const vbH = teile[3] ?? 100;
      const seiteVerhaeltnis = vbW / vbH;
      let breite = 1000;
      let hoehe = Math.round(1000 / seiteVerhaeltnis);
      if (hoehe > 1400) {
        hoehe = 1400;
        breite = Math.round(1400 * seiteVerhaeltnis);
      }
      const markup = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas') as HTMLCanvasElement;
      canvas.width = breite;
      canvas.height = hoehe;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { ok: false as const };
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, breite, hoehe);
      const img = new Image();
      const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
      const geladen = await new Promise<boolean>((resolve_) => {
        img.onload = () => resolve_(true);
        img.onerror = () => resolve_(false);
        img.src = dataUrl;
      });
      if (!geladen) return { ok: false as const };
      ctx.drawImage(img, 0, 0, breite, hoehe);
      const daten = ctx.getImageData(0, 0, breite, hoehe).data;
      let nichtWeiss = 0;
      for (let i = 0; i < daten.length; i += 4) {
        const r = daten[i]!;
        const g = daten[i + 1]!;
        const b = daten[i + 2]!;
        if (r < 250 || g < 250 || b < 250) nichtWeiss++;
      }
      return { ok: true as const, anteil: nichtWeiss / (breite * hoehe) };
    });

    if (!pixelErgebnis.ok) {
      return {
        validitaet: { ok: false, grund: 'Raster-Bild konnte nicht geladen werden (Canvas)', nichtWeissAnteil: null },
        fitting: { ok: true, max: 0, toleranz: 0, anzahlVerletzt: 0, gesamt: 0 },
        textContainment: { ok: true, max: 0, toleranz: 0, anzahlVerletzt: 0, gesamt: 0 },
        textOverlap: { warn: false, anzahl: 0 },
      };
    }

    const validOk = pixelErgebnis.anteil > NICHT_WEISS_MIN;
    return {
      validitaet: {
        ok: validOk,
        grund: validOk ? 'ok' : `nur ${(pixelErgebnis.anteil * 100).toFixed(3)}% nicht-weisse Pixel (Schwelle ${(NICHT_WEISS_MIN * 100).toFixed(2)}%)`,
        nichtWeissAnteil: pixelErgebnis.anteil,
      },
      fitting: {
        ok: geometrieUndText.geomVerletzt === 0,
        max: geometrieUndText.geomMaxUeber,
        toleranz: geometrieUndText.geomTol,
        anzahlVerletzt: geometrieUndText.geomVerletzt,
        gesamt: geometrieUndText.geomTotal,
      },
      textContainment: {
        ok: geometrieUndText.textVerletzt === 0,
        max: geometrieUndText.textMaxUeber,
        toleranz: geometrieUndText.textTol,
        anzahlVerletzt: geometrieUndText.textVerletzt,
        gesamt: geometrieUndText.textTotal,
      },
      textOverlap: { warn: geometrieUndText.overlapAnzahl > 0, anzahl: geometrieUndText.overlapAnzahl },
    };
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }
}

function kennzeichen(ok: boolean): string {
  return ok ? '✓' : '✗';
}

async function main(): Promise<void> {
  const dirArg = process.argv.find((a) => a.startsWith('--dir='));
  const goldenDir = dirArg ? resolve(REPO_ROOT, dirArg.slice('--dir='.length)) : resolve(REPO_ROOT, 'packages/kosmo-kernel/test/golden');

  const dateien = readdirSync(goldenDir)
    .filter((f) => f.endsWith('.svg'))
    .sort();

  if (dateien.length === 0) {
    console.error(`Keine .svg-Dateien in ${goldenDir} gefunden.`);
    process.exit(1);
  }

  const browser = await chromium.launch({
    executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] ?? '/opt/pw-browsers/chromium',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  // Polyfill für esbuild/tsx's `__name()`-Helfer (keepNames-Transform):
  // `page.evaluate(fn)` serialisiert `fn` per `toString()` und führt den
  // Quelltext isoliert im Browser aus — das modul-weite esbuild-Beiwerk
  // (die `__name`-Funktionsdefinition selbst) ist darin NICHT enthalten,
  // nur der `__name(...)`-Aufruf um jede benannte Funktion/Konstante
  // innerhalb der Closure. Ohne diesen Polyfill bricht JEDER evaluate()-
  // Aufruf mit benannten Hilfsfunktionen (`ReferenceError: __name is not
  // defined`). `addInitScript` läuft bei JEDER Navigation neu (wir laden
  // pro Golden ein neues Dokument), der Polyfill bleibt also über die
  // ganze Prüfschleife hinweg aktiv.
  await page.addInitScript(() => {
    (globalThis as unknown as { __name?: (fn: unknown) => unknown }).__name ??= (fn: unknown) => fn;
  });

  const ergebnisse: PruefErgebnis[] = [];
  for (const datei of dateien) {
    const pfad = resolve(goldenDir, datei);
    await page.goto('file://' + pfad);
    const r = await pruefeSeite(page);
    ergebnisse.push({ datei, ...r });
  }
  await browser.close();

  // Tabelle
  const spalten = ['Golden', 'Validität', 'Fitting', 'Text-Containment', 'Text-Overlap'];
  const zeilen = ergebnisse.map((e) => [
    e.datei,
    `${kennzeichen(e.validitaet.ok)}${e.validitaet.ok ? '' : ` (${e.validitaet.grund})`}`,
    `${kennzeichen(e.fitting.ok)} (max ${e.fitting.max.toFixed(1)} / tol ${e.fitting.toleranz.toFixed(1)})`,
    `${kennzeichen(e.textContainment.ok)} (max ${e.textContainment.max.toFixed(1)} / tol ${e.textContainment.toleranz.toFixed(1)})`,
    e.textOverlap.warn ? `⚠ (${e.textOverlap.anzahl})` : '✓',
  ]);
  const breiten = spalten.map((s, i) => Math.max(s.length, ...zeilen.map((z) => (z[i] ?? '').length)));
  const formatZeile = (z: string[]) => z.map((c, i) => (c ?? '').padEnd(breiten[i]!)).join('  ');
  console.log(formatZeile(spalten));
  console.log(breiten.map((b) => '-'.repeat(b)).join('  '));
  for (const z of zeilen) console.log(formatZeile(z));

  const hartFehlgeschlagen = ergebnisse.filter((e) => !e.validitaet.ok || !e.fitting.ok || !e.textContainment.ok);
  const warnungen = ergebnisse.filter((e) => e.textOverlap.warn);
  console.log('');
  console.log(`${ergebnisse.length} Goldens geprüft — ${hartFehlgeschlagen.length} harte Fehler, ${warnungen.length} Text-Overlap-Warnungen.`);

  if (hartFehlgeschlagen.length > 0) {
    console.error('');
    console.error('Harte Verstösse (Validität/Fitting/Text-Containment):');
    for (const e of hartFehlgeschlagen) {
      if (!e.validitaet.ok) console.error(`  - ${e.datei}: Validität — ${e.validitaet.grund}`);
      if (!e.fitting.ok) console.error(`  - ${e.datei}: Fitting — ${e.fitting.anzahlVerletzt}/${e.fitting.gesamt} Geometrie-Elemente ausserhalb viewBox (max ${e.fitting.max.toFixed(1)} > Toleranz ${e.fitting.toleranz.toFixed(1)})`);
      if (!e.textContainment.ok) console.error(`  - ${e.datei}: Text-Containment — ${e.textContainment.anzahlVerletzt}/${e.textContainment.gesamt} Text-Elemente ausserhalb viewBox (max ${e.textContainment.max.toFixed(1)} > Toleranz ${e.textContainment.toleranz.toFixed(1)})`);
    }
    process.exitCode = 1;
    return;
  }
  process.exitCode = 0;
}

await main();
