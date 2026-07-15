import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  DOCK_KONSTANTEN,
  placeFloats,
  solve,
  type DockRect,
  type DockModus,
  type DockZone,
  type FloatAnker,
  type PanelOverride,
} from '../../state/dock-kern';
import { stationsPanels, type DockStation } from '../../state/dock-stationen';
import { eingeklappteDiff, useDockZustand } from '../../state/dock-zustand';
import { useAktiveDockStation } from '../../state/dock-aktive-station';
import { useDockOrbRuntime } from '../../state/dock-orb-runtime';
import { DockPanel } from './DockPanel';
import { DockSplitter } from './DockSplitter';
import { DockSnapZonen, type DockGeistZustand } from './DockSnapZonen';
import { DockAutoHinweisChip } from './DockAutoHinweisChip';
import { KosmoOrdnetOrb } from './KosmoOrdnetOrb';
import './dock-flaeche.css';

/**
 * DockFlaeche (v0.7.8 Welle 1 / Paket P3 — «Intelligente Werkzeugtabs»,
 * Herzstück; erweitert Welle 2 / Paket P4 — Rechts-Stack + Header-Drag) —
 * die Wurzel des neuen Dock-Rendering: misst das verfügbare Feld
 * (ResizeObserver, rAF-debounced), merged persistierte Overrides
 * (`dock-zustand.ts`) mit der Sichtbarkeits-Map der aufrufenden Station,
 * ruft den reinen Solver (`dock-kern.ts`, `solve()`) memoisiert auf und
 * rendert `DockPanel`/`DockSplitter` für jedes Ergebnis-Rechteck. Seit P4
 * verwaltet sie zusätzlich die Header-Drag-Session (Redock-Geist + schwebendes
 * Freimove), s. Kopfkommentare der beiden Abschnitte weiter unten.
 *
 * **Sichtbarkeit bleibt bei `ui-zustand.ts`** (ENTSCHEIDE 1 des Auftrags):
 * diese Komponente bekommt sie fertig aufbereitet als `panels`-Prop (eine
 * `sichtbar`-Flag je Panel-ID) — sie liest NIE selbst `useUiZustand`. Für
 * `unternehmerplan`/`kennzahlen`/`inspector` (kein `…Offen`-Flag, Sichtbarkeit
 * = Datenvorhandensein) gilt exakt dieselbe Prop-Form, nur dass die
 * aufrufende Station den Wert aus einem Daten-Guard statt einem Boolean-Store
 * ableitet.
 *
 * **Feld-Messung** (ENTSCHEIDE 3): `DockFlaeche` wird als Kind IN dem
 * `position:'relative'`-Container gerendert, der auch Geschossleiste/
 * EntwurfsDock/Statusleiste enthält (Vorbedingung, damit
 * `wurzelRef.current.parentElement` derselbe Container ist). Sie fragt genau
 * diese Geschwister per `data-testid` ab (bleiben selbst unangetastet, s.
 * Auftrag) und leitet daraus das Feld ab:
 *   - x-Start: rechts der linken Fix-Spalte (max. rechte Kante von
 *     Geschossleiste/EntwurfsDock) + GAP.
 *   - y-Start: oben im Container (die Werkzeugleisten liegen als Flex-
 *     Geschwister VOR diesem Container — dessen Top-Kante liegt bereits
 *     darunter, keine zweite Messung nötig) + GAP.
 *   - x-Ende (P4 GEÄNDERT): reicht jetzt bis zum Container-Rand — die
 *     frühere «bis zur linken Kante des gemessenen Kennzahlen-Panels»-
 *     Reservierung entfällt, weil `kennzahlen` seit P4 selbst ein Dock-Panel
 *     ist (rechte Spalte, `dock-stationen.ts`), kein externes Chrome-Element
 *     mehr.
 *   - y-Ende: obere Kante der Statusleiste UND (P4 NEU, adaptiv) obere Kante
 *     des Kosmo-Symbols im Boden-Dock (`shell/KosmoSymbol.tsx`, eingebettet
 *     in `shell/BodenDock.tsx` — beides `position:fixed`, app-weit AUSSERHALB
 *     dieses Containers gerendert, darum global per `document.querySelector`
 *     statt `container.querySelector` gesucht, und zwar bei JEDEM Messlauf
 *     frisch, weil das Symbol beim Öffnen des Kosmo-Panels unmountet). Das
 *     ersetzt `Inspector.tsx`s früheren H-43-Sonderabstand zentral für den
 *     GESAMTEN rechten Stack — Panels enden über dem Streifen von NavLeiste
 *     (bottom:50) und Kosmo-Band.
 *     ADAPTIV heisst: die Kosmo-Band-Reserve gilt NUR, solange das Feld
 *     danach noch mindestens `BOT_RESERVE_MIN_FELD_H` (=`MIN_VIEWPORT`,
 *     380px) hoch bleibt. Der Boden-Dock sitzt fix bei `bottom:96px` — bei
 *     kleinen Fensterhöhen (z.B. Pin-Test-Szenario 1400×420 in
 *     `dock-interaktion.spec.ts`) frässe eine harte Reserve fast das ganze
 *     Feld und klappte Panels ein, die heute sichtbar sind (Regressions-
 *     Verbot des Auftrags). Unterhalb der Schwelle gewinnt die Platznot:
 *     Panels dürfen den Kosmo-Streifen geometrisch berühren, die BEDIENUNG
 *     bleibt trotzdem geschützt, weil Boden-Dock (z-108) und Kosmo-Symbol
 *     (z-110) über jedem Panel (z-14/30) liegen und die Klicks gewinnen.
 *
 *     v0.8.0 P11 (Owner-Pflichtauftrag 15.07., «BodenDock ins Dock-System»)
 *     — GEFUNDENE LÜCKE, jetzt geschlossen: die Reserve mass bisher NUR am
 *     `kosmo-symbol`-Knoten. Dieser Knoten unmountet aber, sobald das
 *     Kosmo-Panel offen ist (`kosmoOpen`, `shell/BodenDock.tsx`) — in diesem
 *     Zustand lieferte `document.querySelector('[data-testid="kosmo-
 *     symbol"]')` `null`, die BOT-Reserve entfiel komplett, und ein Panel
 *     konnte (in der 'vis'-Station, die keine Statusleiste kennt) bis unter
 *     den fixen `boden-dock`-Streifen wachsen. Fallback additiv: fehlt das
 *     Symbol, wird stattdessen die Oberkante des `boden-dock`-Containers
 *     selbst gemessen (`shell/BodenDock.tsx`, IMMER gemountet solange
 *     `screen !== 'home'`, unabhängig von `kosmoOpen`) — dieselbe ADAPTIVE
 *     Schwelle (`BOT_RESERVE_MIN_FELD_H`) gilt unverändert. Ist auch der
 *     Kosmo-Symbol-Pfad vorhanden (Regelfall), bleibt das Verhalten BYTE-
 *     IDENTISCH zu vorher (keine Verhaltensänderung für design/vis im
 *     Normalfall, s. Abschlussbericht P11 Teil A Punkt 1).
 */

export interface DockPanelEintrag {
  /** PanelId aus `ui-zustand.ts` (Ausnahmen: `'unternehmerplan'`/`'kennzahlen'`/
   *  `'inspector'`, s. `dock-stationen.ts`). */
  id: string;
  sichtbar: boolean;
  /** Fehlt bei datengetriebenen Panels ohne eigenes Boolean (`unternehmerplan`,
   *  `kennzahlen`, `inspector`). */
  schliessen?: () => void;
  inhalt: ReactNode;
}

