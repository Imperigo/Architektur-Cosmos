# V088-SPEZ — v0.8.8 «Beweglich» (eingefroren 19.07.2026)

> Drei Tagespläne EINER Version: A «Kern & Ketten» / B «Sicht & Fluss» /
> C «Abnahme & Release (verschlankt)». **Owner-Rahmen (bindend, 19.07.):**
> bis v0.9.0 KEIN Rundgang-PDF und KEINE Installer-Zustellung (der Owner
> testet erst bei 0.9.0 wieder); der CI-Build-Request läuft weiter
> (Website-«neuster Installer»-Kette); E2E-Gates bleiben voll
> (Fable-Entscheid). Owner-Entscheide (AskUserQuestion): **Marquee-
> Occlusion JA** («überwiegend sichtbar», Reissleine) · **Fake-Render aufs
> Blatt JA** (Pflicht-Label, Grössen-Deckel) · Name **«Beweglich»**.
> Arbeitsmodell: Fable = Spez/Urteil/Gates/Commits/Nachzüge; Sonnet-Pakete
> in disjunkten Dateikreisen, maximal parallel. Format-Vorbild
> `V087-SPEZ.md`; Lehren-Grundlage `lehren/v0.8.6.md` + `v0.8.7.md`.

## 1 · Auftrag

Substanz statt Demo-Politur (Owner-Testpause): Kernel-Asymmetrien
schliessen (verschieben/eigenschaftSetzen kennen endlich alle Kinds),
zwei ehrliche Ketten durchziehen (SIA-416-Flächennachweis-CSV,
Vis→Publish-Bild), Autopilot nach Fehlern fortsetzbar machen, 3D-Auswahl
schärfen (Occlusion, Esc-Kanal), Test-/Eval-Basis härten. Alles
golden-still — 0.8.9 fährt den Golden-Sammelwechsel auf sauberer Basis.

## 2 · Verifizierte Diagnosen (D1–D9, je mit Fundstelle)

- **D1** `design.verschieben` (design.ts:541-595) kennt masskette/
  kommentar/furniture/beam/boundary/etikett NICHT (default wirft) — die
  App umschifft das seit PB5-084/PB1-085 mit Löschen+Neusetzen-Gruppen
  (neue IDs je Drag).
- **D2** `editableFields`/allowed (design.ts:702-754) fehlt u.a.
  `Zone.number` (Raumnummer, entities.ts:258 — ohne Setzweg!),
  `Zone.raumTyp`, `Furniture.rotationGrad`, `Column.material/b/t/
  rotationGrad`, `Beam.breite/hoehe/material`, Opening-Detailfelder.
- **D3** `derive/sia416.ts:50` `areaReport` rechnet den Flächennachweis
  komplett (HNF/NNF/VF/FF/KF je Geschoss, NGF, aGF) — aber es gibt
  KEINEN Export; CSV-Muster etabliert (`ausmassAlsCsv`
  derive/ausmass.ts:185, `transmittalCsv`).
- **D4** `LaufRunner` (kosmo-ai lauf-runner.ts:117-148): nach Fehler
  bleibt der Rest 'offen', `starte()` ist danach No-Op — kein
  `fortsetzenAb`/`wiederholeSchritt`. Die lauf-runtime-Flake-URSACHE ist
  gefunden: der Doppel-Start-Test (test:144-155) awaited nicht, geleckte
  Makrotask-Schritte schreiben in Docs SPÄTERER Tests derselben Datei
  (Vitest isolate:true — dateiübergreifend ist nichts geteilt);
  `zuruecksetzen()` neutralisiert die schwebende `.then()`-Kette nicht.
- **D5** Marquee-Occlusion ist günstig: `idsImFrustum`
  (Viewport3D.tsx:1725-1738) + EIN Raycast je Kandidat NUR im pointerup
  (raycaster/ndc vorhanden, O(k·n) einmalig, <20 ms realistisch).
  0.8.7 deklarierte «ohne Occlusion» als Nicht-Ziel — Owner hat das
  Upgrade am 19.07. freigegeben.
