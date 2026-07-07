# Serie H — Buildplan: Vollständige Benutzersimulation (Fable, 07.07.2026)

> Orchestrierbarer Bauplan zu `docs/SERIE-H-VOLLSIMULATION.md`. Fable legt hier
> Harness, Szenarien, Journeys, KI-Simulation, Befund-Pipeline, Batches,
> Reihenfolge und Abnahme fest; Opus zerlegt 1:1 in Sonnet-Aufträge.
> **Serie H ändert keinen Kernel-Code, insbesondere kein `derive/`** — alle
> Goldens bleiben byte-identisch, weil sie gar nicht berührt werden. Serie H
> ist Test-/Harness-/Doku-Arbeit; deckt eine Journey einen echten Produktfehler
> auf, wird der als eigener **H-Fix-Batch** (mit Fable-Urteil) geführt, nie in
> einen Serie-H-Batch hineingemischt. Je Batch gilt das Owner-Mandat:
> Feature → Tests (+E2E) → ROADMAP-Eintrag (vor dem Phase-3-Marker) →
> deutscher Commit mit Trailern → Push auf den Entwicklungs-Branch.

## 0. Ist-Zustand (gelesen, verbindlich als Ausgangslage)

- **Saat grün** (ROADMAP 151): `e2e/sim-umbau.spec.ts` (Altbau Zürich-
  Aussersihl: Umbau-Status, Terrain, Aussparung, Blattfilter, Kosmo-Dossier,
  IFC-Pset) und `e2e/sim-mfh.spec.ts` (Ersatzneubau Zürich-Altstetten:
  Raumprogramm → Segmentierer+Kern → Grundriss-Generator → 2× Stapeln →
  Fluchtweg → Berechnungsliste → Kosmo-Stapeln → Themenplan → Plansatz-PDF).
  Beide sind EIN `test()` mit nummerierten Abschnitten, `test.setTimeout(180_000)`
  beim MFH. **EFH- und Hochhaus-Journeys wurden entworfen, aber nicht
  aufgenommen** — sie scheiterten an Selektor-/Timing-Feinschliff (erfundene
  bzw. fehlende Testids, fixe Pfadzahl-Assertions gegen das Schicht-Poché,
  Läufe aus falschem cwd). Die Lehren stehen in 1.4.
- **Befunde**: `docs/V1-TESTLAUF-BEFUNDE.md` — 4 gefixte Bugs (Tragstruktur
  beim Stapeln, Basis-26-Rasterlabels, Geschossleiste-Scroll, Aussparung
  anwählbar), ROADMAP 153 (Zonenregel-Grenzabstand) und 154 (Fassaden-
  Zuweisung→Fenster) nachgezogen; offene V2-Lücken: Site-/Parzellen-Zonentyp,
  Dach ohne 2D-Plansymbol, Wohnungs-Typologie grob, `grenzabstandGross`
  ungeprüft. Coverage-Lücken: RasterPanel-Querachsen ohne Testid, Checks nur
  Freitext, kein UI-Knopf für `design.deckeZeichnen`.
- **Test-Hooks**: `window.__kosmo = { run(commandId, params), state(), open(screen) }`
  (`apps/kosmo-orbit/src/App.tsx` Z. 268–275) — `state()` liefert den
  Zustand inkl. `doc.byKind(kind)`, `doc.storeysOrdered()`, `activeStoreyId`,
  `select([ids])`, `doc.settings`. `window.__kosmoViewport =
  { renderOnce, resume, setCamera, getCamera }` (`Viewport3D.tsx` Z. 1161–1180).
- **Command-Fläche** (`packages/kosmo-kernel/src/commands/`): 47 `design.*`
  (u. a. `wandZeichnen`, `deckeZeichnen`, `dachErstellen`, `treppeErstellen`,
  `stuetzeSetzen`, `unterzugZeichnen`, `stuetzenAusRaster`, `rasterSetzen`,
  `aussparungSetzen`, `renovationSetzen`, `zoneErstellen`, `waendeAusZonen`,
  `grundrissGenerieren`, `geschossKopieren`, `fassadenModulZuweisen`,
  `fensterAusModulen`, `modulSpeichern`, `moebelSetzen`, `terrainSetzen`,
  `baugrenzeSetzen`, `zonenRegelSetzen`, `raumprogrammSetzen`,
  `standortSetzen` (label, WGS84 lat/lon, LV95 e/n, `hoeheM`),
  `phaseSetzen` (`vorprojekt|bauprojekt|werkplan`), `bemassungSetzen`,
  `etikettSetzen`, `keynoteSetzen`, `themenPlanSpeichern`, `dossierSetzen`),
  16 `publish.*` (Blatt/Platzieren/Text/Bild/Set/Revision/Wolke),
  8 `vis.*` (Graph/Node/Verbinden). Jedes ist zugleich Kosmo-Tool.
- **Stationen** (`apps/kosmo-orbit/src/modules/`): design, publish, vis, data,
  asset, prepare, doc, train, dev. Umschalten im Test: `__kosmo.open('publish')`
  oder `[data-testid="module-<id>"]` auf der Zentrale.
- **Fake-Bridge** (`tools/homestation-bridge/kosmo_bridge/main.py`, Flag heisst
  exakt `--fake-worker`; das in CLAUDE.md notierte `--fake` funktioniert nur
  als argparse-Präfix — in Serie H immer ausgeschrieben starten):
  `/health`, `POST/GET /jobs`, `/jobs/{id}`, `/jobs/{id}/artifacts/{name}`,
  `POST /jobs/video-splat`, `POST /stt`, `POST /tts`, `POST /embed`.
  Fake-Verhalten: Render-Jobs → Platzhalter-PNG + `render-result.json` mit
  QA-Verdict «Fake-Worker (Demo ohne GPU)» (`method: "fake-worker"`);
  **video-splat → Status `kein-sfm-worker`** mit ehrlicher Begründung (kein
  Platzhalter-Splat!); TTS → deterministischer Prüfton-WAV (Länge folgt dem
  Text); Embeddings → `fake-trigram-64`; **STT antwortet auch im Fake-Modus
  501, wenn `faster-whisper` fehlt** (im Container der Normalfall) — die App
  zeigt dann die ehrliche Meldung «Speak-to-Kosmo braucht die Bridge …»
  (`KosmoPanel.tsx` Z. 631–656).
