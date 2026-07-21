import { useRef, useState } from 'react';
import { greeting } from '@kosmo/ai';
import { useOverlaySchliessen } from '@kosmo/ui';
import { kurzform, useKosmoStatus } from '../../../state/kosmo-status';
import { useProject } from '../../../state/project-store';
import { loadSettings } from '../../../shell/KosmoPanel';
// PD5 (Owner-Befund, Screenshot-Review 17.07.2026, wörtlich «gib kosmo
// wieder seine animationen und richtiges symbol»): der Orb-Inhalt war bis
// hierher ein leblos-statisches «K»-Glyph — der ECHTE, animierte Kosmo-Orb
// (Kern/Punkte/Zustands-Choreografie, `data-zustand`-Attribut-Wechsel, s.
// `kosmo-feedback.css`) lebt bereits als wiederverwendbare Komponente in
// `shell/KosmoOrb.tsx` (dort schon von `KosmoSymbol.tsx` genutzt) — REINER
// Lese-Import (`shell/**` bleibt laut Bauauftrag unverändert), unter Alias
// importiert, weil diese Datei selbst ebenfalls eine (andere!) Komponente
// namens `KosmoOrb` exportiert (der Insel-Wrapper mit Klick→Karte-Verhalten,
// s. unten). reduced-motion: `shell/KosmoOrb.tsx`s eigene Animationen hängen
// bereits am globalen `prefers-reduced-motion`-Riegel (aura.css) plus
// eigenen `animation:none`-Regeln je Klasse (`kosmo-feedback.css`-Kopf-
// kommentar) — keine zusätzliche Gate-Logik hier nötig, die bestehende
// Animations-Disziplin der Komponente wird unverändert übernommen.
import { KosmoOrb as KosmoSymbolOrb, useKlickVsDoppelklick } from '../../../shell/KosmoOrb';
import { useReduzierteBewegung } from './IslandShell';
import './island.css';

