/**
 * Plankopf-Overlay-Geometrie (v0.8.0 P6) — reine String-Ableitungen aus dem
 * bereits gerenderten Blatt-SVG (`sheetToSvg`), KEINE eigene Geometrie-
 * Berechnung. Grund (Owner-Auftrag P6, `docs/V080-PLANKOPF-SPEZ.md` §1.5/§5):
 * das Blatt kennt zwei Plankopf-Geometrien nebeneinander — den kompakten
 * ~120×26/31-mm-Alt-Fusskopf (`derive/sheet.ts` ALT-PFAD, kein `data-teil`)
 * und den vollen 180×55-mm-Framework-Plankopf (`<g data-teil="plankopf">`,
 * NEU-PFAD, nur wenn `sheet.plankopf`/`sheet.layout` gesetzt ist). Statt
 * beide Geometrien hier ein zweites Mal aus Kernel-Konstanten nachzubauen
 * (Doppelpfad-Risiko, s. `derive/plankopf.ts`-Kopfkommentar «kein
 * Doppelpfad»), liest dieses Modul die TATSÄCHLICH gerenderten `<rect>`-
 * Koordinaten aus dem SVG-Markup — die Klick-Hitbox bleibt dadurch
 * automatisch korrekt, auch wenn P7 die Default-Booleans der `SheetLayout`
 * umdreht (Spez §5.1): P7 muss an dieser Datei nichts nachziehen.
 *
 * Die Regex-Anker (`<g data-teil="plankopf">` bzw. `<g font-size="3">`) sind
 * wörtliche Teilstrings aus `derive/sheet.ts`/`derive/plankopf.ts` (Stand
 * v0.8.0 P4) — kein Rätselraten, direkt aus den Dateien zitiert.
 */

export interface PlankopfHitbox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** true = volles 180×55-Framework (`data-teil="plankopf"`), false = der
   * kompakte Alt-Fusskopf (~120×26/31mm, kein `data-teil`-Attribut). */
  framework: boolean;
}

export interface BlattFlaechenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function ersterRectNachMarker(
  markup: string,
  marker: string,
  rectMuster: RegExp,
): { x: number; y: number; width: number; height: number } | null {
  const idx = markup.indexOf(marker);
  if (idx < 0) return null;
  const treffer = rectMuster.exec(markup.slice(idx + marker.length));
  if (!treffer) return null;
  return {
    x: Number(treffer[1]),
    y: Number(treffer[2]),
    width: Number(treffer[3]),
    height: Number(treffer[4]),
  };
}

// Framework-Plankopf: `plankopfSvg()` (`derive/plankopf.ts`) öffnet die
// Gruppe mit `<g data-teil="plankopf">` und zeichnet als ERSTES Element den
// 180×55-Aussenrahmen (`fill="white"`) — fixe Masse, PLANKOPF_MM (Spez §1.5).
const FRAMEWORK_MARKER = '<g data-teil="plankopf">';
const FRAMEWORK_RECT = /<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="(180)" height="(55)"/;

// Alt-Fusskopf: `derive/sheet.ts` ALT-PFAD öffnet mit `<g font-size="3">` und
// zeichnet als ERSTES Element die Box (`kw=120`, `kh` 26 oder 31 je nach
// `plankopfStammdatenZeile`) — kein `data-teil`, das unterscheidet ihn vom
// Framework-Pfad.
const ALT_MARKER = '<g font-size="3">';
const ALT_RECT = /<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="(120)" height="(26|31)"/;

/**
 * Findet die Plankopf-Hitbox im gerenderten Blatt-SVG — Framework hat
 * Vorrang (ein Blatt zeigt nie beide Pfade gleichzeitig, `derive/sheet.ts`-
 * Ersetzungslogik), sonst der Alt-Fusskopf. `null` nur bei leerem/kaputtem
 * Markup (z.B. kein aktives Blatt).
 */
export function findePlankopfHitbox(svgMarkup: string): PlankopfHitbox | null {
  const framework = ersterRectNachMarker(svgMarkup, FRAMEWORK_MARKER, FRAMEWORK_RECT);
  if (framework) return { ...framework, framework: true };
  const alt = ersterRectNachMarker(svgMarkup, ALT_MARKER, ALT_RECT);
  if (alt) return { ...alt, framework: false };
  return null;
}

// Blattrahmen (Zeichenflächen-Umrandung): IMMER das erste `<rect>` mit
// x/y-Attributen UND `fill="none"` im gesamten Markup — sowohl der
// Framework- als auch der Alt-Pfad zeichnen den Rahmen als allererstes
// Element nach dem Papier-Hintergrund (der selbst KEINE x/y-Attribute trägt,
// s. `derive/sheet.ts` `<rect width="…" height="…" fill="…"/>`), vor jeder
// Platzierungs-Geometrie — kollisionsfrei für die Vorschau-Overlays unten.
const RAHMEN_RECT = /<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="(-?[\d.]+)" height="(-?[\d.]+)" fill="none"/;

/** Zeichenflächen-/Rahmen-Rechteck (Papier-mm) für die reinen Vorschau-
 * Overlays «Zonen»/«Aussenbemassung» (P6, NIE im Doc/Export, s. Spez §8/§9
 * V-K8) — `null` nur bei leerem/kaputtem Markup. */
export function findeRahmenRect(svgMarkup: string): BlattFlaechenRect | null {
  const m = RAHMEN_RECT.exec(svgMarkup);
  if (!m) return null;
  return { x: Number(m[1]), y: Number(m[2]), width: Number(m[3]), height: Number(m[4]) };
}
