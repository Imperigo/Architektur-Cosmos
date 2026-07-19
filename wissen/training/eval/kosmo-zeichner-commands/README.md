# Eval-Suite `kosmo-zeichner-commands` (v0.8.4/PD2, erweitert v0.8.5/PB2, v0.8.6/PA4)

Feste, versionierte Eval-Suite für den Adapter `kosmo-zeichner-commands`
(`../../REGISTRY.md`), gebaut in PD2 (`docs/V084-SPEZ.md` D14/C-23). Vorbild:
`../kosmo-zeichner-grundriss/` (README/prompts.json/pruefe-eval.mts) — dieselbe
Struktur, aber ein anderer Referenz-Weg (s. Ehrlichkeit unten).

## PB2-Nachtrag (v0.8.5, `docs/V085-SPEZ.md` §3 E4/C-12): 25→35 Prompts

10 neue Prompts (`cmd-26`..`cmd-35`) — je EIN Einzelschritt aus den drei
neuen Kosmo-Lauf-Drehbüchern unter `../kosmo-laufplaene/`
(`grundriss-rohbau`/`vis-demolauf`/`publish-blatt`): `design.aufbauErstellen`
(1×), `vis.nodeSetzen` mit den bisher NICHT abgedeckten Node-Typen
modell/kamera/stimmung/material/kombinierer/render (6×), `vis.verbinden`
(1×, bisher gar nicht in der Suite), `vis.render` (1×, bisher gar nicht in
der Suite) und `publish.ansichtPlatzieren` (1×, bisher gar nicht in der
Suite). Neue Kategorie `aufbau` (1 Prompt); die übrigen neun laufen in den
bestehenden Kategorien `vis`/`publish` mit.

**Bewusst weiterhin im `erwartung.typ: "command"`-Ein-Zug-Format der ersten
25**, nicht als "ganzer LaufPlan als Erwartung": `pruefe-eval.mts` (liegt
ausserhalb des PB2-Dateikreises — PB2 durfte nur `prompts.json`/
`eval-ergebnis.json` anfassen, s. `docs/V085-SPEZ.md`-Auftragsliste) prüft
einzig den Ein-Zug-`ScriptedProvider`/`ChatSession`-Weg; ein eigener
"kompletter LaufPlan als Erwartung"-Vergleichsmodus hätte diesen gesperrten
Prüfer selbst ändern müssen. Die ECHTE Mehrschritt-Prüfung (ganze Drehbücher,
inklusive Platzhalter-Auflösung und Ausführung gegen einen frischen
`KosmoDoc`) lebt eigenständig in `../kosmo-laufplaene/pruefe-laufplaene.mts`.
Stand nach der Erweiterung: **35/35 bestanden** (`eval-ergebnis.json`, per
`npx tsx pruefe-eval.mts` nachgeführt — derselbe Selbstcheck-Modus wie bei
den ersten 25, keine neue Prüf-Logik).

## PA4-Nachtrag (v0.8.6, `docs/V086-SPEZ.md` E8/D9): 35→38 Prompts, neues LaufPlan-Format

**D9 (Ausgangslücke):** `pruefe-eval.mts` kannte bis hierhin nur
`erwartung.typ: "command"` — EIN Nutzerwunsch → EIN Tool-Aufruf. Es gab kein
Erwartungsformat für eine ganze **Schritt-Folge** («Bitte → Plan», der Weg,
den der künftige Kosmo-Autopilot-Dialog aus E4 gehen soll, `docs/
V086-SPEZ.md` §3).

**E8-Lösung:** NEU `erwartung.typ: "laufplan"` — die Erwartung nennt eine
Schritt-Folge `[{ commandId, params? }]` statt eines Einzelschritts (3 neue
Prompts `cmd-36`..`cmd-38`: drei Geschosse in Folge, ein geschlossenes
Wand-Rechteck aus vier `design.wandZeichnen`-Schritten, zwei
`vis.nodeSetzen` + eine `vis.verbinden`). Der Prüfer baut daraus EIN
`SzenarioSkript` mit **mehreren `toolCalls` im selben Zug** (`scripted.ts`:
"mehrere = ein Paket, eine Diff-Karten-Kette") — der ECHTE, bereits heute
existierende Mehrfach-Vorschlags-Weg von `ChatSession#turn()`
(`schreibend`-Schleife, `paket`-Metadatum in `chat.ts`), NICHT ein
Kurzschluss-Aufruf. Geprüft wird: (1) alle `commandId`s sind reale,
aktuelle Kosmo-Werkzeuge, (2) `ChatSession` meldet in diesem EINEN Zug
genau so viele `onProposal`s wie erwartete Schritte, (3) Reihenfolge +
`commandId` je Position stimmen, (4) die genannten Schritt-Parameter
bestehen `validateToolCall()` UND sind eine Teilmenge der tatsächlichen
Parameter (dasselbe `enthaeltErwartete`-Prinzip wie beim Ein-Zug-Fall,
NUR je Schritt), (5) alle Schritte kommen als EINE Aktionskette an
(`paket.groesse === Schrittzahl`).

