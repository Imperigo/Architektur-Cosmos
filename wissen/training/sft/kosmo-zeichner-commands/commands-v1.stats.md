# commands-v1.jsonl — Statistikbericht

Erzeugt von `tools/training/generiere-commands-sft.mts` (Seed `0x4b434d44`,
`docs/V083-SPEZ.md` §7/§12 C-15/C-16). Deterministisch — zwei Läufe erzeugen
eine byte-identische Datei (Doppellauf-Beweis im P4-Abschlussbericht). Quelle:
`allCommands()` (`@kosmo/kernel`) LIVE zum Bau-Zeitpunkt — **108 Commands**
im aktuellen Repo-Stand (inkl. `design.kommentar*`/`design.massKette*`, E1/E2 aus
parallelen Paketen dieser Version).

## Zeilen gesamt

**372 Zeilen** in `commands-v1.jsonl` — 324 valide Tool-Call-Beispiele
(3 je Command) + 48 Ablehn-/Diagnose-Zeilen (**12.9%**, Ziel 10–15%).

## Zeilen je Namensraum (Command-Kategorie)

| Namensraum | Zeilen |
|---|---|
| `design.*` | 260 |
| `grundlagen.*` | 3 |
| `publish.*` | 77 |
| `vis.*` | 32 |

## Ablehn-/Diagnose-Fälle

Jede Ablehn-Zeile lässt GENAU EIN echtes Pflichtfeld eines echten Commands im
Nutzerwunsch unerwähnt; die Assistant-Antwort ist eine ehrliche Rückfrage
(kein Tool-Call-JSON) statt eines erfundenen Werts — dieselbe Disziplin wie
beim Grundriss-Generator ("kein Layout erfunden"), hier aufs Tool-Calling
übertragen. Playbook-Nie-Regel beachtet: keine künstlich mehrdeutigen Prompts
zwischen zwei Commands — die einzige Ablehn-Form ist ein aus dem echten Schema
selbst ableitbares fehlendes Pflichtfeld, tied via `meta.quelle: command:<id>`
an genau das Command, das die Rückfrage auslöst.

**48 von 372 Zeilen (12.9%).**

## Generische Synthese — Qualitätsbeweis

- **z.parse()-Beweis je valider Zeile**: `generiereValideParams()` ruft
  `cmd.params.safeParse()` auf dem tatsächlich erzeugten Objekt auf, bevor die
  Zeile in `rows` landet — 372 Versuche gesamt,
  0 Fehlschläge (Sicherheitsnetz-Retries, kein einziger
  Command scheiterte nach 20 Versuchen endgültig).
- **Keine Schema-Erfindung**: der Synthesizer liest ausschliesslich
  `schema.def` (Typ, `checks` für min/max/regex, `enum`-Optionen, `shape`) —
  kein Feld wird "dazu-halluziniert".
- **Reale Tool-Namen**: `toolNameFor(commandId)` (Punkt→Unterstrich), gegen
  `commandTools()` gegengeprüft — jede Zeile ruft ein Tool auf, das real in
  Kosmos Werkzeug-Registry existiert.
