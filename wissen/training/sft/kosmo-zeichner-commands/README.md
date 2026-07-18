# `sft/kosmo-zeichner-commands/` — Software-Bedienung/Tool-Calling

Befüllt in P4 (v0.8.3, `docs/V083-SPEZ.md` §7 (E7) + §12 C-15/C-16) via des
Playbooks `wissen/training/claude/playbooks/zod-zu-command-beispielen.md`:
synthetische Tool-Call-Beispiele aus den zod-`params`-Schemas der
Kernel-Commands (`packages/kosmo-kernel/src/commands/*.ts`, automatisch
Kosmo-Tool via `commandTools()`), erzeugt vom seeded, deterministischen
Generator `tools/training/generiere-commands-sft.mts` (Vorbild
`tools/training/generiere-grundriss-sft.mts`, v0.8.2/P2).

Die neun `vis.*`-Commands (`packages/kosmo-kernel/src/commands/vis.ts`) sind
über `registerCommand()` bereits Teil von `allCommands()` und landen darüber
automatisch in diesem Adapter — kein eigenes Trainingsziel nötig, s. die
Registry-Zeile `vis-befehle` in `../../REGISTRY.md`.

## Inhalt

`commands-v1.jsonl` — pro registriertem Command (LIVE aus `allCommands()`
gelesen, Stand des Baus: 108 Commands inkl. der v0.8.3-Neuzugänge
`design.kommentar*`/`design.massKette*`) drei valide Nutzerwunsch→Tool-Call-
Beispiele plus eine deterministisch gezogene Teilmenge ehrlicher
Ablehn-/Diagnose-Zeilen (10–15 % der Datei — ein Pflichtfeld fehlt im
Nutzerwunsch, Kosmo fragt nach statt einen Wert zu erfinden). Jede valide
Zeile ist gegen das ECHTE zod-Schema des jeweiligen Commands geprüft
(`cmd.params.parse(...)`, s. `generiere-commands-sft.test.mts`). Details,
Kategorien-Aufschlüsselung und Filterbegründung in `commands-v1.stats.md`.

Reproduzierbar: `npx tsx tools/training/generiere-commands-sft.mts` schreibt
bei gleichem Seed byte-identisch dieselbe Datei (Doppellauf-Beweis im
P4-Abschlussbericht).

Schema: `kosmo-sft/v1` (`meta.adapter: "kosmo-zeichner-commands"`,
`meta.quelle: "command:<commandId>"`, `docs/V082-SPEZ.md` §3.1,
`docs/V083-SPEZ.md` §7.3).
