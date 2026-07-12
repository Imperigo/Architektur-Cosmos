/**
 * Rundgang-PDF «0.7.3 — Kosmodesign» (12.07.) — Muster rundgang-pdf-072.mts.
 * Soll-Ist-Vergleich: docs/soll-073/* (Soll) gegen die Kritik-Shots
 * docs/rundgang/kritik-073{,-r2,-r3}/ (Ist). HTML → PDF über Chromiums print,
 * Ablage abgabe/RUNDGANG-NOTIZEN-0.7.3.pdf.
 *
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/rundgang-pdf-073.mts
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const SOLL = `${ROOT}docs/soll-073/`;
const R1 = `${ROOT}docs/rundgang/kritik-073/`;
const R2 = `${ROOT}docs/rundgang/kritik-073-r2/`;
const R3 = `${ROOT}docs/rundgang/kritik-073-r3/`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.7.3.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });

const WORK = join(tmpdir(), 'kosmo-rundgang-073');
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

/** Soll (links) vs. Ist (rechts) auf einer Seite. */
function sollIst(titel: string, soll: string, ist: string, sollCap: string, istCap: string, notiz: string): string {
  return `<section class="seite">
    <h2>${titel}</h2>
    <div class="duo">
      <div><span class="tag tag-soll">SOLL</span><img src="bilder/${soll}"><p class="klein">${sollCap}</p></div>
      <div><span class="tag tag-ist">IST</span><img src="bilder/${ist}"><p class="klein">${istCap}</p></div>
    </div>
    <div class="notiz"><strong>Notiz</strong> ${notiz}</div>
  </section>`;
}

/** Soll oben, drei Ist-Bilder in einer Reihe darunter. */
function sollTrio(titel: string, soll: string, sollCap: string, ist: [string, string][], notiz: string): string {
  const trio = ist.map(([b, c]) => `<div><img src="bilder/${b}"><p class="klein">${c}</p></div>`).join('');
  return `<section class="seite">
    <h2>${titel}</h2>
    <div class="einzel"><span class="tag tag-soll">SOLL</span><img class="sollband" src="bilder/${soll}"><p class="klein">${sollCap}</p></div>
    <div class="trio">${trio}</div>
    <div class="notiz"><strong>Notiz</strong> ${notiz}</div>
  </section>`;
}

// --- Bilder registrieren -----------------------------------------------------
const s2b = bild(SOLL, '2b-d1-strich-matrix.png');
const s3a = bild(SOLL, '3a-d2-fluegel-volle-konvention.png');
const s4b = bild(SOLL, '4b-d3-lod-treppe.png');
const s5b = bild(SOLL, '5b-d4-zwei-stimmen.png');
const s6a = bild(SOLL, '6a-d5-phase-entscheidet-modus.png');
const s7b = bild(SOLL, '7b-d6-beschlag-katalog-s0.png');
const s8a = bild(SOLL, '8a-d7-papier-theme.png');
const s8b = bild(SOLL, '8b-d7-kosmos-theme.png');
const s8c = bild(SOLL, '8c-d7-invarianz-papier-ist-papier.png');

const grVor = bild(R1, 'r1-golden-grundriss-testhaus-vorher.png');
const grNach = bild(R1, 'r1-golden-grundriss-testhaus-nachher.png');
const anVor = bild(R1, 'r1-golden-ansicht-fluegeltypen-vorher.png');
const anNach = bild(R1, 'r1-golden-ansicht-fluegeltypen-nachher.png');
const planInvOrbit = bild(R1, 'r1-orbit-planblatt-invarianz.png');
const planInvPaper = bild(R1, 'r1-paper-planblatt-invarianz.png');
const einstellOrbit = bild(R1, 'r1-orbit-einstellungen-2segmente.png');

const d2Ansicht = bild(R2, 'r2-d2-ansicht-fluegeltypen.png');
const d3Wett = bild(R2, 'r2-d3-kontext-wettbewerb.png');
const d3Bau = bild(R2, 'r2-d3-kontext-baueingabe.png');
const d3Werk = bild(R2, 'r2-d3-kontext-werkplan.png');
const d4Report = bild(R2, 'r2-d4-report-zwei-stimmen.png');
const d4Plankopf = bild(R2, 'r2-d4-planblatt-plankopf.png');
const d6Beschlag = bild(R2, 'r2-d6-werkplan-beschlag.png');

