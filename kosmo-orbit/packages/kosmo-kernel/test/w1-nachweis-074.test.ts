import { describe, expect, it } from 'vitest';
import { KosmoDoc } from '../src/model/doc';
import { execute } from '../src/commands/core';
// Commands registrieren (wie fixtures.ts)
import '../src/commands/design';
import '../src/commands/publish';
import { planInnerSvg } from '../src/derive/plansvg';
import { dimensionLabelParts } from '../src/derive/dimensions';
import { dashWelt, LINIENTYP_SOLL } from '../src/derive/stilblatt';

/**
 * Beweis-Fixture v0.7.4 Welle 1 (P1/P5a/P5b): KEIN Golden — gezielte
 * Assertions, die die drei golden-berührenden Druck-Fixes je EINZELN
 * belegen. Schliesst die «kein Golden übt P1/P5»-Lücke (s.
 * `docs/GOLDEN-WECHSEL-074.md`): der bestehende Golden-Bestand enthält
 * weder einen Bemassungs-Zwischenraum mit mm-Rest 4–9 (P1) noch eine
 * `abbruch`-Region oder eine Grundriss-`projection`-Region, deren Stift
 * NICHT über Decke/Parzelle/Volumen bereits geprüft ist (P5a) — die
 * Wertänderungen laufen also durch, ohne dass ein einziger Byte-Golden sie
 * je zu Gesicht bekommt. Diese Datei macht sie trotzdem sichtbar/geprüft.
 *
 * Fixture: Rechteck 3615×4000 mm (P1: Aussenmass NICHT auf volle cm — mm-
 * Rest 5), ein Fenster Höhe 1505/Brüstung 900 (P1-Komposit: Zusatzzeile
 * «150⁵/90», Hochzahl NICHT am Stringende), eine freistehende Abbruch-Wand
 * (P5b) und ein Volumenkörper (P5a, Grundriss-Projektion).
 */
function nachweisFixture() {
  const doc = new KosmoDoc();
  const eg = execute(doc, 'design.geschossErstellen', { name: 'EG', index: 0, elevation: 0, height: 3000 });
  const storeyId = (eg.patches[0] as { id: string }).id;
  const aufbau = execute(doc, 'design.aufbauErstellen', {
    name: 'AW Beton 25',
    target: 'wall',
    layers: [{ material: 'beton', thickness: 250, function: 'tragend' }],
  });
  const assemblyId = (aufbau.patches[0] as { id: string }).id;
  const wand = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    execute(doc, 'design.wandZeichnen', { storeyId, a, b, assemblyId });

  // Aussenrechteck: Südwand 3615 mm lang → äussere Kette 361⁵ (mm-Rest 5, P1)
  wand({ x: 0, y: 0 }, { x: 3615, y: 0 });
  wand({ x: 3615, y: 0 }, { x: 3615, y: 4000 });
  wand({ x: 3615, y: 4000 }, { x: 0, y: 4000 });
  const west = wand({ x: 0, y: 4000 }, { x: 0, y: 0 });
  const westId = (west.patches[0] as { id: string }).id;

  // Fenster Höhe 1505/Brüstung 900 → Zusatzzeile «150⁵/90» (P1-Komposit,
  // Hochzahl NICHT am Stringende — danach folgt normaler Text «/90»)
  execute(doc, 'design.oeffnungSetzen', {
    wallId: westId,
    openingType: 'fenster',
    center: 2000,
    width: 1200,
    height: 1505,
    sill: 900,
  });

  // Freistehende Abbruch-Wand (P5b): eigene Achse, ausserhalb des Rechtecks —
  // keine Kollision mit der Aussenkontur/den Ecken oben.
  const abbruch = wand({ x: 6000, y: 0 }, { x: 6000, y: 2000 });
  const abbruchId = (abbruch.patches[0] as { id: string }).id;
  execute(doc, 'design.renovationSetzen', { ids: [abbruchId], status: 'abbruch' });

  // Volumenkörper (P5a): eigene Grundriss-Projektionsregion, ausserhalb des
  // Rechtecks — keine Überlagerung mit der Poché-Fläche der Wände.
  execute(doc, 'design.volumenErstellen', {
    storeyId,
    outline: [
      { x: 9000, y: 0 },
      { x: 11000, y: 0 },
      { x: 11000, y: 2000 },
      { x: 9000, y: 2000 },
    ],
    height: 3000,
  });

  return { doc, storeyId };
}

