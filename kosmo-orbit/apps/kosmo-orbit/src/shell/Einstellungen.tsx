import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Badge,
  bestaetigen,
  Hairline,
  KButton,
  KIcon,
  KKeyValue,
  moduleHue,
  type ModuleId,
  type ThemeName,
} from '@kosmo/ui';
import { siaPhaseLabel, type SiaPhase } from '@kosmo/kernel';
import './orbit-065.css';
import './einstellungen.css';
import { AKZENTE } from './akzente';
import { PhasenLeiste } from './PhasenLeiste';
import { useProject } from '../state/project-store';
import { NEUIGKEITEN, neuigkeitenFuerStation } from './neuigkeiten';
import { adaptionAktiv, adaptionZuruecksetzen, nutzungsProfil, setAdaptionAktiv } from '../state/oberflaeche-adaption-kern';
import {
  formatiereZuletzt,
  lesbarerElementName,
  meistgenutzteElemente,
  stationsNutzung,
} from '../state/nutzungszeit';
import {
  effektiveLeistungsStufe,
  formatiereLeistungsBericht,
  holeLetztesErgebnis,
  holeOverride,
  istZustimmungErteilt,
  pruefeLeistungMitFreigabe,
  setOverride,
  setZustimmung,
  type LeistungsOverride,
} from '../state/leistung';
import { WerkzeugSetup } from './WerkzeugSetup';
import { loadSettings } from './KosmoPanel';
import {
  BRIDGE_TOKEN_KEY,
  homeServerHost,
  pruefeHomeServer,
  setHomeServerHost,
  trenneHomeServer,
  verbindeHomeServer,
  warZuletztVerbunden,
  type HomeServerProbeErgebnis,
  type KanalStatus,
} from '../state/home-server';
import { istTauriDesktop } from './cloud-login';
import { sindSoundsAn, setSoundsAn } from '../state/sounds';
import { eigencursorAktiv, setEigencursorEingestellt } from '../state/cursor-zustand';
import { abspielenEingestellt, setAbspielenEingestellt } from '../state/abspiel-ebene';
import { touchUndoGesteAktiv, setTouchUndoGesteEingestellt } from '../state/touch-undo';
import { useDockZustand } from '../state/dock-zustand';
import type { DockModus } from '../state/dock-kern';
import { useAktiveDockStation } from '../state/dock-aktive-station';
import { useDockTourZustand } from '../state/dock-tour-zustand';
import { presetAnwenden } from '../state/dock-preset-anwendung';
import { PRESET_IDS, presetFuer, type PresetId, type PresetStation } from '../state/dock-presets';
import { useUiZustand } from '../state/ui-zustand';

/**
 * Zentrales Einstellungs-Panel (Serie K / Batch A4, Owner-Befund K14, wörtlich:
 * «Einstellungsmenüs: zentral in der Übersicht + je Station … Funktionen &
 * Neues»). EIN Panel für die ganze App — die Kopfleiste öffnet es ungefiltert
 * (`station` undefined), jede Station öffnet dasselbe Panel mit einem
 * Filter-Prop (siehe die `station-einstellungen-<id>`-Zahnräder in den
 * Workspaces). Kein zweites Panel, keine zweite Logik: Darstellung (Thema/
 * Akzent) und Rundgang rufen exakt dieselben Setter/Funktionen wie die
 * Kopfleiste/der «?»-Knopf; TTS/Lizenz bleiben ehrlich im Kosmo-Panel
 * (nur ein Öffnen-Knopf hierher, kein Duplikat) — die Betriebsart lebt
 * weiterhin dort, wird aber seit E-H zusätzlich vom Ein-Klick-HomeServer
 * unten mitgeschaltet (DIESELBE kosmo.llm-Quelle über betriebKonfig(),
 * kein Parallel-Zustand, s. `state/home-server.ts`); Werkzeuge
 * einrichten bettet die bestehende `WerkzeugSetup`-Komponente direkt ein;
 * die Oberflächen-Anpassung (Serie J3c) ruft den stationsneutralen Adaptions-
 * Kern direkt (`oberflaeche-adaption-kern.ts`) — derselbe globale Schalter,
 * den DesignWorkspace/DataWorkspace über ihre eigene Kopie schon anzeigen.
 *
 * v0.6.5 (Mass 5, UI-KONZEPT-065 §3): der Kopf/Körper-Aufbau folgt jetzt
 * `KDialog` (Plakat-Titel, Schliessen-KIcon, `.k-dialog-box`/`.k-dialog-kopf`/
 * `.k-dialog-koerper`-Klassen aus `packages/kosmo-ui` — dieselbe Optik wie
 * jeder andere Dialog). Die Komponente selbst wird NICHT instanziiert: sie
 * kennt kein Prop, um `data-testid="einstellungen-panel"` auf die BOX (statt
 * auf den Scrim) zu legen, und dieser exakte Testid-Ort ist ein bestehender
 * Vertrag (`einstellungen.spec.ts` u. a.: `panel.toContainText(...)` erwartet
 * Titel UND Sektionen im selben Element). Deshalb hier dieselben Klassen von
 * Hand, mit vollem Zugriff auf die Testid-Platzierung — Verhalten/Optik
 * bleiben identisch zu `KDialog`. Innere Sektions-Testids/-Struktur (System,
 * Darstellung, Leistung, Funktionen & Neues, `neuigkeiten-version-*`)
 * bleiben unverändert, nur die Sektionstitel wandern auf `--k-t-lg`
 * (`.orbit065-einstellungen-sektionstitel`, orbit-065.css) statt `--k-primaer`.
 */

export interface EinstellungenProps {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  akzent: string;
  setAkzent: (a: string) => void;
  onClose: () => void;
  /** Ruft denselben Weg wie der «?»-Knopf der Kopfleiste (A3-Versprechen). */
  aufRundgangStarten: () => void;
  /** Öffnet das Kosmo-Panel (Betriebsart/TTS/Lizenz leben dort, kein Duplikat). */
  aufKosmoOeffnen: () => void;
  /** F2 (v0.6.4, Entdoppelung): öffnet den Deinstallieren-Dialog — der Knopf
   *  wohnt NUR noch hier (eine Funktion = ein Ort), nicht mehr in der
   *  Kopfleiste; der Dialog selbst (AppDeinstallieren) bleibt in App.tsx. */
  aufDeinstallieren: () => void;
  /** Gesetzt, wenn über ein Stations-Zahnrad geöffnet — filtert «Funktionen &
   *  Neues» oben auf diese Station vor; die übrigen Sektionen bleiben gleich. */
  station?: ModuleId;
  /** Anzeigename der Station, für die Kopfzeile/den Filter-Titel. */
  stationName?: string;
}

/**
 * v0.7.4 P8 (Owner-Befund «Companion auffindbar»): der Companion
 * (`shell/Companion.tsx`, die schmale Lese-/Freigabe-Ansicht) war bisher NUR
 * über einen von Hand getippten `#companion`-URL-Hash erreichbar
 * (`main.tsx` `istCompanion`) — kein In-App-Weg. `main.tsx` prüft den Hash
 * nur EINMAL beim Laden (s. `Companion.tsx` `zurueckZurVollApp`-Kommentar),
 * darum reicht ein blosses `location.hash = ...` nicht — derselbe
 * Hash-setzen-und-neu-laden-Weg wie dort.
 */
