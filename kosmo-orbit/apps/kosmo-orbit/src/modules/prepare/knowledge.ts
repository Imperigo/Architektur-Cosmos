import { STANDARD_BRIDGE_URL } from '@kosmo/ai';

/**
 * Wissensbasis (KosmoPrepare, Owner-Q28) — Grundlagen-Ingestion.
 *
 * PDF/Text/Markdown → Text → Abschnitts-Chunks → IndexedDB. Kosmo liest über
 * den Abruf-Index (state/quellen.ts, Tool «quellen_suchen»; Embedding-RAG
 * via Bridge/bge-m3 folgt). Alles lokal — Bürodokumente verlassen das Gerät nie.
 */

/** D1 (KosmoData-Dach): Sichtbarkeits-Konzept wie bei Referenzen/Assets — Bürodaten bleiben privat. */
export type KnowledgeVisibility = 'public' | 'private';

export interface KnowledgeDoc {
  id: string;
  name: string;
  source: 'lokal' | 'onedrive' | 'basis';
  addedAt: string;
  pages?: number;
  chunkCount: number;
  /**
   * D1 (KosmoData-Dach): Default 'private' — Bürodokumente bleiben privat.
   * Alt-Dokumente ohne dieses Feld werden beim Lesen (`listDocs`) als
   * 'private' normalisiert; IndexedDB ist per-Record schemalos, es braucht
   * keine Versionsmigration.
   */
  visibility?: KnowledgeVisibility;
}

export interface KnowledgeChunk {
  id: string;
  docId: string;
  docName: string;
  seq: number;
  text: string;
  /** Embedding (bge-m3 via Bridge), wenn beim Aufnehmen erreichbar. */
  vector?: number[];
}

/**
 * Embeddings über die HomeStation-Bridge (bge-m3); null wenn nicht erreichbar.
 *
 * `timeoutMs` ist bewusst ein Parameter statt einer festen Konstante: ein
 * einzelnes Query-Embedding (searchKnowledge) braucht nur den kurzen
 * Default, ein ganzer Ingestions-Batch (importiereBasis, viele Texte in
 * einem Bridge-Aufruf) braucht deutlich mehr Luft — siehe
 * `BASIS_EMBED_TIMEOUT_MS` unten.
 */
export async function embedTexts(texts: string[], timeoutMs = 6000): Promise<number[][] | null> {
  const bridge = (localStorage.getItem('kosmo.bridge') ?? STANDARD_BRIDGE_URL).replace(/\/$/, '');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${bridge}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { vectors: number[][] };
    return json.vectors;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

const DB_NAME = 'kosmo-wissen';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('chunks')) {
        const chunks = db.createObjectStore('chunks', { keyPath: 'id' });
        chunks.createIndex('docId', 'docId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function reqResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Text in Abschnitts-Chunks (~1200 Zeichen, an Absatzgrenzen). */
export function chunkText(text: string, target = 1200): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);
  const chunks: string[] = [];
  let current = '';
  for (const p of paragraphs) {
    if (current && current.length + p.length + 1 > target) {
      chunks.push(current);
      current = p;
    } else {
      current = current ? `${current}\n${p}` : p;
    }
    // Überlange Einzelabsätze hart teilen
    while (current.length > target * 1.6) {
      const cut = current.lastIndexOf(' ', target);
      chunks.push(current.slice(0, cut > target / 2 ? cut : target));
      current = current.slice(cut > target / 2 ? cut + 1 : target);
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function pdfToText(data: ArrayBuffer): Promise<{ text: string; pages: number }> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ('str' in it ? it.str : ''))
      .join(' ')
      .trim();
    if (line) parts.push(line);
  }
  const pages = doc.numPages;
  await loadingTask.destroy();
  return { text: parts.join('\n\n'), pages };
}

