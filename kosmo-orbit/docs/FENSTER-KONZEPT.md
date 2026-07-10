# Fenster-Konzept — Parametrische Fenster & Curtain-Wall v1

*(Stream A, v0.6.9 — grösster Modell-Hebel nach dem Dach)*

## 0 · Ausgangslage (Bestand, geprüft)

Ein Fenster ist heute eine `Opening` (`model/entities.ts`) — eine reine
Lochung in einer `Wall`: `wallId`, `center`/`width`/`height`/`sill` (mm),
`openingType: 'fenster' | 'tuer' | 'leibung'`, optional `swing`
(«Anschlagrichtung für Türsymbol»), `anschlag` (Blockanschlag-Tiefe, B4),
`typeId`. Alle drei Ableitungen lesen dieselbe Geometrie-Quelle
(`geometry/wall.ts:openingRects`):

- **Plan** (`derive/plan.ts`): schneidet die Wandschichten mit einem Streifen
  (`openingStrip`) und zeichnet darüber ein Symbol — Fenster = zwei feine
  Parallellinien in Wandmitte (Glasebene) + Leibungslinien; Werkplan ergänzt
  den Blockanschlag. Türen bekommen Flügel + Schwenkbogen aus `swing`.
- **Schnitt** (`derive/section.ts`): schneidet **das fertige 3D-Mesh** — es
  gibt keinen eigenen Fenster-Codepfad. Sturz/Brüstung entstehen automatisch,
  weil `extrudeWallWithOpenings` das Loch bereits als echtes Loch im
  Wandkörper extrudiert.
- **3D** (`derive/scene.ts`): `deriveWall` extrudiert die Wand MIT den
  Öffnungs-Löchern (`openingRects` → `rects` → `extrudeWallWithOpenings`).
  Es gibt **keine eigene Geometrie fürs Fenster selbst** — nur das Loch.

Zwei Fassaden-Systeme existieren bereits, unabhängig vom Opening-Modell:

1. **Modul-Editor** (`FassadenModul`, `settings.fassadenModule`): ein
   Katalog-Raster (b×h) mit `ModulElement[]` (`typ: 'fenster' | 'paneel'`),
   je Fassadenkante zuweisbar entweder über einen `MassBody`
   (`design.fassadenModulZuweisen` mit `kante`) oder — seit H-35, v0.6.8 —
   direkt über einen echten Wandzug via `settings.wandFassadenModule`
   (`{storeyId, richtung, modul}`). `design.fensterAusModulen` stanzt daraus
   echte `Opening`-Entitäten in alle Aussenwände (`AW…`-Aufbau) eines
   Geschosses.
2. **Richtungs-Ableitung** (`derive/fassadenmodule.ts`): `kantenRichtung(a,b,bbox)`
   klassiert eine Kante (Wand ODER `MassBody`-Kante) relativ zu ihrer Bbox als
   `sued|nord|west|ost` (Nord = +y); `richtungsModule(doc, storeyId)` sammelt
   Zuweisungen aus **beiden** Quellen (MassBody-Kante UND `wandFassadenModule`)
   in eine `Map<Fassadenrichtung, string>`. Das ist die einzige
   Wandzug-Richtungslogik im Kernel — sie wird hier **wiederverwendet**, nicht
   neu gebaut.

Fenster-Erzeugung aus Modulen bleibt unverändert bestehen (V1 ergänzt sie nur
additiv um zwei neue Wege: Parametrisierung einzelner Fenster und
Curtain-Wall auf einem Wandzug).

## 1 · Parametermodell Fenster (additiv auf `Opening`)

Neue **optionale** Felder auf `Opening` — fehlen sie, verhält sich alles
byte-identisch zum heutigen Stand (kein Migrationsschritt, `fromJSON` liest
Entities ohnehin ungeprüft aus dem JSON, siehe `KosmoDoc.fromJSON`):

```ts
export interface Opening extends Base {
  // … bestehende Felder unverändert …
  /** Fenstertyp (v0.6.9, Stream A): fehlt = Alt-Fenster (heutiges
   * Zweilinien-Symbol, keine Teilung, kein Flügelbogen). */
  fensterTyp?: 'einfluegel' | 'zweifluegel' | 'fest' | 'fensterband';
  /** Feldteilung n (horizontal) × m (vertikal) — Flügel/Riegel-Raster.
   * Nur wirksam, wenn fensterTyp gesetzt ist. */
  teilung?: { n: number; m: number };
  /** Rahmen-/Pfostenbreite in mm (Blendrahmen bzw. CW-Profil). */
  rahmenbreite?: Mm;
}
```

