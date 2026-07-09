import { useMemo } from 'react';
import { pruefeSubmissionsreife, type SubmissionsBefund } from '@kosmo/kernel';
import { Badge, Hairline, KButton, KIcon } from '@kosmo/ui';
import { useProject } from '../../state/project-store';

/**
 * A7 (Owner-Befund K17): Submissions-Check als sechstes Fähigkeits-Icon —
 * bislang gab es dafür KEIN UI (nur `window.__kosmo.reife()` für Tests/den
 * Sim-Journey `e2e/sim-submission.spec.ts`). Dieses Panel ist die erste
 * echte Oberfläche für `derive/submissionsreife.ts` (`pruefeSubmissionsreife`,
 * Block C6) — reine Anzeige der bestehenden Ableitung, keine neue Logik:
 * die Lückenliste (Bauteile ohne Aufbau/Material, Zonen ohne Raumtyp, etc.)
 * je Geschoss, mit demselben Ehrlichkeits-Grundsatz wie KV/Bauablauf/Mängel
 * («Richtwerte, kein Normersatz», `docs/SUBMISSION-KONZEPT.md`).
 */
export function SubmissionsCheckPanel({ onClose }: { onClose: () => void }) {
  const revision = useProject((s) => s.revision);
  const activeStoreyId = useProject((s) => s.activeStoreyId);
  const doc = useProject.getState().doc;

  const befunde = useMemo<SubmissionsBefund[]>(
    () => pruefeSubmissionsreife(doc, activeStoreyId ?? undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision, activeStoreyId],
  );

  const luecken = befunde.filter((b) => b.schwere === 'luecke');
  const hinweise = befunde.filter((b) => b.schwere === 'hinweis');

  return (
    <div
      data-testid="submission-panel"
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
        <Badge hue="var(--k-mod-design)">Submissions-Check</Badge>
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          <KIcon name="schliessen" size={14} />
        </KButton>
      </div>

      <div style={{ color: 'var(--k-ink-faint)', fontSize: 'var(--k-t-sm)' }}>
        Lückenliste für die Submissionsreife (SIA-Teilphase 4.41) — {activeStoreyId ? 'aktuelles Geschoss' : 'ganzes Projekt'}.
        Richtwerte aus dem Datenmodell, kein Normersatz.
      </div>

      <Hairline />

      {befunde.length === 0 ? (
        <div data-testid="submission-leer" style={{ color: 'var(--k-ink-faint)' }}>
          Keine Lücken gefunden — zeichne zuerst Wände/Decken/Zonen mit Aufbau, dann prüft der Check mit.
        </div>
      ) : (
        <>
          {luecken.length > 0 && (
            <div style={{ display: 'grid', gap: 'var(--k-s3)' }} data-testid="submission-luecken">
              <div className="k-titel" style={{ fontSize: 'var(--k-t-lg)', color: 'var(--k-danger, #a33)' }}>
                Lücken ({luecken.length}) — Nachtragsrisiko bei der Vergabe
              </div>
              {luecken.map((b, i) => (
                <div key={`l-${i}`} style={{ padding: 'var(--k-s2) var(--k-s3)', borderLeft: '2px solid var(--k-danger, #a33)' }}>
                  {b.text}
                </div>
              ))}
            </div>
          )}
          {hinweise.length > 0 && (
            <div style={{ display: 'grid', gap: 'var(--k-s3)' }} data-testid="submission-hinweise">
              <div className="k-titel" style={{ fontSize: 'var(--k-t-lg)', color: 'var(--k-ink-soft)' }}>
                Hinweise ({hinweise.length})
              </div>
              {hinweise.map((b, i) => (
                <div key={`h-${i}`} style={{ padding: 'var(--k-s2) var(--k-s3)', borderLeft: '2px solid var(--k-line-strong)' }}>
                  {b.text}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
