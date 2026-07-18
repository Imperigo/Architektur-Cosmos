# Eval-Suite `kosmo-zeichner-commands` (v0.8.4/PD2)

Feste, versionierte Eval-Suite für den Adapter `kosmo-zeichner-commands`
(`../../REGISTRY.md`), gebaut in PD2 (`docs/V084-SPEZ.md` D14/C-23). Vorbild:
`../kosmo-zeichner-grundriss/` (README/prompts.json/pruefe-eval.mts) — dieselbe
Struktur, aber ein anderer Referenz-Weg (s. Ehrlichkeit unten).

## Dateien

- **`prompts.json`** — 25 feste deutsche Zeichner-Aufträge quer über die
  Command-Klassen Geschoss (`design.geschossErstellen`/`design.
  geschossKopieren`), Wand (`design.wandZeichnen`), Zone (`design.
  zoneErstellen`/`design.raumTypSetzen`), Öffnung (`design.oeffnungSetzen`/
  `design.tuerSetzen`), Masskette (`design.massKetteSetzen`), Kommentar
  (`design.kommentarSetzen`), `vis.*` (`vis.graphErstellen`/`vis.nodeSetzen`/
  `vis.nodeParametrieren`) und `publish.*` (`publish.setSpeichern`/`publish.
  blattErstellen`) — plus **vier Ablehn-Fälle** (fehlende Koordinaten,
  fehlendes Pflichtfeld, ausserhalb des Befehlsumfangs, Echtzeit-Render ohne
  HomeStation). Jeder Prompt trägt ein maschinenlesbares `erwartung`-Feld
  (`typ: "command"` mit `commandId`+`params`, oder `typ: "ablehnung"`) plus
  den deutschen `nutzerwunsch` und den Text, den das ScriptedProvider-Skript
  als Kosmo-Antwort abspielt (`kosmoText`).
- **`pruefe-eval.mts`** — ausführbarer Prüfer, EIN Modus (Selbstcheck, kein
  Kandidaten-Modus — Begründung unten): fährt jeden Prompt als Ein-Zug-Skript
  über den ECHTEN `ScriptedProvider` durch die ECHTE `ChatSession`
  (`@kosmo/ai`, exakt das Muster aus `packages/kosmo-ai/test/scripted.test.ts`)
  und prüft: (1) die erwartete `commandId` ist ein reales, aktuelles
  Kosmo-Werkzeug (`commandTools()`), (2) die erwarteten Parameter bestehen die
  ECHTE zod-Validierung (`validateToolCall`, innerhalb von `ChatSession#turn()`
  aufgerufen), (3) genau EIN `onProposal` mit exakt dieser `commandId` und
  diesen Parametern (Teilmengen-Vergleich — ein vom Schema ergänzter Default
  wie `alignment: 'zentrum'` bricht den Vergleich nicht), (4) ein Ablehn-Fall
  (Skript-Zug ohne Tool-Aufruf) erzeugt NULL `onProposal`-Meldungen. Schreibt
  `eval-ergebnis.json` (eingecheckt) + eine Konsolentabelle mit der Quote je
  Kategorie.

## Aufruf

```bash
cd kosmo-orbit
npx tsx ../wissen/training/eval/kosmo-zeichner-commands/pruefe-eval.mts
```

Exit-Code 0 nur wenn alle 25 Prompts bestehen, sonst 1. Deterministisch:
zwei Läufe hintereinander liefern byte-gleiche `eval-ergebnis.json` bis auf
das reine Zeitstempel-Feld `erzeugt_um` (geprüft per Doppellauf-Diff im
PD2-Abschlussbericht).

## Ehrlichkeit (GRENZE) — warum dieser Prüfer ANDERS ist als das Grundriss-Vorbild

Der Grundriss-Prüfer hat einen echten Kernel-GENERATOR als Referenz
(`generiereGrundriss`/`zerlegeRektilinear`) — er kann eine externe
Modell-Antwort strukturell gegen ein reproduzierbares Ergebnis prüfen. Für
"Nutzerwunsch → Tool-Call" gibt es **weder einen deterministischen
Kernel-Algorithmus noch einen trainierten HomeStation-Checkpoint**
(`../../REGISTRY.md`: `kosmo-zeichner-commands` → HomeStation-Stand "nicht
trainiert"). Das Skript je Prompt in `prompts.json` IST hier die Referenz —
von Hand gegen die echten Command-Titel/-Beschreibungen aus
`packages/kosmo-kernel/src/commands/*.ts` formuliert, nicht aus einem
Algorithmus abgeleitet.

**Das misst dieser Prüfer WIRKLICH:** den DATENSATZ-/Schema-Weg mit einem
deterministischen Mock (`ScriptedProvider`) durch die echte
`ChatSession`-Integration — ob `commandTools()` die erwarteten Werkzeuge noch
kennt, ob die erwarteten Parameter noch gegen das aktuelle zod-Schema
bestehen, und ob der Diff-Karten-Gate-Weg (Vorschlag statt sofortiger
Ausführung) für jede Command-Klasse fehlerfrei durchläuft. Das ist ein
**Integrations-/Regressions-Beweis, KEIN Modell-Eval** — es bewertet nicht,
ob ein LLM (lokal oder Cloud) aus einem deutschen Satz selbstständig den
richtigen Tool-Call bauen würde. Ein Kandidaten-Modus (externe Modell-Antwort
statt Skript) ist hier bewusst NICHT gebaut: anders als beim
Grundriss-Vorbild hat "Nutzerwunsch → Tool-Call" keine geometrische Kennzahl,
gegen die sich eine externe Antwort strukturell einordnen liesse, ohne selbst
wieder nur das Schema zu re-implementieren — ein solcher Modus würde sich in
der Praxis auf denselben `validateToolCall()`-Aufruf reduzieren, den dieser
Prüfer bereits über den echten `ChatSession`-Weg ausführt.

## Kriterien (Kurzfassung — Volltext in `prompts.json` unter `kriterien_legende`)

| `erwartung.typ` | Kriterium |
|---|---|
| `command` | erwartete `commandId` ist ein reales, aktuelles Kosmo-Werkzeug UND die erwarteten Parameter bestehen `validateToolCall()` gegen das ECHTE zod-Schema UND `ChatSession` meldet genau EINEN `onProposal` mit exakt dieser `commandId`/diesen Parametern |
| `ablehnung` | das Skript enthält für diesen Zug KEINEN Tool-Aufruf — `ChatSession` meldet NULL `onProposal`-Aufrufe für den Zug |
