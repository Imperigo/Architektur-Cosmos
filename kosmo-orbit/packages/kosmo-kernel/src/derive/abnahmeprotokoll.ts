import type { KosmoDoc, SiaPhase } from '../model/doc';
import { siaPhaseLabel } from '../model/doc';
import type { Mangel } from '../model/entities';
import { escapeXml } from './plansvg';
import { MANGEL_GEWERK_VORSCHLAEGE } from './bauablauf';

/**
 * Abnahmeprotokoll (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4,
 * Lücken-Batch 5, Owner-Hauptaufgabe K22) — Abschlussphase «Gebäudeabnahme»,
 * die es im Kernel vorher schlicht nicht gab (0 Treffer auf «Mangel/
 * Abnahmeprotokoll», s. Konzept Abschnitt 2). Gebaut nach demselben Muster
 * wie `derive/kvblatt.ts`/`derive/bauablaufblatt.ts`: EIN eigenständiges SVG,
 * reine Funktion (kein Doc-Zugriff im SVG-Baustein selbst, kein
 * `Date.now()`/`Math.random()` — Datum kommt als vorformatierter
 * String-Parameter von der App), gleiche Eingaben liefern byte-identisches
 * SVG (Golden-Test-fähig).
 *
 * A4 hoch, `viewBox="0 0 794 1123"` — dieselbe mm→px-Skala wie `kvBlattSvg`.
 *
 * EHRLICH über die eigene Grenze (Konzept Abschnitt 2, Abschluss-Tabelle,
 * Punkt e): dieses Blatt ist ein **interner Anstoss zur Schlussbegehung**,
 * KEIN rechtsgültiges Abnahmeprotokoll — die reale Abnahme (Bauherr +
 * Architekt + Unternehmer vor Ort, SIA 118) bleibt ein Realakt, den keine
 * Software ersetzt. `ABNAHME_HINWEIS` erscheint deshalb prominent im Kopf
 * UND wiederholt im Fuss, nie nur beim Export.
 *
 * Bewusst KEIN Plan-Marker: ein Overlay-Punkt im Grundriss wäre nur trivial
 * über die bestehenden Etikett-/Aussparung-Muster nachzubauen, wenn Mängel
 * einen festen Bauteil-Host hätten — haben sie bewusst nicht (s.
 * `Mangel`-Kommentar in `model/entities.ts`: ein Mangel kann mehrere Bauteile
 * betreffen oder gar keins). Der Marker bleibt darum ehrlich weg, `at` liegt
 * am Entity bereit, falls ein künftiger Batch das aufgreift.
 */

/** Der eine Ehrlichkeitssatz, der überall erscheinen muss, wo das Protokoll sichtbar wird (Panel, Blatt). */
export const ABNAHME_HINWEIS =
  'Interner Anstoss zur Schlussbegehung — kein rechtsgültiges Abnahmeprotokoll (SIA 118 Abnahme bleibt Sache der Parteien).';

export interface AbnahmeprotokollGruppe {
  gewerk: string;
  maengel: Mangel[];
}

export interface Abnahmeprotokoll {
  /** Gruppiert nach Gewerk — Reihenfolge: `MANGEL_GEWERK_VORSCHLAEGE` zuerst, unbekannte Gewerke alphabetisch danach. */
  gruppen: AbnahmeprotokollGruppe[];
  anzahlOffen: number;
  anzahlBehoben: number;
  anzahlTotal: number;
}

function gewerkIndex(gewerk: string): number {
  const i = MANGEL_GEWERK_VORSCHLAEGE.indexOf(gewerk);
  return i >= 0 ? i : MANGEL_GEWERK_VORSCHLAEGE.length;
}

/**
 * Gruppiert alle Mängel des Docs nach Gewerk und zählt offen/behoben. Reine
 * Funktion (kein `Date.now()`/`Math.random()`) — gleiche Doc-Inhalte liefern
 * dasselbe Ergebnis, unabhängig davon, wie oft sie berechnet wird.
 */
export function deriveAbnahmeprotokoll(doc: KosmoDoc): Abnahmeprotokoll {
  const alle = doc.byKind<Mangel>('mangel');
  const nachGewerk = new Map<string, Mangel[]>();
  for (const m of alle) {
    const liste = nachGewerk.get(m.gewerk);
    if (liste) liste.push(m);
    else nachGewerk.set(m.gewerk, [m]);
  }
  const gruppen: AbnahmeprotokollGruppe[] = [...nachGewerk.entries()]
    .sort(([a], [b]) => {
      const ia = gewerkIndex(a);
      const ib = gewerkIndex(b);
      return ia !== ib ? ia - ib : a.localeCompare(b, 'de-CH');
    })
    .map(([gewerk, maengel]) => ({ gewerk, maengel }));
  const anzahlOffen = alle.filter((m) => m.status === 'offen').length;
  return {
    gruppen,
    anzahlOffen,
    anzahlBehoben: alle.length - anzahlOffen,
    anzahlTotal: alle.length,
  };
}

