/**
 * Provider-Abstraktion — Kosmo spricht mit lokalen LLMs (Ollama) über eine
 * schmale Streaming-Schnittstelle. Bewusst plain fetch statt SDK: volle
 * Kontrolle über NDJSON-Streaming und Abbruch, null Abhängigkeiten.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** Bei role=assistant: angeforderte Tool-Aufrufe. */
  toolCalls?: ToolCall[];
  /** Bei role=tool: Name des beantworteten Tools. */
  toolName?: string;
  /**
   * v0.6.8 («Kosmo sieht mit») — OPTIONALE Bilder an einer Nachricht (praktisch
   * nur bei role=user gefüllt: der erfasste Stations-Blick der App). Bewusst
   * KEINE content-Union (string|Block[]) — das würde den `MockProvider`-Regex-
   * Pfad (`content.toLowerCase()`) und alle bestehenden Kosmo-Specs brechen.
   * `content` bleibt immer der reine Text; `images` ist additiv daneben.
   * Vision-fähige Provider (Anthropic/Ollama/LM-Studio) mappen dieses Feld auf
   * ihr jeweiliges Bild-Format; Mock/Scripted ignorieren es still (kein
   * Vertragsbruch, siehe deren `chat()`).
   */
  images?: { mediaType: string; dataBase64: string }[];
}

export interface ToolCall {
  id: string;
  name: string;
  /** Roh-Argumente vom Modell (werden zod-validiert + ggf. repariert). */
  arguments: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema der Parameter. */
  parameters: unknown;
}

export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_call'; call: ToolCall }
  | { type: 'done'; stopReason: 'stop' | 'tool_calls' | 'error'; error?: string };

export interface ChatRequest {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  signal?: AbortSignal;
}

export interface ChatProvider {
  readonly id: string;
  chat(req: ChatRequest): AsyncIterable<StreamEvent>;
}

/**
 * Anthropic/OpenAI verlangen, dass ein Tool-Resultat die id des auslösenden
 * Tool-Aufrufs referenziert. Unser Verlauf führt nur toolName — die Zuordnung
 * wird hier aus der Reihenfolge rekonstruiert: je tool-Nachricht der erste
 * noch freie Aufruf der letzten assistant-Nachricht, Namensgleichheit zuerst
 * (Vorschläge können in anderer Reihenfolge freigegeben werden als gestellt).
 */
export function verknuepfeToolIds(messages: ChatMessage[]): Map<number, string> {
  const zuordnung = new Map<number, string>();
  let offen: { id: string; name: string; belegt: boolean }[] = [];
  messages.forEach((m, i) => {
    if (m.role === 'assistant') {
      offen = (m.toolCalls ?? []).map((c) => ({ id: c.id, name: c.name, belegt: false }));
      return;
    }
    if (m.role !== 'tool') return;
    const passend =
      offen.find((c) => !c.belegt && c.name === m.toolName) ?? offen.find((c) => !c.belegt);
    if (passend) {
      passend.belegt = true;
      zuordnung.set(i, passend.id);
    }
  });
  return zuordnung;
}

export interface OllamaConfig {
  /** z.B. http://homestation:11434 oder via Bridge-Proxy http://bridge:8600/ollama */
  baseUrl: string;
  model: string;
  temperature?: number;
}

type OllamaNachricht = {
  role: ChatMessage['role'];
  content: string;
  tool_calls?: { function: { name: string; arguments: unknown } }[];
  tool_name?: string;
  images?: string[];
};

/**
 * Verlauf → Ollamas `/api/chat`-Nachrichtenform — reine Bau-Funktion (v0.6.8,
 * exportiert fürs Unit-testen ohne Netz/Stream). Bilder gehen als eigenes
 * Feld `images` (Array roher base64-Strings, ohne data:-Prefix/mediaType)
 * neben `content` — https://github.com/ollama/ollama/blob/main/docs/api.md#chat-request-with-images
 */
export function zuOllamaNachrichten(messages: ChatMessage[]): OllamaNachricht[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
    ...(m.toolCalls
      ? {
          tool_calls: m.toolCalls.map((c) => ({
            function: { name: c.name, arguments: c.arguments },
          })),
        }
      : {}),
    ...(m.toolName ? { tool_name: m.toolName } : {}),
    ...(m.images && m.images.length > 0 ? { images: m.images.map((i) => i.dataBase64) } : {}),
  }));
}

