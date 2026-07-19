import type { Entity, KosmoDoc } from '@kosmo/kernel';
import type { LaufPlan } from './lauf-plan';

/**
 * @ref-Platzhalter-Auflösung — v0.8.6/PB1 (E4, `docs/V086-SPEZ.md` §3/D4),
 * hochgezogen aus `wissen/training/eval/kosmo-laufplaene/pruefe-
 * laufplaene.mts` (vormals Zeilen 69-90, `findeEindeutig`/`loeseWertAuf`) —
 * Semantik UNVERÄNDERT übernommen, jetzt EINE Wahrheit statt einer Kopie im
 * Prüfcode und (künftig) in der App (`lauf-runtime.ts`).
 *
 * Ein `LaufPlan` ist bewusst statisch (`lauf-plan.ts`-Kopfkommentar): ein
 * Schritt trägt fixe `params`, es gibt KEINE Interpolation auf das Ergebnis
 * eines früheren Schritts. Der Kernel vergibt jede Entity-ID aber erst zur
 * Laufzeit, zufällig (`model/ids.ts#newId`) — ein Schritt kann nicht im
 * Voraus wissen, welche ID «sein» Geschoss bekommt, das derselbe Plan zwei
 * Schritte vorher selbst erst anlegt. Die drei kuratierten Bibliotheks-
 * Drehbücher (`wissen/training/eval/kosmo-laufplaene/*.json`) sind bewusst
 * SELBSTSTÄNDIG lauffähig (README.md dort, «Platzhalter-Konvention») und
 * nutzen darum einen Platzhalter-String-Vertrag, den DIESE Funktion auflöst
 * — NAME-qualifiziert (nie «der erste/einzige X»), gegen den `doc`-Stand,
 * den der Aufrufer übergibt.
 *
 * **Progressiv aufrufen, nicht einmalig vor dem ganzen Plan:** weil spätere
 * Schritte Entities referenzieren können, die FRÜHERE Schritte DESSELBEN
 * Laufs gerade erst erzeugt haben (z.B. `@ref:storey:Rohbau EG`, von
 * `design.geschossErstellen` in Schritt 1 angelegt), rufen Aufrufer diese
 * Funktion JE SCHRITT frisch gegen den inzwischen fortgeschrittenen `doc`
 * auf — nicht einmal für den ganzen Plan, bevor irgendein Schritt lief (das
 * würde bei einer Selbst-Referenz mit «keine Entity dieses Namens im Doc
 * gefunden» scheitern, weil die referenzierte Entity dann noch nicht
 * existiert). Muster: `pruefe-laufplaene.mts#fuehrePlanAus` (ein
 * Ein-Schritt-„Plan" je Schleifendurchlauf) und
 * `lauf-runtime.ts#baueFuehreAus` (ein Ein-Schritt-„Plan" je
 * `fuehreAus`-Aufruf, gegen den jeweils AKTUELLEN Live-Doc — das macht
 * Bibliotheks-Läufe mit @refs am Live-Doc lauffähig, C-13).
 *
 * **Syntax** (README.md «Platzhalter-Konvention»):
 *   `@ref:storey:<name>` · `@ref:aufbau:<name>` · `@ref:sheet:<name>` ·
 *   `@ref:graph:<name>` · `@ref:node:<graphName>:<typ>`
 *
 * Unbekannte/mehrdeutige Referenzen werfen einen verständlichen Fehler
 * (kein stilles `undefined` an `execute()`).
 */

interface NamedEntityArtig {
  id: string;
  name?: string;
  nodes?: { id: string; typ: string }[];
}

function alleVomKind(doc: KosmoDoc, kind: string): NamedEntityArtig[] {
  return doc.byKind(kind as Entity['kind']) as unknown as NamedEntityArtig[];
}

function findeEindeutig(doc: KosmoDoc, kind: string, name: string): NamedEntityArtig {
  const treffer = alleVomKind(doc, kind).filter((e) => e.name === name);
  if (treffer.length === 0) {
    throw new Error(`@ref:${kind}:${name} — keine Entity dieses Namens im Doc gefunden`);
  }
  if (treffer.length > 1) {
    throw new Error(`@ref:${kind}:${name} — Name ist NICHT eindeutig (${treffer.length} Treffer)`);
  }
  return treffer[0]!;
}

function loeseWertAuf(wert: unknown, doc: KosmoDoc): unknown {
  if (typeof wert === 'string' && wert.startsWith('@ref:')) {
    const rumpf = wert.slice('@ref:'.length);
    const [kindRoh, ...rest] = rumpf.split(':');
    if (kindRoh === 'node') {
      const [graphName, typ] = rest;
      if (!graphName || !typ) throw new Error(`Ungültiger @ref:node-Platzhalter: ${wert}`);
      const graph = findeEindeutig(doc, 'visgraph', graphName);
      const node = (graph.nodes ?? []).find((n) => n.typ === typ);
      if (!node) throw new Error(`@ref:node:${graphName}:${typ} — kein Node dieses Typs im Graphen`);
      return node.id;
    }
    const kindKarte: Record<string, string> = { storey: 'storey', aufbau: 'assembly', sheet: 'sheet', graph: 'visgraph' };
    const kind = kindKarte[kindRoh ?? ''];
    const name = rest.join(':');
    if (!kind || !name) throw new Error(`Unbekannter/unvollständiger Platzhalter: ${wert}`);
    return findeEindeutig(doc, kind, name).id;
  }
  if (Array.isArray(wert)) return wert.map((w) => loeseWertAuf(w, doc));
  if (wert !== null && typeof wert === 'object') {
    return Object.fromEntries(
      Object.entries(wert as Record<string, unknown>).map(([k, v]) => [k, loeseWertAuf(v, doc)]),
    );
  }
  return wert;
}

/**
 * Löst @ref-Platzhalter in ALLEN Schritten des übergebenen Plans gegen den
 * gegebenen `doc`-Stand auf — liefert einen NEUEN `LaufPlan` (kein
 * In-Place-Mutieren der Eingabe, `titel`/`begruendung`/`commandId` bleiben
 * unverändert, nur `params` wird ersetzt). Aufrufer mit einem mehrschrittigen
 * Plan rufen diese Funktion i.d.R. JE SCHRITT frisch auf (s. Kopfkommentar
 * oben) — für einen Plan OHNE Selbst-Referenzen ist ein einziger Aufruf für
 * den gesamten Plan ebenso korrekt.
 */
export function loeseLaufPlanRefs(plan: LaufPlan, doc: KosmoDoc): LaufPlan {
  return {
    ...plan,
    schritte: plan.schritte.map((schritt) => ({
      ...schritt,
      params: loeseWertAuf(schritt.params, doc),
    })),
  };
}