- **D6** Der Esc-Marquee-Abbruch hängt an `stopImmediatePropagation` +
  React-Effektreihenfolge (Viewport3D onKey :2005-2035 vs. der
  unabhängige DesignWorkspace-window-Listener :867-940) — die
  idiomatische Brücke ist `state/viewport-chrome-runtime.ts` (Viewport3D
  schreibt dort bereits).
- **D7** `NodeCanvas.tsx` ist SVG (nicht Canvas): `PORT_FARBE` (:86-93,
  6 Hex) kann direkt `var()` konsumieren. Echtes 2D-Canvas im vis-Modul
  nur `island/inhalte/stimmung.tsx` (8 Gradient-Hex) — das
  `getComputedStyle`-Muster existiert (Viewport3D:811, cursor-zustand).
- **D8** Vis→Publish-Kette offen: `SheetImage.assetId` (entities.ts:437,
  «LEERER Slot bis HomeStation») wird von der Fake-Aufnahme nie gefüllt;
  `publish.bildFuellen` (publish.ts:534) + `assetAusDataUrl` (:408) +
  Asset-GC (`assetNochReferenziert` :454) existieren — die Doc-Ablage
  via ImageAsset ist BESTANDSMUSTER (die vis-runtime-Kopfregel betrifft
  Job-Laufzeit, kein Widerspruch).
- **D9** **ÖREB-Live ist NICHT baubar** (Live-GET-Check 19.07.): die
  echte `ech/SearchServer`-Antwort hat KEIN `attrs.egrid` (EGRID nur in
  label/detail), die Koordinaten-Query liefert leere results, der
  Extract-Pfad unter api.geo.admin.ch gibt 404, der echte Gateway
  `oereb.geo.admin.ch` ist nicht in der Proxy-Allowlist → der
  Fixture-Vertrag BLEIBT; Live = 0.9.x-Kandidat (Owner-Gate + neue
  CSP-Domain auf BEIDEN Trägern).

## 3 · Entscheide (E1–E8, bindend)

- **E1 verschieben-Symmetrie** (Kernel, additiv): neue Zweige, alle
  in-place, Identität bleibt — `masskette` (punkte[]-Shift), `kommentar`
  (at), `furniture` (at; rotationGrad unberührt), `beam` (a/b),
  `boundary` (outline), `etikett` (at; **targetId bleibt**). Undo via
  invertPatches byte-symmetrisch.
- **E2 editableFields-Ausbau**: NUR string|number-Felder, je Feld
  Wert-Validierung VOR jedem Patch (rotationGrad-Bereich, b/t > 0,
  raumTyp gegen die zoneErstellen-Enum, number als String erlaubt);
  Arrays (beschlaege) ehrlich ausgeschlossen. Fehlermeldung nennt die
  erlaubten Felder je Kind (Bestandsmuster :757).
- **E3 `flaechennachweisCsv(doc)`** additiv in derive/sia416.ts
  (de-CH-Format exakt nach ausmassAlsCsv-Muster; parzelle/nachbar-Zonen
  bleiben ausgenommen — Bestandsregel), Export-Knopf in
  publish/island/inhalte/austausch.tsx neben Transmittal/Ausmass.
- **E4 Autopilot-Fortsetzung**: `LaufRunner.fortsetzenAb(index)` +
  `wiederholeSchritt(index)` — NUR aus Fehler-/Abbruch-Zustand, NUR auf
  expliziten Nutzerklick (E4-Sanktion v0.8.5 gilt fort), gleiche
  Macrotask-Yield+Abbruch-Mechanik wie starte(). `state/lauf-runtime.ts`
  bekommt einen Generations-Guard (Stale-Runner-Writes werden ignoriert,
  der AKTIVE Runner schreibt durch — Härtung und Feature sind EIN Paket
  mit gemeinsamem 20×-Gate); Testdatei erhält afterEach-Drain.
  KosmoPanel-Knöpfe «Ab Schritt N fortsetzen»/«Schritt N wiederholen»
  NUR im Fehler-/Abbruch-Zustand sichtbar.
