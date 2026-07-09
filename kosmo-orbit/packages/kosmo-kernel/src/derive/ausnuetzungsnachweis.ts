import type { KosmoDoc, SiaPhase } from '../model/doc';
import { siaPhaseLabel } from '../model/doc';
import type { Boundary, MassBody, Storey, Wall } from '../model/entities';
import { pruefeGrundriss } from './checks';
import { escapeXml } from './plansvg';
import { deriveBerechnungsliste, type Berechnungsliste } from './berechnungsliste';

/**
 * Ausnützungsnachweis-Blatt (v0.6.3 VP2, Baugesuch-Blattsatz,
 * `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4, Lücken-Batch 2,
 * Owner-Hauptaufgabe K22) — druckfähiges A4-Exportartefakt, gebaut nach
 * demselben Muster wie `derive/kvblatt.ts`: EIN eigenständiges SVG, reine
 * Funktion (kein Doc-Zugriff im SVG-Builder selbst — die Doc-Ableitung lebt
 * in `deriveAusnuetzungKennwerte` unten, genau wie `deriveKostenschaetzung`
 * neben `kvBlattSvg`), kein `Date.now()`/`Math.random()` im Kernel, gleiche
 * Eingaben liefern byte-identisches SVG (Golden-Test-fähig).
 *
 * A4 hoch, `viewBox="0 0 794 1123"` — gleiche mm→px-Skala wie `kvBlattSvg`.
 *
 * AUSDRÜCKLICH eine ZUSAMMENSTELLUNG der Nachweis-Zahlen für die Eingabe,
 * KEINE Bewilligung — die Prüfung bleibt bei der Behörde (Disclaimer
 * `BAUGESUCH_HINWEIS`, prominent VOR den Tabellen). Jeder Kennwert, den das
 * Modell nicht hergibt (keine Parzellenfläche, keine Zonenregel, keine
 * Baugrenze/Geometrie), erscheint als «—» statt einer erfundenen Zahl.
 */

export const BAUGESUCH_HINWEIS = 'Zusammenstellung für die Eingabe — Prüfung durch die Behörde';

/** Ist/Erlaubt/Status-Zeile der Zonenregel-Gegenüberstellung. */
export interface AusnuetzungKennwert {
  label: string;
  ist: string;
  erlaubt: string;
  /** 'unbekannt' = Grundlage fehlt (keine Regel/Fläche/Baugrenze) — NICHT als «ok» ausgeben. */
  status: 'ok' | 'ueberschritten' | 'unbekannt';
}

const W = 794;
const H = 1123;
const MARGIN = 40;

const HEADER_TITLE_Y = 54;
const HEADER_META_Y = 78;
const HEADER_RULE_Y = 90;

const HINWEIS_TOP = 100;
const HINWEIS_HEIGHT = 46;
const HINWEIS_BOTTOM = HINWEIS_TOP + HINWEIS_HEIGHT;

const T1_TOP = HINWEIS_BOTTOM + 22;
const T1_HEADER_H = 22;
const T1_ROW_H = 20;
const T1_TYP_W = 150;
const T1_NUM_W = 118; // je Zahlenspalte (hnfSoll/agfZiel/ausgezogen/differenz)

const T2_GAP = 26;
const T2_HEADER_H = 24;
const T2_ROW_H = 26;
const T2_LABEL_W = 200;
const T2_COL_W = 168; // je Ist/Erlaubt/Status-Spalte (3 Spalten)

function f1(v: number): string {
  return v.toLocaleString('de-CH', { maximumFractionDigits: 1 });
}

