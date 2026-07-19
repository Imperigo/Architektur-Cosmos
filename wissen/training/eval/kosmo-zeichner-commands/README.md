# Eval-Suite `kosmo-zeichner-commands` (v0.8.4/PD2, erweitert v0.8.5/PB2, v0.8.6/PA4, v0.8.7/PA3)

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

## PA3-Nachtrag (v0.8.7, `docs/V087-SPEZ.md` §3 E7): 38→41 Prompts, echter `lauf_planen`-Weg

**D8 (Ausgangslücke):** der PA4-Nachtrag oben (E8, `'laufplan'`) simuliert
einen Plan bewusst über MEHRERE echte Command-Tool-Aufrufe im selben Zug —
`lauf_planen` selbst (E4, v0.8.6/PB1) existierte zu jenem Zeitpunkt noch
nicht und durfte von PA4 auch nicht gebaut werden. Seit v0.8.6/PB1 gibt es
das Werkzeug wirklich (`packages/kosmo-ai/src/tools.ts`
`LAUF_PLANEN_TOOL_NAME`/`laufPlanTool`/`validateLaufPlanCall`, verdrahtet in
`chat.ts#turn()`, testid `lauf-vorschlag-root` in `KosmoPanel.tsx`) — aber
`pruefe-eval.mts` prüfte dieses Tool-Format bis PA3 nicht (ehrliche Grenze,
Kopfkommentar vor PA3 + ROADMAP 487).

**E7-Lösung:** NEU `erwartung.typ: "lauf-vorschlag"` (positiv, `cmd-39`/
`cmd-40`: Drei-Geschosse-Plan, Vier-Wände-Rechteck) UND
`"lauf-vorschlag-abgelehnt"` (Negativfall, `cmd-41`). Der Prüfer baut daraus
EIN `SzenarioSkript` mit GENAU EINEM Tool-Aufruf ans echte `lauf_planen`-
Werkzeug (`{name: LAUF_PLANEN_TOOL_NAME, args: {titel, schritte}}`) — anders
als beim `'laufplan'`-Fall (mehrere Command-Aufrufe im selben Zug) ist das
hier ein einziger Aufruf an ein einziges Nicht-Command-Werkzeug. Zusätzlich
registriert der Prüfer `onLaufVorschlag` bei der `ChatSession` (`spieleAb`)
und prüft für `'lauf-vorschlag'`: (1) genau EIN `LaufVorschlag` feuert,
(2) `plan.titel` + Schrittfolge (commandId-Sequenz + Kernparameter als
Teilmenge, dieselbe `enthaeltErwartete`-Logik wie beim `'laufplan'`-Fall)
entsprechen der Erwartung, (3) KEIN `onProposal` feuert (Sanktion 4:
«Eval-Zug, der onProposal auslöst oder Commands ausführt = ungültig» — ein
Vorschlag ist keine Ausführung), (4) der vom Prüfer selbst gehaltene
`KosmoDoc` bleibt unverändert (kein Command lief). Für
`'lauf-vorschlag-abgelehnt'` trägt der Plan (mindestens) eine ERFUNDENE
commandId nach dem `design.dasGibtEsNicht`-Muster — `ChatSession` weist sie
VOR jeder Karte ab (`bekannteCommandIds`, C-12-Fund v0.8.6,
`chat.ts:403-417`): erwartet wird KEIN `LaufVorschlag`, KEIN `onProposal`,
und ein Tool-FEHLER-Ergebnis in der Session-Historie, das den erwarteten
Fehlertext-Ausschnitt («unbekannte commandId») enthält.

**Dateikreis-Grenze:** dieses Paket durfte nur `wissen/training/eval/**`
anfassen — `LAUF_PLANEN_TOOL_NAME`/`LaufVorschlag`/`onLaufVorschlag` waren
bereits vor PA3 aus `packages/kosmo-ai` exportiert (v0.8.6/PB1), `packages/
kosmo-ai` wurde für dieses Paket nur GELESEN, nichts dort geändert.

Stand nach der Erweiterung: **41/41 bestanden** (`eval-ergebnis.json`, per
`npx tsx pruefe-eval.mts` nachgeführt).

## PA3-Nachtrag (v0.8.8, `docs/V088-SPEZ.md` §3 E8/§6 Sanktion 9/§7 C-12): 41→45 Prompts, Mehr-Zug + Byte-Diff + zwei weitere Negativfälle

