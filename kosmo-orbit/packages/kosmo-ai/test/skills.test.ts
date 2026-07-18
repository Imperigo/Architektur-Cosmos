import { describe, expect, it } from 'vitest';
import { skillBlock, type SkillMeta } from '../src/skills';
import { baueSystemprompt, type SystemPromptBlock } from '../src/systemprompt';

/**
 * v0.8.3/P1 (§5.4, `docs/V083-SPEZ.md`) — Signatur-Beweis für `skillBlock()`,
 * eingefroren in P0. Kein Aufrufer in `chat.ts`/`KosmoPanel.tsx` (das ist
 * P7, W2) — dieser Test prüft ausschliesslich Typ und Verhalten des Bauers
 * selbst gegen ein Fixture-Array, nach demselben Muster wie
 * `systemprompt.test.ts` für `dossierBlock`/`rolleBlock`/`projektKontextBlock`.
 */

const FIXTURE: readonly SkillMeta[] = [
  { id: 'dossier-zuerst', titel: 'Dossier zuerst', kurzbeschreibung: 'NO-GOs vor jedem Vorschlag prüfen.' },
  { id: 'command-statt-freitext', titel: 'Command statt Freitext', kurzbeschreibung: 'Vorschläge als Command, nie als Prosa.' },
];

describe('skillBlock — Signatur (§5.4, eingefroren in P0)', () => {
  it('nimmt readonly SkillMeta[] entgegen und liefert einen SystemPromptBlock mit Label "skills"', () => {
    const block: SystemPromptBlock = skillBlock(FIXTURE);
    expect(block.label).toBe('skills');
    expect(typeof block.text).toBe('string');
  });

  it('SkillMeta trägt genau id/titel/kurzbeschreibung als readonly Felder', () => {
    const eintrag: SkillMeta = { id: 'x', titel: 'Titel', kurzbeschreibung: 'Kurz.' };
    expect(Object.keys(eintrag).sort()).toEqual(['id', 'kurzbeschreibung', 'titel']);
  });

  it('formatiert jeden Skill als "- Titel: Kurzbeschreibung"-Zeile', () => {
    const { text } = skillBlock(FIXTURE);
    expect(text).toContain('- Dossier zuerst: NO-GOs vor jedem Vorschlag prüfen.');
    expect(text).toContain('- Command statt Freitext: Vorschläge als Command, nie als Prosa.');
  });

  it('leeres Array liefert leeren Text (kein Deko-Satz ohne Inhalt)', () => {
    expect(skillBlock([])).toEqual({ label: 'skills', text: '' });
  });

  it('überspringt Einträge ohne Titel oder ohne Kurzbeschreibung', () => {
    const luecke: readonly SkillMeta[] = [
      { id: 'leer-titel', titel: '', kurzbeschreibung: 'Hat nur Kurzbeschreibung.' },
      { id: 'leer-kurz', titel: 'Hat nur Titel', kurzbeschreibung: '   ' },
      { id: 'voll', titel: 'Vollständig', kurzbeschreibung: 'Beides gesetzt.' },
    ];
    const { text } = skillBlock(luecke);
    expect(text).not.toContain('Hat nur Kurzbeschreibung');
    expect(text).not.toContain('Hat nur Titel');
    expect(text).toContain('- Vollständig: Beides gesetzt.');
  });

  it('reiht sich verlustfrei in baueSystemprompt() ein (Muster §6.4/E6, additive extraBloecke-Kette)', () => {
    const prompt = baueSystemprompt('Basis-Persona', [
      { label: 'kontext', text: 'Projekt-Kontext: «Test».' },
      skillBlock(FIXTURE),
    ]);
    expect(prompt).toContain('Basis-Persona');
    expect(prompt).toContain('Verfügbare Kosmo-Betriebsmuster (Skills):');
    expect(prompt).toContain('- Dossier zuerst: NO-GOs vor jedem Vorschlag prüfen.');
  });

  it('ein leerer skillBlock() fällt in baueSystemprompt() ersatzlos weg (kein leerer Block im Prompt)', () => {
    const prompt = baueSystemprompt('Basis-Persona', [{ label: 'kontext', text: 'Kontext.' }, skillBlock([])]);
    expect(prompt).toBe('Basis-Persona\n\nKontext.');
  });
});
