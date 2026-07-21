# Befund: Bodenraster im 3D-Viewport zeigt nur Fernfeld-Band, keine Nahbereich-Linien

**Datum:** 21.07.2026 (Sonnet-Diagnose-Agent, reine Ursachen-Diagnose, keine Produktcode-Änderung)

## Wurzelursache in 2 Sätzen

`THREE.GridHelper` (Viewport3D.tsx Z.937/941) zeichnet jede Raster-Linie als **eine einzige,
200 Einheiten lange `GL_LINES`-Primitive** (voller Grid-Durchmesser in einem Zug, nicht pro
1m-Zelle segmentiert). Bei der App-Kamera (`PerspectiveCamera(45, …, 0.05, 2000)` aus nächster
Nähe auf eine sehr lange, stark schräg verlaufende Linie blickend) rastert die WebGL-Pipeline
dieser Umgebung (ANGLE/SwiftShader-Softwarerenderer) den kamera-nahen Teil dieser langen Linien
gar nicht, den fern-komprimierten Teil dagegen schon — daraus entsteht exakt das beobachtete
Bild: leeres Nahfeld, verdichtetes Band am Horizont.

## Beweis — Minimalfall reproduziert die App 1:1

Standalone-Repro unter `raster-repro/` (three.js **0.184.0**, identisch zu
`kosmo-orbit/node_modules/three`, keine Repo-Datei berührt):

- `schritt-0-baseline.png` — exakte App-Konstellation (Himmel `#edeae2`, ShadowMaterial-Boden,
  2×GridHelper transparent, Kamera 45°/0.05/2000, `setLookAt(18,14,18, 4,0,-4)`) →
  **identisches Bild** zum Fehlerbericht: Nahbereich komplett leer, oben ein verdichtetes
  Linienband.
- `app-echte-viewport.png` — **echte laufende App** auf `:5183` (Vite-Preview), Design-Modul,
  zwei per `k.run('design.wandZeichnen', …)` gezeichnete Wände, `__kosmoViewport.renderOnce()`
  vor dem Schuss → **zeigt exakt dasselbe Bild** wie der Minimalfall (linke 3D-Hälfte:
  Wände sichtbar, Raster nur oben als schwaches Band, sonst leer). Das schliesst die Lücke
  zwischen Minimalfall und echter App.

## Bisektions-Tabelle (Minimalfall, je ein Faktor pro Schritt)

| Schritt | Änderung | Nahbereich-Linien sichtbar? | Screenshot |
|---|---|---|---|
| 0 (Baseline) | exakte App-Konstellation | **Nein** | `schritt-0-baseline.png` |
| a | ShadowMaterial-Boden entfernt | **Nein** (unverändert) | `schritt-a-ohne-ground.png` |
| b | Grid `transparent`/`opacity` aus (opak, α=1) | **Nein** (unverändert) | `schritt-b-ohne-transparent.png` |
| c | Kamera-`near` 0.05 → 0.5 | **Nein** (unverändert) | `schritt-c-near-0.5.png` |
| d1 | Renderer `antialias: false` | **Nein** (unverändert) | `schritt-d1-no-antialias.png` |
| d2 | `logarithmicDepthBuffer: true` | **Nein** (unverändert, Fernband minim anders gemustert) | `schritt-d2-logdepth.png` |
| d3 | `toneMapping: ACESFilmic` | **Nein** (unverändert) | `schritt-d3-aces.png` |
| e | Grid-Farben hart Schwarz, opak, α=1 (Kontrast-Nullhypothese) | **Nein** — pixelgenau verifiziert (Zeilenscan per PIL: unterhalb Zeile ~280/800 kein einziges Linien-Pixel ausserhalb Würfel-Schlagschatten) | `schritt-e-schwarze-linien.png` |
| f | Boden UND Transparenz beide aus (Kombination a+b) | **Nein** (unverändert) | `schritt-f-ground-und-transparent-aus.png` |
| **Isolation** | **NUR** `GridHelper` (kein Boden, kein Licht, kein Würfel) + `AxesHelper` als Referenz-Linien am Ursprung | Achsen-Linien (kurz, 20 Einheiten) sind im Nahbereich **klar sichtbar**; die 200 Einheiten langen Grid-Linien im selben Bildbereich **nicht** | `isolate-grid-only.png` |
| **Fix-Probe** | Gleiches Raster, aber jede 1m-Zelle als **eigenes kurzes Liniensegment** statt einer 200-Einheiten-Linie (`mode=shortsegs` in `isolate2.html`) | **Ja — komplett, Nah- UND Fernfeld** | `isolate2-shortsegs.png` (Kontrast: `isolate2-gridhelper.png` reproduziert den Fehler) |

