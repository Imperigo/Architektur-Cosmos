import { Badge, KButton, KKeyValue } from '@kosmo/ui';
import './viewport-chrome-huds.css';
import { DARSTELLUNG_LABEL } from './ViewportChrome';
import { AchsenGizmo, VIcon } from './viewport-chrome-icons';
import { VIEWPORT_MODUS_REIHENFOLGE, VIEWPORT_MODUS_TEXT, VIEWPORT_ROLLEN, VIEWPORT_WERKZEUGE, aspektLabel, kompassLabel, sonnenLabel } from './viewport-modi';
import { useViewportChromeRuntime } from '../../state/viewport-chrome-runtime';

/**
 * v0.7.8 Welle 2 / Paket P5 («HUDs als echte Dock-Floats») — die vier HUD-
 * Blöcke, die früher als handgetunte `position:absolute`-Kinder von
 * `ViewportChrome.tsx` lebten (Modus-Umschalter, Modus-Infokarte,
 * Werkzeug-Rail, Orientierungskreuz) und jetzt als `DockPanel`-Float-Inhalte
 * über `DesignWorkspace.tsx`s `designDockPanels` → `DockFlaeche` rendern
 * (Registry-Einträge in `dock-stationen.ts`, `dock:'float'`). Jede
 * Komponente ist SELBST-GENÜGSAM (liest `viewport-chrome-runtime.ts` direkt
 * per Selektor, KEINE Props) — `DesignWorkspace.tsx` reicht sie nur
 * unverändert als `inhalt` durch, ohne selbst irgendeinen Viewport3D-
 * Zustand kennen zu müssen (Entkopplungs-Begründung im Store-Kopfkommentar).
 *
 * Struktur/testids sind BYTE-GLEICH zum vorherigen Ort in `ViewportChrome.tsx`
 * übernommen (Bestandsschutz, s. Auftrag) — nur die äussere
 * `position:absolute`-Verpackung entfällt (das übernimmt jetzt der
 * Float-Rahmen aus `DockPanel.tsx`, `floatChrome:'schlank'`). Die
 * `.k-vp-*`-CSS-Klassen kommen weiterhin aus `ViewportChrome.tsx`s
 * `CHROME_STYLE`-`<style>`-Tag — der bleibt dort unverändert bestehen (ein
 * gewöhnliches, ungescoptes `<style>`-Element gilt dokumentweit, unabhängig
 * davon, wo im DOM diese Datei ihre Klassen benutzt) und wird exakt dann
 * gerendert, wenn `ViewportChrome`s `sichtbar`-Guard grün ist — dieselbe
 * Bedingung, unter der auch diese Floats sichtbar sind (`bereit` im
 * Runtime-Store), s. `DesignWorkspace.tsx`.
 *
 * v0.8.0B / P7 (Stations-Welle Design + Shell-Rest, Spez §3 B-41/B-42): die
 * statischen Layout-/Typo-Inline-Styles wandern nach `viewport-chrome-huds.
 * css`; die reinen Key-Value-Zeilenlisten (Statuskarte + Eigenschaften-
 * Sektionen) laufen jetzt über `KKeyValue` (identischer testid-Ort, da
 * `data-testid` auf dem KKeyValue-Wurzelelement landet). Die datengetriebenen
 * Rollenfarben (`background`/`border`/`color` nach `rolle`/`aktiv`) bleiben
 * bewusst Inline-Carrier — sie sind Zustand, keine Deko.
 */

