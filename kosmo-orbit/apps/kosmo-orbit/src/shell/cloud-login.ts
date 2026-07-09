/**
 * Cloud-Login mit Abo («Mit Claude anmelden», Owner-Auftrag) — der OAuth-Weg,
 * genau wie ihn Anthropics eigene Werkzeuge nutzen (`ant`-CLI, Claude Code,
 * Agent-SDK): Browser-Popup → Anthropic-Konto → kurzlebiges Token lokal.
 *
 * Das ist **Desktop-only**: der lokale Anmelde-Helfer läuft über den
 * Tauri-Command `claude_login` (`src-tauri/src/lib.rs`), den die reine
 * Web-/PWA-Version nicht starten kann. Dort bleibt der API-Schlüssel der
 * einzige Weg — ehrlich im UI benannt, siehe `docs/CLOUD-LOGIN-ABO.md`.
 */

/**
 * Läuft die App als Tauri-Desktop-Build?
 * `__TAURI_INTERNALS__` ist das offizielle Tauri-v2-Merkmal: der IPC-Kanal,
 * den `@tauri-apps/api` unter der Haube nutzt — anders als `window.__TAURI__`
 * ist er unabhängig von der `app.withGlobalTauri`-Einstellung immer da.
 */
export function istTauriDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Ruft den Desktop-Anmelde-Helfer auf und liefert das OAuth-Access-Token.
 * Wirft im Web/PWA (kein Tauri) einen ehrlichen Fehler statt eines stillen
 * Fehlschlags — dort gibt es diesen Weg nicht.
 */
export async function claudeAboAnmeldung(): Promise<string> {
  if (!istTauriDesktop()) {
    throw new Error('Mit-Claude-Anmeldung nur in der Desktop-App — im Browser bitte API-Schlüssel.');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('claude_login');
}

/**
 * Installationsbefehl für die Anthropic-CLI (`ant`, Paket `@anthropic-ai/claude-code`)
 * — Owner-Befund F1: die bisherige Fehlermeldung («ant nicht gefunden») liess
 * den Architekten ohne Anleitung stehen. Eine Konstante, damit UI-Text und
 * Tests denselben Befehl zeigen/prüfen.
 */
export const ANT_INSTALL_BEFEHL = 'npm i -g @anthropic-ai/claude-code';

/**
 * Erkennt, ob ein Fehler aus `claudeAboAnmeldung()` daher kommt, dass die
 * Anthropic-CLI (`ant`) lokal fehlt — unterscheidet das von anderen Fehlern
 * (Login abgebrochen, kein Token lesbar, Web/PWA-Hinweis). Reines
 * String-Matching auf die Rust-Fehlermeldung des Tauri-Commands
 * `claude_login` (`src-tauri/src/lib.rs`: *«Anthropic-CLI (`ant`) nicht
 * gefunden — installieren oder API-Schlüssel nutzen.»*) — ohne Tauri/DOM,
 * deshalb ohne Desktop-Build testbar (Owner-Befund F1, Repro-Test zuerst rot
 * in `test/cloud-login.test.ts`).
 */
export function istAntFehltFehler(fehler: unknown): boolean {
  const text = fehler instanceof Error ? fehler.message : String(fehler ?? '');
  return /\bant\b/i.test(text) && text.toLowerCase().includes('nicht gefunden');
}
