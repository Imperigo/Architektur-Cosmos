# GOLDEN-WECHSEL 089 — Konsolidierungs-/Stillstandsnachweis

v0.8.9 «Geordnet» ist bewusst **kein** Golden-Beweger (V089-SPEZ E5): dieser
Wechsel beweist Stillstand im Bestand plus einen klein benannten additiven
Zuwachs. Referenzbasis vor v0.8.9: **37 Dateien** (36 SVG + 1 IFC) in
`packages/kosmo-kernel/test/golden/`, svg-qa deckt 36.

## Teil 1 — Erwartungsliste (Prognose, VOR Tag C geschrieben)

Prognose je Paket. **Jede Abweichung von dieser Liste beim Teil-2-Lauf ist
ein Hard-Stop** — Fable klassifiziert den Diff, bevor irgendetwas
freigegeben wird.

| Paket | bewegte Bestands-Goldens | neue Goldens |
|---|---|---|
| PA1 Wand↔Wand-Schnitt | 0 (im Gate 523 sha256-bewiesen: strikt-höhere-Priorität-Guard) | 0 |
| PA2 DXF-Ebenen + Sperren | 0 (DXF hat kein Golden; Gate 526) | 0 |
| PA5 Treppen-3D-Griffe + Fable-Nachzug | 0 (reine App/Viewport-Arbeit) | 0 |
| PBL1 Verträge + Bridge | 0 (contracts/main.py — kein Golden-Kontakt) | 0 |
| PBL2 Blender-Client | 0 (reine App-Arbeit) | 0 |
| PBL3 glTF-Härtung | 0 (gltf hat kein Golden; Kernel-Suite im Gate 528 voll grün) | 0 |
| PBL4 Bake-Rückweg | 0 (reine App-Arbeit) | 0 |
| PB6a NodeCanvas-Kollaps | 0 (App + e2e) | 0 |
| PB3 Blattverzeichnis + Sammellegende | 0 (Subspez §5-Guard: kein sheetToSvg-Kontakt) | **+2**: `blattverzeichnis.svg`, `blattverzeichnis-legende.svg` |

**Erwartung Teil 2:** 0 bewegte Bestandsdateien, +2 additive → **39 Dateien
(38 SVG + 1 IFC), svg-qa 38/0.**

## Teil 2 — gemeinsamer Lauf (Tag C, NACH allen Landungen)

Noch offen — Ablauf (Ritual aus GOLDEN-WECHSEL-080/081/083):

1. Alle Pakete im Baum, Suiten grün.
2. EIN gemeinsamer `GOLDEN_UPDATE=1 npx vitest run`-Lauf im Kernel.
3. Vierstufige Verifikation: `git status` (nur die +2 erwarteten neuen
   Dateien) → `git diff --stat` (0 Bestandszeilen) → sha256-Liste vorher/
   nachher (36 SVG + IFC identisch) → svg-qa 38/0.
4. Ist ≠ Prognose → Hard-Stop, Diff-Klassifikation durch Fable, kein
   Commit vor der Klärung.