export function ViewportModusLeisteHud() {
  const modus = useViewportChromeRuntime((s) => s.modus);
  const onModusWechsel = useViewportChromeRuntime((s) => s.onModusWechsel);
  return (
    <div className="k-glass vch-tab-leiste">
      {VIEWPORT_MODUS_REIHENFOLGE.map((m) => {
        const aktiv = m === modus;
        const r = VIEWPORT_ROLLEN[m];
        const t = VIEWPORT_MODUS_TEXT[m];
        return (
          <button
            key={m}
            type="button"
            className="k-vp-tab k-druck"
            data-testid={`viewport-modus-${m}`}
            onClick={() => onModusWechsel(m)}
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
  );
}

export function ViewportModusKarteHud() {
  const modus = useViewportChromeRuntime((s) => s.modus);
  const rolle = VIEWPORT_ROLLEN[modus];
  const text = VIEWPORT_MODUS_TEXT[modus];
  return (
    <div className="k-glass vch-modus-karte">
      <div className="vch-modus-kopf">
        <span className="k-vp-puls" style={{ background: rolle.farbe }} />
        <span className="vch-modus-badge" style={{ color: rolle.farbe }} data-testid="viewport-modus-badge">
          {text.badge}
        </span>
        <div className="vch-fuell" />
        <Badge hue={rolle.farbe}>{text.tagLabel}</Badge>
      </div>
      <div className="vch-modus-titel">{text.titel}</div>
      <div className="vch-modus-sub">{text.sub}</div>
    </div>
  );
}

export function ViewportWerkzeugRailHud() {
  const modus = useViewportChromeRuntime((s) => s.modus);
  const aktivesWerkzeug = useViewportChromeRuntime((s) => s.aktivesWerkzeug);
  const onWerkzeugWechsel = useViewportChromeRuntime((s) => s.onWerkzeugWechsel);
  const rolle = VIEWPORT_ROLLEN[modus];
  const werkzeuge = VIEWPORT_WERKZEUGE[modus];
  return (
    <div className="k-glass k-vp-rail">
      {werkzeuge.map((w) => {
        const aktiv = w.id === aktivesWerkzeug;
        return (
          <button
            key={w.id}
            type="button"
            className="k-vp-tool k-druck"
            title={w.label}
            aria-label={w.label}
            aria-pressed={aktiv}
            data-testid={`viewport-werkzeug-${w.id}`}
            onClick={() => onWerkzeugWechsel(w.id)}
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
  );
}

export function ViewportOrientierungHud() {
  const azimutRad = useViewportChromeRuntime((s) => s.azimutRad);
  const orientierung = kompassLabel(azimutRad);
  return (
    <div className="k-glass vch-orientierung">
      <AchsenGizmo size={56} />
      <div className="vch-orientierung-spalte">
        <span className="vch-label-micro">ORIENTIERUNG</span>
        <span className="vch-wert-mono" data-testid="viewport-orientierung">
          {orientierung}
        </span>
        <div className="vch-achsen-zeile">
          <span style={{ color: 'var(--k-rolle-generator)' }}>X</span>
          <span style={{ color: 'var(--k-rolle-manuell)' }}>Y</span>
          <span style={{ color: 'var(--k-rolle-pn)' }}>Z</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// v0.7.9 A1 («Säulen ins Dock») — die zwei P5-Ausnahmen (s. `ViewportChrome
// .tsx`s Kopfkommentar für die Überlapp-Historie ROADMAP 357/358): HUD-
// Statuskarte + Eigenschaften-Panel, byte-gleicher Inhalt/testids wie vorher
// in `ViewportChrome.tsx`s `k-vp-spalte-rechts`, jetzt zwei eigene
// `DockPanel`-Floats (`viewportHudStatuskarte`/`viewportEigenschaften`,
// `dock-stationen.ts`, Anker `top-right`). Lesen `viewport-chrome-runtime.ts`
// wie die vier Floats oben — kein Prop-Drilling.
// ---------------------------------------------------------------------------

interface HudZeile {
  k: string;
  v: string;
}

interface PanelSektion {
  label: string;
  zeilen: HudZeile[];
}

export function ViewportHudStatuskarteHud() {
  const modus = useViewportChromeRuntime((s) => s.modus);
  const geschossLabel = useViewportChromeRuntime((s) => s.geschossLabel);
  const kontextAnzahl = useViewportChromeRuntime((s) => s.kontextAnzahl);
  const splatAktiv = useViewportChromeRuntime((s) => s.splatAktiv);
  const sonnenDatum = useViewportChromeRuntime((s) => s.sonnenDatum);
  const brennweiteMm = useViewportChromeRuntime((s) => s.brennweiteMm);
  const aspektBreite = useViewportChromeRuntime((s) => s.aspektBreite);
  const aspektHoehe = useViewportChromeRuntime((s) => s.aspektHoehe);
  const renderStatusLabel = useViewportChromeRuntime((s) => s.renderStatusLabel);
  const rolle = VIEWPORT_ROLLEN[modus];
  const text = VIEWPORT_MODUS_TEXT[modus];
  const aspekt = aspektLabel(aspektBreite, aspektHoehe);

  const hud: HudZeile[] =
    modus === 'modellieren'
      ? [
          { k: 'ANSICHT', v: 'Perspektive' },
          { k: 'RASTER', v: '1 m / 10 m' },
          { k: 'GESCHOSS', v: geschossLabel ?? '—' },
          { k: 'KONTEXT', v: `${kontextAnzahl} Mesh${kontextAnzahl === 1 ? '' : 'e'}` },
        ]
      : modus === 'kamera'
        ? [
            { k: 'BRENNWEITE', v: `${brennweiteMm} mm (35 mm-äquiv.)` },
            { k: 'FORMAT', v: aspekt },
            { k: 'ZIEL-NODE', v: 'Visualisierung' },
            { k: 'RENDER', v: renderStatusLabel },
          ]
        : [
            { k: 'ANSICHT', v: 'Perspektive' },
            { k: 'KONTEXT', v: `${kontextAnzahl} Mesh${kontextAnzahl === 1 ? '' : 'e'}` },
            { k: 'SPLAT', v: splatAktiv ? 'aktiv' : 'aus' },
            { k: 'SONNE', v: sonnenLabel(sonnenDatum) },
          ];

  return (
    <div className="k-glass vch-hud-karte">
      <div className="vch-hud-kopf">
        <span className="vch-hud-kopf-label">{text.hudTitel}</span>
        <VIcon name={text.tabIcon} size={15} style={{ color: rolle.farbe }} />
      </div>
      <KKeyValue data-testid="viewport-hud" zeilen={hud.map((h) => ({ key: h.k, wert: h.v }))} />
    </div>
  );
}

export function ViewportEigenschaftenHud() {
  const modus = useViewportChromeRuntime((s) => s.modus);
  const azimutRad = useViewportChromeRuntime((s) => s.azimutRad);
  const polarGrad = useViewportChromeRuntime((s) => s.polarGrad);
  const distanzM = useViewportChromeRuntime((s) => s.distanzM);
  const geschossLabel = useViewportChromeRuntime((s) => s.geschossLabel);
  const kontextAnzahl = useViewportChromeRuntime((s) => s.kontextAnzahl);
  const splatAktiv = useViewportChromeRuntime((s) => s.splatAktiv);
  const texturenAn = useViewportChromeRuntime((s) => s.texturenAn);
  const sonnenDatum = useViewportChromeRuntime((s) => s.sonnenDatum);
  const standortLabel = useViewportChromeRuntime((s) => s.standortLabel);
  const brennweiteMm = useViewportChromeRuntime((s) => s.brennweiteMm);
  const aspektBreite = useViewportChromeRuntime((s) => s.aspektBreite);
  const aspektHoehe = useViewportChromeRuntime((s) => s.aspektHoehe);
  const leistungsStufeLabel = useViewportChromeRuntime((s) => s.leistungsStufeLabel);
  const schattenAn = useViewportChromeRuntime((s) => s.schattenAn);
  const darstellungsModus = useViewportChromeRuntime((s) => s.darstellungsModus);
  const renderStatusLabel = useViewportChromeRuntime((s) => s.renderStatusLabel);
  const renderCloudLeer = useViewportChromeRuntime((s) => s.renderCloudLeer);
  const onEinpassen = useViewportChromeRuntime((s) => s.onEinpassen);
  const onRendern = useViewportChromeRuntime((s) => s.onRendern);
  const onFuerVisAufnehmen = useViewportChromeRuntime((s) => s.onFuerVisAufnehmen);
  const onTexturToggle = useViewportChromeRuntime((s) => s.onTexturToggle);

  const rolle = VIEWPORT_ROLLEN[modus];
  const text = VIEWPORT_MODUS_TEXT[modus];
  const aspekt = aspektLabel(aspektBreite, aspektHoehe);

  const darstellungSektion: PanelSektion = {
    label: 'Darstellung',
    zeilen: [
      { k: 'MODUS', v: DARSTELLUNG_LABEL[darstellungsModus] },
      { k: 'QUALITÄT', v: leistungsStufeLabel },
      { k: 'SCHATTEN', v: schattenAn ? 'an' : 'aus' },
    ],
  };

  const panel: PanelSektion[] =
    modus === 'modellieren'
      ? [
          {
            label: 'Kamera',
            zeilen: [
              { k: 'AZIMUT', v: `${Math.round(((-azimutRad * 180) / Math.PI + 360) % 360)}°` },
              { k: 'NEIGUNG', v: `${Math.round(polarGrad)}°` },
              { k: 'DISTANZ', v: `${distanzM.toFixed(1)} m` },
            ],
          },
          {
            label: 'Szene',
            zeilen: [
              { k: 'GESCHOSS', v: geschossLabel ?? '—' },
              { k: 'KONTEXT', v: `${kontextAnzahl}` },
              { k: 'TEXTUREN', v: texturenAn ? 'an' : 'aus' },
            ],
          },
          darstellungSektion,
        ]
      : modus === 'kamera'
        ? [
            {
              label: 'Objektiv',
              zeilen: [
                { k: 'BRENNWEITE', v: `${brennweiteMm} mm` },
                { k: 'FORMAT', v: aspekt },
              ],
            },
            {
              label: 'Render',
              zeilen: [
                { k: 'STATUS', v: renderStatusLabel },
                { k: 'CLOUD', v: renderCloudLeer ? 'nicht verbunden' : 'verbunden' },
                { k: 'ZIEL-NODE', v: 'Visualisierung' },
              ],
            },
            darstellungSektion,
          ]
        : [
            {
              label: 'Kontext',
              zeilen: [
                { k: 'KONTEXT-MESHES', v: `${kontextAnzahl}` },
                { k: 'SPLAT', v: splatAktiv ? 'aktiv' : 'aus' },
              ],
            },
            {
              label: 'Sonnenstand',
              zeilen: [
                { k: 'DATUM', v: sonnenLabel(sonnenDatum) },
                { k: 'STANDORT', v: standortLabel },
              ],
            },
            darstellungSektion,
          ];

  const aktion = modus === 'modellieren' ? onEinpassen : modus === 'kamera' ? onRendern : onFuerVisAufnehmen;

  return (
    <div className="k-glass vch-eigenschaften">
      <div className="vch-eigenschaften-kopf">
        <span className="vch-hud-kopf-label">Eigenschaften</span>
        <Badge hue={rolle.farbe}>{text.badge}</Badge>
      </div>
      <div className="vch-eigenschaften-koerper">
        {panel.map((sec) => (
          <div key={sec.label}>
            <div className="vch-sektion-titel">{sec.label}</div>
            <KKeyValue zeilen={sec.zeilen.map((r) => ({ key: r.k, wert: r.v }))} />
          </div>
        ))}
        {modus === 'modellieren' && (
          <button type="button" className="k-vp-toggle-row k-druck" onClick={onTexturToggle} data-testid="viewport-texturen-toggle">
            <span>Texturen</span>
            <span style={{ color: texturenAn ? rolle.farbe : 'var(--k-ink-faint)' }}>{texturenAn ? 'AN' : 'AUS'}</span>
          </button>
        )}
      </div>
      <div className="vch-eigenschaften-fuss">
        <KButton tone="accent" size="sm" style={{ width: '100%' }} onClick={aktion} data-testid="viewport-panel-aktion">
          <span className="vch-aktion-inhalt">
            <VIcon name={text.aktionIcon} size={14} />
            {text.aktionLabel}
          </span>
        </KButton>
      </div>
    </div>
  );
}
