import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Hairline, KButton, KIcon, KSelect, bestaetigen, melde, meldeFehler, moduleHue, OrbitMark } from '@kosmo/ui';
import {
  ChatSession,
  LearningJournal,
  AnthropicProvider,
  MockProvider,
  OllamaProvider,
  OpenAiKompatibelProvider,
  ScriptedProvider,
  betriebKonfig,
  editionBetriebsart,
  greeting,
  leseEdition,
  lizenzHinweis,
  personas,
  type Betriebsart,
  type ChatProvider,
  type CloudAuthArt,
  type Proposal,
} from '@kosmo/ai';
import { verifiziereLizenz } from '@kosmo/lizenz';
import type { Assembly } from '@kosmo/kernel';
import { formatiereEreignisse, useProject } from '../state/project-store';
import { loadReferences } from '../modules/data/DataWorkspace';
import { sucheQuellen, useQuellen, type QuellenRef } from '../state/quellen';
import { vorschauFuerProposal, type ProposalVorschau } from '../state/proposal-vorschau';
import { abspielVorspiel } from '../state/abspiel-anschluss';
import { DiagnosePanel } from './Diagnose';
import { WerkzeugSetup } from './WerkzeugSetup';
import { GovernanceGate, RisikoPill } from './GovernanceGate';
import { alleFuerJobErlaubt, alleWiderrufen, erlaubeFuerJob, widerrufeFuerJob } from './governance-speicher';
import { hydriereJournal, journalStore } from '../state/journal-store';
import { consumeKosmoFokus } from '../state/kosmo-focus';
import { auftragErfassen } from '../state/auftragsbuch';
import {
  ANT_INSTALL_BEFEHL,
  claudeAboAnmeldung,
  istAntFehltFehler,
  istTauriDesktop,
  mitAbmeldung,
  mitApiSchluessel,
} from './cloud-login';
import { kurzform, useKosmoStatus } from '../state/kosmo-status';
import { wusch } from '../state/sounds';
import { KOSMO_AUSGESCHLOSSENE_COMMANDS, kosmoUiWerkzeuge } from '../state/kosmo-ui-werkzeuge';
import {
  blickErfassen,
  blickRingPuffer,
  erkenneAktiveStation,
  ergaenzendeBilderAusRing,
  type Blick,
} from '../state/kosmo-blick';

/**
 * KosmoPanel — der ständige Begleiter (Vision: Kosmo ist immer da).
 * Schreibende Vorschläge erscheinen als Karten: Anwenden führt den Command
 * über denselben Weg aus wie ein Handgriff des Architekten (Undo inklusive).
 *
 * `ui.*`-Befehle (v0.6.6 BEWEGUNGSKONZEPT §6, `state/kosmo-ui-werkzeuge.ts`)
 * laufen NICHT über diesen Karten-Weg — sie sind flüchtig/undo-frei, laufen
 * SOFORT und quittieren sich stattdessen als eigene, dezente `who: 'system'`-
 * Chat-Zeile (`kosmo-ui-aktion-*`). Siehe die ausführliche Begründung der
 * Grenze in `kosmo-ui-werkzeuge.ts`.
 */

/**
 * v0.7.4 Welle 3 P9 (Owner-Entscheid, verbindlich) — «Grosses Paket»: der
 * Vollbild-Takeover-Rahmen löst NUR aus, wenn `applyPaket` autonom ein
 * Paket mit MINDESTENS dieser Schritt-Zahl anwendet. Kleinere Pakete (auch
 * mit `paket-card`/Zusammenfassungszeile) bleiben unverändert unauffällig.
 */
const SCHWELLE_GROSSES_PAKET = 8;

interface Bubble {
  id: number;
  who: 'du' | 'kosmo' | 'system';
  text: string;
  feedback?: 'gut' | 'schlecht';
  /** Nur bei `who === 'system'`: testid-Suffix, z.B. 'modus' → `kosmo-ui-aktion-modus`. */
  testidSuffix?: string;
  /**
   * v0.6.8 («Kosmo sieht mit»): NUR bei `testidSuffix === 'blick'` gesetzt —
   * dataURL fürs Mini-Thumbnail der Auto-Blick-Zeile (kein Bild, wenn die
   * Station nur einen Text-Kontext lieferte).
   */
  blickBild?: string;
  /**
   * v0.6.9 Stream D: `Blick.zeit` (Date.now() beim Erfassen), NUR gesetzt
   * zusammen mit `blickBild` — trägt die ehrliche Zeitangabe («erfasst
   * HH:MM:SS») in die Vollbild-Vorschau, ohne sie aus dem Text zu parsen.
   */
  blickZeit?: number;
}

const journal = new LearningJournal(journalStore());

/** Wettbewerbsdossier (Phase 0) als harter Prompt-Block — Do's/Don'ts zuerst. */
function dossierPromptBlock(): string {
  const dossier = useProject.getState().doc.settings.dossier;
  if (!dossier || dossier.length === 0) return '';
  const zeile = (t: { typ: string; text: string }) =>
    t.typ === 'dont' ? `- NO-GO: ${t.text}` : t.typ === 'do' ? `- GEFORDERT: ${t.text}` : `- FAKT: ${t.text}`;
  const sortiert = [...dossier].sort(
    (a, b) => (a.typ === 'dont' ? 0 : a.typ === 'do' ? 1 : 2) - (b.typ === 'dont' ? 0 : b.typ === 'do' ? 1 : 2),
  );
  return `\n\nWettbewerbsdossier dieses Projekts (bindend):\n${sortiert.slice(0, 20).map(zeile).join('\n')}`;
}

/** D2: Rollen-Vorstufe — die gewählte Arbeitsrolle färbt Kosmos Blick. */
function rollePromptBlock(): string {
  const rolle = useProject.getState().doc.settings.rolle;
  if (!rolle) return '';
  const fokus = {
    entwurf: 'Volumen, Grundrisse, Kennzahlen, Varianten und Referenzen zuerst.',
    ausfuehrung: 'Werkpläne, Details, Mengen/Ausmass und Umbau-Status zuerst.',
    admin: 'Projektstand, Diagnose, Datenpflege und Exporte zuerst.',
  }[rolle];
  return `\n\nArbeitsrolle des Menschen: ${rolle} — ${fokus}`;
}

interface PendingCard extends Proposal {
  state: 'offen' | 'angewendet' | 'abgelehnt';
  /**
   * Visuelle Vorschau (Owner-Befund K8, B1): `null`, wenn keine ehrliche
   * Vorschau möglich war — die Karte zeigt dann unverändert nur Text.
   */
  vorschau: ProposalVorschau | null;
  /**
   * H-28 (`docs/SIM-BEFUNDE.md`): gesetzt, wenn `state === 'abgelehnt'` NICHT
   * durch einen Klick auf «Ablehnen» entstand, sondern weil `runCommand` beim
   * Anwenden geworfen hat (`applyCard`-catch) — die Karte bleibt dann mit
   * dieser Fehlerzeile sichtbar statt spurlos zu verschwinden.
   */
  fehler?: string;
}

/**
 * Exportiert (Serie K / A4): das zentrale Einstellungs-Panel liest hierüber
 * `betriebsart`, um `WerkzeugSetup` (derselbe Weg wie das ⚙ im Kosmo-Panel)
 * direkt einzubetten — keine zweite Betriebsart-Herleitung.
 */
export interface KosmoSettings {
  /** Betriebsart (Owner «drei Versionen»): HomePC / VPN-Client / Cloud. */
  betriebsart: Betriebsart;
  /** Remote: VPN-Adresse des HomePC (IP oder Name). */
  remoteHost: string;
  provider: 'ollama' | 'lmstudio' | 'anthropic' | 'mock' | 'scripted';
  baseUrl: string;
  model: string;
  /**
   * v0.6.7 Phase 0 (ScriptedProvider) — NUR über `localStorage['kosmo.llm']`
   * gesetzt, nie über die Verbindungs-Auswahl im Panel (die bleibt tabu,
   * KosmoPanel-Provider-Labels ändern sich nicht). Skripte selbst kommen aus
   * `window.__kosmoSkripte[skriptId]`, nicht aus den Settings.
   */
  skriptId?: string;
  /** LM Studio: eigene Basis-URL + Modell (getrennt von Ollama gemerkt). */
  lmBaseUrl: string;
  lmModel: string;
  /** Anthropic: Schlüssel bleibt in localStorage auf diesem Gerät. */
  anthropicKey: string;
  anthropicModel: string;
  /**
   * Cloud-Login mit Abo («Mit Claude anmelden», Desktop-OAuth): das
   * kurzlebige Access-Token aus der lokalen Anthropic-Anmeldung. Bleibt wie
   * der Schlüssel nur auf diesem Gerät.
   */
  anthropicOauthToken: string;
  /** Welche der beiden Cloud-Anmeldearten aktiv ist. */
  cloudAuth: CloudAuthArt;
  /**
   * Signierte Lizenz (Serie I / Batch B6, opaker base64-Text) — bleibt wie
   * Schlüssel/Token nur auf diesem Gerät. Fehlt/ungültig führt NICHT zum
   * harten Aussperren lokaler Arbeit, sondern zu einem ehrlichen Hinweis;
   * server-seitig (Sync/Bridge) ist die Lizenz der einzige harte Anti-Copy-
   * Hebel. Ohne konfigurierten Public Key (`VITE_KOSMO_LIZENZ_PUBKEY`) bleibt
   * dieses Feld wirkungslos — dann verhält sich alles wie vor B6.
   */
  lizenzText: string;
  /**
   * v0.6.8 («Kosmo sieht mit», Owner-Nachtrag): Auto-Blick — bei jeder
   * gesendeten Nutzer-Nachricht wird der aktuelle Stations-Blick erfasst und
   * (bei einem vision-fähigen Provider) mitgeschickt. `undefined` = noch nie
   * angefasst, dann gilt der Provider-Default (`istVisionFaehig`); einmal vom
   * Menschen umgeschaltet, bleibt die Wahl explizit — unabhängig von
   * späteren Provider-Wechseln (gewohntes Toggle-Verhalten).
   */
  blickAn?: boolean;
}

/**
 * v0.6.8 — DEFAULT des Auto-Blick-Toggles, wenn der Mensch ihn nie angefasst
 * hat (`KosmoSettings.blickAn === undefined`): AN nur bei einem ECHTEN
 * vision-fähigen Provider (Anthropic/Ollama/LM-Studio mappen `images` gegen
 * einen echten Dienst, s. `@kosmo/ai`). Mock UND «scripted» defaulten AUS —
 * beide sind Test-/Demo-Provider ohne echten Gegenüber; ein Default-AN dort
 * würde bei JEDER bestehenden ScriptedProvider-E2E-Suite unbemerkt einen
 * echten Viewport-Capture pro Chat-Zug auslösen (Zeit/Flakiness-Risiko für
 * Specs, die dieses Feature nie angefragt haben). Wer den Toggle explizit
 * einschaltet (`blickAn: true`, z.B. `e2e/kosmo-blick.spec.ts`), bekommt das
 * volle Verhalten auch mit «scripted» — s. `kannBildVerstehen` unten.
 */
function istVisionFaehig(provider: KosmoSettings['provider']): boolean {
  return provider === 'anthropic' || provider === 'ollama' || provider === 'lmstudio';
}

/**
 * v0.6.8 — sobald der Blick-Toggle (per Default ODER explizit) AN ist: kann
 * DIESER Provider ein mitgeschicktes Bild sinnvoll nutzen? Bewusst NICHT
 * dieselbe enge Liste wie `istVisionFaehig` oben: «scripted» spielt zwar kein
 * echtes Modell nach, routet ein Bild aber durch GENAU denselben
 * `ChatMessage.images`-Weg wie ein echter Provider (`@kosmo/ai` `chat.ts`) —
 * für einen Menschen, der den Toggle bewusst eingeschaltet hat, ist «das Bild
 * ging tatsächlich raus» die ehrliche Aussage. NUR der `MockProvider` ist ein
 * reiner Regex-Bot, der Bilder nachweislich nie ansieht — er bleibt der
 * EINZIGE «Kosmo sieht nicht»-Fall (Owner-Vorgabe: «bei Mock ... ehrlicher
 * Hinweis statt Vortäuschung»).
 */
