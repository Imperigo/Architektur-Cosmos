# KONZEPT-MANUELL-ALLE-STATIONEN — Bestandsaufnahme (E-K15 Schritt 1, Tag A)

**Auftrag:** `docs/V090-SPEZ.md` §E-K15 («Manuelle Ansicht = EIN Konzept für
alle Stationen», Tag A Schritt 1 + Tag B Schritt 2, Sonnet) · Owner-Wortlaut
`docs/OWNER-KORREKTUREN-2026-07.md` §K15 (Z.177–193, Rückfrage R3 Z.583–585):

> «die manuelle ansicht gilt für alle tools, es ist nicht eine ältere
> einstellung sondern es ist einfach eine klassische cad oberfläche zum
> manuell zeichnen wenn man möchte die island ui ist die intelligente
> standard oberfläche.. das heist nicht nur bei kosmovis sondern auch bei
> anderen tools» · «die werkzeug anordnung ist unterkategorie der manuellen
> ansicht»

Dieses Dokument ist **Schritt 1** (Bestandsaufnahme, keine Umsetzung). Es
trägt den Tag-B-Bauagenten vollständig — jede Aussage unten ist mit
Datei:Zeile belegt, im Ziel-Worktree nachvollziehbar. Schritt 2
(Vereinheitlichung) ist NICHT Teil dieses Dokuments.

**Kern-Ergebnis vorweg** (Kurzfassung für Fable, Details unten):

1. Der Owner-Auftrag geht implizit davon aus, dass der **Vis-Weg**
   (`kosmo.vis.*`) das gemeinsame Muster werden könnte (V090-SPEZ Z.70:
   «Vis-Muster `kosmo.vis.*`? Grep-Beleg»). **Das ist widerlegt**: `kosmo.vis.*`
   ist ein Onboarding-/Serien-Namensraum (`VisOnboarding.tsx`,
   `VisWorkspace.tsx`), NICHT der Manuell-Schalter. Der echte, bereits
   **vollständig vereinheitlichte** Persistenz-Mechanismus heisst
   `kosmo.ui.v1` (`state/ui-zustand.ts`) mit vier parallelen Feldern
   `designOberflaeche` / `visOberflaeche` / `publishOberflaeche` /
   `prepareOberflaeche`, alle vom Typ `'island' | 'manuell'`, alle Default
   `'island'`, alle im selben Schlüssel persistiert.
2. Die **Persistenz-Ebene ist bereits EIN Mechanismus** — hier gibt es
   nichts zu migrieren. Was NICHT vereinheitlicht ist, ist der **Zugang**
   (wie schaltet man in den Manuell-Modus um): Design/Publish/Prepare nutzen
   ein Insel-Werkzeug (`island-werkzeug-manuell`), Vis nutzt (seit einer
   0.8.10-Kurskorrektur) NUR noch einen Einstellungen-Schalter
   (`einstellung-vis-manuell`).
3. Design ist teilweise **Cluster-B-gesperrt** (`DesignWorkspace.tsx` +
   `PlanView.tsx` sind laut Betriebsregel NUR-Fable, s. V088-SPEZ.md:127,
   V089-SPEZ.md:162). Jede Änderung, die diese Dateien anfassen müsste, ist
   für den Sonnet-Tag-B-Bauagenten TABU (V090-SPEZ.md:76: «TABU: kernel,
   Cluster B … STOPP, Fable»).

---

## 1 · Bestandsaufnahme je Station

### 1.1 Design (`apps/kosmo-orbit/src/modules/design/`)

**Existiert ein Manuell-/Klassisch-Modus?** Ja, vollständig — die komplette
Vor-Island-Werkzeugleiste/Dock-Fläche/Geschossleiste bleibt byte-gleich
erhalten, gated auf `designOberflaeche === 'manuell'`.

- Typ/Store-Feld: `DesignOberflaeche = 'island' | 'manuell'`
  (`apps/kosmo-orbit/src/state/ui-zustand.ts:66`), Setter
  `setDesignOberflaeche` (`ui-zustand.ts:227`), persistiert
  (`ui-zustand.ts:251`, Default `'island'` — `ui-zustand.ts:266`).
- Persistenz-Schlüssel: `localStorage` `kosmo.ui.v1`
  (`ui-zustand.ts:241`, `STORAGE_KEY`).
- Vorwärts-Zugang (`'island' → 'manuell'`): Insel-Werkzeug `manuell` in der
  AUSTAUSCH-Insel — `apps/kosmo-orbit/src/modules/design/island/
  island-katalog.ts:237` (`werkzeug('manuell', 'Manuell', 'austausch',
  icon(ISLAND_GLYPHEN, 'manuell'), 'neu', false)`), ausgelöst in
  `DesignWorkspace.tsx:2662-2664` (`case 'manuell': setDesignOberflaeche
  ('manuell'); return;`). DOM-Testid: `island-werkzeug-manuell`
  (generisch aus `w.id` gebaut, `apps/kosmo-orbit/src/modules/design/
  island/IslandShell.tsx:545`: `` data-testid={`island-werkzeug-${w.id}`} ``).
