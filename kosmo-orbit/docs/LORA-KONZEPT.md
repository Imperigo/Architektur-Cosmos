# LoRA-Konzept v1 — erste Trainingsrunde (Grundriss-Generierung + AI-Imaging)

> Owner-Auftrag (v0.6.2, 08.07.2026): «Erste LoRA-Runde Trainingsdaten: für
> Grundrissgenerierung und AI-Imaging. Baue ein LoRA-Konzept für beide auf.
> Später wird das lokale-LLM-Aufgabe, aber wir machen für v1 das Training mit
> Claude Code. Zeig mir, was und wie du für das Ziel trainierst. Finde einen
> Weg, das Wissen zu speichern — ich denke an den Obsidian-Vault.»

Dieses Dokument ist die Ergänzung zu `docs/KOSMOTRAIN.md` (das den Kosmo-
Persona-/Chat-LoRA aus dem Lernjournal behandelt). Hier geht es um **zwei
andere, projektinhaltliche Ziele**: Grundrisse erzeugen und Bilder im
Büro-Stil rendern.

## 0. Ehrlichkeits-Rahmen (verbindlich)

**Diese Cloud-Umgebung hat keine GPU.** Ein echter LoRA-Trainingslauf — egal
ob SDXL-/Flux-Stil-LoRA oder ein LLM-QLoRA-Lauf auf Qwen — läuft hier **nicht**
und wird **nicht vorgetäuscht**. Es gibt kein Fortschrittsbalken-Theater, keine
erfundenen Loss-Kurven, keine „trainiertes Modell"-Behauptung ohne trainiertes
Modell.

Was Claude Code in dieser Session **real** leistet — und das ist die
eigentliche Arbeit von «Training vorbereiten»:

| Schritt | Wer | Status |
|---|---|---|
| Datensatz-Erzeugung (deterministisch aus dem eigenen Kernel) | Claude Code (Cloud) | ✅ hier, siehe §1 + §4 |
| Kuration / Qualitätsfilter | Claude Code (Cloud) | ✅ hier, siehe §1.3 |
| Format/Schema festlegen | Claude Code (Cloud) | ✅ hier, siehe §1.2, §4 |
| Eval-Set (feste Prompts, vorher/nachher vergleichbar) | Claude Code (Cloud) | ✅ hier, siehe §1.4, §2.5 |
| Trainings-Rezept (Parameter-Startpunkt) | Claude Code (Cloud) | ✅ hier, siehe §1.5, §2.4 |
| **Der eigentliche GPU-Trainingslauf** | HomeStation (RTX 5090) | 🔒 siehe `docs/HOMESTATION-AUFTRAG.md` §2 |
| Eval-Auswertung des trainierten Checkpoints | HomeStation | 🔒 |
| Integration (GGUF→Ollama bzw. LoRA-Checkpoint in ComfyUI) | HomeStation | 🔒 siehe §5 |

`docs/HOMESTATION-AUFTRAG.md` beschreibt bereits, was NUR am Home-PC geht —
dieses Dokument schreibt dort **nichts** hinein, sondern referenziert nur.

## 1. Ziel A — Grundriss-Generierung

### 1.1 Was genau lernen?

**Aufgabe:** Raumprogramm + Parzellen-/Wohnungs-Constraints (strukturiertes
JSON) → Grundriss-Layout als strukturiertes JSON (Räume mit Umriss/Name/
Raumtyp/SIA-Fläche, Möblierung, Türen, Kennzahlen).

**Warum ein LLM-LoRA und kein reiner Algorithmus?** Der Algorithmus
(`derive/grundrissgenerator.ts`) ist bereits das **Rezept** — ein
deterministischer Fallback für rechteckige/L-förmige Grundrisse. Ein LoRA auf
einem lokalen LLM (Ziel: `Qwen3-Coder`-Klasse, im lokalen Rollen-Schema
`docs/KI-MODELL-GUIDELINE.md` Teil C der **Kosmo-Zeichner** — Ausführer-Rolle,
kein Kosmo-Meister) soll das Rezept **verallgemeinern**: unregelmässige
Umrisse, gemischte Raumprogramme, Owner-Vorlagen (`doc.settings.vorlagen`,
Typ `ZonenVorlage`, V2-F7) und Fälle, in denen der Algorithmus ehrlich
ablehnt («unregelmässig», siehe `zerlegeRektilinear()`), sollen mit einem
gelernten, aber immer noch **regelkonformen** Vorschlag beantwortet werden
können — der Algorithmus bleibt der Wahrheits-Anker (Golden-Referenz und
Trainingsdaten-Quelle), das LoRA lernt seine *Grammatik*, nicht seinen Ersatz.