/** Datei aufnehmen: PDF/TXT/MD → Chunks → IndexedDB. */
export async function ingestFile(file: File, source: KnowledgeDoc['source'] = 'lokal'): Promise<KnowledgeDoc> {
  let text: string;
  let pages: number | undefined;
  if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
    const res = await pdfToText(await file.arrayBuffer());
    text = res.text;
    pages = res.pages;
  } else {
    text = await file.text();
  }
  if (!text.trim()) throw new Error(`«${file.name}» enthält keinen lesbaren Text`);

  const docId = `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const chunks = chunkText(text);
  const doc: KnowledgeDoc = {
    id: docId,
    name: file.name,
    source,
    addedAt: new Date().toISOString(),
    ...(pages !== undefined ? { pages } : {}),
    chunkCount: chunks.length,
    visibility: 'private',
  };

  // Embeddings, wenn die Bridge da ist — sonst bleibt die Stichwort-Suche
  const vectors = await embedTexts(chunks);

  const db = await openDb();
  const tx = db.transaction(['docs', 'chunks'], 'readwrite');
  tx.objectStore('docs').put(doc);
  const store = tx.objectStore('chunks');
  chunks.forEach((c, i) =>
    store.put({
      id: `${docId}-${i}`,
      docId,
      docName: file.name,
      seq: i,
      text: c,
      ...(vectors?.[i] ? { vector: vectors[i] } : {}),
    } satisfies KnowledgeChunk),
  );
  await txDone(tx);
  db.close();
  return doc;
}

/** Einzelnen Abschnitt lesen (Quellensprung aus einer Kosmo-Antwort). */
export async function getChunk(docId: string, seq: number): Promise<KnowledgeChunk | null> {
  const db = await openDb();
  const tx = db.transaction('chunks', 'readonly');
  const chunk = await reqResult(
    tx.objectStore('chunks').get(`${docId}-${seq}`) as IDBRequest<KnowledgeChunk | undefined>,
  );
  db.close();
  return chunk ?? null;
}

export async function listDocs(): Promise<KnowledgeDoc[]> {
  const db = await openDb();
  const tx = db.transaction('docs', 'readonly');
  const all = await reqResult(tx.objectStore('docs').getAll() as IDBRequest<KnowledgeDoc[]>);
  db.close();
  // D1: Alt-Dokumente ohne `visibility` gelten beim Lesen als 'private' — keine DB-Migration nötig.
  return all
    .map((d) => (d.visibility === undefined ? { ...d, visibility: 'private' as const } : d))
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

/**
 * D2 (KosmoData-Dach): Sichtbarkeit eines vorhandenen Dokuments umschalten —
 * bislang wurde `visibility` nur beim Aufnehmen gesetzt (immer 'private').
 * Wirft, wenn das Dokument nicht (mehr) existiert.
 */
export async function setzeDocVisibility(docId: string, visibility: KnowledgeVisibility): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('docs', 'readwrite');
  const store = tx.objectStore('docs');
  const doc = await reqResult(store.get(docId) as IDBRequest<KnowledgeDoc | undefined>);
  if (!doc) {
    db.close();
    throw new Error(`Dokument «${docId}» existiert nicht`);
  }
  store.put({ ...doc, visibility } satisfies KnowledgeDoc);
  await txDone(tx);
  db.close();
}

export async function removeDoc(docId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(['docs', 'chunks'], 'readwrite');
  tx.objectStore('docs').delete(docId);
  const idx = tx.objectStore('chunks').index('docId');
  const keys = await reqResult(idx.getAllKeys(docId));
  for (const k of keys) tx.objectStore('chunks').delete(k);
  await txDone(tx);
  db.close();
}

// ————— Bauwissen-Basis (wissen/-Korpora aus dem Kosmos-Repo) —————
// Statische JSON-Bündel unter public/wissen/, erzeugt von
// wissen/tools/export-webbasis.py. Laden ist idempotent (stabile doc-Ids).

export interface BasisSammlung {
  sammlung: string;
  label: string;
  quellen: number;
  chunks: number;
  kb: number;
}

function basisUrl(datei: string): string {
  return `${import.meta.env.BASE_URL ?? '/'}wissen/${datei}`;
}

/** Verfügbare Sammlungen (leer, wenn das Bündel nicht ausgeliefert ist). */
export async function basisIndex(): Promise<BasisSammlung[]> {
  try {
    const res = await fetch(basisUrl('index.json'), { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as BasisSammlung[];
  } catch {
    return [];
  }
}

function basisDocId(sammlung: string, quelle: string): string {
  const slug = quelle
    .toLowerCase()
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[c]!)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `basis-${sammlung}-${slug}`;
}

/** Bereits geladene Sammlungen (anhand der stabilen doc-Id-Präfixe). */
export async function geladeneSammlungen(): Promise<Set<string>> {
  const docs = await listDocs();
  const raus = new Set<string>();
  for (const d of docs) {
    const m = d.id.match(/^basis-([a-z0-9-]+?)-/);
    if (d.source === 'basis' && m) raus.add(m[1]!);
  }
  return raus;
}

/**
 * Bridge-Batch für die Basis-Ingestion (v0.8.1/KI1): `main.py` `/embed`
 * deckelt einen Aufruf hart auf 256 Texte — 64 lässt Luft nach oben, hält
 * aber einen einzelnen Batch-Fehlschlag (Timeout, Bridge weg mitten im
 * Lauf) günstig statt einen 256er-Batch riskieren zu müssen.
 */
export const BASIS_EMBED_BATCH = 64;
/**
 * Timeout je Basis-Embed-Batch. Grösser als der 6s-Default von `embedTexts`
 * (der für ein einzelnes Query-Embedding in `searchKnowledge` reicht),
 * weil ein Ingestions-Batch bis zu `BASIS_EMBED_BATCH` Texte auf einmal
 * durch die Bridge schickt.
 */
export const BASIS_EMBED_TIMEOUT_MS = 30_000;

export interface ImportiereBasisFortschritt {
  quelle: number;
  quellenGesamt: number;
  chunksVektorisiert: number;
  chunksGesamt: number;
}

export interface ImportiereBasisOptionen {
  /** Chunks je Bridge-Aufruf (Default `BASIS_EMBED_BATCH`). */
  batchSize?: number;
  /** Timeout je Batch in ms (Default `BASIS_EMBED_TIMEOUT_MS`). */
  timeoutMs?: number;
  /** Fortschritt nach jeder abgeschlossenen Quelle (für eine Ladeanzeige). */
  onProgress?: (fortschritt: ImportiereBasisFortschritt) => void;
}

/**
 * Sammlung in die lokale Wissensbasis laden; je Quelle EIN Dokument —
 * inklusive Embeddings (wie `ingestFile`), damit der bestehende Cosine-/
 * Hybrid-Pfad in `searchKnowledge` auch für die mitgelieferten Basis-
 * Korpora greift (v0.8.1/KI1, vorher: nur BM25 für `source: 'basis'`).
 *
 * Realismus-Design für ~22883 Buch-Abschnitte (grösste Sammlung): Embeddings
 * laufen in `batchSize`-Häppchen statt aller Chunks einer Quelle auf einmal
 * — ein Bridge-Aufruf bleibt so klein/schnell genug für den (konfigurierbaren)
 * Timeout. Fehlertoleranz OHNE Import-Abbruch: sobald ein Batch scheitert
 * (Bridge nicht erreichbar/Timeout), wird die Bridge für den Rest dieses
 * Laufs als tot behandelt (kein Sinn, jeden weiteren Batch einzeln in denselben
 * Timeout laufen zu lassen) — alle noch nicht vektorisierten Chunks werden
 * trotzdem gespeichert und bleiben über den bestehenden BM25-Pfad auffindbar
 * (searchKnowledge fällt automatisch dorthin zurück, siehe dort). Nachträgliche
 * Vektorisierung ist über `vektorisiereFehlende` möglich, sobald die Bridge
 * wieder da ist.
 */
export async function importiereBasis(
  sammlung: string,
  optionen: ImportiereBasisOptionen = {},
): Promise<{ quellen: number; chunks: number; vektorisiert: number }> {
  const batchSize = optionen.batchSize ?? BASIS_EMBED_BATCH;
  const timeoutMs = optionen.timeoutMs ?? BASIS_EMBED_TIMEOUT_MS;
  // v0.6.9 (Stream B «Wissen antwortet»): minimaler, begründeter Sonderfall
  // NUR für die Sammlung-Id `import` — sie kollidiert sonst mit dem bereits
  // bestehenden `import.json` (Docling-Anzeige-Manifest der Import-Sektion,
  // ein ANDERES Format — `DataWorkspace.tsx` `holeWissenImport()`). Die
  // RAG-fähige Sammlung liegt deshalb unter `import-sammlung.json`
  // (`tools/docling-ingest/ingest.py`, exaktes Format der übrigen
  // Basis-Korpora). Alle anderen Sammlungen unverändert: `<sammlung>.json`.
  const datei = sammlung === 'import' ? 'import-sammlung.json' : `${sammlung}.json`;
  const res = await fetch(basisUrl(datei), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sammlung «${sammlung}» nicht erreichbar (${res.status})`);
  const daten = (await res.json()) as {
    quellen: { name: string; chunks: { text: string; seite?: number }[] }[];
  };
  const db = await openDb();
  const vorhandene = new Set(
    (await reqResult(
      db.transaction('docs', 'readonly').objectStore('docs').getAllKeys(),
    )) as string[],
  );
  let quellen = 0;
  let chunks = 0;
  let vektorisiert = 0;
  let bridgeTot = false;
  const quellenGesamt = daten.quellen.length;
  const chunksGesamt = daten.quellen.reduce((s, q) => s + q.chunks.length, 0);
  // Quellenweise Transaktionen: abbruchsicher, Fortschritt bleibt erhalten
  for (const q of daten.quellen) {
    const docId = basisDocId(sammlung, q.name);
    if (vorhandene.has(docId)) continue;

    // Embeddings in Batches — Chunks ohne Vektor (Bridge weg) leben danach
    // ganz normal über searchKnowledge()s BM25-Fallback weiter.
    const vectors: (number[] | undefined)[] = new Array(q.chunks.length).fill(undefined);
    if (!bridgeTot) {
      for (let start = 0; start < q.chunks.length; start += batchSize) {
        const batchTexte = q.chunks.slice(start, start + batchSize).map((c) => c.text);
        const batchVectors = await embedTexts(batchTexte, timeoutMs);
        if (batchVectors === null) {
          bridgeTot = true;
          break;
        }
        batchVectors.forEach((v, i) => {
          vectors[start + i] = v;
          vektorisiert++;
        });
      }
    }

    const tx = db.transaction(['docs', 'chunks'], 'readwrite');
    tx.objectStore('docs').put({
      id: docId,
      name: q.name,
      source: 'basis',
      addedAt: new Date().toISOString(),
      chunkCount: q.chunks.length,
      visibility: 'private',
    } satisfies KnowledgeDoc);
    const store = tx.objectStore('chunks');
    q.chunks.forEach((c, i) =>
      store.put({
        id: `${docId}-${i}`,
        docId,
        docName: q.name,
        seq: i,
        text: c.seite ? `[S. ${c.seite}] ${c.text}` : c.text,
        ...(vectors[i] ? { vector: vectors[i] } : {}),
      } satisfies KnowledgeChunk),
    );
    await txDone(tx);
    quellen++;
    chunks += q.chunks.length;
    optionen.onProgress?.({ quelle: quellen, quellenGesamt, chunksVektorisiert: vektorisiert, chunksGesamt });
  }
  db.close();
  return { quellen, chunks, vektorisiert };
}

