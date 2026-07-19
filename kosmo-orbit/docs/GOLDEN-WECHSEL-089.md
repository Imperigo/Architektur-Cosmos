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

## Teil 2 — gemeinsamer Lauf (Tag C, 19.07.2026) — **BESTANDEN, Ist == Prognose**

Alle neun Pakete im Baum (ROADMAP 522–534, HEAD `4aeb270`), die +2
PB3-Goldens bereits mit dem PB3-Gate regeneriert und committet. Der
gemeinsame Abschluss-Lauf beweist den Stillstand des GESAMTBESTANDS:

1. `GOLDEN_UPDATE=1 npx vitest run` im Kernel — 59 Dateien / 1164 Tests
   grün, JEDES Golden neu geschrieben.
2. Vierstufige Verifikation:
   - aggregierte sha256 über alle 39 Dateien VOR dem Lauf:
     `ce144f5c283fce246c390823ed1fa774efba5c0e840e6af11d0321386dd2fab5`
   - aggregierte sha256 NACH dem Lauf: **identisch** (byte-stiller
     Regenerations-Beweis, deckt alle 38 SVG + 1 IFC gleichzeitig);
   - `git status --short`: leer (0 bewegte, 0 neue Dateien);
   - svg-qa: **38 Goldens geprüft — 0 harte Fehler** (4 bekannte
     Text-Overlap-Warnungen, Bestand).
3. Ergebnis gegen Teil 1: 0 bewegte Bestandsdateien ✓, +2 additive nur
   aus PB3 ✓ → **39 Dateien (38 SVG + 1 IFC), svg-qa 38/0.** Kein
   Hard-Stop-Fall.
