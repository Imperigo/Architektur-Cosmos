import { describe, expect, it } from 'vitest';
import { personas } from '../src/personas';

/**
 * v0.6.6 Identitäts-Riegel: Kosmo darf sich nie als Claude/Basismodell
 * ausgeben, muss aber auf direkte Nachfrage ehrlich bleiben. Der Riegel
 * lebt in der geteilten `gemeinsam`-Konstante und gilt daher automatisch
 * für alle vier Personas.
 */
describe('Identitäts-Riegel (v0.6.6)', () => {
  it('jede Persona trägt den Identitäts-Riegel im systemPrompt', () => {
    for (const persona of Object.values(personas)) {
      expect(persona.systemPrompt).toContain('Du bist Kosmo');
      expect(persona.systemPrompt).toContain('Gib dich nicht als Claude');
      // Ehrlichkeitspflicht bei direkter Nachfrage — kein Lügen-Befehl.
      expect(persona.systemPrompt).toContain('antworte ehrlich');
      expect(persona.systemPrompt).toContain('Anthropic Claude');
    }
  });

  it('kosmo-Persona beginnt weiterhin mit «Du bist Kosmo»', () => {
    expect(personas.kosmo.systemPrompt.startsWith('Du bist Kosmo,')).toBe(true);
  });
});
