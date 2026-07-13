/**
 * v0.7.6 Welle 1 Stream A — 3D-Viewport-Chrome (rein präsentational).
 *
 * Portiert das ClaudeDesign-Soll-Bild `Kosmo Viz Viewport.dc.html`
 * (Handoff-README §6.1) in den echten React-Stack: Modus-Schalter+Badge
 * (oben links), HUD (oben rechts, gestapelt über dem Eigenschaften-Panel),
 * Achsenkreuz (unten links), kontextuelle Bottom-Leiste + Zoom (unten
 * mittig). Alle Overlays nutzen `.k-glass` (kosmo-ui `aura.css`, W0-Freeze)
 * und schweben ÜBER dem echten three.js-Canvas — kein Bild-Slot, keine
 * Fake-Daten: jeder hereingereichte Wert kommt aus `Viewport3D.tsx` (echte
 * Kamera-/Projekt-/Leistungs-Werte), s. Kommentar in `viewport-modi.ts`.
 *
 * Layout-Hinweis (Koexistenz mit bestehender Chrome, die NICHT verschoben
 * wird — `NavLeiste`/Render-Knopf-Spalte bleiben bei `right:88`, die
 * DesignWorkspace-Statusleiste bei `left:12…right:88,bottom:12`, beides
 * ausserhalb dieser Datei/dieses Streams): die Eigenschaften-Spalte endet
 * bei `bottom:180` (Luft über der Render-Spalte im Ruhezustand), Achsenkreuz
 * + Bottom-Leiste sitzen bei `bottom:56` (Luft über der Statusleiste). Bei
 * einem sehr hohen Render-Ergebnis-Panel (Bild sichtbar) ist ein knapper
 * Überlapp möglich — bewusst in Kauf genommen (transienter Zustand, s.
 * Abschlussbericht «vertagt»), statt die fremde Statusleiste/NavLeiste-
 * Position anzufassen.
 */
import { Badge, KButton, KIcon } from '@kosmo/ui';
import { AchsenGizmo, VIcon } from './viewport-chrome-icons';
import {
  VIEWPORT_MODUS_REIHENFOLGE,
  VIEWPORT_MODUS_TEXT,
  VIEWPORT_ROLLEN,
  VIEWPORT_WERKZEUGE,
  aspektLabel,
  kompassLabel,
  sonnenLabel,
  type ViewportModusId,
} from './viewport-modi';

const DARSTELLUNG_LABEL: Record<'material' | 'weiss' | 'schwarz', string> = {
  material: 'Material',
  weiss: 'Weissmodell',
  schwarz: 'Schwarzmodell',
};

interface HudZeile {
  k: string;
  v: string;
}

interface PanelSektion {
  label: string;
  zeilen: HudZeile[];
}

export interface ViewportChromeProps {
  /** Guard (README-Auflage «nur wenn Daten vorhanden») — erst wahr, sobald
   *  der three.js-Mount tatsächlich steht (kein leerer/kaputter Flash). */
  sichtbar: boolean;
  modus: ViewportModusId;
  onModusWechsel: (m: ViewportModusId) => void;
  aktivesWerkzeug: string;
  onWerkzeugWechsel: (id: string) => void;

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
  const text = VIEWPORT_MODUS_TEXT[props.modus];
  const werkzeuge = VIEWPORT_WERKZEUGE[props.modus];
  const orientierung = kompassLabel(props.azimutRad);
  const aspekt = aspektLabel(props.aspektBreite, props.aspektHoehe);

  const hud: HudZeile[] =
    props.modus === 'modellieren'
      ? [
          { k: 'ANSICHT', v: 'Perspektive' },
          { k: 'RASTER', v: '1 m / 10 m' },
          { k: 'GESCHOSS', v: props.geschossLabel ?? '—' },
          { k: 'KONTEXT', v: `${props.kontextAnzahl} Mesh${props.kontextAnzahl === 1 ? '' : 'e'}` },
        ]
      : props.modus === 'kamera'
        ? [
            { k: 'BRENNWEITE', v: `${props.brennweiteMm} mm (35 mm-äquiv.)` },
            { k: 'FORMAT', v: aspekt },
            { k: 'ZIEL-NODE', v: 'Visualisierung' },
            { k: 'RENDER', v: props.renderStatusLabel },
          ]
        : [
            { k: 'ANSICHT', v: 'Perspektive' },
            { k: 'KONTEXT', v: `${props.kontextAnzahl} Mesh${props.kontextAnzahl === 1 ? '' : 'e'}` },
            { k: 'SPLAT', v: props.splatAktiv ? 'aktiv' : 'aus' },
            { k: 'SONNE', v: sonnenLabel(props.sonnenDatum) },
          ];