`swing` wird **wiederverwendet**, nicht dupliziert: sein Kommentar wird von
«für Türsymbol» auf «für Tür- ODER Fensterflügel» geweitet — bei
`fensterTyp: 'einfluegel' | 'zweifluegel'` steuert er, auf welcher Seite der
Öffnungsbogen ansetzt (SIA-Konvention: Fensterflügel dünner/gestrichelter
Viertelkreis statt der vollen Türlinie). `fest` und `fensterband` ignorieren
`swing` (kein Flügel, keine Öffnungsrichtung).

**Warum auf `Opening` statt ein Parallel-Objekt:** jede bestehende Ableitung
(Plan-Poché-Schnitt, Bemassungsketten `derive/dimensions.ts`, IFC-Export,
DXF-Export, `derive/mengen.ts`-Mengenauszug) hängt an `openingRects` bzw.
direkt an `Opening`. Ein zweites Fenster-Objekt würde jeden dieser Pfade
verdoppeln müssen — genau das Parallelsystem, das vermieden werden soll.

## 2 · Curtain-Wall als Fassadentyp auf Wandzug

Eine Pfosten-Riegel-Fassade ist **kein Loch in einer massiven Wand**, sondern
eine durchlaufende Verglasung über einen ganzen Wandzug. V1 bildet sie
trotzdem als `Opening` mit `fensterTyp: 'fensterband'` ab (kein
Parallelsystem, siehe oben) — der Unterschied zum «Modul-Fenster» ist nur:
die Öffnung ist (fast) so breit wie die Wand und trägt ein durchlaufendes
Pfostenraster statt einzelner Blendrahmen.

`design.curtainWallSetzen({storeyId, richtung, pfostenraster, riegelraster?,
rahmenbreite, bruestung, sturz})`:

1. **Wandauswahl reuse**: exakt dieselbe Klassierung wie
   `design.fensterAusModulen` — `richtungsModule`/`kantenRichtung` werden
   NICHT gebraucht (die Zuweisung ist hier direkt Parameter, kein
   Zwei-Schritt-«zuweisen dann stanzen»), aber `kantenRichtung(w.a, w.b,
   wandBbox)` **wird importiert und wiederverwendet**, um alle `AW…`-Wände
   eines Geschosses zu finden, deren Fassadenseite `richtung` entspricht.
2. Je matchende Wand: EIN `Opening` mit `sill = bruestung`,
   `height = geschosshöhe − bruestung − sturz`, `width` = Wandlänge minus
   Eckabstand (dieselbe «Eckenregel»-Idee wie beim Modul-Editor: Vorfabrikation
   beginnt an der Ecke, der Rest bleibt ehrlich Passstück — hier vereinfacht:
   Restbreite bleibt ungedeckt Massivwand, keine Passstück-Buchhaltung wie im
   Modulsystem, das ist V1-Schnitt), `openingType: 'fenster'`,
   `fensterTyp: 'fensterband'`, `teilung: {n, m}` aus
   `pfostenraster`/`riegelraster` (Spalten = `floor(width / pfostenraster)`,
   Zeilen = `riegelraster` gesetzt ? `floor(height / riegelraster)` : 1),
   `rahmenbreite`.
3. Bestehende Öffnungen im Weg (wie bei `fensterAusModulen`) blockieren —
   dieselbe Belegungslogik (`belegt`-Intervalle) wird als kleine gemeinsame
   Hilfsfunktion aus `fensterAusModulen` herausgezogen (`freieIntervalle`
   o.ä.), damit kein Code verdoppelt wird.

Kein neues `settings`-Feld: Curtain-Wall ist wie `fensterAusModulen` ein
**einmaliger Stanz-Command** (ein Undo-Schritt), keine persistente
Fassaden-Zuweisung — die Wiederverwendung betrifft die
Richtungs-/Wandzug-Erkennung, nicht die Speicherform.

## 3 · Abbildung in Commands

- **`design.fensterParametrieren`** — `{openingId, fensterTyp, teilung?,
  rahmenbreite?, swing?}`. Lädt die bestehende `Opening` (`require<Opening>`),
  wirft `CommandError`, wenn `openingType !== 'fenster'` (Türen bleiben
  Türen). Patch: `{id, before: opening, after: {...opening, fensterTyp, …}}`
  (konditionale Spreads, `exactOptionalPropertyTypes`). `summarize`: z.B.
  «Fenster 2×1 Zweiflügel parametriert».
