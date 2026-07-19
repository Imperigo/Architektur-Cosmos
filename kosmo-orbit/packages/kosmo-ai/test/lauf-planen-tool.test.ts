import { describe, expect, it } from 'vitest';
import { KosmoDoc, execute } from '@kosmo/kernel';
import {
  ChatSession,
  LAUF_PLANEN_TOOL_NAME,
  ScriptedProvider,
  laufPlanTool,
  validateLaufPlanCall,
  type LaufVorschlag,
  type Proposal,
  type SzenarioSkript,
} from '../src';

/**
 * v0.8.6/PB1 (E4, `docs/V086-SPEZ.md` §3, Sanktion 2+3) — Unit-Tests für das
 * `lauf_planen`-Nicht-Command-Tool: der Aufruf wird NIE ausgeführt, sondern
 * über `onLaufVorschlag` als eigener Vorschlagstyp gemeldet (analog
 * `onProposal`, aber KEIN Command-Vorschlag). Ein gültiger Plan wird
 * Vorschlag (KEIN Command lief, `doc` unverändert), ein ungültiger wird über
 * einen zod-Fehler als Tool-Ergebnis an Kosmo zurückgemeldet.
 */

function demoDoc() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  return { doc, storeyId: (eg.patches[0] as { id: string }).id };
}

function skriptMit(zug: SzenarioSkript['zuege'][number]): SzenarioSkript {
  return { id: 'lauf-skript', zuege: [zug] };
}

describe('laufPlanTool()', () => {
  it('trägt den Namen lauf_planen und ein JSON-Schema für titel/schritte', () => {
    const tool = laufPlanTool();
    expect(tool.name).toBe(LAUF_PLANEN_TOOL_NAME);
    expect(tool.name).toBe('lauf_planen');
    const schema = tool.parameters as { properties: Record<string, unknown>; required: string[] };
    expect(schema.required).toEqual(expect.arrayContaining(['titel', 'schritte']));
  });
});

