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
