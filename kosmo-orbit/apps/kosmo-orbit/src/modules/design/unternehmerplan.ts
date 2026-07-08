import { create } from 'zustand';
import { dist, parseDxf, vergleichePlaene } from '@kosmo/kernel';
import type {
  AbgleichBefund,
  Assembly,
  DxfGraphic,
  DxfImportBericht,
  KosmoDoc,
  PlanAbgleich,
  PlanGraphic,
  Pt,
  Wall,
} from '@kosmo/kernel';

/**
 * Unternehmerplan-Laufzeitschicht (V1.6 Block C / C4a, Entscheide C-E4/C-E5
 * in `docs/SUBMISSION-KONZEPT.md`) — der DXF-Rücklauf des Unternehmers und
 * sein Abgleich mit dem Architektenplan leben AUSSCHLIESSLICH im Laufzeit-
 * Store, nie im Doc: Regel «Laufzeit ≠ Modell» (`CLAUDE.md`,
 * `modules/vis/vis-runtime.ts`). Das geparste `DxfGraphic` und der
 * `PlanAbgleich` sind reine Referenzdaten für Overlay + Diff-Karten; jede
 * tatsächliche Modelländerung läuft — wie im ganzen Repo — ausschliesslich
 * über bestätigte Karten durch `runCommand` (das ist C4b, hier NICHT
 * gebaut).
 *
 * Zwei reine Bausteine ergänzen den Store:
 * - `baueKarten` übersetzt die Befunde eines `PlanAbgleich` zweistufig
 *   ehrlich (C-E4): Stufe 1 nur für geometrisch sichere, konservativ
 *   eingegrenzte Fälle (Command-Kandidat, Bau folgt in C4b); alles andere
 *   — inkl. der dokumentierten Aussparungs-Vokabular-Lücke aus
 *   `derive/planabgleich.ts` — ist Stufe 2 (Markierung, Architekt
 *   entscheidet).
 * - `importBerichtText` ist der ehrliche Ein-Absatz-Bericht («n von m
 *   Abweichungen als Vorschlag, Rest markiert») inkl. Match-Quote,
 *   unklassierten Layern, unaufgelösten Blöcken und Ausrichtungs-Status.
 */

interface UnternehmerplanState {
  dxf: DxfGraphic | null;
  abgleich: PlanAbgleich | null;
  dateiname: string | null;
  overlaySichtbar: boolean;
  /** Parse-/Abgleich-Fehler als String — `laden` wirft NIE. */
  fehler: string | null;
  /** Parst `dxfText`, vergleicht gegen `plan` (bereits abgeleiteter
   * Architektenplan des Aufrufers) und legt das Ergebnis ab. Ein Fehler
   * beim Parsen/Vergleichen wird abgefangen und landet ausschliesslich in
   * `fehler` — kein throw, keine halb gefüllte Ablage. */
  laden: (dateiname: string, dxfText: string, plan: PlanGraphic) => void;
  /** Wirft den geladenen Unternehmerplan komplett weg (zurück auf den
   * Ausgangszustand) — z.B. wenn der Architekt den Import abbricht. */
  verwerfen: () => void;
  /** Schaltet den Referenz-Overlay (C-E5) sichtbar/unsichtbar. */
  overlayUmschalten: () => void;
}

const ANFANGSZUSTAND = {
  dxf: null,
  abgleich: null,
  dateiname: null,
  overlaySichtbar: false,
  fehler: null,
} satisfies Omit<UnternehmerplanState, 'laden' | 'verwerfen' | 'overlayUmschalten'>;

export const useUnternehmerplan = create<UnternehmerplanState>((set) => ({
  ...ANFANGSZUSTAND,
  laden: (dateiname, dxfText, plan) => {
    try {
      const dxf = parseDxf(dxfText);
      const abgleich = vergleichePlaene(plan, dxf);
      set({ dxf, abgleich, dateiname, fehler: null });
    } catch (e) {
      set({
        dxf: null,
        abgleich: null,
        dateiname: null,
        overlaySichtbar: false,
        fehler: e instanceof Error ? e.message : String(e),
      });
    }
  },
  verwerfen: () => set({ ...ANFANGSZUSTAND }),
  overlayUmschalten: () => set((s) => ({ overlaySichtbar: !s.overlaySichtbar })),
}));

/** Eine Diff-Karte für die Kosmo-Panel-Anzeige (Bau der UI/Commands: C4b). */
export interface UnternehmerKarte {
  id: string;
  stufe: 1 | 2;
  titel: string;
  detail: string;
  befund: AbgleichBefund;
}

