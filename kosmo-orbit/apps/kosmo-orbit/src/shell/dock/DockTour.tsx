import { useEffect, useRef, useState } from 'react';
import { Badge, KButton, Panel } from '@kosmo/ui';
import type { DockModus } from '../../state/dock-kern';
import { useDockZustand, type DockStationLayout } from '../../state/dock-zustand';
import { useUiZustand, type PanelId } from '../../state/ui-zustand';
import { useAktiveDockStation } from '../../state/dock-aktive-station';
import { useDockOrbRuntime, type DockKopfRechteck } from '../../state/dock-orb-runtime';
import { useDockTourZustand } from '../../state/dock-tour-zustand';
import type { DockStation } from '../../state/dock-stationen';
import './dock-tour.css';

/**
 * DockTour (v0.7.8 Welle 3 / Paket P8 — «Geführte Tour», letztes Bau-Paket) —
 * 7-Schritte-Rundgang durch das Dock-System, inhaltlich an den Tour-
 * Referenzblock des Design-Handoff-Prototyps angelehnt
 * (`tourSteps()`/`applyStep()`/`exitTour()`, `Werkzeug-Dock.dc.html`
 * Z.786-829), aber auf die ECHTE Design-Station übersetzt: der Prototyp
 * demonstriert an generischen Platzhalter-Panels (`kosmo`/`inspector`/
 * `checks`), diese Tour an real existierenden Panels der Registry
 * (`dock-stationen.ts`), damit jeder Schritt ein ECHTES, reproduzierbares
 * Layout zeigt statt einer Attrappe.
 *
 * **Warum «kvOffen» als Demo-Panel statt `inspector`**: `inspector` ist ein
 * reiner Daten-Guard (sichtbar nur bei aktiver Auswahl, s. `dock-stationen.
 * ts`-Kopfkommentar) — eine Tour, die IMMER (auch ohne Projektauswahl)
 * funktionieren muss, kann sich nicht auf eine Auswahl verlassen, die sie
 * selbst nicht herstellen darf (kein Doc-Command hier, nur Dock-/UI-
 * Zustand). `kvOffen` (Kostenschätzung) ist wie `inspector` ein normales,
 * bewegbares/anheftbares linkes Panel, aber über einen simplen
 * `ui-zustand.ts`-Boolean IMMER erreichbar.
 *
 * **Schritt 4 (Anheften/Einklappen) braucht garantierten Platzmangel**: statt
 * nur ein zweites Panel zu öffnen (das bei einem grossen Fenster locker
 * reinpassen könnte, s. `dock-kern.ts`s `stack()` — Auftrag verlangt ein
 * SICHTBAR einklappendes Panel, kein Vielleicht), öffnet dieser Schritt ALLE
 * zehn linken Panels gleichzeitig (deutlich mehr `Σmin` als jedes gemessene
 * Testfenster hoch ist) — das unwichtigste, nicht angeheftete
 * (`rasterOffen`, Wichtigkeit 38, s. `dock-stationen.ts`) klappt darum
 * IMMER als erstes ein, unabhängig von Fenstergrösse.
 *
 * **Start/Exit-Semantik 1:1 wie der Prototyp** (`startTour()`/`exitTour()`):
 * `starten()` snapshotet `modus`+`layouts` (`dock-zustand.ts`) UND die zehn
 * berührten `ui-zustand.ts`-Booleans; `Beenden` schreibt beides EXAKT
 * zurück (`zustandWiederherstellen()`, additiv in `dock-zustand.ts` — die
 * Tour braucht "auf genau diesen Schnappschuss zurück", nicht "einen
 * einzelnen Override ändern", darum keine der bestehenden Patch-Aktionen).
 * Jeder Schritt selbst ist eine VOLLSTÄNDIGE Ersetzung (Reset via
 * `layoutZuruecksetzen()` + Neuaufbau), keine Inkremente über den vorherigen
 * Schritt — Vor/Zurück bleiben so deterministisch in beide Richtungen.
 */

const STATION: DockStation = 'design';

