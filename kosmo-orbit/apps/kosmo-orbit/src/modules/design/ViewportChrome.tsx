/**
 * v0.7.6 Welle 1 Stream A — 3D-Viewport-Chrome (rein präsentational).
 *
 * Portiert das ClaudeDesign-Soll-Bild `Kosmo Viz Viewport.dc.html`
 * (Handoff-README §6.1) in den echten React-Stack. Alle Overlays nutzen
 * `.k-glass` (kosmo-ui `aura.css`, W0-Freeze) und schweben ÜBER dem echten
 * three.js-Canvas — kein Bild-Slot, keine Fake-Daten: jeder hereingereichte
 * Wert kommt aus `Viewport3D.tsx` (echte Kamera-/Projekt-/Leistungs-Werte),
 * s. Kommentar in `viewport-modi.ts`.
 *
 * **v0.7.8 Welle 2 / Paket P5 («HUDs als echte Dock-Floats»)**: vier der
 * ehemals hier fest `position:absolute` verankerten HUD-Blöcke — Modus-
 * Umschalter (Tabs), Modus-Infokarte (Badge/Titel), Werkzeug-Rail,
 * Orientierungskreuz — sind ausgezogen nach `ViewportChromeHuds.tsx` und
 * rendern jetzt als `DockPanel`-Float-Inhalte über `DesignWorkspace.tsx` /
 * `DockFlaeche` (Registry in `dock-stationen.ts`, `dock:'float'`) — echtes
 * Ziehen/Magnet/Snap-zurück aus P4, kollisionsfrei gegen die Dock-Spalten.
 *
 * **v0.7.9 A1 («Säulen ins Dock» — die letzte Überlappungs-Klasse,
 * ROADMAP 357/358)**: die zwei P5-Ausnahmen — die HUD-Statuskarte
 * (`viewport-hud`) und das Eigenschaften-Panel — sind jetzt EBENFALLS
 * `DockPanel`-Floats (`viewportHudStatuskarte`/`viewportEigenschaften`,
 * `dock-stationen.ts`, Anker `top-right` — die additive Solver-Erweiterung
 * in `dock-kern.ts`, s. dortigen `FloatAnker`-Kommentar), Inhalt/testids
 * byte-gleich nach `ViewportChromeHuds.tsx` umgezogen (`ViewportHudStatuskarteHud`/
 * `ViewportEigenschaftenHud`, lesen `viewport-chrome-runtime.ts`). Grund für
 * den Umzug: die alte `k-vp-spalte-rechts` (`position:absolute;right:16`) war
 * relativ zum `Viewport3D`-DOM-Element verankert — in der Split-Ansicht ist
 * dieses Element nur die LINKE Hälfte des vom Solver verwalteten zentralen
 * Feldes (`vp`, `dock-kern.ts`), während `viewportOrientierung` (der andere
 * Float) relativ zu GENAU DIESEM `vp` positioniert wird. Bei schmalem
 * `Viewport3D`-Element (Split + offene Dock-Spalten) überragte die 280px
 * breite, absolut positionierte Spalte ihr eigenes, zu schmales Elternfeld
 * nach LINKS — geometrisch real gemessen ~130×85px Überlapp mit der unteren
 * Ecke von `viewportOrientierung` (ROADMAP 357/358, im Code hier bis
 * v0.7.8 dokumentiert). Als Dock-Float lebt die Spalte jetzt im SELBEN
 * Koordinatensystem (`vp`) wie jeder andere Float — `separate()`
 * (`dock-kern.ts`, unverändert) hält sie automatisch von allem anderen fern,
 * genau wie die vier P5-HUDs. Fixe `fw`/`fh` (statt der alten
 * `top:16;bottom:180`-Streckung) sind ein bewusster Kompromiss wie bei den
 * P5-Floats — Werte real gemessen (1400×900, alle drei Modi, s.
 * `dock-stationen.ts`-Kommentar), das Eigenschaften-Panel behält sein
 * eigenes `overflowY:auto` als Sicherheitsnetz für seltene längere Inhalte.
 *
 * Diese Datei hier behält NUR noch die Bottom-Leiste (kontextuelle Chips +
 * Zoom + Vollbild — Teil der Statuszeile, unverändert).
 */
import { KIcon } from '@kosmo/ui';
import { VIcon } from './viewport-chrome-icons';
import { VIEWPORT_ROLLEN, aspektLabel, sonnenLabel, type ViewportModusId } from './viewport-modi';

