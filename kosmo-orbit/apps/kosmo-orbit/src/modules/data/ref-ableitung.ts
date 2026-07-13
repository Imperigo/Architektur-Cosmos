import type { RefEntry } from '@kosmo/data';

/**
 * Status- und Quellen-Ableitung für die Datenstationen-Tabelle (v0.7.6
 * Welle 2 Stream D). Beide Facetten stammen aus dem Design-Soll-Bild
 * (`Kosmo Viz Datenstationen.dc.html`, reine Bild-Vorlage) — dort sind sie
 * mit erfundenen Server-Sync-Feldern hinterlegt, die es in `RefEntry`
 * (`packages/kosmo-data/src/reference.ts`) nicht gibt. Hier werden sie
 * EHRLICH aus vorhandenen Feldern abgeleitet und die Herleitung bleibt
 * dokumentiert, statt Werte zu erfinden.
 */

export type RefStationStatus = 'indexiert' | 'sync' | 'lokal';

export const REF_STATUS_LABEL: Record<RefStationStatus, string> = {
  indexiert: 'INDEXIERT',
  sync: 'SYNC',
  lokal: 'LOKAL',
};

/** Farb-Zuordnung exakt wie im Soll-Bild-Handoff (README §8/§10) benannt:
 *  INDEXIERT = --k-signal, SYNC = --k-rolle-agent, LOKAL = --k-rolle-pn. */
export const REF_STATUS_FARBE: Record<RefStationStatus, string> = {
  indexiert: 'var(--k-signal)',
  sync: 'var(--k-rolle-agent)',
  lokal: 'var(--k-rolle-pn)',
};

/**
 * Ableitungsregel (Priorität, eine Referenz zeigt den "reichsten" zutreffenden
 * Status — KosmoOrbit ist lokal-first, es gibt keinen Multi-Client-Sync-
 * Zustand pro Referenz, den man sonst 1:1 abbilden könnte):
 *
 *  1. LOKAL     — `has_3d === true`: der Seed weist ein lokal nutzbares
 *                 3D-Modell zu dieser Referenz aus. Das ist ein Hinweis "lokal
 *                 verfügbar", kein Beweis eines bereits importierten Assets
 *                 (die tatsächliche Ref↔Asset-Verknüpfung ist Laufzeit-Zustand,
 *                 siehe `lokaleRef3dQuelle` in DataWorkspace.tsx).
 *  2. SYNC      — `database_profile.status === 'reviewed'`: die Referenz ist
 *                 gegen ihre Quellen geprüft — der ehrlichste vorhandene
 *                 Näherungswert für "abgeglichen/synchronisiert".
 *  3. INDEXIERT — alle übrigen. Jeder geladene Eintrag ist per Definition im
 *                 Referenz-Index enthalten (Basis-Zustand, kein Sonderfall,
 *                 kein leeres Gerüst — das ist der Normalfall für 11 von 112
 *                 Seed-Einträgen ohne 3D und ohne geprüftes Datenbankprofil).
 */
export function refStationStatus(e: Pick<RefEntry, 'has_3d' | 'database_profile'>): RefStationStatus {
  if (e.has_3d) return 'lokal';
  if (e.database_profile?.status === 'reviewed') return 'sync';
  return 'indexiert';
}

/**
 * Datenquellen-Facette (linke Spalte, Soll-Bild §10): Zählung nach
 * `source_quality` — dem einzigen echten "Quelle"-Feld auf `RefEntry` (im
 * Dossier bereits als "Quelle …" beschriftet). Jede Quellenart bekommt eine
 * STABILE Rollenfarbe (deterministisch aus dem Text gehasht, keine neue
 * Bedeutung für Rollenfarben, keine Zufallszuordnung zwischen Reloads).
 */
const QUELLEN_FARB_PALETTE = [
  'var(--k-rolle-pn)',
  'var(--k-rolle-agent)',
  'var(--k-rolle-generator)',
  'var(--k-rolle-manuell)',
  'var(--k-rolle-memory)',
  'var(--k-rolle-pna)',
  'var(--k-rolle-ak)',
  'var(--k-rolle-office)',
];

export function quellenFarbe(quelle: string): string {
  let hash = 0;
  for (let i = 0; i < quelle.length; i++) hash = (Math.imul(hash, 31) + quelle.charCodeAt(i)) >>> 0;
  return QUELLEN_FARB_PALETTE[hash % QUELLEN_FARB_PALETTE.length]!;
}

export function quellenLabel(quelle: string): string {
  return quelle.replace(/_/g, ' ');
}

export interface QuellenFacette {
  id: string;
  label: string;
  farbe: string;
  anzahl: number;
}

/** Top-8-Facetten nach Häufigkeit (dasselbe Muster wie die bestehende
 *  `style_sector`-Facette oben in der Werkzeugleiste, `sectors` in
 *  DataWorkspace.tsx: `.slice(0, 8)`). Nur Quellenarten, die im übergebenen
 *  Bestand wirklich vorkommen — kein leeres Gerüst. */
export function quellenFacetten(entries: readonly Pick<RefEntry, 'source_quality'>[]): QuellenFacette[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (!e.source_quality) continue;
    counts.set(e.source_quality, (counts.get(e.source_quality) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, anzahl]) => ({ id, label: quellenLabel(id), farbe: quellenFarbe(id), anzahl }));
}
