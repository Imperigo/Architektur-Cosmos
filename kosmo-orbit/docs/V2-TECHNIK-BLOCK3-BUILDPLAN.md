# V2-Technik Block 3 — FreeMesh Stufe 3 (Buildplan, Fable)

> Chefdenker-Plan (Fable, 07.07.2026) für Priorität 4 aus `V2-AUFTAKT.md`
> («freies Mesh im Viewport», Owner-Q9: ArchiCAD-Kern → MassBody/Vorform →
> FreeMesh). Grundlage: die Ist-Stand-Landkarte (Explore 07.07.) — FreeMesh
> existiert im Code NICHT (kein Entity, kein Command, kein Derive, kein
> Editier-Fundament, keine Gizmos); Stufe 2 ist der prismatische `MassBody`;
> importierte GLBs leben heute nur als nicht-pickbarer Referenz-Kontext.

## 1. Die harte Frage zuerst: Mesh im Doc vs. «Laufzeit ≠ Modell»

CLAUDE.md/`asset-bibliothek.ts` sind eindeutig: Megabyte-Binärlast (GLB,
Scans, Splats) gehört NIE durch Undo/Yjs. Gleichzeitig muss FreeMesh
selektierbar, editierbar, undo-fähig, sync-fähig und exportierbar sein —
das geht nur im Doc. **Entscheid E1 löst den Konflikt über ein hartes
Budget:**

**E1 — FreeMesh ist ein Doc-Entity mit hartem Vertex-Budget.** FreeMesh ist
*Entwurfsgeometrie* (Schalen, skulpturale Dächer, Sonderformen — der
Morph-/Schale-Anwendungsfall aus RE-ARCHICAD), NICHT ein Container für
Scans oder Bibliotheks-GLBs. Deckel: `FREEMESH_MAX_VERTICES = 4096`,
`FREEMESH_MAX_FACES = 8192` (exportierte Konstanten; Commands weisen
Überschreitung ehrlich ab). Damit bleibt die Doc-/Patch-Last beschränkt
(~100 KB worst case, typisch weit darunter) und «Laufzeit ≠ Modell» intakt:
grosse/gescannte Meshes bleiben Referenz-Kontext bzw. KosmoAsset —
die Grenze wird im UI benannt, nie verschwiegen.

## 2. Architektur-Entscheide (bindend)

**E2 — Datenmodell: flache Zahlen-Arrays, keine Halbkanten im Doc.**
```ts
interface FreeMesh extends Base {
  kind: 'freemesh';
  storeyId: string;
  /** Vertex-Positionen, flach [x0,y0,z0, x1,…] in mm (ganzzahlig gerundet). */
  positions: number[];
  /** Dreiecks-Indizes, flach [a0,b0,c0, a1,…]. */
  faces: number[];
  name?: string;
}
```
Topologie (Nachbarschaft, verschweisste Vertices, planare Regionen) wird
zur LAUFZEIT abgeleitet — pure, unit-testbare Funktionen in
`packages/kosmo-kernel/src/derive/mesh-topo.ts` (neu). Kein three.js im
Kern (Worker-Regel aus `derive/mesh.ts`).

**E3 — Alles Editieren via Commands** (Undo, Yjs und Kosmo-Tools gratis —
Command-Architektur ist das Gesetz des Repos). Minimalsatz Stufe 3:
- `design.meshErstellen` — Primitiv `quader` (Punkt, Breite/Länge/Höhe)
  ODER `ausVolumen` (MassBody-Id → Mesh mit identischer Geometrie; der
  MassBody wird in DERSELBEN Patch-Liste gelöscht — ein Undo-Schritt).
- `design.meshVertexSchieben` — `{ id, indices: number[], delta: {x,y,z} }`
  (mehrere verschweisste Vertices in einem Schritt; Budget-/Index-Guards).
- `design.meshFlaecheExtrudieren` — `{ id, face: number, distanz: Mm }`:
  extrudiert die **planare Region** um das Seed-Dreieck entlang ihrer
  Normalen (`planareRegion()` aus mesh-topo) — das Morph-Handgefühl, nicht
  Einzeldreieck-Gefrickel. Negative Distanz = einwärts.
- Löschen/Verschieben: über die BESTEHENDEN generischen Commands
  (`design.verschieben` bekommt einen `freemesh`-Zweig), kein Duplikat.
Die zod-Schemata klein und sprechbar halten — jedes Command ist
automatisch ein Kosmo-LLM-Tool.

**E4 — Viewport: eigener `meshEdit`-Modus, KEIN allgemeines
Gizmo-Framework.** Andocken an die kartierten Nähte (`artifactToObjects`/
`userData['entityId']`, `onPointerUp`-Pick, Handler-Interface):
Doppelklick/Werkzeug «Mesh bearbeiten» auf ein FreeMesh → Vertex-Handles
(Punkt-Sprites), Drag lebt lokal und committet bei pointerup als EIN
`meshVertexSchieben` (NodeCanvas-/T5-Muster); Flächen-Pick + Ziehen =
`meshFlaecheExtrudieren`. Esc/Klick daneben beendet den Modus. Touch folgt
dem J1-Eingabe-Kern (bestehender Gesten-Automat), kein Sonderweg.

**E5 — Ableitungen strikt hinter Daten-Guards (Golden-Gesetz).**
- `derive/scene.ts`: neuer Zweig `freemesh` → `GeometryArtifact` direkt aus
  positions/faces (Normalen berechnet, Kanten aus Feature-Winkel). Damit
  fliesst FreeMesh automatisch überall hin, wo `deriveAll` konsumiert wird
  (3D, GLB-Export, Ansicht-Pipeline).
