import { describe, expect, it } from 'vitest';
import { WERKZEUG_KATALOG } from '../src/modules/design/island/island-katalog';
import { ISLAND_GLYPHEN } from '../src/modules/design/island/island-glyphen';

/**
 * PB2 «Werkzeug-Chrome» (v0.8.4, `docs/V084-SPEZ.md` §3 E8 + §7 Sanktion 3,
 * Bauauftrag Punkt 1) — Icon-Verdrahtung: `island-katalog.ts`s `glyphe`-Feld
 * trägt jetzt echte Icon-Components (statt reiner Text-Kürzel) für 28 der 29
 * Katalog-Werkzeuge. Eigene, NEUE Testdatei (additiv zu
 * `island-katalog-pd2.test.ts`, das nur `toolId`/`hinweis`/`status` prüft
 * und `glyphe` nie anfasst — keine bestehende Testdatei geändert).
 *
 * Acht Werkzeuge bekommen ihre bereits bestehenden `werkzeug-icons.tsx`-
 * SVGs (Auswahl/Wand/Volumen/Zone/Dach/Treppe/Stütze/Mesh — der Bauauftrag
 * sprach von «9 Zeichenwerkzeugen», aber `werkzeug-icons.tsx`s neuntes Icon
 * ist `IconSchnitt`, und `schnitt` ist KEIN Katalog-Werkzeug, s.
 * `island-glyphen.test.tsx`s eigene `KATALOG_IDS_BEREITS_ECHT`-Liste, die
 * exakt dieselben acht nennt) — dieser Test beweist die Zahl 8 statt der
 * Bauauftrags-Rundung 9 direkt an den Daten.
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

  it('«skizze» bleibt bewusst Text (kein Icon in der 20er-Lieferung, D12/island-glyphen.tsx)', () => {
    expect(werkzeug('skizze').glyphe).toBe('SK');
    expect(typeof werkzeug('skizze').glyphe).toBe('string');
  });

  it('genau 28 von 29 Werkzeugen tragen eine Icon-Component, genau 1 bleibt String', () => {
    const komponenten = WERKZEUG_KATALOG.filter((w) => typeof w.glyphe === 'function');
    const strings = WERKZEUG_KATALOG.filter((w) => typeof w.glyphe === 'string');
    expect(komponenten).toHaveLength(28);
    expect(strings).toHaveLength(1);
    expect(strings[0]!.id).toBe('skizze');
  });

  it('die 8 Bestands-Icons und die 20 ISLAND_GLYPHEN-Icons überschneiden sich nicht (keine Katalog-Id doppelt gezählt)', () => {
    const glyphenIds = new Set(Object.keys(ISLAND_GLYPHEN));
    for (const id of ACHT_BESTANDS_ICON_IDS) {
      expect(glyphenIds.has(id)).toBe(false);
    }
    expect(ACHT_BESTANDS_ICON_IDS).toHaveLength(8);
    expect(glyphenIds.size).toBe(20);
    expect(ACHT_BESTANDS_ICON_IDS.length + glyphenIds.size + 1).toBe(29); // +1 = skizze
  });
});
