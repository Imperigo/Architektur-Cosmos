# Eval-Suite `kosmo-zeichner-grundriss` (v0.8.2/P2)

Feste, versionierte Eval-Suite für den Adapter `kosmo-zeichner-grundriss`
(`../../REGISTRY.md`), gebaut in P2 (`docs/V082-SPEZ.md` §6.2/§9.3 C-10,
`docs/LORA-KONZEPT.md` §1.4: "Eval-Suite (fest, vorher/nachher)").

## Dateien

- **`prompts.json`** — zwölf feste Wohnungs-Konstellationen (Rechteck, L-Form,
  Wohnungs-Segmentierung, plus zwei ausdrücklich "unregelmässige" Umrisse, die
  der Algorithmus v1 ehrlich ablehnt) mit maschinenlesbarem `erwartung`-Feld
  je Prompt (Kriterien-Legende in derselben Datei unter `kriterien_legende`).
- **`pruefe-eval.mts`** — ausführbarer Prüfer. Zwei Modi:
  1. **Selbstcheck** (kein Argument): erzeugt die Referenz-Antwort direkt aus
     den Kernel-Funktionen (`generiereGrundriss`/`generiereGrundrissL`/
     `segmentiere`/`zerlegeRektilinear`) und prüft sie gegen die Kriterien —
     muss 12/12 grün sein (beweist, dass die Kriterien selbst korrekt sind).
  2. **Kandidaten-Check** (`--kandidat=pfad.jsonl`): prüft externe Antworten
     (z. B. eines künftigen HomeStation-LoRA-Checkpoints) gegen dieselben
     Kriterien. Format je Zeile: `{"id":"eval-01-rect-klein","assistant":"<JSON-String>"}`.

## Aufruf

```bash
cd kosmo-orbit
npx tsx ../wissen/training/eval/kosmo-zeichner-grundriss/pruefe-eval.mts
npx tsx ../wissen/training/eval/kosmo-zeichner-grundriss/pruefe-eval.mts --kandidat=pfad/zu/kandidat.jsonl
```

Exit-Code 0 nur wenn ALLE geprüften Prompts bestehen, sonst 1 mit einer
Tabelle der Fehlschläge (Prompt-ID + Begründung).

## Kriterien (Kurzfassung — Volltext in `prompts.json` unter `kriterien_legende`)

| `erwartung.typ` | Kriterium |
|---|---|
| `layout` | ≥ 1 Raum, keine Zimmerbreite < 2.40 m bei HNF (checks.ts-Näherung), HNF+VF ≤ Wohnungsfläche |
| `ablehnung` | 0 Räume, Diagnose erklärt warum |
| `diagnose` | Layout MIT einer erwarteten Diagnose-Teilzeichenkette |
| `unregelmaessig` | `zerlegeRektilinear()` liefert `typ:'unregelmaessig'` (Algorithmus-Grenze v1, nur achsparallele Rechteck/L-Formen) |
| `segmentierung-layout` | ≥ 1 geschnittene Wohnung, Flächensumme ≤ Footprint-Fläche |
| `segmentierung-ablehnung` | 0 geschnittene Wohnungen (kein Band ≥ 3 m Tiefe), Diagnose erklärt warum |

## Ehrlichkeit (GRENZE, `docs/LORA-KONZEPT.md` §0)

Es gibt noch KEINEN trainierten HomeStation-Checkpoint für diesen Adapter
(`../../REGISTRY.md`: HomeStation-Stand = "nicht trainiert") — der
Kandidaten-Modus ist vorbereitet, aber bisher unbenutzt. Der Selbstcheck
beweist nur, dass die Kriterien gegen die REFERENZ (den deterministischen
Kernel-Generator selbst) korrekt auswerten — kein Vorher/Nachher-Vergleich
hat bisher stattgefunden.