Zielformat der Assistant-Antwort ist **dasselbe JSON**, das
`generiereGrundriss()`/`generiereGrundrissL()` heute zurückgeben
(`GenerierterGrundriss`: `raeume[]`, `moebel[]`, `tueren[]`, `diagnose[]`) plus
abgeleitete `kennzahlen` (HNF/VF in m², Raum-/Möbel-/Türanzahl) — kein neues
Schema erfinden, sondern das bestehende Kernel-Modell als Trainingsziel
verwenden. Das hält die Brücke zurück in den Kernel kurz: eine LoRA-Ausgabe
lässt sich 1:1 gegen `derive/checks.ts` prüfen und über dieselben Commands
(`packages/kosmo-kernel/src/commands/`) ins Doc einspielen.

### 1.2 Datenquelle: der eigene Kernel-Generator

Der Generator ist **deterministisch und beliebig oft aufrufbar** — das macht
ihn zur idealen Trainingsdaten-Maschine (kein Web-Scraping, keine
Lizenzfrage, beliebige Menge, exakt gelabelt):

- `packages/kosmo-kernel/src/derive/grundrissgenerator.ts`
  — `generiereGrundriss(wohnung, korridorKante)`: rechteckige Wohnung, reines
  Zwei-Band-Rezept (Eingangsband/Wohnband, ab 2 Zimmern mit internem Flur).
  — `generiereGrundrissL(haupt, fluegel, korridorKante)`: L-Form via
  `zerlegeRektilinear()` in Hauptteil + Flügel zerlegt, Flügel über Türen an
  der Naht erschlossen.
- `packages/kosmo-kernel/src/derive/segmentierer.ts` — `segmentiere()`:
  Geschoss-Footprint entlang eines Korridors in ganze **Wohnungen** geteilt
  (vorgelagerter Schritt: Wohnungs-Mix statt Zimmer-Layout). Liefert das
  Soll/Ist des Wohnungstyp-Mixes (`sollMix()`) — eine zweite, komplementäre
  Trainingsaufgabe (Geschoss→Wohnungszuschnitt statt Wohnung→Zimmer), für
  v1.1 vorgesehen (siehe §5).

**Welche Parameter variieren** (siehe Erzeugungsskript in §4):
- Wohnungsbreite (6.2–13.0 m) × Wohnungstiefe (6.5–10.5 m), 4 Korridorkanten
  (`unten|oben|links|rechts`) → 96 Rechteck-Kombinationen als Rohmenge.
- L-Grundrisse: Hauptteil + Flügel-Rechteck an variabler Naht.
- Randfälle bewusst mit drin: zu klein (< 6×6 m, Generator lehnt ab), zu
  flach für internen Flur (Durchgangszimmer-Fallback) — der Datensatz soll
  **ehrliches Verweigern/Diagnostizieren lernen**, nicht nur den Erfolgsfall.
- Für v1.1 (Vollmenge, siehe §5): zusätzlich `doc.settings.vorlagen`
  (`ZonenVorlage[]`, V2-F7 Plan-Library) als dritte Quelle — vom Owner
  gesetzte/gestreckte Layout-Vorlagen sind die **kuratiertesten** Beispiele,
  weil ein Mensch sie schon einmal für gut befunden hat.

**JSONL-Schema** (SFT-Chat-Format, kompatibel mit dem bereits benutzten
Muster in `docs/KOSMOTRAIN.md`):

