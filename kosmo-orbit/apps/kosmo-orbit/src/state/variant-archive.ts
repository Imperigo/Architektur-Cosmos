import {
  areaReport,
  deriveBerechnungsliste,
  planInnerSvg,
  type DocJson,
} from '@kosmo/kernel';
import { useProject } from './project-store';
import { aktivesProjektId, oeffneJsonAlsNeuesProjekt, vaultTx } from './project-vault';

/**
 * Varianten-Archiv (Vision A5) — persistente Entwurfsstände zum
 * Nebeneinander-Vergleich (ROADMAP 72, RE-VORFORM «Save as new variant»).
 * Anders als der Projekt-Tresor (ein lebender Stand je Projekt) friert das
 * Archiv bewusst ein: Snapshot + Kennzahlen + Plan-Thumbnail, unveränderlich,
 * bis der Owner eine Variante wieder «als Projekt öffnet».
 */

export interface VariantenEintrag {
  id: string;
  /** Projekt, aus dem die Variante stammt (Gruppierung in der Zentrale). */
  projektId: string;
  name: string;
  createdAt: string;
  json: DocJson;
  /** Eingefrorene Kennzahlen fürs Vergleichsraster. */
  kennzahlen: { label: string; wert: string }[];
  /** Mini-Grundriss (aktives Geschoss) als eigenständiges SVG. */
  thumbSvg: string;
}

function kennzahlenVon(): { label: string; wert: string }[] {
  const { doc } = useProject.getState();
  const report = areaReport(doc);
  const liste = deriveBerechnungsliste(doc);
  const f = (v: number) => v.toLocaleString('de-CH', { maximumFractionDigits: 1 });
  const raus: { label: string; wert: string }[] = [
    { label: 'NGF', wert: `${f(report.totalNgf)} m²` },
    { label: 'HNF', wert: `${f(report.total.HNF)} m²` },
    { label: 'aGF-Ziel', wert: `${f(report.agfZiel)} m²` },
  ];
  // %-Erfüllung je Programm-Typ (ausgezogen vs. aGF-Ziel), wenn gesetzt
  for (const z of liste.zeilen) {
    if (z.agfZiel > 0) {
      raus.push({ label: z.name, wert: `${Math.round((z.ausgezogen / z.agfZiel) * 100)} %` });
    }
  }
  if (liste.deltaMax !== null) {
    raus.push({ label: 'Δ Max', wert: `${f(liste.deltaMax)} m²` });
  }
  return raus;
}

function thumbVon(): string {
  const { doc, activeStoreyId } = useProject.getState();
  if (!activeStoreyId) return '';
  const { inner, bounds } = planInnerSvg(doc, activeStoreyId, 200);
  if (!bounds) return '';
  const pad = 800;
  const vb = `${bounds.minX - pad} ${bounds.minY - pad} ${bounds.maxX - bounds.minX + 2 * pad} ${bounds.maxY - bounds.minY + 2 * pad}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;
}

export async function archiviereVariante(name: string): Promise<VariantenEintrag> {
  const { doc } = useProject.getState();
  const eintrag: VariantenEintrag = {
    id: `variante-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    projektId: aktivesProjektId(),
    name: name || `Variante ${new Date().toLocaleTimeString('de-CH')}`,
    createdAt: new Date().toISOString(),
    json: doc.toJSON(),
    kennzahlen: kennzahlenVon(),
    thumbSvg: thumbVon(),
  };
  await vaultTx('varianten', 'readwrite', (s) => s.put(eintrag));
  return eintrag;
}

export async function listeVarianten(): Promise<VariantenEintrag[]> {
  const alle = await vaultTx<VariantenEintrag[]>(
    'varianten',
    'readonly',
    (s) => s.getAll() as IDBRequest<VariantenEintrag[]>,
  );
  return alle.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function loescheVariante(id: string): Promise<void> {
  await vaultTx('varianten', 'readwrite', (s) => s.delete(id));
}

/** Variante als NEUES Projekt öffnen — das Original bleibt eingefroren. */
export async function oeffneVariante(id: string): Promise<void> {
  const rec = await vaultTx<VariantenEintrag | undefined>('varianten', 'readonly', (s) => s.get(id));
  if (!rec) throw new Error('Variante nicht gefunden');
  oeffneJsonAlsNeuesProjekt(rec.json);
}
