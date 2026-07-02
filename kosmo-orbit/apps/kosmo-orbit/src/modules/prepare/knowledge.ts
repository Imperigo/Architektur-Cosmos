/**
 * Wissensbasis (KosmoPrepare, Owner-Q28) — Grundlagen-Ingestion.
 *
 * PDF/Text/Markdown → Text → Abschnitts-Chunks → IndexedDB. Kosmo liest über
 * das Read-Only-Tool «grundlagen_suchen» (Stichwort-Scoring V1; Embedding-RAG
 * via Bridge/bge-m3 folgt). Alles lokal — Bürodokumente verlassen das Gerät nie.
 */

export interface KnowledgeDoc {
  id: string;
  name: string;
  source: 'lokal' | 'onedrive';
  addedAt: string;
  pages?: number;
  chunkCount: number;
}

export interface KnowledgeChunk {
  id: string;
  docId: string;
  docName: string;
  seq: number;
  text: string;
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
  };

  const db = await openDb();
  const tx = db.transaction(['docs', 'chunks'], 'readwrite');
  tx.objectStore('docs').put(doc);
  const store = tx.objectStore('chunks');
  chunks.forEach((c, i) =>
    store.put({ id: `${docId}-${i}`, docId, docName: file.name, seq: i, text: c } satisfies KnowledgeChunk),
  );
  await txDone(tx);
  db.close();
  return doc;
}

export async function listDocs(): Promise<KnowledgeDoc[]> {
  const db = await openDb();
  const tx = db.transaction('docs', 'readonly');
  const all = await reqResult(tx.objectStore('docs').getAll() as IDBRequest<KnowledgeDoc[]>);
  db.close();
  return all.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
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

export interface KnowledgeHit extends KnowledgeChunk {
  score: number;
}

/** Stichwort-Suche über alle Chunks (Termfrequenz + Phrasen-Bonus). */
export async function searchKnowledge(query: string, limit = 5): Promise<KnowledgeHit[]> {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9äöüéèàç]+/i)
    .filter((t) => t.length >= 3);
  if (terms.length === 0) return [];
  const phrase = query.toLowerCase().trim();

  const db = await openDb();
  const tx = db.transaction('chunks', 'readonly');
  const all = await reqResult(tx.objectStore('chunks').getAll() as IDBRequest<KnowledgeChunk[]>);
  db.close();

  const hits: KnowledgeHit[] = [];
  for (const c of all) {
    const hay = c.text.toLowerCase();
    let score = 0;
    for (const t of terms) {
      let i = hay.indexOf(t);
      while (i !== -1) {
        score += 1;
        i = hay.indexOf(t, i + t.length);
      }
    }
    if (score === 0) continue;
    if (phrase.length > 4 && hay.includes(phrase)) score += 5;
    // leichte Längen-Normalisierung, damit kurze prägnante Chunks gewinnen
    hits.push({ ...c, score: score / Math.sqrt(c.text.length / 400 + 1) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
