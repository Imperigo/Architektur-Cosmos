import { Colors, DxfWriter, LWPolylineFlags, TextHorizontalAlignment, Units, point2d, point3d } from '@tarikjabiri/dxf';
import type { KosmoDoc } from '../model/doc';
import { derivePlan } from './plan';
import { deriveDimensions, dimensionLabel } from './dimensions';

/**
 * DXF-Export (Owner-Q30) — Grundriss eines Geschosses als DXF R2018 für den
 * Austausch mit ArchiCAD/AutoCAD/Vectorworks. Weltkoordinaten in mm, y nach
 * Norden (CAD-Konvention, keine Spiegelung). Semantik → Layer.
 */

const LAYERS = {
  wand: 'KOSMO-WAND',
  symbol: 'KOSMO-SYMBOL',
  projektion: 'KOSMO-PROJEKTION',
  bemassung: 'KOSMO-BEMASSUNG',
} as const;

export function exportDxf(doc: KosmoDoc, storeyId: string): string {
  const dxf = new DxfWriter();
  dxf.setUnits(Units.Millimeters);
  dxf.addLayer(LAYERS.wand, Colors.White);
  dxf.addLayer(LAYERS.symbol, Colors.Cyan);
  dxf.addLayer(LAYERS.projektion, 8); // ACI 8 = Grau
  dxf.addLayer(LAYERS.bemassung, Colors.Red);

  const plan = derivePlan(doc, storeyId);

  for (const r of plan.regions) {
    const layer = r.classes.includes('projection') ? LAYERS.projektion : LAYERS.wand;
    for (const ring of r.rings) {
      if (ring.length < 2) continue;
      dxf.addLWPolyline(
        ring.map((p) => ({ point: point2d(p.x, p.y) })),
        { flags: LWPolylineFlags.Closed, layerName: layer },
      );
    }
  }
  for (const l of plan.lines) {
    dxf.addLine(point3d(l.a.x, l.a.y), point3d(l.b.x, l.b.y), { layerName: LAYERS.symbol });
  }
  for (const a of plan.arcs) {
    dxf.addArc(
      point3d(a.center.x, a.center.y),
      a.radius,
      (a.startAngle * 180) / Math.PI,
      (a.endAngle * 180) / Math.PI,
      { layerName: LAYERS.symbol },
    );
  }

  // Bemassungsketten als Linien + Ticks + Text (massstabsneutral, 260 mm Schrift ≈ 2.6 mm bei 1:100)
  const dims = deriveDimensions(doc, storeyId);
  const textH = 260;
  const tick = 80;
  for (const c of dims.chains) {
    const t0 = c.ticks[0]!;
    const t1 = c.ticks[c.ticks.length - 1]!;
    if (c.axis === 'x') {
      dxf.addLine(point3d(t0, c.offset), point3d(t1, c.offset), { layerName: LAYERS.bemassung });
      for (const t of c.ticks) {
        dxf.addLine(point3d(t - tick, c.offset - tick), point3d(t + tick, c.offset + tick), {
          layerName: LAYERS.bemassung,
        });
      }
      for (let i = 0; i < c.ticks.length - 1; i++) {
        const mid = (c.ticks[i]! + c.ticks[i + 1]!) / 2;
        dxf.addText(point3d(mid, c.offset + 120), textH, dimensionLabel(c.ticks[i]!, c.ticks[i + 1]!), {
          layerName: LAYERS.bemassung,
          horizontalAlignment: TextHorizontalAlignment.Center,
          secondAlignmentPoint: point3d(mid, c.offset + 120),
        });
      }
    } else {
      dxf.addLine(point3d(c.offset, t0), point3d(c.offset, t1), { layerName: LAYERS.bemassung });
      for (const t of c.ticks) {
        dxf.addLine(point3d(c.offset - tick, t - tick), point3d(c.offset + tick, t + tick), {
          layerName: LAYERS.bemassung,
        });
      }
      for (let i = 0; i < c.ticks.length - 1; i++) {
        const mid = (c.ticks[i]! + c.ticks[i + 1]!) / 2;
        dxf.addText(point3d(c.offset - 120, mid), textH, dimensionLabel(c.ticks[i]!, c.ticks[i + 1]!), {
          layerName: LAYERS.bemassung,
          rotation: 90,
          horizontalAlignment: TextHorizontalAlignment.Center,
          secondAlignmentPoint: point3d(c.offset - 120, mid),
        });
      }
    }
  }

  return dxf.stringify();
}