/**
 * Stufe-1-Klassen (C-E4, konservativ): nur die Bauteilarten, deren
 * 2D-Analogon zu `erkenneWand`/`design.verschieben` sicher genug ist, um
 * ohne weitere Prüfung als Command-Kandidat vorgeschlagen zu werden. Fenster/
 * Türen/Treppen/Aussparungen/unklassierte Layer sind bewusst NICHT dabei —
 * lieber eine kleine, verlässliche Stufe 1 als eine übergriffige.
 */
const STUFE1_KLASSEN: ReadonlySet<string> = new Set(['tragend', 'stuetze', 'daemmung']);
const STUFE1_MIN_KONFIDENZ = 0.8;

/** C-E4: nur `verschoben`-Befunde mit hoher Konfidenz auf einer der drei
 * konservativen Klassen werden Stufe 1. Alles andere — `neu`/`entfernt`/
 * `text-geaendert`, unklassierte Layer, und jeder Aussparungs-Fall (der wegen
 * der in `derive/planabgleich.ts` dokumentierten Vokabular-Lücke ohnehin nie
 * als `verschoben` auf `aussparung` erkannt wird) — ist Stufe 2. */
function istStufe1(befund: AbgleichBefund): boolean {
  return (
    befund.art === 'verschoben' &&
    befund.konfidenz >= STUFE1_MIN_KONFIDENZ &&
    STUFE1_KLASSEN.has(befund.klasse)
  );
}

const KLASSEN_LABEL: Record<string, string> = {
  tragend: 'Tragende Wand',
  stuetze: 'Stütze',
  daemmung: 'Dämmschicht',
  'renovation-neu': 'Neubauteil',
  'renovation-abbruch': 'Abbruchteil',
  fenster: 'Fenster',
  tuer: 'Tür',
  treppe: 'Treppe',
  bruchlinie: 'Bruchlinie',
  projection: 'Projektionslinie',
  cut: 'Schnittlinie',
  symbol: 'Symbol',
  bemassung: 'Bemassung',
  achse: 'Achse',
  text: 'Text',
  aussparung: 'Aussparung',
  unklassiert: 'unklassiertes Element',
};

function klasseLabel(klasse: string): string {
  return KLASSEN_LABEL[klasse] ?? klasse;
}

function konfidenzProzent(konfidenz: number): number {
  return Math.round(konfidenz * 100);
}

function distanzMm(delta: { x: number; y: number } | undefined): number {
  if (!delta) return 0;
  return Math.round(Math.hypot(delta.x, delta.y));
}

function ortText(befund: AbgleichBefund): string {
  const p = befund.segment?.a ?? befund.text?.at;
  if (!p) return '';
  return `bei (${Math.round(p.x)}, ${Math.round(p.y)}) mm`;
}

function layerText(befund: AbgleichBefund): string {
  return befund.layer ? ` auf Layer ${befund.layer}` : '';
}

/** Titel + Detail je Befundart — konkret, mit Konfidenz und Fundort. */
function titelUndDetail(
  befund: AbgleichBefund,
  stufe: 1 | 2,
  bericht: DxfImportBericht,
): { titel: string; detail: string } {
  const label = klasseLabel(befund.klasse);
  const pct = konfidenzProzent(befund.konfidenz);
  const ort = ortText(befund);

  switch (befund.art) {
    case 'verschoben': {
      const mm = distanzMm(befund.delta);
      const titel = `${label} um ${mm} mm verschoben (Konfidenz ${pct} %)`;
      const detail =
        stufe === 1
          ? `Vorschlag: Bauteil auf die Unternehmer-Position nachführen${layerText(befund)}, ${ort}. Command-Vorschlag folgt (Batch C4b) — bis dahin nur markiert.`
          : `Konfidenz unter ${Math.round(STUFE1_MIN_KONFIDENZ * 100)} % oder Klasse ausserhalb der sicheren Liste (tragend/Stütze/Dämmung)${layerText(befund)}, ${ort}. Architekt prüft und zeichnet selbst.`;
      return { titel, detail };
    }
    case 'neu': {
      const titel = `Neu im Unternehmerplan: ${label}${layerText(befund)}`;
      let detail = `Konfidenz ${pct} %, ${ort}. Im Architektenplan nicht vorhanden — Kosmo markiert die Stelle, entscheidet nicht automatisch.`;
      if (befund.klasse === 'unklassiert' && befund.layer && bericht.layerUnklassiert.includes(befund.layer)) {
        detail += ' Layer im Import-Bericht als unklassiert geführt.';
      }
      return { titel, detail };
    }
    case 'entfernt': {
      const titel = `Fehlt im Unternehmerplan: ${label}`;
      const detail = `Konfidenz ${pct} %, ${ort}. Im Architektenplan vorhanden, im Unternehmerplan nicht wiedergefunden — vor Übernahme prüfen, ob bewusst entfallen.`;
      return { titel, detail };
    }
    case 'text-geaendert': {
      const alt = befund.text?.alt ?? '';
      const neu = befund.text?.neu ?? '';
      const titel = `Text geändert: „${alt}" → „${neu}"`;
      const detail = `Konfidenz ${pct} %, ${ort}. Textinhalt weicht ab (z.B. Keynote/Etikett) — Architekt entscheidet über Übernahme.`;
      return { titel, detail };
    }
  }
}

