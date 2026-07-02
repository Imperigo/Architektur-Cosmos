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

export interface OllamaConfig {
  /** z.B. http://homestation:11434 oder via Bridge-Proxy http://bridge:8600/ollama */
  baseUrl: string;
  model: string;
  temperature?: number;
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
          messages: req.messages.map((m) => ({
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
          })),
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
      yield {
        type: 'text',
        delta: lastMsg.content.startsWith('AUSGEFÜHRT')
          ? 'Erledigt — die Wand steht. Soll ich gleich Fenster setzen?'
          : 'Verstanden, ich lasse es.',
      };
      yield { type: 'done', stopReason: 'stop' };
      return;
    }
    const last = [...req.messages].reverse().find((m) => m.role === 'user');
    const text = last?.content.toLowerCase() ?? '';
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
