import type { KosmoDoc } from '../model/doc';
import { derivePlan, type PlanGraphic } from '../derive/plan';
import { deriveDimensions, type DimensionSet } from '../derive/dimensions';

/**
 * DXF-Export des Grundrisses (V1.6 Block G — Interop AutoCAD/Rhino/
 * Vectorworks). Der Grundriss ist ohnehin schon als reine Geometrie
 * abgeleitet (`derivePlan` → Regionen/Linien/Bögen/Achsen/Texte in Welt-mm);
 * hier wird genau diese Geometrie in ein DXF geschrieben — dieselbe Quelle
 * wie der SVG/PDF-Plan, nur im CAD-Austauschformat.
 *
 * v0.7.1 Stream 3A (DXF-Konsolidierung): dies ist jetzt der EINZIGE
 * DXF-Exporter des Kernels. Die früher zweite, `@tarikjabiri/dxf`-basierte
 * Ableitung (`derive/dxf.ts`, `exportDxf`) ist entfernt — sie war der
 * einzige Codepfad, der echte Bemassungsketten (`deriveDimensions`)
 * schrieb, aber weder y-spiegelte noch einen Rückweg (Import) hatte. Diese
 * Bemassungs-Emission lebt jetzt HIER, auf `LAYER_BEMASSUNG`, MIT
 * y-Spiegelung wie alle anderen Elemente (siehe `planGraphicToDxf` unten).
 *
 * Zielformat: **AutoCAD R12 (AC1009)** als ASCII-DXF — der kleinste
 * gemeinsame Nenner, den AutoCAD, Rhino, Vectorworks, BricsCAD und QCAD
 * verlässlich importieren. R12 braucht (anders als R2000) keine Entity-
 * Handles und keine Subklassen-Marker, ist damit am robustesten
 * einlesbar; per **ezdxf-Audit** verifiziert (0 Fehler). Einheit: mm
 * (`$INSUNITS = 4`). Flächen werden als geschlossene POLYLINE geschrieben
 * (R12 kennt LWPOLYLINE noch nicht).
 *
 * Koordinaten: CAD ist y-nach-oben. Der Plan lebt in Welt-mm mit y-nach-unten
 * (Bildschirm), der SVG-Renderer spiegelt für «Norden oben». Damit ein in
 * AutoCAD geöffnetes DXF **gleich orientiert** ist wie der Plan am Schirm,
 * wird y hier ebenso gespiegelt (`dxfY = -weltY`).
 *
 * Ehrlich (Owner-Mandat): das ist ein **2D-Grundriss-Austausch** (Linien,
 * Polylinien, Text auf semantischen Layern) — kein volles BIM. Für Bauteile
 * mit Eigenschaften bleibt IFC der Weg; DXF ist die scharfe 2D-Brücke.
 */

/** Ein DXF-Layer: Name + AutoCAD-Color-Index (ACI) für lesbare Trennung. */
interface DxfLayer {
  name: string;
  aci: number;
}

/**
 * Semantische Plan-Klassen → Layer. Erste Treffer-Regel gewinnt (Reihenfolge
 * = Priorität), damit z.B. eine geschnittene tragende Wand auf TRAGEND landet
 * und nicht auf einem allgemeineren Layer. Fällt nichts, kommt sie auf «0».
 */
/** Beschlag-Katalog (S0 v0.7.3 §D6 + S2 v0.7.5): EIN gemeinsamer Layer für
 * Linien UND Texte mit Klasse `beschlag` — s. `layerFuer()`/die
 * Text-Emission unten (v0.7.5: Texte routen jetzt ebenfalls über
 * `layerFuer`, vorher pauschal `LAYER_TEXT`, s. Beschlag-S2-Nachtrag). */
const LAYER_BESCHLAG: DxfLayer = { name: 'BESCHLAG', aci: 5 };
const LAYER_REGELN: { treffer: string; layer: DxfLayer }[] = [
  { treffer: 'stuetze', layer: { name: 'STUETZEN', aci: 1 } },
  { treffer: 'tragend', layer: { name: 'TRAGEND', aci: 1 } },
  { treffer: 'daemmung', layer: { name: 'DAEMMUNG', aci: 8 } },
  { treffer: 'renovation-neu', layer: { name: 'NEUBAU', aci: 1 } },
  { treffer: 'renovation-abbruch', layer: { name: 'ABBRUCH', aci: 2 } },
  { treffer: 'fenster', layer: { name: 'FENSTER', aci: 4 } },
  { treffer: 'tuer', layer: { name: 'TUEREN', aci: 4 } },
  { treffer: 'bruchlinie', layer: { name: 'BRUCHLINIE', aci: 8 } },
  { treffer: 'lauflinie', layer: { name: 'TREPPE', aci: 3 } },
  { treffer: 'stufe', layer: { name: 'TREPPE', aci: 3 } },
  { treffer: 'projection', layer: { name: 'PROJEKTION', aci: 8 } },
  { treffer: 'cut', layer: { name: 'SCHNITT', aci: 7 } },
  // Beschlag-Katalog S0 (v0.7.3 §D6): eigener Layer, VOR 'symbol' — Beschlag-
  // Linien tragen zusätzlich die Klasse 'symbol' (s. `derive/plan.ts`), die
  // BESCHLAG-Regel muss darum zuerst greifen.
  { treffer: 'beschlag', layer: LAYER_BESCHLAG },
  { treffer: 'symbol', layer: { name: 'SYMBOLE', aci: 5 } },
];
const LAYER_TEXT: DxfLayer = { name: 'TEXT', aci: 2 };
const LAYER_ACHSEN: DxfLayer = { name: 'ACHSEN', aci: 6 };
const LAYER_BEMASSUNG: DxfLayer = { name: 'BEMASSUNG', aci: 2 };
const LAYER_DEFAULT: DxfLayer = { name: '0', aci: 7 };

