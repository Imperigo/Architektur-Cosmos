import { Badge } from '@kosmo/ui';
import { AchsenGizmo, VIcon } from './viewport-chrome-icons';
import { VIEWPORT_MODUS_REIHENFOLGE, VIEWPORT_MODUS_TEXT, VIEWPORT_ROLLEN, VIEWPORT_WERKZEUGE, kompassLabel } from './viewport-modi';
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
 * Struktur/Klassen/testids sind BYTE-GLEICH zum vorherigen Ort in
 * `ViewportChrome.tsx` übernommen (Bestandsschutz, s. Auftrag) — nur die
 * äussere `position:absolute`-Verpackung entfällt (das übernimmt jetzt der
 * Float-Rahmen aus `DockPanel.tsx`, `floatChrome:'schlank'`). Die
 * `.k-vp-*`-CSS-Klassen kommen weiterhin aus `ViewportChrome.tsx`s
 * `CHROME_STYLE`-`<style>`-Tag — der bleibt dort unverändert bestehen (ein
 * gewöhnliches, ungescoptes `<style>`-Element gilt dokumentweit, unabhängig
 * davon, wo im DOM diese Datei ihre Klassen benutzt) und wird exakt dann
 * gerendert, wenn `ViewportChrome`s `sichtbar`-Guard grün ist — dieselbe
 * Bedingung, unter der auch diese Floats sichtbar sind (`bereit` im
 * Runtime-Store), s. `DesignWorkspace.tsx`.
 */

export function ViewportModusLeisteHud() {
  const modus = useViewportChromeRuntime((s) => s.modus);
  const onModusWechsel = useViewportChromeRuntime((s) => s.onModusWechsel);
  return (
    <div className="k-glass" style={{ display: 'flex', gap: 4, padding: 4 }}>
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
    <div className="k-glass" style={{ padding: '14px 16px', width: '100%', boxSizing: 'border-box' }}>
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
    <div className="k-glass" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 12px 12px' }}>
      <AchsenGizmo size={56} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: 'var(--k-font-mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--k-ink-faint)' }}>
          ORIENTIERUNG
        </span>
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
  );
}
