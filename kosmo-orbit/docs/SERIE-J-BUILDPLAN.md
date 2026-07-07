# Serie J — Buildplan: Intuitive Bedienung & adaptive Oberfläche (Fable, 07.07.2026)

> Orchestrierbarer Bauplan zu `docs/SERIE-J-INTUITIVE-BEDIENUNG.md`. Fable legt
> hier Eingabemodell, Adaptions-Regeln, Batches, Reihenfolge und Abnahme fest;
> Opus zerlegt 1:1 in Sonnet-Aufträge. Kein Batch ändert Kernel-`derive/` —
> **alle Goldens bleiben byte-identisch.** Je Batch gilt das Owner-Mandat:
> Feature → Tests (+E2E) → ROADMAP-Eintrag (vor dem Phase-3-Marker) →
> deutscher Commit mit Trailern → Push auf den Entwicklungs-Branch.

## 0. Ist-Zustand (gelesen, verbindlich als Ausgangslage)

- **3D** (`apps/kosmo-orbit/src/modules/design/Viewport3D.tsx`): plain three.js
  + `camera-controls` ^3.1.2. Maus: `mouseButtons.left = NAV_ACTION[navModus]`
  (NavLeiste-Knöpfe orbit/pan/zoom, Zeile 163–172/220–224), Mitteltaste=DOLLY,
  Rechts=TRUCK (Defaults), Rad=DOLLY mit `dollyToCursor = true`,
  `smoothTime = 0.12`. **Touch: unkonfigurierte camera-controls-Defaults**,
  kein `touch-action: none` am Canvas, kein Doppel-Tap/Long-Press. Im
  Skizzenmodus wird die Kamera hart abgeschaltet (`controls.enabled = !an`,
  `syncSketchModus`) — ein Finger kann während des Skizzierens NICHT
  navigieren, und **jeder** Pointer (auch Finger) zeichnet.
  Test-Hook `window.__kosmoViewport` (renderOnce/resume/setCamera) existiert.
- **2D** (`PlanView.tsx`): eigene Touch-Map + Pinch (2 Finger = Pan+Pinch, ans
  Pinch-Zentrum verankert, Zeile 74–77/197–323), Rad-Zoom **zur Bildmitte**
  (Zeile 137–141), `navModus2d` werkzeug/pan/zoom. Vorbild für Verhalten,
  nicht für Code-Sharing (SVG-View vs. three-Kamera).
- **Fokus (T7)** (`state/fokus.ts`): statische Map `KOPFLEISTE_FOKUS`,
  `fokusStufe()`, `fokusKlasse()`; CSS `.k-primaer/.k-sekundaer/.k-selten` in
  `packages/kosmo-ui/src/aura.css` (Z. 323–350), Motion-Tokens
  `--k-motion-fast/base/settle` + `prefers-reduced-motion`-Block (Z. 220).
- **Werkzeugleiste** (`DesignWorkspace.tsx` Z. 596–841): Zeichen-Werkzeuge
  (`tool-*`), Sektionen «Ansicht»/«Export»/«Ebenen» (`Trennlabel`), Projekt-Menü
  (`projekt-menu-toggle`, bereits `.k-selten`), Undo/Redo. `tool: ToolId`
  (Z. 124), `ZEICHEN_WERKZEUGE` (Z. 85), Shortcuts über
  `zeichen-shortcuts.ts` (Z. 221–224). SIA-Phase: `doc.settings.phase`
  (`vorprojekt|bauprojekt|werkplan`, kernel `model/doc.ts`).
- **A4-Muster** (`sketch-3d.ts`): reine Geometrie-/Klassifikations-Funktionen,
  unit-getestet in `apps/kosmo-orbit/test/sketch-3d.test.ts` — dieses Muster
  wird für Gesten und Adaption wiederholt.

---

## 1. Einheitliches Eingabemodell (J1+J2 gemeinsam)

**Ein neues, reines Modul** `apps/kosmo-orbit/src/modules/design/eingabe-3d.ts`
ist die einzige Quelle der Wahrheit für die Belegung. Viewport3D wird zum
dünnen Adapter: es füttert camera-controls und den Gesten-Detektor, enthält
aber selbst keine Belegungs- oder Erkennungslogik mehr.

### 1.1 Belegungstabelle (verbindlich)

