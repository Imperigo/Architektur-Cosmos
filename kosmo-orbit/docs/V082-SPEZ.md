# v0.8.2 «Selbstverbesserung» — Spezifikation (verbindlich)

*P0 · Paket W0 des v0.8.2-Wellenplans. Dieses Dokument ist die verbindliche Grundlage für
W1–W3 — jede Struktur, jedes Schema und jede Sanktion hier ist der Massstab, gegen den W3
(Matrix-Abnahme, P8) am Ende prüft. Änderungen an dieser Spez nach W0 sind Owner-Sache,
nicht Bauagenten-Ermessen (Muster `docs/V081-SPEZ.md`).*

**Quellen:** der genehmigte Wellenplan (`root-claude-uploads-73575e4c-8c15-5ba3-silly-
plum.md`, Owner-Auftrag 17.07.2026, 4 Owner-Entscheide, Zielkompetenz-Karte, Struktur/
Schemata, Wellenplan P0–P8, Nicht-in-0.8.2-Liste) · die Fable-Erkundungs-Kurzfassung
(drei Explore-Berichte + Plan-Agent-Entwurf: LoRA-Ist mit Belegen, 5 Top-Signale, Format-
Wildwuchs, Zusatz-Kandidaten, Baselines) · zwei bindende Owner-Nachträge vom 17.07.2026
(Vis-Commands/Publish-Layout-Signal; maximale Welle-1-Parallelisierung — beide wörtlich in
§5/§6 eingearbeitet) · `docs/V081-SPEZ.md` (Gliederungs-/Matrix-Disziplin, insbesondere
§9 zu C-31) · `docs/LORA-KONZEPT.md` + `docs/KOSMOTRAIN.md` (referenziert, **nicht**
ersetzt). Alle Datei:Zeile-Belege in diesem Dokument sind gegen den Repo-Stand `602e25a`
(Branch `claude/kosmo-orbit-v1-build-pzxkbj`, v0.8.1 released) selbst nachgeprüft — 15
Fundstellen wurden stichprobenhaft gegen den Code verifiziert (Liste in §10, inkl. zweier
Präzisierungen gegenüber der Kurzfassung: der AF-Stempel-Anteil in §7 und die
`toJsonl()`-Visibility-Lücke in §4.4).

---

## 0 · Auftrag, Ehrlichkeits-Kern, Owner-Entscheide

### 0.1 · Auftrag (wörtlich)

Owner-Auftrag 17.07.2026: «LoRA-Konzept verbessern — Claude-Strang und Kosmo-Strang
**parallel**, Speicherorte und Trainingsziele klären, saubere Struktur/Pipeline bauen, Ziel
**«Kosmo wird intelligenter und selbstverbessernd, alles auf git erfasst»**, plus eigene
0.8.2-Vorschläge.» Grundlage sind drei Erkundungen (LoRA-Ist mit Belegen, ~43k Chunks
Bilanz, `lora-training.ts`-Stand) plus ein Plan-Agent-Entwurf: Pipeline-Kern existiert
(`docs/LORA-KONZEPT.md` Grundriss+Imaging, `docs/KOSMOTRAIN.md` Persona), aber **11
Lücken** (kein Journal→Git-Weg, drei uneinheitliche JSONL-Formate, Generator-Skript nicht
eingecheckt, keine Eval-Automatik, Staffelung unverdrahtet …) und die **5 wertvollsten
Betriebssignale** (Diff-Karten-Entscheide, Ablehnung+Korrektur, Chat-Verläufe,
CH-STT-Paare, Parameter-Reparaturen) verpuffen heute im RAM.

### 0.2 · Der Ehrlichkeits-Kern (verbindlich, wörtlich in diese Spez übernommen)

**Claude ist nicht LoRA-trainierbar** — Cloud-API, keine eigenen Gewichte, kein
Gradienten-Zugriff. Ein „Claude lernt automatisch dazu“-Versprechen wäre eine Attrappe.
Der ehrliche Doppel-Strang, den diese Version baut:

- **Strang A «Claude-Lernschleife»** = (a) ein **git-erfasster Lehren-Korpus**, der pro
  Session lädt und pro Version per Pflicht-Ritual zurückgeschrieben wird — **Kontext-
  Training als funktionales LoRA-Äquivalent**, kein echtes Fine-Tuning, sondern ein
  wachsender, versionierter Gedächtnis-Anker, den jede künftige Sitzung liest — **plus**
  (b) Claude als **Lehrer/Destillateur** für Kosmos echte Trainingsdaten: Journal-Einträge
  zu SFT-Beispielen kuratieren, Ablehnungen+Korrekturen zu DPO-Paaren umschreiben,
  synthetische Command-Beispiele aus zod-Schemas erzeugen.
- **Strang B «Kosmo-LoRA»** = echtes lokales Training: kanonische, git-erfasste
  Datensätze + reproduzierbare Generatoren + App-seitige Erfassung + ein Trainer-Contract.
  Der **GPU-Lauf selbst bleibt eine deklarierte HomeStation-Grenze** (`docs/
  HOMESTATION-AUFTRAG.md`) — hier container-baubar: alles, was VOR und NACH dem Lauf
  passiert (Daten, Schema, Manifest, Validierung, Bericht).

### 0.3 · Die 4 Owner-Entscheide (17.07.2026, bindend, wörtlich)

1. **Private Signale ins private Git** (`wissen/training/signale/`) mit
   visibility-Pflichtfeld; nur `public` verlässt je das Repo. Nie ins Git: Audio-Rohdaten,
   Binär/Base64, Fremd-PDFs.
2. **Drei getrennte Adapter**: `kosmo-buero` / `kosmo-zeichner-grundriss` /
   `kosmo-zeichner-commands`; Stacking nur als dokumentierte Registry-Option.
3. **Staffelung: automatisch + sichtbares Rollen-Badge** an der Antwort.
4. **AF-Stempel: Ist-Verhalten wird Soll** — Spez wird zurückgeholt, **kein
   Golden-Wechsel**; v0.8.2 ist eine **golden-stille Version** (35 byte-gleich). Details
   und die exakte Präzisierung, WAS genau sanktioniert wird, in §7.

Zusätzlich, Fable-Empfehlungen ohne Owner-Widerspruch: **Trainingspaket-Übergabe per
Manifest-Export** (kein aufruferloser Bridge-Endpunkt — dieselbe Begründung, mit der
`lora-training.ts:13-31` bereits einen `/lora-train`-Bridge-Endpunkt verworfen hat: ein
Endpunkt ohne einen einzigen Aufrufer wäre selbst eine Attrappe); **STT-Paar-Aufbewahrung
nur als Konzept+Registry-Zeile** (kein Bridge-Bau, kein Audio-Persistieren in dieser
Version).

Diese vier Entscheide binden §1–§2 (Entscheid 1–2), §6/P6 (Entscheid 3) und §7
(Entscheid 4) dieser Spez unmittelbar.

### 0.4 · Golden-stille Version

v0.8.2 verändert **keinen** der 35 SVG-Goldens. Anders als `docs/V081-SPEZ.md` §5 (dort
genau EIN Sammelwechsel `081`) gibt es hier **keinen** deklarierten Golden-Churn — auch
§7 (AF-Stempel-Rückholung) verändert nichts an der Geometrie, weil das sanktionierte
Ist-Verhalten bereits das ist, was die Goldens heute zeigen (s. §7). Abnahme in §8/§9:
`npm run svg-qa` bleibt 35/0 harte Fehler, byte-identisch zum v0.8.1-Stand.

### 0.5 · Verhältnis zu bestehenden Leitdokumenten

