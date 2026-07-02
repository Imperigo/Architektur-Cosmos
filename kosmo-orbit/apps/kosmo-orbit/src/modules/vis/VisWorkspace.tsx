import { useEffect, useRef, useState } from 'react';
import { Messrahmen, Badge, Hairline, KButton, Measure, Panel, moduleHue } from '@kosmo/ui';
import { exportGlb } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';

/**
 * KosmoVis — Render-Jobs an die HomeStation.
 * Modell → GLB → Bridge (/jobs, render-scene/v1) → Job-Store → Scheduler
 * rendert im GPU-Leerlauf → Ergebnis mit Doppel-QA-Verdikt zurück.
 */

interface JobRecord {
  job_id: string;
  status: string;
  created_at: string;
  result?: {
    images: string[];
    qa: {
      style?: { style_score: number; passed: boolean };
      geometry?: { geometry_fidelity: number; passed: boolean };
      verdict: { passed: boolean; reason?: string };
    };
  };
}

function loadBridgeUrl(): string {
  return localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600';
}

export function VisWorkspace() {
  const [bridgeUrl, setBridgeUrl] = useState(loadBridgeUrl);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [health, setHealth] = useState<'unbekannt' | 'ok' | 'offline'>('unbekannt');
  const [faithful, setFaithful] = useState(0.8);
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const base = bridgeUrl.replace(/\/$/, '');

  const refresh = async () => {
    try {
      const list: JobRecord[] = await (await fetch(`${base}/jobs`)).json();
      const detailed = await Promise.all(
        list.slice(0, 8).map(async (j) => {
          try {
            return (await (await fetch(`${base}/jobs/${j.job_id}`)).json()) as JobRecord;
          } catch {
            return j;
          }
        }),
      );
      setJobs(detailed);
      setHealth('ok');
    } catch {
      setHealth('offline');
    }
  };

  useEffect(() => {
    void refresh();
    pollRef.current = setInterval(() => void refresh(), 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeUrl]);

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const { doc } = useProject.getState();
      const glb = exportGlb(doc, doc.settings.projectName);
      const scene = {
        schema: 'kosmovis.render-scene/v1',
        cameras: 'auto',
        render: { resolution: [1600, 1000], samples: 128, faithful },
        style: { mode: 'none', refs: [], prompt },
        vis: { skip: false, backbone: 'qwen', upscale: false },
        out: '',
        geometry: { path: '', format: 'glb' },
      };
      const form = new FormData();
      form.append('scene', JSON.stringify(scene));
      form.append('model', new Blob([glb], { type: 'model/gltf-binary' }), 'model.glb');
      const res = await fetch(`${base}/jobs`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Bridge antwortet mit ${res.status}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: 20 }}>
      <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge hue={moduleHue.vis}>KosmoVis</Badge>
          <span style={{ color: 'var(--k-ink-soft)', fontSize: 13 }}>
            Geometrie-treue Renderings über die HomeStation
          </span>
          <div style={{ flex: 1 }} />
          <Badge hue={health === 'ok' ? 'var(--k-success)' : 'var(--k-danger)'}>
            Bridge {health}
          </Badge>
        </div>

        <Panel style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>
              Bridge-URL{' '}
              <input
                value={bridgeUrl}
                onChange={(e) => {
                  setBridgeUrl(e.target.value);
                  localStorage.setItem('kosmo.bridge', e.target.value);
                }}
                style={{
                  padding: '5px 9px',
                  borderRadius: 6,
                  border: '1px solid var(--k-line-strong)',
                  background: 'var(--k-raised)',
                  width: 240,
                }}
              />
            </label>
            <label style={{ fontSize: 12.5, color: 'var(--k-ink-soft)' }}>
              Geometrie-Treue{' '}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={faithful}
                onChange={(e) => setFaithful(Number(e.target.value))}
              />{' '}
              <Measure>{faithful.toFixed(2)}</Measure>
            </label>
          </div>
          <input
            placeholder="Stil-Prompt (optional), z.B. «Abendstimmung, Sichtbeton, warmes Licht»"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid var(--k-line-strong)',
              background: 'var(--k-raised)',
            }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <KButton tone="accent" onClick={() => void submit()} disabled={sending || health !== 'ok'} data-testid="send-render">
              {sending ? 'Sende …' : 'Render-Job senden'}
            </KButton>
            <span style={{ fontSize: 12, color: 'var(--k-ink-faint)' }}>
              Modell wird als GLB exportiert; gerendert wird im GPU-Leerlauf-Fenster.
            </span>
          </div>
          {error && <div style={{ color: 'var(--k-danger)', fontSize: 12.5 }}>⚠ {error}</div>}
        </Panel>

        {jobs.length === 0 && (
          <Messrahmen
            height={220}
            caption="Noch keine Render-Jobs — das Ergebnis der HomeStation erscheint hier mit QA-Verdikt"
          />
        )}
        {jobs.map((j) => (
          <Panel key={j.job_id} style={{ display: 'grid', gap: 8 }} data-testid="render-job">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Measure>{j.job_id}</Measure>
              <Badge
                hue={
                  j.status === 'done'
                    ? 'var(--k-success)'
                    : j.status === 'error'
                      ? 'var(--k-danger)'
                      : 'var(--k-warning)'
                }
              >
                {j.status}
              </Badge>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
                {new Date(j.created_at).toLocaleTimeString('de-CH')}
              </span>
            </div>
            {j.result && (
              <>
                <Hairline />
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {j.result.images.map((img) => (
                    <img
                      key={img}
                      src={`${base}/jobs/${j.job_id}/artifacts/${img}`}
                      alt={img}
                      style={{
                        width: 280,
                        borderRadius: 8,
                        border: '1px solid var(--k-line)',
                      }}
                    />
                  ))}
                  <div style={{ display: 'grid', gap: 6, alignContent: 'start', fontSize: 12.5 }}>
                    <Badge hue={j.result.qa.verdict.passed ? 'var(--k-success)' : 'var(--k-danger)'}>
                      QA {j.result.qa.verdict.passed ? 'bestanden' : 'verfehlt'}
                    </Badge>
                    {j.result.qa.geometry && (
                      <span>
                        Geometrie-Treue{' '}
                        <Measure>{j.result.qa.geometry.geometry_fidelity.toFixed(2)}</Measure> (≥ 0.65)
                      </span>
                    )}
                    {j.result.qa.style && (
                      <span>
                        Stil <Measure>{j.result.qa.style.style_score.toFixed(2)}</Measure> (≥ 0.30)
                      </span>
                    )}
                    {j.result.qa.verdict.reason && (
                      <span style={{ color: 'var(--k-ink-faint)' }}>{j.result.qa.verdict.reason}</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