/**
 * Nachträgliche Vektorisierung: Chunks, die `importiereBasis` (oder
 * `ingestFile`) ohne Vektor gespeichert hat — weil die Bridge zu dem
 * Zeitpunkt nicht erreichbar war —, bleiben über BM25 auffindbar, aber ohne
 * den semantischen Pfad. Diese Funktion holt das nach, sobald die Bridge
 * wieder da ist: sie sucht Chunks ohne `vector` (optional auf ein Dokument
 * eingeschränkt) und embedded sie batchweise. Abbruchsicher wie
 * `importiereBasis`: scheitert ein Batch, endet der Lauf sofort — bereits
 * vektorisierte Chunks bleiben gespeichert, nichts geht verloren.
 */
export async function vektorisiereFehlende(
  optionen: {
    docId?: string;
    batchSize?: number;
    timeoutMs?: number;
    onProgress?: (fortschritt: { erledigt: number; gesamt: number }) => void;
  } = {},
): Promise<{ gesamt: number; vektorisiert: number }> {
  const batchSize = optionen.batchSize ?? BASIS_EMBED_BATCH;
  const timeoutMs = optionen.timeoutMs ?? BASIS_EMBED_TIMEOUT_MS;
  const db0 = await openDb();
  const tx0 = db0.transaction('chunks', 'readonly');
  const all = await reqResult(tx0.objectStore('chunks').getAll() as IDBRequest<KnowledgeChunk[]>);
  db0.close();
  const fehlend = all.filter((c) => !c.vector && (!optionen.docId || c.docId === optionen.docId));

  let vektorisiert = 0;
  for (let start = 0; start < fehlend.length; start += batchSize) {
    const batch = fehlend.slice(start, start + batchSize);
    const vectors = await embedTexts(
      batch.map((c) => c.text),
      timeoutMs,
    );
    if (vectors === null) break; // Bridge (wieder) weg — sauber abbrechen, kein Teilzustand verloren
    const db = await openDb();
    const tx = db.transaction('chunks', 'readwrite');
    const store = tx.objectStore('chunks');
    batch.forEach((c, i) => {
      if (vectors[i]) {
        store.put({ ...c, vector: vectors[i] } satisfies KnowledgeChunk);
        vektorisiert++;
      }
    });
    await txDone(tx);
    db.close();
    optionen.onProgress?.({ erledigt: Math.min(start + batch.length, fehlend.length), gesamt: fehlend.length });
  }
  return { gesamt: fehlend.length, vektorisiert };
}

