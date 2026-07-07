/**
 * Sicherheits-Logging (Serie I / Batch B9 — Betrieb & Notfall).
 *
 * Rein additiv: **kein** bestehendes Verhalten ändert sich (Statuscodes/
 * Ablehnungen bleiben exakt wie in B3/B4/B6) — dieser Baustein liefert nur
 * eine zusätzliche strukturierte Log-Zeile je sicherheitsrelevantem
 * Ereignis, damit ein verdächtiger Zugriff später nachvollziehbar ist
 * (siehe `docs/INCIDENT-PLAYBOOK.md`, Abschnitt «verdächtiger Zugriff»).
 *
 * Format: eine JSON-Zeile pro Ereignis — `{ts, ereignis, quelle, detail}`,
 * geschrieben auf stderr (getrennt vom normalen Betriebslog auf stdout).
 *
 * **Keine Geheimnisse im Log**: nie ein Token oder eine Lizenz-Signatur im
 * Klartext — nur ehrliche Kurzbeschreibungen ("Token ungültig oder fehlt").
 * Eine Lizenz-ID ist kein Geheimnis (sie steht auch auf der Widerrufsliste
 * im Klartext) und darf im `detail` erscheinen — die Signatur nie.
 *
 * `formatiereSicherheitsereignis` ist eine reine Funktion (testbar ohne
 * echten Serverstart); `protokolliereSicherheitsereignis` ist der dünne
 * Schreiber, den `server.mjs` an den bestehenden Ablehnungsstellen aufruft.
 */

/**
 * @param {{ ereignis: string, quelle: string, detail?: string, ts?: string }} params
 * @returns {string} eine JSON-Zeile (ohne Zeilenumbruch)
 */
export function formatiereSicherheitsereignis({ ereignis, quelle, detail = '', ts }) {
  const zeitstempel = ts ?? new Date().toISOString();
  return JSON.stringify({ ts: zeitstempel, ereignis, quelle, detail });
}

/** Schreibt die formatierte Zeile auf stderr — bewusst getrennt von
 * `console.log` (Startlog/Betriebsmeldungen bleiben auf stdout). */
export function protokolliereSicherheitsereignis(params) {
  process.stderr.write(formatiereSicherheitsereignis(params) + '\n');
}
