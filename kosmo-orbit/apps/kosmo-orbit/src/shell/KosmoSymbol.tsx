import { useRef, useState } from 'react';
import { greeting } from '@kosmo/ai';
import { useOverlaySchliessen } from '@kosmo/ui';
import { useKosmoStatus, kurzform } from '../state/kosmo-status';
import { useProject } from '../state/project-store';
import { KosmoOrb, useKlickVsDoppelklick } from './KosmoOrb';
// PB4 (`docs/V084-SPEZ.md` §3 E2, reiner Lese-Import — `KosmoPanel.tsx`
// bleibt unverändert, s. Bauauftrag «nur falls Doppelklick-Weg es braucht»):
// derselbe benannte Export, den `island/KosmoOrb.tsx` schon für ihre
// Konversationskarte nutzt (Mock-Provider-Hinweis, s. dortiger
// Kopfkommentar) — kein zweiter Provider-Zustand.
import { loadSettings } from './KosmoPanel';
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
 *
 * **PB4 (`docs/V084-SPEZ.md` §3 E2 «Orb-Gesetz»):** Einfachklick öffnet ab
 * jetzt NICHT mehr direkt das grosse Panel, sondern dieselbe Art
 * Konversationskarte, die `island/KosmoOrb.tsx` bereits zeigt (Vorschlagstext
 * + 2 Aktions-Chips + Eingabezeile, `data-testid="kosmo-karte"`) —
 * Doppelklick öffnet das Panel direkt (`onOpen`, neu). Die Unterscheidung
 * läuft über den geteilten `useKlickVsDoppelklick`-Hook (`./KosmoOrb`,
 * derselbe, den `island/KosmoOrb.tsx` nutzt — EIN Zeitwert app-weit). Esc/
 * Aussenklick schliessen die Karte (`useOverlaySchliessen`, `ref`=derselbe
 * `wrapperRef` wie das Mini-Popup — ein Klick auf den Trigger-Knopf selbst
 * zählt damit nie als "aussen", exakt dasselbe Prinzip wie beim Popup oben).
 */
export function KosmoSymbol({ onOpen, eingebettet = false }: KosmoSymbolProps) {
  const beschaeftigt = useKosmoStatus((s) => s.beschaeftigt);
  const zustand = useKosmoStatus((s) => s.zustand);
  const letzteAktivitaet = useKosmoStatus((s) => s.letzteAktivitaet);
  const [zeigePopup, setZeigePopup] = useState(false);
  const [zeigeKarte, setZeigeKarte] = useState(false);
  const [eingabe, setEingabe] = useState('');
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

  // PB4 (E3-Rollout-Doku, `overlay-schliessen.ts`-Kopfkommentar «Orb-Karte»):
  // eigener, zweiter Hook-Ruf für die Konversationskarte — esc+aussenklick,
  // bewusst KEIN `hoverRueckklappMs` (die Karte schliesst nur aktiv, nicht
  // durch Weg-Hover; dafür kennt die E2-Tabelle den Einfachklick). Derselbe
  // `wrapperRef` wie oben (statt nur der Karte selbst): ein Klick auf den
  // Trigger-Knopf, während die Karte offen ist, darf sie nicht per
  // Aussenklick-Handler sofort wieder zuklappen, bevor der eigene
  // Klick-Handler unten überhaupt zum Zug kommt.
  useOverlaySchliessen(wrapperRef, () => setZeigeKarte(false), {
    esc: true,
    aussenklick: true,
  });

  const { onClick: karteKlick, onDoubleClick: panelDoppelklick } = useKlickVsDoppelklick(
    () => {
      setZeigePopup(false);
      setZeigeKarte(true);
    },
    () => {
      setZeigeKarte(false);
      setEingabe('');
      onOpen();
    },
  );

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
  const vorschlagText = letzteAktivitaet ?? kurzform(begruessung());
  const mockAktiv = loadSettings().provider === 'mock';

  function handoff(): void {
    setZeigeKarte(false);
    setEingabe('');
    onOpen();
  }

  return (
    <div
      ref={wrapperRef}
      className={`ks-wrapper ${eingebettet ? 'ks-wrapper--eingebettet' : 'ks-wrapper--frei'}`}
    >
      {zeigePopup && !zeigeKarte && (
        <div
          data-testid="kosmo-mini"
          role="status"
          className="k-einblenden ks-popup"
        >
          <div className="ks-popup-titel">
            {beschaeftigt ? 'Kosmo arbeitet …' : 'Kosmo'}
          </div>
          {vorschlagText}
        </div>
      )}
      {zeigeKarte && (
        <div data-testid="kosmo-karte" className="k-einblenden ks-karte">
          <button
            type="button"
            className="ks-karte-schliessen"
            data-testid="kosmo-karte-schliessen"
            aria-label="Schliessen"
            onClick={() => setZeigeKarte(false)}
          >
            ✕
          </button>
          <div className="ks-karte-titel">{beschaeftigt ? 'Kosmo arbeitet …' : 'Kosmo'}</div>
          <p className="ks-karte-text" data-testid="kosmo-karte-text">
            {vorschlagText}
          </p>
          {mockAktiv ? (
            <p className="ks-karte-hinweis" data-testid="kosmo-karte-mock-hinweis">
              Mock-Provider aktiv — echte Antworten brauchen einen konfigurierten Provider (Einstellungen →
              Werkzeuge einrichten).
            </p>
          ) : null}
          <div className="ks-karte-chips">
            <button type="button" className="ks-karte-chip" data-testid="kosmo-karte-antworten" onClick={handoff}>
              Antworten
            </button>
            <button
              type="button"
              className="ks-karte-chip"
              data-testid="kosmo-karte-spaeter"
              onClick={() => setZeigeKarte(false)}
            >
              Später
            </button>
          </div>
          <form
            className="ks-karte-eingabe-zeile"
            onSubmit={(e) => {
              e.preventDefault();
              handoff();
            }}
          >
            <input
              type="text"
              className="ks-karte-eingabe"
              data-testid="kosmo-karte-eingabe"
              placeholder="An Kosmo …"
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              aria-label="Nachricht an Kosmo"
            />
            <button
              type="submit"
              className="ks-karte-senden"
              data-testid="kosmo-karte-senden"
              aria-label="Weiter im Kosmo-Panel"
            >
              ➔
            </button>
          </form>
        </div>
      )}
      <button
        data-testid="kosmo-symbol"
        onClick={karteKlick}
        onDoubleClick={panelDoppelklick}
        onMouseEnter={() => setZeigePopup(true)}
        onFocus={() => setZeigePopup(true)}
        onBlur={() => setZeigePopup(false)}
        aria-label={
          beschaeftigt
            ? 'Kosmo öffnen — arbeitet gerade'
            : 'Kosmo öffnen (Klick: Karte, Doppelklick: Panel)'
        }
        aria-expanded={zeigeKarte}
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
