import { KosmoDoc, type DocJson } from './doc';

/**
 * Fremd-JSON-Schranke (Serie I / Batch B7 — Parser-Robustheit) — jede Stelle,
 * die eine `.kosmo`-Datei oder ein IndexedDB-Vault-Record in ein `KosmoDoc`
 * verwandelt, muss durch hier laufen, BEVOR das Ergebnis den lebenden State
 * erreicht. Schliesst drei Fehlklassen defensiv:
 *
 *  1. Prototype-Pollution: `__proto__`/`constructor`/`prototype` als
 *     Objekt-Schlüssel werden abgelehnt, egal wie tief verschachtelt.
 *  2. Hänger/OOM: Rohtext-, Tiefen- und Knotenzahl-Deckel gegen übergrosse
 *     oder pathologisch verschachtelte JSON-Strukturen.
 *  3. Blanker Absturz: kaputtes/abgeschnittenes JSON oder eine Struktur, die
 *     nicht wenigstens minimal wie ein `DocJson` aussieht.
 *
 * Wirft NIE — jede Funktion hier liefert ein Ergebnis-Objekt
 * (`{ok:true,…}` / `{ok:false,fehler}`), der Aufrufer schreibt bei
 * `ok:false` keinen State. Reine Funktionen — ohne UI/DOM prüfbar.
 */

export interface GuardLimits {
  /** Rohtext-Obergrenze in Zeichen, bevor überhaupt geparst wird. */
  maxTextLength: number;
  /** Maximale Verschachtelungstiefe (Objekte/Arrays ineinander). */
  maxDepth: number;
  /** Maximale Gesamtzahl geprüfter Knoten (Objekte+Arrays+Blätter). */
  maxNodes: number;
}

/** 32 MB Rohtext, 64 Ebenen tief, 300k Knoten — grosszügig für reale Projekte
 * (Hunderte Entities), hart genug gegen Zip-Bomben-artige `.kosmo`-Dateien. */
export const DEFAULT_GUARD_LIMITS: GuardLimits = {
  maxTextLength: 32 * 1024 * 1024,
  maxDepth: 64,
  maxNodes: 300_000,
};

const GEFAEHRLICHE_SCHLUESSEL = new Set(['__proto__', 'constructor', 'prototype']);

export type GuardResult<T> = { ok: true; value: T } | { ok: false; fehler: string };

/**
 * Rekursiv: gefährliche Schlüssel ablehnen (Prototype-Pollution-Schutz) und
 * Tiefe/Knotenzahl deckeln. `zaehler` ist ein Mutations-Akkumulator (kein
 * Closure-State), damit die Funktion selbst zustandslos bleibt.
 */
function pruefeStruktur(wert: unknown, limits: GuardLimits, tiefe: number, zaehler: { n: number }): string | null {
  zaehler.n++;
  if (zaehler.n > limits.maxNodes) return `zu viele Knoten (> ${limits.maxNodes})`;
  if (tiefe > limits.maxDepth) return `zu tief verschachtelt (> ${limits.maxDepth} Ebenen)`;
  if (Array.isArray(wert)) {
    for (const el of wert) {
      const fehler = pruefeStruktur(el, limits, tiefe + 1, zaehler);
      if (fehler) return fehler;
    }
    return null;
  }
  if (wert !== null && typeof wert === 'object') {
    for (const schluessel of Object.keys(wert as Record<string, unknown>)) {
      if (GEFAEHRLICHE_SCHLUESSEL.has(schluessel)) {
        return `gesperrter Schlüssel «${schluessel}» (Prototype-Pollution-Schutz)`;
      }
      const fehler = pruefeStruktur((wert as Record<string, unknown>)[schluessel], limits, tiefe + 1, zaehler);
      if (fehler) return fehler;
    }
    return null;
  }
  return null;
}

/**
 * Gehärtetes `JSON.parse`: prüft die Rohtext-Grösse VOR dem Parsen, fängt
 * Parse-Fehler ab und läuft danach durch die Struktur-Schranke
 * (Tiefe/Knoten/gesperrte Schlüssel). Wirft nie.
 */
