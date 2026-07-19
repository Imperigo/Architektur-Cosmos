import { KButton, KIcon, KSwitch } from '@kosmo/ui';
import type { Sheet } from '@kosmo/kernel';
import { useProject } from '../../../../state/project-store';
import { usePublishRuntime } from '../../publish-runtime';
import { PlankopfPanel } from '../../PlankopfPanel';
import { publishInhaltsRegistry } from './registry';
import '../publish-island.css';

/**
 * DARSTELLUNG-Insel (PC3, `docs/V084-SPEZ.md` §5 W3, C-19) — Zoom ±/Fit
 * (NEU, C-19), Massstab (die bisherige «Auswahl»-Massstab-Auswahl),
 * Plankopf-Presets (`PlankopfPanel`, unverändert wiederverwendet) und
 * Sichtbarkeit (PB3, v0.8.5, `docs/V085-SPEZ.md` §3 E5 + §7 C-19 — echte
 * Bemassungs-/Zonen-Toggles; PA3, v0.8.6 §3 E3 + §7 C-6/C-7 — dritter
 * «Raumtypen»-Toggle, UNABHÄNGIG von «Zonen» (Parzellen-/Nachbarkontext
 * bleibt unverändert), s. `SichtbarkeitStufe2` unten).
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

/**
 * PB3 (v0.8.5, `docs/V085-SPEZ.md` §3 E5 + §7 C-19) — «Sichtbarkeit»: zwei
 * ECHTE Blatt-Darstellungs-Toggles («Bemassung»/«Zonen»), Zustand aus
 * `publish-runtime.ts` (Kopfkommentar dort begründet Store-Wahl + Mechanik).
 * Muster identisch zum bisherigen Manuell-Modus-Vorschau-Paar
 * (`PublishWorkspace.tsx`s `KToolGruppe label="Vorschau (nur Anzeige)"`,
 * `KSwitch` statt nackter Checkbox) — hier aber ECHTE Wirkung auf dem Blatt
 * (BlattCanvas.tsx), nicht nur Papierrand-Dekoration.
 */
function SichtbarkeitStufe2() {
  const zeigeBemassung = usePublishRuntime((s) => s.zeigeBemassung);
  const setZeigeBemassung = usePublishRuntime((s) => s.setZeigeBemassung);
  const zeigeZonen = usePublishRuntime((s) => s.zeigeZonen);
  const setZeigeZonen = usePublishRuntime((s) => s.setZeigeZonen);
  const zeigeRaumtypen = usePublishRuntime((s) => s.zeigeRaumtypen);
  const setZeigeRaumtypen = usePublishRuntime((s) => s.setZeigeRaumtypen);
  return (
    <div className="pubisl-stufe2" data-testid="island-sichtbarkeit-stufe2" onClick={(e) => e.stopPropagation()}>
      <div className="pubisl-reihe">
        <KSwitch
          data-testid="island-sichtbarkeit-bemassung"
          checked={zeigeBemassung}
          onChange={(e) => setZeigeBemassung(e.target.checked)}
          label="Bemassung"
          title="Assoziative Bemassung platzierter Grundriss-Ansichten auf dem Blatt zeigen/ausblenden"
        />
        <KSwitch
          data-testid="island-sichtbarkeit-zonen"
          checked={zeigeZonen}
          onChange={(e) => setZeigeZonen(e.target.checked)}
          label="Zonen"
          title="Parzellen-/Nachbarkontext-Zonenflächen platzierter Ansichten auf dem Blatt zeigen/ausblenden"
        />
        <KSwitch
          data-testid="island-sichtbarkeit-raumtypen"
          checked={zeigeRaumtypen}
          onChange={(e) => setZeigeRaumtypen(e.target.checked)}
          label="Raumtypen"
          title="Raumtyp-Füllflächen platzierter Grundriss-Ansichten auf dem Blatt zeigen/ausblenden (unabhängig von «Zonen»)"
        />
      </div>
    </div>
  );
}

publishInhaltsRegistry.registriere('zoom', { Stufe2: ZoomStufe2, Stufe3: ZoomStufe2 });
publishInhaltsRegistry.registriere('massstab', { Stufe2: MassstabStufe2, Stufe3: MassstabStufe2 });
publishInhaltsRegistry.registriere('plankopf-presets', { Stufe2: PlankopfPresetsStufe3, Stufe3: PlankopfPresetsStufe3 });
publishInhaltsRegistry.registriere('sichtbarkeit', { Stufe2: SichtbarkeitStufe2, Stufe3: SichtbarkeitStufe2 });