function oeffneCompanion(): void {
  window.location.hash = '#companion';
  window.location.reload();
}

/** Preset-Titel sind stationsunabhängig identisch (`dock-presets.ts`: «Fokus»/
 *  «Arbeiten»/«Prüfen» heissen in `design` UND `vis` gleich) — eine einzige
 *  Beschriftungstabelle statt `presetFuer(station, id).titel` bei jedem
 *  Render neu aufzulösen. */
const PRESET_TITEL: Record<PresetId, string> = {
  fokus: 'Fokus',
  arbeiten: 'Arbeiten',
  pruefen: 'Prüfen',
};

/**
 * v0.8.4 PA3 (E9 §3): reiner localStorage-Spiegel für den Schalter «Beim
 * Start maximieren» — Default AN (ungesetzter Schlüssel zählt als AN, damit
 * ein Architekt, der die Einstellung nie anfasst, exakt das native
 * `tauri.conf.json`-Verhalten sieht). Bewusst KEIN eigenes State-Modul (die
 * Einstellung hat nur diesen einen Konsumenten) — Muster wie die vier
 * localStorage-Schalter direkt unterhalb (Sounds/Eigencursor/Abspielen/
 * Touch-Undo), nur ohne deren eigene `state/*.ts`-Datei, weil kein zweiter
 * Aufrufer existiert.
 */
const START_MAXIMIERT_KEY = 'kosmo.startMaximiert';

function startMaximiertEingestellt(): boolean {
  const wert = localStorage.getItem(START_MAXIMIERT_KEY);
  return wert === null ? true : wert === '1';
}

function setStartMaximiertEingestellt(an: boolean): void {
  localStorage.setItem(START_MAXIMIERT_KEY, an ? '1' : '0');
}

/**
 * E-H «Ein-Klick-HomeServer» — Chip-Text/-Klasse je Kanal, IMMER aus einem
 * echten Probe-Ergebnis (`hsStatus`) oder dem ehrlichen Zwischenzustand
 * («prüft…»/«noch nicht geprüft»); nie ein hartkodiertes «VERBUNDEN» ohne
 * Probe (Sanktion 7).
 */
function homeServerChip(
  label: string,
  status: KanalStatus | undefined,
  pruefend: boolean,
): { text: string; klasse: string } {
  if (pruefend && !status) return { text: `${label} — PRÜFT …`, klasse: 'es-homeserver-chip--pruefend' };
  if (!status) return { text: `${label} — NOCH NICHT GEPRÜFT`, klasse: 'es-homeserver-chip--pruefend' };
  return status === 'verbunden'
    ? { text: `${label} — VERBUNDEN`, klasse: 'es-homeserver-chip--verbunden' }
    : { text: `${label} — NICHT VERBUNDEN`, klasse: 'es-homeserver-chip--nicht-verbunden' };
}

/**
 * E-K5 (`docs/V0812-SPEZ.md`, Sanktion 4): natürliche Reihenfolge der 8
 * feinen `SiaPhase`-Teilphasen (wörtlich wie `model/doc.ts`s `SiaPhase`-
 * Deklaration und die bestehende `sia-phase-select`-Optionsliste in
 * `DesignWorkspace.tsx` — dort TABU/Cluster B, darum hier eine eigene,
 * literale Kopie statt eines gemeinsamen Moduls, kein Präzedenzbruch: die
 * beiden bestehenden Stellen teilen sich diese Liste auch nicht). Treibt
 * NUR den «Transformieren»-Vorschlag unten (die nächste Teilphase in der
 * natürlichen Reihenfolge) — die Segmente selbst (`PhasenLeiste`) bleiben
 * die 5 SIA-112-Gruppen.
 */
const SIA_PHASE_REIHENFOLGE: readonly SiaPhase[] = [
  'strategie',
  'wettbewerb',
  'vorprojekt',
  'bauprojekt',
  'bewilligung',
  'ausschreibung',
  'ausfuehrung',
  'abnahme',
];

