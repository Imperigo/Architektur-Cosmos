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

// -----------------------------------------------------------------------
// Abmelden (v0.7.1 Stream 5B, Befund aus Stream 2A) — bis hierhin gab es
// KEINEN dedizierten Abmelden-Knopf für den Abo-Login: der einzige Weg, den
// Abo-Zustand zu verlassen, war ein neuer API-Schlüssel-Eintrag, der die
// ANZEIGE ehrlich wechselte («API-Schlüssel hinterlegt»), das liegengeblie-
// bene `anthropicOauthToken` in `localStorage` aber NIE löschte. Die beiden
// reinen Zustands-Funktionen hier beheben genau das — ohne DOM/React, damit
// sie unit-testbar bleiben und `KosmoPanel.tsx` (Owner: Stream 2A) nur die
// beiden Aufrufe braucht, keine eigene Lösch-Logik.
// -----------------------------------------------------------------------

/** Minimaler Ausschnitt aus `KosmoSettings`, den die beiden Funktionen unten
 *  anfassen — generisch gehalten, damit `KosmoPanel.tsx` sein volles
 *  `KosmoSettings` (inkl. `CloudAuthArt` aus `@kosmo/ai`) unverändert
 *  durchreichen kann. */
export interface CloudAuthZustand {
  cloudAuth: 'schluessel' | 'abo';
  anthropicKey: string;
  anthropicOauthToken: string;
}

/**
 * «Abmelden»: löscht NUR das OAuth-Token (den API-Schlüssel fasst diese
 * Funktion nicht an — der ist ein separater, vom Owner selbst eingetragener
 * Weg) und setzt den Auth-Zustand ehrlich auf `'schluessel'` zurück. Die
 * Anzeige zeigt danach je nach vorhandenem Schlüssel «API-Schlüssel
 * hinterlegt» oder «nicht angemeldet» — nie mehr «angemeldet als Abo» mit
 * einem in Wahrheit toten Token.
 */
export function mitAbmeldung<T extends CloudAuthZustand>(settings: T): T {
  return { ...settings, anthropicOauthToken: '', cloudAuth: 'schluessel' };
}

/**
 * Wechsel des Auth-Wegs auf einen (neuen) API-Schlüssel: ein liegen-
 * gebliebenes Alt-Token aus einem früheren Abo-Login wird MITGELÖSCHT statt
 * unbemerkt in `localStorage` liegen zu bleiben (der ehrlich benannte
 * Rest-Befund aus Stream 2A/`e2e/oauth-roundtrip.spec.ts`).
 */
export function mitApiSchluessel<T extends CloudAuthZustand>(settings: T, schluessel: string): T {
  return { ...settings, anthropicKey: schluessel, cloudAuth: 'schluessel', anthropicOauthToken: '' };
}
