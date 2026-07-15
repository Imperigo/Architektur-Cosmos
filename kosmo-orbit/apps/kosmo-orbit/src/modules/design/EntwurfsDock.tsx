import { useState } from 'react';
import { Hairline, KButton } from '@kosmo/ui';
import type { StationModulId } from '../../shell/stations-werkzeuge';
import { STATION_GLYPHE, WerkzeugGlyphe } from '../../shell/werkzeug-glyphen';
import { STATION_ZU_TOOLID, toolNutzungMelden } from '../../state/orbit-rang';

/**
 * K16 (Owner-Befund, wörtlich): «Drei Entwurfs-Icons in KosmoDesign: (1)
 * Sprechen/Schreiben → Kosmo zeichnet; (2) Skizzieren → Live-Verständnis + 3
 * Preview-Annäherungen …; (3) manuelles CAD → klassische Werkzeugleisten,
 * Anordnung wie ArchiCAD.» Dieser Dock ist der Entwurfs-EINSTIEG: er sitzt an
 * der linken Kante — laut A5-Kanten-Inventar die einzige der vier Kanten
 * ohne festen Dauer-Inhalt (oben Werkzeuge, rechts Kosmo-Symbol, unten
 * Statusleiste; links nur situativ Geschossleiste oben/Nav unten) — bewusst
 * vertikal MITTIG, damit er weder die Geschossleiste (oben) noch die
 * NavLeiste/Statuszeile (unten) überlappt (K3-Regel: Blöcke kollisionsfrei).
 * Das galt nur, solange die Geschossleiste kurz blieb — bei genug Geschossen
 * (Hochhaus-Fall) wuchs ihre Karteikarten-Liste über die Mitte hinaus in
 * diesen Dock hinein (v0.7.9 B2, ehemals in `BEKANNTE_VORBESTEHENDE_
 * KOLLISIONEN`, `e2e/dock-layout.spec.ts`, ausgeklammert). Behoben NICHT
 * hier, sondern in `DesignWorkspace.tsx` (die Geschossleiste misst diesen
 * Dock per `data-testid="entwurf-dock"` und klemmt ihre eigene `maxHeight`
 * davor) — dieser Dock bleibt unverändert vertikal mittig, weicht selbst
 * nicht aus.
 *
 * Understatement statt Modal: drei kompakte Icon-Kacheln, keine Kachel-Wand,
 * kein Onboarding-Screen. Der aktive Modus bekommt `tone="accent"` +
 * `aria-pressed` — genau EIN Modus ist zu jeder Zeit aktiv markiert.
 *
 * V0.7.2 W1-B (Paket 02): die Icons kommen jetzt aus der neuen Glyphen-
 * Bibliothek (`shell/werkzeug-glyphen.tsx`) über `STATION_GLYPHE` (Spec-§3
 * «Station→Glyphe→Rolle») — sprechen→Station `speak` (Glyphe `chat`, Rolle
 * Signal), skizzieren→Station `sketch` (Glyphe `skizze`, Rolle manuell),
 * cad→Station `design` (Glyphe `draw`, Rolle manuell; dasselbe manuelle
 * Zeichnen wie die Station selbst); die vier Grundicons unten sind 1:1 ihre
 * Zielstationen (draw/vis/publish/prepare). Struktur, `data-testid`, `title`
 * und Klick-Verhalten bleiben EXAKT wie zuvor — nur das Icon-Innere wechselt.
 *
 * Kontrast-Falle (gefunden beim Sichtbeweis-Screenshot): die Glyphen-Norm
 * (Spec-§3) zeichnet den Strich FEST in `var(--k-ink)`, nicht `currentColor`
 * — anders als die alten Icons hier. `.k-btn-accent` (aktiver Modus-Knopf)
 * setzt `background: var(--k-accent)`, was in Paper/Ink praktisch derselbe
 * Ton wie `--k-ink` ist ⇒ ohne Gegenmassnahme verschwindet das Icon auf dem
 * aktiven Knopf. Fix: der aktive Knopf überschreibt `--k-ink` LOKAL auf
 * `var(--k-accent-ink)` (die für genau diesen Hintergrund kontrastierende
 * Textfarbe) — nur für sein eigenes Subtree, alle anderen Glyphen im Dock
 * bleiben unangetastet.
 *
 * V0.7.2 W2-C (Paket 03/05, Spec §4 «Wirkung»): Glas-Optik (nur im orbit-
 * Theme, via `orbit065-dock`-Klasse + `[data-theme='orbit']`-Attribut-
 * Selektor in `orbit-065.css` — Stream A/`aura.css` bleiben unangetastet),
 * kreisrunde Knöpfe (`--k-radius-pill`), Nutzungs-Pop (`k-dock-pop`, 450ms)
 * bei JEDEM Klick, Hover-Sog (Nachbarn skalieren via CSS
 * `:has()`/Geschwister-Selektoren) UND `nutzungMelden('orbit:'+toolId)`
 * für jeden Klick, dessen Station eine echte BASE-Matrix-ToolId hat
 * (`STATION_ZU_TOOLID`, `state/orbit-rang.ts` — einzige Quelle, KEINE
 * eigene Zweit-Tabelle hier). ALLE testids/titles/DOM-Struktur/Icons/Klick-
 * Callbacks aus W1-B bleiben exakt — nur Optik + der zusätzliche
 * `nutzungMelden`-Seiteneffekt sind neu.
 */

