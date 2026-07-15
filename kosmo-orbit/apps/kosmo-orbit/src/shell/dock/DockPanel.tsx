import { useRef, type ReactNode } from 'react';
import { KIcon } from '@kosmo/ui';
import { DOCK_KONSTANTEN, type DockModus, type DockRect, type PanelDef } from '../../state/dock-kern';
import type { DockStation } from '../../state/dock-stationen';
import { useDockZustand } from '../../state/dock-zustand';
import { useDockOrbRuntime } from '../../state/dock-orb-runtime';

/** v0.7.9 (A3, Teil A — Tabs als Drag-Handles, ROADMAP-359-Restpunkt) —
 *  Bewegungs-Schwellwert für den eingeklappten Tab als Ziehgriff: ein
 *  Pointerdown DARAUF muss weiterhin einen reinen Klick (Öffnen) erlauben,
 *  erst eine Bewegung >= 5px startet den Redock-Drag (Geist + Zonen,
 *  identisch zum vollen Kopf-Griff). 5px hält Antipp-Jitter sicher unter der
 *  Schwelle (Maus-/Finger-Zittern beim Loslassen eines Klicks bewegt sich
 *  erfahrungsgemäss um 1-2px), ist aber klein genug, dass eine echte
 *  Zieh-Absicht sofort erkannt wird — keine spürbare Verzögerung. */
const TAB_DRAG_SCHWELLE = 5;

/**
 * DockPanel (v0.7.8 Welle 1 / Paket P3 — «Intelligente Werkzeugtabs»,
 * Herzstück; erweitert Welle 2 / Paket P4 — Header-Drag & Pop-out) — der
 * Chrome-Rahmen EINES angedockten (oder schwebenden) Panels: absolut
 * positionierter Container (Rechteck aus `dock-kern.ts`s `solve()`,
 * `.28s`-Reflow-Übergang aus `dock-flaeche.css`), ein schmaler Mono-Kopf
 * (Titel/Rollenpunkt/Einklappen/Anheften/Pop-out/Re-Dock/Schliessen) und ein
 * intern scrollender Inhaltsbereich für die unverändert migrierten
 * Panel-Inhalte.
 *
 * Doppel-Chrome ist HIER bewusst in Kauf genommen (Auftrag, Abschnitt 2):
 * fast jedes migrierte Panel trägt selbst schon eine Badge-/Schliessen-Zeile,
 * deren `aria-label="Schliessen"` bestehende Specs direkt anklicken
 * (`'[data-testid="raster-panel"] [aria-label="Schliessen"]'` u.ä.) — die
 * darf NICHT verschwinden. Dieser Kopf hier ist additiv, kein Ersatz.
 *
 * **Header-Drag (P4)**: der Kopf (`.k-dock-panel-kopf`, `data-drag`) ist ein
 * Ziehgriff — Pointerdown darauf startet (falls `def.bewegbar`, Ziel kein
 * `<button>`) je nach aktuellem Zustand `onRedockDragStart` (angedockt →
 * Redock-Drag mit Snap-Zonen, `DockFlaeche.tsx`) oder `onFloatDragStart`
 * (schon schwebend → freies Verschieben). Der Kopf selbst trägt NUR den
 * `pointerdown`; `pointermove`/`pointerup` laufen komplett in `DockFlaeche.tsx`
 * über `window`-Listener (nicht hier — beim Redock-Drag verschwindet DIESES
 * Panel während der Ziehgeste aus `ergebnis.rects` (`gedraggtId`), ein
 * `pointermove`-Handler auf einem Element, das gerade unmountet, wäre
 * unzuverlässig).
 */