- Rückweg (`'manuell' → 'island'`): Knopf `data-testid="island-zurueck"`
  in `DesignWorkspace.tsx:2857`, `onClick` bei `DesignWorkspace.tsx:2860`
  (`setDesignOberflaeche('island')`).
- Was zeigt Manuell konkret: `EntwurfsDock` (linke Rail, nur in Manuell —
  Sanktion 7 ISLAND-UI-SPEZ.md:325-329), `DockFlaeche station="design"`
  (`DesignWorkspace.tsx:3692`), Statusleiste, Zoom-/Raster-/Textur-Chips,
  klassische Werkzeugleiste (`design-werkzeugleiste`), weitere
  `designOberflaeche === 'manuell'`-Zweige in `DesignWorkspace.tsx:3824,
  3860, 4036` und `PlanView.tsx:926, 2353` (Massketten-Ansichtstoggles,
  Eigenschaften-Float).
- App-weite Gate-Logik: `App.tsx:333/358/362` — `designIslandAktiv =
  screen==='design' && designOberflaeche==='island'`, geht in
  `bodenDockAusgeblendet` ein. **Korrektur (Matrix-C-5-Fund,
  22.07.2026):** `bodenDockAusgeblendet` (`App.tsx:359-363`) blendet das
  BodenDock für ALLE VIER Stationen im Island-Modus aus
  (design/vis/prepare/publish je über ihr `…IslandAktiv`-Flag) — die
  frühere Formulierung «NUR design+Island» war falsch; die
  Vier-Stationen-Verallgemeinerung existiert seit v0.8.4 (PC1/PC3/PC4).
  Zeilennummern-Hinweis: einzelne Locator in diesem Dokument sind seit
  E-K15/2 um einige Zeilen verschoben (z.B. Einstellungen.tsx-Vis-Checkbox
  jetzt ~821, Store-Read ~364) — Datei+Sachverhalt bleiben massgeblich.

### 1.2 Vis (`apps/kosmo-orbit/src/modules/vis/`) — die explizite Referenz

**Existiert ein Manuell-/Klassisch-Modus?** Ja, ebenfalls vollständig — und
das ist historisch der Präzedenzfall, an dem Design/Publish/Prepare sich
orientiert haben (Kommentar-Kette PC1→PC3→PC4 in `ui-zustand.ts`).

- Typ/Store-Feld: `VisOberflaeche = 'island' | 'manuell'`
  (`ui-zustand.ts:83`), Setter `setVisOberflaeche` (`ui-zustand.ts:228`),
  persistiert (`ui-zustand.ts:253`), Default `'island'`
  (`ui-zustand.ts:267`) — **derselbe Schlüssel** `kosmo.ui.v1` wie Design.
- **Manuell-Rückbau 0.8.10 P-B2 (der von der Spez referenzierte Vorgang):**
  `docs/V0810-SPEZ.md:54-80` (E3-Nachtrag, Owner-Entscheid 20.07.2026) und
  Ergebnis-Vermerk `docs/V0810-SPEZ.md:229-249`. Vorher hatte Vis — genau
  wie Design/Publish/Prepare heute — ein Insel-Werkzeug `'manuell'` in der
  AUSTAUSCH-Insel. Der Owner-Entscheid (P-B1-Audit fand vier Manuell-only-
  Features ohne Insel-Äquivalent: vis-Legende, VisOnboarding,
  Vis-Dock-Panels, gespeicherte Ansichten) war: **«Insel bleibt Default und
  UI-Standard; die andere UI (manuelle Ansicht) kann in den Einstellungen
  geändert werden.»** Umsetzung (ROADMAP 548, Commit `60dd527`):
  1. Insel-Werkzeug `'manuell'` aus `vis-island-katalog.ts` UND der
     zugehörige `case` in `VisWorkspace.tsx` **entfernt** — Beleg:
     `apps/kosmo-orbit/src/modules/vis/island/vis-island-katalog.ts:110-117`
     (Kommentar: «der prominente Insel-Rückweg 'island' → 'manuell' ist
     entfallen … die manuelle Ansicht bleibt über einen Schalter in den
     Einstellungen erreichbar»), Katalog-Zähler-Kommentar
     `vis-island-katalog.ts:127-129` («14 Werkzeuge … E3-Nachtrag: 'manuell'
     entfernt, 14→13»).
  2. NEU: Checkbox **«Manuelle Ansicht (KosmoVis)»** im Einstellungen-Panel
     — `apps/kosmo-orbit/src/shell/Einstellungen.tsx:762-775`:
     ```
     766:  data-testid="einstellung-vis-manuell"
     767:  checked={visOberflaeche === 'manuell'}
     768:  onChange={(e) => setVisOberflaeche(e.target.checked ? 'manuell' : 'island')}
     770:  Manuelle Ansicht (KosmoVis)
     ```
     Store-Lesen/Schreiben direkt aus `Einstellungen.tsx:352-353`
     (`useUiZustand((s) => s.visOberflaeche)` / `setVisOberflaeche`) — KEINE
     Zweitlogik, derselbe Store wie `VisWorkspace.tsx`.
  3. Rückweg AUS `'manuell'` bleibt der bestehende `island-zurueck`-Knopf
     (`VisWorkspace.tsx:685-698`, `VisIslandZurueckKnopf`-Komponente,
     `onClick={() => setVisOberflaeche('island')}`).
  4. `normalisiere()`-Koerzierung entfällt — `'manuell'` ist seither eine
     **legitime** Dauer-Einstellung, kein «verirrter» Zustand mehr.
