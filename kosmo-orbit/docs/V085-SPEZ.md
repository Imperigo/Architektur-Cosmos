# V085-SPEZ — v0.8.5 «Greifbar»

Verbindliche Bau-Spez (Muster V084). Owner-Mandat 18.07.2026: «direkt ultraplan
für nächste version nach deinen fable empfehlungen machen und entwickeln. du
darfst ganzes kosmoorbit weiterentwickeln» — Umfang per Rückfrage bestätigt:
**alle vier Ströme** (ArchiCAD-Tiefe II, Kosmo-Autopilot, Publish/Print-Runde,
Politur & Schulden). Basis: v0.8.4 «Ein Guss» (ROADMAP 474, `99b735b`).

## 1 · Auftrag (Fable-Empfehlungen, Owner-bestätigt)

1. **ArchiCAD-Tiefe II:** Multi-Selektion (Shift-Klick), Rubber-Band-
   Aufziehrechteck, Griffe/Handles an Wänden/Massketten/Umriss-Ecken,
   Mengen-Löschen/-Verschieben — die bewussten Nicht-Ziele aus V084 §9.
2. **Kosmo-Autopilot:** Kosmo fährt geplante Aktionsfolgen über mehrere
   Kernel-Commands (Planen→Ausführen→Prüfen), aufbauend auf dem
   vis.render-Demolauf; mehr Eval-Drehbücher.
3. **Publish/Print-Runde:** Bemassungs-/Zonen-Toggles aufs Blatt,
   PDF-Härtungs-Nachzug, Plancode-Feinschliff + die notierten Alt-Löcher.
4. **Politur & Schulden:** Icon-Schuld vis/publish/prepare, aura-Token-
   Nachträge (PB6-Kandidaten), Test-Flake-Wurzeln, Chevron-Rückbau-Probe.

## 2 · Diagnosen (verifiziert 18.07.2026)

| # | Befund | Fundstelle |
|---|---|---|
| D1 | Auswahl ist im Store BEREITS `string[]` — `selection: string[]`, `select(ids: string[])`; nur die UI setzt immer `[id]` | `state/project-store.ts:23/35/91`; `DesignWorkspace.tsx:1008` |
| D2 | Delete-Handler iteriert die Auswahl bereits (je Element `design.loeschen`, eine history-Gruppe) | `DesignWorkspace.tsx` ~840-876 (PE3-C-9-Beweis) |
| D3 | Komplettes Marquee-Vorbild existiert in Vis: Klick=Toggle, Shift-Marquee auf leerer Fläche, Esc leert | `NodeCanvas.tsx:403-405/1016-1039` |
| D4 | Handle-Vorbild existiert: Mesh-Vertex-Griffe über `handlersRef.onMeshVertexDrag` — mit Sanktion «KEIN allgemeines Gizmo-Framework» | `DesignWorkspace.tsx` ~1016 |
| D5 | Inspector liest `selection[0]` — braucht einen N-Elemente-Zweig | `DesignWorkspace.tsx:650-655` |
| D6 | Autopilot-Türöffner existiert: `vis.render` schreibt SettingsPatch, Executor-Watcher führt aus, Demolauf komplett per Commands | `commands/vis.ts:244-287`; `VisWorkspace.tsx:204-221`; `e2e/vis-demolauf.spec.ts` |
| D7 | Eval-Fundament: 25 Command-Prompts + pruefe-eval + ScriptedProvider | `wissen/training/eval/kosmo-zeichner-commands/` |
| D8 | Icon-Schuld: `werkzeug()`-Helfer in vis/publish/prepare auf `glyphe: string` typisiert (~34 Werkzeuge mit 2-Buchstaben-Kürzeln); PE2 liess das bewusst («strukturell») | `modules/vis|publish|prepare/island/*katalog*` (ROADMAP 468; Rundgang-084-Befund) |
| D9 | Token-Kandidaten aus PB6: `--isl-pill-ink`-Alias (island.css), 5 benannte PlanView-Konstanten | ROADMAP 471 |
| D10 | Esc schliesst Masskette in reinem view-2d NICHT ab (Escape-Listener nur in Viewport3D, 3d/split gemountet) | PB5-Bericht Punkt 6.4 (ROADMAP 467) |
| D11 | Kommentar-Erfassen lebt nur in der PROJEKT-Insel; Kürzel K setzt im manuell-Modus nur den Punkt | PB5-Bericht Punkt 6.3 |
| D12 | Unit-Batch-Flake: Fetch-Mock-Leck `eigene-referenzen-import.test.ts` (isoliert 8/8) | ROADMAP 471 |
| D13 | Chevron-Timeout 10→20s war Fremdlast-Kompensation mit Rückbau-Vermerk | ROADMAP 472 |

## 3 · Entscheide (eingefroren)

