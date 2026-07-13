import type { SiaPhase } from '../model/doc';
import { siaPhaseLabel } from '../model/doc';
import { escapeXml } from './plansvg';
import { messbarAttr, titelAttr, versal } from './stilblatt';

/**
 * Projekt-Dossier (v0.7.6 Welle 3 Stream F, ClaudeDesign-Handoff
 * `design_handoff_kosmo_viz/Kosmo Viz Report Dossier.dc.html` + README §8/§10
 * — Report-Druck-Layouts, Hellmodus, A4 hoch) — druckfähiges, MEHRTEILIGES
 * Exportartefakt, gebaut nach demselben Muster wie `derive/kvblatt.ts`/
 * `derive/bauablaufblatt.ts`/`derive/studienbericht.ts`: EIN eigenständiges
 * SVG, reine Funktion (kein Doc-Zugriff, kein `Date.now()`/`Math.random()`
 * im Kernel — Datum kommt als vorformatierter String-Parameter vom
 * Aufrufer), gleiche Eingaben liefern byte-identisches SVG (Golden-Test-
 * fähig). STRIKT ADDITIV: berührt keinen der fünf bestehenden Report-Deriver
 * (`kvblatt.ts`, `bauablaufblatt.ts`, `studienbericht.ts`,
 * `abnahmeprotokoll.ts`, `ausnuetzungsnachweis.ts`) oder ihre Goldens.
 *
 * A4 hoch, `viewBox="0 0 794 1123"` — dieselbe mm→px-Skala wie `kvBlattSvg`.
 *
 * Soll-Bild (`Kosmo Viz Report Dossier.dc.html`, README §10 Nachtrag):
 * «Print, A4 hoch, Hellmodus … Mono-Kopfzeilen/IDs, Rollen-Hairlines, keine
 * Glass/Glow im Druck. Platzhalter (`image-slot`) für Pläne/Render — «Papier
 * ist Papier»». Dieses Modul überträgt das Soll-Bild NUR in reine SVG-
 * Geometrie (keine HTML/DC-Runtime im Kernel):
 *   - Titel-/Messbar-Stimme aus `derive/stilblatt.ts` (dieselben Tokens wie
 *     alle übrigen Blätter) für Titel, Kopf-Mono-Band und Meta-IDs.
 *   - Rollen-Hairlines: ein dünner, farbiger Unterstrich je Herkunfts-
 *     Kettenglied (`DOSSIER_ROLLEN`, unten) — eigene, papiertaugliche Töne,
 *     NICHT die Dunkelmodus-Rollenfarben aus dem Kosmo-Viz-Tokensatz (kein
 *     `@kosmo/ui`/aura-Import im Kernel, harte Farbliterale wie in jedem
 *     anderen Report-Deriver).
 *   - Bild-Slots: gestrichelte Platzhalter-Rahmen für Pläne/Render, eigene
 *     Literale statt `stilblatt.ts`s `PLATZHALTER`/`DASH` — jene sind für
 *     den mm-skalierten Plansatz kalibriert (Stiftbreiten wie 0.25/0.35),
 *     dieses Blatt rechnet wie `kvBlattSvg`/`bauablaufBlattSvg` in
 *     Papier-PIXELN (Stiftbreiten wie 1) — direktes Wiederverwenden würde
 *     unsichtbar feine Linien erzeugen.
 *
 * Ehrlichkeit (Grundsatz aller Report-Deriver): Kopf, Ehrlichkeits-Block
 * (`DOSSIER_HINWEIS`, prominent VOR dem Inhalt) und der Grenzen-Block am Fuss
 * erscheinen immer; alle übrigen Abschnitte (Übersicht, Kennzahlen,
 * Bild-Slots, Parameter, Herkunft, Governance) erscheinen NUR, wenn der
 * Aufrufer die jeweiligen Daten mitgibt — ohne Projektdaten bleibt das Blatt
 * ein kurzer, gültiger Platzhalter-Report statt eines leeren/kaputten SVG.
 * Alle Werte (Kennzahlen, Parameter, …) sind bereits formatierte Strings des
 * Aufrufers — dieses Modul rechnet nichts nach, es komponiert nur das Blatt.
 */

const W = 794;
const H = 1123;
const MARGIN = 40;
const CONTENT_W = W - 2 * MARGIN;

