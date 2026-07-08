import type { Pt } from '../model/units';
import type { StudienKoerper, StudienVariante } from './volumenstudie';
import { BESONNUNG_HINWEIS, type BesonnungsKennwert } from './besonnungsvergleich';
import { PROGRAMM_ERFUELLUNG_HINWEIS, type ProgrammErfuellung } from './programmerfuellung';
import { escapeXml } from './plansvg';

/**
 * Grundlagenstudie-Bericht (Wettbewerb-Konzept D-E8, `docs/WETTBEWERB-KONZEPT.md`
 * Batch D5) — additives Export-Artefakt: EIN eigenständiges, druckfähiges
 * A4-quer-SVG, das die Extremvarianten aus `generiereVolumenstudien`
 * nebeneinander stellt (Mini-Footprint je Variante, Kennwert-Zeilen,
 * Ehrlichkeits-Fusszeile). Kein neuer KosmoPublish-Blatttyp (das bleibt eine
 * spätere Ausbaustufe, D-E8) — reine Funktion, kein Doc-Zugriff, kein
 * `Date.now()`/`Math.random()`: gleiche Eingaben liefern byte-identisches
 * SVG.
 *
 * EHRLICHE GRENZE: dieser Bericht ist ein Anstoss, kein Entwurf — er zeigt
 * NUR, was die übergebenen Varianten/Kennwerte tatsächlich hergeben. Fehlt
 * ein Wert (kein Standort ⇒ keine `besonnung`-Liste, kein Raumprogramm ⇒
 * keine `programm`-Liste, `v.besonnung === null` ⇒ keine Grenzabstands-
 * Näherung für diese Variante), erscheint im Bericht ein «—» statt einer
 * erfundenen Zahl. Die Fusszeile schreibt `BESONNUNG_HINWEIS`/
 * `PROGRAMM_ERFUELLUNG_HINWEIS` NUR aus, wenn die jeweilige Kennwertliste
 * tatsächlich (nicht-leer) übergeben wurde.
 */

const W = 1123;
const H = 794;
const MARGIN = 32;
const HEADER_TITLE_Y = 44;
const HEADER_META_Y = 64;
const HEADER_RULE_Y = 78;
const COLUMNS_TOP = 96;
const FOOTER_TOP = H - 88; // 706
const COLUMNS_BOTTOM = FOOTER_TOP - 16; // 690
const COL_GAP = 14;
const CARD_PAD = 12;
const FOOTPRINT_BOX = 118; // px — grösste Kantenlänge über ALLE Varianten (gemeinsamer Massstab)
const ROW_LINE_H = 15;

export interface StudienBerichtOptionen {
  /** GF-Ziel in m²; null = kein Ziel gesetzt (Kopfzeile zeigt «—»). */
  zielGf: number | null;
  /** Projektname o.ä., z.B. für die Kopfzeile. */
  titel?: string;
  /** Name der aktiven Zonenregel, wenn vorhanden. */
  regelName?: string;
  /** Vorformatiertes Datum (App liefert `toLocaleDateString('de-CH')` —
   *  KEIN `new Date()` im Kernel, sonst wäre der Bericht nicht deterministisch. */
  datum?: string;
  /** Winter-Besonnungskennwerte je Variante (Reihenfolge = `varianten`),
   *  nur wenn ein Standort gesetzt ist. */
  besonnung?: BesonnungsKennwert[];
  /** Programm-Erfüllung je Variante (Reihenfolge = `varianten`), nur wenn
   *  ein Raumprogramm hinterlegt ist. */
  programm?: ProgrammErfuellung[];
}

