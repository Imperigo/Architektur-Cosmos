import * as THREE from 'three';
import { materialkatalog } from '@kosmo/data';

/**
 * Prozedurale Materialkarten (V2-C2) — PBR-Texturen ohne Assets: je
 * SIA-Materialklasse wird eine 1×1-m-Kachel (256 px) auf Canvas gezeichnet
 * (Farbe + Relief), deterministisch über einen kleinen LCG-Zufall. Echte
 * Foto-Maps von der HomeStation können dieselben Slots später überschreiben
 * (gleicher Schlüssel, gleiche Repeat-Logik) — die UVs sind metrisch:
 * 1 UV-Einheit = 1 m, erzeugt im Viewport über die dominante Normalenachse.
 */

export interface MaterialKarten {
  map: THREE.Texture;
  bumpMap: THREE.Texture;
  bumpScale: number;
}

const cache = new Map<string, MaterialKarten | null>();

/** Deterministischer Zufall — Texturen sind über Läufe hinweg identisch. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function farbeAls(hex: number): { r: number; g: number; b: number } {
  return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 };
}

function kachel(
  zeichne: (ctx: CanvasRenderingContext2D, relief: CanvasRenderingContext2D, rnd: () => number) => void,
  seed: number,
): { map: THREE.Texture; bump: THREE.Texture } {
  const groesse = 256;
  const farbe = document.createElement('canvas');
  farbe.width = farbe.height = groesse;
  const relief = document.createElement('canvas');
  relief.width = relief.height = groesse;
  const fctx = farbe.getContext('2d')!;
  const rctx = relief.getContext('2d')!;
  rctx.fillStyle = '#808080';
  rctx.fillRect(0, 0, groesse, groesse);
  zeichne(fctx, rctx, lcg(seed));
  const map = new THREE.CanvasTexture(farbe);
  const bump = new THREE.CanvasTexture(relief);
  for (const t of [map, bump]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
  }
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, bump };
}

/** Grundrauschen: Fleckchen in Helligkeitsvarianten der Grundfarbe. */
function rauschen(
  ctx: CanvasRenderingContext2D,
  basis: { r: number; g: number; b: number },
  rnd: () => number,
  staerke = 14,
  punkte = 2600,
) {
  ctx.fillStyle = `rgb(${basis.r},${basis.g},${basis.b})`;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < punkte; i++) {
    const d = (rnd() - 0.5) * 2 * staerke;
    ctx.fillStyle = `rgba(${basis.r + d},${basis.g + d},${basis.b + d},0.5)`;
    const s = 1 + rnd() * 3;
    ctx.fillRect(rnd() * 256, rnd() * 256, s, s);
  }
}

function betonKachel(basis: { r: number; g: number; b: number }, seed: number) {
  return kachel((ctx, relief, rnd) => {
    rauschen(ctx, basis, rnd, 10);
    // Schalungsstösse: eine horizontale Fuge + Ankerlöcher (Sichtbeton)
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.lineTo(256, 128);
    ctx.stroke();
    relief.strokeStyle = '#5a5a5a';
    relief.lineWidth = 2;
    relief.beginPath();
    relief.moveTo(0, 128);
    relief.lineTo(256, 128);
    relief.stroke();
    for (const [x, y] of [[64, 64], [192, 64], [64, 192], [192, 192]] as const) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      relief.fillStyle = '#404040';
      relief.beginPath();
      relief.arc(x, y, 4, 0, Math.PI * 2);
      relief.fill();
    }
  }, seed);
}