- **E1 Auswahl-Vertrag:** Klick ohne Modifier ersetzt die Auswahl (wie heute —
  verhaltensneutral für alle Bestands-Specs). Shift-Klick toggelt das Element.
  Rubber-Band (nur Auswahl-Werkzeug, Aufziehen auf leerer Fläche) SETZT die
  Menge; mit Shift additiv. Esc leert. Highlight rendert je Element im
  PB1-Muster (28/48px Kern+Glow). KEIN Store-Umbau.
- **E2 Mengen-Operationen ohne Kernel-Umbau:** Delete/Drag über N Elemente =
  App-seitige Command-Schleife in EINER history-Gruppe (PB5-Präzedenz).
  Kernel/derive byte-unberührt → Goldens still.
- **E3 Griffe (bewusst schmal):** Endpunkt-Griffe Wand + Masskette, Eck-Griffe
  Zone/Volumen/Dach-Outline. Griff-Hit-Test hat VORRANG vor Element-Hit-Test.
  Drag-Ende = ein Command (`design.verschieben`/`eigenschaftSetzen`-Familie
  bzw. Löschen+Neusetzen-Gruppe wie PB5 bei Masskette), eine Undo-Gruppe.
  Sanktion D4 bleibt: kein allgemeines Gizmo-Framework.
- **E4 Autopilot-Vertrag «Kosmo-Lauf»:** `LaufPlan { titel, schritte:
  { commandId, params, begruendung }[] }` in `packages/kosmo-ai`; Runner führt
  über DENSELBEN `runCommand`-Weg aus (Diff-Karten-Semantik bleibt), je Schritt
  Status offen/laeuft/ok/fehler + eigene Undo-Gruppe; Abbruch jederzeit; bei
  Fehler stoppt der Lauf ehrlich (kein Weiterlaufen). **Kein Auto-Start:**
  Läufe entstehen nur aus explizitem Dialog/Aktion. Lauf-Status ist
  Laufzeit (Runtime-Store), NICHT Doc. Erster Referenzlauf: der vis-Demolauf.
- **E5 Publish-Toggles golden-still:** Bemassungs-/Zonen-Sichtbarkeit aufs
  Blatt als optionale Settings hinter «nur wenn gesetzt»-Guards — die
  Default-Ableitung bleibt byte-gleich (36er-sha256-Beweis im Gate).
- **E6 Icon-Schnittstelle:** `werkzeug()`-Signatur in vis/publish/prepare auf
  `glyphe: string | ComponentType<{size?:number}>` (design-Konvention);
  ~34 SVGs nach Bauvorschrift (`werkzeug-icons.tsx:1-31`: 1.75/24-Strich,
  runde Kappen, EIN Akzentpunkt, currentColor). Kürzel-Fallback bleibt als
  Typ erlaubt (ehrlicher Übergang), soll aber nach PA4 nirgends mehr sichtbar
  sein.
- **E7 aura-Token-Nachträge:** `--k-glass-ink` (kanonisiert den
  `--isl-pill-ink`-Alias), `--k-print-tint` + `--k-print-linie`
  (Beton-Print-Paar, Wert = Kernel-Katalog, theme-invariant), `--k-warning-2`
  (`#c68622`-Zonenwarnstufe), `--k-diagnose` (`#1a6fb5`-Durchpaus-Blau).
  `RAUMGRAPH_FARBE #2455a4` bleibt Konstante (PB6-Urteil: akzentabhängige
  Falle). Nur Kanonisierung — null sichtbare Änderung, visueller
  Gleichheits-Beweis Pflicht.

## 4 · Wellen + Hotspot-Matrix (bindend)

Hotspots: `DesignWorkspace.tsx`/`PlanView.tsx`/`Viewport3D.tsx` → W1 exklusiv
PA1 (Fable), W2 exklusiv PB1. `packages/kosmo-ai` → W1 PA3, W2 PB2.
`island/*kataloge*` + Glyphen → PA4. `publish/**` → PB3. `aura.css` +
`island.css` → PB4. `App.tsx`/`ui-zustand.ts`: nur Fable.

**W1:** PA1 Auswahl-Fundament + Rubber-Band (FABLE selbst) ‖ PA3
Autopilot-Kern (Sonnet, Port 5174) ‖ PA4 Icon-Signatur + 34 SVGs (Sonnet,
Port 5175).
**W2:** PB1 Griffe + D10-Fix (Sonnet, 5174) ‖ PB2 Drehbücher + Eval (Sonnet,
5175) ‖ PB3 Publish/Print + D11-Fix (Sonnet, 5176) ‖ PB4 Politur + D12/D13
(Sonnet, 5177).
**W3:** Quergate → adversariale Matrix (Fan-out) → Release + Installer.

Dispatch-Disziplin in JEDEM Erst-Dispatch (lehren/v0.8.4.md): Worktree-Pflicht,
Foreground + «es kommt NIE eine Notification» + nummerierter Abschlussblock +
Port im Gate-Kommando, absolutes cd, pkill-Bracket separat, Preview aus
`apps/kosmo-orbit/`, Copy-back ohne Commit, Screenshots selbst sichten.