| Eingabe | Aktion |
| --- | --- |
| **1 Finger ziehen** | Orbit um Pivot (`ACTION.TOUCH_ROTATE`) |
| **2 Finger** | Pan + Pinch-Zoom zugleich (`ACTION.TOUCH_DOLLY_TRUCK`), Zoom zum Pinch-Zentrum (`dollyToCursor` gilt auch für Touch) |
| **3 Finger** | reines Pan (`ACTION.TOUCH_TRUCK`) |
| **Doppel-Tap** | Einpassen auf getroffenes Objekt (Raycast → `fitToBox(obj)`), sonst Gesamt-Einpassen |
| **Halten (long-press, ≥500 ms, <8 px)** | Kontextmenü + «Fokus hier» (Orbit-Pivot via `controls.setOrbitPoint`) |
| **Pencil (`pointerType==='pen'`)** | zeichnet IMMER (Skizze/Werkzeug), navigiert NIE |
| **Linke Maustaste** | aktives Werkzeug; NavLeiste-Modus (orbit/pan/zoom) übersteuert wie bisher |
| **Mittlere Taste ziehen** | Orbit (`ACTION.ROTATE`) — Blender/ArchiCAD-Muscle-Memory |
| **Shift + mittlere Taste** | Pan (`ACTION.TRUCK`) |
| **Rechte Taste ziehen** | Pan (bestehend, bleibt — kein Funktionsverlust) |
| **Rechtsklick ohne Drag (<4 px)** | Kontextmenü (dasselbe wie long-press) |
| **Rad** | Zoom zum Cursor (bestehend); Trackpad-Pinch kommt als `wheel`+`ctrlKey` und läuft denselben Weg |

Konsistenz-Kern: Orbit/Pan/Zoom/Fokus sind **eine** Kamera-Logik
(camera-controls), Touch und Maus sind nur verschiedene Zeilen derselben
Tabelle. iPad↔Desktop-Wechsel fühlt sich gleich an.

### 1.2 API des Moduls (reine Funktionen, alle unit-testbar ohne WebGL/Touch)

```ts
// eingabe-3d.ts — KEIN three-Import nötig ausser Typ-Konstanten via Parameter
export type NavModus = 'orbit' | 'pan' | 'zoom';
export type KameraAktion = 'rotate' | 'truck' | 'dolly' | 'none';

/** Maus-Belegung: left je NavModus, middle je Shift, right fest 'truck'. */
export function mausBelegung(navModus: NavModus, shiftKey: boolean):
  { left: KameraAktion; middle: KameraAktion; right: KameraAktion };

/** Touch-Belegung: one/two/three-Finger-Aktionen (Tabelle 1.1). */
export function touchBelegung(): { one: KameraAktion; two: 'dollyTruck'; three: KameraAktion };

/**
 * Pencil-Trennung: darf camera-controls dieses Pointer-Event sehen?
 * pen → false (zeichnet), touch → true (navigiert — AUCH im Skizzenmodus),
 * mouse → im Skizzenmodus false für Button 0 (linke Taste zeichnet),
 * true für Mittel/Rechts/Rad (Kamera bleibt am Trackpad/der Maus bedienbar).
 */
export function kameraDarfSehen(
  pointerType: string, button: number, sketchMode: boolean,
): boolean;

/**
 * Gesten-Detektor als reiner Zustandsautomat (Muster A4): wird mit
 * {typ:'down'|'move'|'up'|'cancel', t, x, y, pointerId, pointerType}
 * gefüttert und liefert erkannte Gesten zurück — ohne DOM, ohne Timer
 * (Zeit kommt als Parameter herein, long-press prüft der Aufrufer per
 * `pruefeLongPress(state, tJetzt)`).
 */
export interface GestenEreignis { tap?: {x,y}; doppelTap?: {x,y}; longPress?: {x,y}; }
export function gestenDetektor(): {
  ereignis(e: PointerSample): GestenEreignis;
  pruefeLongPress(tJetzt: number): GestenEreignis;
};
// Konstanten: DOPPELTAP_MS = 300, DOPPELTAP_RADIUS_PX = 24,
// LONGPRESS_MS = 500, LONGPRESS_RADIUS_PX = 8, KLICK_RADIUS_PX = 4
```

Viewport3D übersetzt `KameraAktion` → `CameraControls.ACTION.*` über eine
kleine lokale Map (die einzige three-Kopplung). Die Umschaltung Shift+Mittel
passiert im `pointerdown`-Capture-Handler (Modifier lesen →
`controls.mouseButtons.middle` setzen, bei `pointerup` zurück) — camera-controls
kennt keine Modifier nativ; das ist der ehrliche, getestete Weg.