export interface DockPanelProps {
  station: DockStation;
  def: PanelDef;
  rect: DockRect;
  modus: DockModus;
  /** Persistierte «Anheften»-Fahne (dock-zustand.ts, PanelOverride.angeheftet). */
  angeheftet: boolean;
  /** Startet einen Redock-Drag (angedocktes Panel → Snap-Zonen). */
  onRedockDragStart: (id: string, rect: DockRect, clientX: number, clientY: number) => void;
  /** Startet ein freies Verschieben (schon schwebendes Panel). */
  onFloatDragStart: (id: string, rect: DockRect, clientX: number, clientY: number, anker: PanelDef['anker']) => void;
  /** Pop-out-Knopf (nur Konzept A, nur angedockt): sofortiges Umschalten auf schwebend. */
  onPopOut: (id: string, rect: DockRect) => void;
  /** Re-Dock-Knopf (nur schwebend): löscht ALLE Float-Overrides, zurück in die Ursprungsspalte. */
  onRedock: (id: string) => void;
  /** Fehlt bei datengetriebenen Panels ohne eigenes Auf/Zu-Flag
   *  (`unternehmerplan`/`kennzahlen`/`inspector` — Sichtbarkeit =
   *  Datenvorhandensein, s. `dock-stationen.ts` Kopfkommentar). Ohne
   *  Callback bleibt der Schliessen-Knopf im Dock-Kopf weg, auch wenn
   *  `def.schliessbar` true ist — das Panel lässt sich trotzdem einklappen
   *  (Chevron) oder anheften. */
  onSchliessen?: () => void;
  children: ReactNode;
}

const ROLLEN_LABEL: Record<PanelDef['rolle'], string> = {
  manuell: 'Manuell',
  pn: 'Planer-Assistent',
  pna: 'Planer-Assistent (autonom)',
  agent: 'Agent',
  memory: 'Gedächtnis',
  generator: 'Generator',
  ak: 'Aussenkontakt',
  system: 'Büro',
};

