/**
 * Rundgang-PDF «0.6.1» (Owner-Auftrag 08.07.) — Teil 2: HTML → PDF.
 * Baut aus den Bildern von `rundgang.mts` ein Kommentier-Dokument: je
 * Station/Feature eine A4-Seite mit Screenshot, kurzem Beschrieb und einer
 * grossen linierten Notiz-Box zum Reinschreiben im PDF-Reader. Die Notizen
 * werden die Auftragsliste der 0.6.2-Runde.
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';

const DIR = new URL('../../docs/rundgang/', import.meta.url).pathname;
const OUT = new URL('../../abgabe/RUNDGANG-NOTIZEN-0.6.2.pdf', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });

interface Seite {
  bild: string;
  titel: string;
  neu?: boolean;
  text: string;
  /** Zusätzliche Bilder (kleiner, nebeneinander). */
  extra?: string[];
}

const SEITEN: Seite[] = [
  {
    bild: '01-zentrale.png',
    titel: 'Zentrale',
    text: 'Startpunkt mit allen Stationen, Projekt-Tresor, Varianten-Archiv und iPad-Kopplung. Von hier öffnest du jede Station; Kosmo begleitet überall.',
  },
  {
    bild: '02-design-3d.png',
    titel: 'KosmoDesign — 3D-Modell',
    text: 'BIM-Modell mit Wänden, Decken, Dach, Treppen, Zonen und Möbeln (TKB-Demo). Orbit mit Rechtsklick/Trackpad, Skizzieren direkt auf Flächen, Kontextmenü mit Rechtsklick.',
  },
  {
    bild: '03-design-werkplan.png',
    titel: 'KosmoDesign — Werkplan (2D)',
    text: 'Abgeleiteter Grundriss mit SIA-Schraffuren, Verschneidungs-Poché, Bemassung, Koten und Zeichenhilfen. Anwählen/Verschieben wie im CAD, Doppelklick setzt ab.',
  },
  {
    bild: '04-design-4er.png',
    titel: 'KosmoDesign — 4er-Splitscreen',
    text: 'Grundriss, Schnitt, Ansicht und 3D gleichzeitig — alles live aus demselben Modell abgeleitet, keine getrennten Zeichnungen.',
  },
  {
    bild: '05-sonnenstudie.png',
    titel: 'Sonnenstudie',
    text: 'Echte Sonnenstände am Projektstandort (Datum/Uhrzeit-Regler), Schattenwurf im 3D. Grundlage für den neuen Besonnungs-Kennwert der Volumenstudien.',
  },
  {
    bild: '06-kosmo-vorschlag.png',
    titel: 'Kosmo — Vorschlagskarten',
    text: 'Kosmo schlägt Modelländerungen als Diff-Karten vor; «Anwenden» läuft über denselben Command-Weg wie Handarbeit — ein Undo-Schritt, nichts passiert ungefragt.',
  },
  {
    bild: '19-studien-panel.png',
    titel: 'Volumenstudien — jetzt mit Geschosshöhen-Herkunft',
    neu: true,
    text: 'Zonenregel speist die Studie; NEU in 0.6.2: die Geschosshöhe ist wählbar und trägt ihre Herkunft (Wettbewerbsvorgabe / Architekt / SIA-Minimum / Standard) — dein S.8-Befund. Das Panel rückt jetzt sauber unter die Geschossleiste (Popup-Regel: kein Text verlässt den Block, keine Überlappung).',
  },
  {
    bild: '20-bericht.svg',
    titel: 'Grundlagenstudie-Bericht v2',
    neu: true,
    text: 'KOMPLETT NEU nach deiner Kritik: Erst das Urteil (Empfehlung mit Begründung aus gewichtetem Ranking), dann der Beweis (Situations-Diagramme mit Parzelle + Footprint, saubere Vergleichstabelle, Beurteilung je Typologie aus echten Zahlen), dann die Grenzen als getrennter Block. Dabei einen echten Rechenfehler gefixt («sprengt Höhe» war systematisch falsch).',
  },
  {
    bild: '21-unternehmerplan-pdf.png',
    titel: 'Unternehmerplan — One-Click-Upload',
    neu: true,
    text: 'Dein S.10-Befund umgesetzt: Datei einfach ins Fenster ziehen — Kosmo erledigt den Rest (DXF wird verglichen, PDF ehrlich erkannt). Die Erklär-Textblöcke sind weg bzw. hinter einem einklappbaren «?»; die Ehrlichkeits-Kernaussage bleibt als kurze Meldung.',
  },
  {
    bild: '07-vis-nodetree.png',
    titel: 'KosmoVis — Render-Nodetree',
    text: 'Szene → Stimmungen → Render als Node-Baum; Render-Jobs laufen über die HomeStation-Bridge (hier Fake-Worker). «Einfach»-Tab für den schnellen Weg.',
  },
  {
    bild: '08-publish-blatt.png',
    titel: 'KosmoPublish — Blätter & Sets',
    text: 'Pläne, Bilder und Legenden auf A1-Blättern layouten, Publikations-Sets für den Ein-Klick-Export (PDF/SVG), Revisionswolken und Transmittal.',
  },
  {
    bild: '09-data-referenzen.png',
    titel: 'KosmoData — Referenzen',
    neu: true,
    extra: ['10-data-bauteile.png'],
    text: 'Referenz-Kanon, CH-Bauteilkatalog, Wissen, Training, Gedächtnis unter einem Dach. NEU heute Nacht: dieselbe lernende Oberflächen-Adaption wie in KosmoDesign — häufig Genutztes bleibt präsent, Ungenutztes tritt zurück; Schalter und Reset direkt in der Leiste.',
  },
  {
    bild: '11-asset-materialien.png',
    titel: 'KosmoAsset — Materialien & Objekte',
    text: '3D-Objekte und PBR-Materialkarten mit Vorschau, Sammlungen und Verknüpfung zu Referenzen («Assets dieses Projekts»).',
  },
  {
    bild: '12-dev-auftragsbuch.png',
    titel: 'KosmoDev — Auftragsbuch',
    text: 'Deine Aufträge an die Software-Werkstatt: erfassen, priorisieren, als Workorder exportieren. Genau hier landen auch deine Notizen aus diesem PDF.',
  },
  {
    bild: '13-prepare.png',
    titel: 'KosmoPrepare / KosmoDoc / KosmoTrain',
    extra: ['14-doc.png', '15-train.png'],
    text: 'Wissens-Ingest (OneDrive-Lesen), Diagnose/Hilfe/Berichte und Kosmos Lernstand mit Kuration — die drei Stationen rund um Wissen und Lernen.',
  },
  {
    bild: '16-draw.png',
    titel: 'KosmoDraw — Modellbaum · Mengen · Ausmass',
    extra: ['17-sketch.png'],
    text: 'Mengen, Ausmass und Berechnungsliste aus dem Modell; daneben KosmoSketch fürs freie Zeichnen (Pencil → BIM).',
  },
  {
    bild: '22-deinstallieren.png',
    titel: 'App deinstallieren — neuer Menüpunkt',
    neu: true,
    text: 'Neu in der Kopfleiste: «Deinstallieren…» öffnet die ehrliche OS-Anleitung (die App kann sich nicht selbst deinstallieren) mit Link auf die Website — dort gibt es jetzt auch den Download-Bereich mit allen Editionen (live nach Merge auf main).',
  },
  {
    bild: '18-umbau-werkplan.png',
    titel: 'Umbau — Bestand / Abbruch / Neu',
    neu: true,
    text: 'Dein S.18-Befund umgesetzt: kein Diagonalkreuz mehr in der Abbruchwand, Bestand einheitlich grau über alle Schichten, und Umbau-Blätter drucken keine Raster-Achslinien mehr — SIA-sauber.',
  },
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const seiteHtml = (s: Seite) => `
<section class="seite">
  <header>
    <h2>${esc(s.titel)}${s.neu ? ' <span class="neu">NEU</span>' : ''}</h2>
  </header>
  <div class="bildzeile${s.extra ? ' mit-extra' : ''}">
    <img class="haupt" src="bilder/${s.bild}" alt="${esc(s.titel)}" />
    ${(s.extra ?? []).map((e) => `<img class="extra" src="bilder/${e}" alt="" />`).join('')}
  </div>
  <p class="beschrieb">${esc(s.text)}</p>
  <div class="notiz">
    <div class="notiz-label">✍️ Verbesserungen / Befunde:</div>
  </div>
</section>`;

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>KosmoOrbit 0.6.2 — Rundgang</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2b2924; }
  .seite { page-break-after: always; display: flex; flex-direction: column; height: 262mm; }
  h2 { font-size: 17pt; font-weight: 600; letter-spacing: 0.01em; border-bottom: 2px solid #2b2924; padding-bottom: 4px; margin-bottom: 10px; }
  .neu { display: inline-block; font-size: 9pt; font-weight: 700; color: #fff; background: #c96a1e; border-radius: 4px; padding: 2px 7px; vertical-align: 3px; margin-left: 6px; }
  .bildzeile { display: flex; gap: 6px; align-items: flex-start; }
  .bildzeile img.haupt { width: 100%; border: 1px solid #b9b2a4; border-radius: 4px; }
  .bildzeile.mit-extra img.haupt { width: 58%; }
  .bildzeile img.extra { width: 20%; flex: 1; border: 1px solid #b9b2a4; border-radius: 4px; }
  .beschrieb { font-size: 10.5pt; line-height: 1.5; margin: 9px 0 10px; color: #3d3a33; }
  .notiz { flex: 1; border: 1.5px solid #8a857a; border-radius: 8px; padding: 8px 12px;
    background: repeating-linear-gradient(to bottom, transparent 0, transparent 27px, #dcd6c8 27px, #dcd6c8 28px);
    background-origin: content-box; min-height: 60mm; }
  .notiz-label { font-size: 9.5pt; color: #8a857a; font-weight: 600; }
  .deckblatt { justify-content: center; align-items: flex-start; padding: 0 8mm; }
  .deckblatt h1 { font-size: 30pt; font-weight: 700; margin-bottom: 4mm; }
  .deckblatt .version { font-size: 13pt; color: #8a857a; margin-bottom: 12mm; }
  .deckblatt ol { font-size: 12pt; line-height: 1.9; padding-left: 6mm; margin-bottom: 10mm; }
  .deckblatt .kasten { border: 1.5px solid #2b2924; border-radius: 8px; padding: 6mm; font-size: 11pt; line-height: 1.6; }
  .deckblatt .kasten b { display: block; margin-bottom: 2mm; }
</style></head><body>

<section class="seite deckblatt">
  <h1>KosmoOrbit — Rundgang zum Kommentieren</h1>
  <div class="version">Stand 0.6.2 · 08.07.2026 · ${SEITEN.length} Stationen &amp; Funktionen</div>
  <ol>
    <li>PDF im Reader öffnen (Adobe Acrobat, Microsoft Edge, Vorschau …).</li>
    <li>Seite für Seite durchgehen — jede Seite zeigt eine Station oder Funktion.</li>
    <li>Mit dem Kommentar-/Textwerkzeug direkt in die linierte Box schreiben: was stört, was fehlt, was anders soll. Auch Handschrift/Stift geht.</li>
    <li>Das kommentierte PDF hier in den Chat zurückschicken.</li>
  </ol>
  <div class="kasten">
    <b>Was mit deinen Notizen passiert</b>
    Jede Notiz wird ein Auftrag im Auftragsbuch und fliesst in die gemeinsame
    <b style="display:inline">0.6.3-Runde</b> ein. Seiten mit «NEU» zeigen, was heute Nacht dazugekommen ist:
    Zonenregel-gespeiste Volumenstudien mit Besonnung/Programm-Erfüllung und Kosmo-Auslösung,
    der Grundlagenstudie-Bericht als SVG-Blatt, der ehrliche PDF-Pfad beim Unternehmerplan-Import
    und die lernende Oberfläche in KosmoData.
  </div>
</section>
${SEITEN.map(seiteHtml).join('\n')}
</body></html>`;

writeFileSync(`${DIR}RUNDGANG.html`, html);

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});
const page = await browser.newPage();
await page.goto(new URL('../../docs/rundgang/RUNDGANG.html', import.meta.url).href, { waitUntil: 'networkidle' });
await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="width:100%;text-align:center;font-size:8px;color:#8a857a;font-family:Menlo,monospace;">KosmoOrbit 0.6.2 — Rundgang &amp; Notizen · Seite <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: '12mm', bottom: '16mm', left: '13mm', right: '13mm' },
});
await browser.close();
console.log(`PDF: ${OUT}`);