- **E2E-Lauf** (`playwright.config.ts`, liegt in `kosmo-orbit/`): baseURL
  `:5183`, `workers: 1` (strikt seriell), webServer = `npm run preview -w
  @kosmo/orbit-app -- --port 5183 --strictPort` (Preview-Build muss vorher
  gebaut sein), SwiftShader-Args, `PLAYWRIGHT_CHROMIUM_PATH`
  (`/opt/pw-browsers/chromium`), Screenshots nach `e2e-results/`.
- **ROADMAP-Stand**: 170 Einträge, Serie I und J abgeschlossen. Serie H ist
  die nächste Serie.

---

## 1. Simulations-Architektur (H1)

### 1.1 Neue Dateien (die einzigen gemeinsamen Nahtstellen)

| Datei | Rolle |
| --- | --- |
| `e2e/sim/szenarien.ts` | Deterministischer CH-Szenario-Datensatz je Haustyp (1.2) — reine Daten, offline, kein Netz |
| `e2e/sim/bausteine.ts` | Wiederverwendbare Journey-Bausteine (1.3) — jede Funktion agiert UND assertet |
| `docs/SIM-BEFUNDE.md` | Befund-Journal der Serie H (Abschnitt 5), Nachfolger von V1-TESTLAUF-BEFUNDE |

Journeys bleiben je **eine** Datei `e2e/sim-<typ>.spec.ts` mit **einem**
`test()` (nummerierte Abschnitte, `test.setTimeout(180_000)`), die fast nur
Bausteine aufruft — das Gegenteil der entfernten 200-Zeilen-Monolithen: kurz,
lesbar, und jede Robustheits-Lektion lebt genau einmal in `bausteine.ts`.

### 1.2 Szenario-Schema (`szenarien.ts`, verbindlich)

```ts
export interface SimSzenario {
  key: 'umbau' | 'mfh' | 'efh' | 'stadthaus' | 'blockrand' | 'hochhaus';
  titel: string;                       // «EFH Hanglage Emmental» …
  standort: { label: string; lat: number; lon: number; e: number; n: number; hoeheM: number };
  parzelle: {                          // NIE als sia:'KF'-Zone modellieren (V1-Befund:
    outline: Pt[];                     // Parzellen-Zonen verunreinigen SIA-416) —
    maxHoehe: number | null;           // IMMER design.baugrenzeSetzen (Boundary)
    grenzabstand: number | null;
  };
  zonenRegel: { name: string; az?: number; maxHoehe?: number; maxVollgeschosse?: number;
                grenzabstandKlein?: number; grenzabstandGross?: number };
  raumprogramm: { typ: string; hnfSoll: number }[];
  gestaltung: {                        // H4: der rote Faden der Journey
    leitidee: string;                  // z. B. «Hangsprung: zwei versetzte Ebenen …»
    material: string;                  // Fassade/Konstruktion in Worten
    dossier: { typ: 'do' | 'dont'; text: string }[];  // → design.dossierSetzen
  };
  geometrie: Record<string, unknown>;  // journey-spezifische Masse (Fussabdruck, Raster …)
}
export const SZENARIEN: Record<SimSzenario['key'], SimSzenario>;
```

Verbindliche Szenarien (LV95-Startwerte gerundet, Sonnet übernimmt sie so —
keine Online-Recherche, alles offline-deterministisch):

| Key | Parzellenszenario | Standort (label, e/n, hoeheM) |
| --- | --- | --- |
| umbau ✅ | Altbau-Sanierung Hohlstrasse, Zürich-Aussersihl (Parzelle AS-2231, Blockrandliegenschaft ~1910) | 2'681'800 / 1'247'800, 408 |
| mfh ✅ | Ersatzneubau Zürich-Altstetten, Regelgeschoss 30×14 m, zweibündig | 2'678'000 / 1'249'000, 400 |
| efh | Hanglage Emmental (Gemeinde Lauperswil, Zone W2, AZ 0.4, Grenzabstand klein 4 m), Hang ~15 % nach Süden | 2'622'500 / 1'198'500, 700 |
| stadthaus | Reihenhaus-Lückenschluss Länggasse Bern, Parzelle 6×18 m zwischen zwei Brandmauern, 4 Vollgeschosse | 2'599'900 / 1'200'200, 550 |
| blockrand | Blockrandschliessung Basel-Matthäus, L-förmige Ecklücke, Hofseite mit grossem Grenzabstand | 2'611'500 / 1'268'700, 260 |
| hochhaus | Punkthochhaus Zürich-West (Hardturm), Raster 8.4 m, 12+ Geschosse, Skelettbau | 2'681'300 / 1'249'500, 410 |

### 1.3 Journey-Bausteine (`bausteine.ts` — Signaturen verbindlich, jede agiert UND assertet)

Alle Funktionen nehmen `page: Page` als erstes Argument; UI-Selektoren sind
ausschliesslich **im Code verifizierte** `data-testid`s (0. Ist-Stand +
Inventar unten); wo ein Schritt kein Testid hat, läuft er über
`__kosmo.run(...)` und wird **im UI** verifiziert — nie erfundene Selektoren.

