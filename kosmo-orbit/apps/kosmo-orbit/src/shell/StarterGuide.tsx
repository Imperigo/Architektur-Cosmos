import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, KButton, Panel } from '@kosmo/ui';
import './starter-guide.css';
import {
  fortschrittProzent,
  istLetzterSchritt,
  naechsterAutomatischerIndex,
  STARTER_GUIDE_SCHRITTE,
  starterGuideAlsAbgeschlossenMarkieren,
  starterGuideErneutStarten,
  wandWurdeGezeichnet,
  type GuideZustand,
} from './starter-guide-schritte';

/**
 * StarterGuide — der interaktive Kosmo-Rundgang beim Erststart (V1.6 Block E,
 * docs/V16-AUFTRAG-PLAN.md Block E + docs/SERIE-G-KOSMO-ALS-BENUTZERGUIDE.md).
 *
 * Bewusst KEIN Modal-Gefängnis: kein `k-dialog-scrim`, kein Klick-Fänger über
 * der ganzen App — ein schlankes, überlagerndes Kärtchen unten links, das den
 * Rest der Oberfläche frei lässt. Der Nutzer kann jederzeit klicken/zeichnen,
 * während die Karte offen bleibt; genau daran erkennt der Guide dynamisch,
 * ob eine Mini-Aufgabe erledigt ist (`starter-guide-schritte.ts`, DOM-frei
 * und unit-getestet). «Überspringen» ist in JEDEM Schritt sichtbar — der
 * Guide erzwingt nichts (Owner-Grenze «keine Zwangsführung»).
 */

export interface StarterGuideProps {
  /** Aktueller Screen der Zentrale/App — treibt den «KosmoDesign öffnen»-Schritt. */
  screen: string;
  /** Ist das Kosmo-Panel gerade offen? Treibt den «Kosmo fragen»-Schritt. */
  kosmoOffen: boolean;
  /** Aktuelle Wand-Anzahl im Doc — treibt den «Wand zeichnen»-Schritt. */
  wandAnzahl: number;
  /** Rundgang beenden (Überspringen ODER Fertig) — markiert abgeschlossen + schliesst. */
  onSchliessen: () => void;
}

/** Kurze Pause zwischen «erledigt erkannt» und Weiterschalten — sichtbares Häkchen statt Sprung. */
const HAEKCHEN_VERWEILDAUER_MS = 700;

export function StarterGuide({ screen, kosmoOffen, wandAnzahl, onSchliessen }: StarterGuideProps) {
  const [index, setIndex] = useState(starterGuideErneutStarten);
  // Baseline für die «Wand zeichnen»-Mini-Aufgabe: Anzahl BEI MONTAGE dieses
  // Guide-Laufs (nicht bei jedem Schrittwechsel) — ein Demo-Projekt mit
  // bereits vorhandenen Wänden zählt nicht fälschlich als «erledigt», und ein
  // Nutzer, der vorauseilend schon zeichnet, wird trotzdem erkannt.
  const wandBaseline = useRef(wandAnzahl);
  const [haekchenSchrittId, setHaekchenSchrittId] = useState<string | null>(null);

  const zustand: GuideZustand = useMemo(
    () => ({ screen, kosmoOffen, waendeGezeichnet: wandWurdeGezeichnet(wandBaseline.current, wandAnzahl) }),
    [screen, kosmoOffen, wandAnzahl],
  );

  // Dynamisches Weiterschalten: reagiert auf den ECHTEN App-Zustand, nicht
  // nur auf «Weiter»-Klicks. Ein kurzer Häkchen-Moment macht den Sprung
  // sichtbar, statt die Karte unvermittelt umzuschalten.
  useEffect(() => {
    if (istLetzterSchritt(index)) return;
    const schritt = STARTER_GUIDE_SCHRITTE[index]!;
    if (!schritt.automatisch || !schritt.erfuellt(zustand)) return;
    if (haekchenSchrittId === schritt.id) return; // schon geplant
    setHaekchenSchrittId(schritt.id);
    const zeit = window.setTimeout(() => {
      setIndex((i) => naechsterAutomatischerIndex(i, zustand));
      setHaekchenSchrittId(null);
    }, HAEKCHEN_VERWEILDAUER_MS);
    return () => window.clearTimeout(zeit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zustand, index]);

  const schliessen = () => {
    starterGuideAlsAbgeschlossenMarkieren();
    onSchliessen();
  };

  const schritt = STARTER_GUIDE_SCHRITTE[index]!;
  const letzter = istLetzterSchritt(index);
  const erledigtGeradeEben = haekchenSchrittId === schritt.id;

  return (
    <div
      data-testid="starter-guide"
      className="sg-karte"
    >
      <Panel
        data-testid="starter-guide-schritt"
        data-schritt-id={schritt.id}
        className="k-einblenden sg-panel"
      >
        <div className="sg-kopf-zeile">
          <Badge hue="var(--k-accent)">
            Rundgang · {index + 1}/{STARTER_GUIDE_SCHRITTE.length}
          </Badge>
          <div className="sg-spacer" />
          <span className="sg-prozent">
            {fortschrittProzent(index)}%
          </span>
        </div>
        <div
          aria-hidden
          className="sg-fortschritt-spur"
        >
          <div
            className="sg-fortschritt-fill"
            style={{ width: `${fortschrittProzent(index)}%` }}
          />
        </div>
        <div className="sg-titel">{schritt.titel}</div>
        <div className="sg-text">{schritt.text}</div>
        {schritt.automatisch && (
          <div
            data-testid="starter-guide-haekchen"
            className={`sg-haekchen ${erledigtGeradeEben ? 'sg-haekchen--fertig' : 'sg-haekchen--offen'}`}
          >
            {erledigtGeradeEben ? '✓ Erledigt — weiter geht’s' : 'Kosmo erkennt selbst, wenn du das erledigt hast.'}
          </div>
        )}
        <div className="sg-knopf-zeile">
          {letzter ? (
            <KButton size="sm" tone="accent" data-testid="starter-guide-fertig" onClick={schliessen}>
              Fertig
            </KButton>
          ) : (
            <KButton
              size="sm"
              tone="accent"
              data-testid="starter-guide-weiter"
              onClick={() => setIndex((i) => (istLetzterSchritt(i) ? i : i + 1))}
            >
              Weiter
            </KButton>
          )}
          <KButton size="sm" tone="ghost" data-testid="starter-guide-ueberspringen" onClick={schliessen}>
            Überspringen
          </KButton>
        </div>
      </Panel>
    </div>
  );
}
