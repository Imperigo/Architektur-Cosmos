# `eval/` — feste Eval-Prompt-Sets je Adapter

Gerüst, angelegt in P1 (v0.8.2). **Keine Inhalte hier** — P2 liefert die
erste feste Eval-Suite (Grundriss-Generierung, `docs/V082-SPEZ.md` §6.2/§9.3
C-10); weitere Adapter ziehen nach, sobald ihr Datensatz `wächst`/
`reproduzierbar` erreicht (Status-Spalte in `../REGISTRY.md`).

Vorgesehene Struktur (wird erst mit Inhalt angelegt, keine leeren
Platzhalter-Unterordner vorab):

```
eval/
  <adapter>/        # z.B. kosmo-zeichner-grundriss/ — feste Prompt-Sets,
                    # vorher/nachher-Vergleich gegen den HomeStation-Checkpoint
```

## Format-Kurzreferenz

Kein eigenes Schema — ein Eval-Set ist eine feste, versionierte Liste von
Prompts/Erwartungen je Adapter (kein Trainingsdatensatz, `meta.visibility`
daher nicht Pflicht). Format je Adapter dokumentiert, sobald der erste
Eval-Ordner entsteht (z. B. P2s Grundriss-Eval-Suite).

## Nie ins Git (bindend, ergänzt den Secret-Scan — keine Doppelspurigkeit)

- **Audio-Rohdaten**, **Binär-/Base64-Blobs**, **fremde PDFs** — dieselbe
  Liste wie `signale/`/`dpo/` (`docs/V082-SPEZ.md` §3.5); Eval-Prompts sind
  Text, keine Binärdaten.
- **API-Schlüssel/Tokens** — bleibt exklusiv `tools/secret-scan.mjs`s
  Aufgabe.

Diese Liste ist eine Ergänzung, kein Ersatz für den bestehenden Secret-Scan.
