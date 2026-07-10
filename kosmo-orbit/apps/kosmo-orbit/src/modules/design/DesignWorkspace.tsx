import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Hairline, KButton, KIcon, type KIconName, KSelect, Measure, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import { LearningJournal } from '@kosmo/ai';
import {
  areaReport,
  derivePlan,
  fangKandidaten,
  elementFangKandidaten,
  type ElementFangPunkt,
  formatLength,
  generiereVolumenstudien,
  geschossZu,
  studienOptionenAusRegel,
  studienBerichtSvg,
  besonnungJeVariante,
  programmErfuellungJeVariante,
  variantenMatrix,
  parzelleZuOutline,
  fassadenModule,
  moduleAlsCsv,
  magnetFang,
  phaseLabel,
  siaPhaseLabel,
  UMBAU_LABEL,
  type Assembly,
  type Column,
  type ErkannteDecke,
  type ErkannteWand,
  type FangKandidaten,
  type Pt,
  type SectionSpec,
  type SiaPhase,
  type Stair,
  type Storey,
  type Wall,
  type Zone,
} from '@kosmo/kernel';
import { bootstrapProject, useProject } from '../../state/project-store';
import { verarbeiteUnternehmerplanDatei } from './unternehmerplan';
import { VERSCHIEBBAR } from './plan-hit-test';
import { masseingabeTaste, punktInRichtung, zeichenSnap, type Fluchtlinie } from './zeichenhilfen';
import { istEingabefeld, KURZTASTEN, kurztasteFuer } from './kurztasten';
import { setModulRaster, Viewport3D, type ViewportHandlers } from './Viewport3D';
import type { PlanLod } from './planLod';
import {
  IconAuswahl,
  IconDach,
  IconDockDraw,
  IconDockPrepare,
  IconDockPublish,
  IconDockVis,
  IconFaehigkeitBauablauf,
  IconFaehigkeitKv,
  IconFaehigkeitMaengel,
  IconFaehigkeitSonne,
  IconFaehigkeitStudien,
  IconFaehigkeitSubmission,
  IconMesh,
  IconSchnitt,
  IconStuetze,
  IconTreppe,
  IconVolumen,
  IconWand,
  IconZone,
} from './werkzeug-icons';
import { ModulEditor } from './ModulEditor';
import { PlanView } from './PlanView';
import { KennzahlenPanel } from './KennzahlenPanel';
import { DrawPanel } from './DrawPanel';
import { BerechnungslistePanel } from './BerechnungslistePanel';
import { KvPanel } from './KvPanel';
import { BauablaufPanel } from './BauablaufPanel';
import { MaengelPanel } from './MaengelPanel';
import { SubmissionsCheckPanel } from './SubmissionsCheckPanel';
import { RasterPanel } from './RasterPanel';
import { CurtainWallPanel } from './CurtainWallPanel';
import { FAEHIGKEIT_LABEL, PHASEN_PRESETS, empfohlenePlanPhaseFuer, type FaehigkeitId } from './phasen-presets';
import { UnternehmerplanPanel } from './UnternehmerplanPanel';
import { SplatPanel } from './SplatPanel';
import type { SplatCloud } from './splat-import';
import { Inspector } from './Inspector';
import { SectionView } from './SectionView';
import { exportIfcFile, exportPlanDxf, exportPlanPdf, exportPlanSvg, PHASEN_MASSSTAB } from './export-plan';
import { consumeDeepLink } from '../../state/deep-link';
import { journalStore } from '../../state/journal-store';
import { requestKosmoFokus } from '../../state/kosmo-focus';
import { EntwurfsDock, type EntwurfsModus } from './EntwurfsDock';
import { importIfc } from './ifc-import';
import { setContextMeshes, setSplatCloud, setSunDate, setTexturModus } from './Viewport3D';
import { registerActions } from '../../shell/palette';
import { fokusKlasse } from '../../state/fokus';
import {
  adaptiveFokusStufe,
  LEISTEN_BASIS,
  leiteTaetigkeitsKontextAb,
  nutzungMelden,
  nutzungsProfil,
  opazitaetsWert,
  ZEICHEN_WERKZEUG_IDS,
  type LeistenGruppe,
  type TaetigkeitsKontext,
} from '../../state/oberflaeche-adaption';
import { useAdaptionsSteuerung } from '../../state/oberflaeche-adaption-kern';
import { useUiZustand } from '../../state/ui-zustand';
import {
  begruendeModus,
  bewerteModi,
  entscheideModus,
  HYSTERESE_MS,
  MODI_VOLLSTAENDIG_0_6_6,
  sichtbaresSet,
  ARBEITSMODUS_LABEL,
  type Arbeitsmodus,
  type ModusSignale,
  type PointerArt,
} from '../../state/arbeitsmodi-kern';

/**
 * KosmoDesign — Arbeitsfläche. V1-Start: 3D-Viewport mit Wand-/Volumen-
 * Werkzeugen (Klick-Klick mit Gummiband, Snap aufs Raster), Geschossleiste,
 * Undo/Redo. Splitscreen mit 2D-Plänen folgt in M2.
 */

type ToolId = 'auswahl' | 'wand' | 'volumen' | 'zone' | 'dach' | 'treppe' | 'stuetze' | 'schnitt' | 'skizze' | 'mesh';

// K16 A6: dasselbe Lernjournal wie `KosmoPanel.tsx` (👍/👎) — EIN Store
// (`journalStore()`), eine Modul-Instanz. Loggt hier ausschliesslich, welche
// Skizze-Annäherung gewählt wurde (Datensammlung fürs spätere, kuratierbare
// LoRA-Training — KEIN Live-Training, s. Kommentar bei `onSketchAccept`).
const entwurfsJournal = new LearningJournal(journalStore());

const SNAP = 250; // mm Rasterfang, wenn keine Achse in Reichweite

/** Magnet aufs Stützenraster (Kreuzung > Achslinie), sonst 250er-Raster. */
function snap(p: Pt, magnet?: FangKandidaten): Pt {
  if (magnet) {
    const treffer = magnetFang(p, magnet);
    if (treffer) return treffer;
  }
  return { x: Math.round(p.x / SNAP) * SNAP, y: Math.round(p.y / SNAP) * SNAP };
}

/**
 * T7 (Fokus-Systematik): dezente Sektions-Beschriftung innerhalb der
 * Werkzeugleiste — «selten»-Stufe, macht die Gruppierung lesbar, ohne
 * eigenes Gewicht zu beanspruchen (docs/OBERFLAECHE-FOKUS-SYSTEMATIK.md).
 * v0.6.5 (W2, SK-D1/Regel 2 UI-KONZEPT-065 §4): nimmt optional ein KIcon vor
 * dem Text, damit «Export»/«Ebenen» in der Kontextzeile wie eine benannte
 * Menü-Gruppe statt einer blassen Inline-Sektion wirken — reine Optik, kein
 * neues Verhalten (`children` bleibt der Text, der bisher schon stand).
 */
/**
 * v0.6.5 Kritik-065 Runde 1, Befund [B] «Aktiv-Zustand als Füllfläche»:
 * Geschoss («EG»), Ansichts-Segment («Grundriss») und «Textur» tönten den
 * ganzen Knopf mit `tone="accent"` (Vollfüllung) statt dem §2-Hierarchie-
 * Rezept (UI-KONZEPT-065: «aktiv/gewählt = 1.5px --k-ink-Rahmen ODER
 * Akzent-Eckpunkt, nie beides, keine Vollfläche»). Diese Knöpfe bleiben
 * `tone="ghost"` (transparenter Grund) und bekommen im aktiven Zustand
 * NUR den betonten Tusche-Rahmen — Text/testid unverändert, reiner Stil.
 */
function aktivRahmen(aktiv: boolean): React.CSSProperties {
  return aktiv
    ? { borderWidth: 1.5, borderStyle: 'solid', borderColor: 'var(--k-ink)', color: 'var(--k-ink)', fontWeight: 600 }
    : {};
}

function Trennlabel({ children, icon }: { children: string; icon?: KIconName }) {
  return (
    <span
      className="k-selten"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--k-s1)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--k-ink-faint)',
        padding: '0 2px',
      }}
    >
      {icon !== undefined && <KIcon name={icon} size={14} />}
      {children}
    </span>
  );
}

// T3: Werkzeuge, die eine Punktkette setzen — bekommen Ortho-Sperre (Shift)
// und Fluchtlinien an bestehenden Punkten. Auswahl/Skizze bleiben unverändert
// (Skizze hat ihr eigenes Freihand-Overlay, Auswahl darf T1 nicht anfassen).
// Fable-Review-1-Auflage (Serie J / J3b): EINE Quelle der Werkzeugliste —
// `ZEICHEN_WERKZEUG_IDS` kommt aus `oberflaeche-adaption.ts` (die J3a-Matrix
// kennt dieselben Werkzeuge als "Zeichenkontext"); hier nur noch importiert,
// nicht mehr ein zweites Mal literal gepflegt.
const ZEICHEN_WERKZEUGE = new Set<ToolId>(ZEICHEN_WERKZEUG_IDS as readonly ToolId[]);
const FLUCHT_TOLERANZ = 150; // mm — grosszügig wie der bestehende Trefferzonen-Zuschlag

/** J3b: deutsche Anzeige-Labels je Werkzeugleisten-Gruppe (Adaptions-Hinweis, 2.3.5). */
const GRUPPEN_LABEL: Record<LeistenGruppe, string> = {
  zeichnen: 'Zeichnen',
  ansicht: 'Ansicht',
  export: 'Export',
  ebenen: 'Ebenen',
  faehigkeiten: 'Fähigkeiten',
  projekt: 'Projekt',
  verlauf: 'Verlauf',
};

/**
 * Serie K A5 (K15): die vier meistgenutzten Zeichenwerkzeuge tragen ein
 * Inline-SVG-Icon statt Textlabel (Owner «kein Text wo möglich») — Text bleibt
 * als `title`+`aria-label` erhalten (Zugänglichkeit, keine Kontraktänderung:
 * `data-testid`s unverändert). Die restlichen Werkzeuge (Dach/Treppe/Stütze/
 * Schnitt/Skizze) bleiben Text — seltener genutzt, teils geometrisch nicht auf
 * ein Icon reduzierbar. Begründung der Auswahl: Kommentar in
 * `werkzeug-icons.tsx`.
 */
const ZEICHEN_WERKZEUGE_LEISTE: readonly {
  id: ToolId;
  label: string;
  Icon?: () => React.JSX.Element;
  /** Stream B (W1b, Aufgabe 7): Icon ADDITIV VOR dem Text (nicht ersetzend)
   *  — nur für die fünf neu bebilderten Werkzeuge. Die vier bestehenden
   *  Icon-Werkzeuge (Auswahl/Wand/Volumen/Zone) bleiben Icon-ODER-Text, wie
   *  bisher (`e2e/oberflaeche-minimal.spec.ts` verlangt dort `innerText()`
   *  exakt leer — ein Vertrag, den dieses Feld unangetastet lässt). */
  iconMitText?: boolean;
}[] = [
  { id: 'auswahl', label: 'Auswahl', Icon: IconAuswahl },
  { id: 'wand', label: 'Wand', Icon: IconWand },
  { id: 'volumen', label: 'Volumen', Icon: IconVolumen },
  { id: 'zone', label: 'Zone', Icon: IconZone },
  { id: 'dach', label: 'Dach', Icon: IconDach, iconMitText: true },
  { id: 'treppe', label: 'Treppe', Icon: IconTreppe, iconMitText: true },
  { id: 'stuetze', label: 'Stütze', Icon: IconStuetze, iconMitText: true },
  { id: 'schnitt', label: 'Schnitt', Icon: IconSchnitt, iconMitText: true },
  { id: 'skizze', label: '✎ Skizze' },
];

/** F5 (v0.6.4): Tastenkürzel je Werkzeug — grossgeschrieben fürs Tooltip
 *  («Wand (W)») und die Kurzbefehle-Übersicht. Aus `kurztasten.ts` abgeleitet,
 *  keine zweite Belegung gepflegt (Mesh hat keinen Eintrag → kein Kürzel). */
const KURZTASTE_JE_WERKZEUG: Partial<Record<ToolId, string>> = Object.fromEntries(
  KURZTASTEN.map((k) => [k.werkzeug, k.taste.toUpperCase()]),
);

/** Statusleiste (Aufgabe 3, K15): kurzes deutsches Label je Werkzeug-ID,
 *  inkl. Mesh (das keinen Eintrag in `ZEICHEN_WERKZEUGE_LEISTE` hat). */
const WERKZEUG_KURZLABEL: Record<ToolId, string> = {
  auswahl: 'Auswahl',
  wand: 'Wand',
  volumen: 'Volumen',
  zone: 'Zone',
  dach: 'Dach',
  treppe: 'Treppe',
  stuetze: 'Stütze',
  schnitt: 'Schnitt',
  skizze: 'Skizze',
  mesh: 'Mesh',
};

/** Statusleiste: kurzes deutsches Label je Plan-LOD-Stufe (`planLod.ts`, B2). */
const LOD_KURZLABEL: Record<PlanLod, string> = { voll: 'voll', mittel: 'mittel', fern: 'fern' };

export interface DesignWorkspaceProps {
  /** Serie K / A4: öffnet das zentrale Einstellungs-Panel, vorgefiltert auf
   *  KosmoDesign. Optional, weil `App.tsx` der einzige Aufrufer ist, der
   *  diesen Weg kennt — Tests, die die Komponente isoliert mounten, brauchen
   *  ihn nicht. */
  onEinstellungen?: () => void;
  /** K16 A6 (Entwurfs-Einstieg «Sprechen/Schreiben»): öffnet das Kosmo-Panel —
   *  derselbe `setKosmoOpen`-Weg wie die Zentrale-Kachel `module-speak`
   *  (App.tsx). Optional aus demselben Grund wie `onEinstellungen`. */
  onKosmoOeffnen?: () => void;
  /** K16 A6: ist das Kosmo-Panel gerade offen? Nur für die Aktiv-Markierung
   *  des Entwurfs-Docks (Modus «Sprechen») — App.tsx kennt `kosmoOpen`
   *  bereits, hier rein lesend. */
  kosmoOffen?: boolean;
  /** A7 (EntwurfsDock, Grundicons anderer Stationen): wechselt die Station —
   *  derselbe Weg wie eine Zentrale-Kachel (`oeffneModul`, App.tsx). Ehrlich
   *  Navigation, keine Einbettung. Optional aus demselben Grund wie
   *  `onEinstellungen`/`onKosmoOeffnen` (isoliert gemountete Tests brauchen
   *  ihn nicht). */
  onStationOeffnen?: (station: 'vis' | 'publish' | 'prepare') => void;
}

