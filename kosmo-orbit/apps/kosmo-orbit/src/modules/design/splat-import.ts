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

/**
 * Serie I / B7 — Import-Härtung: Deckel gegen absurd grosse .splat/.ply-
 * Dateien (OOM-Bremse), bevor überhaupt eine Vertex-Zahl aus dem Header
 * gelesen/verarbeitet wird. 300 MB deckt reale Punktwolken grosszügig ab.
 */
export const MAX_SPLAT_BYTES = 300 * 1024 * 1024;

/** Obergrenze für eine aus dem PLY-Header gelesene Vertex-Zahl — hält eine
 * gefälschte/absurde Kopfzeile (z.B. `element vertex 999999999999`) davon ab,
 * überhaupt einen Allokationsversuch auszulösen. */
export const MAX_PLY_VERTICES = 50_000_000;

/** antimatter15 .splat: 32 Bytes/Splat — pos f32×3, scale f32×3, rgba u8×4, quat u8×4. */
export function parseSplatFile(buffer: ArrayBuffer): SplatCloud {
  if (buffer.byteLength > MAX_SPLAT_BYTES) {
    throw new Error(`.splat: Datei zu gross (> ${Math.round(MAX_SPLAT_BYTES / (1024 * 1024))} MB)`);
  }
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
  if (buffer.byteLength > MAX_SPLAT_BYTES) {
    throw new Error(`PLY: Datei zu gross (> ${Math.round(MAX_SPLAT_BYTES / (1024 * 1024))} MB)`);
  }
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
  if (!Number.isInteger(count) || count < 0 || count > MAX_PLY_VERTICES) {
    throw new Error(`PLY: unplausible Vertex-Zahl im Header (${countMatch[1]})`);
  }

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
  const datenStart = endIdx + endTag.length;
  const benoetigteBytes = count * stride * 4;
  if (stride <= 0 || datenStart + benoetigteBytes > buffer.byteLength) {
    throw new Error('PLY: abgeschnitten (Header verspricht mehr Vertices als Bytes vorhanden sind)');
  }
  // B7-Fund: eine DataView statt einer Float32Array-Sicht auf den Rohbuffer —
  // `datenStart` (Headerlänge) ist bei echten PLY-Dateien so gut wie nie
  // durch 4 teilbar (variable Kommentare/Property-Zeilen), eine
  // `Float32Array(buffer, datenStart, …)`-Sicht würde dann mit einem
  // RangeError auf gültigen Dateien crashen. DataView kennt diese
  // Alignment-Pflicht nicht.
  const dv = new DataView(buffer, datenStart, benoetigteBytes);
  const data = (i: number) => dv.getFloat32(i * 4, true);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 4);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const o = i * stride;
    positions[i * 3] = data(o + ix);
    positions[i * 3 + 1] = data(o + iy);
    positions[i * 3 + 2] = data(o + iz);
    if (ir !== -1) {
      colors[i * 4] = clamp01(0.5 + SH_C0 * data(o + ir));
      colors[i * 4 + 1] = clamp01(0.5 + SH_C0 * data(o + ig));
      colors[i * 4 + 2] = clamp01(0.5 + SH_C0 * data(o + ib));
    } else if (ired !== -1) {
      colors[i * 4] = data(o + ired) / 255;
      colors[i * 4 + 1] = data(o + igreen) / 255;
      colors[i * 4 + 2] = data(o + iblue) / 255;
    } else {
      colors[i * 4] = colors[i * 4 + 1] = colors[i * 4 + 2] = 0.6;
    }
    colors[i * 4 + 3] = io !== -1 ? 1 / (1 + Math.exp(-data(o + io))) : 1;
    sizes[i] =
      is0 !== -1
        ? Math.max((Math.exp(data(o + is0)) + Math.exp(data(o + is1)) + Math.exp(data(o + is2))) / 3, 0.001)
        : 0.02;
  }
  return { positions, colors, sizes, count };
}

export function parseSplatCloud(name: string, buffer: ArrayBuffer): SplatCloud {
  return name.toLowerCase().endsWith('.ply') ? parsePlyGaussian(buffer) : parseSplatFile(buffer);
}

/**
 * Konvertieren/Aufbereiten/Zuschneiden — läuft komplett lokal im Browser
 * (kein GPU-Training, wie PlayCanvas SuperSplat). Owner-Korrektur 05.07.:
 * Gaussian-Splats sind NICHT HomeStation-exklusiv für diesen Teil — nur die
 * Video→Splat-Erzeugung (SfM) ist rechenintensiv (siehe video-splat.ts).
 */

