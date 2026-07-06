# Serie J — Intuitive Bedienung & adaptive Oberfläche (Owner-Auftrag, V2/Fable)

> Owner (06.07.2026): «Ich möchte, dass eine intuitive Gestensteuerung im 3D —
> also mit Touch z.B. auf iPad oder Bildschirm — gemacht wird, und ein intuitiver
> Umgang mit der Maus im 3D. Und ich möchte, dass ein intuitiver Weg gesucht wird,
> wie die Zeichnungsoberflächen sich dynamisch — je nachdem was gemacht wird —
> neu auf den Nutzer anpassen können.»

## Prinzip

Serie J macht KosmoOrbit **anfassbar wie Apple, führend wie ArchiCAD/Blender**:
dieselbe Szene fühlt sich am iPad-Finger, am Trackpad und an der Maus jeweils
richtig an, und die Oberfläche tritt in den Hintergrund, wenn man arbeitet.
Nichts Verstecktes, nichts Unumkehrbares (Prinzip «Ehrlichkeit vor Politur»):
die adaptive Oberfläche lernt aus dem tatsächlichen Gebrauch, ist jederzeit
sicht- und zurücksetzbar, und respektiert `prefers-reduced-motion`.

Reihung: J greift tief in **jede** Zeichenfläche ein. Darum legt **Fable zuerst
das Interaktions-Konzept** (ein gemeinsames Eingabemodell Touch↔Maus + die
Adaptions-Regeln), **dann** baut Sonnet die Stufen J1–J3 als verifizierte
Batches. Fable = Urteil, Opus = Orchestrierung, Sonnet = Ausführung
(`docs/KI-MODELL-GUIDELINE.md`).

## J1 — Touch-/Gestensteuerung im 3D (iPad & Touchscreen)

Ziel: das 3D-Modell mit den Fingern so bewegen, wie man es erwartet — kein
Werkzeug-Umschalten nötig, um zu navigieren.
- **1 Finger** = Orbit (um das Fokus-/Pivot-Ziel), **2 Finger** = Pan +
  Pinch-Zoom + Twist-Rotate zugleich, **Halten (long-press)** = Kontextmenü/
  Fokus setzen. Doppel-Tap = Einpassen auf getroffenes Objekt.
- **Trägheit & Dämpfung** (weiches Ausrollen, Rubber-Band an den Grenzen) für das
  «apple-native» Gefühl; Zoom-zum-Pinch-Zentrum, nicht zur Bildmitte.
- **Pencil bleibt Zeichnen**, Finger bleibt Navigieren — die bestehende
  Pointer-/Pencil-Trennung (240 Hz, `pointerType`) wird sauber weitergeführt, so
  dass Skizzieren (T5/A4) und Navigieren sich nie in die Quere kommen.
- **Nahtstellen:** `apps/kosmo-orbit/src/modules/design/Viewport3D.tsx`
  (Pointer-Handler + three-Kamera), die Nav-Leiste aus T3 (Orbit/Pan/Zoom/
  Einpassen als sichtbarer Fallback), der Skizzen-Raycast aus A4
  (`sketch-3d.ts`). Trefferlogik als testbare reine Funktionen halten
  (Geste → Kamera-Delta) wie bei A4, damit E2E sie ohne echten Touch prüfen kann.

## J2 — Intuitiver Maus-Umgang im 3D

Ziel: Muscle-Memory aus ArchiCAD/Blender bedienen, ohne Modi zu erklären.
- **Mittlere Taste** = Orbit; **Mittel + Shift** (oder Space-gehalten) = Pan;
  **Rad** = Zoom-zum-Cursor (nicht zur Bildmitte); Rechtsklick = Kontextmenü.
- **Kontextcursor je Werkzeug** + **Hover-Vorschau** (was ein Klick jetzt täte:
  Wand/Öffnung/Auswahl), damit der Zustand sichtbar ist, bevor man klickt.
- **Ein gemeinsames Modell** mit J1: Orbit/Pan/Zoom/Fokus sind dieselbe
  Kamera-Logik, nur andere Eingabe-Zuordnung — ein Nutzer, der zwischen iPad und
  Desktop wechselt, findet sich sofort zurecht.
- **Nahtstellen:** derselbe Viewport3D-Kamera-Layer wie J1; Cursor-/Hover-Status
  im Design-Workspace.

## J3 — Dynamisch adaptive Zeichnungsoberfläche

Ziel: die Werkzeug- und Panelflächen ordnen sich **nach Tätigkeit und nach
Nutzer** neu — was man gerade tut, rückt nach vorne; selten Gebrauchtes tritt
zurück. Die Oberfläche «denkt mit», statt starr zu sein.
- Baut **direkt** auf dem bestehenden Fokus-Konzept primär/sekundär/selten aus
  T7 auf (`apps/kosmo-orbit/src/state/fokus.ts`, `.k-primaer/.k-sekundaer/
  .k-selten`, `docs/OBERFLAECHE-FOKUS-SYSTEMATIK.md`) und der Stationen-
  Systematik (`state/stationen.ts`) — Serie J macht die Fokus-Stufe **dynamisch**
  statt fest verdrahtet.
- **Tätigkeits-Kontext**: aktives Werkzeug, SIA-Phase und aktuelle Aktion heben
  die passenden Werkzeuge/Panels; z.B. beim Skizzieren treten Bemassungs-/
  Export-Gruppen zurück, beim Bemassen umgekehrt.
- **Nutzer-Adaption**: die Oberfläche lernt aus dem tatsächlichen Gebrauch
  (Häufigkeit/Zuletzt) — leichtgewichtig, lokal, **transparent und
  zurücksetzbar** («Oberfläche zurücksetzen»), nie ein verstecktes Umsortieren,
  das den Nutzer die Werkzeuge suchen lässt. Erfahrungsstufen aus Serie F
  (simple/ausgewogen/experte) sind der grobe Rahmen, J3 die feine, laufende
  Anpassung darin.
- **Regeln, damit es nicht nervt**: keine Sprünge während einer laufenden Aktion,
  gedämpfte Umordnung (Motion-Tokens, `prefers-reduced-motion`), feste Anker für
  die häufigsten Werkzeuge, damit Muscle-Memory erhalten bleibt.

## Verhältnis zu bestehenden Serien

- **T3** (Nav-Leiste/Zeichenhilfen) und **T7** (Fokus-Konzept/Systematik) sind das
  Fundament — Serie J baut sie aus, ersetzt sie nicht.
- **Serie E** (Erlebnis/Animation) liefert die Motion-Sprache für die weichen
  Übergänge in J1/J3; **Serie F** (Rollen/Erfahrungsstufen) den groben Rahmen für
  J3; **Serie G** (Kosmo als Guide) kann die Adaption erklären («Ich habe X nach
  vorne geholt, weil …»).

## Verifikation (bei Umsetzung)

- Geste→Kamera und Adaptions-Regeln als **reine, testbare Funktionen** (Kernel-/
  Unit-Tests), damit E2E sie ohne echtes Multitouch prüfen kann — Muster wie A4
  (`klassifiziereSketchTreffer` etc.).
- E2E: Pointer-Sequenzen (Playwright `dispatchEvent`/Touch-Emulation) fahren
  Orbit/Pan/Zoom im Viewport; Adaptions-Regel testbar über den Fokus-Store.
- Goldens byte-stabil (reine UI-/Kamera-Änderung, keine Derive-Geometrie).
- Je Batch: Gate (typecheck + `npm test` + `npm run build`) + volle E2E, eigener
  Push. Ehrlich benannte Restgrenzen (z.B. echtes Multitouch nur am Gerät final
  fühlbar).
