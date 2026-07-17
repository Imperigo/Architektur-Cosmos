import { allCommands, type KosmoDoc } from '@kosmo/kernel';
import type { ChatMessage, ChatProvider, ToolCall, ToolDefinition } from './provider';
import { commandIdFor, commandTools, modelQueryTool, validateToolCall, type CommandToolsOptionen, type ValidatedCall } from './tools';
import { routePersona } from './personas';
import { baueSystemprompt, dossierBlock, rolleBlock, projektKontextBlock } from './systemprompt';
import {
  klassifiziereZug,
  rolleFuerAufgabe,
  staffelungIstZusammengefasst,
  type Aufgabenklasse,
  type KosmoRolle,
  type StaffelungKonfig,
} from './staffelung';

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
  /**
   * v0.8.2/P3 (additiv, `docs/V082-SPEZ.md` §4.2/C-21) — reiner
   * Beobachter-Hook: feuert NUR wenn `validateToolCall` (unten, Z. ~165)
   * einen Aufruf annimmt, dessen rohe Modell-Argumente KEIN valides JSON
   * waren (Markdown-Zaun/`jsonrepair` haben ihn gerettet, `tools.ts`) —
   * BEVOR das Ergebnis als schreibender Vorschlag weiterläuft. Ändert den
   * bestehenden Fehlerpfad (ungültig bleibende Aufrufe) nicht. Optional —
   * bestehende Aufrufer/Tests ohne `onReparatur` bleiben unverändert.
   */
  onReparatur?(vorher: unknown, nachher: ValidatedCall): void;
  /**
   * v0.8.2/P3 (additiv, §6.3 B1 «req.signal-Stop-Knopf») — der Stop-Knopf
   * hat den laufenden Stream abgebrochen. EIGENES Ereignis statt `onError`:
   * ein bewusster Nutzer-Abbruch ist kein Netzfehler — der bestehende
   * `onError`-Aufrufer (`KosmoPanel.tsx`) böte bei ollama/lmstudio sonst
   * unpassend die Cloud als Fallback an. Optional — bestehende 189 Tests
   * ohne `onAborted` bleiben unverändert grün (nichts ruft `stopStream()`).
   */
  onAborted?(): void;
  /**
   * v0.8.2/P6 (additiv, `docs/V082-SPEZ.md` §6.7, Owner-Entscheid 3/C-3/C-11)
   * — feuert am Ende JEDES abgeschlossenen `turn()` mit der automatisch
   * bestimmten Aufgabenklasse + Rolle (`staffelung.ts#klassifiziereZug`/
   * `rolleFuerAufgabe`). Reiner Beobachter, wie `onReparatur`/`onAborted`:
   * ändert nichts an `schreibend`/`toolCalls`/dem bestehenden Kontrollfluss.
   * Solange dem Konstruktor KEIN `staffelungKonfig` mit echter Rollen-Modell-
   * Karte übergeben wird (heutiger App-Normalfall, EIN konfiguriertes
   * Modell), bleibt `einModellBetrieb: true` — die Rolle ist dann ein
   * ehrliches Etikett, KEIN Modellwechsel/Provider-Wechsel findet statt.
   * Optional — bestehende 219 KI-Tests ohne `onRolle` bleiben unverändert grün.
   */
  onRolle?(info: ZugRolle): void;
}

/**
 * v0.8.2/P6 (additiv, §6.7) — das Ergebnis der automatischen Zug-
 * Klassifikation, wie es der `onRolle`-Beobachter oben erhält.
 */
export interface ZugRolle {
  klasse: Aufgabenklasse;
  rolle: KosmoRolle;
  /** `true` = keine echte Rollen-Modell-Karte konfiguriert (oder Karte fällt
   * auf dasselbe Modell zusammen) — die Rolle ist reines Etikett. */
  einModellBetrieb: boolean;
}

/**
 * §4.2 (additiv) — erkennt, ob `validateToolCall` die rohen Modell-Argumente
 * reparieren MUSSTE (Markdown-Zaun-Strip oder `jsonrepair`, `tools.ts`
 * Z. 232-247): wahr, wenn die Argumente ein String waren, der NICHT direkt
 * `JSON.parse`-bar ist. Duplikat-frei zur eigentlichen Reparatur (die bleibt
 * exklusiv in `tools.ts`) — hier nur ein reiner, seiteneffektfreier Check,
 * damit `chat.ts` den Hook auslösen kann, ohne `tools.ts`s Rückgabeform zu
 * erweitern (additiv, kein Vertragswechsel dort).
 */
function brauchteReparatur(rohArgs: unknown): boolean {
  if (typeof rohArgs !== 'string') return false;
  try {
    JSON.parse(rohArgs);
    return false;
  } catch {
    return true;
  }
}