**Pencil-Trennung technisch:** ein Capture-Phase-`pointerdown`-Listener auf
`renderer.domElement` ruft `kameraDarfSehen(...)`; bei `false` →
`ev.stopImmediatePropagation()` bevor camera-controls das Event sieht, und das
Event geht stattdessen an die Sketch-/Werkzeug-Handler. Damit fällt das harte
`controls.enabled = !sketchMode` weg: **im Skizzenmodus navigiert der Finger,
der Pencil (und die linke Maustaste) zeichnet.** T5/A4-Raycast-Weg
(`onSketchPointerDown/Move/Up`, `sketch-3d.ts`) bleibt unverändert — er bekommt
nur andere Events zugeteilt.

**Trägheit/Dämpfung:** `draggingSmoothTime ≈ 0.05` (direkt an der Hand),
`smoothTime ≈ 0.25` (weiches Ausrollen nach dem Loslassen). Das ist
camera-controls-natives Damping — echtes Flick-Momentum mit Geschwindigkeits-
abriss bietet die Lib nicht; wir täuschen keins vor (ehrliche Grenze, s. 6).
`touch-action: none` + `user-select: none` aufs Canvas (fehlt heute — ohne das
scrollt/zoomt iPad-Safari die Seite statt der Kamera).

---

## 2. Adaptions-Regeln J3 (verbindlich)

### 2.1 Modell

Neues Modul `apps/kosmo-orbit/src/state/oberflaeche-adaption.ts` (reine
Regelfunktionen + dünner Laufzeit-Store). **Laufzeit ≠ Modell:** Adaption ist
Nutzer-/Gerätezustand → localStorage (`kosmo.adaption.v1`), NIE im Doc, kein
Yjs/Undo, keine Goldens berührt. `state/fokus.ts` wird erweitert, nicht
ersetzt: `fokusStufe()`/`fokusKlasse()` bleiben; neu kommt die dynamische
Ableitung darüber.

```ts
export type LeistenGruppe = 'zeichnen' | 'ansicht' | 'export' | 'ebenen' | 'projekt' | 'verlauf';

export interface TaetigkeitsKontext {
  tool: string;                       // ToolId aus DesignWorkspace
  phase: 'vorprojekt' | 'bauprojekt' | 'werkplan'; // doc.settings.phase
  aktionLaeuft: boolean;              // Punktkette offen, Pointer unten, Sketch pending
}
export interface NutzungsProfil {                    // lokal gelernt
  zaehler: Record<string, number>;    // elementId → gewichteter Zähler
  zuletzt: Record<string, number>;    // elementId → Zeitstempel
}

/** DIE Regel: Basis-Stufe (T7) × Tätigkeit × Nutzung → Stufe. Rein, testbar. */
export function adaptiveFokusStufe(
  gruppe: LeistenGruppe, basis: FokusStufe,
  kontext: TaetigkeitsKontext, nutzung: NutzungsProfil,
): FokusStufe;

/** Anti-Nerv-Wache: bei laufender Aktion wird NIE neu berechnet. */
export function darfUmordnen(kontext: TaetigkeitsKontext): boolean; // = !aktionLaeuft

export function nutzungMelden(elementId: string): void;   // Klick/Shortcut zählt
export function nutzungVerfallen(profil, tage): NutzungsProfil; // Halbwertszeit 7 Tage
export function adaptionZuruecksetzen(): void;             // löscht kosmo.adaption.v1
export function adaptionAktiv(): boolean;                  // Opt-out-Schalter
```

### 2.2 Tätigkeits-Matrix (Basis = T7-Zuordnung aus OBERFLAECHE-FOKUS-SYSTEMATIK)

| Gruppe | Basis | beim Zeichnen (`tool ∈ ZEICHEN_WERKZEUGE ∪ {skizze}`) | `tool='auswahl'` | Phase `werkplan` | Phase `vorprojekt` |
| --- | --- | --- | --- | --- | --- |
| zeichnen (`tool-*`) | primär | primär | primär | primär | primär |
| ansicht (`view-*`) | sekundär | sekundär | sekundär | sekundär | sekundär |
| export (PDF/SVG/IFC…) | sekundär | **selten** | sekundär | **hebt eine Stufe** (selten→sekundär, nie über Basis hinaus) | **selten** |
| ebenen (Textur/Sonne/…) | sekundär | **selten** (offene Panels bleiben sekundär — nie ein aktives Panel dimmen) | sekundär | sekundär | sekundär |
| projekt | selten | selten | selten | selten | selten |
| verlauf (Undo/Redo) | primär | primär | primär | primär | primär |

