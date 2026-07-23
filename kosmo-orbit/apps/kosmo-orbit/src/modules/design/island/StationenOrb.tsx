import { useRef, useState } from 'react';
import { KIcon, useOverlaySchliessen, type ModuleId } from '@kosmo/ui';
import { ORBIT_HAUPTWERKZEUGE, type OrbitHauptwerkzeug } from '../../../shell/orbit-werkzeuge';
import './island.css';

/**
 * Stationen-Orb (PD2, `docs/ISLAND-UI-SPEZ.md` §1-Tabelle) — 38×38px-Kreis
 * neben der Ansichts-Info, Popover mit Direktzugang zu den ANDEREN
 * Stationen. Navigation, **keine Island** (kein Werkzeug) — Auto-Schliessen
 * 700ms wie `AnsichtsInfo`.
 *
 * **PB3 (`docs/V084-SPEZ.md` §8 C-24, Owner wörtlich «AK-Zentralsymbol
 * zeigt NIE das offene Haupttool, sondern ist Shortcut für die ANDEREN mit
 * deren UNTERTOOLS (z. B. KosmoReference/KosmoAsset statt "KosmoData")»):
 * das Popover listet NICHT mehr die fünf Pipeline-Stationen flach
 * (design/data/vis/prepare/publish, PD2-Fassung) — es listet die
 * `ORBIT_HAUPTWERKZEUGE` (dieselbe Quelle wie `OrbitStart.tsx`s Home-Fächer,
 * `shell/orbit-werkzeuge.ts`) MIT AUSNAHME des Hauptwerkzeugs, das die
 * gerade offene Station (`aktivesModul`) selbst enthält — pro sichtbarem
 * Hauptwerkzeug eine Gruppen-Überschrift + seine echten Untertools (z. B.
 * unter «KosmoData»: Reference→`data`, Asset→`asset`). Ist `aktivesModul`
 * `'design'` ODER `'vis'`, fällt das GANZE `design`-Hauptwerkzeug weg (Draw/
 * Prepare/Vis/Publish/Modellbaum sind laut `orbit-werkzeuge.ts` alle
 * Untertools DIESES EINEN Hauptwerkzeugs «KosmoDesign» — beide Design-
 * Islands (design- UND vis-Station) sind Teil desselben Haupttools, s.
 * `docs/V084-SPEZ.md` §8 C-24 + §5 W3). `KosmoOffice` bleibt sichtbar,
 * seine Untertools bleiben `kommend`/nicht klickbar (App-weite Ehrlichkeits-
 * Konvention, `docs/V084-SPEZ.md` §7 Sanktion 9).
 *
 * Frühere `StationenOrbId`-Union (fünf Pipeline-Stationen) + die
 * `STATION_FARBE`-Rollenpunkte sind mit dieser Umstellung entfallen —
 * `onStationOeffnen` navigiert jetzt über eine echte `ModuleId` (jeder
 * `orbit-werkzeuge.ts`-Untertool mit `moduleId` ist ein reales, existierendes
 * Modul), derselbe `App.tsx`-`oeffneModul`-Weg wie die Zentrale-Kacheln.
 *
 * **Repo-Bezug (§1 «PD2»):** ein konsolidiertes Hover-Popover mit direktem
 * Stationszugang existiert seit PD2 additiv neben `EntwurfsDock.tsx:131-140`
 * (vier einzelne Sprung-Knöpfe ohne gemeinsames Popover, nur im Modus
 * 'manuell' gerendert) und der App-Home-Modulliste (`App.tsx`,
 * `sortierteModule`/`oeffneModul`).
 *
 * Navigation läuft über denselben Weg, den `EntwurfsDock.tsx`s
 * `dock-vis`/`dock-publish`/`dock-prepare`-Knöpfe schon nutzen
 * (`onStationOeffnen`, `App.tsx` `oeffneModul`).
 *
 * **PB4 (`docs/V084-SPEZ.md` §3 E3 «Popup-Gesetz», Pflicht-Konsument):** der
 * bisherige lokale `schliessTimer`/`AUTO_SCHLIESSEN_MS`-Handbau ist ERSETZT
 * durch `useOverlaySchliessen(wurzelRef, …, { hoverRueckklappMs:
 * AUTO_SCHLIESSEN_MS })` — verhaltensgleich (dieselben 700ms nach
 * Pointer-Verlassen, Wiedereintritt storniert unverändert), zusätzlich
 * ADDITIV Esc/Aussenklick (bisher fehlte beides hier).
 *
 * **PD5 (Owner-Befehl + Owner-Korrektur, 17.07.2026): «Zentrale»-Eintrag**
 * bleibt UNVERÄNDERT additiv erhalten — eigener, optionaler `onZentrale`-
 * Callback, immer der ERSTE Popover-Eintrag, separat von der Hauptwerkzeug-
 * Gruppenliste (kein Rollenpunkt/keine Gruppe — «Zentrale» ist kein
 * Hauptwerkzeug). Details/Herleitung unverändert im Kommentar der
 * PD5-Fassung dieser Datei (git-history).
 */

const AUTO_SCHLIESSEN_MS = 700;