1. `projektStarten(page, szenario)` — `goto('/')`, localStorage
   `kosmo.onboarded='1'` + `kosmo.llm={provider:'mock'}` **vor** `reload()`
   (Provider wird beim App-Start gelesen — die klassische Falle), Klick
   `module-design`, `view-2d`, Assert `kennzahlen` sichtbar; dann
   `design.standortSetzen(szenario.standort)` und Assert
   `sonne-standort-label` trägt das Label.
2. `parzelleSetzen(page, szenario)` — `design.baugrenzeSetzen` +
   `design.zonenRegelSetzen`; Assert: Boundary im Doc (`byKind('boundary')`),
   und nach einem bewusst platzierten Verstoss-Probekörper melden die Checks
   die Zonenregel als Quelle (Regressions-Anker ROADMAP 153) — Probekörper
   danach per Undo/`design.loeschen` entfernen.
3. `phaseSchalten(page, phase)` — `design.phaseSetzen`; Assert
   `doc.settings.phase` UND relative Detail-Monotonie: Pfadzahl im Plan-SVG
   `werkplan ≥ bauprojekt ≥ vorprojekt` am **selben** Modellstand (nie fixe
   Zahlen — Lehre aus dem Schicht-Poché).
4. `waendeZeichnen(page, kanten, aufbauName)` — Muster sim-umbau Z. 46–62:
   Assemblies über `byKind('assembly')` nach Namen finden, `wandZeichnen`,
   IDs zurückgeben; Assert Wandanzahl-Delta exakt.
5. `dachSetzen(page, params)` — `design.dachErstellen`; Assert `byKind('roof')`
   =1 und Dach-Mesh in der 3D-Szene sichtbar (`view-quad` →
   `__kosmoViewport.renderOnce()`); **bewusst KEINE 2D-Plansymbol-Assertion**
   (bekannte V2-Lücke, in SIM-BEFUNDE referenziert, nicht «rot getestet»).
6. `treppeSetzen(page, params)` — `design.treppeErstellen`; Assert
   `byKind('stair')`-Delta + Treppensymbol im Plan-SVG (≥1 passendes Element).
7. `tragwerkAusRaster(page, raster)` — `design.rasterSetzen` +
   `design.stuetzenAusRaster` (RasterPanel-Querachsen haben kein Testid —
   Coverage-Lücke, bleibt Command-getrieben); Assert Stützenzahl = Achsen-
   Produkt und **Achslabels bijektiv** (Achse 27 = «AA», Regressions-Anker
   Befund 2) via `grid-achse`-Texte.
8. `fassade(page, module)` — `design.modulSpeichern`, `fassadenModulZuweisen`,
   `fensterAusModulen`; Assert: Öffnungszahl > 0 und Süd-/Nordwand tragen
   **unterschiedliche** Module (Regressions-Anker ROADMAP 154), über
   `byKind('wall')`-Öffnungen geprüft.
9. `grundrissFuellen(page)` / `segmentieren(page, opts)` — UI-Weg wie
   sim-mfh Z. 72–117 (`liste-toggle`, `segmentierer-kern`, `segmentierer-lauf`,
   `segmentierer-ergebnis` mit Mix-Regex, `segmentierer-uebernehmen`,
   `grundrisse-fuellen`); Assert Zonen-/Möbel-/Türen-Deltas als ≥-Schwellen.
10. `geschosseStapeln(page, n)` — n× `geschoss-stapeln`; Assert
    Geschosszahl exakt, oberstes Geschoss trägt Zonen+Möbel UND
    **Stützen/Unterzüge** mit (Regressions-Anker Befund 1), Geschossleiste
    bleibt bedienbar: `storey-<name>` des obersten Geschosses sichtbar
    (Regressions-Anker Befund 3).
11. `checksLesen(page)` — liest `[data-testid="checks"]`-Freitext, parst
    Fluchtweg-Längen (`/Fluchtweg[^\n]*?([\d]+[.,]\d)\s*m/g`) und
    Grenzabstand-/Zonenregel-Befunde; liefert strukturiert zurück (die
    Struktur-Lücke bleibt als Coverage-Befund dokumentiert).
12. `berechnungslistePruefen(page, erwartung)` — `liste-tabelle`,
    `erfuellung-<typ>`-Zellen: gebaute Typen > 0 %, geplante exakt 0 %
    (ehrliche Lücke, Muster sim-mfh Z. 177–188).
13. `kosmoFragen(page, frage, erwartung)` — `kosmo-input`/`kosmo-send`;
    zwei Modi: `quelle` (Assert `quelle-chip` + Sprungziel, Muster sim-umbau
    6a) und `vorschlag` (Assert `proposal-card`/`apply-proposal` + Doc-Delta
    per `expect.poll`, Muster sim-mfh Schritt 7). **Nur im Mock-Provider
    bewiesene Prompts verwenden** (Dossier-Frage, «Staple das Geschoss …»);
    neue Intents nur via H1b (Mock-Provider-Erweiterung mit Unit-Test in
    `packages/kosmo-ai`).
14. `renderUeberBridge(page)` — KosmoVis-Kette (Muster `visgraph.spec.ts`):
    `module-vis` → `drei-stimmungen` → `render-ausfuehren` →
    `render-bild` sichtbar (timeout 25 s) → Blatt-Node verbinden
    (`vis.verbinden` + `vis.nodeSchieben` ins Sichtfeld!) → `blatt-ablegen`
    → Assert Bild auf `byKind('sheet')`. Vorher `bridgeVerfuegbar(page)`.
15. `bridgeVerfuegbar()` — `beforeAll`-Probe: fetch `http://127.0.0.1:8600/health`
    (Node-Kontext, nicht Page); bei Fehlschlag **klarer Skip-Fehlertext**
    («Bridge :8600 mit --fake-worker starten, siehe CLAUDE.md») statt
    kryptischem Timeout mitten in der Journey.
