import { Hairline, KButton } from '@kosmo/ui';
import {
  IconDockDraw,
  IconDockPrepare,
  IconDockPublish,
  IconDockVis,
  IconEntwurfCad,
  IconEntwurfSkizzieren,
  IconEntwurfSprechen,
} from './werkzeug-icons';

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
  Icon: () => React.JSX.Element;
}[] = [
  { modus: 'sprechen', testid: 'entwurf-sprechen', titel: 'Sprechen/Schreiben — Kosmo zeichnet', Icon: IconEntwurfSprechen },
  {
    modus: 'skizzieren',
    testid: 'entwurf-skizzieren',
    titel: 'Skizzieren — Kosmo schlägt 3 Annäherungen vor',
    Icon: IconEntwurfSkizzieren,
  },
  { modus: 'cad', testid: 'entwurf-cad', titel: 'Manuelles CAD — klassische Werkzeuge', Icon: IconEntwurfCad },
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
  Icon: () => React.JSX.Element;
}[] = [
  { testid: 'dock-draw', titel: 'KosmoDraw — Modellbaum, Mengen, Ausmass (in KosmoDesign)', Icon: IconDockDraw },
  { testid: 'dock-vis', titel: 'öffnet KosmoVis — Renderings, Varianten', Icon: IconDockVis },
  { testid: 'dock-publish', titel: 'öffnet KosmoPublish — Plansätze, Layouts', Icon: IconDockPublish },
  { testid: 'dock-prepare', titel: 'öffnet KosmoPrepare — Grundlagen, Ingestion', Icon: IconDockPrepare },
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
      {EINTRAEGE.map(({ modus: m, testid, titel, Icon }) => (
        <KButton
          key={m}
          size="sm"
          tone={modus === m ? 'accent' : 'quiet'}
          title={titel}
          aria-label={titel}
          aria-pressed={modus === m}
          data-testid={testid}
          onClick={aktion[m]}
          style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon />
        </KButton>
      ))}
      <div style={{ padding: '2px 0' }}>
        <Hairline />
      </div>
      {STATIONS_EINTRAEGE.map(({ testid, titel, Icon }) => (
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
          <Icon />
        </KButton>
      ))}
    </div>
  );
}
