import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from 'react';
import { flipFirst, flipPlay, moduleHue, type ModuleId } from '@kosmo/ui';
import {
  ORBIT_HAUPTWERKZEUGE,
  type HauptwerkzeugId,
  type OrbitHauptwerkzeug,
  type OrbitUntertool,
} from './orbit-werkzeuge';
import { IconHauptData, IconHauptDesign, IconHauptKosmo, IconHauptOffice } from './orbit-icons';
import { STATION_GLYPHE, WerkzeugGlyphe } from './werkzeug-glyphen';
import type { StationModulId } from './stations-werkzeuge';
import {
  anfangsKontingent,
  naechsteReihenfolge,
  STATION_ZU_TOOLID,
  tierFuerPosition,
  type RangTier,
  type ToolId,
  type UmordnungsKontingent,
} from '../state/orbit-rang';
import { nutzungsProfil } from '../state/oberflaeche-adaption-kern';
import { useProject } from '../state/project-store';
import type { SiaPhase } from '@kosmo/kernel';
import type { FlipRechteck } from '@kosmo/ui';
import './orbit-065.css';

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

/**
 * R2-N1 (0.6.5, docs/UI-SELBSTKRITIK-064.md): Kompassrichtung, in der der
 * Fächer eines Knotens aufgeht — abgeleitet aus demselben 90°-Rhythmus wie
 * `verzoegerung()` (4 Hauptwerkzeuge, gleichmässig verteilt: Index 0 startet
 * bei 0° = oben, danach im Uhrzeigersinn rechts/unten/links). Bewusst
 * STATISCH (nicht der laufenden Rotation nachgeführt): der Fächer wächst
 * IMMER vom Knoten-Rand WEG (nie zum Zentrum hin) — das gilt exakt, solange
 * der reale Rotationswinkel nicht mehr als 90° von dieser Start-Richtung
 * abgedriftet ist (siehe Bericht/Grenzen; dieselbe Toleranz akzeptiert der
 * Code bei der `steps()`-Rotation ohnehin schon). */
const ORBIT_RICHTUNGEN = ['oben', 'rechts', 'unten', 'links'] as const;
type OrbitRichtung = (typeof ORBIT_RICHTUNGEN)[number];

function richtungVon(index: number): OrbitRichtung {
  return ORBIT_RICHTUNGEN[index % ORBIT_RICHTUNGEN.length]!;
}

/** R2-N2: leichte Rotation/Versatz je Karte (±2–4°, kleiner horizontaler
 *  Jog) — «der Kreisgeometrie folgend» statt einer geraden Blockliste.
 *  Vier Werte im Wechsel reichen (die Fächer haben 2–6 Karten). */
const KARTEN_ROTATION_DEG = [-3, 2, -2.5, 3.5];
const KARTEN_JOG_PX = [-4, 6, -6, 4];

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

/**
 * V0.7.2 W2-C (Paket 03/05, Spec §4 «Hub-Rang») — Untertool-Kreise nach Rang.
 * Station → ToolId (Rückrichtung der Spec-§4-Tabelle: "draw→design ·
 * viz→vis · data→data · pipeline→dev · chat→speak · publish→publish ·
 * prepare→prepare · connect→(Sync, zählt nicht als Station)"). Nur Stationen
 * mit einer echten BASE-Matrix-Zeile sind rang-fähig — die übrigen
 * Untertools (Modellbaum/Sketch/Modell/Train/Doc/Asset/KosmoOffice) bleiben
 * an ihrer ursprünglichen Position stehen (nur die RANG-FÄHIGEN Slots werden
 * nach Rang neu befüllt, s. `mitRang`) — «nur Reihenfolge/Grösse/Transform
 * ändern» (Harter Vertrag, Spec §11) bleibt damit so wörtlich wie möglich:
 * kein Untertool verlässt seinen Platz, wenn es selbst nicht rang-fähig ist.
 * `STATION_ZU_TOOLID` selbst lebt in `state/orbit-rang.ts` (einzige Quelle,
 * `EntwurfsDock.tsx` importiert dieselbe Tabelle für seine
 * `nutzungMelden`-Zuordnung).
 */
