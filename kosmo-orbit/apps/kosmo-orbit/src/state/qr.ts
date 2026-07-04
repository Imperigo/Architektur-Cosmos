/**
 * QR-Encoder (V1-Finish P4) — Eigenbau für das iPad-Pairing: Byte-Modus,
 * Fehlerkorrektur L, Versionen 1–10 (bis 271 Zeichen — genug für die
 * Pairing-URL mit Raum + Token), GF(256)-Reed-Solomon, alle 8 Masken mit
 * den echten Penalty-Regeln, Ausgabe als Matrix + SVG.
 * Testorakel: jsQR (devDependency) dekodiert den Round-Trip.
 */

// ── GF(256) für Reed-Solomon (Erzeuger 0x11d) ────────────────────────
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a]! + LOG[b]!]!;
}

/** Erzeugerpolynom für n EC-Codewörter. */
function rsGenerator(n: number): number[] {
  let poly = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] = next[j]! ^ gfMul(poly[j]!, EXP[i]!);
      next[j + 1] = next[j + 1]! ^ poly[j]!;
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: number[], ecLen: number): number[] {
  const gen = rsGenerator(ecLen);
  const rest = new Array<number>(ecLen).fill(0);
  for (const d of data) {
    const faktor = d ^ rest[0]!;
    rest.shift();
    rest.push(0);
    if (faktor !== 0) {
      // gen ist little-endian (Index = x-Potenz); das Schieberegister braucht
      // die Koeffizienten von der höchsten zur niedrigsten Potenz
      for (let i = 0; i < gen.length - 1; i++) {
        rest[i] = rest[i]! ^ gfMul(gen[gen.length - 2 - i]!, faktor);
      }
    }
  }
  return rest;
}

// ── Versions-Tabellen (EC-Stufe L) ───────────────────────────────────
/** je Version: [Blöcke mit [Anzahl, Daten-Codewörter je Block]], EC je Block */
const BLOCKS_L: Record<number, { gruppen: [number, number][]; ec: number }> = {
  1: { gruppen: [[1, 19]], ec: 7 },
  2: { gruppen: [[1, 34]], ec: 10 },
  3: { gruppen: [[1, 55]], ec: 15 },
  4: { gruppen: [[1, 80]], ec: 20 },
  5: { gruppen: [[1, 108]], ec: 26 },
  6: { gruppen: [[2, 68]], ec: 18 },
  7: { gruppen: [[2, 78]], ec: 20 },
  8: { gruppen: [[2, 97]], ec: 24 },
  9: { gruppen: [[2, 116]], ec: 30 },
  10: { gruppen: [[2, 68], [2, 69]], ec: 18 },
};

const ALIGNMENT: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

function datenKapazitaet(version: number): number {
  const b = BLOCKS_L[version]!;
  return b.gruppen.reduce((sum, [anzahl, daten]) => sum + anzahl * daten, 0);
}

// ── Bit-Puffer ───────────────────────────────────────────────────────
class Bits {
  bits: number[] = [];
  push(wert: number, laenge: number): void {
    for (let i = laenge - 1; i >= 0; i--) this.bits.push((wert >> i) & 1);
  }
  bytes(): number[] {
    const raus: number[] = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | (this.bits[i + j] ?? 0);
      raus.push(b);
    }
    return raus;
  }
}

// ── Matrix-Aufbau ────────────────────────────────────────────────────
type Matrix = Int8Array[]; // -1 = frei, 0 = hell, 1 = dunkel

function leereMatrix(groesse: number): Matrix {
  return Array.from({ length: groesse }, () => new Int8Array(groesse).fill(-1));
}

function setzeFinder(m: Matrix, x0: number, y0: number): void {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const x = x0 + dx;
      const y = y0 + dy;
      if (x < 0 || y < 0 || x >= m.length || y >= m.length) continue;
      const imRing = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 && (dx === 0 || dx === 6 || dy === 0 || dy === 6);
      const imKern = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
      m[y]![x] = imRing || imKern ? 1 : 0;
    }
  }
}

