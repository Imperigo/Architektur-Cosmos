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

/** Embeddings über die HomeStation-Bridge (bge-m3); null wenn nicht erreichbar. */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const bridge = (localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600').replace(/\/$/, '');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
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

/** Sammlung in die lokale Wissensbasis laden; je Quelle EIN Dokument. */
export async function importiereBasis(
  sammlung: string,
): Promise<{ quellen: number; chunks: number }> {
  const res = await fetch(basisUrl(`${sammlung}.json`), { cache: 'no-store' });
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
  // Quellenweise Transaktionen: abbruchsicher, Fortschritt bleibt erhalten
  for (const q of daten.quellen) {
    const docId = basisDocId(sammlung, q.name);
    if (vorhandene.has(docId)) continue;
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
      } satisfies KnowledgeChunk),
    );
    await txDone(tx);
    quellen++;
    chunks += q.chunks.length;
  }
  db.close();
  return { quellen, chunks };
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
