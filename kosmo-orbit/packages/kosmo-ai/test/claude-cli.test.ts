import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StreamEvent } from '../src/provider';

/**
 * P-F3 (Owner-Punkt 23.07.2026 «claude-abo 401») — Unit-Tests für
 * `ClaudeCliProvider` (`../src/claude-cli.ts`). `@tauri-apps/api/core`
 * (`invoke`) und `@tauri-apps/api/event` (`listen`) werden gemockt — genau
 * die IPC-Grenze, die im echten Desktop-Build zur Tauri-Runtime führt (exakt
 * das Muster aus `e2e/oauth-roundtrip.spec.ts`s Kopfkommentar, hier auf
 * Unit-Ebene statt Playwright).
 */

const invokeMock = vi.fn();
const listenMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invokeMock(...args) }));
vi.mock('@tauri-apps/api/event', () => ({ listen: (...args: unknown[]) => listenMock(...args) }));

/** Simuliert den Tauri-Desktop-Merkmalstest (`istTauriDesktop()` in
 *  `claude-cli.ts`) — kein DOM/jsdom nötig, ein blosses globales `window`
 *  mit dem erwarteten Schlüssel reicht der reinen `typeof`/`in`-Prüfung. */
function alsTauriDesktopSimulieren(): void {
  (globalThis as { window?: unknown }).window = { __TAURI_INTERNALS__: {} };
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  invokeMock.mockReset();
  listenMock.mockReset();
});

/** Treibt EINEN `chat()`-Aufruf bis zum Ende und sammelt alle StreamEvents. */
async function sammleEvents(
  provider: import('../src/claude-cli').ClaudeCliProvider,
  req: Parameters<import('../src/provider').ChatProvider['chat']>[0],
): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const ev of provider.chat(req)) events.push(ev);
  return events;
}

describe('ClaudeCliProvider — Web/iPad-Fehlerpfad (kein Tauri)', () => {
  it('wirft ohne __TAURI_INTERNALS__ sofort den ehrlichen Desktop-only-Fehler, ruft nie invoke/listen', async () => {
    const { ClaudeCliProvider, CLAUDE_CLI_WEB_FEHLER } = await import('../src/claude-cli');
    const provider = new ClaudeCliProvider({ model: 'claude-opus-4-8' });
    const events = await sammleEvents(provider, { messages: [{ role: 'user', content: 'Hallo' }] });
    expect(events).toEqual([{ type: 'done', stopReason: 'error', error: CLAUDE_CLI_WEB_FEHLER }]);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(listenMock).not.toHaveBeenCalled();
  });
});

describe('ClaudeCliProvider — Tauri-Desktop: Deltas sammeln', () => {
  it('reicht claude-cli-delta-Events in Reihenfolge als text-StreamEvents durch und schliesst mit stop', async () => {
    alsTauriDesktopSimulieren();
    const { ClaudeCliProvider } = await import('../src/claude-cli');

    let deltaCallback: ((ev: { payload: { anfrageId: string; text: string } }) => void) | undefined;
    const unlisten = vi.fn();
    listenMock.mockImplementation(async (_name: string, cb: typeof deltaCallback) => {
      deltaCallback = cb;
      return unlisten;
    });
    let resolveInvoke: (() => void) | undefined;
    invokeMock.mockImplementation(() => new Promise<void>((resolve) => { resolveInvoke = resolve; }));

    const provider = new ClaudeCliProvider({ model: 'claude-opus-4-8' });
    const events: StreamEvent[] = [];
    const lauf = (async () => {
      for await (const ev of provider.chat({ messages: [{ role: 'user', content: 'Sag Hallo' }] })) {
        events.push(ev);
      }
    })();

    await vi.waitFor(() => expect(invokeMock).toHaveBeenCalled());
    const anfrageId = (invokeMock.mock.calls[0]![1] as { anfrageId: string }).anfrageId;
    expect(typeof anfrageId).toBe('string');
    expect(anfrageId.length).toBeGreaterThan(0);

    // Ein Event mit FREMDER anfrageId (z.B. das gleichzeitige Blasen-Gespräch,
    // P-F2) darf NICHT bei diesem Aufruf landen.
    deltaCallback!({ payload: { anfrageId: 'eine-andere-anfrage', text: 'STOERUNG' } });
    deltaCallback!({ payload: { anfrageId, text: 'Hallo' } });
    deltaCallback!({ payload: { anfrageId, text: ' Welt' } });
    resolveInvoke!();
    await lauf;

    expect(events).toEqual([
      { type: 'text', delta: 'Hallo' },
      { type: 'text', delta: ' Welt' },
      { type: 'done', stopReason: 'stop' },
    ]);
    expect(unlisten).toHaveBeenCalledTimes(1);
  });

  it('meldet einen CLI-Fehler (invoke() lehnt ab) als done/error, nach bereits gestreamten Deltas', async () => {
    alsTauriDesktopSimulieren();
    const { ClaudeCliProvider } = await import('../src/claude-cli');

    let deltaCallback: ((ev: { payload: { anfrageId: string; text: string } }) => void) | undefined;
    listenMock.mockImplementation(async (_name: string, cb: typeof deltaCallback) => {
      deltaCallback = cb;
      return vi.fn();
    });
    let rejectInvoke: ((e: Error) => void) | undefined;
    invokeMock.mockImplementation(() => new Promise<void>((_resolve, reject) => { rejectInvoke = reject; }));

    const provider = new ClaudeCliProvider({ model: 'claude-opus-4-8' });
    const events: StreamEvent[] = [];
    const lauf = (async () => {
      for await (const ev of provider.chat({ messages: [{ role: 'user', content: 'x' }] })) events.push(ev);
    })();

    await vi.waitFor(() => expect(invokeMock).toHaveBeenCalled());
    const anfrageId = (invokeMock.mock.calls[0]![1] as { anfrageId: string }).anfrageId;
    deltaCallback!({ payload: { anfrageId, text: 'Teil' } });
    rejectInvoke!(new Error('Claude-CLI antwortet mit einem Fehler — Exit-Code 1'));
    await lauf;

    expect(events).toEqual([
      { type: 'text', delta: 'Teil' },
      { type: 'done', stopReason: 'error', error: 'Claude-CLI antwortet mit einem Fehler — Exit-Code 1' },
    ]);
  });
});

