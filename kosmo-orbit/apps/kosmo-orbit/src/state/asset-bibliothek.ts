import { vaultTx } from './project-vault';
import type { MaterialArt, MaterialDimensionen } from '@kosmo/data';

/**
 * KosmoAsset-Bibliothek (V1-Finish P3, Owner-Q14 → Codex-Übernahme Batch 3)
 * — projektübergreifend in IndexedDB, BEWUSST nicht als Doc-Entity: das
 * Binärteil (`daten: ArrayBuffer`, oft Megabytes) gehört nie durch Undo/Yjs.
 * «Ins Modell» lädt das Objekt als Referenz-Kontext in den Design-Viewport
 * (setGlbContext) — studierbar, nicht Teil der Planableitung.
 *
 * Batch 3 hebt das Datenmodell auf eine lokale Teilmenge des kanonischen
 * KosmoAsset-Manifests (`schema/kosmo-asset-library.schema.json`): Titel,
 * Typ, Kategorie, Tags, Formate, Rechte-Status, Sichtbarkeit. Nur das
 * Datenmodell + Migration — Suche/Facetten/Detail kommen Batch 4.
 *
 * v0.6.3 / B4 (Owner-Befund K21, Materialbibliothek Stufe 1) hebt das Manifest
 * additiv um `quelle`/`materialArt`/`materialDimensionen`/`region` an — Pflicht
 * bei NEU erfassten Material-Einträgen (`erfasseMaterial`), Altbestand
 * (GLB-Importe vor diesem Batch) migriert ehrlich auf «Quelle unbelegt
 * (Altbestand)» statt eine Herkunft zu erfinden (`project-vault.ts`, DB v4→v5).
 * Stufe 2 (externer Quellen-Ingest, Lizenzprüfung, echte Texturdateien) bleibt
 * offen — hier nur Datenmodell + Erfassung + 3D-Würfel-Vorschau.
 */

export type AssetType =
  | '2d_symbol'
  | 'vector_plan_component'
  | 'texture'
  | 'material'
  | 'glb_model'
  | 'blender_collection'
  | 'archicad_layer'
  | 'detail'
  | 'component'
  | 'landscape'
  | 'lighting'
  | 'render_preset';

// Lokale Teilmenge der kanonischen Kategorien + «component» als sinnvoller
// Default für generische, noch nicht einsortierte Objekte (Batch 4 sortiert
// nach).
export type AssetCategory =
  | 'structure'
  | 'facade'
  | 'opening'
  | 'stair'
  | 'roof'
  | 'ground'
  | 'landscape'
  | 'material'
  | 'furniture'
  | 'annotation'
  | 'site'
  | 'atmosphere'
  | 'utility'
  | 'component';

export type RightsStatus =
  | 'unknown'
  | 'needs_permission'
  | 'private_research'
  | 'licensed'
  | 'public_domain'
  | 'own_work'
  | 'generated_needs_review';

/** Lokal-first-Sichtbarkeit — Büro-Objekte sind standardmässig NICHT geteilt. */
export type AssetVisibility = 'public' | 'private';

export type AssetFormatKind =
  | 'svg'
  | 'dxf'
  | 'glb'
  | 'blend'
  | 'gsm'
  | 'ifc'
  | 'webp'
  | 'png'
  | 'jpg'
  | 'json'
  | 'material_json';

export type AssetFormatStatus = 'ready' | 'missing' | 'blocked';

export interface AssetFormatEntry {
  format: AssetFormatKind;
  bytes: number;
  status: AssetFormatStatus;
}

export type AssetPreviewKind = 'axis_marker' | 'material_swatch' | 'wireframe_component';

export interface AssetPreview {
  kind: AssetPreviewKind;
}

export interface AssetDimensions {
  width_m?: number;
  depth_m?: number;
  height_m?: number;
  scale?: string;
}

export type KosmodataRefKind = 'reference_entry' | 'source_entry' | 'project_context' | 'material_context' | 'typology_context';
export type KosmodataRefRelation = 'taxonomy_hint' | 'material_context' | 'model_context' | 'typology_context' | 'source_trail';
export type KosmodataRefUsagePolicy = 'context_only' | 'source_trail_only' | 'derived_asset_review_required';
export type KosmodataRefReviewStatus = 'context_only' | 'needs_human_review' | 'accepted_as_context' | 'blocked';

