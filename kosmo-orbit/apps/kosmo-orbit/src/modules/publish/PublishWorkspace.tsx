import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Hairline, Messrahmen, Badge, KButton, KIcon, KInput, KSelect, KSwitch, KToolbar, KToolGruppe, Panel, moduleHue, melde, meldeFehler } from '@kosmo/ui';
import {
  plankopfReserveMm,
  planToDxf,
  sheetPaperSize,
  sheetToSvg,
  transmittalCsv,
  type Sheet,
  type SheetFormat,
  type Storey,
} from '@kosmo/kernel';
import { bootstrapProject, useProject } from '../../state/project-store';
import { BODEN_DOCK_RESERVE_PX } from '../../shell/BodenDock';
import { DockFlaeche, type DockPanelEintrag } from '../../shell/dock/DockFlaeche';
import { useDockZustand } from '../../state/dock-zustand';
import { PRESET_IDS, presetOffenMap, type PresetId } from '../../state/dock-presets';
import { useUiZustand } from '../../state/ui-zustand';
import { exportSetSvgs, exportSheetPdf, exportSheetSetPdf } from './export-sheets';
import { AutoPackPanel, LAYOUT_VORSCHLAG_DEFAULT } from './AutoPackPanel';
import { proposalLog } from '../../state/proposal-log';
import { DossierPanel } from './DossierPanel';
import { PlankopfPanel } from './PlankopfPanel';
import { BlattCanvas } from './BlattCanvas';
import { schnittLinie as schnittLinieAktion } from './publish-aktionen';
// PC3 (`docs/V084-SPEZ.md` §5 W3, C-19) — der Publish-Island-Katalog (eigener
// Namensraum, s. `island/inhalte/registry.ts`-Kopfkommentar) + die
// Registrierung seiner Stufe-2/3-Inhalte als Import-Seiteneffekt (Muster
// `vis/island/index.ts`, das seinerseits `design/island/IslandShell.tsx`s
// Kopfimporte spiegelt).
import { PUBLISH_INSELN, publishInhaltsRegistry } from './island';
import { BlattZoomBuehne } from './island/BlattZoomBuehne';
import { usePublishRuntime } from './publish-runtime';
// PD2/E1 (`docs/V084-SPEZ.md` §5 W3) — NUR IMPORTIEREN, design/island/**
// bleibt fremder Dateibesitz (Sanktion 2 gilt spiegelbildlich). `IslandBuehne`/
// `KosmoOrb` sind die generische PC0-Bühne bzw. das E2-Orb-Vorbild — beide
// bereits stationsagnostisch gebaut (Muster PC1, `VisWorkspace.tsx`).
import { IslandBuehne } from '../design/island/IslandShell';
import { KosmoOrb } from '../design/island/KosmoOrb';
import type { IslandWerkzeug } from '../design/island/island-katalog';
import './publish.css';

/** v0.8.1 P7 (`docs/V081-SPEZ.md` §6.1/§7(e), C-13) — kurze Beschriftung des
 *  Preset-Schnellzugriffs, identisch zu `DesignWorkspace.tsx`/
 *  `VisWorkspace.tsx`s `PRESET_KURZLABEL` (dieselbe Registry, `dock-
 *  presets.ts`s `DockPreset.titel`, hier als eigene Konstante geführt statt
 *  importiert — Konvention dieser drei Stationen, s. dortige Kopfkommentare). */
const PRESET_KURZLABEL: Record<PresetId, string> = { fokus: 'Fokus', arbeiten: 'Arbeiten', pruefen: 'Prüfen' };

/**
 * KosmoPublish — Blatteditor. Blätter sind Kernel-Entities (Undo/Sync/.kosmo
 * inklusive); die Vorschau ist das echte Druck-SVG, Platzierungen werden per
 * Drag direkt auf dem Papier verschoben (Command beim Loslassen).
 */

// v0.8.1/P13 (docs/V081-SPEZ.md §7(d), C-27): `Rolle` additiv angehängt —
// 1600×594mm Plotter-Rollenformat mit Leporello-Zickzack-Faltlinien
// (`derive/sheet.ts`, Guard `sheet.format === 'Rolle'`), bestehende A0–A4
// unverändert an erster Stelle.
const FORMATS: SheetFormat[] = ['A0', 'A1', 'A2', 'A3', 'A4', 'Rolle'];
const SCALES = [50, 100, 200, 500];

export interface PublishWorkspaceProps {
  /** Serie K / A4: öffnet das zentrale Einstellungs-Panel, vorgefiltert auf
   *  KosmoPublish. Optional — nur `App.tsx` kennt diesen Weg. */
  onEinstellungen?: () => void;
}