function mauerwerkKachel(basis: { r: number; g: number; b: number }, seed: number) {
  return kachel((ctx, relief, rnd) => {
    // Fugenbild: 4 Schichten à 25 cm, Steine 50 cm, halbversetzt
    ctx.fillStyle = `rgb(${basis.r - 30},${basis.g - 30},${basis.b - 30})`; // Mörtel
    ctx.fillRect(0, 0, 256, 256);
    relief.fillStyle = '#606060';
    relief.fillRect(0, 0, 256, 256);
    const sh = 64; // Schichthöhe px (25 cm)
    const sb = 128; // Steinlänge px (50 cm)
    for (let reihe = 0; reihe < 4; reihe++) {
      const versatz = reihe % 2 === 0 ? 0 : sb / 2;
      for (let s = -1; s < 3; s++) {
        const x = s * sb + versatz;
        const d = (rnd() - 0.5) * 24;
        ctx.fillStyle = `rgb(${basis.r + d},${basis.g + d},${basis.b + d})`;
        ctx.fillRect(x + 3, reihe * sh + 3, sb - 6, sh - 6);
        relief.fillStyle = '#9a9a9a';
        relief.fillRect(x + 3, reihe * sh + 3, sb - 6, sh - 6);
      }
    }
  }, seed);
}

function holzKachel(basis: { r: number; g: number; b: number }, seed: number) {
  return kachel((ctx, relief, rnd) => {
    rauschen(ctx, basis, rnd, 8, 800);
    // Bretter 12.8 cm + Maserung als vertikale Wellenlinien
    for (let brett = 0; brett < 8; brett++) {
      const x0 = brett * 32;
      const d = (rnd() - 0.5) * 26;
      ctx.fillStyle = `rgba(${basis.r + d},${basis.g + d},${basis.b + d},0.55)`;
      ctx.fillRect(x0, 0, 32, 256);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0, 256);
      ctx.stroke();
      relief.strokeStyle = '#565656';
      relief.beginPath();
      relief.moveTo(x0, 0);
      relief.lineTo(x0, 256);
      relief.stroke();
      for (let ader = 0; ader < 3; ader++) {
        const ax = x0 + 6 + rnd() * 20;
        const amp = 1.5 + rnd() * 2;
        ctx.strokeStyle = `rgba(${basis.r - 40},${basis.g - 40},${basis.b - 40},0.35)`;
        ctx.beginPath();
        for (let y = 0; y <= 256; y += 8) {
          const x = ax + Math.sin((y / 256) * Math.PI * (2 + rnd())) * amp;
          if (y === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }, seed);
}

function daemmungKachel(basis: { r: number; g: number; b: number }, seed: number) {
  return kachel((ctx, relief, rnd) => {
    rauschen(ctx, basis, rnd, 18, 4200);
    relief.fillStyle = '#787878';
    for (let i = 0; i < 500; i++) {
      relief.beginPath();
      relief.arc(rnd() * 256, rnd() * 256, 1 + rnd() * 2.5, 0, Math.PI * 2);
      relief.fill();
    }
  }, seed);
}

function putzKachel(basis: { r: number; g: number; b: number }, seed: number) {
  return kachel((ctx, relief, rnd) => {
    rauschen(ctx, basis, rnd, 7, 5200);
    relief.fillStyle = '#7a7a7a';
    for (let i = 0; i < 1800; i++) {
      relief.fillRect(rnd() * 256, rnd() * 256, 1, 1);
    }
  }, seed);
}

/** Karten je Materialschlüssel (null = Material bleibt parametrisch, z.B. Glas). */
export function materialKarten(key: string): MaterialKarten | null {
  if (cache.has(key)) return cache.get(key)!;
  const eintrag = materialkatalog.find((m) => m.key === key);
  let karten: MaterialKarten | null = null;
  // Ohne 2D-Canvas (Testumgebungen) ehrlich parametrisch bleiben
  if (eintrag && document.createElement('canvas').getContext('2d')) {
    const basis = farbeAls(eintrag.pbr.color);
    const seed = [...key].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0;
    const bau = { beton: betonKachel, mauerwerk: mauerwerkKachel, holz: holzKachel, daemmung: daemmungKachel, putz: putzKachel }[
      eintrag.sia as string
    ];
    if (bau) {
      const { map, bump } = bau(basis, seed);
      karten = { map, bumpMap: bump, bumpScale: eintrag.sia === 'mauerwerk' ? 0.03 : 0.015 };
    }
  }
  cache.set(key, karten);
  return karten;
}

export function texturenAktiv(): boolean {
  return localStorage.getItem('kosmo.texturen') !== '0';
}