**Ehrliche Grenze — bewusst KEIN `lauf_planen`-Bezug:** E4
(`docs/V086-SPEZ.md` §3) definiert ein eigenes Nicht-Command-Tool
`lauf_planen` in `packages/kosmo-ai` — das existiert zum Zeitpunkt dieses
Pakets (PA4, Tag 1) noch NICHT (PB1 baut es erst Tag 2). Der PA4-Auftrag
verbietet ausdrücklich Änderungen an `packages/kosmo-ai`. Der LaufPlan-Fall
hier ist darum **vollständig im Prüfer gebaut**, mit dem, was `pruefe-
eval.mts` HEUTE bereits importiert (`ChatSession`/`ScriptedProvider`/
`commandTools`/`toolNameFor`) — er simuliert einen Plan als eine Kette
ECHTER `design.*`/`vis.*`-Tool-Aufrufe in einem Zug, nicht als ein
`lauf_planen`-Tool-Ergebnis. Das beweist denselben Plumbing-/Sequenz-/
Kernparameter-Vertrag, den ein künftiges `lauf_planen`-Ergebnis ebenfalls
erfüllen müsste — es beweist NICHT, dass `lauf_planen` selbst (sobald es
existiert) exakt in dieses Erwartungsformat passt; das ist Sache von PB1/E4.
Und wie beim PB2-Nachtrag oben gilt weiterhin: die ECHTE Mehrschritt-Prüfung
mit Platzhalter-Auflösung + Ausführung gegen einen frischen `KosmoDoc` bleibt
exklusiv `../kosmo-laufplaene/pruefe-laufplaene.mts` — dieser Prüfer hier
validiert weiterhin nur Schema/Sequenz, keine Doc-Ausführung.

Stand nach der Erweiterung: **38/38 bestanden** (`eval-ergebnis.json`, per
`npx tsx pruefe-eval.mts` nachgeführt).

## Dateien

- **`prompts.json`** — 38 feste deutsche Zeichner-Aufträge quer über die
  Command-Klassen Geschoss (`design.geschossErstellen`/`design.
  geschossKopieren`), Aufbau (`design.aufbauErstellen`, PB2-Nachtrag), Wand
  (`design.wandZeichnen`), Zone (`design.zoneErstellen`/`design.
  raumTypSetzen`), Öffnung (`design.oeffnungSetzen`/`design.tuerSetzen`),
  Masskette (`design.massKetteSetzen`), Kommentar (`design.kommentarSetzen`),
  `vis.*` (`vis.graphErstellen`/`vis.nodeSetzen`/`vis.nodeParametrieren`/
  `vis.verbinden`/`vis.render`, die letzten beiden PB2-Nachtrag) und
  `publish.*` (`publish.setSpeichern`/`publish.blattErstellen`/`publish.
  ansichtPlatzieren`, letzterer PB2-Nachtrag) — plus **vier Ablehn-Fälle**
  (fehlende Koordinaten, fehlendes Pflichtfeld, ausserhalb des
  Befehlsumfangs, Echtzeit-Render ohne HomeStation) — plus **drei
  LaufPlan-Fälle** (`cmd-36`..`cmd-38`, PA4-Nachtrag, s. oben). Jeder Prompt
  trägt ein maschinenlesbares `erwartung`-Feld (`typ: "command"` mit
  `commandId`+`params`, `typ: "ablehnung"`, oder `typ: "laufplan"` mit
  `schritte: [{commandId, params?}]`) plus den deutschen `nutzerwunsch` und
  den Text, den das ScriptedProvider-Skript als Kosmo-Antwort abspielt
  (`kosmoText`).
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
  (Skript-Zug ohne Tool-Aufruf) erzeugt NULL `onProposal`-Meldungen, (5) ein
  LaufPlan-Fall (mehrere Tool-Aufrufe im selben Zug, PA4-Nachtrag) erzeugt
  genau so viele `onProposal`s wie erwartete Schritte, in Sequenz, als EINE
  Aktionskette. Schreibt `eval-ergebnis.json` (eingecheckt) + eine
  Konsolentabelle mit der Quote je Kategorie.

## Aufruf

```bash
cd kosmo-orbit
npx tsx ../wissen/training/eval/kosmo-zeichner-commands/pruefe-eval.mts
```

Exit-Code 0 nur wenn alle 38 Prompts bestehen, sonst 1. Deterministisch:
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
| `laufplan` (PA4, v0.8.6) | alle erwarteten `commandId`s sind reale, aktuelle Kosmo-Werkzeuge UND `ChatSession` meldet in EINEM Zug genau so viele `onProposal`s wie erwartete Schritte, in derselben Sequenz/`commandId`-Reihenfolge, mit den genannten Schritt-Parametern als Teilmenge, als EINE Aktionskette (`paket`-Metadatum) |
