/**
 * Bild-Budget (v0.7.1, Stream 1A «Blick-Cloud-Kern» — Härtung) — reine,
 * netzlose Vorabprüfung der base64-Länge eines Blicks, BEVOR ein Request an
 * die Anthropic-API geht. Anthropic erlaubt rund 5 MB je Bild (Rohbytes);
 * wir kappen konservativ bei 4 MB CODIERTER (base64-Text-)Länge — das
 * entspricht rund 3 MB Rohbytes und lässt Reserve für den Rest des
 * Request-Bodies (System-Prompt, Verlauf, Tool-Schemas). Der Provider ruft
 * das VOR dem `fetch` auf und emittiert bei Verstoss den ehrlichen Fehler,
 * ohne einen Netzcall zu riskieren, der ohnehin nur mit derselben Botschaft
 * scheitern würde.
 */
import type { ChatMessage } from './provider';

/** Konservatives Limit: 4 MB als base64-Text (≈ 3 MB Rohbytes). */
export const BILD_BUDGET_MAX_BASE64_ZEICHEN = 4 * 1024 * 1024;

export type BildBudgetErgebnis = { ok: true } | { ok: false; grund: string };

/**
 * Prüft alle `images` aller `messages` (nicht nur der letzten) gegen das
 * Limit — ein Mehrfach-Turn-Gespräch kann Bilder an mehreren, bereits
 * vergangenen User-Nachrichten tragen. Liefert beim ERSTEN Verstoss eine
 * deutsche, konkrete Meldung; ohne Verstoss `{ ok: true }`.
 */
export function bildBudget(messages: readonly ChatMessage[]): BildBudgetErgebnis {
  for (const m of messages) {
    if (!m.images || m.images.length === 0) continue;
    for (const bild of m.images) {
      const laenge = bild.dataBase64.length;
      if (laenge > BILD_BUDGET_MAX_BASE64_ZEICHEN) {
        const mb = (laenge / (1024 * 1024)).toFixed(1);
        return {
          ok: false,
          grund: `Bild zu gross — Kosmo verkleinert Blicke automatisch; dieses Bild überschreitet trotzdem das Limit (${mb} MB codiert, Kosmo-Grenze 4 MB je Bild).`,
        };
      }
    }
  }
  return { ok: true };
}
