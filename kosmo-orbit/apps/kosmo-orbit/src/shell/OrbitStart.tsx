import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from 'react';
import { flipFirst, flipPlay, KIcon, moduleHue, OrbitMark, Wordmark, type KIconName, type ModuleId } from '@kosmo/ui';
import {
  ORBIT_HAUPTWERKZEUGE,
  type HauptwerkzeugId,
  type OrbitHauptwerkzeug,
  type OrbitUntertool,
} from './orbit-werkzeuge';
import { IconHauptData, IconHauptDesign, IconHauptKosmo, IconHauptOffice } from './orbit-icons';
import type { StationModulId } from './stations-werkzeuge';
import {
  anfangsKontingent,
  naechsteReihenfolge,
  STATION_ZU_TOOLID,
  type ToolId,
  type UmordnungsKontingent,
} from '../state/orbit-rang';
import { nutzungsProfil } from '../state/oberflaeche-adaption-kern';
import { useProject } from '../state/project-store';
import type { SiaPhase } from '@kosmo/kernel';
import type { FlipRechteck } from '@kosmo/ui';
import './orbit-065.css';

/**
 * Serie K / F3 → v0.8.4 PA2 (Owner-Auftrag «Hauptmenü-Neubau», wörtlich:
 * «kein Balken oben, KosmoOrbit-Schriftzug zentral mittig, Texte zentriert,
 * NICHT scrollbar, unten mittig Kosmo·KosmoData·KosmoDesign·KosmoOffice
 * nebeneinander, NICHT mehr drehend, Icons nach Designsprache, Hover-
 * Untertools sauber ohne Überlappung», docs/V084-SPEZ.md §4).
 *
 * NEU seit PA2: die vier Hauptwerkzeuge kreisen NICHT mehr — sie stehen
 * STATISCH als Reihe unten mittig (`zentrale-kacheln`, Owner-Reihenfolge
 * Kosmo·KosmoData·KosmoDesign·KosmoOffice, s. `KACHEL_REIHENFOLGE` unten;
 * die DATENTABELLE `ORBIT_HAUPTWERKZEUGE`/ihre Reihenfolge bleibt
 * unangetastet — nur die Anzeige-Reihenfolge ist neu, kein Eingriff in
 * `orbit-werkzeuge.ts`/dessen Unit-Test). Die zentrierte Wortmarke
 * (`orbit-wortmarke`) + Versionszeile (`orbit-version`) leben jetzt HIER
 * (ersetzen den `app-header`, der auf `screen==='home'` nicht mehr rendert,
 * s. `App.tsx`). Hover/Fokus öffnet je Hauptwerkzeug einen Fächer, der IMMER
 * nach OBEN wächst (keine Kompassrichtung mehr — die Reihe hat nur noch
 * eine sinnvolle Öffnungsrichtung).
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
 * ~40 betroffenen Specs auf `page.hover(...)` umzuschreiben. PA2 hält diese
 * Konvention bewusst durch (V084-SPEZ §4 verlangt es explizit).
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

/**
 * PA2 (v0.8.4, V084-SPEZ §4): Owner-Reihenfolge der Kachel-REIHE — «unten
 * mittig Kosmo·KosmoData·KosmoDesign·KosmoOffice nebeneinander». Bewusst NUR
 * eine Anzeige-Reihenfolge, KEIN Eingriff in `ORBIT_HAUPTWERKZEUGE` selbst
 * (die Datentabelle bleibt design/data/kosmo/office — ihr bestehender
 * Unit-Test `orbit-werkzeuge.test.ts` prüft genau diese Reihenfolge und
 * gehört nicht zum PA2-Dateikreis).
 */
const KACHEL_REIHENFOLGE: HauptwerkzeugId[] = ['kosmo', 'data', 'design', 'office'];

function kachelReihe(): OrbitHauptwerkzeug[] {
  return KACHEL_REIHENFOLGE.map((id) => ORBIT_HAUPTWERKZEUGE.find((h) => h.id === id)!);
}

