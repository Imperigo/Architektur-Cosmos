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
  pruefeAnthropicZugang,
  type Aufgabenklasse,
  type Betriebsart,
  type ChatProvider,
  type CloudAuthArt,
  type AnthropicZugangsFehler,
  parseLaufPlan,
  type KosmoRolle,
  type LaufPlan,
  type LaufVorschlag,
  type Proposal,
  type SkillMeta,
  type StaffelungKonfig,
  type SystemPromptBlock,
} from '@kosmo/ai';
import { verifiziereLizenz } from '@kosmo/lizenz';
import type { Assembly, JournalEntry } from '@kosmo/kernel';
import { formatiereEreignisse, useProject } from '../state/project-store';
import { loadReferences, type RefEntry } from '../modules/data/DataWorkspace';
import { baueDatenKontextBlock, sucheQuellen, useQuellen, type QuellenRef } from '../state/quellen';
import { sucheReferenzen } from '../state/referenz-index';
import { RefKarte } from './RefKarte';
import { vorschauFuerProposal, type ProposalVorschau } from '../state/proposal-vorschau';
import { abspielVorspiel } from '../state/abspiel-anschluss';
import { DiagnosePanel } from './Diagnose';
import { WerkzeugSetup } from './WerkzeugSetup';
import { GovernanceGate, RisikoPill } from './GovernanceGate';
import { alleFuerJobErlaubt, alleWiderrufen, erlaubeFuerJob, widerrufeFuerJob } from './governance-speicher';
import { hydriereJournal, journalArchivStore, journalStore } from '../state/journal-store';
import { proposalLog, type ProposalKorrekturSchritt } from '../state/proposal-log';
import { consumeKosmoFokus } from '../state/kosmo-focus';
import { auftragErfassen } from '../state/auftragsbuch';
import {
  ANT_INSTALL_BEFEHL,
  claudeAboAnmeldung,
  istAntFehltFehler,
  istTauriDesktop,
  mitAbmeldung,
  mitApiSchluessel,
  pruefeAntStatus,
  type AntStatus,
} from './cloud-login';
import { kurzform, useKosmoStatus } from '../state/kosmo-status';
import { plopp, wusch } from '../state/sounds';
import { KOSMO_AUSGESCHLOSSENE_COMMANDS, kosmoUiWerkzeuge } from '../state/kosmo-ui-werkzeuge';
import {
  blickErfassen,
  blickRingPuffer,
  erkenneAktiveStation,
  ergaenzendeBilderAusRing,
  type Blick,
} from '../state/kosmo-blick';
import { useLaufRuntime } from '../state/lauf-runtime';
import './kosmo-panel.css';
import './lauf-anzeige.css';
import './lauf-vorschlag.css';
// v0.8.6/PB1 (E4, `docs/V086-SPEZ.md` §3, C-13) — die drei kuratierten
// Bibliotheks-Drehbücher DIREKT aus ihrer Quelldatei importiert
// (`resolveJsonModule`, `tsconfig.base.json`) — EINE Wahrheit statt einer
// gespiegelten Kopie, tsc/vite bündeln den JSON-Inhalt zur Build-Zeit (kein
// Laufzeit-Fetch, geprüft gegen `npm run build -w @kosmo/orbit-app`). Die
// Dateien selbst gehören zum Prüfcode-Dateikreis
// (`wissen/training/eval/kosmo-laufplaene/`), NICHT zu diesem Paket — nur
// lesend importiert.
import grundrissRohbau from '../../../../../wissen/training/eval/kosmo-laufplaene/grundriss-rohbau.json';
import visDemolauf from '../../../../../wissen/training/eval/kosmo-laufplaene/vis-demolauf.json';
import publishBlatt from '../../../../../wissen/training/eval/kosmo-laufplaene/publish-blatt.json';

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

/**
 * v0.8.6/PB1 (E4, `docs/V086-SPEZ.md` §3, C-13) — Lauf-Bibliothek: die drei
 * kuratierten Drehbücher aus `wissen/training/eval/kosmo-laufplaene/*.json`
 * wählbar im Panel. `parseLaufPlan` (statt `pruefeLaufPlan`) ist hier
 * bewusst — genau der Anwendungsfall aus dessen Kopfkommentar («Aufrufer,
 * die bereits wissen, dass ihre Fixture/Konstante valide ist … statisch
 * kuratierte Drehbücher»): ein kaputtes Drehbuch soll beim Laden LAUT
 * scheitern (derselbe Prüfcode, `pruefe-laufplaene.mts`, hält alle drei
 * ohnehin ständig grün), nicht still eine leere Bibliothek zeigen.
 * Auswahl zeigt DIESELBE Lauf-Vorschlagskarte wie ein Kosmo-Dialog-Vorschlag
 * (kein zweiter Start-Weg, `laufVorschlag`-State unten) — «Lauf starten»
 * ruft in BEIDEN Fällen `useLaufRuntime.getState().starte(plan)`.
 */
export interface LaufBibliothekEintrag {
  name: string;
  label: string;
  plan: LaufPlan;
}
/** Exportiert (Muster `rollenBadgeLabel` u.a.): Unit-Test-Zugriff OHNE einen
 * vollen `KosmoPanel`-Render (der braucht IndexedDB/Zustand-Stores/
 * localStorage-Settings, s. `rollen-badge.test.tsx`-Kopfkommentar) —
 * `test/lauf-bibliothek.test.ts` vergleicht diese Konstante gegen die
 * rohen JSON-Dateien. */
export const LAUF_BIBLIOTHEK: readonly LaufBibliothekEintrag[] = [
  { name: 'grundriss-rohbau', label: (grundrissRohbau as { titel: string }).titel, plan: parseLaufPlan(grundrissRohbau) },
  { name: 'vis-demolauf', label: (visDemolauf as { titel: string }).titel, plan: parseLaufPlan(visDemolauf) },
  { name: 'publish-blatt', label: (publishBlatt as { titel: string }).titel, plan: parseLaufPlan(publishBlatt) },
];

/**
 * v0.8.3/P7 (§5.4/§12.2 C-9, `docs/V083-SPEZ.md`) — Kosmos eigene, kuratierte
 * Betriebsmuster-Liste für den `skills`-Systemprompt-Block
 * (`packages/kosmo-ai/src/chat.ts`/`skills.ts`). `skills.ts` (P1) fror nur
 * Typ (`SkillMeta`) + Bauer (`skillBlock()`) ein und nannte drei Beispiele
 * (§5.4-Kopfkommentar) — dies ist die tatsächliche Erst-Kuratierung, wörtlich
 * dieselben drei Beispiele, additiv erweiterbar ohne Signaturwechsel.
 */
const KOSMO_SKILLS: readonly SkillMeta[] = [
  {
    id: 'dossier-zuerst',
    titel: 'Dossier-NO-GOs zuerst prüfen',
    kurzbeschreibung: 'Vor jedem Vorschlag das Wettbewerbsdossier gegenlesen — ein NO-GO sticht jede Idee.',
  },
  {
    id: 'command-statt-freitext',
    titel: 'Commands statt Freitext vorschlagen',
    kurzbeschreibung: 'Änderungen als Diff-Karte über einen echten Command anbieten, nie als reine Prosa-Beschreibung.',
  },
  {
    id: 'ablehnung-protokollieren',
    titel: 'Ablehnung protokollieren statt stumm verwerfen',
    kurzbeschreibung: 'Eine abgelehnte Karte im Journal festhalten statt sie kommentarlos verschwinden zu lassen.',
  },
];

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
  /**
   * v0.8.2/P6 (additiv, `docs/V082-SPEZ.md` §6.7, Owner-Entscheid 3/C-3/
   * C-11): NUR bei `who === 'kosmo'` gesetzt, sobald `ChatSession`s additiver
   * `onRolle`-Beobachter für den Zug dieser Bubble gefeuert hat. Die drei
   * Felder reisen zusammen (immer alle drei gesetzt oder keins).
   */
  rolle?: KosmoRolle;
  aufgabenklasse?: Aufgabenklasse;
  einModellBetrieb?: boolean;
}

/**
 * v0.8.2/P6 (additiv, §6.7 Owner-Entscheid 3) — Anzeigename je Rolle für das
 * Rollen-Badge, wörtlich die Kosmo-eigenen Namen aus
 * `docs/KI-MODELL-GUIDELINE.md` Teil C («Kosmo-Meister/-Leiter/-Zeichner»).
 * Als eigene, pure Funktion exportiert (statt inline im JSX), damit sie ohne
 * vollen Panel-Render unit-testbar ist — Rendern selbst bleibt Sache des
 * E2E-Beweises (`e2e/staffelung-kuratier.spec.ts`).
 */
