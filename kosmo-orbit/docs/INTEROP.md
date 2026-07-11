# INTEROP — die ehrliche Rhino/Revit/Grasshopper-Brücke

> Stand 11.07.2026. v0.7.0 Welle 6 (Stream 6A, «BIM-Export-Härtung +
> Interop-Doku»). Owner-Entscheid (V070-KONZEPT E5-vi): Finchs Werbeversprechen
> *«Go from approved design to coordinated, ready-to-deliver geometry … exports
> it directly to your traditional BIM tools … Seamless workflow with Rhino,
> Revit, Grasshopper»* wird **nicht nachgebaut** — stattdessen wird die
> tatsächlich vorhandene **IFC/DXF-Brücke gehärtet und ehrlich dokumentiert**.
> Enterprise/SSO/Teams (Finchs sechster Katalogpunkt) bleibt bewusst aussen
> vor — Begründung in `docs/RE-FINCH.md` §8.
>
> Dieses Dokument ist der **Finch-fokussierte Ergänzungsband** zum bereits
> bestehenden, breiteren `docs/INTEROP-KONZEPT.md` (ArchiCAD-Schwerpunkt,
> Owner-Auftrag V1.6 Block G, deckt zusätzlich AutoCAD/Vectorworks/Blender/
> Cinema4D/Photoshop/InDesign/Illustrator ab). Wo sich beide Dokumente
> überschneiden (DXF/IFC-Kern, Verlust-Prinzipien), wird hier nicht
> wiederholt, sondern verwiesen. Neu und NUR hier: (a) der Befund, dass der
> Kernel **zwei unabhängige, nicht austauschbare DXF-Exporter** besitzt — für
> die Rhino/Revit/Grasshopper-Frage entscheidend, weil sie nicht dasselbe
> Verlustprofil haben; (b) die konkreten Schritt-für-Schritt-Wege für exakt
> die drei Finch-Werkzeuge; (c) die Testbeweise aus
> `packages/kosmo-kernel/test/interop-dxf-roundtrip.test.ts` und
> `test/interop-ifc-haertung.test.ts` (v0.7.0 6A).

---

## 0 · Ehrlichkeitsrahmen

Jede Aussage unten ist entweder **[Code-Beleg]** (Datei/Zeile/Test genannt)
oder **[Testbeweis]** (die neuen Roundtrip-/Härtungstests dieses Streams).
Nichts ist Marketing-Behauptung. Wo ein Weg fehlt, steht das hier — nicht nur
in einer Lückenliste am Ende.

---

## 1 · Der wichtigste Befund: zwei DXF-Exporter, zwei Verlustprofile

Der Kernel exportiert DXF auf **zwei unabhängigen Codepfaden**, die je einem
UI-Knopf zugeordnet sind. Das ist in keinem bisherigen Dokument
zusammengeführt — hier zum ersten Mal explizit, weil es für «welches DXF gebe
ich Rhino/Grasshopper» entscheidend ist:

| | **Design-Modul-DXF** («V1.6 Block G») | **Publish-Modul-DXF** («Q30») |
|---|---|---|
| Quelltext | `packages/kosmo-kernel/src/dxf/export.ts` (`planToDxf`/`planGraphicToDxf`) | `packages/kosmo-kernel/src/derive/dxf.ts` (`exportDxf`) |
| App-Knopf | KosmoDesign, «DXF» (`apps/kosmo-orbit/src/modules/design/export-plan.ts:67`) | KosmoPublish, «DXF» (`apps/kosmo-orbit/src/modules/publish/PublishWorkspace.tsx:316`) |
| Bibliothek | eigener SPF-artiger Writer, keine Fremdbibliothek | `@tarikjabiri/dxf` |
| Format | AutoCAD R12 (AC1009) | R2018 (Bibliotheksdefault) |
| y-Konvention | **gespiegelt** (`dxfY = -weltY`, «Norden oben wie am Schirm») | **nicht gespiegelt** (Weltkoordinaten direkt) |
| Assoziative Bemassungsketten (`derive/dimensions.ts`) | **NEIN** — `derivePlan()` ruft `deriveDimensions()` nie auf; `PlanGraphic` trägt nie Klasse `'bemassung'` [Code-Beleg: kein Treffer in `derive/plan.ts`] | **JA** — zeichnet Ketten+Ticks+Text auf Layer `KOSMO-BEMASSUNG` |
| Rückweg (Import/Roundtrip) | **JA** — `packages/kosmo-kernel/src/dxf/import.ts` (`parseDxf`), geometrisch identisch bis ±0.001 mm [Testbeweis: `interop-dxf-roundtrip.test.ts`] | **NEIN** — kein Parser existiert für diesen Pfad |
| Geprüft gegen | ezdxf (0 Fehler, ROADMAP 204) + eigener Roundtrip-Test (neu, 6A) | ezdxf (0 Fehler, ROADMAP 11, historisch, vor Block G) |

