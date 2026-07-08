import { afterEach, describe, expect, it } from 'vitest';
import { KosmoDoc, execute } from '@kosmo/kernel';
import {
  AnthropicProvider,
  ChatSession,
  MockProvider,
  OpenAiKompatibelProvider,
  commandTools,
  validateToolCall,
  verknuepfeToolIds,
  zuAnthropicNachrichten,
  zuOpenAiNachrichten,
  type ChatMessage,
  type StreamEvent,
} from '../src';

function demoDoc() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', {
    name: 'EG',
    index: 0,
    elevation: 0,
    height: 3000,
  });
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 36',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 360, function: 'tragend' }],
  });
  return {
    doc,
    storeyId: (eg.patches[0] as { id: string }).id,
    assemblyId: (aufbau.patches[0] as { id: string }).id,
  };
}

describe('Tool-Registry', () => {
  it('exportiert Kernel-Commands als JSON-Schema-Tools', () => {
    const tools = commandTools();
    const wand = tools.find((t) => t.name === 'design_wandZeichnen');
    expect(wand).toBeDefined();
    expect(wand!.description).toContain('Wand');
    const schema = wand!.parameters as { properties: Record<string, unknown> };
    expect(Object.keys(schema.properties)).toContain('storeyId');
    expect(Object.keys(schema.properties)).toContain('a');
  });

  it('validiert Tool-Calls und repariert kaputtes JSON', () => {
    const { storeyId, assemblyId } = demoDoc();
    const good = validateToolCall({
      id: 'c1',
      name: 'design_wandZeichnen',
      // absichtlich kaputtes JSON (fehlende Anführungszeichen) → jsonrepair
      arguments: `{storeyId: "${storeyId}", a: {x: 0, y: 0}, b: {x: 5000, y: 0}, assemblyId: "${assemblyId}"}`,
    });
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.summary).toBe('Wand 5.0 m');

    const bad = validateToolCall({
      id: 'c2',
      name: 'design_wandZeichnen',
      arguments: { a: { x: 0, y: 0 } },
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain('storeyId');
  });

  it('D4: grundlagen_volumenstudie ist über den Tool-Namen erreichbar und liefert eine doc-gestützte Zusammenfassung', () => {
    const { doc, storeyId } = demoDoc();
    execute(doc, 'design.zoneErstellen', {
      storeyId,
      outline: [
        { x: 0, y: 0 },
        { x: 60000, y: 0 },
        { x: 60000, y: 60000 },
        { x: 0, y: 60000 },
      ],
      name: 'Parzelle',
      sia: 'HNF',
    });
    execute(doc, 'design.zonenRegelSetzen', {
      name: 'Test-Zone',
      az: 0.5,
      maxHoehe: 20000,
      maxVollgeschosse: null,
      grenzabstandKlein: 4000,
      grenzabstandGross: null,
      parzellenFlaeche: 3600,
    });

    // Ohne `doc`: die alte, auf design_/doc_ verdrahtete commandIdFor hätte
    // dieses Tool nie gefunden (Batch D4). Mit `doc` läuft die volle Kette.
    const ohneDoc = validateToolCall({ id: 'g0', name: 'grundlagen_volumenstudie', arguments: { storeyId } });
    expect(ohneDoc.ok).toBe(true);

    const mitDoc = validateToolCall({ id: 'g1', name: 'grundlagen_volumenstudie', arguments: { storeyId } }, doc);
    expect(mitDoc.ok).toBe(true);
    if (mitDoc.ok) {
      expect(mitDoc.commandId).toBe('grundlagen.volumenstudie');
      expect(mitDoc.summary).toContain('Extremvarianten-Studie');
      expect(mitDoc.summary).toMatch(/GF \d+(\.\d+)? m²/);
      // Vorschlag ist nur ein Vorschlag — noch kein Doc-Write.
      expect(doc.byKind('mass')).toHaveLength(0);
    }
  });
});

describe('ChatSession (Mock-Provider, gated)', () => {
  it('Wand-Anweisung → Vorschlag → Freigabe → Ausführung → Kosmo bestätigt', async () => {
    const { doc, storeyId, assemblyId } = demoDoc();
    const proposals: { callId: string; commandId: string; params: unknown; summary: string }[] = [];
    let text = '';
    const session = new ChatSession(
      new MockProvider(),
      doc,
      {
        onText: (d) => (text += d),
        onProposal: (p) => proposals.push(p),
        onBusy: () => {},
        onError: (e) => {
          throw new Error(e);
        },
      },
      'System',
      () => ({ storeyId, assemblyId }), // App-Kontext: aktives Geschoss + Aufbau
    );

    await session.send('Zeichne eine Wand von 0,0 nach 8,0');
    expect(proposals).toHaveLength(1);
    expect(doc.byKind('wall')).toHaveLength(0); // gated: noch NICHT ausgeführt

    const p = proposals[0]!;
    expect(p.summary).toBe('Wand 8.0 m');
    const result = execute(doc, p.commandId, p.params);
    expect(doc.byKind('wall')).toHaveLength(1);
    await session.resolveApplied(p.callId, result.summary);
    expect(text.length).toBeGreaterThan(0);
  });
});

describe('Härte: Tool-Call-Fuzzing (lokale LLMs liefern Müll)', () => {
  const wandArgs = { storeyId: 's1', a: { x: 0, y: 0 }, b: { x: 5000, y: 0 }, assemblyId: 'a1' };

  it('Markdown-Zäune um die Argumente werden geschält', () => {
    const r = validateToolCall({
      id: '1', name: 'design_wandZeichnen',
      arguments: '```json\n' + JSON.stringify(wandArgs) + '\n```',
    });
    expect(r.ok).toBe(true);
  });

  it('einfache Anführungszeichen + Trailing-Comma werden repariert', () => {
    const r = validateToolCall({
      id: '2', name: 'design_wandZeichnen',
      arguments: "{'storeyId': 's1', 'a': {'x': 0, 'y': 0}, 'b': {'x': 5000, 'y': 0}, 'assemblyId': 'a1',}",
    });
    expect(r.ok).toBe(true);
  });

  it('falsche Typen und fehlende Felder → präzise Meldung, kein Wurf', () => {
    const r = validateToolCall({
      id: '3', name: 'design_wandZeichnen',
      arguments: JSON.stringify({ storeyId: 's1', a: { x: 'links', y: 0 } }),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain('a.x');
      expect(r.error).toContain('b');
    }
  });

  it('unbekanntes Werkzeug, kompletter Schrott, Extremwerte → saubere Fehler', () => {
    expect(validateToolCall({ id: '4', name: 'design_hausBauen', arguments: '{}' }).ok).toBe(false);
    expect(validateToolCall({ id: '5', name: 'design_wandZeichnen', arguments: '<xml>nein</xml>' }).ok).toBe(false);
    const pitch = validateToolCall({
      id: '6', name: 'design_dachErstellen',
      arguments: JSON.stringify({ storeyId: 's1', outline: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], pitch: 89 }),
    });
    expect(pitch.ok).toBe(false);
  });

  it('Fremdschlüssel (__proto__ etc.) landen nicht in den geparsten Params', () => {
    const r = validateToolCall({
      id: '7', name: 'design_wandZeichnen',
      arguments: JSON.stringify({ ...wandArgs, __proto__: { boese: true }, extra: 'weg' }),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect('extra' in (r.params as Record<string, unknown>)).toBe(false);
      expect(({} as Record<string, unknown>)['boese']).toBeUndefined();
    }
  });
});

describe('Belegte Antworten (V2-B1, Mock)', () => {
  it('Wissensfrage → quellen_suchen → Antwort zitiert die Marke [Qn]', async () => {
    const provider = new MockProvider();
    // Zug 1: Frage → Tool-Call
    const events1: StreamEvent[] = [];
    for await (const ev of provider.chat({
      messages: [{ role: 'user', content: 'Was sagt das Programm zur Nutzfläche?' }],
    })) {
      events1.push(ev);
    }
    const call = events1.find((e) => e.type === 'tool_call');
    expect(call).toBeDefined();
    expect((call as { call: { name: string; arguments: unknown } }).call.name).toBe('quellen_suchen');
    expect((call as { call: { arguments: { suchbegriff: string } } }).call.arguments.suchbegriff).toBe('nutzfläche');

    // Zug 2: Tool-Resultat mit Belegen → Antwort zitiert [Q1]
    const events2: StreamEvent[] = [];
    for await (const ev of provider.chat({
      messages: [
        { role: 'user', content: 'Was sagt das Programm zur Nutzfläche?' },
        {
          role: 'tool',
          toolName: 'quellen_suchen',
          content:
            '[Q1] (Programm.pdf · Abschnitt 2) Die Hauptnutzfläche beträgt mindestens 2814 m².\n\nZitiere die Belege mit ihrer Marke.',
        },
      ],
    })) {
      events2.push(ev);
    }
    const text = events2
      .filter((e): e is Extract<StreamEvent, { type: 'text' }> => e.type === 'text')
      .map((e) => e.delta)
      .join('');
    expect(text).toContain('[Q1]');
  });
});

// ————— V2-B3: Cloud-/LM-Studio-Provider —————

/** SSE-Response aus Zeilen bauen — simuliert fetch mit ReadableStream. */
function sseResponse(zeilen: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const z of zeilen) controller.enqueue(encoder.encode(z + '\n'));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

async function sammle(provider: { chat(req: { messages: ChatMessage[]; tools?: unknown[] }): AsyncIterable<StreamEvent> }, messages: ChatMessage[]) {
  const events: StreamEvent[] = [];
  for await (const ev of provider.chat({ messages })) events.push(ev);
  return events;
}

describe('Tool-Id-Verknüpfung (Verlauf → API-Format)', () => {
  const verlauf: ChatMessage[] = [
    { role: 'system', content: 'Du bist Kosmo.' },
    { role: 'user', content: 'Zeichne zwei Wände.' },
    {
      role: 'assistant',
      content: 'Gerne.',
      toolCalls: [
        { id: 'c1', name: 'design_wandZeichnen', arguments: { a: 1 } },
        { id: 'c2', name: 'design_wandZeichnen', arguments: { a: 2 } },
      ],
    },
    { role: 'tool', toolName: 'design_wandZeichnen', content: 'AUSGEFÜHRT: Wand 1' },
    { role: 'tool', toolName: 'design_wandZeichnen', content: 'AUSGEFÜHRT: Wand 2' },
  ];

  it('ordnet Tool-Resultate den Aufruf-Ids in Reihenfolge zu', () => {
    const ids = verknuepfeToolIds(verlauf);
    expect(ids.get(3)).toBe('c1');
    expect(ids.get(4)).toBe('c2');
  });

  it('Anthropic: system separat, tool_use + tool_result Blöcke, Rollen gebündelt', () => {
    const { system, messages } = zuAnthropicNachrichten(verlauf);
    expect(system).toBe('Du bist Kosmo.');
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    const assistant = messages[1]!;
    expect(assistant.content.filter((b) => b.type === 'tool_use')).toHaveLength(2);
    const resultate = messages[2]!.content;
    expect(resultate).toEqual([
      { type: 'tool_result', tool_use_id: 'c1', content: 'AUSGEFÜHRT: Wand 1' },
      { type: 'tool_result', tool_use_id: 'c2', content: 'AUSGEFÜHRT: Wand 2' },
    ]);
  });

  it('OpenAI-kompatibel: tool_calls mit JSON-String-Argumenten, tool_call_id am Resultat', () => {
    const raus = zuOpenAiNachrichten(verlauf);
    const assistant = raus[2]!;
    expect(assistant.tool_calls?.[0]).toEqual({
      id: 'c1',
      type: 'function',
      function: { name: 'design_wandZeichnen', arguments: '{"a":1}' },
    });
    expect(raus[3]).toEqual({ role: 'tool', content: 'AUSGEFÜHRT: Wand 1', tool_call_id: 'c1' });
    expect(raus[4]!.tool_call_id).toBe('c2');
  });
});

describe('AnthropicProvider (V2-B3)', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('streamt Text-Deltas und schliesst mit stop', async () => {
    globalThis.fetch = async () =>
      sseResponse([
        'event: message_start',
        'data: {"type":"message_start"}',
        'data: {"type":"content_block_start","content_block":{"type":"text"}}',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Grüezi "}}',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Andrin"}}',
        'data: {"type":"content_block_stop"}',
        'data: {"type":"message_stop"}',
      ]);
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5' });
    const events = await sammle(p, [{ role: 'user', content: 'Hallo' }]);
    const text = events.filter((e) => e.type === 'text').map((e) => (e as { delta: string }).delta).join('');
    expect(text).toBe('Grüezi Andrin');
    expect(events[events.length - 1]).toEqual({ type: 'done', stopReason: 'stop' });
  });

  it('setzt tool_use aus input_json_delta-Fragmenten zusammen', async () => {
    globalThis.fetch = async () =>
      sseResponse([
        'data: {"type":"content_block_start","content_block":{"type":"tool_use","id":"toolu_1","name":"design_wandZeichnen"}}',
        'data: {"type":"content_block_delta","delta":{"type":"input_json_delta","partial_json":"{\\"a\\":{\\"x\\":0,"}}',
        'data: {"type":"content_block_delta","delta":{"type":"input_json_delta","partial_json":"\\"y\\":0}}"}}',
        'data: {"type":"content_block_stop"}',
        'data: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}',
        'data: {"type":"message_stop"}',
      ]);
    const p = new AnthropicProvider({ apiKey: 'sk-test', model: 'claude-sonnet-5' });
    const events = await sammle(p, [{ role: 'user', content: 'Wand bitte' }]);
    const call = events.find((e) => e.type === 'tool_call') as { call: { id: string; name: string; arguments: unknown } };
    expect(call.call.id).toBe('toolu_1');
    expect(call.call.name).toBe('design_wandZeichnen');
    expect(call.call.arguments).toEqual({ a: { x: 0, y: 0 } });
    expect(events[events.length - 1]).toEqual({ type: 'done', stopReason: 'tool_calls' });
  });

  it('401 → verständlicher Fehler statt Absturz', async () => {
    globalThis.fetch = async () => new Response('{"error":{"message":"invalid x-api-key"}}', { status: 401 });
    const p = new AnthropicProvider({ apiKey: 'kaputt', model: 'claude-sonnet-5' });
    const events = await sammle(p, [{ role: 'user', content: 'Hallo' }]);
    const done = events[events.length - 1] as { stopReason: string; error?: string };
    expect(done.stopReason).toBe('error');
    expect(done.error).toContain('401');
    expect(done.error).toContain('Schlüssel');
  });
});

