import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, KButton, Measure, melde, meldeFehler, moduleHue } from '@kosmo/ui';
import {
  areaReport,
  derivePlan,
  fangKandidaten,
  formatLength,
  generiereVolumenstudien,
  geschossZu,
  variantenMatrix,
  parzelleZuOutline,
  fassadenModule,
  moduleAlsCsv,
  magnetFang,
  type Assembly,
  type Column,
  type ErkannteDecke,
  type ErkannteWand,
  type FangKandidaten,
  type Pt,
  type SectionSpec,
  type Stair,
  type Storey,
  type Wall,
  type Zone,
} from '@kosmo/kernel';
import { bootstrapProject, useProject } from '../../state/project-store';
import { importBerichtText, useUnternehmerplan } from './unternehmerplan';
import { VERSCHIEBBAR } from './plan-hit-test';
import { zeichenSnap, type Fluchtlinie } from './zeichenhilfen';
import { werkzeugFuerTaste } from './zeichen-shortcuts';
import { setModulRaster, Viewport3D, type ViewportHandlers } from './Viewport3D';
import { ModulEditor } from './ModulEditor';
import { PlanView } from './PlanView';
import { KennzahlenPanel } from './KennzahlenPanel';
import { DrawPanel } from './DrawPanel';
import { BerechnungslistePanel } from './BerechnungslistePanel';
import { RasterPanel } from './RasterPanel';
import { SplatPanel } from './SplatPanel';
import type { SplatCloud } from './splat-import';
import { Inspector } from './Inspector';
import { SectionView } from './SectionView';
import { exportIfcFile, exportPlanDxf, exportPlanPdf, exportPlanSvg, PHASEN_MASSSTAB } from './export-plan';
import { consumeDeepLink } from '../../state/deep-link';
import { importIfc } from './ifc-import';
import { setContextMeshes, setSplatCloud, setSunDate, setTexturModus } from './Viewport3D';
import { registerActions } from '../../shell/palette';
import { fokusKlasse } from '../../state/fokus';
import {
  adaptionAktiv,
  adaptionZuruecksetzen,
  adaptiveFokusStufe,
  darfUmordnen,
  elementFokusStufe,
  gehobenesElementDerGruppe,
  istUnterBasis,
  LEISTEN_BASIS,
  leiteTaetigkeitsKontextAb,
  nutzungMelden,
  nutzungsProfil,
  opazitaetsWert,
  setAdaptionAktiv,
  ZEICHEN_WERKZEUG_IDS,
  type LeistenGruppe,
  type NutzungsProfil,
  type TaetigkeitsKontext,
} from '../../state/oberflaeche-adaption';

/**
 * KosmoDesign — Arbeitsfläche. V1-Start: 3D-Viewport mit Wand-/Volumen-
 * Werkzeugen (Klick-Klick mit Gummiband, Snap aufs Raster), Geschossleiste,
 * Undo/Redo. Splitscreen mit 2D-Plänen folgt in M2.
 */

type ToolId = 'auswahl' | 'wand' | 'volumen' | 'zone' | 'dach' | 'treppe' | 'stuetze' | 'schnitt' | 'skizze' | 'mesh';

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
 */
function Trennlabel({ children }: { children: string }) {
  return (
    <span
      className="k-selten"
      style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--k-ink-faint)', padding: '0 2px' }}
    >
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
  projekt: 'Projekt',
  verlauf: 'Verlauf',
};
const LEERES_NUTZUNGSPROFIL: NutzungsProfil = { zaehler: {}, zuletzt: {} };
/** Regel 2.3.2: 2s Debounce nach Aktionsende, bevor eine Zeichnen-Demotion wieder greift. */
const ADAPTION_DEBOUNCE_MS = 2000;

