/**
 * Vorform-Video-Zerlegung → PDF (v0.6.4, Owner-Auftrag wörtlich: «das video
 * … komplett visuell ind transkript zerlegst und pro befehel … ein bild und
 * der text dazu gemacht wird … und ein pdf machst mit allen bildern und dem
 * transkript für das gesamte video»).
 *
 * Quelle: beide Demovideos von vorform.com (intro 8 min, render 23 min),
 * zerlegt per Szenen-Erkennung (pyav) + Whisper-Transkript (faster-whisper,
 * lokal) + Frame-Beschreibungen (Claude liest jedes Bild). Die Rohdaten
 * liegen im Session-Scratchpad; dieses Skript baut daraus das Abgabe-PDF.
 * Aufruf: npx tsx e2e/tools/vorform-zerlegung-pdf.mts <scratchpad/vorform-Verzeichnis>
 */
import { chromium } from 'playwright-core';
import { writeFileSync, readFileSync, readdirSync } from 'node:fs';

const SRC = process.argv[2];
if (!SRC) throw new Error('Aufruf: … vorform-zerlegung-pdf.mts <vorform-Datenverzeichnis>');
const OUT = new URL('../../abgabe/VORFORM-ZERLEGUNG.pdf', import.meta.url).pathname;

interface Szene {
  t: number;
  titel: string;
  beschrieb: string;
  befehl: string | null;
  sprecher: string;
}
interface Befehl {
  name: string;
  erster_t: number;
  kommentar: string;
}
interface Teil {
  szenen: Szene[];
  befehle: Befehl[];
}

/** Die Beschreibungs-Teile stammen von mehreren Agenten — Schlüssel-Varianten
 *  (erster_t/erste_zeitstelle/t, fehlender Kommentar) hier normalisieren. */
const lade = (name: string): Teil => {
  const roh = JSON.parse(readFileSync(`${SRC}/${name}`, 'utf8')) as {
    szenen: Szene[];
    befehle: Record<string, unknown>[];
  };
  return {
    szenen: roh.szenen,
    befehle: roh.befehle.map((b) => ({
      name: String(b['name'] ?? '?'),
      erster_t: Number(b['erster_t'] ?? b['erste_zeitstelle'] ?? b['t'] ?? 0),
      kommentar: String(b['kommentar'] ?? b['beschrieb'] ?? ''),
    })),
  };
};
const intro: Teil[] = ['beschreibungen-intro-teil1.json', 'beschreibungen-intro-teil2.json'].map(lade);
const render: Teil[] = [1, 2, 3, 4].map((i) => lade(`beschreibungen-render-teil${i}.json`));
const transkript = (name: string): { a: number; b: number; text: string }[] =>
  JSON.parse(readFileSync(`${SRC}/transkript-${name}.json`, 'utf8'));

/** Frame-Dateien je Video, sortiert — Index = Szenen-Index. */
const frames = (video: string) =>
  readdirSync(`${SRC}/frames/${video}`).filter((f) => f.endsWith('.jpg')).sort();

const zeit = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function videoHtml(video: string, titel: string, dauer: string, teile: Teil[]) {
  const bilder = frames(video);
  const szenen = teile.flatMap((t) => t.szenen);
  const befehle = teile.flatMap((t) => t.befehle);
  const szeneHtml = (s: Szene, i: number) => `
  <div class="szene">
    <img src="file://${SRC}/frames/${video}/${bilder[i]}" alt="" />
    <div class="text">
      <div class="kopf"><span class="nr">${video} · Szene ${i + 1}</span><span class="t">${zeit(s.t)}</span>${
        s.befehl ? `<span class="befehl">${esc(s.befehl)}</span>` : ''
      }</div>
      <h3>${esc(s.titel)}</h3>
      <p>${esc(s.beschrieb)}</p>
      ${s.sprecher ? `<p class="sprecher">🎙 «${esc(s.sprecher)}»</p>` : ''}
    </div>
  </div>`;
  return `
<section class="kapitel">
  <h1>${esc(titel)}</h1>
  <div class="meta">${bilder.length} Szenen · Dauer ${dauer} · Transkriptsprache Englisch (Whisper small, lokal)</div>
  <h2>Befehls-Inventar dieses Videos</h2>
  <table class="inventar">
    <tr><th>Befehl / Werkzeug</th><th>ab</th><th>Beobachtung</th></tr>
    ${befehle.map((b) => `<tr><td>${esc(b.name)}</td><td>${zeit(b.erster_t)}</td><td>${esc(b.kommentar)}</td></tr>`).join('')}
  </table>
</section>
${szenen.map(szeneHtml).join('\n')}`;
}

function transkriptHtml(video: string, titel: string) {
  const seg = transkript(video);
  return `
<section class="kapitel">
  <h1>Anhang — Transkript «${esc(titel)}» (vollständig)</h1>
  <div class="meta">${seg.length} Segmente, automatische Spracherkennung (Whisper small, lokal im Container — keine Cloud). Gesprochen wird Englisch; Erkennungsfehler sind möglich und nicht korrigiert (ehrliche Rohfassung).</div>
  <div class="transkript">
  ${seg.map((s) => `<p><span class="ts">[${zeit(s.a)}]</span> ${esc(s.text)}</p>`).join('\n')}
  </div>
</section>`;
}

