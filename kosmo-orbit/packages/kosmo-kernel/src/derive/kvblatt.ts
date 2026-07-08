import type { SiaPhase } from '../model/doc';
import { siaPhaseLabel } from '../model/doc';
import { escapeXml } from './plansvg';
import { KV_HINWEIS, type Kostenschaetzung } from './kostenschaetzung';

/**
 * KV-Blatt (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4,
 * Lücken-Batch 3) — druckfähiges A4-Exportartefakt der KV-Grobschätzung,
 * gebaut nach demselben Muster wie `derive/studienbericht.ts`: EIN
 * eigenständiges SVG, reine Funktion (kein Doc-Zugriff, kein
 * `Date.now()`/`Math.random()` im Kernel — Datum kommt als vorformatierter
 * String-Parameter von der App, `toLocaleDateString('de-CH')`), gleiche
 * Eingaben liefern byte-identisches SVG (Golden-Test-fähig).
 *
 * A4 hoch, `viewBox="0 0 794 1123"` — gleiche mm→px-Skala wie
 * `studienBerichtSvg` (A3 quer, 420×297 mm ⇒ 1587×1123 px): A4 hoch
 * (210×297 mm) teilt die Höhe (297 mm) mit A3 quer, die Breite skaliert
 * proportional (210/420 × 1587 ≈ 794).
 *
 * AUSDRÜCKLICH ein Richtwert-Blatt: Kopf nennt Projekt/Datum/SIA-Teilphase,
 * EIN prominenter Ehrlichkeits-Block (`KV_HINWEIS`) vor der Tabelle, ein
 * separater Grenzen-Block am Fuss nennt die verwendeten Kennwerte als
 * Owner-Annahme. Keine CRB/NPK-Positionen werden vorgetäuscht.
 */

const W = 794;
const H = 1123;
const MARGIN = 40;

const HEADER_TITLE_Y = 54;
const HEADER_META_Y = 78;
const HEADER_RULE_Y = 90;

const HINWEIS_TOP = 100;
const HINWEIS_HEIGHT = 46;
const HINWEIS_BOTTOM = HINWEIS_TOP + HINWEIS_HEIGHT;

const TABLE_TOP = HINWEIS_BOTTOM + 24;
const TABLE_BKP_COL_W = 90;
const TABLE_BETRAG_COL_W = 160;
const TABLE_HEADER_H = 26;
const TABLE_ROW_H = 24;

const FOOTER_GAP = 24;

function chf(v: number): string {
  return v.toLocaleString('de-CH', { maximumFractionDigits: 0 });
}

function f1(v: number): string {
  return v.toLocaleString('de-CH', { maximumFractionDigits: 1 });
}

function pct(v: number): string {
  return (v * 100).toLocaleString('de-CH', { maximumFractionDigits: 1 });
}

export interface KvBlattOptionen {
  /** Projektname für die Kopfzeile. */
  titel?: string;
  /** Vorformatiertes Datum (App liefert `toLocaleDateString('de-CH')` — KEIN `new Date()` im Kernel). */
  datum?: string;
  /** Aktuelle SIA-Teilphase des Projekts (`doc.settings.siaPhase`, seit ROADMAP 233). */
  siaPhase?: SiaPhase;
}

/**
 * Baut EIN eigenständiges, druckfähiges A4-SVG (`viewBox="0 0 794 1123"`) aus
 * einer bereits berechneten `Kostenschaetzung` (`derive/kostenschaetzung.ts`).
 * Deterministisch: gleiche `schaetzung`/`opts` ⇒ byte-identischer String.
 */
