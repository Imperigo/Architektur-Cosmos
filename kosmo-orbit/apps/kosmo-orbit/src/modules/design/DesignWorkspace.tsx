import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Badge, Hairline, KButton, KIcon, type KIconName, KSelect, Measure, melde, meldeFehler, moduleHue, useOverlaySchliessen } from '@kosmo/ui';
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
  nachbarnZuOutlines,
  fassadenModule,
  moduleAlsCsv,
  magnetFang,
  phaseLabel,
  // v0.8.7 PA4 (docs/V087-SPEZ.md §3 E2): Öffnungs-Griff-Clamp kommt jetzt
  // aus dem Kernel (`geometry/plan-projektion.ts`) — EINE Formel statt der
  // bisherigen byte-identischen Kopie hier (ROADMAP 491, D4).
  projiziereOeffnungCenter,
  siaPhaseLabel,
  UMBAU_LABEL,
  type Assembly,
  type BauPhase,
  type Column,
  type ErkannteDecke,
  type ErkannteWand,
  type FangKandidaten,
  // Seit v0.8.8 PA1 (E1, docs/V088-SPEZ.md) kennt `design.verschieben`
  // ALLE ziehbaren Kinds — der historische PB5-Workaround (Löschen+
  // Neusetzen für masskette/kommentar, C-26) ist in `onMoveEnd` gefallen.
  // `MassKette` bleibt für den GRIFF-Einzelpunkt-Zug nötig (der ist kein
  // verschieben und läuft weiter über Löschen+Neusetzen, benannter
  // Aufschub C-3).
  type AnyPatch,
  type MassKette,
  // E3 (v0.8.5 PB1, docs/V085-SPEZ.md §7 C-15/C-16): Griff-Ziehen (Eck-Griffe
  // Zone/Volumen/Dach) braucht die vollen Entity-Typen für dasselbe
  // Löschen+Neusetzen-Muster wie Masskette/Kommentar oben (`onGriffEnd`
  // unten) — der Kernel kennt keinen Endpunkt-/Eckpunkt-Weg über
  // `design.eigenschaftSetzen` (`editableFields`, `commands/design.ts`).
  type MassBody,
  // E5 (v0.8.6 PB3, docs/V086-SPEZ.md §3): Öffnungs-Griff — `onGriffEnd`
  // braucht den vollen Typ, um Wirtswand + Breite fürs Clamp zu lesen.
  type Opening,
  type Pt,
  type Roof,
  type SectionSpec,
  type SiaPhase,
  type Stair,
  type Storey,
  type Wall,
  type Zone,
} from '@kosmo/kernel';
import { bootstrapProject, useProject } from '../../state/project-store';
import { verarbeiteUnternehmerplanDatei, useUnternehmerplan } from './unternehmerplan';
import { VERSCHIEBBAR, wandTreffer } from './plan-hit-test';
import { oeffnungVorgabeLesen } from './island/inhalte/zeichnen';
import { masseingabeTaste, punktInRichtung, zeichenSnap, type Fluchtlinie } from './zeichenhilfen';
import { istEingabefeld, KURZTASTEN, kurztasteFuer } from './kurztasten';
import { setModulRaster, Viewport3D, type ViewportHandlers } from './Viewport3D';
import type { PlanLod } from './planLod';
// v0.7.2 §5/W4-H (Restfix): Punkt-Burst-Bibliothek (Stream W2-D,
// `kosmo-feedback.css`) — bislang nirgends verdrahtet (Datei-Kopf dort:
// «Anwendung in fremden Dateien übernimmt später Stream W4-H»). Hier NUR
// die Werkzeug-Auswahl der Design-Werkzeugleiste (`tool-*`/`werkzeug-mesh`-
// Klick) — aria/innerText/testids der Knöpfe bleiben exakt wie vorher, der
// Burst ist ein rein dekorativer Overlay-Span (`aria-hidden`, keine
// Textknoten, s. `PunktBurst` unten).
import '../../shell/kosmo-feedback.css';
import './design.css';
import {
  IconAuswahl,
  IconDach,
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
import { VariantenPanel } from './VariantenPanel';
import { FAEHIGKEIT_LABEL, PHASEN_PRESETS, empfohlenePlanPhaseFuer, type FaehigkeitId } from './phasen-presets';
import { UnternehmerplanPanel } from './UnternehmerplanPanel';
import { SplatPanel } from './SplatPanel';
import type { SplatCloud } from './splat-import';
import { Inspector } from './Inspector';
import { StammdatenPanel } from './StammdatenPanel';
import { KosmoZeichnet } from './KosmoZeichnet';
import { SectionView } from './SectionView';
import { exportIfcFile, exportPlanDxf, exportPlanPdf, exportPlanSvg, PHASEN_MASSSTAB } from './export-plan';
import { consumeDeepLink } from '../../state/deep-link';
import { journalStore } from '../../state/journal-store';
import { requestKosmoFokus } from '../../state/kosmo-focus';
import { EntwurfsDock, type EntwurfsModus } from './EntwurfsDock';
// PD2 (`docs/ISLAND-UI-SPEZ.md` §7 PD2-Zeile): Island-Verdrahtung + Default-
// Flip — `IslandBuehne` rendert NUR im Island-Modus (s. Rückgabe-JSX
// unten), `IslandWerkzeug` für den `aktiviereIslandWerkzeug()`-
// Integrationspunkt. PB3 (`docs/V084-SPEZ.md` §8 C-24): `AnsichtsInfo`/
// `StationenOrb` rendern seither in `App.tsx` (s. dortiger Kommentar) —
// diese Datei importiert sie nicht mehr.
import { IslandBuehne } from './island/IslandShell';
// PD4 (`docs/ISLAND-UI-SPEZ.md` §7 PD4-Zeile): löst den PD3c-Notbehelf
// (`shell/KosmoSymbol.tsx` freistehend über `App.tsx`) ab — der echte,
// spezifizierte Kosmo-Orb (52px, `--f-gold`, Puls, 320px-Konversationskarte)
// nutzt denselben `onKosmoOeffnen`-Handoff, den diese Datei von `App.tsx`
// schon bekommt (s. `DesignWorkspaceProps`-Kommentar).
import { KosmoOrb } from './island/KosmoOrb';
import type { IslandWerkzeug } from './island/island-katalog';
// PD3c (Owner-Befehl 17.07.): PD3bs vorbereitete Deep-Link-Brücke (§8-4) —
// verdrahtet `onStationOeffnen` beim Mount (Effekt unten), damit die
// AUSTAUSCH-Insel «Zur Station»-Knöpfe (Rendern/Blätter) ECHT navigieren.
import { registriereStationsWeg } from './island/inhalte/austausch';
// PD3c: Achsen bleibt `hatPopup:false` (Sofort-Toggle in der Leiste,
// `island-katalog.ts`) — die echte Wirkung läuft über denselben geteilten
// Store, den `PlanView.tsx`/`island/inhalte/ansicht.tsx` (Trace/Graph)
// nutzen (`aktiviereIslandWerkzeug` unten).
import { usePlanAnsicht } from '../../state/plan-ansicht';
import { DockFlaeche, type DockPanelEintrag } from '../../shell/dock/DockFlaeche';
import { DockRegeln } from '../../shell/dock/DockRegeln';
import { useDockZustand } from '../../state/dock-zustand';
import { useDockTourZustand } from '../../state/dock-tour-zustand';
import { presetAnwenden } from '../../state/dock-preset-anwendung';
import { PRESET_IDS, type PresetId } from '../../state/dock-presets';
// v0.7.8 Welle 2 / Paket P5 («HUDs als echte Dock-Floats»): die vier
// gefloateten Viewport-HUDs — Modus-Leiste/-Karte/-Werkzeug-Rail/
// -Orientierungskreuz, s. `dock-stationen.ts` — sind selbst-genügsame
// Komponenten (lesen `viewport-chrome-runtime.ts` direkt); hier nur die
// `bereit`-Fahne für die `sichtbar`-Prop der Dock-Panel-Einträge.
import {
  ViewportEigenschaftenHud,
  ViewportHudStatuskarteHud,
  ViewportModusKarteHud,
  ViewportModusLeisteHud,
  ViewportOrientierungHud,
  ViewportWerkzeugRailHud,
} from './ViewportChromeHuds';
import { useViewportChromeRuntime } from '../../state/viewport-chrome-runtime';
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

// v0.8.3 E3 (§3.1, docs/V083-SPEZ.md): additiv um 'oeffnung'/'messen'/
// 'kommentar' ergänzt — 1:1 dieselbe Erweiterung wie `state/ui-zustand.ts`s
// `ToolId` (TOOL_IDS 10→13), hier lokal dupliziert (Bestand vor diesem
// Paket, keine Import-Umstellung in diesem additiven Auftrag).
type ToolId = 'auswahl' | 'wand' | 'volumen' | 'zone' | 'dach' | 'treppe' | 'stuetze' | 'schnitt' | 'skizze' | 'mesh' | 'oeffnung' | 'messen' | 'kommentar';

// K16 A6: dasselbe Lernjournal wie `KosmoPanel.tsx` (👍/👎) — EIN Store
// (`journalStore()`), eine Modul-Instanz. Loggt hier ausschliesslich, welche
// Skizze-Annäherung gewählt wurde (Datensammlung fürs spätere, kuratierbare
// LoRA-Training — KEIN Live-Training, s. Kommentar bei `onSketchAccept`).
const entwurfsJournal = new LearningJournal(journalStore());

const SNAP = 250; // mm Rasterfang, wenn keine Achse in Reichweite

/**
 * C-26 (PB5, §7 D8/C-26): erste Entity-Id aus einem Patch-Ergebnis — `AnyPatch`
 * ist `Patch | SettingsPatch` (`packages/kosmo-kernel/src/model/doc.ts`), nur
 * `Patch` trägt `id`. `design.massKetteSetzen`/`design.kommentarSetzen`
 * liefern immer genau EINEN `Patch` (kein Settings-Command), diese Funktion
 * bleibt trotzdem defensiv statt anzunehmen.
 */
function neuePatchId(patches: readonly AnyPatch[]): string | null {
  const p0 = patches[0];
  return p0 && 'id' in p0 ? p0.id : null;
}

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
 * v0.8.0B / P7: die frühere `aktivRahmen()`-Laufzeitfunktion ist jetzt die
 * reine CSS-Klasse `.dw-aktiv-rahmen` (design.css) — Aufrufer setzen
 * `className={aktiv ? 'dw-aktiv-rahmen' : undefined}` statt eines
 * Style-Objekt-Spreads.
 */

function Trennlabel({ children, icon }: { children: string; icon?: KIconName }) {
  return (
    <span className="k-selten dw-trennlabel">
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
  schnitt: 'Schnitt',
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
 * `data-testid`s unverändert). Die restlichen Bauteil-Werkzeuge (Dach/Treppe/
 * Stütze) bleiben Text — seltener genutzt, teils geometrisch nicht auf ein
 * Icon reduzierbar. Begründung der Auswahl: Kommentar in `werkzeug-icons.tsx`.
 *
 * v0.8.1 / P4 (Spez §1.1/§1.2, Werkzeug-Umbau): Skizze UND Schnitt ziehen aus
 * dieser Zeichenzeile aus — Skizze in die untere Rail-Reihe des
 * `EntwurfsDock` (§1.1, testid `tool-skizze` bleibt wörtlich), Schnitt in die
 * neue Kontextzeilen-Gruppe `leiste-gruppe-schnitt` (§1.2, testid
 * `tool-schnitt` bleibt wörtlich). Diese Zeile trägt jetzt ausschliesslich
 * die reinen Bauteil-Werkzeuge (Auswahl/Wand/Volumen/Zone/Dach/Treppe/
 * Stütze) + Mesh (Block 3 / E4, separat unten).
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
  // v0.8.3 E3 (§3.1, docs/V083-SPEZ.md): additive Zeilen, TOOL_IDS 10→13.
  oeffnung: 'Öffnung',
  messen: 'Messen',
  kommentar: 'Kommentar',
};

/** Statusleiste: kurzes deutsches Label je Plan-LOD-Stufe (`planLod.ts`, B2). */
const LOD_KURZLABEL: Record<PlanLod, string> = { voll: 'voll', mittel: 'mittel', fern: 'fern' };

/** v0.8.0 / Paket PD2 — kurze Beschriftung des Preset-Schnellzugriffs in der
 *  Statusleiste (identisch zu `dock-presets.ts`s `DockPreset.titel`, hier als
 *  eigene Konstante, damit die Kontextzeile nicht `presetFuer()` pro Render
 *  aufrufen muss). */
const PRESET_KURZLABEL: Record<PresetId, string> = { fokus: 'Fokus', arbeiten: 'Arbeiten', pruefen: 'Prüfen' };

/**
 * v0.7.2 §5/W4-H (Restfix — Punkt-Burst-Verdrahtung): rein dekorativer
 * Overlay bei der Werkzeug-Auswahl (`.k-fb-punkt-burst`/`.k-fb-punkt-burst-p`,
 * `kosmo-feedback.css`, Stream W2-D). `aria-hidden`, KEINE Textknoten — der
 * `innerText()`/`toHaveText()`-Vertrag der Knöpfe (`e2e/oberflaeche-minimal.
 * spec.ts`) bleibt unberührt, egal ob dieser Overlay gerade eingeblendet ist.
 * Entfernt sich selbst nach der Bibliotheks-Dauer (600ms + 8×25ms Stagger,
 * s. Datei-Kopf `kosmo-feedback.css`) über einen festen Timer — 8 separate
 * `onAnimationEnd`-Events pro Punkt sauber einzusammeln wäre hier mehr
 * Komplexität als der Effekt rechtfertigt (dieselbe Abwägung wie die feste
 * Aufstarten-Dauer in `KosmoCharakterFenster.tsx`).
 */
const PUNKT_BURST_DAUER_MS = 800;

function PunktBurst() {
  return (
    <span className="k-fb-punkt-burst" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="k-fb-punkt-burst-p" />
      ))}
    </span>
  );
}

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
   *  ihn nicht). PD2 (`StationenOrb.tsx`): additiv um `'data'`/`'design'`
   *  erweitert — `App.tsx`s Handler (`modules.find` + `oeffneModul`) ist
   *  bereits generisch, keine Änderung an `App.tsx` nötig. */
  onStationOeffnen?: (station: 'vis' | 'publish' | 'prepare' | 'data' | 'design') => void;
  /** PD5 (Owner-Befehl + Owner-Korrektur, 17.07.2026): «Zur Zentrale» —
   *  additiv, derselbe `gehZu('home')`-Weg wie die Kopfbalken-Wortmarke UND
   *  der (weiterhin gerenderte) klickbare `island-kopf-logo-orbit` (`App.tsx`).
   *  Nur an `StationenOrb`s zusätzlichen «Zentrale»-Popover-Eintrag
   *  durchgereicht (s. `StationenOrb.tsx` Kopfkommentar) — ein zweiter,
   *  additiver Zugang, kein Ersatz — optional aus demselben Grund wie
   *  `onStationOeffnen`. */
  onZurZentrale?: () => void;
}

