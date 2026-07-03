import { create } from 'zustand';
import type { Learning } from '@kosmo/ai';
import type { DossierEintrag } from '@kosmo/kernel';
import { searchKnowledge } from '../modules/prepare/knowledge';

/**
 * Abruf-Index (V2-B1) — EINE Quellensuche über alles, was das Büro weiss:
 * Wissensbasis (KosmoPrepare), Lernjournal (Feedback) und Wettbewerbsdossier.
 * Kosmo zitiert Treffer als [Qn]; die Chips unter der Antwort springen über
 * diesen Store zur Quelle (Prepare-Highlight bzw. Train-Kuration).
 */

export type QuellenTyp = 'wissen' | 'journal' | 'dossier';

export interface QuellenRef {
  /** Laufende Beleg-Nummer im Gespräch ([Q1], [Q2] …). */
  nr: number;
  typ: QuellenTyp;
  /** Anzeige: «Programm.pdf · Abschnitt 4», «Lernjournal 12.06.», «Dossier NO-GO». */
  titel: string;
  text: string;
  score: number;
  /** Sprungdaten. */
  docId?: string;
  seq?: number;
  ts?: string;
  index?: number;
}

interface QuellenState {
  /** Aktuelles Sprungziel + Sequenz (gleiche Quelle zweimal anklickbar). */
  ziel: QuellenRef | null;
  zielSeq: number;
  springe(ref: QuellenRef): void;
}

export const useQuellen = create<QuellenState>((set) => ({
  ziel: null,
  zielSeq: 0,
  springe: (ref) => set((s) => ({ ziel: ref, zielSeq: s.zielSeq + 1 })),
}));

/** Stichwort-Score wie in der Wissensbasis-Suche (Termfrequenz, längennormiert). */
function kwScore(query: string, text: string): number {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9äöüéèàç]+/i)
    .filter((t) => t.length >= 3);
  if (terms.length === 0) return 0;
  const hay = text.toLowerCase();
  let kw = 0;
  for (const t of terms) {
    let i = hay.indexOf(t);
    while (i !== -1) {
      kw += 1;
      i = hay.indexOf(t, i + t.length);
    }
  }
  return kw / Math.sqrt(text.length / 400 + 1);
}

/**
 * Alle drei Quellen abfragen und mischen. Dossier-Treffer werden leicht
 * bevorzugt (bindende Regeln), Wissensbasis liefert die Substanz, das
 * Journal die Büro-Lehren. Rückgabe OHNE Nummern — die vergibt die Session.
 */
export async function sucheQuellen(
  query: string,
  kontext: { journal: readonly Learning[]; dossier: readonly DossierEintrag[] },
  limit = 5,
): Promise<Omit<QuellenRef, 'nr'>[]> {
  const treffer: Omit<QuellenRef, 'nr'>[] = [];

  for (const h of await searchKnowledge(query, 4)) {
    treffer.push({
      typ: 'wissen',
      titel: `${h.docName} · Abschnitt ${h.seq + 1}`,
      text: h.text,
      score: h.score,
      docId: h.docId,
      seq: h.seq,
    });
  }
  for (const e of kontext.journal) {
    const text = [e.note, e.context].filter(Boolean).join(' — ');
    const score = kwScore(query, text);
    if (score > 0) {
      treffer.push({
        typ: 'journal',
        titel: `Lernjournal ${e.ts.slice(8, 10)}.${e.ts.slice(5, 7)}. (${e.sentiment === 'gut' ? '👍' : '👎'})`,
        text,
        score: score * 0.9,
        ts: e.ts,
      });
    }
  }
  kontext.dossier.forEach((e, index) => {
    const score = kwScore(query, e.text);
    if (score > 0) {
      treffer.push({
        typ: 'dossier',
        titel: `Dossier ${e.typ === 'dont' ? 'NO-GO' : e.typ === 'do' ? 'GEFORDERT' : 'FAKT'}`,
        text: e.text,
        score: score * 1.2,
        index,
      });
    }
  });

  return treffer.sort((a, b) => b.score - a.score).slice(0, limit);
}