function toolIdVon(u: OrbitUntertool): ToolId | undefined {
  // `testidOverride` markiert einen NICHT-kanonischen Zweitverweis auf
  // dieselbe Station (z. B. «Modell» → `design`, dieselbe moduleId wie
  // «Draw») — der zählt NICHT ein zweites Mal als rang-fähiger Slot.
  if (u.testidOverride || !u.moduleId) return undefined;
  return STATION_ZU_TOOLID[u.moduleId as StationModulId];
}

/** Die rang-fähigen ToolIds EINES Fächers, in Autorenreihenfolge (Eingabe
 *  für `naechsteReihenfolge` — die Reihenfolge hier entscheidet nur über
 *  stabile Gleichstand-Sortierung, nicht über den Rang selbst). */
function rangfaehigeToolIds(untertools: readonly OrbitUntertool[]): ToolId[] {
  const ids: ToolId[] = [];
  for (const u of untertools) {
    const t = toolIdVon(u);
    if (t && !ids.includes(t)) ids.push(t);
  }
  return ids;
}

/** Setzt die rang-fähigen SLOTS einer (bereits rollen-sortierten) Untertool-
 *  Liste auf die übergebene Rang-Reihenfolge um — nicht-rang-fähige
 *  Untertools bleiben exakt an ihrer Position (s. Kopfkommentar). */
function mitRang(untertools: readonly OrbitUntertool[], reihenfolge: readonly ToolId[]): OrbitUntertool[] {
  if (reihenfolge.length === 0) return [...untertools];
  const zuUntertool = new Map<ToolId, OrbitUntertool>();
  for (const u of untertools) {
    const t = toolIdVon(u);
    if (t) zuUntertool.set(t, u);
  }
  const queue = [...reihenfolge];
  return untertools.map((u) => {
    const t = toolIdVon(u);
    if (!t) return u;
    const naechste = queue.shift();
    return naechste !== undefined ? (zuUntertool.get(naechste) ?? u) : u;
  });
}

/** Icon-Grösse (px) innerhalb des Rang-Kreises je Tier — kleiner als der
 *  Kreis selbst (`TIER_GROESSE`, `orbit-rang.ts`), damit ein sichtbarer
 *  Ring/Rand um das Icon bleibt. */
const ICON_GROESSE: Record<RangTier, number> = { innen: 28, mitte: 24, aussen: 20 };

/**
 * Rang-Reihenfolge EINES Fächers, mit Hysterese/Anti-Nerv-Kontingent über
 * die Lebensdauer DIESER Komponenten-Instanz hinweg (s. `orbit-rang.ts`
 * Kopfkommentar zu `darfUmordnen`/`naechsteReihenfolge`). Absichtlich
 * PRO-MOUNT-Zustand (kein Modul-Singleton): ein Wechsel zurück zur Zentrale
 * (Remount von `OrbitStart`) darf frisch nach der aktuellen Phase sortieren
 * — «Sitzungsminute» meint hier die laufende Betrachtung des Hubs, nicht
 * die ganze App-Sitzung.
 */