16. `blattPublizieren(page, opts)` — `__kosmo.open('publish')`, `add-sheet`,
    `place-plan|place-section|place-axo|place-storey`, Platzierung wählen
    (`[data-testid^="placement-"]`), `auswahl-thema`/`auswahl-umbau`/
    `auswahl-massstab`; Assert `sheet-canvas`-Inhalte (Legende, Titel).
17. `exportPruefen(page, art)` — `export-ifc` | `export-set` | `export-dxf` |
    `pubset-pdf`: `Promise.all([waitForEvent('download'), click])`, Assert
    Dateiname-Muster + Grösse > Schwelle + bei IFC Inhalts-Marker
    (z. B. `Pset_KosmoUmbau`).
18. `terrainSetzen(page, profile)` — Muster sim-umbau Schritt 3 inkl. der
    Attribut-statt-Visible-Assertion für flache Profile (Bounding-Höhe 0).

### 1.4 Robustheits-Regeln (die Lehren aus den entfernten EFH-/Hochhaus-Specs — hart)

1. **Nie fixe SVG-Pfadzahlen** für geschichtete Darstellungen: das Poché
   rendert EINEN Pfad **je Materialschicht** — immer `count() > 0` bzw.
   Deltas/Monotonie, nie `toHaveCount(3)` auf Schraffur/Umbau-Flächen.
2. **Nur verifizierte Selektoren**: jedes `data-testid` im Baustein trägt
   einen Quellkommentar (Datei). Fehlt ein Testid, entscheidet der Baustein:
   Command-Weg + UI-Assert, oder (einzige erlaubte Produkt-Berührung in
   Serie H) ein **reines Attribut-Testid** im App-Code — keine Logik.
3. **Zustands-Assertions über `__kosmo.state()`** mit `expect.poll` statt
   `waitForTimeout`: Command-Wirkung landet asynchron im React-Render;
   gepollt wird das Doc, nicht das DOM — das DOM erst danach.
4. **Unsichtbar ≠ falsch**: SVG-Elemente mit Bounding-Höhe/Breite 0 (flaches
   Terrain, deckungsgleiche Linien) sind für Playwright nie «visible» —
   Attribute prüfen (`points`, `stroke-dasharray`), nicht `toBeVisible()`.
5. **Layout abwarten, dann messen**: vor `boundingBox()`/Maus-Drags erst
   `toBeVisible()` auf **beiden** Enden (visgraph-Lektion); spät erzeugte
   Nodes mit `vis.nodeSchieben` ins Sichtfeld rücken.
6. **cwd-Falle**: ALLE Läufe aus `kosmo-orbit/` (dort liegt
   `playwright.config.ts`); aus dem Repo-Root findet `npx playwright test`
   weder Config noch webServer. Opus-Harness prüft das cwd vor jedem Lauf.
7. **Helferserver**: sterben im Container zwischen Läufen → mit `setsid` als
   eigene Prozesse starten (`python3 tools/homestation-bridge/kosmo_bridge/main.py
   --fake-worker --port 8600`, `node tools/sync-server/src/server.mjs`);
   Bridge-abhängige Abschnitte laufen nur nach `bridgeVerfuegbar()`.
8. **Seriell**: `workers: 1` bleibt; Journeys einzeln startbar
   (`npx playwright test e2e/sim-efh.spec.ts`); eine Journey = ein `test()`
   mit `test.setTimeout(180_000)`.
9. **Kosmo-Antworten**: grosszügige, aber begrenzte Timeouts (15 s Muster);
   nur bewiesene Mock-Intents (1.3 / Punkt 13).
10. **Downloads** immer `Promise.all([waitForEvent('download'), click])` —
    nie click-dann-warten.

---

## 2. Haustyp-Journeys (H2)

Jede Journey: EIN `test()` aus Bausteinen, Phasengang
**Vorprojekt → Bauprojekt → Werkplan** über `phaseSchalten` (mit
Monotonie-Assert je Wechsel), mindestens eine `kosmoFragen`-Station, ein
`renderUeberBridge`-Segment (H3), ein Export als Abschluss, und **mindestens
ein Regressions-Anker** auf einen gefixten V1-Befund. Assertions prüfen
Ergebnis-Zahlen und -Darstellung, nicht Klicks.