- **`docs/LORA-KONZEPT.md`** (Ziel A Grundriss-Generierung, Ziel B Imaging-Stil) bleibt in
  Kraft und wird durch diese Spez **operationalisiert**: die dort skizzierte Vollmenge
  (§5 dortiger Fahrplan, „v1.1“) wird hier zu P2; die Obsidian-Wissensspeicher-Notizen
  (`wissen/vault/LoRA/*.md`) bleiben unverändert bestehen und referenzieren weiterhin
  dieselbe Konzept-Datei.
- **`docs/KOSMOTRAIN.md`** (Persona-LoRA aus dem Lernjournal, Unsloth-Rezept) bleibt in
  Kraft; die neue Verzeichnisstruktur (§2) kanonisiert lediglich WO die dort erzeugten
  Exporte landen, ohne das Rezept selbst zu ändern.
- **`docs/V081-SPEZ.md`** bleibt für alles in Kraft, was diese Spez nicht anfasst
  (Werkzeug-Umbau, Zwei-Stufen-Popups, LLM-Framework KI1–KI4, sechs D-Brocken) — v0.8.2
  ist kein zweiter LLM-Reset, sondern ein gezielter Ausbau der Trainings-/Lern-Pipeline
  auf dieser Grundlage. §9.6 von `V081-SPEZ.md` (C-35…C-42, KI1–KI4) bleibt unverändert
  erledigt/vertagt stehen; C-31 (dort §9.5) wird in §7 dieser Spez **formell geschlossen**
  (nicht editiert, s. §7).

---

## 1 · Strang A «Claude-Lernschleife»

### 1.1 · Lehren-Korpus-Format

`wissen/training/claude/lehren/vX.md` — **eine Datei je Version** (z. B. `v0.8.2.md`),
Markdown mit Frontmatter, feste Feldstruktur:

```markdown
---
version: 0.8.2
datum: 2026-07-17
---

## Gate
- <Lehre über ein Test-/Build-/svg-qa-Gate> (Beleg: Datei:Zeile oder ROADMAP-Nr.)

## Konvention
- <Lehre über eine Code-/Doku-Konvention> (Beleg: …)

## Fehler
- <ein tatsächlich gemachter und korrigierter Fehler dieser Version> (Beleg: …)

## Owner-Entscheid
- <ein bindender Owner-Entscheid dieser Version, wörtlich oder präzise paraphrasiert> (Beleg: …)
```

Jede Zeile unter jeder Kategorie trägt einen **Beleg** (Datei:Zeile oder ROADMAP-Nummer)
— dieselbe Belegdisziplin, die diese Spez selbst durchhält. Eine Zeile ohne Beleg ist
keine Lehre, sondern eine Behauptung, und gehört nicht in die Datei.

### 1.2 · Lade-Ritual

`CLAUDE.md` bekommt unter «Was du zuerst liest» einen neuen Punkt: **«`wissen/training/
claude/lehren/` — die letzten 2–3 Versionsdateien lesen, bevor du mit einem neuen Paket
beginnst.»** Kein technischer Zwang (kein Hook, kein automatischer Prompt-Inject) — Claude
Code liest `CLAUDE.md` ohnehin beim Sessionstart; die Pflicht ist redaktionell (der
Verweis existiert und ist auffindbar), nicht mechanisch erzwungen. Das unterscheidet sich
bewusst von Kosmos eigenem Journal-Prompt-Block (`memory.ts:98-113`, `toPromptBlock()`),
der technisch in jeden Systemprompt eingebaut wird — Claude bekommt keinen Gewichts-Zugriff
und braucht deshalb keinen Auto-Inject, sondern ein lesbares, versioniertes Gedächtnis.

### 1.3 · Rückschreib-Pflicht im Release-Ablauf

`CLAUDE.md`s Arbeitsmuster-Absatz («Je Block: Feature → Tests → ROADMAP-Eintrag → Commit
→ Push») wird um einen **Release-Ritual-Schritt** ergänzt: **vor dem letzten
Release-Commit einer Version schreibt der ausführende Agent `wissen/training/claude/
lehren/vX.md`** für die soeben abgeschlossene Version (Gates/Konventionen/Fehler/
Owner-Entscheide dieser Version, je mit Beleg). Das ist die in §9 geforderte
**Selbstanwendung**: P8 (§6) schreibt die `v0.8.2.md`-Datei erstmals in genau diesem
Release-Ritual — die erste Lehren-Datei überhaupt entsteht **rückwirkend** in P4 (aus
0.8.0/0.8.1 befüllt, s. §6), die zweite entsteht **vorwärts** im eigenen Release von P8.

### 1.4 · Destillations-Playbooks

`wissen/training/claude/playbooks/` — drei Prompt-Vorlagen-Dateien (Markdown, kein
Code; sie beschreiben, WIE Claude eine Kuration durchführt, nicht ein Skript, das es
automatisch tut — Claude bleibt der Kurator, nicht ein Autopilot):

- **`journal-zu-sft.md`** — Vorlage: ein kuratierter Journal-Eintrag (`Learning` MIT
  gesetzter Notiz, dieselbe Regel wie `architekturKorpus()`, `state/
  training-korpus.ts:80-95`) wird zu einem `kosmo-sft/v1`-Beispiel für den Adapter
  `kosmo-buero` umgeschrieben (System/User/Assistant-Aufbau, `meta.quelle =
  journal:<ts>`).
- **`ablehnung-zu-dpo.md`** — Vorlage: ein Ablehnung+Folge-Korrektur-Paar aus dem neuen
  `proposal-log.ts` (§4.1) wird zu einem `kosmo-dpo/v1`-Paar (`chosen` = die
  manuelle Korrektur, `rejected` = der ursprünglich abgelehnte Vorschlag) umgeschrieben.
- **`zod-zu-commands.md`** — Vorlage: aus dem zod-`params`-Schema eines Kernel-Commands
  (`packages/kosmo-kernel/src/commands/*.ts`, automatisch Kosmo-Tool via
  `commandTools()`) werden synthetische Tool-Call-Beispiele für den Adapter
  `kosmo-zeichner-commands` erzeugt — analog zur bestehenden `softwareKorpusCommands()`
  (`state/training-korpus.ts:44-55`), aber als kuratierte SFT-Zeile statt als Live-Tool-
  Beschreibung.

Jede Playbook-Datei benennt: Zweck, Eingabeformat, Ausgabeformat (mit einem Beispiel) und
den Warnhinweis **«Claude kuratiert — Claude trainiert NICHT sich selbst»** (Ehrlichkeits-
Kern, §0.2).

---

## 2 · Strang B Datenraum

### 2.1 · Lage von `wissen/` (Präzisierung, wichtig für alle Pfade unten)

`wissen/` liegt **nicht** unter `kosmo-orbit/`, sondern als **Geschwisterverzeichnis** von
`kosmo-orbit/` im selben Repo (`git rev-parse --show-toplevel` = Repo-Wurzel
`Architektur-Cosmos/`; `tools/secret-scan.mjs:372-380` dokumentiert das exakt so:
`wissenRoots()` löst `path.resolve(root, '..', 'wissen', name)` auf). `docs/
LORA-KONZEPT.md`/`docs/KOSMOTRAIN.md` referenzieren `wissen/training/…` bereits ohne
`../`-Präfix — dieselbe, etablierte Doku-Konvention gilt für alle Pfade in dieser Spez.

### 2.2 · Verzeichnis-Soll (P0 fixiert feldgenau)

