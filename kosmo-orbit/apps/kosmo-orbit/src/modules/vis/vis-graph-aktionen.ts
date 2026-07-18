import { meldeFehler } from '@kosmo/ui';
import type { VisGraph } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';
import { basisNodeHoehe, NODE_W } from './NodeCanvas';
import { useVisRuntime } from './vis-runtime';

/**
 * PC1 (`docs/V084-SPEZ.md` §5 W2, C-15) — Extraktion der vier Graph-Aktionen,
 * die bisher als React-Closures in `VisWorkspace.tsx` lebten (`neuerGraph`/
 * `dreiStimmungen`/`kameraVorschlagen`/`nodeHinzu`). Verhalten UNVERÄNDERT
 * (dieselbe Spiral-Platzsuche/Undo-Gruppierung/Koordinaten-Rechnung) — nur
 * ortsneutral gemacht: `VisWorkspace.tsx`s Manuell-Chrome (Bestandsschutz)
 * UND die neuen GRAPH-/STIMMUNG-/AUSTAUSCH-Insel-Inhalte (`island/inhalte/
 * *.tsx`) rufen jetzt dieselben Funktionen, statt die Logik zweimal zu
 * schreiben (Owner-Auftrag «Bestehende Panels/Funktionen wiederverwenden,
 * nichts nachbauen»). Jede Funktion nutzt `useProject.getState()`/
 * `useVisRuntime.getState()` direkt (kein Hook) — aufrufbar aus JEDER
 * Komponente, auch den Registry-Inhalten, die selbst keine Props bekommen.
 */

/** Legt einen neuen, leeren Render-Graphen an und macht ihn zum aktiven —
 *  identisch zum bisherigen `VisWorkspace.tsx`s `neuerGraph()`. */
export function neuerGraphErstellen(): string | undefined {
  const { doc, runCommand } = useProject.getState();
  const graphen = doc.byKind<VisGraph>('visgraph');
  try {
    const res = runCommand('vis.graphErstellen', { name: `Graph ${graphen.length + 1}` });
    const id = (res.patches[0] as { id: string }).id;
    useVisRuntime.getState().setAktiverGraphId(id);
    return id;
  } catch (err) {
    meldeFehler(err);
    return undefined;
  }
}

/**
 * «Drei Stimmungen» — dieselbe fertige Teilgraph-Kette wie bisher
 * (`VisWorkspace.tsx`s `dreiStimmungen()`), EIN Undo-Schritt. Legt bei Bedarf
 * selbst einen Graphen an (wie das Vorbild).
 */
export function dreiStimmungenEinfuegen(graphIdVorgabe?: string): void {
  const { doc, runCommand, history } = useProject.getState();
  try {
    history.beginGroup();
    try {
      let gid = graphIdVorgabe;
      if (!gid || !doc.get<VisGraph>(gid)) {
        gid = neuerGraphErstellen();
        if (!gid) return;
      }
      const setze = (typ: string, x: number, y: number, params?: Record<string, string | number | boolean>) => {
        runCommand('vis.nodeSetzen', { graphId: gid!, typ, x, y, ...(params ? { params } : {}) });
        const g = doc.get<VisGraph>(gid!)!;
        return g.nodes[g.nodes.length - 1]!.id;
      };
      const verbinde = (from: string, fromPort: string, to: string, toPort: string) =>
        runCommand('vis.verbinden', { graphId: gid!, from, fromPort, to, toPort });
      const zeilenAbstand = Math.max(basisNodeHoehe('stimmung'), basisNodeHoehe('kombinierer'), basisNodeHoehe('render')) + 40;
      const spaltenAbstand = NODE_W + 80;
      const stimmungX = 320;
      const kombX = stimmungX + spaltenAbstand;
      const renderX = kombX + spaltenAbstand;
      const vergleichX = renderX + spaltenAbstand;
      const bestehend = doc.get<VisGraph>(gid)?.nodes ?? [];
      const basisY = bestehend.length === 0 ? 0 : Math.max(0, ...bestehend.map((n) => n.y + basisNodeHoehe(n.typ))) + 40;
      const modell = setze('modell', 40, basisY + 260);
      const material = setze('material', 40, basisY + 420);
      const vergleich = setze('vergleich', vergleichX, basisY + zeilenAbstand + 40);
      (['morgen', 'abend', 'weiss'] as const).forEach((preset, i) => {
        const y = basisY + 40 + i * zeilenAbstand;
        const stimmung = setze('stimmung', stimmungX, y, { preset });
        const komb = setze('kombinierer', kombX, y);
        const render = setze('render', renderX, y);
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
}

/** «Kamera vorschlagen» — identisch zu `VisWorkspace.tsx`s bisherigem `kameraVorschlagen()`. */
export function kameraVorschlagenAktion(graphIdVorgabe?: string): void {
  const { doc, runCommand, history } = useProject.getState();
  try {
    history.beginGroup();
    try {
      let gid = graphIdVorgabe;
      if (!gid || !doc.get<VisGraph>(gid)) {
        gid = neuerGraphErstellen();
        if (!gid) return;
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
        runCommand('vis.verbinden', { graphId: gid, from: kameraNode.id, fromPort: 'kameras', to: render.id, toPort: 'kameras' });
      }
    } finally {
      history.endGroup();
    }
  } catch (err) {
    meldeFehler(err);
  }
}

/** Node per Spiral-Platzsuche einfügen — identisch zu `VisWorkspace.tsx`s bisherigem `nodeHinzu()`. */
export function nodeHinzufuegen(graphId: string, typ: string): void {
  if (!graphId) return;
  const { doc, runCommand } = useProject.getState();
  try {
    const bestehend = doc.get<VisGraph>(graphId)?.nodes ?? [];
    const eigeneHoehe = basisNodeHoehe(typ);
    const ABSTAND = 24;
    const passtHier = (x: number, y: number) =>
      !bestehend.some((n) => {
        const nHoehe = basisNodeHoehe(n.typ);
        return (
          x < n.x + NODE_W + ABSTAND && x + NODE_W + ABSTAND > n.x && y < n.y + nHoehe + ABSTAND && y + eigeneHoehe + ABSTAND > n.y
        );
      });
    const START_X = 100;
    const START_Y = 60;
    const findeSpiralPlatz = (): { x: number; y: number } => {
      const SCHRITT = 60;
      const WINKEL_JE_UMLAUF = 12;
      for (let radius = 1; radius <= 40; radius++) {
        for (let schritt = 0; schritt < WINKEL_JE_UMLAUF; schritt++) {
          const winkel = (schritt / WINKEL_JE_UMLAUF) * Math.PI * 2;
          const kandX = Math.round(START_X + radius * SCHRITT * Math.cos(winkel));
          const kandY = Math.round(START_Y + radius * SCHRITT * Math.sin(winkel) * 0.6);
          if (passtHier(kandX, kandY)) return { x: kandX, y: kandY };
        }
      }
      const maxY = bestehend.reduce((m, n) => Math.max(m, n.y + basisNodeHoehe(n.typ)), START_Y);
      return { x: START_X, y: maxY + ABSTAND };
    };
    const { x, y } = passtHier(START_X, START_Y) ? { x: START_X, y: START_Y } : findeSpiralPlatz();
    runCommand('vis.nodeSetzen', { graphId, typ, x: Math.max(20, x), y: Math.max(20, y) });
  } catch (err) {
    meldeFehler(err);
  }
}
