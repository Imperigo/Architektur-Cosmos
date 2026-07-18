import { describe, expect, it } from 'vitest';
import { KosmoDoc } from '@kosmo/kernel';
import { ChatSession, ScriptedProvider, personas, type SzenarioSkript } from '../src';
import { STANDARD_TOKEN_BUDGET, type SystemPromptBlock } from '../src/systemprompt';

/**
 * v0.8.3/P2 (`docs/V083-SPEZ.md` §6.4/E6d) — der neue, additive
 * `extraBloecke?`-Konstruktor-Parameter von `ChatSession` + die ergänzte
 * Zeile in `send()`s `baueSystemprompt()`-Array-Literal. Sanktionierte
 * Additive (§11 Punkt 1) — `turn()`/`resolveApplied`/`resolveRejected`
 * bleiben unangetastet, die bestehenden 239 KI-Tests laufen ohne
 * `extraBloecke` unverändert (erster Fall unten belegt das explizit).
 *
 * `send()` baut den Systemprompt IMMER aus `routePersona(userText).persona.
 * systemPrompt` (die Kosmo-Persona ohne `@mention`-Präfix) — der Konstruktor-
 * `systemPrompt`-Parameter ist nur die anfängliche Seed-Nachricht vor dem
 * ersten `send()`, s. `chat.ts:155/170-188` (unverändert). Die Basis in den
 * Erwartungen unten ist deshalb `personas.kosmo.systemPrompt`, nicht der hier
 * übergebene Konstruktor-String.
 */

const BASIS = personas.kosmo.systemPrompt;

function sessionMitExtraBloecke(extraBloecke?: () => readonly SystemPromptBlock[]) {
  const doc = new KosmoDoc();
  const skript: SzenarioSkript = {
    id: 'extra-bloecke-probe',
    zuege: [
      { antwortText: 'Erste Antwort.', toolCalls: [] },
      { antwortText: 'Zweite Antwort.', toolCalls: [] },
    ],
  };
  const provider = new ScriptedProvider(skript.id, { [skript.id]: skript });
  const session = new ChatSession(
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
  );
  return session;
}

describe('ChatSession — extraBloecke (additiv, §6.4/E6d)', () => {
  it('ohne extraBloecke bleibt der Systemprompt unverändert (kein Aufrufer, kein neuer Block)', async () => {
    const session = sessionMitExtraBloecke();
    await session.send('Hallo Kosmo');
    const system = session.history[0];
    expect(system?.role).toBe('system');
    expect(system?.content).toBe(BASIS);
  });

  it('mit extraBloecke: der Block erscheint NACH dem kontext-Block im Systemprompt', async () => {
    const session = sessionMitExtraBloecke(() => [
      { label: 'datenKontext', text: 'KosmoData: Referenz «Beispielbau» passt zum Projekt.' },
    ]);
    await session.send('Hallo Kosmo');
    const system = session.history[0];
    expect(system?.content).toContain('KosmoData: Referenz «Beispielbau» passt zum Projekt.');
    expect(system?.content.startsWith(BASIS)).toBe(true);
  });

  it('extraBloecke wird JEDEN Zug frisch aufgerufen (dasselbe Muster wie systemSuffix)', async () => {
    let zaehler = 0;
    const session = sessionMitExtraBloecke(() => {
      zaehler++;
      return [{ label: 'datenKontext', text: `Aufruf-Nr. ${zaehler}` }];
    });
    await session.send('Erster Zug');
    expect(session.history[0]?.content).toContain('Aufruf-Nr. 1');
    await session.send('Zweiter Zug');
    expect(session.history[0]?.content).toContain('Aufruf-Nr. 2');
    expect(session.history[0]?.content).not.toContain('Aufruf-Nr. 1');
    expect(zaehler).toBe(2);
  });

  it('STANDARD_TOKEN_BUDGET (1500) bleibt unverändert: ein übergrosser extraBloecke-Block fällt ersatzlos weg, statt den Prompt zu sprengen', async () => {
    const riesig = 'x'.repeat(STANDARD_TOKEN_BUDGET * 5); // weit über jedes realistische Budget
    const session = sessionMitExtraBloecke(() => [{ label: 'datenKontext', text: riesig }]);
    await session.send('Hallo Kosmo');
    const system = session.history[0];
    expect(system?.content).not.toContain(riesig);
    // Kein anderer Block vorhanden (Basis-Doc ohne Dossier/Rolle/Kontext) → Basis bleibt pur.
    expect(system?.content).toBe(BASIS);
  });

  it('mehrere extraBloecke-Einträge landen alle im Prompt, solange das Budget reicht', async () => {
    const session = sessionMitExtraBloecke(() => [
      { label: 'datenKontext', text: 'Erster Zusatzblock.' },
      { label: 'datenKontext-2', text: 'Zweiter Zusatzblock.' },
    ]);
    await session.send('Hallo Kosmo');
    const system = session.history[0];
    expect(system?.content).toContain('Erster Zusatzblock.');
    expect(system?.content).toContain('Zweiter Zusatzblock.');
  });
});
