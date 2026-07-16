import { useMemo } from 'react';
import { pruefeSubmissionsreife, type SubmissionsBefund } from '@kosmo/kernel';
import { Hairline, KButton, KIcon, KPanelZweiStufen } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import { stufeUmschalten, useDockZustand } from '../../state/dock-zustand';
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
 *
 * v0.8.1 Welle 4 / Paket P5c (Zwei-Stufen-Rollout, `docs/V081-SPEZ.md`
 * §2.2/§2.4) — migriert auf `KPanelZweiStufen`: Kernkennzahl ist die
 * Befundzahl («N Einträge», §2.2 Tabellen-Rezept). EIN Tab (kein
 * Lücken/Hinweise-Split): dieses Panel ist rein lesend (kein Formular, das
 * mit dem Ergebnis interferieren könnte), aber `e2e/sim-submission.spec.ts`
 * liest `submissionsreifePruefen()` über `window.__kosmo` direkt, nicht über
 * einen bestimmten Tab-Zustand dieser Komponente — ein Split wäre hier zwar
 * risikofrei möglich, bringt aber keinen Nie-Scroll-Gewinn (Lücken UND
 * Hinweise sind typischerweise kurze Listen je Geschoss) und würde die
 * heutige «alles auf einen Blick»-Übersicht ohne Not aufbrechen.
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

  const modus = useDockZustand((s) => s.modus);
  const layouts = useDockZustand((s) => s.layouts);
  const panelOverrideSetzen = useDockZustand((s) => s.panelOverrideSetzen);
  const stufeRoh = layouts[`${modus}:design`]?.panels['submissionOffen']?.stufe;
  const stufe = stufeRoh ?? 'offen';

  return (
    <div data-testid="submission-panel" className="dp-dialog">
      {/* Gate-Nachtrag (P5c): Action-Row nur in Stufe 'offen', s. MaengelPanel-
          Kommentar. */}
      {stufe === 'offen' && (
        <div className="dp-kopf">
          <div className="dp-fuell" />
          <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
            <KIcon name="schliessen" size={14} />
          </KButton>
        </div>
      )}

      <KPanelZweiStufen
        data-testid="submission-panel-koerper"
        titel="Submissions-Check"
        kernkennzahl={`${befunde.length} Einträge`}
        stufe={stufe}
        onStufeUmschalten={() => panelOverrideSetzen('design', 'submissionOffen', { stufe: stufeUmschalten(stufeRoh) })}
        aktiverTab="uebersicht"
        onTabWechseln={() => {}}
        tabs={[
          {
            id: 'uebersicht',
            label: 'Übersicht',
            inhalt: (
              <div className="sub-koerper">
                <div className="dp-meta">
                  Lückenliste für die Submissionsreife (SIA-Teilphase 4.41) —{' '}
                  {activeStoreyId ? 'aktuelles Geschoss' : 'ganzes Projekt'}. Richtwerte aus dem Datenmodell, kein
                  Normersatz.
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
            ),
          },
        ]}
      />
    </div>
  );
}