```
wissen/training/
  korpora/                        # 7 bestehende Chunk-JSONL, git mv (§2.3)
    briefings.jsonl
    buecher.jsonl
    lehrhefte.jsonl
    normen.jsonl
    persona.jsonl
    projektwissen.jsonl
    vorlesungen.jsonl
  sft/
    kosmo-buero/                  # neu, Konverter aus Journal (P1-Gerüst, P4 befüllt Claude-seitig)
    kosmo-zeichner-grundriss/      # git mv aus training/lora/, P2 baut die Vollmenge
      grundriss-v0.jsonl
    kosmo-zeichner-commands/       # neu, P4 befüllt via zod-zu-commands-Playbook
  signale/                        # kuratierte App-Exporte, kosmo-signal/v1, NUR nach Visibility-Filter
  dpo/
    kosmo-buero/                  # kosmo-dpo/v1, heute leer, wächst ab P3
  eval/
    <adapter>/                    # feste Eval-Prompt-Sets je Adapter
  claude/
    lehren/                       # vX.md je Version (§1.1)
    playbooks/                    # 3 Dateien (§1.4)
  REGISTRY.md                     # die eine Adapter-Übersicht (§2.4)
```

### 2.3 · Migrationstabelle (git mv, Alt → Neu)

| Alt | Neu | Ziel-Paket |
|---|---|---|
| `wissen/training/briefings.jsonl` + 6 weitere Korpus-Dateien (`buecher/lehrhefte/normen/persona/projektwissen/vorlesungen.jsonl`) | `wissen/training/korpora/*.jsonl` | P1 |
| `wissen/training/lora/grundriss-v0.jsonl` | `wissen/training/sft/kosmo-zeichner-grundriss/grundriss-v0.jsonl` | P1 (git mv) / P2 (Vollmenge daneben) |
| *(kein Alt-Äquivalent)* | `wissen/training/sft/kosmo-buero/` (Gerüst) | P1 |
| *(kein Alt-Äquivalent)* | `wissen/training/signale/`, `dpo/`, `eval/` (Gerüst + README je Ordner, keine Inhalte) | P1 |
| *(kein Alt-Äquivalent)* | `wissen/training/claude/` (lehren/ + playbooks/, vollständig befüllt) | P4 (exklusiv, s. §6) |
| *(kein Alt-Äquivalent)* | `wissen/training/REGISTRY.md` | P1 |

`docs/LORA-KONZEPT.md`/`docs/KOSMOTRAIN.md` selbst werden **nicht** editiert (referenziert,
nicht ersetzt, §0.5) — die Migrationstabelle ist die einzige Wahrheit für den P1-Umzug;
ein Referenz-grep-Sweep (P1) zieht alle Code-Stellen nach, die alte Pfade hart verdrahtet
haben (`tools/secret-scan.mjs` selbst braucht KEINE Anpassung — es kennt nur die
Unterordner-Namen `vault`/`training`, nicht deren Tiefenstruktur).

### 2.4 · `REGISTRY.md`-Spaltenschema

Eine Tabelle, eine Zeile je Adapter/Signal-Quelle:

`Adapter | Ziel | Quellen (Pfade) | Schema | Status | Eval | HomeStation-Stand`

- **Status**-Werte: `leer` · `wächst` · `reproduzierbar` · `vollständig`.
- **HomeStation-Stand**-Werte: `nicht trainiert` · `trainiert` · `GGUF exportiert`.

8 Zeilen gesamt (die 6 Adapter aus der Zielkompetenz-Karte, §5, plus die zwei neuen
Sichtbarkeits-/Signal-Zeilen aus dem Owner-Nachtrag, ebenfalls §5).

---

## 3 · Die drei Schemata (feldgenau)

### 3.1 · `kosmo-sft/v1` (Muster grundriss-v0 wird Standard)

```jsonc
{
  "messages": [
    { "role": "system", "content": "…" },
    { "role": "user", "content": "…" },
    { "role": "assistant", "content": "…" }
  ],
  "meta": {
    "id": "string, eindeutig innerhalb der Datei",
    "adapter": "kosmo-buero | kosmo-zeichner-grundriss | kosmo-zeichner-commands",
    "quelle": "string — Generator-Pfad#Funktion ODER journal:<ts> ODER command:<id>",
    "visibility": "public | private",
    "qualitaet": { "checksBestanden": true, "hinweise": [] }
  }
}
```

`meta` ist **Provenienz, nie Trainingsfeld** — der Trainer liest ausschliesslich
`messages` (dieselbe Regel, die `docs/LORA-KONZEPT.md:127-129` bereits für
`grundriss-v0.jsonl` festhält).

### 3.2 · `kosmo-signal/v1` (Roh-Signale vor Kuration)

```jsonc
{
  "art": "journal | proposal | reparatur | transkript | layout",
  "ts": "ISO-Zeitstempel",
  "visibility": "public | private",
  "payload": { "// struktur je 'art', s. §4" },
  "meta": { "quelle": "string", "sessionId": "string?" }
}
```

`art`-Enum umfasst fünf Werte: `journal` (Daumen hoch/runter + Notiz), `proposal`
(Diff-Karten-Ausgang), `reparatur` (Parameter-Reparatur falsch→richtig), `transkript`
(CH-STT, s. §5 Registry-Zeile `whisper-ch` — heute nur Konzept), `layout`
(Auto-Pack-Blattlayout-Präferenz, neu per Owner-Nachtrag, s. §4.3/§5).

### 3.3 · `kosmo-dpo/v1`

```jsonc
{
  "prompt": "string",
  "chosen": "string",
  "rejected": "string",
  "meta": { "id": "string", "quelle": "string", "visibility": "public | private" }
}
```

### 3.4 · Validator `tools/training/validiere-sft.mjs` (neu, P1)

**Harte Fehler** (Exit ≠ 0):
- eine Zeile ist kein valides JSON;
- `messages` fehlt (bei `kosmo-sft/v1`) bzw. `prompt`/`chosen`/`rejected` fehlt (bei
  `kosmo-dpo/v1`) bzw. `art`/`payload` fehlt (bei `kosmo-signal/v1`);
- `meta.adapter` fehlt oder ist nicht in der `REGISTRY.md`-Adapterliste enthalten;
- `meta.visibility` (bzw. `visibility` bei `kosmo-signal/v1`) fehlt für eine Datei unter
  `signale/` oder `dpo/`;
- ein Nie-ins-Git-Muster im Payload (§3.5).

**Warnungen** (Exit 0, im Bericht aufgeführt):
- `meta.quelle` fehlt (Provenienz-Lücke, kein Blocker fürs Training selbst);
- ungewöhnlich lange `messages`-Einträge (Budget-Hinweis, kein Fehler);
- doppelte `meta.id`/`meta.id`-ähnliche Werte innerhalb derselben Datei.

Der Validator prüft **Struktur + Visibility**, **nicht** auf Secrets — das bleibt
exklusiv `tools/secret-scan.mjs`s Aufgabe (keine Doppelspurigkeit, s. §3.5).

### 3.5 · Nie-ins-Git-Liste (bindend, präzisiert Owner-Entscheid 1)

Audio-Rohdaten (STT bleibt Wegwerf-Tmp, `tools/homestation-bridge/kosmo_bridge/
main.py:819`), Binär-/Base64-Blobs, fremde PDFs (Lizenzfrage), API-Schlüssel/Tokens
(bereits durch `tools/secret-scan.mjs` gedeckt, `WISSEN_UNTERORDNER`-Scan §2.1). Diese
Liste ist eine **Ergänzung**, kein Ersatz für den bestehenden Secret-Scan.

---

## 4 · Signal-Erfassung (P3)

### 4.1 · `proposal-log.ts`-Vertrag

Neuer Store `apps/kosmo-orbit/src/state/proposal-log.ts`. Ein Eintrag je Diff-Karten-
Ereignis: `commandId, params, summary, ausgang: 'angenommen' | 'abgelehnt' |
'fehlgeschlagen', grund?: string, folgeKorrektur?: { commandId, params, summary }`
(Verknüpfung zur manuellen Korrektur nach einer Ablehnung — der DPO-Rohpaar-Kern).

