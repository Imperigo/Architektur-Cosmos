import type { Entity } from './entities';
import type { Mm } from './units';

/**
 * KosmoDoc — der Entity-Store des Projekts.
 *
 * Mutationen laufen ausschliesslich über Patches: { id, before, after }.
 * Ein Patch ist trivial invertierbar (before/after tauschen) — das trägt
 * Undo/Redo, das Journal und später die Yjs-Bindung (Commands sind die
 * einzigen Schreiber; CRDT und Journal werden daraus abgeleitet).
 */

/** Dossier-Eintrag (Phase 0): harte Regel oder Fakt aus dem Wettbewerbsprogramm. */
export interface DossierEintrag {
  typ: 'do' | 'dont' | 'fakt';
  text: string;
}

/** Ein Posten des Wettbewerbs-Raumprogramms (HNF-Soll je Wohnungstyp, m²). */
export interface RaumprogrammPosten {
  typ: string;
  hnfSoll: number;
}

/**
 * SIA-Bauphase (Owner-Auftrag 03.07.) — steuert den Detaillierungsgrad der
 * Pläne. Regelwerk: docs/PLAN-DETAILLIERUNG.md (Hochbauzeichner-Konvention,
 * Abgleich mit den Lehrheften folgt über KosmoPrepare).
 */
export type BauPhase = 'vorprojekt' | 'bauprojekt' | 'werkplan';

export function phaseLabel(phase: BauPhase): string {
  return phase === 'vorprojekt'
    ? 'Vorprojekt (SIA 31)'
    : phase === 'bauprojekt'
      ? 'Bauprojekt (SIA 32/33)'
      : 'Werkplan (SIA 51)';
}

/** Bemassungs-Stil (V2-A5) — projektweit, wirkt in App-Plan, Druck und DXF. */
export interface BemassungsStil {
  /** Aussenketten: beide (Öffnungen + Gesamtmass), nur Gesamtmass, oder keine. */
  aussenKetten: 'beide' | 'gesamt' | 'keine';
  /** Innenketten auf den Achsen der Innenwände (Werkplan). */
  innenKetten: boolean;
  /** Höhenkoten je Geschoss in Schnitt und Ansicht. */
  hoehenKoten: boolean;
  /** Rohkonstruktions-Kette (B1): Kanten der tragenden Schicht als 3. Kette. */
  rohKette?: boolean;
}

export interface DocSettings {
  projectName: string;
  /** Faktor Raumprogramm→anrechenbare Geschossfläche (Owner-Wissen: 1.28 bzw. 1.22 je Büro). */
  agfFactor: number;
  /** Fassadenzuschlag auf aGF für GF-Volumenstudien (Owner: 10% Skelettbau). */
  facadeFactor: number;
  /** Faktor der Berechnungsliste: aGF-Ziel = HNF-Soll × programmFaktor (Owner: 1.22). */
  programmFaktor: number;
  /** Zulässiges aGF-Maximum (m²) für Δ-Max der Berechnungsliste; null = keins gesetzt. */
  maxAgf: number | null;
  /** Wettbewerbs-Raumprogramm (Soll-Flächen je Wohnungstyp). */
  raumprogramm: RaumprogrammPosten[];
  /** Wettbewerbsdossier (Phase 0): Do's, Don'ts, Fakten — fliesst in Kosmos Systemprompt. */
  dossier: DossierEintrag[];
  bemassung: BemassungsStil;
  /** Detaillierungsgrad der Pläne nach SIA-Phase. */
  phase: BauPhase;
  /** Aktive Zonenregel (V2-Vorform V1): speist Δ-Max, Höhen-/Geschoss-Checks. */
  zonenRegel: ZonenRegel | null;
  /** Raumtyp-Regeln (V2-F3, Finch Graph-Rules): leer = eingebaute Richtwerte. */
  raumRegeln: RaumRegel[];
  /** Custom-Kennzahlen (V2-F9): Wert × Flächenbasis, z.B. CHF/m² aGF. */
  kennzahlFormeln: KennzahlFormel[];
  /** Zonen-Vorlagen (V2-F7): Layouts, achsweise streckbar wieder absetzbar. */
  vorlagen: ZonenVorlage[];
  /** Projektstandort CH (V2-V4): einmal geholt, im Doc = offline verfügbar. */
  standort: ProjektStandort | null;
  /** Fassadenmodule (Modul-Editor): gezeichnete Module für die Rasterung. */
  fassadenModule: FassadenModul[];
  /** Parzellenfläche in m² (für AZ → zulässige aGF). */
  parzellenFlaeche: number | null;
  /** Rollen-Vorstufe (Vision D2): ordnet die Zentrale und färbt Kosmos Blick.
   * Bewusst KEINE Rechteverwaltung — Ansichts-Filter, mehr nicht. */
  rolle: 'entwurf' | 'ausfuehrung' | 'admin' | null;
}