// v0.7.9 (A1) — exportiert, weil `ViewportChromeHuds.tsx`s neue
// `ViewportEigenschaftenHud` dieselbe Zuordnung braucht (Darstellungs-Sektion
// zog dorthin um) — ein Duplikat der drei Zeilen wäre schlechter als ein
// Export.
export const DARSTELLUNG_LABEL: Record<'material' | 'weiss' | 'schwarz', string> = {
  material: 'Material',
  weiss: 'Weissmodell',
  schwarz: 'Schwarzmodell',
};

export interface ViewportChromeProps {
  /** Guard (README-Auflage «nur wenn Daten vorhanden») — erst wahr, sobald
   *  der three.js-Mount tatsächlich steht (kein leerer/kaputter Flash). */
  sichtbar: boolean;
  modus: ViewportModusId;

  /** Echte Kamera-Werte (camera-controls, Polling in Viewport3D). */
  azimutRad: number;
  polarGrad: number;
  distanzM: number;
  zoomProzentWert: number;
  brennweiteMm: number;
  aspektBreite: number;
  aspektHoehe: number;

  /** Echte Projekt-/Szene-Werte. */
  geschossLabel: string | null;
  kontextAnzahl: number;
  splatAktiv: boolean;
  texturenAn: boolean;
  sonnenDatum: Date | null;
  standortLabel: string;

  /** Echte Leistungs-/Darstellungs-Werte (leistung.ts + doc.settings). */
  leistungsStufeLabel: string;
  schattenAn: boolean;
  darstellungsModus: 'material' | 'weiss' | 'schwarz';

  /** Echter Render-Status (derselbe wie `viewport-render-status`). */
  renderStatusLabel: string;
  renderCloudLeer: boolean;

  onEinpassen: () => void;
  onRendern: () => void;
  onFuerVisAufnehmen: () => void;
  /** «−»-Knopf — Kamera dollt hinaus (mehr Übersicht, kleinerer Prozentwert). */
  onZoomKleiner: () => void;
  /** «+»-Knopf — Kamera dollt hinein (näher, grösserer Prozentwert). */
  onZoomGroesser: () => void;
  onVollbild: () => void;
  vollbildAktiv: boolean;
  onTexturToggle: () => void;

  /** Sketch3D-Banner belegen dieselbe Bottom-Mitte-Zone — kein Doppel. */
  versteckeBottomLeiste: boolean;
}

export function ViewportChrome(props: ViewportChromeProps) {
  if (!props.sichtbar) return null;
  const rolle = VIEWPORT_ROLLEN[props.modus];

  return (
    <>
      <style>{CHROME_STYLE}</style>

      <div className="k-vp-chrome-root">
      {/* v0.7.8 Welle 2 / Paket P5: die frühere linke Modus-Spalte (Tabs +
          Badge-Karte + Werkzeug-Rail) ist ausgezogen — die drei Blöcke
          rendern jetzt einzeln als `DockPanel`-Floats über
          `ViewportChromeHuds.tsx`/`DesignWorkspace.tsx` (s. Datei-
          Kopfkommentar). Hier bleibt nichts mehr an ihrer Stelle.

          v0.7.9 A1: dasselbe gilt jetzt für die vorher hier fest verankerte
          rechte Spalte (HUD-Statuskarte + Eigenschaften) — s. Datei-
          Kopfkommentar für die Überlapp-Historie (ROADMAP 357/358) und den
          Umzugsgrund. `ViewportOrientierungHud` (Achsenkreuz) war schon seit
          P5 ein Float, unverändert. */}

      {/* BOTTOM: kontextuelle Chips + Zoom (unten mittig) */}
      {!props.versteckeBottomLeiste && (
        <div style={{ position: 'absolute', left: '50%', bottom: 56, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, zIndex: 6 }}>
          <div className="k-glass" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 6, borderRadius: 'var(--k-radius-pill)' }}>
            {bottomChips(props).map((c) => (
              <span key={c.k} className="k-vp-chip" style={{ color: rolle.farbe, background: rolle.fill, borderColor: rolle.linie }}>
                <VIcon name={c.icon} size={14} />
                {c.label}
              </span>
            ))}
          </div>
          <div className="k-glass" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--k-radius-pill)' }}>
            <button type="button" className="k-vp-zoom-btn k-druck" onClick={props.onZoomKleiner} title="Verkleinern" data-testid="viewport-zoom-minus">
              <KIcon name="minus" size={14} />
            </button>
            <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 11, color: 'var(--k-ink-soft)', minWidth: 34, textAlign: 'center' }} data-testid="viewport-zoom-prozent">
              {props.zoomProzentWert}%
            </span>
            <button type="button" className="k-vp-zoom-btn k-druck" onClick={props.onZoomGroesser} title="Vergrössern" data-testid="viewport-zoom-plus">
              <KIcon name="plus" size={14} />
            </button>
            <span style={{ width: 1, height: 16, background: 'var(--k-glass-stroke)' }} />
            <button
              type="button"
              className="k-vp-zoom-btn k-druck"
              onClick={props.onVollbild}
              title={props.vollbildAktiv ? 'Vollbild verlassen' : 'Vollbild'}
              data-testid="viewport-vollbild"
            >
              <VIcon name="vollbild" size={14} />
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

