import { create } from 'zustand';
import type { Learning } from '@kosmo/ai';
import type { DossierEintrag } from '@kosmo/kernel';
import { bm25Scores, searchKnowledge } from '../modules/prepare/knowledge';
import { loadReferences } from '../modules/data/DataWorkspace';
import { listeGlb } from './asset-bibliothek';

/**
 * Abruf-Index (V2-B1, D1 KosmoData-Dach) — EINE Quellensuche über alles,
 * was das Büro weiss: Wissensbasis (KosmoPrepare), Lernjournal (Feedback),
 * Wettbewerbsdossier — UND (D1) die Referenzbibliothek (KosmoData) und die
 * Objekt-Bibliothek (KosmoAsset). Kosmo zitiert Treffer als [Qn]; die Chips
 * unter der Antwort springen über diesen Store bzw. die bestehenden
 * sessionStorage-Brücken zur Quelle.
 */

export type QuellenTyp = 'wissen' | 'journal' | 'dossier' | 'referenz' | 'asset';

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

/**
 * Alle fünf Quellen abfragen und mischen (D1: KosmoData-Dach erweitert die
 * ursprünglichen drei um Referenzen + Assets). Dossier-Treffer werden leicht
 * bevorzugt (bindende Regeln), Wissensbasis liefert die Substanz, das
 * Journal die Büro-Lehren, Referenzen/Assets den gebauten/gesammelten
 * Bestand. Rückgabe OHNE Nummern — die vergibt die Session. Baut defensiv:
 * eine tote Quelle (kein Seed, kein Vault) wird übersprungen, nicht die
 * ganze Suche zu Fall gebracht.
 *
 * v0.8.1/KI1: Journal/Dossier/Referenz/Asset scorten vorher über eine
 * eigene, naive `kwScore`-Termfrequenz (keine IDF, keine Sättigung) — ein
 * zweiter, schwächerer Suchweg NEBEN der bereits getesteten BM25-Maschinerie
 * aus der Wissensbasis-Suche. Jetzt nutzen alle vier `bm25Scores`
 * (`../modules/prepare/knowledge`, E3, s. dort). Architektur: `bm25Scores`
 * ist eine reine Funktion (`texte: string[], query: string) → number[]`)
 * ohne IndexedDB/Bridge-Zugriff — sie lebt bereits im selben App-Modul wie
 * `searchKnowledge`, `quellen.ts` importierte von dort schon `searchKnowledge`.
 * Kein Package-Split nötig, keine Zirkularität: `knowledge.ts` kennt
 * `quellen.ts` nicht (nur die Umkehrung), reiner Baum-Import. Jede Kategorie
 * bekommt ihren EIGENEN `bm25Scores`-Aufruf (eigene Korpus-Statistik: IDF/
 * Ø-Länge je Kategorie, nicht über alle Quellen hinweg vermischt) — genau wie
 * zuvor lief jedes `kwScore` unabhängig pro Item; die Kategorie-Gewichte
 * (0.9 Journal, 1.2 Dossier) bleiben unverändert.
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

  const journalTexte = kontext.journal.map((e) => [e.note, e.context].filter(Boolean).join(' — '));
  const journalScores = bm25Scores(journalTexte, query);
  kontext.journal.forEach((e, i) => {
    const score = journalScores[i]!;
    if (score > 0) {
      treffer.push({
        typ: 'journal',
        titel: `Lernjournal ${e.ts.slice(8, 10)}.${e.ts.slice(5, 7)}. (${e.sentiment === 'gut' ? '👍' : '👎'})`,
        text: journalTexte[i]!,
        score: score * 0.9,
        ts: e.ts,
      });
    }
  });

  const dossierScores = bm25Scores(kontext.dossier.map((e) => e.text), query);
  kontext.dossier.forEach((e, index) => {
    const score = dossierScores[index]!;
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

  // D1 (KosmoData-Dach): Referenzen — dieselbe Bibliothek wie das
  // `referenzen_suchen`-Tool, aber jetzt auch mit [Qn]-Beleg zitierbar.
  try {
    const referenzen = await loadReferences();
    const hays = referenzen.map((r) =>
      [
        r.title,
        r.city,
        r.country,
        ...(r.authors ?? []),
        ...(r.themes ?? []),
        ...(r.materials ?? []),
        r.one_sentence,
        r.short_description,
      ]
        .filter(Boolean)
        .join(' '),
    );
    const scores = bm25Scores(hays, query);
    referenzen.forEach((r, i) => {
      const score = scores[i]!;
      if (score > 0) {
        treffer.push({
          typ: 'referenz',
          titel: `Referenz · ${r.title}`,
          text: r.one_sentence ?? r.short_description ?? hays[i]!.slice(0, 300),
          score,
          docId: r.id,
        });
      }
    });
  } catch {
    /* Referenz-Seed nicht erreichbar — Sammlung übersprungen */
  }

  // D1 (KosmoData-Dach): Assets — die Objekt-Bibliothek (KosmoAsset).
  try {
    const assets = await listeGlb();
    const hays = assets.map((a) => [a.title, a.asset_type, a.category, ...a.tags].filter(Boolean).join(' '));
    const scores = bm25Scores(hays, query);
    assets.forEach((a, i) => {
      const score = scores[i]!;
      if (score > 0) {
        treffer.push({
          typ: 'asset',
          titel: `Asset · ${a.title}`,
          text: `${a.asset_type} · ${a.category}${a.tags.length ? ` · ${a.tags.join(', ')}` : ''}`,
          score,
          docId: a.id,
        });
      }
    });
  } catch {
    /* Objekt-Vault nicht erreichbar — Sammlung übersprungen */
  }

  return treffer.sort((a, b) => b.score - a.score).slice(0, limit);
}