Der Store speist sich additiv aus den bestehenden Callback-Punkten in
`apps/kosmo-orbit/src/shell/KosmoPanel.tsx`: `applyCard` (Z. 1101–1124, `resolveApplied`-
Aufruf Z. 1108, `resolveRejected`-Aufruf im Fehlerfall Z. 1121), `rejectCard` (Z. 1129–
1132, `resolveRejected`-Aufruf Z. 1131) sowie die Paket-Schleife (Z. 1238/1245/1256).
`PendingCard extends Proposal` (Z. 111–123) trägt `commandId`/`params`/`summary` bereits —
heute gehen sie beim Karten-Abbau spurlos verloren, `proposal-log.ts` hält sie fest.

### 4.2 · Reparatur-Hook-Vertrag an `chat.ts:165–174`

**Nur additiv**: ein optionaler Callback `onReparatur?(vorher: unknown, nachher:
ValidatedCall)`, der feuert, wenn `validateToolCall` (`chat.ts:165`) eine Korrektur
vornimmt, BEVOR das Ergebnis als schreibender Vorschlag weiterläuft. Der bestehende
Fehlerpfad (Z. 166–174, `FEHLER: …`-Nachricht bei ungültigem Aufruf) bleibt **unverändert**
— der Hook ist ein reiner Beobachter, keine Verzweigung. `chat.ts`s `turn()`-Schleife
(Z. 111–196) und `resolveApplied`/`resolveRejected` (Z. 231–254) bleiben byte-gleich im
Kontrollfluss; die 189 KI-Tests bleiben grün ohne Anpassung an bestehenden Assertions.

### 4.3 · Journal-Archiv statt stiller Kappung

`packages/kosmo-ai/src/memory.ts:53` (`localStorage.slice(-200)`) und `apps/kosmo-orbit/
src/state/journal-store.ts:38` (IndexedDB-Spiegel, `slice(-400)`) bleiben **unverändert**
— sie sind bewusst kleine Fenster fürs Prompt-Budget (`toPromptBlock()`, `memory.ts:98–
113`, maximal 8 Einträge). **Neu:** ein unbegrenzter Archiv-Store (zweite IndexedDB-
Struktur neben dem bestehenden 400er-Spiegel) hält JEDEN je erfassten Eintrag, plus ein
Gesamt-Export-Weg (alle Einträge, nicht nur die jüngsten 400).

### 4.4 · Export-Fluss `kosmo-signal/v1` (schliesst eine echte Lücke)

**Befund:** `LearningJournal.toJsonl()` (`memory.ts:116–118`, genutzt vom Export-Knopf
`KosmoPanel.tsx:1610–1628`) exportiert heute **alle** Einträge roh — ohne die
`visibility`-Default-Normalisierung des `all`-Getters (`memory.ts:76–78`) anzuwenden und
ohne nach `visibility` zu filtern. Das widerspricht Owner-Entscheid 1 («nur `public`
verlässt je das Repo»), sobald ein Export tatsächlich ins Repo geschrieben würde — der
heutige Download-Knopf bleibt lokal (kein Git-Weg) und ist insofern nicht selbst ein
Verstoss, aber jeder KÜNFTIGE Git-Schreibweg MUSS vor dem Schreiben strikt nach
`visibility === 'public'` filtern. Der neue Export-Fluss (P3) schreibt `kosmo-signal/v1`-
Zeilen (§3.2) statt des heutigen rohen `Learning`-Objekts und wendet diesen Filter an.

### 4.5 · Neu: KosmoPublish-Layout-Signal (Owner-Nachtrag 17.07., zweiter Teil)

Zusätzlicher, kleiner Erfassungspunkt am `publish.blattFuellen`-Anwenden-Weg: sowohl der
Editor-Pfad (`apps/kosmo-orbit/src/modules/publish/AutoPackPanel.tsx:105–113`,
`anwenden()` → `runCommand('publish.blattFuellen', { sheetId, optionen: entwurf })`) als
auch der einfache Pfad ohne Editor (`PublishWorkspace.tsx:417–420`, `blattFuellen()`).
Bei jedem Anwenden entsteht ein `kosmo-signal/v1`-Eintrag mit `art: 'layout'`:

```jsonc
{
  "art": "layout",
  "payload": {
    "sheetId": "string",
    "vorschlag": "BlattPackOptions — Heuristik-Default (REIHENFOLGE_STANDARD + BLATT_PACK_DEFAULTS)",
    "endzustand": "BlattPackOptions — tatsächlich angewendeter Entwurf",
    "optionen": "BlattPackOptions — identisch zu endzustand, redundant für Klarheit im Payload"
  }
}
```

Der Diff zwischen `vorschlag` (Default-Heuristik) und `endzustand` (was der Architekt
tatsächlich anwendet, nachdem er in `AutoPackPanel.tsx` umgeordnet/nachjustiert hat) ist
ein echtes, bisher nirgends festgehaltenes Präferenzsignal (DPO-tauglich, s. Registry-
Zeile `kosmo-publish-layout` in §5). Dateikreis: `AutoPackPanel.tsx` + der neue
`proposal-log`-Store — additiv, disjunkt zu P1 (Datenraum-Struktur) und P4 (`claude/`-
Ordner). **Datenlage-Ehrlichkeit:** dieses Signal startet bei **null** und wächst erst mit
laufendem Bürobetrieb ab v0.8.2 — **kein Trainingslauf-Versprechen**, nur Erfassung.

---

## 5 · Zielkompetenz-Karte + Adapter-Registry-Soll

### 5.1 · Zielkompetenz-Karte (Owner-Frage «worin besser werden» — nach Datenlage)

| Kompetenz | Adapter | Datenlage | v0.8.2 |
|---|---|---|---|
| Software-Bedienung/Tool-Calling | **NEU `kosmo-zeichner-commands`** | sehr gut (Registry+zod deterministisch, Software-Korpus, neu Proposal-Log+Reparatur-Paare) | Datensatz bauen |
| Grundriss-Generierung | `kosmo-zeichner-grundriss` | sehr gut, aber Skript nicht eingecheckt | reproduzierbar + Vollmenge v1 + `segmentiere()` |
| Persona/Bürostil | `kosmo-buero` | gut (`persona.jsonl`, Journal wächst) | kanonisieren + Journal→Git |
| Präferenzen (DPO) | `kosmo-buero-dpo` | heute null, ab 0.8.2 wachsend | Erfassung bauen, Training später |
| CH-Deutsch-STT | `whisper-ch` (Registry) | null (Audio = Wegwerf-Tmp) | nur Konzeptzeile |
| Werkplan-Bildstil (Ziel B) | `kosmo-werkplan` (Registry) | null, 4 Owner-Entscheide offen | nur Registry-Status |

### 5.2 · Adapter-Registry-Soll (8 Zeilen)

1. **`kosmo-buero`** — Persona/Bürostil. Quellen: `sft/kosmo-buero/` (aus Journal-Notizen
   kuratiert). Status: wächst.
2. **`kosmo-zeichner-grundriss`** — Grundriss-Generierung. Quellen: `sft/kosmo-zeichner-
   grundriss/` (`grundriss-v0.jsonl` + P2-Vollmenge). Status: reproduzierbar.
3. **`kosmo-zeichner-commands`** — Software-Bedienung/Tool-Calling. Quellen: `sft/
   kosmo-zeichner-commands/`. Status: wird in P4 gebaut (Playbook `zod-zu-commands.md`).
4. **`kosmo-buero-dpo`** — Präferenzen. Quellen: `dpo/kosmo-buero/`. Status: heute leer.
5. **`whisper-ch`** — CH-Deutsch-STT. Status: «wartet auf Owner/HomeStation», Datenlage
   null (Audio bleibt Wegwerf-Tmp, `main.py:819`, Bridge-Bau erst nach separatem
   Owner-Go, §0.3).