describe('ClaudeCliProvider — v1-Werkzeug-Hinweis (Tools angeboten, CLI hat keine)', () => {
  it('hängt den Hinweis EINMALIG vor den ersten Text-Delta, NICHT bei einem zweiten Zug derselben Instanz', async () => {
    alsTauriDesktopSimulieren();
    const { ClaudeCliProvider, CLAUDE_CLI_TOOL_HINWEIS } = await import('../src/claude-cli');

    let deltaCallback: ((ev: { payload: { anfrageId: string; text: string } }) => void) | undefined;
    listenMock.mockImplementation(async (_name: string, cb: typeof deltaCallback) => {
      deltaCallback = cb;
      return vi.fn();
    });
    // Kontrollierte invoke()-Promise: MUSS erst NACH dem simulierten Delta
    // auflösen (sonst schliesst `queue.schliessen()` das Feld, bevor der
    // Delta überhaupt ankommt — Reihenfolge ist bei zwei unabhängigen
    // Microtask-Ketten sonst nicht garantiert).
    let resolveInvoke: (() => void) | undefined;
    invokeMock.mockImplementation(() => new Promise<void>((resolve) => { resolveInvoke = resolve; }));

    const provider = new ClaudeCliProvider({ model: 'claude-opus-4-8' });
    const tools = [{ name: 'design_wandZeichnen', description: 'x', parameters: {} }];

    // Erster Zug — Tools angeboten, Hinweis erwartet.
    const ersterLauf: StreamEvent[] = [];
    const laufA = (async () => {
      for await (const ev of provider.chat({ messages: [{ role: 'user', content: 'a' }], tools })) {
        ersterLauf.push(ev);
      }
    })();
    await vi.waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    let anfrageId = (invokeMock.mock.calls[0]![1] as { anfrageId: string }).anfrageId;
    deltaCallback!({ payload: { anfrageId, text: 'Antwort A' } });
    resolveInvoke!();
    await laufA;
    expect(ersterLauf[0]).toEqual({ type: 'text', delta: `${CLAUDE_CLI_TOOL_HINWEIS}Antwort A` });

    // Zweiter Zug, wieder mit Tools — derselbe Provider, KEIN Hinweis mehr.
    const zweiterLauf: StreamEvent[] = [];
    const laufB = (async () => {
      for await (const ev of provider.chat({ messages: [{ role: 'user', content: 'b' }], tools })) {
        zweiterLauf.push(ev);
      }
    })();
    await vi.waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(2));
    anfrageId = (invokeMock.mock.calls[1]![1] as { anfrageId: string }).anfrageId;
    deltaCallback!({ payload: { anfrageId, text: 'Antwort B' } });
    resolveInvoke!();
    await laufB;
    expect(zweiterLauf[0]).toEqual({ type: 'text', delta: 'Antwort B' });
  });

  it('ohne Tools im Request bleibt die Antwort unangetastet (kein Hinweis)', async () => {
    alsTauriDesktopSimulieren();
    const { ClaudeCliProvider } = await import('../src/claude-cli');

    let deltaCallback: ((ev: { payload: { anfrageId: string; text: string } }) => void) | undefined;
    listenMock.mockImplementation(async (_name: string, cb: typeof deltaCallback) => {
      deltaCallback = cb;
      return vi.fn();
    });
    let resolveInvoke: (() => void) | undefined;
    invokeMock.mockImplementation(() => new Promise<void>((resolve) => { resolveInvoke = resolve; }));

    const provider = new ClaudeCliProvider({ model: 'claude-opus-4-8' });
    const events: StreamEvent[] = [];
    const lauf = (async () => {
      for await (const ev of provider.chat({ messages: [{ role: 'user', content: 'x' }] })) events.push(ev);
    })();
    await vi.waitFor(() => expect(invokeMock).toHaveBeenCalled());
    const anfrageId = (invokeMock.mock.calls[0]![1] as { anfrageId: string }).anfrageId;
    deltaCallback!({ payload: { anfrageId, text: 'Klar.' } });
    resolveInvoke!();
    await lauf;
    expect(events).toEqual([{ type: 'text', delta: 'Klar.' }, { type: 'done', stopReason: 'stop' }]);
  });

  it('Randfall: Tools angeboten, aber NULL Text-Deltas — der Hinweis erscheint trotzdem, alleinstehend', async () => {
    alsTauriDesktopSimulieren();
    const { ClaudeCliProvider, CLAUDE_CLI_TOOL_HINWEIS } = await import('../src/claude-cli');

    listenMock.mockImplementation(async () => vi.fn());
    invokeMock.mockImplementation(() => Promise.resolve());

    const provider = new ClaudeCliProvider({ model: 'claude-opus-4-8' });
    const tools = [{ name: 'design_wandZeichnen', description: 'x', parameters: {} }];
    const events = await sammleEvents(provider, { messages: [{ role: 'user', content: 'a' }], tools });
    expect(events).toEqual([
      { type: 'text', delta: CLAUDE_CLI_TOOL_HINWEIS },
      { type: 'done', stopReason: 'stop' },
    ]);
  });
});

