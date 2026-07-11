import type { CSSProperties } from 'react';
import { Hairline, KButton } from '@kosmo/ui';
import type { StationModulId } from '../../shell/stations-werkzeuge';
import { STATION_GLYPHE, WerkzeugGlyphe } from '../../shell/werkzeug-glyphen';

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
  return (
    <div
      data-testid="entwurf-dock"
      style={{
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: 'var(--k-surface)',
        border: '1px solid var(--k-line)',
        borderRadius: 'var(--k-radius-md)',
        padding: 4,
        boxShadow: 'var(--k-shadow-raised)',
      }}
    >
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
            onClick={aktion[m]}
            style={{
              width: 32,
              height: 32,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // Kontrast-Fix (s. Kopfkommentar): auf dem aktiven Accent-Knopf
              // löst `var(--k-ink)` in der Glyphe die kontrastierende
              // Vordergrundfarbe des Knopfs auf statt der globalen Tinte.
              ...(aktiv ? ({ '--k-ink': 'var(--k-accent-ink)' } as CSSProperties) : {}),
            }}
          >
            <WerkzeugGlyphe {...STATION_GLYPHE[station]} size={20} />
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
          onClick={stationsAktion[testid]}
          style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 }}
        >
          <WerkzeugGlyphe {...STATION_GLYPHE[station]} size={20} />
        </KButton>
      ))}
    </div>
  );
}
