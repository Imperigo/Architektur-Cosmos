import type { SiaPhase } from '../model/doc';
import { siaPhaseLabel } from '../model/doc';
import { escapeXml } from './plansvg';
import { messbarAttr, titelAttr, versal } from './stilblatt';
import { BAUABLAUF_HINWEIS, type Bauablauf } from './bauablauf';

/**
 * Bauablaufblatt (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4,
 * Lücken-Batch 4) — druckfähiges A4-quer-Exportartefakt des Grob-
 * Terminplans (`derive/bauablauf.ts`), gebaut nach demselben Muster wie
 * `derive/kvblatt.ts`: EIN eigenständiges SVG, reine Funktion (kein
 * Doc-Zugriff, kein `Date.now()`/`Math.random()` im Kernel — Datum kommt als
 * vorformatierter String-Parameter von der App), gleiche Eingaben liefern
 * byte-identisches SVG (Golden-Test-fähig).
 *
 * A4 quer, `viewBox="0 0 1123 794"` — dieselbe mm→px-Skala wie `kvBlattSvg`
 * (A4 hoch, 210×297 mm ⇒ 794×1123 px), hier um 90° gedreht (297×210 mm ⇒
 * 1123×794 px).
 *
 * AUSDRÜCKLICH ein Richtwert-Blatt: Kopf nennt Projekt/Datum/SIA-Teilphase +
 * Gesamtdauer, EIN prominenter Ehrlichkeits-Block (`BAUABLAUF_HINWEIS`) vor
 * dem Balkenplan, ein separater «Grenzen»-Block am Fuss nennt die
 * verwendeten Leistungswerte als Owner-Annahme. Wochen sind relativ (Woche
 * 1..n), kein Kalenderbezug.
 */

const W = 1123;
const H = 794;
const MARGIN = 40;

const HEADER_TITLE_Y = 54;
const HEADER_META_Y = 78;
const HEADER_RULE_Y = 90;

const HINWEIS_TOP = 100;
const HINWEIS_HEIGHT = 32;
const HINWEIS_BOTTOM = HINWEIS_TOP + HINWEIS_HEIGHT;

const CHART_TOP = HINWEIS_BOTTOM + 22;
const GEWERK_COL_W = 190;
const ROW_H = 18;
const WEEK_HEADER_H = 20;

function f1(v: number): string {
  return v.toLocaleString('de-CH', { maximumFractionDigits: 1 });
}

export interface BauablaufBlattOptionen {
  /** Projektname für die Kopfzeile. */
  titel?: string;
  /** Vorformatiertes Datum (App liefert `toLocaleDateString('de-CH')` — KEIN `new Date()` im Kernel). */
  datum?: string;
  /** Aktuelle SIA-Teilphase des Projekts (`doc.settings.siaPhase`). */
  siaPhase?: SiaPhase;
}

/**
 * Baut EIN eigenständiges, druckfähiges A4-quer-SVG (`viewBox="0 0 1123 794"`)
 * aus einem bereits berechneten `Bauablauf` (`derive/bauablauf.ts`).
 * Deterministisch: gleiche `ablauf`/`opts` ⇒ byte-identischer String.
 */