  const darstellungSektion: PanelSektion = {
    label: 'Darstellung',
    zeilen: [
      { k: 'MODUS', v: DARSTELLUNG_LABEL[props.darstellungsModus] },
      { k: 'QUALITÄT', v: props.leistungsStufeLabel },
      { k: 'SCHATTEN', v: props.schattenAn ? 'an' : 'aus' },
    ],
  };

  const panel: PanelSektion[] =
    props.modus === 'modellieren'
      ? [
          {
            label: 'Kamera',
            zeilen: [
              { k: 'AZIMUT', v: `${Math.round(((-props.azimutRad * 180) / Math.PI + 360) % 360)}°` },
              { k: 'NEIGUNG', v: `${Math.round(props.polarGrad)}°` },
              { k: 'DISTANZ', v: `${props.distanzM.toFixed(1)} m` },
            ],
          },
          {
            label: 'Szene',
            zeilen: [
              { k: 'GESCHOSS', v: props.geschossLabel ?? '—' },
              { k: 'KONTEXT', v: `${props.kontextAnzahl}` },
              { k: 'TEXTUREN', v: props.texturenAn ? 'an' : 'aus' },
            ],
          },
          darstellungSektion,
        ]
      : props.modus === 'kamera'
        ? [
            {
              label: 'Objektiv',
              zeilen: [
                { k: 'BRENNWEITE', v: `${props.brennweiteMm} mm` },
                { k: 'FORMAT', v: aspekt },
              ],
            },
            {
              label: 'Render',
              zeilen: [
                { k: 'STATUS', v: props.renderStatusLabel },
                { k: 'CLOUD', v: props.renderCloudLeer ? 'nicht verbunden' : 'verbunden' },
                { k: 'ZIEL-NODE', v: 'Visualisierung' },
              ],
            },
            darstellungSektion,
          ]
        : [
            {
              label: 'Kontext',
              zeilen: [
                { k: 'KONTEXT-MESHES', v: `${props.kontextAnzahl}` },
                { k: 'SPLAT', v: props.splatAktiv ? 'aktiv' : 'aus' },
              ],
            },
            {
              label: 'Sonnenstand',
              zeilen: [
                { k: 'DATUM', v: sonnenLabel(props.sonnenDatum) },
                { k: 'STANDORT', v: props.standortLabel },
              ],
            },
            darstellungSektion,
          ];

  const aktion =
    props.modus === 'modellieren' ? props.onEinpassen : props.modus === 'kamera' ? props.onRendern : props.onFuerVisAufnehmen;