const desOrbit = bild(R3, 'a-design-orbit.png');
const desPaper = bild(R3, 'a-design-paper.png');
const zentOrbit = bild(R3, 'b-zentrale-orbit.png');
const zentPaper = bild(R3, 'b-zentrale-paper.png');
const kollaps = bild(R3, 'c-kollaps-1000px.png');
const d3dWeiss = bild(R3, 'd-3d-weiss-wettbewerb.png');
const d3dTextur = bild(R3, 'd-3d-textur-werkplan.png');
const d3dSchwarz = bild(R3, 'd-3d-schwarz-situation.png');

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: system-ui, sans-serif; color: #1a1815; }
  h1 { font-size: 25px; letter-spacing: 0.04em; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #c9c4b6; padding-bottom: 4px; }
  .seite { page-break-after: always; }
  img { max-width: 100%; max-height: 128mm; border: 1px solid #e4e0d6; display: block; margin: 4px auto; }
  .duo { display: flex; gap: 10px; } .duo div { flex: 1; } .duo img { max-height: 108mm; }
  .einzel img.sollband { max-height: 48mm; }
  .trio { display: flex; gap: 8px; margin-top: 6px; } .trio div { flex: 1; } .trio img { max-height: 74mm; }
  .tag { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; padding: 1px 6px; border-radius: 3px; }
  .tag-soll { background: #1a1815; color: #f5f3ee; } .tag-ist { background: #0f766e; color: #fff; }
  .notiz { background: #f5f3ee; border-left: 3px solid #1a1815; padding: 7px 11px; font-size: 12px; margin-top: 7px; }
  .titelblatt p, li { font-size: 12.5px; line-height: 1.5; }
  .klein { font-size: 10.5px; color: #5c574d; margin: 2px 0; }
  .zahlen { display: flex; gap: 10px; margin: 8px 0; }
  .zahl { flex: 1; background: #f5f3ee; border: 1px solid #e4e0d6; border-radius: 5px; padding: 8px; text-align: center; }
  .zahl b { display: block; font-size: 20px; } .zahl span { font-size: 10.5px; color: #5c574d; }
</style></head><body>

<section class="seite titelblatt">
  <h1>KosmoOrbit v0.7.3 «Kosmodesign» — Rundgang-Notizen</h1>
  <p><strong>Frisches Release auf 0.7.1/0.7.2</strong> · 12.07.2026 · ROADMAP 330 · Plangrafik-, Typografie- &amp; Shell-Feinschliff (D1–D7 + app-weites Boden-Dock). Build-Tip <code>f43a85a</code>.</p>
  <div class="zahlen">
    <div class="zahl"><b>752</b><span>Kernel-Tests grün</span></div>
    <div class="zahl"><b>847</b><span>App-Tests grün</span></div>
    <div class="zahl"><b>28 / 0</b><span>svg-qa Goldens / harte Fehler</span></div>
    <div class="zahl"><b>OFL</b><span>Lato 900 + IBM Plex Mono PDF-embedded</span></div>
  </div>
  <ul>
    <li><strong>D1 Strich-Matrix</strong> (Stift × Grau × Linientyp; Sichtkante 0.25) · <strong>D2</strong> Flügelrichtung innen/aussen + Leibung ab Vorprojekt · <strong>D3</strong> Kontext-LOD-Treppe (folgt der Phase) · <strong>D4</strong> «Zwei Stimmen» (Titel Lato, Messbares IBM Plex Mono, PDF-eingebettet) · <strong>D5</strong> 3D-Modusregel «Phase entscheidet» · <strong>D6</strong> Beschlag-Katalog S0 · <strong>D7</strong> Theme-Paar Papier/Kosmos (Tinte entfernt) · app-weites Boden-Dock.</li>
    <li><strong>Ehrlich vertagt auf 0.7.4:</strong> «Lato Heavy 800» gibt es frei nicht → <strong>Lato 900 (Black)</strong> gewählt (näher am Soll, nicht als «800» ausgegeben) · DXF-Export nutzt CAD-Standardschrift (keine Web-Fonts) · Beschlag nur S0 (6 Symbole, nur Werkplan; 12-Symbol-S1 + IFC folgen) · SIA-Hochzahl-Rest mm 4–9 fehlt im PDF-Font («361⁵»→«361», Rest 1–3 trägt) · Kosmo-Orb sitzt NEBEN dem Boden-Dock, nicht darin (freies Symbol muss überall bleiben) · Live-Plan-Kontext folgt der Phase erst im Druck, nicht am Bildschirm.</li>
  </ul>
  <p class="klein">Gates am Finale grün nachgefahren (Kernel 752/752 · App 847/847 · UI 31 · Typecheck alle Workspaces · svg-qa 28 Goldens/0 harte Fehler, 1 bekannte abnahmeprotokoll-Text-Overlap-Warnung · secret-scan · ai-scan-delta). Journeys/Sim (Playwright): Deterministik-Gates grün; die serverabhängigen Sim-Journeys brauchen Bridge/Sync und echte Hardware — Stand s. Schlussseite. CI/Pages: Build-Requests auf diesem Stand angestossen, Verifikation s. abgabe/CI-ARTEFAKTE.md.</p>
</section>

${sollIst('1 · D1 — Strich-Matrix im Grundriss', s2b, grNach, 'Soll 2b: Stift × Grauton × Linientyp durchdekliniert.', 'Ist: grundriss-testhaus (nachher) — Plangrafik black→#111, Türbogen #666.', 'Alle gedruckten Pläne folgen EINER Matrix: geschnitten #111, gesehen #3A3A3A, Projektion #666, Kontext #8a8a8a. 17 geänderte Goldens, jede Diff-Zeile modulo Farbe/Stift byte-identisch, 0 Geometrie-Diff. Offen 0.7.4: Dash-Kadenzen nicht auf SIA-Vokabular normalisiert; Grundriss-Projektionsflächen tragen weiter den geschnitten-Ton.')}

${sollIst('2 · D1 — Sichtkante 0.25 (Ansicht, vorher/nachher)', anVor, anNach, 'Vorher: Fassaden-Sichtkanten auf dem 0.35er-Sekundärstift.', 'Nachher: Sichtkante 0.25 (STIFT.kante) — matrix-konsistent mit der Leibung.', 'Eigener, dokumentierter Kritik-1-Golden-Wechsel: 98 Sichtkanten 4.9→3.5 (0.35·14→0.25·14) über 5 Goldens, 0 Geometrie-/Farbänderung. Der alte 0.35-Wert war ein Holdover aus der Zeit, als die Kante noch #111 (geschnitten) trug.')}

${sollIst('3 · D2 — Flügel: volle SIA-Konvention + innen/aussen', s3a, d2Ansicht, 'Soll 3a: Flügelsymbol spannt die volle Flügelbreite.', 'Ist: ansicht-fluegeltypen — Schiebe voll, Kipp-Fenster gestrichelt (öffnet nach aussen).', 'Additives Feld Opening.oeffnetNachAussen? (innen durchgezogen / aussen gestrichelt 2–1 mm). Leibungslinie ab Vorprojekt für JEDE Öffnung (Werkplan zusätzlich Rahmen). Grenze wie Bestand: keine Hidden-Line-Verdeckung; geschnittene Öffnungen ohne Leibung.')}

${sollTrio('4 · D3 — Kontext-LOD-Treppe (folgt der Bauphase)', s4b, 'Soll 4b: Nachbar-/Parzellen-Detail nimmt mit der Phase ab.', [[d3Wett, 'Wettbewerb: Nachbarn gefüllt grau (#c9c9c9).'], [d3Bau, 'Baueingabe: Nachbarn nur Umriss (#8a8a8a).'], [d3Werk, 'Werkplan: Nachbarn aus — nur die Parzelle bleibt.']], 'Neue reine Funktion nachbarKontextStufe(phase) in derive/plan.ts, auch vom Druckweg genutzt. Parzelle in JEDER Phase strichpunktiert. Grundsatzoffen (0.7.4): PlanView.tsx (Live-Plan) liest Kontext direkt aus dem Doc, nicht über derivePlan — am Bildschirm bleiben Nachbarn vorerst immer sichtbar; die Phasen-Treppe greift nur im Druck-/SVG-Weg.')}

${sollIst('5 · D4 — «Zwei Stimmen»: Titel Lato, Messbares Mono', s5b, d4Report, 'Soll 5b: Titel kräftig-versal, Zahlen als Tabellenziffern-Mono.', 'Ist: Report-Blatt — Titel Lato versal +0.04em, Werte IBM Plex Mono (tnum).', 'Durchgängig über Blatt-Module, Plan/Schnitt/Ansicht und Plankopf; Fonts PDF-eingebettet. EHRLICH: «Lato Heavy 800» gibt es frei nicht → Lato 900 (Black) nach empirischem Render-Vergleich (nicht als «800» ausgegeben). Nebenwirkung im ersten svg-qa gefixt: Report-Titel-Overflow (22→17 px in 3 A4-hoch-Modulen).')}

${seite('6 · D4 — Plankopf trägt beide Stimmen', d4Plankopf, 'Der Plankopf sitzt auf JEDEM gedruckten Plan — Titel Lato versal, Meta (Massstab/Datum/Phase) IBM Plex Mono. EHRLICHE Grenzen (0.7.4): der DXF-Export bleibt auf CAD-Standardschrift (keine Web-Fonts im DXF); der hochgestellte SIA-mm-Rest 4–9 fehlt im PDF-Font (weder Lato noch IBM Plex Mono hat die Glyphe — «361⁵» wird still zu «361»), Rest 1–3 (¹²³) trägt.')}

${sollTrio('7 · D5 — 3D-Modusregel «Phase entscheidet»', s6a, 'Soll 6a: der 3D-Charakter folgt der amtlichen Phase.', [[d3dWeiss, 'Wettbewerb: Weissmodell.'], [d3dTextur, 'Werkplan: Material/Textur.'], [d3dSchwarz, 'Situation: Schwarzmodus.']], 'Bis Baueingabe Weissmodell, ab Ausschreibung Material; Visualisierungs-Aufnahmen werden in den phasen-amtlichen Modus gezwungen, damit kein Textur-Render eine frühe Phase vortäuscht.')}

${sollIst('8 · D6 — Beschlag-Katalog (Stufe S0)', s7b, d6Beschlag, 'Soll 7b: Katalogsymbole für Band/Griff/Antrieb/Absturz + BRH.', 'Ist: werkplan-beschlag — 3× BRH 90, Motor «M»; 4. Fenster ohne Feld → kein Symbol (Daten-Guard).', 'Additive Felder band/griffseite/antrieb/absturzsicherung, Command design.beschlagSetzen, neuer DXF-Layer BESCHLAG. EHRLICH S0: erst 6 Symbole, reine Linien-/Text-Piktogramme (keine pixelgenauen Katalogzeichen), NUR im Werkplan. Offen: 12-Symbol-Stufe S1 + IFC-Beschlag-Abbildung.')}

<section class="seite">
  <h2>9 · D7 — Theme-Paar Papier / Kosmos (Tinte entfernt)</h2>
  <div class="duo">
    <div><span class="tag tag-soll">SOLL 8a/8b</span><img src="bilder/${s8a}"><p class="klein">Soll: Papier (hell) &amp; Kosmos (dunkel) als Paar.</p></div>
    <div><span class="tag tag-ist">IST</span><img src="bilder/${desPaper}"><p class="klein">Design-Station Papier.</p></div>
    <div><span class="tag tag-ist">IST</span><img src="bilder/${desOrbit}"><p class="klein">Design-Station Kosmos.</p></div>
  </div>
  <div class="notiz"><strong>Notiz</strong> Das alte «Tinte»-Theme ist entfernt; die Wahl ist auf «Papier» / «Kosmos» reduziert. Zweitreferenz Kosmos-Soll 8b und die Zentrale (b-zentrale-*) belegen dieselbe Struktur in beiden Welten. Eine bereits getroffene eigene Wahl wird respektiert.</div>
</section>

${sollIst('10 · D7 — Invarianz: Papier bleibt Papier', s8c, planInvPaper, 'Soll 8c: identische Struktur, nur die Welt (hell/dunkel) wechselt.', 'Ist: planblatt-invarianz (Papier) — Regressionswache bestanden.', 'Der Theme-Wechsel ändert NUR Farbwelt/Chrome, nicht Struktur oder Plangrafik. Belege beidseitig: r1-{orbit,paper}-planblatt-invarianz. Das gedruckte Planblatt ist themeunabhängig (Tinte black, Papier weiss) — per Shot-Vergleich abgesichert.')}

<section class="seite">
  <h2>11 · Shell — Kollaps &amp; Zwei-Segmente-Wähler</h2>
  <div class="duo">
    <div><span class="tag tag-ist">IST</span><img src="bilder/${kollaps}"><p class="klein">Header-Kollaps bei 1000 px — nichts bricht um.</p></div>
    <div><span class="tag tag-ist">IST</span><img src="bilder/${einstellOrbit}"><p class="klein">Theme-Wähler: nur noch zwei Segmente (Papier/Kosmos).</p></div>
  </div>
  <div class="notiz"><strong>Notiz</strong> Der Zwei-Segmente-Wähler ist der sichtbare Beleg für das entfernte Tinte-Theme. Zum app-weiten Boden-Dock: es sitzt durchgängig am unteren Rand der Arbeitsansichten — EHRLICH vertagt (0.7.4): der Kosmo-Orb sitzt NEBEN dem Dock, nicht darin; das freie Kosmo-Symbol muss überall verfügbar bleiben.</div>
</section>

<section class="seite titelblatt">
  <h2>Owner-Rundgang-Checkliste + ehrliche Grenzen (0.7.4)</h2>
  <ul>
    <li><strong>Version:</strong> Wordmark liest v\${__APP_VERSION__} aus package.json — nach dem Bump zeigt die App <strong>v0.7.3</strong> (Build grün nachgefahren).</li>
    <li><strong>D4-Typografie am echten PDF:</strong> ein Blatt exportieren und mit pdffonts prüfen, dass Lato + IBM Plex Mono embedded=yes sind; den SIA-Hochzahl-Rest 4–9 im Auge behalten («361⁵»→«361» ist bekannt, 0.7.4).</li>
    <li><strong>DXF:</strong> Export öffnet in Rhino/Revit mit CAD-Standardschrift (keine Web-Fonts) — bewusst, nicht kaschiert.</li>
    <li><strong>Beschlag S0:</strong> nur Werkplan, 6 Symbole; S1 (12 Symbole) + IFC-Beschlag folgen.</li>
    <li><strong>Live-Plan-Kontext:</strong> die Phasen-LOD-Treppe greift am Bildschirm noch nicht (nur Druck) — Grundsatzfrage S1/PlanView für 0.7.4.</li>
    <li><strong>Boden-Dock:</strong> Kosmo-Orb-Integration ins Dock steht aus (0.7.4).</li>
    <li><strong>Sim-Journeys mit Bridge/Sync + echte Hardware:</strong> die serverabhängigen Sim-Specs (efh/mfh/blockrand/hochhaus/stadthaus/ki-imaging) brauchen die Helfer-Server; im Container isoliert fahrbar, aber der echte Rundgang bleibt Owner-Abnahme.</li>
    <li><strong>Modell-Ökonomie ehrlich:</strong> Fable war gesperrt (Spend-Limit) — Ausführung auf Sonnet, die Golden-Wechsel sind maschinell Zeile-für-Zeile gegen die Erwartungsliste verifiziert (Ersatz fürs fehlende Fable-Siegel).</li>
  </ul>
  <p class="klein">Erstellt automatisch (rundgang-pdf-073.mts) aus docs/soll-073 (Soll) gegen die Kritik-Shots der Runden 1–3 (Ist).</p>
</section>

</body></html>`;

writeFileSync(join(WORK, 'rundgang.html'), html);

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });
const page = await (await browser.newContext()).newPage();
await page.goto(`file://${join(WORK, 'rundgang.html')}`);
await page.waitForTimeout(600);
await page.pdf({ path: OUT, format: 'A4', landscape: true, printBackground: true });
await browser.close();
console.log('rundgang-pdf-073 →', OUT, '·', basename(OUT));