```jsonc
{
  "messages": [
    { "role": "system", "content": "Du bist Kosmo-Zeichner. Aus einem Raumprogramm …" },
    { "role": "user", "content": "{\"aufgabe\":\"grundriss-generieren\",\"wohnung\":{\"breiteMm\":8000,\"tiefeMm\":9000},\"korridorKante\":\"unten\",\"kontext\":\"…\"}" },
    { "role": "assistant", "content": "{\"raeume\":[…],\"moebel\":[…],\"tueren\":[…],\"kennzahlen\":{\"hnfM2\":…,\"vfM2\":…,\"raumAnzahl\":…,\"moebelAnzahl\":…,\"tuerAnzahl\":…},\"diagnose\":[…]}" }
  ],
  "meta": {
    "id": "grundriss-v0-001",
    "generator": "packages/kosmo-kernel/src/derive/grundrissgenerator.ts#generiereGrundriss",
    "params": { "breiteMm": 8000, "tiefeMm": 9000, "korridorKante": "unten" },
    "qualitaet": { "checksBestanden": true, "gate": "…", "hinweise": [] }
  }
}
```

`user.content` und `assistant.content` sind selbst valides JSON (als String
eingebettet) — das Modell lernt JSON-in-JSON-in-JSONL, exakt wie es später
über ein Tool/eine Kosmo-Command-Schnittstelle wieder herauskäme. `meta` ist
**kein** Trainingsfeld (der Trainer liest nur `messages`), sondern
Provenienz für Owner-Review und Re-Generierung.

### 1.3 Qualitätsfilter über `derive/checks.ts`

`derive/checks.ts` (`pruefeGrundriss()`) braucht ein vollständiges `KosmoDoc`
mit Wänden/Öffnungen — zu schwer für ein Wegwerf-Erzeugungsskript. Für die
Stichprobe (§4) wird deshalb die **geometrische Kernregel derselben
Schwellen** direkt auf den generierten Raum-Outlines geprüft, mit derselben
Schwere-Unterscheidung wie im echten Check:

- **Zimmerbreite < 2.40 m** bei einem HNF-Raum → `warnung` in `checks.ts` →
  **hartes Ausschlusskriterium** fürs Gold-Set (kein Beispiel mit dieser
  Warnung kommt ins JSONL).
- **Zimmerfläche < 10 m²** bei einem HNF-Raum → nur `hinweis` in `checks.ts`
  (ein reales Bad ist praktisch immer < 10 m² — kein Mangel) →
  **nicht disqualifizierend**, aber im `meta.qualitaet.hinweise` protokolliert.

Für die Vollmenge (v1.1) läuft der scharfe Check: Kernel-Doc pro Sample real
aufbauen (`Zone`/`Wall`/`Opening`-Entities aus den generierten Räumen/Türen
ableiten, analog zu den bestehenden Command-Implementierungen) und
`pruefeGrundriss()` unverändert aufrufen — dann zählen auch Fluchtweg-,
Schallschutz- und Bewegungsflächen-Befunde als Filter. Diese schwerere
Variante ist bewusst **nicht** Teil der Stichprobe (Aufwand/Nutzen für 20–50
Beispiele unverhältnismässig), aber der Weg dahin ist hier dokumentiert statt
verschwiegen.

### 1.4 Gold-Set aus `wissen/` (kuratiert, nicht generiert)

Ergänzend zur synthetischen Menge braucht das Training **von Menschen
geprüfte** Beispiele, damit das LoRA nicht nur die eigene Algorithmus-Logik
zirkulär bestätigt:

- **Lehrhefte-Korpus** (`wissen/training/lehrhefte.jsonl`, 1'256 Chunks aus
  24 Hochbauzeichner-Lehrmitteln) — Grundrissregeln/Raummasse in Prosa, als
  Kontext-Anreicherung (RAG-artig in den `system`-Block gemischt) statt als
  direkte Layout-Zielwerte.
- **Plan-Library** (`doc.settings.vorlagen`): sobald der Owner in der App
  Vorlagen ablegt/streckt (V2-F7), sind das reale, von Hand geprüfte
  Grundriss-Layouts — die wertvollste Gold-Quelle, weil kein Generator sie
  erfunden hat. **Offener Punkt:** heute sind in diesem Repo keine
  `vorlagen`-Einträge befüllt (leeres Array im Default-`DocSettings`) — die
  ersten echten Vorlagen entstehen erst durch Owner-Arbeit in der App.
