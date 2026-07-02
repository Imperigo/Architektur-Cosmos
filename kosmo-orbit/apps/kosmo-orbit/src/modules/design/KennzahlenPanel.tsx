import { useMemo, useState } from 'react';
import { Badge, Hairline, Measure, moduleHue } from '@kosmo/ui';
import { areaReport } from '@kosmo/kernel';
import { useProject } from '../../state/project-store';

/**
 * Live-Kennzahlen (Vorform/Finch-Muster, Owner-Methodik):
 * SIA-416-Flächen aus Zonen, aGF-Ziel = HNF × Faktor, GF-Schätzung mit
 * Fassadenzuschlag, GF aus Volumenstudien nach Nutzung. Läuft bei jedem
 * Befehl live mit — das Excel stirbt.
 */

const fmt = (m2: number) =>
  m2 >= 100 ? Math.round(m2).toLocaleString('de-CH') : m2.toFixed(1);

export function KennzahlenPanel() {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;
  const [open, setOpen] = useState(true);
  const report = useMemo(() => areaReport(doc), [doc, revision]);

  const hasZones = report.totalNgf > 0;
  const hasMasses = report.gfVolumen > 0;

  return (
    <div
      data-testid="kennzahlen"
      style={{
        position: 'absolute',
        right: 12,
        top: 12,
        width: 240,
        background: 'var(--k-surface)',
        border: '1px solid var(--k-line)',
        borderRadius: 'var(--k-radius-md)',
        boxShadow: 'var(--k-shadow-raised)',
        fontSize: 12.5,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          width: 'calc(100% - 24px)',
        }}
      >
        <Badge hue={moduleHue.design}>Kennzahlen</Badge>
        <span style={{ flex: 1 }} />
        <span style={{ color: 'var(--k-ink-faint)' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 12px 12px', display: 'grid', gap: 6 }}>
          {!hasZones && !hasMasses && (
            <div style={{ color: 'var(--k-ink-faint)' }}>
              Zeichne Zonen oder Volumen — die Flächen laufen hier live mit.
            </div>
          )}
          {hasZones && (
            <>
              {(['HNF', 'NNF', 'VF', 'FF', 'KF'] as const).map(
                (k) =>
                  report.total[k] > 0 && (
                    <Row key={k} label={k} value={`${fmt(report.total[k])} m²`} />
                  ),
              )}
              <Hairline />
              <Row label="NGF" value={`${fmt(report.totalNgf)} m²`} strong />
              <Row
                label={`aGF-Ziel (×${doc.settings.agfFactor})`}
                value={`${fmt(report.agfZiel)} m²`}
                strong
              />
              <Row
                label={`GF-Schätzung (×${doc.settings.facadeFactor})`}
                value={`${fmt(report.gfSchaetzung)} m²`}
              />
            </>
          )}
          {hasMasses && (
            <>
              {hasZones && <Hairline />}
              <Row label="GF Volumenstudie" value={`${fmt(report.gfVolumen)} m²`} strong />
              {Object.entries(report.gfVolumenNachProgramm).map(([prog, gf]) => (
                <Row key={prog} label={`· ${prog}`} value={`${fmt(gf)} m²`} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: strong ? 'var(--k-ink)' : 'var(--k-ink-soft)', fontWeight: strong ? 550 : 400 }}>
        {label}
      </span>
      <Measure style={{ fontWeight: strong ? 600 : 400 }}>{value}</Measure>
    </div>
  );
}
