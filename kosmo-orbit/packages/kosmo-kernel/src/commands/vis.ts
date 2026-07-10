import { z } from 'zod';
import { newId } from '../model/ids';
import type { VisEdge, VisGraph, VisNode } from '../model/entities';
import type { KosmoDoc } from '../model/doc';
import { hatZyklus, visPort, VIS_NODE_KATALOG } from '../derive/visgraph';
import { CommandError, registerCommand } from './core';

/**
 * Vis-Commands (V1-Finish P2) — der Render-Graph läuft über denselben
 * Command-Weg wie jedes Bauteil: Undo, Yjs, Journal, und Kosmo kann
 * Render-Graphen SPRECHEN (jedes Schema wird automatisch LLM-Tool).
 */

const ParamWert = z.union([z.string(), z.number(), z.boolean()]);

function requireGraph(doc: KosmoDoc, id: string): VisGraph {
  const e = doc.get<VisGraph>(id);
  if (!e || e.kind !== 'visgraph') throw new CommandError(`Render-Graph «${id}» existiert nicht`);
  return e;
}

function requireNode(graph: VisGraph, nodeId: string): VisNode {
  const n = graph.nodes.find((n) => n.id === nodeId);
  if (!n) throw new CommandError(`Node «${nodeId}» existiert nicht im Graphen`);
  return n;
}

export const createGraph = registerCommand({
  id: 'vis.graphErstellen',
  title: 'Render-Graph erstellen',
  description:
    'Erstellt einen leeren Render-Graphen (Node-Tree) in KosmoVis. Nodes kommen mit vis.nodeSetzen dazu, Verbindungen mit vis.verbinden.',
  params: z.object({ name: z.string().min(1).describe('z.B. «Wettbewerbsbilder»') }),
  summarize: (p) => `Render-Graph «${p.name}»`,
  run: (_doc, p) => {
    const graph: VisGraph = { id: newId('visgraph'), kind: 'visgraph', name: p.name, nodes: [], edges: [] };
    return [{ id: graph.id, before: null, after: graph }];
  },
});

export const addNode = registerCommand({
  id: 'vis.nodeSetzen',
  title: 'Node setzen',
  description: `Setzt einen Node in den Render-Graphen. Typen: ${Object.values(VIS_NODE_KATALOG)
    .map((t) => `${t.typ} (${t.hilfe})`)
    .join('; ')}`,
  params: z.object({
    graphId: z.string(),
    typ: z.string().describe('Node-Typ aus dem Katalog, z.B. «render»'),
    x: z.number().describe('Canvas-X'),
    y: z.number().describe('Canvas-Y'),
    params: z.record(z.string(), ParamWert).optional(),
  }),
  summarize: (p) => `Node ${p.typ}`,
  run: (doc, p) => {
    const graph = requireGraph(doc, p.graphId);
    const kat = VIS_NODE_KATALOG[p.typ];
    if (!kat) {
      throw new CommandError(`Unbekannter Node-Typ «${p.typ}» — Katalog: ${Object.keys(VIS_NODE_KATALOG).join(', ')}`);
    }
    const node: VisNode = {
      id: newId('node'),
      typ: p.typ,
      x: p.x,
      y: p.y,
      params: { ...kat.defaults, ...(p.params ?? {}) },
    };
    const after: VisGraph = { ...graph, nodes: [...graph.nodes, node] };
    return [{ id: graph.id, before: graph, after }];
  },
});

export const setNodeParams = registerCommand({
  id: 'vis.nodeParametrieren',
  title: 'Node parametrieren',
  description:
    'Setzt Parameter eines Nodes (mischt in die bestehenden), z.B. den Text eines Prompt-Nodes, das Preset einer Stimmung (morgen/abend/weiss) oder den Wert eines Zahl-Nodes.',
  params: z.object({
    graphId: z.string(),
    nodeId: z.string(),
    params: z.record(z.string(), ParamWert),
  }),
  summarize: (p) => `Node-Parameter (${Object.keys(p.params).join(', ')})`,
  run: (doc, p) => {
    const graph = requireGraph(doc, p.graphId);
    const node = requireNode(graph, p.nodeId);
    const after: VisGraph = {
      ...graph,
      // ?? {} statt n.params direkt: ein Node ohne params (Alt-Stand/Import)
      // darf hier nicht in einen halbkaputten Zustand gemischt werden.
      nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, params: { ...(n.params ?? {}), ...p.params } } : n)),
    };
    return [{ id: graph.id, before: graph, after }];
  },
});

export const moveNode = registerCommand({
  id: 'vis.nodeSchieben',
  title: 'Node schieben',
  description: 'Verschiebt einen Node auf dem Canvas (ein Schritt pro Drag, nie pro Mausbewegung).',
  params: z.object({ graphId: z.string(), nodeId: z.string(), x: z.number(), y: z.number() }),
  summarize: () => 'Node verschoben',
  run: (doc, p) => {
    const graph = requireGraph(doc, p.graphId);
    const node = requireNode(graph, p.nodeId);
    const after: VisGraph = {
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, x: p.x, y: p.y } : n)),
    };
    return [{ id: graph.id, before: graph, after }];
  },
});

