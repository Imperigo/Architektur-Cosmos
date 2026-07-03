/**
 * Wissensbasis (KosmoPrepare, Owner-Q28) — Grundlagen-Ingestion.
 *
 * PDF/Text/Markdown → Text → Abschnitts-Chunks → IndexedDB. Kosmo liest über
 * den Abruf-Index (state/quellen.ts, Tool «quellen_suchen»; Embedding-RAG
 * via Bridge/bge-m3 folgt). Alles lokal — Bürodokumente verlassen das Gerät nie.
 */

export interface KnowledgeDoc {
  id: string;
  name: string;
  source: 'lokal' | 'onedrive' | 'basis';
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
 * Suche: semantisch (Cosine über Bridge-Embeddings), wo Vektoren vorliegen,
 * plus Stichwort-Scoring (Termfrequenz + Phrasen-Bonus) als Grundierung —
 * ohne Bridge oder für alt aufgenommene Chunks bleibt die Stichwort-Suche.
 */
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

  const hatVektoren = all.some((c) => c.vector);
  const qv = hatVektoren ? (await embedTexts([query]))?.[0] ?? null : null;

  const hits: KnowledgeHit[] = [];
  for (const c of all) {
    const hay = c.text.toLowerCase();
    let kw = 0;
    for (const t of terms) {
      let i = hay.indexOf(t);
      while (i !== -1) {
        kw += 1;
        i = hay.indexOf(t, i + t.length);
      }
    }
    if (phrase.length > 4 && hay.includes(phrase)) kw += 5;
    // leichte Längen-Normalisierung, damit kurze prägnante Chunks gewinnen
    const kwNorm = kw / Math.sqrt(c.text.length / 400 + 1);
    const sem = qv && c.vector ? cosine(qv, c.vector) : 0;
    // Semantik führt (wo vorhanden), Stichworte grundieren und entscheiden Gleichstände
    const score = qv ? sem + 0.05 * kwNorm : kwNorm;
    if (score > (qv ? 0.12 : 0)) hits.push({ ...c, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
