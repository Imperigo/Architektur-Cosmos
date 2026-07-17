# `dpo/` — Präferenz-Paare (`kosmo-dpo/v1`)

Gerüst, angelegt in P1 (v0.8.2). **Keine Inhalte hier** — heute leer, wächst
ab P3 (Ablehnung+Folge-Korrektur aus dem Diff-Karten-Fluss, `docs/
V082-SPEZ.md` §4.1/§9.4 C-19). Unterordner je Adapter, analog `sft/`:

```
dpo/
  kosmo-buero/        # heute leer, wächst ab P3
```

## Format-Kurzreferenz — `kosmo-dpo/v1`

Eine JSON-Zeile pro Präferenz-Paar:

```jsonc
{
  "prompt": "string",
  "chosen": "string",
  "rejected": "string",
  "meta": { "id": "string", "quelle": "string", "visibility": "public | private" }
}
```

- `chosen` = die manuelle Korrektur des Architekten, `rejected` = der
  ursprünglich abgelehnte Kosmo-Vorschlag (Playbook `wissen/training/claude/
  playbooks/ablehnung-zu-dpo.md`).
- `meta.visibility` ist **Pflichtfeld** — der Validator weist jede Zeile ohne
  `visibility` hart zurück (dieser Ordner zählt wie `signale/` als
  visibility-pflichtig, `docs/V082-SPEZ.md` §3.4).
- Nur `visibility: "public"` darf je aus diesem Repo exportiert werden
  (Owner-Entscheid 1).

## Nie ins Git (bindend, ergänzt den Secret-Scan — keine Doppelspurigkeit)

- **Audio-Rohdaten** — nie ein Audio-/Transkript-Rohsignal als DPO-Paar
  verpacken; Text nur.
- **Binär-/Base64-Blobs** — keine eingebetteten Bilder/Binärdaten in
  `prompt`/`chosen`/`rejected`.
- **Fremde PDFs** — keine PDF-Inhalte/-Auszüge Dritter.
- **API-Schlüssel/Tokens** — bleibt exklusiv `tools/secret-scan.mjs`s
  Aufgabe; dieser Ordner fällt unter dessen `wissen/training`-Scan.

Diese Liste ist eine Ergänzung, kein Ersatz für den bestehenden Secret-Scan.
