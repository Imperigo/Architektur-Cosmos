/**
 * Rundgang-PDF «0.7.4 — Einlösen & Feinschliff» (12.07.) — Muster
 * rundgang-pdf-073.mts. Löst die in 0.7.3 ausdrücklich vertagten Punkte ein
 * (P1 SIA-Hochzahl im PDF, P2 Live-Plan-Phasen-Weiche, P3 Kosmo-Orb im
 * Boden-Dock, P4 Plankopf-Typografie, P9 Takeover-Rahmen, P10 Beschlag S1) —
 * Vorher/Nachher-Bildpaare aus den Kritik-Runden 1 (`docs/rundgang/
 * kritik-074/`, bereits vorhandene Belege) und 2 (`docs/rundgang/
 * kritik-074-r2/`, in diesem Auftrag neu aufgenommen). HTML → PDF über
 * Chromiums print, Ablage abgabe/RUNDGANG-NOTIZEN-0.7.4.pdf.
 *
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/rundgang-pdf-074.mts
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const R1 = `${ROOT}docs/rundgang/kritik-074/`;
const R2 = `${ROOT}docs/rundgang/kritik-074-r2/`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.7.4.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });

const WORK = join(tmpdir(), 'kosmo-rundgang-074');
mkdirSync(join(WORK, 'bilder'), { recursive: true });

/** Kopiert eine Quelle in den Arbeitsordner und liefert den Bild-Dateinamen. */
function bild(dir: string, name: string): string {
  const pfad = dir + name;
  if (!existsSync(pfad)) throw new Error(`Quelle fehlt: ${pfad}`);
  copyFileSync(pfad, join(WORK, 'bilder', name));
  return name;
}

function seite(titel: string, b: string, notiz: string): string {
  return `<section class="seite">
    <h2>${titel}</h2>
    <img src="bilder/${b}" />
    <div class="notiz"><strong>Notiz</strong> ${notiz}</div>
  </section>`;
}

/** Vorher (links) vs. Nachher (rechts) auf einer Seite. */
function vorNach(titel: string, vor: string, nach: string, vorCap: string, nachCap: string, notiz: string): string {
  return `<section class="seite">
    <h2>${titel}</h2>
    <div class="duo">
      <div><span class="tag tag-vor">VORHER</span><img src="bilder/${vor}"><p class="klein">${vorCap}</p></div>
      <div><span class="tag tag-nach">NACHHER</span><img src="bilder/${nach}"><p class="klein">${nachCap}</p></div>
    </div>
    <div class="notiz"><strong>Notiz</strong> ${notiz}</div>
  </section>`;
}

/** Drei Vorher/Nachher-Detailpaare (je Spalte ein eigenes Mini-Duo) auf einer Seite. */
function vorNachDreifach(
  titel: string,
  paare: [string, string, string][], // [label, vorher, nachher]
  notiz: string,
): string {
  const spalten = paare
    .map(
      ([label, vor, nach]) => `<div class="spalte">
        <p class="klein spalten-titel">${label}</p>
        <div class="mini-duo">
          <div><span class="tag tag-vor">V</span><img src="bilder/${vor}"></div>
          <div><span class="tag tag-nach">N</span><img src="bilder/${nach}"></div>
        </div>
      </div>`,
    )
    .join('');
  return `<section class="seite">
    <h2>${titel}</h2>
    <div class="dreifach">${spalten}</div>
    <div class="notiz"><strong>Notiz</strong> ${notiz}</div>
  </section>`;
}

/** Zwei Bilder nebeneinander (Kontrast, nicht Vorher/Nachher-Wechsel derselben Stelle). */
function kontrast(titel: string, a: string, b: string, capA: string, capB: string, notiz: string): string {
  return `<section class="seite">
    <h2>${titel}</h2>
    <div class="duo">
      <div><span class="tag tag-ist">A</span><img src="bilder/${a}"><p class="klein">${capA}</p></div>
      <div><span class="tag tag-ist">B</span><img src="bilder/${b}"><p class="klein">${capB}</p></div>
    </div>
    <div class="notiz"><strong>Notiz</strong> ${notiz}</div>
  </section>`;
}

