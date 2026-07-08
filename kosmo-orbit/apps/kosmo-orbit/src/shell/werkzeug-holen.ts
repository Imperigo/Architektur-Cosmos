/**
 * Auto-Setup-Runner (V1.6 Block A / A2–A3, Owner-Frage P1 «Ein-Klick-
 * Installieren»): führt die geprüften Installations-Befehle eines Werkzeugs
 * aus — aber NUR in der Desktop-App über den Tauri-Command `werkzeug_holen`.
 *
 * Ehrlich (Owner-Mandat): im Browser/PWA gibt es keinen Weg, ein System-
 * Programm zu starten — dort wirft der Runner einen klaren Fehler und der
 * Assistent bleibt beim copy-fertigen `holen`-Befehl. Die eigentliche
 * Ausführung + Allowlist-Zweitprüfung passiert Rust-seitig; der Client prüft
 * hier zusätzlich (fail closed), damit nie ein ungeprüfter Befehl das IPC
 * überhaupt erreicht.
 */
import { installBefehleFuer, type Plattform, type Werkzeug } from '../state/werkzeuge';
import { istTauriDesktop } from './cloud-login';

/** Kann «Holen» hier und jetzt tatsächlich laufen? (Desktop + Befehle da) */
export function holenMoeglich(werkzeug: Werkzeug, plattform: Plattform): boolean {
  return istTauriDesktop() && installBefehleFuer(werkzeug, plattform) !== null;
}

/**
 * Holt ein Werkzeug über die geprüften Plattform-Befehle. Liefert das
 * Rust-Protokoll bei Erfolg; wirft mit ehrlichem Text, wenn kein Desktop,
 * keine Befehle hinterlegt sind oder ein Befehl scheitert.
 */
export async function werkzeugHolen(werkzeug: Werkzeug, plattform: Plattform): Promise<string> {
  if (!istTauriDesktop()) {
    throw new Error('Auto-Holen nur in der Desktop-App — im Browser den Befehl kopieren und im Terminal ausführen.');
  }
  const befehle = installBefehleFuer(werkzeug, plattform);
  if (!befehle) {
    throw new Error(`Für «${werkzeug.name}» gibt es auf dieser Plattform keinen geprüften Auto-Befehl — bitte den Hol-Befehl von Hand ausführen.`);
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('werkzeug_holen', { befehle });
}