/** Die zehn linken Booleans, die diese Tour überhaupt anfasst (Schritt 4
 *  braucht alle zehn, die übrigen Schritte nur `kvOffen`) — Snapshot/Restore
 *  beschränkt sich bewusst auf GENAU diese Menge (kein globaler
 *  `ui-zustand`-Rundumschlag). */
const GESTEUERTE_PANEL_IDS: readonly PanelId[] = [
  'rasterOffen',
  'cwSetzenOffen',
  'splatPanelOffen',
  'maengelOffen',
  'submissionOffen',
  'bauablaufOffen',
  'kvOffen',
  'listeOffen',
  'variantenPanelOffen',
  'studieOffen',
];

interface DockTourSchritt {
  titel: string;
  text: string;
  /** Panel-Id für den Spotlight-Ausschnitt — fehlt bei Schritt 1/7 (wie
   *  Prototyp `spot:null`): dort wird die GESAMTE Dock-Fläche zum
   *  Ausschnitt (s. `berechneLochRechteck()`), kein Einzelpanel. */
  spotlightPanelId?: string;
  modus: DockModus;
}

const SCHRITTE: readonly DockTourSchritt[] = [
  {
    titel: 'Ausgangslage',
    text: 'Jedes Panel hat seinen festen Platz. Der Viewport in der Mitte hat die höchste Priorität und bekommt den restlichen Raum — nichts überlappt.',
    modus: 'A',
  },
  {
    titel: 'Öffnen → Nachbarn schrumpfen',
    text: 'Die Kostenschätzung dockt links an. Sichtbare Nachbarn schrumpfen automatisch, damit Platz entsteht — niemand wird überdeckt.',
    spotlightPanelId: 'kvOffen',
    modus: 'A',
  },
  {
    titel: 'Balken selbst ziehen',
    text: 'Jede Spaltenkante ist ein Griff: Ziehen ändert die Breite live — mit Maus wie mit dem Finger. Hier wird die linke Spalte breiter.',
    spotlightPanelId: 'kvOffen',
    modus: 'A',
  },
  {
    titel: 'Anheften schützt · zu eng → Einklappen',
    text: 'Die angeheftete Kostenschätzung behält ihre Grösse. Reicht der Platz für alle offenen Panels nicht mehr, klappt das unwichtigste von selbst zu einem schmalen Tab ein — ein Klick öffnet es wieder.',
    spotlightPanelId: 'rasterOffen',
    modus: 'A',
  },
  {
    titel: 'Schwebende HUDs weichen aus',
    text: 'Wird die rechte Spalte breiter, bleibt dem Viewport weniger Raum — schwebende Werkzeug-HUDs darin ordnen sich automatisch neu an und überlappen weder sich noch die Dock-Spalten.',
    spotlightPanelId: 'kennzahlen',
    modus: 'A',
  },
  {
    titel: 'Neu andocken',
    text: 'Ein Panel am Kopf greifen und in eine andere Zone ziehen dockt es dort an. Hier wandert die Kostenschätzung von links nach rechts — der Rest ordnet sich automatisch neu.',
    spotlightPanelId: 'kvOffen',
    modus: 'A',
  },
  {
    titel: 'Kontrast · Konzept B: Raster-Kachel',
    text: 'Das zweite Konzept: alles ist gekachelt, nichts schwebt. HUD und Dock werden zu Streifen, der Viewport ist eine Kachel — öffnet ein Panel, teilen sich alle den Platz, lückenlos und nie überlappend.',
    modus: 'B',
  },
];

/** Ein Schritt ist immer eine VOLLSTÄNDIGE Ersetzung (Reset + Neuaufbau, s.
 *  Kopfkommentar) — kein Patch über den vorherigen Schritt. */
