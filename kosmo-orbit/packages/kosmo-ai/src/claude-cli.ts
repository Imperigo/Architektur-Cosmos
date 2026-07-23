/**
 * Claude-Abo-CLI-Provider (P-F3, Owner-Punkt 23.07.2026 «claude-abo 401»).
 *
 * **WURZEL des behobenen Fehlers:** «Mit claude-abo anmelden» führte zu
 * «Anthropic antwortet mit 401» — nach dem CLI-Login (`claude auth login
 * --claudeai`, `src-tauri/src/lib.rs`) baute `baueChatProvider()` (App-Shell)
 * einen `AnthropicProvider` mit dem gelesenen OAuth-Token als `oauthToken`,
 * der DIREKT per `fetch` gegen `api.anthropic.com` sprach (`anthropic.ts`).
 * Das Abo-Token ist aber kein API-Schlüssel — Anthropic weist es dort
 * korrekt mit 401 zurück, unabhängig vom `anthropic-beta`-Header.
 *
 * **Lösung (Fable-Vorentscheid, bindend):** im Abo-Modus wird die LOKAL
 * installierte `claude`-CLI der Motor — diese Klasse spricht NIE mehr selbst
 * HTTP mit dem Abo-Token. Sie ruft stattdessen den Tauri-Command
 * `claude_cli_chat` (`src-tauri/src/lib.rs`, dort auch die vollständige
 * CLI-Flag-Dokumentation mit den live geprüften `--help`-Belegen), der die
 * CLI als Subprozess startet und ihre Text-Antwort per Tauri-Event streamt.
 *
 * **Werkzeug-Grenze (v1, ehrlich deklariert):** `commandTools()`
 * (Kosmo-Kernel-Commands, `chat.ts` baut sie IMMER in `req.tools`) sind mit
 * dieser CLI NICHT verdrahtet — der Rust-Command schaltet über `--tools ""`
 * jedes eingebaute CLI-Werkzeug bewusst ab (Sicherheitsentscheidung: der
 * Subprozess darf auf dem Architekten-Gerät nie selbständig Bash/Edit/Read
 * ausführen). Reicht `ChatSession` trotzdem `req.tools` mit Einträgen herein
 * (Normalfall), antwortet dieser Provider TROTZDEM — nur ohne jeden
 * Tool-Aufruf — und hängt EINMALIG pro Provider-Instanz (nicht pro Zug) einen
 * ehrlichen Hinweis vor die allererste Text-Antwort: Kosmo schlägt im
 * Abo-Modus keine Diff-Karten vor. Ein deklarierter Folgeposten, keine
 * stille Lücke.
 *
 * **Nur Desktop:** ausserhalb von Tauri (Web/iPad, kein
 * `__TAURI_INTERNALS__`) wirft `chat()` nichts, sondern `yield`et sofort
 * einen `done`-Fehler mit demselben Wortlaut wie `cloud-login.ts`s
 * `claudeAboAnmeldung()` — `ChatSession.turn()` konsumiert nur `StreamEvent`s
 * und zeigt den Text als Fehlermeldung im Chat, nie eine unbehandelte
 * Exception.
 *
 * **Kein Multi-Turn-Sessionzustand auf CLI-Seite:** `ChatSession.send()`
 * baut bei JEDEM Zug den vollen `messages`-Verlauf neu (Persona/Dossier/
 * Kritik-Journal können sich zwischen zwei Zügen ändern, `chat.ts`s `send()`).
 * Statt fragil `--resume <session-id>` über mehrere `-p`-Aufrufe zu
 * verketten, baut `baueTranskript()` bei JEDEM Aufruf einen vollständigen
 * Klartext-Verlauf als EINEN `-p`-Prompt — zustandslos, ein Subprozess pro
 * Zug, exakt nachvollziehbar aus dem Kosmo-eigenen Verlauf.
 */
import type { ChatMessage, ChatProvider, ChatRequest, StreamEvent } from './provider';

/** Einmaliger Hinweistext (v1-Werkzeug-Grenze) — Konstante, damit UI-Text und
 *  Tests denselben Wortlaut prüfen können. */
export const CLAUDE_CLI_TOOL_HINWEIS =
  'ℹ️ Claude-Abo (lokale CLI) schlägt in dieser Version keine Werkzeug-/Diff-Karten vor — reiner Chat. ';

/** Web/iPad-Fehlertext (kein Tauri) — derselbe Wortlaut wie `cloud-login.ts`s
 *  `claudeAboAnmeldung()`, damit die Ehrlichkeitsbotschaft app-weit konsistent
 *  bleibt. */
export const CLAUDE_CLI_WEB_FEHLER =
  'Claude-Abo läuft nur in der Desktop-App — im Web bitte API-Schlüssel verwenden.';

export interface ClaudeCliConfig {
  model: string;
}

/**
 * Läuft die App als Tauri-Desktop-Build? Identische Prüfung wie
 * `cloud-login.ts#istTauriDesktop` (dort für den Login-Knopf, hier für den
 * Chat-Motor) — bewusst dupliziert statt importiert: `@kosmo/ai` bleibt frei
 * von einer Abhängigkeit auf `apps/kosmo-orbit/src/shell`.
 */
function istTauriDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Reine Bau-Funktion (unit-testbar ohne Tauri/DOM): der volle
 * `ChatMessage[]`-Verlauf → `{system, prompt}` für einen `-p`-CLI-Aufruf.
 * `system` kommt 1:1 aus der `role:'system'`-Nachricht (von `chat.ts` bei
 * JEDEM Zug frisch gebaut). `prompt` ist ein Klartext-Transkript aus
 * user/assistant-Zügen; eine `role:'tool'`-Nachricht taucht bei DIESEM
 * Provider selbst nie auf (er meldet nie `tool_call`-Events) — sie könnte nur
 * auftauchen, wenn zuvor in DERSELBEN `ChatSession` ein ANDERER Provider mit
 * echten Werkzeugen lief (Provider-Wechsel mitten im Gespräch, Randfall) —
 * sichtbar als eigene Zeile statt stillschweigend verworfen.
 */
export function baueTranskript(messages: ChatMessage[]): { system: string | undefined; prompt: string } {
  let system: string | undefined;
  const zeilen: string[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      system = m.content;
    } else if (m.role === 'user') {
      zeilen.push(`Du: ${m.content}`);
    } else if (m.role === 'assistant') {
      if (m.content) zeilen.push(`Kosmo: ${m.content}`);
    } else {
      zeilen.push(`[Werkzeug-Ergebnis «${m.toolName ?? '?'}»]: ${m.content}`);
    }
  }
  return { system, prompt: zeilen.join('\n\n') };
}

/**
 * Minimaler async Push/Pull-Kanal für die Tauri-Event→Generator-Brücke:
 * `push()` (im Event-Listener) darf VOR oder NACH einem wartenden `next()`
 * aufgerufen werden, beide Reihenfolgen liefern korrekt. Kein Vertrag mit
 * Fremdcode — rein intern für `ClaudeCliProvider.chat()` unten.
 */
class Warteschlange<T> {
  private puffer: T[] = [];
  private wartend: ((r: IteratorResult<T>) => void)[] = [];
  private geschlossen = false;

  push(wert: T): void {
    if (this.wartend.length > 0) this.wartend.shift()!({ value: wert, done: false });
    else this.puffer.push(wert);
  }

  schliessen(): void {
    this.geschlossen = true;
    while (this.wartend.length > 0) this.wartend.shift()!({ value: undefined as never, done: true });
  }

  next(): Promise<IteratorResult<T>> {
    if (this.puffer.length > 0) return Promise.resolve({ value: this.puffer.shift()!, done: false });
    if (this.geschlossen) return Promise.resolve({ value: undefined as never, done: true });
    return new Promise((resolve) => this.wartend.push(resolve));
  }
}

export class ClaudeCliProvider implements ChatProvider {
  readonly id = 'claude-cli';
  /** Einmaliger Werkzeug-Hinweis (v1-Grenze) — je Provider-INSTANZ, nicht je
   *  Zug: eine `ClaudeCliProvider`-Instanz lebt so lange wie die `ChatSession`
   *  (`baueChatProvider()`-`useMemo`), darum reicht ein Feld hier. */
  private hinweisGegeben = false;

  constructor(private cfg: ClaudeCliConfig) {}

  async *chat(req: ChatRequest): AsyncIterable<StreamEvent> {
    if (!istTauriDesktop()) {
      yield { type: 'done', stopReason: 'error', error: CLAUDE_CLI_WEB_FEHLER };
      return;
    }

    const { system, prompt } = baueTranskript(req.messages);
    const brauchtHinweis = !this.hinweisGegeben && (req.tools?.length ?? 0) > 0;
    if (brauchtHinweis) this.hinweisGegeben = true;

    const { invoke } = await import('@tauri-apps/api/core');
    const { listen } = await import('@tauri-apps/api/event');

    const anfrageId = `pf3-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const queue = new Warteschlange<string>();
    const unlisten = await listen<{ anfrageId: string; text: string }>('claude-cli-delta', (ev) => {
      if (ev.payload.anfrageId === anfrageId) queue.push(ev.payload.text);
    });

    let fehlerText: string | undefined;
    const aufruf = invoke('claude_cli_chat', {
      anfrageId,
      prompt,
      systemPrompt: system,
      model: this.cfg.model,
    })
      .catch((err: unknown) => {
        fehlerText = err instanceof Error ? err.message : String(err);
      })
      .finally(() => queue.schliessen());

    try {
      let ersterDelta = true;
      for (;;) {
        const ergebnis = await queue.next();
        if (ergebnis.done) break;
        let text = ergebnis.value;
        if (ersterDelta && brauchtHinweis) text = `${CLAUDE_CLI_TOOL_HINWEIS}${text}`;
        ersterDelta = false;
        yield { type: 'text', delta: text };
      }
      await aufruf;
      if (fehlerText) {
        yield { type: 'done', stopReason: 'error', error: fehlerText };
        return;
      }
      // Randfall: Hinweis fällig, aber der Zug lieferte NULL Text-Deltas
      // (z. B. eine leere Antwort) — der Hinweis darf trotzdem nicht verloren
      // gehen (Owner-Mandat: der Hinweis ist Pflicht, sobald Tools angeboten
      // wurden, unabhängig vom Antwortinhalt).
      if (brauchtHinweis && ersterDelta) {
        yield { type: 'text', delta: CLAUDE_CLI_TOOL_HINWEIS };
      }
      yield { type: 'done', stopReason: 'stop' };
    } finally {
      unlisten();
    }
  }
}
