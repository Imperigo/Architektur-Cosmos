import type { Pt } from '../model/units';
import type { ZonenRegel } from '../model/doc';
import type { StudienVariante } from './volumenstudie';
import { BESONNUNG_HINWEIS, type BesonnungsKennwert } from './besonnungsvergleich';
import { PROGRAMM_ERFUELLUNG_HINWEIS, type ProgrammErfuellung } from './programmerfuellung';
import { escapeXml } from './plansvg';
import { messbarAttr, titelAttr, versal } from './stilblatt';
import {
  bboxVonPunkte,
  beurteilungssaetze,
  empfehlungssaetze,
  f1,
  flaechenKennwert,
  regelGoodness,
  situationSvg,
  studienRanking,
  type BBox,
} from './studienbeurteilung';

/**
 * Grundlagenstudie-Bericht v2 (Owner-Befund K1, `docs/OWNER-BEFUNDE-0.6.2.md`
 * S. 9 — «Dieser gesamte Teil ist ultra schlecht! … du vermischst Themen»).
 * Der v1-Bericht (Wettbewerb-Konzept D-E8, Batch D5) zeigte nur Footprints +
 * rohe Kennwert-Zeilen nebeneinander — v2 ist eine echte architektonische
 * Grundlagenstudie mit klarer Blatt-Dramaturgie: ERST das Urteil (Empfehlung),
 * DANN der Beweis (Situation + Vergleichstabelle + Beurteilung je Variante),
 * DANN die Grenzen (ein sauberer Fusszeilen-Block, keine Themenvermischung).
 *
 * A3 quer (`viewBox 0 0 1587 1123`, doppelte Fläche von A4 quer, gleicher
 * mm→px-Massstab wie die übrigen Plansätze) — EIN eigenständiges,
 * druckfähiges SVG, reine Funktion: kein Doc-Zugriff, kein
 * `Date.now()`/`Math.random()` im Kernel, gleiche Eingaben liefern
 * byte-identisches SVG. Die architektonische Urteilsbildung (Ranking,
 * Beurteilungssätze, Situations-Diagramm) lebt als pure Helfer in
 * `derive/studienbeurteilung.ts` — dieses Modul komponiert nur das Blatt.
 *
 * EHRLICHE GRENZE (unverändert aus v1, jetzt als EIN sauberer Fusszeilen-
 * Block statt zwischen die Inhalte gemischt): dieser Bericht ist ein
 * Anstoss, kein Entwurf — Extremvarianten nach GF-Ziel/Zonenregel, Besonnung
 * ein Richtwert, Programm-Erfüllung nur als Gesamt-GF-Vergleich. Fehlt ein
 * Wert, erscheint «—» statt einer erfundenen Zahl.
 */

const W = 1587;
const H = 1123;
const MARGIN = 40;

const HEADER_TITLE_Y = 54;
const HEADER_META_Y = 78;
const HEADER_ZIEL_Y = 96;
const HEADER_RULE_Y = 108;

const EMPFEHLUNG_TOP = 118;
const EMPFEHLUNG_PAD = 14;
const EMPFEHLUNG_HEIGHT = 94;
const EMPFEHLUNG_BOTTOM = EMPFEHLUNG_TOP + EMPFEHLUNG_HEIGHT;

const SITU_TOP = EMPFEHLUNG_BOTTOM + 16;
const SITU_GAP = 14;
const SITU_LABEL_H = 18;
const SITU_BOX = 150;
const SITU_META_H = 32;
const SITU_CARD_PAD = 10;
const SITU_CARD_H = SITU_LABEL_H + SITU_BOX + SITU_META_H + 2 * SITU_CARD_PAD;
const SITU_BOTTOM = SITU_TOP + SITU_CARD_H;

const TABLE_TOP = SITU_BOTTOM + 20;
const TABLE_LABEL_COL_W = 210;
const TABLE_HEADER_H = 26;
const TABLE_ROW_H = 22;

const BEURTEILUNG_GAP = 20;
const BEURTEILUNG_CARD_H = 250;
const BEURTEILUNG_PAD = 10;