- **E5 Marquee-Occlusion**: Sichtbarkeits-Filter als Post-Verarbeitung
  von idsImFrustum, AUSSCHLIESSLICH im pointerup (nie onPointerMove);
  Mehrpunkt-Sample je Kandidat (Bbox-Mitte + bis 4 Ecken, Kurzschluss
  beim ersten freien Strahl) — Semantik «überwiegend verdeckt wird
  ausgelassen» (steht so in den Neuigkeiten); Raycast überspringt
  LineSegments/Griffe/Overlay (Selbst-Occlusion-Falle); Perf-Beweis
  <20 ms am Demo-Doc.
- **E6 Esc-Zustands-Kanal**: neues Feld `marqueeAktiv` in
  `viewport-chrome-runtime.ts`; Viewport3D setzt bei Start und räumt bei
  Ende/Esc/pointercancel/Unmount; der DesignWorkspace-Escape-Zweig
  prüft den Store (Fable-Nachzug); `stopImmediatePropagation` fällt.
- **E7 Fake→Blatt**: «Aufs Blatt legen»-Aktion am Render-Node — Fake-
  Aufnahme (dataUrl) → bestehendes `publish.bildFuellen` (Command wird
  NICHT geändert); harter Deckel (Base64 > ~1 MB → ehrliche Fehlerzone
  mit Verkleinerungs-Hinweis); Titel/Label zwingend
  «Vorschau (Fake-Render)»; Undo leert den Slot, GC räumt das Asset;
  `.kosmo`-Grösse wird gemessen, nicht geraten.
