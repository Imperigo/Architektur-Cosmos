# Kosmo-Läufe (LaufPläne) — `wissen/training/eval/kosmo-laufplaene/`

Drei geprüfte `LaufPlan`-JSONs (v0.8.5/PB2 «Autopilot-Drehbücher + Eval»,
`docs/V085-SPEZ.md` §3 E4, C-11/C-12) — Vorbild: `../kosmo-zeichner-commands/`
(README/prompts-artige Datei je Drehbuch/pruefe-Skript), aber ANDERS als dort:
hier prüfen wir keine "Nutzerwunsch → Tool-Call"-Einzelzüge, sondern ganze
mehrschrittige `LaufPlan`s gegen das reale PA3-Fundament (`packages/kosmo-ai/
src/lauf-plan.ts#pruefeLaufPlan`, `lauf-runner.ts#LaufRunner`).

## Dateien

- **`grundriss-rohbau.json`** — Geschoss + 4 Wände (geschlossenes 8×6 m
  Rechteck) + eine Zone, ausschliesslich `design.*`-Commands.
- **`vis-demolauf.json`** — derselbe Weg wie `e2e/vis-demolauf.spec.ts`
  (v0.8.4 PC2), hier als EIN `LaufPlan`: `vis.graphErstellen` →
  `vis.nodeSetzen` ×6 → `vis.verbinden` ×5 → `vis.nodeParametrieren` →
  `vis.render` (backbone `flux2-klein`, Stimmung `abend`). Endet beim
  Render-AUFTRAG — die Fake-Bridge-Ausführung übernimmt danach die
  App-Laufzeit (Executor-Watcher), nicht der Plan selbst (genau wie im
  Original-Spec).
- **`publish-blatt.json`** — ein Planblatt + zwei Ansichten (Axonometrie +
  Schnitt), ausschliesslich `publish.*`-Commands.
- **`pruefe-laufplaene.mts`** — ausführbarer Prüfer (Vorbild
  `../kosmo-zeichner-commands/pruefe-eval.mts`): parst jede Datei mit
  `pruefeLaufPlan` (`@kosmo/ai`), prüft JEDE `commandId` gegen die ECHTE
  Kernel-Command-Registry (`getCommand()`/`allCommands()` aus
  `@kosmo/kernel`) UND führt den Plan tatsächlich gegen einen frischen,
  leeren `KosmoDoc` aus (`execute()`, derselbe Weg wie `runCommand` in der
  App) — das ist der stärkste verfügbare Beweis, dass ein Drehbuch nicht nur
  strukturell valide ist, sondern wirklich durchläuft. Schreibt eine
  Konsolentabelle, Exit-Code 0 nur wenn alle drei Drehbücher grün sind.

## Platzhalter-Konvention (`@ref:...`) — warum es sie braucht

`LaufPlan`/`LaufRunner` (PA3-Bestand, `lauf-plan.ts`/`lauf-runner.ts`, für
PB2 GESPERRT — nur nutzen) sind bewusst **rein statisch**: ein Schritt trägt
fixe `params`, es gibt dort KEINE Interpolation/Referenz auf das Ergebnis
eines früheren Schritts (`lauf-plan.ts`-Kopfkommentar: "BEWUSST kein Bezug
zu `@kosmo/kernel`"; `lauf-runner.ts`: `FuehreAus` liefert nur eine
`summary`-Zeichenkette zurück, keine Struktur). Gleichzeitig vergibt der
Kernel JEDE Entity-ID erst zur Laufzeit, zufällig (`model/ids.ts#newId`) —
eine Wand kann nicht im Voraus wissen, welche ID "ihr" Geschoss bekommt, das
derselbe Plan zwei Schritte vorher selbst erst anlegt.

Darum verwenden alle drei Drehbücher hier einen Platzhalter-String-Vertrag,
den NICHT der PA3-Runner auflöst (der bekommt die Parameter unverändert),
sondern eine kleine Auflöse-Funktion, die WIR schreiben — einmal in
`pruefe-laufplaene.mts` (direkt gegen `KosmoDoc`/`execute()`) und einmal im
E2E-Beweis `e2e/autopilot-drehbuecher.spec.ts` (im Browser gegen
`window.__kosmo.state()`), BEVOR der jeweilige Plan an
`window.__kosmoLauf.starte(...)` übergeben wird. Das ist genau die Stelle,
an der ein künftiger echter Kosmo-Dialog ohnehin stünde: Kosmo sieht den
aktuellen Doc-Zustand (Kontext/Journal) und würde einen Plan mit BEREITS
AUFGELÖSTEN IDs verfassen — die Auflösung hier ist die Lade-Zeit-Simulation
genau dieses Schritts, kein Umbau des Runners.

