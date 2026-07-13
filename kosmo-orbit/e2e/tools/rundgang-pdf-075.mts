/**
 * Rundgang-PDF «0.7.5 — Owner-Kommentier-Rundgang» — Muster strikt
 * `rundgang-pdf-074.mts` (HTML → PDF über Chromiums print, Ablage
 * abgabe/RUNDGANG-NOTIZEN-0.7.5.pdf). Belegt die drei 0.7.5-Owner-Punkte:
 *
 *  A1 Beschlag-Katalog S2 (Öffnung → Beschlag-Mehrfachauswahl, Werkplan-
 *     Piktogramme, DXF-Text auf Layer BESCHLAG, IFCDISCRETEACCESSORY)
 *  A2 Projekt-Stammdaten (Bauherr/Adresse/Parzellennr/Verfasser,
 *     geguardeter Plankopf)
 *  A3 Lato-400 im PDF (schliesst die 0.7.4-Lücke: Plankopf-Untertitel/
 *     Nordpfeil-«N» jetzt Lato statt Helvetica)
 *
 * Bilder aus `docs/rundgang/kritik-075/` (frische Shots + gerasterte
 * Goldens, `kritik-shots-075.mts`) und `docs/rundgang/` (D4-Font-Stichprobe,
 * bereits vorhanden aus 0.7.4/0.7.5-Vorarbeit).
 *
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/rundgang-pdf-075.mts
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const R = `${ROOT}docs/rundgang/kritik-075/`;
const D = `${ROOT}docs/rundgang/`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.7.5.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });

const WORK = join(tmpdir(), 'kosmo-rundgang-075');
mkdirSync(join(WORK, 'bilder'), { recursive: true });

/** Kopiert eine Quelle in den Arbeitsordner und liefert den Bild-Dateinamen. */
function bild(dir: string, name: string): string {
  const pfad = dir + name;
  if (!existsSync(pfad)) throw new Error(`Quelle fehlt: ${pfad}`);
  copyFileSync(pfad, join(WORK, 'bilder', name));
  return name;
}

/** UI-Screenshot (oben) + gerastertes Golden-SVG (unten) auf einer Seite. */
function screenshotUndGolden(
  titel: string,
  screenshot: string,
  screenshotCap: string,
  golden: string,
  goldenCap: string,
  notiz: string,
  layout: 'stapel' | 'nebeneinander' = 'stapel',
): string {
  const inhalt =
    layout === 'stapel'
      ? `<div class="stapel">
      <div><span class="tag tag-ui">UI-BELEG</span><img class="s-screenshot" src="bilder/${screenshot}"><p class="klein">${screenshotCap}</p></div>
      <div><span class="tag tag-golden">GOLDEN-BELEG</span><img class="s-golden" src="bilder/${golden}"><p class="klein">${goldenCap}</p></div>
    </div>`
      : `<div class="nebeneinander">
      <div class="spalte-schmal"><span class="tag tag-ui">UI-BELEG</span><img class="s-screenshot-hoch" src="bilder/${screenshot}"><p class="klein">${screenshotCap}</p></div>
      <div class="spalte-breit"><span class="tag tag-golden">GOLDEN-BELEG</span><img class="s-golden-breit" src="bilder/${golden}"><p class="klein">${goldenCap}</p></div>
    </div>`;
  return `<section class="seite">
    <h2>${titel}</h2>
    ${inhalt}
    <div class="notiz"><strong>Notiz</strong> ${notiz}</div>
  </section>`;
}

function seite(titel: string, b: string, notiz: string, bildKlasse = ''): string {
  return `<section class="seite">
    <h2>${titel}</h2>
    <img class="${bildKlasse}" src="bilder/${b}" />
    <div class="notiz"><strong>Notiz</strong> ${notiz}</div>
  </section>`;
}