/**
 * Übersetzt die Befunde eines `PlanAbgleich` in Diff-Karten (C-E4).
 * Deterministisch: die `id` folgt der Reihenfolge von `abgleich.befunde`
 * (bereits deterministisch aus `vergleichePlaene`, s. dortiger
 * Determinismus-Test) — `up-1`, `up-2`, … Reine Funktion, keine
 * Store-/DOM-Abhängigkeit.
 */
export function baueKarten(abgleich: PlanAbgleich, bericht: DxfImportBericht): UnternehmerKarte[] {
  return abgleich.befunde.map((befund, index) => {
    const stufe: 1 | 2 = istStufe1(befund) ? 1 : 2;
    const { titel, detail } = titelUndDetail(befund, stufe, bericht);
    return { id: `up-${index + 1}`, stufe, titel, detail, befund };
  });
}

/**
 * Ehrlicher Ein-Absatz-Bericht: wie viele Abweichungen automatisch als
 * Vorschlag erkannt wurden (Stufe 1) vs. markiert (Stufe 2), die Match-Quote
 * (dieselbe Formel wie intern in `derive/planabgleich.ts`:
 * unveraendert/Segmentzahl — hier näherungsweise `unveraendert /
 * (unveraendert + Anzahl Befunde)`, da `PlanAbgleich` keine rohe
 * Unternehmer-Segmentzahl mehr mitträgt), die unklassierten Layer namentlich,
 * nicht aufgelöste Blöcke und den Ausrichtungs-Status. Reine Funktion.
 */
export function importBerichtText(bericht: DxfImportBericht, abgleich: PlanAbgleich): string {
  const gesamtAnzahl = abgleich.befunde.length;
  const vorschlagAnzahl = abgleich.befunde.filter(istStufe1).length;
  const segmentzahl = abgleich.unveraendert + gesamtAnzahl;
  const quoteProzent = segmentzahl > 0 ? Math.round((abgleich.unveraendert / segmentzahl) * 100) : 100;

  const saetze: string[] = [];
  saetze.push(
    gesamtAnzahl === 0
      ? 'Keine Abweichungen zum Architektenplan gefunden.'
      : `${vorschlagAnzahl} von ${gesamtAnzahl} Abweichungen als Vorschlag erkannt, Rest markiert.`,
  );
  saetze.push(`Match-Quote (unveränderte Segmente/Gesamtvergleich): ${quoteProzent} %.`);
  saetze.push(
    bericht.layerUnklassiert.length > 0
      ? `Unklassierte Layer: ${bericht.layerUnklassiert.join(', ')}.`
      : 'Alle Layer klassiert.',
  );
  saetze.push(
    bericht.bloeckeNichtAufgeloest > 0
      ? `${bericht.bloeckeNichtAufgeloest} Block-Referenz(en) nicht aufgelöst (INSERT).`
      : 'Keine unaufgelösten Blöcke.',
  );
  saetze.push(
    abgleich.ausrichtung.geschaetzt
      ? `Nullpunkt-Versatz geschätzt (dx=${abgleich.ausrichtung.dx} mm, dy=${abgleich.ausrichtung.dy} mm), Rotation nicht geschätzt.`
      : abgleich.hinweise.some((h) => h.includes('nicht schätzbar'))
        ? 'Ausrichtung nicht schätzbar — manuelles Einpassen nötig.'
        : 'Kein Ausrichtungsversatz nötig.',
  );
  return saetze.join(' ');
}

// ── C4b: Stufe-1-Karten anwenden (Karte → Command → runCommand) ──────────
//
// Der eiserne Grundsatz (C-E4): das Modell ändert sich AUSSCHLIESSLICH über
// bestätigte Karten durch DENSELBEN `runCommand`-Weg wie ein Klick/Kosmo —
// nie still. Diese zwei reinen Funktionen bereiten das vor: Wand finden,
// Command bauen. Der eigentliche `runCommand`-Aufruf (mit Undo-Gruppe,
// Yjs-Sync, Journal) passiert in `UnternehmerplanPanel.tsx`, NICHT hier.

