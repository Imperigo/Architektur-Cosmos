import { useMemo } from 'react';
import { bauablaufBlattSvg, BAUABLAUF_HINWEIS, deriveBauablauf, siaPhaseLabel } from '@kosmo/kernel';
import { Badge, Hairline, KButton, Measure } from '@kosmo/ui';
import { useProject } from '../../state/project-store';

/**
 * Bauablauf-Panel — Grob-Terminplan-Grundgerüst (v0.6.3,
 * `docs/V063-VOLLPROJEKT-KONZEPT.md` Abschnitt 4, Lücken-Batch 4,
 * Owner-Hauptaufgabe K22). Zeigt `derive/bauablauf.ts` als schlichte Tabelle
 * (Gewerk/Dauer/Wochen) neben der KV-Grobschätzung: dieselbe
 * Panel-Anordnung, derselbe Ehrlichkeits-Grundsatz («Richtwert, ersetzt
 * keine Bauleitung») bleibt permanent sichtbar, nicht nur beim Export.
 *
 * AUSDRÜCKLICH kein Ersatz für Bauleitungssoftware: relative Wochen, kein
 * Kalenderbezug, keine Ressourcen-/Kapazitätsprüfung.
 */

export function BauablaufPanel({ onClose }: { onClose: () => void }) {
  const revision = useProject((s) => s.revision);
  const doc = useProject.getState().doc;

  const ablauf = useMemo(
    () => deriveBauablauf(doc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  const exportSvg = () => {
    const svg = bauablaufBlattSvg(ablauf, {
      ...(doc.settings.projectName ? { titel: doc.settings.projectName } : {}),
      datum: new Date().toLocaleDateString('de-CH'),
      siaPhase: doc.settings.siaPhase,
    });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bauablaufblatt.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div
      data-testid="bauablauf-panel"
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
        padding: 12,
        display: 'grid',
        gap: 10,
        fontSize: 12.5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge hue="var(--k-mod-design)">Bauablauf</Badge>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={exportSvg} data-testid="bauablauf-blatt">
          Bauablaufblatt (SVG)
        </KButton>
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          ✕
        </KButton>
      </div>

      <div
        data-testid="bauablauf-hinweis"
        style={{
          background: 'var(--k-warning-wash, #f6f2e6)',
          border: '1px solid var(--k-warning-line, #c9bfa0)',
          borderRadius: 'var(--k-radius-sm)',
          padding: '8px 10px',
          fontWeight: 600,
          color: 'var(--k-ink)',
        }}
      >
        {BAUABLAUF_HINWEIS}
      </div>

      <div style={{ color: 'var(--k-ink-faint)', fontSize: 11.5 }}>
        Gesamtdauer:{' '}
        <Measure>{ablauf.gesamtWochen > 0 ? `${ablauf.gesamtWochen} Wochen` : '—'}</Measure>
        {' · '}
        {siaPhaseLabel(doc.settings.siaPhase)}
      </div>

      <Hairline />

      {ablauf.phasen.length === 0 ? (
        <div data-testid="bauablauf-leer" style={{ color: 'var(--k-ink-faint)' }}>
          Keine Geometrie gezeichnet — zuerst mindestens ein Geschoss anlegen, dann rechnet der
          Grob-Terminplan mit.
        </div>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }} data-testid="bauablauf-tabelle">
          <thead>
            <tr style={{ textAlign: 'right', color: 'var(--k-ink-faint)', fontSize: 11 }}>
              <th style={{ fontWeight: 500, padding: '2px 4px', textAlign: 'left' }}>Gewerk</th>
              <th style={{ fontWeight: 500, padding: '2px 4px' }}>Dauer</th>
              <th style={{ fontWeight: 500, padding: '2px 4px' }}>Wochen</th>
            </tr>
          </thead>
          <tbody>
            {ablauf.phasen.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid var(--k-line)' }}>
                <td style={{ padding: '3px 4px' }}>
                  {p.gewerk}
                  {p.parallel ? (
                    <span style={{ color: 'var(--k-ink-faint)', fontSize: 10.5 }}> (überlappt)</span>
                  ) : null}
                </td>
                <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                  <Measure>{`${p.dauerWochen} W.`}</Measure>
                </td>
                <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                  <Measure>{`${p.startWoche}–${p.endWoche}`}</Measure>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Hairline />

      <span style={{ color: 'var(--k-ink-faint)', fontSize: 11 }}>
        Gewerke-Reihenfolge und Dauern sind aus der gezeichneten Geometrie und konfigurierbaren
        Leistungswerten abgeleitet (Annahme Owner-Guideline, kein verbindlicher Wert) — Wochen sind
        relativ (Woche 1 = Baubeginn), ohne Kalenderbezug.
      </span>
    </div>
  );
}
