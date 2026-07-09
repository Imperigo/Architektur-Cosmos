# BEWEGUNGSKONZEPT 0.6.6 — Wie bewegt man sich durch KosmoOrbit?

**Status: verbindliche Spec für alle 0.6.6-Streams.** Owner-Frage: *Wann muss
was sichtbar sein? Die Oberfläche passt sich komplett dynamisch an — die
Entscheidung passiert automatisch im Hintergrund, von Kosmo und dem System
intuitiv entschieden; der Benutzer soll nichts spezifisch auswählen müssen.*

## 1. Antwort in einem Satz

Die Oberfläche folgt der **Tätigkeit**, nicht dem Menü: KosmoOrbit erkennt aus
dem Verhalten (Werkzeug, Ansicht, Eingabegerät, Bauphase, Rolle, Station), was
der Mensch gerade tut, wählt daraus einen **Arbeitsmodus**, und der Modus
bestimmt, welche Werkzeuge und Panels prominent sind — sichtbar, ehrlich
angezeigt, jederzeit übersteuerbar.

## 2. Die neun Tätigkeiten als Arbeitsmodi

| Modus | Erkennungssignale (Auswahl) | Was ist sichtbar | Was tritt zurück |
|---|---|---|---|
| **Entwerfen** | Volumen-/Zonen-Werkzeuge, 3D/Axo, frühe siaPhase | Massen-Werkzeuge, Kennzahlen live, Schattenstudie | Werkplan-Export, Bemassungs-Detail |
| **Zeichnen** | 2D-Plan aktiv, Wand/Tür/Bemassung, Werkplan-Phase | Zeichenwerkzeuge, Fang/Raster, Geschoss-Leiter, Bemassung | Render/Vis-Bezüge, Moodboard |
| **Ideen entwickeln** | KosmoVis/Moodboard, Drei-Stimmungen, Referenz-Sprünge | Node-Palette, Bildvergleich, Referenz-Andockung | Masslisten, Export |
| **Recherchieren** | KosmoData-Suche, Wissen/Referenzen-Tabs | Suche, Facetten, Dossiers, Quellensprung | Erfassungsformulare |
| **Daten erfassen** | KosmoData-Formulare, Import-Flüsse | Formulare, Import, Validierung | Browsing-Fächer |
| **iPad-Skizzieren** | Stift-Pointer (`pointerType: 'pen'`), SketchOverlay | Stift-Paletten, Annäherungs-Vorschläge, grosse Ziele | Dichte Werkzeugleisten (Touch-Masse) |
| **Varianten vergleichen** | Varianten-Archiv, Parallel-Axis, Bildvergleich | Vergleichsflächen, Kennzahlen-Matrix | Einzelbearbeitung |
| **PDF exportieren** | Publish/Export-Pfade, Set-Auswahl | Blattlisten, Sets, Exportkette, Revision | Zeichenwerkzeuge |
| **3D modellieren** | Mesh-Edit/Module/FreeMesh, 3D-Ansicht | Mesh-/Modul-Werkzeuge, Texturen, Kamera | 2D-Bemassung |

0.6.6-Rollout: die Design-Station trägt die Modi **Entwerfen, Zeichnen,
iPad-Skizzieren, Varianten vergleichen, PDF exportieren, 3D modellieren**
vollständig; **Ideen entwickeln / Recherchieren / Daten erfassen** sind im
Kern modelliert und wirken vorerst als Stations-Zuordnung (Vis/Data) — der
Feinrollout dort ist 0.6.7 (ehrlich vertagt).

## 3. Entscheidungslogik (deterministisch, erklärbar)

`state/arbeitsmodi-kern.ts` — reine Funktionen, Vitest-gedeckt:

- **Signale**: aktives Werkzeug · viewMode · offene Panels · `pointerType`
  (Stift/Touch/Maus) · siaPhase (Projekt) · rolle (Einstellungen) · Station
  (bestehendes `setzeAktuelleStation`) · Nutzungszähler (bestehende
  Adaption) · zuletzt gelaufene Commands.
- **Scoring-Matrix**: jedes Signal gibt gewichtete Punkte je Modus; höchster
  Score gewinnt. Keine Lernmagie in 0.6.6 — die Matrix ist lesbar und im
  Konzept dokumentierbar («warum bin ich im Zeichnen-Modus? Weil 2D + Wand +
  Werkplan-Phase»).
- **Hysterese**: Moduswechsel frühestens nach 5s Signal-Stabilität
  (Debounce), Wechsel-Schwelle = amtierender Modus bekommt +2 Bonus. Nichts
  flackert.
- **Festhalten**: `modusFesthalten` friert den Modus ein; `modusAutomatik:
  aus` schaltet die Erkennung ganz ab (dann zeigt die Oberfläche wie heute
  alles).

## 4. Schichtenmodell — Auflösung der Invarianten-Spannung