**Konsequenz fürs Büro:** Für Rhino/Grasshopper/AutoCAD/Vectorworks — jeden
Fall, in dem eine Datei später wieder eingelesen, mit dem Architektenplan
verglichen oder in einem Round-Trip-Workflow verwendet wird — ist **das
Design-Modul-DXF der richtige Weg** (roundtrip-bewiesen, y-Konvention
dokumentiert). Das Publish-Modul-DXF ist ein **Einbahnstrasse-Export** fürs
fertige, bemasste Planblatt (z.B. als CAD-Unterlage fürs Ausdrucken/Archivieren
beim Unternehmer) — es trägt echte Maßketten, aber niemand im Kernel liest es
je zurück, und die y-Achse ist NICHT gespiegelt wie beim anderen Pfad. **Wer
beide Exporte im selben Projekt mischt, muss die unterschiedliche
y-Konvention von Hand beachten** — das ist kein Bug, aber eine reale
Stolperfalle, die hier zum ersten Mal benannt ist.

---

## 2 · Rhino

**Weg 1 — 2D-Werkplan-Import (DXF, Design-Modul):**

1. KosmoDesign → Geschoss wählen → «DXF» exportieren
   (`planToDxf`/`export-plan.ts:67`).
2. In Rhino: `Import` → DXF R12 (AC1009) wählen, Einheit **Millimeter**
   (`$INSUNITS=4`).
3. Ankommt: Wand-Poché als geschlossene `POLYLINE` (inkl. echter
   geometrischer **Lücken/Notches an Fenster- und Türöffnungen** — kein reines
   Symbol, sondern eine ausgeschnittene Kontur [Testbeweis:
   `interop-dxf-roundtrip.test.ts`, «Fenster UND Tür erzeugen echte
   geometrische Lücken»]), Fenster-/Tür-Symbole, Rasterachsen und Texte, alles
   auf **semantischen Layern** (TRAGEND/DAEMMUNG/FENSTER/TUEREN/TREPPE/
   ACHSEN/TEXT/…). y ist gespiegelt («Norden oben»).
4. Geht **nicht** mit: assoziative Bemassungsketten (Massketten sind bei
   diesem Export nicht Teil der Geometrie — s. Abschnitt 1), Bauteil-Identität
   (Rhino sieht Kurven/Polylinien, keine «Wand»-Objekte), Mehrschicht-Aufbau
   (nur die geometrische Poché, kein Materialaufbau als Attribut).
5. Rückweg: eine in Rhino bearbeitete/kommentierte DXF-Datei lässt sich mit
   `parseDxf` wieder einlesen (`unternehmerplan.ts`-Overlay-Pfad, siehe
   `docs/INTEROP-KONZEPT.md` §2b) — als Referenz-Overlay + Diff-Karten, nicht
   als automatische Übernahme.

**Weg 2 — BIM-Geometrie (IFC, via VisualARQ oder IFC-Plugins):**