const FOOTER_TOP = H - 74; // 1049

function f0(v: number): string {
  return v.toLocaleString('de-CH', { maximumFractionDigits: 0 });
}

/** Wortweiser Zeilenumbruch (Zeichen-Schätzung, keine Font-Metrik nötig — reicht fürs Blatt-Layout). */
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

export interface StudienBerichtOptionen {
  /** GF-Ziel in m²; null = kein Ziel gesetzt (Kopfzeile zeigt «—»). */
  zielGf: number | null;
  /** Herkunft des Ziel-GF für die Kopfzeile (K1: «Ziel-GF mit Herkunft»), z.B. «aus Zonenregel» / «manuell gesetzt». Ohne Angabe bleibt die Herkunft ungenannt. */
  zielGfHerkunft?: string;
  /** Projektname o.ä., z.B. für die Kopfzeile. */
  titel?: string;
  /** Name der aktiven Zonenregel, wenn vorhanden. */
  regelName?: string;
  /** Harte Eckwerte der aktiven Zonenregel (K1: «Zonenregel mit ihren harten Eckwerten» in der Kopfzeile + fürs Ranking/die Vergleichstabelle). Nur gesetzte Felder erscheinen; fehlende bleiben unerwähnt statt erfunden. */
  regel?: ZonenRegel;
  /** Vorformatiertes Datum (App liefert `toLocaleDateString('de-CH')` —
   *  KEIN `new Date()` im Kernel, sonst wäre der Bericht nicht deterministisch. */
  datum?: string;
  /** Parzellen-Umriss (K1: Situations-Diagramm zeigt die Parzelle MIT dem Footprint darin, nicht den Footprint allein) — auch Basis für Freiflächenanteil/Ranking-Kriterium. */
  parzelle?: Pt[];
  /** Winter-Besonnungskennwerte je Variante (Reihenfolge = `varianten`),
   *  nur wenn ein Standort gesetzt ist. */
  besonnung?: BesonnungsKennwert[];
  /** Programm-Erfüllung je Variante (Reihenfolge = `varianten`), nur wenn
   *  ein Raumprogramm hinterlegt ist. */
  programm?: ProgrammErfuellung[];
}

interface TabellenZeile {
  label: string;
  werte: string[];
  /** Index der hervorzuhebenden Zelle («beste Zelle je Zeile», K1); `null` = keine Auszeichnung (z.B. Geschosse: kein inhärentes besser/schlechter). */
  besterIndex: number | null;
}

/**
 * Baut EIN eigenständiges, druckfähiges A3-quer-SVG (`viewBox="0 0 1587 1123"`)
 * aus den Extremvarianten (`StudienVariante[]`, `derive/volumenstudie.ts`) —
 * Anstoss-Bericht, kein Entwurf. Blatt-Dramaturgie (K1): Empfehlung zuerst,
 * dann Situation + Vergleichstabelle + Beurteilung je Variante als Beweis,
 * dann die Grenzen der Studie als EIN sauberer Fusszeilen-Block. Deterministisch:
 * gleiche `varianten`/`opts` ⇒ byte-identischer String.
 */
