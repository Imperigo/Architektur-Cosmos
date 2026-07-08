/**
 * KosmoData-Konfiguration für den Adaptions-Kern (Serie J2 / Batch B1 —
 * docs/SERIE-J2-IMMERSIVE-OBERFLAECHE.md Abschnitt 3.1/4). Analog zum
 * Design-Adapter (`oberflaeche-adaption.ts`), aber die zweite, ganz eigene
 * Matrix — KosmoData komponiert dieselben drei Kern-Primitive
 * (`stufeAusRegel`/`wendeAntiDimmAn`/`wendeNutzerHebungAn`) aus
 * `oberflaeche-adaption-kern.ts` mit ihrer eigenen Gruppen-Liste.
 *
 * Gruppen-Namensraum `navigation/suche/sync/dossier` ist disjunkt von
 * Designs `zeichnen/ansicht/export/ebenen/projekt/verlauf` — beide Stationen
 * teilen denselben `localStorage`-Schlüssel (`kosmo.adaption.v1`, Entscheid 2)
 * kollisionsfrei, weil `elementId`-Präfixe sich nie überschneiden.
 */

import type { FokusStufe } from './fokus';
import { stufeAusRegel, wendeAntiDimmAn, wendeNutzerHebungAn, type NutzungsProfil } from './oberflaeche-adaption-kern';

export type DatenGruppe = 'navigation' | 'suche' | 'sync' | 'dossier';

export const ALLE_DATEN_GRUPPEN: readonly DatenGruppe[] = ['navigation', 'suche', 'sync', 'dossier'];

/** T7-Basis je Gruppe (Abschnitt 3.3: KosmoData). */
export const DATEN_LEISTEN_BASIS: Record<DatenGruppe, FokusStufe> = {
  navigation: 'primaer',
  suche: 'sekundaer',
  sync: 'sekundaer',
  dossier: 'sekundaer',
};

export interface DatenTaetigkeitsKontext {
  /** Aktiver Tab, aus DataWorkspace (`DataTab`). Aktuell nicht Teil der
   *  Matrix (kein Tab schaltet heute eine andere Stufe) — trotzdem Teil des
   *  Kontexts, analog zu Designs `tool`/`phase`, für künftige Regeln (B2+). */
  tab: string;
  /** query.trim().length > 0 — Suche/Filter aktiv getippt. */
  aktionLaeuft: boolean;
  /** selected !== null — eine Referenz ist gewählt, ihr Dossier offen. */
  panelOffen: boolean;
}

/**
 * Leitet den `DatenTaetigkeitsKontext` aus dem in DataWorkspace vorhandenen
 * State ab — reine Funktion, unit-testbar ohne React/DOM (Muster:
 * `leiteTaetigkeitsKontextAb` in `oberflaeche-adaption.ts`).
 */
export function leiteDatenTaetigkeitsKontextAb(params: {
  tab: string;
  query: string;
  dossierOffen: boolean;
}): DatenTaetigkeitsKontext {
  return {
    tab: params.tab,
    aktionLaeuft: params.query.trim().length > 0,
    panelOffen: params.dossierOffen,
  };
}

/**
 * Matrix (Abschnitt 3.3/4, zwei Zeilen Sonderregel, Rest bleibt auf Basis):
 * `sync` tritt beim Tippen auf `selten` zurück (man synct nicht während man
 * filtert) — alles andere bleibt matrixseitig unverändert; `suche`/`dossier`
 * werden NICHT über die Matrix gehoben, sondern über die Anti-Dimm-Wache
 * (s. `adaptiveDatenFokusStufe`), weil ihr Ziel `primaer` über ihrer
 * eigenen T7-Basis (`sekundaer`) liegt — eine reine Matrix-Zeile könnte nur
 * auf der Basis-Spalte landen, nie darüber.
 */
const DATEN_REGELN: Record<DatenGruppe, { beimSuchen: FokusStufe | 'basis' }> = {
  navigation: { beimSuchen: 'basis' },
  suche: { beimSuchen: 'basis' },
  sync: { beimSuchen: 'selten' },
  dossier: { beimSuchen: 'basis' },
};

/**
 * DIE Regel für KosmoData: Basis-Stufe (T7) × Tätigkeit × Nutzung → Stufe.
 * Komponiert exakt dieselben drei Kern-Primitive wie der Design-Adapter,
 * nur mit der Daten-Matrix statt der Zeichnen-Matrix:
 *
 * (1) Matrix (`sync` tritt beim Tippen zurück) → (2) Anti-Dimm: `suche`
 * bleibt beim Tippen selbst immer `primaer` (die Suche IST die aktive
 * Tätigkeit — Analogon zu Designs `panelOffen`) → (3) Anti-Dimm: `dossier`
 * bleibt `primaer`, solange eine Referenz gewählt ist (`panelOffen`) →
 * (4) Nutzer-Adaption: oft genutzte Top-3-Elemente heben eine zurück-
 * gestellte Gruppe maximal eine Stufe (selten→sekundär).
 */
export function adaptiveDatenFokusStufe(
  gruppe: DatenGruppe,
  basis: FokusStufe,
  kontext: DatenTaetigkeitsKontext,
  nutzung: NutzungsProfil,
): FokusStufe {
  const regel = DATEN_REGELN[gruppe];
  const regelStufe = kontext.aktionLaeuft ? regel.beimSuchen : 'basis';
  let stufe = stufeAusRegel(regelStufe, basis);

  stufe = wendeAntiDimmAn(stufe, 'primaer', gruppe === 'suche' && kontext.aktionLaeuft);
  stufe = wendeAntiDimmAn(stufe, 'primaer', gruppe === 'dossier' && kontext.panelOffen);

  stufe = wendeNutzerHebungAn(stufe, gruppe, ALLE_DATEN_GRUPPEN, nutzung);

  return stufe;
}
