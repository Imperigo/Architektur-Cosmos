import { KButton } from '@kosmo/ui';
import { IconEntwurfCad, IconEntwurfSkizzieren, IconEntwurfSprechen } from './werkzeug-icons';

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

export function EntwurfsDock({ modus, onSprechen, onSkizzieren, onCad }: EntwurfsDockProps) {
  const aktion: Record<EntwurfsModus, () => void> = {
    sprechen: onSprechen,
    skizzieren: onSkizzieren,
    cad: onCad,
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
    </div>
  );
}
