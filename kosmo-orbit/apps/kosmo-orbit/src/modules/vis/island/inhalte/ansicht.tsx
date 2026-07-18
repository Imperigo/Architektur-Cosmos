import { KButton, KIcon } from '@kosmo/ui';
import { useVisRuntime } from '../../vis-runtime';
import { visInhaltsRegistry } from './registry';
import '../vis-island.css';

/**
 * ANSICHT-Insel (PC1, `docs/V084-SPEZ.md` §5 W2, C-15) — Zoom/Fit + Minimap-
 * Toggle als Stufe-2-Popups (Raster-Snap/Routing sind `hatPopup:false`-
 * Sofort-Toggles, s. `vis-island-katalog.ts`, kein Registry-Eintrag nötig).
 * Beide Popups sind reine Fernauslöser (`sendeCanvasBefehl`/
 * `setCanvasMinimapManuell`) — die eigentliche Rechnung/Darstellung bleibt in
 * `NodeCanvas.tsx` (s. dortiger Kommentar zu `canvasBefehl`).
 */

function ZoomStufe2() {
  const sendeCanvasBefehl = useVisRuntime((s) => s.sendeCanvasBefehl);
  return (
    <div className="visisl-stufe2" data-testid="island-zoom-stufe2" onClick={(e) => e.stopPropagation()}>
      <div className="visisl-reihe">
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

function MinimapStufe2() {
  const minimapManuell = useVisRuntime((s) => s.canvasMinimapManuell);
  const setCanvasMinimapManuell = useVisRuntime((s) => s.setCanvasMinimapManuell);
  // Dieselbe Default-Schwelle wie bisher (`MINIMAP_KNOTEN_MIN`, NodeCanvas.tsx)
  // — hier nur die AKTUELL gewählte Übersteuerung angezeigt, kein zweiter
  // Schwellwert-Mechanismus.
  const beschriftung = minimapManuell === null ? 'Automatisch (ab 5 Nodes)' : minimapManuell ? 'Immer an' : 'Immer aus';
  return (
    <div className="visisl-stufe2" data-testid="island-minimap-stufe2" onClick={(e) => e.stopPropagation()}>
      <p className="visisl-hinweis">Übersichtskarte unten links am Canvas — {beschriftung}.</p>
      <div className="visisl-reihe">
        <KButton
          size="sm"
          tone="ghost"
          data-testid="island-minimap-an"
          aria-pressed={minimapManuell === true}
          onClick={() => setCanvasMinimapManuell(true)}
        >
          An
        </KButton>
        <KButton
          size="sm"
          tone="ghost"
          data-testid="island-minimap-aus"
          aria-pressed={minimapManuell === false}
          onClick={() => setCanvasMinimapManuell(false)}
        >
          Aus
        </KButton>
        <KButton
          size="sm"
          tone="ghost"
          data-testid="island-minimap-auto"
          aria-pressed={minimapManuell === null}
          onClick={() => setCanvasMinimapManuell(null)}
        >
          Automatisch
        </KButton>
      </div>
    </div>
  );
}

visInhaltsRegistry.registriere('zoom', { Stufe2: ZoomStufe2, Stufe3: ZoomStufe2 });
visInhaltsRegistry.registriere('minimap', { Stufe2: MinimapStufe2, Stufe3: MinimapStufe2 });