- **Eval-Suite (fest, vorher/nachher):** eine kleine, handverlesene Menge von
  ~10 Wohnungs-Constellationen (darunter mindestens 2 „unregelmässig"-Fälle,
  die der Algorithmus heute ablehnt) wird **vor** und **nach** jedem
  Trainingslauf mit demselben Prompt an das Basis-Modell und das LoRA
  gegeben; Kriterium: JSON-Validität, `checks.ts`-Bestehen, Kennzahlen-
  Plausibilität (HNF-Summe vs. Wohnungsfläche). Vorlage für die
  Lauf-Dokumentation: `wissen/vault/LoRA/Trainingslauf-Vorlage.md`.

### 1.5 Trainings-Rezept (Startpunkt, HomeStation führt aus)

Analog zu `docs/KOSMOTRAIN.md` (Unsloth/QLoRA), gleiche Werkzeugkette, andere
Datenbasis:

```python
# Basis: Qwen3-Coder-30B-A3B-Instruct (wie KOSMOTRAIN.md), 4-bit QLoRA
model, tokenizer = FastLanguageModel.from_pretrained(
    "Qwen/Qwen3-Coder-30B-A3B-Instruct", load_in_4bit=True, max_seq_length=8192,  # JSON-Layouts sind länger als Chat-Turns
)
model = FastLanguageModel.get_peft_model(model, r=16, lora_alpha=32,
    target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"])
# Datensatz: wissen/training/lora/grundriss-v0.jsonl (Stichprobe) → grundriss-v1.jsonl (Vollmenge, v1.1)
# 2-3 Epochen, lr 2e-4, wie KOSMOTRAIN.md — Startpunkt, keine Owner-Messung bisher
```

Export identisch zu `docs/KOSMOTRAIN.md` §3 (GGUF → `ollama create`), aber
unter eigenem Modellnamen (z.B. `kosmo-grundriss`), damit der Persona-LoRA
und der Grundriss-LoRA **getrennt** bleiben (unterschiedliche Aufgabe,
unterschiedliches Risiko bei einer schlechten Antwort).

## 2. Ziel B — AI-Imaging-Stil

### 2.1 Was genau lernen?

Ein **Stil-LoRA** für ein Bildmodell (SDXL oder Flux, Owner-Entscheid noch
offen — siehe §6) auf der HomeStation, das KosmoVis-Renders (Cycles-Rohbild)
in Richtung der Owner-Ästhetik veredelt: die «Werkplan»-Bildwelt aus
`docs/GESTALTUNGSKONZEPT.md` — Papier statt Bildschirm, Tusche-Linien,
skizzenhafte Präzision, Schwarz/Weiss-Standard mit wählbarem Akzent — UND/ODER
ein realistischerer Architektur-Rendering-Stil, je nach Owner-Wahl der
Zielverwendung (Wettbewerbsplakat vs. Präsentationsbild). Das ist eine
**Owner-Entscheidung**, kein Technik-Entscheid (siehe §6).

### 2.2 Datenquelle

- **Referenz-Korpus** (KosmoData/KosmoReference,
  `packages/kosmo-data/src/reference.ts`): das reiche Referenz-Datenmodell
  (Gebäude, Städtebau, Landschaft, Theorie-Texte, `RefEntryType`) ist als
  **Metadaten**-Quelle vorhanden (Stile, Epochen, Materialien,
  `style_sector`); die eigentlichen **Bilddateien** dazu (falls vorhanden)
  liegen ausserhalb dieses Cloud-Containers (Website-Assets/OneDrive) — hier
  **kein** Bildkorpus verfügbar, nur das Auswahlkriterium.
- **`wissen/`**: bisher reiner Text-Korpus (OCR aus Lehrheften/Büchern/
  Vorlesungen), **keine** Bilddateien für ein Stil-LoRA. Ehrlich benannt:
  ein Bild-Trainingskorpus existiert in diesem Repo/Container **nicht** —
  er müsste aus (a) echten KosmoVis-Renders (sobald der GPU-Worker läuft,
  `docs/HOMESTATION-AUFTRAG.md` §1), (b) der Owner-eigenen Projektfoto-/
  Skizzenbibliothek (HomeStation/OneDrive) oder (c) lizenzsauberen externen
  Referenzbildern zusammengestellt werden — alles HomeStation-/Owner-Arbeit.