export interface DockFlaecheProps {
  station: DockStation;
  panels: readonly DockPanelEintrag[];
}

interface FeldRechteck {
  x: number;
  y: number;
  w: number;
  h: number;
}

const LEER_FELD: FeldRechteck = { x: 0, y: 0, w: 0, h: 0 };
const LEERE_OVERRIDES: Record<string, PanelOverride> = {};

// ---------------------------------------------------------------------------
// Header-Drag — Hilfsfunktionen (P4). Reine Funktionen, damit die
// Zonen-/Magnet-Arithmetik ohne DOM/Store testbar bliebe (auch wenn P4 selbst
// keine eigenen Unit-Tests dafür verlangt, s. Auftrag — nur E2E in
// `dock-interaktion.spec.ts`).
// ---------------------------------------------------------------------------

const SNAP_ZONE_STRAHL = 70;
const FLOAT_MAGNET_T = 16;
const FLOAT_SNAPBACK_T = 30;
const FLOAT_MIN_W = 220;
const FLOAT_MAX_H = 240;
/** C6 (Auto-Reaktions-Hinweis, P5) — 40ms-Defer wie im Design-Handoff-
 *  Prototyp `announce()` (s. `dock-zustand.ts`s `eingeklappteDiff()`-
 *  Kopfkommentar): lässt den Solver/DOM eine Runde setteln, bevor die
 *  «nachher»-Menge eingeklappter Panels gemessen wird. */
const HINWEIS_DEFER_MS = 40;
/** Anzeigedauer des Chips (Auftrag: «~2,9 s»). */
const HINWEIS_DAUER_MS = 2900;

/** Mindest-Feldhöhe, unterhalb derer die Kosmo-Band-BOT-Reserve entfällt
 *  (s. Kopfkommentar «ADAPTIV») — bewusst derselbe Wert wie
 *  `DOCK_KONSTANTEN.MIN_VIEWPORT` (die horizontale Untergrenze des Solvers),
 *  damit «genug Platz» in beiden Achsen dieselbe Zahl bedeutet. */
const BOT_RESERVE_MIN_FELD_H = DOCK_KONSTANTEN.MIN_VIEWPORT;

/**
 * v0.7.8 Welle 3 (P6, Konzept B «Raster-Kachel») — Umbruch-Kompensation für
 * den `ctop`-Streifen. Der Prototyp-Solver (`rowLayout()`, dock-kern.ts —
 * 1:1-Port, wird NICHT verändert) kennt keinen Zeilenumbruch: passen die
 * `fw`-Breiten einer Streifen-Reihe nicht in die Center-Breite, laufen die
 * Rechtecke rechts ÜBER die rechte Dock-Spalte (real gemessen: die drei
 * top-HUDs der Design-Station brauchen 814px, das Center bei vollen Spalten
 * ~645px → `viewportWerkzeugRail` überlappte `kennzahlen`). Kompensation
 * hier auf der RENDER-Seite (dieselbe Werkstatt wie der P4-Zwei-Felder-
 * Kompromiss unten): NUR wenn die Solver-Reihe überläuft, werden die
 * ctop-Rechtecke zeilenweise neu gewickelt (Greedy, zentriert je Zeile,
 * Original-Breiten/-Höhen unangetastet — kein Stauchen von HUD-Inhalten);
 * Folgezeilen ragen dabei bewusst in den Viewport hinein (dasselbe
 * akzeptierte Verhalten wie A-Modus-Floats, die IMMER über dem Viewport
 * liegen). Läuft nichts über, bleiben die Solver-Rects byte-identisch.
 * `cbot` bekommt bewusst KEINE Entsprechung: keine registrierte Station hat
 * ein `anker:'bottom-center'`-Panel, der Fall bleibt Solver-Unit-Test-Gebiet
 * (`dock-kern.test.ts`).
 */
function wickleCtopStreifen(
  rects: Record<string, DockRect>,
  ctopIds: readonly string[],
  feldY: number,
  vp: DockRect,
): void {
  const vorhanden = ctopIds.filter((id) => rects[id]);
  if (vorhanden.length === 0) return;
  const maxBreite = vp.w - DOCK_KONSTANTEN.GAP * 2;
  const gesamt =
    vorhanden.reduce((s, id) => s + rects[id]!.w, 0) + DOCK_KONSTANTEN.GAP * (vorhanden.length - 1);
  if (gesamt <= maxBreite) return; // Solver-Reihe passt — nichts anfassen.

  // Greedy in Zeilen aufteilen (Reihenfolge = Solver-Reihenfolge = x-sortiert).
  const sortiert = [...vorhanden].sort((a, b) => rects[a]!.x - rects[b]!.x);
  const zeilen: string[][] = [[]];
  let zeilenBreite = 0;
  for (const id of sortiert) {
    const w = rects[id]!.w;
    const naechste = zeilenBreite === 0 ? w : zeilenBreite + DOCK_KONSTANTEN.GAP + w;
    if (zeilenBreite > 0 && naechste > maxBreite) {
      zeilen.push([id]);
      zeilenBreite = w;
    } else {
      zeilen[zeilen.length - 1]!.push(id);
      zeilenBreite = naechste;
    }
  }
  zeilen.forEach((zeile, i) => {
    const total = zeile.reduce((s, id) => s + rects[id]!.w, 0) + DOCK_KONSTANTEN.GAP * (zeile.length - 1);
    let x = vp.x + Math.max(DOCK_KONSTANTEN.GAP, (vp.w - total) / 2);
    const bandY = feldY + i * (DOCK_KONSTANTEN.STRIP + DOCK_KONSTANTEN.GAP);
    for (const id of zeile) {
      const r = rects[id]!;
      rects[id] = { ...r, x, y: bandY + (DOCK_KONSTANTEN.STRIP - r.h) / 2 };
      x += r.w + DOCK_KONSTANTEN.GAP;
    }
  });
}

/** TOP-Band NUR für die RECHTE Spalte (P4): `PlanView.tsx` trägt oben rechts
 *  eine feste Chrome-Zeile (`trace-select`/`graph-toggle`/`achsen-toggle`,
 *  alle `top:8`, Höhe ≈26px, z-5) — genau der Streifen, in dem seit P4 die
 *  IMMER offene `kennzahlen`-Spalte beginnt (Panel z-14 gewänne jeden Klick).
 *  Das alte absolute KennzahlenPanel löste dasselbe Problem mit `top:44`
 *  («unter den Trace/Graph-Knöpfen des Plans», s. Git-Historie
 *  `KennzahlenPanel.tsx`) — dieser Versatz (34px unter `feld.y`=GAP → 44
 *  absolut) wird hier für die rechte Spalte 1:1 übernommen, als KONSTANTE
 *  statt Messung (die Chrome-Zeile ist selbst fest verortet; eine Messung
 *  müsste PlanView-Mounts beobachten — mehr Maschinerie für denselben Wert).
 *  Die LINKE Spalte bekommt das Band bewusst NICHT (links gibt es keine
 *  solche Chrome-Zeile, und das Band würde dort reale Panel-Höhe kosten —
 *  vier offene linke Panels bei 1400×900 brauchen das Budget, s.
 *  `dock-layout.spec.ts` «vier Panels»). Umgesetzt als ZWEITER `solve()`-
 *  Lauf mit einem oben verkürzten Feld, aus dem nur die rechte Spalte
 *  übernommen wird — s. `ergebnis`-useMemo unten. */