function kannBildVerstehen(provider: KosmoSettings['provider']): boolean {
  return provider !== 'mock';
}

/** v0.6.9 Stream D: ehrliche Uhrzeit («erfasst HH:MM:SS») für Ringpuffer-
 * Tooltips und die Vollbild-Vorschau — lokale Zeit, `Date.now()`-basiert. */
function formatiereZeit(zeit: number): string {
  const d = new Date(zeit);
  const zwei = (n: number) => String(n).padStart(2, '0');
  return `${zwei(d.getHours())}:${zwei(d.getMinutes())}:${zwei(d.getSeconds())}`;
}

/**
 * Modellwahl für den Anthropic-Provider (Owner-Befund F1 «Modell auswählbar
 * machen von Claude»): die drei aktuellen Claude-Modelle zur Auswahl, Opus
 * 4.8 als Owner-Default («mind. Opus 4.8» für volle Cloud-Betriebsart bleibt
 * unberührt, siehe `betriebKonfig`/`mindestensOpus` in `@kosmo/ai`). Ein
 * Freitext-Override bleibt daneben möglich — für neuere/eigene Modell-IDs,
 * ohne auf ein Kosmo-Release zu warten.
 */
const ANTHROPIC_MODELLE: { id: string; label: string }[] = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 (Standard)' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
];

const defaultSettings: KosmoSettings = {
  betriebsart: 'standard',
  remoteHost: '',
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  model: 'qwen3-coder:30b',
  lmBaseUrl: 'http://localhost:1234/v1',
  lmModel: 'qwen/qwen3-30b-a3b',
  anthropicKey: '',
  anthropicModel: 'claude-opus-4-8',
  anthropicOauthToken: '',
  cloudAuth: 'schluessel',
  lizenzText: '',
};

/**
 * Öffentlicher Lizenz-Schlüssel aus dem Build (`VITE_KOSMO_LIZENZ_PUBKEY`,
 * 32 Rohbytes base64 — kein Secret, darf im Bundle stehen). Leer = keine
 * Lizenz-Pflicht: die App verhält sich exakt wie vor B6, es erscheint kein
 * Lizenz-Hinweis und kein Eingabefeld. Der einzige harte Hebel ist ohnehin
 * die Server-Bindung (Sync/Bridge), nicht dieser clientseitige Check.
 */
function lizenzPublicKey(): string {
  return (import.meta.env.VITE_KOSMO_LIZENZ_PUBKEY ?? '').trim();
}

export function loadSettings(): KosmoSettings {
  try {
    const raw = localStorage.getItem('kosmo.llm');
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    /* leer */
  }
  // Erststart: Betriebsart aus der Installer-Edition vorwählen.
  const art = editionBetriebsart(leseEdition(import.meta.env.VITE_KOSMO_EDITION));
  const k = betriebKonfig({ betriebsart: art, cloudModell: defaultSettings.anthropicModel });
  return { ...defaultSettings, betriebsart: art, provider: k.provider };
}

/**
 * Kosmo spricht (Owner-Q7): Text → Bridge-/tts → Audio.
 * Ohne Bridge fällt die Stimme auf `speechSynthesis` des Browsers zurück
 * (de-CH wenn vorhanden) — die Bridge-Stimme bleibt der Qualitätsweg.
 */
