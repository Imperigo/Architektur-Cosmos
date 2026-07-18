import { useState } from 'react';
import { KButton } from '@kosmo/ui';
import { versucheStationZuOeffnen } from '../../../design/island/inhalte/austausch';
import { prepareInhaltsRegistry } from './registry';
import '../prepare-island.css';

/**
 * AUSTAUSCH-Insel (PC4, `docs/V084-SPEZ.md` §5 W3, C-20) — «Zu KosmoData»
 * (Deep-Link-Interim, s. Kommentar unten) als Stufe-2-Popup; «Manuell»
 * (hatPopup=false, Sofort-Umschaltung, `PrepareWorkspace.tsx`s
 * `onWerkzeugAktion`) bleibt bewusst UNREGISTRIERT — Muster design/vis'
 * gleichnamiges Werkzeug.
 *
 * **Ehrliche Grenze («zu KosmoData/Deep-Link»):** `design/island/inhalte/
 * austausch.tsx` (§8-4, PD3c/PC1) baut bereits eine Stations-Brücke
 * (`registriereStationsWeg`/`versucheStationZuOeffnen`, NUR importiert,
 * fremder Dateibesitz) — sie wird aber nur von `DesignWorkspace.tsx`s
 * Mount-Effekt REGISTRIERT (`App.tsx` reicht `onStationOeffnen` NUR an
 * `DesignWorkspace` durch). Der PC4-Dateikreis erlaubt an `App.tsx` NUR die
 * additive Guard-Zeile (`docs/V084-SPEZ.md` DATEIKREIS-Vertrag) — eine
 * zweite `registriereStationsWeg`-Registrierung für Prepare bräuchte eine
 * neue `onStationOeffnen`-Prop an `<PrepareWorkspace/>` in `App.tsx`, also
 * mehr als eine Guard-/Kopf-Zeile. Diese Insel versucht den Weg trotzdem
 * ECHT (`versucheStationZuOeffnen('data')`) — solange Design nicht parallel
 * gemountet ist, liefert das strukturell `false`, und der Knopf zeigt das
 * EHRLICH an, statt eine Navigation vorzutäuschen, die nicht passiert
 * (Owner-Prinzip «ehrlicher Platzhalter-Hinweis statt Attrappe»). Der
 * vollständige Rollout der Deep-Link-Brücke über alle Stationen ist
 * `docs/V084-SPEZ.md`s C-25 (Orb-/Bridge-Gesetz «überall bewiesen»,
 * ausdrücklich PB4/W4 zugewiesen) — kein PC4-Nachtrag.
 */
function ZuKosmoDataInhalt() {
  const [versucht, setVersucht] = useState(false);
  const [gewirkt, setGewirkt] = useState(false);

  return (
    <div className="prisl-stufe2" data-testid="island-zu-kosmodata-stufe2" onClick={(e) => e.stopPropagation()}>
      <KButton
        size="sm"
        tone="ghost"
        data-testid="island-zu-kosmodata-versuchen"
        onClick={() => {
          const ok = versucheStationZuOeffnen('data');
          setVersucht(true);
          setGewirkt(ok);
        }}
      >
        Zu KosmoData
      </KButton>
      {versucht && !gewirkt && (
        <p className="prisl-hinweis" data-testid="island-zu-kosmodata-hinweis">
          Nicht verdrahtet von hier: die Stations-Brücke (§8-4) ist aktuell nur registriert, während
          KosmoDesign gemountet ist — bitte über die Kachel/Kurzbefehl zu KosmoData wechseln. Voller
          Rollout ist C-25 (PB4).
        </p>
      )}
    </div>
  );
}

prepareInhaltsRegistry.registriere('zu-kosmodata', { Stufe2: ZuKosmoDataInhalt, Stufe3: ZuKosmoDataInhalt });
