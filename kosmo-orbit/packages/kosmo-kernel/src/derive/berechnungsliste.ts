import type { MassBody, Slab, Storey, Zone } from '../model/entities';
import type { KosmoDoc } from '../model/doc';
import { areaOf, massFloors } from './sia416';

/**
 * Berechnungsliste Volumenstudien — der Owner-Workflow (Wettbewerb Zug) als
 * lebende Ableitung statt Excel-Mappe:
 *
 * - Raumprogramm-Tabelle: HNF-Soll je Wohnungstyp → aGF-Ziel (× programmFaktor,
 *   Owner: 1.22), «ausgezogen» = tatsächlich gezeichnete Flächen des Typs,
 *   Differenz +/− (grün + = über Soll, rot − = unter Soll).
 * - GF-Block: Geschossfläche je Stockwerk (Decken) + Volumenkörper (GF über
 *   abgeleitete Geschosse).
 * - Δ Max: Total aGF gegen das zulässige Maximum (rot + = überschritten).
 * - Tie-out (Owner-Kontrolle): Summe aller «ausgezogen» + untypisierte Flächen
 *   = Total aGF. Untypisierte Flächen > 0 heisst: einer Fläche fehlt die
 *   Typzuordnung.
 *
 * «Ausgezogen» zählt Zonen UND Volumenkörper mit passendem `program`-Schlüssel;
 * die Zonenfläche ist dabei die aGF-Interpretation der Excel-Zelle.
 */

/** Wohnungstypen mit Owner-Farbcodierung (Schriftfarbe; Hintergrund = 25%). */
export const WOHNUNGSTYPEN = [
  { key: 'marktgerecht', name: 'Marktgerecht', farbe: '#c0392b' },
  { key: 'preisguenstig', name: 'Preisgünstig', farbe: '#2455a4' },
  { key: 'alterswohnen', name: 'Alterswohnen', farbe: '#7d3c98' },
  { key: 'vertical-cluster', name: 'Vertical Cluster', farbe: '#27a05e' },
  { key: 'quartierebene', name: 'Quartierebene', farbe: '#1e6b47' },
] as const;

export function typFarbe(typ: string): string {
  return WOHNUNGSTYPEN.find((t) => t.key === typ)?.farbe ?? '#666666';
}

export interface ProgrammZeile {
  typ: string;
  name: string;
  farbe: string;
  /** HNF-Soll aus dem Wettbewerbsprogramm (m²). */
  hnfSoll: number;
  /** aGF-Ziel = HNF-Soll × programmFaktor (m²). */
  agfZiel: number;
  /** Tatsächlich gezeichnete Flächen dieses Typs (Zonen + Volumen, m²). */
  ausgezogen: number;
  /** ausgezogen − agfZiel (positiv = über Soll). */
  differenz: number;
}

export interface GeschossZeile {
  storeyId: string;
  name: string;
  /** GF aus Decken dieses Geschosses (m²). */
  gf: number;
}

export interface Berechnungsliste {
  zeilen: ProgrammZeile[];
  geschosse: GeschossZeile[];
  /** GF aus Volumenkörpern (über abgeleitete Geschosse, m²). */
  gfVolumen: number;
  /** Total GF = Geschoss-GF + Volumen-GF (m²). */
  totalGf: number;
  /** Total aGF = alle typisierten + untypisierten Flächen (m²). */
  totalAgf: number;
  /** Gezeichnete Flächen ohne (bekannte) Typzuordnung — Tie-out-Warnung wenn > 0 (m²). */
  untypisiert: number;
  /** Total aGF − maxAgf; null wenn kein Maximum gesetzt (positiv = überschritten). */
  deltaMax: number | null;
  programmFaktor: number;
  maxAgf: number | null;
}

