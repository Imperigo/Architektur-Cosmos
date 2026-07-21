import { siaPhaseLabel, type SiaPhase } from '@kosmo/kernel';
import { sia112Gruppe, type Sia112Gruppe } from '../state/orbit-rang';
import { useProject } from '../state/project-store';
import './orbit-065.css';

/**
 * V0.7.2 W2-C (Paket 03, `docs/V072-VISUELLES-UPDATE-SPEZ.md` §4 «Phasen &
 * Ordnung») — Segmented-Pill der 5 SIA-112-Gruppen (nicht die 8 feineren
 * `SiaPhase`-Teilphasen — mehrere Teilphasen teilen eine Gruppe, s.
 * `sia112Gruppe()`). Ergänzt `sia-phase-select` (fein, in KosmoDesign) um
 * einen groben Schnellzugriff — beide bleiben unverändert funktionsfähig
 * nebeneinander (Harter Vertrag, Spec §11): dieselbe `design.siaPhaseSetzen`-
 * Quelle, kein Zweit-Zustand.
 *
 * E-K5 (`docs/V0812-SPEZ.md`, Sanktion 4, 21.07.2026): die Phase ist eine
 * PROJEKT-Eigenschaft, kein App-weiter Kopf-Schnellzugriff mehr — diese
 * Komponente rendert seit E-K5 NICHT mehr im `App.tsx`-Header/`.app-heim-
 * werkzeuge`, sondern eingebettet in den Projekt-Einstellungen
 * (`shell/Einstellungen.tsx`, Sektion `einstellungen-phase`, dort auch der
 * neue «Transformieren»-Bestätigungsweg). Komponente/Testids/Verhalten
 * bleiben wörtlich gleich (kein Funktionsverlust) — nur der Mount-Ort
 * wechselt; migrierte Bestands-Specs: `e2e/phasen-leiste.spec.ts`.
 *
 * Klick setzt IMMER die REPRÄSENTATIVE Phase der Gruppe (Spec §4) — auch
 * wenn die Gruppe wegen einer feineren Teilphase (z. B. `bewilligung` in
 * Gruppe 3) bereits aktiv ist: ein Klick auf «3 PROJEKTIERUNG» normalisiert
 * dann bewusst auf `bauprojekt`. Segmente sind reine Pills, kein Toggle/
 * Fächer (anders als `OrbitStart.tsx`) — jeder Klick schreibt.
 */

interface Segment {
  gruppe: Sia112Gruppe;
  /** Ziffer allein — bleibt auch im kollabierten Zustand sichtbar (s. `.orbit065-phasen-rest`-Media-Query, orbit-065.css). */
  nummer: string;
  /** Rest des Labels MIT führendem Leerzeichen — zusammen mit `nummer` ergibt
   *  sich exakt dasselbe Textbild wie vorher («1 STRATEGIE»), nur auf zwei
   *  Spans verteilt (kein Verhaltens-/Text-Vertragsbruch: `textContent`
   *  ignoriert `display:none`, s. Kopfkommentar unten). */
  rest: string;
  repraesentativePhase: SiaPhase;
}

const SEGMENTE: readonly Segment[] = [
  { gruppe: 1, nummer: '1', rest: ' STRATEGIE', repraesentativePhase: 'strategie' },
  { gruppe: 2, nummer: '2', rest: ' VORSTUDIE', repraesentativePhase: 'wettbewerb' },
  { gruppe: 3, nummer: '3', rest: ' PROJEKTIERUNG', repraesentativePhase: 'bauprojekt' },
  { gruppe: 4, nummer: '4', rest: ' AUSSCHREIBUNG', repraesentativePhase: 'ausschreibung' },
  { gruppe: 5, nummer: '5', rest: ' REALISIERUNG', repraesentativePhase: 'ausfuehrung' },
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
            {/* Kritik-2-Auflage (11.07.2026, Header-Kompaktierung): unter
                ~1500px Viewport blendet `orbit-065.css` `.orbit065-phasen-
                rest` per Media-Query aus — übrig bleibt die Ziffer-Pille
                («1»…«5»), das volle Label bleibt als `title` (oben) erreichbar.
                `display:none` wirkt NUR visuell: `textContent` (worauf
                Playwrights `toContainText`/`toHaveText` bauen) ignoriert
                CSS-Sichtbarkeit — der Bestands-Vertrag `phasen-leiste.spec.ts`
                (volles Label im Textinhalt) bleibt darum unverändert wahr. */}
            <span className="orbit065-phasen-nummer">{segment.nummer}</span>
            <span className="orbit065-phasen-rest">{segment.rest}</span>
          </button>
        );
      })}
    </div>
  );
}
