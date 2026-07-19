# Adapter-Registry — `wissen/training/`

Die eine Adapter-Übersicht (`docs/V082-SPEZ.md` §2.4/§5.2). Acht Zeilen: die
sechs Adapter/Kompetenzen der Zielkompetenz-Karte (§5.1) plus die zwei neuen
Sichtbarkeits-/Signal-Zeilen aus dem Owner-Nachtrag. Der Schema-Validator
(`tools/training/validiere-sft.mjs`) liest die **Adapter**-Spalte dieser
Tabelle als massgebliche Liste gültiger `meta.adapter`-Werte — ein `meta.
adapter`, das hier nicht auftaucht, ist ein harter Validator-Fehler.

**Status-Werte:** `leer` · `wächst` · `reproduzierbar` · `vollständig`.
**HomeStation-Stand-Werte:** `nicht trainiert` · `trainiert` · `GGUF exportiert`.

| Adapter | Ziel | Quellen (Pfade) | Schema | Status | Eval | HomeStation-Stand |
|---|---|---|---|---|---|---|
| `kosmo-buero` | Persona/Bürostil | `sft/kosmo-buero/` (`persona-v1.jsonl` P1-kanonisiert + Journal-Notizen, künftig P4) | `kosmo-sft/v1` | wächst | `eval/kosmo-buero/` (noch nicht angelegt) | nicht trainiert |
| `kosmo-zeichner-grundriss` | Grundriss-Generierung | `sft/kosmo-zeichner-grundriss/` (`grundriss-v0.jsonl` + P2-Vollmenge) | `kosmo-sft/v1` | reproduzierbar | `eval/kosmo-zeichner-grundriss/` (P2) | nicht trainiert |
| `kosmo-zeichner-commands` | Software-Bedienung/Tool-Calling | `sft/kosmo-zeichner-commands/` (`commands-v1.jsonl`, P4, Playbook `zod-zu-command-beispielen.md`) | `kosmo-sft/v1` | reproduzierbar | `eval/kosmo-zeichner-commands/` (PD2 v0.8.4, PB2 v0.8.5: 25→35 Prompts, 35/35 bestanden — Integrationsbeweis via ScriptedProvider/ChatSession, kein Modell-Eval, s. README dort) | nicht trainiert |
| `kosmo-buero-dpo` | Präferenzen (DPO) | `dpo/kosmo-buero/` | `kosmo-dpo/v1` | leer | — | nicht trainiert |
| `whisper-ch` | CH-Deutsch-STT | *(kein Korpus — Audio bleibt Wegwerf-Tmp, `tools/homestation-bridge/kosmo_bridge/main.py:819`)* | — | wartet auf Owner/HomeStation | — | nicht trainiert |
| `kosmo-werkplan` | Werkplan-Bildstil (Ziel B) | *(kein Korpus, 4 Owner-Entscheide offen, `docs/LORA-KONZEPT.md` §6)* | — | wartet auf Owner/HomeStation | — | nicht trainiert |
| `vis-befehle` | *(kein eigener Adapter)* | `packages/kosmo-kernel/src/commands/vis.ts` (9 `vis.*`-Commands, automatisch Teil von `sft/kosmo-zeichner-commands/` via `commandTools()`) | — | in `kosmo-zeichner-commands` enthalten | — | — |
| `kosmo-publish-layout` | Blattlayout-Präferenzen (Auto-Pack-Heuristik vs. Owner-Endzustand) | `signale/` (`art: "layout"`) | `kosmo-signal/v1` | null, wächst ab 0.8.2 | — | nicht trainiert |

## Stacking (Owner-Entscheid 2)

Drei getrennte Adapter (`kosmo-buero` / `kosmo-zeichner-grundriss` /
`kosmo-zeichner-commands`) — **kein Automatismus**. Ein gemeinsamer,
gestapelter Lauf (z. B. `kosmo-buero` + `kosmo-zeichner-commands` in einem
Checkpoint) ist ausschliesslich eine **dokumentierte Option** für einen
künftigen HomeStation-Lauf, keine Voreinstellung — jeder Adapter trainiert
und exportiert für sich (eigene Manifest-Zeile, `packages/kosmo-contracts/
src/lora-train.ts`).

## Verzeichnis-Soll (Referenz, `docs/V082-SPEZ.md` §2.2)

```
wissen/training/
  korpora/                       # 7 Alt-Korpora, rohwissen, kein SFT
  sft/
    kosmo-buero/
    kosmo-zeichner-grundriss/
    kosmo-zeichner-commands/
  signale/
  dpo/
    kosmo-buero/
  eval/
    <adapter>/
  claude/
    lehren/
    playbooks/
  REGISTRY.md                    # diese Datei
```
