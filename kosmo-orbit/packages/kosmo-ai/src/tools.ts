import { z } from 'zod';
import { jsonrepair } from 'jsonrepair';
import {
  allCommands,
  formatArea,
  formatLength,
  type Command,
  type KosmoDoc,
  type Storey,
  type Wall,
} from '@kosmo/kernel';
import type { ToolCall, ToolDefinition } from './provider';
import { schaetzeTokens } from './systemprompt';

/**
 * Tool-Registry — die Kernel-Commands werden automatisch zu LLM-Tools.
 * Eine Registry, drei Konsumenten (UI, Palette, LLM): was Kosmo kann, kann
 * der Mensch rückgängig machen. Punkte im Command-Namen werden zu
 * Unterstrichen (Ollama-Tool-Namen erlauben keine Punkte).
 */

export function toolNameFor(commandId: string): string {
  return commandId.replace(/\./g, '_');
}

/**
 * Rückrichtung von `toolNameFor`: jede Command-ID hat die Form
 * `namensraum.aktionCamelCase` — genau EIN Punkt, die Aktion selbst ist
 * lagerweise camelCase (kein weiterer Unterstrich). Der erste Unterstrich
 * im Tool-Namen ist deshalb immer die ursprüngliche Punkt-Stelle, unabhängig
 * vom Namensraum (`design`, `publish`, `vis`, `grundlagen`, künftige …) —
 * vorher war das auf `design_`/`doc_` fest verdrahtet und hätte z.B.
 * `grundlagen_volumenstudie` NICHT zurück auf `grundlagen.volumenstudie`
 * aufgelöst (Werkzeug wäre in `commandTools()` gelistet, aber
 * `validateToolCall` hätte es nie gefunden — Batch D4 deckte das auf).
 */
export function commandIdFor(toolName: string): string {
  return toolName.replace('_', '.');
}

export interface CommandToolsOptionen {
  /** Command-IDs, die NICHT als Kosmo-Werkzeug erscheinen sollen (z.B. destruktive/
   * technische Commands, die die App bewusst ausschliesst — Begründung am Aufrufort). */
  ohne?: readonly string[];
}

/**
 * Ohne Argumente: ALLE Commands wie bisher (kein API-Bruch für bestehende
 * Aufrufer). Mit `optionen.ohne`: eine kuratierte Untermenge — die Auswahl
 * selbst (WAS ausgeschlossen wird und WARUM) liegt bewusst beim Aufrufer,
 * dieses Paket kennt keine Meinung über einzelne Commands.
 */
export function commandTools(optionen?: CommandToolsOptionen): ToolDefinition[] {
  const ausschluss = new Set(optionen?.ohne ?? []);
  return allCommands()
    .filter((cmd) => !ausschluss.has(cmd.id))
    .map((cmd) => ({
      name: toolNameFor(cmd.id),
      description: cmd.description,
      parameters: z.toJSONSchema(cmd.params as z.ZodType, { io: 'input', target: 'draft-7' }),
    }));
}

/**
 * Deskriptor für ein Werkzeug AUSSERHALB der Kernel-Command-Registry — z.B.
 * die App-seitige `ui.*`-Registry (`apps/kosmo-orbit/src/state/ui-befehle.ts`,
 * v0.6.6 BEWEGUNGSKONZEPT §6). Bewusst nur Name/Beschreibung/Schema: dieses
 * Paket kennt die Quelle NIE (Abhängigkeitsrichtung bleibt App → Package,
 * niemals umgekehrt) — die App reicht ihre eigene Registry hier nur als
 * Daten durch.
 */
export interface ExternalToolSpec {
  readonly id: string;
  readonly beschreibung: string;
  readonly params: z.ZodType;
}

/**
 * Externe Werkzeuge (z.B. `ui.*`) als LLM-Tool-Definitionen — dasselbe
 * Namens-/Schema-Muster wie `commandTools()` (Punkt → Unterstrich via
 * `toolNameFor`, JSON-Schema aus dem zod-Schema), nur mit Deskriptoren als
 * Parameter statt der Kernel-Command-Registry. Damit bekommt JEDE
 * app-seitige Command-artige Registry (aktuell: `ui.*`) dieselbe
 * LLM-Sichtbarkeit wie ein Kernel-Command, ohne dass dieses Paket sie kennen
 * muss.
 */