- Was zeigt Manuell konkret: klassische VisTabs-Werkzeugzeile,
  `DockFlaeche station="vis"` (`apps/kosmo-orbit/src/modules/vis/
  NodeCanvas.tsx:1551`, `{!islandModus && <DockFlaeche .../>}`),
  `.vis-chrome-bottomright`/`-bottomleft`, `VisOnboarding`, die
  Porttyp-Legende inline im `NodeCanvas.tsx` — alles Manuell-only-Features
  ohne Insel-Äquivalent (P-B1-Audit-Fund, s.o.).
- Vollflächen- vs. Werkzeugleisten-Charakter: Vis-Manuell ist die
  klassische Node-Editor-Vollfläche + Dock-Panels (kein reines
  Werkzeugleisten-Overlay wie Publish).

### 1.3 Publish (`apps/kosmo-orbit/src/modules/publish/`)

**Existiert ein Manuell-/Klassisch-Modus?** Ja, vollständig — inkl.
klassischer Sidebar/Werkzeugleiste mit Blattliste, Dossier, Plankopf-Editor
etc.

- Typ/Store-Feld: `PublishOberflaeche = 'island' | 'manuell'`
  (`ui-zustand.ts:96`), Setter `setPublishOberflaeche`
  (`ui-zustand.ts:229`), persistiert (`ui-zustand.ts:255`), Default
  `'island'` (`ui-zustand.ts:268`) — **derselbe Schlüssel** `kosmo.ui.v1`.
- Vorwärts-Zugang: Insel-Werkzeug `manuell` in AUSTAUSCH —
  `apps/kosmo-orbit/src/modules/publish/island/publish-island-katalog.ts:91`
  (`werkzeug('manuell', 'Manuell', 'austausch', icon('manuell'), false)`,
  Kommentarzeile 89: «Rückweg 'island' → 'manuell' — Muster
  `vis-island-katalog.ts`»), ausgelöst in `PublishWorkspace.tsx:116`
  (`if (w.id === 'manuell') setPublishOberflaeche('manuell');`). Testid:
  `island-werkzeug-manuell` (dasselbe generische Schema wie Design, `IslandShell.tsx`
  wird von Publish importiert — `PublishWorkspace.tsx:39`).
- Rückweg: `data-testid="island-zurueck"` — `PublishWorkspace.tsx:796`.
- Read/Write: `PublishWorkspace.tsx:102-103` (`useUiZustand((s) =>
  s.publishOberflaeche)` / `setPublishOberflaeche`), Verzweigung
  `PublishWorkspace.tsx:673` (`if (publishOberflaeche === 'island') {
  return <... island ...> }`), klassischer Zweig ab `PublishWorkspace.tsx:698`
  (`<div className="k-publish">` mit `k-publish-sidebar`,
  `publish-werkzeugleiste`).
- Was zeigt Manuell konkret: Blattliste-Sidebar, Werkzeugleiste
  (`publish-werkzeugleiste`, Dossier-/Plankopf-Knöpfe), `DockFlaeche
  station="publish"` (`PublishWorkspace.tsx:1548`).

### 1.4 Prepare (`apps/kosmo-orbit/src/modules/prepare/`)

**Existiert ein Manuell-/Klassisch-Modus?** Ja, vollständig — klassische
Werkzeugleiste + Ingest-Zone + Dokumentliste; **kein** `DockFlaeche` (Prepare
taucht nicht in `DockStation` auf — `state/dock-stationen.ts:127`:
`'design' | 'plan' | 'vis' | 'publish'`, Prepare fehlt bewusst).

- Typ/Store-Feld: `PrepareOberflaeche = 'island' | 'manuell'`
  (`ui-zustand.ts:107`), Setter `setPrepareOberflaeche`
  (`ui-zustand.ts:230`), persistiert (`ui-zustand.ts:257`), Default
  `'island'` (`ui-zustand.ts:269`) — **derselbe Schlüssel** `kosmo.ui.v1`.
- Vorwärts-Zugang: Insel-Werkzeug `manuell` in AUSTAUSCH —
  `apps/kosmo-orbit/src/modules/prepare/island/prepare-island-katalog.ts:85`
  (`werkzeug('manuell', 'Manuell', 'austausch', icon('manuell'), false)`),
  ausgelöst in `PrepareWorkspace.tsx:168` (`if (w.id === 'manuell')
  setPrepareOberflaeche('manuell');`). Testid: `island-werkzeug-manuell`.
