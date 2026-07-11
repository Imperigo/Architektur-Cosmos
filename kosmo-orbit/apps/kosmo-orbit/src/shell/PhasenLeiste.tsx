import { siaPhaseLabel, type SiaPhase } from '@kosmo/kernel';
import { sia112Gruppe, type Sia112Gruppe } from '../state/orbit-rang';
import { useProject } from '../state/project-store';
import './orbit-065.css';

/**
 * V0.7.2 W2-C (Paket 03, `docs/V072-VISUELLES-UPDATE-SPEZ.md` §4 «Phasen &
 * Ordnung») — Segmented-Pill im Header: die 5 SIA-112-Gruppen (nicht die 8
 * feineren `SiaPhase`-Teilphasen — mehrere Teilphasen teilen eine Gruppe,
 * s. `sia112Gruppe()`). Ergänzt `sia-phase-select` (fein, in KosmoDesign)
 * um einen groben, App-weiten Schnellzugriff — beide bleiben unverändert
 * funktionsfähig nebeneinander (Harter Vertrag, Spec §11): dieselbe
 * `design.siaPhaseSetzen`-Quelle, kein Zweit-Zustand.
 *
 * Klick setzt IMMER die REPRÄSENTATIVE Phase der Gruppe (Spec §4) — auch
 * wenn die Gruppe wegen einer feineren Teilphase (z. B. `bewilligung` in
 * Gruppe 3) bereits aktiv ist: ein Klick auf «3 PROJEKTIERUNG» normalisiert
 * dann bewusst auf `bauprojekt`. Segmente sind reine Pills, kein Toggle/
 * Fächer (anders als `OrbitStart.tsx`) — jeder Klick schreibt.
 */

interface Segment {
  gruppe: Sia112Gruppe;
  label: string;
  repraesentativePhase: SiaPhase;
}

const SEGMENTE: readonly Segment[] = [
  { gruppe: 1, label: '1 STRATEGIE', repraesentativePhase: 'strategie' },
  { gruppe: 2, label: '2 VORSTUDIE', repraesentativePhase: 'wettbewerb' },
  { gruppe: 3, label: '3 PROJEKTIERUNG', repraesentativePhase: 'bauprojekt' },
  { gruppe: 4, label: '4 AUSSCHREIBUNG', repraesentativePhase: 'ausschreibung' },
  { gruppe: 5, label: '5 REALISIERUNG', repraesentativePhase: 'ausfuehrung' },
];

export function PhasenLeiste() {
  // Muster wie `DesignWorkspace.tsx`: `revision` als Reactivity-Trigger,
  // `doc` selbst über `getState()` gelesen (mutable Store, s. dortiger
  // Kommentar) — jede `runCommand`-Mutation erhöht `revision` und löst so
  // einen Re-Render mit frischem `doc.settings.siaPhase` aus.
  const revision = useProject((s) => s.revision);
  const runCommand = useProject((s) => s.runCommand);
  const aktuellePhase = useProject.getState().doc.settings.siaPhase;
  const aktiveGruppe = sia112Gruppe(aktuellePhase);
  void revision;

  return (
    <div className="orbit065-phasen-leiste" data-testid="phasen-leiste" role="group" aria-label="SIA-112-Phase">
      {SEGMENTE.map((segment) => {
        const aktiv = segment.gruppe === aktiveGruppe;
        return (
          <button
            key={segment.gruppe}
            type="button"
            className={`orbit065-phasen-segment k-druck${aktiv ? ' orbit065-phasen-segment--aktiv' : ''}`}
            data-testid={`phasen-leiste-${segment.gruppe}`}
            aria-pressed={aktiv}
            title={aktiv ? siaPhaseLabel(aktuellePhase) : siaPhaseLabel(segment.repraesentativePhase)}
            onClick={() => runCommand('design.siaPhaseSetzen', { siaPhase: segment.repraesentativePhase })}
          >
            {aktiv && <span className="orbit065-phasen-signal" aria-hidden />}
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
