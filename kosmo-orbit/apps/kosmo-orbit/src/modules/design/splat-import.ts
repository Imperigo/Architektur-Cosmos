/**
 * Splat-Kontext (LingBot-Map/gsplat-Kette der HomeStation) — eigener,
 * leichter Punkt-Renderer statt volles Gaussian-Splatting: als Bestands-
 * Referenz zählt Lage und Farbe, nicht die weiche Ellipse. Läuft flüssig
 * auch ohne GPU (SwiftShader/iPad); echtes Splatting bleibt Render-Sache
 * der HomeStation. Formate: .splat (antimatter15) und Gaussian-.ply.
 */

export interface SplatCloud {
  /** three-Raum (Meter, y-oben) — Splat-Quellen liefern bereits so. */
  positions: Float32Array;
  /** RGBA 0..1, vorvervielfacht nichts. */
  colors: Float32Array;
  /** Welt-Radius in Metern (mittlere Skala). */
  sizes: Float32Array;
  count: number;
}

const SH_C0 = 0.28209479177387814;

/** antimatter15 .splat: 32 Bytes/Splat — pos f32×3, scale f32×3, rgba u8×4, quat u8×4. */
export function parseSplatFile(buffer: ArrayBuffer): SplatCloud {
  const count = Math.floor(buffer.byteLength / 32);
  const view = new DataView(buffer);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 4);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const o = i * 32;
    positions[i * 3] = view.getFloat32(o, true);
    positions[i * 3 + 1] = view.getFloat32(o + 4, true);
    positions[i * 3 + 2] = view.getFloat32(o + 8, true);
    const sx = view.getFloat32(o + 12, true);
    const sy = view.getFloat32(o + 16, true);
    const sz = view.getFloat32(o + 20, true);
    sizes[i] = Math.max((sx + sy + sz) / 3, 0.001);
    colors[i * 4] = view.getUint8(o + 24) / 255;
    colors[i * 4 + 1] = view.getUint8(o + 25) / 255;
    colors[i * 4 + 2] = view.getUint8(o + 26) / 255;
    colors[i * 4 + 3] = view.getUint8(o + 27) / 255;
  }
  return { positions, colors, sizes, count };
}

/** Gaussian-PLY (INRIA-Stil): binary_little_endian mit x/y/z, f_dc_*, opacity, scale_*. */
export function parsePlyGaussian(buffer: ArrayBuffer): SplatCloud {
  const headerBytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 64 * 1024));
  const headerText = new TextDecoder('ascii').decode(headerBytes);
  const endTag = 'end_header\n';
  const endIdx = headerText.indexOf(endTag);
  if (endIdx === -1) throw new Error('PLY: kein end_header');
  const header = headerText.slice(0, endIdx);
  if (!header.includes('binary_little_endian')) {
    throw new Error('PLY: nur binary_little_endian wird unterstützt');
  }
  const countMatch = header.match(/element vertex (\d+)/);
  if (!countMatch) throw new Error('PLY: element vertex fehlt');
  const count = Number(countMatch[1]);

  // Property-Layout lesen (alle als float32 — Gaussian-PLYs sind so)
  const props: string[] = [];
  for (const line of header.split('\n')) {
    const m = line.match(/^property float (\S+)/);
    if (m) props.push(m[1]!);
  }
  const idx = (name: string) => props.indexOf(name);
  const ix = idx('x'), iy = idx('y'), iz = idx('z');
  if (ix === -1 || iy === -1 || iz === -1) throw new Error('PLY: x/y/z fehlen');
  const ir = idx('f_dc_0'), ig = idx('f_dc_1'), ib = idx('f_dc_2');
  const io = idx('opacity');
  const is0 = idx('scale_0'), is1 = idx('scale_1'), is2 = idx('scale_2');
  const ired = idx('red'), igreen = idx('green'), iblue = idx('blue');

  const stride = props.length;
  const data = new Float32Array(buffer, endIdx + endTag.length, count * stride);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 4);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const o = i * stride;
    positions[i * 3] = data[o + ix]!;
    positions[i * 3 + 1] = data[o + iy]!;
    positions[i * 3 + 2] = data[o + iz]!;
    if (ir !== -1) {
      colors[i * 4] = clamp01(0.5 + SH_C0 * data[o + ir]!);
      colors[i * 4 + 1] = clamp01(0.5 + SH_C0 * data[o + ig]!);
      colors[i * 4 + 2] = clamp01(0.5 + SH_C0 * data[o + ib]!);
    } else if (ired !== -1) {
      colors[i * 4] = data[o + ired]! / 255;
      colors[i * 4 + 1] = data[o + igreen]! / 255;
      colors[i * 4 + 2] = data[o + iblue]! / 255;
    } else {
      colors[i * 4] = colors[i * 4 + 1] = colors[i * 4 + 2] = 0.6;
    }
    colors[i * 4 + 3] = io !== -1 ? 1 / (1 + Math.exp(-data[o + io]!)) : 1;
    sizes[i] =
      is0 !== -1
        ? Math.max((Math.exp(data[o + is0]!) + Math.exp(data[o + is1]!) + Math.exp(data[o + is2]!)) / 3, 0.001)
        : 0.02;
  }
  return { positions, colors, sizes, count };
}

export function parseSplatCloud(name: string, buffer: ArrayBuffer): SplatCloud {
  return name.toLowerCase().endsWith('.ply') ? parsePlyGaussian(buffer) : parseSplatFile(buffer);
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