// --- Bilder registrieren -----------------------------------------------------
const a1Ui = bild(R, 'a1-beschlag-s2-inspector.png');
const a1Golden = bild(R, 'a1-golden-werkplan-beschlag-s2.png');
const a2Ui = bild(R, 'a2-stammdaten-panel.png');
const a2Golden = bild(R, 'a2-golden-plankopf-stammdaten.png');
const a3Beleg = bild(D, 'd4-pdffonts-stichprobe-1.png');

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: system-ui, sans-serif; color: #1a1815; }
  h1 { font-size: 25px; letter-spacing: 0.04em; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #c9c4b6; padding-bottom: 4px; }
  .seite { page-break-after: always; }
  img { max-width: 100%; border: 1px solid #e4e0d6; display: block; margin: 4px auto; }
  .stapel { display: flex; flex-direction: column; gap: 8px; align-items: center; margin-top: 6px; }
  .stapel > div { text-align: center; width: 100%; }
  .s-screenshot { max-height: 78mm; object-fit: contain; }
  .s-golden { max-height: 60mm; object-fit: contain; }
  .nebeneinander { display: flex; gap: 14px; align-items: flex-start; margin-top: 8px; }
  .spalte-schmal { flex: 0 0 34%; text-align: center; }
  .spalte-breit { flex: 1; text-align: center; }
  .s-screenshot-hoch { max-height: 118mm; object-fit: contain; }
  .s-golden-breit { max-width: 100%; max-height: 90mm; object-fit: contain; }
  .tag { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; padding: 1px 6px; border-radius: 3px; }
  .tag-ui { background: #0f766e; color: #fff; } .tag-golden { background: #8a6d1a; color: #fff; }
  .notiz { background: #f5f3ee; border-left: 3px solid #1a1815; padding: 7px 11px; font-size: 12px; margin-top: 7px; }
  .titelblatt p, li { font-size: 12.5px; line-height: 1.5; }
  .klein { font-size: 10.5px; color: #5c574d; margin: 2px 0; }
  .zahlen { display: flex; gap: 10px; margin: 8px 0; }
  .zahl { flex: 1; background: #f5f3ee; border: 1px solid #e4e0d6; border-radius: 5px; padding: 8px; text-align: center; }
  .zahl b { display: block; font-size: 20px; } .zahl span { font-size: 10.5px; color: #5c574d; }
  .crop-a3 { width: 150mm; height: 52mm; overflow: hidden; border: 1px solid #e4e0d6; margin: 6px auto; }
  .crop-a3 img { width: 297mm; max-width: none; border: none; margin: 0; }
  .fontliste { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; background: #1a1815; color: #f5f3ee; padding: 10px 14px; border-radius: 5px; white-space: pre; margin-top: 8px; }
</style></head><body>

<section class="seite titelblatt">
  <h1>KosmoOrbit v0.7.5 — Rundgang-Notizen (Owner-Kommentier-Rundgang)</h1>
  <p><strong>Voller Kern A1+A2+A3; die ClaudeDesign-Gestaltungsrunde macht der Owner selbst.</strong> · 12.07.2026</p>
  <div class="zahlen">
    <div class="zahl"><b>788 / 788</b><span>Kernel-Tests grün</span></div>
    <div class="zahl"><b>849 / 849</b><span>App-Tests grün</span></div>
    <div class="zahl"><b>30 / 0</b><span>svg-qa Goldens / harte Fehler</span></div>
  </div>
  <ul>
    <li><strong>A1</strong> Beschlag-Katalog S2 — Beschläge lassen sich jetzt konkreten Öffnungen zuweisen (Mehrfachauswahl im Inspector, Werkplan-Piktogramme, DXF-Text auf Layer BESCHLAG, IFC-Export).</li>
    <li><strong>A2</strong> Projekt-Stammdaten — Bauherr/Adresse/Parzellennr/Verfasser im Projekt-Menü, erscheinen geguardet im Plankopf (nur wenn gesetzt).</li>
    <li><strong>A3</strong> Lato-400 im PDF — schliesst die in 0.7.4 ehrlich benannte Lücke: Plankopf-Untertitel und Nordpfeil-«N» fallen im PDF-Export nicht mehr auf Helvetica zurück.</li>
    <li><strong>Ehrlich offen:</strong> Stammdaten sind persistent (Undo/Vault/.kosmo), aber noch nicht live-kollaborativ über <code>@kosmo/sync</code> gesynct · Beschläge sind opening-gehostet (kein eigenes Entity, S3-Weg optional) · DXF zeigt Beschläge als Text, nicht als Piktogramm.</li>
  </ul>
  <p class="klein">Modell-Ökonomie ehrlich: Fable war diesen Zyklus weiterhin gesperrt (Monats-Spend-Limit) — golden-kritische Ausführung A1/A2 auf Sonnet-Subagenten, A3 + Finale vom Opus-Leiter selbst; Golden-Wechsel je vorab geschriebener Erwartung maschinell verifiziert.</p>
</section>

${screenshotUndGolden(
  '1 · A1 — Beschlag-Katalog S2: Beschläge an Öffnungen zuweisen',
  a1Ui,
  'Inspector an einer angewählten Tür: Beschlag-Katalog als Mehrfachauswahl, gruppiert nach Kategorie (Tür/Fenster/Sicherheit) — testids `beschlag-s2-<key>`. Drei Typen angewählt (Türdrücker, Türband/Scharnier, Einsteckschloss).',
  a1Golden,
  'Golden `werkplan-beschlag-s2.svg` gerastert (Südwand-Ausschnitt): dieselbe Tür im Werkplan — Piktogramme + Katalogtext unterhalb der Bemassung.',
  'Neues Feld <code>Opening.beschlaege?: string[]</code> — bewusst OPENING-GEHOSTET statt eigener Entity (ein Array-Feld bleibt golden-/undo-/vault-/.kosmo-sicher ohne neue Entity-Klasse); eine eigene Beschlag-Entity bleibt ein optionaler S3-Weg. Neuer Command <code>design.beschlaegeSetzen</code>, erscheint als Werkplan-Piktogramm (aus <code>beschlagSymbol()</code>), als <strong>Text</strong> auf dem DXF-Layer BESCHLAG (kein Piktogramm im DXF-Export — ehrliche Einschränkung) und als <code>IFCDISCRETEACCESSORY</code> je zugewiesenem Beschlag. Kein Bestands-Golden verändert (28 unverändert + 1 neu).',
  'nebeneinander',
)}

${screenshotUndGolden(
  '2 · A2 — Projekt-Stammdaten: Bauherr/Adresse/Parzellennr/Verfasser',
  a2Ui,
  'StammdatenPanel im Projekt-Menü: Projektname + Bauherr/Adresse/Parzelle Nr./Verfasser, Blur-Commit — testids `stammdaten-<feld>`.',
  a2Golden,
  'Golden `plankopf-stammdaten.svg` gerastert (volle Plankopf-Zeile): dieselben Werte erscheinen als neue Bauherr-/Verfasser-Zeile unter Titel/Massstab/Datum.',
  'Die neue Zeile erscheint im Plankopf NUR wenn Stammdaten gesetzt sind (Golden-Guard) — ohne <code>projekt</code>-Daten bleibt die Ausgabe byte-identisch zu vor A2 (0 geänderte Bestands-Goldens). <strong>Ehrlich offen:</strong> <code>DocSettings</code> läuft wie jede Doc-Änderung über Undo/Vault(IndexedDB)/<code>.kosmo</code>-Export — ABER <code>@kosmo/sync</code>s <code>SyncClient</code> synct heute nur <code>entities</code> live, keine SettingsPatches. Stammdaten sind also persistent, aber NICHT live-kollaborativ zwischen offenen Sitzungen. Vertagte Folgearbeit an <code>@kosmo/sync</code>, kein Bug dieser Runde.',
)}

<section class="seite">
  <h2>3 · A3 — Lato-400 im PDF: die 0.7.4-Lücke geschlossen</h2>
  <p class="klein">0.7.4 hatte ehrlich benannt: <code>public/fonts/pdf/</code> lieferte nur Lato 900 (Black) als PDF-TTF — die Plankopf-Regular-Nebenzeile (Untertitel/Nordpfeil) fiel im produktionsechten PDF-Export auf Helvetica-Ersatz zurück. Neu: <code>lato-400-latin-pdf.ttf</code> als vierter <code>PDF_FONTS</code>-Eintrag registriert.</p>
  <div class="crop-a3"><img src="bilder/${a3Beleg}"></div>
  <p class="klein" style="text-align:center">Ausschnitt <code>docs/rundgang/d4-pdffonts-stichprobe.mjs</code> → Stichproben-PDF (Chromium-fernes jsPDF, dieselbe VFS-Einbettung wie <code>export-plan.ts</code>/<code>export-sheets.ts</code>), Titel Lato 900/bold, Nebenzeile Lato 400/normal — via <code>pdftoppm</code> gerastert.</p>
  <p><strong>Textbeleg <code>pdffonts</code> (4 eingebettete TTF, alle <code>emb=yes</code>):</strong></p>
  <div class="fontliste">Lato             CID TrueType  Identity-H  emb=yes  (900/bold ← lato-900-latin-pdf.ttf)
Lato             CID TrueType  Identity-H  emb=yes  (400/normal ← lato-400-latin-pdf.ttf)  NEU
IBM Plex Mono    CID TrueType  Identity-H  emb=yes  (400/normal)
IBM Plex Mono    CID TrueType  Identity-H  emb=yes  (600/bold)</div>
  <div class="notiz"><strong>Notiz</strong> Schliesst die 0.7.4-Lücke: Plankopf-Untertitel + Nordpfeil-«N» (SCHRIFT_TITEL ohne font-weight) sind im PDF-Export jetzt Lato statt Helvetica. Golden-neutral — nur die App-Export-Schicht betroffen (<code>export-plan.ts</code>/<code>export-sheets.ts</code>), kein <code>derive/</code>-Pfad, kein Golden-SVG berührt.</div>
</section>

<section class="seite titelblatt">
  <h2>Gate-Zahlen &amp; ehrliche offene Liste</h2>
  <div class="zahlen">
    <div class="zahl"><b>788/788</b><span>Kernel-Tests (37 Testdateien)</span></div>
    <div class="zahl"><b>849/849</b><span>App-Tests (65 Testdateien)</span></div>
    <div class="zahl"><b>30 / 0</b><span>svg-qa Goldens / harte Fehler</span></div>
  </div>
  <p class="klein">Weitere Gates grün: Typecheck alle Workspaces · <code>npm run release-gate</code> (typecheck→test→svg-qa→secret-scan) · svg-qa-Warnung unverändert die vorbestehende <code>abnahmeprotokoll.svg</code> (kein neuer Fehler).</p>
  <ul>
    <li><strong>Stammdaten-Live-Sync vertagt:</strong> <code>@kosmo/sync</code>s <code>SyncClient</code> synct heute nur <code>entities</code>, keine SettingsPatches — Stammdaten sind persistent (Undo/Vault/.kosmo), aber nicht live-kollaborativ zwischen offenen Sitzungen. Folgearbeit an <code>@kosmo/sync</code>.</li>
    <li><strong>Freie Beschlag-Instanzen (eigene Entity wie Furniture):</strong> S2 ist bewusst opening-gehostet (<code>Opening.beschlaege?: string[]</code>) — eine eigene, frei platzierbare Beschlag-Entity bleibt ein optionaler S3-Weg.</li>
    <li><strong>DXF-Beschlag als Text:</strong> der DXF-Export zeichnet Beschläge als Text auf Layer BESCHLAG, nicht als Piktogramm — die Piktogramme gibt es nur im Werkplan-SVG/PDF-Pfad.</li>
  </ul>
  <p class="klein"><strong>Teil B (ClaudeDesign-Gestaltungsrunde) liegt beim Owner:</strong> <code>docs/V075-VORSCHLAG.md</code> nennt als Design-Ausblick u.a. 3D-Viewport-Chrome (der Raum «erbt heute nur die Stimmung») und eine eigene Vis-Kuratierfläche (funktional gebaut, ohne eigene Gestaltung) — dieser Rundgang liefert bewusst nur den Funktionskern A1+A2+A3, die nächste Gestaltungsrunde entscheidet der Owner selbst.</p>
  <p class="klein">Erstellt automatisch (rundgang-pdf-075.mts) aus docs/rundgang/kritik-075 (frische Shots + gerasterte Goldens) und docs/rundgang/d4-pdffonts-stichprobe (A3-Beleg).</p>
</section>

</body></html>`;

writeFileSync(join(WORK, 'rundgang.html'), html);

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });
const page = await (await browser.newContext()).newPage();
await page.goto(`file://${join(WORK, 'rundgang.html')}`);
await page.waitForTimeout(600);
await page.pdf({ path: OUT, format: 'A4', landscape: true, printBackground: true });
await browser.close();
console.log('rundgang-pdf-075 →', OUT, '·', basename(OUT));
