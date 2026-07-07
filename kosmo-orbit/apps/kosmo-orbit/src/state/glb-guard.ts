/**
 * GLB-Import-Schranke (Serie I / Batch B7 — Parser-Robustheit): bevor rohe
 * GLB-Bytes den Tresor (IndexedDB, `asset-bibliothek.ts`) erreichen oder an
 * den three.js-`GLTFLoader` weitergereicht werden, prüft dieser reine Guard
 * NUR Header + Grösse. Verhindert, dass abgeschnittene/gefälschte/übergrosse
 * Dateien überhaupt gespeichert werden (kein State-Write bei Fehlern) und
 * liefert eine sprechende Fehlermeldung statt eines Absturzes/Hängers im
 * WebGL-Kontext. Der volle glTF-JSON-Chunk bleibt bewusst Sache des
 * `GLTFLoader` (mature, eigenständig gehärtete Bibliothek) — dieser Guard
 * dupliziert das nicht, er fängt nur die billigen, häufigen Fehlklassen früh ab.
 */

/** Deckel gespiegelt vom Bridge-Upload-Deckel (Serie I / B4,
 * `KOSMO_BRIDGE_MAX_UPLOAD_MODEL` = 200 MB). */
export const GLB_MAX_BYTES = 200 * 1024 * 1024;

const GLB_MAGIC = 0x46546c67; // 'glTF' (little-endian uint32)

export type GlbGuardResult = { ok: true } | { ok: false; fehler: string };

/**
 * Prüft ausschliesslich den 12-Byte-GLB-Header (Magic/Version/deklarierte
 * Gesamtlänge) plus die Datei-Grösse — parst NICHT den vollen JSON-Chunk
 * (das bleibt dem `GLTFLoader`). Reicht, um abgeschnittene/gefälschte/
 * übergrosse Dateien VOR dem Speichern/Laden zu verwerfen. Wirft nie.
 */
export function pruefeGlbHeader(bytes: ArrayBuffer | Uint8Array): GlbGuardResult {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (buf.byteLength === 0) return { ok: false, fehler: 'leere Datei' };
  if (buf.byteLength > GLB_MAX_BYTES) {
    return { ok: false, fehler: `Datei zu gross (> ${Math.round(GLB_MAX_BYTES / (1024 * 1024))} MB)` };
  }
  if (buf.byteLength < 12) {
    return { ok: false, fehler: 'abgeschnitten: kein vollständiger GLB-Header (< 12 Bytes)' };
  }
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const magic = dv.getUint32(0, true);
  if (magic !== GLB_MAGIC) return { ok: false, fehler: 'kein GLB (Magic-Bytes fehlen)' };
  const version = dv.getUint32(4, true);
  if (version !== 2) return { ok: false, fehler: `nicht unterstützte GLB-Version ${version}` };
  const totalLength = dv.getUint32(8, true);
  if (totalLength < 12 || totalLength > buf.byteLength) {
    return { ok: false, fehler: 'abgeschnitten: deklarierte Länge passt nicht zur Datei' };
  }
  return { ok: true };
}