6. **`kosmo-werkplan`** — Werkplan-Bildstil (Ziel B). Status: «wartet auf Owner/
   HomeStation», Datenlage null, 4 Owner-Entscheide offen (`docs/LORA-KONZEPT.md` §6).
7. **NEU `vis-befehle`** (Owner-Nachtrag, Sichtbarkeits-Zeile, kein eigener Adapter) —
   Status: **«in `kosmo-zeichner-commands` enthalten»**. Die neun `vis.*`-Commands
   (`packages/kosmo-kernel/src/commands/vis.ts`: `vis.graphErstellen`, `vis.nodeSetzen`,
   `vis.nodeParametrieren`, `vis.nodeSchieben`, `vis.verbinden`, `vis.trennen`,
   `vis.nodeLoeschen`, `vis.nodeKollabieren`, `vis.graphLoeschen` — Kamera-/Graph-/
   Stimmungs-Regie von KosmoVis) sind über `registerCommand()` registriert und damit
   automatisch Teil von `allCommands()`/`softwareKorpusCommands()`
   (`state/training-korpus.ts:44–55`) sowie jedes Kosmo-LLM-Tool via `commandTools()` —
   **Commands sind Commands**, kein separates Trainingsziel nötig, nur diese Registry-
   Zeile macht die Zugehörigkeit für die Owner-Übersicht sichtbar.
8. **NEU `kosmo-publish-layout`** (Owner-Nachtrag) — Trainingsziel «Blattlayout-
   Präferenzen des Büros» (Auto-Pack-Heuristik-Vorschlag vs. Owner-Endzustand, §4.5).
   Quellen: `signale/` mit `art: 'layout'`. Datenlage: **«null, wächst ab 0.8.2»** — kein
   Trainingslauf-Versprechen, reine Erfassung beginnt jetzt.

---

## 6 · Pakete P1–P8 (dateidisjunkt, maximale Welle-1-Parallelisierung)

**Wellenplan (Owner-Nachtrag 17.07., bindend):** **W1 — EINE Welle, sechs parallele
Sonnet-Pakete**: P1 Datenraum ‖ P2 Grundriss-v1 ‖ P3 Signal-Erfassung ‖ P4 Claude-Strang ‖
P5 Trainer-Contract ‖ P7a Kleinpaket-Sammel. **W2** — P6 Staffelung + Kuratier-Flow (NACH
P3, KosmoPanel-Kollision vermeiden). **W3** — P8 Matrix-Abnahme + Release.

### 6.1 · P1 «Datenraum» (W1)

**Scope:** `wissen/`-Neuordnung per `git mv` (Migrationstabelle §2.3), `REGISTRY.md`,
Gerüst-Ordner, `tools/training/validiere-sft.mjs` + Node-Tests, Konverter Alt→kanonisch,
Referenz-grep-Sweep.

**Dateikreis (Besitz):** P1 besitzt **`wissen/` komplett AUSSER** `sft/kosmo-zeichner-
grundriss/` (gehört P2, das sein Zielverzeichnis selbst anlegt — s. §6.2) und `claude/`
(gehört P4 exklusiv, §6.4). Für `signale/`, `dpo/`, `eval/` legt P1 **nur Gerüst + README**
an (keine Inhalte — die befüllen P3/P6/spätere HomeStation-Läufe). Zusätzlich
`tools/training/**` (neu, ausser dem P2-eigenen Generator-Skript) + `REGISTRY.md`.

**Gate:** Validator läuft grün über ALLE migrierten Datensätze; Doppellauf-Byte-Beweis
(zweimaliger Konverter-Lauf produziert byte-identisches Ergebnis). Kein E2E-Preview nötig
(reine Node-/Unit-Tests, kein Playwright-Port).

### 6.2 · P2 «Grundriss-v1 reproduzierbar» (W1, parallel zu P1)

**Scope:** `tools/training/generiere-grundriss-sft.mts` (seeded, aus
`generiereGrundriss`/`generiereGrundrissL` + `segmentiere()`), Vollmenge inkl. Ablehn-/
Diagnose-Fälle, `pruefeGrundriss`-Filter (geometrische Näherung wie in der Stichprobe,
`docs/LORA-KONZEPT.md` §1.3), Eval-Suite.

**Dateikreis:** `tools/training/generiere-grundriss-sft.mts` (neu, eigenes Skript) +
`wissen/training/sft/kosmo-zeichner-grundriss/` (P2 legt dieses Zielverzeichnis selbst an
— **P2 hängt NUR an den §3-Schemata dieser Spez, NICHT an P1s Umzugsarbeit**; das ist die
Begründung, warum P2 in derselben Welle wie P1 laufen kann, ohne auf P1s Abschluss zu
warten). Kein Preview-Port (Node-/Unit-Tests + Vitest-Golden für den Generator-Output).

**Gate:** Doppellauf byte-gleich (deterministischer Seed) + Statistikbericht (Verteilung
über Zimmerzahl/Korridorkante/Randfälle, analog `docs/LORA-KONZEPT.md` §4).

### 6.3 · P3 «Signal-Erfassung» (W1, parallel zu P1/P2/P4/P5/P7a)

**Scope:** `state/proposal-log.ts` (neu, §4.1), Reparatur-Hook an `chat.ts:165–174`
(additiv, §4.2), Journal-Archiv-Store (§4.3), Export-Fluss `kosmo-signal/v1` (§4.4), NEU:
Layout-Signal-Erfassungspunkt an `AutoPackPanel.tsx`/`PublishWorkspace.tsx` (§4.5).
**B1 «req.signal-Stop-Knopf» wandert von P7 hierher** (gleicher `KosmoPanel`/`chat.ts`-
Dateikreis wie die übrige P3-Arbeit — Kollisionsvermeidung mit P7a, das denselben Bereich
sonst separat anfassen müsste).

**Dateikreis:** `KosmoPanel.tsx` (additiv: `proposal-log`-Aufrufe, `req.signal`-Stop-Knopf),
`memory.ts`/`journal-store.ts` (additiv: Archiv-Store), `chat.ts` (NUR additive Event-
Callbacks, `turn()`-Schleife Z. 111–196 unantastbar), `AutoPackPanel.tsx`/
`PublishWorkspace.tsx` (additiv: Layout-Signal).

**E2E-Port:** 5174. **Gate:** 189 KI-Tests byte-gleich; E2E «Ablehnen mit Grund → Log →
Export enthält DPO-Rohpaar»; E2E/Unit «Auto-Pack umordnen+anwenden → Signal-Eintrag mit
`art:'layout'`, Export enthält das `vorschlag`/`endzustand`-Paar»; `req.signal`-Stop-Knopf
funktionsfähig (B1-Abnahme).

### 6.4 · P4 «Claude-Strang» (W1, parallel)

**Scope:** `docs/CLAUDE-LERNSCHLEIFE.md` (neu), die drei Destillations-Playbooks (§1.4),
Pflichtschritt «Lehren zurückschreiben» in `CLAUDE.md` (§1.3), erste Lehren-Datei
**rückwirkend aus 0.8.0/0.8.1 befüllt**, `docs/V-NAECHSTE-KANDIDATEN.md` bereinigen (C-31
strichen mit Verweis auf §7 dieser Spez; C-41/«Tab (c)» je nach Ausgang von P6/P7a
präzisieren, nicht vorschnell strichen).

**Dateikreis:** `wissen/training/claude/**` **komplett und exklusiv** (kein anderes Paket
schreibt dorthin) + `CLAUDE.md` + `docs/CLAUDE-LERNSCHLEIFE.md` (neu) + `docs/
V-NAECHSTE-KANDIDATEN.md`.