- Rückweg: `data-testid="island-zurueck"` — `PrepareWorkspace.tsx:202-205`
  (`onClick={() => setPrepareOberflaeche('island')}`).
- Read/Write: `PrepareWorkspace.tsx:67-68`, Verzweigung
  `PrepareWorkspace.tsx:139` (`if (prepareOberflaeche === 'island') {...}`),
  klassischer Zweig ab `PrepareWorkspace.tsx:176`.
- Was zeigt Manuell konkret: Werkzeugleiste (`prepare-werkzeugleiste`),
  Ingest-Drop-Zone (`ingest-zone`), Wissenssuche (`knowledge-search`),
  Dokumentliste, `DossierSection`, `OneDriveSection` — **kein** Dock-Panel-
  System (nur Design/Vis/Publish haben `DockFlaeche`).

### 1.5 Weitere Stationen unter `apps/kosmo-orbit/src/modules/`

Vollständige Liste (Verzeichnis-Scan): `asset`, `data`, `design`, `dev`,
`doc`, `kxp`, `paket`, `prepare`, `publish`, `train`, `vis`.

**Nur `design`, `prepare`, `publish`, `vis` haben ein `island/`-Unterverzeichnis**
(geprüft per `ls apps/kosmo-orbit/src/modules/*/island` — Treffer exakt
diese vier). `asset`, `data`, `dev`, `doc`, `kxp`, `paket`, `train` haben
**keine** Island-UI und darum auch **kein** Island/Manuell-Begriffspaar:

- `data/DataWorkspace.tsx:3423,3476,3547` — `'manuell'` dort bedeutet
  **«manuell erfasster Datensatz»** (Dateneingabe-Herkunft, ein
  Options-Wert im Datenmodell), NICHT den CAD-Oberflächen-Umschalter.
  Keine Verwechslungsgefahr im Code, aber Grep-Rauschen — hier
  dokumentiert, damit der Tag-B-Bauagent es nicht fälschlich als Fund
  wertet.
- `train/TrainWorkspace.tsx:42,302,316` — `„manuell“` im Kommentarsinn
  («von Hand nachgezogener Spiegel»), ebenfalls kein UI-Schalter.
- `asset/bake-auftrag.ts` — ein Treffer, betrifft einen Bake-Auftrags-Modus,
  kein CAD-Oberflächen-Konzept.
- `dev`, `doc`, `kxp`, `paket` — **keine** Treffer für `manuell`/`klassisch`
  überhaupt.

**Einordnung:** Diese sieben Stationen sind Utility-/Listen-Oberflächen ohne
Zeichenfläche («klassische CAD-Oberfläche zum manuell zeichnen» trifft
inhaltlich nicht zu). Ob der Owner-Auftrag «für alle Tools» auch sie meint,
ist eine offene Entscheidung (s. Abschnitt 5, offene Fragen).

---

## 2 · Der EINE Mechanismus — Empfehlung

### 2.1 Was schon vereinheitlicht ist (keine Migration nötig)

Die **Persistenz-Schicht ist bereits ein einziger Mechanismus**:

- Ein Store: `apps/kosmo-orbit/src/state/ui-zustand.ts`
  (`export const useUiZustand = create<UiZustand>(...)`, `ui-zustand.ts:508`).
- Ein `localStorage`-Schlüssel für alle vier Felder: `kosmo.ui.v1`
  (`ui-zustand.ts:241`).
- Identisches Typmuster für alle vier Stationen: `'island' | 'manuell'`
  (`ui-zustand.ts:66,83,96,107`), Default überall `'island'`
  (`ui-zustand.ts:266-269`).
- Gemeinsame `persistiere()`-Funktion schreibt alle vier Felder in einem
  Aufruf (`ui-zustand.ts:439-468`); gemeinsamer `anfangsZustand()` liest
  sie beim Store-Aufbau zurück (`ui-zustand.ts:474-506`).
- Rückweg-Testid ist app-weit identisch: `island-zurueck`, an allen vier
  Stellen wörtlich gleich benannt (`DesignWorkspace.tsx:2857`,
  `VisWorkspace.tsx:691`, `PublishWorkspace.tsx:796`,
  `PrepareWorkspace.tsx:202`).

**Korrektur der Spez-Hypothese:** `docs/V090-SPEZ.md:70` vermutet, das
gemeinsame Muster könnte «Vis-Muster `kosmo.vis.*`» heissen. Das trifft
nicht zu — `kosmo.vis.*` (`VisOnboarding.tsx:34-35`, `VisWorkspace.tsx:115,122`)
ist ein anderer, unabhängiger Namensraum (Onboarding-Flag, Serien-Cache),
hat mit dem Island/Manuell-Umschalter nichts zu tun. Der tatsächliche
Vis-Beitrag zum gemeinsamen Muster ist NICHT der Storage-Key, sondern das
**Vorbild «vier Felder, ein Schema, additiv»**, das PC1 (Vis) zuerst gesetzt
hat und PC3/PC4 (Publish/Prepare) danach 1:1 kopiert haben (s. Kommentarkette
`ui-zustand.ts:78-110`, wörtlich «kopiert exakt dasselbe Muster»).