Nutzer-Adaption obendrauf: Elemente, die im gewichteten Zähler die Top-3 ihrer
Gruppe sind, gewinnen **maximal eine** Stufe (selten→sekundär). Nie höher als
primär, nie unter der Matrix-Stufe von etwas gerade Aktivem.

### 2.3 Regeln gegen den Nerv-Faktor (hart, nicht verhandelbar)

1. **Feste Anker:** J3 ändert NIE die DOM-Reihenfolge oder Position eines
   Elements — nur die Fokus-Stufe (Prominenz/Deckkraft via
   `.k-primaer/.k-sekundaer/.k-selten`). Muscle-Memory bleibt exakt erhalten;
   `.k-selten` hellt bei Hover/Fokus auf 1 auf (bestehendes aura.css-Verhalten)
   — nichts ist je unerreichbar.
2. **Keine Sprünge während einer Aktion:** `darfUmordnen()` friert die Stufen
   ein, solange `aktionLaeuft` (Punktkette `points.length>0`, Pointer gedrückt,
   `sketchPending`). Neuberechnung erst 2 s nach der letzten Aktion (Debounce).
3. **Gedämpft:** Übergänge nur über `--k-motion-base`; der bestehende
   `prefers-reduced-motion`-Block in aura.css schaltet sie ab (Sonnet prüft,
   dass die neue Transition dort erfasst ist).
4. **Zurücksetzbar + abschaltbar:** im Projekt-Menü («Projekt ▾»-Zeile):
   Schalter «Oberfläche passt sich an [an/aus]» + Knopf «Oberfläche
   zurücksetzen» (`data-testid="adaption-reset"`).
5. **Transparent:** solange die Adaption etwas gedimmt hat, zeigt die
   Werkzeugleiste einen dezenten Hinweis (`data-testid="adaption-hinweis"`,
   `title` erklärt warum, z. B. «Export zurückgestellt — du zeichnest gerade»).
   Anschlussfähig an Serie G (Kosmo erklärt), aber G ist NICHT Teil von J.
6. Erfahrungsstufen (Serie F, simple/ausgewogen/experte) sind der künftige
   grobe Rahmen — J3 baut die Regel-API so, dass eine Stufe später als
   weiterer `kontext`-Parameter dazukommt, implementiert F aber nicht.

---

## 3. Build-Order (Batches)

**Ausführungs-Reihenfolge weicht bewusst von der Nummerierung ab:** das
Kontextmenü wird EINMAL gebaut (in J2, weil per Maus voll E2E-fahrbar) und
von J1b (long-press) wiederverwendet.

### J1a — Eingabe-Kern & Touch-Grundlage
- **Ziel:** `eingabe-3d.ts` als Quelle der Wahrheit; Touch explizit belegt;
  Pencil-Trennung; Dämpfung; Canvas touch-fähig.
- **Dateien:** NEU `apps/kosmo-orbit/src/modules/design/eingabe-3d.ts`,
  NEU `apps/kosmo-orbit/test/eingabe-3d.test.ts`,
  `apps/kosmo-orbit/src/modules/design/Viewport3D.tsx`,
  NEU `e2e/eingabe-3d.spec.ts`.
- **Umfang:** M.
- **Schritte:**
  1. `eingabe-3d.ts`: `mausBelegung`, `touchBelegung`, `kameraDarfSehen`
     (Signaturen aus 1.2) + Konstanten. Reines TS, kein three-Import.
  2. Viewport3D: `controls.touches.one/two/three` explizit aus
     `touchBelegung()` setzen (ACTION-Map lokal); `draggingSmoothTime`/
     `smoothTime` gemäss 1.2; `touch-action: none` + `user-select: none` auf
     `renderer.domElement`; Capture-`pointerdown`-Filter mit
     `kameraDarfSehen` (ersetzt `controls.enabled = !an` in
     `syncSketchModus` — Finger navigiert im Skizzenmodus, Pen/linke Maus
     zeichnet; Sketch-Handler ignorieren `pointerType==='touch'`).
  3. Test-Hook erweitern: `__kosmoViewport.getCamera(): {px,py,pz,tx,ty,tz}`
     (aus `controls.getPosition/getTarget`) — Grundlage aller Kamera-E2E.
  4. NavLeiste-3D-Tooltips (Z. 1029–1032) um Touch-Hinweise ergänzen
     («1 Finger dreht, 2 Finger verschieben/zoomen»).
  5. Optionale neue Felder an `ViewportHandlers`: keine in diesem Batch —
     wo doch, exactOptionalPropertyTypes-konform (konditionale Spreads).
