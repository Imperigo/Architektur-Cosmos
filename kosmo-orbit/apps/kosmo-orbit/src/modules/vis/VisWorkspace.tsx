import { useEffect, useRef, useState } from 'react';
import {
  Messrahmen,
  Badge,
  Hairline,
  Karteikarte,
  KButton,
  KIcon,
  KSelect,
  KTabs,
  KToolbar,
  KToolGruppe,
  Measure,
  Panel,
  meldeFehler,
  moduleHue,
  type KTabItem,
} from '@kosmo/ui';
import { finalerRenderPrompt, renderPromptBausteine, exportGlb, VIS_NODE_KATALOG, VIS_STIMMUNGEN, type VisGraph } from '@kosmo/kernel';
import { STANDARD_BRIDGE_URL } from '@kosmo/ai';
import { useProject } from '../../state/project-store';
import { basisNodeHoehe, NODE_W, NodeCanvas } from './NodeCanvas';
import { bridgeToken, platziereBildAufsBlatt, sendeGraphRenderAuftrag } from './vis-jobs';
import { BridgeBild } from './BridgeBild';
import { presetAnwenden } from '../../state/dock-preset-anwendung';
import { PRESET_IDS, type PresetId } from '../../state/dock-presets';
import { useDockZustand } from '../../state/dock-zustand';
import { GespeicherteAnsichten } from './GespeicherteAnsichten';
import { GpuStatus } from './GpuStatus';
import { sollVisOnboardingAutoZeigen, VisOnboarding } from './VisOnboarding';
import { VisReportDossier } from './VisReportDossier';
import { useUiZustand } from '../../state/ui-zustand';
import { useVisRuntime } from './vis-runtime';
import { neuerGraphErstellen, kameraVorschlagenAktion } from './vis-graph-aktionen';
// PC1 (`docs/V084-SPEZ.md` §5 W2, C-15) — der Vis-Island-Katalog (eigener
// Namensraum, s. `island/inhalte/registry.ts`-Kopfkommentar) + die
// Registrierung seiner Stufe-2/3-Inhalte als Import-Seiteneffekt (Muster
// `design/island/IslandShell.tsx`s Kopfimporte).
import { VIS_INSELN, visInhaltsRegistry } from './island';
// PD2/E1 (`docs/V084-SPEZ.md` §5 W2) — NUR IMPORTIEREN, design/island/**
// bleibt fremder Dateibesitz (Sanktion 2 gilt spiegelbildlich: PC1 fasst
// keine design-Datei an). `IslandBuehne`/`KosmoOrb` sind die generische
// PC0-Bühne bzw. das E2-Orb-Vorbild — beide bereits stationsagnostisch
// gebaut (`IslandBuehne` nimmt `inseln`+`registry`, `KosmoOrb` kennt gar
// keine Station).
import { IslandBuehne } from '../design/island/IslandShell';
import { KosmoOrb } from '../design/island/KosmoOrb';
import type { IslandWerkzeug } from '../design/island/island-katalog';
import './vis-visual.css';

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

// Kritik-065 Runde 1, Befund 3: aktiver Tab war volle Schwarzfläche —
// identisch mit den Aktions-Knöpfen (z. B. «+ Drei Stimmungen»). KTabs
// (2px-Akzent-Unterstrich, KEINE Füllfläche) statt zweier KButton mit
// tone="accent"/"ghost". testids + sichtbare Texte unverändert.
const VIS_TAB_ITEMS: readonly KTabItem[] = [
  { id: 'graph', label: 'Node-Tree', testid: 'tab-graph' },
  { id: 'einfach', label: 'Einfach', testid: 'tab-einfach' },
  // v0.8.1 / P8 (0.7.2-Rest «Viz gespeicherte Ansichten + Review-Pins»,
  // Spec §6.2) — dritter Tab, additiv, ändert nichts an graph/einfach.
  { id: 'ansichten', label: 'Ansichten', testid: 'tab-ansichten' },
];

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

// Stimmungs-Presets: dedupliziert auf die Kernel-Konstante (VIS_STIMMUNGEN,
// packages/kosmo-kernel/src/derive/visgraph.ts) — byte-gleiche Werte, eine Quelle.
const STIMMUNGEN = Object.values(VIS_STIMMUNGEN);

/** v0.8.0 / Paket PD2 (Default-Oberflächen) — kurze Beschriftung der drei
 *  Dock-Presets (`state/dock-presets.ts`), identisch zu deren `titel`. */
const PRESET_KURZLABEL: Record<PresetId, string> = { fokus: 'Fokus', arbeiten: 'Arbeiten', pruefen: 'Prüfen' };

