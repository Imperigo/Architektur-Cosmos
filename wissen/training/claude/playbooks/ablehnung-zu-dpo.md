# Playbook: Ablehnung+Korrektur → DPO (`kosmo-dpo/v1`, Adapter `kosmo-buero-dpo`)

> **Claude kuratiert — Claude trainiert NICHT sich selbst.** Dieses Playbook
> ist eine Prompt-Vorlage für eine manuelle/angeleitete Kuration, kein Skript,
> das automatisch läuft. Die erzeugten Paare sind Trainingsmaterial für
> Kosmos lokalen `kosmo-buero-dpo`-Adapter (`docs/V082-SPEZ.md` §0.2).

## Zweck

Ein Ablehnung+Folge-Korrektur-Paar aus `apps/kosmo-orbit/src/state/
proposal-log.ts` (`V082-SPEZ.md` §4.1) wird zu einem `kosmo-dpo/v1`-Paar
umgeschrieben: `chosen` = die manuelle Korrektur des Architekten, `rejected` =
der ursprünglich abgelehnte Kosmo-Vorschlag. Das ist der wertvollste der 5
Top-Signale (`V082-SPEZ.md` §9.4, C-19) — ein echtes, direktes
Präferenzsignal, kein synthetisches.

## Eingabeformat

Ein Eintrag aus `proposal-log.ts` mit gesetztem `folgeKorrektur`
(`V082-SPEZ.md` §4.1 — Feldnamen wörtlich aus dem Vertrag):

```jsonc
{
  "commandId": "string — z. B. 'design.wandSetzen'",
  "params": { "// die abgelehnten Parameter" },
  "summary": "string — menschlesbare Zusammenfassung des Vorschlags",
  "ausgang": "abgelehnt",
  "grund": "string? — warum abgelehnt, falls erfasst",
  "folgeKorrektur": {
    "commandId": "string — meist identisch zum abgelehnten Command",
    "params": { "// die tatsächlich angewendeten Parameter" },
    "summary": "string — Zusammenfassung der Korrektur"
  }
}
```

Nur Einträge mit `ausgang === 'abgelehnt'` UND gesetztem `folgeKorrektur` sind
zulässige Eingabe — ein blosses `abgelehnt` ohne Folge-Korrektur trägt kein
DPO-Paar (es fehlt der `chosen`-Teil).

## Ausgabeformat (`kosmo-dpo/v1`, `V082-SPEZ.md` §3.3)

```jsonc
{
  "prompt": "string — die Ausgangslage, die zum Vorschlag führte",
  "chosen": "string — die manuelle Korrektur (Zusammenfassung + Params)",
  "rejected": "string — der ursprünglich abgelehnte Vorschlag",
  "meta": { "id": "string", "quelle": "string", "visibility": "public | private" }
}
```

**Beispiel** (konkret durchgerechnet):

```jsonc
// Eingabe:
{
  "commandId": "design.wandSetzen",
  "params": { "dicke": 200 },
  "summary": "Wand mit 200mm Dicke setzen",
  "ausgang": "abgelehnt",
  "grund": "Aussenwand, nicht Innenwand",
  "folgeKorrektur": {
    "commandId": "design.wandSetzen",
    "params": { "dicke": 300 },
    "summary": "Wand mit 300mm Dicke setzen (Aussenwandstärke)"
  }
}

// Ausgabe:
{
  "prompt": "Wand setzen — Vorschlag: Wand mit 200mm Dicke setzen (design.wandSetzen, dicke=200)",
  "chosen": "Wand mit 300mm Dicke setzen (Aussenwandstärke) — design.wandSetzen, dicke=300",
  "rejected": "Wand mit 200mm Dicke setzen — design.wandSetzen, dicke=200 (Grund: Aussenwand, nicht Innenwand)",
  "meta": {
    "id": "proposal-dpo-<ts oder log-index>",
    "quelle": "proposal-log:<commandId>@<ts>",
    "visibility": "private"
  }
}
```

## Schritt-Prompt-Vorlage

```
Du kuratierst EIN Ablehnung+Korrektur-Paar aus proposal-log.ts zu einer
kosmo-dpo/v1-Zeile für den Adapter kosmo-buero-dpo. Eingabe (Log-Eintrag):
<hier einfügen>.

1. Prüfe: ausgang === 'abgelehnt' UND folgeKorrektur gesetzt? Wenn nein:
   STOPP, kein Paar erzeugen.
2. 'prompt' = die Ausgangslage (commandId + Kernparameter des ABGELEHNTEN
   Vorschlags, neutral formuliert — nicht schon die Antwort vorwegnehmen).
3. 'rejected' = summary + Kernparameter des abgelehnten Vorschlags; falls
   'grund' gesetzt ist, in Klammern anhängen.
4. 'chosen' = summary + Kernparameter der folgeKorrektur — NIE erfinden,
   NUR das übernehmen, was tatsächlich in folgeKorrektur steht.
5. meta.quelle = "proposal-log:<commandId>@<ts>", meta.visibility nach
   Owner-Entscheid-1 (bei Zweifel 'private').
6. Gib die fertige JSON-Zeile aus. Keine Erklärung, keine Vorworte.
```

## Qualitätskriterien

- **`chosen` ist IMMER die reale Folge-Korrektur**, nie eine von Claude für
  "besser" gehaltene Alternative — das Paar bildet einen echten
  Architekten-Entscheid ab, kein Claude-Urteil.
- **`rejected` bleibt der reale, ursprüngliche Vorschlag** — auch wenn er aus
  heutiger Sicht seltsam wirkt; DPO-Paare brauchen den echten Kontrast, keine
  Strohmann-Ablehnung.
- **`grund` fliesst in `rejected` ein, wenn vorhanden** — er ist Teil des
  Kontrasts (WARUM wurde abgelehnt), keine separate Trainingsspur.
- **Ein Paar, ein Ereignis** — kein Zusammenfassen mehrerer Ablehnungen zu
  einem DPO-Paar.

## Nie-Regeln

- **Nie ohne `folgeKorrektur`** — eine reine Ablehnung ohne Folge-Korrektur
  ist ein `proposal`-Signal (`art: 'proposal'`, `kosmo-signal/v1`), niemals
  ein DPO-Paar; dieses Playbook erzeugt aus einem solchen Eintrag NICHTS.
- **Nie ohne `visibility`** — Pflichtfeld, sonst weist der Validator die
  Zeile hart zurück (`V082-SPEZ.md` §3.4).
- **Nie erfinden** — weder ein plausibler `chosen`-Text noch ein
  "aufgehübschter" `rejected`-Text; beide Seiten sind wörtliche Ableitungen
  aus dem Log-Eintrag.
- **Claude trainiert NICHT sich selbst** — diese Paare sind für Kosmos
  lokalen `kosmo-buero-dpo`-Adapter, dessen Training laut Registry noch
  aussteht (`wissen/training/REGISTRY.md`, Status «heute leer»).