- **Reine-Funktions-Tests:** Belegungstabellen vollständig (jede Zeile aus
  1.1); `kameraDarfSehen` als Wahrheitstafel (pen/touch/mouse ×
  sketchMode × button).
- **E2E** (`eingabe-3d.spec.ts`): synthetische `PointerEvent`-Sequenzen per
  `page.dispatchEvent`/`page.evaluate` auf dem Canvas (`pointerType:'touch'`,
  zwei pointerIds für Pinch), dazwischen `__kosmoViewport.renderOnce()`;
  Assertions über `getCamera()` (1-Finger-Drag ändert Blickwinkel bei
  gleichem Target-Abstand; Pinch verringert Distanz; Pan verschiebt Target).
  Skizzenmodus: Touch-Drag ändert Kamera UND erzeugt keinen Strich;
  `pointerType:'pen'`-Drag erzeugt Strich und lässt `getCamera()` unverändert.
- **Goldens:** unberührt (kein Kernel-Code). ROADMAP-Eintrag «J1a».

### J2 — Maus-Feinschliff & Kontextmenü
- **Ziel:** Mittel=Orbit, Shift+Mittel=Pan, Rechtsklick-Kontextmenü,
  Kontextcursor je Werkzeug.
- **Dateien:** `Viewport3D.tsx`, `eingabe-3d.ts` (+`test/eingabe-3d.test.ts`),
  NEU `apps/kosmo-orbit/src/modules/design/ViewportKontextmenue.tsx`,
  `DesignWorkspace.tsx` (**nur** ein neues optionales Handler-Feld
  `werkzeugCursor` + Kontextmenü-Aktions-Callbacks), `e2e/eingabe-3d.spec.ts`.
- **Umfang:** M.
- **Schritte:**
  1. Viewport3D: `mouseButtons.middle` initial ROTATE; Capture-Handler liest
     `ev.shiftKey` → `mausBelegung(navModus, shiftKey)` anwenden, bei
     `pointerup` zurücksetzen. Rechts-DRAG bleibt TRUCK; Rechts-KLICK
     (<4 px bewegt, bestehendes `downPos`-Muster Z. 882–898) öffnet das Menü.
  2. `ViewportKontextmenue.tsx` (`data-testid="viewport-kontextmenue"`),
     positioniert am Klickpunkt: **Auswählen** (Raycast-Pick, bestehender
     `onPick`-Weg) · **Fokus hier** (`setOrbitPoint` auf Treffer) ·
     **Einpassen** (bestehendes `einpassen()`) · **Ansicht zurücksetzen**
     (`controls.reset(true)`). Escape/Klick daneben schliesst.
  3. Kontextcursor: neues optionales Feld `werkzeugCursor?: string` in
     `ViewportHandlers` (konditionaler Spread in DesignWorkspace Z. ~292);
     reine Funktion `werkzeugCursorFuer(tool): string` in `eingabe-3d.ts`
     (auswahl→`default`, Zeichenwerkzeuge→`crosshair`, skizze→`crosshair`,
     Pan-Modus→`grab`); Viewport3D setzt `canvas.style.cursor`.
  4. `onContextMenu`-preventDefault auf dem Canvas (Muster PlanView Z. 324).
- **Reine-Funktions-Tests:** `mausBelegung` mit/ohne Shift;
  `werkzeugCursorFuer` je Werkzeug; Klick-vs-Drag-Schwelle.
- **E2E:** Mitteltasten-Drag (`button:1`-PointerEvents) ändert Blickwinkel;
  Shift+Mittel verschiebt Target; Rechtsklick öffnet Menü, «Fokus hier»
  ändert Orbit-Pivot (nachfolgender 1-Finger/Mittel-Orbit kreist ums neue
  Ziel — via `getCamera()`), «Einpassen» konvergiert wie `nav-fit`;
  Cursor-Attribut wechselt mit `tool-wand`→`tool-auswahl`.
- **Goldens:** unberührt. ROADMAP «J2».

### J1b — Gesten: Doppel-Tap, Long-Press, Feinschliff Touch
- **Ziel:** Doppel-Tap-Einpassen, Long-Press = Kontextmenü + Fokus; Gesten-
  Detektor als reiner Automat.
- **Dateien:** `eingabe-3d.ts` (+Test), `Viewport3D.tsx`,
  `e2e/eingabe-3d.spec.ts`.