function setzeFunktionsmuster(m: Matrix, version: number): void {
  const n = m.length;
  setzeFinder(m, 0, 0);
  setzeFinder(m, n - 7, 0);
  setzeFinder(m, 0, n - 7);
  // Timing
  for (let i = 8; i < n - 8; i++) {
    m[6]![i] = i % 2 === 0 ? 1 : 0;
    m[i]![6] = i % 2 === 0 ? 1 : 0;
  }
  // Alignment — nur die drei Finder-Ecken werden ausgelassen; Zentren auf
  // der Timing-Linie (ab V7) werden gezeichnet und übermalen sie korrekt
  const pos = ALIGNMENT[version]!;
  const erste = pos[0];
  const letzte = pos[pos.length - 1];
  for (const cy of pos) {
    for (const cx of pos) {
      const inFinderEcke =
        (cy === erste && cx === erste) || (cy === erste && cx === letzte) || (cy === letzte && cx === erste);
      if (inFinderEcke) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          m[cy + dy]![cx + dx] = Math.max(Math.abs(dx), Math.abs(dy)) !== 1 ? 1 : 0;
        }
      }
    }
  }
  // dunkles Modul
  m[4 * version + 9]![8] = 1;
  // Format-Bereiche reservieren (0 als Platzhalter)
  for (let i = 0; i < 9; i++) {
    if (m[8]![i] === -1) m[8]![i] = 0;
    if (m[i]![8] === -1) m[i]![8] = 0;
  }
  for (let i = 0; i < 8; i++) {
    if (m[8]![n - 1 - i] === -1) m[8]![n - 1 - i] = 0;
    if (m[n - 1 - i]![8] === -1) m[n - 1 - i]![8] = 0;
  }
  // Versions-Info-Bereiche (v7+) reservieren
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        m[n - 11 + j]![i] = 0;
        m[i]![n - 11 + j] = 0;
      }
    }
  }
}

/** Daten im Zickzack einfüllen; liefert die Liste der Datenpositionen. */
function fuelleDaten(m: Matrix, bits: number[]): [number, number][] {
  const n = m.length;
  const positionen: [number, number][] = [];
  let bi = 0;
  let hoch = true;
  for (let spalte = n - 1; spalte > 0; spalte -= 2) {
    if (spalte === 6) spalte--; // Timing-Spalte überspringen
    for (let i = 0; i < n; i++) {
      const y = hoch ? n - 1 - i : i;
      for (const dx of [0, 1]) {
        const x = spalte - dx;
        if (m[y]![x] !== -1) continue;
        m[y]![x] = bits[bi] ?? 0;
        positionen.push([x, y]);
        bi++;
      }
    }
    hoch = !hoch;
  }
  return positionen;
}