export function externalTools(specs: readonly ExternalToolSpec[]): ToolDefinition[] {
  return specs.map((s) => ({
    name: toolNameFor(s.id),
    description: s.beschreibung,
    parameters: z.toJSONSchema(s.params, { io: 'input', target: 'draft-7' }),
  }));
}

/**
 * `modell_lesen`-Wände (v0.8.1 KI2, Kandidat 5): Budget-Selektion statt
 * starrem 40er-Deckel (`walls.slice(0, 40)`, verlor stillschweigend jede Wand
 * ab der 41., unabhängig davon, woran der Architekt gerade arbeitet).
 * Priorität: Wände im AKTIVEN Geschoss zuerst, dann der Rest in Doc-
 * Reihenfolge — bis das Token-Budget (`schaetzeTokens`, s. `systemprompt.ts`)
 * ausgeschöpft ist. Kein Abbruch bei der ersten Überschreitung: eine
 * spätere, kürzere Wandzeile darf eine frühere grössere überholen (gleiches
 * Bin-Packing wie `baueSystemprompt`).
 */
const MODELL_LESEN_WAND_BUDGET_TOKENS = 500;

function waehleWaendeNachBudget(
  walls: readonly Wall[],
  zeileFuer: (w: Wall) => string,
  aktivesGeschoss: string | undefined,
  budgetTokens: number,
): { gewaehlt: Wall[]; ausgelassen: number } {
  const prioritaet = (w: Wall) => (aktivesGeschoss && w.storeyId === aktivesGeschoss ? 0 : 1);
  const geordnet = walls
    .map((w, i) => ({ w, i, p: prioritaet(w) }))
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .map((e) => e.w);
  const gewaehlt: Wall[] = [];
  let rest = budgetTokens;
  for (const w of geordnet) {
    const kosten = schaetzeTokens(zeileFuer(w));
    if (kosten > rest) continue;
    gewaehlt.push(w);
    rest -= kosten;
  }
  return { gewaehlt, ausgelassen: walls.length - gewaehlt.length };
}

