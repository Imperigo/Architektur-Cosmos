import {
  topoReihenfolge,
  visPresetById,
  VIS_NODE_KATALOG,
  VIS_STIMMUNGEN,
  type VisGraph,
  type VisNode,
  type VisRenderAuftrag,
} from '@kosmo/kernel';
import { formularFeldText, type JobQa } from './vis-jobs';
import type { KurationEintrag } from './vis-runtime';

/** Bildquelle einer Kuratier-Karte — Bridge-Render (Job-Artefakt) ODER eine
 * Viewport-Aufnahme (dataURL, v0.6.7 P0). Identisch zur bestehenden
 * Unterscheidung in `bildQuelle()`/`BildKachel` (NodeCanvas.tsx) — kein
 * Sonderfall am Ziel, nur an einem Ort neu benannt. */
export type KuratierQuelle = { jobId: string; bild: string; qa?: JobQa | undefined } | { dataUrl: string };

/** Eine Karte der Kuratierfläche — ein fertiger Render-Node ODER eine
 * gewählte Viewport-Aufnahme, plus die Laufzeit-Kuration (Stern/Ablage,
 * `vis-runtime.ts`) und (falls vorhanden) der ausgewertete Render-Auftrag für
 * den Parameter-Diff. */
export interface KuratierKartenDaten {
  node: VisNode;
  quelle: KuratierQuelle;
  kur: KurationEintrag;
  auftrag?: VisRenderAuftrag;
}

/**
 * Reine Ableitungs-Logik der Vis-Kuratierfläche (Welle 1, Soll-Bild
 * `Kosmo Viz Kuratierung.dc.html` §6.2) — KEIN React, KEIN DOM, unit-testbar.
 * Trennt die Datenaufbereitung (Kennung, Merkmale, Diff, Herkunft, Bewertung)
 * von der Darstellung in `KuratierFlaeche.tsx`/`KuratierInspektor.tsx`.
 */

/** Kompakte Anzeige-Kennung je Karte — 'V' für Render-Varianten, 'A' für
 * Viewport-Aufnahmen (v0.6.7 P0). Reine Positions-Nummerierung (stabile
 * Eingabereihenfolge), KEIN echter Renderer-Seed — das System kennt keinen. */
export function kartenId(typ: string, index: number): string {
  const praefix = typ === 'aufnahme' ? 'A' : 'V';
  return `${praefix}-${String(index + 1).padStart(2, '0')}`;
}

/** Kurze, stabile Kennung aus einer Bridge-Job-ID/Aufnahme-ID — ersetzt in der
 * Karten-Fusszeile ein "Seed" (das render-scene/v1-Protokoll kennt keinen);
 * bleibt trotzdem eindeutig genug, um zwei Karten auseinanderzuhalten. */
export function kurzKennung(id: string): string {
  return id.slice(-6).toUpperCase();
}

/** Menschenlesbare Merkmale einer Kuratier-Karte — Grundlage für Meta-Zeilen
 * (Inspektor), Karten-Fusszeile (Raster) und die Vergleichs-Diff-Tabelle. */
export interface VarianteMerkmale {
  typ: string;
  typLabel: string;
  szene: string;
  stimmung: string;
  faithful?: number;
  samples?: number;
  presetLabel?: string;
  qaBestanden?: boolean;
}

export function varianteMerkmale(
  node: VisNode,
  auftrag: VisRenderAuftrag | undefined,
  qa: JobQa | undefined,
): VarianteMerkmale {
  const kat = VIS_NODE_KATALOG[node.typ];
  const szeneRoh = node.params?.['formSzene'];
  const szene = typeof szeneRoh === 'string' && szeneRoh ? formularFeldText('formSzene', szeneRoh) : '—';
  const presetRoh = node.params?.['preset'];
  const stimmung =
    typeof presetRoh === 'string' && presetRoh ? (VIS_STIMMUNGEN[presetRoh]?.label ?? presetRoh) : '—';
  return {
    typ: node.typ,
    typLabel: kat?.label ?? node.typ,
    szene,
    stimmung,
    ...(auftrag ? { faithful: auftrag.faithful, samples: auftrag.samples } : {}),
    ...(auftrag?.presetId ? { presetLabel: visPresetById(auftrag.presetId).name } : {}),
    ...(qa?.verdict ? { qaBestanden: qa.verdict.passed } : {}),
  };
}

export interface DiffZeile {
  label: string;
  a: string;
  b: string;
  abweichend: boolean;
}

function fmtFaithful(v?: number): string {
  return v === undefined ? '—' : v.toFixed(2);
}
function fmtSamples(v?: number): string {
  return v === undefined ? '—' : String(v);
}
function fmtQa(v?: boolean): string {
  return v === undefined ? '—' : v ? 'bestanden' : 'verfehlt';
}

/** A/B-Parameter-Diff (Soll-Bild §6.2) — abweichende Zeilen tragen
 * `abweichend: true`, die Darstellung macht daraus Fettschrift + Rollenfarbe. */
export function varianteDiff(a: VarianteMerkmale, b: VarianteMerkmale): DiffZeile[] {
  const zeile = (label: string, av: string, bv: string): DiffZeile => ({ label, a: av, b: bv, abweichend: av !== bv });
  return [
    zeile('Node-Typ', a.typLabel, b.typLabel),
    zeile('Szene', a.szene, b.szene),
    zeile('Stimmung', a.stimmung, b.stimmung),
    zeile('Preset', a.presetLabel ?? '—', b.presetLabel ?? '—'),
    zeile('Geometrie-Treue', fmtFaithful(a.faithful), fmtFaithful(b.faithful)),
    zeile('Samples', fmtSamples(a.samples), fmtSamples(b.samples)),
    zeile('QA-Verdikt', fmtQa(a.qaBestanden), fmtQa(b.qaBestanden)),
  ];
}

/** Sterne-Bewertung (0–5), EHRLICH aus der QA abgeleitet — das Datenmodell
 * kennt kein manuelles Rating-Feld (vis-runtime.ts ist eingefroren). Ohne QA
 * bleibt die Bewertung 0 (leer) statt eine erfundene Zahl zu zeigen. */
export function sterneAusQa(qa: JobQa | undefined): number {
  if (!qa) return 0;
  const werte = [qa.geometry?.geometry_fidelity, qa.style?.style_score].filter(
    (v): v is number => typeof v === 'number',
  );
  if (werte.length === 0) return qa.verdict.passed ? 4 : 2;
  const mittel = werte.reduce((s, v) => s + v, 0) / werte.length;
  return Math.max(0, Math.min(5, Math.round(mittel * 5)));
}

/** Herkunft-Chain (Soll-Bild §6.2 „Herkunft") — alle Vorfahren-Nodes eines
 * Ziels in Auswertungsreihenfolge (`topoReihenfolge`), reine Ableitung aus
 * dem Graphen selbst, keine erfundenen Zwischenschritte. */
export function herkunftChain(graph: VisGraph, zielId: string): VisNode[] {
  const eingehend = new Map<string, string[]>();
  for (const e of graph.edges) {
    const liste = eingehend.get(e.to) ?? [];
    liste.push(e.from);
    eingehend.set(e.to, liste);
  }
  const vorfahren = new Set<string>();
  const stack = [zielId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const von of eingehend.get(cur) ?? []) {
      if (!vorfahren.has(von)) {
        vorfahren.add(von);
        stack.push(von);
      }
    }
  }
  return topoReihenfolge(graph).filter((n) => vorfahren.has(n.id) || n.id === zielId);
}
