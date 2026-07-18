import type { Sheet } from '@kosmo/kernel';
import { useProject } from '../../../../state/project-store';
import { usePublishRuntime } from '../../publish-runtime';
import { DossierPanel } from '../../DossierPanel';
import { PlankopfPanel } from '../../PlankopfPanel';
import { publishInhaltsRegistry } from './registry';
import '../publish-island.css';

/**
 * PROJEKT-Insel (PC3, `docs/V084-SPEZ.md` §5 W3, C-19) — Dossier
 * (`DossierPanel`) und Plankopf (Plancode/Phase/Büro-Stammdaten,
 * `PlankopfPanel`) — beide UNVERÄNDERT wiederverwendet (Bauauftrag «Islands
 * sind Zugänge, keine Nachbauten»). `PlankopfPanel` ist damit über ZWEI
 * Inseln erreichbar (hier UND `darstellung.tsx`s «Plankopf-Presets») — zwei
 * Zugänge zu einem Editor, dieselbe Instanz-Regel wie design/vis (keine
 * zweite Implementierung).
 */

function DossierStufe3() {
  return <DossierPanel onClose={() => {}} />;
}

function PlankopfStufe3() {
  const revision = useProject((s) => s.revision);
  void revision;
  const doc = useProject.getState().doc;
  const aktiverSheetId = usePublishRuntime((s) => s.aktiverSheetId);
  const selectedPlacementId = usePublishRuntime((s) => s.selectedPlacementId);
  const sheets = doc.byKind<Sheet>('sheet');
  const sheet = sheets.find((s) => s.id === aktiverSheetId) ?? sheets[0] ?? null;
  if (!sheet) {
    return (
      <div className="pubisl-stufe2" data-testid="island-plankopf-stufe2" onClick={(e) => e.stopPropagation()}>
        <p className="pubisl-hinweis">Erst ein Blatt anlegen (BLATT-Insel).</p>
      </div>
    );
  }
  return <PlankopfPanel sheetId={sheet.id} selectedPlacementId={selectedPlacementId} onClose={() => {}} />;
}

publishInhaltsRegistry.registriere('dossier', { Stufe2: DossierStufe3, Stufe3: DossierStufe3 });
publishInhaltsRegistry.registriere('plankopf', { Stufe2: PlankopfStufe3, Stufe3: PlankopfStufe3 });