export const connect = registerCommand({
  id: 'vis.verbinden',
  title: 'Nodes verbinden',
  description:
    'Verbindet einen Ausgangs-Port mit einem Eingangs-Port (gleicher Typ: szene/bild/prompt/zahl/material). Ein belegter Eingang wird ersetzt (wie in Blender); Zyklen werden ehrlich abgelehnt.',
  params: z.object({
    graphId: z.string(),
    from: z.string().describe('Quell-Node'),
    fromPort: z.string().describe('Ausgangs-Port, z.B. «prompt»'),
    to: z.string().describe('Ziel-Node'),
    toPort: z.string().describe('Eingangs-Port, z.B. «stil»'),
  }),
  summarize: (p) => `Verbinden ${p.fromPort} → ${p.toPort}`,
  run: (doc, p) => {
    const graph = requireGraph(doc, p.graphId);
    const von = requireNode(graph, p.from);
    const zu = requireNode(graph, p.to);
    if (von.id === zu.id) throw new CommandError('Ein Node kann nicht mit sich selbst verbunden werden');
    const aus = visPort(von.typ, p.fromPort, 'out');
    const ein = visPort(zu.typ, p.toPort, 'in');
    if (!aus) throw new CommandError(`Node ${von.typ} hat keinen Ausgang «${p.fromPort}»`);
    if (!ein) throw new CommandError(`Node ${zu.typ} hat keinen Eingang «${p.toPort}»`);
    if (aus.typ !== ein.typ) {
      throw new CommandError(`Port-Typen passen nicht: ${p.fromPort} ist ${aus.typ}, ${p.toPort} erwartet ${ein.typ}`);
    }
    // Belegter Eingang wird ersetzt — erst dann auf Zyklus prüfen
    const ohneAlte = graph.edges.filter((e) => !(e.to === zu.id && e.toPort === p.toPort));
    if (hatZyklus(graph.nodes, ohneAlte, { from: von.id, to: zu.id })) {
      throw new CommandError('Diese Verbindung ergäbe einen Zyklus — Render-Graphen fliessen nur vorwärts');
    }
    const edge: VisEdge = { id: newId('edge'), from: von.id, fromPort: p.fromPort, to: zu.id, toPort: p.toPort };
    const after: VisGraph = { ...graph, edges: [...ohneAlte, edge] };
    return [{ id: graph.id, before: graph, after }];
  },
});

export const disconnect = registerCommand({
  id: 'vis.trennen',
  title: 'Verbindung trennen',
  description: 'Entfernt eine Verbindung aus dem Render-Graphen.',
  params: z.object({ graphId: z.string(), edgeId: z.string() }),
  summarize: () => 'Verbindung getrennt',
  run: (doc, p) => {
    const graph = requireGraph(doc, p.graphId);
    if (!graph.edges.some((e) => e.id === p.edgeId)) {
      throw new CommandError(`Verbindung «${p.edgeId}» existiert nicht`);
    }
    const after: VisGraph = { ...graph, edges: graph.edges.filter((e) => e.id !== p.edgeId) };
    return [{ id: graph.id, before: graph, after }];
  },
});

export const removeNode = registerCommand({
  id: 'vis.nodeLoeschen',
  title: 'Node löschen',
  description: 'Löscht einen Node samt allen seinen Verbindungen.',
  params: z.object({ graphId: z.string(), nodeId: z.string() }),
  summarize: () => 'Node gelöscht',
  run: (doc, p) => {
    const graph = requireGraph(doc, p.graphId);
    const node = requireNode(graph, p.nodeId);
    const after: VisGraph = {
      ...graph,
      nodes: graph.nodes.filter((n) => n.id !== node.id),
      edges: graph.edges.filter((e) => e.from !== node.id && e.to !== node.id),
    };
    return [{ id: graph.id, before: graph, after }];
  },
});

export const collapseNode = registerCommand({
  id: 'vis.nodeKollabieren',
  title: 'Node ein-/ausklappen',
  description:
    'Klappt einen Node im Render-Graphen ein (nur Kopf + Ports sichtbar, kein Körper) oder wieder aus.',
  params: z.object({ graphId: z.string(), nodeId: z.string(), collapsed: z.boolean() }),
  summarize: (p) => (p.collapsed ? 'Node eingeklappt' : 'Node ausgeklappt'),
  run: (doc, p) => {
    const graph = requireGraph(doc, p.graphId);
    const node = requireNode(graph, p.nodeId);
    const after: VisGraph = {
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === node.id ? { ...n, collapsed: p.collapsed } : n)),
    };
    return [{ id: graph.id, before: graph, after }];
  },
});

export const removeGraph = registerCommand({
  id: 'vis.graphLoeschen',
  title: 'Render-Graph löschen',
  description: 'Löscht einen ganzen Render-Graphen (undo-fähig).',
  params: z.object({ graphId: z.string() }),
  summarize: () => 'Render-Graph gelöscht',
  run: (doc, p) => {
    const graph = requireGraph(doc, p.graphId);
    return [{ id: graph.id, before: graph, after: null }];
  },
});