export function kvBlattSvg(schaetzung: Kostenschaetzung, opts: KvBlattOptionen = {}): string {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica, Arial, sans-serif">`,
  );
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);

  // ── Kopf ─────────────────────────────────────────────────────────────
  const titelZeile = `Kostenvoranschlag-Grobschätzung${opts.titel ? ` — ${escapeXml(opts.titel)}` : ''}`;
  parts.push(
    `<text x="${MARGIN}" y="${HEADER_TITLE_Y}" font-size="22" font-weight="bold" fill="#111111">${titelZeile}</text>`,
  );

  const metaTeile: string[] = [];
  if (opts.siaPhase) metaTeile.push(escapeXml(siaPhaseLabel(opts.siaPhase)));
  if (opts.datum) metaTeile.push(escapeXml(opts.datum));
  metaTeile.push(`GF-Basis: ${schaetzung.flaecheGf > 0 ? `${f1(schaetzung.flaecheGf)} m²` : '—'}`);
  parts.push(
    `<text x="${MARGIN}" y="${HEADER_META_Y}" font-size="12.5" fill="#444444">${metaTeile.join(' · ')}</text>`,
  );
  parts.push(
    `<line x1="${MARGIN}" y1="${HEADER_RULE_Y}" x2="${W - MARGIN}" y2="${HEADER_RULE_Y}" stroke="#bbbbbb" stroke-width="1"/>`,
  );

  // ── Ehrlichkeits-Block (prominent, VOR der Tabelle) ─────────────────
  parts.push(
    `<rect x="${MARGIN}" y="${HINWEIS_TOP}" width="${W - 2 * MARGIN}" height="${HINWEIS_HEIGHT}" fill="#f6f2e6" stroke="#c9bfa0" stroke-width="1"/>`,
  );
  parts.push(
    `<text x="${MARGIN + 14}" y="${HINWEIS_TOP + 18}" font-size="10.5" letter-spacing="1" fill="#8a7a4e">RICHTWERT — KEIN DEVIS</text>`,
  );
  parts.push(
    `<text x="${MARGIN + 14}" y="${HINWEIS_TOP + 36}" font-size="13" font-weight="bold" fill="#111111">${escapeXml(KV_HINWEIS)}</text>`,
  );

  // ── Tabelle ──────────────────────────────────────────────────────────
  if (schaetzung.positionen.length === 0) {
    parts.push(
      `<text x="${MARGIN}" y="${TABLE_TOP + 20}" font-size="13" fill="#666666">Keine Geometrie — noch keine Flächen gezeichnet, keine Schätzung möglich.</text>`,
    );
  } else {
    const usableW = W - 2 * MARGIN;
    const bezeichnungColW = usableW - TABLE_BKP_COL_W - TABLE_BETRAG_COL_W;
    const rowCount = schaetzung.positionen.length + 1; // +1 Total-Zeile
    const tableHeight = TABLE_HEADER_H + rowCount * TABLE_ROW_H;

    parts.push(
      `<rect x="${MARGIN}" y="${TABLE_TOP}" width="${usableW}" height="${tableHeight}" fill="none" stroke="#999999" stroke-width="1"/>`,
    );
    parts.push(
      `<text x="${MARGIN + 6}" y="${TABLE_TOP + 17}" font-size="11.5" font-weight="bold" fill="#111111">BKP</text>`,
    );
    parts.push(
      `<text x="${MARGIN + TABLE_BKP_COL_W + 6}" y="${TABLE_TOP + 17}" font-size="11.5" font-weight="bold" fill="#111111">Bezeichnung</text>`,
    );
    parts.push(
      `<text x="${(MARGIN + TABLE_BKP_COL_W + bezeichnungColW + TABLE_BETRAG_COL_W - 6).toFixed(2)}" y="${TABLE_TOP + 17}" font-size="11.5" font-weight="bold" text-anchor="end" fill="#111111">CHF</text>`,
    );
    parts.push(
      `<line x1="${MARGIN}" y1="${TABLE_TOP + TABLE_HEADER_H}" x2="${W - MARGIN}" y2="${TABLE_TOP + TABLE_HEADER_H}" stroke="#999999" stroke-width="1"/>`,
    );

    schaetzung.positionen.forEach((pos, i) => {
      const rowY = TABLE_TOP + TABLE_HEADER_H + i * TABLE_ROW_H;
      parts.push(
        `<text x="${MARGIN + 6}" y="${(rowY + 16).toFixed(2)}" font-size="11.5" fill="#333333">${escapeXml(pos.bkp)}</text>`,
      );
      parts.push(
        `<text x="${MARGIN + TABLE_BKP_COL_W + 6}" y="${(rowY + 16).toFixed(2)}" font-size="11.5" fill="#333333">${escapeXml(pos.bezeichnung)}</text>`,
      );
      parts.push(
        `<text x="${(MARGIN + TABLE_BKP_COL_W + bezeichnungColW + TABLE_BETRAG_COL_W - 6).toFixed(2)}" y="${(rowY + 16).toFixed(2)}" font-size="11.5" text-anchor="end" fill="#222222">${chf(pos.betrag)}</text>`,
      );
      parts.push(
        `<line x1="${MARGIN}" y1="${(rowY + TABLE_ROW_H).toFixed(2)}" x2="${W - MARGIN}" y2="${(rowY + TABLE_ROW_H).toFixed(2)}" stroke="#e2e2e2" stroke-width="1"/>`,
      );
    });

    const totalRowY = TABLE_TOP + TABLE_HEADER_H + schaetzung.positionen.length * TABLE_ROW_H;
    parts.push(
      `<rect x="${MARGIN}" y="${totalRowY.toFixed(2)}" width="${usableW}" height="${TABLE_ROW_H}" fill="#eef3e6"/>`,
    );
    parts.push(
      `<text x="${MARGIN + 6}" y="${(totalRowY + 16).toFixed(2)}" font-size="12.5" font-weight="bold" fill="#111111">Total</text>`,
    );
    parts.push(
      `<text x="${(MARGIN + TABLE_BKP_COL_W + bezeichnungColW + TABLE_BETRAG_COL_W - 6).toFixed(2)}" y="${(totalRowY + 16).toFixed(2)}" font-size="12.5" font-weight="bold" text-anchor="end" fill="#111111">${chf(schaetzung.total)}</text>`,
    );
  }

  // ── Grenzen-Block (Owner-Annahmen, EIN sauberer Fusszeilen-Block) ────
  const k = schaetzung.kennwerte;
  const kennwerteZeile =
    `Kennwerte (Annahme Owner-Guideline, kein verbindlicher Wert): ` +
    `${chf(k.chfProM2Gf)} CHF/m² GF (BKP 2) · Rohbau ${pct(k.anteilRohbau)}% · Ausbau ${pct(k.anteilAusbau)}% · ` +
    `Technik ${pct(k.anteilTechnik)}% · Umgebung +${pct(k.zuschlagUmgebung)}% · Baunebenkosten +${pct(k.zuschlagBaunebenkosten)}% · Reserve +${pct(k.reserve)}%.`;
  const fussSaetze = [
    KV_HINWEIS,
    kennwerteZeile,
    'Grenzen: BKP-2-Stellen-Niveau, keine eBKP-Feingliederung, keine CRB/NPK-Positionen — Devisierung bleibt Owner-Entscheid.',
  ];
  // Zeilenumbruch (Zeichen-Schätzung, wie `studienBerichtSvg`s `wrapText`) —
  // die Kennwerte-/Grenzen-Sätze sind zu lang für eine Zeile bei 794 px Breite.
  const maxChars = Math.floor((W - 2 * MARGIN) / 5.4);
  const fussZeilen = fussSaetze.flatMap((satz) => wrapText(satz, maxChars));
  const footerTop = H - MARGIN - fussZeilen.length * 14;
  parts.push(
    `<line x1="${MARGIN}" y1="${footerTop - FOOTER_GAP / 2}" x2="${W - MARGIN}" y2="${footerTop - FOOTER_GAP / 2}" stroke="#bbbbbb" stroke-width="1"/>`,
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