export interface KosmodataRef {
  kind: KosmodataRefKind;
  entry_id: string;
  relation: KosmodataRefRelation;
  usage_policy: KosmodataRefUsagePolicy;
  review_status: KosmodataRefReviewStatus;
  notes?: string;
}

/**
 * Reiches Asset-Manifest — lokale Teilmenge von
 * `schema/kosmo-asset-library.schema.json`. `daten` ist der Laufzeit-Blob:
 * er liegt IM SELBEN IndexedDB-Record (der Vault-Store `objekte` ist ohnehin
 * ausserhalb des Doc/Yjs-Pfads), geht aber nie durch Undo oder Sync.
 */
export interface KosmoAsset {
  id: string;
  title: string;
  asset_type: AssetType;
  category: AssetCategory;
  tags: string[];
  formats: AssetFormatEntry[];
  preview?: AssetPreview;
  rights_status: RightsStatus;
  public_use_allowed: boolean;
  visibility: AssetVisibility;
  kosmodata_refs: KosmodataRef[];
  dimensions?: AssetDimensions;
  /**
   * Herkunft/Quelle des Assets (K21) — Pflicht bei NEU erfassten Materialien
   * (`erfasseMaterial` erzwingt das in der UI), Altbestand trägt ehrlich
   * «Quelle unbelegt (Altbestand)» statt eine Herkunft zu erfinden.
   */
  quelle?: string;
  /** Rohmaterial vs. Baumaterial (K21) — nur befüllt, wo bekannt. */
  materialArt?: MaterialArt;
  /** Lieferbare Grössen/Dicken (K21) — Basis für den 3D-Würfel in der Vorschau. */
  materialDimensionen?: MaterialDimensionen;
  /** Regionale Eigenschaft/Herkunft, optional (K21). */
  region?: string;
  createdAt: string;
  daten: ArrayBuffer;
}

/** Rückwärtskompatibler Name (V1-Finish P3 hiess der Typ `GlbObjekt`). */
export type GlbObjekt = KosmoAsset;

export interface SpeichereGlbOptionen {
  title?: string;
  asset_type?: AssetType;
  category?: AssetCategory;
  tags?: string[];
}

/** Primäre Byte-Grösse eines Assets (erstes GLB-Format, sonst erstes Format). */
export function assetBytes(asset: KosmoAsset): number {
  return asset.formats.find((f) => f.format === 'glb')?.bytes ?? asset.formats[0]?.bytes ?? 0;
}

export async function speichereGlb(file: File, optionen: SpeichereGlbOptionen = {}): Promise<KosmoAsset> {
  const daten = await file.arrayBuffer();
  const titel = optionen.title ?? file.name.replace(/\.(glb|gltf)$/i, '');
  const asset: KosmoAsset = {
    id: `glb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: titel,
    asset_type: optionen.asset_type ?? 'glb_model',
    category: optionen.category ?? 'component',
    tags: optionen.tags ?? [],
    formats: [{ format: 'glb', bytes: daten.byteLength, status: 'ready' }],
    rights_status: 'generated_needs_review',
    public_use_allowed: false,
    visibility: 'private',
    kosmodata_refs: [],
    createdAt: new Date().toISOString(),
    daten,
  };
  await vaultTx('objekte', 'readwrite', (s) => s.put(asset));
  return asset;
}

export async function listeGlb(): Promise<KosmoAsset[]> {
  const alle = await vaultTx<KosmoAsset[]>('objekte', 'readonly', (s) => s.getAll() as IDBRequest<KosmoAsset[]>);
  return alle.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function loescheGlb(id: string): Promise<void> {
  await vaultTx('objekte', 'readwrite', (s) => s.delete(id));
}

/** Eingabe fürs Erfassen eines Material-Eintrags (K21, Materialbibliothek Stufe 1). */
export interface ErfasseMaterialEingabe {
  title: string;
  /** Pflicht — leer/nur-Whitespace wirft (UI zeigt die Meldung als Validierung). */
  quelle: string;
  materialArt?: MaterialArt;
  materialDimensionen?: MaterialDimensionen;
  region?: string;
  tags?: string[];
}

/**
 * Erfasst einen neuen Material-Eintrag in der Objekt-Bibliothek
 * (`asset_type: 'material'`) — OHNE Binärdaten: die eigentliche Textur-/
 * PBR-Map-Datei ist Stufe 2 (externer Quellen-Ingest, Lizenzprüfung). Stufe 1
 * liefert nur das Manifest + die Würfel-Vorschau (Farbton/Fallback). `quelle`
 * ist Pflicht — der Owner-Befund K21 verlangt sie IMMER in der Erfassung.
 */
export async function erfasseMaterial(eingabe: ErfasseMaterialEingabe): Promise<KosmoAsset> {
  const quelle = eingabe.quelle.trim();
  if (!quelle) {
    throw new Error('Quelle ist Pflicht — Herkunft des Materials angeben, bevor es gespeichert wird.');
  }
  const titel = eingabe.title.trim() || 'Material';
  const asset: KosmoAsset = {
    id: `material-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: titel,
    asset_type: 'material',
    category: 'material',
    tags: eingabe.tags ?? [],
    formats: [{ format: 'material_json', bytes: 0, status: 'ready' }],
    preview: { kind: 'material_swatch' },
    rights_status: 'unknown',
    public_use_allowed: false,
    visibility: 'private',
    kosmodata_refs: [],
    quelle,
    ...(eingabe.materialArt !== undefined ? { materialArt: eingabe.materialArt } : {}),
    ...(eingabe.materialDimensionen !== undefined ? { materialDimensionen: eingabe.materialDimensionen } : {}),
    ...(eingabe.region !== undefined ? { region: eingabe.region } : {}),
    createdAt: new Date().toISOString(),
    daten: new ArrayBuffer(0),
  };
  await vaultTx('objekte', 'readwrite', (s) => s.put(asset));
  return asset;
}