/** antimatter15 .splat zurückschreiben — der lokale Weg für `.ply → .splat`.
 * Ehrlich: SplatCloud hält nur die isotrope Mittel-Grösse und keine Rotation
 * (parseSplatFile liest deren Bytes gar nicht erst ein) — das Zurückschreiben
 * setzt darum scale_x=scale_y=scale_z=size und eine feste Platzhalter-
 * Rotation. Lage/Farbe/Grösse sind darum rundtrip-stabil, eine ursprünglich
 * anisotrope Form/Rotation ist es nicht — das ist keine verlustfreie
 * Quell-Kopie, sondern ein Export der (bereits vereinfachten) SplatCloud. */
export function writeSplatFile(cloud: SplatCloud): ArrayBuffer {
  const buffer = new ArrayBuffer(cloud.count * 32);
  const view = new DataView(buffer);
  for (let i = 0; i < cloud.count; i++) {
    const o = i * 32;
    view.setFloat32(o, cloud.positions[i * 3]!, true);
    view.setFloat32(o + 4, cloud.positions[i * 3 + 1]!, true);
    view.setFloat32(o + 8, cloud.positions[i * 3 + 2]!, true);
    const s = cloud.sizes[i]!;
    view.setFloat32(o + 12, s, true);
    view.setFloat32(o + 16, s, true);
    view.setFloat32(o + 20, s, true);
    view.setUint8(o + 24, Math.round(clamp01(cloud.colors[i * 4]!) * 255));
    view.setUint8(o + 25, Math.round(clamp01(cloud.colors[i * 4 + 1]!) * 255));
    view.setUint8(o + 26, Math.round(clamp01(cloud.colors[i * 4 + 2]!) * 255));
    view.setUint8(o + 27, Math.round(clamp01(cloud.colors[i * 4 + 3]!) * 255));
    // Platzhalter-Rotation (keine Quelle dafür in SplatCloud) — parseSplatFile
    // liest diese 4 Bytes nicht ein, daher wirkungslos fürs Rundtrip.
    view.setUint8(o + 28, 128);
    view.setUint8(o + 29, 128);
    view.setUint8(o + 30, 128);
    view.setUint8(o + 31, 255);
  }
  return buffer;
}

export interface SplatBox {
  min: [number, number, number];
  max: [number, number, number];
}

/** Zuschneiden: Punkte ausserhalb der Box werden verworfen (reine Funktion). */
export function cropSplat(cloud: SplatCloud, box: SplatBox): SplatCloud {
  const indices: number[] = [];
  for (let i = 0; i < cloud.count; i++) {
    const x = cloud.positions[i * 3]!;
    const y = cloud.positions[i * 3 + 1]!;
    const z = cloud.positions[i * 3 + 2]!;
    if (
      x >= box.min[0] && x <= box.max[0] &&
      y >= box.min[1] && y <= box.max[1] &&
      z >= box.min[2] && z <= box.max[2]
    ) {
      indices.push(i);
    }
  }
  return selectIndices(cloud, indices);
}

/** Ausdünnen fürs flüssige Anzeigen — KEINE verlustfreie Kompression, nur
 * jeder `faktor`-te Punkt bleibt. `faktor <= 1` gibt die Wolke unverändert
 * zurück (nichts zu tun). */
export function decimateSplat(cloud: SplatCloud, faktor: number): SplatCloud {
  const stride = Math.max(1, Math.round(faktor));
  if (stride <= 1) return cloud;
  const indices: number[] = [];
  for (let i = 0; i < cloud.count; i += stride) indices.push(i);
  return selectIndices(cloud, indices);
}

function selectIndices(cloud: SplatCloud, indices: number[]): SplatCloud {
  const count = indices.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 4);
  const sizes = new Float32Array(count);
  indices.forEach((srcI, i) => {
    positions[i * 3] = cloud.positions[srcI * 3]!;
    positions[i * 3 + 1] = cloud.positions[srcI * 3 + 1]!;
    positions[i * 3 + 2] = cloud.positions[srcI * 3 + 2]!;
    colors[i * 4] = cloud.colors[srcI * 4]!;
    colors[i * 4 + 1] = cloud.colors[srcI * 4 + 1]!;
    colors[i * 4 + 2] = cloud.colors[srcI * 4 + 2]!;
    colors[i * 4 + 3] = cloud.colors[srcI * 4 + 3]!;
    sizes[i] = cloud.sizes[srcI]!;
  });
  return { positions, colors, sizes, count };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