export function deriveBerechnungsliste(doc: KosmoDoc): Berechnungsliste {
  const { programmFaktor, maxAgf, raumprogramm } = doc.settings;
  const zones = doc.byKind<Zone>('zone');
  const masses = doc.byKind<MassBody>('mass');
  const slabs = doc.byKind<Slab>('slab');

  // «ausgezogen» je Typschlüssel einsammeln (Zonenfläche + Volumen-GF)
  const ausgezogenNachTyp = new Map<string, number>();
  const zaehle = (typ: string | undefined, flaeche: number) => {
    const key = typ ?? '';
    ausgezogenNachTyp.set(key, (ausgezogenNachTyp.get(key) ?? 0) + flaeche);
  };
  for (const z of zones) zaehle(z.program, areaOf(z.outline));
  for (const m of masses) zaehle(m.program, areaOf(m.outline) * massFloors(m));

  const zeilen: ProgrammZeile[] = raumprogramm.map((p) => {
    const meta = WOHNUNGSTYPEN.find((t) => t.key === p.typ);
    const agfZiel = p.hnfSoll * programmFaktor;
    const ausgezogen = ausgezogenNachTyp.get(p.typ) ?? 0;
    return {
      typ: p.typ,
      name: meta?.name ?? p.typ,
      farbe: typFarbe(p.typ),
      hnfSoll: p.hnfSoll,
      agfZiel,
      ausgezogen,
      differenz: ausgezogen - agfZiel,
    };
  });

  // Untypisiert = alles Gezeichnete, dessen Typ nicht im Raumprogramm steht
  const programmTypen = new Set(raumprogramm.map((p) => p.typ));
  let untypisiert = 0;
  let totalAgf = 0;
  for (const [typ, flaeche] of ausgezogenNachTyp) {
    totalAgf += flaeche;
    if (!programmTypen.has(typ)) untypisiert += flaeche;
  }

  const geschosse: GeschossZeile[] = (doc.storeysOrdered() as Storey[]).map((s) => ({
    storeyId: s.id,
    name: s.name,
    gf: slabs.filter((sl) => sl.storeyId === s.id).reduce((a, sl) => a + areaOf(sl.outline), 0),
  }));
  const gfVolumen = masses.reduce((a, m) => a + areaOf(m.outline) * massFloors(m), 0);
  const totalGf = geschosse.reduce((a, g) => a + g.gf, 0) + gfVolumen;

  return {
    zeilen,
    geschosse,
    gfVolumen,
    totalGf,
    totalAgf,
    untypisiert,
    deltaMax: maxAgf === null ? null : totalAgf - maxAgf,
    programmFaktor,
    maxAgf,
  };
}


/**
 * Raumprogramm-CSV-Import (V2-V5): Wettbewerbs-Soll kommt als Datei — nie
 * mehr abtippen. Tolerant gegenüber Trennzeichen (; , Tab), CH-Zahlen
 * (1'234.5), deutschen Typnamen und Summen-/Leerzeilen. Nicht zuordenbare
 * Zeilen werden gemeldet statt verschluckt.
 */
export interface CsvImportErgebnis {
  posten: { typ: string; hnfSoll: number }[];
  uebersprungen: string[];
}

const TYP_ALIASE: Record<string, string> = {
  marktgerecht: 'marktgerecht',
  markt: 'marktgerecht',
  preisguenstig: 'preisguenstig',
  preisgunstig: 'preisguenstig',
  guenstig: 'preisguenstig',
  alterswohnen: 'alterswohnen',
  alter: 'alterswohnen',
  senioren: 'alterswohnen',
  verticalcluster: 'vertical-cluster',
  cluster: 'vertical-cluster',
  quartierebene: 'quartierebene',
  quartier: 'quartierebene',
};

export function parseRaumprogrammCsv(text: string): CsvImportErgebnis {
  const posten = new Map<string, number>();
  const uebersprungen: string[] = [];
  for (const roh of text.split(/\r?\n/)) {
    const zeile = roh.trim();
    if (!zeile) continue;
    const felder = zeile.split(/[;,\t]/).map((f) => f.trim());
    if (felder.length < 2) {
      uebersprungen.push(zeile);
      continue;
    }
    // Typ: erstes Feld normalisieren (klein, ohne Umlaute/Sonderzeichen)
    const norm = felder[0]!
      .toLowerCase()
      .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u')
      .replace(/[^a-z]/g, '');
    const typ = TYP_ALIASE[norm] ?? Object.entries(TYP_ALIASE).find(([k]) => norm.includes(k))?.[1];
    // Zahl: letztes numerische Feld (CH-Format toleriert)
    let wert: number | null = null;
    for (let i = felder.length - 1; i >= 1; i--) {
      const roh2 = felder[i]!.replace(/['\u2019\s]/g, '').replace(',', '.');
      const n = Number(roh2);
      if (roh2 && Number.isFinite(n)) {
        wert = n;
        break;
      }
    }
    if (!typ || wert === null || wert <= 0) {
      // Kopf-/Summenzeilen still tolerieren, echte Datenzeilen melden
      if (typ || /\d/.test(zeile)) uebersprungen.push(zeile);
      continue;
    }
    posten.set(typ, (posten.get(typ) ?? 0) + wert);
  }
  return {
    posten: [...posten.entries()].map(([typ, hnfSoll]) => ({ typ, hnfSoll: Math.round(hnfSoll * 10) / 10 })),
    uebersprungen,
  };
}