**Ausgangslücke:** `pruefe-eval.mts` kannte bis hierhin nur Ein-Zug-Prompts
(ein `nutzerwunsch`/`erwartung`-Paar je Prompt) — es gab kein Format für
einen mehrteiligen Dialog, in dem ein späterer Zug auf eine Entity
verweist, die ein früherer Zug DESSELBEN Prompts gerade erst vorgeschlagen
hat. Ausserdem prüfte `docUnveraendert` (lauf-vorschlag/-abgelehnt) nur
über die Heuristik `doc.revision === 0 && doc.entities.size === 0`
(ROADMAP-498) statt über einen echten Vergleich, und es fehlte ein
Negativfall für einen *tatsächlichen* Tool-Aufruf, der an der zod-
Validierung scheitert (anders als `ablehnung`, wo das Skript gar keinen
Tool-Aufruf enthält).

**E8-Lösung, drei Teile:**

1. **Mehr-Zug** — NEU `kategorie: "mehrzug"` mit einer `zuege`-Liste
   (`cmd-42`/`cmd-43`) statt eines einzelnen `nutzerwunsch`/`erwartung`-
   Paars. Jeder Zug läuft als eigener `SkriptZug` über MEHRERE
   `session.send()`-Aufrufe DERSELBEN `ChatSession` (`spieleAbMehrzug`);
   jeder Zug wird gegen seine eigene Erwartung geprüft
   (`command`/`ablehnung`/`laufplan` — mehr ist bewusst nicht unterstützt).
   **Bindende Grenze (Sanktion 9, H-37):** ein `SzenarioSkript` bleibt
   STATISCH — die Parameter von Zug 2 stehen zur AUTORENZEIT in
   `prompts.json`, NIE abgeleitet aus der tatsächlichen, zur Laufzeit vom
   Kernel vergebenen ID einer in Zug 1 vorgeschlagenen Entity. Referenzen
   über Züge hinweg laufen darum AUSSCHLIESSLICH über den literalen
   `@ref:kind:name`-String (`lauf-refs.ts`-Konvention) — der Prüfer LÖST
   diesen String nie auf, er beweist nur, dass er unverändert durch den
   ScriptedProvider→ChatSession→Proposal-Weg läuft. `cmd-42`: Geschoss
   anlegen → Zone im Geschoss via `@ref:storey:<name>`. `cmd-43`: Aufbau
   anlegen → Wand mit diesem Aufbau via `@ref:aufbau:<name>`. **Bewusste
   Abweichung vom ursprünglich skizzierten «Wand → Öffnung»-Beispiel:**
   `lauf-refs.ts#loeseWertAuf`s `kindKarte` kennt nur `storey`/`aufbau`/
   `sheet`/`graph` (+ `node`) als `@ref`-Kinds — `wall` ist dort NICHT
   gelistet (Wände tragen im Kernel auch gar kein `name`-Feld). Ein
   `@ref:wall:...` wäre ein erfundener, von der echten Konvention nicht
   gedeckter Platzhalter gewesen — für ein Paket, dessen ganzer Zweck
   «IDs ausschliesslich über den @ref-Weg» ist, wurde stattdessen der
   ebenfalls reale `aufbau`-Kind gewählt. Zwischen zwei Zügen ruft
   `spieleAbMehrzug` `session.resolveApplied()`/`resolveLaufAbgelehnt()`
   für jeden offenen Vorschlag — das simuliert KEINEN Kernel-Command-Vollzug
   (kein `doc.apply()` an irgendeiner Stelle), sondern signalisiert dem
   `ScriptedProvider` intern nur „dieser Zug ist fertig, spiel den
   nächsten" (dessen `zugIndex`-Buchhaltung).
2. **Byte-Diff** (ROADMAP-498) — `docUnveraendert` ist jetzt in `spieleAb`/
   `spieleAbMehrzug` ein echter Vergleich `JSON.stringify(doc.toJSON())` vor
   dem ersten und nach dem letzten Zug, für JEDEN Fall (nicht nur
   `lauf-vorschlag`/`lauf-vorschlag-abgelehnt`).