export class ChatSession {
  private messages: ChatMessage[] = [];
  private pending = new Map<string, ValidatedCall & { callId: string }>();
  private tools: ToolDefinition[];
  private queryTool: ReturnType<typeof modelQueryTool>;
  private readTools: Map<string, ReadTool>;
  /** v0.8.2/P3 B1 (additiv): Controller des GERADE laufenden `turn()` —
   * `stopStream()` bricht genau diesen ab, `null` wenn nichts läuft. */
  private currentAbort: AbortController | null = null;

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
    /**
     * v0.8.2/P6 (additiv, §6.7): OPTIONALE Rollen-Modell-Karte für den
     * `onRolle`-Beobachter (`einModellBetrieb`-Ableitung über
     * `staffelungIstZusammengefasst`). Fehlt sie (heutiger App-Normalfall),
     * gilt die Sitzung immer als Ein-Modell-Betrieb — ehrlich, weil ohne
     * Karte auch keine echte Differenzierung existiert.
     */
    private staffelungKonfig?: StaffelungKonfig,
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
    // v0.8.2/P3 B1 (additiv, `docs/V082-SPEZ.md` §6.3 — `req.signal` endlich
    // verdrahtet): eigener Abort JE Zug. Netz-Provider (Ollama/Anthropic/
    // LM-Studio, `provider.ts`/`anthropic.ts`/`openai-kompatibel.ts`) canceln
    // ihren Fetch/Reader bereits selbst über `req.signal` — die Schleife
    // unten prüft das Signal zusätzlich bei jedem Chunk, damit auch ein
    // Provider ohne eigene Signal-Prüfung (`MockProvider`, Tests/Demo) den
    // sichtbaren Stream sofort beendet: ein ehrlicher Abbruch (Konsum stoppt
    // sofort), keine Attrappe. Inert, solange niemand `stopStream()` ruft —
    // ändert nichts am Verhalten der bestehenden 189 Tests.
    const abort = new AbortController();
    this.currentAbort = abort;
    let abbruchGemeldet = false;

    try {
      for await (const ev of this.provider.chat({ messages: this.messages, tools: this.tools, signal: abort.signal })) {
        if (abort.signal.aborted) break;
        if (ev.type === 'text') {
          assistantText += ev.delta;
          this.events.onText(ev.delta);
        } else if (ev.type === 'tool_call') {
          toolCalls.push(ev.call);
        } else if (ev.type === 'done' && ev.stopReason === 'error') {
          this.events.onError(ev.error ?? 'Unbekannter Fehler');
          abbruchGemeldet = true;
        }
      }
      if (abort.signal.aborted && !abbruchGemeldet) {
        this.events.onAborted?.();
      }
    } finally {
      this.events.onBusy(false);
      if (this.currentAbort === abort) this.currentAbort = null;
    }

    this.messages.push({
      role: 'assistant',
      content: assistantText,
      ...(toolCalls.length ? { toolCalls } : {}),
    });

    if (toolCalls.length === 0) {
      // v0.8.2/P6 (additiv, §6.7 C-3/C-11): Klassifikation greift auch für
      // einen reinen Text-Zug OHNE jeden Tool-Aufruf (chat-standard/
      // strategie-urteil) — vor diesem bestehenden Early-Return, damit
      // `onRolle` auch für den häufigsten Fall (blosse Antwort) feuert.
      // NICHT bei einem abgebrochenen Zug (kein echter «Zug» im Sinn des
      // Badges, `onAborted` deckt diesen Fall bereits ab).
      if (!abort.signal.aborted) this.meldeRolle(0, false);
      return;
    }
    if (abort.signal.aborted) return;

    let needsContinue = false;
    // v0.8.2/P6 (additiv, §6.7): reine Beobachtungs-Variable für die
    // Zug-Klassifikation unten — `true`, sobald mindestens EIN Lese-Werkzeug
    // (modell_lesen/ReadTool) in diesem Zug lief. Ändert nichts an der
    // Verzweigung selbst, nur eine zusätzliche Zeile je Lese-Zweig.
    let lesendAufgerufen = false;
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
        lesendAufgerufen = true;
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
        lesendAufgerufen = true;
        continue;
      }
      const withDefaults = this.applyDefaults(call);
      const validated = validateToolCall(withDefaults, this.doc);
      // §4.2 (additiv): reiner Beobachter — feuert VOR dem Weiterlaufen als
      // schreibender Vorschlag, ändert an `validated`/dem Fehlerpfad unten nichts.
      if (validated.ok && brauchteReparatur(withDefaults.arguments)) {
        this.events.onReparatur?.(withDefaults.arguments, validated);
      }
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
    // v0.8.2/P6 (additiv, §6.7 C-3/C-11): automatische Aufgabenklassen-
    // Klassifikation für DIESEN Zug — reines Etikett für den `onRolle`-
    // Beobachter, ändert nichts an `schreibend`/`toolCalls`/dem Kontrollfluss
    // oben oder unten.
    this.meldeRolle(schreibend.length, schreibend.length === 0 && lesendAufgerufen);

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

  /**
   * v0.8.2/P6 (additiv, §6.7 C-3/C-11): baut die Klassifikation für DIESEN
   * Zug (`klassifiziereZug`, `staffelung.ts`) und feuert `onRolle`, falls der
   * Aufrufer den Hook gesetzt hat — sonst ein No-Op (kein Aufwand für
   * bestehende Aufrufer ohne `onRolle`). Zwei Aufrufstellen in `turn()`
   * (reiner Text-Zug ohne Tool-Aufruf vs. Zug mit Tool-Aufrufen), dieselbe
   * Logik an beiden.
   */
  private meldeRolle(schreibendAnzahl: number, nurLesendAufgerufen: boolean): void {
    if (!this.events.onRolle) return;
    const letzterUserText = [...this.messages].reverse().find((m) => m.role === 'user')?.content;
    const klasse = klassifiziereZug({
      userText: typeof letzterUserText === 'string' ? letzterUserText : '',
      schreibendAnzahl,
      nurLesendAufgerufen,
    });
    const rolle = rolleFuerAufgabe(klasse);
    const einModellBetrieb = this.staffelungKonfig ? staffelungIstZusammengefasst(this.staffelungKonfig) : true;
    this.events.onRolle({ klasse, rolle, einModellBetrieb });
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

  /**
   * v0.8.2/P3 (additiv, B1 «Stop-Knopf») — bricht den GERADE laufenden Zug
   * ab, No-Op wenn gerade keiner läuft (z.B. Doppelklick nach Fertigstellung).
   */
  stopStream(): void {
    this.currentAbort?.abort();
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
