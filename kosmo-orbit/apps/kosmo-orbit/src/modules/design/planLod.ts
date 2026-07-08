/**
 * Plan-LOD (Owner-Befund «Grundriss aus Distanz schlecht»): zoomabhängiges
 * Level-of-Detail für die LIVE-Ansicht (PlanView). Reine Funktion, damit sie
 * ohne DOM getestet werden kann — wirkt NIE auf den Export/Druck-Pfad
 * (derive/plansvg.ts), der bleibt masstabstreu und golden-stabil.
 *
 * Massstab: PlanView führt den Zoom als „px pro mm Welt" (view.scale). Für
 * die Stufen rechnen wir auf „px pro Meter" um (× 1000) — das ist die Grösse,
 * an der sichtbare Feinheit (Schriftgrösse, Strichstärke) tatsächlich hängt.
 *
 * Schwellen (empirisch an den SVG-Massen in PlanView/plansvg orientiert):
 * Bemassungstext ist 280 Welt-mm hoch; bei ~18 px/m (= scale 0.018) schrumpft
 * er auf ~5 Bildschirm-Pixel — an der Grenze der Lesbarkeit. Bei ~40 px/m
 * (= scale 0.04, nahe 1:100 auf einem üblichen 96-dpi-Bildschirm) ist er mit
 * ~11 px gut lesbar. Das ergibt die drei Stufen:
 *
 *  - "voll":   ≥ 40 px/m — alles: Schraffuren, Raster, Bemassung, Symbole.
 *  - "mittel": 18…40 px/m — Schraffuren werden zu flachem Poché (wie im
 *              Druck), 1m-Raster weg; Bemassung und Öffnungssymbole bleiben.
 *  - "fern":   < 18 px/m — nur Poché-Flächen + Öffnungen (Fenster/Türen/
 *              Türanschlag); Texte, Bemassung, Raster und Nebenprojektionen
 *              (Treppenlauflinie, Volumen-/Zonen-/Deckenprojektion) weg.
 *
 * Hysterese: Auf-/Abstiegsschwellen liegen bewusst auseinander (40↔46,
 * 18↔22), damit ein Zittern des Massstabs exakt an einer Schwelle nicht zu
 * Flackern führt (Owner-Auflage: sanfter Übergang beim Zoomen).
 */

export type PlanLod = 'voll' | 'mittel' | 'fern';

const TIERS: readonly PlanLod[] = ['fern', 'mittel', 'voll'];

/** Unterschreiten dieser px/m-Werte lässt die jeweils höhere Stufe abfallen. */
const ABSTIEG: Record<PlanLod, number> = { fern: -Infinity, mittel: 18, voll: 40 };
/** Erreichen/Überschreiten dieser px/m-Werte lässt die jeweils tiefere Stufe aufsteigen. */
const AUFSTIEG: Record<PlanLod, number> = { fern: 22, mittel: 46, voll: Infinity };

/**
 * Ermittelt die LOD-Stufe aus dem effektiven px-pro-Meter-Verhältnis.
 *
 * `previous` ist die zuletzt gültige Stufe (für Hysterese). Ohne Vorgabe
 * (erster Aufruf) wird neutral von "mittel" aus bewertet — reicht der
 * Zoomwert klar in eine Nachbarstufe, springt die Funktion dorthin; sonst
 * bleibt sie bei "mittel" (konservative Default-Wahl ohne Zoom-Historie).
 */
export function planLod(pxProMeter: number, previous?: PlanLod): PlanLod {
  const wert = Number.isFinite(pxProMeter) ? Math.max(0, pxProMeter) : 0;
  let i = TIERS.indexOf(previous ?? 'mittel');
  // Abstieg: kann in einem Aufruf mehrere Stufen durchlaufen (schneller Zoom-Sprung).
  while (i > 0 && wert < ABSTIEG[TIERS[i]!]) i--;
  // Aufstieg: analog, aber nur wenn kein Abstieg griff (beide Richtungen exklusiv je Stufe).
  while (i < TIERS.length - 1 && wert >= AUFSTIEG[TIERS[i]!]) i++;
  return TIERS[i]!;
}