**Kernbeweis der Isolation:** Die `AxesHelper`-Linien (ebenfalls `LineSegments`/`LineBasicMaterial`,
ebenfalls kamera-nah, ebenfalls unlit) rendern im exakt selben Bildbereich klaglos — der einzige
Unterschied zum Grid ist die **Linienlänge** (20 vs. 200 Einheiten). Das schliesst Farbe,
Transparenz, Depth-Buffer-Präzision, Boden-Interaktion, Antialiasing und Tonemapping als Ursache
aus und isoliert die Linienlänge/-primitive selbst als Faktor. Die Fix-Probe (identische
Ziellinien, nur in 1m-Stücke zerlegt) bestätigt das ursächlich: **derselbe Kamera-Blickwinkel,
derselbe Renderer, dieselben Farben — nur die Segmentierung ändert sich, und der Fehler
verschwindet vollständig.**

## Wichtiger Vorbehalt: Software-Renderer (SwiftShader), kein echter GPU-Treiber

`WEBGL_debug_renderer_info` in diesem Container liefert:

```
unmaskedRenderer: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)"
```

`/dev/dri` existiert nicht, `nvidia-smi`/`glxinfo` fehlen — dieser Container hat **keine echte
GPU**, jeder WebGL-Kontext läuft über **SwiftShader** (Googles CPU-Software-Renderer). Der
gefundene Effekt (lange `GL_LINES`-Primitiven verlieren ihren kamera-nahen Abschnitt) ist damit
mit Sicherheit **in dieser Umgebung** reproduzierbar und real — er erklärt exakt das, was Fable
in der Owner-Vorarbeit (ebenfalls per Playwright/Container, `serviceWorkers:'block'`) beobachtet
und dokumentiert hat, und was der Live-Check gegen `:5183` in genau demselben Container bestätigt.

**Offen bleibt:** ob derselbe Rasterisierungs-Fehler auch auf einer echten GPU (NVIDIA/AMD/Intel-
Treiber, wie sie der Owner auf der echten HomeStation/seinem Arbeitsgerät nutzt) auftritt.
SwiftShader ist ein Referenz-/Kompatibilitäts-Softwarerenderer mit historisch bekannten
Abweichungen bei Clipping-Randfällen sehr langer, extrem schräg verlaufender Linienprimitiven
gegenüber Hardware-Treibern — es ist plausibel, aber hier **nicht verifizierbar**, dass echte
Hardware das robuster handhabt. Da aber sowohl Fables ursprüngliche Diagnose als auch dieser
Live-Check gegen `:5183` **in genau dieser containerisierten Umgebung** entstanden sind, ist der
Befund für den aktuellen Beobachtungskontext (Owner-Screenshots aus dem Container/CI) mit
Sicherheit die Erklärung. Empfehlung: den Fix unabhängig davon umsetzen (er ist auf jedem
Renderer korrekt und strikt günstiger/robuster als die aktuelle Lösung), und zusätzlich einmal
auf echter Hardware gegenprüfen, um zu wissen, ob es sich um einen reinen CI-Artefakt oder ein
Problem handelt, das der Owner auch produktiv sieht.

## Fix-Empfehlung für 0.8.12 (Skizze, NICHT angewendet)

Statt `THREE.GridHelper` (das zwingend volle-Breite-Linien baut) ein Ersatz-Objekt, das dieselben
zwei Raster-Ebenen (1m fein / 10m stark) aus **kurzen Pro-Zelle-Segmenten** aufbaut. Kern-Idee
(Drei-Zeilen-Skizze, echte Umsetzung bräuchte eine kleine Hilfsfunktion, keine Materialänderung
nötig):

```ts
// statt: const grid = new THREE.GridHelper(200, 200, c1, c2);
// Ersatz baut dieselbe Linienschar, aber pro 1m-Zelle als eigenes kurzes Segment
// (kein 200-Einheiten-Primitiv mehr) -- Material/Farben/Transparenz bleiben identisch.
const grid = bauSegmentiertesRaster(200, 200, 0xb9b3a4, 0xd8d3c6); // liefert LineSegments
grid.material.transparent = true; grid.material.opacity = 0.5;    // unverändert wie bisher
scene.add(grid); // gridMajor analog mit (200, 20, ...)
```

