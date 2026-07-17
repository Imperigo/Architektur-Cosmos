import { useState } from 'react';
import { greeting } from '@kosmo/ai';
import { kurzform, useKosmoStatus } from '../../../state/kosmo-status';
import { useProject } from '../../../state/project-store';
import { loadSettings } from '../../../shell/KosmoPanel';
import { useReduzierteBewegung } from './IslandShell';
import './island.css';

/**
 * Kosmo-Orb (PD4 Abschluss, `docs/ISLAND-UI-SPEZ.md` §1-Tabelle/§4.3 Zeile 5)
 * — der goldene Orb unten rechts im Island-Modus (52px, `--f-gold`, Puls
 * `--k-insel-orb-puls` 2.4s, `reduced-motion`: kein Puls). Bleibt bewusst
 * AUSSERHALB der vier Islands (§1: «Bleibt ausserhalb der vier Islands»).
 *
 * **Ablöst den PD3c-Notbehelf:** bis PD4 sprang hier `shell/KosmoSymbol.tsx`
 * (App.tsx, `bodenDockAusgeblendet`-Zweig) ein, das Klick DIREKT das grosse
 * Panel öffnete (`onOpen`). Diese Komponente ist der reale, spezifizierte
 * Kosmo-Orb: Klick öffnet zuerst eine 320px-Konversationskarte
 * (Vorschlagstext + 2 Aktions-Chips + Eingabezeile), nicht sofort das Panel
 * — `App.tsx` rendert `KosmoSymbol` darum nur noch auf `screen==='home'`,
 * diese Komponente übernimmt den Zugang im Island-Modus der design-Station
 * (`DesignWorkspace.tsx`, `designOberflaeche==='island'`-Zweig).
 *
 * **Echter Companion-Vorschlag, kein Platzhaltertext:** dieselbe Quelle wie
 * `KosmoSymbol.tsx`s Mini-Popup — `useKosmoStatus().letzteAktivitaet` (von
 * `KosmoPanel.tsx` bei jeder echten Kosmo-Antwort gesetzt, `setzeLetzte
 * Aktivitaet`), und solange das Panel noch nie geöffnet war, exakt dieselbe
 * `greeting()`-Begrüssung (`@kosmo/ai`), die `KosmoPanel.tsx` selbst beim
 * ersten Mount als erste Chat-Bubble zeigen würde — echte Projektzahlen
 * (Wände/Geschosse aus dem aktuellen Doc), kein erfundener Satz. Diese Datei
 * dupliziert damit bewusst dasselbe kleine Fallback-Muster, das `KosmoSymbol.
 * tsx` bereits nutzt (`begruessung()`/`popupText` dort) — `KosmoSymbol.tsx`
 * liegt ausserhalb des PD4-Dateikreises (`island/**`), ein gemeinsamer Helfer
 * hätte eine dritte Datei ausserhalb dieses Kreises gebraucht.
 *
 * **Ehrlichkeit vor Politur (Provider):** `loadSettings()` ist ein
 * bestehender, benannter Export aus `shell/KosmoPanel.tsx` (reiner Lese-
 * Import — diese Datei bleibt laut Bauauftrag NUR-lesend, wird hier nicht
 * verändert). Steht der Mock-Provider, sagt die Karte das offen, statt eine
 * echte Antwortfähigkeit vorzutäuschen.
 *
 * **Eingabezeile/«Antworten»-Chip — der `onKosmoOeffnen`/`requestKosmoFokus`-
 * Weg (Bauauftrag, wörtlich):** `onKosmoOeffnen` ist derselbe Callback, den
 * `DesignWorkspace.tsx` schon von `App.tsx` bekommt (K16 A6, dort verdrahtet
 * mit `requestKosmoFokus(); setKosmoOpen(true);`, `App.tsx` Zeile ~745) —
 * diese Komponente ruft ihn unverändert auf, kein zweiter Öffnen-Weg. Weil
 * `shell/KosmoPanel.tsx` NUR-lesend bleibt (Bauauftrag), kennt das grosse
 * Panel keinen Vorbefüllungs-Mechanismus für einen Entwurfstext — ein
 * getippter Entwurf hier trägt darum NICHT automatisch ins Panel hinüber;
 * «Antworten»/Absenden öffnen es fokussiert und bereit, der Text wird dort
 * neu eingegeben. Ehrlich, statt eine Übergabe vorzutäuschen, die diese
 * Datei nicht bauen darf.
 */