3. **Zwei neue Negativfälle:** (a) `cmd-44` — ein `lauf_planen`-Plan mit
   ZWEI verschiedenen erfundenen commandIds, eine davon zweimal im Plan
   wiederholt; NEU `erwartung.dedupFragmente` (optional, additiv auf
   `lauf-vorschlag-abgelehnt`) beweist, dass die bestehende
   `[...new Set(unbekannt)]`-Dedup in `chat.ts` (C-12-Fund v0.8.6,
   unverändert) beide Namen nennt und keinen davon wiederholt. (b) `cmd-45`
   — NEU `erwartung.typ: "command-fehler"` (`PromptCommandFehler`): ein
   ECHTER Tool-Aufruf (`design.eigenschaftSetzen` mit `feld: "rotationGrad"`,
   `wert: "schräg"` auf einer `furniture`-Entity), den `validateToolCall()`
   ablehnt, BEVOR er zur Diff-Karte wird (kein `onProposal`, Doc bleibt
   Byte-gleich). **Ehrlicher Stand (verankert PA1-088/E2):** Live-Sondierung
   19.07.2026 gegen den PA3-088-Worktree-HEAD zeigt, dass `editableFields`
   (`packages/kosmo-kernel/src/commands/design.ts:702-723`) `rotationGrad`
   noch NICHT kennt — PA1-088/E2 (paralleles Paket) fügt dieses Feld erst
   hinzu. Der Fall prüft darum HEUTE den generischen zod-Ablehnungsweg
   „unbekanntes Feld" (`feld: Invalid option: expected one of …`). **Sobald
   PA1-088/E2 landet** und `rotationGrad` ein bekanntes `eigenschaftSetzen`-
   Feld wird, greift stattdessen dessen WERT-Validierung (`"schräg"` ist
   keine gültige Zahl) — `erwartung.enthaeltFehlertext` bei `cmd-45` muss
   dann auf die neue Meldung nachgeführt werden (s. `notiz`-Feld bei
   `cmd-45` in `prompts.json`, rein dokumentarisch, fliesst in keine
   Prüf-Logik ein).

**Dateikreis-Grenze:** dieses Paket durfte nur `wissen/training/eval/**`
anfassen — `packages/kosmo-ai`/`packages/kosmo-kernel` wurden für dieses
Paket nur GELESEN (u.a. zur Live-Sondierung der zod-Fehlermeldung für
`cmd-45`), nichts dort geändert.

Stand nach der Erweiterung: **45/45 bestanden** (`eval-ergebnis.json`, per
`npx tsx pruefe-eval.mts` nachgeführt).

## Dateien

- **`prompts.json`** — 45 feste deutsche Zeichner-Aufträge quer über die
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
  LaufPlan-Fälle** (`cmd-36`..`cmd-38`, PA4-Nachtrag, s. oben) — plus **drei
  lauf_planen-Vorschlagsfälle** (`cmd-39`..`cmd-41`, PA3-Nachtrag, s. oben:
  zwei positive + ein Negativfall mit erfundener commandId) — plus **zwei
  Mehr-Zug-Fälle** (`cmd-42`/`cmd-43`, PA3-Nachtrag v0.8.8, s. oben) — plus
  **zwei weitere Negativfälle** (`cmd-44` Dedup bei zwei erfundenen
  commandIds, `cmd-45` `eigenschaftSetzen`-Feld-Ablehnung, PA3-Nachtrag
  v0.8.8, s. oben). Jeder Ein-Zug-Prompt trägt ein maschinenlesbares
  `erwartung`-Feld (`typ: "command"` mit `commandId`+`params`, `typ:
  "ablehnung"`, `typ: "laufplan"` mit `schritte: [{commandId, params?}]`,
  `typ: "lauf-vorschlag"` mit `titel`+`schritte: [{commandId, params?,
  begruendung?}]`, `typ: "lauf-vorschlag-abgelehnt"` mit zusätzlich
  `enthaeltFehlertext`+optional `dedupFragmente`, oder NEU `typ:
  "command-fehler"` mit `commandId`+`params`+`enthaeltFehlertext`) plus den
  deutschen `nutzerwunsch` und den Text, den das ScriptedProvider-Skript als
  Kosmo-Antwort abspielt (`kosmoText`). Ein Mehr-Zug-Prompt (`kategorie:
  "mehrzug"`) trägt STATT `nutzerwunsch`/`kosmoText`/`erwartung` eine
  `zuege`-Liste — je Zug dasselbe `nutzerwunsch`/`kosmoText`/`erwartung`-Tripel
  (nur `command`/`ablehnung`/`laufplan` als `erwartung.typ` unterstützt).
