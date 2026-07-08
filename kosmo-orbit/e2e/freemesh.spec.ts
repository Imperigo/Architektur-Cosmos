import { expect, test, type Page } from '@playwright/test';

/**
 * V2-Technik Block 3 / FM6 — FreeMesh Stufe 3, Abnahme-Kriterien 1–3 + 7
 * (docs/V2-TECHNIK-BLOCK3-BUILDPLAN.md §4). Robustheits-Doktrin (wie
 * `visgraph.spec.ts` Z. 50ff. / `plan-interaktion.spec.ts`): UI-Wege wo
 * stabil (Werkzeug-Knöpfe mit testids, Plan-Klick-Selektion, Undo-Knopf),
 * der gesegnete `__kosmo.run`-Weg («präziser Befehl — wie Kosmo es täte»)
 * wo ein echter WebGL-Vertex-/Flächen-Pick unter Volllast flaky wäre.
 */

declare global {
  interface Window {
    __kosmo: {
      run: (id: string, p: unknown) => { patches: { id: string }[] };
      state: () => {
        activeStoreyId: string | null;
        selection: string[];
        doc: {
          byKind: (k: string) => {
            id: string;
            kind: string;
            positions?: number[];
            faces?: number[];
            outline?: { x: number; y: number }[];
            height?: number;
          }[];
          get: (id: string) => Record<string, unknown> | undefined;
        };
      };
    };
  }
}

/** Liest translate/scale/translate aus dem `<g>` im Plan-SVG und rechnet Welt-mm → Bildschirm-Pixel um
 *  (identisches Muster wie `plan-interaktion.spec.ts` — robust gegen Zoom/Pan/Split-Layout). */
async function weltZuBildschirm(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const svg = page.locator('[data-testid="planview"]');
  const rect = (await svg.boundingBox())!;
  const transform = await svg.locator('> g').first().getAttribute('transform');
  const [tx, ty, scale, negCx, cy] = transform!.match(/-?\d+\.?\d*/g)!.map(Number);
  return {
    x: rect.x + tx! + scale! * (x + negCx!),
    y: rect.y + ty! + scale! * (cy! - y),
  };
}

async function bootstrapDesign(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('kosmo.onboarded', '1');
    // Block-E-Guide startet sonst automatisch und fängt Klicks unter seiner
    // Karte ab (nav-fit/Export) — Tests emulieren den erfahrenen Nutzer.
    localStorage.setItem('kosmo.starterGuide.done', '1');
  });
  await page.reload();
  await page.click('[data-testid="module-design"]'); // bootstrappt EG/OG
}

