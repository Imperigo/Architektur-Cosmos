import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, KButton, Panel } from '@kosmo/ui';
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
      style={{
        position: 'fixed',
        // v0.6.4 / F7 (Owner-Befund, wiederholt: «kann in 3D-Viewer immer noch
        // nicht skizzieren»): bei `left:20, bottom:20` sass die Karte GENAU auf
        // dem 3D-/2D-Viewport-Bodenstreifen (NavLeiste `bottom:50`, KosmoSketch-
        // Batch-/Vorschlagsleisten `bottom:18`, beide links/mittig in JEDER
        // Pane) — ihr eigener Knopfsatz (Weiter/Überspringen) landete pixel-
        // genau auf «Übergeben» & Co. und schluckte den Klick (bewiesen per
        // Playwright: "starter-guide-schritt … intercepts pointer events" auf
        // `sketch3d-uebergeben`). Wer beim Erststart «Ja, zeig mir den
        // Rundgang» wählt und dann (statt der Wand-Mini-Aufgabe) gleich
        // «Skizzieren» ausprobiert, zeichnet zwar einen Strich, kann ihn aber
        // nie übergeben — sieht aus wie «Skizzieren geht nicht». Fix: die
        // Karte steht jetzt deutlich höher (`bottom:100`) und weiter rechts
        // (`left:60`) — ausserhalb des Boden-Streifens UND des vertikal
        // mittigen Entwurfs-Docks (`left:12`, K16 A6) — ohne Position/Grösse
        // sonst zu verändern.
        left: 60,
        bottom: 100,
        width: 340,
        zIndex: 120,
        // Ehrlich nicht-modal: kein Scrim, kein Klick-Fänger über der App —
        // nur diese Karte selbst reagiert auf Zeiger-Events.
        pointerEvents: 'none',
      }}
    >
      <Panel
        data-testid="starter-guide-schritt"
        data-schritt-id={schritt.id}
        className="k-einblenden"
        style={{
          pointerEvents: 'auto',
          display: 'grid',
          gap: 10,
          border: '1px solid var(--k-accent)',
          boxShadow: '0 6px 24px color-mix(in srgb, var(--k-ink) 18%, transparent)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge hue="var(--k-accent)">
            Rundgang · {index + 1}/{STARTER_GUIDE_SCHRITTE.length}
          </Badge>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--k-ink-faint)', fontFamily: 'var(--k-font-mono)' }}>
            {fortschrittProzent(index)}%
          </span>
        </div>
        <div
          aria-hidden
          style={{
            height: 3,
            borderRadius: 2,
            background: 'var(--k-line)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${fortschrittProzent(index)}%`,
              background: 'var(--k-accent)',
              transition: 'width var(--k-motion-base)',
            }}
          />
        </div>
        <div style={{ fontWeight: 550, fontSize: 14.5 }}>{schritt.titel}</div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--k-ink-soft)' }}>{schritt.text}</div>
        {schritt.automatisch && (
          <div
            data-testid="starter-guide-haekchen"
            style={{
              fontSize: 12.5,
              color: erledigtGeradeEben ? 'var(--k-success)' : 'var(--k-ink-faint)',
              opacity: erledigtGeradeEben ? 1 : 0.65,
            }}
          >
            {erledigtGeradeEben ? '✓ Erledigt — weiter geht’s' : 'Kosmo erkennt selbst, wenn du das erledigt hast.'}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
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