describe('baueTranskript — reine Verlaufs→Prompt-Bau-Funktion', () => {
  it('trennt die system-Nachricht heraus und baut Du:/Kosmo:-Zeilen aus dem Rest', async () => {
    const { baueTranskript } = await import('../src/claude-cli');
    const { system, prompt } = baueTranskript([
      { role: 'system', content: 'Du bist Kosmo.' },
      { role: 'user', content: 'Zeichne eine Wand.' },
      { role: 'assistant', content: 'Gerne, ich zeichne sie.' },
      { role: 'user', content: 'Danke.' },
    ]);
    expect(system).toBe('Du bist Kosmo.');
    expect(prompt).toBe('Du: Zeichne eine Wand.\n\nKosmo: Gerne, ich zeichne sie.\n\nDu: Danke.');
  });

  it('ohne system-Nachricht bleibt system undefined', async () => {
    const { baueTranskript } = await import('../src/claude-cli');
    const { system } = baueTranskript([{ role: 'user', content: 'x' }]);
    expect(system).toBeUndefined();
  });

  it('eine leere assistant-Nachricht (nur Tool-Aufrufe, kein Text) erzeugt keine Kosmo:-Zeile', async () => {
    const { baueTranskript } = await import('../src/claude-cli');
    const { prompt } = baueTranskript([
      { role: 'user', content: 'x' },
      { role: 'assistant', content: '', toolCalls: [{ id: 'c1', name: 't', arguments: {} }] },
    ]);
    expect(prompt).toBe('Du: x');
  });

  it('eine tool-Nachricht (Randfall: Provider-Wechsel mitten im Gespräch) wird sichtbar als Werkzeug-Zeile geführt', async () => {
    const { baueTranskript } = await import('../src/claude-cli');
    const { prompt } = baueTranskript([
      { role: 'user', content: 'x' },
      { role: 'tool', toolName: 'quellen_suchen', content: 'Ergebnis Y' },
    ]);
    expect(prompt).toBe('Du: x\n\n[Werkzeug-Ergebnis «quellen_suchen»]: Ergebnis Y');
  });
});
