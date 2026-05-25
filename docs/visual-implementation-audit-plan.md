# Visual Implementation Audit Plan

Stand: 2026-05-22

## Ausgangslage

Mehrere visuelle und interaktive Anforderungen wurden in kurzen Iterationen umgesetzt, aber nicht alle sind auf der Live-Website eindeutig sichtbar oder vollständig verifiziert. Das Problem liegt wahrscheinlich nicht an einem einzelnen Bug, sondern an einer Mischung aus Cache/Deploy-Verzug, vorbereiteten aber noch nicht prominent integrierten Grundlagen, SVG-/Overlay-Layering, responsiven Sonderfällen und zu vielen parallelen Feature-Spuren.

Der nächste Schritt ist deshalb kein neuer Feature-Block, sondern ein sauberer Soll/Ist-Audit mit anschliessender Fix-Reihenfolge.

## Ziel

Die Website soll visuell wieder mit der gewünschten Richtung übereinstimmen:

- Wurmloch wirkt tiefer, lebendiger und kosmischer.
- Projektobjekte wirken wie individuelle kleine Planeten mit passenden Hauptbildern.
- Baustilfarben, Objektfarben und Beschriftungen stimmen räumlich zusammen.
- Database, Search, Brain und Dossier wirken konsistent, deutsch, bedienbar und nicht wie halbfertige Tools.
- Mobile ist nicht einfach geschrumpfter Desktop, sondern eine lesbare eigene Variante.
- Alles bleibt performant, ruhig und ohne Flackern.

## Audit-Methode

1. Live-Version mit Cache-Buster öffnen.
2. Lokale Version parallel öffnen.
3. Desktop und Mobile-Viewport prüfen.
4. Screenshots machen von:
   - Startbild
   - Wurmloch Idle
   - Scroll/Zoom im Wurmloch
   - Projekt-Dossier
   - Database-Popup
   - Archive/Database-Seite
   - Detailseite Villa Savoye
   - Detailseite Ingenbohl
5. Jede Anforderung als `sichtbar`, `teilweise`, `fehlt` oder `buggt` markieren.
6. Nur danach gezielt fixen.

## Fix-Reihenfolge

### 1. Kritische Sichtbarkeit

- Prüfen, ob Live-Deploy wirklich den neuesten Commit zeigt.
- Cache-Buster und Cloudflare-Deploy-Status prüfen.
- Sicherstellen, dass CSS/JS-Bundles nicht alte Stände ausliefern.

### 2. Wurmloch und Projektobjekte

- Objektflackern beim Zoom vollständig reproduzieren und beheben.
- Hauptbilder pro Projekt final prüfen: keine falschen Duplikate, keine generischen Bilder als Planet.
- Planetendarstellung stärker individualisieren: Bild, farbige Kontur, dezente Material-/Stilfarbe.
- Wurmloch-Idle-Animation sichtbar, aber leicht halten.
- Kosmos-Hintergrund subtil beleben, ohne Performanceverlust.

### 3. Baustile und Farblogik

- Baustilbeschriftungen an den äusseren Ring setzen.
- Schrift leicht grösser, fein italic, nicht gespiegelt, Umlaute korrekt.
- Objektfarbe muss zur Baustilseite passen.
- Flächige Baustilfarben im Wurmloch stärker, aber tiefer und 3D-integriert rendern.

### 4. HUD und Popups

- Brain, Search und Database gleich gross und gleichwertig gestalten.
- Unteres Dock als strukturierte Navigation über Tags/Ebenen finalisieren.
- Database-Popup klarer: grosser Titel, goldener Hauptzugang, Nutzer-Erfassung, darunter Statistik/Knowledge-Plattform.
- Popups ohne X schliessen: Klick ausserhalb, ESC, Zurück-Funktion.
- Keine Texte dürfen über Boxen laufen.

### 5. Archive/Database-Seite

- Fadenkreuz überall sichtbar und responsiv.
- Boxen nur als interaktive Elemente, wenn sie klickbar/vergrösserbar sind.
- Archivstatus mit Radar, Progress und Hoverreaktionen nützlich und verständlich machen.
- Zurück-Animation führt ins Wurmloch, nicht zum Startbild.

### 6. Mobile

