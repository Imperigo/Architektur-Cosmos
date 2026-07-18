import { KButton, KIcon } from '@kosmo/ui';
import { VIS_NODE_KATALOG, VIS_KATEGORIE_HUE, type VisGraph, type VisKategorie } from '@kosmo/kernel';
import { useProject } from '../../../../state/project-store';
import { useVisRuntime } from '../../vis-runtime';
import { nodeHinzufuegen, neuerGraphErstellen } from '../../vis-graph-aktionen';
import { visInhaltsRegistry } from './registry';
import '../vis-island.css';

/**
 * GRAPH-Insel (PC1, `docs/V084-SPEZ.md` §5 W2, C-15) — Stufe-2-Inhalte für
 * Node-Palette/Ausrichten/Verbinden. Reine Registry-Komponenten (kein Prop-
 * Pfad, Muster `design/island/inhalte/*.tsx`): sie lesen `vis-runtime.ts`
 * (`aktiverGraphId`/`canvasAuswahlGroesse`) + `useProject` direkt.
 *
 * **Node-Palette** übernimmt EXAKT die bisherige `visPalette`-Dock-Panel-
 * Kategorienliste (`NodeCanvas.tsx`s `visDockPanels`) — dieselbe
 * Kategorien-Reihenfolge/-Farbe/-Icons, nur der Klick geht jetzt über die
 * geteilte `nodeHinzufuegen()`-Funktion (`vis-graph-aktionen.ts`, dieselbe
 * Spiral-Platzsuche wie `VisWorkspace.tsx`s bisheriges `nodeHinzu`).
 */

const KATEGORIE_REIHENFOLGE: readonly VisKategorie[] = ['quelle', 'wandler', 'render', 'ausgabe'];
const KATEGORIE_LABEL: Record<VisKategorie, string> = {
  quelle: 'Quelle',
  wandler: 'Wandler',
  render: 'Render',
  ausgabe: 'Ausgabe',
};

function NodePaletteStufe2() {
  const graphId = useVisRuntime((s) => s.aktiverGraphId);
  const revision = useProject((s) => s.revision);
  void revision;
  const graphen = useProject.getState().doc.byKind<VisGraph>('visgraph');

  if (!graphId || !graphen.some((g) => g.id === graphId)) {
    return (
      <div className="visisl-stufe2" data-testid="island-palette-stufe2" onClick={(e) => e.stopPropagation()}>
        <p className="visisl-hinweis">Noch kein Render-Graph.</p>
        <KButton size="sm" tone="quiet" data-testid="visisl-graph-erstellen" onClick={() => neuerGraphErstellen()}>
          + Graph erstellen
        </KButton>
      </div>
    );
  }

  return (
    <div className="visisl-stufe2 visisl-palette" data-testid="island-palette-stufe2" onClick={(e) => e.stopPropagation()}>
      {KATEGORIE_REIHENFOLGE.map((kat) => {
        const eintraege = Object.values(VIS_NODE_KATALOG).filter((t) => t.kategorie === kat);
        if (eintraege.length === 0) return null;
        return (
          <div key={kat}>
            <div className="visisl-palette-kat-kopf">
              <span aria-hidden className="visisl-palette-kat-strich" style={{ ['--_farbe' as string]: VIS_KATEGORIE_HUE[kat] }} />
              <span className="visisl-palette-kat-label">{KATEGORIE_LABEL[kat]}</span>
            </div>
            <div className="visisl-palette-kat-liste">
              {eintraege.map((t) => (
                <button
                  key={t.typ}
                  type="button"
                  className="k-druck visisl-palette-eintrag"
                  data-testid={`island-palette-eintrag-${t.typ}`}
                  title={t.hilfe}
                  onClick={() => nodeHinzufuegen(graphId, t.typ)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AusrichtenStufe2() {
  const auswahlGroesse = useVisRuntime((s) => s.canvasAuswahlGroesse);
  const sendeCanvasBefehl = useVisRuntime((s) => s.sendeCanvasBefehl);
  return (
    <div className="visisl-stufe2" data-testid="island-ausrichten-stufe2" onClick={(e) => e.stopPropagation()}>
      {auswahlGroesse < 2 ? (
        <p className="visisl-hinweis">Mindestens 2 Nodes auswählen (Shift-Klick oder Marquee auf dem Canvas).</p>
      ) : (
        <div className="visisl-reihe">
          <KButton size="sm" tone="ghost" data-testid="island-ausrichten-links" onClick={() => sendeCanvasBefehl('ausrichten-x')}>
            Links
          </KButton>
          <KButton size="sm" tone="ghost" data-testid="island-ausrichten-oben" onClick={() => sendeCanvasBefehl('ausrichten-y')}>
            Oben
          </KButton>
          <KButton size="sm" tone="ghost" data-testid="island-vertikal-verteilen" onClick={() => sendeCanvasBefehl('vertikal-verteilen')}>
            Verteilen
          </KButton>
        </div>
      )}
    </div>
  );
}

function VerbindenStufe2() {
  return (
    <div className="visisl-stufe2" data-testid="island-verbinden-stufe2" onClick={(e) => e.stopPropagation()}>
      <p className="visisl-hinweis">
        Von einem Ausgangs-Port (rechts an einem Node) auf einen passenden Eingangs-Port (links, gleiche Farbe)
        ziehen — eine bestehende Verbindung am Ziel wird ersetzt.
      </p>
      <div className="visisl-reihe">
        <KIcon name="pfeil-rechts" size={14} />
        <span className="visisl-hinweis-klein">Ziehen verbindet — kein separater Modus nötig.</span>
      </div>
    </div>
  );
}

visInhaltsRegistry.registriere('palette', { Stufe2: NodePaletteStufe2, Stufe3: NodePaletteStufe2 });
visInhaltsRegistry.registriere('ausrichten', { Stufe2: AusrichtenStufe2, Stufe3: AusrichtenStufe2 });
visInhaltsRegistry.registriere('verbinden', { Stufe2: VerbindenStufe2, Stufe3: VerbindenStufe2 });