1. KosmoDesign → «IFC» exportieren (`exportIfc`, `packages/kosmo-kernel/src/ifc/export.ts`).
2. Rhino hat **kein natives IFC** — der Weg läuft über ein IFC-Plugin
   (z.B. VisualARQ, oder die IFC-Import/Export-Erweiterungen von
   McNeel/Drittanbietern; kein Code-Bezug im Kernel, da das ausserhalb von
   KosmoOrbit liegt).
3. Ankommt: `IFCWALL` (SweptSolid inkl. `IFCOPENINGELEMENT`-Voids für
   Fenster/Türen — **ehrlich, kein `IFCWINDOW`/`IFCDOOR`**, s. Abschnitt 4),
   `IFCSLAB`, `IFCCOLUMN`/`IFCBEAM`, `IFCSPACE` (Zonen mit SIA-Klasse im
   Namen), `IFCFURNISHINGELEMENT`, FreeMesh als wasserdichter
   `IFCFACETEDBREP`.
4. Geht **nicht** mit: voller Mehrschicht-Wandaufbau (nur die tragende
   Kernschicht als `IFCRELASSOCIATESMATERIAL`, s. `docs/INTEROP-KONZEPT.md`
   Verlust-Matrix Zeile 1), keine parametrischen Fenster/Türen als eigene
   IFC-Klasse (bleiben Voids).
5. `rhino3dm`/`.3dm` bleibt bewusst **nie** ein natives Kernel-Format (Grep
   über das Repo negativ, wie bereits in `docs/INTEROP-KONZEPT.md` §4
   festgehalten) — Lock-in-Vermeidung, kein Versehen.

---

## 3 · Revit

**Weg — IFC-Link (Koordination, KEINE nativen Revit-Familien):**

1. KosmoDesign → «IFC» exportieren (`exportIfc`).
2. In Revit: `Insert` → `Link IFC` (oder `Manage Links`) — **nicht** «Import
   Family». KosmoOrbit erzeugt keine `.rfa`-Familien und keinen
   Revit-Kategorien-Baum; der IFC-Link bleibt ein **Koordinations-Modell**
   (Sichten/Clash-Detection/Referenz), kein editierbares natives Revit-Bauteil.
3. Ankommt: derselbe IFC4-Baustein-Satz wie bei Rhino/VisualARQ (Wände,
   Decken, Stützen/Unterzüge, Zonen, Möbel, FreeMesh) — Revit ordnet IFC-Typen
   beim Link eigenen Kategorien zu (Standard-IFC-Mapping der Revit-Version),
   nicht KosmoOrbit-Code.
4. **Ehrlich, explizit (Finch behauptet «Export BIM→Revit mit Familien je
   Objekt inkl. Möbel-Familien», `docs/RE-FINCH.md` §2.6 — das bauen wir
   NICHT nach):**
   - **Kein** `.rvt`-Export.
   - **Keine** Revit-Familien (`.rfa`) — weder für Wände/Fenster/Türen noch
     für Möbel.
   - **Kein** natives parametrisches Revit-Bauteil entsteht aus einem
     KosmoOrbit-Fenster — es bleibt in Revit ein generisches IFC-Element mit
     Void-Geometrie, keine `Wall`-Family-Instanz mit Revit-Parametern.
   - Grund: ein Revit-Familien-Nachbau wäre entweder oberflächlich (leere
     Hülle ohne echte Revit-Parametrik) oder ein monatelanges eigenes
     Familien-Ökosystem — beides widerspricht dem Owner-Mandat «Ehrlichkeit
     vor Politur» mehr, als ehrlich bei IFC-Koordination zu bleiben.
5. Rückweg (Revit → KosmoOrbit): über `derive/bestand.ts`
   (`erkenneWand`/`erkenneDecke`) — aus einem importierten IFC werden
   quaderartige Elemente zu editierbaren `Wall`-/`Slab`-Entities, alles andere
   bleibt nicht wählbarer Kontext-Layer (identisch zum ArchiCAD-Rückweg,
   `docs/INTEROP-KONZEPT.md` §2b — der Kernel unterscheidet die
   IFC-Herkunft nicht, das Verfahren ist toolunabhängig).

