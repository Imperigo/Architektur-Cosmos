import { VIS_NODE_KATALOG, type VisGraph, type VisPortTyp } from '@kosmo/kernel';
import { useProject } from '../../../../state/project-store';
import { useVisRuntime } from '../../vis-runtime';
import { visInhaltsRegistry } from './registry';
import '../../vis-visual.css';
import '../vis-island.css';

/**
 * ANSICHT-Insel — Legende, NEUE Datei (P-B1/E4, `docs/V0811-SPEZ.md` §2 E4,
 * Owner-Wahl «Ansichten + Legende», Sanktion 4: kein Anbau an
 * `graph.tsx`/`austausch.tsx`).
 *
 * Insel-Äquivalent zum letzten P-B1-Audit-Fund: die Porttyp-Legende
 * existierte bisher NUR im Manuell-Chrome, zweimal inline in
 * `NodeCanvas.tsx` (Dock-Panel `visLegende` Z.941-953 + der
 * B-Modus-Minimap-Begleiter Z.1730-1739) — beide Stellen sind TABU
 * (Sanktion 4, `docs/V0811-SPEZ.md` §4, kein NodeCanvas.tsx-Edit). Ein
 * echter Re-Export der beiden dortigen Consts (`PORT_FARBE`/`PORT_TYP_NAME`)
 * wäre nur mit einem `export`-Zusatz an Ort und Stelle möglich — genau das
 * verbietet die Sanktion.
 *
 * Diese Datei importiert darum die tatsächliche FACHLOGIK — welche
 * Porttypen im aktuellen Graphen vorkommen — aus dem einzigen dafür
 * zuständigen, bereits exportierten Kernel-Katalog `VIS_NODE_KATALOG`
 * (`@kosmo/kernel`, `derive/visgraph.ts`, s. auch `inhalte/graph.tsx`s
 * NodePalette). Die distinct-Schleife unten ist Zeile für Zeile identisch
 * zu `NodeCanvas.tsx`s Original (geprüft) — eine gemeinsame Extraktion in
 * eine dritte Datei hätte NodeCanvas.tsx anfassen müssen, um von dort auf
 * die neue Stelle umzustellen, was ebenfalls TABU ist; die lokale Kopie
 * DIESER reinen Ableitungsschleife ist die einzige TABU-konforme Option.
 * `PORT_FARBE`/`PORT_TYP_NAME` selbst sind reine Präsentationsdaten (CSS-
 * Custom-Property-Namen aus `aura.css` bzw. deutsche Kurznamen, keine
 * Fachlogik) — sie erscheinen hier wortgleich, und die CSS-Klassen
 * (`vis-legende-panel`/`-zeile`/`-punkt`) kommen UNVERÄNDERT aus dem
 * gemeinsamen, nicht-TABU `vis-visual.css` — visuell identisch zum
 * Manuell-Chrome, ohne eine einzige TABU-Datei zu berühren.
 */

const PORT_FARBE: Record<VisPortTyp, string> = {
  szene: 'var(--k-port-szene)',
  bild: 'var(--k-port-bild)',
  prompt: 'var(--k-port-prompt)',
  zahl: 'var(--k-port-zahl)',
  material: 'var(--k-port-material)',
  kameras: 'var(--k-port-kameras)',
};

/** Deutsche Kurznamen je Porttyp — wortgleich zu `NodeCanvas.tsx`s Original. */
const PORT_TYP_NAME: Record<VisPortTyp, string> = {
  szene: 'Szene',
  bild: 'Bild',
  prompt: 'Prompt',
  zahl: 'Zahl',
  material: 'Material',
  kameras: 'Kameras',
};

/** Identische distinct-Porttypen-Schleife wie `NodeCanvas.tsx` (s. Kopfkommentar). */
function berechneLegendeTypen(graph: VisGraph | undefined): VisPortTyp[] {
  const legendeTypen: VisPortTyp[] = [];
  if (!graph) return legendeTypen;
  const gesehen = new Set<VisPortTyp>();
  for (const n of graph.nodes) {
    const k = VIS_NODE_KATALOG[n.typ];
    if (!k) continue;
    for (const p of [...k.inputs, ...k.outputs]) {
      if (!gesehen.has(p.typ)) {
        gesehen.add(p.typ);
        legendeTypen.push(p.typ);
      }
    }
  }
  return legendeTypen;
}

function LegendeStufe2() {
  const graphId = useVisRuntime((s) => s.aktiverGraphId);
  const revision = useProject((s) => s.revision);
  void revision;
  const doc = useProject.getState().doc;
  const graph = graphId ? doc.get<VisGraph>(graphId) : undefined;
  const legendeTypen = berechneLegendeTypen(graph);

  return (
    <div className="visisl-stufe2" data-testid="island-legende-stufe2" onClick={(e) => e.stopPropagation()}>
      {legendeTypen.length === 0 ? (
        <p className="visisl-hinweis">Noch kein Porttyp im Graphen — die Legende füllt sich mit dem ersten Node.</p>
      ) : (
        <div data-testid="vis-legende" className="vis-legende-panel">
          {legendeTypen.map((t) => (
            <div key={t} className="vis-legende-zeile">
              <span aria-hidden className="vis-legende-punkt" style={{ ['--_farbe' as string]: PORT_FARBE[t] }} />
              <span>{PORT_TYP_NAME[t]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

visInhaltsRegistry.registriere('legende', { Stufe2: LegendeStufe2, Stufe3: LegendeStufe2 });
