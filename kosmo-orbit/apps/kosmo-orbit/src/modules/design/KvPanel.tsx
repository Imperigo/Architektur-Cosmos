import { useMemo } from 'react';
import { deriveKostenschaetzung, kvBlattSvg, KV_HINWEIS, siaPhaseLabel, type KvKennwerte } from '@kosmo/kernel';
import { Badge, Hairline, KButton, KIcon, KInput, Measure } from '@kosmo/ui';
import { useProject } from '../../state/project-store';

/**
 * KV-Panel — Kostenvoranschlag-**Grobschätzung** (v0.6.3,
 * `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4, Lücken-Batch 3,
 * Owner-Hauptaufgabe K22). Zeigt `derive/kostenschaetzung.ts` als
 * editierbares Panel neben der Berechnungsliste: Tabelle der BKP-Positionen,
 * Summe, ein prominenter Ehrlichkeits-Hinweis («Richtwert, kein Devis») und
 * die Kennwert-Felder, die den Command `design.kvKennwerteSetzen` direkt
 * feuern (analog `sia-phase-select`/`bemassung-stil` — sofortige,
 * undo-fähige Settings-Änderung, keine separate «Übernehmen»-Stufe).
 *
 * AUSDRÜCKLICH kein Devis: keine CRB/NPK-Positionen, keine eBKP-
 * Feingliederung — der Hinweis steht permanent sichtbar, nicht nur beim
 * Export.
 */

const fmt = (v: number) => v.toLocaleString('de-CH', { maximumFractionDigits: 0 });