/** Fassadenmodul (Modul-Editor, vorform-Kern): Elemente in Modul-Koordinaten. */
export interface FassadenModul {
  name: string;
  /** Modulmass b × h (mm). */
  breite: number;
  hoehe: number;
  elemente: ModulElement[];
}

export interface ModulElement {
  /** Rechteck in Modul-Koordinaten (mm, Ursprung unten links). */
  x: number;
  y: number;
  b: number;
  h: number;
  typ: 'fenster' | 'paneel';
}

/** Projektstandort (V2-V4): WGS84 für die Sonne, LV95 fürs Vermessen. */
export interface ProjektStandort {
  label: string;
  lat: number;
  lon: number;
  /** LV95 Ost/Nord (m). */
  e: number;
  n: number;
  /** Absolutbezug ±0.00 in m ü.M. (B2: erscheint an der EG-Kote). */
  hoeheM?: number;
}

/** Zonen-Vorlage (V2-F7): Zonen relativ zur BBox-Ecke, Grösse fürs Strecken. */
export interface ZonenVorlage {
  name: string;
  /** BBox der Vorlage (mm) — Referenz für den achsweisen Stretch. */
  breite: number;
  hoehe: number;
  zonen: {
    outline: { x: number; y: number }[];
    name: string;
    sia: string;
    raumTyp?: string;
  }[];
  /** Möbel relativ zur BBox-Ecke (beim Speichern in der BBox eingesammelt). */
  moebel?: { typ: string; at: { x: number; y: number }; rotationGrad: number }[];
  /** Zonentüren relativ zur BBox-Ecke (Review-Fix 8). */
  tueren?: { at: { x: number; y: number }; breite: number }[];
}

/** Custom-Kennzahl (V2-F9): name = «Erstellungskosten», wert 3200, basis 'agf', einheit 'CHF'. */
export interface KennzahlFormel {
  name: string;
  /** Multiplikator pro m² der Basis. */
  wert: number;
  basis: 'gf' | 'agf' | 'hnf' | 'ngf';
  /** Ergebnis-Einheit, z.B. «CHF» oder «kg CO2e». */
  einheit: string;
}

/** Raumtyp-Regel (V2-F3): Grenzwerte je Raumtyp, dreistufig gemeldet. */
export interface RaumRegel {
  raumTyp: string;
  /** Mindestfläche m²; null = keine. */
  minFlaeche: number | null;
  /** Mindest-Lichtbreite mm (BBox-Näherung); null = keine. */
  minBreite: number | null;
  /** Raum braucht ein Fenster (Tageslicht). */
  tageslicht: boolean;
}

/** CH-Zonenregel — Richtwerte je Bauzone, editierbar; kein Ersatz fürs Baureglement. */
export interface ZonenRegel {
  name: string;
  /** Ausnützungsziffer aGF/Parzellenfläche; null = keine. */
  az: number | null;
  /** Max. Gebäudehöhe über Projektnull (mm). */
  maxHoehe: number | null;
  maxVollgeschosse: number | null;
  grenzabstandKlein: number | null;
  grenzabstandGross: number | null;
}

