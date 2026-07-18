import { describe, expect, it } from 'vitest';
import { execute, KosmoDoc } from '@kosmo/kernel';
import { ChatSession, ScriptedProvider, personas, type SzenarioSkript } from '../src';
import { STANDARD_TOKEN_BUDGET, type SystemPromptBlock } from '../src/systemprompt';
import type { SkillMeta } from '../src/skills';

/**
 * v0.8.3/P7 (`docs/V083-SPEZ.md` §5.4/§6.4/§12.2 C-9) — die tatsächliche
 * `skillBlock`-Verdrahtung in `chat.ts`s `send()`: EIN neuer, additiver
 * `skills`-Konstruktor-Parameter (`readonly SkillMeta[]`, Default `[]`) +
 * eine ergänzte Zeile im `baueSystemprompt()`-Array-Literal, positioniert
 * NACH `rolle` und VOR `kontext` — die in der Vollständigkeits-Matrix (§12.2
 * C-9) verbindliche Reihenfolge dossier > rolle > skills > kontext >
 * datenKontext (Letzterer weiterhin über den bestehenden P2-`extraBloecke`-
 * Kanal, NACH `kontext`, `chat-extra-bloecke.test.ts` bleibt unverändert).
 * Dieselben Grundmuster wie `chat-extra-bloecke.test.ts` (P2) und
 * `systemprompt.test.ts` (Budget-Beweis-Fixtures).
 */

const BASIS = personas.kosmo.systemPrompt;

const SKILLS_FIXTURE: readonly SkillMeta[] = [
  {
    id: 'dossier-zuerst',
    titel: 'Dossier-NO-GOs zuerst prüfen',
    kurzbeschreibung: 'Vor jedem Vorschlag das Dossier gegenlesen.',
  },
];

/** Fixture-Doc mit nicht-leerem dossier-/rolle-/kontext-Block (alle drei Blockbauer liefern Substanz). */
function fixtureDoc(): KosmoDoc {
  const doc = new KosmoDoc();
  doc.settings.projectName = 'Skill-Testbau';
  doc.settings.dossier = [{ typ: 'dont', text: 'kein Flachdach' }];
  doc.settings.rolle = 'entwurf';
  execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  return doc;
}

function sessionMit(
  doc: KosmoDoc,
  skills?: readonly SkillMeta[],
  extraBloecke?: () => readonly SystemPromptBlock[],
): ChatSession {
  const skript: SzenarioSkript = {
    id: 'skill-block-probe',
    zuege: [{ antwortText: 'Antwort.', toolCalls: [] }],
  };
  const provider = new ScriptedProvider(skript.id, { [skript.id]: skript });
  return new ChatSession(
    provider,
    doc,
    {
      onText: () => {},
      onProposal: () => {},
      onBusy: () => {},
      onError: (e) => {
        throw new Error(e);
      },
    },
    'Anfangs-Seed (wird bei send() ersetzt)',
    undefined,
    [],
    '',
    undefined,
    undefined,
    extraBloecke,
    skills,
  );
}

describe('ChatSession — skillBlock-Verdrahtung (§5.4/§6.4/§12.2 C-9)', () => {
  it('ohne skills-Argument bleibt der Systemprompt unverändert (Default [], skillBlock([]) fällt lautlos weg)', async () => {
    const session = sessionMit(new KosmoDoc());
    await session.send('Hallo Kosmo');
    const system = session.history[0];
    expect(system?.role).toBe('system');
    expect(system?.content).toBe(BASIS);
  });

  it('Prompt-Snapshot: Reihenfolge dossier > rolle > skills > kontext > datenKontext', async () => {
    const doc = fixtureDoc();
    const session = sessionMit(doc, SKILLS_FIXTURE, () => [
      { label: 'datenKontext', text: 'KosmoData: Referenz «Beispielbau» passt zum Projekt.' },
    ]);
    await session.send('Hallo Kosmo');
    const content = session.history[0]?.content ?? '';

    const posDossier = content.indexOf('NO-GO: kein Flachdach');
    const posRolle = content.indexOf('Arbeitsrolle des Menschen: entwurf');
    const posSkills = content.indexOf('Verfügbare Kosmo-Betriebsmuster (Skills):');
    const posKontext = content.indexOf('Projekt-Kontext: «Skill-Testbau»');
    const posDatenKontext = content.indexOf('KosmoData: Referenz «Beispielbau»');

    for (const p of [posDossier, posRolle, posSkills, posKontext, posDatenKontext]) {
      expect(p).toBeGreaterThanOrEqual(0);
    }
    expect(posDossier).toBeLessThan(posRolle);
    expect(posRolle).toBeLessThan(posSkills);
    expect(posSkills).toBeLessThan(posKontext);
    expect(posKontext).toBeLessThan(posDatenKontext);
  });

  it('STANDARD_TOKEN_BUDGET (1500) bleibt unverändert: ein übergrosser skills-Block fällt bei Überlauf zuerst weg, dossier/rolle/kontext/datenKontext bleiben erhalten', async () => {
    const doc = fixtureDoc();
    const riesigeSkills: readonly SkillMeta[] = [
      {
        id: 'riesig',
        titel: 'x'.repeat(STANDARD_TOKEN_BUDGET * 5),
        kurzbeschreibung: 'y'.repeat(STANDARD_TOKEN_BUDGET * 5),
      },
    ];
    const session = sessionMit(doc, riesigeSkills, () => [{ label: 'datenKontext', text: 'KosmoData: kompakter Hinweis.' }]);
    await session.send('Hallo Kosmo');
    const content = session.history[0]?.content ?? '';

    // Der riesige skills-Block sprengt das 1500er-Budget allein — er fällt
    // ERSATZLOS weg (kein neues Budget-Sonderfeld, dieselbe Regel wie P2s
    // extraBloecke-Budget-Beweis), die kleineren, später im Array stehenden
    // Blöcke (kontext, datenKontext) dürfen ihn überholen (Bin-Packing).
    expect(content).not.toContain('Verfügbare Kosmo-Betriebsmuster (Skills):');
    expect(content).not.toContain('x'.repeat(100));
    expect(content).toContain('NO-GO: kein Flachdach');
    expect(content).toContain('Arbeitsrolle des Menschen: entwurf');
    expect(content).toContain('Projekt-Kontext: «Skill-Testbau»');
    expect(content).toContain('KosmoData: kompakter Hinweis.');
  });
});
