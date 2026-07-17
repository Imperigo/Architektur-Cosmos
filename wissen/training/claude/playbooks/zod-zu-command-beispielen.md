# Playbook: zod-Schema → Command-Beispiele (`kosmo-sft/v1`, Adapter `kosmo-zeichner-commands`)

> **Claude kuratiert — Claude trainiert NICHT sich selbst.** Dieses Playbook
> ist eine Prompt-Vorlage für eine manuelle/angeleitete Kuration, kein Skript,
> das automatisch läuft. Die erzeugten Zeilen sind Trainingsmaterial für
> Kosmos lokalen `kosmo-zeichner-commands`-Adapter (`docs/V082-SPEZ.md` §0.2).
>
> *Entspricht der in `docs/V082-SPEZ.md` §1.4/§5.2 als „`zod-zu-commands.md`"
> benannten Vorlage — hier unter dem sprechenderen Dateinamen
> `zod-zu-command-beispielen.md` geführt, inhaltlich identisch.*

## Zweck

Aus dem zod-`params`-Schema eines Kernel-Commands
(`packages/kosmo-kernel/src/commands/*.ts`, registriert über
`registerCommand()`, automatisch Kosmo-Tool via `commandTools()`,
`packages/kosmo-ai/src/tools.ts:53-62`) werden **synthetische**
Tool-Call-Beispiele für den Adapter `kosmo-zeichner-commands` erzeugt — analog
zur bestehenden `softwareKorpusCommands()`
(`apps/kosmo-orbit/src/state/training-korpus.ts:44-55`), aber als kuratierte,
mehrschrittige SFT-Zeile statt als einzeilige Live-Tool-Beschreibung.
`softwareKorpusCommands()` beantwortet «was macht dieses Werkzeug»; dieses
Playbook geht einen Schritt weiter und übt **den Aufruf selbst** (Nutzerwunsch
→ korrekter Tool-Call mit validen Parametern).

Die neun `vis.*`-Commands (`packages/kosmo-kernel/src/commands/vis.ts`) fallen
unter dieselbe Regel wie jeder andere Command — **Commands sind Commands**,
kein separates Trainingsziel (`V082-SPEZ.md` §5.2 Zeile 7, Registry-Zeile
`vis-befehle`).

## Eingabeformat

Ein registrierter Command-Deskriptor (Ausschnitt aus `allCommands()`):

```jsonc
{
  "id": "string — z. B. 'design.wandSetzen', 'vis.nodeSetzen'",
  "title": "string — menschlesbarer Werkzeugname",
  "description": "string — was das Werkzeug tut",
  "params": "ZodType — z. B. z.object({ dicke: z.number(), ... })"
}
```

Beispiel real aus dem Repo (`packages/kosmo-kernel/src/commands/vis.ts:41-52`,
`addNode`): `params` ist grob
`z.object({ graphId: z.string(), kategorie: z.string(), x: z.number(),
y: z.number(), params: z.record(z.string(), ParamWert).optional() })`.

## Ausgabeformat (`kosmo-sft/v1`, `V082-SPEZ.md` §3.1)

```jsonc
{
  "messages": [
    { "role": "system", "content": "Du bist Kosmo, die Zeichner-KI von ArchitekturKosmos. Du bedienst die Software über Werkzeugaufrufe." },
    { "role": "user", "content": "<natürlicher Nutzerwunsch, der GENAU dieses Command auslösen sollte>" },
    { "role": "assistant", "content": "<Tool-Call als JSON: { \"tool\": \"<name>\", \"parameters\": { … } } — Parameter erfüllen das zod-Schema>" }
  ],
  "meta": {
    "id": "string, eindeutig innerhalb der Datei",
    "adapter": "kosmo-zeichner-commands",
    "quelle": "command:<commandId>",
    "visibility": "public",
    "qualitaet": { "checksBestanden": true, "hinweise": [] }
  }
}
```

**Beispiel** (konkret durchgerechnet, `vis.nodeSetzen`/`addNode`):