- **Umfang:** M.
- **Schritte:**
  1. `gestenDetektor()` (1.2) als reiner Zustandsautomat: Tap/Doppel-Tap/
     Long-Press aus PointerSamples; Bewegung > 8 px bricht Long-Press ab
     (Orbit läuft dann einfach weiter — camera-controls hat das Event ja
     schon); Zeit als Parameter, kein `setTimeout` im Modul.
  2. Viewport3D füttert den Detektor aus den bestehenden Handlern
     (`onPointerDown/Move/Up`); `pruefeLongPress` im Renderloop (`renderFrame`)
     mit `performance.now()` — deterministisch per `renderOnce` testbar.
  3. Doppel-Tap: Raycast am Tap-Punkt (Muster `sketchRaycastNaechster`);
     Treffer → `controls.fitToBox(hit.obj, true, …)`, sonst `einpassen()`.
  4. Long-Press: öffnet `ViewportKontextmenue` (aus J2) am Fingerpunkt und
     setzt den Orbit-Pivot-Vorschlag; während offenem Menü keine Kamera.
- **Reine-Funktions-Tests:** Detektor-Sequenzen (tap→tap schnell = doppelTap;
  langsam = zwei taps; halten ohne Bewegung = longPress; halten mit Bewegung
  = nichts; Multi-Pointer bricht Tap-Erkennung ab).
- **E2E:** zwei schnelle Touch-Taps → `getCamera()` konvergiert Richtung
  Modell-Bounding (Distanz sinkt, Target im Modell); Long-Press (down,
  `renderOnce` nach künstlichem Zeitsprung — Detektor bekommt Zeit als
  Parameter, der Hook `__kosmoViewport.renderOnce()` reicht) → Menü sichtbar.
- **Goldens:** unberührt. ROADMAP «J1b».

### J3a — Adaptions-Regelwerk (rein, ohne UI)
- **Ziel:** komplette Regel-Logik aus Abschnitt 2 als pure Funktionen + Store.
- **Dateien:** NEU `apps/kosmo-orbit/src/state/oberflaeche-adaption.ts`,
  NEU `apps/kosmo-orbit/test/oberflaeche-adaption.test.ts`,
  `apps/kosmo-orbit/src/state/fokus.ts` (nur ergänzen: generische
  `fokusKlasse` bleibt; bestehende `KOPFLEISTE_FOKUS`-API unverändert),
  `docs/OBERFLAECHE-FOKUS-SYSTEMATIK.md` (kurzer J3-Abschnitt).
- **Umfang:** M. **Kein UI-Wiring — dadurch parallel zu J1a baubar.**
- **Schritte:** API aus 2.1 exakt umsetzen; Matrix aus 2.2 als Datentabelle
  (`TAETIGKEITS_REGELN`), nicht als if-Kaskade; localStorage-Persistenz mit
  Versionsschlüssel `kosmo.adaption.v1` + defensivem JSON-Parse (kaputter
  Eintrag → Basiszustand, kein Crash); Verfall (Halbwertszeit 7 Tage) beim
  Laden anwenden.
- **Reine-Funktions-Tests (Kernstück, ≥15 Fälle):** jede Matrix-Zelle;
  `darfUmordnen` friert ein; Top-3-Hebung maximal eine Stufe; nie über
  primär; offenes Panel wird nie gedimmt; Reset leert; deaktivierte Adaption
  liefert exakt Basis-Stufen; Verfall halbiert korrekt.
- **E2E:** keiner (kommt in J3b). **Goldens:** unberührt. ROADMAP «J3a».

### J3b — Tätigkeits-Adaption in der Werkzeugleiste
- **Ziel:** DesignWorkspace-Werkzeugleiste lebt: Gruppen tragen dynamische
  Fokus-Klassen nach 2.2, eingefroren während Aktionen.
- **Dateien:** `DesignWorkspace.tsx`, `oberflaeche-adaption.ts` (nur falls
  Lücken auffallen), NEU `e2e/oberflaeche-adaption.spec.ts`.
- **Umfang:** M. **Erst NACH J2** (beide fassen DesignWorkspace.tsx an).
- **Schritte:**
  1. Die Sektionen der Werkzeugleiste (Z. 596–841) in Gruppen-Spans fassen
     (`data-testid="leiste-gruppe-export"` usw.), Klasse aus
     `fokusKlasse(adaptiveFokusStufe(gruppe, basis, kontext, nutzung))`.
     KEINE Umordnung, keine Layout-Änderung — nur className (Regel 2.3.1).
  2. `TaetigkeitsKontext` aus vorhandenem State ableiten: `tool`,
     `doc.settings.phase`, `aktionLaeuft` = `points.length>0 || moveActive ||
     sketchPending` — als kleine Hilfsfunktion, unit-testbar.
  3. Debounce 2 s nach Aktionsende (Regel 2.3.2), Transition über
     `--k-motion-base` (2.3.3).
  4. `adaption-hinweis` (2.3.5) neben dem Projekt-Menü, nur sichtbar wenn
     die Matrix aktuell etwas unter Basis-Stufe hält.