## 5 · Golden-Politik

Komplett golden-still: 36/36 byte-identisch, `git status` auf
`packages/kosmo-kernel` durchgehend leer + sha256-Beweis in kanonischer
Kommandoform (fester cd-Ausgangspunkt, Lehren v0.8.4).

## 6 · Sanktionen

1. Kernel/derive anfassen = Paket ungültig (E2).
2. Allgemeines Gizmo-Framework bauen = Paket ungültig (E3/D4).
3. Autopilot-Schritt an `runCommand` vorbei = Paket ungültig (E4).
4. Klick-ohne-Modifier-Verhalten ändern = Paket ungültig (E1,
   Bestands-Spec-Schutz).
5. Fremde Hotspot-Dateien anfassen = Paket ungültig; Nachzüge macht Fable
   atomar (PB4-Präzedenz ROADMAP 469/470).
6. Neue Hexes statt Token/Konstante = Paket ungültig (E7, PB6-Konvention).
7. Hintergrund-Warten («Notification») = Weckruf + Protokollvermerk.

## 7 · Vollständigkeits-Matrix (Abnahme W3)

- [x] **C-1** Shift-Klick toggelt; Klick ohne Modifier ersetzt (Bestand); Esc leert → PA1
- [x] **C-2** Rubber-Band setzt Menge, Shift-Rubber-Band additiv; nur Auswahl-Werkzeug; Pan (Leertaste) unberührt → PA1
- [x] **C-3** N-Highlight je Element sichtbar (Screenshot-Beleg) → PA1
- [x] **C-4** Delete löscht N als EINE Undo-Gruppe; Ctrl+Z stellt ALLE wieder her (tippen!) → PA1
- [x] **C-5** Drag verschiebt N gemeinsam als EINE Gruppe → PA1
- [x] **C-6** Inspector zeigt «N Elemente» + Löschen-Aktion bei Mehrfach-Auswahl → PA1
- [x] **C-7** Bestands-Specs unverändert grün (plan-interaktion, pb1, pb5, pe3-matrix-fixes) → PA1
- [x] **C-8** LaufPlan+Runner: Schritt-Status, Abbruch, Fehler-Stopp, je Schritt Undo-Gruppe, Unit-Tests → PA3
- [x] **C-9** KosmoPanel zeigt laufenden Lauf (Schrittliste + Abbrechen) → PA3
- [x] **C-10** Kein Auto-Start: Lauf nur aus expliziter Aktion (Beweis im Spec) → PA3
- [x] **C-11** vis-Demolauf als LaufPlan reproduziert (gleiches Endergebnis) → PB2
- [x] **C-12** Mindestens 2 weitere Drehbücher (Grundriss, Publish-Blatt) + Eval-Erweiterung + TrainWorkspace-Zeile → PB2
- [x] **C-13** werkzeug()-Signatur ComponentType-fähig in allen 3 Stationen; ~34 SVGs nach Bauvorschrift; kein sichtbares Kürzel mehr → PA4
- [x] **C-14** Kontaktbogen regeneriert + gesichtet (currentColor-Regel) → PA4
- [x] **C-15** Wand-/Masskette-Endpunkt-Griffe: sichtbar bei Auswahl, Drag ändert Geometrie, eine Undo-Gruppe → PB1
- [x] **C-16** Zonen-/Volumen-/Dach-Eck-Griffe ebenso → PB1
- [x] **C-17** Griff-Hit-Test vor Element-Hit-Test (kein Auswahl-Klau) → PB1
- [x] **C-18** Esc schliesst Masskette auch in reinem view-2d ab (D10) → PB1
- [x] **C-19** Publish: Bemassungs-/Zonen-Toggles wirken auf dem Blatt; Goldens byte-still (sha256) → PB3
- [x] **C-20** Kommentar-Erfassen im manuell-Modus erreichbar (D11) → PB3
- [x] **C-21** Token-Nachträge aktiv, `--isl-pill-ink`-Alias ersetzt, visuelle Gleichheit bewiesen; Fetch-Mock-Leck gefixt (voller Batch 3× grün); Chevron-Probe dokumentiert → PB4
- [ ] **C-22** Release: Matrix adversarial (Kürzel TIPPEN, 980px-Viewport, Island-Default via leerem storageState), Lehren v0.8.5, Sechs-Träger-Bump, Neuigkeiten, Release-Notiz, Rundgang-PDF, release-gate 0, Installer + sha256 + Zustellung, Owner-Smoke-Punkt → W3

## 8 · Ehrliche Nicht-Ziele

Kein allgemeines Gizmo-Framework; keine Kernel-Mengen-Commands; kein
Autopilot-Auto-Start; kein Website-Redesign; Cycles-GPU/Voll-HDRIs bleiben
HomeStation; Multi-Selektion im 3D-Viewport nur falls trivial (sonst
v0.8.6-Kandidat); keine Griffe an Öffnungen/Treppen (v0.8.6-Kandidat).
