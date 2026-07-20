// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BLICK_MAX_MEGAPIXEL,
  blickErfassen,
  blickRingPuffer,
  blickRingZuruecksetzen,
  downscaleGroesse,
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

  // v0.8.10 (Fable, «Inselrein»-Fund): die station-einstellungen-*-Anker
  // existieren nur im Manuell-Chrome — im Island-Modus (Produktions-Default
  // seit 0.8.2) war die Erkennung blind. Jede Island-Station trägt jetzt
  // zusätzlich einen station-exklusiven Insel-Anker.
  it('erkennt KosmoVis im Island-Modus am island-graph-root-Anker', () => {
    setzeAnker('island-graph-root');
    expect(erkenneAktiveStation()).toEqual({ id: 'vis', titel: 'KosmoVis' });
  });

  it('erkennt KosmoDesign im Island-Modus am island-zeichnen-root-Anker', () => {
    setzeAnker('island-zeichnen-root');
    expect(erkenneAktiveStation()).toEqual({ id: 'design', titel: 'KosmoDesign' });
  });

  it('erkennt KosmoPublish im Island-Modus am island-blatt-root-Anker', () => {
    setzeAnker('island-blatt-root');
    expect(erkenneAktiveStation()).toEqual({ id: 'publish', titel: 'KosmoPublish' });
  });

  it('erkennt KosmoPrepare im Island-Modus am island-aufnahme-root-Anker', () => {
    setzeAnker('island-aufnahme-root');
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

describe('downscaleGroesse (v0.7.1 E1/2A «Blick-Cloud-UI») — reine Zielgrössen-Berechnung ohne Canvas', () => {
  it('4000×3000 (12 MP) wird auf ≤ 1.15 MP verkleinert, Seitenverhältnis (4:3) bleibt erhalten', () => {
    const ziel = downscaleGroesse({ breite: 4000, hoehe: 3000 });
    // Breite/Höhe werden unabhängig gerundet — minimales Überschiessen durch
    // Rundung (<0.1 %) ist normal und unproblematisch, kein hartes ≤.
    expect(ziel.breite * ziel.hoehe).toBeLessThanOrEqual(BLICK_MAX_MEGAPIXEL * 1_000_000 * 1.001);
    // 4:3 bleibt bis auf Rundungsfehler erhalten.
    expect(ziel.breite / ziel.hoehe).toBeCloseTo(4000 / 3000, 2);
    expect(ziel).toEqual({ breite: 1238, hoehe: 929 });
  });

  it('800×600 (0.48 MP, bereits unter dem Deckel) bleibt unangetastet', () => {
    expect(downscaleGroesse({ breite: 800, hoehe: 600 })).toEqual({ breite: 800, hoehe: 600 });
  });

  it('genau am Deckel (z.B. 1150×1000 = 1.15 MP) bleibt unangetastet — kein Downscale bei ==', () => {
    expect(downscaleGroesse({ breite: 1150, hoehe: 1000 })).toEqual({ breite: 1150, hoehe: 1000 });
  });

  it('ein extremes Hochformat (1000×5000, 5 MP) wird ebenfalls gedeckelt, Verhältnis bleibt', () => {
    const ziel = downscaleGroesse({ breite: 1000, hoehe: 5000 });
    // Breite/Höhe werden unabhängig gerundet — minimales Überschiessen durch
    // Rundung (<0.1 %) ist normal und unproblematisch, kein hartes ≤.
    expect(ziel.breite * ziel.hoehe).toBeLessThanOrEqual(BLICK_MAX_MEGAPIXEL * 1_000_000 * 1.001);
    expect(ziel.hoehe / ziel.breite).toBeCloseTo(5, 1);
  });

  it('nie kleiner als 1×1 (Degenerierte Eingabe wird nicht negativ/0)', () => {
    expect(downscaleGroesse({ breite: 0, hoehe: 0 })).toEqual({ breite: 1, hoehe: 1 });
  });

  it('ein eigener, kleinerer Deckel (maxMegapixel-Parameter) wird respektiert', () => {
    const ziel = downscaleGroesse({ breite: 2000, hoehe: 2000 }, 0.5);
    expect(ziel.breite * ziel.hoehe).toBeLessThanOrEqual(0.5 * 1_000_000);
    expect(ziel.breite).toBe(ziel.hoehe); // quadratisch bleibt quadratisch
  });
});
