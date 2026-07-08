import { describe, expect, it } from 'vitest';
import { WERKZEUGE } from '../src/state/werkzeuge';
import { holenMoeglich, werkzeugHolen } from '../src/shell/werkzeug-holen';

/**
 * V1.6 Block A / A2–A3 — der Auto-Setup-Runner. In jsdom gibt es kein Tauri
 * (`__TAURI_INTERNALS__` fehlt), also MUSS der Runner den ehrlichen Web-Weg
 * gehen: kein «Holen», sondern ein klarer Fehler mit Verweis aufs Terminal.
 * Genau das prüft dieser Test — die Desktop-Ausführung selbst ist Rust-Sache
 * (`src-tauri/src/lib.rs::werkzeug_holen`, per `cargo check` verifiziert).
 */

const ollama = WERKZEUGE.find((w) => w.id === 'ollama')!;
const claudeKey = WERKZEUGE.find((w) => w.id === 'claude-key')!;

describe('holenMoeglich (ohne Tauri = Web)', () => {
  it('ist im Browser IMMER false — auch für auto-installierbare Werkzeuge', () => {
    // ollama hat Auto-Befehle, aber ohne Desktop kann nichts laufen.
    expect(holenMoeglich(ollama, 'win')).toBe(false);
    expect(holenMoeglich(ollama, 'mac')).toBe(false);
    // claude-key hat gar keine Befehle → sowieso false.
    expect(holenMoeglich(claudeKey, 'win')).toBe(false);
  });
});

describe('werkzeugHolen (ohne Tauri = Web)', () => {
  it('wirft einen ehrlichen Desktop-only-Fehler statt still zu scheitern', async () => {
    await expect(werkzeugHolen(ollama, 'win')).rejects.toThrow(/Desktop-App/);
  });

  it('nennt auch für ein Werkzeug ohne Befehle zuerst die Desktop-Grenze', async () => {
    // Die Desktop-Prüfung kommt vor der Befehls-Prüfung (fail closed, ehrlich).
    await expect(werkzeugHolen(claudeKey, 'win')).rejects.toThrow(/Desktop-App/);
  });
});