export function KvPanel({ onClose }: { onClose: () => void }) {
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;

  const kv = useMemo(
    () => deriveKostenschaetzung(doc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  const setzen = (feld: keyof KvKennwerte, wert: number): void => {
    if (!Number.isFinite(wert)) return;
    runCommand('design.kvKennwerteSetzen', { [feld]: wert });
  };

  const exportSvg = () => {
    const svg = kvBlattSvg(kv, {
      ...(doc.settings.projectName ? { titel: doc.settings.projectName } : {}),
      datum: new Date().toLocaleDateString('de-CH'),
      siaPhase: doc.settings.siaPhase,
    });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kv-blatt.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const kennwertFeld = (
    label: string,
    feld: keyof KvKennwerte,
    testid: string,
    proz: boolean,
    titel: string,
  ) => (
    <label style={{ display: 'flex', gap: 'var(--k-s2)', alignItems: 'center', color: 'var(--k-ink-soft)', fontSize: 'var(--k-t-sm)' }} title={titel}>
      {label}
      <KInput
        size="sm"
        mono
        type="number"
        value={proz ? Math.round(kv.kennwerte[feld] * 100) : kv.kennwerte[feld]}
        data-testid={testid}
        onChange={(e) => {
          const roh = Number(e.target.value);
          setzen(feld, proz ? roh / 100 : roh);
        }}
        style={{ width: 76 }}
      />
      {proz ? '%' : 'CHF/m²'}
    </label>
  );

  return (
    <div
      data-testid="kv-panel"
      style={{
        position: 'absolute',
        left: 90,
        top: 52,
        zIndex: 20,
        width: 430,
        maxHeight: 'calc(100% - 90px)',
        overflow: 'auto',
        background: 'var(--k-raised)',
        border: '1px solid var(--k-technik)',
        boxShadow: 'var(--k-shadow-overlay)',
        padding: 'var(--k-s4)',
        display: 'grid',
        gap: 'var(--k-s4)',
        fontSize: 'var(--k-t-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--k-s3)' }}>
        <Badge hue="var(--k-mod-design)">Kostenschätzung</Badge>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={exportSvg} data-testid="kv-blatt">
          KV-Blatt (SVG)
        </KButton>
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          <KIcon name="schliessen" size={14} />
        </KButton>
      </div>

      <div
        data-testid="kv-hinweis"
        style={{
          background: 'var(--k-warning-wash, #f6f2e6)',
          border: '1px solid var(--k-warning-line, #c9bfa0)',
          borderRadius: 'var(--k-radius-sm)',
          padding: 'var(--k-s3) var(--k-s4)',
          fontWeight: 600,
          color: 'var(--k-ink)',
        }}
      >
        {KV_HINWEIS}
      </div>

      <div style={{ color: 'var(--k-ink-faint)', fontSize: 'var(--k-t-sm)' }}>
        GF-Basis: <Measure>{kv.flaecheGf > 0 ? `${fmt(kv.flaecheGf)} m²` : '—'}</Measure>
        {' · '}
        {siaPhaseLabel(doc.settings.siaPhase)}
      </div>

      <Hairline />

      {kv.positionen.length === 0 ? (
        <div data-testid="kv-leer" style={{ color: 'var(--k-ink-faint)' }}>
          Keine Geometrie gezeichnet — zuerst Decken oder Volumenkörper anlegen, dann rechnet die
          Schätzung mit.
        </div>
      ) : (
        <>
          <table style={{ borderCollapse: 'collapse', width: '100%' }} data-testid="kv-tabelle">
            <thead>
              <tr style={{ textAlign: 'right', color: 'var(--k-ink-faint)', fontSize: 11 }}>
                <th style={{ fontWeight: 500, padding: '2px 4px', textAlign: 'left' }}>BKP</th>
                <th style={{ fontWeight: 500, padding: '2px 4px', textAlign: 'left' }}>Bezeichnung</th>
                <th style={{ fontWeight: 500, padding: '2px 4px' }}>CHF</th>
              </tr>
            </thead>
            <tbody>
              {kv.positionen.map((p) => (
                <tr key={p.bkp} style={{ borderTop: '1px solid var(--k-line)' }}>
                  <td style={{ padding: '3px 4px' }}>{p.bkp}</td>
                  <td style={{ padding: '3px 4px' }}>{p.bezeichnung}</td>
                  <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                    <Measure>{fmt(p.betrag)}</Measure>
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid var(--k-technik)', fontWeight: 600 }}>
                <td style={{ padding: '3px 4px' }} colSpan={2}>
                  Total
                </td>
                <td style={{ padding: '3px 4px', textAlign: 'right' }} data-testid="kv-summe">
                  <Measure>{fmt(kv.total)}</Measure>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <Hairline />

      <div style={{ display: 'grid', gap: 'var(--k-s3)' }}>
        <div className="k-titel" style={{ fontSize: 'var(--k-t-lg)', color: 'var(--k-ink-soft)' }}>
          Kennwerte (Annahme Owner-Guideline, kein verbindlicher Wert)
        </div>
        <div style={{ display: 'flex', gap: 'var(--k-s3)', flexWrap: 'wrap' }}>
          {kennwertFeld('BKP 2 Basis', 'chfProM2Gf', 'kv-chf-m2', false, 'CHF pro m² GF für BKP 2 (Gebäude)')}
          {kennwertFeld('Rohbau', 'anteilRohbau', 'kv-anteil-rohbau', true, 'Anteil Rohbau am BKP-2-Basiswert')}
          {kennwertFeld('Ausbau', 'anteilAusbau', 'kv-anteil-ausbau', true, 'Anteil Ausbau am BKP-2-Basiswert')}
          {kennwertFeld('Technik', 'anteilTechnik', 'kv-anteil-technik', true, 'Anteil Gebäudetechnik am BKP-2-Basiswert')}
          {kennwertFeld('Umgebung (BKP 4)', 'zuschlagUmgebung', 'kv-zuschlag-umgebung', true, 'Zuschlag BKP 4 als Anteil der BKP-2-Summe')}
          {kennwertFeld('Baunebenkosten (BKP 5)', 'zuschlagBaunebenkosten', 'kv-zuschlag-baunebenkosten', true, 'Zuschlag BKP 5 als Anteil der BKP-2-Summe')}
          {kennwertFeld('Reserve', 'reserve', 'kv-reserve', true, 'Reserve als Anteil der Zwischensumme BKP 2+4+5')}
        </div>
        <span style={{ color: 'var(--k-ink-faint)', fontSize: 'var(--k-t-xs)' }}>
          Jede Änderung ist ein eigener Undo-Schritt (Command design.kvKennwerteSetzen).
        </span>
      </div>
    </div>
  );
}