- **Render-Prompt-Bausteine** (`derive/renderprompt.ts`): `renderPromptBausteine(doc)`
  leitet aus den äussersten Wandschichten (`PHRASEN`-Tabelle: Sichtbeton,
  Putz, Holzfassade, Klinker, Kalksandstein, Metall) und den
  Fassadenmodul-Rastern automatisch Text-Bausteine ab — das ist die
  **Captioning-Grammatik**, die Trainingsbilder und spätere Inferenz-Prompts
  teilen sollen (dieselbe Funktion liefert später auch den
  Inferenz-Prompt — Konsistenz zwischen Training und Nutzung).
- **Owner-Ästhetik** (`docs/GESTALTUNGSKONZEPT.md`): Tokens (`--k-field`,
  `--k-ink` etc.), Regeln («Schwarz trägt, Farbe zeigt», Passermarken/
  Massketten als Zierde, geschnittene Ecke) — als **Stil-Wörter** für jede
  Caption, damit der LoRA konsistent auf «Werkplan-Look» zieht statt auf
  einen generischen Rendering-Stil.

### 2.3 Bildauswahl-Kriterien (für die HomeStation-Kuration)

1. Gleiche **Kameraperspektive-Familie** je Trainingslauf (z.B. nur
   Aussenansichten ODER nur Innenraum-Axos) — ein Stil-LoRA lernt sauberer,
   wenn die Bildmenge nicht gleichzeitig Perspektive und Stil variiert.
2. Auflösung ≥ 1024×1024 (SDXL-Standard) bzw. 1024–1440 (Flux), keine
   Wasserzeichen/UI-Chrome im Bild (KosmoVis-Screenshot sauber croppen).
3. Stilistisch **einheitlich in der Zielrichtung**, aber mit genug Varianz in
   Gebäudetyp/Materialisierung, damit der LoRA den *Stil* lernt statt ein
   *Motiv* auswendig zu lernen (klassisches Overfitting-Risiko bei < 20
   Bildern eines einzigen Gebäudes).
4. Owner-Freigabe je Bild (Ästhetik ist Geschmackssache — kein Automatismus
   ersetzt das Owner-Urteil, welches Referenzbild «Werkplan» genug ist).

### 2.4 Captioning-Konvention

Jede Bilddatei bekommt eine `.txt`-Caption (kohya-Standard) nach fixem
Muster, aufgebaut aus genau den Bausteinen, die `renderprompt.ts` auch zur
Inferenzzeit erzeugt:

```
<Trigger-Wort, z.B. "kosmowerkplan"> Stil, <Gebäudetyp>, <renderPromptBausteine-Phrasen kommagetrennt>, <Owner-Stilwörter aus GESTALTUNGSKONZEPT.md: "Tuschezeichnung auf Skizzenpapier, technische Linienführung, Passermarken">
```

Ein festes **Trigger-Wort** (z.B. `kosmowerkplan`) verankert den Stil, ohne
bestehende SDXL/Flux-Konzepte zu überschreiben — Standard-Technik bei
Stil-LoRAs, damit der Stil gezielt abrufbar bleibt statt jedes Bild leise zu
verändern.

### 2.5 Datensatz-Grösse, Trainings-Rezept, Eval

- **Grösse:** Start bei 30–60 kuratierten Bildern (Stil-LoRA-Faustregel;
  SDXL/Flux-Stil-LoRAs brauchen deutlich weniger Bilder als ein
  Objekt-/Personen-LoRA) — Owner entscheidet die erste Charge am Home-PC.
- **Trainings-Rezept (kohya-ss, Startpunkt):**

```bash
accelerate launch train_network.py \
  --pretrained_model_name_or_path=<SDXL- oder Flux-Checkpoint> \
  --train_data_dir=<Bilder+Captions> \
  --output_dir=./kosmo-werkplan-lora \
  --network_module=networks.lora --network_dim=32 --network_alpha=16 \
  --resolution=1024,1024 --train_batch_size=1 \
  --learning_rate=1e-4 --max_train_steps=2000 \
  --mixed_precision=bf16 --save_every_n_epochs=1
```

  (Parameter sind ein Startpunkt aus der kohya-Dokumentation, nicht am
  Owner-Korpus gemessen — erster echter Lauf validiert/korrigiert sie.)