**Gate:** Lehren-Datei-Struktur validiert (Feldstruktur §1.1, mit Belegen); Playbooks
vollständig (Zweck/Eingabe/Ausgabe/Warnhinweis je Datei); Kandidatenliste bereinigt. Kein
Preview-Port (Doku-Arbeit).

### 6.5 · P5 «Trainer-Contract» (W1, parallel)

**Scope:** `@kosmo/contracts` `lora-train/v1` (Manifest mit Datei-Hashes + Bericht-Schema),
`lora-training.ts` additiv aufs kanonische `kosmo-sft/v1`-Schema, `TrainWorkspace`
«Trainingspaket schnüren»-Export, `FakeLoraTrainer` bleibt ehrlicher Stub
(`lora-training.ts:207–227`), HomeStation-Übergabezeile im Manifest.

**Dateikreis:** `packages/kosmo-contracts/src/lora-train.ts` (neu), `packages/kosmo-ai/
src/lora-training.ts` (additiv), `apps/kosmo-orbit/src/modules/train/TrainWorkspace.tsx`
(additiv: Export-Knopf).

**E2E-Port:** 5176. **Gate:** Manifest-Hash-Prüfung (eine Datei ändert sich → der Hash im
Manifest ändert sich, zwei Läufe über denselben Datenstand liefern denselben Hash —
deterministisch reproduzierbar, kein erfundener Wert).

### 6.6 · P7a «Kleinpaket-Sammel» (W1, parallel)

**Scope (nach B1-Umzug zu P3, §6.3):** B2 (Prepare-`onProgress`+Nachvektorisieren), B4
(Autopack-Preset), B5 (`trust`/`paket`-Rang→Nutzungszeit 14/14), C1+C2 (Alt-Flake-Härtung
`dock-tour`/«Tab (c)»). Je Punkt ein eigener Beweis (kein Sammel-«passt schon»).

**Dateikreis:** disjunkt zu P1–P5 (verschiedene, kleinteilige Fundstellen je
Einzelpunkt — Prepare-Workspace, Autopack-Presets-Registry, `orbit-rang.ts`, die
betroffenen E2E-Specs selbst).

**E2E-Port:** 5175. **Gate:** je Einzelpunkt eigener, isolierter Beweis (N Wiederholungen
grün für die Flake-Härtungen C1/C2; funktionale Abnahme für B2/B4/B5).

### 6.7 · P6 «Staffelung + Kuratier-Flow» (W2, nach P3-Merge)

**Scope:** `ChatSession`/`KosmoPanel` rufen `staffelung.ts` je Aufgabenklasse (7 Klassen,
`staffelung.ts:129–146`), Rollen-Badge an Antworten (Owner-Entscheid 3), Kuratier-Flow
Journal→`exportiereUndTrainiere` aus der Oberfläche. Ein-Modell-Sitzung bleibt Default
(additiv, `StaffelungKonfig.einzelModell`-Fallback bereits vorhanden, `staffelung.ts:161–
169`). MockProvider-Tests je Aufgabenklasse.

**Warum NACH P3, nicht parallel:** P6 und P3 berühren denselben `KosmoPanel`/`chat.ts`-
Dateikreis (P3: Reparatur-Hook + Proposal-Log; P6: Rollen-Wechsel je Zug) — ein
gleichzeitiger Bau würde denselben Datei-Bereich aus zwei Paketen heraus verändern
(Merge-Kollisionsrisiko), deshalb W2 statt W1.

### 6.8 · P8 «Matrix-Abnahme + Release» (W3)

Adversarial gegen §9 dieser Spez; volle Suiten 964/1217/189/28/29/8/95, `svg-qa` 35
byte-gleich als Beweis der golden-stillen Version (§0.4); **Selbstanwendung**: die
`v0.8.2.md`-Lehren-Datei wird in diesem Ritual **vorwärts** geschrieben (§1.3); ROADMAP,
Versions-Bump, Rundgang-PDF, `release-gate`, Push, `SendUserFile`.

---

## 7 · AF-Stempel-Rückholung (C-31 der v0.8.1 formell geschlossen)

**Ist-Verhalten, exakt** (`packages/kosmo-kernel/src/derive/plankopf.ts`):
`STEMPEL_BREITE_VERHAELTNIS = 0.48` (Z. 596 — der Stempel ist 48 % der Zeichenflächen-
**Breite**, nicht 6 %), `STEMPEL_SEITENVERHAELTNIS = 0.24` (Z. 598, `hoehe = breite ×
0.24`). Die **6 %** stecken ausschliesslich in der Rahmen-**Strichstärke**:
`stroke-width="${(hoehe * 0.06).toFixed(2)}"` (Z. 653) — **6 % der resultierenden
Stempelhöhe**, nicht der Blattbreite.

**Owner-Entscheid 4 (§0.3) sanktioniert genau dieses Ist-Verhalten** — die Kombination
0.48/0.24/Strichstärke=6 % der Stempelhöhe — als formelles Soll. Die in `docs/
V081-SPEZ.md` §6.1 einst vorgeschlagene, **nie gebaute** «6 % der Blattbreite +
dokumentierte Mindestgrösse»-Formel wird **nicht** nachträglich umgesetzt: eine
Umstellung darauf hätte die Geometrie (Breite/Höhe/Strichstärke des Stempels) verschoben
und das golden-eingefrorene `plankopf-framework.svg` gebrochen — genau der Grund, warum
`docs/V081-SPEZ.md:657–659` den Punkt seinerzeit als VERTAGT markierte.

`docs/V081-SPEZ.md:651–660` (der C-31-VERTAGT-Vermerk) bleibt als Historie **unverändert
stehen** — diese Spez editiert das abgeschlossene Dokument nicht, sondern erklärt den
Punkt hiermit für **formell geschlossen**. P4 (§6.4) zieht `docs/
V-NAECHSTE-KANDIDATEN.md` (dort Zeile 22–25) entsprechend nach: der Punkt wird gestrichen,
mit dem Verweis «geschlossen durch `V082-SPEZ.md` §7».

**Explizit: kein Golden-Wechsel.** `plankopf-framework.svg` bleibt byte-gleich — es ändert
sich rechnerisch nichts, das sanktionierte Soll IST das heutige Ist.

---

## 8 · Sanktionsliste (abschliessend)

Erwartet **leer**, ausser:

1. **Additive `testid`s** — neue, rein additive `data-testid`-Attribute aus P3
   (`req.signal`-Stop-Knopf, Layout-Signal-UI-Anker falls sichtbar), P6 (Rollen-Badge) und
   P7a (Kleinpaket-Fixes) — jeweils **einzeln zu listen, sobald das jeweilige Paket
   gebaut ist** (diese P0-Spez kann sie noch nicht vorwegnehmen; sie legt nur die Regel
   fest: additiv, nie eine Streichung/Umbenennung bestehender `testid`s).
2. **Kandidatenlisten-Bereinigung** — `docs/V-NAECHSTE-KANDIDATEN.md` (P4, §6.4/§7).
3. **Neue Docs** — `docs/V082-SPEZ.md` (dieses Dokument), `docs/CLAUDE-LERNSCHLEIFE.md`,
   `wissen/training/REGISTRY.md`, die Lehren-/Playbook-Dateien.

**Goldens:** 35 byte-identisch, **kein** Wechsel deklariert (§0.4).

**Alles andere** — insbesondere `state/dock-kern.ts`s Solver-Kern, `chat.ts`s
`turn()`-Schleife, `resolveApplied`/`resolveRejected`, `memory.ts`s Kappungs-Konstanten
(200/400), alle 33+2=35 Goldens, alle bestehenden `testid`s/aria-labels — bleibt
byte-gleich.

