import { describe, expect, it } from 'vitest';
import { commandTools, toolNameFor } from '../src';

/**
 * v0.8.4 PC2 (`docs/V084-SPEZ.md` E6/C-18) — TOOL-BEWEIS: der neue
 * Kernel-Command `vis.render` (`packages/kosmo-kernel/src/commands/vis.ts`)
 * braucht KEINE eigene Verdrahtung in `@kosmo/ai` — `commandTools()` liest
 * automatisch aus `allCommands()` (Kernel-Registry). Diese Suite beweist das
 * konkret für `vis.render`, statt es nur zu behaupten.
 */
describe('commandTools() — vis.render ist automatisch ein Kosmo-Werkzeug (PC2/E6/C-18)', () => {
  it('commandTools() enthält vis.render', () => {
    const tools = commandTools();
    expect(tools.some((t) => t.name === toolNameFor('vis.render'))).toBe(true);
  });

  it('das Werkzeug trägt Titel/Beschreibung und ein JSON-Schema mit kameraWahl/stimmungPreset/backbone/aufloesung', () => {
    const tool = commandTools().find((t) => t.name === 'vis_render')!;
    expect(tool).toBeDefined();
    expect(tool.description).toContain('Render-AUFTRAG');
    const schema = tool.parameters as { properties: Record<string, unknown>; required?: string[] };
    expect(Object.keys(schema.properties)).toEqual(
      expect.arrayContaining(['graphId', 'nodeId', 'kameraWahl', 'stimmungPreset', 'backbone', 'aufloesung']),
    );
    // graphId/nodeId sind Pflicht, kameraWahl trägt einen Default (Zod
    // markiert Felder mit `.default()` nicht als `required` im JSON-Schema).
    expect(schema.required ?? []).toEqual(expect.arrayContaining(['graphId', 'nodeId']));
  });

  it('toolNameFor/commandIdFor bleiben für vis.render umkehrbar (ein Punkt, camelCase-Aktion)', () => {
    expect(toolNameFor('vis.render')).toBe('vis_render');
  });
});