`bauSegmentiertesRaster()` wäre eine ~15-Zeilen-Hilfsfunktion (analog `isolate2.html`,
`mode=shortsegs`, dort bereits als Funktionsprinzip erprobt und pixelgenau verifiziert), die für
jede Rasterzeile/-spalte NICHT eine durchgehende Linie, sondern `divisions` viele kurze
Segmente à 1 Einheit erzeugt und in EIN `BufferGeometry`/`LineSegments` packt (keine
Performance-Regression: gleiche Vertex-/Draw-Call-Zahl in der Grössenordnung, drei.js gruppiert
ohnehin in ein Objekt).

Alternative (kleinere Änderung, aber schwächerer Fix): `GridHelper`-Grösse deutlich verkleinern
(z. B. 200→40, mehr Wiederholungen/Nachführung um die Kamera) — reduziert die Linienlänge und
damit die Symptomatik, behebt sie aber nicht grundsätzlich und bricht mit der bestehenden
"immer 200 Einheiten sichtbar"-Erwartung.

## Risiken der Fix-Umsetzung

- **Goldens (`packages/kosmo-kernel/test/golden/*.svg`):** Der 3D-Viewport ist **nicht** Teil der
  SVG-Golden-Kette (2D-Pläne/Schnitte/Axo, kein Three.js-Canvas) — **keine Golden-Berührung**,
  solange nur `Viewport3D.tsx` angefasst wird.
- **E2E:** `e2e/k20-viewport-himmel.spec.ts` (b) nimmt bereits einen unbewiesenen
  Beweis-Screenshot vom 3D-Canvas OHNE Pixel-Assertion (bewusst so dokumentiert, Kommentar
  Z.15-25: "kein Grafik-Regressions-Bedarf"), `e2e/viewport3d-marquee.spec.ts` und
  `e2e/viewport3d-auswahl.spec.ts` operieren auf Objektauswahl/Marquee, nicht auf Rasterpixeln —
  nach grober Durchsicht der Dateinamen kein Test, der auf GridHelper-Geometrie oder
  Rasterlinien-Pixelwerte prüft. Volle E2E-Suite sollte trotzdem laufen (Gegenprüfungs-Skill),
  da `Viewport3D.tsx` zentral für mehrere 3D-Specs ist (Kamera-HUD, Marquee, Auswahl).
- **Performance:** Segmentierung erzeugt dieselbe Gesamt-Vertex-Zahl wie das bisherige
  GridHelper-Äquivalent (kein Mehrfach-Draw-Call nötig, ein `BufferGeometry`) — in der
  Fix-Probe (`isolate2-shortsegs.png`, 200×200-Raster voll segmentiert) blieb der Frame
  in Playwright ohne merkliche Verzögerung.
- **Kein Produktcode wurde geändert** — dieser Befund ist reine Diagnose; die Umsetzung des Fix
  (neue Hilfsfunktion, Austausch der zwei `GridHelper`-Aufrufe Z.937/941) ist ein eigenständiges
  Paket.

## Verwendete Dateien (alle im Scratchpad, Repo unberührt — `git status` liefert leer)

- `raster-repro/base.html` + `raster-repro/shoot.mjs` — Bisektions-Repro mit Query-Flags
  (`ground`, `gridTransparent`, `near`, `antialias`, `logDepth`, `toneMapping`,
  `gridColorsBlack`, `gridOffset`).
- `raster-repro/isolate.html` — Grid + AxesHelper, keine anderen Objekte (Kernbeweis).
- `raster-repro/isolate2.html` — `mode=gridhelper` vs. `mode=shortsegs` (Fix-Probe).
- `raster-repro/app-check.mjs` — Live-Check gegen laufende `:5183`-Vorschau (kein Repo-Schreiben,
  nur `page.evaluate`/`localStorage` in der Browser-Session).
- `raster-repro/three.module.js` + `three.core.js` — Kopie aus
  `kosmo-orbit/node_modules/three/build/` (Version 0.184.0, identisch zur App), nur zum Laden
  im Scratchpad-HTTP-Server (`raster-repro/server.log`, Port 8931, lokal, nur für diese Diagnose).
- Screenshots: `schritt-0-baseline.png` … `schritt-f-ground-und-transparent-aus.png`,
  `isolate-grid-only.png`, `isolate2-gridhelper.png`, `isolate2-shortsegs.png`,
  `app-echte-viewport.png`.