### 2.2 Was NICHT vereinheitlicht ist — der Zugang (Vorwärtsweg)

| Station | Vorwärts-Zugang (`island → manuell`) | Testid | Ort |
|---|---|---|---|
| Design | Insel-Werkzeug in AUSTAUSCH | `island-werkzeug-manuell` | `island-katalog.ts:237` |
| Publish | Insel-Werkzeug in AUSTAUSCH | `island-werkzeug-manuell` | `publish-island-katalog.ts:91` |
| Prepare | Insel-Werkzeug in AUSTAUSCH | `island-werkzeug-manuell` | `prepare-island-katalog.ts:85` |
| Vis | **NUR** Einstellungen-Checkbox | `einstellung-vis-manuell` | `Einstellungen.tsx:766` |

Vis ist damit die **Minderheitslösung** (1 von 4), nicht die Mehrheit — die
Spez-Vermutung «vermutlich der Vis-Weg» trifft für den Zugang ebenfalls
nicht direkt zu, wenn man unter «Vis-Weg» das Insel-Werkzeug versteht (das
existiert bei Vis gerade NICHT mehr). Richtig ist: der **Vis-Weg
„Einstellungen-Checkbox“** ist konzeptionell der modernere, vom Owner
zuletzt bestätigte Zugang (0.8.10 E3, 20.07.2026) — er kam aber NUR
deshalb zustande, weil damals eine (heute durch K15 zurückgenommene)
Löschabsicht den prominenten Insel-Zugang unerwünscht machte.

### 2.3 Empfehlung für Schritt 2 (Tag B)

**Additiv, nicht ersetzend — Sanktion 4 verbietet Vertragsbrüche
(`docs/V090-SPEZ.md:108`):**

1. **Persistenz/Store:** unverändert lassen. `kosmo.ui.v1` +
   `<station>Oberflaeche` ist bereits der EINE Mechanismus — kein neues
   Schema, kein `kosmo.manuell.<station>`-Namensraum nötig (das Muster ist
   ohnehin schon konsistent `Station + 'Oberflaeche'`, ein Umbenennen wäre
   reiner Churn ohne Nutzen und würde `manuell-seed.ts` + `playwright.config.ts`
   + jeden Bestandskonsumenten unnötig anfassen).
2. **Zugang:** Design/Publish/Prepare bekommen **zusätzlich** je eine
   Einstellungen-Checkbox nach dem Vis-Vorbild (`einstellung-design-manuell`,
   `einstellung-publish-manuell`, `einstellung-prepare-manuell`), die
   denselben Store liest/schreibt wie das jeweilige Insel-Werkzeug — beide
   Zugänge bleiben nebeneinander bestehen (additiv, kein Ersatz, analog
   ISLAND-UI-SPEZ.md §6 Sanktion 6: «Manuell-Umschalter ist additiv, kein
   Ersatz», `docs/ISLAND-UI-SPEZ.md:314-317`). Das ist die einzige Änderung,
   die einen wirklich **einheitlichen** Zugangsort schafft: EIN
   Einstellungen-Panel, in dem der Owner/Nutzer für jede der vier Stationen
   den Manuell-Schalter findet, ohne die Insel-Werkzeuge (und ihre
   E2E-Verträge) anzufassen.
3. **Vis' Insel-Werkzeug NICHT wiederherstellen** — das war eine bewusste,
   datierte, ausdrücklich zweistufig committete Owner-Entscheidung
   (`docs/V0810-SPEZ.md:54-80`, ROADMAP 548/549) mit eigens umgebauten
   Specs (`vis-oberflaeche.spec.ts`, `vis-island.spec.ts`). Diese
   rückgängig zu machen wäre selbst ein Vertragsbruch (Sanktion 4) und
   bringt keinen Mehrwert gegenüber Punkt 2 oben. Diese Entscheidung ist
   unten trotzdem als offene Frage an Fable/Owner vermerkt (Abschnitt 5),
   falls «EIN Konzept» wörtlich identische UI-Affordanzen an allen vier
   Orten verlangt.
4. **Warum kein `kosmo.manuell.<station>`-Schema:** Rückwärtskompatibilität
   wäre sonst ein echtes Migrationsproblem (alter Schlüssel lesen, neuen
   schreiben, doppelte Wartung in `manuell-seed.ts`) — für NULL Nutzen,
   weil das bestehende Schema (`kosmo.ui.v1`) bereits exakt das gewünschte
   Verhalten hat. Migration nur nötig, wenn Fable entscheidet, dass der
   Feldname/Schlüssel sich ändern MUSS (z. B. für Konsistenz mit einem noch
   nicht existierenden fünften Stations-Feld) — dafür gibt es aktuell
   keinen fachlichen Grund.