function f1(v: number): string {
  return v.toLocaleString('de-CH', { maximumFractionDigits: 1 });
}

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function bboxVon(koerperListe: StudienKoerper[]): BBox | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const k of koerperListe) {
    for (const p of k.outline) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
  }
  if (!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

/** Mini-Footprint einer Variante: eigene BBox (Zentrierung), gemeinsame `scale`
 * (Vergleichbarkeit über alle Varianten) — kein Nord-Bezug, reine Formvergleichs-
 * Skizze, y gespiegelt wie die übrigen Plan-SVGs des Kernels (`plansvg.ts`). */
function footprintSvg(
  koerperListe: StudienKoerper[],
  scale: number,
  boxX: number,
  boxY: number,
  boxSize: number,
): string {
  const bb = bboxVon(koerperListe);
  if (!bb) return '';
  const vW = (bb.maxX - bb.minX) * scale;
  const vH = (bb.maxY - bb.minY) * scale;
  const offX = boxX + (boxSize - vW) / 2;
  const offY = boxY + (boxSize - vH) / 2;
  const punkteZu = (outline: Pt[]): string =>
    outline
      .map((p) => {
        const x = offX + (p.x - bb.minX) * scale;
        const y = offY + (bb.maxY - p.y) * scale;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  return koerperListe
    .map(
      (k) =>
        `<polygon points="${punkteZu(k.outline)}" fill="#e4e4e4" stroke="#333333" stroke-width="1"/>`,
    )
    .join('');
}

function kennwertZeilen(
  v: StudienVariante,
  besonnung: BesonnungsKennwert | null,
  programm: ProgrammErfuellung | null,
  besonnungGesetzt: boolean,
  programmGesetzt: boolean,
): string[] {
  const zeilen: string[] = [];
  zeilen.push(`Geschosse: ${v.geschosse}`);
  zeilen.push(`Höhe: ${f1(v.hoehe / 1000)} m`);
  zeilen.push(`GF: ${f1(v.gf)} m²`);

  const warnungen: string[] = [];
  if (!v.passt) warnungen.push('sprengt Höhe');
  if (v.tiefeOk === false) warnungen.push('Tiefe');
  if (warnungen.length > 0) zeilen.push(warnungen.join(' · '));

  zeilen.push(
    v.besonnung
      ? `Grenzabstand 3h (Näherung): ${v.besonnung.ok ? 'ok' : 'verfehlt'} (${f1(v.besonnung.ist / 1000)} / ${f1(v.besonnung.noetig / 1000)} m)`
      : 'Grenzabstand 3h (Näherung): —',
  );

  if (besonnungGesetzt) {
    zeilen.push(`Winter-Besonnung: ${besonnung ? `${f1(besonnung.richtwertM2)} m²` : '—'}`);
  }
  if (programmGesetzt) {
    zeilen.push(
      `Programm-Erfüllung: ${programm && programm.erfuellungProzent !== null ? `${f1(programm.erfuellungProzent)} %` : '—'}`,
    );
  }
  return zeilen;
}

/**
 * Baut EIN eigenständiges, druckfähiges A4-quer-SVG (`viewBox="0 0 1123 794"`)
 * aus den Extremvarianten (`StudienVariante[]`, `derive/volumenstudie.ts`) —
 * Anstoss-Bericht, kein Entwurf. Deterministisch: gleiche `varianten`/`opts`
 * ⇒ byte-identischer String (kein `Date.now()`/`Math.random()` im Kernel;
 * `opts.datum` kommt vorformatiert vom Aufrufer).
 */
export function studienBerichtSvg(varianten: StudienVariante[], opts: StudienBerichtOptionen): string {
  const n = varianten.length;

  // Gemeinsamer Massstab über ALLE Varianten (Vergleichbarkeit): grösste
  // Kantenlänge der globalen BBox füllt `FOOTPRINT_BOX`.
  const globalBb = bboxVon(varianten.flatMap((v) => v.koerper));
  const globalSpan = globalBb ? Math.max(globalBb.maxX - globalBb.minX, globalBb.maxY - globalBb.minY, 1) : 1;
  const scale = FOOTPRINT_BOX / globalSpan;

  const besonnungGesetzt = (opts.besonnung?.length ?? 0) > 0;
  const programmGesetzt = (opts.programm?.length ?? 0) > 0;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica, Arial, sans-serif">`,
  );
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);

  // Kopf
  const titelZeile = `Grundlagenstudie${opts.titel ? ` — ${escapeXml(opts.titel)}` : ''}`;
  parts.push(
    `<text x="${MARGIN}" y="${HEADER_TITLE_Y}" font-size="22" font-weight="bold" fill="#111111">${titelZeile}</text>`,
  );
  const metaTeile: string[] = [];
  if (opts.regelName) metaTeile.push(`aus Zonenregel «${escapeXml(opts.regelName)}»`);
  if (opts.datum) metaTeile.push(escapeXml(opts.datum));
  metaTeile.push(`Ziel-GF: ${opts.zielGf !== null ? `${f1(opts.zielGf)} m²` : '—'}`);
  parts.push(
    `<text x="${MARGIN}" y="${HEADER_META_Y}" font-size="12" fill="#444444">${metaTeile.join(' · ')}</text>`,
  );
  parts.push(
    `<line x1="${MARGIN}" y1="${HEADER_RULE_Y}" x2="${W - MARGIN}" y2="${HEADER_RULE_Y}" stroke="#bbbbbb" stroke-width="1"/>`,
  );

  // Spalten
  if (n > 0) {
    const usableW = W - 2 * MARGIN;
    const colW = (usableW - (n - 1) * COL_GAP) / n;
    const cardH = COLUMNS_BOTTOM - COLUMNS_TOP;
    varianten.forEach((v, i) => {
      const colX = MARGIN + i * (colW + COL_GAP);
      const besonnung = opts.besonnung?.find((b) => b.varianteId === v.id) ?? null;
      const programm = opts.programm?.find((p) => p.varianteId === v.id) ?? null;

      parts.push(
        `<rect x="${colX.toFixed(2)}" y="${COLUMNS_TOP}" width="${colW.toFixed(2)}" height="${cardH}" fill="none" stroke="#cccccc" stroke-width="1"/>`,
      );
      parts.push(
        `<text x="${(colX + CARD_PAD).toFixed(2)}" y="${COLUMNS_TOP + 20}" font-size="14" font-weight="bold" fill="#111111">${escapeXml(v.name)}</text>`,
      );

      const footprintY = COLUMNS_TOP + 30;
      const footprintX = colX + CARD_PAD;
      parts.push(footprintSvg(v.koerper, scale, footprintX, footprintY, FOOTPRINT_BOX));
      parts.push(
        `<text x="${(footprintX + FOOTPRINT_BOX + 8).toFixed(2)}" y="${(footprintY + FOOTPRINT_BOX / 2).toFixed(2)}" font-size="12" fill="#333333">${v.geschosse} Geschosse</text>`,
      );

      const zeilen = kennwertZeilen(v, besonnung, programm, besonnungGesetzt, programmGesetzt);
      const zeilenStartY = footprintY + FOOTPRINT_BOX + 20;
      zeilen.forEach((zeile, zi) => {
        parts.push(
          `<text x="${(colX + CARD_PAD).toFixed(2)}" y="${(zeilenStartY + zi * ROW_LINE_H).toFixed(2)}" font-size="11.5" fill="#222222">${escapeXml(zeile)}</text>`,
        );
      });
    });
  } else {
    parts.push(
      `<text x="${MARGIN}" y="${COLUMNS_TOP + 20}" font-size="13" fill="#666666">Keine Varianten — zuerst eine Parzelle als Zone zeichnen.</text>`,
    );
  }

  // Fusszeile — Ehrlichkeits-Hinweise
  const fussZeilen: string[] = [];
  if (besonnungGesetzt) fussZeilen.push(BESONNUNG_HINWEIS);
  if (programmGesetzt) fussZeilen.push(PROGRAMM_ERFUELLUNG_HINWEIS);
  fussZeilen.push('Anstoss, kein Entwurf — Extremvarianten nach GF-Ziel/Zonenregel.');
  parts.push(
    `<line x1="${MARGIN}" y1="${FOOTER_TOP - 10}" x2="${W - MARGIN}" y2="${FOOTER_TOP - 10}" stroke="#bbbbbb" stroke-width="1"/>`,
  );
  fussZeilen.forEach((zeile, zi) => {
    parts.push(
      `<text x="${MARGIN}" y="${(FOOTER_TOP + zi * (ROW_LINE_H - 1)).toFixed(2)}" font-size="10.5" fill="#555555">${escapeXml(zeile)}</text>`,
    );
  });

  parts.push('</svg>');
  return parts.join('');
}
