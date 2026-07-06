import type { ModuleId } from '@kosmo/ui';

/**
 * Stations-Familien (T7 — Owner-Systematik 06.07.2026).
 *
 * Die Zentrale listete ihre Stationen bisher flach auf. Der Owner hat die
 * Gruppierung entschieden: drei Familien plus Kosmo (die steuernde KI, KEINE
 * Familie — sie bleibt die übergeordnete Intelligenz und bekommt einen
 * eigenen, immer sichtbaren Platz VOR den Familien) plus dezente V2-Platz-
 * halter (docs/SERIE-F-ROLLENPROFILE-ABTEILUNGEN.md).
 *
 * Diese Datei ist reine Zuordnungslogik (unit-testbar) — die Darstellung
 * lebt in App.tsx. Jede Station behält ihre `data-testid="module-<id>"` und
 * ihren Öffnen-Weg unverändert; hier wird nur classificiert, WELCHER Gruppe
 * eine Station optisch zugeordnet wird.
 */

export type StationFamilieId = 'design' | 'data' | 'buero';

export interface StationFamilie {
  id: StationFamilieId;
  /** Name der Familie, wie er als Gruppen-Überschrift erscheint. */
  titel: string;
  /** Kurzbeschrieb der Familie (Untertitel neben dem Titel). */
  untertitel: string;
}

export const STATION_FAMILIEN: StationFamilie[] = [
  { id: 'design', titel: 'KosmoDesign', untertitel: 'Entwerfen & Produzieren' },
  { id: 'data', titel: 'KosmoData', untertitel: 'Wissen & Daten' },
  { id: 'buero', titel: 'KosmoBüro', untertitel: 'Büro & Meta' },
];

/**
 * Zuordnung Station → Gruppe. `'kosmo'` markiert Kosmo/Speak — bewusst KEINE
 * Familie, wird in der Zentrale separat und prominent gerendert. `null`
 * betrifft Ids, die nie als Zentrale-Kachel auftauchen (orbit/kosmo sind nur
 * Modul-Farbtöne/Header-Elemente, keine Stationen).
 */
const ZUORDNUNG: Partial<Record<ModuleId, StationFamilieId | 'kosmo'>> = {
  design: 'design',
  draw: 'design',
  sketch: 'design',
  vis: 'design',
  publish: 'design',
  asset: 'design',
  data: 'data',
  prepare: 'data',
  train: 'data',
  dev: 'buero',
  doc: 'buero',
  speak: 'kosmo',
};

/** Station-Id → Familie (oder 'kosmo'/null). Reine Funktion, kein State. */
export function stationFamilie(id: ModuleId): StationFamilieId | 'kosmo' | null {
  return ZUORDNUNG[id] ?? null;
}

export interface V2Platzhalter {
  id: string;
  name: string;
  kurzbeschrieb: string;
}

/**
 * V2-Platzhalter (Owner-Ideen 05.07.2026, docs/SERIE-F-ROLLENPROFILE-
 * ABTEILUNGEN.md) — dezent sichtbar in der Zentrale, NICHT klickbar-
 * funktional. Reine Ankündigung, damit das Büro weiss, was kommt.
 */
export const V2_PLATZHALTER: V2Platzhalter[] = [
  {
    id: 'lead',
    name: 'KosmoLead',
    kurzbeschrieb: 'Chefabteilung — Büro-Übersicht, Auslastung, Projekte-Portfolio, Kennzahlen',
  },
  {
    id: 'buero-hr',
    name: 'KosmoBüro (HR)',
    kurzbeschrieb: 'Personal, Zeit, Löhne, Rechnungen/Honorare (SIA) — separat von der heutigen Büro-Familie',
  },
  {
    id: 'lehre',
    name: 'KosmoLehre',
    kurzbeschrieb: 'Lern-/Aufgaben-Tool für Lehrlinge und Praktikanten, geführte Abläufe',
  },
  {
    id: 'bau',
    name: 'KosmoBau',
    kurzbeschrieb: 'Baustelle — Termine, Mängel, Begehungen, Ausschreibung/Vergabe',
  },
];
