import { bridgeBase } from '../vis/vis-jobs';

/**
 * Video → Splat (Owner-Korrektur 05.07.: NICHT HomeStation-exklusiv, eine
 * Tempo-Frage, keine Ortssperre). Die Frame-Extraktion läuft lokal im
 * Browser (echt, dieselbe Datei); die eigentliche SfM+Splat-Optimierung
 * ist rechenintensiv und läuft — je nach Anbindung unterschiedlich schnell —
 * lokal (Laptop, langsam), auf der HomeStation (5090, schnell) oder über
 * einen Web-Konverter. Diese Datei liefert den echten In-App-Einstieg:
 * (a) reine Zeitstempel-Berechnung fürs Sampling (testbar ohne DOM),
 * (b) die Browser-Extraktion selbst (braucht <video>/<canvas>, nur E2E),
 * (c) die ehrliche Übergabe an die Bridge (/jobs/video-splat) — kein
 * Fake-Ergebnis, wenn kein SfM-Worker antwortet.
 */

/** Gleichmässig verteilte Sample-Zeitpunkte (Sekunden) über die Videolänge —
 * reine Funktion, unabhängig von <video>/<canvas> und darum unit-testbar. */
export function frameTimestamps(durationS: number, frameCount: number): number[] {
  if (!(durationS > 0) || !(frameCount > 0)) return [];
  const n = Math.floor(frameCount);
  return Array.from({ length: n }, (_, i) => ((i + 0.5) * durationS) / n);
}

export interface ExtrahierteFrames {
  frames: Blob[];
  timestamps: number[];
}

/** Frames lokal aus einer Videodatei ziehen (<video> lädt, <canvas> zeichnet
 * pro Zeitstempel ein JPEG) — läuft komplett im Browser, ohne Bridge/Konto.
 * Nicht unit-testbar (jsdom kennt keine echte Video-Dekodierung) — geprüft
 * über die E2E-Spec, die dieses Modul begleitet. */
export async function extractFramesFromVideo(file: File, maxFrames: number): Promise<ExtrahierteFrames> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Video liess sich nicht lesen'));
    });
    const timestamps = frameTimestamps(video.duration, maxFrames);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas-2D-Kontext nicht verfügbar');
    const frames: Blob[] = [];
    for (const t of timestamps) {
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error('Video-Seek fehlgeschlagen'));
        video.currentTime = t;
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      if (blob) frames.push(blob);
    }
    return { frames, timestamps };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface VideoSplatJobRecord {
  job_id: string;
  status: string;
  frame_count?: number;
  message?: string;
  created_at?: string;
}

/**
 * Ehrliche Übergabe an die Bridge: Frames + Meta als multipart an
 * /jobs/video-splat. Die Bridge legt den Job an (frame_count, status
 * "queued") — eine echte SfM/Splat-Optimierung braucht einen Worker
 * (HomeStation-5090 oder Web-Konverter), den eine reine Fake-Worker-Bridge
 * (Container/CI) NICHT hat; sie meldet das dann ehrlich über den Status
 * zurück, statt ein Splat-Ergebnis vorzutäuschen.
 */
export async function postVideoSplatJob(
  frames: Blob[],
  meta: { quelle: string; fps?: number },
): Promise<VideoSplatJobRecord> {
  const form = new FormData();
  frames.forEach((blob, i) => form.append('frames', blob, `frame-${String(i).padStart(4, '0')}.jpg`));
  form.append('meta', JSON.stringify({ ...meta, frameCount: frames.length }));
  const res = await fetch(`${bridgeBase()}/jobs/video-splat`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Bridge antwortet mit ${res.status}`);
  return (await res.json()) as VideoSplatJobRecord;
}

export async function holeVideoSplatJob(jobId: string): Promise<VideoSplatJobRecord> {
  const res = await fetch(`${bridgeBase()}/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Job ${jobId}: ${res.status}`);
  return (await res.json()) as VideoSplatJobRecord;
}