export interface KosmoOrbProps {
  /** K16 A6/DesignWorkspace-Weg (s. Kopfkommentar) — optional, damit ein
   *  isoliert gemounteter Test die Komponente ohne Handoff prüfen kann. */
  onKosmoOeffnen?: () => void;
}

/** Echte Begrüssung als Fallback, solange Kosmo noch nie geantwortet hat
 *  (s. Kopfkommentar) — ausgelagert, damit sie nicht bei jedem Render neu
 *  inline gebaut werden muss. */
function begruessung(): string {
  const { doc } = useProject.getState();
  return greeting(new Date(), doc.settings.projectName, {
    walls: doc.byKind('wall').length,
    storeys: doc.byKind('storey').length,
  });
}

export function KosmoOrb({ onKosmoOeffnen }: KosmoOrbProps) {
  const [offen, setOffen] = useState(false);
  const [eingabe, setEingabe] = useState('');
  const reduziert = useReduzierteBewegung();
  const beschaeftigt = useKosmoStatus((s) => s.beschaeftigt);
  const letzteAktivitaet = useKosmoStatus((s) => s.letzteAktivitaet);

  const vorschlagText = letzteAktivitaet ?? kurzform(begruessung());
  const mockAktiv = loadSettings().provider === 'mock';

  function handoff(): void {
    onKosmoOeffnen?.();
    setOffen(false);
    setEingabe('');
  }

  return (
    <div className="isl-orb-wurzel" data-testid="kosmo-orb-wurzel" data-reduziert={reduziert ? 'true' : 'false'}>
      <button
        type="button"
        className={`isl-orb${!reduziert ? ' isl-orb-anim-puls' : ''}`}
        data-testid="kosmo-orb-knopf"
        aria-label={offen ? 'Kosmo-Karte schliessen' : beschaeftigt ? 'Kosmo — arbeitet gerade' : 'Kosmo öffnen'}
        aria-expanded={offen}
        onClick={() => setOffen((o) => !o)}
      >
        <span className="isl-orb-glyphe" aria-hidden="true">
          K
        </span>
      </button>
      {offen ? (
        <div className="isl-orb-karte" data-testid="kosmo-orb-karte">
          <button
            type="button"
            className="isl-schliessen"
            data-testid="kosmo-orb-karte-schliessen"
            aria-label="Schliessen"
            onClick={() => setOffen(false)}
          >
            ✕
          </button>
          <div className="isl-orb-karte-titel">{beschaeftigt ? 'Kosmo arbeitet …' : 'Kosmo'}</div>
          <p className="isl-orb-karte-text" data-testid="kosmo-orb-karte-text">
            {vorschlagText}
          </p>
          {mockAktiv ? (
            <p className="isl-orb-karte-hinweis" data-testid="kosmo-orb-karte-mock-hinweis">
              Mock-Provider aktiv — echte Antworten brauchen einen konfigurierten Provider (Einstellungen →
              Werkzeuge einrichten).
            </p>
          ) : null}
          <div className="isl-orb-karte-chips">
            <button
              type="button"
              className="isl-orb-karte-chip"
              data-testid="kosmo-orb-karte-antworten"
              onClick={handoff}
            >
              Antworten
            </button>
            <button
              type="button"
              className="isl-orb-karte-chip"
              data-testid="kosmo-orb-karte-spaeter"
              onClick={() => setOffen(false)}
            >
              Später
            </button>
          </div>
          <form
            className="isl-orb-karte-eingabe-zeile"
            onSubmit={(e) => {
              e.preventDefault();
              handoff();
            }}
          >
            <input
              type="text"
              className="isl-orb-karte-eingabe"
              data-testid="kosmo-orb-karte-eingabe"
              placeholder="An Kosmo …"
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              aria-label="Nachricht an Kosmo"
            />
            <button
              type="submit"
              className="isl-orb-karte-senden"
              data-testid="kosmo-orb-karte-senden"
              aria-label="Weiter im Kosmo-Panel"
            >
              ➔
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
