# `signale/` — kuratierte App-Betriebssignale (`kosmo-signal/v1`)

Gerüst, angelegt in P1 (v0.8.2). **Keine Inhalte hier** — P3 (Signal-Erfassung)
und P6 (Kuratier-Flow) befüllen diesen Ordner erst, wenn der App-seitige
Export-Fluss steht (`docs/V082-SPEZ.md` §4.4).

## Format-Kurzreferenz — `kosmo-signal/v1`

Eine JSON-Zeile pro Signal:

```jsonc
{
  "art": "journal | proposal | reparatur | transkript | layout",
  "ts": "ISO-Zeitstempel",
  "visibility": "public | private",
  "payload": { "// struktur je 'art', s. docs/V082-SPEZ.md §4" },
  "meta": { "quelle": "string", "sessionId": "string?" }
}
```

- `art` ist eine feste Fünf-Werte-Enum: `journal` (Daumen hoch/runter + Notiz),
  `proposal` (Diff-Karten-Ausgang), `reparatur` (Parameter-Reparatur
  falsch→richtig), `transkript` (CH-STT-Paare, heute nur Konzept), `layout`
  (Auto-Pack-Blattlayout-Präferenz).
- `visibility` ist **Pflichtfeld** — der Validator (`tools/training/
  validiere-sft.mjs`) weist jede Zeile ohne `visibility` hart zurück.
- Nur `visibility: "public"` darf je aus diesem Repo in ein anderes Ziel
  exportiert werden (Owner-Entscheid 1, `docs/V082-SPEZ.md` §0.3).

## Nie ins Git (bindend, ergänzt den Secret-Scan — keine Doppelspurigkeit)

- **Audio-Rohdaten** — STT bleibt Wegwerf-Tmp (`tools/homestation-bridge/
  kosmo_bridge/main.py:819`); ein `art:"transkript"`-Eintrag trägt nur den
  Text, nie die Audiodatei/Base64-PCM.
- **Binär-/Base64-Blobs** — keine eingebetteten Bilder, Audio- oder
  Binärdaten in `payload`.
- **Fremde PDFs** — Lizenzfrage; keine PDF-Inhalte/-Auszüge Dritter im
  Payload.
- **API-Schlüssel/Tokens** — bereits durch `tools/secret-scan.mjs`
  (`WISSEN_UNTERORDNER`-Scan) gedeckt; der Schema-Validator hier prüft
  Struktur + Visibility, nicht Secrets (`docs/V082-SPEZ.md` §3.4/§3.5).

Diese Liste ist eine Ergänzung, kein Ersatz für den bestehenden Secret-Scan.
