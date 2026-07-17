# `sft/kosmo-buero/` — Persona/Bürostil

Gerüst + erster kanonisierter Datensatz, angelegt in P1 (v0.8.2). Zwei
Quellen speisen diesen Adapter additiv:

1. **`persona-v1.jsonl`** (P1, dieser Release) — kanonisiert aus dem
   Alt-Korpus `wissen/training/korpora/persona.jsonl` («Golden Rules
   Andrin», 124 rohe OCR-/Textlayer-Chunks) via `tools/training/
   konvertiere-persona-sft.mjs`. **Ehrlich markiert**: diese Zeilen sind
   Format-kanonisiert, aber **nicht inhaltlich kuratiert** — jede Zeile
   trägt `meta.qualitaet.hinweise: ["unkuratiert: automatisch aus
   korpora/persona.jsonl kanonisiert, kein manuell geprüftes SFT-Beispiel"]`
   und `meta.qualitaet.checksBestanden: false`, damit kein Trainingslauf sie
   versehentlich mit echten kuratierten Beispielen gleich gewichtet.
2. **Journal-Konvertierung** (P4, künftig, Playbook `wissen/training/
   claude/playbooks/journal-zu-sft.md`) — echte kuratierte Beispiele aus
   Lernjournal-Einträgen MIT gesetzter Notiz (`architekturKorpus()`-Regel,
   `apps/kosmo-orbit/src/state/training-korpus.ts:80-95`). Diese Zeilen
   tragen `meta.qualitaet.checksBestanden: true`.

Schema: `kosmo-sft/v1` (`meta.adapter: "kosmo-buero"`, `docs/V082-SPEZ.md`
§3.1). Doppellauf-Beweis: `tools/training/konvertiere-persona-sft.mjs`
zweimal ausführen → byte-identisches `persona-v1.jsonl` (deterministische
IDs aus `quelle`+`seite`, kein Zeitstempel im Output).
