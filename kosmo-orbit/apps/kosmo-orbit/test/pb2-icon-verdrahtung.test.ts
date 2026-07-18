import { describe, expect, it } from 'vitest';
import { WERKZEUG_KATALOG } from '../src/modules/design/island/island-katalog';
import { ISLAND_GLYPHEN } from '../src/modules/design/island/island-glyphen';

/**
 * PB2 «Werkzeug-Chrome» (v0.8.4, `docs/V084-SPEZ.md` §3 E8 + §7 Sanktion 3,
 * Bauauftrag Punkt 1) — Icon-Verdrahtung: `island-katalog.ts`s `glyphe`-Feld
 * trägt echte Icon-Components (statt reiner Text-Kürzel). Eigene, NEUE
 * Testdatei (additiv zu `island-katalog-pd2.test.ts`, das nur
 * `toolId`/`hinweis`/`status` prüft und `glyphe` nie anfasst — keine
 * bestehende Testdatei geändert).
 *
 * Acht Werkzeuge bekommen ihre bereits bestehenden `werkzeug-icons.tsx`-
 * SVGs (Auswahl/Wand/Volumen/Zone/Dach/Treppe/Stütze/Mesh — der Bauauftrag
 * sprach von «9 Zeichenwerkzeugen», aber `werkzeug-icons.tsx`s neuntes Icon
 * ist `IconSchnitt`, und `schnitt` ist KEIN Katalog-Werkzeug, s.
 * `island-glyphen.test.tsx`s eigene `KATALOG_IDS_BEREITS_ECHT`-Liste, die
 * exakt dieselben acht nennt) — dieser Test beweist die Zahl 8 statt der
 * Bauauftrags-Rundung 9 direkt an den Daten.
 *
 * **PE2 (v0.8.4, Bauauftrag Punkt 2):** `skizze` — zu PB2s Zeit noch bewusst
 * Text (`'SK'`, keine der 20 W1-Icons) — bekam inzwischen ihr eigenes 21.
 * `ISLAND_GLYPHEN`-Icon (`island-glyphen.tsx`). Der PB2-Test unten, der den
 * String-Rest ausdrücklich als «bewusst» bewies, ist damit überholt (kein
 * Fehler von PB2 — der genau dokumentierte Zeitstand hat sich seither
 * geändert) und hier auf die neue, vollständige Realität nachgezogen: ALLE
 * 29 Katalog-Werkzeuge tragen jetzt eine Icon-Component, 0 bleiben String.
 */

const ACHT_BESTANDS_ICON_IDS = ['auswahl', 'wand', 'volumen', 'zone', 'dach', 'treppe', 'stuetze', 'mesh'];

function werkzeug(id: string) {
  const w = WERKZEUG_KATALOG.find((x) => x.id === id);
  if (!w) throw new Error(`Werkzeug ${id} fehlt im Katalog`);
  return w;
}

describe('island-katalog — PB2 Icon-Verdrahtung (glyphe: string | ComponentType)', () => {
  it('bleibt 29/29 (PB2 ändert nur den glyphe-Wert, keine Werkzeuge)', () => {
    expect(WERKZEUG_KATALOG).toHaveLength(29);
  });

  it.each(ACHT_BESTANDS_ICON_IDS)('%s trägt eine Component (werkzeug-icons.tsx-SVG), keinen String mehr', (id) => {
    expect(typeof werkzeug(id).glyphe).toBe('function');
  });

  it.each(Object.keys(ISLAND_GLYPHEN))('%s trägt exakt sein ISLAND_GLYPHEN-Icon', (id) => {
    expect(werkzeug(id).glyphe).toBe(ISLAND_GLYPHEN[id]);
  });

  // PE2 (v0.8.4, Bauauftrag Punkt 2): löst den vorigen «skizze bleibt Text»-
  // Test ab — `skizze` trägt jetzt ihr `ISLAND_GLYPHEN`-Icon wie die übrigen
  // 20, bewiesen über denselben `it.each`-Zweig oben (`skizze` ist jetzt Teil
  // von `Object.keys(ISLAND_GLYPHEN)`).
  it('«skizze» trägt jetzt ein echtes Icon (PE2, 21. ISLAND_GLYPHEN-Eintrag) — kein String-Rest mehr im Katalog', () => {
    expect(typeof werkzeug('skizze').glyphe).toBe('function');
    expect(werkzeug('skizze').glyphe).toBe(ISLAND_GLYPHEN['skizze']);
  });

  it('alle 29 Werkzeuge tragen eine Icon-Component, 0 bleiben String (PE2 schliesst die letzte Lücke)', () => {
    const komponenten = WERKZEUG_KATALOG.filter((w) => typeof w.glyphe === 'function');
    const strings = WERKZEUG_KATALOG.filter((w) => typeof w.glyphe === 'string');
    expect(komponenten).toHaveLength(29);
    expect(strings).toHaveLength(0);
  });

  it('die 8 Bestands-Icons und die 21 ISLAND_GLYPHEN-Icons überschneiden sich nicht und ergeben zusammen 29 (keine Katalog-Id doppelt/fehlend)', () => {
    const glyphenIds = new Set(Object.keys(ISLAND_GLYPHEN));
    for (const id of ACHT_BESTANDS_ICON_IDS) {
      expect(glyphenIds.has(id)).toBe(false);
    }
    expect(ACHT_BESTANDS_ICON_IDS).toHaveLength(8);
    expect(glyphenIds.size).toBe(21);
    expect(ACHT_BESTANDS_ICON_IDS.length + glyphenIds.size).toBe(29);
  });
});
