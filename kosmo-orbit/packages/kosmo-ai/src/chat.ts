import type { KosmoDoc } from '@kosmo/kernel';
import type { ChatMessage, ChatProvider, ToolCall, ToolDefinition } from './provider';
import { commandTools, modelQueryTool, validateToolCall, type ValidatedCall } from './tools';
import { routePersona } from './personas';

/** Read-Only-Tool: läuft sofort (ungated), z.B. Referenzsuche in KosmoData. */
export interface ReadTool extends ToolDefinition {
  execute(args: unknown): string | Promise<string>;
}

/**
 * ChatSession — der Kosmo-Gesprächsloop mit gatetem Tool-Calling.
 *
 * Lesende Tools (modell_lesen) laufen sofort. Schreibende Tools werden zu
 * Vorschlägen (Diff-Karten): erst wenn der Architekt freigibt, führt die App
 * den Command aus und meldet das Resultat ans Modell zurück — dann spricht
 * Kosmo weiter. Abgelehnte Vorschläge erhält das Modell als Absage.
 */

export interface Proposal {
  callId: string;
  commandId: string;
  params: unknown;
  summary: string;
  /** Aktionskette: mehrere Schritte eines Zugs = EIN Paket (eine Karte, ein Undo). */
  paket?: { id: string; index: number; groesse: number };
}

export interface SessionEvents {
  onText(delta: string): void;
  onProposal(p: Proposal): void;
  onBusy(busy: boolean): void;
  onError(message: string): void;
}

export class ChatSession {
  private messages: ChatMessage[] = [];
  private pending = new Map<string, ValidatedCall & { callId: string }>();
  private tools: ToolDefinition[];
  private queryTool: ReturnType<typeof modelQueryTool>;
  private readTools: Map<string, ReadTool>;

  constructor(
    private provider: ChatProvider,
    private doc: KosmoDoc,
    private events: SessionEvents,
    systemPrompt?: string,
    /** App-Kontext (aktives Geschoss, gewählter Aufbau): füllt fehlende Argumente. */
    private contextDefaults?: () => Record<string, unknown>,
    extraReadTools: ReadTool[] = [],
    /** Wird an jeden Persona-Systemprompt angehängt (z.B. Lernjournal). */
    private systemSuffix = '',
  ) {
    this.queryTool = modelQueryTool(doc);
    this.readTools = new Map(extraReadTools.map((t) => [t.name, t]));
    this.tools = [
      { name: this.queryTool.name, description: this.queryTool.description, parameters: this.queryTool.parameters },
      ...extraReadTools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })),
      ...commandTools(),
    ];
    if (systemPrompt) this.messages.push({ role: 'system', content: systemPrompt });
  }

  get history(): readonly ChatMessage[] {
    return this.messages;
  }

  async send(userText: string): Promise<void> {
    const { persona, cleaned } = routePersona(userText);
    // Persona-Wechsel: Systemprompt der Runde austauschen (eine sichtbare Stimme)
    const system = persona.systemPrompt + this.systemSuffix;
    if (this.messages[0]?.role === 'system') {
      this.messages[0] = { role: 'system', content: system };
    } else {
      this.messages.unshift({ role: 'system', content: system });
    }
    this.messages.push({ role: 'user', content: cleaned });
    await this.turn();
  }

  private async turn(): Promise<void> {
    this.events.onBusy(true);
    let assistantText = '';
    const toolCalls: ToolCall[] = [];

    try {
      for await (const ev of this.provider.chat({ messages: this.messages, tools: this.tools })) {
        if (ev.type === 'text') {
          assistantText += ev.delta;
          this.events.onText(ev.delta);
        } else if (ev.type === 'tool_call') {
          toolCalls.push(ev.call);
        } else if (ev.type === 'done' && ev.stopReason === 'error') {
          this.events.onError(ev.error ?? 'Unbekannter Fehler');
        }
      }
    } finally {
      this.events.onBusy(false);
    }

    this.messages.push({
      role: 'assistant',
      content: assistantText,
      ...(toolCalls.length ? { toolCalls } : {}),
    });

    if (toolCalls.length === 0) return;

    let needsContinue = false;
    const schreibend: { callId: string; commandId: string; params: unknown; summary: string }[] = [];
    for (const call of toolCalls) {
      if (call.name === this.queryTool.name) {
        // Lesend → sofort ausführen
        this.messages.push({
          role: 'tool',
          toolName: call.name,
          content: this.queryTool.execute(),
        });
        needsContinue = true;
        continue;
      }
      const readTool = this.readTools.get(call.name);
      if (readTool) {
        let content: string;
        try {
          content = await readTool.execute(call.arguments);
        } catch (err) {
          content = `FEHLER: ${err instanceof Error ? err.message : String(err)}`;
        }
        this.messages.push({ role: 'tool', toolName: call.name, content });
        needsContinue = true;
        continue;
      }
      const withDefaults = this.applyDefaults(call);
      const validated = validateToolCall(withDefaults, this.doc);
      if (!validated.ok) {
        this.messages.push({
          role: 'tool',
          toolName: call.name,
          content: `FEHLER: ${validated.error}. Korrigiere die Parameter und rufe das Werkzeug genau einmal erneut auf.`,
        });
        needsContinue = true;
        continue;
      }
      // Schreibend → Vorschlag (gated); mehrere im selben Zug = Aktionskette
      schreibend.push({
        callId: call.id,
        commandId: validated.commandId,
        params: validated.params,
        summary: validated.summary,
      });
    }
    const paketId = schreibend.length > 1 ? schreibend[0]!.callId : null;
    for (let i = 0; i < schreibend.length; i++) {
      const v = schreibend[i]!;
      this.pending.set(v.callId, { commandId: v.commandId, params: v.params, summary: v.summary, ok: true, callId: v.callId });
      this.events.onProposal({
        ...v,
        ...(paketId ? { paket: { id: paketId, index: i, groesse: schreibend.length } } : {}),
      });
    }

    if (needsContinue && this.pending.size === 0) {
      await this.turn();
    }
  }

  private applyDefaults(call: ToolCall): ToolCall {
    const defaults = this.contextDefaults?.();
    if (!defaults) return call;
    let args = call.arguments;
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch {
        return call; // Reparatur übernimmt validateToolCall
      }
    }
    if (typeof args !== 'object' || args === null || Array.isArray(args)) return call;
    const merged: Record<string, unknown> = { ...(args as Record<string, unknown>) };
    for (const [k, v] of Object.entries(defaults)) {
      if (merged[k] === undefined || merged[k] === '') merged[k] = v;
    }
    return { ...call, arguments: merged };
  }

  /** Architekt hat freigegeben: App hat den Command ausgeführt. */
  async resolveApplied(callId: string, resultSummary: string): Promise<void> {
    const call = this.pending.get(callId);
    if (!call) return;
    this.pending.delete(callId);
    this.messages.push({
      role: 'tool',
      toolName: call.commandId.replace(/\./g, '_'),
      content: `AUSGEFÜHRT: ${resultSummary}`,
    });
    if (this.pending.size === 0) await this.turn();
  }

  /** Architekt hat abgelehnt. */
  async resolveRejected(callId: string, reason?: string): Promise<void> {
    const call = this.pending.get(callId);
    if (!call) return;
    this.pending.delete(callId);
    this.messages.push({
      role: 'tool',
      toolName: call.commandId.replace(/\./g, '_'),
      content: `ABGELEHNT vom Architekten${reason ? `: ${reason}` : ''}. Nicht erneut versuchen, ausser er bittet darum.`,
    });
    if (this.pending.size === 0) await this.turn();
  }
}
