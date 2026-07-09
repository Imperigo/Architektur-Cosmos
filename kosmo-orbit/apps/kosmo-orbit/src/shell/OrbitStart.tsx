import {
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from 'react';
import { OrbitMark, moduleHue, type ModuleId } from '@kosmo/ui';
import {
  ORBIT_HAUPTWERKZEUGE,
  type HauptwerkzeugId,
  type OrbitHauptwerkzeug,
  type OrbitUntertool,
} from './orbit-werkzeuge';
import { IconHauptData, IconHauptDesign, IconHauptKosmo, IconHauptOffice } from './orbit-icons';

/**
 * Serie K / F3 — Owner-Auftrag wörtlich: «das startmenü muss neu gestaltet
 * werden ... nicht Blöcke, eher wie das Kosmos-Zeichen rund ... NUR die 4
 * Hauptwerkzeuge anzeigen ... im Kreis angeordnet, GANZ LANGSAM im Kreis
 * bewegen ... Hover auf Hauptwerkzeug zeigt Untertools mit Titel + Kurz-
 * beschrieb, Hover auf Untertool zeigt was es kann.»
 *
 * Ersetzt die alte Kachel-Ansicht (`ZentraleKachel.tsx`, jetzt entfernt) für
 * die 4 Hauptwerkzeuge. Datentabelle: `orbit-werkzeuge.ts` (Mapping-
 * Entscheidungen dort dokumentiert).
 *
 * E2E-VERTRAG-ENTSCHEIDUNG (Owner-Auftrag nennt zwei Optionen, diese Datei
 * wählt die zweite): Untertool-Knöpfe (`data-testid="module-<id>"`) sind
 * IMMER im DOM, IMMER mit realer Boxgrösse und `pointer-events: auto` —
 * NIE `display:none`/`max-height:0`/`visibility:hidden`. Nur ihre Opazität
 * (`.k-orbit-faecher` ↔ `.offen`) signalisiert optisch offen/zu. Damit
 * bleibt JEDER bestehende `page.click('[data-testid="module-design"]')`
 * (ohne vorheriges Hover) unverändert grün — das war günstiger als alle
 * ~40 betroffenen Specs auf `page.hover(...)` umzuschreiben.
 *
 * Klick-Vertrag (Maus + Touch + Tastatur EIN Weg):
 *  - Hover/Fokus auf ein Hauptwerkzeug → Fächer öffnet sich (`aktiverHaupt`).
 *  - Klick auf ein noch NICHT aktives Hauptwerkzeug → öffnet NUR den Fächer
 *    (erster Tap auf Touch, ohne Hover-Vorlauf).
 *  - Klick auf ein BEREITS aktives Hauptwerkzeug (z. B. weil die Maus schon
 *    darüber hovert, oder zweiter Tap) → öffnet sein primäres Untertool.
 *  - KosmoOffice ist «kommend»: Klick öffnet/hält NUR die Vorschau offen,
 *    NIE eine Navigation — seine Untertools sind `disabled` (kein
 *    Playwright-`.click()` möglich, kein leerer Screen erreichbar).
 */

export interface OrbitStartProps {
  /** Öffnet die Station mit dieser echten Registry-Id (wie `oeffneModul` in App.tsx). */
  onOeffnen: (id: ModuleId) => void;
  /**
   * D2 (Rollen-Vorstufe) lebt weiter: die Prioritätsliste der gewählten
   * Rolle (`ROLLEN_REIHENFOLGE` in App.tsx) sortiert die Untertools INNERHALB
   * jedes Fächers — die tägliche Arbeit rückt nach vorn. Die vier
   * Hauptwerkzeuge selbst bleiben fix (Owner-Auftrag F3: genau diese vier,
   * im Kreis).
   */
  rollenPrio?: ModuleId[];
}

function sortiereNachRolle(untertools: OrbitUntertool[], prio?: ModuleId[]): OrbitUntertool[] {
  if (!prio) return untertools;
  const rang = (u: OrbitUntertool) => {
    if (!u.moduleId) return Number.POSITIVE_INFINITY;
    const i = prio.indexOf(u.moduleId);
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };
  // Array.prototype.sort ist stabil — Untertools ohne moduleId («kommend»)
  // behalten ihre Autorenreihenfolge am Ende.
  return [...untertools].sort((a, b) => rang(a) - rang(b));
}

const ICONS: Record<HauptwerkzeugId, (p: { akzent: string }) => ReactElement> = {
  design: IconHauptDesign,
  data: IconHauptData,
  kosmo: IconHauptKosmo,
  office: IconHauptOffice,
};

const HAUPT_AKZENT: Record<HauptwerkzeugId, string> = {
  design: moduleHue.design,
  data: moduleHue.data,
  kosmo: moduleHue.kosmo,
  office: moduleHue.orbit,
};

/** Viertel der Umlaufdauer (siehe `--k-orbit-dauer` in aura.css) als negative
 *  `animation-delay` je Hauptwerkzeug — verteilt die vier Knoten gleichmässig
 *  auf der Kreisbahn, ohne einen zweiten, mit der Rotation kollidierenden
 *  statischen Transform-Wert zu brauchen (siehe CSS-Kommentar in aura.css). */
const ORBIT_DAUER_S = 200;

function verzoegerung(index: number): string {
  return `${-((index * ORBIT_DAUER_S) / ORBIT_HAUPTWERKZEUGE.length)}s`;
}

/** Schliesst den Fächer NUR, wenn Fokus/Maus den ganzen Knoten (Hauptknopf +
 *  Fächer) tatsächlich verlassen hat — Wechsel innerhalb (z. B. Hauptknopf →
 *  Untertool-Zeile) darf nicht zwischenzeitlich schliessen. */
function verlaesstKnoten(
  e: ReactMouseEvent<HTMLElement> | ReactFocusEvent<HTMLElement>,
  knoten: HTMLElement,
): boolean {
  const naechstes = (e as ReactFocusEvent<HTMLElement>).relatedTarget as Node | null;
  if (!naechstes) return true;
  return !knoten.contains(naechstes);
}

export function OrbitStart({ onOeffnen, rollenPrio }: OrbitStartProps) {
  const [aktiverHaupt, setAktiverHaupt] = useState<HauptwerkzeugId | null>(null);

  const untertoolsVon = (h: OrbitHauptwerkzeug) => sortiereNachRolle(h.untertools, rollenPrio);

  const klickHauptwerkzeug = (h: OrbitHauptwerkzeug) => {
    if (h.kommend) {
      setAktiverHaupt(h.id);
      return;
    }
    if (aktiverHaupt !== h.id) {
      setAktiverHaupt(h.id);
      return;
    }
    // Primär = das VORDERSTE Untertool des (rollensortierten) Fächers.
    const primaer = untertoolsVon(h).find((u) => !u.kommend && u.moduleId);
    if (primaer?.moduleId) onOeffnen(primaer.moduleId);
  };

  return (
    <div className="k-orbit-start" data-testid="orbit-start">
      <div className="k-orbit-ring-feld" data-testid="orbit-ring">
        <div className="k-orbit-mitte" aria-hidden>
          <OrbitMark module="kosmo" size={40} />
        </div>
        {ORBIT_HAUPTWERKZEUGE.map((h, index) => {
          const Icon = ICONS[h.id];
          const delay = verzoegerung(index);
          const offen = aktiverHaupt === h.id;
          return (
            <div
              key={h.id}
              className="k-orbit-knoten"
              style={{ '--k-orbit-delay': delay } as CSSProperties}
            >
              <div
                className="k-orbit-knoten-gegendreh"
                style={{ '--k-orbit-delay': delay } as CSSProperties}
                onMouseEnter={() => setAktiverHaupt(h.id)}
                onMouseLeave={(e) => {
                  if (verlaesstKnoten(e, e.currentTarget)) {
                    setAktiverHaupt((vorher) => (vorher === h.id ? null : vorher));
                  }
                }}
                onFocus={() => setAktiverHaupt(h.id)}
                onBlur={(e) => {
                  if (verlaesstKnoten(e, e.currentTarget)) {
                    setAktiverHaupt((vorher) => (vorher === h.id ? null : vorher));
                  }
                }}
              >
                <button
                  type="button"
                  className="k-orbit-hauptknopf"
                  data-testid={`orbit-haupt-${h.id}`}
                  aria-label={h.kommend ? `${h.titel} — kommend, V2` : `${h.titel} — Untertools zeigen`}
                  aria-expanded={offen}
                  onClick={() => klickHauptwerkzeug(h)}
                >
                  <Icon akzent={HAUPT_AKZENT[h.id]} />
                  <span className="k-orbit-hauptknopf-titel">{h.titel}</span>
                  {h.kommend && <span className="k-orbit-badge-kommend">kommend</span>}
                </button>
                <div
                  className={`k-orbit-faecher${offen ? ' offen' : ''}`}
                  data-testid={`orbit-faecher-${h.id}`}
                >
                  <div className="k-orbit-faecher-kopf">{h.kurzbeschrieb}</div>
                  {untertoolsVon(h).map((u) => {
                    const testid = u.kommend
                      ? `orbit-office-${u.id}`
                      : (u.testidOverride ?? (u.moduleId ? `module-${u.moduleId}` : `orbit-sub-${u.id}`));
                    return (
                      <div key={u.id} className="k-orbit-untertool-zeile">
                        <button
                          type="button"
                          className="k-orbit-untertool"
                          data-testid={testid}
                          disabled={u.kommend}
                          aria-label={u.kommend ? `${u.titel} — kommend, noch nicht verfügbar` : `${u.titel} öffnen`}
                          onClick={() => {
                            if (u.kommend || !u.moduleId) return;
                            onOeffnen(u.moduleId);
                          }}
                        >
                          <span className="k-orbit-untertool-titel">
                            {u.titel}
                            {u.kommend ? ' · kommend' : ''}
                          </span>
                          <span className="k-orbit-untertool-kurz">{u.kurzbeschrieb}</span>
                        </button>
                        <div className="k-orbit-faehigkeit" data-testid={`orbit-faehigkeit-${u.id}`}>
                          {u.faehigkeit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