function f2(v: number): string {
  return v.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function m2Fmt(v: number): string {
  return `${v.toLocaleString('de-CH', { maximumFractionDigits: 0 })} m²`;
}

/**
 * Gebäudehöhe «Ist»: höchster Bauteil-Scheitel (Wand/Volumen) über
 * Projektnull — dieselbe Formel wie `derive/checks.ts`s Zonenregel-
 * Höhenprüfung (`storey.elevation + baseOffset + Höhe`), projektweit über
 * ALLE Geschosse statt nur eines. `null`, wenn das Doc keine Wände/Volumen
 * enthält (kein Normersatz durch Erfindung).
 */
function gebaeudeHoeheIstMm(doc: KosmoDoc): number | null {
  let top: number | null = null;
  const consider = (v: number) => {
    if (top === null || v > top) top = v;
  };
  for (const w of doc.byKind<Wall>('wall')) {
    const storey = doc.get<Storey>(w.storeyId);
    if (!storey || storey.kind !== 'storey') continue;
    const h = w.heightMode === 'fix' && w.height ? w.height : storey.height;
    consider(storey.elevation + w.baseOffset + h);
  }
  for (const m of doc.byKind<MassBody>('mass')) {
    const storey = doc.get<Storey>(m.storeyId);
    if (!storey || storey.kind !== 'storey') continue;
    consider(storey.elevation + m.baseOffset + m.height);
  }
  return top;
}

function statusVonMax(ist: number | null, erlaubt: number | null): AusnuetzungKennwert['status'] {
  if (ist === null || erlaubt === null) return 'unbekannt';
  return ist <= erlaubt ? 'ok' : 'ueberschritten';
}

/**
 * Zonenregel-Gegenüberstellung (Ist/Erlaubt/Status) aus dem Modell — AZ
 * (aGF/Parzellenfläche), Gebäudehöhe, Vollgeschosse, Grenzabstand (aus
 * `pruefeGrundriss`, projektweit über alle Geschosse). Fehlt eine Grundlage
 * (keine Parzellenfläche, keine Zonenregel, keine Baugrenze), bleibt der
 * Wert ehrlich «—»/`unbekannt` statt erfunden — «Richtwerte, kein
 * Normersatz» wie überall im Kernel (s. `derive/checks.ts`).
 */
export function deriveAusnuetzungKennwerte(doc: KosmoDoc): AusnuetzungKennwert[] {
  const regel = doc.settings.zonenRegel;
  const liste = deriveBerechnungsliste(doc);
  const storeys = doc.storeysOrdered() as Storey[];
  const kennwerte: AusnuetzungKennwert[] = [];

  // Ausnützungsziffer (AZ) = Total aGF / Parzellenfläche
  const flaeche = doc.settings.parzellenFlaeche;
  const azIst = flaeche && flaeche > 0 ? liste.totalAgf / flaeche : null;
  const azErlaubt = regel?.az ?? null;
  kennwerte.push({
    label: 'Ausnützungsziffer (AZ)',
    ist: azIst !== null ? f2(azIst) : '—',
    erlaubt: azErlaubt !== null ? f2(azErlaubt) : '—',
    status: statusVonMax(azIst, azErlaubt),
  });

  // Gebäudehöhe
  const hoeheIst = gebaeudeHoeheIstMm(doc);
  const hoeheErlaubt = regel?.maxHoehe ?? null;
  kennwerte.push({
    label: 'Gebäudehöhe',
    ist: hoeheIst !== null ? `${f1(hoeheIst / 1000)} m` : '—',
    erlaubt: hoeheErlaubt !== null ? `${f1(hoeheErlaubt / 1000)} m` : '—',
    status: statusVonMax(hoeheIst, hoeheErlaubt),
  });

  // Vollgeschosse (Index >= 0) — kein Geschoss im Doc = keine Angabe, nicht «0»
  const vollIst = storeys.length > 0 ? storeys.filter((s) => s.index >= 0).length : null;
  const vollErlaubt = regel?.maxVollgeschosse ?? null;
  kennwerte.push({
    label: 'Vollgeschosse',
    ist: vollIst !== null ? String(vollIst) : '—',
    erlaubt: vollErlaubt !== null ? String(vollErlaubt) : '—',
    status: statusVonMax(vollIst, vollErlaubt),
  });

  // Grenzabstand: Status statt Zahl (Ist/Erlaubt sind hier keine vergleichbaren
  // Grössen) — aus pruefeGrundriss über ALLE Geschosse, nur wenn eine
  // Baugrenze überhaupt existiert (sonst wurde nichts geprüft — 'unbekannt',
  // nicht «ok» vortäuschen).
  const grenzen = doc.byKind<Boundary>('boundary');
  if (grenzen.length === 0) {
    const erlaubtTxt =
      regel?.grenzabstandKlein !== null && regel?.grenzabstandKlein !== undefined
        ? `≥ ${f1(regel.grenzabstandKlein / 1000)} m (Zonenregel, Richtwert)`
        : '—';
    kennwerte.push({ label: 'Grenzabstand', ist: '—', erlaubt: erlaubtTxt, status: 'unbekannt' });
  } else {
    const verletzungen = storeys
      .flatMap((s) => pruefeGrundriss(doc, s.id))
      .filter((b) => b.regel === 'Grenzabstand');
    const erlaubtTxt =
      regel?.grenzabstandKlein !== null && regel?.grenzabstandKlein !== undefined
        ? `≥ ${f1(regel.grenzabstandKlein / 1000)} m (Zonenregel, Richtwert)`
        : 'je Baugrenze (grenzabstand)';
    kennwerte.push({
      label: 'Grenzabstand',
      ist: verletzungen.length === 0 ? 'eingehalten' : `${verletzungen.length} Verletzung${verletzungen.length === 1 ? '' : 'en'}`,
      erlaubt: erlaubtTxt,
      status: verletzungen.length === 0 ? 'ok' : 'ueberschritten',
    });
  }

  return kennwerte;
}

export interface AusnuetzungsnachweisOptionen {
  /** Projektname für die Kopfzeile. */
  titel?: string;
  /** Vorformatiertes Datum (App liefert `toLocaleDateString('de-CH')` — KEIN `new Date()` im Kernel). */
  datum?: string;
  /** Aktuelle SIA-Teilphase des Projekts. */
  siaPhase?: SiaPhase;
  /** Name der aktiven Zonenregel, wenn vorhanden. */
  regelName?: string;
}

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

const STATUS_FARBE: Record<AusnuetzungKennwert['status'], { fill: string; text: string }> = {
  ok: { fill: '#eef3e6', text: '#2c5a2c' },
  ueberschritten: { fill: '#fbe9e7', text: '#a13a2f' },
  unbekannt: { fill: '#f2f2f2', text: '#666666' },
};

const STATUS_LABEL: Record<AusnuetzungKennwert['status'], string> = {
  ok: 'eingehalten',
  ueberschritten: 'überschritten',
  unbekannt: '—',
};

/**
 * Baut EIN eigenständiges, druckfähiges A4-SVG (`viewBox="0 0 794 1123"`) aus
 * einer bereits berechneten `Berechnungsliste` (`derive/berechnungsliste.ts`)
 * und den Zonenregel-Kennwerten (`deriveAusnuetzungKennwerte`). Deterministisch:
 * gleiche `liste`/`kennwerte`/`opts` ⇒ byte-identischer String.
 */
export function ausnuetzungsnachweisSvg(
  liste: Berechnungsliste,
  kennwerte: AusnuetzungKennwert[],
  opts: AusnuetzungsnachweisOptionen = {},
): string {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica, Arial, sans-serif">`,
  );
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);

  // ── Kopf ─────────────────────────────────────────────────────────────
  const titelZeile = `Ausnützungsnachweis${opts.titel ? ` — ${escapeXml(opts.titel)}` : ''}`;
  parts.push(
    `<text x="${MARGIN}" y="${HEADER_TITLE_Y}" font-size="22" font-weight="bold" fill="#111111">${titelZeile}</text>`,
  );

  const metaTeile: string[] = [];
  if (opts.siaPhase) metaTeile.push(escapeXml(siaPhaseLabel(opts.siaPhase)));
  if (opts.regelName) metaTeile.push(`Zonenregel «${escapeXml(opts.regelName)}»`);
  if (opts.datum) metaTeile.push(escapeXml(opts.datum));
  parts.push(
    `<text x="${MARGIN}" y="${HEADER_META_Y}" font-size="12.5" fill="#444444">${metaTeile.join(' · ')}</text>`,
  );
  parts.push(
    `<line x1="${MARGIN}" y1="${HEADER_RULE_Y}" x2="${W - MARGIN}" y2="${HEADER_RULE_Y}" stroke="#bbbbbb" stroke-width="1"/>`,
  );

  // ── Ehrlichkeits-Block (prominent, VOR den Tabellen) ────────────────
  parts.push(
    `<rect x="${MARGIN}" y="${HINWEIS_TOP}" width="${W - 2 * MARGIN}" height="${HINWEIS_HEIGHT}" fill="#f6f2e6" stroke="#c9bfa0" stroke-width="1"/>`,
  );
  parts.push(
    `<text x="${MARGIN + 14}" y="${HINWEIS_TOP + 18}" font-size="10.5" letter-spacing="1" fill="#8a7a4e">ZUSAMMENSTELLUNG — KEINE BEWILLIGUNG</text>`,
  );
  parts.push(
    `<text x="${MARGIN + 14}" y="${HINWEIS_TOP + 36}" font-size="13" font-weight="bold" fill="#111111">${escapeXml(BAUGESUCH_HINWEIS)}</text>`,
  );

  // ── Tabelle 1: Berechnungsliste (Raumprogramm + Flächen-Totale) ─────
  let y = T1_TOP;
  parts.push(
    `<text x="${MARGIN}" y="${y}" font-size="13.5" font-weight="bold" fill="#111111">Berechnungsliste</text>`,
  );
  y += 14;

  if (liste.zeilen.length === 0 && liste.totalGf === 0 && liste.totalAgf === 0) {
    parts.push(
      `<text x="${MARGIN}" y="${(y + 16).toFixed(2)}" font-size="12.5" fill="#666666">Keine Geometrie — noch keine Decken oder Volumenkörper im Modell, keine Kennzahlen ableitbar.</text>`,
    );
    y += 40;
  } else {
    if (liste.zeilen.length > 0) {
      const usableW = W - 2 * MARGIN;
      const numColW = Math.min(T1_NUM_W, (usableW - T1_TYP_W) / 4);
      const tableHeight = T1_HEADER_H + liste.zeilen.length * T1_ROW_H;
      parts.push(
        `<rect x="${MARGIN}" y="${y}" width="${usableW}" height="${tableHeight}" fill="none" stroke="#999999" stroke-width="1"/>`,
      );
      const headers = ['Typ', 'HNF-Soll', 'aGF-Ziel', 'Ausgezogen', 'Differenz'];
      headers.forEach((h, i) => {
        const cx = i === 0 ? MARGIN + 6 : MARGIN + T1_TYP_W + (i - 1) * numColW + numColW - 6;
        parts.push(
          `<text x="${cx.toFixed(2)}" y="${(y + 15).toFixed(2)}" font-size="10.5" font-weight="bold" ${i === 0 ? '' : 'text-anchor="end"'} fill="#111111">${h}</text>`,
        );
      });
      parts.push(
        `<line x1="${MARGIN}" y1="${(y + T1_HEADER_H).toFixed(2)}" x2="${W - MARGIN}" y2="${(y + T1_HEADER_H).toFixed(2)}" stroke="#999999" stroke-width="1"/>`,
      );
      liste.zeilen.forEach((zeile, i) => {
        const rowY = y + T1_HEADER_H + i * T1_ROW_H;
        parts.push(
          `<text x="${MARGIN + 6}" y="${(rowY + 14).toFixed(2)}" font-size="10.5" fill="${zeile.farbe}">${escapeXml(zeile.name)}</text>`,
        );
        const werte = [m2Fmt(zeile.hnfSoll), m2Fmt(zeile.agfZiel), m2Fmt(zeile.ausgezogen), `${zeile.differenz >= 0 ? '+' : ''}${m2Fmt(zeile.differenz)}`];
        werte.forEach((w, ci) => {
          const cx = MARGIN + T1_TYP_W + ci * numColW + numColW - 6;
          parts.push(
            `<text x="${cx.toFixed(2)}" y="${(rowY + 14).toFixed(2)}" font-size="10.5" text-anchor="end" fill="#222222">${w}</text>`,
          );
        });
      });
      y += tableHeight + 10;
    }

    const totalZeilen: string[] = [`Total GF: ${m2Fmt(liste.totalGf)}`, `Total aGF: ${m2Fmt(liste.totalAgf)}`];
    if (liste.untypisiert > 0) totalZeilen.push(`Untypisiert: ${m2Fmt(liste.untypisiert)} (Tie-out-Hinweis)`);
    if (liste.deltaMax !== null) {
      totalZeilen.push(`Δ Max: ${liste.deltaMax >= 0 ? '+' : ''}${m2Fmt(liste.deltaMax)}`);
    }
    parts.push(
      `<text x="${MARGIN}" y="${(y + 12).toFixed(2)}" font-size="11.5" font-weight="bold" fill="#111111">${totalZeilen.join('   ·   ')}</text>`,
    );
    y += 26;
  }

  // ── Tabelle 2: Zonenregel-Gegenüberstellung ─────────────────────────
  y += T2_GAP; // fester Abstand zur vorigen Sektion (deterministisch, kein Auto-Layout-Zufall)
  parts.push(
    `<text x="${MARGIN}" y="${y}" font-size="13.5" font-weight="bold" fill="#111111">Zonenregel-Gegenüberstellung</text>`,
  );
  y += 14;

  const t2TableTop = y;
  const t2TableHeight = T2_HEADER_H + kennwerte.length * T2_ROW_H;
  const usableW2 = W - 2 * MARGIN;
  parts.push(
    `<rect x="${MARGIN}" y="${t2TableTop}" width="${usableW2}" height="${t2TableHeight}" fill="none" stroke="#999999" stroke-width="1"/>`,
  );
  const headers2 = ['Kennwert', 'Ist', 'Erlaubt', 'Status'];
  headers2.forEach((h, i) => {
    const cx = i === 0 ? MARGIN + 6 : MARGIN + T2_LABEL_W + (i - 1) * T2_COL_W + T2_COL_W / 2;
    parts.push(
      `<text x="${cx.toFixed(2)}" y="${(t2TableTop + 16).toFixed(2)}" font-size="11" font-weight="bold" ${i === 0 ? '' : 'text-anchor="middle"'} fill="#111111">${h}</text>`,
    );
  });
  parts.push(
    `<line x1="${MARGIN}" y1="${(t2TableTop + T2_HEADER_H).toFixed(2)}" x2="${W - MARGIN}" y2="${(t2TableTop + T2_HEADER_H).toFixed(2)}" stroke="#999999" stroke-width="1"/>`,
  );
  kennwerte.forEach((k, i) => {
    const rowY = t2TableTop + T2_HEADER_H + i * T2_ROW_H;
    const farbe = STATUS_FARBE[k.status];
    parts.push(
      `<rect x="${MARGIN}" y="${rowY.toFixed(2)}" width="${usableW2}" height="${T2_ROW_H}" fill="${farbe.fill}"/>`,
    );
    parts.push(
      `<text x="${MARGIN + 6}" y="${(rowY + 17).toFixed(2)}" font-size="11.5" fill="#111111">${escapeXml(k.label)}</text>`,
    );
    parts.push(
      `<text x="${(MARGIN + T2_LABEL_W + T2_COL_W / 2).toFixed(2)}" y="${(rowY + 17).toFixed(2)}" font-size="11.5" text-anchor="middle" fill="#222222">${escapeXml(k.ist)}</text>`,
    );
    parts.push(
      `<text x="${(MARGIN + T2_LABEL_W + T2_COL_W + T2_COL_W / 2).toFixed(2)}" y="${(rowY + 17).toFixed(2)}" font-size="11.5" text-anchor="middle" fill="#222222">${escapeXml(k.erlaubt)}</text>`,
    );
    parts.push(
      `<text x="${(MARGIN + T2_LABEL_W + 2 * T2_COL_W + T2_COL_W / 2).toFixed(2)}" y="${(rowY + 17).toFixed(2)}" font-size="11.5" font-weight="bold" text-anchor="middle" fill="${farbe.text}">${STATUS_LABEL[k.status]}</text>`,
    );
    if (i < kennwerte.length - 1) {
      parts.push(
        `<line x1="${MARGIN}" y1="${(rowY + T2_ROW_H).toFixed(2)}" x2="${W - MARGIN}" y2="${(rowY + T2_ROW_H).toFixed(2)}" stroke="#e2e2e2" stroke-width="1"/>`,
      );
    }
  });
  y = t2TableTop + t2TableHeight;

  // ── Grenzen-Block (Fusszeile) ────────────────────────────────────────
  const fussSaetze = [
    BAUGESUCH_HINWEIS + '.',
    'Grenzen: Richtwerte aus dem Modell (kein Normersatz) — die Zonenregel bildet nur das kommunale Baureglement nach, Grenzabstand-Status prüft nur, was als Baugrenze gezeichnet ist.',
  ];
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

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * UTF-8-sicherer Base64-Encoder ohne `Buffer`/`btoa`-Abhängigkeit — läuft
 * identisch im Kernel-Test (Node) und in der App (Browser), damit das
 * Ausnützungsnachweis-SVG (mit Umlauten) als `image/svg+xml`-ImageAsset auf
 * ein Baugesuch-Blatt eingebettet werden kann (`publish.baugesuchErstellen`).
 */
export function utf8ToBase64(text: string): string {
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 0x3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    out += b1 === undefined ? '=' : B64_CHARS[((b1 & 0xf) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    out += b2 === undefined ? '=' : B64_CHARS[b2 & 0x3f];
  }
  return out;
}