- **Eval — feste Prompt-Suite vorher/nachher:** ~10 feste Prompts (z.B.
  «Einfamilienhaus, Holzfassade, Giebeldach, Frontalansicht» ×
  Materialvarianten aus der `PHRASEN`-Tabelle) werden **vor** dem
  Trainingslauf mit dem Basis-Checkpoint und **nach** dem Lauf mit dem
  LoRA-Checkpoint gerendert; Owner vergleicht paarweise (kein automatisches
  Bild-Ähnlichkeitsmass ersetzt das Auge hier). Protokoll-Vorlage:
  `wissen/vault/LoRA/Trainingslauf-Vorlage.md`.

## 3. Wissensspeicher Obsidian

Unter `wissen/vault/LoRA/` neu angelegt (Obsidian-Markdown, Frontmatter +
`[[Wikilinks]]`, damit das Vault-Grafik-Netz die vier Notizen verbindet):

| Datei | Inhalt |
|---|---|
| `LoRA-Uebersicht.md` | Einstieg, verlinkt beide Ziele + die Vorlage, Status-Checkboxen für den gesamten Fahrplan |
| `Grundriss-LoRA.md` | Ziel A im Detail (Notiz-Fassung von §1), Status |
| `Imaging-LoRA.md` | Ziel B im Detail (Notiz-Fassung von §2), Status |
| `Trainingslauf-Vorlage.md` | Wiederverwendbares Template für jeden künftigen Trainingslauf: Datum, Datensatz-Version, Parameter, Eval-Ergebnis |

Diese Notizen sind **die erste eigenständig verfasste** (nicht per OCR
ingestierte) Untermenge des Vaults — bisher enthielt `wissen/vault/` nur
gescannte Quellen (Lehrhefte/Normen/Persona/Vorlesungen/Bücher/Briefings).
`LoRA/` ist die erste Kategorie mit Projekt-eigenem, verlinktem Wissen statt
Quellentext.

## 4. Erste Stichprobe (Grundriss, real generiert)

`wissen/training/lora/grundriss-v0.jsonl` — **29 Zeilen**, erzeugt durch ein
Wegwerf-Skript (`npx tsx`, **nicht eingecheckt**, lag nur unter `/tmp`), das
`generiereGrundriss()` und `generiereGrundrissL()` direkt aus
`packages/kosmo-kernel/src/derive/grundrissgenerator.ts` importiert und
aufruft — **keine handgeschriebenen Beispiele**, jede Zeile ist eine
tatsächliche Generator-Ausgabe:

- **24 Rechteck-Beispiele** aus dem 96er-Grid (6 Breiten × 4 Tiefen ×
  4 Korridorkanten), gefiltert auf das Gold-Set (§1.3: keine
  Zimmerbreiten-Warnung), gestreut über Zimmerzahl (1 oder 2 Zimmer im
  Gold-Pool — bei den getesteten Wohnungsgrössen entstehen keine 3-Zimmer-
  Layouts, ehrlich so belassen statt künstlich erzwungen) und Korridorkante
  (max. 3 Beispiele je Kombination).
- **3 Randfälle** bewusst mit drin: eine 5×5-m-Wohnung (Generator lehnt unter
  6×6 m ab), eine 12×6.2-m-Wohnung (zu flach für internen Flur →
  Durchgangszimmer-Fallback mit Diagnose), eine 6.2×9-m-Wohnung (schmale
  Randlage). Diese Beispiele lehren das LoRA **ehrliches Verweigern/
  Diagnostizieren** statt jede Anfrage zu erfüllen.
- **2 L-Grundrisse** über `generiereGrundrissL()`, zeigen die zweite
  Generator-Funktion.

Validiert: `python3 -c "import json; [json.loads(l) for l in open('wissen/training/lora/grundriss-v0.jsonl')]"`
läuft ohne Fehler (29/29 Zeilen valides JSON).

