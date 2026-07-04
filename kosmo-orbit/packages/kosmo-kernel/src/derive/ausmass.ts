import type { KosmoDoc } from '../model/doc';
import type { Assembly, Aussparung, Opening, Slab, Storey, Wall } from '../model/entities';
import { assemblyThickness } from '../geometry/wall';
import { areaOf } from './sia416';

/**
 * NPK-nahes Ausmass (Vision C1, V2-Kandidat A6) — auf den Modellmengen
 * aufgesetzt, aber mit den Ausmassregeln des Devisierens: Öffnungen bis
 * 0.5 m² werden NICHT abgezogen, Leibungen zählen als eigene Position.
 * Ehrlich «NPK-nah»: Positionsgliederung nach Kapitel-Logik, KEIN Ersatz
 * für ein CRB-Devis (ONLV/NPK-Lizenz = Owner-Entscheid).
 */

/** NPK-Ausmassregel: Öffnungen bis zu dieser Fläche bleiben im Mass. */
export const NPK_ABZUG_SCHWELLE_M2 = 0.5;

export interface AusmassPosition {
  /** NPK-nahe Kapitelgruppe, z.B. «NPK 211 Beton/Mauerwerk». */
  kapitel: string;
  position: string;
  einheit: 'm2' | 'm3' | 'm' | 'Stk';
  menge: number;
  /** Nachvollziehbare Herleitung (brutto − Abzüge …). */
  herleitung: string;
}

export interface Ausmass {
  positionen: AusmassPosition[];
  hinweise: string[];
}

const M = 1000;
const M2 = 1_000_000;

function wallHeight(doc: KosmoDoc, w: Wall): number {
  if (w.heightMode === 'fix' && w.height) return w.height;
  const s = doc.get<Storey>(w.storeyId);
  return s ? s.height : 3000;
}

