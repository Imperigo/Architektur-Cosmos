import type { RefEntry } from '@kosmo/data';
import { LearningJournal, type Learning } from '@kosmo/ai';
import { listeGlb } from './asset-bibliothek';
import { journalStore } from './journal-store';
import { listDocs, searchKnowledge } from '../modules/prepare/knowledge';

/**
 * KosmoData-Dach (D1) — der leichtgewichtige, vereinheitlichte Adapter über
 * die fünf Sammlungen: Referenzen · Assets · Wissen · Training · Gedächtnis.
 *
 * KEIN Datenumzug: jede Sammlung bleibt in ihrem eigenen Speicher (Seed-JSON,
 * IndexedDB-Vault `kosmo-projekte`, IndexedDB `kosmo-wissen`, Lernjournal in
 * localStorage/Vault). Dieses Modul liest nur darüber und liefert eine
 * gemeinsame Übersicht (`sammlungen`) + Suche (`sucheDach`). Tiefe Ausbauten
 * je Sammlung (Facetten, Kuration, echte Zusammenführung) folgen in D2–D4.
 *
 * Bewusst KEIN Import aus `modules/data/DataWorkspace.tsx`: jene Datei bindet
 * diesen Adapter für den neuen Übersichts-Tab ein — ein Import in die
 * Gegenrichtung wäre ein Zirkel. Der Referenz-Seed wird darum hier mit einem
 * eigenen kleinen Cache separat geladen (derselbe Seed, zweimal gecacht ist
 * für D1 kein Problem; D2 kann das bei Bedarf entkoppeln).
 */

export type KosmoDataSammlung = 'referenz' | 'asset' | 'wissen' | 'training' | 'gedaechtnis';
export type KosmoDataVisibility = 'public' | 'private';

/** Sprungziel für einen Treffer-Klick — die UI (DataWorkspace) führt den eigentlichen Sprung aus. */
export type KosmoDataSprung =
  | { screen: 'data'; refId: string }
  | { screen: 'asset'; assetId: string }
  | { screen: 'wissen' }
  | { screen: 'training' }
  | { screen: 'train' };

export interface KosmoDataEintrag {
  id: string;
  sammlung: KosmoDataSammlung;
  titel: string;
  kurztext: string;
  herkunft: string;
  visibility: KosmoDataVisibility;
  tags: string[];
  score?: number;
  sprung?: KosmoDataSprung;
}

export interface KosmoDataZahlen {
  referenz: number;
  asset: number;
  wissen: number;
  training: number;
  gedaechtnis: number;
}

let refCache: RefEntry[] | null = null;

/** Referenz-Seed eigenständig geladen (siehe Datei-Kommentar — kein Zirkel mit DataWorkspace.tsx). */
async function ladeReferenzenFuerDach(): Promise<RefEntry[]> {
  if (refCache) return refCache;
  const res = await fetch('./kosmodata-seed.json');
  const data = (await res.json()) as { entries: RefEntry[] };
  refCache = data.entries;
  return refCache;
}

