/**
 * Rundgang-PDF «0.7.1 + 0.7.2» (gebündelter Release, 12.07.) — Muster
 * rundgang-pdf-070.mts. Bilder aus docs/rundgang/kritik-071 + kritik-072.
 * HTML → PDF über Chromiums print, Ablage abgabe/RUNDGANG-NOTIZEN-0.7.2.pdf.
 *
 * Aufruf (aus kosmo-orbit/):
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx e2e/tools/rundgang-pdf-072.mts
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const K71 = `${ROOT}docs/rundgang/kritik-071/`;
const K72 = `${ROOT}docs/rundgang/kritik-072/`;
const OUT = `${ROOT}abgabe/RUNDGANG-NOTIZEN-0.7.2.pdf`;
mkdirSync(`${ROOT}abgabe/`, { recursive: true });

const WORK = join(tmpdir(), 'kosmo-rundgang-072');
mkdirSync(join(WORK, 'bilder'), { recursive: true });

function brauche(pfad: string): void {
  if (!existsSync(pfad)) throw new Error(`Quelle fehlt: ${pfad}`);
}

const bilder: Array<[string, string]> = [
  [K71, '01-standort-nachbarn-uebernommen.png'],
  [K71, '05-3d-fenster-glas.png'],
  [K71, '09-live-schnitt-fluegelsymbolik.png'],
  [K72, 'r1-orbit-01-zentrale.png'],
  [K72, 'r1-paper-01-zentrale.png'],
  [K72, 'r2-orbit-hub-faecher-phase4.png'],
  [K72, 'r2-orbit-zustand-takeover.png'],
  [K72, 'r2-orbit-dock.png'],
  [K72, 'r3-orbit-cursor-precision-plan.png'],
  [K72, 'r3-orbit-companion.png'],
  [K72, 'r3-orbit-einstellungen-bewegung-klang.png'],
  [K72, 'r3-orbit-header-1400-pills.png'],
];
for (const [dir, b] of bilder) {
  brauche(dir + b);
  copyFileSync(dir + b, join(WORK, 'bilder', b));
}

function seite(titel: string, bild: string, notiz: string): string {
  return `<section class="seite">
    <h2>${titel}</h2>
    <img src="bilder/${bild}" />
    <div class="notiz"><strong>Notiz</strong> ${notiz}</div>
  </section>`;
}

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
  @page { size: A4 landscape; margin: 14mm; }
  body { font-family: system-ui, sans-serif; color: #1a1815; }
  h1 { font-size: 26px; letter-spacing: 0.04em; }
  h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #c9c4b6; padding-bottom: 4px; }
  .seite { page-break-after: always; }
  img { max-width: 100%; max-height: 132mm; border: 1px solid #e4e0d6; display: block; margin: 6px auto; }
  .duo { display: flex; gap: 8px; } .duo div { flex: 1; } .duo img { max-height: 118mm; }
  .notiz { background: #f5f3ee; border-left: 3px solid #1a1815; padding: 8px 12px; font-size: 12.5px; margin-top: 8px; }
  .titelblatt p, li { font-size: 13px; line-height: 1.5; }
  .klein { font-size: 11px; color: #5c574d; }
</style></head><body>

<section class="seite titelblatt">
  <h1>KosmoOrbit v0.7.1 + v0.7.2 — Rundgang-Notizen</h1>
  <p><strong>Gebündelter Release</strong> · 12.07.2026 · ROADMAP 322–329 · «Echt statt Attrappe» + «Visuelles Update»</p>
  <ul>
    <li><strong>v0.7.1 «Echt statt Attrappe»:</strong> Kosmo-Blick cloud-tauglich (Bildverkleinerung + 4-MB-Budget, bewiesen am abgefangenen Request) · OAuth-Abmelden · amtliche Nachbargebäude von geo.admin.ch im Situationsplan + Grundriss-Kontextlayer · EIN DXF-Exporter mit echtem Bemassungs-Layer · Remote-3D-Kaskade (CSP-Attrappen-Fund behoben) · Terrain-Mesh · Fenster mit echtem Glas + SIA-Flügelsymbolik in Ansicht und Live-Schnitt.</li>
    <li><strong>v0.7.2 «Visuelles Update» (ClaudeDesign-Handoff, 8 Pakete):</strong> Marke «6a» + Splash + neues App-Icon · orbit-Theme als neuer Standard (Papier/Tinte bleiben wählbar) · 14 Werkzeug-Glyphen mit Rollen-Punkten · SIA-112-Phasen-Leiste + Rang-Logik im Hub · neun Kosmo-Zustände · «Kosmo zeichnet sichtbar» (Vorspiel-Overlay, Undo-atomar) · eigener Mauszeiger mit Kontext-Morph · Tauri-Charakter-Fenster + Tray · Companion-Ansicht · Sounds (Default aus).</li>
  </ul>
  <p class="klein">Stand c9aa547 · Unit-Suiten: Kernel 728 · App 847 · UI 31 (Goldens byte-identisch, kein Golden-Wechsel in 0.7.1/0.7.2) · E2E-Vollsuite 370/370 nach Triage (2 Befunde behoben: Rollen-Vorstufe-vs-Rang-Regression, clock-Roundtrip-Race; 1 dokumentierter pointer:coarse-Skip) · CI: Desktop/Pages/iOS auf c9aa547 angestossen — Pages-Verifikation s. Schlussseite; Workflow-/Asset-Zählung war in dieser Session ohne GitHub-Zugriff nicht möglich (ehrlich offen, Owner-Blick oder Folgesession).</p>
</section>

${seite('1 · v0.7.1 — Nachbarn amtlich übernommen', '01-standort-nachbarn-uebernommen.png', 'Standort-Panel nach «Nachbarn übernehmen»: echte Gebäude-Polygone von geo.admin.ch (VECTOR25), Zähl-Meldung und Quellen-Fussnote mit ehrlichem Datenstand (~2008). Ein Undo-Schritt räumt den ganzen Import.')}

${seite('2 · v0.7.1 — Fenster mit echtem Glas', '05-3d-fenster-glas.png', '3D-Viewport: auch nicht-parametrische Fenster tragen jetzt eine Glasebene + Standardrahmen statt blosser Löcher. Glas bleibt in jedem Darstellungsmodus transparent (0.7.0-Regel).')}

${seite('3 · v0.7.1 — Flügelsymbolik im Live-Schnitt', '09-live-schnitt-fluegelsymbolik.png', '4er-Splitscreen: Schnitt und Ansicht zeigen die SIA-Öffnungssymbolik (links Dreh, rechts Drehkipp) jetzt auch LIVE — vorher konnte das nur der Druckweg. Grenze ehrlich: einfacher Tiefen-Test, keine volle Hidden-Line-Verdeckung der Symbole.')}

<section class="seite">
  <h2>4 · v0.7.2 — Neue Marke, zwei Welten</h2>
  <div class="duo">
    <div><img src="bilder/r1-orbit-01-zentrale.png"><p class="klein">orbit-Theme (neuer Standard): 6a-Marke, dunkles Cockpit, Rollenfarben-Punkte</p></div>
    <div><img src="bilder/r1-paper-01-zentrale.png"><p class="klein">Papier-Theme: identische Struktur, helle Welt — Regressionswache bestanden</p></div>
  </div>
  <div class="notiz"><strong>Notiz</strong> Bestehende Theme-Wahl wird respektiert; nur Neuinstallationen starten in orbit. Das App-Icon existiert in der dunklen Standard-Variante — die weiteren Handoff-Varianten (Tint/Glas/Hell) sind nicht gebaut.</div>
</section>

${seite('5 · v0.7.2 — Hub mit Phasen-Rang', 'r2-orbit-hub-faecher-phase4.png', 'Design-Fächer in Phase 4 (Ausschreibung): Publish rückt nach vorn (BASE-Matrix × 7-Tage-Nutzung, Hysterese gegen Nervosität). Sichtbar greift der Rang bisher im Design-Fächer; hub-weit folgt mit dem Dock-Ausbau. Vollsuiten-Befund behoben: eine explizit gewählte ROLLE gewinnt jetzt wieder über das ambiente Rang-Signal.')}

${seite('6 · v0.7.2 — Phasen-Leiste + Takeover-Rahmen', 'r2-orbit-zustand-takeover.png', 'Header mit den 5 SIA-112-Phasen; der Takeover-Zustand zeichnet Punkte den Fensterrand entlang mit Hinweis-Chip (über der Statusleiste, Kritik-2-Auflage). Ehrlich: In 0.7.2 löst noch kein realer Ablauf den Takeover aus — Trigger + ESC folgen 0.7.3.')}

${seite('7 · v0.7.2 — Entwurfs-Dock mit Glas und Rollen-Punkten', 'r2-orbit-dock.png', 'Kreisrunde Werkzeuge, Glas-Optik im orbit-Theme, je genau ein Rollen-Punkt (nach Kritik-1-Auflage auf lesbare Grösse gebracht, ohne die 80/15/5-Ruhe zu brechen). Nutzungs-Klicks füttern die Rang-Logik.')}

${seite('8 · v0.7.2 — Eigener Mauszeiger: Präzisions-Morph', 'r3-orbit-cursor-precision-plan.png', 'Über dem Plan morpht der Zeiger zum Fadenkreuz (Kreis + Teal-Ticks + Mittelpunkt) — über den Signal-Punkt als Zwischenform, nie hart. Nur auf Geräten mit Maus/Trackpad, abschaltbar, unter reduzierter Bewegung statisch.')}

${seite('9 · v0.7.2 — Companion-Ansicht', 'r3-orbit-companion.png', 'Schmale #companion-Ansicht: Phasen-Ring (2/5), echte Auftragskarte aus dem Auftragsbuch, 4er-Kreis-Dock. Ehrlich: Lese-/Freigabe-Ansicht; Vis-Freigaben sind sitzungsgebunden; der Zugang läuft über das Anhängen von «#companion» an die Adresse (eigener Koppel-Link folgt 0.7.3).')}

<section class="seite">
  <h2>10 · v0.7.2 — Einstellungen «Bewegung &amp; Klang» + kompakter Header</h2>
  <div class="duo">
    <div><img src="bilder/r3-orbit-einstellungen-bewegung-klang.png"><p class="klein">Vier ehrliche Schalter: Sounds (aus) · Eigencursor · Kosmo-Abspielen · Charakter-Fenster (nur Desktop)</p></div>
    <div><img src="bilder/r3-orbit-header-1400-pills.png"><p class="klein">Unter 1500 px kollabiert die Phasen-Leiste auf Ziffern-Pills — nichts bricht um</p></div>
  </div>
  <div class="notiz"><strong>Notiz</strong> Der Charakter-Schalter spricht einen echten Tauri-Befehl an (show/hide des Zweitfensters) — im Container nur compile-bewiesen, s. Checkliste.</div>
</section>

<section class="seite titelblatt">
  <h2>Owner-Rundgang-Checkliste (echte Hardware) + ehrliche Grenzen</h2>
  <ul>
    <li><strong>Desktop-Installer (nach CI):</strong> Kosmo-Charakter-Fenster + Tray prüfen — erscheint der Orb unten rechts? Zeigt/versteckt der Einstellungs-Schalter das Fenster? macOS/Linux-Transparenz beurteilen (im Container nicht prüfbar, nur cargo check + CI-Build als Beleg).</li>
    <li><strong>Kosmo-Blick Cloud:</strong> mit echtem Anthropic-Schlüssel das Abnahme-Drehbuch in docs/BETRIEBSARTEN.md fahren (der Container beweist nur den abgefangenen Request).</li>
    <li><strong>QR-Pairing mit Zweitgerät:</strong> Companion auf dem iPad öffnen (#companion an die gekoppelte Adresse anhängen).</li>
    <li><strong>Ehrlich vertagt auf 0.7.3:</strong> KIcon-Bestandsregistry im neuen Strichstil · hub-weiter Rang/Boden-Dock · Takeover-Trigger + ESC · chip-serie/orbit-loader · Schwarm-Orbs + Kamera-Folge · Abspiel-Overlay folgt Pan/Zoom nicht · Companion-Link im Koppeln-Dialog · Charakter-Schliessen-Choreografie · App-Icon-Varianten.</li>
    <li><strong>CI-Verifikation:</strong> Pages-Version und Workflow-Stand werden nach dieser PDF-Erzeugung geprüft und in der Abschlussmeldung berichtet; die Desktop-Asset-Zählung (Soll: 18) braucht GitHub-Zugriff — in dieser Session nicht verfügbar, wird nachgereicht.</li>
  </ul>
  <p class="klein">Erstellt automatisch (rundgang-pdf-072.mts) aus den Kritik-Shots der Runden 0.7.1/0.7.2 gegen die jeweils frischen Builds.</p>
</section>

</body></html>`;

writeFileSync(join(WORK, 'rundgang.html'), html);

const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_CHROMIUM_PATH'] });
const page = await (await browser.newContext()).newPage();
await page.goto(`file://${join(WORK, 'rundgang.html')}`);
await page.waitForTimeout(600);
await page.pdf({ path: OUT, format: 'A4', landscape: true, printBackground: true });
await browser.close();
console.log('rundgang-pdf-072 →', OUT);