export interface KnowledgeHit extends KnowledgeChunk {
  score: number;
}

/**
 * BM25 über eine Chunk-Menge (E3): IDF drückt Allerweltswörter («beton»,
 * «wand» stehen in tausenden Chunks), Sättigung (k1) verhindert, dass reines
 * Wiederholen gewinnt, Längen-Normalisierung (b) lässt prägnante Chunks vorn.
 * Pur und exportiert — testbar ohne IndexedDB.
 */
export function bm25Scores(texte: string[], query: string): number[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9äöüéèàç]+/i)
    .filter((t) => t.length >= 3);
  if (terms.length === 0) return texte.map(() => 0);
  const phrase = query.toLowerCase().trim();
  const K1 = 1.2;
  const B = 0.75;
  const lower = texte.map((t) => t.toLowerCase());
  const avgLen = lower.reduce((s, t) => s + t.length, 0) / (lower.length || 1);
  // Dokumentfrequenz je Term (Chunk enthält den Term mindestens einmal)
  const idf = new Map<string, number>();
  for (const t of terms) {
    const df = lower.reduce((s, hay) => s + (hay.includes(t) ? 1 : 0), 0);
    idf.set(t, Math.log(1 + (lower.length - df + 0.5) / (df + 0.5)));
  }
  return lower.map((hay) => {
    let score = 0;
    for (const t of terms) {
      let tf = 0;
      let i = hay.indexOf(t);
      while (i !== -1) {
        tf++;
        i = hay.indexOf(t, i + t.length);
      }
      if (tf === 0) continue;
      score += idf.get(t)! * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * hay.length) / avgLen)));
    }
    if (phrase.length > 4 && hay.includes(phrase)) score *= 1.5; // exakte Phrase gewinnt
    return score;
  });
}

