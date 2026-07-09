/**
 * Rundgang-PDF «0.6.4» (Owner-Auftrag 09.07.) — Teil 2: HTML → PDF.
 * Baut aus den Bildern von `rundgang.mts` ein Kommentier-Dokument: je
 * Station/Feature eine A4-Seite mit Screenshot, kurzem Beschrieb und einer
 * grossen linierten Notiz-Box zum Reinschreiben im PDF-Reader. Diese Runde
 * hat die 0.6.4-Testbefunde des Owners umgesetzt — die 12 Punkte stehen in
 * `apps/kosmo-orbit/src/shell/neuigkeiten.ts` (Version 0.6.4) und sind die
 * ehrliche Quelle für die Texte unten. Die Notizen zu DIESEM PDF werden die
 * Auftragsliste der 0.6.5-Runde.
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';

const DIR = new URL('../../docs/rundgang/', import.meta.url).pathname;
const OUT = new URL('../../abgabe/RUNDGANG-NOTIZEN-0.6.4.pdf', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });

interface Seite {
  bild: string;
  titel: string;
  neu?: boolean;
  text: string;
  /** Zusätzliche Bilder (kleiner, nebeneinander). */
  extra?: string[];
  /** Für Vergleichspaare (z.B. LOD nah/fern): beide Bilder gleich gross. */
  paar?: boolean;
}