export class OllamaProvider implements ChatProvider {
  readonly id = 'ollama';
  constructor(private cfg: OllamaConfig) {}

  async *chat(req: ChatRequest): AsyncIterable<StreamEvent> {
    let response: Response;
    try {
      response = await fetch(`${this.cfg.baseUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: req.signal ?? null,
        body: JSON.stringify({
          model: this.cfg.model,
          stream: true,
          options: { temperature: this.cfg.temperature ?? 0.2 },
          messages: zuOllamaNachrichten(req.messages),
          ...(req.tools && req.tools.length > 0
            ? {
                tools: req.tools.map((t) => ({
                  type: 'function',
                  function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters,
                  },
                })),
              }
            : {}),
        }),
      });
    } catch (err) {
      yield {
        type: 'done',
        stopReason: 'error',
        error: `Kosmo erreicht das lokale Modell nicht (${this.cfg.baseUrl}): ${err instanceof Error ? err.message : String(err)}`,
      };
      return;
    }
    if (!response.ok || !response.body) {
      yield {
        type: 'done',
        stopReason: 'error',
        error: `Ollama antwortet mit ${response.status} — läuft das Modell «${this.cfg.model}»?`,
      };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sawToolCall = false;
    let callSeq = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        let chunk: {
          message?: {
            content?: string;
            tool_calls?: { function: { name: string; arguments: unknown } }[];
          };
          done?: boolean;
        };
        try {
          chunk = JSON.parse(line);
        } catch {
          continue;
        }
        if (chunk.message?.content) {
          yield { type: 'text', delta: chunk.message.content };
        }
        for (const tc of chunk.message?.tool_calls ?? []) {
          sawToolCall = true;
          yield {
            type: 'tool_call',
            call: {
              id: `call_${Date.now()}_${callSeq++}`,
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          };
        }
        if (chunk.done) {
          yield { type: 'done', stopReason: sawToolCall ? 'tool_calls' : 'stop' };
          return;
        }
      }
    }
    yield { type: 'done', stopReason: sawToolCall ? 'tool_calls' : 'stop' };
  }
}

/**
 * Mock-Provider — deterministisch für Tests und Demos ohne HomeStation.
 * Versteht einfache deutsche Wand-/Volumen-Anweisungen per Regex.
 */
export class MockProvider implements ChatProvider {
  readonly id = 'mock';

  async *chat(req: ChatRequest): AsyncIterable<StreamEvent> {
    const lastMsg = req.messages[req.messages.length - 1];
    // Nach einem Tool-Resultat: bestätigen statt denselben Vorschlag wiederholen
    if (lastMsg?.role === 'tool') {
      await new Promise((r) => setTimeout(r, 40));
      let delta: string;
      if (lastMsg.toolName === 'quellen_suchen') {
        // Belegt antworten wie das echte Modell: erste Marke zitieren
        const marke = lastMsg.content.match(/\[Q\d+\]/)?.[0];
        delta = marke
          ? `Dazu gibt es eine klare Grundlage: ${lastMsg.content.match(/\)\s*([^\n]{0,160})/)?.[1]?.trim() ?? 'siehe Beleg'} ${marke}`
          : lastMsg.content.split('\n')[0]!;
      } else if (lastMsg.toolName === 'referenzen_suchen') {
        delta = lastMsg.content.startsWith('Keine')
          ? lastMsg.content
          : `Aus KosmoData passen diese Referenzen:\n${lastMsg.content}`;
      } else if (lastMsg.toolName === 'ui_zustandLesen') {
        // v0.6.6 Stream E (Kosmo-UI-Brücke, BEWEGUNGSKONZEPT §6): das Resultat
        // ist der ECHTE, live gelesene `ui-zustand.ts`-Snapshot (JSON) —
        // hier nur menschenlesbar zusammengefasst, nichts erfunden.
        try {
          const snap = JSON.parse(lastMsg.content) as { tool?: string; viewMode?: string; arbeitsmodus?: string };
          delta = `Aktuell: Werkzeug ${snap.tool}, Ansicht ${snap.viewMode}${snap.arbeitsmodus ? `, Modus ${snap.arbeitsmodus}` : ', kein Arbeitsmodus'}.`;
        } catch {
          delta = 'Konnte den UI-Zustand nicht lesen.';
        }
      } else {
        delta = lastMsg.content.startsWith('AUSGEFÜHRT')
          ? 'Erledigt — die Wand steht. Soll ich gleich Fenster setzen?'
          : 'Verstanden, ich lasse es.';
      }
      yield { type: 'text', delta };
      yield { type: 'done', stopReason: 'stop' };
      return;
    }
    const last = [...req.messages].reverse().find((m) => m.role === 'user');
    const text = last?.content.toLowerCase() ?? '';
    // Wissensfrage → Quellensuche über den Abruf-Index (Wissen+Dossier+Journal)
    const frage = text.match(/was\s+sag\w*.*?\b(?:zur?|zum|über)\s+«?([\wäöüß-]+)»?|grundlagen?\s+zur?\s+«?([\wäöüß-]+)»?/);
    if (frage) {
      const begriff = frage[1] ?? frage[2]!;
      yield { type: 'text', delta: 'Ich schaue in den Grundlagen nach. ' };
      yield {
        type: 'tool_call',
        call: { id: 'call_mock_quellen', name: 'quellen_suchen', arguments: { suchbegriff: begriff } },
      };
      yield { type: 'done', stopReason: 'tool_calls' };
      return;
    }
    const ref = text.match(/referenz\w*\s+(?:zu|für|mit)?\s*«?([\wäöü-]+)»?/);
    if (ref) {
      yield { type: 'text', delta: 'Ich schaue in KosmoData nach. ' };
      yield {
        type: 'tool_call',
        call: { id: 'call_mock_ref', name: 'referenzen_suchen', arguments: { suchbegriff: ref[1] } },
      };
      yield { type: 'done', stopReason: 'tool_calls' };
      return;
    }
    // v0.6.6 Stream E (Kosmo-UI-Brücke) — deterministische Trigger für die
    // fünf SCHREIBENDEN `ui.*`-Werkzeuge + `ui.zustandLesen`, ausschliesslich
    // für E2E/Demo (`kosmo-ui-bruecke.spec.ts`); ein echtes Modell entscheidet
    // das selbst anhand der Tool-Beschreibungen.
    if (text.includes('ui-zustand') || text.includes('ui zustand')) {
      yield { type: 'text', delta: 'Ich lese den aktuellen UI-Zustand. ' };
      yield { type: 'tool_call', call: { id: 'call_mock_ui_lesen', name: 'ui_zustandLesen', arguments: {} } };
      yield { type: 'done', stopReason: 'tool_calls' };
      return;
    }
    if (text.includes('automatik')) {
      const aus = text.includes('aus');
      yield { type: 'text', delta: `Ich schalte die Arbeitsmodus-Automatik ${aus ? 'aus' : 'ein'}. ` };
      yield {
        type: 'tool_call',
        call: { id: 'call_mock_automatik', name: 'ui_modusAutomatik', arguments: { automatik: !aus } },
      };
      yield { type: 'done', stopReason: 'tool_calls' };
      return;
    }
    const modusMatch = text.match(
      /modus.*?(?:auf|zu|nach)\s*«?(entwerfen|zeichnen|ideen|recherchieren|erfassen|skizzieren|vergleichen|exportieren|modellieren)»?/,
    );
    if (modusMatch) {
      const modus = modusMatch[1]!;
      yield { type: 'text', delta: `Ich stelle den Modus auf ${modus}. ` };
      yield { type: 'tool_call', call: { id: 'call_mock_modus', name: 'ui_modusSetzen', arguments: { modus } } };
      yield { type: 'done', stopReason: 'tool_calls' };
      return;
    }
    const PANEL_WORT: Record<string, string> = {
      kv: 'kvOffen',
      studie: 'studieOffen',
      sonne: 'sonneOffen',
      submission: 'submissionOffen',
      bauablauf: 'bauablaufOffen',
      mängel: 'maengelOffen',
      mangel: 'maengelOffen',
      liste: 'listeOffen',
      raster: 'rasterOffen',
      splat: 'splatPanelOffen',
      export: 'exportMenuOffen',
      projekt: 'projektMenuOffen',
    };
    const panelMatch = text.match(
      /öffne.*?(kv|studie|sonne|submission|bauablauf|mängel|mangel|liste|raster|splat|export|projekt)[- ]?panel/,
    );
    if (panelMatch) {
      const panel = PANEL_WORT[panelMatch[1]!]!;
      yield { type: 'text', delta: 'Ich öffne das Panel. ' };
      yield { type: 'tool_call', call: { id: 'call_mock_panel', name: 'ui_panelSetzen', arguments: { panel, offen: true } } };
      yield { type: 'done', stopReason: 'tool_calls' };
      return;
    }
    const stapel = text.match(/stap\w*.*?(\d+)|(\d+).*?stap\w*/);
    if (text.includes('stapel') || text.includes('staple')) {
      const anzahl = Math.min(20, Math.max(1, Number(stapel?.[1] ?? stapel?.[2] ?? 1)));
      yield { type: 'text', delta: `Ich staple das Geschoss ${anzahl}×. ` };
      yield {
        type: 'tool_call',
        call: { id: 'call_stapel', name: 'design_geschossKopieren', arguments: { anzahl } },
      };
      yield { type: 'done', stopReason: 'tool_calls' };
      return;
    }
    if (text.includes('fenster') && text.includes('stanz')) {
      yield { type: 'text', delta: 'Ich stanze die Fenster aus dem Fassadenmodul. ' };
      yield {
        type: 'tool_call',
        call: { id: 'call_stanzen', name: 'design_fensterAusModulen', arguments: { modul: null } },
      };
      yield { type: 'done', stopReason: 'tool_calls' };
      return;
    }
    if (text.includes('wände') && text.includes('bau')) {
      yield { type: 'text', delta: 'Ich baue die Wände aus den Räumen. ' };
      yield {
        type: 'tool_call',
        call: { id: 'call_waende', name: 'design_waendeAusZonen', arguments: {} },
      };
      yield { type: 'done', stopReason: 'tool_calls' };
      return;
    }
    if (text.includes('haus')) {
      yield { type: 'text', delta: 'Gerne — ich schlage ein 8×12-Haus mit Walmdach als ein Paket vor. ' };
      const W = (i: number, a: { x: number; y: number }, b: { x: number; y: number }) => ({
        type: 'tool_call' as const,
        call: { id: `call_haus_${i}`, name: 'design_wandZeichnen', arguments: { a, b } },
      });
      yield W(0, { x: 0, y: 0 }, { x: 8000, y: 0 });
      yield W(1, { x: 8000, y: 0 }, { x: 8000, y: 12000 });
      yield W(2, { x: 8000, y: 12000 }, { x: 0, y: 12000 });
      yield W(3, { x: 0, y: 12000 }, { x: 0, y: 0 });
      yield {
        type: 'tool_call',
        call: {
          id: 'call_haus_4',
          name: 'design_oeffnungSetzen',
          arguments: { wallId: '$neu:0', openingType: 'fenster', center: 4000, width: 1800, height: 1400, sill: 900 },
        },
      };
      yield {
        type: 'tool_call',
        call: {
          id: 'call_haus_5',
          name: 'design_dachErstellen',
          arguments: {
            outline: [
              { x: 0, y: 0 }, { x: 8000, y: 0 }, { x: 8000, y: 12000 }, { x: 0, y: 12000 },
            ],
            pitch: 35,
          },
        },
      };
      yield { type: 'done', stopReason: 'tool_calls' };
      return;
    }
    const wall = text.match(
      /wand.*?von\s*\(?(-?\d+)[.,]?\s*(-?\d+)\)?\s*(?:nach|bis|zu)\s*\(?(-?\d+)[.,]?\s*(-?\d+)\)?/,
    );
    await new Promise((r) => setTimeout(r, 60));
    if (wall) {
      yield { type: 'text', delta: 'Gerne — ich zeichne die Wand ein. ' };
      yield {
        type: 'tool_call',
        call: {
          id: 'call_mock_1',
          name: 'design_wandZeichnen',
          arguments: {
            a: { x: Number(wall[1]) * 1000, y: Number(wall[2]) * 1000 },
            b: { x: Number(wall[3]) * 1000, y: Number(wall[4]) * 1000 },
          },
        },
      };
      yield { type: 'done', stopReason: 'tool_calls' };
      return;
    }
    yield {
      type: 'text',
      delta:
        'Ich bin der eingebaute Demo-Modus (keine Verbindung zur HomeStation). Sag zum Beispiel: «Zeichne eine Wand von 0,0 nach 8,0».',
    };
    yield { type: 'done', stopReason: 'stop' };
  }
}
