# Playbook: Journal → SFT (`kosmo-sft/v1`, Adapter `kosmo-buero`)

> **Claude kuratiert — Claude trainiert NICHT sich selbst.** Dieses Playbook
> ist eine Prompt-Vorlage für eine manuelle/angeleitete Kuration, kein Skript,
> das automatisch läuft. Jede Zeile, die dieses Playbook erzeugt, ist
> Trainingsmaterial für Kosmos lokales LoRA (`kosmo-buero`) — niemals für
> Claude selbst (`docs/V082-SPEZ.md` §0.2, Ehrlichkeits-Kern).

## Zweck

Ein kuratierter Lernjournal-Eintrag (`Learning` mit gesetzter Notiz) wird zu
einem `kosmo-sft/v1`-Beispiel für den Bürostil-Adapter `kosmo-buero`
umgeschrieben. Dieselbe Auswahlregel wie `architekturKorpus()`
(`apps/kosmo-orbit/src/state/training-korpus.ts:80-95`): **nur Einträge MIT
gesetzter, getrimmter Notiz** zählen — eine Notiz ist der Trainings-Kern, ein
reines Daumen-Feedback ohne Notiz ist keine SFT-Zeile.

## Eingabeformat

Ein `Learning`-Objekt aus dem Lernjournal (`packages/kosmo-ai/src/memory.ts`):

```jsonc
{
  "ts": "2026-07-17T09:14:00.000Z",
  "context": "Bürostil/Regel — z. B. 'Fensterbänke immer bemasst'",
  "sentiment": "up" | "down",
  "note": "die kuratierte Notiz — DER Trainings-Kern"
}
```

Nur Einträge mit `note?.trim()` truthy sind zulässige Eingabe (identische
Filterregel wie `architekturKorpus()`). Ein Eintrag ohne Notiz wird
übersprungen, nie mit einer erfundenen Notiz aufgefüllt.

## Ausgabeformat (`kosmo-sft/v1`, `V082-SPEZ.md` §3.1)

```jsonc
{
  "messages": [
    { "role": "system", "content": "Du bist Kosmo, die Büro-KI von ArchitekturKosmos. Antworte im etablierten Bürostil." },
    { "role": "user", "content": "<aus 'context' abgeleitete, natürlich formulierte Frage>" },
    { "role": "assistant", "content": "<'note', ggf. sprachlich geglättet, aber inhaltlich UNVERÄNDERT>" }
  ],
  "meta": {
    "id": "journal-2026-07-17T09:14:00.000Z",
    "adapter": "kosmo-buero",
    "quelle": "journal:2026-07-17T09:14:00.000Z",
    "visibility": "public" | "private",
    "qualitaet": { "checksBestanden": true, "hinweise": [] }
  }
}
```

**Beispiel** (konkret durchgerechnet): `context: "Fensterbänke im Grundriss"`,
`note: "Fensterbänke immer mit Aussenkante bündig zur Fassadenlinie zeichnen,
nicht zur Rohbaukante."` wird zu:

```jsonc
{
  "messages": [
    { "role": "system", "content": "Du bist Kosmo, die Büro-KI von ArchitekturKosmos. Antworte im etablierten Bürostil." },
    { "role": "user", "content": "Wie zeichne ich Fensterbänke im Grundriss korrekt?" },
    { "role": "assistant", "content": "Fensterbänke immer mit Aussenkante bündig zur Fassadenlinie zeichnen, nicht zur Rohbaukante." }
  ],
  "meta": {
    "id": "journal-2026-07-17T09:14:00.000Z",
    "adapter": "kosmo-buero",
    "quelle": "journal:2026-07-17T09:14:00.000Z",
    "visibility": "public",
    "qualitaet": { "checksBestanden": true, "hinweise": [] }
  }
}
```

## Schritt-Prompt-Vorlage

```
Du kuratierst EINEN Journal-Eintrag zu einer kosmo-sft/v1-Zeile für den
Adapter kosmo-buero. Eingabe (Learning-Objekt): <hier einfügen>.

1. Prüfe: hat der Eintrag eine nicht-leere 'note'? Wenn nein: STOPP, kein
   Beispiel erzeugen.
2. Leite aus 'context' eine natürliche User-Frage ab — erfinde keinen neuen
   fachlichen Inhalt, nur die Frageform.
3. Übernimm 'note' als Assistant-Antwort. Sprachlich glätten ist erlaubt
   (Grammatik, Satzbau); den fachlichen Inhalt NICHT verändern, NICHT
   ergänzen, NICHT interpretieren.
4. Setze meta.quelle = "journal:<ts>", meta.visibility nach der
   Owner-Entscheid-1-Regel (nur 'public' verlässt je das Repo — bei Zweifel
   'private' setzen, nie raten).
5. Gib die fertige JSON-Zeile aus. Keine Erklärung, keine Vorworte.
```

## Qualitätskriterien

- **Eine Notiz, eine Zeile** — kein Zusammenfassen mehrerer Journal-Einträge
  zu einem Beispiel (Provenienz muss 1:1 rückverfolgbar bleiben).
- **`messages` ist alles, was der Trainer liest** — `meta` ist Provenienz,
  nie Trainingsfeld (`docs/LORA-KONZEPT.md:127-129`-Regel, `V082-SPEZ.md` §3.1).
- **`meta.id` eindeutig** innerhalb der Zieldatei (Zeitstempel reicht i. d. R.).
- **Kein fünftes Format** — die Ausgabe ist IMMER `kosmo-sft/v1`, nie eine
  eigene Struktur (`V082-SPEZ.md` §3.4-Validator prüft genau das hart).

## Nie-Regeln

- **Nie ohne `visibility`** — jede Zeile unter `signale/`/`sft/` braucht das
  Feld, sonst weist der Validator (`tools/training/validiere-sft.mjs`) sie
  hart zurück (`V082-SPEZ.md` §3.4).
- **Nie erfinden** — Claude schreibt nie einen fachlichen Inhalt dazu, der
  nicht in `note` stand. Eine dürftige Notiz bleibt eine dürftige SFT-Zeile,
  wird aber nicht künstlich aufgehübscht.
- **Nie Rohdaten ohne Filter** — ein Eintrag ohne Notiz (reines Daumen-Feedback)
  wird nie in eine SFT-Zeile verwandelt (dieselbe Regel wie `architekturKorpus()`).
- **Claude trainiert NICHT sich selbst** — diese Zeilen sind für Kosmos
  lokalen `kosmo-buero`-Adapter, nie für Claudes eigenen (nicht existenten)
  Gewichts-Zugriff.