/** Read-only-Tool: Modellzustand für Kosmo lesbar machen (blender-mcp-Muster). */
export function modelQueryTool(
  doc: KosmoDoc,
  /**
   * Derselbe App-Kontext-Lieferant wie `ChatSession.applyDefaults`
   * (aktives Geschoss, gewählter Aufbau) — hier NUR gelesen, um `modell_lesen`
   * die Wände des aktiven Geschosses zuerst zeigen zu lassen. Fehlt er (z.B.
   * reine Tool-Tests), verhält sich die Auswahl wie bisher: Doc-Reihenfolge.
   */
  kontext?: () => Record<string, unknown>,
  optionen?: { wandBudgetTokens?: number },
): ToolDefinition & {
  execute: () => string;
} {
  const wandBudgetTokens = optionen?.wandBudgetTokens ?? MODELL_LESEN_WAND_BUDGET_TOKENS;
  return {
    name: 'modell_lesen',
    description:
      'Liest den aktuellen Modellzustand: Geschosse (mit IDs), Aufbauten (mit IDs), Wände, Öffnungen, Flächen. IMMER zuerst aufrufen, um gültige storeyId/assemblyId zu erhalten.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    execute: () => {
      const storeys = doc.storeysOrdered();
      const assemblies = doc.byKind('assembly');
      const walls = doc.byKind<Wall>('wall');
      const lines: string[] = [];
      lines.push('GESCHOSSE:');
      for (const s of storeys as Storey[]) {
        lines.push(
          `- ${s.name} (id: ${s.id}), OK Boden ${formatLength(s.elevation)}, Höhe ${formatLength(s.height)}`,
        );
      }
      lines.push('AUFBAUTEN:');
      for (const a of assemblies) {
        if (a.kind !== 'assembly') continue;
        lines.push(
          `- ${a.name} (id: ${a.id}, ${a.target}, ${a.layers.reduce((s, l) => s + l.thickness, 0)} mm)`,
        );
      }
      lines.push(`WÄNDE: ${walls.length}`);
      const wandZeile = (w: Wall) => {
        const len = Math.round(Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y));
        return `- ${w.id}: (${w.a.x},${w.a.y})→(${w.b.x},${w.b.y}) mm, L=${formatLength(len)}, Öffnungen: ${doc.openingsOf(w.id).length}`;
      };
      const aktiv = kontext?.();
      const aktivesGeschoss = typeof aktiv?.['storeyId'] === 'string' ? (aktiv['storeyId'] as string) : undefined;
      const { gewaehlt, ausgelassen } = waehleWaendeNachBudget(walls, wandZeile, aktivesGeschoss, wandBudgetTokens);
      for (const w of gewaehlt) lines.push(wandZeile(w));
      if (ausgelassen > 0) {
        lines.push(
          `… ${ausgelassen} weitere Wand(en) nicht aufgeführt (Budget) — aktives Geschoss zuerst, ruf modell_lesen bei Bedarf gezielter über die Wand-IDs oben ab.`,
        );
      }
      const slabs = doc.byKind('slab');
      if (slabs.length) lines.push(`DECKEN: ${slabs.length}`);
      const masses = doc.byKind('mass');
      if (masses.length) {
        for (const m of masses) {
          if (m.kind !== 'mass') continue;
          const area = Math.abs(
            m.outline.reduce((s, p, i) => {
              const q = m.outline[(i + 1) % m.outline.length]!;
              return s + p.x * q.y - q.x * p.y;
            }, 0) / 2,
          );
          lines.push(`- Volumen ${m.id}: GF ${formatArea(area)}, Höhe ${formatLength(m.height)}`);
        }
      }
      return lines.join('\n');
    },
  };
}

export interface ValidatedCall {
  ok: true;
  commandId: string;
  params: unknown;
  summary: string;
}

export interface FailedCall {
  ok: false;
  error: string;
}

/**
 * Tool-Call validieren: Argumente ggf. per jsonrepair retten, dann durchs
 * zod-Schema des Commands. Fehler gehen als präzises Feedback ans Modell
 * zurück (Retry-Muster für lokale LLMs).
 *
 * `doc` ist optional (D4, `docs/WETTBEWERB-KONZEPT.md` D-E9): die meisten
 * Commands fassen ihren Vorschlag rein aus den Argumenten zusammen; ein
 * Command, dessen Zusammenfassung berechnete Kennzahlen braucht (z.B.
 * `grundlagen.volumenstudie`), bekommt den aktuellen Doc-Stand für die
 * Diff-Karten-Vorschau. Ohne `doc` (z.B. in Tests, die nur die
 * Argument-Validierung prüfen) fassen solche Commands ehrlich ohne die
 * berechneten Zahlen zusammen statt abzustürzen.
 */
export function validateToolCall(call: ToolCall, doc?: KosmoDoc): ValidatedCall | FailedCall {
  const commandId = commandIdFor(call.name);
  const cmd = allCommands().find((c) => c.id === commandId) as Command<unknown> | undefined;
  if (!cmd) return { ok: false, error: `Unbekanntes Werkzeug «${call.name}»` };

  let args: unknown = call.arguments;
  if (typeof args === 'string') {
    // Lokale Modelle packen JSON gern in Markdown-Zäune — vor dem Parsen schälen
    const raw: string = args
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    try {
      args = JSON.parse(raw);
    } catch {
      try {
        args = JSON.parse(jsonrepair(raw));
      } catch {
        return { ok: false, error: 'Argumente sind kein gültiges JSON' };
      }
    }
  }
  const parsed = cmd.params.safeParse(args);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; '),
    };
  }
  return {
    ok: true,
    commandId,
    params: parsed.data,
    // `doc` fehlt nur in reinen Argument-Validierungstests; echte Läufe
    // (ChatSession) übergeben immer den aktuellen Doc-Stand.
    summary: cmd.summarize(parsed.data, doc as KosmoDoc),
  };
}