---

## 4 · Grasshopper

**Weg — DXF/IFC über Plugins, KEIN Live-Node-Endpunkt:**

1. Grasshopper hat kein eigenes Dateiformat (Node-Graph-Werkzeug) — der
   Austausch läuft über einen `GH`-Node, der DXF oder IFC liest/schreibt
   (Drittanbieter-Plugin, z.B. Elefront/Human/eigene IFC-Reader-Komponenten;
   kein Code-Bezug im Kernel).
2. DXF-Weg: identisch zu Rhino Weg 1 (Abschnitt 2) — Geometrie-Import als
   Kurven/Polylinien pro Layer, kein Bauteil-Objekt.
3. IFC-Weg: identisch zu Rhino Weg 2 — Baumassen/Bauteile als B-Rep/Solid,
   FreeMesh als geschlossener B-Rep direkt lesbar (`IFCFACETEDBREP`,
   Dreiecks-Faces, [Code-Beleg: `ifc/export.ts` Kommentar «FreeMesh als
   IFCFACETEDBREP»]).
4. **Ehrlich, explizit — bewusster Nicht-Bau** (bereits in
   `docs/INTEROP-KONZEPT.md` §4 als «Grasshopper — bewusst anders»
   festgehalten, hier bestätigt): Es gibt **keinen** KosmoOrbit-Endpunkt, den
   ein Grasshopper-Skript live/parametrisch füttert oder abfragt — kein
   Node-Graph-Draht zu Kosmo-Commands. Der Kosmo-**Command**-Weg
   (`packages/kosmo-kernel/src/commands/`) ist die parametrische Schnittstelle
   des Kernels, nicht ein Grasshopper-Kanal dorthin. Ein «Finch-artiger»
   Live-GH-Draht bleibt ein offener Forschungsposten, kein Batch dieses
   Streams.

---

## 5 · Das `.kosmo`-Paket als Quellformat

Für den Fall, in dem **kein** Formatwechsel nötig ist (Projektübergabe
zwischen KosmoOrbit-Arbeitsplätzen im selben Büro, oder Weitergabe an ein
zweites Büro mit KosmoOrbit): das `.kosmo`-Paket
(`apps/kosmo-orbit/src/state/project-io.ts`) ist ein Zip mit
`model/model.json` (das volle `KosmoDoc`) + `memory/journal.jsonl`
(Undo-/Lern-Journal). Das ist **kein** Interop-Format im Sinne dieses
Dokuments (kein Fremdprogramm liest es), sondern die **verlustfreie
Quelle**, aus der IFC/DXF/GLB/SVG/PDF jeweils *abgeleitet* werden
(«Derive statt Ebenen», dieselbe Architektur-Regel wie überall im Kernel).
Jeder Rhino/Revit/Grasshopper-Export dieses Dokuments ist ein **Extrakt**
aus dem `.kosmo`-Paket, nie umgekehrt — das Paket selbst bleibt die einzige
Quelle, die wirklich nichts verliert (Yjs-Sync deckt die Team-Kollaboration
am selben Paket ab, s. `docs/RE-FINCH.md` §8c).

---

## 6 · Bekannte Verluste (Zusammenfassung)

Aggregiert aus den neuen Testbeweisen dieses Streams
(`interop-dxf-roundtrip.test.ts`, `interop-ifc-haertung.test.ts`) und den
Code-Belegen oben. Für die ArchiCAD-spezifische, ausführlichere Verlust-Matrix
siehe `docs/INTEROP-KONZEPT.md` §3 — hier nur, was für die
Rhino/Revit/Grasshopper-Frage zusätzlich oder anders liegt:

