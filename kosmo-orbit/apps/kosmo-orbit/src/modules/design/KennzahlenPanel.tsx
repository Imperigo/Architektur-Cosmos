import { useMemo, useState } from 'react';
import { Badge, Hairline, Measure, moduleHue } from '@kosmo/ui';
import { areaReport, kennzahlenAuswerten, pruefeGrundriss } from '@kosmo/kernel';
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
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const [open, setOpen] = useState(true);
  const report = useMemo(() => areaReport(doc), [doc, revision]);
  const befunde = useMemo(
    () => (activeStoreyId ? pruefeGrundriss(doc, activeStoreyId) : []),
    [doc, revision, activeStoreyId],
  );

  const hasZones = report.totalNgf > 0;
  const hasMasses = report.gfVolumen > 0;

  return (
    <div
      data-testid="kennzahlen"
      style={{
        position: 'absolute',
        right: 12,
        // unter den Trace/Graph-Knöpfen des Plans (keine Überlappung im Split)
        top: 44,
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
        {befunde.length > 0 && (
          <Badge hue={befunde[0]!.schwere === 'fehler' ? 'var(--k-danger, #b3462e)' : 'var(--k-warning)'}>
            {befunde.length} Check{befunde.length > 1 ? 's' : ''}
          </Badge>
        )}
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
          {kennzahlenAuswerten(doc, report).length > 0 && (
            <>
              <Hairline />
              <div style={{ display: 'grid', gap: 3 }} data-testid="custom-kennzahlen">
                {kennzahlenAuswerten(doc, report).map((k) => (
                  <Row
                    key={k.name}
                    label={`${k.name} (${k.basis})`}
                    value={`${k.betrag.toLocaleString('de-CH')} ${k.einheit}`}
                    strong
                  />
                ))}
              </div>
            </>
          )}
          {befunde.length > 0 && (
            <>
              <Hairline />
              <div style={{ display: 'grid', gap: 5 }} data-testid="checks">
                {befunde.slice(0, 6).map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                    <span
                      title={b.schwere}
                      style={{
                        color:
                          b.schwere === 'fehler'
                            ? 'var(--k-danger, #b3462e)'
                            : b.schwere === 'warnung'
                              ? 'var(--k-warning)'
                              : 'var(--k-ink-faint)',
                        fontWeight: 700,
                      }}
                    >
                      {b.schwere === 'hinweis' ? '·' : '!'}
                    </span>
                    <span style={{ color: 'var(--k-ink-soft)', lineHeight: 1.4 }}>{b.text}</span>
                  </div>
                ))}
                {befunde.length > 6 && (
                  <span style={{ color: 'var(--k-ink-faint)' }}>… {befunde.length - 6} weitere</span>
                )}
                <span style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>
                  Richtwerte-Checks — kein Normersatz.
                </span>
              </div>
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