export function Einstellungen({
  theme,
  setTheme,
  akzent,
  setAkzent,
  onClose,
  aufRundgangStarten,
  aufDeinstallieren,
  aufKosmoOeffnen,
  station,
  stationName,
}: EinstellungenProps) {
  const [werkzeugSetupOffen, setWerkzeugSetupOffen] = useState(false);
  const [adaptionIstAn, setAdaptionIstAn] = useState(() => adaptionAktiv());

  // E-H «Ein-Klick-HomeServer» (`docs/V0812-SPEZ.md` §E-H, Sanktion 7): Host/
  // Token sind reine localStorage-Spiegel (Muster wie die Schalter oben);
  // `hsStatus` kommt IMMER aus einem echten Probe-Lauf (`pruefeHomeServer`/
  // `verbindeHomeServer` in `state/home-server.ts`) — nie ein erfundener
  // Chip-Wert. `hsVerbunden` ist der reine Nutzer-Absichts-Merker («war
  // zuletzt verbunden»), unabhängig vom Ausgang der einzelnen Kanäle.
  const [hsHost, setHsHost] = useState(() => homeServerHost());
  const [hsToken, setHsToken] = useState(() => {
    try {
      return localStorage.getItem(BRIDGE_TOKEN_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [hsVerbunden, setHsVerbunden] = useState(() => warZuletztVerbunden());
  const [hsStatus, setHsStatus] = useState<HomeServerProbeErgebnis | null>(null);
  const [hsPruefend, setHsPruefend] = useState(false);

  // Beim Öffnen der Einstellungen: war zuletzt verbunden → Probes automatisch
  // wiederholen (Spec-Vorgabe «Beim App-Start … Probes automatisch
  // wiederholen»; dieses Panel ist der einzige Ort, an dem der HomeServer-
  // Zustand sichtbar ist, darum die Auto-Reprobe hier statt in App.tsx/
  // StartSequenz.tsx, die beide für dieses Paket tabu bleiben).
  useEffect(() => {
    if (!warZuletztVerbunden()) return;
    let lebendig = true;
    setHsPruefend(true);
    void pruefeHomeServer(homeServerHost()).then((erg) => {
      if (!lebendig) return;
      setHsStatus(erg);
      setHsPruefend(false);
    });
    return () => {
      lebendig = false;
    };
  }, []);

  async function aufHomeServerVerbinden(): Promise<void> {
    setHsPruefend(true);
    const erg = await verbindeHomeServer(hsHost);
    setHsStatus(erg);
    setHsVerbunden(true);
    setHsPruefend(false);
  }

  function aufHomeServerTrennen(): void {
    trenneHomeServer();
    setHsVerbunden(false);
    setHsStatus(null);
    setHsPruefend(false);
  }

  function aufHomeServerHostAendern(wert: string): void {
    setHsHost(wert);
    setHomeServerHost(wert);
  }

  function aufHomeServerTokenAendern(wert: string): void {
    setHsToken(wert);
    localStorage.setItem(BRIDGE_TOKEN_KEY, wert);
  }

  // Tailscale-Hinweis (ehrliche Grenze, Owner-Vorgabe §E-H): nur wenn ein
  // NETZWERK-Kanal (Bridge/Sync) scheitert — Ollama allein NICHT gestartet
  // zu haben (Container-Ehrlichkeitsbeweis) ist kein VPN-Problem und würde
  // mit diesem Hinweis in die Irre führen.
  const hsNetzProbeGescheitert =
    !!hsStatus && (hsStatus.bridge === 'nicht-verbunden' || hsStatus.sync === 'nicht-verbunden');

  // v0.8.1 / P15 (Nutzungszeit-Panel, docs/V081-SPEZ.md §7(f)/§9.5 C-34):
  // EINMAL beim Öffnen des Panels aus dem echten, bereits verfallenen
  // Adaptions-Profil gelesen (`state/nutzungszeit.ts`, reine Ableitung aus
  // `kosmo.adaption.v1`) — kein Polling nötig, das Panel ist kurzlebig
  // (dieselbe "Snapshot beim Mount"-Erwartung wie `leistungErgebnis` oben).
  const [nutzungsSnapshot] = useState(() => nutzungsProfil());
  const stationsListe = stationsNutzung(nutzungsSnapshot);
  const meistgenutzt = meistgenutzteElemente(nutzungsSnapshot);

  // E-K5 (`docs/V0812-SPEZ.md`, Sanktion 4): Muster wie `PhasenLeiste.tsx`
  // selbst — `revision` als Reactivity-Trigger, `doc`/`runCommand` über
  // `getState()` gelesen (mutable Store). Treibt NUR den «Transformieren»-
  // Knopf (Zielphase + Bestätigungstext); die Anzeige/der direkte Wechsel
  // laufen komplett über die eingebettete `<PhasenLeiste />` unten.
  const phaseRevision = useProject((s) => s.revision);
  const phaseRunCommand = useProject((s) => s.runCommand);
  const aktuelleSiaPhase = useProject.getState().doc.settings.siaPhase;
  void phaseRevision;
  const siaPhaseIndex = SIA_PHASE_REIHENFOLGE.indexOf(aktuelleSiaPhase);
  const naechsteSiaPhase =
    siaPhaseIndex >= 0 && siaPhaseIndex < SIA_PHASE_REIHENFOLGE.length - 1
      ? SIA_PHASE_REIHENFOLGE[siaPhaseIndex + 1]
      : undefined;

  /** «Transformieren»-Weg (Spec-Beispiel Wettbewerb→Vorprojekt): EIN
   *  bestätigter Schritt zur nächsten Teilphase der natürlichen Reihenfolge
   *  — über den bestehenden `bestaetigen()`-Weg (kein neuer Modal-
   *  Mechanismus), schreibt danach über denselben `design.siaPhaseSetzen`-
   *  Command wie der direkte Segment-Klick. Undo-fähig wie jeder Command. */
  async function aufPhaseTransformieren(): Promise<void> {
    if (!naechsteSiaPhase) return;
    const ok = await bestaetigen({
      titel: `Phase transformieren: ${siaPhaseLabel(aktuelleSiaPhase)} → ${siaPhaseLabel(naechsteSiaPhase)}?`,
      text: 'Der sichtbare Werkzeugbestand richtet sich nach der neuen Phase (Phasen-Matrix). Rückgängig (Strg+Z) stellt die alte Phase wieder her.',
      bestaetigen: 'Transformieren',
    });
    if (ok) phaseRunCommand('design.siaPhaseSetzen', { siaPhase: naechsteSiaPhase });
  }

  // v0.7.8 Welle 3 (P6): Dock-Modus (Konzept A «Orbit-Zonen» / Konzept B
  // «Raster-Kachel») — derselbe Store, den `DockFlaeche.tsx` liest (`modus`),
  // hier nur gespiegelt für den 2-Segment-Wähler unten. `dock-zustand.ts`
  // persistiert `modus` bereits selbst (`kosmo.dock.v1`) — kein zweiter
  // Speicherweg nötig.
  const dockModus = useDockZustand((s) => s.modus);
  const dockModusSetzen = useDockZustand((s) => s.modusSetzen);

  // v0.8.0 / Paket PD2 (Default-Oberflächen): Presets existieren nur für
  // Stationen mit echter Panel-Registry (`design`/`vis`, s. `dock-presets.ts`
  // `PresetStation`) — `aktiveDockStation` wird weiter unten (Dock-Tour) schon
  // gebraucht, hier nur zusätzlich für die Preset-Ziel-Station ausgewertet.
  const aktiveDockStationFuerPreset = useAktiveDockStation((s) => s.station);
  const presetStation: PresetStation | undefined =
    aktiveDockStationFuerPreset === 'design' || aktiveDockStationFuerPreset === 'vis' ? aktiveDockStationFuerPreset : undefined;
  const aktivesPreset = useDockZustand((s) => (presetStation ? s.aktivesPreset[presetStation] : undefined));

  // v0.8.10 E3-Nachtrag (Owner-Entscheid 20.07.2026, docs/V0810-SPEZ.md §2
  // E3, Matrix C-6): der prominente Insel-Zugang zur manuellen KosmoVis-
  // Ansicht ist gefallen (`vis-island-katalog.ts`) — Island bleibt Default/
  // Standard, die manuelle Ansicht bleibt aber legitim erreichbar, jetzt
  // über diesen Schalter statt eines Insel-Werkzeugs. Liest/schreibt
  // denselben Store wie `VisWorkspace.tsx` (`useUiZustand`), keine
  // Zweitlogik — KEINE `normalisiere()`-Koerzierung, `'manuell'` ist eine
  // legitime Einstellung.
  const visOberflaeche = useUiZustand((s) => s.visOberflaeche);
  const setVisOberflaeche = useUiZustand((s) => s.setVisOberflaeche);

  // E-K15/2 (V090-SPEZ.md §E-K15, 22.07.2026, Fable-Entscheid in
  // docs/KONZEPT-MANUELL-ALLE-STATIONEN.md «Fable-Entscheide» Punkt 2):
  // additive Einstellungen-Checkboxen für Design/Publish/Prepare nach dem
  // Vis-Vorbild oben — lesen/schreiben GENAU dieselben Bestandsfelder wie
  // die jeweiligen Insel-Werkzeuge (`state/ui-zustand.ts`), KEIN neuer
  // Zustand, KEINE Zweitlogik. Beide Zugänge (Insel-Werkzeug + Checkbox)
  // bleiben nebeneinander bestehen, EIN Zustand `kosmo.ui.v1`.
  const designOberflaeche = useUiZustand((s) => s.designOberflaeche);
  const setDesignOberflaeche = useUiZustand((s) => s.setDesignOberflaeche);
  const publishOberflaeche = useUiZustand((s) => s.publishOberflaeche);
  const setPublishOberflaeche = useUiZustand((s) => s.setPublishOberflaeche);
  const prepareOberflaeche = useUiZustand((s) => s.prepareOberflaeche);
  const setPrepareOberflaeche = useUiZustand((s) => s.setPrepareOberflaeche);

  // v0.7.8 Welle 3 (P8, Geführte Tour): Einstieg «Werkzeug-Dock kennenlernen»
  // — die Tour selbst (`shell/dock/DockTour.tsx`) manipuliert Dock-/UI-
  // Zustand der DESIGN-Station direkt (kein Doc/Undo) und braucht darum eine
  // tatsächlich gemountete `DockFlaeche` dort, nicht bloss "irgendeinen
  // Screen". `useAktiveDockStation` ist genau der Zeiger, den `DockFlaeche.
  // tsx` bei jedem Mount auf sich selbst setzt (s. dessen Kopfkommentar) —
  // ausserhalb der Design-Station bleibt der Knopf klickbar, zeigt aber
  // einen ehrlichen Hinweis statt eine Tour zu starten, die nichts fände.
  const aktiveDockStation = useAktiveDockStation((s) => s.station);
  const dockTourStarten = useDockTourZustand((s) => s.starten);
  const [dockTourHinweis, setDockTourHinweis] = useState(false);
  const aufDockTourStarten = () => {
    if (aktiveDockStation !== 'design') {
      setDockTourHinweis(true);
      return;
    }
    setDockTourHinweis(false);
    onClose();
    dockTourStarten();
  };

  // A9 (Owner-Befund K19, Leistungs-Autotuning): Zustimmung, letztes Ergebnis
  // und Override leben in leistung.ts (localStorage kosmo.leistung.v1) — hier
  // nur der React-Spiegel für die Anzeige, dieselben Setter wie überall sonst.
  const [leistungZustimmung, setLeistungZustimmungState] = useState(() => istZustimmungErteilt());
  const [leistungErgebnis, setLeistungErgebnis] = useState(() => holeLetztesErgebnis());
  const [leistungOverride, setLeistungOverrideState] = useState<LeistungsOverride>(() => holeOverride());

  // v0.7.2 §5/§7/§8/§9 (W4-H, Kritik-Auflage «Einstellungs-Verdrahtung»):
  // vier neue Schalter — Sounds/Eigencursor/Abspielen sind reine
  // localStorage-Spiegel (dieselben Lese-Funktionen wie die jeweiligen
  // Module selbst, KEINE Zweitlogik); der Charakter-Schalter hat KEINEN
  // persistierten Wert (er zeigt/versteckt das Tauri-Zweitfenster live).
  const [soundsAn, setSoundsAnState] = useState(() => sindSoundsAn());
  const [eigencursorAn, setEigencursorAnState] = useState(() => eigencursorAktiv());
  const [abspielenAn, setAbspielenAnState] = useState(() => abspielenEingestellt());
  // v0.8.3 / P8 (E10 §10.2, `docs/V083-SPEZ.md`): Zwei-Finger-Doppeltipp-
  // Undo — reiner localStorage-Spiegel wie die drei Schalter oben, Default
  // AUS (§8-1 bleibt Owner-offen, s. `state/touch-undo.ts`-Kopfkommentar).
  const [touchUndoGesteAn, setTouchUndoGesteAnState] = useState(() => touchUndoGesteAktiv());
  const tauriDesktop = istTauriDesktop();
  const [charakterSichtbar, setCharakterSichtbar] = useState(false);
  const [charakterFehler, setCharakterFehler] = useState<string | null>(null);

  // v0.8.4 PA3 (E9 §3, `docs/V084-SPEZ.md`, C-4 «Start maximiert + Schalter»):
  // `tauri.conf.json`s statisches `"maximized": true` deckt den Standardfall
  // (Default AN) ab, OHNE dass diese Komponente je gemountet sein muss —
  // reiner localStorage-Spiegel wie die drei Schalter oben. NUR wenn der
  // Architekt ausschaltet, braucht es den kleinsten Tauri-Weg (Command
  // `fenster_startmaximierung_setzen`, `src-tauri/src/lib.rs`): live das
  // aktuelle Fenster umschalten UND die Präferenz für den nächsten Start auf
  // die Platte schreiben (aus dem Rust-`setup()`-Hook heraus ist
  // `localStorage`, die Webview-Datenbank, nicht lesbar, bevor die Seite
  // überhaupt geladen hat). Im Web/PWA bleibt es bei der reinen Präferenz —
  // ehrlich erklärt statt eines wirkungslosen Knopfs (Owner-Mandat).
  const [startMaximiertAn, setStartMaximiertAnState] = useState(() => startMaximiertEingestellt());
  const [startMaximiertFehler, setStartMaximiertFehler] = useState<string | null>(null);

  async function aufStartMaximiertUmschalten(an: boolean): Promise<void> {
    setStartMaximiertEingestellt(an);
    setStartMaximiertAnState(an);
    setStartMaximiertFehler(null);
    if (!tauriDesktop) return; // Web/PWA: nur die Präferenz, kein Fenster zum Steuern
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('fenster_startmaximierung_setzen', { an });
    } catch (err) {
      setStartMaximiertFehler(err instanceof Error ? err.message : String(err));
    }
  }

  async function aufCharakterUmschalten(): Promise<void> {
    if (!tauriDesktop) return; // ausserhalb Tauri deaktiviert (s. Button-Render unten) — defensiv doppelt geprüft
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const neuSichtbar = await invoke<boolean>('charakter_fenster_umschalten');
      setCharakterSichtbar(neuSichtbar);
      setCharakterFehler(null);
    } catch (err) {
      // Ehrlich statt stillschweigend: das Fenster/der Command kann fehlen
      // (z.B. ein Build ohne Zweitfenster) — der Schalter bleibt unverändert.
      setCharakterFehler(err instanceof Error ? err.message : String(err));
    }
  }

  // Escape schliesst das Panel (Muster wie ZentraleKachel-Info/Kurzbefehle).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const stationPunkte = station ? neuigkeitenFuerStation(station) : [];

  return createPortal(
    <div
      data-testid="einstellungen-scrim"
      role="dialog"
      aria-modal
      aria-label="Einstellungen"
      className="k-dialog-scrim es-scrim"
      onClick={onClose}
    >
      <div
        data-testid="einstellungen-panel"
        className="k-dialog-box k-dialog k-skalieren-ein es-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {werkzeugSetupOffen && (
          <WerkzeugSetup betriebsart={loadSettings().betriebsart} onClose={() => setWerkzeugSetupOffen(false)} />
        )}
        <div className="k-dialog-kopf">
          <span className="k-titel k-dialog-kopf-titel">
            Einstellungen{station && stationName ? ` — ${stationName}` : ''}
          </span>
          <button type="button" aria-label="Schliessen" className="k-dialog-kopf-schliessen" onClick={onClose}>
            <KIcon name="schliessen" size={16} />
          </button>
        </div>

        <div className="k-dialog-koerper orbit065-einstellungen-koerper es-koerper-scroll">
          {station && (
            <section data-testid="einstellungen-neuigkeiten-station" className="orbit065-einstellungen-sektion">
              <div className="orbit065-einstellungen-sektionstitel">Neu in {stationName ?? station}</div>
              {stationPunkte.length === 0 ? (
                <div className="es-station-leer">
                  Noch keine eigenen Einträge für diese Station — siehe «Funktionen &amp; Neues» unten.
                </div>
              ) : (
                <ul className="es-station-liste">
                  {stationPunkte.map((t, i) => (
                    <li key={i}>
                      <span className="es-station-meta">
                        {t.version}
                        {t.inArbeit ? ' · in Arbeit' : ''}
                      </span>{' '}
                      {t.punkt.text}
                    </li>
                  ))}
                </ul>
              )}
              <Hairline />
            </section>
          )}

          {/* E-K5 (`docs/V0812-SPEZ.md`, Sanktion 4, 21.07.2026): die
              SIA-112-Phase war bisher ein App-weiter Kopf-Schnellzugriff
              (`PhasenLeiste` im Header/`.app-heim-werkzeuge`) — jetzt eine
              Projekt-Eigenschaft, hier verortet. `<PhasenLeiste />` ist exakt
              dieselbe Komponente wie zuvor (Anzeige + direkter Wechsel, kein
              Funktionsverlust); `sia-phase-select` (fein, KosmoDesign) bleibt
              unverändert daneben bestehen. NEU: der «Transformieren»-Weg —
              EIN bestätigter Schritt zur nächsten Teilphase (z. B. Wettbewerb
              → Vorprojekt), über den bestehenden `bestaetigen()`-Dialog
              (kein neuer Modal-Mechanismus), schreibt danach über denselben
              `design.siaPhaseSetzen`-Command. */}
          <section data-testid="einstellungen-phase" className="orbit065-einstellungen-sektion">
            <div className="orbit065-einstellungen-sektionstitel">Projekt-Phase (SIA 112)</div>
            <div className="es-feld-hinweis">
              Aktuelle SIA-Teilphase: <strong>{siaPhaseLabel(aktuelleSiaPhase)}</strong>. Segment-Klick wechselt
              sofort (bestehender <code>design.siaPhaseSetzen</code>-Weg) — der Werkzeugbestand richtet sich
              danach nach der Phasen-Matrix.
            </div>
            <PhasenLeiste />
            <div className="es-feld-block">
              <KButton
                size="sm"
                tone="quiet"
                data-testid="einstellungen-phase-transformieren"
                disabled={!naechsteSiaPhase}
                title={
                  naechsteSiaPhase
                    ? `Transformiert die Projekt-Phase bestätigt zu «${siaPhaseLabel(naechsteSiaPhase)}»`
                    : 'Letzte Teilphase (Gebäudeabnahme) erreicht — keine weitere Transformation.'
                }
                onClick={() => void aufPhaseTransformieren()}
              >
                {naechsteSiaPhase ? `Transformieren zu «${siaPhaseLabel(naechsteSiaPhase)}»` : 'Transformieren (letzte Phase erreicht)'}
              </KButton>
            </div>
          </section>
          <Hairline />

          {/* E-H «Ein-Klick-HomeServer» (`docs/V0812-SPEZ.md` §E-H, Sanktion
              7, Matrix C-11, NACH E-K5 direkt unter `einstellungen-phase`
              eingefügt, Owner-Order 21.07. ~20:45Z). Owner wörtlich: «ziel
              ist es das ich synchro auf ipad per oneklick aktivieren kann …
              onecklick ganze verbindung mit home pc aktiv macht». EIN Klick
              setzt die BESTEHENDE Remote-Betriebsart (derselbe Weg wie
              KosmoPanel.tsx `wechsleBetriebsart('remote', host)`, s.
              `state/home-server.ts`-Kopfkommentar) auf alle drei
              HomeStation-Dienste UND probt sie echt — die drei Chips zeigen
              NIE «VERBUNDEN» ohne echten Probe-Erfolg. Ehrliche Grenze: das
              VPN selbst kann eine iOS-Web-App nicht einschalten — bei
              gescheitertem Netz-Kanal verlinkt der Hinweis auf die
              Tailscale-App (`tailscale://`). */}
          <section data-testid="einstellungen-homeserver" className="orbit065-einstellungen-sektion">
            <div className="orbit065-einstellungen-sektionstitel">HomeServer</div>
            <div className="es-feld-hinweis">
              Ein Klick verbindet Bridge, Sync und Kosmo-LLM mit dem Home-PC ({hsHost || homeServerHost()}). Jeder
              Chip zeigt nur dann «VERBUNDEN», wenn der jeweilige Dienst wirklich geantwortet hat.
            </div>

            <KButton
              size="lg"
              tone="accent"
              data-testid="homeserver-verbinden"
              className="es-homeserver-knopf"
              disabled={hsPruefend}
              onClick={() => void aufHomeServerVerbinden()}
            >
              {hsPruefend ? 'Verbinde …' : 'Mit Home-PC verbinden'}
            </KButton>

            <div className="es-homeserver-chips">
              {(
                [
                  ['bridge', 'BRIDGE', hsStatus?.bridge] as const,
                  ['sync', 'SYNC', hsStatus?.sync] as const,
                  ['llm', 'KOSMO-LLM', hsStatus?.llm] as const,
                ]
              ).map(([kanal, label, status]) => {
                const chip = homeServerChip(label, status, hsPruefend);
                return (
                  <span
                    key={kanal}
                    data-testid={`homeserver-status-${kanal}`}
                    className={`es-homeserver-chip ${chip.klasse}`}
                  >
                    <span className="es-homeserver-chip-punkt" aria-hidden="true" />
                    {chip.text}
                  </span>
                );
              })}
            </div>

            {hsNetzProbeGescheitert && (
              <div className="es-homeserver-tailscale" data-testid="homeserver-tailscale-hinweis">
                Tailscale-VPN auf diesem Gerät einschalten —{' '}
                <a href="tailscale://" data-testid="homeserver-tailscale-link">
                  Tailscale öffnen
                </a>
              </div>
            )}

            <div className="es-homeserver-felder">
              <label className="es-feld-label">
                Home-PC-Adresse (Tailscale-IP oder Name)
                <input
                  type="text"
                  className="es-homeserver-input"
                  data-testid="homeserver-host"
                  value={hsHost}
                  onChange={(e) => aufHomeServerHostAendern(e.target.value)}
                />
              </label>
              <label className="es-feld-label">
                Bridge-Token (kosmo.bridge.token)
                <input
                  type="password"
                  className="es-homeserver-input"
                  data-testid="homeserver-token"
                  value={hsToken}
                  onChange={(e) => aufHomeServerTokenAendern(e.target.value)}
                  placeholder="optional — nur mit gehärteter Bridge nötig"
                />
              </label>
            </div>

            {hsVerbunden && (
              <div className="es-feld-block">
                <KButton size="sm" tone="ghost" data-testid="homeserver-trennen" onClick={aufHomeServerTrennen}>
                  Trennen
                </KButton>
              </div>
            )}
          </section>
          <Hairline />

          <section data-testid="einstellungen-darstellung" className="orbit065-einstellungen-sektion">
            <div className="orbit065-einstellungen-sektionstitel">Darstellung</div>
          <div className="es-darstellung-reihe">
            {/* v0.7.3 D7 (Owner-Entscheid, Gestaltungs-Spez): Tinte entfernt —
                der 3-Segment-Wähler (0.7.2 §1) schrumpft zurück auf 2
                Segmente PAPIER/KOSMOS. `data-testid="einstellung-thema"`
                bleibt auf dem Segment-CONTAINER (Vertrag), aber
                `e2e/einstellungen.spec.ts` klickt seit D7 gezielt ein
                Segment statt den Container — mit nur zwei Segmenten läge ein
                Container-Klick (Playwright klickt die Bounding-Box-Mitte)
                GENAU auf der Grenze zwischen beiden Buttons, ein
                browserabhängig unklares Ziel statt des früheren, zuverlässig
                mittleren «Tinte»-Segments. */}
            <span data-testid="einstellung-thema" role="group" aria-label="Thema" className="es-segment">
              {(
                [
                  { key: 'paper' as const, label: 'Papier' },
                  { key: 'orbit' as const, label: 'Kosmos' },
                ]
              ).map((seg) => (
                <button
                  key={seg.key}
                  type="button"
                  data-testid={`einstellung-thema-${seg.key}`}
                  aria-pressed={theme === seg.key}
                  onClick={() => setTheme(seg.key)}
                  className={`es-segment-item${theme === seg.key ? ' es-segment-item--aktiv' : ''}`}
                >
                  {seg.label}
                </button>
              ))}
            </span>
            <span className="es-akzent-reihe">
              {AKZENTE.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setAkzent(a.key)}
                  title={`Akzent ${a.name}`}
                  aria-label={`Akzent ${a.name}`}
                  data-testid={`einstellung-akzent-${a.key}`}
                  className={`es-akzent-swatch${akzent === a.key ? ' es-akzent-swatch--aktiv' : ''}`}
                  style={{ background: a.farbe ?? 'var(--k-technik)' }}
                />
              ))}
            </span>
          </div>

          {/* v0.7.8 Welle 3 (P6): Werkzeug-Anordnung — Umschalter zwischen den
              zwei Modi DESSELBEN Dock-Solvers (`state/dock-kern.ts` `solve()`):
              Konzept A «Orbit-Zonen» (Standard, schwebende Panels möglich) und
              Konzept B «Raster-Kachel» (Tiling — nichts schwebt, alle Panels
              teilen sich den Platz als Streifen/Spalten). Gleiches 2-Segment-
              Muster wie `einstellung-thema` oben (Container-Testid + je
              Segment ein eigener, additiver Testid). */}
          <div className="es-feld-block">
            <span className="es-feld-label">Werkzeug-Anordnung</span>
            <span data-testid="einstellungen-dock-modus" role="group" aria-label="Werkzeug-Anordnung" className="es-segment">
              {(
                [
                  { key: 'A' as const, label: 'Orbit-Zonen (A, Standard)' },
                  { key: 'B' as const, label: 'Raster-Kachel (B)' },
                ]
              ).map((seg) => (
                <button
                  key={seg.key}
                  type="button"
                  data-testid={`einstellungen-dock-modus-${seg.key}`}
                  aria-pressed={dockModus === seg.key}
                  onClick={() => dockModusSetzen(seg.key as DockModus)}
                  className={`es-segment-item${dockModus === seg.key ? ' es-segment-item--aktiv' : ''}`}
                >
                  {seg.label}
                </button>
              ))}
            </span>
            <span className="es-feld-hinweis">
              {dockModus === 'A'
                ? 'A: Panels können frei schweben (Pop-out möglich), Kollisionen löst der Solver automatisch.'
                : 'B: nichts schwebt, alle teilen sich den Platz — Panels erscheinen als Streifen ohne Pop-out.'}
            </span>
          </div>

          {/* v0.8.0 / Paket PD2 (Default-Oberflächen, Owner-Anforderung 3):
              Preset-Wähler NEBEN dem A/B-Dock-Wähler oben (Auftrag: «Einstellungen
              → Darstellung») — dieselben drei Presets (`state/dock-presets.ts`),
              angewendet über `presetAnwenden()` (EINE Quelle mit der Kontextzeile
              und `ui.dockPresetSetzen`). Presets gibt es nur für die Stationen mit
              echter Panel-Registry (`design`/`vis`, s. `dock-presets.ts`
              `PresetStation`) — ohne eine der beiden aktiv gemountet (z. B. beim
              Öffnen aus der Zentrale), bleiben die Knöpfe sichtbar, aber
              deaktiviert, mit demselben ehrlichen Hinweis-Muster wie der
              Dock-Tour-Einstieg oben. */}
          <div className="es-feld-block">
            <span className="es-feld-label">
              Oberflächen-Preset{presetStation ? ` — ${presetStation === 'design' ? 'KosmoDesign' : 'KosmoVis'}` : ''}
            </span>
            <span data-testid="dock-preset-waehler" role="group" aria-label="Oberflächen-Preset" className="es-segment">
              {PRESET_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  data-testid={`dock-preset-${id}`}
                  aria-pressed={aktivesPreset === id}
                  disabled={!presetStation}
                  title={presetStation ? presetFuer(presetStation, id).beschreibung : undefined}
                  onClick={() => presetStation && presetAnwenden(presetStation, id)}
                  className={`es-segment-item${aktivesPreset === id ? ' es-segment-item--aktiv' : ''}`}
                >
                  {PRESET_TITEL[id]}
                </button>
              ))}
            </span>
            {!presetStation && (
              <span className="es-feld-hinweis">
                Nur in KosmoDesign oder KosmoVis verfügbar — dorthin wechseln und erneut versuchen.
              </span>
            )}
          </div>

          {/* v0.8.10 E3-Nachtrag (Owner-Entscheid 20.07.2026, docs/V0810-
              SPEZ.md §2 E3, Matrix C-6): Rückweg zur älteren Vollflächen-
              KosmoVis-Oberfläche — Island bleibt Default/Standard, dieser
              Schalter ersetzt den entfallenen Insel-Zugang
              (`vis-island-katalog.ts`). Rückweg AUS 'manuell' bleibt der
              bestehende `island-zurueck`-Knopf im Manuell-Chrome
              (`VisWorkspace.tsx`). */}
          <div className="es-feld-block">
            <label className="es-schalter-label">
              <input
                type="checkbox"
                data-testid="einstellung-vis-manuell"
                checked={visOberflaeche === 'manuell'}
                onChange={(e) => setVisOberflaeche(e.target.checked ? 'manuell' : 'island')}
              />
              Manuelle Ansicht (KosmoVis)
            </label>
            <span className="es-feld-hinweis">
              Ältere Vollflächen-Ansicht mit Werkzeugleiste, Dock-Panels, Legende und gespeicherten Ansichten — Island
              bleibt der Standard.
            </span>
          </div>

          {/* E-K15/2 (V090-SPEZ.md §E-K15, 22.07.2026): additiver
              Einstellungen-Zugang zur manuellen KosmoDesign-Oberfläche —
              zusätzlich zum bestehenden Insel-Werkzeug `manuell`
              (`island-katalog.ts`), nicht als Ersatz. Rückweg AUS 'manuell'
              bleibt der bestehende `island-zurueck`-Knopf im Manuell-Chrome
              (`DesignWorkspace.tsx`). */}
          <div className="es-feld-block">
            <label className="es-schalter-label">
              <input
                type="checkbox"
                data-testid="einstellung-design-manuell"
                checked={designOberflaeche === 'manuell'}
                onChange={(e) => setDesignOberflaeche(e.target.checked ? 'manuell' : 'island')}
              />
              Manuelle Ansicht (KosmoDesign)
            </label>
            <span className="es-feld-hinweis">
              Klassische Werkzeugleiste, Entwurfs-Dock und Dock-Panels — Island bleibt der Standard.
            </span>
          </div>

          {/* E-K15/2 — additiver Einstellungen-Zugang zur manuellen
              KosmoPublish-Oberfläche, zusätzlich zum bestehenden
              Insel-Werkzeug `manuell` (`publish-island-katalog.ts`).
              Rückweg bleibt `island-zurueck` (`PublishWorkspace.tsx`). */}
          <div className="es-feld-block">
            <label className="es-schalter-label">
              <input
                type="checkbox"
                data-testid="einstellung-publish-manuell"
                checked={publishOberflaeche === 'manuell'}
                onChange={(e) => setPublishOberflaeche(e.target.checked ? 'manuell' : 'island')}
              />
              Manuelle Ansicht (KosmoPublish)
            </label>
            <span className="es-feld-hinweis">
              Klassische Blattliste, Werkzeugleiste und Dossier-/Plankopf-Werkzeuge — Island bleibt der Standard.
            </span>
          </div>

          {/* E-K15/2 — additiver Einstellungen-Zugang zur manuellen
              KosmoPrepare-Oberfläche, zusätzlich zum bestehenden
              Insel-Werkzeug `manuell` (`prepare-island-katalog.ts`).
              Rückweg bleibt `island-zurueck` (`PrepareWorkspace.tsx`). */}
          <div className="es-feld-block">
            <label className="es-schalter-label">
              <input
                type="checkbox"
                data-testid="einstellung-prepare-manuell"
                checked={prepareOberflaeche === 'manuell'}
                onChange={(e) => setPrepareOberflaeche(e.target.checked ? 'manuell' : 'island')}
              />
              Manuelle Ansicht (KosmoPrepare)
            </label>
            <span className="es-feld-hinweis">
              Klassische Werkzeugleiste, Ingest-Zone und Dokumentliste — Island bleibt der Standard.
            </span>
          </div>
        </section>
        <Hairline />

        {/* v0.7.2 W4-H (Kritik-Auflage «Einstellungs-Verdrahtung», Spec §5/§7/
            §8/§9): vier neue Schalter — dieselben Lese-Funktionen wie die
            jeweiligen Module selbst (keine Zweitlogik), Schreiben über die
            zugehörigen Setter (s. Import-Kopf). */}
        <section data-testid="einstellungen-bewegung-klang" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">Bewegung &amp; Klang</div>

          <label className="es-schalter-label">
            <input
              type="checkbox"
              data-testid="einstellung-sounds"
              checked={soundsAn}
              onChange={(e) => {
                setSoundsAn(e.target.checked);
                setSoundsAnState(e.target.checked);
              }}
            />
            Dezente Klick-/Bestätigungstöne (Default aus)
          </label>

          <label className="es-schalter-label">
            <input
              type="checkbox"
              data-testid="einstellung-eigencursor"
              checked={eigencursorAn}
              onChange={(e) => {
                setEigencursorEingestellt(e.target.checked);
                setEigencursorAnState(e.target.checked);
              }}
            />
            Eigener Zeiger (Default an bei Maus/Trackpad, aus bei reinem Touch)
          </label>

          <label className="es-schalter-label">
            <input
              type="checkbox"
              data-testid="einstellung-abspielen"
              checked={abspielenAn}
              onChange={(e) => {
                setAbspielenEingestellt(e.target.checked);
                setAbspielenAnState(e.target.checked);
              }}
            />
            Kosmo zeichnet sichtbar, bevor eine Änderung übernommen wird (Default an)
          </label>

          <label className="es-schalter-label">
            <input
              type="checkbox"
              data-testid="einstellung-touch-undo-geste"
              checked={touchUndoGesteAn}
              onChange={(e) => {
                setTouchUndoGesteEingestellt(e.target.checked);
                setTouchUndoGesteAnState(e.target.checked);
              }}
            />
            Zwei-Finger-Doppeltipp auf dem Viewport löst Rückgängig aus (iPad, Default aus)
          </label>

          <label
            className={`es-schalter-label${tauriDesktop ? '' : ' es-schalter-label--deaktiviert'}`}
            title={tauriDesktop ? undefined : 'Nur in der Desktop-App verfügbar — im Browser/PWA gibt es kein Zweitfenster.'}
          >
            <input
              type="checkbox"
              data-testid="einstellung-charakter"
              checked={charakterSichtbar}
              disabled={!tauriDesktop}
              onChange={() => void aufCharakterUmschalten()}
            />
            Kosmo-Charakter-Fenster anzeigen (nur Desktop-App)
          </label>
          {charakterFehler && (
            <div className="es-fehler-text">{charakterFehler}</div>
          )}
        </section>
        <Hairline />

        <section data-testid="einstellungen-rundgang" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">Rundgang &amp; Hilfe</div>
          <div className="es-knopf-reihe">
            <KButton size="sm" tone="quiet" data-testid="einstellung-rundgang" onClick={aufRundgangStarten}>
              Rundgang erneut zeigen
            </KButton>
            <KButton size="sm" tone="quiet" data-testid="einstellungen-dock-tour" onClick={aufDockTourStarten}>
              Werkzeug-Dock kennenlernen
            </KButton>
          </div>
          {dockTourHinweis && (
            <div data-testid="einstellungen-dock-tour-hinweis" className="es-hinweis-klein">
              Nur in der KosmoDesign-Station verfügbar — dorthin wechseln und erneut versuchen.
            </div>
          )}
        </section>
        <Hairline />

        <section data-testid="einstellungen-kosmo" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">Kosmo &amp; Betrieb</div>
          <div className="es-knopf-reihe">
            <KButton size="sm" tone="quiet" data-testid="einstellung-kosmo-oeffnen" onClick={aufKosmoOeffnen}>
              Kosmo-Einstellungen öffnen
            </KButton>
            <KButton size="sm" tone="quiet" data-testid="einstellung-werkzeuge" onClick={() => setWerkzeugSetupOffen(true)}>
              Werkzeuge einrichten
            </KButton>
            <KButton
              size="sm"
              tone="quiet"
              data-testid="einstellung-companion-oeffnen"
              title="Wechselt in die schmale Companion-Ansicht (Lesen/Freigeben) — ein Klick zurück in KosmoOrbit steht dort bereit."
              onClick={oeffneCompanion}
            >
              Companion öffnen
            </KButton>
          </div>
          <div className="es-system-hinweis">
            Sprachausgabe und Lizenz stehen im Kosmo-Panel selbst (⚙ dort). Die Betriebsart lebt ebenfalls dort — der
            HomeServer-Knopf oben schaltet sie mit (dieselbe Einstellung, kein zweiter Zustand).
          </div>
        </section>
        <Hairline />

        <section data-testid="einstellungen-adaption" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">Oberflächen-Anpassung</div>
          <label className="es-schalter-label">
            <input
              type="checkbox"
              data-testid="einstellung-adaption-schalter"
              checked={adaptionIstAn}
              onChange={(e) => {
                setAdaptionAktiv(e.target.checked);
                setAdaptionIstAn(e.target.checked);
              }}
            />
            Werkzeugleisten passen sich der Nutzung an (Design, Data, weitere Stationen)
          </label>
          <div>
            <KButton
              size="sm"
              tone="ghost"
              data-testid="einstellung-adaption-reset"
              title="Gelerntes Nutzungsprofil löschen — betrifft alle Stationen, der Schalter bleibt unverändert."
              onClick={() => adaptionZuruecksetzen()}
            >
              Oberfläche zurücksetzen
            </KButton>
          </div>
        </section>
        <Hairline />

        {/* v0.8.1 / P15 (Nutzungszeit-Panel, docs/V081-SPEZ.md §7(f)/§9.5
            C-34) — echte Nutzungsdaten aus demselben Adaptions-Speicher wie
            die Sektion oben (`kosmo.adaption.v1`), reine Ableitung über
            `state/nutzungszeit.ts` (kein zweiter Speicher, kein Polling).
            Ehrlichkeitsgrenze wörtlich benannt: eine durchgehend GEMESSENE
            Aufenthaltsdauer je Station gibt es heute nicht — nur ein
            gewichteter Klickzähler + der echte Zeitpunkt der letzten
            Nutzung, s. Kopfkommentar der Datenquelle. */}
        <section data-testid="einstellungen-nutzungszeit" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">Nutzungszeit</div>
          <div className="es-feld-hinweis">
            Echte Nutzungsdaten aus dem lokalen Adaptions-Speicher (<code>kosmo.adaption.v1</code>) — Klickgewicht
            der letzten 7 Tage und der echte Zeitpunkt der letzten Nutzung. Eine durchgehend gemessene
            Aufenthaltsdauer je Station wird heute nicht erfasst.
          </div>
          <ul data-testid="nutzungszeit-stationen" className="nz-liste">
            {stationsListe.map((e) => (
              <li key={e.station} data-testid={`nutzungszeit-station-${e.station}`} className="nz-zeile">
                <span className="nz-titel">{e.titel}</span>
                <span className="nz-wert">
                  {e.status === 'nicht-erfasst' && 'nicht separat erfasst'}
                  {e.status === 'nie-genutzt' && 'noch nie genutzt'}
                  {e.status === 'genutzt' &&
                    `Gewicht ${e.gewicht.toFixed(1)} · zuletzt ${formatiereZuletzt(e.zuletztMs!)}`}
                </span>
              </li>
            ))}
          </ul>
          {meistgenutzt.length > 0 && (
            <>
              <span className="es-feld-label nz-werkzeuge-label">Meistgenutzte Einzel-Werkzeuge</span>
              <ul data-testid="nutzungszeit-werkzeuge" className="nz-liste">
                {meistgenutzt.map((e) => (
                  <li
                    key={e.elementId}
                    data-testid={`nutzungszeit-werkzeug-${e.elementId.replace(':', '-')}`}
                    className="nz-zeile"
                  >
                    <span className="nz-titel">{lesbarerElementName(e.elementId)}</span>
                    <span className="nz-wert">
                      Gewicht {e.gewicht.toFixed(1)} · zuletzt {formatiereZuletzt(e.zuletztMs)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <Hairline />

        <section data-testid="einstellungen-leistung" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">Leistung</div>
          <label className="es-schalter-label">
            <input
              type="checkbox"
              data-testid="leistung-zustimmung"
              checked={leistungZustimmung}
              onChange={(e) => {
                setZustimmung(e.target.checked);
                setLeistungZustimmungState(e.target.checked);
              }}
            />
            Kosmo darf die Systemleistung prüfen (Kerne, Speicher, Grafiktreiber, ein kurzer Mikro-Benchmark) und die
            Render-Qualität selbst drosseln
          </label>
          <div>
            <KButton
              size="sm"
              tone="quiet"
              data-testid="leistung-pruefen"
              disabled={!leistungZustimmung}
              title={leistungZustimmung ? undefined : 'Erst die Zustimmung oben aktivieren'}
              onClick={() => {
                const ergebnis = pruefeLeistungMitFreigabe();
                if (ergebnis) setLeistungErgebnis(ergebnis);
              }}
            >
              Systemleistung jetzt prüfen
            </KButton>
          </div>
          {leistungErgebnis && (() => {
            const bericht = formatiereLeistungsBericht(leistungErgebnis);
            return (
              <KKeyValue
                data-testid="leistung-bericht"
                zeilen={[
                  { key: 'Kerne', wert: bericht.kerne },
                  { key: 'Speicher', wert: bericht.speicher },
                  { key: 'Grafiktreiber', wert: bericht.renderer },
                  { key: 'Stufe', wert: <strong data-testid="leistung-stufe">{bericht.stufe}</strong> },
                ]}
              />
            );
          })()}
          <div className="es-override-reihe">
            <span className="es-override-label">Render-Qualität:</span>
            {(['auto', 'hoch', 'mittel', 'niedrig'] as const).map((stufe) => (
              <button
                key={stufe}
                data-testid={`leistung-override-${stufe}`}
                onClick={() => {
                  setOverride(stufe);
                  setLeistungOverrideState(stufe);
                }}
                className={`k-primaer es-override-btn${leistungOverride === stufe ? ' es-override-btn--aktiv' : ''}`}
              >
                {stufe === 'auto' ? `Automatisch (${effektiveLeistungsStufe()})` : stufe}
              </button>
            ))}
          </div>
          <div className="es-system-hinweis">
            🔒 Cycles-Preview-Synchro, ein Host-PC-Client und die Wahl des lokalen LLM nach Leistung folgen erst mit der
            HomeStation — hier gibt es dafür bewusst keinen Regler.
          </div>
        </section>
        <Hairline />

        <section data-testid="einstellungen-neuigkeiten" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">Funktionen &amp; Neues</div>
          {NEUIGKEITEN.map((eintrag) => (
            <div key={eintrag.version} data-testid={`neuigkeiten-version-${eintrag.version}`} className="es-neuigkeit">
              <div className="es-neuigkeit-kopf">
                <span className="es-neuigkeit-titel">Version {eintrag.version}</span>
                {eintrag.inArbeit && <Badge hue={moduleHue.kosmo}>in Arbeit</Badge>}
                <span className="es-neuigkeit-datum">{eintrag.datum}</span>
              </div>
              <ul className="es-neuigkeit-liste">
                {eintrag.punkte.map((p, i) => (
                  <li key={i}>{p.text}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
        <Hairline />

        {/* F2 (v0.6.4, Entdoppelung): «App deinstallieren…» zog aus der
            Kopfleiste hierher um — selten gebraucht, gehört zu den
            System-Einstellungen, nicht auf den teuersten Platz der App. */}
        <section data-testid="einstellungen-system" className="orbit065-einstellungen-sektion">
          <div className="orbit065-einstellungen-sektionstitel">System</div>
          <label
            className={`es-schalter-label${tauriDesktop ? '' : ' es-schalter-label--deaktiviert'}`}
            title={
              tauriDesktop
                ? undefined
                : 'Wirkt nur in der Desktop-App — im Browser bestimmt der Browser die Fenstergrösse, hier wird nur die Präferenz gemerkt.'
            }
          >
            <input
              type="checkbox"
              data-testid="einstellung-start-maximiert"
              checked={startMaximiertAn}
              disabled={!tauriDesktop}
              onChange={(e) => void aufStartMaximiertUmschalten(e.target.checked)}
            />
            Beim Start maximieren (Default an)
          </label>
          {startMaximiertFehler && <div className="es-fehler-text">{startMaximiertFehler}</div>}
          <div className="es-system-reihe">
            <KButton size="sm" tone="quiet" data-testid="einstellung-deinstallieren" onClick={aufDeinstallieren}>
              App deinstallieren…
            </KButton>
            <span className="es-feld-hinweis">
              öffnet die ehrliche Anleitung für dein Betriebssystem — nichts wird sofort gelöscht.
            </span>
          </div>
        </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