const MASKEN: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** Die vier echten Penalty-Regeln der Norm. */
function penalty(m: Matrix): number {
  const n = m.length;
  let strafe = 0;
  // N1: Läufe ≥5 gleicher Module (Zeilen + Spalten)
  for (let achse = 0; achse < 2; achse++) {
    for (let i = 0; i < n; i++) {
      let lauf = 1;
      for (let j = 1; j < n; j++) {
        const a = achse === 0 ? m[i]![j] : m[j]![i];
        const b = achse === 0 ? m[i]![j - 1] : m[j - 1]![i];
        if (a === b) {
          lauf++;
          if (j === n - 1 && lauf >= 5) strafe += 3 + (lauf - 5);
        } else {
          if (lauf >= 5) strafe += 3 + (lauf - 5);
          lauf = 1;
        }
      }
    }
  }
  // N2: 2×2-Blöcke
  for (let y = 0; y < n - 1; y++) {
    for (let x = 0; x < n - 1; x++) {
      const v = m[y]![x];
      if (m[y]![x + 1] === v && m[y + 1]![x] === v && m[y + 1]![x + 1] === v) strafe += 3;
    }
  }
  // N3: Finder-ähnliche Muster 1011101 mit 4 hellen davor/danach
  const muster = [1, 0, 1, 1, 1, 0, 1];
  const istMuster = (lese: (k: number) => number, start: number) => {
    for (let k = 0; k < 7; k++) if (lese(start + k) !== muster[k]) return false;
    return true;
  };
  const hell4 = (lese: (k: number) => number, start: number) => {
    for (let k = 0; k < 4; k++) {
      const v = lese(start + k);
      if (v !== 0 && v !== -1) return false; // ausserhalb zählt als hell
    }
    return true;
  };
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= n - 7; j++) {
      const zeile = (k: number) => (k < 0 || k >= n ? -1 : m[i]![k]!);
      const spalte = (k: number) => (k < 0 || k >= n ? -1 : m[k]![i]!);
      for (const lese of [zeile, spalte]) {
        if (istMuster(lese, j) && (hell4(lese, j - 4) || hell4(lese, j + 7))) strafe += 40;
      }
    }
  }
  // N4: Abweichung vom 50%-Dunkelanteil
  let dunkel = 0;
  for (const zeile of m) for (const v of zeile) if (v === 1) dunkel++;
  const anteil = (dunkel * 100) / (n * n);
  strafe += Math.floor(Math.abs(anteil - 50) / 5) * 10;
  return strafe;
}

/** BCH-geschützte Format-Info (EC L = 01) für Maske k. */
function formatBits(maske: number): number {
  const daten = (0b01 << 3) | maske;
  let rest = daten << 10;
  const gen = 0b10100110111;
  for (let i = 14; i >= 10; i--) {
    if ((rest >> i) & 1) rest ^= gen << (i - 10);
  }
  return ((daten << 10) | rest) ^ 0b101010000010010;
}

function versionBits(version: number): number {
  let rest = version << 12;
  const gen = 0b1111100100101;
  for (let i = 17; i >= 12; i--) {
    if ((rest >> i) & 1) rest ^= gen << (i - 12);
  }
  return (version << 12) | rest;
}

function schreibeFormat(m: Matrix, maske: number): void {
  const n = m.length;
  const f = formatBits(maske);
  const bit = (i: number) => ((f >> i) & 1) as 0 | 1;
  // um den linken oberen Finder (Bits 14..0)
  const koordsA: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  for (let i = 0; i < 15; i++) {
    const [y, x] = koordsA[i]!;
    m[y]![x] = bit(14 - i);
  }
  // zweite Kopie: unter dem rechten oberen + rechts vom linken unteren
  for (let i = 0; i < 8; i++) m[8]![n - 1 - i] = bit(i);
  for (let i = 0; i < 7; i++) m[n - 1 - i]![8] = bit(14 - i);
}

function schreibeVersion(m: Matrix, version: number): void {
  if (version < 7) return;
  const n = m.length;
  const v = versionBits(version);
  for (let i = 0; i < 18; i++) {
    const b = ((v >> i) & 1) as 0 | 1;
    m[n - 11 + (i % 3)]![Math.floor(i / 3)] = b;
    m[Math.floor(i / 3)]![n - 11 + (i % 3)] = b;
  }
}

// ── Öffentliche API ──────────────────────────────────────────────────

export interface QrErgebnis {
  version: number;
  maske: number;
  groesse: number;
  /** matrix[y][x] — true = dunkel. */
  matrix: boolean[][];
  /** Anzahl Datenmodule (Diagnose: muss 8 × Gesamt-Codewörter sein). */
  datenModule: number;
}