/** Erfasste Material-Einträge (Stufe 1) aus der Objekt-Bibliothek — neueste zuerst. */
export async function listeMaterialien(): Promise<KosmoAsset[]> {
  const alle = await listeGlb();
  return alle.filter((a) => a.asset_type === 'material');
}

/** Optionale Übersteuerung der Default-Felder beim Verknüpfen (Batch 5). */
export type VerknuepfeReferenzMeta = Partial<Omit<KosmodataRef, 'entry_id'>>;

/**
 * Batch 5 (Codex-Übernahme) — «ein System»: verknüpft ein Asset mit einem
 * KosmoData-Referenzprojekt. Idempotent (kein Duplikat je `entryId`), Defaults
 * sind die konservativste Einstufung (Kontext lesen, nicht automatisch als
 * Quelle/Vorlage übernehmen) — Owner-Mandat «ehrlich vor Politur».
 */
export async function verknuepfeAssetMitReferenz(
  assetId: string,
  referenzId: string,
  meta: VerknuepfeReferenzMeta = {},
): Promise<KosmoAsset> {
  const asset = await vaultTx<KosmoAsset | undefined>('objekte', 'readonly', (s) => s.get(assetId));
  if (!asset) throw new Error(`Objekt «${assetId}» nicht gefunden`);
  if (!asset.kosmodata_refs.some((r) => r.entry_id === referenzId)) {
    const ref: KosmodataRef = {
      kind: meta.kind ?? 'reference_entry',
      entry_id: referenzId,
      relation: meta.relation ?? 'model_context',
      usage_policy: meta.usage_policy ?? 'context_only',
      review_status: meta.review_status ?? 'context_only',
      ...(meta.notes !== undefined ? { notes: meta.notes } : {}),
    };
    asset.kosmodata_refs = [...asset.kosmodata_refs, ref];
    await vaultTx('objekte', 'readwrite', (s) => s.put(asset));
  }
  return asset;
}

/** Entfernt die Verknüpfung (falls vorhanden) — kein Fehler, wenn schon gelöst. */
export async function entferneAssetReferenz(assetId: string, referenzId: string): Promise<KosmoAsset> {
  const asset = await vaultTx<KosmoAsset | undefined>('objekte', 'readonly', (s) => s.get(assetId));
  if (!asset) throw new Error(`Objekt «${assetId}» nicht gefunden`);
  asset.kosmodata_refs = asset.kosmodata_refs.filter((r) => r.entry_id !== referenzId);
  await vaultTx('objekte', 'readwrite', (s) => s.put(asset));
  return asset;
}