function bottomChips(props: ViewportChromeProps): { k: string; icon: import('./viewport-chrome-icons').VIconName; label: string }[] {
  if (props.modus === 'modellieren') {
    return [
      { k: 'raster', icon: 'volumen', label: 'Raster 1 m' },
      { k: 'textur', icon: 'blende', label: props.texturenAn ? 'Texturen an' : 'Texturen aus' },
      { k: 'kontext', icon: 'begehung', label: `Kontext ${props.kontextAnzahl}` },
    ];
  }
  if (props.modus === 'kamera') {
    return [
      { k: 'format', icon: 'ausschnitt', label: aspektLabel(props.aspektBreite, props.aspektHoehe) },
      { k: 'brennweite', icon: 'blende', label: `${props.brennweiteMm} mm` },
      { k: 'ziel', icon: 'senden', label: 'Visualisierung' },
    ];
  }
  return [
    { k: 'sonne', icon: 'sonne', label: sonnenLabel(props.sonnenDatum) },
    { k: 'splat', icon: 'begehung', label: props.splatAktiv ? 'Splat an' : 'Splat aus' },
    { k: 'kontext', icon: 'schnitt', label: `Kontext ${props.kontextAnzahl}` },
  ];
}

/**
 * Scoped Styles (analog zu `ViewportKontextmenue.tsx`, W3-Phantom-Token-Fix-
 * Muster): nur echte `--k-*`-Tokens, Hover via CSS statt JS. `aura.css`
 * bleibt unangetastet — dieser Block lebt in der App.
 */
const CHROME_STYLE = `
  /* v0.7.6-Integrationsfix: die Chrome-Schale liegt als Overlay über der
     three.js-Bühne UND über der bestehenden DesignWorkspace-Möblierung
     (Geschossleiste top-left, EntwurfsDock left-mitte). Standard-HUD-Muster:
     der Overlay-Layer ist pointer-transparent, nur echte Bedienelemente
     fangen Klicks — so gehen Zeichnen/Kamera auf dem Canvas UND Klicks auf
     darunterliegende Design-Knöpfe (z. B. Geschoss stapeln) wieder durch. */
  .k-vp-chrome-root {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .k-vp-chrome-root button,
  .k-vp-chrome-root input,
  .k-vp-chrome-root select,
  .k-vp-chrome-root textarea,
  .k-vp-chrome-root a,
  .k-vp-chrome-root [role='button'],
  .k-vp-chrome-root .k-vp-interaktiv { pointer-events: auto; }
  /* v0.7.9 A1: .k-vp-spalte-rechts (die frühere fixe rechte Säule,
     position:absolute/right:16) entfällt — HUD-Statuskarte + Eigenschaften
     sind jetzt DockPanel-Floats (ViewportChromeHuds.tsx, eigene
     Kopfkommentare dort), ihre Positionierung übernimmt der Dock-Solver. */
  .k-vp-rail {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 8px;
  }
  .k-vp-tool {
    all: unset;
    box-sizing: border-box;
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: var(--k-radius-sm);
    cursor: pointer;
  }
  .k-vp-tool:hover { background: var(--k-glass-stroke); }
  .k-vp-tab {
    all: unset;
    box-sizing: border-box;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 34px;
    border-radius: var(--k-radius-sm);
    cursor: pointer;
    font-family: var(--k-font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .k-vp-puls {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    animation: k-vp-puls-anim 2.2s ease-in-out infinite;
  }
  @keyframes k-vp-puls-anim { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
  .k-vp-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid transparent;
    font-family: var(--k-font-mono);
    font-size: 11px;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }
  .k-vp-zoom-btn {
    all: unset;
    box-sizing: border-box;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    color: var(--k-ink-soft);
    cursor: pointer;
  }
  .k-vp-zoom-btn:hover { color: var(--k-ink); }
  .k-vp-toggle-row {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 2px;
    font-size: 13px;
    color: var(--k-ink-soft);
    cursor: pointer;
    font-family: var(--k-font-mono);
    letter-spacing: 0.05em;
  }
`;
