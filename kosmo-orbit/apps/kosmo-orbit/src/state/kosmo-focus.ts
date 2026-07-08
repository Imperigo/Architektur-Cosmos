/**
 * Einmaliger Merker «Eingabefeld fokussieren» (K16 A6, Modus Sprechen/Schreiben):
 * dasselbe Muster wie `deep-link.ts` (D1) — der Entwurfs-Einstieg in
 * KosmoDesign öffnet das Kosmo-Panel über den bestehenden `setKosmoOpen`-Weg
 * und setzt zusätzlich diesen Merker; `KosmoPanel` konsumiert ihn beim
 * nächsten Mount und fokussiert sein Eingabefeld. Kein neuer Chat-Code —
 * nur ein Fokus-Wunsch, der den Mount überlebt (React state wäre pro Mount
 * neu, dieser Merker ist bewusst Modul-scope wie bei `deep-link.ts`).
 */

let pending = false;

export function requestKosmoFokus(): void {
  pending = true;
}

export function consumeKosmoFokus(): boolean {
  const wert = pending;
  pending = false;
  return wert;
}