function useHubRang(rangfaehig: readonly ToolId[], phase: SiaPhase): ToolId[] {
  const kontingentRef = useRef<UmordnungsKontingent>(anfangsKontingent());
  const raengeRef = useRef<Record<ToolId, number> | null>(null);
  const rangfaehigSchluessel = rangfaehig.join(',');

  const [reihenfolge, setReihenfolge] = useState<ToolId[]>(() => {
    if (rangfaehig.length === 0) return [];
    const ergebnis = naechsteReihenfolge({
      toolIds: rangfaehig,
      siaPhase: phase,
      nutzung: nutzungsProfil(),
      alteReihenfolge: [],
      alteRaenge: null,
      kontingent: kontingentRef.current,
      jetztMs: Date.now(),
    });
    kontingentRef.current = ergebnis.kontingent;
    raengeRef.current = ergebnis.raenge;
    return ergebnis.reihenfolge;
  });

  useEffect(() => {
    if (rangfaehig.length === 0) return;
    const ergebnis = naechsteReihenfolge({
      toolIds: rangfaehig,
      siaPhase: phase,
      nutzung: nutzungsProfil(),
      alteReihenfolge: reihenfolge,
      alteRaenge: raengeRef.current,
      kontingent: kontingentRef.current,
      jetztMs: Date.now(),
    });
    kontingentRef.current = ergebnis.kontingent;
    raengeRef.current = ergebnis.raenge;
    if (ergebnis.umgeordnet) setReihenfolge(ergebnis.reihenfolge);
    // Bewusst NUR [phase, rangfaehigSchluessel] — Nutzung wird bei jedem
    // Klick im EntwurfsDock gemeldet (anderes Modul), nicht hier live
    // beobachtet; ein Phasenwechsel oder ein frischer Fächer-Inhalt genügt,
    // um mit dem NEUESTEN Nutzungsstand neu zu rechnen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, rangfaehigSchluessel]);

  return reihenfolge;
}

export function OrbitStart({ onOeffnen, rollenPrio }: OrbitStartProps) {
  const [aktiverHaupt, setAktiverHaupt] = useState<HauptwerkzeugId | null>(null);

  const untertoolsVon = (h: OrbitHauptwerkzeug) => sortiereNachRolle(h.untertools, rollenPrio);

  // V0.7.2 W2-C (Hub-Rang, Spec §4): `revision` löst einen Re-Render aus,
  // sobald sich `doc.settings.siaPhase` ändert (z. B. Klick auf
  // `PhasenLeiste.tsx`, App-weiter Header) — `doc` selbst wird mutable über
  // `getState()` gelesen (dasselbe Muster wie `DesignWorkspace.tsx`).
  const revision = useProject((s) => s.revision);
  void revision;
  const aktuellePhase = useProject.getState().doc.settings.siaPhase;

  const designHaupt = ORBIT_HAUPTWERKZEUGE.find((h) => h.id === 'design')!;
  const dataHaupt = ORBIT_HAUPTWERKZEUGE.find((h) => h.id === 'data')!;
  const kosmoHaupt = ORBIT_HAUPTWERKZEUGE.find((h) => h.id === 'kosmo')!;
  const designReihenfolge = useHubRang(rangfaehigeToolIds(untertoolsVon(designHaupt)), aktuellePhase);
  const dataReihenfolge = useHubRang(rangfaehigeToolIds(untertoolsVon(dataHaupt)), aktuellePhase);
  const kosmoReihenfolge = useHubRang(rangfaehigeToolIds(untertoolsVon(kosmoHaupt)), aktuellePhase);
  const rangReihenfolgeProHaupt: Partial<Record<HauptwerkzeugId, ToolId[]>> = {
    design: designReihenfolge,
    data: dataReihenfolge,
    kosmo: kosmoReihenfolge,
  };

  // FLIP (Spec §4: 240–500ms `--k-ease-standard` bei Umsortierung) — Rang-
  // Kreise bleiben permanent im DOM (Harter Vertrag), nur ihre Position im
  // Fächer ändert sich; `flipPlay` prüft `prefers-reduced-motion` selbst
  // (kein Sonderfall hier nötig, s. `packages/kosmo-ui/src/flip.ts`).
  const kreisRefs = useRef<Map<HauptwerkzeugId, Map<ToolId, HTMLElement>>>(new Map());
  const vorherigeRechtecke = useRef<Map<HauptwerkzeugId, Map<ToolId, FlipRechteck>>>(new Map());
  useLayoutEffect(() => {
    for (const hauptId of Object.keys(rangReihenfolgeProHaupt) as HauptwerkzeugId[]) {
      const reihenfolge = rangReihenfolgeProHaupt[hauptId] ?? [];
      const refs = kreisRefs.current.get(hauptId);
      if (!refs) continue;
      let rechtecke = vorherigeRechtecke.current.get(hauptId);
      if (!rechtecke) {
        rechtecke = new Map();
        vorherigeRechtecke.current.set(hauptId, rechtecke);
      }
      for (const toolId of reihenfolge) {
        const el = refs.get(toolId);
        if (!el) continue;
        const vorher = rechtecke.get(toolId);
        if (vorher) flipPlay(el, vorher);
        rechtecke.set(toolId, flipFirst(el));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designReihenfolge.join(','), dataReihenfolge.join(','), kosmoReihenfolge.join(',')]);

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
        {/* Rein dekorativer Kreismittelpunkt (Bahn-Anker) — bewusst OHNE das
            OrbitMark-Fadenkreuz-Icon: das Icon ist bereits das Zeichen des
            «Kosmo»-Hauptwerkzeugs (IconHauptKosmo, siehe orbit-icons.tsx);
            hier verdoppelt es sich zu einem unbeschrifteten, knopfartig
            wirkenden 5. Kreis mitten im Ring (Kritik-065 p-01/i-01: «Unbe-
            schrifteter Orbit-Knoten mit dupliziertem Fadenkreuz-Icon»). Bleibt
            als Element/Klasse erhalten (orbit-faecher.spec misst seine
            Bounding-Box), zeigt aber nur noch einen stillen Punkt. */}
        <div className="k-orbit-mitte orbit065-mitte" aria-hidden />
        {ORBIT_HAUPTWERKZEUGE.map((h, index) => {
          const Icon = ICONS[h.id];
          const delay = verzoegerung(index);
          const offen = aktiverHaupt === h.id;
          // Hub-Rang (Spec §4): rang-fähige Slots (s. `toolIdVon`) folgen der
          // Rang-Reihenfolge dieses Fächers, alle anderen Untertools bleiben
          // an ihrer rollen-sortierten Position (s. `mitRang`-Kommentar).
          // AUSNAHME (Vollsuiten-Befund 0.7.2-Finale): Greift in DIESEM
          // Fächer eine explizit gewählte Rolle (`rollenPrio` trifft
          // mindestens ein Untertool), gewinnt die Rollen-Vorstufe
          // (Vision D2, e2e/module.spec «Rolle Ausführung → Publish vorn»)
          // — das ambiente Rang-Signal ordnet nur die Neutral-Rolle um.
          const rolleGreift =
            rollenPrio !== undefined &&
            h.untertools.some((u) => u.moduleId !== undefined && rollenPrio.includes(u.moduleId));
          const rangReihenfolge = rolleGreift ? [] : (rangReihenfolgeProHaupt[h.id] ?? []);
          const untertoolsFuerAnzeige = mitRang(untertoolsVon(h), rangReihenfolge);
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
                  // Aufgabe 3: `.k-druck` (Knopfdrucksimulation). Aufgabe 6
                  // (C-Befund 5, Fächer-Planet-Bezug): `aria-expanded`
                  // (unverändert vorhanden) steuert per CSS-Attributselektor
                  // in `orbit-065.css` einen Akzent-Rahmen, solange der
                  // Fächer dieses Planeten offen ist — kein zweiter State.
                  className="k-orbit-hauptknopf k-druck"
                  data-testid={`orbit-haupt-${h.id}`}
                  aria-label={h.kommend ? `${h.titel} — kommend, V2` : `${h.titel} — Untertools zeigen`}
                  aria-expanded={offen}
                  onClick={() => klickHauptwerkzeug(h)}
                >
                  <Icon akzent={HAUPT_AKZENT[h.id]} />
                  {/* R1-Fix (Kritik-065 p-01/i-01): Titel sass VORHER als
                      flex-Zeile IM 108px-Kreis — bei Namen wie «KosmoDesign»
                      reichte die Kreis-Sehne an dieser Höhe nicht für die
                      Textbreite, die Buchstaben schnitten den Tuscherand
                      (siehe Bericht/Messung). Jetzt `position:absolute`
                      UNTERHALB des Kreises mit festem Abstand
                      (`.orbit065-hauptknopf-unterlabel`, orbit-065.css) —
                      bleibt Kind des `<button>` (Klick-/Text-Vertrag,
                      `toContainText` in orbit-start.spec unverändert grün),
                      unabhängig von der Kompasslage (der Knopf selbst dreht
                      sich dank Gegenrotation nie). */}
                  <span className="orbit065-hauptknopf-unterlabel">
                    <span className="k-orbit-hauptknopf-titel">{h.titel}</span>
                    {h.kommend && <span className="k-orbit-badge-kommend">kommend</span>}
                  </span>
                </button>
                {/* R2-N1/R2-N2 (0.6.5): Fächer öffnet AUSSERHALB des Rings
                    (Kompassrichtung `richtungVon`, siehe Kommentar oben),
                    Familien-Beschrieb bekommt festen Platz ÜBER dem
                    Kartenfächer (eigenes Element, `--k-s3`-Abstand aus dem
                    `gap` der Hülle in orbit-065.css) statt als erste Zeile
                    IM Fächer. */}
                <div
                  className={`orbit065-faecher-huelle orbit065-faecher-huelle--${richtungVon(index)}${offen ? ' offen' : ''}`}
                >
                  <div className="orbit065-beschrieb" data-testid={`orbit-beschrieb-${h.id}`}>
                    {h.kurzbeschrieb}
                  </div>
                  <div
                    className={`k-orbit-faecher${offen ? ' offen' : ''}`}
                    data-testid={`orbit-faecher-${h.id}`}
                  >
                    {untertoolsFuerAnzeige.map((u, kartenIndex) => {
                      const testid = u.kommend
                        ? `orbit-office-${u.id}`
                        : (u.testidOverride ?? (u.moduleId ? `module-${u.moduleId}` : `orbit-sub-${u.id}`));
                      const staffel = kartenIndex % KARTEN_ROTATION_DEG.length;
                      // Aufgabe 4 (Konzept §4, Kinder-Staffelung 24ms/max. 8):
                      // die Klasse (und damit die Animation) wird NUR gesetzt,
                      // solange der Fächer offen ist — die Karten bleiben laut
                      // E2E-Vertrag permanent im DOM (siehe Kopfkommentar),
                      // ein CSS-`animation: ... both`, das dauerhaft anläge,
                      // liefe nur EINMAL beim Erstmount statt bei jedem
                      // Öffnen. Der Klassenwechsel (weg/da) lässt die
                      // Animation bei jedem `offen`-Wechsel neu anlaufen.
                      const staggerVerzoegerung = `${Math.min(kartenIndex, 8) * 24}ms`;
                      // Hub-Rang (Spec §4): Kreis-Grösse/-Betonung nur für
                      // rang-fähige Untertools (s. Kopfkommentar `toolIdVon`).
                      const rangToolId = toolIdVon(u);
                      const rangPosition = rangToolId ? rangReihenfolge.indexOf(rangToolId) : -1;
                      const rangTier: RangTier | null =
                        rangToolId && rangPosition >= 0 ? tierFuerPosition(rangPosition) : null;
                      const rangStation = rangTier && u.moduleId ? STATION_GLYPHE[u.moduleId as StationModulId] : undefined;
                      return (
                        <div
                          key={u.id}
                          className={`k-orbit-untertool-zeile${offen ? ' orbit065-sheet-kind' : ''}`}
                          style={offen ? ({ animationDelay: staggerVerzoegerung } as CSSProperties) : undefined}
                          ref={(el) => {
                            if (!rangToolId) return;
                            let refs = kreisRefs.current.get(h.id);
                            if (!refs) {
                              refs = new Map();
                              kreisRefs.current.set(h.id, refs);
                            }
                            if (el) refs.set(rangToolId, el);
                            else refs.delete(rangToolId);
                          }}
                        >
                          <button
                            type="button"
                            // Aufgabe 3: `.k-druck` auf jeder Fächer-Karte.
                            className="k-orbit-untertool orbit065-karte k-druck"
                            style={
                              {
                                '--k-karte-rot': `${KARTEN_ROTATION_DEG[staffel]}deg`,
                                '--k-karte-jog': `${KARTEN_JOG_PX[staffel]}px`,
                              } as CSSProperties
                            }
                            data-testid={testid}
                            disabled={u.kommend}
                            aria-label={u.kommend ? `${u.titel} — kommend, noch nicht verfügbar` : `${u.titel} öffnen`}
                            onClick={() => {
                              if (u.kommend || !u.moduleId) return;
                              onOeffnen(u.moduleId);
                            }}
                          >
                            {rangTier && rangStation && (
                              // Hub-Rang-Kreis (Spec §4): Top-3 innen 64px +
                              // Rollenfarben-Border/Glow, Mitte 54, aussen 46
                              // — Rollenfarbe AUS DERSELBEN Quelle wie das
                              // Icon (`STATION_GLYPHE`, keine Zweitquelle).
                              <span
                                className={`orbit065-rang-kreis orbit065-rang-kreis--${rangTier}`}
                                style={{ '--k-rang-rolle': `var(${rangStation.rolle})` } as CSSProperties}
                                aria-hidden
                              >
                                <WerkzeugGlyphe art={rangStation.art} rolle={rangStation.rolle} size={ICON_GROESSE[rangTier]} />
                              </span>
                            )}
                            <span className="orbit065-karte-titel">
                              {u.titel}
                              {u.kommend ? ' · kommend' : ''}
                            </span>
                            <span className="orbit065-karte-kurz">{u.kurzbeschrieb}</span>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