function layerFuer(classes: string[]): DxfLayer {
  if (classes.includes('bemassung')) return LAYER_BEMASSUNG;
  for (const r of LAYER_REGELN) {
    if (classes.includes(r.treffer)) return r.layer;
  }
  return LAYER_DEFAULT;
}

/**
 * Layer für Beschriftungen (`plan.texte`): bewusst NICHT `layerFuer()`
 * (dessen Fallback ist Layer «0», nicht TEXT — für Beschriftungen falsch).
 * Einzige Sonderregel bisher: Beschlag-Katalog-Text (S0 BRH-Etikett, S2
 * Katalog-Namen, Klasse `beschlag`) landet — wie die Beschlag-LINIEN — auf
 * Layer BESCHLAG statt TEXT, damit der Layer je Werkplan-Öffnung ALLE
 * zugehörigen Beschlag-Infos bündelt. Alle anderen Beschriftungen
 * (Aussparungs-Koten, Achsköpfe, Etiketten, …) bleiben unverändert auf TEXT.
 */
function layerFuerText(classes: string[]): DxfLayer {
  if (classes.includes('beschlag')) return LAYER_BESCHLAG;
  return LAYER_TEXT;
}

/** DXF-Zahl: endlich, auf 1/1000 mm gerundet, «-0» normalisiert. */
function n(v: number): string {
  if (!Number.isFinite(v)) return '0';
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
}

/** Ein Gruppencode-Paar (Code, Wert) als zwei DXF-Zeilen. */
function paar(code: number, wert: string | number): string {
  return `${code}\n${wert}\n`;
}

class DxfSchreiber {
  private out = '';
  zeile(code: number, wert: string | number): void {
    this.out += paar(code, wert);
  }
  text(): string {
    return this.out;
  }
}

/**
 * Serialisiert den Grundriss eines Geschosses als DXF-Text (R2000/AC1015).
 * Reine Funktion — kein DOM, keine Datei; der Aufrufer legt den Blob an.
 * Bemassungsketten kommen aus `deriveDimensions` (dieselbe Ableitung wie
 * die SVG-Bemassung) und fliessen additiv in `planGraphicToDxf`.
 */
export function planToDxf(doc: KosmoDoc, storeyId: string): string {
  const plan = derivePlan(doc, storeyId);
  const dims = deriveDimensions(doc, storeyId);
  return planGraphicToDxf(plan, dims);
}

/**
 * Kern: aus einem bereits abgeleiteten PlanGraphic (+ optionalen
 * Bemassungsketten) einzeln testbar. `dims` fehlt bewusst optional — ein
 * roher PlanGraphic-Literal (wie in den Struktur-Tests) bleibt ohne
 * Bemassung gültig.
 */