export function studienBerichtSvg(varianten: StudienVariante[], opts: StudienBerichtOptionen): string {
  const n = varianten.length;
  const besonnungGesetzt = (opts.besonnung?.length ?? 0) > 0;
  const programmGesetzt = (opts.programm?.length ?? 0) > 0;
  const maxHoeheMm = opts.regel?.maxHoehe ?? null;

  const ranking = studienRanking(varianten, {
    parzelle: opts.parzelle,
    maxHoeheMm,
    programm: opts.programm,
    zielGf: opts.zielGf,
  });
  const empfehlung = empfehlungssaetze(varianten, ranking, {
    parzelle: opts.parzelle,
    maxHoeheMm,
    programm: opts.programm,
    zielGf: opts.zielGf,
  });

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica, Arial, sans-serif">`,
  );
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);

  // ── Kopf ─────────────────────────────────────────────────────────────
  const titelZeile = versal(`Grundlagenstudie${opts.titel ? ` — ${escapeXml(opts.titel)}` : ''}`);
  parts.push(`<text x="${MARGIN}" y="${HEADER_TITLE_Y}" ${titelAttr(26)} fill="#111111">${titelZeile}</text>`);

  const metaTeile: string[] = [];
  if (opts.regelName) metaTeile.push(`aus Zonenregel «${escapeXml(opts.regelName)}»`);
  if (opts.regel) {
    const r = opts.regel;
    if (r.az !== null && r.az !== undefined) metaTeile.push(`AZ ${f1(r.az)}`);
    if (r.maxHoehe !== null && r.maxHoehe !== undefined) metaTeile.push(`max. Höhe ${f1(r.maxHoehe / 1000)} m`);
    if (
      (r.grenzabstandKlein !== null && r.grenzabstandKlein !== undefined) ||
      (r.grenzabstandGross !== null && r.grenzabstandGross !== undefined)
    ) {
      const gk = r.grenzabstandKlein !== null && r.grenzabstandKlein !== undefined ? f1(r.grenzabstandKlein / 1000) : '—';
      const gg = r.grenzabstandGross !== null && r.grenzabstandGross !== undefined ? f1(r.grenzabstandGross / 1000) : '—';
      metaTeile.push(`Grenzabstand ${gk}/${gg} m`);
    }
  }
  if (opts.datum) metaTeile.push(escapeXml(opts.datum));
  parts.push(
    `<text x="${MARGIN}" y="${HEADER_META_Y}" ${messbarAttr(12.5)} fill="#444444">${metaTeile.join(' · ')}</text>`,
  );

  const zielTeile: string[] = [];
  zielTeile.push(`Ziel-GF: ${opts.zielGf !== null ? `${f1(opts.zielGf)} m²` : '—'}`);
  if (opts.zielGfHerkunft) zielTeile.push(`(${escapeXml(opts.zielGfHerkunft)})`);
  parts.push(`<text x="${MARGIN}" y="${HEADER_ZIEL_Y}" ${messbarAttr(12.5)} fill="#444444">${zielTeile.join(' ')}</text>`);
  parts.push(
    `<line x1="${MARGIN}" y1="${HEADER_RULE_Y}" x2="${W - MARGIN}" y2="${HEADER_RULE_Y}" stroke="#bbbbbb" stroke-width="1"/>`,
  );

  // ── Empfehlung (prominenter Block, ERST das Urteil) ─────────────────
  parts.push(
    `<rect x="${MARGIN}" y="${EMPFEHLUNG_TOP}" width="${W - 2 * MARGIN}" height="${EMPFEHLUNG_HEIGHT}" fill="#f6f2e6" stroke="#c9bfa0" stroke-width="1"/>`,
  );
  parts.push(
    `<text x="${MARGIN + EMPFEHLUNG_PAD}" y="${EMPFEHLUNG_TOP + 16}" ${messbarAttr(10.5)} letter-spacing="1" fill="#8a7a4e">EMPFEHLUNG</text>`,
  );
  parts.push(
    `<text x="${MARGIN + EMPFEHLUNG_PAD}" y="${EMPFEHLUNG_TOP + 38}" font-size="18" font-weight="bold" fill="#111111">${escapeXml(empfehlung[0] ?? '—')}</text>`,
  );
  empfehlung.slice(1).forEach((satz, zi) => {
    parts.push(
      `<text x="${MARGIN + EMPFEHLUNG_PAD}" y="${EMPFEHLUNG_TOP + 58 + zi * 16}" font-size="12.5" fill="#333333">${escapeXml(satz)}</text>`,
    );
  });

  if (n === 0) {
    parts.push(
      `<text x="${MARGIN}" y="${SITU_TOP + 20}" font-size="13" fill="#666666">Keine Varianten — zuerst eine Parzelle als Zone zeichnen.</text>`,
    );
  } else {
    const usableW = W - 2 * MARGIN;
    const colW = (usableW - (n - 1) * SITU_GAP) / n;

    // ── Situations-Zeile: Parzelle MIT Footprint darin, gemeinsamer Massstab ──
    const alleUmrisse: Pt[][] = opts.parzelle ? [opts.parzelle] : [];
    for (const v of varianten) for (const k of v.koerper) alleUmrisse.push(k.outline);
    const bb: BBox = bboxVonPunkte(alleUmrisse) ?? { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    const span = Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY, 1);
    const scale = SITU_BOX / span;

    varianten.forEach((v, i) => {
      const colX = MARGIN + i * (colW + SITU_GAP);
      parts.push(
        `<rect x="${colX.toFixed(2)}" y="${SITU_TOP}" width="${colW.toFixed(2)}" height="${SITU_CARD_H}" fill="none" stroke="#cccccc" stroke-width="1"/>`,
      );
      parts.push(
        `<text x="${(colX + SITU_CARD_PAD).toFixed(2)}" y="${SITU_TOP + 14}" ${titelAttr(13)} fill="#111111">${escapeXml(versal(v.name))}</text>`,
      );
      const boxX = colX + (colW - SITU_BOX) / 2;
      const boxY = SITU_TOP + SITU_LABEL_H + SITU_CARD_PAD;
      parts.push(situationSvg(opts.parzelle, v.koerper, bb, scale, boxX, boxY, SITU_BOX));

      const flaeche = flaechenKennwert(v, opts.parzelle);
      const freiflaecheTxt =
        flaeche.freiflaecheProzent !== null ? `Freifläche ${f1(flaeche.freiflaecheProzent)} %` : 'Freifläche —';
      parts.push(
        `<text x="${(colX + SITU_CARD_PAD).toFixed(2)}" y="${(boxY + SITU_BOX + 14).toFixed(2)}" ${messbarAttr(11)} fill="#333333">${escapeXml(freiflaecheTxt)}</text>`,
      );
      parts.push(
        `<text x="${(colX + SITU_CARD_PAD).toFixed(2)}" y="${(boxY + SITU_BOX + 28).toFixed(2)}" ${messbarAttr(11)} fill="#333333">${escapeXml(`${v.geschosse} Geschosse · ${f1(v.hoehe / 1000)} m`)}</text>`,
      );
    });

    // ── Vergleichstabelle: Zeilen = Kriterien, Spalten = Varianten ──────
    const valColW = (usableW - TABLE_LABEL_COL_W) / n;
    const zeilen: TabellenZeile[] = [];

    zeilen.push({
      label: 'Geschosse',
      werte: varianten.map((v) => f0(v.geschosse)),
      besterIndex: null,
    });

    {
      const goodness = varianten.map((v) => regelGoodness(v, maxHoeheMm));
      let best = 0;
      for (let i = 1; i < goodness.length; i++) if (goodness[i]! > goodness[best]!) best = i;
      zeilen.push({
        label: 'Höhe / Reserve zur Regel',
        werte: varianten.map((v) => {
          const hoeheTxt = `${f1(v.hoehe / 1000)} m`;
          if (maxHoeheMm === null) return hoeheTxt;
          const reserve = (maxHoeheMm - v.hoehe) / 1000;
          return `${hoeheTxt} (${reserve >= 0 ? '+' : ''}${f1(reserve)} m)`;
        }),
        besterIndex: best,
      });
    }

    {
      let best: number | null = null;
      if (programmGesetzt) {
        let bestAbw = Infinity;
        varianten.forEach((v, i) => {
          const p = opts.programm!.find((x) => x.varianteId === v.id);
          if (p && p.erfuellungProzent !== null) {
            const abw = Math.abs(100 - p.erfuellungProzent);
            if (abw < bestAbw) {
              bestAbw = abw;
              best = i;
            }
          }
        });
      }
      zeilen.push({
        // Ehrlichkeit (K1): der Zusatz «/ Programm-Erfüllung» erscheint NUR,
        // wenn tatsächlich ein Raumprogramm hinterlegt ist — sonst bliebe
        // eine Behauptung stehen, die keine Daten stützen.
        label: programmGesetzt ? 'GF / Programm-Erfüllung' : 'GF',
        werte: varianten.map((v) => {
          const gfTxt = `${f1(v.gf)} m²`;
          if (!programmGesetzt) return gfTxt;
          const p = opts.programm!.find((x) => x.varianteId === v.id);
          const pct = p && p.erfuellungProzent !== null ? `${f1(p.erfuellungProzent)} %` : '—';
          return `${gfTxt} (${pct})`;
        }),
        besterIndex: best,
      });
    }

    {
      let best: number | null = null;
      if (opts.parzelle) {
        let bestFrei = -Infinity;
        varianten.forEach((v, i) => {
          const fp = flaechenKennwert(v, opts.parzelle).freiflaecheProzent;
          if (fp !== null && fp > bestFrei) {
            bestFrei = fp;
            best = i;
          }
        });
      }
      zeilen.push({
        label: 'Überbauungsgrad / Freifläche',
        werte: varianten.map((v) => {
          const fk = flaechenKennwert(v, opts.parzelle);
          if (fk.ueberbauungProzent === null || fk.freiflaecheProzent === null) return '—';
          return `${f1(fk.ueberbauungProzent)} % / ${f1(fk.freiflaecheProzent)} %`;
        }),
        besterIndex: best,
      });
    }

    {
      let best: number | null = null;
      let bestMarge = -Infinity;
      varianten.forEach((v, i) => {
        if (v.besonnung) {
          const marge = v.besonnung.ist - v.besonnung.noetig;
          if (marge > bestMarge) {
            bestMarge = marge;
            best = i;
          }
        }
      });
      zeilen.push({
        label: 'Grenzabstand-Besonnung (3h-Näherung)',
        werte: varianten.map((v) => (v.besonnung ? (v.besonnung.ok ? 'ok' : 'verfehlt') : '—')),
        besterIndex: best,
      });
    }

    if (besonnungGesetzt) {
      let best: number | null = null;
      let bestWert = Infinity;
      varianten.forEach((v, i) => {
        const b = opts.besonnung!.find((x) => x.varianteId === v.id);
        if (b && b.richtwertM2 < bestWert) {
          bestWert = b.richtwertM2;
          best = i;
        }
      });
      zeilen.push({
        label: 'Winter-Besonnung (Richtwert)',
        werte: varianten.map((v) => {
          const b = opts.besonnung!.find((x) => x.varianteId === v.id);
          return b ? `${f1(b.richtwertM2)} m²` : '—';
        }),
        besterIndex: best,
      });
    }

    const tableHeight = TABLE_HEADER_H + zeilen.length * TABLE_ROW_H;
    parts.push(
      `<rect x="${MARGIN}" y="${TABLE_TOP}" width="${usableW}" height="${tableHeight}" fill="none" stroke="#999999" stroke-width="1"/>`,
    );
    varianten.forEach((v, i) => {
      const colX = MARGIN + TABLE_LABEL_COL_W + i * valColW;
      parts.push(
        `<text x="${(colX + valColW / 2).toFixed(2)}" y="${TABLE_TOP + 17}" ${titelAttr(11.5)} text-anchor="middle" fill="#111111">${escapeXml(versal(v.name))}</text>`,
      );
    });
    parts.push(
      `<line x1="${MARGIN}" y1="${TABLE_TOP + TABLE_HEADER_H}" x2="${W - MARGIN}" y2="${TABLE_TOP + TABLE_HEADER_H}" stroke="#999999" stroke-width="1"/>`,
    );
    zeilen.forEach((zeile, zi) => {
      const rowY = TABLE_TOP + TABLE_HEADER_H + zi * TABLE_ROW_H;
      parts.push(
        `<text x="${MARGIN + 6}" y="${(rowY + 15).toFixed(2)}" font-size="11" fill="#333333">${escapeXml(zeile.label)}</text>`,
      );
      zeile.werte.forEach((wert, i) => {
        const colX = MARGIN + TABLE_LABEL_COL_W + i * valColW;
        if (zeile.besterIndex === i) {
          parts.push(
            `<rect x="${colX.toFixed(2)}" y="${rowY.toFixed(2)}" width="${valColW.toFixed(2)}" height="${TABLE_ROW_H}" fill="#eef3e6"/>`,
          );
        }
        parts.push(
          `<text x="${(colX + valColW / 2).toFixed(2)}" y="${(rowY + 15).toFixed(2)}" ${messbarAttr(11)} text-anchor="middle" font-weight="${zeile.besterIndex === i ? 'bold' : 'normal'}" fill="#222222">${escapeXml(wert)}</text>`,
        );
      });
      if (zi < zeilen.length - 1) {
        parts.push(
          `<line x1="${MARGIN}" y1="${(rowY + TABLE_ROW_H).toFixed(2)}" x2="${W - MARGIN}" y2="${(rowY + TABLE_ROW_H).toFixed(2)}" stroke="#e2e2e2" stroke-width="1"/>`,
        );
      }
    });

    // ── Beurteilung je Variante (3–4 Sätze, mit echten Zahlen) ──────────
    const beurteilungTop = TABLE_TOP + tableHeight + BEURTEILUNG_GAP;
    const maxChars = Math.max(24, Math.floor((colW - 2 * BEURTEILUNG_PAD) / 5.4));
    varianten.forEach((v, i) => {
      const colX = MARGIN + i * (colW + SITU_GAP);
      parts.push(
        `<rect x="${colX.toFixed(2)}" y="${beurteilungTop}" width="${colW.toFixed(2)}" height="${BEURTEILUNG_CARD_H}" fill="none" stroke="#cccccc" stroke-width="1"/>`,
      );
      const programmEintrag = opts.programm?.find((p) => p.varianteId === v.id);
      const saetze = beurteilungssaetze(v, {
        parzelle: opts.parzelle,
        maxHoeheMm,
        programm: programmEintrag,
        zielGf: opts.zielGf,
      });
      let y = beurteilungTop + BEURTEILUNG_PAD + 10;
      saetze.forEach((satz) => {
        for (const zeile of wrapText(satz, maxChars)) {
          parts.push(
            `<text x="${(colX + BEURTEILUNG_PAD).toFixed(2)}" y="${y.toFixed(2)}" font-size="10.8" fill="#222222">${escapeXml(zeile)}</text>`,
          );
          y += 13;
        }
        y += 3;
      });
    });
  }

  // ── Grenzen der Studie (EIN sauberer Fusszeilen-Block, K1: keine Themenvermischung) ──
  const fussZeilen: string[] = ['Grenzen der Studie: Extremvarianten sind ein Anstoss, kein Entwurf.'];
  fussZeilen.push('Ranking-Gewichte: ' + weightFootnote(ranking.gewichte));
  if (besonnungGesetzt) fussZeilen.push(BESONNUNG_HINWEIS);
  if (programmGesetzt) fussZeilen.push(PROGRAMM_ERFUELLUNG_HINWEIS);
  parts.push(
    `<line x1="${MARGIN}" y1="${FOOTER_TOP - 12}" x2="${W - MARGIN}" y2="${FOOTER_TOP - 12}" stroke="#bbbbbb" stroke-width="1"/>`,
  );
  fussZeilen.forEach((zeile, zi) => {
    parts.push(
      `<text x="${MARGIN}" y="${(FOOTER_TOP + zi * 14).toFixed(2)}" font-size="10.5" fill="#555555">${escapeXml(zeile)}</text>`,
    );
  });

  parts.push('</svg>');
  return parts.join('');
}

/** Ranking-Gewichte als EIN Klartext-Satz fürs Fusszeilen-Transparenz-Gebot (K1: «Gewichte transparent im Fusstext»). */
function weightFootnote(gewichte: { label: string; gewicht: number; aktiv: boolean }[]): string {
  return gewichte
    .filter((g) => g.aktiv)
    .map((g) => `${g.label} ${f1(g.gewicht * 100)} %`)
    .join(' · ');
}
