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
import { Badge, Karteikarte, KButton, KField, KIcon, KInput, KSelect, melde, meldeFehler, type KIconName } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import {
  abbrechenJob,
  bildAufsBlatt,
  bridgeBase,
  bridgeVermutlichCspGeblockt,
  formularZusatz,
  freigebenJob,
  holeJob,
  istAuthFehler,
  kombiniertePrompt,
  mappeJobStatus,
  postRenderJob,
} from './vis-jobs';
import {
  istZeitUeberschritten,
  memoKey,
  type KurationEintrag,
  type NodeLauf,
  OFFENE_LAUF_STATUS,
  RENDER_TIMEOUT_MS_DEFAULT,
  useVisRuntime,
} from './vis-runtime';
import { BridgeBild } from './BridgeBild';

/**
 * NodeCanvas (V1-Finish P2, W1-Neubau UI-KONZEPT-065 §5) — der Blender-artige
 * Node-Editor von KosmoVis. Eigenbau-SVG statt react-flow: jede Änderung läuft
 * als vis.*-Command (Undo, Yjs, Kosmo spricht Graphen). Drag lebt im lokalen
 * State und wird bei pointerup als EIN vis.nodeSchieben committet; Parameter
 * committen bei blur. Render nur auf «Ausführen» — nie automatisch.
 */

export const NODE_W = 200;
const PORT_ABSTAND = 20;
const KOPF_H = 26;
/** Portanker sitzen 4px vom Kartenrand abgesetzt (W1 Massnahme 5). */
const PORT_ABSATZ = 4;
/** Zoom-Grenzen der Steuerleiste (W1 Massnahme 4). */
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.5;

/** Minimap (Welle 3): feste Pixelgrösse (Papier-Stil, unten links neben der
 * Legende) + Schwelle, ab der sie standardmässig eingeblendet ist — kleine
 * Graphen brauchen sie nicht, die Legende reicht dort zur Orientierung. */
const MINIMAP_W = 160;
const MINIMAP_H = 100;
const MINIMAP_KNOTEN_MIN = 5;