export function bauablaufBlattSvg(ablauf: Bauablauf, opts: BauablaufBlattOptionen = {}): string {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica, Arial, sans-serif">`,
  );
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);

  // ── Kopf ─────────────────────────────────────────────────────────────
  const titelZeile = versal(`Bauablaufplan${opts.titel ? ` — ${escapeXml(opts.titel)}` : ''}`);
  parts.push(`<text x="${MARGIN}" y="${HEADER_TITLE_Y}" ${titelAttr(22)} fill="#111111">${titelZeile}</text>`);

  const metaTeile: string[] = [];
  if (opts.siaPhase) metaTeile.push(escapeXml(siaPhaseLabel(opts.siaPhase)));
  if (opts.datum) metaTeile.push(escapeXml(opts.datum));
  metaTeile.push(ablauf.gesamtWochen > 0 ? `Gesamtdauer: ${ablauf.gesamtWochen} Wochen` : 'Gesamtdauer: —');
  parts.push(
    `<text x="${MARGIN}" y="${HEADER_META_Y}" ${messbarAttr(12.5)} fill="#444444">${metaTeile.join(' · ')}</text>`,
  );
  parts.push(
    `<line x1="${MARGIN}" y1="${HEADER_RULE_Y}" x2="${W - MARGIN}" y2="${HEADER_RULE_Y}" stroke="#bbbbbb" stroke-width="1"/>`,
  );

  // ── Ehrlichkeits-Block (prominent, VOR dem Balkenplan) ──────────────
  parts.push(
    `<rect x="${MARGIN}" y="${HINWEIS_TOP}" width="${W - 2 * MARGIN}" height="${HINWEIS_HEIGHT}" fill="#f6f2e6" stroke="#c9bfa0" stroke-width="1"/>`,
  );
  parts.push(
    `<text x="${MARGIN + 14}" y="${HINWEIS_TOP + 20}" font-size="12.5" font-weight="bold" fill="#111111">${escapeXml(BAUABLAUF_HINWEIS)}</text>`,
  );

  // ── Balkenplan ───────────────────────────────────────────────────────
  if (ablauf.phasen.length === 0) {
    parts.push(
      `<text x="${MARGIN}" y="${CHART_TOP + 20}" font-size="13" fill="#666666">Keine Geometrie — noch kein Geschoss angelegt, kein Terminplan möglich.</text>`,
    );
  } else {
    // Division niemals durch 0 (theoretisch möglich, falls `minDauerWochen`
    // per Override auf 0 gesetzt UND alle Mengen 0 sind) — Balkenplan bleibt
    // dann eine 1-Wochen-Spalte statt eines kaputten SVG.
    const gesamtWochenSicher = Math.max(ablauf.gesamtWochen, 1);
    const usableW = W - 2 * MARGIN;
    const chartW = usableW - GEWERK_COL_W;
    const wochenBreite = chartW / gesamtWochenSicher;
    const chartH = ablauf.phasen.length * ROW_H;
    const chartLeft = MARGIN + GEWERK_COL_W;
    const chartBottom = CHART_TOP + WEEK_HEADER_H + chartH;

    // Wochenraster — Tick-Schritt gröber bei langen Plänen (bleibt lesbar).
    const tickSchritt = gesamtWochenSicher > 40 ? 4 : gesamtWochenSicher > 20 ? 2 : 1;
    for (let w = 0; w <= gesamtWochenSicher; w += tickSchritt) {
      const x = chartLeft + w * wochenBreite;
      parts.push(
        `<line x1="${x.toFixed(2)}" y1="${CHART_TOP}" x2="${x.toFixed(2)}" y2="${chartBottom.toFixed(2)}" stroke="#e2e2e2" stroke-width="1"/>`,
      );
      parts.push(
        `<text x="${x.toFixed(2)}" y="${(CHART_TOP + WEEK_HEADER_H - 6).toFixed(2)}" ${messbarAttr(9)} text-anchor="middle" fill="#888888">${w}</text>`,
      );
    }

    // Zeilen + Balken
    ablauf.phasen.forEach((p, i) => {
      const rowY = CHART_TOP + WEEK_HEADER_H + i * ROW_H;
      parts.push(
        `<text x="${MARGIN}" y="${(rowY + ROW_H - 5).toFixed(2)}" font-size="10" fill="#333333">${escapeXml(p.gewerk)}</text>`,
      );
      const barX = chartLeft + (p.startWoche - 1) * wochenBreite;
      const barW = Math.max(p.dauerWochen * wochenBreite - 2, 2);
      const farbe = p.parallel ? '#9cbadb' : '#3f6fa8';
      parts.push(
        `<rect x="${barX.toFixed(2)}" y="${(rowY + 2).toFixed(2)}" width="${barW.toFixed(2)}" height="${(ROW_H - 5).toFixed(2)}" fill="${farbe}" rx="2"/>`,
      );
    });

    parts.push(
      `<rect x="${chartLeft.toFixed(2)}" y="${CHART_TOP}" width="${chartW.toFixed(2)}" height="${(WEEK_HEADER_H + chartH).toFixed(2)}" fill="none" stroke="#999999" stroke-width="1"/>`,
    );
  }

  // ── Grenzen-Block (Owner-Annahmen, EIN sauberer Fusszeilen-Block) ────
  const k = ablauf.kennwerte;
  const leistungswerteZeile =
    `Leistungswerte (Annahme Owner-Guideline, kein verbindlicher Wert): ` +
    `Aushub ${f1(k.m2AushubProWoche)} m²/Woche · Rohbau ${f1(k.m3RohbauProWoche)} m³/Woche · ` +
    `Dach ${f1(k.m2DachProWoche)} m²/Woche · Hülle ${f1(k.m2HuelleProWoche)} m²/Woche · ` +
    `Umgebung ${f1(k.m2UmgebungProWoche)} m²/Woche · Abnahme ${f1(k.abnahmeWochen)} Wochen fix.`;
  const fussSaetze = [
    BAUABLAUF_HINWEIS,
    leistungswerteZeile,
    'Grenzen: relative Wochen ohne Kalenderbezug, keine Ressourcen-/Kapazitätsprüfung je Gewerk, keine Feiertage/Winterpause — ersetzt keine Bauleitungssoftware.',
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

/** Wortweiser Zeilenumbruch (Zeichen-Schätzung, wie `kvBlattSvg`). */
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
