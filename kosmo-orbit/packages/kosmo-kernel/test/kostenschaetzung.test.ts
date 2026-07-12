import { describe, expect, it } from 'vitest';
import { pruefeGolden } from './golden-helfer';
import { readFileSync } from 'node:fs';
import {
  KosmoDoc,
  execute,
  invertPatches,
  parseKosmoSafe,
  CommandError,
  deriveKostenschaetzung,
  kvBlattSvg,
  KV_HINWEIS,
  defaultKvKennwerte,
  siaPhaseLabel,
} from '../src';

/**
 * KV-Grobschätzung (v0.6.3, `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4,
 * Lücken-Batch 3, Owner-Hauptaufgabe K22) — Kernel-Tests für
 * `derive/kostenschaetzung.ts` (die reine Schätzfunktion), das additive
 * Settings-Feld `kvKennwerte` (Roundtrip/Parse-Guard, analog `siaPhase`,
 * ROADMAP 233), den Command `design.kvKennwerteSetzen` und das
 * `derive/kvblatt.ts`-Exportartefakt (Golden-SVG).
 */

function setupDoc() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  return { doc, storeyId };
}

/** 10×20 m Decke → 200 m² GF (exakte, leicht nachrechenbare Fläche). */
function zeichneDecke(doc: KosmoDoc, storeyId: string): void {
  execute(doc, 'design.deckeZeichnen', {
    storeyId,
    outline: [
      { x: 0, y: 0 },
      { x: 10000, y: 0 },
      { x: 10000, y: 20000 },
      { x: 0, y: 20000 },
    ],
    thickness: 250,
  });
}

describe('deriveKostenschaetzung — Flächen × Kennwert (exakt)', () => {
  it('200 m² GF × Default-Kennwerte ergibt exakt nachrechenbare BKP-Positionen', () => {
    const { doc, storeyId } = setupDoc();
    zeichneDecke(doc, storeyId);
    const kv = deriveKostenschaetzung(doc);

    expect(kv.flaecheGf).toBeCloseTo(200, 5);
    const bkp2Basis = 200 * defaultKvKennwerte.chfProM2Gf; // 380'000
    const rohbau = bkp2Basis * defaultKvKennwerte.anteilRohbau; // 171'000
    const ausbau = bkp2Basis * defaultKvKennwerte.anteilAusbau; // 152'000
    const technik = bkp2Basis * defaultKvKennwerte.anteilTechnik; // 57'000
    expect(kv.positionen.find((p) => p.bkp === 'BKP 2.1')!.betrag).toBe(Math.round(rohbau));
    expect(kv.positionen.find((p) => p.bkp === 'BKP 2.2')!.betrag).toBe(Math.round(ausbau));
    expect(kv.positionen.find((p) => p.bkp === 'BKP 2.3')!.betrag).toBe(Math.round(technik));
    expect(kv.summeBkp2).toBe(Math.round(rohbau + ausbau + technik));
    expect(kv.summeBkp2).toBe(380000);
  });

  it('BKP 4/BKP 5/Reserve sind exakte %-Zuschläge auf die jeweilige Basis', () => {
    const { doc, storeyId } = setupDoc();
    zeichneDecke(doc, storeyId);
    const kv = deriveKostenschaetzung(doc);

    const erwarteterBkp4 = Math.round(kv.summeBkp2 * defaultKvKennwerte.zuschlagUmgebung);
    const erwarteterBkp5 = Math.round(kv.summeBkp2 * defaultKvKennwerte.zuschlagBaunebenkosten);
    expect(kv.summeBkp4).toBe(erwarteterBkp4);
    expect(kv.summeBkp5).toBe(erwarteterBkp5);

    const zwischensumme = kv.summeBkp2 + kv.summeBkp4 + kv.summeBkp5;
    const erwarteteReserve = Math.round(zwischensumme * defaultKvKennwerte.reserve);
    // Reserve wird VOR der Rundung von summeBkp2/4/5 aus den Rohbeträgen gerechnet,
    // darum hier auf 1 CHF Toleranz statt exakter Gleichheit (Rundungs-Reihenfolge).
    expect(kv.reserveBetrag).toBeCloseTo(erwarteteReserve, -1);
    expect(kv.total).toBeCloseTo(zwischensumme + kv.reserveBetrag, -1);
  });

  it('Overrides ersetzen einzelne Kennwerte NUR für den Aufruf, mutieren doc.settings nicht', () => {
    const { doc, storeyId } = setupDoc();
    zeichneDecke(doc, storeyId);
    const ohne = deriveKostenschaetzung(doc);
    const mit = deriveKostenschaetzung(doc, { chfProM2Gf: 2500 });

    expect(ohne.summeBkp2).toBe(380000);
    expect(mit.summeBkp2).toBe(200 * 2500); // 500'000, andere Basis
    expect(doc.settings.kvKennwerte.chfProM2Gf).toBe(defaultKvKennwerte.chfProM2Gf); // unverändert
  });

  it('leeres Doc (keine Geometrie): Fläche 0, keine Positionen, Total 0 — keine erfundene Zeile', () => {
    const doc = new KosmoDoc();
    const kv = deriveKostenschaetzung(doc);
    expect(kv.flaecheGf).toBe(0);
    expect(kv.positionen).toEqual([]);
    expect(kv.summeBkp2).toBe(0);
    expect(kv.total).toBe(0);
  });

  it('Volumenkörper zählen wie in der Berechnungsliste ins GF (über abgeleitete Geschosse)', () => {
    const { doc, storeyId } = setupDoc();
    // 10×10m, 8.4m hoch → 3 Geschosse à 100 m² = 300 m² GF
    execute(doc, 'design.volumenErstellen', {
      storeyId,
      program: 'vertical-cluster',
      height: 8400,
      outline: [{ x: 0, y: 0 }, { x: 10000, y: 0 }, { x: 10000, y: 10000 }, { x: 0, y: 10000 }],
    });
    const kv = deriveKostenschaetzung(doc);
    expect(kv.flaecheGf).toBeCloseTo(300, 5);
  });
});

