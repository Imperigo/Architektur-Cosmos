import type { ModuleId } from '@kosmo/ui';
import { STATIONS_WERKZEUGE } from './stations-werkzeuge';
import { V2_PLATZHALTER } from '../state/stationen';

/**
 * Serie K / F3 (Owner-Auftrag, wörtlich: «nicht Blöcke, sondern wie das
 * Kosmos-Zeichen rund ... NUR die 4 Hauptwerkzeuge anzeigen»). Diese Datei
 * ist die reine Zuordnungslogik für das neue Orbit-Startmenü
 * (`OrbitStart.tsx`) — unit-testbar, ohne jede Darstellung.
 *
 * Die vier Hauptwerkzeuge sind KEINE neue Modul-Ebene — sie bündeln
 * ausschliesslich bestehende, echte Stationen (Registry-`ModuleId`, siehe
 * `App.tsx`/`stations-werkzeuge.ts`) zu einer ruhigeren Zentrale. Jedes
 * Untertool mit einer `moduleId` öffnet GENAU die Station, die es angibt —
 * `oeffneModul`/Deep-Links bleiben exakt die bisherigen (siehe `App.tsx`).
 *
 * Mapping-Entscheidungen (Owner-Wortlaut → echte Registry-Id):
 * - KosmoDesign: Draw→`design` (die Zeichenfläche selbst — Wände/Decken/Dach),
 *   Prepare→`prepare`, Vis→`vis`, Publish→`publish`. `draw` (ModuleId,
 *   historisch «KosmoDraw» = Modellbaum/Mengen/Ausmass, NICHT dasselbe wie
 *   das Wort «Draw») bleibt als fünftes, ehrliches Untertool
 *   «Modellbaum» erhalten — der Owner nennt es nicht explizit, aber die
 *   Station existiert wirklich und braucht einen Platz (kein Verlust einer
 *   bestehenden Fähigkeit).
 * - KosmoData: Reference→`data`, Asset→`asset` (Asset wandert damit von der
 *   alten «Design»-Familie zu KosmoData — exakt Owner-Wortlaut).
 * - Kosmo: Speak→`speak`, Sketch→`sketch`, Train→`train`, Dev→`dev`,
 *   Doc→`doc`. «Modell» hat KEIN eigenes Modul in der Registry (geprüft:
 *   FreeMesh ist ein Werkzeug INNERHALB von KosmoDesign/Draw, kein
 *   eigenständiges Modul) — ehrlich als Vorschau mit Hinweis, Klick öffnet
 *   `design` (wo FreeMesh wirklich lebt), OHNE die `module-design`-Testid zu
 *   duplizieren (die gehört Draw).
 * - KosmoOffice: kommend (V2) — die vier Owner-Abteilungen (Lead/HR/Lehre/
 *   Bau) sind Vorschau-Text aus `V2_PLATZHALTER`, NIE klickbar zu einem
 *   leeren Screen.
 */

export type HauptwerkzeugId = 'design' | 'data' | 'kosmo' | 'office';

export interface OrbitUntertool {
  /** Stabiler Schlüssel für Keys/Testids (z. B. `orbit-sub-<id>`). */
  id: string;
  /** Echte Registry-Modul-Id — vorhanden, wenn ein Klick eine reale Station öffnet. */
  moduleId?: ModuleId;
  /**
   * Testid-Override für Untertools, die zwar eine `moduleId` zum Navigieren
   * tragen, aber NICHT die kanonische `module-<id>`-Kachel dieser Station
   * sind (Eindeutigkeit! genau EIN Untertool je `moduleId` heisst
   * `module-<id>`) — aktuell nur «Modell» (öffnet ehrlich `design`, das
   * ist aber Draws Testid).
   */
  testidOverride?: string;
  /** Angezeigter Titel im Fächer (Owner-Wortlaut, z. B. «Draw»). */
  titel: string;
  /** Kurzbeschrieb — sichtbar, sobald der Fächer offen ist. */
  kurzbeschrieb: string;
  /** «Was es kann» — 2–3 Sätze, sichtbar beim Hover auf DIESES Untertool. */
  faehigkeit: string;
  /** V2/Vorschau — nicht klickbar, trägt ein «kommend»-Badge. */
  kommend?: boolean;
}

export interface OrbitHauptwerkzeug {
  id: HauptwerkzeugId;
  /** Markenname, z. B. «KosmoDesign». */
  titel: string;
  kurzbeschrieb: string;
  /** V2/Vorschau (KosmoOffice) — Hauptwerkzeug selbst ist keine Station. */
  kommend?: boolean;
  untertools: OrbitUntertool[];
}

/** Reale Fähigkeiten aus `STATIONS_WERKZEUGE` (bereits Owner-geprüft, siehe
 *  dortige Ehrlichkeitsregel) zu einem kurzen Fliesstext zusammengefasst —
 *  Wiederverwendung statt neuer, unbelegter Prosa. */
function faehigkeitAus(id: Exclude<ModuleId, 'orbit' | 'kosmo'>): string {
  return `${STATIONS_WERKZEUGE[id].join('. ')}.`;
}

function v2Text(id: string): { titel: string; kurzbeschrieb: string } {
  const eintrag = V2_PLATZHALTER.find((p) => p.id === id);
  if (!eintrag) throw new Error(`orbit-werkzeuge: kein V2_PLATZHALTER für "${id}"`);
  return { titel: eintrag.name, kurzbeschrieb: eintrag.kurzbeschrieb };
}