---

## 3 · Lückenliste je Station (S/M/L-Schätzung)

### Design
- **Lücke:** kein Einstellungen-Checkbox-Zugang (nur Insel-Werkzeug). —
  **S** (nur `Einstellungen.tsx`, liest/schreibt bestehenden
  `designOberflaeche`/`setDesignOberflaeche`, KEIN Antasten von
  `DesignWorkspace.tsx`/`PlanView.tsx` nötig — reine Store-Konsumption wie
  bei Vis).
- Reload-Persistenz bereits e2e-bewiesen: `e2e/island-verdrahtung.spec.ts:108-123`
  (Reload nach `island-zurueck`, UND Reload aus `'island'`). **Keine Lücke.**
- **NICHT antastbar:** alles, was Änderungen INNERHALB `DesignWorkspace.tsx`
  oder `PlanView.tsx` erfordert (z. B. Restrukturierung der
  Umschalt-Mechanik selbst) — Cluster B, s. Abschnitt 4.

### Vis
- **Keine Lücke** — vollständige Referenz-Implementierung (Zugang +
  Rückweg + Persistenz + eigene E2E-Suite `vis-oberflaeche.spec.ts`).
- Kleine Doku-Schuld: der Kommentar `VisWorkspace.tsx:670-672` («der
  Vorwärtsweg … ist das 'Manuell'-Insel-Werkzeug in AUSTAUSCH») ist seit
  dem E3-Nachtrag veraltet (das Insel-Werkzeug existiert nicht mehr) — **S**,
  reine Kommentarkorrektur, kein Funktionsrisiko.

### Publish
- **Lücke:** kein Einstellungen-Checkbox-Zugang. — **S** (analog Design,
  reine `Einstellungen.tsx`-Ergänzung, `PublishWorkspace.tsx` bleibt
  unberührt).
- **Lücke:** keine dedizierte Reload-Persistenz-e2e-Probe (nur
  Onboarding-Reload in `publish-toggles.spec.ts:54`, kein Test, der
  gezielt `publishOberflaeche` über einen Reload prüft, wie
  `island-verdrahtung.spec.ts:120-122` es für Design tut). — **S**
  (neuer Testfall nach demselben Muster).
- Dock-Presets (`state/dock-presets.ts:70`: `PresetStation = Extract<
  DockStation,'design'|'vis'|'publish'>` erlaubt Publish schon typseitig)
  sind in der Einstellungen-UI NICHT für Publish freigeschaltet
  (`Einstellungen.tsx:340-341` prüft nur `'design'|'vis'`) — **S**, ein
  Nebenfund zur K14c-Unterkategorie «Werkzeuganordnung», kein Blocker für
  K15 selbst, aber im selben `Einstellungen.tsx`-Block sichtbar.

### Prepare
- **Lücke:** kein Einstellungen-Checkbox-Zugang. — **S**.
- **Lücke:** keine dedizierte Reload-Persistenz-e2e-Probe für
  `prepareOberflaeche` (analog Publish). — **S**.
- Kein `DockFlaeche`/Dock-Preset-System für Prepare — das ist laut
  Bestandskommentar (`App.tsx:350-352`) eine bewusste, dokumentierte Grenze
  («Prepare hat KEINE `DockFlaeche` … dieser Guard ist die GANZE
  PC4-Anfassung von App.tsx»), **kein K15-Gap**, sondern Folgeposten falls
  Prepare je ein Dock-Panel-System bekommen soll (eigener XL-Posten,
  ausserhalb K15).

### Data / Asset / Dev / Doc / Kxp / Paket / Train
- **Grundsätzliche Lücke:** kein Island-Modus, kein Manuell-Modus, kein
  `<station>Oberflaeche`-Feld überhaupt — **XL falls je gebaut** (kompletter
  Neubau einer Island-Schicht + eines klassischen Gegenstücks je Station,
  analog dem PC1/PC3/PC4-Aufwand). Empfehlung: **NICHT Teil von K15/Tag B**
  — diese Stationen sind keine CAD-Zeichenflächen (Owner-Wortlaut «klassische
  cad oberfläche zum manuell zeichnen»); die Frage, ob der Owner-Auftrag
  «für alle Tools» sie trotzdem meint, geht als offene Frage an Fable/Owner
  (Abschnitt 5).

---

## 4 · Cluster-B-Check (Fable-exklusiv)

Betriebsregel (`docs/V088-SPEZ.md:127`, `docs/V089-SPEZ.md:162`): **Cluster
B = `DesignWorkspace.tsx` + `PlanView.tsx`, NUR Fable.** `V090-SPEZ.md:76`
TABU-Zeile: *«TABU: kernel, Cluster B (liegt ein Schalter-Ort dort: STOPP,
Fable).»*

**Befund — es liegt ein Schalter-Ort in beiden Cluster-B-Dateien:**