export function DesignWorkspace({ onEinstellungen, onKosmoOeffnen, kosmoOffen, onStationOeffnen }: DesignWorkspaceProps = {}) {
  const revision = useProject((s) => s.revision);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const runCommand = useProject((s) => s.runCommand);
  const undo = useProject((s) => s.undo);
  const redo = useProject((s) => s.redo);
  const setActiveStorey = useProject((s) => s.setActiveStorey);
  // Block 3 / E4: FreeMesh-Viewport-Editiermodus — die ID lebt im Store (der
  // Inspector-Knopf «Mesh bearbeiten» setzt sie, ohne Prop-Bohrung).
  const meshEditId = useProject((s) => s.meshEditId);
  const setMeshEditId = useProject((s) => s.setMeshEditId);
  // A4: nach IFC-Import erkannte Bauteile als Übernahme-Angebot (gated)
  const [bestand, setBestand] = useState<{ waende: ErkannteWand[]; decken: ErkannteDecke[] } | null>(null);

  // Achsen-Magnet: Kandidaten des aktiven Geschosses, revision-abhängig
  const magnet = useMemo(
    () => (activeStoreyId ? fangKandidaten(useProject.getState().doc, activeStoreyId) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision, activeStoreyId],
  );

  // T3-Zeichenhilfen: bestehende Eckpunkte des Geschosses für Fluchtlinien
  // (Ausrichtung an Wandecken/Stützen/Zonen-Ecken) — reine Anzeige+Fang,
  // unabhängig vom Stützenraster-Magnet oben.
  const alignPunkte = useMemo(() => {
    if (!activeStoreyId) return [] as Pt[];
    const d = useProject.getState().doc;
    const pts: Pt[] = [];
    for (const w of d.byKind<Wall>('wall')) if (w.storeyId === activeStoreyId) pts.push(w.a, w.b);
    for (const s of d.byKind<Stair>('stair')) if (s.storeyId === activeStoreyId) pts.push(s.a, s.b);
    for (const c of d.byKind<Column>('column')) if (c.storeyId === activeStoreyId) pts.push(c.at);
    for (const e of d.inStorey(activeStoreyId)) {
      if (e.kind === 'zone' || e.kind === 'mass' || e.kind === 'roof' || e.kind === 'slab') pts.push(...e.outline);
    }
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, activeStoreyId]);

  // F4 (v0.6.4): Element-Fang-Kandidaten des aktiven Geschosses (Wand-Enden/
  // -Mitten, Stützen, Polygon-Ecken + Kanten) — dieselbe Ableitung wie der
  // Achsen-Magnet oben, nur über die gezeichneten Bauteile.
  const elementKandidaten = useMemo(
    () => (activeStoreyId ? elementFangKandidaten(useProject.getState().doc, activeStoreyId) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision, activeStoreyId],
  );

  // ArchiCAD-Gefühl: die Arbeitsfläche öffnet im Auswahl-Werkzeug (Pfeil), nicht
  // schon zeichnend — sonst baut der erste Klick versehentlich eine Wand.
  // Stream B (W1b, BEWEGUNGSKONZEPT-066 §6): dieses Feld + die Panel-Flags
  // unten wandern MECHANISCH 1:1 aus dem lokalen `useState` in den
  // zustand-Store `state/ui-zustand.ts` — gleiche Variablennamen über
  // Store-Selektoren, der restliche Datei-Code bleibt unverändert. Reine
  // Zeichen-/Geometrie-Zustände (points, cursor, drag*, fangPunkt, …) bleiben
  // bewusst lokal (nicht Teil der W1b-Migration).
  const tool = useUiZustand((s) => s.tool);
  const setTool = useUiZustand((s) => s.setTool);
  // K16 A6 (Entwurfs-Einstieg): der aktive Modus wird aus vorhandenem Zustand
  // ABGELEITET, keine zweite Quelle der Wahrheit — «Skizzieren» ist exakt das
  // bestehende `tool === 'skizze'`, «Sprechen» ist das Kosmo-Panel offen
  // (App.tsx), sonst «CAD» (die heutige Werkzeugleiste ist aktiv).
  const entwurfsModus: EntwurfsModus = tool === 'skizze' ? 'skizzieren' : kosmoOffen ? 'sprechen' : 'cad';
  const klickEntwurfSprechen = () => {
    nutzungMelden('zeichnen:entwurf-sprechen');
    onKosmoOeffnen?.();
  };
  const klickEntwurfSkizzieren = () => {
    setTool('skizze');
    nutzungMelden('zeichnen:entwurf-skizzieren');
  };
  const klickEntwurfCad = () => {
    // «Nur Markierung des Modus — kein Umbau» (Bauauftrag K16/3): die
    // klassische Werkzeugleiste existiert unverändert; ein Klick verlässt
    // höchstens den Skizzenmodus zurück zur Auswahl (ArchiCAD-Grundzustand).
    if (tool === 'skizze') setTool('auswahl');
    nutzungMelden('zeichnen:entwurf-cad');
  };
  const [treppenForm, setTreppenForm] = useState<'gerade' | 'podest' | 'u' | 'l'>('gerade');
  const viewMode = useUiZustand((s) => s.viewMode);
  const setViewMode = useUiZustand((s) => s.setViewMode);
  // SK-D1 Massnahme 2: Export-Gruppe hinter einem echten Auf/Zu-Trigger,
  // Default OFFEN (Begründung: Kommentar am `export-menu-toggle`-Knopf unten).
  const exportMenuOffen = useUiZustand((s) => s.exportMenuOffen);
  const setExportMenuOffen = useUiZustand((s) => s.setExportMenuOffen);
  // B5: Massstabs-Automatik — bestätigbarer Hinweis nach dem Phasenwechsel
  const [massstabHinweis, setMassstabHinweis] = useState<string | null>(null);
  const [assemblyId, setAssemblyId] = useState<string | null>(null);
  const [points, setPoints] = useState<Pt[]>([]);
  const [cursor, setCursor] = useState<Pt | null>(null);
  // T3-Zeichenhilfen: sichtbare Fluchtlinien + Ortho-Status fürs Overlay (PlanView)
  const [fluchtlinien, setFluchtlinien] = useState<Fluchtlinie[]>([]);
  const [orthoAktiv, setOrthoAktiv] = useState(false);
  // F4 (v0.6.4): getroffener Element-Fangpunkt — PlanView malt den sichtbaren
  // Marker (Quadrat/Kreis/Kreuz) an dieser Stelle, solange ein Zeichenwerkzeug
  // über einem Bauteil schwebt.
  const [fangPunkt, setFangPunkt] = useState<ElementFangPunkt | null>(null);
  // V-H1 «Zahlen zur Hand» (VORFORM-UI-KONZEPT §1.4): Ziffern-Puffer der
  // numerischen Direkteingabe während einer laufenden Zeichenkette.
  const [masseingabe, setMasseingabe] = useState('');
  // Ziehen im Plan (Auswahl-Werkzeug): Startpunkt gemerkt, aktuelle Position
  // folgt der Maus als reine Vorschau — erst bei pointerup EIN design.verschieben
  const [dragEntity, setDragEntity] = useState<{ id: string; start: Pt } | null>(null);
  const [dragCursor, setDragCursor] = useState<Pt | null>(null);
  // Block 3 / E4: meshEdit-Modus — angeklickte Fläche (Kernel-Dreiecks-Index)
  // + der Distanzwert des Extrudieren-Felds (Default 500 mm, Buildplan FM3).
  const [meshFace, setMeshFace] = useState<number | null>(null);
  const [meshDistanz, setMeshDistanz] = useState(500);
  // Volumenstudien (Q12): letzte Zone = Parzelle, Varianten als Gruppe übernehmen
  const studieOffen = useUiZustand((s) => s.studieOffen);
  const setStudieOffen = useUiZustand((s) => s.setStudieOffen);
  const drawOffen = useUiZustand((s) => s.drawOffen);
  const setDrawOffen = useUiZustand((s) => s.setDrawOffen);
  // K5 (Owner-Rundgang 0.6.2, S. 10): Drag-Hover-Zustand der kompakten
  // Unternehmerplan-Upload-Fläche (rein visuell).
  const [uplanDragUeber, setUplanDragUeber] = useState(false);
  // v0.6.9 Stream F: «Fensterband/CW setzen»-Dialog — bewusst LOKALER State
  // statt eines neuen useUiZustand-Flags: der Knopf sitzt wie deckeZeichnen
  // (H-7) ausserhalb der Werkzeug-Zähler-/Arbeitsmodi-Buchführung
  // (ebenenPanelOffen/offenePanels unten), ein neues Flag dort würde diese
  // Buchführung ohne Auftrag erweitern.
  const [cwSetzenOffen, setCwSetzenOffen] = useState(false);
  const listeOffen = useUiZustand((s) => s.listeOffen);
  const setListeOffen = useUiZustand((s) => s.setListeOffen);
  const rasterOffen = useUiZustand((s) => s.rasterOffen);
  const setRasterOffen = useUiZustand((s) => s.setRasterOffen);
  // KV-Grobschätzung (v0.6.3, Lücken-Batch 3, K22): Kostenvoranschlag-Panel
  // neben der Berechnungsliste — eigenes Panel statt Tab in BerechnungslistePanel,
  // damit der Ehrlichkeits-Hinweis («Richtwert, kein Devis») nicht in der
  // Fläche der Wohnungstyp-Tabelle untergeht.
  const kvOffen = useUiZustand((s) => s.kvOffen);
  const setKvOffen = useUiZustand((s) => s.setKvOffen);
  // Bauablauf-Grundgerüst (v0.6.3, Lücken-Batch 4, K22): Grob-Terminplan-Panel
  // gleich neben dem KV-Panel — dieselbe Anordnung, derselbe Ehrlichkeits-Grundsatz.
  const bauablaufOffen = useUiZustand((s) => s.bauablaufOffen);
  const setBauablaufOffen = useUiZustand((s) => s.setBauablaufOffen);
  // Mängel-/Abnahme-Grundgerüst (v0.6.3, Lücken-Batch 5, K22): Abschlussphase
  // «Gebäudeabnahme» — gleiche Panel-Anordnung wie KV/Bauablauf.
  const maengelOffen = useUiZustand((s) => s.maengelOffen);
  const setMaengelOffen = useUiZustand((s) => s.setMaengelOffen);
  // A7 (K17): Submissions-Check — sechstes Fähigkeits-Icon, erstes echtes UI
  // für `pruefeSubmissionsreife` (bislang nur `window.__kosmo.reife()` für
  // Tests). Gleiche Panel-Anordnung wie KV/Bauablauf/Mängel.
  const submissionOffen = useUiZustand((s) => s.submissionOffen);
  const setSubmissionOffen = useUiZustand((s) => s.setSubmissionOffen);
  // Splat-Werkzeug (Owner-Korrektur 05.07.: NICHT HomeStation-exklusiv) —
  // Crop/Ausdünnen/Export laufen lokal, siehe SplatPanel.tsx.
  const splatPanelOffen = useUiZustand((s) => s.splatPanelOffen);
  const setSplatPanelOffen = useUiZustand((s) => s.setSplatPanelOffen);
  const [splatCloud, setSplatCloudState] = useState<SplatCloud | null>(null);
  // T7: Projekt-Lebenszyklus — Phase/Bemassungsstil sind projektspezifisch und
  // wechseln über Jahre selten; sie stehen nicht mehr dauerhaft in der Werk-
  // zeugzeile, sondern im Projekt-Menü (Fokus-Stufe «selten»).
  const projektMenuOffen = useUiZustand((s) => s.projektMenuOffen);
  const setProjektMenuOffen = useUiZustand((s) => s.setProjektMenuOffen);
  // Serie K A5 (K15, Aufgabe 2): Überlauf-Menü «Mehr…» für die Export-/
  // Ebenen-Werkzeuge, die die Adaption gerade unter ihre Basis zurückstellt
  // (`gedaempfteGruppen`, weiter unten) — Zero-/One-Click-Zugriff statt nur
  // gedimmter Anblick.
  const mehrOffen = useUiZustand((s) => s.mehrOffen);
  const setMehrOffen = useUiZustand((s) => s.setMehrOffen);
  // Serie K A5 (Aufgabe 3): Plan-LOD-Stufe für die Statusleiste — kommt aus
  // `PlanView` (nur gemountet in 2d/split/quad), `onLod`-Callback hält den
  // letzten bekannten Wert auch, wenn die 3D-Ansicht allein aktiv ist.
  const [planLodStufe, setPlanLodStufe] = useState<PlanLod>('voll');
  const [wohnungstyp, setWohnungstyp] = useState<string | null>(null);
  const [zielGf, setZielGf] = useState<number | null>(null);
  const [maxHoeheM, setMaxHoeheM] = useState(25);
  // K3 (Owner-Rundgang 0.6.2, S. 8): «Textblöcke dürfen niemals überlappen» —
  // die Geschossleiste (links oben) und das Volumenstudien-Panel sassen
  // beide fest bei left:12, nur 40 px Top-Abstand auseinander; schon ab
  // einem einzigen Geschoss ragt die Geschossleiste (Buttons + Stapeln-
  // Knopf) tiefer als das und überdeckt das Studien-Panel. Fix weiter unten
  // (nach `storeys`): das Studien-Panel misst die tatsächliche Geschoss-
  // leisten-Höhe und rückt IMMER darunter — keine Kollision, unabhängig von
  // der Geschosszahl.
  const geschossleisteRef = useRef<HTMLDivElement>(null);
  const [geschossleisteHoehe, setGeschossleisteHoehe] = useState(40);

  // D1: Deep-Links der Zentrale — KosmoDraw/KosmoSketch öffnen die Werkstatt
  // mit dem passenden Panel bzw. Werkzeug (einmaliger Merker)
  useEffect(() => {
    const ziel = consumeDeepLink();
    if (ziel === 'draw') setDrawOffen(true);
    if (ziel === 'sketch') setTool('skizze');
  }, []);

  // C2: Materialkarten im Viewport (prozedurale PBR-Kacheln)
  const [texturen, setTexturen] = useState(localStorage.getItem('kosmo.texturen') !== '0');
  // Schattenstudie (Q12): Datum + Stunde (Viertelstunden), aus = Studio-Sonne
  const [sonneOffen, setSonneOffen] = useState(false);
  const [sonnenDatum, setSonnenDatum] = useState('2026-06-21');
  const [sonnenStunde, setSonnenStunde] = useState(14);

  useEffect(() => {
    if (!sonneOffen) {
      setSunDate(null);
      return;
    }
    const d = new Date(`${sonnenDatum}T00:00:00`);
    d.setMinutes(Math.round(sonnenStunde * 60));
    setSunDate(d);
  }, [sonneOffen, sonnenDatum, sonnenStunde]);

  useEffect(() => {
    bootstrapProject();
  }, []);

  // Palette-Aktionen (⌘K), nur solange KosmoDesign offen ist
  useEffect(() => {
    return registerActions('design', [
      { id: 'view-3d', titel: '3D', gruppe: 'Ansicht', run: () => setViewMode('3d') },
      { id: 'view-split', titel: '3D | Plan', gruppe: 'Ansicht', run: () => setViewMode('split') },
      { id: 'view-quad', titel: '4er-Splitscreen', gruppe: 'Ansicht', run: () => setViewMode('quad') },
      { id: 'view-2d', titel: 'Grundriss', gruppe: 'Ansicht', run: () => setViewMode('2d') },
      { id: 'export-pdf', titel: 'Grundriss als PDF', gruppe: 'Export', run: () => void exportPlanPdf() },
      { id: 'export-svg', titel: 'Grundriss als SVG', gruppe: 'Export', run: exportPlanSvg },
      { id: 'export-dxf', titel: 'Grundriss als DXF (CAD)', gruppe: 'Export', run: exportPlanDxf },
      { id: 'export-ifc', titel: 'Modell als IFC', gruppe: 'Export', run: exportIfcFile },
      { id: 'undo', titel: 'Rückgängig', gruppe: 'Bearbeiten', run: undo },
      { id: 'redo', titel: 'Wiederholen', gruppe: 'Bearbeiten', run: redo },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // T3/F5 (v0.6.4): Zeichen-Kurzbefehle (A/W/Z/V/D/T/C/S/F, Esc → Auswahl) —
  // an ArchiCAD angelehnt, nur solange KosmoDesign offen ist. Dieselbe
  // Eingabefeld-/Dialog-Wache wie shell/Kurzbefehle.tsx, damit Tippen (u.a.
  // in den Kosmo-Chat-Eingaben) nie ein Werkzeug wechselt — die reine
  // Auflösung (inkl. Fokus-Guard) lebt in `kurztasten.ts` (unit-getestet),
  // hier nur noch das DOM-Binding.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return; // Palette/Bestätigung/Kurzbefehle behalten die Tastatur
      const fokusImEingabefeld = istEingabefeld(document.activeElement);
      if (!e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey && !fokusImEingabefeld && e.key === 'Escape') {
        // ArchiCAD-Reflex: Esc bricht die laufende Kette ab UND geht zur Auswahl zurück
        setTool('auswahl');
        setPoints([]);
        return;
      }
      const werkzeug = kurztasteFuer(e, fokusImEingabefeld);
      if (werkzeug) {
        e.preventDefault();
        setTool(werkzeug as ToolId);
        // Serie J / J3c: Shortcut-Weg zählt genauso wie ein Leisten-Klick
        // (SERIE-J-BUILDPLAN.md Abschnitt 3, J3c-Schritte).
        nutzungMelden(`zeichnen:${werkzeug}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const doc = useProject.getState().doc;
  const storeys = useMemo(() => doc.storeysOrdered(), [doc, revision]);
  // H-9 (Sim-Befund): der Schnitt lief früher an runCommand vorbei (reiner
  // useState hier) — jetzt liegt die Schnittlinie in doc.settings.schnitt
  // (design.schnittSetzen), Undo/Yjs-Sync/Kosmo-Tool gelten automatisch.
  const sectionSpec = useMemo<SectionSpec | null>(
    () => doc.settings.schnitt ?? null,
    [doc, revision],
  );

  // A8 (K18, Bauphasen-Kopplung): wechselt die SIA-Teilphase (egal ob über
  // `sia-phase-select` oder — künftig — Undo/Redo/Sync), bietet Kosmo das
  // kuratierte Preset dieser Phase AN, wendet es aber NIE stumm um (Owner-
  // Kontrolle, dasselbe Prinzip wie die bewusste Nicht-Kopplung Phase↔Teil-
  // phase). `vorherigeSiaPhase` verhindert ein Angebot beim ERSTEN Mount
  // (kein Angebot ohne echten Wechsel).
  const vorherigeSiaPhase = useRef<SiaPhase | null>(null);
  const [phasenAngebot, setPhasenAngebot] = useState<SiaPhase | null>(null);
  // Angewendetes Preset: NUR UI-Zustand (welche Fähigkeits-Icons im Fokus
  // stehen) — kein Kernel-Command, geht nicht durchs Doc/Undo/Yjs (Laufzeit
  // ≠ Modell, s. `phasen-presets.ts`). Store-Migration (W1b): PERSISTIERT
  // (`kosmo.ui.v1`) — war vorher flüchtiger `useState`, überlebt jetzt einen
  // Neuladen (`ui-zustand.ts` persistiert `phasenFokus` bewusst, Kommentar dort).
  const phasenFokus = useUiZustand((s) => s.phasenFokus);
  const setPhasenFokus = useUiZustand((s) => s.setPhasenFokus);
  useEffect(() => {
    const aktuell = doc.settings.siaPhase;
    if (vorherigeSiaPhase.current !== null && vorherigeSiaPhase.current !== aktuell) {
      setPhasenAngebot(aktuell);
    }
    vorherigeSiaPhase.current = aktuell;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.settings.siaPhase]);
  // Serie K A5 (K15, Aufgabe 3): m²-Kurzwert der Statusleiste — ausgezogene
  // SIA-Fläche (NGF) des AKTIVEN Geschosses, dieselbe Zahl wie die
  // Berechnungsliste, nur je Geschoss statt Projekt-Summe (Zero-Click neben
  // «welches Geschoss ist aktiv»).
  const flaecheGeschossM2 = useMemo(() => {
    if (!activeStoreyId) return null;
    return areaReport(doc).storeys.find((s) => s.storeyId === activeStoreyId)?.ngf ?? 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, revision, activeStoreyId]);
  // K3: Geschossleisten-Höhe nachmessen, sobald sich die Geschosszahl ändert
  // (neues Geschoss, Undo, Projektwechsel) — das Studien-Panel liest das ab.
  useEffect(() => {
    setGeschossleisteHoehe(geschossleisteRef.current?.offsetHeight ?? 40);
  }, [storeys.length]);
  // Aktives Bemassungs-Preset aus den Settings ableiten (Anzeige im Select)
  const bemassungPreset = useMemo(() => {
    const b = doc.settings.bemassung;
    if (b.aussenKetten === 'beide' && !b.innenKetten && b.hoehenKoten) return 'standard';
    if (b.aussenKetten === 'gesamt' && !b.innenKetten && b.hoehenKoten) return 'wettbewerb';
    if (b.aussenKetten === 'beide' && b.innenKetten && b.hoehenKoten) return 'werkplan';
    if (b.aussenKetten === 'keine' && !b.innenKetten && !b.hoehenKoten) return 'aus';
    return 'eigen';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);
  const assemblies = useMemo(
    () => doc.byKind<Assembly>('assembly').filter((a) => a.target === 'wall'),
    [doc, revision],
  );
  const effectiveAssembly = assemblyId ?? assemblies[0]?.id ?? null;

  // Auto-Ansicht von Süden: Linie unter dem Modell, Blick nach Norden
  const elevationSpec = useMemo<SectionSpec | null>(() => {
    const walls = doc.byKind('wall');
    const masses = doc.byKind('mass');
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const eat = (q: Pt) => {
      minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x);
      minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y);
    };
    for (const w of walls) { if (w.kind === 'wall') { eat(w.a); eat(w.b); } }
    for (const m of masses) { if (m.kind === 'mass') for (const q of m.outline) eat(q); }
    for (const sl of doc.byKind('slab')) { if (sl.kind === 'slab') for (const q of sl.outline) eat(q); }
    if (minX === Infinity) return null;
    return {
      a: { x: minX - 1000, y: minY - 1000 },
      b: { x: maxX + 1000, y: minY - 1000 },
      depth: maxY - minY + 3000,
      lookLeft: true,
    };
  }, [doc, revision]);

  // T3-Zeichenhilfen: Shift-Ortho + Fluchtlinien VOR dem gewohnten Stützenraster-/
  // 250er-Snap — nur für die Zeichenwerkzeuge, Auswahl/Skizze bleiben unberührt
  // (T1-Interaktion darf sich nicht ändern). Referenzpunkt der Ortho-Sperre ist
  // der letzte gesetzte Punkt der laufenden Kette (Wand-Anfang, Polygon-Ecke…).
  const zielPunkt = (rawP: Pt, shiftKey: boolean): Pt => {
    if (!ZEICHEN_WERKZEUGE.has(tool)) {
      setFluchtlinien([]);
      setOrthoAktiv(false);
      setFangPunkt(null);
      return snap(rawP, magnet);
    }
    const ref = points.length > 0 ? points[points.length - 1]! : null;
    const erg = zeichenSnap(rawP, ref, shiftKey, magnet, alignPunkte, FLUCHT_TOLERANZ, (p) => snap(p, magnet), elementKandidaten);
    setFluchtlinien(erg.fluchtlinien);
    setOrthoAktiv(erg.orthoAktiv);
    setFangPunkt(erg.fang);
    return erg.p;
  };

  const handlersRef = useRef<ViewportHandlers>({});
  const select = useProject((s) => s.select);
  // V-H1: Live-Masszahl am Gummiband — Länge des AKTUELLEN Segments (letzter
  // Punkt → gesnappter Cursor) bzw. der Eingabepuffer, solange getippt wird.
  const massLabel = (() => {
    if (!ZEICHEN_WERKZEUGE.has(tool) || points.length === 0 || !cursor) return null;
    if (masseingabe !== '') return `${masseingabe} m ⏎`;
    const ref = points[points.length - 1]!;
    const len = Math.hypot(cursor.x - ref.x, cursor.y - ref.y);
    if (len < 1) return null;
    return `${(len / 1000).toFixed(2)} m`;
  })();

  handlersRef.current = {
    fluchtlinien,
    orthoAktiv,
    fangPunkt,
    massLabel,
    sketchMode: tool === 'skizze',
    pickMode: tool === 'auswahl',
    onPick: (id) => select(id ? [id] : []),
    // Block 3 / E4: FreeMesh-Editiermodus — Vertex-Handles + Flächen-Pick.
    // KEIN allgemeines Gizmo-Framework (Buildplan §5), nur dieser eine Modus.
    meshEditId,
    onMeshVertexDrag: (entityId, indices, delta) => {
      try {
        runCommand('design.meshVertexSchieben', { entityId, indices, ...delta });
      } catch (err) {
        meldeFehler(err);
      }
    },
    onMeshFaceClick: (_entityId, face) => setMeshFace(face),
    // Verschieben (Auswahl-Werkzeug): pointerdown auf einem Treffer wählt es an
    // und merkt den Startpunkt; pointerup committet EIN design.verschieben
    // (bleibt der Cursor am Startpunkt, ist dx/dy = 0 → reine Auswahl, kein Command).
    onMoveStart: (id, p) => {
      const e = doc.get(id);
      if (!e || !VERSCHIEBBAR.has(e.kind)) {
        select([id]);
        return false;
      }
      select([id]);
      setDragEntity({ id, start: snap(p, magnet) });
      setDragCursor(p);
      return true;
    },
    onMoveDrag: (p) => setDragCursor(p),
    onMoveEnd: (p) => {
      if (!dragEntity) return;
      const ziel = snap(p, magnet);
      const dx = ziel.x - dragEntity.start.x;
      const dy = ziel.y - dragEntity.start.y;
      setDragEntity(null);
      setDragCursor(null);
      if (dx === 0 && dy === 0) return;
      try {
        runCommand('design.verschieben', { entityId: dragEntity.id, dx, dy });
      } catch (err) {
        meldeFehler(err);
      }
    },
    moveOffset:
      dragEntity && dragCursor
        ? (() => {
            const ziel = snap(dragCursor, magnet);
            return { id: dragEntity.id, dx: ziel.x - dragEntity.start.x, dy: ziel.y - dragEntity.start.y };
          })()
        : null,
    onGroundDoubleClick: (e) => {
      // ArchiCAD-Geste: Doppelklick schliesst/setzt die laufende Platzierung ab
      if (!activeStoreyId) return;
      const p = zielPunkt(e.p, e.shiftKey);
      if (tool === 'volumen' || tool === 'zone' || tool === 'dach') {
        // Der zweite Klick der Doppelklick-Geste liegt am selben Ort wie der
        // erste — der ist evtl. schon als (Duplikat-)Punkt angehängt worden.
        let outline = points;
        const letzter = outline[outline.length - 1];
        if (letzter && letzter.x === p.x && letzter.y === p.y) outline = outline.slice(0, -1);
        if (outline.length >= 3) {
          if (tool === 'dach') {
            try {
              runCommand('design.dachErstellen', {
                storeyId: activeStoreyId,
                outline,
                pitch: 35,
                overhang: 500,
              });
            } catch (err) {
              meldeFehler(err);
            }
          } else if (tool === 'volumen') {
            runCommand('design.volumenErstellen', { storeyId: activeStoreyId, outline, height: 9000 });
          } else {
            const n = useProject.getState().doc.byKind('zone').length + 1;
            runCommand('design.zoneErstellen', {
              storeyId: activeStoreyId,
              outline,
              name: `Raum ${n}`,
              sia: 'HNF',
              ...(wohnungstyp ? { program: wohnungstyp } : {}),
            });
          }
        }
      }
      // Wand/Treppe/Schnitt: Kette bzw. Antritt/Austritt-Eingabe abschliessen
      setPoints([]);
    },
    onSketchAccept: (segments, meta) => {
      if (!activeStoreyId || !effectiveAssembly) return;
      // T5: alle Segmente (evtl. aus mehreren frei gezeichneten Strichen)
      // als EINE Undo-Gruppe — ein «Rückgängig» hebt die ganze Skizzier-
      // Sitzung auf, nicht Wand für Wand.
      const { history } = useProject.getState();
      history.beginGroup();
      try {
        for (const seg of segments) {
          try {
            runCommand('design.wandZeichnen', {
              storeyId: activeStoreyId,
              a: seg.a,
              b: seg.b,
              assemblyId: effectiveAssembly,
            });
          } catch {
            // degenerierte Segmente (Länge 0 nach Snap) still überspringen
          }
        }
      } finally {
        history.endGroup();
      }
      // K16 A6 («Entscheid füttert die LoRA» — ehrlich: es ist Datensammlung
      // fürs spätere, kuratierbare Training, kein Live-Training): nur der
      // 2D-Annäherungs-Weg liefert `meta` (SketchOverlay bietet die 3 Karten
      // an, der 3D-Sketch-Weg ruft unverändert ohne `meta` auf).
      if (meta) {
        entwurfsJournal.add({
          sentiment: 'gut',
          context: `Skizze-Annäherung gewählt: ${meta.variante} (${meta.anzahl} Wände) — Trainingsdatensatz, kein Live-Training.`,
        });
      }
    },
    // A4 (ROADMAP 155): ein auf eine Wandfläche gezeichneter Strich ergibt
    // eine Öffnung statt eines Wand-Zugs — EIN `design.oeffnungSetzen`-Aufruf
    // (ein Undo-Schritt), derselbe Command-Weg wie jedes andere Werkzeug.
    onSketchWandOeffnung: (o) => {
      try {
        runCommand('design.oeffnungSetzen', {
          wallId: o.wallId,
          openingType: o.openingType,
          center: o.center,
          width: o.width,
          height: o.height,
          sill: o.sill,
        });
      } catch (err) {
        meldeFehler(err);
      }
    },
    previewLine:
      points.length > 0 && cursor
        ? tool === 'volumen' || tool === 'zone' || tool === 'dach'
          ? [...points, cursor, points[0]!]
          : [...points, cursor]
        : null,
    onGroundMove: (e) => setCursor(zielPunkt(e.p, e.shiftKey)),
    onEscape: () => {
      // Block 3 / E4: Esc beendet zuerst den meshEdit-Modus (räumt sich sonst
      // nie ohne den «Fertig»-Knopf ab); V-H1: dann den Ziffern-Puffer
      // (Tippfehler verwerfen, Kette behalten); sonst wie bisher die Kette.
      if (meshEditId) {
        setMeshEditId(null);
        return;
      }
      if (masseingabe !== '') {
        setMasseingabe('');
        return;
      }
      setPoints([]);
    },
    onGroundClick: (e) => {
      if (!activeStoreyId) return;
      punktSetzen(zielPunkt(e.p, e.shiftKey), e.shiftKey);
    },
  };

  // V-H1 «Zahlen zur Hand»: der Punkt-Commit ist aus onGroundClick extrahiert,
  // damit die numerische Direkteingabe (Enter) EXAKT denselben Werkzeug-Weg
  // nimmt — nur ohne erneutes Snappen (die getippte Länge ist die Absicht,
  // kein Fang darf sie verfälschen).
  function punktSetzen(p: Pt, shiftKey: boolean) {
      if (!activeStoreyId) return;
      if (tool === 'wand') {
        if (points.length === 0) {
          setPoints([p]);
        } else {
          const a = points[points.length - 1]!;
          if (a.x !== p.x || a.y !== p.y) {
            if (effectiveAssembly) {
              runCommand('design.wandZeichnen', {
                storeyId: activeStoreyId,
                a,
                b: p,
                assemblyId: effectiveAssembly,
              });
            }
            // Kettenzeichnen: Endpunkt wird neuer Anfang; Shift beendet
            setPoints(shiftKey ? [] : [p]);
          }
        }
      } else if (tool === 'mesh') {
        // Block 3 / E4: ein Klick = ein FreeMesh-Quader (Default 2×2×2 m,
        // at = Bodenpunkt gerundet — `zielPunkt` liefert bereits ganze mm).
        // Danach ist das Mesh normal pickbar (userData.entityId, s. Viewport3D).
        try {
          runCommand('design.meshErstellen', {
            form: 'quader',
            storeyId: activeStoreyId,
            at: p,
            breite: 2000,
            laenge: 2000,
            hoehe: 2000,
          });
        } catch (err) {
          meldeFehler(err);
        }
      } else if (tool === 'stuetze') {
        // A3: ein Klick = eine Stütze (Default 30er Beton, Eigenschaften via Kosmo)
        try {
          runCommand('design.stuetzeSetzen', { storeyId: activeStoreyId, at: p });
        } catch (err) {
          meldeFehler(err);
        }
      } else if (tool === 'schnitt') {
        if (points.length === 0) {
          setPoints([p]);
        } else {
          try {
            runCommand('design.schnittSetzen', { a: points[0]!, b: p, depth: 30000, lookLeft: true });
            setViewMode('quad');
          } catch (err) {
            meldeFehler(err);
          }
          setPoints([]);
        }
      } else if (tool === 'treppe') {
        if (points.length === 0) {
          setPoints([p]);
        } else if (treppenForm === 'l' && points.length === 1) {
          // L-Lauf: dritter Klick folgt (a → ecke → b)
          setPoints([points[0]!, p]);
        } else {
          try {
            runCommand('design.treppeErstellen', {
              storeyId: activeStoreyId,
              a: points[0]!,
              b: p,
              width: 1200,
              form: treppenForm,
              ...(treppenForm === 'l' ? { ecke: points[1]! } : {}),
            });
          } catch (err) {
            meldeFehler(err);
          }
          setPoints([]);
        }
      } else if (tool === 'volumen' || tool === 'zone' || tool === 'dach') {
        if (points.length >= 3 && Math.hypot(p.x - points[0]!.x, p.y - points[0]!.y) < SNAP) {
          if (tool === 'dach') {
            try {
              runCommand('design.dachErstellen', {
                storeyId: activeStoreyId,
                outline: points,
                pitch: 35,
                overhang: 500,
              });
            } catch (err) {
              meldeFehler(err);
            }
          } else if (tool === 'volumen') {
            runCommand('design.volumenErstellen', {
              storeyId: activeStoreyId,
              outline: points,
              height: 9000,
            });
          } else {
            const n = useProject.getState().doc.byKind('zone').length + 1;
            runCommand('design.zoneErstellen', {
              storeyId: activeStoreyId,
              outline: points,
              name: `Raum ${n}`,
              sia: 'HNF',
              ...(wohnungstyp ? { program: wohnungstyp } : {}),
            });
          }
          setPoints([]);
        } else {
          setPoints([...points, p]);
        }
      }
  }

  useEffect(() => {
    setPoints([]);
    setMasseingabe('');
  }, [tool, activeStoreyId]);

  // V-H1: numerische Direkteingabe während einer laufenden Zeichenkette —
  // Ziffern/Komma füllen den Puffer, Enter setzt den Punkt in Cursor-Richtung
  // mit exakt der getippten Länge (Meter). CAPTURE-Phase + stopPropagation:
  // die globalen Stations-Kurzbefehle (Kurzbefehle.tsx: Ziffern 1–9 wechseln
  // die Station!) dürfen einer aktiven Zeichenkette die Zahlen nicht klauen.
  // Eigener Listener mit echten Deps (der Kurztasten-Handler oben ist bewusst
  // zustandslos registriert).
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (!ZEICHEN_WERKZEUGE.has(tool) || points.length === 0) return;
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (istEingabefeld(document.activeElement)) return;
      if (document.querySelector('[role="dialog"]')) return;
      // Esc mit gefülltem Puffer: NUR den Tippfehler verwerfen — die Kette
      // (und das Werkzeug) bleiben; der globale Esc-Handler kommt nicht dran.
      if (ev.key === 'Escape' && masseingabe !== '') {
        ev.preventDefault();
        ev.stopPropagation();
        setMasseingabe('');
        return;
      }
      const r = masseingabeTaste(masseingabe, ev.key);
      if (!r) return;
      ev.preventDefault();
      ev.stopPropagation();
      setMasseingabe(r.puffer);
      if (r.commit !== null && cursor) {
        const ref = points[points.length - 1]!;
        const p = punktInRichtung(ref, cursor, r.commit);
        if (p) punktSetzen(p, false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  // Ein neu betretener/verlassener Editiermodus verliert die alte Flächen-Auswahl.
  useEffect(() => {
    setMeshFace(null);
  }, [meshEditId]);

  // Block 3 / E4: verlässt der meshEdit-Modus sein Mesh (Löschen/Undo, das
  // FreeMesh verschwindet aus dem Doc), räumt der Modus sich selbst ab —
  // sonst hingen Handles/Overlay an einer toten ID.
  useEffect(() => {
    if (!meshEditId) return;
    const e = useProject.getState().doc.get(meshEditId);
    if (!e || e.kind !== 'freemesh') {
      setMeshEditId(null);
      setMeshFace(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meshEditId, revision]);

  const journal = useProject((s) => s.journal);
  const lastEntry = journal[journal.length - 1];

  // A4: erkannte IFC-Bauteile in EINEM Undo-Schritt als Entities übernehmen.
  // Geschosse aus Wand-Unterkanten geclustert, Aufbauten je Wandstärke.
  const bestandUebernehmen = () => {
    if (!bestand) return;
    const { history } = useProject.getState();
    const doc = () => useProject.getState().doc;
    history.beginGroup();
    try {
      const cluster: { z: number; hoehen: number[] }[] = [];
      for (const w of bestand.waende) {
        const c = cluster.find((k) => Math.abs(k.z - w.z0) <= 300);
        if (c) c.hoehen.push(w.hoehe);
        else cluster.push({ z: w.z0, hoehen: [w.hoehe] });
      }
      cluster.sort((a, b) => a.z - b.z);
      let maxIndex = (doc().storeysOrdered() as Storey[]).reduce((m, st) => Math.max(m, st.index), -1);
      cluster.forEach((c, i) => {
        const elevationen = (doc().storeysOrdered() as Storey[]).map((st) => st.elevation);
        if (geschossZu(elevationen, c.z, 300) >= 0) return; // Geschoss existiert
        const hoehen = [...c.hoehen].sort((x, y) => x - y);
        runCommand('design.geschossErstellen', {
          name: `Bestand ${i + 1}`,
          index: ++maxIndex,
          elevation: Math.round(c.z),
          height: Math.max(2200, Math.round(hoehen[Math.floor(hoehen.length / 2)]!)),
        });
      });
      const aufbauFuer = (dicke: number): string => {
        const d = Math.max(50, Math.round(dicke / 5) * 5);
        const summe = (a: Assembly) => a.layers.reduce((s2, l) => s2 + l.thickness, 0);
        const passt = doc()
          .byKind<Assembly>('assembly')
          .find((a) => a.target === 'wall' && Math.abs(summe(a) - d) <= 10);
        if (passt) return passt.id;
        runCommand('design.aufbauErstellen', {
          name: `Bestand ${d} mm`,
          target: 'wall',
          layers: [{ material: 'mauerwerk', thickness: d, function: 'tragend' }],
        });
        return doc()
          .byKind<Assembly>('assembly')
          .find((a) => a.name === `Bestand ${d} mm`)!.id;
      };
      const storeyFuer = (z: number): string | null => {
        const geordnet = doc().storeysOrdered() as Storey[];
        const i = geschossZu(geordnet.map((st) => st.elevation), z, 600);
        return i >= 0 ? geordnet[i]!.id : null;
      };
      for (const w of bestand.waende) {
        const storeyId = storeyFuer(w.z0);
        if (!storeyId) continue;
        runCommand('design.wandZeichnen', {
          storeyId,
          a: w.a,
          b: w.b,
          assemblyId: aufbauFuer(w.dicke),
        });
      }
      for (const d of bestand.decken) {
        const storeyId = storeyFuer(d.zOben);
        if (!storeyId) continue;
        runCommand('design.deckeZeichnen', {
          storeyId,
          outline: d.outline,
          thickness: Math.min(600, Math.max(60, Math.round(d.dicke))),
        });
      }
    } finally {
      history.endGroup();
    }
    setBestand(null);
    setContextMeshes([]); // Kontext-Layer weicht dem editierbaren Modell
  };

  // Fable-Review-2-Auflage J3c-0b: irgendein Ebenen-Panel offen? Die Ebenen-
  // Gruppe wird dann nie gedimmt (weder Sonne/Draw/Liste/Raster/Splat/Studie
  // selbst noch ihre Geschwister-Buttons in derselben Gruppe).
  // A7: `submissionOffen` gehört ausschliesslich zur neuen `faehigkeiten`-
  // Gruppe (kein Alt-Panel in `ebenen`) — trägt hier trotzdem mit ein, weil
  // `kontext.panelOffen` jetzt beide Gruppen vor Dimmung schützt (s.
  // `oberflaeche-adaption.ts`).
  const ebenenPanelOffen =
    sonneOffen ||
    drawOffen ||
    listeOffen ||
    rasterOffen ||
    splatPanelOffen ||
    studieOffen ||
    kvOffen ||
    bauablaufOffen ||
    maengelOffen ||
    submissionOffen;

  // ---------------------------------------------------------------------------
  // Stream B (W1b, Aufgabe 3) — Arbeitsmodi-Anbindung (BEWEGUNGSKONZEPT-066
  // §2-§4). Signale sammeln → `arbeitsmodi-kern` bewerten/entscheiden lassen
  // (Hysterese 5s) → `sichtbaresSet(modus)` steuert weiter unten, welche
  // Werkzeug-Gruppen/Panel-Schnellzugriffe aufgebaut werden. Neutral-Start
  // (arbeitsmodus `undefined`, `modusAutomatik: aus` per Playwright-Default)
  // = exakt heutige Voll-UI (Konzept §8, hart getestet).
  // ---------------------------------------------------------------------------

  // §2, Zeile «iPad-Skizzieren»: Stift-Pointer-Signal. Eigener Capture-
  // Handler am äusseren Wrapper (return-Statement unten) — Viewport3D/
  // PlanView sind tabu (Welle-2-Gebiet), dieser Handler liest nur `pointerType`
  // mit, greift nie in die eigentliche Zeiger-/Zeichenlogik ein.
  const [pointerType, setPointerType] = useState<PointerArt | undefined>(undefined);
  const onWorkspacePointerDownCapture: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const art: PointerArt | undefined = e.pointerType === 'pen' ? 'pen' : e.pointerType === 'touch' ? 'touch' : e.pointerType === 'mouse' ? 'maus' : undefined;
    if (art && art !== pointerType) setPointerType(art);
  };

  // Offene Panels als ID-Liste (Konzept §3 `offenePanels`) — dieselben
  // Flag-Namen wie `state/ui-zustand.ts` `PanelId`, damit `arbeitsmodi-kern.ts`
  // dieselbe Sprache spricht wie der Store.
  const offenePanels = useMemo(() => {
    const liste: string[] = [];
    if (studieOffen) liste.push('studieOffen');
    if (drawOffen) liste.push('drawOffen');
    if (listeOffen) liste.push('listeOffen');
    if (rasterOffen) liste.push('rasterOffen');
    if (kvOffen) liste.push('kvOffen');
    if (bauablaufOffen) liste.push('bauablaufOffen');
    if (maengelOffen) liste.push('maengelOffen');
    if (submissionOffen) liste.push('submissionOffen');
    if (splatPanelOffen) liste.push('splatPanelOffen');
    if (sonneOffen) liste.push('sonneOffen');
    if (exportMenuOffen) liste.push('exportMenuOffen');
    return liste;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studieOffen, drawOffen, listeOffen, rasterOffen, kvOffen, bauablaufOffen, maengelOffen, submissionOffen, splatPanelOffen, sonneOffen, exportMenuOffen]);

  const arbeitsmodus = useUiZustand((s) => s.arbeitsmodus);
  const setArbeitsmodus = useUiZustand((s) => s.setArbeitsmodus);
  const modusAutomatik = useUiZustand((s) => s.modusAutomatik);
  const setModusAutomatik = useUiZustand((s) => s.setModusAutomatik);
  const modusFesthalten = useUiZustand((s) => s.modusFesthalten);
  const setModusFesthalten = useUiZustand((s) => s.setModusFesthalten);
  const setModusManuell = useUiZustand((s) => s.setModusManuell);
  // Ehrlichkeits-UI (Konzept §5): Tooltip-Begründung + kurze Akzentuierung
  // des Chips, wenn die AUTOMATIK (nicht der Mensch) den Modus wechselt.
  const [modusGrund, setModusGrund] = useState<string[]>([]);
  const [modusAkzent, setModusAkzent] = useState(false);
  const [modusMenuOffen, setModusMenuOffen] = useState(false);

  const modusSignale = useMemo<ModusSignale>(
    () => ({
      tool,
      viewMode,
      offenePanels,
      ...(pointerType !== undefined ? { pointerType } : {}),
      siaPhase: doc.settings.siaPhase,
      ...(doc.settings.rolle !== null ? { rolle: doc.settings.rolle } : {}),
      station: 'design',
    }),
    [tool, viewMode, offenePanels, pointerType, doc.settings.siaPhase, doc.settings.rolle],
  );

  // Hysterese (Konzept §3): ein Moduswechsel wird frühestens nach
  // `HYSTERESE_MS` (5s) Signal-Stabilität übernommen — derselbe Kandidat muss
  // die volle Zeit über der bestbewertete bleiben, sonst startet der Timer
  // neu. `entscheideModus(..., stabilSeitMs=Infinity, ...)` liefert hier NUR
  // den aktuellen Kandidaten (kein Store-Zustand nötig, um "seit wann stabil"
  // zu tracken) — die Stabilität selbst übernimmt dieser `setTimeout`, exakt
  // wie `page.clock`/`fastForward()` es deterministisch vorspulen kann.
  const modusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!modusAutomatik) {
      if (modusTimer.current) {
        clearTimeout(modusTimer.current);
        modusTimer.current = null;
      }
      return undefined;
    }
    const scores = bewerteModi(modusSignale);
    const kandidat = entscheideModus(arbeitsmodus, scores, Number.POSITIVE_INFINITY, modusFesthalten);
    // `entscheideModus` liefert bei jedem "kein Wechsel"-Pfad exakt `aktuell`
    // (=`arbeitsmodus`) zurück — ein `undefined`-Kandidat ist also IMMER
    // gleich `arbeitsmodus` und landet schon im ersten Zweig. Der zweite
    // Check ist defensiv (macht `kandidat` für TS ab hier `Arbeitsmodus`,
    // ohne die Laufzeit-Logik zu ändern).
    if (kandidat === arbeitsmodus || kandidat === undefined) {
      if (modusTimer.current) {
        clearTimeout(modusTimer.current);
        modusTimer.current = null;
      }
      return undefined;
    }
    modusTimer.current = setTimeout(() => {
      setArbeitsmodus(kandidat);
      setModusGrund(begruendeModus(kandidat, modusSignale));
      setModusAkzent(true);
      window.setTimeout(() => setModusAkzent(false), 900);
    }, HYSTERESE_MS);
    return () => {
      if (modusTimer.current) clearTimeout(modusTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modusAutomatik, modusFesthalten, arbeitsmodus, modusSignale]);

  // Manuelle Übersteuerung (Konzept §3/§5, Modus-Chip-Menü unten): ein von
  // Hand gewählter Modus zählt als Übersteuerung — «festgehalten» friert ihn
  // sofort ein, die Automatik greift ab jetzt nicht mehr, bis der Mensch
  // wieder loslässt (`modus-festhalten`) oder die Automatik ganz ausschaltet.
  const modusHandVonListeWaehlen = (m: Arbeitsmodus) => {
    setArbeitsmodus(m);
    setModusManuell(m);
    setModusFesthalten(true);
    setModusMenuOffen(false);
  };
  const modusFesthaltenUmschalten = () => {
    setModusFesthalten(!modusFesthalten);
  };
  // «Automatik aus» (Konzept §3, wörtlich): «schaltet die Erkennung ganz ab
  // — dann zeigt die Oberfläche wie heute alles». Darum wird beim Ausschalten
  // zusätzlich der Modus selbst auf den Neutral-Zustand zurückgesetzt (statt
  // nur die Erkennung stillzulegen) — Voll-UI ist danach sofort wahr, nicht
  // erst nach dem nächsten Signalwechsel.
  const modusAutomatikUmschalten = () => {
    if (modusAutomatik) {
      setModusAutomatik(false);
      setArbeitsmodus(undefined);
      setModusFesthalten(false);
    } else {
      setModusAutomatik(true);
    }
    setModusMenuOffen(false);
  };

  // Schicht 1 (Konzept §4): welche Werkzeug-Gruppen/Panel-Schnellzugriffe der
  // aktuelle Modus überhaupt aufbaut. `undefined` (kein Modus erkannt/gesetzt
  // — der Playwright-Default) = Voll-UI, byte-identisch zu heute. Design-
  // Station 0.6.6: `export`/`faehigkeiten` sind die einzigen situativen
  // Gruppen, die ein Modus vollständig ausblendet (Erreichbarkeit bleibt über
  // das bestehende «Mehr…»-Überlaufmenü gewahrt, s. `ueberlaufWerkzeuge`
  // unten) — `zeichnen`/`ansicht`/`ebenen`/`projekt`/`verlauf` bleiben in
  // JEDEM Modus aufgebaut (Kern-Chrome, Werkzeugwechsel/Historie/Ansicht
  // dürfen nie ganz verschwinden).
  const modusSichtbarkeit = sichtbaresSet(arbeitsmodus);
  // `faehigkeiten` dupliziert bewusst nur bequem, was `ebenen` bereits zeigt
  // (Kommentar bei `FAEHIGKEITEN` unten) — sobald ein Modus sicher feststeht,
  // tritt der zweite, redundante Zugang zurück; der ERSTE (ebenen) bleibt.
  const faehigkeitenGruppeSichtbar = modusSichtbarkeit === undefined;
  // `export` bleibt nur im Modus «exportieren» selbst prominent — in jedem
  // anderen erkannten Modus tritt die Export-Kette zurück (Konzept-Tabelle
  // §2: «Werkplan-Export tritt zurück», hier auf die Design-Gruppen
  // übertragen).
  const exportGruppeSichtbar = modusSichtbarkeit === undefined || arbeitsmodus === 'exportieren';

  // Serie J / Batch J3b (SERIE-J-BUILDPLAN.md Abschnitt 2/3), Stream B (W1b,
  // Aufgabe 5): die Werkzeugleisten-Gruppen leben — ihre Fokus-Stufe kommt
  // aus `adaptiveFokusStufe` statt fest aus T7. `aktionLaeuft` = Punktkette
  // offen ODER 2D-Drag aktiv (die real in DesignWorkspace vorhandenen Flags;
  // `Viewport3D.tsx` bleibt unangetastet — siehe Restgrenze in
  // `leiteTaetigkeitsKontextAb`). W1b ergänzt additiv `rolle`/`siaPhase`/
  // `station`/`arbeitsmodus` für die Feinjustierung (§4/§7).
  const taetigkeitsKontext = useMemo<TaetigkeitsKontext>(
    () =>
      leiteTaetigkeitsKontextAb({
        tool,
        phase: doc.settings.phase,
        punkteOffen: points.length > 0,
        ziehtElement: dragEntity !== null,
        panelOffen: ebenenPanelOffen,
        rolle: doc.settings.rolle,
        siaPhase: doc.settings.siaPhase,
        station: 'design',
        // exactOptionalPropertyTypes: ein `arbeitsmodus: undefined`-Schlüssel
        // ist etwas anderes als ein FEHLENDER Schlüssel — konditionaler
        // Spread statt `arbeitsmodus ?? undefined` (CLAUDE.md-Muster).
        ...(arbeitsmodus !== undefined ? { arbeitsmodus } : {}),
      }),
    [
      tool,
      doc.settings.phase,
      points.length,
      dragEntity,
      ebenenPanelOffen,
      doc.settings.rolle,
      doc.settings.siaPhase,
      arbeitsmodus,
    ],
  );

  // Stream B (W1b, Aufgabe 2 — Hook-Deduplikation): dieselben ~100 Zeilen
  // React-Verdrahtung (Freeze/Debounce nach Regel 2.3.2, Opt-out-State,
  // Top-3-Element-Hebung ohne die multiplikative CSS-opacity-Falle), die
  // hier vorher inline standen (Serie J / J3b/J3c), leben jetzt EINMAL im
  // geteilten Hook `useAdaptionsSteuerung` (`oberflaeche-adaption-kern.ts`,
  // Batch B1) — Verhalten bewiesen identisch: `oberflaeche-adaption.spec.ts`
  // bleibt unverändert grün.
  const {
    adaptionIstAn,
    adaptionUmschalten,
    adaptionZuruecksetzenUndAuffrischen,
    stufeFuerGruppe,
    gedaempfteGruppen,
    adaptionHinweisSichtbar,
    elementStil,
    gruppeHatGehobenesElement,
  } = useAdaptionsSteuerung<LeistenGruppe, TaetigkeitsKontext>({
    taetigkeitsKontext,
    alleGruppen: Object.keys(LEISTEN_BASIS) as LeistenGruppe[],
    basisProGruppe: LEISTEN_BASIS,
    adaptiveStufe: adaptiveFokusStufe,
  });
  const adaptionHinweisTitel = adaptionHinweisSichtbar
    ? `${gedaempfteGruppen.map((g) => GRUPPEN_LABEL[g]).join('/')} zurückgestellt — du zeichnest gerade`
    : '';

  // Serie K A5 (Aufgabe 2): die Export-/Ebenen-Knöpfe waren bisher NUR inline
  // in der Werkzeugleiste verdrahtet — für das «Mehr…»-Überlaufmenü (unten)
  // brauchen dieselben Aktionen einen zweiten Aufrufort. Statt die Logik zu
  // duplizieren, tragen die Klick-Handler jetzt einen Namen; die Knöpfe unten
  // UND die Überlauf-Einträge rufen exakt dieselbe Funktion.
  const klickExportPdf = () => {
    void exportPlanPdf();
    nutzungMelden('export:pdf');
  };
  const klickExportSvg = () => {
    exportPlanSvg();
    nutzungMelden('export:svg');
  };
  const klickExportDxf = () => {
    exportPlanDxf();
    nutzungMelden('export:dxf');
  };
  const klickExportIfc = () => {
    exportIfcFile();
    nutzungMelden('export:ifc');
  };
  const klickImportIfc = () => {
    nutzungMelden('export:import-ifc');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ifc';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        const result = await importIfc(new Uint8Array(await f.arrayBuffer()));
        setContextMeshes(result.meshes);
        console.info(`IFC-Kontext: ${result.elementCount} Elemente (${result.schema})`);
        setBestand(result.erkannt.waende.length + result.erkannt.decken.length > 0 ? result.erkannt : null);
      } catch (err) {
        meldeFehler(`IFC-Import fehlgeschlagen: ${err instanceof Error ? err.message : err}`);
      }
    };
    input.click();
  };
  const klickImportDxf = () => {
    nutzungMelden('export:import-dxf');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.dxf,.dwg,.pdf';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      await verarbeiteUnternehmerplanDatei(f);
    };
    input.click();
  };
  const klickImportSplat = () => {
    nutzungMelden('export:import-splat');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.splat,.ply';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        const { parseSplatCloud } = await import('./splat-import');
        const cloud = parseSplatCloud(f.name, await f.arrayBuffer());
        setSplatCloud(cloud);
        setSplatCloudState(cloud);
        setSplatPanelOffen(true);
      } catch (err) {
        meldeFehler(`Splat-Import fehlgeschlagen: ${err instanceof Error ? err.message : err}`);
      }
    };
    input.click();
  };
  const klickSplatWerkzeug = () => {
    setSplatPanelOffen(!splatPanelOffen);
    nutzungMelden('export:splat-werkzeug');
  };
  const klickTextur = () => {
    setTexturModus(!texturen);
    setTexturen(!texturen);
    nutzungMelden('ebenen:textur');
  };
  const klickSonne = () => {
    setSonneOffen(!sonneOffen);
    nutzungMelden('ebenen:sonne');
  };
  const klickStudie = () => {
    setStudieOffen(!studieOffen);
    nutzungMelden('ebenen:studie');
  };
  const klickDraw = () => {
    setDrawOffen(!drawOffen);
    nutzungMelden('ebenen:draw');
  };
  const klickListe = () => {
    setListeOffen(!listeOffen);
    nutzungMelden('ebenen:liste');
  };
  const klickKv = () => {
    setKvOffen(!kvOffen);
    nutzungMelden('ebenen:kv');
  };
  const klickMaengel = () => {
    setMaengelOffen(!maengelOffen);
    nutzungMelden('ebenen:maengel');
  };
  const klickRaster = () => {
    setRasterOffen(!rasterOffen);
    if (!rasterOffen) setListeOffen(false);
    nutzungMelden('ebenen:raster');
  };
  // A7: vorher inline im Bauablauf-Knopf der Ebenen-Gruppe — jetzt benannt,
  // damit die neue Fähigkeiten-Gruppe denselben Handler aufruft (kein
  // Logik-Duplikat, s. Kommentar bei `FAEHIGKEITEN` unten).
  const klickBauablauf = () => {
    setBauablaufOffen(!bauablaufOffen);
    nutzungMelden('ebenen:bauablauf');
  };
  // A7: Submissions-Check ist neu (kein Alt-Knopf in `ebenen` — bislang gab
  // es dafür kein UI, s. `SubmissionsCheckPanel.tsx`).
  const klickSubmission = () => {
    setSubmissionOffen(!submissionOffen);
    nutzungMelden('faehigkeiten:submission');
  };

  /**
   * A7 (K17, Owner-Befund «Spezialfähigkeiten hinter Icons»): die sechs
   * Fähigkeits-Icons der neuen Werkzeugleisten-Gruppe. `klick` ruft
   * ABSICHTLICH exakt denselben Handler auf, den der jeweilige Alt-Knopf in
   * `ebenen` bereits benutzt (keine Logik-Kopie) — die Alt-Knöpfe selbst
   * bleiben unverändert an Ort und Stelle stehen (s. Kommentar bei
   * `LeistenGruppe` in `oberflaeche-adaption.ts`: ein Umzug hätte die
   * Pflicht-Regression `oberflaeche-adaption.spec.ts` zerstört, die
   * `sonne-toggle` explizit als Geschwister von `textur-toggle` in `ebenen`
   * voraussetzt). `voll` öffnet das zugehörige Panel IMMER (kein Toggle) —
   * die Rechtsklick-/⌄-Geste aus dem Bauauftrag («öffnet das Panel voll»).
   * Bei allen sechs Fähigkeiten ist der bestehende Klick-Handler bereits die
   * volle Fähigkeit (KvPanel/BauablaufPanel/MaengelPanel/StudienPanel/
   * SubmissionsCheckPanel sind je EIN Panel, keine Quick/Voll-Zweistufigkeit;
   * Sonne hat gar kein tieferes Panel) — «voll» unterscheidet sich vom Klick
   * daher NICHT im Ziel, sondern nur darin, dass es garantiert ÖFFNET statt
   * umzuschalten (ehrlich dokumentiert, keine erfundene zweite Tiefe).
   */
  const FAEHIGKEITEN: readonly {
    id: FaehigkeitId;
    titel: string;
    Icon: () => React.JSX.Element;
    aktiv: boolean;
    klick: () => void;
    voll: () => void;
  }[] = [
    {
      id: 'sonne',
      titel: 'Sonnenstudie — Schattenwurf/2h-Nachweis',
      Icon: IconFaehigkeitSonne,
      aktiv: sonneOffen,
      klick: klickSonne,
      voll: () => {
        setSonneOffen(true);
        nutzungMelden('faehigkeiten:sonne');
      },
    },
    {
      id: 'volumenstudien',
      titel: 'Volumenstudien — Massenvarianten aus der Parzelle',
      Icon: IconFaehigkeitStudien,
      aktiv: studieOffen,
      klick: klickStudie,
      voll: () => {
        setStudieOffen(true);
        nutzungMelden('faehigkeiten:volumenstudien');
      },
    },
    {
      id: 'kv',
      titel: 'KV — Kostenvoranschlag-Grobschätzung (Richtwert, kein Devis)',
      Icon: IconFaehigkeitKv,
      aktiv: kvOffen,
      klick: klickKv,
      voll: () => {
        setKvOffen(true);
        nutzungMelden('faehigkeiten:kv');
      },
    },
    {
      id: 'bauablauf',
      titel: 'Bauablauf — Grob-Terminplan',
      Icon: IconFaehigkeitBauablauf,
      aktiv: bauablaufOffen,
      klick: klickBauablauf,
      voll: () => {
        setBauablaufOffen(true);
        nutzungMelden('faehigkeiten:bauablauf');
      },
    },
    {
      id: 'maengel',
      titel: 'Mängel — Abnahme/Schlussbegehung',
      Icon: IconFaehigkeitMaengel,
      aktiv: maengelOffen,
      klick: klickMaengel,
      voll: () => {
        setMaengelOffen(true);
        nutzungMelden('faehigkeiten:maengel');
      },
    },
    {
      id: 'submission',
      titel: 'Submissions-Check — Lückenliste vor der Ausschreibung',
      Icon: IconFaehigkeitSubmission,
      aktiv: submissionOffen,
      klick: klickSubmission,
      voll: () => {
        setSubmissionOffen(true);
        nutzungMelden('faehigkeiten:submission');
      },
    },
  ];

  /**
   * A8: Preset-getriebene Fokus-Darstellung — reiner Style-Zusatz nach
   * demselben numerischen Opazitäts-Prinzip wie `elementStil` (oben,
   * Nutzer-Adaption): `phasenFokus` ist entweder `null` (kein Preset
   * angewendet, keine Wirkung) oder ein Set von Fähigkeits-IDs, die
   * `primaer` bleiben — der Rest dämpft auf `selten`. KEIN Entfernen aus dem
   * DOM, exakt die Owner-Vorgabe («Rest … gedämpft»). Unabhängig von
   * `elementStil`, weil `gehobenesElementDerGruppe` nur EIN Element je
   * Gruppe hebt (Nutzungshäufigkeit) — ein Phasen-Preset kann mehrere Icons
   * gleichzeitig in den Vordergrund stellen, das ist ein anderer Datenpfad.
   */
  function faehigkeitStil(id: FaehigkeitId): { style?: React.CSSProperties } {
    if (!phasenFokus) return {};
    return { style: { opacity: opazitaetsWert(phasenFokus.has(id) ? 'primaer' : 'selten') } };
  }

  /** Alle Export-/Ebenen-/Fähigkeiten-Werkzeuge, die die Adaption zurück-
   *  stellen ODER ein Arbeitsmodus ganz ausblenden kann — Grundlage des
   *  Überlauf-Menüs «Mehr…» (Aufgabe 2 + Aufgabe 3 Erreichbarkeits-Garantie).
   *  Stream B (W1b): `bauablauf`/`maengel` (Ebenen) und `submission`
   *  (Fähigkeiten, kein Alt-Knopf in Ebenen) waren hier bisher NICHT gelistet
   *  — additiv nachgezogen, damit auch sie einen One-Click-Ausweg haben,
   *  sobald ihre Gruppe zurücktritt. */
  const UEBERLAUFFAEHIGE_WERKZEUGE: { gruppe: LeistenGruppe; id: string; label: string; aktion: () => void }[] = [
    { gruppe: 'export', id: 'pdf', label: 'PDF', aktion: klickExportPdf },
    { gruppe: 'export', id: 'svg', label: 'SVG', aktion: klickExportSvg },
    { gruppe: 'export', id: 'dxf', label: 'DXF', aktion: klickExportDxf },
    { gruppe: 'export', id: 'ifc', label: 'IFC', aktion: klickExportIfc },
    { gruppe: 'export', id: 'import-ifc', label: 'IFC laden', aktion: klickImportIfc },
    { gruppe: 'export', id: 'import-dxf', label: 'DXF laden', aktion: klickImportDxf },
    { gruppe: 'export', id: 'import-splat', label: 'Splat laden', aktion: klickImportSplat },
    { gruppe: 'export', id: 'splat-werkzeug', label: 'Splat-Werkzeug', aktion: klickSplatWerkzeug },
    { gruppe: 'ebenen', id: 'textur', label: 'Textur', aktion: klickTextur },
    { gruppe: 'ebenen', id: 'sonne', label: 'Sonne', aktion: klickSonne },
    { gruppe: 'ebenen', id: 'studie', label: 'Varianten', aktion: klickStudie },
    { gruppe: 'ebenen', id: 'draw', label: 'Draw', aktion: klickDraw },
    { gruppe: 'ebenen', id: 'liste', label: 'Liste', aktion: klickListe },
    { gruppe: 'ebenen', id: 'kv', label: 'KV', aktion: klickKv },
    { gruppe: 'ebenen', id: 'raster', label: 'Raster', aktion: klickRaster },
    { gruppe: 'ebenen', id: 'bauablauf', label: 'Bauablauf', aktion: klickBauablauf },
    { gruppe: 'ebenen', id: 'maengel', label: 'Mängel', aktion: klickMaengel },
    { gruppe: 'faehigkeiten', id: 'submission', label: 'Submissions-Check', aktion: klickSubmission },
  ];
  // Zwei unabhängige Gründe, warum ein Werkzeug im Überlauf landet: (1) die
  // Fokus-Dimmung (Schicht 2) stellt seine Gruppe GERADE unter die T7-Basis
  // zurück (`gedaempfteGruppen`, bestehend seit Serie K) — ODER (2, NEU W1b)
  // der Arbeitsmodus (Schicht 1) baut seine Gruppe im Hauptband gar nicht
  // erst auf (`exportGruppeSichtbar`/`faehigkeitenGruppeSichtbar`, oben).
  // Sortiert nach Nutzungszählung absteigend (das meistgenutzte zuoberst) —
  // ein frischer, ungefrorener Lesezugriff genügt hier (reine Anzeige-
  // Reihenfolge, keine Debounce-Semantik nötig wie bei `stufeFuerGruppe`).
  const modusVerbirgtGruppe = (gruppe: LeistenGruppe): boolean =>
    (gruppe === 'export' && !exportGruppeSichtbar) || (gruppe === 'faehigkeiten' && !faehigkeitenGruppeSichtbar);
  const ueberlaufWerkzeuge =
    adaptionIstAn || modusSichtbarkeit !== undefined
      ? (() => {
          const zaehler = nutzungsProfil().zaehler;
          return UEBERLAUFFAEHIGE_WERKZEUGE.filter(
            (w) => (adaptionIstAn && gedaempfteGruppen.includes(w.gruppe)) || modusVerbirgtGruppe(w.gruppe),
          ).sort((a, b) => (zaehler[`${b.gruppe}:${b.id}`] ?? 0) - (zaehler[`${a.gruppe}:${a.id}`] ?? 0));
        })()
      : [];

  return (
    <div
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
      // Stream B (W1b, Aufgabe 3): pointerType-Signal für die Arbeitsmodi-
      // Erkennung («iPad-Skizzieren», Konzept §2) — Capture-Phase, damit das
      // Signal auch dann ankommt, wenn ein Kind-Element `stopPropagation()`
      // ruft. Viewport3D/PlanView bleiben unangetastet (Welle-2-Gebiet):
      // dieser Handler liest nur mit, greift nie in die Zeiger-/Zeichenlogik
      // ein.
      onPointerDownCapture={onWorkspacePointerDownCapture}
    >
      {/* Werkzeugleiste — v0.6.5 (W2, SK-D1/UI-KONZEPT-065 §4): GENAU eine
          Hauptzeile (Zeichnen | Ansicht | rechts Projekt-Menü/Einstellungen)
          plus höchstens EINE klar abgesetzte Kontextzeile (Export/Ebenen/
          Fähigkeiten/Verlauf + situative Selects) — nie eine dritte Zeile.
          Vorher: EIN Flex-Container mit `flexWrap:'wrap'`, der bei zu vielen
          Gruppen unkontrolliert in 2-3 Zeilen umbrach (SK-D1-Befund,
          UI-SELBSTKRITIK-064). Beide Reihen sind jetzt eigene Container mit
          `flexWrap:'nowrap'` (+ `overflowX:'auto'` als Sicherheitsventil bei
          sehr schmalem Viewport statt eines dritten Umbruchs). */}
      <div data-testid="design-werkzeugleiste" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Hauptzeile */}
        <div
          data-testid="design-werkzeugleiste-haupt"
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            gap: 'var(--k-s3)',
            padding: 'var(--k-s3) var(--k-s4)',
            borderBottom: '1px solid var(--k-line)',
            background: 'var(--k-surface)',
            zIndex: 2,
          }}
        >
          {/* K6 (Owner-Rundgang 0.6.2, S. 3): «KosmoDesign» stand hier UND in
              der App-Kopfzeile (App.tsx, dynamisches Modul-Badge, gilt für
              JEDE Station) — doppelte Beschriftung. Die Kopfzeile ist die
              generische, für alle Stationen gültige Anzeige und bleibt; das
              lokale Duplikat hier fällt weg. */}
          <span
            data-testid="leiste-gruppe-zeichnen"
            className={fokusKlasse(stufeFuerGruppe('zeichnen'))}
            style={{
              display: 'inline-flex',
              flexWrap: 'nowrap',
              gap: 'var(--k-s3)',
              alignItems: 'center',
              ...(gruppeHatGehobenesElement('zeichnen') ? { opacity: 1 } : {}),
            }}
          >
            {ZEICHEN_WERKZEUGE_LEISTE.map(({ id, label, Icon, iconMitText }) => {
              // F5 (v0.6.4, Owner-Befund «Tastenkombination wie ArchiCAD»): der
              // Tooltip nennt das Kurztaste-Kürzel («Wand (W)») — auch für die
              // Text-Knöpfe (Dach/Treppe/Stütze/Schnitt/Skizze), die bisher gar
              // keinen title trugen.
              const taste = KURZTASTE_JE_WERKZEUG[id];
              const titel = taste ? `${label} (${taste})` : label;
              return (
                <KButton
                  key={id}
                  size="sm"
                  tone={tool === id ? 'accent' : 'quiet'}
                  onClick={() => {
                    setTool(id);
                    nutzungMelden(`zeichnen:${id}`);
                  }}
                  data-testid={`tool-${id}`}
                  title={titel}
                  aria-label={titel}
                  {...elementStil('zeichnen', id)}
                >
                  {Icon ? (
                    iconMitText ? (
                      <>
                        <Icon /> {label}
                      </>
                    ) : (
                      <Icon />
                    )
                  ) : (
                    label
                  )}
                </KButton>
              );
            })}
            {/* Block 3 / E4 (Buildplan FM3): Werkzeug «Mesh» — expliziter
                `werkzeug-mesh`-Testid statt des generischen `tool-*`-Musters,
                weil die Auftragsspezifikation genau diesen Namen verlangt.
                Stream B (W1b, Aufgabe 7): Icon additiv vor dem Text ergänzt. */}
            <KButton
              size="sm"
              tone={tool === 'mesh' ? 'accent' : 'quiet'}
              onClick={() => {
                setTool('mesh');
                nutzungMelden('zeichnen:mesh');
              }}
              data-testid="werkzeug-mesh"
              {...elementStil('zeichnen', 'mesh')}
            >
              <IconMesh /> Mesh
            </KButton>
          </span>
          <div style={{ flex: 1 }} />
          {/* SK-D1 (Massnahme 1): Ansicht als kompakte, gerahmte Segment-Gruppe
              statt loser Ghost-Knöpfe — derselbe --k-field/--k-line-Ton wie
              die Kontextzeile signalisiert «hier wird umgeschaltet, nicht
              ausgelöst». testids/Texte unverändert (view-*, '3D'/'3D | Plan'/
              '4er'/'Grundriss'). */}
          <span
            data-testid="leiste-gruppe-ansicht"
            className={fokusKlasse(stufeFuerGruppe('ansicht'))}
            style={{
              display: 'inline-flex',
              flexWrap: 'nowrap',
              gap: 2,
              alignItems: 'center',
              background: 'var(--k-field)',
              border: '1px solid var(--k-line)',
              borderRadius: 'var(--k-radius-md)',
              padding: 'var(--k-s1)',
              ...(gruppeHatGehobenesElement('ansicht') ? { opacity: 1 } : {}),
            }}
          >
            {(
              [
                ['3d', '3D'],
                ['split', '3D | Plan'],
                ['quad', '4er'],
                ['2d', 'Grundriss'],
              ] as const
            ).map(([id, label]) => (
              <KButton
                key={id}
                size="sm"
                tone="ghost"
                onClick={() => {
                  setViewMode(id);
                  nutzungMelden(`ansicht:${id}`);
                }}
                data-testid={`view-${id}`}
                aria-pressed={viewMode === id}
                style={{ ...aktivRahmen(viewMode === id), ...elementStil('ansicht', id).style }}
              >
                {label}
              </KButton>
            ))}
          </span>
          <Hairline vertical />
          {/* SK-D1: «rechts: Menü-Trigger» — Projekt-Einstellungen (bereits ein
              Menü-Toggle, testid/Text unverändert) + Stations-Einstellungen,
              beide am rechten Rand der Hauptzeile. */}
          <span
            data-testid="leiste-gruppe-projekt"
            className={fokusKlasse(stufeFuerGruppe('projekt'))}
            style={{ display: 'inline-flex', ...(gruppeHatGehobenesElement('projekt') ? { opacity: 1 } : {}) }}
          >
            <KButton
              size="sm"
              tone={projektMenuOffen ? 'accent' : 'ghost'}
              data-testid="projekt-menu-toggle"
              title="Projekt-Einstellungen — SIA-Phase, Bemassungsstil (selten geändert)"
              onClick={() => {
                // Store-Migration (W1b): der `ui-zustand.ts`-Setter nimmt den
                // direkten Wert, kein funktionales Update mehr (zustand-Setter
                // sind keine React-`useState`-Setter).
                setProjektMenuOffen(!projektMenuOffen);
                nutzungMelden('projekt:menu');
              }}
              {...elementStil('projekt', 'menu')}
            >
              Projekt ▾
            </KButton>
          </span>
          {onEinstellungen && (
            <KButton
              size="sm"
              tone="ghost"
              data-testid="station-einstellungen-design"
              title="Einstellungen — KosmoDesign"
              aria-label="Einstellungen — KosmoDesign"
              onClick={onEinstellungen}
            >
              ⚙
            </KButton>
          )}
        </div>

        {/* Kontextzeile — SK-D1 Massnahme 1/2: Export/Ebenen/Fähigkeiten/
            Verlauf + situative Selects (Assembly bei Wand, Treppenform bei
            Treppe). Bewusst EINE zweite Zeile (nie mehr), klar abgesetzt über
            --k-field statt --k-surface (UI-KONZEPT-065 §2 Hierarchie-Rezept).
            Export/Ebenen bleiben inhaltlich Panel-Toggles statt eines echten
            ausklappbaren KMenu (Massnahme 2 erlaubt ausdrücklich «bleibt
            Panel-Toggle»): die alten `export-*`/`import-*`-testids werden von
            zahlreichen NICHT-W2-Spec-Dateien direkt angeklickt (module.spec,
            abnahme, splat, unternehmerplan*, sim-*, studienbericht — vorher
            per grep gezählt), ohne zuerst ein Menü zu öffnen. Ein echtes
            KMenu aus dem eingefrorenen `packages/kosmo-ui` setzt
            `pointer-events:none`, solange es zu ist, und würde diese Klicks
            brechen; eine dauerhaft klickbare, aber unsichtbare Fläche über dem
            Viewport (Opazitäts-Fächer-Pattern wie beim Orbit) widerspräche
            der ROADMAP-253-Lehre («Leiste überdeckte Plan-Klicks», s.
            UI-SELBSTKRITIK-064 SK-D1) — genau die koordinatensensiblen
            Plan-/Element-Fang-Tests, die dieser Stream grün halten muss.
            Die Gruppen wandern daher unverändert-klickbar hierher, nur
            visuell unter einem KIcon-Label zusammengefasst statt der alten
            blassen Inline-Sektion (dokumentierte Wahl, s. Bericht/Grenzen). */}
        <div
          data-testid="design-werkzeugleiste-kontext"
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'nowrap',
            gap: 'var(--k-s3)',
            padding: 'var(--k-s2) var(--k-s4)',
            borderBottom: '1px solid var(--k-line)',
            background: 'var(--k-field)',
            zIndex: 2,
          }}
        >
          {/* Kritik-065 Befund [A] «Export-Zeile verdrängt Rückgängig/
              Wiederholen»: die Kontextzeile ist EIN Flex-Container mit
              `overflowX:auto` — öffnete man die Export-Kette, wuchs der
              Inhalt über die Zeile hinaus und «Rückgängig»/«Wiederholen»
              (ganz am Ende) rutschten aus dem sichtbaren Bereich, nur per
              Scrollen erreichbar. Fix: der scrollende Teil (Zeichnen-Selects
              bis Adaption-Hinweis) wandert in einen eigenen `flex:1;
              min-width:0; overflow-x:auto`-Innenbereich; die Verlauf-Gruppe
              (`leiste-gruppe-verlauf`) steht als `flexShrink:0`-Geschwister
              DANACH, ausserhalb des scrollenden Bereichs — bleibt bei jedem
              Öffnen-Zustand sichtbar, unabhängig vom Toggle. Bleibt
              EIN Y-Band (design-werkzeugleiste.spec.ts). */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'nowrap',
              overflowX: 'auto',
              gap: 'var(--k-s3)',
              flex: 1,
              minWidth: 0,
            }}
          >
          {tool === 'wand' && assemblies.length > 0 && (
            <KSelect
              size="sm"
              value={effectiveAssembly ?? ''}
              onChange={(e) => setAssemblyId(e.target.value)}
            >
              {assemblies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </KSelect>
          )}
          {/* SK-D1 Massnahme 2 («EIN KMenu Export»): echter Auf/Zu-Trigger,
              STANDARDMÄSSIG OFFEN. Grund für «offen» als Default (dokumentierte
              Wahl, s. Bericht/Grenzen): ein Grep über alle Specs zeigte, dass
              zahlreiche NICHT-W2-Dateien (module.spec, abnahme, splat,
              unternehmerplan*, sim-*, studienbericht) `export-pdf`/`export-dxf`/
              `export-ifc`/`import-*`/`splat-werkzeug-toggle` DIREKT anklicken,
              ohne zuvor ein Menü zu öffnen. Mit Default «offen» sehen diese
              Specs die Gruppe unverändert wie vorher (sie rühren
              `export-menu-toggle` nie an); nur wer bewusst zuklappt (hier
              bewiesen in `design-werkzeugleiste.spec.ts`), verliert die Sicht
              auf die Knöpfe — nie ungefragt, nie versteckt-aber-klickbar über
              dem Viewport (ROADMAP-253-Lehre). */}
          {/* Stream B (W1b, Aufgabe 3): Schicht 1 (Arbeitsmodus) — die ganze
              Export-Gruppe (Trigger + Inhalt) wird nur aufgebaut, wenn kein
              Modus erkannt/gesetzt ist ODER der Modus selbst «exportieren»
              ist. Erreichbarkeits-Garantie: in jedem anderen Modus wandert
              der komplette Inhalt ins «Mehr…»-Überlaufmenü unten
              (`ueberlaufWerkzeuge`) — nichts wird unerreichbar. */}
          {exportGruppeSichtbar && (
            <>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--k-s1)' }}>
                <KButton
                  size="sm"
                  tone={exportMenuOffen ? 'accent' : 'ghost'}
                  data-testid="export-menu-toggle"
                  aria-expanded={exportMenuOffen}
                  aria-label="Export/Import — Menü auf-/zuklappen"
                  title="Export/Import — PDF, SVG, DXF, IFC, Splat"
                  onClick={() => setExportMenuOffen(!exportMenuOffen)}
                >
                  <KIcon name="export" size={14} /> Export {exportMenuOffen ? '▾' : '▸'}
                </KButton>
              </span>
              {exportMenuOffen && (
            /* Befund [A] «aufgeklappte Format-Kette wirkt wie lose Links»:
               gerahmter Container (1px --k-line-strong, --k-raised, Radius
               sm) — liest sich als GEÖFFNETES Menü-Band statt loser Links,
               ohne die testids/Klickbarkeit der Kinder anzufassen. */
            <span
              data-testid="leiste-gruppe-export"
              className={fokusKlasse(stufeFuerGruppe('export'))}
              style={{
                display: 'inline-flex',
                flexWrap: 'nowrap',
                gap: 'var(--k-s2)',
                alignItems: 'center',
                border: '1px solid var(--k-line-strong)',
                background: 'var(--k-raised)',
                borderRadius: 'var(--k-radius-sm)',
                padding: '2px 6px',
                ...(gruppeHatGehobenesElement('export') ? { opacity: 1 } : {}),
              }}
            >
              <KButton size="sm" tone="ghost" onClick={klickExportPdf} data-testid="export-pdf" {...elementStil('export', 'pdf')}>
                PDF
              </KButton>
              <KButton size="sm" tone="ghost" onClick={klickExportSvg} {...elementStil('export', 'svg')}>
                SVG
              </KButton>
              <KButton size="sm" tone="ghost" onClick={klickExportDxf} data-testid="export-dxf" {...elementStil('export', 'dxf')}>
                DXF
              </KButton>
              <KButton size="sm" tone="ghost" onClick={klickExportIfc} data-testid="export-ifc" {...elementStil('export', 'ifc')}>
                IFC
              </KButton>
              <KButton
                size="sm"
                tone="ghost"
                data-testid="import-ifc"
                onClick={klickImportIfc}
                {...elementStil('export', 'import-ifc')}
              >
                IFC laden
              </KButton>
              <KButton
                size="sm"
                tone="ghost"
                data-testid="import-dxf"
                onClick={klickImportDxf}
                {...elementStil('export', 'import-dxf')}
              >
                DXF laden
              </KButton>
              <KButton
                size="sm"
                tone="ghost"
                data-testid="import-splat"
                onClick={klickImportSplat}
                {...elementStil('export', 'import-splat')}
              >
                Splat laden
              </KButton>
              <KButton
                size="sm"
                tone={splatPanelOffen ? 'accent' : 'ghost'}
                data-testid="splat-werkzeug-toggle"
                onClick={klickSplatWerkzeug}
                {...elementStil('export', 'splat-werkzeug')}
              >
                Splat-Werkzeug
              </KButton>
            </span>
              )}
            </>
          )}
          <Hairline vertical />
          <Trennlabel icon="ebenen">Ebenen</Trennlabel>
          <span
            data-testid="leiste-gruppe-ebenen"
            className={fokusKlasse(stufeFuerGruppe('ebenen'))}
            style={{
              display: 'inline-flex',
              flexWrap: 'nowrap',
              gap: 'var(--k-s3)',
              alignItems: 'center',
              ...(gruppeHatGehobenesElement('ebenen') ? { opacity: 1 } : {}),
            }}
          >
            <KButton
              size="sm"
              tone="ghost"
              data-testid="textur-toggle"
              onClick={klickTextur}
              aria-pressed={texturen}
              style={{ ...aktivRahmen(texturen), ...elementStil('ebenen', 'textur').style }}
            >
              Textur
            </KButton>
            <KButton size="sm" tone={sonneOffen ? 'accent' : 'ghost'} data-testid="sonne-toggle" onClick={klickSonne} {...elementStil('ebenen', 'sonne')}>
              ☀ Sonne
            </KButton>
            <KButton size="sm" tone={studieOffen ? 'accent' : 'ghost'} data-testid="studie-toggle" onClick={klickStudie} {...elementStil('ebenen', 'studie')}>
              Varianten
            </KButton>
            <KButton size="sm" tone={drawOffen ? 'accent' : 'ghost'} data-testid="draw-toggle" onClick={klickDraw} {...elementStil('ebenen', 'draw')}>
              Draw
            </KButton>
            <KButton size="sm" tone={listeOffen ? 'accent' : 'ghost'} data-testid="liste-toggle" onClick={klickListe} {...elementStil('ebenen', 'liste')}>
              Liste
            </KButton>
            <KButton
              size="sm"
              tone={kvOffen ? 'accent' : 'ghost'}
              data-testid="kv-oeffnen"
              title="Kostenvoranschlag-Grobschätzung — Richtwert auf GF-Basis, kein Devis"
              onClick={klickKv}
              {...elementStil('ebenen', 'kv')}
            >
              KV
            </KButton>
            <KButton
              size="sm"
              tone={bauablaufOffen ? 'accent' : 'ghost'}
              data-testid="bauablauf-oeffnen"
              title="Bauablaufplan — abgeleiteter Grob-Terminplan, ersetzt keine Bauleitung"
              onClick={klickBauablauf}
              {...elementStil('ebenen', 'bauablauf')}
            >
              Bauablauf
            </KButton>
            <KButton
              size="sm"
              tone={maengelOffen ? 'accent' : 'ghost'}
              data-testid="maengel-oeffnen"
              title="Mängel — Abschlussphase Gebäudeabnahme, Anstoss zur Schlussbegehung"
              onClick={klickMaengel}
              {...elementStil('ebenen', 'maengel')}
            >
              Mängel
            </KButton>
            <KButton size="sm" tone={rasterOffen ? 'accent' : 'ghost'} data-testid="raster-toggle" onClick={klickRaster} {...elementStil('ebenen', 'raster')}>
              Raster
            </KButton>
          </span>
          {/* «Mehr…» wohnt AUSSERHALB des scrollenden Innenbereichs (siehe
              Einfügung nach dessen schliessendem div): der Innenbereich trägt
              overflowX:auto, und sobald eine Achse scrollt, klemmt CSS auch
              die andere — das absolute Dropdown war im DOM komplett, aber
              optisch unsichtbar (Kritik-066-Befund; besonders kritisch, weil
              die Arbeitsmodi ihre Erreichbarkeits-Garantie über genau diese
              Liste einlösen). */}
          {/* A7 (K17): «Fähigkeiten» — eine eigene Icon-Gruppe für die sechs
              Spezialfähigkeiten, zusätzlich zu den unveränderten Alt-Knöpfen in
              «Ebenen» (Begründung: Kommentar bei `FAEHIGKEITEN` oben). Klick =
              Fähigkeit wie heute; Rechtsklick ODER das kleine ⌄ öffnen das
              zugehörige Panel garantiert («voll»). */}
          {/* Stream B (W1b, Aufgabe 3): Schicht 1 (Arbeitsmodus) — «Fähigkeiten»
              ist ein bewusst REDUNDANTER Zweitzugang zu denselben Handlern
              wie «Ebenen» (Kommentar bei `FAEHIGKEITEN` unten). Sobald ein
              Modus sicher feststeht, tritt der zweite Zugang zurück; alle
              sechs Einträge bleiben über «Mehr…» weiterhin One-Click
              erreichbar (`ueberlaufWerkzeuge`). */}
          {faehigkeitenGruppeSichtbar && (
            <>
              <Hairline vertical />
              <Trennlabel>Fähigkeiten</Trennlabel>
              <span
                data-testid="leiste-gruppe-faehigkeiten"
                className={fokusKlasse(stufeFuerGruppe('faehigkeiten'))}
                style={{
                  display: 'inline-flex',
                  flexWrap: 'nowrap',
                  gap: 'var(--k-s2)',
                  alignItems: 'center',
                  ...(gruppeHatGehobenesElement('faehigkeiten') ? { opacity: 1 } : {}),
                }}
              >
                {FAEHIGKEITEN.map(({ id, titel, Icon, aktiv, klick, voll }) => (
              <span key={id} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <KButton
                  size="sm"
                  tone={aktiv ? 'accent' : 'ghost'}
                  data-testid={`faehigkeit-${id}`}
                  title={titel}
                  aria-label={titel}
                  onClick={klick}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    voll();
                  }}
                  style={{
                    width: 30,
                    height: 30,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // Reihenfolge bewusst: Nutzer-Adaption zuerst, ein
                    // angewendetes Phasen-Preset (falls vorhanden) gewinnt
                    // darüber — Owner-Kontrolle schlägt automatische Vermutung.
                    ...elementStil('faehigkeiten', id).style,
                    ...faehigkeitStil(id).style,
                  }}
                >
                  <Icon />
                </KButton>
                <button
                  type="button"
                  data-testid={`faehigkeit-${id}-voll`}
                  title={`${titel} — Panel voll öffnen`}
                  aria-label={`${titel} — Panel voll öffnen`}
                  onClick={voll}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontSize: 9,
                    lineHeight: 1,
                    padding: '0 2px',
                    color: 'var(--k-ink-faint)',
                  }}
                >
                  ⌄
                </button>
              </span>
            ))}
              </span>
            </>
          )}
          {tool === 'treppe' && (
            <KSelect
              size="sm"
              value={treppenForm}
              data-testid="treppen-form"
              onChange={(e) => {
                setTreppenForm(e.target.value as 'gerade' | 'podest' | 'u' | 'l');
                setPoints([]);
              }}
              title="Treppenform — L-Lauf: Antritt, Ecke, Austritt klicken"
            >
              <option value="gerade">gerade</option>
              <option value="podest">mit Podest</option>
              <option value="u">U-Lauf</option>
              <option value="l">L-Lauf</option>
            </KSelect>
          )}
          {/* Regel 2.3.5 (Transparenz): solange die Matrix eine Gruppe unter ihre
              T7-Basis zurückstellt, zeigt dieser dezente Hinweis warum — anschluss-
              fähig an Serie G (Kosmo erklärt), hier nur der Text im title.
              Fable-Review-2-Auflage J3c-0a: IMMER gemountet (nicht conditional),
              Sichtbarkeit über `visibility` — der Platz bleibt reserviert, kein
              Layout-Ruck, wenn der Hinweis erscheint/verschwindet. */}
          <span
            data-testid="adaption-hinweis"
            className="k-selten"
            title={adaptionHinweisTitel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 11,
              color: 'var(--k-ink-faint)',
              whiteSpace: 'nowrap',
              visibility: adaptionHinweisSichtbar ? 'visible' : 'hidden',
            }}
          >
            ⓘ angepasst
          </span>
          </div>
          {/* «Mehr…» + Dropdown: ausserhalb der Scroll-Zone (kein Clipping,
              immer sichtbar — Erreichbarkeits-Garantie der Arbeitsmodi),
              flexShrink:0 wie die Verlauf-Gruppe. */}
          <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
            <KButton
              size="sm"
              tone={mehrOffen ? 'accent' : 'ghost'}
              data-testid="werkzeuge-mehr"
              title="Weitere Werkzeuge — nach Nutzungshäufigkeit sortiert"
              aria-label="Weitere Werkzeuge"
              style={{ visibility: ueberlaufWerkzeuge.length > 0 ? 'visible' : 'hidden' }}
              onClick={() => setMehrOffen(!mehrOffen)}
            >
              Mehr…
            </KButton>
            {mehrOffen && ueberlaufWerkzeuge.length > 0 && (
              <div
                data-testid="werkzeuge-mehr-liste"
                className="k-dialog"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  zIndex: 5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  padding: 6,
                  minWidth: 140,
                  background: 'var(--k-surface)',
                  border: '1px solid var(--k-line)',
                  borderRadius: 'var(--k-radius-md)',
                  boxShadow: 'var(--k-shadow-raised)',
                }}
              >
                {ueberlaufWerkzeuge.map((w) => (
                  <KButton
                    key={`${w.gruppe}:${w.id}`}
                    size="sm"
                    tone="ghost"
                    data-testid={`werkzeuge-mehr-eintrag-${w.gruppe}-${w.id}`}
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => {
                      w.aktion();
                      setMehrOffen(false);
                    }}
                  >
                    {w.label}
                  </KButton>
                ))}
              </div>
            )}
          </span>
          {/* Ausserhalb des scrollenden Innenbereichs (s. Kommentar oben) —
              eigener, immer sichtbarer rechter Bereich, per Hairline von der
              scrollenden Zone abgesetzt (Befund [B] «Zweite Zeile Gruppierung»). */}
          <Hairline vertical />
          <span
            data-testid="leiste-gruppe-verlauf"
            className={fokusKlasse(stufeFuerGruppe('verlauf'))}
            style={{
              display: 'inline-flex',
              gap: 'var(--k-s3)',
              alignItems: 'center',
              flexShrink: 0,
              ...(gruppeHatGehobenesElement('verlauf') ? { opacity: 1 } : {}),
            }}
          >
            <KButton
              size="sm"
              tone="ghost"
              onClick={() => {
                undo();
                nutzungMelden('verlauf:undo');
              }}
              data-testid="undo"
              {...elementStil('verlauf', 'undo')}
            >
              ↩ Rückgängig
            </KButton>
            <KButton
              size="sm"
              tone="ghost"
              onClick={() => {
                redo();
                nutzungMelden('verlauf:redo');
              }}
              {...elementStil('verlauf', 'redo')}
            >
              ↪ Wiederholen
            </KButton>
          </span>
        </div>
      </div>

      {projektMenuOffen && (
        <div
          data-testid="projekt-menu"
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: '8px 14px',
            borderBottom: '1px solid var(--k-line)',
            background: 'var(--k-surface)',
            fontSize: 12.5,
          }}
        >
          <span className="k-sekundaer" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Projekt-Einstellungen
          </span>
          {/* SIA-Phase (Owner 03.07.): Detaillierungsgrad der Pläne; koppelt den passenden Bemassungs-Stil */}
          <label style={{ fontSize: 12, color: 'var(--k-ink-faint)', display: 'flex', alignItems: 'center', gap: 5 }}>
            Phase
            <KSelect
              size="sm"
              value={doc.settings.phase}
              data-testid="phase-stil"
              onChange={(e) => {
                const phase = e.target.value as 'vorprojekt' | 'bauprojekt' | 'werkplan';
                const bemassung = {
                  vorprojekt: { aussenKetten: 'gesamt' as const, innenKetten: false, hoehenKoten: true },
                  // SIA 400 C.2.2 (Lehrheft-Abgleich): Bauprojekt nur Haupt-/Gesamtmasse
                  bauprojekt: { aussenKetten: 'gesamt' as const, innenKetten: false, hoehenKoten: true },
                  werkplan: { aussenKetten: 'beide' as const, innenKetten: true, hoehenKoten: true },
                }[phase];
                const { history } = useProject.getState();
                history.beginGroup();
                try {
                  runCommand('design.phaseSetzen', { phase });
                  runCommand('design.bemassungSetzen', bemassung);
                } finally {
                  history.endGroup();
                }
                // B5: Massstabs-Automatik — Vorschlag, kein Zwang (Publish wählt frei)
                const label = { vorprojekt: 'Vorprojekt', bauprojekt: 'Bauprojekt', werkplan: 'Werkplan' }[phase];
                setMassstabHinweis(`${label}: Plan-Export neu 1:${PHASEN_MASSSTAB[phase]} (SIA-Empfehlung).`);
              }}
            >
              <option value="vorprojekt">Vorprojekt</option>
              <option value="bauprojekt">Bauprojekt</option>
              <option value="werkplan">Werkplan</option>
            </KSelect>
          </label>
          {/* SIA-Teilphase (v0.6.3, Lücken-Batch 1): der reale Projektstand im
              SIA-102/112-Zyklus — bewusst GETRENNT vom Plan-Detaillierungsgrad
              («Phase» links) und NICHT automatisch gekoppelt (Owner-Kontrolle).
              Die Kosmo-Zusammenfassung des Commands nennt den passenden
              Detaillierungsgrad als reinen Vorschlag. */}
          <label
            style={{ fontSize: 12, color: 'var(--k-ink-faint)', display: 'flex', alignItems: 'center', gap: 5 }}
            title="Aktuelle SIA-Teilphase des Projekts (Wettbewerb bis Abnahme) — reiner Projektstand, ändert den Plan-Detaillierungsgrad nicht."
          >
            Teilphase
            <KSelect
              size="sm"
              value={doc.settings.siaPhase}
              data-testid="sia-phase-select"
              onChange={(e) => {
                const siaPhase = e.target.value as SiaPhase;
                // Bewusst KEINE Kopplung an design.phaseSetzen/bemassungSetzen —
                // der Command schlägt den passenden Detaillierungsgrad nur vor.
                runCommand('design.siaPhaseSetzen', { siaPhase });
              }}
            >
              {(
                ['wettbewerb', 'vorprojekt', 'bauprojekt', 'bewilligung', 'ausschreibung', 'ausfuehrung', 'abnahme'] as const
              ).map((p) => (
                <option key={p} value={p}>
                  {siaPhaseLabel(p)}
                </option>
              ))}
            </KSelect>
          </label>
          {/* Bemassungs-Stil (V2-A5): Presets als Projekteinstellung, undo-fähig */}
          <label style={{ fontSize: 12, color: 'var(--k-ink-faint)', display: 'flex', alignItems: 'center', gap: 5 }}>
            Masse
            <KSelect
              size="sm"
              value={bemassungPreset}
              data-testid="bemassung-stil"
              onChange={(e) => {
                const presets: Record<string, { aussenKetten: 'beide' | 'gesamt' | 'keine'; innenKetten: boolean; hoehenKoten: boolean }> = {
                  wettbewerb: { aussenKetten: 'gesamt', innenKetten: false, hoehenKoten: true },
                  werkplan: { aussenKetten: 'beide', innenKetten: true, hoehenKoten: true },
                  aus: { aussenKetten: 'keine', innenKetten: false, hoehenKoten: false },
                  standard: { aussenKetten: 'beide', innenKetten: false, hoehenKoten: true },
                };
                const p = presets[e.target.value];
                if (p) runCommand('design.bemassungSetzen', p);
              }}
            >
              <option value="standard">Standard</option>
              <option value="wettbewerb">Wettbewerb</option>
              <option value="werkplan">Werkplan</option>
              <option value="aus">Aus</option>
              {bemassungPreset === 'eigen' && <option value="eigen">eigen</option>}
            </KSelect>
          </label>
          <span style={{ color: 'var(--k-ink-faint)', fontSize: 11.5 }}>
            Ändert sich mit der SIA-Phase des Projekts — bleibt über Jahre stabil, gehört nicht in die Dauerleiste.
          </span>
          {/* Serie J / J3c (Regel 2.3.4): Opt-out + Reset für die adaptive
              Werkzeugleiste. Der Schalter setzt NUR `aktiv` (setAdaptionAktiv,
              Fable-Review-2-Auflage J3c-1) — Reset löscht NUR das gelernte
              Profil, der Schalter bleibt in beiden Richtungen unangetastet. */}
          <label
            style={{ fontSize: 12, color: 'var(--k-ink-faint)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <input
              type="checkbox"
              data-testid="adaption-schalter"
              checked={adaptionIstAn}
              onChange={(e) => adaptionUmschalten(e.target.checked)}
            />
            Oberfläche passt sich an
          </label>
          <KButton
            size="sm"
            tone="ghost"
            data-testid="adaption-reset"
            title="Gelerntes Nutzungsprofil löschen — Werkzeugleiste fällt auf die Basis-Stufen zurück. Der Schalter bleibt unverändert."
            onClick={adaptionZuruecksetzenUndAuffrischen}
          >
            Oberfläche zurücksetzen
          </KButton>
        </div>
      )}

      {sonneOffen && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            padding: '6px 12px',
            borderBottom: '1px solid var(--k-line)',
            background: 'var(--k-surface)',
            fontSize: 12.5,
          }}
        >
          <span style={{ color: 'var(--k-ink-faint)' }} data-testid="sonne-standort-label">
            Schattenstudie · {useProject.getState().doc.settings.standort?.label ?? 'Innerschweiz (Standard)'}
          </span>
          <StandortSuche />
          <input
            type="date"
            value={sonnenDatum}
            data-testid="sonne-datum"
            onChange={(e) => setSonnenDatum(e.target.value)}
            style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)' }}
          />
          <input
            type="range"
            min={5}
            max={22}
            step={0.25}
            value={sonnenStunde}
            data-testid="sonne-stunde"
            onChange={(e) => setSonnenStunde(Number(e.target.value))}
            style={{ width: 260 }}
          />
          <span style={{ fontFamily: 'var(--k-mono, monospace)', minWidth: 48 }}>
            {String(Math.floor(sonnenStunde)).padStart(2, '0')}:{String(Math.round((sonnenStunde % 1) * 60)).padStart(2, '0')}
          </span>
          <span style={{ color: 'var(--k-ink-faint)' }}>
            21.&nbsp;März/Sept. für den 2h-Nachweis, 21.&nbsp;Juni/Dez. für die Extreme.
          </span>
        </div>
      )}

      {bestand && (
        <div
          data-testid="bestand-angebot"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px',
            borderBottom: '1px solid var(--k-line)',
            background: 'var(--k-raised)',
            fontSize: 12.5,
            zIndex: 2,
          }}
        >
          <Badge hue={moduleHue.design}>Bestand</Badge>
          <span>
            Im IFC erkannt: {bestand.waende.length} Wände, {bestand.decken.length} Decken — als
            editierbare Bauteile übernehmen? (ein Undo-Schritt; Rest bleibt Kontext)
          </span>
          <div style={{ flex: 1 }} />
          <KButton size="sm" tone="accent" data-testid="bestand-uebernehmen" onClick={bestandUebernehmen}>
            Übernehmen
          </KButton>
          <KButton size="sm" tone="ghost" data-testid="bestand-verwerfen" onClick={() => setBestand(null)}>
            Nur als Kontext behalten
          </KButton>
        </div>
      )}
      {/* A8 (K18): Preset-Angebot beim Teilphasen-Wechsel — Owner-Kontrolle,
          dasselbe Banner-Muster wie `bestand-angebot`/`massstab-hinweis`
          oben: anbieten statt stumm umbauen. Rein informativ bis zum Klick
          auf «Anwenden» — `phasenFokus` bleibt bis dahin `null`. */}
      {phasenAngebot && (
        <div
          data-testid="phasen-preset-angebot"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px',
            borderBottom: '1px solid var(--k-line)',
            background: 'var(--k-raised)',
            fontSize: 12.5,
            zIndex: 2,
          }}
        >
          <Badge hue={moduleHue.design}>Phase</Badge>
          <span>
            Phase {siaPhaseLabel(phasenAngebot)}: Fähigkeiten{' '}
            {PHASEN_PRESETS[phasenAngebot].imFokus.map((id) => FAEHIGKEIT_LABEL[id]).join('/')} im Fokus — anwenden?
            {' '}(empfohlene Plan-Detaillierung: {phaseLabel(empfohlenePlanPhaseFuer(phasenAngebot))}
            {PHASEN_PRESETS[phasenAngebot].umbauFilterDefault
              ? `, Umbau-Filter-Empfehlung: ${UMBAU_LABEL[PHASEN_PRESETS[phasenAngebot].umbauFilterDefault!]}`
              : ''}
            )
          </span>
          <div style={{ flex: 1 }} />
          <KButton
            size="sm"
            tone="accent"
            data-testid="phasen-preset-anwenden"
            onClick={() => {
              setPhasenFokus(new Set(PHASEN_PRESETS[phasenAngebot].imFokus));
              setPhasenAngebot(null);
            }}
          >
            Anwenden
          </KButton>
          <KButton size="sm" tone="ghost" data-testid="phasen-preset-verwerfen" onClick={() => setPhasenAngebot(null)}>
            Nicht jetzt
          </KButton>
        </div>
      )}
      {massstabHinweis && (
        <div
          data-testid="massstab-hinweis"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '5px 14px',
            borderBottom: '1px solid var(--k-line)',
            background: 'var(--k-raised)',
            fontSize: 12.5,
            zIndex: 2,
          }}
        >
          <Badge hue={moduleHue.design}>Massstab</Badge>
          <span>{massstabHinweis} Der Blatt-Editor (KosmoPublish) wählt weiterhin frei.</span>
          <div style={{ flex: 1 }} />
          <KButton size="sm" tone="ghost" data-testid="massstab-ok" onClick={() => setMassstabHinweis(null)}>
            Verstanden
          </KButton>
        </div>
      )}
      {/* Ansichten: synchron auf demselben Modell + denselben Werkzeugen */}
      <div
        style={{ position: 'relative', flex: 1, display: 'flex' }}
        // K5 (Owner-Rundgang 0.6.2, S. 10): «beschreibende Textblöcke nutzlos
        // … Funktion, die als One-Click mit Upload-Oberfläche von Kosmo
        // komplett selbst erledigt wird» — die ganze Arbeitsfläche ist ein
        // Drop-Ziel; die Fläche unten erscheint NUR während eines echten
        // Drags (zeigt sich nie ungefragt, kostet also nie feste Höhe/Breite
        // — eine frühere Toolbar-Zeilen-Variante schob die Plan-/3D-Fläche
        // nach unten und riss den harten Stützenraster-Klick-Test aus dem
        // Bild). Klick bleibt zusätzlich am bestehenden «DXF laden»-Knopf,
        // derselbe Handler (`verarbeiteUnternehmerplanDatei`, `unternehmerplan.ts`).
        onDragOver={(e) => {
          if (e.dataTransfer?.types?.includes('Files')) {
            e.preventDefault();
            setUplanDragUeber(true);
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setUplanDragUeber(false);
        }}
        onDrop={(e) => {
          if (!uplanDragUeber) return;
          e.preventDefault();
          setUplanDragUeber(false);
          const f = e.dataTransfer.files?.[0];
          if (f) {
            nutzungMelden('export:import-dxf');
            void verarbeiteUnternehmerplanDatei(f);
          }
        }}
      >
        {uplanDragUeber && (
          <div
            data-testid="uplan-upload"
            role="button"
            aria-label="Unternehmerplan hier ablegen — DXF wird verglichen, PDF wird erkannt"
            title="Unternehmerplan hier ablegen — DXF wird verglichen, PDF wird erkannt"
            onDrop={(e) => {
              e.preventDefault();
              setUplanDragUeber(false);
              const f = e.dataTransfer.files?.[0];
              if (f) {
                nutzungMelden('export:import-dxf');
                void verarbeiteUnternehmerplanDatei(f);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            style={{
              position: 'absolute',
              inset: 8,
              zIndex: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 16,
              border: '2px dashed var(--k-accent)',
              borderRadius: 'var(--k-radius-md)',
              background: 'var(--k-accent-wash)',
              color: 'var(--k-accent)',
              fontSize: 14,
              fontWeight: 600,
              pointerEvents: 'auto',
            }}
          >
            Unternehmerplan hier ablegen — DXF wird verglichen, PDF wird erkannt
          </div>
        )}
        {drawOffen && <DrawPanel />}
        {rasterOffen && <RasterPanel onClose={() => setRasterOffen(false)} />}
        {cwSetzenOffen && <CurtainWallPanel onClose={() => setCwSetzenOffen(false)} />}
        {/* C4b (C-E4): Daten-Guard — die Karten-Liste erscheint automatisch,
            sobald ein Unternehmerplan geladen ist, kein eigener Toggle nötig
            (das Vorhandensein der Daten IST der Sichtbarkeits-Zustand). */}
        <UnternehmerplanPanel />
        {splatPanelOffen && (
          <SplatPanel
            cloud={splatCloud}
            onCloud={(cloud) => {
              setSplatCloudState(cloud);
              setSplatCloud(cloud);
            }}
            onClose={() => setSplatPanelOffen(false)}
          />
        )}
        {listeOffen && (
          <BerechnungslistePanel
            wohnungstyp={wohnungstyp}
            setWohnungstyp={setWohnungstyp}
            onClose={() => setListeOffen(false)}
          />
        )}
        {kvOffen && <KvPanel onClose={() => setKvOffen(false)} />}
        {bauablaufOffen && <BauablaufPanel onClose={() => setBauablaufOffen(false)} />}
        {maengelOffen && <MaengelPanel onClose={() => setMaengelOffen(false)} />}
        {submissionOffen && <SubmissionsCheckPanel onClose={() => setSubmissionOffen(false)} />}
        {studieOffen && (
          <StudienPanel
            zielGf={zielGf}
            setZielGf={setZielGf}
            maxHoeheM={maxHoeheM}
            setMaxHoeheM={setMaxHoeheM}
            // K3: rückt IMMER unter die Geschossleiste, egal wie viele
            // Geschosse (keine Bauteil-/Panel-Überlappung, s. Kommentar oben).
            topOffset={geschossleisteHoehe + 20}
            onClose={() => setStudieOffen(false)}
          />
        )}
        {viewMode === 'quad' ? (
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 1,
              background: 'var(--k-line)',
            }}
          >
            <div style={{ position: 'relative', background: 'var(--k-field)' }}>
              <Viewport3D handlers={handlersRef} />
            </div>
            <div style={{ position: 'relative' }}>
              <PlanView handlers={handlersRef} onLod={setPlanLodStufe} />
            </div>
            <div style={{ position: 'relative' }}>
              <SectionView spec={sectionSpec} title="Schnitt" />
            </div>
            <div style={{ position: 'relative' }}>
              <SectionView spec={elevationSpec} title="Ansicht Süd" />
            </div>
          </div>
        ) : (
          <>
            {viewMode !== '2d' && (
              <div style={{ position: 'relative', flex: 1 }}>
                <Viewport3D handlers={handlersRef} />
              </div>
            )}
            {viewMode !== '3d' && (
              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  borderLeft: viewMode === 'split' ? '1px solid var(--k-line)' : 'none',
                }}
              >
                {/* SK-D4 (Massnahme 5) — Versuch verworfen, s. Bericht/Grenzen:
                    ein `key`-erzwungener Neu-Mount hier hätte PlanView bei
                    JEDEM split↔2d-Wechsel zurückgesetzt und damit lokalen
                    PlanView-UI-Zustand (z.B. `achsen-toggle`) verloren —
                    nachweislich eine Regression (module.spec.ts «Stützen-
                    raster»-Test). PlanView passt sich schon bei ihrem
                    EIGENEN Mount automatisch ein (`einpassen()`, PlanView.tsx)
                    — das greift unverändert beim Öffnen aus dem 3D-Modus
                    (echter Erstmount), aber NICHT beim reinen split↔2d-
                    Wechsel (dieselbe Instanz bleibt bestehen). Kritik-065
                    Befund [C] «Grundriss-Ansicht passt beim Wechsel nicht
                    ein»: gezielter Re-Fit-Trigger OHNE vollen Remount jetzt
                    in `PlanView.tsx` selbst (`modus`-Prop, einpassen() genau
                    beim Wechsel AUF `2d`) — kein Eingriff in den Mount/Key-
                    Mechanismus hier, `achsen-toggle` bleibt unberührt. */}
                <PlanView handlers={handlersRef} onLod={setPlanLodStufe} modus={viewMode} />
              </div>
            )}
          </>
        )}

        <KennzahlenPanel />
        <Inspector />

        {/* Block 3 / E4 (Buildplan FM3): meshEdit-Overlay — Vertex-Handles/
            Flächen-Pick laufen im Viewport (Viewport3D.tsx), dieses Panel
            trägt nur die Distanz-Eingabe + die beiden Aktions-Knöpfe. Kein
            allgemeines Gizmo-Framework (§5), nur dieser eine Modus. */}
        {meshEditId && (
          <div
            data-testid="mesh-edit-panel"
            className="k-dialog"
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              width: 240,
              background: 'var(--k-surface)',
              border: '1px solid var(--k-line)',
              borderRadius: 'var(--k-radius-md)',
              boxShadow: 'var(--k-shadow-raised)',
              padding: 12,
              display: 'grid',
              gap: 8,
              fontSize: 12.5,
              zIndex: 3,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge hue={moduleHue.design}>Mesh bearbeiten</Badge>
            </div>
            <span style={{ color: 'var(--k-ink-faint)' }}>
              Handle ziehen verschiebt die Ecke (Shift = nur Höhe) · Klick auf eine Fläche wählt sie zum Extrudieren.
            </span>
            {meshFace !== null && (
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ color: 'var(--k-ink-faint)' }}>Fläche {meshFace} ausgewählt</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    value={meshDistanz}
                    data-testid="mesh-extrude-distanz"
                    onChange={(e) => setMeshDistanz(Number(e.target.value))}
                    style={{
                      width: 90,
                      padding: '3px 7px',
                      borderRadius: 6,
                      border: '1px solid var(--k-line-strong)',
                      background: 'var(--k-raised)',
                      fontSize: 12.5,
                    }}
                  />
                  <span style={{ color: 'var(--k-ink-faint)' }}>mm — negativ = einwärts</span>
                </label>
                <KButton
                  size="sm"
                  tone="accent"
                  data-testid="mesh-extrudieren"
                  onClick={() => {
                    if (meshFace === null || !Number.isFinite(meshDistanz) || meshDistanz === 0) return;
                    try {
                      runCommand('design.meshFlaecheExtrudieren', {
                        entityId: meshEditId,
                        face: meshFace,
                        distanz: Math.round(meshDistanz),
                      });
                      setMeshFace(null);
                    } catch (err) {
                      meldeFehler(err);
                    }
                  }}
                >
                  Extrudieren
                </KButton>
              </div>
            )}
            <KButton size="sm" tone="ghost" data-testid="mesh-fertig" onClick={() => setMeshEditId(null)}>
              Fertig
            </KButton>
          </div>
        )}

        {/* K16 A6: Entwurfs-Einstieg — vertikal mittig an der linken Kante,
            kollidiert dadurch weder mit der Geschossleiste (oben) noch mit
            NavLeiste/Statusleiste (unten). */}
        <EntwurfsDock
          modus={entwurfsModus}
          onSprechen={klickEntwurfSprechen}
          onSkizzieren={klickEntwurfSkizzieren}
          onCad={klickEntwurfCad}
          // A7: «Draw als bestehender Deep-Link» — dieselbe Wirkung wie die
          // Zentrale-Kachel KosmoDraw (`setDeepLink('draw')`, konsumiert nur
          // beim MOUNT von DesignWorkspace, s. `consumeDeepLink`-Effekt
          // oben). Da der Dock hier schon läuft, wird direkt das Ziel dieses
          // Effekts nachgebildet (`setDrawOffen(true)`, kein Toggle — ein
          // Stations-Icon soll IMMER hinführen, nie wegschalten), ohne den
          // Merker unnötig über den Store zu routen.
          onDockDraw={() => {
            setDrawOffen(true);
            nutzungMelden('ebenen:draw');
          }}
          onDockVis={() => onStationOeffnen?.('vis')}
          onDockPublish={() => onStationOeffnen?.('publish')}
          onDockPrepare={() => onStationOeffnen?.('prepare')}
        />

        {/* Geschossleiste — v0.6.5 (W2, SK-D3): gerahmter Karteikarten-
            Container statt kontextlos schwebender Knöpfe (Owner-Befund
            «kollidiert optisch mit Dock-Icons darunter»). `k-karte` liefert
            die 45°-Ecke + `--k-raised` (UI-KONZEPT-065 §2 Hierarchie-Rezept,
            frozen `packages/kosmo-ui`); Randfarbe wird auf --k-line-strong
            angehoben (`k-karte` selbst nutzt --k-technik für Werkplan-Karten,
            hier ist es keine Werkplan-Karte). Dockt jetzt bündig an die
            Viewport-Kante (0/0 statt 12/12), testids/Texte unverändert. */}
        <div
          ref={geschossleisteRef}
          data-testid="geschossleiste"
          className="k-karte"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: 'var(--k-s2)',
            border: '1px solid var(--k-line-strong)',
            padding: 'var(--k-s2)',
            boxShadow: 'var(--k-shadow-raised)',
            // Testlauf-Befund: bei Hochhäusern (20+ Geschossen) lief die Liste
            // sonst unten aus dem Viewport — Höhe deckeln, dann scrollt sie.
            maxHeight: 'calc(100% - 24px)',
            overflowY: 'auto',
          }}
        >
          {storeys.map((s: Storey) => (
            <KButton
              key={s.id}
              size="sm"
              tone="ghost"
              onClick={() => setActiveStorey(s.id)}
              data-testid={`storey-${s.name}`}
              aria-pressed={s.id === activeStoreyId}
              style={aktivRahmen(s.id === activeStoreyId)}
            >
              {s.name}
            </KButton>
          ))}
          <KButton
            size="sm"
            tone="ghost"
            data-testid="geschoss-stapeln"
            title="Aktives Geschoss samt Inhalt nach oben kopieren"
            onClick={() => {
              if (!activeStoreyId) return;
              try {
                runCommand('design.geschossKopieren', { storeyId: activeStoreyId, anzahl: 1 });
              } catch (err) {
                meldeFehler(err);
              }
            }}
          >
            ⧉
          </KButton>
          {/* H-7 (Sim-Befund): design.deckeZeichnen hatte keine UI-Fläche.
              Statt eines 19. Werkzeugs (Vertrag toBe(18) im Mehr…-Menü bliebe
              sonst instabil) ein Panel-Knopf hier — er braucht ein Umriss-
              Polygon, das leiten wir ehrlich aus der Bounding-Box aller Zonen
              des aktiven Geschosses ab (kein Freihand-Zeichnen einer Decke). */}
          <KButton
            size="sm"
            tone="ghost"
            data-testid="decke-zeichnen"
            title="Decke über der Bounding-Box aller Zonen des Geschosses zeichnen"
            onClick={() => {
              if (!activeStoreyId) return;
              const d = useProject.getState().doc;
              const zonen = d.byKind<Zone>('zone').filter((z) => z.storeyId === activeStoreyId);
              if (zonen.length === 0) {
                meldeFehler('Keine Zonen im Geschoss — zuerst Zonen zeichnen, die Decke braucht einen Umriss.');
                return;
              }
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              for (const z of zonen) {
                for (const p of z.outline) {
                  minX = Math.min(minX, p.x);
                  maxX = Math.max(maxX, p.x);
                  minY = Math.min(minY, p.y);
                  maxY = Math.max(maxY, p.y);
                }
              }
              const outline: Pt[] = [
                { x: minX, y: minY },
                { x: maxX, y: minY },
                { x: maxX, y: maxY },
                { x: minX, y: maxY },
              ];
              try {
                runCommand('design.deckeZeichnen', { storeyId: activeStoreyId, outline, thickness: 250 });
              } catch (err) {
                meldeFehler(err);
              }
            }}
          >
            Decke
          </KButton>
          {/* v0.6.9 Stream F: design.curtainWallSetzen hatte keine UI-Fläche.
              Gleiches Muster wie «Decke» oben (H-7): ein Panel-Knopf statt
              eines 19. Werkzeugs — der Vertrag toBe(18) im Mehr…-Menü
              (e2e/oberflaeche-minimal.spec.ts, UEBERLAUFFAEHIGE_WERKZEUGE)
              bleibt so unberührt. */}
          <KButton
            size="sm"
            tone="ghost"
            data-testid="cw-setzen-oeffnen"
            title="Fensterband/Curtain-Wall auf eine Fassadenseite des Geschosses setzen"
            onClick={() => setCwSetzenOffen(true)}
          >
            Fensterband
          </KButton>
        </div>

        {/* Statusleiste (Serie K A5, K15 Aufgabe 3): Zero-Click-Kennzahlen an
            der Unterkante des Design-Viewports — aktives Werkzeug, Plan-LOD-
            Stufe (`planLod.ts`, B2), aktives Geschoss, m²-Kurzwert. Ersetzt
            kein Panel — die Werte standen vorher NUR hinter einem Klick
            (Werkzeugleiste/Geschossleiste/Berechnungsliste) oder gar nicht
            beisammen. Bewusst unterhalb der bestehenden Statuszeile ergänzt,
            nicht als zweite Leiste — «eine» dezente Leiste, wie beauftragt. */}
        <div
          data-testid="statusleiste"
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            // Kritik-065 Befund [B] «Abgeschnittenes Label unten rechts»:
            // `right:12` liess den letzten Eintrag («Klick: …») bis unter
            // das fixe Kosmo-Symbol laufen (right:22/bottom:22, 54px,
            // z-110 — s. Begründung in NavLeiste.tsx), das den Text
            // optisch abschnitt. Dieselbe Klärung (right:88), die
            // `NavLeiste.tsx` fürs `nav-fit`-Werkzeug schon nutzt.
            right: 88,
            display: 'flex',
            flexWrap: 'wrap',
            rowGap: 4,
            gap: 14,
            alignItems: 'center',
            pointerEvents: 'none',
            fontSize: 12.5,
            color: 'var(--k-ink-soft)',
          }}
        >
          <span
            data-testid="statusleiste-werkzeug"
            style={{ background: 'var(--k-surface)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--k-line)' }}
          >
            {WERKZEUG_KURZLABEL[tool]}
          </span>
          <span
            data-testid="statusleiste-geschoss"
            style={{ background: 'var(--k-surface)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--k-line)' }}
          >
            {storeys.find((s: Storey) => s.id === activeStoreyId)?.name ?? '–'}
          </span>
          <span
            data-testid="statusleiste-lod"
            title="Plan-Detaillierungsgrad (zoomabhängig)"
            style={{ background: 'var(--k-surface)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--k-line)' }}
          >
            {LOD_KURZLABEL[planLodStufe]}
          </span>
          <span
            data-testid="statusleiste-flaeche"
            title="Ausgezogene SIA-Fläche (NGF) des aktiven Geschosses"
            style={{ background: 'var(--k-surface)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--k-line)' }}
          >
            {flaecheGeschossM2 !== null ? `${flaecheGeschossM2.toFixed(0)} m²` : '–'}
          </span>
          {/* A8 (K18): dezentes Phasen-Badge — reine Anzeige der aktuellen
              SIA-Teilphase, Zero-Click neben den übrigen Statusleisten-Werten.
              Das eigentliche Preset-Angebot lebt im Banner oben (gleiches
              Muster wie `bestand-angebot`); dieses Badge macht nur sichtbar,
              WAS gerade gilt, ohne die Statusleiste interaktiv zu machen. */}
          <span
            data-testid="statusleiste-phase"
            title="Aktuelle SIA-Teilphase des Projekts"
            style={{ background: 'var(--k-surface)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--k-line)' }}
          >
            {siaPhaseLabel(doc.settings.siaPhase)}
          </span>
          {/* Stream B (W1b, Aufgabe 4) — Modus-Chip (Ehrlichkeits-UI,
              BEWEGUNGSKONZEPT-066 §5): «Modus: {Name} · automatisch|
              festgehalten|automatik aus». Die umgebende Statusleiste trägt
              `pointerEvents:'none'` (Zero-Click-Kennzahlen, Klicks fallen
              durch zum Viewport) — dieser EINE interaktive Chip braucht ein
              gezieltes `pointerEvents:'auto'`-Override, sonst wäre er unter
              der Maus unsichtbar unklickbar. */}
          <span style={{ position: 'relative', display: 'inline-flex', pointerEvents: 'auto' }}>
            <button
              type="button"
              className="k-druck"
              data-testid="modus-chip"
              title={
                modusGrund.length > 0
                  ? modusGrund.join(' · ')
                  : arbeitsmodus
                    ? 'Arbeitsmodus — Klick öffnet Modus-Liste, Festhalten, Automatik aus'
                    : 'Voll-UI — kein Arbeitsmodus erkannt/gesetzt'
              }
              aria-haspopup="menu"
              aria-expanded={modusMenuOffen}
              onClick={() => setModusMenuOffen((o) => !o)}
              style={{
                background: 'var(--k-surface)',
                padding: '3px 8px',
                borderRadius: 6,
                border: modusAkzent ? '1px solid var(--k-accent)' : '1px solid var(--k-line)',
                transitionProperty: 'border-color',
                transitionDuration: 'var(--k-feder)',
                cursor: 'pointer',
                font: 'inherit',
                color: 'inherit',
              }}
            >
              {/* C-Befund 0.6.6: der frühere Ein-Wort-Fallback «Voll» klang wie
                  ein Zustand ohne Erklärung («voll» wovon?) — «Alle Werkzeuge»
                  sagt direkt, was der Neutral-Zustand bedeutet (nichts ist
                  ausgeblendet), im selben knappen Zwei-Wort-Stil wie die
                  übrigen ARBEITSMODUS_LABEL-Werte («3D modellieren», «Varianten
                  vergleichen»). */}
              Modus: {arbeitsmodus ? ARBEITSMODUS_LABEL[arbeitsmodus] : 'Alle Werkzeuge'} ·{' '}
              {!modusAutomatik ? 'automatik aus' : modusFesthalten ? 'festgehalten' : 'automatisch'}
            </button>
            {modusMenuOffen && (
              <div
                data-testid="modus-menu"
                className="k-dialog"
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: 4,
                  zIndex: 5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  padding: 6,
                  minWidth: 170,
                  background: 'var(--k-surface)',
                  border: '1px solid var(--k-line)',
                  borderRadius: 'var(--k-radius-md)',
                  boxShadow: 'var(--k-shadow-raised)',
                }}
              >
                {MODI_VOLLSTAENDIG_0_6_6.map((m) => {
                  // D1 (0.6.7, C-Befund 0.6.6): Ehrlichkeits-Begründung je
                  // KANDIDAT (nicht nur für den amtierenden Modus wie
                  // `modusGrund`/das Tooltip oben) — dieselbe reine Funktion
                  // `begruendeModus` (arbeitsmodi-kern.ts), diesmal pro
                  // Listeneintrag mit `m` statt `arbeitsmodus` aufgerufen.
                  // EHRLICH: bei ausgeschalteter Automatik oder wenn kein
                  // Signal für DIESEN Kandidaten spricht, bleibt die Zeile
                  // schlicht weg — nichts wird erfunden.
                  const begruendung = modusAutomatik ? begruendeModus(m, modusSignale) : [];
                  return (
                    <div key={m} style={{ display: 'flex', flexDirection: 'column' }}>
                      <button
                        type="button"
                        className="k-druck"
                        data-testid={`modus-item-${m}`}
                        aria-pressed={arbeitsmodus === m}
                        onClick={() => modusHandVonListeWaehlen(m)}
                        style={{
                          all: 'unset',
                          cursor: 'pointer',
                          padding: '4px 6px',
                          borderRadius: 4,
                          fontSize: 12.5,
                          background: arbeitsmodus === m ? 'var(--k-accent-wash)' : 'transparent',
                        }}
                      >
                        {ARBEITSMODUS_LABEL[m]}
                      </button>
                      {begruendung.length > 0 && (
                        <span
                          data-testid={`modus-chip-begruendung-${m}`}
                          style={{
                            fontSize: 10.5,
                            lineHeight: 1.3,
                            color: 'var(--k-ink-faint)',
                            padding: '0 6px 3px',
                          }}
                        >
                          erkannt: {begruendung.join(' · ')}
                        </span>
                      )}
                    </div>
                  );
                })}
                <Hairline />
                <button
                  type="button"
                  className="k-druck"
                  data-testid="modus-festhalten"
                  aria-pressed={modusFesthalten}
                  onClick={modusFesthaltenUmschalten}
                  style={{ all: 'unset', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, fontSize: 12.5 }}
                >
                  {modusFesthalten ? 'Festhalten aufheben' : 'Festhalten'}
                </button>
                <button
                  type="button"
                  className="k-druck"
                  data-testid="modus-automatik"
                  aria-pressed={!modusAutomatik}
                  onClick={modusAutomatikUmschalten}
                  style={{ all: 'unset', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, fontSize: 12.5 }}
                >
                  {modusAutomatik ? 'Automatik aus' : 'Automatik an'}
                </button>
              </div>
            )}
          </span>
          {cursor && (
            <Measure style={{ background: 'var(--k-surface)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--k-line)' }}>
              {formatLength(cursor.x)} / {formatLength(cursor.y)}
            </Measure>
          )}
          {points.length > 0 && cursor && tool === 'wand' && (
            <Measure style={{ background: 'var(--k-accent-wash)', padding: '3px 8px', borderRadius: 6 }}>
              L = {formatLength(Math.round(Math.hypot(cursor.x - points[points.length - 1]!.x, cursor.y - points[points.length - 1]!.y)))}
            </Measure>
          )}
          {/* T3: Ortho-Sperre (Shift) sichtbar in der Statuszeile, nicht nur im Plan-Overlay */}
          {orthoAktiv && ZEICHEN_WERKZEUGE.has(tool) && (
            <span
              data-testid="ortho-badge"
              style={{ background: 'var(--k-accent)', color: 'white', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}
            >
              ⊥ Ortho
            </span>
          )}
          {lastEntry && (
            <span
              style={{
                background: 'var(--k-surface)',
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid var(--k-line)',
              }}
              data-testid="last-action"
            >
              {lastEntry.summary}
            </span>
          )}
          <span style={{ flex: 1 }} />
          {/* SK-D5-Nachbarbefund (Massnahme 6): dieser Hinweistext ist der
              längste Statusleisten-Eintrag und sass ohne Platzbegrenzung
              unten rechts — bei schmalerem Viewport/mehr Nachbar-Badges lief
              er ab, statt sauber zu enden. `maxWidth` + Ellipsis statt eines
              harten Abschnitts (Text bleibt vollständig im `title`, falls
              abgeschnitten). */}
          <span
            title={
              tool === 'wand'
                ? 'Klick: Punkte setzen · Shift halten: Winkel einrasten (0/45/90°) · Shift-Klick: Kette beenden · Esc: abbrechen'
                : tool === 'skizze'
                  ? 'Freihand zeichnen — beliebig viele Striche, dann «Übergeben»: fasst alles zu Wänden zusammen'
                  : tool === 'treppe'
                    ? 'Klick: Antritt, dann Austritt (Steigung wird berechnet) · Shift: Winkel einrasten'
                    : tool === 'schnitt'
                      ? 'Klick: Anfang und Ende der Schnittlinie · Shift: Winkel einrasten'
                      : tool === 'volumen' || tool === 'zone' || tool === 'dach'
                        ? 'Klick: Eckpunkte · Shift: Winkel einrasten · Klick auf Start: schliessen'
                        : 'Klick: auswählen'
            }
            style={{
              background: 'var(--k-surface)',
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid var(--k-line)',
              maxWidth: 'min(46vw, 480px)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {tool === 'wand'
              ? 'Klick: Punkte setzen · Shift halten: Winkel einrasten (0/45/90°) · Shift-Klick: Kette beenden · Esc: abbrechen'
              : tool === 'skizze'
                ? 'Freihand zeichnen — beliebig viele Striche, dann «Übergeben»: fasst alles zu Wänden zusammen'
                : tool === 'treppe'
                ? 'Klick: Antritt, dann Austritt (Steigung wird berechnet) · Shift: Winkel einrasten'
                : tool === 'schnitt'
                ? 'Klick: Anfang und Ende der Schnittlinie · Shift: Winkel einrasten'
                : tool === 'volumen' || tool === 'zone' || tool === 'dach'
                ? 'Klick: Eckpunkte · Shift: Winkel einrasten · Klick auf Start: schliessen'
                : 'Klick: auswählen'}
          </span>
          {/* V6: die Vorform-Essenz als Handgefühl — Fläche wächst unterm Cursor */}
          {(tool === 'volumen' || tool === 'zone') && points.length >= 2 && cursor && (() => {
            const poly = [...points, cursor];
            let a2 = 0;
            for (let i = 0; i < poly.length; i++) {
              const p1 = poly[i]!;
              const p2 = poly[(i + 1) % poly.length]!;
              a2 += p1.x * p2.y - p2.x * p1.y;
            }
            const m2 = Math.abs(a2) / 2 / 1e6;
            const geschosse = Math.max(1, Math.floor(9000 / 3000));
            return (
              <span data-testid="live-flaeche" style={{ fontWeight: 700, color: 'var(--k-accent)' }}>
                {m2.toFixed(0)} m²{tool === 'volumen' ? ` · GF ~${(m2 * geschosse).toFixed(0)} m²` : ''}
              </span>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/** Q12 Volumenstudien: letzte Zone = Parzelle → Extremvarianten, Übernahme als eine Undo-Gruppe. */
function StudienPanel({
  zielGf,
  setZielGf,
  maxHoeheM,
  setMaxHoeheM,
  topOffset,
  onClose,
}: {
  zielGf: number | null;
  setZielGf: (v: number) => void;
  maxHoeheM: number;
  setMaxHoeheM: (v: number) => void;
  /** K3: Top-Position in px — misst sich an der tatsächlichen Geschoss-
   * leisten-Höhe, damit die beiden Panels nie überlappen (Owner S. 8). */
  topOffset: number;
  onClose: () => void;
}) {
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const { doc, history } = useProject.getState();
  const [nutzung, setNutzung] = useState<'wohnen' | 'gemischt'>('wohnen');
  // K4 (Owner-Rundgang 0.6.2, S. 8): Geschosshöhe ist projektspezifisch
  // (Wettbewerbsvorgabe/Architekt-Entscheid/SIA-Minimum/lichte Raumhöhe) —
  // kein universeller Fixwert. `null` = kein Override, die Owner-Defaults
  // (2.80 Wohnen / 4.00 Gewerbe-EG, unverändert) gelten weiter.
  const [geschosshoeheM, setGeschosshoeheM] = useState<number | null>(null);
  const [geschosshoeheHerkunft, setGeschosshoeheHerkunft] = useState<
    'wettbewerb' | 'architekt' | 'sia-minimum' | 'standard'
  >('standard');

  // D1 (D-E2): aktive Zonenregel des Projekts speist die Studien-Defaults —
  // ohne Regel bleibt regelOptionen {} und nichts am bisherigen Verhalten
  // ändert sich.
  const zonenRegel = doc.settings.zonenRegel;
  const parzellenFlaecheM2 = doc.settings.parzellenFlaeche;
  const regelOptionen = useMemo(
    () => studienOptionenAusRegel(zonenRegel ?? undefined, parzellenFlaecheM2),
    [zonenRegel, parzellenFlaecheM2],
  );

  // Einmalig beim Öffnen des Panels (Mount) aus der Regel initialisieren —
  // der Höhen-/GF-Ziel-Regler bleibt danach ein echter Override für diese
  // Sitzung, kein erzwungenes Nachziehen bei jedem Tastendruck.
  useEffect(() => {
    if (regelOptionen.maxHoehe !== undefined) setMaxHoeheM(Math.round(regelOptionen.maxHoehe / 1000));
    if (regelOptionen.zielGf !== undefined) setZielGf(Math.round(regelOptionen.zielGf));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parzelle = useMemo(() => {
    const zonen = doc.byKind<Zone>('zone').filter((z) => z.storeyId === activeStoreyId);
    return zonen[zonen.length - 1] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, activeStoreyId]);

  const zielEffektiv = zielGf ?? Math.max(Math.round(areaReport(doc).agfZiel) || 0, 500);
  const grenzabstandAnzeigeM = (regelOptionen.grenzabstand ?? 4000) / 1000;
  // K4: die tatsächlich gerechnete Geschosshöhe — Override, falls gesetzt,
  // sonst der unveränderte Owner-Default (2.80 Wohnen / 4.00 Gewerbe-EG).
  const geschosshoeheEffektivM = geschosshoeheM ?? (nutzung === 'gemischt' ? 4 : 2.8);
  const geschosshoeheHerkunftLabel: Record<typeof geschosshoeheHerkunft, string> = {
    wettbewerb: 'Wettbewerbsvorgabe',
    architekt: 'Architekt-Entscheid',
    'sia-minimum': 'SIA-Minimum',
    standard: nutzung === 'gemischt' ? 'Standard Gewerbe-EG' : 'Standard Wohnen',
  };

  const varianten = useMemo(
    () =>
      parzelle
        ? generiereVolumenstudien(parzelle.outline, {
            zielGf: zielEffektiv,
            maxHoehe: maxHoeheM * 1000,
            nutzung,
            ...(regelOptionen.grenzabstand !== undefined ? { grenzabstand: regelOptionen.grenzabstand } : {}),
            ...(geschosshoeheM !== null
              ? { geschosshoehe: Math.round(geschosshoeheM * 1000), geschosshoeheHerkunft }
              : {}),
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parzelle, zielEffektiv, maxHoeheM, nutzung, revision, regelOptionen.grenzabstand, geschosshoeheM, geschosshoeheHerkunft],
  );

  const uebernehmen = (id: string) => {
    const v = varianten.find((x) => x.id === id);
    if (!v || !activeStoreyId) return;
    history.beginGroup();
    try {
      for (const k of v.koerper) {
        runCommand('design.volumenErstellen', {
          storeyId: activeStoreyId,
          outline: k.outline,
          height: k.height,
          program: k.program,
        });
      }
    } finally {
      history.endGroup();
    }
  };

  // D5 (Wettbewerb-Konzept D-E8), v2 K1 (`docs/OWNER-BEFUNDE-0.6.2.md` —
  // «Grundlagenstudie-Bericht ultra schlecht»): Grundlagenstudie-Bericht als
  // eigenständiges SVG-Exportartefakt — Besonnung/Programm fliessen NUR ein,
  // wenn Standort bzw. Raumprogramm tatsächlich im Doc stehen
  // (Ehrlichkeitspfad, keine erfundenen Kennwerte). `parzelle`/`regel` speisen
  // das Situations-Diagramm, die Ranking-Funktion und die harten Eckwerte in
  // der Kopfzeile (v2-Blatt). `new Date()` bleibt bewusst im App-Code, nicht
  // im Kernel (Determinismus der reinen Ableitung `studienBerichtSvg`).
  const berichtLaden = () => {
    const { doc: aktuellerDoc } = useProject.getState();
    const standort = aktuellerDoc.settings.standort;
    const raumprogramm = aktuellerDoc.settings.raumprogramm;
    const zielGfHerkunft =
      zielGf === null
        ? 'aus Programmvorgabe'
        : regelOptionen.zielGf !== undefined && Math.round(regelOptionen.zielGf) === zielGf
          ? 'aus Zonenregel'
          : 'manuell gesetzt';
    const svg = studienBerichtSvg(varianten, {
      zielGf: zielEffektiv,
      zielGfHerkunft,
      ...(aktuellerDoc.settings.projectName ? { titel: aktuellerDoc.settings.projectName } : {}),
      ...(zonenRegel ? { regelName: zonenRegel.name, regel: zonenRegel } : {}),
      ...(parzelle ? { parzelle: parzelle.outline } : {}),
      datum: new Date().toLocaleDateString('de-CH'),
      ...(standort ? { besonnung: besonnungJeVariante(varianten, standort) } : {}),
      ...(raumprogramm.length > 0
        ? { programm: programmErfuellungJeVariante(varianten, raumprogramm, aktuellerDoc.settings.programmFaktor) }
        : {}),
    });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'grundlagenstudie.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const inputStyle: React.CSSProperties = {
    width: 70,
    padding: '3px 6px',
    borderRadius: 6,
    border: '1px solid var(--k-line-strong)',
    background: 'var(--k-raised)',
    fontSize: 12,
  };

  return (
    <div
      data-testid="studien-panel"
      className="k-dialog"
      style={{
        position: 'absolute',
        left: 12,
        top: topOffset,
        width: 268,
        maxHeight: `calc(100% - ${topOffset + 12}px)`,
        zIndex: 4,
        background: 'var(--k-surface)',
        border: '1px solid var(--k-line)',
        borderRadius: 'var(--k-radius-md)',
        boxShadow: 'var(--k-shadow-raised)',
        fontSize: 12.5,
        padding: 12,
        display: 'grid',
        gap: 9,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge hue={moduleHue.design}>Volumenstudien</Badge>
        <span style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={onClose}>×</KButton>
      </div>
      {!parzelle ? (
        <div style={{ color: 'var(--k-ink-faint)', lineHeight: 1.5 }}>
          Zeichne zuerst die <b>Parzelle als Zone</b> (Werkzeug «Zone») — die zuletzt
          gezeichnete Zone des Geschosses gilt als Baufeld.
        </div>
      ) : (
        <>
          <div style={{ color: 'var(--k-ink-faint)' }}>
            Parzelle: «{parzelle.name}» · Grenzabstand {grenzabstandAnzeigeM} m
          </div>
          {zonenRegel &&
            (regelOptionen.maxHoehe !== undefined ||
              regelOptionen.zielGf !== undefined ||
              regelOptionen.grenzabstand !== undefined) && (
              <div data-testid="studie-regel-hinweis" style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>
                aus Zonenregel «{zonenRegel.name}»
              </div>
            )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 5, alignItems: 'center', color: 'var(--k-ink-soft)' }}>
              GF-Ziel
              <input
                type="number"
                value={zielEffektiv}
                data-testid="studie-gf"
                onChange={(e) => setZielGf(Number(e.target.value))}
                style={inputStyle}
              />
              m²
            </label>
            <label style={{ display: 'flex', gap: 5, alignItems: 'center', color: 'var(--k-ink-soft)' }}>
              max.
              <input
                type="number"
                value={maxHoeheM}
                onChange={(e) => setMaxHoeheM(Number(e.target.value))}
                style={{ ...inputStyle, width: 44 }}
              />
              m
            </label>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <KButton
              size="sm"
              tone="quiet"
              data-testid="als-baugrenze"
              onClick={() => {
                if (!parzelle || !activeStoreyId) return;
                runCommand('design.baugrenzeSetzen', {
                  storeyId: activeStoreyId,
                  outline: parzelle.outline,
                  maxHoehe: maxHoeheM * 1000,
                  name: parzelle.name,
                });
              }}
            >
              Als Baugrenze (max. {maxHoeheM} m)
            </KButton>
            <KButton size="sm" tone={nutzung === 'wohnen' ? 'accent' : 'ghost'} onClick={() => setNutzung('wohnen')}>
              Wohnen 2.80
            </KButton>
            <KButton
              size="sm"
              tone={nutzung === 'gemischt' ? 'accent' : 'ghost'}
              onClick={() => setNutzung('gemischt')}
              data-testid="studie-gemischt"
            >
              Gewerbe-EG 4.00
            </KButton>
          </div>
          {/* K4 (Owner-Rundgang 0.6.2, S. 8): Geschosshöhe ist projekt-
              spezifisch (Wettbewerbsvorgabe/Architekt/SIA-Minimum) — Panel-
              Eingabe + ehrliche Herkunfts-Beschriftung. Leeres Feld = kein
              Override, die Owner-Defaults oben gelten unverändert weiter. */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 5, alignItems: 'center', color: 'var(--k-ink-soft)' }}>
              Geschosshöhe
              <input
                type="number"
                step={0.05}
                min={0}
                placeholder={geschosshoeheEffektivM.toFixed(2)}
                value={geschosshoeheM ?? ''}
                data-testid="studie-geschosshoehe"
                onChange={(e) => {
                  const roh = e.target.value;
                  setGeschosshoeheM(roh === '' ? null : Number(roh));
                }}
                style={{ ...inputStyle, width: 56 }}
              />
              m
            </label>
            <KSelect
              size="sm"
              data-testid="studie-geschosshoehe-herkunft"
              value={geschosshoeheHerkunft}
              onChange={(e) => setGeschosshoeheHerkunft(e.target.value as typeof geschosshoeheHerkunft)}
            >
              <option value="standard">Standard</option>
              <option value="wettbewerb">Wettbewerbsvorgabe</option>
              <option value="architekt">Architekt-Entscheid</option>
              <option value="sia-minimum">SIA-Minimum</option>
            </KSelect>
          </div>
          <div data-testid="studie-geschosshoehe-anzeige" style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>
            Geschosshöhe {geschosshoeheEffektivM.toFixed(2)} m — {geschosshoeheHerkunftLabel[geschosshoeheHerkunft]}
          </div>
          {varianten.map((v) => (
            <div
              key={v.id}
              data-testid={`variante-${v.id}`}
              style={{
                border: '1px solid var(--k-line)',
                borderRadius: 8,
                padding: '8px 10px',
                display: 'grid',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                <b>{v.name}</b>
                <span style={{ color: 'var(--k-ink-faint)' }}>
                  {v.geschosse} Gesch. · {(v.hoehe / 1000).toFixed(0)} m · GF {v.gf.toLocaleString('de-CH')} m²
                </span>
                {!v.passt && <Badge hue="var(--k-warning)">sprengt Höhe</Badge>}
                {v.tiefeOk === false && <Badge hue="var(--k-warning)">Tiefe</Badge>}
                {v.besonnung && (
                  <Badge hue={v.besonnung.ok ? 'var(--k-success)' : 'var(--k-danger)'}>
                    3h {v.besonnung.ok ? 'ok' : 'verfehlt'}
                  </Badge>
                )}
              </div>
              <div style={{ color: 'var(--k-ink-soft)', lineHeight: 1.4 }}>{v.beschrieb}</div>
              {v.hinweise.length > 0 && (
                <div style={{ color: 'var(--k-ink-faint)', fontSize: 11, lineHeight: 1.4 }}>
                  {v.hinweise.join(' · ')}
                </div>
              )}
              <div>
                <KButton size="sm" tone="quiet" data-testid={`uebernehmen-${v.id}`} onClick={() => uebernehmen(v.id)}>
                  Übernehmen
                </KButton>
              </div>
            </div>
          ))}
          {varianten.length >= 2 && (
            <VariantenMatrixSvg varianten={varianten} zielGf={zielEffektiv} />
          )}
          {varianten.length >= 1 && (
            <KButton size="sm" tone="quiet" data-testid="studie-bericht" onClick={berichtLaden}>
              Bericht (SVG)
            </KButton>
          )}
          <span style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>
            Anstoss, kein Entwurf — Übernahme ist ein Undo-Schritt.
          </span>
          <FassadenModulSektion />
        </>
      )}
    </div>
  );
}


/** V3/F4: Parallel-Axis-Vergleich der Volumenstudien-Varianten. */
function VariantenMatrixSvg({
  varianten,
  zielGf,
}: {
  varianten: import('@kosmo/kernel').StudienVariante[];
  zielGf: number | null;
}) {
  const [aktiv, setAktiv] = useState<string | null>(null);
  const matrix = useMemo(() => variantenMatrix(varianten, zielGf), [varianten, zielGf]);
  const W = 280;
  const H = 130;
  const RAND = 14;
  const n = matrix.achsen.length;
  const x = (i: number) => RAND + (i * (W - 2 * RAND)) / (n - 1);
  const y = (i: number, wert: number | null): number | null => {
    if (wert === null) return null;
    const { min, max } = matrix.bereiche[i]!;
    let t = (wert - min) / (max - min);
    if (matrix.achsen[i]!.kleinerBesser) t = 1 - t;
    return H - RAND - t * (H - 2 * RAND);
  };
  return (
    <div data-testid="varianten-matrix" style={{ display: 'grid', gap: 2 }}>
      <div style={{ fontSize: 11, color: 'var(--k-ink-faint)' }}>
        Vergleich (oben = besser){aktiv ? ` — ${matrix.zeilen.find((z) => z.id === aktiv)?.name}` : ''}
      </div>
      <svg viewBox={`0 0 ${W} ${H + 14}`} style={{ width: '100%' }}>
        {matrix.achsen.map((a, i) => (
          <g key={a.key}>
            <line x1={x(i)} y1={RAND} x2={x(i)} y2={H - RAND} stroke="var(--k-line-strong)" strokeWidth={1} pointerEvents="none" />
            <text x={x(i)} y={H + 8} textAnchor="middle" fontSize={7} fill="var(--k-ink-faint)">
              {a.label}
            </text>
          </g>
        ))}
        {matrix.zeilen.map((z) => {
          const punkte = z.werte
            .map((w, i) => ({ x: x(i), y: y(i, w) }))
            .filter((p): p is { x: number; y: number } => p.y !== null);
          return (
            <polyline
              key={z.id}
              data-testid="matrix-linie"
              points={punkte.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={aktiv === z.id ? 'var(--k-accent)' : z.passt ? 'var(--k-ink-soft)' : 'var(--k-danger)'}
              strokeWidth={aktiv === z.id ? 2.4 : 1.3}
              opacity={aktiv && aktiv !== z.id ? 0.35 : 0.9}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setAktiv(z.id)}
              onMouseLeave={() => setAktiv(null)}
            />
          );
        })}
      </svg>
    </div>
  );
}


/** V7: Fassaden-Modulraster über die Volumenkörper des aktiven Geschosses. */
function FassadenModulSektion() {
  const revision = useProject((s) => s.revision);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const [modB, setModB] = useState(2500);
  const [modH, setModH] = useState(3000);
  const [im3d, setIm3d] = useState(false);
  const [editorOffen, setEditorOffen] = useState(false);
  const [modulName, setModulName] = useState<string | null>(null);
  const module = useProject.getState().doc.settings.fassadenModule;
  const gewaehlt = module.find((m) => m.name === modulName) ?? null;
  useEffect(() => {
    // Gewähltes gezeichnetes Modul übersteuert die freien Masse
    const b = gewaehlt?.breite ?? modB;
    const h = gewaehlt?.hoehe ?? modH;
    setModulRaster(im3d ? { b, h, elemente: gewaehlt?.elemente ?? [] } : null);
    return () => setModulRaster(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [im3d, modB, modH, modulName, revision]);
  const doc = useProject.getState().doc;
  const studie = useMemo(
    () => (activeStoreyId ? fassadenModule(doc, activeStoreyId, modB, modH) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision, activeStoreyId, modB, modH],
  );
  if (!studie || studie.zeilen.length === 0) return null;
  const csvLaden = () => {
    const blob = new Blob([moduleAlsCsv(studie, modB, modH)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'fassadenmodule.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div style={{ display: 'grid', gap: 5, borderTop: '1px solid var(--k-line)', paddingTop: 8 }} data-testid="fassadenmodule">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 12 }}>Fassaden-Module</span>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="quiet" data-testid="modul-editor-toggle" onClick={() => setEditorOffen(true)}>
          Editor
        </KButton>
        <KButton size="sm" tone={im3d ? 'accent' : 'quiet'} data-testid="module-3d" onClick={() => setIm3d(!im3d)}>
          Im 3D
        </KButton>
        <KButton size="sm" tone="quiet" data-testid="module-csv" onClick={csvLaden}>
          CSV
        </KButton>
      </div>
      {module.length > 0 && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11.5 }}>
          <span style={{ color: 'var(--k-ink-soft)' }}>Gezeichnet</span>
          <KSelect
            size="sm"
            value={modulName ?? ''}
            data-testid="modul-wahl"
            onChange={(e) => setModulName(e.target.value || null)}
            style={{ flex: 1 }}
          >
            <option value="">— freie Masse —</option>
            {module.map((m) => (
              <option key={m.name} value={m.name}>{m.name} ({(m.breite / 1000).toFixed(2)} × {(m.hoehe / 1000).toFixed(2)})</option>
            ))}
          </KSelect>
        </div>
      )}
      {editorOffen && <ModulEditor onClose={() => setEditorOffen(false)} />}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11.5 }}>
        <span style={{ color: 'var(--k-ink-soft)' }}>Modul</span>
        <input type="number" value={modB} step={50} onChange={(e) => setModB(Number(e.target.value) || 2500)} style={{ width: 64 }} data-testid="modul-b" />
        <span>×</span>
        <input type="number" value={modH} step={50} onChange={(e) => setModH(Number(e.target.value) || 3000)} style={{ width: 64 }} />
        <span style={{ color: 'var(--k-ink-faint)' }}>mm</span>
      </div>
      <div style={{ fontSize: 11.5 }} data-testid="module-bilanz">
        {studie.totalModule} Standardmodule · {studie.totalPassstuecke} Passstücke · Wiederholung{' '}
        {(studie.wiederholung * 100).toFixed(0)}%
      </div>
      {module.length > 0 && (
        <div style={{ display: 'grid', gap: 3, fontSize: 11, maxHeight: 120, overflowY: 'auto' }} data-testid="fassaden-zuweisung">
          {studie.zeilen.map((z) => (
            <div key={`${z.massId}-${z.kante}`} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: 'var(--k-ink-soft)', width: 120 }}>
                {z.koerper} · K{z.kante} ({(z.laenge / 1000).toFixed(1)} m)
              </span>
              <KSelect
                size="sm"
                value={z.modul ?? ''}
                data-testid={`zuweisung-${z.kante}`}
                onChange={(e) =>
                  useProject.getState().runCommand('design.fassadenModulZuweisen', {
                    massId: z.massId,
                    kante: z.kante,
                    modul: e.target.value || null,
                  })
                }
                style={{ flex: 1 }}
              >
                <option value="">frei</option>
                {module.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </KSelect>
            </div>
          ))}
        </div>
      )}
      <span style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>
        Eckenregel: Module ab Ecke, Passstück am Kantenende — Vorfabrikation lebt von der Wiederholung.
      </span>
    </div>
  );
}


/** V4: CH-Standort — Adresssuche (geo.admin.ch), Parzellen-Import, alles im Doc. */
function StandortSuche() {
  const runCommand = useProject((s) => s.runCommand);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const [text, setText] = useState('');
  const [treffer, setTreffer] = useState<{ label: string; lat: number; lon: number; e: number; n: number }[]>([]);
  const [meldung, setMeldung] = useState<string | null>(null);

  const suchen = async () => {
    if (text.trim().length < 3) return;
    setMeldung(null);
    try {
      const res = await fetch(
        `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(text)}&type=locations&origins=address,parcel,gg25&limit=4&sr=2056`,
      );
      const json = (await res.json()) as { results?: { attrs: { label: string; lat: number; lon: number; y: number; x: number } }[] };
      const liste = (json.results ?? []).map((r) => ({
        label: r.attrs.label.replace(/<[^>]+>/g, ''),
        lat: r.attrs.lat,
        lon: r.attrs.lon,
        e: r.attrs.y, // geo.admin: y = Ost, x = Nord (LV95)
        n: r.attrs.x,
      }));
      setTreffer(liste);
      if (liste.length === 0) setMeldung('Nichts gefunden.');
    } catch {
      setMeldung('Kein Netz — Standortsuche nicht verfügbar (Rest der App unberührt).');
    }
  };

  const parzelleImportieren = async () => {
    const { doc } = useProject.getState();
    const standort = doc.settings.standort;
    if (!standort || !activeStoreyId) return;
    setMeldung(null);
    try {
      const g = `${standort.e},${standort.n}`;
      const ext = `${standort.e - 500},${standort.n - 500},${standort.e + 500},${standort.n + 500}`;
      const res = await fetch(
        `https://api3.geo.admin.ch/rest/services/api/MapServer/identify?geometry=${g}&geometryType=esriGeometryPoint&layers=all:ch.kantone.cadastralwebmap-farbe&mapExtent=${ext}&imageDisplay=100,100,96&tolerance=0&returnGeometry=true&sr=2056`,
      );
      const json = (await res.json()) as { results?: { geometry?: { rings?: number[][][] } }[] };
      const rings = (json.results ?? []).flatMap((r) => r.geometry?.rings ?? []);
      const imp = parzelleZuOutline(rings);
      if (!imp) {
        setMeldung('Keine Parzellengeometrie an diesem Punkt.');
        return;
      }
      if (imp.flaeche > 100000) {
        setMeldung(`Getroffene Fläche ist ${Math.round(imp.flaeche / 1000)}k m² — das ist eher eine Gemeinde als eine Parzelle. Adresse präziser wählen.`);
        return;
      }
      runCommand('design.zoneErstellen', {
        storeyId: activeStoreyId,
        outline: imp.outline,
        name: `Parzelle ${standort.label}`,
        sia: 'KF',
      });
      setMeldung(`Parzelle importiert (${imp.flaeche.toLocaleString('de-CH')} m², Nord = +y).`);
    } catch {
      setMeldung('Kein Netz — Parzellen-Import nicht verfügbar.');
    }
  };

  const standortGesetzt = !!useProject.getState().doc.settings.standort;
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', position: 'relative' }}>
      <input
        placeholder="Adresse / Parzelle …"
        value={text}
        data-testid="standort-suche"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void suchen()}
        style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)', width: 170 }}
      />
      <KButton size="sm" tone="quiet" data-testid="standort-suchen" onClick={() => void suchen()}>
        Suchen
      </KButton>
      {standortGesetzt && (
        <KButton size="sm" tone="quiet" data-testid="parzelle-import" onClick={() => void parzelleImportieren()}>
          Parzelle importieren
        </KButton>
      )}
      {treffer.length > 0 && (
        <div
          style={{
            position: 'absolute', top: '110%', left: 0, zIndex: 40, minWidth: 260,
            background: 'var(--k-raised)', border: '1px solid var(--k-line-strong)', borderRadius: 8,
            boxShadow: 'var(--k-shadow, 0 6px 18px rgba(0,0,0,0.18))', display: 'grid',
          }}
          data-testid="standort-treffer"
        >
          {treffer.map((t, i) => (
            <button
              key={i}
              style={{ textAlign: 'left', padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
              onClick={() => {
                runCommand('design.standortSetzen', { label: t.label, lat: t.lat, lon: t.lon, e: t.e, n: t.n });
                setTreffer([]);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {meldung && <span style={{ color: 'var(--k-ink-faint)', maxWidth: 340 }} data-testid="standort-meldung">{meldung}</span>}
    </span>
  );
}