test('Quader erstellen → Vertex ziehen → Undo stellt exakt zurück (Kriterium 1)', async ({ page }) => {
  await bootstrapDesign(page);

  // Werkzeug «Mesh» (UI-Knopf, testid laut Auftrag) + ein Bodenklick im 3D —
  // Default-Ansicht ist 'split', das Canvas ist schon da (dasselbe Muster wie
  // die «Direktzeichnen»-Klicks in module.spec.ts, die zuverlässig den
  // Boden treffen — kein Nav-Fit nötig, da der Klick auf die Canvas-Mitte
  // bereits vor jeder anderen FreeMesh-Erstellung dieselbe Stelle trifft).
  await page.click('[data-testid="werkzeug-mesh"]');
  const canvas = page.locator('canvas').first();
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  // Kriterium 1a: genau 1 FreeMesh, 8 Vertices (Quader = 8·3 = 24 Zahlen im
  // flachen positions-Array — kein Halbkanten-Modell im Doc, siehe E2).
  const meshId = await page.evaluate(() => window.__kosmo.state().doc.byKind('freemesh')[0]!.id);
  await expect
    .poll(() => page.evaluate(() => window.__kosmo.state().doc.byKind('freemesh').length))
    .toBe(1);
  const positionsVorher = await page.evaluate(
    (id) => (window.__kosmo.state().doc.get(id) as { positions: number[] }).positions,
    meshId,
  );
  expect(positionsVorher).toHaveLength(24);

  // Kriterium 1b «pickbar»: Auswahl-Werkzeug + Klick auf die Mitte des
  // (per «Einpassen» eingerahmten) Körpers — der Inspector zeigt das
  // FreeMesh (Vertices/Flächen-Zeilen + «Mesh bearbeiten»). Ohne `nav-fit`
  // liegt der Quader nicht sicher unter dem Kamera-Mittelstrahl (der
  // Boden-Klickpunkt der Erstellung ist die NAHE Ecke des Quaders, nicht
  // seine Mitte) — ein einzelner Klick (kein Drag) ist unter Volllast robust,
  // anders als ein Vertex-Drag im WebGL, darum bleibt der eigentliche
  // Editier-Schritt unten der `__kosmo.run`-Weg.
  await page.click('[data-testid="tool-auswahl"]');
  await page.click('[data-testid="nav-fit"]');
  // «Einpassen» animiert die Kamera gedämpft (camera-controls-Transition,
  // wie im J1b-Doppel-Tap-Fall) — ein einziges kurzes Warten, bis sie steht,
  // statt einer Timeout-Orgie (analog zum Wand-Mesh-Wartefall in eingabe-3d.spec.ts).
  await page.waitForTimeout(700);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('[data-testid="mesh-bearbeiten"]')).toBeVisible();

  // Kriterium 1c «Vertex ziehen → Form ändert sich»: präziser Befehl statt
  // WebGL-Handle-Drag — wie Kosmo es per Chat täte (visgraph.spec.ts-Muster,
  // Z. 50ff.). Ziel: die «verschweisste Deckel-Ecke» — der Vertex mit dem
  // grössten x+y+z-Wert liegt für einen achsparallelen Quader IMMER auf der
  // Deckelfläche (z dominiert, da Höhe = Breite = Länge = 2000 mm), plus alle
  // deckungsgleichen Indizes (`gleichePositionen`-Muster aus mesh-topo.ts —
  // bei einem frischen Quader ist das genau 1 Index, da noch nichts
  // extrudiert wurde und alle 8 Ecken bereits eindeutig sind).
  const { entityId, indices } = await page.evaluate((id) => {
    const positions = (window.__kosmo.state().doc.get(id) as { positions: number[] }).positions;
    const vertexCount = positions.length / 3;
    let top = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < vertexCount; i++) {
      const score = positions[i * 3]! + positions[i * 3 + 1]! + positions[i * 3 + 2]!;
      if (score > bestScore) {
        bestScore = score;
        top = i;
      }
    }
    const [px, py, pz] = [positions[top * 3]!, positions[top * 3 + 1]!, positions[top * 3 + 2]!];
    const indices: number[] = [];
    for (let i = 0; i < vertexCount; i++) {
      if (positions[i * 3] === px && positions[i * 3 + 1] === py && positions[i * 3 + 2] === pz) indices.push(i);
    }
    return { entityId: id, indices };
  }, meshId);
  await page.evaluate(
    ({ entityId, indices }) =>
      window.__kosmo.run('design.meshVertexSchieben', { entityId, indices, dx: 0, dy: 0, dz: 300 }),
    { entityId, indices },
  );
  const positionenNachZug = await page.evaluate(
    (id) => (window.__kosmo.state().doc.get(id) as { positions: number[] }).positions,
    meshId,
  );
  const erwartet = positionsVorher!.map((wert, idx) => {
    const vertex = Math.floor(idx / 3);
    return indices.includes(vertex) && idx % 3 === 2 ? wert + 300 : wert;
  });
  expect(positionenNachZug).toEqual(erwartet);
  expect(positionenNachZug).not.toEqual(positionsVorher);

  // Kriterium 1d «Undo stellt exakt zurück» (ein Schritt pro Zug) — Undo per
  // Knopf, wie plan-interaktion.spec.ts es tut.
  await page.click('[data-testid="undo"]');
  const positionenNachUndo = await page.evaluate(
    (id) => (window.__kosmo.state().doc.get(id) as { positions: number[] }).positions,
    meshId,
  );
  expect(positionenNachUndo).toEqual(positionsVorher);
});