| Journey | Spec | Kern-Toolkette (zusätzlich zum Pflichtprogramm) | Schärfste Assertions (deckt Lücken auf) |
| --- | --- | --- | --- |
| Umbau ✅ | `sim-umbau.spec.ts` | Bestand/Abbruch/Neu, Terrain gewachsen/neu, Aussparung, Blattfilter, IFC | bleibt; H1a refaktoriert auf Bausteine, Assertions unverändert |
| MFH ✅ | `sim-mfh.spec.ts` | Raumprogramm, Segmentierer+Kern, Generator, 2× Stapeln, Fluchtweg, %-Erfüllung, Themenplan | bleibt; H1a refaktoriert, Assertions unverändert |
| EFH | `sim-efh.spec.ts` | Hang-Terrain (gewachsen 15 % Süd + neu abgeflacht), Volumenstudie, Wände/Satteldach/Treppe, Möblierung, Sonne (Datum/Stunde + Standort-Label), Schnitt/Ansicht, SIA-416, Publish | Parzelle als **Boundary**, nie KF-Zone → SIA-416-NGF enthält KEINE Parzellenfläche (der V1-Fehlgriff als Assertion); Dach in 3D-Szene UND Schnitt vorhanden, 2D-Plansymbol bewusst NICHT assertet (V2-Lücke, SIM-BEFUNDE-Verweis); Treppensymbol im EG-Plan; Terrain-Profile im Schnitt (Attribut-Assertions, Regel 1.4.4) |
| Stadthaus | `sim-stadthaus.spec.ts` | 6×18-m-Lücke zwischen Brandmauern, 4 Geschosse stapeln, interne Treppe, Strassen-/Hof-Fassadenmodule + Fenster stanzen, Werkplan: `bemassungSetzen`, `etikettSetzen`/`keynoteSetzen`, Ausmass (`draw-tab-ausmass`, `ausmass-csv`), DXF | Fassaden-Anker (154): Strassen- ≠ Hofmodul an den gestanzten Fenstern; Phasen-Monotonie über alle drei Phasen am fertigen Haus; Ausmass-CSV-Download > Schwelle; Etikett am Bauteil im Plan sichtbar |
| Blockrand | `sim-blockrand.spec.ts` | L-förmige Baugrenze mit `grenzabstand` + `mehrHoehen`, Zonen → `waendeAusZonen`, Hof-/Strassenfassade, Verstoss-Probe (Wand über die Grenze) → Checks, Themenplan Brandschutz, Publikations-Set (`pubset-speichern`, `pubset-transmittal`) | Grenzabstands-Anker (153): Befundtext benennt die Zonenregel als Quelle, wenn die Boundary keinen eigenen Grenzabstand trägt; `zone-verletzt`-Markierung erscheint und verschwindet nach Korrektur; `waendeAusZonen` erzeugt exakt die Umriss-Kanten (Delta-Zählung) |
| Hochhaus | `sim-hochhaus.spec.ts` | Raster 8.4 m via `rasterSetzen` + `stuetzenAusRaster` (>26 Querachsen!), Unterzüge, Fassadenmodule N/S/W/O, 12× `geschossKopieren`, Fluchtweg, Varianten (`studie-toggle`/`varianten-matrix` falls Testid-gestützt, sonst Command), Publikations-Set | die drei Hochhaus-Anker: Stützen+Unterzüge in JEDEM gestapelten OG (Befund 1), Achse 27 = «AA» (Befund 2), Geschossleiste scrollt/oberstes Geschoss klickbar (Befund 3); Fluchtweg-Längen in Metern lesbar; Fensterstanzung seitenrichtig (154) |

Reihenfolge nach Aufdeckungswert: **EFH und Hochhaus zuerst** (Journeys sind
entworfen, ihre Härtung ist der eigentliche Auftrag), dann Stadthaus,
dann Blockrand. Spätere Typen (Gewerbe/Halle, Schulhaus) docken als weitere
`sim-<typ>.spec.ts` an — kein Harness-Umbau nötig.

---

## 3. Lokale KI / AI-Imaging mitsimuliert (H3)

Serie H fährt bewusst DURCH die Fake-Bridge und prüft **den Weg, nie die
Qualität** — und die ehrlichen Grenzen als explizite Assertions:

- **Render-Kette** (jede Journey): Baustein 14 — Prompt-Komposition
  (`kombinierer-prompt` live), Job-Status wandert (`render-status` ≠
  «bereit»), Bild am Node, «Aufs Blatt». Zusätzlich in `sim-ki-imaging.spec.ts`:
  das `render-result.json`-QA-Verdict der Fake-Bridge trägt
  `method: "fake-worker"` / Reason «Demo ohne GPU» — die Simulation
  **assertet die Ehrlichkeits-Markierung selbst**.
- **TTS**: `tts-toggle` an, Kosmo-Antwort auslösen, den `/tts`-Response
  beobachten (Playwright `page.waitForResponse('**/tts')`): 200,
  `audio/wav`, Länge > WAV-Header — der Fake-Prüfton ist deterministisch.
- **STT ehrlich**: im Container fehlt `faster-whisper` → `/stt` = 501. Die
  Journey klickt NICHT `kosmo-mic` (getUserMedia bräuchte globale
  Launch-Flags), sondern postet aus dem Node-Kontext ein Mini-Audio an
  `/stt` und assertet den **501 mit Installationshinweis**; ergänzend die
  App-Meldung «Speak-to-Kosmo braucht die Bridge …» dort, wo sie ohne
  Mikrofon erreichbar ist. Kein vorgetäuschtes Transkript.
- **Embeddings**: `/embed` liefert `model: "fake-trigram-64"` — geprüft über
  den bestehenden Wissens-Weg (`prepare/knowledge.ts`; Muster
  `kosmodata-wissen.spec.ts`), Assertion auf Modellnamen = ehrliche
  Kennzeichnung.
- **Video→Splat ehrlich**: `video-splat-start` gegen die Fake-Bridge endet in
  `video-splat-status` = **kein-sfm-worker** samt Begründungstext — exakt
  das ist die Assertion (ehrliche Grenze als Feature). Der lokale
  Splat-Werkzeugweg (Import→Crop→Decimate→Export, `splat.spec.ts`) bleibt
  eigenständig und wird NICHT dupliziert.
- **Kosmo-Chat**: läuft in jeder Journey gegen den Mock-Provider
  (`kosmo.llm = {provider:'mock'}`) — Diff-Karten, Quellensprung,
  Command-Ausführung über denselben `runCommand`-Weg.

**Nicht prüfbar (und nicht vorgetäuscht):** echte Bildqualität/SDXL, Whisper/
Piper scharf, LoRA, SfM — HomeStation/GPU. Jede dieser Grenzen erscheint in
`sim-ki-imaging.spec.ts` als Assertion auf die ehrliche UI-/API-Meldung.

---

## 4. «Selbst modellieren & Gestaltungskonzept» (H4 — in H1/H2 eingewoben, kein eigener Batch)

