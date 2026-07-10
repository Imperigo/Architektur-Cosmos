# Fenster-Konzept — Parametrische Fenster & Fensterband/Curtain-Wall v1 (Pfosten-Riegel als Teilung)

*(Stream A, v0.6.9 — grösster Modell-Hebel nach dem Dach. Freigegeben mit
Auflagen: CW-Multi-Segment atomar, ehrliche Benennung, Command-Validierung,
Golden-Disziplin — eingearbeitet.)*

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
additiv um zwei neue Wege: Parametrisierung einzelner Fenster und das
Fensterband/Curtain-Wall v1 auf einem Wandzug).

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

## 2 · Fensterband/Curtain-Wall v1 (Pfosten-Riegel als Teilung) auf Wandzug

Ehrliche Benennung (Auflage 2): V1 liefert ein **durchlaufendes Fensterband
mit Pfosten-Riegel-Teilung** — KEIN vollwertiges Curtain-Wall-System (keine
Passstücke, keine Eckdetails, keine Profilserien; Abschnitt 5). Abgebildet
als `Opening` mit `fensterTyp: 'fensterband'` (kein Parallelsystem, siehe
oben) — der Unterschied zum «Modul-Fenster» ist nur: die Öffnung ist (fast)
so breit wie die Wand und trägt ein durchlaufendes Pfostenraster statt
einzelner Blendrahmen.

`design.curtainWallSetzen({storeyId, richtung, pfostenraster, riegelraster?,
rahmenbreite, bruestung, sturz})`:

1. **Wandauswahl reuse**: `kantenRichtung(w.a, w.b, wandBbox)` aus
   `derive/fassadenmodule.ts` wird importiert und wiederverwendet (exakt
   dieselbe Klassierung wie `design.fensterAusModulen`), um alle `AW…`-Wände
   eines Geschosses zu finden, deren Fassadenseite `richtung` entspricht.
   `richtungsModule` wird NICHT gebraucht — die Zuweisung ist hier direkter
   Parameter, kein Zwei-Schritt-«zuweisen dann stanzen».
2. **Mehrere Wandsegmente = mehrere Openings, EIN Command-Resultat**
   (Auflage 1; ein Opening gehört zu genau einer Wand): je matchende Wand
   entsteht EIN `Opening`, ALLE Patches kommen in einem Resultat zurück —
   atomarer Undo-Schritt wie bei `design.wohnungenSegmentieren`. Je Segment:
   `sill = bruestung`, `height = Wandhöhe − bruestung − sturz`, Band von
   `CW_ECKABSTAND_MM` bis `Wandlänge − CW_ECKABSTAND_MM` (der Eckrest bleibt
   ehrlich Massivwand), `openingType: 'fenster'`,
   `fensterTyp: 'fensterband'`, `teilung: {n, m}` mit
   `n = floor(Bandbreite / pfostenraster)` (das Raster wird gleichmässig aufs
   Segment verteilt — bewusst KEIN Passstück) und
   `m = riegelraster ? max(1, floor(height / riegelraster)) : 1`,
   `rahmenbreite`.
3. **Kein Segment wird still ausgelassen** (Auflage 1): Segmente, die zu kurz
   fürs Pfostenraster sind (`n = 0`), zu niedrig (`height ≤ 0`) oder durch
   eine bestehende Öffnung belegt, werden übersprungen UND ehrlich im
   `summarize` gezählt («… — k Segment(e) ausgelassen»). Sind ALLE Segmente
   unbrauchbar oder gibt es keine passende Aussenwand, wirft der Command
   einen `CommandError` — dieselbe Ehrlichkeit wie `fensterAusModulen`.

Kein neues `settings`-Feld: das Fensterband ist wie `fensterAusModulen` ein
**einmaliger Stanz-Command** (ein Undo-Schritt), keine persistente
Fassaden-Zuweisung — die Wiederverwendung betrifft die
Richtungs-/Wandzug-Erkennung, nicht die Speicherform.

## 3 · Abbildung in Commands