/**
 * K13 (Owner-Korrektur, docs/OWNER-KORREKTUREN-2026-07.md: «entwerfen
 * modeliieren, draw, prepare, vis und so bitte sauber machen, gerade und
 * nüchterne blöcke und ganze logos bitte»; docs/V0812-START-SPEZ.md E-S2) —
 * ERSETZT die frühere R2-N2-Staffelung (leichte Rotation/Versatz je Karte,
 * «der Kreisgeometrie folgend»): die Fächer-Einträge sind jetzt eine gerade,
 * linksbündige Blockliste (`.orbit065-karte` in `orbit-065.css`, kein
 * `transform: rotate(...)`/`clip-path` mehr, 1px-Hairline zwischen Blöcken
 * statt radial gestaffelter Karteikarten). Reine OPTIK-Änderung — Öffnen/
 * Schliessen, Klick-Regeln, alle Testids/aria, die Hub-Rang-Reihenfolge
 * (`useHubRang`/`mitRang` unten) bleiben unverändert (Kopfkommentar dieser
 * Datei, Klick-Vertrag).
 *
 * Jedes Untertool bekommt ein VOLLSTÄNDIGES Logo aus der bestehenden
 * KIcon-Registry (`packages/kosmo-ui/src/icons.tsx`, Grösse 20 — erlaubte
 * KIcon-Grössen sind NUR 14/16/20, K7-Lehre). KIcon ist eine generische
 * Utility-Registry (kein Werkzeug-Logo-Satz) — keines der Untertools hat
 * dort ein eigenes, benanntes Logo; jede Zuordnung unten ist darum das
 * SACHLICH PASSENDSTE vorhandene Zeichen (dokumentiert im Baubericht als
 * Icon-Zuordnungstabelle). KEINE neuen Icons in `kosmo-ui` (eingefroren).
 */
