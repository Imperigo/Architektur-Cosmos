# Abgabeordner — KosmoOrbit V1

Stand: **04.07.2026** · Version **1.0** · alle Suiten grün, Installer gebaut.

Dieser Ordner ist die menschenlesbare Zusammenfassung der fertigen Software.
Der Code, die ROADMAP (123 Einträge) und die technischen Dokumente liegen im
Repo unter `kosmo-orbit/`.

## Inhalt

| Datei | Was |
| --- | --- |
| `HANDBUCH-KOSMOORBIT-V1.pdf` | Das grosse Handbuch (28 Seiten, ArchiCAD-Stil): jede Station im Detail, echte Full-HD-Screenshots, Erklärtexte «Was sehe ich / Wie arbeite ich / Grenze». |
| `galerie/` | Die 25 Full-HD-Bildschirmfotos (1920×1080), aus denen das Handbuch gebaut ist. |
| `INSTALL.md` | Installation auf Linux, macOS, Windows und iPad + iPad-Koppeln. |
| `V2-AUFTAKT.md` | Übergabe an den nächsten Worker: Erst-Prompt + V2-Prioritäten + Nahtstellen. |
| `ONEDRIVE-ABLAGE.md` | Wie diese Abgabe (+ Software) nach OneDrive «11 AI Workflow» kommt. |
| `CI-ARTEFAKTE.md` | Fundorte der Installer (Desktop dmg/AppImage/deb/rpm/msi/exe + iOS-Xcode-Artefakt). |

## Was V1 kann (Kurzbilanz)

Zehn Stationen, alle voll funktionsfähig: **KosmoDesign** (BIM-Modell → Grundriss/
Schnitt/Ansicht/Axo live, Werkplan-Detaillierung, Umbau-Status, Stützenraster,
Sonnenstudie, SIA-416-Kennzahlen + Checks), **KosmoVis** (Blender-artiger
Render-Graph als Node-Tree + Einfach-Ansicht), **KosmoData** (112 Referenzbauten,
CH-Bauteilkatalog, Materialien), **KosmoAsset** (GLB-Bibliothek, Blender-Werkbank),
**KosmoDev** (Auftragsbuch «Verbesserungen sprechen» → Fable-Workorder),
**KosmoPublish** (Blätter, Plansätze, Publikations-Sets, Revisionen),
**KosmoPrepare/Doc/Train** (Wissen, Diagnose, Lernen), plus **KosmoDraw/Sketch/
Speak**. Kosmo (die KI) hat jedes Command als Werkzeug, schreibt nie ungefragt,
Rückgängig gilt immer. Desktop + iPad live am selben Modell (QR-Koppeln).

## Ehrliche Bilanz (für die Vertiefungsarbeit)

- **ArchiCAD**: Dossier A1–A8 vollständig (ROADMAP 111–118). Bewusst nie: GDL,
  Ebenen-Zoo, DWG, MEP. Rest-◐: Wand↔Decke im Schnitt, komplexe Profile.
- **Vorform + Finch**: vollständig (ROADMAP 49–74) mit dokumentierten Grenzen
  (Generator Rechteck+L; Schallschutz = Hinweis; Gebäude-Fluchtweg = Übersicht).
- **Blender**: bewusst nicht nachgebaut (kein Fork — GPL + Architektur, siehe
  TECH-RADAR). Modellieren V2, Rendern/Sim via Worker.
- **Wartet auf die HomeStation** (nicht vorgetäuscht, im UI benannt): echte
  Renders/Whisper/bge-m3/LoRA (RTX 5090), signierte macOS/iOS-Builds
  (Apple-Konto), OneDrive-Upload (Token), Wind-Sim, selbst-ausführende
  Aufträge. Details: `../docs/HOMESTATION-AUFTRAG.md`.

## Suiten-Stand

194 Kernel + 19 KI + 6 Contracts + 14 App + 82 E2E — alles grün. Build grün,
Goldens byte-stabil. Härtetest-Runde 4 und unabhängiger Adversarial-Review über
P1–P5 durchgeführt, alle 10 Befunde gefixt.
