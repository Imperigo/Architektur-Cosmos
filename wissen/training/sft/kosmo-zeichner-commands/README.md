# `sft/kosmo-zeichner-commands/` — Software-Bedienung/Tool-Calling

Gerüst, angelegt in P1 (v0.8.2). **Keine Inhalte hier** — P4 befüllt diesen
Ordner via des Playbooks `wissen/training/claude/playbooks/
zod-zu-command-beispielen.md`: synthetische Tool-Call-Beispiele aus den
zod-`params`-Schemas der Kernel-Commands (`packages/kosmo-kernel/src/
commands/*.ts`, automatisch Kosmo-Tool via `commandTools()`), analog zur
bestehenden `softwareKorpusCommands()` (`apps/kosmo-orbit/src/state/
training-korpus.ts:44-55`).

Die neun `vis.*`-Commands (`packages/kosmo-kernel/src/commands/vis.ts`) sind
über `registerCommand()` bereits Teil von `allCommands()` und landen darüber
automatisch in diesem Adapter — kein eigenes Trainingsziel nötig, s. die
Registry-Zeile `vis-befehle` in `../../REGISTRY.md`.

Schema: `kosmo-sft/v1` (`meta.adapter: "kosmo-zeichner-commands"`,
`docs/V082-SPEZ.md` §3.1).