const UNTERTOOL_ICON: Record<string, KIconName> = {
  // KosmoDesign
  draw: 'stift', // Zeichnen (Wände/Decken/Dach/Pläne) — Stift = Zeichenwerkzeug.
  prepare: 'lupe', // Grundlagen aufnehmen/Wissenssuche — Lupe = Recherche.
  vis: 'kamera', // Renderings/Varianten/Stimmungen — Kamera = Bild/Rendering.
  publish: 'export', // Plansätze/Layouts/Export — wörtlich passend.
  modellbaum: 'ebenen', // IFC-Baum/Mengen/Ausmass — Ebenen/Stapel als Baum-Sinnbild.
  // KosmoData
  reference: 'dokument', // Referenzen-/Bauteilkatalog, Wissen — Dokument.
  asset: 'ordner', // Objekte/Materialien/Bauteile — Ordner als Ablage.
  // Kosmo
  speak: 'mikrofon', // Sprechen mit Kosmo — wörtlich passend.
  sketch: 'hand', // Freihand → Wände (Pencil) — Hand = Freihand-Geste.
  modell: 'fit', // FreeMesh/frei formen — Eck-Klammern als Form-/Bounding-Box-Sinnbild.
  train: 'stern', // Lernstand/Kuration/Training — Stern = Bewertung/Kuration.
  dev: 'zahnrad', // Auftragsbuch/Verbesserungen — Zahnrad = technische Weiterentwicklung.
  doc: 'auge', // Diagnose/Hilfe/Berichte — Auge = Einblick/Beobachtung.
  trust: 'schloss', // .kxp-Viewer/Freigabe-Workflow — Schloss = Vertrauen/Sicherheit.
  paket: 'schweben', // Export-Hub (6 Formate + .kxp) — «aus dem Dock heben», bewusst
  // anders als Publishs `export` (Abgrenzung zweier verwandter, aber
  // unterschiedlicher Export-Konzepte).
  // KosmoOffice (kommend)
  lead: 'fahne', // Chefabteilung/Leitung — Fahne = Führungsmarke.
  'buero-hr': 'haken', // Personal/Zeit/Löhne/Rechnungen — Haken = abgeschlossene Vorgänge.
  lehre: 'pfeil-rechts', // Lern-/Aufgaben-Tool, geführte Abläufe — Pfeil = geführter Schritt.
  bau: 'warnung', // Baustelle: Termine/Mängel/Begehungen — Warnung = Mängel-/Risikobezug.
};

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
      {/* PA2: die Wortmarke ersetzt den `app-header`, der auf der Zentrale
          nicht mehr rendert (App.tsx). `flex:1` zentriert sie vertikal im
          verbleibenden Raum ÜBER der Kachel-Reihe — «KosmoOrbit-Schriftzug
          zentral mittig» (Owner-Auftrag wörtlich). */}
      <div className="orbit084-wortmarke-buehne">
        <button
          type="button"
          className="k-druck app-druck-reset orbit084-wortmarke"
          data-testid="orbit-wortmarke"
          aria-label="KosmoOrbit"
          tabIndex={-1}
        >
          <OrbitMark module="orbit" size={40} />
          {/* `Wordmark` zeigt OHNE `version`-Prop den Rückwärtskompat-
              Platzhalter «V1» (`Logo.tsx`, `version ?? 'V1'`) — das wäre
              hier falsch (echte Version ist v0.8.3) UND doppelt zur
              eigenen `orbit-version`-Zeile darunter. Leerstring statt
              `undefined` unterdrückt den Platzhalter (`?? ` greift nur bei
              null/undefined, nicht bei `''`) — der `app-version`-Testid
              bleibt im DOM, zeigt aber nichts an. */}
          <Wordmark size={30} version="" />
        </button>
        <div className="orbit084-version" data-testid="orbit-version">{`v${__APP_VERSION__}`}</div>
      </div>
      <div className="k-orbit-ring-feld" data-testid="zentrale-kacheln">
        {/* Rein dekorativer Mittelpunkt — bewusst OHNE das OrbitMark-
            Fadenkreuz-Icon: das Icon ist bereits das Zeichen des «Kosmo»-
            Hauptwerkzeugs (IconHauptKosmo, siehe orbit-icons.tsx). Bleibt
            als Element/Klasse erhalten (orbit-faecher.spec misst seine
            Bounding-Box, ausserhalb des PA2-Dateikreises), sitzt jetzt
            zentriert HINTER der Kachel-Reihe statt im Kreismittelpunkt. */}
        <div className="k-orbit-mitte orbit065-mitte" aria-hidden />
        {kachelReihe().map((h) => {
          const Icon = ICONS[h.id];
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
                {/* R1-Fix (Kritik-065 p-01/i-01): Titel sitzt `position:
                    absolute` UNTERHALB des Kreises mit festem Abstand
                    (`.orbit065-hauptknopf-unterlabel`, orbit-065.css) —
                    bleibt Kind des `<button>` (Klick-/Text-Vertrag,
                    `toContainText` in orbit-start.spec unverändert grün). */}
                <span className="orbit065-hauptknopf-unterlabel">
                  <span className="k-orbit-hauptknopf-titel">{h.titel}</span>
                  {h.kommend && <span className="k-orbit-badge-kommend">kommend</span>}
                </span>
              </button>
              {/* PA2: der Fächer öffnet IMMER nach OBEN (keine Kompass-
                  richtung mehr — eine horizontale Kachel-Reihe hat nur noch
                  eine sinnvolle Öffnungsrichtung: über sich selbst, nie
                  zwischen die Nachbar-Kacheln). Familien-Beschrieb bekommt
                  festen Platz ÜBER dem Kartenfächer (eigenes Element,
                  `--k-s3`-Abstand aus dem `gap` der Hülle in
                  orbit-065.css) statt als erste Zeile IM Fächer. */}
              <div className={`orbit065-faecher-huelle orbit065-faecher-huelle--oben${offen ? ' offen' : ''}`}>
                <div className="orbit065-beschrieb" data-testid={`orbit-beschrieb-${h.id}`}>
                  {h.kurzbeschrieb}
                </div>
                <div
                  className={`k-orbit-faecher${offen ? ' offen' : ''}`}
                  data-testid={`orbit-faecher-${h.id}`}
                >
                  {untertoolsFuerAnzeige.map((u) => {
                    const testid = u.kommend
                      ? `orbit-office-${u.id}`
                      : (u.testidOverride ?? (u.moduleId ? `module-${u.moduleId}` : `orbit-sub-${u.id}`));
                    // Hub-Rang (Spec §4): die REIHENFOLGE der Blöcke folgt
                    // weiterhin dem Rang (s. `mitRang` oben, unverändert) —
                    // `rangToolId` bleibt nur für das FLIP-Ref-Tracking nötig
                    // (Positions-Übergang beim Umsortieren). K13 (s.
                    // Kopfkommentar `UNTERTOOL_ICON`): die frühere optische
                    // Rang-Betonung (Glow-Ring je Tier) entfällt zugunsten
                    // EINES einheitlichen, nüchternen Blocks je Untertool —
                    // «gerade und nüchterne Blöcke», kein Neon, keine
                    // Sondergrösse nach Rang mehr. Aus demselben Grund entfällt
                    // hier die frühere Kinder-Staffelung (Aufgabe 4, `.orbit065-
                    // sheet-kind`/`animationDelay`, 24ms-Versatz je Karte) —
                    // die Klasse/Keyframes bleiben unverändert für ihre anderen
                    // Verbraucher (z. B. CommandPalette.tsx) bestehen, nur DIESE
                    // Blockliste verzichtet bewusst auf den Bounce-Einzug
                    // («nüchtern» statt verspielt). Nebeneffekt (Sub-Pixel-
                    // Regression live gefunden, `orbit-start.spec.ts` «Fächer:
                    // paarweise Bounding-Box-Überlappung … ist 0»): die
                    // gestaffelte Karten-Eintritts-Transform liess einzelne
                    // Blöcke der neuen, eng getakteten Liste (44px + 1px statt
                    // vormals 16px Abstand) je nach Messzeitpunkt kurzzeitig
                    // unterschiedlich weit transformiert erscheinen — ohne
                    // Staffelung ist die Geometrie ab dem ersten Frame endgültig.
                    const rangToolId = toolIdVon(u);
                    const iconName = UNTERTOOL_ICON[u.id] ?? 'mehr';
                    return (
                      <div
                        key={u.id}
                        className="k-orbit-untertool-zeile"
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
                          // Aufgabe 3: `.k-druck` auf jedem Fächer-Block.
                          // K13: gerade, linksbündige Blockliste statt
                          // rotierter Karteikarten (s. `orbit-065.css`).
                          className="k-orbit-untertool orbit065-karte k-druck"
                          data-testid={testid}
                          disabled={u.kommend}
                          aria-label={u.kommend ? `${u.titel} — kommend, noch nicht verfügbar` : `${u.titel} öffnen`}
                          onClick={() => {
                            if (u.kommend || !u.moduleId) return;
                            onOeffnen(u.moduleId);
                          }}
                        >
                          {/* K13: vollständiges Logo je Block (KIcon-Registry,
                              Grösse 20 — K7-Lehre: nur 14/16/20 erlaubt),
                              IMMER sichtbar (kein Rang-Sonderfall mehr). Rein
                              dekorativ (Text daneben trägt die Bedeutung),
                              darum ohne `title`-Prop → KIcon setzt
                              `aria-hidden` selbst. */}
                          <span className="orbit065-karte-icon">
                            <KIcon name={iconName} size={20} />
                          </span>
                          <span className="orbit065-karte-info">
                            <span className="orbit065-karte-titel">
                              {u.titel}
                              {u.kommend ? ' · kommend' : ''}
                            </span>
                            <span className="orbit065-karte-kurz">{u.kurzbeschrieb}</span>
                          </span>
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