Heute gilt (state/fokus.ts): Adaption ändert **nur Dimmung, nie
Erreichbarkeit**. Der Owner will echtes Ein-/Ausblenden. Auflösung in drei
Schichten, von grob nach fein:

1. **Arbeitsmodus** (NEU): bestimmt, welche Werkzeug-SETS und Panel-Layouts
   überhaupt aufgebaut sind. Blendet ganze Gruppen ein/aus.
2. **Fokus-Dimmung** (Bestand, unangetastet): innerhalb des sichtbaren Satzes
   hebt/dimmt die Nutzungs-Adaption einzelne Werkzeuge (primaer/sekundaer/
   selten).
3. **Manuelle Panels** (Bestand): was der Mensch explizit öffnet, bleibt offen
   — manuelle Handlung schlägt Automatik bis zum nächsten Moduswechsel.

**Die Erreichbarkeits-Garantie wandert eine Ebene hoch**: was ein Modus
ausblendet, ist im «Mehr»-Fächer der Werkzeugleiste IMMER vollständig
vorhanden. Nichts wird unerreichbar — nur unprominent. Das ist die
fokus.ts-Philosophie, auf Modi übertragen.

## 5. Ehrlichkeits-UI (kein stiller Zauber)

- **Modus-Chip** in der Statuszeile: `Modus: Zeichnen · automatisch`. Ein
  Klick öffnet: Modus wechseln (Liste), **festhalten**, **Automatik aus**.
- Wechselt die Automatik den Modus, wird der Chip kurz akzentuiert
  (`--k-feder`) — man SIEHT, dass sich etwas angepasst hat, und warum
  (Tooltip: «2D-Plan + Wandwerkzeug erkannt»).
- Wenn **Kosmo** den Modus setzt (ui.*-Command), erscheint im Kosmo-Panel die
  Zeile «Kosmo hat auf ‹Exportieren› gestellt» — dieselbe Ehrlichkeit wie bei
  Diff-Karten.
- Opt-out ist eine Einstellung, kein verstecktes Flag.

## 6. Kosmo als Mitentscheider — der ui.*-Namensraum

Neu `state/ui-befehle.ts`: eine app-seitige Command-Registry im Stil von
`registerCommand` (flüchtig, undo-frei, KEINE Doc-Patches):
`ui.panelSetzen · ui.werkzeugSetzen · ui.ansichtSetzen · ui.modusSetzen ·
ui.modusAutomatik · ui.zustandLesen`. Damit nutzen **drei Konsumenten
denselben Pfad**: die Modus-Automatik, Kosmo (als LLM-Werkzeuge über
`packages/kosmo-ai`), und E2E-Tests (deterministisches Setzen). Der UI-Zustand
selbst wandert aus dem flüchtigen useState des DesignWorkspace in den
zustand-Store `state/ui-zustand.ts` (persistiert als `kosmo.ui.v1`).

## 7. Rolle, Bauphase, Auftrag

- **Rolle** (`doc.settings.rolle`): gewichtet die Matrix (Bauleiter → Daten
  erfassen/Recherchieren-Bonus; Entwerfer → Entwerfen/Ideen-Bonus) und
  sortiert wie bisher Kacheln/Fächer.
- **Bauphase** (siaPhase): Phasen-Presets (`phasen-presets.ts`) werden von
  einem manuellen Banner zur **Signalquelle** — die Phase spricht in der
  Matrix mit, das Banner bleibt als Erklärung.
- **Auftrag**: es gibt noch kein Projekt-Stammdaten-/Auftragsmodell
  (auftragsbuch.ts ist das Dev-Workorder-Buch). 0.6.6 führt nur einen
  optionalen Signal-Stub; das echte Auftragsmodell ist 0.6.7 — ehrlich
  benannt, nicht simuliert.

## 8. E2E-Strategie (1633 testids bleiben wahr)

- Die Playwright-Init-Fixture setzt `kosmo.ui.v1` mit `modusAutomatik: aus`
  (+ reduced-motion) — **alle Bestandsspecs sehen die heutige Voll-UI**,
  kein testid verschwindet.
- Nur neue Specs (`arbeitsmodi.spec.ts`, `kosmo-ui-bruecke.spec.ts`) schalten
  die Automatik explizit ein und testen Moduswechsel, Chip, Übersteuerung,
  Kosmo-Zugriff.
- Sichtbarkeits-Sets sind Daten im Kern (Vitest), nicht verstreute
  Bedingungen im JSX — die Matrix ist als Ganzes testbar.

## 9. Ehrliche Grenzen 0.6.6

Kein Lernen über die deterministische Matrix hinaus · kein Auftragsmodell ·
Modi-Feinrollout nur Design-Station · Persistenz bleibt localStorage (nicht
Projektdatei/Sync). Alles dokumentiert in der Vertagungsliste des Plans.