- Smartphone-UI separat prüfen.
- Button-Grössen, Textgrössen, Panels und Abstände nach Interface-Rulebook korrigieren.
- Pinch, Scroll, Tap, Dossier und Database auf Mobile testen.

### 7. Abschluss-Gates

- `npm run i18n:check`
- `npm run security:check`
- `npm run lint`
- `npm run build`
- Visueller Browser-Test Desktop/Mobile
- Erst danach Commit und Publish.

## Arbeitsregel für morgen

Keine neuen grossen Features, bis die sichtbaren Anforderungen aus diesem Audit mindestens als `sichtbar` oder bewusst `verschoben` markiert sind.

## Erweiterung für nächste Woche: Architecture Cosmos als Hauptsystem

Die Website soll nicht nur die Datenbank zeigen. Nach dem Startbild soll künftig zuerst ein zentrales Hauptmenü erscheinen, bevor man in das Wurmloch oder in die Datenbank geht. Dieses Hauptmenü wird die gesamte Architecture-Cosmos-Welt bündeln und als Einstieg in mehrere Projektmodule dienen.

### Ablauf

1. Startbild mit Architecture-Cosmos-Symbol.
2. Erster Klick startet nicht direkt das Wurmloch.
3. Stattdessen öffnet sich ein Hauptmenü als Projektzentrale.
4. Von dort wählt man die einzelnen Module.
5. Das Wurmloch bleibt ein zentrales Modul, aber nicht mehr die einzige Startrealität.

### Geplante Hauptmodule

- **KosmoData**  
  Die Architektur-Datenbank: Referenzprojekte, Quellen, Bilder, Pläne, 3D-Modelle, Analyse-Layer, private/dev und öffentliche Datenlogik.

- **KosmoAsset**
  Asset-Bibliothek: 2D-Pläne, 3D-Modelle, Texturen, Materialien, Bauteile, Referenzpakete und exportierbare Ressourcen.

- **KosmoDesign**
  Gebündelte Entwurfsmaschine: KosmoPrepare, KosmoDraw, KosmoVis und KosmoPublish als Workflow für Vorbereitung, Plan, Modell, Visualisierung und Abgabe.

- **KosmoShop**
  Späterer Produkt- und Toolzugang: freigegebene Pakete, Käufe, Abos, Erweiterungen und professionelle Projektmodule.

### Lokale Hardware-Zentrale und Online-Klon

Architecture Cosmos soll langfristig in direktem synchronisiertem Kontakt mit dem Home-PC stehen. Der Home-PC ist die lokale Hardware-Zentrale des Projekts: private Daten, lokale Modelle, grosse Medien, KI-Pipelines, Blender/ArchiCAD/Claude-Workflows und nicht-öffentliche Recherche bleiben dort kontrolliert.

Die Website wird dazu eine digitale Online-Klonablage und Schnittstelle:

- öffentliche Präsentation und Navigation;
- kontrollierte Weiterleitung zu Daten, Quellen und Modulen;
- cloudfähige Vorschau und API-Schicht;
- sichere Brücke zwischen Website, Datenbank und lokaler Projektzentrale;
- keine unkontrollierte Veröffentlichung privater oder urheberrechtlich unklarer Inhalte.

### Notion-Kontext

Die Notion-Suche hat am 2026-05-21 den relevanten AI-Bereich gefunden:

- Seite: `AI (2)`
- Hinweis: Architekturkosmos-Datenbank, Import von Referenzprojekten aus `architekturkosmos.ch` in Blender.
- Verwandte Seite: `Architektur Workflow-Pipeline`.

Für den nächsten Planungsblock muss dieser Notion-Bereich detailliert ausgewertet und mit den Website-Modulen synchronisiert werden.

### Festgelegte Modulnamen

Die Orbit-Stationen heissen aktuell verbindlich: `KosmoData`, `KosmoAsset`,
`KosmoDesign` und `KosmoShop`. KosmoDesign bündelt die früher separat
angedachten Bereiche KosmoPrepare, KosmoDraw, KosmoVis und KosmoPublish.

### Leitfrage für die nächste Konzeptphase

Wie wird Architecture Cosmos vom Atlas zu einem modularen Architektur-Betriebssystem, ohne dass die Website überladen wird oder die lokale/private Hardware-Zentrale unsicher mit der öffentlichen Website vermischt wird?

### Visuelle Richtung Hauptmenü

