import { chromium } from '@playwright/test';
import { renderToStaticMarkup } from 'react-dom/server';
import React, { createElement } from 'react';

// `island-glyphen.tsx` nutzt den Repo-weiten `tsconfig.base.json`-Default
// (kein `"jsx"`-Feld → esbuild/tsx transformiert klassisch zu
// `React.createElement`, KEIN automatischer Import). In der App läuft das
// über Vite/`apps/kosmo-orbit/tsconfig.json`s `"jsx":"react-jsx"` — dieses
// freistehende Skript hat dieses Vite-Setup nicht, darum hier der globale
// `React`-Anker VOR dem dynamischen Import, damit die klassische
// Transform-Ausgabe (`React.createElement(...)`) zur Laufzeit auflöst.
(globalThis as unknown as { React: typeof React }).React = React;

const { ISLAND_GLYPHEN, ISLAND_PILL_GLYPHEN } = await import(
  '../../apps/kosmo-orbit/src/modules/design/island/island-glyphen'
);
const { VIS_GLYPHEN } = await import('../../apps/kosmo-orbit/src/modules/vis/island/vis-glyphen');
const { PUBLISH_GLYPHEN } = await import('../../apps/kosmo-orbit/src/modules/publish/island/publish-glyphen');
const { PREPARE_GLYPHEN } = await import('../../apps/kosmo-orbit/src/modules/prepare/island/prepare-glyphen');

/**
 * PE2 (v0.8.4, Bauauftrag Punkt 4) — Icon-Kontaktbogen-Regenerierung.
 *
 * Es gibt KEIN eingecheckt(es) Kontaktbogen-Skript aus W1 (recherchiert:
 * `grep -ri kontaktbogen` über den ganzen Baum trifft NUR die ROADMAP-Prosa-
 * Zeile 1647 «Icon-Kontaktbogen selbst regeneriert und gesichtet (24
 * unterscheidbare Zeichnungen)» — PA4+ICON (`f1775f3`) hat den Kontaktbogen
 * offenbar ad-hoc erzeugt, ohne das Skript einzuchecken). Dieses Skript ist
 * PE2s Nachbau desselben Zwecks, jetzt dauerhaft im Repo: ALLE Werkzeug- +
 * Pill-Icons aus `island-glyphen.tsx` auf einem Blatt, gross genug zum
 * visuellen Gegenprüfen (Bauvorschrift: 1.75/24-Strich, runde Kappen, EIN
 * Akzentpunkt, currentColor).
 *
 * Rendert reines SVG-Markup (`react-dom/server`, kein App-Build/Server
 * nötig) in eine eigenständige HTML-Seite, öffnet sie über
 * `page.setContent()` und screenshotet sie als PNG.
 *
 * **PA4 (v0.8.5, `docs/V085-SPEZ.md` §3 E6 + §7 C-14):** additiv erweitert
 * um die drei neuen Stations-Namensräume `vis-glyphen.tsx`/`publish-
 * glyphen.tsx`/`prepare-glyphen.tsx` (13/12/9 Werkzeug-Icons) — dieselbe
 * `zelle()`-Funktion, drei weitere `<h2>`-Abschnitte auf demselben Blatt.
 * Der bestehende design-Teil (Werkzeug/Pille) bleibt unverändert.
 */

const OUT = 'e2e-results/pe2-kontaktbogen.png';

function zelle(namensraum: string, id: string, Icon: (typeof ISLAND_GLYPHEN)[string]): string {
  const svg = renderToStaticMarkup(createElement(Icon, { size: 40 }));
  return `
    <div class="zelle">
      <div class="icon-hell">${svg}</div>
      <div class="icon-dunkel">${svg}</div>
      <div class="label">${namensraum}<br/><strong>${id}</strong></div>
    </div>`;
}

const werkzeugZellen = Object.entries(ISLAND_GLYPHEN)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, Icon]) => zelle('Werkzeug', id, Icon))
  .join('\n');

const pillZellen = Object.entries(ISLAND_PILL_GLYPHEN)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, Icon]) => zelle('Insel-Pille', id, Icon))
  .join('\n');

const visZellen = Object.entries(VIS_GLYPHEN)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, Icon]) => zelle('Vis', id, Icon))
  .join('\n');

const publishZellen = Object.entries(PUBLISH_GLYPHEN)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, Icon]) => zelle('Publish', id, Icon))
  .join('\n');

const prepareZellen = Object.entries(PREPARE_GLYPHEN)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, Icon]) => zelle('Prepare', id, Icon))
  .join('\n');

const werkzeugAnzahl = Object.keys(ISLAND_GLYPHEN).length;
const pillAnzahl = Object.keys(ISLAND_PILL_GLYPHEN).length;
const visAnzahl = Object.keys(VIS_GLYPHEN).length;
const publishAnzahl = Object.keys(PUBLISH_GLYPHEN).length;
const prepareAnzahl = Object.keys(PREPARE_GLYPHEN).length;

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>PE2 Icon-Kontaktbogen</title>
<style>
  body { font-family: sans-serif; background: #111; margin: 0; padding: 24px; }
  h1 { color: #eee; font-size: 18px; }
  h2 { color: #ccc; font-size: 14px; margin-top: 28px; }
  .raster { display: grid; grid-template-columns: repeat(8, 1fr); gap: 12px; }
  .zelle {
    background: #1c1c1c; border: 1px solid #333; border-radius: 8px;
    padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 4px;
  }
  .icon-hell, .icon-dunkel {
    width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
    border-radius: 6px;
  }
  .icon-hell { background: #f4f4f0; color: #16171a; }
  .icon-dunkel { background: #16171a; color: #f4f4f0; }
  .label { color: #999; font-size: 9px; text-align: center; line-height: 1.3; }
  .label strong { color: #eee; }
</style>
</head>
<body>
  <h1>PE2/PA4 Icon-Kontaktbogen — ${werkzeugAnzahl} Werkzeug- + ${pillAnzahl} Pill-Icons (design) + ${visAnzahl} Vis + ${publishAnzahl} Publish + ${prepareAnzahl} Prepare = ${werkzeugAnzahl + pillAnzahl + visAnzahl + publishAnzahl + prepareAnzahl} total</h1>
  <h2>Werkzeug-Icons (ISLAND_GLYPHEN, ${werkzeugAnzahl})</h2>
  <div class="raster">${werkzeugZellen}</div>
  <h2>Insel-Pillen (ISLAND_PILL_GLYPHEN, ${pillAnzahl})</h2>
  <div class="raster">${pillZellen}</div>
  <h2>Vis-Werkzeug-Icons (VIS_GLYPHEN, ${visAnzahl}, PA4)</h2>
  <div class="raster">${visZellen}</div>
  <h2>Publish-Werkzeug-Icons (PUBLISH_GLYPHEN, ${publishAnzahl}, PA4)</h2>
  <div class="raster">${publishZellen}</div>
  <h2>Prepare-Werkzeug-Icons (PREPARE_GLYPHEN, ${prepareAnzahl}, PA4)</h2>
  <div class="raster">${prepareZellen}</div>
</body>
</html>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1400, height: 100 } });
await page.setContent(html);
await page.screenshot({ path: OUT, fullPage: true });
await browser.close();

console.log(
  `Kontaktbogen geschrieben: ${OUT} (${werkzeugAnzahl} Werkzeug- + ${pillAnzahl} Pill-Icons design, ${visAnzahl} Vis, ${publishAnzahl} Publish, ${prepareAnzahl} Prepare)`,
);
