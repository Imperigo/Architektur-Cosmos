---
titel: "Imaging-LoRA"
tags: [lora, training, imaging, rendering, stil]
status: "v1 — Konzept (kein Bildkorpus im Container verfügbar)"
erstellt: "2026-07-08"
verwandt: ["[[LoRA-Uebersicht]]", "[[Trainingslauf-Vorlage]]", "[[Grundriss-LoRA]]"]
---

# Imaging-LoRA (Ziel B)

Volle Fassung: `kosmo-orbit/docs/LORA-KONZEPT.md` §2. Diese Notiz ist die
Kurzfassung fürs Vault.

## Aufgabe

Ein **Stil-LoRA** für SDXL oder Flux (Owner-Entscheid offen), das
KosmoVis-Renders (Cycles-Rohbild) Richtung Owner-Ästhetik veredelt — die
«Werkplan»-Bildwelt aus `docs/GESTALTUNGSKONZEPT.md`: Papier statt
Bildschirm, Tusche-Linien, skizzenhafte Präzision, Schwarz/Weiss-Standard mit
wählbarem Akzent. Ob stattdessen/zusätzlich ein realistischerer
Präsentations-Rendering-Stil trainiert wird, ist eine offene Owner-Frage.

## Datenquelle

- **KosmoData/KosmoReference** (`packages/kosmo-data/src/reference.ts`):
  reiches Metadatenmodell (Stile, Epochen, Materialien) — **kein**
  Bildkorpus in diesem Container, nur Auswahlkriterien.
- **`derive/renderprompt.ts`**: `renderPromptBausteine()` leitet aus
  Wandschichten (Sichtbeton/Putz/Holz/Klinker/Kalksandstein/Metall) und
  Fassadenmodul-Rastern Text-Bausteine ab — dieselbe Funktion liefert
  Trainings-Captions UND spätere Inferenz-Prompts (Konsistenz).
  Owner-Ästhetik (`docs/GESTALTUNGSKONZEPT.md` Tokens/Regeln) liefert die
  Stilwörter.
- Echter Bildkorpus fehlt hier bewusst und ehrlich: er müsste aus echten
  KosmoVis-Renders (sobald GPU-Worker läuft), Owner-Projektfotos oder
  lizenzsauberen externen Referenzen zusammengestellt werden — alles
  HomeStation-/Owner-Arbeit.

## Bildauswahl-Kriterien

1. Eine Kameraperspektive-Familie je Lauf (nicht Aussenansicht + Innenraum
   mischen).
2. ≥ 1024×1024 (SDXL) bzw. 1024–1440 (Flux), keine UI-Chrome/Wasserzeichen.
3. Stilistisch einheitlich, aber Motiv-/Materialvarianz gegen Overfitting.
4. Owner-Freigabe je Bild — Ästhetik-Urteil bleibt beim Owner.

## Captioning-Konvention

Fixes Trigger-Wort (z.B. `kosmowerkplan`) + `renderPromptBausteine()`-Phrasen
+ Owner-Stilwörter, kohya-`.txt`-Format je Bild.

## Trainings-Rezept (Startpunkt)

kohya-ss `train_network.py`, `network_dim=32, network_alpha=16`,
`resolution=1024,1024`, `lr=1e-4`, `max_train_steps=2000` — Startwerte aus
der kohya-Dokumentation, nicht am Owner-Korpus gemessen.

## Eval

~10 feste Prompts (Gebäudetyp × Materialvariante) vorher/nachher gegen
Basis-Checkpoint vs. LoRA, Owner-Paarvergleich (kein automatisches
Ähnlichkeitsmass). Protokoll: [[Trainingslauf-Vorlage]].

## Status

🔒 Bild-Kuration + Trainingslauf sind vollständig HomeStation-/Owner-Arbeit
(`docs/HOMESTATION-AUFTRAG.md`). Hier ist nur das Rezept + die
Captioning-Grammatik vorbereitet — **keine** Stichprobe möglich ohne
Bilddateien (ehrlich benannt statt vorgetäuscht).
