# v0.7.5 Welle 2 A2 — Projekt-Stammdatenmodell (`docs/V075-VORSCHLAG.md` A2)

*Owner-Punkt A2, «der strukturell wichtigste Punkt» im v0.7.5-Vorschlag. Dieser Eintrag dokumentiert
ehrlich, was gebaut wurde — UND was aus dem ursprünglichen A2-Titel bewusst NICHT gebaut wurde,
weil die Recherche zeigte, dass es ein etabliertes Prinzip gebrochen hätte.*

## 0 · Ehrliche Abgrenzung — warum «Persistenz-Vereinheitlichung» aus dem Titel NICHT umgesetzt ist

Der A2-Vorschlag in `V075-VORSCHLAG.md` nennt «Projekt-/Auftrags-Stammdatenmodell +
Persistenz-Vereinheitlichung» in einem Atemzug und verweist auf den «H-43»-Befund in
`docs/SIM-BEFUNDE.md» (localStorage neben Yjs gemischt). Die Recherche vor dem Bau ergab:

- **H-43 ist bereits behoben** — es gibt keinen offenen Persistenz-Mischstand mehr, gegen den
  gearbeitet werden müsste.
- Die verbleibenden `localStorage`-Schlüssel im Repo sind **bewusst korrekt Laufzeit-Zustand**, kein
  vergessener Modell-Rest: `CLAUDE.md` hält den Grundsatz **«Laufzeit ≠ Modell»** ausdrücklich fest
  (Base64-Bilder, GLB-Binärdaten, Job-Status gehören in Laufzeit-Stores, nicht ins Doc/Yjs). Diese
  Trennung ist eine bewusste Architekturentscheidung, kein Bug.

**Konsequenz:** diese Runde zieht NICHTS aus `localStorage` ins Doc — das würde das Prinzip
brechen, das die Entscheidung eigentlich schützen soll. Was gebaut wurde, ist der machbare,
golden-sichere Kern des A2-Punkts: ein echtes, additives Stammdatenmodell für Bauherr/Adresse/
Parzellennummer/Verfasser, mit Commands, geguardetem Plankopf und einem Erfassungs-Panel.

## 1 · Modell (`packages/kosmo-kernel/src/model/doc.ts`)

Neues Interface `ProjektInfo` (additiv, alle Felder optional):

```ts
export interface ProjektInfo {
  bauherr?: string;
  adresse?: string;
  parzelleNr?: string;
  verfasser?: string;
  fristen?: { label: string; datum: string }[];
}
```

Neues Feld `DocSettings.projekt?: ProjektInfo` — bewusst GETRENNT von:

- `standort: ProjektStandort | null` (WGS84/LV95-Koordinaten für Sonnenstudie/Vermessung, V2-V4) —
  Koordinaten und Stammdaten sind unabhängige Fakten derselben Parzelle.
- `parzellenFlaeche: number | null` (reine Kennzahl für die AZ-Rechnung) — bleibt **unverändert an
  Ort und Stelle**, nicht in `projekt` verschoben, um den Bestand nicht zu brechen.

`defaultSettings` bekommt **keinen** `projekt`-Eintrag (Absenz = `undefined`, wie bei
`materialPrioritaeten`/`themen`/`keynotes`/`schnitt`/`pocheModus` — dieselbe additive Familie).
`KosmoDoc.fromJSON` merged bereits `{...defaultSettings, ...json.settings}` — ein Alt-Dokument ohne
`projekt`-Schlüssel lädt darum verlustfrei, ohne Sonderbehandlung.

## 2 · Commands (`packages/kosmo-kernel/src/commands/design.ts`)

- **`design.projektInfoSetzen`** — additiver Merge (Muster: `design.prioritaetSetzen`/
  `materialPrioritaeten`): nur übergebene Felder ändern sich, der Rest bleibt stehen. Absenz-Sentinel
  ist `{}` (nicht `null`/`undefined`) — bleibt unter `exactOptionalPropertyTypes` gültig zuweisbar,
  ohne je `undefined` explizit auf ein optionales Feld zu schreiben. Nach vollem Undo landet
  `doc.settings.projekt` darum bei `{}`, nicht bei `undefined` — beide lesen sich über
  `doc.settings.projekt?.bauherr` identisch als «nicht gesetzt» (Plankopf-Guard unterscheidet nicht).
- **`design.projektNameSetzen`** — schliesst die bisherige Lücke: `projectName` wurde bisher NUR bei
  der Projekterstellung gesetzt (`project-vault.ts:257`, `App.tsx:1229`), es gab **keinen** Command
  zum Umbenennen. Jetzt eine reguläre, undo-fähige Mutation, damit auch Kosmo den Projektnamen ändern
  kann (jedes registrierte Command-Schema wird automatisch ein Kosmo-Tool).

Beide Commands folgen dem Schmalpatch-Muster (`before`/`after` nur mit dem betroffenen Feld, wie
`design.schnittSetzen`/`design.pocheModusSetzen`) — Undo, Yjs-Patch-Transport und `.kosmo`-Export
funktionieren automatisch, ohne Sondercode.

## 3 · Plankopf (geguardet, Goldens byte-stabil)

`derive/stilblatt.ts` bekommt eine neue reine Funktion `plankopfStammdatenZeile(projekt)`: liefert
`null`, wenn weder `bauherr` noch `verfasser` gesetzt sind, sonst `"Bauherr: … · Verfasser: …"`.
`derive/plansvg.ts` (`planToSvg`) und `derive/sheet.ts` (`sheetToSvg`) rufen diese Funktion und
zeichnen eine zusätzliche Zeile im Plankopf **ausschliesslich**, wenn sie nicht `null` ist:

- `plansvg.ts`: zusätzliche `<text>`-Zeile innerhalb des bestehenden 18-mm-Plankopf-Streifens.
- `sheet.ts`: die Plankopf-Box (`kh`) wächst von 26 auf 31 mm, wenn die Zeile erscheint — der
  Box-BODEN (`ky + kh`) bleibt dabei am Blattrand fix, nur die Box wächst nach oben.

**Ohne `DocSettings.projekt`-Daten ist die erzeugte SVG-Ausgabe byte-identisch zu vor A2** — bewiesen
durch `npm test -w @kosmo/kernel` (0 geänderte Goldens) + `npm run svg-qa` (s. Golden-Wechsel-Beleg
`docs/GOLDEN-WECHSEL-075.md`, Abschnitt A2).

## 4 · UI-Panel (`apps/kosmo-orbit/src/modules/design/StammdatenPanel.tsx`)

Neues Panel im bestehenden **Projekt-Menü** (`DesignWorkspace.tsx`, `projektMenuOffen` — dieselbe
Fokus-Stufe «selten» wie Phase/Teilphase/Darstellung/Poché, T7-Prinzip: Stammdaten wechseln über
Jahre kaum). Fünf Felder: Projektname (Umbenennen), Bauherr, Adresse, Parzellennummer, Verfasser.
Jedes Feld committet erst bei Blur (nicht bei jedem Tastendruck) als EIN Command — Muster wie das
Zonen-Namensfeld in `Inspector.tsx` (`defaultValue` + `key`-Remount statt Controlled-Input, sonst
tippt man gegen den eigenen Undo-Stack). Testids: `stammdaten-projektname`, `stammdaten-bauherr`,
`stammdaten-adresse`, `stammdaten-parzelle-nr`, `stammdaten-verfasser`.

`Fristen` (Termine) ist im Modell/Command additiv vorhanden, hat aber in dieser Runde **kein
UI-Feld** — bewusst vertagt, kein Bug (kleinerer Folgepunkt für eine Termin-Übersicht/Kosmo-Erinnerung).

## 5 · EHRLICH offen: DocSettings ist noch NICHT live-kollaborativ gesynct

Jede `DocSettings`-Änderung läuft wie jede andere Doc-Mutation über **Undo** (Patch-Inverse),
**Vault-Persistenz** (`project-vault.ts`, IndexedDB-Autosave von `doc.toJSON()` inkl. `settings`) und
den **`.kosmo`-Paketexport** (`project-io.ts`) — Stammdaten sind vollständig persistent, auch über
einen Browser-Neustart hinweg.

**ABER**: `packages/kosmo-sync`s `SyncClient` synct heute **nur `entities`** live zwischen offenen
Sitzungen — `SettingsPatch`es (die `{settings: true, before, after}`-Form aus `AnyPatch`) werden
NICHT über Yjs an andere offene Clients übertragen. Öffnet Person B dasselbe Projekt in einer
zweiten, gleichzeitig laufenden Sitzung, sieht sie Person As neu gesetzten Bauherrn erst nach einem
Neuladen (das die Vault-Persistenz liest), nicht live.

Das ist eine **vertagte Folgearbeit an `@kosmo/sync`** (SettingsPatch-Transport übers Yjs-Dokument
ergänzen, analog zum bestehenden Entity-Sync) — **kein Bug dieser Runde** und ausdrücklich NICHT Teil
dieses A2-Batches. Dieser Batch liefert das Stammdatenmodell selbst; die Live-Kollaboration darauf
ist ein eigener, klar benannter nächster Schritt.
