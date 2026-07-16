import { KButton } from '@kosmo/ui';
import { useProject } from '../../state/project-store';
import { alleFuerJobErlaubt } from '../../shell/governance-speicher';
import {
  ANSICHT_SLOTS,
  ANSICHT_SLOT_LABEL,
  useVisRuntime,
  type AnsichtSlotId,
} from './vis-runtime';

/**
 * VisReportDossier (v0.8.1 / P8, 0.7.5-Welle-2 «Report-Dossier/Print», Spec
 * §6.2/§9.17, B-103/B-104) — «doc-page A4, Kacheln, Governance-Box» +
 * «Papier ist Papier»: der Bogen bleibt IMMER hell (harte Farbliterale in
 * `vis-visual.css` `.vis-report-*`, wie `derive/dossier.ts`s SVG-Kopf),
 * unabhängig vom aktiven App-Theme, kein Glass/Glow im Druck.
 *
 * Eigenständig von `modules/publish/DossierPanel.tsx` (Unternehmerplan-
 * Bericht, anderes Paket/anderer Dateikreis) — dieser Report fasst die
 * KosmoVis-Kuration zusammen: die drei gespeicherten Ansichten
 * (`GespeicherteAnsichten.tsx`, echte Snapshot-dataURLs, kein Bridge-Fetch
 * nötig — druckt darum auch ohne erreichbare HomeStation) + eine ehrliche
 * Governance-Box aus echten Laufzeit-Zählern (`vis-runtime.ts` Terminal-
 * Status, `shell/governance-speicher.ts` aktive Auto-Freigaben).
 */
export function VisReportDossier({ onClose }: { onClose: () => void }) {
  // Muster wie überall sonst (`VisWorkspace.tsx` u.a.): `doc` wird in-place
  // fortgeschrieben, `revision` ist der reaktive Auslöser — ein direktes
  // `useProject((s) => s.doc)` würde denselben Objekt-Verweis liefern und
  // keinen Re-Render auslösen, wenn sich nur Felder darin ändern.
  const revision = useProject((s) => s.revision);
  void revision;
  const doc = useProject.getState().doc;
  const gespeicherteAnsichten = useVisRuntime((s) => s.gespeicherteAnsichten);
  const aufnahmen = useVisRuntime((s) => s.aufnahmen);
  const reviewPins = useVisRuntime((s) => s.reviewPins);
  const laeufe = useVisRuntime((s) => s.laeufe);

  const laeufeListe = Object.values(laeufe);
  const fertig = laeufeListe.filter((l) => l.status === 'fertig').length;
  const fehler = laeufeListe.filter((l) => l.status === 'fehler').length;
  const abgebrochen = laeufeListe.filter((l) => l.status === 'abgebrochen').length;
  const autoFreigaben = alleFuerJobErlaubt('vis').length;

  const heute = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' }).format(new Date());

  return (
    <div className="vis-report-scrim" data-testid="vis-report-dossier-scrim" role="dialog" aria-label="KosmoVis — Report-Dossier">
      <div className="vis-report-toolbar">
        <KButton size="sm" tone="quiet" data-testid="vis-report-drucken" onClick={() => window.print()}>
          Drucken
        </KButton>
        <KButton size="sm" tone="ghost" data-testid="vis-report-schliessen" onClick={onClose}>
          Schliessen
        </KButton>
      </div>
      <div className="vis-report-dossier" data-testid="vis-report-dossier">
        <div className="vis-report-kopf">
          <div>
            <div className="vis-report-marke">KOSMOORBIT · KOSMOVIS</div>
            <div className="vis-report-titel">{doc.settings.projectName || 'Unbenanntes Projekt'}</div>
          </div>
          <div className="vis-report-meta">
            {heute}
            <br />
            Phase: {doc.settings.siaPhase}
          </div>
        </div>

        <section>
          <div className="vis-report-label">Gespeicherte Ansichten</div>
          <div className="vis-report-kacheln">
            {ANSICHT_SLOTS.map((slot: AnsichtSlotId) => {
              const eintrag = gespeicherteAnsichten[slot];
              const aufnahme = eintrag ? aufnahmen[eintrag.aufnahmeId] : undefined;
              const pins = aufnahme ? (reviewPins[aufnahme.id] ?? []) : [];
              return (
                <div className="vis-report-kachel" key={slot} data-testid={`vis-report-kachel-${slot}`}>
                  {aufnahme ? (
                    <img src={aufnahme.dataUrl} alt={`Ansicht ${ANSICHT_SLOT_LABEL[slot]}`} />
                  ) : (
                    <div className="vis-report-kachel-bildlos">kein Snapshot</div>
                  )}
                  <div className="vis-report-kachel-fuss">
                    {ANSICHT_SLOT_LABEL[slot]}
                    {pins.length > 0 ? ` · ${pins.length} Review-Notiz${pins.length === 1 ? '' : 'en'}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="vis-report-label">Governance-Box</div>
          <div className="vis-report-governance" data-testid="vis-report-governance">
            <div>Abgeschlossene Render-Läufe: {fertig} fertig · {fehler} Fehler · {abgebrochen} abgebrochen</div>
            <div>Aktive «Für den Job»-Freigaben (Vis): {autoFreigaben}</div>
          </div>
        </section>

        <div className="vis-report-fuss">
          Ehrlich: dieser Bogen zeigt ausschliesslich Daten aus echten Laufzeit-Ständen dieser
          Sitzung (Snapshots/Render-Zähler/Freigaben) — keine erfundenen Werte, keine Attrappen.
        </div>
      </div>
    </div>
  );
}