- `DesignWorkspace.tsx` (Fable-exklusiv):
  - `:543-544` — `designOberflaeche`/`setDesignOberflaeche` gelesen.
  - `:559` — `designOberflaeche === 'manuell'` in einer Bedingung
    (Viewport-Chrome-Sichtbarkeit).
  - `:1095` — `if (designOberflaeche === 'island') setEigenschaftenFloatOffen(true);`
  - `:2609,2662-2664` — der eigentliche PD2-Kernschalter
    (`setDesignOberflaeche('manuell')`).
  - `:2702,3824,3860,4000,4036` — weitere `designOberflaeche`-Renderzweige.
  - `:2857,2860` — `island-zurueck`-Knopf + `setDesignOberflaeche('island')`.
  - `:3692` — `DockFlaeche station="design"` nur im Manuell-Zweig.
- `PlanView.tsx` (Fable-exklusiv):
  - `:187` — `designOberflaeche` gelesen.
  - `:926,2353` — `designOberflaeche === 'manuell'`-Renderzweige
    (Massketten-/Ansichts-Chrome, Eigenschaften-Panel-Verhalten).

**`plan-hit-test.ts` — KEIN Treffer** (grep `manuell|Oberflaeche` über die
Datei ergibt 0 Zeilen) — kein Schalter-Ort dort, nicht Cluster-B-relevant
für K15.

**Konsequenz für Tag B:** Die unter Abschnitt 2.3 empfohlene
Einstellungen-Checkbox für Design (`einstellung-design-manuell`) fasst
NUR `Einstellungen.tsx` an (liest/schreibt den bereits existierenden
`designOberflaeche`/`setDesignOberflaeche`-Store-Zugriff, exakt wie Vis es
für `visOberflaeche` tut) — das bleibt **innerhalb** des Sonnet-Dateikreises,
weil `Einstellungen.tsx` selbst NICHT Cluster B ist. Jede Änderung, die
stattdessen `DesignWorkspace.tsx`/`PlanView.tsx` selbst umbauen würde (z. B.
Verschieben/Umstrukturieren des Insel-Werkzeug-Zugangs, Ändern der
Sichtbarkeits-Logik der Manuell-Zweige) ist **STOPP → Fable**.

---

## 5 · Abgrenzung Tag-B-Scope vs. später

### Tag-B-Scope (E-K15 Schritt 2, gemäss diesem Dokument)
- EIN Schalter-Mechanismus: Bestehendes `kosmo.ui.v1`-Schema unverändert
  lassen (kein neuer Namensraum).
- Additive Einstellungen-Checkboxen für Design/Publish/Prepare
  (`einstellung-<station>-manuell`), Muster 1:1 aus
  `Einstellungen.tsx:762-775` (Vis) übernommen — NUR `Einstellungen.tsx`
  angefasst, Cluster B unberührt.
- NEU e2e-Spec(s): Manuell-Schalter je Station beweisbar (Insel-Werkzeug
  UND — wo neu — Einstellungen-Checkbox), Island-Rückweg, Reload-Persistenz
  — nach dem Muster `island-verdrahtung.spec.ts:88-123` (Design, bereits
  vollständig) und `vis-oberflaeche.spec.ts:390-435` (Vis
  Einstellungen-Schalter-Beweis) für Publish/Prepare nachgezogen.
- KEIN bestehender Island-/Manuell-Spec-Vertrag bricht — geschützte
  Testids (grep-belegt, s. Tabelle unten).

### Explizit SPÄTER (Folgeposten, nicht Tag B)
- **Voller CAD-Ausbau je Station** (Owner-Auftrag K21/K24/K30/K31:
  ArchiCAD-Werkzeugtiefe, Profil-Manager, echtes Ebenen-System) — das ist
  ein XL-Strang über mehrere Versionen, K15 vereinheitlicht nur den
  Schalter/Zugang, nicht den Werkzeuginhalt.
- **Island-/Manuell-Konzept für Data/Asset/Dev/Doc/Kxp/Paket/Train** — falls
  der Owner bestätigt, dass «alle Tools» auch die Utility-Stationen meint
  (offene Frage unten), ist das ein eigener PC5-artiger Strang (XL, pro
  Station eigener Insel-Katalog + `<station>Oberflaeche`-Feld + Manuell-
  Chrome — analog PC1/PC3/PC4-Aufwand je Station).
- **Publish-Dock-Preset-Freischaltung in der Einstellungen-UI** (Abschnitt 3)
  — Nebenfund, kein K15-Blocker, eigener kleiner Folgeposten.
- **Prepare-Dock-Panel-System** — bewusste, dokumentierte Bestandsgrenze,
  eigener Strang falls je gewünscht.

### Geschützte Bestands-Verträge (Testids/Specs — dürfen nicht brechen)