- **Reine-Funktions-Tests:** Kontext-Ableitung (`aktionLaeuft`-Fälle).
- **E2E:** `tool-wand` wählen → `leiste-gruppe-export` hat `.k-selten` und
  `adaption-hinweis` ist sichtbar; Punktkette beginnen (Klick im Plan) →
  Werkzeugwechsel-Stufen bleiben eingefroren bis Abschluss; `tool-auswahl` →
  Export zurück auf `.k-sekundaer`; Buttons bleiben klickbar (Export-Klick
  in `.k-selten` funktioniert). Muster: bestehende
  `e2e/oberflaeche-hierarchie.spec.ts`.
- **Goldens:** unberührt (reine className-Änderung; Screenshot-freie Specs).
  ROADMAP «J3b».

### J3c — Nutzer-Lernen, Reset, Transparenz
- **Ziel:** Häufigkeit/Zuletzt lernt lokal; Opt-out + Reset sichtbar.
- **Dateien:** `DesignWorkspace.tsx` (Projekt-Menü-Zeile, `nutzungMelden` an
  Werkzeug-Klicks UND Shortcut-Weg Z. 221–224), `oberflaeche-adaption.ts`,
  `e2e/oberflaeche-adaption.spec.ts`.
- **Umfang:** S.
- **Schritte:** `nutzungMelden` an alle Leisten-Klicks + `werkzeugFuerTaste`;
  Projekt-Menü bekommt Schalter «Oberfläche passt sich an» +
  `adaption-reset`-Knopf (2.3.4); Top-3-Hebung greift sichtbar (z. B. oft
  genutztes «Sonne» bleibt sekundär, obwohl Matrix es beim Zeichnen senken
  würde — Regel-Priorität aus 2.2 beachten: Hebung max. eine Stufe).
- **E2E:** mehrfaches Klicken eines Ebenen-Knopfs → nach Werkzeugwechsel
  bleibt er eine Stufe höher als seine Gruppe; `adaption-reset` → Basis-
  Zustand; Schalter aus → exakt T7-Basisklassen; localStorage-Schlüssel
  `kosmo.adaption.v1` entsteht/verschwindet.
- **Goldens:** unberührt. ROADMAP «J3c».

---

## 4. Orchestrierungs-Plan (für Opus)

**Heisse Datei ist `Viewport3D.tsx`** (J1a, J2, J1b) — strikt seriell.
**Zweite heisse Datei ist `DesignWorkspace.tsx`** (J2 klein, J3b, J3c) —
J3b/J3c erst nach J2. `eingabe-3d.ts` gehört zur Viewport-Spur,
`oberflaeche-adaption.ts`/`fokus.ts` zur Adaptions-Spur — die Spuren sind
dateidisjunkt, bis auf DesignWorkspace.

