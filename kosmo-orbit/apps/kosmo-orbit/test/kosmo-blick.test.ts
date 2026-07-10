// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  blickErfassen,
  blickRingPuffer,
  blickRingZuruecksetzen,
  erkenneAktiveStation,
  ergaenzendeBilderAusRing,
  waehleErgaenzendeBilder,
  type Blick,
} from '../src/state/kosmo-blick';

/**
 * v0.6.8 («Kosmo sieht mit») — Unit-Abdeckung der Teile von `kosmo-blick.ts`,
 * die OHNE echtes Rendering testbar sind: Stations-Erkennung (DOM-Anker),
 * Text-Fallback, Ringpuffer. Die eigentlichen Bild-Wege (3D-Viewport-Capture,
 * SVG→Canvas→dataURL) brauchen echtes Rendering/Canvas-Decoding — jsdom bildet
 * das nicht ab (`HTMLCanvasElement.getContext('2d')`/`Image.onload` sind
 * hier Stubs) — die sind bewusst NICHT hier, sondern in `e2e/kosmo-blick.spec.ts`
 * (echter Chromium) abgedeckt. Ehrlich statt einen grünen, aber blinden Test.
 */

function setzeAnker(testid: string | null): void {
  document.body.innerHTML = '';
  if (testid) {
    const el = document.createElement('div');
    el.setAttribute('data-testid', testid);
    document.body.appendChild(el);
  }
}

afterEach(() => {
  document.body.innerHTML = '';
  blickRingZuruecksetzen();
});

describe('erkenneAktiveStation', () => {
  it('erkennt KosmoDesign am station-einstellungen-design-Anker', () => {
    setzeAnker('station-einstellungen-design');
    expect(erkenneAktiveStation()).toEqual({ id: 'design', titel: 'KosmoDesign' });
  });

  it('erkennt KosmoPrepare am prepare-werkzeugleiste-Anker', () => {
    setzeAnker('prepare-werkzeugleiste');
    expect(erkenneAktiveStation()).toEqual({ id: 'prepare', titel: 'KosmoPrepare' });
  });

  it('ohne jeden Anker: unbekannt/Zentrale', () => {
    setzeAnker(null);
    expect(erkenneAktiveStation()).toEqual({ id: 'unbekannt', titel: 'Zentrale' });
  });
});

describe('blickErfassen — Text-Fallback für Nicht-Bild-Stationen', () => {
  it('liefert null für die unbekannte Station (Zentrale) — nichts Ehrliches zu zeigen', async () => {
    const blick = await blickErfassen({ id: 'unbekannt', titel: 'Zentrale' });
    expect(blick).toBeNull();
  });

  it('data-Station bekommt strukturierten Text statt eines Bilds', async () => {
    const blick = await blickErfassen({ id: 'data', titel: 'KosmoData' });
    expect(blick).not.toBeNull();
    expect(blick!.bild).toBeUndefined();
    expect(blick!.text).toContain('KosmoData');
    expect(blick!.text).toMatch(/Geschoss/);
  });

  it('design-Station ohne Viewport/SVG im DOM fällt ehrlich auf Text zurück', async () => {
    setzeAnker(null); // kein planview/section im jsdom-DOM, kein __kosmoViewport
    const blick = await blickErfassen({ id: 'design', titel: 'KosmoDesign' });
    expect(blick!.bild).toBeUndefined();
    expect(blick!.text).toContain('KosmoDesign');
  });
});

describe('Ringpuffer', () => {
  it('hält höchstens die letzten 3 Blicke', async () => {
    for (let i = 0; i < 5; i++) {
      await blickErfassen({ id: 'data', titel: 'KosmoData' });
    }
    expect(blickRingPuffer()).toHaveLength(3);
  });

  it('ergaenzendeBilderAusRing (Modul-Ring) liefert [] ohne jeden Bild-Blick — jsdom erfasst nie ein echtes Bild', async () => {
    await blickErfassen({ id: 'data', titel: 'KosmoData' });
    const letzter = (await blickErfassen({ id: 'data', titel: 'KosmoData' }))!;
    // Beide sind reine Text-Blicke (kein `bild` im jsdom) — die Ergänzung
    // filtert das konsequent heraus (nur Bild-Blicke sind fürs Vision-Modell wertvoll).
    expect(ergaenzendeBilderAusRing(letzter)).toEqual([]);
  });

  it('waehleErgaenzendeBilder (reine Funktion): nur Bild-Blicke, nie der aktuelle selbst, gedeckelt auf `anzahl`', () => {
    const textBlick: Blick = { station: 'data', stationTitel: 'KosmoData', zeit: 1, text: 'nur Text' };
    const bildA: Blick = {
      station: 'design',
      stationTitel: 'KosmoDesign',
      zeit: 2,
      bild: { mediaType: 'image/png', dataBase64: 'AAA', quelle: 'viewport3d' },
    };
    const bildB: Blick = {
      station: 'vis',
      stationTitel: 'KosmoVis',
      zeit: 3,
      bild: { mediaType: 'image/png', dataBase64: 'BBB', quelle: 'vis-render' },
    };
    const aktuell: Blick = {
      station: 'design',
      stationTitel: 'KosmoDesign',
      zeit: 4,
      bild: { mediaType: 'image/png', dataBase64: 'CCC', quelle: 'viewport3d' },
    };
    const ring = [textBlick, bildA, bildB, aktuell];

    // Nur Bild-Blicke, aktuell (zeit=4) ausgeschlossen, Standard-Deckel 2.
    expect(waehleErgaenzendeBilder(ring, aktuell)).toEqual([
      { mediaType: 'image/png', dataBase64: 'AAA', quelle: 'viewport3d' },
      { mediaType: 'image/png', dataBase64: 'BBB', quelle: 'vis-render' },
    ]);
    // Deckel auf 1 → nur der jüngste Bild-Blick vor `aktuell`.
    expect(waehleErgaenzendeBilder(ring, aktuell, 1)).toEqual([
      { mediaType: 'image/png', dataBase64: 'BBB', quelle: 'vis-render' },
    ]);
  });
});
