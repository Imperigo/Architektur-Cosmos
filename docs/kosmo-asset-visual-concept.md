# KosmoAsset Visual Concept

Stand: 2026-05-26

## Rolle

`KosmoAsset` ist nicht das Wurmloch. KosmoData bleibt der geschichtliche
Wissensraum fuer Projekte, Quellen und Relationen. KosmoAsset wird die
Werkstatt-Orbit-Station fuer wiederverwendbare 2D-/3D-, Material-, Textur-,
Detail- und Exportressourcen.

## Leitbild

KosmoAsset wirkt wie ein kosmisches Bauteil-Labor:

- ein zentraler Asset Core statt eines Zeittunnels;
- technische Orbits fuer Asset-Familien;
- kleine Asset-Koerper wie Satelliten, Chips oder Bauteilproben;
- klare Rechte- und Review-Gates;
- sichtbare Exportlogik fuer Blender, ArchiCAD, Web, SVG, DXF und GLB.

## Grafische Regeln

- Hintergrund bleibt dunkel und kosmisch, aber ruhiger und technischer als
  KosmoData.
- Linien sind feiner, rasterartiger und instrumenteller.
- Material-Assets erhalten Flaechen/Swatches.
- 2D-Assets erhalten Plan-/Symbol-Anmutung.
- 3D-Assets erhalten Drahtmodell-/Isometrie-Anmutung.
- Status ist sichtbar, aber nicht laut:
  - nutzbar: gruen;
  - review-only: gold;
  - privat/blockiert: gedimmt oder rot, wenn spaeter noetig.

## V1

Die erste Website-Version ist eine statische Landing-Ansicht:

- eigener Screen nach Klick auf `KosmoAsset` im Orbit-Hauptmenue;
- liest die lokale Demo-Library aus
  `examples/kosmo-assets/kosmo-asset-demo/library.json`;
- zeigt Kennzahlen, Kategorien und drei Demo-Assets;
- erlaubt lokale Familienfilter fuer alle, 2D, Material und 3D;
- zeigt beim Klick auf ein Asset einen Inspektor mit Rechte-, Review-,
  Format-, Export- und Quellenstatus;
- zeichnet lokale Preview-Metadaten direkt in der UI: Achsenmarker,
  Material-Swatch und Drahtmodell-Komponente;
- erzeugt mit `npm run kosmo:asset-export-plan` eine lokale Export-Routen-
  Analyse fuer Blender, ArchiCAD, Web, SVG, DXF und GLB;
- erzeugt mit `npm run kosmo:asset-review-pack` ein kompaktes menschliches
  Review-Pack fuer Rechte, lokale Dateien, Generated-Profile und Export-Routen;
- erzeugt mit `npm run kosmo:asset-exchange-profile` ein lokales
  Blender-/ArchiCAD-/Web-Uebergabeprofil fuer Collection-, Layer- und
  Surface-Namen;
- erzeugt mit `npm run kosmo:asset-handoff-bundle` eine review-only
  Blender-Python-Vorlage und einen ArchiCAD-Layer-/Surface-Schedule;
- prueft mit `npm run kosmo:asset-handoff-smoke` die lokalen Handoff-Dateien
  ohne Asset-Import, Projektdatei-Write oder Public-Gate;
- erzeugt mit `npm run kosmo:asset-generate-demo-glb` ein erstes lokales,
  analytisches GLB-Bauteil fuer Blender/Web/ArchiCAD-Tests;
- erzeugt mit `npm run kosmo:asset-generate-demo-dxf` erste lokale
  DXF-Planzeichen und Bauteil-Footprints fuer ArchiCAD/CAD-Tests;
- erzeugt mit `npm run kosmo:asset-generate-demo-material-profile` ein
  lokales Materialparameter-Profil fuer Blender-/ArchiCAD-Mappingtests;
- keine Uploads;
- keine Datenbank-Writes;
- keine R2-Uploads;
- kein Public-Download.

## Naechste Stufen

1. GLB-Vorschauen im Browser-Inspector anzeigen.
2. Blender-/ArchiCAD-Exportprofile als kopierbare Review-Karten ausgeben.
3. Rights Gate und private/dev Asset-Modus getrennt visualisieren.
4. Spaeter eine echte KosmoAsset Library View mit Such-/Filterlogik bauen.