Das Hauptmenü soll als **kosmisches Modul-Rad mit vier Orbit-Stationen** gestaltet werden. Nach dem Startbild entsteht ein ruhiger, aber eindrucksvoller Zentralraum: In der Mitte steht das Architecture-Cosmos-Symbol, darum kreisen vier klare Stationen als Einstieg in die Module `KosmoData`, `KosmoAsset`, `KosmoDesign` und `KosmoShop`.

Die Stationen sollen nicht wie normale Website-Kacheln wirken, sondern wie navigierbare Projekt-Orbits:

- jede Station hat eine eigene Farbe, Materialität und Bewegung;
- Hover/Tap aktiviert eine kurze orbitale Fokusanimation;
- Klick führt in das jeweilige Modul;
- das Wurmloch bleibt als KosmoData/Atlas-Erlebnis eingebettet, aber nicht mehr der einzige Startpunkt;
- die Motion bleibt ruhig genug, damit das Menü wie eine professionelle Projektzentrale wirkt, nicht wie ein Spielmenü.

## Audit-Notizen 2026-05-22

### Direkt gefundene Blocker

- Lokaler Dev-Server hing zuerst bei `/atlas`; nach Entfernen des generierten `.next`-Caches und Neustart antwortete `/atlas/` wieder mit `200`.
- Search-Panel blockierte den Database-Button, weil es auf Desktop bis in den unteren rechten HUD-Bereich reichte.
- Klick ausserhalb des Search-Panels schloss Search nicht zuverlässig.
- Search/Dev/Brain-Trigger wirkten visuell zu gross bzw. Search war als `SUC...` abgeschnitten. Ursache: eine spätere `font: inherit`-Regel überschreibt die kleinen UI-Token wegen höherer Spezifität.
- Planetbilder waren datenbasiert nicht doppelt, aber visuell teilweise zu stark durch Style-Tint/Shade überlagert.

### Bereits gepatcht

- Search schliesst nun über globales Outside-Pointer-Handling.
- Search-Panel ist auf Desktop niedriger, damit der Database-Button erreichbar bleibt.
- Search/Dev/Brain-Trigger nutzen wieder explizit die kleinen UI-Font-Tokens.
- Search-Empty-State ist deutsch: `Kein Projekt gefunden`.
- Planetbild-Tönung und Schatten wurden reduziert, damit individuelle Hauptbilder sichtbarer bleiben, während farbige Kontur und Planetenwirkung erhalten bleiben.
- Balanced-Modus rendert keinen zusätzlichen SVG-Ringlayer mehr, damit keine künstlichen Partikelkränze/Flicker-Artefakte beim Scrollen entstehen.
- Node-Opacity darf beim Bewegen minimal ausfaden, statt hart zu springen.
- Baustilbeschriftungen wurden an den äußeren Ring geschoben, leicht vergrößert, feiner gespaced und die Buchstabenfolge wurde stabilisiert, damit `MODERNE` und `VERNAKULÄR` nicht gespiegelt wirken.
- Die flächigen Baustilfarben wurden im Idle verstärkt und in der Bewegungsphase weiterhin reduziert, damit die Stilzuordnung klarer wird, ohne Scroll-Performance zu belasten.
- Mobile-Dock wurde auf eine feste 5-Spalten-Leiste umgestellt, damit `DB / Archiv` nicht mehr in eine zweite Zeile springt.
- Das Cosmos-Fadenkreuz wird in der schmalen/Mobile-UI ausgeblendet, damit es keine Dock-Buttons überdeckt.
- Nach dem Startbild öffnet jetzt ein kosmisches Modul-Rad als Projektzentrale.
- `KosmoData` ist als aktives Modul verbunden und startet das Wurmloch.
- `KosmoAsset`, `KosmoDesign` und `KosmoShop` sind als geplante Orbit-Stationen sichtbar, aber noch nicht funktional ausgebaut.
- Die Phone-Tier-Regeln wurden verdichtet, damit Brain, Suche, Dev und Mobile-Dock auf `390x844` ohne horizontalen Overflow lesbar bleiben.

### Verifiziert