- **`pruefe-eval.mts`** — ausführbarer Prüfer, EIN Modus (Selbstcheck, kein
  Kandidaten-Modus — Begründung unten): fährt jeden Ein-Zug-Prompt als
  Ein-Zug-Skript, jeden Mehr-Zug-Prompt als Zugfolge über MEHRERE
  `session.send()`-Aufrufe DERSELBEN Session, über den ECHTEN
  `ScriptedProvider` durch die ECHTE `ChatSession` (`@kosmo/ai`, exakt das
  Muster aus `packages/kosmo-ai/test/scripted.test.ts`) und prüft: (1) die
  erwartete `commandId` ist ein reales, aktuelles Kosmo-Werkzeug
  (`commandTools()`), (2) die erwarteten Parameter bestehen die ECHTE
  zod-Validierung (`validateToolCall`, innerhalb von `ChatSession#turn()`
  aufgerufen), (3) genau EIN `onProposal` mit exakt dieser `commandId` und
  diesen Parametern (Teilmengen-Vergleich — ein vom Schema ergänzter Default
  wie `alignment: 'zentrum'` bricht den Vergleich nicht), (4) ein Ablehn-Fall
  (Skript-Zug ohne Tool-Aufruf) erzeugt NULL `onProposal`-Meldungen, (5) ein
  LaufPlan-Fall (mehrere Tool-Aufrufe im selben Zug, PA4-Nachtrag) erzeugt
  genau so viele `onProposal`s wie erwartete Schritte, in Sequenz, als EINE
  Aktionskette, (6) ein lauf_planen-Vorschlagsfall (EIN Aufruf ans echte
  `lauf_planen`-Werkzeug, PA3-Nachtrag) erzeugt genau EINEN `onLaufVorschlag`
  mit dem erwarteten Titel/der erwarteten Schrittfolge und KEINEN
  `onProposal`, UND eine erfundene commandId im Plan wird VOR jeder Karte als
  Tool-FEHLER abgewiesen (bei mehreren erfundenen commandIds dedupliziert
  genannt, PA3-Nachtrag v0.8.8), (7) ein Mehr-Zug-Fall (PA3-Nachtrag v0.8.8)
  prüft jeden Zug einzeln UND dass der Doc-Zustand über die ganze Folge
  Byte-gleich bleibt (`JSON.stringify(doc.toJSON())` vorher/nachher, ersetzt
  die alte `revision`/`entities`-Heuristik, ROADMAP-498), (8) ein
  `command-fehler`-Fall (PA3-Nachtrag v0.8.8) prüft, dass ein ECHTER
  Tool-Aufruf VOR jeder Diff-Karte an der zod-Validierung scheitert. Schreibt
  `eval-ergebnis.json` (eingecheckt) + eine Konsolentabelle mit der Quote je
  Kategorie.

## Aufruf

```bash
cd kosmo-orbit
npx tsx ../wissen/training/eval/kosmo-zeichner-commands/pruefe-eval.mts
```

Exit-Code 0 nur wenn alle 45 Prompts bestehen, sonst 1. Deterministisch:
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
| `lauf-vorschlag` (PA3, v0.8.7) | das Skript ruft das ECHTE `lauf_planen`-Werkzeug EINMAL auf — `ChatSession` meldet genau EINEN `onLaufVorschlag`, dessen `plan.titel`+Schrittfolge (commandId-Sequenz + Kernparameter als Teilmenge) der Erwartung entsprechen, UND KEINEN `onProposal` (Sanktion 4), UND der Prüfer-`KosmoDoc` bleibt unverändert |
| `lauf-vorschlag-abgelehnt` (PA3, v0.8.7; `dedupFragmente` additiv seit PA3, v0.8.8) | der geplante `lauf_planen`-Aufruf trägt eine (oder mehrere) ERFUNDENE `commandId`(s) — `ChatSession` weist sie VOR jeder Karte als Tool-FEHLER ab: KEIN `onLaufVorschlag`, KEIN `onProposal`, die Tool-FEHLER-Meldung enthält den erwarteten Fehlertext-Ausschnitt UND — falls `dedupFragmente` gesetzt — jedes Fragment GENAU EINMAL (Dedup-Beweis) |
| `command-fehler` (PA3, v0.8.8) | ein ECHTER Tool-Aufruf — `validateToolCall()` weist ihn VOR jeder Diff-Karte ab (zod-Schema-Fehler): KEIN `onProposal`, die Tool-FEHLER-Meldung enthält den erwarteten Fehlertext-Ausschnitt, Doc bleibt Byte-gleich |
| `mehrzug` (PA3, v0.8.8, `kategorie` statt `erwartung.typ`) | eine Zugfolge (`zuege: [...]`) statt eines einzelnen Paars — jeder Zug wird gegen `command`/`ablehnung`/`laufplan` geprüft, Referenzen über Züge hinweg AUSSCHLIESSLICH via literalem `@ref:kind:name`-String (nie eine echte Laufzeit-ID), Doc bleibt über die GANZE Folge Byte-gleich (kein Zug führt einen Command wirklich aus) |