const W = 794;
const H = 1123;
const MARGIN = 40;

const HEADER_TITLE_Y = 54;
const HEADER_META_Y = 78;
const HEADER_RULE_Y = 90;

const HINWEIS_TOP = 100;
const HINWEIS_HEIGHT = 34;
const HINWEIS_BOTTOM = HINWEIS_TOP + HINWEIS_HEIGHT;

const LISTE_TOP = HINWEIS_BOTTOM + 24;
const TABLE_HEADER_H = 20;
const GRUPPEN_HEADER_H = 22;
const ROW_H = 22;
const ORT_COL_W = 150;
const STATUS_COL_W = 90;
const FRIST_COL_W = 90;

export interface AbnahmeprotokollOptionen {
  /** Projektname für die Kopfzeile. */
  titel?: string;
  /** Vorformatiertes Datum (App liefert `toLocaleDateString('de-CH')` — KEIN `new Date()` im Kernel). */
  datum?: string;
  /** Aktuelle SIA-Teilphase des Projekts (`doc.settings.siaPhase`). */
  siaPhase?: SiaPhase;
}

function statusText(m: Mangel): string {
  return m.status === 'behoben' ? `Behoben${m.behobenAm ? ` (${m.behobenAm})` : ''}` : 'Offen';
}

/**
 * Baut EIN eigenständiges, druckfähiges A4-SVG (`viewBox="0 0 794 1123"`) aus
 * einem bereits berechneten `Abnahmeprotokoll` (s. oben). Deterministisch:
 * gleiche `protokoll`/`opts` ⇒ byte-identischer String.
 */
