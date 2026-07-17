# Claude-Lernschleife — Betriebskonzept (Strang A, `docs/V082-SPEZ.md` §1)

> **Ehrlichkeits-Kern (wörtlich, `docs/V082-SPEZ.md` §0.2):** Claude ist nicht
> LoRA-trainierbar — Cloud-API, keine eigenen Gewichte, kein Gradienten-Zugriff.
> Diese Lernschleife ist **kein Fine-Tuning**. Sie ist ein git-erfasster,
> wachsender, versionierter Gedächtnis-Anker («Kontext-Training als
> funktionales LoRA-Äquivalent»), den jede künftige Sitzung liest, **plus**
> Claudes Rolle als **Lehrer/Destillateur** für Kosmos echte Trainingsdaten
> (Strang B, `wissen/training/sft|dpo|signale`). Wer «Claude lernt automatisch
> dazu» liest, liest zu viel hinein — es lernt niemand automatisch; es wird
> **redaktionell und diszipliniert nachgeführt**.

Dieses Dokument ist die verbindliche Betriebsanleitung für Strang A. Es
beschreibt vier Dinge: das Korpus-Format, wie eine neue Sitzung die Lehren
lädt, die Pflicht, sie vor jedem Release zurückzuschreiben, und Claudes Rolle
als Kurator für die drei Destillations-Playbooks.

---

## 1 · Lehren-Korpus-Format

Ort: `wissen/training/claude/lehren/vX.md` — **eine Datei je Version**
(z. B. `v0.8.1.md`, `v0.8.2.md`), Markdown mit Frontmatter, feste
Feldstruktur (identisch zu `V082-SPEZ.md` §1.1):

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

**Belegdisziplin (bindend):** jede Zeile unter jeder Kategorie trägt einen
**Beleg** — entweder `Datei:Zeile` oder eine `ROADMAP.md`-Eintragsnummer. Eine
Zeile ohne Beleg ist keine Lehre, sondern eine Behauptung, und gehört nicht in
die Datei. Dieselbe Disziplin, die `V082-SPEZ.md` selbst durchhält (§10, 15
gegengeprüfte Belege).

Eine Kategorie darf leer bleiben (nicht jede Version bringt z. B. einen
Owner-Entscheid hervor) — sie wird dann als Überschrift ohne Zeilen
weggelassen, nie mit einer erfundenen Lehre aufgefüllt.

---

## 2 · Lade-Ritual

`kosmo-orbit/CLAUDE.md` trägt unter «Was du zuerst liest» den Punkt:

> **`wissen/training/claude/lehren/` — die letzten 2–3 Versionsdateien lesen,
> bevor du mit einem neuen Paket beginnst.**

**Kein technischer Zwang** — kein Hook, kein automatischer Prompt-Inject.
Claude Code liest `CLAUDE.md` ohnehin beim Sessionstart; die Pflicht ist
**redaktionell** (der Verweis existiert und ist auffindbar), nicht mechanisch
erzwungen. Das unterscheidet sich bewusst von Kosmos eigenem
Journal-Prompt-Block (`packages/kosmo-ai/src/memory.ts:98-113`,
`toPromptBlock()`), der technisch in jeden Systemprompt eingebaut wird —
Kosmo braucht den Auto-Inject, weil sein LLM-Kontext pro Zug neu zusammengebaut
wird; Claude Code liest `CLAUDE.md` als Datei und braucht dafür keinen
zweiten Mechanismus.

**Praktisch für eine neue Sitzung:**
1. `CLAUDE.md` lesen (Sessionstart, ohnehin Pflicht).
2. Dem Verweis zu `wissen/training/claude/lehren/` folgen.
3. Die 2–3 jüngsten `vX.md`-Dateien lesen (nach Versionsnummer sortiert,
   `ls wissen/training/claude/lehren/` genügt — Dateinamen sind SemVer-sortierbar).
4. Gate-/Konventions-/Fehler-Lehren vor dem eigenen ersten Commit im Kopf
   behalten — sie sind der Grund, warum dieselbe Klasse Fehler nicht zweimal
   gemacht werden soll (Beispiel: die «N-passed-Zeile statt Exit-Code»-Lehre
   aus v0.8.0B, s. `lehren/v0.8.0B.md`).