async function speak(text: string): Promise<void> {
  const bridge = (localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600').replace(/\/$/, '');
  const kurz = text.slice(0, 600);
  // v0.7.2 §6 (TTS-Wiedergabe→speaking): der genaue Endzeitpunkt hängt vom
  // gewählten Wiedergabeweg ab (Bridge-Audio ODER Browser-`speechSynthesis`)
  // — beide Zweige setzen 'idle' selbst zurück, sobald IHRE Wiedergabe
  // endet, statt sich auf ein gemeinsames `finally` zu verlassen (das würde
  // vor dem tatsächlichen Audio-Ende feuern, `await audio.play()` löst schon
  // beim Start der Wiedergabe auf, nicht beim Ende).
  const beendeSprechenWennNochAktiv = () => {
    if (useKosmoStatus.getState().zustand === 'speaking') useKosmoStatus.getState().setzeZustand('idle');
  };
  useKosmoStatus.getState().setzeZustand('speaking');
  try {
    const res = await fetch(`${bridge}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: kurz }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const url = URL.createObjectURL(await res.blob());
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      beendeSprechenWennNochAktiv();
    };
    await audio.play();
  } catch {
    try {
      const u = new SpeechSynthesisUtterance(kurz);
      const stimmen = speechSynthesis.getVoices();
      const stimme = stimmen.find((v) => v.lang === 'de-CH') ?? stimmen.find((v) => v.lang.startsWith('de'));
      if (stimme) u.voice = stimme;
      u.lang = stimme?.lang ?? 'de-CH';
      u.onend = beendeSprechenWennNochAktiv;
      u.onerror = beendeSprechenWennNochAktiv;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (err) {
      beendeSprechenWennNochAktiv();
      console.info('Vorlesen nicht möglich (weder Bridge /tts noch speechSynthesis):', err);
    }
  }
}

// Web Speech API — minimale Typen (nicht in lib.dom für alle Targets)
interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
}

function browserSpeechRecognition(): BrowserSpeechRecognition | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Kurzer /health-Ping — entscheidet Bridge-Whisper vs. Browser-Erkennung. */
async function bridgeErreichbar(bridge: string): Promise<boolean> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 1200);
    const res = await fetch(`${bridge}/health`, { signal: ctl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

export interface KosmoPanelProps {
  onClose: () => void;
  /**
   * v0.7.2 §7/§12 («Kosmo zeichnet sichtbar», Stufe 1) — von Stream W2-D
   * vorbereitet, vom Leiter nach der Integration AWAIT-fähig gemacht:
   * `applyPaket` wartet das Vorspiel ab, BEVOR der synchrone, atomare
   * `runCommand`-Weg läuft (sonst liefe das Overlay parallel zum Apply —
   * §7 verlangt VORSPIEL). Ohne Prop greift der registrierbare Anschluss
   * `state/abspiel-anschluss.ts` (dort registriert Stream W3-E seine
   * Overlay-Ebene, ohne `KosmoPanel.tsx` oder `App.tsx` anzufassen) —
   * unregistriert bleibt alles ein folgenloser No-op. Das Vorspiel kann
   * den Apply nur verzögern, nie verhindern (Undo-Atomarität gewahrt).
   */
  onAbspielStart?: (schritte: PendingCard[]) => Promise<void> | void;
}

export function KosmoPanel({ onClose, onAbspielStart }: KosmoPanelProps) {
  const [settings, setSettings] = useState<KosmoSettings>(loadSettings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const speichere = (s: KosmoSettings) => {
    setSettings(s);
    localStorage.setItem('kosmo.llm', JSON.stringify(s));
  };
  // Cloud-Fallback: ein offenes Angebot aufs Mal; Text zum Nachsenden nach dem
  // Provider-Wechsel (die Session wird via useMemo auf [settings] neu gebaut).
  const cloudWechselLaeuft = useRef(false);
  const nachSendText = useRef('');
  const zuletztGefragt = useRef('');
  const cloudAnRef = useRef<(text: string) => void>(() => {});
  const [showSettings, setShowSettings] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  // v0.6.6 Stream E — Motion-Politur (MOTION-KONZEPT §4 «Overlays… öffnen mit
  // --k-feder, schliessen mit --k-motion-fast»): das Panel selbst kann sein
  // Mounten/Unmounten nicht verzögern (App.tsx bleibt Struktur-tabu), also
  // spielt es den kurzen Austritt SELBST ab, bevor es den Eltern-`onClose`
  // (der es tatsächlich unmountet) aufruft. Bei reduced-motion (u.a. jeder
  // E2E-Lauf, `playwright.config.ts`) entfällt die Verzögerung vollständig —
  // exakt dasselbe Timing wie vorher, keine neue Testflakiness.
  const [schliessend, setSchliessend] = useState(false);
  const handleClose = () => {
    const reduziert =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduziert) {
      onClose();
      return;
    }
    setSchliessend(true);
    window.setTimeout(onClose, 120); // --k-motion-fast
  };
  // Owner-Befund F1: «ant nicht gefunden» soll eine Anleitung zeigen, keinen
  // blossen Toast — persistiert im Panel, bis der nächste Versuch klappt.
  const [cliFehlt, setCliFehlt] = useState(false);
  // Owner-Befund F1 «Modell auswählbar»: Freitext-Override-Modus für die
  // Anthropic-Modellwahl, unabhängig davon ob der aktuelle Wert zufällig
  // einer Preset-Option entspricht (sonst könnte man den Freitext-Modus nie
  // sichtbar verlassen/betreten, wenn der Wert gerade ein Preset ist).
  const [modellFreitext, setModellFreitext] = useState(
    () => !ANTHROPIC_MODELLE.some((m) => m.id === settings.anthropicModel),
  );
  // Lizenz-Hinweis (Serie I / Batch B6): rein informativ, sperrt NIE die
  // lokale Arbeit. Ohne konfigurierten Public Key ist der Status dauerhaft
  // 'keine-pflicht' (kein Badge, kein Feld) — Default-Verhalten wie vor B6.
  const [lizenz, setLizenz] = useState<ReturnType<typeof lizenzHinweis>>({ status: 'keine-pflicht', text: '' });
  const [ttsOn, setTtsOn] = useState(localStorage.getItem('kosmo.tts') === '1');
  const lastKosmoText = useRef('');
  const ttsRef = useRef(ttsOn);
  ttsRef.current = ttsOn;
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [cards, setCards] = useState<PendingCard[]>([]);
  /**
   * v0.7.6 Welle 2 (GovernanceGate, Stufe «Für den Job erlauben») — echtes
   * Auto-Anwenden künftiger EINZEL-Vorschläge (kein Paket) DERSELBEN
   * `commandId`, bis Widerruf. v0.7.7 Stream B1: PERSISTENT über
   * `shell/governance-speicher.ts` (localStorage-Allowlist, Art `'command'`)
   * — überlebt einen Reload, endet nur über den bestehenden
   * «… · widerrufen»-Knopf des Gate (dort `widerrufeFuerJob`, s. Ehrlichkeits-
   * Kommentar in `governance-speicher.ts` — kein commandId hat ein
   * zuverlässiges «Job fertig»-Ereignis, also kein Auto-Verfall). `autoErlaubt`
   * bleibt ein reaktiver UI-Spiegel des Speichers: einmal beim Mount
   * eingelesen (Effekt unten), danach bei jedem Erlauben/Widerrufen synchron
   * mitgeschrieben, damit `fuerJobAktiv` sofort den richtigen Knopf-Zustand
   * zeigt. `autoErlaubtRef` spiegelt ihn zusätzlich synchron in einen Ref
   * (Muster `settingsRef`/`cloudAnRef` in dieser Datei) — `onProposal` (im
   * `session`-`useMemo` unten) braucht den AKTUELLEN Stand, nicht den zum
   * Zeitpunkt des `useMemo`-Baus.
   */
  const [autoErlaubt, setAutoErlaubt] = useState<Set<string>>(new Set());
  const autoErlaubtRef = useRef(autoErlaubt);
  autoErlaubtRef.current = autoErlaubt;
  useEffect(() => {
    // Persistenten Stand einmalig beim Mount einlesen — der Speicher
    // (localStorage) ist die Quelle der Wahrheit, s. `governance-speicher.ts`.
    setAutoErlaubt(new Set(alleFuerJobErlaubt('command')));
  }, []);
  const toggleAutoErlaubt = (commandId: string) => {
    setAutoErlaubt((s) => {
      const neu = new Set(s);
      if (neu.has(commandId)) {
        neu.delete(commandId);
        widerrufeFuerJob('command', commandId);
      } else {
        neu.add(commandId);
        erlaubeFuerJob('command', commandId);
      }
      return neu;
    });
  };
  /** Vorwärtsreferenz auf `applyCard` (unten definiert, braucht `session`
   *  selbst) — exakt das `cloudAnRef`-Muster dieser Datei: `onProposal`
   *  (im `session`-`useMemo`) ruft beim Auto-Anwenden `applyCardRef.current`
   *  auf, das `useMemo` selbst braucht `applyCard` nicht bei seinem Bau. */
  const applyCardRef = useRef<(card: PendingCard) => void>(() => {});
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  /** v0.6.9 Stream D: Vollbild-Vorschau der Blick-Miniatur — `null` = geschlossen. */
  const [vollbildBlick, setVollbildBlick] = useState<{ dataUrl: string; zeit: number; text: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // K16 A6: Ziel des einmaligen Fokus-Wunschs (`consumeKosmoFokus`, s. Mount-Effekt unten).
  const eingabeRef = useRef<HTMLInputElement>(null);
  const bubbleSeq = useRef(0);
  const runCommand = useProject((s) => s.runCommand);
  // Belege des Gesprächs: [Qn] im Antworttext → Quelle (Chip mit Quellensprung)
  const quellenMap = useRef(new Map<number, QuellenRef>());
  const quellenZaehler = useRef(0);

  // Bleibende Chat-Bubble hinzufügen — herausgehoben aus dem `session`-Aufbau
  // (H-28, `docs/SIM-BEFUNDE.md`): `applyCard`/`applyPaket` liegen ausserhalb
  // des `useMemo`-Closures unten und brauchen denselben Push-Mechanismus wie
  // die Mikrofon-/ui.*-Bubbles, um einen gescheiterten Anwenden-Versuch
  // sichtbar zu machen. Stützt sich nur auf stabile Refs/Setter — unabhängig
  // vom `[settings]`-Neuaufbau der Session unten sicher wiederverwendbar.
  const push = (who: Bubble['who'], text: string, testidSuffix?: string) => {
    const id = ++bubbleSeq.current;
    setBubbles((b) => [...b, { id, who, text, ...(testidSuffix !== undefined ? { testidSuffix } : {}) }]);
    return id;
  };

  /** v0.6.8 («Kosmo sieht mit»): die dezente Auto-Blick-Zeile, optional mit
   * Mini-Thumbnail (nur wenn tatsächlich ein Bild erfasst/mitgeschickt wurde).
   * v0.6.9 Stream D: `blickZeit` (Blick.zeit) reist mit, fürs Overlay unten. */
  const pushBlick = (text: string, blickBild?: string, blickZeit?: number) => {
    const id = ++bubbleSeq.current;
    setBubbles((b) => [
      ...b,
      {
        id,
        who: 'system',
        text,
        testidSuffix: 'blick',
        ...(blickBild !== undefined ? { blickBild } : {}),
        ...(blickZeit !== undefined ? { blickZeit } : {}),
      },
    ]);
  };

  const session = useMemo(() => {
    const provider: ChatProvider =
      settings.provider === 'mock'
        ? new MockProvider()
        : settings.provider === 'scripted'
          ? new ScriptedProvider(settings.skriptId ?? '')
          : settings.provider === 'anthropic'
            ? new AnthropicProvider(
                settings.cloudAuth === 'abo'
                  ? { oauthToken: settings.anthropicOauthToken, model: settings.anthropicModel }
                  : { apiKey: settings.anthropicKey, model: settings.anthropicModel },
              )
            : settings.provider === 'lmstudio'
              ? new OpenAiKompatibelProvider({ baseUrl: settings.lmBaseUrl, model: settings.lmModel })
              : new OllamaProvider({ baseUrl: settings.baseUrl, model: settings.model });
    const { doc } = useProject.getState();
    let currentKosmoBubble = -1;
    const s = new ChatSession(
      provider,
      doc,
      {
        onText: (delta) => {
          // Ausserhalb des Updaters akkumulieren — React batcht Updater,
          // onBusy(false) käme sonst vor dem letzten Textstück
          lastKosmoText.current += delta;
          // v0.7.2 §6 (onText-Streaming→writing) — jedes Textstück hält den
          // Zustand auf 'writing'; `onBusy(false)` (unten) räumt ihn zurück
          // auf 'idle', sobald der Zug fertig ist.
          useKosmoStatus.getState().setzeZustand('writing');
          setBubbles((b) => {
            const last = b[b.length - 1];
            if (last && last.who === 'kosmo' && last.id === currentKosmoBubble) {
              return [...b.slice(0, -1), { ...last, text: last.text + delta }];
            }
            currentKosmoBubble = ++bubbleSeq.current;
            return [...b, { id: currentKosmoBubble, who: 'kosmo', text: delta }];
          });
        },
        onProposal: (p) => {
          // Vorschau JETZT ableiten (Command-ID + Params kennt der Vorschlag
          // bereits vor dem Anwenden) — auf dem aktuellen Doc-Stand, nicht
          // dem beim Session-Start eingefrorenen `doc` oben im Closure.
          const vorschau = vorschauFuerProposal(useProject.getState().doc, p.commandId, p.params);
          const neueKarte: PendingCard = { ...p, state: 'offen', vorschau };
          setCards((c) => [...c, neueKarte]);
          // Laufzeit-Status fürs Kosmo-Symbol (K11) — der Vorschlag selbst
          // geht weiter normal als Karte durchs Panel/den Undo-Weg.
          useKosmoStatus.getState().setzeLetzteAktivitaet(kurzform(p.summary));
          // v0.7.6 Welle 2 (GovernanceGate «Für den Job erlauben»): NUR für
          // Einzelvorschläge (kein Paket — ein Paket hat keine stabile,
          // wiederkehrende Identität über `commandId` hinweg, s.
          // `GovernanceGate.tsx`-Kopfkommentar). Echtes Auto-Anwenden über
          // denselben `applyCard`-Weg wie ein «Einmal erlauben»-Klick.
          if (!p.paket && autoErlaubtRef.current.has(p.commandId)) {
            applyCardRef.current(neueKarte);
          }
        },
        onBusy: (v) => {
          setBusy(v);
          useKosmoStatus.getState().setzeBeschaeftigt(v);
          if (v) {
            currentKosmoBubble = -1;
            lastKosmoText.current = '';
          } else {
            if (lastKosmoText.current.trim()) {
              useKosmoStatus.getState().setzeLetzteAktivitaet(kurzform(lastKosmoText.current));
            }
            if (ttsRef.current && lastKosmoText.current.trim()) {
              void speak(lastKosmoText.current);
            }
          }
        },
        onError: (msg) => {
          // v0.7.2 §6 (onError→error) — Auto-Decay (4s, `state/kosmo-status.ts`)
          // räumt selbst auf; das direkt danach folgende `onBusy(false)`
          // (ChatSession-Lebenszyklus) lässt 'error' bewusst stehen (siehe
          // `BEHAELT_BEI_BESCHAEFTIGT_FALSE` dort).
          useKosmoStatus.getState().setzeZustand('error');
          push('kosmo', `⚠ ${msg}`);
          // HomeStation (lokales LLM) nicht erreichbar → direkt Cloud anbieten.
          const p = settingsRef.current.provider;
          if ((p === 'ollama' || p === 'lmstudio') && settingsRef.current.betriebsart !== 'cloud') {
            cloudAnRef.current(zuletztGefragt.current);
          }
        },
      },
      personas.kosmo.systemPrompt,
      () => {
        const st = useProject.getState();
        const wallAssembly = st.doc
          .byKind<Assembly>('assembly')
          .find((a) => a.target === 'wall');
        return {
          ...(st.activeStoreyId ? { storeyId: st.activeStoreyId } : {}),
          ...(wallAssembly ? { assemblyId: wallAssembly.id } : {}),
        };
      },
      [
        {
          name: 'referenzen_suchen',
          description:
            'Durchsucht KosmoData (Architektur-Referenzbibliothek, 112 kuratierte Bauwerke der Architekturgeschichte) nach Stichwort. Liefert Titel, Jahr, Ort, Architekten, Themen, Material. Nutze es, wenn der Architekt nach Referenzen, Vorbildern oder Vergleichen fragt.',
          parameters: {
            type: 'object',
            properties: {
              suchbegriff: { type: 'string', description: 'z.B. «Beton», «Moschee», «Le Corbusier», «Holz»' },
            },
            required: ['suchbegriff'],
            additionalProperties: false,
          },
          execute: async (args) => {
            const q = String((args as { suchbegriff?: string })?.suchbegriff ?? '').toLowerCase();
            const refs = await loadReferences();
            const hits = refs
              .filter((e) => {
                const hay = [e.title, e.city, e.country, e.style_sector, e.program, ...(e.authors ?? []), ...(e.themes ?? []), ...(e.materials ?? [])]
                  .filter(Boolean)
                  .join(' ')
                  .toLowerCase();
                return hay.includes(q);
              })
              .slice(0, 8);
            if (hits.length === 0) return `Keine Referenz zu «${q}» in KosmoData.`;
            return hits
              .map(
                (e) =>
                  `- ${e.title} (${e.year_start ?? '?'}, ${[e.city, e.country].filter(Boolean).join(', ')}) — ${(e.authors ?? []).join(', ') || 'unbekannt'}; Themen: ${(e.themes ?? []).join(', ')}${e.one_sentence ? ` — ${e.one_sentence}` : ''}`,
              )
              .join('\n');
          },
        },
        {
          name: 'quellen_suchen',
          description:
            'Durchsucht ALLE Projektquellen in einem Zug: die Wissensbasis (in KosmoPrepare aufgenommene Grundlagen wie Normen-Auszüge, Wettbewerbsprogramme, Baubeschriebe), das Wettbewerbsdossier, das Lernjournal des Büros, die KosmoData-Referenzbibliothek und die KosmoAsset-Objektbibliothek. Liefert belegte Abschnitte mit Marken [Qn]. Nutze es bei Fragen nach Vorgaben, Programmen, Normen, Referenzen, Objekten oder Bürowissen — und zitiere die Marken im Antworttext.',
          parameters: {
            type: 'object',
            properties: {
              suchbegriff: { type: 'string', description: 'z.B. «Nutzfläche», «Brandschutz Treppenhaus», «Stützenraster»' },
            },
            required: ['suchbegriff'],
            additionalProperties: false,
          },
          execute: async (args) => {
            const q = String((args as { suchbegriff?: string })?.suchbegriff ?? '');
            const treffer = await sucheQuellen(q, {
              journal: journal.all,
              dossier: useProject.getState().doc.settings.dossier,
            });
            if (treffer.length === 0) {
              return `Nichts zu «${q}» in Wissensbasis, Dossier oder Journal. (Grundlagen nimmt KosmoPrepare auf.)`;
            }
            const zeilen = treffer.map((t) => {
              const nr = ++quellenZaehler.current;
              quellenMap.current.set(nr, { ...t, nr });
              return `[Q${nr}] (${t.titel}) ${t.text.slice(0, 500)}`;
            });
            const erste = quellenZaehler.current - treffer.length + 1;
            return `${zeilen.join('\n---\n')}\n\nAntworte gestützt auf diese Belege und zitiere sie im Text mit ihrer Marke, z.B. [Q${erste}]. Erfinde keine Marken.`;
          },
        },
        {
          name: 'auftrag_erfassen',
          description:
            'Erfasst einen Verbesserungsauftrag im KosmoDev-Auftragsbuch. Nutze es, wenn der Architekt sagt, was an der SOFTWARE besser werden soll («das sollte…», «ich möchte, dass…», «hier fehlt…») — formuliere den Wunsch als klaren, umsetzbaren Auftrag. ort: wo genau in der Oberfläche (falls genannt). Die Aufträge gehen als Workorder an den Entwicklungs-Worker.',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Der Auftrag, klar und umsetzbar formuliert' },
              ort: { type: 'string', description: 'Wo in der Oberfläche, z.B. «Werkzeugleiste KosmoDesign»' },
            },
            required: ['text'],
            additionalProperties: false,
          },
          execute: async (args) => {
            const a = args as { text?: string; ort?: string };
            if (!a?.text?.trim()) return 'Kein Auftragstext — nichts erfasst.';
            const auftrag = await auftragErfassen(a.text, 'kosmo', a.ort?.trim() || undefined);
            return `Auftrag im Buch (${auftrag.station}): «${auftrag.text}» — der Architekt sieht ihn in KosmoDev und exportiert dort die Workorder.`;
          },
        },
        {
          // v0.6.8 («Kosmo sieht mit», Commit 2 — Ereignis-Mitschnitt): so
          // "sieht" Kosmo auch nicht-visuell, was zuletzt im Projekt geschah
          // — die letzten ~20 Command-Zusammenfassungen mit Zeit+Aktor, aus
          // demselben `journal`, das JEDER `runCommand()`-Aufruf füttert
          // (`state/project-store.ts`), egal ob Mensch oder Kosmo handelte.
          name: 'ereignisse_lesen',
          description:
            'Liest die letzten rund 20 Aktionen dieser Sitzung (Befehle von Nutzer UND Kosmo, mit Uhrzeit). Nutze es, wenn der Architekt fragt, was zuletzt geschah, oder du selbst den jüngsten Verlauf kennen musst, bevor du etwas vorschlägst.',
          parameters: { type: 'object', properties: {}, additionalProperties: false },
          execute: () => formatiereEreignisse(),
        },
        // v0.6.6 Stream E (Kosmo-UI-Brücke, BEWEGUNGSKONZEPT §6): die sechs
        // ui.*-Befehle als weitere ReadTool-Einträge — sie laufen wie die
        // drei oben SOFORT (kein Diff-Karten-Gate), melden eine erfolgreiche
        // SCHREIBENDE Aktion aber zusätzlich sichtbar über `push('system', …)`
        // (Begründung der Grenze: `state/kosmo-ui-werkzeuge.ts`).
        ...kosmoUiWerkzeuge((m) => push('system', m.text, m.art)),
      ],
      journal.toPromptBlock() + dossierPromptBlock() + rollePromptBlock(),
      // Kuratierte Werkzeug-Untermenge (Begründung: KOSMO_AUSGESCHLOSSENE_COMMANDS).
      { ohne: KOSMO_AUSGESCHLOSSENE_COMMANDS },
    );
    return s;
    // Session bewusst pro Provider-Konfiguration neu
  }, [settings]);

  // v0.6.8 («Kosmo sieht mit») — Test-Hooks (Playwright), Muster wie
  // `window.__kosmo`/`window.__kosmoViewport` (App.tsx/Viewport3D.tsx): rein
  // lesende Fenster in Laufzeit-Zustand, den es sonst nirgends im DOM zu
  // sehen gibt — der Ringpuffer (`e2e/kosmo-blick.spec.ts` Test 3, "nach
  // Stationswechsel enthält der Ringpuffer den vorherigen Blick") und die
  // tatsächliche `ChatSession`-Historie (Test 4, `ereignisse_lesen`-Resultat
  // ist sonst nur als generische ScriptedProvider-Quittierung sichtbar, nicht
  // als Werkzeug-Text selbst).
  useEffect(() => {
    (window as never as Record<string, unknown>)['__kosmoBlick'] = {
      ring: () => blickRingPuffer(),
    };
    (window as never as Record<string, unknown>)['__kosmoChat'] = {
      history: () => session.history,
    };
  }, [session]);

  // v0.6.9 Stream D: Escape schliesst die Vollbild-Vorschau — Muster
  // `CommandPalette.tsx` (`window.addEventListener('keydown', ...)`, prüft
  // `e.key === 'Escape'` UND ob überhaupt etwas offen ist).
  useEffect(() => {
    const schliesseEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && vollbildBlick) setVollbildBlick(null);
    };
    window.addEventListener('keydown', schliesseEsc);
    return () => window.removeEventListener('keydown', schliesseEsc);
  }, [vollbildBlick]);

  useEffect(() => {
    // Journal-Spiegel kann nach dem Modul-Import angekommen sein (P6-Review #1)
    void hydriereJournal().then(() => journal.reload());
    const { doc } = useProject.getState();
    const text = greeting(new Date(), doc.settings.projectName, {
      walls: doc.byKind('wall').length,
      storeys: doc.byKind('storey').length,
    });
    setBubbles([{ id: ++bubbleSeq.current, who: 'kosmo', text }]);
    // Erst-Zustand fürs Kosmo-Symbol: bis zur ersten echten Antwort zeigt das
    // Mini-Popup wenigstens die Begrüssung statt leer zu bleiben.
    useKosmoStatus.getState().setzeLetzteAktivitaet(kurzform(text));
    // K16 A6 (Entwurfs-Einstieg «Sprechen/Schreiben»): war das Öffnen dieses
    // Panels ein expliziter Fokus-Wunsch (Dock-Klick in KosmoDesign), landet
    // der Cursor sofort im Eingabefeld — derselbe einmalige Merker wie
    // `deep-link.ts`, hier konsumiert beim Mount (das Panel mountet frisch
    // bei jedem Öffnen, s. App.tsx `{kosmoOpen && <KosmoPanel …/>}`).
    if (consumeKosmoFokus()) eingabeRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [bubbles, cards]);

  // Lizenz prüfen (Serie I / Batch B6): beim Start und bei jeder Änderung des
  // Lizenztextes. Läuft NUR, wenn ein Public Key im Build steckt — sonst
  // dauerhaft 'keine-pflicht'. Das Ergebnis ist ein reiner Hinweis; die
  // lokale Arbeit bleibt in jedem Fall möglich (kein hartes Aussperren).
  useEffect(() => {
    const pubKey = lizenzPublicKey();
    if (!pubKey) {
      setLizenz({ status: 'keine-pflicht', text: '' });
      return;
    }
    let abgebrochen = false;
    const text = settings.lizenzText.trim();
    void (async () => {
      const ergebnis = text ? await verifiziereLizenz(text, pubKey, new Date()) : null;
      if (!abgebrochen) setLizenz(lizenzHinweis(true, ergebnis));
    })();
    return () => {
      abgebrochen = true;
    };
  }, [settings.lizenzText]);

  /**
   * Betriebsart wechseln (Owner «drei Versionen»): setzt Provider + alle
   * Dienst-Adressen (LLM/Bridge/Sync) kohärent. Standard=HomePC localhost,
   * Remote=VPN-Host, Cloud=Claude (mind. Opus 4.8, keine lokalen Dienste).
   */
  const wechsleBetriebsart = (art: Betriebsart, host?: string) => {
    const remoteHost = host ?? settings.remoteHost;
    const k = betriebKonfig({ betriebsart: art, remoteHost, cloudModell: settings.anthropicModel });
    const neu: KosmoSettings = {
      ...settings,
      betriebsart: art,
      remoteHost,
      provider: k.provider,
      ...(art !== 'cloud' ? { baseUrl: k.llmBaseUrl } : {}),
      ...(art === 'cloud' ? { anthropicModel: k.cloudModell } : {}),
    };
    speichere(neu);
    if (art !== 'cloud') {
      // Bridge (Render/STT/TTS) + Sync folgen dem HomePC-Host mit.
      localStorage.setItem('kosmo.bridge', k.bridgeUrl);
      localStorage.setItem('kosmo.sync.url', k.syncUrl);
    }
  };

  /**
   * Cloud-Fallback: HomeStation nicht erreichbar → «Mit Claude (Opus 4.8)
   * weiterarbeiten?». Mit Schlüssel sofort umschalten + die letzte Frage
   * nachsenden; ohne Schlüssel in die Einstellungen führen (kein alert).
   */
  const bieteCloudAn = async (text: string) => {
    if (cloudWechselLaeuft.current) return;
    cloudWechselLaeuft.current = true;
    try {
      const ok = await bestaetigen({
        titel: 'HomeStation nicht erreichbar',
        text: 'Kosmo erreicht das lokale Modell gerade nicht. Mit Claude Cloud (Opus 4.8) weiterarbeiten? Der Schlüssel bleibt auf diesem Gerät.',
        bestaetigen: 'Zu Claude wechseln',
      });
      if (!ok) return;
      const modell = betriebKonfig({ betriebsart: 'cloud', cloudModell: settingsRef.current.anthropicModel }).cloudModell;
      const neu: KosmoSettings = {
        ...settingsRef.current,
        betriebsart: 'cloud',
        provider: 'anthropic',
        anthropicModel: modell,
      };
      speichere(neu);
      // Angemeldet gilt sowohl mit Abo (OAuth-Token) als auch mit Schlüssel.
      const angemeldet =
        settingsRef.current.cloudAuth === 'abo'
          ? !!settingsRef.current.anthropicOauthToken.trim()
          : !!settingsRef.current.anthropicKey.trim();
      if (angemeldet) {
        if (text.trim()) nachSendText.current = text; // nach Session-Rebuild senden
        melde(`Auf Claude Cloud (${modell}) gewechselt.`, { ton: 'erfolg' });
      } else {
        setShowSettings(true);
        melde('Claude-Schlüssel in den Einstellungen eintragen, dann läuft Kosmo in der Cloud.', {
          ton: 'info',
          dauerMs: 7000,
        });
      }
    } finally {
      cloudWechselLaeuft.current = false;
    }
  };
  cloudAnRef.current = (text: string) => void bieteCloudAn(text);

  /**
   * «Mit Claude-Abo anmelden» (Owner-Auftrag Cloud-Login): ruft den
   * Desktop-Anmelde-Helfer (Tauri-Command `claude_login`) auf und hinterlegt
   * das zurückgegebene OAuth-Token. Im Web/PWA wirft `claudeAboAnmeldung`
   * bereits einen ehrlichen Fehler — hier landet er in `meldeFehler`, nie in
   * `alert`.
   */
  const mitClaudeAnmelden = async () => {
    try {
      const token = await claudeAboAnmeldung();
      setCliFehlt(false);
      speichere({ ...settingsRef.current, anthropicOauthToken: token, cloudAuth: 'abo' });
      melde('Mit dem Claude-Abo angemeldet.', { ton: 'erfolg' });
    } catch (err) {
      // Owner-Befund F1: «ant nicht gefunden» bekommt eine Anleitung im Panel
      // statt nur eines Toasts — andere Fehler (Login abgebrochen, Web/PWA)
      // bleiben beim bisherigen `meldeFehler`.
      if (istAntFehltFehler(err)) {
        setCliFehlt(true);
      } else {
        meldeFehler(err);
      }
    }
  };

  /**
   * v0.6.8 («Kosmo sieht mit», Owner-Nachtrag) — Auto-Blick: bei JEDER
   * gesendeten Nutzer-Nachricht (Tippen, Mikrofon, Cloud-Nachsenden) wird der
   * aktuelle Stations-Blick erfasst und — nur bei einem vision-fähigen
   * Provider — als Bild mitgeschickt. Ehrlichkeit vor Politur (Owner-Mandat):
   *  - Bild + vision-fähiger Provider → «Kosmo sieht: ‹Station›» + Thumbnail,
   *    Bild geht als `images` an `ChatSession.send()`.
   *  - Kein Bild ODER Provider kann nicht sehen → «Kosmo sieht nicht»/«Kosmo
   *    liest», der Text-Kontext hängt sichtbar benannt an der GESENDETEN
   *    Nachricht (nicht an der angezeigten `du`-Bubble — die zeigt weiter
   *    genau das, was der Mensch geschrieben/gesagt hat).
   *  - Toggle aus (`blickAn`-Effektivwert false) → unverändertes Verhalten,
   *    keine Blick-Zeile, kein zusätzliches Bild/Text.
   */
  const sendeMitBlick = async (text: string) => {
    const s = settingsRef.current;
    const blickEffektivAn = s.blickAn ?? istVisionFaehig(s.provider);
    if (!blickEffektivAn) {
      void session.send(text);
      return;
    }
    const station = erkenneAktiveStation();
    const blick: Blick | null = await blickErfassen(station);
    if (!blick) {
      // Zentrale/Speak — ehrlich nichts zu erfassen, unverändertes Senden.
      void session.send(text);
      return;
    }
    const bildVerstehbar = kannBildVerstehen(s.provider);
    if (blick.bild && bildVerstehbar) {
      const zusatz = ergaenzendeBilderAusRing(blick, 2);
      const bilder = [blick.bild, ...zusatz].map(({ mediaType, dataBase64 }) => ({ mediaType, dataBase64 }));
      pushBlick(
        `Kosmo sieht: ‹${blick.stationTitel}›`,
        `data:${blick.bild.mediaType};base64,${blick.bild.dataBase64}`,
        blick.zeit,
      );
      void session.send(text, bilder);
      return;
    }
    // Kein Bild (Text-Fallback-Station/Erfassung gescheitert) ODER der
    // aktuelle Provider kann kein Bild verstehen (Mock) — Text-Kontext
    // ANHÄNGEN, klar benannt, nie als Bild ausgegeben.
    const textKontext =
      blick.text ??
      `Station ${blick.stationTitel} — ein Bild wurde erfasst, aber vom aktuellen Modell (Demo-Modus) nicht mitgeschickt.`;
    pushBlick(
      bildVerstehbar
        ? `Kosmo liest: ‹${blick.stationTitel}› — kein Bild in dieser Station, Text-Kontext mitgesendet.`
        : `Kosmo sieht nicht (Demo-Modus ohne Bildverständnis) — Stationskontext ‹${blick.stationTitel}› geht als Text mit.`,
    );
    void session.send(`${text}\n\n[Kosmo-Blick — Stationskontext ${blick.stationTitel}, als Text angehängt]\n${textKontext}`);
  };

  // Nach dem Cloud-Wechsel die letzte Frage auf der neuen Session nachsenden.
  useEffect(() => {
    if (!nachSendText.current) return;
    const t = nachSendText.current;
    nachSendText.current = '';
    setBubbles((b) => [...b, { id: ++bubbleSeq.current, who: 'du', text: t }]);
    void sendeMitBlick(t);
  }, [session]);

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    // Letzte Frage merken: schlägt das lokale Modell fehl, wird genau sie nach
    // dem Cloud-Wechsel erneut gesendet.
    zuletztGefragt.current = text;
    setBubbles((b) => [...b, { id: ++bubbleSeq.current, who: 'du', text }]);
    void sendeMitBlick(text);
  };

  // KosmoSpeak: Push-to-Talk → Bridge-Whisper (Schweizerdeutsch);
  // ohne Bridge übernimmt die Browser-Spracherkennung (de-CH) — ehrlich
  // gekennzeichnet, die Whisper-Qualität kommt erst mit der HomeStation.
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const erkennungRef = useRef<BrowserSpeechRecognition | null>(null);
  const fallbackNotiert = useRef(false);
  // Doppelklick-Schutz: während der /health-Probe darf kein zweiter Start laufen
  const startetGerade = useRef(false);

  const starteBrowserStt = () => {
    const rec = browserSpeechRecognition();
    if (!rec) {
      setBubbles((b) => [
        ...b,
        {
          id: ++bubbleSeq.current,
          who: 'kosmo',
          text: '⚠ Keine Bridge erreichbar und dieser Browser kennt keine Spracherkennung — Speak-to-Kosmo braucht eines von beidem.',
        },
      ]);
      return;
    }
    rec.lang = 'de-CH';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = Array.from({ length: e.results.length }, (_, i) => e.results[i]?.[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (text) {
        setBubbles((b) => [...b, { id: ++bubbleSeq.current, who: 'du', text: `🎙 ${text}` }]);
        void sendeMitBlick(text);
      }
    };
    rec.onend = () => {
      setRecording(false);
      erkennungRef.current = null;
      // v0.7.2 §6 (Mic-Aufnahme→listening): «stoppt sofort bei Input» — hier
      // endet die Aufnahme selbst (Nutzer losgelassen/Timeout); ein direkt
      // anschliessendes `sendeMitBlick` (oben, `rec.onresult`) überschreibt
      // 'listening' ohnehin sofort mit 'thinking' (`onBusy(true)`).
      if (useKosmoStatus.getState().zustand === 'listening') useKosmoStatus.getState().setzeZustand('idle');
    };
    rec.onerror = (e) => {
      if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') {
        setBubbles((b) => [
          ...b,
          { id: ++bubbleSeq.current, who: 'kosmo', text: `⚠ Browser-Spracherkennung: ${e.error}` },
        ]);
      }
    };
    erkennungRef.current = rec;
    rec.start();
    setRecording(true);
    useKosmoStatus.getState().setzeZustand('listening');
    if (!fallbackNotiert.current) {
      fallbackNotiert.current = true;
      melde('Browser-Spracherkennung aktiv — die Schweizerdeutsch-Qualität kommt über die HomeStation-Bridge.', { ton: 'info' });
    }
  };

  const toggleMic = async () => {
    if (recording) {
      recorderRef.current?.stop();
      erkennungRef.current?.stop();
      return;
    }
    if (startetGerade.current) return;
    startetGerade.current = true;
    const bridgeUrl = (localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600').replace(/\/$/, '');
    if (!(await bridgeErreichbar(bridgeUrl))) {
      startetGerade.current = false;
      starteBrowserStt();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const parts: Blob[] = [];
      rec.ondataavailable = (e) => parts.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        // v0.7.2 §6: Aufnahme beendet — `sendeMitBlick` weiter unten (bei
        // erkanntem Text) übernimmt sofort mit 'thinking' (`onBusy(true)`).
        if (useKosmoStatus.getState().zustand === 'listening') useKosmoStatus.getState().setzeZustand('idle');
        const audio = new Blob(parts, { type: rec.mimeType });
        const bridge = (localStorage.getItem('kosmo.bridge') ?? 'http://localhost:8600').replace(/\/$/, '');
        try {
          const form = new FormData();
          form.append('audio', audio, 'aufnahme.webm');
          const res = await fetch(`${bridge}/stt`, { method: 'POST', body: form });
          if (!res.ok) throw new Error(`STT ${res.status}`);
          const { text } = (await res.json()) as { text: string };
          if (text) {
            setBubbles((b) => [...b, { id: ++bubbleSeq.current, who: 'du', text: `🎙 ${text}` }]);
            void sendeMitBlick(text);
          }
        } catch (err) {
          setBubbles((b) => [
            ...b,
            {
              id: ++bubbleSeq.current,
              who: 'kosmo',
              text: `⚠ Speak-to-Kosmo braucht die Bridge (${bridge}/stt): ${err instanceof Error ? err.message : err}`,
            },
          ]);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      useKosmoStatus.getState().setzeZustand('listening');
    } catch {
      setBubbles((b) => [
        ...b,
        { id: ++bubbleSeq.current, who: 'kosmo', text: '⚠ Kein Mikrofonzugriff.' },
      ]);
    } finally {
      startetGerade.current = false;
    }
  };

  const applyCard = (card: PendingCard) => {
    // v0.7.2 §6 (applyPaket/Auftrag-Übergabe→dispatching): die Übergabe an
    // `runCommand` ist der Moment, in dem Kosmo den Vorschlag «losschickt».
    useKosmoStatus.getState().setzeZustand('dispatching');
    try {
      const result = runCommand(card.commandId, card.params, { actor: 'kosmo' });
      setCards((c) => c.map((x) => (x.callId === card.callId ? { ...x, state: 'angewendet' } : x)));
      void session.resolveApplied(card.callId, result.summary);
      useKosmoStatus.getState().setzeZustand('done');
    } catch (err) {
      const meldung = err instanceof Error ? err.message : 'Ausführung fehlgeschlagen';
      // H-28 (`docs/SIM-BEFUNDE.md`): ein gescheitertes Anwenden hinterliess
      // bisher KEINE sichtbare Spur — nur der Karten-State wechselte lautlos
      // auf 'abgelehnt'. Jetzt zusätzlich: eine bleibende Kosmo-Bubble
      // (Muster der Mikrofon-/STT-Fehlerbubbles oben) UND der Fehlertext an
      // der Karte selbst (`fehler`, gerendert als `diff-karte-fehler` unten).
      setCards((c) =>
        c.map((x) => (x.callId === card.callId ? { ...x, state: 'abgelehnt', fehler: meldung } : x)),
      );
      push('kosmo', `⚠ Anwenden fehlgeschlagen: ${meldung}`);
      void session.resolveRejected(card.callId, meldung);
      useKosmoStatus.getState().setzeZustand('error');
    }
  };
  // Muster `cloudAnRef` (s. oben): jede Zeile hier aktualisiert die
  // Vorwärtsreferenz auf den JEWEILS aktuellen `applyCard`-Funktionswert.
  applyCardRef.current = applyCard;

  const rejectCard = (card: PendingCard) => {
    setCards((c) => c.map((x) => (x.callId === card.callId ? { ...x, state: 'abgelehnt' } : x)));
    void session.resolveRejected(card.callId);
  };

  /**
   * Paket-Zusammenfassung («Kosmo schlägt N Schritte vor: 4× Wand, 2× …») —
   * aggregiert über das FÜHRENDE Wort jedes Karten-`summary`-Texts. Die
   * `summarize()`-Texte der Commands beginnen durchgehend mit dem
   * Objektnamen (z.B. «Wand 4,00 m», «Decke mit 4 Eckpunkten…», «Fenster
   * 1200×1400…», siehe `packages/kosmo-kernel/src/commands/design.ts`) —
   * kein neuer Vertrag, nur eine Lesart des bereits vorhandenen Texts.
   */
  const paketZusammenfassungsZeile = (schritte: PendingCard[]): string => {
    const zaehlung = new Map<string, number>();
    for (const c of schritte) {
      const stichwort = c.summary.trim().split(/\s+/)[0] || c.commandId;
      zaehlung.set(stichwort, (zaehlung.get(stichwort) ?? 0) + 1);
    }
    const teile = [...zaehlung.entries()].map(([wort, n]) => `${n}× ${wort}`);
    return `Kosmo schlägt ${schritte.length} Schritte vor: ${teile.join(', ')}`;
  };

  /** «$neu:N» in den Parametern durch die Id des N-ten Paket-Schritts ersetzen. */
  const ersetzeNeuIds = (params: unknown, neuIds: string[]): unknown => {
    if (typeof params === 'string') {
      const m = params.match(/^\$neu:(\d+)$/);
      return m ? (neuIds[Number(m[1])] ?? params) : params;
    }
    if (Array.isArray(params)) return params.map((x) => ersetzeNeuIds(x, neuIds));
    if (params && typeof params === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(params)) out[k] = ersetzeNeuIds(v, neuIds);
      return out;
    }
    return params;
  };

  /** Aktionskette: alle Schritte in EINER Undo-Gruppe; Teilfehler rollen zurück. */
  const applyPaket = async (paketId: string) => {
    const schritte = cards
      .filter((c) => c.paket?.id === paketId && c.state === 'offen')
      .sort((a, b) => (a.paket!.index ?? 0) - (b.paket!.index ?? 0));
    if (schritte.length === 0) return;
    // v0.7.4 Welle 3 P9 (Owner-Entscheid «Grosses Paket»): der Vollbild-
    // Takeover-Rahmen (`KosmoOrb` zustand==='takeover', bereits seit einer
    // früheren Welle vorhanden) löst NUR aus, wenn Kosmo autonom ein
    // GROSSES Paket anwendet (≥ SCHWELLE_GROSSES_PAKET Schritte) — kleine
    // Pakete (<8) verhalten sich exakt wie heute, keine Änderung.
    const grosses = schritte.length >= SCHWELLE_GROSSES_PAKET;
    // Globaler ESC-Handler NUR für die Dauer der sichtbaren Übernahme
    // (sauber abgemeldet im `finally` unten). EHRLICHKEIT (hart, s. Commit):
    // der Apply ist atomar und findet gemäss dem Vertrag der Abspiel-Ebene
    // («das Vorspiel kann den Apply nur verzögern, nie verhindern»,
    // `state/abspiel-anschluss.ts`) IMMER statt — ESC beendet NUR die
    // SICHTBARE Übernahme (den Vollbild-Rahmen), NICHT die Anwendung selbst.
    // Ein separates, bereits bestehendes ESC (`KosmoZeichnet.tsx`, capture-
    // Phase) stoppt zusätzlich ein laufendes Vorspiel — unabhängig davon
    // endet der Rahmen hier so oder so sofort, sobald ESC fällt.
    let aufEsc: ((e: KeyboardEvent) => void) | null = null;
    if (grosses) {
      useKosmoStatus.getState().setzeZustand('takeover');
      aufEsc = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;
        // Abbruch-Flag der SICHTBAREN Übernahme: nur wenn wir aktuell noch
        // im Rahmen stehen (Mehrfach-ESC/late-fire harmlos, `setzeZustand`
        // ist idempotent-sicher über den Store).
        if (useKosmoStatus.getState().zustand === 'takeover') {
          useKosmoStatus.getState().setzeZustand('dispatching');
        }
      };
      window.addEventListener('keydown', aufEsc, true);
    }
    try {
      // v0.7.2 §7/§12 («Kosmo zeichnet sichtbar», Stufe 1): das Overlay-
      // Vorspiel wird AWAITED — erst wenn es fertig (oder sofort, wenn nichts
      // registriert/ESC/webdriver/reduced-motion) ist, läuft der unveränderte
      // atomare Apply unten. Prop hat Vorrang (Tests), sonst der registrier-
      // bare Anschluss aus `state/abspiel-anschluss.ts` (Stream W3-E).
      const vorspiel = onAbspielStart ? onAbspielStart(schritte) : abspielVorspiel(schritte);
      if (vorspiel) await vorspiel;
      // v0.7.2 §6 (applyPaket→dispatching): die ganze Kette gilt als EIN
      // «Losschicken» — «Wusch» begleitet den Start, falls Sounds an sind.
      // Bei einem grossen Paket verlässt dies spätestens hier den
      // 'takeover'-Zustand (der Rahmen blendet aus) — unabhängig davon, ob
      // ESC vorher schon gedrückt wurde (dann war er es schon vorher).
      useKosmoStatus.getState().setzeZustand('dispatching');
      wusch();
      const { history, undo } = useProject.getState();
      const neuIds: string[] = [];
      const ergebnisse: string[] = [];
      history.beginGroup();
      let fehler: string | null = null;
      try {
        for (const schritt of schritte) {
          const params = ersetzeNeuIds(schritt.params, neuIds);
          const result = runCommand(schritt.commandId, params, { actor: 'kosmo' });
          neuIds.push((result.patches[0] as { id?: string } | undefined)?.id ?? '');
          ergebnisse.push(result.summary);
        }
      } catch (err) {
        fehler = err instanceof Error ? err.message : String(err);
      } finally {
        history.endGroup();
      }
      if (fehler) {
        undo(); // Teilstand zurückrollen — Paket ist atomar
        setCards((c) => c.map((x) => (x.paket?.id === paketId ? { ...x, state: 'abgelehnt' } : x)));
        for (const schritt of schritte) {
          await session.resolveRejected(schritt.callId, `Paket abgebrochen: ${fehler}`);
        }
        useKosmoStatus.getState().setzeZustand('error');
        return;
      }
      setCards((c) => c.map((x) => (x.paket?.id === paketId ? { ...x, state: 'angewendet' } : x)));
      for (let i = 0; i < schritte.length; i++) {
        await session.resolveApplied(schritte[i]!.callId, ergebnisse[i]!);
      }
      useKosmoStatus.getState().setzeZustand('done');
    } finally {
      if (aufEsc) window.removeEventListener('keydown', aufEsc, true);
    }
  };

  const rejectPaket = async (paketId: string) => {
    const schritte = cards.filter((c) => c.paket?.id === paketId && c.state === 'offen');
    setCards((c) => c.map((x) => (x.paket?.id === paketId ? { ...x, state: 'abgelehnt' } : x)));
    for (const schritt of schritte) await session.resolveRejected(schritt.callId);
  };

  return (
    <aside
      data-testid="kosmo-panel"
      // v0.6.6 Stream E — Motion-Politur (MOTION-KONZEPT §4): Feder-Eintritt
      // beim Erstaufbau, schneller Austritt sobald `handleClose()` ihn
      // einleitet (s. State oben) — rein additive Klassen, keine Struktur.
      className={schliessend ? 'k-panel-austritt' : 'k-panel-eintritt'}
      style={{
        width: 340,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--k-line)',
        background: 'var(--k-surface)',
      }}
    >
      {showSetup && (
        <WerkzeugSetup betriebsart={settings.betriebsart} onClose={() => setShowSetup(false)} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        <OrbitMark module="kosmo" size={24} />
        <div style={{ fontWeight: 550 }}>Kosmo</div>
        {/* Kritik 0.6.8 (Runde 1, Shot 04): der ScriptedProvider zeigte das
            konfigurierte Ollama-Modell — ehrlich «Skript» statt Fremd-Label. */}
        <Badge hue={settings.provider === 'mock' || settings.provider === 'scripted' ? 'var(--k-warning)' : moduleHue.kosmo}>
          {settings.provider === 'mock'
            ? 'Demo'
            : settings.provider === 'scripted'
              ? 'Skript'
              : settings.provider === 'anthropic'
                ? settings.anthropicModel
                : settings.provider === 'lmstudio'
                  ? settings.lmModel
                  : settings.model}
        </Badge>
        {(lizenz.status === 'fehlt' || lizenz.status === 'abgelaufen' || lizenz.status === 'ungueltig') && (
          <span data-testid="lizenz-badge" title={lizenz.text}>
            <Badge hue="var(--k-warning)">
              {lizenz.status === 'abgelaufen' ? 'Lizenz abgelaufen' : lizenz.status === 'ungueltig' ? 'Lizenz ungültig' : 'Lizenz fehlt'}
            </Badge>
          </span>
        )}
        <div style={{ flex: 1 }} />
        <KButton size="sm" tone="ghost" onClick={() => setShowSettings(!showSettings)} aria-label="Einstellungen">
          <KIcon name="zahnrad" size={16} />
        </KButton>
        <KButton
          size="sm"
          tone="ghost"
          onClick={handleClose}
          aria-label="Schliessen"
          data-testid="kosmo-panel-schliessen"
        >
          <KIcon name="schliessen" size={16} />
        </KButton>
      </div>
      <Hairline />

      {showSettings && (
        <div style={{ padding: 14, display: 'grid', gap: 8, borderBottom: '1px solid var(--k-line)' }}>
          <div style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>Betriebsart</div>
          <div data-testid="betriebsart" style={{ display: 'flex', gap: 4 }}>
            {([
              ['standard', 'Standard', 'HomePC — volle Leistung, alle Werkzeuge lokal'],
              ['remote', 'Remote', 'VPN-Client auf den HomePC'],
              ['cloud', 'Cloud', 'Claude (Opus 4.8), wenn der HomePC aus ist'],
            ] as [Betriebsart, string, string][]).map(([art, label, titel]) => (
              <KButton
                key={art}
                size="sm"
                tone={settings.betriebsart === art ? 'accent' : 'ghost'}
                data-testid={`betriebsart-${art}`}
                title={titel}
                onClick={() => wechsleBetriebsart(art)}
                style={{ flex: 1 }}
              >
                {label}
              </KButton>
            ))}
          </div>
          {settings.betriebsart === 'remote' && (
            <SettingsFeld
              label="HomePC-Adresse (VPN, IP oder Name)"
              value={settings.remoteHost}
              onChange={(v) => wechsleBetriebsart('remote', v)}
            />
          )}
          {settings.betriebsart === 'cloud' && (
            <div style={{ fontSize: 11.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>
              Voll über Claude (mind. Opus 4.8). Renders/Whisper laufen als
              Browser-Fallback — die HomeStation-Qualität kommt erst am HomePC.
            </div>
          )}
          <KButton
            size="sm"
            tone="ghost"
            data-testid="werkzeuge-oeffnen"
            onClick={() => setShowSetup(true)}
          >
            Werkzeuge einrichten …
          </KButton>
          {/* v0.7.8 Welle D (PD2) — ein `commandId` hat weiterhin KEIN
              zuverlässiges «Job fertig»-Ereignis (s. `governance-speicher.ts`-
              Kopfkommentar «AUTOMATISCH» → `'command'`) — statt das
              vorzutäuschen, gibt es hier den EXPLIZITEN Sammel-Weg: der
              Nutzer selbst erklärt den Auftrag für beendet. Nur sichtbar,
              wenn mindestens eine `'command'`-Erlaubnis aktiv ist (sonst gäbe
              es nichts zu widerrufen). */}
          {autoErlaubt.size > 0 && (
            <>
              <Hairline />
              <div style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>Governance</div>
              <div style={{ fontSize: 11.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>
                {autoErlaubt.size} Command{autoErlaubt.size === 1 ? '' : 's'}{' '}
                {autoErlaubt.size === 1 ? 'läuft' : 'laufen'} aktuell automatisch durch
                («Für den Job erlauben»). Ein Command-Typ hat kein eigenes «fertig»-
                Ereignis — darum endet das hier nur gesammelt oder einzeln über den
                «… · widerrufen»-Knopf am jeweiligen Vorschlag.
              </div>
              <KButton
                size="sm"
                tone="ghost"
                data-testid="governance-auftrag-beendet"
                onClick={() => {
                  alleWiderrufen('command');
                  setAutoErlaubt(new Set());
                  push('system', 'Auftrag beendet — alle Job-Freigaben widerrufen.', 'auftrag-beendet');
                }}
              >
                Auftrag beendet — alle Job-Freigaben widerrufen
              </KButton>
            </>
          )}
          <Hairline />
          <label style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>
            Verbindung
            <KSelect
              size="sm"
              value={settings.provider}
              // v0.6.9: eigenes testid — E2E fand dieses Select früher über
              // `option[value="anthropic"]`, die Optionen liegen beim
              // Custom-Dropdown aber nur noch im Popup (module.spec.ts).
              data-testid="verbindung-select"
              onChange={(e) => {
                const s = { ...settings, provider: e.target.value as KosmoSettings['provider'] };
                setSettings(s);
                localStorage.setItem('kosmo.llm', JSON.stringify(s));
              }}
              style={{ display: 'block', width: '100%', marginTop: 4 }}
            >
              <option value="ollama">Ollama (HomeStation)</option>
              <option value="lmstudio">LM Studio (HomeStation)</option>
              <option value="anthropic">Anthropic (Claude, Cloud)</option>
              <option value="mock">Demo-Modus (ohne LLM)</option>
            </KSelect>
          </label>
          {settings.provider === 'ollama' && (
            <>
              <SettingsFeld
                label="Ollama-URL"
                value={settings.baseUrl}
                onChange={(v) => speichere({ ...settings, baseUrl: v })}
              />
              <SettingsFeld
                label="Modell"
                value={settings.model}
                onChange={(v) => speichere({ ...settings, model: v })}
              />
            </>
          )}
          {settings.provider === 'lmstudio' && (
            <>
              <SettingsFeld
                label="LM-Studio-URL"
                value={settings.lmBaseUrl}
                onChange={(v) => speichere({ ...settings, lmBaseUrl: v })}
              />
              <SettingsFeld
                label="Modell"
                value={settings.lmModel}
                onChange={(v) => speichere({ ...settings, lmModel: v })}
              />
            </>
          )}
          {settings.provider === 'anthropic' && (
            <>
              <div style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>
                Cloud-Anmeldung —{' '}
                <span data-testid="cloud-login-status" style={{ color: 'var(--k-ink)' }}>
                  {settings.cloudAuth === 'abo' && settings.anthropicOauthToken.trim()
                    ? 'angemeldet als Abo'
                    : settings.anthropicKey.trim()
                      ? 'API-Schlüssel hinterlegt'
                      : 'nicht angemeldet'}
                </span>
              </div>
              {istTauriDesktop() ? (
                <KButton
                  size="sm"
                  tone={settings.cloudAuth === 'abo' ? 'accent' : 'ghost'}
                  data-testid="cloud-login-abo"
                  onClick={() => void mitClaudeAnmelden()}
                >
                  Mit Claude-Abo anmelden
                </KButton>
              ) : (
                <div
                  data-testid="cloud-login-hinweis"
                  style={{ fontSize: 11.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}
                >
                  Mit-Claude-Anmeldung nur in der Desktop-App — im Browser bitte API-Schlüssel.
                </div>
              )}
              {settings.cloudAuth === 'abo' && settings.anthropicOauthToken.trim() && (
                // v0.7.1 Stream 5B (Befund aus Stream 2A): der bisher fehlende
                // Abmelden-Knopf — löscht NUR das OAuth-Token (`mitAbmeldung`,
                // `./cloud-login`), lässt den API-Schlüssel unangetastet.
                <KButton
                  size="sm"
                  tone="ghost"
                  data-testid="oauth-abmelden"
                  onClick={() => speichere(mitAbmeldung(settings))}
                >
                  Abmelden
                </KButton>
              )}
              {cliFehlt && (
                <div
                  data-testid="cloud-login-anleitung"
                  style={{
                    fontSize: 11.5,
                    color: 'var(--k-ink-soft)',
                    lineHeight: 1.5,
                    display: 'grid',
                    gap: 4,
                    padding: '8px 10px',
                    borderRadius: 'var(--k-radius-sm)',
                    border: '1px solid var(--k-line)',
                    background: 'var(--k-raised)',
                  }}
                >
                  <div>
                    Die Anthropic-CLI (<code>ant</code>) fehlt lokal — sie ist das Werkzeug, über das
                    die Abo-Anmeldung läuft (derselbe Weg wie bei Claude Code).
                  </div>
                  <div>
                    Installieren: <code>{ANT_INSTALL_BEFEHL}</code> (oder die Anthropic-Dokumentation
                    unter platform.claude.com) — danach «Mit Claude-Abo anmelden» erneut versuchen.
                  </div>
                  <div>
                    Gleichwertige Alternative ohne CLI: den API-Schlüssel direkt unten eintragen.
                  </div>
                </div>
              )}
              <SettingsFeld
                label="API-Schlüssel (bleibt auf diesem Gerät)"
                value={settings.anthropicKey}
                typ="password"
                onChange={(v) => speichere(mitApiSchluessel(settings, v))}
              />
              <label style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>
                Modell
                <KSelect
                  size="sm"
                  data-testid="claude-modell-select"
                  value={modellFreitext ? 'freitext' : settings.anthropicModel}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'freitext') {
                      setModellFreitext(true);
                    } else {
                      setModellFreitext(false);
                      speichere({ ...settings, anthropicModel: v });
                    }
                  }}
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                >
                  {ANTHROPIC_MODELLE.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                  <option value="freitext">Eigenes Modell (Freitext) …</option>
                </KSelect>
              </label>
              {modellFreitext && (
                <SettingsFeld
                  label="Modell-ID (Freitext)"
                  value={settings.anthropicModel}
                  onChange={(v) => speichere({ ...settings, anthropicModel: v })}
                />
              )}
            </>
          )}
          <label style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              data-testid="tts-toggle"
              checked={ttsOn}
              onChange={(e) => {
                setTtsOn(e.target.checked);
                localStorage.setItem('kosmo.tts', e.target.checked ? '1' : '0');
              }}
            />
            Antworten vorlesen (Stimme über die HomeStation-Bridge)
          </label>
          <label style={{ fontSize: 12.5, color: 'var(--k-ink-soft)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              data-testid="blick-toggle"
              checked={settings.blickAn ?? istVisionFaehig(settings.provider)}
              onChange={(e) => speichere({ ...settings, blickAn: e.target.checked })}
            />
            Kosmo sieht mit (aktuelle Station als Bild an jede Nachricht anhängen)
          </label>
          {/* v0.7.1 E1/2A («Blick-Cloud-UI»): Kosten-/Grössen-Hinweis — NUR in
              Betriebsart cloud, weil dort das Bild tatsächlich das Haus
              verlässt (Anthropic-API). HomePC/Remote bleiben unverändert. */}
          {settings.betriebsart === 'cloud' && (
            <div data-testid="kosmo-blick-cloud-hinweis" style={{ fontSize: 11, color: 'var(--k-ink-faint)' }}>
              Blick geht als Bild an Claude (Cloud) — verkleinert auf ~1 MP
            </div>
          )}
          {/* v0.6.9 Stream D: Ringpuffer-Anzeige — die letzten ≤3 erfassten
              Blicke (`blickRingPuffer()`, state/kosmo-blick.ts), als Mini-
              Thumbnails mit Station+Zeit. Reine Anzeige (kein eigener
              Zustand nötig): der Ring lebt im Modul-Scope von kosmo-blick.ts,
              ein Re-Render von KosmoPanel (z.B. nach jedem neuen Blick via
              `pushBlick`/`setBubbles`) liest hier den jeweils aktuellen
              Stand. Text-Blicke (kein `bild`) bekommen einen Platzhalter
              statt eines erfundenen Bilds. */}
          {blickRingPuffer().length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--k-ink-faint)' }}>Kosmos letzte Blicke</span>
              <div data-testid="kosmo-blick-ring" style={{ display: 'flex', gap: 8 }}>
                {blickRingPuffer()
                  .slice(-3)
                  .map((b) => (
                    <div
                      key={b.zeit}
                      data-testid="kosmo-blick-ring-eintrag"
                      title={`${b.stationTitel} — erfasst ${formatiereZeit(b.zeit)}`}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 52 }}
                    >
                      {b.bild ? (
                        <img
                          src={`data:${b.bild.mediaType};base64,${b.bild.dataBase64}`}
                          alt=""
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--k-line-strong)' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 6,
                            border: '1px dashed var(--k-line-strong)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 9,
                            color: 'var(--k-ink-faint)',
                          }}
                        >
                          Text
                        </div>
                      )}
                      <span style={{ fontSize: 9, color: 'var(--k-ink-faint)', textAlign: 'center', lineHeight: 1.2 }}>
                        {b.stationTitel}
                        <br />
                        {formatiereZeit(b.zeit)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
          <KButton
            size="sm"
            tone="ghost"
            data-testid="journal-export"
            onClick={() => {
              const jsonl = journal.toJsonl();
              if (!jsonl) return;
              const url = URL.createObjectURL(new Blob([jsonl], { type: 'application/jsonl' }));
              const a = document.createElement('a');
              a.href = url;
              a.download = `kosmo-lernjournal-${new Date().toISOString().slice(0, 10)}.jsonl`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 10_000);
            }}
          >
            Lernjournal exportieren (JSONL fürs LoRA-Training)
          </KButton>
          {lizenzPublicKey() && (
            <>
              <Hairline />
              <div style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>
                Lizenz —{' '}
                <span data-testid="lizenz-status" style={{ color: 'var(--k-ink)' }}>
                  {lizenz.status === 'gueltig'
                    ? 'gültig'
                    : lizenz.status === 'abgelaufen'
                      ? 'abgelaufen'
                      : lizenz.status === 'ungueltig'
                        ? 'ungültig'
                        : 'fehlt'}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--k-ink-soft)', lineHeight: 1.5 }}>
                {lizenz.status === 'gueltig'
                  ? 'Cloud/Sync/Render sind freigeschaltet.'
                  : 'Cloud/Sync/Render brauchen eine gültige Lizenz — die lokale Arbeit bleibt in jedem Fall möglich.'}
              </div>
              <SettingsFeld
                label="Lizenz-Text (bleibt auf diesem Gerät)"
                value={settings.lizenzText}
                onChange={(v) => speichere({ ...settings, lizenzText: v.trim() })}
              />
            </>
          )}
          <Hairline />
          <DiagnosePanel />
        </div>
      )}

      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: 14, display: 'grid', gap: 10, alignContent: 'start' }}>
        {bubbles.map((b) => {
          // v0.6.8 («Kosmo sieht mit»): die Auto-Blick-Zeile — dieselbe
          // dezente Form wie die ui.*-Zeilen unten, aber mit eigenem testid
          // (kein ui.*-Befehl) und optionalem Mini-Thumbnail des erfassten
          // Stations-Blicks (nur wenn wirklich ein Bild mitging).
          if (b.who === 'system' && b.testidSuffix === 'blick') {
            return (
              <div
                key={b.id}
                data-testid="kosmo-blick-zeile"
                className="k-einblenden"
                style={{
                  justifySelf: 'center',
                  maxWidth: '92%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 11px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  lineHeight: 1.4,
                  textAlign: 'center',
                  color: 'var(--k-ink-faint)',
                  background: 'var(--k-raised)',
                  border: '1px solid var(--k-line)',
                }}
              >
                {b.blickBild && (
                  <img
                    src={b.blickBild}
                    alt="Kosmos erfasster Blick — anklicken für die Vollbild-Vorschau"
                    data-testid="kosmo-blick-thumbnail"
                    onClick={() =>
                      setVollbildBlick({ dataUrl: b.blickBild!, zeit: b.blickZeit ?? b.id, text: b.text })
                    }
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      objectFit: 'cover',
                      border: '1px solid var(--k-line-strong)',
                      cursor: 'pointer',
                    }}
                  />
                )}
                <span>{b.text}</span>
              </div>
            );
          }
          // v0.6.6 Stream E — sichtbare Ehrlichkeit der ui.*-Brücke: eine
          // eigene, dezente Zeile statt einer Sprechblase (Konzept §5/§6),
          // testid kosmo-ui-aktion-* pro Befehlsart.
          if (b.who === 'system') {
            return (
              <div
                key={b.id}
                data-testid={`kosmo-ui-aktion-${b.testidSuffix ?? 'aktion'}`}
                className="k-einblenden"
                style={{
                  justifySelf: 'center',
                  maxWidth: '92%',
                  padding: '4px 11px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  lineHeight: 1.4,
                  textAlign: 'center',
                  color: 'var(--k-ink-faint)',
                  background: 'var(--k-raised)',
                  border: '1px solid var(--k-line)',
                }}
              >
                {b.text}
              </div>
            );
          }
          // Zitierte Belege dieser Antwort → Chips mit Quellensprung
          const marken =
            b.who === 'kosmo'
              ? [...new Set([...b.text.matchAll(/\[Q(\d+)\]/g)].map((m) => Number(m[1])))].filter((n) =>
                  quellenMap.current.has(n),
                )
              : [];
          return (
          <div
            key={b.id}
            className="k-einblenden"
            style={{
              justifySelf: b.who === 'du' ? 'end' : 'start',
              maxWidth: '88%',
              padding: '8px 12px',
              borderRadius: 12,
              fontSize: 13.5,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              background: b.who === 'du' ? 'var(--k-accent-wash)' : 'var(--k-raised)',
              border: '1px solid var(--k-line)',
            }}
          >
            {b.text}
            {marken.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {marken.map((n) => {
                  const ref = quellenMap.current.get(n)!;
                  return (
                    <button
                      key={n}
                      className="k-druck"
                      data-testid="quelle-chip"
                      title={`${ref.text.slice(0, 180)}${ref.text.length > 180 ? ' …' : ''}`}
                      onClick={() => {
                        useQuellen.getState().springe(ref);
                        // D1 (KosmoData-Dach): Referenz/Asset springen über die bestehenden
                        // sessionStorage-Brücken (wie DataWorkspace/AssetWorkspace es auch
                        // untereinander tun), Wissen/Journal/Dossier über den Quellen-Store.
                        if (ref.typ === 'referenz' && ref.docId) {
                          try {
                            sessionStorage.setItem('kosmo.data.openRef', ref.docId);
                          } catch {
                            /* privates Fenster — kein Sprung, kein Absturz */
                          }
                        } else if (ref.typ === 'asset' && ref.docId) {
                          try {
                            sessionStorage.setItem('kosmo.asset.openId', ref.docId);
                          } catch {
                            /* privates Fenster — kein Sprung, kein Absturz */
                          }
                        }
                        const ziel =
                          ref.typ === 'journal' ? 'train' : ref.typ === 'referenz' ? 'data' : ref.typ === 'asset' ? 'asset' : 'prepare';
                        (window as never as { __kosmo?: { open: (s: string) => void } }).__kosmo?.open(ziel);
                      }}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontFamily: 'var(--k-font-mono)',
                        padding: '2px 8px',
                        borderRadius: 'var(--k-radius-sm)',
                        border: '1px solid var(--k-line-strong)',
                        background: 'var(--k-surface)',
                        color: 'var(--k-ink-soft)',
                      }}
                    >
                      Q{n} · {ref.titel}
                    </button>
                  );
                })}
              </div>
            )}
            {b.who === 'kosmo' && !b.text.startsWith('⚠') && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6, opacity: b.feedback ? 1 : 0.55 }}>
                {(['gut', 'schlecht'] as const).map((f) => (
                  <button
                    key={f}
                    className="k-druck"
                    aria-label={f === 'gut' ? 'Hilfreich' : 'Nicht hilfreich'}
                    data-testid={`fb-${f}`}
                    onClick={() => {
                      journal.add({ sentiment: f, context: b.text });
                      setBubbles((all) => all.map((x) => (x.id === b.id ? { ...x, feedback: f } : x)));
                    }}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: '1px 6px',
                      borderRadius: 6,
                      background: b.feedback === f ? 'var(--k-accent-wash)' : 'transparent',
                    }}
                  >
                    <KIcon name={f === 'gut' ? 'daumen-hoch' : 'daumen-runter'} size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>
          );
        })}

        {/* Aktionsketten: ein Paket = eine Karte */}
        {[...new Set(cards.filter((c) => c.paket && c.state !== 'abgelehnt').map((c) => c.paket!.id))].map((pid) => {
          const schritte = cards
            .filter((c) => c.paket?.id === pid && c.state !== 'abgelehnt')
            .sort((a, b) => a.paket!.index - b.paket!.index);
          if (schritte.length === 0) return null;
          const offen = schritte.some((c) => c.state === 'offen');
          return (
            <div key={pid} style={{ display: 'grid', gap: 6 }}>
              {/* Paket-Zusammenfassung (Aufgabe 3): nur ab N≥2 — bei EINEM
                  Paket immer der Fall (chat.ts vergibt `paket` nur, wenn ein
                  Zug mehr als einen schreibenden Tool-Call enthielt), die
                  Bedingung bleibt trotzdem explizit statt implizit. */}
              {schritte.length >= 2 && (
                <div
                  data-testid="diff-paket-zusammenfassung"
                  style={{ fontSize: 12, color: 'var(--k-ink-soft)', padding: '0 2px' }}
                >
                  {paketZusammenfassungsZeile(schritte)}
                </div>
              )}
              <div
                data-testid="paket-card"
                style={{
                  border: `1px solid ${offen ? 'var(--k-accent)' : 'var(--k-success)'}`,
                  borderRadius: 10,
                  padding: 10,
                  display: 'grid',
                  gap: 8,
                  background: 'var(--k-raised)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--k-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Aktionskette — {schritte.length} Schritte
                  </div>
                  {/* v0.7.6 Welle 2: Risk-Level NUR, weil hier real ableitbar
                      — dieselbe Schwelle (`SCHWELLE_GROSSES_PAKET`=8), die
                      bereits den Vollbild-Takeover auslöst (s. `applyPaket`
                      oben). Keine erfundene Einstufung, keine graduelle
                      GovernanceGate hier: ein Paket hat keine wiederkehrende
                      Identität, an der «Für den Job erlauben» ehrlich
                      andocken könnte (s. `GovernanceGate.tsx`-Kopfkommentar) —
                      die bestehenden Alle-anwenden/Ablehnen-Knöpfe bleiben
                      darum unverändert. */}
                  <RisikoPill
                    risiko={
                      schritte.length >= SCHWELLE_GROSSES_PAKET
                        ? { label: `${schritte.length} Schritte · Übernahme`, ton: 'hoch' }
                        : schritte.length >= 4
                          ? { label: `${schritte.length} Schritte`, ton: 'mittel' }
                          : { label: `${schritte.length} Schritte`, ton: 'niedrig' }
                    }
                    testid="paket-risiko"
                  />
                </div>
                <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 3, fontSize: 12.5 }}>
                  {schritte.map((c) => (
                    <li key={c.callId}>{c.summary}</li>
                  ))}
                </ol>
                {offen ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <KButton size="sm" tone="accent" onClick={() => void applyPaket(pid)} data-testid="apply-paket">
                      Alle {schritte.length} anwenden
                    </KButton>
                    <KButton size="sm" tone="ghost" onClick={() => void rejectPaket(pid)}>
                      Ablehnen
                    </KButton>
                  </div>
                ) : (
                  <Badge hue="var(--k-success)">Angewendet — EIN ↩ macht alles rückgängig</Badge>
                )}
              </div>
            </div>
          );
        })}

        {cards
          .filter((c) => c.state !== 'abgelehnt' && !c.paket)
          .map((c) => (
            <div
              key={c.callId}
              data-testid="proposal-card"
              className={c.state === 'angewendet' ? 'k-puls' : 'k-einblenden'}
              style={{
                border: `1px solid ${c.state === 'angewendet' ? 'var(--k-success)' : 'var(--k-accent)'}`,
                borderRadius: 10,
                padding: 10,
                display: 'grid',
                gap: 8,
                background: 'var(--k-raised)',
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--k-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vorschlag von Kosmo
              </div>
              {c.state !== 'offen' && <div style={{ fontWeight: 550, fontSize: 13.5 }}>{c.summary}</div>}
              {c.vorschau && (
                <>
                  {c.vorschau.typologieHinweis && (
                    <div style={{ fontSize: 11.5, color: 'var(--k-ink-faint)' }}>{c.vorschau.typologieHinweis}</div>
                  )}
                  <div data-testid="proposal-vorschau" style={{ display: 'flex', gap: 6 }}>
                    <div style={{ display: 'grid', gap: 2, flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 9.5,
                          color: 'var(--k-ink-faint)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Vorher
                      </span>
                      <div
                        style={{ height: 90, background: 'var(--k-plan-paper)', borderRadius: 6, overflow: 'hidden' }}
                        dangerouslySetInnerHTML={{
                          __html: c.vorschau.vorherSvg.replace('<svg ', '<svg style="width:100%;height:100%" '),
                        }}
                      />
                    </div>
                    <div style={{ display: 'grid', gap: 2, flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 9.5,
                          color: 'var(--k-ink-faint)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Nachher
                      </span>
                      <div
                        style={{ height: 90, background: 'var(--k-plan-paper)', borderRadius: 6, overflow: 'hidden' }}
                        dangerouslySetInnerHTML={{
                          __html: c.vorschau.nachherSvg.replace('<svg ', '<svg style="width:100%;height:100%" '),
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
              {c.state === 'offen' ? (
                // v0.7.6 Welle 2 — abgestuftes GovernanceGate, additiv zum
                // bisherigen binären Anwenden/Ablehnen: `apply-proposal`
                // bleibt exakt derselbe Knopf/Weg («Einmal erlauben» ist nur
                // die neue Einordnung desselben `applyCard`-Aufrufs), jede
                // der vier Aktionen hat echte Wirkung (Kopfkommentar
                // `GovernanceGate.tsx`).
                <GovernanceGate
                  testid="proposal-governance-gate"
                  titel={c.summary}
                  unterzeile={c.commandId}
                  onEinmal={() => applyCard(c)}
                  einmalTestid="apply-proposal"
                  onFuerJob={() => {
                    const warAktiv = autoErlaubt.has(c.commandId);
                    toggleAutoErlaubt(c.commandId);
                    // Aktivieren wirkt SOFORT auch auf DIESEN Vorschlag (nicht
                    // erst auf den nächsten) — Widerrufen lässt die offene
                    // Karte unangetastet stehen (Status quo, keine Rücknahme
                    // eines bereits Angewendeten).
                    if (!warAktiv) applyCard(c);
                  }}
                  fuerJobAktiv={autoErlaubt.has(c.commandId)}
                  fuerJobTestid="governance-fuer-job"
                  onAblehnen={() => rejectCard(c)}
                  ablehnenTestid="reject-proposal"
                  onNachfragen={() => melde('Bleibt offen — wartet auf deine Entscheidung.')}
                />
              ) : (
                <Badge hue="var(--k-success)">Angewendet — mit ↩ rückgängig</Badge>
              )}
            </div>
          ))}

        {/* H-28 (`docs/SIM-BEFUNDE.md`): gescheiterte Einzel-Vorschläge
            (`applyCard`-catch setzt `fehler`) bleiben sichtbar statt spurlos
            zu verschwinden — die normale Karte oben ist wegen
            `state !== 'abgelehnt'` schon gefiltert, dieser Block zeigt den
            REST der Karte (Titel + Fehlerzeile), keine Anwenden/Ablehnen-
            Knöpfe mehr (der Zug ist entschieden). */}
        {cards
          .filter((c) => c.state === 'abgelehnt' && c.fehler !== undefined && !c.paket)
          .map((c) => (
            <div
              key={c.callId}
              data-testid="proposal-card-fehler"
              className="k-einblenden"
              style={{
                border: '1px solid var(--k-warning)',
                borderRadius: 10,
                padding: 10,
                display: 'grid',
                gap: 6,
                background: 'var(--k-raised)',
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--k-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vorschlag von Kosmo — nicht angewendet
              </div>
              <div style={{ fontWeight: 550, fontSize: 13.5 }}>{c.summary}</div>
              <div data-testid="diff-karte-fehler" style={{ fontSize: 11.5, color: 'var(--k-warning)' }}>
                ⚠ {c.fehler}
              </div>
            </div>
          ))}

        {busy && <div style={{ color: 'var(--k-ink-faint)', fontSize: 12.5 }}>Kosmo denkt …</div>}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid var(--k-line)', display: 'flex', gap: 8 }}>
        <KButton
          size="sm"
          tone={recording ? 'accent' : 'ghost'}
          onClick={() => void toggleMic()}
          aria-label="Speak to Kosmo"
          data-testid="kosmo-mic"
          style={recording ? { animation: 'none' } : undefined}
        >
          {recording ? '● Stopp' : <KIcon name="mikrofon" size={16} />}
        </KButton>
        <KButton
          size="sm"
          tone="ghost"
          aria-label="Verbesserung erfassen"
          title="Verbesserung ins KosmoDev-Auftragsbuch (Text im Eingabefeld wird zum Auftrag)"
          data-testid="kosmo-flagge"
          onClick={() => {
            const text = input.trim();
            if (!text) {
              melde('Erst den Wunsch ins Eingabefeld tippen — ⚑ macht daraus einen Auftrag im KosmoDev-Buch.');
              return;
            }
            void auftragErfassen(text, 'getippt')
              .then(() => {
                setInput('');
                melde('Auftrag im KosmoDev-Buch', { ton: 'erfolg' });
              })
              .catch((err) => meldeFehler(err));
          }}
        >
          <KIcon name="fahne" size={16} />
        </KButton>
        <input
          ref={eingabeRef}
          data-testid="kosmo-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Sprich mit Kosmo … (@kosmodoc für Hilfe)"
          style={{ ...inputStyle, flex: 1, marginTop: 0 }}
        />
        <KButton tone="accent" size="sm" onClick={send} disabled={busy} data-testid="kosmo-send">
          Senden
        </KButton>
      </div>
      {/* v0.6.9 Stream D: Vollbild-Vorschau der Blick-Miniatur — Muster
          `CommandPalette.tsx` (fixed Scrim, Klick/Escape schliesst, innerer
          Container stoppt die Klick-Propagation). Eigener `zIndex` über dem
          Panel selbst (KosmoPanel hat keinen eigenen Stacking-Kontext-Zwang),
          damit die Vorschau auch bei geöffnetem Einstellungen-Bereich sichtbar ist. */}
      {vollbildBlick && (
        <div
          data-testid="kosmo-blick-vollbild"
          onClick={() => setVollbildBlick(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'color-mix(in srgb, var(--k-ink) 55%, transparent)',
            display: 'grid',
            justifyItems: 'center',
            alignItems: 'center',
            zIndex: 500,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              maxWidth: '90vw',
              maxHeight: '90vh',
            }}
          >
            <img
              src={vollbildBlick.dataUrl}
              alt="Kosmos erfasster Blick — Vollbild"
              style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8, border: '1px solid var(--k-line-strong)' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', fontSize: 12 }}>
              <span>{vollbildBlick.text} — erfasst {formatiereZeit(vollbildBlick.zeit)}</span>
              <KButton
                size="sm"
                tone="ghost"
                data-testid="kosmo-blick-vollbild-schliessen"
                onClick={() => setVollbildBlick(null)}
              >
                Schliessen
              </KButton>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function SettingsFeld({
  label,
  value,
  onChange,
  typ,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  typ?: string;
}) {
  return (
    <label style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>
      {label}
      <input
        type={typ ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 4,
  padding: '6px 10px',
  borderRadius: 'var(--k-radius-sm)',
  border: '1px solid var(--k-line-strong)',
  background: 'var(--k-raised)',
  fontSize: 13,
};