describe('OpenAiKompatibelProvider / LM Studio (V2-B3)', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('streamt Text und endet auf [DONE]', async () => {
    globalThis.fetch = async () =>
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Sali "}}]}',
        'data: {"choices":[{"delta":{"content":"zäme"}}]}',
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}',
        'data: [DONE]',
      ]);
    const p = new OpenAiKompatibelProvider({ baseUrl: 'http://localhost:1234/v1', model: 'test' });
    const events = await sammle(p, [{ role: 'user', content: 'Hallo' }]);
    const text = events.filter((e) => e.type === 'text').map((e) => (e as { delta: string }).delta).join('');
    expect(text).toBe('Sali zäme');
    expect(events[events.length - 1]).toEqual({ type: 'done', stopReason: 'stop' });
  });

  it('sammelt tool_calls-Fragmente je Index und parst die Argumente', async () => {
    globalThis.fetch = async () =>
      sseResponse([
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_9","function":{"name":"design_wandZeichnen","arguments":"{\\"a\\""}}]}}]}',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":":{\\"x\\":0,\\"y\\":0}}"}}]}}]}',
        'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}',
        'data: [DONE]',
      ]);
    const p = new OpenAiKompatibelProvider({ baseUrl: 'http://localhost:1234/v1', model: 'test' });
    const events = await sammle(p, [{ role: 'user', content: 'Wand' }]);
    const call = events.find((e) => e.type === 'tool_call') as { call: { id: string; name: string; arguments: unknown } };
    expect(call.call.id).toBe('call_9');
    expect(call.call.arguments).toEqual({ a: { x: 0, y: 0 } });
    expect(events[events.length - 1]).toEqual({ type: 'done', stopReason: 'tool_calls' });
  });

  it('Server nicht erreichbar → Fehler-Event mit Hinweis', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('fetch failed');
    };
    const p = new OpenAiKompatibelProvider({ baseUrl: 'http://localhost:1234/v1', model: 'test' });
    const events = await sammle(p, [{ role: 'user', content: 'Hallo' }]);
    const done = events[events.length - 1] as { stopReason: string; error?: string };
    expect(done.stopReason).toBe('error');
    expect(done.error).toContain('LM Studio');
  });
});