const introSzenen = intro.flatMap((t) => t.szenen).length;
const renderSzenen = render.flatMap((t) => t.szenen).length;

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Vorform — Video-Zerlegung</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2b2924; font-size: 10pt; }
  .kapitel { page-break-before: always; padding-top: 4mm; }
  .kapitel:first-child { page-break-before: avoid; }
  h1 { font-size: 20pt; font-weight: 700; border-bottom: 2px solid #2b2924; padding-bottom: 4px; margin-bottom: 4mm; }
  h2 { font-size: 13pt; margin: 5mm 0 2mm; }
  .meta { color: #8a857a; font-size: 10pt; margin-bottom: 4mm; }
  .deckblatt h1 { border: none; font-size: 28pt; }
  .deckblatt .kasten { border: 1.5px solid #2b2924; border-radius: 8px; padding: 6mm; font-size: 11pt; line-height: 1.6; margin-top: 8mm; }
  .inventar { border-collapse: collapse; width: 100%; font-size: 9pt; }
  .inventar th, .inventar td { border: 1px solid #b9b2a4; padding: 3px 6px; text-align: left; vertical-align: top; }
  .inventar th { background: #efe9dc; }
  .szene { display: flex; gap: 5mm; page-break-inside: avoid; border-bottom: 1px solid #dcd6c8; padding: 3.5mm 0; }
  .szene img { width: 88mm; align-self: flex-start; border: 1px solid #b9b2a4; border-radius: 3px; }
  .szene .text { flex: 1; }
  .kopf { display: flex; gap: 6px; align-items: baseline; margin-bottom: 1.5mm; }
  .nr { color: #8a857a; font-size: 8.5pt; }
  .t { font-family: Menlo, monospace; font-size: 9pt; font-weight: 700; }
  .befehl { background: #2b5d8a; color: #fff; border-radius: 4px; padding: 1px 6px; font-size: 8.5pt; font-weight: 600; }
  .szene h3 { font-size: 11pt; margin-bottom: 1.5mm; }
  .szene p { line-height: 1.45; }
  .sprecher { color: #6a6458; font-style: italic; margin-top: 1.5mm; font-size: 9pt; }
  .transkript p { line-height: 1.5; margin-bottom: 1mm; }
  .ts { font-family: Menlo, monospace; color: #8a857a; font-size: 8.5pt; }
</style></head><body>

<section class="kapitel deckblatt">
  <h1>Vorform — komplette Video-Zerlegung</h1>
  <div class="meta">vorform.com · beide Demovideos · Stand 09.07.2026 · Beilage zur KosmoOrbit-Version 0.6.4</div>
  <div class="kasten">
    <b>Was dieses Dokument ist:</b> beide öffentlichen Vorform-Demovideos, vollständig
    zerlegt — <b>${introSzenen} Szenen</b> aus dem Intro (8 min) und <b>${renderSzenen} Szenen</b>
    aus dem Render-Workflow (23 min). Jede Szene: Bild + Zeitstempel + erkannter
    Befehl + Beschrieb dessen, was der Demonstrator gerade tut + der gesprochene
    Kommentar an dieser Stelle. Am Anfang jedes Videos steht das Befehls-Inventar,
    am Ende des Dokuments das vollständige Transkript beider Videos.
    <br/><br/>
    <b>Wie es entstand (ehrlich):</b> Szenen-Erkennung über Bilddifferenz (pyav, ~2
    Abtastungen/s, Zwangsschnitt alle 12 s in ruhigen Passagen), Tonspur lokal mit
    Whisper (small) transkribiert, jedes Szenenbild von Claude gelesen und
    beschrieben. Die Analyse (warum Vorform so funktioniert und was KosmoOrbit
    daraus übernimmt) steht separat in <b>docs/VORFORM-UI-KONZEPT.md</b>.
  </div>
</section>
${videoHtml('intro', 'Video 1 — «Vorform Intro» (Produkt-Demo)', '7:57', intro)}
${videoHtml('render', 'Video 2 — «Vorform Render» (kompletter Workflow)', '23:04', render)}
${transkriptHtml('intro', 'Vorform Intro')}
${transkriptHtml('render', 'Vorform Render')}
</body></html>`;

writeFileSync(`${SRC}/VORFORM-ZERLEGUNG.html`, html);

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});
const page = await browser.newPage();
await page.goto(`file://${SRC}/VORFORM-ZERLEGUNG.html`, { waitUntil: 'networkidle' });
await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="width:100%;text-align:center;font-size:8px;color:#8a857a;font-family:Menlo,monospace;">Vorform — Video-Zerlegung (Beilage 0.6.4) · Seite <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: '10mm', bottom: '14mm', left: '11mm', right: '11mm' },
});
await browser.close();
console.log(`PDF: ${OUT}`);