describe('v0.7.4 Welle 1 — Nachweis-Fixture (P1 SIA-Hochzahl-Tspan, P5a Projektions-Ton, P5b Abbruch-Kadenz)', () => {
  it('dimensionLabelParts zerlegt Ganzzahl-/Hochzahl-Teil statt Unicode-Hochzahl zu liefern (P1, Unit)', () => {
    // 3615 mm → 361 cm, Rest 5 (identischer Fall wie im Kommentar von
    // `dimensionLabel`, hier aber als {cm, rest}-Paar statt Unicode-String).
    expect(dimensionLabelParts(0, 3615)).toEqual({ cm: '361', rest: '5' });
    // Rest 0 → leerer rest-String (kein <tspan> nötig am Aufrufer)
    expect(dimensionLabelParts(0, 3600)).toEqual({ cm: '360', rest: '' });
    // Rest 1-3 verhält sich gleich wie 4-9 (die Zerlegung kennt keinen
    // Font-Sonderfall — der liegt bewusst allein am Renderer/Aufrufer).
    expect(dimensionLabelParts(0, 3611)).toEqual({ cm: '361', rest: '1' });
  });

  it('P1: die äussere Bemassungskette rendert den mm-Rest 4-9 als echten hochgestellten <tspan>, NICHT als Unicode-Zeichen ⁴-⁹', () => {
    const { doc, storeyId } = nachweisFixture();
    const { inner } = planInnerSvg(doc, storeyId, 100);
    // Kein einziges Unicode-Hochzahl-Zeichen mehr im SVG-Text (sonst würde
    // svg2pdf/Lato/IBM-Plex-Mono es beim PDF-Export lautlos verschlucken).
    expect([...inner].some((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.includes(c))).toBe(false);
    // Der Aussenmass-Text «361» + hochgestellte «5» als eigener <tspan> mit
    // NUTZEREINHEITEN-dy (keine em-Einheit) — Grundlinie kommt danach exakt
    // zurück (kein nachfolgender Text in diesem <text>-Element nötig).
    expect(inner).toMatch(/>361<tspan dy="-[\d.]+" font-size="[\d.]+">5<\/tspan><\/text>/);
  });

  it('P1-Komposit: die Zusatzzeile «150⁵/90» hat die Hochzahl NICHT am Stringende — der Normaltext danach (/90) wird auf eine zurückgesetzte Grundlinie gestellt', () => {
    const { doc, storeyId } = nachweisFixture();
    const { inner } = planInnerSvg(doc, storeyId, 100);
    // Vor der Hochzahl bleibt «150» normaler (escapter) Text, die Hochzahl
    // «5» ein eigener <tspan>, danach «/90» in einem <tspan> mit dy>0
    // (Grundlinie zurückgesetzt) UND der vollen font-size (nicht verkleinert).
    expect(inner).toMatch(/>150<tspan dy="-[\d.]+" font-size="[\d.]+">5<\/tspan><tspan dy="[\d.]+" font-size="[\d.]+">\/90<\/tspan><\/text>/);
  });

  it('P5a: Grundriss-Projektionsregionen (Volumenkörper) zeichnen NICHT mehr im geschnittenen #111, sondern im Projektions-Ton #666', () => {
    const { doc, storeyId } = nachweisFixture();
    const { inner } = planInnerSvg(doc, storeyId, 100);
    // Der Volumenkörper-Umriss (Klasse `projection`/`volumen`) trägt jetzt
    // GRAU.projiziert (#666) statt GRAU.geschnitten (#111).
    expect(inner).toMatch(/<path[^>]*fill="none" stroke="#666"[^>]*stroke-dasharray="[^"]*"\/>/);
    // Die geschnittenen Wände selbst bleiben unverändert bei #111 (kein
    // pauschaler Ton-Flip, nur die Projektionsregionen wechseln).
    expect(inner).toMatch(/stroke="#111"/);
  });

  it('P5b: die Abbruch-Kadenz folgt jetzt dem normativen Matrix-Vokabular LINIENTYP_SOLL.strich (3–1.5), nicht mehr der alten Bestandskadenz (1.5–0.8)', () => {
    const { doc, storeyId } = nachweisFixture();
    const { inner } = planInnerSvg(doc, storeyId, 100);
    const scale = 100;
    const neueKadenz = dashWelt(LINIENTYP_SOLL.strich, scale);
    const alteKadenz = dashWelt([1.5, 0.8], scale);
    expect(inner).toContain(`stroke-dasharray="${neueKadenz}"`);
    expect(inner).not.toContain(`stroke-dasharray="${alteKadenz}"`);
  });
});