export function rollenBadgeLabel(rolle: KosmoRolle): string {
  const NAMEN: Record<KosmoRolle, string> = { meister: 'Meister', leiter: 'Leiter', zeichner: 'Zeichner' };
  return `Kosmo-${NAMEN[rolle]}`;
}

/** v0.8.2/P6 (additiv, §6.7) — der additive `data-testid` je Rolle («rollen-badge-<rolle>»-Schema). */
export function rollenBadgeTestId(rolle: KosmoRolle): string {
  return `rollen-badge-${rolle}`;
}

/**
 * v0.8.2/P6 (additiv, §6.7) — der ehrliche Titel/Tooltip-Text: solange KEINE
 * echte Rollen-Modell-Karte konfiguriert ist (heutiger App-Normalfall, EIN
 * Modell für die ganze Sitzung), macht der Titel das offen sichtbar statt
 * einen Modellwechsel vorzutäuschen, der nicht stattfand.
 */
export function rollenBadgeTitel(einModellBetrieb: boolean, klasse: Aufgabenklasse): string {
  return einModellBetrieb
    ? `Aufgabenklasse: ${klasse} — Ein-Modell-Betrieb (kein Modellwechsel, nur Etikett)`
    : `Aufgabenklasse: ${klasse}`;
}

/**
 * v0.8.3/P2 (§6.2/E6b, `docs/V083-SPEZ.md`) — vergibt `[Qn]`-Marken für
 * Referenztreffer über DIESELBEN `quellenMap`/`quellenZaehler`-Refs, die
 * `quellen_suchen`s `execute` (unten, unverändert — s. §11 Sanktionsliste,
 * `quellen_suchen` bleibt byte-gleich) bereits nutzt: EIN gemeinsamer
 * Zähler für beide Werkzeuge, keine Parallel-Nummerierung — ein Treffer aus
 * `referenzen_suchen` bekommt nie dieselbe `[Qn]`-Nummer wie ein Treffer aus
 * `quellen_suchen` in derselben Sitzung. Als eigene, pure Funktion
 * exportiert (Muster `rollenBadgeLabel` oben): testbar mit einem frischen
 * Map/Zähler-Paar, ohne vollen Panel-Render.
 */
export function markiereReferenzTreffer(
  treffer: readonly { titel: string; text: string; score: number; docId: string }[],
  quellenMap: Map<number, QuellenRef>,
  quellenZaehler: { current: number },
): { nr: number; titel: string; text: string }[] {
  return treffer.map((t) => {
    const nr = ++quellenZaehler.current;
    quellenMap.set(nr, { nr, typ: 'referenz', titel: t.titel, text: t.text, score: t.score, docId: t.docId });
    return { nr, titel: t.titel, text: t.text };
  });
}

// v0.8.2/P3 (additiv, §4.3 `docs/V082-SPEZ.md`): zweiter Konstruktor-Parameter
// `journalArchivStore()` — spiegelt JEDEN Eintrag zusätzlich ins unbegrenzte
// Archiv (IndexedDB `lernjournalarchiv`), das 200er-Fenster für den
// Prompt-Block (`toPromptBlock()`) bleibt unverändert.
const journal = new LearningJournal(journalStore(), journalArchivStore());

