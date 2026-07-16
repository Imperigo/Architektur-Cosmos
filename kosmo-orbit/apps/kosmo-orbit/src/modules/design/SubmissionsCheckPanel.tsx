import { useMemo } from 'react';
import { pruefeSubmissionsreife, type SubmissionsBefund } from '@kosmo/kernel';
import { Badge, Hairline, KButton, KIcon } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import './design-panels.css';

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
    <div data-testid="submission-panel" className="dp-dialog dp-dialog--scroll">
      <div className="dp-kopf">
        <Badge hue="var(--k-mod-design)">Submissions-Check</Badge>
        <div className="dp-fuell" />
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          <KIcon name="schliessen" size={14} />
        </KButton>
      </div>

      <div className="dp-meta">
        Lückenliste für die Submissionsreife (SIA-Teilphase 4.41) — {activeStoreyId ? 'aktuelles Geschoss' : 'ganzes Projekt'}.
        Richtwerte aus dem Datenmodell, kein Normersatz.
      </div>

      <Hairline />

      {befunde.length === 0 ? (
        <div data-testid="submission-leer" className="dp-leer">
          Keine Lücken gefunden — zeichne zuerst Wände/Decken/Zonen mit Aufbau, dann prüft der Check mit.
        </div>
      ) : (
        <>
          {luecken.length > 0 && (
            <div className="dp-spalte" data-testid="submission-luecken">
              <div className="k-titel dp-titel-block sub-titel-luecke">
                Lücken ({luecken.length}) — Nachtragsrisiko bei der Vergabe
              </div>
              {luecken.map((b, i) => (
                <div key={`l-${i}`} className="sub-befund sub-befund--luecke">
                  {b.text}
                </div>
              ))}
            </div>
          )}
          {hinweise.length > 0 && (
            <div className="dp-spalte" data-testid="submission-hinweise">
              <div className="k-titel dp-titel-block">Hinweise ({hinweise.length})</div>
              {hinweise.map((b, i) => (
                <div key={`h-${i}`} className="sub-befund sub-befund--hinweis">
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
