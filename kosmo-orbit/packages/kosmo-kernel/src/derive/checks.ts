import type { KosmoDoc } from '../model/doc';
import type { Assembly, Boundary, MassBody, Opening, Roof, Stair, Storey, Wall, Zone } from '../model/entities';
import { polygonArea } from '../model/units';
import { treppenTeile } from './treppe';
import { fluchtwege } from './raumgraph';
import { pruefeBewegungsflaechen } from './moebel';

/**
 * Grundriss-Checks (Q12, Finch-Essenz) — Regeln laufen live auf der
 * Parametrik, nie auf Pixeln. V1 prüft die täglichen Stolperer des
 * CH-Wohnbaus; Schwere ehrlich dreistufig. Richtwerte, kein Normersatz.
 */

export interface PruefBefund {
  schwere: 'fehler' | 'warnung' | 'hinweis';
  regel: string;
  text: string;
  entityId?: string;
}

/** Kleinste Seitenlänge der Bounding-Box (V1-Näherung der lichten Breite). */
function minBreite(outline: { x: number; y: number }[]): number {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of outline) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return Math.min(maxX - minX, maxY - minY);
}

export function pruefeGrundriss(doc: KosmoDoc, storeyId: string): PruefBefund[] {
  const befunde: PruefBefund[] = [];
  const storey = doc.get<Storey>(storeyId);
  if (!storey || storey.kind !== 'storey') return befunde;

  // Fenster je Wand (für Tageslicht-Regel): Fenstermittelpunkte im Grundriss
  const fensterPunkte: { x: number; y: number }[] = [];
  for (const w of doc.byKind<Wall>('wall')) {
    if (w.storeyId !== storeyId) continue;
    const len = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y) || 1;
    const d = { x: (w.b.x - w.a.x) / len, y: (w.b.y - w.a.y) / len };
    for (const o of doc.openingsOf(w.id) as Opening[]) {
      if (o.openingType === 'fenster') {
        fensterPunkte.push({ x: w.a.x + d.x * o.center, y: w.a.y + d.y * o.center });
      }
    }
  }
  const nahAmUmriss = (p: { x: number; y: number }, poly: { x: number; y: number }[]): boolean => {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[j]!;
      const b = poly[i]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
      if (Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)) < 300) return true;
    }
    return false;
  };

  // Zonen: Regel-Sätze (V2-F3) haben Vorrang; ohne Regel greifen die
  // eingebauten HNF-Richtwerte (Bestandsverhalten)
  const regeln = doc.settings.raumRegeln;
  for (const z of doc.byKind<Zone>('zone')) {
    if (z.storeyId !== storeyId) continue;
    const b = minBreite(z.outline);
    const flaeche = polygonArea(z.outline) / 1e6;
    // Programm-Zonen (Wohnungs-Aggregate aus Liste/Segmentierer) sind keine
    // Zimmer — Richtwerte gelten für Räume, nicht für ganze Wohnungen
    if (z.program) continue;
    const regel = z.raumTyp ? regeln.find((r) => r.raumTyp === z.raumTyp) : undefined;
    if (regel) {
      if (regel.minBreite !== null && b < regel.minBreite) {
        befunde.push({
          schwere: 'warnung',
          regel: `Regel ${z.raumTyp}`,
          text: `«${z.name}» ist ${(b / 1000).toFixed(2)} m breit — Regel «${z.raumTyp}» verlangt ≥ ${(regel.minBreite / 1000).toFixed(2)} m`,
          entityId: z.id,
        });
      }
      if (regel.minFlaeche !== null && flaeche < regel.minFlaeche) {
        befunde.push({
          schwere: 'warnung',
          regel: `Regel ${z.raumTyp}`,
          text: `«${z.name}» hat ${flaeche.toFixed(1)} m² — Regel «${z.raumTyp}» verlangt ≥ ${regel.minFlaeche} m²`,
          entityId: z.id,
        });
      }
      if (regel.tageslicht && !fensterPunkte.some((f) => nahAmUmriss(f, z.outline))) {
        befunde.push({
          schwere: 'warnung',
          regel: `Regel ${z.raumTyp}`,
          text: `«${z.name}» hat kein Fenster am Raum — Regel «${z.raumTyp}» verlangt Tageslicht`,
          entityId: z.id,
        });
      }
      continue;
    }
    if (z.sia === 'HNF' && b < 2400) {
      befunde.push({
        schwere: 'warnung',
        regel: 'Zimmerbreite',
        text: `«${z.name}» ist nur ${(b / 1000).toFixed(2)} m breit (Richtwert Wohnräume ≥ 2.40 m)`,
        entityId: z.id,
      });
    }
    if (z.sia === 'HNF' && flaeche < 10) {
      befunde.push({
        schwere: 'hinweis',
        regel: 'Zimmerfläche',
        text: `«${z.name}» hat ${flaeche.toFixed(1)} m² (Einzelzimmer üblich ≥ 10 m²)`,
        entityId: z.id,
      });
    }
  }

  // Türen: hindernisfreie Breite
  for (const w of doc.byKind<Wall>('wall')) {
    if (w.storeyId !== storeyId) continue;
    const assembly = doc.get<Assembly>(w.assemblyId);
    if (!assembly || assembly.kind !== 'assembly') {
      befunde.push({
        schwere: 'fehler',
        regel: 'Aufbau',
        text: 'Wand ohne gültigen Aufbau — Ableitung unvollständig',
        entityId: w.id,
      });
      continue;
    }
    for (const o of doc.openingsOf(w.id) as Opening[]) {
      if (o.openingType === 'tuer' && o.width < 800) {
        befunde.push({
          schwere: 'warnung',
          regel: 'Türbreite',
          text: `Tür nur ${o.width} mm breit (hindernisfrei SIA 500: ≥ 800 mm)`,
          entityId: o.id,
        });
      }
      if (o.openingType === 'fenster' && o.sill > 0 && o.sill < 600) {
        befunde.push({
          schwere: 'hinweis',
          regel: 'Brüstung',
          text: `Fensterbrüstung ${o.sill} mm — Absturzsicherung prüfen (üblich ≥ 900 mm oder Geländer)`,
          entityId: o.id,
        });
      }
    }
  }

  // Treppen: Schrittmass + Steigung über die Gesamtlauflänge der Form
  for (const st of doc.byKind<Stair>('stair')) {
    if (st.storeyId !== storeyId) continue;
    const teile = treppenTeile(st, storey.height, storey.elevation);
    const spec = teile.spec;
    if ((st.form ?? 'gerade') === 'gerade' && spec.steps > 18) {
      befunde.push({
        schwere: 'hinweis',
        regel: 'Podest',
        text: `Treppe: ${spec.steps} Steigungen ohne Podest (üblich max. 18) — Form «podest» oder «u» erwägen`,
        entityId: st.id,
      });
    }
    if (spec.comfort < 590 || spec.comfort > 650) {
      befunde.push({
        schwere: 'warnung',
        regel: 'Schrittmass',
        text: `Treppe: 2s+a = ${Math.round(spec.comfort)} mm (bequem 590–650); Lauf anpassen`,
        entityId: st.id,
      });
    }
    if (spec.riser > 180) {
      befunde.push({
        schwere: 'hinweis',
        regel: 'Steigung',
        text: `Treppensteigung ${Math.round(spec.riser)} mm (Wohnbau üblich ≤ 180 mm)`,
        entityId: st.id,
      });
    }
    if (st.width < 1000) {
      befunde.push({
        schwere: 'hinweis',
        regel: 'Laufbreite',
        text: `Treppenlauf ${st.width} mm (CH-üblich ≥ 1000 mm, Fluchtweg ≥ 1200 mm)`,
        entityId: st.id,
      });
    }
  }

  // Fluchtweg (V2-F2): Distanz zum nächsten Treppenhaus (VKF-Richtwert 35 m).
  // Nur prüfen, wenn ein Fluchtziel existiert — sonst wäre jeder Entwurf rot.
  const wege = fluchtwege(doc, storeyId);
  const MAX_FLUCHT = 35000;
  const zielVorhanden = wege.some((w) => w.distanz === 0);
  if (zielVorhanden) {
    for (const weg of wege) {
      const zone = doc.get<Zone>(weg.zoneId);
      if (!zone || zone.kind !== 'zone' || weg.distanz === 0) continue;
      if (zone.raumTyp === 'balkon') continue;
      if (weg.distanz === Infinity) {
        befunde.push({
          schwere: 'warnung',
          regel: 'Fluchtweg',
          text: `«${zone.name}» hat keine Verbindung zum Treppenhaus (Tür fehlt?)`,
          entityId: zone.id,
        });
      } else if (weg.distanz > MAX_FLUCHT) {
        befunde.push({
          schwere: 'fehler',
          regel: 'Fluchtweg',
          text: `«${zone.name}»: Fluchtweg ${(weg.distanz / 1000).toFixed(1)} m > 35 m (VKF-Richtwert)`,
          entityId: zone.id,
        });
      } else if (weg.distanz > MAX_FLUCHT * 0.8) {
        befunde.push({
          schwere: 'hinweis',
          regel: 'Fluchtweg',
          text: `«${zone.name}»: Fluchtweg ${(weg.distanz / 1000).toFixed(1)} m — nah am 35-m-Richtwert`,
          entityId: zone.id,
        });
      }
    }
  }

  // Geschoss: lichte Höhe (grob: Geschosshöhe − 300 mm Decke/Boden)
  if (storey.height - 300 < 2300) {
    befunde.push({
      schwere: 'warnung',
      regel: 'Raumhöhe',
      text: `Geschosshöhe ${storey.height} mm ergibt unter ~2.30 m lichte Höhe`,
      entityId: storey.id,
    });
  }

  // Zonenregel (V2-Vorform V1): Höhe + Vollgeschosse gegen die aktive Regel
  const regel = doc.settings.zonenRegel;
  if (regel) {
    const alle = doc.storeysOrdered() as Storey[];
    if (regel.maxVollgeschosse !== null) {
      const voll = alle.filter((st) => st.index >= 0).length;
      if (voll > regel.maxVollgeschosse) {
        befunde.push({
          schwere: 'fehler',
          regel: 'Zonenregel',
          text: `${voll} Vollgeschosse — Zone «${regel.name}» erlaubt ${regel.maxVollgeschosse} (Richtwert)`,
        });
      }
    }
    if (regel.maxHoehe !== null) {
      const zuHoch = (name: string, id: string, top: number) => {
        if (top > regel.maxHoehe!) {
          befunde.push({
            schwere: 'fehler',
            regel: 'Zonenregel',
            text: `${name}: ${(top / 1000).toFixed(1)} m über Projektnull — Zone «${regel.name}» erlaubt ${(regel.maxHoehe! / 1000).toFixed(1)} m (Richtwert)`,
            entityId: id,
          });
        }
      };
      for (const w of doc.byKind<Wall>('wall')) {
        if (w.storeyId !== storeyId) continue;
        const h = w.heightMode === 'fix' && w.height ? w.height : storey.height;
        zuHoch('Wand', w.id, storey.elevation + w.baseOffset + h);
      }
      for (const m of doc.byKind<MassBody>('mass')) {
        if (m.storeyId !== storeyId) continue;
        zuHoch('Volumen', m.id, storey.elevation + m.baseOffset + m.height);
      }
    }
  }

  // Möblierung (V2-F8): SIA-500-Bewegungsflächen gegen Wände
  for (const m of pruefeBewegungsflaechen(doc, storeyId)) {
    befunde.push({ schwere: 'warnung', regel: 'SIA 500', text: m.text, entityId: m.furnitureId });
  }

  const rang = { fehler: 0, warnung: 1, hinweis: 2 } as const;
  // Baugrenzen (Phase 0): Lage + Höhenbeschränkung
  const grenzen = doc.byKind<Boundary>('boundary').filter((g) => g.storeyId === storeyId);
  for (const g of grenzen) {
    const inPoly = (p: { x: number; y: number }): boolean => {
      let inside = false;
      const poly = g.outline;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i]!;
        const b = poly[j]!;
        if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
          inside = !inside;
        }
      }
      return inside;
    };
    // Grenzabstand (V2): Punkt muss mindestens «abstand» von der Grenzlinie
    // entfernt IM Polygon liegen; gestaffelt um den Mehrhöhenzuschlag.
    const abstandZurLinie = (p: { x: number; y: number }): number => {
      let min = Infinity;
      const poly = g.outline;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[j]!;
        const b = poly[i]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
        min = Math.min(min, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
      }
      return min;
    };
    const grenzVerletzt = (name: string, id: string, punkte: { x: number; y: number }[], top: number | null) => {
      if (!g.grenzabstand) return;
      let soll = g.grenzabstand;
      if (g.mehrHoehen && top !== null && top > g.mehrHoehen.abHoehe) {
        soll += Math.round((top - g.mehrHoehen.abHoehe) * g.mehrHoehen.anteil);
      }
      for (const p of punkte) {
        if (!inPoly(p)) continue; // Lage ausserhalb meldet schon die Baugrenze
        const ist = abstandZurLinie(p);
        if (ist < soll) {
          befunde.push({
            schwere: 'fehler',
            regel: 'Grenzabstand',
            text: `${name}: ${(ist / 1000).toFixed(1)} m zur Grenze «${g.name}» — verlangt ${(soll / 1000).toFixed(1)} m${g.mehrHoehen && top !== null && top > g.mehrHoehen.abHoehe ? ' (inkl. Mehrhöhenzuschlag)' : ''}`,
            entityId: id,
          });
          return; // ein Befund je Bauteil reicht
        }
      }
    };
    const verletzt = (name: string, id: string, punkte: { x: number; y: number }[], top: number | null) => {
      grenzVerletzt(name, id, punkte, top);
      if (punkte.some((p) => !inPoly(p))) {
        befunde.push({
          schwere: 'fehler',
          regel: 'Baugrenze',
          text: `${name} ragt über die Baugrenze «${g.name}» hinaus`,
          entityId: id,
        });
      }
      if (g.maxHoehe !== null && top !== null && top > g.maxHoehe) {
        befunde.push({
          schwere: 'fehler',
          regel: 'Baugrenze',
          text: `${name} überschreitet die Höhenbeschränkung (${(top / 1000).toFixed(1)} m > ${(g.maxHoehe / 1000).toFixed(1)} m)`,
          entityId: id,
        });
      }
    };
    for (const w of doc.byKind<Wall>('wall')) {
      if (w.storeyId !== storeyId) continue;
      const h = w.heightMode === 'fix' && w.height ? w.height : storey.height;
      verletzt('Wand', w.id, [w.a, w.b], storey.elevation + w.baseOffset + h);
    }
    for (const m of doc.byKind<MassBody>('mass')) {
      if (m.storeyId !== storeyId) continue;
      verletzt('Volumen', m.id, m.outline, storey.elevation + m.height);
    }
    for (const r of doc.byKind<Roof>('roof')) {
      if (r.storeyId !== storeyId) continue;
      verletzt('Dach', r.id, r.outline, null);
    }
  }

  // ── Schallschutz-Hinweis (Vision C2): Wohnungstrennwände ──────────
  // Rw-Abschätzung nach dem Massengesetz (DIN 4109-32-Kurve für massive
  // einschalige Bauteile, gültig ab ~150 kg/m²) gegen die SIA-181-
  // Mindestanforderung zwischen Nutzungseinheiten. Ausdrücklich ein
  // HINWEIS, kein Nachweis — Flankenwege/Anschlüsse rechnet keiner hier.
  for (const w of doc.byKind<Wall>('wall')) {
    if (w.storeyId !== storeyId) continue;
    const assembly = doc.get<Assembly>(w.assemblyId);
    if (!assembly || assembly.kind !== 'assembly') continue;
    if (!assembly.name.startsWith('TW')) continue; // Trennwand-Konvention (waendeAusZonen)
    const m2Masse = flaechenmasse(assembly);
    if (m2Masse < 150) {
      befunde.push({
        schwere: 'warnung',
        regel: 'Schallschutz',
        text: `TW «${assembly.name}»: nur ~${Math.round(m2Masse)} kg/m² — Massengesetz nicht anwendbar (< 150 kg/m²), Aufbau prüfen`,
        entityId: w.id,
      });
      continue;
    }
    const rw = 30.9 * Math.log10(m2Masse) - 22.2;
    const erfuellt = rw >= SIA181_TRENNWAND_DB;
    befunde.push({
      schwere: erfuellt ? 'hinweis' : 'warnung',
      regel: 'Schallschutz',
      text: `TW «${assembly.name}»: Rw ≈ ${Math.round(rw)} dB ${erfuellt ? '≥' : '<'} ${SIA181_TRENNWAND_DB} dB (SIA 181 Mindestanforderung, ~${Math.round(m2Masse)} kg/m²) — Hinweis, kein Nachweis`,
      entityId: w.id,
    });
  }

  return befunde.sort((a, b) => rang[a.schwere] - rang[b.schwere]);
}

/** SIA 181: Mindestanforderung Luftschall zwischen Nutzungseinheiten (dB). */
export const SIA181_TRENNWAND_DB = 52;

/** Rohdichten kg/m³ (Richtwerte Hochbau) für die Flächenmasse des Aufbaus. */
export const MATERIAL_DICHTE: Record<string, number> = {
  beton: 2400,
  ks: 1800,
  kalksandstein: 1800,
  backstein: 1100,
  putz: 1800,
  holz: 500,
  'daemmung-mw': 100,
  daemmung: 100,
  gips: 900,
};

/** Flächenmasse eines Aufbaus in kg/m² (unbekannte Materialien zählen 0). */
export function flaechenmasse(assembly: Assembly): number {
  let masse = 0;
  for (const layer of assembly.layers) {
    const dichte = MATERIAL_DICHTE[layer.material] ?? 0;
    masse += (layer.thickness / 1000) * dichte;
  }
  return masse;
}
