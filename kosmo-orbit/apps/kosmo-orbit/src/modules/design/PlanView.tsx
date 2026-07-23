import { useEffect, useMemo, useRef, useState } from 'react';
import { KSelect, meldeFehler } from '@kosmo/ui';
import './plan-view-chrome.css';
import { BILDSCHIRM_PLAN, DASH, dashWelt, derivePlan, deriveDimensions, dimensionLabel, formatLength, gelaenderTeile, moebelGeometrie, nachbarKontextStufe, pocheEntscheid, projiziereOeffnungCenter, pruefeGrundriss, rampenTeile, raumGraph, regionToPath, UMBAU_FLAECHEN, UMBAU_STIFTE, wandAchsenPunkt, type BauPhase, type Beam, type DetailMarker, type Furniture, type Gelaender, type Kommentar, type MassBody, type MassKette, type Opening, type PocheModus, type Pt, type Rampe, type Roof, type Slab, type Stair, type Wall, type Zone } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';
import { useUiZustand } from '../../state/ui-zustand';
import { usePlanAnsicht } from '../../state/plan-ansicht';
import { useUnternehmerplan } from './unternehmerplan';
import type { ViewportHandlers } from './Viewport3D';
import { SketchOverlay } from './SketchOverlay';
import { KommentarErfassenAmPunkt } from './island/inhalte/kommentar-formular';
import { distToSegment, outlineOf, pickEntityAt } from './plan-hit-test';
import { NavLeiste } from './NavLeiste';
import { planLod, type PlanLod } from './planLod';
import { cursor2dFuer, istEingabefeld } from './kurztasten';
import { FLING_STOPP_GESCHWINDIGKEIT, flingSchritt, flingTracker, gestenDetektor } from './eingabe-3d';
import { tick as haptikTick } from '../../state/haptik';
import { useDockZeichenfeld } from '../../state/dock-zeichenfeld-runtime';
import { ViewportKontextmenue, type KontextAktion } from './ViewportKontextmenue';

/**
 * v0.6.6 / Welle 2 Stream C (MOTION-KONZEPT-066 §5): `prefers-reduced-motion`
 * schaltet Fling/Momentum UND die Doppeltap-Zoom-Animation ab (§1.3/§7 — der
 * E2E-Stabilitätsvertrag; Playwright erzwingt reduced-motion standardmässig,
 * Specs, die die Bewegung SELBST prüfen, schalten gezielt `no-preference`).
 * Dieselbe Feature-Detection wie `packages/kosmo-ui/src/motion.ts`
 * `mitUebergang()` — hier lokal dupliziert, weil `kosmo-ui` eingefroren ist
 * und keinen eigenständig exportierten Baustein dafür anbietet.
 */
