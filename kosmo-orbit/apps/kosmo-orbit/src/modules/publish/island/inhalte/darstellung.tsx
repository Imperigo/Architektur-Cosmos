import { KButton, KIcon } from '@kosmo/ui';
import type { Sheet } from '@kosmo/kernel';
import { useProject } from '../../../../state/project-store';
import { usePublishRuntime } from '../../publish-runtime';
import { PlankopfPanel } from '../../PlankopfPanel';
import { publishInhaltsRegistry } from './registry';
import '../publish-island.css';

/**
 * DARSTELLUNG-Insel (PC3, `docs/V084-SPEZ.md` §5 W3, C-19) — Zoom ±/Fit
 * (NEU, C-19), Massstab (die bisherige «Auswahl»-Massstab-Auswahl) und
 * Plankopf-Presets (`PlankopfPanel`, unverändert wiederverwendet).
 *
 * **Zoom** ist ein reiner Fernauslöser (`sendeCanvasBefehl`) — die
 * eigentliche Rechnung bleibt in `island/BlattZoomBuehne.tsx` (Muster
 * `vis/island/inhalte/ansicht.tsx`s `ZoomStufe2` → `NodeCanvas.tsx`).
 */

const SCALES = [50, 100, 200, 500];

function ZoomStufe2() {
  const sendeCanvasBefehl = usePublishRuntime((s) => s.sendeCanvasBefehl);
  return (
    <div className="pubisl-stufe2" data-testid="island-zoom-stufe2" onClick={(e) => e.stopPropagation()}>
      <div className="pubisl-reihe">
        <KButton size="sm" tone="ghost" data-testid="island-zoom-minus" title="Kleiner" onClick={() => sendeCanvasBefehl('zoom-out')}>
          <KIcon name="zoom-minus" size={16} title="Kleiner" />
        </KButton>
        <KButton size="sm" tone="ghost" data-testid="island-zoom-fit" title="Einpassen" onClick={() => sendeCanvasBefehl('zoom-fit')}>
          <KIcon name="fit" size={16} title="Einpassen" />
        </KButton>
        <KButton size="sm" tone="ghost" data-testid="island-zoom-plus" title="Grösser" onClick={() => sendeCanvasBefehl('zoom-in')}>
          <KIcon name="zoom-plus" size={16} title="Grösser" />
        </KButton>
      </div>
    </div>
  );
}

function MassstabStufe2() {
  const revision = useProject((s) => s.revision);
  void revision;
  const runCommand = useProject((s) => s.runCommand);
  const doc = useProject.getState().doc;
  const aktiverSheetId = usePublishRuntime((s) => s.aktiverSheetId);
  const selectedPlacementId = usePublishRuntime((s) => s.selectedPlacementId);
  const sheets = doc.byKind<Sheet>('sheet');
  const sheet = sheets.find((s) => s.id === aktiverSheetId) ?? sheets[0] ?? null;
  const pl = sheet && selectedPlacementId ? sheet.placements.find((p) => p.id === selectedPlacementId) : undefined;

  if (!sheet || !pl) {
    return (
      <div className="pubisl-stufe2" data-testid="island-massstab-stufe2" onClick={(e) => e.stopPropagation()}>
        <p className="pubisl-hinweis">Erst eine platzierte Ansicht auf dem Blatt auswählen.</p>
      </div>
    );
  }

  return (
    <div className="pubisl-stufe2" data-testid="island-massstab-stufe2" onClick={(e) => e.stopPropagation()}>
      <div className="pubisl-chip-reihe">
        {(SCALES.includes(pl.scale) ? SCALES : [pl.scale, ...SCALES]).map((sc) => (
          <KButton
            key={sc}
            size="sm"
            tone={pl.scale === sc ? 'accent' : 'ghost'}
            data-testid={`island-massstab-${sc}`}
            onClick={() => runCommand('publish.ansichtAnpassen', { sheetId: sheet.id, placementId: pl.id, scale: sc })}
          >
            1:{sc}
          </KButton>
        ))}
      </div>
    </div>
  );
}

function PlankopfPresetsStufe3() {
  const revision = useProject((s) => s.revision);
  void revision;
  const doc = useProject.getState().doc;
  const aktiverSheetId = usePublishRuntime((s) => s.aktiverSheetId);
  const selectedPlacementId = usePublishRuntime((s) => s.selectedPlacementId);
  const sheets = doc.byKind<Sheet>('sheet');
  const sheet = sheets.find((s) => s.id === aktiverSheetId) ?? sheets[0] ?? null;
  if (!sheet) {
    return (
      <div className="pubisl-stufe2" data-testid="island-plankopf-presets-stufe2" onClick={(e) => e.stopPropagation()}>
        <p className="pubisl-hinweis">Erst ein Blatt anlegen (BLATT-Insel).</p>
      </div>
    );
  }
  return <PlankopfPanel sheetId={sheet.id} selectedPlacementId={selectedPlacementId} onClose={() => {}} />;
}

publishInhaltsRegistry.registriere('zoom', { Stufe2: ZoomStufe2, Stufe3: ZoomStufe2 });
publishInhaltsRegistry.registriere('massstab', { Stufe2: MassstabStufe2, Stufe3: MassstabStufe2 });
publishInhaltsRegistry.registriere('plankopf-presets', { Stufe2: PlankopfPresetsStufe3, Stufe3: PlankopfPresetsStufe3 });