test('MassBody → In Mesh umwandeln (ein Undo-Schritt) + Extrude übers Panel (Kriterien 2+3)', async ({ page }) => {
  await bootstrapDesign(page);
  await page.click('[data-testid="view-2d"]'); // volle Breite, ruhigere Plan-Koordinaten

  // Volumenkörper präzise anlegen (Geometrie ist hier Nebensache — der
  // gesegnete `__kosmo.run`-Weg spart einen Drei-Klick-Umriss im Plan).
  const { massId, aussenpunkt } = await page.evaluate(() => {
    const st = window.__kosmo.state();
    const r = window.__kosmo.run('design.volumenErstellen', {
      storeyId: st.activeStoreyId,
      outline: [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
        { x: 4000, y: 4000 },
        { x: 0, y: 4000 },
      ],
      height: 3000,
    });
    return { massId: r.patches[0]!.id, aussenpunkt: { x: 2000, y: 2000 } };
  });
  const massVorher = await page.evaluate((id) => window.__kosmo.state().doc.get(id), massId);

  // Plan-Klick-Selektion (plan-interaktion.spec.ts-Muster) auf die
  // Volumen-Mitte — der Inspector zeigt daraufhin «In Mesh umwandeln».
  const mitte = await weltZuBildschirm(page, aussenpunkt.x, aussenpunkt.y);
  await page.mouse.click(mitte.x, mitte.y);
  await expect(page.locator('[data-testid="mesh-umwandeln"]')).toBeVisible();

  await page.click('[data-testid="mesh-umwandeln"]');

  // Kriterium 3a: identische Form — der MassBody ist weg, an seiner Stelle
  // steht (per Inspector-Selektion) das neue FreeMesh mit derselben Anzahl
  // Eckpunkte (Rechteck-Prisma = 8 Vertices, wie der Quader-Fall in Test 1).
  await expect.poll(() => page.evaluate((id) => window.__kosmo.state().doc.get(id), massId)).toBeUndefined();
  const freemeshId1 = await page.evaluate(() => window.__kosmo.state().selection[0]!);
  const mesh1 = await page.evaluate(
    (id) => window.__kosmo.state().doc.get(id) as { kind: string; positions: number[] } | undefined,
    freemeshId1,
  );
  expect(mesh1?.kind).toBe('freemesh');
  expect(mesh1?.positions).toHaveLength(24);

  // Kriterium 3b: EIN Undo stellt den MassBody wieder her UND räumt das
  // FreeMesh weg — beide Patches kamen aus `design.meshErstellen(ausVolumen)`
  // als EINE Liste (E3), die Undo-Historie muss sie als EINEN Schritt sehen.
  await page.click('[data-testid="undo"]');
  const massNachUndo = await page.evaluate((id) => window.__kosmo.state().doc.get(id), massId);
  expect(massNachUndo).toEqual(massVorher);
  const freemeshNachUndo = await page.evaluate((id) => window.__kosmo.state().doc.get(id), freemeshId1);
  expect(freemeshNachUndo).toBeUndefined();

  // Erneut umwandeln (kein `redo`-testid im UI vorhanden — die Werkzeugleiste
  // trägt nur `undo`; «Wiederholen» ist ein Klartext-Knopf ohne eigene
  // Test-Id, siehe DesignWorkspace.tsx Z. ~1243-1253. Der ehrlichere,
  // testid-treue Weg ist daher: den wiederhergestellten MassBody erneut
  // anwählen und «In Mesh umwandeln» ein zweites Mal auslösen.)
  await page.mouse.click(mitte.x, mitte.y);
  await expect(page.locator('[data-testid="mesh-umwandeln"]')).toBeVisible();
  await page.click('[data-testid="mesh-umwandeln"]');
  const freemeshId2 = await page.evaluate(() => window.__kosmo.state().selection[0]!);
  await expect
    .poll(() => page.evaluate((id) => window.__kosmo.state().doc.get(id)?.['kind'], freemeshId2))
    .toBe('freemesh');

  // Kriterium 2: Flächen-Extrude als EIN Undo-Schritt. Befund aus der
  // FM3-Quelle (DesignWorkspace.tsx Z. ~1536ff.): `mesh-edit-panel`
  // erscheint bereits mit `meshEditId` (sofort nach «Mesh bearbeiten»), NICHT
  // erst nach einem Flächen-Klick — die Distanz-Eingabe + der
  // «Extrudieren»-Knopf sind es, die auf `meshFace !== null` warten, und DAS
  // kann laut Viewport3D.tsx nur ein echter Raycast-Treffer auf ein
  // Mesh-Dreieck setzen (`onMeshFaceClick`), es gibt keinen Test-Hook dafür.
  // Ein Flächen-Klick im 3D ist geometrisch derselbe Risikofall wie ein
  // Vertex-Drag (WebGL-Raycast unter Volllast) — darum der gesegnete
  // `__kosmo.run`-Weg für den eigentlichen Extrudier-Befehl; das
  // UI-Aufklappen des Panels selbst (`mesh-bearbeiten` → `mesh-edit-panel`)
  // wird trotzdem über den Knopf bewiesen, weil das stabil ist.
  await page.click('[data-testid="mesh-bearbeiten"]');
  await expect(page.locator('[data-testid="mesh-edit-panel"]')).toBeVisible();

  const facesVorher = (await page.evaluate(
    (id) => (window.__kosmo.state().doc.get(id) as { faces: number[] }).faces,
    freemeshId2,
  ))!;
  await page.evaluate(
    (id) => window.__kosmo.run('design.meshFlaecheExtrudieren', { entityId: id, face: 0, distanz: 500 }),
    freemeshId2,
  );
  await expect
    .poll(() =>
      page.evaluate((id) => (window.__kosmo.state().doc.get(id) as { faces: number[] }).faces.length, freemeshId2),
    )
    .toBeGreaterThan(facesVorher.length);

  await page.click('[data-testid="mesh-fertig"]');
  await page.click('[data-testid="undo"]');
  const facesNachUndo = await page.evaluate(
    (id) => (window.__kosmo.state().doc.get(id) as { faces: number[] }).faces,
    freemeshId2,
  );
  expect(facesNachUndo).toEqual(facesVorher);
});

