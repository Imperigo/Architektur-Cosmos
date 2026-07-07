import type { DocJson } from '@kosmo/kernel';
import { leseEdition } from '@kosmo/ai';

/**
 * Herkunfts-Fingerprint (Serie I / Batch B5 — Anti-Copy Stufe 1).
 *
 * **Zweck: Nachweis, nicht Verhinderung.** Diese Datei trägt eine dezente,
 * clientseitig sichtbare/entfernbare Herkunftskennung in Exporte ein — damit
 * eine geleakte Kopie (Export-Datei/PDF/SVG) auf Edition, Export-Zeitpunkt
 * und den Doc-Stand zurückgeführt werden kann. Sie verhindert kein Kopieren:
 * ein entschlossener Angreifer entfernt Wrapper-Feld oder PDF-Metadaten
 * leicht. Siehe `docs/SERIE-I-BUILDPLAN.md` §3 («ehrliches Anti-Copy-Urteil»)
 * — der einzige wirklich harte Hebel ist Server-Bindung (Batch B6).
 *
 * **Datenschutz:** `Herkunft` enthält nur `editionId` (Betriebsart/Build-Art,
 * z.B. `standard`/`remote`/`cloud`/`unbekannt`), `exportedAt` (Export-
 * Zeitstempel, vom Aufrufer übergeben) und `docHash` (nicht-kryptografischer
 * Streuwert über den Doc-Inhalt). **Keine** Namen, IP-Adressen, Hardware-IDs
 * oder sonstigen personenbezogenen Daten — der Zweck (Leak-Forensik) braucht
 * sie nicht.
 *
 * **Laufzeit ≠ Modell:** `Herkunft` lebt NUR in der Export-/Wrapper-Schicht
 * (`.kosmo`-Manifest, PDF-Metadaten, SVG-`<metadata>`) — nie im `DocJson`
 * selbst, das durch Yjs/Undo/Sync läuft. Sonst würde die Kennung Teil des
 * geteilten Doc-Zustands und liefe über den Sync-Server an alle Clients.
 */
export interface Herkunft {
  /** Betriebsart/Edition zum Export-Zeitpunkt (`standard`/`remote`/`cloud`), sonst `'unbekannt'`. */
  editionId: string;
  /** ISO-Zeitstempel des Exports — vom Aufrufer übergeben, nie `Date.now()` in dieser reinen Funktion. */
  exportedAt: string;
  /** Deterministischer Streuwert über den Doc-Inhalt (siehe `docHashVon`). */
  docHash: string;
}

/** Kanonische JSON-Form: Objekt-Schlüssel sortiert, damit der Hash nicht von
 * zufälliger Schlüssel-/Map-Einfügereihenfolge abhängt. */
function kanonisiere(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(kanonisiere);
  if (value !== null && typeof value === 'object') {
    const quelle = value as Record<string, unknown>;
    const ziel: Record<string, unknown> = {};
    for (const schluessel of Object.keys(quelle).sort()) {
      ziel[schluessel] = kanonisiere(quelle[schluessel]);
    }
    return ziel;
  }
  return value;
}

/** FNV-1a (32 bit) — kein kryptografischer Hash, reicht für Herkunftsnachweis
 * (Kollisionsresistenz ist hier kein Sicherheitsziel). */
function fnv1a(text: string, seed: number): number {
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Stabiler Streuwert über den Doc-Inhalt: gleicher Inhalt → gleicher Hash
 * (unabhängig von Aufrufreihenfolge), geänderter Inhalt → anderer Hash. Zwei
 * FNV-1a-Läufe mit verschiedenem Seed über dieselbe kanonische JSON-Form
 * ergeben 64 bit Streuung als Hex-String (16 Zeichen).
 */
export function docHashVon(json: DocJson): string {
  const kanon = JSON.stringify(kanonisiere(json));
  const a = fnv1a(kanon, 0x811c9dc5);
  const b = fnv1a(kanon, 0x9e3779b9);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/** Reine Funktion: baut die Herkunfts-Kennung. `exportedAt`/`editionId`
 * kommen vom Aufrufer — kein `Date.now()`/Umgebungs-Zugriff hier drin. */
export function baueHerkunft(params: { json: DocJson; editionId: string; exportedAt: string }): Herkunft {
  return {
    editionId: params.editionId,
    exportedAt: params.exportedAt,
    docHash: docHashVon(params.json),
  };
}

/**
 * Edition des laufenden Builds — gleicher Build-Flag wie `betrieb.ts`
 * (`VITE_KOSMO_EDITION`), aber ehrlich `'unbekannt'` statt `leseEdition`s
 * Erststart-Vorauswahl-Default `'standard'`: hier geht es um einen
 * Herkunftsnachweis, keine Betriebsart-Vorauswahl. Einzige Stelle in diesem
 * Modul, die eine Umgebung liest statt reine Parameter zu nehmen — von
 * `project-io.ts` und `export-sheets.ts` gemeinsam genutzt.
 */
export function ermittleEditionId(): string {
  const roh = import.meta.env.VITE_KOSMO_EDITION;
  return roh && roh.trim() ? leseEdition(roh) : 'unbekannt';
}

/** Einzeiliger, grep-barer Kennungstext fürs PDF-`keywords`-Feld / SVG-Kommentar. */
export function herkunftKennzeichnung(h: Herkunft): string {
  return `kosmo-herkunft:edition=${h.editionId};zeit=${h.exportedAt};hash=${h.docHash}`;
}

/**
 * Fügt die Herkunftskennung als `<metadata>`-Element direkt nach dem
 * öffnenden `<svg …>`-Tag ein — reine Zeichenketten-Operation auf dem
 * FERTIGEN Markup einer Export-Funktion (`export-sheets.ts`). Rührt NIE an
 * `sheetToSvg`/`plansvg.ts` selbst (Golden-Schutz) — die Kennung sitzt eine
 * Schicht darüber, nachdem der Golden-Pfad seine Ausgabe schon geliefert hat.
 */
export function svgMitHerkunft(markup: string, h: Herkunft): string {
  const metadata = `<metadata>${herkunftKennzeichnung(h)}</metadata>`;
  const treffer = markup.match(/<svg[^>]*>/);
  if (!treffer) return markup; // unerwartetes Markup: keine Verstümmelung, einfach durchreichen
  const ende = (treffer.index ?? 0) + treffer[0].length;
  return markup.slice(0, ende) + metadata + markup.slice(ende);
}