- **`design.fensterParametrieren`** — `{openingId, fensterTyp, teilungN?,
  teilungM?, rahmenbreite?, swing?}` (flache Params, LLM-Tool-Konvention).
  Validierung (Auflage 3): `teilungN`/`teilungM` `int().min(1).max(12)`,
  `rahmenbreite` `int().min(20).max(200)`; Nicht-Fenster-Openings (Tür,
  Leibung) werden mit sprechendem `CommandError` abgelehnt; bei
  `fensterTyp: 'fensterband'` ist `swing` verboten (`CommandError` — ein
  Band hat keinen Öffnungsflügel), ein bestehendes `swing` wird dabei vom
  Opening entfernt. Patch: `{id, before: opening, after: {...opening,
  fensterTyp, …}}` (konditionale Spreads, `exactOptionalPropertyTypes`).
  `summarize`: z.B. «Fenster Zweiflügel 2×1 parametriert».
- **`design.curtainWallSetzen`** — Titel «Fensterband/Curtain-Wall setzen»,
  zod-Schema mit `richtung: z.enum(['sued','nord','west','ost'])`,
  `pfostenraster: z.number().int().min(300).default(1200)` (Auflage 3),
  `riegelraster: z.number().int().min(300).optional()`,
  `rahmenbreite: z.number().int().min(20).max(200).default(60)`,
  `bruestung: z.number().int().nonnegative().default(0)`,
  `sturz: z.number().int().nonnegative().default(200)`. `summarize`:
  «Fensterband Süd (Raster 1.20 m)» + ehrliche Auslassungs-Warnung
  (Abschnitt 2, Punkt 3). Wirft `CommandError`, wenn keine passende
  Aussenwand existiert oder alle Segmente unbrauchbar sind.

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
`fenster-rahmen` — der `schraffurFuer`-Katalogeintrag dazu entfällt per
Auflage (0.7.0-Kür); der Schlüssel fällt auf den bestehenden
Generik-Fallback zurück (neutral graues Poché), bricht also nichts.
Guard: Funktion liefert `[]`, wenn `fensterTyp` fehlt → alte Modelle erzeugen
exakt null zusätzliche Artefakte.

## 5 · V1-Schnitt — bewusst NICHT

V1 heisst ehrlich «Fensterband/Curtain-Wall v1 (Pfosten-Riegel als
Teilung)» — die folgenden CW-System-Leistungen werden NICHT versprochen:

- **Keine Öffnungsflügel-Simulation** (kein animiertes/interaktives Öffnen,
  kein Freiheitsgrad im Modell — der Bogen ist reines Plansymbol wie bei
  Türen).
- **Keine Beschläge** (Griffe, Bänder, Dichtungsprofile) — weder 2D noch 3D.
- **Keine Passstücke, keine Eckdetails, keine Profilserien**: das Raster wird
  gleichmässig aufs Segment verteilt (kein Passstück am Bandende), Ecken
  zweier Bänder stossen nicht aneinander (fester `CW_ECKABSTAND_MM`, der
  Eckrest bleibt Massivwand), Pfosten/Riegel sind schlanke Boxen mit
  quadratischem Denken, keine Systemprofile.
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

## 7 · Freigabe-Entscheide (Koordinator, 10.07.2026)

- Materialkatalog-Eintrag `fenster-rahmen` in `schraffurFuer`: **weggelassen**
  (0.7.0-Kür) — der Rahmenquerschnitt fällt auf den Generik-Fallback zurück.
- CW-Eckabstand bleibt bewusst simpel (kein Passstück, kein Eckdetail) —
  per Auflage ehrlich benannt statt aufgerüstet.
- Kosmo-Ein-Zug-UX (Erzeugen + Parametrieren in einem Zug): Stream F,
  nicht Teil dieses Kernel-Batches.
- CW über mehrere Wandsegmente: je Segment ein Opening, alle Patches in
  EINEM Command-Resultat (atomarer Undo) — umgesetzt, siehe Abschnitt 2.