export function deriveAusmass(doc: KosmoDoc): Ausmass {
  const positionen: AusmassPosition[] = [];
  const hinweise: string[] = [];
  const f2 = (v: number) => v.toFixed(2);

  // ── Wände je Aufbau: brutto − Abzüge (> 0.5 m²), Leibungen separat ──
  const walls = doc.byKind<Wall>('wall');
  const nachAufbau = new Map<string, Wall[]>();
  for (const w of walls) {
    const list = nachAufbau.get(w.assemblyId) ?? [];
    list.push(w);
    nachAufbau.set(w.assemblyId, list);
  }
  for (const [assemblyId, group] of nachAufbau) {
    const asm = doc.get<Assembly>(assemblyId);
    if (!asm || asm.kind !== 'assembly') continue;
    const dickeM = assemblyThickness(asm) / M;
    let brutto = 0;
    let abzug = 0;
    let abzugAnzahl = 0;
    let kleine = 0;
    let leibungen = 0;
    for (const w of group) {
      const len = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y) / M;
      brutto += len * (wallHeight(doc, w) / M);
      for (const o of doc.openingsOf(w.id) as Opening[]) {
        const flaeche = (o.width * o.height) / M2;
        if (flaeche > NPK_ABZUG_SCHWELLE_M2) {
          abzug += flaeche;
          abzugAnzahl++;
        } else {
          kleine++;
        }
        // Leibung: Öffnungsumfang × Wanddicke (alle Öffnungen, auch kleine)
        leibungen += (2 * (o.width + o.height)) / M * dickeM;
      }
    }
    const netto = brutto - abzug;
    positionen.push({
      kapitel: 'NPK 211 Beton/Mauerwerk',
      position: `Wände ${asm.name}`,
      einheit: 'm2',
      menge: netto,
      herleitung:
        `brutto ${f2(brutto)} − Abzüge ${f2(abzug)} (${abzugAnzahl} Öffnungen > ${NPK_ABZUG_SCHWELLE_M2} m²` +
        (kleine > 0 ? `; ${kleine} kleine bleiben im Mass` : '') +
        ')',
    });
    positionen.push({
      kapitel: 'NPK 211 Beton/Mauerwerk',
      position: `Wände ${asm.name} — Volumen`,
      einheit: 'm3',
      menge: netto * dickeM,
      herleitung: `${f2(netto)} m² × d ${f2(dickeM)} m`,
    });
    if (leibungen > 0) {
      positionen.push({
        kapitel: 'NPK 211 Beton/Mauerwerk',
        position: `Leibungen ${asm.name}`,
        einheit: 'm2',
        menge: leibungen,
        herleitung: `Σ Öffnungsumfang × d ${f2(dickeM)} m`,
      });
    }
  }

  // ── Decken: brutto − Aussparungen (> 0.5 m²) ─────────────────────
  const aussparungen = doc.byKind<Aussparung>('aussparung');
  const slabs = doc.byKind<Slab>('slab');
  if (slabs.length > 0) {
    let brutto = 0;
    let abzug = 0;
    let abzugAnzahl = 0;
    let volumen = 0;
    for (const s of slabs) {
      const flaeche = areaOf(s.outline);
      brutto += flaeche;
      let sAbzug = 0;
      for (const a of aussparungen) {
        if (a.hostId !== s.id) continue;
        const af = (a.breite * a.hoehe) / M2;
        if (af > NPK_ABZUG_SCHWELLE_M2) {
          sAbzug += af;
          abzugAnzahl++;
        }
      }
      abzug += sAbzug;
      volumen += (flaeche - sAbzug) * (s.thickness / M);
    }
    positionen.push({
      kapitel: 'NPK 211 Beton/Mauerwerk',
      position: 'Decken/Bodenplatten',
      einheit: 'm2',
      menge: brutto - abzug,
      herleitung: `brutto ${f2(brutto)} − Aussparungen ${f2(abzug)} (${abzugAnzahl} > ${NPK_ABZUG_SCHWELLE_M2} m²)`,
    });
    positionen.push({
      kapitel: 'NPK 211 Beton/Mauerwerk',
      position: 'Decken/Bodenplatten — Volumen',
      einheit: 'm3',
      menge: volumen,
      herleitung: 'Σ (Fläche − Aussparungen) × Dicke',
    });
  }

  // ── Fenster/Türen: Stückzahl + Lichtfläche ───────────────────────
  const openings = doc.byKind<Opening>('opening');
  for (const [typ, kapitel, name] of [
    ['fenster', 'NPK 371 Fenster', 'Fenster'],
    ['tuer', 'NPK 622 Türen', 'Türen'],
  ] as const) {
    const group = openings.filter((o) => o.openingType === typ);
    if (group.length === 0) continue;
    positionen.push({
      kapitel,
      position: `${name} (Lichtmass)`,
      einheit: 'Stk',
      menge: group.length,
      herleitung: `Σ Lichtfläche ${f2(group.reduce((a, o) => a + (o.width * o.height) / M2, 0))} m²`,
    });
  }

  // ── Wand-Durchbrüche: eigene Position, KEIN Abzug (nur Symbolik) ──
  const wandAussparungen = aussparungen.filter((a) => doc.get(a.hostId)?.kind === 'wall');
  if (wandAussparungen.length > 0) {
    positionen.push({
      kapitel: 'NPK 211 Beton/Mauerwerk',
      position: 'Kernbohrungen/Durchbrüche in Wänden',
      einheit: 'Stk',
      menge: wandAussparungen.length,
      herleitung: `Σ ${f2(wandAussparungen.reduce((a, x) => a + (x.breite * x.hoehe) / M2, 0))} m² — nicht vom Wandmass abgezogen (Symbolik)`,
    });
    hinweise.push('Wand-Durchbrüche sind als Stück-Position geführt und nicht vom Wandmass abgezogen.');
  }

  hinweise.push(
    `NPK-nah: Öffnungen ≤ ${NPK_ABZUG_SCHWELLE_M2} m² bleiben im Mass; kein Ersatz für ein CRB-Devis.`,
  );
  return { positionen, hinweise };
}

/** CSV (Semikolon, Excel-CH) — Muster der Fassaden-Elementliste. */
export function ausmassAlsCsv(a: Ausmass): string {
  const kopf = 'Kapitel;Position;Einheit;Menge;Herleitung';
  const zeilen = a.positionen.map(
    (p) => `${p.kapitel};${p.position};${p.einheit};${p.menge.toFixed(2)};${p.herleitung}`,
  );
  return [kopf, ...zeilen, ...a.hinweise.map((h) => `;;;;${h}`)].join('\n');
}