const TOP_BAND_RECHTS = 34;

/** Zonenlogik wie im Design-Handoff-Prototyp `hitZone()`: links wenn der
 *  Zeiger < linke Spaltenbreite + Strahl, rechts wenn > Feldbreite − rechte
 *  Spaltenbreite − Strahl, sonst schwebend (Konzept A) bzw. — weil Konzept B
 *  kein Schweben kennt — die nähere Seite (Konzept B, praktisch nie erreicht,
 *  da die Design-Station Modus A fährt). */
function hitZone(px: number, feld: FeldRechteck, leftW: number, rightW: number, modus: DockModus): DockZone {
  if (px < feld.x + leftW + SNAP_ZONE_STRAHL) return 'left';
  if (px > feld.x + feld.w - (rightW + SNAP_ZONE_STRAHL)) return 'right';
  if (modus === 'A') return 'float';
  return px < feld.x + feld.w / 2 ? 'left' : 'right';
}

/** Rastet `wert` auf das nächste Ziel ein, wenn es innerhalb `t` liegt (sonst
 *  unverändert) — «Magnet-Einrasten» beim freien Ziehen schwebender Panels. */
function magnet(wert: number, ziele: readonly number[], t: number): number {
  for (const z of ziele) {
    if (Math.abs(wert - z) <= t) return z;
  }
  return wert;
}

/** Die Position, die `placeFloats()` (dock-kern.ts, unverändert/importiert)
 *  einem EINZELNEN Float ohne `fx`/`fy` geben würde — die «Ausgangsanker-
 *  Position» für den Snap-zurück-Vergleich beim Loslassen eines schwebenden
 *  Panels. Ruft die ECHTE Solver-Funktion mit einer Ein-Element-Liste auf
 *  (keine zweite, potenziell abweichende Kopie der Anker-Arithmetik). */
function ankerAutoPosition(anker: FloatAnker, fw: number, fh: number, vp: FeldRechteck): { x: number; y: number } {
  const rects: Record<string, DockRect> = {};
  placeFloats([{ id: '_anker-probe', wichtigkeit: 0, anker, fw, fh }], vp, rects, undefined);
  const r = rects['_anker-probe']!;
  return { x: r.x, y: r.y };
}

interface RedockDatensatz {
  id: string;
  w: number;
  h: number;
  offsetX: number;
  offsetY: number;
  /** v0.7.9 (A3, Teil A) — war das gezogene Panel beim Drag-Start ein
   *  eingeklappter Tab (`DockPanel.tsx`s `tabPointerDown` ruft denselben
   *  `onRedockDragStart` wie der volle Kopf)? Entscheidet beim Loslassen,
   *  ob ein Spaltenwechsel den Tab-Zustand mitnimmt (s. `redockStart`s
   *  `loslassen`-Kommentar unten). */
  warEingeklappt: boolean;
}

interface FloatDragDatensatz {
  id: string;
  startFx: number;
  startFy: number;
  startPX: number;
  startPY: number;
  w: number;
  h: number;
  anker: FloatAnker;
  vp: FeldRechteck;
}

