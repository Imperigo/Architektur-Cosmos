import { useEffect, useRef, useState } from 'react';
import { Messrahmen, Badge, Hairline, Karteikarte, KButton, Measure, Panel, meldeFehler, moduleHue } from '@kosmo/ui';
import { finalerRenderPrompt, renderPromptBausteine, exportGlb, VIS_NODE_KATALOG, type Sheet, type VisGraph } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';
import { NodeCanvas } from './NodeCanvas';
import { bridgeToken } from './vis-jobs';
import { BridgeBild } from './BridgeBild';

/**
 * HS3: jeder Bridge-Fetch trägt den Token (falls gesetzt) — sonst sperrt eine
 * token-geschützte Bridge die eigene App aus (HS1-Befund). Leerer Token →
 * kein Header → byte-gleiches Verhalten wie bisher.
 */
function authKopf(): HeadersInit {
  const t = bridgeToken();
  return t ? { 'X-Kosmo-Token': t } : {};
}

/**
 * KosmoVis — Render-Jobs an die HomeStation (Toolkit 2 der Vision).
 * Modell → GLB → Bridge (/jobs, render-scene/v1) → Job-Store → Scheduler
 * rendert im GPU-Leerlauf → Ergebnis mit Doppel-QA-Verdikt zurück.
 * Varianten-Serien (drei Stimmungen auf einen Klick) für die visuelle
 * Prüfung nebeneinander; Serien überleben den Neustart (localStorage).
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

interface Serie {
  id: string;
  ts: string;
  /** job_id → Stimmungs-Label */
  jobs: Record<string, string>;
}

const STIMMUNGEN = [
  { label: 'Morgenlicht', prompt: 'Morgenlicht, klare lange Schatten, frische kühle Luft' },
  { label: 'Abendstimmung', prompt: 'Abendstimmung, warmes Licht, leuchtende Fenster' },
  { label: 'Weissmodell', prompt: 'Weissmodell, neutrales Studiolicht, keine Materialien' },
] as const;

function loadBridgeUrl(): string {
  return localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600';
}

function loadSerien(): Serie[] {
  try {
    return JSON.parse(localStorage.getItem('kosmo.vis.serien') ?? '[]') as Serie[];
  } catch {
    return [];
  }
}

function saveSerien(s: Serie[]): void {
  localStorage.setItem('kosmo.vis.serien', JSON.stringify(s.slice(-12)));
}

/**
 * KosmoVis-Station: der Node-Tree ist die Hauptansicht (Vertiefungsarbeit),
 * die bisherige lineare Ansicht bleibt als «Einfach»-Tab — kein Funktionsverlust.
 */
export interface VisWorkspaceProps {
  /** Serie K / A4: öffnet das zentrale Einstellungs-Panel, vorgefiltert auf
   *  KosmoVis. Optional — nur `App.tsx` kennt diesen Weg. */
  onEinstellungen?: () => void;
}

