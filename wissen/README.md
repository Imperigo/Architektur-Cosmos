# Wissen — Bauwissen-Grundlage & Trainingsdaten für Kosmo

> Owner-Direktive 03.07.2026: Bauwissen und Projektwissen dauerhaft sichern —
> «git und obsidian vault». Genau das ist dieser Ordner.

## Struktur

| Ordner | Inhalt |
|---|---|
| `lehrhefte/` | Die Original-PDFs der Hochbauzeichner-Lehrmittel (gescannt, Owner-Bibliothek) |
| `vault/` | **Obsidian-Vault**: OCR-Volltext je Heft als Markdown (Frontmatter + eine Sektion pro Seite) — in Obsidian einfach diesen Ordner als Vault öffnen |
| `training/` | **LoRA-Futter**: `lehrhefte.jsonl` (Chunks mit Quelle + Seite) und `projektwissen.jsonl` (kosmo-orbit/docs + ROADMAP gechunkt) |
| `tools/` | Die wiederholbare Pipeline: `ocr-lehrhefte.py` (tesseract deu, 200 dpi) und `projektwissen.py` |

## Wie das Wissen zu Kosmo kommt

1. **Sofort (RAG):** Die `vault/*.md` in KosmoPrepare ziehen (Drag & Drop) —
   Kosmo zitiert dann mit `[Qn]`-Belegen und Quellensprung direkt aus den
   Heften. Mit laufender Bridge werden die Chunks zusätzlich semantisch
   eingebettet (bge-m3).
2. **Später (LoRA, HomeStation):** `training/*.jsonl` + das Lernjournal sind
   der Datensatz für den Trainingslauf nach `kosmo-orbit/docs/KOSMOTRAIN.md`
   (Unsloth-QLoRA auf der 5090 → GGUF → `ollama create kosmo-buero`).
3. **Obsidian:** `wissen/vault/` als Vault öffnen (lokal geklont) — oder das
   Obsidian-Git-Plugin auf dieses Repo zeigen lassen; jede Ergänzung im Vault
   wandert dann versioniert mit.

## Neue Hefte aufnehmen

PDF nach `lehrhefte/` legen, Eintrag in `tools/hefte.json`, dann:

```bash
pip install pymupdf && apt-get install tesseract-ocr tesseract-ocr-deu
python3 wissen/tools/ocr-lehrhefte.py <Dateiname-Teil>
python3 wissen/tools/projektwissen.py
```

## Korpora-Bilanz (03.07.2026)

| Sammlung | Quellen | Chunks | Herkunft |
|---|---|---|---|
| lehrhefte | 24 | 1'256 | Hochbauzeichner-Lehrmittel (OCR) |
| normen | 141 | 5'809 | SIA/bfu/eBKP-Bibliothek (OneDrive Paket 1) |
| persona | 17 | 124 | Golden Rules Andrin (Paket 2) |
| vorlesungen | 567 | 12'731 | HSLU Theorie + ETH (Paket 3, Textlayer; Handschrift-ZFs ohne OCR) |
| buecher | 147 | 22'883 | Digitale Bibliothek (Paket 4, Streaming: laden→extrahieren→löschen) |
| briefings | 8 | 172 | KosmoDraw-Briefings |
| projektwissen | 11 | 68 | kosmo-orbit/docs + ROADMAP |

**Bewusst ausgelassen (HomeStation-Backlog):** 7 Über-250-MB-Scans (Baustoff-,
Glasbau-, Stahlbau-, Sanierung-Atlas, Eine Muster Sprache, Löfgren, FS-08-Reader)
und die GoodNotes-Handschrift-Zusammenfassungen — beides braucht OCR-Zeit auf
der 5090, Auftrag in `kosmo-orbit/docs/HOMESTATION-AUFTRAG.md` festhalten.
Quell-PDFs bleiben in OneDrive; ins Git wandern nur Vault-Markdown + JSONL.

## Ehrliche Grenzen

- Die Hefte sind **gescannt und relativ alt** (Owner: «besser als nix») —
  OCR-Fehler sind möglich, Normwerte immer gegen aktuelle SIA prüfen.
- Tabellen und Zeichnungen überleben OCR nur als Fliesstext; fürs Detail
  bleibt das Original-PDF daneben liegen.
