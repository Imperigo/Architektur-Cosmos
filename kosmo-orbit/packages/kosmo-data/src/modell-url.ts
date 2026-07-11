/**
 * Referenz-3D-Remote-Auflösung (v0.7.1 E4, docs/V071-KONZEPT.md).
 *
 * `RefEntryModelAsset.r2_key` (reference.ts) ist seit Batch 1 ein GEPLANTER
 * CDN-Schlüssel — kein Resolver existierte bisher, der lokale Ladepfad
 * (T4c, DataWorkspace.tsx `ladeRef3d`) kannte nur per KosmoAsset verknüpfte
 * lokale GLBs. Dieser Resolver bildet AUSSCHLIESSLICH `r2_key` auf eine URL
 * ab — er rührt keine anderen Felder an (insbesondere keine `url`/
 * `local_path`-artigen Felder aus dem reichen Referenz-Modell).
 *
 * `MODELL_CDN_BASIS` ist der geplante CDN-Host für den R2-Bucket des Archivs;
 * der Bucket kann heute unbefüllt sein (Ehrlichkeits-Grenze, s.
 * V071-KONZEPT.md) — ein Fetch gegen eine noch nicht befüllte URL liefert
 * dann ehrlich einen 404/Netzfehler, den der Aufrufer (DataWorkspace)
 * anzeigt statt zu verstecken.
 *
 * Leak-Gate-Hinweis (test/privatspur-leak-gate.test.ts, referenz-seed.test.ts
 * sind harte Verträge): dieser Resolver liest NUR `r2_key` (ein reiner,
 * öffentlich vorgesehener Pfadschlüssel unter dem Archiv-Prefix), niemals
 * `local_path`/`url`/sonstige Quellfelder — er kann daher keine Privatspur
 * erzeugen.
 */

/** Geplanter CDN-Host des Modell-Archivs — trägt einen abschliessenden Schrägstrich. */
export const MODELL_CDN_BASIS = 'https://archiv.architekturkosmos.ch/';

/** Bildet einen `r2_key` (z.B. `entries/villa-savoye/models/full.glb`) auf die volle Remote-URL ab. */
export function modellUrlAusR2Key(r2Key: string): string {
  return `${MODELL_CDN_BASIS}${r2Key.replace(/^\/+/, '')}`;
}
