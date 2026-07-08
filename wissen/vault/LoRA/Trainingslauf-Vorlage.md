---
titel: "Trainingslauf-Vorlage"
tags: [lora, training, vorlage, protokoll]
status: "Vorlage — für jeden künftigen Lauf kopieren"
erstellt: "2026-07-08"
verwandt: ["[[LoRA-Uebersicht]]", "[[Grundriss-LoRA]]", "[[Imaging-LoRA]]"]
---

# Trainingslauf-Vorlage

Für **jeden** künftigen LoRA-Trainingslauf (Grundriss oder Imaging) diese
Vorlage kopieren zu `Trainingslauf-<Ziel>-<Datum>.md` und ausfüllen. Zweck:
jeder Lauf ist nachvollziehbar — was trainiert wurde, womit, mit welchem
Ergebnis, ob er ins Produkt übernommen wurde.

## Kopfdaten

- **Ziel:** [[Grundriss-LoRA]] / [[Imaging-LoRA]] / anderes
- **Datum:**
- **Wer:** (HomeStation-Owner-Lauf / Claude Code an der HomeStation / …)
- **Basis-Modell + Version:**
- **Datensatz-Version:** (z.B. `grundriss-v0.jsonl`, 29 Zeilen /
  `grundriss-v1.jsonl`, Vollmenge — Dateiname + Zeilenzahl + Commit-Hash)

## Trainings-Parameter

| Parameter | Wert |
|---|---|
| LoRA-Rang (`r`) | |
| `lora_alpha` | |
| Ziel-Module (`target_modules`) | |
| Lernrate | |
| Epochen / `max_train_steps` | |
| Batch-Grösse | |
| Auflösung (nur Imaging) | |
| Trainingsdauer (Wanduhr) | |
| GPU-Auslastung / VRAM | |

## Eval-Ergebnis

Vorher/Nachher gegen die feste Eval-Suite
(`docs/LORA-KONZEPT.md` §1.4 bzw. §2.5):

- **Grundriss:** JSON-Validität (X/N), `checks.ts`-Bestehen (X/N),
  Kennzahlen-Plausibilität — Auffälligkeiten:
- **Imaging:** Owner-Paarvergleich je Eval-Prompt (besser/schlechter/gleich),
  Auffälligkeiten (Overfitting auf ein Motiv? Stil-Drift?):

## Entscheid

- [ ] Übernommen ins Produkt (Ollama-Modellname / ComfyUI-LoRA-Datei):
- [ ] Verworfen — Grund:
- [ ] Weiterer Lauf nötig — was ändert sich (Daten? Parameter? Eval)?

## Notizen

Freitext: Überraschungen, Owner-Eindruck, was der nächste Lauf anders
machen sollte.