describe('KV-Kennwerte — additives Settings-Feld (v0.6.3, wie siaPhase ROADMAP 233)', () => {
  it('Default eines neuen Docs entspricht defaultKvKennwerte', () => {
    const doc = new KosmoDoc();
    expect(doc.settings.kvKennwerte).toEqual(defaultKvKennwerte);
  });

  it('Command setzt NUR genannte Felder, ist undo-fähig', () => {
    const doc = new KosmoDoc();
    const res = execute(doc, 'design.kvKennwerteSetzen', { chfProM2Gf: 2200, reserve: 0.15 });
    expect(doc.settings.kvKennwerte.chfProM2Gf).toBe(2200);
    expect(doc.settings.kvKennwerte.reserve).toBe(0.15);
    // unverändert gelassene Felder bleiben Default
    expect(doc.settings.kvKennwerte.anteilRohbau).toBe(defaultKvKennwerte.anteilRohbau);
    expect(res.summary).toContain('Richtwert, kein Devis');
    doc.apply(invertPatches(res.patches));
    expect(doc.settings.kvKennwerte).toEqual(defaultKvKennwerte);
  });

  it('lehnt ungültige Werte ab (Anteil > 1, negativer CHF/m²)', () => {
    const doc = new KosmoDoc();
    expect(() => execute(doc, 'design.kvKennwerteSetzen', { anteilRohbau: 1.5 })).toThrow(CommandError);
    expect(() => execute(doc, 'design.kvKennwerteSetzen', { chfProM2Gf: -100 })).toThrow(CommandError);
  });

  it('Roundtrip toJSON → JSON.stringify/parse → fromJSON erhält die Kennwerte', () => {
    const doc = new KosmoDoc();
    execute(doc, 'design.kvKennwerteSetzen', { chfProM2Gf: 2100, zuschlagUmgebung: 0.09 });
    const json = JSON.parse(JSON.stringify(doc.toJSON()));
    const wieder = KosmoDoc.fromJSON(json);
    expect(wieder.settings.kvKennwerte.chfProM2Gf).toBe(2100);
    expect(wieder.settings.kvKennwerte.zuschlagUmgebung).toBe(0.09);
  });

  it('parse-guard: Altbestand-Doc ohne kvKennwerte-Feld lädt mit Default (kein Absturz)', () => {
    const altesSettings = { projectName: 'Altbau', agfFactor: 1.28, facadeFactor: 1.1 } as never;
    const doc = KosmoDoc.fromJSON({ schema: 'kosmo.model/v1', settings: altesSettings, entities: [] });
    expect(doc.settings.kvKennwerte).toEqual(defaultKvKennwerte);
    const roh = JSON.stringify({ schema: 'kosmo.model/v1', settings: altesSettings, entities: [] });
    const r = parseKosmoSafe(roh);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.doc.settings.kvKennwerte).toEqual(defaultKvKennwerte);
  });
});

