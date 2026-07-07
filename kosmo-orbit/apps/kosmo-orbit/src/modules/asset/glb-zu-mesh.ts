/**
 * GLB → FreeMesh (Buildplan V2-Technik Block 3, Batch FM4/E6) — die
 * GLB-Brücke «Als FreeMesh übernehmen»: ein importiertes GLB (bisher nur
 * nicht-pickbarer Referenz-Kontext, s. `setGlbContext`) wird in
 * `design.meshErstellen`-Rohdaten (form «daten») verwandelt, WENN es unters
 * harte FreeMesh-Budget passt (`FREEMESH_MAX_VERTICES`/`FREEMESH_MAX_FACES`,
 * `@kosmo/kernel`) — der Budget-Wächter selbst lebt im AssetWorkspace (vor
 * dem Command), hier steckt nur die Geometrie-Umwandlung.
 *
 * Achsen-/Einheiten-Umrechnung ist die Umkehrung von `derive/gltf.ts`
 * (Kernel → GLB, dort `MM = 1/1000`): xThree = xKern·MM, yThree = zKern·MM,
 * zThree = −yKern·MM. Umgekehrt also xKern = xThree·1000, yKern = −zThree·1000,
 * zKern = yThree·1000 — dieselbe Achsenumordnung wie `artifactToObjects`/
 * `kernelZuThreeLokal` (Kern (x,y,z) ↔ three (x,z,−y)), nur invertiert und
 * mit Meter→mm-Skalierung (GLB-Konvention: Meter).
 *
 * Die reine Zerlege-/Schweiss-Logik (Achsen-Umrechnung, Rundung, Weld-Map,
 * Index-Umbau, minZ-Shift) steckt in eigenen, three-/DOM-freien Funktionen
 * unten — unit-testbar ohne WebGL-Kontext (`test/glb-zu-mesh.test.ts`).
 * `glbZuMeshDaten` selbst ist nur der dünne three-Adapter (GLTFLoader +
 * Welt-Transformation je Mesh), der diese Funktionen füttert.
 */

/** Rundet einen einzelnen mm-Wert auf ganze Millimeter (E2 — der Kernel
 * verlangt ganzzahlige `positions`). */
export function rundeMm(v: number): number {
  return Math.round(v);
}

/**
 * Ein einzelner three-Weltpunkt (Meter) → Kernel-Punkt (mm, UNGERUNDET) —
 * die Umkehrung der Achsen-/Einheiten-Konvention aus `derive/gltf.ts`. Reine
 * Zahlen-Funktion (keine `THREE.Vector3`-Abhängigkeit), damit die
 * Achsen-Umkehr mit einem bekannten Punkt unit-testbar ist.
 */
export function threePunktZuKernelMm(x3: number, y3: number, z3: number): [number, number, number] {
  return [x3 * 1000, -z3 * 1000, y3 * 1000];
}

/**
 * Verschweisst eine flache Dreiecks-Vertex-«Suppe» (jede 3er-Gruppe von
 * Einträgen ist EIN Dreieck, keine gemeinsame Indizierung — `glbZuMeshDaten`
 * baut sie aus indexierten UND nicht-indexierten Quellgeometrien gleich auf)
 * zu eindeutigen Positionen + neu indizierten Flächen. Rundet zuerst auf
 * ganze mm — die Rundung entscheidet, welche Vertices als deckungsgleich
 * gelten (die reduzierte Zählung ist es, die übers Budget entscheidet, E1),
 * dann verschweisst über einen Positions-Schlüssel (Map).
 */
export function verschweisseDreiecksSuppe(rohePositionenSuppe: readonly number[]): {
  positions: number[];
  faces: number[];
} {
  const vertexCount = Math.floor(rohePositionenSuppe.length / 3);
  const positions: number[] = [];
  const faces: number[] = [];
  const indexVonSchluessel = new Map<string, number>();
  for (let i = 0; i < vertexCount; i++) {
    const x = rundeMm(rohePositionenSuppe[i * 3]!);
    const y = rundeMm(rohePositionenSuppe[i * 3 + 1]!);
    const z = rundeMm(rohePositionenSuppe[i * 3 + 2]!);
    const schluessel = `${x}|${y}|${z}`;
    let idx = indexVonSchluessel.get(schluessel);
    if (idx === undefined) {
      idx = positions.length / 3;
      positions.push(x, y, z);
      indexVonSchluessel.set(schluessel, idx);
    }
    faces.push(idx);
  }
  return { positions, faces };
}

