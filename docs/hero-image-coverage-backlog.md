# Hero-/Planetbild Coverage Backlog

Stand: 2026-05-22

## Ziel

Jeder Eintrag im Wurmloch soll mittelfristig ein eigenes, public-safe Hero-/Planetbild haben. Ein Bild darf erst öffentlich als Planetbild verwendet werden, wenn es eindeutig zum Projekt passt, eine klare Quelle hat und lizenzseitig als `public_domain`, `cc_by`, `cc_by_sa`, `cc0`, `own_work` oder `licensed` geführt werden kann.

## Aktueller Stand

- Einträge gesamt: 112
- Hero-/Planetbilder: 77
- Coverage: 68.8%
- Fehlende Hero-/Planetbilder: 35
- Doppelte Hero-URLs: 0
- Blockierte oder unklare öffentliche Lizenzen: 0
- Fehlende Attributionen: 0

## Research-Regeln

- Keine geschützten Büro-, Afasia-, Buch- oder Verlagbilder als öffentliche Planetbilder einbetten.
- Wikimedia Commons, offizielle Institutionen, Denkmalpflege-/Archivquellen und public-domain Scans sind bevorzugt.
- Bei theoretischen Texten oder Büchern sind public-domain Titelblatt, Diagramm oder historische Tafel zulässig, aber als `text/document hero` zu verstehen.
- Bei modernen Gebäuden mit unklarer Bildlage bleibt das Bildfeld leer oder privat/link-only, bis eine saubere Quelle vorliegt.
- Automatisch gefundene Kandidaten werden nie blind übernommen, wenn Ort, Projektname oder Urheber uneindeutig sind.

## Erste Commons-Recherche 2026-05-22

`npm run database:hero-images -- --limit 10` erzeugte `out/hero-image-research/commons-hero-candidates.json`.

- Sicher wirkender Kandidat: `palladio-four-books` mit Public-Domain-Scan aus `I quattro libri dell'architettura`.
- Manuell prüfen: `panopticon`; gefundene Bilder zeigen teils spätere Panopticon-Räume oder Kunstobjekte, nicht zwingend Bentham/Projektlogik.
- Nicht direkt übernehmen: `warenhaus-wertheim`; bester Treffer bezieht sich auf Stralsund und ist nicht sauber identisch mit dem Berliner Wertheim-Kontext.
- Die übrigen 7 der ersten 10 brauchen manuelle Recherche oder bessere Suchbegriffe.

## Fehlende Einträge

### Theorie, Text, Diagramm

- `vitruvius-de-architectura` - De architectura
- `city-in-layers` - City in Layers
- `palladio-four-books` - I quattro libri dell'architettura
- `marc-antoine-laugier-primitive-hut` - Primitive Hut
- `panopticon` - Panopticon
- `garden-cities-of-tomorrow` - Garden Cities of To-morrow
- `athens-charter` - Charta von Athen
- `delirious-new-york` - Delirious New York
- `s-m-l-xl` - S,M,L,XL

### Historische Stadt- und Architekturprojekte

- `kloster-st-gallen` - Kloster St. Gallen
- `sixtus-v-rome-plan` - Rom unter Sixtus V.

### Moderne und Nachkriegsmoderne

- `25b-avenue-franklin` - 25b Avenue Franklin
- `warenhaus-wertheim` - Warenhaus Wertheim
- `dom-ino-house` - Dom-Ino House
- `immeuble-rue-des-amiraux` - Immeuble Rue des Amiraux
- `voelkerbundspalast-competition` - Voelkerbundspalast Competition
- `broadacre-city` - Broadacre City
- `the-capitol` - The Capitol
- `buerogebaeude-montecatini` - Buerogebaeude Montecatini
- `unite-habitation` - Unite d'Habitation
- `new-babylon` - New Babylon
- `ibm-cosham` - IBM Cosham
- `centre-pompidou` - Centre Pompidou
- `euralille-metropole` - Euralille Metropole

### Landschaft, Reuse und zeitgenössische Projekte

- `klingenpark` - Klingenpark
- `hafeninsel-saarbruecken` - Hafeninsel Saarbruecken
- `renaturierung-der-aire` - Renaturierung der Aire
- `opfikerpark-glattpark` - Opfikerpark Glattpark
- `shipyard-park` - Shipyard Park
- `elemental-quinta-monroy` - Quinta Monroy Housing
- `rural-studio-20k-house` - 20K House
- `venice-biennale-architecture-2012` - Common Ground
- `uferpark-attisholz-sued` - Uferpark Attisholz-Sued
- `afasia-no-architecture-flower-house` - Flower House
- `alterszentrum-kloster-ingenbohl` - Alterszentrum Kloster Ingenbohl

## Nächste Arbeitsweise

1. Pro Batch maximal 5 bis 8 fehlende Einträge recherchieren.
2. Kandidaten in `out/hero-image-research` als Review Pack speichern.
3. Nur eindeutige, public-safe Kandidaten in `data/mock-entries.json` übernehmen.
4. Danach immer laufen lassen:
   - `npm run database:hero-images:audit`
   - `npm run database:planet-thumbnails:audit`
   - `npm run archive:validate`