**Warum kein Imaging-Stichprobe-JSONL:** Ziel B braucht Bilddateien, keine
JSON-Zeilen — es gibt in diesem Container keinen Bildkorpus zu sampeln (§2.2).
Die «Stichprobe» für Ziel B ist deshalb **die Captioning-Konvention und das
Trainings-Rezept selbst** (§2.4/§2.5), nicht eine Datei.

## 5. Fahrplan

| Phase | Inhalt | Wer |
|---|---|---|
| **v1 (jetzt)** | Dieses Konzept, Daten-Pipeline dokumentiert, Grundriss-Stichprobe (29 Zeilen), Obsidian-Wissensspeicher | Claude Code (Cloud) ✅ |
| **v1.1** | Volle Grundriss-Datensatz-Generierung per Batch (Tausende Zeilen statt 29 — grösseres Parameter-Grid, `segmentiere()`-Wohnungszuschnitt als zweite Aufgabe, echte `pruefeGrundriss()`-Filterung mit KosmoDoc statt Geometrie-Näherung, `doc.settings.vorlagen` sobald befüllt) | Claude Code (Cloud), kein GPU nötig |
| **HomeStation-Tag** 🔒 | Erster echter QLoRA-Lauf (Grundriss) nach §1.5, erster Stil-LoRA-Lauf (Imaging) nach §2.5, Eval-Suiten auswerten, Owner-Entscheid über Ergebnis | HomeStation (RTX 5090), `docs/HOMESTATION-AUFTRAG.md` |
| **Integration Grundriss-LoRA** | GGUF → `ollama create kosmo-grundriss` (analog `docs/KOSMOTRAIN.md` §3) → in Kosmo-Einstellungen als Modell für die Grundriss-Aufgabe eintragen; Ausgabe bleibt ein **Vorschlag** (Diff-Karte, Review-Gate-Kultur), nie automatisch angewendet | HomeStation + App |
| **Integration Imaging-LoRA** | LoRA-Checkpoint in den ComfyUI-ren­der-Worker der Bridge (`tools/homestation-bridge`, Übergabepunkt „Echte Renders" in `docs/HOMESTATION-AUFTRAG.md` §1) einhängen — der Fake-Worker-Ersatz lädt zusätzlich den Stil-LoRA neben dem Basis-Checkpoint; KosmoVis' Render-Prompt (`renderprompt.ts`) bleibt die gemeinsame Prompt-Quelle für Training UND Inferenz (§2.4) | HomeStation |

## 6. Offene Owner-Entscheide

1. **Basis-Bildmodell Ziel B:** SDXL oder Flux? (Flux hat oft bessere
   Text-/Struktur-Treue für technische Zeichnungen, SDXL hat das reifere
   LoRA-Tooling/mehr Community-Rezepte — Owner-Präferenz + HomeStation-VRAM
   entscheiden.)
2. **Zielrichtung Ziel B:** Werkplan-Tuschezeichnung (Plakat-Ästhetik) oder
   realistisches Architektur-Rendering (Präsentationsbild) oder beide als
   getrennte LoRAs mit unterschiedlichem Trigger-Wort?
3. **Erste Bild-Charge für Ziel B:** woher genau (echte KosmoVis-Renders
   sobald GPU-Worker läuft / Owner-Projektfotos / kuratierte externe
   Referenzen)? Ohne diese Entscheidung bleibt §2 Rezept ohne Bildmenge.
4. **`doc.settings.vorlagen` befüllen:** die wertvollste Gold-Quelle für
   Ziel A ist heute leer — sobald der Owner in der App erste Plan-Vorlagen
   ablegt (V2-F7), sollten sie ins v1.1-Datenset einfliessen.
5. **Modellname/Rolle im lokalen Schema:** passt `kosmo-grundriss` als
   eigenständiges Modell neben `kosmo-buero` (Persona-LoRA aus
   `docs/KOSMOTRAIN.md`), oder soll später **ein** Kosmo-Zeichner-Modell
   beide LoRAs (Persona + Grundriss) gleichzeitig tragen? Technisch geht
   Multi-LoRA-Stacking, aber das ist ein Owner-Architekturentscheid, kein
   Default hier.