export type EntwurfsModus = 'sprechen' | 'skizzieren' | 'cad';

export interface EntwurfsDockProps {
  modus: EntwurfsModus;
  onSprechen: () => void;
  onSkizzieren: () => void;
  onCad: () => void;
  /** A7 (Grundicons anderer Stationen): öffnet KosmoDraw (Deep-Link, s.
   *  `DesignWorkspace.tsx`). */
  onDockDraw: () => void;
  /** A7: wechselt zu KosmoVis — ehrlich Navigation, keine Einbettung. */
  onDockVis: () => void;
  /** A7: wechselt zu KosmoPublish. */
  onDockPublish: () => void;
  /** A7: wechselt zu KosmoPrepare. */
  onDockPrepare: () => void;
}

const EINTRAEGE: {
  modus: EntwurfsModus;
  testid: string;
  titel: string;
  station: StationModulId;
}[] = [
  { modus: 'sprechen', testid: 'entwurf-sprechen', titel: 'Sprechen/Schreiben — Kosmo zeichnet', station: 'speak' },
  {
    modus: 'skizzieren',
    testid: 'entwurf-skizzieren',
    titel: 'Skizzieren — Kosmo schlägt 3 Annäherungen vor',
    station: 'sketch',
  },
  { modus: 'cad', testid: 'entwurf-cad', titel: 'Manuelles CAD — klassische Werkzeuge', station: 'design' },
];

/**
 * A7 (Owner-Befund K17, wörtlich: «Grundicons KosmoDraw/Vis/Publish/Prepare
 * in KosmoDesign integriert»): vier kleine Stations-Icons unter einem
 * Trenner — Draw öffnet den bestehenden Deep-Link (bleibt in KosmoDesign),
 * Vis/Publish/Prepare wechseln die Station. Ehrlich Navigation, KEINE
 * Einbettung: der Tooltip sagt das offen («öffnet KosmoVis» etc.), keine
 * `aria-pressed`-Modusmarkierung wie bei den drei Entwurfs-Icons oben (es
 * gibt hier keinen "aktiven Modus", nur einen Sprung).
 */
const STATIONS_EINTRAEGE: {
  testid: string;
  titel: string;
  station: StationModulId;
}[] = [
  { testid: 'dock-draw', titel: 'KosmoDraw — Modellbaum, Mengen, Ausmass (in KosmoDesign)', station: 'draw' },
  { testid: 'dock-vis', titel: 'öffnet KosmoVis — Renderings, Varianten', station: 'vis' },
  { testid: 'dock-publish', titel: 'öffnet KosmoPublish — Plansätze, Layouts', station: 'publish' },
  { testid: 'dock-prepare', titel: 'öffnet KosmoPrepare — Grundlagen, Ingestion', station: 'prepare' },
];

