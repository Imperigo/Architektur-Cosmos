import type { ChatProvider, ChatRequest, StreamEvent } from './provider';

/**
 * ScriptedProvider (v0.6.7 Phase 0) — spielt ein vordefiniertes Szenario
 * durch den ECHTEN `ChatSession`-Pfad: Text + Tool-Call-Paket geht genau wie
 * beim `MockProvider`/einem echten Modell durch Validierung → Defaults →
 * Diff-Karten-Proposals → Freigabe → Tool-Resultat → nächster Zug. Anders als
 * der `MockProvider` (Regex-Heuristik auf freien Text) spielt dieser Provider
 * ein FESTES Drehbuch ab — nützlich für Demos/Vorführ-Szenarien und für E2E-
 * Kampagnen, die reproduzierbare Kosmo-Antworten brauchen, ohne die
 * `MockProvider`-Regex-Trigger (die weiter unangetastet bleiben) zu missbrauchen.
 */

/** Ein Zug im Szenario: Kosmo-Text + optional ein Paket Tool-Aufrufe. */
export interface SkriptZug {
  /**
   * Was die Nutzer-Eingabe zu diesem Zug (grob) enthalten sollte — rein
   * dokumentarisch/defensiv: eine Abweichung bricht das Skript NICHT (der
   * Zug wird trotzdem gespielt), aber der Antworttext trägt einen ehrlichen
   * Hinweis, damit ein Abspiel-Protokoll den Unterschied sieht.
   */
  nutzerErwartung?: RegExp | string;
  /** Text, den Kosmo zu diesem Zug sagt (VOR den Tool-Aufrufen). */
  antwortText: string;
  /** Tool-Aufrufe dieses Zugs — mehrere = ein Paket (eine Diff-Karten-Kette). */
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>;
}

export interface SzenarioSkript {
  id: string;
  zuege: SkriptZug[];
}

export type SkriptRegistry = Record<string, SzenarioSkript>;

/**
 * Aktivierung (Owner-Vorgabe): `localStorage['kosmo.llm'] = {"provider":
 * "scripted","skriptId":"..."}`; die eigentlichen Skripte kommen NICHT aus
 * localStorage (zu gross/strukturiert für Strings), sondern aus einer
 * globalen Registry `window.__kosmoSkripte[skriptId]` — E2E setzt sie vor
 * dem Laden der Seite via `addInitScript`.
 */
function globaleSkriptRegistry(): SkriptRegistry {
  if (typeof window === 'undefined') return {};
  const w = window as unknown as { __kosmoSkripte?: SkriptRegistry };
  return w.__kosmoSkripte ?? {};
}

function passtNutzerErwartung(erwartung: RegExp | string | undefined, text: string): boolean {
  if (erwartung === undefined) return true;
  if (typeof erwartung === 'string') return text.toLowerCase().includes(erwartung.toLowerCase());
  if (erwartung instanceof RegExp) return erwartung.test(text);
  // Defensiv: eine RegExp überlebt die JSON-Serialisierung von Playwright-
  // `evaluate`/`addInitScript`-Argumenten nicht (kommt als leeres Objekt an).
  // Das darf einen Skript-Lauf nie brechen — gilt als «passt».
  return true;
}

export class ScriptedProvider implements ChatProvider {
  readonly id = 'scripted';
  /** Zug-Index lebt AM Provider-Objekt (kein Modul-Global) — mehrere
   * Sessions/Provider-Instanzen (z.B. zwei Tabs) laufen unabhängig. */
  private zugIndex = 0;

  constructor(
    private skriptId: string,
    /** Für Unit-Tests: Skripte direkt statt über `window.__kosmoSkripte`
     * reichen (Node-Testumgebung kennt kein `window`). E2E lässt das weg. */
    private registry?: SkriptRegistry,
  ) {}

  private skript(): SzenarioSkript | undefined {
    const reg = this.registry ?? globaleSkriptRegistry();
    return reg[this.skriptId];
  }

  async *chat(req: ChatRequest): AsyncIterable<StreamEvent> {
    const skript = this.skript();
    if (!skript) {
      yield {
        type: 'text',
        delta: `Unbekanntes Skript «${this.skriptId}» — kein Szenario unter diesem Namen hinterlegt (window.__kosmoSkripte).`,
      };
      yield { type: 'done', stopReason: 'stop' };
      return;
    }

    const lastMsg = req.messages[req.messages.length - 1];

    // Folge-Turn NACH Tool-Resultaten (Freigabe/Ausführung ist durch) —
    // ChatSession ruft `chat()` erneut mit der letzten Nachricht role='tool'.
    // Kurz quittieren, dann auf die nächste Nutzer-Nachricht (nächster Zug) warten.
    if (lastMsg?.role === 'tool') {
      await new Promise((r) => setTimeout(r, 20));
      this.zugIndex++;
      const fertig = this.zugIndex >= skript.zuege.length;
      yield {
        type: 'text',
        delta: fertig
          ? `Erledigt. Das Skript «${skript.id}» ist damit durchgespielt — kein weiterer Zug hinterlegt.`
          : 'Erledigt — weiter mit dem nächsten Schritt.',
      };
      yield { type: 'done', stopReason: 'stop' };
      return;
    }

    // Neuer Zug (Antwort auf eine Nutzer-Nachricht).
    if (this.zugIndex >= skript.zuege.length) {
      yield {
        type: 'text',
        delta: `Das Skript «${skript.id}» ist bereits zu Ende — ich habe keine weiteren Züge.`,
      };
      yield { type: 'done', stopReason: 'stop' };
      return;
    }

    const zug = skript.zuege[this.zugIndex]!;
    const letzteNutzerNachricht = [...req.messages].reverse().find((m) => m.role === 'user');
    const erwartungOk = passtNutzerErwartung(zug.nutzerErwartung, letzteNutzerNachricht?.content ?? '');
    const hinweis = erwartungOk
      ? ''
      : ` (Hinweis: erwartete Nutzer-Eingabe passte nicht — Zug wird trotzdem gespielt.)`;

    yield { type: 'text', delta: zug.antwortText + hinweis };
    let i = 0;
    for (const tc of zug.toolCalls) {
      yield {
        type: 'tool_call',
        call: { id: `scripted_${skript.id}_${this.zugIndex}_${i}`, name: tc.name, arguments: tc.args },
      };
      i++;
    }
    if (zug.toolCalls.length === 0) {
      // Kein Paket in diesem Zug — ChatSession ruft `chat()` NICHT erneut
      // (keine Tool-Calls), also gleich zum nächsten Zug weiterzählen.
      this.zugIndex++;
    }
    yield { type: 'done', stopReason: zug.toolCalls.length > 0 ? 'tool_calls' : 'stop' };
  }
}