  return (
    <>
      <style>{CHROME_STYLE}</style>

      {/* MODUS-SCHALTER + BADGE + TOOL-RAIL (linke Spalte, kompakt/oben
          gestapelt — Höhe folgt dem Inhalt statt die Spalte bis unten zu
          füllen). WICHTIG: `EntwurfsDock` (DesignWorkspace.tsx, `.orbit065-
          dock`) sitzt vertikal MITTIG an derselben linken Kante (`left:12`,
          `top:50%`); eine volle Spalte hätte dessen Klicks abgefangen
          (real in E2E beobachtet: «Rotieren» blockierte `entwurf-
          skizzieren»). Darum bleibt diese Spalte bewusst auf ihre
          tatsächliche Inhaltshöhe begrenzt (kein `bottom`/`flex:1`) und
          endet weit oberhalb der Bild-Mitte. */}
      <div className="k-vp-chrome-spalte" style={{ top: 16, left: 16, width: 280 }}>
        <div className="k-glass" style={{ display: 'flex', gap: 4, padding: 4, flex: 'none' }}>
          {VIEWPORT_MODUS_REIHENFOLGE.map((m) => {
            const aktiv = m === props.modus;
            const r = VIEWPORT_ROLLEN[m];
            const t = VIEWPORT_MODUS_TEXT[m];
            return (
              <button
                key={m}
                type="button"
                className="k-vp-tab k-druck"
                data-testid={`viewport-modus-${m}`}
                onClick={() => props.onModusWechsel(m)}
                style={{
                  background: aktiv ? r.fill : 'transparent',
                  border: `1px solid ${aktiv ? r.linie : 'transparent'}`,
                  color: aktiv ? r.farbe : 'var(--k-ink-soft)',
                }}
              >
                <VIcon name={t.tabIcon} size={14} />
                {t.tabLabel}
              </button>
            );
          })}
        </div>
        <div className="k-glass" style={{ padding: '14px 16px', flex: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <span className="k-vp-puls" style={{ background: rolle.farbe }} />
            <span
              style={{
                fontFamily: 'var(--k-font-mono)',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.16em',
                color: rolle.farbe,
              }}
              data-testid="viewport-modus-badge"
            >
              {text.badge}
            </span>
            <div style={{ flex: 1 }} />
            <Badge hue={rolle.farbe}>{text.tagLabel}</Badge>
          </div>
          <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.15, color: 'var(--k-ink)' }}>{text.titel}</div>
          <div style={{ fontSize: 13, color: 'var(--k-ink-soft)', marginTop: 3 }}>{text.sub}</div>
        </div>

        {/* TOOL-RAIL — kompakte horizontale Zeile (Werkzeuge des aktiven
            Modus; Chrome-Highlight, s. Datei-Kommentar oben zu «bewusst
            vertagt: keine echte Transform-Wirkung»). Bewusst KEINE volle
            vertikale Spalte, s. Kommentar am Container oben. */}
        <div className="k-glass k-vp-rail" style={{ flex: 'none' }}>
          {werkzeuge.map((w) => {
            const aktiv = w.id === props.aktivesWerkzeug;
            return (
              <button
                key={w.id}
                type="button"
                className="k-vp-tool k-druck"
                title={w.label}
                aria-label={w.label}
                aria-pressed={aktiv}
                data-testid={`viewport-werkzeug-${w.id}`}
                onClick={() => props.onWerkzeugWechsel(w.id)}
                style={{
                  background: aktiv ? rolle.fill : 'transparent',
                  border: `1px solid ${aktiv ? rolle.linie : 'transparent'}`,
                  color: aktiv ? rolle.farbe : 'var(--k-ink-soft)',
                }}
              >
                <VIcon name={w.icon} size={20} />
              </button>
            );
          })}
        </div>
      </div>

      {/* HUD + EIGENSCHAFTEN (oben rechts, gestapelt) */}
      <div className="k-vp-spalte-rechts">
        <div className="k-glass" style={{ padding: '14px 16px', flex: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span
              style={{
                fontFamily: 'var(--k-font-mono)',
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--k-ink-faint)',
              }}
            >
              {text.hudTitel}
            </span>
            <VIcon name={text.tabIcon} size={15} style={{ color: rolle.farbe }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }} data-testid="viewport-hud">
            {hud.map((h) => (
              <div key={h.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--k-ink-faint)' }}>
                  {h.k}
                </span>
                <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 12, color: 'var(--k-ink-soft)' }}>{h.v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="k-glass" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--k-glass-stroke)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--k-font-mono)',
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--k-ink-faint)',
              }}
            >
              Eigenschaften
            </span>
            <Badge hue={rolle.farbe}>{text.badge}</Badge>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {panel.map((sec) => (
              <div key={sec.label}>
                <div
                  style={{
                    fontFamily: 'var(--k-font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--k-ink-faint)',
                    marginBottom: 8,
                  }}
                >
                  {sec.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--k-glass-stroke)' }}>
                  {sec.zeilen.map((r) => (
                    <div key={r.k} style={{ padding: '9px 11px', background: 'rgba(255,255,255,.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 11, color: 'var(--k-ink-faint)' }}>{r.k}</span>
                      <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 12, color: 'var(--k-ink-soft)' }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {props.modus === 'modellieren' && (
              <button type="button" className="k-vp-toggle-row k-druck" onClick={props.onTexturToggle} data-testid="viewport-texturen-toggle">
                <span>Texturen</span>
                <span style={{ color: props.texturenAn ? rolle.farbe : 'var(--k-ink-faint)' }}>{props.texturenAn ? 'AN' : 'AUS'}</span>
              </button>
            )}
          </div>
          <div style={{ flex: 'none', padding: '12px 16px', borderTop: '1px solid var(--k-glass-stroke)' }}>
            <KButton tone="accent" size="sm" style={{ width: '100%' }} onClick={aktion} data-testid="viewport-panel-aktion">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', width: '100%' }}>
                <VIcon name={text.aktionIcon} size={14} />
                {text.aktionLabel}
              </span>
            </KButton>
          </div>
        </div>
      </div>

      {/* ACHSENKREUZ (unten links) */}
      <div className="k-glass" style={{ position: 'absolute', left: 16, bottom: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 12px 12px', zIndex: 6 }}>
        <AchsenGizmo size={56} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--k-ink-faint)' }}>ORIENTIERUNG</span>
          <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 13, color: 'var(--k-ink-soft)' }} data-testid="viewport-orientierung">
            {orientierung}
          </span>
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10, color: 'var(--k-rolle-generator)' }}>X</span>
            <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10, color: 'var(--k-rolle-manuell)' }}>Y</span>
            <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10, color: 'var(--k-rolle-pn)' }}>Z</span>
          </div>
        </div>
      </div>

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
  .k-vp-chrome-spalte {
    position: absolute;
    z-index: 6;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .k-vp-spalte-rechts {
    position: absolute;
    top: 16px;
    right: 16px;
    bottom: 180px;
    width: 280px;
    z-index: 6;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
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
