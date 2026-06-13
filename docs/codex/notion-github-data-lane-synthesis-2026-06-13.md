# Notion/GitHub Synthesis For KosmoReferences + KosmoAsset

Stand: 2026-06-13

Diese Notiz fasst die fuer Codex relevante Notion-/GitHub-Lage zusammen. Sie
kopiert keine Notion-Bilder, privaten Screenshots oder geschuetzte Inhalte,
sondern haelt nur die produktrelevanten Entscheidungen fest.

## Notion-Quellen

### `AI (2)` / Architektur Workflow-Pipeline

Notion-Seite:
`https://app.notion.com/p/366c5f77d5f78023843eec81d63ea890`

Relevante ArchitekturKosmos-Struktur:

- `KosmoZentrale`
- `KosmoDesign`
- `KosmoPrepare`
- `KosmoDraw/Vis/Publish`
- `KosmoData`
  - Projekt-Datenbank
  - Asset-Datenbank

Fuer meine Lane entscheidend ist Toolkit 3 der Entwurfsphase:

```text
Architekturkosmos-Datenbank
-> Referenzprojekte aus architekturkosmos.ch in Blender importieren
-> Bilder, Plaene, Texte herunterladen
-> Referenzprojekt als 3D-Asset mit Filter/Ebenen importieren und platzieren
-> aus Blender heraus Datenbankeintrag erzeugen
-> Referenzkatalog fuer jeweiliges Projekt zusammenstellen
```

Interpretation fuer Codex:

- `KosmoReferences` ist die Projekt-Datenbank: Quellen, Bilder, Plaene, Texte,
  Analyse, Modelle, Referenzkataloge.
- `KosmoAsset` ist die Asset-Datenbank: 2D-/3D-Elemente, Texturen, Materialien,
  Bauteile, Blender-/ArchiCAD-Importprofile.
- Blender ist nicht nur Viewer, sondern eine Zielumgebung fuer filterbare,
  layerbare Referenz- und Assetpakete.
- Ein Datenbankeintrag darf spaeter aus Blender/Kosmo heraus entstehen, muss
  aber weiterhin durch Source/Rights/Review-Gates laufen.

### `Prepare-Scan 2026-06-13`

Notion-Seite:
`https://app.notion.com/p/37ec5f77d5f781108297e2d704b9ddd4`

Relevante Funde:

- MarkItDown ist als sofortiger M2-Gewinn fuer PDF/Office-to-Markdown
  priorisiert.
- DeepSeek-OCR 2 wird als lokales Vision-OCR fuer gescannte Seiten notiert.
- Qwen3-Embedding ist fuer spaeteres lokales RAG/Embedding relevant.
- Lokale RAG-Stacks mit Ollama + Chroma bleiben als schneller Pfad notiert.

Interpretation fuer Codex:

- KosmoReferences braucht eine private Book/Lecture-Ingestion-Spur:
  PDF/Scan -> Markdown/OCR -> Quellenpaket -> privater Draft -> Rechte-Gate.
- MarkItDown ist der naechste pragmatische Kandidat fuer lokale digitale
  Buecher, ETH-/HSLU-Unterlagen und Wettbewerbs-PDFs.
- Embeddings gehoeren spaeter in eine Retrieval-Schicht; zuerst muessen
  Source-Pakete und Rechte sauber sein.

### `AI-Scan 2026-06-13` / KosmoPublish Daily Scans

Notion-Seite:
`https://app.notion.com/p/37ec5f77d5f7816483c2c7bca9367540`

Relevante Funde:

- Paper2Poster als MIT-lizenzierte Multi-Agent-Poster-Generierung.
- IfcOpenShell 0.8.5 als produktionsreife IFC-Geometrie-Engine.
- Layout-/Poster-Modelle sind fuer KosmoPublish relevant, aber nicht die
  vorderste KosmoReferences-Aufgabe.

Interpretation fuer Codex:

- KosmoAsset muss spaeter IFC/DXF/SVG/GLB-Profile mitdenken.
- KosmoReferences kann KosmoPublish spaeter mit referenzierten Plaenen,
  Projekttexten und Quellenkatalogen beliefern.
- Die Data-Lane darf KosmoPublish nicht mit geschuetztem Buch-/Planmaterial
  kontaminieren; Public/Private Split bleibt Pflicht.

## GitHub-Connector-Befund

GitHub-App-Suche in `Imperigo/Architektur-Cosmos` und `Imperigo/KosmoOrbit`
mit den neuen Begriffen `KosmoReferences`, `KosmoAsset`, `Villa Savoye`,
`Ingenbohl`, `Swiss timber`, `Lignumdata` lieferte keine Treffer.

Interpretation:

- Die Begriffe `KosmoReferences` und `KosmoAsset` sind neu eingefuehrte
  Codex-Nomenklatur und aktuell lokal/Git frisch gepusht.
- Der lokale Checkout ist fuer die Data-Lane verlaesslicher als die
  GitHub-Connector-Suche, solange der Connector diese neuen Commits noch nicht
  in der Suche findet.

## Produktentscheidung Fuer Die Data-Lane

Die Notion-Vision bestaetigt die heute eingefuehrte Aufteilung:

```text
KosmoData
  -> KosmoReferences = Projekt-/Referenzdatenbank
  -> KosmoAsset = 2D/3D/Material/Texture/Element-Datenbank
```

Minimaler technischer Vertrag:

```text
source package
  -> rights gate
  -> reference entry draft
  -> analysis layers
  -> model/media/asset plan
  -> review
  -> Blender/ArchiCAD/KosmoPublish export or private-only storage
```

## Konsequenzen Fuer Die Naechste Umsetzung

1. MarkItDown als lokalen Book/PDF-to-Markdown-Pfad fuer private
   Quellenpakete testen.
2. Villa Savoye als Goldstandard fuer Referenzprojekt -> 2D/3D-Asset-Derivate
   weiter nutzen.
3. Ingenbohl als starker zeitgenoessischer Material-/Tectonic-Pilot fuehren,
   aber Public-Media blockiert halten.
4. Schweizer Holzbau erst promoten, wenn der echte Buch-/ETH-/HSLU-Library-Pfad
   sichtbar ist oder ein explizit erlaubtes Public-Source-Pack erzeugt wird.
5. KosmoAsset-Schema auf Blender-Import mit Filter/Ebenen ausrichten, nicht nur
   auf statische Download-Dateien.