test('Kosmo-Tauglichkeit: die Mesh-Commands sind sprechbare Tools (Kriterium 7)', async ({ page }) => {
  // Jedes Command ist automatisch ein Kosmo-LLM-Tool (`commandTools()`,
  // CLAUDE.md/E3 im Buildplan) — was Kosmo per Chat kann, ist genau die
  // Menge der registrierten Commands. Der Schema-Vollständigkeitsbeweis
  // (Beschreibung ≥ 20 Zeichen, JSON-Schema mit properties, für JEDES
  // registrierte Command) läuft bereits in `packages/kosmo-ai/test/ai.test.ts`
  // («Tool-Vollständigkeit (Bonus-Block)», ROADMAP 85) — der deckt auch die
  // drei FreeMesh-Commands ab, ohne sie einzeln aufzuzählen (er iteriert über
  // ALLE Tools). Was dieser E2E-Test ergänzt: der Beweis, dass die drei
  // Commands in der LAUFENDEN App über exakt denselben Weg wirken, den ein
  // Kosmo-Tool-Call nähme (`runCommand` — der einzige Schreibweg, siehe
  // CLAUDE.md «Architektur in einem Absatz») und eine korrekte Modell-Kette
  // erzeugen: erstellen (Form «daten» — Tetraeder) → Vertex schieben →
  // Fläche extrudieren.
  await bootstrapDesign(page);

  const ergebnis = await page.evaluate(() => {
    const st = window.__kosmo.state();
    const storeyId = st.activeStoreyId;
    // Tetraeder: 4 Vertices, 4 Dreiecksflächen (wasserdichter Minimal-Körper).
    const positions = [0, 0, 0, 1000, 0, 0, 0, 1000, 0, 0, 0, 1000];
    const faces = [0, 2, 1, 0, 1, 3, 1, 2, 3, 2, 0, 3];
    const r1 = window.__kosmo.run('design.meshErstellen', {
      form: 'daten',
      storeyId,
      positions,
      faces,
      name: 'Tetraeder Testkörper',
    });
    const meshId = r1.patches[0]!.id;

    window.__kosmo.run('design.meshVertexSchieben', { entityId: meshId, indices: [0], dx: 100, dy: 0, dz: 0 });
    const nachSchieben = window.__kosmo.state().doc.get(meshId) as { positions: number[]; faces: number[] };

    window.__kosmo.run('design.meshFlaecheExtrudieren', { entityId: meshId, face: 0, distanz: 200 });
    const nachExtrudieren = window.__kosmo.state().doc.get(meshId) as { positions: number[]; faces: number[] };

    return {
      meshId,
      name: (window.__kosmo.state().doc.get(meshId) as { name?: string }).name,
      positionenVorher: positions,
      positionenNachSchieben: nachSchieben.positions,
      facesVorher: faces,
      facesNachExtrudieren: nachExtrudieren.faces,
    };
  });

  expect(ergebnis.name).toBe('Tetraeder Testkörper');
  // meshVertexSchieben wirkte: Vertex 0 wanderte um +100 in x, alles andere blieb.
  expect(ergebnis.positionenNachSchieben[0]).toBe(ergebnis.positionenVorher[0]! + 100);
  expect(ergebnis.positionenNachSchieben.slice(1)).toEqual(ergebnis.positionenVorher.slice(1));
  // meshFlaecheExtrudieren wirkte: die Fläche wuchs (neue Seiten-Dreiecke).
  expect(ergebnis.facesNachExtrudieren.length).toBeGreaterThan(ergebnis.facesVorher.length);
});