```jsonc
{
  "messages": [
    { "role": "system", "content": "Du bist Kosmo, die Zeichner-KI von ArchitekturKosmos. Du bedienst die Software über Werkzeugaufrufe." },
    { "role": "user", "content": "Setze einen neuen Render-Knoten in Graph g1 an Position 120/80." },
    { "role": "assistant", "content": "{\"tool\":\"vis_nodeSetzen\",\"parameters\":{\"graphId\":\"g1\",\"kategorie\":\"render\",\"x\":120,\"y\":80}}" }
  ],
  "meta": {
    "id": "cmdbsp-vis.nodeSetzen-01",
    "adapter": "kosmo-zeichner-commands",
    "quelle": "command:vis.nodeSetzen",
    "visibility": "public",
    "qualitaet": { "checksBestanden": true, "hinweise": [] }
  }
}
```

Tool-Namen im Assistant-Output folgen der echten Laufzeit-Konvention
(Punkt→Unterstrich, `commandIdFor()`/`toolNameFor()`, `tools.ts:37-38`) — NIE
den rohen `commandId`-Punkt-Namen verwenden, sonst übt das Beispiel ein Format,
das `validateToolCall` real ablehnen würde.

## Schritt-Prompt-Vorlage

```
Du erzeugst EIN synthetisches Tool-Call-Beispiel für den Adapter
kosmo-zeichner-commands aus einem Kernel-Command. Eingabe (Command-
Deskriptor inkl. zod-params): <hier einfügen>.

1. Lies params: welche Felder sind PFLICHT, welche optional, welche
   Wertebereiche/Enums gelten?
2. Formuliere EINEN natürlichen Nutzerwunsch, der genau dieses Command mit
   genau diesen (plausiblen, realistischen) Parametern auslösen sollte —
   kein Wunsch, der mehrdeutig zwischen zwei Commands liegt.
3. Baue den Tool-Call als JSON: { "tool": "<toolNameFor(commandId)>",
   "parameters": {…} } — jeder Parameterwert muss das zod-Schema TATSÄCHLICH
   erfüllen (Typen, Enums, min/max). Bei Unsicherheit: das Schema nochmal
   lesen, nicht raten.
4. Setze meta.quelle = "command:<commandId>", meta.adapter =
   "kosmo-zeichner-commands", meta.visibility = "public" (Commands/Schemas
   sind nie privat — es ist Software-Selbstwissen, kein Nutzerdatum).
5. Gib die fertige JSON-Zeile aus. Keine Erklärung, keine Vorworte.
```

## Qualitätskriterien

- **Der Tool-Call muss real gegen das Schema validieren** — vor dem Ausgeben
  gedanklich (oder mit `z.parse`) gegen das echte zod-Schema aus der
  Kernel-Command-Datei prüfen, nicht nur plausibel klingen lassen.
- **Ein Nutzerwunsch, ein eindeutiges Ziel-Command** — mehrdeutige Prompts
  (die z. B. sowohl `design.wandSetzen` als auch `design.zoneSetzen` treffen
  könnten) sind schlechte Trainingsbeispiele und werden verworfen, nicht
  künstlich präzisiert.
- **Parameterwerte plausibel im Architektur-Kontext** — Masse, Kategorien,
  IDs sollen wie echte Kosmo-Nutzung aussehen (keine `"foo"`/`123`-Platzhalter).
- **Mehrere Beispiele pro Command sind erlaubt** und erwünscht (verschiedene
  Formulierungen, verschiedene Parameterkombinationen) — `meta.id` bleibt je
  Zeile eindeutig (`cmdbsp-<commandId>-<laufnummer>`).

## Nie-Regeln

- **Nie ein Schema erfinden** — wenn `params` ein Feld nicht kennt, taucht es
  im Tool-Call nicht auf; kein Feld "dazu-halluzinieren", weil es fachlich
  sinnvoll klänge.
- **Nie den rohen Punkt-Namen als `tool`** — immer die reale
  `toolNameFor()`-Transformation anwenden (Unterstrich statt erstem Punkt),
  sonst übt das Beispiel ein Format, das die Laufzeit ablehnt.
- **Nie ohne `visibility`** — Pflichtfeld für den Validator
  (`tools/training/validiere-sft.mjs`, `V082-SPEZ.md` §3.4); bei
  Command-Beispielen ist `public` der Normalfall, aber das Feld muss trotzdem
  explizit gesetzt sein.
- **Claude trainiert NICHT sich selbst** — diese Zeilen sind für Kosmos
  lokalen `kosmo-zeichner-commands`-Adapter (heute «wird in P4 gebaut», s.
  `wissen/training/REGISTRY.md`), nie für Claudes eigene, nicht existente
  Gewichte.