describe('validateLaufPlanCall()', () => {
  it('akzeptiert einen validen Plan (auch als kaputtes, jsonrepair-rettbares JSON)', () => {
    const r = validateLaufPlanCall({
      id: 'c1',
      name: LAUF_PLANEN_TOOL_NAME,
      arguments: "{titel: 'Test', schritte: [{commandId: 'design.wandZeichnen', params: {}, begruendung: 'weil'}]}",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan.titel).toBe('Test');
      expect(r.plan.schritte).toHaveLength(1);
    }
  });

  it('lehnt einen Plan ohne Schritte mit einer zod-Fehlermeldung ab', () => {
    const r = validateLaufPlanCall({ id: 'c2', name: LAUF_PLANEN_TOOL_NAME, arguments: { titel: 'Leer', schritte: [] } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/schritte/);
  });

  it('lehnt einen Schritt ohne begruendung ab', () => {
    const r = validateLaufPlanCall({
      id: 'c3',
      name: LAUF_PLANEN_TOOL_NAME,
      arguments: { titel: 'X', schritte: [{ commandId: 'design.wandZeichnen', params: {} }] },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/begruendung/);
  });

  it('meldet kein gültiges JSON als eigenen, präzisen Fehler', () => {
    const r = validateLaufPlanCall({ id: 'c4', name: LAUF_PLANEN_TOOL_NAME, arguments: '<xml>nein</xml>' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('Argumente sind kein gültiges JSON');
  });
});

describe('ChatSession — lauf_planen wird NIE ausgeführt, nur vorgeschlagen (ScriptedProvider)', () => {
  it('gültiger Plan → onLaufVorschlag, KEIN Command lief, doc unverändert, KEIN onProposal', async () => {
    const { doc, storeyId } = demoDoc();
    const plan = {
      titel: 'Grundriss anlegen',
      schritte: [
        {
          commandId: 'design.wandZeichnen',
          params: { storeyId, a: { x: 0, y: 0 }, b: { x: 5000, y: 0 } },
          begruendung: 'Erste Wand des Rechtecks.',
        },
        {
          commandId: 'design.wandZeichnen',
          params: { storeyId, a: { x: 5000, y: 0 }, b: { x: 5000, y: 5000 } },
          begruendung: 'Zweite Wand, rechtwinklig zur ersten.',
        },
      ],
    };
    const skript = skriptMit({
      nutzerErwartung: /baue/i,
      antwortText: 'Gerne — ich schlage einen Lauf vor.',
      toolCalls: [{ name: LAUF_PLANEN_TOOL_NAME, args: plan }],
    });
    const provider = new ScriptedProvider('lauf-skript', { 'lauf-skript': skript });
    const proposals: Proposal[] = [];
    const laufVorschlaege: LaufVorschlag[] = [];
    const session = new ChatSession(provider, doc, {
      onText: () => {},
      onProposal: (p) => proposals.push(p),
      onLaufVorschlag: (v) => laufVorschlaege.push(v),
      onBusy: () => {},
      onError: (e) => {
        throw new Error(e);
      },
    });

    await session.send('Baue mir ein Rechteck aus zwei Wänden.');

    expect(laufVorschlaege).toHaveLength(1);
    expect(laufVorschlaege[0]!.plan.titel).toBe('Grundriss anlegen');
    expect(laufVorschlaege[0]!.plan.schritte).toHaveLength(2);
    // Sanktion 2+3 (V086-SPEZ §6): KEIN Command lief, doc bleibt unangetastet.
    expect(proposals).toHaveLength(0);
    expect(doc.byKind('wall')).toHaveLength(0);
  });

  it('ungültiger Plan (kaputtes Schema) wird als zod-Fehler ans Modell zurückgemeldet, KEIN onLaufVorschlag', async () => {
    const { doc } = demoDoc();
    const skript = skriptMit({
      antwortText: 'Ich versuche einen Lauf vorzuschlagen.',
      toolCalls: [{ name: LAUF_PLANEN_TOOL_NAME, args: { titel: '', schritte: [] } }],
    });
    const provider = new ScriptedProvider('lauf-skript', { 'lauf-skript': skript });
    const laufVorschlaege: LaufVorschlag[] = [];
    let text = '';
    const session = new ChatSession(provider, doc, {
      onText: (d) => (text += d),
      onProposal: () => {},
      onLaufVorschlag: (v) => laufVorschlaege.push(v),
      onBusy: () => {},
      onError: (e) => {
        throw new Error(e);
      },
    });

    await session.send('Baue mir irgendwas Kaputtes.');

    expect(laufVorschlaege).toHaveLength(0);
    expect(doc.byKind('wall')).toHaveLength(0);
    // ScriptedProvider bekommt das FEHLER-Tool-Ergebnis als nächste Nachricht
    // und quittiert es sichtbar (Muster wie ein ABGELEHNT/FEHLER-Command-Zug).
    expect(text).toMatch(/scheiterte|Erledigt/);
  });

  it('resolveLaufGestartet/resolveLaufAbgelehnt räumen den offenen Vorschlag auf und geben den nächsten Zug frei', async () => {
    const { doc, storeyId } = demoDoc();
    const plan = {
      titel: 'Lauf A',
      schritte: [{ commandId: 'design.wandZeichnen', params: { storeyId, a: { x: 0, y: 0 }, b: { x: 1, y: 0 } }, begruendung: 'b' }],
    };
    const skript: SzenarioSkript = {
      id: 'lauf-skript-2',
      zuege: [
        { antwortText: 'Vorschlag 1.', toolCalls: [{ name: LAUF_PLANEN_TOOL_NAME, args: plan }] },
        { antwortText: 'Nächster Zug nach der Ablehnung.', toolCalls: [] },
      ],
    };
    const provider = new ScriptedProvider('lauf-skript-2', { 'lauf-skript-2': skript });
    const laufVorschlaege: LaufVorschlag[] = [];
    let text = '';
    const session = new ChatSession(provider, doc, {
      onText: (d) => (text += d),
      onProposal: () => {},
      onLaufVorschlag: (v) => laufVorschlaege.push(v),
      onBusy: () => {},
      onError: (e) => {
        throw new Error(e);
      },
    });

    await session.send('Bitte planen.');
    expect(laufVorschlaege).toHaveLength(1);

    // Unbekannte callId ist ein No-Op (kein Wurf, kein Fortschritt) — der
    // Vorschlag bleibt offen, das Skript quittiert nichts.
    await session.resolveLaufAbgelehnt('nicht-vorhanden');
    expect(text).not.toMatch(/scheiterte/);

    await session.resolveLaufAbgelehnt(laufVorschlaege[0]!.callId, 'zu riskant');
    // Die ABGELEHNT-Quittierung geht als Tool-Ergebnis an den ScriptedProvider
    // zurück — genau EIN Ausgang zählte als «scheitert» (ehrliches Auszählen,
    // `scripted.ts`-Kopfkommentar).
    expect(text).toMatch(/1 von 1 Schritt scheiterte/);
    expect(text).toMatch(/ABGELEHNT vom Architekten: zu riskant/);

    // Erst ein NEUER Nutzer-Zug spielt den zweiten Skript-Zug ab.
    await session.send('Weiter bitte.');
    expect(text).toMatch(/Nächster Zug nach der Ablehnung/);
  });
});