const PORT_FARBE: Record<VisPortTyp, string> = {
  szene: '#2455a4',
  bild: '#a84b2b',
  prompt: '#1e6b47',
  zahl: '#7a5c9e',
  material: '#8a6d3b',
  kameras: '#2b8a7a',
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

/** Echte Nodehöhe inkl. eines offenen Klapptexts (W1 Massnahme 3a). */
function nodeHoehe(n: VisNode, offen?: ReadonlySet<string>): number {
  const zusatz = offen?.has(n.id) && KLAPPBARE_TYPEN.has(n.typ) ? KOERPER_H_ZUSATZ_OFFEN : 0;
  return basisNodeHoehe(n.typ) + zusatz;
}

function portPos(n: VisNode, port: string, richtung: 'in' | 'out'): { x: number; y: number } {
  const kat = VIS_NODE_KATALOG[n.typ];
  const liste = richtung === 'in' ? (kat?.inputs ?? []) : (kat?.outputs ?? []);
  const i = Math.max(0, liste.findIndex((p) => p.name === port));
  return {
    x: n.x + (richtung === 'in' ? -PORT_ABSATZ : NODE_W + PORT_ABSATZ),
    y: n.y + KOPF_H + 14 + i * PORT_ABSTAND,
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

/** Kubische Bézier mit horizontalen Tangenten — kein Routing, ruhige Kurven. */
function edgePfad(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const dx = Math.max(40, Math.abs(b.x - a.x) / 2);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
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
    <div style={{ flex: 1, display: 'grid', gap: 2, minWidth: 0 }}>
      <BridgeBild jobId={jobId} imageName={bild} alt={alt} style={{ width: '100%', border: '1px solid var(--k-line)' }} />
      {qa && (
        <span style={{ fontSize: 9, fontFamily: 'var(--k-font-mono)', color: qa.verdict.passed ? 'var(--k-success)' : 'var(--k-danger)' }}>
          QA {qa.verdict.passed ? 'ok' : '✗'}
        </span>
      )}
    </div>
  );
}

export function NodeCanvas({
  graphId,
  onNodeHinzu,
}: {
  graphId: string;
  /** Node-Palette (Welle 3): reicht den Klick an `VisWorkspace.nodeHinzu`
   * weiter (Spiral-Platzsuche) — optional, weil ältere Aufrufer (Tests, die
   * NodeCanvas isoliert mounten) die Palette schlicht nicht sehen. */
  onNodeHinzu?: (typ: string) => void;
}) {
  const revision = useProject((s) => s.revision);
  void revision;
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  const graph = doc.get<VisGraph>(graphId);
  // V-H5 (Welle 3): Palette + Kuratier-Fläche starten beide zu — reines
  // Overlay-UI, kein Layout-Shift am Canvas selbst.
  const [paletteOffen, setPaletteOffen] = useState(false);
  const [kuratierOffen, setKuratierOffen] = useState(false);
  const [vergleichAuswahl, setVergleichAuswahl] = useState<readonly string[]>([]);
  // Minimap (Welle 3): `null` = Default folgt der Node-Schwelle
  // (MINIMAP_KNOTEN_MIN); einmal manuell geklickt, gewinnt der Nutzerwille.
  const [minimapManuell, setMinimapManuell] = useState<boolean | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ cx: 560, cy: 300, scale: 1 });
  // P6-Review #6: Containergrösse als State (ResizeObserver) — die viewBox
  // aus getBoundingClientRect wäre beim Mount und nach Resize stale
  const [flaeche, setFlaeche] = useState({ w: 1200, h: 700 });
  const panning = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  // Node-Drag: lokal bewegen, EIN Command bei pointerup
  const [drag, setDrag] = useState<{ nodeId: string; dx: number; dy: number; x: number; y: number } | null>(null);
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
  const setzeLauf = useVisRuntime((s) => s.setzeLauf);
  const patchLauf = useVisRuntime((s) => s.patchLauf);
  // V-H5: Kuration lebt in vis-runtime (Laufzeit ≠ Modell) — Stern/Ablage
  // hängen am AKTUELLEN Bild eines Nodes, nie im Doc/Undo/Yjs.
  const kuration = useVisRuntime((s) => s.kuration);
  const markiereBild = useVisRuntime((s) => s.markiereBild);
  const verwerfeBild = useVisRuntime((s) => s.verwerfeBild);

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

  if (!graph) return null;

  const toCanvas = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: view.cx + (clientX - rect.left - rect.width / 2) / view.scale,
      y: view.cy + (clientY - rect.top - rect.height / 2) / view.scale,
    };
  };

  const nodePos = (n: VisNode) =>
    drag && drag.nodeId === n.id ? { ...n, x: drag.x, y: drag.y } : n;

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

  const ausfuehren = (nodeId: string) => {
    const roh = auswertung?.renderAuftraege.get(nodeId);
    if (!roh) return;
    if (!roh.hatSzene) {
      melde('Der Render-Node braucht eine Szene — verbinde den Modell-Node.', { ton: 'fehler' });
      return;
    }
    // V-H4: derselbe Zusammenführungs-Weg wie die sichtbare Anzeige
    // (render-final-prompt) — der Job bekommt NIE einen anderen Prompt als
    // den, den der Architekt am Node liest (Ehrlichkeit/V8).
    const node = graph.nodes.find((n) => n.id === nodeId);
    const zusatz = formularZusatz(node?.params ?? {});
    const auftrag = { ...roh, prompt: kombiniertePrompt(roh.prompt, zusatz) };
    const key = memoKey(auftrag);
    setzeLauf(nodeId, { status: 'gesendet', memoKey: key, gestartetUm: Date.now() });
    void postRenderJob(auftrag)
      .then((j) =>
        patchLauf(nodeId, {
          jobId: j.job_id,
          status: mappeJobStatus(j),
          ...(j.approval_token !== undefined ? { approvalToken: j.approval_token } : {}),
        }),
      )
      .catch((err) => {
        // TypeError = fetch-Netzfehler → ehrliche Offline-Meldung (§2.1.5),
        // nicht der kryptische «Failed to fetch»-Rohtext. KLEIN 9: Ist die
        // Bridge-URL eine LAN-IP, ist der «Netzfehler» in Wahrheit oft die CSP
        // — das wird benannt, damit niemand vergeblich die Firewall sucht.
        const offline = err instanceof TypeError;
        const cspGeblockt = offline && bridgeVermutlichCspGeblockt();
        patchLauf(nodeId, {
          status: 'fehler',
          fehler: cspGeblockt
            ? 'Bridge-Adresse ist eine LAN-IP, die die CSP nicht erlaubt (nur localhost/127.0.0.1) — am selben Gerät über localhost ansprechen. (Offline)'
            : offline
              ? 'Bridge nicht erreichbar — läuft die HomeStation-Bridge? (Offline)'
              : err instanceof Error
                ? err.message
                : String(err),
        });
        meldeFehler(err);
      });
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

  /** Bild-Quelle eines Eingangs-Ports: der Lauf des verbundenen Render-Nodes. */
  const bildQuelle = (nodeId: string, port: string) => {
    const e = graph.edges.find((e) => e.to === nodeId && e.toPort === port);
    if (!e) return null;
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

  // V-H5 (Welle 3, Kuratier-Fläche): jeder Render-Node mit einem fertigen
  // Bild ist eine Karte. Laufzeit bleibt in vis-runtime (`laeufe`/`kuration`)
  // — der Graph selbst kennt nur den Node, nie das Bild (Laufzeit ≠ Modell).
  const kuratierKarten = graph.nodes
    .filter((n) => n.typ === 'render')
    .map((n) => ({ node: n, lauf: laeufe[n.id], kur: kuration[n.id] ?? { markiert: false, verworfen: false } }))
    .filter((k): k is typeof k & { lauf: NonNullable<typeof k.lauf> } => !!k.lauf && k.lauf.status === 'fertig' && !!k.lauf.bild);
  const kuratierAktiv = kuratierKarten.filter((k) => !k.kur.verworfen);
  const kuratierAblage = kuratierKarten.filter((k) => k.kur.verworfen);
  const vergleichKarten = kuratierKarten.filter((k) => vergleichAuswahl.includes(k.node.id));
  const toggleVergleich = (nodeId: string) =>
    setVergleichAuswahl((sel) => {
      if (sel.includes(nodeId)) return sel.filter((id) => id !== nodeId);
      // Genau zwei zur Zeit — die dritte Wahl verdrängt die älteste (FIFO),
      // bleibt so immer sofort bedienbar statt stumm zu blockieren.
      const next = [...sel, nodeId];
      return next.length > 2 ? next.slice(next.length - 2) : next;
    });

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <svg
      ref={svgRef}
      data-testid="node-canvas"
      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', background: 'var(--k-plan-paper)' }}
      viewBox={(() => {
        const w = flaeche.w / view.scale;
        const h = flaeche.h / view.scale;
        return `${view.cx - w / 2} ${view.cy - h / 2} ${w} ${h}`;
      })()}
      onPointerDown={(e) => {
        if (e.target === svgRef.current) {
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
          setDrag({ ...drag, x: p.x - drag.dx, y: p.y - drag.dy });
        }
        if (pending) {
          const p = toCanvas(e.clientX, e.clientY);
          setPending({ ...pending, x: p.x, y: p.y });
        }
      }}
      onPointerUp={() => {
        panning.current = null;
        if (drag) {
          sicher(() => runCommand('vis.nodeSchieben', { graphId, nodeId: drag.nodeId, x: Math.round(drag.x), y: Math.round(drag.y) }));
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
              d={edgePfad(a, b)}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              style={{ cursor: 'pointer' }}
              onPointerDown={(ev) => {
                ev.stopPropagation();
                setAuswahlEdge(e.id);
              }}
            />
            <path
              d={edgePfad(a, b)}
              fill="none"
              stroke={gewaehlt ? 'var(--k-accent)' : PORT_FARBE[typ]}
              strokeWidth={gewaehlt ? 2.5 : gehovert ? 2 : 1.5}
              opacity={0.85}
              pointerEvents="none"
              className="k-uebergang-schnell"
            />
            <g
              transform={`translate(${(a.x + b.x) / 2}, ${(a.y + b.y) / 2})`}
              className="k-uebergang-schnell"
              style={{ cursor: 'pointer', opacity: trennenSichtbar ? 1 : 0 }}
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
                <KIcon name="schliessen" size={14} x={-7} y={-7} style={{ color: 'var(--k-danger)' }} />
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
            d={edgePfad(a, { x: pending.x, y: pending.y })}
            fill="none"
            stroke={PORT_FARBE[pending.typ]}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            pointerEvents="none"
          />
        );
      })()}

      {/* Nodes */}
      {graph.nodes.map((n0) => {
        const n = nodePos(n0);
        const kat = VIS_NODE_KATALOG[n.typ];
        if (!kat) return null;
        const h = nodeHoehe(n0, offenerKlapptext);
        const lauf = laeufe[n.id];
        const auftrag = auswertung?.renderAuftraege.get(n.id);
        const veraltet = lauf && auftrag && lauf.memoKey !== memoKey(auftrag);
        const koerperY = KOPF_H + 8 + Math.max(kat.inputs.length, kat.outputs.length) * PORT_ABSTAND;
        // W1 Massnahme 1: Kategorie-Icon + 2px-Tonstreifen (Hue aus dem
        // Kernel-Katalog, Zeichen aus der KIcon-Registry je Kategorie).
        const kategorieFarbe = VIS_KATEGORIE_HUE[kat.kategorie];
        const kategorieIcon = KATEGORIE_ICON[kat.kategorie];
        return (
          <g key={n.id} transform={`translate(${n.x}, ${n.y})`} data-testid={`vis-node-${n.typ}`}>
            {/* Karte mit geschnittener Ecke (Karteikarten-Verwandter) */}
            <path
              d={`M 0 0 H ${NODE_W - 12} L ${NODE_W} 12 V ${h} H 0 Z`}
              fill="var(--k-raised)"
              stroke="var(--k-mod-vis, var(--k-line-strong))"
              strokeWidth={1}
            />
            {/* Kopf = Drag-Griff */}
            <g
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                const p = toCanvas(e.clientX, e.clientY);
                setDrag({ nodeId: n.id, dx: p.x - n.x, dy: p.y - n.y, x: n.x, y: n.y });
                (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture?.(e.pointerId);
              }}
            >
              <rect width={NODE_W} height={KOPF_H} fill="transparent" />
              <KIcon name={kategorieIcon} size={14} x={8} y={6} style={{ color: 'var(--k-ink-soft)' }} />
              <text x={28} y={17} fontSize={11.5} fontWeight={650} fill="var(--k-ink)" style={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {kat.label}
              </text>
              <g
                className="k-druck"
                style={{ cursor: 'pointer' }}
                data-testid="node-loeschen"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  sicher(() => runCommand('vis.nodeLoeschen', { graphId, nodeId: n.id }));
                }}
              >
                <title>Node löschen</title>
                <KIcon name="schliessen" size={14} x={NODE_W - 22} y={6} style={{ color: 'var(--k-ink-faint)' }} />
              </g>
            </g>
            {/* Tonstreifen (W1): zurückhaltender Kategorie-Hue, 2px, ersetzt die
                bisherige neutrale Hairline unter dem Kopf. */}
            <rect x={0} y={KOPF_H} width={NODE_W} height={2} fill={kategorieFarbe} />

            {/* Eingänge links */}
            {kat.inputs.map((p, i) => {
              const y = KOPF_H + 14 + i * PORT_ABSTAND;
              return (
                <g key={p.name}>
                  <circle
                    cx={-PORT_ABSATZ}
                    cy={y}
                    r={5}
                    fill={graph.edges.some((e) => e.to === n.id && e.toPort === p.name) ? PORT_FARBE[p.typ] : 'var(--k-raised)'}
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
                    style={{ cursor: 'crosshair' }}
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
                  <text x={10} y={y + 3.5} fontSize={10} fill="var(--k-ink)">{p.label}</text>
                </g>
              );
            })}

            {/* Ausgänge rechts */}
            {kat.outputs.map((p, i) => {
              const y = KOPF_H + 14 + i * PORT_ABSTAND;
              return (
                <g key={p.name}>
                  <circle cx={NODE_W + PORT_ABSATZ} cy={y} r={5} fill={PORT_FARBE[p.typ]} stroke={PORT_FARBE[p.typ]} data-testid={`port-out-${p.name}`} />
                  <circle
                    cx={NODE_W + PORT_ABSATZ}
                    cy={y}
                    r={11}
                    fill="transparent"
                    style={{ cursor: 'crosshair' }}
                    onPointerDown={(e) => {
                      // KEIN Pointer-Capture: das pointerup muss den Ziel-Port treffen
                      e.stopPropagation();
                      const pos = toCanvas(e.clientX, e.clientY);
                      setPending({ from: n.id, fromPort: p.name, typ: p.typ, x: pos.x, y: pos.y });
                    }}
                  />
                  <text x={NODE_W - 10} y={y + 3.5} fontSize={10} textAnchor="end" fill="var(--k-ink)">{p.label}</text>
                </g>
              );
            })}

            {/* Körper je Typ */}
            <foreignObject x={8} y={koerperY} width={NODE_W - 16} height={h - koerperY - 8}>
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
                offen={offenerKlapptext.has(n.id)}
                onToggleOffen={() => toggleKlapptext(n.id)}
              />
            </foreignObject>
          </g>
        );
      })}
    </svg>

    {/* Node-Palette (Welle 3): kategorisierte, klickbare Fläche ZUSÄTZLICH
        zum nativen `node-hinzu`-Select in der Werkzeugzeile (VisWorkspace) —
        der bleibt der E2E-Vertrag (`selectOption`), diese Fläche ist ein
        zweiter, visuellerer Weg zum selben `nodeHinzu`. Kategorien + Icons/
        Hue kommen 1:1 aus dem bestehenden Katalog (VIS_NODE_KATALOG /
        VIS_KATEGORIE_HUE) — keine neuen Metadaten, minimal-invasiv.
        `top: 56` statt 12: (30, 30) relativ zum Canvas ist ein bestehender
        E2E-Vertrag (visgraph.spec.ts + diese Datei) — «irgendwo ins leere
        Canvas klicken, um ein Textfeld zu blur(en)». Bei top:12 lag der
        Palette-Knopf GENAU über diesem Punkt und fing den Klick ab. */}
    <div style={{ position: 'absolute', left: 12, top: 56, zIndex: 5 }}>
      <KButton
        size="sm"
        tone="ghost"
        data-testid="vis-palette-toggle"
        title="Node-Palette"
        aria-label="Node-Palette"
        aria-expanded={paletteOffen}
        onClick={() => setPaletteOffen((o) => !o)}
      >
        <KIcon name="ordner" size={16} title="Node-Palette" />
      </KButton>
      {paletteOffen && (
        <div
          data-testid="vis-palette"
          className="k-einblenden"
          style={{
            marginTop: 6,
            width: 200,
            maxHeight: '70vh',
            overflow: 'auto',
            display: 'grid',
            gap: 10,
            padding: 8,
            background: 'var(--k-surface)',
            border: '1px solid var(--k-line)',
            borderRadius: 'var(--k-radius-sm)',
          }}
        >
          {KATEGORIE_REIHENFOLGE.map((kat) => {
            const eintraege = Object.values(VIS_NODE_KATALOG).filter((t) => t.kategorie === kat);
            if (eintraege.length === 0) return null;
            return (
              <div key={kat} data-testid={`vis-palette-kategorie-${kat}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <span aria-hidden style={{ width: 14, height: 2, background: VIS_KATEGORIE_HUE[kat] }} />
                  <span style={{ fontSize: 10.5, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--k-ink-soft)' }}>
                    {KATEGORIE_LABEL[kat]}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 3 }}>
                  {eintraege.map((t) => (
                    <button
                      key={t.typ}
                      type="button"
                      className="k-druck"
                      data-testid={`vis-palette-eintrag-${t.typ}`}
                      title={t.hilfe}
                      onClick={() => onNodeHinzu?.(t.typ)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 6px',
                        border: '1px solid var(--k-line)',
                        borderRadius: 'var(--k-radius-sm)',
                        background: 'var(--k-raised)',
                        fontSize: 11,
                        color: 'var(--k-ink)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <KIcon name={KATEGORIE_ICON[kat]} size={14} style={{ color: 'var(--k-ink-soft)', flexShrink: 0 }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

    {/* Kuratier-Fläche (V-H5, Welle 3): erzeugte Renderbilder als Karten
        (Tusche-Rahmen, `Karteikarte`/`.k-karte` wie die bestehenden
        Varianten-Serien-Karten) — markieren (Stern), verwerfen (in eine
        Ablage, NICHTS wird gelöscht — VORFORM-UI-KONZEPT §1.5 «Layout 02»),
        zwei Karten vergleichen (derselbe `BildKachel`-Baustein wie der
        `vergleich`-Node). Laufzeitdaten (Bild/Kuration) bleiben in
        vis-runtime — der Doc kennt nur die Nodes. */}
    <div style={{ position: 'absolute', right: 12, top: 12, zIndex: 5, maxWidth: 340 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <KButton
          size="sm"
          tone="ghost"
          data-testid="vis-kuratier-toggle"
          title="Kuratieren"
          aria-label="Kuratieren"
          aria-expanded={kuratierOffen}
          onClick={() => setKuratierOffen((o) => !o)}
        >
          <KIcon name="stern" size={16} title="Kuratieren" />
          {kuratierKarten.length > 0 && (
            <span style={{ fontSize: 10, fontFamily: 'var(--k-font-mono)' }}>{kuratierKarten.length}</span>
          )}
        </KButton>
      </div>
      {kuratierOffen && (
        <div
          data-testid="vis-kuratier-flaeche"
          className="k-einblenden"
          style={{
            marginTop: 6,
            maxHeight: '76vh',
            overflow: 'auto',
            display: 'grid',
            gap: 10,
            padding: 8,
            background: 'var(--k-surface)',
            border: '1px solid var(--k-line)',
            borderRadius: 'var(--k-radius-sm)',
          }}
        >
          {vergleichKarten.length === 2 && (
            <div data-testid="vis-kuratier-vergleich-flaeche" style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 10.5, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--k-ink-soft)' }}>
                Vergleich
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {vergleichKarten.map((k, i) => (
                  <BildKachel key={k.node.id} jobId={k.lauf.jobId!} bild={k.lauf.bild!} qa={k.lauf.qa} alt={`Vergleich ${i + 1}`} />
                ))}
              </div>
            </div>
          )}
          {kuratierKarten.length === 0 ? (
            <span style={{ fontSize: 11, color: 'var(--k-ink-faint)', fontStyle: 'italic' }}>
              Noch keine Renderbilder — «Ausführen» an einem Render-Node füllt die Fläche.
            </span>
          ) : (
            <>
              <div style={{ display: 'grid', gap: 8 }}>
                {kuratierAktiv.map((k, i) => (
                  <KuratierKarte
                    key={k.node.id}
                    nr={i + 1}
                    knoten={k.node}
                    lauf={k.lauf}
                    kuration={k.kur}
                    imVergleich={vergleichAuswahl.includes(k.node.id)}
                    onMarkieren={() => markiereBild(k.node.id)}
                    onVerwerfen={() => verwerfeBild(k.node.id)}
                    onVergleichWahl={() => toggleVergleich(k.node.id)}
                  />
                ))}
              </div>
              {kuratierAblage.length > 0 && (
                <div style={{ display: 'grid', gap: 8 }} data-testid="vis-kuratier-ablage">
                  <span style={{ fontSize: 10.5, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--k-ink-faint)' }}>
                    Ablage ({kuratierAblage.length})
                  </span>
                  {kuratierAblage.map((k, i) => (
                    <KuratierKarte
                      key={k.node.id}
                      nr={i + 1}
                      knoten={k.node}
                      lauf={k.lauf}
                      kuration={k.kur}
                      imVergleich={vergleichAuswahl.includes(k.node.id)}
                      onMarkieren={() => markiereBild(k.node.id)}
                      onVerwerfen={() => verwerfeBild(k.node.id)}
                      onVergleichWahl={() => toggleVergleich(k.node.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>

    {/* Zoom-Steuerleiste (W1 Massnahme 4) — schwebend unten rechts. `bottom:
        92` statt 12: das globale Kosmo-Symbol (KosmoSymbol.tsx, fixed
        right:22/bottom:22, zIndex 110) sitzt GENAU in der Ecke und würde bei
        12px sonst die Hälfte des Zoom-Plus-Knopfs verdecken (unklickbar). */}
    <div style={{ position: 'absolute', right: 12, bottom: 92, display: 'flex', gap: 4 }}>
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

    {/* Unten links, EIN verankerter Stapel (Welle 3): Minimap ÜBER der
        Legende — beide Kinder liegen im normalen Fluss desselben Flex-
        Containers, können einander also nie überlappen, ganz gleich wie
        viele Legende-Zeilen oder wie gross die Minimap gerade ist. Die
        Legende bleibt an ihrer historischen Stelle (letztes Kind, also am
        Container-Boden bei `bottom: 12`) — unverändertes Aussehen, wenn die
        Minimap unter der Node-Schwelle verborgen bleibt. */}
    <div style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      {/* Minimap (Welle 3): kleine Übersichtskarte, Papier-Stil — Nodes als
          kategorie-getönte Rechtecke (VIS_KATEGORIE_HUE), der aktuelle
          Viewport als Tusche-Rahmen. Default AN ab MINIMAP_KNOTEN_MIN Nodes,
          per Toggle jederzeit übersteuerbar. Klick/Drag setzt das View-
          Zentrum DIREKT (kein Easing) — «keine animierten Sprünge» bei
          reduced-motion gilt dadurch immer, nicht nur unter der Media-Query. */}
      {graph.nodes.length > 0 && (
        <div style={{ display: 'grid', gap: 4, justifyItems: 'start' }}>
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
          {minimapSichtbar && (
            <svg
              data-testid="vis-minimap"
              width={MINIMAP_W}
              height={MINIMAP_H}
              viewBox={`0 0 ${MINIMAP_W} ${MINIMAP_H}`}
              style={{
                display: 'block',
                background: 'var(--k-raised)',
                border: '1px solid var(--k-line)',
                borderRadius: 'var(--k-radius-sm)',
                cursor: 'crosshair',
                touchAction: 'none',
              }}
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
          )}
        </div>
      )}

      {/* Porttyp-Legende (W1 Massnahme 5) — nur wenn der Graph Nodes hat. */}
      {graph.nodes.length > 0 && legendeTypen.length > 0 && (
        <div
          data-testid="vis-legende"
          style={{
            display: 'grid',
            gap: 3,
            padding: '6px 8px',
            background: 'var(--k-surface)',
            border: '1px solid var(--k-line)',
            borderRadius: 'var(--k-radius-sm)',
            fontSize: 'var(--k-t-xs)',
            color: 'var(--k-ink-soft)',
          }}
        >
          {legendeTypen.map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: PORT_FARBE[t] }} />
              <span>{PORT_TYP_NAME[t]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}

/**
 * V-H5 (Welle 3): eine Kuratier-Karte — Tusche-Rahmen (`Karteikarte`, wie die
 * Varianten-Serien-Karten in der «Einfach»-Ansicht), Bild, QA-Badge, Stern
 * (markieren), Verwerfen (→ Ablage, nicht löschen) und eine Vergleich-Wahl
 * (Checkbox, genau zwei Karten füllen die Vergleichsfläche oben).
 */
function KuratierKarte({
  nr,
  knoten,
  lauf,
  kuration,
  imVergleich,
  onMarkieren,
  onVerwerfen,
  onVergleichWahl,
}: {
  nr: number;
  knoten: VisNode;
  lauf: NodeLauf;
  kuration: KurationEintrag;
  imVergleich: boolean;
  onMarkieren: () => void;
  onVerwerfen: () => void;
  onVergleichWahl: () => void;
}) {
  const kat = VIS_NODE_KATALOG[knoten.typ];
  const preset = knoten.params?.['formSzene'];
  return (
    <Karteikarte nr={nr} data-testid="vis-kuratier-karte" style={{ opacity: kuration.verworfen ? 0.6 : 1 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, fontWeight: 650 }}>{kat?.label ?? knoten.typ}</span>
          {typeof preset === 'string' && preset && (
            <span style={{ fontSize: 10, color: 'var(--k-ink-faint)' }}>· {preset}</span>
          )}
          <div style={{ flex: 1 }} />
          {lauf.qa && (
            <Badge hue={lauf.qa.verdict.passed ? 'var(--k-success)' : 'var(--k-danger)'}>
              QA {lauf.qa.verdict.passed ? 'ok' : 'verfehlt'}
            </Badge>
          )}
        </div>
        <BridgeBild jobId={lauf.jobId!} imageName={lauf.bild!} alt={kat?.label ?? 'Render'} style={{ width: '100%', border: '1px solid var(--k-line)' }} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            className="k-druck"
            data-testid="vis-kuratier-stern"
            title={kuration.markiert ? 'Markierung entfernen' : 'Bild markieren'}
            aria-label={kuration.markiert ? 'Markierung entfernen' : 'Bild markieren'}
            aria-pressed={kuration.markiert}
            onClick={onMarkieren}
            style={{ border: '1px solid var(--k-line)', borderRadius: 'var(--k-radius-sm)', background: 'var(--k-raised)', padding: '3px 6px', cursor: 'pointer', color: kuration.markiert ? 'var(--k-warning)' : 'var(--k-ink-soft)' }}
          >
            <KIcon name={kuration.markiert ? 'stern-voll' : 'stern'} size={14} />
          </button>
          <button
            type="button"
            className="k-druck"
            data-testid="vis-kuratier-verwerfen"
            title={kuration.verworfen ? 'Aus der Ablage zurückholen' : 'Verwerfen (in die Ablage — nicht gelöscht)'}
            aria-label={kuration.verworfen ? 'Aus der Ablage zurückholen' : 'Verwerfen'}
            aria-pressed={kuration.verworfen}
            onClick={onVerwerfen}
            style={{ border: '1px solid var(--k-line)', borderRadius: 'var(--k-radius-sm)', background: 'var(--k-raised)', padding: '3px 6px', cursor: 'pointer', color: kuration.verworfen ? 'var(--k-danger)' : 'var(--k-ink-soft)' }}
          >
            <KIcon name="schliessen" size={14} />
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--k-ink-soft)', cursor: 'pointer' }}>
            <input type="checkbox" data-testid="vis-kuratier-vergleich-wahl" checked={imVergleich} onChange={onVergleichWahl} />
            Vergleichen
          </label>
        </div>
      </div>
    </Karteikarte>
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
    <div style={{ display: 'grid', gap: 2 }}>
      <div
        data-testid={testid}
        style={{
          fontSize: 10.5,
          color: 'var(--k-ink-soft)',
          lineHeight: 1.35,
          fontStyle: hatText ? 'normal' : 'italic',
          ...(offen
            ? {}
            : ({
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              } as React.CSSProperties)),
        }}
      >
        {hatText ? text : platzhalter}
      </div>
      {hatText && (
        <button
          type="button"
          className="k-druck"
          data-testid="node-expand"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onToggleOffen}
          style={{
            justifySelf: 'start',
            fontSize: 10,
            color: 'var(--k-ink-faint)',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
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
  bildQuelle: (nodeId: string, port: string) => { jobId: string; bild: string; qa?: { verdict: { passed: boolean } } | undefined } | null;
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
  const feld: React.CSSProperties = {
    width: '100%',
    padding: '3px 6px',
    border: '1px solid var(--k-line-strong)',
    borderRadius: 4,
    background: 'var(--k-surface)',
    fontSize: 11,
    fontFamily: 'inherit',
  };
  // Bug T4a: ein Node OHNE `params` (Hand-Edit/Fremd-Import/Yjs-Merge von
  // einem anderen Stand) darf die Station nie abstürzen lassen — fehlende
  // Parameter zählen wie leere/Default-Werte (Wurzel-Fix in derive/visgraph.ts
  // spiegelt sich hier, weil der Node-Körper dieselben Felder direkt liest).
  const params = node.params ?? {};

  switch (node.typ) {
    case 'modell': {
      const teile = doc.byKind('wall').length + doc.byKind('slab').length + doc.byKind('roof').length;
      return <div style={{ fontSize: 10.5, color: 'var(--k-ink-faint)', fontFamily: 'var(--k-font-mono)' }}>Szene: {teile} Bauteile (GLB)</div>;
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
          style={{ ...feld, resize: 'none' }}
        />
      );
    case 'stimmung': {
      const presetKey = String(params['preset'] ?? 'morgen');
      return (
        <div style={{ display: 'grid', gap: 4 }}>
          <select
            value={presetKey}
            data-testid="stimmung-preset"
            onChange={(e) => param('preset', e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            style={feld}
          >
            {Object.entries(VIS_STIMMUNGEN).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
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
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onPointerDown={(e) => e.stopPropagation()}>
          <input
            type="range"
            key={String(params['wert'] ?? 0)}
            min={min}
            max={max}
            step={schritt}
            defaultValue={Number(params['wert'] ?? 0)}
            data-testid="zahl-regler"
            onPointerUp={(e) => param('wert', Number((e.target as HTMLInputElement).value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10.5 }}>{Number(params['wert'] ?? 0)}</span>
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
      const statusFarbe = gruen
        ? 'var(--k-success)'
        : rot
          ? 'var(--k-danger)'
          : grau
            ? 'var(--k-ink-faint)'
            : 'var(--k-warning)';
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
        <div style={{ display: 'grid', gap: 6 }} onPointerDown={(e) => e.stopPropagation()}>
          <div data-testid="render-formular" style={{ display: 'grid', gap: 4, minWidth: 0 }}>
            {/* V-H4-Fix (Kritik-065 Runde 1, Befund 1): `1fr 1fr` allein lässt
                Grid-Spalten am Inhalt (Select-Optionstext) wachsen — `minmax(0, 1fr)`
                erzwingt die Spur, `minWidth: 0` an JEDEM Grid-Kind bricht die
                Flex-/Select-Mindestbreite, `width: 100% + boxSizing: border-box` an
                Input/Select klemmt sie auf das Innenmass. Sonst ragen «Szene»/
                «Personen» über den rechten 45°-Kartenrand hinaus. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 4 }}>
              <div style={{ minWidth: 0 }}>
                <KField label="Fassade">
                  {fassadenBausteine.length > 0 ? (
                    <KSelect
                      size="sm"
                      value={formFassade}
                      data-testid="render-formular-fassade"
                      onChange={(e) => param('formFassade', e.target.value)}
                      style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
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
                      style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                    />
                  )}
                </KField>
              </div>
              <div style={{ minWidth: 0 }}>
                <KField label="Szene">
                  <KSelect
                    size="sm"
                    value={formSzene}
                    data-testid="render-formular-szene"
                    onChange={(e) => param('formSzene', e.target.value)}
                    style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="">—</option>
                    <option value="Aussenansicht von der Strasse">Aussen · Strasse</option>
                    <option value="Aussenansicht vom Hof">Aussen · Hof</option>
                    <option value="Vogelperspektive">Aussen · Vogel</option>
                    <option value="Innenraumansicht">Innen</option>
                  </KSelect>
                </KField>
              </div>
              <div style={{ minWidth: 0 }}>
                <KField label="Jahreszeit">
                  <KSelect
                    size="sm"
                    value={formJahreszeit}
                    data-testid="render-formular-jahreszeit"
                    onChange={(e) => param('formJahreszeit', e.target.value)}
                    style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="">—</option>
                    <option value="Sommer">Sommer</option>
                    <option value="Winter">Winter</option>
                    <option value="Herbst">Herbst</option>
                  </KSelect>
                </KField>
              </div>
              <div style={{ minWidth: 0 }}>
                <KField label="Personen">
                  <KSelect
                    size="sm"
                    value={formPersonen}
                    data-testid="render-formular-personen"
                    onChange={(e) => param('formPersonen', e.target.value)}
                    style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="">—</option>
                    <option value="keine Personen">keine</option>
                    <option value="wenige Personen">wenige</option>
                    <option value="belebte Szene, viele Personen">belebt</option>
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
                style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
              />
            </KField>
            {/* Ehrlichkeit/V8: der TATSÄCHLICHE Prompt, den «Ausführen» sendet. */}
            <div
              data-testid="render-final-prompt"
              style={{ fontSize: 9.5, fontFamily: 'var(--k-font-mono)', color: 'var(--k-ink-faint)', lineHeight: 1.3 }}
            >
              {finalPrompt || 'kein Prompt — verbinde Stimmung/Stil oder fülle das Formular'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
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
            <span data-testid="render-status" style={{ fontSize: 10, fontFamily: 'var(--k-font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: statusFarbe }}>
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>
          {/* HS5: «Nur Cycles» bestellt reines Cycles statt KI-Veredelung. */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--k-ink-soft)', cursor: 'pointer' }}>
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
          <select
            value={String(params['preset'] ?? '')}
            data-testid="vis-preset-select"
            onChange={(e) => param('preset', e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            style={feld}
          >
            <option value="">kein Preset (Default 128 Samples)</option>
            {RENDER_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {/* Worker + Fortschritt, sobald der Worker den Job hält (HS3-Auflage 5). */}
          {(lauf?.worker || lauf?.progress) && (status === 'rendert' || status === 'wartetGpu') && (
            <div data-testid="render-fortschritt" style={{ fontSize: 9.5, fontFamily: 'var(--k-font-mono)', color: 'var(--k-ink-soft)' }}>
              {lauf.worker ?? 'worker'}
              {lauf.progress ? ` · ${lauf.progress.phase} ${Math.round(lauf.progress.pct * 100)}%` : ''}
            </div>
          )}
          {status === 'fertig' && lauf?.jobId && lauf.bild ? (
            <BridgeBild jobId={lauf.jobId} imageName={lauf.bild} alt="Render" testid="render-bild" style={{ width: '100%', border: '1px solid var(--k-line)' }} />
          ) : (
            <div style={{ height: 110, border: '1px dashed var(--k-line-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 6, fontSize: 10, color: rot ? 'var(--k-danger)' : 'var(--k-ink-faint)' }}>
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
        <div style={{ display: 'flex', gap: 4 }} data-testid="vergleich-bilder">
          {bilder.length === 0 && (
            <div
              style={{
                height: 110,
                flex: 1,
                border: '1px dashed var(--k-line-strong)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: 'var(--k-ink-faint)',
              }}
            >
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
          {bilder.map((b, i) => (
            <BildKachel key={i} jobId={b.jobId} bild={b.bild} qa={b.qa} alt={`Bild ${i + 1}`} />
          ))}
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
              void bildAufsBlatt(quelle.jobId, quelle.bild, String(params['titel'] ?? 'Visualisierung'))
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
        <div style={{ display: 'grid', gap: 4 }} onPointerDown={(e) => e.stopPropagation()}>
          <input
            defaultValue={url}
            key={url}
            placeholder="Bild-URL / data:-URL"
            onBlur={(e) => e.target.value !== url && param('url', e.target.value)}
            style={feld}
          />
          {url ? (
            <img src={url} alt="Referenz" style={{ width: '100%', border: '1px solid var(--k-line)' }} />
          ) : (
            <div style={{ height: 46, border: '1px dashed var(--k-line-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--k-ink-faint)' }}>
              Referenz / Splat-Ansicht
            </div>
          )}
        </div>
      );
    }
    case 'kamera': {
      // Reine Anzeige — live aus den aktuellen Modell-Bounds abgeleitet,
      // nie gespeichert (wie der Material-Node). Ehrlich: «Vorschlag aus dem
      // Modell», keine KI-Wahl.
      const kameras = deriveAutoKameras(doc);
      return (
        <div style={{ display: 'grid', gap: 3, fontSize: 10, color: 'var(--k-ink-soft)' }} data-testid="vis-auto-kamera-liste">
          {kameras.length === 0 ? (
            <span style={{ fontStyle: 'italic', color: 'var(--k-ink-faint)' }}>
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
