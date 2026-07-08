import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Hairline, KButton, bestaetigen, melde, meldeFehler, moduleHue, OrbitMark } from '@kosmo/ui';
import {
  ChatSession,
  LearningJournal,
  AnthropicProvider,
  MockProvider,
  OllamaProvider,
  OpenAiKompatibelProvider,
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
import { useProject } from '../state/project-store';
import { loadReferences } from '../modules/data/DataWorkspace';
import { sucheQuellen, useQuellen, type QuellenRef } from '../state/quellen';
import { DiagnosePanel } from './Diagnose';
import { WerkzeugSetup } from './WerkzeugSetup';
import { hydriereJournal, journalStore } from '../state/journal-store';
import { consumeKosmoFokus } from '../state/kosmo-focus';
import { auftragErfassen } from '../state/auftragsbuch';
import { claudeAboAnmeldung, istTauriDesktop } from './cloud-login';
import { kurzform, useKosmoStatus } from '../state/kosmo-status';

/**
 * KosmoPanel — der ständige Begleiter (Vision: Kosmo ist immer da).
 * Schreibende Vorschläge erscheinen als Karten: Anwenden führt den Command
 * über denselben Weg aus wie ein Handgriff des Architekten (Undo inklusive).
 */

interface Bubble {
  id: number;
  who: 'du' | 'kosmo';
  text: string;
  feedback?: 'gut' | 'schlecht';
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
  provider: 'ollama' | 'lmstudio' | 'anthropic' | 'mock';
  baseUrl: string;
  model: string;
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
}

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
  try {
    const res = await fetch(`${bridge}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: kurz }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const url = URL.createObjectURL(await res.blob());
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  } catch {
    try {
      const u = new SpeechSynthesisUtterance(kurz);
      const stimmen = speechSynthesis.getVoices();
      const stimme = stimmen.find((v) => v.lang === 'de-CH') ?? stimmen.find((v) => v.lang.startsWith('de'));
      if (stimme) u.voice = stimme;
      u.lang = stimme?.lang ?? 'de-CH';
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (err) {
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

export function KosmoPanel({ onClose }: { onClose: () => void }) {
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
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // K16 A6: Ziel des einmaligen Fokus-Wunschs (`consumeKosmoFokus`, s. Mount-Effekt unten).
  const eingabeRef = useRef<HTMLInputElement>(null);
  const bubbleSeq = useRef(0);
  const runCommand = useProject((s) => s.runCommand);
  // Belege des Gesprächs: [Qn] im Antworttext → Quelle (Chip mit Quellensprung)
  const quellenMap = useRef(new Map<number, QuellenRef>());
  const quellenZaehler = useRef(0);

  const session = useMemo(() => {
    const provider: ChatProvider =
      settings.provider === 'mock'
        ? new MockProvider()
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
    const push = (who: Bubble['who'], text: string) => {
      const id = ++bubbleSeq.current;
      setBubbles((b) => [...b, { id, who, text }]);
      return id;
    };
    const s = new ChatSession(
      provider,
      doc,
      {
        onText: (delta) => {
          // Ausserhalb des Updaters akkumulieren — React batcht Updater,
          // onBusy(false) käme sonst vor dem letzten Textstück
          lastKosmoText.current += delta;
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
          setCards((c) => [...c, { ...p, state: 'offen' }]);
          // Laufzeit-Status fürs Kosmo-Symbol (K11) — der Vorschlag selbst
          // geht weiter normal als Karte durchs Panel/den Undo-Weg.
          useKosmoStatus.getState().setzeLetzteAktivitaet(kurzform(p.summary));
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
      ],
      journal.toPromptBlock() + dossierPromptBlock() + rollePromptBlock(),
    );
    return s;
    // Session bewusst pro Provider-Konfiguration neu
  }, [settings]);

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
      speichere({ ...settingsRef.current, anthropicOauthToken: token, cloudAuth: 'abo' });
      melde('Mit dem Claude-Abo angemeldet.', { ton: 'erfolg' });
    } catch (err) {
      meldeFehler(err);
    }
  };

  // Nach dem Cloud-Wechsel die letzte Frage auf der neuen Session nachsenden.
  useEffect(() => {
    if (!nachSendText.current) return;
    const t = nachSendText.current;
    nachSendText.current = '';
    setBubbles((b) => [...b, { id: ++bubbleSeq.current, who: 'du', text: t }]);
    void session.send(t);
  }, [session]);

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    // Letzte Frage merken: schlägt das lokale Modell fehl, wird genau sie nach
    // dem Cloud-Wechsel erneut gesendet.
    zuletztGefragt.current = text;
    setBubbles((b) => [...b, { id: ++bubbleSeq.current, who: 'du', text }]);
    void session.send(text);
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
        void session.send(text);
      }
    };
    rec.onend = () => {
      setRecording(false);
      erkennungRef.current = null;
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
            void session.send(text);
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
    try {
      const result = runCommand(card.commandId, card.params, { actor: 'kosmo' });
      setCards((c) => c.map((x) => (x.callId === card.callId ? { ...x, state: 'angewendet' } : x)));
      void session.resolveApplied(card.callId, result.summary);
    } catch (err) {
      setCards((c) => c.map((x) => (x.callId === card.callId ? { ...x, state: 'abgelehnt' } : x)));
      void session.resolveRejected(
        card.callId,
        err instanceof Error ? err.message : 'Ausführung fehlgeschlagen',
      );
    }
  };

  const rejectCard = (card: PendingCard) => {
    setCards((c) => c.map((x) => (x.callId === card.callId ? { ...x, state: 'abgelehnt' } : x)));
    void session.resolveRejected(card.callId);
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
      return;
    }
    setCards((c) => c.map((x) => (x.paket?.id === paketId ? { ...x, state: 'angewendet' } : x)));
    for (let i = 0; i < schritte.length; i++) {
      await session.resolveApplied(schritte[i]!.callId, ergebnisse[i]!);
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
        <Badge hue={settings.provider === 'mock' ? 'var(--k-warning)' : moduleHue.kosmo}>
          {settings.provider === 'mock'
            ? 'Demo'
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
          ⚙
        </KButton>
        <KButton size="sm" tone="ghost" onClick={onClose} aria-label="Schliessen">
          ×
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
          <Hairline />
          <label style={{ fontSize: 12, color: 'var(--k-ink-soft)' }}>
            Verbindung
            <select
              value={settings.provider}
              onChange={(e) => {
                const s = { ...settings, provider: e.target.value as KosmoSettings['provider'] };
                setSettings(s);
                localStorage.setItem('kosmo.llm', JSON.stringify(s));
              }}
              style={selectStyle}
            >
              <option value="ollama">Ollama (HomeStation)</option>
              <option value="lmstudio">LM Studio (HomeStation)</option>
              <option value="anthropic">Anthropic (Claude, Cloud)</option>
              <option value="mock">Demo-Modus (ohne LLM)</option>
            </select>
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
              <SettingsFeld
                label="API-Schlüssel (bleibt auf diesem Gerät)"
                value={settings.anthropicKey}
                typ="password"
                onChange={(v) => speichere({ ...settings, anthropicKey: v, cloudAuth: 'schluessel' })}
              />
              <SettingsFeld
                label="Modell"
                value={settings.anthropicModel}
                onChange={(v) => speichere({ ...settings, anthropicModel: v })}
              />
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
                    {f === 'gut' ? '👍' : '👎'}
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
            <div
              key={pid}
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
              <div style={{ fontSize: 12, color: 'var(--k-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Aktionskette — {schritte.length} Schritte
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
              <div style={{ fontWeight: 550, fontSize: 13.5 }}>{c.summary}</div>
              {c.state === 'offen' ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <KButton size="sm" tone="accent" onClick={() => applyCard(c)} data-testid="apply-proposal">
                    Anwenden
                  </KButton>
                  <KButton size="sm" tone="ghost" onClick={() => rejectCard(c)}>
                    Ablehnen
                  </KButton>
                </div>
              ) : (
                <Badge hue="var(--k-success)">Angewendet — mit ↩ rückgängig</Badge>
              )}
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
          {recording ? '● Stopp' : '🎙'}
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
          ⚑
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

const selectStyle: React.CSSProperties = { ...inputStyle };
