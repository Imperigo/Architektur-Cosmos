import type * as ThreeNS from 'three';

/**
 * Gemeinsame Standbild-Infrastruktur (v0.6.3 / B4, Owner-Befund K21) — EIN
 * three.js-Frame auf einen sichtbaren 2D-Canvas gerendert, über einen
 * Wegwerf-WebGL-Kontext (P6-Review #4: WebGL-Kontexte sind knapp, ~8–16 pro
 * Browser). Extrahiert aus `AssetWorkspace.tsx`s `GlbVorschau` — Material-
 * Würfel (K21) UND GLB-Vorschau nutzen DIESELBE Infrastruktur, keine zweite
 * Szenen-Infrastruktur je Verbraucher.
 */

export interface StandbildKontext {
  THREE: typeof ThreeNS;
  scene: ThreeNS.Scene;
  breite: number;
  hoehe: number;
}

/**
 * Rendert ein einziges Standbild auf `ziel` (Höhe `hoehePx`, Breite = aktuelle
 * Canvas-Breite). `aufbauen` füllt die Szene und liefert die Kamera zurück —
 * danach wird EINMAL gerendert, ins sichtbare 2D-Canvas kopiert und der
 * WebGL-Kontext hart freigegeben.
 */
export async function renderStandbild(
  ziel: HTMLCanvasElement,
  hoehePx: number,
  aufbauen: (ctx: StandbildKontext) => Promise<ThreeNS.Camera> | ThreeNS.Camera,
): Promise<void> {
  const THREE = await import('three');
  const breite = ziel.clientWidth || 208;
  const offscreen = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: offscreen, antialias: true, alpha: true });
  try {
    renderer.setSize(breite, hoehePx, false);
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sonne = new THREE.DirectionalLight(0xffffff, 1.4);
    sonne.position.set(3, 5, 4);
    scene.add(sonne);
    const camera = await aufbauen({ THREE, scene, breite, hoehe: hoehePx });
    renderer.render(scene, camera);
    ziel.width = breite;
    ziel.height = hoehePx;
    ziel.getContext('2d')?.drawImage(offscreen, 0, 0);
  } finally {
    renderer.forceContextLoss();
    renderer.dispose();
  }
}