/** Titel-Grösse wie `kvBlattSvg` (empirisch für 794 px Breite + Versal-Tracking getunt, s. dortiger Kommentar). */
const HEADER_TITLE_SIZE = 17;

const RUNNING_HEADER_Y = 26;
const RUNNING_HEADER_RULE_Y = 34;
const TITLE_Y = 64;
const UNTERTITEL_Y = 84;
const META_Y = 104;
const HEADER_RULE_Y = 116;

const HINWEIS_TOP = 126;
const HINWEIS_HEIGHT = 34;
const HINWEIS_BOTTOM = HINWEIS_TOP + HINWEIS_HEIGHT;

const CONTENT_TOP = HINWEIS_BOTTOM + 20;
const SECTION_GAP = 18;
const HEADING_TO_CONTENT = 26;

/** Abschnitts-Titel-Ton (gedämpftes Teal, papiertauglich — dieselbe Familie
 * wie `DOSSIER_ROLLEN.system` unten, aber als eigene Konstante benannt, weil
 * sie eine Layout-Rolle trägt, keine Herkunfts-Bedeutung). */
const SECTION_HEAD_COLOR = '#2f7480';

/**
 * Rollen-Hairlines (Soll-Bild §3/§4 «Rollen-→-Modus-Mapping»): je
 * Herkunfts-Kettenglied ein dünner Unterstrich in dieser Farbe. Eigene,
 * dunklere Töne für Hellmodus/Papier — die Kosmo-Viz-Dunkelmodus-
 * Rollenfarben (`--role-*`, README §4) sind auf `#0B0D12` kalibriert und auf
 * Weiss zu kontrastarm; `agent` teilt bewusst den Goldton, den
 * `KV_HINWEIS`/`BAUABLAUF_HINWEIS`-Blöcke bereits für «Richtwert/Empfehlung»
 * verwenden (`#8a7a4e`) — dieselbe Familie, nicht zufällig gleich.
 */
export const DOSSIER_ROLLEN = {
  database: '#8a6d52',
  pna: '#8f5f82',
  generator: '#a85850',
  system: '#2f7480',
  manual: '#4f8f6f',
  agent: '#8a7a4e',
} as const;

export type DossierRolle = keyof typeof DOSSIER_ROLLEN;

export const DOSSIER_HINWEIS =
  'Kuratierter Projektstand — keine Baueingabe, kein Devis, ersetzt keine amtliche Dokumentation.';

export interface DossierKennzahl {
  wert: string;
  label: string;
}

export interface DossierParameterZeile {
  label: string;
  wert: string;
}

export interface DossierBildSlot {
  /** Bildunterschrift (z.B. «Abb. 1 — Visualisierung Nordfassade …»). */
  bildunterschrift: string;
}

export interface DossierHerkunftSchritt {
  label: string;
  /** Rollen-Schlüssel für die Hairline-Farbe; fehlt er, bleibt die Hairline neutral grau. */
  rolle?: DossierRolle;
}

export interface DossierGovernance {
  freigabeText: string;
  freigegebenVon?: string;
  /** Vorformatiertes Datum (App liefert `toLocaleDateString('de-CH')` — KEIN `new Date()` im Kernel). */
  datum?: string;
}

export interface ProjektDossierOptionen {
  /** Projektname — erscheint im Titel («Projekt-Dossier — {titel}»). */
  titel?: string;
  /** Kurzbeschrieb unter dem Titel (Soll-Bild: `.subtitle`). */
  untertitel?: string;
  /** Projekt-Nr. — erscheint im Kopf-Mono-Band («PROJEKT #…»). */
  projektNr?: string;
  bauherr?: string;
  siaPhase?: SiaPhase;
  /** Vorformatiertes Datum (App liefert `toLocaleDateString('de-CH')` — KEIN `new Date()` im Kernel). */
  datum?: string;
  /** Zeigt «VERTRAULICH» im Kopf-Mono-Band, wenn keine Projekt-Nr. gesetzt ist. */
  vertraulich?: boolean;
  uebersichtLead?: string;
  uebersichtText?: string;
  kennzahlen?: DossierKennzahl[];
  bildSlots?: DossierBildSlot[];
  parameter?: DossierParameterZeile[];
  herkunft?: DossierHerkunftSchritt[];
  governance?: DossierGovernance;
}

/** Wortweiser Zeilenumbruch (Zeichen-Schätzung, wie `kvBlattSvg`/`bauablaufBlattSvg`). */
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