H4 ist **Daten + Disziplin**, kein Code: das `gestaltung`-Feld jedes Szenarios
(1.2) ist der rote Faden. Verbindlich je Journey:

1. Die Leitidee steht als Kommentarblock am Spec-Kopf und **bestimmt die
   Geometrie** (z. B. EFH «Hangsprung»: zwei versetzte Ebenen → genau so
   modelliert, Split-Level-Treppe, Südfassade mit grossem Fensteranteil).
2. `design.dossierSetzen` mit den `gestaltung.dossier`-Einträgen früh in der
   Journey; mindestens eine `kosmoFragen`-Station zitiert das Dossier
   (Quellensprung-Assert, Muster sim-umbau 6a).
3. Modelliert wird mit der **Breite der Werkzeuge** (Direktzeichnen UND
   Generator UND Module UND Treppe/Dach/Möbel) — die Toolketten-Spalte in
   Abschnitt 2 ist je Journey verbindlich, nicht optional.
4. Skizzieren (T5/A4) wird NICHT in die Sim-Journeys dupliziert —
   `sketch-3d-a4.spec.ts` deckt es; Serie H hält die bestehenden Specs grün
   (Gate), statt sie nachzubauen.

---

## 5. Befund-Pipeline (H5)

`docs/SIM-BEFUNDE.md` — Journal, **append-only**, Schema je Eintrag:

```
### H-<lfd> — <Titel> (<Datum>, Journey <key>, Schritt <n>)
Beobachtung: <was die Journey sah — Text/Zahl/Screenshotpfad in e2e-results/>
Triage:      echter-bug | zu-strikte-assertion | v2-lücke | kein-bug
Beleg:       <Spec-Zeile, Doc-Zustand, Command-Kette zum Reproduzieren>
Entscheid:   <Opus-Triage; bei mehrdeutig/hart: Fable-Urteil, so markiert>
Status:      offen | fix-batch H-Fix-<n> (ROADMAP <m>) | doku (V2) | spec-korrigiert
```

Ablauf (Muster = die vier gefixten V1-Befunde / ROADMAP 151–154):

1. **Journey schlägt fehl oder zeigt Seltsames** → Opus triagiert sofort
   gegen den Code (nicht raten): reproduziert er es über `__kosmo.run`
   minimal, ist es ein Produktbefund; liegt es an der Assertion (fixe
   Pfadzahl, Timing), wird die **Spec korrigiert und die Lektion in 1.4
   ergänzt**, mit SIM-BEFUNDE-Eintrag `spec-korrigiert`.
2. **Echter Bug** → eigener **H-Fix-Batch** (eigener Commit, eigene Tests,
   eigener ROADMAP-Eintrag, ggf. Kernel-Test — H-Fix-Batches DÜRFEN
   Produktcode anfassen, Serie-H-Batches nicht). Danach bekommt die Journey
   einen **Regressions-Anker** auf den Fix (wie die drei Hochhaus-Anker).
   `derive/`-nahe Fixes: Golden-Risiko explizit im Batch benennen; Goldens
   nur mit Fable-Freigabe ändern.
3. **V2-Lücke / Design-Frage** → `doku (V2)`-Eintrag mit ehrlicher
   Beschreibung (Muster: Site-Zonentyp, Dach-2D-Symbol); grössere Fragen an
   den Owner. **Fable beurteilt** alle als `mehrdeutig` markierten Fälle und
   jeden H-Fix, der Kernel-Geometrie oder Checks-Semantik ändert.
4. Bereits bekannte offene Punkte werden beim Anlegen der Datei aus
   `V1-TESTLAUF-BEFUNDE.md` als Startbestand übernommen (V2-Lücken +
   Coverage-Lücken), damit es EIN lebendes Journal gibt.

---

## 6. Build-Order (Batches)

### H1a — Harness-Fundament: Bausteine + Szenarien, beide grünen Specs refaktoriert
- **Ziel:** `bausteine.ts`/`szenarien.ts` existieren; sim-umbau + sim-mfh
  laufen über Bausteine, **mit unveränderten Assertions** (Extraktion, keine
  Verhaltensänderung).
- **Dateien:** NEU `e2e/sim/szenarien.ts`, NEU `e2e/sim/bausteine.ts`,
  `e2e/sim-umbau.spec.ts`, `e2e/sim-mfh.spec.ts`.
- **Umfang:** M.
- **Schritte:** Schema 1.2 exakt (alle 6 Szenarien befüllt, auch die noch
  unbenutzten); Bausteine 1–4, 9–13, 16–18 aus den zwei Specs extrahieren
  (Signaturen 1.3); Robustheits-Regeln 1.4 als Kommentarblock im Kopf von
  `bausteine.ts`; Specs auf Bausteine umstellen.
- **Specs/Assertions:** exakt die bestehenden — der Diff der Assertions muss
  leer sein (Umbau: Farben/Pset; MFH: Mix 4, %-Erfüllung, Geschosszahlen).
- **Gate/Golden:** volle Suiten + beide Sim-Specs grün; kein Kernel-Diff →
  Goldens trivial byte-identisch.
- **Restgrenze:** Bausteine 5–8, 14–15 sind hier nur deklariert (TODO-Kommentar),
  noch ungenutzt — sie kommen mit ihren ersten Nutzern (ehrlich: kein toter
  «getesteter» Code vortäuschen).

### H1b — Bridge-/KI-Bausteine + Mock-Intents
- **Ziel:** Bausteine 14–15 (`renderUeberBridge`, `bridgeVerfuegbar`) und
  die Kosmo-Frage-Modi (13) komplett; falls eine H2-Journey einen neuen
  Mock-Intent braucht, hier ergänzen.
- **Dateien:** `e2e/sim/bausteine.ts`; optional `packages/kosmo-ai/src/`
  (nur Mock-Provider) + dessen Unit-Tests.
