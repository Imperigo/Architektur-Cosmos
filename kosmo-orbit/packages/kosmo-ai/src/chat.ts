import { allCommands, type KosmoDoc } from '@kosmo/kernel';
import type { ChatMessage, ChatProvider, ToolCall, ToolDefinition } from './provider';
import { commandIdFor, commandTools, modelQueryTool, validateToolCall, type CommandToolsOptionen, type ValidatedCall } from './tools';
import { routePersona } from './personas';
import { baueSystemprompt, dossierBlock, rolleBlock, projektKontextBlock } from './systemprompt';

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
    /**
     * Zusätzlicher Prompt-Baustein oberster Priorität («Kritik-Journal»,
     * z.B. `journal.toPromptBlock()`) — geht als höchstpriorisierter Block in
     * `baueSystemprompt()` ein (§3 Kandidat 4, `docs/V081-SPEZ.md`).
     * String bleibt erlaubt (rückwärtskompatibel, wie bisher einmalig
     * berechnet); eine Funktion `() => string` wird JEDEN Zug frisch
     * aufgerufen — das macht z.B. ein Lernjournal, das sich zwischen zwei
     * Chat-Zügen ändert, sofort sichtbar statt erst nach einem Session-Neubau.
     */
    private systemSuffix: string | (() => string) = '',
    /** Kuratierung der Command-Werkzeuge (z.B. `{ ohne: [...] }` — die App
     * entscheidet und begründet, WAS Kosmo nicht vorschlagen soll). */
    toolOptionen?: CommandToolsOptionen,
  ) {
    this.queryTool = modelQueryTool(doc, contextDefaults);
    this.readTools = new Map(extraReadTools.map((t) => [t.name, t]));
    this.tools = [
      { name: this.queryTool.name, description: this.queryTool.description, parameters: this.queryTool.parameters },
      ...extraReadTools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })),
      ...commandTools(toolOptionen),
    ];
    if (systemPrompt) this.messages.push({ role: 'system', content: systemPrompt });
  }

  get history(): readonly ChatMessage[] {
    return this.messages;
  }

  /**
   * `images` (v0.6.8 «Kosmo sieht mit», optional): der von der App erfasste
   * Stations-Blick, ans user-Message-Objekt gehängt — additiv, exakt wie
   * `ChatMessage.images` selbst. exactOptionalPropertyTypes: konditionaler
   * Spread statt `images: images ?? undefined` (der würde das Feld explizit
   * auf `undefined` setzen, was der strikte Optional-Typ nicht erlaubt).
   */
  async send(userText: string, images?: ChatMessage['images']): Promise<void> {
    const { persona, cleaned } = routePersona(userText);
    // Persona-Wechsel: Systemprompt der Runde austauschen (eine sichtbare Stimme).
    // Frisch gebaut JEDEN Zug (nicht einmalig bei Session-Bau) — Priorität
    // Kritik-Journal > Dossier-NO-GOs > Rolle > Kontext, budgetiert (§3
    // Kandidat 4, `docs/V081-SPEZ.md`): der Suffix-Lieferant löst z.B. ein
    // sich änderndes Lernjournal jeden Zug neu auf; Dossier/Rolle/Kontext
    // kommen direkt aus dem aktuellen Doc-Stand.
    const suffixText = typeof this.systemSuffix === 'function' ? this.systemSuffix() : this.systemSuffix;
    const system = baueSystemprompt(persona.systemPrompt, [
      { label: 'kritik-journal', text: suffixText },
      { label: 'dossier-nogo', text: dossierBlock(this.doc) },
      { label: 'rolle', text: rolleBlock(this.doc) },
      { label: 'kontext', text: projektKontextBlock(this.doc) },
    ]);
    if (this.messages[0]?.role === 'system') {
      this.messages[0] = { role: 'system', content: system };
    } else {
      this.messages.unshift({ role: 'system', content: system });
    }
    this.messages.push({ role: 'user', content: cleaned, ...(images && images.length > 0 ? { images } : {}) });
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
    // Sim-Befund 0.6.7 (Journey A, H-Reihe): Kontext-Defaults dürfen nur
    // PFLICHT-Felder des Ziel-Commands füllen. Der frühere blinde Merge
    // stopfte z.B. die Wand-Aufbau-Id des App-Kontexts in das OPTIONALE
    // `assemblyId` von design.deckeZeichnen — dessen run() lehnt einen
    // Nicht-slab-Aufbau zu Recht ab, und der Schritt scheiterte erst beim
    // Anwenden, für den Nutzer ohne erkennbaren Grund.
    const cmd = allCommands().find((c) => c.id === commandIdFor(call.name));
    const shape = (
      cmd?.params as unknown as { shape?: Record<string, { isOptional(): boolean }> } | undefined
    )?.shape;
    const merged: Record<string, unknown> = { ...(args as Record<string, unknown>) };
    for (const [k, v] of Object.entries(defaults)) {
      if (merged[k] !== undefined && merged[k] !== '') continue;
      const feld = shape?.[k];
      if (!feld || feld.isOptional()) continue;
      merged[k] = v;
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