function reduzierteBewegung(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Näherung von `--k-feder` (MOTION-KONZEPT-066 §2: schnelles Anreissen,
 * weiches Setzen mit ~2% Überschwung) als JS-Easing — `easeOutBack` mit
 * kleinem Rückschwung-Faktor, ohne ein CSS-Bezier-Paket zu brauchen.
 */
function federGefuehl(t: number): number {
  const c1 = 0.35; // klein gehalten → Überschwung bleibt subtil (~2%)
  const c3 = c1 + 1;
  const p = t - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}

/**
 * PlanView — der lebende Grundriss als semantisches SVG.
 * Stifte/Schraffuren kommen aus CSS-Klassen (SIA-Konvention), nie aus der
 * Geometrie: Umstiften ohne Neuableitung. Zeichnen funktioniert hier mit
 * denselben Werkzeug-Handlers wie im 3D — 2D und 3D sind gleichberechtigt.
 *
 * Plan-LOD (B2, Owner-Befund «Grundriss aus Distanz schlecht»): nur HIER,
 * nie im Export/Druck (derive/plansvg.ts bleibt masstabstreu, Goldens
 * byte-identisch). Die Stufe kommt aus `planLod` (reine Funktion mit
 * Hysterese gegen Flackern an der Schwelle, eigene Unit-Tests) und schaltet
 * bestehende SVG-Gruppen per `display` bzw. filtert Feindetails vor dem
 * Rendern — kein Re-Mount, kein rAF-Gefrickel nötig.
 *
 * F5 (v0.6.4, Owner-Befund «Tastenkombination wie ArchiCAD»): Leertaste
 * halten + linke Maustaste ziehen = Pan (Photoshop/ArchiCAD-Muskelgedächtnis),
 * ZUSÄTZLICH zum bestehenden Mitteltaste-/Rechtsklick-/`navModus2d`-Pan, das
 * unverändert bleibt. Solange die Leertaste gehalten wird, pausiert das
 * Werkzeug-Gummiband (kein `onGroundMove`) — siehe `kurztasten.ts` für den
 * Fokus-Guard (Kosmo-Chat-Eingaben dürfen die Leertaste normal tippen).
 * F9 (Owner-Befund «Maus soll auf die Umgebung reagieren»): der Cursor auf
 * dem Plan-SVG wechselt kontextabhängig (`cursor2dFuer`, `kurztasten.ts`) —
 * dieselbe Systematik wie `werkzeugCursorFuer` im 3D (`eingabe-3d.ts`).
 *
 * v0.6.6 / Welle 2 Stream C (MOTION-KONZEPT-066 §5): Fling/Momentum-Pan
 * (Maus-Drag UND Zwei-Finger-Touch-Pan), Doppeltap-/Doppelklick-Zoom auf
 * leerer Fläche (Auswahl-Werkzeug) und Touch-Longpress-Kontextmenü auf einem
 * Element — alle drei additiv über den gemeinsamen Gesten-Kern
 * (`eingabe-3d.ts` `flingSchritt`/`flingTracker`/`gestenDetektor`). Bestehende
 * Pfade bleiben unangetastet: Einzelklick-Aktionen (`onGroundClick`/`onPick`)
 * feuern weiterhin SOFORT (keine Doppeltap-Wartezeit), Pinch-Zoom/Space-Pan/
 * Mausrad-Zoom (ohne Momentum) sind unverändert.
 */

/**
 * v0.7.0 E2 (`docs/V070-KONZEPT.md`): Bildschirm-Poché folgt derselben
 * `pocheEntscheid()`-Utility wie der Export (`derive/plansvg.ts`) — statt
 * eine zweite Farblogik zu pflegen, fragen wir nur nach dem `art`-Ergebnis.
 * Bewusst schmal: nur `art === 'schwarz'` wechselt auf die Tinte
 * (`var(--k-ink)`); jede andere `art` (grau/daemmung/tint/umbau/thema/none)
 * lässt die bestehende, Theme-fähige Fill-Kette unangetastet — Werkplan/
 * Modus 'material' bleiben so exakt wie heute (kein zweiter, abweichender
 * Bildschirm-Regelsatz).
 */
function pocheEntscheidFuer(
  classes: readonly string[],
  phase: BauPhase,
  modus: PocheModus,
): ReturnType<typeof pocheEntscheid> {
  const umbau = classes.includes('renovation-neu')
    ? ('neu' as const)
    : classes.includes('renovation-abbruch')
      ? ('abbruch' as const)
      : classes.includes('renovation-bestand')
        ? ('bestand' as const)
        : undefined;
  return pocheEntscheid({
    phase,
    modus,
    klassen: {
      tragend: classes.includes('tragend') || classes.includes('stuetze'),
      daemmung: classes.includes('daemmung'),
      projektion: classes.includes('projection'),
    },
    ...(umbau ? { umbau } : {}),
    kontext: 'grundriss',
  });
}

/** Nur die `art` — für Stellen, die keine Schichten-Feinheit brauchen (Trace). */
function pocheArtFuer(classes: readonly string[], phase: BauPhase, modus: PocheModus) {
  return pocheEntscheidFuer(classes, phase, modus).art;
}

/**
 * C-26 (PB5, `docs/V084-SPEZ.md` §7 D8/D13): Klick-Toleranzen für Masskette
 * (offene Punktkette) und Kommentar (ein Welt-Punkt) — dieselbe Grössen-
 * ordnung wie `plan-hit-test.ts`s `TOLERANZ`/`AUSSPARUNG_TOLERANZ` (dort
 * bewusst NICHT angefasst, s. `pickAt` unten), hier lokal, weil beide
 * Entitäten dort keine `outline`/Wand-Achse im Sinn der Datei haben.
 */
const MASSKETTE_TOLERANZ = 150; // mm, analog Wand-Toleranz
const KOMMENTAR_TOLERANZ = 300; // mm, grosszügiger Marker-Klickradius

/**
 * PB6 (v0.8.4 Token-Sweep, `docs/V084-SPEZ.md` §5/§9 C-29): benannte
 * Ersatz-Konstanten für Hex-Werte, die KEINEM bestehenden `--k-*`-Token in
 * `packages/kosmo-ui/src/aura.css` entsprechen (aura.css ist im W5-Token-
 * Sweep gesperrt — kein neues Token wird dafür erfunden). Reine Umbenennung,
 * 0 Wertänderung, 0 Optik-Änderung.
 */
// E7 (v0.8.5, docs/V085-SPEZ.md): die vier PB6-Kandidaten (ROADMAP 471)
// sind seit PB4-085 kanonische aura.css-Token (`:root`-invariant, Werte
// byte-gleich gespiegelt — Herkunfts-Begründungen stehen jetzt DORT am
// Token). Diese Konstanten konsumieren nur noch das Token; SVG-DOM im
// Browser löst `var()` in Attributen auf.
const PLAN_HATCH_BETON_TINT = 'var(--k-print-tint)';
const PLAN_HATCH_BETON_LINIE = 'var(--k-print-linie)';
// Unternehmerplan-Referenz-Overlay (C4b/C-E5): «reiner Durchpaus-Layer,
// nie wählbar» — bewusst unabhängig vom UI-Akzent, darum das
// theme-invariante Diagnose-Blau statt `--k-accent`.
const UNTERNEHMERPLAN_OVERLAY_FARBE = 'var(--k-diagnose)';
// Verletzte-Zone-Warnstufe NEBEN `--k-warning` (Fehlerfall bleibt
// `var(--k-danger)` am Verbraucher).
const ZONE_VERLETZT_WARN_FARBE = 'var(--k-warning-2)';
// Raumgraph-Kanten/-Knoten (Diagnose-Overlay). Seit v0.8.7 (PA4,
// docs/V087-SPEZ.md §2 D5) das kanonische `--k-graph`-Token aus aura.css —
// theme-invariant und byte-gleich zum bisherigen `#2455a4`; bewusst NICHT
// `var(--k-accent)` (hinge am UI-Akzent, Teal-Default wäre eine sichtbare
// Änderung) und NICHT `var(--k-diagnose)` (das Durchpaus-Blau `#1a6fb5`
// ist ein anderer Ton).
const RAUMGRAPH_FARBE = 'var(--k-graph)';

/**
 * E-K27a (v0.9.0, Owner-Register K27 ANZEIGE-Ebene, wörtlich: «je nach
 * ansicht muss du text kleiner oder grösser machen solche textfelde sind
 * mind 1.8mm bis max. 5mm gross (wie archicad, das es leserlich ist)»):
 * welt-fixe Plan-Schrift wuchs bisher ungebremst mit dem Zoom. Dieser
 * Klammer-Helfer hält die BILDSCHIRM-Grösse im Band 1.8–5 mm
 * (Papier-Äquivalent bei 96 dpi); innerhalb des Bands bleibt die Schrift
 * exakt wie bisher (kein Byte Unterschied bei mittleren Zoomstufen).
 * Rückgabe in Welt-Einheiten fürs SVG. Die DRUCK-Schrift (derive/plansvg)
 * ist bewusst unberührt — K27-Druckmass ist deklariertes Nicht-Ziel mit
 * eigenem Golden-Zug (V090-SPEZ §E-K27a); Goldens bleiben byte-still.
 */
const PX_PRO_MM = 96 / 25.4;
const ZOOMTEXT_MIN_PX = 1.8 * PX_PRO_MM;
const ZOOMTEXT_MAX_PX = 5 * PX_PRO_MM;
function zoomTextFs(fsWelt: number, scale: number): number {
  const px = fsWelt * scale;
  if (px < ZOOMTEXT_MIN_PX) return ZOOMTEXT_MIN_PX / scale;
  if (px > ZOOMTEXT_MAX_PX) return ZOOMTEXT_MAX_PX / scale;
  return fsWelt;
}

export function PlanView({
  handlers,
  onLod,
  modus,
}: {
  handlers: React.RefObject<ViewportHandlers>;
  /** Serie K A5 (K15, Statusleiste): meldet die aktuelle Plan-LOD-Stufe an den
   *  Aufrufer — reiner Zustandsspiegel, ändert nichts an der LOD-Logik selbst
   *  (`planLod.ts` bleibt unberührt). Optional, weil ältere/isolierte Mounts
   *  (Tests) den Callback nicht brauchen. */
  onLod?: (lod: PlanLod) => void;
  /** Kritik-065 Befund [C] «Grundriss-Ansicht passt beim Wechsel nicht ein»:
   *  `split`→`2d` (und zurück) remountet PlanView NICHT (derselbe JSX-Zweig
   *  in DesignWorkspace.tsx, `viewMode !== '3d'`) — der Mount-Erstfit unten
   *  läuft also nur einmal, mit der SCHMALEN Split-Pane-Grösse. Optional,
   *  damit isolierte Mounts (Tests, quad-Kacheln) unverändert bleiben. */
  modus?: 'split' | '2d' | 'quad';
}) {
  const revision = useProject((s) => s.revision);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const doc = useProject.getState().doc;
  // PD2 Default-Flip: die PlanView-eigene HUD-Zeile (Trace-Select/U-Plan-
  // Toggle/Graph-Toggle/Achsen-Toggle/NavLeiste) rendert nur im Modus
  // 'manuell' — im Island-Modus übernimmt die ANSICHT-Insel dieselben drei
  // Store-Werte (`island/inhalte/ansicht.tsx`, PD3c), s. Rückgabe-JSX unten.
  const designOberflaeche = useUiZustand((s) => s.designOberflaeche);
  // PD3c (`docs/ISLAND-UI-SPEZ.md` §6 Sanktion 7): Achsen/Trace/Graph kommen
  // jetzt aus dem geteilten `state/plan-ansicht.ts`-Store statt aus lokalem
  // `useState` — mechanische Migration (Store-Kommentar dort), Verhalten im
  // Manuell-Modus bleibt byte-gleich, die ANSICHT-Insel kann dieselben Werte
  // jetzt mit echter Wirkung lesen/schreiben.
  // Raumgraph-Overlay (Finch-Clip): Knoten auf Raumzentren, Kanten an Übergängen
  const graphAn = usePlanAnsicht((s) => s.graphAn);
  const setGraphAn = usePlanAnsicht((s) => s.setGraphAn);
  // Trace (RE-ARCHICAD A8): anderes Geschoss blass unterlegen — reine
  // Arbeitshilfe am Bildschirm, nie Planinhalt
  const traceId = usePlanAnsicht((s) => s.traceId);
  const setTraceId = usePlanAnsicht((s) => s.setTraceId);
  // T3: Stützenraster-Achsen (Konstruktionslinien des Tragrasters) standard-
  // mässig aus — nur das Bauteil, nicht die Zeichen-Achse. Über den Umschalter
  // wieder einblendbar (Druck/Export bleibt unverändert, siehe derive/plan.ts).
  const achsenAn = usePlanAnsicht((s) => s.achsenAn);
  const setAchsenAn = usePlanAnsicht((s) => s.setAchsenAn);
  // T3: Navigations-Modus fürs linke Mausdrücken (Trackpad-Komfort) — Rad,
  // Mitteltaste, Rechtsklick/Alt-Klick bleiben unverändert Pan/Zoom.
  const [navModus2d, setNavModus2d] = useState<'werkzeug' | 'pan' | 'zoom'>('werkzeug');
  const zoomDrag = useRef<{ y: number; scale: number } | null>(null);
  const graph = useMemo(() => {
    if (!graphAn || !activeStoreyId) return null;
    const g = raumGraph(doc, activeStoreyId);
    const zentrum = (z: Zone) => {
      let x = 0, y = 0;
      for (const p of z.outline) { x += p.x; y += p.y; }
      return { x: x / z.outline.length, y: y / z.outline.length };
    };
    // Nur echte Räume (mit Raumtyp) — Container wie Geschoss/Wohnungs-Umriss
    // haben keinen und würden den Graph zum Spinnennetz machen
    const raeume = g.zonen.filter((z) => z.raumTyp);
    const zentren = new Map(raeume.map((z) => [z.id, zentrum(z)]));
    return { zentren, kanten: g.kanten.filter((k) => zentren.has(k.a) && zentren.has(k.b)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphAn, doc, activeStoreyId, revision]);

  // v0.7.1 Kritik-1-Auflage [B]: Kontext-Zonen (Parzelle strichpunktiert,
  // Nachbarn grau) waren nach dem Standort-Import im Grundriss UNSICHTBAR —
  // sie fliessen nicht durch derivePlan (nur Raum-Zonen), also zeichnet die
  // PlanView sie hier direkt aus dem Doc (Muster Auswahl-Highlight). Ohne
  // Kontext-Zonen ist die Liste leer — kein Pixel ändert sich (Guard).
  const kontextZonen = useMemo(() => {
    if (!activeStoreyId) return [];
    return doc
      .byKind<Zone>('zone')
      .filter((z) => z.storeyId === activeStoreyId && (z.zonenArt === 'parzelle' || z.zonenArt === 'nachbar'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, activeStoreyId, revision]);

  // F3: Zonen mit Check-Befunden (Regeln/Fluchtweg) im Plan tönen
  const verletzteZonen = useMemo(() => {
    if (!activeStoreyId) return [];
    const befunde = pruefeGrundriss(doc, activeStoreyId);
    const proZone = new Map<string, 'fehler' | 'warnung'>();
    for (const b of befunde) {
      if (!b.entityId || b.schwere === 'hinweis') continue;
      const e = doc.get(b.entityId);
      if (!e || e.kind !== 'zone') continue;
      if (b.schwere === 'fehler' || !proZone.has(b.entityId)) {
        proZone.set(b.entityId, b.schwere);
      }
    }
    return [...proZone.entries()].map(([id, schwere]) => ({
      zone: doc.get(id) as Zone,
      schwere,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, activeStoreyId, revision]);
  // C4b (C-E5, docs/SUBMISSION-KONZEPT.md): Unternehmerplan-Referenz-Overlay —
  // reine Laufzeitschicht (`modules/design/unternehmerplan.ts`), nie im Doc.
  const unternehmerDxf = useUnternehmerplan((s) => s.dxf);
  const overlaySichtbar = useUnternehmerplan((s) => s.overlaySichtbar);
  const overlayUmschalten = useUnternehmerplan((s) => s.overlayUmschalten);

  const svgRef = useRef<SVGSVGElement>(null);

  // Ansicht: Zentrum (mm) + Massstab (px pro mm)
  const [view, setView] = useState({ cx: 5000, cy: 3000, scale: 0.05 });
  const [cursor, setCursor] = useState<Pt | null>(null);
  const panning = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  // F5 (v0.6.4): Leertaste gehalten → Pan-Bereitschaft (Cursor «grab»); ein
  // zusätzliches `panAktiv` (statt nur aus der Ref zu lesen) macht das
  // tatsächliche Ziehen («grabbing») für den Render sichtbar.
  const [spaceGedrueckt, setSpaceGedrueckt] = useState(false);
  const [panAktiv, setPanAktiv] = useState(false);
  // F9 (v0.6.4): Hover-Trefferzone fürs Auswahl-Werkzeug — nur fürs Cursor-
  // Feedback (`cursor2dFuer`), unabhängig vom Klick-Hit-Test in `onPointerUp`.
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hoverThrottle = useRef(false);
  // C-26 (PB5, docs/V084-SPEZ.md §7 D8/§8 C-26, Owner-Auftrag «Kommentar-
  // Filter»): reiner Sichtbarkeits-Schalter für Plan-Kommentare — lokal HIER
  // gehalten (`ui-zustand.ts` ist für PB5 gesperrt und trägt kein passendes
  // Feld), flüchtig wie `navModus2d`/`achsenAn` vor der PD3c-Store-Migration.
  // Ausgeblendete Kommentare sind auch nicht mehr wähl-/klickbar (`pickAt`
  // unten) — «ausblenden» heisst hier wirklich weg, nicht nur unsichtbar.
  const [kommentareSichtbar, setKommentareSichtbar] = useState(true);
  // Touch (iPad): zwei Finger = Pinch-Zoom + Pan; ein Finger zeichnet wie die Maus
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d0: number; mid0: { x: number; y: number }; v0: { cx: number; cy: number; scale: number } } | null>(null);
  const gestureAktiv = useRef(false);

  // v0.6.6 / Welle 2 Stream C — Fling/Momentum (§5): sammelt die letzten
  // ~80ms Bewegung während eines Pans (Maus-Drag ODER Zwei-Finger-Touch-Pan)
  // und trägt beim Loslassen die Restgeschwindigkeit über `requestAnimationFrame`
  // ab (`flingSchritt`, Dämpfung 0.95/Frame). JEDE neue Eingabe UND das
  // Mausrad brechen einen laufenden Fling sofort ab (`stoppeFling`).
  const flingRef = useRef<ReturnType<typeof flingTracker> | null>(null);
  if (!flingRef.current) flingRef.current = flingTracker();
  const flingAnimRef = useRef<number | null>(null);
  const stoppeFling = () => {
    if (flingAnimRef.current !== null) {
      cancelAnimationFrame(flingAnimRef.current);
      flingAnimRef.current = null;
    }
  };
  const starteFling = (vx: number, vy: number) => {
    if (reduzierteBewegung()) return; // §5/§7: kein Fling bei reduced-motion
    if (Math.hypot(vx, vy) < FLING_STOPP_GESCHWINDIGKEIT) return;
    stoppeFling();
    let v = { vx, vy };
    let letzte = performance.now();
    const schritt = (t: number) => {
      const dt = Math.min(t - letzte, 48); // Deckel gegen rAF-Aussetzer (Tab-Wechsel etc.)
      letzte = t;
      setViewGeklemmt((cur) => ({
        ...cur,
        cx: cur.cx - (v.vx * dt) / cur.scale,
        cy: cur.cy + (v.vy * dt) / cur.scale,
      }));
      const naechste = flingSchritt(v, dt);
      if (!naechste) {
        flingAnimRef.current = null;
        return;
      }
      v = naechste;
      flingAnimRef.current = requestAnimationFrame(schritt);
    };
    flingAnimRef.current = requestAnimationFrame(schritt);
  };

  // v0.6.6 / Welle 2 Stream C — Doppeltap-Zoom (§5): animierter Zoomvorgang
  // (Faktor 2, Feder-Gefühl), Ziel = Zeigerposition bleibt unter dem Zeiger.
  const zoomAnimRef = useRef<number | null>(null);
  const stoppeZoomAnimation = () => {
    if (zoomAnimRef.current !== null) {
      cancelAnimationFrame(zoomAnimRef.current);
      zoomAnimRef.current = null;
    }
  };
  const starteZoomAnimation = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = clientX - rect.left - rect.width / 2;
    const py = clientY - rect.top - rect.height / 2;
    const start = { cx: view.cx, cy: view.cy, scale: view.scale };
    const zielScale = Math.min(1, Math.max(0.005, start.scale * 2));
    const faktor = zielScale / start.scale;
    if (faktor <= 1.0001) return; // schon am Zoom-Deckel — keine Animation ohne Effekt
    const ziel = {
      cx: start.cx + (px / start.scale) * (1 - 1 / faktor),
      cy: start.cy - (py / start.scale) * (1 - 1 / faktor),
      scale: zielScale,
    };
    stoppeZoomAnimation();
    if (reduzierteBewegung()) {
      setViewGeklemmt(ziel);
      return;
    }
    const dauer = 260; // --k-feder
    const t0 = performance.now();
    const schritt = (t: number) => {
      const u = Math.min(1, (t - t0) / dauer);
      const e = federGefuehl(u);
      setViewGeklemmt({
        cx: start.cx + (ziel.cx - start.cx) * e,
        cy: start.cy + (ziel.cy - start.cy) * e,
        scale: start.scale + (ziel.scale - start.scale) * e,
      });
      if (u < 1) {
        zoomAnimRef.current = requestAnimationFrame(schritt);
      } else {
        zoomAnimRef.current = null;
      }
    };
    zoomAnimRef.current = requestAnimationFrame(schritt);
  };
  /** Auswahl-Werkzeug + Treffer=leer: NUR dann beansprucht kein Element/
   *  Werkzeug den Doppelklick/-tap, siehe `plan-interaktion.spec.ts` (T1
   *  Doppelklick-Absetzen bleibt unverändert ausserhalb des Auswahl-Werkzeugs). */
  const versucheDoppeltapZoom = (clientX: number, clientY: number) => {
    // C-26 (PB5): `pickAt` statt rohem `pickEntityAt` — ein Treffer auf
    // Masskette/Kommentar darf das Doppeltap-Zoom genauso blockieren wie
    // jedes andere Bauteil (`pickAt` ist unten deklariert, hier als Closure-
    // Referenz gültig — ausgewertet erst bei echtem Doppeltap, nie beim
    // Render selbst).
    if (activeStoreyId) {
      const hit = pickAt(toWorld(clientX, clientY));
      if (hit) return;
    }
    starteZoomAnimation(clientX, clientY);
  };

  // v0.6.6 / Welle 2 Stream C — 2D-Gesten-Kern (§5, "ein Kern" für Touch UND
  // Maus): hier NUR für Touch-Doppeltap (Zoom) und Touch-Longpress
  // (Kontextmenü) gefüttert — additiv, ändert nichts an moveActive/pickMode/
  // onGroundClick. Maus nutzt fürs Doppelklick-Zoom das native `onDoubleClick`
  // (identische DOPPELTAP_MS-Grössenordnung, kein Duplikat der Bewegungslogik).
  const gestenRef = useRef<ReturnType<typeof gestenDetektor> | null>(null);
  if (!gestenRef.current) gestenRef.current = gestenDetektor();
  const longPressPollRef = useRef<number | null>(null);
  // Touch-Longpress-Kontextmenü (Task 4) — dasselbe Präsentationsbauteil wie
  // der 3D-Viewport (`ViewportKontextmenue.tsx`, unverändert wiederverwendet,
  // «kein neues Menü bauen»). Rechtsklick öffnet dasselbe Menü (vorher: reines
  // `preventDefault()`, kein Menü — additiv, kein bestehender Vertrag).
  //
  // C-11 (PB1, docs/V084-SPEZ.md §7 D8): der Ausbau trägt jetzt ZWEI Modi
  // statt nur des Element-Treffers — `modus: 'element'` (Auswählen/
  // Eigenschaften/Löschen) UND `modus: 'kette'` (Abschliessen/Abbrechen,
  // solange ein Mehrpunkt-Werkzeug läuft — erkannt an `handlers.current
  // .previewLine`, dem bestehenden Signal aus DesignWorkspace, kein neues
  // Feld in `ViewportHandlers`/Viewport3D.tsx nötig). Die Kette hat Vorrang
  // vor einem Element-Treffer darunter: ein Rechtsklick beim Zeichnen bedient
  // das laufende Werkzeug, nicht ein zufällig getroffenes Nachbarelement.
  // «Werkzeug-Schnelleinstellungen auf leerer Fläche» (Spez-Punkt 4, dritter
  // Fall) bleibt bewusst AUSSEN vor — es gibt ausserhalb von `island/**`
  // keine Brücke, die ein Insel-Popup programmatisch öffnet, und `island/**`
  // liegt ausserhalb des PB1-Dateikreises (s. Bericht).
  const [kontext2d, setKontext2d] = useState<
    { modus: 'element'; x: number; y: number; entityId: string } | { modus: 'kette'; x: number; y: number; p: Pt } | null
  >(null);
  const stoppeLongPressPoll = () => {
    if (longPressPollRef.current !== null) {
      cancelAnimationFrame(longPressPollRef.current);
      longPressPollRef.current = null;
    }
  };
  const starteLongPressPoll = () => {
    stoppeLongPressPoll();
    const poll = () => {
      const ev = gestenRef.current!.pruefeLongPress(performance.now());
      if (ev.longPress) {
        longPressPollRef.current = null;
        if (activeStoreyId) {
          const p = toWorld(ev.longPress.x, ev.longPress.y);
          const rect = svgRef.current?.getBoundingClientRect();
          const x = ev.longPress.x - (rect?.left ?? 0);
          const y = ev.longPress.y - (rect?.top ?? 0);
          if (handlers.current?.previewLine) {
            haptikTick();
            setKontext2d({ modus: 'kette', x, y, p });
          } else {
            const hit = pickAt(p); // C-26 (PB5): inkl. Masskette/Kommentar
            if (hit) {
              haptikTick(); // §6: Longpress-Auslösung
              setKontext2d({ modus: 'element', x, y, entityId: hit });
            }
          }
        }
        return;
      }
      longPressPollRef.current = requestAnimationFrame(poll);
    };
    longPressPollRef.current = requestAnimationFrame(poll);
  };

  // Alle drei rAF-Läufe brechen beim Unmount ab (Ansicht wechselt weg) —
  // sonst liefe ein Fling/Zoom/Longpress-Poll gegen ein entsorgtes Bauteil.
  useEffect(() => {
    return () => {
      stoppeFling();
      stoppeZoomAnimation();
      stoppeLongPressPoll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = useMemo(
    () => (activeStoreyId ? derivePlan(doc, activeStoreyId) : null),
    [doc, activeStoreyId, revision],
  );
  const tracePlan = useMemo(
    () => (traceId && traceId !== activeStoreyId && doc.get(traceId) ? derivePlan(doc, traceId) : null),
    [doc, traceId, activeStoreyId, revision],
  );
  const dims = useMemo(
    () => (activeStoreyId ? deriveDimensions(doc, activeStoreyId) : null),
    [doc, activeStoreyId, revision],
  );
  // v0.7.0 E2: Poché-Modus-Override (Default 'phase' bei Abwesenheit, wie im
  // Command `design.pocheModusSetzen`) — einmal gelesen, beide Fill-Stellen
  // (Trace-Layer + Hauptregionen) nutzen denselben Wert.
  const pocheModus: PocheModus = doc.settings.pocheModus ?? 'phase';

  // v0.7.4 P7 (Pan-Grenze, Owner-Befund «Inhalt kann off-screen verloren
  // gehen»): dieselbe Bounding-Box wie «Einpassen» weiter unten (T3,
  // `plan.bounds` ∪ Kontext-Zonen/Nachbarn — derivePlan kennt Letztere
  // nicht), hier zusätzlich zum Klemmen von `cx`/`cy` genutzt. Ohne
  // Modellinhalt (leeres Geschoss) gibt es nichts zu klemmen — Guard.
  const modellBounds = useMemo(() => {
    let b = plan?.bounds ? { ...plan.bounds } : null;
    for (const z of kontextZonen) {
      for (const p of z.outline) {
        if (!b) b = { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y };
        else {
          b.minX = Math.min(b.minX, p.x);
          b.minY = Math.min(b.minY, p.y);
          b.maxX = Math.max(b.maxX, p.x);
          b.maxY = Math.max(b.maxY, p.y);
        }
      }
    }
    return b;
  }, [plan, kontextZonen]);

  // Zoom ist bereits geklemmt (0.005-1, s. die einzelnen `setView`-Aufrufe
  // unten) — Pan (`cx`/`cy`) bisher nicht: `klemmeSicht` hält das Zentrum
  // innerhalb der Modell-Bbox + grosszügigem Rand (die Hälfte der
  // Standard-Fit-Marge, mind. 8m), damit immer ein Teil der Zeichnung
  // sichtbar bleibt, ohne die freie Navigation spürbar einzuschränken.
  const klemmeSicht = (v: { cx: number; cy: number; scale: number }): { cx: number; cy: number; scale: number } => {
    if (!modellBounds) return v;
    const randX = Math.max(8000, (modellBounds.maxX - modellBounds.minX) * 0.75);
    const randY = Math.max(8000, (modellBounds.maxY - modellBounds.minY) * 0.75);
    return {
      ...v,
      cx: Math.min(modellBounds.maxX + randX, Math.max(modellBounds.minX - randX, v.cx)),
      cy: Math.min(modellBounds.maxY + randY, Math.max(modellBounds.minY - randY, v.cy)),
    };
  };
  // Wrapper um den rohen State-Setter — jede Sicht-Änderung (Pan, Zoom,
  // Fling, Einpassen) läuft hier durch, damit die Grenze unabhängig vom
  // jeweiligen Eingabeweg gilt (Maus-Drag, Touch, Mausrad-Pinch,
  // Doppeltap-Zoom-Animation, Fling-Momentum).
  const setViewGeklemmt: typeof setView = (naechster) => {
    setView((vorher) => klemmeSicht(typeof naechster === 'function' ? naechster(vorher) : naechster));
  };

  // Plan-LOD: view.scale ist px pro mm Welt → × 1000 = px pro Meter.
  // lodRef trägt die zuletzt gültige Stufe für die Hysterese in planLod weiter.
  const lodRef = useRef<PlanLod>('voll');
  const lod = planLod(view.scale * 1000, lodRef.current);
  lodRef.current = lod;
  // Serie K A5 (K15, Statusleiste): reiner Zustandsspiegel für den Aufrufer —
  // keine Rückwirkung auf die LOD-Berechnung selbst.
  useEffect(() => {
    onLod?.(lod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lod]);

  // Trefferzone + Umriss leben in plan-hit-test.ts (eigener Unit-Test, unabhängig
  // von derivePlan/den Poché-Regionen — die Goldens bleiben unberührt).
  //
  // C-26 (PB5, §7 D8/§8 C-26): Massketten/Kommentare haben dort KEINEN
  // Eintrag (offene Punktkette bzw. ein einzelner Welt-Punkt — beide ohne
  // `outline`/Wand-Achse im Sinn dieser Datei) — `pickAt` ist der EINE
  // Trefferzonen-Weg im ganzen Component (ersetzt alle bisherigen direkten
  // `pickEntityAt(...)`-Aufrufe unten, s. Diff), damit jeder Klick-/Hover-/
  // Kontextmenü-/Doppeltap-Pfad dieselbe erweiterte Reihenfolge sieht:
  // Kommentar (nur wenn `kommentareSichtbar`) → Masskette → der Rest
  // (`pickEntityAt`, unverändert). Ausgeblendete Kommentare sind so wirklich
  // nicht mehr wählbar, nicht nur unsichtbar.
  const pickAt = (p: Pt): string | null => {
    if (!activeStoreyId) return null;
    if (kommentareSichtbar) {
      for (const k of doc.byKind<Kommentar>('kommentar')) {
        if (k.storeyId && k.storeyId !== activeStoreyId) continue;
        if (Math.hypot(p.x - k.at.x, p.y - k.at.y) <= KOMMENTAR_TOLERANZ) return k.id;
      }
    }
    for (const mk of doc.byKind<MassKette>('masskette')) {
      if (mk.storeyId !== activeStoreyId) continue;
      for (let i = 1; i < mk.punkte.length; i++) {
        if (distToSegment(p, mk.punkte[i - 1]!, mk.punkte[i]!) <= MASSKETTE_TOLERANZ) return mk.id;
      }
    }
    return pickEntityAt(doc, activeStoreyId, p);
  };
  // E1 (v0.8.5 PA1): Vollständigkeits-Regel für das Rubber-Band — ein
  // Element zählt, wenn ALLE seine charakteristischen Punkte im Rechteck
  // liegen (vorhersagbar, in `docs/V085-SPEZ.md` E1 fixiert). Dieselbe
  // Sichtbarkeits-Regel wie `pickAt`: ausgeblendete Kommentare zählen nicht.
  const idsImRechteck = (a: Pt, b: Pt): string[] => {
    if (!activeStoreyId) return [];
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const drin = (q: Pt) => q.x >= minX && q.x <= maxX && q.y >= minY && q.y <= maxY;
    const ids: string[] = [];
    if (kommentareSichtbar) {
      for (const k of doc.byKind<Kommentar>('kommentar')) {
        if (k.storeyId && k.storeyId !== activeStoreyId) continue;
        if (drin(k.at)) ids.push(k.id);
      }
    }
    for (const mk of doc.byKind<MassKette>('masskette')) {
      if (mk.storeyId !== activeStoreyId) continue;
      if (mk.punkte.length > 0 && mk.punkte.every(drin)) ids.push(mk.id);
    }
    // Spiegel von `VERSCHIEBBAR` (plan-hit-test.ts) als typisierte Liste —
    // `doc.byKind` verlangt Kind-Literale, das Set trägt nur `string`.
    // v0.8.10 Z3: + beam/furniture/boundary/etikett (outlineOf kennt alle vier).
    const rechteckKinds = [
      'wall',
      'slab',
      'mass',
      'zone',
      'column',
      'stair',
      'roof',
      'freemesh',
      'beam',
      'furniture',
      'boundary',
      'etikett',
    ] as const;
    for (const kind of rechteckKinds) {
      for (const e of doc.byKind(kind)) {
        if ((e as { storeyId?: string }).storeyId !== activeStoreyId) continue;
        const outline = outlineOf(doc, e.id);
        if (outline && outline.length >= 2 && outline.every(drin)) ids.push(e.id);
      }
    }
    return ids;
  };
  // Ziehen im Plan: EIN design.verschieben bei pointerup, kein Patch pro Move
  const moveActive = useRef(false);
  // E3 (v0.8.5 PB1, docs/V085-SPEZ.md §7 C-15/C-16/C-17): Griff-Ziehen —
  // dasselbe Aktiv-Flag-Muster wie `moveActive` oben, nur für EINEN
  // angefassten Punkt (Wand-Endpunkt/Masskette-Punkt/Zonen-Ecke) statt das
  // ganze Element.
  const griffActive = useRef(false);
  // E1 (v0.8.5 PA1): Rubber-Band — Start auf LEERER Fläche im Auswahl-
  // Werkzeug (NodeCanvas-Marquee-Vorbild, `NodeCanvas.tsx`). Der Startpunkt
  // trägt die Client-Koordinaten mit, damit ein Klick ohne echten Zug
  // (< 4px Bildschirm) unten weiterhin als normaler Pick durchfällt —
  // Leerklick leert die Auswahl wie bisher (E1-Sanktion 4).
  const marqueeStart = useRef<{ a: Pt; shift: boolean; cx: number; cy: number } | null>(null);
  const [marquee, setMarquee] = useState<{ a: Pt; b: Pt } | null>(null);
  const selection = useProject((s) => s.selection);
  const select = useProject((s) => s.select);
  // E3 (v0.8.5 PB1, docs/V085-SPEZ.md §7 C-15/C-16): Griffe NUR bei
  // Einzel-Auswahl («sichtbar bei Auswahl/weg bei Mehrfach-Auswahl», C-15) —
  // Wand-Endpunkte (a/b, feste Keys) bzw. je ein Griff pro Punkt der
  // Masskette/pro Outline-Ecke (Zone/Volumen/Dach). Reine Ableitung aus
  // `doc`/`selection`, kein eigener Store (wie `kontextZonen`/`graph` oben).
  const griffe = useMemo(() => {
    if (selection.length !== 1 || !activeStoreyId) return [];
    const id = selection[0]!;
    const e = doc.get(id);
    if (!e) return [];
    if (e.kind === 'wall') {
      const w = e as Wall;
      return [
        { id, key: 'a' as const, p: w.a, kind: 'wall' as const },
        { id, key: 'b' as const, p: w.b, kind: 'wall' as const },
      ];
    }
    if (e.kind === 'masskette') {
      return (e as MassKette).punkte.map((p, i) => ({ id, key: i, p, kind: 'masskette' as const }));
    }
    // v0.9.1 P-B1 (`docs/V091-SPEZ.md` §P-B1): Geländer-Punkt-Griffe — je
    // ein Griff pro Polylinien-Punkt, exakt die Masskette-Maschine oben.
    if (e.kind === 'gelaender') {
      return (e as Gelaender).punkte.map((p, i) => ({ id, key: i, p, kind: 'gelaender' as const }));
    }
    // v0.9.1 P-B1: Rampen-a/b-Griffe — feste Keys wie Wand/Unterzug.
    if (e.kind === 'ramp') {
      const r = e as Rampe;
      return [
        { id, key: 'a' as const, p: r.a, kind: 'ramp' as const },
        { id, key: 'b' as const, p: r.b, kind: 'ramp' as const },
      ];
    }
    if (e.kind === 'zone' || e.kind === 'mass' || e.kind === 'roof') {
      return (e as Zone | MassBody | Roof).outline.map((p, i) => ({ id, key: i, p, kind: e.kind }));
    }
    // P-A3 (v0.8.11, docs/V0811-SPEZ.md §2 E3): Decken-Ecken-Griffe — exakt
    // die zone/mass/roof-Maschine (Outline-Index als Key); die Löcher
    // (holes) bekommen bewusst KEINE Griffe (eigene Geometrie, eigener
    // 0.9.x-Posten). Commit läuft IN PLACE über design.deckeGeometrieSetzen
    // (DesignWorkspace onGriffEnd) — kein Löschen+Neusetzen, sonst fielen
    // die Aussparungen der Decke stumm mit.
    if (e.kind === 'slab') {
      return (e as Slab).outline.map((p, i) => ({ id, key: i, p, kind: 'slab' as const }));
    }
    // P-A3 (v0.8.11): Unterzug-a/b-Griffe — dieselben festen Keys wie beim
    // Wand-/Treppen-Zweig; Commit in place über design.unterzugGeometrieSetzen.
    if (e.kind === 'beam') {
      const bm = e as Beam;
      return [
        { id, key: 'a' as const, p: bm.a, kind: 'beam' as const },
        { id, key: 'b' as const, p: bm.b, kind: 'beam' as const },
      ];
    }
    // E5 (v0.8.6 PB3, docs/V086-SPEZ.md §3 «Öffnungs-Griff»): EIN Griff auf
    // dem Öffnungs-Mittelpunkt in Weltkoordinaten — Achsenpunkt der
    // Wirtswand (a + (b−a)·center/länge), dieselbe Formel wie
    // `oeffnungWeltpos` in `plan-hit-test.ts` (das Klick-Pick dort kennt
    // Öffnungen bereits, s. `pickEntityAt`). Verwaiste Öffnung (Wirtswand
    // fehlt) oder Null-Länge-Wand → kein Griff statt zu raten.
    if (e.kind === 'opening') {
      const o = e as Opening;
      const wall = doc.get(o.wallId);
      if (!wall || wall.kind !== 'wall') return [];
      const w = wall as Wall;
      const len = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
      if (len === 0) return [];
      const p = { x: w.a.x + ((w.b.x - w.a.x) * o.center) / len, y: w.a.y + ((w.b.y - w.a.y) * o.center) / len };
      return [{ id, key: 'center' as const, p, kind: 'opening' as const }];
    }
    // PA5 (v0.8.7, docs/V087-SPEZ.md §3 E1/C-3): Treppen-Griffe — a/b wie
    // beim Wand-Zweig (feste Keys, EIN Griff je Punkt), bei form 'l'
    // zusätzlich der Eckpunkt-Griff. Griff-Hit-Test/Vorrang (`griffAn`
    // unten) und «nur bei Einzel-Auswahl» (Guard oben) sind kind-neutral —
    // dieselbe Maschine wie bei Wand/Zone/Öffnung, kein Sonderweg nötig.
    if (e.kind === 'stair') {
      const s = e as Stair;
      const punkte: { id: string; key: 'a' | 'b' | 'ecke'; p: Pt; kind: 'stair' }[] = [
        { id, key: 'a' as const, p: s.a, kind: 'stair' as const },
        { id, key: 'b' as const, p: s.b, kind: 'stair' as const },
      ];
      if (s.form === 'l' && s.ecke) {
        punkte.push({ id, key: 'ecke' as const, p: s.ecke, kind: 'stair' as const });
      }
      return punkte;
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, doc, activeStoreyId, revision]);
  // Filter aus → eine evtl. gewählte, jetzt verborgene Kommentar-Auswahl
  // fällt weg (kein «Geister»-Highlight/Löschen-Ziel auf Unsichtbarem).
  useEffect(() => {
    if (kommentareSichtbar) return;
    const kommentarIds = new Set(doc.byKind<Kommentar>('kommentar').map((k) => k.id));
    const gefiltert = selection.filter((id) => !kommentarIds.has(id));
    if (gefiltert.length !== selection.length) select(gefiltert);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kommentareSichtbar]);

  const toWorld = (clientX: number, clientY: number): Pt => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = clientX - rect.left - rect.width / 2;
    const py = clientY - rect.top - rect.height / 2;
    return {
      x: Math.round(view.cx + px / view.scale),
      y: Math.round(view.cy - py / view.scale),
    };
  };

  /** Umkehrung von `toWorld` — Welt-mm → Bildschirm-Client-Koordinaten,
   *  fürs Griff-Hit-Test unten (screen-Toleranz statt Welt-Toleranz, damit
   *  sie bei jedem Zoom gleich «greifbar» bleibt). */
  const toScreen = (p: Pt): { x: number; y: number } => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 + (p.x - view.cx) * view.scale,
      y: rect.top + rect.height / 2 - (p.y - view.cy) * view.scale,
    };
  };

  // C-17 (v0.8.5 PB1, docs/V085-SPEZ.md §7): Griff-Hit-Test — ~8px
  // Bildschirm-Toleranz um jeden Griff (screen-konstant wie die Griffe
  // selbst), nächstliegender Treffer gewinnt. Aufgerufen VOR `pickAt`/dem
  // Rubber-Band-Start im `onPointerDown` unten (Vorrang-Pflicht C-17).
  const GRIFF_TOLERANZ_PX = 8;
  const griffAn = (clientX: number, clientY: number): { id: string; key: string | number; p: Pt } | null => {
    if (griffe.length === 0 || !svgRef.current) return null;
    let beste: { id: string; key: string | number; p: Pt; dist: number } | null = null;
    for (const g of griffe) {
      const s = toScreen(g.p);
      const dist = Math.hypot(clientX - s.x, clientY - s.y);
      if (dist <= GRIFF_TOLERANZ_PX && (!beste || dist < beste.dist)) {
        beste = { id: g.id, key: g.key, p: g.p, dist };
      }
    }
    return beste ? { id: beste.id, key: beste.key, p: beste.p } : null;
  };

  // T3: «Einpassen» — auf den Modellinhalt zoomen (Home/Fit-Knopf UND einmalig
  // beim Einhängen, z.B. geladenes Projekt). Ohne Inhalt: neutraler Startwert,
  // kein Sprung ins Leere.
  const einpassen = () => {
    // v0.7.1 Kritik-1-Auflage [B]: Kontext-Zonen (Parzelle/Nachbarn) zählen
    // zum Fit-Umfang — derivePlan kennt sie nicht, ohne diese Erweiterung
    // fittete «Einpassen» nach dem Standort-Import ins Leere. Ohne
    // Kontext-Zonen bleibt das Verhalten exakt wie bisher (Guard).
    let b = plan?.bounds ? { ...plan.bounds } : null;
    for (const z of kontextZonen) {
      for (const p of z.outline) {
        if (!b) b = { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y };
        else {
          b.minX = Math.min(b.minX, p.x);
          b.minY = Math.min(b.minY, p.y);
          b.maxX = Math.max(b.maxX, p.x);
          b.maxY = Math.max(b.maxY, p.y);
        }
      }
    }
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    if (!b) {
      setView({ cx: 5000, cy: 3000, scale: 0.05 });
      return;
    }
    // v0.8.0B P8b (Matrix-Abnahme «element-fang»): «Einpassen» holt den
    // Grundriss in den SICHTBAREN Bereich — die Dock-Spalten (z.B. das immer
    // sichtbare Kennzahlen-Panel rechts) überdecken Teile dieses SVGs, und
    // ein Fit auf die volle Fläche legte den Modellrand DARUNTER (Hover/
    // Element-Fang liefen dort ins Panel statt in den Plan). Das freie
    // Zentrum kommt vom Dock-Solver (`dock-zeichenfeld-runtime.ts`, von
    // `DockFlaeche` in Client-Koordinaten gemeldet); Schnittmenge mit der
    // eigenen SVG-Fläche, und NUR wenn die noch eine brauchbare Zeichen-
    // fläche ist (>= 380px, der `MIN_VIEWPORT`-Wert des Solvers — darunter,
    // z.B. in der schmalen Split-Ansicht, bleibt bewusst der bisherige
    // Voll-Flächen-Fit, statt den Plan winzig zu quetschen). Fallbacks
    // (kein Dock gemountet, andere Station, kein Schnitt) = exakt das alte
    // Verhalten.
    let ziel = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
    const zf = useDockZeichenfeld.getState();
    if (zf.station === 'design' && zf.rect) {
      const ix = Math.max(rect.left, zf.rect.x);
      const iy = Math.max(rect.top, zf.rect.y);
      const iw = Math.min(rect.right, zf.rect.x + zf.rect.w) - ix;
      const ih = Math.min(rect.bottom, zf.rect.y + zf.rect.h) - iy;
      if (iw >= 380 && ih >= 200) ziel = { x: ix, y: iy, w: iw, h: ih };
    }
    const w = Math.max(b.maxX - b.minX, 2000);
    const h = Math.max(b.maxY - b.minY, 2000);
    const scale = Math.min(1, Math.max(0.005, Math.min(ziel.w / (w * 1.25), ziel.h / (h * 1.25))));
    // v0.7.4 P7: «Einpassen» zentriert exakt auf die Modell-Bbox — das liegt
    // per Konstruktion innerhalb der Pan-Grenze, der rohe Setter reicht hier
    // (kein Zusatznutzen durch `setViewGeklemmt`, aber auch kein Schaden).
    // P8b: … und zwar auf die MITTE des Zielbereichs — `view.cx/cy` ist der
    // Weltpunkt in der SVG-Mitte (s. `clientZuWelt` oben), darum wird die
    // Differenz Zielmitte↔SVG-Mitte in Weltkoordinaten übersetzt (y-Achse
    // gespiegelt, Kern-y wächst nach oben).
    const zielCx = ziel.x + ziel.w / 2;
    const zielCy = ziel.y + ziel.h / 2;
    const svgCx = rect.left + rect.width / 2;
    const svgCy = rect.top + rect.height / 2;
    setView({
      cx: (b.minX + b.maxX) / 2 - (zielCx - svgCx) / scale,
      cy: (b.minY + b.maxY) / 2 + (zielCy - svgCy) / scale,
      scale,
    });
  };

  // Bewusst NUR beim Mount: während des Zeichnens darf die Ansicht nie springen.
  useEffect(() => {
    einpassen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kritik-065 Befund [C]: zusätzlich einmalig einpassen, wenn `modus`
  // WECHSELT auf `2d` (SK-D4-Erstmount-Muster, hier für den Fall ohne
  // Remount — split→2d bleibt derselbe Component-Baum). `modus` fehlt bei
  // isolierten Mounts (Tests/quad) → kein Verhalten geändert, kein Sprung.
  const vorherigerModus = useRef(modus);
  useEffect(() => {
    if (modus === '2d' && vorherigerModus.current !== '2d') einpassen();
    vorherigerModus.current = modus;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modus]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stoppeFling(); // §5: Mausrad bleibt ohne Momentum — UND bricht einen laufenden Fling ab
      const factor = Math.exp(-e.deltaY * 0.0012);
      setView((v) => ({ ...v, scale: Math.min(1, Math.max(0.005, v.scale * factor)) }));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // F5: Leertaste halten = Pan-Bereitschaft (ArchiCAD/Photoshop). Dieselbe
  // Eingabefeld-/Dialog-Wache wie die Werkzeug-Kurztasten (DesignWorkspace.tsx)
  // — Tippen in einer Kosmo-Chat-Eingabe darf nie die Ansicht kapern. Ein
  // fokussierter Knopf/Link bekommt ebenfalls keinen Pan-Space, damit die
  // native Leertaste-aktiviert-den-Knopf-Tastaturbedienung erhalten bleibt.
  useEffect(() => {
    const darfPannen = (): boolean => {
      const el = document.activeElement as HTMLElement | null;
      if (istEingabefeld(el)) return false;
      if (el && (el.tagName === 'BUTTON' || el.tagName === 'A')) return false;
      return true;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (!darfPannen()) return;
      e.preventDefault();
      setSpaceGedrueckt(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      setSpaceGedrueckt(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const w = 100 / view.scale; // halbe Breite in mm — via viewBox gelöst
  void w;

  // v0.6.6 / Welle 2 Stream C (§6): Fang-Einrasten löst einen Haptik-Tick aus
  // — EINMAL pro neu eingerastetem Fangpunkt (Identität über Typ+Position),
  // nicht bei jedem Render. `handlers.current` ist eine Ref (kein React-
  // State), darum ein reiner Ableitungs-Key als Effekt-Dependency statt eines
  // direkten Ref-Vergleichs — `fangPunkt` selbst lebt in DesignWorkspace.tsx
  // (tabu), PlanView liest ihn nur mit (wie den bestehenden Marker unten).
  const fangPunkt = handlers.current?.fangPunkt ?? null;
  const fangSchluessel = fangPunkt ? `${fangPunkt.typ}:${fangPunkt.p.x}:${fangPunkt.p.y}` : null;
  useEffect(() => {
    if (fangSchluessel) haptikTick(); // §6: Fang-Einrasten
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fangSchluessel]);

  // F9 (v0.6.4): Kontextcursor fürs Plan-SVG — dieselbe Systematik wie
  // `werkzeugCursorFuer` im 3D-Viewport (`eingabe-3d.ts`), hier um den
  // Hover-Trefferzustand des Auswahl-Werkzeugs erweitert.
  const cursorStil = cursor2dFuer({
    istAuswahlWerkzeug: Boolean(handlers.current?.pickMode),
    spaceOderPanModus: spaceGedrueckt || navModus2d === 'pan',
    ziehtGerade: panAktiv,
    hoverTrifftElement: hoverId !== null,
    hoverIstAusgewaehlt: hoverId !== null && selection.includes(hoverId),
  });

  return (
    <div className="pv-root">
      {/* PD3c (Owner-Befehl 17.07. «alles weg bitte alles in die islands»,
          `docs/ISLAND-UI-SPEZ.md` §6 Sanktion 7): die PlanView-eigene HUD-
          Zeile (Trace-Select/U-Plan-Toggle/Graph-Toggle/Achsen-Toggle)
          rendert nur noch im Modus 'manuell' — im Island-Modus wirken
          dieselben drei Store-Werte (`state/plan-ansicht.ts`) über die
          ANSICHT-Insel (`island/inhalte/ansicht.tsx`), ohne dass diese Knöpfe
          hier sichtbar sein müssen. Ausgeblendet, nicht entfernt: 'manuell'
          zeigt exakt die heutige Zeile, byte-gleich. */}
      {designOberflaeche === 'manuell' && (
      <>
      <KSelect
        size="sm"
        data-testid="trace-select"
        value={traceId}
        onChange={(e) => setTraceId(e.target.value)}
        title="Trace: anderes Geschoss blass unterlegen (nur Bildschirm)"
        // v0.6.9 KSelect-Split: position/top/right/zIndex tragen den Wrapper,
        // Farbe/Schrift den Trigger — Optik wie zuvor (lila, solange aktiv).
        className={`pv-trace-select${traceId ? ' pv-trace-select--aktiv' : ''}`}
      >
        <option value="">Trace</option>
        {doc.storeysOrdered().filter((s) => s.id !== activeStoreyId).map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </KSelect>
      {unternehmerDxf && (
        <button
          data-testid="unternehmerplan-toggle"
          // v0.6.6 / Welle 2 Stream C (Task 7, MOTION-KONZEPT-066 §3): .k-druck-
          // Rollout auf PlanView-eigene Leisten-Knöpfe — DOM/Props/testid/Text
          // byte-identisch, nur die Pressklasse kommt zusätzlich dazu.
          className={`k-druck pv-toggle-btn pv-toggle-btn--uplan${overlaySichtbar ? ' pv-toggle-btn--aktiv' : ''}`}
          onClick={() => overlayUmschalten()}
          title="Unternehmerplan-Referenz ein-/ausblenden (Durchpaus-Layer, nur Bildschirm, C4b)"
        >
          U-Plan
        </button>
      )}
      <button
        data-testid="graph-toggle"
        className={`k-druck pv-toggle-btn pv-toggle-btn--graph${graphAn ? ' pv-toggle-btn--aktiv' : ''}`}
        onClick={() => setGraphAn(!graphAn)}
      >
        Graph
      </button>
      <button
        data-testid="achsen-toggle"
        className={`k-druck pv-toggle-btn pv-toggle-btn--achsen${achsenAn ? ' pv-toggle-btn--aktiv' : ''}`}
        onClick={() => setAchsenAn(!achsenAn)}
        title="Stützenraster-Achsen (Konstruktionslinien) ein-/ausblenden — nur Bildschirm, Druck/Export unverändert"
      >
        Achsen
      </button>
      {/* C-26 (PB5, docs/V084-SPEZ.md §7 D8/§8 C-26, Owner-Auftrag «Kommentar-
          Filter»): derselbe Toggle-Knopf-Baustein wie Achsen/Graph/U-Plan
          oben — «im bestehenden Werkzeug-/Ansichts-Chrome des Plans, wo es
          heute Sichtbarkeits-Toggles gibt». Nur im Modus 'manuell' (wie die
          ganze Zeile hier): im Island-Modus liegt dieser Chrome-Bereich
          ausserhalb des PB5-Dateikreises (`island/**` ist gesperrt) — s.
          Bericht, eine ehrlich benannte Lücke. */}
      <button
        data-testid="kommentar-filter-toggle"
        className={`k-druck pv-toggle-btn pv-toggle-btn--kommentare${kommentareSichtbar ? ' pv-toggle-btn--aktiv' : ''}`}
        onClick={() => setKommentareSichtbar((v) => !v)}
        title="Plan-Kommentare ein-/ausblenden"
      >
        Kommentare
      </button>
      </>
      )}
      <svg
        ref={svgRef}
        data-testid="planview"
        data-lod={lod}
        data-cursor={cursorStil}
        // v0.7.2 §8/W4-H (Cursor-Zonen, Kritik-Auflage — W3-F-Grenze):
        // NUR das Attribut, kein Verhalten. `CursorEbene.tsx` liest es über
        // `closest('[data-cursor-zone]')` und morpht auf das Fadenkreuz
        // (precision) — der eigene `cursorStil` (Zeile oben) bleibt
        // unverändert bestehen (Spec §8, wörtlich «eigener cursorStil bleibt»).
        data-cursor-zone="praezision"
        className="pv-svg"
        style={{ cursor: cursorStil }}
        onPointerDown={(e) => {
          // §5: JEDE neue Eingabe bricht einen laufenden Fling/Zoom-Anim sofort
          // ab — vor jeder Verzweigung, unabhängig von Taste/Pointer-Typ.
          stoppeFling();
          stoppeZoomAnimation();
          if (e.pointerType === 'touch') {
            touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            try {
              (e.target as Element).setPointerCapture(e.pointerId);
            } catch {
              /* synthetische Events (Tests) haben keinen aktiven Pointer */
            }
            if (touches.current.size === 2) {
              const [a, b] = [...touches.current.values()];
              pinch.current = {
                d0: Math.hypot(b!.x - a!.x, b!.y - a!.y) || 1,
                mid0: { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 },
                v0: { ...view },
              };
              gestureAktiv.current = true;
              panning.current = null;
              // Zweiter Finger → Pinch: kein Tap/Longpress mehr (Kernvertrag),
              // Fling-Sample-Fenster startet neu am Pinch-Mittelpunkt (§5).
              gestenRef.current!.ereignis({
                typ: 'down', t: performance.now(), x: e.clientX, y: e.clientY, pointerId: e.pointerId, pointerType: 'touch',
              });
              stoppeLongPressPoll();
              flingRef.current!.reset();
              flingRef.current!.sample(performance.now(), pinch.current.mid0.x, pinch.current.mid0.y);
            } else if (touches.current.size === 1) {
              // Erster Finger: additiver 2D-Gesten-Kern für Touch-Doppeltap-
              // Zoom + Touch-Longpress-Kontextmenü (§5/§6) — die bestehende
              // Zeichnen-/Auswahl-Logik unten läuft komplett unverändert weiter.
              gestenRef.current!.ereignis({
                typ: 'down', t: performance.now(), x: e.clientX, y: e.clientY, pointerId: e.pointerId, pointerType: 'touch',
              });
              starteLongPressPoll();
            }
            return;
          }
          // T3: Pan-/Zoom-Modus (Nav-Leiste) gibt dem linken Klick zusätzlich
          // die Bedeutung des gewählten Knopfs — Mitteltaste/Rechtsklick/Alt
          // bleiben unabhängig davon IMMER Pan (kein Funktionsverlust).
          // F5 (v0.6.4): Leertaste gehalten + linke Taste ist ZUSÄTZLICH Pan —
          // während sie unten ist, zeichnet kein Werkzeug (siehe `onPointerMove`).
          if (
            e.button === 1 ||
            e.button === 2 ||
            e.altKey ||
            (e.button === 0 && (navModus2d === 'pan' || spaceGedrueckt))
          ) {
            panning.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
            setPanAktiv(true);
            (e.target as Element).setPointerCapture(e.pointerId);
            // §5: Fling-Sample-Fenster für den Maus-Drag-Pan neu starten.
            flingRef.current!.reset();
            flingRef.current!.sample(performance.now(), e.clientX, e.clientY);
          } else if (e.button === 0 && navModus2d === 'zoom') {
            zoomDrag.current = { y: e.clientY, scale: view.scale };
            (e.target as Element).setPointerCapture(e.pointerId);
          } else if (e.button === 0 && handlers.current?.pickMode && activeStoreyId) {
            // C-17 (v0.8.5 PB1, docs/V085-SPEZ.md §7): Griff-Hit-Test hat
            // VORRANG vor dem Element-Hit-Test — sonst würde ein Treffer auf
            // einem Griff, der auf der Wandachse/Zonen-Ecke liegt, statt des
            // EINEN Punkts gleich das ganze Element ziehen (`onMoveStart`)
            // oder, knapp daneben, das Rubber-Band starten (E1/PA1). Ein
            // Griff-Treffer klaut daher auch die Auswahl NICHT — Auswahl
            // bleibt exakt wie vor dem Klick (dieselbe Entität war ja schon
            // einzeln gewählt, sonst gäbe es hier keinen Griff).
            const griffHit = griffAn(e.clientX, e.clientY);
            if (griffHit && handlers.current.onGriffStart?.(griffHit.id, griffHit.key, griffHit.p)) {
              griffActive.current = true;
              // Capture auf dem SVG (currentTarget), NICHT auf e.target: der
              // Treffer kann ein live abgeleitetes Kind sein (Auto-Bemassung,
              // Graph-Punkte), das der nächste Render ersetzt — dann verliert
              // Chromium die Capture und schickt pointerup am SVG vorbei
              // (C-2-Flake-Befund v0.8.5-W2, gilt für alle drei Pick-Gesten).
              e.currentTarget.setPointerCapture(e.pointerId);
              return;
            }
            // Auswahl-Werkzeug: Treffer auf einem Bauteil startet gleich die
            // Zieh-Geste (Klick ohne Bewegung = reine Auswahl, dx/dy bleiben 0).
            const p = toWorld(e.clientX, e.clientY);
            const hit = pickAt(p); // C-26 (PB5): inkl. Masskette/Kommentar
            // E1 (v0.8.5 PA1): Shift-Klick auf ein Element ist ein
            // Auswahl-TOGGLE, kein Zieh-Start — er fällt bis zum
            // `onPick(…, {toggle:true})` bei pointerup durch (sonst würde
            // `onMoveStart` die Auswahl sofort ersetzen).
            if (hit && !e.shiftKey && handlers.current.onMoveStart?.(hit, p)) {
              moveActive.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            } else if (!hit) {
              // E1 (v0.8.5 PA1): leere Fläche im Auswahl-Werkzeug startet das
              // Rubber-Band — ob es ein Zug oder nur ein Leerklick war,
              // entscheidet erst pointerup (4px-Schwelle dort). Capture aufs
              // SVG (s. Griff-Kommentar oben): «leer» heisst nur pickAt-leer,
              // e.target kann trotzdem ein abgeleitetes Dekor-Element sein.
              marqueeStart.current = { a: p, shift: e.shiftKey, cx: e.clientX, cy: e.clientY };
              e.currentTarget.setPointerCapture(e.pointerId);
            }
          }
        }}
        onPointerMove={(e) => {
          if (e.pointerType === 'touch' && touches.current.has(e.pointerId)) {
            touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            // §5: additive Bewegt-Verfolgung für Touch-Doppeltap/-Longpress —
            // bricht Longpress bei echter Bewegung ab (bestehende Kernel-Regel).
            gestenRef.current!.ereignis({
              typ: 'move', t: performance.now(), x: e.clientX, y: e.clientY, pointerId: e.pointerId, pointerType: 'touch',
            });
            if (pinch.current && touches.current.size >= 2) {
              const [a, b] = [...touches.current.values()];
              const d = Math.hypot(b!.x - a!.x, b!.y - a!.y) || 1;
              const mid = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
              const { d0, mid0, v0 } = pinch.current;
              const scale = Math.min(1, Math.max(0.005, v0.scale * (d / d0)));
              setViewGeklemmt({
                scale,
                cx: v0.cx - (mid.x - mid0.x) / scale,
                cy: v0.cy + (mid.y - mid0.y) / scale,
              });
              flingRef.current!.sample(performance.now(), mid.x, mid.y); // §5: Fling-Fenster (2-Finger-Pan)
              return;
            }
          }
          if (zoomDrag.current) {
            // Nach oben ziehen = näher ran (ArchiCAD-Zoom-Werkzeug), Distanz→Faktor
            // wie beim Mausrad-Handler oben, nur pixelbasiert statt deltaY-basiert.
            const dy = e.clientY - zoomDrag.current.y;
            const factor = Math.exp(-dy * 0.004);
            setView((v) => ({ ...v, scale: Math.min(1, Math.max(0.005, zoomDrag.current!.scale * factor)) }));
            return;
          }
          if (panning.current) {
            const dx = (e.clientX - panning.current.x) / view.scale;
            const dy = (e.clientY - panning.current.y) / view.scale;
            setViewGeklemmt((v) => ({ ...v, cx: panning.current!.cx - dx, cy: panning.current!.cy + dy }));
            flingRef.current!.sample(performance.now(), e.clientX, e.clientY); // §5: Fling-Fenster (Maus-Drag-Pan)
          } else if (marqueeStart.current) {
            // E1 (v0.8.5 PA1): Rubber-Band-Vorschau live nachziehen.
            setMarquee({ a: marqueeStart.current.a, b: toWorld(e.clientX, e.clientY) });
          } else if (moveActive.current) {
            handlers.current?.onMoveDrag?.(toWorld(e.clientX, e.clientY));
          } else if (griffActive.current) {
            // E3 (v0.8.5 PB1): Griff-Vorschau live nachziehen (Gummiband).
            handlers.current?.onGriffDrag?.(toWorld(e.clientX, e.clientY));
          } else if (!gestureAktiv.current && !spaceGedrueckt) {
            // F5: solange die Leertaste gehalten wird (Pan-Bereitschaft, noch
            // kein Drag), pausiert das Werkzeug-Gummiband komplett — sonst
            // würde die laufende Wand-/Zonen-Vorschau der Maus unterm
            // Pan-Cursor weiter folgen.
            const p = toWorld(e.clientX, e.clientY);
            setCursor(p);
            handlers.current?.onGroundMove?.({ p, shiftKey: e.shiftKey });
            // F9: Hover-Trefferzone fürs Auswahl-Werkzeug, EINMAL pro Frame
            // (rAF-Drossel) — reines Cursor-Feedback (`cursor2dFuer`), teilt
            // sich den Hit-Test mit dem bestehenden `pickAt` bei pointerup.
            if (handlers.current?.pickMode && activeStoreyId) {
              if (!hoverThrottle.current) {
                hoverThrottle.current = true;
                requestAnimationFrame(() => {
                  hoverThrottle.current = false;
                  setHoverId(pickAt(p)); // C-26 (PB5): inkl. Masskette/Kommentar
                });
              }
            } else if (hoverId !== null) {
              setHoverId(null);
            }
          }
        }}
        onPointerUp={(e) => {
          if (e.pointerType === 'touch') {
            touches.current.delete(e.pointerId);
            if (touches.current.size < 2) {
              // §5: Pinch/2-Finger-Pan endet — Momentum aus der zuletzt
              // gemessenen Mittelpunkt-Geschwindigkeit übernehmen (Zoom selbst
              // bleibt ohne Momentum, nur die Translation läuft aus).
              if (pinch.current) {
                const v = flingRef.current!.loslassGeschwindigkeit();
                if (v) starteFling(v.vx, v.vy);
              }
              pinch.current = null;
            }
            if (touches.current.size === 0) {
              stoppeLongPressPoll();
              // Zwei-Finger-Geste beendet? Dann diesen Lift nicht als Klick werten.
              if (gestureAktiv.current) {
                gestureAktiv.current = false;
                return;
              }
              // §5: Ein-Finger-Loslassen additiv durch denselben Gesten-Kern —
              // Doppeltap-Zoom NUR bei Auswahl-Werkzeug + leerer Trefferzone;
              // der bestehende Klick-/Pick-Pfad unten läuft UNVERÄNDERT weiter
              // (kein `return` hier — Einzelklick feuert weiter sofort).
              const g = gestenRef.current!.ereignis({
                typ: 'up', t: performance.now(), x: e.clientX, y: e.clientY, pointerId: e.pointerId, pointerType: 'touch',
              });
              if (g.doppelTap && handlers.current?.pickMode) {
                versucheDoppeltapZoom(g.doppelTap.x, g.doppelTap.y);
              }
            } else {
              return;
            }
          }
          if (zoomDrag.current) {
            zoomDrag.current = null;
            return;
          }
          if (panning.current) {
            panning.current = null;
            setPanAktiv(false);
            // §5: Maus-Drag-Pan endet — Momentum aus dem Fling-Fenster (falls
            // schnell genug losgelassen, sonst bleibt die Ansicht einfach stehen).
            const v = flingRef.current!.loslassGeschwindigkeit();
            if (v) starteFling(v.vx, v.vy);
            return;
          }
          if (moveActive.current) {
            moveActive.current = false;
            handlers.current?.onMoveEnd?.(toWorld(e.clientX, e.clientY));
            return;
          }
          if (griffActive.current) {
            // E3 (v0.8.5 PB1, §7 C-15/C-16): Drag-Ende = EIN Command bzw.
            // eine Löschen+Neusetzen-Gruppe, s. `onGriffEnd` (DesignWorkspace).
            griffActive.current = false;
            handlers.current?.onGriffEnd?.(toWorld(e.clientX, e.clientY));
            return;
          }
          // E1 (v0.8.5 PA1): Rubber-Band beenden — echter Zug (≥4px
          // Bildschirm) setzt die Menge (`onMarqueeAuswahl`), ein blosser
          // Leerklick fällt unverändert in den Pick-Pfad darunter durch
          // (Leerklick leert, Shift-Leerklick lässt die Auswahl stehen).
          if (marqueeStart.current) {
            const start = marqueeStart.current;
            marqueeStart.current = null;
            setMarquee(null);
            if (Math.hypot(e.clientX - start.cx, e.clientY - start.cy) >= 4) {
              const b = toWorld(e.clientX, e.clientY);
              handlers.current?.onMarqueeAuswahl?.(idsImRechteck(start.a, b), { additiv: start.shift });
              return;
            }
          }
          if (e.button !== 0) return;
          const p = toWorld(e.clientX, e.clientY);
          if (handlers.current?.pickMode) {
            handlers.current.onPick?.(pickAt(p), { toggle: e.shiftKey });
            return;
          }
          handlers.current?.onGroundClick?.({ p, shiftKey: e.shiftKey });
        }}
        onDoubleClick={(e) => {
          // ArchiCAD-Geste: Doppelklick schliesst/setzt die laufende Platzierung ab
          if (moveActive.current) return;
          if (handlers.current?.pickMode) {
            // §5: Auswahl-Werkzeug beansprucht den Doppelklick NICHT zum
            // Absetzen (das gilt nur für Zeichenwerkzeuge oben) — hier bisher
            // toter Code (reines `return`), jetzt Doppelklick-Zoom auf leerer
            // Fläche (Treffer=Element lässt `versucheDoppeltapZoom` unangetastet).
            versucheDoppeltapZoom(e.clientX, e.clientY);
            return;
          }
          const p = toWorld(e.clientX, e.clientY);
          handlers.current?.onGroundDoubleClick?.({ p, shiftKey: e.shiftKey });
        }}
        onPointerCancel={(e) => {
          if (e.pointerType === 'touch') {
            touches.current.delete(e.pointerId);
            if (touches.current.size < 2) pinch.current = null;
            if (touches.current.size === 0) {
              gestureAktiv.current = false;
              stoppeLongPressPoll();
              gestenRef.current!.ereignis({
                typ: 'cancel', t: performance.now(), x: e.clientX, y: e.clientY, pointerId: e.pointerId, pointerType: 'touch',
              });
            }
          }
          moveActive.current = false;
          griffActive.current = false;
          zoomDrag.current = null;
          panning.current = null;
          setPanAktiv(false);
        }}
        onPointerLeave={() => setHoverId(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          // v0.6.6 / Welle 2 Stream C (Task 4): Rechtsklick auf ein Element
          // öffnet dasselbe Kontextmenü-Bauteil wie Touch-Longpress (vorher:
          // reines `preventDefault()`, kein Menü — additiv, kein bestehender
          // Vertrag betroffen, kein Spec deckt bisher `contextmenu` hier ab).
          // C-11 (PB1): läuft eine Mehrpunkt-Kette, hat Abschliessen/Abbrechen
          // Vorrang vor einem Element-Treffer darunter.
          if (!activeStoreyId) return;
          const p = toWorld(e.clientX, e.clientY);
          const rect = svgRef.current?.getBoundingClientRect();
          const x = e.clientX - (rect?.left ?? 0);
          const y = e.clientY - (rect?.top ?? 0);
          if (handlers.current?.previewLine) {
            setKontext2d({ modus: 'kette', x, y, p });
            return;
          }
          const hit = pickAt(p); // C-26 (PB5): inkl. Masskette/Kommentar
          if (!hit) return;
          setKontext2d({ modus: 'element', x, y, entityId: hit });
        }}
      >
        <defs>
          {/* SIA-Schraffuren — Beton: Tönung + Diagonale wie im Schnitt
              (derive/schraffur.ts KATALOG.beton: abstand 1.8 Papier-mm,
              tint #dad7d1). Die alte 140-mm-Kachel mit reinem Papierhintergrund
              zeigte je nach Wanddicke fast keine Linie und keine Tönung —
              «Beton» war optisch kaum von leerer Fläche zu unterscheiden.
              Jetzt: feste Betontönung (Print-Konvention, nicht Theme-abhängig,
              wie schon die Schnitt-Schraffur) + engere 40-mm-Kachel, damit auch
              dünne Wände mehrere Linien zeigen. */}
          <pattern id="hatch-beton" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(45)">
            <rect width="40" height="40" fill={PLAN_HATCH_BETON_TINT} />
            <line x1="0" y1="0" x2="0" y2="40" stroke={PLAN_HATCH_BETON_LINIE} strokeWidth="5" />
          </pattern>
          <pattern id="hatch-daemmung" patternUnits="userSpaceOnUse" width="220" height="220" patternTransform="rotate(-45)">
            <rect width="220" height="220" fill="var(--k-plan-paper)" />
            <line x1="0" y1="55" x2="220" y2="55" stroke="var(--k-ink-faint)" strokeWidth="14" />
            <line x1="0" y1="165" x2="220" y2="165" stroke="var(--k-ink-faint)" strokeWidth="14" />
          </pattern>
        </defs>

        <g
          transform={`translate(${(svgRef.current?.clientWidth ?? 800) / 2}, ${(svgRef.current?.clientHeight ?? 600) / 2}) scale(${view.scale}) translate(${-view.cx}, ${view.cy})`}
        >
          {/* Raster: 1m-Punkte — nur «voll», aus der Distanz wird das Punktraster selbst zu Matsch */}
          <g data-testid="plan-grid" style={{ display: lod === 'voll' ? undefined : 'none' }}>
            <PlanGrid cx={view.cx} cy={view.cy} scale={view.scale} />
          </g>

          {/* v0.7.1: Kontext-Layer (Parzelle/Nachbarn) — bewusst in JEDEM LOD
              sichtbar (gerade weit rausgezoomt ist der Kontext das Thema),
              hinter allem Planinhalt, nie interaktiv.
              v0.7.4 P2 (D3 Live-Plan-Phasen-Weiche): Nachbarn folgen jetzt
              derselben `nachbarKontextStufe(phase)`-Treppe wie der Druckweg
              (`plansvg.ts` `planInnerSvg`, `derive/plan.ts` Kopfkommentar):
              'aus' (Werkplan) → gar nicht zeichnen, 'umriss' (Bauprojekt/
              Baueingabe) → nur Kontur (`fill:none` + Stroke), 'fill'
              (Wettbewerb/Vorprojekt) → wie bisher gefüllt. Die Parzelle
              selbst bleibt IMMER strichpunktiert, phasenunabhängig (sie ist
              kein «Nachbar»-Kontext). Farben bleiben `var(--k-*)` — «Papier
              ist Papier», der Bildschirm nutzt UI-Variablen, der Druck harte
              Werte (GRAU.kontext). */}
          {kontextZonen.length > 0 && (
            <g data-testid="plan-kontext" pointerEvents="none">
              {kontextZonen.map((z) => {
                if (z.zonenArt === 'parzelle') {
                  return (
                    <path
                      key={`ktx-${z.id}`}
                      d={`M ${z.outline.map((q) => `${q.x} ${-q.y}`).join(' L ')} Z`}
                      fill="none"
                      stroke="var(--k-ink-soft)"
                      strokeWidth={Math.max(20, 1.2 / view.scale)}
                      strokeDasharray={`${3 / view.scale} ${0.9 / view.scale} ${0.6 / view.scale} ${0.9 / view.scale}`}
                    />
                  );
                }
                const stufe = nachbarKontextStufe(doc.settings.phase);
                if (stufe === 'aus') return null;
                if (stufe === 'umriss') {
                  return (
                    <path
                      key={`ktx-${z.id}`}
                      d={`M ${z.outline.map((q) => `${q.x} ${-q.y}`).join(' L ')} Z`}
                      fill="none"
                      stroke="var(--k-line-strong)"
                      strokeWidth={Math.max(20, 1 / view.scale)}
                    />
                  );
                }
                return (
                  <path
                    key={`ktx-${z.id}`}
                    d={`M ${z.outline.map((q) => `${q.x} ${-q.y}`).join(' L ')} Z`}
                    fill="var(--k-line-strong)"
                    opacity={0.55}
                    stroke="none"
                  />
                );
              })}
            </g>
          )}

          {/* Trace (A8): anderes Geschoss blass darunter — einfarbig, gedämpft */}
          {tracePlan && (
            <g data-testid="trace-layer" opacity={0.25} pointerEvents="none">
              {tracePlan.regions.map((r, i) => (
                <path
                  key={`t${i}`}
                  d={regionToPath(r)}
                  fillRule="evenodd"
                  fill={
                    r.classes.includes('projection')
                      ? 'none'
                      : pocheArtFuer(r.classes, doc.settings.phase, pocheModus) === 'schwarz'
                        ? 'var(--k-ink)'
                        : 'var(--k-ink-faint)'
                  }
                  stroke="var(--k-ink-soft)"
                  strokeWidth={10}
                />
              ))}
              {tracePlan.lines.map((l, i) => (
                <line key={`tl${i}`} x1={l.a.x} y1={-l.a.y} x2={l.b.x} y2={-l.b.y} stroke="var(--k-ink-soft)" strokeWidth={8} />
              ))}
            </g>
          )}

          {/* Unternehmerplan-Referenz-Overlay (C4b, C-E5): reiner Durchpaus-
              Layer in einer Akzentfarbe, nie wählbar (pointerEvents="none"),
              nur wenn ein DXF geladen UND sichtbar geschaltet ist — ohne
              Unternehmerplan bleibt das SVG byte-identisch (Golden-Guard). */}
          {unternehmerDxf && overlaySichtbar && (
            <g data-testid="unternehmerplan-overlay" opacity={0.45} pointerEvents="none">
              {unternehmerDxf.lines.map((l, i) => (
                <line key={`ul${i}`} x1={l.a.x} y1={-l.a.y} x2={l.b.x} y2={-l.b.y} stroke={UNTERNEHMERPLAN_OVERLAY_FARBE} strokeWidth={14} />
              ))}
              {unternehmerDxf.regions.map((r, i) => (
                <polygon
                  key={`ur${i}`}
                  points={r.ring.map((p) => `${p.x},${-p.y}`).join(' ')}
                  fill="none"
                  stroke={UNTERNEHMERPLAN_OVERLAY_FARBE}
                  strokeWidth={14}
                />
              ))}
              {unternehmerDxf.texte.map((t, i) => (
                <text
                  key={`ut${i}`}
                  x={t.at.x}
                  y={-t.at.y}
                  textAnchor="middle"
                  fontSize={zoomTextFs(220, view.scale)}
                  fontFamily="ui-monospace, monospace"
                  fill={UNTERNEHMERPLAN_OVERLAY_FARBE}
                >
                  {t.text}
                </text>
              ))}
            </g>
          )}

          {plan &&
            plan.regions
              // LOD «fern»: nur Poché + Öffnungen — Nebenprojektionen (Treppe,
              // Decken-/Volumenumriss, Freemesh) tragen aus der Distanz nichts bei.
              .filter((r) => lod !== 'fern' || !r.classes.includes('projection'))
              .map((r, i) => {
              const cls = r.classes.join(' ');
              // A3: Stützen sind immer geschnitten → Poché wie tragend
              const isCore = r.classes.includes('tragend') || r.classes.includes('stuetze');
              const isDaemmung = r.classes.includes('daemmung');
              const isProjection = r.classes.includes('projection');
              // Umbau-Farbcode (SIA 400): Neubau rot, Abbruch gelb, Bestand einheitlich grau
              const neu = r.classes.includes('renovation-neu');
              const abbruch = r.classes.includes('renovation-abbruch');
              // K2 (Owner-Rundgang 0.6.2, S. 18): explizit markierter Bestand
              // bekommt EINE einheitliche graue Fläche über alle Schichten —
              // sonst tönte nur die tragende Schicht (hatch-beton), die
              // Dämmung/Bekleidung blieb weiss ("hälftig grau").
              const bestand = r.classes.includes('renovation-bestand');
              return (
                <path
                  key={i}
                  d={regionToPath(r)}
                  fillRule="evenodd"
                  className={cls}
                  fill={
                    neu
                      ? UMBAU_FLAECHEN.neu
                      : abbruch
                        ? UMBAU_FLAECHEN.abbruch
                        : bestand
                          ? UMBAU_FLAECHEN.bestand
                          : // v0.7.0 E2: Wettbewerb…Baueingabe (bzw. Poché-Modus
                            // 'schwarz') zeichnen die tragende Schicht als
                            // Tinte statt Betonschraffur — `pocheEntscheid()`
                            // ist die EINE Quelle dafür (auch für den Export).
                            // Jede andere `art` fällt auf die heutige Kette
                            // zurück (Werkplan/Modus 'material' unverändert).
                            (() => {
                              // 6B (Kritik-1-Befund): In den Schwarz-Phasen
                              // (schraffurLinien=false) zeigen auch die
                              // NICHTTRAGENDEN Schichten am Bildschirm die
                              // Export-Optik — grau solid statt Material-
                              // Schraffur, Dämmung weiss. Werkplan/Modus
                              // 'material' (schraffurLinien=true) bleibt
                              // byte-genau bei der heutigen Kette darunter.
                              const pe = pocheEntscheidFuer(r.classes, doc.settings.phase, pocheModus);
                              return pe.art === 'schwarz'
                                ? 'var(--k-ink)'
                                : !pe.schraffurLinien && pe.art === 'grau'
                                  ? UMBAU_FLAECHEN.bestand
                                  : !pe.schraffurLinien && pe.art === 'daemmung'
                                    ? 'var(--k-raised)'
                                    : null;
                            })() ?? (isCore
                              ? lod === 'voll'
                                ? 'url(#hatch-beton)'
                                // «mittel»/«fern»: Schraffur wird flaches Poché
                                // (Druckkonvention, gleicher Grauwert wie Bestand)
                                : UMBAU_FLAECHEN.bestand
                              : isDaemmung
                                ? lod === 'voll'
                                  ? 'url(#hatch-daemmung)'
                                  : 'var(--k-line)'
                                : isProjection
                                  ? 'none'
                                  : 'var(--k-surface)')
                  }
                  stroke={neu ? UMBAU_STIFTE.neu : abbruch ? UMBAU_STIFTE.abbruch : 'var(--k-ink)'}
                  strokeWidth={isProjection ? BILDSCHIRM_PLAN.regionProjektion : isCore ? BILDSCHIRM_PLAN.regionGeschnitten : BILDSCHIRM_PLAN.regionSekundaer}
                  strokeDasharray={
                    r.classes.includes('volumen')
                      // Bildschirm-Volumenkontur: bewusst feinere Kadenz als der
                      // Druckweg (DASH.volumen wäre '200 100') — Bestand.
                      ? '120 60'
                      : abbruch
                        ? dashWelt(DASH.abbruch, 100)
                        : r.classes.includes('ueber-schnitt')
                          ? dashWelt(DASH.ueberSchnitt, 100)
                          : undefined
                  }
                  opacity={r.classes.includes('decke') ? 0.5 : 1}
                />
              );
            })}

          {/* F8: Möbel — Korpus fein, Bewegungsfläche gestrichelt (Bildschirm).
              LOD: ab «mittel» ausgeblendet — feine Möbelumrisse werden aus der
              Distanz zu Matsch und verdecken die Poché-Lesbarkeit. */}
          <g data-testid="plan-moebel" style={{ display: lod === 'voll' ? undefined : 'none' }}>
          {doc
            .byKind<Furniture>('furniture')
            .filter((f) => f.storeyId === activeStoreyId)
            .map((f) => {
              const g = moebelGeometrie(f);
              if (!g) return null;
              const d = (poly: Pt[]) => `M ${poly.map((p) => `${p.x} ${-p.y}`).join(' L ')} Z`;
              return (
                <g key={f.id} data-testid="moebel">
                  <path d={d(g.korpus)} fill="none" stroke="var(--k-ink-soft)" strokeWidth={BILDSCHIRM_PLAN.moebelKorpus} />
                  <path d={d(g.bewegung)} fill="none" stroke="var(--k-ink-faint)" strokeWidth={BILDSCHIRM_PLAN.moebelBewegung} strokeDasharray="60 40" />
                </g>
              );
            })}
          </g>
          {/* Zonentüren kommen seit A4 als Linien-Klassen aus derivePlan
              (zonentuer-luecke/-fluegel) — der Druck erbt dasselbe Symbol. */}
          {plan &&
            /* F3: verletzte Zonen live tönen (nur Bildschirm, nicht Druck).
               Kritik-065 Befund 1: die getönte Fläche war ein ECHTES
               Element (eine benannte Zone mit Check-Befund), aber ohne
               erkennbaren Rahmen (16mm Weltmass-Stroke verschwand bei
               üblichem Zoom zu <1px) und ohne Beschriftung — wirkte wie
               eine tote Fläche. Fix: zoomstabiler Rahmen (Muster V-H1
               `n / view.scale`, wie schon beim mass-label) + Name+Warnhinweis
               als Etikett, damit die Fläche als das lesbar ist, was sie ist. */
            verletzteZonen.map((v) => {
              const farbe = v.schwere === 'fehler' ? 'var(--k-danger)' : ZONE_VERLETZT_WARN_FARBE;
              const cx = v.zone.outline.reduce((s, p) => s + p.x, 0) / v.zone.outline.length;
              const cy = v.zone.outline.reduce((s, p) => s + p.y, 0) / v.zone.outline.length;
              return (
                <g key={`verletzt-${v.zone.id}`}>
                  <path
                    data-testid="zone-verletzt"
                    d={`M ${v.zone.outline.map((p) => `${p.x} ${-p.y}`).join(' L ')} Z`}
                    fill={v.schwere === 'fehler' ? 'rgba(179, 70, 46, 0.28)' : 'rgba(198, 134, 34, 0.22)'}
                    stroke={farbe}
                    strokeWidth={2.5 / view.scale}
                    strokeDasharray={`${10 / view.scale} ${6 / view.scale}`}
                  />
                  <text
                    data-testid="zone-verletzt-label"
                    x={cx}
                    y={-cy}
                    textAnchor="middle"
                    fontSize={13 / view.scale}
                    fontWeight={600}
                    fill={farbe}
                    fontFamily="var(--k-font-mono)"
                    pointerEvents="none"
                  >
                    {`⚠ ${v.zone.name}`}
                  </text>
                </g>
              );
            })}
          {graph && (
            <g data-testid="raumgraph-overlay">
              {graph.kanten.map((k, i) => {
                const a = graph.zentren.get(k.a);
                const b = graph.zentren.get(k.b);
                if (!a || !b) return null;
                return (
                  <g key={i}>
                    <path
                      d={`M ${a.x} ${-a.y} L ${k.punkt.x} ${-k.punkt.y} L ${b.x} ${-b.y}`}
                      fill="none" stroke={RAUMGRAPH_FARBE} strokeWidth={30} opacity={0.55}
                    />
                    <circle cx={k.punkt.x} cy={-k.punkt.y} r={90} fill={RAUMGRAPH_FARBE} opacity={0.8} />
                  </g>
                );
              })}
              {[...graph.zentren.values()].map((z, i) => (
                <circle key={`n${i}`} cx={z.x} cy={-z.y} r={200} fill={RAUMGRAPH_FARBE} opacity={0.9} />
              ))}
            </g>
          )}
          {/* v0.8.3 E1 (§1.4, docs/V083-SPEZ.md, Island-§8-Freigabe §8-6):
              Kommentar-Marker im Plan — reines App-Overlay, geht NICHT
              durch `derivePlan()` (kein Kernel-Renderpfad berührt, keine der
              35 bestehenden Goldens betroffen — dieselbe Grenze wie beim
              Raumgraph-Overlay/den verletzten Zonen oben). Zeigt Kommentare
              OHNE Geschossbezug (`storeyId` fehlt) auf JEDEM Geschoss,
              geschossgebundene nur auf ihrem eigenen.
              C-26 (PB5, §7 D8/§8 C-26): `kommentareSichtbar` blendet die
              GANZE Gruppe aus dem DOM aus (kein blosses `display:none` —
              `plan-kommentar` hat dann Count 0, deckungsgleich mit `pickAt`
              oben, das ausgeblendete Kommentare auch nicht mehr trifft). */}
          {kommentareSichtbar && (
          <g data-testid="plan-kommentare">
            {doc
              .byKind<Kommentar>('kommentar')
              .filter((k) => !k.storeyId || k.storeyId === activeStoreyId)
              .map((k) => (
                <g key={k.id} data-testid="plan-kommentar" data-status={k.status} opacity={k.status === 'erledigt' ? 0.5 : 1}>
                  <circle
                    cx={k.at.x}
                    cy={-k.at.y}
                    r={6 / view.scale}
                    fill={k.status === 'erledigt' ? 'var(--k-ink-faint)' : 'var(--k-accent)'}
                    stroke="var(--k-surface)"
                    strokeWidth={1.5 / view.scale}
                  />
                  <text
                    x={k.at.x}
                    y={-k.at.y - 12 / view.scale}
                    textAnchor="middle"
                    fontSize={11 / view.scale}
                    fontFamily="var(--k-font-mono)"
                    fill="var(--k-ink)"
                    pointerEvents="none"
                  >
                    {k.text.length > 24 ? `${k.text.slice(0, 24)}…` : k.text}
                  </text>
                </g>
              ))}
          </g>
          )}
          {/* C-26 (PB5, §7 D8/§8 C-26): MassKette-Entitäten (E2, `docs/
              V083-SPEZ.md` §2) waren bislang NIRGENDS im Plan sichtbar — nur
              im Doc gespeichert (Klickkette → `design.massKetteSetzen`, s.
              `masskette-kommentar.spec.ts`); die einzige bestehende
              Ketten-Darstellung (`dim-kette-*` unten) ist die AUTOMATISCHE
              Aussenbemassung, eine andere Entität. Reines App-Overlay wie
              der Kommentar-Marker oben — geht NICHT durch `derivePlan()`,
              keine Golden betroffen. Kein Sichtbarkeits-Filter (nur für
              Kommentare beauftragt, §8 C-26). */}
          {/* E-K27a: Der Spiegel ist keine gestrichelte Auf-Punkt-Linie mehr,
              sondern eine echte Masslinie mit Verlängerungslinien und
              Pro-Segment-Labels — dieselbe Geometrie-Idee wie im plansvg-
              Druckweg (602: Abstand/Luft/Überstand in Papier-mm, +90°-
              Normale). Am Bildschirm ist «Papier» nicht definiert, darum
              zoom-neutral in Bildschirm-px (X / view.scale). Druck-Wahrheit
              bleibt plansvg; die Punkt-Kreise bleiben welt-fix als
              Griff-Marker der Klickkette. */}
          <g data-testid="plan-massketten">
            {doc
              .byKind<MassKette>('masskette')
              .filter((mk) => mk.storeyId === activeStoreyId)
              .map((mk) => {
                const abstand = 26 / view.scale;
                const luft = 4 / view.scale;
                const ueberstand = 8 / view.scale;
                const strich = 1.1 / view.scale;
                return (
                  <g key={mk.id} data-testid="plan-masskette">
                    {mk.punkte.slice(1).map((b, i) => {
                      const a = mk.punkte[i]!;
                      const len = Math.hypot(b.x - a.x, b.y - a.y);
                      if (len < 1) return null;
                      const nx = -(b.y - a.y) / len;
                      const ny = (b.x - a.x) / len;
                      const mx = (a.x + b.x) / 2 + nx * (abstand + 10 / view.scale);
                      const my = (a.y + b.y) / 2 + ny * (abstand + 10 / view.scale);
                      return (
                        <g key={i}>
                          <line
                            data-testid="mk-hilfslinie"
                            x1={a.x + nx * luft}
                            y1={-(a.y + ny * luft)}
                            x2={a.x + nx * (abstand + ueberstand)}
                            y2={-(a.y + ny * (abstand + ueberstand))}
                            stroke="var(--k-ink-soft)"
                            strokeWidth={strich}
                          />
                          <line
                            data-testid="mk-hilfslinie"
                            x1={b.x + nx * luft}
                            y1={-(b.y + ny * luft)}
                            x2={b.x + nx * (abstand + ueberstand)}
                            y2={-(b.y + ny * (abstand + ueberstand))}
                            stroke="var(--k-ink-soft)"
                            strokeWidth={strich}
                          />
                          <line
                            data-testid="mk-masslinie"
                            x1={a.x + nx * abstand}
                            y1={-(a.y + ny * abstand)}
                            x2={b.x + nx * abstand}
                            y2={-(b.y + ny * abstand)}
                            stroke="var(--k-ink-soft)"
                            strokeWidth={strich}
                          />
                          <text
                            x={mx}
                            y={-my}
                            textAnchor="middle"
                            fontSize={11 / view.scale}
                            fontFamily="var(--k-font-mono)"
                            fill="var(--k-ink-soft)"
                            pointerEvents="none"
                          >
                            {formatLength(Math.round(len))}
                          </text>
                        </g>
                      );
                    })}
                    {mk.punkte.map((p, i) => (
                      <circle key={`p${i}`} cx={p.x} cy={-p.y} r={36} fill="var(--k-ink-soft)" />
                    ))}
                  </g>
                );
              })}
          </g>

          {/* v0.9.1 P-B1 (`docs/V091-SPEZ.md` §P-B1): interaktive Geländer-/
              Rampen-Darstellung — reines App-Overlay nach dem plan-massketten-
              Vorbild direkt darüber: geht NICHT durch `derivePlan()`, keine
              Goldens betroffen (der Druckweg in derive/plan.ts + plansvg ist
              der EINE deklarierte Golden-Zug P-B3 und bleibt hier unberührt).
              Die Geometrie kommt aus denselben Zerlegungen wie das 3D
              (`gelaenderTeile`/`rampenTeile` — eine Wahrheit, kein zweiter
              Rechenweg): Geländer = Polylinie + Pfosten-Punkte; Rampe =
              Kontur + Lauflinie + Steigungspfeil mit %-Text. */}
          <g data-testid="plan-gelaender-overlay">
            {doc
              .byKind<Gelaender>('gelaender')
              .filter((g) => g.storeyId === activeStoreyId)
              .map((g) => {
                const teile = gelaenderTeile(g);
                return (
                  <g key={g.id} data-testid="plan-gelaender">
                    <polyline
                      points={g.punkte.map((p) => `${p.x},${-p.y}`).join(' ')}
                      fill="none"
                      stroke="var(--k-ink)"
                      strokeWidth={BILDSCHIRM_PLAN.linieFein}
                    />
                    {teile.pfosten.map((p, i) => (
                      <circle key={`pf${i}`} cx={p.x} cy={-p.y} r={30} fill="var(--k-ink)" />
                    ))}
                  </g>
                );
              })}
          </g>
          <g data-testid="plan-rampen-overlay">
            {doc
              .byKind<Rampe>('ramp')
              .filter((r) => r.storeyId === activeStoreyId)
              .map((r) => {
                // elevation ist für die Plan-Bausteine ohne Belang (nur die
                // 3D-Platte braucht sie) — 0 genügt der Zerlegung.
                const teile = rampenTeile(r, 0);
                const { kontur, lauflinie, pfeil } = teile.plan;
                const len = Math.hypot(pfeil.spitze.x - pfeil.schaft.x, pfeil.spitze.y - pfeil.schaft.y) || 1;
                const d = { x: (pfeil.spitze.x - pfeil.schaft.x) / len, y: (pfeil.spitze.y - pfeil.schaft.y) / len };
                const n = { x: -d.y, y: d.x };
                const kopf = 180; // mm Pfeilkopf-Schenkel — welt-fix wie die Masskette-Punktkreise
                const mitte = { x: (lauflinie.a.x + lauflinie.b.x) / 2, y: (lauflinie.a.y + lauflinie.b.y) / 2 };
                return (
                  <g key={r.id} data-testid="plan-rampe">
                    <polygon
                      points={kontur.map((p) => `${p.x},${-p.y}`).join(' ')}
                      fill="none"
                      stroke="var(--k-ink)"
                      strokeWidth={BILDSCHIRM_PLAN.linieFein}
                    />
                    <line
                      x1={lauflinie.a.x}
                      y1={-lauflinie.a.y}
                      x2={lauflinie.b.x}
                      y2={-lauflinie.b.y}
                      stroke="var(--k-ink-soft)"
                      strokeWidth={BILDSCHIRM_PLAN.linieFein}
                      strokeDasharray={dashWelt(DASH.unterzug, 100)}
                    />
                    <path
                      d={`M ${pfeil.spitze.x - (d.x + n.x) * kopf} ${-(pfeil.spitze.y - (d.y + n.y) * kopf)} L ${pfeil.spitze.x} ${-pfeil.spitze.y} L ${pfeil.spitze.x - (d.x - n.x) * kopf} ${-(pfeil.spitze.y - (d.y - n.y) * kopf)}`}
                      fill="none"
                      stroke="var(--k-ink)"
                      strokeWidth={BILDSCHIRM_PLAN.linieFein}
                    />
                    <text
                      x={mitte.x + n.x * 260}
                      y={-(mitte.y + n.y * 260)}
                      textAnchor="middle"
                      fontSize={11 / view.scale}
                      fontFamily="var(--k-font-mono)"
                      fill="var(--k-ink-soft)"
                      pointerEvents="none"
                    >
                      {pfeil.text}
                    </text>
                  </g>
                );
              })}
          </g>
          {/* v0.9.2 P-D-Nachzug (Fable, Cluster B — `docs/V092-SPEZ.md` §P-D):
              Detail-Marker-Overlay nach EXAKT dem Geländer-/Rampen-Muster
              darüber — reines App-Overlay, geht NICHT durch `derivePlan()`
              (Marker im Druck = deklariertes Nicht-Ziel, zweiter Golden-Zug
              0.9.3). V1 bewusst NICHT interaktiv (kein plan-hit-test-Eintrag,
              keine Griffe — folgt 0.9.3 mit dem Detail-Zeichnen): gestricheltes
              Ausschnitt-Rechteck + Name·Massstab-Etikett, pointer-events:none. */}
          <g data-testid="plan-detail-overlay" pointerEvents="none">
            {doc
              .byKind<DetailMarker>('detail')
              .filter((d) => d.storeyId === activeStoreyId)
              .map((d) => {
                const x0 = Math.min(d.a.x, d.b.x);
                const x1 = Math.max(d.a.x, d.b.x);
                const y0 = Math.min(d.a.y, d.b.y);
                const y1 = Math.max(d.a.y, d.b.y);
                return (
                  <g key={d.id} data-testid="plan-detail">
                    <rect
                      x={x0}
                      y={-y1}
                      width={x1 - x0}
                      height={y1 - y0}
                      fill="none"
                      stroke="var(--k-signal)"
                      strokeWidth={BILDSCHIRM_PLAN.linieFein}
                      strokeDasharray={dashWelt(DASH.unterzug, 100)}
                    />
                    <text
                      x={x0}
                      y={-y1 - 12 / view.scale}
                      fontSize={11 / view.scale}
                      fontFamily="var(--k-font-mono)"
                      fill="var(--k-signal)"
                    >
                      {d.name} · 1:{d.massstab}
                    </text>
                  </g>
                );
              })}
          </g>
          {plan &&
            plan.lines
              // LOD-Feindetail-Filter: Öffnungen (Leibung/Fenster/Tür/Anschlag/
              // Zonentür) und die Baugrenze bleiben auf JEDER Stufe — sie sind
              // die Information, die auch aus der Distanz lesbar sein muss.
              // Treppen-Feindetail (Stufen, Bruchlinie) schon ab «mittel» weg;
              // Lauflinie, Unterzug und Etiketten-Anker erst «fern».
              .filter((l) => {
                if (lod === 'voll') return true;
                if (l.classes.includes('stufe') || l.classes.includes('bruchlinie')) return false;
                if (lod === 'fern' && (l.classes.includes('lauflinie') || l.classes.includes('unterzug') || l.classes.includes('etikett'))) return false;
                return true;
              })
              .map((l, i) => {
              const luecke = l.classes.includes('zonentuer-luecke');
              const fluegel = l.classes.includes('zonentuer-fluegel');
              return (
                <line
                  key={`l${i}`}
                  className={l.classes.join(' ')}
                  data-testid={fluegel ? 'zonentuer' : undefined}
                  x1={l.a.x}
                  y1={-l.a.y}
                  x2={l.b.x}
                  y2={-l.b.y}
                  stroke={
                    luecke
                      ? 'var(--k-surface)'
                      : l.classes.includes('baugrenze')
                        ? 'var(--k-danger)'
                        : l.classes.includes('renovation-neu')
                          ? UMBAU_STIFTE.neu
                          : l.classes.includes('renovation-abbruch')
                            ? UMBAU_STIFTE.abbruch
                            : 'var(--k-ink)'
                  }
                  strokeWidth={luecke ? BILDSCHIRM_PLAN.luecke : fluegel ? BILDSCHIRM_PLAN.linieZonentuerFluegel : l.classes.includes('fenster') || l.classes.includes('unterzug') ? BILDSCHIRM_PLAN.linieFein : l.classes.includes('baugrenze') ? BILDSCHIRM_PLAN.linieBaugrenze : BILDSCHIRM_PLAN.linieStandard}
                  strokeDasharray={
                    l.classes.includes('baugrenze')
                      ? dashWelt(DASH.strichpunktBestand, 100)
                      : l.classes.includes('ueber-schnitt')
                        ? dashWelt(DASH.ueberSchnitt, 100)
                        : l.classes.includes('unterzug')
                          ? dashWelt(DASH.unterzug, 100)
                          : undefined
                  }
                />
              );
            })}

          {/* Plan-Beschriftungen (A3: Aussparungs-Koten, A6: Etiketten) —
              LOD «fern»: keine Texte (Owner-Auflage, Schrift matscht zuerst) */}
          <g data-testid="plan-texte" style={{ display: lod === 'fern' ? 'none' : undefined }}>
          {plan &&
            plan.texte.map((t, i) => (
              <text
                key={`t${i}`}
                className={t.classes.join(' ')}
                x={t.at.x}
                y={-t.at.y + (t.zeile ?? 0) * 300}
                textAnchor="middle"
                fontSize={zoomTextFs(220, view.scale)}
                fontFamily="ui-monospace, monospace"
                fill="var(--k-ink)"
              >
                {t.text}
              </text>
            ))}
          </g>

          {/* Stützenraster: Achsen strichpunktiert + Achskopf an beiden Enden.
              T3: standardmässig aus (nur das Bauteil, nicht die Konstruktions-
              achse) — per «Achsen»-Knopf wieder einblendbar. Reine App-Schicht
              (PlanView), derive/plan.ts und der Druck-Pfad (plansvg.ts) bleiben
              unverändert — Goldens sind davon nicht betroffen. */}
          {achsenAn && plan &&
            plan.axes.map((ax, i) => {
              const haupt = ax.typ === 'haupt';
              return (
                <g key={`gx${i}`} data-testid="grid-achse">
                  <line
                    x1={ax.a.x}
                    y1={-ax.a.y}
                    x2={ax.b.x}
                    y2={-ax.b.y}
                    stroke="var(--k-ink-faint)"
                    strokeWidth={haupt ? 9 : 5}
                    strokeDasharray={haupt ? dashWelt(DASH.strichpunktBestand, 100) : dashWelt(DASH.achseWohn, 100)}
                  />
                  {haupt &&
                    ax.label &&
                    [ax.a, ax.b].map((p, k) => (
                      <g key={k}>
                        <circle cx={p.x} cy={-p.y} r={280} fill="var(--k-surface)" stroke="var(--k-ink-soft)" strokeWidth={9} />
                        <text
                          x={p.x}
                          y={-p.y + 100}
                          textAnchor="middle"
                          fontSize={zoomTextFs(300, view.scale)}
                          fill="var(--k-ink-soft)"
                          fontFamily="var(--k-font-mono)"
                        >
                          {ax.label}
                        </text>
                      </g>
                    ))}
                </g>
              );
            })}

          {plan &&
            plan.arcs.map((a, i) => {
              const sx = a.center.x + a.radius * Math.cos(a.startAngle);
              const sy = a.center.y + a.radius * Math.sin(a.startAngle);
              const ex = a.center.x + a.radius * Math.cos(a.endAngle);
              const ey = a.center.y + a.radius * Math.sin(a.endAngle);
              const large = Math.abs(a.endAngle - a.startAngle) > Math.PI ? 1 : 0;
              return (
                <path
                  key={`a${i}`}
                  // v0.6.9 Stream F: Klassen wie bei regions/lines durchreichen
                  // (waren vorher verworfen) — erst so wird z.B. `fenster-bogen`
                  // (derive/plan.ts) im Plan-SVG als `path.fenster-bogen`
                  // auffindbar, analog zu `path.treppe` bei den regions.
                  className={a.classes.join(' ')}
                  d={`M ${sx} ${-sy} A ${a.radius} ${a.radius} 0 ${large} 0 ${ex} ${-ey}`}
                  fill="none"
                  stroke="var(--k-ink-soft)"
                  strokeWidth={BILDSCHIRM_PLAN.bogen}
                  // Bildschirm-Bogen: feinere Kadenz als der Druckweg
                  // (DASH.bogen wäre '100 70') — Bestand.
                  strokeDasharray="60 40"
                />
              );
            })}

          {/* Assoziative Bemassung — Aussen- und Innenketten je nach Stil.
              LOD «fern»: Gruppe ausgeblendet (Bemassungstexte sind das erste,
              was aus der Distanz unlesbar wird — Owner-Befund). */}
          <g data-testid="plan-dims" style={{ display: lod === 'fern' ? 'none' : undefined }}>
          {dims &&
            dims.chains.map((c, ci) => {
              const innen = c.role === 'innen';
              const t0 = c.ticks[0]!;
              const t1 = c.ticks[c.ticks.length - 1]!;
              const line =
                c.axis === 'x'
                  ? { x1: t0, y1: -c.offset, x2: t1, y2: -c.offset }
                  : { x1: c.offset, y1: -t0, x2: c.offset, y2: -t1 };
              return (
                <g
                  key={`dim${ci}`}
                  data-testid={`dim-kette-${c.role}`}
                  stroke="var(--k-ink-soft)"
                  fill="var(--k-ink-soft)"
                >
                  <line {...line} strokeWidth={innen ? 6 : 8} />
                  {c.ticks.map((t, i) => (
                    <g key={i}>
                      {c.axis === 'x' ? (
                        <line x1={t - 60} y1={-c.offset + 60} x2={t + 60} y2={-c.offset - 60} strokeWidth={innen ? 9 : 12} />
                      ) : (
                        <line x1={c.offset - 60} y1={-t - 60} x2={c.offset + 60} y2={-t + 60} strokeWidth={innen ? 9 : 12} />
                      )}
                    </g>
                  ))}
                  {c.ticks.slice(0, -1).map((t, i) => {
                    const next = c.ticks[i + 1]!;
                    const mid = (t + next) / 2;
                    // E-K27a: Schrift im 1.8–5mm-Band; passt das Mass nicht
                    // mehr zwischen seine Ticks (Overlap-Fall des Owner-
                    // Befunds), VERDICHTET es zu einem Punktsymbol statt
                    // sich mit den Nachbarn zu überlagern — der Wert bleibt
                    // über die Aussenkette/Masskette erreichbar.
                    const fs = zoomTextFs(innen ? 240 : 280, view.scale);
                    const label = dimensionLabel(t, next);
                    const labelBreite = label.length * 0.62 * fs;
                    if (labelBreite > (next - t) * 0.92) {
                      return c.axis === 'x' ? (
                        <circle key={`t${i}`} data-testid="dim-verdichtet" cx={mid} cy={-c.offset - 120} r={fs * 0.18} stroke="none" />
                      ) : (
                        <circle key={`t${i}`} data-testid="dim-verdichtet" cx={c.offset - 120} cy={-mid} r={fs * 0.18} stroke="none" />
                      );
                    }
                    return c.axis === 'x' ? (
                      <text key={`t${i}`} x={mid} y={-c.offset - 120} textAnchor="middle" fontSize={fs} stroke="none" fontFamily="var(--k-font-mono)">
                        {label}
                      </text>
                    ) : (
                      <text key={`t${i}`} x={c.offset - 120} y={-mid} textAnchor="middle" fontSize={fs} stroke="none" fontFamily="var(--k-font-mono)" transform={`rotate(-90 ${c.offset - 120} ${-mid})`}>
                        {label}
                      </text>
                    );
                  })}
                </g>
              );
            })}
          </g>

          {/* Auswahl-Highlight (Anwählen) + Zieh-Vorschau (Verschieben) — reine
              Bildschirmdarstellung aus der Entity-Geometrie, unabhängig von
              derivePlan/den Poché-Regionen.
              C-12 (PB1, docs/V084-SPEZ.md §7 D8, Owner-Befund «Auswahl-
              Umrandung kräftiger»): ZWEI Schichten statt einer — ein breiter
              Glow-Strich in `--k-accent-wash` (dieselbe Token-Familie, die
              das Kontextmenü unten schon für seinen Hover nutzt) LIEGT UNTER
              dem Kernstrich, der selbst ebenfalls dicker geworden ist (22→28,
              beim Ziehen 30→38). Reiner Token-Sweep, kein neuer Hex-Wert —
              `--k-accent`/`--k-accent-wash` existieren beide schon in
              `aura.css`. `data-testid="auswahl-highlight"` bleibt auf dem
              Kernstrich (bestehender Vertrag, `plan-interaktion.spec.ts`),
              die Glow-Schicht ist rein dekorativ (`aria-hidden` via fehlenden
              Text/keine eigene Testid-Erwartung). */}
          {selection.map((id) => {
            // C-26 (PB5, §7 D8/§8 C-26): Masskette (offene Punktkette) und
            // Kommentar (ein Welt-Punkt) haben KEINE geschlossene `outline`
            // im Sinn von `outlineOf` (plan-hit-test.ts, PB1-Dateikreis, hier
            // bewusst NICHT erweitert) — eigener Zweig VOR dem bestehenden,
            // gleiches Kern+Glow-Muster (28/48, Ziehen 38/60) wie unten.
            const e = doc.get(id);
            const off = handlers.current?.moveOffset;
            // E1 (v0.8.5 PA1): beim Gruppen-Zug (`off.ids`) wandern ALLE
            // gelisteten Elemente live mit — nicht nur das angefasste.
            const ziehend = !!off && (off.id === id || !!off.ids?.includes(id));
            if (e && e.kind === 'masskette') {
              const mk = e as MassKette;
              const pts = ziehend ? mk.punkte.map((q) => ({ x: q.x + off.dx, y: q.y + off.dy })) : mk.punkte;
              const d = `M ${pts.map((q) => `${q.x} ${-q.y}`).join(' L ')}`;
              return (
                <g key={`sel-${id}`} pointerEvents="none">
                  <path
                    data-testid="auswahl-glow"
                    d={d}
                    fill="none"
                    stroke="var(--k-accent-wash)"
                    strokeWidth={ziehend ? 60 : 48}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={ziehend ? 0.85 : 1}
                  />
                  <path
                    data-testid="auswahl-highlight"
                    d={d}
                    fill="none"
                    stroke="var(--k-accent)"
                    strokeWidth={ziehend ? 38 : 28}
                    strokeDasharray={ziehend ? '90 50' : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={ziehend ? 0.85 : 1}
                  />
                </g>
              );
            }
            if (e && e.kind === 'kommentar') {
              // Kommentar-Marker selbst ist screen-konstant (`r={6/view.scale}`,
              // s. `plan-kommentare` oben) — der Halo folgt derselben
              // Konvention (`/view.scale`), sonst würde er bei kleinem Zoom
              // unter den Marker schrumpfen statt ihn sichtbar zu umschliessen.
              const km = e as Kommentar;
              const at = ziehend ? { x: km.at.x + off.dx, y: km.at.y + off.dy } : km.at;
              return (
                <g key={`sel-${id}`} pointerEvents="none">
                  <circle
                    data-testid="auswahl-glow"
                    cx={at.x}
                    cy={-at.y}
                    r={(ziehend ? 18 : 14) / view.scale}
                    fill="none"
                    stroke="var(--k-accent-wash)"
                    strokeWidth={(ziehend ? 16 : 12) / view.scale}
                    opacity={ziehend ? 0.85 : 1}
                  />
                  <circle
                    data-testid="auswahl-highlight"
                    cx={at.x}
                    cy={-at.y}
                    r={(ziehend ? 18 : 14) / view.scale}
                    fill="none"
                    stroke="var(--k-accent)"
                    strokeWidth={(ziehend ? 10 : 7) / view.scale}
                    opacity={ziehend ? 0.85 : 1}
                  />
                </g>
              );
            }
            const outline = outlineOf(doc, id);
            if (!outline || outline.length < 2) return null;
            const pts = ziehend ? outline.map((q) => ({ x: q.x + off.dx, y: q.y + off.dy })) : outline;
            const d = `M ${pts.map((q) => `${q.x} ${-q.y}`).join(' L ')} Z`;
            return (
              <g key={`sel-${id}`} pointerEvents="none">
                <path
                  data-testid="auswahl-glow"
                  d={d}
                  fill="none"
                  stroke="var(--k-accent-wash)"
                  strokeWidth={ziehend ? 60 : 48}
                  strokeLinejoin="round"
                  opacity={ziehend ? 0.85 : 1}
                />
                <path
                  data-testid="auswahl-highlight"
                  d={d}
                  fill="none"
                  stroke="var(--k-accent)"
                  strokeWidth={ziehend ? 38 : 28}
                  strokeDasharray={ziehend ? '90 50' : undefined}
                  strokeLinejoin="round"
                  opacity={ziehend ? 0.85 : 1}
                />
              </g>
            );
          })}

          {/* E3 (v0.8.5 PB1, docs/V085-SPEZ.md §7 C-15/C-16): Griffe — NUR
              bei Einzel-Auswahl (`griffe` oben ist bei Mehrfach-Auswahl
              leer, C-15 «weg bei Mehrfach-Auswahl»). Quadrate, screen-
              konstant über `/view.scale` (Kommentar-Marker-Konvention),
              Token-Farben `--k-accent`/`--k-surface`. Während eines Griff-
              Zugs (`griffOffset`) zeichnet dieselbe Gruppe zusätzlich das
              Gummiband (Achse bei Wand, Polylinie/-gon bei Masskette bzw.
              Zonen-/Volumen-/Dach-Outline mit dem einen verschobenen
              Punkt) UND zeigt den gezogenen Griff an seiner Vorschau-
              Position statt der (noch unveränderten) Doc-Position. */}
          {griffe.length > 0 && (() => {
            const vorschau = handlers.current?.griffOffset;
            const gezogenesEntity = vorschau ? doc.get(vorschau.id) : null;
            let gummibandD: string | null = null;
            // E5 (v0.8.6 PB3): der Öffnungs-Griff darf nie von der
            // Wandachse abheben — die Vorschau zeigt schon während des Zugs
            // den projizierten+geclampten Punkt (`projiziereOeffnungCenter`),
            // nicht den rohen Cursor wie bei Wand/Masskette/Zone oben (deren
            // Punkte selbst keiner Achsen-Zwangsbedingung unterliegen).
            let oeffnungVorschauPunkt: Pt | null = null;
            if (vorschau && gezogenesEntity) {
              if (gezogenesEntity.kind === 'wall') {
                const wall = gezogenesEntity as Wall;
                const andererPunkt = vorschau.key === 'a' ? wall.b : wall.a;
                gummibandD = `M ${andererPunkt.x} ${-andererPunkt.y} L ${vorschau.p.x} ${-vorschau.p.y}`;
              } else if (gezogenesEntity.kind === 'masskette') {
                const pts = (gezogenesEntity as MassKette).punkte.map((q, i) => (i === vorschau.key ? vorschau.p : q));
                gummibandD = `M ${pts.map((q) => `${q.x} ${-q.y}`).join(' L ')}`;
              } else if (gezogenesEntity.kind === 'gelaender') {
                // v0.9.1 P-B1: Polylinien-Gummiband, wortgleich Masskette.
                const pts = (gezogenesEntity as Gelaender).punkte.map((q, i) => (i === vorschau.key ? vorschau.p : q));
                gummibandD = `M ${pts.map((q) => `${q.x} ${-q.y}`).join(' L ')}`;
              } else if (gezogenesEntity.kind === 'ramp') {
                // v0.9.1 P-B1: Achsen-Gummiband, wortgleich Wand (a↔b).
                const r = gezogenesEntity as Rampe;
                const andererPunkt = vorschau.key === 'a' ? r.b : r.a;
                gummibandD = `M ${andererPunkt.x} ${-andererPunkt.y} L ${vorschau.p.x} ${-vorschau.p.y}`;
              } else if (
                gezogenesEntity.kind === 'zone' ||
                gezogenesEntity.kind === 'mass' ||
                gezogenesEntity.kind === 'roof'
              ) {
                const pts = (gezogenesEntity as Zone | MassBody | Roof).outline.map((q, i) =>
                  i === vorschau.key ? vorschau.p : q,
                );
                gummibandD = `M ${pts.map((q) => `${q.x} ${-q.y}`).join(' L ')} Z`;
              } else if (gezogenesEntity.kind === 'opening') {
                const o = gezogenesEntity as Opening;
                const wall = doc.get(o.wallId);
                if (wall && wall.kind === 'wall') {
                  const neuesCenter = projiziereOeffnungCenter(wall as Wall, o.width, vorschau.p);
                  oeffnungVorschauPunkt = wandAchsenPunkt(wall as Wall, neuesCenter);
                }
              }
              // PA5 (v0.8.7, docs/V087-SPEZ.md §3 E1): bewusst KEIN
              // Gummiband-Zweig für `stair` — anders als Wand/Masskette/
              // Zone/Volumen/Dach oben würde ein ehrliches Gummiband die
              // volle Lauf-/Podest-Geometrie aus `treppenTeile` neu ableiten
              // müssen (Steigungen/Podest-Outline hängen von der
              // Geschosshöhe ab, nicht nur von a/b/ecke). Der Auftrag
              // erlaubt ausdrücklich «Vorschau zeigt NUR den gezogenen
              // Punkt» — die Treppe selbst bleibt bis zum Drag-Ende
              // unverändert im Plan sichtbar (`gummibandD` bleibt hier
              // `null`), nur der Griff-Quadrat springt an die Cursor-
              // Position (`angezeigt` unten).
            }
            return (
              <g data-testid="plan-griffe" pointerEvents="none">
                {gummibandD && (
                  <path
                    data-testid="griff-gummiband"
                    d={gummibandD}
                    fill="none"
                    stroke="var(--k-accent)"
                    strokeWidth={2 / view.scale}
                    strokeDasharray={`${10 / view.scale} ${7 / view.scale}`}
                  />
                )}
                {griffe.map((g) => {
                  const wirdGezogen = vorschau && vorschau.id === g.id && vorschau.key === g.key;
                  const angezeigt = wirdGezogen
                    ? g.kind === 'opening' && oeffnungVorschauPunkt
                      ? oeffnungVorschauPunkt
                      : vorschau!.p
                    : g.p;
                  const testid =
                    // P-A3 (v0.8.11): beam-a/b sind Endpunkte wie Wand/Treppe;
                    // slab fällt bewusst in den eckpunkt-Zweig (wie zone).
                    // v0.9.1 P-B1: ramp-a/b ebenfalls Endpunkte; gelaender
                    // bekommt eigene Punkt-Testids (Muster masskette).
                    g.kind === 'wall' || g.kind === 'stair' || g.kind === 'beam' || g.kind === 'ramp'
                      ? `griff-endpunkt-${g.key}`
                      : g.kind === 'masskette'
                        ? `griff-massketten-punkt-${g.key}`
                        : g.kind === 'gelaender'
                          ? `griff-gelaender-punkt-${g.key}`
                          : g.kind === 'opening'
                            ? 'griff-oeffnung'
                            : `griff-eckpunkt-${g.key}`;
                  const groesse = 9 / view.scale;
                  return (
                    <rect
                      key={`griff-${g.kind}-${g.key}`}
                      data-testid={testid}
                      x={angezeigt.x - groesse / 2}
                      y={-angezeigt.y - groesse / 2}
                      width={groesse}
                      height={groesse}
                      fill="var(--k-surface)"
                      stroke="var(--k-accent)"
                      strokeWidth={2.5 / view.scale}
                    />
                  );
                })}
              </g>
            );
          })()}

          {/* E1 (v0.8.5 PA1): Rubber-Band-Vorschau — Welt-Koordinaten (y
              negiert wie überall in dieser Gruppe), Strichstärke/Dash
              screen-konstant über `/view.scale` (Kommentar-Halo-Konvention). */}
          {marquee && (
            <rect
              data-testid="plan-marquee"
              x={Math.min(marquee.a.x, marquee.b.x)}
              y={Math.min(-marquee.a.y, -marquee.b.y)}
              width={Math.abs(marquee.b.x - marquee.a.x)}
              height={Math.abs(marquee.b.y - marquee.a.y)}
              fill="var(--k-accent-wash)"
              fillOpacity={0.3}
              stroke="var(--k-accent)"
              strokeWidth={1.5 / view.scale}
              strokeDasharray={`${6 / view.scale} ${4 / view.scale}`}
              pointerEvents="none"
            />
          )}

          {/* T3-Zeichenhilfen: Fluchtlinien an bestehenden Punkten — durchlaufend
              über den ganzen sichtbaren Plan, damit die Ausrichtung sofort
              erkennbar ist (reine Bildschirm-Hilfe, kein Planinhalt). */}
          {handlers.current?.fluchtlinien?.map((f, i) =>
            f.achse === 'x' ? (
              <line
                key={`fx${i}`}
                data-testid="fluchtlinie"
                x1={f.wert}
                y1={-2_000_000}
                x2={f.wert}
                y2={2_000_000}
                stroke="var(--k-accent)"
                strokeWidth={4}
                strokeDasharray="6 14"
                opacity={0.55}
                pointerEvents="none"
              />
            ) : (
              <line
                key={`fy${i}`}
                data-testid="fluchtlinie"
                x1={-2_000_000}
                y1={-f.wert}
                x2={2_000_000}
                y2={-f.wert}
                stroke="var(--k-accent)"
                strokeWidth={4}
                strokeDasharray="6 14"
                opacity={0.55}
                pointerEvents="none"
              />
            ),
          )}

          {/* F4 (v0.6.4): sichtbarer Element-Fangpunkt beim Hover — ArchiCAD-
              Konvention: Quadrat = Endpunkt/Ecke, Kreis = Wandmitte, Kreuz =
              Kante (Fusspunkt). Grösse in Bildschirm-px über 1/scale, damit der
              Marker in jeder Zoomstufe gleich gross bleibt. */}
          {handlers.current?.fangPunkt && (() => {
            const f = handlers.current.fangPunkt!;
            const r = 7 / view.scale; // ≙ 7 px halbe Markergrösse
            const sw = 2 / view.scale;
            const stil = { stroke: 'var(--k-accent)', strokeWidth: sw, fill: 'none' as const };
            return (
              <g data-testid="fang-marker" data-fang-typ={f.typ} pointerEvents="none">
                {f.typ === 'endpunkt' && (
                  <rect x={f.p.x - r} y={-f.p.y - r} width={2 * r} height={2 * r} {...stil} />
                )}
                {f.typ === 'mitte' && <circle cx={f.p.x} cy={-f.p.y} r={r} {...stil} />}
                {f.typ === 'kante' && (
                  <>
                    <line x1={f.p.x - r} y1={-f.p.y - r} x2={f.p.x + r} y2={-f.p.y + r} {...stil} />
                    <line x1={f.p.x - r} y1={-f.p.y + r} x2={f.p.x + r} y2={-f.p.y - r} {...stil} />
                  </>
                )}
              </g>
            );
          })()}

          {/* Werkzeug-Vorschau */}
          {handlers.current?.previewLine && handlers.current.previewLine.length >= 2 && (
            <polyline
              points={handlers.current.previewLine.map((p) => `${p.x},${-p.y}`).join(' ')}
              fill="none"
              stroke={handlers.current.orthoAktiv ? 'var(--k-success)' : 'var(--k-accent)'}
              strokeWidth={20}
              strokeDasharray="80 50"
            />
          )}
          {cursor && (
            <g>
              <line
                x1={cursor.x - 300}
                y1={-cursor.y}
                x2={cursor.x + 300}
                y2={-cursor.y}
                stroke={handlers.current?.orthoAktiv ? 'var(--k-success)' : 'var(--k-accent)'}
                strokeWidth={8}
              />
              <line
                x1={cursor.x}
                y1={-cursor.y - 300}
                x2={cursor.x}
                y2={-cursor.y + 300}
                stroke={handlers.current?.orthoAktiv ? 'var(--k-success)' : 'var(--k-accent)'}
                strokeWidth={8}
              />
              {/* V-H1 «Zahlen zur Hand» (VORFORM-UI-KONZEPT §1.4): blaue Live-
                  Masszahl am Gummiband bzw. der getippte Ziffern-Puffer —
                  zoomstabil über 1/scale, unter dem Cursor (der Ortho-Hinweis
                  wohnt oben rechts). */}
              {handlers.current?.massLabel && (
                <text
                  data-testid="mass-label"
                  x={cursor.x + 14 / view.scale}
                  y={-cursor.y + 26 / view.scale}
                  fontSize={13 / view.scale}
                  fontWeight={600}
                  fill="var(--k-accent)"
                  fontFamily="var(--k-font-mono)"
                  pointerEvents="none"
                >
                  {handlers.current.massLabel}
                </text>
              )}
              {handlers.current?.orthoAktiv && (
                <text
                  data-testid="ortho-hinweis"
                  x={cursor.x + 340}
                  y={-cursor.y - 340}
                  fontSize={zoomTextFs(200, view.scale)}
                  fill="var(--k-success)"
                  fontFamily="var(--k-font-mono)"
                >
                  ⊥ 45°
                </text>
              )}
            </g>
          )}
        </g>
      </svg>
      {handlers.current?.sketchMode && handlers.current.onSketchAccept && (
        <SketchOverlay
          toWorld={(cx, cy) => toWorld(cx, cy)}
          toScreen={(p) => {
            const rect = svgRef.current?.getBoundingClientRect();
            const w = rect?.width ?? 800;
            const h = rect?.height ?? 600;
            return {
              x: (p.x - view.cx) * view.scale + w / 2,
              y: (view.cy - p.y) * view.scale + h / 2,
            };
          }}
          onAccept={handlers.current.onSketchAccept}
          // v0.6.6 / Welle 2 Stream C (Task 5, Palm-Rejection-Basis): zweiter
          // Pointer während eines Stift-Strichs pannt statt zu zeichnen —
          // dieselbe Umrechnung wie beim Maus-Drag-Pan oben (dx/dy in
          // Bildschirm-px → Weltverschiebung über `view.scale`).
          onPanDelta={(dx, dy) => {
            stoppeFling();
            setViewGeklemmt((v) => ({ ...v, cx: v.cx - dx / v.scale, cy: v.cy + dy / v.scale }));
          }}
        />
      )}
      {/* D11/C-20 (v0.8.5 PB3, Fable-Nachzug — PlanView lag im PB1-Kreis):
          Kommentar-Erfassen im MANUELL-Modus. Rendert sich nur, wenn die
          Insel-Logik einen `kommentarPunkt` gesetzt hat (K→Klick, s.
          DesignWorkspace) UND die Oberfläche manuell ist — exakt das
          SketchOverlay-`toScreen`-Muster eine Zeile weiter oben. */}
      <KommentarErfassenAmPunkt
        toScreen={(p) => {
          const rect = svgRef.current?.getBoundingClientRect();
          const w = rect?.width ?? 800;
          const h = rect?.height ?? 600;
          return {
            x: (p.x - view.cx) * view.scale + w / 2,
            y: (view.cy - p.y) * view.scale + h / 2,
          };
        }}
      />
      {kontext2d && (
        <ViewportKontextmenue
          x={kontext2d.x}
          y={kontext2d.y}
          aktionen={
            kontext2d.modus === 'element'
              ? ([
                  {
                    label: 'Auswählen',
                    testid: 'kontext2d-auswaehlen',
                    onClick: () => handlers.current?.onPick?.(kontext2d.entityId),
                  },
                  {
                    label: 'Eigenschaften',
                    testid: 'kontext2d-eigenschaften',
                    // C-11 (PE3-Fix v0.8.4): Auswahl + expliziter
                    // Eigenschaften-Weg. Im manuell-Modus zeigt der gedockte
                    // Inspector die Auswahl; im Island-Default (wo es keinen
                    // Dock gibt) öffnet `onEigenschaften` den schwebenden
                    // Inspector (`DesignWorkspace`, `dw-eigenschaften-float`)
                    // — vorher war dieser Eintrag dort wirkungslos.
                    onClick: () => {
                      handlers.current?.onPick?.(kontext2d.entityId);
                      handlers.current?.onEigenschaften?.(kontext2d.entityId);
                    },
                  },
                  {
                    label: 'Löschen',
                    testid: 'kontext2d-loeschen',
                    onClick: () => {
                      const id = kontext2d.entityId;
                      try {
                        useProject.getState().runCommand('design.loeschen', { entityId: id });
                      } catch (err) {
                        meldeFehler(err);
                      }
                      const { selection: sel, select } = useProject.getState();
                      if (sel.includes(id)) select(sel.filter((sid) => sid !== id));
                    },
                  },
                ] satisfies KontextAktion[])
              : ([
                  {
                    label: 'Abschliessen',
                    testid: 'kontext2d-abschliessen',
                    // C-10/C-11: derselbe Weg wie Doppelklick — der
                    // Rechtsklick-Weltpunkt steht an `kontext2d.p`.
                    onClick: () => handlers.current?.onGroundDoubleClick?.({ p: kontext2d.p, shiftKey: false }),
                  },
                  {
                    label: 'Abbrechen',
                    testid: 'kontext2d-abbrechen',
                    onClick: () => handlers.current?.onEscape?.(),
                  },
                ] satisfies KontextAktion[])
          }
          onClose={() => setKontext2d(null)}
        />
      )}
      {/* PD3c: dieselbe Ausblendung wie die HUD-Zeile oben — die Nav-Leiste
          (Werkzeug/Pan/Zoom/Einpassen) ist reine Viewport-Chrome, kein
          Bestandteil der vier Islands/der Ansichts-Info. Maus-/Touch-
          Navigation (Mausrad, Mitteltaste, Rechtsklick/Alt-Klick, Pinch)
          bleibt unabhängig davon in JEDEM Modus aktiv — nur diese sichtbaren
          Knöpfe verschwinden. */}
      {designOberflaeche === 'manuell' && (
      <NavLeiste
        testid="nav-2d"
        aktionen={[
          { id: 'werkzeug', icon: '◇', titel: 'Werkzeug — linke Maustaste zeichnet/wählt (Standard)', aktiv: navModus2d === 'werkzeug', onClick: () => setNavModus2d('werkzeug') },
          { id: 'pan', icon: '✋', titel: 'Pan — linke Maustaste verschiebt die Ansicht (sonst: Mitteltaste/Rechtsklick/Alt-Klick)', aktiv: navModus2d === 'pan', onClick: () => setNavModus2d('pan') },
          { id: 'zoom', icon: '🔍', titel: 'Zoom — linke Maustaste ziehen zoomt (sonst: Mausrad/Pinch)', aktiv: navModus2d === 'zoom', onClick: () => setNavModus2d('zoom') },
          { id: 'fit', icon: '⌂', titel: 'Einpassen — Grundriss ins Bild holen', onClick: einpassen },
        ]}
      />
      )}
    </div>
  );
}

function PlanGrid({ cx, cy, scale }: { cx: number; cy: number; scale: number }) {
  // 1m-Punktraster im sichtbaren Bereich
  const halfW = ((typeof window !== 'undefined' ? window.innerWidth : 1200) / 2) / scale;
  const halfH = ((typeof window !== 'undefined' ? window.innerHeight : 800) / 2) / scale;
  const step = scale < 0.02 ? 5000 : 1000;
  const x0 = Math.floor((cx - halfW) / step) * step;
  const x1 = Math.ceil((cx + halfW) / step) * step;
  const y0 = Math.floor((cy - halfH) / step) * step;
  const y1 = Math.ceil((cy + halfH) / step) * step;
  const dots: React.ReactElement[] = [];
  if ((x1 - x0) / step < 120 && (y1 - y0) / step < 120) {
    for (let x = x0; x <= x1; x += step) {
      for (let y = y0; y <= y1; y += step) {
        dots.push(<circle key={`${x}:${y}`} cx={x} cy={-y} r={12} fill="var(--k-line-strong)" />);
      }
    }
  }
  return <g>{dots}</g>;
}
