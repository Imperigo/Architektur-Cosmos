import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  deriveAutoKameras,
  evaluiereGraph,
  RENDER_PRESETS,
  renderPromptBausteine,
  VIS_KATEGORIE_HUE,
  VIS_NODE_KATALOG,
  VIS_STIMMUNGEN,
  type VisGraph,
  type VisKategorie,
  type VisNode,
  type VisPortTyp,
} from '@kosmo/kernel';
import { KButton, KField, KIcon, KInput, KSelect, melde, meldeFehler, type KIconName } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import { DockFlaeche, type DockPanelEintrag } from '../../shell/dock/DockFlaeche';
import {
  abbrechenJob,
  aufnahmeAufsBlatt,
  bildAufsBlatt,
  bridgeBase,
  formularZusatz,
  freigebenJob,
  holeJob,
  istAuthFehler,
  kombiniertePrompt,
  mappeJobStatus,
  sendeGraphRenderAuftrag,
} from './vis-jobs';
import {
  istZeitUeberschritten,
  memoKey,
  type Aufnahme,
  type NodeLauf,
  OFFENE_LAUF_STATUS,
  RENDER_TIMEOUT_MS_DEFAULT,
  useVisRuntime,
  waehleAufnahme,
} from './vis-runtime';
import { BridgeBild } from './BridgeBild';
import { KuratierFlaeche } from './KuratierFlaeche';
import type { KuratierKartenDaten } from './varianten-diff';
import './vis-visual.css';

/**
 * NodeCanvas (V1-Finish P2, W1-Neubau UI-KONZEPT-065 §5) — der Blender-artige
 * Node-Editor von KosmoVis. Eigenbau-SVG statt react-flow: jede Änderung läuft
 * als vis.*-Command (Undo, Yjs, Kosmo spricht Graphen). Drag lebt im lokalen
 * State und wird bei pointerup als EIN vis.nodeSchieben committet; Parameter
 * committen bei blur. Render nur auf «Ausführen» — nie automatisch.
 *
 * V1-Nachtkampagne (v0.6.7 Stream V1, Commit 1+2): Mehrfachauswahl +
 * Gruppen-Drag + Grid-Snap + Ausrichten, orthogonales Kanten-Routing und
 * echter Node-Kollaps kommen alle als lokaler Laufzeit-State/additive
 * vis.*-Commands dazu — kein bestehender E2E-Vertrag (Kantenzahlen, Overlap,
 * Testpunkt (30,30), Status-Texte, Minimap) wird angetastet.
 */

export const NODE_W = 200;
const PORT_ABSTAND = 20;
/** V1-Welle Commit 2 (Node-Kollaps): Port-Abstand im eingeklappten Zustand —
 * kompakter als PORT_ABSTAND; `portY()` wählt je nach `node.collapsed`. */
const PORT_ABSTAND_KOLLABIERT = 14;
const KOPF_H = 26;
/** Portanker sitzen 4px vom Kartenrand abgesetzt (W1 Massnahme 5). */
const PORT_ABSATZ = 4;
/** Zoom-Grenzen der Steuerleiste (W1 Massnahme 4). */
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.5;
/** V1-Welle Commit 1: Grid-Snap-Raster in Node-Raum-Einheiten — deckt sich
 * mit dem sichtbaren 24px-Punktraster (`vis-raster`-Pattern unten). */
const RASTER = 24;

function snap24(v: number): number {
  return Math.round(v / RASTER) * RASTER;
}

/** Minimap (Welle 3): feste Pixelgrösse (Papier-Stil, unten links neben der
 * Legende) + Schwelle, ab der sie standardmässig eingeblendet ist — kleine
 * Graphen brauchen sie nicht, die Legende reicht dort zur Orientierung. */
const MINIMAP_W = 160;
const MINIMAP_H = 100;
const MINIMAP_KNOTEN_MIN = 5;

/**
 * v0.8.8 / PA4 (`docs/V088-SPEZ.md` §2 D7/§3 E-Zeile, C-10) — Token-Brücke:
 * die sechs Port-Typ-Farben kommen jetzt aus `aura.css` (`--k-port-*`,
 * byte-gleiche Hex-Werte). `NodeCanvas.tsx` ist SVG (kein Canvas) — jede
 * Verwendung unten ist entweder ein SVG-`fill`/`stroke`-Attribut (native
 * `var()`-Unterstützung, Beweis: :1169 nutzte bereits `var(--k-accent)` in
 * genau diesem Ternary) oder eine CSS-Custom-Prop-Durchreichung
 * (`style={{ '--_farbe': PORT_FARBE[t] }}`, konsumiert in `aura.css`/
 * `vis-visual.css` via `var(--_farbe)`) — ein `var()`-String als Wert einer
 * weitergereichten Custom-Property löst CSS ganz normal verschachtelt auf,
 * kein Sonderfall nötig. Seit v0.8.9 E6 (Owner-Entscheid «K2 Ausgewogen»,
 * 19.07.2026) sind die Tokens NICHT mehr theme-invariant: das dunkle Theme
 * überschreibt fünf der sechs Werte auf ein ≥4.6:1-Kontrastband gegen
 * `--k-field` (s. `aura.css` `[data-theme='orbit']`-Block) — genau dafür
 * zahlt sich der `var()`-Kanal aus: ein Theme-Wechsel färbt Ports und
 * Legende ohne Redraw-Sonderweg um (Beweis: `e2e/vis-token.spec.ts`).
 */
const PORT_FARBE: Record<VisPortTyp, string> = {
  szene: 'var(--k-port-szene)',
  bild: 'var(--k-port-bild)',
  prompt: 'var(--k-port-prompt)',
  zahl: 'var(--k-port-zahl)',
  material: 'var(--k-port-material)',
  kameras: 'var(--k-port-kameras)',
};

/** Deutsche Kurznamen je Porttyp — für die Legende (nicht die Port-Labels,
 * die pro Node unterschiedlich heissen, z.B. «Wert» vs. «Geometrie-Treue»). */
const PORT_TYP_NAME: Record<VisPortTyp, string> = {
  szene: 'Szene',
  bild: 'Bild',
  prompt: 'Prompt',
  zahl: 'Zahl',
  material: 'Material',
  kameras: 'Kameras',
};

/** Ein KIcon je Kategorie (W1 Massnahme 1) — die Hue kommt aus dem Kernel-
 * Katalog (`VIS_KATEGORIE_HUE`), die Zeichenwahl ist reine UI-Entscheidung. */
const KATEGORIE_ICON: Record<VisKategorie, KIconName> = {
  quelle: 'ordner',
  wandler: 'stift',
  render: 'auge',
  ausgabe: 'dokument',
};

/** Node-Palette (Welle 3): deutsche Kategorie-Titel + feste Anzeige-Reihenfolge
 * (Quelle → Wandler → Render → Ausgabe folgt dem Datenfluss selbst). Beides
 * reine UI-Entscheidung wie `KATEGORIE_ICON` — der Katalog trägt nur die
 * Kategorie-Codes. */
const KATEGORIE_LABEL: Record<VisKategorie, string> = {
  quelle: 'Quelle',
  wandler: 'Wandler',
  render: 'Render',
  ausgabe: 'Ausgabe',
};
const KATEGORIE_REIHENFOLGE: readonly VisKategorie[] = ['quelle', 'wandler', 'render', 'ausgabe'];

/** Höhe des Inhaltsbereichs je Node-Typ (Canvas-Einheiten). V-H4: `render`
 * wächst um das neue semantische Formular (4 Selects/Feld + Freitext + der
 * sichtbare finale Prompt). */
const KOERPER_H: Record<string, number> = {
  modell: 22,
  material: 60,
  prompt: 56,
  stimmung: 90,
  kombinierer: 80,
  zahl: 38,
  render: 192 + 132,
  vergleich: 132,
  blatt: 38,
  referenz: 92,
  kamera: 54,
  aufnahme: 118,
};

/** SK-V3: Zusatzhöhe, wenn ein geklappter Text-Körper (node-expand) offen ist —
 * lokaler UI-State, NICHT im Doc; nur diese drei Node-Typen tragen Klapptext. */
const KOERPER_H_ZUSATZ_OFFEN = 70;
const KLAPPBARE_TYPEN = new Set(['kombinierer', 'stimmung', 'material']);

/** Basis-Nodehöhe eines Typs (ohne Klapp-Zusatz) — für Layout-Vorausberechnung
 * (Drei-Stimmungen-Zeilenabstand, Spiral-Platzsuche), die noch keine Node-ID hat. */
export function basisNodeHoehe(typ: string): number {
  const kat = VIS_NODE_KATALOG[typ];
  const ports = Math.max(kat?.inputs.length ?? 0, kat?.outputs.length ?? 0);
  return KOPF_H + 8 + ports * PORT_ABSTAND + (KOERPER_H[typ] ?? 30) + 10;
}

/** V1-Welle Commit 2: Höhe eines eingeklappten Nodes — nur Kopf + (komprimiert
 * gestapelte) Ports, kein Körper. Mindestens ein Port-Slot, auch ohne Ports. */
function kollabierteNodeHoehe(typ: string): number {
  const kat = VIS_NODE_KATALOG[typ];
  const ports = Math.max(kat?.inputs.length ?? 0, kat?.outputs.length ?? 0, 1);
  return KOPF_H + 14 + (ports - 1) * PORT_ABSTAND_KOLLABIERT + 12;
}

/** Y-Position des i-ten Ports (Eingang ODER Ausgang, gleiche Zählung) — im
 * eingeklappten Zustand komprimiert (`PORT_ABSTAND_KOLLABIERT`), sonst der
 * gewohnte `PORT_ABSTAND`. EINE Naht für `portPos()` UND das Render selbst
 * (V1-Welle Commit 2: Kanten bleiben beim Kollaps korrekt verbunden, weil
 * beide Stellen dieselbe Funktion rufen). */
function portY(n: VisNode, i: number): number {
  const abstand = n.collapsed ? PORT_ABSTAND_KOLLABIERT : PORT_ABSTAND;
  return KOPF_H + 14 + i * abstand;
}

/** Echte Nodehöhe inkl. eines offenen Klapptexts (W1 Massnahme 3a) ODER
 * (V1-Welle Commit 2) eingeklappt — `collapsed` gewinnt: ein Klapptext bleibt
 * dabei zu (kollabiert zeigt nie einen Körper). */
function nodeHoehe(n: VisNode, offen?: ReadonlySet<string>): number {
  if (n.collapsed) return kollabierteNodeHoehe(n.typ);
  const zusatz = offen?.has(n.id) && KLAPPBARE_TYPEN.has(n.typ) ? KOERPER_H_ZUSATZ_OFFEN : 0;
  return basisNodeHoehe(n.typ) + zusatz;
}

function portPos(n: VisNode, port: string, richtung: 'in' | 'out'): { x: number; y: number } {
  const kat = VIS_NODE_KATALOG[n.typ];
  const liste = richtung === 'in' ? (kat?.inputs ?? []) : (kat?.outputs ?? []);
  const i = Math.max(0, liste.findIndex((p) => p.name === port));
  return {
    x: n.x + (richtung === 'in' ? -PORT_ABSATZ : NODE_W + PORT_ABSATZ),
    y: n.y + portY(n, i),
  };
}

function klemme(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Fit-Berechnung als eigene Funktion (W1 Massnahme 4) — sowohl der Mount-
 * Auto-Fit als auch der «Fit»-Knopf der Zoom-Steuerleiste rufen sie auf. */
function berechneFit(
  nodes: VisNode[],
  flaeche: { w: number; h: number },
): { cx: number; cy: number; scale: number } | null {
  if (nodes.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + NODE_W);
    maxY = Math.max(maxY, n.y + nodeHoehe(n));
  }
  const scale = Math.min(1, (flaeche.w - 80) / Math.max(1, maxX - minX), (flaeche.h - 80) / Math.max(1, maxY - minY));
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, scale: klemme(scale, 0.35, ZOOM_MAX) };
}

/** Minimap-Geometrie (Welle 3): bildet Node-Raum → Minimap-Pixelraum ab.
 * Die Bounds umfassen NODES **und** den aktuellen Viewport, damit der
 * Tusche-Rahmen des Viewports auch beim weit weggepannten Canvas noch in
 * der kleinen Karte liegt (ein Editor-Minimap-Grundsatz). Reine Geometrie,
 * kein State — sowohl fürs Zeichnen als auch für den Rück-Umrechnungsschritt
 * beim Klick/Drag verwendet (`minimapZuNodeRaum`, unten). */
interface MinimapAnsicht {
  scale: number;
  minX: number;
  minY: number;
  offsetX: number;
  offsetY: number;
}

function berechneMinimapAnsicht(
  nodes: VisNode[],
  view: { cx: number; cy: number; scale: number },
  flaeche: { w: number; h: number },
  mmW: number,
  mmH: number,
): MinimapAnsicht {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + NODE_W);
    maxY = Math.max(maxY, n.y + nodeHoehe(n));
  }
  const vw = flaeche.w / view.scale;
  const vh = flaeche.h / view.scale;
  minX = Math.min(minX, view.cx - vw / 2);
  minY = Math.min(minY, view.cy - vh / 2);
  maxX = Math.max(maxX, view.cx + vw / 2);
  maxY = Math.max(maxY, view.cy + vh / 2);
  const pad = 10;
  const breite = Math.max(1, maxX - minX);
  const hoehe = Math.max(1, maxY - minY);
  const scale = Math.min((mmW - pad * 2) / breite, (mmH - pad * 2) / hoehe);
  return {
    scale,
    minX,
    minY,
    offsetX: (mmW - breite * scale) / 2,
    offsetY: (mmH - hoehe * scale) / 2,
  };
}