/**
 * Kosmo-Orb (PD4 Abschluss, `docs/ISLAND-UI-SPEZ.md` §1-Tabelle/§4.3 Zeile 5;
 * PB4 `docs/V084-SPEZ.md` §3 E2 «Orb-Gesetz») — der Orb unten rechts im
 * Island-Modus (K22: 64px statt 52, Hülle transparent-glasig + fein
 * stationsgetönt über das `--k-orb-glas`-Paar, `app.css`/`island.css`;
 * PB4-Gesetz «nicht gelb hinterlegen» gilt unverändert, Kern +
 * Punkte bleiben stationsfarbig), Puls `--k-insel-orb-puls` 2.4s in
 * `--k-signal` statt Gold, `reduced-motion`: kein Puls. Bleibt bewusst
 * AUSSERHALB der vier Islands (§1: «Bleibt ausserhalb der vier Islands»).
 *
 * **Ablöst den PD3c-Notbehelf:** bis PD4 sprang hier `shell/KosmoSymbol.tsx`
 * (App.tsx, `bodenDockAusgeblendet`-Zweig) ein, das Klick DIREKT das grosse
 * Panel öffnete (`onOpen`). Diese Komponente ist der reale, spezifizierte
 * Kosmo-Orb: Einfachklick öffnet zuerst eine 320px-Konversationskarte
 * (Vorschlagstext + 2 Aktions-Chips + Eingabezeile), Doppelklick überspringt
 * sie direkt zum Panel (PB4, E2-Tabelle, `useKlickVsDoppelklick` s. unten) —
 * `App.tsx` rendert `KosmoSymbol` darum nur noch auf `screen==='home'`,
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
  const [zeigeMini, setZeigeMini] = useState(false);
  const [eingabe, setEingabe] = useState('');
  const reduziert = useReduzierteBewegung();
  const beschaeftigt = useKosmoStatus((s) => s.beschaeftigt);
  const letzteAktivitaet = useKosmoStatus((s) => s.letzteAktivitaet);
  // PD5: derselbe `zustand`-Wert, den `KosmoSymbol.tsx` an den echten Orb
  // reicht (idle/thinking/listening/writing/dispatching/done/speaking/error/
  // takeover) — treibt jetzt auch hier die volle Zustands-Choreografie.
  const zustand = useKosmoStatus((s) => s.zustand);
  const wurzelRef = useRef<HTMLDivElement | null>(null);

  const vorschlagText = letzteAktivitaet ?? kurzform(begruessung());
  const mockAktiv = loadSettings().provider === 'mock';

  function handoff(): void {
    onKosmoOeffnen?.();
    setOffen(false);
    setEingabe('');
  }

  // PB4 (`docs/V084-SPEZ.md` §3 E2 «Orb-Gesetz» + E3-Rollout-Doku,
  // `overlay-schliessen.ts`-Kopfkommentar «Orb-Karte»): Esc/Aussenklick
  // schliessen die Karte — additiv, `ref` = die Wurzel (Knopf + Karte als
  // Kinder, dasselbe Prinzip wie `KosmoSymbol.tsx`s `wrapperRef`), damit ein
  // Klick auf den Knopf selbst (öffnet/schliesst über `onClick` unten) nie
  // als Aussenklick auf die eigene Karte missverstanden wird. Kein
  // `hoverRueckklappMs` (die Karte schliesst nur aktiv, s. Hook-Kopfkommentar).
  useOverlaySchliessen(wurzelRef, () => setOffen(false), { esc: true, aussenklick: true });

  // PB4 (E2-Tabelle «Hover/Focus → Mini-Popup mit Textverlauf», Muster
  // `KosmoSymbol.tsx:67-78`): bisher fehlte hier jedes Hover-Feedback — der
  // Einfachklick war der einzige Bedienweg. Zweiter, unabhängiger
  // `useOverlaySchliessen`-Ruf (derselbe `wurzelRef`) mit `hoverRueckklappMs`
  // (dasselbe ~1s-Mandat wie im Symbol) — Esc/Aussenklick schliessen das
  // Mini-Popup zusätzlich sofort.
  useOverlaySchliessen(wurzelRef, () => setZeigeMini(false), {
    esc: true,
    aussenklick: true,
    hoverRueckklappMs: 1000,
  });

  // PB4: Einfachklick öffnet die Karte (E2-Tabelle), Doppelklick überspringt
  // sie direkt zum Panel — derselbe geteilte Hook wie `KosmoSymbol.tsx`
  // (`shell/KosmoOrb.tsx`, EIN Zeitwert app-weit statt einer Kopie je Orb-
  // Erscheinung). Ersetzt den bisherigen reinen Klick-Toggle (`setOffen((o)
  // => !o)`) — die E2-Tabelle kennt für den Einfachklick nur «öffnet»,
  // Schliessen ist seither Sache von Esc/Aussenklick/«Später»/«Antworten».
  const { onClick: karteOeffnen, onDoubleClick: panelOeffnen } = useKlickVsDoppelklick(
    () => {
      setZeigeMini(false);
      setOffen(true);
    },
    handoff,
  );

  return (
    <div
      className="isl-orb-wurzel"
      data-testid="kosmo-orb-wurzel"
      data-reduziert={reduziert ? 'true' : 'false'}
      ref={wurzelRef}
    >
      {zeigeMini && !offen && (
        <div data-testid="kosmo-orb-mini" role="status" className="k-einblenden isl-orb-mini">
          <div className="isl-orb-mini-titel">{beschaeftigt ? 'Kosmo arbeitet …' : 'Kosmo'}</div>
          {vorschlagText}
        </div>
      )}
      <button
        type="button"
        className={`isl-orb${!reduziert ? ' isl-orb-anim-puls' : ''}`}
        data-testid="kosmo-orb-knopf"
        aria-label={
          beschaeftigt
            ? 'Kosmo — arbeitet gerade'
            : offen
              ? 'Kosmo-Karte offen — Doppelklick öffnet das Kosmo-Panel'
              : 'Kosmo öffnen (Doppelklick: Kosmo-Panel)'
        }
        aria-expanded={offen}
        onClick={karteOeffnen}
        onDoubleClick={panelOeffnen}
        onMouseEnter={() => setZeigeMini(true)}
        onFocus={() => setZeigeMini(true)}
        onBlur={() => setZeigeMini(false)}
      >
        {/* K22 (Owner: «kosmo darf etwas grösser sein», Befund Abschnitt 3:
            Orb 30→40, Hülle 52→64 in `island.css` `.isl-orb`). */}
        <KosmoSymbolOrb zustand={zustand} size={40} />
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
