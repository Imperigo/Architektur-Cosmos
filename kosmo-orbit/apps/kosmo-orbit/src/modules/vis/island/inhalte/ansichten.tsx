import { GespeicherteAnsichten } from '../../GespeicherteAnsichten';
import { visInhaltsRegistry } from './registry';
import '../vis-island.css';

/**
 * ANSICHT-Insel — Gespeicherte Ansichten (P-B1/E4, `docs/V0811-SPEZ.md` §2
 * E4, Owner-Wahl «Ansichten + Legende»).
 *
 * Insel-Äquivalent zum Manuell-only-Fund des P-B1-Audits (0.8.10-Planung,
 * `wissen/training/claude/lehren/v0.8.10.md` §2 «Audit vor Rückbau»):
 * `GespeicherteAnsichten.tsx` (drei feste Slots ISO/NORD/DETAIL über echten
 * Viewport-Aufnahmen + Review-Pins) lebte bisher NUR im Manuell-Tab
 * `VisWorkspace.tsx:479` (`tab === 'ansichten'`). Diese Datei IMPORTIERT die
 * bestehende Komponente/Logik unverändert (kein Copy — derselbe
 * `useVisRuntime`-Zustand, dieselben Commands/Store-Funktionen
 * `speichereAnsicht`/`entferneAnsicht`/`fuegeReviewPinHinzu`) und verpackt
 * sie nur im Insel-Popup-Rahmen (Muster `inhalte/graph.tsx`/`ansicht.tsx`:
 * reine Registry-Komponente, kein Prop-Pfad).
 *
 * `GespeicherteAnsichten` trägt bereits vollständige eigene testids
 * (`gespeicherte-ansichten`, `ansicht-slot-<slot>-*`, `review-pin-*`) — die
 * bleiben unverändert (dieselbe Komponente, zwei Einbettungsorte). Der
 * NEUE Wrapper dieser Datei trägt zusätzlich `visisl-ansichten-*`-testids
 * (Bauauftrag Punkt 1) für den insel-eigenen Popup-Rahmen.
 */

function AnsichtenStufe2() {
  return (
    <div
      className="visisl-stufe2"
      data-testid="visisl-ansichten-stufe2"
      onClick={(e) => e.stopPropagation()}
    >
      <GespeicherteAnsichten />
    </div>
  );
}

visInhaltsRegistry.registriere('ansichten', { Stufe2: AnsichtenStufe2, Stufe3: AnsichtenStufe2 });