describe('kvBlattSvg', () => {
  function fixture() {
    const { doc, storeyId } = setupDoc();
    zeichneDecke(doc, storeyId);
    return deriveKostenschaetzung(doc);
  }

  it('liefert ein wohlgeformtes, eigenständiges A4-SVG (beginnt mit <svg, endet mit </svg>)', () => {
    const svg = kvBlattSvg(fixture());
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0 794 1123"');
  });

  it('enthält den Ehrlichkeits-Hinweis IMMER, prominent', () => {
    const svg = kvBlattSvg(fixture());
    expect(svg).toContain(KV_HINWEIS);
    expect(svg).toContain('RICHTWERT — KEIN DEVIS');
  });

  it('Kopf: Titel/Datum/SIA-Teilphase erscheinen nur, wenn übergeben', () => {
    const kv = fixture();
    const ohne = kvBlattSvg(kv);
    expect(ohne).not.toContain('Wettbewerb/Studie');

    const mit = kvBlattSvg(kv, { titel: 'Ersatzneubau Zürich-Altstetten', datum: '08.07.2026', siaPhase: 'bauprojekt' });
    expect(mit).toContain('Kostenvoranschlag-Grobschätzung — Ersatzneubau Zürich-Altstetten');
    expect(mit).toContain('08.07.2026');
    expect(mit).toContain(siaPhaseLabel('bauprojekt'));
  });

  it('leere Positionen (keine Geometrie) zeigen eine ehrliche Leermeldung statt einer 0-Zeile', () => {
    const doc = new KosmoDoc();
    const kv = deriveKostenschaetzung(doc);
    const svg = kvBlattSvg(kv);
    expect(svg).toContain('Keine Geometrie');
    expect(svg).not.toContain('BKP 2.1');
  });

  it('Total-Zeile zeigt den korrekten, formatierten Gesamtbetrag', () => {
    const kv = fixture();
    const svg = kvBlattSvg(kv);
    expect(svg).toContain(kv.total.toLocaleString('de-CH', { maximumFractionDigits: 0 }));
  });

  it('Determinismus: zweimaliger Aufruf mit identischen Eingaben liefert byte-identisches SVG', () => {
    const kv = fixture();
    const opts = { titel: 'Testprojekt', datum: '08.07.2026', siaPhase: 'bauprojekt' } as const;
    expect(kvBlattSvg(kv, opts)).toBe(kvBlattSvg(kv, opts));
  });
});

describe('Golden-SVG (KV-Blatt)', () => {
  it('Blatt der Fixtur-Decke (200 m² GF, Default-Kennwerte) ist byte-identisch zur committeten Referenz', () => {
    const { doc, storeyId } = setupDoc();
    zeichneDecke(doc, storeyId);
    const kv = deriveKostenschaetzung(doc);
    const svg = kvBlattSvg(kv, {
      titel: 'Ersatzneubau Zürich-Altstetten',
      datum: '08.07.2026',
      siaPhase: 'bauprojekt',
    });
    pruefeGolden(svg, new URL('./golden/kvblatt.svg', import.meta.url));
  });
});