/** Kodiert Text (UTF-8, Byte-Modus, EC L) — wählt die kleinste Version 1–10. */
export function qrEncode(text: string): QrErgebnis {
  const daten = [...new TextEncoder().encode(text)];
  let version = 0;
  for (let v = 1; v <= 10; v++) {
    const kopfBits = 4 + (v <= 9 ? 8 : 16);
    if (Math.ceil((kopfBits + daten.length * 8) / 8) <= datenKapazitaet(v)) {
      version = v;
      break;
    }
  }
  if (!version) throw new Error(`Text zu lang für QR V10/L: ${daten.length} Bytes`);

  // Bitstrom: Modus 0100 + Länge + Daten + Terminator + Padding
  const kapazitaet = datenKapazitaet(version);
  const bits = new Bits();
  bits.push(0b0100, 4);
  bits.push(daten.length, version <= 9 ? 8 : 16);
  for (const b of daten) bits.push(b, 8);
  const rest = kapazitaet * 8 - bits.bits.length;
  bits.push(0, Math.min(4, rest));
  while (bits.bits.length % 8 !== 0) bits.bits.push(0);
  const pads = [0xec, 0x11];
  let pi = 0;
  while (bits.bits.length < kapazitaet * 8) bits.push(pads[pi++ % 2]!, 8);

  // Blöcke + Reed-Solomon, dann interleaven
  const { gruppen, ec } = BLOCKS_L[version]!;
  const bytes = bits.bytes();
  const datenBloecke: number[][] = [];
  let offset = 0;
  for (const [anzahl, laenge] of gruppen) {
    for (let i = 0; i < anzahl; i++) {
      datenBloecke.push(bytes.slice(offset, offset + laenge));
      offset += laenge;
    }
  }
  const ecBloecke = datenBloecke.map((b) => rsEncode(b, ec));
  const strom: number[] = [];
  const maxDaten = Math.max(...datenBloecke.map((b) => b.length));
  for (let i = 0; i < maxDaten; i++) {
    for (const b of datenBloecke) if (i < b.length) strom.push(b[i]!);
  }
  for (let i = 0; i < ec; i++) for (const b of ecBloecke) strom.push(b[i]!);

  const stromBits: number[] = [];
  for (const b of strom) for (let i = 7; i >= 0; i--) stromBits.push((b >> i) & 1);

  // Matrix + beste Maske (echte Penalty-Bewertung)
  const groesse = 4 * version + 17;
  const basis = leereMatrix(groesse);
  setzeFunktionsmuster(basis, version);
  const schablone = basis.map((z) => Int8Array.from(z));
  const positionen = fuelleDaten(basis, stromBits);

  let beste: { maske: number; matrix: Matrix; strafe: number } | null = null;
  for (let maske = 0; maske < 8; maske++) {
    const m = basis.map((z) => Int8Array.from(z));
    for (const [x, y] of positionen) {
      if (MASKEN[maske]!(x, y)) m[y]![x] = m[y]![x] === 1 ? 0 : 1;
    }
    schreibeFormat(m, maske);
    schreibeVersion(m, version);
    const strafe = penalty(m);
    if (!beste || strafe < beste.strafe) beste = { maske, matrix: m, strafe };
  }
  void schablone;

  return {
    version,
    maske: beste!.maske,
    groesse,
    matrix: beste!.matrix.map((z) => [...z].map((v) => v === 1)),
    datenModule: positionen.length,
  };
}

/** SVG mit Ruhezone (4 Module), currentColor als Tinte. */
export function qrSvg(text: string, moduleGroesse = 4): string {
  const { matrix, groesse } = qrEncode(text);
  const rand = 4;
  const kante = (groesse + 2 * rand) * moduleGroesse;
  const rects = matrix
    .flatMap((zeile, y) =>
      zeile.map((dunkel, x) =>
        dunkel
          ? `<rect x="${(x + rand) * moduleGroesse}" y="${(y + rand) * moduleGroesse}" width="${moduleGroesse}" height="${moduleGroesse}"/>`
          : '',
      ),
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${kante} ${kante}" shape-rendering="crispEdges"><rect width="${kante}" height="${kante}" fill="white"/><g fill="black">${rects}</g></svg>`;
}