// --- Bilder registrieren -----------------------------------------------------
const nwVor = bild(R2, 'nachweis-074-vorher-crop.png');
const nwNach = bild(R2, 'nachweis-074-nachher-crop.png');

const utVor = bild(R1, 'r1-vorher-untertitel.png');
const utNach = bild(R1, 'r1-nachher-untertitel.png');
const npVor = bild(R1, 'r1-vorher-nordpfeil.png');
const npNach = bild(R1, 'r1-nachher-nordpfeil.png');
const grVor = bild(R1, 'r1-vorher-grundriss.png');
const grNach = bild(R1, 'r1-nachher-grundriss.png');
const vbVor = bild(R1, 'r1-vorher-vollblatt.png');
const vbNach = bild(R1, 'r1-nachher-vollblatt.png');

const zentraleFrei = bild(R2, 'r2-zentrale-kosmo-frei.png');
const dockOrb = bild(R2, 'r2-design-boden-dock-kosmo-orb.png');
const takeover = bild(R2, 'r2-takeover-rahmen.png');

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: system-ui, sans-serif; color: #1a1815; }
  h1 { font-size: 25px; letter-spacing: 0.04em; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #c9c4b6; padding-bottom: 4px; }
  .seite { page-break-after: always; }
  img { max-width: 100%; max-height: 122mm; border: 1px solid #e4e0d6; display: block; margin: 4px auto; }
  .duo { display: flex; gap: 10px; } .duo div { flex: 1; } .duo img { max-height: 102mm; }
  .dreifach { display: flex; gap: 10px; margin-top: 8px; }
  .spalte { flex: 1; }
  .spalten-titel { text-align: center; font-weight: 600; }
  .mini-duo { display: flex; flex-direction: column; gap: 6px; }
  .mini-duo img { max-height: 46mm; object-fit: contain; }
  .tag { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; padding: 1px 6px; border-radius: 3px; }
  .tag-vor { background: #8a6d1a; color: #fff; } .tag-nach { background: #0f766e; color: #fff; }
  .tag-ist { background: #1a1815; color: #f5f3ee; }
  .notiz { background: #f5f3ee; border-left: 3px solid #1a1815; padding: 7px 11px; font-size: 12px; margin-top: 7px; }
  .titelblatt p, li { font-size: 12.5px; line-height: 1.5; }
  .klein { font-size: 10.5px; color: #5c574d; margin: 2px 0; }
  .zahlen { display: flex; gap: 10px; margin: 8px 0; }
  .zahl { flex: 1; background: #f5f3ee; border: 1px solid #e4e0d6; border-radius: 5px; padding: 8px; text-align: center; }
  .zahl b { display: block; font-size: 20px; } .zahl span { font-size: 10.5px; color: #5c574d; }
</style></head><body>

<section class="seite titelblatt">
  <h1>KosmoOrbit v0.7.4 «Einlösen &amp; Feinschliff» — Rundgang-Notizen</h1>
  <p><strong>Diese Version löst die in 0.7.3 ausdrücklich vertagten Punkte ein.</strong> · 12.07.2026 · ROADMAP 331 ·
  drei Wellen + Kritik-Runden 1–3, Owner-Scope «Kern + Stretch». Build-Tip <code>923f63b</code>.</p>
  <div class="zahlen">
    <div class="zahl"><b>765</b><span>Kernel-Tests grün</span></div>
    <div class="zahl"><b>847</b><span>App-Tests grün</span></div>
    <div class="zahl"><b>28 / 0</b><span>svg-qa Goldens / harte Fehler</span></div>
    <div class="zahl"><b>4 / 4</b><span>E2E kosmo-takeover</span></div>
  </div>
  <ul>
    <li><strong>W1 · P1</strong> SIA-Hochzahl übersteht jetzt den PDF-Export («361»→«361⁵») · <strong>W1</strong> löst zugleich zwei D1-Vertagungen ein (Projektions-Ton #666, Abbruch-Kadenz) sowie Plankopf-Typografie (Untertitel/Nordpfeil in Titel-Schrift).</li>
    <li><strong>W2 · P3</strong> Kosmo-Orb sitzt jetzt IM Boden-Dock (rechter Slot) statt daneben · <strong>P2</strong> Live-Plan-Nachbarn folgen der Phasen-Weiche wie der Druckweg · <strong>P6</strong> Unterlabel-Umbruch · <strong>P7</strong> Plan-Pan-Grenze · <strong>P8</strong> Companion über Einstellungen auffindbar.</li>
    <li><strong>W3 · P9</strong> Vollbild-Takeover-Rahmen bei ≥8-Schritt-Paketen, ESC überspringt nur die Schau (Apply läuft atomar durch) · <strong>P10</strong> Beschlag-Katalog S1 (12 Symbole + IFC-Zuordnung, reine Datengrundlage — Platzieren folgt S2).</li>
    <li><strong>Ehrlich offen:</strong> Plankopf-Regular-Nebenzeile fällt im PDF-Export weiterhin auf Sans-Ersatz zurück (Lato 400 nicht als PDF-Font eingebettet, nur Lato 900) · Beschlag S1 ist reine Datengrundlage ohne UI/Command/Export-Wiring.</li>
  </ul>
  <p class="klein">Modell-Ökonomie ehrlich: Fable war diesen Zyklus weiterhin gesperrt (Monats-Spend-Limit) — golden-kritische Ausführung auf Sonnet, Orchestrierung/Verdikte beim Opus-Leiter; der Golden-Sammelwechsel W1 ist maschinell Zeile-für-Zeile gegen die vorab geschriebene Erwartungsliste verifiziert.</p>
</section>

${vorNach(
  '1 · P1 — SIA-Hochzahl übersteht den PDF-Export',
  nwVor,
  nwNach,
  'Vorher: produktionsechtes PDF (jsPDF + svg2pdf.js) — Masszahl zeigt nur «361», der mm-Rest (Unicode-Hochzahl) wird von den eingebetteten Fonts lautlos verschluckt.',
  'Nachher: «361⁵» — der Rest ist eine positionierte Normalziffer im eigenen &lt;tspan&gt;, keine Unicode-Hochzahl mehr.',
  'Ausschnitt aus dem produktionsechten Nachweis-PDF (Rasterung via pdftoppm), Crop auf den Grundriss-Bereich. Kein Tofu-Kästchen, kein Fehler in der alten Fassung — der Rest war einfach weg. Gelöst über `derive/dimensions.ts` `dimensionLabelParts` + `derive/plansvg.ts` `hochzahlSvg`: positionierte Ziffern-tspans statt Unicode-Superscript, svg2pdf-sicher. Überlebt für ALLE Reste 1–9 im PDF. 14 Goldens geändert, nur Schrift/Ton, 0 Geometrie-Diff (`docs/GOLDEN-WECHSEL-074.md`).',
)}

${vorNach(
  '2 · P4 — Plankopf-Typografie: Vollblatt',
  vbVor,
  vbNach,
  'Vorher: Untertitel/Nordpfeil-«N» im generischen Sans-Fallback.',
  'Nachher: dieselbe Titel-Schrift (Lato) wie der Blatttitel — konsistente Plankopf-Stimme.',
  'Screen-/SVG-Rendering (Chromium, Lato 400+700 self-hosted) — hier greift die Änderung sofort sichtbar. EHRLICHE PDF-Grenze (s. Schlussseite): im produktionsechten PDF-Export bleibt die Regular-Nebenzeile auf Sans-Ersatz, weil `public/fonts/pdf/` nur Lato 900 (Black) als PDF-TTF liefert, keine Lato-400-Datei — der Font-Lookup für „normal" findet dort keinen registrierten Schnitt und fällt auf jsPDFs Helvetica zurück.',
)}

${vorNachDreifach(
  '3 · P4 — Plankopf-Details (Screen/SVG, byte-diff-bestätigt)',
  [
    ['Untertitel', utVor, utNach],
    ['Nordpfeil «N»', npVor, npNach],
    ['Grundriss (Kontext)', grVor, grNach],
  ],
  'Drei repräsentative Ausschnitte derselben Golden-Änderung: Untertitel und Nordpfeil zeigen sichtbar andere Buchstabenformen (cmp bestätigt Byte-Diff ab Byte 36 bzw. Byte-Diff bei 3mm-Schriftgrösse mit blossem Auge nur als feine Differenz erkennbar). Der Grundriss-Ausschnitt zeigt zusätzlich den Projektions-Ton-Wechsel (#111→#666 an der Volumenkontur) und die gröbere Abbruch-Kadenz — beide lösen die entsprechenden D1-Vertagungen aus 0.7.3 ein.',
)}

${kontrast(
  '4 · P3 — Kosmo-Orb: frei (Zentrale) vs. eingebettet (Boden-Dock)',
  zentraleFrei,
  dockOrb,
  'Zentrale/Home: das freistehende Kosmo-Symbol bleibt unten rechts — hier gibt es KEINEN Boden-Dock (v0.7.3-S5b-Vertrag unverändert).',
  'Design-Modul: der Boden-Dock zeigt den Kosmo-Orb jetzt im rechten Slot, eingebettet in dieselbe Werkzeugreihe.',
  'Löst die 0.7.3-Vertagung «Kosmo-Orb sitzt NEBEN dem Dock, nicht darin» ein. Einzel-Instanz-Invariante bewiesen (`e2e/boden-dock.spec.ts:154`): app-weit je Screen-Zustand genau EIN `data-testid="kosmo-symbol"`-Knoten — auf der Zentrale das freistehende Symbol, in jeder Modul-Ansicht der eingebettete Slot, nie beide gleichzeitig, nie keiner solange das Panel zu ist.',
)}

${seite(
  '5 · P9 — Takeover-Rahmen «Kosmo arbeitet»',
  takeover,
  'Vollbild-Rahmen (`kosmo-orb-takeover`) mit Chip «KOSMO ARBEITET · ESC ÜBERSPRINGT» — löst NUR aus, wenn `KosmoPanel.applyPaket` autonom ein Paket mit ≥ 8 Schritten anwendet (`SCHWELLE_GROSSES_PAKET`). Screenshot via Test-Hook `window.__kosmoStatus.setzeZustand(\'takeover\')` bei geschlossenem Panel (deterministischer Store→DOM-Beweis, `e2e/kosmo-takeover.spec.ts` Test (d)) — der echte Trigger über ein 8-Schritte-Paket ist in derselben Spec Test (a)/(b) zeitlich beobachtet (Abspiel-Ebene hält das Vorspiel offen). EHRLICH: der Wortlaut heisst bewusst «ESC ÜBERSPRINGT» statt «BRICHT AB» — der Apply ist atomar und läuft laut Abspiel-Ebene-Vertrag IMMER durch; ESC beendet nur die sichtbare Schau, nicht die Anwendung (per Undo umkehrbar). Eine entdeckte Mount-Lücke (Trigger läuft nur bei OFFENEM Panel, Symbol/Dock rendern nur bei GESCHLOSSENEM Panel) ist über `KosmoTakeoverWaechter` komplementär geschlossen — `kosmo-orb-takeover` bleibt exakt einmal im DOM.',
)}

<section class="seite">
  <h2>6 · Was noch — P2, P6, P7, P8, P10 kompakt</h2>
  <ul>
    <li><strong>P2 Live-Plan-Phasen-Weiche:</strong> <code>PlanView.tsx</code> liest Nachbar-Kontext jetzt über dieselbe <code>nachbarKontextStufe(phase)</code> wie der Druckweg — löst die 0.7.3-Eskalation ein («die Treppe griff nur im Druck-/SVG-Weg, am Bildschirm blieben Nachbarn immer sichtbar»). <strong>Kein eigener Screenshot in diesem Rundgang</strong> (Zeitbudget) — per Golden/Unit-Test belegt, ehrlich hier so benannt statt stillschweigend übergangen.</li>
    <li><strong>P6 OrbitStart-Unterlabel:</strong> bricht jetzt um statt zu überlagern (Textumbruch-Fix, kein Golden berührt).</li>
    <li><strong>P7 Plan-Pan-Grenze:</strong> Klemmung auf Modell-Bounding-Box + Rand — man kann sich nicht mehr beliebig weit aus der Zeichnung herausbewegen.</li>
    <li><strong>P8 Companion-Zugang:</strong> über die Einstellungen auffindbar (vorher nur über eine von Hand ergänzte Adresse erreichbar).</li>
    <li><strong>P10 Beschlag-Katalog S1:</strong> 12 Beschlagtypen (Türdrücker, Band/Scharnier, Einsteckschloss, Schliessblech, Bodentürschliesser, Türstopper, Profilzylinder, Panikstange, Fenstergriff, Kippbeschlag, Türspion, Bandseitensicherung) mit Plan-Symbol + einheitlicher IFC-Zuordnung (<code>IFCDISCRETEACCESSORY</code>). <strong>Ehrlich S1-vs-S2:</strong> das ist NUR Katalog + Symbol + IFC-Mapping (8 Unit-Tests) — keine Entity, kein Command, keine UI, kein Export-Wiring. Datengrundlage; Platzieren im Plan folgt in Stufe S2. Kein Golden gerührt (additiv, ungenutzter Pfad).</li>
  </ul>
</section>

<section class="seite titelblatt">
  <h2>Gate-Zahlen &amp; ehrliche offene Liste</h2>
  <div class="zahlen">
    <div class="zahl"><b>765/765</b><span>Kernel-Tests (8 neu, Beschlag)</span></div>
    <div class="zahl"><b>847/847</b><span>App-Tests</span></div>
    <div class="zahl"><b>28 / 0</b><span>svg-qa Goldens / harte Fehler</span></div>
    <div class="zahl"><b>4 / 4</b><span>E2E kosmo-takeover</span></div>
  </div>
  <p class="klein">Weitere Gates grün nachgefahren: AI 109 · UI 31 · Contracts 28 · Data+Lizenz+Sync 29 · Typecheck alle Workspaces · secret-scan · neues <code>npm run release-gate</code>-Skript (typecheck→test→svg-qa→secret-scan). svg-qa-Ergebnis identisch zur 0.7.3-Baseline (keine neue Warnung).</p>
  <ul>
    <li><strong>Lato-400-PDF-Grenze:</strong> <code>public/fonts/pdf/</code> liefert nur Lato 900 (Black) als PDF-TTF — die Plankopf-Regular-Nebenzeile (Untertitel/Nordpfeil) fällt im produktionsechten PDF-Export weiterhin auf Sans-Ersatz zurück. Im Screen-/SVG-Kontext (beide Lato-Schnitte self-hosted) wirkt die Änderung bereits sofort. Dokumentierter Kleinpunkt, kein neuer Fehler.</li>
    <li><strong>Beschlag-Katalog S2:</strong> Platzieren der 12 S1-Symbole im Plan (Entity, Command, UI, Export-Wiring) steht aus — S1 ist bewusst nur die Datengrundlage.</li>
    <li><strong>P2 Live-Plan-Phasen-Weiche:</strong> per Golden/Unit-Test belegt, in diesem Rundgang ohne eigenen Screenshot (Zeitbudget) — ehrlich so benannt.</li>
    <li><strong>Modell-Ökonomie:</strong> Fable war diesen Zyklus weiterhin gesperrt (Monats-Spend-Limit) — golden-kritische Ausführung auf Sonnet, Verifikation Zeile-für-Zeile gegen die vorab geschriebene Erwartungsliste (Ersatz fürs fehlende Fable-Siegel).</li>
  </ul>
  <p class="klein">Erstellt automatisch (rundgang-pdf-074.mts) aus docs/rundgang/kritik-074 (Runde 1) und docs/rundgang/kritik-074-r2 (Runde 2, neu für diesen Rundgang).</p>
</section>

</body></html>`;

writeFileSync(join(WORK, 'rundgang.html'), html);

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });
const page = await (await browser.newContext()).newPage();
await page.goto(`file://${join(WORK, 'rundgang.html')}`);
await page.waitForTimeout(600);
await page.pdf({ path: OUT, format: 'A4', landscape: true, printBackground: true });
await browser.close();
console.log('rundgang-pdf-074 →', OUT, '·', basename(OUT));
