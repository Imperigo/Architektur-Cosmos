import { useState } from 'react';
import { Badge, Hairline, KButton, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import type { SplatCloud } from './splat-import';

/**
 * Splat-Werkzeug (Owner-Korrektur 05.07.: Gaussian-Splats sind NICHT
 * HomeStation-exklusiv) — Stufe 1, voll lokal im Browser:
 *  - Zuschneiden (Crop-Box in Metern)
 *  - Ausdünnen fürs flüssige Anzeigen (kein verlustfreier Kompressor)
 *  - Export als .splat (antimatter15) zum Weiterverwenden
 * Stufe 2 (Video → Splat) hängt als eigener Abschnitt darunter — ehrlich
 * nach Tempo beschriftet (lokal/5090/Web-Konverter), keine Ortssperre.
 */

const inputStyle: React.CSSProperties = {
  width: 70,
  padding: '3px 6px',
  borderRadius: 'var(--k-radius-sm)',
  border: '1px solid var(--k-line-strong)',
  background: 'var(--k-raised)',
  fontSize: 12,
  fontFamily: 'var(--k-font-mono)',
};

export function SplatPanel({
  cloud,
  onCloud,
  onClose,
}: {
  cloud: SplatCloud | null;
  onCloud: (cloud: SplatCloud) => void;
  onClose: () => void;
}) {
  const [box, setBox] = useState({
    minX: -10, minY: -10, minZ: -10,
    maxX: 10, maxY: 10, maxZ: 10,
  });
  const [faktor, setFaktor] = useState(2);
  const [videoDatei, setVideoDatei] = useState<File | null>(null);
  const [maxFrames, setMaxFrames] = useState(12);
  const [frameInfo, setFrameInfo] = useState<{ count: number; frames: Blob[] } | null>(null);
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [videoJobId, setVideoJobId] = useState<string | null>(null);

  const zuschneiden = async () => {
    if (!cloud) return;
    try {
      const { cropSplat } = await import('./splat-import');
      const zugeschnitten = cropSplat(cloud, {
        min: [box.minX, box.minY, box.minZ],
        max: [box.maxX, box.maxY, box.maxZ],
      });
      onCloud(zugeschnitten);
      melde(`Zugeschnitten: ${zugeschnitten.count} von ${cloud.count} Punkten behalten.`);
    } catch (err) {
      meldeFehler(`Zuschneiden fehlgeschlagen: ${err instanceof Error ? err.message : err}`);
    }
  };

  const ausduennen = async () => {
    if (!cloud) return;
    try {
      const { decimateSplat } = await import('./splat-import');
      const duenn = decimateSplat(cloud, faktor);
      onCloud(duenn);
      melde(`Ausgedünnt: ${duenn.count} von ${cloud.count} Punkten behalten (jeder ${Math.max(1, Math.round(faktor))}. Punkt).`);
    } catch (err) {
      meldeFehler(`Ausdünnen fehlgeschlagen: ${err instanceof Error ? err.message : err}`);
    }
  };

  const exportieren = async () => {
    if (!cloud) return;
    try {
      const { writeSplatFile } = await import('./splat-import');
      const buffer = writeSplatFile(cloud);
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kosmo-splat.splat';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      meldeFehler(`Export fehlgeschlagen: ${err instanceof Error ? err.message : err}`);
    }
  };

  const framesExtrahieren = async () => {
    if (!videoDatei) return;
    setVideoStatus(null);
    setVideoJobId(null);
    try {
      const { extractFramesFromVideo } = await import('./video-splat');
      const { frames } = await extractFramesFromVideo(videoDatei, maxFrames);
      setFrameInfo({ count: frames.length, frames });
      melde(`${frames.length} Frames lokal extrahiert.`);
    } catch (err) {
      meldeFehler(`Frame-Extraktion fehlgeschlagen: ${err instanceof Error ? err.message : err}`);
    }
  };

  const videoSplatStarten = async () => {
    if (!frameInfo || frameInfo.frames.length === 0 || !videoDatei) return;
    setVideoStatus('Übergabe an die Bridge …');
    try {
      const { postVideoSplatJob } = await import('./video-splat');
      const record = await postVideoSplatJob(frameInfo.frames, { quelle: videoDatei.name });
      setVideoJobId(record.job_id);
      setVideoStatus(`Job ${record.job_id}: ${record.status}`);
    } catch (err) {
      setVideoStatus(
        `Kein Konverter erreichbar — Frames liegen bereit, aber es antwortet aktuell weder eine lokale ` +
          `Bridge noch ein Web-Konverter (${err instanceof Error ? err.message : err}).`,
      );
    }
  };

  return (
    <div
      data-testid="splat-panel"
      className="k-dialog"
      style={{
        position: 'absolute',
        left: 90,
        top: 52,
        zIndex: 20,
        width: 'min(640px, calc(100vw - 122px))',
        maxHeight: 'calc(100% - 90px)',
        overflowY: 'auto',
        background: 'var(--k-raised)',
        border: '1px solid var(--k-technik)',
        boxShadow: 'var(--k-shadow-overlay)',
        padding: 12,
        display: 'grid',
        gap: 10,
        fontSize: 12.5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge hue={moduleHue.design}>Splat</Badge>
        <span style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>
          Zuschneiden · Ausdünnen · Export — voll lokal im Browser
        </span>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          ✕
        </KButton>
      </div>

      <span data-testid="splat-count" style={{ color: 'var(--k-ink-soft)' }}>
        {cloud ? `${cloud.count.toLocaleString('de-CH')} Punkte geladen` : 'Keine Splat-Wolke geladen — «Splat laden» in der Werkzeugleiste.'}
      </span>

      <Hairline />

      <div style={{ display: 'grid', gap: 6 }}>
        <span style={{ color: 'var(--k-ink-soft)', fontSize: 11.5 }}>Zuschneiden (Box, Meter)</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>min X <input type="number" step={0.5} data-testid="splat-crop-minx" value={box.minX} onChange={(e) => setBox({ ...box, minX: Number(e.target.value) || 0 })} style={inputStyle} /></label>
          <label>min Y <input type="number" step={0.5} data-testid="splat-crop-miny" value={box.minY} onChange={(e) => setBox({ ...box, minY: Number(e.target.value) || 0 })} style={inputStyle} /></label>
          <label>min Z <input type="number" step={0.5} data-testid="splat-crop-minz" value={box.minZ} onChange={(e) => setBox({ ...box, minZ: Number(e.target.value) || 0 })} style={inputStyle} /></label>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>max X <input type="number" step={0.5} data-testid="splat-crop-maxx" value={box.maxX} onChange={(e) => setBox({ ...box, maxX: Number(e.target.value) || 0 })} style={inputStyle} /></label>
          <label>max Y <input type="number" step={0.5} data-testid="splat-crop-maxy" value={box.maxY} onChange={(e) => setBox({ ...box, maxY: Number(e.target.value) || 0 })} style={inputStyle} /></label>
          <label>max Z <input type="number" step={0.5} data-testid="splat-crop-maxz" value={box.maxZ} onChange={(e) => setBox({ ...box, maxZ: Number(e.target.value) || 0 })} style={inputStyle} /></label>
          <KButton size="sm" tone="quiet" data-testid="splat-crop" disabled={!cloud} onClick={zuschneiden}>
            Zuschneiden
          </KButton>
        </div>
      </div>

      <Hairline />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--k-ink-soft)', fontSize: 11.5 }}>Ausdünnen (fürs flüssige Anzeigen, keine verlustfreie Kompression):</span>
        <label>
          jeder{' '}
          <input type="number" min={1} max={50} data-testid="splat-decimate-faktor" value={faktor} onChange={(e) => setFaktor(Math.max(1, Number(e.target.value) || 1))} style={{ ...inputStyle, width: 48 }} />{' '}
          . Punkt
        </label>
        <KButton size="sm" tone="quiet" data-testid="splat-decimate" disabled={!cloud} onClick={ausduennen}>
          Ausdünnen
        </KButton>
      </div>

      <Hairline />

      <div>
        <KButton size="sm" tone="accent" data-testid="splat-export" disabled={!cloud} onClick={exportieren}>
          Als .splat exportieren
        </KButton>
      </div>

      <Hairline />

      <div style={{ display: 'grid', gap: 6 }}>
        <span style={{ color: 'var(--k-ink-soft)', fontSize: 11.5 }}>
          Video → Splat — <strong>lokal (langsam)</strong> · <strong>HomeStation-5090 (schnell)</strong> · <strong>Web-Konverter</strong>
          {' '}(Tempo-Frage, keine Ortssperre)
        </span>
        <input
          type="file"
          accept="video/*"
          data-testid="video-splat-input"
          onChange={(e) => {
            setVideoDatei(e.target.files?.[0] ?? null);
            setFrameInfo(null);
            setVideoStatus(null);
          }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            Bilder{' '}
            <input type="number" min={1} max={60} value={maxFrames} onChange={(e) => setMaxFrames(Math.max(1, Number(e.target.value) || 12))} style={{ ...inputStyle, width: 48 }} />
          </label>
          <KButton size="sm" tone="quiet" disabled={!videoDatei} onClick={framesExtrahieren}>
            Frames extrahieren
          </KButton>
          <span data-testid="video-frames-extract" style={{ color: 'var(--k-ink-faint)' }}>
            {frameInfo ? `${frameInfo.count} Frames extrahiert` : 'noch keine Frames'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <KButton
            size="sm"
            tone="quiet"
            data-testid="video-splat-start"
            disabled={!frameInfo || frameInfo.count === 0}
            onClick={videoSplatStarten}
          >
            An Splat-Konverter übergeben
          </KButton>
          {videoJobId && <span style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>Job: {videoJobId}</span>}
        </div>
        <span data-testid="video-splat-status" style={{ color: 'var(--k-ink-faint)', fontSize: 11.5 }}>
          {videoStatus ?? 'Noch nicht gestartet.'}
        </span>
      </div>
    </div>
  );
}