- Grundriss/Schnitt: **Tri-Slice** — Schnittfigur des Meshes an der
  Schnitthöhe/-ebene (Dreiecke gegen Ebene schneiden → Segmente → zu
  Polylinien geschlossen), NUR wenn ein FreeMesh existiert. Beide Goldens
  enthalten keine Meshes → byte-identisch, und der Beweis-Test aus dem
  Umbau-Muster (`kernel.test.ts:1702`) wird für FreeMesh wiederholt.
- Kennzahlen: FreeMesh zählt NICHT in SIA-416-Flächen (ehrlich: ein freies
  Mesh hat keine normkonforme Flächenherleitung — wird im Kennzahlen-Panel
  nicht still eingerechnet).

**E6 — GLB-Brücken in beide Richtungen, mit ehrlicher Budget-Grenze.**
Export: automatisch via deriveAll-Zweig (lesbarer Name «FreeMesh ‹name› ·
Geschoss»). Import: neuer Knopf «Als FreeMesh übernehmen» in KosmoAsset —
NUR wenn das GLB ≤ Budget ist (Vertex-Zählung vor Übernahme); darüber die
ehrliche Meldung «zu gross für editierbares FreeMesh (Budget 4096 Vertices)
— bleibt Referenz-Kontext» mit dem bestehenden «Ins Modell»-Weg. Der
Blender-Roundtrip aus HOMESTATION-AUFTRAG §Modellier-Roundtrip schliesst
sich damit für kleine Meshes INS Doc.

**E7 — IFC: Versuch `IfcFacetedBrep`, sonst ehrliche Lücke.** Der
IFC-Export kennt heute nur Parametrik. Stufe 3 versucht FreeMesh als
FacetedBrep (STEP-Text, ifcopenshell-validiert wie der bestehende
IFC-Test). Scheitert die saubere Validierung im Block, wird die Lücke NICHT
still gelassen: der Export meldet «n FreeMesh-Körper nicht im IFC
(Stufe-3-Grenze)» und die ROADMAP nennt es — kein stummes Weglassen.

## 3. Batches (Reihenfolge bindend)

| # | Batch | Inhalt | Wer |
|---|---|---|---|
| FM1 | Kernel-Fundament | FreeMesh-Entity + Budget-Konstanten, `mesh-topo.ts` (verschweisste Vertices, planare Regionen — pure), Commands `meshErstellen`/`meshVertexSchieben`/`meshFlaecheExtrudieren` + `verschieben`-Zweig, `scene.ts`-Zweig, Unit-Tests inkl. **Golden-Byte-Beweis** | Fable selbst (Kernel-Berührung) |
| FM2 | 2D-Schnittfigur | Tri-Slice in Grundriss (Schnitthöhe) + Schnitt (Schnittebene), Daten-Guards, Golden-Beweis wiederholt, Kennzahlen-Ausschluss dokumentiert | Fable selbst (geometrisch hart) |
| FM3 | Viewport-Editiermodus | `meshEdit`-Modus, Vertex-Handles, Drag→EIN Command, Flächen-Extrude, Werkzeug «Mesh»/`ausVolumen`-Konvertierung im UI, testids | Sonnet gegen Spec, Review Fable |
| FM4 | GLB-Brücken | «Als FreeMesh übernehmen» (Budget-Grenze ehrlich), Export-Namen, Blender-Roundtrip-Doku-Update | Sonnet, Review Fable |
| FM5 | IFC-Versuch | IfcFacetedBrep + ifcopenshell-Validierungstest; bei Scheitern ehrliche Export-Meldung statt stiller Lücke | Fable selbst |
| FM6 | E2E + Doku | `e2e/freemesh.spec.ts` (erstellen → Vertex ziehen → Undo → Extrude → GLB-Beweis), RE-ARCHICAD-Morph-Zeilen, V2-AUFTAKT-Status | Sonnet, Review Fable |

Je Batch: Gate (Typecheck + alle Suiten + Build) + volle serielle E2E +
ROADMAP-Eintrag + deutscher Commit + Push. **Goldens byte-identisch ist in
JEDEM Batch Abbruchkriterium** (FM1/FM2 berühren den Kernel — ANY Diff =
STOP und zurück zum Buildplan).

## 4. Abnahme-Kriterien des Blocks

1. Quader erstellen → im 3D sichtbar, pickbar, verschiebbar; Vertex ziehen
   → Form ändert sich; Undo stellt exakt zurück (ein Schritt pro Zug).
2. Flächen-Extrude auf einer planaren Region wirkt als EIN Undo-Schritt.
3. MassBody → «In Mesh umwandeln» → identische Form, ein Undo-Schritt
   stellt den MassBody wieder her.
4. Grundriss/Schnitt zeigen die ehrliche Schnittfigur des Meshes; OHNE
   FreeMesh sind beide Goldens byte-identisch (Testbeweis).
5. GLB-Export enthält das Mesh mit lesbarem Namen; kleines GLB lässt sich
   als FreeMesh übernehmen, zu grosses wird ehrlich abgewiesen.
6. IFC: FacetedBrep validiert — ODER der Export benennt die Lücke offen.
7. Kosmo kann per Chat ein Mesh erstellen/extrudieren (Commands = Tools).

## 5. Bewusst NICHT in Stufe 3

- Kein Subdivide/Smooth/Boolean-3D (CSG bleibt aus — 2D-Boolean vor
  Extrusion ist die Kern-Strategie, `V2-AUFTAKT.md:61`).
- Kein Kanten-Beveln, kein Sculpting, keine NURBS.
- Keine SIA-Flächenanrechnung von FreeMesh (E5 — ehrlich statt erfunden).
- Kein allgemeines Gizmo-Framework (nur der Mesh-Editiermodus).
- Splats/grosse Scans bleiben Laufzeit-Referenz (E1-Grenze).