/**
 * Suche: semantisch (Cosine über Bridge-Embeddings), wo Vektoren vorliegen,
 * plus BM25 als Grundierung — ohne Bridge oder für alt aufgenommene Chunks
 * trägt BM25 allein.
 */
export async function searchKnowledge(query: string, limit = 5): Promise<KnowledgeHit[]> {
  const db = await openDb();
  const tx = db.transaction('chunks', 'readonly');
  const all = await reqResult(tx.objectStore('chunks').getAll() as IDBRequest<KnowledgeChunk[]>);
  db.close();
  if (all.length === 0) return [];

  const kw = bm25Scores(all.map((c) => c.text), query);
  const hatVektoren = all.some((c) => c.vector);
  const qv = hatVektoren ? (await embedTexts([query]))?.[0] ?? null : null;
  // Ohne Semantik entscheidet BM25 allein — nichts wörtlich getroffen = leer.
  // MIT Semantik darf die Query auch ohne wörtlichen Treffer finden (Synonyme).
  if (!qv && kw.every((s) => s === 0)) return [];
  const kwMax = Math.max(...kw);

  const hits: KnowledgeHit[] = [];
  for (let i = 0; i < all.length; i++) {
    const c = all[i]!;
    const kwNorm = kwMax > 0 ? kw[i]! / kwMax : 0;
    // Semantik führt, wo Chunk UND Query Vektoren haben; vektorlose Chunks
    // (alt aufgenommen / Bridge weg) leben weiter vom reinen BM25-Pfad
    if (qv && c.vector) {
      const score = cosine(qv, c.vector) + 0.1 * kwNorm;
      if (score > 0.12) hits.push({ ...c, score });
    } else if (kw[i]! > 0) {
      hits.push({ ...c, score: kwNorm });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