export function DockPanel({
  station,
  def,
  rect,
  modus,
  angeheftet,
  onRedockDragStart,
  onFloatDragStart,
  onPopOut,
  onRedock,
  onSchliessen,
  children,
}: DockPanelProps) {
  const panelOverrideSetzen = useDockZustand((s) => s.panelOverrideSetzen);

  // v0.7.8 Welle 3 (P7, «Kosmo ordnet») — die «KOSMO»-Kopf-Badge: sichtbar
  // NUR solange `useDockOrbRuntime`s Steuerungs-Anzeige läuft UND genau
  // DIESES Panel das zuletzt von Kosmo bediente ist (`badgePanelId`,
  // `dock-befehle.ts`s `meldeAktion()`). Additive Test-ID, kein Ersatz für
  // den goldenen Orb (`KosmoOrdnetOrb.tsx`) — Orb UND Badge zusammen zeigen,
  // WOHIN Kosmo gerade greift.
  const kosmoBadgeSichtbar = useDockOrbRuntime((s) => s.laeuft && s.badgePanelId === def.id);

  const einklappenUmschalten = () => panelOverrideSetzen(station, def.id, { eingeklappt: !rect.eingeklappt });
  const anheftenUmschalten = () => panelOverrideSetzen(station, def.id, { angeheftet: !angeheftet });

  /**
   * v0.7.9 (A3, Teil A) — der eingeklappte Tab ist NEBEN dem Öffnen-Klick
   * jetzt auch ein Redock-Ziehgriff, genau wie der volle Kopf
   * (`kopfPointerDown` unten, `onRedockDragStart`). Anders als der Kopf kennt
   * der Tab NUR diesen einen Zweig: `dock-kern.ts`s `placeFloats()` setzt bei
   * JEDEM Float-Rechteck `eingeklappt` hart auf `false` (verifiziert,
   * Kopfkommentar dort) — «eingeklappte Floats» existieren im Modell schlicht
   * nicht, ein eingeklappter Tab ist darum NIE `rect.schwebend`, und
   * `onFloatDragStart` wäre hier toter Code.
   *
   * Drop-Semantik (Owner-Entscheid, s. Auftrag):
   *  - Zone LINKS/RECHTS (Spaltenwechsel): der Tab BLEIBT eingeklappt
   *    («least surprise» — in eine andere Spalte gezogen bleibt er ein Tab
   *    dort, er poppt nicht überraschend zum vollen Panel auf). Umgesetzt in
   *    `DockFlaeche.tsx`s `redockStart`/`loslassen`: das Override trägt
   *    `eingeklappt:true` weiter, wenn das gezogene Panel beim Drag-Start
   *    bereits eingeklappt war (`RedockDatensatz.warEingeklappt`).
   *  - Zone SCHWEBEND (nur Modus A): der Tab öffnet als Float — einen
   *    eingeklappten Float-Zustand, in dem er "bleiben" könnte, gibt es ja
   *    nicht (s.o.), Aufklappen ist hier die einzig sinnvolle Semantik.
   */
  const tabZugRef = useRef<{ x: number; y: number; hatGezogen: boolean } | null>(null);

  const tabPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!def.bewegbar || e.button !== 0) return;
    const start = { x: e.clientX, y: e.clientY, hatGezogen: false };
    tabZugRef.current = start;
    const bewege = (ev: PointerEvent) => {
      if (start.hatGezogen) return;
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (Math.hypot(dx, dy) < TAB_DRAG_SCHWELLE) return;
      start.hatGezogen = true;
      abmelden();
      onRedockDragStart(def.id, rect, ev.clientX, ev.clientY);
    };
    const loslassen = () => abmelden();
    const abmelden = () => {
      window.removeEventListener('pointermove', bewege);
      window.removeEventListener('pointerup', loslassen);
      window.removeEventListener('pointercancel', loslassen);
    };
    window.addEventListener('pointermove', bewege);
    window.addEventListener('pointerup', loslassen);
    window.addEventListener('pointercancel', loslassen);
  };

  const tabKlick = () => {
    // Die 5px-Schwelle wurde bereits beim Pointerdown/-move überschritten —
    // ein Redock-Drag läuft (oder ist gerade zu Ende gegangen). Der
    // nachfolgende Klick (falls der Browser ihn überhaupt noch feuert, s.
    // Kopfkommentar `TAB_DRAG_SCHWELLE`) darf NICHT zusätzlich öffnen.
    const gezogen = tabZugRef.current?.hatGezogen;
    tabZugRef.current = null;
    if (gezogen) return;
    einklappenUmschalten();
  };

  const kopfPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!def.bewegbar) return;
    // WICHTIG: `instanceof HTMLElement` wäre hier ein Bug — die Kopf-Knöpfe
    // rendern `KIcon`s `<svg>`/`<path>` (SVGElement, KEIN HTMLElement-
    // Subtyp trotz gemeinsamer `Element`-Basis). Klickt man (wie Playwright
    // per Bounding-Box-Mitte) genau aufs Icon-Glyph statt den umgebenden
    // `<button>`-Rand, wäre `e.target instanceof HTMLElement` false und
    // dieser Guard würde NIE greifen — ein Knopfklick löste dann fälschlich
    // einen Drag aus (reproduzierbar: Chevron/Pin/Tab-Tests scheiterten
    // genau daran). `.closest()` existiert auf `Element` selbst, HTML- wie
    // SVG-Knoten gleichermassen.
    if (e.target instanceof Element && e.target.closest('button')) return;
    // Nur der Primärzeiger/-finger startet einen Drag (kein Rechtsklick).
    if (e.button !== 0) return;
    e.preventDefault();
    if (rect.schwebend) {
      onFloatDragStart(def.id, rect, e.clientX, e.clientY, def.anker);
    } else {
      onRedockDragStart(def.id, rect, e.clientX, e.clientY);
    }
  };

  const style = {
    left: rect.x,
    top: rect.y,
    width: rect.w,
    height: rect.h,
    // v0.7.9 (A1, Bugfix am P3-Bestand): der SOLVER-z-Wert statt des
    // früheren hartkodierten `rect.schwebend ? 30 : 14`. Der 1:1-Port
    // (`dock-kern.ts`) unterscheidet seit P1 drei Stufen — Stack/Rail 14,
    // B-Streifen 16, verankerte Floats 30, FREI positionierte Floats
    // (fx/fy, also vom Menschen gezogene/geploppte Panels) 32 — der
    // hartkodierte Wert plättete 32→30 und liess ein frei abgelegtes Panel
    // HINTER den später gerenderten HUD-Chrome-Floats verschwinden (real ab
    // A1 sichtbar: kv-Float hinter der Eigenschaften-Säule, Kopf nicht mehr
    // greifbar). Mit `rect.z` gewinnt das vom Menschen platzierte Panel —
    // wie im Prototyp.
    zIndex: rect.z,
    // v0.8.0B / W3 (Spez §4, B-54) — die EINZIGE flächige Rollenkennung
    // (`border-top: 2px solid var(--rolle)`, `dock-flaeche.css`) liest diese
    // CSS-Var; additiv, keine bestehende Style-Angabe verändert.
    '--rolle': `var(--k-rolle-${def.rolle})`,
  } as React.CSSProperties;

  // v0.7.8 Welle 2 / Paket P5 («HUDs als echte Dock-Floats»): eine schlanke
  // Chrome-Variante für Panels, die als kompakte Glass-Karte OHNE Dock-Kopf
  // wirken sollen (Viewport-Modus-Leiste/-Karte/-Werkzeug-Rail/
  // -Orientierungskreuz, s. `dock-stationen.ts` `floatChrome:'schlank'`) —
  // KEIN Titel/Pin/Chevron/Re-Dock/Schliessen, nur ein dünner Griffstreifen
  // oben zum Ziehen (derselbe `onFloatDragStart`/`onRedockDragStart`-
  // Umschalter wie beim vollen Kopf, s. `kopfPointerDown` oben — floatende
  // HUDs nehmen dabei IMMER den Float-Zweig, da `def.dock==='float'` schon
  // in der Registry steht, nie erst durch einen Redock-Drag entsteht). Der
  // Inhalt selbst bringt bereits sein eigenes `.k-glass`-Aussehen mit (aus
  // `ViewportChromeHuds.tsx`) — der äussere Rahmen bleibt darum bewusst
  // unsichtbar (kein zweites, doppeltes Glass), s. `.k-dock-panel--schlank`
  // in `dock-flaeche.css`. Ein eingeklapptes `schlank`-Panel gibt es nicht
  // (`placeFloats()` in `dock-kern.ts` setzt `eingeklappt` für Floats immer
  // fix auf `false` — der Solver kennt für Floats gar kein Einklappen), der
  // `rect.eingeklappt`-Zweig unten wird für sie darum nie erreicht.
  if (def.floatChrome === 'schlank') {
    return (
      <div className="k-dock-panel k-dock-panel--schlank" style={style} data-testid={`dock-panel-${def.id}`} data-schwebend={!!rect.schwebend}>
        <div
          className="k-dock-panel-griff"
          data-drag
          title={def.titel}
          aria-hidden="true"
          onPointerDown={kopfPointerDown}
        />
        <div className="k-dock-panel-inhalt-schlank">{children}</div>
      </div>
    );
  }

  // v0.7.8 Abnahme-Fix (D3, Matrix-Muss) — der goldene Ring gilt für BEIDE
  // Zustände (voller Kopf UND eingeklappter Tab), dasselbe Gate wie das
  // KOSMO-Badge (`kosmoBadgeSichtbar`, s.o.).
  const panelKlasse = `k-dock-panel${kosmoBadgeSichtbar ? ' k-dock-panel--kosmo-ring' : ''}`;

  if (rect.eingeklappt) {
    return (
      <div className={panelKlasse} style={style} data-testid={`dock-panel-${def.id}`} data-schwebend={!!rect.schwebend}>
        <button
          type="button"
          className="k-dock-panel-tab"
          data-testid={`dock-panel-${def.id}-tab`}
          data-drag
          title={`${def.titel} — wieder öffnen`}
          aria-label={`${def.titel} — wieder öffnen`}
          onPointerDown={tabPointerDown}
          onClick={tabKlick}
        >
          <span className="k-dock-panel-tab-zeile">
            <span
              className="k-dock-panel-rollenpunkt"
              aria-hidden
              style={{ background: `var(--k-rolle-${def.rolle})` }}
            />
            <span className="k-dock-panel-titel">{def.titel}</span>
            {angeheftet && (
              <span className="k-dock-panel-pin-badge" data-testid={`dock-panel-${def.id}-pin-badge`} aria-hidden="true">
                •
              </span>
            )}
            {kosmoBadgeSichtbar && (
              <span className="k-dock-kosmo-badge" data-testid={`dock-panel-${def.id}-kosmo-badge`} aria-hidden="true">
                KOSMO
              </span>
            )}
          </span>
          {/* v0.8.0B / W3 (Spez §4, B-56) — literale Hinweiszeile, additiv
              neben Titel/Badges (byte-gleich erhalten). Rein dekorativ
              (`aria-hidden`) — der Button trägt sein eigenes `aria-label`
              bereits mit demselben Sinn («… wieder öffnen»). */}
          <span className="k-dock-panel-tab-hinweis" aria-hidden="true">
            EINGEKLAPPT · TIPPEN ZUM ÖFFNEN
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={panelKlasse} style={style} data-testid={`dock-panel-${def.id}`} data-schwebend={!!rect.schwebend}>
      <div className="k-dock-panel-kopf" data-drag onPointerDown={kopfPointerDown}>
        <span
          className="k-dock-panel-rollenpunkt"
          aria-hidden
          title={ROLLEN_LABEL[def.rolle]}
          style={{ background: `var(--k-rolle-${def.rolle})` }}
        />
        <span className="k-dock-panel-titel" title={def.titel}>
          {def.titel}
        </span>
        {angeheftet && (
          <span className="k-dock-panel-pin-badge" data-testid={`dock-panel-${def.id}-pin-badge`} aria-hidden="true">
            •
          </span>
        )}
        {kosmoBadgeSichtbar && (
          <span className="k-dock-kosmo-badge" data-testid={`dock-panel-${def.id}-kosmo-badge`} aria-hidden="true">
            KOSMO
          </span>
        )}
        {modus === 'A' && def.bewegbar && !rect.schwebend && (
          <button
            type="button"
            className="k-dock-panel-knopf"
            data-testid={`dock-panel-${def.id}-popout`}
            title="Aus dem Dock heben — schwebt frei"
            aria-label="Aus dem Dock heben"
            onClick={() => onPopOut(def.id, rect)}
          >
            <KIcon name="schweben" size={14} />
          </button>
        )}
        {rect.schwebend && (
          <button
            type="button"
            className="k-dock-panel-knopf"
            data-testid={`dock-panel-${def.id}-redock`}
            title="Zurück andocken"
            aria-label="Zurück andocken"
            onClick={() => onRedock(def.id)}
          >
            <KIcon name="andocken" size={14} />
          </button>
        )}
        <button
          type="button"
          className="k-dock-panel-knopf"
          data-testid={`dock-panel-${def.id}-pin`}
          data-aktiv={angeheftet}
          title={angeheftet ? 'Anheften aufheben — Grösse wieder frei' : 'Anheften — Grösse vor automatischem Einklappen schützen'}
          aria-label={angeheftet ? 'Anheften aufheben' : 'Anheften'}
          aria-pressed={angeheftet}
          onClick={anheftenUmschalten}
        >
          <KIcon name="schloss" size={14} />
        </button>
        <button
          type="button"
          className="k-dock-panel-knopf k-dock-panel-chevron"
          data-testid={`dock-panel-${def.id}-einklappen`}
          title="Einklappen"
          aria-label="Einklappen"
          onClick={einklappenUmschalten}
        >
          <KIcon name="pfeil-unten" size={14} />
        </button>
        {def.schliessbar && onSchliessen && (
          <button
            type="button"
            className="k-dock-panel-knopf k-dock-panel-knopf--schliessen"
            data-testid={`dock-panel-${def.id}-schliessen`}
            title="Schliessen"
            aria-label="Schliessen"
            onClick={onSchliessen}
          >
            <KIcon name="schliessen" size={14} />
          </button>
        )}
      </div>
      <div className="k-dock-panel-inhalt">{children}</div>
    </div>
  );
}

/** Re-Export für Aufrufer, die nur die Konstante brauchen (Tab-Höhe u.ä.),
 *  ohne `dock-kern.ts` selbst zu importieren — vermeidet einen zweiten
 *  Import-Pfad für dieselbe Zahl in `DockFlaeche.tsx`. */
export const DOCK_TAB_HOEHE = DOCK_KONSTANTEN.COLLH;