**Syntax:** ein `params`-Wert (oder ein Feld irgendwo verschachtelt darin),
der EXAKT einer dieser Formen entspricht, wird vor der Ausführung ersetzt:

| Platzhalter | Löst auf zu |
|---|---|
| `@ref:storey:<name>` | `id` des Geschosses mit `name === <name>` (`doc.byKind('storey')`) |
| `@ref:aufbau:<name>` | `id` des Aufbaus mit `name === <name>` (`doc.byKind('assembly')`) |
| `@ref:sheet:<name>` | `id` des Planblatts mit `name === <name>` (`doc.byKind('sheet')`) |
| `@ref:graph:<name>` | `id` des Render-Graphen mit `name === <name>` (`doc.byKind('visgraph')`) |
| `@ref:node:<graphName>:<typ>` | `id` des Nodes vom Typ `<typ>` im Graphen `<graphName>` |

Jede Referenz ist NAME-qualifiziert (nie "der erste/einzige X") — auch wenn
in unseren drei Drehbüchern je Kind nur eine Entity entsteht, bleibt die
Auflösung so eindeutig und robust, falls ein Drehbuch künftig gegen einen
Doc mit bereits vorhandenen Entitäten läuft (z.B. den App-Bootstrap-Storeys
"EG"/"1.OG"). Fehlt die referenzierte Entity, wirft die Auflöse-Funktion
ehrlich einen Fehler (kein stilles `undefined` an `execute()`).

**Kein Kernel-/PA3-Umbau:** die Platzhalter sind reine Strings in unseren
eigenen JSON-Dateien, interpretiert von unserem eigenen Prüf-/Testcode — für
`pruefeLaufPlan` sind sie ganz normale, gültige `params: unknown`-Werte (das
Schema prüft nur Titel/Schritte/commandId/begruendung, nicht den Inhalt von
`params`). Ein Plan, der UNAUFGELÖST direkt an `window.__kosmoLauf.starte()`
ginge, würde beim betroffenen Schritt ehrlich mit einer `CommandError`
scheitern (z.B. `Geschoss «@ref:storey:Rohbau EG» existiert nicht`) — genau
das beweist, dass die Platzhalter zur Laufzeit wirklich etwas auflösen
müssen, kein Kosmetik-Feld sind.

## Befehls-Ids — real, grep-verifiziert (keine erfundene Id, Sanktion 3)

Jede in den drei Drehbüchern verwendete `commandId` wurde gegen
`packages/kosmo-kernel/src/commands/{design,vis,publish}.ts` geprüft
(`grep -n "id: '" …`) UND wird zusätzlich vom Prüfer unten zur Laufzeit
gegen `getCommand()`/`allCommands()` verifiziert:

`design.geschossErstellen`, `design.aufbauErstellen`, `design.wandZeichnen`,
`design.zoneErstellen`, `vis.graphErstellen`, `vis.nodeSetzen`,
`vis.verbinden`, `vis.nodeParametrieren`, `vis.render`,
`publish.blattErstellen`, `publish.ansichtPlatzieren`.

## Aufruf

```bash
cd /home/user/worktrees/pb2/kosmo-orbit
npx tsx ../wissen/training/eval/kosmo-laufplaene/pruefe-laufplaene.mts
```

Exit-Code 0 nur wenn alle drei Drehbücher (a) strukturell valide sind
(`pruefeLaufPlan`), (b) ausschliesslich reale `commandId`s verwenden UND
(c) vollständig gegen einen frischen `KosmoDoc` durchlaufen (inkl.
Platzhalter-Auflösung), sonst 1 mit einer Fehlertabelle.

## Bezug zur Eval-Suite `kosmo-zeichner-commands`

Die dortige Erweiterung (25→35 Prompts, C-12) fügt 10 EINZEL-Command-Prompts
hinzu, die je EINEN Schritt aus einem der drei Drehbücher hier abbilden
(gleiche `commandId`/`params` wie ein Schritt oben) — bewusst weiterhin im
`erwartung.typ: "command"`-Format der bestehenden 25, weil
`pruefe-eval.mts` (ausserhalb des PB2-Dateikreises, nur lesend genutzt) nur
diesen Ein-Zug-Weg über `ScriptedProvider`/`ChatSession` prüft; ein eigener
"kompletter LaufPlan als Erwartung"-Modus hätte den gesperrten Prüfer selbst
ändern müssen. Details/Ehrlichkeits-Vermerk: `../kosmo-zeichner-commands/
README.md`-Nachtrag.