const SEITEN: Seite[] = [
  {
    bild: '00-erste-start-frage.png',
    titel: 'Erster Start — «Neu hier?»',
    text: 'Aus 0.6.3, unverändert diese Runde: beim allerersten Start fragt Kosmo in der Zentrale, ob ein Rundgang gewünscht ist. «Nein» heisst nie wieder — die Frage lässt sich über das «?» in der Kopfleiste jederzeit erneut auslösen.',
  },
  {
    bild: '01-orbit-start.png',
    titel: 'Orbit-Startmenü — die Zentrale neu gedacht',
    neu: true,
    extra: ['01-orbit-faecher-design.png'],
    text: 'F3 umgesetzt (Owner-Befund wörtlich: «nicht Blöcke, eher wie das Kosmos-Zeichen rund»): die alten Kacheln sind weg. Nur die vier Hauptwerkzeuge (KosmoDesign, KosmoData, Kosmo, KosmoOffice «kommend») kreisen ganz langsam im Kreis um das Kosmos-Zeichen. Hover auf ein Hauptwerkzeug öffnet den Fächer mit den Untertools — Titel und Kurzbeschrieb, wie im rechten Extra-Bild (KosmoDesign: Draw/Prepare/Vis/Publish/Modellbaum). Die Rotation pausiert, sobald die Maus im Ring steht, damit das Ziel ihr nicht entflieht.',
  },
  {
    bild: '02-kosmo-symbol-mini.png',
    titel: 'Kosmo — Symbol statt Dauerchat',
    text: 'Aus 0.6.3, unverändert diese Runde: Kosmo bleibt ein schwebendes Symbol statt eines dauerhaft offenen Panels. Hover zeigt ein Mini-Popup mit der letzten Aktivität, ein Klick entfaltet bei Bedarf das grosse Panel.',
  },
  {
    bild: '03-einstellungen.png',
    titel: 'Einstellungs-Panel — Funktionen & Neues, System',
    neu: true,
    extra: ['03-einstellungen-neuigkeiten.png', '03-einstellungen-leistung.png'],
    text: 'Die 0.6.4-Punkte stehen jetzt zuoberst in «Funktionen & Neues» (mittleres Extra-Bild). F2 umgesetzt («eine Funktion, ein Ort»): «App deinstallieren…» zog aus der Kopfleiste in die neue Sektion «System» (siehe Seite 28) und die Farbpalette (Akzent-Punkte) lebt jetzt ausschliesslich in der Sektion «Darstellung» oben im Hauptbild — beide Kopfleisten-Reste sind entfernt. Die Leistungs-Sektion (rechtes Extra-Bild) bleibt unverändert.',
  },
  {
    bild: '04-kurztasten-uebersicht.png',
    titel: 'Werkzeug-Kurztasten + «?»-Übersicht',
    neu: true,
    text: 'F5/F9 umgesetzt (Owner-Befund wörtlich: «eine Tastenkombination … um mich intuitiv bewegen zu können wie ArchiCAD»): «?» blendet die Kurzbefehl-Übersicht ein, der neue Abschnitt «Zeichnen» zeigt die ArchiCAD-angelehnten Werkzeug-Kurztasten (A Auswahl, W Wand, Z Zone, V Volumen, D Dach, T Treppe, C Stütze, S Schnitt, F Freihand-Skizze) plus «Leertaste halten + ziehen» fürs Verschieben (Pan) im 2D-Plan. Die Kurztasten wirken nie, solange ein Eingabefeld den Fokus hat.',
  },
  {
    bild: '05-design-uebersicht.png',
    titel: 'KosmoDesign — Entwurfs-Dock, Fähigkeiten, Statusleiste',
    extra: ['05-design-4er.png'],
    text: 'Aus 0.6.3, unverändert diese Runde: links das Entwurfs-Dock (Sprechen · Skizzieren · CAD, dazu Sprünge zu Draw/Vis/Publish/Prepare), oben die Fähigkeits-Icons, unten die Zero-Click-Statusleiste. Der 4er-Splitscreen (Extra-Bild) bleibt unverändert nutzbar.',
  },
  {
    bild: '06-mass-eingabe.png',
    titel: 'Masszahl am Cursor — «Zahlen zur Hand»',
    neu: true,
    text: 'F5 umgesetzt: beim Zeichnen läuft eine Live-Masszahl am Cursor mit (hier «3.5 m ⏎» nach dem Tippen von «3.5»); Enter setzt den nächsten Punkt exakt in dieser Länge, ohne erneutes Raster-Snapping — die Zahl ist die Absicht. Ehrlicher Hinweis: das Fadenkreuz im Bild ist hier tatsächlich sichtbar (Chromium zeichnet den CSS-Cursor in dieser Aufnahme mit); die weiteren kontextabhängigen Cursor-Formen aus demselben 0.6.4-Punkt (Zeiger über Bauteilen, Verschieben-Cursor über Gewähltem, Greifhand beim Pan) zeigt kein Bild in diesem Rundgang — sie sind nur im laufenden Betrieb zu sehen.',
  },
  {
    bild: '07-element-fang.png',
    titel: 'Element-Fang — Fangpunkt-Marker beim Zeichnen',
    neu: true,
    text: 'F4 umgesetzt (Owner-Befund wörtlich: «die Maus muss auf die anderen Wände oder Elemente snappen können … ein sichtbarer Punkt, der beim Hovern anzeigt, wo es snappen wird»): das Quadrat am Wandende ist der Fangpunkt-Marker (Typ «endpunkt»), er erscheint erst innerhalb des Fangradius und zieht den nächsten Klick exakt auf die Bauteilgeometrie statt aufs 250er-Raster. Ausserhalb des Radius bleibt der Marker weg — der Fang drängt sich nicht auf.',
  },
  {
    bild: '08-plan-lod-voll.png',
    titel: 'Plan-LOD — Detailstufe aus der Distanz',
    extra: ['08-plan-lod-fern.png'],
    paar: true,
    text: 'Aus 0.6.3, unverändert diese Runde: nah dran (links) zeigt Bemassung, Raster und Möbel; weit weg (rechts) bleiben nur Poché und Fenstersymbole. Reine Anzeige-Umschaltung, der Plansatz-Export bleibt unverändert.',
  },
  {
    bild: '09-skizzieren-annaeherungen.png',
    titel: 'Skizzieren — drei Annäherungen',
    text: 'Aus 0.6.3, unverändert diese Runde: ein Freihand-Strich im Skizzieren-Modus ergibt am Übergabe-Moment drei Karten (u.a. eine orthogonalisierte Variante), als EIN atomarer Undo-Schritt.',
  },
  {
    bild: '10-kosmo-vorschlag-vorschau.png',
    titel: 'Kosmo-Vorschlagskarte — mit Vorschau',
    text: 'Aus 0.6.3, unverändert diese Runde: die Diff-Karte zeigt einen Vorher/Nachher-Mini-Grundriss statt nur Text — ehrlich nur dort, wo die Vorschau tatsächlich berechenbar ist.',
  },
  {
    bild: '11-phasen-preset-banner.png',
    titel: 'Phasen-Presets — Angebot, nie stumm',
    text: 'Aus 0.6.3, unverändert diese Runde: wechselt die SIA-Teilphase, bietet Kosmo passende Fähigkeits-Icons als Fokus an. «Nicht jetzt» lässt alles unverändert.',
  },
  {
    bild: '12-kv-panel.png',
    titel: 'KV-Grobschätzung',
    text: 'Aus 0.6.3, unverändert diese Runde: Richtwert-Kostenvoranschlag auf GF-Basis mit stets sichtbarem Ehrlichkeits-Hinweis («kein Devis, keine NPK-Positionen»).',
  },
  {
    bild: '13-bauablauf-panel.png',
    titel: 'Bauablaufplan',
    text: 'Aus 0.6.3, unverändert diese Runde: abgeleiteter Grob-Terminplan mit fester Gewerke-Reihenfolge, Export als druckfähiges SVG-Blatt. Hinweis «ersetzt keine Bauleitung» steht permanent im Panel.',
  },
  {
    bild: '14-maengel-panel.png',
    titel: 'Mängel & Abnahme',
    text: 'Aus 0.6.3, unverändert diese Runde: Mängel erfassen, Status umschalten, Abnahmeprotokoll als SVG exportieren — kein rechtsgültiges SIA-118-Protokoll.',
  },
  {
    bild: '15-baugesuch.png',
    titel: 'Baugesuch-Blattsatz',
    text: 'Aus 0.6.3, unverändert diese Runde: ein Klick erzeugt mehrere Blätter plus ein Set «Baugesuch». Fehlende Grundlagen werden als ehrliche Lücken-Meldung benannt statt eines stillen Teilerfolgs.',
  },
  {
    bild: '16-blatt-fuellen.png',
    titel: 'Blatt füllen',
    text: 'Aus 0.6.3, unverändert diese Runde: platziert Grundriss, Axonometrie, Kennzahlen-Textblock und Render-Platzhalter atomar und meldet ehrlich, was im Modell fehlt.',
  },
  {
    bild: '17-vis-automatik.png',
    titel: 'KosmoVis — Automatik + Auto-Fit (behoben)',
    neu: true,
    text: 'Auto-Kamera und Cycles-Presets aus 0.6.3 bleiben unverändert. NEU in 0.6.4: der Absturz beim Verschieben des Node-Trees ist behoben, und der Node-Graph passt sich beim Öffnen jetzt automatisch ins Bild ein (Auto-Fit) — vorher musste von Hand gezoomt werden, um die Nodes überhaupt zu sehen.',
  },
  {
    bild: '18-material-wuerfel.png',
    titel: 'Materialbibliothek — Würfel-Vorschau',
    text: 'Aus 0.6.3, unverändert diese Runde: jedes Material zeigt einen 3D-Würfel (echte Canvas-Vorschau), echte Dimensionen und eine Pflicht-Quelle.',
  },
  {
    bild: '19-data-referenzen.png',
    titel: 'KosmoData — ehrlicher Offline-Badge',
    neu: true,
    extra: ['19-data-bauteile.png'],
    text: 'Referenz-Kanon, CH-Bauteilkatalog, Wissen, Training und Gedächtnis bleiben unverändert unter einem Dach (rechtes Extra-Bild: Bauteile). NEU in 0.6.4: der Badge oben links sagt jetzt ehrlich «Offline — eingebaute Referenzdaten (Stand vom Build)» statt des vagen «Offline-Seed» — die Kataloge sind auch offline vollständig da, und ein Ladefehler bekäme einen «Erneut versuchen»-Knopf.',
  },
  {
    bild: '20-dev-auftragsbuch.png',
    titel: 'KosmoDev — Auftragsbuch',
    text: 'Deine Aufträge an die Software-Werkstatt: erfassen, priorisieren, als Workorder exportieren. Genau hier landen auch deine Notizen aus diesem PDF — unverändert diese Runde.',
  },
  {
    bild: '21-prepare.png',
    titel: 'KosmoPrepare / KosmoDoc / KosmoTrain',
    extra: ['21-doc.png', '21-train.png'],
    text: 'Wissens-Ingest, Diagnose/Hilfe/Berichte und Kosmos Lernstand mit Kuration — unverändert diese Runde. Der neue vierte Doc-Tab «Tech-Radar» hat eine eigene Seite (nächste Seite).',
  },
  {
    bild: '21-doc-tech-radar.png',
    titel: 'KosmoDoc — Tech-Radar (neu)',
    neu: true,
    text: 'Neuer vierter Tab in KosmoDoc: worauf die Software technisch steht (Adopt/Selbst/Reject je Baustein) und was noch beobachtet wird, in einer kuratierten Liste (mind. 20 Posten). Einträge aus dem Notion-Scan sind ehrlich mit ⚠ markiert, weil noch nicht selbst verifiziert (z.B. «Gemini Omni Flash») — verifizierter Bestand (z.B. camera-controls) trägt kein Warnzeichen.',
  },
  {
    bild: '22-draw.png',
    titel: 'KosmoDraw — Modellbaum · Mengen · Ausmass',
    extra: ['22-sketch.png'],
    text: 'Mengen, Ausmass und Berechnungsliste aus dem Modell; daneben KosmoSketch fürs freie Zeichnen (Extra-Bild). Der 0.6.4-Fix «3D-Skizzieren funktioniert wieder zuverlässig» betrifft genau KosmoSketch: die Rundgang-Karte verdeckte früher den «Übergeben»-Knopf, sie sitzt jetzt daneben.',
  },
  {
    bild: '23-umbau-werkplan.png',
    titel: 'Umbau — Bestand / Abbruch / Neu',
    text: 'Bestand einheitlich grau, kein Diagonalkreuz, SIA-saubere Umbau-Blätter — aus 0.6.2, unverändert diese Runde.',
  },
  {
    bild: '24-studien-panel.png',
    titel: 'Volumenstudien — Zonenregel-gespeist',
    text: 'Zonenregel speist die Studie, Geschosshöhe mit Herkunft, Besonnungs-Richtwert und Raumprogramm-Erfüllung je Extremvariante — aus 0.6.1/0.6.2, unverändert diese Runde.',
  },
  {
    bild: '25-bericht.svg',
    titel: 'Grundlagenstudie-Bericht',
    text: 'Empfehlung mit Begründung zuerst, dann die Vergleichstabelle mit echten Zahlen, dann die Grenzen der Studie als eigener Block — aus 0.6.2, unverändert diese Runde.',
  },
  {
    bild: '26-unternehmerplan-pdf.png',
    titel: 'Unternehmerplan — ehrlicher PDF-Pfad',
    text: 'Datei ins Fenster ziehen genügt; ein hochgeladenes PDF wird ehrlich erkannt statt in den DXF-Import zu laufen — aus 0.6.1/0.6.2, unverändert diese Runde.',
  },
  {
    bild: '27-claude-modell.png',
    titel: 'Claude-Modellwahl',
    neu: true,
    text: 'F1 umgesetzt (Owner-Befund wörtlich: «Modell auswählbar machen von Claude»): im Kosmo-Panel (Zahnrad → Betriebsart Cloud) steht jetzt ein Modell-Select mit den aktuellen Claude-Modellen (Opus 4.8 als Owner-Default, Sonnet, Haiku) plus Freitext-Override für eigene Modell-IDs — die Wahl übersteht einen Reload. Fehlt die Anthropic-CLI für die Abo-Anmeldung, erklärt ein bleibender Hinweis Installation und den API-Schlüssel-Weg als Alternative.',
  },
  {
    bild: '28-deinstallieren.png',
    titel: 'App deinstallieren — jetzt nur in den Einstellungen',
    neu: true,
    text: 'F2 umgesetzt («Entdoppelung», eine Funktion = ein Ort): der Einstieg wohnt nur noch in den Einstellungen (Sektion «System», siehe Seite 03) — der frühere Kopfleisten-Knopf ist komplett entfernt. Der Dialog selbst bleibt ehrlich: KosmoOrbit kann sich als Tauri-App nicht selbst deinstallieren, das Panel zeigt die OS-Kurzanleitung (Windows/macOS/Linux) und den Link auf die Website.',
  },
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const seiteHtml = (s: Seite) => `
<section class="seite">
  <header>
    <h2>${esc(s.titel)}${s.neu ? ' <span class="neu">NEU</span>' : ''}</h2>
  </header>
  <div class="bildzeile${s.extra ? ' mit-extra' : ''}${s.paar ? ' paar' : ''}">
    <img class="haupt" src="bilder/${s.bild}" alt="${esc(s.titel)}" />
    ${(s.extra ?? []).map((e) => `<img class="extra" src="bilder/${e}" alt="" />`).join('')}
  </div>
  <p class="beschrieb">${esc(s.text)}</p>
  <div class="notiz">
    <div class="notiz-label">✍️ Verbesserungen / Befunde:</div>
  </div>
</section>`;

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>KosmoOrbit 0.6.4 — Rundgang</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2b2924; }
  .seite { page-break-after: always; display: flex; flex-direction: column; height: 262mm; }
  h2 { font-size: 17pt; font-weight: 600; letter-spacing: 0.01em; border-bottom: 2px solid #2b2924; padding-bottom: 4px; margin-bottom: 10px; }
  .neu { display: inline-block; font-size: 9pt; font-weight: 700; color: #fff; background: #c96a1e; border-radius: 4px; padding: 2px 7px; vertical-align: 3px; margin-left: 6px; }
  .bildzeile { display: flex; gap: 6px; align-items: flex-start; }
  .bildzeile img.haupt { width: 100%; border: 1px solid #b9b2a4; border-radius: 4px; }
  .bildzeile.mit-extra img.haupt { width: 58%; }
  .bildzeile.mit-extra img.extra { width: 20%; flex: 1; border: 1px solid #b9b2a4; border-radius: 4px; }
  .bildzeile.paar img.haupt { width: 49%; }
  .bildzeile.paar img.extra { width: 49%; flex: none; border: 1px solid #b9b2a4; border-radius: 4px; }
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
  <div class="version">Stand 0.6.4 · 09.07.2026 · ${SEITEN.length} Stationen &amp; Funktionen</div>
  <ol>
    <li>PDF im Reader öffnen (Adobe Acrobat, Microsoft Edge, Vorschau …).</li>
    <li>Seite für Seite durchgehen — jede Seite zeigt eine Station oder Funktion.</li>
    <li>Mit dem Kommentar-/Textwerkzeug direkt in die linierte Box schreiben: was stört, was fehlt, was anders soll. Auch Handschrift/Stift geht.</li>
    <li>Das kommentierte PDF hier in den Chat zurückschicken.</li>
  </ol>
  <div class="kasten">
    <b>Was mit deinen Notizen passiert</b>
    Diese Runde hat dein kommentiertes 0.6.3-PDF umgesetzt — die 12 Testbefunde
    aus deinem letzten Rundgang (F1–F9 und die Notion-Restpunkte, siehe
    <code>neuigkeiten.ts</code> Version 0.6.4): neues Orbit-Startmenü,
    Element-Fang und Masszahl-am-Cursor beim Zeichnen, Werkzeug-Kurztasten
    mit «?»-Übersicht, kontextabhängiger Cursor, KosmoVis-Auto-Fit,
    ehrlicher Offline-Badge in KosmoData, wählbares Claude-Modell,
    Tech-Radar in KosmoDoc, und Deinstallieren/Farbpalette ausschliesslich
    in den Einstellungen. Seiten mit «NEU» zeigen, was seit dem letzten PDF
    dazugekommen ist. Deine Notizen zu <b style="display:inline">diesem</b>
    PDF werden die <b style="display:inline">0.6.5-Auftragsliste</b>.
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
    '<div style="width:100%;text-align:center;font-size:8px;color:#8a857a;font-family:Menlo,monospace;">KosmoOrbit 0.6.4 — Rundgang &amp; Notizen · Seite <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: '12mm', bottom: '16mm', left: '13mm', right: '13mm' },
});
await browser.close();
console.log(`PDF: ${OUT}`);