export function planGraphicToDxf(plan: PlanGraphic, dims?: DimensionSet): string {
  const y = (v: number) => -v; // CAD y-nach-oben, Norden oben (wie SVG)

  // Alle vorkommenden Layer einsammeln (die Tabelle muss sie deklarieren).
  const layer = new Map<string, DxfLayer>();
  const merke = (l: DxfLayer) => {
    if (!layer.has(l.name)) layer.set(l.name, l);
  };
  merke(LAYER_DEFAULT);
  for (const r of plan.regions) merke(layerFuer(r.classes));
  for (const l of plan.lines) merke(layerFuer(l.classes));
  for (const a of plan.arcs) merke(layerFuer(a.classes));
  for (const t of plan.texte) merke(layerFuerText(t.classes));
  if (plan.axes.length) merke(LAYER_ACHSEN);
  if (dims && dims.chains.length) merke(LAYER_BEMASSUNG);

  const s = new DxfSchreiber();

  // HEADER — Version + Einheit (mm).
  s.zeile(0, 'SECTION');
  s.zeile(2, 'HEADER');
  s.zeile(9, '$ACADVER');
  s.zeile(1, 'AC1009');
  s.zeile(9, '$INSUNITS');
  s.zeile(70, 4);
  s.zeile(0, 'ENDSEC');

  // TABLES — Layer-Tabelle (Name + Farbe).
  s.zeile(0, 'SECTION');
  s.zeile(2, 'TABLES');
  s.zeile(0, 'TABLE');
  s.zeile(2, 'LAYER');
  s.zeile(70, layer.size);
  for (const l of layer.values()) {
    s.zeile(0, 'LAYER');
    s.zeile(2, l.name);
    s.zeile(70, 0); // Flags: sichtbar, nicht gesperrt
    s.zeile(62, l.aci); // Farbe (ACI)
    s.zeile(6, 'CONTINUOUS'); // Linientyp
  }
  s.zeile(0, 'ENDTAB');
  s.zeile(0, 'ENDSEC');

  // ENTITIES.
  s.zeile(0, 'SECTION');
  s.zeile(2, 'ENTITIES');

  const linie = (ax: number, ay: number, bx: number, by: number, layerName: string) => {
    s.zeile(0, 'LINE');
    s.zeile(8, layerName);
    s.zeile(10, n(ax));
    s.zeile(20, n(y(ay)));
    s.zeile(30, 0);
    s.zeile(11, n(bx));
    s.zeile(21, n(y(by)));
    s.zeile(31, 0);
  };

  // Regionen → geschlossene POLYLINE je Ring (Umriss + Löcher). R12-Form:
  // POLYLINE (66=1 «Vertices folgen», 70=1 «geschlossen») + VERTEX* + SEQEND.
  for (const r of plan.regions) {
    const lay = layerFuer(r.classes);
    for (const ring of r.rings) {
      if (ring.length < 2) continue;
      s.zeile(0, 'POLYLINE');
      s.zeile(8, lay.name);
      s.zeile(66, 1); // Vertices folgen
      s.zeile(70, 1); // 1 = geschlossen
      // Platzhalter-Basispunkt (bei POLYLINE Konvention 0/0/0).
      s.zeile(10, 0);
      s.zeile(20, 0);
      s.zeile(30, 0);
      for (const p of ring) {
        s.zeile(0, 'VERTEX');
        s.zeile(8, lay.name);
        s.zeile(10, n(p.x));
        s.zeile(20, n(y(p.y)));
        s.zeile(30, 0);
      }
      s.zeile(0, 'SEQEND');
      s.zeile(8, lay.name);
    }
  }

  // Linien → LINE.
  for (const l of plan.lines) {
    linie(l.a.x, l.a.y, l.b.x, l.b.y, layerFuer(l.classes).name);
  }

  // Bögen → ARC. DXF-Winkel sind in Grad, CCW ab +x. Der Plan spiegelt y,
  // daher wird der Winkelsinn gespiegelt: aus [start,end] wird [-end,-start].
  for (const a of plan.arcs) {
    const grad = (rad: number) => (((-rad * 180) / Math.PI) % 360 + 360) % 360;
    s.zeile(0, 'ARC');
    s.zeile(8, layerFuer(a.classes).name);
    s.zeile(10, n(a.center.x));
    s.zeile(20, n(y(a.center.y)));
    s.zeile(30, 0);
    s.zeile(40, n(a.radius));
    s.zeile(50, n(grad(a.endAngle)));
    s.zeile(51, n(grad(a.startAngle)));
  }

  // Rasterachsen → LINE (ACHSEN) + Achslabel als TEXT an beiden Enden.
  for (const ax of plan.axes) {
    linie(ax.a.x, ax.a.y, ax.b.x, ax.b.y, LAYER_ACHSEN.name);
    for (const end of [ax.a, ax.b]) {
      s.zeile(0, 'TEXT');
      s.zeile(8, LAYER_ACHSEN.name);
      s.zeile(10, n(end.x));
      s.zeile(20, n(y(end.y)));
      s.zeile(30, 0);
      s.zeile(40, 250); // Texthöhe mm
      s.zeile(1, dxfText(ax.label));
      s.zeile(72, 1); // horizontal zentriert
      s.zeile(11, n(end.x));
      s.zeile(21, n(y(end.y)));
      s.zeile(31, 0);
    }
  }

  // Beschriftungen → TEXT.
  for (const t of plan.texte) {
    const dy = (t.zeile ?? 0) * 300; // Zeilenversatz in mm (wie SVG-Renderer)
    s.zeile(0, 'TEXT');
    s.zeile(8, layerFuerText(t.classes).name);
    s.zeile(10, n(t.at.x));
    s.zeile(20, n(y(t.at.y) - dy));
    s.zeile(30, 0);
    s.zeile(40, 250);
    s.zeile(1, dxfText(t.text));
  }

  // Bemassungsketten (v0.7.1 3A, portiert aus der ehemaligen zweiten
  // DXF-Ableitung `derive/dxf.ts`) → Masslinie (LINE) + Ticks (LINE) +
  // zentrierter Text (TEXT) je Kette, alles auf LAYER_BEMASSUNG, MIT
  // y-Spiegelung wie jedes andere Element hier (über `linie()`/`y()`).
  // Stabile Sortierung (Achse, Lage, erster Tick) — `deriveDimensions`
  // liefert bereits deterministische Ketten/Ticks, die Sortierung ist
  // zusätzliche Absicherung für den Determinismus-Test.
  if (dims && dims.chains.length) {
    const textH = 260; // Texthöhe mm (massstabsneutral, wie der Q30-Vorgänger)
    const tick = 80; // Tick-Strich Halblänge mm
    const ketten = [...dims.chains].sort((a, b) => {
      if (a.axis !== b.axis) return a.axis.localeCompare(b.axis);
      if (a.offset !== b.offset) return a.offset - b.offset;
      return a.ticks[0]! - b.ticks[0]!;
    });
    for (const c of ketten) {
      const ticks = [...c.ticks].sort((p, q) => p - q);
      const t0 = ticks[0]!;
      const t1 = ticks[ticks.length - 1]!;
      const massText = (a: number, b: number) => {
        // ASCII-sicheres Pendant zu `dimensionLabel` (SIA-Hochzahl für den
        // mm-Rest): dxfText() würde die Unicode-Hochziffer sonst stillos
        // tilgen (ASCII-Purge) und damit den mm-Rest verlieren — ein
        // Dezimalpunkt bleibt lesbar UND verlustfrei.
        const mm = Math.round(Math.abs(b - a));
        const cm = Math.floor(mm / 10);
        const rest = mm % 10;
        return rest === 0 ? String(cm) : `${cm}.${rest}`;
      };
      if (c.axis === 'x') {
        linie(t0, c.offset, t1, c.offset, LAYER_BEMASSUNG.name);
        for (const t of ticks) {
          linie(t - tick, c.offset - tick, t + tick, c.offset + tick, LAYER_BEMASSUNG.name);
        }
        for (let i = 0; i < ticks.length - 1; i++) {
          const mid = (ticks[i]! + ticks[i + 1]!) / 2;
          s.zeile(0, 'TEXT');
          s.zeile(8, LAYER_BEMASSUNG.name);
          s.zeile(10, n(mid));
          s.zeile(20, n(y(c.offset + 120)));
          s.zeile(30, 0);
          s.zeile(40, textH);
          s.zeile(1, dxfText(massText(ticks[i]!, ticks[i + 1]!)));
          s.zeile(72, 1); // horizontal zentriert
          s.zeile(11, n(mid));
          s.zeile(21, n(y(c.offset + 120)));
          s.zeile(31, 0);
        }
      } else {
        linie(c.offset, t0, c.offset, t1, LAYER_BEMASSUNG.name);
        for (const t of ticks) {
          linie(c.offset - tick, t - tick, c.offset + tick, t + tick, LAYER_BEMASSUNG.name);
        }
        for (let i = 0; i < ticks.length - 1; i++) {
          const mid = (ticks[i]! + ticks[i + 1]!) / 2;
          s.zeile(0, 'TEXT');
          s.zeile(8, LAYER_BEMASSUNG.name);
          s.zeile(10, n(c.offset - 120));
          s.zeile(20, n(y(mid)));
          s.zeile(30, 0);
          s.zeile(40, textH);
          s.zeile(50, 90); // senkrecht (CCW), wie der Q30-Vorgänger
          s.zeile(1, dxfText(massText(ticks[i]!, ticks[i + 1]!)));
          s.zeile(72, 1); // horizontal zentriert
          s.zeile(11, n(c.offset - 120));
          s.zeile(21, n(y(mid)));
          s.zeile(31, 0);
        }
      }
    }
  }

  s.zeile(0, 'ENDSEC');
  s.zeile(0, 'EOF');
  return s.text();
}

/**
 * DXF-Text ist auf ASCII/Steuerzeichen-frei angewiesen (R2000-ASCII).
 * Umlaute → ae/oe/ue, alles andere Nicht-ASCII entfällt; Zeilenumbrüche
 * würden die Gruppencode-Struktur zerreissen und werden getilgt.
 */
function dxfText(s: string): string {
  return s
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    // Mass-Typografie: × (Aussparungs-Koten «400×400») → x statt Tilgung —
    // C3-Befund: sonst verliert der Roundtrip die Massangabe im Text.
    .replace(/×/g, 'x').replace(/–/g, '-').replace(/«/g, '"').replace(/»/g, '"')
    .replace(/[\r\n]+/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x20-\x7E]/g, '');
}
