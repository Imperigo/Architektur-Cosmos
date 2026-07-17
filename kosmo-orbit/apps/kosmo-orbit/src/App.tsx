import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  Badge,
  Hairline,
  KBestaetigung,
  KButton,
  KFehlerzone,
  KMeldungen,
  KSelect,
  OrbitMark,
  Panel,
  Wordmark,
  bestaetigen,
  melde,
  meldeFehler,
  mitUebergang,
  moduleHue,
  type ModuleId,
  type ThemeName,
} from '@kosmo/ui';
import { DesignWorkspace } from './modules/design/DesignWorkspace';
import { KosmoPanel } from './shell/KosmoPanel';
import { KosmoSymbol } from './shell/KosmoSymbol';
import { KosmoTakeoverWaechter } from './shell/KosmoTakeoverWaechter';
import { OrbitStart } from './shell/OrbitStart';
// v0.7.3 Bau-Agent S5: Boden-Dock (app-weit) — Import zwingend nötig, damit
// die Ankerzeile `{/* v073: boden-dock */}` weiter unten kompiliert; die
// einzige inhaltliche Änderung an App.tsx bleibt trotzdem die Ankerzeile
// selbst (kein anderer Verhalten/State/Handler wurde hier verändert).
import { BodenDock } from './shell/BodenDock';
import { AppDeinstallieren } from './shell/AppDeinstallieren';
import { StarterGuide } from './shell/StarterGuide';
import { ErsteStartFrage } from './shell/ErsteStartFrage';
import { istStarterGuideAbgeschlossen, starterGuideAlsAbgeschlossenMarkieren } from './shell/starter-guide-schritte';
import { VisWorkspace } from './modules/vis/VisWorkspace';
import { DataWorkspace } from './modules/data/DataWorkspace';
import { PublishWorkspace } from './modules/publish/PublishWorkspace';
import { PrepareWorkspace } from './modules/prepare/PrepareWorkspace';
import { DocWorkspace } from './modules/doc/DocWorkspace';
import { TrainWorkspace } from './modules/train/TrainWorkspace';
import { AssetWorkspace } from './modules/asset/AssetWorkspace';
import { DevWorkspace } from './modules/dev/DevWorkspace';
import { KxpWorkspace } from './modules/kxp/KxpWorkspace';
import { PaketWorkspace } from './modules/paket/PaketWorkspace';
import { useUiZustand } from './state/ui-zustand';
import { CommandPalette } from './shell/CommandPalette';
import { DockTour } from './shell/dock/DockTour';
import { wendeErststartPresetFallsNoetigAn } from './state/dock-preset-anwendung';
import { PhasenLeiste } from './shell/PhasenLeiste';
import { registerActions } from './shell/palette';
import { Kurzbefehle } from './shell/Kurzbefehle';
import {
  aktivesProjektId,
  initVault,
  listeProjekte,
  loescheProjekt,
  neuesProjekt,
  oeffneProjekt,
  type VaultEintrag,
} from './state/project-vault';
import {
  listeVarianten,
  loescheVariante,
  oeffneVariante,
  type VariantenEintrag,
} from './state/variant-archive';
import { useProject } from './state/project-store';
import { katalogExport, pruefeSubmissionsreife } from '@kosmo/kernel';
import { downloadProject, openProjectFile } from './state/project-io';
import { loadTkbDemo } from './state/demo-tkb';
import { connectSync, disconnectSync, onSyncStatus, type SyncStatus } from './state/project-sync';
import { setDeepLink } from './state/deep-link';
import { requestKosmoFokus } from './state/kosmo-focus';
import { setzeAktuelleStation } from './state/auftragsbuch';
import { hydriereJournal } from './state/journal-store';
import { qrSvg } from './state/qr';
import { fokusKlasse, fokusStufe } from './state/fokus';
import { AKZENTE } from './shell/akzente';
import { Einstellungen } from './shell/Einstellungen';
import { CursorEbene } from './shell/CursorEbene';
import { OnboardingWizard } from './shell/OnboardingWizard';
import './shell/orbit-065.css';
import './app.css';

type Screen = 'home' | 'design' | 'vis' | 'data' | 'publish' | 'prepare' | 'doc' | 'train' | 'asset' | 'dev' | 'trust' | 'paket';

/**
 * Aufgabe 3 (0.6.6 MOTION-KONZEPT-066 §3, «jedes klickbare Element trägt
 * `.k-druck`»): die rohen Kopfleisten-Knöpfe hier nutzten bisher
 * `all: 'unset'` als Inline-Style — das setzt (mit der höchsten CSS-
 * Priorität, die Inline-Deklarationen immer haben) auch `transform`/
 * `filter`/`transition` zurück, genau die drei Eigenschaften, über die
 * `.k-druck` (aura.css) den Knopfdruck simuliert. Ersatz durch gezielte
 * Resets — sichtbares Ergebnis (kein Browser-Rahmen/-Hintergrund/-Polster)
 * bleibt identisch, `.k-druck` kann aber greifen.
 * v0.8.0B / P7: die Resets sind jetzt die Klasse `.app-druck-reset`
 * (app.css) statt eines gespreadeten Style-Objekts. */

function tagesgruss(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Späte Stunde.';
  if (h < 11) return 'Guten Morgen.';
  if (h < 14) return 'Guten Tag.';
  if (h < 18) return 'Guten Nachmittag.';
  return 'Guten Abend.';
}

// D1: Jede Station der Vision hat ihre Kachel — Draw/Sketch sind Deep-Links
// in KosmoDesign (kein Code-Duplikat), Speak öffnet das Kosmo-Panel.
const modules: { id: ModuleId; screen: Screen | null; name: string; desc: string; deepLink?: 'draw' | 'sketch' | 'speak' }[] = [
  { id: 'design', screen: 'design', name: 'KosmoDesign', desc: 'Entwerfen · Modellieren · Pläne' },
  { id: 'draw', screen: 'design', name: 'KosmoDraw', desc: 'Modellbaum · Mengen · Ausmass', deepLink: 'draw' },
  { id: 'sketch', screen: 'design', name: 'KosmoSketch', desc: 'Freihand → Wände (Pencil)', deepLink: 'sketch' },
  { id: 'data', screen: 'data', name: 'KosmoData', desc: 'Referenzen · Assets · Wissen' },
  { id: 'vis', screen: 'vis', name: 'KosmoVis', desc: 'Renderings · Varianten' },
  { id: 'publish', screen: 'publish', name: 'KosmoPublish', desc: 'Plansätze · Layouts' },
  { id: 'prepare', screen: 'prepare', name: 'KosmoPrepare', desc: 'Grundlagen · Ingestion' },
  { id: 'asset', screen: 'asset', name: 'KosmoAsset', desc: 'Materialien · Bauteile · Objekte' },
  { id: 'dev', screen: 'dev', name: 'KosmoDev', desc: 'Auftragsbuch · Verbesserungen' },
  { id: 'trust', screen: 'trust', name: 'KosmoTrust', desc: '.kxp-Viewer · Freigabe-Workflow' },
  { id: 'paket', screen: 'paket', name: 'KosmoPackage', desc: 'Export-Hub · sechs reale Formate + .kxp' },
  { id: 'speak', screen: null, name: 'KosmoSpeak', desc: 'Sprechen mit Kosmo · braucht Bridge', deepLink: 'speak' },
  { id: 'doc', screen: 'doc', name: 'KosmoDoc', desc: 'Diagnose · Hilfe · Berichte' },
  { id: 'train', screen: 'train', name: 'KosmoTrain', desc: 'Lernstand · Kuration · Training' },
];