export const defaultSettings: DocSettings = {
  projectName: 'Unbenannt',
  agfFactor: 1.28,
  facadeFactor: 1.1,
  programmFaktor: 1.22,
  maxAgf: null,
  raumprogramm: [],
  dossier: [],
  // Grundriss-Default = Bestandsverhalten; Koten an (Schnitt/Ansicht gewinnen)
  bemassung: { aussenKetten: 'beide', innenKetten: false, hoehenKoten: true },
  // Default = volle Detaillierung (Bestandsverhalten); Vorprojekt reduziert
  phase: 'werkplan',
  zonenRegel: null,
  parzellenFlaeche: null,
  raumRegeln: [],
  kennzahlFormeln: [],
  vorlagen: [],
  standort: null,
  fassadenModule: [],
  rolle: null,
};

export interface Patch {
  readonly id: string;
  readonly before: Entity | null;
  readonly after: Entity | null;
}

export interface SettingsPatch {
  readonly settings: true;
  readonly before: Partial<DocSettings>;
  readonly after: Partial<DocSettings>;
}

export type AnyPatch = Patch | SettingsPatch;

export function isSettingsPatch(p: AnyPatch): p is SettingsPatch {
  return 'settings' in p;
}

export function invertPatches(patches: readonly AnyPatch[]): AnyPatch[] {
  return [...patches]
    .reverse()
    .map((p) =>
      isSettingsPatch(p)
        ? { settings: true as const, before: p.after, after: p.before }
        : { id: p.id, before: p.after, after: p.before },
    );
}

export class KosmoDoc {
  readonly entities = new Map<string, Entity>();
  settings: DocSettings = { ...defaultSettings };
  /** Monoton steigende Revisionsnummer — Cache-Invalidierung der Derive-Stufe. */
  revision = 0;

  get<T extends Entity = Entity>(id: string): T | undefined {
    return this.entities.get(id) as T | undefined;
  }

  byKind<T extends Entity>(kind: T['kind']): T[] {
    const out: T[] = [];
    for (const e of this.entities.values()) if (e.kind === kind) out.push(e as T);
    return out;
  }

  inStorey(storeyId: string): Entity[] {
    const out: Entity[] = [];
    for (const e of this.entities.values()) {
      if ('storeyId' in e && e.storeyId === storeyId) out.push(e);
    }
    return out;
  }

  openingsOf(wallId: string) {
    const out = [];
    for (const e of this.entities.values()) {
      if (e.kind === 'opening' && e.wallId === wallId) out.push(e);
    }
    return out;
  }

  storeysOrdered() {
    return this.byKind<import('./entities').Storey>('storey').sort((a, b) => a.index - b.index);
  }

  /** Oberkante eines Geschosses = elevation + height (für Wandhöhen 'geschoss'). */
  storeyTop(storeyId: string): Mm | undefined {
    const s = this.get<import('./entities').Storey>(storeyId);
    return s ? s.elevation + s.height : undefined;
  }

  apply(patches: readonly AnyPatch[]): void {
    for (const p of patches) {
      if (isSettingsPatch(p)) {
        this.settings = { ...this.settings, ...p.after };
      } else if (p.after === null) {
        this.entities.delete(p.id);
      } else {
        this.entities.set(p.id, p.after);
      }
    }
    this.revision++;
  }

  toJSON(): DocJson {
    return {
      schema: 'kosmo.model/v1',
      settings: this.settings,
      entities: [...this.entities.values()],
    };
  }

  static fromJSON(json: DocJson): KosmoDoc {
    const doc = new KosmoDoc();
    doc.settings = { ...defaultSettings, ...json.settings };
    for (const e of json.entities) doc.entities.set(e.id, e);
    return doc;
  }
}

export interface DocJson {
  schema: 'kosmo.model/v1';
  settings: DocSettings;
  entities: Entity[];
}