export function safeJsonParse(text: string, limits: GuardLimits = DEFAULT_GUARD_LIMITS): GuardResult<unknown> {
  if (typeof text !== 'string' || text.length === 0) {
    return { ok: false, fehler: 'leere Eingabe' };
  }
  if (text.length > limits.maxTextLength) {
    return { ok: false, fehler: `Rohtext zu gross (> ${limits.maxTextLength} Zeichen)` };
  }
  let wert: unknown;
  try {
    wert = JSON.parse(text);
  } catch (err) {
    return { ok: false, fehler: `ungültiges JSON: ${err instanceof Error ? err.message : String(err)}` };
  }
  const fehler = pruefeStruktur(wert, limits, 0, { n: 0 });
  if (fehler) return { ok: false, fehler };
  return { ok: true, value: wert };
}

/**
 * Struktur-Guard für einen bereits geparsten Wert (z.B. ein IndexedDB-Vault-
 * Record, der nie durch `JSON.parse` lief). Prüft zuerst dieselbe
 * Tiefe/Knoten/Schlüssel-Schranke, dann die minimale `DocJson`-Form:
 * `entities` ein Array aus Objekten mit `id`/`kind` als String, `settings`
 * (falls vorhanden) ein Objekt. Das ist bewusst kein vollständiges
 * Entity-Schema (das bliebe Modell-Umbau) — nur genug, damit `KosmoDoc`
 * nicht auf Müll crasht.
 */
export function parseDocJson(wert: unknown, limits: GuardLimits = DEFAULT_GUARD_LIMITS): GuardResult<DocJson> {
  const strukturFehler = pruefeStruktur(wert, limits, 0, { n: 0 });
  if (strukturFehler) return { ok: false, fehler: strukturFehler };
  if (wert === null || typeof wert !== 'object' || Array.isArray(wert)) {
    return { ok: false, fehler: 'kein Objekt auf oberster Ebene' };
  }
  const obj = wert as Record<string, unknown>;
  if (!Array.isArray(obj['entities'])) {
    return { ok: false, fehler: '„entities" fehlt oder ist kein Array' };
  }
  for (const e of obj['entities']) {
    if (e === null || typeof e !== 'object' || Array.isArray(e)) {
      return { ok: false, fehler: 'Entity ist kein Objekt' };
    }
    const rec = e as Record<string, unknown>;
    if (typeof rec['id'] !== 'string' || !rec['id']) {
      return { ok: false, fehler: 'Entity ohne gültige „id"' };
    }
    if (typeof rec['kind'] !== 'string' || !rec['kind']) {
      return { ok: false, fehler: 'Entity ohne gültige „kind"' };
    }
  }
  const settings = obj['settings'];
  if (settings !== undefined && (settings === null || typeof settings !== 'object' || Array.isArray(settings))) {
    return { ok: false, fehler: '„settings" ist kein Objekt' };
  }
  return { ok: true, value: obj as unknown as DocJson };
}

/**
 * Der eine Einstieg fürs `.kosmo`-Laden aus Rohtext (`model/model.json`):
 * Rohtext-Guard → Struktur-Guard → `KosmoDoc.fromJSON` (selbst nochmal in
 * einem try/catch, falls die Rehydrierung trotz gültiger Grundform stolpert).
 * Liefert `{ok:true,doc}` oder `{ok:false,fehler}` — nie ein Throw nach
 * aussen, nie ein State-Write bei `ok:false`.
 */
export function parseKosmoSafe(
  text: string,
  limits: GuardLimits = DEFAULT_GUARD_LIMITS,
): { ok: true; doc: KosmoDoc } | { ok: false; fehler: string } {
  const roh = safeJsonParse(text, limits);
  if (!roh.ok) return roh;
  const struktur = parseDocJson(roh.value, limits);
  if (!struktur.ok) return struktur;
  try {
    const doc = KosmoDoc.fromJSON(struktur.value);
    return { ok: true, doc };
  } catch (err) {
    return { ok: false, fehler: `fromJSON fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}` };
  }
}
