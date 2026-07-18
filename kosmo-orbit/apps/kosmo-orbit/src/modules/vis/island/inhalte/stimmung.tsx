import { useEffect, useRef } from 'react';
import { KButton, meldeFehler } from '@kosmo/ui';
import { VIS_STIMMUNGEN, type VisGraph } from '@kosmo/kernel';
import { useProject } from '../../../../state/project-store';
import { useVisRuntime } from '../../vis-runtime';
import { dreiStimmungenEinfuegen } from '../../vis-graph-aktionen';
import { visInhaltsRegistry } from './registry';
import '../vis-island.css';

/**
 * STIMMUNG-Insel (PC1, `docs/V084-SPEZ.md` §5 W2, C-17, E5) — 3 PROZEDURALE
 * Bild-Kacheln statt Text (Owner-Auftrag: «Stimmungen als HDRIs MIT Bild
 * statt Text») — KEIN `.hdr`-Download, 0 Assets, deterministisch (E5): jede
 * Kachel zeichnet einen kleinen Canvas-Gradient, der die Stimmung ANDEUTET
 * (Morgen: kühles Blau→warmes Gelb tief unten wie ein Sonnenaufgang; Abend:
 * warmes Orange→dunkles Violett; Weiss: neutrales Studio-Grau) — reine
 * `CanvasRenderingContext2D`-Gradients, keine Three.js-Szene (das wäre für
 * eine 64×40px-Vorschau-Kachel unverhältnismässig; E5 verlangt nur «0
 * Assets, deterministisch», nicht zwingend WebGL).
 *
 * Auswahl (Owner-Wortlaut «Auswahl setzt vis.nodeParametrieren + render.
 * environment.preset in den Job»):
 * 1. `renderStimmungPreset` im Runtime-Store (fliesst in JEDEN nächsten
 *    Render-Job, `vis-jobs.ts`/`VisWorkspace.tsx`).
 * 2. Existiert im aktiven Graphen GENAU EIN `stimmung`-Node, wird er über
 *    den bestehenden `vis.nodeParametrieren`-Command real umparametriert
 *    (Undo-fähig). Bei 0 oder ≥2 Stimmungs-Nodes bleibt das ehrlich aus —
 *    welcher von mehreren gemeint wäre, ist ohne eine Node-Auswahl im Canvas
 *    nicht eindeutig entscheidbar (dokumentierte Grenze, s. Abschlussbericht).
 */

const PRESETS = ['morgen', 'abend', 'weiss'] as const;
type Preset = (typeof PRESETS)[number];

/** Zeichnet die Vorschau EINMAL beim Mount (deterministisch, kein Redraw-Takt). */
function zeichneVorschau(ctx: CanvasRenderingContext2D, preset: Preset, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  let grad: CanvasGradient;
  switch (preset) {
    case 'morgen':
      grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#5c7fa8');
      grad.addColorStop(0.55, '#e8b978');
      grad.addColorStop(1, '#f6dfae');
      break;
    case 'abend':
      grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#2a2440');
      grad.addColorStop(0.5, '#a2543f');
      grad.addColorStop(1, '#e0a15c');
      break;
    case 'weiss':
      grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#e9e9e9');
      grad.addColorStop(1, '#c7c7c7');
      break;
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Horizont-Andeutung (ein Bogen) — macht aus dem reinen Verlauf eine
  // «Szene», ohne echte Geometrie zu behaupten.
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.72);
  ctx.quadraticCurveTo(w / 2, h * 0.66, w, h * 0.72);
  ctx.stroke();
}

function StimmungKachel({ preset, aktiv, onWahl }: { preset: Preset; aktiv: boolean; onWahl: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    zeichneVorschau(ctx, preset, el.width, el.height);
  }, [preset]);
  return (
    <button
      type="button"
      className={`visisl-stimmung-kachel${aktiv ? ' visisl-stimmung-kachel--aktiv' : ''}`}
      data-testid={`island-stimmung-${preset}`}
      aria-pressed={aktiv}
      onClick={onWahl}
    >
      <canvas ref={ref} width={72} height={44} className="visisl-stimmung-canvas" aria-hidden="true" />
      <span className="visisl-stimmung-label">{VIS_STIMMUNGEN[preset]?.label ?? preset}</span>
    </button>
  );
}

function StimmungStufe2() {
  const graphId = useVisRuntime((s) => s.aktiverGraphId);
  const renderStimmungPreset = useVisRuntime((s) => s.renderStimmungPreset);
  const setRenderStimmungPreset = useVisRuntime((s) => s.setRenderStimmungPreset);
  const revision = useProject((s) => s.revision);
  void revision;
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;

  const waehle = (preset: Preset) => {
    setRenderStimmungPreset(preset);
    if (!graphId) return;
    const graph = doc.get<VisGraph>(graphId);
    const stimmungNodes = graph?.nodes.filter((n) => n.typ === 'stimmung') ?? [];
    // Ehrliche Grenze (s. Kopfkommentar): nur bei GENAU EINEM Stimmungs-Node
    // wird real umparametriert — sonst bliebe die Wahl mehrdeutig.
    if (stimmungNodes.length === 1) {
      try {
        runCommand('vis.nodeParametrieren', { graphId, nodeId: stimmungNodes[0]!.id, params: { preset } });
      } catch (err) {
        meldeFehler(err);
      }
    }
  };

  return (
    <div className="visisl-stufe2" data-testid="island-stimmung-stufe2" onClick={(e) => e.stopPropagation()}>
      <div className="visisl-stimmung-reihe">
        {PRESETS.map((p) => (
          <StimmungKachel key={p} preset={p} aktiv={renderStimmungPreset === p} onWahl={() => waehle(p)} />
        ))}
      </div>
      <p className="visisl-hinweis-klein">
        Wahl gilt für den nächsten Render-Job (`render.environment.preset`) — bei genau einem Stimmungs-Node im Graphen wird er
        zusätzlich real umparametriert.
      </p>
      <KButton size="sm" tone="quiet" data-testid="island-drei-stimmungen" onClick={() => dreiStimmungenEinfuegen(graphId ?? undefined)}>
        + Drei-Stimmungen-Kette einfügen
      </KButton>
    </div>
  );
}

visInhaltsRegistry.registriere('stimmung', { Stufe2: StimmungStufe2, Stufe3: StimmungStufe2 });
