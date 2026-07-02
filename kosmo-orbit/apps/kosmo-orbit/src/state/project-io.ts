import { strToU8, strFromU8, zipSync, unzipSync } from 'fflate';
import { KosmoDoc, type JournalEntry } from '@kosmo/kernel';
import { useProject } from './project-store';

/**
 * .kosmo-Projektpaket (Zip) — das universelle Austauschformat.
 * Inhalt nach kosmo.project/v1-Manifest: model/model.json, memory/journal.jsonl.
 * Kompatibel gedacht zur kosmo.project.json-Kultur der HomeStation-Lanes.
 */

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
  const files = unzipSync(bytes);
  const modelRaw = files['model/model.json'];
  if (!modelRaw) throw new Error('Kein model/model.json im Paket');
  const doc = KosmoDoc.fromJSON(JSON.parse(strFromU8(modelRaw)));
  const journalRaw = files['memory/journal.jsonl'];
  const journal: JournalEntry[] = journalRaw
    ? strFromU8(journalRaw)
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as JournalEntry)
    : [];
  const storeys = doc.storeysOrdered();
  const { History } = await import('@kosmo/kernel');
  useProject.setState({
    doc,
    journal,
    revision: doc.revision + 1,
    activeStoreyId: storeys.find((s) => s.index === 0)?.id ?? storeys[0]?.id ?? null,
    selection: [],
    history: new History(), // Undo-Historie beginnt im geöffneten Projekt frisch
  });
}