- **Umfang:** S–M.
- **Schritte:** Baustein 14 nach `visgraph.spec.ts`-Muster (inkl.
  Sichtfeld-Rücken); Health-Probe mit klarem Fehlertext (1.4.7);
  Mock-Intent-Erweiterungen nur mit Unit-Test in `packages/kosmo-ai/test`.
- **Gate/Golden:** `npm test` (19 KI-Tests + neue), Goldens unberührt.
- **Restgrenze:** Bridge-Segmente skippen ehrlich mit Anleitung, wenn :8600
  fehlt — kein stiller Pass.

### H5a — Befund-Journal scharf schalten
- **Ziel:** `docs/SIM-BEFUNDE.md` mit Schema, Triage-Regeln (Abschnitt 5)
  und Startbestand aus V1-TESTLAUF-BEFUNDE (V2-/Coverage-Lücken).
- **Dateien:** NEU `docs/SIM-BEFUNDE.md`; Verweis-Satz in
  `docs/SERIE-H-VOLLSIMULATION.md` (H5-Abschnitt).
- **Umfang:** S. Reine Doku, parallel zu allem.

### H2a — Journey EFH (Hanglage Emmental)
- **Dateien:** NEU `e2e/sim-efh.spec.ts`; `bausteine.ts` **nur append**
  (Bausteine 5 Dach, 6 Treppe, falls noch offen).
- **Umfang:** M.
- **Schritte/Assertions:** Tabelle Abschnitt 2, Zeile EFH; Phasengang mit
  Monotonie-Assert; Sonne (`sonne-toggle`, `sonne-datum`, `sonne-stunde`,
  `sonne-standort-label`); Export `export-pdf` oder `export-set`.
- **Restgrenze:** Dach-2D-Symbol als dokumentierte V2-Lücke (SIM-BEFUNDE),
  nicht assertet.

### H2b — Journey Hochhaus (Zürich-West)
- **Dateien:** NEU `e2e/sim-hochhaus.spec.ts`; `bausteine.ts` nur append
  (Bausteine 7 Raster, 8 Fassade).
- **Umfang:** M–L (längste Journey; Timeout beachten, Stapeln in einer
  `__kosmo.run`-Schleife statt 12 UI-Klicks, danach EIN UI-Klick als
  Bedienbeweis).
- **Assertions:** die drei Regressions-Anker + 154 + Fluchtweg (Tabelle 2).

### H2c — Journey Stadthaus (Bern Länggasse)
- **Dateien:** NEU `e2e/sim-stadthaus.spec.ts`; `bausteine.ts` append.
- **Umfang:** M. Werkplan-Schwerpunkt (Bemassung, Etikett/Keynote, Ausmass,
  DXF) — die einzige Journey, die die Werkplan-Werkzeuge breit fährt.

### H2d — Journey Blockrand (Basel Matthäus)
- **Dateien:** NEU `e2e/sim-blockrand.spec.ts`; `bausteine.ts` append.
- **Umfang:** M. Regel-Schwerpunkt (Baugrenze/Grenzabstand/zone-verletzt,
  `waendeAusZonen`, Publikations-Set mit Transmittal).

### H3a — KI-/Imaging-Simulation gebündelt
- **Ziel:** `e2e/sim-ki-imaging.spec.ts` — TTS-Prüfton, STT-501-Ehrlichkeit,
  Embed-Modellname, Render-QA-Verdict, video-splat `kein-sfm-worker`
  (Abschnitt 3); dazu Nachweis, dass jede H2-Journey ihr
  `renderUeberBridge`-Segment trägt (sonst dort nachrüsten).
- **Dateien:** NEU `e2e/sim-ki-imaging.spec.ts`; ggf. kleine Ergänzungen in
  den vier H2-Specs.
- **Umfang:** M.
- **Restgrenze:** alles GPU-Echte bleibt HomeStation — die Spec assertet
  genau die ehrlichen Meldungen, keine Qualität.

### H-Fix-N — Fix-Batches (nach Bedarf, ausserhalb der Serie)
- Auslöser: SIM-BEFUNDE-Eintrag `echter-bug`. Eigener Batch nach
  Owner-Mandat (Feature→Tests→ROADMAP→Commit), Produktcode erlaubt,
  `derive/`-Berührung nur mit explizitem Golden-Urteil von Fable.
  Kleinste erlaubte Produkt-Berührung INNERHALB von Serie-H-Batches bleibt
  das reine Attribut-`data-testid` (1.4.2).

---

## 7. Orchestrierungs-Plan (für Opus)

**Heisse Dateien:** `e2e/sim/bausteine.ts` (alle H2-Batches) und
`docs/SIM-BEFUNDE.md` (alle Batches). Regel: H2-Batches ändern `bausteine.ts`
**append-only** (neue Funktionen ans Ende, bestehende unangetastet); muss ein
bestehender Baustein geändert werden → Stopp, Opus koordiniert seriell.
SIM-BEFUNDE ist append-only per Definition (Merge-konfliktarm).

| Phase | parallel? | Batches | Begründung |
| --- | --- | --- | --- |
| 1 | ja | **H1a ∥ H5a** | Harness vs. reine Doku — disjunkt |
| — | | **Fable-Review 1** nach H1a | Baustein-API + Szenario-Schema sind das Fundament aller Journeys; erst nach Freigabe H2 starten |
| 2 | nein | **H1b** | fasst bausteine.ts zentral an; danach ist die API eingefroren (append-only) |
| 3 | ja | **H2a ∥ H2b** | dateidisjunkte Specs; bausteine.ts append-only in getrennten Worktrees, Opus merged und lässt die Sim-Suite auf dem Merge-Stand laufen |
| 4 | ja | **H2c ∥ H2d** | wie Phase 3 |
| — | | **Fable-Review 2** nach Phase 4 | Assertions-Härte-Urteil: decken die Journeys Lücken auf oder klicken sie nur grün? Stichprobe gegen Abschnitt 2 |
| 5 | nein | **H3a** | fasst alle vier H2-Specs an → allein |
| — | | **Fable-Schlussreview** | Gesamtbild, SIM-BEFUNDE-Triage-Qualität, ROADMAP-Konsistenz |
| lfd. | seriell | **H-Fix-N** | je nach Befund; nie mit einem Serie-H-Batch im selben Commit |