export function VisWorkspace({ onEinstellungen }: VisWorkspaceProps = {}) {
  const [tab, setTab] = useState<'graph' | 'einfach'>('graph');
  const revision = useProject((s) => s.revision);
  void revision;
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  const graphen = doc.byKind<VisGraph>('visgraph');
  const [aktiverGraph, setAktiverGraph] = useState<string>('');
  const graphId = graphen.some((g) => g.id === aktiverGraph) ? aktiverGraph : (graphen[0]?.id ?? '');

  const neuerGraph = () => {
    try {
      const res = runCommand('vis.graphErstellen', { name: `Graph ${graphen.length + 1}` });
      setAktiverGraph((res.patches[0] as { id: string }).id);
    } catch (err) {
      meldeFehler(err);
    }
  };

  /** «Drei Stimmungen» — die heutige Serie als fertiger Teilgraph, EIN Undo-Schritt. */
  const dreiStimmungen = () => {
    const { history } = useProject.getState();
    try {
      history.beginGroup();
      try {
        let gid = graphId;
        if (!gid) {
          const res = runCommand('vis.graphErstellen', { name: 'Drei Stimmungen' });
          gid = (res.patches[0] as { id: string }).id;
          setAktiverGraph(gid);
        }
        const setze = (typ: string, x: number, y: number, params?: Record<string, string | number | boolean>) => {
          runCommand('vis.nodeSetzen', { graphId: gid, typ, x, y, ...(params ? { params } : {}) });
          const g = doc.get<VisGraph>(gid)!;
          return g.nodes[g.nodes.length - 1]!.id;
        };
        const verbinde = (from: string, fromPort: string, to: string, toPort: string) =>
          runCommand('vis.verbinden', { graphId: gid, from, fromPort, to, toPort });
        const modell = setze('modell', 40, 260);
        const material = setze('material', 40, 420);
        const vergleich = setze('vergleich', 1120, 300);
        (['morgen', 'abend', 'weiss'] as const).forEach((preset, i) => {
          const y = 40 + i * 230;
          const stimmung = setze('stimmung', 320, y, { preset });
          const komb = setze('kombinierer', 580, y);
          const render = setze('render', 840, y);
          verbinde(stimmung, 'prompt', komb, 'stimmung');
          verbinde(material, 'material', komb, 'material');
          verbinde(modell, 'szene', render, 'szene');
          verbinde(komb, 'prompt', render, 'prompt');
          verbinde(render, 'bild', vergleich, `bild${i + 1}`);
        });
      } finally {
        history.endGroup();
      }
    } catch (err) {
      meldeFehler(err);
    }
  };

  /**
   * «Kamera vorschlagen» (Owner-Befund K20/A10) — erzeugt/aktualisiert einen
   * Auto-Kamera-Node und verbindet ihn mit jedem Render-Node ohne bestehende
   * Kamera-Verbindung. Die Standpunkte selbst sind eine reine Ableitung aus
   * den Modell-Bounds (derive/kamera.ts) — dieser Klick legt nur den
   * bestehenden Mechanismus (Node + Verbindung) an, EIN Undo-Schritt.
   */
  const kameraVorschlagen = () => {
    const { history } = useProject.getState();
    try {
      history.beginGroup();
      try {
        let gid = graphId;
        if (!gid) {
          const res = runCommand('vis.graphErstellen', { name: 'Kamera-Vorschlag' });
          gid = (res.patches[0] as { id: string }).id;
          setAktiverGraph(gid);
        }
        let graph = doc.get<VisGraph>(gid)!;
        let kameraNode = graph.nodes.find((n) => n.typ === 'kamera');
        if (!kameraNode) {
          runCommand('vis.nodeSetzen', { graphId: gid, typ: 'kamera', x: 40, y: 40 });
          graph = doc.get<VisGraph>(gid)!;
          kameraNode = graph.nodes[graph.nodes.length - 1]!;
        }
        const renderOhneKamera = graph.nodes.filter(
          (n) => n.typ === 'render' && !graph.edges.some((e) => e.to === n.id && e.toPort === 'kameras'),
        );
        for (const render of renderOhneKamera) {
          runCommand('vis.verbinden', {
            graphId: gid,
            from: kameraNode.id,
            fromPort: 'kameras',
            to: render.id,
            toPort: 'kameras',
          });
        }
      } finally {
        history.endGroup();
      }
    } catch (err) {
      meldeFehler(err);
    }
  };

  const nodeHinzu = (typ: string) => {
    if (!graphId) return;
    try {
      const anzahl = doc.get<VisGraph>(graphId)?.nodes.length ?? 0;
      // Raster-Platzierung ohne Überlappung — schieben kann man immer noch
      runCommand('vis.nodeSetzen', { graphId, typ, x: 100 + (anzahl % 4) * 250, y: 60 + Math.floor(anzahl / 4) * 280 });
    } catch (err) {
      meldeFehler(err);
    }
  };

  if (tab === 'einfach') {
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <VisTabs tab={tab} setTab={setTab} />
        <div style={{ position: 'absolute', inset: 0, top: 44 }}>
          <EinfachAnsicht />
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <VisTabs tab={tab} setTab={setTab} {...(onEinstellungen ? { onEinstellungen } : {})}>
        <select
          value={graphId}
          data-testid="graph-select"
          onChange={(e) => setAktiverGraph(e.target.value)}
          style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)', fontSize: 12 }}
        >
          {graphen.length === 0 && <option value="">— kein Graph —</option>}
          {graphen.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <KButton size="sm" tone="quiet" data-testid="graph-neu" onClick={neuerGraph}>
          + Graph
        </KButton>
        <select
          value=""
          data-testid="node-hinzu"
          disabled={!graphId}
          onChange={(e) => e.target.value && nodeHinzu(e.target.value)}
          style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)', fontSize: 12 }}
        >
          <option value="">+ Node …</option>
          {Object.values(VIS_NODE_KATALOG).map((t) => (
            <option key={t.typ} value={t.typ}>{t.label}</option>
          ))}
        </select>
        <KButton size="sm" tone="accent" data-testid="drei-stimmungen" onClick={dreiStimmungen}>
          Drei Stimmungen
        </KButton>
        <Hairline vertical />
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.03em', color: 'var(--k-ink-faint)' }}>
          AUTO
        </span>
        <KButton size="sm" tone="quiet" data-testid="vis-auto-kamera" onClick={kameraVorschlagen}>
          Kamera vorschlagen
        </KButton>
      </VisTabs>
      <div style={{ position: 'absolute', inset: 0, top: 44 }}>
        {graphId ? (
          <NodeCanvas key={graphId} graphId={graphId} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Messrahmen
              height={200}
              caption="Noch kein Render-Graph — «+ Graph» beginnt leer, «Drei Stimmungen» setzt den fertigen Teilgraph"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function VisTabs({
  tab,
  setTab,
  children,
  onEinstellungen,
}: {
  tab: 'graph' | 'einfach';
  setTab: (t: 'graph' | 'einfach') => void;
  children?: React.ReactNode;
  onEinstellungen?: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 14px',
        borderBottom: '1px solid var(--k-line)',
        background: 'var(--k-surface)',
        zIndex: 4,
      }}
    >
      <Badge hue={moduleHue.vis}>KosmoVis</Badge>
      <KButton size="sm" tone={tab === 'graph' ? 'accent' : 'ghost'} data-testid="tab-graph" onClick={() => setTab('graph')}>
        Node-Tree
      </KButton>
      <KButton size="sm" tone={tab === 'einfach' ? 'accent' : 'ghost'} data-testid="tab-einfach" onClick={() => setTab('einfach')}>
        Einfach
      </KButton>
      <Hairline vertical />
      {children}
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
        Render nur auf «Ausführen» — der Graph ist Teil des Projekts (Undo, Sync)
      </span>
      {onEinstellungen && (
        <KButton
          size="sm"
          tone="ghost"
          data-testid="station-einstellungen-vis"
          title="Einstellungen — KosmoVis"
          aria-label="Einstellungen — KosmoVis"
          onClick={onEinstellungen}
        >
          ⚙
        </KButton>
      )}
    </div>
  );
}

function EinfachAnsicht() {
  const [bridgeUrl, setBridgeUrl] = useState(loadBridgeUrl);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [serien, setSerien] = useState<Serie[]>(loadSerien);
  const [health, setHealth] = useState<'unbekannt' | 'ok' | 'offline'>('unbekannt');
  const [faithful, setFaithful] = useState(0.8);
  const [prompt, setPrompt] = useState('');
  // V8: Transparenz statt Blackbox — finaler Prompt sichtbar, überschreibbar
  const [promptOverride, setPromptOverride] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const base = bridgeUrl.replace(/\/$/, '');

  const refresh = async () => {
    try {
      const list: JobRecord[] = await (await fetch(`${base}/jobs`, { headers: authKopf() })).json();
      const detailed = await Promise.all(
        list.slice(0, 16).map(async (j) => {
          try {
            return (await (await fetch(`${base}/jobs/${j.job_id}`, { headers: authKopf() })).json()) as JobRecord;
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

  /**
   * Render aufs Plakat (C1): Bild von der Bridge holen und als Blatt-Bürger
   * einbetten. Ein leerer Bild-Slot (Plakat-Designer) wird zuerst gefüllt;
   * sonst neuer Slot; ohne Blatt entsteht eines — alles EIN Undo-Schritt.
   */
  const aufsBlatt = async (jobId: string, imageName: string, titel: string) => {
    setError(null);
    try {
      // no-store: die <img>-Tags cachen die Antwort ohne CORS-Header (no-cors) —
      // ein normaler fetch träfe den vergifteten Cache-Eintrag und scheiterte.
      const blob = await (await fetch(`${base}/jobs/${jobId}/artifacts/${imageName}`, { cache: 'no-store', headers: authKopf() })).blob();
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
        setHinweis(`Render liegt auf «${sheet.name}» — im KosmoPublish weiterschieben`);
      } finally {
        history.endGroup();
      }
    } catch (e) {
      setError(`Aufs Blatt fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const postJob = async (stylePrompt: string): Promise<JobRecord> => {
    const { doc } = useProject.getState();
    const glb = exportGlb(doc, doc.settings.projectName);
    const scene = {
      schema: 'kosmovis.render-scene/v1',
      cameras: 'auto',
      render: { resolution: [1600, 1000], samples: 128, faithful },
      style: { mode: 'none', refs: [], prompt: promptOverride ?? finalerRenderPrompt('', stylePrompt, renderPromptBausteine(doc)) },
      vis: { skip: false, backbone: 'qwen', upscale: false },
      out: '',
      geometry: { path: '', format: 'glb' },
    };
    const form = new FormData();
    form.append('scene', JSON.stringify(scene));
    form.append('model', new Blob([glb], { type: 'model/gltf-binary' }), 'model.glb');
    const res = await fetch(`${base}/jobs`, { method: 'POST', body: form, headers: authKopf() });
    if (!res.ok) throw new Error(`Bridge antwortet mit ${res.status}`);
    return (await res.json()) as JobRecord;
  };

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      await postJob(prompt);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  /** Drei Stimmungen auf einen Klick — für die visuelle Prüfung nebeneinander. */
  const submitSerie = async () => {
    setSending(true);
    setError(null);
    try {
      const eintraege: Record<string, string> = {};
      for (const s of STIMMUNGEN) {
        const job = await postJob(prompt ? `${s.prompt} — ${prompt}` : s.prompt);
        eintraege[job.job_id] = s.label;
      }
      const serie: Serie = {
        id: Object.keys(eintraege)[0]!,
        ts: new Date().toISOString(),
        jobs: eintraege,
      };
      const next = [...serien, serie];
      setSerien(next);
      saveSerien(next);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const jobById = new Map(jobs.map((j) => [j.job_id, j]));
  const inSerie = new Set(serien.flatMap((s) => Object.keys(s.jobs)));
  const einzelJobs = jobs.filter((j) => !inSerie.has(j.job_id));

  const inputStyle: React.CSSProperties = {
    padding: '5px 9px',
    borderRadius: 'var(--k-radius-sm)',
    border: '1px solid var(--k-line-strong)',
    background: 'var(--k-raised)',
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: 20 }}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 16 }}>
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
                style={{ ...inputStyle, width: 240 }}
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
            onChange={(e) => {
              setPrompt(e.target.value);
              setPromptOverride(null);
            }}
            style={{ ...inputStyle, padding: '7px 10px' }}
          />
          {/* V8: finaler Prompt — Modell-Materialien sprechen mit, alles überschreibbar */}
          <textarea
            data-testid="finaler-prompt"
            value={promptOverride ?? finalerRenderPrompt('', prompt, renderPromptBausteine(useProject.getState().doc))}
            onChange={(e) => setPromptOverride(e.target.value)}
            rows={2}
            style={{ ...inputStyle, padding: '7px 10px', fontFamily: 'inherit', fontSize: 12, color: 'var(--k-ink-soft)' }}
          />
          <span style={{ fontSize: 11, color: 'var(--k-ink-faint)' }}>
            Finaler Prompt (geht so an die Bridge) — Material-Bausteine kommen aus den Wandaufbauten; Tippen überschreibt.
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <KButton tone="accent" onClick={() => void submit()} disabled={sending || health !== 'ok'} data-testid="send-render">
              {sending ? 'Sende …' : 'Render-Job senden'}
            </KButton>
            <KButton tone="quiet" onClick={() => void submitSerie()} disabled={sending || health !== 'ok'} data-testid="send-serie">
              3 Varianten (Morgen · Abend · Weissmodell)
            </KButton>
            <span style={{ fontSize: 12, color: 'var(--k-ink-faint)' }}>
              Modell wird als GLB exportiert; gerendert wird im GPU-Leerlauf-Fenster.
            </span>
          </div>
          {error && <div style={{ color: 'var(--k-danger)', fontSize: 12.5 }}>⚠ {error}</div>}
          {hinweis && <div style={{ color: 'var(--k-success)', fontSize: 12.5 }} data-testid="vis-hinweis">✓ {hinweis}</div>}
        </Panel>

        {/* Varianten-Serien: Stimmungen nebeneinander, QA je Karte */}
        {[...serien].reverse().map((s) => (
          <div key={s.id} style={{ display: 'grid', gap: 8 }} data-testid="varianten-serie">
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span className="k-titel" style={{ fontSize: 13 }}>Varianten-Serie</span>
              <span style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>
                {new Date(s.ts).toLocaleString('de-CH')}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
              {Object.entries(s.jobs).map(([jobId, label], i) => {
                const j = jobById.get(jobId);
                return (
                  <Karteikarte key={jobId} nr={i + 1}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--k-font-mono)', fontWeight: 700, fontSize: 12.5 }}>{label}</span>
                        <div style={{ flex: 1 }} />
                        {j?.result ? (
                          <Badge hue={j.result.qa.verdict.passed ? 'var(--k-success)' : 'var(--k-danger)'}>
                            QA {j.result.qa.verdict.passed ? 'ok' : 'verfehlt'}
                          </Badge>
                        ) : (
                          <Badge hue="var(--k-warning)">{j?.status ?? 'offen'}</Badge>
                        )}
                      </div>
                      {j?.result ? (
                        <>
                          <BridgeBild
                            jobId={jobId}
                            imageName={j.result.images[0]!}
                            alt={label}
                            style={{ width: '100%', border: '1px solid var(--k-line)' }}
                          />
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 11.5, color: 'var(--k-ink-soft)' }}>
                            {j.result.qa.geometry && (
                              <span>Geometrie <Measure>{j.result.qa.geometry.geometry_fidelity.toFixed(2)}</Measure></span>
                            )}
                            {j.result.qa.style && (
                              <span>Stil <Measure>{j.result.qa.style.style_score.toFixed(2)}</Measure></span>
                            )}
                            <div style={{ flex: 1 }} />
                            <KButton
                              size="sm"
                              tone="quiet"
                              data-testid="aufs-blatt"
                              onClick={() => void aufsBlatt(jobId, j.result!.images[0]!, label)}
                            >
                              Aufs Blatt
                            </KButton>
                          </div>
                        </>
                      ) : (
                        <Messrahmen height={120} caption={j ? `Rendert … (${j.status})` : 'Job nicht (mehr) im Store'} />
                      )}
                    </div>
                  </Karteikarte>
                );
              })}
            </div>
          </div>
        ))}

        {/* Einzeljobs / Historie */}
        {einzelJobs.length === 0 && serien.length === 0 && (
          <Messrahmen
            height={220}
            caption="Noch keine Render-Jobs — das Ergebnis der HomeStation erscheint hier mit QA-Verdikt"
          />
        )}
        {einzelJobs.map((j) => (
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
                    <BridgeBild
                      key={img}
                      jobId={j.job_id}
                      imageName={img}
                      alt={img}
                      style={{
                        width: 280,
                        border: '1px solid var(--k-line)',
                      }}
                    />
                  ))}
                  <div style={{ display: 'grid', gap: 6, alignContent: 'start', fontSize: 12.5 }}>
                    <Badge hue={j.result.qa.verdict.passed ? 'var(--k-success)' : 'var(--k-danger)'}>
                      QA {j.result.qa.verdict.passed ? 'bestanden' : 'verfehlt'}
                    </Badge>
                    <KButton
                      size="sm"
                      tone="quiet"
                      onClick={() => void aufsBlatt(j.job_id, j.result!.images[0]!, 'Visualisierung')}
                    >
                      Aufs Blatt
                    </KButton>
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
