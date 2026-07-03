import { useMemo, useState } from 'react';
import { generiereStuetzenraster, type RasterVariante } from '@kosmo/kernel';
import { Badge, Hairline, Karteikarte, KButton, Measure } from '@kosmo/ui';
import { useProject } from '../../state/project-store';

/**
 * Stützenraster-Assistent (Phase 3.26, V2-A3) — Holz-Hybrid-Wohnraster über
 * 90°-Tiefgaragen-Parkierung, nach der Owner-Herleitung (VSS 40 291 als
 * Entwurfsreferenz). Rechenwerk oben, Varianten unten — und «Achsen ins
 * Modell» macht die Variante zu echten Rasterachsen mit Zeichnungs-Fang.
 */

const BEWERTUNG_HUE: Record<string, string> = {
  ausgewogen: 'var(--k-success)',
  knapp: 'var(--k-warning)',
  grosszuegig: 'var(--k-info)',
  'zu-eng': 'var(--k-danger)',
};

export function RasterPanel({ onClose }: { onClose: () => void }) {
  const [stuetzeCm, setStuetzeCm] = useState(30);
  const [abstandCm, setAbstandCm] = useState(10);
  const [zimmerLicht, setZimmerLicht] = useState(3.0);
  const [struktur, setStruktur] = useState(0.25);
  // Achsen ins Modell (V2-A3)
  const [anzahl, setAnzahl] = useState(5);
  const [querAnzahl, setQuerAnzahl] = useState(4);
  const runCommand = useProject((s) => s.runCommand);
  const activeStoreyId = useProject((s) => s.activeStoreyId);

  const achsenInsModell = (v: RasterVariante) => {
    if (!activeStoreyId) return;
    runCommand('design.rasterSetzen', {
      storeyId: activeStoreyId,
      achsmass: Math.round(v.achsmass * 1000),
      anzahl,
      querAnzahl,
      wohnraster: Math.round(v.wohnraster * 1000),
    });
  };

  const varianten = useMemo(
    () =>
      generiereStuetzenraster({
        stuetze: stuetzeCm / 100,
        abstand: abstandCm / 100,
        minWohnachse: zimmerLicht + struktur,
      }),
    [stuetzeCm, abstandCm, zimmerLicht, struktur],
  );

  const zuschlag = 2 * (stuetzeCm / 200 + abstandCm / 100);
  const inputStyle: React.CSSProperties = {
    width: 58,
    padding: '3px 6px',
    borderRadius: 'var(--k-radius-sm)',
    border: '1px solid var(--k-line-strong)',
    background: 'var(--k-raised)',
    fontSize: 12,
    fontFamily: 'var(--k-font-mono)',
  };

  return (
    <div
      data-testid="raster-panel"
      style={{
        position: 'absolute',
        left: 90,
        top: 52,
        zIndex: 20,
        width: 460,
        maxHeight: 'calc(100% - 90px)',
        overflow: 'auto',
        background: 'var(--k-raised)',
        border: '1px solid var(--k-technik)',
        boxShadow: 'var(--k-shadow-overlay)',
        padding: 12,
        display: 'grid',
        gap: 10,
        fontSize: 12.5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge hue="var(--k-mod-draw)">Stützenraster</Badge>
        <span style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>
          UG-Parkierung ↔ Holzbau-Wohnraster
        </span>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          ✕
        </KButton>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Stütze{' '}
          <input type="number" value={stuetzeCm} onChange={(e) => setStuetzeCm(Number(e.target.value) || 30)} style={inputStyle} /> cm
        </label>
        <label>
          Abstand{' '}
          <input type="number" value={abstandCm} onChange={(e) => setAbstandCm(Number(e.target.value) || 10)} style={inputStyle} /> cm
        </label>
        <label>
          Zimmer licht{' '}
          <input type="number" step={0.05} value={zimmerLicht} onChange={(e) => setZimmerLicht(Number(e.target.value) || 3)} style={inputStyle} /> m
        </label>
        <label>
          Struktur{' '}
          <input type="number" step={0.05} value={struktur} onChange={(e) => setStruktur(Number(e.target.value) || 0.25)} style={inputStyle} /> m
        </label>
      </div>
      <span style={{ color: 'var(--k-ink-faint)', fontSize: 11, fontFamily: 'var(--k-font-mono)' }}>
        Achsmass = Felder × Breite + {zuschlag.toFixed(2)} m · Minimum Wohnachse ={' '}
        {(zimmerLicht + struktur).toFixed(2)} m
      </span>

      <Hairline />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--k-ink-soft)', fontSize: 11.5 }}>Achsen ins Modell:</span>
        <label>
          Hauptachsen{' '}
          <input type="number" min={2} max={40} value={anzahl} onChange={(e) => setAnzahl(Math.max(2, Number(e.target.value) || 5))} style={inputStyle} data-testid="raster-anzahl" />
        </label>
        <label>
          Querachsen{' '}
          <input type="number" min={2} max={40} value={querAnzahl} onChange={(e) => setQuerAnzahl(Math.max(2, Number(e.target.value) || 4))} style={inputStyle} />
        </label>
        <span style={{ color: 'var(--k-ink-faint)', fontSize: 10.5 }}>ersetzt das Raster des Geschosses · Zeichnen fängt auf Achsen</span>
      </div>

      <div style={{ display: 'grid', gap: 6 }} data-testid="raster-varianten">
        {varianten.map((v, i) => (
          <Karteikarte key={`${v.parkfelder}-${v.feldbreite}-${v.wohnachsen}`} nr={i + 1}>
            <div style={{ display: 'grid', gap: 4 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--k-font-mono)', fontWeight: 700, fontSize: 12.5 }}>
                  {v.parkfelder} Felder à {v.feldbreite.toFixed(2)} → Achse {v.achsmass.toFixed(2)} m
                </span>
                <div style={{ flex: 1 }} />
                <Badge hue={BEWERTUNG_HUE[v.bewertung] ?? 'var(--k-ink-faint)'}>{v.bewertung}</Badge>
                {v.holzbauKritisch && <Badge hue="var(--k-warning)">Holzbau</Badge>}
                <KButton size="sm" tone="quiet" data-testid="raster-achsen" onClick={() => achsenInsModell(v)}>
                  Achsen ins Modell
                </KButton>
              </div>
              <div style={{ display: 'flex', gap: 14, color: 'var(--k-ink-soft)', fontSize: 11.5, flexWrap: 'wrap' }}>
                <span>
                  ÷ {v.wohnachsen} Wohnachsen = <Measure>{v.wohnraster.toFixed(2)} m</Measure>
                </span>
                <span>
                  Fahrgasse <Measure>{v.fahrgasse.toFixed(2)} m</Measure>
                </span>
              </div>
              <span style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>{v.hinweis}</span>
            </div>
          </Karteikarte>
        ))}
      </div>
      <span style={{ color: 'var(--k-ink-faint)', fontSize: 10.5 }}>
        VSS 40 291 (Vernehmlassungsentwurf) als Entwurfsreferenz — kein verbindlicher Normnachweis.
      </span>
    </div>
  );
}
