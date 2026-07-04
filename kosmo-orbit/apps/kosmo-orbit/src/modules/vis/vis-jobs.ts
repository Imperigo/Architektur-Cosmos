import { exportGlb, type Sheet } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';

/**
 * Bridge-Jobs für KosmoVis (P2) — ein Weg für Graph und Einfach-Ansicht:
 * Modell als GLB an /jobs (render-scene/v1), Status holen, Bild aufs Blatt.
 */

export interface JobQa {
  style?: { style_score: number; passed: boolean };
  geometry?: { geometry_fidelity: number; passed: boolean };
  verdict: { passed: boolean; reason?: string };
}

export interface JobRecord {
  job_id: string;
  status: string;
  created_at: string;
  result?: { images: string[]; qa: JobQa };
}

export function bridgeBase(): string {
  return (localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600').replace(/\/$/, '');
}

/** Render-Job senden — Szene kommt aus dem Graphen (Prompt, Treue, Samples). */
export async function postRenderJob(params: {
  prompt: string;
  faithful: number;
  samples: number;
}): Promise<JobRecord> {
  const { doc } = useProject.getState();
  const glb = exportGlb(doc, doc.settings.projectName);
  const scene = {
    schema: 'kosmovis.render-scene/v1',
    cameras: 'auto',
    render: { resolution: [1600, 1000], samples: params.samples, faithful: params.faithful },
    style: { mode: 'none', refs: [], prompt: params.prompt },
    vis: { skip: false, backbone: 'qwen', upscale: false },
    out: '',
    geometry: { path: '', format: 'glb' },
  };
  const form = new FormData();
  form.append('scene', JSON.stringify(scene));
  form.append('model', new Blob([glb], { type: 'model/gltf-binary' }), 'model.glb');
  const res = await fetch(`${bridgeBase()}/jobs`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Bridge antwortet mit ${res.status}`);
  return (await res.json()) as JobRecord;
}

export async function holeJob(jobId: string): Promise<JobRecord> {
  const res = await fetch(`${bridgeBase()}/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Job ${jobId}: ${res.status}`);
  return (await res.json()) as JobRecord;
}

export function bildUrl(jobId: string, imageName: string): string {
  return `${bridgeBase()}/jobs/${jobId}/artifacts/${imageName}`;
}

/**
 * Bild als Blatt-Bürger nach KosmoPublish (C1) — leerer Bild-Slot zuerst,
 * sonst neuer Slot; ohne Blatt entsteht eines. Alles EIN Undo-Schritt.
 * Gibt den Blattnamen zurück.
 */
export async function bildAufsBlatt(jobId: string, imageName: string, titel: string): Promise<string> {
  // no-store: die <img>-Tags cachen die Antwort ohne CORS-Header (no-cors) —
  // ein normaler fetch träfe den vergifteten Cache-Eintrag und scheiterte.
  const blob = await (await fetch(bildUrl(jobId, imageName), { cache: 'no-store' })).blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('Bild nicht lesbar'));
    r.readAsDataURL(blob);
  });
  const { doc, runCommand, history } = useProject.getState();
  history.beginGroup();
  try {
    const sheets = doc.byKind<Sheet>('sheet').sort((a, b) => a.index - b.index);
    let sheet = sheets.find((s) => (s.bilder ?? []).some((b) => !b.assetId)) ?? sheets[0];
    if (!sheet) {
      const res = runCommand('publish.blattErstellen', { name: 'Renderblatt', format: 'A1', orientation: 'quer' });
      sheet = doc.get<Sheet>((res.patches[0] as { id: string }).id)!;
    }
    const leer = (sheet.bilder ?? []).find((b) => !b.assetId);
    if (leer) {
      runCommand('publish.bildFuellen', { sheetId: sheet.id, bildId: leer.id, dataUrl });
    } else {
      runCommand('publish.bildPlatzieren', { sheetId: sheet.id, x: 40, y: 40, w: 160, dataUrl, title: titel });
    }
    return sheet.name;
  } finally {
    history.endGroup();
  }
}