/**
 * v0.8.1 KI2 (§3 Kandidat 4, `docs/V081-SPEZ.md`): Dossier- und Rollen-
 * Prompt-Bausteine sind nach `@kosmo/ai` (`systemprompt.ts`, `dossierBlock`/
 * `rolleBlock`) umgezogen — `ChatSession.send()` leitet sie jeden Zug frisch
 * aus dem `doc`, das die Session hält, ab (dieselbe `KosmoDoc`-Instanz wie
 * hier, Mutationen laufen in-place). Was hier bleibt: NUR das Lernjournal
 * als `systemSuffix`-Lieferant (App-eigen, `journal` lebt hier) — als
 * Funktion statt vorab berechnetem String, damit `ChatSession` es JEDEN Zug
 * frisch abruft statt nur einmal beim Session-Bau («Journal nur bei
 * Session-Neubau frisch» war die alte Lücke, s. Erkundung §1).
 */

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
  //
  // v0.8.1 / P8 (0.7.2-Rest «Schliessen-Choreografie mit Plopp», Spec §6.2,
  // B-84 §8d «Fenster saugt sich zur Ecke … Sound plopp») — der container-
  // baubare Teil DIESES Rests: innerhalb der SPA saugt sich das Panel zur
  // Orb-Ecke (unten rechts, wo `KosmoSymbol` nach dem Unmount wieder
  // erscheint) statt nur seitlich wegzugleiten (`.k-panel-austritt-orb`,
  // additiv in `aura.css` neben dem unverändert bleibenden `.k-panel-
  // austritt`), begleitet vom bereits bestehenden `plopp()`-Ton
  // (`state/sounds.ts`, Default AUS, feature-detected). Die ZWEITE,
  // choreografierte Übergabe zwischen dem Tauri-Hauptfenster und dem
  // separaten Desktop-Charakter-Fenster (`shell/KosmoCharakterFenster.tsx`)
  // bleibt die dort dokumentierte «ehrliche Grenze» — sie bräuchte einen
  // Rust→JS-Vorlauf, den `lib.rs` heute nicht sendet, und ist NICHT Teil
  // dieser SPA-internen Choreografie.
  const [schliessend, setSchliessend] = useState(false);
  const handleClose = () => {
    plopp();
    const reduziert =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduziert) {
      onClose();
      return;
    }
    setSchliessend(true);
    window.setTimeout(onClose, 200); // --k-motion-base (s. .k-panel-austritt-orb, aura.css)
  };
  // v0.8.4 PA5 (E10 §3.1, `docs/V084-SPEZ.md`, C-5 «Status-Erkennung
  // dreiwertig»): ant-CLI-Status VOR jedem Anmelde-Versuch — ersetzt den
  // reinen Ja/Nein-Fehlertext der Vorversion durch drei ehrliche Zustände
  // (`pruefeAntStatus()`/`AntStatus` in `./cloud-login`). `'unbekannt'` ist
  // der Zustand VOR der ersten Prüfung (Panel gerade erst geöffnet) und im
  // Web/PWA (dort gibt es den ant-Status schlicht nicht).
  const [antStatus, setAntStatus] = useState<AntStatus | 'unbekannt'>('unbekannt');
  const [antStatusLaeuft, setAntStatusLaeuft] = useState(false);
  const aktualisiereAntStatus = async () => {
    if (!istTauriDesktop()) return;
    setAntStatusLaeuft(true);
    try {
      setAntStatus(await pruefeAntStatus());
    } catch {
      setAntStatus('unbekannt');
    } finally {
      setAntStatusLaeuft(false);
    }
  };
  // Einmal beim Mounten des Panels geprüft (Desktop-only, kein Login-Popup —
  // reine Beobachtung); der «Erneut prüfen»-Knopf im Anthropic-Block ruft
  // exakt dieselbe Funktion erneut.
  useEffect(() => {
    void aktualisiereAntStatus();
  }, []);

  // v0.8.4 PA5 (E10 §3.2, `docs/V084-SPEZ.md`, C-5 «Key-Validierungs-Ping»):
  // «beim Speichern» heisst hier debounced (600ms nach der letzten Eingabe)
  // — ein Ping pro Tastenanschlag wäre weder gemeint noch sinnvoll.
  // `pruefeAnthropicZugang` (`@kosmo/ai`) macht den kleinsten echten
  // Anthropic-Call; die UI zeigt das Ergebnis ehrlich statt eines blossen
  // "gespeichert". Läuft NUR beim API-Schlüssel-Weg — ein Abo-Token gilt als
  // geprüft durch den Login-Flow selbst.
  const [schluesselPruefung, setSchluesselPruefung] = useState<
    | { status: 'leer' }
    | { status: 'pruefe' }
    | { status: 'ok' }
    | { status: 'fehler'; art: AnthropicZugangsFehler; detail: string }
  >({ status: 'leer' });
  useEffect(() => {
    if (settings.provider !== 'anthropic' || settings.cloudAuth !== 'schluessel' || !settings.anthropicKey.trim()) {
      setSchluesselPruefung({ status: 'leer' });
      return;
    }
    setSchluesselPruefung({ status: 'pruefe' });
    const schluessel = settings.anthropicKey;
    const timer = window.setTimeout(() => {
      void pruefeAnthropicZugang({ apiKey: schluessel }).then((ergebnis) => {
        // Inzwischen weitergetippt/gewechselt → dieses (jetzt veraltete)
        // Ergebnis nicht mehr anzeigen, der neuere Timer übernimmt.
        if (settingsRef.current.anthropicKey !== schluessel || settingsRef.current.cloudAuth !== 'schluessel') return;
        setSchluesselPruefung(
          ergebnis.ok ? { status: 'ok' } : { status: 'fehler', art: ergebnis.fehler, detail: ergebnis.detail },
        );
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [settings.provider, settings.cloudAuth, settings.anthropicKey]);
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
   * v0.8.2/P3 (additiv, §4.1 C-19 «Ablehnungs-Grund-Eingabe») — `callId` der
   * Karte, deren Ablehnen-Klick GERADE die Grund-Eingabe zeigt (statt sofort
   * abzulehnen); `null` = keine offen. Ersetzt das `proposal-governance-
   * gate` NUR für diese eine Karte, alle anderen Karten/Pakete unverändert.
   */
  const [grundEingabeFuer, setGrundEingabeFuer] = useState<string | null>(null);
  const [grundText, setGrundText] = useState('');
  /**
   * v0.8.2/P3 (additiv, §4.4/§5 «Export kosmo-signal/v1») — `null` = Dialog
   * geschlossen. `jsonl` ist bereits fertig gebaut (`baueSignalExport()`
   * unten), damit «Herunterladen» dieselben Zahlen liefert, die der Dialog
   * gerade zeigt (kein Rennen zwischen Anzeige und Download).
   */
  const [signalExport, setSignalExport] = useState<null | {
    jsonl: string;
    counts: { journal: number; proposal: number; reparatur: number; layout: number };
  }>(null);
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

  /**
   * v0.8.2/P3 (additiv, §4.1 C-19 DPO-Rohpaar-Kern) — «Ablehnung → nächste
   * manuelle Aktion»: `useProject`s `journal`-Ring (`project-store.ts`, JEDER
   * `runCommand()`-Aufruf unabhängig vom Actor, unverändert seit v0.6.8)
   * wird beobachtet; die erste Aktion mit `actor === 'benutzer'` NACH einer
   * offenen Ablehnung wird als `folgeKorrektur` verknüpft
   * (`proposalLog.verknuepfeNaechsteKorrektur`). Liest NUR den bestehenden
   * Store — `project-store.ts` bleibt unangetastet.
   */
  useEffect(() => {
    // Referenz statt Länge: `journal` kappt bei 500 Einträgen (`project-
    // store.ts` `.slice(-500)`) — ab dieser Kappung bliebe eine reine
    // Längen-Beobachtung stehen. `lastIndexOf` per Objekt-Referenz (jeder
    // `JournalEntry` ist ein frisches Literal aus `execute()`, nie mutiert)
    // findet die zuletzt verarbeitete Zeile auch nach vorherigem Verwerfen
    // älterer Einträge zuverlässig wieder.
    let letzterVerarbeiteter: JournalEntry | null = null;
    return useProject.subscribe((state) => {
      const alle = state.journal;
      if (alle.length === 0) return;
      const idx = letzterVerarbeiteter ? alle.lastIndexOf(letzterVerarbeiteter) : -1;
      const neue = alle.slice(idx + 1);
      if (neue.length === 0) return;
      letzterVerarbeiteter = alle[alle.length - 1]!;
      for (const eintrag of neue) {
        if (eintrag.actor !== 'benutzer') continue;
        const korrektur: ProposalKorrekturSchritt = {
          commandId: eintrag.commandId,
          params: eintrag.params,
          summary: eintrag.summary,
        };
        proposalLog.verknuepfeNaechsteKorrektur(korrektur);
      }
    });
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
  /**
   * v0.8.5 PA3 «Autopilot-Kern» (`docs/V085-SPEZ.md` §3 E4, C-9) — reine
   * ANZEIGE des aktuellen Laufs (Laufzeit-Store `state/lauf-runtime.ts`,
   * bewusst getrennt vom Doc). Kein Auslöser hier: der Store startet nur über
   * `window.__kosmoLauf`/einen künftigen Kosmo-Dialog (C-10) — dieses Panel
   * zeigt nur, was ANDERSWO bereits läuft, und bietet den Abbrechen-Knopf.
   */
  const laufPlan = useLaufRuntime((s) => s.plan);
  const laufSchritte = useLaufRuntime((s) => s.schritte);
  const laufStatus = useLaufRuntime((s) => s.status);
  /**
   * v0.8.6/PB1 (E4, `docs/V086-SPEZ.md` §3, C-10/C-11/C-12/C-13) — die
   * Lauf-VORSCHLAGSKARTE (VOR dem Start, anders als `laufPlan` oben, das ist
   * der bereits LAUFENDE/fertige Lauf). `quelle: 'chat'` trägt eine `callId`
   * (die `ChatSession` über `resolveLaufGestartet`/`resolveLaufAbgelehnt`
   * zurückerwartet), `quelle: 'bibliothek'` hat keine — «Lauf starten» ruft
   * in BEIDEN Fällen denselben `useLaufRuntime.getState().starte(plan)`-Weg
   * (KEIN zweiter Start-Pfad, C-13). Nur EIN offener Vorschlag gleichzeitig
   * (ein neuer überschreibt den alten) — deckungsgleich mit `pendingLauf` in
   * `ChatSession` (dort ebenfalls kein Mehrfach-Vorrat vorgesehen).
   */
  const [laufVorschlag, setLaufVorschlag] = useState<
    { quelle: 'chat'; callId: string; plan: LaufPlan } | { quelle: 'bibliothek'; plan: LaufPlan } | null
  >(null);
  // Belege des Gesprächs: [Qn] im Antworttext → Quelle (Chip mit Quellensprung)
  const quellenMap = useRef(new Map<number, QuellenRef>());
  const quellenZaehler = useRef(0);
  /**
   * v0.8.3/P7 (additiv, §6.4/§12.1 C-4, `docs/V083-SPEZ.md`) — der zuletzt
   * gebaute App-seitige `datenKontext`-Block (`state/quellen.ts#
   * baueDatenKontextBlock`, P2). Der Bauer selbst ist async (KosmoData-
   * Suche); `ChatSession`s `extraBloecke?`-Kanal (`chat.ts`) ruft seinen
   * Aufrufer dagegen SYNCHRON innerhalb des `send()`-Blockaufbaus auf — die
   * Ref überbrückt das: `aktualisiereDatenKontext()` (unten) füllt sie
   * VOR jedem `session.send()` frisch, `extraBloecke` liest nur noch den
   * zuletzt bekannten Stand, ohne eigenen Async-Schritt.
   */
  const datenKontextRef = useRef<SystemPromptBlock>({ label: 'datenKontext', text: '' });
  /**
   * v0.8.3/P2 (§6.3/E6c, `docs/V083-SPEZ.md`) — die gerade offene `RefKarte`
   * im Chatverlauf: `bubbleId` verankert sie an der Bubble, deren `[Qn]`-Chip
   * geklickt wurde (additiv zur bestehenden Sprung-Mechanik, ersetzt sie
   * nicht — der Sprung zu KosmoData bleibt zusätzlich verfügbar).
   */
  const [offeneRefKarte, setOffeneRefKarte] = useState<{ bubbleId: number; nr: number; entry: RefEntry } | null>(
    null,
  );

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

  /**
   * v0.8.2/P3 (additiv, §4.4 C-17-Fix + §5 «Export kosmo-signal/v1») —
   * kombiniert ALLE Stores (Lernjournal-Archiv `art:'journal'`,
   * Vorschlags-Log `art:'proposal'|'reparatur'|'layout'`) zu EINER
   * `kosmo-signal/v1`-JSONL, mit demselben Default-Filter wie die beiden
   * Store-Methoden selbst (`visibility === 'public'`, Owner-Entscheid 1) —
   * kein zweiter, abweichender Filter hier.
   */
  const baueSignalExport = () => {
    const journalJsonl = journal.toKosmoSignalJsonl('public');
    const logJsonl = proposalLog.toKosmoSignalJsonl('public');
    const jsonl = [journalJsonl, logJsonl].filter(Boolean).join('\n');
    const logPublic = proposalLog.all.filter((e) => e.visibility === 'public');
    return {
      jsonl,
      counts: {
        journal: journal.archivAll.filter((e) => e.visibility === 'public').length,
        proposal: logPublic.filter((e) => e.art === 'proposal').length,
        reparatur: logPublic.filter((e) => e.art === 'reparatur').length,
        layout: logPublic.filter((e) => e.art === 'layout').length,
      },
    };
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
    // v0.8.2/P6 (additiv, §6.7 C-3/C-11): die App konfiguriert heute EIN
    // Modell je Provider (kein Rollen-Karten-UI) — `einzelModell` ist darum
    // der ehrliche Fallback (`staffelung.ts:161-169`): alle drei Rollen
    // spielen dieses eine Modell, `staffelungIstZusammengefasst` liefert
    // entsprechend IMMER `true` (kein erfundener Mehrmodell-Betrieb, den es
    // in der App heute nicht gibt — das wäre eine Attrappe).
    const staffelungKonfig: StaffelungKonfig = {
      provider: settings.provider === 'anthropic' ? 'anthropic' : 'ollama',
      einzelModell:
        settings.provider === 'anthropic'
          ? settings.anthropicModel
          : settings.provider === 'lmstudio'
            ? settings.lmModel
            : settings.provider === 'ollama'
              ? settings.model
              : settings.provider, // mock/scripted: informativer Platzhalter, nie real konsumiert
    };
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
        // v0.8.2/P3 (additiv, §4.2 C-21): Parameter-Reparatur-Signal — reiner
        // Beobachter, ändert am bestehenden Fehlerpfad/Kontrollfluss nichts.
        onReparatur: (vorher, nachher) => {
          proposalLog.protokolliereReparatur({
            vorher,
            nachher: { commandId: nachher.commandId, params: nachher.params, summary: nachher.summary },
          });
        },
        // v0.8.2/P3 (additiv, B1 «Stop-Knopf») — EIGENES Ereignis statt
        // `onError`: ein bewusster Abbruch soll NICHT den Cloud-Fallback
        // oben auslösen (das wäre unehrlich — der Architekt wollte anhalten,
        // nicht auf einen anderen Provider ausweichen).
        onAborted: () => {
          useKosmoStatus.getState().setzeZustand('idle');
          push('system', '⏹ Abgebrochen — Kosmo wartet auf deine nächste Nachricht.', 'abgebrochen');
        },
        // v0.8.2/P6 (additiv, §6.7 Owner-Entscheid 3/C-3/C-11): trägt die
        // automatisch bestimmte Rolle auf die GERADE aktive Kosmo-Bubble
        // dieses Zugs nach — `currentKosmoBubble` (Closure oben) zeigt in
        // diesem Moment zuverlässig auf sie (onRolle feuert NACH dem
        // Streaming-Loop, `onBusy(false)` setzt sie nicht zurück, nur das
        // nächste `onBusy(true)` tut das). Kein Text in diesem Zug (reiner
        // Tool-Aufruf ohne Antworttext) → keine Bubble zum Anheften, still
        // übersprungen (kein erfundenes Badge ohne Antwort).
        onRolle: (info) => {
          if (currentKosmoBubble === -1) return;
          const id = currentKosmoBubble;
          setBubbles((b) =>
            b.map((x) =>
              x.id === id
                ? { ...x, rolle: info.rolle, aufgabenklasse: info.klasse, einModellBetrieb: info.einModellBetrieb }
                : x,
            ),
          );
        },
        // v0.8.6/PB1 (additiv, E4, `docs/V086-SPEZ.md` §3) — `lauf_planen`
        // wurde NIE ausgeführt (`chat.ts#turn()`), nur gemeldet: zeigt die
        // Lauf-Vorschlagskarte. Ein zweiter Vorschlag in derselben Sitzung
        // ersetzt einen noch offenen (kein Vorrat, s. `laufVorschlag`-State).
        onLaufVorschlag: (v: LaufVorschlag) => {
          setLaufVorschlag({ quelle: 'chat', callId: v.callId, plan: v.plan });
          useKosmoStatus.getState().setzeLetzteAktivitaet(kurzform(`Lauf-Vorschlag: ${v.plan.titel}`));
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
            'Durchsucht KosmoData (Architektur-Referenzbibliothek, 112 kuratierte Bauwerke der Architekturgeschichte) nach Stichwort. Liefert Titel, Jahr, Ort, Architekten, Themen, Material — mit [Qn]-Belegen, die im Antworttext zitiert werden können (Klick auf den Chip zeigt die Referenzkarte). Nutze es, wenn der Architekt nach Referenzen, Vorbildern oder Vergleichen fragt.',
          parameters: {
            type: 'object',
            properties: {
              suchbegriff: { type: 'string', description: 'z.B. «Beton», «Moschee», «Le Corbusier», «Holz»' },
            },
            required: ['suchbegriff'],
            additionalProperties: false,
          },
          // v0.8.3/P2 (§6.1/§6.2/E6a/E6b, `docs/V083-SPEZ.md`): BM25 über den
          // geteilten Index (`state/referenz-index.ts#sucheReferenzen`) statt
          // des vormals naiven `hay.includes(q)`-Treffers — UND dieselbe
          // [Qn]-Marken-Mechanik wie `quellen_suchen` (EIN gemeinsamer
          // `quellenZaehler`, `markiereReferenzTreffer` oben).
          execute: async (args) => {
            const q = String((args as { suchbegriff?: string })?.suchbegriff ?? '');
            const treffer = await sucheReferenzen(q, 8);
            if (treffer.length === 0) return `Keine Referenz zu «${q}» in KosmoData.`;
            const eintraege = treffer.map(({ entry: e, score }) => ({
              titel: `Referenz · ${e.title}`,
              text: `${e.year_start ?? '?'}, ${[e.city, e.country].filter(Boolean).join(', ')} — ${(e.authors ?? []).join(', ') || 'unbekannt'}${(e.themes ?? []).length ? `; Themen: ${(e.themes ?? []).join(', ')}` : ''}${e.one_sentence ? ` — ${e.one_sentence}` : ''}`,
              score,
              docId: e.id,
            }));
            const marken = markiereReferenzTreffer(eintraege, quellenMap.current, quellenZaehler);
            const zeilen = marken.map((m) => `[Q${m.nr}] (${m.titel}) ${m.text}`);
            const erste = marken[0]!.nr;
            return `${zeilen.join('\n---\n')}\n\nAntworte gestützt auf diese Belege und zitiere sie im Text mit ihrer Marke, z.B. [Q${erste}]. Erfinde keine Marken.`;
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
      () => journal.toPromptBlock(),
      // Kuratierte Werkzeug-Untermenge (Begründung: KOSMO_AUSGESCHLOSSENE_COMMANDS).
      { ohne: KOSMO_AUSGESCHLOSSENE_COMMANDS },
      // v0.8.2/P6 (additiv, §6.7): staffelungKonfig für den `onRolle`-Beobachter oben.
      staffelungKonfig,
      // v0.8.3/P7 (additiv, §6.4/§12.1 C-4): der App-seitige datenKontext-
      // Block, synchron aus `datenKontextRef` gelesen (Begründung s.
      // `aktualisiereDatenKontext` oben) — leer fällt in `baueSystemprompt()`
      // automatisch weg, kein eigener Sonderfall hier nötig.
      () => (datenKontextRef.current.text ? [datenKontextRef.current] : []),
      // v0.8.3/P7 (additiv, §5.4/§12.2 C-9): Kosmos kuratierte Skill-Liste.
      KOSMO_SKILLS,
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
   *
   * v0.8.4 PA5 (E10 §3.1): JEDER Ausgang (Erfolg wie Fehlschlag) aktualisiert
   * `antStatus` neu (`aktualisiereAntStatus()`) — der Architekt sieht danach
   * immer den echten, gerade beobachteten ant-Zustand statt eines Standes
   * von vor dem Klick.
   */
  const mitClaudeAnmelden = async () => {
    try {
      const token = await claudeAboAnmeldung();
      speichere({ ...settingsRef.current, anthropicOauthToken: token, cloudAuth: 'abo' });
      melde('Mit dem Claude-Abo angemeldet.', { ton: 'erfolg' });
    } catch (err) {
      // Owner-Befund F1: «ant nicht gefunden» bekommt eine Anleitung im Panel
      // statt nur eines Toasts — andere Fehler (Login abgebrochen, Web/PWA)
      // bleiben beim bisherigen `meldeFehler`.
      if (!istAntFehltFehler(err)) {
        meldeFehler(err);
      } else {
        // v0.9.0 Owner-Befund 22.07.2026 («anmelden passiert nichts»): die
        // Anleitung erscheint unterhalb des sichtbaren Bereichs — ohne
        // sofortiges Feedback wirkt der Klick wie ein Nichts. Kurzer
        // Wegweiser-Toast ZUSÄTZLICH zur Panel-Anleitung (F1 bleibt).
        melde('Die Anthropic-CLI (ant) fehlt auf diesem Gerät — Anleitung unten im Panel (oder API-Schlüssel eintragen).', {
          ton: 'info',
          dauerMs: 7000,
        });
      }
    } finally {
      await aktualisiereAntStatus();
    }
  };

  /**
   * v0.8.3/P7 (additiv, §6.4/§12.1 C-4, `docs/V083-SPEZ.md`) — berechnet den
   * `datenKontext`-Block frisch (`baueDatenKontextBlock`, `state/quellen.ts`,
   * P2) und legt ihn in `datenKontextRef` ab, BEVOR `session.send()` läuft —
   * Begründung der Ref-Brücke s. Kopfkommentar bei `datenKontextRef` oben.
   * KosmoData/Wissensbasis unerreichbar → Ref bleibt beim zuletzt bekannten
   * Stand (kein Absturz, `baueDatenKontextBlock` fängt selbst schon ab; der
   * `try/catch` hier deckt nur einen eigenen, unerwarteten Fehler ab).
   */
  const aktualisiereDatenKontext = async (): Promise<void> => {
    const st = useProject.getState();
    try {
      datenKontextRef.current = await baueDatenKontextBlock(
        st.doc.settings.projectName || 'Unbenannt',
        st.doc.settings.dossier,
      );
    } catch {
      /* KosmoData/Wissensbasis nicht erreichbar — Ref bleibt beim letzten Stand. */
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
   *
   * v0.8.3/P7 (additiv, §6.4/§12.1 C-4): JEDER Aufruf aktualisiert zuerst den
   * `datenKontext`-Block (`aktualisiereDatenKontext()` oben) — alle Zweige
   * unten enden mit `session.send()`, das den frischen Ref-Stand über
   * `extraBloecke` synchron abholt.
   */
  const sendeMitBlick = async (text: string) => {
    await aktualisiereDatenKontext();
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
      // v0.8.2/P3 (additiv, §4.1 C-18): jeder Diff-Karten-Ausgang ins Log.
      proposalLog.protokolliereProposal({
        commandId: card.commandId,
        params: card.params,
        summary: card.summary,
        ausgang: 'angenommen',
      });
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
      // v0.8.2/P3 (additiv, §4.1 C-18): auch der gescheiterte Ausgang zählt.
      proposalLog.protokolliereProposal({
        commandId: card.commandId,
        params: card.params,
        summary: card.summary,
        ausgang: 'fehlgeschlagen',
        grund: meldung,
      });
    }
  };
  // Muster `cloudAnRef` (s. oben): jede Zeile hier aktualisiert die
  // Vorwärtsreferenz auf den JEWEILS aktuellen `applyCard`-Funktionswert.
  applyCardRef.current = applyCard;

  /** v0.8.2/P3 (additiv, §4.1 C-19): `grund` optional — die Grund-Eingabe
   * (unten am `proposal-governance-gate`) übergibt ihn, der bestehende
   * `apply-paket`-Ablehnen-Weg lässt ihn weiterhin weg (unverändert). */
  const rejectCard = (card: PendingCard, grund?: string) => {
    setCards((c) => c.map((x) => (x.callId === card.callId ? { ...x, state: 'abgelehnt' } : x)));
    void session.resolveRejected(card.callId, grund);
    proposalLog.protokolliereProposal({
      commandId: card.commandId,
      params: card.params,
      summary: card.summary,
      ausgang: 'abgelehnt',
      ...(grund !== undefined ? { grund } : {}),
    });
  };

  /**
   * v0.8.6/PB1 (E4, `docs/V086-SPEZ.md` §3, Sanktion 2+3 — KEIN Auto-Start,
   * dieses Tool führt NIE selbst aus) — «Lauf starten»: DERSELBE Weg wie der
   * `__kosmoLauf`-Testhook (`lauf-runtime.ts`), egal ob der Vorschlag aus dem
   * Chat kam oder aus der Lauf-Bibliothek (C-13, kein zweiter Start-Pfad).
   * Löst NICHTS selbst auf — `lauf-runtime.ts#starte()` ruft die @ref-
   * Auflösung intern VOR jedem Schritt (`loeseLaufPlanRefs`, `@kosmo/ai`).
   * Meldet Kosmo den Start nur nach, wenn der Vorschlag aus dem Chat kam
   * (`resolveLaufGestartet`) — ein Bibliotheks-Start hat keine offene
   * `ChatSession`-Karte, die auf eine Antwort wartet.
   */
  const starteLaufVorschlag = () => {
    if (!laufVorschlag) return;
    const { plan } = laufVorschlag;
    useLaufRuntime.getState().starte(plan);
    if (laufVorschlag.quelle === 'chat') {
      void session.resolveLaufGestartet(
        laufVorschlag.callId,
        `Lauf «${plan.titel}» gestartet (${plan.schritte.length} Schritt${plan.schritte.length === 1 ? '' : 'e'}).`,
      );
    }
    setLaufVorschlag(null);
  };

  /** v0.8.6/PB1 (E4) — «Ablehnen»: verwirft die Karte, meldet Kosmo die
   * Ablehnung nur bei einem Chat-Vorschlag (Bibliotheks-Vorschläge haben
   * keine offene `ChatSession`-Karte). */
  const lehneLaufVorschlagAb = () => {
    if (!laufVorschlag) return;
    if (laufVorschlag.quelle === 'chat') {
      void session.resolveLaufAbgelehnt(laufVorschlag.callId);
    }
    setLaufVorschlag(null);
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
          // v0.8.2/P3 (additiv, §4.1): auch Paket-Schritte sind Diff-Karten-Ausgänge.
          proposalLog.protokolliereProposal({
            commandId: schritt.commandId,
            params: schritt.params,
            summary: schritt.summary,
            ausgang: 'fehlgeschlagen',
            grund: `Paket abgebrochen: ${fehler}`,
          });
        }
        useKosmoStatus.getState().setzeZustand('error');
        return;
      }
      setCards((c) => c.map((x) => (x.paket?.id === paketId ? { ...x, state: 'angewendet' } : x)));
      for (let i = 0; i < schritte.length; i++) {
        await session.resolveApplied(schritte[i]!.callId, ergebnisse[i]!);
        proposalLog.protokolliereProposal({
          commandId: schritte[i]!.commandId,
          params: schritte[i]!.params,
          summary: schritte[i]!.summary,
          ausgang: 'angenommen',
        });
      }
      useKosmoStatus.getState().setzeZustand('done');
    } finally {
      if (aufEsc) window.removeEventListener('keydown', aufEsc, true);
    }
  };

  const rejectPaket = async (paketId: string) => {
    const schritte = cards.filter((c) => c.paket?.id === paketId && c.state === 'offen');
    setCards((c) => c.map((x) => (x.paket?.id === paketId ? { ...x, state: 'abgelehnt' } : x)));
    for (const schritt of schritte) {
      await session.resolveRejected(schritt.callId);
      // v0.8.2/P3 (additiv, §4.1): Paket-Ablehnung ohne Grund-Eingabe (nur
      // die Einzelkarte hat die additive Grund-UI, s. `proposal-governance-gate`).
      proposalLog.protokolliereProposal({
        commandId: schritt.commandId,
        params: schritt.params,
        summary: schritt.summary,
        ausgang: 'abgelehnt',
      });
    }
  };

  return (
    <aside
      data-testid="kosmo-panel"
      // v0.6.6 Stream E — Motion-Politur (MOTION-KONZEPT §4): Feder-Eintritt
      // beim Erstaufbau. v0.8.1 / P8: der Austritt nutzt jetzt die additive
      // Orb-Choreografie (`.k-panel-austritt-orb`, s. Kommentar oben bei
      // `handleClose`) statt der generischen `.k-panel-austritt` — rein
      // additive Klassen, keine Struktur.
      className={`${schliessend ? 'k-panel-austritt-orb' : 'k-panel-eintritt'} kp-panel`}
    >
      {showSetup && (
        <WerkzeugSetup betriebsart={settings.betriebsart} onClose={() => setShowSetup(false)} />
      )}
      <div className="kp-kopf">
        <OrbitMark module="kosmo" size={24} />
        <div className="kp-titel">Kosmo</div>
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
        <div className="kp-fuell" />
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
        <div className="kp-einstellungen">
          <div className="kp-feld-titel">Betriebsart</div>
          <div data-testid="betriebsart" className="kp-betriebsart-reihe">
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
                className="kp-betriebsart-btn"
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
            <div className="kp-hinweis-soft">
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
              <div className="kp-feld-titel">Governance</div>
              <div className="kp-hinweis-soft">
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
          <label className="kp-feld-titel">
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
              className="kp-select-block"
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
              <div className="kp-feld-titel">
                Cloud-Anmeldung —{' '}
                <span data-testid="cloud-login-status" className="kp-ink">
                  {settings.cloudAuth === 'abo' && settings.anthropicOauthToken.trim()
                    ? 'angemeldet als Abo'
                    : settings.anthropicKey.trim()
                      ? 'API-Schlüssel hinterlegt'
                      : 'nicht angemeldet'}
                </span>
              </div>
              {istTauriDesktop() ? (
                <>
                  {/* v0.8.4 PA5 (E10 §3.1, C-5 «Status-Erkennung dreiwertig»):
                      der ant-CLI-Status VOR dem Klick — sagt ehrlich voraus,
                      was «Mit Claude-Abo anmelden» als Nächstes tut (Token
                      direkt holen / einen Browser-Popup öffnen / erst
                      installieren). */}
                  <div data-testid="cloud-login-ant-status" className="kp-hinweis-soft">
                    {antStatusLaeuft
                      ? 'ant-CLI-Status wird geprüft …'
                      : antStatus === 'fehlt'
                        ? 'ant-CLI nicht gefunden.'
                        : antStatus === 'nicht-eingeloggt'
                          ? 'ant-CLI gefunden, noch nicht angemeldet — ein Klick öffnet den Anmelde-Dialog.'
                          : antStatus === 'eingeloggt'
                            ? 'ant-CLI angemeldet — ein Klick holt das Token in Kosmo.'
                            : 'ant-CLI-Status unbekannt — «Erneut prüfen» klicken.'}
                  </div>
                  <div className="kp-knopf-reihe">
                    <KButton
                      size="sm"
                      tone={settings.cloudAuth === 'abo' ? 'accent' : 'ghost'}
                      data-testid="cloud-login-abo"
                      onClick={() => void mitClaudeAnmelden()}
                    >
                      Mit Claude-Abo anmelden
                    </KButton>
                    <KButton
                      size="sm"
                      tone="ghost"
                      data-testid="cloud-login-erneut-pruefen"
                      onClick={() => void aktualisiereAntStatus()}
                    >
                      Erneut prüfen
                    </KButton>
                  </div>
                </>
              ) : (
                <div
                  data-testid="cloud-login-hinweis"
                  className="kp-hinweis-soft"
                >
                  Das Claude-Abo läuft nur in der Desktop-App über die lokale Anthropic-CLI
                  (<code>ant</code>) — Mit-Claude-Anmeldung gibt es hier nicht. Im Browser bitte den
                  API-Schlüssel unten nutzen.
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
              {antStatus === 'fehlt' && (
                <div
                  data-testid="cloud-login-anleitung"
                  className="kp-anleitung-box"
                >
                  <div>
                    Die Anthropic-CLI (<code>ant</code>) fehlt lokal — sie ist das Werkzeug, über das
                    die Abo-Anmeldung läuft (derselbe Weg wie bei Claude Code).
                  </div>
                  <div>
                    Installieren: <code>{ANT_INSTALL_BEFEHL}</code> (oder die Anthropic-Dokumentation
                    unter platform.claude.com) — danach «Erneut prüfen» oder direkt «Mit Claude-Abo
                    anmelden» versuchen.
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
              {schluesselPruefung.status !== 'leer' && (
                // v0.8.4 PA5 (E10 §3.2, C-5 «Key-Validierungs-Ping»): das
                // Ergebnis des echten Anthropic-Checks — ehrlich benannt statt
                // eines blossen «gespeichert». `schluessel-pruefung-status`
                // trägt den Rohzustand zusätzlich als `data-status` (Tests
                // brauchen keine Textabhängigkeit).
                <div
                  data-testid="schluessel-pruefung-status"
                  data-status={schluesselPruefung.status === 'fehler' ? schluesselPruefung.art : schluesselPruefung.status}
                  className={schluesselPruefung.status === 'fehler' ? 'kp-fehler-zeile' : 'kp-hinweis-soft'}
                >
                  {schluesselPruefung.status === 'pruefe' && 'Prüfe Zugang bei Anthropic …'}
                  {schluesselPruefung.status === 'ok' && 'Zugang bestätigt — der Schlüssel funktioniert.'}
                  {schluesselPruefung.status === 'fehler' && schluesselPruefung.art === 'netz' &&
                    `Anthropic nicht erreichbar: ${schluesselPruefung.detail}`}
                  {schluesselPruefung.status === 'fehler' && schluesselPruefung.art === 'schluessel' &&
                    `Schlüssel ungültig oder abgelehnt: ${schluesselPruefung.detail}`}
                  {schluesselPruefung.status === 'fehler' && schluesselPruefung.art === 'quota' &&
                    `Kontingent/Guthaben erschöpft: ${schluesselPruefung.detail}`}
                  {schluesselPruefung.status === 'fehler' && schluesselPruefung.art === 'unbekannt' &&
                    `Unbekannter Fehler: ${schluesselPruefung.detail}`}
                </div>
              )}
              <label className="kp-feld-titel">
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
                  className="kp-select-block"
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
          <label className="kp-schalter-label">
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
          <label className="kp-schalter-label">
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
            <div data-testid="kosmo-blick-cloud-hinweis" className="kp-hinweis-faint">
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
            <div className="kp-blick-stack">
              <span className="kp-hinweis-faint">Kosmos letzte Blicke</span>
              <div data-testid="kosmo-blick-ring" className="kp-blick-ring">
                {blickRingPuffer()
                  .slice(-3)
                  .map((b) => (
                    <div
                      key={b.zeit}
                      data-testid="kosmo-blick-ring-eintrag"
                      title={`${b.stationTitel} — erfasst ${formatiereZeit(b.zeit)}`}
                      className="kp-blick-eintrag"
                    >
                      {b.bild ? (
                        <img
                          src={`data:${b.bild.mediaType};base64,${b.bild.dataBase64}`}
                          alt=""
                          className="kp-blick-bild"
                        />
                      ) : (
                        <div
                          className="kp-blick-platzhalter"
                        >
                          Text
                        </div>
                      )}
                      <span className="kp-blick-label">
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
            onClick={() => setSignalExport(baueSignalExport())}
          >
            Lernjournal exportieren (kosmo-signal/v1 fürs LoRA-Training)
          </KButton>
          {lizenzPublicKey() && (
            <>
              <Hairline />
              <div className="kp-feld-titel">
                Lizenz —{' '}
                <span data-testid="lizenz-status" className="kp-ink">
                  {lizenz.status === 'gueltig'
                    ? 'gültig'
                    : lizenz.status === 'abgelaufen'
                      ? 'abgelaufen'
                      : lizenz.status === 'ungueltig'
                        ? 'ungültig'
                        : 'fehlt'}
                </span>
              </div>
              <div className="kp-hinweis-soft">
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

      {/* v0.8.6/PB1 (E4, `docs/V086-SPEZ.md` §3, C-13) — Lauf-Bibliothek:
          IMMER sichtbar (kein Gate hinter den Einstellungen), ausser
          während ein Lauf gerade LÄUFT oder eine Vorschlagskarte offen ist
          — bleibt nach einem FERTIGEN/fehlgeschlagenen/abgebrochenen Lauf
          wieder wählbar (`laufStatus`, nicht `laufPlan`: ein einmal
          gestarteter Lauf bleibt als Anzeige unten stehen, s. `laufPlan`-
          Block). Auswahl zeigt DIESELBE Vorschlagskarte wie ein
          Kosmo-Dialog-Vorschlag unten. */}
      {!laufVorschlag && laufStatus !== 'laeuft' && (
        <div data-testid="lauf-bibliothek-root" className="lauf-bibliothek">
          <span className="lauf-bibliothek-titel">Lauf-Bibliothek</span>
          <div className="lauf-bibliothek-reihe">
            {LAUF_BIBLIOTHEK.map((eintrag) => (
              <button
                key={eintrag.name}
                type="button"
                className="k-druck lauf-bibliothek-eintrag"
                data-testid={`lauf-bibliothek-${eintrag.name}`}
                title={eintrag.label}
                onClick={() => setLaufVorschlag({ quelle: 'bibliothek', plan: eintrag.plan })}
              >
                {eintrag.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* v0.8.6/PB1 (E4, C-10/C-11/C-12) — Lauf-Vorschlagskarte: rendert
          IMMER den ganzen `LaufPlan` (Titel + Schrittliste mit
          Begründungen) — egal ob er aus dem Chat (`onLaufVorschlag`) oder
          aus der Bibliothek oben kommt. «Lauf starten» ruft
          `lauf-runtime.starte(plan)` — KEIN Auto-Start unter keinen
          Umständen, nur der explizite Klick hier tut das. */}
      {laufVorschlag && (
        <div data-testid="lauf-vorschlag-root" className="lauf-vorschlag-karte">
          <div className="kp-eyebrow">
            {laufVorschlag.quelle === 'bibliothek' ? 'Lauf aus der Bibliothek' : 'Lauf-Vorschlag von Kosmo'}
          </div>
          <div className="kp-karte-titel">{laufVorschlag.plan.titel}</div>
          <ol className="lauf-vorschlag-liste">
            {laufVorschlag.plan.schritte.map((schritt, i) => (
              <li key={i} data-testid={`lauf-vorschlag-schritt-${i}`} className="lauf-vorschlag-schritt">
                <span className="lauf-schritt-punkt" aria-hidden="true" />
                <span className="lauf-vorschlag-schritt-begruendung">{schritt.begruendung}</span>
              </li>
            ))}
          </ol>
          <div className="kp-knopf-reihe">
            <KButton size="sm" tone="accent" data-testid="lauf-vorschlag-starten" onClick={starteLaufVorschlag}>
              Lauf starten
            </KButton>
            <KButton size="sm" tone="ghost" data-testid="lauf-vorschlag-ablehnen" onClick={lehneLaufVorschlagAb}>
              Ablehnen
            </KButton>
          </div>
        </div>
      )}

      {laufPlan && (
        <div data-testid="lauf-plan-root" className={`lauf-anzeige lauf-anzeige--${laufStatus}`}>
          <div className="lauf-anzeige-kopf">
            <span className="lauf-anzeige-titel">{laufPlan.titel}</span>
            <Badge
              hue={
                laufStatus === 'fehler'
                  ? 'var(--k-danger)'
                  : laufStatus === 'fertig'
                    ? 'var(--k-success)'
                    : laufStatus === 'abgebrochen'
                      ? 'var(--k-ink-faint)'
                      : 'var(--k-warning)'
              }
            >
              {laufStatus === 'laeuft'
                ? 'läuft'
                : laufStatus === 'fertig'
                  ? 'fertig'
                  : laufStatus === 'fehler'
                    ? 'fehler'
                    : laufStatus === 'abgebrochen'
                      ? 'abgebrochen'
                      : 'offen'}
            </Badge>
            <div className="kp-fuell" />
            <KButton
              size="sm"
              tone="ghost"
              data-testid="lauf-abbrechen"
              disabled={laufStatus !== 'laeuft'}
              onClick={() => useLaufRuntime.getState().abbrechen()}
            >
              Abbrechen
            </KButton>
          </div>
          {
            /**
             * v0.8.8 PA5 «Autopilot-Fortsetzung» (`docs/V088-SPEZ.md` §3 E4,
             * §6 Sanktion 4, C-6) — «Ab Schritt N fortsetzen»/«Schritt N
             * wiederholen» NUR im Fehler-/Abbruch-Zustand, NIE in
             * 'laeuft'/'fertig'/'offen' (Sanktion 4: «Autopilot-Fortsetzung
             * … aus Nicht-Fehler-Zustand = ungültig»). N = erster
             * nicht-'ok'-Schritt (1-basiert für die Anzeige, `lauf-runtime`
             * erhält den 0-basierten Index). Beide Knöpfe delegieren an die
             * neuen Store-Aktionen — die eigentliche Zulässigkeitsprüfung
             * sitzt im `LaufRunner` selbst (zweite Verteidigungslinie).
             */
            (laufStatus === 'fehler' || laufStatus === 'abgebrochen') &&
              (() => {
                const ersterOffenerIndex = laufSchritte.findIndex((s) => s.status !== 'ok');
                if (ersterOffenerIndex === -1) return null;
                return (
                  <div className="kp-knopf-reihe">
                    <KButton
                      size="sm"
                      tone="accent"
                      data-testid="lauf-fortsetzen"
                      onClick={() => useLaufRuntime.getState().fortsetzen()}
                    >
                      Ab Schritt {ersterOffenerIndex + 1} fortsetzen
                    </KButton>
                    <KButton
                      size="sm"
                      tone="ghost"
                      data-testid="lauf-wiederholen"
                      onClick={() => useLaufRuntime.getState().wiederholen(ersterOffenerIndex)}
                    >
                      Schritt {ersterOffenerIndex + 1} wiederholen
                    </KButton>
                  </div>
                );
              })()
          }
          <ul className="lauf-anzeige-liste">
            {laufPlan.schritte.map((schritt, i) => {
              const zustand = laufSchritte[i] ?? { status: 'offen' as const };
              return (
                <li
                  key={i}
                  data-testid={`lauf-schritt-${i}`}
                  className={`lauf-schritt lauf-schritt--${zustand.status}`}
                >
                  <span className="lauf-schritt-punkt" aria-hidden="true" />
                  <span className="lauf-schritt-text">
                    <span className="lauf-schritt-begruendung">{schritt.begruendung}</span>
                    {zustand.status === 'fehler' && zustand.fehler && (
                      <span className="lauf-schritt-fehler">{zustand.fehler}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div ref={scrollRef} className="kp-verlauf">
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
                className="k-einblenden kp-system-zeile kp-blick-zeile"
              >
                {b.blickBild && (
                  <img
                    src={b.blickBild}
                    alt="Kosmos erfasster Blick — anklicken für die Vollbild-Vorschau"
                    data-testid="kosmo-blick-thumbnail"
                    onClick={() =>
                      setVollbildBlick({ dataUrl: b.blickBild!, zeit: b.blickZeit ?? b.id, text: b.text })
                    }
                    className="kp-blick-thumbnail"
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
                className="k-einblenden kp-system-zeile"
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
            className={`k-einblenden kp-bubble ${b.who === 'du' ? 'kp-bubble--du' : 'kp-bubble--kosmo'}`}
          >
            {/* v0.8.2/P6 (additiv, §6.7 Owner-Entscheid 3/C-3/C-11) — das
                sichtbare Rollen-Badge: NUR wenn `onRolle` für diese Bubble
                bereits gefeuert hat (`b.rolle` gesetzt). */}
            {b.who === 'kosmo' && b.rolle && (
              <span
                className={`kp-rollen-badge kp-rollen-badge--${b.rolle}`}
                data-testid={rollenBadgeTestId(b.rolle)}
                title={rollenBadgeTitel(b.einModellBetrieb ?? true, b.aufgabenklasse ?? 'chat-standard')}
              >
                {rollenBadgeLabel(b.rolle)}
                {b.einModellBetrieb && (
                  <span className="kp-rollen-badge-hinweis" data-testid="rollen-badge-ein-modell-hinweis">
                    · Ein-Modell-Betrieb
                  </span>
                )}
              </span>
            )}
            {b.text}
            {marken.length > 0 && (
              <div className="kp-marken-reihe">
                {marken.map((n) => {
                  const ref = quellenMap.current.get(n)!;
                  return (
                    <button
                      key={n}
                      className="k-druck kp-quelle-chip"
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
                          // v0.8.3/P2 (§6.3/E6c): zusätzlich, ADDITIV zum
                          // Stations-Sprung — die reiche RefKarte direkt hier
                          // im Chatverlauf, an dieser Bubble verankert.
                          void loadReferences().then((refs) => {
                            const entry = refs.find((r) => r.id === ref.docId);
                            if (entry) setOffeneRefKarte({ bubbleId: b.id, nr: n, entry });
                          });
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
                    >
                      Q{n} · {ref.titel}
                    </button>
                  );
                })}
              </div>
            )}
            {/* v0.8.3/P2 (§6.3/E6c): die RefKarte erscheint an GENAU der
                Bubble, deren Referenz-Chip geklickt wurde — additiv zur
                bestehenden Chip-/Sprung-Mechanik oben. */}
            {offeneRefKarte && offeneRefKarte.bubbleId === b.id && (
              <RefKarte
                entry={offeneRefKarte.entry}
                nr={offeneRefKarte.nr}
                onClose={() => setOffeneRefKarte(null)}
              />
            )}
            {b.who === 'kosmo' && !b.text.startsWith('⚠') && (
              <div className={`kp-feedback-reihe${b.feedback ? ' kp-feedback-reihe--gegeben' : ''}`}>
                {(['gut', 'schlecht'] as const).map((f) => (
                  <button
                    key={f}
                    className={`k-druck kp-feedback-btn${b.feedback === f ? ' kp-feedback-btn--aktiv' : ''}`}
                    aria-label={f === 'gut' ? 'Hilfreich' : 'Nicht hilfreich'}
                    data-testid={`fb-${f}`}
                    onClick={() => {
                      journal.add({ sentiment: f, context: b.text });
                      setBubbles((all) => all.map((x) => (x.id === b.id ? { ...x, feedback: f } : x)));
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
            <div key={pid} className="kp-paket-stack">
              {/* Paket-Zusammenfassung (Aufgabe 3): nur ab N≥2 — bei EINEM
                  Paket immer der Fall (chat.ts vergibt `paket` nur, wenn ein
                  Zug mehr als einen schreibenden Tool-Call enthielt), die
                  Bedingung bleibt trotzdem explizit statt implizit. */}
              {schritte.length >= 2 && (
                <div
                  data-testid="diff-paket-zusammenfassung"
                  className="kp-paket-zusammenfassung"
                >
                  {paketZusammenfassungsZeile(schritte)}
                </div>
              )}
              <div
                data-testid="paket-card"
                className={`kp-karte ${offen ? 'kp-karte--offen' : 'kp-karte--fertig'}`}
              >
                <div className="kp-karte-kopf-reihe">
                  <div className="kp-eyebrow">
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
                <ol className="kp-schritt-liste">
                  {schritte.map((c) => (
                    <li key={c.callId}>{c.summary}</li>
                  ))}
                </ol>
                {offen ? (
                  <div className="kp-knopf-reihe">
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
              className={`${c.state === 'angewendet' ? 'k-puls' : 'k-einblenden'} kp-karte ${c.state === 'angewendet' ? 'kp-karte--fertig' : 'kp-karte--offen'}`}
            >
              <div className="kp-eyebrow">
                Vorschlag von Kosmo
              </div>
              {c.state !== 'offen' && <div className="kp-karte-titel">{c.summary}</div>}
              {c.vorschau && (
                <>
                  {c.vorschau.typologieHinweis && (
                    <div className="kp-vorschau-hinweis">{c.vorschau.typologieHinweis}</div>
                  )}
                  <div data-testid="proposal-vorschau" className="kp-vorschau-reihe">
                    <div className="kp-vorschau-spalte">
                      <span
                        className="kp-vorschau-label"
                      >
                        Vorher
                      </span>
                      <div
                        className="kp-vorschau-bild"
                        dangerouslySetInnerHTML={{
                          __html: c.vorschau.vorherSvg.replace('<svg ', '<svg style="width:100%;height:100%" '),
                        }}
                      />
                    </div>
                    <div className="kp-vorschau-spalte">
                      <span
                        className="kp-vorschau-label"
                      >
                        Nachher
                      </span>
                      <div
                        className="kp-vorschau-bild"
                        dangerouslySetInnerHTML={{
                          __html: c.vorschau.nachherSvg.replace('<svg ', '<svg style="width:100%;height:100%" '),
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
              {c.state === 'offen' ? (
                grundEingabeFuer === c.callId ? (
                  // v0.8.2/P3 (additiv, §4.1 C-19 «Ablehnungsgrund + Folge-
                  // Korrektur») — ersetzt das Gate NUR für diese eine Karte,
                  // solange die Grund-Eingabe offen ist; «Zurück» kehrt ohne
                  // Ablehnung zum Gate zurück (kein Fake-Fortschritt).
                  <div data-testid="reject-grund-eingabe" className="kp-grund-box">
                    <div className="kp-feld-titel">Ablehnen — Grund? (optional, hilft der Korrektur-Kuration)</div>
                    <textarea
                      data-testid="reject-grund-input"
                      className="kp-grund-textarea"
                      value={grundText}
                      onChange={(e) => setGrundText(e.target.value)}
                      placeholder="z.B. «Wandstärke falsch, sollte 200 mm sein»"
                      rows={2}
                    />
                    <div className="kp-knopf-reihe">
                      <KButton
                        size="sm"
                        tone="danger"
                        data-testid="reject-grund-bestaetigen"
                        onClick={() => {
                          const grund = grundText.trim();
                          rejectCard(c, grund ? grund : undefined);
                          setGrundEingabeFuer(null);
                          setGrundText('');
                        }}
                      >
                        Ablehnen
                      </KButton>
                      <KButton
                        size="sm"
                        tone="ghost"
                        data-testid="reject-grund-abbrechen"
                        onClick={() => {
                          setGrundEingabeFuer(null);
                          setGrundText('');
                        }}
                      >
                        Zurück
                      </KButton>
                    </div>
                  </div>
                ) : (
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
                    onAblehnen={() => {
                      // v0.8.2/P3 (additiv): NICHT mehr sofort ablehnen —
                      // erst die Grund-Eingabe zeigen (s. Zweig oben).
                      setGrundText('');
                      setGrundEingabeFuer(c.callId);
                    }}
                    ablehnenTestid="reject-proposal"
                    onNachfragen={() => melde('Bleibt offen — wartet auf deine Entscheidung.')}
                  />
                )
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
              className="k-einblenden kp-karte kp-karte--fehler"
            >
              <div className="kp-eyebrow">
                Vorschlag von Kosmo — nicht angewendet
              </div>
              <div className="kp-karte-titel">{c.summary}</div>
              <div data-testid="diff-karte-fehler" className="kp-fehler-zeile">
                ⚠ {c.fehler}
              </div>
            </div>
          ))}

        {busy && <div className="kp-denkt">Kosmo denkt …</div>}
      </div>

      <div className="kp-eingabe-reihe">
        <KButton
          size="sm"
          tone={recording ? 'accent' : 'ghost'}
          onClick={() => void toggleMic()}
          aria-label="Speak to Kosmo"
          data-testid="kosmo-mic"
          className={recording ? 'kp-mic-aktiv' : undefined}
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
          className="kp-input kp-eingabe-feld"
        />
        {busy ? (
          // v0.8.2/P3 (additiv, B1 «req.signal-Stop-Knopf», `docs/V082-SPEZ.md`
          // §6.3) — NUR sichtbar während `busy` (ein Zug läuft tatsächlich),
          // ersetzt den «Senden»-Knopf statt ihn zu verdoppeln (derselbe
          // Platz, dieselbe Geste). `stopStream()` bricht den Zug ehrlich ab
          // (`chat.ts`), die Abbruch-Bubble kommt über `onAborted` oben.
          <KButton tone="danger" size="sm" onClick={() => session.stopStream()} data-testid="kosmo-stop">
            ⏹ Stopp
          </KButton>
        ) : (
          <KButton tone="accent" size="sm" onClick={send} disabled={busy} data-testid="kosmo-send">
            Senden
          </KButton>
        )}
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
          className="kp-vollbild-scrim"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="kp-vollbild-box"
          >
            <img
              src={vollbildBlick.dataUrl}
              alt="Kosmos erfasster Blick — Vollbild"
              className="kp-vollbild-bild"
            />
            <div className="kp-vollbild-fuss">
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
      {/* v0.8.2/P3 (additiv, §4.4/§5 «Export kosmo-signal/v1») — zeigt VOR
          dem Download ehrlich, wie viel öffentlich (`visibility:'public'`)
          markiertes Material tatsächlich exportiert wird (Owner-Entscheid 1:
          nur `public` verlässt je ein Repo) — kein blinder Sofort-Download
          mehr. */}
      {signalExport && (
        <div data-testid="kosmo-signal-export-dialog" className="kp-export-scrim" onClick={() => setSignalExport(null)}>
          <div onClick={(e) => e.stopPropagation()} className="kp-export-box">
            <div className="kp-feld-titel">Export kosmo-signal/v1 (öffentlich, Owner-Entscheid 1)</div>
            <div className="kp-export-zeile">
              <span>Journal (art: journal)</span>
              <span>{signalExport.counts.journal}</span>
            </div>
            <div className="kp-export-zeile">
              <span>Diff-Karten-Ausgänge (art: proposal)</span>
              <span>{signalExport.counts.proposal}</span>
            </div>
            <div className="kp-export-zeile">
              <span>Parameter-Reparaturen (art: reparatur)</span>
              <span>{signalExport.counts.reparatur}</span>
            </div>
            <div className="kp-export-zeile">
              <span>Layout-Signale (art: layout)</span>
              <span>{signalExport.counts.layout}</span>
            </div>
            <div className="kp-knopf-reihe">
              <KButton
                size="sm"
                tone="accent"
                data-testid="kosmo-signal-export-download"
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([signalExport.jsonl], { type: 'application/jsonl' }),
                  );
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `kosmo-signal-${new Date().toISOString().slice(0, 10)}.jsonl`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  setTimeout(() => URL.revokeObjectURL(url), 10_000);
                  setSignalExport(null);
                }}
              >
                Herunterladen
              </KButton>
              <KButton size="sm" tone="ghost" data-testid="kosmo-signal-export-schliessen" onClick={() => setSignalExport(null)}>
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
    <label className="kp-feld-titel">
      {label}
      <input
        type={typ ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="kp-input"
      />
    </label>
  );
}