/** Minimap-Pixelpunkt → Node-Raum (invertiert `berechneMinimapAnsicht`) —
 * der Klick-/Drag-Handler setzt das Ergebnis direkt als neues View-Zentrum
 * (kein Easing: erfüllt «keine animierten Sprünge» bei reduced-motion durch
 * Konstruktion, nicht durch eine Fallunterscheidung). */
function minimapZuNodeRaum(ansicht: MinimapAnsicht, mx: number, my: number): { x: number; y: number } {
  return {
    x: ansicht.minX + (mx - ansicht.offsetX) / ansicht.scale,
    y: ansicht.minY + (my - ansicht.offsetY) / ansicht.scale,
  };
}

export type VisRoutingModus = 'kurve' | 'ortho';

/** Kubische Bézier mit horizontalen Tangenten — kein Routing, ruhige Kurven
 * (Default, byte-identisch zum bisherigen Verhalten). */
function edgePfadKurve(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const dx = Math.max(40, Math.abs(b.x - a.x) / 2);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

/** V1-Welle Commit 2: orthogonales («Manhattan») Routing — waagrecht/senkrecht
 * mit kleinen Eck-Radien (Q-Segmente statt scharfer Ecken). Nur L/Q, kein C —
 * der Umschalter (`vis-routing-toggle`) prüft das im E2E direkt am d-Attribut. */
function edgePfadOrtho(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const RADIUS = 8;
  const midX = a.x + (b.x - a.x) / 2;
  if (Math.abs(b.y - a.y) < 0.5) {
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }
  const signY = b.y > a.y ? 1 : -1;
  const r = Math.max(0, Math.min(RADIUS, Math.abs(midX - a.x), Math.abs(b.x - midX), Math.abs(b.y - a.y) / 2));
  if (r < 0.5) {
    return `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`;
  }
  return [
    `M ${a.x} ${a.y}`,
    `L ${midX - r} ${a.y}`,
    `Q ${midX} ${a.y} ${midX} ${a.y + signY * r}`,
    `L ${midX} ${b.y - signY * r}`,
    `Q ${midX} ${b.y} ${midX + r} ${b.y}`,
    `L ${b.x} ${b.y}`,
  ].join(' ');
}

/** EIN Weg für beide Routing-Modi (Default 'kurve' — alle Bestandsverträge
 * unverändert). Sowohl bestehende Kanten als auch die Pending-Kante rufen
 * diese Funktion mit demselben `routingModus`-State. */
function edgePfad(a: { x: number; y: number }, b: { x: number; y: number }, modus: VisRoutingModus = 'kurve'): string {
  return modus === 'ortho' ? edgePfadOrtho(a, b) : edgePfadKurve(a, b);
}

/**
 * Bild + QA-Zeile — der gemeinsame Kern des bestehenden Bildvergleichs
 * (`vergleich`-Node, ehemals als Inline-JSX dupliziert). V-H5 (Welle 3): die
 * Kuratier-Fläche nutzt exakt dieselbe Kachel für ihre Zweier-Vergleichsfläche
 * — «bestehenden Bildvergleich wiederverwenden», nicht neu erfinden.
 */
function BildKachel({
  jobId,
  bild,
  qa,
  alt,
}: {
  jobId: string;
  bild: string;
  qa?: { verdict: { passed: boolean } } | undefined;
  alt: string;
}) {
  return (
    <div className="vis-bild-kachel">
      <BridgeBild jobId={jobId} imageName={bild} alt={alt} className="vis-img-full" />
      {qa && (
        <span className={`vis-bild-kachel-qa ${qa.verdict.passed ? 'vis-bild-kachel-qa--ok' : 'vis-bild-kachel-qa--fehl'}`}>
          QA {qa.verdict.passed ? 'ok' : '✗'}
        </span>
      )}
    </div>
  );
}

export function NodeCanvas({
  graphId,
  onNodeHinzu,
  islandModus,
}: {
  graphId: string;
  /** Node-Palette (Welle 3): reicht den Klick an `VisWorkspace.nodeHinzu`
   * weiter (Spiral-Platzsuche) — optional, weil ältere Aufrufer (Tests, die
   * NodeCanvas isoliert mounten) die Palette schlicht nicht sehen. */
  onNodeHinzu?: (typ: string) => void;
  /** PC1 (`docs/V084-SPEZ.md` §5 W2, C-15) — im Island-Modus verschwindet die
   *  alte fixe Chrome (Zoom-/Snap-/Routing-Leiste, Minimap-Toggle, DockFlaeche
   *  + der jetzt überflüssige Palette-Toggle oben links — sein Werkzeug lebt
   *  in der GRAPH-Insel); die Kuratier-Fläche bleibt (kein Insel-Ersatz dafür,
   *  s. Abschlussbericht). Default `false` — jeder Bestands-Aufrufer (Tests,
   *  `VisWorkspace.tsx`-Manuell-Zweig) verhält sich byte-gleich weiter. */
  islandModus?: boolean;
}) {
  const revision = useProject((s) => s.revision);
  void revision;
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  const graph = doc.get<VisGraph>(graphId);
  // V-H5 (Welle 3): Palette + Kuratier-Fläche starten beide zu — reines
  // Overlay-UI, kein Layout-Shift am Canvas selbst.
  // v0.7.8 Welle 3 (P6): `paletteOffen` lebte hier als lokaler `useState` —
  // für die Dock-Migration nach `vis-runtime.ts` gehoben (s. dortiger
  // Kommentar), damit `DockFlaeche`/das `visDockPanels`-Array unten dieselbe
  // Sichtbarkeit lesen. `kuratierOffen` bleibt lokal (Kuratier-Fläche ist
  // Vollbild-Chrome, NICHT im Dock — s. Abschlussbericht P6).
  const paletteOffen = useVisRuntime((s) => s.paletteOffen);
  const paletteUmschalten = useVisRuntime((s) => s.paletteUmschalten);
  const paletteSchliessen = useVisRuntime((s) => s.paletteSchliessen);
  const [kuratierOffen, setKuratierOffen] = useState(false);
  const [vergleichAuswahl, setVergleichAuswahl] = useState<readonly string[]>([]);
  // PC1: Minimap-Übersteuerung + Snap + Routing lebten hier als lokaler
  // `useState` — für die Insel-Fernsteuerung (ANSICHT-Insel liest/schreibt
  // dieselben Felder, ohne einen Closure-Pfad zu brauchen) nach
  // `vis-runtime.ts` gehoben (s. dortiger Kopfkommentar). Verhalten
  // byte-gleich: gleiche Defaults (`null`/`true`/`'kurve'`), gleiche
  // Toggle-Semantik, nur die Quelle wechselt von lokal auf den globalen Store.
  const minimapManuell = useVisRuntime((s) => s.canvasMinimapManuell);
  const setMinimapManuell = useVisRuntime((s) => s.setCanvasMinimapManuell);
  const snapAktiv = useVisRuntime((s) => s.canvasSnapAktiv);
  const toggleSnap = useVisRuntime((s) => s.toggleCanvasSnap);
  const routingModus = useVisRuntime((s) => s.canvasRoutingModus);
  const toggleRouting = useVisRuntime((s) => s.toggleCanvasRouting);
  const setCanvasAuswahlGroesse = useVisRuntime((s) => s.setCanvasAuswahlGroesse);
  const canvasBefehl = useVisRuntime((s) => s.canvasBefehl);
  const setAktiverGraphId = useVisRuntime((s) => s.setAktiverGraphId);

  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ cx: 560, cy: 300, scale: 1 });
  // P6-Review #6: Containergrösse als State (ResizeObserver) — die viewBox
  // aus getBoundingClientRect wäre beim Mount und nach Resize stale
  const [flaeche, setFlaeche] = useState({ w: 1200, h: 700 });
  const panning = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  // V1-Welle Commit 1: Mehrfachauswahl (lokaler Laufzeit-State, NICHT im Doc —
  // wie `offenerKlapptext`). Klick am Kopf = Einzelauswahl (ersetzt), Shift-
  // Klick = toggeln, Shift-Marquee auf leerer Fläche = Box-Auswahl, Escape leert.
  const [auswahl, setAuswahl] = useState<ReadonlySet<string>>(new Set());
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  // Node-Drag (Einzel ODER Gruppe, W1 + V1-Welle Commit 1): lokale
  // Startpositionen ALLER bewegten Nodes + der laufende Pointer-Delta;
  // EIN vis.nodeSchieben je Node bei pointerup, bei Mehrfachauswahl in
  // EINER beginGroup/endGroup-Klammer (Muster VisWorkspace.tsx:126-188).
  const [drag, setDrag] = useState<{
    start: Record<string, { x: number; y: number }>;
    startPX: number;
    startPY: number;
    curPX: number;
    curPY: number;
  } | null>(null);
  const [pending, setPending] = useState<{ from: string; fromPort: string; typ: VisPortTyp; x: number; y: number } | null>(null);
  const [auswahlEdge, setAuswahlEdge] = useState<string | null>(null);
  // W1 Massnahme 5: Hover je Kante (CSS-Opazität steuert Trenn-✕ + Stroke).
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  // SK-V3: offene Klapptexte je Node (lokaler UI-State, NICHT im Doc).
  const [offenerKlapptext, setOffenerKlapptext] = useState<ReadonlySet<string>>(new Set());
  const toggleKlapptext = (nodeId: string) =>
    setOffenerKlapptext((s) => {
      const next = new Set(s);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });

  const laeufe = useVisRuntime((s) => s.laeufe);
  // PC1: `setzeLauf` wandert mit der `ausfuehren()`-Extraktion nach
  // `vis-jobs.ts`s `sendeGraphRenderAuftrag` (dort direkt über
  // `useVisRuntime.getState()` genutzt) — hier nicht mehr nötig.
  const patchLauf = useVisRuntime((s) => s.patchLauf);
  // V-H5: Kuration lebt in vis-runtime (Laufzeit ≠ Modell) — Stern/Ablage
  // hängen am AKTUELLEN Bild eines Nodes, nie im Doc/Undo/Yjs.
  const kuration = useVisRuntime((s) => s.kuration);
  const markiereBild = useVisRuntime((s) => s.markiereBild);
  const verwerfeBild = useVisRuntime((s) => s.verwerfeBild);
  // v0.6.7 P0: Viewport-Aufnahmen (aufnahme-Node) — reine Laufzeit, wie `laeufe`.
  const aufnahmen = useVisRuntime((s) => s.aufnahmen);

  const auswertung = useMemo(
    () => (graph ? evaluiereGraph(doc, graph) : null),
    [doc, graph, revision],
  );

  // Ein Poll für alle offenen Render-Jobs (2.5 s — wie die Einfach-Ansicht).
  // HS3: die Wartezustände (Freigabe/GPU-Leerlauf) zählen als offen; ein
  // lokaler Wächter schlägt bei Zeitüberschreitung ehrlich an, statt ewig
  // «rendert» zu zeigen.
  useEffect(() => {
    const t = setInterval(() => {
      const jetzt = Date.now();
      const limitMs =
        Number(localStorage.getItem('kosmo.render.timeoutMs')) || RENDER_TIMEOUT_MS_DEFAULT;
      const offen = Object.entries(useVisRuntime.getState().laeufe).filter(
        ([, l]) => (OFFENE_LAUF_STATUS as readonly string[]).includes(l.status),
      );
      for (const [nodeId, lauf] of offen) {
        // Timeout-Wächter ZUERST — unabhängig von einer jobId (HS3-Auflage 2):
        // ein hängender POST bleibt sonst ewig «gesendet» ohne jobId und würde
        // nie ablaufen.
        if (istZeitUeberschritten(lauf, jetzt, limitMs)) {
          patchLauf(nodeId, {
            status: 'zeitueberschreitung',
            fehler: 'Zeitüberschreitung — Bridge/GPU meldet sich nicht.',
          });
          continue;
        }
        // Ohne jobId (POST noch nicht bestätigt) gibt es nichts abzufragen.
        if (!lauf.jobId) continue;
        const jobId = lauf.jobId;
        void holeJob(jobId)
          .then((j) => {
            // P6-Review #7: eine verspätete Antwort darf einen NEUEN Lauf
            // (anderer/kein jobId) nie als «fertig» markieren
            if (useVisRuntime.getState().laeufe[nodeId]?.jobId !== jobId) return;
            // Fortschritt/Worker mitführen (HS3-Auflage 5) — der Node zeigt sie.
            const marker: Partial<NodeLauf> = {
              ...(j.worker !== undefined ? { worker: j.worker } : {}),
              ...(j.progress !== undefined ? { progress: j.progress } : {}),
            };
            if (j.result) {
              patchLauf(nodeId, { ...marker, status: 'fertig', bild: j.result.images[0] ?? '', qa: j.result.qa });
            } else if (j.status === 'error') {
              patchLauf(nodeId, { ...marker, status: 'fehler', fehler: 'Render fehlgeschlagen' });
            } else {
              patchLauf(nodeId, { ...marker, status: mappeJobStatus(j) });
            }
          })
          .catch((err) => {
            // KLEIN 8: Ein Auth-Fehler (401/403) heisst falscher/fehlender
            // Token — der wurde früher still verschluckt und tauchte erst nach
            // 10 min als Zeitüberschreitung auf. Jetzt sofort ehrlich am Node.
            // (Wieder gegen den aktuellen jobId prüfen — kein Fremd-Lauf.)
            if (useVisRuntime.getState().laeufe[nodeId]?.jobId !== jobId) return;
            if (istAuthFehler(err)) {
              patchLauf(nodeId, {
                status: 'fehler',
                fehler: 'Bridge lehnt ab — Token fehlt oder ist falsch (KosmoVis-Einstellungen).',
              });
            }
            // Transiente Netzfehler NICHT hochziehen: der nächste Poll fasst
            // nach — ein einmaliger Aussetzer soll den Lauf nicht töten.
          });
      }
    }, 2500);
    return () => clearInterval(t);
  }, [patchLauf]);

  // Batch 6: useLayoutEffect statt useEffect — die Erstmessung muss VOR dem
  // ersten Browser-Paint sitzen. ResizeObserver feuert seinen ersten Callback
  // erst einen Tick später; bis dahin stand die viewBox auf dem 1200×700-
  // Platzhalter. Ein Klick/Drag, der in genau diesem Fenster startet (z.B.
  // E2E-Port-Drag), traf noch die Platzhalter-Koordinaten — der folgende
  // Resize-Snap auf die echte Grösse verschob Ports unter dem Zeiger weg,
  // der Down landete dadurch auf dem leeren Canvas statt auf dem Port und
  // startete Pan statt Pending-Edge (die eigentliche Ursache der Flakiness).
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    if (r.width > 0) setFlaeche({ w: r.width, h: r.height });
    const ro = new ResizeObserver((eintraege) => {
      const rect = eintraege[0]?.contentRect;
      if (rect && rect.width > 0) setFlaeche({ w: rect.width, h: rect.height });
    });
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0012);
      setView((v) => ({ ...v, scale: klemme(v.scale * factor, ZOOM_MIN, ZOOM_MAX) }));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  // V1-Welle Commit 1: Escape leert die Mehrfachauswahl (global, wie die
  // Kurzbefehle-Registry — greift unabhängig davon, wo der Fokus gerade sitzt).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAuswahl(new Set());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toCanvas = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: view.cx + (clientX - rect.left - rect.width / 2) / view.scale,
      y: view.cy + (clientY - rect.top - rect.height / 2) / view.scale,
    };
  };

  if (!graph) return null;

  const nodePos = (n: VisNode) => {
    const d = drag;
    const s = d?.start[n.id];
    if (!d || !s) return n;
    return { ...n, x: s.x + (d.curPX - d.startPX), y: s.y + (d.curPY - d.startPY) };
  };

  // SK-V1 (UI-Selbstkritik 0.6.4, Runde 2): beim Öffnen eines Graphen die
  // Ansicht auf die Nodes EINPASSEN — vorher startete der Canvas fix bei
  // (560, 300) und ein «Drei Stimmungen»-Graph lag halb ausserhalb, links
  // oben blieb eine grosse Leerfläche. Nur beim Mount (key={graphId} in
  // VisWorkspace remountet je Graph) — Nutzer-Pan/Zoom danach bleiben heilig.
  useEffect(() => {
    const g = useProject.getState().doc.get<VisGraph>(graphId);
    if (!g) return;
    // flaeche ist beim ersten Mount evtl. noch der Default (1200×700) — fürs
    // Einpassen gut genug, der ResizeObserver korrigiert die viewBox danach.
    const fit = berechneFit(g.nodes, flaeche);
    if (fit) setView(fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphId]);

  // PC1 (`docs/V084-SPEZ.md` §5 W2, C-15): spiegelt den aktiven Graphen in
  // `vis-runtime.ts` — die GRAPH-/STIMMUNG-/AUSTAUSCH-Insel-Inhalte
  // (`island/inhalte/*.tsx`) lesen NUR globale Stores (dasselbe Muster wie
  // `design/island/inhalte/*.tsx`), kein Prop-Pfad durch die Registry.
  useEffect(() => {
    setAktiverGraphId(graphId);
  }, [graphId, setAktiverGraphId]);

  // PC1: die ANSICHT-/GRAPH-Insel zeigt «Ausrichten» nur ab 2 ausgewählten
  // Nodes — dieselbe Regel wie die bisherige `visAusrichten`-Dock-Panel-
  // Sichtbarkeit (`auswahl.size >= 2`), hier nur als Zähler gespiegelt (die
  // volle Auswahl-Menge bleibt NodeCanvas-lokal, kein Store-Feld dafür nötig).
  useEffect(() => {
    setCanvasAuswahlGroesse(auswahl.size);
  }, [auswahl, setCanvasAuswahlGroesse]);

  /** Zoom-Steuerleiste (W1 Massnahme 4): ×1.25/÷1.25, geklemmt 0.25–2.5. */
  const zoomUm = (faktor: number) => setView((v) => ({ ...v, scale: klemme(v.scale * faktor, ZOOM_MIN, ZOOM_MAX) }));
  const zoomFit = () => {
    const g = useProject.getState().doc.get<VisGraph>(graphId);
    const fit = g ? berechneFit(g.nodes, flaeche) : null;
    if (fit) setView(fit);
  };

  const sicher = (fn: () => void) => {
    try {
      fn();
    } catch (err) {
      meldeFehler(err);
    }
  };

  /**
   * PC1 (`docs/V084-SPEZ.md` §5 W2, C-15/C-17): die eigentliche Sende-Logik
   * lebt jetzt in `vis-jobs.ts`s `sendeGraphRenderAuftrag` (Extraktion, EXAKT
   * dasselbe Verhalten wie bisher hier — s. dortigen Kommentar), damit die
   * neue AUSTAUSCH-Insel («Render senden») sie ohne Duplikat mitnutzen kann.
   * `environment` kommt aus der STIMMUNG-Insel (`renderStimmungPreset`,
   * `null` ausserhalb des Island-Modus → kein Feld im Job, byte-gleich).
   */
  const ausfuehren = (nodeId: string) => {
    const preset = useVisRuntime.getState().renderStimmungPreset;
    sendeGraphRenderAuftrag(graphId, nodeId, preset ? { preset } : undefined);
  };

  /** Wartenden Job freigeben (nur bei aktiver Freigabe-Pflicht). */
  const freigeben = (nodeId: string) => {
    const lauf = useVisRuntime.getState().laeufe[nodeId];
    if (!lauf?.jobId || !lauf.approvalToken) return;
    void freigebenJob(lauf.jobId, lauf.approvalToken)
      .then((j) => patchLauf(nodeId, { status: mappeJobStatus(j) }))
      .catch(meldeFehler);
  };

  /** Kooperativer Abbruch eines wartenden/laufenden Jobs. */
  const abbrechen = (nodeId: string) => {
    const lauf = useVisRuntime.getState().laeufe[nodeId];
    if (!lauf?.jobId) return;
    void abbrechenJob(lauf.jobId)
      .then((j) => patchLauf(nodeId, { status: mappeJobStatus(j) }))
      .catch(meldeFehler);
  };

  // V1-Welle Commit 2: ein laufender Render-Job (Status weder «bereit» noch
  // «fertig») lässt sich nicht kollabieren — ein ehrlicher Hinweis statt eines
  // stillen No-Ops (sonst verliert der Architekt den Job optisch aus den Augen).
  const kollapsBlockiert = (n: VisNode): boolean =>
    n.typ === 'render' && !!laeufe[n.id] && laeufe[n.id]!.status !== 'fertig';

  // V1-Welle Commit 1: Ausrichten/Verteilen — EIN beginGroup-Batch, wie
  // Gruppen-Drag (Muster VisWorkspace.tsx:126-188).
  const ausrichtenAn = (achse: 'x' | 'y') => {
    const nodes = [...auswahl].map((id) => graph.nodes.find((n) => n.id === id)).filter((n): n is VisNode => !!n);
    if (nodes.length < 2) return;
    const ziel = Math.min(...nodes.map((n) => n[achse]));
    sicher(() => {
      const { history } = useProject.getState();
      history.beginGroup();
      try {
        for (const n of nodes) {
          if (n[achse] !== ziel) {
            runCommand('vis.nodeSchieben', {
              graphId,
              nodeId: n.id,
              x: achse === 'x' ? ziel : n.x,
              y: achse === 'y' ? ziel : n.y,
            });
          }
        }
      } finally {
        history.endGroup();
      }
    });
  };

  const vertikalVerteilen = () => {
    const nodes = [...auswahl].map((id) => graph.nodes.find((n) => n.id === id)).filter((n): n is VisNode => !!n);
    if (nodes.length < 2) return;
    const sortiert = [...nodes].sort((a, b) => a.y - b.y);
    const oben = sortiert[0]!.y;
    const unten = sortiert[sortiert.length - 1]!.y;
    const schritt = sortiert.length > 1 ? (unten - oben) / (sortiert.length - 1) : 0;
    sicher(() => {
      const { history } = useProject.getState();
      history.beginGroup();
      try {
        sortiert.forEach((n, i) => {
          const zielY = Math.round(oben + i * schritt);
          if (n.y !== zielY) runCommand('vis.nodeSchieben', { graphId, nodeId: n.id, x: n.x, y: zielY });
        });
      } finally {
        history.endGroup();
      }
    });
  };

  // PC1 (`docs/V084-SPEZ.md` §5 W2, C-15): Fernauslöser aus der ANSICHT-/
  // GRAPH-Insel (`island/inhalte/ansicht.tsx`/`graph.tsx`) — die eigentliche
  // Zoom-/Ausrichten-Rechnung bleibt HIER (sie braucht `flaeche`/`graph`/
  // `auswahl`, die nicht sinnvoll in `vis-runtime.ts` leben, s. dortiger
  // Kopfkommentar). `nonce` erzwingt IMMER einen neuen Effekt-Lauf, auch bei
  // zweimal demselben Typ hintereinander (sonst würde ein identisches
  // `{typ, nonce}`-Objekt den Effekt beim zweiten Klick auf denselben Knopf
  // gar nicht erst feuern lassen). Ausserhalb des Island-Modus bleibt
  // `canvasBefehl` immer `null` (kein Aufrufer setzt es dort) — der Effekt
  // ist dann ein No-Op, byte-gleiches Bestandsverhalten.
  useEffect(() => {
    if (!canvasBefehl) return;
    switch (canvasBefehl.typ) {
      case 'zoom-in':
        zoomUm(1.25);
        return;
      case 'zoom-out':
        zoomUm(1 / 1.25);
        return;
      case 'zoom-fit':
        zoomFit();
        return;
      case 'ausrichten-x':
        ausrichtenAn('x');
        return;
      case 'ausrichten-y':
        ausrichtenAn('y');
        return;
      case 'vertikal-verteilen':
        vertikalVerteilen();
        return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasBefehl]);

  /**
   * Bild-Quelle eines Eingangs-Ports — entweder der Lauf eines verbundenen
   * Render-Nodes (Bridge-Artefakt) ODER (v0.6.7 P0) eine Viewport-Aufnahme:
   * derselbe `bild`-Port, zwei ehrlich unterschiedliche Herkünfte. `vergleich`/
   * `blatt` bleiben Bild-Port-kompatibel zu beiden (kein Sonderfall am Ziel-Node).
   */
  const bildQuelle = (
    nodeId: string,
    port: string,
  ): { jobId: string; bild: string; qa?: { verdict: { passed: boolean } } | undefined } | { dataUrl: string } | null => {
    const e = graph.edges.find((e) => e.to === nodeId && e.toPort === port);
    if (!e) return null;
    const quellNode = graph.nodes.find((n) => n.id === e.from);
    if (quellNode?.typ === 'aufnahme') {
      const params = quellNode.params ?? {};
      const aufnahme = waehleAufnahme(aufnahmen, String(params['kamera'] ?? 'aktuell'));
      return aufnahme ? { dataUrl: aufnahme.dataUrl } : null;
    }
    const lauf = laeufe[e.from];
    return lauf && lauf.status === 'fertig' && lauf.jobId && lauf.bild
      ? { jobId: lauf.jobId, bild: lauf.bild, qa: lauf.qa }
      : null;
  };

  const rect = { w: 100 / view.scale, h: 100 / view.scale };
  void rect;

  // W1 Massnahme 5: Porttyp-Legende — nur die Typen, die im aktuellen Graphen
  // tatsächlich vorkommen (kein toter Ballast bei kleinen Graphen).
  const legendeTypen: VisPortTyp[] = [];
  {
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
  }

  // Minimap (Welle 3): sichtbar per Default ab MINIMAP_KNOTEN_MIN Nodes,
  // solange niemand am Toggle-Knopf war; danach gewinnt der Nutzerwille.
  const minimapSichtbar = minimapManuell ?? graph.nodes.length >= MINIMAP_KNOTEN_MIN;
  const minimapAnsicht = berechneMinimapAnsicht(graph.nodes, view, flaeche, MINIMAP_W, MINIMAP_H);
  /** Klick/Drag auf die Minimap: Zielpunkt wird SOFORT das neue Viewport-
   * Zentrum — kein Easing (erfüllt «keine animierten Sprünge» unter
   * reduced-motion durch Konstruktion). Zoom (`view.scale`) bleibt unberührt. */
  const minimapSpringeZu = (e: { clientX: number; clientY: number; currentTarget: SVGSVGElement }) => {
    const r = e.currentTarget.getBoundingClientRect();
    const ziel = minimapZuNodeRaum(minimapAnsicht, e.clientX - r.left, e.clientY - r.top);
    setView((v) => ({ ...v, cx: ziel.x, cy: ziel.y }));
  };

  // V-H5 (Welle 3, Kuratier-Fläche) + H-36 (V1-Welle Commit 1): jeder
  // Render-Node mit einem fertigen Bild UND jeder aufnahme-Node mit einer
  // vorhandenen Viewport-Aufnahme ist eine Karte — dieselbe Kartenform, zwei
  // ehrlich unterschiedliche Bildquellen (wie `bildQuelle` es fürs Verbinden
  // schon kennt). Laufzeit bleibt in vis-runtime (`laeufe`/`aufnahmen`/
  // `kuration`) — der Graph selbst kennt nur den Node, nie das Bild. Der volle
  // `lauf.qa` (nicht nur `verdict.passed`) wandert mit — die Kuratierfläche
  // (Welle 1) leitet daraus Sterne-Bewertung + Parameter-Diff ab
  // (`varianten-diff.ts`), ohne ein neues Datenfeld im Doc/in vis-runtime.
  const renderKarten: KuratierKartenDaten[] = graph.nodes
    .filter((n) => n.typ === 'render')
    .map((n) => {
      const lauf = laeufe[n.id];
      if (!lauf || lauf.status !== 'fertig' || !lauf.jobId || !lauf.bild) return null;
      const auftrag = auswertung?.renderAuftraege.get(n.id);
      return {
        node: n,
        quelle: { jobId: lauf.jobId, bild: lauf.bild, qa: lauf.qa },
        kur: kuration[n.id] ?? { markiert: false, verworfen: false },
        ...(auftrag ? { auftrag } : {}),
      };
    })
    .filter((k): k is NonNullable<typeof k> => k !== null);
  const aufnahmeKarten: KuratierKartenDaten[] = graph.nodes
    .filter((n) => n.typ === 'aufnahme')
    .map((n) => {
      const gewaehlt = waehleAufnahme(aufnahmen, String((n.params ?? {})['kamera'] ?? 'aktuell'));
      if (!gewaehlt) return null;
      return {
        node: n,
        quelle: { dataUrl: gewaehlt.dataUrl },
        kur: kuration[n.id] ?? { markiert: false, verworfen: false },
      };
    })
    .filter((k): k is NonNullable<typeof k> => k !== null);
  const kuratierKarten: KuratierKartenDaten[] = [...renderKarten, ...aufnahmeKarten];
  const toggleVergleich = (nodeId: string) =>
    setVergleichAuswahl((sel) => {
      if (sel.includes(nodeId)) return sel.filter((id) => id !== nodeId);
      // Genau zwei zur Zeit — die dritte Wahl verdrängt die älteste (FIFO),
      // bleibt so immer sofort bedienbar statt stumm zu blockieren.
      const next = [...sel, nodeId];
      return next.length > 2 ? next.slice(next.length - 2) : next;
    });

  // v0.7.8 Welle 3 (P6, Dock-Migration) — die vier dockbaren Vis-Panels
  // (`state/dock-stationen.ts` `stationsPanels('vis')`) als `DockPanelEintrag[]`
  // für `DockFlaeche` (Muster `DesignWorkspace.tsx`s `designDockPanels`,
  // panels-Render-Map + Sichtbarkeits-Map). BEWUSST OHNE `useMemo` (anders als
  // dort): `designDockPanels` durfte über Panel-Toggles hinweg stabil bleiben,
  // weil Design-Panel-Sichtbarkeit selten wechselt — hier hängt der Inhalt an
  // `view`/`flaeche` (Minimap) und `auswahl` (Ausrichten), die bei JEDEM Pan/
  // Zoom/Klick wechseln; eine Memoisierung mit vollständigen Deps würde bei
  // praktisch jedem Render ohnehin neu bauen, brächte also keinen Gewinn, nur
  // eine lange Deps-Liste. Testids bleiben BYTE-GLEICH — nur der ehemalige
  // `position:absolute`-Wrapper jedes Overlays entfällt (den liefert jetzt
  // `DockPanel.tsx`s Rechteck). Minimap/Legende waren bisher EIN gemeinsamer
  // Flex-Container («unten links, EIN verankerter Stapel») — als Dock-Floats
  // sind es jetzt ZWEI getrennte Panels (dokumentierte Abweichung, s.
  // `dock-stationen.ts`-Kopfkommentar zu `VIS_PANELS`/Abschlussbericht P6);
  // die Registry-Reihenfolge dort hält die Minimap trotzdem optisch über der
  // Legende.
  const visDockPanels: DockPanelEintrag[] = [
    {
      id: 'visPalette',
      sichtbar: paletteOffen,
      schliessen: paletteSchliessen,
      inhalt: (
        <div data-testid="vis-palette" className="vis-palette">
          {KATEGORIE_REIHENFOLGE.map((kat) => {
            const eintraege = Object.values(VIS_NODE_KATALOG).filter((t) => t.kategorie === kat);
            if (eintraege.length === 0) return null;
            return (
              <div key={kat} data-testid={`vis-palette-kategorie-${kat}`}>
                <div className="vis-palette-kat-kopf">
                  <span aria-hidden className="vis-palette-kat-strich" style={{ ['--_farbe' as string]: VIS_KATEGORIE_HUE[kat] }} />
                  <span className="vis-palette-kat-label">
                    {KATEGORIE_LABEL[kat]}
                  </span>
                </div>
                <div className="vis-palette-kat-liste">
                  {eintraege.map((t) => (
                    <button
                      key={t.typ}
                      type="button"
                      className="k-druck vis-palette-eintrag"
                      data-testid={`vis-palette-eintrag-${t.typ}`}
                      title={t.hilfe}
                      onClick={() => onNodeHinzu?.(t.typ)}
                    >
                      <KIcon name={KATEGORIE_ICON[kat]} size={14} className="vis-palette-eintrag-icon" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      // V1-Welle Commit 1: Ausrichten-Leiste — nur bei ≥2 ausgewählten Nodes
      // (Daten-Guard, kein Toggle/`schliessen`).
      id: 'visAusrichten',
      sichtbar: auswahl.size >= 2,
      inhalt: (
        <div
          data-testid="vis-ausrichten-leiste"
          // Karten-Optik wie vor der Dock-Migration (der `--schlank`-
          // Panel-Rahmen ist bewusst transparent, s. dock-flaeche.css —
          // der Inhalt bringt sein Aussehen selbst mit, wie die
          // Viewport-HUDs mit ihrem `.k-glass`).
          className="vis-ausrichten-leiste"
        >
          <KButton size="sm" tone="ghost" data-testid="vis-ausrichten-links" title="Links ausrichten" onClick={() => ausrichtenAn('x')}>
            Links
          </KButton>
          <KButton size="sm" tone="ghost" data-testid="vis-ausrichten-oben" title="Oben ausrichten" onClick={() => ausrichtenAn('y')}>
            Oben
          </KButton>
          <KButton size="sm" tone="ghost" data-testid="vis-vertikal-verteilen" title="Vertikal verteilen" onClick={vertikalVerteilen}>
            Verteilen
          </KButton>
        </div>
      ),
    },
    {
      // Porttyp-Legende (W1 Massnahme 5) — Daten-Guard: Graph hat Nodes UND
      // mindestens einen bekannten Porttyp.
      id: 'visLegende',
      sichtbar: graph.nodes.length > 0 && legendeTypen.length > 0,
      inhalt: (
        <div data-testid="vis-legende" className="vis-legende-panel">
          {legendeTypen.map((t) => (
            <div key={t} className="vis-legende-zeile">
              <span aria-hidden className="vis-legende-punkt" style={{ ['--_farbe' as string]: PORT_FARBE[t] }} />
              <span>{PORT_TYP_NAME[t]}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      // Minimap (Welle 3) — Daten-Guard: Graph hat Nodes UND (Default-Schwelle
      // ODER manuell eingeschaltet, `minimapSichtbar`). Der Toggle-Knopf
      // (`vis-minimap-toggle`) bleibt fixe Chrome unten links (unten im JSX).
      id: 'visMinimap',
      sichtbar: graph.nodes.length > 0 && minimapSichtbar,
      inhalt: (
        <svg
          data-testid="vis-minimap"
          width={MINIMAP_W}
          height={MINIMAP_H}
          viewBox={`0 0 ${MINIMAP_W} ${MINIMAP_H}`}
          className="vis-minimap-svg"
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
            minimapSpringeZu(e);
          }}
          onPointerMove={(e) => {
            // Nur bei gedrückter Haupttaste nachziehen (Drag) — reiner
            // Hover soll den Viewport nicht verschieben.
            if (e.buttons !== 1) return;
            minimapSpringeZu(e);
          }}
        >
          {graph.nodes.map((n) => {
            const kat = VIS_NODE_KATALOG[n.typ];
            if (!kat) return null;
            const x = (n.x - minimapAnsicht.minX) * minimapAnsicht.scale + minimapAnsicht.offsetX;
            const y = (n.y - minimapAnsicht.minY) * minimapAnsicht.scale + minimapAnsicht.offsetY;
            const w = Math.max(2, NODE_W * minimapAnsicht.scale);
            const h = Math.max(2, nodeHoehe(n) * minimapAnsicht.scale);
            return <rect key={n.id} x={x} y={y} width={w} height={h} fill={VIS_KATEGORIE_HUE[kat.kategorie]} opacity={0.8} />;
          })}
          {(() => {
            const vw = flaeche.w / view.scale;
            const vh = flaeche.h / view.scale;
            const x = (view.cx - vw / 2 - minimapAnsicht.minX) * minimapAnsicht.scale + minimapAnsicht.offsetX;
            const y = (view.cy - vh / 2 - minimapAnsicht.minY) * minimapAnsicht.scale + minimapAnsicht.offsetY;
            return (
              <rect
                data-testid="vis-minimap-viewport"
                x={x}
                y={y}
                width={vw * minimapAnsicht.scale}
                height={vh * minimapAnsicht.scale}
                fill="none"
                stroke="var(--k-ink)"
                strokeWidth={1.5}
                pointerEvents="none"
              />
            );
          })()}
        </svg>
      ),
    },
  ];

  return (
    <div className="vis-canvas-wrap">
    <svg
      ref={svgRef}
      data-testid="node-canvas"
      // PC1 (`docs/V084-SPEZ.md` §5 W2, Punkt 5): `data-cursor-zone="eigen"`
      // ist seit PA1 tot — `CursorEbene.tsx` versteckt sich seither NICHT
      // mehr über Zonen-Heuristiken (die «buggende Maus», D1), sondern folgt
      // ausschliesslich dem berechneten Cursor (`formVonComputedCursor`,
      // `CursorEbene.tsx:76-82`). Entfernt statt als Leiche stehen gelassen
      // (dieselbe Regel wie die tote PD2-Hinweis-Entfernung, v0.8.3 P10).
      className="vis-canvas-svg"
      viewBox={(() => {
        const w = flaeche.w / view.scale;
        const h = flaeche.h / view.scale;
        return `${view.cx - w / 2} ${view.cy - h / 2} ${w} ${h}`;
      })()}
      onPointerDown={(e) => {
        if (e.target === svgRef.current) {
          // V1-Welle Commit 1: Shift auf leerer Fläche startet die Marquee-
          // Auswahl statt zu pannen — OHNE Shift bleibt Pan exakt wie bisher
          // (Testpunkt (30,30) + bestehende Pan-Tests unangetastet).
          if (e.shiftKey) {
            const p = toCanvas(e.clientX, e.clientY);
            setMarquee({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
            (e.target as Element).setPointerCapture?.(e.pointerId);
            return;
          }
          panning.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
          // Wie beim Node-Kopf-Griff (unten) mit `?.` statt blankem Aufruf:
          // ein zwischenzeitlich schon abgelaufener/losgelassener Pointer
          // (schnelle Klickfolge, manche Browser/Webviews) darf das Pannen
          // selbst nicht zum Fehler machen — die Position tracken wir ohnehin
          // per pointermove auf dem svg, Capture ist nur die Komfort-Zugabe.
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setAuswahlEdge(null);
        }
      }}
      onPointerMove={(e) => {
        // V1-Welle Commit 1: Marquee zuerst — sie schliesst Pan/Drag/Pending
        // in derselben Geste per Konstruktion aus (Pan startet gar nicht,
        // wenn Shift gedrückt war; s. onPointerDown).
        if (marquee) {
          const p = toCanvas(e.clientX, e.clientY);
          setMarquee({ ...marquee, x1: p.x, y1: p.y });
          return;
        }
        // F6 (v0.6.4): NICHT panning.current im setView-Updater lesen — die
        // Updater-Funktion läuft erst, wenn React den Zustand tatsächlich
        // verarbeitet, was NACH diesem Event liegen kann. Feuert dazwischen
        // ein pointerup (setzt panning.current = null, z.B. bei einem
        // schnellen Los-/Klick-Ende), lesen ältere, noch nicht geflushte
        // pointermove-Updater den Ref dann als null — «Cannot read properties
        // of null (reading 'cx')», von der KFehlerzone gefangen (Owner-Befund
        // F6: Absturz beim Pannen des Node-Trees). Fix: den Anfangszustand
        // JETZT in eine lokale Konstante schnappen — die bleibt stabil, ganz
        // gleich, was mit dem Ref danach passiert.
        const anfang = panning.current;
        if (anfang) {
          const { clientX, clientY } = e;
          setView((v) => ({
            ...v,
            cx: anfang.cx - (clientX - anfang.x) / view.scale,
            cy: anfang.cy - (clientY - anfang.y) / view.scale,
          }));
          return;
        }
        if (drag) {
          const p = toCanvas(e.clientX, e.clientY);
          setDrag({ ...drag, curPX: p.x, curPY: p.y });
        }
        if (pending) {
          const p = toCanvas(e.clientX, e.clientY);
          setPending({ ...pending, x: p.x, y: p.y });
        }
      }}
      onPointerUp={() => {
        panning.current = null;
        // V1-Welle Commit 1: Marquee committet die Box-Auswahl (jeder Node,
        // dessen Bounding-Box die Marquee-Box berührt — Overlap-Test).
        if (marquee) {
          const x0 = Math.min(marquee.x0, marquee.x1);
          const x1 = Math.max(marquee.x0, marquee.x1);
          const y0 = Math.min(marquee.y0, marquee.y1);
          const y1 = Math.max(marquee.y0, marquee.y1);
          const getroffen = graph.nodes
            .filter((n) => {
              const h = nodeHoehe(n, offenerKlapptext);
              return n.x < x1 && n.x + NODE_W > x0 && n.y < y1 && n.y + h > y0;
            })
            .map((n) => n.id);
          setAuswahl(new Set(getroffen));
          setMarquee(null);
        }
        // Gruppen-Drag-Commit: EIN Command je bewegtem Node, bei Mehrfach-
        // auswahl in EINER beginGroup/endGroup-Klammer — EIN Undo-Schritt
        // (Muster VisWorkspace.tsx:126-188). Grid-Snap (24px, Toggle
        // `vis-snap-toggle`) rundet die Zielposition, wenn aktiv. Ein reiner
        // Klick ohne Bewegung committet NICHTS (kein Leer-Patch fürs Undo).
        if (drag) {
          const bewegt = drag.curPX !== drag.startPX || drag.curPY !== drag.startPY;
          if (bewegt) {
            const dx = drag.curPX - drag.startPX;
            const dy = drag.curPY - drag.startPY;
            const eintraege = Object.entries(drag.start);
            sicher(() => {
              const { history } = useProject.getState();
              history.beginGroup();
              try {
                for (const [nodeId, s] of eintraege) {
                  const zielX = Math.round(s.x + dx);
                  const zielY = Math.round(s.y + dy);
                  runCommand('vis.nodeSchieben', {
                    graphId,
                    nodeId,
                    x: snapAktiv ? snap24(zielX) : zielX,
                    y: snapAktiv ? snap24(zielY) : zielY,
                  });
                }
              } finally {
                history.endGroup();
              }
            });
          }
          setDrag(null);
        }
        if (pending) setPending(null);
      }}
    >
      {/* Punktraster — leise Orientierung */}
      <defs>
        <pattern id="vis-raster" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="var(--k-line)" />
        </pattern>
      </defs>
      <rect x={view.cx - 4000} y={view.cy - 4000} width={8000} height={8000} fill="url(#vis-raster)" pointerEvents="none" />

      {/* Kanten */}
      {graph.edges.map((e) => {
        const von = graph.nodes.find((n) => n.id === e.from);
        const zu = graph.nodes.find((n) => n.id === e.to);
        if (!von || !zu) return null;
        const a = portPos(nodePos(von), e.fromPort, 'out');
        const b = portPos(nodePos(zu), e.toPort, 'in');
        const typ = VIS_NODE_KATALOG[von.typ]?.outputs.find((p) => p.name === e.fromPort)?.typ ?? 'prompt';
        const gewaehlt = auswahlEdge === e.id;
        const gehovert = hoverEdge === e.id;
        // W1 Massnahme 5: Trenn-✕ bleibt IMMER im DOM (E2E hovert dann klickt);
        // Sichtbarkeit läuft über CSS-Opazität, nicht über Mount/Unmount —
        // sonst könnte ein Klick den Knopf treffen, bevor er real gerendert ist.
        const trennenSichtbar = gehovert || gewaehlt;
        return (
          <g
            key={e.id}
            data-testid="vis-edge"
            onPointerEnter={() => setHoverEdge(e.id)}
            onPointerLeave={() => setHoverEdge((h) => (h === e.id ? null : h))}
          >
            <path
              d={edgePfad(a, b, routingModus)}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              className="vis-edge-hit"
              onPointerDown={(ev) => {
                ev.stopPropagation();
                setAuswahlEdge(e.id);
              }}
            />
            <path
              d={edgePfad(a, b, routingModus)}
              fill="none"
              stroke={gewaehlt ? 'var(--k-accent)' : PORT_FARBE[typ]}
              strokeWidth={gewaehlt ? 2.5 : gehovert ? 2 : 1.5}
              opacity={0.85}
              pointerEvents="none"
              className="k-uebergang-schnell"
            />
            <g
              transform={`translate(${(a.x + b.x) / 2}, ${(a.y + b.y) / 2})`}
              className={`k-uebergang-schnell vis-edge-trennen${trennenSichtbar ? ' vis-edge-trennen--sichtbar' : ''}`}
              data-testid="edge-trennen"
              onPointerDown={(ev) => {
                ev.stopPropagation();
                sicher(() => runCommand('vis.trennen', { graphId, edgeId: e.id }));
                setAuswahlEdge(null);
                setHoverEdge(null);
              }}
            >
              {/* .k-druck sitzt auf einer INNEREN Gruppe ohne eigenes
                  `transform`-Attribut — die ÄUSSERE Gruppe trägt die
                  Positionierung (translate); CSS-`transform` (das `.k-druck`
                  bei :active setzt) würde ein `transform`-ATTRIBUT sonst
                  ersetzen statt ergänzen und den Knopf beim Drücken an den
                  SVG-Ursprung springen lassen. */}
              <g className="k-druck">
                <title>Verbindung trennen</title>
                <circle r={9} fill="var(--k-raised)" stroke="var(--k-danger)" />
                <KIcon name="schliessen" size={14} x={-7} y={-7} className="vis-edge-trennen-icon" />
              </g>
            </g>
          </g>
        );
      })}

      {/* Pending-Kante folgt dem Zeiger */}
      {pending && (() => {
        const von = graph.nodes.find((n) => n.id === pending.from);
        if (!von) return null;
        const a = portPos(nodePos(von), pending.fromPort, 'out');
        return (
          <path
            d={edgePfad(a, { x: pending.x, y: pending.y }, routingModus)}
            fill="none"
            stroke={PORT_FARBE[pending.typ]}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            pointerEvents="none"
          />
        );
      })()}

      {/* V1-Welle Commit 1: Marquee-Auswahlbox (Shift+Drag auf leerer Fläche) —
          Akzent-Rahmen, kein Fill (dezent), folgt dem Zeiger bis pointerup. */}
      {marquee && (
        <rect
          data-testid="vis-marquee"
          x={Math.min(marquee.x0, marquee.x1)}
          y={Math.min(marquee.y0, marquee.y1)}
          width={Math.abs(marquee.x1 - marquee.x0)}
          height={Math.abs(marquee.y1 - marquee.y0)}
          fill="var(--k-accent)"
          fillOpacity={0.06}
          stroke="var(--k-accent)"
          strokeWidth={1}
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}

      {/* Nodes */}
      {graph.nodes.map((n0) => {
        const n = nodePos(n0);
        const kat = VIS_NODE_KATALOG[n.typ];
        if (!kat) return null;
        const h = nodeHoehe(n0, offenerKlapptext);
        const lauf = laeufe[n.id];
        const auftrag = auswertung?.renderAuftraege.get(n.id);
        // H-32-Fix (V1-Welle Auflage 0, docs/SIM-BEFUNDE.md): der Veraltet-
        // Vergleich MUSS denselben kombinierten Prompt (roh + Formular-Zusatz)
        // nutzen wie `ausfuehren()` beim Absenden — sonst bleibt ein Render mit
        // gesetzten Formularfeldern für immer «veraltet» (memoKey-Schiefe).
        // `auftrag` selbst bleibt RAW (geht als `eingehenderPrompt` an
        // NodeKoerper, das den Formular-Zusatz SELBST anhängt — sonst
        // erschiene er im Text doppelt).
        const veraltetAuftrag = auftrag
          ? { ...auftrag, prompt: kombiniertePrompt(auftrag.prompt, formularZusatz(n0.params ?? {})) }
          : undefined;
        const veraltet = lauf && veraltetAuftrag && lauf.memoKey !== memoKey(veraltetAuftrag);
        const koerperY = KOPF_H + 8 + Math.max(kat.inputs.length, kat.outputs.length) * PORT_ABSTAND;
        // W1 Massnahme 1: Kategorie-Icon + 2px-Tonstreifen (Hue aus dem
        // Kernel-Katalog, Zeichen aus der KIcon-Registry je Kategorie).
        const kategorieFarbe = VIS_KATEGORIE_HUE[kat.kategorie];
        const kategorieIcon = KATEGORIE_ICON[kat.kategorie];
        const istAusgewaehlt = auswahl.has(n.id);
        // v0.8.0B / P5 (Spez §3 B-44, KPipelineNode-Anatomie): running-Puls
        // NUR am laufenden Render-Node (Gesetz 7 — Glow ist Informations-
        // zustand, nie Deko). Dieselbe Statusmenge wie `laeuftNoch` unten in
        // `NodeKoerper` (`gesendet/wartetFreigabe/wartetGpu/rendert`) — EIN
        // Wahrheitsbegriff für «läuft», hier nur auf den Kartenrahmen gespiegelt.
        const nodeLaeuft = n.typ === 'render' && !!lauf && (OFFENE_LAUF_STATUS as readonly string[]).includes(lauf.status);
        return (
          <g key={n.id} transform={`translate(${n.x}, ${n.y})`} data-testid={`vis-node-${n.typ}`}>
            {/* Karte mit geschnittener Ecke (Karteikarten-Verwandter) — Form/
                Layout unangetastet; Rand folgt jetzt der KPipelineNode-
                Anatomie (1.5px Rollenborder 55%, running-Puls nur bei
                laufendem Status, `vis-visual.css`). */}
            <path
              d={`M 0 0 H ${NODE_W - 12} L ${NODE_W} 12 V ${h} H 0 Z`}
              fill="var(--vis-node-flaeche)"
              className={`vis-node-karte${nodeLaeuft ? ' vis-node-karte--laeuft' : ''}`}
              style={{ ['--_rolle' as string]: kategorieFarbe }}
            />
            {/* V1-Welle Commit 1: Akzent-Rahmen (Tusche, kein Fill) für
                ausgewählte Nodes — Marquee/Klick/Shift-Klick setzen `auswahl`. */}
            {istAusgewaehlt && (
              <rect
                data-testid="vis-node-ausgewaehlt"
                x={-3}
                y={-3}
                width={NODE_W + 6}
                height={h + 6}
                fill="none"
                stroke="var(--k-accent)"
                strokeWidth={1.5}
                className="vis-node-ausgewaehlt-rahmen"
              />
            )}
            {/* Kopf = Drag-Griff (V1-Welle Commit 1: + Auswahl-Logik) */}
            <g
              className="vis-node-kopf-griff"
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.shiftKey) {
                  setAuswahl((s) => {
                    const next = new Set(s);
                    if (next.has(n.id)) next.delete(n.id);
                    else next.add(n.id);
                    return next;
                  });
                  return;
                }
                // Ein Klick auf einen bereits mehrfach ausgewählten Node hält
                // die Gruppe (Gruppen-Drag); sonst ersetzt der Klick die
                // Auswahl durch genau diesen Node (Einzelauswahl). IMMER ein
                // FRISCHES Set (auch wenn inhaltlich gleich) — dieselbe
                // Set-Referenz an setAuswahl zurückzugeben liess Chromium/
                // Playwright das nachfolgende Pointer-Capture-Drag(!) verlieren
                // (kein Bug im Muster selbst, aber ein neues Set kostet nichts
                // und ist die robuste Seite).
                const effektiv = auswahl.has(n.id) && auswahl.size > 1 ? new Set(auswahl) : new Set([n.id]);
                setAuswahl(effektiv);
                const p = toCanvas(e.clientX, e.clientY);
                const start: Record<string, { x: number; y: number }> = {};
                for (const id of effektiv) {
                  const nd = graph.nodes.find((x) => x.id === id);
                  if (nd) start[id] = { x: nd.x, y: nd.y };
                }
                setDrag({ start, startPX: p.x, startPY: p.y, curPX: p.x, curPY: p.y });
                (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture?.(e.pointerId);
              }}
            >
              <rect width={NODE_W} height={KOPF_H} fill="transparent" />
              <KIcon name={kategorieIcon} size={14} x={8} y={6} className="vis-node-icon-soft" />
              <text x={28} y={17} fontSize={11.5} fontWeight={650} fill="var(--vis-node-tinte)" className="vis-node-kopf-label">
                {kat.label}
              </text>
              {/* V1-Welle Commit 2: Node-Kollaps — nur Kopf+Ports sichtbar
                  (nodeHoehe/portY berücksichtigen `collapsed`). Ein laufender
                  Render-Job (Status weder «bereit» noch «fertig») blockiert
                  den Kollaps mit einem ehrlichen Hinweis statt still zu tun. */}
              <g
                className="k-druck vis-node-knopf"
                data-testid="node-kollaps"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (kollapsBlockiert(n0)) {
                    melde('Render läuft noch — erst wenn er fertig ist, lässt sich der Node einklappen.', { ton: 'info' });
                    return;
                  }
                  sicher(() => runCommand('vis.nodeKollabieren', { graphId, nodeId: n.id, collapsed: !n0.collapsed }));
                }}
              >
                <title>{n0.collapsed ? 'Node aufklappen' : 'Node einklappen'}</title>
                {/* D7-Fund (V089-SPEZ §2): das Chevron-Icon allein ist nur an
                    seinen Glyph-Strichen hit-testbar — Klicks daneben (aber
                    noch im Kopf) fielen durch auf die grössere, darunter-
                    liegende Kopf-Drag-Rect (:1343) und lösten einen
                    versehentlichen Node-Drag statt des Kollaps aus (die zwei
                    bisherigen force:true in vis-editor.spec.ts waren die
                    Krücke dafür). Eigene transparente Hit-Fläche als erstes
                    (unterstes) Kind deckt die volle Icon-Bbox (x 160–174,
                    y 6–20) mit Rand ab, bleibt aber vor der Löschen-Zone
                    (ab x=178) stehen — Drag am restlichen Kopf ist
                    unverändert, weil dieser g weiterhin vor der Drag-Rect
                    gemalt wird (Dokumentreihenfolge = Trefferpriorität). */}
                <rect x={NODE_W - 48} y={3} width={24} height={20} fill="transparent" />
                <KIcon
                  name={n0.collapsed ? 'pfeil-unten' : 'pfeil-oben'}
                  size={14}
                  x={NODE_W - 40}
                  y={6}
                  className="vis-node-icon-faint"
                />
              </g>
              <g
                className="k-druck vis-node-knopf"
                data-testid="node-loeschen"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  sicher(() => runCommand('vis.nodeLoeschen', { graphId, nodeId: n.id }));
                }}
              >
                <title>Node löschen</title>
                <KIcon name="schliessen" size={14} x={NODE_W - 22} y={6} className="vis-node-icon-faint" />
              </g>
            </g>
            {/* Tonstreifen (W1): zurückhaltender Kategorie-Hue, 2px, ersetzt die
                bisherige neutrale Hairline unter dem Kopf. */}
            <rect x={0} y={KOPF_H} width={NODE_W} height={2} fill={kategorieFarbe} />

            {/* Eingänge links */}
            {kat.inputs.map((p, i) => {
              const y = portY(n, i);
              return (
                <g key={p.name}>
                  <circle
                    cx={-PORT_ABSATZ}
                    cy={y}
                    r={5}
                    fill={graph.edges.some((e) => e.to === n.id && e.toPort === p.name) ? PORT_FARBE[p.typ] : 'var(--vis-node-flaeche)'}
                    stroke={PORT_FARBE[p.typ]}
                    strokeWidth={1.5}
                    data-testid={`port-in-${p.name}`}
                  />
                  {/* 16-px-Hitkreis */}
                  <circle
                    cx={-PORT_ABSATZ}
                    cy={y}
                    r={11}
                    fill="transparent"
                    className="vis-node-port-hit"
                    onPointerUp={(e) => {
                      if (!pending) return;
                      e.stopPropagation();
                      sicher(() =>
                        runCommand('vis.verbinden', {
                          graphId,
                          from: pending.from,
                          fromPort: pending.fromPort,
                          to: n.id,
                          toPort: p.name,
                        }),
                      );
                      setPending(null);
                    }}
                  />
                  <text x={10} y={y + 3.5} fontSize={10} fill="var(--vis-node-tinte)">{p.label}</text>
                </g>
              );
            })}

            {/* Ausgänge rechts */}
            {kat.outputs.map((p, i) => {
              const y = portY(n, i);
              return (
                <g key={p.name}>
                  <circle cx={NODE_W + PORT_ABSATZ} cy={y} r={5} fill={PORT_FARBE[p.typ]} stroke={PORT_FARBE[p.typ]} data-testid={`port-out-${p.name}`} />
                  <circle
                    cx={NODE_W + PORT_ABSATZ}
                    cy={y}
                    r={11}
                    fill="transparent"
                    className="vis-node-port-hit"
                    onPointerDown={(e) => {
                      // KEIN Pointer-Capture: das pointerup muss den Ziel-Port treffen
                      e.stopPropagation();
                      const pos = toCanvas(e.clientX, e.clientY);
                      setPending({ from: n.id, fromPort: p.name, typ: p.typ, x: pos.x, y: pos.y });
                    }}
                  />
                  <text x={NODE_W - 10} y={y + 3.5} fontSize={10} textAnchor="end" fill="var(--vis-node-tinte)">{p.label}</text>
                </g>
              );
            })}

            {/* Körper je Typ — V1-Welle Commit 2: eingeklappte Nodes zeigen NUR
                Kopf + Ports, kein Körper. pointer-events AUS, solange ein
                Drag/eine Marquee läuft (V1-Welle Commit 1) — der Zeiger kann
                sonst während des Ziehens über ein HTML-Formularelement im
                foreignObject (z.B. eine `prompt-text`-Textarea, auch eines
                FREMDEN Nodes) laufen und native Text-Interaktion auslösen.
                Ausserhalb eines Drags unverändert interaktiv. */}
            {!n0.collapsed && (
              <foreignObject
                x={8}
                y={koerperY}
                width={NODE_W - 16}
                height={h - koerperY - 8}
                className={drag || marquee ? 'vis-node-koerper--gesperrt' : undefined}
              >
                <NodeKoerper
                  graphId={graphId}
                  node={n0}
                  prompt={auswertung?.werte.get(n.id)?.['prompt'] as string | undefined}
                  material={auswertung?.werte.get(n.id)?.['material'] as string | undefined}
                  eingehenderPrompt={auftrag?.prompt ?? ''}
                  lauf={lauf}
                  veraltet={!!veraltet}
                  onAusfuehren={() => ausfuehren(n.id)}
                  onFreigeben={() => freigeben(n.id)}
                  onAbbrechen={() => abbrechen(n.id)}
                  cloudLeer={bridgeBase() === ''}
                  bildQuelle={bildQuelle}
                  aufnahmen={aufnahmen}
                  offen={offenerKlapptext.has(n.id)}
                  onToggleOffen={() => toggleKlapptext(n.id)}
                />
              </foreignObject>
            )}
          </g>
        );
      })}
    </svg>

    {/* Node-Palette (Welle 3): der Umschalt-Knopf bleibt fixe Chrome — der
        Inhalt (kategorisierte, klickbare Fläche ZUSÄTZLICH zum nativen
        `node-hinzu`-Select in der Werkzeugzeile, VisWorkspace — der bleibt
        der E2E-Vertrag) rendert seit v0.7.8 Welle 3 (P6) als `visPalette`-
        Dock-Panel (s. `visDockPanels` oben), sein `position:absolute`-
        Wrapper ist entfallen. `top: 56` statt 12: (30, 30) relativ zum
        Canvas ist ein bestehender E2E-Vertrag (visgraph.spec.ts + diese
        Datei) — «irgendwo ins leere Canvas klicken, um ein Textfeld zu
        blur(en)». Bei top:12 lag der Palette-Knopf GENAU über diesem Punkt
        und fing den Klick ab.
        zIndex 32 statt 5 (P6): über den Dock-Panels (z-14 gedockt / z-30
        schwebend, `DockPanel.tsx`) — im B-Modus routet der Solver die
        bottom-left-Floats (Minimap/Legende) in die LINKE SPALTE, deren
        Panels genau diesen Knopf überdeckten (Playwright: «subtree
        intercepts pointer events»). Dasselbe «Chrome gewinnt den Klick per
        z-Ordnung»-Muster wie Boden-Dock/Kosmo-Symbol (z-108/110) über den
        Design-Panels, s. `DockFlaeche.tsx`-Kopfkommentar. Bewusst UNTER der
        Kuratier-Fläche (z-35, `KuratierFlaeche.tsx`) — während der Kuration
        bleibt dieser Knopf wie bisher verdeckt.
        PC1 (V084-SPEZ C-15): im Island-Modus entfällt dieser Knopf — sein
        Ziel (die `visPalette`-Dock-Panel-Fläche) rendert dort gar nicht mehr
        (DockFlaeche unten ausgeblendet), die Node-Palette lebt jetzt als
        eigenes Werkzeug in der GRAPH-Insel (`island/inhalte/graph.tsx`). Der
        Kuratier-Toggle rechts (unten) bleibt in JEDEM Modus — Kuratieren hat
        keine Insel-Entsprechung im PC1-Auftrag und darf nicht unerreichbar
        werden (Bestandsschutz-Geist über die Islands hinaus). */}
    {!islandModus && (
    <div className="vis-chrome-topleft">
      <KButton
        size="sm"
        tone="ghost"
        data-testid="vis-palette-toggle"
        title="Node-Palette"
        aria-label="Node-Palette"
        aria-expanded={paletteOffen}
        onClick={paletteUmschalten}
      >
        <KIcon name="ordner" size={16} title="Node-Palette" />
      </KButton>
    </div>
    )}

    {/* Kuratier-Fläche (Welle 1 — Soll-Bild `Kosmo Viz Kuratierung.dc.html`
        §6.2): vom schwebenden Overlay zum Vollflächen-Raster ausgebaut
        (`KuratierFlaeche.tsx`) — 3-spaltiges Karten-Raster ODER A/B-Vergleich
        mit Parameter-Diff, Filter (Alle/Favoriten/Verworfen), Kurations-
        Inspektor. Der Umschalt-Knopf bleibt oben rechts über der Fläche
        erreichbar (schliessen). Laufzeitdaten (Bild/Kuration) bleiben in
        vis-runtime — der Doc kennt nur die Nodes.
        zIndex 36 statt 9 (P6): die Kuratier-Fläche selbst liegt jetzt bei
        z-35 (über den Dock-Panels z-14/30, wie sie vorher mit 8 über den
        z-5-Overlays lag) — der Schliessen-Knopf muss weiterhin EINE Stufe
        darüber bleiben. */}
    <div className="vis-chrome-topright">
      <KButton
        size="sm"
        tone="ghost"
        data-testid="vis-kuratier-toggle"
        title="Kuratieren"
        aria-label="Kuratieren"
        aria-expanded={kuratierOffen}
        onClick={() => setKuratierOffen((o) => !o)}
      >
        <KIcon name={kuratierOffen ? 'schliessen' : 'stern'} size={16} title="Kuratieren" />
        {kuratierKarten.length > 0 && (
          <span className="vis-kuratier-zaehler">{kuratierKarten.length}</span>
        )}
      </KButton>
    </div>
    {kuratierOffen && (
      <KuratierFlaeche
        graph={graph}
        karten={kuratierKarten}
        vergleichAuswahl={vergleichAuswahl}
        onMarkieren={markiereBild}
        onVerwerfen={verwerfeBild}
        onVergleichWahl={toggleVergleich}
      />
    )}

    {/* Zoom-Steuerleiste (W1 Massnahme 4) — schwebend unten rechts, bleibt
        fixe Chrome (P6-Scope-Entscheid: Statuszeilen-Charakter wie der
        Design-Zoom in P5, wandert NICHT ins Dock). `bottom: 92` statt 12:
        das globale Kosmo-Symbol (KosmoSymbol.tsx, fixed right:22/bottom:22,
        zIndex 110) sitzt GENAU in der Ecke und würde bei 12px sonst die
        Hälfte des Zoom-Plus-Knopfs verdecken (unklickbar).
        zIndex 32 (P6, vorher auto): über den Dock-Panels — ein nach rechts
        gezogenes/gedocktes Panel darf die Zoom-/Snap-/Routing-Knöpfe nie
        unklickbar machen (gleiche Begründung wie beim Palette-Toggle oben).
        PC1 (V084-SPEZ C-15): dieser ganze Block rendert NUR noch ausserhalb
        des Island-Modus — Zoom/Fit/Snap/Routing wandern in die ANSICHT-Insel
        (`island/inhalte/ansicht.tsx`), die dieselben `vis-runtime.ts`-Felder
        UND denselben Fernauslöser (`canvasBefehl`, Effekt unten) nutzt. */}
    {!islandModus && (
    <div className="vis-chrome-bottomright">
      {/* V1-Welle Commit 1/2: Raster-Snap + Kanten-Routing — Werkzeug-
          Umschalter neben der Zoom-Leiste, fern von Testpunkt (30,30) und
          der Minimap (unten links). */}
      <KButton
        size="sm"
        tone="ghost"
        data-testid="vis-snap-toggle"
        title="Raster-Einrasten (24px)"
        aria-label="Raster-Einrasten"
        aria-pressed={snapAktiv}
        onClick={toggleSnap}
      >
        Raster
      </KButton>
      <KButton
        size="sm"
        tone="ghost"
        data-testid="vis-routing-toggle"
        title="Kanten-Routing"
        aria-label="Kanten-Routing"
        aria-pressed={routingModus === 'ortho'}
        onClick={toggleRouting}
      >
        {routingModus === 'ortho' ? 'Ortho' : 'Kurve'}
      </KButton>
      <KButton size="sm" tone="ghost" data-testid="vis-zoom-minus" title="Kleiner" onClick={() => zoomUm(1 / 1.25)}>
        <KIcon name="zoom-minus" size={16} title="Kleiner" />
      </KButton>
      <KButton size="sm" tone="ghost" data-testid="vis-zoom-fit" title="Einpassen" onClick={zoomFit}>
        <KIcon name="fit" size={16} title="Einpassen" />
      </KButton>
      <KButton size="sm" tone="ghost" data-testid="vis-zoom-plus" title="Grösser" onClick={() => zoomUm(1.25)}>
        <KIcon name="zoom-plus" size={16} title="Grösser" />
      </KButton>
    </div>
    )}

    {/* Minimap-Toggle (Welle 3) bleibt fixe Chrome, unten links — der
        Kartenkörper selbst ist seit v0.7.8 Welle 3 (P6) das `visMinimap`-
        Dock-Panel (Float, `anker:'bottom-left'`, s. `visDockPanels` oben).
        Minimap+Legende waren bisher EIN gemeinsamer Flex-Stapel («unten
        links, EIN verankerter Container») — jetzt ZWEI getrennte Floats
        (dokumentierte Abweichung, s. `dock-stationen.ts`-Kopfkommentar);
        die Registry-Reihenfolge dort hält die Minimap trotzdem optisch über
        der Legende. zIndex 32 (P6): über den Dock-Panels, gleiche Begründung
        wie beim Palette-Toggle oben (B-Modus-Linksspalte).
        PC1 (V084-SPEZ C-15): NUR ausserhalb des Island-Modus — die Minimap
        selbst wandert als Insel-Werkzeug in ANSICHT. */}
    {!islandModus && graph.nodes.length > 0 && (
      <div className="vis-chrome-bottomleft">
        <KButton
          size="sm"
          tone="ghost"
          data-testid="vis-minimap-toggle"
          title="Übersichtskarte"
          aria-label="Übersichtskarte"
          aria-pressed={minimapSichtbar}
          onClick={() => setMinimapManuell(!minimapSichtbar)}
        >
          <KIcon name="ebenen" size={16} title="Übersichtskarte" />
        </KButton>
      </div>
    )}

    {/* PC1 (`docs/V084-SPEZ.md` §5 W2, C-15): Minimap+Legende im Island-Modus
        — die ANSICHT-Insel («Minimap»-Werkzeug, `island/inhalte/ansicht.tsx`)
        trägt nur den TOGGLE (`canvasMinimapManuell`) + eine Kurzerklärung;
        die eigentliche Karte bleibt HIER (sie braucht `graph`/`view`/
        `flaeche`/`minimapAnsicht`, dieselbe Geometrie wie die bisherige
        `visMinimap`-Dock-Panel-Fassung unten) — bewusste JSX-Verdopplung
        statt eines riskanten Umbaus des bestehenden `visDockPanels`-Arrays
        (das bleibt für den Nicht-Island-Modus unangetastet). Position unten
        links, ausserhalb der GRAPH-Insel (links) und der AUSTAUSCH-Insel
        (unten) — `12px`/`52px` hält denselben Randabstand wie die alte
        `.vis-chrome-bottomleft`. */}
    {islandModus && graph.nodes.length > 0 && minimapSichtbar && (
      <div className="vis-island-minimap-overlay" data-testid="vis-island-minimap">
        {/* `.vis-minimap-svg` setzt CSS `width/height:100%` (Dock-Panel-Fassung
            gab die Pixelgrösse über den umschliessenden DockPanel-Rahmen vor)
            — hier gibt es diesen Rahmen nicht, darum die feste Pixelgrösse
            zusätzlich als Inline-Style (gewinnt gegen die 100%-Regel). */}
        <svg
          data-testid="vis-minimap"
          width={MINIMAP_W}
          height={MINIMAP_H}
          viewBox={`0 0 ${MINIMAP_W} ${MINIMAP_H}`}
          className="vis-minimap-svg"
          style={{ width: MINIMAP_W, height: MINIMAP_H }}
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
            minimapSpringeZu(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 1) return;
            minimapSpringeZu(e);
          }}
        >
          {graph.nodes.map((n) => {
            const kat = VIS_NODE_KATALOG[n.typ];
            if (!kat) return null;
            const x = (n.x - minimapAnsicht.minX) * minimapAnsicht.scale + minimapAnsicht.offsetX;
            const y = (n.y - minimapAnsicht.minY) * minimapAnsicht.scale + minimapAnsicht.offsetY;
            const w = Math.max(2, NODE_W * minimapAnsicht.scale);
            const h = Math.max(2, nodeHoehe(n) * minimapAnsicht.scale);
            return <rect key={n.id} x={x} y={y} width={w} height={h} fill={VIS_KATEGORIE_HUE[kat.kategorie]} opacity={0.8} />;
          })}
          {(() => {
            const vw = flaeche.w / view.scale;
            const vh = flaeche.h / view.scale;
            const x = (view.cx - vw / 2 - minimapAnsicht.minX) * minimapAnsicht.scale + minimapAnsicht.offsetX;
            const y = (view.cy - vh / 2 - minimapAnsicht.minY) * minimapAnsicht.scale + minimapAnsicht.offsetY;
            return (
              <rect
                x={x}
                y={y}
                width={vw * minimapAnsicht.scale}
                height={vh * minimapAnsicht.scale}
                fill="none"
                stroke="var(--k-ink)"
                strokeWidth={1.5}
                pointerEvents="none"
              />
            );
          })()}
        </svg>
        {legendeTypen.length > 0 && (
          <div data-testid="vis-legende" className="vis-legende-panel" style={{ width: MINIMAP_W, height: 'auto' }}>
            {legendeTypen.map((t) => (
              <div key={t} className="vis-legende-zeile">
                <span aria-hidden className="vis-legende-punkt" style={{ ['--_farbe' as string]: PORT_FARBE[t] }} />
                <span>{PORT_TYP_NAME[t]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* v0.7.8 Welle 3 (P6) — die vier dockbaren Vis-Panels (Palette/
        Ausrichten/Legende/Minimap, `visDockPanels` oben) kollisionsfrei
        gedockt, analog zu `DesignWorkspace.tsx`s `<DockFlaeche station=
        "design" .../>`. Rendert innerhalb DIESES `position:'relative'`-
        Wrappers (statt in `VisWorkspace.tsx`) — die vier Panels hängen eng
        an lokalem NodeCanvas-Zustand (Auswahl/View/Minimap-Geometrie), der
        bei jedem Pan/Zoom/Klick wechselt; das Feld, das `DockFlaeche` misst,
        ist ohnehin identisch (dieser Wrapper füllt exakt den Node-Canvas-
        Bereich UNTER der `VisTabs`-Werkzeugleiste, dieselbe Fläche, die ein
        Sibling in `VisWorkspace.tsx` messen würde) — s. Abschlussbericht P6
        für die volle Begründung dieser Platzierung.
        PC1 (`docs/V084-SPEZ.md` §5 W2, C-15): rendert NUR noch ausserhalb
        des Island-Modus — die vier Panels (Palette/Ausrichten/Legende/
        Minimap) wandern in die GRAPH-/ANSICHT-Inseln, die alte Dock-Fläche
        verschwindet dort ersatzlos (Owner-Auftrag «alte Dock raus»). */}
    {!islandModus && <DockFlaeche station="vis" panels={visDockPanels} />}
    </div>
  );
}

/**
 * SK-V3 (W1): 3-Zeilen-Klapptext — «… mehr» expandiert den Node über den
 * Eltern-State (`offen`/`onToggleOffen`), NICHT lokal, weil die Kartenhöhe
 * (SVG-Pfad + foreignObject) im ELTERN-Node-Canvas berechnet wird.
 */
function KlappText({
  testid,
  text,
  platzhalter,
  offen,
  onToggleOffen,
}: {
  testid: string;
  text: string;
  platzhalter: string;
  offen: boolean;
  onToggleOffen: () => void;
}) {
  const hatText = text.trim().length > 0;
  return (
    <div className="vis-klapptext">
      <div
        data-testid={testid}
        className={[
          'vis-klapptext-text',
          !hatText ? 'vis-klapptext-text--platzhalter' : '',
          !offen ? 'vis-klapptext-text--clamp' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {hatText ? text : platzhalter}
      </div>
      {hatText && (
        <button
          type="button"
          className="k-druck vis-klapptext-mehr"
          data-testid="node-expand"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onToggleOffen}
        >
          {offen ? 'weniger' : '… mehr'}
        </button>
      )}
    </div>
  );
}

/** HTML-Inhalt eines Nodes — Parameter committen bei blur (nie pro Tastendruck). */
function NodeKoerper({
  graphId,
  node,
  prompt,
  material,
  eingehenderPrompt,
  lauf,
  veraltet,
  onAusfuehren,
  onFreigeben,
  onAbbrechen,
  cloudLeer,
  bildQuelle,
  aufnahmen,
  offen,
  onToggleOffen,
}: {
  graphId: string;
  node: VisNode;
  prompt: string | undefined;
  material: string | undefined;
  /** V-H4: der eingehende Prompt am Render-Node (vor dem Formular-Zusatz). */
  eingehenderPrompt: string;
  lauf: { status: string; jobId?: string; bild?: string; qa?: { verdict: { passed: boolean } } | undefined; fehler?: string; worker?: string; progress?: { phase: string; pct: number } } | undefined;
  veraltet: boolean;
  onAusfuehren: () => void;
  onFreigeben: () => void;
  onAbbrechen: () => void;
  cloudLeer: boolean;
  bildQuelle: (
    nodeId: string,
    port: string,
  ) => { jobId: string; bild: string; qa?: { verdict: { passed: boolean } } | undefined } | { dataUrl: string } | null;
  /** v0.6.7 P0: Viewport-Aufnahmen (nur der 'aufnahme'-Node zeigt sich selbst
   * daraus — Quell-Nodes ohne Eingang brauchen die rohe Ablage, nicht `bildQuelle`). */
  aufnahmen: Record<string, Aufnahme>;
  /** SK-V3: ist der Klapptext dieses Nodes offen (lokaler UI-State im Canvas). */
  offen: boolean;
  onToggleOffen: () => void;
}) {
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  const param = (feld: string, wert: string | number | boolean) => {
    try {
      runCommand('vis.nodeParametrieren', { graphId, nodeId: node.id, params: { [feld]: wert } });
    } catch (err) {
      meldeFehler(err);
    }
  };
  // Bug T4a: ein Node OHNE `params` (Hand-Edit/Fremd-Import/Yjs-Merge von
  // einem anderen Stand) darf die Station nie abstürzen lassen — fehlende
  // Parameter zählen wie leere/Default-Werte (Wurzel-Fix in derive/visgraph.ts
  // spiegelt sich hier, weil der Node-Körper dieselben Felder direkt liest).
  const params = node.params ?? {};

  switch (node.typ) {
    case 'modell': {
      const teile = doc.byKind('wall').length + doc.byKind('slab').length + doc.byKind('roof').length;
      return <div className="vis-node-info-zeile">Szene: {teile} Bauteile (GLB)</div>;
    }
    case 'material':
      return (
        <KlappText
          testid="material"
          text={material ?? ''}
          platzhalter="keine Material-Phrasen — Wandaufbauten sprechen mit"
          offen={offen}
          onToggleOffen={onToggleOffen}
        />
      );
    case 'prompt':
      return (
        <textarea
          defaultValue={String(params['text'] ?? '')}
          key={String(params['text'] ?? '')}
          placeholder="Stil-Text …"
          rows={3}
          data-testid="prompt-text"
          onBlur={(e) => e.target.value !== params['text'] && param('text', e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          className="vis-node-feld vis-node-feld--textarea"
        />
      );
    case 'stimmung': {
      const presetKey = String(params['preset'] ?? 'morgen');
      return (
        <div className="vis-node-stimmung-wrap">
          <KSelect
            size="sm"
            value={presetKey}
            data-testid="stimmung-preset"
            onChange={(e) => param('preset', e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="vis-node-select-voll"
          >
            {Object.entries(VIS_STIMMUNGEN).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </KSelect>
          {/* SK-V3: die Stimmungs-Beschreibung (der tatsächliche Prompt-Text
              des Presets) sichtbar — clampt wie kombinierer-prompt/material. */}
          <KlappText
            testid="stimmung-beschrieb"
            text={VIS_STIMMUNGEN[presetKey]?.prompt ?? ''}
            platzhalter="kein Beschrieb"
            offen={offen}
            onToggleOffen={onToggleOffen}
          />
        </div>
      );
    }
    case 'zahl': {
      const min = Number(params['min'] ?? 0);
      const max = Number(params['max'] ?? 1);
      const schritt = Number(params['schritt'] ?? 0.05);
      return (
        <div className="vis-node-zahl-wrap" onPointerDown={(e) => e.stopPropagation()}>
          <input
            type="range"
            key={String(params['wert'] ?? 0)}
            min={min}
            max={max}
            step={schritt}
            defaultValue={Number(params['wert'] ?? 0)}
            data-testid="zahl-regler"
            onPointerUp={(e) => param('wert', Number((e.target as HTMLInputElement).value))}
            className="vis-node-zahl-regler"
          />
          <span className="vis-node-zahl-wert">{Number(params['wert'] ?? 0)}</span>
        </div>
      );
    }
    case 'kombinierer':
      return (
        <KlappText
          testid="kombinierer-prompt"
          text={prompt ?? ''}
          platzhalter="verbinde Stimmung / Stil / Material — der finale Prompt erscheint live"
          offen={offen}
          onToggleOffen={onToggleOffen}
        />
      );
    case 'render': {
      const roh = lauf?.status ?? 'bereit';
      const status = veraltet && roh === 'fertig' ? 'veraltet' : roh;
      // Menschliche Beschriftung — der Poll/Status-Enum bleibt intern, hier
      // steht, was der Architekt lesen soll (E2E prüft genau diese Texte).
      const STATUS_LABEL: Record<string, string> = {
        bereit: 'bereit',
        gesendet: 'gesendet',
        wartetFreigabe: 'wartet auf Freigabe',
        wartetGpu: 'wartet auf GPU-Leerlauf',
        rendert: 'rendert',
        fertig: 'fertig',
        fehler: 'fehler',
        abgebrochen: 'abgebrochen',
        zeitueberschreitung: 'Zeitüberschreitung',
        veraltet: 'veraltet',
      };
      const gruen = status === 'fertig';
      const rot = status === 'fehler' || status === 'zeitueberschreitung';
      const grau = status === 'bereit' || status === 'abgebrochen';
      const statusKlasse = gruen
        ? 'vis-node-status--fertig'
        : rot
          ? 'vis-node-status--fehler'
          : grau
            ? 'vis-node-status--neutral'
            : 'vis-node-status--aktiv';
      const laeuftNoch = ['gesendet', 'wartetFreigabe', 'wartetGpu', 'rendert'].includes(status);
      // V-H4 (UI-KONZEPT-065 §5): semantisches Formular — schreibt in flache
      // Render-Node-`params` über den bestehenden `vis.nodeParametrieren`-Weg;
      // derselbe Zusammenführungs-Helfer (vis-jobs.ts) speist Anzeige UND Job.
      const formFassade = String(params['formFassade'] ?? '');
      const formSzene = String(params['formSzene'] ?? '');
      const formJahreszeit = String(params['formJahreszeit'] ?? '');
      const formPersonen = String(params['formPersonen'] ?? '');
      const formFreitext = String(params['formFreitext'] ?? '');
      // Fassade: aus den Modell-Material-Bausteinen, falls vorhanden — sonst
      // freier Text (kein Material verbunden/erkannt).
      const fassadenBausteine = renderPromptBausteine(doc);
      const finalPrompt = kombiniertePrompt(eingehenderPrompt, formularZusatz(params));
      return (
        <div className="vis-node-render-wrap" onPointerDown={(e) => e.stopPropagation()}>
          <div data-testid="render-formular" className="vis-node-render-formular">
            {/* V-H4-Fix (Kritik-065 Runde 1, Befund 1): `1fr 1fr` allein lässt
                Grid-Spalten am Inhalt (Select-Optionstext) wachsen — `minmax(0, 1fr)`
                erzwingt die Spur, `minWidth: 0` an JEDEM Grid-Kind bricht die
                Flex-/Select-Mindestbreite, `width: 100% + boxSizing: border-box` an
                Input/Select klemmt sie auf das Innenmass. Sonst ragen «Szene»/
                «Personen» über den rechten 45°-Kartenrand hinaus. */}
            <div className="vis-node-render-grid">
              <div className="vis-node-feld-zelle">
                <KField label="Fassade">
                  {fassadenBausteine.length > 0 ? (
                    <KSelect
                      size="sm"
                      value={formFassade}
                      data-testid="render-formular-fassade"
                      onChange={(e) => param('formFassade', e.target.value)}
                      className="vis-node-select-zelle"
                    >
                      <option value="">— frei —</option>
                      {fassadenBausteine.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </KSelect>
                  ) : (
                    <KInput
                      size="sm"
                      defaultValue={formFassade}
                      key={formFassade}
                      placeholder="frei …"
                      data-testid="render-formular-fassade"
                      onBlur={(e) => e.target.value !== formFassade && param('formFassade', e.target.value)}
                      className="vis-node-select-zelle"
                    />
                  )}
                </KField>
              </div>
              <div className="vis-node-feld-zelle">
                <KField label="Szene">
                  <KSelect
                    size="sm"
                    value={formSzene}
                    data-testid="render-formular-szene"
                    onChange={(e) => param('formSzene', e.target.value)}
                    className="vis-node-select-zelle"
                  >
                    <option value="">—</option>
                    <option value="strasse">Aussen · Strasse</option>
                    <option value="hof">Aussen · Hof</option>
                    <option value="vogel">Aussen · Vogel</option>
                    <option value="innen">Innen</option>
                  </KSelect>
                </KField>
              </div>
              <div className="vis-node-feld-zelle">
                <KField label="Jahreszeit">
                  <KSelect
                    size="sm"
                    value={formJahreszeit}
                    data-testid="render-formular-jahreszeit"
                    onChange={(e) => param('formJahreszeit', e.target.value)}
                    className="vis-node-select-zelle"
                  >
                    <option value="">—</option>
                    <option value="sommer">Sommer</option>
                    <option value="winter">Winter</option>
                    <option value="herbst">Herbst</option>
                  </KSelect>
                </KField>
              </div>
              <div className="vis-node-feld-zelle">
                <KField label="Personen">
                  <KSelect
                    size="sm"
                    value={formPersonen}
                    data-testid="render-formular-personen"
                    onChange={(e) => param('formPersonen', e.target.value)}
                    className="vis-node-select-zelle"
                  >
                    <option value="">—</option>
                    <option value="keine">keine</option>
                    <option value="wenige">wenige</option>
                    <option value="belebt">belebt</option>
                  </KSelect>
                </KField>
              </div>
            </div>
            <KField label="Freitext">
              <KInput
                size="sm"
                defaultValue={formFreitext}
                key={formFreitext}
                placeholder="Freitext-Zusatz …"
                data-testid="render-formular-freitext"
                onBlur={(e) => e.target.value !== formFreitext && param('formFreitext', e.target.value)}
                className="vis-node-select-zelle"
              />
            </KField>
            {/* Ehrlichkeit/V8: der TATSÄCHLICHE Prompt, den «Ausführen» sendet. */}
            <div data-testid="render-final-prompt" className="vis-node-final-prompt">
              {finalPrompt || 'kein Prompt — verbinde Stimmung/Stil oder fülle das Formular'}
            </div>
          </div>
          <div className="vis-node-aktionen">
            <KButton
              size="sm"
              tone="accent"
              data-testid="render-ausfuehren"
              onClick={onAusfuehren}
              disabled={laeuftNoch || cloudLeer}
              title={cloudLeer ? 'Kein HomeStation-Server verbunden — im Cloud-Betrieb rendert die Kette nicht lokal. Ein Cloud-Renderweg (Gemini Omni Flash, Public Preview) ist im Tech-Radar (KosmoDoc) vorgemerkt — braucht deinen Entscheid + API-Schlüssel.' : undefined}
            >
              Ausführen
            </KButton>
            {status === 'wartetFreigabe' && (
              <KButton size="sm" tone="quiet" data-testid="render-freigeben" onClick={onFreigeben}>
                Freigeben
              </KButton>
            )}
            {laeuftNoch && (
              <KButton size="sm" tone="ghost" data-testid="render-abbrechen" onClick={onAbbrechen}>
                Abbrechen
              </KButton>
            )}
            <span data-testid="render-status" className={`vis-node-status ${statusKlasse}`}>
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>
          {/* HS5: «Nur Cycles» bestellt reines Cycles statt KI-Veredelung. */}
          <label className="vis-node-checkbox-label">
            <input
              type="checkbox"
              data-testid="render-nur-cycles"
              checked={params['nurCycles'] === true}
              onChange={(e) => param('nurCycles', e.target.checked)}
            />
            nur Cycles (keine KI-Veredelung)
          </label>
          {/* K20/A10: Cycles-Preset (Samples/Auflösung/Sonne/Komposition) — regelbasierte
              Datentabelle, kein KI-Vorschlag. Leer = bisheriger Default (128 Samples). */}
          <KSelect
            size="sm"
            value={String(params['preset'] ?? '')}
            data-testid="vis-preset-select"
            onChange={(e) => param('preset', e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="vis-node-select-voll"
          >
            <option value="">kein Preset (Default 128 Samples)</option>
            {RENDER_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </KSelect>
          {/* Worker + Fortschritt, sobald der Worker den Job hält (HS3-Auflage 5). */}
          {(lauf?.worker || lauf?.progress) && (status === 'rendert' || status === 'wartetGpu') && (
            <div data-testid="render-fortschritt" className="vis-node-fortschritt">
              {lauf.worker ?? 'worker'}
              {lauf.progress ? ` · ${lauf.progress.phase} ${Math.round(lauf.progress.pct * 100)}%` : ''}
            </div>
          )}
          {status === 'fertig' && lauf?.jobId && lauf.bild ? (
            <BridgeBild jobId={lauf.jobId} imageName={lauf.bild} alt="Render" testid="render-bild" className="vis-img-full" />
          ) : (
            <div className={`vis-node-leerbild${rot ? ' vis-node-leerbild--fehler' : ''}`}>
              {rot
                ? (lauf?.fehler ?? 'Render fehlgeschlagen')
                : status === 'fertig'
                  ? 'fertig — aber kein Bild geliefert'
                  : status === 'wartetFreigabe'
                    ? 'wartet auf Freigabe — «Freigeben» startet den Render'
                    : status === 'wartetGpu'
                      ? 'wartet auf GPU-Leerlauf …'
                      : status === 'abgebrochen'
                        ? 'abgebrochen'
                        : lauf
                          ? 'rendert im GPU-Leerlauf …'
                          : cloudLeer
                            ? 'Cloud-Betrieb: kein lokaler Render. Geprüfter Cloud-Weg (Gemini Omni Flash, Preview) wartet auf Owner-Entscheid + Schlüssel — siehe KosmoDoc → Tech-Radar.'
                            : 'Bild erscheint hier'}
            </div>
          )}
        </div>
      );
    }
    case 'vergleich': {
      const bilder = ['bild1', 'bild2', 'bild3']
        .map((p) => bildQuelle(node.id, p))
        .filter((b): b is NonNullable<typeof b> => b !== null);
      return (
        <div className="vis-vergleich-bilder" data-testid="vergleich-bilder">
          {bilder.length === 0 && (
            <div className="vis-vergleich-leer">
              {/* Kritik-065 Runde 1, Befund 5: Leerzustand-Signet — zwei
                  überlappende Bildrahmen statt reiner Textwüste. */}
              <svg width="28" height="22" viewBox="0 0 28 22" aria-hidden focusable="false">
                <rect x="0.75" y="4.75" width="17.5" height="13.5" rx="1.5" fill="none" stroke="var(--k-ink-faint)" strokeWidth="1.5" />
                <rect x="9.75" y="0.75" width="17.5" height="13.5" rx="1.5" fill="var(--k-raised)" stroke="var(--k-ink-faint)" strokeWidth="1.5" />
                <circle cx="14.75" cy="5.25" r="1.4" fill="none" stroke="var(--k-ink-faint)" strokeWidth="1.2" />
                <path d="M11 11 L15.5 6.5 L19.5 10.5 L22.5 7.5 L26.25 11" fill="none" stroke="var(--k-ink-faint)" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              verbinde Render-Bilder
            </div>
          )}
          {bilder.map((b, i) =>
            'dataUrl' in b ? (
              // v0.6.7 P0: Viewport-Aufnahme — keine Bridge, direktes <img> (wie
              // der 'referenz'-Node bei einer data:-URL, s.u.).
              <div key={i} className="vis-bild-kachel">
                <img src={b.dataUrl} alt={`Bild ${i + 1}`} className="vis-img-full" />
              </div>
            ) : (
              <BildKachel key={i} jobId={b.jobId} bild={b.bild} qa={b.qa} alt={`Bild ${i + 1}`} />
            ),
          )}
        </div>
      );
    }
    case 'blatt': {
      const quelle = bildQuelle(node.id, 'bild');
      return (
        <div onPointerDown={(e) => e.stopPropagation()}>
          <KButton
            size="sm"
            tone="quiet"
            data-testid="blatt-ablegen"
            disabled={!quelle}
            onClick={() => {
              if (!quelle) return;
              const titel = String(params['titel'] ?? 'Visualisierung');
              // v0.6.7 P0: eine Viewport-Aufnahme braucht keinen Bridge-Fetch
              // (die dataURL liegt schon lokal vor) — sonst derselbe Weg.
              const ablage = 'dataUrl' in quelle ? aufnahmeAufsBlatt(quelle.dataUrl, titel) : bildAufsBlatt(quelle.jobId, quelle.bild, titel);
              void ablage
                .then((name) => melde(`Render liegt auf «${name}» — im KosmoPublish weiterschieben`, { ton: 'erfolg' }))
                .catch((err) => meldeFehler(err));
            }}
          >
            Aufs Blatt
          </KButton>
        </div>
      );
    }
    case 'referenz': {
      const url = String(params['url'] ?? '');
      return (
        <div className="vis-node-referenz-wrap" onPointerDown={(e) => e.stopPropagation()}>
          <input
            defaultValue={url}
            key={url}
            placeholder="Bild-URL / data:-URL"
            onBlur={(e) => e.target.value !== url && param('url', e.target.value)}
            className="vis-node-feld"
          />
          {url ? (
            <img src={url} alt="Referenz" className="vis-img-full" />
          ) : (
            <div className="vis-node-referenz-leer">
              Referenz / Splat-Ansicht
            </div>
          )}
        </div>
      );
    }
    case 'aufnahme': {
      // v0.6.7 P0 — ECHTE lokale Bildquelle: das Bild kommt vom «Für Vis
      // aufnehmen»-Knopf im 3D-Viewport (Viewport3D.tsx, testid
      // viewport-aufnahme), NICHT von hier. KosmoVis kann selbst nicht in den
      // 3D-Viewport blicken (Viewport3D mountet nur in KosmoDesign, App.tsx
      // hält Design/Vis als sich ausschliessende Stationen) — «Aufnehmen»
      // hier wechselt DESHALB bewusst NICHT die Station (Vis bleibt offen,
      // Owner-Vorgabe), sondern sagt ehrlich, wo der Knopf wirklich sitzt.
      // Das Bild selbst lebt NUR in vis-runtime (entities.ts:500-505: Render-
      // Graph-Bilder gehen nie durchs Doc/Undo/Yjs) — dieselbe Regel wie beim
      // 'render'-Node.
      const kameraParam = String(params['kamera'] ?? 'aktuell');
      const gewaehlt = waehleAufnahme(aufnahmen, kameraParam);
      return (
        <div className="vis-node-aufnahme-wrap" onPointerDown={(e) => e.stopPropagation()}>
          <div className="vis-node-aufnahme-info">Viewport-Aufnahme (kein Rendering)</div>
          <KSelect
            size="sm"
            value={kameraParam}
            data-testid="aufnahme-kamera"
            onChange={(e) => param('kamera', e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="vis-node-select-voll"
          >
            <option value="aktuell">jüngste Aufnahme</option>
            <option value="nordost">Nordost</option>
            <option value="sued">Süd</option>
          </KSelect>
          {gewaehlt ? (
            <img
              src={gewaehlt.dataUrl}
              alt="Viewport-Aufnahme"
              data-testid="aufnahme-bild"
              className="vis-img-full"
            />
          ) : (
            <div className="vis-node-aufnahme-leer">
              Noch keine Aufnahme
            </div>
          )}
          <KButton
            size="sm"
            tone="ghost"
            data-testid="aufnahme-ausfuehren"
            onClick={() =>
              melde(
                'Öffne kurz KosmoDesign → 3D-Viewport und klicke dort «Für Vis aufnehmen» — Vis bleibt offen, das Bild landet automatisch hier.',
                { ton: 'info' },
              )
            }
          >
            Aufnehmen
          </KButton>
        </div>
      );
    }
    case 'kamera': {
      // Reine Anzeige — live aus den aktuellen Modell-Bounds abgeleitet,
      // nie gespeichert (wie der Material-Node). Ehrlich: «Vorschlag aus dem
      // Modell», keine KI-Wahl.
      const kameras = deriveAutoKameras(doc);
      return (
        <div className="vis-node-kamera-liste" data-testid="vis-auto-kamera-liste">
          {kameras.length === 0 ? (
            <span className="vis-node-kamera-leer">
              Keine Geometrie im Modell — nichts abzuleiten.
            </span>
          ) : (
            kameras.map((k) => (
              <div key={k.name} title={k.begruendung}>
                <b>{k.name}</b> — Vorschlag aus dem Modell
              </div>
            ))
          )}
        </div>
      );
    }
    default:
      return null;
  }
}