- **`design.curtainWallSetzen`** — Signatur wie oben, zod-Schema mit
  `richtung: z.enum(['sued','nord','west','ost'])`,
  `pfostenraster: z.number().int().positive().default(1200)`,
  `riegelraster: z.number().int().positive().optional()`,
  `rahmenbreite: z.number().int().positive().default(60)`,
  `bruestung: z.number().int().nonnegative().default(0)`,
  `sturz: z.number().int().nonnegative().default(200)`. `summarize`: «CW
  Süd-Fassade, Raster 1.2m». Wirft `CommandError`, wenn keine passende
  Aussenwand existiert (gleiche Ehrlichkeit wie `fensterAusModulen`).

Beide Commands sind additiv in `commands/design.ts`, nutzen die bestehenden
Helfer `added`/`require`/`newId`/`CommandError` und importieren
`kantenRichtung`/`boundingBox` aus `derive/fassadenmodule.ts` (bereits
importiert für `fensterAusModulen`).

## 4 · Abbildung in Derive

**`derive/plan.ts`** (im bestehenden `if (o.openingType === 'fenster')`-Ast,
zusätzliche Verzweigung NUR wenn `o.fensterTyp` gesetzt ist — sonst exakt der
heutige Zwei-Linien-Code):
- `einfluegel`/`zweifluegel`/`fest`: Rahmenlinien an den `teilung`-Bruchstellen
  quer zur Wand (dünne Linien zwischen den zwei Glaslinien, analog zu den
  Leibungslinien, aber innerhalb der Öffnung); bei `einfluegel`/`zweifluegel`
  UND gesetztem `swing` ein **Viertelkreis-Öffnungssymbol** (SIA: dünn/gepunktet,
  eigene Klasse `fenster-bogen` statt `tuer-bogen`, damit Stiftstärke/Strich
  in `plansvg.ts` unterschieden werden kann).
- `fensterband`: die zwei Glaslinien laufen wie bisher durch — zusätzlich
  kurze Querstriche (Pfosten) an den `teilung.n`-Rasterpunkten zwischen den
  Glaslinien = «durchgehendes Doppellinien-Band mit Pfostentakt».

**`derive/section.ts`**: bleibt UNVERÄNDERT (Sturz/Brüstung sind bereits
eine Funktion der Lochgeometrie im Mesh — kein neuer Code nötig). Was NEU
dazukommt, ist zusätzliche Geometrie, die von `scene.ts` in die Szene
gespeist wird (siehe unten) — `section.ts` schneidet sie automatisch mit,
weil es generisch über `deriveAll(doc)` iteriert.

**`derive/scene.ts`**: `deriveAll` bekommt einen neuen, gekapselten Zweig:
für jede `Opening` mit `openingType === 'fenster'` UND gesetztem `fensterTyp`
wird zusätzlich zur (unveränderten) Wand-mit-Loch-Extrusion ein kleines
Set eigener `GeometryArtifact`s erzeugt (`deriveFensterRahmen`, neue
Funktion, nutzt das vorhandene `extrudePolygon` aus `derive/mesh.ts`):
Rahmen-Umlauf als 4 schlanke Boxen (Breite `rahmenbreite`, Tiefe = halbe
Wanddicke) plus, je nach `teilung`, vertikale/horizontale Sprossen-Boxen. CW
(`fensterband`) unterscheidet sich nur graduell: mehr Sprossen (aus
`pfostenraster`/`riegelraster`), kein «Flügel»-Absatz. Materialschlüssel
`fenster-rahmen` (neuer, kleiner Eintrag im `schraffurFuer`-Katalog,
Metall-Tönung) — fällt sonst auf den bestehenden Generik-Fallback zurück,
bricht also nichts, falls der Katalogeintrag in Phase 2 doch entfällt.
Guard: Funktion liefert `[]`, wenn `fensterTyp` fehlt → alte Modelle erzeugen
exakt null zusätzliche Artefakte.

## 5 · V1-Schnitt — bewusst NICHT

- **Keine Öffnungsflügel-Simulation** (kein animiertes/interaktives Öffnen,
  kein Freiheitsgrad im Modell — der Bogen ist reines Plansymbol wie bei
  Türen).