export function DockFlaeche({ station, panels }: DockFlaecheProps) {
  const defs = useMemo(() => stationsPanels(station), [station]);

  // v0.7.8 Welle 3 (P7, «Kosmo ordnet») — diese Instanz IST die aktive
  // Dock-Station, solange sie gemountet ist (nur eine `DockFlaeche` läuft je
  // Screen, s. `dock-aktive-station.ts`-Kopfkommentar). `ui.dock*`-Befehle
  // validieren ihre `panelId` gegen genau diesen Wert.
  const setzeAktiveStation = useAktiveDockStation((s) => s.setzeAktiveStation);
  useEffect(() => {
    setzeAktiveStation(station);
  }, [station, setzeAktiveStation]);

  const wurzelRef = useRef<HTMLDivElement>(null);
  const [feld, setFeld] = useState<FeldRechteck>(LEER_FELD);

  // ---------------------------------------------------------------------
  // Feld-Messung — ResizeObserver auf Container + den festen Geschwistern,
  // rAF-debounced (ein ausstehender Messlauf je Frame reicht, mehrere
  // ResizeObserver-Callbacks im selben Frame kollabieren zu einem).
  // P4 NEU: adaptive BOT-Reserve fürs Kosmo-Band, s. Kopfkommentar.
  // ---------------------------------------------------------------------
  useLayoutEffect(() => {
    const wurzel = wurzelRef.current;
    const container = wurzel?.parentElement;
    if (!container) return;

    const geschossleiste = container.querySelector('[data-testid="geschossleiste"]');
    const entwurfsDock = container.querySelector('[data-testid="entwurf-dock"]');
    const statusleiste = container.querySelector('[data-testid="statusleiste"]');
    // Boden-Dock (`shell/BodenDock.tsx`) ist `position:fixed` und wird von
    // `App.tsx` AUSSERHALB dieses Containers gerendert (Geschwister von
    // `<main>`, nicht von ihm) — global statt `container.querySelector`
    // gesucht. `getBoundingClientRect()` liefert für BEIDE (fixed wie
    // absolute/relative Elemente) Viewport-Koordinaten, die Differenz zu
    // `c` (ebenfalls Viewport-Koordinaten) bleibt darum korrekt. Nur fürs
    // RO-Registrieren einmalig gegriffen — die eigentliche BOT-Messung holt
    // sich das KOSMO-SYMBOL bei jedem Lauf frisch (das Symbol unmountet,
    // wenn das Kosmo-Panel offen ist, s. `KosmoSymbol.tsx`).
    const bodenDock = document.querySelector('[data-testid="boden-dock"]');
    const linksElemente = [geschossleiste, entwurfsDock].filter((el): el is Element => el !== null);

    let rafHandle = 0;
    const jetztMessen = () => {
      rafHandle = 0;
      const c = container.getBoundingClientRect();
      if (c.width === 0 || c.height === 0) return;

      let xStart = 0;
      for (const el of linksElemente) {
        xStart = Math.max(xStart, el.getBoundingClientRect().right - c.left);
      }
      xStart += DOCK_KONSTANTEN.GAP;

      // P4: kein Kennzahlen-Abzug mehr — das Feld reicht bis zum
      // Container-Rand, `kennzahlen` ist jetzt selbst im Dock.
      const xEnde = c.width - DOCK_KONSTANTEN.GAP;

      let yEnde = c.height;
      if (statusleiste) yEnde = Math.min(yEnde, statusleiste.getBoundingClientRect().top - c.top);
      // Adaptive Kosmo-Band-Reserve (s. Kopfkommentar): nur anwenden, wenn
      // dem Feld danach noch >= BOT_RESERVE_MIN_FELD_H bleiben — sonst
      // (kleine Fensterhöhen) schützt allein die z-Ordnung (Boden-Dock
      // z-108 / Kosmo-Symbol z-110 über Panel z-14/30) die Bedienung.
      // v0.8.0 P11: fehlt das Kosmo-Symbol (Kosmo-Panel offen, s.
      // Kopfkommentar), fällt die Messung auf den `boden-dock`-Container
      // selbst zurück — der bleibt in JEDER Modul-Ansicht gemountet.
      const kosmoSymbol = document.querySelector('[data-testid="kosmo-symbol"]');
      const bodenDockAktuell = kosmoSymbol ? null : document.querySelector('[data-testid="boden-dock"]');
      const reserveKante = kosmoSymbol ?? bodenDockAktuell;
      if (reserveKante) {
        const reserveYEnde = reserveKante.getBoundingClientRect().top - c.top;
        if (reserveYEnde - DOCK_KONSTANTEN.GAP * 2 >= BOT_RESERVE_MIN_FELD_H) {
          yEnde = Math.min(yEnde, reserveYEnde);
        }
      }

      const naechstes: FeldRechteck = {
        x: xStart,
        y: DOCK_KONSTANTEN.GAP,
        w: Math.max(0, xEnde - xStart),
        h: Math.max(0, yEnde - DOCK_KONSTANTEN.GAP * 2),
      };
      setFeld((vorher) =>
        vorher.x === naechstes.x && vorher.y === naechstes.y && vorher.w === naechstes.w && vorher.h === naechstes.h
          ? vorher
          : naechstes,
      );
    };
    const messenDebounced = () => {
      if (rafHandle) return;
      rafHandle = requestAnimationFrame(jetztMessen);
    };

    const ro = new ResizeObserver(messenDebounced);
    ro.observe(container);
    for (const el of linksElemente) ro.observe(el);
    if (statusleiste) ro.observe(statusleiste);
    if (bodenDock) ro.observe(bodenDock);
    window.addEventListener('resize', messenDebounced);
    jetztMessen();

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', messenDebounced);
      if (rafHandle) cancelAnimationFrame(rafHandle);
    };
  }, []);

  // ---------------------------------------------------------------------
  // Persistiertes Layout (dock-zustand.ts) — primitive/stabile Referenzen
  // als Solver-Eingabe, damit Tippen in einem Panel-Input (ändert NUR
  // lokalen React-State der Station, nie den Dock-Store) kein `solve()`
  // auslöst.
  // ---------------------------------------------------------------------
  const dockModus = useDockZustand((s) => s.modus);
  const dockLayouts = useDockZustand((s) => s.layouts);
  const panelOverrideSetzen = useDockZustand((s) => s.panelOverrideSetzen);
  const layoutKey = `${dockModus}:${station}`;
  const gespeichertesLayout = dockLayouts[layoutKey];
  const leftW = gespeichertesLayout?.leftW ?? DOCK_KONSTANTEN.DEF_LEFT;
  const rightW = gespeichertesLayout?.rightW ?? DOCK_KONSTANTEN.DEF_RIGHT;
  const gespeichertePanels = gespeichertesLayout?.panels ?? LEERE_OVERRIDES;

  // Sichtbarkeits-Schlüssel als PRIMITIVER String (nicht die `panels`-Array-
  // Referenz, die bei jedem Render neu entsteht) — genau der Vergleichswert,
  // den `useMemo` unten braucht, um bei reinem Re-Render (z.B. Tastatur-
  // Eingabe in einem Panel) NICHT neu zu lösen.
  const sichtKey = panels.map((p) => `${p.id}:${p.sichtbar ? '1' : '0'}`).join(',');

  // -----------------------------------------------------------------------
  // v0.7.9 (A6-Restpunkt der v0.7.8-Abnahme) — `zuletztGeoeffnet`-Schutz:
  // Der Solver kennt seit P1 einen `schutz`-Parameter (`opts.
  // zuletztGeoeffnet` → `stack()`s Kandidaten-Filter), der EIN Panel vor
  // dem automatischen Einklappen bewahrt. Welle 1 hatte ihn BEWUSST nicht
  // verdrahtet (der damalige Kommentar hier begründete das mit dem Pin-
  // Testverhalten) — der v0.7.9-Owner-Entscheid dreht das um: ein FRISCH
  // per Toggle/`ui.dock*`-Befehl geöffnetes Panel darf nicht im selben
  // Atemzug selbst wieder einklappen (die verwirrendste aller Auto-
  // Reaktionen; der P5-Hinweis-Chip ERKLÄRTE sie bisher nur). Die zwei
  // betroffenen Bestands-Specs (Pin-Test/Chip-Test, `dock-interaktion.
  // spec.ts`) sind auf die neue Semantik nachgezogen — s. dortige
  // Kommentare.
  //
  // Semantik («bis zum nächsten Reflow», Auftrag):
  //  - GESETZT, wenn GENAU EIN Panel von unsichtbar → sichtbar wechselt
  //    (menschlicher Toggle / `ui.dock*` — beide laufen über dieselbe
  //    `sichtbar`-Prop). Bulk-Wechsel (mehrere gleichzeitig, z. B. die
  //    sechs HUD-Floats beim Viewport-Bereit-Signal oder die Tour-Schritte)
  //    setzen NICHTS und LÖSCHEN einen bestehenden Schutz — das ist keine
  //    Einzel-Öffnungsgeste.
  //  - GELÖSCHT, sobald das geschützte Panel wieder zugeht ODER ein
  //    externer Reflow kommt (Feld-/Splitterbreiten-/Modus-Wechsel) — ein
  //    später schrumpfendes Fenster darf das Panel wieder ganz normal nach
  //    Wichtigkeit einklappen (deshalb bleibt der Rangfolge-Beweis
  //    «draw 48 vor kennzahlen 60» in `dock-layout.spec.ts` gültig, nur
  //    jetzt über den Resize-Weg statt über das Öffnen).
  //
  // Implementiert als «Ableitung aus vorherigem Render» (setState WÄHREND
  // des Renders, offizielles React-Muster) statt eines useEffect — so löst
  // der Öffnen-Klick EINEN solve()-Lauf mit bereits gesetztem Schutz aus,
  // ohne 1-Frame-Zwischenzustand, in dem das frische Panel kurz als Tab
  // aufblitzte (und ohne Phantom-Chip). Kein localStorage — reiner
  // Laufzeit-Zustand (Auftrag).
  //
  // Chip-Semantik bleibt UNANGETASTET (P5-Entscheid): `eingeklappteDiff()`
  // nimmt weiterhin nur das selbst per Chevron bediente Panel aus — klappt
  // wegen des Schutzes jetzt ein ANDERES Panel ein, benennt der Chip
  // korrekt dieses andere.
  const [zuletztGeoeffnet, setZuletztGeoeffnet] = useState<string | undefined>(undefined);
  const [sichtSnapshot, setSichtSnapshot] = useState(sichtKey);
  if (sichtSnapshot !== sichtKey) {
    setSichtSnapshot(sichtKey);
    const alteSicht = new Map(sichtSnapshot.split(',').map((t) => t.split(':') as [string, string]));
    const neuOffen = panels.filter((p) => p.sichtbar && alteSicht.get(p.id) === '0').map((p) => p.id);
    if (neuOffen.length === 1) {
      setZuletztGeoeffnet(neuOffen[0]);
    } else if (neuOffen.length > 1) {
      setZuletztGeoeffnet(undefined);
    } else if (zuletztGeoeffnet !== undefined) {
      // Kein neues Panel — prüfen, ob das geschützte gerade zuging.
      const nochSichtbar = panels.some((p) => p.id === zuletztGeoeffnet && p.sichtbar);
      if (!nochSichtbar) setZuletztGeoeffnet(undefined);
    }
  }
  const reflowKey = `${station}|${dockModus}|${leftW}|${rightW}|${feld.x},${feld.y},${feld.w},${feld.h}`;
  const [reflowSnapshot, setReflowSnapshot] = useState(reflowKey);
  if (reflowSnapshot !== reflowKey) {
    setReflowSnapshot(reflowKey);
    if (zuletztGeoeffnet !== undefined) setZuletztGeoeffnet(undefined);
  }

  const overrides = useMemo(() => {
    const sichtbarById = new Map(panels.map((p) => [p.id, p.sichtbar]));
    const ergebnis: Record<string, PanelOverride> = {};
    for (const def of defs) {
      const gespeichert = gespeichertePanels[def.id] ?? {};
      const sichtbar = sichtbarById.get(def.id) ?? false;
      ergebnis[def.id] = { ...gespeichert, geschlossen: !sichtbar };
    }
    return ergebnis;
    // `sichtKey` steht bewusst statt `panels` in den Deps (s. Kommentar oben).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defs, gespeichertePanels, sichtKey]);

  // -----------------------------------------------------------------------
  // Header-Drag (P4) — zwei Modi, je nachdem ob das gegriffene Panel gerade
  // angedockt oder schon schwebend ist:
  //
  //  1. «redock» (angedocktes Panel wird gezogen): der Kopf-Griff ruft
  //     `redockStart()`, DANACH läuft alles über `window`-Pointer-Listener
  //     hier (NICHT über React-Pointer-Handler auf dem Panel selbst — das
  //     Panel wird während des Drags per `gedraggtId` aus dem Solver
  //     ausgeschlossen und verschwindet aus `ergebnis.rects`, würde also
  //     mitten im Drag unmounten, wenn es die eigenen Listener trüge). Ein
  //     Geist-Rechteck (`DockSnapZonen`) folgt dem Zeiger, drei Zonen
  //     (links/rechts/schwebend) zeigen live, wohin losgelassen würde.
  //     Loslassen committed EINEN `panelOverrideSetzen`-Aufruf (dock-Override
  //     bzw. `dock:'float'` + fx/fy bei Zone «schwebend», Konzept A).
  //
  //  2. «floatmove» (schon schwebendes Panel wird frei verschoben): läuft
  //     komplett über Store-Overrides (`fx`/`fy` live bei jedem Move,
  //     geklemmt aufs Feld + Magnet-Einrasten T=16 an Kanten/Mitte des
  //     zentralen Viewports). Loslassen nahe der «Ausgangsanker-Position»
  //     (< 30px zu der Stelle, an die `placeFloats()` dieses EINE Panel ohne
  //     `fx`/`fy` legen würde) löscht `fx`/`fy` wieder (Snap-zurück). Der
  //     separate «Re-Dock»-Knopf (`DockPanel.tsx`) macht das Vollständige:
  //     löscht auch `dock`/`anker` (zurück in die ursprüngliche Spalte).
  //
  // Beide Modi setzen `floatGesperrtId`/`gedraggtId` in den Solver-Optionen
  // (s. `ergebnis`-`useMemo` unten) — genau die zwei Felder, die
  // `dock-kern.ts`s `solve()`/`separate()` laut Auftrag "bereits vorsehen".
  // -----------------------------------------------------------------------

  const [redockAktivId, setRedockAktivId] = useState<string | undefined>(undefined);
  const [redockGeist, setRedockGeist] = useState<DockGeistZustand | null>(null);
  const redockDatenRef = useRef<RedockDatensatz | null>(null);

  /** Viewport-Client-X → Container-relatives X (das Koordinatensystem von
   *  `feld`/den Solver-Rects). Die Positions-Deltas der Drags sind davon
   *  unabhängig (Delta ist Delta), aber `hitZone()` vergleicht den ABSOLUTEN
   *  Zeiger-X mit Feldkanten — dort darf die Container-Verschiebung (heute 0,
   *  aber nirgends garantiert) nicht stillschweigend hineinrechnen. */
  const zuContainerX = (clientX: number): number => {
    const links = wurzelRef.current?.getBoundingClientRect().left ?? 0;
    return clientX - links;
  };

  const redockStart = (id: string, rect: DockRect, clientX: number, clientY: number) => {
    const offsetX = clientX - rect.x;
    const offsetY = clientY - rect.y;
    redockDatenRef.current = { id, w: rect.w, h: rect.h, offsetX, offsetY, warEingeklappt: rect.eingeklappt };
    const zone = hitZone(zuContainerX(clientX), feld, leftW, rightW, dockModus);
    setRedockGeist({ id, x: rect.x, y: rect.y, w: rect.w, h: rect.h, zone });
    setRedockAktivId(id);
  };

  useEffect(() => {
    if (!redockAktivId) return;
    const bewege = (ev: PointerEvent) => {
      const daten = redockDatenRef.current;
      if (!daten) return;
      const x = ev.clientX - daten.offsetX;
      const y = ev.clientY - daten.offsetY;
      const zone = hitZone(zuContainerX(ev.clientX), feld, leftW, rightW, dockModus);
      setRedockGeist({ id: daten.id, x, y, w: daten.w, h: daten.h, zone });
    };
    const loslassen = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', bewege);
      window.removeEventListener('pointerup', loslassen);
      window.removeEventListener('pointercancel', loslassen);
      const daten = redockDatenRef.current;
      redockDatenRef.current = null;
      setRedockAktivId(undefined);
      setRedockGeist(null);
      if (!daten) return;
      const zone = hitZone(zuContainerX(ev.clientX), feld, leftW, rightW, dockModus);
      const x = ev.clientX - daten.offsetX;
      const y = ev.clientY - daten.offsetY;
      if (zone === 'float') {
        // v0.7.9 (A3, Teil A) — Drop-Semantik-Entscheid (Auftrag): die Zone
        // SCHWEBEND öffnet IMMER als volles Float, auch wenn ein Tab
        // (`warEingeklappt`) gezogen wurde — «eingeklappte Floats» existieren
        // im Modell nicht (`placeFloats()` setzt `eingeklappt` hart auf
        // `false`, s. `dock-kern.ts`), Aufklappen ist hier die einzig
        // sinnvolle Semantik.
        panelOverrideSetzen(station, daten.id, {
          dock: 'float',
          anker: 'top',
          fx: Math.round(x),
          fy: Math.round(y),
          fw: Math.max(FLOAT_MIN_W, Math.round(daten.w)),
          fh: Math.min(FLOAT_MAX_H, Math.round(daten.h)),
          groesse: undefined,
          eingeklappt: undefined,
        });
      } else {
        panelOverrideSetzen(station, daten.id, {
          dock: zone,
          anker: undefined,
          fx: undefined,
          fy: undefined,
          fw: undefined,
          fh: undefined,
          groesse: undefined,
          // v0.7.9 (A3, Teil A) — Drop-Semantik-Entscheid (Auftrag): ein
          // Spaltenwechsel (links↔rechts) lässt einen eingeklappten Tab
          // eingeklappt («least surprise» — er poppt beim blossen Verschieben
          // in eine andere Spalte nicht überraschend zum vollen Panel auf).
          // War das gezogene Panel VOR dem Drag kein Tab (voller Kopf
          // gezogen), bleibt das Verhalten wie zuvor unverändert
          // (`undefined` → Solver-Default `false`, aufgeklappt).
          eingeklappt: daten.warEingeklappt ? true : undefined,
        });
      }
    };
    window.addEventListener('pointermove', bewege);
    window.addEventListener('pointerup', loslassen);
    window.addEventListener('pointercancel', loslassen);
    return () => {
      window.removeEventListener('pointermove', bewege);
      window.removeEventListener('pointerup', loslassen);
      window.removeEventListener('pointercancel', loslassen);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redockAktivId, feld, leftW, rightW, dockModus, station]);

  const [floatDragId, setFloatDragId] = useState<string | undefined>(undefined);
  const floatDatenRef = useRef<FloatDragDatensatz | null>(null);
  const floatAufraeumenRef = useRef<(() => void) | null>(null);
  /** v0.7.9 (A3, Teil B — Snap-Zonen für Schwebende, ROADMAP-359-Restpunkt) —
   *  NUR gesetzt, solange ein schwebendes Panel gezogen wird UND der Zeiger
   *  gerade in einer Andock-Zone (links/rechts) steht — anders als
   *  `redockGeist` (der die ganze Drag-Dauer über sichtbar ist) blendet
   *  dieser Geist ausserhalb der Zonen-Nähe komplett aus: das bisherige
   *  freie `floatmove` (Magnet/Snap-zurück) bleibt dort optisch unverändert,
   *  kein Overlay stört. Wiederverwendet dieselbe `DockSnapZonen`-Anzeige
   *  wie der Redock-Drag, aber mit `mitSchwebendZone={false}` (ein bereits
   *  schwebendes Panel hat keine sinnvolle "schwebend bleiben"-Zone). */
  const [floatSnapGeist, setFloatSnapGeist] = useState<DockGeistZustand | null>(null);

  // v0.7.9 (A1, Regressions-Fix am P4-Bestand): die window-Listener werden
  // SYNCHRON hier im Start-Handler registriert, nicht mehr über einen
  // `useEffect([floatDragId])`. Der Effekt-Weg hatte ein latentes Renn-
  // fenster: passive Effekte laufen erst NACH Commit+Paint — unter Last
  // (SwiftShader + inzwischen 20 Design-Panels) verarbeitete der Browser
  // die gesamte Pointer-Sequenz eines schnellen Drags (moves + up), BEVOR
  // der Listener hing; der Drag verpuffte komplett und der liegengebliebene
  // Späte-Listener vergiftete die nächste Geste (real ab P5+2 Floats
  // reproduziert, `dock-interaktion.spec.ts` «HUD frei ziehen»/«Pop-out»).
  // Closure-Semantik ist identisch zum alten Effekt (`station` ist über die
  // Lebensdauer einer DockFlaeche konstant, `panelOverrideSetzen` eine
  // stabile Store-Action, `vp` steckt wie bisher in `daten`). Der
  // `floatDragId`-State bleibt NUR als Solver-Eingabe (`floatGesperrtId`).
  const floatDragStart = (id: string, rect: DockRect, clientX: number, clientY: number, anker: FloatAnker | undefined) => {
    floatAufraeumenRef.current?.(); // Sicherheitsnetz gegen Doppel-Starts
    floatDatenRef.current = {
      id,
      startFx: rect.x,
      startFy: rect.y,
      startPX: clientX,
      startPY: clientY,
      w: rect.w,
      h: rect.h,
      anker: anker ?? 'top',
      vp: ergebnis.viewport,
    };
    setFloatDragId(id);
    // v0.7.9 (A3, Teil B) — welche Andock-Zone der Zeiger beim letzten `bewege`
    // getroffen hat; `loslassen` liest sie, um zu entscheiden, ob dieser Drop
    // andockt oder das bisherige `floatmove` (Magnet/Snap-zurück) greift. Als
    // `let` in DIESER `floatDragStart`-Invokation gehalten (nicht State) —
    // beide Closures (`bewege`/`loslassen`) werden pro Drag frisch gebaut,
    // kein Stale-Value-Risiko über mehrere Drags hinweg.
    let aktuelleZone: DockZone = 'float';

    const bewege = (ev: PointerEvent) => {
      const daten = floatDatenRef.current;
      if (!daten) return;
      const { vp } = daten;
      let nx = daten.startFx + (ev.clientX - daten.startPX);
      let ny = daten.startFy + (ev.clientY - daten.startPY);
      nx = Math.min(Math.max(vp.x, nx), vp.x + vp.w - daten.w);
      ny = Math.min(Math.max(vp.y, ny), vp.y + vp.h - daten.h);
      nx = magnet(nx, [vp.x, vp.x + (vp.w - daten.w) / 2, vp.x + vp.w - daten.w], FLOAT_MAGNET_T);
      ny = magnet(ny, [vp.y, vp.y + (vp.h - daten.h) / 2, vp.y + vp.h - daten.h], FLOAT_MAGNET_T);
      panelOverrideSetzen(station, daten.id, { fx: Math.round(nx), fy: Math.round(ny) });

      // Snap-Zonen für Schwebende — SCHWELLE (dokumentierter Entscheid):
      // «Zonen-Nähe» heisst hier «der Zeiger steht SEITLICH AUSSERHALB des
      // zentralen Viewports» (px < vp.x bzw. px > vp.x+vp.w, Container-
      // Koordinaten wie bei `hitZone()`), NICHT das ±70px-`hitZone()`-Band
      // des Redock-Drags. Grund (real gemessen, nicht theoretisch): das
      // hitZone-Band reicht `SNAP_ZONE_STRAHL` über die Spaltenbreite hinaus
      // IN den Viewport hinein — bei leerer linker Spalte (lw=0, vp.x =
      // feld.x) frässe es die komplette linke Magnet-Kante des bisherigen
      // floatmove (T=16 < 70): ein an die Viewport-Kante gezogenes Panel
      // würde beim Loslassen andocken statt magnetisch liegen zu bleiben
      // (genau so brachen die Bestands-Specs «Pop-out»/«HUD frei ziehen»).
      // Da Floats ohnehin auf den Viewport GEKLEMMT sind (Klemmung oben),
      // ist «Zeiger verlässt den Viewport seitlich Richtung Spalte/Chrome»
      // das natürliche Andock-Signal — und strikt ENGER als `hitZone()`
      // (px < vp.x ⇒ hitZone 'left', weil vp.x = feld.x+railW+lw ≤
      // feld.x+leftW+STRAHL; rechts analog): jede hier aktive Zone zeigt
      // auch das Overlay (`DockSnapZonen`, ±70-Rechtecke) als aktiv an.
      // Mitten im Feld bleibt das Overlay aus — das bisherige freie
      // Verschieben (Magnet/Snap-zurück) bleibt optisch wie semantisch
      // unangetastet.
      const px = zuContainerX(ev.clientX);
      aktuelleZone = px < vp.x ? 'left' : px > vp.x + vp.w ? 'right' : 'float';
      if (aktuelleZone === 'left' || aktuelleZone === 'right') {
        setFloatSnapGeist({ id: daten.id, x: nx, y: ny, w: daten.w, h: daten.h, zone: aktuelleZone });
      } else {
        setFloatSnapGeist(null);
      }
    };
    const aufraeumen = () => {
      window.removeEventListener('pointermove', bewege);
      window.removeEventListener('pointerup', loslassen);
      window.removeEventListener('pointercancel', loslassen);
      floatAufraeumenRef.current = null;
    };
    const loslassen = () => {
      aufraeumen();
      setFloatSnapGeist(null);
      const daten = floatDatenRef.current;
      floatDatenRef.current = null;
      setFloatDragId(undefined);
      if (!daten) return;
      if (aktuelleZone === 'left' || aktuelleZone === 'right') {
        // Drop in einer Andock-Zone: dockt an — dieselbe Override-Form wie
        // ein Redock-Drop auf links/rechts (`redockStart`s `loslassen`
        // oben), `fx`/`fy`/`fw`/`fh` werden gelöscht (der Solver misst die
        // Spalten-Grösse selbst).
        panelOverrideSetzen(station, daten.id, {
          dock: aktuelleZone,
          anker: undefined,
          fx: undefined,
          fy: undefined,
          fw: undefined,
          fh: undefined,
          groesse: undefined,
          eingeklappt: undefined,
        });
        return;
      }
      // Bisheriges Verhalten unverändert: nahe der Ausgangsanker-Position
      // (< 30px) löscht `fx`/`fy` wieder (Snap-zurück), sonst bleibt das
      // Panel an der frei gezogenen Position liegen.
      const anker2 = ankerAutoPosition(daten.anker, daten.w, daten.h, daten.vp);
      const aktuellesLayout = useDockZustand.getState().layoutFuer(station);
      const aktuellesOverride = aktuellesLayout.panels[daten.id];
      const curX = aktuellesOverride?.fx ?? daten.startFx;
      const curY = aktuellesOverride?.fy ?? daten.startFy;
      const distanz = Math.hypot(curX - anker2.x, curY - anker2.y);
      if (distanz <= FLOAT_SNAPBACK_T) {
        panelOverrideSetzen(station, daten.id, { fx: undefined, fy: undefined });
      }
    };
    floatAufraeumenRef.current = aufraeumen;
    window.addEventListener('pointermove', bewege);
    window.addEventListener('pointerup', loslassen);
    window.addEventListener('pointercancel', loslassen);
  };

  // Unmount mitten im Drag (theoretisch: Stationswechsel) — Listener lösen.
  useEffect(() => () => floatAufraeumenRef.current?.(), []);

  const popOut = (id: string, rect: DockRect) => {
    panelOverrideSetzen(station, id, {
      dock: 'float',
      anker: 'top',
      fx: Math.round(rect.x),
      fy: Math.round(rect.y),
      fw: Math.max(FLOAT_MIN_W, Math.round(rect.w)),
      fh: Math.min(FLOAT_MAX_H, Math.round(rect.h)),
      groesse: undefined,
      eingeklappt: undefined,
    });
  };

  const vollRedock = (id: string) => {
    panelOverrideSetzen(station, id, {
      dock: undefined,
      anker: undefined,
      fx: undefined,
      fy: undefined,
      fw: undefined,
      fh: undefined,
      groesse: undefined,
      eingeklappt: undefined,
    });
  };

  // Zwei-Felder-Kompromiss (P4, s. `TOP_BAND_RECHTS`-Kommentar): der Solver
  // kennt nur EIN Feld-Rechteck für beide Spalten — die Plan-Chrome-Zeile
  // oben rechts braucht aber nur in der RECHTEN Spalte Luft. Darum zweimal
  // `solve()` (pure Funktion, zwei Aufrufe sind billig): einmal mit dem
  // vollen Feld (liefert linke Spalte, Viewport, Floats, linke Splitter),
  // einmal mit einem oben um `TOP_BAND_RECHTS` verkürzten Feld — daraus
  // werden NUR die Rechtecke/Splitter der rechten Spalte übernommen.
  // Schwebende Panels (dock 'float') kommen bewusst aus dem HAUPT-Lauf
  // (voller Viewport, keine Panel-IDs der rechten Spalte).
  const ergebnis = useMemo(() => {
    const basisOpts = {
      modus: dockModus,
      leftW,
      rightW,
      overrides,
      ...(redockAktivId !== undefined ? { gedraggtId: redockAktivId } : {}),
      ...(floatDragId !== undefined ? { floatGesperrtId: floatDragId } : {}),
      // v0.7.9 (A6-Restpunkt): das frisch geöffnete Panel klappt nie selbst
      // ein — s. Kommentarblock bei `zuletztGeoeffnet` oben.
      ...(zuletztGeoeffnet !== undefined ? { zuletztGeoeffnet } : {}),
    };
    const haupt = solve(defs, { feld, ...basisOpts });
    // P6 (Konzept B): ctop-Umbruch-Kompensation — NUR die Panels, die der
    // Solver im B-Modus tatsächlich in den ctop-Streifen routet (dieselbe
    // Regel wie `solve()`: effektives dock 'float' ⊕ effektiver anker 'top').
    const ctopIds =
      dockModus === 'B'
        ? defs
            .filter(
              (d) =>
                (overrides[d.id]?.dock ?? d.dock) === 'float' &&
                (overrides[d.id]?.anker ?? d.anker) === 'top',
            )
            .map((d) => d.id)
        : [];
    // Effektive rechte Spalte = Registry-Dock ⊕ persistierter Override
    // (identisch zur `mischePanel`-Regel im Solver: Override gewinnt).
    const rechtsIds = new Set(
      defs.filter((d) => (overrides[d.id]?.dock ?? d.dock) === 'right').map((d) => d.id),
    );
    if (rechtsIds.size === 0 || feld.h <= TOP_BAND_RECHTS) {
      const rects: typeof haupt.rects = { ...haupt.rects };
      wickleCtopStreifen(rects, ctopIds, feld.y, haupt.viewport);
      return { rects, viewport: haupt.viewport, splitters: haupt.splitters };
    }
    const feldRechts = { x: feld.x, y: feld.y + TOP_BAND_RECHTS, w: feld.w, h: feld.h - TOP_BAND_RECHTS };
    const rechts = solve(defs, { feld: feldRechts, ...basisOpts });
    const rects: typeof haupt.rects = { ...haupt.rects };
    for (const id of rechtsIds) {
      const r = rechts.rects[id];
      if (r) rects[id] = r;
      else delete rects[id];
    }
    const splitters = [
      ...haupt.splitters.filter((s) => s.id !== 'spR' && !(s.a !== undefined && rechtsIds.has(s.a))),
      ...rechts.splitters.filter((s) => s.id === 'spR' || (s.a !== undefined && rechtsIds.has(s.a))),
    ];
    wickleCtopStreifen(rects, ctopIds, feld.y, haupt.viewport);
    return { rects, viewport: haupt.viewport, splitters };
  }, [defs, feld, dockModus, leftW, rightW, overrides, redockAktivId, floatDragId, zuletztGeoeffnet]);

  // v0.7.8 Welle 3 (P7, «Kosmo ordnet») — exponiert die aktuellen Panel-
  // Kopf-Rechtecke an `useDockOrbRuntime`, NACH jedem `solve()`-Lauf (also
  // bei jeder Layout-Änderung, egal ob durch Menschen oder `ui.dock*`
  // ausgelöst) — `KosmoOrdnetOrb.tsx` liest nur diesen Store, kennt den
  // Solver selbst nicht.
  const setzeOrbRects = useDockOrbRuntime((s) => s.setzeRects);
  useEffect(() => {
    const naechste: Record<string, { x: number; y: number; w: number; h: number }> = {};
    for (const [id, r] of Object.entries(ergebnis.rects)) {
      naechste[id] = { x: r.x, y: r.y, w: r.w, h: r.h };
    }
    setzeOrbRects(naechste);
  }, [ergebnis, setzeOrbRects]);

  // -----------------------------------------------------------------------
  // C6 — Auto-Reaktions-Hinweis (P5): vergleicht die Menge eingeklappter
  // Panel-IDs vor/nach jeder Layout-verändernden Aktion (Panel geöffnet,
  // Chevron-Ein/Ausklappen, Anheften, Neu-Andocken) und zeigt kurz einen
  // Chip (`eingeklappteDiff()`, `dock-zustand.ts`, Semantik 1:1 wie der
  // Prototyp `announce()`). `ausgeloesterIdRef` hält NUR das Panel fest,
  // dessen EIGENES `eingeklappt` der Mensch gerade DIREKT per Chevron/Tab
  // umgeschaltet hat (`einklappenUmschalten`, `DockPanel.tsx`) — das darf
  // laut `eingeklappteDiff()`-Vertrag nicht als «Auto-Reaktion» auf SICH
  // SELBST gemeldet werden (sonst ein redundanter Chip für die eigene,
  // bewusste Geste). BEWUSST NICHT ausgeschlossen: das gerade frisch
  // GEÖFFNETE Panel selbst — wenn GENAU DAS wegen Platzmangel sofort
  // einklappt (der Alltagsfall des Auftragsbeispiels «zweites Panel öffnen
  // bis eines einklappt», Solver wählt das unwichtigste EXPANDIERTE Panel,
  // das kann das gerade geöffnete selbst sein, s. `stack()` in
  // `dock-kern.ts`), ist das GENAU die Überraschung, die der Chip erklären
  // soll — kein Grund, sie zu unterdrücken.
  // -----------------------------------------------------------------------
  const eingeklapptKey = useMemo(
    () =>
      Object.entries(ergebnis.rects)
        .filter(([, r]) => r.eingeklappt)
        .map(([id]) => id)
        .sort()
        .join(','),
    [ergebnis],
  );
  const eingeklapptVorherRef = useRef<string[]>([]);
  const ausgeloesterIdRef = useRef<string | undefined>(undefined);
  const vorherigeOverridesRef = useRef<Record<string, PanelOverride>>({});
  const [hinweisText, setHinweisText] = useState<string | null>(null);
  const hinweisAblaufRef = useRef<number | undefined>(undefined);

  // Der Mensch klappt EIN bestimmtes Panel selbst per Chevron/Tab ein oder
  // aus (`einklappenUmschalten`, `DockPanel.tsx` → persistierter
  // `override.eingeklappt` wechselt) — Selbstbedienung, keine automatische
  // Reaktion des Solvers auf DIESES Panel.
  useEffect(() => {
    const vorherOv = vorherigeOverridesRef.current;
    for (const [id, ov] of Object.entries(gespeichertePanels)) {
      const altEingeklappt = vorherOv[id]?.eingeklappt ?? false;
      const neuEingeklappt = ov.eingeklappt ?? false;
      if (altEingeklappt !== neuEingeklappt) ausgeloesterIdRef.current = id;
    }
    vorherigeOverridesRef.current = gespeichertePanels;
  }, [gespeichertePanels]);

  // Der eigentliche Diff — 40ms-Defer, EXAKT EINMAL je tatsächlicher
  // Änderung der eingeklappten Menge (`eingeklapptKey`), nicht je Render.
  useEffect(() => {
    // v0.7.9 (A3, Teil A) — während eines Redock-Drags PAUSIERT der Diff:
    // das gezogene Panel fehlt in `ergebnis.rects` (`gedraggtId`, nur der
    // Geist ist unterwegs) — ein gezogener EINGEKLAPPTER Tab verschwände
    // damit aus der eingeklappten Menge und der Chip meldete fälschlich
    // «… wieder geöffnet» mitten in der Geste (real im A3-Beleg-Screenshot
    // aufgefallen; vor A3 unerreichbar, weil Tabs keine Drag-Handles waren).
    // `eingeklapptVorherRef` bleibt dabei bewusst STEHEN — der nächste Lauf
    // nach dem Drop (redockAktivId in den Deps) vergleicht gegen den
    // Vor-Drag-Stand: Spaltenwechsel eingeklappt→eingeklappt = kein Chip,
    // Drop in der Schwebend-Zone = korrekt «wieder geöffnet».
    if (redockAktivId !== undefined) return;
    const timer = window.setTimeout(() => {
      const vorher = eingeklapptVorherRef.current;
      const nachher = eingeklapptKey ? eingeklapptKey.split(',') : [];
      const diff = eingeklappteDiff(vorher, nachher, ausgeloesterIdRef.current);
      eingeklapptVorherRef.current = nachher;
      ausgeloesterIdRef.current = undefined;
      const meldungId = diff.neuEingeklappt ?? diff.wiederOffen;
      if (!meldungId) return;
      const titel = defs.find((d) => d.id === meldungId)?.titel ?? meldungId;
      const text = diff.neuEingeklappt ? `${titel} eingeklappt · Platz geschaffen` : `${titel} wieder geöffnet`;
      setHinweisText(text);
      if (hinweisAblaufRef.current) window.clearTimeout(hinweisAblaufRef.current);
      hinweisAblaufRef.current = window.setTimeout(() => setHinweisText(null), HINWEIS_DAUER_MS);
    }, HINWEIS_DEFER_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eingeklapptKey, defs, redockAktivId]);
  useEffect(
    () => () => {
      if (hinweisAblaufRef.current) window.clearTimeout(hinweisAblaufRef.current);
    },
    [],
  );

  if (feld.w <= 0 || feld.h <= 0) {
    // Erster Messlauf noch nicht gelaufen (Layout-Effekt läuft nach dem
    // ersten Paint) — nichts rendern statt kollabierter Rechtecke zu zeigen.
    return <div ref={wurzelRef} className="k-dock-flaeche" data-testid="dock-flaeche" />;
  }

  return (
    <div ref={wurzelRef} className="k-dock-flaeche" data-testid="dock-flaeche">
      <DockAutoHinweisChip text={hinweisText} />
      {panels.map((p) => {
        const rect = ergebnis.rects[p.id];
        if (!rect) return null; // geschlossen ODER gerade gedraggt — kein Platz reserviert
        const def = defs.find((d) => d.id === p.id);
        if (!def) return null;
        return (
          <DockPanel
            key={p.id}
            station={station}
            def={def}
            rect={rect}
            modus={dockModus}
            angeheftet={!!gespeichertePanels[p.id]?.angeheftet}
            onRedockDragStart={redockStart}
            onFloatDragStart={floatDragStart}
            onPopOut={popOut}
            onRedock={vollRedock}
            {...(p.schliessen ? { onSchliessen: p.schliessen } : {})}
          >
            {p.inhalt}
          </DockPanel>
        );
      })}
      {ergebnis.splitters.map((s) => (
        <DockSplitter
          key={s.id}
          station={station}
          splitter={s}
          leftW={leftW}
          rightW={rightW}
          {...(s.a && ergebnis.rects[s.a] ? { rectA: ergebnis.rects[s.a] } : {})}
          {...(s.b && ergebnis.rects[s.b] ? { rectB: ergebnis.rects[s.b] } : {})}
        />
      ))}
      {redockGeist && <DockSnapZonen feld={feld} leftW={leftW} rightW={rightW} modus={dockModus} geist={redockGeist} />}
      {floatSnapGeist && (
        <DockSnapZonen feld={feld} leftW={leftW} rightW={rightW} modus={dockModus} geist={floatSnapGeist} mitSchwebendZone={false} />
      )}
      <KosmoOrdnetOrb />
    </div>
  );
}
