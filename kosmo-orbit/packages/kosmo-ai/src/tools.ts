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

/**
 * Tool-Registry — die Kernel-Commands werden automatisch zu LLM-Tools.
 * Eine Registry, drei Konsumenten (UI, Palette, LLM): was Kosmo kann, kann
 * der Mensch rückgängig machen. Punkte im Command-Namen werden zu
 * Unterstrichen (Ollama-Tool-Namen erlauben keine Punkte).
 */

export function toolNameFor(commandId: string): string {
  return commandId.replace(/\./g, '_');
}

export function commandIdFor(toolName: string): string {
  return toolName.replace(/^design_/, 'design.').replace(/^doc_/, 'doc.');
}

export function commandTools(): ToolDefinition[] {
  return allCommands().map((cmd) => ({
    name: toolNameFor(cmd.id),
    description: cmd.description,
    parameters: z.toJSONSchema(cmd.params as z.ZodType, { io: 'input', target: 'draft-7' }),
  }));
}

/** Read-only-Tool: Modellzustand für Kosmo lesbar machen (blender-mcp-Muster). */
export function modelQueryTool(doc: KosmoDoc): ToolDefinition & {
  execute: () => string;
} {
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
      for (const w of walls.slice(0, 40)) {
        const len = Math.round(Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y));
        lines.push(
          `- ${w.id}: (${w.a.x},${w.a.y})→(${w.b.x},${w.b.y}) mm, L=${formatLength(len)}, Öffnungen: ${doc.openingsOf(w.id).length}`,
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
 */
export function validateToolCall(call: ToolCall): ValidatedCall | FailedCall {
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
    summary: cmd.summarize(parsed.data),
  };
}
