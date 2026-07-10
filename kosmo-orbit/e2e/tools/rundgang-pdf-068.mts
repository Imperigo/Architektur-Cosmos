/**
 * Rundgang-PDF «0.6.8» («Weisses Papier, Kosmos Auge, tiefe Hebel», 10.07.)
 * — Muster rundgang-pdf-067.mts, hier bewusst schlanker: alle Bilder liegen
 * schon auf der Platte (docs/rundgang/kritik-068/ vom weissen Stand,
 * docs/rundgang/kritik-067/paper-6 als Sand-Vorher für den Theme-Vergleich,
 * die neuen Dach-Goldens werden live aus den SVGs gerastert). HTML → PDF
 * über Chromiums print, Ablage abgabe/RUNDGANG-NOTIZEN-0.6.8.pdf.
 *
 * Aufruf (aus kosmo-orbit/): npx tsx e2e/tools/rundgang-pdf-068.mts
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname; // kosmo-orbit/
const K68 = `${ROOT}docs/rundgang/kritik-068/`;
const K67 = `${ROOT}docs/rundgang/kritik-067/`;
const GOLDEN = `${ROOT}packages/kosmo-kernel/test/golden/`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.6.8.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });

const WORK = join(tmpdir(), 'kosmo-rundgang-068');
mkdirSync(WORK, { recursive: true });

function brauche(pfad: string): void {
  if (!existsSync(pfad)) throw new Error(`Quelle fehlt: ${pfad}`);
}

// Kritik-Bilder einsammeln
const bilder = [
  '01-zentrale-weiss.png',
  '02-design-satteldach-3d-plan.png',
  '03-grundriss-dach-aufsicht.png',
  '04-kosmo-blick-chip.png',
  '05-kosmodata-tusche-platzhalter.png',
  '06-kosmodata-dossier-reich.png',
  '07-wissen-import.png',
];
for (const b of bilder) {
  brauche(K68 + b);
  copyFileSync(K68 + b, join(WORK, b));
}
brauche(K67 + 'paper-6-satteldach-3d.png');
copyFileSync(K67 + 'paper-6-satteldach-3d.png', join(WORK, 'vorher-sand.png'));

// Dach-Goldens rastern (cairosvg liegt im Container vor; ehrlicher Abbruch sonst)
for (const g of ['grundriss-walmdach-flach', 'schnitt-satteldach-querschnitt']) {
  brauche(`${GOLDEN}${g}.svg`);
  execSync(
    `python3 -c "import cairosvg; cairosvg.svg2png(url='${GOLDEN}${g}.svg', write_to='${join(WORK, g)}.png', output_width=1200)"`,
  );
}

function seite(titel: string, bild: string, notiz: string, extra = ''): string {
  return `<section class="seite">
    <h2>${titel}</h2>
    <img src="bilder/${bild}" />
    ${extra}
    <div class="notiz"><strong>Notiz</strong> ${notiz}</div>
  </section>`;
}

// Bilder in Unterordner, damit relative Pfade im HTML stimmen
mkdirSync(join(WORK, 'bilder'), { recursive: true });
for (const f of [...bilder, 'vorher-sand.png', 'grundriss-walmdach-flach.png', 'schnitt-satteldach-querschnitt.png']) {
  copyFileSync(join(WORK, f), join(WORK, 'bilder', f));
}

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
  @page { size: A4 landscape; margin: 14mm; }
  body { font-family: system-ui, sans-serif; color: #1a1815; }
  h1 { font-size: 26px; letter-spacing: 0.04em; }
  h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #c9c4b6; padding-bottom: 4px; }
  .seite { page-break-after: always; }
  img { max-width: 100%; max-height: 150mm; border: 1px solid #e4e0d6; display: block; margin: 6px auto; }
  .duo { display: flex; gap: 8px; } .duo div { flex: 1; } .duo img { max-height: 120mm; }
  .notiz { background: #f5f3ee; border-left: 3px solid #1a1815; padding: 8px 12px; font-size: 12.5px; margin-top: 8px; }
  .titelblatt p, li { font-size: 13px; line-height: 1.5; }
  .klein { font-size: 11px; color: #5c574d; }
</style></head><body>

<section class="seite titelblatt">
  <h1>KosmoOrbit v0.6.8 — Rundgang-Notizen</h1>
  <p><strong>«Weisses Papier, Kosmos Auge, tiefe Hebel»</strong> · 10.07.2026 · ROADMAP 292–301</p>
  <ul>
    <li><strong>Weisses Papier:</strong> Owner-Entscheid umgesetzt — Palette zurück auf Weiss, die Korn-Textur bleibt.</li>
    <li><strong>Dach im 2D-Plan &amp; Schnitt:</strong> die grösste Modell-Lücke (H-2/H-18) geschlossen — mit 4 neuen Golden-Plänen.</li>
    <li><strong>Kosmo sieht mit:</strong> Auto-Blick je Station (Bildpfad für Anthropic/Ollama/LM-Studio), Blick-Ringpuffer, Ereignis-Mitschnitt.</li>
    <li><strong>KosmoData sichtbar:</strong> ehrliche Tusche-Platzhalter statt toter Bild-Links, reiche Dossiers, Gedächtnis-Querverweise, Facetten.</li>
    <li><strong>Docling-Wissens-Ingest:</strong> Scan-Fund direkt eingebaut UND im Container real belegt (docling 2.111.0, echtes PDF konvertiert).</li>
    <li><strong>Design-Bedienschulden:</strong> Checks ohne Deckel + gruppiert, deckeZeichnen-Knopf, Schnitt mit Undo, Duplikat-Warnung, Segmentierer als Kommando.</li>
    <li><strong>Permanent verankert:</strong> AI-Scan-Delta ist jetzt Release-Schritt §0 mit Wächter-Skript — erster regulärer Lauf in diesem Release.</li>
  </ul>
  <p class="klein">Vollsuite 302 passed / 0 rot (28.8 min) · Unit 1403 · 12 H-Befunde behoben · Kritik-Runden 1+2</p>
</section>

<section class="seite">
  <h2>1 · Weisses Papier — Vorher (Sand, 02.–10.07.) / Nachher (Weiss)</h2>
  <div class="duo">
    <div><img src="bilder/vorher-sand.png"><p class="klein">Vorher: Sandton (Kritik-Shot 0.6.7)</p></div>
    <div><img src="bilder/01-zentrale-weiss.png"><p class="klein">Nachher: weisse Palette, Karten reinweiss</p></div>
  </div>
  <div class="notiz">Nur die FARBE wurde getauscht (Owner: «das Sandpapierige wieder mit Weiss ersetzen») — die feine feTurbulence-Korntextur liegt weiterhin über dem Grund und wirkt auf Weiss angemessen subtil. Tinte-Thema unverändert. tokens.ts-Spiegel testerzwungen nachgeführt.</div>
</section>

${seite(
  '2 · Dach im 2D — Satteldach in 3D und Plan, live',
  '02-design-satteldach-3d-plan.png',
  'Das Dach existierte bisher nur in 3D. Jetzt zeichnet derivePlan die Aufsicht (First/Traufe/Ortgang klassifiziert) im Dach-Geschoss — hier das Satteldach 38° im 3D|Plan-Split; die Statuszeile quittiert den Command ehrlich.',
)}

<section class="seite">
  <h2>3 · Dach als Werkplan — die neuen Golden-Pläne</h2>
  <div class="duo">
    <div><img src="bilder/grundriss-walmdach-flach.png"><p class="klein">Walmdach-Aufsicht (Grate konvergieren korrekt, Masse 800/600)</p></div>
    <div><img src="bilder/schnitt-satteldach-querschnitt.png"><p class="klein">Schnitt: Giebelprofil mit Schraffur, sauberer Wandanschluss</p></div>
  </div>
  <div class="notiz">4 neue Goldens, alle gegen die GeoSVG-RL-6-Kriterien-Rubrik (aus der Scan-Auswertung) sichtgeprüft; bestehende Goldens byte-identisch. Ehrlich offen: Sub-Promille-Spalt an der First-Spitze (zwei Prismen) — kosmetischer 0.6.9-Nachzug. Der Schnitt zeigt zudem die auf Wand∧Decke∧Dach verallgemeinerten Verschneidungsprioritäten (A1-Rest geschlossen).</div>
</section>

${seite(
  '4 · Kosmo sieht mit — der Auto-Blick (Owner-Nachtrag)',
  '04-kosmo-blick-chip.png',
  'Beim Senden erfasst die App den Stations-Blick (3D synchron nach dem Render, Plan/Schnitt/Nodes als SVG-Raster, Vis das fertige Renderbild) und zeigt ehrlich «Kosmo sieht: ‹KosmoDesign›» mit Miniatur. Default AN nur bei vision-fähigen Providern; der Kopf-Badge sagt jetzt ehrlich «Skript» statt eines fremden Modell-Labels (H-41, Kritik-Runde 2). Dazu: Blick-Ringpuffer über Stationswechsel + ereignisse_lesen für die letzten ~20 Kommandos.',
)}

${seite(
  '5 · KosmoData ehrlich ohne Netz — Tusche-Platzhalter',
  '05-kosmodata-tusche-platzhalter.png',
  '79 Karten hatten tote Wikimedia-Links. Jetzt: deterministisches Strichpiktogramm je Typologie (Hash aus der Referenz-Id) + «Bild nicht lokal — Quelle: …». Online lädt erst bei sichtbarer Karte, unter Tests nie (E2E-bewiesen: 0 externe Requests). Neu auch Facetten für Bauteilkatalog und Archiv.',
)}

${seite(
  '6 · Das reiche Dossier — der Datenbestand wird sichtbar',
  '06-kosmodata-dossier-reich.png',
  'Programm, Kontext, Einordnung, kapitelweiser Architektur-Text (110/112 Einträge), 3D-Modelle, Quellen, Datenbankprofil — bisher unsichtbar, jetzt aufklappbar gruppiert. Dazu Gedächtnis-/Wissens-Querverweise mit Tab-Sprung (ehrlich textbasiert; die echte refId-Kante ist als V2-Schritt notiert).',
)}

${seite(
  '7 · Wissens-Import per Docling — Scan-Fund real eingebaut',
  '07-wissen-import.png',
  'tools/docling-ingest wandelt PDFs lokal in Markdown-Notizen (dreistufig ehrlich: echt / klare Fehlermeldung ohne Installation / markierte Fixture). Der Echtlauf ist belegt: docling 2.111.0 im Container installiert, ein Test-PDF korrekt konvertiert (26 s). Der Wissen-Tab zeigt Importe mit Herkunftszeile. Damit ist der Owner-Auftrag «Scan-Einbezug permanent» doppelt erfüllt: als Release-Schritt §0 mit Wächter-Skript UND als erster direkt eingebauter Fund.',
)}

<section class="titelblatt">
  <h2>8 · Ehrliche Restliste (0.6.9)</h2>
  <ul>
    <li>Echter Cloud-/Ollama-Bildcall für den Kosmo-Blick (heute nur Payload-Struktur getestet — kein Schlüssel/Netz im Container); SVG-/Vis-Capture-Pfade end-to-end.</li>
    <li>Custom-Dropdowns (31 native-select-Verträge) · parametrische Fenster/Curtain-Wall (Konzept zuerst) · K2 Referenz-3D-Download + K9 Publish-Export.</li>
    <li>RAG-Anything über dem neuen Wissens-Import · Facetten für Wissen/Training · refId-Kante im Lernjournal.</li>
    <li>First-Spalt im Dach-Schnitt (kosmetisch) · Strichstärken-Differenzierung First/Traufe im Renderer · H-31 (Fake-Worker-Parallelität) · H-39 (Piktogramm-Varianz).</li>
    <li>Vorbestehend, heute nur diagnostiziert: der alte Workflow kosmo-orbit-ci.yml scheitert seit Tagen beim Start (0 Jobs) — auch auf dem 0.6.7-Release-Stand; Desktop- und Pages-CI sind davon unabhängig und grün. Aufräum-Kandidat.</li>
  </ul>
  <p class="klein">Erstellt automatisch aus dem 0.6.8-Stand · abgabe/RUNDGANG-NOTIZEN-0.6.8.pdf</p>
</section>

</body></html>`;

const htmlPfad = join(WORK, 'rundgang.html');
writeFileSync(htmlPfad, html);

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const page = await (await browser.newContext()).newPage();
await page.goto(`file://${htmlPfad}`);
await page.waitForTimeout(800);
await page.pdf({ path: OUT, format: 'A4', landscape: true, printBackground: true });
await browser.close();
console.log('Rundgang-PDF →', OUT);