export function DesignWorkspace({
  onEinstellungen,
  onKosmoOeffnen,
  kosmoOffen,
  onStationOeffnen,
  onZurZentrale,
}: DesignWorkspaceProps = {}) {
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

  // v0.7.2 §5/W4-H (Restfix): Punkt-Burst bei der Werkzeug-Auswahl —
  // `burstKey` erzwingt bei wiederholtem Klick auf DASSELBE Werkzeug einen
  // Remount (sonst würde React die laufende CSS-Animation nicht neu
  // starten, weil sich weder `id` noch Elementtyp ändern).
  const [punktBurst, setPunktBurst] = useState<{ id: string; key: number } | null>(null);
  const punktBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zeigePunktBurst = (id: string) => {
    if (punktBurstTimerRef.current) clearTimeout(punktBurstTimerRef.current);
    setPunktBurst((vorher) => ({ id, key: (vorher?.id === id ? vorher.key : 0) + 1 }));
    punktBurstTimerRef.current = setTimeout(() => setPunktBurst(null), PUNKT_BURST_DAUER_MS);
  };
  useEffect(() => () => {
    if (punktBurstTimerRef.current) clearTimeout(punktBurstTimerRef.current);
  }, []);

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
  // v0.8.1 / P4 (Spez §1.1): der hierher (EntwurfsDock, untere Rail-Reihe)
  // gezogene `tool-skizze`-Knopf — identischer Effekt wie der frühere Klick
  // in der klassischen Zeichenzeile (`setTool('skizze')` +
  // `nutzungMelden('zeichnen:skizze')`, dieselbe Zeichenkette wie zuvor).
  // Kein `zeigePunktBurst('skizze')` mehr: der Burst-Overlay rendert nur
  // innerhalb der `ZEICHEN_WERKZEUGE_LEISTE`-Knöpfe (dort verlässt 'skizze'
  // jetzt das Array) — der Dock trägt mit `orbit065-dock-pop` bereits sein
  // eigenes Nutzungs-Pop (450ms, s. `EntwurfsDock.tsx`), kein zweiter Effekt
  // nötig.
  const klickSkizzeWerkzeug = () => {
    setTool('skizze');
    nutzungMelden('zeichnen:skizze');
  };
  // v0.8.1 / P4 (Spez §1.2): Schnitt zieht in die neue Kontextzeilen-Gruppe
  // `leiste-gruppe-schnitt` — identischer Effekt wie der frühere Klick in der
  // klassischen Zeichenzeile (`setTool('schnitt')` +
  // `nutzungMelden('zeichnen:schnitt')` + Punkt-Burst, unverändert aus der
  // `ZEICHEN_WERKZEUGE_LEISTE`-Map übernommen).
  const klickSchnittWerkzeug = () => {
    setTool('schnitt');
    nutzungMelden('zeichnen:schnitt');
    zeigePunktBurst('schnitt');
  };
  const [treppenForm, setTreppenForm] = useState<'gerade' | 'podest' | 'u' | 'l'>('gerade');
  const viewMode = useUiZustand((s) => s.viewMode);
  const setViewMode = useUiZustand((s) => s.setViewMode);
  // PD2 Default-Flip (`docs/ISLAND-UI-SPEZ.md` §6 Sanktion 1, `V082-SPEZ.md`
  // C-35/C-41): 'island' ist der neue Default — die klassische Werkzeugleiste/
  // Kontextzeile/Dock-Fläche/Geschossleiste rendern nur noch bei 'manuell'
  // (s. Rückgabe-JSX unten), unverändert wie heute.
  const designOberflaeche = useUiZustand((s) => s.designOberflaeche);
  const setDesignOberflaeche = useUiZustand((s) => s.setDesignOberflaeche);
  // v0.7.8 Welle 2 / Paket P5: Sichtbarkeits-Guard der vier Viewport-HUD-
  // Floats — `bereit` ändert sich nur bei Mount/Unmount von `Viewport3D`
  // (nicht bei jedem 400ms-Kamera-Tick, s. `viewport-chrome-runtime.ts`
  // Kopfkommentar), verursacht hier also KEIN häufiges Re-Render dieser
  // ~2000-Zeilen-Komponente. Quad-Ansicht bewusst ausgeschlossen (s.
  // `dock-stationen.ts`-Kommentar «Sichtbarkeit» — der Solver kennt nur EIN
  // zentrales Viewport-Rechteck, die Floats würden im 2×2-Raster über alle
  // vier Zellen schweben statt nur über der Viewport3D-Zelle).
  const viewportChromeBereit = useViewportChromeRuntime((s) => s.bereit);
  // PD3c-Nachzug (Fable-Gate, Owner-Befehl «alles weg»): die sechs HUD-Floats
  // (Modusleiste/-karte/Werkzeug-Rail/Orientierung/Statuskarte/Eigenschaften
  // inkl. «Für Vis aufnehmen»-Aktion) gehören zur klassischen Fläche — im
  // Island-Modus sind Rendern/Ansicht über die Islands erreichbar.
  const viewportHudFloatsSichtbar =
    viewportChromeBereit && (viewMode === '3d' || viewMode === 'split') && designOberflaeche === 'manuell';
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
  const [dragEntity, setDragEntity] = useState<{ id: string; start: Pt; gruppe?: string[] } | null>(null);
  const [dragCursor, setDragCursor] = useState<Pt | null>(null);
  // E3 (v0.8.5 PB1, docs/V085-SPEZ.md §7 C-15/C-16): Griff-Ziehen (Wand-/
  // Masskette-Endpunkt, Zonen-/Volumen-/Dach-Ecke) — dasselbe Start/Cursor-
  // Paar-Muster wie `dragEntity`/`dragCursor` oben, nur für EINEN Punkt
  // statt eine Gruppen-Translation. `key` ist `'a'|'b'` bei einer Wand,
  // sonst der Punktindex (Masskette/Zone/Volumen/Dach-Outline).
  const [griffDrag, setGriffDrag] = useState<{ id: string; key: string | number; start: Pt } | null>(null);
  const [griffCursor, setGriffCursor] = useState<Pt | null>(null);
  // E1 (v0.8.5 PA1): Esc-Stufenfolge (Kette abbrechen → zur Auswahl →
  // Auswahl leeren). Der keydown-Listener unten ist mit LEEREN Deps
  // registriert (Bestand) — er liest den frischen tool/points-Stand über
  // diesen je Render neu zugewiesenen Ref statt über eine stale Closure.
  const escAuswahlRef = useRef<() => boolean>(() => false);
  escAuswahlRef.current = () => {
    if (tool !== 'auswahl' || points.length > 0) return false;
    const sel = useProject.getState().selection;
    if (sel.length === 0) return false;
    useProject.getState().select([]);
    return true;
  };
  // C-11 (PE3-Fix v0.8.4): schwebender Inspector im Island-Modus — geöffnet
  // NUR über das Kontextmenü «Eigenschaften» (kein automatisches Aufpoppen
  // bei blosser Auswahl, Island bleibt radikal leer, PD3c).
  const [eigenschaftenFloatOffen, setEigenschaftenFloatOffen] = useState(false);
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
  // «Fensterband/CW setzen»-Dialog — v0.7.0 (Stream 1B): vom lokalen useState
  // in den useUiZustand-Store überführt (SIM-BEFUNDE-Notiz zur v0.6.9-Status-
  // runde, Vereinheitlichung der Panel-Buchführung; jetzt generisch über
  // `ui.panelSetzen` erreichbar). Der Knopf bleibt wie deckeZeichnen (H-7)
  // ausserhalb der Werkzeug-Zähler-/Arbeitsmodi-Listen (ebenenPanelOffen/
  // offenePanels unten) — nur die Flag-QUELLE wandert in den Store.
  const cwSetzenOffen = useUiZustand((s) => s.cwSetzenOffen);
  const setCwSetzenOffen = useUiZustand((s) => s.setCwSetzenOffen);
  // «Varianten»-Panel — v0.7.0 (Stream 5A, E5-i/iii): gleiches Muster wie
  // cwSetzenOffen (Sichtbarkeit im useUiZustand-Store, Knopf ausserhalb der
  // Werkzeug-Zähler-/Arbeitsmodi-Listen, siehe H-7-Kommentar oben).
  const variantenPanelOffen = useUiZustand((s) => s.variantenPanelOffen);
  const setVariantenPanelOffen = useUiZustand((s) => s.setVariantenPanelOffen);
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
  // v0.7.8 Welle 1 (P3, Dock-Migration): `unternehmerplan` hat KEIN
  // `…Offen`-Flag in `ui-zustand.ts` (dock-stationen.ts Kopfkommentar) — die
  // Sichtbarkeit für den Dock-Solver ist derselbe Daten-Guard, den
  // `UnternehmerplanPanel.tsx` intern schon prüft (dxf+abgleich ODER
  // pdfHinweis), hier nur zusätzlich gespiegelt, damit `DockFlaeche` VORHER
  // weiss, ob sie Platz reservieren muss (kein neuer Boolean-Store).
  const uplanDxf = useUnternehmerplan((s) => s.dxf);
  const uplanAbgleich = useUnternehmerplan((s) => s.abgleich);
  const uplanPdfHinweis = useUnternehmerplan((s) => s.pdfHinweis);
  const unternehmerplanSichtbar = !!((uplanDxf && uplanAbgleich) || uplanPdfHinweis);
  // v0.7.8 Welle 2 (P4, Rechts-Stack-Migration): `inspector` ist — wie
  // `unternehmerplan` oben — ein Daten-Guard ohne eigenes `…Offen`-Flag
  // (`dock-stationen.ts` Kopfkommentar). Der Guard ist wörtlich derselbe wie
  // `Inspector.tsx`s eigener `if (!entity) return null` (Selektion muss auf
  // eine tatsächlich im Doc vorhandene Entität zeigen, nicht nur eine nicht-
  // leere `selection`-Liste — sonst reservierte `DockFlaeche` Platz für ein
  // Panel, das gleich darauf selbst `null` rendert). `selection`/`revision`
  // sind bereits reaktive Subscriptions dieser Komponente (Zeile oben) bzw.
  // hier neu ergänzt; `doc` bleibt bewusst der nicht-reaktive
  // `getState()`-Zugriff (wie überall sonst in dieser Datei) — die
  // Neuberechnung hängt an `revision`, nicht an einer `doc`-Referenzänderung.
  const selection = useProject((s) => s.selection);
  const inspectorSichtbar = useMemo(() => {
    const id = selection[0];
    return !!(id && useProject.getState().doc.get(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, revision]);
  // «Auf schlaues Layout zurücksetzen» (Auftrag): löscht NUR Spaltenbreiten/
  // Panel-Overrides dieser Station+diesem Modus (dock-zustand.ts) — die
  // Sichtbarkeit (ui-zustand.ts) bleibt unberührt.
  const dockLayoutZuruecksetzen = useDockZustand((s) => s.layoutZuruecksetzen);
  // v0.8.0 / Paket PD2 (Default-Oberflächen) — Schnellzugriff auf die drei
  // Presets in der Statusleiste (Kontextzeile), s. dortigen Kopfkommentar.
  const aktivesPresetDesign = useDockZustand((s) => s.aktivesPreset['design']);
  // v0.7.8 Welle 3 (P8): dezenter Einstieg für Regeln-Panel + Geführte Tour,
  // direkt neben «Layout zurücksetzen» (Auftrag Teil B Punkt 5 bzw. Teil A
  // Punkt 3 «im Dock-Bereich ggf. dezent»). Die Tour selbst startet hier
  // IMMER direkt (kein Hinweis nötig — diese Komponente IST die Design-
  // Station, anders als der Einstieg in `Einstellungen.tsx`, der von
  // überall geöffnet werden kann).
  const [dockRegelnOffen, setDockRegelnOffen] = useState(false);
  const dockTourStarten = useDockTourZustand((s) => s.starten);
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
  // beide fest bei left:12, nur 40 px Top-Abstand auseinander. v0.7.8 Welle 1
  // (P3, Dock-Migration): das Studien-Panel ist jetzt ein Dock-Panel — die
  // Kollisionsfreiheit stellt `DockFlaeche`/`dock-kern.ts`s Solver zentral
  // sicher (misst die Geschossleiste selbst per `data-testid`-Abfrage). Die
  // frühere lokale `offsetHeight`-Messung (Ref + State + Effekt) entfiel bei
  // der P3-Migration ERSATZLOS — REGRESSION (v0.8.1/K3-Fix, `67c0fca`):
  // `DockFlaeche` sicherte danach nur noch die horizontale Trennung
  // (`xStart`), nicht mehr, dass das Studien-Panel (und jedes andere
  // `dock:'left'`-Panel) tatsächlich UNTERHALB der Geschossleiste beginnt —
  // vier Releases lang unbemerkt rot (`e2e/popup-kollision.spec.ts` K3,
  // Assertion `sBox.y >= gBox.y + gBox.height`). Seit dem K3-Fix übernimmt
  // `DockFlaeche`s `linksReserve`-Messung (misst dieselbe Geschossleisten-
  // Unterkante) exakt das, was diese frühere lokale Messung tat — scharf
  // geschaltet aber NUR, solange ein unterhalb-pflichtiges Panel
  // (`UNTER_GESCHOSSLEISTE_PFLICHT`, heute: `studieOffen`) offen in der
  // linken Spalte liegt; die übrigen linken Panels behalten sonst ihr
  // volles Höhenbudget («vier Panels»-Vertrag). S. `shell/dock/
  // DockFlaeche.tsx` Kopfkommentare bei `linksReserve`/`TOP_BAND_RECHTS`/
  // `UNTER_GESCHOSSLEISTE_PFLICHT`. NICHT wieder ersatzlos entfernen, ohne
  // den K3-Test anzupassen (Owner-Vorgabe).

  // v0.7.9 (B2, Owner-Stretch): letzte bekannte Alt-Kollision, seit P3 in
  // `BEKANNTE_VORBESTEHENDE_KOLLISIONEN` (e2e/dock-layout.spec.ts) ausgeklammert
  // — Geschossleiste ↔ EntwurfsDock. Beide sind FIXE Chrome-Blöcke ausserhalb
  // des Dock-Solvers (`FIXE_ELEMENTE`, ebd.): `DockFlaeche` misst die
  // Geschossleiste zwar (s. Kommentar oben) und hält Panels rechts davon frei,
  // schützt die Geschossleiste aber NICHT vor dem vertikal MITTIG verankerten
  // `EntwurfsDock` (`top:50%`, `EntwurfsDock.tsx`/`orbit-065.css`) — bei genug
  // Geschossen (TKB: EG+5 OG+Dach = 7, `demo-tkb.ts`) wächst die Karteikarten-Liste
  // über die Mitte hinaus und überlappt ihn.
  //
  // Abwägung: die Leiste scrollt bereits (`overflowY:auto`, s. `maxHeight`
  // unten) — sie einfach FRÜHER scrollen zu lassen ist die kleinere Änderung
  // als den Dock bei langer Leiste nach unten ausweichen zu lassen (das gäbe
  // dem Dock eine zweite, von der Geschossanzahl abhängige Positionsquelle
  // und einen Layout-Sprung, sobald ein Geschoss dazukommt/wegfällt). Also
  // Weg 1: dasselbe Mess-Muster wie `DockFlaeche`s Feld-Messung (ResizeObserver
  // + rAF-debounced, `querySelector` auf den testid-Anker des Nachbarn) —
  // die Leiste klemmt ihre eigene `maxHeight` so, dass sie strikt VOR der
  // Oberkante des EntwurfsDock endet, zusätzlich zur bisherigen
  // Hochhaus-Grenze (`calc(100% - 24px)`, jetzt in JS nachgebildet, damit
  // beide Grenzen als ein gemeinsames `Math.min` gelten).
  const geschossleisteRef = useRef<HTMLDivElement>(null);
  const [geschossMaxHoehe, setGeschossMaxHoehe] = useState<number | null>(null);
  useLayoutEffect(() => {
    const wurzel = geschossleisteRef.current;
    const container = wurzel?.parentElement;
    const entwurfsDock = container?.querySelector('[data-testid="entwurf-dock"]');
    if (!container || !entwurfsDock) return;

    const GAP = 12; // gleiche Kante-Konstante wie die übrigen absolute-Overlays hier (mesh-edit-panel etc.)
    let rafHandle = 0;
    const jetztMessen = () => {
      rafHandle = 0;
      const c = container.getBoundingClientRect();
      if (c.height === 0) return;
      const dockOberkante = entwurfsDock.getBoundingClientRect().top - c.top - GAP;
      const hochhausGrenze = c.height - 24; // bisherige Grenze, s. Kommentar am `maxHeight` unten
      setGeschossMaxHoehe(Math.max(0, Math.min(dockOberkante, hochhausGrenze)));
    };
    const messenDebounced = () => {
      if (rafHandle) return;
      rafHandle = requestAnimationFrame(jetztMessen);
    };
    const ro = new ResizeObserver(messenDebounced);
    ro.observe(container);
    ro.observe(entwurfsDock);
    window.addEventListener('resize', messenDebounced);
    jetztMessen();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', messenDebounced);
      if (rafHandle) cancelAnimationFrame(rafHandle);
    };
  }, []);

  // D1: Deep-Links der Zentrale — KosmoDraw/KosmoSketch öffnen die Werkstatt
  // mit dem passenden Panel bzw. Werkzeug (einmaliger Merker)
  useEffect(() => {
    const ziel = consumeDeepLink();
    if (ziel === 'draw') setDrawOffen(true);
    if (ziel === 'sketch') setTool('skizze');
  }, []);

  // PD3c (Owner-Befehl 17.07., `island/inhalte/austausch.tsx`s Kopfkommentar
  // «Deep-Link-Brücke (§8-4)»): verdrahtet die von PD3b vorbereitete Brücke
  // mit dem bestehenden `onStationOeffnen`-Weg (derselbe Callback, den
  // `StationenOrb`/`EntwurfsDock` schon nutzen) — die AUSTAUSCH-Insel-
  // Fenster (Rendern/Blätter, `ZurStationKnopf`) navigieren damit ECHT statt
  // nur den «noch nicht verdrahtet»-Hinweis zu zeigen. Bei jedem Wechsel
  // (App.tsx reicht keine memoisierte Funktion durch) neu registriert,
  // beim Unmount abgemeldet — sonst hielte die Modul-Ebene eine tote
  // Closure einer bereits entsorgten Instanz.
  useEffect(() => {
    registriereStationsWeg(onStationOeffnen);
    return () => registriereStationsWeg(undefined);
  }, [onStationOeffnen]);

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
        // D10-Fix (v0.8.5 PB1, docs/V085-SPEZ.md §7 C-18): eine laufende
        // Masskette (Werkzeug 'messen', ≥2 Punkte) soll Esc auch in REINEM
        // view-2d abschliessen statt nur verwerfen — bislang lief der
        // Abschluss-Weg (`massKetteAbschliessen()`) NUR über
        // `handlersRef.current.onEscape`, aufgerufen vom Escape-Listener in
        // Viewport3D.tsx (nur in 3d/split gemountet). Reines view-2d hat
        // KEINEN Viewport3D-Mount, also nie diesen Weg — derselbe Weg
        // (`handlersRef.current.onEscape?.()`) hier zusätzlich aufgerufen
        // deckt 2d ab UND bleibt in 3d/split ein reiner Doppel-Aufruf
        // (onEscape ist idempotent: der zweite Aufruf trifft nach dem
        // Commit auf eine bereits geleerte `points`-Liste und tut nichts).
        handlersRef.current?.onEscape?.();
        // ArchiCAD-Reflex: Esc bricht die laufende Kette ab UND geht zur Auswahl zurück.
        // E1 (v0.8.5 PA1): ist das Auswahl-Werkzeug schon aktiv und keine
        // Kette offen, leert Esc stattdessen die Auswahl (dritte Stufe).
        if (escAuswahlRef.current()) return;
        setTool('auswahl');
        setPoints([]);
        return;
      }
      // C-9 (PB1, docs/V084-SPEZ.md §7 D8): Delete/Backspace löscht die
      // aktuelle Auswahl — ArchiCAD-Gefühl. Kein Kürzel (kurztasten.ts bleibt
      // PB5-Eigentum, s. `kurztasteFuer` unten, unverändert) — reiner
      // Werkzeug-keydown mit demselben Eingabefeld-/Dialog-Guard wie der
      // Esc-Zweig oben. `masseingabeTaste`s Capture-Handler (:1298ff)
      // konsumiert Backspace bereits VOR dieser Bubble-Phase (stopPropagation),
      // solange ein Zahlenpuffer offen ist — dieser Zweig sieht Backspace also
      // nur, wenn gerade NICHT getippt wird. Mehrfachauswahl läuft als EINE
      // Undo-Gruppe (`history.beginGroup`/`endGroup`, Muster T5 oben), jeder
      // einzelne `design.loeschen`-Fehlschlag (z.B. bereits gelöschtes
      // Element) bricht die übrigen nicht ab.
      if (
        !e.repeat &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !fokusImEingabefeld &&
        (e.key === 'Delete' || e.key === 'Backspace')
      ) {
        const { selection, history } = useProject.getState();
        if (selection.length === 0) return;
        e.preventDefault();
        history.beginGroup();
        try {
          for (const id of selection) {
            try {
              runCommand('design.loeschen', { entityId: id });
            } catch (err) {
              meldeFehler(err);
            }
          }
        } finally {
          history.endGroup();
        }
        useProject.getState().select([]);
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
    // E1 (v0.8.5 PA1): Klick ohne Modifier ersetzt (Bestand, byte-gleich);
    // Shift-Klick toggelt das Element in der Mehrfach-Auswahl — Shift auf
    // leerer Fläche lässt die Auswahl bewusst stehen (ArchiCAD-Gefühl).
    onPick: (id, opts) => {
      if (opts?.toggle) {
        if (!id) return;
        const sel = useProject.getState().selection;
        select(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
        return;
      }
      select(id ? [id] : []);
    },
    // E1 (v0.8.5 PA1): Rubber-Band — Menge setzen, mit Shift vereinigen.
    onMarqueeAuswahl: (ids, { additiv }) => {
      const sel = useProject.getState().selection;
      select(additiv ? [...new Set([...sel, ...ids])] : ids);
    },
    // C-11 (PE3-Fix v0.8.4): «Eigenschaften» im Kontextmenü — im
    // Island-Default (kein Dock) öffnet der schwebende Inspector; im
    // manuell-Modus genügt die Auswahl (gedockter Inspector zeigt sie).
    onEigenschaften: (id) => {
      select([id]);
      if (designOberflaeche === 'island') setEigenschaftenFloatOffen(true);
    },
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
      // C-26 (PB5, §7 D8/D13, docs/V084-SPEZ.md): Massketten/Kommentare sind
      // im Kernel NICHT über `design.verschieben` beweglich (`VERSCHIEBBAR`,
      // `plan-hit-test.ts`, PB1-Dateikreis — hier bewusst NICHT erweitert),
      // bekommen aber additiv dieselbe Zieh-Geste — s. `onMoveEnd` unten.
      const beweglich = (kind: string) => VERSCHIEBBAR.has(kind) || kind === 'masskette' || kind === 'kommentar';
      if (!e || !beweglich(e.kind)) {
        select([id]);
        return false;
      }
      // E1/C-5 (v0.8.5 PA1): Anfassen eines Elements, das Teil einer
      // Mehrfach-Auswahl ist, zieht die GANZE (bewegliche) Gruppe — die
      // Auswahl bleibt stehen. Einzelfall unten unverändert (ersetzt).
      const sel = useProject.getState().selection;
      if (sel.length > 1 && sel.includes(id)) {
        const gruppe = sel.filter((sid) => {
          const se = doc.get(sid);
          return !!se && beweglich(se.kind);
        });
        if (gruppe.length > 1) {
          setDragEntity({ id, start: snap(p, magnet), gruppe });
          setDragCursor(p);
          return true;
        }
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
      // E1/C-5 (v0.8.5 PA1): der Zug gilt für die GANZE Gruppe (Mehrfach-
      // Auswahl) bzw. wie bisher für das eine Element — in EINER
      // Undo-Gruppe, ein «Rückgängig» hebt den kompletten Zug auf.
      const gruppe = dragEntity.gruppe ?? [dragEntity.id];
      setDragEntity(null);
      setDragCursor(null);
      if (dx === 0 && dy === 0) {
        // E1/Sanktion 4: Anfassen OHNE Bewegung ist ein Klick — und ein
        // Klick ohne Modifier ERSETZT die Auswahl durch das angefasste
        // Element (Bestandsverhalten). Nur der echte Zug hält die Gruppe.
        if (dragEntity.gruppe) select([dragEntity.id]);
        return;
      }
      const { history } = useProject.getState();
      // E1 (v0.8.8 PA1, docs/V088-SPEZ.md): `design.verschieben` kennt jetzt
      // ALLE hier ziehbaren Kinds (masskette/kommentar/furniture/beam/
      // boundary/etikett inklusive) — der frühere C-26-Workaround
      // (Löschen+Neusetzen mit NEUEN IDs, Status-Nachzug beim Kommentar)
      // ist ersatzlos gefallen: EIN Command je Element, Identität bleibt,
      // die Auswahl muss keiner neuen ID mehr nachlaufen.
      history.beginGroup();
      try {
        for (const id of gruppe) {
          if (!doc.get(id)) continue;
          try {
            runCommand('design.verschieben', { entityId: id, dx, dy });
          } catch (err) {
            meldeFehler(err);
          }
        }
      } finally {
        history.endGroup();
      }
      select([...gruppe]);
    },
    moveOffset:
      dragEntity && dragCursor
        ? (() => {
            const ziel = snap(dragCursor, magnet);
            return {
              id: dragEntity.id,
              dx: ziel.x - dragEntity.start.x,
              dy: ziel.y - dragEntity.start.y,
              ...(dragEntity.gruppe ? { ids: dragEntity.gruppe } : {}),
            };
          })()
        : null,
    // E3 (v0.8.5 PB1, docs/V085-SPEZ.md §7 C-15/C-16/C-17): Griff-Ziehen —
    // PlanView hat den Griff-Treffer bereits VOR dem Element-Hit-Test
    // erkannt (C-17, PlanView.tsx `griffAn`); hier nur noch Start/Vorschau/
    // Commit. `griffKey` ist `'a'|'b'` bei einer Wand, sonst der
    // Punktindex (Masskette-Punkt bzw. Zonen-/Volumen-/Dach-Outline-Ecke).
    onGriffStart: (id, griffKey, p) => {
      const e = doc.get(id);
      if (!e) return false;
      const griffFaehig =
        e.kind === 'wall' ||
        e.kind === 'masskette' ||
        e.kind === 'zone' ||
        e.kind === 'mass' ||
        e.kind === 'roof' ||
        // E5 (v0.8.6 PB3, docs/V086-SPEZ.md §3): Öffnungs-Griff — nur bei
        // Einzel-Auswahl möglich (`griffe` in PlanView liefert dann genau
        // einen Griff-Eintrag, s. dort).
        e.kind === 'opening' ||
        // PA5 (v0.8.7, docs/V087-SPEZ.md §3 E1/C-3): Treppen-Griffe — a/b,
        // bei form 'l' zusätzlich ecke (PlanView `griffe`-Zweig oben liefert
        // die passenden Einträge nur bei Einzel-Auswahl).
        e.kind === 'stair';
      if (!griffFaehig) return false;
      setGriffDrag({ id, key: griffKey, start: snap(p, magnet) });
      setGriffCursor(p);
      return true;
    },
    onGriffDrag: (p) => setGriffCursor(p),
    // Drag-Ende = EIN Command (Wand: kein Endpunkt-Weg über
    // `design.eigenschaftSetzen`, s. `editableFields` in `commands/
    // design.ts` — Löschen+Neusetzen wie bei Masskette/Kommentar oben) bzw.
    // bei Masskette/Zone/Volumen/Dach dasselbe Muster, jeweils EINE
    // history-Gruppe (C-15/C-16 «eine Undo-Gruppe»).
    onGriffEnd: (p) => {
      if (!griffDrag) return;
      const { id, key, start } = griffDrag;
      const ziel = snap(p, magnet);
      setGriffDrag(null);
      setGriffCursor(null);
      // E1/Sanktion-4-Muster (`onMoveEnd` oben): Anfassen OHNE Bewegung ist
      // ein Klick, kein Zug — sonst würde ein blosser Griff-Klick unnötig
      // löschen+neusetzen (neue Id, leerer Undo-Eintrag) statt einfach
      // nichts zu tun (C-17: «Griff-Klick klaut keine Auswahl»).
      if (ziel.x === start.x && ziel.y === start.y) return;
      const e = doc.get(id);
      if (!e) return;
      const { history } = useProject.getState();
      history.beginGroup();
      // C-16-Matrix-Fund (v0.8.5-W3): ERST neu erstellen, DANN das Original
      // löschen — wirft das Erstellen (z.B. `design.dachErstellen` bei
      // nicht-konvexem Ziel-Umriss), ist noch nichts gelöscht und das
      // Original bleibt unangetastet stehen (vorher: Löschen zuerst → das
      // Element war bis zu einem manuellen Ctrl+Z verloren). Dass Neu und
      // Alt innerhalb der Gruppe einen Moment koexistieren, stört keinen
      // Command (keine Überlappungs-Prüfungen auf diesen Wegen).
      try {
        if (e.kind === 'wall') {
          // E1 (v0.8.6 PA2): kein Löschen+Neusetzen mehr — das neue
          // `design.wandGeometrieSetzen` patcht a/b IN PLACE; Identität,
          // height, Umbau-Felder und alle gehosteten Öffnungen bleiben
          // (Kürzer-Wand-Regel passt/clamp/entfernen lebt im Kernel).
          // Auswahl bleibt unverändert dieselbe ID.
          runCommand('design.wandGeometrieSetzen', {
            entityId: e.id,
            ...(key === 'a' ? { a: ziel } : { b: ziel }),
          });
        } else if (e.kind === 'masskette') {
          const mk = e as MassKette;
          const punkte = mk.punkte.map((q, i) => (i === key ? ziel : q));
          const r = runCommand('design.massKetteSetzen', { storeyId: mk.storeyId, punkte });
          runCommand('design.massKetteLoeschen', { massKetteId: mk.id });
          const neueId = neuePatchId(r.patches);
          select(neueId ? [neueId] : []);
        } else if (e.kind === 'zone' || e.kind === 'mass' || e.kind === 'roof') {
          const outline = e.outline.map((q, i) => (i === key ? ziel : q));
          let r;
          if (e.kind === 'zone') {
            const zone = e as Zone;
            r = runCommand('design.zoneErstellen', {
              storeyId: zone.storeyId,
              outline,
              name: zone.name,
              sia: zone.sia,
              ...(zone.raumTyp ? { raumTyp: zone.raumTyp } : {}),
              ...(zone.program ? { program: zone.program } : {}),
              // E2 (v0.8.6 PA1/PA2): das Schema kennt jetzt beide Site-Marker
              // ('parzelle' UND 'nachbar') — der Ist-Wert wird 1:1
              // durchgereicht, keine Marker-Verluste mehr beim Eck-Zug.
              ...(zone.zonenArt ? { zonenArt: zone.zonenArt } : {}),
            });
          } else if (e.kind === 'mass') {
            const mass = e as MassBody;
            r = runCommand('design.volumenErstellen', {
              storeyId: mass.storeyId,
              outline,
              height: mass.height,
              ...(mass.program ? { program: mass.program } : {}),
            });
          } else {
            const roof = e as Roof;
            r = runCommand('design.dachErstellen', {
              storeyId: roof.storeyId,
              outline,
              pitch: roof.pitch,
              overhang: roof.overhang,
              form: roof.form ?? 'walm',
              firstrichtung: roof.firstrichtung ?? 'x',
            });
          }
          runCommand('design.loeschen', { entityId: e.id });
          const neueId = neuePatchId(r.patches);
          select(neueId ? [neueId] : []);
        } else if (e.kind === 'opening') {
          // E5 (v0.8.6 PB3, docs/V086-SPEZ.md §3): Öffnungs-Griff — KEIN
          // Löschen+Neusetzen (anders als oben): `design.eigenschaftSetzen`
          // patcht `center` IN PLACE, Identität bleibt, EIN Undo-Schritt.
          // Ziel wird auf die Wandachse projiziert und geclampt (D6: der
          // Kernel prüft `center` nicht gegen die Wandlänge).
          const o = e as Opening;
          const wall = doc.get(o.wallId);
          if (wall && wall.kind === 'wall') {
            const neuesCenter = projiziereOeffnungCenter(wall as Wall, o.width, ziel);
            runCommand('design.eigenschaftSetzen', { entityId: o.id, feld: 'center', wert: neuesCenter });
          }
        } else if (e.kind === 'stair') {
          // PA5 (v0.8.7, docs/V087-SPEZ.md §3 E1/Sanktion 2): kein Löschen+
          // Neusetzen — `design.treppeGeometrieSetzen` patcht a/b/ecke IN
          // PLACE (Muster `design.wandGeometrieSetzen` oben). Identität/
          // width/form/storeyId bleiben, Auswahl bleibt dieselbe ID, EIN
          // Undo-Schritt. Wirft der Kernel (Lauf < 1 m, Steigungs-Gate,
          // degenerierte Ecke, «ecke» ohne form 'l'), bleibt die Treppe dank
          // `require()` im Kernel unangetastet — `meldeFehler` zeigt den
          // Fehler sichtbar, GENAU wie beim Wand-Zweig oben.
          const stair = e as Stair;
          runCommand('design.treppeGeometrieSetzen', {
            entityId: stair.id,
            ...(key === 'a' ? { a: ziel } : key === 'b' ? { b: ziel } : { ecke: ziel }),
          });
        }
      } catch (err) {
        meldeFehler(err);
      } finally {
        history.endGroup();
      }
    },
    griffOffset:
      griffDrag && griffCursor ? { id: griffDrag.id, key: griffDrag.key, p: snap(griffCursor, magnet) } : null,
    onGroundDoubleClick: (e) => {
      // ArchiCAD-Geste: Doppelklick schliesst/setzt die laufende Platzierung ab
      // — C-10 (Abschluss-Gesetz, PB1): dieselbe Funktion, die auch Enter mit
      // leerem Zahlenpuffer aufruft (s. `mehrpunktAbschliessen` unten, :1298ff).
      mehrpunktAbschliessen(zielPunkt(e.p, e.shiftKey));
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
      // E2 (§2.4, docs/V083-SPEZ.md): Esc schliesst eine laufende Masskette
      // MIT mindestens zwei Punkten ab (wie Doppelklick, s. onGroundDoubleClick)
      // statt sie nur zu verwerfen — analog zum bestehenden Muster hier, nur
      // dass «die Kette behalten» für «messen» heisst: sie committen.
      if (tool === 'messen' && points.length >= 2) {
        massKetteAbschliessen();
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
      } else if (tool === 'oeffnung') {
        // E3 (§3.2, docs/V083-SPEZ.md): ein Klick auf eine Wand ruft
        // `design.oeffnungSetzen` mit `wallId` der getroffenen Wand + den
        // aktuellen `oeffnungVorgabe`-Werten (ZEICHNEN-Insel, «Öffnung»)
        // auf — die Skizze-Geste (`onSketchWandOeffnung`) bleibt UNVERÄNDERT
        // als zweiter, zusätzlicher Weg bestehen.
        const treffer = wandTreffer(useProject.getState().doc, activeStoreyId, p);
        if (treffer) {
          const vorgabe = oeffnungVorgabeLesen();
          try {
            runCommand('design.oeffnungSetzen', {
              wallId: treffer.wallId,
              openingType: vorgabe.openingType,
              center: treffer.center,
              width: vorgabe.width,
              height: vorgabe.height,
              sill: vorgabe.sill,
              swing: vorgabe.swing,
            });
          } catch (err) {
            meldeFehler(err);
          }
        }
      } else if (tool === 'messen') {
        // E2 (§2.4): jeder Klick hängt einen Punkt an `points` an (Muster
        // Wand-Klickmodus oben) — der Abschluss (Doppelklick/Escape) läuft
        // über `massKetteAbschliessen()`, s. `onGroundDoubleClick`/`onEscape`.
        setPoints([...points, p]);
      } else if (tool === 'kommentar') {
        // E1 (§1.4): ein Klick setzt NUR den Punkt — die PROJEKT-Insel
        // (Kommentare-Stufe2/3, `island/inhalte/projekt.tsx`) liest ihn aus
        // dem UI-Store (`kommentarPunkt`) und committet `design.kommentarSetzen`
        // erst mit dem ausgefüllten Erfassen-Formular (Text/Autor sind
        // Pflichtfelder, ein blosser Klick liefert sie nicht).
        useUiZustand.getState().setKommentarPunkt(p);
      }
  }

  /** E2 (§2.4): schliesst die laufende Masskette ab — `design.massKetteSetzen`
   *  mit der gesammelten `points`-Liste, EIN Command-Aufruf (ein Undo-Schritt),
   *  danach `points` geleert. Weniger als zwei Punkte: nur leeren (nichts zu
   *  committen, dieselbe Ehrlichkeit wie die übrigen Zeichenwerkzeuge). */
  function massKetteAbschliessen() {
    if (activeStoreyId && points.length >= 2) {
      try {
        runCommand('design.massKetteSetzen', { storeyId: activeStoreyId, punkte: points });
      } catch (err) {
        meldeFehler(err);
      }
    }
    setPoints([]);
  }

  /** C-10 (PB1, docs/V084-SPEZ.md §7 D8 — Abschluss-Gesetz): schliesst JEDES
   *  Mehrpunkt-Werkzeug ab, aufgerufen von ZWEI Auslösern mit demselben
   *  Ergebnis — `onGroundDoubleClick` (oben, `p` = Doppelklick-Weltpunkt) und
   *  Enter bei leerem Zahlenpuffer (unten, `p` = letzter Cursor-Weltpunkt).
   *  Volumen/Zone/Dach: `p` ergänzt den Umriss um den fehlenden Eckpunkt —
   *  ist `p` bereits der letzte Punkt (Doppelklicks zweiter Klick lief schon
   *  durch `onGroundClick`), wird das Duplikat entfernt statt doppelt
   *  gezählt; ist `p` neu (Enter ohne vorherigen Klick dort), wird er
   *  angehängt — ab 3 Punkten entsteht das Element. Messen: committet die
   *  gesammelte Kette (`massKetteAbschliessen`, ignoriert `p`). Wand/Treppe/
   *  Schnitt haben jeden Punkt schon je Klick committet (`punktSetzen`
   *  :1131ff) — hier endet nur die laufende Kette. */
  function mehrpunktAbschliessen(p: Pt) {
    if (!activeStoreyId) return;
    if (tool === 'volumen' || tool === 'zone' || tool === 'dach') {
      // C-11-Fix (PE3-Matrix v0.8.4, 2. Fassung): `p` nur anhängen, wenn es
      // nicht schon der letzte Punkt ist, und danach KONSEKUTIVE Duplikate
      // filtern — der Doppelklick-Weg liefert denselben Punkt doppelt über
      // die zwei Click-Events (darum existierte das alte `slice(0,-1)`),
      // der Rechtsklick-Weg dagegen gar nicht (dort warf das Slice einen
      // ECHTEN Punkt weg und eine 3-Punkte-Kette schloss nie, PE3-Fund).
      const letzter = points[points.length - 1];
      const roh = letzter && letzter.x === p.x && letzter.y === p.y ? points : [...points, p];
      const outline = roh.filter((q, i) => i === 0 || q.x !== roh[i - 1]!.x || q.y !== roh[i - 1]!.y);
      if (outline.length >= 3) {
        if (tool === 'dach') {
          try {
            runCommand('design.dachErstellen', { storeyId: activeStoreyId, outline, pitch: 35, overhang: 500 });
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
    } else if (tool === 'messen') {
      // E2 (§2.4): EIN `design.massKetteSetzen`-Aufruf, kein eigenes
      // `history.beginGroup()` nötig (Spez §2.4 letzter Satz).
      massKetteAbschliessen();
      return; // massKetteAbschliessen() leert `points` bereits selbst
    }
    // Wand/Treppe/Schnitt: Kette bzw. Antritt/Austritt-Eingabe abschliessen
    setPoints([]);
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
  //
  // C-10 (Abschluss-Gesetz, PB1, docs/V084-SPEZ.md §7 D8): derselbe Listener
  // trägt jetzt auch den Enter-Zahlenpuffer-Sonderfall — Enter mit
  // NICHT-leerem Puffer bleibt unverändert «Zahl bestätigen»
  // (`masseingabeTaste` unten), Enter mit LEEREM Puffer heisst «Werkzeug
  // abschliessen» (`mehrpunktAbschliessen`, geteilt mit dem Doppelklick oben).
  // Der Abschluss-Zweig läuft darum VOR dem `ZEICHEN_WERKZEUGE`-Gate — Messen
  // gehört selbst NICHT zu `ZEICHEN_WERKZEUGE` (kein Ortho/Fluchtlinien-Snap,
  // unverändert), braucht das Abschluss-Gesetz aber genauso; `masseingabe`
  // ist für Messen ohnehin immer leer (die Ziffern-Zweige unten sind hinter
  // demselben Gate versperrt), der Zweig greift also nur bei Enter durch.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (points.length === 0) return;
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (istEingabefeld(document.activeElement)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (!ev.repeat && ev.key === 'Enter' && masseingabe === '') {
        ev.preventDefault();
        ev.stopPropagation();
        mehrpunktAbschliessen(cursor ?? points[points.length - 1]!);
        return;
      }
      if (!ZEICHEN_WERKZEUGE.has(tool)) return;
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
  /**
   * v0.8.1 / P4 (Spez §1.3, Splat-Fusion, sanktioniert durch Owner-Entscheid 5
   * — `toBe(18)` → `toBe(17)`, §8 Sanktion 1): EIN Werkzeug `splat-werkzeug`
   * ersetzt die beiden vorigen getrennten Einträge (`import-splat`/
   * `splat-werkzeug-toggle`). Fallunterscheidung ist reine Chrome-Logik auf
   * bestehenden Stores, kein neuer State: ist bereits eine Splat-Cloud in
   * diesem Projekt geladen (`splatCloud !== null`, derselbe lokale State, den
   * `SplatPanel`/`Viewport3D` schon konsumieren), togglet der Klick nur noch
   * das Panel (bisheriges `splat-werkzeug-toggle`-Verhalten, unverändert
   * übernommen). Ohne geladene Cloud ruft der Klick unverändert
   * `klickImportSplat()` auf (bisheriger Datei-Dialog .splat/.ply; nach
   * erfolgreichem Parse öffnet sich das Panel automatisch wie heute).
   */
  const klickSplatWerkzeug = () => {
    if (splatCloud) {
      setSplatPanelOffen(!splatPanelOffen);
      nutzungMelden('export:splat-werkzeug');
    } else {
      klickImportSplat();
    }
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
    // v0.8.1 / P4 (Spez §1.3, Splat-Fusion, §8 Sanktion 1): die vorigen ZWEI
    // Einträge (`import-splat`/`splat-werkzeug`) sind zu EINEM fusioniert —
    // export-Gruppe schrumpft von 8 auf 7, Gesamtzahl 7+9+1=17 statt 18.
    { gruppe: 'export', id: 'splat-werkzeug', label: 'Splat', aktion: klickSplatWerkzeug },
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

  // v0.7.8 Welle 1 (P3, Dock-Migration): die 12 Design-Panels als
  // `DockPanelEintrag[]` für `DockFlaeche` — `id` MUSS der `PanelId`-Schlüssel
  // aus `ui-zustand.ts` sein (Ausnahme `unternehmerplan`, s.
  // `dock-stationen.ts` Kopfkommentar), `schliessen` bleibt identisch mit dem
  // `onClose`, das der Panel-Inhalt selbst schon bekommt (Doppel-Chrome-
  // Kompromiss, s. `DockPanel.tsx`). `useMemo`, damit Tippen in einem
  // Panel-Feld (React-State dieser Komponente, nicht der Dock-Store) keine
  // neue Array-Referenz erzwingt, wo es nicht nötig ist — `DockFlaeche`
  // selbst entkoppelt zusätzlich über einen reinen Sichtbarkeits-String
  // (s. dortigen Kommentar), diese Memoisierung ist also eine zusätzliche,
  // nicht die einzige Absicherung.
  const designDockPanels: DockPanelEintrag[] = useMemo(
    () => [
      {
        id: 'rasterOffen',
        sichtbar: rasterOffen,
        schliessen: () => setRasterOffen(false),
        inhalt: <RasterPanel onClose={() => setRasterOffen(false)} />,
      },
      {
        id: 'cwSetzenOffen',
        sichtbar: cwSetzenOffen,
        schliessen: () => setCwSetzenOffen(false),
        inhalt: <CurtainWallPanel onClose={() => setCwSetzenOffen(false)} />,
      },
      {
        id: 'splatPanelOffen',
        sichtbar: splatPanelOffen,
        schliessen: () => setSplatPanelOffen(false),
        inhalt: (
          <SplatPanel
            cloud={splatCloud}
            onCloud={(cloud) => {
              setSplatCloudState(cloud);
              setSplatCloud(cloud);
            }}
            onClose={() => setSplatPanelOffen(false)}
          />
        ),
      },
      {
        id: 'maengelOffen',
        sichtbar: maengelOffen,
        schliessen: () => setMaengelOffen(false),
        inhalt: <MaengelPanel onClose={() => setMaengelOffen(false)} />,
      },
      {
        id: 'submissionOffen',
        sichtbar: submissionOffen,
        schliessen: () => setSubmissionOffen(false),
        inhalt: <SubmissionsCheckPanel onClose={() => setSubmissionOffen(false)} />,
      },
      {
        id: 'bauablaufOffen',
        sichtbar: bauablaufOffen,
        schliessen: () => setBauablaufOffen(false),
        inhalt: <BauablaufPanel onClose={() => setBauablaufOffen(false)} />,
      },
      {
        id: 'kvOffen',
        sichtbar: kvOffen,
        schliessen: () => setKvOffen(false),
        inhalt: <KvPanel onClose={() => setKvOffen(false)} />,
      },
      {
        id: 'listeOffen',
        sichtbar: listeOffen,
        schliessen: () => setListeOffen(false),
        inhalt: (
          <BerechnungslistePanel
            wohnungstyp={wohnungstyp}
            setWohnungstyp={setWohnungstyp}
            onClose={() => setListeOffen(false)}
          />
        ),
      },
      {
        id: 'variantenPanelOffen',
        sichtbar: variantenPanelOffen,
        schliessen: () => setVariantenPanelOffen(false),
        inhalt: <VariantenPanel onClose={() => setVariantenPanelOffen(false)} />,
      },
      {
        id: 'studieOffen',
        sichtbar: studieOffen,
        schliessen: () => setStudieOffen(false),
        inhalt: (
          <StudienPanel
            zielGf={zielGf}
            setZielGf={setZielGf}
            maxHoeheM={maxHoeheM}
            setMaxHoeheM={setMaxHoeheM}
            onClose={() => setStudieOffen(false)}
          />
        ),
      },
      {
        // Kein `schliessen` — Sichtbarkeit ist der Daten-Guard
        // (`unternehmerplanSichtbar`), kein Boolean in `ui-zustand.ts`.
        id: 'unternehmerplan',
        sichtbar: unternehmerplanSichtbar,
        inhalt: <UnternehmerplanPanel />,
      },
      {
        id: 'drawOffen',
        sichtbar: drawOffen,
        schliessen: () => setDrawOffen(false),
        inhalt: <DrawPanel />,
      },
      {
        // v0.7.8 Welle 2 (P4): IMMER sichtbar in der Design-Station (kein
        // Toggle) — kein `schliessen`, exakt wie `unternehmerplan` oben.
        id: 'kennzahlen',
        sichtbar: true,
        inhalt: <KennzahlenPanel />,
      },
      {
        // Daten-Guard (Selektion), kein `schliessen` — s. `inspectorSichtbar`
        // Kommentar oben. `Inspector.tsx` selbst rendert weiterhin `null`,
        // solange keine Entität ausgewählt ist (Doppel-Guard: hier NUR damit
        // `DockFlaeche` weiss, ob Platz reserviert werden muss).
        id: 'inspector',
        sichtbar: inspectorSichtbar,
        inhalt: <Inspector />,
      },
      // v0.7.8 Welle 2 (P5): die vier gefloateten Viewport-HUDs — Daten-Guard
      // wie `kennzahlen`/`inspector` oben (kein `…Offen`-Flag), Sichtbarkeit
      // = `viewportHudFloatsSichtbar` (Viewport3D bereit + 3D/Split-Ansicht,
      // s. Kommentar dort). Kein `schliessen` (keine der vier hat einen
      // Schliessen-Weg, s. `dock-stationen.ts` `schliessbar:false`). Jede
      // Komponente ist selbst-genügsam (`ViewportChromeHuds.tsx` liest
      // `viewport-chrome-runtime.ts` direkt) — `inhalt` reicht sie darum
      // ohne weitere Props durch.
      {
        id: 'viewportModusLeiste',
        sichtbar: viewportHudFloatsSichtbar,
        inhalt: <ViewportModusLeisteHud />,
      },
      {
        id: 'viewportModusKarte',
        sichtbar: viewportHudFloatsSichtbar,
        inhalt: <ViewportModusKarteHud />,
      },
      {
        id: 'viewportWerkzeugRail',
        sichtbar: viewportHudFloatsSichtbar,
        inhalt: <ViewportWerkzeugRailHud />,
      },
      {
        id: 'viewportOrientierung',
        sichtbar: viewportHudFloatsSichtbar,
        inhalt: <ViewportOrientierungHud />,
      },
      // v0.7.9 A1 («Säulen ins Dock»): HUD-Statuskarte + Eigenschaften-Panel
      // — die zwei P5-Ausnahmen, jetzt Floats wie die vier oben (gleicher
      // Sichtbarkeits-Guard, gleiches Selbst-Genügsamkeits-Muster; Anker
      // `top-right`, s. `dock-stationen.ts`). Damit ist die letzte fixe
      // ViewportChrome-Säule aufgelöst (ROADMAP 357/358).
      {
        id: 'viewportHudStatuskarte',
        sichtbar: viewportHudFloatsSichtbar,
        inhalt: <ViewportHudStatuskarteHud />,
      },
      {
        id: 'viewportEigenschaften',
        sichtbar: viewportHudFloatsSichtbar,
        inhalt: <ViewportEigenschaftenHud />,
      },
    ],
    [
      rasterOffen,
      cwSetzenOffen,
      splatPanelOffen,
      splatCloud,
      maengelOffen,
      submissionOffen,
      bauablaufOffen,
      kvOffen,
      listeOffen,
      wohnungstyp,
      variantenPanelOffen,
      studieOffen,
      zielGf,
      maxHoeheM,
      unternehmerplanSichtbar,
      drawOffen,
      inspectorSichtbar,
      viewportHudFloatsSichtbar,
      setRasterOffen,
      setCwSetzenOffen,
      setSplatPanelOffen,
      setMaengelOffen,
      setSubmissionOffen,
      setBauablaufOffen,
      setKvOffen,
      setListeOffen,
      setVariantenPanelOffen,
      setStudieOffen,
      setDrawOffen,
      setWohnungstyp,
      setZielGf,
      setMaxHoeheM,
    ],
  );

  /**
   * PD2-Integrationspunkt (`docs/ISLAND-UI-SPEZ.md` §7 PD2-Zeile, Bullet 1):
   * ein Klick in der Island-Leiste aktiviert das ECHTE Werkzeug über die
   * bestehenden Stores/Commands — genau EIN Aufruf pro Erst-Aktivierung
   * (`IslandShell.tsx`s `onWerkzeugAktion`, s. dortigen Kommentar).
   *
   * PD2 aktiviert immer (setzt `true`/wählt), togglet nie ab — anders als
   * die gleichnamigen Kontextzeilen-Knöpfe (`klickSonne` etc., die
   * togglen): im Island-Modus ist die Kontextzeile unsichtbar, ein
   * unsichtbares Ab-Togglen wäre für die Nutzerin nicht nachvollziehbar.
   *
   * Ehrliche Grenze (§3-Mapping-Status, Bericht dokumentiert jeden Fall):
   * - 12 Zeichenwerkzeuge (`toolId` gesetzt, `island-katalog.ts`) → `setTool`
   *   — die neun Bestandswerkzeuge PLUS Öffnung/Messen/Kommentar (v0.8.3 E3,
   *   §8-5/§8-6/§8-7 jetzt Owner-entschieden, eigener Klickmodus in
   *   `punktSetzen()`).
   * - Sonne/Ebenen: bestehende Kontextzeilen-Toggles, hier hart auf "an".
   * - Darstellung/Phase: derselbe Projekt-Menü-Block (`DesignWorkspace.tsx`
   *   Z. ~2780ff) — "aktivieren" heisst hier: das Menü öffnen (Stufe-2-
   *   Feininhalt bleibt PD3-Scope).
   * - Varianten/Liste: bestehende Panel-Flags — real gesetzt, aber ihr
   *   Panel bleibt unsichtbar, solange `DockFlaeche` im Island-Modus
   *   ausgeblendet ist (Sichtbarkeits-Politur ist PD3-Scope, s. Bericht).
   * - Export/Import: bestehendes Exportmenü-Flag.
   * - Manuell: der PD2-Kernschalter (`setDesignOberflaeche`).
   * - PD3c (Owner-Befehl 17.07.): Achsen togglet jetzt echt den geteilten
   *   `state/plan-ansicht.ts`-Store (`hatPopup:false` bleibt — Sofort-
   *   Toggle in der Leiste, kein Popup, s. `island-katalog.ts`-Kommentar) —
   *   dieselbe Stelle, an der `manuell` (ebenfalls `hatPopup:false`) schon
   *   real schaltet.
   * - Alle übrigen 7 Werkzeuge (Trace/Graph/Kennzahlen/Checks/Rendern/
   *   Blätter/Sync): keine Aktion hier — Trace/Graph wirken über ihre
   *   eigenen Stufe-2/3-Schalter in `island/inhalte/ansicht.tsx` (PD3c,
   *   derselbe Store), Rendern/Blätter über die Deep-Link-Brücke
   *   (`island/inhalte/austausch.tsx`); die restlichen bleiben kein Toggle
   *   vorhanden (immer sichtbar) oder andere Station/Shell-Ebene — Rahmen
   *   ohne Aktion, ehrlicher `hinweis` im Popup (`island-katalog.ts`).
   */
  function aktiviereIslandWerkzeug(w: IslandWerkzeug): void {
    if (w.toolId) {
      setTool(w.toolId as ToolId);
      nutzungMelden(`zeichnen:${w.toolId}`);
      return;
    }
    switch (w.id) {
      case 'sonne':
        setSonneOffen(true);
        nutzungMelden('ebenen:sonne');
        return;
      case 'ebenen':
        setTexturModus(true);
        setTexturen(true);
        nutzungMelden('ebenen:textur');
        return;
      case 'achsen': {
        const { achsenAn, setAchsenAn } = usePlanAnsicht.getState();
        setAchsenAn(!achsenAn);
        nutzungMelden('ansicht:achsen');
        return;
      }
      case 'darstellung':
      case 'phase':
        setProjektMenuOffen(true);
        nutzungMelden('projekt:menu');
        return;
      case 'varianten':
        setVariantenPanelOffen(true);
        nutzungMelden('ebenen:studie');
        return;
      case 'liste':
        setListeOffen(true);
        nutzungMelden('ebenen:liste');
        return;
      case 'export':
      case 'import':
        setExportMenuOffen(true);
        return;
      case 'manuell':
        setDesignOberflaeche('manuell');
        return;
      default:
        // Öffnung/Messen/Trace/Graph/Kennzahlen/Checks/Kommentare/Rendern/
        // Blätter/Sync — bewusst kein Aufruf hier, s. Kopfkommentar (Trace/
        // Graph/Rendern/Blätter wirken über ihre eigenen Stufe-2/3-Inhalte).
        return;
    }
  }

  return (
    <div
      className="dw-arbeitsflaeche"
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
      {/* PD2 Default-Flip (`docs/ISLAND-UI-SPEZ.md` §6 Sanktion 1, §7
          PD2-Zeile), PD3c-Verschärfung (Owner-Befehl 17.07., §6 Sanktion 7,
          §8 Frage 10 jetzt Owner-entschieden): die komplette klassische
          Werkzeugleiste (Haupt- + Kontextzeile) rendert nur noch im Modus
          'manuell' — 'island' zeigt NUR Viewer + Islands + Ansichts-Info/
          Stationen-Orb + Kosmo-Orb-Zugang (das `EntwurfsDock` entfällt seit
          PD3c EBENFALLS im Island-Modus, s. dortigen Kommentar bei seinem
          Render-Ort). Ausgeblendet, nicht entfernt: 'manuell' zeigt exakt
          die heutige Oberfläche, byte-gleich. */}
      {designOberflaeche === 'manuell' && (
      <div data-testid="design-werkzeugleiste" className="dw-werkzeugleiste">
        {/* Hauptzeile */}
        <div
          data-testid="design-werkzeugleiste-haupt"
          className="dw-werkzeugleiste-haupt"
        >
          {/* K6 (Owner-Rundgang 0.6.2, S. 3): «KosmoDesign» stand hier UND in
              der App-Kopfzeile (App.tsx, dynamisches Modul-Badge, gilt für
              JEDE Station) — doppelte Beschriftung. Die Kopfzeile ist die
              generische, für alle Stationen gültige Anzeige und bleibt; das
              lokale Duplikat hier fällt weg. */}
          <span
            data-testid="leiste-gruppe-zeichnen"
            className={`${fokusKlasse(stufeFuerGruppe('zeichnen'))} dw-gruppe-s3`}
            style={gruppeHatGehobenesElement('zeichnen') ? { opacity: 1 } : undefined}
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
                  className="k-fb-punkt-burst-anker"
                  onClick={() => {
                    setTool(id);
                    nutzungMelden(`zeichnen:${id}`);
                    zeigePunktBurst(id);
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
                  {punktBurst?.id === id && <PunktBurst key={punktBurst.key} />}
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
          <div className="dw-fuell" />
          {/* SK-D1 (Massnahme 1): Ansicht als kompakte, gerahmte Segment-Gruppe
              statt loser Ghost-Knöpfe — derselbe --k-field/--k-line-Ton wie
              die Kontextzeile signalisiert «hier wird umgeschaltet, nicht
              ausgelöst». testids/Texte unverändert (view-*, '3D'/'3D | Plan'/
              '4er'/'Grundriss'). */}
          <span
            data-testid="leiste-gruppe-ansicht"
            className={`${fokusKlasse(stufeFuerGruppe('ansicht'))} dw-gruppe-ansicht`}
            style={gruppeHatGehobenesElement('ansicht') ? { opacity: 1 } : undefined}
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
                className={viewMode === id ? 'dw-aktiv-rahmen' : undefined}
                style={elementStil('ansicht', id).style}
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
            className={`${fokusKlasse(stufeFuerGruppe('projekt'))} dw-gruppe-inline`}
            style={gruppeHatGehobenesElement('projekt') ? { opacity: 1 } : undefined}
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
          {/* PD2 (C-41): additiver Rückweg AUS 'manuell' — der Vorwärtsweg
              ('manuell' → 'island') ist der 'Manuell'-Insel-Knopf in
              AUSTAUSCH (nur im Island-Modus sichtbar); dieser Knopf ist sein
              Gegenstück, unaufdringlich in derselben Werkzeugleisten-Region.
              Additiv, kein Ersatz — die klassische Fläche bleibt vollständig
              erhalten (§6 Sanktion 6). */}
          <KButton
            size="sm"
            tone="ghost"
            data-testid="island-zurueck"
            title="Zurück zur Island-UI"
            aria-label="Zurück zur Island-UI"
            onClick={() => setDesignOberflaeche('island')}
          >
            Island-UI
          </KButton>
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
          className="dw-werkzeugleiste-kontext"
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
          <div className="dw-kontext-scroll">
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
          {/* v0.8.1 / P4 (Spez §1.2, Werkzeug-Umbau): Schnitt — eigene,
              einknöpfige Kontextzeilen-Gruppe, unmittelbar links von
              `leiste-gruppe-export` (analog `leiste-gruppe-export`/
              `leiste-gruppe-ebenen`). Fachliche Begründung (Spec §1.2): Schnitt
              erzeugt eine ANSICHT (Schnittebene + abgeleitete Darstellung),
              näher an Ansichts-/Navigationsfunktionen als an den Bauteil-
              Werkzeugen (Wand/Volumen/Zone/Dach/Treppe/Stütze) — bleibt aber im
              State-Sinn weiterhin ein Zeichenwerkzeug (`ZEICHEN_WERKZEUG_IDS`
              unverändert, `oberflaeche-adaption.ts`). testid `tool-schnitt`
              bleibt wörtlich, nur der DOM-Elternkontext wechselt (Sanktion 3,
              §8). Eigener `LeistenGruppe`-Schlüssel `schnitt` statt des
              spec-wörtlichen `ansicht` — Kollisions-Begründung im Kommentar
              bei `LeistenGruppe` (`oberflaeche-adaption.ts`). */}
          <span
            data-testid="leiste-gruppe-schnitt"
            className={`${fokusKlasse(stufeFuerGruppe('schnitt'))} dw-gruppe-inline`}
            style={gruppeHatGehobenesElement('schnitt') ? { opacity: 1 } : undefined}
          >
            <KButton
              size="sm"
              tone={tool === 'schnitt' ? 'accent' : 'quiet'}
              className="k-fb-punkt-burst-anker"
              onClick={klickSchnittWerkzeug}
              data-testid="tool-schnitt"
              title={`Schnitt${KURZTASTE_JE_WERKZEUG.schnitt ? ` (${KURZTASTE_JE_WERKZEUG.schnitt})` : ''}`}
              aria-label={`Schnitt${KURZTASTE_JE_WERKZEUG.schnitt ? ` (${KURZTASTE_JE_WERKZEUG.schnitt})` : ''}`}
              {...elementStil('schnitt', 'schnitt')}
            >
              <IconSchnitt /> Schnitt
              {punktBurst?.id === 'schnitt' && <PunktBurst key={punktBurst.key} />}
            </KButton>
          </span>
          <Hairline vertical />
          {/* SK-D1 Massnahme 2 («EIN KMenu Export»): echter Auf/Zu-Trigger,
              STANDARDMÄSSIG OFFEN. Grund für «offen» als Default (dokumentierte
              Wahl, s. Bericht/Grenzen): ein Grep über alle Specs zeigte, dass
              zahlreiche NICHT-W2-Dateien (module.spec, abnahme, splat,
              unternehmerplan*, sim-*, studienbericht) `export-pdf`/`export-dxf`/
              `export-ifc`/`import-*`/`splat-werkzeug` DIREKT anklicken,
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
              <span className="dw-inline-s1">
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
              className={`${fokusKlasse(stufeFuerGruppe('export'))} dw-gruppe-export`}
              style={gruppeHatGehobenesElement('export') ? { opacity: 1 } : undefined}
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
              {/* v0.8.1 / P4 (Spez §1.3, Splat-Fusion): EIN Knopf statt der
                  vorigen zwei («Splat laden» + «Splat-Werkzeug») — ohne
                  geladene Cloud öffnet der Klick den Datei-Dialog (bisheriges
                  `import-splat`-Verhalten), mit geladener Cloud togglet er nur
                  noch das Panel (bisheriges `splat-werkzeug-toggle`-
                  Verhalten). `import-splat`/`splat-werkzeug-toggle` entfallen
                  als testids — einzige sanktionierte testid-Streichung dieser
                  Version (§8 Sanktion 1, Owner-Entscheid 5). */}
              <KButton
                size="sm"
                tone={splatCloud && splatPanelOffen ? 'accent' : 'ghost'}
                data-testid="splat-werkzeug"
                title={splatCloud ? 'Splat-Panel auf-/zuklappen' : 'Splat laden (.splat/.ply)'}
                onClick={klickSplatWerkzeug}
                {...elementStil('export', 'splat-werkzeug')}
              >
                Splat
              </KButton>
            </span>
              )}
            </>
          )}
          <Hairline vertical />
          <Trennlabel icon="ebenen">Ebenen</Trennlabel>
          <span
            data-testid="leiste-gruppe-ebenen"
            className={`${fokusKlasse(stufeFuerGruppe('ebenen'))} dw-gruppe-s3`}
            style={gruppeHatGehobenesElement('ebenen') ? { opacity: 1 } : undefined}
          >
            <KButton
              size="sm"
              tone="ghost"
              data-testid="textur-toggle"
              onClick={klickTextur}
              aria-pressed={texturen}
              className={texturen ? 'dw-aktiv-rahmen' : undefined}
              style={elementStil('ebenen', 'textur').style}
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
                className={`${fokusKlasse(stufeFuerGruppe('faehigkeiten'))} dw-gruppe-s2`}
                style={gruppeHatGehobenesElement('faehigkeiten') ? { opacity: 1 } : undefined}
              >
                {FAEHIGKEITEN.map(({ id, titel, Icon, aktiv, klick, voll }) => (
              <span key={id} className="dw-faehigkeit-wrap">
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
                  className="dw-faehigkeit-btn"
                  // Reihenfolge bewusst: Nutzer-Adaption zuerst, ein
                  // angewendetes Phasen-Preset (falls vorhanden) gewinnt
                  // darüber — Owner-Kontrolle schlägt automatische Vermutung.
                  style={{ ...elementStil('faehigkeiten', id).style, ...faehigkeitStil(id).style }}
                >
                  <Icon />
                </KButton>
                <button
                  type="button"
                  data-testid={`faehigkeit-${id}-voll`}
                  title={`${titel} — Panel voll öffnen`}
                  aria-label={`${titel} — Panel voll öffnen`}
                  onClick={voll}
                  className="dw-faehigkeit-voll"
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
            className={`k-selten dw-adaption-hinweis${adaptionHinweisSichtbar ? '' : ' dw-versteckt'}`}
            title={adaptionHinweisTitel}
          >
            ⓘ angepasst
          </span>
          </div>
          {/* «Mehr…» + Dropdown: ausserhalb der Scroll-Zone (kein Clipping,
              immer sichtbar — Erreichbarkeits-Garantie der Arbeitsmodi),
              flexShrink:0 wie die Verlauf-Gruppe. */}
          <span className="dw-mehr-wrap">
            <KButton
              size="sm"
              tone={mehrOffen ? 'accent' : 'ghost'}
              data-testid="werkzeuge-mehr"
              title="Weitere Werkzeuge — nach Nutzungshäufigkeit sortiert"
              aria-label="Weitere Werkzeuge"
              className={ueberlaufWerkzeuge.length > 0 ? undefined : 'dw-versteckt'}
              onClick={() => setMehrOffen(!mehrOffen)}
            >
              Mehr…
            </KButton>
            {mehrOffen && ueberlaufWerkzeuge.length > 0 && (
              <div
                data-testid="werkzeuge-mehr-liste"
                className="k-dialog dw-dropdown dw-dropdown--unten"
              >
                {ueberlaufWerkzeuge.map((w) => (
                  <KButton
                    key={`${w.gruppe}:${w.id}`}
                    size="sm"
                    tone="ghost"
                    data-testid={`werkzeuge-mehr-eintrag-${w.gruppe}-${w.id}`}
                    className="dw-justify-start"
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
            className={`${fokusKlasse(stufeFuerGruppe('verlauf'))} dw-gruppe-verlauf`}
            style={gruppeHatGehobenesElement('verlauf') ? { opacity: 1 } : undefined}
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
          <Hairline vertical />
          {/* v0.7.8 Welle 1 (P3, Dock-Migration): «Auf schlaues Layout
              zurücksetzen» — löscht NUR Spaltenbreiten/Panel-Overrides der
              Design-Station (dock-zustand.ts), lässt die Sichtbarkeit
              (ui-zustand.ts) unangetastet. Ausserhalb des scrollenden
              Bereichs, damit sie unabhängig vom Kontextzeilen-Inhalt
              erreichbar bleibt (gleiches Muster wie «Rückgängig»/
              «Wiederholen» oben). */}
          <KButton
            size="sm"
            tone="ghost"
            data-testid="dock-zuruecksetzen"
            title="Alle Spaltenbreiten und Panel-Grössen der Design-Station auf die Vorgabe zurücksetzen"
            onClick={() => dockLayoutZuruecksetzen('design')}
          >
            Layout zurücksetzen
          </KButton>
          {/* v0.7.8 Welle 3 (P8): Regeln-Panel — erklärt die Rangfolge/die drei
              Solver-Regeln (`DockRegeln.tsx`, aus der Registry generiert). */}
          <KButton
            size="sm"
            tone="ghost"
            data-testid="dock-regeln-oeffnen"
            title="Erklärt, nach welchen Regeln das Dock Platz vergibt"
            onClick={() => setDockRegelnOffen(true)}
          >
            Regeln
          </KButton>
          {/* Dezenter Einstieg in die geführte Tour (`DockTour.tsx`) — Auftrag
              Teil A Punkt 3: «im Dock-Bereich ggf. dezent». */}
          <KButton
            size="sm"
            tone="ghost"
            data-testid="dock-tour-oeffnen"
            title="Geführte Tour durchs Werkzeug-Dock starten"
            onClick={() => dockTourStarten()}
          >
            Tour
          </KButton>
        </div>
      </div>
      )}
      {dockRegelnOffen && <DockRegeln station="design" onClose={() => setDockRegelnOffen(false)} />}

      {projektMenuOffen && (
        <div
          data-testid="projekt-menu"
          className="dw-projekt-menu"
        >
          <span className="k-sekundaer dw-uppercase-label">
            Projekt-Einstellungen
          </span>
          {/* v0.7.5 A2: Projekt-Stammdaten (Bauherr/Adresse/Parzellennr/
              Verfasser + Projektname-Umbenennen) — eigene Zeile vor den
              Phasen-/Darstellungs-Reglern, da inhaltlich am wenigsten mit
              der Plan-Darstellung zu tun hat. */}
          <span className="dw-stammdaten-wrap">
            <StammdatenPanel />
          </span>
          {/* SIA-Phase (Owner 03.07.): Detaillierungsgrad der Pläne; koppelt den passenden Bemassungs-Stil */}
          <label className="dw-label-g5">
            Phase
            <KSelect
              size="sm"
              value={doc.settings.phase}
              data-testid="phase-stil"
              onChange={(e) => {
                const phase = e.target.value as BauPhase;
                // v0.7.0 E1: Bemassungs-Preset je Plan-Detaillierungsgrad —
                // wettbewerb erbt das Vorprojekt-Preset (frühe Phasen zeichnen
                // reduziert, s. `fruehePhase()`), baueingabe das Bauprojekt-
                // Preset (SIA 400 C.2.2: Gesamt + Höhenkoten, keine feinen
                // Innenketten vor dem Werkplan).
                const bemassung = {
                  wettbewerb: { aussenKetten: 'gesamt' as const, innenKetten: false, hoehenKoten: false },
                  vorprojekt: { aussenKetten: 'gesamt' as const, innenKetten: false, hoehenKoten: true },
                  // SIA 400 C.2.2 (Lehrheft-Abgleich): Bauprojekt nur Haupt-/Gesamtmasse
                  bauprojekt: { aussenKetten: 'gesamt' as const, innenKetten: false, hoehenKoten: true },
                  baueingabe: { aussenKetten: 'gesamt' as const, innenKetten: false, hoehenKoten: true },
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
                setMassstabHinweis(`${phaseLabel(phase)}: Plan-Export neu 1:${PHASEN_MASSSTAB[phase]} (SIA-Empfehlung).`);
              }}
            >
              <option value="wettbewerb">{phaseLabel('wettbewerb')}</option>
              <option value="vorprojekt">{phaseLabel('vorprojekt')}</option>
              <option value="bauprojekt">{phaseLabel('bauprojekt')}</option>
              <option value="baueingabe">{phaseLabel('baueingabe')}</option>
              <option value="werkplan">{phaseLabel('werkplan')}</option>
            </KSelect>
          </label>
          {/* SIA-Teilphase (v0.6.3, Lücken-Batch 1): der reale Projektstand im
              SIA-102/112-Zyklus — bewusst GETRENNT vom Plan-Detaillierungsgrad
              («Phase» links) und NICHT automatisch gekoppelt (Owner-Kontrolle).
              Die Kosmo-Zusammenfassung des Commands nennt den passenden
              Detaillierungsgrad als reinen Vorschlag. */}
          <label
            className="dw-label-g5"
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
                // 'strategie' seit 0.7.2: die SIA-112-Phasen-Leiste im Header
                // schreibt sie als repräsentative Phase — ohne die Option
                // zeigte das Dropdown dann einen leeren Wert (Kritik-3-Befund).
                ['strategie', 'wettbewerb', 'vorprojekt', 'bauprojekt', 'bewilligung', 'ausschreibung', 'ausfuehrung', 'abnahme'] as const
              ).map((p) => (
                <option key={p} value={p}>
                  {siaPhaseLabel(p)}
                </option>
              ))}
            </KSelect>
          </label>
          {/* Bemassungs-Stil (V2-A5): Presets als Projekteinstellung, undo-fähig */}
          <label className="dw-label-g5">
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
          {/* v0.7.0 E3: 3D-Darstellungsmodus — Override zur Phasen-Automatik
              (weiss bis inkl. Baueingabe, Material ab Ausschreibung). Reine
              Projektsemantik (Yjs/Undo), der Textur-Toggle am Viewport
              bleibt separat lokal. */}
          <label className="dw-label-g5">
            Darstellung
            <KSelect
              size="sm"
              value={doc.settings.darstellung3d ?? 'auto'}
              data-testid="darstellung-3d"
              onChange={(e) => {
                const darstellung3d = e.target.value as 'auto' | 'material' | 'weiss' | 'schwarz';
                runCommand('design.darstellung3dSetzen', { darstellung3d });
              }}
            >
              <option value="auto">Automatisch (Phase)</option>
              <option value="material">Material</option>
              <option value="weiss">Weissmodell</option>
              <option value="schwarz">Schwarzmodell</option>
            </KSelect>
          </label>
          {/* v0.7.0 E2: Poché-Modus — Override zur Phasen-Automatik (Schwarz
              vom Wettbewerb bis zur Baueingabe, Werkplan bleibt Material). */}
          <label className="dw-label-g5">
            Poché
            <KSelect
              size="sm"
              value={doc.settings.pocheModus ?? 'phase'}
              data-testid="poche-modus"
              onChange={(e) => {
                const pocheModus = e.target.value as 'phase' | 'schwarz' | 'material';
                runCommand('design.pocheModusSetzen', { pocheModus });
              }}
            >
              <option value="phase">Nach Phase</option>
              <option value="schwarz">Immer schwarz</option>
              <option value="material">Immer Material</option>
            </KSelect>
          </label>
          {/* H-42: Öffnungsflügel-Bogen bei parametrischen Fenstern im
              Grundriss — Owner-Schalter, Default an (Bestandsverhalten). */}
          <label
            className="dw-label-g6"
          >
            <input
              type="checkbox"
              data-testid="fenster-boegen"
              checked={doc.settings.fensterBoegen !== false}
              onChange={(e) => runCommand('design.fensterBoegenSetzen', { fensterBoegen: e.target.checked })}
            />
            Fensterbögen im Grundriss
          </label>
          <span className="dw-hinweis-faint">
            Ändert sich mit der SIA-Phase des Projekts — bleibt über Jahre stabil, gehört nicht in die Dauerleiste.
          </span>
          {/* Serie J / J3c (Regel 2.3.4): Opt-out + Reset für die adaptive
              Werkzeugleiste. Der Schalter setzt NUR `aktiv` (setAdaptionAktiv,
              Fable-Review-2-Auflage J3c-1) — Reset löscht NUR das gelernte
              Profil, der Schalter bleibt in beiden Richtungen unangetastet. */}
          <label
            className="dw-label-g6"
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
        <div className="dw-sonne-row">
          <span className="dw-faint" data-testid="sonne-standort-label">
            Schattenstudie · {useProject.getState().doc.settings.standort?.label ?? 'Innerschweiz (Standard)'}
          </span>
          <StandortSuche />
          <input
            type="date"
            value={sonnenDatum}
            data-testid="sonne-datum"
            onChange={(e) => setSonnenDatum(e.target.value)}
            className="dw-input-datum"
          />
          <input
            type="range"
            min={5}
            max={22}
            step={0.25}
            value={sonnenStunde}
            data-testid="sonne-stunde"
            onChange={(e) => setSonnenStunde(Number(e.target.value))}
            className="dw-slider-sonne"
          />
          <span className="dw-mono-zeit">
            {String(Math.floor(sonnenStunde)).padStart(2, '0')}:{String(Math.round((sonnenStunde % 1) * 60)).padStart(2, '0')}
          </span>
          <span className="dw-faint">
            21.&nbsp;März/Sept. für den 2h-Nachweis, 21.&nbsp;Juni/Dez. für die Extreme.
          </span>
        </div>
      )}

      {bestand && (
        <div
          data-testid="bestand-angebot"
          className="dw-banner"
        >
          <Badge hue={moduleHue.design}>Bestand</Badge>
          <span>
            Im IFC erkannt: {bestand.waende.length} Wände, {bestand.decken.length} Decken — als
            editierbare Bauteile übernehmen? (ein Undo-Schritt; Rest bleibt Kontext)
          </span>
          <div className="dw-fuell" />
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
          className="dw-banner"
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
          <div className="dw-fuell" />
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
          className="dw-banner dw-banner--knapp"
        >
          <Badge hue={moduleHue.design}>Massstab</Badge>
          <span>{massstabHinweis} Der Blatt-Editor (KosmoPublish) wählt weiterhin frei.</span>
          <div className="dw-fuell" />
          <KButton size="sm" tone="ghost" data-testid="massstab-ok" onClick={() => setMassstabHinweis(null)}>
            Verstanden
          </KButton>
        </div>
      )}
      {/* Ansichten: synchron auf demselben Modell + denselben Werkzeugen */}
      <div
        className="dw-viewport-container"
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
            className="dw-uplan-drop"
          >
            Unternehmerplan hier ablegen — DXF wird verglichen, PDF wird erkannt
          </div>
        )}
        {/* v0.7.8 Welle 1 (P3, «Intelligente Werkzeugtabs», Herzstück), erweitert
            Welle 2 (P4, Rechts-Stack-Migration): die 14 Design-Panels sassen
            ursprünglich hier als handgetunte `position:'absolute'`-Overlays
            (feste `left/top:52` bzw. `right:12/top:52` — kollidierten bei
            genug gleichzeitig offenen Panels sichtbar). Jetzt EIN
            kollisionsfreier Dock (`shell/dock/DockFlaeche.tsx`, Solver in
            `state/dock-kern.ts`): Sichtbarkeit bleibt exakt wie vorher in
            `ui-zustand.ts` (jedes Panel bekommt weiterhin GENAU denselben
            `onClose`, den es schon hatte — nur zusätzlich an `DockFlaeche`
            gespiegelt, damit auch der Dock-Kopf schliessen kann, s.
            `DockPanel.tsx`-Kommentar zum Doppel-Chrome-Kompromiss). P4 zieht
            die letzten zwei verbliebenen Design-Überlagerungen —
            `<KennzahlenPanel/>`/`<Inspector/>`, vorher als eigene
            Geschwister GLEICH NACH dieser Zeile gerendert — ebenfalls in
            `designDockPanels` hinein (rechte Spalte, Daten-Guards, s.
            `dock-stationen.ts`/`inspectorSichtbar`-Kommentar oben); sie
            haben deshalb hier KEINE eigenen `<KennzahlenPanel/>`/
            `<Inspector/>`-Zeilen mehr. Reihenfolge im Array ist beliebig —
            der Solver sortiert nach `wichtigkeit` aus `dock-stationen.ts`,
            nicht nach Array-Reihenfolge. */}
        {/* PD2 Default-Flip: die Dock-Fläche (Panels wie Kennzahlen/Varianten/
            Liste/Inspector/…) rendert nur im Modus 'manuell' — im
            Island-Modus bleiben die dahinterliegenden Store-Flags real
            (Island-Werkzeuge können sie setzen, s. `aktiviereIslandWerkzeug`),
            nur ihre Anzeigefläche ist ausgeblendet (Sichtbarkeits-Politur
            ist PD3-Scope). */}
        {designOberflaeche === 'manuell' && <DockFlaeche station="design" panels={designDockPanels} />}
        {/* C4b (C-E4): Daten-Guard bleibt — die Karten-Liste im
            Unternehmerplan-Panel erscheint automatisch, sobald ein
            Unternehmerplan geladen ist (kein eigener Toggle). Der Dock oben
            reserviert dafür Platz via `unternehmerplanSichtbar` (derselbe
            Guard, gespiegelt); das Panel selbst entscheidet weiterhin intern
            (`UnternehmerplanPanel.tsx`), ob es Karten oder den PDF-Hinweis
            zeigt, oder — theoretisch — `null` (Dock hat dann kein Rechteck
            reserviert, konsistent). */}
        {viewMode === 'quad' ? (
          <div
            className="dw-quad-grid"
          >
            <div className="dw-quad-zelle--3d">
              <Viewport3D handlers={handlersRef} />
            </div>
            <div className="dw-quad-zelle">
              <PlanView handlers={handlersRef} onLod={setPlanLodStufe} />
            </div>
            <div className="dw-quad-zelle">
              <SectionView spec={sectionSpec} title="Schnitt" />
            </div>
            <div className="dw-quad-zelle">
              <SectionView spec={elevationSpec} title="Ansicht Süd" />
            </div>
          </div>
        ) : (
          <>
            {viewMode !== '2d' && (
              /* W2-Quergate-Nachtrag v0.8.4: eigener Split-Marker fürs
                 3D-Pane (dw-viewport-flex--getrennt ist die Borte des
                 RECHTEN Plan-Panes und passt hier nicht) — Ziel ist die
                 Render-Ecken-Anhebung in viewport3d-chrome.css, s. dort. */
              <div className={`dw-viewport-flex${viewMode === 'split' ? ' dw-viewport-flex--split-3d' : ''}`}>
                <Viewport3D handlers={handlersRef} />
              </div>
            )}
            {viewMode !== '3d' && (
              <div
                className={`dw-viewport-flex${viewMode === 'split' ? ' dw-viewport-flex--getrennt' : ''}`}
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

        {/* v0.7.2 §7 (W3-E): Abspiel-Overlay «Kosmo zeichnet sichtbar» — pointer-events:none, rendert nur während eines Vorspiels. */}
        <KosmoZeichnet />

        {/* Block 3 / E4 (Buildplan FM3): meshEdit-Overlay — Vertex-Handles/
            Flächen-Pick laufen im Viewport (Viewport3D.tsx), dieses Panel
            trägt nur die Distanz-Eingabe + die beiden Aktions-Knöpfe. Kein
            allgemeines Gizmo-Framework (§5), nur dieser eine Modus. */}
        {meshEditId && (
          <div
            data-testid="mesh-edit-panel"
            className="k-dialog dw-mesh-panel"
          >
            <div className="dw-row-s3">
              <Badge hue={moduleHue.design}>Mesh bearbeiten</Badge>
            </div>
            <span className="dw-faint">
              Handle ziehen verschiebt die Ecke (Shift = nur Höhe) · Klick auf eine Fläche wählt sie zum Extrudieren.
            </span>
            {meshFace !== null && (
              <div className="dw-stack-s2">
                <span className="dw-faint">Fläche {meshFace} ausgewählt</span>
                <label className="dw-label-inline">
                  <input
                    type="number"
                    value={meshDistanz}
                    data-testid="mesh-extrude-distanz"
                    onChange={(e) => setMeshDistanz(Number(e.target.value))}
                    className="dw-input-mesh"
                  />
                  <span className="dw-faint">mm — negativ = einwärts</span>
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
            NavLeiste/Statusleiste (unten).
            PD3c (Owner-Befehl 17.07., wörtlich: «achtung ich sehe noch docks
            und so auf den screenshots z.b die grunddock..alles weg bitte
            alles in die islands...», `docs/ISLAND-UI-SPEZ.md` §8 Frage 10
            jetzt Owner-entschieden): im Island-Modus entfällt das
            EntwurfsDock ersatzlos — `StationenOrb` (unten, immer im Island-
            Modus gerendert) übernimmt den Direktzugang zu den anderen vier
            Stationen, `IslandBuehne`s ZEICHNEN-Insel übernimmt Skizze/CAD.
            Im Modus 'manuell' bleibt der Dock byte-gleich wie heute. */}
        {designOberflaeche === 'manuell' && (
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
          skizzeAktiv={tool === 'skizze'}
          onSkizzeWerkzeug={klickSkizzeWerkzeug}
        />
        )}

        {/* Geschossleiste — v0.6.5 (W2, SK-D3): gerahmter Karteikarten-
            Container statt kontextlos schwebender Knöpfe (Owner-Befund
            «kollidiert optisch mit Dock-Icons darunter»). `k-karte` liefert
            die 45°-Ecke + `--k-raised` (UI-KONZEPT-065 §2 Hierarchie-Rezept,
            frozen `packages/kosmo-ui`); Randfarbe wird auf --k-line-strong
            angehoben (`k-karte` selbst nutzt --k-technik für Werkplan-Karten,
            hier ist es keine Werkplan-Karte). Dockt jetzt bündig an die
            Viewport-Kante (0/0 statt 12/12), testids/Texte unverändert. */}
        {/* PD2 Default-Flip: Geschossleiste nur im Modus 'manuell' — die
            Geschoss-Wahl selbst bleibt im Island-Modus über die
            Ansichts-Info erreichbar (`ansichts-info-geschoss-*`). */}
        {designOberflaeche === 'manuell' && (
        <div
          ref={geschossleisteRef}
          data-testid="geschossleiste"
          className="k-karte dw-geschossleiste"
          // Testlauf-Befund: bei Hochhäusern (20+ Geschossen) lief die Liste
          // sonst unten aus dem Viewport — Höhe deckeln, dann scrollt sie.
          // v0.7.9 (B2): zusätzlich gegen die Oberkante des EntwurfsDock
          // geklemmt (gemessen, s. `geschossMaxHoehe`-Effekt oben) — bis zur
          // ersten Messung (Erstmount) gilt die alte reine Prozent-Grenze
          // als Fallback, danach gewinnt stets das engere `Math.min` beider
          // Grenzen.
          style={{ maxHeight: geschossMaxHoehe != null ? `${geschossMaxHoehe}px` : 'calc(100% - 24px)' }}
        >
          {storeys.map((s: Storey) => (
            <KButton
              key={s.id}
              size="sm"
              tone="ghost"
              onClick={() => setActiveStorey(s.id)}
              data-testid={`storey-${s.name}`}
              aria-pressed={s.id === activeStoreyId}
              className={s.id === activeStoreyId ? 'dw-aktiv-rahmen' : undefined}
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
              Statt eines 18. Werkzeugs (Vertrag toBe(17) seit der Splat-Fusion
              v0.8.1/P4, vorher toBe(18) — im Mehr…-Menü bliebe sonst instabil)
              ein Panel-Knopf hier — er braucht ein Umriss-
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
              eines 18. Werkzeugs — der Vertrag toBe(17) (seit v0.8.1/P4,
              vorher toBe(18)) im Mehr…-Menü
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
          {/* v0.7.0 Stream 5A: derive/variantensuche.ts (E5-i) hatte keine
              UI-Fläche. Gleiches Muster wie «Fensterband»/«Decke» oben (H-7):
              ein Panel-Knopf statt eines 18. Werkzeugs — der Vertrag toBe(17)
              (seit v0.8.1/P4, vorher toBe(18);
              e2e/oberflaeche-minimal.spec.ts, UEBERLAUFFAEHIGE_WERKZEUGE)
              bleibt unberührt. Lebt neben «Wohnungen schneiden»
              (BerechnungslistePanel.tsx, listeOffen) im selben Sinn: beides
              Werkzeuge rund um die Wohnungs-Segmentierung des aktiven
              Geschosses. */}
          <KButton
            size="sm"
            tone="ghost"
            data-testid="varianten-oeffnen"
            title="Anytime-Variantensuche + Kennzahl-Matrix für die Wohnungs-Segmentierung des aktiven Geschosses"
            onClick={() => setVariantenPanelOffen(true)}
          >
            Varianten
          </KButton>
        </div>
        )}

        {/* PD2 Default-Flip: Island-Bühne nur im Modus 'island'. PD3c
            (Owner-Befehl 17.07.): das `EntwurfsDock` — bislang der
            Kosmo-Orb-Zugang («entwurf-sprechen»-Kachel) — entfällt jetzt
            selbst im Island-Modus (s. seinen Render-Ort oben); `App.tsx`
            rendert dafür das freistehende `<KosmoSymbol>` (sonst nur auf der
            Zentrale/Home) zusätzlich auch hier, damit der Kosmo-Orb-Zugang
            erhalten bleibt (App.tsx-Kopfkommentar bei
            `bodenDockAusgeblendet`).
            PB3 (`docs/V084-SPEZ.md` §8 C-24, §5 W3): `StationenOrb`/
            `AnsichtsInfo` sind HIER ausgezogen — sie rendern seither
            zentral in `App.tsx` (derselbe `bodenDockAusgeblendet`-Guard,
            der schon die Logo-/Einstellungs-Kreise trägt), damit die
            vis-Station denselben Bühnenkopf bekommt, ohne
            `VisWorkspace.tsx` anzufassen. `onStationOeffnen`/`onZurZentrale`
            bleiben als Props bestehen (weiterhin von
            `registriereStationsWeg` unten UND dem `EntwurfsDock` im Modus
            'manuell' gebraucht) — nur ihr dritter frühere Verbraucher
            (`StationenOrb` hier) ist entfallen. */}
        {designOberflaeche === 'island' && (
          <>
            <IslandBuehne onWerkzeugAktion={aktiviereIslandWerkzeug} />
            {/* PD4: der echte Kosmo-Orb-Zugang, s. Import-Kommentar oben. */}
            <KosmoOrb {...(onKosmoOeffnen ? { onKosmoOeffnen } : {})} />
            {/* C-11 (PE3-Fix v0.8.4): «Eigenschaften» aus dem Kontextmenü —
                derselbe `<Inspector/>` wie im manuell-Dock, als schwebende
                Glas-Karte; Esc/Aussenklick schliesst (E2-Gesetz-Muster). */}
            {eigenschaftenFloatOffen && (
              <EigenschaftenFloat onClose={() => setEigenschaftenFloatOffen(false)}>
                <Inspector />
              </EigenschaftenFloat>
            )}
          </>
        )}

        {/* Statusleiste (Serie K A5, K15 Aufgabe 3): Zero-Click-Kennzahlen an
            der Unterkante des Design-Viewports — aktives Werkzeug, Plan-LOD-
            Stufe (`planLod.ts`, B2), aktives Geschoss, m²-Kurzwert. Ersetzt
            kein Panel — die Werte standen vorher NUR hinter einem Klick
            (Werkzeugleiste/Geschossleiste/Berechnungsliste) oder gar nicht
            beisammen. Bewusst unterhalb der bestehenden Statuszeile ergänzt,
            nicht als zweite Leiste — «eine» dezente Leiste, wie beauftragt. */}
        {/* v0.8.0B / W3 (Spez §4 B-49) — Statuszeilen-Anatomie: 30px, Mono-11-
            Chips (Pill-Form, `--k-flaeche-zwischen`-Grund mit Papier-Fallback
            auf `--k-surface`), KStatuszeile-Rezept (hud.tsx/aura.css) als
            Vorlage. testids/Inhalte/Position (absolute, bottom:12 — Spec-Test-
            Vertrag `boden-dock.spec.ts`/`dock-layout.spec.ts`) bleiben
            WÖRTLICH; KEIN `text-transform:uppercase` auf den Wert-Chips —
            Playwright vergleicht gerenderten Text (`toContainText(
            'Ausschreibung')`, `faehigkeiten-phasen.spec.ts`). */}
        {/* PD3c (Owner-Befehl 17.07. «alles weg bitte alles in die
            islands...», `docs/ISLAND-UI-SPEZ.md` §6 Sanktion 7): die
            komplette Statusleiste (Fokus/Arbeiten/Prüfen-Presets, Modus-Chip,
            Klick-Hinweise) rendert nur noch im Modus 'manuell' — im Island-
            Modus tragen Ansichts-Info/Islands dieselbe Information. */}
        {designOberflaeche === 'manuell' && (
        <div
          data-testid="statusleiste"
          // Kritik-065 Befund [B] «Abgeschnittenes Label unten rechts»:
          // `right:12` liess den letzten Eintrag («Klick: …») bis unter
          // das fixe Kosmo-Symbol laufen (right:22/bottom:22, 54px,
          // z-110 — s. Begründung in NavLeiste.tsx), das den Text
          // optisch abschnitt. Dieselbe Klärung (right:88), die
          // `NavLeiste.tsx` fürs `nav-fit`-Werkzeug schon nutzt (`dw-statusleiste`, design.css).
          className="dw-statusleiste"
        >
          <span
            data-testid="statusleiste-werkzeug"
            className="dw-status-chip"
          >
            {WERKZEUG_KURZLABEL[tool]}
          </span>
          <span
            data-testid="statusleiste-geschoss"
            className="dw-status-chip"
          >
            {storeys.find((s: Storey) => s.id === activeStoreyId)?.name ?? '–'}
          </span>
          <span
            data-testid="statusleiste-lod"
            title="Plan-Detaillierungsgrad (zoomabhängig)"
            className="dw-status-chip"
          >
            {LOD_KURZLABEL[planLodStufe]}
          </span>
          <span
            data-testid="statusleiste-flaeche"
            title="Ausgezogene SIA-Fläche (NGF) des aktiven Geschosses"
            className="dw-status-chip"
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
            className="dw-status-chip"
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
          <span className="dw-modus-chip-wrap">
            <button
              type="button"
              className={`k-druck dw-modus-chip-btn${modusAkzent ? ' dw-modus-chip-btn--akzent' : ''}`}
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
                className="k-dialog dw-dropdown dw-dropdown--oben dw-dropdown--breit"
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
                    <div key={m} className="dw-stack">
                      <button
                        type="button"
                        className={`k-druck dw-menu-item-btn${arbeitsmodus === m ? ' dw-modus-item-btn--aktiv' : ''}`}
                        data-testid={`modus-item-${m}`}
                        aria-pressed={arbeitsmodus === m}
                        onClick={() => modusHandVonListeWaehlen(m)}
                      >
                        {ARBEITSMODUS_LABEL[m]}
                      </button>
                      {begruendung.length > 0 && (
                        <span
                          data-testid={`modus-chip-begruendung-${m}`}
                          className="dw-begruendung"
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
                  className="k-druck dw-menu-item-btn"
                  data-testid="modus-festhalten"
                  aria-pressed={modusFesthalten}
                  onClick={modusFesthaltenUmschalten}
                >
                  {modusFesthalten ? 'Festhalten aufheben' : 'Festhalten'}
                </button>
                <button
                  type="button"
                  className="k-druck dw-menu-item-btn"
                  data-testid="modus-automatik"
                  aria-pressed={!modusAutomatik}
                  onClick={modusAutomatikUmschalten}
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
              className="dw-ortho-badge"
            >
              ⊥ Ortho
            </span>
          )}
          {lastEntry && (
            <span
              className="dw-mono-chip"
              data-testid="last-action"
            >
              {lastEntry.summary}
            </span>
          )}
          <span className="dw-fuell" />
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
            className="dw-hint-chip"
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
              <span data-testid="live-flaeche" className="dw-live-flaeche">
                {m2.toFixed(0)} m²{tool === 'volumen' ? ` · GF ~${(m2 * geschosse).toFixed(0)} m²` : ''}
              </span>
            );
          })()}
          {/* v0.8.0 / Paket PD2 (Default-Oberflächen) — kompakter Preset-
              Schnellzugriff in der Kontextzeile, neben den Zero-Click-
              Kennzahlen. Dieselbe Anwend-Funktion wie der Einstellungen-Wähler
              und `ui.dockPresetSetzen` (`presetAnwenden()`) — EIN Weg, drei
              Zugänge. Die umgebende Statusleiste ist `pointerEvents:'none'`
              (Zero-Click), darum wie beim Modus-Chip ein gezieltes
              `pointerEvents:'auto'`-Override auf dieser einen Gruppe. */}
          <span
            data-testid="dock-preset-schnellzugriff"
            role="group"
            aria-label="Oberflächen-Preset"
            title="Fokus/Arbeiten/Prüfen — kuratierte Layout-Presets (auch in Einstellungen → Darstellung)"
            className="dw-preset-wrap"
          >
            {PRESET_IDS.map((id) => (
              <button
                key={id}
                type="button"
                data-testid={`dock-preset-${id}`}
                aria-pressed={aktivesPresetDesign === id}
                onClick={() => presetAnwenden('design', id)}
                className={`dw-preset-item${aktivesPresetDesign === id ? ' dw-preset-item--aktiv' : ''}`}
              >
                {PRESET_KURZLABEL[id]}
              </button>
            ))}
          </span>
        </div>
        )}
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

  return (
    <div
      data-testid="studien-panel"
      className="k-dialog dw-studien-panel"
    >
      <div className="dw-row-s3">
        <Badge hue={moduleHue.design}>Volumenstudien</Badge>
        <span className="dw-fuell" />
        <KButton size="sm" tone="ghost" onClick={onClose}>×</KButton>
      </div>
      {!parzelle ? (
        <div className="dw-hinweis-block">
          Zeichne zuerst die <b>Parzelle als Zone</b> (Werkzeug «Zone») — die zuletzt
          gezeichnete Zone des Geschosses gilt als Baufeld.
        </div>
      ) : (
        <>
          <div className="dw-faint">
            Parzelle: «{parzelle.name}» · Grenzabstand {grenzabstandAnzeigeM} m
          </div>
          {zonenRegel &&
            (regelOptionen.maxHoehe !== undefined ||
              regelOptionen.zielGf !== undefined ||
              regelOptionen.grenzabstand !== undefined) && (
              <div data-testid="studie-regel-hinweis" className="dw-faint-klein">
                aus Zonenregel «{zonenRegel.name}»
              </div>
            )}
          <div className="dw-row-s4">
            <label className="dw-label-soft-g5">
              GF-Ziel
              <input
                type="number"
                value={zielEffektiv}
                data-testid="studie-gf"
                onChange={(e) => setZielGf(Number(e.target.value))}
                className="dw-input-studien"
              />
              m²
            </label>
            <label className="dw-label-soft-g5">
              max.
              <input
                type="number"
                value={maxHoeheM}
                onChange={(e) => setMaxHoeheM(Number(e.target.value))}
                className="dw-input-studien dw-input-studien--44"
              />
              m
            </label>
          </div>
          <div className="dw-row-wrap-s2">
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
          <div className="dw-row-s4-wrap">
            <label className="dw-label-soft-g5">
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
                className="dw-input-studien dw-input-studien--56"
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
          <div data-testid="studie-geschosshoehe-anzeige" className="dw-faint-klein">
            Geschosshöhe {geschosshoeheEffektivM.toFixed(2)} m — {geschosshoeheHerkunftLabel[geschosshoeheHerkunft]}
          </div>
          {varianten.map((v) => (
            <div
              key={v.id}
              data-testid={`variante-${v.id}`}
              className="dw-variante-karte"
            >
              <div className="dw-row-baseline">
                <b>{v.name}</b>
                <span className="dw-faint">
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
              <div className="dw-beschrieb">{v.beschrieb}</div>
              {v.hinweise.length > 0 && (
                <div className="dw-hinweise-klein">
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
          <span className="dw-faint-klein">
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
    <div data-testid="varianten-matrix" className="dw-stack-s1">
      <div className="dw-faint-klein">
        Vergleich (oben = besser){aktiv ? ` — ${matrix.zeilen.find((z) => z.id === aktiv)?.name}` : ''}
      </div>
      <svg viewBox={`0 0 ${W} ${H + 14}`} className="dw-svg-voll">
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
              className="dw-cursor-pointer"
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
    <div className="dw-fassaden-sektion" data-testid="fassadenmodule">
      <div className="dw-row-s3">
        <span className="dw-titel-klein">Fassaden-Module</span>
        <div className="dw-fuell" />
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
        <div className="dw-row-s2-klein">
          <span className="dw-soft">Gezeichnet</span>
          <KSelect
            size="sm"
            value={modulName ?? ''}
            data-testid="modul-wahl"
            onChange={(e) => setModulName(e.target.value || null)}
            className="dw-fuell"
          >
            <option value="">— freie Masse —</option>
            {module.map((m) => (
              <option key={m.name} value={m.name}>{m.name} ({(m.breite / 1000).toFixed(2)} × {(m.hoehe / 1000).toFixed(2)})</option>
            ))}
          </KSelect>
        </div>
      )}
      {editorOffen && <ModulEditor onClose={() => setEditorOffen(false)} />}
      <div className="dw-row-s3-klein">
        <span className="dw-soft">Modul</span>
        <input type="number" value={modB} step={50} onChange={(e) => setModB(Number(e.target.value) || 2500)} className="dw-input-modul" data-testid="modul-b" />
        <span>×</span>
        <input type="number" value={modH} step={50} onChange={(e) => setModH(Number(e.target.value) || 3000)} className="dw-input-modul" />
        <span className="dw-faint">mm</span>
      </div>
      <div className="dw-text-klein" data-testid="module-bilanz">
        {studie.totalModule} Standardmodule · {studie.totalPassstuecke} Passstücke · Wiederholung{' '}
        {(studie.wiederholung * 100).toFixed(0)}%
      </div>
      {module.length > 0 && (
        <div className="dw-zuweisung-liste" data-testid="fassaden-zuweisung">
          {studie.zeilen.map((z) => (
            <div key={`${z.massId}-${z.kante}`} className="dw-row-s2">
              <span className="dw-kante-label">
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
                className="dw-fuell"
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
      <span className="dw-faint-klein">
        Eckenregel: Module ab Ecke, Passstück am Kantenende — Vorfabrikation lebt von der Wiederholung.
      </span>
    </div>
  );
}


/**
 * Einfacher Ray-Casting-Test (v0.7.1 E2/2B): liegt `punkt` [e,n] (LV95-Meter)
 * innerhalb des Rings? Dient dazu, das EIGENE Gebäude aus dem
 * Nachbarn-Import auszuschliessen (der Ring, der das Parzellen-Zentrum
 * umschliesst, ist das eigene Gebäude, kein Nachbar).
 */
function punktInRing(punkt: readonly [number, number], ring: readonly number[][]): boolean {
  const [px, py] = punkt;
  let innen = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!, yi = ring[i]![1]!;
    const xj = ring[j]![0]!, yj = ring[j]![1]!;
    const schneidet = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (schneidet) innen = !innen;
  }
  return innen;
}

/** V4: CH-Standort — Adresssuche (geo.admin.ch), Parzellen-Import, alles im Doc. */
export function StandortSuche() {
  const runCommand = useProject((s) => s.runCommand);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  // v0.8.6 PC1 (V086-SPEZ E6/D7/C-17): reaktiver Selektor statt lokalem
  // useState — liest den persistierten Adressbeleg direkt aus dem Doc, damit
  // (a) ein frisch geladenes Doc den Block ohne Zusatz-Effekt initialisiert
  // (Reload-Beweis) UND (b) Undo den Block sofort synchron nachzieht (kein
  // veralteter lokaler Snapshot).
  const standortAdresse = useProject((s) => s.doc.settings.standortAdresse);
  // v0.8.7 PB1 (V087-SPEZ E6/D7/C-11/C-12): derselbe reaktive Doc-Selektor
  // wie standortAdresse oben — der ÖREB-Auszug überlebt Reload/Undo ohne
  // eigenen Sync-Effekt.
  const oerebAuszug = useProject((s) => s.doc.settings.oerebAuszug);
  const [text, setText] = useState('');
  const [treffer, setTreffer] = useState<{ label: string; lat: number; lon: number; e: number; n: number }[]>([]);
  const [meldung, setMeldung] = useState<string | null>(null);
  // Parzellen-Zentrum (LV95-Meter) als Anker für den Nachbarn-Import (E2/2B).
  // EHRLICH: nur Session-State — das Zentrum wird (noch) nicht im Doc
  // persistiert, ein Parzellen-Import in DERSELBEN Sitzung ist nötig, bevor
  // «Nachbarn übernehmen» aktiv wird.
  const [parzellenZentrum, setParzellenZentrum] = useState<{ e: number; n: number } | null>(null);
  // v0.8.7 PB1 — ÖREB-light-Ladezustand/Fehlerzone, eigener State (der Abruf
  // ist NACHGELAGERT zum Standort-Treffer-Klick, kein Teil der history-Gruppe
  // von design.standortSetzen/standortAdresseSetzen, s. Kommentar unten).
  const [oerebLade, setOerebLade] = useState(false);
  const [oerebFehler, setOerebFehler] = useState<string | null>(null);

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

  /**
   * ÖREB light (v0.8.7 PB1, V087-SPEZ E6/D7/C-11/C-12): LV95 (aus dem
   * gerade gewählten Treffer) → GetEGRID → ÖREB-Extract →
   * `design.oerebAuszugSetzen`. Läuft NACHGELAGERT zum Treffer-Klick (eigener
   * Undo-Schritt, s. Kommentar bei `onClick` unten) — bewusst NICHT Teil der
   * history-Gruppe von standortSetzen/standortAdresseSetzen, weil der Abruf
   * asynchron ist und die Gruppe längst geschlossen sein kann, bis die
   * Antwort da ist.
   *
   * Fixture-Vertrag (Fixture-first, `e2e/oereb-light.spec.ts` definiert ihn):
   * (a) GetEGRID über den `ech`-SearchServer-Weg,
   * `searchText=<e>,<n>&type=locations&origins=parcel&sr=2056`, Ergebnis
   * trägt `attrs.egrid`; (b) Extract über
   * `oereb/extract/json/<egrid>` mit `ConcernedTheme`/`NotConcernedTheme`
   * (Form 1:1 aus der öffentlich dokumentierten ÖREB-Transferstruktur).
   * Beide Endpunkte liegen unter der freigegebenen CSP-Domain
   * `api.geo.admin.ch` (Sanktion 7).
   *
   * ÖREB-LIVE-BEFUND (v0.8.8 D9, per Live-GET am 19.07.2026 verifiziert —
   * `docs/V088-SPEZ.md` §D9): Dieser Weg funktioniert NUR gegen die
   * Fixtures, nicht gegen die echte Bundes-API. Konkret: (1) die echte
   * `ech/SearchServer`-Antwort trägt KEIN `attrs.egrid` (der EGRID steht
   * nur als Text in `label`/`detail`); (2) die Koordinaten-Query
   * `searchText=<e>,<n>&origins=parcel` liefert live LEERE `results`;
   * (3) `api.geo.admin.ch/rest/services/oereb/extract/…` antwortet 404 —
   * der echte Gateway ist `oereb.geo.admin.ch` (eigene Domain, weder in
   * der CSP noch in der Proxy-Allowlist). Der Fixture-Vertrag bleibt
   * deshalb bewusst bestehen; das UI nennt den Auszug «light» und der
   * Hinweis unten benennt die Quelle. Live-ÖREB ist 0.9.x-Kandidat mit
   * Owner-Gate: braucht Umbau auf `oereb.geo.admin.ch` + Label-Parsing
   * für den EGRID + CSP-Freigabe auf BEIDEN Trägern (`tauri.conf.json`
   * UND `index.html` — Lehre v0.8.7: die CSP hat zwei Träger).
   */
  const oerebAbrufen = async (e: number, n: number) => {
    setOerebFehler(null);
    setOerebLade(true);
    try {
      const egridRes = await fetch(
        `https://api.geo.admin.ch/rest/services/ech/SearchServer?searchText=${e},${n}&type=locations&origins=parcel&sr=2056`,
      );
      if (!egridRes.ok) throw new Error(`GetEGRID HTTP ${egridRes.status}`);
      const egridJson = (await egridRes.json()) as { results?: { attrs?: { egrid?: string } }[] };
      const egrid = egridJson.results?.[0]?.attrs?.egrid;
      if (!egrid) {
        setOerebFehler('Kein EGRID an diesem Standort gefunden — ÖREB-Auszug (light) nicht möglich.');
        return;
      }
      const extractRes = await fetch(`https://api.geo.admin.ch/rest/services/oereb/extract/json/${egrid}?sr=2056`);
      if (!extractRes.ok) throw new Error(`ÖREB-Extract HTTP ${extractRes.status}`);
      const extractJson = (await extractRes.json()) as {
        GetExtractByIdResponse?: {
          extract?: {
            ConcernedTheme?: { Code: string; Text?: { Language: string; Text: string }[] }[];
            NotConcernedTheme?: { Code: string; Text?: { Language: string; Text: string }[] }[];
          };
        };
      };
      const extract = extractJson.GetExtractByIdResponse?.extract;
      const titelVon = (t: { Code: string; Text?: { Language: string; Text: string }[] }) =>
        t.Text?.find((x) => x.Language === 'de')?.Text ?? t.Code;
      const themen = [
        ...(extract?.ConcernedTheme ?? []).map((t) => ({ code: t.Code, titel: titelVon(t), betroffen: true })),
        ...(extract?.NotConcernedTheme ?? []).map((t) => ({ code: t.Code, titel: titelVon(t), betroffen: false })),
      ];
      runCommand('design.oerebAuszugSetzen', {
        auszug: { egrid, abgerufenAm: new Date().toISOString(), quelle: 'oereb-bund', themen },
      });
    } catch {
      setOerebFehler('Kein Netz — ÖREB-Auszug (light) nicht verfügbar.');
    } finally {
      setOerebLade(false);
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
        // Site-Marker (D8/H-1): keine Raumtyp-Checks/SIA-416-Flächenzählung
        // für die importierte Kataster-Parzelle (derive/checks.ts, sia416.ts).
        zonenArt: 'parzelle',
      });
      // Zentrum für den Nachbarn-Import merken (E2/2B) — Anker, damit Parzelle
      // UND Nachbargebäude im selben lokalen Koordinatensystem landen.
      setParzellenZentrum(imp.zentrum);
      setMeldung(`Parzelle importiert (${imp.flaeche.toLocaleString('de-CH')} m², Nord = +y).`);
    } catch {
      setMeldung('Kein Netz — Parzellen-Import nicht verfügbar.');
    }
  };

  const nachbarnUebernehmen = async () => {
    if (!parzellenZentrum || !activeStoreyId) return;
    setMeldung(null);
    try {
      const { e, n } = parzellenZentrum;
      // ±60 m um das Parzellen-Zentrum = 120 m Kante (Layer-Verdikt E2/2B:
      // ch.swisstopo.vec25-gebaeude ist der einzige identify-fähige Layer mit
      // Gebäude-POLYGONEN in LV95).
      const box = `${e - 60},${n - 60},${e + 60},${n + 60}`;
      const res = await fetch(
        `https://api3.geo.admin.ch/rest/services/api/MapServer/identify?geometry=${box}&geometryType=esriGeometryEnvelope&layers=all:ch.swisstopo.vec25-gebaeude&mapExtent=${box}&imageDisplay=400,400,96&tolerance=0&returnGeometry=true&sr=2056`,
      );
      const json = (await res.json()) as {
        results?: { featureId?: number | string; geometry?: { rings?: number[][][] } }[];
      };
      // Dedublizieren per featureId — geo.admin liefert dieselbe Geometrie
      // sonst mehrfach, wenn die Box mehrere interne Kacheln überlappt.
      const gesehen = new Set<string>();
      const ringsListe: number[][][][] = [];
      for (const r of json.results ?? []) {
        const id = r.featureId !== undefined ? String(r.featureId) : undefined;
        if (id !== undefined) {
          if (gesehen.has(id)) continue;
          gesehen.add(id);
        }
        const rings = r.geometry?.rings ?? [];
        if (rings.length === 0) continue;
        // Das eigene Gebäude enthält das Parzellen-Zentrum — kein Nachbar.
        if (rings.some((ring) => punktInRing([e, n], ring))) continue;
        ringsListe.push(rings);
      }
      const outlines = nachbarnZuOutlines(ringsListe, parzellenZentrum).filter((o) => o.length >= 3);
      if (outlines.length === 0) {
        setMeldung('Keine Nachbargebäude gefunden.');
        return;
      }
      const result = runCommand('design.nachbarnUebernehmen', { storeyId: activeStoreyId, outlines });
      setMeldung(`${result.summary}.`);
    } catch {
      setMeldung('Kein Netz — Nachbarn-Import nicht verfügbar.');
    }
  };

  const standortGesetzt = !!useProject.getState().doc.settings.standort;
  return (
    <span className="dw-standort-stack">
      <span className="dw-standort-row">
        <input
          placeholder="Adresse / Parzelle …"
          value={text}
          data-testid="standort-suche"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void suchen()}
          className="dw-input-standort"
        />
        <KButton size="sm" tone="quiet" data-testid="standort-suchen" onClick={() => void suchen()}>
          Suchen
        </KButton>
        {standortGesetzt && (
          <KButton size="sm" tone="quiet" data-testid="parzelle-import" onClick={() => void parzelleImportieren()}>
            Parzelle importieren
          </KButton>
        )}
        {parzellenZentrum && (
          <KButton size="sm" tone="quiet" data-testid="nachbarn-uebernehmen" onClick={() => void nachbarnUebernehmen()}>
            Nachbarn übernehmen
          </KButton>
        )}
        {treffer.length > 0 && (
          <div
            className="dw-standort-treffer"
            data-testid="standort-treffer"
          >
            {treffer.map((t, i) => (
              <button
                key={i}
                className="dw-treffer-btn"
                onClick={() => {
                  // v0.8.6 PC1 (V086-SPEZ E6/D7/C-17) + Fable-Nachzug: BEIDE
                  // Standort-Commands in EINER history-Gruppe — ein Ctrl+Z
                  // nimmt den Treffer-Klick als Ganzes zurück (vorher zwei
                  // getrennte Undo-Schritte, PC1-Berichts-Lücke). Der
                  // Adressbeleg (eigenes Setting/Command wegen der
                  // Namenskollision, s. `StandortAdresse` in model/doc.ts)
                  // kommt zusätzlich zum bestehenden design.standortSetzen
                  // (WGS84 fürs Sonnenstudien-/Schwarzplan-Fundament).
                  // `new Date().toISOString()` ist hier zulässig:
                  // Laufzeit-App-Code, kein Determinismus-Pfad.
                  const { history } = useProject.getState();
                  history.beginGroup();
                  try {
                    runCommand('design.standortSetzen', { label: t.label, lat: t.lat, lon: t.lon, e: t.e, n: t.n });
                    runCommand('design.standortAdresseSetzen', {
                      adresse: t.label,
                      lv95: { e: t.e, n: t.n },
                      quelle: 'geoadmin',
                      abgerufenAm: new Date().toISOString(),
                    });
                  } finally {
                    history.endGroup();
                  }
                  setTreffer([]);
                  // v0.8.7 PB1 (V087-SPEZ E6/D7/C-11/C-12): ÖREB-light-Abruf
                  // NACH der history-Gruppe angestossen — bewusst asynchron
                  // nachgelagert (die Gruppe oben bleibt ZWEI Commands, s.
                  // Kommentar dort), schreibt sein eigenes Setting als
                  // eigenen dritten Undo-Schritt, sobald die Antwort da ist.
                  void oerebAbrufen(t.e, t.n);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        {meldung && <span className="dw-standort-meldung" data-testid="standort-meldung">{meldung}</span>}
      </span>
      {standortAdresse && (
        <span className="dw-faint-klein" data-testid="standort-adresse-aktuell">
          Standort: {standortAdresse.adresse} (LV95 {Math.round(standortAdresse.lv95.e)}/{Math.round(standortAdresse.lv95.n)})
        </span>
      )}
      {/* v0.8.7 PB1 (V087-SPEZ E6/D7/C-11/C-12): ÖREB light — Lade-Zustand
          BENANNT (kein Spinner-Silence), ehrliche Fehlerzone (Muster
          `standort-meldung`), sonst die Themencode-Betroffenheitsliste +
          der Sanktion-7-Pflicht-Hinweis. */}
      {oerebLade && (
        <span className="dw-standort-meldung" data-testid="oereb-lade">
          ÖREB-Auszug (light) wird abgerufen …
        </span>
      )}
      {oerebFehler && (
        <span className="dw-standort-meldung" data-testid="oereb-fehler">
          {oerebFehler}
        </span>
      )}
      {oerebAuszug && !oerebLade && (
        <span className="dw-standort-stack" data-testid="oereb-block">
          <span className="dw-faint-klein">
            ÖREB: {oerebAuszug.themen.filter((t) => t.betroffen).length} von {oerebAuszug.themen.length} Themen betroffen · EGRID{' '}
            {oerebAuszug.egrid}
          </span>
          <span className="dw-zuweisung-liste" data-testid="oereb-themenliste">
            {oerebAuszug.themen.map((t) => (
              <span key={t.code} className="dw-row-s2-klein" data-testid={`oereb-thema-${t.code}`}>
                <span className={t.betroffen ? 'dw-soft' : 'dw-faint'}>{t.betroffen ? '● betroffen' : '○ nicht betroffen'}</span>
                <span>
                  {t.titel} ({t.code})
                </span>
              </span>
            ))}
          </span>
          <span className="dw-faint-klein" data-testid="oereb-hinweis">
            Auszug light — kein rechtsgültiger ÖREB-Auszug.
          </span>
        </span>
      )}
      {parzellenZentrum && (
        <span className="dw-faint-klein" data-testid="nachbarn-fussnote">
          Quelle: swisstopo VECTOR25 — amtlich, Datenstand ~2008
        </span>
      )}
    </span>
  );
}

/**
 * C-11 (PE3-Fix v0.8.4): schwebende Inspector-Karte für den Island-Modus —
 * das Kontextmenü «Eigenschaften» war dort wirkungslos, weil der gedockte
 * Inspector nur im manuell-Modus rendert (DockFlaeche-Gate oben). Dieselbe
 * `<Inspector/>`-Instanz, als Glas-Karte oben rechts; Esc/Aussenklick
 * schliesst (E2-Gesetz-Muster, `useOverlaySchliessen`).
 */
function EigenschaftenFloat({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useOverlaySchliessen(ref, onClose, { esc: true, aussenklick: true });
  return (
    <div ref={ref} className="dw-eigenschaften-float" data-testid="dw-eigenschaften-float">
      {children}
    </div>
  );
}