---

## 3 · Rückschreib-Pflicht im Release-Ablauf

`kosmo-orbit/CLAUDE.md`s Arbeitsmuster-Absatz («Je Block: Feature → Tests →
ROADMAP-Eintrag → Commit → Push») bekommt einen **Release-Ritual-Schritt**:

> **Vor dem letzten Release-Commit einer Version schreibt der ausführende
> Agent `wissen/training/claude/lehren/vX.md`** für die soeben abgeschlossene
> Version (Gates/Konventionen/Fehler/Owner-Entscheide dieser Version, je mit
> Beleg).

Das ist die **Selbstanwendung** des Prinzips: die Lernschleife wendet ihre
eigene Regel zuerst auf sich selbst an, bevor sie irgendetwas anderes
verlangt. Details des Ablaufs (WANN im Release-Fluss dieser Schritt sitzt):
`docs/RELEASE-ABLAUF.md` Abschnitt «Lehren zurückschreiben».

**Prüfbar im Abnahme-Gate:** eine Matrix-Abnahme (Muster `V081-SPEZ.md` §9,
`V082-SPEZ.md` §9) fragt explizit «existiert `lehren/vX.md` für diese Version,
committet VOR dem Release-Commit, alle vier Kategorien mit Beleg?» — genau wie
`V082-SPEZ.md` C-31/§9.7 es für v0.8.2 selbst verlangt.

**Zeitliche Reihenfolge der ersten beiden Lehren-Dateien** (dokumentiert, damit
niemand die Chronologie missversteht): die **erste** Lehren-Datei überhaupt
entsteht **rückwirkend** in v0.8.2/P4 (aus v0.8.0/v0.8.0B/v0.8.1 befüllt — das
ist dieses Dokument samt den drei Dateien in `lehren/`); die **zweite**
entsteht **vorwärts**, im eigenen Release-Ritual von v0.8.2/P8. Ab dann ist der
Vorwärts-Fall der Normalfall, der Rückwärts-Fall war ein einmaliger
Anschub.

---

## 4 · Destillations-Rolle

Claude ist in Strang A nicht nur Leser, sondern **Lehrer/Destillateur** für
Strang B: er kuratiert Rohsignale (Journal-Einträge, Ablehnung+Korrektur-Paare,
zod-Command-Schemas) zu echten Trainingsdaten für Kosmos LoRA-Adapter
(`kosmo-buero` / `kosmo-zeichner-grundriss` / `kosmo-zeichner-commands`, s.
`wissen/training/REGISTRY.md`). Die drei Vorlagen dafür liegen unter
`wissen/training/claude/playbooks/`:

| Datei | Kuriert … | … zu | Ziel-Adapter |
|---|---|---|---|
| `journal-zu-sft.md` | einen Journal-Eintrag mit Notiz | `kosmo-sft/v1` | `kosmo-buero` |
| `ablehnung-zu-dpo.md` | ein Ablehnung+Korrektur-Paar (`proposal-log.ts`) | `kosmo-dpo/v1` | `kosmo-buero-dpo` |
| `zod-zu-command-beispielen.md` | ein zod-`params`-Schema eines Kernel-Commands | `kosmo-sft/v1` | `kosmo-zeichner-commands` |

**Jede Playbook-Datei ist eine Prompt-Vorlage, kein Skript.** Sie beschreibt,
WIE Claude eine Kuration von Hand (oder als angeleiteter Prompt-Schritt)
durchführt — Claude bleibt der Kurator, nie ein Autopilot, der sich selbst
trainiert. Details, Ein-/Ausgabeschema und Qualitätskriterien je Playbook in
den einzelnen Dateien.

---

## 5 · Verhältnis zu anderen Dokumenten

- **`docs/V082-SPEZ.md` §1** ist die verbindliche Grundlage — dieses Dokument
  operationalisiert sie, ändert sie aber nicht.
- **`docs/LORA-KONZEPT.md`** / **`docs/KOSMOTRAIN.md`** beschreiben Strang B
  (echtes Kosmo-LoRA) und bleiben unverändert in Kraft.
- **`docs/RELEASE-ABLAUF.md`** ist die Quelle für den WANN-Teil der
  Rückschreib-Pflicht (Abschnitt 3 oben).