/** Stichwort-Score (Termfrequenz, längennormiert) — dieselbe Formel wie in `state/quellen.ts`. */
export function stichwortScore(query: string, text: string): number {
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

function neuesJournal(): LearningJournal {
  return new LearningJournal(journalStore());
}

/**
 * Training = kuratierte Lehren (Notiz gesetzt — «die Notiz ist der
 * Trainings-Kern», siehe TrainWorkspace/memory.ts); Gedächtnis = der Rest
 * des Lernjournals (roher Bürolernstand). Dasselbe Journal, zwei Sichten —
 * ein zweiter Speicher wäre für D1 verfrüht.
 */
function istTraining(l: Learning): boolean {
  return Boolean(l.note?.trim());
}

/** Zähler je Sammlung — für die Übersichtskacheln. Defensiv: eine tote Quelle liefert 0, kein Absturz. */
export async function sammlungen(): Promise<KosmoDataZahlen> {
  const [referenz, asset, wissen] = await Promise.all([
    ladeReferenzenFuerDach()
      .then((r) => r.length)
      .catch(() => 0),
    listeGlb()
      .then((a) => a.length)
      .catch(() => 0),
    listDocs()
      .then((d) => d.length)
      .catch(() => 0),
  ]);
  let training = 0;
  let gedaechtnis = 0;
  try {
    for (const l of neuesJournal().all) {
      if (istTraining(l)) training++;
      else gedaechtnis++;
    }
  } catch {
    /* Journal defensiv — leere Zahlen statt Absturz */
  }
  return { referenz, asset, wissen, training, gedaechtnis };
}

/**
 * Sucht über ALLE fünf Sammlungen und liefert eine gemeinsam nach Score
 * sortierte Trefferliste. Baut defensiv: fehlt/wirft eine Quelle (kein Netz,
 * kein IndexedDB, keine Bridge), wird nur SIE übersprungen — der Rest der
 * Suche läuft weiter.
 */
export async function sucheDach(query: string, limit = 20): Promise<KosmoDataEintrag[]> {
  const treffer: KosmoDataEintrag[] = [];
  const q = query.trim();
  if (!q) return treffer;

  // Referenzen
  try {
    for (const r of await ladeReferenzenFuerDach()) {
      const hay = [
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
        .join(' ');
      const score = stichwortScore(q, hay);
      if (score <= 0) continue;
      treffer.push({
        id: `referenz-${r.id}`,
        sammlung: 'referenz',
        titel: r.title,
        kurztext: r.one_sentence ?? r.short_description ?? hay.slice(0, 160),
        herkunft: 'KosmoData · Referenzen',
        visibility: r.visibility ?? 'public',
        tags: r.themes ?? [],
        score,
        sprung: { screen: 'data', refId: r.id },
      });
    }
  } catch {
    /* Seed nicht erreichbar — Sammlung übersprungen */
  }

  // Assets
  try {
    for (const a of await listeGlb()) {
      const hay = [a.title, a.asset_type, a.category, ...a.tags].filter(Boolean).join(' ');
      const score = stichwortScore(q, hay);
      if (score <= 0) continue;
      treffer.push({
        id: `asset-${a.id}`,
        sammlung: 'asset',
        titel: a.title,
        kurztext: `${a.asset_type} · ${a.category}`,
        herkunft: 'KosmoAsset · Objekte',
        visibility: a.visibility,
        tags: a.tags,
        score,
        sprung: { screen: 'asset', assetId: a.id },
      });
    }
  } catch {
    /* Vault nicht erreichbar — Sammlung übersprungen */
  }

  // Wissen
  try {
    const [hits, docs] = await Promise.all([searchKnowledge(q, 8), listDocs()]);
    const docMap = new Map(docs.map((d) => [d.id, d]));
    for (const h of hits) {
      const doc = docMap.get(h.docId);
      treffer.push({
        id: `wissen-${h.id}`,
        sammlung: 'wissen',
        titel: `${h.docName} · Abschnitt ${h.seq + 1}`,
        kurztext: h.text.slice(0, 220),
        herkunft: 'KosmoData · Wissen',
        visibility: doc?.visibility ?? 'private',
        tags: [],
        score: h.score,
        sprung: { screen: 'wissen' },
      });
    }
  } catch {
    /* Wissensbasis nicht erreichbar — Sammlung übersprungen */
  }

  // Training + Gedächtnis (dasselbe Lernjournal, per Notiz unterschieden)
  try {
    for (const l of neuesJournal().all) {
      const text = [l.note, l.context].filter(Boolean).join(' — ');
      const score = stichwortScore(q, text);
      if (score <= 0) continue;
      const training = istTraining(l);
      treffer.push({
        id: `${training ? 'training' : 'gedaechtnis'}-${l.ts}`,
        sammlung: training ? 'training' : 'gedaechtnis',
        titel: `Lernjournal ${l.ts.slice(8, 10)}.${l.ts.slice(5, 7)}. (${l.sentiment === 'gut' ? '👍' : '👎'})`,
        kurztext: text.slice(0, 220),
        herkunft: training ? 'KosmoTrain · Kuration' : 'KosmoTrain · Lernjournal',
        visibility: l.visibility ?? 'private',
        tags: [],
        score,
        // D3: Training-Treffer bleiben in KosmoData (eigener Tab); Gedächtnis
        // springt weiterhin auf die KosmoTrain-Station (D4 folgt).
        sprung: training ? { screen: 'training' } : { screen: 'train' },
      });
    }
  } catch {
    /* Journal nicht erreichbar — Sammlung übersprungen */
  }

  return treffer.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);
}