Je Batch (Opus-Harness): **cwd `kosmo-orbit/`**, Gate `npm run typecheck` +
`npm test` + `npm run build -w @kosmo/orbit-app`, Helfer mit `setsid`
(`--fake-worker`!), dann **serielle** Playwright-Läufe: erst die neuen/
berührten Sim-Specs einzeln, dann die volle E2E-Suite; ROADMAP-Eintrag,
deutscher Commit mit Trailern, Push auf den Entwicklungs-Branch.

**Sonnet-Auftrags-Schablone:** Kontext = dieser Plan (Batch-Abschnitt +
Abschnitte 1–5) + `kosmo-orbit/CLAUDE.md` + `docs/V1-TESTLAUF-BEFUNDE.md`.
Verbote: kein Kernel-/`derive/`-Code, keine neuen Abhängigkeiten, keine
bestehenden `data-testid`s ändern, keine erfundenen Selektoren, keine
Assertion-Abschwächung bestehender Specs, `exactOptionalPropertyTypes`-konforme
Spreads, bausteine.ts nach H1b append-only. Jeder gefundene Befund → sofort
SIM-BEFUNDE-Eintrag, nicht stillschweigend um-asserten.

## 8. Abnahmekriterien je Batch (grün/rot für Opus)

- **H1a:** beide Sim-Specs grün mit leerem Assertions-Diff; `szenarien.ts`
  enthält alle 6 Szenarien vollständig (Schema 1.2, inkl. `gestaltung`);
  Regeln 1.4 als Kommentar im Bausteine-Kopf; jede Baustein-Selektor-Zeile
  trägt den Quellkommentar; volle Suiten grün; ROADMAP-Eintrag.
- **H1b:** `renderUeberBridge` von mindestens einem Aufrufer bewiesen
  (Umbau ODER MFH um das Segment ergänzt); Health-Probe liefert den
  Anleitungstext bei toter Bridge (manuell belegt); neue Mock-Intents
  unit-getestet; KI-Testzahl gewachsen oder unverändert grün.
- **H5a:** SIM-BEFUNDE existiert mit Schema, Triage-Regeln und Startbestand;
  Verweis in SERIE-H-VOLLSIMULATION gesetzt.
- **H2a–H2d:** Journey einzeln grün UND in der Gesamtsuite grün (seriell);
  jede Zeile der Assertions-Spalte aus Abschnitt 2 nachweisbar im Spec;
  Regressions-Anker vorhanden; Phasengang mit Monotonie-Assert; mindestens
  eine Kosmo-Station; ein Export mit Inhalts-/Grössen-Assert; kein
  `waitForTimeout` im Spec; neue Bausteine append-only; Befunde (auch
  `kein-bug`-Verdachtsfälle) in SIM-BEFUNDE eingetragen.
- **H3a:** alle fünf Ehrlichkeits-Assertions (TTS-WAV, STT-501, Embed-Name,
  QA-Verdict fake-worker, video-splat kein-sfm-worker) grün gegen die
  laufende Fake-Bridge; jede H2-Journey trägt ihr Render-Segment.
- **H-Fix-N:** eigener ROADMAP-Eintrag; Reproduktion als Test VOR dem Fix
  rot, danach grün; Goldens byte-identisch ausser mit dokumentiertem
  Fable-Urteil; die auslösende Journey trägt danach den Regressions-Anker.

## 9. Ehrliche Restgrenzen

- **Simulation ≠ Mensch:** Die Journeys fahren Commands + verifizierte
  UI-Pfade; Pixel-genaues Maus-Zeichnen jeder Wand wäre brüchig ohne
  Erkenntnisgewinn — Bedienbarkeit einzelner Interaktionen decken die
  bestehenden atomaren Specs (`plan-interaktion`, `eingabe-3d`, `sketch-3d-a4`).
  Serie H beweist die **Arbeitsablauf-Korrektheit**, nicht die Ergonomie.
- **KI/GPU:** Bildqualität, Whisper/Piper scharf, LoRA, SfM — nur der Weg
  und die ehrlichen Grenz-Meldungen sind prüfbar (Abschnitt 3); Rest =
  HomeStation-Abnahme (`docs/HOMESTATION-AUFTRAG.md`).
- **«Alle Tools»** ist ein wachsendes Ziel: die Toolketten in Abschnitt 2
  decken die grosse Fläche, aber nicht jeden Inspector-Pfad; neue Werkzeuge
  docken als Baustein an. Nicht abgedeckte Commands werden beim
  Schlussreview als Liste in SIM-BEFUNDE festgehalten (Coverage ehrlich
  benannt statt behauptet).
- **Checks bleiben Freitext** (Coverage-Lücke aus V1): Baustein 11 parst
  Text — strukturierte `regel`/`schwere`-Attribute wären ein Produkt-Batch
  (V2-Kandidat, in SIM-BEFUNDE geführt).
- **CH-Parzellen sind realistisch, nicht amtlich:** LV95-Koordinaten und
  Zonenwerte sind plausible, deterministische Fixtures — kein
  GIS-/AV-Import, kein Netzzugriff im Test.
