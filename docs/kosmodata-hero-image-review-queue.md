# KosmoData Hero Image Review Queue

Status: 2026-06-01

Diese Queue priorisiert die 33 Eintraege ohne public-safe Hero-/Planetbild.
Sie ist bewusst review-first: keine geschuetzten Bilder werden automatisch
uebernommen, keine R2-Uploads, keine Live-Datenbank-Writes.

Aktueller Audit:

- Entries: 112
- Hero images: 79 / 112
- Coverage: 70.5 %
- Duplicate hero URLs: 0
- Blocked/unknown public licenses: 0
- Missing attribution/source: 0
- Planet thumbnail floor: 70 %

## Prioritaet 1: Public-Domain-Kandidaten

Diese Eintraege sind historisch, theoretisch oder planbasiert und sollten
zuerst ueber Bibliotheken, Archive, Institutionen oder Public-Domain-Scans
geprueft werden. Nur Bilder mit klarer Quelle, Credit und Lizenz uebernehmen.

- `vitruvius-de-architectura` - De architectura
- `kloster-st-gallen` - Kloster St. Gallen
- `city-in-layers` - City in Layers
- `sixtus-v-rome-plan` - Rom unter Sixtus V.
- `marc-antoine-laugier-primitive-hut` - Primitive Hut
- `panopticon` - Panopticon
- `garden-cities-of-tomorrow` - Garden Cities of To-morrow

## Prioritaet 1: Institutionelle Quellen

Diese Eintraege brauchen zuerst offizielle Projekt-, Museums-, Archiv- oder
Bibliotheksquellen. Wenn keine klare freie Nutzung existiert, bleibt das Medium
link-only.

- `ville-radieuse` - Ville Radieuse
- `broadacre-city` - Broadacre City
- `unite-habitation` - Unite d'Habitation
- `new-babylon` - New Babylon
- `delirious-new-york` - Delirious New York
- `euralille-metropole` - Euralille Metropole
- `shipyard-park` - Shipyard Park

## Prioritaet 2: Manuelle Rechtepruefung

Diese Eintraege sind wahrscheinlich loesbar, aber nicht automatisch. Sie
brauchen manuelle Quellen- und Rechtepruefung oder eigene/generierte Medien.

- `25b-avenue-franklin` - 25b Avenue Franklin
- `immeuble-rue-des-amiraux` - Immeuble Rue des Amiraux
- `voelkerbundspalast-competition` - Voelkerbundspalast Competition
- `athens-charter` - Charta von Athen
- `the-capitol` - The Capitol
- `buerogebaeude-montecatini` - Buerogebaeude Montecatini
- `ibm-cosham` - IBM Cosham
- `centre-pompidou` - Centre Pompidou
- `klingenpark` - Klingenpark
- `hafeninsel-saarbruecken` - Hafeninsel Saarbruecken
- `renaturierung-der-aire` - Renaturierung der Aire
- `opfikerpark-glattpark` - Opfikerpark Glattpark
- `elemental-quinta-monroy` - Quinta Monroy Housing
- `rural-studio-20k-house` - 20K House
- `venice-biennale-architecture-2012` - Common Ground
- `uferpark-attisholz-sued` - Uferpark Attisholz-Sued

## Prioritaet 3: Private oder Link-only

Diese Eintraege duerfen nicht durch blind eingebettete Fremdbilder geloest
werden. Fuer die oeffentliche Website bleiben sie link-only, bis eigene,
lizenzierte oder eindeutig freigegebene Medien vorhanden sind.

- `s-m-l-xl` - S,M,L,XL
- `afasia-no-architecture-flower-house` - Flower House
- `alterszentrum-kloster-ingenbohl` - Alterszentrum Kloster Ingenbohl

## Uebernahmeregel

Ein Hero-Bild darf erst in `data/mock-entries.json` gesetzt werden, wenn alle
Punkte klar sind:

- `type: "exterior"` oder passender oeffentlicher Diagramm-/Plan-Typ;
- `url` ist stabil und oeffentlich abrufbar;
- `source_url` fuehrt zur Originalquelle oder Lizenzseite;
- `credit` nennt Institution, Autor oder Lizenzgeber;
- `license` ist nicht `unknown`, `needs_permission`, `private_research`,
  `personal_only`, `all_rights_reserved` oder `copyrighted`;
- das Bild passt nach Sichtpruefung wirklich zum Objekt.

## Naechster Pipeline-Schritt

Brain soll zuerst die 14 Prioritaet-1-Eintraege als Research-Pack vorbereiten:

1. offizielle/public-domain Quellen finden;
2. Bildkandidaten mit Lizenz notieren;
3. keine Medien automatisch uebernehmen;
4. Review-Pack speichern;
5. erst nach menschlicher Freigabe in `data/mock-entries.json` promoten.