function loadBridgeUrl(): string {
  return localStorage.getItem('kosmo.bridge') ?? STANDARD_BRIDGE_URL;
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
  /**
   * PC1 (`docs/V084-SPEZ.md` §5 W2) — Muster `DesignWorkspace.tsx`s gleich-
   * namiges Prop: der Kosmo-Orb-Zugang im Island-Modus (`island/KosmoOrb.tsx`,
   * NUR importiert). Optional — nur `App.tsx` kennt den Weg zum Kosmo-Panel.
   */
  onKosmoOeffnen?: () => void;
}

export function VisWorkspace({ onEinstellungen, onKosmoOeffnen }: VisWorkspaceProps = {}) {
  const [tab, setTab] = useState<'graph' | 'einfach' | 'ansichten'>('graph');
  // v0.8.1 / P8 (0.7.5-Welle-2 «Vis-Onboarding-Stepper», Spec §9.17, B-102) —
  // zeigt sich einmalig (Muster `kosmo.onboarded`), danach jederzeit über den
  // «?»-Knopf in der Toolbar erreichbar (s. `VisTabs` unten).
  const [onboardingOffen, setOnboardingOffen] = useState(() => sollVisOnboardingAutoZeigen());
  // v0.8.1 / P8 (0.7.5-Welle-2 «Report-Dossier/Print», Spec §9.17, B-103/104).
  // PC1: bleibt UNVERÄNDERT der Manuell-Modus-Schalter (Bestandsschutz) — der
  // Island-Modus zeigt den Report über `vis-runtime.ts`s `reportOffen` (s.
  // Island-Zweig unten), zwei unabhängige Schalter für zwei unabhängige Chromes.
  const [reportOffen, setReportOffen] = useState(false);
  const revision = useProject((s) => s.revision);
  void revision;
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  const graphen = doc.byKind<VisGraph>('visgraph');
  const [aktiverGraph, setAktiverGraph] = useState<string>('');
  const graphId = graphen.some((g) => g.id === aktiverGraph) ? aktiverGraph : (graphen[0]?.id ?? '');
  // v0.8.0 / Paket PD2 (Default-Oberflächen) — Preset-Schnellzugriff in der
  // Toolbar-Kontextzeile (s. dortige `KToolGruppe «Oberfläche»` unten).
  const aktivesPresetVis = useDockZustand((s) => s.aktivesPreset['vis']);

  // ---------------------------------------------------------------------
  // PC1 (V084-SPEZ §5 W2, C-15) — Island-Modus. `visOberflaeche` spiegelt
  // `DesignWorkspace.tsx`s `designOberflaeche`-Umschalter 1:1 (additives
  // Store-Feld, `state/ui-zustand.ts`). Der aktive Graph im Island-Modus
  // kommt aus `vis-runtime.ts` (`aktiverGraphId`, von `NodeCanvas.tsx`
  // gepflegt) statt aus `aktiverGraph`/`setAktiverGraph` oben — jene zwei
  // bleiben der EXKLUSIVE Manuell-Modus-Pfad (Bestandsschutz: kein Bestands-
  // Konsument dieser Datei ändert sich, wenn `visOberflaeche==='island'` nie
  // erreicht wird, z.B. in den Bestands-E2E-Specs unter dem globalen
  // `manuell-seed.ts`-Seed).
  const visOberflaeche = useUiZustand((s) => s.visOberflaeche);
  // v0.8.10 E3-Nachtrag: `setVisOberflaeche` wird hier nicht mehr gebraucht
  // (der frühere `case 'manuell'` in `aktiviereVisIslandWerkzeug` unten ist
  // entfallen) — `VisIslandZurueckKnopf` weiter unten liest den Setter für
  // den Rückweg eigenständig aus demselben Store.
  const aktiverGraphIdInsel = useVisRuntime((s) => s.aktiverGraphId);
  const islandGraphId = graphen.some((g) => g.id === aktiverGraphIdInsel) ? aktiverGraphIdInsel! : (graphen[0]?.id ?? '');
  const islandReportOffen = useVisRuntime((s) => s.reportOffen);
  const setIslandReportOffen = useVisRuntime((s) => s.setReportOffen);

  /**
   * v0.8.4 PC2 (`docs/V084-SPEZ.md` E6/C-18) — Executor für den `vis.render`-
   * Kernel-Command: beobachtet `doc.settings.visRenderAuftrag` (SettingsPatch,
   * `commands/vis.ts`) und stösst `sendeGraphRenderAuftrag()` an, sobald ein
   * FRISCHER Auftrag erscheint. «frisch» heisst: eine neue Objekt-Referenz
   * gegenüber dem zuletzt gesehenen Auftrag — jeder `vis.render`-Lauf liefert
   * ein neues Literal, auch bei identischen Parametern (bewusst, s.
   * `VisRenderWunsch`-Kommentar in `model/doc.ts`: ein Kernel-Command darf
   * keinen Zeitstempel in die Nutzlast schreiben). Der Ref-Vergleich startet
   * beim ERSTEN Mount mit dem AKTUELLEN Wert (nicht `null`) — ein aus einem
   * gespeicherten Projekt geladener, bereits abgeschlossener Auftrag löst
   * beim Öffnen darum KEINEN Render erneut aus (ehrliche Grenze: ein
   * Auftrag, der zwischen zwei Sitzungen nie verarbeitet wurde — z.B.
   * Tab-Schliessen mitten im Senden —, bleibt unverarbeitet stehen, bis der
   * nächste `vis.render`-Lauf ihn überschreibt; reine Laufzeit-Entscheidung,
   * kein Kernel-Bezug).
   *
   * Damit ist `window.__kosmo.run('vis.render', …)` — und über
   * `commandTools()` jeder Kosmo-Tool-Call — der GENAU GLEICHE Auslöser wie
   * der bestehende «Ausführen»-Knopf am Node (`NodeCanvas.tsx`, UNVERÄNDERT):
   * beide Wege enden bei `sendeGraphRenderAuftrag()`, der Node zeigt Status/
   * Bild aus `vis-runtime.ts`s `laeufe` wie bisher — kein NodeCanvas-Edit
   * nötig (DATEIKREIS PC2).
   */
  const letzterRenderAuftrag = useRef(doc.settings.visRenderAuftrag ?? null);
  useEffect(() => {
    const auftrag = doc.settings.visRenderAuftrag ?? null;
    if (auftrag === letzterRenderAuftrag.current) return;
    letzterRenderAuftrag.current = auftrag;
    if (!auftrag) return;
    sendeGraphRenderAuftrag(
      auftrag.graphId,
      auftrag.nodeId,
      auftrag.stimmungPreset ? { preset: auftrag.stimmungPreset } : undefined,
      {
        kameraWahl: auftrag.kameraWahl,
        ...(auftrag.backbone !== undefined ? { backbone: auftrag.backbone } : {}),
        ...(auftrag.aufloesung !== undefined ? { aufloesung: auftrag.aufloesung } : {}),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  /**
   * PD2-Muster (`DesignWorkspace.tsx`s `aktiviereIslandWerkzeug()`): Aktion
   * für JEDE Erst-Aktivierung eines Insel-Werkzeugs. `hatPopup:true`-
   * Werkzeuge (Palette/Ausrichten/Verbinden/Zoom/Stimmung/Render
   * senden/Aufs Plakat) brauchen hier nichts — ihre echte Aktion lebt in der
   * Registry (`island/inhalte/*.tsx`, liest globale Stores direkt). Die
   * vier `hatPopup:false`-Sofort-Aktionen (Raster/Routing/Kamera vorschlagen/
   * Report) schalten hier real — IslandShell zeigt danach selbst den Toast.
   * v0.8.10 E3-Nachtrag: der frühere fünfte Fall `'manuell'` (Insel-Rückweg
   * in die manuelle Ansicht) ist entfallen — der Zugang läuft jetzt über
   * den Einstellungs-Schalter (`shell/Einstellungen.tsx`, testid
   * `einstellung-vis-manuell`), s. `docs/V0810-SPEZ.md` §2 E3.
   */
  const aktiviereVisIslandWerkzeug = (w: IslandWerkzeug): void => {
    switch (w.id) {
      case 'raster':
        useVisRuntime.getState().toggleCanvasSnap();
        return;
      case 'routing':
        useVisRuntime.getState().toggleCanvasRouting();
        return;
      case 'kamera-vorschlagen':
        kameraVorschlagenAktion(islandGraphId || undefined);
        return;
      case 'report':
        setIslandReportOffen(true);
        return;
      default:
        return;
    }
  };

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
        // W1 Massnahme 3a («Kein Overlap»): vertikaler Versatz = echte
        // Node-Höhe (der grösste der drei Typen in einer Zeile, `render` ist
        // mit Abstand am höchsten) + 40; horizontaler Versatz = NODE_W + 80 —
        // reicht auch für x=40 (Modell/Material) zur ersten Spalte (320).
        const zeilenAbstand = Math.max(basisNodeHoehe('stimmung'), basisNodeHoehe('kombinierer'), basisNodeHoehe('render')) + 40;
        const spaltenAbstand = NODE_W + 80;
        const stimmungX = 320;
        const kombX = stimmungX + spaltenAbstand;
        const renderX = kombX + spaltenAbstand;
        const vergleichX = renderX + spaltenAbstand;
        // W2 (0.6.6 Welle 3, Rundgang-Befund 0.6.5 «Default-Kette und
        // Stimmungs-Kette überlappen teils», docs/rundgang/bilder/17-vis-graph.png):
        // die drei Spalten-/Zeilen-Koordinaten oben waren bisher FEST — ein
        // zweiter Klick auf «+ Drei Stimmungen» (oder ein Klick, nachdem der
        // Graph schon eine eigene «Default»-Kette trägt) legte die neue Kette
        // exakt auf die alte. Fix: ein Basis-Versatz, der die GESAMTE neue
        // Kette unterhalb der tiefsten Unterkante ALLER bestehenden Nodes
        // startet — bei einem leeren/neuen Graphen bleibt er 0 (Layout
        // byte-identisch zum bisherigen Verhalten, vis-oberflaeche.spec
        // «Drei Stimmungen: … kein Overlap» prüft genau diesen Fall).
        const bestehend = doc.get<VisGraph>(gid)?.nodes ?? [];
        const basisY =
          bestehend.length === 0
            ? 0
            : Math.max(0, ...bestehend.map((n) => n.y + basisNodeHoehe(n.typ))) + 40;
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

  /**
   * W1 Massnahme 3b («Kein Overlap»): statt eines festen Rasterpunkts eine
   * Spiral-Platzsuche — prüft die Bounding-Box des neuen Nodes gegen ALLE
   * bestehenden (mit 24px Sicherheitsabstand) und weicht sonst spiralförmig
   * (wachsender Radius, 12 Winkel je Umlauf) nach aussen aus. Reine App-Logik,
   * `vis.nodeSetzen` bleibt unverändert (EIN Command, EIN Undo-Schritt).
   */
  const nodeHinzu = (typ: string) => {
    if (!graphId) return;
    try {
      const bestehend = doc.get<VisGraph>(graphId)?.nodes ?? [];
      const eigeneHoehe = basisNodeHoehe(typ);
      const ABSTAND = 24;
      const passtHier = (x: number, y: number) =>
        !bestehend.some((n) => {
          const nHoehe = basisNodeHoehe(n.typ);
          return (
            x < n.x + NODE_W + ABSTAND &&
            x + NODE_W + ABSTAND > n.x &&
            y < n.y + nHoehe + ABSTAND &&
            y + eigeneHoehe + ABSTAND > n.y
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
        // Kein freier Platz in 40 Umläufen (sehr grosser Graph) — weit unten
        // anhängen bleibt immer noch überlappungsfrei (unter allen Nodes).
        const maxY = bestehend.reduce((m, n) => Math.max(m, n.y + basisNodeHoehe(n.typ)), START_Y);
        return { x: START_X, y: maxY + ABSTAND };
      };
      const { x, y } = passtHier(START_X, START_Y) ? { x: START_X, y: START_Y } : findeSpiralPlatz();
      runCommand('vis.nodeSetzen', { graphId, typ, x: Math.max(20, x), y: Math.max(20, y) });
    } catch (err) {
      meldeFehler(err);
    }
  };

  // -----------------------------------------------------------------------
  // PC1 (`docs/V084-SPEZ.md` §5 W2, C-15/C-16/C-17) — Island-Modus, EIGENER
  // früher Return VOR jeder der drei Tab-Verzweigungen unten: die alte
  // VisTabs-Werkzeugzeile (Graph/Einfach/Ansichten-Tabs, KToolGruppen) und
  // DockFlaeche/`.vis-chrome-bottomright`/`-bottomleft` (in `NodeCanvas.tsx`,
  // Owner-Auftrag «alte Dock raus») rendern NUR noch im Modus 'manuell' —
  // wird dieser frühe Return nie erreicht (jeder Bestands-E2E-Lauf startet
  // über `manuell-seed.ts` mit `visOberflaeche:'manuell'`), bleibt JEDE
  // Zeile unterhalb byte-gleich zum Vorzustand (Bestandsschutz §5 Sanktion 8).
  // Node-Tree ist im Island-Modus die EINZIGE Ansicht (kein Einfach-/
  // Ansichten-Tab-Ersatz — deren Funktionen leben jetzt in der AUSTAUSCH-
  // Insel: Render senden/Aufs Plakat/Report, s. `island/inhalte/austausch.
  // tsx`; GespeicherteAnsichten bleibt eine dokumentierte Grenze, s.
  // Abschlussbericht).
  if (visOberflaeche === 'island') {
    return (
      <div className="vis-workspace-fuellen" data-testid="vis-island-fuellen">
        <div className="vis-workspace-buehne">
          {islandGraphId ? (
            <NodeCanvas key={islandGraphId} graphId={islandGraphId} islandModus />
          ) : (
            <div className="vis-workspace-buehne-zentriert">
              <Messrahmen
                height={200}
                caption="Noch kein Render-Graph — die GRAPH-Insel (links) legt einen an"
              />
            </div>
          )}
        </div>
        <IslandBuehne inseln={VIS_INSELN} registry={visInhaltsRegistry} onWerkzeugAktion={aktiviereVisIslandWerkzeug} />
        <KosmoOrb {...(onKosmoOeffnen ? { onKosmoOeffnen } : {})} />
        {islandReportOffen && <VisReportDossier onClose={() => setIslandReportOffen(false)} />}
      </div>
    );
  }

  if (tab === 'einfach') {
    return (
      <div className="vis-workspace-fuellen">
        <VisTabs tab={tab} setTab={setTab} onOnboardingOeffnen={() => setOnboardingOffen(true)} />
        <div className="vis-workspace-buehne">
          <EinfachAnsicht />
        </div>
        {onboardingOffen && <VisOnboarding onClose={() => setOnboardingOffen(false)} />}
      </div>
    );
  }

  if (tab === 'ansichten') {
    return (
      <div className="vis-workspace-fuellen">
        <VisTabs tab={tab} setTab={setTab} onOnboardingOeffnen={() => setOnboardingOffen(true)} />
        <div className="vis-workspace-buehne vis-ansichten-buehne">
          <GespeicherteAnsichten />
          <Hairline />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <GpuStatus />
            <KButton size="sm" tone="ghost" data-testid="vis-report-oeffnen" onClick={() => setReportOffen(true)}>
              Report öffnen
            </KButton>
          </div>
        </div>
        {onboardingOffen && <VisOnboarding onClose={() => setOnboardingOffen(false)} />}
        {reportOffen && <VisReportDossier onClose={() => setReportOffen(false)} />}
      </div>
    );
  }

  return (
    <div className="vis-workspace-fuellen">
      <VisTabs
        tab={tab}
        setTab={setTab}
        onOnboardingOeffnen={() => setOnboardingOffen(true)}
        {...(onEinstellungen ? { onEinstellungen } : {})}
      >
        {/* W1 Massnahme 6: KToolbar/KToolGruppe (UI-KONZEPT-065 §3) — Gruppen
            Graph | Bauen | Automatik. Alle testids + Beschriftungen wörtlich
            erhalten; `node-hinzu` bleibt ein natives Select (KSelect wrappt
            nur Styling, `page.selectOption` funktioniert unverändert).
            Kritik-065 Runde 1, Befund 4: explizite Hairline zwischen den
            Gruppen statt dem CSS-Geschwister-Selektor `.k-toolgruppe +
            .k-toolgruppe` zu vertrauen — sichtbar unabhängig davon, was
            sonst noch dazwischensteht. */}
        <KToolGruppe label="Graph">
          <KSelect
            size="sm"
            value={graphId}
            data-testid="graph-select"
            onChange={(e) => setAktiverGraph(e.target.value)}
          >
            {graphen.length === 0 && <option value="">— kein Graph —</option>}
            {graphen.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </KSelect>
          <KButton size="sm" tone="quiet" data-testid="graph-neu" onClick={neuerGraph}>
            + Graph
          </KButton>
        </KToolGruppe>
        <Hairline vertical />
        <KToolGruppe label="Bauen">
          <KSelect
            size="sm"
            value=""
            data-testid="node-hinzu"
            disabled={!graphId}
            onChange={(e) => e.target.value && nodeHinzu(e.target.value)}
          >
            <option value="">+ Node …</option>
            {Object.values(VIS_NODE_KATALOG).map((t) => (
              <option key={t.typ} value={t.typ}>{t.label}</option>
            ))}
          </KSelect>
          {/* SK-V2 (UI-Selbstkritik 0.6.4): «+»-Präfix wie bei «+ Graph»/«+ Node» —
              vorher stand «Drei Stimmungen» doppelt in der Leiste (Graph-NAME im
              Select links + dieser Knopf), ohne dass erkennbar war, dass der
              Knopf etwas NEUES anlegt.
              v0.8.0B / P5 (Gesetz 1, Signal-Flächen-Audit): tone accent → quiet.
              Die EINE Akzent-Primäraktion der Node-Tree-Ansicht ist «Ausführen»
              am Render-Node (B-124 «◉ Rendern»); ein zweiter Akzent-Knopf in
              derselben Ansicht verwässerte die 80·15·5-Dichte. testid + Text
              byte-gleich, reine Ton-Änderung. */}
          <KButton size="sm" tone="quiet" data-testid="drei-stimmungen" onClick={dreiStimmungen}>
            + Drei Stimmungen
          </KButton>
        </KToolGruppe>
        <Hairline vertical />
        <KToolGruppe label="Automatik">
          <KButton size="sm" tone="quiet" data-testid="vis-auto-kamera" onClick={kameraVorschlagen}>
            Kamera vorschlagen
          </KButton>
        </KToolGruppe>
        <Hairline vertical />
        {/* v0.8.0 / Paket PD2 (Default-Oberflächen) — derselbe Preset-
            Schnellzugriff wie die Design-Statusleiste/Einstellungen, hier als
            eigene Toolbar-Gruppe (KosmoVis hat keine Zero-Click-Statusleiste
            wie die Design-Station). `presetAnwenden()` ist die EINE geteilte
            Anwend-Funktion — kein zweiter Weg, kein Abweichen. */}
        <KToolGruppe label="Oberfläche">
          <span
            data-testid="dock-preset-schnellzugriff"
            role="group"
            aria-label="Oberflächen-Preset"
            title="Fokus/Arbeiten/Prüfen — kuratierte Layout-Presets (auch in Einstellungen → Darstellung)"
            className="vis-preset-schnellzugriff"
          >
            {PRESET_IDS.map((id) => (
              <button
                key={id}
                type="button"
                data-testid={`dock-preset-${id}`}
                aria-pressed={aktivesPresetVis === id}
                onClick={() => presetAnwenden('vis', id)}
                className={`vis-preset-eintrag${aktivesPresetVis === id ? ' vis-preset-eintrag--aktiv' : ''}`}
              >
                {PRESET_KURZLABEL[id]}
              </button>
            ))}
          </span>
        </KToolGruppe>
      </VisTabs>
      <div className="vis-workspace-buehne">
        {graphId ? (
          // Node-Palette (Welle 3, ZUSÄTZLICH zum nativen `node-hinzu`-Select
          // oben — der bleibt der E2E-Vertrag): der Klick ruft dieselbe
          // Spiral-Platzsuche wie das Select, `nodeHinzu` bleibt der EINE Ort,
          // der das entscheidet.
          <NodeCanvas key={graphId} graphId={graphId} onNodeHinzu={nodeHinzu} />
        ) : (
          <div className="vis-workspace-buehne-zentriert">
            <Messrahmen
              height={200}
              caption="Noch kein Render-Graph — «+ Graph» beginnt leer, «Drei Stimmungen» setzt den fertigen Teilgraph"
            />
          </div>
        )}
      </div>
      {onboardingOffen && <VisOnboarding onClose={() => setOnboardingOffen(false)} />}
    </div>
  );
}

/**
 * Werkzeugzeile der Station (W1: KToolbar statt manueller Div — UI-KONZEPT-065
 * §4 Regel 1 «eine Werkzeugzeile pro Station»). Der doppelte Stationsname
 * (Badge hier UND Toolbar-Titel in der Kopfleiste) bleibt bewusst — diese
 * Zeile ist der Tab-Wechsler (SK-A1), keine Redundanz zum Entfernen.
 */
function VisTabs({
  tab,
  setTab,
  children,
  onEinstellungen,
  onOnboardingOeffnen,
}: {
  tab: 'graph' | 'einfach' | 'ansichten';
  setTab: (t: 'graph' | 'einfach' | 'ansichten') => void;
  children?: React.ReactNode;
  onEinstellungen?: () => void;
  /** v0.8.1 / P8 (Vis-Onboarding-Stepper) — jederzeit erneut aufrufbar. */
  onOnboardingOeffnen?: () => void;
}) {
  return (
    <KToolbar>
      <Badge hue={moduleHue.vis}>KosmoVis</Badge>
      <KTabs
        items={VIS_TAB_ITEMS}
        aktiv={tab}
        onChange={(id) => setTab(id as 'graph' | 'einfach' | 'ansichten')}
        size="sm"
      />
      <Hairline vertical />
      {children}
      <div className="vis-toolbar-spacer" />
      <span className="vis-toolbar-hinweis">
        Render nur auf «Ausführen» — der Graph ist Teil des Projekts (Undo, Sync)
      </span>
      {onOnboardingOeffnen && (
        <KButton
          size="sm"
          tone="ghost"
          data-testid="vis-onboarding-oeffnen"
          title="Erste Schritte — KosmoVis"
          aria-label="Erste Schritte — KosmoVis"
          onClick={onOnboardingOeffnen}
        >
          ?
        </KButton>
      )}
      {onEinstellungen && (
        <KButton
          size="sm"
          tone="ghost"
          data-testid="station-einstellungen-vis"
          title="Einstellungen — KosmoVis"
          aria-label="Einstellungen — KosmoVis"
          onClick={onEinstellungen}
        >
          <KIcon name="zahnrad" size={14} />
        </KButton>
      )}
      {/* PC1 (`docs/V084-SPEZ.md` §5 W2, C-15) — additiver Rückweg AUS
          'manuell': Muster `DesignWorkspace.tsx`s `island-zurueck`-Knopf
          (Z.2441-2456, PD2 C-41) — der Vorwärtsweg ('manuell' → 'island') ist
          das 'Manuell'-Insel-Werkzeug in AUSTAUSCH (nur im Island-Modus
          sichtbar); dieser Knopf ist sein Gegenstück, unaufdringlich in
          derselben Werkzeugleisten-Region. Additiv, kein Ersatz — die
          klassische VisTabs-Fläche bleibt vollständig erhalten. */}
      <VisIslandZurueckKnopf />
    </KToolbar>
  );
}

/**
 * Eigene Komponente statt eines Props-Durchreichens (VisTabs bleibt sonst
 * unverändert für jeden Bestands-Aufrufer/-Test) — liest `setVisOberflaeche`
 * direkt aus dem Store, dasselbe Zugriffsmuster wie jeder Insel-Inhalt.
 */
function VisIslandZurueckKnopf() {
  const setVisOberflaeche = useUiZustand((s) => s.setVisOberflaeche);
  return (
    <KButton
      size="sm"
      tone="ghost"
      data-testid="island-zurueck"
      title="Zurück zur Island-UI"
      aria-label="Zurück zur Island-UI"
      onClick={() => setVisOberflaeche('island')}
    >
      Island-UI
    </KButton>
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
      // C-11-Matrix-Fund (v0.8.8): dieser ältere Manuell-Weg trug eine EIGENE
      // Platzierungs-Kopie ohne den E7-Deckel und ohne das Pflicht-Label
      // «Vorschau (Fake-Render)» — jetzt derselbe gehärtete Kern wie der
      // Node-Graph-Weg (`vis-jobs.ts::platziereBildAufsBlatt`: Deckel wirft
      // VOR jedem Doc-Zugriff, Label in derselben Undo-Gruppe).
      const blattName = platziereBildAufsBlatt(dataUrl, titel);
      setHinweis(`Render liegt auf «${blattName}» — im KosmoPublish weiterschieben`);
    } catch (e) {
      setError(`Aufs Blatt fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  /**
   * PC1 (`docs/V084-SPEZ.md` §5 W2, C-17): `render.environment` ADDITIV —
   * `presetOverride` (submitSerie kennt sein Preset aus der Schleife unten)
   * gewinnt vor dem global gewählten `renderStimmungPreset` (STIMMUNG-Insel,
   * `vis-runtime.ts`); ist beides leer, bleibt der Job byte-identisch zum
   * Vorzustand (kein `environment`-Feld — greift ausserhalb des Island-
   * Modus IMMER, weil dort nichts `renderStimmungPreset` je setzt).
   */
  const postJob = async (stylePrompt: string, presetOverride?: 'morgen' | 'abend' | 'weiss'): Promise<JobRecord> => {
    const { doc } = useProject.getState();
    const glb = exportGlb(doc, doc.settings.projectName);
    const preset = presetOverride ?? useVisRuntime.getState().renderStimmungPreset ?? undefined;
    const scene = {
      schema: 'kosmovis.render-scene/v1',
      cameras: 'auto',
      render: {
        resolution: [1600, 1000],
        samples: 128,
        faithful,
        ...(preset ? { environment: { preset } } : {}),
      },
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
      for (const [presetId, s] of Object.entries(VIS_STIMMUNGEN) as Array<['morgen' | 'abend' | 'weiss', { label: string; prompt: string }]>) {
        const job = await postJob(prompt ? `${s.prompt} — ${prompt}` : s.prompt, presetId);
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

  return (
    <div className="vis-einfach-flaeche">
      <div className="vis-einfach-stapel">
        <div className="vis-einfach-kopf">
          <Badge hue={moduleHue.vis}>KosmoVis</Badge>
          <span className="vis-einfach-kopf-text">
            Geometrie-treue Renderings über die HomeStation
          </span>
          <div className="vis-einfach-spacer" />
          <Badge hue={health === 'ok' ? 'var(--k-success)' : 'var(--k-danger)'}>
            Bridge {health}
          </Badge>
        </div>

        <Panel className="vis-einfach-panel">
          <div className="vis-einfach-zeile">
            <label className="vis-einfach-label">
              Bridge-URL{' '}
              <input
                value={bridgeUrl}
                onChange={(e) => {
                  setBridgeUrl(e.target.value);
                  localStorage.setItem('kosmo.bridge', e.target.value);
                }}
                className="vis-einfach-feld vis-einfach-feld--breit"
              />
            </label>
            <label className="vis-einfach-label">
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
            className="vis-einfach-feld vis-einfach-feld--prompt"
          />
          {/* V8: finaler Prompt — Modell-Materialien sprechen mit, alles überschreibbar */}
          <textarea
            data-testid="finaler-prompt"
            value={promptOverride ?? finalerRenderPrompt('', prompt, renderPromptBausteine(useProject.getState().doc))}
            onChange={(e) => setPromptOverride(e.target.value)}
            rows={2}
            className="vis-einfach-feld vis-einfach-feld--prompt-mono"
          />
          <span className="vis-einfach-hinweis-zeile">
            Finaler Prompt (geht so an die Bridge) — Material-Bausteine kommen aus den Wandaufbauten; Tippen überschreibt.
          </span>
          <div className="vis-einfach-aktionen">
            <KButton tone="accent" onClick={() => void submit()} disabled={sending || health !== 'ok'} data-testid="send-render">
              {sending ? 'Sende …' : 'Render-Job senden'}
            </KButton>
            <KButton tone="quiet" onClick={() => void submitSerie()} disabled={sending || health !== 'ok'} data-testid="send-serie">
              {/* Politur: Label aus STIMMUNGEN (= Kernel-Konstante VIS_STIMMUNGEN)
                  abgeleitet statt hart eingetippt — Knopftext kann nie von den
                  tatsächlich gesendeten Presets abweichen. */}
              {STIMMUNGEN.length} Varianten ({STIMMUNGEN.map((s) => s.label).join(' · ')})
            </KButton>
            <span className="vis-einfach-aktionen-hinweis">
              Modell wird als GLB exportiert; gerendert wird im GPU-Leerlauf-Fenster.
            </span>
          </div>
          {error && <div className="vis-einfach-fehler">⚠ {error}</div>}
          {hinweis && <div className="vis-einfach-erfolg" data-testid="vis-hinweis">✓ {hinweis}</div>}
        </Panel>

        {/* Varianten-Serien: Stimmungen nebeneinander, QA je Karte */}
        {[...serien].reverse().map((s) => (
          <div key={s.id} className="vis-einfach-serie" data-testid="varianten-serie">
            <div className="vis-einfach-serie-kopf">
              <span className="k-titel vis-einfach-serie-titel">Varianten-Serie</span>
              <span className="vis-einfach-serie-zeit">
                {new Date(s.ts).toLocaleString('de-CH')}
              </span>
            </div>
            <div className="vis-einfach-serie-raster">
              {Object.entries(s.jobs).map(([jobId, label], i) => {
                const j = jobById.get(jobId);
                return (
                  <Karteikarte key={jobId} nr={i + 1}>
                    <div className="vis-einfach-karte">
                      <div className="vis-einfach-karte-kopf">
                        <span className="vis-einfach-karte-label">{label}</span>
                        <div className="vis-einfach-spacer" />
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
                            className="vis-img-full"
                          />
                          <div className="vis-einfach-karte-meta">
                            {j.result.qa.geometry && (
                              <span>Geometrie <Measure>{j.result.qa.geometry.geometry_fidelity.toFixed(2)}</Measure></span>
                            )}
                            {j.result.qa.style && (
                              <span>Stil <Measure>{j.result.qa.style.style_score.toFixed(2)}</Measure></span>
                            )}
                            <div className="vis-einfach-spacer" />
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
          <Panel key={j.job_id} className="vis-einfach-job" data-testid="render-job">
            <div className="vis-einfach-job-kopf">
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
              <div className="vis-einfach-spacer" />
              <span className="vis-einfach-job-zeit">
                {new Date(j.created_at).toLocaleTimeString('de-CH')}
              </span>
            </div>
            {j.result && (
              <>
                <Hairline />
                <div className="vis-einfach-bilder">
                  {j.result.images.map((img) => (
                    <BridgeBild
                      key={img}
                      jobId={j.job_id}
                      imageName={img}
                      alt={img}
                      className="vis-einfach-bild-fest"
                    />
                  ))}
                  <div className="vis-einfach-detail">
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
                      <span className="vis-einfach-detail-grund">{j.result.qa.verdict.reason}</span>
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