- Startbild sichtbar.
- Nach Klick erscheint der Atlas/Wurmloch-Idle-Zustand.
- Search ist wieder lesbar als `SUCHE`.
- Search schliesst bei Klick ausserhalb.
- Database kann danach geöffnet werden.
- Scroll-Serie im Balanced-Modus zeigt keine zusätzlichen SVG-Partikelkränze mehr.
- Desktop-Scroll-Sequenz: 89 sichtbare Nodes bleiben stabil, 58 sichtbare Planetbilder sind 58 eindeutige URLs.
- Baustil-ARIA-Labels: `I ANTIKE`, `II FRÜHMODERNE`, `III MODERNE`, `IV NACHKRIEG`, `V REUSE`, `VI VERNAKULÄR`.
- Mobile-Test `390x844`: kein horizontaler Overflow, keine doppelte SVG-Database-Schaltfläche, Dock bleibt in einer Zeile.
- `npm run i18n:check` bestanden.
- `npx tsc --noEmit` bestanden.
- `npm run lint` läuft wieder kontrolliert durch; verbleibende Punkte sind Warnungen, keine Fehler.
- `npm run build` bestanden; statischer Export erzeugt 121 Seiten.
- `npm run security:check` bestanden.
- `npm run database:planet-thumbnails:audit` bestanden: 77/112 Planet-Thumbnails, 0 doppelte URLs.
- Hydration-Fehler im Dev-Browser behoben: Atlas wird erst nach Client-Mount gerendert, vorher erscheint ein stabiler Bootscreen.
- Stilsektoren, farbige Tiefenfelder und Objektpositionen nutzen nun dieselbe `tubeTwist`-Geometrie. Dadurch liegen die farbigen Stilbereiche räumlich wieder bei den zugehörigen Projektplaneten.
- Der harte Front-Cut der Projektobjekte wurde entschärft: Nodes bleiben bis in den vorderen Fade-Bereich sichtbar und verschwinden über Opacity statt abrupt aus dem DOM zu fallen.
- Baustilbeschriftungen sind am äußeren Ring leicht größer, feiner gestrichen und mit mehr Buchstabenabstand gesetzt.
- Modul-Rad-Flow lokal geprüft: Startbild -> Hauptmenü -> `KosmoData` -> Wurmloch.
- Mobile-Modulrad lokal auf `390x844` geprüft: vier Stationen bleiben erreichbar, kein horizontaler Overflow.
- `npm run database:hero-images:audit` bestanden: 77/112 Hero-Bilder, 35 fehlen, 0 doppelte URLs, 0 blockierte/unklare öffentliche Lizenzen.
- `npm run database:hero-images -- --limit 10` erzeugte einen Commons-Review-Pack: 3 Kandidaten, 7 manuell zu prüfen, keine automatische Übernahme.

### Build-/Lint-Stabilisierung 2026-05-22

- Lokale Node-Version auf Node 22 geprüft, passend zur Cloudflare-Build-Umgebung.
- Next-Build wurde stabilisiert: Webpack läuft in-process, CSS-Preset-Worker reduziert, Nexts interne Type-/Lint-Worker werden übersprungen.
- TypeScript, Lint, Security und UI-Audits bleiben explizite Gates ausserhalb von `next build`, damit Fehler sichtbar bleiben und der statische Export nicht mehr an stummen Worker-Prozessen hängen bleibt.
- ESLint wurde von der hängenden Legacy-`FlatCompat`/`eslint-config-next`-Kette auf eine native Flat-Config mit TypeScript-, Next- und React-Hooks-Regeln umgestellt.

### Weiter offen

- 35/112 Einträge haben noch kein öffentliches Hero-/Planetbild. Nächster Schritt: erst Review-Pack je Eintrag, dann nur eindeutig projektpassende, public-safe Bilder übernehmen.
- Echte Mobile-QA auf iPhone/Opera/Safari bleibt eigener Block, auch wenn der schmale In-App-Viewport nun stabiler aussieht.
- Objektflackern beim Scroll/Zoom muss noch per gezielter visueller Aufnahme/Sequenz auf echten Browsern geprüft werden; der harte Front-Cut ist aber bereits entschärft.
- Baustilbeschriftungen und Stilfarben müssen weiterhin auf echten Browsern gegen Objektfarben geprüft werden; die gemeinsame Winkelgeometrie ist umgesetzt.
- Die geplanten Module `KosmoAsset`, `KosmoDesign` und `KosmoShop` brauchen als nächstes je eine eigene Inhalts-/Interaction-Spezifikation, bevor sie klickbar werden.