/** Grobe Zeichenbreiten-Schätzung für Mono-Text (IBM Plex Mono ≈ 0.6em je
 * Zeichen, grosszügig gerundet — reicht für Umbruch-/Zeilenlauf-
 * Entscheidungen der Herkunfts-Kette, keine echte Font-Metrik nötig). */
function monoWidth(s: string, size: number): number {
  return s.length * size * 0.64;
}

/** Abschnitts-Überschrift (Mono-Versal, Teal, Trennlinie) — liefert die
 * Y-Koordinate, ab der der Abschnittsinhalt beginnt. */
function sectionHeading(parts: string[], y: number, label: string): number {
  parts.push(
    `<text x="${MARGIN}" y="${y}" ${messbarAttr(11)} letter-spacing="1.4" fill="${SECTION_HEAD_COLOR}">${versal(escapeXml(label))}</text>`,
  );
  const ruleY = y + 8;
  parts.push(`<line x1="${MARGIN}" y1="${ruleY}" x2="${W - MARGIN}" y2="${ruleY}" stroke="#dddddd" stroke-width="1"/>`);
  return ruleY + HEADING_TO_CONTENT;
}

/**
 * Baut EIN eigenständiges, druckfähiges A4-hoch-SVG (`viewBox="0 0 794
 * 1123"`) aus bereits aufbereiteten Dossier-Daten — Composer-Funktion wie
 * `kvBlattSvg`/`bauablaufBlattSvg`/`studienBerichtSvg`. Deterministisch:
 * gleiche `opts` ⇒ byte-identischer String.
 */