| # | Verlust | Betrifft | Beleg |
|---|---|---|---|
| 1 | Assoziative Bemassungsketten fehlen im roundtrip-fähigen DXF-Pfad (Design-Modul) | Rhino, Grasshopper (DXF-Weg) | Code-Audit `derive/plan.ts` (kein `deriveDimensions`-Aufruf) + Test «ehrlich belegte Grenze» in `interop-dxf-roundtrip.test.ts` |
| 2 | Zwei DXF-Exporter mit unterschiedlicher y-Konvention, nur einer roundtrip-geprüft | Rhino, Grasshopper, AutoCAD (wer beide Knöpfe nutzt) | Abschnitt 1 dieses Dokuments |
| 3 | Kein `.rvt`-Export, keine Revit-Familien (auch nicht für Fenster/Türen/Möbel) | Revit | Abschnitt 3, explizit gegen `docs/RE-FINCH.md` §2.6 abgegrenzt |
| 4 | Kein natives IFC im Kernel-Code für Rhino (läuft über Drittanbieter-Plugin) | Rhino | Abschnitt 2, Weg 2 |
| 5 | Kein Live-Node-Endpunkt für Grasshopper (nur Datei-Import/-Export) | Grasshopper | Abschnitt 4, `docs/INTEROP-KONZEPT.md` §4 |
| 6 | Parametrische Fenster/Türen bleiben in IFC `IFCOPENINGELEMENT` (Void), nie `IFCWINDOW`/`IFCDOOR` | Rhino, Revit, Grasshopper (IFC-Weg) | `ifc/export.ts`, unverändert seit 0.6.9, re-belegt in `interop-ifc-haertung.test.ts` |
| 7 | IFC bildet nur die tragende Kernschicht ab, kein `IFCMATERIALLAYERSET` | Rhino, Revit, Grasshopper (IFC-Weg) | identisch zu `docs/INTEROP-KONZEPT.md` Verlust-Matrix Zeile 1 (dort ausführlich, Batch G1) |

**Was NICHT verloren geht (belegt, nicht nur behauptet):** Wand-Poché-Geometrie
inkl. echter Fenster-/Tür-Notches übersteht den Design-Modul-DXF-Roundtrip
Punkt für Punkt (±0.001 mm); IFC ist referenz-konsistent (jede GlobalId
eindeutig, jede `IFCRELCONTAINEDINSPATIALSTRUCTURE` zeigt auf ein echtes
Geschoss, jedes Bauteil hängt im Spatial-Tree) — beides jetzt automatisiert
geprüft, nicht nur einmalig von Hand (ifcopenshell/ezdxf) verifiziert.

---

## 7 · Testbeweise dieses Streams

- `packages/kosmo-kernel/test/interop-dxf-roundtrip.test.ts` — Testhaus
  (Wände + parametrisches Zweiflügel-Fenster + Tür) → `planToDxf` → `parseDxf`:
  Poché-Ringe (inkl. Öffnungs-Notches) geometrisch identisch (±0.001 mm),
  Wandachsen-Länge in Toleranz (an einer gehrungsfreien Einzelwand exakt
  geprüft), Öffnungs-Symbole korrekt positioniert, sauberer Import-Bericht,
  und die explizite Grenze «Bemassungs-Einstellung wirkt NICHT auf diesen
  Pfad».
- `packages/kosmo-kernel/test/interop-ifc-haertung.test.ts` — GUID-
  Eindeutigkeit, Referenz-Integrität (`IFCRELCONTAINEDINSPATIALSTRUCTURE`
  zeigt immer auf ein echtes Geschoss), lückenloser Spatial-Tree (jedes
  Wand-/Decken-/Stützen-/Unterzugs-/Space-/Proxy-/Möbel-Element hängt in
  genau einer Containment-Relation), Void-Wand-Referenzkonsistenz, der
  weiterhin ehrliche V1-Stand (kein `IFCWINDOW`/`IFCDOOR`), plus ein
  normalisierter (Zeitstempel/GUID-neutraler) Fixture-Vergleich gegen
  `test/golden/interop-referenz-normalisiert.ifc`.

Beide Testdateien sind reine Ergänzungen (additiv) — kein bestehendes
Export-Verhalten wurde für diese Härtung verändert; die Kernel-Suite ist von
661 auf 677 Tests gewachsen (nur additiv).