---

## 9 · Vollständigkeits-Matrix (Abnahme-Grundlage W3/P8)

Jede der 4 Owner-Entscheide, jeder Satz des Owner-Auftrags, jede der 11 Lücken, jedes der
5 Top-Signale, die Zusatzkandidaten und der Owner-Nachtrag sind unten einzeln erfasst,
mit Ziel-Paket und Abnahmekriterium.

### 9.1 · Die 4 Owner-Entscheide (17.07.2026)

- [ ] **C-1** Private Signale ins private Git, visibility-Pflichtfeld → **P1/P3** ·
  Abnahme: `kosmo-signal/v1`-Schema trägt `visibility` als Pflichtfeld (§3.2), Validator
  (P1) weist Zeilen ohne `visibility` unter `signale/`/`dpo/` hart zurück (§3.4), Export
  (P3) filtert vor dem Schreiben auf `public` (§4.4).
- [ ] **C-2** Drei getrennte Adapter + Stacking nur als Registry-Option → **P1** ·
  Abnahme: `REGISTRY.md` führt `kosmo-buero`/`kosmo-zeichner-grundriss`/
  `kosmo-zeichner-commands` als getrennte Zeilen; ein Stacking-Hinweis existiert nur als
  dokumentierte Option, kein Automatismus.
- [ ] **C-3** Staffelung automatisch + sichtbares Rollen-Badge → **P6** · Abnahme:
  `ChatSession` wählt die Rolle je Aufgabenklasse ohne manuellen Schalter, jede Antwort
  zeigt ein Rollen-Badge.
- [ ] **C-4** AF-Stempel Ist-Verhalten wird Soll, C-31 formell geschlossen, kein
  Golden-Wechsel → **§7 (diese Spez) / P4 (Kandidatenliste)** · Abnahme: §7 vollständig
  ausformuliert, `docs/V-NAECHSTE-KANDIDATEN.md`-Zeile gestrichen, `svg-qa` 35/0
  unverändert.

### 9.2 · Ehrlichkeits-Kern-Umsetzung

- [ ] **C-5** Lehren-Korpus lädt pro Session, wird pro Version zurückgeschrieben →
  **P4/P8** · Abnahme: `CLAUDE.md`-Verweis existiert (P4), `v0.8.2.md` wird im
  Release-Ritual geschrieben (P8, §1.3/§6.8).
- [ ] **C-6** Claude-als-Destillateur-Playbooks vorhanden und vollständig → **P4** ·
  Abnahme: alle drei Playbook-Dateien (§1.4) mit Zweck/Eingabe/Ausgabe/Warnhinweis.

### 9.3 · Die 11 Lücken aus der Kurzfassung

- [ ] **C-7** Kein Journal→Git-Weg → **P3** · Abnahme: Export-Fluss schreibt
  `kosmo-signal/v1` nach `wissen/training/signale/` (§4.4).
- [ ] **C-8** Drei uneinheitliche JSONL-Formate (`memory.toJsonl`/`lora-training`/
  `training-korpus`/`grundriss-v0`) → **P1 (Schema) + P4 (Konverter für `kosmo-buero`)** ·
  Abnahme: alle vier Alt-Formen sind auf `kosmo-sft/v1`/`kosmo-signal/v1`/`kosmo-dpo/v1`
  abgebildet, kein fünftes Format entsteht neu (§3).
- [ ] **C-9** Generator-Skript nicht eingecheckt (`docs/LORA-KONZEPT.md:319-324`) →
  **P2** · Abnahme: `tools/training/generiere-grundriss-sft.mts` ist im Repo, seeded,
  Doppellauf byte-gleich.
- [ ] **C-10** Keine Eval-Automatik → **P2 (Grundriss) / P5 (Registry-Feld)** · Abnahme:
  P2 liefert eine feste Eval-Suite; `REGISTRY.md`-Spalte `Eval` ist befüllbar.
- [ ] **C-11** Staffelung unverdrahtet (0 App-Aufrufer, `staffelung.ts:41-46`) → **P6** ·
  Abnahme: identisch mit C-3.
- [ ] **C-12** Diff-Karten-Entscheid verpufft (`chat.ts` resolveApplied/resolveRejected,
  `KosmoPanel.tsx:1108/1121/1131/1238/1245/1256`) → **P3** · Abnahme: identisch mit dem
  Top-Signal C-18 unten (ein Fund, eine Abnahme, kein Doppel-Zählen).
- [ ] **C-13** Ablehnungsgrund + Folge-Korrektur verpuffen (`rejectCard`,
  `KosmoPanel.tsx:1129`) → **P3** · Abnahme: identisch mit C-19 unten.
- [ ] **C-14** `ChatSession.messages` komplett RAM (`chat.ts:38`, `history` ungenutzt,
  `chat.ts:76`) → **P3 (Archiv-Store)** · Abnahme: identisch mit C-20 unten.
- [ ] **C-15** STT-Audio Wegwerf-Tmp (`main.py:798-822`) → **GRENZE, Registry-Zeile
  `whisper-ch`** · Abnahme: §5.2 Zeile 5 dokumentiert, kein Bau in v0.8.2.
- [ ] **C-16** Parameter-Reparatur verpufft (`chat.ts:165-174`) → **P3** · Abnahme:
  identisch mit C-21 unten.
- [ ] **C-17** `journal.toJsonl()` exportiert ohne Visibility-Filter (neu gefundene
  12. Lücke, ergänzt die Kurzfassungs-11er-Liste um einen bei der Verifikation
  entdeckten Fall) → **P3** · Abnahme: identisch mit C-7/C-1 (derselbe Export-Fluss löst
  beides).

### 9.4 · Die 5 Top-Signale

- [ ] **C-18** Diff-Karten-Entscheid (commandId+params+summary+Ausgang) → **P3** ·
  Abnahme: `proposal-log.ts` hält jeden Ausgang fest (§4.1), E2E-Beweis §6.3.
- [ ] **C-19** Ablehnungsgrund + manuelle Folge-Korrektur (DPO-Gold) → **P3** · Abnahme:
  `folgeKorrektur`-Feld verknüpft Ablehnung und Korrektur, Export enthält das Rohpaar.
- [ ] **C-20** ChatSession-Verlauf (RAM-only) → **P3** · Abnahme: Archiv-Store hält den
  Verlauf unbegrenzt, Gesamt-Export existiert (§4.3).
- [ ] **C-21** Parameter-Reparatur falsch→richtig → **P3** · Abnahme: Reparatur-Hook an
  `chat.ts:165-174` additiv gebaut, feuert bei jeder `validateToolCall`-Korrektur (§4.2).
- [ ] **C-22** CH-STT-Paare → **GRENZE** · Abnahme: nur Konzept+Registry-Zeile
  (`whisper-ch`, §5.2 Zeile 5), kein Bridge-Bau (Owner-Entscheid, §0.3).

### 9.5 · Zusatzkandidaten (Kleinpaket-Sammel)

- [ ] **C-23** B1 `req.signal`-Stop-Knopf (ROADMAP 1327) → **P3** (umgezogen von P7,
  §6.3) · Abnahme: Stop-Knopf funktionsfähig, eigener E2E-Beweis.
- [ ] **C-24** B2 Prepare-`onProgress`+Nachvektorisieren (ROADMAP 1318) → **P7a** ·
  Abnahme: `onProgress` genutzt, `vektorisiereFehlende` hat einen Aufrufer.
- [ ] **C-25** B4 Autopack-Preset (ROADMAP 1416) → **P7a** · Abnahme: mindestens ein
  Preset wählbar.