describe('Tool-Vollständigkeit (Bonus-Block)', () => {
  it('alle heutigen Commands sind als Kosmo-Tools mit validem Schema exponiert', async () => {
    const { commandTools, commandIdFor } = await import('../src/tools');
    await import('@kosmo/kernel'); // registriert alle Commands
    const tools = commandTools();
    const namen = new Set(tools.map((t) => commandIdFor(t.name)));
    for (const id of [
      'design.zonenRegelSetzen', 'design.regelnSetzen', 'design.kennzahlFormelnSetzen',
      'design.standortSetzen', 'design.raumTypSetzen', 'design.moebelSetzen',
      'design.tuerSetzen', 'design.vorlageSpeichern', 'design.vorlageSetzen',
      'design.grundrissGenerieren', 'design.waendeAusZonen', 'design.fensterAusModulen',
      'design.modulSpeichern', 'design.fassadenModulZuweisen', 'design.geschossKopieren',
      // D4 (Wettbewerb-Konzept D-E9): erste Grundlagenstudien-Kette als
      // echter Kosmo-Tool-Aufruf, kein reiner Ableitungspfad mehr.
      'grundlagen.volumenstudie',
    ]) {
      expect(namen.has(id), `${id} fehlt als Tool`).toBe(true);
    }
    // Jedes Tool hat Beschreibung + JSON-Schema mit properties
    for (const t of tools) {
      expect(t.description.length, `${t.name} ohne Beschreibung`).toBeGreaterThan(20);
      expect(t.parameters && typeof t.parameters === 'object').toBe(true);
    }
  });

  it('D4-Fund: commandIdFor(toolNameFor(id)) rundet für JEDEN Command korrekt, nicht nur design.*/doc.* ' +
    '(vorher fest auf diese zwei Präfixe verdrahtet — publish.*/vis.*/grundlagen.* wären real nie aufrufbar gewesen, ' +
    'obwohl commandTools() sie brav gelistet hätte)', async () => {
    const { allCommands } = await import('@kosmo/kernel');
    const { commandIdFor, toolNameFor } = await import('../src/tools');
    for (const cmd of allCommands()) {
      expect(commandIdFor(toolNameFor(cmd.id)), cmd.id).toBe(cmd.id);
    }
    // Stichprobe ausserhalb design./doc. — genau die Namensräume, die der
    // alte Präfix-Regex nicht kannte.
    expect(commandIdFor('publish_blattErstellen')).toBe('publish.blattErstellen');
    expect(commandIdFor('vis_graphErstellen')).toBe('vis.graphErstellen');
    expect(commandIdFor('grundlagen_volumenstudie')).toBe('grundlagen.volumenstudie');
  });
});
