import { strToU8, strFromU8, zipSync, unzipSync } from 'fflate';
import { KosmoDoc, type JournalEntry, parseKosmoSafe, safeJsonParse } from '@kosmo/kernel';
import { useProject } from './project-store';

/**
 * .kosmo-Projektpaket (Zip) — das universelle Austauschformat.
 * Inhalt nach kosmo.project/v1-Manifest: model/model.json, memory/journal.jsonl.
 * Kompatibel gedacht zur kosmo.project.json-Kultur der HomeStation-Lanes.
 */

/**
 * Deckel auf die (komprimierte) .kosmo-Datei selbst, VOR dem Entpacken —
 * gespiegelt vom Bridge-Upload-Deckel (Serie I / B4,
 * `KOSMO_BRIDGE_MAX_UPLOAD_MODEL`). Bremst kein echtes Projekt (die liegen im
 * MB-Bereich), verhindert aber, dass eine absurd grosse Datei überhaupt
 * entpackt wird. Restgrenze, ehrlich benannt: eine echte Zip-Bombe (winzig
 * komprimiert, riesig entpackt) bleibt möglich — `fflate`s `unzipSync`
 * entpackt synchron ohne Zwischendeckel; der Text-Deckel in `parseKosmoSafe`
 * greift erst NACH dem Entpacken.
 */
const MAX_PAKET_BYTES = 200 * 1024 * 1024;

export type KosmoPaketResult =
  | { ok: true; doc: KosmoDoc; journal: JournalEntry[] }
  | { ok: false; fehler: string };

/**
 * Reine, testbare Funktion (Serie I / B7): Zip-Bytes → geprüftes
 * `{doc, journal}` oder ein definierter Fehler. Wirft NIE — jeder Fehlerfall
 * (kaputtes Zip, fehlendes model.json, verseuchtes/übergrosses/zu tiefes
 * JSON, kaputte Journal-Zeile) kommt als `{ok:false, fehler}` zurück.
 * `openProjectFile` ist nur noch die dünne DOM/State-Hülle darum — bei
 * `ok:false` wird KEIN State geschrieben.
 */
export function parseKosmoPaket(bytes: Uint8Array): KosmoPaketResult {
  if (bytes.byteLength === 0) return { ok: false, fehler: 'leere Datei' };
  if (bytes.byteLength > MAX_PAKET_BYTES) {
    return { ok: false, fehler: `Paket zu gross (> ${Math.round(MAX_PAKET_BYTES / (1024 * 1024))} MB)` };
  }
  let files: ReturnType<typeof unzipSync>;
  try {
    files = unzipSync(bytes);
  } catch (err) {
    return { ok: false, fehler: `kein gültiges .kosmo-Paket (Zip kaputt): ${err instanceof Error ? err.message : String(err)}` };
  }
  const modelRaw = files['model/model.json'];
  if (!modelRaw) return { ok: false, fehler: 'kein model/model.json im Paket' };
  let modelText: string;
  try {
    modelText = strFromU8(modelRaw);
  } catch (err) {
    return { ok: false, fehler: `model.json nicht lesbar: ${err instanceof Error ? err.message : String(err)}` };
  }
  const modell = parseKosmoSafe(modelText);
  if (!modell.ok) return { ok: false, fehler: `model.json: ${modell.fehler}` };

  const journalRaw = files['memory/journal.jsonl'];
  const journal: JournalEntry[] = [];
  if (journalRaw) {
    let journalText: string;
    try {
      journalText = strFromU8(journalRaw);
    } catch (err) {
      return { ok: false, fehler: `journal.jsonl nicht lesbar: ${err instanceof Error ? err.message : String(err)}` };
    }
    for (const zeile of journalText.split('\n')) {
      if (!zeile) continue;
      const geparst = safeJsonParse(zeile);
      if (!geparst.ok) return { ok: false, fehler: `journal.jsonl: ${geparst.fehler}` };
      journal.push(geparst.value as JournalEntry);
    }
  }
  return { ok: true, doc: modell.doc, journal };
}

export function packProject(): Uint8Array {
  const { doc, journal } = useProject.getState();
  const manifest = {
    schema: 'kosmo.project/v1',
    id: doc.settings.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: doc.settings.projectName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    phase: 'wettbewerb',
    contents: { model: 'model/model.json', journal: 'memory/journal.jsonl' },
    review_gates: {
      public_release: { enabled: false, requires_human_approval: true },
      external_upload: { enabled: false, requires_human_approval: true },
      paid_cloud_job: { enabled: true, requires_human_approval: true },
    },
  };
  return zipSync({
    'kosmo.project.json': strToU8(JSON.stringify(manifest, null, 2)),
    'model/model.json': strToU8(JSON.stringify(useProject.getState().doc.toJSON())),
    'memory/journal.jsonl': strToU8(journal.map((j) => JSON.stringify(j)).join('\n')),
  });
}

export function downloadProject(): void {
  const bytes = packProject();
  const name = `${useProject.getState().doc.settings.projectName.replace(/\s+/g, '-') || 'Projekt'}.kosmo`;
  const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function openProjectFile(file: File): Promise<void> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = parseKosmoPaket(bytes);
  if (!result.ok) throw new Error(`Projekt-Paket beschädigt: ${result.fehler}`);
  const { doc, journal } = result;
  const storeys = doc.storeysOrdered();
  const { History } = await import('@kosmo/kernel');
  useProject.setState({
    doc,
    journal,
    revision: useProject.getState().revision + 1,
    activeStoreyId: storeys.find((s) => s.index === 0)?.id ?? storeys[0]?.id ?? null,
    selection: [],
    history: new History(), // Undo-Historie beginnt im geöffneten Projekt frisch
  });
}
