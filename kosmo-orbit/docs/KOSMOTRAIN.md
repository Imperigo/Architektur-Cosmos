# KosmoTrain — Kosmo lernt vom Büro (Owner-Q8)

> Der Kreislauf: **Arbeiten → Journal → Export → LoRA auf der HomeStation → besseres Kosmo.**
> Alles lokal auf der 5090 — kein Büro-Wissen verlässt das Haus.

## 1) Was gesammelt wird

Kosmo führt ein Lernjournal (localStorage, Gerät-lokal):

- **Daumen hoch/runter** an jeder Antwort (Kritik zuerst — Fehler sind die wertvollsten Daten)
- Kontext der bewerteten Antwort

Die letzten Einträge fliessen bereits **sofort** in jede Konversation ein
(Prompt-Block «Aus dem Journal»), ganz ohne Training.

## 2) Export

Kosmo-Einstellungen (⚙) → **«Lernjournal exportieren (JSONL fürs LoRA-Training)»**.
Format: eine JSON-Zeile pro Eintrag `{sentiment, context, ts}`.

## 3) LoRA-Training auf der HomeStation (Unsloth-Rezept)

Ziel-Modell: das lokale Arbeitsmodell (z.B. `qwen3-coder:30b` — als HF-Checkpoint
`Qwen/Qwen3-Coder-30B-A3B-Instruct`). Auf der 5090 mit Unsloth (4-bit, QLoRA):

```bash
pip install unsloth
```

```python
from unsloth import FastLanguageModel
import json

model, tokenizer = FastLanguageModel.from_pretrained(
    "Qwen/Qwen3-Coder-30B-A3B-Instruct", load_in_4bit=True, max_seq_length=4096,
)
model = FastLanguageModel.get_peft_model(model, r=16, lora_alpha=32,
    target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"])

# Journal → Chat-Paare: gute Antworten als Vorbild, schlechte als "so nicht"-Kontrast
rows = [json.loads(l) for l in open("kosmo-lernjournal-2026-07-02.jsonl")]
def to_sample(r):
    system = "Du bist Kosmo, der Architektur-Copilot des Büros (CH-Hochbau, SIA)."
    if r["sentiment"] == "gut":
        return {"messages":[{"role":"system","content":system},
                            {"role":"assistant","content":r["context"]}]}
    return {"messages":[{"role":"system","content":system + " Vermeide Antworten wie die folgende (vom Architekten abgelehnt)."},
                        {"role":"assistant","content":r["context"]}]}
dataset = [to_sample(r) for r in rows]
# … SFTTrainer wie im Unsloth-Standardrezept, 1–3 Epochen, lr 2e-4
```

Danach als GGUF exportieren und in Ollama registrieren:

```bash
# Unsloth: model.save_pretrained_gguf("kosmo-lora", tokenizer, quantization_method="q4_k_m")
cat > Modelfile <<'EOF'
FROM ./kosmo-lora/unsloth.Q4_K_M.gguf
SYSTEM Du bist Kosmo, der Architektur-Copilot des Büros.
EOF
ollama create kosmo-buero -f Modelfile
```

In KosmoOrbit dann einfach Modell `kosmo-buero` in den Kosmo-Einstellungen eintragen.

## 4) Ehrlichkeiten

- Wenige Journal-Einträge (< ~200) → LoRA lohnt kaum; der Prompt-Block wirkt sofort
  und ist bis dahin der bessere Hebel.
- Daumen-runter-Beispiele sind als Negativ-Kontrast formuliert — für echtes
  Präferenz-Training (DPO) braucht es Paare; das ist der V2-Ausbau (KosmoTrain-Persona
  könnte abgelehnte Antworten automatisch umschreiben lassen und Paare bilden).
- Dieses Rezept ist hier nicht gegen die 5090 getestet (Cloud-Container ohne GPU) —
  erster Trainingslauf gemeinsam mit dem Owner.
