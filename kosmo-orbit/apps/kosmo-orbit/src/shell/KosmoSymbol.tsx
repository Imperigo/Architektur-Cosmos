import { useRef, useState } from 'react';
import { greeting } from '@kosmo/ai';
import { useOverlaySchliessen } from '@kosmo/ui';
import { useKosmoStatus, kurzform } from '../state/kosmo-status';
import { useProject } from '../state/project-store';
import { KosmoOrb } from './KosmoOrb';
import './orbit-065.css';
import './kosmo-symbol.css';

export interface KosmoSymbolProps {
  /** Öffnet das grosse Panel (Klick ODER Tastatur — natives <button>). */
  onOpen: () => void;
  /**
   * v0.7.4 P3 (Owner-Wunschfeature «Kosmo-Orb ins Dock»): wenn `true`, lässt
   * das Symbol die `position:fixed`-Hülle weg und sitzt stattdessen im
   * normalen Fluss des aufrufenden Layouts (hier: der rechte Slot in
   * `BodenDock.tsx`). Testids (`kosmo-symbol`/`kosmo-mini`) und die gesamte
   * Panel-Logik (Hover/Fokus-Popup, Klick öffnet) bleiben WÖRTLICH
   * unverändert — nur die äussere Positionierung entfällt.
   */
  eingebettet?: boolean;
}

/**
 * KosmoSymbol — das schwebende Copilot-Symbol (K11, Owner-Befund wörtlich:
 * «Kosmo als Copilot-Symbol, nicht Dauerchat: Hover = Mini-Popup (letzte
 * Aktivität), Klick = entfaltet, volle Interaktion = grosses Panel; Animation
 * wenn Kosmo arbeitet»). Rendert NUR, solange das grosse Panel zu ist
 * (App.tsx) — auf der Zentrale/Home frei schwebend unten rechts (fixed,
 * über dem Inhalt); in einer Modul-Ansicht als `eingebettet`-Variante im
 * rechten Slot des Boden-Docks (`BodenDock.tsx`, v0.7.4 P3) — so existiert
 * je Screen-Zustand genau EINE Instanz mit `data-testid="kosmo-symbol"`.
 *
 * Arbeitet Kosmo gerade (Sende-Lebenszyklus, `state/kosmo-status.ts`),
 * pulsiert das Symbol per CSS-Klasse (`.k-kosmo-symbol-beschaeftigt`,
 * aura.css) — der globale `prefers-reduced-motion`-Block in aura.css
 * killt jede Animation/Transition, auch diese, ohne Sonderfall hier.
 * `k-kosmo-arbeitet` (aura.css) bleibt damit als Fallback bestehen, auch
 * wenn der Store gerade keinen granularen `zustand` liefert.
 *
 * v0.7.2 §6 (Paket 06): das Innere des Knopfs ist jetzt der wiederverwendbare
 * `KosmoOrb` (`shell/KosmoOrb.tsx`) statt des statischen `OrbitMark` — er
 * zeigt den feingranularen `zustand` (idle/thinking/listening/…/takeover)
 * über `data-zustand`. Testids/DOM-Vertrag (`kosmo-symbol`, `kosmo-mini`,
 * Symbol↔Panel) bleiben exakt unverändert, nur das Icon-Innere wechselt.
 */
export function KosmoSymbol({ onOpen, eingebettet = false }: KosmoSymbolProps) {
  const beschaeftigt = useKosmoStatus((s) => s.beschaeftigt);
  const zustand = useKosmoStatus((s) => s.zustand);
  const letzteAktivitaet = useKosmoStatus((s) => s.letzteAktivitaet);
  const [zeigePopup, setZeigePopup] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // v0.8.4 W1 / PA4 (Spez §3 E3, Pflicht-Konsument #1): Esc schliesst das
  // Mini-Popup app-weit; der Hover-Rückklapp ersetzt das bisherige SOFORTIGE
  // `onMouseLeave→setZeigePopup(false)` durch einen ~1s-Timer (Owner-Befund
  // §1.1: «Pille verschwindet ~1s nach Weg-Hover»), der beim erneuten
  // Betreten storniert wird. `ref` = der WRAPPER (Trigger + Popup als
  // Kinder), nicht nur der Knopf — sonst würde ein Hover auf den Popup-Text
  // selbst (die Popup sitzt absolut ÜBER dem Knopf, `kosmo-symbol.css`) als
  // "verlassen" missverstanden. `onClose` ist idempotent (State-Setter),
  // ein zusätzlicher Ruf auf ein bereits geschlossenes Popup ist harmlos.
  useOverlaySchliessen(wrapperRef, () => setZeigePopup(false), {
    esc: true,
    aussenklick: true,
    hoverRueckklappMs: 1000,
  });

  // Fallback fürs Mini-Popup, solange Kosmo noch NIE geantwortet hat (Panel
  // seit Programmstart nie geöffnet): dieselbe Begrüssungszeile, die das
  // Panel selbst beim ersten Mount zeigen würde (KosmoPanel.tsx) — kein
  // erfundener Platzhaltertext.
  const begruessung = () => {
    const { doc } = useProject.getState();
    return greeting(new Date(), doc.settings.projectName, {
      walls: doc.byKind('wall').length,
      storeys: doc.byKind('storey').length,
    });
  };
  const popupText = letzteAktivitaet ?? kurzform(begruessung());

  return (
    <div
      ref={wrapperRef}
      className={`ks-wrapper ${eingebettet ? 'ks-wrapper--eingebettet' : 'ks-wrapper--frei'}`}
    >
      {zeigePopup && (
        <div
          data-testid="kosmo-mini"
          role="status"
          className="k-einblenden ks-popup"
        >
          <div className="ks-popup-titel">
            {beschaeftigt ? 'Kosmo arbeitet …' : 'Kosmo'}
          </div>
          {popupText}
        </div>
      )}
      <button
        data-testid="kosmo-symbol"
        onClick={onOpen}
        onMouseEnter={() => setZeigePopup(true)}
        onFocus={() => setZeigePopup(true)}
        onBlur={() => setZeigePopup(false)}
        aria-label={beschaeftigt ? 'Kosmo öffnen — arbeitet gerade' : 'Kosmo öffnen'}
        title="Kosmo"
        // Aufgabe 3 (0.6.6): `.k-druck` zusätzlich zu den bestehenden
        // `k-kosmo-symbol*`-Klassen (Puls-Animation bleibt unverändert).
        className={
          beschaeftigt
            ? 'k-kosmo-symbol k-kosmo-symbol-beschaeftigt k-druck ks-knopf'
            : 'k-kosmo-symbol k-druck ks-knopf'
        }
      >
        <KosmoOrb zustand={zustand} size={30} />
      </button>
    </div>
  );
}
