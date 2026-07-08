---
titel: "LoRA-Übersicht"
tags: [lora, training, uebersicht]
status: "v1 — Konzept + Stichprobe"
erstellt: "2026-07-08"
verwandt: ["[[Grundriss-LoRA]]", "[[Imaging-LoRA]]", "[[Trainingslauf-Vorlage]]"]
---

# LoRA-Übersicht

Erste LoRA-Trainingsrunde des ArchitekturKosmos (Owner-Auftrag v0.6.2,
08.07.2026): **zwei** Ziele, **ein** Rahmen. Volles Konzept mit allen Details:
`kosmo-orbit/docs/LORA-KONZEPT.md`. Diese Notiz ist der Obsidian-Einstieg —
kurz, verlinkt, mit Status.

> Der Chat-/Persona-LoRA aus dem Lernjournal (Daumen hoch/runter) ist **nicht**
> Teil dieser Übersicht — der läuft separat nach `kosmo-orbit/docs/KOSMOTRAIN.md`.

## Ehrlichkeits-Rahmen

Kein GPU in der Cloud-Session, in der dieses Konzept entstand — **kein**
echter Trainingslauf hier, keine vorgetäuschten Ergebnisse. Was hier real
passiert ist: Datensatz-Pipeline bauen, Format festlegen, Qualität filtern,
Eval-Suite entwerfen. Der GPU-Lauf selbst ist 🔒 HomeStation (RTX 5090).

## Die zwei Ziele

- [[Grundriss-LoRA]] — Raumprogramm/Constraints → Grundriss-Layout als JSON,
  aus `derive/grundrissgenerator.ts` + `derive/segmentierer.ts` erzeugt.
- [[Imaging-LoRA]] — Stil-LoRA (SDXL/Flux) für KosmoVis-Renders im
  Werkplan-/Büro-Stil.

Jeder künftige Trainingslauf (egal welches Ziel) wird nach
[[Trainingslauf-Vorlage]] protokolliert.

## Status-Checkboxen (Fahrplan, siehe LORA-KONZEPT.md §5)

- [x] v1 — Konzept geschrieben (dieses Vault + `docs/LORA-KONZEPT.md`)
- [x] v1 — Grundriss-Stichprobe erzeugt (`wissen/training/lora/grundriss-v0.jsonl`, 29 Zeilen)
- [ ] v1.1 — Grundriss-Volldatensatz per Batch (Tausende Zeilen, `segmentiere()`-Aufgabe dazu)
- [ ] v1.1 — `doc.settings.vorlagen` (Plan-Library) als Gold-Quelle einbeziehen, sobald befüllt
- [ ] 🔒 HomeStation — erster echter Grundriss-QLoRA-Lauf (Qwen3-Coder-Basis)
- [ ] 🔒 HomeStation — erste Bild-Charge für Imaging-LoRA kuratieren + captionen
- [ ] 🔒 HomeStation — erster echter Imaging-Stil-LoRA-Lauf (SDXL/Flux)
- [ ] Integration — Grundriss-LoRA als Ollama-Modell (`kosmo-grundriss`) in Kosmo-Einstellungen
- [ ] Integration — Imaging-LoRA in den ComfyUI-Render-Worker der HomeStation-Bridge

## Offene Owner-Entscheide

Siehe `docs/LORA-KONZEPT.md` §6 — u.a. Basis-Bildmodell (SDXL vs. Flux),
Zielrichtung Ziel B (Werkplan-Look vs. realistisches Rendering vs. beide),
Herkunft der ersten Bild-Charge, Modellnamen-Schema.
