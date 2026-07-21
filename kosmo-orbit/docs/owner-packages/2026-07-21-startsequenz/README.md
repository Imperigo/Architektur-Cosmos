# KosmoOrbit — Startsequenz · Übergabepaket

Stand 21.07.2026 · basiert auf KosmoOrbit v0.8.10 «Inselrein» + Architekturkosmos Design System (schlicht & edel).

## Inhalt

| Datei | Was es ist |
|---|---|
| `KosmoOrbit Start-Flow.dc.html` | Klickbarer Prototyp: Splash → Boot → Arbeitsplatz → Zentrale → Projektstart. Tweaks: Gerät (Desktop/iPad), Splash (Fenster/Vollbild), Boot-Dauer 2–12 s. Phasen-Chips unten zum Springen. |
| `KosmoOrbit Startanimation.dc.html` | Abspielbares Motion-Piece (16:9, ~17.5 s, Loop, als Video exportierbar). Szenen: Desktop-Doppelklick → Splash → Boot → Bereit → Zentrale. Szenenliste in der Datei (`OM_SCENES`), auf der Host-Timeline trimm- und umsortierbar. |
| `KosmoOrbit Startprinzipien.dc.html` | Referenzdokument: 6 Gestaltungsprinzipien, Sequenz-Storyboard, Animationssets A–E mit Live-Demos, Motion-Token, Do/Don't. |
| `startanimation-scenes.jsx` | Szenen-Komponenten des Motion-Pieces (React, Scene-Clock-getrieben). |
| `animations-v2.jsx` | Timeline-Engine (Stage/SceneStage, Easing, Export-Kontrakt). |
| `support.js` | Laufzeit für die .dc.html-Dateien. |

Alle drei .dc.html öffnen direkt im Browser (Ordnerstruktur beibehalten). Schriften laden von Google Fonts (Lato, PT Sans Narrow, IBM Plex Mono).

## Logo

Verwendet wird die KosmoOrbit-Marke: geneigte Orbit-Ellipse (rotate −24°, rx 17 / ry 8.5, Teal `#57B6C2`) + A-Spitze (`M11 25 L20 9 L29 25`, Neutral `#DCE0E8`) + Knoten (`r 2.4`, Teal) — identisch zur Marke in Werkzeug-Dock / v0.7.7.

## Kernentscheide

- **Ehrlicher Boot:** KERN · KOSMO-LLM · PROJEKTGRAPH · BRIDGE · STATIONEN — echte Systeme statt anonymem Balken.
- **Satellit = Ladeanzeige:** ein Punkt umkreist die Ellipse (2.6 s linear), dockt bei «Bereit» an. Ersetzt jeden Spinner.
- **Leitsatz:** «Der Architekt bleibt Autor.» + SYSTEM BEREIT, danach Arbeitsplatzwahl.
- **Zentrale nach Owner-Notizen:** Begrüssung ohne Punkt-Listen, Projekt-Tableiste (nur Projekte, kein AI-Slop), Einstellungen/Hilfe/Sync präsent oben rechts, Stationen mit Hover-Fächer (KosmoDesign → Draw/Prepare/Vis/Publish/Modellbaum), KosmoOffice «kommend».
- **Motion-Token:** Entrance (0.16, 1, 0.3, 1) · Standard (0.4, 0, 0.2, 1) · 0.16/0.24/0.5 s · Orbit-Drift 12–24 s · Glow nur als Zustand · prefers-reduced-motion respektiert, alles skippbar.