- **Keine Beschläge** (Griffe, Bänder, Dichtungsprofile) — weder 2D noch 3D.
- **Keine Passstück-Buchhaltung** für Curtain-Wall-Restbreiten (anders als
  der Modul-Editor); der Rest am Wandende bleibt ungedeckt (ehrlich, aber
  ohne eigene Meldung — Konzept-Entscheid, kein Bug).
- **`derive/mengen.ts`** bleibt unverändert: zählt weiter nach `openingType`
  (`fenster`/`tuer`), nicht nach `fensterTyp` — ein CW-Fensterband ist dort
  weiterhin schlicht «ein Fenster». Eine Typ-Aufschlüsselung ist ein
  plausibler V2-Nachtrag, kein V1-Muss.
- **IFC-Export** (`ifc/export.ts`): Fenster/Türen werden schon heute nur als
  `IFCOPENINGELEMENT` (Void) exportiert, nicht als `IFCWINDOW`/`IFCDOOR` mit
  eigener Geometrie — daran ändert sich in V1 nichts. Die neuen Felder
  (`fensterTyp`, `teilung`, `rahmenbreite`) fliessen NICHT in den
  IFC-Export ein; das Loch bleibt exakt das, was `openingRects` liefert
  (unverändert). Ehrlich benannt: ein IFC-Konsument sieht in V1 nur die
  Lochgeometrie, keinen Pfosten/Rahmen — das ist der bestehende Zustand,
  nicht neu verschlechtert.
- **DXF-Export** (`derive/dxf.ts`): liest generisch `plan.lines`/`plan.arcs`
  — die neuen Plan-Symbole (Sprossen, Öffnungsbogen, CW-Pfostentakt)
  erscheinen dort automatisch, sobald Phase 2 sie in `plan.ts` erzeugt.
  Kein DXF-Code nötig.

## 6 · Golden-Strategie

**Bestehende Goldens byte-identisch**, bewiesen durch `git diff --stat` auf
`test/golden/*.svg` nach dem Bau (muss leer sein). Garantiert durch die
durchgängigen `fensterTyp`/`teilung`-Guards oben: kein bestehendes Test-Doc
setzt diese Felder, jeder neue Codepfad ist bedingt.

**Neue Goldens** (mind. 4, wie beauftragt):

1. `grundriss-fenster-zweifluegel.svg` — ein Zweiflügel-Fenster mit `swing`
   gesetzt, zeigt Sprosse (Teilungslinie) + Öffnungsbogen.
2. `grundriss-fensterband.svg` — ein per `curtainWallSetzen` gestanztes
   Fensterband über eine ganze Aussenwand, zeigt Pfostentakt im
   Doppellinien-Band.
3. `schnitt-fenster-parametrisch.svg` — Schnitt durch ein parametrisches
   Fenster, zeigt Rahmen-Querschnitt (kleine Rechtecke) an Sturz/Brüstung
   zusätzlich zur reinen Lochkontur.
4. `ansicht-curtainwall.svg` — Ansicht (Projektionsschnitt ohne Schnittkanal,
   wie das bestehende `ansicht-sued-testhaus.svg`-Muster) auf eine
   CW-Fassade, belegt das Pfosten-Riegel-Raster als Projektionslinien.

Jedes neue Golden bekommt beim Bau ein Selbstverdikt nach den 6 Kriterien
(Rendering-Validität, Canvas-Fitting, Anker-Präzision, Text-Containment,
Graph-Konsistenz, Code-Sauberkeit) im Abschlussbericht.

## 7 · Risiken / offene Fragen für die Freigabe

- Materialkatalog-Eintrag `fenster-rahmen` in `schraffurFuer` ist ein
  Nice-to-have, kein Muss — ohne ihn wirkt der Rahmenquerschnitt im Schnitt
  nur generisch grau statt metallisch getönt. Kann in Phase 2 entfallen,
  ohne den Rest zu berühren.
- `fensterband`-Eckabstand (Punkt 2, Abschnitt 2) ist bewusst simpel
  (keine Passstück-Logik) — falls das als zu grob gilt, wäre die
  Modul-Editor-Eckenregel eins zu eins wiederverwendbar, kostet aber mehr
  Code für V1.
- `design.fensterParametrieren` ändert nur bestehende `fenster`-Openings;
  ob Kosmo (LLM-Tool) daraus in EINEM Zug auch gleich erzeugen soll
  (statt `design.oeffnungSetzen` + `design.fensterParametrieren`), ist eine
  UX-Frage für Stream F (App/Kosmo-Integration), nicht Teil dieses Kernel-Batches.
