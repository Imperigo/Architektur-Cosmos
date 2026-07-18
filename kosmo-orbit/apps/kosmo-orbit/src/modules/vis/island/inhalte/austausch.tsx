import { useState } from 'react';
import { KButton, melde, meldeFehler } from '@kosmo/ui';
import type { VisGraph } from '@kosmo/kernel';
import { useProject } from '../../../../state/project-store';
import { useVisRuntime } from '../../vis-runtime';
import { sendeGraphRenderAuftrag, bildAufsBlatt, aufnahmeAufsBlatt } from '../../vis-jobs';
import { visInhaltsRegistry } from './registry';
import '../vis-island.css';

/**
 * AUSTAUSCH-Insel (PC1, `docs/V084-SPEZ.md` §5 W2, C-15) — «Render senden»/
 * «Aufs Plakat» als Stufe-2-Popups; «Kamera vorschlagen»/«Report»/«Manuell»
 * sind `hatPopup:false`-Sofort-Aktionen (`vis-island-katalog.ts`) und laufen
 * über `VisWorkspace.tsx`s `onWerkzeugAktion` — kein Registry-Eintrag nötig
 * (Muster design's 'manuell'-Werkzeug, `DesignWorkspace.tsx` Z.2247-2249).
 */

function RenderSendenStufe2() {
  const graphId = useVisRuntime((s) => s.aktiverGraphId);
  const laeufe = useVisRuntime((s) => s.laeufe);
  const renderStimmungPreset = useVisRuntime((s) => s.renderStimmungPreset);
  const revision = useProject((s) => s.revision);
  void revision;
  const doc = useProject.getState().doc;
  const graph = graphId ? doc.get<VisGraph>(graphId) : undefined;
  const renderNodes = graph?.nodes.filter((n) => n.typ === 'render') ?? [];

  if (!graph || renderNodes.length === 0) {
    return (
      <div className="visisl-stufe2" data-testid="island-render-senden-stufe2" onClick={(e) => e.stopPropagation()}>
        <p className="visisl-hinweis">Kein Render-Node im aktiven Graphen — in der GRAPH-Insel einen «Render»-Node einfügen.</p>
      </div>
    );
  }

  return (
    <div className="visisl-stufe2" data-testid="island-render-senden-stufe2" onClick={(e) => e.stopPropagation()}>
      {renderNodes.map((n, i) => {
        const status = laeufe[n.id]?.status;
        return (
          <div key={n.id} className="visisl-render-zeile">
            <span className="visisl-render-titel">Render {i + 1}</span>
            <span className="visisl-hinweis-klein">{status ?? 'bereit'}</span>
            <KButton
              size="sm"
              tone="accent"
              data-testid={`island-render-ausfuehren-${n.id}`}
              onClick={() => sendeGraphRenderAuftrag(graphId!, n.id, renderStimmungPreset ? { preset: renderStimmungPreset } : undefined)}
            >
              Ausführen
            </KButton>
          </div>
        );
      })}
    </div>
  );
}

function AufsPlakatStufe2() {
  const graphId = useVisRuntime((s) => s.aktiverGraphId);
  const laeufe = useVisRuntime((s) => s.laeufe);
  const aufnahmen = useVisRuntime((s) => s.aufnahmen);
  const revision = useProject((s) => s.revision);
  void revision;
  const doc = useProject.getState().doc;
  const graph = graphId ? doc.get<VisGraph>(graphId) : undefined;
  const [sendend, setSendend] = useState<string | null>(null);

  const fertigeRenderNodes = (graph?.nodes ?? []).filter((n) => n.typ === 'render' && laeufe[n.id]?.status === 'fertig');
  const aufnahmeListe = Object.values(aufnahmen);

  const aufsBlatt = async (nodeId: string, jobId: string, bild: string, titel: string) => {
    setSendend(nodeId);
    try {
      const name = await bildAufsBlatt(jobId, bild, titel);
      melde(`Render liegt auf «${name}» — im KosmoPublish weiterschieben`, { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    } finally {
      setSendend(null);
    }
  };

  const aufnahmeAufsBlattKlick = async (id: string, dataUrl: string) => {
    setSendend(id);
    try {
      const name = await aufnahmeAufsBlatt(dataUrl, 'Aufnahme');
      melde(`Aufnahme liegt auf «${name}» — im KosmoPublish weiterschieben`, { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    } finally {
      setSendend(null);
    }
  };

  if (fertigeRenderNodes.length === 0 && aufnahmeListe.length === 0) {
    return (
      <div className="visisl-stufe2" data-testid="island-aufs-plakat-stufe2" onClick={(e) => e.stopPropagation()}>
        <p className="visisl-hinweis">Noch kein fertiger Render/keine Aufnahme — «Render senden» zuerst.</p>
      </div>
    );
  }

  return (
    <div className="visisl-stufe2" data-testid="island-aufs-plakat-stufe2" onClick={(e) => e.stopPropagation()}>
      {fertigeRenderNodes.map((n) => {
        const lauf = laeufe[n.id]!;
        return (
          <div key={n.id} className="visisl-render-zeile">
            <span className="visisl-render-titel">Render (fertig)</span>
            <KButton
              size="sm"
              tone="quiet"
              disabled={sendend === n.id}
              data-testid={`island-aufs-plakat-${n.id}`}
              onClick={() => void aufsBlatt(n.id, lauf.jobId!, lauf.bild!, 'Visualisierung')}
            >
              Aufs Blatt
            </KButton>
          </div>
        );
      })}
      {aufnahmeListe.map((a) => (
        <div key={a.id} className="visisl-render-zeile">
          <span className="visisl-render-titel">Aufnahme</span>
          <KButton
            size="sm"
            tone="quiet"
            disabled={sendend === a.id}
            data-testid={`island-aufs-plakat-aufnahme-${a.id}`}
            onClick={() => void aufnahmeAufsBlattKlick(a.id, a.dataUrl)}
          >
            Aufs Blatt
          </KButton>
        </div>
      ))}
    </div>
  );
}

visInhaltsRegistry.registriere('render-senden', { Stufe2: RenderSendenStufe2, Stufe3: RenderSendenStufe2 });
visInhaltsRegistry.registriere('aufs-plakat', { Stufe2: AufsPlakatStufe2, Stufe3: AufsPlakatStufe2 });