function schrittAnwenden(index: number): void {
  const schritt = SCHRITTE[index];
  if (!schritt) return;
  const dock = useDockZustand.getState();
  const ui = useUiZustand.getState();

  if (dock.modus !== schritt.modus) dock.modusSetzen(schritt.modus);
  dock.layoutZuruecksetzen(STATION);
  for (const id of GESTEUERTE_PANEL_IDS) ui.setzePanel(id, false);

  switch (index) {
    case 1:
      ui.setzePanel('kvOffen', true);
      break;
    case 2:
      ui.setzePanel('kvOffen', true);
      dock.leftWSetzen(STATION, 320);
      break;
    case 3:
      for (const id of GESTEUERTE_PANEL_IDS) ui.setzePanel(id, true);
      dock.panelOverrideSetzen(STATION, 'kvOffen', { angeheftet: true, groesse: 400 });
      break;
    case 4:
      dock.rightWSetzen(STATION, 460);
      break;
    case 5:
      ui.setzePanel('kvOffen', true);
      dock.panelOverrideSetzen(STATION, 'kvOffen', { dock: 'right' });
      break;
    case 6:
      // Konzept B braucht mindestens EIN offenes Panel, um den Kontrast
      // («alles gekachelt, nichts schwebt») überhaupt sichtbar zu machen.
      ui.setzePanel('kvOffen', true);
      break;
    default:
      break; // Schritt 0 (Ausgangslage) braucht nur den Reset oben.
  }
}

