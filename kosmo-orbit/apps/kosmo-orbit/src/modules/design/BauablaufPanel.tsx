import { useMemo } from 'react';
import { bauablaufBlattSvg, BAUABLAUF_HINWEIS, deriveBauablauf, siaPhaseLabel } from '@kosmo/kernel';
import { Badge, Hairline, KButton, KIcon, Measure } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import './design-panels.css';

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
    <div data-testid="bauablauf-panel" className="dp-dialog dp-dialog--scroll">
      <div className="dp-kopf">
        <Badge hue="var(--k-mod-design)">Bauablauf</Badge>
        <div className="dp-fuell" />
        <KButton size="sm" tone="ghost" onClick={exportSvg} data-testid="bauablauf-blatt">
          Bauablaufblatt (SVG)
        </KButton>
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          <KIcon name="schliessen" size={14} />
        </KButton>
      </div>

      <div data-testid="bauablauf-hinweis" className="dp-hinweis">
        {BAUABLAUF_HINWEIS}
      </div>

      <div className="dp-meta">
        Gesamtdauer:{' '}
        <Measure>{ablauf.gesamtWochen > 0 ? `${ablauf.gesamtWochen} Wochen` : '—'}</Measure>
        {' · '}
        {siaPhaseLabel(doc.settings.siaPhase)}
      </div>

      <Hairline />

      {ablauf.phasen.length === 0 ? (
        <div data-testid="bauablauf-leer" className="dp-leer">
          Keine Geometrie gezeichnet — zuerst mindestens ein Geschoss anlegen, dann rechnet der
          Grob-Terminplan mit.
        </div>
      ) : (
        <table className="dp-tabelle" data-testid="bauablauf-tabelle">
          <thead>
            <tr>
              <th>Gewerk</th>
              <th>Dauer</th>
              <th>Wochen</th>
            </tr>
          </thead>
          <tbody>
            {ablauf.phasen.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.gewerk}
                  {p.parallel ? <span className="dp-fussnote"> (überlappt)</span> : null}
                </td>
                <td className="dp-num">
                  <Measure>{`${p.dauerWochen} W.`}</Measure>
                </td>
                <td className="dp-num">
                  <Measure>{`${p.startWoche}–${p.endWoche}`}</Measure>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Hairline />

      <span className="dp-fussnote">
        Gewerke-Reihenfolge und Dauern sind aus der gezeichneten Geometrie und konfigurierbaren
        Leistungswerten abgeleitet (Annahme Owner-Guideline, kein verbindlicher Wert) — Wochen sind
        relativ (Woche 1 = Baubeginn), ohne Kalenderbezug.
      </span>
    </div>
  );
}