- [ ] **C-26** B5 `orbit-rang`/Stationen ohne `trust`/`paket` → Nutzungszeit 14/14
  (ROADMAP 1422/1441) → **P7a** · Abnahme: alle 14 Stationen erfasst (heute 7/14).
- [ ] **C-27** C1 `dock-tour`-Flake (ROADMAP 1333, `e2e/dock-tour.spec.ts:155`) →
  **P7a** · Abnahme: N Wiederholungen grün.
- [ ] **C-28** C2 «Tab (c)»-Volllast-Flake (ROADMAP 1445, `dock-interaktion:676`) →
  **P7a** · Abnahme: N Wiederholungen grün, `docs/V-NAECHSTE-KANDIDATEN.md`-Zeile
  entsprechend nachgezogen (P4).

### 9.6 · Owner-Nachtrag (vis-Commands + Publish-Layout-Signal)

- [ ] **C-29** Vis-Commands-Sichtbarkeit in der Registry → **P1** · Abnahme:
  `REGISTRY.md` führt die Zeile `vis-befehle` mit Status «in `kosmo-zeichner-commands`
  enthalten» (§5.2 Zeile 7).
- [ ] **C-30** KosmoPublish-Layout-Signal-Erfassung → **P3** · Abnahme: Umordnen +
  Anwenden im `AutoPackPanel` (und der einfache `blattFuellen()`-Weg) erzeugt einen
  `kosmo-signal/v1`-Eintrag mit `art:'layout'` (`vorschlag`/`endzustand`/`optionen`),
  Export enthält das Paar; Datenlage-Ehrlichkeit («null, wächst ab 0.8.2») ist im
  Registry-Eintrag `kosmo-publish-layout` (§5.2 Zeile 8) explizit vermerkt — kein
  Trainingslauf-Versprechen.

### 9.7 · Selbstanwendung

- [ ] **C-31** Lehren-Datei v0.8.2 existiert und wurde im Release-Ritual geschrieben →
  **P8** · Abnahme: `wissen/training/claude/lehren/v0.8.2.md` committet VOR dem
  Release-Commit, alle vier Kategorien (Gate/Konvention/Fehler/Owner-Entscheid) befüllt,
  jede Zeile mit Beleg.

### 9.8 · Abschluss

- [ ] **C-32** W3/P8 Matrix-Abnahme (adversarial gegen diese Matrix) → Muss-Fixes →
  Release v0.8.2 → **P8** · Abnahme: jede Zeile C-1…C-31 mit Beleg abgehakt oder als
  GRENZE ehrlich re-bestätigt; volle Suiten grün; `svg-qa` 35/0 byte-gleich;
  `release-gate` Exit 0; ROADMAP-Eintrag; Rundgang-PDF; `SendUserFile`.

---

## 10 · Geprüfte Belege (Gegenprüfung gegen den Code, Repo-Stand `602e25a`)

1. `tools/secret-scan.mjs:372-389` — Geschwister-Lage von `wissen/{vault,training}`,
   `.jsonl` als erlaubte Erweiterung (Z. 116) — **bestätigt**, s. §2.1.
2. `packages/kosmo-ai/src/memory.ts` (ganze Datei) — `Learning`-Feldstruktur,
   `localStorage.slice(-200)` Z. 53, `toPromptBlock()` Z. 98-113, `toJsonl()` Z. 116-118
   — **bestätigt**; zusätzlich Lücke gefunden (kein Visibility-Filter beim Export,
   s. §4.4).
3. `packages/kosmo-ai/src/lora-training.ts` (ganze Datei) — `LoraTrainer`-Interface
   Z. 180-183, `FakeLoraTrainer` Z. 207-227, `exportiereUndTrainiere` Z. 238-245,
   Bridge-Verzicht-Begründung Z. 13-31 — **bestätigt exakt**.
4. `packages/kosmo-ai/src/chat.ts` (ganze Datei, 256 Zeilen) — `validateToolCall`/
   Fehlerpfad Z. 165-174, `resolveApplied` Z. 231-241, `resolveRejected` Z. 244-254 —
   **bestätigt exakt**.
5. `apps/kosmo-orbit/src/shell/KosmoPanel.tsx` — `applyCard` Z. 1101-1124, `rejectCard`
   Z. 1129-1132, Paket-Schleife Z. 1238/1245/1256, Journal-Export-Button Z. 1610-1628,
   Daumen-Feedback ohne Notiz Z. 1755-1770 — **bestätigt**.
6. `apps/kosmo-orbit/src/state/training-korpus.ts` (ganze Datei) — `architekturKorpus`
   (nur Einträge MIT Notiz) Z. 80-95, `exportTrainingJsonl` Z. 98-110,
   `softwareKorpusCommands`/`ladeDokuKorpus` Z. 44-69 — **bestätigt**.
7. `packages/kosmo-ai/src/staffelung.ts` (ganze Datei) — `KosmoRolle` Z. 54,
   `STANDARD_ROLLEN_MODELL_KARTE` Z. 82-93, 7 Aufgabenklassen Z. 129-146,
   App-Anbindung bewusst offen Z. 41-46 — **bestätigt exakt**.
8. `docs/LORA-KONZEPT.md` (ganze Datei) — Ehrlichkeits-Rahmen §0, JSONL-Schema §1.2,
   Qualitätsfilter §1.3, Stichprobe 29 Zeilen §4, offene Owner-Entscheide §6 —
   **bestätigt**.
9. `docs/KOSMOTRAIN.md` (ganze Datei) — Export-Format `{sentiment,context,ts}` §2,
   Unsloth-Rezept §3, Ehrlichkeiten (<200 Einträge) §4, HomeStation-Backlog ~43k Chunks
   §5 — **bestätigt**.
10. `packages/kosmo-kernel/src/derive/plankopf.ts` — `STEMPEL_BREITE_VERHAELTNIS=0.48`
    Z. 596, `STEMPEL_SEITENVERHAELTNIS=0.24` Z. 598, `stroke-width = hoehe*0.06` Z. 653
    — **Präzisierung gefunden**: die «6 %» sind die Stempelhöhen-Strichstärke, nicht die
    Blattbreiten-Grösse des Stempels selbst (s. §7).
11. `docs/V-NAECHSTE-KANDIDATEN.md` (ganze Datei) — AF-Stempel-Punkt Z. 22-25 (C-31/
    ROADMAP 408), Rollen-Staffelung-App-Anbindung Z. 27-30 (C-41), «Tab (c)» Z. 31-32 —
    **bestätigt**.
12. `apps/kosmo-orbit/src/modules/publish/AutoPackPanel.tsx` — Vorschau/Anwenden-Fluss
    Z. 52-113 — **bestätigt** (Grundlage für §4.5/C-30).
13. `packages/kosmo-kernel/src/commands/vis.ts` — neun `vis.*`-Commands via
    `registerCommand` — **bestätigt** (Grundlage für §5.2 Zeile 7/C-29).
14. `apps/kosmo-orbit/src/state/journal-store.ts:38` — IndexedDB-Spiegel,
    `[...nurAlt, ...kurz].slice(-400)` — **bestätigt**.
15. Existenzprüfung (Repo-Stand `602e25a`): `tools/training/`, `validiere-sft.mjs`,
    `packages/kosmo-contracts/src/lora-train.ts`, `apps/kosmo-orbit/src/state/
    proposal-log.ts` existieren **noch nicht** — v0.8.2/P0 ist reine Spezifikation;
    `tools/build-software-korpus.mjs` existiert bereits — **bestätigt**.

---

*Ende der Spezifikation. Diese Datei wird NICHT während der Umsetzung (W1–W3) verändert —
findet ein Paket einen Widerspruch zu dieser Spez, ist das ein Fall für ein kurzes
Owner-Review, kein stiller Re-Interpretationsspielraum im Code.*