export const ORBIT_HAUPTWERKZEUGE: OrbitHauptwerkzeug[] = [
  {
    id: 'design',
    titel: 'KosmoDesign',
    kurzbeschrieb: 'Entwerfen, Modellieren, Pläne — die Werkstatt am Gebäude.',
    untertools: [
      {
        id: 'draw',
        moduleId: 'design',
        titel: 'Draw',
        kurzbeschrieb: 'Wände, Decken, Dach, Pläne zeichnen',
        faehigkeit: faehigkeitAus('design'),
      },
      {
        id: 'prepare',
        moduleId: 'prepare',
        titel: 'Prepare',
        kurzbeschrieb: 'Grundlagen aufnehmen, Wissenssuche',
        faehigkeit: faehigkeitAus('prepare'),
      },
      {
        id: 'vis',
        moduleId: 'vis',
        titel: 'Vis',
        kurzbeschrieb: 'Renderings, Varianten, Stimmungen',
        faehigkeit: faehigkeitAus('vis'),
      },
      {
        id: 'publish',
        moduleId: 'publish',
        titel: 'Publish',
        kurzbeschrieb: 'Plansätze, Layouts, Export',
        faehigkeit: faehigkeitAus('publish'),
      },
      {
        id: 'modellbaum',
        moduleId: 'draw',
        titel: 'Modellbaum',
        kurzbeschrieb: 'IFC-Baum, Mengen, Ausmass (KosmoDraw)',
        faehigkeit: faehigkeitAus('draw'),
      },
    ],
  },
  {
    id: 'data',
    titel: 'KosmoData',
    kurzbeschrieb: 'Wissen und Daten — Referenzen, Bauteile, Materialien.',
    untertools: [
      {
        id: 'reference',
        moduleId: 'data',
        titel: 'Reference',
        kurzbeschrieb: 'Referenzen- und Bauteilkatalog, Wissen',
        faehigkeit: faehigkeitAus('data'),
      },
      {
        id: 'asset',
        moduleId: 'asset',
        titel: 'Asset',
        kurzbeschrieb: 'Objekte, Materialien, Bauteile',
        faehigkeit: faehigkeitAus('asset'),
      },
    ],
  },
  {
    id: 'kosmo',
    titel: 'Kosmo',
    kurzbeschrieb: 'Die steuernde Intelligenz — sprechen, skizzieren, lernen.',
    untertools: [
      {
        id: 'speak',
        moduleId: 'speak',
        titel: 'Speak',
        kurzbeschrieb: 'Sprechen mit Kosmo',
        faehigkeit: faehigkeitAus('speak'),
      },
      {
        id: 'sketch',
        moduleId: 'sketch',
        titel: 'Sketch',
        kurzbeschrieb: 'Freihand → Wände (Pencil)',
        faehigkeit: faehigkeitAus('sketch'),
      },
      {
        id: 'modell',
        titel: 'Modell',
        kurzbeschrieb: 'FreeMesh — frei formen (in Draw)',
        faehigkeit:
          'FreeMesh (Quader ziehen, Vertices frei verschieben) ist heute Teil von Draw in KosmoDesign — ' +
          'ein eigenständiges «Modell»-Werkzeug ist geplant, aber noch nicht gebaut. Klick öffnet ehrlich Draw.',
        moduleId: 'design',
        testidOverride: 'orbit-sub-modell',
      },
      {
        id: 'train',
        moduleId: 'train',
        titel: 'Train',
        kurzbeschrieb: 'Lernstand, Kuration, Training',
        faehigkeit: faehigkeitAus('train'),
      },
      {
        id: 'dev',
        moduleId: 'dev',
        titel: 'Dev',
        kurzbeschrieb: 'Auftragsbuch, Verbesserungen',
        faehigkeit: faehigkeitAus('dev'),
      },
      {
        id: 'doc',
        moduleId: 'doc',
        titel: 'Doc',
        kurzbeschrieb: 'Diagnose, Hilfe, Berichte',
        faehigkeit: faehigkeitAus('doc'),
      },
      {
        id: 'trust',
        moduleId: 'trust',
        titel: 'Trust',
        kurzbeschrieb: '.kxp-Viewer, Freigabe-Workflow',
        faehigkeit: faehigkeitAus('trust'),
      },
    ],
  },
  {
    id: 'office',
    titel: 'KosmoOffice',
    kurzbeschrieb: 'Kommend (V2) — Büro-Abteilungen ausserhalb des Projekts.',
    kommend: true,
    untertools: (['lead', 'buero-hr', 'lehre', 'bau'] as const).map((id) => {
      const { titel, kurzbeschrieb } = v2Text(id);
      return {
        id,
        titel,
        kurzbeschrieb,
        faehigkeit: `${kurzbeschrieb} — geplant für V2, noch nicht gebaut. Kein Klick öffnet hier einen leeren Screen.`,
        kommend: true,
      };
    }),
  },
];

/** Jede reale Station (siehe `stations-werkzeuge.ts`) muss GENAU EINMAL als
 *  kanonisches Untertool (mit `moduleId`, ohne `kommend`) auftauchen — das
 *  ist die Testid-Eindeutigkeit von `module-<id>` in der ganzen Zentrale.
 *  Der Modellbaum/Modell-Sonderfall (Mehrfachverweis auf `draw`/`design`)
 *  ist Absicht (siehe Kommentar oben) und wird hier bewusst NICHT gezählt,
 *  weil nur EIN Eintrag je moduleId als «kanonisch» gilt (der erste Treffer
 *  in Registrierreihenfolge) — Prüfung lebt im Unit-Test. */
export function alleUntertools(): OrbitUntertool[] {
  return ORBIT_HAUPTWERKZEUGE.flatMap((h) => h.untertools);
}