export function abnahmeprotokollSvg(protokoll: Abnahmeprotokoll, opts: AbnahmeprotokollOptionen = {}): string {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica, Arial, sans-serif">`,
  );
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);

  // ── Kopf ─────────────────────────────────────────────────────────────
  const titelZeile = `Abnahmeprotokoll${opts.titel ? ` — ${escapeXml(opts.titel)}` : ''}`;
  parts.push(
    `<text x="${MARGIN}" y="${HEADER_TITLE_Y}" font-size="22" font-weight="bold" fill="#111111">${titelZeile}</text>`,
  );

  const metaTeile: string[] = [];
  if (opts.siaPhase) metaTeile.push(escapeXml(siaPhaseLabel(opts.siaPhase)));
  if (opts.datum) metaTeile.push(escapeXml(opts.datum));
  metaTeile.push(
    `${protokoll.anzahlOffen} offen / ${protokoll.anzahlBehoben} behoben (${protokoll.anzahlTotal} total)`,
  );
  parts.push(
    `<text x="${MARGIN}" y="${HEADER_META_Y}" font-size="12.5" fill="#444444">${metaTeile.join(' · ')}</text>`,
  );
  parts.push(
    `<line x1="${MARGIN}" y1="${HEADER_RULE_Y}" x2="${W - MARGIN}" y2="${HEADER_RULE_Y}" stroke="#bbbbbb" stroke-width="1"/>`,
  );

  // ── Ehrlichkeits-Block (prominent, VOR der Mängelliste) ─────────────
  // Bewusst UNgewrappt (ein einziges <text>-Element): der Disclaimer muss als
  // zusammenhängender String im SVG auffindbar bleiben (Panel/Test-Grep),
  // nicht über mehrere Zeilen zerlegt.
  parts.push(
    `<rect x="${MARGIN}" y="${HINWEIS_TOP}" width="${W - 2 * MARGIN}" height="${HINWEIS_HEIGHT}" fill="#f6f2e6" stroke="#c9bfa0" stroke-width="1"/>`,
  );
  parts.push(
    `<text x="${MARGIN + 14}" y="${HINWEIS_TOP + 21}" font-size="10.8" font-weight="bold" fill="#111111">${escapeXml(ABNAHME_HINWEIS)}</text>`,
  );

  // ── Mängelliste, gruppiert nach Gewerk ───────────────────────────────
  if (protokoll.gruppen.length === 0) {
    parts.push(
      `<text x="${MARGIN}" y="${LISTE_TOP + 20}" font-size="13" fill="#666666">Keine Mängel erfasst — Schlussbegehung noch nicht durchgeführt.</text>`,
    );
  } else {
    const usableW = W - 2 * MARGIN;
    const beschreibungColW = usableW - ORT_COL_W - STATUS_COL_W - FRIST_COL_W;
    const ortX = MARGIN + 6;
    const beschreibungX = MARGIN + ORT_COL_W + 6;
    const statusX = MARGIN + ORT_COL_W + beschreibungColW + 6;
    const fristX = MARGIN + ORT_COL_W + beschreibungColW + STATUS_COL_W + 6;

    let y = LISTE_TOP;
    parts.push(
      `<text x="${ortX}" y="${y + 15}" font-size="11.5" font-weight="bold" fill="#111111">Ort</text>`,
    );
    parts.push(
      `<text x="${beschreibungX}" y="${y + 15}" font-size="11.5" font-weight="bold" fill="#111111">Beschreibung</text>`,
    );
    parts.push(
      `<text x="${statusX}" y="${y + 15}" font-size="11.5" font-weight="bold" fill="#111111">Status</text>`,
    );
    parts.push(
      `<text x="${fristX}" y="${y + 15}" font-size="11.5" font-weight="bold" fill="#111111">Frist</text>`,
    );
    y += TABLE_HEADER_H;
    parts.push(
      `<line x1="${MARGIN}" y1="${y}" x2="${W - MARGIN}" y2="${y}" stroke="#999999" stroke-width="1"/>`,
    );

    for (const gruppe of protokoll.gruppen) {
      parts.push(
        `<rect x="${MARGIN}" y="${y}" width="${usableW}" height="${GRUPPEN_HEADER_H}" fill="#eef3e6"/>`,
      );
      parts.push(
        `<text x="${ortX}" y="${(y + 16).toFixed(2)}" font-size="12.5" font-weight="bold" fill="#111111">${escapeXml(gruppe.gewerk)} (${gruppe.maengel.length})</text>`,
      );
      y += GRUPPEN_HEADER_H;
      for (const m of gruppe.maengel) {
        parts.push(
          `<text x="${ortX}" y="${(y + 15).toFixed(2)}" font-size="11" fill="#333333">${escapeXml(m.ort)}</text>`,
        );
        parts.push(
          `<text x="${beschreibungX}" y="${(y + 15).toFixed(2)}" font-size="11" fill="#333333">${escapeXml(m.beschreibung)}</text>`,
        );
        parts.push(
          `<text x="${statusX}" y="${(y + 15).toFixed(2)}" font-size="11" fill="${m.status === 'behoben' ? '#2f7d3f' : '#a33333'}">${escapeXml(statusText(m))}</text>`,
        );
        parts.push(
          `<text x="${fristX}" y="${(y + 15).toFixed(2)}" font-size="11" fill="#666666">${escapeXml(m.frist ?? '—')}</text>`,
        );
        parts.push(
          `<line x1="${MARGIN}" y1="${(y + ROW_H).toFixed(2)}" x2="${W - MARGIN}" y2="${(y + ROW_H).toFixed(2)}" stroke="#e2e2e2" stroke-width="1"/>`,
        );
        y += ROW_H;
      }
    }
    parts.push(
      `<rect x="${MARGIN}" y="${LISTE_TOP}" width="${usableW}" height="${(y - LISTE_TOP).toFixed(2)}" fill="none" stroke="#999999" stroke-width="1"/>`,
    );
  }

  // ── Fuss: Unterschriftenfeld (Realakt) + Ehrlichkeits-/Grenzen-Block ─
  const fussSaetze = [
    ABNAHME_HINWEIS,
    'Unterschriften (bei der realen Schlussbegehung): Bauherrschaft ____________________  Architektur ____________________  Unternehmer ____________________',
    'Grenzen: keine Rechtsgültigkeit, keine Garantiefristen-Verfolgung, keine Schlussabrechnung — die reale Abnahme (Bauherr, Architekt, Unternehmer vor Ort) bleibt ein Realakt ausserhalb der Software.',
  ];
  // Zeilenumbruch (Zeichen-Schätzung, wie `kvBlattSvg`s `wrapText`).
  const maxChars = Math.floor((W - 2 * MARGIN) / 5.4);
  const fussZeilen = fussSaetze.flatMap((satz) => wrapText(satz, maxChars));
  const footerTop = H - MARGIN - fussZeilen.length * 14;
  parts.push(
    `<line x1="${MARGIN}" y1="${footerTop - 12}" x2="${W - MARGIN}" y2="${footerTop - 12}" stroke="#bbbbbb" stroke-width="1"/>`,
  );
  fussZeilen.forEach((zeile, zi) => {
    parts.push(
      `<text x="${MARGIN}" y="${(footerTop + zi * 14).toFixed(2)}" font-size="10.5" fill="#555555">${escapeXml(zeile)}</text>`,
    );
  });

  parts.push('</svg>');
  return parts.join('');
}

/** Wortweiser Zeilenumbruch (Zeichen-Schätzung, wie `studienBerichtSvg`). */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (test.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