- **E8 Eval-Ausbau** (nur wissen/training/eval/**): Mehr-Zug-Dialoge
  (mehrere SkriptZüge + je-Turn-Erwartung; IDs AUSSCHLIESSLICH über den
  @ref-Weg — keine Laufzeit-ID-Rückkopplung, ehrliche Grenze bleibt
  dokumentiert); `docUnveraendert` wird echter `doc.toJSON()`-Byte-Diff;
  Negativfälle: Mehrfach-commandId-Dedup + `furniture.rotationGrad =
  'schräg'` wird als Command-Fehler abgewiesen (verankert E2).

## 4 · Betrieb (bindend)

- **Cluster A** Viewport3D.tsx: PB1 ist das EINZIGE Paket der Version;
  PA4 darf Viewport3D NICHT anfassen (cssVar-Helfer NEU in
  packages/kosmo-ui, Konsolidierung des lokalen Viewport3D-Helfers ist
  späterer Nachzug). **Cluster B** DesignWorkspace.tsx+PlanView.tsx:
  NUR Fable (Workaround-Umstellung Tag A abends, Esc-Guard Tag B).
  Vis-Modul: PA4 → PB2 seriell (beide berühren NodeCanvas.tsx).
- Worktrees + npm install; Agenten-Ports 5174–5177, Fable 5183; Preview
  IMMER aus apps/kosmo-orbit/; Foreground-Dispatch, Copy-back per cp,
  absolute cd, pkill-Bracket solo; Build/Start/Prüfung NIE verkettet
  (Lehre v0.8.7 §3).
- Reissleinen: PB1 16:00 (Occlusion fällt → Esc-Kanal landet allein,
  Occlusion bleibt Nicht-Ziel) · Fable-Workaround-Umstellung darf
  TEILweise landen (Rest = benannter Aufschub, C-3 akzeptiert das).

## 5 · Golden-Politik

Komplett byte-still (Sanktion 1): kein Paket berührt derive-SVG-Pfade
(PA2 ist eine additive CSV-Funktion, kein SVG). Alle Golden-Beweger
liegen in 0.8.9 (GOLDEN-WECHSEL-089-Sammelwechsel).

## 6 · Sanktionen

1. Golden-Diff ≠ leer = Paket ungültig.
2. verschieben-Zweig, der Identität wechselt oder ein Feld verliert
   (Löschen+Neusetzen im Kernel nachgebaut) = ungültig; angetastete
   Etiketten-targetId = ungültig.
3. Neues editableFields-Feld ohne Wert-Validierung oder mit Array-Typ =
   ungültig.
4. Autopilot-Fortsetzung ohne expliziten Nutzerklick oder aus
   Nicht-Fehler-Zustand = ungültig (E4 v0.8.5 gilt fort).
5. Fremde Hotspot-Dateien angefasst = ungültig; DesignWorkspace/PlanView
   nur Fable; je Cluster EIN Paket gleichzeitig.
6. Neue Hex statt Token = ungültig; Viewport3D von PA4 berührt =
   ungültig.
7. Occlusion-Raycast ausserhalb des pointerup = ungültig.
8. Base64 über dem Deckel ins Doc oder Fake-Bild ohne
   «Vorschau (Fake-Render)»-Kennzeichnung = ungültig.
9. Eval-Zug mit Laufzeit-ID-Rückkopplung oder Command-Vollzug =
   ungültig (@ref-Weg ist Vertrag).
10. Rundgang-PDF erzeugt oder Installer zugestellt = Ritualverstoss;
    Build-Request NICHT angestossen = C-14 rot.
11. Hintergrund-Warten = Weckruf + Protokollvermerk.

## 7 · Vollständigkeits-Matrix (Abnahme Tag C)

- [x] **C-1** verschieben bewegt masskette/kommentar/furniture/beam/boundary/etikett in-place: Identität, targetId, rotationGrad und alle Nicht-Punkt-Felder bleiben; Undo byte-symmetrisch → PA1
- [x] **C-2** eigenschaftSetzen: neue Felder setzbar; Falschwerte (rotationGrad 'schräg', b ≤ 0, raumTyp ausserhalb Enum) werfen VOR jedem Patch, Fehlermeldung nennt erlaubte Felder → PA1
- [x] **C-3** DesignWorkspace-Drags nutzen EIN verschieben statt Löschen+Neusetzen (EIN Undo, ID stabil); Rest-Workarounds als benannter Aufschub dokumentiert → Fable
- [x] **C-4** Goldens byte-still (sha256 HEAD↔Arbeitsbaum) + svg-qa 36/0 → alle
- [x] **C-5** Flächennachweis-CSV == areaReport (Stichprobe nachgerechnet), de-CH-Format, parzelle/nachbar ausgenommen, Export-Knopf per E2E → PA2
- [x] **C-6** Autopilot: Fehler → «Fortsetzen» führt GENAU die offenen Schritte aus, «Wiederholen» genau einen; kein Auto-Start; Knöpfe nur im Fehler-/Abbruch-Zustand → PA5
- [x] **C-7** lauf-runtime 20× am Stück grün; Stale-Runner-Write nachweislich ignoriert, aktiver (auch fortgesetzter) Runner schreibt durch → PA5
- [x] **C-8** Esc bricht die Marquee-Geste über den Store-Kanal ab, ohne die Auswahl zu leeren; kein stopImmediatePropagation mehr im Pfad → PB1/Fable
- [x] **C-9** Vollständig verdecktes Element wird vom Marquee NICHT gewählt, teilsichtbares schon; Raycast nur im pointerup; <20 ms; Griffe/LineSegments raycast-blind → PB1
- [x] **C-10** Port-Farben + Stimmungs-Canvas folgen dem Theme-/Akzent-Wechsel (Computed-Style-/Pixel-Beweis); grep: kein neuer Hex ausserhalb aura.css → PA4
- [x] **C-11** Aufnahme → Blatt: Asset im Doc, Label «Vorschau (Fake-Render)» sichtbar, Undo leert + GC räumt, Deckel wirft ehrlich, .kosmo-Grösse belegt → PB2
- [x] **C-12** Eval: Mehr-Zug via @ref grün, Byte-Diff-docUnveraendert, Dedup- und rotationGrad-Negativfälle; KEIN Zug führt Commands aus → PA3
- [x] **C-13** 0× waitForTimeout in plan-interaktion/kurztasten-pan/multi-auswahl, act()-Warnung weg, force:true-Audit dokumentiert, Suiten grün → PB3
- [x] **C-14** Verschlanktes Ritual komplett: Matrix, lehren/v0.8.8.md, Sechs-Träger-Bump, Neuigkeiten (ehrliche Grenzen), §0-Delta, Notiz (Owner-Testpause benannt, Smoke-Puffer-Zeile bleibt), release-gate 0, Build-Request-Push — und NACHWEISLICH kein PDF/keine Zustellung → PC/Fable


### Ergebnis der Matrix-Abnahme (19.07.2026, Tag C)

13 unabhängige adversariale Prüfer (Workflow-Fan-out, je Zelle einer,
StructuredOutput; C-14 = das verschlankte Release-Ritual selbst) gegen
den Live-Build auf :5183: **10/13 sofort bestanden, 3 Funde — 1 gefixt,
2 als dokumentierte Grenzen geurteilt:**

- **C-11 (Fund, gefixt):** der ältere Manuell/Einfach-Weg in
  VisWorkspace («Aufs Blatt» am Render-Job) trug eine EIGENE
  Platzierungs-Kopie ohne E7-Deckel und ohne Pflicht-Label. Fix:
  vis-jobs exportiert den gehärteten Kern `platziereBildAufsBlatt`,
  VisWorkspace ruft ihn statt der Kopie; Regressionstest in
  `e2e/vis-publish-bild.spec.ts` (Commit `59b5f98`, ROADMAP 518).
- **C-10 (dokumentierte Grenze):** Token-Brücke mechanisch erfüllt
  (kein Hex mehr, vis-token 4/4 mit Override-Beweis, Viewport3D
  unberührt) — die Port-/Stimmungs-Token sind aber bewusst
  theme-invariant definiert (gegatete Tag-A-Entscheidung, ROADMAP 510):
  ein echter Theme-/Akzent-Wechsel ändert sie nicht. Eigene
  Theme-Paletten für die 14 Werte = 0.8.9-Kandidat mit Owner-Blick.
- **C-12 (dokumentierte Wortlaut-Abweichung, bereits ROADMAP 511):**
  der rotationGrad-Negativfall ist im Eval strukturell unmöglich, ohne
  Sanktion 9 zu brechen (Wert-Validierung feuert erst im Command-run) —
  er lebt als Kernel-Unit-Test (`verschieben-symmetrie.test.ts`), der
  Eval deckt den Unbekanntes-Feld-Weg (cmd-45); Prüfer-Rerun 45/45.
  Mehr-Zug/@ref, Byte-Diff und Dedup sind uneingeschränkt bestanden.

Zusatzbefund C-1 (kein Blocker): furniture/beam/boundary/etikett sind
in der 2D-Zieh-Geste noch nicht freigeschaltet (VERSCHIEBBAR-Set in
plan-hit-test.ts) — 0.8.9-Kandidat. C-14: Ritual nachweislich OHNE
Rundgang-PDF und OHNE Installer-Zustellung (Sanktion 10, Owner-Rahmen
bis 0.9.0); der `.desktop-build-request`-Push folgt unmittelbar auf den
Release-Commit. Zellen-Verdicts mit Beweisen im Workflow-Journal
(wf_54cd4155); Details ROADMAP 518.

## 8 · Ehrliche Nicht-Ziele

ÖREB-Live (D9-Befund; 0.9.x-Kandidat mit Owner-Gate + neuer CSP-Domain)
· swisstopo-mcp (Lizenz ⚠ + MCP-Spec 28.07.) · Schnitt-Verschneidung
A1-Rest, CAD-Ebenen meta.layer/locked, Blattverzeichnis/Sammellegende,
Golden-Sammelwechsel, Treppen-3D-Griffe (alle → 0.8.9) ·
Autopilot-Auto-Start (E4 bleibt) · Rundgang-PDF + Installer-Zustellung
(bis 0.9.0; Build-Request läuft) · Occlusion-Echtzeit-Vorschau während
des Aufziehens · Inspector-Vollausbau der neuen editableFields
(Kosmo-Tools sofort mächtig, UI selektiv als Fable-Nachzug) ·
echte-Render-Grössenstrategie (nur Deckel + benannte Grenze) ·
Viewport3D-cssVar-Konsolidierung (späterer Nachzug) ·
HomeStation-/Owner-Konto-Posten.