| Phase | parallel? | Batches | Begründung |
| --- | --- | --- | --- |
| 1 | **ja** | **J1a ∥ J3a** | disjunkt: Viewport3D/eingabe-3d vs. state/* |
| — | | **Fable-Review 1** nach J1a+J3a | Eingabemodell-API + Regel-API sind die Fundamente; erst nach Freigabe darauf bauen |
| 2 | nein | **J2** | braucht J1a (Capture-Filter, Belegung); fasst Viewport3D UND DesignWorkspace an → allein |
| 3 | **ja** | **J1b ∥ J3b** | J1b: Viewport3D+eingabe-3d; J3b: DesignWorkspace+adaption — disjunkt. J1b braucht J2 (Kontextmenü), J3b braucht J2 (DesignWorkspace frei) + J3a |
| — | | **Fable-Review 2** nach J3b | Nerv-Faktor-Urteil: Freeze/Anker/Hinweis am lebenden Objekt prüfen, bevor Lernen dazukommt |
| 4 | nein | **J3c** | baut auf J3b-DOM auf |
| — | | **Fable-Schlussreview** | Gesamtbild + ROADMAP-Konsistenz |

Je Batch (Opus-Harness): Gate `npm run typecheck` + `npm test` +
`npm run build`, dann **serielle** Playwright-E2E (Helferserver mit `setsid`,
Preview-Build), ROADMAP-Eintrag, deutscher Commit mit Trailern, Push.
Parallel laufende Sonnet-Agenten arbeiten in getrennten Worktrees; Opus merged
Phase-weise und lässt das Gate auf dem Merge-Stand nochmals laufen (die
E2E-Suite läuft ohnehin seriell — zwei parallele Batches heisst zwei Builds,
EIN gemeinsamer E2E-Lauf nach dem Merge ist zulässig und schneller).

**Sonnet-Auftrags-Schablone:** Kontext = dieser Plan (Abschnitt des Batches) +
`kosmo-orbit/CLAUDE.md` + die konkreten Ist-Zeilen aus Abschnitt 0. Verbote:
keine Kernel-/derive-Änderung, keine neuen Abhängigkeiten, keine
DOM-Umordnung in J3, `exactOptionalPropertyTypes`-konforme Spreads,
bestehende `data-testid`s unangetastet.

## 5. Abnahmekriterien je Batch (grün/rot für Opus)

- **J1a:** alle Unit-Fälle aus 1.1/1.2 grün; E2E: Touch-Orbit/Pinch/Pan
  verändern `getCamera()` wie spezifiziert; Skizzenmodus: Finger navigiert
  ohne Strich, Pen zeichnet ohne Kamerabewegung; `touch-action:none` am
  Canvas; bestehende Specs (v. a. `sketch-3d-a4.spec.ts`, `module.spec.ts`)
  grün; Goldens byte-identisch; ROADMAP-Eintrag vorhanden.
- **J2:** Mittel-Orbit/Shift-Mittel-Pan/Rechts-Drag-Pan per E2E belegt;
  Rechtsklick-Menü mit allen vier Aktionen funktional; Cursor wechselt je
  Werkzeug; kein bestehender Maus-Weg verloren (NavLeiste-Modi weiter grün).
- **J1b:** Detektor-Automat vollständig unit-getestet (inkl. Abbruchfälle);
  Doppel-Tap-Fit und Long-Press-Menü per E2E; einfacher Tap löst weiterhin
  `onGroundClick`/Pick aus (keine Regression der Klick-Schwelle).
- **J3a:** ≥15 Regel-Unit-Fälle grün, inkl. Persistenz-Härte (kaputtes JSON);
  keinerlei UI-Änderung in diesem Batch (Diff-Check).
- **J3b:** E2E: Stufenwechsel je Werkzeug gemäss Matrix; Freeze während
  Punktkette; kein Element wechselt DOM-Position (E2E vergleicht Reihenfolge
  der testids vor/nach Adaption); `adaption-hinweis` erscheint/verschwindet;
  alles bleibt klickbar.
- **J3c:** Lernen hebt max. eine Stufe; Reset & Opt-out per E2E; localStorage
  sauber versioniert; volle Suiten + komplette E2E grün.

## 6. Ehrliche Restgrenzen (offen benennen, auch im UI-Ton)

- **Echtes Multitouch-Gefühl** (Momentum-Feinheit, Palm-Rejection, 240-Hz-
  Pencil-Koaleszenz, Safari-`gesturestart`-Eigenheiten) ist nur am iPad final
  beurteilbar — E2E beweist die Logik (Geste→Kamera-Delta), nicht die Haptik.
  Owner-Gerätetest nach J1b einplanen.
- **Flick-Trägheit:** camera-controls dämpft (`smoothTime`), wirft aber nicht
  physikalisch nach — wir liefern weiches Ausrollen, kein simuliertes
  iOS-Momentum; Rubber-Band an Grenzen nur soweit die Lib es hergibt
  (`boundary`/min-max-Distanz), nicht nachgebaut.
- **Trackpad:** Pinch kommt als `ctrlKey+wheel` und funktioniert; echte
  Drei-Finger-OS-Gesten sind Browser-seitig nicht erreichbar.
- **Hover-Vorschau «was ein Klick täte»** (J2-Konzeptpunkt): der bestehende
  `previewLine`-Weg zeigt es beim Zeichnen bereits; eine echte Geister-
  Vorschau für Wand/Öffnung im 3D wäre ein eigener Derive-naher Batch —
  bewusst NICHT in Serie J (Golden-Risiko), als V2-Kandidat notiert.
- **J3 lernt nur lokal** (Gerät/Browser) — kein Profil-Sync; das ist Serie F.
- **2D-Rad-Zoom zur Cursor-Position** (statt Bildmitte, PlanView Z. 137–141)
  wäre konsequent, ist aber 2D-Scope — als Ein-Zeilen-Kandidat für einen
  T-Nachbatch notiert, nicht Teil von J.