interface LochRechteck {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Übersetzt ein Panel-Kopf-Rechteck aus `dock-orb-runtime.ts`s `rects`
 *  (Container-relative Koordinaten, dieselbe Welt wie `DockPanel.tsx`s
 *  Rechtecke) in VIEWPORT-Koordinaten für die `position:fixed`-Spotlight-
 *  Maske: `[data-testid="dock-flaeche"]` ist `position:absolute;inset:0` in
 *  ihrem Eltern-Container (`dock-flaeche.css`) — ihr eigenes
 *  `getBoundingClientRect()` liefert darum denselben Ursprung, den
 *  `DockFlaeche.tsx`s eigene Feld-Messung verwendet. Fehlt `spotlightPanelId`
 *  (Schritt 1/7), wird die GESAMTE Dock-Fläche zum Ausschnitt. */
function berechneLochRechteck(
  spotlightPanelId: string | undefined,
  rects: Record<string, DockKopfRechteck>,
): LochRechteck | null {
  const flaeche = document.querySelector('[data-testid="dock-flaeche"]');
  if (!flaeche) return null;
  const basis = flaeche.getBoundingClientRect();
  if (basis.width <= 0 || basis.height <= 0) return null;
  if (!spotlightPanelId) {
    return { x: basis.left, y: basis.top, w: basis.width, h: basis.height };
  }
  const r = rects[spotlightPanelId];
  if (!r) return null;
  return { x: basis.left + r.x, y: basis.top + r.y, w: r.w, h: r.h };
}

/** Fensterbreite, ab der die Schritt-Karte als volle Bottom-Sheet-Leiste
 *  statt der schwebenden Karte + Spotlight rendert (G2, Auftrag: «Portrait/
 *  schmale Fenster», Handy-Hochformat). */
const SCHMAL_SCHWELLE_PX = 700;

interface DockTourSchnappschuss {
  modus: DockModus;
  layouts: Record<string, DockStationLayout>;
  panels: Record<PanelId, boolean>;
}

export function DockTour() {
  const offen = useDockTourZustand((s) => s.offen);
  const beenden = useDockTourZustand((s) => s.beenden);
  const rects = useDockOrbRuntime((s) => s.rects);
  const [schritt, setSchritt] = useState(0);
  const [schmal, setSchmal] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < SCHMAL_SCHWELLE_PX : false));
  const schnappschussRef = useRef<DockTourSchnappschuss | null>(null);

  // G2 — Fensterbreite live beobachten, solange die Tour offen ist.
  useEffect(() => {
    if (!offen) return;
    const aufResize = () => setSchmal(window.innerWidth < SCHMAL_SCHWELLE_PX);
    aufResize();
    window.addEventListener('resize', aufResize);
    return () => window.removeEventListener('resize', aufResize);
  }, [offen]);

  // Übergang zu → offen: Ist-Zustand sichern + Schritt 1 anwenden (Prototyp
  // `startTour()`). Nur in der Design-Station sinnvoll (Auftrag: «Tour nur
  // in der Design-Station startbar») — ein Sicherheitsnetz, falls doch
  // einmal von woanders gestartet würde (die Aufrufer prüfen das selbst
  // schon vorher, s. `Einstellungen.tsx`).
  useEffect(() => {
    if (!offen) return;
    if (useAktiveDockStation.getState().station !== STATION) {
      beenden();
      return;
    }
    const dockState = useDockZustand.getState();
    const uiState = useUiZustand.getState();
    const panelSnapshot = {} as Record<PanelId, boolean>;
    for (const id of GESTEUERTE_PANEL_IDS) panelSnapshot[id] = uiState[id];
    schnappschussRef.current = {
      modus: dockState.modus,
      layouts: JSON.parse(JSON.stringify(dockState.layouts)) as Record<string, DockStationLayout>,
      panels: panelSnapshot,
    };
    setSchritt(0);
    schrittAnwenden(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offen]);

  if (!offen) return null;

  const aktuell = SCHRITTE[schritt]!;
  const istErsterSchritt = schritt === 0;
  const istLetzterSchritt = schritt === SCHRITTE.length - 1;

  const weiter = () => {
    if (istLetzterSchritt) return;
    const naechster = schritt + 1;
    setSchritt(naechster);
    schrittAnwenden(naechster);
  };
  const zurueck = () => {
    if (istErsterSchritt) return;
    const vorheriger = schritt - 1;
    setSchritt(vorheriger);
    schrittAnwenden(vorheriger);
  };
  /** «Beenden» (Prototyp `exitTour()`): schreibt den beim Start gesicherten
   *  Zustand EXAKT zurück, dann erst schliesst sich die Tour. */
  const wiederherstellenUndSchliessen = () => {
    const snap = schnappschussRef.current;
    if (snap) {
      useDockZustand.getState().zustandWiederherstellen(snap.modus, snap.layouts);
      const ui = useUiZustand.getState();
      for (const id of GESTEUERTE_PANEL_IDS) ui.setzePanel(id, snap.panels[id]);
    }
    schnappschussRef.current = null;
    beenden();
  };

  const loch = schmal ? null : berechneLochRechteck(aktuell.spotlightPanelId, rects);

  return (
    <div className="k-dock-tour" data-testid="dock-tour">
      {loch && (
        <div className="k-dock-tour-spotlight" data-testid="dock-tour-spotlight" aria-hidden="true">
          <div className="k-dock-tour-maske" style={{ top: 0, left: 0, right: 0, height: Math.max(0, loch.y) }} />
          <div className="k-dock-tour-maske" style={{ top: loch.y + loch.h, left: 0, right: 0, bottom: 0 }} />
          <div className="k-dock-tour-maske" style={{ top: loch.y, left: 0, width: Math.max(0, loch.x), height: loch.h }} />
          <div className="k-dock-tour-maske" style={{ top: loch.y, left: loch.x + loch.w, right: 0, height: loch.h }} />
          <div className="k-dock-tour-ring" style={{ left: loch.x, top: loch.y, width: loch.w, height: loch.h }} />
        </div>
      )}
      <div className={`k-dock-tour-karte${schmal ? ' k-dock-tour-karte--sheet' : ''}`}>
        <Panel
          data-testid="dock-tour-schritt"
          data-schritt-index={schritt}
          style={{
            display: 'grid',
            gap: 10,
            border: '1px solid var(--k-accent)',
            boxShadow: '0 6px 24px color-mix(in srgb, var(--k-ink) 18%, transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge hue="var(--k-accent)">
              Werkzeug-Dock · {schritt + 1}/{SCHRITTE.length}
            </Badge>
          </div>
          <div
            style={{
              fontFamily: 'var(--k-font-mono)',
              fontSize: 12,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--k-ink)',
            }}
          >
            {aktuell.titel}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--k-ink-soft)' }}>{aktuell.text}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
            <KButton size="sm" tone="ghost" data-testid="dock-tour-zurueck" disabled={istErsterSchritt} onClick={zurueck}>
              Zurück
            </KButton>
            <KButton size="sm" tone="accent" data-testid="dock-tour-weiter" disabled={istLetzterSchritt} onClick={weiter}>
              Weiter
            </KButton>
            <div style={{ flex: 1 }} />
            <KButton size="sm" tone="ghost" data-testid="dock-tour-beenden" onClick={wiederherstellenUndSchliessen}>
              Beenden
            </KButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}