/** Winkeltoleranz „parallel" — ±1° in rad (grosszügiger als der 0.5°-Wert
 * der Diff-Engine selbst, weil hier zusätzlich die Rundung der
 * Poché-Rekonstruktion mit hineinspielt). */
const WAND_WINKEL_TOL_RAD = (1 * Math.PI) / 180;

/** Fallback-Wanddicke, wenn der Aufbau fehlt oder keine Schichten trägt
 * (z.B. ein von Hand kaputtes Testdokument) — konservativ grosszügig, damit
 * lieber ein Kandidat mehr gefunden wird als der Command grundlos scheitert;
 * die Mehrdeutigkeits-Regel (0/≥2 Kandidaten → null) bleibt die eigentliche
 * Sicherung gegen Fehlzuordnung. */
const WAND_DICKE_FALLBACK = 300;

/** Achsrichtung a→b, ungerichtet (mod π) — wie `segWinkel` in
 * `derive/planabgleich.ts`, hier lokal, weil dort nicht exportiert. */
function achsWinkel(a: Pt, b: Pt): number {
  let w = Math.atan2(b.y - a.y, b.x - a.x);
  if (w < 0) w += Math.PI;
  if (w >= Math.PI) w -= Math.PI;
  return w;
}

function winkelAbstand(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, Math.PI - d);
}

function mittelpunkt(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Wanddicke aus der Schichtsumme des Aufbaus; `WAND_DICKE_FALLBACK`, wenn
 * kein Aufbau (mehr) existiert oder er keine Schichten trägt. */
function wandDicke(doc: KosmoDoc, wand: Wall): number {
  const assembly = doc.get<Assembly>(wand.assemblyId);
  if (!assembly || assembly.layers.length === 0) return WAND_DICKE_FALLBACK;
  return assembly.layers.reduce((summe, l) => summe + l.thickness, 0);
}

/**
 * Rekonstruiert für einen `'verschoben'`-Befund die Architekten-Seite
 * (`segment − delta`, da `delta = Unternehmer − Architekt`) und sucht die
 * Wand, deren Achse (a→b) parallel dazu liegt (±1°) und deren
 * Achsmittelpunkt nahe genug am rekonstruierten Segmentmittelpunkt ist
 * (Wanddicke + 5 mm — die Poché-Aussenkante liegt seitlich versetzt zur
 * Achse, nie auf ihr). Bei 0 oder ≥2 Kandidaten `null` — ehrlich
 * mehrdeutig, lieber keine Zuordnung als eine falsche. Reine Funktion.
 */
export function findeWandFuerBefund(doc: KosmoDoc, befund: AbgleichBefund): string | null {
  if (befund.art !== 'verschoben' || !befund.segment || !befund.delta) return null;

  const architektA: Pt = { x: befund.segment.a.x - befund.delta.x, y: befund.segment.a.y - befund.delta.y };
  const architektB: Pt = { x: befund.segment.b.x - befund.delta.x, y: befund.segment.b.y - befund.delta.y };
  const winkel = achsWinkel(architektA, architektB);
  const mitte = mittelpunkt(architektA, architektB);

  const kandidaten: string[] = [];
  for (const wand of doc.byKind<Wall>('wall')) {
    const wandWinkel = achsWinkel(wand.a, wand.b);
    if (winkelAbstand(winkel, wandWinkel) > WAND_WINKEL_TOL_RAD) continue;
    const wandMitte = mittelpunkt(wand.a, wand.b);
    const abstand = dist(mitte, wandMitte);
    if (abstand > wandDicke(doc, wand) + 5) continue;
    kandidaten.push(wand.id);
  }
  return kandidaten.length === 1 ? kandidaten[0]! : null;
}

/** Der Command-Vorschlag zu einer Karte — `null`, wenn die Karte nicht
 * Stufe 1 ist, kein `'verschoben'`-Befund vorliegt, oder die Wand nicht
 * eindeutig gefunden wird (`findeWandFuerBefund`). Reine Funktion: baut nur
 * den Aufruf, führt ihn NICHT aus — das bleibt `runCommand` im UI
 * vorbehalten (C-E4, derselbe Weg wie Klick/Kosmo). */
export function commandFuerKarte(
  doc: KosmoDoc,
  karte: UnternehmerKarte,
): { id: 'design.verschieben'; params: { entityId: string; dx: number; dy: number } } | null {
  if (karte.stufe !== 1 || karte.befund.art !== 'verschoben' || !karte.befund.delta) return null;
  const wandId = findeWandFuerBefund(doc, karte.befund);
  if (!wandId) return null;
  return {
    id: 'design.verschieben',
    params: {
      entityId: wandId,
      dx: Math.round(karte.befund.delta.x),
      dy: Math.round(karte.befund.delta.y),
    },
  };
}