/**
 * Verschiebt alle Positionen so, dass die kleinste Z-Koordinate 0 wird — das
 * Mesh steht danach auf der Geschoss-OK (z bleibt geschossrelativ, wie es
 * `FreeMesh.positions` verlangt: «z relativ zur Geschoss-OK»); x/y bleiben
 * unverändert. Ein leeres Array liefert ein leeres Ergebnis.
 */
export function verschiebeAufGeschossOk(positions: readonly number[]): number[] {
  if (positions.length === 0) return [];
  let minZ = Infinity;
  for (let i = 2; i < positions.length; i += 3) {
    const z = positions[i]!;
    if (z < minZ) minZ = z;
  }
  const out = positions.slice();
  for (let i = 2; i < out.length; i += 3) out[i] = out[i]! - minZ;
  return out;
}

/** Ergebnis der reinen Aufbereitung — direkt die Nutzlast für
 * `design.meshErstellen` (form «daten»: `positions`, `faces`). */
export interface FreeMeshRohdaten {
  positions: number[];
  faces: number[];
  vertexCount: number;
  faceCount: number;
}

/**
 * Reine Gesamt-Pipeline: rohe Dreiecks-Suppe (three-Weltkoordinaten bereits
 * nach Kern-Achsen/mm umgerechnet, aber ungerundet und nicht verschweisst) →
 * fertige FreeMesh-Rohdaten (verschweisst, auf die Geschoss-OK verschoben).
 * Ein leeres oder degeneriertes Eingabe-Array (kein vollständiges Dreieck —
 * Länge kein Vielfaches von 9) liefert bewusst ein LEERES Ergebnis statt
 * eines Fehlers: der Aufrufer (AssetWorkspace) erkennt `vertexCount === 0`
 * und meldet «kein auswertbares Netz» selbst, statt hier eine Ausnahme zu
 * werfen (ein GLB ohne Meshes ist kein Programmfehler).
 */
export function baueFreeMeshDaten(rohePositionenSuppe: readonly number[]): FreeMeshRohdaten {
  if (rohePositionenSuppe.length < 9 || rohePositionenSuppe.length % 9 !== 0) {
    return { positions: [], faces: [], vertexCount: 0, faceCount: 0 };
  }
  const { positions: geschweisst, faces } = verschweisseDreiecksSuppe(rohePositionenSuppe);
  const positions = verschiebeAufGeschossOk(geschweisst);
  return { positions, faces, vertexCount: positions.length / 3, faceCount: faces.length / 3 };
}

/**
 * Lädt ein GLB (ArrayBuffer) via `GLTFLoader.parseAsync` (dynamischer Import,
 * wie `syncGlb`/`GlbVorschau` es schon tun), traversiert alle Meshes,
 * wendet ihre Welt-Transformation an (`updateWorldMatrix` + `matrixWorld` —
 * verschachtelte Gruppen/Rotationen/Skalierungen zählen mit) und sammelt
 * ALLE Dreiecke (indexierte wie nicht-indexierte Geometrie) in einer
 * gemeinsamen Vertex-Suppe. Die eigentliche Umrechnung/Verschweissung läuft
 * danach über die reinen Funktionen oben (`baueFreeMeshDaten`) — dieser
 * Adapter bleibt dünn und drei.js-spezifisch.
 */
export async function glbZuMeshDaten(buffer: ArrayBuffer): Promise<FreeMeshRohdaten> {
  const [THREE, { GLTFLoader }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/loaders/GLTFLoader.js'),
  ]);
  const gltf = await new GLTFLoader().parseAsync(buffer, '');
  gltf.scene.updateWorldMatrix(true, true);

  const suppe: number[] = [];
  const v = new THREE.Vector3();
  gltf.scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const posAttr = obj.geometry.getAttribute('position');
    if (!posAttr) return;
    const schreibeVertex = (i: number) => {
      v.fromBufferAttribute(posAttr, i);
      v.applyMatrix4(obj.matrixWorld);
      const [xK, yK, zK] = threePunktZuKernelMm(v.x, v.y, v.z);
      suppe.push(xK, yK, zK);
    };
    const index = obj.geometry.getIndex();
    if (index) {
      // Nur vollständige Dreiecke (glTF-Primitive sind nach dem Parsen immer
      // TRIANGLES — Strip/Fan wandelt der GLTFLoader selbst um).
      const triCount = Math.floor(index.count / 3) * 3;
      for (let i = 0; i < triCount; i++) schreibeVertex(index.getX(i));
    } else {
      const triCount = Math.floor(posAttr.count / 3) * 3;
      for (let i = 0; i < triCount; i++) schreibeVertex(i);
    }
  });

  return baueFreeMeshDaten(suppe);
}