export function PublishWorkspace({ onEinstellungen }: PublishWorkspaceProps = {}) {
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const undo = useProject((s) => s.undo);
  const { doc } = useProject.getState();
  if (doc.byKind('storey').length === 0) bootstrapProject();

  const sheets = useMemo(
    () => doc.byKind<Sheet>('sheet').sort((a, b) => a.index - b.index),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
  const storeys = useMemo(
    () => doc.storeysOrdered(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  // ---------------------------------------------------------------------
  // PC3 (`docs/V084-SPEZ.md` §5 W3, C-19) — Island-Modus. `publishOberflaeche`
  // spiegelt `VisWorkspace.tsx`s `visOberflaeche`-Umschalter 1:1 (additives
  // Store-Feld, `state/ui-zustand.ts`). Das aktive Blatt im Island-Modus
  // kommt aus `publish-runtime.ts` (`aktiverSheetId`) statt aus
  // `activeSheetId`/`setActiveSheetId` oben — jene zwei bleiben der
  // EXKLUSIVE Manuell-Modus-Pfad (Bestandsschutz: kein Bestands-Konsument
  // dieser Datei ändert sich, wenn `publishOberflaeche==='island'` nie
  // erreicht wird, z.B. in den Bestands-E2E-Specs unter dem globalen
  // `manuell-seed.ts`-Seed).
  const publishOberflaeche = useUiZustand((s) => s.publishOberflaeche);
  const setPublishOberflaeche = useUiZustand((s) => s.setPublishOberflaeche);
  const aktiverSheetIdInsel = usePublishRuntime((s) => s.aktiverSheetId);
  const setAktiverSheetIdInsel = usePublishRuntime((s) => s.setAktiverSheetId);

  /**
   * PC1-Muster (`VisWorkspace.tsx`s `aktiviereVisIslandWerkzeug()`): Aktion
   * für JEDE Erst-Aktivierung eines Insel-Werkzeugs. `hatPopup:true`-
   * Werkzeuge brauchen hier nichts — ihre echte Aktion lebt in der Registry
   * (`island/inhalte/*.tsx`, liest globale Stores direkt). Das einzige
   * `hatPopup:false`-Werkzeug (Manuell) schaltet hier real — IslandShell
   * zeigt danach selbst den Toast.
   */
  const aktivierePublishIslandWerkzeug = (w: IslandWerkzeug): void => {
    if (w.id === 'manuell') setPublishOberflaeche('manuell');
  };

  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [newFormat, setNewFormat] = useState<SheetFormat>('A1');
  const [neuesSetName, setNeuesSetName] = useState('');
  const [placeStoreyId, setPlaceStoreyId] = useState<string | null>(null);
  const [placeScale, setPlaceScale] = useState(100);
  const [selectedPlacement, setSelectedPlacement] = useState<string | null>(null);
  const [selectedBild, setSelectedBild] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [textDrag, setTextDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [bildDrag, setBildDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  // Stream A1: Report-Dossier-Panel — lokaler Ein/Aus-Zustand wie in
  // DesignWorkspace.tsx (kvOffen/bauablaufOffen/…), aber ohne globalen
  // ui-zustand-Store, weil DossierPanel bewusst ein eigenständiges Panel
  // bleibt (nur `onClose`-Prop, kein Doc-/Undo-Zustand).
  const [dossierOffen, setDossierOffen] = useState(false);
  // v0.8.0 P6 (Plankopf-Framework-Editor, docs/V080-PLANKOPF-SPEZ.md §8/§9
  // V-K9): PlankopfPanel öffnet über den Werkzeugleisten-Knopf ODER per Klick
  // auf das Plankopf-Overlay im Blatt-Canvas (`plankopfOffen` triggert
  // beides). Preview-lokale Toggles «Zonen»/«Aussenbemassung» (Spez §8 V-K8,
  // §9 V-I5): NIE ins Doc, NIE in den Export — reiner lokaler UI-Zustand.
  const [plankopfOffen, setPlankopfOffen] = useState(false);
  // v0.8.1 P12 (Auto-Pack-Layout-Editor, docs/V081-SPEZ.md §7(b)/C-26) —
  // AutoPackPanel öffnet über denselben Werkzeugleisten-Knopf-Weg wie
  // `plankopfOffen` (kein Doc-Zustand, reiner lokaler Ein/Aus-Zustand, s.
  // `AutoPackPanel.tsx`-Kopfkommentar «eigenständiges Panel»).
  const [autopackOffen, setAutopackOffen] = useState(false);
  const [zonenVorschau, setZonenVorschau] = useState(false);
  const [aussenbemassungVorschau, setAussenbemassungVorschau] = useState(false);
  const bildDateiRef = useRef<HTMLInputElement>(null);

  // v0.8.1 P7 (docs/V081-SPEZ.md §6.1/§7(e), C-13 «Publish-Preset-Wähler +
  // Erststart-Trigger») — die seit ROADMAP 380 bestehende Preset-Registry
  // (`state/dock-presets.ts`, drei Presets Fokus/Arbeiten/Prüfen je Station)
  // bekam für `design`/`vis` schon in PD2 (v0.8.0) einen UI-Wähler + globalen
  // App-Erststart-Trigger (`state/dock-preset-anwendung.ts`); Publish blieb
  // damals BEWUSST aussen vor (s. dortigen Kommentar «Publish-Erststart-
  // Trigger bleibt bewusst bei design/vis», ROADMAP 380). Jetzt nachgezogen —
  // aber NICHT über `presetAnwenden()`/`wendeErststartPresetFallsNoetigAn()`
  // (beide in `state/dock-preset-anwendung.ts`, deren Konsumenten `App.tsx`/
  // `Einstellungen.tsx` ausserhalb dieses Auftrags-Dateikreises liegen,
  // s. Auftrag: nur `modules/publish/**` + additive `state/`): `dossier`/
  // `plankopf` sind reiner LOKALER `useState` in dieser Komponente (kein
  // globaler Store-Setter, den `presetAnwenden()` ansteuern könnte, s.
  // Kopfkommentar oben) — das WIE (Overrides/aktivesPreset) läuft über die
  // ohnehin stationsgenerische `useDockZustand.getState().presetSetzen()`,
  // das OB (offen/zu) wird hier lokal aus `presetOffenMap('publish', id)`
  // gelesen und auf die beiden lokalen Setter angewendet — dieselben
  // PRIMITIVEN wie `presetAnwenden()`, nur mit dem publish-eigenen
  // OB-Ziel statt eines globalen Store-Zugriffs.
  const aktivesPresetPublish = useDockZustand((s) => s.aktivesPreset['publish']);

  function wendePublishPresetAn(id: PresetId): void {
    useDockZustand.getState().presetSetzen('publish', id);
    const offenMap = presetOffenMap('publish', id);
    const dossierSoll = offenMap.get('dossier');
    if (dossierSoll !== undefined) setDossierOffen(dossierSoll);
    const plankopfSoll = offenMap.get('plankopf');
    if (plankopfSoll !== undefined) setPlankopfOffen(plankopfSoll);
    // v0.8.1 P12: `autopack` ist seit `PUBLISH_PANELS` (dock-stationen.ts)
    // ebenfalls offen-fähig, aber KEIN Preset listet es in `offen` (der
    // Editor ist ein punktuelles Werkzeug, kein Dauerbegleiter irgendeines
    // Presets) — der Wert bleibt darum immer `false`, hier trotzdem
    // ausgelesen/angewendet, damit `presetOffenMap`s Aussage kein toter
    // Wert bleibt (derselbe Massstab wie bei dossier/plankopf oben).
    const autopackSoll = offenMap.get('autopack');
    if (autopackSoll !== undefined) setAutopackOffen(autopackSoll);
  }

  // Erststart-Trigger (Spez C-13: «löst beim ersten Besuch der Publish-
  // Station aus») — bewusst PRO STATION geprüft (`aktivesPreset['publish']`
  // aus derselben `kosmo.dock.v1`-Persistenz wie design/vis), NICHT über den
  // globalen «existiert überhaupt ein kosmo.dock.v1» Bestandsschutz von
  // `wendeErststartPresetFallsNoetigAn()`: ein Bestandsnutzer, der schon
  // lange design/vis-Layouts personalisiert hat, aber noch NIE die
  // Publish-Station besucht hat, soll dort trotzdem den echten Erststart-
  // Komfort bekommen — genau das, was «beim ERSTEN BESUCH DER STATION»
  // wörtlich verlangt, unabhängig vom App-weiten Erststart. Feuert nur
  // einmal: `presetSetzen()` schreibt `aktivesPreset.publish` sofort, jeder
  // weitere Mount dieser Komponente (Stationswechsel hin und zurück) sieht
  // das Feld gesetzt und lässt die Hände weg.
  useEffect(() => {
    if (useDockZustand.getState().aktivesPreset['publish'] === undefined) {
      wendePublishPresetAn('fokus');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // v0.8.0B / W4 (ROADMAP 381, «1400px-Umbruch-Fix») — die Blattbreiten-Formel
  // unten (`k-publish-blatt`, `--k-publish-chrome-h`) deckelt die Blattbreite
  // so, dass die daraus abgeleitete Höhe unter dem Boden-Dock Platz hat. Der
  // frühere Chrome-Term war ein HARTES `132px`-Literal («Kopfleiste +
  // Werkzeugleiste + Innenabstand, gemessen ~111px + Sicherheitsband») — bei
  // vielen sichtbaren Werkzeuggruppen bricht `blattflaeche-werkzeugleiste` ab
  // ~1400px zweizeilig um, ihre reale Höhe wächst über die Schätzung hinaus,
  // und das Blatt liess dafür keinen Platz mehr frei (überlappte den
  // Boden-Dock). Jetzt ECHT gemessen: die viewport-relative Unterkante der
  // Werkzeugleiste (deckt Shell-Header + Werkzeugleiste in EINER Messung ab,
  // ein- wie zweizeilig) + der Scroll-Containers Innenabstand oben (`--k-s6`).
  const [chromeHoehe, setChromeHoehe] = useState(132);
  useLayoutEffect(() => {
    const PADDING_OBEN = 24; // deckt sich mit `--k-s6` (Scroll-Container-Padding)
    const SICHERHEITSBAND = 8;
    let rafHandle = 0;
    const jetztMessen = () => {
      rafHandle = 0;
      const el = document.querySelector('[data-testid="blattflaeche-werkzeugleiste"]');
      if (!el) return;
      const r = el.getBoundingClientRect();
      setChromeHoehe(Math.round(r.bottom + PADDING_OBEN + SICHERHEITSBAND));
    };
    const messenDebounced = () => {
      if (rafHandle) return;
      rafHandle = requestAnimationFrame(jetztMessen);
    };
    const ro = new ResizeObserver(messenDebounced);
    const el0 = document.querySelector('[data-testid="blattflaeche-werkzeugleiste"]');
    if (el0) ro.observe(el0);
    window.addEventListener('resize', messenDebounced);
    jetztMessen();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', messenDebounced);
      if (rafHandle) cancelAnimationFrame(rafHandle);
    };
  }, []);

  const sheet = sheets.find((s) => s.id === activeSheetId) ?? sheets[0] ?? null;
  const paper = sheet ? sheetPaperSize(sheet) : null;

  // PC3 (C-19): Island-Modus-eigene Ableitung — UNABHÄNGIG von `activeSheetId`
  // (das bleibt der exklusive Manuell-Modus-Pfad, s. Kopfkommentar oben).
  const islandSheet = sheets.find((s) => s.id === aktiverSheetIdInsel) ?? sheets[0] ?? null;
  const islandPaper = islandSheet ? sheetPaperSize(islandSheet) : null;
  const islandSvgMarkup = useMemo(
    () => (islandSheet ? sheetToSvg(doc, islandSheet.id, { projectName: doc.settings.projectName }) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision, islandSheet?.id],
  );
  // Spiegelt den ermittelten Fallback (erstes Blatt) in `publish-runtime.ts`
  // — Muster `NodeCanvas.tsx`s `useEffect(() => setAktiverGraphId(graphId),
  // [graphId])`: die DARSTELLUNG-/PROJEKT-Insel-Inhalte (`island/inhalte/
  // *.tsx`) lesen NUR globale Stores (kein Prop-Pfad), sehen ohne diesen
  // Sync-Effekt vor dem ersten BLATT-Insel-Klick einen leeren `null`-Wert.
  useEffect(() => {
    if (islandSheet) setAktiverSheetIdInsel(islandSheet.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [islandSheet?.id, setAktiverSheetIdInsel]);

  // v0.8.0 P11 (Owner-Pflichtauftrag 15.07., «Publish in die Dock-Registry»)
  // — Dossier/Plankopf als `DockPanelEintrag[]` für `DockFlaeche`, analog
  // `DesignWorkspace.tsx`s `designDockPanels`. Beide bleiben Daten-/UI-
  // Zustand-Guards ohne `…Offen`-Flag in `ui-zustand.ts` (s. `dock-
  // stationen.ts`s `PUBLISH_PANELS`-Kopfkommentar) — `schliessen` bleibt
  // identisch mit dem `onClose`, den beide Panel-Inhalte schon hatten
  // (Doppel-Chrome-Kompromiss, `DockPanel.tsx`). `plankopf` braucht
  // zusätzlich ein aktives Blatt (`sheet`) — ohne Blatt bleibt es unsichtbar
  // (`sichtbar: plankopfOffen && !!sheet`, wie der bisherige `plankopfOffen
  // && sheet`-Guard); der `sheetId`-Fallback `''` wird dabei nie sichtbar
  // gerendert, weil `DockFlaeche` ein unsichtbares Panel gar nicht in
  // `ergebnis.rects` aufnimmt.
  // v0.8.0B / W4 (Spez §4/§2 Gesetz 9, B-58) — «Publish ist der ERSTE
  // Verbraucher» des additiven `oeffnen`-Felds (`DockFlaeche.tsx`s
  // `DockPanelEintrag`): reicht denselben Öffnen-Setter durch, den der
  // Werkzeugleisten-Knopf schon ruft (`setDossierOffen(true)`/
  // `setPlankopfOffen(true)`), NUR solange die Aktion auch wirklich etwas
  // öffnet (dieselben Guards wie die Knöpfe oben: Dossier braucht mind. ein
  // Geschoss, Plankopf ein aktives Blatt) — ein Chip, dessen Klick am
  // eigenen Sichtbarkeits-Guard verpufft, wäre ein toter Knopf. Ergebnis:
  // geschlossene Panels erscheinen als «+ PROJEKT-DOSSIER»/«+ PLANKOPF»-Chips
  // in der Dock-Closed-Leiste.
  const publishDockPanels: DockPanelEintrag[] = useMemo(
    () => [
      {
        id: 'dossier',
        sichtbar: dossierOffen,
        schliessen: () => setDossierOffen(false),
        ...(storeys.length > 0 ? { oeffnen: () => setDossierOffen(true) } : {}),
        inhalt: <DossierPanel onClose={() => setDossierOffen(false)} />,
      },
      {
        id: 'plankopf',
        sichtbar: plankopfOffen && !!sheet,
        schliessen: () => setPlankopfOffen(false),
        ...(sheet ? { oeffnen: () => setPlankopfOffen(true) } : {}),
        inhalt: (
          <PlankopfPanel
            sheetId={sheet?.id ?? ''}
            selectedPlacementId={selectedPlacement}
            onClose={() => setPlankopfOffen(false)}
          />
        ),
      },
      // v0.8.1 P12 (Auto-Pack-Layout-Editor, docs/V081-SPEZ.md §7(b)/C-26):
      // dasselbe Guard-Muster wie `plankopf` — braucht ein aktives Blatt,
      // sonst gibt es keine `Sheet`-Fläche zum Befüllen. BEWUSST OHNE
      // `oeffnen`: mit drei gleichzeitig schliessbaren Panels (dossier +
      // plankopf + autopack) legt `DockFlaeche.tsx`s Closed-Chip-Leiste
      // (`shell/dock/`, ausserhalb dieses Dateikreises) die Chips in einer
      // zweiten Zeile ab, die dann den Dock-Kopf-«Schliessen»-Knopf eines
      // gedockten Panels überdeckt (gefundene Regression in
      // `plankopf.spec.ts`s Dock-Closed-Chips-Test, reproduziert mit einem
      // dritten offen-fähigen Panel). `oeffnen` ist laut `DockPanelEintrag`-
      // Kopfkommentar (`DockFlaeche.tsx`) additiv/optional — ohne dieses Feld
      // bleibt der Werkzeugleisten-Knopf `publish-autopack` der EINZIGE
      // Öffnen-Weg (kein Closed-Chip für `autopack`), alle bestehenden
      // Closed-Chip-Spezifikationen bleiben dadurch unangetastet.
      {
        id: 'autopack',
        sichtbar: autopackOffen && !!sheet,
        schliessen: () => setAutopackOffen(false),
        inhalt: <AutoPackPanel sheetId={sheet?.id ?? ''} onClose={() => setAutopackOffen(false)} />,
      },
    ],
    [dossierOffen, plankopfOffen, autopackOffen, sheet, selectedPlacement, storeys.length],
  );

  const svgMarkup = useMemo(
    () =>
      sheet
        ? sheetToSvg(doc, sheet.id, { projectName: doc.settings.projectName })
        : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision, sheet?.id],
  );

  function addSheet() {
    const res = runCommand('publish.blattErstellen', {
      name: `Blatt ${sheets.length + 1}`,
      format: newFormat,
      orientation: 'quer',
    });
    setActiveSheetId((res.patches[0] as { id: string }).id);
  }

  /**
   * T4a-Bug2: «Set speichern» tat bislang scheinbar nichts — kein Feedback bei
   * Erfolg, kein Feedback beim stillen No-op (leerer Name/kein Blatt), kein
   * try/catch um den Command. Jetzt: klare Meldung in JEDEM Fall, Set landet
   * über `publish.setSpeichern` im Doc (dort, wo die Liste unten liest) und
   * taucht sofort in der Sets-Liste auf (Undo/Sync/.kosmo inklusive).
   */
  function setSpeichern() {
    const name = neuesSetName.trim();
    if (!name) {
      melde('Erst einen Set-Namen eingeben.', { ton: 'fehler' });
      return;
    }
    if (sheets.length === 0) {
      melde('Kein Blatt im Plansatz — erst «+ Blatt» oder ein Plakat anlegen.', { ton: 'fehler' });
      return;
    }
    try {
      runCommand('publish.setSpeichern', {
        name,
        sheetIds: sheets.map((s) => s.id),
      });
      setNeuesSetName('');
      melde(`Set «${name}» gespeichert (${sheets.length} ${sheets.length === 1 ? 'Blatt' : 'Blätter'})`, { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    }
  }

  function placeGrundriss() {
    if (!sheet || !paper) return;
    const storeyId = placeStoreyId ?? storeys[0]?.id;
    if (!storeyId) return;
    runCommand('publish.ansichtPlatzieren', {
      sheetId: sheet.id,
      view: 'grundriss',
      storeyId,
      scale: placeScale,
      x: paper.width / 2,
      // v0.8.0 P7: «−30» war eine grobe Schätzung an den alten kompakten
      // Fusskopf angelehnt — jetzt aus der EINZIGEN Quelle
      // `plankopfReserveMm()` (Spez §5.1), konsistent mit dem seit P7
      // default-aktiven, deutlich höheren 180×55-Plankopf.
      y: (paper.height - plankopfReserveMm().hoehe) / 2,
    });
  }

  function placeAxo() {
    if (!sheet || !paper) return;
    runCommand('publish.ansichtPlatzieren', {
      sheetId: sheet.id,
      view: 'axo',
      scale: placeScale * 2, // Axo grosszügiger skalieren (halb so gross wie 1:scale)
      x: paper.width / 2,
      y: (paper.height - plankopfReserveMm().hoehe) / 2,
    });
  }

  /** Schnitt-/Ansichtslinie aus der Modell-Bbox (Blick = linke Normale a→b). */
  /** Schnitt durch die Mitte oder Ansicht von aussen (N/O/S/W). */
  function placeSchnitt(richtung: 'schnitt' | 'nord' | 'ost' | 'sued' | 'west') {
    if (!sheet || !paper) return;
    const l = schnittLinieAktion(doc, richtung);
    if (!l) return;
    runCommand('publish.ansichtPlatzieren', {
      sheetId: sheet.id,
      view: 'schnitt',
      a: l.a,
      b: l.b,
      scale: placeScale,
      x: paper.width / 2,
      y: (paper.height - plankopfReserveMm().hoehe) / 2,
      title: l.titel,
    });
  }

  /** Leerer Bild-Slot in Blattmitte — Platzhalter, bis Renders (KosmoVis) da sind. */
  function placeBildSlot() {
    if (!sheet || !paper) return;
    const w = Math.min(120, paper.width * 0.35);
    runCommand('publish.bildPlatzieren', {
      sheetId: sheet.id,
      x: Math.round(paper.width / 2 - w / 2),
      y: Math.round((paper.height - plankopfReserveMm().hoehe) / 2 - w / 3),
      w: Math.round(w),
    });
  }

  /**
   * «Blatt füllen» (Owner-Befund K10): schlägt die Kosmo-Ableitung vor, was
   * noch fehlt (Grundrisse, im Modell bereits definierte Schnitte, Axo,
   * Kennzahlen, Renderbild/Platzhalter), und platziert es — EIN atomarer
   * Undo-Schritt (publish.blattFuellen liefert genau EINEN Patch). Die
   * Meldung nennt ehrlich, was platziert wurde UND was das Modell (noch)
   * nicht hergibt, statt es stillschweigend zu verschweigen.
   */
  function blattFuellen() {
    if (!sheet) return;
    try {
      const res = runCommand('publish.blattFuellen', { sheetId: sheet.id });
      const hatHinweise = res.summary.includes('Fehlt im Modell');
      melde(res.summary, { ton: hatHinweise ? 'info' : 'erfolg', dauerMs: hatHinweise ? 9000 : 4000 });
      // v0.8.2/P3 (§4.5 C-30): auch der einfache Weg ohne Editor ist ein
      // Layout-Signal — hier ist der angewendete Endzustand per Definition
      // der Heuristik-Default (keine Umordnung möglich).
      proposalLog.protokolliereLayout({
        sheetId: sheet.id,
        vorschlag: LAYOUT_VORSCHLAG_DEFAULT,
        endzustand: LAYOUT_VORSCHLAG_DEFAULT,
        optionen: LAYOUT_VORSCHLAG_DEFAULT,
      });
    } catch (err) {
      meldeFehler(err);
    }
  }

  /**
   * Einzelblatt-PDF (v0.8.1 P7, `docs/V081-SPEZ.md` §6.1/§7(e), C-25 —
   * ROADMAP-378-Kandidat «Bündel-PDF bewusst ohne Einzel-Plancode»): EIN
   * Blatt als EIN-Seiten-Vektor-PDF, Dateiname trägt seinen eigenen Plancode
   * (`export-sheets.ts`s `exportSheetPdf()`/`pdfBlattDateiname()`). Anders
   * als «Plansatz PDF» (`export-set`, tone="accent" — die EINE Signal-Fläche
   * der Station, Gesetz 1) bleibt dieser Knopf `quiet`: eine Werkzeug-Aktion
   * INNERHALB des Editierens für genau das aktive Blatt, kein Stations-
   * Abschluss.
   */
  function exportBlattPdf() {
    if (!sheet) return;
    void exportSheetPdf(sheet.id).catch((err) => meldeFehler(err));
  }

  /** Datei-Picker: gewähltes Bild in den ausgewählten Slot einbetten. */
  function bildDateiGewaehlt(file: File | undefined) {
    if (!file || !sheet || !selectedBild) return;
    const reader = new FileReader();
    reader.onload = () => {
      runCommand('publish.bildFuellen', { sheetId: sheet.id, bildId: selectedBild, dataUrl: String(reader.result) });
    };
    reader.readAsDataURL(file);
  }

  /**
   * Baugesuch-Blattsatz (v0.6.3 VP2, Owner-Hauptaufgabe K22): stellt den
   * kuratierten Blattsatz fürs CH-Baugesuch zusammen — Situation, Grundriss
   * je Geschoss, die bereits definierten Schnitte und ein
   * Ausnützungsnachweis-Blatt — und bündelt sie als Publikations-Set
   * «Baugesuch». EIN atomarer Undo-Schritt (publish.baugesuchErstellen
   * liefert alle Patches in einem Command). Die Meldung nennt ehrlich, was
   * erstellt wurde UND was das Modell (noch) nicht hergibt (keine Parzelle,
   * kein Schnitt) — die Einreichung bei der Behörde bleibt real, dies ist
   * nur die Zusammenstellung der Unterlagen.
   */
  function baugesuchErstellen() {
    try {
      const res = runCommand('publish.baugesuchErstellen', {});
      const hatLuecken = res.summary.includes('Fehlt/Lücke');
      melde(res.summary, { ton: hatLuecken ? 'info' : 'erfolg', dauerMs: hatLuecken ? 10000 : 4500 });
    } catch (err) {
      meldeFehler(err);
    }
  }

  /**
   * Toolkit 5: A0-Wettbewerbsplakat mit vorplatzierten Slots — EIN
   * Undo-Schritt. v0.8.0 P7 (Spez §5.1/§5.2, «dokumentierte Ausnahme, kein
   * Migrations-Lücke»): Plakat-Blätter erhalten den Heftrand NICHT (Poster-
   * Konvention randlos/vollflächig) — ehrlich als explizites `layout:
   * { heftrand: false }` BEIM Erstellen gesetzt, nicht als Namens-Heuristik
   * im Kernel (`derive/sheet.ts` kennt «Plakat» nicht und soll es auch
   * nicht kennen müssen).
   */
  function erzeugePlakat(layout: 'klassisch' | 'spalte') {
    const { history } = useProject.getState();
    const name = doc.settings.projectName;
    history.beginGroup();
    try {
      const res = runCommand('publish.blattErstellen', {
        name: `Plakat ${sheets.filter((s) => s.name.startsWith('Plakat')).length + 1}`,
        format: 'A0',
        orientation: 'hoch',
        layout: { heftrand: false },
      });
      const sheetId = (res.patches[0] as { id: string }).id;
      // A0 hoch: 841 × 1189 mm
      const titelX = layout === 'spalte' ? 60 : 60;
      runCommand('publish.textSetzen', {
        sheetId, x: titelX, y: 90, size: 34, titel: true,
        text: name.toUpperCase(),
      });
      runCommand('publish.textSetzen', {
        sheetId, x: titelX, y: 112, size: 8,
        text: 'Projektwettbewerb · Beitrag «…»',
      });
      runCommand('publish.textSetzen', {
        sheetId, x: titelX, y: layout === 'spalte' ? 200 : 1000, size: 5,
        text: 'Konzept\nStädtebau, Setzung und Adresse — hier den\nProjekttext einsetzen (Klick links im Text-Feld).',
      });
      const slots =
        layout === 'klassisch'
          ? { axo: { x: 590, y: 320 }, plan: { x: 260, y: 560 }, ansicht: { x: 260, y: 900 }, schnitt: { x: 590, y: 900 } }
          : { axo: { x: 560, y: 300 }, plan: { x: 560, y: 640 }, ansicht: { x: 560, y: 940 }, schnitt: { x: 260, y: 940 } };
      runCommand('publish.ansichtPlatzieren', { sheetId, view: 'axo', scale: 400, x: slots.axo.x, y: slots.axo.y });
      const storeyId = placeStoreyId ?? storeys[0]?.id;
      if (storeyId) {
        runCommand('publish.ansichtPlatzieren', { sheetId, view: 'grundriss', storeyId, scale: 200, x: slots.plan.x, y: slots.plan.y });
      }
      const sued = schnittLinieAktion(doc, 'sued');
      if (sued) {
        runCommand('publish.ansichtPlatzieren', { sheetId, view: 'schnitt', a: sued.a, b: sued.b, scale: 200, x: slots.ansicht.x, y: slots.ansicht.y, title: sued.titel });
      }
      const schnitt = schnittLinieAktion(doc, 'schnitt');
      if (schnitt) {
        runCommand('publish.ansichtPlatzieren', { sheetId, view: 'schnitt', a: schnitt.a, b: schnitt.b, scale: 200, x: slots.schnitt.x, y: slots.schnitt.y, title: schnitt.titel });
      }
      // Render-Slot: leer platziert, gefüllt sobald KosmoVis liefert («Aufs Blatt»)
      const bildSlot = layout === 'klassisch' ? { x: 90, y: 160, w: 380 } : { x: 60, y: 300, w: 380 };
      runCommand('publish.bildPlatzieren', { sheetId, ...bildSlot, title: 'Visualisierung' });
      setActiveSheetId(sheetId);
    } finally {
      history.endGroup();
    }
  }

  function exportSvg() {
    if (!sheet) return;
    const url = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.settings.projectName.replace(/\s+/g, '-')}-${sheet.name.replace(/\s+/g, '-')}.svg`;
    document.body.appendChild(a);
  a.click();
  a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  function exportDxfFile() {
    const storeyId = placeStoreyId ?? storeys[0]?.id;
    if (!storeyId) return;
    const storey = doc.get<Storey>(storeyId);
    // v0.7.1 3A: EIN DXF-Exporter im Kernel (vorher zwei) — bewusster
    // Verhaltenswechsel fürs Publish-DXF: jetzt y-gespiegelt (Norden oben,
    // konsistent mit dem Design-Modul-Export/-Import) und mit semantischen
    // Layern statt der alten KOSMO-*-Layer (docs/INTEROP.md).
    const dxf = planToDxf(doc, storeyId);
    const url = URL.createObjectURL(new Blob([dxf], { type: 'application/dxf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.settings.projectName.replace(/\s+/g, '-')}-${storey?.name ?? 'Grundriss'}.dxf`;
    document.body.appendChild(a);
  a.click();
  a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  // -----------------------------------------------------------------------
  // PC3 (`docs/V084-SPEZ.md` §5 W3, C-19) — Island-Modus, EIGENER früher
  // Return VOR der Manuell-Rückgabe unten: die alte Sidebar/Werkzeugleiste/
  // `DockFlaeche` (Owner-Auftrag «weiterentwickeln; Islands») rendert NUR
  // noch im Modus 'manuell' — wird dieser frühe Return nie erreicht (jeder
  // Bestands-E2E-Lauf startet über `manuell-seed.ts` mit
  // `publishOberflaeche:'manuell'`), bleibt JEDE Zeile unterhalb byte-gleich
  // zum Vorzustand (Bestandsschutz, Auftrag Punkt 4). Die Blattfläche selbst
  // (`BlattCanvas`, via `BlattZoomBuehne`) ist dieselbe Komponente wie im
  // Manuell-Modus — «Islands sind Zugänge, keine Nachbauten».
  if (publishOberflaeche === 'island') {
    return (
      <div className="publish-workspace-fuellen" data-testid="publish-island-fuellen">
        <div className="publish-workspace-buehne">
          {islandSheet && islandPaper ? (
            <BlattZoomBuehne key={islandSheet.id} sheet={islandSheet} paper={islandPaper} svgMarkup={islandSvgMarkup} />
          ) : (
            <div className="publish-workspace-buehne-zentriert">
              <Messrahmen
                height={200}
                caption=""
                style={{ width: '100%' }}
              />
              <div className="k-publish-leerzustand-text">
                Noch kein Blatt im Plansatz — die BLATT-Insel (links) legt eines an
              </div>
            </div>
          )}
        </div>
        <IslandBuehne inseln={PUBLISH_INSELN} registry={publishInhaltsRegistry} onWerkzeugAktion={aktivierePublishIslandWerkzeug} />
        <KosmoOrb />
      </div>
    );
  }

  return (
    <div className="k-publish">
      {/* Blattliste */}
      <div className="k-publish-sidebar">
        {/* v0.7.7 Stream C1: Kosmos-Kopf — reine Kopf-/Rahmen-Optik (Glass +
            Modul-Tönung, analog dem additiven Kosmos-Token-Fundament aus
            v0.7.6), Inhalt/Testids/Logik der Werkzeugleiste unverändert. */}
        <div
          className="k-glass k-publish-kopf"
          data-testid="publish-werkzeugleiste"
          style={{ ['--_hue' as string]: moduleHue.publish }}
        >
          <Badge hue={moduleHue.publish}>Plansatz</Badge>
          <div className="k-publish-spacer" />
          {/* Stream A1: Report-Dossier (DossierPanel.tsx) war bislang ein
              eigenständiges, aber ungehängtes Panel — hier der Zugang dazu,
              in derselben Werkzeugleiste wie der Einstellungen-Knopf. Guard:
              «Projekt geladen» heisst im Publish-Modul konkret «mind. ein
              Geschoss existiert» (Zeile ~37/129, `bootstrapProject()` legt
              das beim Öffnen der Station immer an) — dasselbe Kriterium, das
              auch `placeGrundriss`/`placeAxo` u.a. voraussetzen. Anders als
              «Baugesuch» (keine Sperre, meldet Lücken im Ergebnistext) ist
              das Dossier hier vorsorglich gesperrt, weil es KEIN Command mit
              Lücken-Meldung ist, sondern eine reine Editor-/Export-Vorschau
              — ein leeres Panel ohne jedes Geschoss wäre ein «leeres Blatt
              vortäuschen».
              v0.8.0B / W4 (Spez §2 Gesetz 1+2, Entrümpeln): Dossier/Plankopf
              waren hier «Icon + Text» in einer 220px-Spalte neben Badge +
              Gear — die Zeile lief real breiter als die Spalte (gemessen
              317px Inhalt vs. 201px verfügbar) und liess Chromium beim
              Fokussieren eines Knopfs die Spalte horizontal ansteuern
              («PLANSATZ» links abgeschnitten, Screenshot-Beweis). Jetzt
              icon-only (Titel/aria-label bleiben die vollständige
              Beschriftung) — passt in die Spalte, kein Layout-Bug mehr, und
              entspricht Gesetz 2 (Sekundär-Werkzeuge treten zurück). */}
          <KButton
            size="sm"
            tone={dossierOffen ? 'accent' : 'ghost'}
            data-testid="publish-dossier"
            title="Projekt-Dossier — Report-Blatt mit Kennzahlen, Übersicht und optionaler Governance-Freigabe (SVG-/PDF-Export)"
            aria-label="Projekt-Dossier öffnen"
            disabled={storeys.length === 0}
            onClick={() => setDossierOffen((v) => !v)}
          >
            <KIcon name="dokument" size={14} title="Projekt-Dossier" />
          </KButton>
          {/* v0.8.0 P6: Plankopf-Editor — dasselbe «Projekt geladen»-Kriterium
              wie Dossier (mind. ein Geschoss), zusätzlich braucht es ein
              aktives Blatt (sonst gibt es kein `Sheet.plankopf` zum Setzen). */}
          <KButton
            size="sm"
            tone={plankopfOffen ? 'accent' : 'ghost'}
            data-testid="publish-plankopf"
            title="Plankopf — Feldeditor, Büro-Stammdaten, Layout-Schalter, Massstab-Chips und Phasen-Detailkarte"
            aria-label="Plankopf öffnen"
            disabled={!sheet}
            onClick={() => setPlankopfOffen((v) => !v)}
          >
            <KIcon name="stift" size={14} title="Plankopf" />
          </KButton>
          {/* v0.8.1 P12 (Auto-Pack-Layout-Editor, docs/V081-SPEZ.md §7(b)/
              C-26): dasselbe «Projekt geladen» + «aktives Blatt»-Kriterium
              wie Plankopf — der Editor braucht ein Blatt, um dessen freie
              Fläche zu berechnen/vorzuschauen. */}
          <KButton
            size="sm"
            tone={autopackOffen ? 'accent' : 'ghost'}
            data-testid="publish-autopack"
            title="Auto-Pack-Editor — Reihenfolge/Abstände von «Blatt füllen» einstellen, mit echter Vorschau"
            aria-label="Auto-Pack-Editor öffnen"
            disabled={!sheet}
            onClick={() => setAutopackOffen((v) => !v)}
          >
            <KIcon name="ebenen" size={14} title="Auto-Pack-Editor" />
          </KButton>
          {onEinstellungen && (
            <KButton
              size="sm"
              tone="ghost"
              data-testid="station-einstellungen-publish"
              title="Einstellungen — KosmoPublish"
              aria-label="Einstellungen — KosmoPublish"
              onClick={onEinstellungen}
            >
              <KIcon name="zahnrad" size={14} title="Einstellungen — KosmoPublish" />
            </KButton>
          )}
          {/* PC3 (`docs/V084-SPEZ.md` §5 W3, C-19) — additiver Rückweg AUS
              'manuell': Muster `VisWorkspace.tsx`s `island-zurueck`-Knopf
              (PC1, das seinerseits `DesignWorkspace.tsx` Z.2441-2456
              spiegelt) — der Vorwärtsweg ('manuell' → 'island') ist das
              'Manuell'-Insel-Werkzeug in AUSTAUSCH (nur im Island-Modus
              sichtbar); dieser Knopf ist sein Gegenstück, unaufdringlich in
              derselben Werkzeugleisten-Region. Additiv, kein Ersatz — die
              klassische Sidebar/Werkzeugleiste bleibt vollständig erhalten. */}
          <KButton
            size="sm"
            tone="ghost"
            data-testid="island-zurueck"
            title="Zurück zur Island-UI"
            aria-label="Zurück zur Island-UI"
            onClick={() => setPublishOberflaeche('island')}
          >
            Island-UI
          </KButton>
        </div>
        {sheets.map((s) => (
          <Panel
            key={s.id}
            /* v0.7.8 Welle D PD3, v0.8.0B / W4 (Spez §3 B-126): KCard-
               Anatomie (2px-Rollenakzent LINKS via `::before` statt
               Rahmenbox) — ausgewählt hebt den Akzent auf die volle
               Akzentfarbe + `--k-hover`-Grund, sonst dezente Modul-Hue-Note
               (40%, Klassen `k-publish-sheet-karte(--aktiv)` in `publish.css`). */
            className={`k-publish-sheet-karte${sheet?.id === s.id ? ' k-publish-sheet-karte--aktiv' : ''}`}
            data-testid={`sheet-${s.index}`}
            onClick={() => setActiveSheetId(s.id)}
            style={{ ['--_hue' as string]: moduleHue.publish }}
          >
            <div className="k-publish-sheet-kopf">
              <div className="k-publish-sheet-name">{s.name}</div>
              <button
                aria-label="Blatt entfernen"
                data-testid={`blatt-entfernen-${s.index}`}
                onClick={(ev) => {
                  ev.stopPropagation();
                  runCommand('publish.blattEntfernen', { sheetId: s.id });
                  if (activeSheetId === s.id) setActiveSheetId(null);
                }}
                className="k-publish-icon-knopf"
              >
                <KIcon name="schliessen" size={14} title="Blatt entfernen" />
              </button>
            </div>
            <div className="k-publish-sheet-meta">
              {s.format} {s.orientation} · {s.placements.length} Ansichten
              {(s.bilder?.length ?? 0) > 0 ? ` · ${s.bilder!.length} ${s.bilder!.length === 1 ? 'Bild' : 'Bilder'}` : ''}
            </div>
          </Panel>
        ))}
        <div className="k-publish-add-zeile">
          <KSelect
            size="sm"
            data-testid="new-sheet-format"
            value={newFormat}
            onChange={(e) => setNewFormat(e.target.value as SheetFormat)}
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </KSelect>
          <KButton size="sm" tone="quiet" onClick={addSheet} data-testid="add-sheet">
            <KIcon name="plus" size={14} /> Blatt
          </KButton>
        </div>
        <Hairline />
        <div className="k-publish-abschnitt">
          <span className="k-publish-abschnitt-label">
            Baugesuch (SIA 33)
          </span>
          {/* R1-Fix (Kritik-065 p-09/i-09, «Füllflächen-Inkonsistenz»):
              «Baugesuch», «Plansatz PDF» (unten) und «Blatt füllen»
              (Werkzeugleiste) waren alle drei `tone="accent"` — drei
              gleich laut schreiende schwarze Flächen ohne erkennbare
              Rangfolge. §2-Muster: EIN Primär-Knopf pro Bereich darf
              Akzent-Füllung tragen — «Plansatz PDF» bleibt das (der
              Abschluss der ganzen Seite), «Blatt füllen» bleibt es in
              seiner eigenen Werkzeuggruppe. «Baugesuch» ist eine
              Kurzstart-Aktion wie «Klassisch»/«Spalte» (A0-Plakat, beide
              `tone="quiet"`) — bekommt dieselbe Kontur-Optik, plus einen
              Akzent-Eckpunkt (KdKarte-Muster, `DataWorkspace.tsx`
              `.k-orbit-mitte`-Nachbar) statt Füllung: aktiv/besonders
              ≠ gefüllt. */}
          {/* Kritik-Runde 2: als Grid-Kind wurde der Span auf volle Spalten-
              breite gestreckt — der absolute Akzent-Eckpunkt sass dadurch frei
              schwebend am rechten Panelrand statt an der Knopfecke.
              `k-publish-eck-wrap` (justifySelf:start) begrenzt den Span auf
              die Knopfbreite. */}
          <span className="k-publish-eck-wrap">
            <KButton
              size="sm"
              tone="quiet"
              className="k-publish-baugesuch-knopf"
              onClick={baugesuchErstellen}
              data-testid="baugesuch-erstellen"
              title="Stellt Situation, Grundriss je Geschoss, die definierten Schnitte und ein Ausnützungsnachweis-Blatt zusammen und bündelt sie als Publikations-Set «Baugesuch» — EIN Undo-Schritt. Zusammenstellung für die Eingabe, keine Bewilligung."
            >
              Baugesuch
            </KButton>
            <span aria-hidden className="k-publish-eck-punkt" />
          </span>
        </div>
        <Hairline />
        <div className="k-publish-abschnitt">
          <span className="k-publish-abschnitt-label">
            A0-Plakat (Toolkit 5)
          </span>
          <div className="k-publish-reihe">
            <KButton size="sm" tone="quiet" onClick={() => erzeugePlakat('klassisch')} data-testid="plakat-klassisch">
              Klassisch
            </KButton>
            <KButton size="sm" tone="quiet" onClick={() => erzeugePlakat('spalte')} data-testid="plakat-spalte">
              Spalte
            </KButton>
          </div>
        </div>
        {sheet && (sheet.texte?.length ?? 0) > 0 && (
          <div className="k-publish-abschnitt" data-testid="text-editor">
            <span className="k-publish-abschnitt-label">Texte</span>
            {sheet.texte!.map((t) => (
              <textarea
                key={t.id}
                defaultValue={t.text}
                rows={Math.min(t.text.split('\n').length + 1, 5)}
                data-testid={`text-${t.id}`}
                onBlur={(e) => {
                  if (e.target.value !== t.text) {
                    runCommand('publish.textSetzen', { sheetId: sheet.id, textId: t.id, text: e.target.value });
                  }
                }}
                className={`k-publish-textarea${t.titel ? ' k-publish-textarea--titel' : ''}`}
              />
            ))}
          </div>
        )}
        <Hairline />
        {/* v0.8.0 P8 (Spez §8/§9 P-K8, «Export-Hub ehrlich»): der Prototyp
            zeigte eine 27-Formate-Karte in 6 Kategorien — bewusst NICHT
            nachgebaut (Vertagungsliste, Abschnitt 8: «DWG/Blatt-IFC/
            glTF-aus-Publish existieren nicht — werden nicht vorgetäuscht»).
            Kosmos Export-Hub ist stattdessen genau diese Sets-Sektion + die
            «Plansatz PDF»/«Blatt SVG»/«Grundriss DXF»-Gruppe weiter unten:
            REALE Formate, die alle tatsächlich exportieren (PDF via
            svg2pdf, SVG als Vektor-Markup, DXF je Geschoss aus
            `planToDxf()` — ein DESIGN-Ansicht-Export, kein Blatt-Export,
            s. Spez). IFC-Export existiert (`export-ifc`, KosmoDesign-
            Station) — ebenfalls kein Blatt-Format, darum bewusst nicht
            hier dupliziert. Keine zusätzliche «vertagt»-Hinweiszeile hier:
            ohne einen konkreten, in DIESEM Screen umsetzbaren
            Owner-Nutzen wäre sie nur ein toter Hinweis auf einen toten
            Button (Spez-Prinzip «keine toten Buttons»). */}
        <div className="k-publish-abschnitt" data-testid="pubsets">
          <span className="k-publish-abschnitt-label">
            Publikations-Sets
          </span>
          {(doc.settings.publikationsSets ?? []).map((set) => (
            <div
              key={set.name}
              /* v0.7.8 Welle D PD3, v0.8.0B / W4 (Spez §3 B-126): dieselbe
                 KCard-Anatomie wie die Blattliste-Karten (2px-Hue-Akzent
                 LINKS, 40% — zurückhaltender als der Stationskopf) — reine
                 Kartenoptik, Inhalt/Testid/Logik unverändert. */
              className="k-publish-pubset-karte"
              data-testid="pubset-karte"
              style={{ ['--_hue' as string]: moduleHue.publish }}
            >
              <span className="k-publish-pubset-name">
                {set.name}{' '}
                <span className="k-publish-pubset-meta">
                  · {set.sheetIds.length} Blätter
                </span>
              </span>
              <KButton size="sm" tone="quiet" data-testid="pubset-pdf" onClick={() => void exportSheetSetPdf(set)}>
                PDF
              </KButton>
              <KButton size="sm" tone="ghost" data-testid="pubset-svg" onClick={() => exportSetSvgs(set)}>
                SVGs
              </KButton>
              <KButton
                size="sm"
                tone="ghost"
                data-testid="pubset-transmittal"
                title="Transmittal-Liste (Begleitliste zum Planversand): Blatt, Format, Massstab, Revision"
                aria-label="Transmittal-Liste exportieren"
                onClick={() => {
                  const csv = transmittalCsv(useProject.getState().doc, set);
                  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${set.name.replace(/\s+/g, '-')}-Transmittal.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <KIcon name="export" size={14} title="Transmittal-Liste exportieren" />
              </KButton>
              <button
                aria-label={`Set ${set.name} entfernen`}
                onClick={() => runCommand('publish.setEntfernen', { name: set.name })}
                className="k-publish-icon-knopf"
              >
                <KIcon name="schliessen" size={14} title="Set entfernen" />
              </button>
            </div>
          ))}
          <div className="k-publish-pubset-neu">
            <KInput
              size="sm"
              value={neuesSetName}
              onChange={(e) => setNeuesSetName(e.target.value)}
              /* R1-Fix (Kritik-065 p-09/i-09, «Set-Name-Placeholder hart
                 abgeschnitten»): die schmale Sidebar liess vom Beispiel nur
                 «Set-Name (z.B.» stehen — gekürzt statt der Sidebar-Breite
                 (die auch andere Bereiche trägt) hinterherzujagen. */
              placeholder="Set-Name…"
              title="Set-Name, z.B. «Wettbewerb»"
              data-testid="pubset-name"
              className="k-publish-pubset-input"
            />
            <KButton
              size="sm"
              tone="quiet"
              data-testid="pubset-speichern"
              title="Speichert die aktuellen Blätter in Reihenfolge als benanntes Set — Dateinamen nach «P-{nr}_{blatt}_{massstab}»"
              onClick={setSpeichern}
            >
              Set speichern
            </KButton>
          </div>
        </div>
        <div className="k-publish-spacer" />
        {/* R1-Fix (Kritik-065 p-09/i-09, «Blatt SVG»/«Grundriss DXF» als
            nackte Textlinks): beide waren `tone="ghost"` OHNE sichtbaren
            Rand — neben dem gefüllten «Plansatz PDF» wirkten sie wie reine
            Textlinks statt wie gleichrangige Export-Aktionen. v0.8.0B / W4
            (Spez §2 Gesetz 8): die frühere Rahmenbox weicht einer Hairline
            oben (`k-publish-export-gruppe`) — Trennung durch Linie statt
            Kasten; bleiben `tone="ghost"` (Kontur statt Füllung, §2-Muster:
            nur «Plansatz PDF» akzentuiert — die EINE gefüllte Signal-Fläche
            der ganzen Station, Gesetz 1). */}
        <div className="k-publish-export-gruppe">
          <KButton size="sm" tone="accent" onClick={() => void exportSheetSetPdf()} data-testid="export-set">
            <KIcon name="export" size={14} /> Plansatz PDF
          </KButton>
          <KButton
            size="sm"
            tone="ghost"
            className="k-publish-export-ghost-rand"
            onClick={exportSvg}
            data-testid="export-blatt-svg"
          >
            <KIcon name="export" size={14} /> Blatt SVG
          </KButton>
          <KButton
            size="sm"
            tone="ghost"
            className="k-publish-export-ghost-rand"
            onClick={exportDxfFile}
            data-testid="export-dxf"
          >
            <KIcon name="export" size={14} /> Grundriss DXF
          </KButton>
        </div>
      </div>

      {/* Blattfläche */}
      <div className="k-publish-canvas">
        {/* v0.7.8 Welle D PD3: Glass + dezente Publish-Hue-Note (40%, als
            Unterkante statt Oberkante — die Leiste sitzt ÜBER dem Blatt,
            keine Logik/Testid-Änderung). */}
        <KToolbar
          data-testid="blattflaeche-werkzeugleiste"
          dicht
          className="k-glass k-publish-canvas-toolbar"
          style={{ ['--_hue' as string]: moduleHue.publish }}
        >
          <KToolGruppe label="Platzieren">
            <KSelect
              size="sm"
              value={placeStoreyId ?? storeys[0]?.id ?? ''}
              onChange={(e) => setPlaceStoreyId(e.target.value)}
              data-testid="place-storey"
            >
              {storeys.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </KSelect>
            <KSelect
              size="sm"
              value={placeScale}
              onChange={(e) => setPlaceScale(Number(e.target.value))}
            >
              {SCALES.map((s) => (
                <option key={s} value={s}>1:{s}</option>
              ))}
            </KSelect>
            <KButton size="sm" tone="quiet" onClick={placeGrundriss} data-testid="place-plan" disabled={!sheet}>
              Grundriss
            </KButton>
            <KButton size="sm" tone="quiet" onClick={placeAxo} data-testid="place-axo" disabled={!sheet}>
              Axo
            </KButton>
            <KButton size="sm" tone="quiet" onClick={() => placeSchnitt('schnitt')} data-testid="place-section" disabled={!sheet}>
              Schnitt
            </KButton>
            <KButton size="sm" tone="quiet" onClick={placeBildSlot} data-testid="place-bildslot" disabled={!sheet}>
              Bild-Slot
            </KButton>
            {/* v0.8.0B / W4 (Spez §2 Gesetz 1: «pro Viewport genau EINE
                gefüllte Signal-Fläche») — «Blatt füllen» war bisher
                zusätzlich zu «Plansatz PDF» (Sidebar-Fuss) `tone="accent"`:
                zwei gefüllte Flächen im selben Bildschirm. Die EINE
                Primäraktion der ganzen Station bleibt der Export («Plansatz
                PDF», der Abschluss der Seite) — «Blatt füllen» ist eine
                Werkzeug-Aktion INNERHALB des Editierens, kein Abschluss,
                darum jetzt `quiet` wie seine Nachbarn (Kontur statt Füllung,
                bleibt aber am rechten Rand der Gruppe optisch betont). */}
            <KButton
              size="sm"
              tone="quiet"
              onClick={blattFuellen}
              data-testid="blatt-fuellen"
              disabled={!sheet}
              title="Kosmo schlägt fehlende Ansichten/Schnitte vor und platziert sie — Blatt immer vollständig, ehrlich über Lücken im Modell"
            >
              Blatt füllen
            </KButton>
          </KToolGruppe>
          <KToolGruppe label="Ansicht">
            {(
              [
                ['nord', 'N'],
                ['ost', 'O'],
                ['sued', 'S'],
                ['west', 'W'],
              ] as const
            ).map(([r, label]) => (
              <KButton
                key={r}
                size="sm"
                tone="quiet"
                onClick={() => placeSchnitt(r)}
                data-testid={`place-${r}`}
                disabled={!sheet}
              >
                {label}
              </KButton>
            ))}
          </KToolGruppe>
          {/* v0.8.1 P7 (docs/V081-SPEZ.md §6.1/§7(e), C-13 «Publish-Preset-
              Wähler + Erststart-Trigger») — derselbe Preset-Schnellzugriff
              wie die Design-Statusleiste/Vis-Toolbar (identische testids
              `dock-preset-schnellzugriff`/`dock-preset-{id}`, additiv — die
              Registry existiert seit ROADMAP 380, nur der UI-Wähler fehlte
              für Publish). `wendePublishPresetAn()` ist der EINE Anwend-Weg
              dieser Station (s. Kopfkommentar oben zu den lokalen
              dossier/plankopf-Setzern). */}
          <KToolGruppe label="Oberfläche">
            <span
              data-testid="dock-preset-schnellzugriff"
              role="group"
              aria-label="Oberflächen-Preset"
              title="Fokus/Arbeiten/Prüfen — kuratierte Layout-Presets für Dossier/Plankopf"
              className="pub-preset-schnellzugriff"
            >
              {PRESET_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  data-testid={`dock-preset-${id}`}
                  aria-pressed={aktivesPresetPublish === id}
                  onClick={() => wendePublishPresetAn(id)}
                  className={`pub-preset-eintrag${aktivesPresetPublish === id ? ' pub-preset-eintrag--aktiv' : ''}`}
                >
                  {PRESET_KURZLABEL[id]}
                </button>
              ))}
            </span>
          </KToolGruppe>
          {/* v0.8.0 P6 (Spez §8 V-K8/§9 V-I5): reine Vorschau-Toggles — NIE
              ins Doc, NIE in den Export, lokaler State (`zonenVorschau`/
              `aussenbemassungVorschau` oben). «Zonen» tönt die Ränder
              zwischen Papierkante und Zeichenfläche; «Aussenbemassung»
              zeichnet B/H-Masslinien um die Zeichenfläche. v0.8.0B / W4
              (Spez §3 B-127): `KSwitch` statt nackter Checkbox — dasselbe
              native `<input type="checkbox">`-Bedienelement darunter,
              Tastatur/Screenreader/E2E `.check()`/`.uncheck()` unverändert. */}
          <KToolGruppe label="Vorschau (nur Anzeige)">
            <KSwitch
              data-testid="plankopf-preview-zonen"
              checked={zonenVorschau}
              onChange={(e) => setZonenVorschau(e.target.checked)}
              label="Zonen"
            />
            <KSwitch
              data-testid="plankopf-preview-aussenbemassung"
              checked={aussenbemassungVorschau}
              onChange={(e) => setAussenbemassungVorschau(e.target.checked)}
              label="Aussenbemassung"
            />
          </KToolGruppe>
          {/* v0.8.1 P7 (Spez §6.1/§7(e), C-25 «Einzelblatt-PDF mit
              Plancode-Namen») — die bisher fehlende Ergänzung zu «Plansatz
              PDF» (Sidebar-Fuss, bündelt IMMER alle Blätter eines Sets):
              GENAU das aktive Blatt als eigene PDF-Datei, benannt nach
              seinem Plancode. Bündel-PDF bleibt bewusst unverändert (ROADMAP
              378), `quiet` statt `accent` (Gesetz 1: EINE gefüllte
              Signal-Fläche bleibt «Plansatz PDF»). */}
          <KToolGruppe label="Export">
            <KButton
              size="sm"
              tone="quiet"
              onClick={exportBlattPdf}
              data-testid="export-blatt-pdf"
              disabled={!sheet}
              title="Nur dieses Blatt als eigenes PDF — Dateiname nach Plancode (fehlen Stammdaten, bleibt der bisherige Alt-Name)"
            >
              Blatt PDF
            </KButton>
          </KToolGruppe>
          {selectedPlacement && sheet && (() => {
            const pl = sheet.placements.find((x) => x.id === selectedPlacement);
            if (!pl) return null;
            return (
              <KToolGruppe label="Auswahl">
                <KSelect
                  size="sm"
                  value={pl.scale}
                  data-testid="auswahl-massstab"
                  onChange={(e) =>
                    runCommand('publish.ansichtAnpassen', {
                      sheetId: sheet.id,
                      placementId: pl.id,
                      scale: Number(e.target.value),
                    })
                  }
                >
                  {(SCALES.includes(pl.scale) ? SCALES : [pl.scale, ...SCALES]).map((sc) => (
                    <option key={sc} value={sc}>1:{sc}</option>
                  ))}
                </KSelect>
                <KSelect
                  size="sm"
                  value={pl.umbau ?? ''}
                  data-testid="auswahl-umbau"
                  title="Umbau-Filter: Abbruch- und Neubauplan aus einem Modell"
                  onChange={(e) =>
                    runCommand('publish.ansichtAnpassen', {
                      sheetId: sheet.id,
                      placementId: pl.id,
                      umbau: e.target.value === '' ? null : e.target.value,
                    })
                  }
                >
                  <option value="">Kombiniert</option>
                  <option value="bestand">Bestand</option>
                  <option value="abbruch">Abbruchplan</option>
                  <option value="neu">Neubauplan</option>
                </KSelect>
                {(doc.settings.themen ?? []).length > 0 && (
                  <KSelect
                    size="sm"
                    value={pl.thema ?? ''}
                    data-testid="auswahl-thema"
                    title="Themenplan: Regeln aus design.themenPlanSpeichern tönen die Platzierung"
                    onChange={(e) =>
                      runCommand('publish.ansichtAnpassen', {
                        sheetId: sheet.id,
                        placementId: pl.id,
                        thema: e.target.value === '' ? null : e.target.value,
                      })
                    }
                  >
                    <option value="">Kein Thema</option>
                    {(doc.settings.themen ?? []).map((t) => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </KSelect>
                )}
                <KInput
                  size="sm"
                  defaultValue={pl.title ?? ''}
                  key={pl.id}
                  placeholder="Titel"
                  data-testid="auswahl-titel"
                  onBlur={(e) => {
                    if (e.target.value !== (pl.title ?? '')) {
                      runCommand('publish.ansichtAnpassen', { sheetId: sheet.id, placementId: pl.id, title: e.target.value });
                    }
                  }}
                  className="k-publish-feld-titel"
                />
                <KButton
                  size="sm"
                  tone="ghost"
                  data-testid="auswahl-entfernen"
                  onClick={() => {
                    runCommand('publish.ansichtEntfernen', { sheetId: sheet.id, placementId: selectedPlacement });
                    setSelectedPlacement(null);
                  }}
                >
                  Entfernen
                </KButton>
              </KToolGruppe>
            );
          })()}
          {selectedBild && sheet && (() => {
            const b = (sheet.bilder ?? []).find((x) => x.id === selectedBild);
            if (!b) return null;
            return (
              <KToolGruppe label="Bild">
                <KInput
                  size="sm"
                  type="number"
                  defaultValue={Math.round(b.w)}
                  key={`w-${b.id}-${b.w}`}
                  data-testid="bild-breite"
                  title="Breite in Papier-mm"
                  mono
                  onBlur={(e) => {
                    const w = Number(e.target.value);
                    if (Number.isFinite(w) && w >= 10 && w !== b.w) {
                      runCommand('publish.bildAnpassen', { sheetId: sheet.id, bildId: b.id, w });
                    }
                  }}
                  className="k-publish-feld-schmal"
                />
                <KInput
                  size="sm"
                  defaultValue={b.title ?? ''}
                  key={`t-${b.id}`}
                  placeholder="Bildtitel"
                  data-testid="bild-titel"
                  onBlur={(e) => {
                    if (e.target.value !== (b.title ?? '')) {
                      runCommand('publish.bildAnpassen', { sheetId: sheet.id, bildId: b.id, title: e.target.value });
                    }
                  }}
                  className="k-publish-feld-mittel"
                />
                <KButton size="sm" tone="quiet" data-testid="bild-laden" onClick={() => bildDateiRef.current?.click()}>
                  Bild laden…
                </KButton>
                <KButton
                  size="sm"
                  tone="ghost"
                  data-testid="bild-entfernen"
                  onClick={() => {
                    runCommand('publish.bildEntfernen', { sheetId: sheet.id, bildId: b.id });
                    setSelectedBild(null);
                  }}
                >
                  Entfernen
                </KButton>
              </KToolGruppe>
            );
          })()}
          <input
            ref={bildDateiRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="k-publish-versteckt-input"
            onChange={(e) => {
              bildDateiGewaehlt(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <div className="k-publish-spacer" />
          <KButton size="sm" tone="ghost" onClick={undo}>
            <KIcon name="pfeil-links" size={14} /> Rückgängig
          </KButton>
        </KToolbar>

        {/* v0.8.0 P11 (Owner-Pflichtauftrag 15.07., «Publish in die Dock-
            Registry») — eigener `position:'relative'`-Container NUR für die
            Blattfläche + `DockFlaeche` (Dossier/Plankopf, s.u.), OHNE die
            Werkzeugleiste oben: dasselbe Muster wie `DesignWorkspace.tsx`
            (Kopfkommentar `DockFlaeche.tsx` «y-Start»: «die Werkzeugleisten
            liegen als Flex-Geschwister VOR diesem Container»). Läge die
            Werkzeugleiste MIT im Dock-Feld-Container, würde `DockFlaeche`s
            gemessenes Feld bis zu deren Oberkante reichen — die rechte
            Dock-Spalte (Plankopf) läge dann optisch ÜBER der Werkzeugleiste
            (inkl. «Rückgängig»-Knopf), einer positionierten Fläche gewinnt
            dort immer gegen unpositionierten Inhalt gleicher DOM-Reihenfolge. */}
        <div className="k-publish-dockbereich">
        <div
          // v0.8.0 P11 (Owner-Pflichtauftrag 15.07.): OBEN-zentriert statt
          // mittig (`flex-start`), NICHT mehr `display:grid;placeItems:
          // center`. Grund (real gemessen, s. Abschlussbericht): der
          // app-weite Boden-Dock (`shell/BodenDock.tsx`, `position:fixed`,
          // `screen !== 'home'`) schwebt am VIEWPORT-Unterrand — eine
          // mittige Zentrierung legte das (grosse) Blatt zwangsläufig in
          // die Viewport-Mitte, wo die Pille darüber liegt (Owner-
          // Screenshot: «liegt mitten auf dem Blatt»). Top-Ausrichtung +
          // die Höhen-Deckelung des Blatts unten (via `k-publish-blatt`s
          // Breitenformel) halten das GANZE Blatt strukturell ÜBER der
          // Pille. `min-height:0` (`.k-publish-scroll`) hält diesen
          // Scroll-Container auf die Viewport-Höhe geklemmt (sonst wüchse er
          // mit dem Blatt über den Viewport-Rand hinaus und der Reserve-Raum
          // läge unter dem Fold statt über der Pille).
          className="k-publish-scroll"
        >
          {sheet && paper ? (
            <BlattCanvas
              sheet={sheet}
              paper={paper}
              svgMarkup={svgMarkup}
              selectedPlacement={selectedPlacement}
              setSelectedPlacement={setSelectedPlacement}
              selectedBild={selectedBild}
              setSelectedBild={setSelectedBild}
              drag={drag}
              setDrag={setDrag}
              textDrag={textDrag}
              setTextDrag={setTextDrag}
              bildDrag={bildDrag}
              setBildDrag={setBildDrag}
              zonenVorschau={zonenVorschau}
              aussenbemassungVorschau={aussenbemassungVorschau}
              plankopfAktiv={plankopfOffen}
              onPlankopfKlick={() => setPlankopfOffen(true)}
              style={{
                // v0.8.0 P11 / v0.8.0B W4 (ROADMAP 381, 1400px-Fix): die
                // Breite bleibt die DEFINITE Achse (die Blatt-Overlays —
                // Platzierungen/Plankopf-Hitbox — sind in % der Canvas-Grösse
                // positioniert und würden bei gebrochenem Seitenverhältnis
                // driften, s. `plankopf-overlay.ts`), die Höhe folgt aus
                // `aspectRatio`. Der DRITTE `min()`-Term deckelt die Breite
                // so, dass die daraus abgeleitete HÖHE in den Raum ÜBER der
                // Boden-Dock-Pille passt: verfügbare Höhe ≈ `100dvh −
                // BODEN_DOCK_RESERVE_PX (Dock-Fussabdruck unten) −
                // --k-publish-chrome-h (ECHT gemessene Kopfleiste +
                // Werkzeugleiste + Innenabstand oben, s. `chromeHoehe`-Effekt
                // oben — spiegelt jetzt auch einen zweizeiligen Werkzeugleisten-
                // Umbruch, statt eines festen `132px`-Literals)`, mal
                // Seitenverhältnis `W/H` = die Breite, die genau diese Höhe
                // ergibt. Bei sehr breiten/kurzen Fenstern greift stattdessen
                // `min(100%, 1100px)` — für beide Blatt-Orientierungen
                // korrekt, weil der Term aus dem echten Blatt-Seitenverhältnis
                // abgeleitet ist.
                ['--k-publish-chrome-h' as string]: `${chromeHoehe}px`,
                width: `min(100%, 1100px, calc((100dvh - ${BODEN_DOCK_RESERVE_PX}px - var(--k-publish-chrome-h)) * ${paper.width} / ${paper.height}))`,
                aspectRatio: `${paper.width} / ${paper.height}`,
              }}
            />
          ) : (
            /* R1-Fix (Kritik-065 p-09/i-09, «Blattbereich-Leersatz von
               Mono-Versal auf Lauftext-Stimme umstellen»): `Messrahmen`
               (kosmo-ui, eingefroren) rendert seine `caption` fest in
               Mono-Versal (Vermessungs-Anmutung, für Passermarken/Achsen
               dort korrekt) — für einen ganzen Satz an Anleitung liest sich
               das wie eine Fehlermeldung, nicht wie ein Hinweis. `caption`
               bleibt leer (die Passermarken/Achsen/Eckwinkel bleiben), der
               eigentliche Satz kommt als eigenes, normal gesetztes Element
               darüber (`--k-font-ui`/`--k-t-sm`) — Wortlaut unverändert
               (e2e/module.spec.ts:491 prüft `getByText('Noch kein Blatt im
               Plansatz', …)`, nur EINE sichtbare Fundstelle im DOM). */
            <div className="k-publish-leerzustand">
              <Messrahmen height={280} caption="" style={{ width: '100%' }} />
              <div className="k-publish-leerzustand-text">
                Noch kein Blatt im Plansatz — links Format wählen und «+ Blatt», dann Grundrisse, Schnitte und
                Ansichten platzieren
              </div>
            </div>
          )}
        </div>
        {/* v0.8.0 P11 (Owner-Pflichtauftrag 15.07.): Dossier/Plankopf waren
            hier zwei eigene `position:'absolute'`-Overlays — jetzt EIN
            kollisionsfreier Dock (`shell/dock/DockFlaeche.tsx`, Solver
            `state/dock-kern.ts`, Registry `state/dock-stationen.ts`
            `'publish'`), analog `DesignWorkspace.tsx`s
            `<DockFlaeche station="design" .../>`. Sichtbarkeit bleibt exakt
            der bisherige lokale State (`dossierOffen`/`plankopfOffen`),
            gespiegelt in `publishDockPanels` oben. */}
        <DockFlaeche station="publish" panels={publishDockPanels} />
        </div>
      </div>
    </div>
  );
}