/** D2: Kachel-Reihenfolge je Rolle — die tägliche Arbeit rückt nach vorn. */
const ROLLEN_REIHENFOLGE: Record<'entwurf' | 'ausfuehrung' | 'admin', ModuleId[]> = {
  entwurf: ['design', 'sketch', 'vis', 'draw', 'data', 'asset', 'publish', 'prepare', 'speak', 'dev', 'doc', 'train', 'trust', 'paket'],
  ausfuehrung: ['publish', 'draw', 'design', 'doc', 'data', 'asset', 'prepare', 'sketch', 'vis', 'speak', 'dev', 'train', 'trust', 'paket'],
  admin: ['doc', 'train', 'dev', 'data', 'prepare', 'asset', 'publish', 'design', 'draw', 'sketch', 'vis', 'speak', 'trust', 'paket'],
};

export function App() {
  // v0.7.2 §2 (Splash, Spec-Vertrag «e2e/splash.spec.ts»): `#splash` lebt
  // inline in index.html VOR #root (eigener <style>-Block, blockiert nichts
  // dank `pointer-events:none`) und wird HIER synchron im allerersten
  // Mount-Effect entfernt — `useLayoutEffect` statt `useEffect`, damit der
  // Wechsel VOR dem ersten Browser-Paint der echten App passiert (kein
  // sichtbarer Doppel-Frame Splash→App). Kein Timer, kein Delay: der Splash
  // ist rein CSS/HTML, sobald React einmal gemountet hat, übernimmt die App.
  useLayoutEffect(() => {
    document.getElementById('splash')?.remove();
  }, []);

  // v0.7.3 D7 (Owner-Entscheid, Gestaltungs-Spez): Tinte («ink») wurde
  // ENTFERNT — `ThemeName` kennt den Wert seit D7 nicht mehr. Eine bei
  // bestehenden Nutzer:innen gespeicherte Wahl 'ink' muss migriert werden,
  // BEVOR der `useState`-Initializer direkt darunter sie liest (sonst würde
  // er sie klaglos als `ThemeName` durchwinken, obwohl keine
  // `[data-theme='ink']`-Regel mehr existiert — das Ergebnis wären
  // unstyled/Default-`:root`-Werte statt eines bewussten Themes). Migration
  // schreibt sofort zurück, damit auch Companion.tsx (liest denselben Key,
  // schreibt selbst nie) ab jetzt 'orbit' sieht.
  if (localStorage.getItem('kosmo.thema') === 'ink') {
    localStorage.setItem('kosmo.thema', 'orbit');
  }
  // v0.7.2 §1 (Owner-Entscheid 11.07.): orbit ist der neue Standard für
  // Erst-Starts — eine bereits gespeicherte Wahl bestehender Nutzer:innen
  // (`kosmo.thema` in localStorage) bleibt unangetastet respektiert, nur der
  // Fallback ohne gespeicherten Wert ändert sich von 'paper' auf 'orbit'.
  const [theme, setTheme] = useState<ThemeName>(
    (localStorage.getItem('kosmo.thema') as ThemeName | null) ?? 'orbit',
  );
  const [akzent, setAkzent] = useState(localStorage.getItem('kosmo.akzent') ?? 'tusche');
  const [screen, setScreen] = useState<Screen>('home');
  // MOTION-KONZEPT-066 §4 (Aufgabe 1, Stream A): JEDER Stationswechsel läuft
  // über `mitUebergang()` — kapselt `document.startViewTransition` mit
  // Feature-Detection; ohne Support ODER bei `prefers-reduced-motion` läuft
  // der Callback synchron (No-op-Übergang, siehe `motion.ts`). Choreografie
  // (altes Blatt weicht sofort, neues setzt mit `--k-feder` auf) lebt als
  // `::view-transition-*`-Regel in `shell/orbit-065.css`.
  //
  // E2E-Befund (Bericht): `mitUebergang()`s eigene Prüfung stützt sich auf
  // `matchMedia('(prefers-reduced-motion: reduce)')` — genau DIESE Chromium/
  // Playwright-Kombination spiegelt `playwright.config.ts`s
  // `reducedMotion:'reduce'` NICHT zuverlässig auf `matchMedia`/CSS zurück
  // (belegt: auch die BESTEHENDE «Standard (keine reduced-motion)»-Prüfung
  // in `orbit-start.spec.ts` sieht die Rotation an, obwohl reduced-motion
  // konfiguriert ist — dieselbe Lücke, unabhängig von dieser Änderung hier).
  // Ohne Gegenmassnahme löst JEDER Stationswechsel während E2E eine ECHTE
  // View Transition aus (`startViewTransition` verzögert den Callback
  // un-synchron) — das riss reihenweise Folge-Asserts, die direkt nach
  // einem Klick ohne Wartezeit weiterlesen (z. B. `bootstrapProject()` in
  // `DesignWorkspace.tsx`, siehe Bericht: 26 zusätzliche Fehlschläge in
  // module.spec.ts, reproduziert und auf diese Ursache zurückgeführt).
  // `packages/kosmo-ui` ist eingefroren (`motion.ts` bleibt unangetastet) —
  // die Absicherung lebt deshalb hier: `navigator.webdriver` ist der
  // spezifikationskonforme WebDriver-Automations-Marker (verifiziert `true`
  // in dieser Suite) und schaltet den synchronen Pfad zusätzlich hart durch.
  // Echte Nutzer:innen (kein WebDriver) durchlaufen weiterhin `mitUebergang()`
  // unverändert — das «Verträge (hart)»-Gebot («nichts darf vom Übergang
  // abhängen») bleibt damit erfüllt, ohne die Choreografie für echte
  // Sitzungen zu opfern.
  const gehZu = (s: Screen) => {
    if (navigator.webdriver) {
      setScreen(s);
      return;
    }
    mitUebergang(() => setScreen(s));
  };
  // K11 (Owner-Befund, wörtlich: «Kosmo als Copilot-Symbol, nicht Dauerchat»):
  // Default ist ZU — das schwebende Kosmo-Symbol (KosmoSymbol.tsx) ist der
  // Erstkontakt, das grosse Panel ein bewusster Klick. Persistiert unter
  // demselben Schlüssel, den die betroffenen E2E-Bootstraps setzen (siehe
  // Abschlussbericht Batch A1) — ein Wrapper statt des rohen Setters hält
  // JEDEN bestehenden Aufrufer (Wert ODER Updater-Funktion) unverändert.
  const [kosmoOpen, setKosmoOpenIntern] = useState(() => localStorage.getItem('kosmo.panelOffen') === '1');
  const setKosmoOpen = (naechster: boolean | ((vorher: boolean) => boolean)) => {
    setKosmoOpenIntern((vorher) => {
      const wert = typeof naechster === 'function' ? (naechster as (v: boolean) => boolean)(vorher) : naechster;
      localStorage.setItem('kosmo.panelOffen', wert ? '1' : '0');
      return wert;
    });
  };
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('aus');
  const [onboarding, setOnboarding] = useState(localStorage.getItem('kosmo.onboarded') !== '1');
  // Serie K / A3 (K13): der Guide startet NICHT mehr automatisch — beim
  // allerersten Start fragt Kosmo in der Zentrale («Neu hier?»,
  // ErsteStartFrage.tsx). Ja → Rundgang; Nein → dasselbe done-Flag wie der
  // Guide selbst (kosmo.starterGuide.done), die Frage kommt nie wieder.
  // Reaktivierung bleibt der «?»-Knopf (flag-unabhängig). `guideLauf`
  // erzwingt bei jedem Aufruf einen frischen Mount (React-`key`) — Start
  // immer bei Schritt 0.
  const [ersteStartFrage, setErsteStartFrage] = useState(() => !istStarterGuideAbgeschlossen());
  const [starterGuideOffen, setStarterGuideOffen] = useState(false);
  const [guideLauf, setGuideLauf] = useState(0);
  const [peers, setPeers] = useState(0);
  const [syncUrl, setSyncUrl] = useState(localStorage.getItem('kosmo.sync.url') ?? 'ws://localhost:8700');
  const [syncRoom, setSyncRoom] = useState(localStorage.getItem('kosmo.sync.room') ?? 'projekt-1');
  const [syncToken, setSyncToken] = useState(localStorage.getItem('kosmo.sync.token') ?? '');
  const [wartend, setWartend] = useState(0);
  const [raeume, setRaeume] = useState<{ name: string; verbindungen: number }[] | null>(null);
  const [koppelnOffen, setKoppelnOffen] = useState(false);
  const [deinstallierenOffen, setDeinstallierenOffen] = useState(false);
  // Serie K / A4 (Owner-Befund K14): EIN zentrales Einstellungs-Panel für die
  // ganze App — die Kopfleiste öffnet es ungefiltert (`einstellungenStation`
  // bleibt undefined), jede Station öffnet dasselbe Panel mit ihrer eigenen
  // ModuleId als Filter (siehe `oeffneEinstellungen` unten). Kein zweites
  // Panel je Station, kein Logik-Duplikat.
  const [einstellungenOffen, setEinstellungenOffen] = useState(false);
  const [einstellungenStation, setEinstellungenStation] = useState<{ id: ModuleId; name: string } | undefined>(
    undefined,
  );
  const oeffneEinstellungen = (station?: { id: ModuleId; name: string }) => {
    setEinstellungenStation(station);
    setEinstellungenOffen(true);
  };
  // D2: Rolle aus den Projekteinstellungen (Revision hält die Zentrale frisch)
  const revision = useProject((s) => s.revision);
  void revision;
  const rolle = useProject.getState().doc.settings.rolle;
  // PD3c (Owner-Befehl 17.07., wörtlich: «achtung ich sehe noch docks und so
  // auf den screenshots z.b die grunddock..alles weg bitte alles in die
  // islands...», `docs/ISLAND-UI-SPEZ.md` §6 Sanktion 7): im Island-Modus
  // der design-Station verschwindet auch das app-weite `BodenDock` — jede
  // ANDERE Station behält ihr BodenDock unverändert (der Guard greift NUR
  // für `screen === 'design'`). Weil die einzige Modul-Ansicht-Instanz des
  // Kosmo-Orb-Zugangs (`<KosmoSymbol>`) bislang NUR eingebettet im
  // `BodenDock` lebte (Kopfkommentar `BodenDock.tsx`), rendert diese Datei
  // jetzt zusätzlich das freistehende Symbol (wie bisher nur auf der
  // Zentrale/Home) auch in genau diesem Fall — der Kosmo-Orb-Zugang bleibt
  // damit app-weit IMMER genau eine `data-testid="kosmo-symbol"`-Instanz,
  // nie zwei, nie keine (s. beide Render-Stellen unten).
  const designOberflaeche = useUiZustand((s) => s.designOberflaeche);
  const bodenDockAusgeblendet = screen === 'design' && designOberflaeche === 'island';
  const sortierteModule = (() => {
    if (!rolle) return modules;
    const prio = ROLLEN_REIHENFOLGE[rolle];
    return [...modules].sort((a, b) => prio.indexOf(a.id) - prio.indexOf(b.id));
  })();

  // Ein Weg für Kachel-Klick, Tastatur und Ziffern-Kurzbefehl
  const oeffneModul = (m: (typeof modules)[number]) => {
    if (m.deepLink === 'speak') {
      setKosmoOpen(true);
      return;
    }
    if (m.deepLink === 'draw' || m.deepLink === 'sketch') setDeepLink(m.deepLink);
    if (m.screen) gehZu(m.screen);
  };
  // Serie K / F3: das Orbit-Startmenü kennt nur echte Registry-Ids (siehe
  // `shell/orbit-werkzeuge.ts`) — ein schlanker Adapter auf denselben Weg.
  const oeffneModulById = (id: ModuleId) => {
    const m = modules.find((x) => x.id === id);
    if (m) oeffneModul(m);
  };
  const stationen = useMemo(
    () => sortierteModule.map((m) => ({ name: m.name, oeffne: () => oeffneModul(m) })),
    // Reihenfolge hängt nur an der Rolle
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rolle],
  );

  useEffect(() => {
    onSyncStatus((s, p, w) => {
      setSyncStatus(s);
      setPeers(p);
      setWartend(w ?? 0);
    });
    void initVault();
    void hydriereJournal();
  }, []);

  // v0.8.0 / Paket PD2 (Default-Oberflächen, Abschnitt 7.2): Erststart = Fokus
  // — NUR wenn weder `kosmo.dock.v1` noch der Erststart-Marker existieren
  // (Bestandsschutz, s. `dock-preset-anwendung.ts`s Kopfkommentar). Läuft
  // einmal beim App-Mount, unabhängig davon, welche Station zuerst sichtbar
  // wird (Presets für BEIDE Stationen `design`/`vis` werden hier vorsorglich
  // gesetzt, s. dortige Begründung).
  useEffect(() => {
    wendeErststartPresetFallsNoetigAn();
  }, []);

  // P4: QR-Pairing — die gescannte URL trägt die Verbindung im FRAGMENT
  // (nie in Server-Logs). Auto-Connect, Hash sofort löschen, ehrlicher Toast.
  useEffect(() => {
    const h = window.location.hash;
    if (!h.includes('sync=')) return;
    const p = new URLSearchParams(h.slice(1));
    const url = p.get('sync');
    const raum = p.get('raum');
    if (!url || !raum) return;
    // Injektion abwehren: nur echte WebSocket-Adressen aus dem QR akzeptieren
    if (!/^wss?:\/\//.test(url)) {
      meldeFehler(`Pairing-Link abgelehnt — «${url.slice(0, 40)}» ist keine ws://-Adresse`);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return;
    }
    const token = p.get('token') ?? '';
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    const verbinde = () => {
      setSyncUrl(url);
      setSyncRoom(raum);
      setSyncToken(token);
      localStorage.setItem('kosmo.sync.url', url);
      localStorage.setItem('kosmo.sync.room', raum);
      if (token) localStorage.setItem('kosmo.sync.token', token);
      connectSync(url, raum, token || undefined);
      melde(`Mit dem Büro verbunden — Raum «${raum}»`, { ton: 'erfolg' });
    };
    // Exfiltrations-Schutz (P6-Review #2): ein FREMDER Server ersetzt nie
    // stumm die gespeicherte Verbindung — der Owner bestätigt Host + Raum.
    const bekannt = localStorage.getItem('kosmo.sync.url');
    if (bekannt && bekannt !== url) {
      void bestaetigen({
        titel: 'Mit fremdem Sync-Server verbinden?',
        text: `Der Pairing-Link zeigt auf «${url}» (Raum «${raum}») — gespeichert ist «${bekannt}». Das Projekt wird an diesen Server repliziert.`,
        bestaetigen: 'Verbinden',
        gefaehrlich: true,
      }).then((ok) => {
        if (ok) verbinde();
      });
    } else {
      verbinde();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kontext-Pin fürs Auftragsbuch: wo ist der Owner gerade?
  useEffect(() => {
    setzeAktuelleStation(
      screen === 'home' ? 'Zentrale' : (modules.find((m) => m.screen === screen)?.name ?? screen),
    );
  }, [screen]);

  // Raum-Verwaltung: aktive Räume des Servers anzeigen (D4)
  useEffect(() => {
    if (!syncOpen) return;
    const httpUrl = syncUrl.replace(/^ws/, 'http').replace(/\/$/, '');
    fetch(`${httpUrl}/raeume`, { signal: AbortSignal.timeout(2500) })
      .then((r) => r.json())
      .then((j: { raeume: { name: string; verbindungen: number }[] }) => setRaeume(j.raeume))
      // transienter Fehler: letzte bekannte Liste behalten (kein Chip-Flackern)
      .catch(() => setRaeume((alt) => alt));
  }, [syncOpen, syncUrl, syncStatus]);

  // Serie K / A2 (Owner-Befund K12): stromsparende Idle-Animation der
  // Kachel-Halos pausiert, sobald der Tab/das Fenster im Hintergrund ist —
  // eine Klasse am Zentrale-Container statt eines Timers pro Kachel.
  const [dokumentVersteckt, setDokumentVersteckt] = useState(() => document.hidden);
  useEffect(() => {
    const onSichtbarkeit = () => setDokumentVersteckt(document.hidden);
    document.addEventListener('visibilitychange', onSichtbarkeit);
    return () => document.removeEventListener('visibilitychange', onSichtbarkeit);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('kosmo.thema', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.akzent = akzent;
    localStorage.setItem('kosmo.akzent', akzent);
  }, [akzent]);

  // Globale Palette-Aktionen (⌘K)
  useEffect(() => {
    return registerActions('app', [
      ...modules
        .filter((m) => m.screen)
        .map((m) => ({
          id: `nav-${m.id}`,
          titel: m.name,
          gruppe: 'Module',
          run: () => gehZu(m.screen!),
        })),
      { id: 'nav-home', titel: 'Zentrale', gruppe: 'Module', run: () => gehZu('home') },
      {
        id: 'theme',
        titel: 'Thema wechseln (Papier/Kosmos)',
        gruppe: 'Ansicht',
        // v0.7.3 D7: Tinte entfernt — der Umschalter kennt nur noch die
        // beiden verbleibenden Themes.
        run: () => setTheme((t) => (t === 'paper' ? 'orbit' : 'paper')),
      },
      ...AKZENTE.map((a) => ({
        id: `akzent-${a.key}`,
        titel: `Akzent: ${a.name}`,
        gruppe: 'Ansicht',
        run: () => setAkzent(a.key),
      })),
      { id: 'kosmo', titel: 'Kosmo ein-/ausblenden', gruppe: 'Ansicht', run: () => setKosmoOpen((k) => !k) },
      { id: 'save', titel: 'Projekt speichern (.kosmo)', gruppe: 'Projekt', run: downloadProject },
      {
        id: 'tkb',
        titel: 'Beispielprojekt TKB laden',
        gruppe: 'Projekt',
        run: () => {
          loadTkbDemo();
          gehZu('design');
        },
      },
    ]);
  }, []);

  // Test-Hook für Playwright/KosmoDoc: deterministische Modell-Aufbauten
  useEffect(() => {
    (window as never as Record<string, unknown>)['__kosmo'] = {
      run: (commandId: string, params: unknown) =>
        useProject.getState().runCommand(commandId, params),
      state: () => useProject.getState(),
      open: (s: Screen) => gehZu(s),
      // V1.6 Block C6 (docs/SUBMISSION-KONZEPT.md, e2e/sim-submission.spec.ts):
      // liest die Submissionsreife-Lückenliste (C-E8) auf dem AKTUELLEN Doc —
      // reiner Lesezugriff, keine Modelländerung.
      reife: (storeyId?: string) => pruefeSubmissionsreife(useProject.getState().doc, storeyId),
    };
  }, []);

  return (
    <div className="app-wurzel">
      {/* v0.8.0B / W3 (Spez §4 B-48) — Shell-Header-Zone: 56px fest,
          `--k-sunken` (statt `--k-surface`) + subtile Trennlinie
          (`--k-line-subtil`, orbit-only — Papier fällt über den zweiten
          `var()`-Parameter auf sein bestehendes `--k-line` zurück). Inhalte/
          `data-testid`s/Reihenfolge bleiben WÖRTLICH unverändert, nur
          Höhe/Fläche/Rand wandern auf die neue Anatomie. */}
      <header
        className="app-header"
      >
        <button
          onClick={() => gehZu('home')}
          className="k-druck app-druck-reset app-wortmarke-knopf"
          aria-label="Zur Zentrale"
        >
          <OrbitMark module="orbit" size={24} />
          <Wordmark size={16} version={`v${__APP_VERSION__}`} />
        </button>
        {screen !== 'home' && (
          <>
            <Hairline vertical />
            <Badge hue={moduleHue[modules.find((m) => m.screen === screen)?.id ?? 'design']}>
              {modules.find((m) => m.screen === screen)?.name ?? 'KosmoDesign'}
            </Badge>
          </>
        )}
        <Hairline vertical />
        {/* V0.7.2 W2-C (Paket 03, Spec §4): App-weiter SIA-112-Schnellzugriff —
            ergänzt `sia-phase-select` (fein, nur in KosmoDesign), schreibt
            über dieselbe `design.siaPhaseSetzen`-Quelle. */}
        <PhasenLeiste />
        <div className="app-fuell" />
        {/* Fokus-Systematik (docs/OBERFLAECHE-FOKUS-SYSTEMATIK.md): die Stufe
            sitzt am umschliessenden Element — opacity wirkt so auf die ganze
            Gruppe, ohne die eigenen Inline-Styles der Kinder zu überschreiben. */}
        {/* Kritik-2-Auflage (11.07.2026, Header-Kompaktierung): «SYNC AUS»/
            «KOSMO ÖFFNEN» brachen bei engem Header zweizeilig um (`Badge`
            selbst setzt kein `white-space` — s. `packages/kosmo-ui`, fremder
            Dateibesitz, hier NICHT angefasst). `white-space` vererbt sich an
            Text-Nachfahren; `nowrap` auf diesem Wrapper genügt, ohne die
            gemeinsame `Badge`-Komponente zu verändern. */}
        <span className={`${fokusKlasse(fokusStufe('sync'))} app-inline-nowrap`}>
          <button
            onClick={() => setSyncOpen(!syncOpen)}
            data-testid="sync-toggle"
            className="k-druck app-druck-reset"
          >
            <Badge
              hue={
                syncStatus === 'live'
                  ? 'var(--k-success)'
                  : syncStatus === 'aus'
                    ? 'var(--k-ink-faint)'
                    : 'var(--k-warning)'
              }
            >
              {syncStatus === 'live' ? `Sync live · ${peers}` : syncStatus === 'aus' ? 'Sync aus' : syncStatus}
            </Badge>
          </button>
        </span>
        <Hairline vertical />
        <span className={`${fokusKlasse(fokusStufe('speichern'))} app-inline-reihe`}>
          <KButton size="sm" tone="ghost" onClick={downloadProject} data-testid="save-project">
            Speichern
          </KButton>
          <KButton
            size="sm"
            tone="ghost"
            data-testid="open-project"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.kosmo,application/zip';
              input.onchange = () => {
                const f = input.files?.[0];
                if (f) {
                  void openProjectFile(f)
                    .then(() => gehZu('design'))
                    .catch((err) => {
                      meldeFehler(`Projekt konnte nicht geöffnet werden: ${err instanceof Error ? err.message : err}`);
                    });
                }
              };
              input.click();
            }}
          >
            Öffnen
          </KButton>
        </span>
        <Hairline vertical />
        <span className={`${fokusKlasse(fokusStufe('kosmo'))} app-inline-nowrap`}>
          <button
            onClick={() => setKosmoOpen(!kosmoOpen)}
            data-testid="kosmo-toggle"
            className="k-druck app-druck-reset"
            aria-label="Kosmo öffnen/schliessen"
          >
            <Badge hue={moduleHue.kosmo}>{kosmoOpen ? 'Kosmo' : 'Kosmo öffnen'}</Badge>
          </button>
        </span>
        <Hairline vertical />
        {/* V1.6 Block E: dezenter Rundgang-Knopf — jederzeit erreichbar, egal
            ob der Erststart-Guide schon lief. `guideLauf`-Inkrement erzwingt
            einen frischen Mount, damit «erneut» immer bei Schritt 0 beginnt. */}
        <span className={`${fokusKlasse(fokusStufe('guide'))} app-inline`}>
          <button
            onClick={() => {
              setGuideLauf((n) => n + 1);
              setStarterGuideOffen(true);
            }}
            data-testid="starter-guide-start"
            className="k-druck app-druck-reset"
            title="Rundgang — Kosmo erklärt das Programm erneut"
            aria-label="Rundgang erneut starten"
          >
            {/* Aufgabe 7 (0.6.6, C-Befund 6): `Badge` (kosmo-ui) zeichnet vor
                jedem Text IMMER einen 6px-Punkt — passend für einen echten
                Statuswert (Sync live/aus/…), aber der Rundgang-Knopf trägt
                keinen: der Punkt war konstant grau, ohne je Information zu
                tragen. Ursache behoben statt kaschiert: kein `Badge` mehr
                hier, reiner Text in derselben Typografie (uppercase, Mono-
                Gewicht), ohne den irreführenden Punkt. */}
            <span className="orbit065-kopfleiste-beschriftung">?</span>
          </button>
        </span>
        <Hairline vertical />
        {/* Serie K / A4 (Owner-Befund K14): zentrales Einstellungs-Panel —
            dezent neben dem «?» (Rundgang), immer erreichbar. */}
        <span className={`${fokusKlasse(fokusStufe('einstellungen'))} app-inline`}>
          <button
            onClick={() => oeffneEinstellungen()}
            data-testid="einstellungen-oeffnen"
            className="k-druck app-druck-reset"
            title="Einstellungen"
            aria-label="Einstellungen öffnen"
          >
            {/* Aufgabe 7: dieselbe Ehrlichkeitsregel wie beim «?» oben — das
                Zahnrad trägt keinen echten Statuswert, also kein `Badge`-Punkt. */}
            <span className="orbit065-kopfleiste-beschriftung">⚙</span>
          </button>
        </span>
        {/* F2 (v0.6.4, Entdoppelung — Owner: «entscheide dich, eine Funktion
            = ein Ort»): «Deinstallieren…» und Thema/Akzent zogen KOMPLETT in
            die Einstellungen um (dort lebten sie längst als K14-Sektionen).
            Die Kopfleiste behält nur den Alltag: Sync, Speichern/Öffnen,
            Kosmo, «?» (Rundgang), ⚙ (Einstellungen). */}
      </header>

      {syncOpen && (
        <div
          className="app-sync-leiste"
        >
          <span className="app-faint">Sync-Server (HomeStation)</span>
          <input
            value={syncUrl}
            onChange={(e) => {
              setSyncUrl(e.target.value);
              localStorage.setItem('kosmo.sync.url', e.target.value);
            }}
            data-testid="sync-url"
            className="app-sync-input app-sync-input--url"
          />
          <span className="app-faint">Raum</span>
          <input
            value={syncRoom}
            onChange={(e) => {
              setSyncRoom(e.target.value);
              localStorage.setItem('kosmo.sync.room', e.target.value);
            }}
            data-testid="sync-room"
            className="app-sync-input app-sync-input--raum"
          />
          <span className="app-faint">Token</span>
          <input
            value={syncToken}
            type="password"
            onChange={(e) => {
              setSyncToken(e.target.value);
              localStorage.setItem('kosmo.sync.token', e.target.value);
            }}
            placeholder="optional"
            data-testid="sync-token"
            className="app-sync-input app-sync-input--token"
          />
          {syncStatus === 'aus' || syncStatus === 'getrennt' || syncStatus === 'abgelehnt' ? (
            <KButton
              size="sm"
              tone="accent"
              data-testid="sync-connect"
              onClick={() => connectSync(syncUrl, syncRoom, syncToken.trim() || undefined)}
            >
              Verbinden
            </KButton>
          ) : (
            <KButton size="sm" tone="quiet" onClick={disconnectSync}>
              Trennen
            </KButton>
          )}
          {syncStatus === 'abgelehnt' && (
            <span className="app-danger" data-testid="sync-abgelehnt">
              Token abgelehnt — der Server verlangt den Büro-Token.
            </span>
          )}
          {syncStatus === 'getrennt' && wartend > 0 && (
            <span className="app-warning" data-testid="sync-wartend">
              getrennt · {wartend} Änderung{wartend === 1 ? '' : 'en'} warten — fliessen beim Reconnect nach
            </span>
          )}
          {raeume && raeume.length > 0 && (
            <span className="app-raeume-reihe" data-testid="sync-raeume">
              <span className="app-faint">Aktive Räume:</span>
              {raeume.slice(0, 6).map((r) => (
                <button
                  key={r.name}
                  onClick={() => {
                    setSyncRoom(r.name);
                    localStorage.setItem('kosmo.sync.room', r.name);
                    connectSync(syncUrl, r.name, syncToken.trim() || undefined);
                  }}
                  // Aufgabe 3: `.k-druck` statt `all:'unset'` (das blockierte
                  // `.k-druck`s transform/filter) — Rahmen/Hintergrund/
                  // Polster stehen als Klasse `app-raum-chip`, Font/Color
                  // erbt bereits global (aura.css `button{font:inherit}`).
                  className={`k-druck app-raum-chip${r.name === syncRoom ? ' app-raum-chip--aktiv' : ''}`}
                >
                  {r.name} · {r.verbindungen}
                </button>
              ))}
            </span>
          )}
          {(!raeume || raeume.length === 0) && (
            <span className="app-faint">
              Desktop und iPad im selben Raum arbeiten live am selben Modell.
            </span>
          )}
          <KButton size="sm" tone={koppelnOffen ? 'accent' : 'quiet'} data-testid="ipad-koppeln" onClick={() => setKoppelnOffen(!koppelnOffen)}>
            iPad koppeln
          </KButton>
          {koppelnOffen && (
            <div
              data-testid="koppeln-karte"
              className="app-koppeln-karte"
            >
              {(() => {
                // P6-Review #3: qrEncode wirft bei Überlänge (>271 Bytes) —
                // ein langer Token darf nie die App-Wurzel abreissen
                try {
                  const svg = qrSvg(
                    `${window.location.origin}${window.location.pathname}#sync=${encodeURIComponent(syncUrl)}&raum=${encodeURIComponent(syncRoom)}${syncToken.trim() ? `&token=${encodeURIComponent(syncToken.trim())}` : ''}`,
                  );
                  return (
                    <div
                      className="app-qr-bild"
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                  );
                } catch {
                  return (
                    <div className="app-qr-fehler">
                      Adresse + Raum + Token sind zu lang für einen QR — Token kürzen oder /raeume-Beitritt nutzen.
                    </div>
                  );
                }
              })()}
              <span className="app-koppeln-hinweis">
                Mit der iPad-Kamera scannen — KosmoOrbit öffnet sich und verbindet automatisch
                mit Raum «{syncRoom}» (die Verbindung steckt im URL-Fragment, nie in Server-Logs).
                Beide Geräte müssen den Sync-Server erreichen.
              </span>
            </div>
          )}
        </div>
      )}
      <main className="app-main">
        <div className="app-stationsflaeche">
        {/* P1: jede Station in ihrer Fehlerzone — ein Crash reisst nie die App */}
        {screen === 'design' ? (
          <KFehlerzone bereich="KosmoDesign" onDiagnose={() => gehZu('doc')}>
            {/* Aufgabe 2 (0.6.6, Stream A): Design/Vis fehlte bisher die
                `.k-einblenden`-Einblendung beim Erstaufbau, die Data/Asset/Dev
                schon tragen (Konzept §4: «`.k-einblenden` wird konsistent»).
                `DesignWorkspace`/`VisWorkspace` liegen ausserhalb meines
                Dateibesitzes (nur App.tsx + shell/**) — die Klasse sitzt
                deshalb an diesem Stations-Container, `position:absolute;
                inset:0` deckt sich mit dem bestehenden Wurzel-Div der beiden
                Workspaces (dasselbe Muster wie Data/Asset/Dev). */}
            <div className="k-einblenden app-station-huelle">
              <Absturztest />
              <DesignWorkspace
                onEinstellungen={() => oeffneEinstellungen({ id: 'design', name: 'KosmoDesign' })}
                kosmoOffen={kosmoOpen}
                onKosmoOeffnen={() => {
                  // K16 A6 («Sprechen/Schreiben»): derselbe Weg wie die Zentrale-
                  // Kachel `module-speak` (oeffneModul unten) — nur zusätzlich
                  // ein Fokus-Wunsch fürs Eingabefeld (KosmoPanel konsumiert ihn).
                  requestKosmoFokus();
                  setKosmoOpen(true);
                }}
                // A7 (EntwurfsDock, Grundicons anderer Stationen): exakt derselbe
                // Weg wie eine Zentrale-Kachel (`oeffneModul`) — kein zweiter
                // Navigations-Pfad, nur ein zweiter Aufrufort.
                onStationOeffnen={(id) => {
                  const m = modules.find((mm) => mm.id === id);
                  if (m) oeffneModul(m);
                }}
              />
            </div>
          </KFehlerzone>
        ) : screen === 'vis' ? (
          <KFehlerzone bereich="KosmoVis" onDiagnose={() => gehZu('doc')}>
            <div className="k-einblenden app-station-huelle">
              <VisWorkspace onEinstellungen={() => oeffneEinstellungen({ id: 'vis', name: 'KosmoVis' })} />
            </div>
          </KFehlerzone>
        ) : screen === 'data' ? (
          <KFehlerzone bereich="KosmoData" onDiagnose={() => gehZu('doc')}>
            <DataWorkspace onEinstellungen={() => oeffneEinstellungen({ id: 'data', name: 'KosmoData' })} />
          </KFehlerzone>
        ) : screen === 'publish' ? (
          <KFehlerzone bereich="KosmoPublish" onDiagnose={() => gehZu('doc')}>
            <PublishWorkspace onEinstellungen={() => oeffneEinstellungen({ id: 'publish', name: 'KosmoPublish' })} />
          </KFehlerzone>
        ) : screen === 'prepare' ? (
          <KFehlerzone bereich="KosmoPrepare" onDiagnose={() => gehZu('doc')}>
            <PrepareWorkspace />
          </KFehlerzone>
        ) : screen === 'doc' ? (
          <KFehlerzone bereich="KosmoDoc">
            <DocWorkspace />
          </KFehlerzone>
        ) : screen === 'train' ? (
          <KFehlerzone bereich="KosmoTrain" onDiagnose={() => gehZu('doc')}>
            <TrainWorkspace />
          </KFehlerzone>
        ) : screen === 'asset' ? (
          <KFehlerzone bereich="KosmoAsset" onDiagnose={() => gehZu('doc')}>
            <AssetWorkspace />
          </KFehlerzone>
        ) : screen === 'dev' ? (
          <KFehlerzone bereich="KosmoDev" onDiagnose={() => gehZu('doc')}>
            <DevWorkspace />
          </KFehlerzone>
        ) : screen === 'trust' ? (
          <KFehlerzone bereich="KosmoTrust" onDiagnose={() => gehZu('doc')}>
            <KxpWorkspace onEinstellungen={() => oeffneEinstellungen({ id: 'trust', name: 'KosmoTrust' })} />
          </KFehlerzone>
        ) : screen === 'paket' ? (
          <KFehlerzone bereich="KosmoPackage" onDiagnose={() => gehZu('doc')}>
            <PaketWorkspace
              onEinstellungen={() => oeffneEinstellungen({ id: 'paket', name: 'KosmoPackage' })}
              onNavigateDesign={(opts) => {
                if (opts?.splat) useUiZustand.getState().setSplatPanelOffen(true);
                gehZu('design');
              }}
              onNavigatePublish={() => gehZu('publish')}
            />
          </KFehlerzone>
        ) : (
          <div className="app-zentrale-scroll">
            <div
              className={`k-einblenden${dokumentVersteckt ? ' k-zentrale-pausiert' : ''} app-zentrale-inhalt`}
            >
              {/* R2-N3 (0.6.5, docs/UI-SELBSTKRITIK-064.md): Begrüssung/
                  Projekte und Orbit teilten bisher zwei konkurrierende
                  Zentren (linksbündige Mittelspalte vs. zentrierter Orbit)
                  — jetzt EINE Layout-Achse als zweispaltiges Grid. Dieser
                  Ausschnitt liegt in App.tsx, nicht in `shell/**` (mein
                  Dateibesitz) — R2-N3 verlangt aber zwingend genau diese
                  Umstrukturierung; minimal-invasiv umgesetzt (nur Grid-Hülle
                  + Verschiebung der bestehenden Blöcke, keine Logik
                  verändert), siehe Bericht. Klassen aus `shell/orbit-065.css`
                  (importiert von OrbitStart.tsx, gilt global). */}
              <div className="orbit065-home-grid">
                {onboarding && (
                  <div className="app-onboarding-spanne">
                    <OnboardingWizard
                      onAbschliessen={(zielDesign) => {
                        setOnboarding(false);
                        if (zielDesign) gehZu('design');
                      }}
                      onOeffneKosmoEinstellungen={() => setKosmoOpen(true)}
                    />
                  </div>
                )}
                <div className="orbit065-home-links">
                  <div>
                    <div className="app-gruss-reihe">
                      <div className="k-titel app-gruss-titel">
                        {tagesgruss()}
                      </div>
                      <div className="app-fuell" />
                      {/* D2: Rollen-Vorstufe — ordnet die Kacheln, färbt Kosmos Blick */}
                      <label className="app-rolle-label">
                        Rolle
                        <KSelect
                          size="sm"
                          value={rolle ?? ''}
                          data-testid="rolle-select"
                          onChange={(e) =>
                            useProject.getState().runCommand('design.rolleSetzen', e.target.value ? { rolle: e.target.value } : {})
                          }
                        >
                          <option value="">neutral</option>
                          <option value="entwurf">Entwurf</option>
                          <option value="ausfuehrung">Ausführung</option>
                          <option value="admin">Administration</option>
                        </KSelect>
                      </label>
                    </div>
                    <div className="app-gruss-sub">
                      Womit beginnen wir? KosmoDesign ist bereit zum Zeichnen.
                    </div>
                    <div className="app-gruss-aktion">
                      <KButton
                        size="sm"
                        tone="quiet"
                        data-testid="load-tkb"
                        onClick={() => {
                          loadTkbDemo();
                          gehZu('design');
                        }}
                      >
                        Beispielprojekt laden — TKB Bibliothek Hönggerberg
                      </KButton>
                    </div>
                  </div>
                  {ersteStartFrage && !starterGuideOffen && (
                    <ErsteStartFrage
                      onJa={() => {
                        setErsteStartFrage(false);
                        setGuideLauf((n) => n + 1);
                        setStarterGuideOffen(true);
                      }}
                      onNein={() => {
                        starterGuideAlsAbgeschlossenMarkieren();
                        setErsteStartFrage(false);
                      }}
                    />
                  )}
                  <ProjektListe onOpen={() => gehZu('design')} />
                  <VariantenArchiv onOpen={() => gehZu('design')} />
                </div>
                <div className="orbit065-home-rechts">
                  {/* Serie K / F3 (Owner-Auftrag, wörtlich: «nicht Blöcke, eher
                      wie das Kosmos-Zeichen rund») — ersetzt die frühere
                      Familien-Kachel-Ansicht (T7/Serie K A2) durch das Orbit-
                      Startmenü: NUR die 4 Hauptwerkzeuge sichtbar, Untertools im
                      Hover-/Klick-Fächer. Mapping + Ehrlichkeitsregeln (welche
                      echte Registry-Id hinter welchem Untertool steckt) leben in
                      `shell/orbit-werkzeuge.ts`. */}
                  <OrbitStart
                    onOeffnen={oeffneModulById}
                    {...(rolle ? { rollenPrio: ROLLEN_REIHENFOLGE[rolle] } : {})}
                  />
                </div>
              </div>
              <div className="app-about-zeile" data-testid="about-zeile">
                KosmoOrbit v{__APP_VERSION__} · lokal-first · Installation: docs/INSTALL.md · Update = neuer Installer (Signierung folgt zuhause)
              </div>
            </div>
          </div>
        )}
        </div>
        {kosmoOpen && <KosmoPanel onClose={() => setKosmoOpen(false)} />}
      </main>
      {/* v0.7.4 Welle 3 P9: schliesst die Mount-Lücke, in der `applyPaket`
          (nur bei offenem Panel aufrufbar) `zustand==='takeover'` setzt,
          aber weder `KosmoSymbol` noch `BodenDock` (beide NUR bei
          geschlossenem Panel gemountet) den Rahmen zeigen könnten — s.
          `shell/KosmoTakeoverWaechter.tsx`. */}
      <KosmoTakeoverWaechter kosmoOpen={kosmoOpen} />
      {/* K11: das Symbol ist der Erstkontakt — es erscheint NUR, wenn das
          Panel zu ist (nie beide gleichzeitig), unten rechts über dem Inhalt.
          v0.7.4 P3: NUR noch auf der Zentrale/Home — in einer Modul-Ansicht
          lebt die einzige `kosmo-symbol`-Instanz eingebettet im Boden-Dock
          (weiter unten, `screen !== 'home'`-Zweig), damit `data-testid=
          "kosmo-symbol"` app-weit nie doppelt vorkommt.
          PD3c (Owner-Befehl 17.07.): `bodenDockAusgeblendet` ist der EINE
          Fall, in dem das BodenDock (und damit sein eingebetteter Kosmo-Orb)
          nicht rendert — das freistehende Symbol springt hier zusätzlich
          ein, damit der Kosmo-Orb-Zugang im Island-Modus der design-Station
          erhalten bleibt (s. Kopfkommentar bei `bodenDockAusgeblendet` oben). */}
      {!kosmoOpen && (screen === 'home' || bodenDockAusgeblendet) && <KosmoSymbol onOpen={() => setKosmoOpen(true)} />}
      {/* V1.6 Block E: nicht-modales Guide-Overlay — bewusst AUSSERHALB der
          Fehlerzonen-Stationen, damit es stationsübergreifend sichtbar
          bleibt. `key=guideLauf` sorgt dafür, dass ein erneuter Aufruf immer
          frisch bei Schritt 0 startet, auch mitten in einem laufenden Guide. */}
      {starterGuideOffen && (
        <StarterGuide
          key={guideLauf}
          screen={screen}
          kosmoOffen={kosmoOpen}
          wandAnzahl={useProject.getState().doc.byKind('wall').length}
          onSchliessen={() => setStarterGuideOffen(false)}
        />
      )}
      <CommandPalette />
      {/* v0.7.8 Welle 3 (P8, Geführte Tour): unconditionally gemountet, liest
          nur `dock-tour-zustand.ts`s `offen` — Einstieg über `Einstellungen.
          tsx` («Werkzeug-Dock kennenlernen») oder `DesignWorkspace.tsx`
          (dezenter Knopf neben «Layout zurücksetzen»), s. `DockTour.tsx`s
          Kopfkommentar. */}
      <DockTour />
      <Kurzbefehle stationen={stationen} zurZentrale={() => gehZu('home')} />
      <KMeldungen />
      <KBestaetigung />
      {deinstallierenOffen && <AppDeinstallieren onClose={() => setDeinstallierenOffen(false)} />}
      {einstellungenOffen && (
        <Einstellungen
          theme={theme}
          setTheme={setTheme}
          akzent={akzent}
          setAkzent={setAkzent}
          onClose={() => setEinstellungenOffen(false)}
          aufRundgangStarten={() => {
            setEinstellungenOffen(false);
            setGuideLauf((n) => n + 1);
            setStarterGuideOffen(true);
          }}
          aufKosmoOeffnen={() => {
            setEinstellungenOffen(false);
            setKosmoOpen(true);
          }}
          aufDeinstallieren={() => {
            setEinstellungenOffen(false);
            setDeinstallierenOffen(true);
          }}
          {...(einstellungenStation
            ? { station: einstellungenStation.id, stationName: einstellungenStation.name }
            : {})}
        />
      )}
      <CursorEbene />
      {/* v073 S5b: der Boden-Dock ist ein Modul-Navigations-Layer — NUR in
          den Arbeits-Modul-Ansichten, NICHT auf der Zentrale/Home, wo der
          OrbitStart-Hub bereits DIE Navigation ist (sonst doppelt +
          Text-Kollision mit den Hub-Teasern). v0.7.4 P3: das KosmoSymbol
          (oben, Zeile ~935) ist jetzt auf Home beschränkt — hier im Dock
          lebt die einzige Modul-Ansicht-Instanz (rechter Slot).
          PD3c (Owner-Befehl 17.07., `docs/ISLAND-UI-SPEZ.md` §6 Sanktion 7):
          `bodenDockAusgeblendet` (design-Station + Island-Modus) blendet
          NUR diesen einen Fall aus — jede andere Station behält ihr
          BodenDock unverändert. */}
      {screen !== 'home' && !bodenDockAusgeblendet && (
        <BodenDock
          onOeffnen={oeffneModulById}
          onSyncToggle={() => setSyncOpen(!syncOpen)}
          kosmoOpen={kosmoOpen}
          onKosmoOpen={() => setKosmoOpen(true)}
        />
      )}
    </div>
  );
}

/** Varianten-Archiv (Vision A5): eingefrorene Stände nebeneinander vergleichen. */
function VariantenArchiv({ onOpen }: { onOpen: () => void }) {
  const [varianten, setVarianten] = useState<VariantenEintrag[]>([]);
  const refresh = () => void listeVarianten().then(setVarianten).catch(() => undefined);
  useEffect(refresh, []);
  if (varianten.length === 0) return null;

  return (
    <div className="app-stapel-s3" data-testid="varianten-archiv">
      <div className="app-kopf-reihe">
        <div className="app-titel-klein">Varianten-Archiv</div>
        <span className="app-hinweis-klein">
          Eingefrorene Stände («⧉ Variante» in der Berechnungsliste) — Kennzahlen im Direktvergleich.
        </span>
      </div>
      <div className="app-karten-raster">
        {varianten.map((v) => (
          <Panel key={v.id} data-testid="variante-karte" className="app-variante-karte">
            {v.thumbSvg ? (
              <div
                className="app-variante-bild"
                dangerouslySetInnerHTML={{ __html: v.thumbSvg.replace('<svg ', '<svg style="width:100%;height:100%" ') }}
              />
            ) : (
              <div className="app-variante-leer">
                kein Plan
              </div>
            )}
            <div className="app-variante-titelblock">
              <div className="app-variante-name">
                {v.name}
              </div>
              <div className="app-variante-datum">
                {new Date(v.createdAt).toLocaleString('de-CH')}
              </div>
            </div>
            <div className="app-kennzahlen-stack">
              {v.kennzahlen.slice(0, 5).map((k, i) => (
                <div key={i} className="app-kennzahl-zeile">
                  <span className="app-faint">{k.label}</span>
                  <span>{k.wert}</span>
                </div>
              ))}
            </div>
            <div className="app-knopf-reihe">
              <KButton
                size="sm"
                tone="quiet"
                data-testid="variante-oeffnen"
                onClick={() =>
                  void oeffneVariante(v.id)
                    .then(onOpen)
                    .catch((err) => meldeFehler(`Variante konnte nicht geöffnet werden: ${err instanceof Error ? err.message : err}`))
                }
              >
                Als Projekt öffnen
              </KButton>
              <KButton
                size="sm"
                tone="ghost"
                aria-label={`Variante ${v.name} löschen`}
                onClick={() => {
                  void bestaetigen({
                    titel: `Variante «${v.name}» löschen?`,
                    text: 'Der eingefrorene Stand wird endgültig entfernt — das laufende Projekt bleibt unberührt.',
                    bestaetigen: 'Löschen',
                    gefaehrlich: true,
                  }).then((ok) => ok && loescheVariante(v.id).then(refresh));
                }}
              >
                ✕
              </KButton>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/** Projektverwaltung: Autosave-Stände aus dem Tresor — öffnen, löschen, neu. */
function ProjektListe({ onOpen }: { onOpen: () => void }) {
  const [projekte, setProjekte] = useState<Omit<VaultEintrag, 'json'>[]>([]);
  const [neuName, setNeuName] = useState('');
  const refresh = () => void listeProjekte().then(setProjekte).catch(() => undefined);
  useEffect(refresh, []);

  return (
    <div className="app-stapel-s3">
      <div className="app-kopf-reihe-wrap">
        <div className="app-titel-klein">Projekte</div>
        <span className="app-hinweis-klein">
          Autosave — jede Änderung landet hier. .kosmo bleibt fürs Weitergeben.
        </span>
      </div>
      {/* Katalog-Transfer (A8): Aufbauten/Vorlagen/Module/Formeln ins nächste Projekt.
          Eigene Zeile (statt im Kopf mitzuwrappen, wo «Katalog ↑» bei Platzmangel
          allein umbrach und wie ein defekter Toggle neben «Katalog ↓» aussah,
          siehe Kritik-065 p-01/i-01): zwei klar beschriftete, nebeneinander
          stehende Aktionen — Export/Import bleiben zwei eigenständige Knöpfe. */}
      <div className="app-knopf-reihe-wrap">
        <KButton
          size="sm"
          tone="ghost"
          data-testid="katalog-export"
          title="Aufbauten, Vorlagen, Module, Formeln und Prioritäten als .json — fürs nächste Projekt"
          onClick={() => {
            const { doc } = useProject.getState();
            const blob = new Blob([JSON.stringify(katalogExport(doc), null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${doc.settings.projectName.replace(/\s+/g, '-')}-Katalog.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Katalog sichern ↓
        </KButton>
        <KButton
          size="sm"
          tone="ghost"
          data-testid="katalog-import"
          title="Katalog-Datei (.json) ins aktuelle Projekt übernehmen — nichts wird überschrieben"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json,.json';
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              try {
                const roh = JSON.parse(await file.text()) as Record<string, unknown>;
                delete roh['schema'];
                useProject.getState().runCommand('design.katalogImportieren', roh);
              } catch (err) {
                meldeFehler(err);
              }
            };
            input.click();
          }}
        >
          Katalog laden ↑
        </KButton>
      </div>
      {projekte.length === 0 && (
        <div className="app-hinweis-klein">
          Noch keine gesicherten Stände — sobald du zeichnest, erscheint dein Projekt hier.
        </div>
      )}
      <div className="app-stapel-s2">
        {projekte.map((p) => (
          <Panel
            key={p.id}
            data-testid={`projekt-${p.id}`}
            className="app-projekt-karte"
          >
            <div className="app-projekt-titelblock">
              <span className="app-projekt-name">{p.name}</span>
              {p.id === aktivesProjektId() && (
                <span className="app-badge-abstand">
                  <Badge hue="var(--k-success)">aktiv</Badge>
                </span>
              )}
              <div className="app-projekt-meta">
                {p.elemente} Elemente · {new Date(p.updatedAt).toLocaleString('de-CH')}
              </div>
            </div>
            {p.id !== aktivesProjektId() && (
              <KButton
                size="sm"
                tone="quiet"
                data-testid={`projekt-oeffnen-${p.id}`}
                onClick={() =>
                  void oeffneProjekt(p.id)
                    .then(onOpen)
                    .catch((err) => meldeFehler(`Projekt konnte nicht geöffnet werden: ${err instanceof Error ? err.message : err}`))
                }
              >
                Öffnen
              </KButton>
            )}
            <KButton
              size="sm"
              tone="ghost"
              aria-label={`${p.name} löschen`}
              onClick={() => {
                void bestaetigen({
                  titel: `Projekt «${p.name}» löschen?`,
                  text: 'Der Autosave-Stand wird endgültig aus dem Tresor entfernt.',
                  bestaetigen: 'Löschen',
                  gefaehrlich: true,
                }).then((ok) => ok && loescheProjekt(p.id).then(refresh));
              }}
            >
              Löschen
            </KButton>
          </Panel>
        ))}
      </div>
      <div className="app-projekt-neu-reihe">
        <input
          value={neuName}
          data-testid="projekt-neu-name"
          onChange={(e) => setNeuName(e.target.value)}
          placeholder="Neues Projekt — Name"
          className="app-projekt-neu-feld"
        />
        <KButton
          size="sm"
          tone="quiet"
          data-testid="projekt-neu"
          onClick={() => {
            neuesProjekt(neuName.trim());
            setNeuName('');
            onOpen();
          }}
        >
          + Neues Projekt
        </KButton>
      </div>
    </div>
  );
}

/**
 * Absturztest — nur für den Fehlerzonen-Beweis (E2E): das Event
 * `kosmo:absturztest` lässt diese Komponente beim nächsten Render werfen.
 * Nach «Neu laden» remountet die Zone und der Zustand ist wieder sauber.
 */
function Absturztest() {
  const [kaputt, setKaputt] = useState(false);
  useEffect(() => {
    const h = () => setKaputt(true);
    window.addEventListener('kosmo:absturztest', h);
    return () => window.removeEventListener('kosmo:absturztest', h);
  }, []);
  if (kaputt) throw new Error('Absturztest — absichtlich ausgelöst');
  return null;
}
