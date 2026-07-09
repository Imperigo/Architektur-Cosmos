import { describe, expect, it } from 'vitest';
import { ANT_INSTALL_BEFEHL, istAntFehltFehler, istTauriDesktop } from '../src/shell/cloud-login';

/**
 * Owner-Befund F1 (v0.6.4): «Kosmo Anmeldung laufe mit Claude Abo kommt
 * Fehlermeldung ‹anthropic cli ant nicht gefunden›.» Repro zuerst: die
 * heutige Fehlermeldung des Tauri-Commands `claude_login`
 * (`src-tauri/src/lib.rs`) muss als «CLI fehlt» erkennbar sein, damit die
 * UI daraus eine Anleitung statt nur eines Toasts macht — siehe
 * `istAntFehltFehler()` in `src/shell/cloud-login.ts` und die Anleitung im
 * KosmoPanel (`data-testid="cloud-login-anleitung"`).
 */
describe('istAntFehltFehler — Repro des Owner-Befunds F1', () => {
  it('erkennt die heutige Rust-Fehlermeldung ("ant" nicht gefunden)', () => {
    const heutigeMeldung = new Error(
      'Anthropic-CLI (`ant`) nicht gefunden — installieren oder API-Schlüssel nutzen.',
    );
    expect(istAntFehltFehler(heutigeMeldung)).toBe(true);
  });

  it('erkennt die Meldung auch als blossen String (Tauri-invoke wirft z.T. keinen Error)', () => {
    expect(istAntFehltFehler('Anthropic-CLI (`ant`) nicht gefunden — installieren oder API-Schlüssel nutzen.')).toBe(
      true,
    );
  });

  it('verwechselt andere Fehler des selben Wegs NICHT mit "CLI fehlt"', () => {
    expect(istAntFehltFehler(new Error('Claude-Anmeldung abgebrochen oder fehlgeschlagen.'))).toBe(false);
    expect(istAntFehltFehler(new Error('Anmeldung abgeschlossen, aber kein Token lesbar.'))).toBe(false);
    expect(
      istAntFehltFehler(new Error('Mit-Claude-Anmeldung nur in der Desktop-App — im Browser bitte API-Schlüssel.')),
    ).toBe(false);
    expect(istAntFehltFehler(new Error('`ant auth login` liess sich nicht starten: ENOENT'))).toBe(false);
  });

  it('kommt ohne Absturz durch leere/undefinierte Eingaben', () => {
    expect(istAntFehltFehler(undefined)).toBe(false);
    expect(istAntFehltFehler('')).toBe(false);
  });

  it('ANT_INSTALL_BEFEHL ist der im Dialog gezeigte Installationsbefehl', () => {
    expect(ANT_INSTALL_BEFEHL).toBe('npm i -g @anthropic-ai/claude-code');
  });
});

describe('istTauriDesktop', () => {
  it('ist im Test-DOM (kein Tauri-IPC-Kanal) false', () => {
    expect(istTauriDesktop()).toBe(false);
  });
});