export function EntwurfsDock({
  modus,
  onSprechen,
  onSkizzieren,
  onCad,
  onDockDraw,
  onDockVis,
  onDockPublish,
  onDockPrepare,
}: EntwurfsDockProps) {
  const aktion: Record<EntwurfsModus, () => void> = {
    sprechen: onSprechen,
    skizzieren: onSkizzieren,
    cad: onCad,
  };
  const stationsAktion: Record<string, () => void> = {
    'dock-draw': onDockDraw,
    'dock-vis': onDockVis,
    'dock-publish': onDockPublish,
    'dock-prepare': onDockPrepare,
  };

  // Nutzungs-Pop (Spec §4: `kPop` 450ms) bei JEDEM Dock-Klick — `poppendId`
  // trägt das `testid` des zuletzt geklickten Knopfs, `onAnimationEnd` räumt
  // wieder auf (derselbe Trick wie die bestehenden Sheet-Klassen in
  // `orbit-065.css`: Klasse weg/da lässt die Animation bei jedem Klick neu
  // anlaufen, auch bei schnellen Wiederholklicks auf denselben Knopf).
  const [poppendId, setPoppendId] = useState<string | null>(null);

  /** `nutzungMelden` (Spec §4) — NUR für Stationen mit echter BASE-Matrix-
   *  ToolId (`STATION_ZU_TOOLID`); Skizzieren/KosmoDraw(Modellbaum) haben
   *  keine — dort bleibt der Aufruf ein No-op (kein erfundener ToolId-Wert). */
  function klick(testid: string, station: StationModulId, original: () => void): void {
    setPoppendId(testid);
    const toolId = STATION_ZU_TOOLID[station];
    if (toolId) toolNutzungMelden(toolId);
    original();
  }

  return (
    <div data-testid="entwurf-dock" className="orbit065-dock">
      {/* v0.8.0B / W3 (Spez §4 B-50/B-39) — Rail-Werkzeuge auf die
          KWerkzeugKreis-KLASSEN-Grammatik: 30×30-Kreis, aktiv = 1.5px
          Akzent-Border + 4px-Punkt (`k-werkzeug-kreis--aktiv`/`-punkt`,
          aura.css) statt gefüllter Accent-Fläche — Signal-Disziplin
          (Gesetz 1): die Rail trägt keine gefüllte Signal-Fläche mehr.
          KButton-Hülle/testids/aria/titles bleiben BYTE-GLEICH
          (`entwurfs-icons.spec.ts` prüft `aria-pressed`); die
          `k-werkzeug-kreis`-Klassen stehen in aura.css NACH den
          `k-btn-*`-Klassen und gewinnen darum die Fläche/Border/Farbe.
          Der frühere `--k-ink→--k-accent-ink`-Kontrast-Override entfällt
          MIT der gefüllten Fläche (die Glyphe liegt jetzt immer auf
          `--k-surface`, die globale Tinte stimmt wieder). Rail-BREITE
          bleibt Solver-Sache (`dock-kern.ts` RAIL:52, tabu). */}
      {EINTRAEGE.map(({ modus: m, testid, titel, station }) => {
        const aktiv = modus === m;
        return (
          <KButton
            key={m}
            size="sm"
            tone={aktiv ? 'accent' : 'quiet'}
            title={titel}
            aria-label={titel}
            aria-pressed={aktiv}
            data-testid={testid}
            className={`orbit065-dock-knopf k-werkzeug-kreis${aktiv ? ' k-werkzeug-kreis--aktiv' : ''}${poppendId === testid ? ' orbit065-dock-pop' : ''}`}
            onClick={() => klick(testid, station, aktion[m])}
            onAnimationEnd={() => setPoppendId((id) => (id === testid ? null : id))}
            style={{
              width: 30,
              height: 30,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--k-radius-pill)',
            }}
          >
            <WerkzeugGlyphe {...STATION_GLYPHE[station]} size={20} />
            {aktiv && <span className="k-werkzeug-kreis-punkt" aria-hidden="true" />}
          </KButton>
        );
      })}
      <div style={{ padding: '2px 0' }}>
        <Hairline />
      </div>
      {STATIONS_EINTRAEGE.map(({ testid, titel, station }) => (
        <KButton
          key={testid}
          size="sm"
          tone="quiet"
          title={titel}
          aria-label={titel}
          data-testid={testid}
          className={`orbit065-dock-knopf k-werkzeug-kreis${poppendId === testid ? ' orbit065-dock-pop' : ''}`}
          onClick={() => klick(testid, station, stationsAktion[testid]!)}
          onAnimationEnd={() => setPoppendId((id) => (id === testid ? null : id))}
          style={{
            width: 30,
            height: 30,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--k-radius-pill)',
            opacity: 0.85,
          }}
        >
          <WerkzeugGlyphe {...STATION_GLYPHE[station]} size={20} />
        </KButton>
      ))}
    </div>
  );
}