export interface StationenOrbProps {
  /** Die gerade offene Station (`App.tsx`s `screen`, z. B. `'design'` oder
   *  `'vis'`) — bestimmt, welches `ORBIT_HAUPTWERKZEUGE`-Hauptwerkzeug im
   *  Popover NICHT erscheint (Owner: «zeigt NIE das offene Haupttool»). */
  aktivesModul: ModuleId;
  onStationOeffnen: (station: ModuleId) => void;
  /** PD5 (s. Kopfkommentar) — additiv, optional (isoliert gemountete Tests
   *  brauchen ihn nicht, gleiches Muster wie `onStationOeffnen` in
   *  `DesignWorkspace.tsx`s eigenen optionalen Props). */
  onZentrale?: () => void;
}

/** Das Hauptwerkzeug, dessen Untertools die gerade offene Station enthalten
 *  — «das offene Haupttool», das komplett aus dem Popover fällt (Owner-
 *  Wortlaut, s. Kopfkommentar). Bewusst der ERSTE Treffer in
 *  `ORBIT_HAUPTWERKZEUGE`-Reihenfolge (nicht «irgendein Treffer»): das
 *  «Modell»-Untertool unter «Kosmo» verweist absichtlich ZUSÄTZLICH auf
 *  `moduleId:'design'` (`orbit-werkzeuge.ts`s eigene Kopfkommentar-
 *  Dokumentation dieses Sonderfalls) — ohne die Beschränkung auf den ersten
 *  Treffer würde `aktivesModul:'design'` fälschlich AUCH die komplette
 *  «Kosmo»-Gruppe ausblenden. */
function findeOffenesHaupttool(aktivesModul: ModuleId): OrbitHauptwerkzeug | undefined {
  return ORBIT_HAUPTWERKZEUGE.find((h) => h.untertools.some((u) => u.moduleId === aktivesModul));
}

export function StationenOrb({ aktivesModul, onStationOeffnen, onZentrale }: StationenOrbProps) {
  const [offen, setOffen] = useState(false);
  const wurzelRef = useRef<HTMLDivElement | null>(null);

  useOverlaySchliessen(wurzelRef, () => setOffen(false), {
    esc: true,
    aussenklick: true,
    hoverRueckklappMs: AUTO_SCHLIESSEN_MS,
  });

  const offenesHaupttool = findeOffenesHaupttool(aktivesModul);
  const andereHauptwerkzeuge = ORBIT_HAUPTWERKZEUGE.filter((h) => h.id !== offenesHaupttool?.id);

  return (
    <div
      ref={wurzelRef}
      className="isl-buehnenkopf isl-buehnenkopf-stationen-orb"
      data-testid="stationen-orb-root"
      onMouseEnter={() => setOffen(true)}
    >
      <button
        type="button"
        className="isl-stationen-orb-pill"
        data-testid="stationen-orb-pill"
        aria-label="Stationen öffnen"
        aria-expanded={offen}
        // Bewusst NUR öffnen (kein Toggle) — s. identischer Kommentar in
        // AnsichtsInfo.tsx: ein Klick folgt physisch immer auf einen Hover,
        // der bereits öffnet; ein Toggle würde das Popover sofort wieder
        // schliessen.
        onClick={() => setOffen(true)}
      >
        {/* P-F2 (Owner-Feedback 23.07. wörtlich: «der AK Button soll ein
            symbol erhalten (nicht text)»): das rohe Textkürzel «AK» weicht
            einem Icon aus dem bestehenden Bestand (`packages/kosmo-ui/src/
            icons.tsx`) — kein neues Zeichen erfunden. `mehr` (drei Punkte)
            ist bereits die App-weite Konvention für «weitere/andere
            Optionen» (derselbe Fallback-Glyph für unbekannte Untertool-
            Icons, `OrbitStart.tsx` `UNTERTOOL_ICON`) und passt damit
            wörtlich zur Funktion dieses Knopfs: Direktzugang zu den
            ANDEREN Stationen. `aria-hidden` (Standard von `KIcon` ohne
            `title`-Prop) — der Button trägt sein `aria-label` bereits
            selbst, kein doppelter Accessible-Name nötig. */}
        <KIcon name="mehr" size={16} />
      </button>
      {offen ? (
        <div className="isl-buehnenkopf-popover isl-stationen-orb-popover-liste" data-testid="stationen-orb-popover">
          {onZentrale ? (
            <button
              type="button"
              className="isl-stationen-orb-eintrag"
              data-testid="stationen-orb-eintrag-zentrale"
              onClick={() => {
                setOffen(false);
                onZentrale();
              }}
            >
              {/* Kein Rollenpunkt/keine Gruppe — «Zentrale» ist kein
                  Hauptwerkzeug (s. Kopfkommentar). */}
              Zentrale
            </button>
          ) : null}
          {andereHauptwerkzeuge.map((h) => (
            <div key={h.id} className="isl-stationen-orb-gruppe" data-testid={`stationen-orb-gruppe-${h.id}`}>
              <div className="isl-leiste-kopf">{h.titel}</div>
              {h.untertools.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="isl-stationen-orb-eintrag"
                  data-testid={`stationen-orb-eintrag-${u.testidOverride ?? u.id}`}
                  disabled={u.kommend}
                  aria-disabled={u.kommend ? true : undefined}
                  onClick={
                    u.kommend || !u.moduleId
                      ? undefined
                      : () => {
                          setOffen(false);
                          onStationOeffnen(u.moduleId!);
                        }
                  }
                >
                  {u.titel}
                  {u.kommend ? <span className="k-orbit-badge-kommend">kommend</span> : null}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