export function projektDossierSvg(opts: ProjektDossierOptionen = {}): string {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica, Arial, sans-serif">`,
  );
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);

  // ── Kopf-Mono-Band («Mono-Kopf/IDs», Soll-Bild §10) ─────────────────
  const kopfLinks = 'Architekturkosmos · Projekt-Dossier';
  const kopfRechts = opts.projektNr ? `Projekt #${opts.projektNr}` : opts.vertraulich ? 'Vertraulich' : '';
  parts.push(
    `<text x="${MARGIN}" y="${RUNNING_HEADER_Y}" ${messbarAttr(9.5)} letter-spacing="1.2" fill="#8a8a8a">${versal(escapeXml(kopfLinks))}</text>`,
  );
  if (kopfRechts) {
    parts.push(
      `<text x="${W - MARGIN}" y="${RUNNING_HEADER_Y}" ${messbarAttr(9.5)} letter-spacing="1.2" text-anchor="end" fill="#8a8a8a">${versal(escapeXml(kopfRechts))}</text>`,
    );
  }
  parts.push(
    `<line x1="${MARGIN}" y1="${RUNNING_HEADER_RULE_Y}" x2="${W - MARGIN}" y2="${RUNNING_HEADER_RULE_Y}" stroke="#e2e2e2" stroke-width="1"/>`,
  );

  // ── Titelblock ───────────────────────────────────────────────────────
  const titelZeile = versal(`Projekt-Dossier${opts.titel ? ` — ${escapeXml(opts.titel)}` : ''}`);
  parts.push(`<text x="${MARGIN}" y="${TITLE_Y}" ${titelAttr(HEADER_TITLE_SIZE)} fill="#111111">${titelZeile}</text>`);
  if (opts.untertitel) {
    parts.push(
      `<text x="${MARGIN}" y="${UNTERTITEL_Y}" ${titelAttr(12.5)} fill="#444444">${escapeXml(opts.untertitel)}</text>`,
    );
  }

  const metaTeile: string[] = [];
  if (opts.bauherr) metaTeile.push(escapeXml(opts.bauherr));
  if (opts.siaPhase) metaTeile.push(escapeXml(siaPhaseLabel(opts.siaPhase)));
  if (opts.datum) metaTeile.push(escapeXml(opts.datum));
  if (metaTeile.length > 0) {
    parts.push(
      `<text x="${MARGIN}" y="${META_Y}" ${messbarAttr(10.5)} letter-spacing="0.6" fill="#666666">${versal(metaTeile.join(' · '))}</text>`,
    );
  }
  parts.push(
    `<line x1="${MARGIN}" y1="${HEADER_RULE_Y}" x2="${W - MARGIN}" y2="${HEADER_RULE_Y}" stroke="#bbbbbb" stroke-width="1"/>`,
  );

  // ── Ehrlichkeits-Block (prominent, VOR dem Inhalt) ──────────────────
  parts.push(
    `<rect x="${MARGIN}" y="${HINWEIS_TOP}" width="${CONTENT_W}" height="${HINWEIS_HEIGHT}" fill="#f6f2e6" stroke="#c9bfa0" stroke-width="1"/>`,
  );
  parts.push(
    `<text x="${MARGIN + 14}" y="${HINWEIS_TOP + 21}" font-size="12" font-weight="bold" fill="#111111">${escapeXml(DOSSIER_HINWEIS)}</text>`,
  );

  let y = CONTENT_TOP;
  const hatInhalt =
    Boolean(opts.uebersichtLead || opts.uebersichtText) ||
    (opts.kennzahlen?.length ?? 0) > 0 ||
    (opts.bildSlots?.length ?? 0) > 0 ||
    (opts.parameter?.length ?? 0) > 0 ||
    (opts.herkunft?.length ?? 0) > 0 ||
    Boolean(opts.governance);

  if (!hatInhalt) {
    // Ehrlichkeit statt leerem/kaputtem SVG (K1-Grundsatz aller Report-Deriver).
    parts.push(
      `<text x="${MARGIN}" y="${y + 16}" font-size="13" fill="#666666">Kein Projektinhalt — Dossier noch leer (keine Übersicht, Kennzahlen, Bild-Slots, Parameter, Herkunft oder Freigabe übergeben).</text>`,
    );
  } else {
    // ── Übersicht ─────────────────────────────────────────────────────
    if (opts.uebersichtLead || opts.uebersichtText) {
      y = sectionHeading(parts, y, 'Übersicht');
      if (opts.uebersichtLead) {
        const zeilen = wrapText(opts.uebersichtLead, Math.floor(CONTENT_W / 6.6));
        for (const zeile of zeilen) {
          parts.push(`<text x="${MARGIN}" y="${y}" font-size="12.5" font-weight="600" fill="#111111">${escapeXml(zeile)}</text>`);
          y += 17;
        }
      }
      if (opts.uebersichtText) {
        y += 3;
        const zeilen = wrapText(opts.uebersichtText, Math.floor(CONTENT_W / 5.6));
        for (const zeile of zeilen) {
          parts.push(`<text x="${MARGIN}" y="${y}" font-size="11" fill="#333333">${escapeXml(zeile)}</text>`);
          y += 15;
        }
      }
      y += SECTION_GAP;
    }

    // ── Kennzahlen (Kachelraster, 3 Spalten) ────────────────────────────
    if ((opts.kennzahlen?.length ?? 0) > 0) {
      y = sectionHeading(parts, y, 'Kennzahlen');
      const kennzahlen = opts.kennzahlen!;
      const cols = 3;
      const gap = 10;
      const tileW = (CONTENT_W - (cols - 1) * gap) / cols;
      const tileH = 50;
      kennzahlen.forEach((k, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const tx = MARGIN + col * (tileW + gap);
        const ty = y + row * (tileH + gap);
        parts.push(
          `<rect x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" width="${tileW.toFixed(2)}" height="${tileH}" fill="none" stroke="#dddddd" stroke-width="1" rx="4"/>`,
        );
        parts.push(
          `<text x="${(tx + 12).toFixed(2)}" y="${(ty + 24).toFixed(2)}" font-size="17" font-weight="bold" fill="#111111">${escapeXml(k.wert)}</text>`,
        );
        parts.push(
          `<text x="${(tx + 12).toFixed(2)}" y="${(ty + 38).toFixed(2)}" ${messbarAttr(9)} letter-spacing="0.6" fill="#777777">${versal(escapeXml(k.label))}</text>`,
        );
      });
      const rows = Math.ceil(kennzahlen.length / cols);
      y += rows * tileH + (rows - 1) * gap + SECTION_GAP;
    }

    // ── Bild-Slots (Pläne/Render, Platzhalter-Rahmen) ───────────────────
    if ((opts.bildSlots?.length ?? 0) > 0) {
      y = sectionHeading(parts, y, 'Pläne & Render');
      const slots = opts.bildSlots!;
      const gap = 14;
      const slotW = (CONTENT_W - (slots.length - 1) * gap) / slots.length;
      const boxH = 118;
      const capMaxChars = Math.floor(slotW / 5.4);
      const capLinesJeSlot = slots.map((s) => wrapText(s.bildunterschrift, capMaxChars));
      slots.forEach((slot, i) => {
        const sx = MARGIN + i * (slotW + gap);
        parts.push(
          `<rect x="${sx.toFixed(2)}" y="${y}" width="${slotW.toFixed(2)}" height="${boxH}" fill="none" stroke="#999999" stroke-width="1" stroke-dasharray="6 3"/>`,
        );
        parts.push(
          `<line x1="${sx.toFixed(2)}" y1="${y}" x2="${(sx + slotW).toFixed(2)}" y2="${y + boxH}" stroke="#cccccc" stroke-width="1"/>`,
        );
        parts.push(
          `<line x1="${(sx + slotW).toFixed(2)}" y1="${y}" x2="${sx.toFixed(2)}" y2="${y + boxH}" stroke="#cccccc" stroke-width="1"/>`,
        );
        parts.push(
          `<text x="${(sx + slotW / 2).toFixed(2)}" y="${(y + boxH / 2).toFixed(2)}" text-anchor="middle" font-size="10.5" fill="#888888">Bild-Slot — Plan/Render</text>`,
        );
        let capY = y + boxH + 14;
        for (const zeile of capLinesJeSlot[i]!) {
          parts.push(`<text x="${sx.toFixed(2)}" y="${capY.toFixed(2)}" ${messbarAttr(9)} fill="#777777">${escapeXml(zeile)}</text>`);
          capY += 12;
        }
      });
      const maxCapLines = Math.max(0, ...capLinesJeSlot.map((l) => l.length));
      y += boxH + 14 + maxCapLines * 12 + SECTION_GAP;
    }

    // ── Parameter-Tabelle ────────────────────────────────────────────────
    if ((opts.parameter?.length ?? 0) > 0) {
      y = sectionHeading(parts, y, 'Parameter');
      const params = opts.parameter!;
      const labelColW = 220;
      const rowH = 20;
      const headerH = 22;
      const tableH = headerH + params.length * rowH;
      parts.push(
        `<rect x="${MARGIN}" y="${y}" width="${CONTENT_W}" height="${tableH}" fill="none" stroke="#999999" stroke-width="1"/>`,
      );
      parts.push(`<text x="${MARGIN + 8}" y="${(y + 15).toFixed(2)}" font-size="10.5" font-weight="bold" fill="#111111">Parameter</text>`);
      parts.push(
        `<text x="${(MARGIN + labelColW + 8).toFixed(2)}" y="${(y + 15).toFixed(2)}" font-size="10.5" font-weight="bold" fill="#111111">Wert</text>`,
      );
      parts.push(
        `<line x1="${MARGIN}" y1="${(y + headerH).toFixed(2)}" x2="${W - MARGIN}" y2="${(y + headerH).toFixed(2)}" stroke="#999999" stroke-width="1"/>`,
      );
      params.forEach((p, i) => {
        const rowY = y + headerH + i * rowH;
        parts.push(
          `<text x="${MARGIN + 8}" y="${(rowY + 14).toFixed(2)}" ${messbarAttr(10)} fill="#777777">${escapeXml(p.label)}</text>`,
        );
        parts.push(
          `<text x="${(MARGIN + labelColW + 8).toFixed(2)}" y="${(rowY + 14).toFixed(2)}" ${messbarAttr(10)} fill="#222222">${escapeXml(p.wert)}</text>`,
        );
        if (i < params.length - 1) {
          parts.push(
            `<line x1="${MARGIN}" y1="${(rowY + rowH).toFixed(2)}" x2="${W - MARGIN}" y2="${(rowY + rowH).toFixed(2)}" stroke="#eeeeee" stroke-width="1"/>`,
          );
        }
      });
      y += tableH + SECTION_GAP;
    }

    // ── Herkunft (Pipeline-Kette mit Rollen-Hairlines) ──────────────────
    if ((opts.herkunft?.length ?? 0) > 0) {
      y = sectionHeading(parts, y, 'Herkunft');
      const schritte = opts.herkunft!;
      const size = 10;
      const arrowW = 20;
      const rowH = 26;
      let x = MARGIN;
      let rowY = y;
      schritte.forEach((s, i) => {
        const label = versal(escapeXml(s.label));
        const w = monoWidth(label, size);
        if (x + w > W - MARGIN && x > MARGIN) {
          x = MARGIN;
          rowY += rowH;
        }
        const farbe = s.rolle ? DOSSIER_ROLLEN[s.rolle] : '#999999';
        parts.push(
          `<text x="${x.toFixed(2)}" y="${rowY.toFixed(2)}" ${messbarAttr(size)} letter-spacing="0.6" fill="#333333">${label}</text>`,
        );
        parts.push(
          `<line x1="${x.toFixed(2)}" y1="${(rowY + 4).toFixed(2)}" x2="${(x + w).toFixed(2)}" y2="${(rowY + 4).toFixed(2)}" stroke="${farbe}" stroke-width="2"/>`,
        );
        x += w + 10;
        if (i < schritte.length - 1) {
          if (x + arrowW > W - MARGIN) {
            x = MARGIN;
            rowY += rowH;
          }
          parts.push(`<text x="${x.toFixed(2)}" y="${rowY.toFixed(2)}" font-size="${size}" fill="#aaaaaa">→</text>`);
          x += arrowW;
        }
      });
      y = rowY + rowH - 6 + SECTION_GAP;
    }

    // ── Governance & Freigabe ────────────────────────────────────────────
    if (opts.governance) {
      y = sectionHeading(parts, y, 'Governance & Freigabe');
      const g = opts.governance;
      const boxPad = 14;
      const textZeilen = wrapText(g.freigabeText, Math.floor((CONTENT_W - 2 * boxPad) / 5.6));
      const textH = textZeilen.length * 15;
      const hatSign = Boolean(g.freigegebenVon || g.datum);
      const boxH = boxPad * 2 + textH + (hatSign ? 30 : 0);
      parts.push(
        `<rect x="${MARGIN}" y="${y}" width="${CONTENT_W}" height="${boxH}" fill="#f6f2e6" stroke="#c9bfa0" stroke-width="1" rx="4"/>`,
      );
      let ty = y + boxPad + 11;
      for (const zeile of textZeilen) {
        parts.push(`<text x="${MARGIN + boxPad}" y="${ty.toFixed(2)}" font-size="12" font-weight="600" fill="#111111">${escapeXml(zeile)}</text>`);
        ty += 15;
      }
      if (hatSign) {
        const signY = y + boxPad + textH + 8;
        const halfX = MARGIN + CONTENT_W / 2 + 10;
        parts.push(
          `<line x1="${MARGIN + boxPad}" y1="${signY.toFixed(2)}" x2="${(MARGIN + boxPad + 220).toFixed(2)}" y2="${signY.toFixed(2)}" stroke="#999999" stroke-width="1"/>`,
        );
        parts.push(
          `<line x1="${halfX.toFixed(2)}" y1="${signY.toFixed(2)}" x2="${(halfX + 220).toFixed(2)}" y2="${signY.toFixed(2)}" stroke="#999999" stroke-width="1"/>`,
        );
        const freigabeLabel = versal(g.freigegebenVon ? `Freigegeben · ${escapeXml(g.freigegebenVon)}` : 'Freigegeben');
        const datumLabel = versal(g.datum ? `Datum · ${escapeXml(g.datum)}` : 'Datum');
        parts.push(
          `<text x="${MARGIN + boxPad}" y="${(signY + 13).toFixed(2)}" ${messbarAttr(9)} letter-spacing="0.6" fill="#777777">${freigabeLabel}</text>`,
        );
        parts.push(
          `<text x="${halfX.toFixed(2)}" y="${(signY + 13).toFixed(2)}" ${messbarAttr(9)} letter-spacing="0.6" fill="#777777">${datumLabel}</text>`,
        );
      }
      y += boxH + SECTION_GAP;
    }
  }

  // ── Grenzen-Block (EIN sauberer Fusszeilen-Block, wie alle Report-Deriver) ──
  const grenzenSaetze = [
    DOSSIER_HINWEIS,
    'Grenzen: Kennzahlen und Parameter sind vom Aufrufer gelieferte Werte, keine Kernel-Berechnung dieses Blatts — Bild-Slots zeigen einen Platzhalter, bis echte Pläne/Renders eingebettet sind.',
  ];
  const maxChars = Math.floor(CONTENT_W / 5.4);
  const fussZeilen = grenzenSaetze.flatMap((satz) => wrapText(satz, maxChars));
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
