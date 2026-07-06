/**
 * visibility-Leak-Gate (Serie I, Batch B1).
 *
 * Reine Erkennungsfunktion: findet Spuren privater Daten in einem beliebigen
 * Wertebaum (Seed-Einträge, Export-Objekte, ...), ohne selbst etwas zu
 * verändern. Dient als laufendes Test-Gate dafür, dass `private`-Daten NIE in
 * einen Publish-/Export-/Seed-Pfad gelangen (Risiko R1,
 * `docs/SERIE-I-BUILDPLAN.md`).
 *
 * Die Textmuster spiegeln `PRIVATE_TEXT_PATTERNS` aus
 * `tools/build-kosmodata-seed.mjs` (dieselben Pfad-/Marker-Fragmente, die die
 * Website-Redaktion in `lib/public-kosmo.ts#publicSafeText` ersetzt), ergänzt
 * um absolute Windows-/OneDrive-Pfade sowie ein strukturelles
 * `visibility === 'private'`-Muster, das reine Textmuster nicht fangen
 * würden.
 *
 * `enthaeltPrivatspur(value) === []` heisst: sauber, keine Privatspur
 * gefunden. Jeder nichtleere Treffer ist ein Fund mit Fundort (JSON-Pfad),
 * Muster-Name und Beispielausschnitt.
 */

interface PrivatspurMuster {
  /** Kurzname des Musters, erscheint im Treffer-String. */
  readonly name: string;
  readonly pattern: RegExp;
}

// Reihenfolge und Fragmente wie in tools/build-kosmodata-seed.mjs
// (PRIVATE_TEXT_PATTERNS), plus Windows-/OneDrive-Pfaderkennung und das
// strukturelle visibility-Muster (siehe enthaeltPrivatspur unten).
const PRIVATSPUR_MUSTER: readonly PrivatspurMuster[] = [
  { name: 'unix-mnt-pfad', pattern: /\/mnt\/[^\s"'`,;)]*/gi },
  { name: 'unix-home-pfad', pattern: /\/home\/[^\s"'`,;)]*/gi },
  { name: 'source-root', pattern: /source[\s-]root/gi },
  { name: 'private-library', pattern: /private-library/gi },
  // Absolute Windows-Laufwerkspfade (C:\..., D:\...) und UNC-Pfade (\\server\share\...).
  { name: 'windows-laufwerk-pfad', pattern: /[A-Za-z]:\\[^\s"'`,;)]*/g },
  { name: 'windows-unc-pfad', pattern: /\\\\[^\s"'`,;)]+\\[^\s"'`,;)]*/g },
  // OneDrive-Pfade/-Marker, unabhängig von Gross-/Kleinschreibung.
  { name: 'onedrive-pfad', pattern: /onedrive[^\s"'`,;)]*/gi },
];

function scanString(value: string, at: string, hits: string[]): void {
  for (const { name, pattern } of PRIVATSPUR_MUSTER) {
    pattern.lastIndex = 0;
    const match = pattern.exec(value);
    if (match) {
      hits.push(`${at}: ${name} ("${match[0].slice(0, 160)}")`);
    }
  }
}

/**
 * Rekursiver Scan über Objekte/Arrays/Strings. Gibt die Liste der gefundenen
 * Privatspuren zurück — leer bedeutet sauber.
 *
 * `at` ist der interne JSON-Pfad-Präfix für die Fundmeldungen (Standard `$`
 * für die Wurzel); normalerweise nicht selbst angeben.
 */
export function enthaeltPrivatspur(value: unknown, at = '$'): string[] {
  const hits: string[] = [];

  const walk = (node: unknown, path: string): void => {
    if (typeof node === 'string') {
      scanString(node, path, hits);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }
    if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>;
      // Strukturelles Muster: ein Knoten, der explizit als visibility:'private'
      // markiert ist, ist per Definition eine Privatspur — unabhängig davon,
      // ob irgendein String-Feld ein Pfadmuster enthält.
      if (record.visibility === 'private') {
        hits.push(`${path}.visibility: visibility:'private'`);
      }
      for (const [key, inner] of Object.entries(record)) walk(inner, `${path}.${key}`);
      return;
    }
  };

  walk(value, at);
  return hits;
}