export function DesignWorkspace() {
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

  // ArchiCAD-Gefühl: die Arbeitsfläche öffnet im Auswahl-Werkzeug (Pfeil), nicht
  // schon zeichnend — sonst baut der erste Klick versehentlich eine Wand.
  const [tool, setTool] = useState<ToolId>('auswahl');
  const [treppenForm, setTreppenForm] = useState<'gerade' | 'podest' | 'u' | 'l'>('gerade');
  const [viewMode, setViewMode] = useState<'3d' | '2d' | 'split' | 'quad'>('split');
  // B5: Massstabs-Automatik — bestätigbarer Hinweis nach dem Phasenwechsel
  const [massstabHinweis, setMassstabHinweis] = useState<string | null>(null);
  const [sectionSpec, setSectionSpec] = useState<SectionSpec | null>(null);
  const [assemblyId, setAssemblyId] = useState<string | null>(null);
  const [points, setPoints] = useState<Pt[]>([]);
  const [cursor, setCursor] = useState<Pt | null>(null);
  // T3-Zeichenhilfen: sichtbare Fluchtlinien + Ortho-Status fürs Overlay (PlanView)
  const [fluchtlinien, setFluchtlinien] = useState<Fluchtlinie[]>([]);
  const [orthoAktiv, setOrthoAktiv] = useState(false);
  // Ziehen im Plan (Auswahl-Werkzeug): Startpunkt gemerkt, aktuelle Position
  // folgt der Maus als reine Vorschau — erst bei pointerup EIN design.verschieben
  const [dragEntity, setDragEntity] = useState<{ id: string; start: Pt } | null>(null);
  const [dragCursor, setDragCursor] = useState<Pt | null>(null);
  // Block 3 / E4: meshEdit-Modus — angeklickte Fläche (Kernel-Dreiecks-Index)
  // + der Distanzwert des Extrudieren-Felds (Default 500 mm, Buildplan FM3).
  const [meshFace, setMeshFace] = useState<number | null>(null);
  const [meshDistanz, setMeshDistanz] = useState(500);
  // Volumenstudien (Q12): letzte Zone = Parzelle, Varianten als Gruppe übernehmen
  const [studieOffen, setStudieOffen] = useState(false);
  const [drawOffen, setDrawOffen] = useState(false);
  const [listeOffen, setListeOffen] = useState(false);
  const [rasterOffen, setRasterOffen] = useState(false);
  // Splat-Werkzeug (Owner-Korrektur 05.07.: NICHT HomeStation-exklusiv) —
  // Crop/Ausdünnen/Export laufen lokal, siehe SplatPanel.tsx.
  const [splatPanelOffen, setSplatPanelOffen] = useState(false);
  const [splatCloud, setSplatCloudState] = useState<SplatCloud | null>(null);
  // T7: Projekt-Lebenszyklus — Phase/Bemassungsstil sind projektspezifisch und
  // wechseln über Jahre selten; sie stehen nicht mehr dauerhaft in der Werk-
  // zeugzeile, sondern im Projekt-Menü (Fokus-Stufe «selten»).
  const [projektMenuOffen, setProjektMenuOffen] = useState(false);
  const [wohnungstyp, setWohnungstyp] = useState<string | null>(null);
  const [zielGf, setZielGf] = useState<number | null>(null);
  const [maxHoeheM, setMaxHoeheM] = useState(25);

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

  // T3: Zeichen-Kurzbefehle (W/Z/V/D/T/C/S/F, Esc → Auswahl) — an ArchiCAD
  // angelehnt, nur solange KosmoDesign offen ist. Dieselbe Eingabefeld-/
  // Dialog-Wache wie shell/Kurzbefehle.tsx, damit Tippen nie ein Werkzeug wechselt.
  useEffect(() => {
    const inEingabe = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || inEingabe(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('[role="dialog"]')) return; // Palette/Bestätigung/Kurzbefehle behalten die Tastatur
      if (e.key === 'Escape') {
        // ArchiCAD-Reflex: Esc bricht die laufende Kette ab UND geht zur Auswahl zurück
        setTool('auswahl');
        setPoints([]);
        return;
      }
      const werkzeug = werkzeugFuerTaste(e.key);
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
      return snap(rawP, magnet);
    }
    const ref = points.length > 0 ? points[points.length - 1]! : null;
    const erg = zeichenSnap(rawP, ref, shiftKey, magnet, alignPunkte, FLUCHT_TOLERANZ, (p) => snap(p, magnet));
    setFluchtlinien(erg.fluchtlinien);
    setOrthoAktiv(erg.orthoAktiv);
    return erg.p;
  };

  const handlersRef = useRef<ViewportHandlers>({});
  const select = useProject((s) => s.select);
  handlersRef.current = {
    fluchtlinien,
    orthoAktiv,
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
    onSketchAccept: (segments) => {
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
      // nie ohne den «Fertig»-Knopf ab), sonst wie bisher die laufende Kette.
      if (meshEditId) {
        setMeshEditId(null);
        return;
      }
      setPoints([]);
    },
    onGroundClick: (e) => {
      if (!activeStoreyId) return;
      const p = zielPunkt(e.p, e.shiftKey);
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
            setPoints(e.shiftKey ? [] : [p]);
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
          setSectionSpec({ a: points[0]!, b: p, depth: 30000, lookLeft: true });
          setPoints([]);
          setViewMode('quad');
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
    },
  };

  useEffect(() => {
    setPoints([]);
  }, [tool, activeStoreyId]);

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
  const ebenenPanelOffen = sonneOffen || drawOffen || listeOffen || rasterOffen || splatPanelOffen || studieOffen;

  // Serie J / Batch J3b (SERIE-J-BUILDPLAN.md Abschnitt 2/3): die Werkzeug-
  // leisten-Gruppen leben — ihre Fokus-Stufe kommt aus `adaptiveFokusStufe`
  // statt fest aus T7. `aktionLaeuft` = Punktkette offen ODER 2D-Drag aktiv
  // (die real in DesignWorkspace vorhandenen Flags; `Viewport3D.tsx` bleibt
  // unangetastet — siehe Restgrenze in `leiteTaetigkeitsKontextAb`).
  const taetigkeitsKontext = useMemo<TaetigkeitsKontext>(
    () =>
      leiteTaetigkeitsKontextAb({
        tool,
        phase: doc.settings.phase,
        punkteOffen: points.length > 0,
        ziehtElement: dragEntity !== null,
        panelOffen: ebenenPanelOffen,
      }),
    [tool, doc.settings.phase, points.length, dragEntity, ebenenPanelOffen],
  );

  // Regel 2.3.2 (Anti-Nerv): solange `darfUmordnen` false ist (Aktion läuft),
  // wird sofort übernommen (die Anti-Dimm-Wache in `adaptiveFokusStufe` hebt
  // die Gruppe da ohnehin auf Basis — nie eine Dimmung mitten in der Aktion).
  // Endet die Aktion, wartet eine neue, tiefere Stufe 2s (Debounce), bevor sie
  // einfällt — reine Werkzeugwechsel im Ruhezustand (kein vorheriges
  // `aktionLaeuft`) greifen dagegen sofort (kein künstliches Warten beim
  // simplen Werkzeugwechsel).
  const [stabilerKontext, setStabilerKontext] = useState<TaetigkeitsKontext>(taetigkeitsKontext);
  // Fable-Review-2-Auflage J3c-4: das gelernte Nutzungsprofil wird zusammen
  // mit `stabilerKontext` snapshottet, NICHT frisch bei jedem Render aus dem
  // Store gelesen — sonst könnte ein Klick mitten in einer offenen Punktkette
  // die Top-3-Schwelle reissen und am Debounce vorbei umstufen. Aufgefrischt
  // wird nur an genau den Stellen, an denen auch `stabilerKontext` weiter-
  // rückt (`darfUmordnen` gilt) — das behebt zugleich J3c-5 (kein Store-Read
  // mehr pro Render/Mousemove).
  const [nutzungSnapshot, setNutzungSnapshot] = useState<NutzungsProfil>(() => nutzungsProfil());
  const adaptionFreezeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!darfUmordnen(taetigkeitsKontext)) {
      if (adaptionFreezeTimer.current) {
        clearTimeout(adaptionFreezeTimer.current);
        adaptionFreezeTimer.current = null;
      }
      setStabilerKontext(taetigkeitsKontext);
      return;
    }
    if (stabilerKontext.aktionLaeuft) {
      adaptionFreezeTimer.current = setTimeout(() => {
        setStabilerKontext(taetigkeitsKontext);
        setNutzungSnapshot(nutzungsProfil());
      }, ADAPTION_DEBOUNCE_MS);
      return () => {
        if (adaptionFreezeTimer.current) clearTimeout(adaptionFreezeTimer.current);
      };
    }
    setStabilerKontext(taetigkeitsKontext);
    setNutzungSnapshot(nutzungsProfil());
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taetigkeitsKontext]);

  // Fable-Review-2-Auflage J3c-1/J3c-5: expliziter React-State für den
  // Opt-out-Schalter (Projekt-Menü) — ein Umschalten wirkt sofort, ohne
  // Reload und ohne auf einen zufälligen Re-Render angewiesen zu sein; der
  // Store selbst wird dabei nur EINMAL beim Schreiben angefasst, nicht mehr
  // pro Render gelesen.
  const [adaptionIstAn, setAdaptionIstAnState] = useState(() => adaptionAktiv());
  const adaptionUmschalten = (aktiv: boolean) => {
    setAdaptionAktiv(aktiv);
    setAdaptionIstAnState(aktiv);
  };
  // `adaption-reset` (2.3.4): löscht NUR das gelernte Profil, der Schalter
  // bleibt unangetastet (siehe `adaptionZuruecksetzen` in
  // oberflaeche-adaption.ts, Fable-Review-2-Auflage J3c-1).
  const adaptionZuruecksetzenUndAuffrischen = () => {
    adaptionZuruecksetzen();
    setNutzungSnapshot(nutzungsProfil());
  };

  const nutzung = adaptionIstAn ? nutzungSnapshot : LEERES_NUTZUNGSPROFIL;
  const stufeFuerGruppe = (gruppe: LeistenGruppe) => {
    const basis = LEISTEN_BASIS[gruppe];
    return adaptionIstAn ? adaptiveFokusStufe(gruppe, basis, stabilerKontext, nutzung) : basis;
  };
  const gedaempfteGruppen = (Object.keys(LEISTEN_BASIS) as LeistenGruppe[]).filter((g) =>
    istUnterBasis(stufeFuerGruppe(g), LEISTEN_BASIS[g]),
  );
  const adaptionHinweisSichtbar = gedaempfteGruppen.length > 0;
  const adaptionHinweisTitel = adaptionHinweisSichtbar
    ? `${gedaempfteGruppen.map((g) => GRUPPEN_LABEL[g]).join('/')} zurückgestellt — du zeichnest gerade`
    : '';

  // Fable-Review-2-Auflage J3c-2 (Element-Hebung): pro Gruppe höchstens ein
  // "gehobenes" Element (oft genutzt, Top-3, s. oberflaeche-adaption.ts).
  // NUR wenn eines existiert, wird die Dimmung dieser Gruppe pro Kind
  // angewandt — sonst unverändert wie in J3b (der Gruppen-Wrapper trägt die
  // Opazität für alle Kinder gemeinsam, kein unnötiger Zusatzaufwand).
  const gehobenNachGruppe = Object.fromEntries(
    (Object.keys(LEISTEN_BASIS) as LeistenGruppe[]).map((g) => [
      g,
      adaptionIstAn ? gehobenesElementDerGruppe(g, nutzung) : undefined,
    ]),
  ) as Record<LeistenGruppe, string | undefined>;

  /**
   * style für EIN Werkzeugleisten-Element (`gruppe:name`). Ohne gehobenes
   * Element in der Gruppe: kein Zusatz (Wrapper dimmt wie gewohnt, keine
   * unnötige Extra-Arbeit). MIT gehobenem Element: numerischer Opazitätswert
   * (`opazitaetsWert`, NIE font-size/font-weight, 2.3.1) als `style.opacity`
   * — `KButton` setzt selbst immer eine Inline-`opacity` (0.45/1), die eine
   * className NICHT überschreiben könnte (CSS-Kaskade: Inline schlägt jede
   * nicht-`!important`-Klasse). Die multiplikative CSS-opacity-Falle
   * (J3c-2) wird dadurch umgangen, dass der Gruppen-Wrapper seine eigene
   * Opazität in diesem Fall auf 1 neutralisiert (s. `style={{ opacity: 1 }}`
   * an den Gruppen-Spans unten) und jedes Kind seine Opazität stattdessen
   * selbst trägt — bestehende `opacity var(--k-motion-fast)`-Transition aus
   * `buttonBase` (kosmo-ui) dämpft den Wechsel weiterhin, ungefragt entfernt
   * wird hier nichts.
   */
  function elementStil(gruppe: LeistenGruppe, name: string): { style?: React.CSSProperties } {
    const gehoben = gehobenNachGruppe[gruppe];
    if (!gehoben) return {};
    const stufe = elementFokusStufe(`${gruppe}:${name}`, stufeFuerGruppe(gruppe), gehoben);
    return { style: { opacity: opazitaetsWert(stufe) } };
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Werkzeugleiste */}
      <div
        data-testid="design-werkzeugleiste"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          rowGap: 4,
          padding: '8px 14px',
          borderBottom: '1px solid var(--k-line)',
          background: 'var(--k-surface)',
          zIndex: 2,
        }}
      >
        <Badge hue={moduleHue.design}>KosmoDesign</Badge>
        <span style={{ width: 8 }} />
        <span
          data-testid="leiste-gruppe-zeichnen"
          className={fokusKlasse(stufeFuerGruppe('zeichnen'))}
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            gap: 8,
            rowGap: 4,
            alignItems: 'center',
            ...(gehobenNachGruppe.zeichnen ? { opacity: 1 } : {}),
          }}
        >
          {(
            [
              ['auswahl', 'Auswahl'],
              ['wand', 'Wand'],
              ['volumen', 'Volumen'],
              ['zone', 'Zone'],
              ['dach', 'Dach'],
              ['treppe', 'Treppe'],
              ['stuetze', 'Stütze'],
              ['schnitt', 'Schnitt'],
              ['skizze', '✎ Skizze'],
            ] as const
          ).map(([id, label]) => (
            <KButton
              key={id}
              size="sm"
              tone={tool === id ? 'accent' : 'quiet'}
              onClick={() => {
                setTool(id);
                nutzungMelden(`zeichnen:${id}`);
              }}
              data-testid={`tool-${id}`}
              {...elementStil('zeichnen', id)}
            >
              {label}
            </KButton>
          ))}
          {/* Block 3 / E4 (Buildplan FM3): Werkzeug «Mesh» — expliziter
              `werkzeug-mesh`-Testid statt des generischen `tool-*`-Musters,
              weil die Auftragsspezifikation genau diesen Namen verlangt. */}
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
            Mesh
          </KButton>
        </span>
        <span style={{ width: 12 }} />
        {tool === 'wand' && assemblies.length > 0 && (
          <select
            value={effectiveAssembly ?? ''}
            onChange={(e) => setAssemblyId(e.target.value)}
            style={{
              background: 'var(--k-raised)',
              border: '1px solid var(--k-line-strong)',
              borderRadius: 'var(--k-radius-sm)',
              padding: '4px 8px',
              fontSize: 12.5,
            }}
          >
            {assemblies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
        <div style={{ flex: 1 }} />
        <Trennlabel>Ansicht</Trennlabel>
        <span
          data-testid="leiste-gruppe-ansicht"
          className={fokusKlasse(stufeFuerGruppe('ansicht'))}
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            gap: 8,
            rowGap: 4,
            alignItems: 'center',
            ...(gehobenNachGruppe.ansicht ? { opacity: 1 } : {}),
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
              tone={viewMode === id ? 'accent' : 'ghost'}
              onClick={() => {
                setViewMode(id);
                nutzungMelden(`ansicht:${id}`);
              }}
              data-testid={`view-${id}`}
              {...elementStil('ansicht', id)}
            >
              {label}
            </KButton>
          ))}
        </span>
        <span style={{ width: 12 }} />
        <Trennlabel>Export</Trennlabel>
        <span
          data-testid="leiste-gruppe-export"
          className={fokusKlasse(stufeFuerGruppe('export'))}
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            gap: 8,
            rowGap: 4,
            alignItems: 'center',
            ...(gehobenNachGruppe.export ? { opacity: 1 } : {}),
          }}
        >
          <KButton
            size="sm"
            tone="ghost"
            onClick={() => {
              void exportPlanPdf();
              nutzungMelden('export:pdf');
            }}
            data-testid="export-pdf"
            {...elementStil('export', 'pdf')}
          >
            PDF
          </KButton>
          <KButton
            size="sm"
            tone="ghost"
            onClick={() => {
              exportPlanSvg();
              nutzungMelden('export:svg');
            }}
            {...elementStil('export', 'svg')}
          >
            SVG
          </KButton>
          <KButton
            size="sm"
            tone="ghost"
            onClick={() => {
              exportPlanDxf();
              nutzungMelden('export:dxf');
            }}
            data-testid="export-dxf"
            {...elementStil('export', 'dxf')}
          >
            DXF
          </KButton>
          <KButton
            size="sm"
            tone="ghost"
            onClick={() => {
              exportIfcFile();
              nutzungMelden('export:ifc');
            }}
            data-testid="export-ifc"
            {...elementStil('export', 'ifc')}
          >
            IFC
          </KButton>
          <KButton
            size="sm"
            tone="ghost"
            data-testid="import-ifc"
            onClick={() => {
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
                  setBestand(
                    result.erkannt.waende.length + result.erkannt.decken.length > 0
                      ? result.erkannt
                      : null,
                  );
                } catch (err) {
                  meldeFehler(`IFC-Import fehlgeschlagen: ${err instanceof Error ? err.message : err}`);
                }
              };
              input.click();
            }}
            {...elementStil('export', 'import-ifc')}
          >
            IFC laden
          </KButton>
          <KButton
            size="sm"
            tone="ghost"
            data-testid="import-dxf"
            onClick={() => {
              nutzungMelden('export:import-dxf');
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.dxf,.dwg';
              input.onchange = async () => {
                const f = input.files?.[0];
                if (!f) return;
                // C4b/C-E7: DWG ist proprietär — kein Ladeversuch, ehrliche Absage
                // statt eines stillen Fehlschlags beim Parsen.
                if (/\.dwg$/i.test(f.name)) {
                  melde('DWG ist proprietär — bitte als DXF exportieren (jedes CAD kann das).', { ton: 'fehler' });
                  return;
                }
                const text = await f.text();
                const { doc, activeStoreyId } = useProject.getState();
                if (!activeStoreyId) return;
                const plan = derivePlan(doc, activeStoreyId);
                useUnternehmerplan.getState().laden(f.name, text, plan);
                const { dxf, abgleich, fehler } = useUnternehmerplan.getState();
                if (fehler) {
                  melde(fehler, { ton: 'fehler' });
                  return;
                }
                if (dxf && abgleich) {
                  melde(importBerichtText(dxf.bericht, abgleich), { ton: 'erfolg' });
                  // Overlay einmalig beim Laden einschalten — nur wenn es noch aus ist.
                  if (!useUnternehmerplan.getState().overlaySichtbar) {
                    useUnternehmerplan.getState().overlayUmschalten();
                  }
                }
              };
              input.click();
            }}
            {...elementStil('export', 'import-dxf')}
          >
            DXF laden
          </KButton>
          <KButton
            size="sm"
            tone="ghost"
            data-testid="import-splat"
            onClick={() => {
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
            }}
            {...elementStil('export', 'import-splat')}
          >
            Splat laden
          </KButton>
          <KButton
            size="sm"
            tone={splatPanelOffen ? 'accent' : 'ghost'}
            data-testid="splat-werkzeug-toggle"
            onClick={() => {
              setSplatPanelOffen(!splatPanelOffen);
              nutzungMelden('export:splat-werkzeug');
            }}
            {...elementStil('export', 'splat-werkzeug')}
          >
            Splat-Werkzeug
          </KButton>
        </span>
        <Trennlabel>Ebenen</Trennlabel>
        <span
          data-testid="leiste-gruppe-ebenen"
          className={fokusKlasse(stufeFuerGruppe('ebenen'))}
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            gap: 8,
            rowGap: 4,
            alignItems: 'center',
            ...(gehobenNachGruppe.ebenen ? { opacity: 1 } : {}),
          }}
        >
          <KButton
            size="sm"
            tone={texturen ? 'accent' : 'ghost'}
            data-testid="textur-toggle"
            onClick={() => {
              setTexturModus(!texturen);
              setTexturen(!texturen);
              nutzungMelden('ebenen:textur');
            }}
            {...elementStil('ebenen', 'textur')}
          >
            Textur
          </KButton>
          <KButton
            size="sm"
            tone={sonneOffen ? 'accent' : 'ghost'}
            data-testid="sonne-toggle"
            onClick={() => {
              setSonneOffen(!sonneOffen);
              nutzungMelden('ebenen:sonne');
            }}
            {...elementStil('ebenen', 'sonne')}
          >
            ☀ Sonne
          </KButton>
          <KButton
            size="sm"
            tone={studieOffen ? 'accent' : 'ghost'}
            data-testid="studie-toggle"
            onClick={() => {
              setStudieOffen(!studieOffen);
              nutzungMelden('ebenen:studie');
            }}
            {...elementStil('ebenen', 'studie')}
          >
            Varianten
          </KButton>
          <KButton
            size="sm"
            tone={drawOffen ? 'accent' : 'ghost'}
            data-testid="draw-toggle"
            onClick={() => {
              setDrawOffen(!drawOffen);
              nutzungMelden('ebenen:draw');
            }}
            {...elementStil('ebenen', 'draw')}
          >
            Draw
          </KButton>
          <KButton
            size="sm"
            tone={listeOffen ? 'accent' : 'ghost'}
            data-testid="liste-toggle"
            onClick={() => {
              setListeOffen(!listeOffen);
              nutzungMelden('ebenen:liste');
            }}
            {...elementStil('ebenen', 'liste')}
          >
            Liste
          </KButton>
          <KButton
            size="sm"
            tone={rasterOffen ? 'accent' : 'ghost'}
            data-testid="raster-toggle"
            onClick={() => {
              setRasterOffen(!rasterOffen);
              if (!rasterOffen) setListeOffen(false);
              nutzungMelden('ebenen:raster');
            }}
            {...elementStil('ebenen', 'raster')}
          >
            Raster
          </KButton>
        </span>
        {tool === 'treppe' && (
          <select
            value={treppenForm}
            data-testid="treppen-form"
            onChange={(e) => {
              setTreppenForm(e.target.value as 'gerade' | 'podest' | 'u' | 'l');
              setPoints([]);
            }}
            title="Treppenform — L-Lauf: Antritt, Ecke, Austritt klicken"
            style={{ padding: '3px 5px', borderRadius: 6, border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)', fontSize: 12 }}
          >
            <option value="gerade">gerade</option>
            <option value="podest">mit Podest</option>
            <option value="u">U-Lauf</option>
            <option value="l">L-Lauf</option>
          </select>
        )}
        <span style={{ width: 12 }} />
        {/* T7 (Projekt-Lebenszyklus): Phase/Bemassungsstil sind projektspezifisch
            und wechseln über Jahre selten — sie stehen nicht mehr dauerhaft in
            der Werkzeugzeile, sondern hinter diesem Umschalter (Fokus-Stufe
            «selten», docs/OBERFLAECHE-FOKUS-SYSTEMATIK.md). Nichts entfernt:
            dieselben Commands, dieselben data-testids, nur der Ort ist neu. */}
        <span
          data-testid="leiste-gruppe-projekt"
          className={fokusKlasse(stufeFuerGruppe('projekt'))}
          style={{ display: 'inline-flex', ...(gehobenNachGruppe.projekt ? { opacity: 1 } : {}) }}
        >
          <KButton
            size="sm"
            tone={projektMenuOffen ? 'accent' : 'ghost'}
            data-testid="projekt-menu-toggle"
            title="Projekt-Einstellungen — SIA-Phase, Bemassungsstil (selten geändert)"
            onClick={() => {
              setProjektMenuOffen((o) => !o);
              nutzungMelden('projekt:menu');
            }}
            {...elementStil('projekt', 'menu')}
          >
            Projekt ▾
          </KButton>
        </span>
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
        <span
          data-testid="leiste-gruppe-verlauf"
          className={fokusKlasse(stufeFuerGruppe('verlauf'))}
          style={{ display: 'inline-flex', gap: 8, alignItems: 'center', ...(gehobenNachGruppe.verlauf ? { opacity: 1 } : {}) }}
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
            <select
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
              style={{ padding: '3px 5px', borderRadius: 6, border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)', fontSize: 12 }}
            >
              <option value="vorprojekt">Vorprojekt</option>
              <option value="bauprojekt">Bauprojekt</option>
              <option value="werkplan">Werkplan</option>
            </select>
          </label>
          {/* Bemassungs-Stil (V2-A5): Presets als Projekteinstellung, undo-fähig */}
          <label style={{ fontSize: 12, color: 'var(--k-ink-faint)', display: 'flex', alignItems: 'center', gap: 5 }}>
            Masse
            <select
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
              style={{ padding: '3px 5px', borderRadius: 6, border: '1px solid var(--k-line-strong)', background: 'var(--k-raised)', fontSize: 12 }}
            >
              <option value="standard">Standard</option>
              <option value="wettbewerb">Wettbewerb</option>
              <option value="werkplan">Werkplan</option>
              <option value="aus">Aus</option>
              {bemassungPreset === 'eigen' && <option value="eigen">eigen</option>}
            </select>
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
      <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
        {drawOffen && <DrawPanel />}
        {rasterOffen && <RasterPanel onClose={() => setRasterOffen(false)} />}
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
        {studieOffen && (
          <StudienPanel
            zielGf={zielGf}
            setZielGf={setZielGf}
            maxHoeheM={maxHoeheM}
            setMaxHoeheM={setMaxHoeheM}
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
              <PlanView handlers={handlersRef} />
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
                <PlanView handlers={handlersRef} />
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

        {/* Geschossleiste */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: 4,
            background: 'var(--k-surface)',
            border: '1px solid var(--k-line)',
            borderRadius: 'var(--k-radius-md)',
            padding: 6,
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
              tone={s.id === activeStoreyId ? 'accent' : 'ghost'}
              onClick={() => setActiveStorey(s.id)}
              data-testid={`storey-${s.name}`}
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
        </div>

        {/* Statuszeile */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            right: 12,
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            pointerEvents: 'none',
            fontSize: 12.5,
            color: 'var(--k-ink-soft)',
          }}
        >
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
          <span style={{ background: 'var(--k-surface)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--k-line)' }}>
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
  onClose,
}: {
  zielGf: number | null;
  setZielGf: (v: number) => void;
  maxHoeheM: number;
  setMaxHoeheM: (v: number) => void;
  onClose: () => void;
}) {
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const { doc, history } = useProject.getState();
  const [nutzung, setNutzung] = useState<'wohnen' | 'gemischt'>('wohnen');

  const parzelle = useMemo(() => {
    const zonen = doc.byKind<Zone>('zone').filter((z) => z.storeyId === activeStoreyId);
    return zonen[zonen.length - 1] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, activeStoreyId]);

  const zielEffektiv = zielGf ?? Math.max(Math.round(areaReport(doc).agfZiel) || 0, 500);

  const varianten = useMemo(
    () =>
      parzelle
        ? generiereVolumenstudien(parzelle.outline, { zielGf: zielEffektiv, maxHoehe: maxHoeheM * 1000, nutzung })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parzelle, zielEffektiv, maxHoeheM, nutzung, revision],
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
        top: 52,
        width: 268,
        maxHeight: 'calc(100% - 64px)',
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
            Parzelle: «{parzelle.name}» · Grenzabstand 4 m
          </div>
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
          <select
            value={modulName ?? ''}
            data-testid="modul-wahl"
            onChange={(e) => setModulName(e.target.value || null)}
            style={{ padding: '2px 6px', flex: 1 }}
          >
            <option value="">— freie Masse —</option>
            {module.map((m) => (
              <option key={m.name} value={m.name}>{m.name} ({(m.breite / 1000).toFixed(2)} × {(m.hoehe / 1000).toFixed(2)})</option>
            ))}
          </select>
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
              <select
                value={z.modul ?? ''}
                data-testid={`zuweisung-${z.kante}`}
                onChange={(e) =>
                  useProject.getState().runCommand('design.fassadenModulZuweisen', {
                    massId: z.massId,
                    kante: z.kante,
                    modul: e.target.value || null,
                  })
                }
                style={{ padding: '1px 4px', flex: 1 }}
              >
                <option value="">frei</option>
                {module.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
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
