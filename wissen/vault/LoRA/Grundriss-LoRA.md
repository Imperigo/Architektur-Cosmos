---
titel: "Grundriss-LoRA"
tags: [lora, training, grundriss, kernel]
status: "v1 — Konzept + Stichprobe (29 Zeilen)"
erstellt: "2026-07-08"
verwandt: ["[[LoRA-Uebersicht]]", "[[Trainingslauf-Vorlage]]", "[[Imaging-LoRA]]"]
---

# Grundriss-LoRA (Ziel A)

Volle Fassung: `kosmo-orbit/docs/LORA-KONZEPT.md` §1. Diese Notiz ist die
Kurzfassung fürs Vault.

## Aufgabe

Raumprogramm + Wohnungs-/Parzellen-Constraints (JSON) → Grundriss-Layout als
strukturiertes JSON: Räume (Umriss, Name, Raumtyp, SIA-Fläche HNF/VF),
Möblierung, Türen, Kennzahlen (HNF/VF-Summen, Raum-/Möbel-/Türanzahl).

Basis-Modell (später, lokal): ein `Qwen3-Coder`-Klasse-Modell — im lokalen
Rollen-Schema (`docs/KI-MODELL-GUIDELINE.md` Teil C) der **Kosmo-Zeichner**
(Ausführer-Rolle), nicht der Kosmo-Meister. Das LoRA verallgemeinert das
Rezept aus dem Kernel-Generator auf Fälle, die der reine Algorithmus ehrlich
ablehnt (unregelmässige Umrisse) — der Algorithmus bleibt Wahrheits-Anker.

## Datenquelle (real, kein Mock)

- `packages/kosmo-kernel/src/derive/grundrissgenerator.ts` —
  `generiereGrundriss()` (Rechteck, Zwei-Band-Rezept) und
  `generiereGrundrissL()` (L-Form über `zerlegeRektilinear()`).
- `packages/kosmo-kernel/src/derive/segmentierer.ts` — `segmentiere()`
  (Geschoss→Wohnungs-Mix, komplementäre Aufgabe, v1.1).
- `doc.settings.vorlagen` (`ZonenVorlage[]`, V2-F7 Plan-Library) — die
  wertvollste Gold-Quelle, sobald der Owner Vorlagen in der App ablegt
  (heute leer).
- `wissen/training/lehrhefte.jsonl` — Prosa-Regeln als Kontext-Anreicherung.

## Qualitätsfilter

Spiegelt `derive/checks.ts`-Schweregrade: Zimmerbreite < 2.40 m ist
`warnung` → hartes Ausschlusskriterium fürs Gold-Set; Zimmerfläche < 10 m²
ist nur `hinweis` (ein Bad ist praktisch immer kleiner) → nicht
disqualifizierend, nur protokolliert. Volle `pruefeGrundriss()`-Filterung
(inkl. Fluchtweg/Schallschutz) ist v1.1-Ausbau — braucht ein echtes
KosmoDoc statt der geometrischen Näherung der Stichprobe.

## Stichprobe

`wissen/training/lora/grundriss-v0.jsonl` — 29 Zeilen, SFT-Chat-Format
(`messages: [system, user, assistant]` + `meta` für Provenienz), erzeugt
durch ein Wegwerf-Skript (nicht eingecheckt), das die echten
Generator-Funktionen direkt aufruft: 24 Rechteck-Beispiele (gestreut über
Zimmerzahl + Korridorkante), 3 bewusste Randfälle (ehrliches Verweigern/
Diagnostizieren), 2 L-Grundrisse.

## Trainings-Rezept (Startpunkt)

Unsloth/QLoRA wie `docs/KOSMOTRAIN.md`, gleiche Werkzeugkette:
`r=16, lora_alpha=32`, `max_seq_length=8192` (JSON-Layouts sind länger als
Chat-Turns), 2–3 Epochen, lr 2e-4. Export → GGUF → `ollama create
kosmo-grundriss` (eigener Modellname, getrennt vom Persona-LoRA
`kosmo-buero`).

## Eval

~10 feste Wohnungs-Constellationen (inkl. ≥2 „unregelmässig"-Fälle) vorher/
nachher gegen Basis-Modell vs. LoRA; Kriterium: JSON-Validität,
`checks.ts`-Bestehen, HNF-Summe plausibel gegen Wohnungsfläche.
Protokoll: [[Trainingslauf-Vorlage]].

## Status

🔒 Der eigentliche QLoRA-Lauf ist HomeStation-Arbeit
(`docs/HOMESTATION-AUFTRAG.md`) — hier nur vorbereitet, nicht ausgeführt.
