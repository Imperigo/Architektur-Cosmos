import { useEffect, useMemo, useRef, useState } from 'react';
import { KSelect } from '@kosmo/ui';
import { derivePlan, deriveDimensions, dimensionLabel, moebelGeometrie, pocheEntscheid, pruefeGrundriss, raumGraph, regionToPath, type BauPhase, type Furniture, type PocheModus, type Pt, type Zone } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';
import { useUnternehmerplan } from './unternehmerplan';
import type { ViewportHandlers } from './Viewport3D';
import { SketchOverlay } from './SketchOverlay';
import { outlineOf, pickEntityAt } from './plan-hit-test';
import { NavLeiste } from './NavLeiste';
import { planLod, type PlanLod } from './planLod';
import { cursor2dFuer, istEingabefeld } from './kurztasten';
import { FLING_STOPP_GESCHWINDIGKEIT, flingSchritt, flingTracker, gestenDetektor } from './eingabe-3d';
import { tick as haptikTick } from '../../state/haptik';
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
  // Raumgraph-Overlay (Finch-Clip): Knoten auf Raumzentren, Kanten an Übergängen
  const [graphAn, setGraphAn] = useState(false);
  // Trace (RE-ARCHICAD A8): anderes Geschoss blass unterlegen — reine
  // Arbeitshilfe am Bildschirm, nie Planinhalt
  const [traceId, setTraceId] = useState<string>('');
  // T3: Stützenraster-Achsen (Konstruktionslinien des Tragrasters) standard-
  // mässig aus — nur das Bauteil, nicht die Zeichen-Achse. Über den Umschalter
  // wieder einblendbar (Druck/Export bleibt unverändert, siehe derive/plan.ts).
  const [achsenAn, setAchsenAn] = useState(false);
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
      setView((cur) => ({
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
      setView(ziel);
      return;
    }
    const dauer = 260; // --k-feder
    const t0 = performance.now();
    const schritt = (t: number) => {
      const u = Math.min(1, (t - t0) / dauer);
      const e = federGefuehl(u);
      setView({
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
    if (activeStoreyId) {
      const hit = pickEntityAt(doc, activeStoreyId, toWorld(clientX, clientY));
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
  const [kontext2d, setKontext2d] = useState<{ x: number; y: number; entityId: string } | null>(null);
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
          const hit = pickEntityAt(doc, activeStoreyId, toWorld(ev.longPress.x, ev.longPress.y));
          if (hit) {
            haptikTick(); // §6: Longpress-Auslösung
            const rect = svgRef.current?.getBoundingClientRect();
            setKontext2d({
              x: ev.longPress.x - (rect?.left ?? 0),
              y: ev.longPress.y - (rect?.top ?? 0),
              entityId: hit,
            });
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
  const pickAt = (p: Pt): string | null => (activeStoreyId ? pickEntityAt(doc, activeStoreyId, p) : null);
  // Ziehen im Plan: EIN design.verschieben bei pointerup, kein Patch pro Move
  const moveActive = useRef(false);
  const selection = useProject((s) => s.selection);

  const toWorld = (clientX: number, clientY: number): Pt => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = clientX - rect.left - rect.width / 2;
    const py = clientY - rect.top - rect.height / 2;
    return {
      x: Math.round(view.cx + px / view.scale),
      y: Math.round(view.cy - py / view.scale),
    };
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
    const w = Math.max(b.maxX - b.minX, 2000);
    const h = Math.max(b.maxY - b.minY, 2000);
    const scale = Math.min(1, Math.max(0.005, Math.min(rect.width / (w * 1.25), rect.height / (h * 1.25))));
    setView({ cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, scale });
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
    <div style={{ position: 'absolute', inset: 0, background: 'var(--k-plan-paper)' }}>
      <KSelect
        size="sm"
        data-testid="trace-select"
        value={traceId}
        onChange={(e) => setTraceId(e.target.value)}
        title="Trace: anderes Geschoss blass unterlegen (nur Bildschirm)"
        style={{
          // v0.6.9 KSelect-Split: position/top/right/zIndex tragen den Wrapper,
          // Farbe/Schrift den Trigger — Optik wie zuvor (lila, solange aktiv).
          position: 'absolute', top: 8, right: 70, zIndex: 5,
          background: traceId ? '#7a5c9e' : 'var(--k-raised)', color: traceId ? 'white' : 'inherit',
          fontSize: 11.5,
        }}
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
          className="k-druck"
          onClick={() => overlayUmschalten()}
          title="Unternehmerplan-Referenz ein-/ausblenden (Durchpaus-Layer, nur Bildschirm, C4b)"
          style={{
            position: 'absolute', top: 8, right: 215, zIndex: 5, padding: '3px 10px',
            borderRadius: 6, border: '1px solid var(--k-line-strong)', cursor: 'pointer',
            background: overlaySichtbar ? '#2455a4' : 'var(--k-raised)', color: overlaySichtbar ? 'white' : 'inherit',
            font: 'inherit', fontSize: 11.5,
          }}
        >
          U-Plan
        </button>
      )}
      <button
        data-testid="graph-toggle"
        className="k-druck"
        onClick={() => setGraphAn(!graphAn)}
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 5, padding: '3px 10px',
          borderRadius: 6, border: '1px solid var(--k-line-strong)', cursor: 'pointer',
          background: graphAn ? '#2455a4' : 'var(--k-raised)', color: graphAn ? 'white' : 'inherit',
          font: 'inherit', fontSize: 11.5,
        }}
      >
        Graph
      </button>
      <button
        data-testid="achsen-toggle"
        className="k-druck"
        onClick={() => setAchsenAn(!achsenAn)}
        title="Stützenraster-Achsen (Konstruktionslinien) ein-/ausblenden — nur Bildschirm, Druck/Export unverändert"
        style={{
          position: 'absolute', top: 8, right: 140, zIndex: 5, padding: '3px 10px',
          borderRadius: 6, border: '1px solid var(--k-line-strong)', cursor: 'pointer',
          background: achsenAn ? '#2455a4' : 'var(--k-raised)', color: achsenAn ? 'white' : 'inherit',
          font: 'inherit', fontSize: 11.5,
        }}
      >
        Achsen
      </button>
      <svg
        ref={svgRef}
        data-testid="planview"
        data-lod={lod}
        data-cursor={cursorStil}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: cursorStil }}
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
            // Auswahl-Werkzeug: Treffer auf einem Bauteil startet gleich die
            // Zieh-Geste (Klick ohne Bewegung = reine Auswahl, dx/dy bleiben 0).
            const p = toWorld(e.clientX, e.clientY);
            const hit = pickEntityAt(doc, activeStoreyId, p);
            if (hit && handlers.current.onMoveStart?.(hit, p)) {
              moveActive.current = true;
              (e.target as Element).setPointerCapture(e.pointerId);
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
              setView({
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
            setView((v) => ({ ...v, cx: panning.current!.cx - dx, cy: panning.current!.cy + dy }));
            flingRef.current!.sample(performance.now(), e.clientX, e.clientY); // §5: Fling-Fenster (Maus-Drag-Pan)
          } else if (moveActive.current) {
            handlers.current?.onMoveDrag?.(toWorld(e.clientX, e.clientY));
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
                  setHoverId(pickEntityAt(doc, activeStoreyId, p));
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
          if (e.button !== 0) return;
          const p = toWorld(e.clientX, e.clientY);
          if (handlers.current?.pickMode) {
            handlers.current.onPick?.(pickAt(p));
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
          if (!activeStoreyId) return;
          const hit = pickEntityAt(doc, activeStoreyId, toWorld(e.clientX, e.clientY));
          if (!hit) return;
          const rect = svgRef.current?.getBoundingClientRect();
          setKontext2d({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0), entityId: hit });
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
            <rect width="40" height="40" fill="#dad7d1" />
            <line x1="0" y1="0" x2="0" y2="40" stroke="#333" strokeWidth="5" />
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
              hinter allem Planinhalt, nie interaktiv. */}
          {kontextZonen.length > 0 && (
            <g data-testid="plan-kontext" pointerEvents="none">
              {kontextZonen.map((z) =>
                z.zonenArt === 'parzelle' ? (
                  <path
                    key={`ktx-${z.id}`}
                    d={`M ${z.outline.map((q) => `${q.x} ${-q.y}`).join(' L ')} Z`}
                    fill="none"
                    stroke="var(--k-ink-soft)"
                    strokeWidth={Math.max(20, 1.2 / view.scale)}
                    strokeDasharray={`${3 / view.scale} ${0.9 / view.scale} ${0.6 / view.scale} ${0.9 / view.scale}`}
                  />
                ) : (
                  <path
                    key={`ktx-${z.id}`}
                    d={`M ${z.outline.map((q) => `${q.x} ${-q.y}`).join(' L ')} Z`}
                    fill="var(--k-line-strong)"
                    opacity={0.55}
                    stroke="none"
                  />
                ),
              )}
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
                <line key={`ul${i}`} x1={l.a.x} y1={-l.a.y} x2={l.b.x} y2={-l.b.y} stroke="#1a6fb5" strokeWidth={14} />
              ))}
              {unternehmerDxf.regions.map((r, i) => (
                <polygon
                  key={`ur${i}`}
                  points={r.ring.map((p) => `${p.x},${-p.y}`).join(' ')}
                  fill="none"
                  stroke="#1a6fb5"
                  strokeWidth={14}
                />
              ))}
              {unternehmerDxf.texte.map((t, i) => (
                <text
                  key={`ut${i}`}
                  x={t.at.x}
                  y={-t.at.y}
                  textAnchor="middle"
                  fontSize={220}
                  fontFamily="ui-monospace, monospace"
                  fill="#1a6fb5"
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
                      ? 'rgba(179, 38, 30, 0.22)'
                      : abbruch
                        ? 'rgba(214, 178, 20, 0.35)'
                        : bestand
                          ? '#c9c9c9'
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
                                  ? '#c9c9c9'
                                  : !pe.schraffurLinien && pe.art === 'daemmung'
                                    ? 'var(--k-raised)'
                                    : null;
                            })() ?? (isCore
                              ? lod === 'voll'
                                ? 'url(#hatch-beton)'
                                // «mittel»/«fern»: Schraffur wird flaches Poché
                                // (Druckkonvention, gleicher Grauwert wie Bestand)
                                : '#c9c9c9'
                              : isDaemmung
                                ? lod === 'voll'
                                  ? 'url(#hatch-daemmung)'
                                  : 'var(--k-line)'
                                : isProjection
                                  ? 'none'
                                  : 'var(--k-surface)')
                  }
                  stroke={neu ? '#b3261e' : abbruch ? '#8a7500' : 'var(--k-ink)'}
                  strokeWidth={isProjection ? 8 : isCore ? 24 : 12}
                  strokeDasharray={
                    r.classes.includes('volumen')
                      ? '120 60'
                      : abbruch
                        ? '150 80'
                        : r.classes.includes('ueber-schnitt')
                          ? '150 60 30 60'
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
                  <path d={d(g.korpus)} fill="none" stroke="var(--k-ink-soft)" strokeWidth={10} />
                  <path d={d(g.bewegung)} fill="none" stroke="var(--k-ink-faint)" strokeWidth={6} strokeDasharray="60 40" />
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
              const farbe = v.schwere === 'fehler' ? 'var(--k-danger)' : '#c68622';
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
                      fill="none" stroke="#2455a4" strokeWidth={30} opacity={0.55}
                    />
                    <circle cx={k.punkt.x} cy={-k.punkt.y} r={90} fill="#2455a4" opacity={0.8} />
                  </g>
                );
              })}
              {[...graph.zentren.values()].map((z, i) => (
                <circle key={`n${i}`} cx={z.x} cy={-z.y} r={200} fill="#2455a4" opacity={0.9} />
              ))}
            </g>
          )}
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
                          ? '#b3261e'
                          : l.classes.includes('renovation-abbruch')
                            ? '#8a7500'
                            : 'var(--k-ink)'
                  }
                  strokeWidth={luecke ? 120 : fluegel ? 12 : l.classes.includes('fenster') || l.classes.includes('unterzug') ? 10 : l.classes.includes('baugrenze') ? 12 : 14}
                  strokeDasharray={
                    l.classes.includes('baugrenze')
                      ? '300 90 60 90'
                      : l.classes.includes('ueber-schnitt')
                        ? '150 60 30 60'
                        : l.classes.includes('unterzug')
                          ? '120 70'
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
                fontSize={220}
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
                    strokeDasharray={haupt ? '300 90 60 90' : '120 90'}
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
                          fontSize={300}
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
                  strokeWidth={8}
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
                    const fs = innen ? 240 : 280;
                    return c.axis === 'x' ? (
                      <text key={`t${i}`} x={mid} y={-c.offset - 120} textAnchor="middle" fontSize={fs} stroke="none" fontFamily="var(--k-font-mono)">
                        {dimensionLabel(t, next)}
                      </text>
                    ) : (
                      <text key={`t${i}`} x={c.offset - 120} y={-mid} textAnchor="middle" fontSize={fs} stroke="none" fontFamily="var(--k-font-mono)" transform={`rotate(-90 ${c.offset - 120} ${-mid})`}>
                        {dimensionLabel(t, next)}
                      </text>
                    );
                  })}
                </g>
              );
            })}
          </g>

          {/* Auswahl-Highlight (Anwählen) + Zieh-Vorschau (Verschieben) — reine
              Bildschirmdarstellung aus der Entity-Geometrie, unabhängig von
              derivePlan/den Poché-Regionen. */}
          {selection.map((id) => {
            const outline = outlineOf(doc, id);
            if (!outline || outline.length < 2) return null;
            const off = handlers.current?.moveOffset;
            const ziehend = off && off.id === id;
            const pts = ziehend ? outline.map((q) => ({ x: q.x + off.dx, y: q.y + off.dy })) : outline;
            return (
              <path
                key={`sel-${id}`}
                data-testid="auswahl-highlight"
                d={`M ${pts.map((q) => `${q.x} ${-q.y}`).join(' L ')} Z`}
                fill="none"
                stroke="var(--k-accent)"
                strokeWidth={ziehend ? 30 : 22}
                strokeDasharray={ziehend ? '90 50' : undefined}
                opacity={ziehend ? 0.85 : 1}
                pointerEvents="none"
              />
            );
          })}

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
              stroke={handlers.current.orthoAktiv ? 'var(--k-success, #2e7d32)' : 'var(--k-accent)'}
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
                stroke={handlers.current?.orthoAktiv ? 'var(--k-success, #2e7d32)' : 'var(--k-accent)'}
                strokeWidth={8}
              />
              <line
                x1={cursor.x}
                y1={-cursor.y - 300}
                x2={cursor.x}
                y2={-cursor.y + 300}
                stroke={handlers.current?.orthoAktiv ? 'var(--k-success, #2e7d32)' : 'var(--k-accent)'}
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
                  fontSize={200}
                  fill="var(--k-success, #2e7d32)"
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
            setView((v) => ({ ...v, cx: v.cx - dx / v.scale, cy: v.cy + dy / v.scale }));
          }}
        />
      )}
      {kontext2d && (
        <ViewportKontextmenue
          x={kontext2d.x}
          y={kontext2d.y}
          aktionen={
            [
              {
                label: 'Auswählen',
                testid: 'kontext2d-auswaehlen',
                onClick: () => handlers.current?.onPick?.(kontext2d.entityId),
              },
            ] satisfies KontextAktion[]
          }
          onClose={() => setKontext2d(null)}
        />
      )}
      <NavLeiste
        testid="nav-2d"
        aktionen={[
          { id: 'werkzeug', icon: '◇', titel: 'Werkzeug — linke Maustaste zeichnet/wählt (Standard)', aktiv: navModus2d === 'werkzeug', onClick: () => setNavModus2d('werkzeug') },
          { id: 'pan', icon: '✋', titel: 'Pan — linke Maustaste verschiebt die Ansicht (sonst: Mitteltaste/Rechtsklick/Alt-Klick)', aktiv: navModus2d === 'pan', onClick: () => setNavModus2d('pan') },
          { id: 'zoom', icon: '🔍', titel: 'Zoom — linke Maustaste ziehen zoomt (sonst: Mausrad/Pinch)', aktiv: navModus2d === 'zoom', onClick: () => setNavModus2d('zoom') },
          { id: 'fit', icon: '⌂', titel: 'Einpassen — Grundriss ins Bild holen', onClick: einpassen },
        ]}
      />
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