| Testid/Vertrag | Belegt in |
|---|---|
| `island-werkzeug-manuell` | `e2e/island-ui.spec.ts:117,409`, `e2e/island-leer.spec.ts:135`, `e2e/island-verdrahtung.spec.ts:89,102,136`, `e2e/popup-kollision.spec.ts:310`, `e2e/prepare-island.spec.ts:209`, `e2e/publish-island.spec.ts:193`, `e2e/publish-toggles.spec.ts:290`, `e2e/vis-oberflaeche.spec.ts:398` (Count 0 für Vis!) |
| `island-zurueck` | `DesignWorkspace.tsx:2857`, `VisWorkspace.tsx:691`, `PublishWorkspace.tsx:796`, `PrepareWorkspace.tsx:202` — genutzt u. a. in `e2e/island-verdrahtung.spec.ts:115`, `e2e/vis-island.spec.ts` |
| `einstellung-vis-manuell` | `Einstellungen.tsx:766`, geprüft in `e2e/vis-island.spec.ts:411`, `e2e/vis-oberflaeche.spec.ts:412,433` |
| globaler E2E-Seed `kosmoUiV1SeedMitManuell()` | `e2e/helpers/manuell-seed.ts:114-125`, eingebunden in `playwright.config.ts:2,80-113` — erzwingt `designOberflaeche`/`publishOberflaeche`/`prepareOberflaeche` = `'manuell'` für JEDE Spec ohne eigenen Seed (Bestandsschutz der ~150 klassischen Specs), `visOberflaeche` NICHT mehr erzwungen (echter Produktions-Default `'island'`) |
| `visManuellStorageState()` | `e2e/helpers/manuell-seed.ts:161-183` — Per-Spec-Seed für die 6 Vis-Manuell-only-Feature-Specs (`vis-onboarding.spec.ts`, `dock-layout.spec.ts`, `dock-presets.spec.ts`, `vis-ansichten.spec.ts`, `p8-081-screenshots.spec.ts`, `vis-token.spec.ts`-Legende-Teil) |
| ISLAND-UI-SPEZ §6 Sanktion 2 (globaler Manuell-Seed) | `docs/ISLAND-UI-SPEZ.md:298-311` |
| ISLAND-UI-SPEZ §6 Sanktion 6 (additiv, kein Ersatz) | `docs/ISLAND-UI-SPEZ.md:314-317` |

---

## 6 · Offene Fragen für Fable/Owner

1. **Gilt K15 auch für die sieben Utility-Stationen ohne Zeichenfläche**
   (Data/Asset/Dev/Doc/Kxp/Paket/Train)? Der Owner-Wortlaut («klassische
   cad oberfläche zum manuell zeichnen») spricht dagegen, «für alle tools»
   dafür. Empfehlung dieses Dokuments: NEIN für Tag B (kein Zeichenkontext),
   aber die Entscheidung liegt beim Owner/Fable.
2. **Soll Vis' entfernter Insel-Zugang (`island-werkzeug-manuell`)
   wiederhergestellt werden**, damit alle vier Stationen exakt dieselbe
   UI-Affordanz haben — oder reicht die hier empfohlene additive
   Einstellungen-Checkbox für Design/Publish/Prepare (Vis bleibt wie es
   0.8.10 E3 entschieden hat)? Dieses Dokument empfiehlt Letzteres
   (kleinerer, verlustfreier Eingriff, keine Wiederholung des bereits
   entschiedenen P-B2-Rückbaus).
3. **Publish-Dock-Presets für die Einstellungen-UI freischalten** (Typ
   erlaubt es bereits, UI blockt) — gehört das noch in Tag B oder ist das
   ein separater K14c-Folgeposten?

---

## Fable-Entscheide zu Abschnitt 6 (22.07.2026, verbindlich für Tag B)

1. **Utility-Stationen (Data/Asset/Dev/Doc/Kxp/Paket/Train): NEIN für
   Tag B.** K15 meint die klassische CAD-Oberfläche zum Zeichnen —
   Stationen ohne Zeichenfläche haben keinen Manuell-Modus zu gewinnen.
   Falls der Owner es anders will, ist das ein eigener Folgeposten.
2. **Vis' Insel-Zugang wird NICHT wiederhergestellt.** Der Rückbau war
   ein Owner-Entscheid (0.8.10 P-B2) und bleibt respektiert. Tag B
   ergänzt stattdessen ADDITIV die Einstellungen-Checkboxen für
   Design/Publish/Prepare nach dem Vis-Vorbild (einstellung-vis-manuell)
   — die bestehenden Insel-Werkzeuge der drei Stationen bleiben
   unverändert bestehen (zwei gleichwertige Zugänge, EIN Zustand
   kosmo.ui.v1).
3. **Publish-Dock-Preset-Freischaltung: NICHT Tag B** — eigener
   K14c-Folgeposten (Registerpflege beim Release).

Zusatz-Auflage für Tag B aus Befund 5: das asymmetrische
manuell-seed-Verhalten (design/publish/prepare erzwungen, vis echter
Default) darf sich um KEIN Byte ändern — die neuen Checkboxen sind rein
additiv in Einstellungen.tsx.
