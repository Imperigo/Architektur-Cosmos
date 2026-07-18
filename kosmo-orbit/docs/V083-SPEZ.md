# v0.8.3 — Spezifikation (verbindlich)

*P0 · Paket W0 des v0.8.3-Wellenplans. Dieses Dokument ist die verbindliche Grundlage für
W1–W3 — jede Struktur, jedes Schema und jede Sanktion hier ist der Massstab, gegen den W3
(Matrix-Abnahme, P10) am Ende prüft. Änderungen an dieser Spez nach W0 sind Owner-Sache,
nicht Bauagenten-Ermessen (Muster `docs/V082-SPEZ.md`).*

**Quellen:** der genehmigte Ultraplan (`root-claude-uploads-73575e4c-8c15-5ba3-silly-
plum.md`, Owner-Auftrag 18.07.2026, zehn Entscheide E1–E10, Golden-Politik, Paketschnitt
W1/W2/W3 mit Gate-Kriterien) · `docs/V082-SPEZ.md` (Gliederungs-/Matrix-Disziplin,
insbesondere §8 Sanktionsliste und §9 Vollständigkeits-Matrix) · `wissen/training/claude/
lehren/v0.8.2.md` (Lehren der Vorversion — Foreground-Regel, `KOSMO_E2E_PORT`, «alle Specs
eines Stroms», Live-DOM-Nachmessung, Isolations-Worktree-Beweis) · `docs/ISLAND-UI-SPEZ.md`
§8 (die vier §8-Owner-Fragen, die dieses Paket teilweise schliesst). Alle Datei:Zeile-Belege
in diesem Dokument sind gegen den Repo-Stand `ce8b16c` (Branch
`claude/kosmo-orbit-v1-build-pzxkbj`, Release v0.8.2) selbst nachgeprüft — mehr als 20
Fundstellen wurden stichprobenhaft gegen den Code verifiziert (Liste in §14, inkl. mehrerer
Präzisierungen/Korrekturen gegenüber der Ultraplan-Kurzfassung).

---

## 0 · Auftrag, Owner-Freigaben, Golden-Politik

### 0.1 · Auftrag (Kontext, aus dem Ultraplan übernommen)

Owner-Auftrag 18.07.2026, sieben Punkte: **(1)** KosmoData weiterentwickeln (Wissen &
Suche, Referenzdaten/Import, Kosmo-Kontextquelle); **(2)** Skills aus dem markierten Git
`shanraisshan/claude-code-best-practice` (MIT, ~63k★, per Web identifiziert) als Grundlage
in KosmoOrbit ablegen — für Claude-Code-Betrieb UND Kosmo, selbständig kuratiert; **(3)**
alle vier Island-§8-Freigaben (Kommentar-Entität, Mess-Werkzeug, Öffnung-ToolId, Deep-Link
bestätigt); **(4)** Commands-SFT-Datensatz; **(5)** Alt-Flakes; **(6)** iPad/Touch-Polish;
**(7)** HomeStation-Paket. Drei Erkundungen belegen: Skills-Infra fehlt komplett (nur
`settings.json`/`settings.local.json` + Hooks in `.claude/`, s. §14 Beleg 1), aber Kosmos
`baueSystemprompt()`/`SystemPromptBlock` (`packages/kosmo-ai/src/systemprompt.ts`) ist der
fertige Lademechanismus; KosmoData-Suche ist reich, aber Referenzen laufen ohne Index/
[Qn]-Belege/Karten; Entity-/Command-/Klickmodus-Muster für §8 existieren bereits (Mangel,
`design.oeffnungSetzen`, Wand-Pfad); der Grundriss-Generator (`tools/training/
generiere-grundriss-sft.mts`) ist das reife Vorbild für Commands-SFT.

### 0.2 · Die vier Island-§8-Freigaben (wörtlich, Owner-Auftrag 18.07.2026 Punkt 3)

`docs/ISLAND-UI-SPEZ.md` §8 listet zehn offene Punkte; der Owner-Auftrag entscheidet vier
davon **jetzt** (die übrigen sechs — Undo/Redo-iPad-Geste [§8-1], Tastaturkürzel-Overlay
[§8-2], 4er-Screen-Kollisionsregeln [§8-3], Papier-Glas-Ausnahme [§8-8], Radius-Theme
[§8-9], Stationen-Orb-Konsolidierung [§8-10, inzwischen durch PD3c faktisch beantwortet]
bleiben unberührt):

1. **§8-6 Kommentar-Entität** — «komplett neue Fähigkeit … braucht eine eigene
   Kernel-Entität (`comment`/`annotation`) + Command, bevor PD3a hier mehr als eine leere
   Hülle bauen kann — grösster Einzelaufwand der ganzen Mapping-Tabelle» (`ISLAND-UI-SPEZ.md`
   §8 Punkt 6) → **freigegeben**, s. §1 E1.
2. **§8-7 Mess-Werkzeug** — «ein echtes interaktives Punkt-zu-Punkt-Mess-Werkzeug braucht
   vermutlich einen neuen Command (`design.massKetteSetzen` o. ä.), der heutige
   `design.bemassungSetzen`-Command steuert nur die automatische Anzeige, keine
   Nutzer-Messung» (`ISLAND-UI-SPEZ.md` §8 Punkt 7) → **freigegeben**, s. §2 E2.
3. **§8-5 Öffnung-ToolId** — «Braucht es einen eigenen `ToolId 'oeffnung'` mit eigenem
   Click-Platzier-Modus (wie Wand), oder bleibt die Skizze-Geste der einzige Weg …? Owner-
   Entscheid nötig, bevor PD3a das baut» (`ISLAND-UI-SPEZ.md` §8 Punkt 5) → **freigegeben,
   eigener ToolId + Klickmodus**, s. §3 E3. Löst den PD3a-Fable-Zwischenentscheid ab
   (`island/inhalte/zeichnen.tsx:336-339`: «Einstellungen als Vorgabewerte für die
   bestehende Skizze-Geste, KEIN neuer ToolId/Platzier-Modus (§8-5 bleibt Owner-Frage)»).
4. **§8-4 Deep-Link** — «Rendern/Blätter/Sync: Deep-Link oder native Mini-Kopie?» —
   **bestätigt als bereits entschieden und real verdrahtet**: PD3c hat die Brücke
   (`registriereStationsWeg(onStationOeffnen)`, `DesignWorkspace.tsx:750-751`) an den
   bestehenden `onStationOeffnen`-Weg angeschlossen (Kopfkommentar
   `DesignWorkspace.tsx:740-748` zitiert §8-4 bereits wörtlich als «verdrahtet»); dieses
   Paket dokumentiert den Stand nur formell nach und räumt veraltete Kommentare/Spez-Zeilen
   auf, s. §4 E4. **Keine neue Bauarbeit**, nur Klarstellung.

### 0.3 · «speichere dir die skillsets…»-Auftrag (wörtlich, Owner-Auftrag 18.07.2026 Punkt 2)

Owner: *Skills aus dem markierten Git `shanraisshan/claude-code-best-practice` (MIT-lizenz,
~63k★, per Web identifiziert) als Grundlage in KosmoOrbit ablegen — für den Claude-Code-
Betrieb UND für Kosmo selbst, selbständig kuratiert (nicht 1:1 kopiert).* Dieser Auftrag
bindet §5 (E5) unmittelbar: sechs deutsch adaptierte, kuratierte Skills unter
`.claude/skills/<name>/SKILL.md`, mit Attribution und eigener `QUELLEN.md`, PLUS die
Kosmo-seitige Spiegelung (`kosmo-ai/src/skills.ts`, Signatur in P0 hier eingefroren,
Verdrahtung erst W2/P7).

### 0.4 · KosmoData-Richtungen (Owner-Auftrag 18.07.2026 Punkt 1, wörtlich)

Owner: *KosmoData weiterentwickeln — Wissen & Suche, Referenzdaten/Import, Kosmo-
Kontextquelle.* Drei Stossrichtungen, alle in §6 (E6) feldgenau:

- **Wissen & Suche**: ein geteilter, indexierter BM25-Kern (`state/referenz-index.ts`, neu)
  ersetzt den heute naiven `.includes()`-Treffer in `referenzen_suchen`
  (`KosmoPanel.tsx:816-836`, konkret Zeile 825 `hay.includes(q)`).
- **Referenzdaten/Import**: eigene Referenzen als JSON importierbar (Merge mit dem
  112er-Seed, «eigene»-Kennzeichnung).
- **Kosmo-Kontextquelle**: ein proaktiver, budgetierter Daten-Kontext-Block im Systemprompt
  (`extraBloecke?`-Schnittstelle in `chat.ts`).

### 0.5 · Golden-Politik (explizit, bindend für alle Pakete)

**Nicht golden-still, aber golden-diszipliniert:** die **35 bestehenden SVG-Goldens
bleiben byte-gleich** (`packages/kosmo-kernel/test/golden/*.svg`, Ist-Zahl per
`ls … | wc -l` = 35, geprüft §14 Beleg 2) — Kommentar-Entität ist ein reines
App-Overlay ohne Plan-Derive (kein Kernel-Renderpfad berührt), Masskette-Derive läuft
NUR hinter einem Daten-Guard (kein Fixture-Doc ohne `MassKette`-Entität zeigt je eine
neue Linie). **+1 neues Golden** `masskette-plan.svg` mit eigenem Fixture-Doc (35→36),
dokumentiert in `docs/GOLDEN-WECHSEL-083.md` (neue Datei, Namensmuster identisch zu
`docs/GOLDEN-WECHSEL-081.md`/`-080.md`, s. §14 Beleg 3). **Guard-Regel** (bindend für P3):
der Masskette-Derive-Codepfad darf nur dann in den Plan-SVG-Output schreiben, wenn
`doc.byKind('masskette').length > 0` für das jeweilige Geschoss — jedes der 35 bestehenden
Golden-Fixtures hat keine `MassKette`-Entität und bleibt dadurch strukturell unberührt,
unabhängig vom Code-Zustand des neuen Zweigs. **Gate:** `npm run svg-qa` liefert 36/0 harte
Fehler; ein Byte-Diff (`git diff --stat` oder `sha256sum`) der 35 alten Golden-Dateien
gegen den v0.8.2-Stand muss leer sein.

---

## 1 · E1 — Kommentar-Entität (§8-6)

### 1.1 · Entität `Kommentar`

Neu in `packages/kosmo-kernel/src/model/entities.ts`, unmittelbar nach dem Vorbild
`Mangel` (dort `entities.ts:599-620`, geprüft §14 Beleg 4 — kein Bauteil-Host,
`kind`-Diskriminante, `status`-Enum, vorformatierte Datumsfelder als Parameter statt
`Date.now()`):

```ts
export interface Kommentar extends Base {
  kind: 'kommentar';
  text: string;
  autor: string;
  at: Pt;
  storeyId?: string;
  status: 'offen' | 'erledigt';
  /** Vorformatiertes Erstelldatum (de-CH) — Parameter des Commands, NIE Date.now()
   * im Command-/Derive-Pfad (dieselbe Regel wie Mangel.erfasstAm, entities.ts:610-611). */
  erstelltAm: string;
  /** Vorformatiertes Erledigungsdatum (de-CH); nur gesetzt, wenn status 'erledigt'. */
  erledigtAm?: string;
}
```

**Kein Bauteil-Host** (analog `Mangel`-Kommentar in `entities.ts:589-598`): ein Kommentar
kann sich auf kein, ein oder mehrere Bauteile beziehen — `at` (Welt-mm-Punkt) plus
optionale `storeyId` reichen für die Verortung, kein starrer `entityId`-Bezug.

### 1.2 · Command `design.kommentarSetzen`

Nach dem Muster von `design.mangelErfassen` (`packages/kosmo-kernel/src/commands/
design.ts:3026-3057`, geprüft §14 Beleg 5 — freie Felder als zod-Parameter, `erfasstAm`
als String-Parameter, `newId()`+`added()`-Rückgabe, kein `require<>`-Zwang ausser bei
gesetzter `storeyId`):

```ts
export const kommentarSetzen = registerCommand({
  id: 'design.kommentarSetzen',
  title: 'Kommentar setzen',
  params: z.object({
    text: z.string().min(1),
    autor: z.string().min(1),
    at: PtSchema,
    storeyId: z.string().optional(),
    erstelltAm: z.string().min(1).describe('Vorformatiertes Datum, z.B. 17.07.2026'),
  }),
  summarize: (p) => `Kommentar: ${p.text.slice(0, 40)}`,
  run: (doc, p) => {
    if (p.storeyId) require<Storey>(doc, p.storeyId, 'storey');
    const kommentar: Kommentar = {
      id: newId('kommentar'),
      kind: 'kommentar',
      text: p.text,
      autor: p.autor,
      at: p.at as Pt,
      status: 'offen',
      erstelltAm: p.erstelltAm,
      ...(p.storeyId !== undefined ? { storeyId: p.storeyId } : {}),
    };
    return [added(kommentar)];
  },
});
```

Zusätzlich `design.kommentarStatusSetzen` (nach `mangelStatusSetzen`-Vorbild,
`design.ts:3059ff`) für den `offen→erledigt`-Übergang mit `erledigtAm`-Parameter.

### 1.3 · `eigenschaftSetzen`-Registry-Eintrag

Der `allowed`-Record in `design.eigenschaftSetzen` (`design.ts:652-662`, geprüft §14
Beleg 6 — `Record<string, readonly string[]>`, keyed by `e.kind`) bekommt eine additive
Zeile: `kommentar: ['text', 'status', 'erledigtAm']`. Kein bestehender Eintrag wird
verändert.

### 1.4 · UI-Anschluss

Ersetzt die «ehrliche Leerfähigkeit» in `apps/kosmo-orbit/src/modules/design/island/
inhalte/projekt.tsx` (`KommentareStufe2`/`KommentareStufe3`, Zeilen 305-328, geprüft §14
Beleg 7 — Text dort wörtlich: «kein `comment`/`annotation`-Entity, kein Command, kein
Undo-Weg … Owner-Frage §8-6 … bleibt offen»): mit E1 ist die Owner-Frage beantwortet,
`KommentareStufe2`/`3` bekommen echte Inhalte (Liste, Erfassen-Formular,
Status-Umschalter), `registriereInhalt('kommentare', …)` (`projekt.tsx:337`) bleibt als
Registrierungsmuster bestehen.

---

## 2 · E2 — Mess-Werkzeug (§8-7)

### 2.1 · Entität `MassKette`

```ts
export interface MassKette extends Base {
  kind: 'masskette';
  storeyId: string;
  punkte: Pt[]; // mindestens 2 Punkte
}
```

### 2.2 · Command `design.massKetteSetzen`

Params: `{ storeyId: z.string(), punkte: z.array(PtSchema).min(2) }`; `summarize` gibt die
Gesamtlänge der Kette (Summe der Segmentlängen, `formatLength()`) aus. `design.
bemassungSetzen` (unverändert, `design.ts`, steuert nur die automatische Plan-Anzeige,
kein Nutzer-Mess-Weg, s. Kopfkommentar `island/inhalte/zeichnen.tsx:1163-1164`) bleibt
**byte-gleich** — MassKette ist ein eigenständiger, additiver Command-Pfad, keine
Erweiterung des bestehenden.

### 2.3 · Plan-Derive nur hinter Daten-Guard

Der neue Ableitungscode in `derive/plan.ts` (oder Nachbardatei) rendert eine Masskette-
Linie in den Plan-SVG-Output NUR, wenn `doc.byKind<MassKette>('masskette')` für das
jeweilige Geschoss nicht-leer ist (dieselbe Guard-Disziplin wie CLAUDE.md sie generell für
neue Features vorschreibt: «Neue Features hinter „nur wenn Daten vorhanden“-Guards halten
die Goldens stabil», Abschnitt «Eigenheiten»). Das ist die technische Basis der
Golden-Politik in §0.5.

### 2.4 · Klick-Modus nach Wand-Vorbild

Der reale Wand-Klickmodus lebt in `DesignWorkspace.tsx`s `punktSetzen()`-Funktion
(Zeile 1108, `tool === 'wand'`-Zweig Zeilen 1110-1127, geprüft §14 Beleg 8 — **Korrektur
gegenüber der Ultraplan-Kurzfassung**, die `:1040/:1077` nannte: Zeile 1040 liegt in
`onSketchAccept`/`history.beginGroup()` bei Zeile 1032, Zeile 1077 im `previewLine`-Feld;
der tatsächliche punktbasierte Klick-Commit-Mechanismus für ein neues Zeichen-Werkzeug ist
`punktSetzen()` Zeilen 1108-1127): erster Klick setzt `points=[p]`, jeder Folgeklick
committet ein Segment über `runCommand` und rückt den Kettenanfang nach, `Shift`-Klick
beendet die Kette. `messen` bekommt einen eigenen `else if (tool === 'messen')`-Zweig nach
demselben Muster — jeder Klick hängt einen Punkt an `points` an, Doppelklick/Escape ruft
`design.massKetteSetzen` mit der gesammelten `points`-Liste auf und leert `points`
(analog zum `onEscape`-Handler, `DesignWorkspace.tsx:1084ff`). `history.beginGroup()`/
`endGroup()` (Muster `DesignWorkspace.tsx:1032/1047`) fasst den gesamten Ketten-Klick
NICHT in eine Gruppe — jede Masskette entsteht als EIN `design.massKetteSetzen`-Aufruf
(ein Undo-Schritt), kein Mehrfach-Commit wie bei der Sketch-Wand-Sequenz.

### 2.5 · `mass-eingabe.spec.ts` bleibt unberührt

Der bestehende `e2e/mass-eingabe.spec.ts` (geprüft §14 Beleg 9 — behandelt die numerische
Direkteingabe via `punktSetzen()`, s. §2.4) testet den WAND-Zahlenweg und wird durch E2
nicht verändert; P3 ergänzt einen **neuen** Testblock für das Mess-Werkzeug in derselben
Datei oder einer disjunkten `messen.spec.ts` (Paketzuordnung entscheidet der Bauagent nach
Kollisionsfreiheit, diese Spez schreibt den Dateinamen nicht fest).

---

## 3 · E3 — ToolIds `'oeffnung'|'messen'|'kommentar'` (§8-5)

### 3.1 · `TOOL_IDS`-Erweiterung

Ist-Stand (`apps/kosmo-orbit/src/state/ui-zustand.ts:44`, geprüft §14 Beleg 10):

```ts
export const TOOL_IDS: readonly ToolId[] = ['auswahl', 'wand', 'volumen', 'zone', 'dach', 'treppe', 'stuetze', 'schnitt', 'skizze', 'mesh'];
```

**10 Einträge heute** (nicht mehr, wie eine ältere Fassung des Ultraplans implizit
nahelegen könnte — die drei neuen Werkzeuge kommen additiv dazu). Soll nach E3:

```ts
export const TOOL_IDS: readonly ToolId[] = ['auswahl', 'wand', 'volumen', 'zone', 'dach', 'treppe', 'stuetze', 'schnitt', 'skizze', 'mesh', 'oeffnung', 'messen', 'kommentar'];
```

**10 → 13** (Mengen-Beweis: `TOOL_IDS.length === 13` als Assertion in mindestens einem
neuen Unit-Test). Der `ToolId`-Union-Typ (`ui-zustand.ts:31-43`) bekommt dieselben drei
Werte additiv.

### 3.2 · Öffnung-Klickmodus

Löst den heutigen Zwischenstand ab (`island/inhalte/zeichnen.tsx:336-370`, geprüft §14
Beleg 11 — Modul-Singleton `oeffnungVorgabe`/`useOeffnungVorgabe()` Zeilen 350-360 hält nur
Vorgabewerte für die bestehende Skizze-Geste, `VorgabeHinweis` Zeilen 362-370 dokumentiert
das explizit als Übergangslösung). Nach E3: `tool === 'oeffnung'` bekommt einen eigenen
Zweig in `punktSetzen()`/dem Klick-Handler — ein Klick auf eine Wand (Treffertest analog
zum bestehenden Wand-Hit-Test) ruft `design.oeffnungSetzen` (`design.ts:242-266`, geprüft
§14 Beleg 12) mit `wallId` der getroffenen Wand + den aktuellen `oeffnungVorgabe`-Werten
(`openingType`, `width`, `height`, `sill`, `swing`) als Parametern auf. Die
**Skizze-Geste bleibt zusätzlich bestehen** (`onSketchWandOeffnung`,
`DesignWorkspace.tsx:1063-1076`, unverändert) — E3 ergänzt einen zweiten, direkten Weg,
ersetzt den ersten nicht.

### 3.3 · `island-katalog.ts`-Verdrahtung

Drei Einträge existieren bereits als «noch nicht gebaut»-Platzhalter (`island-katalog.ts`,
geprüft §14 Beleg 13): `oeffnung` Zeile 107 (`hinweis: NOCH_NICHT_GEBAUT-5)`), `messen`
Zeile 115 (`hinweis: NOCH_NICHT_GEBAUT-7)`), `kommentare` Zeile 146 (`hinweis:
NOCH_NICHT_GEBAUT-6)`) — die Footnote-Nummern 5/6/7 zeigen exakt auf die §8-5/§8-6/§8-7-
Owner-Fragen, die E1-E3 hiermit schliessen. Nach E3/E1/E2 bekommen alle drei Zeilen ein
echtes `toolId` in `extra` (analog `{ toolId: 'wand' }`) statt `hinweis`, und
`werkzeugStatus` wechselt von `'teilweise'`/`'neu'` auf `'vorhanden'`.

### 3.4 · Skizze-Geste bleibt

Explizit sanktioniert: kein Feld/Verhalten der bestehenden Skizze-basierten
Öffnungserkennung (`SketchOverlay`, `onSketchWandOeffnung`) wird verändert.

---

## 4 · E4 — Deep-Link §8-4 als entschieden dokumentiert

### 4.1 · Ist-Stand (bereits real verdrahtet)

`registriereStationsWeg(onStationOeffnen)` in `DesignWorkspace.tsx:750` (Effekt-Block
Zeilen 749-752, geprüft §14 Beleg 14 — **Plan-Referenz `:750` stimmt exakt**), abgemeldet
beim Unmount (`registriereStationsWeg(undefined)`, Zeile 751). Der Kopfkommentar
(`DesignWorkspace.tsx:740-748`) dokumentiert bereits wörtlich: «PD3c … verdrahtet die von
PD3b vorbereitete Brücke mit dem bestehenden `onStationOeffnen`-Weg … die AUSTAUSCH-Insel-
Fenster (Rendern/Blätter, `ZurStationKnopf`) navigieren damit ECHT statt nur den „noch
nicht verdrahtet“-Hinweis zu zeigen.»

### 4.2 · Aufgabe von E4

**Keine neue Bauarbeit.** E4 ist reine Dokumentationspflege:
- `docs/ISLAND-UI-SPEZ.md` §8 Punkt 4 (Zeilen 393-398) bekommt einen Nachtrag-Absatz,
  der auf den PD3c-verdrahteten Zustand verweist (analog zum bereits vorhandenen
  Nachtrag zu §8-10, `ISLAND-UI-SPEZ.md` Zeilen 420-430).
- Ein Sweep über `island/inhalte/austausch.tsx` (dort der Kopfkommentar «Deep-Link-Brücke
  (§8-4)», referenziert in `DesignWorkspace.tsx:741`) und alle übrigen Fundstellen mit
  «noch nicht verdrahtet»/«§8-4 offen»-Formulierungen — jede veraltete Formulierung wird
  auf den Ist-Stand nachgeführt.
- `docs/V082-SPEZ.md` selbst wird **nicht** editiert (abgeschlossenes Dokument, Muster
  §0.5 dort).

---

## 5 · E5 — Skills-Architektur

### 5.1 · Repo-Root-Struktur `.claude/skills/`

Neu (existiert heute nicht — `.claude/` enthält bislang nur `hooks/`, `settings.json`,
`settings.local.json`, geprüft §14 Beleg 1):

```
.claude/skills/
  orchestrierung/SKILL.md      # Command → Agent → Skill (Fable/Sonnet-Arbeitsteilung)
  tiefplanung/SKILL.md         # /ultraplan-Äquivalent
  gegenpruefung/SKILL.md       # /ultrareview-Äquivalent
  parallel-pakete/SKILL.md     # /batch + Agent-Teams-Muster
  lehren-gedaechtnis/SKILL.md  # Bezug zu wissen/training/claude/lehren/
  claude-md-disziplin/SKILL.md # CLAUDE.md-Pflege-Regeln
  QUELLEN.md                   # eine Datei, Attribution für alle sechs
```

**Sechs deutsch adaptierte, kuratierte Skills** — keine 1:1-Kopie (Owner-Auftrag §0.3).
Jede `SKILL.md` trägt die Attribution **«Adaptiert aus
`shanraisshan/claude-code-best-practice` (MIT)»** in ihrem Kopf; `QUELLEN.md` listet Quelle,
Lizenz und die Kernidee je übernommenem Konzept.

### 5.2 · CLAUDE.md-Leseliste Punkt 6

Ist-Stand `kosmo-orbit/CLAUDE.md`, Abschnitt «Was du zuerst liest», hat heute **5**
nummerierte Punkte (1. ROADMAP.md, 2. V2-AUFTAKT.md, 3. GESTALTUNGSKONZEPT/OWNER-MANDAT,
4. HOMESTATION-AUFTRAG.md, 5. `wissen/training/claude/lehren/`, geprüft §14 Beleg 15).
E5 fügt additiv **Punkt 6** an: Verweis auf `.claude/skills/` (welche Skills existieren,
wann sie greifen) — Fable-abgestimmter Wortlaut, s. Plan-Vorgabe «CLAUDE.md Punkt 6
(Fable-abgestimmt)».

### 5.3 · Hook-Hinweiszeile (nie abbrechend)

Der bestehende Hook `.claude/hooks/session-start.sh` bekommt eine additive Hinweiszeile
(Ausgabe, kein `exit`-Pfad-Eingriff), die auf `.claude/skills/` verweist. **Nie
abbrechend** — der Hook darf unter keinen Umständen den Session-Start blockieren, dieselbe
Disziplin wie sein heutiger STAND.md-Rückroll-Hinweis.

### 5.4 · Kosmo-Seite: `kosmo-ai/src/skills.ts` (Signatur in P0 eingefroren)

Neue Datei `packages/kosmo-ai/src/skills.ts` (existiert heute nicht, geprüft §14
Beleg 16 — `ls packages/kosmo-ai/src/ | grep -i skill` liefert nichts). Signatur, **hier
in P0 eingefroren** (entkoppelt P1/Skills von P2s `chat.ts`-Kreis; die Verdrahtung selbst
erst W2/P7):

```ts
export interface SkillMeta {
  readonly id: string;
  readonly titel: string;
  readonly kurzbeschreibung: string;
}

/** Baut EINEN SystemPromptBlock (Label 'skills') aus den geladenen Kosmo-Skills —
 *  dasselbe Signatur-Muster wie jeder andere Blockbauer (vgl. `dossierBlock`/
 *  `rolleBlock`/`projektKontextBlock`, `packages/kosmo-ai/src/chat.ts:180-182`),
 *  damit `skillBlock()` sich verlustfrei in die additive `extraBloecke?`-Kette
 *  (§6.4/E6) einreiht, ohne dass P7 (W2) die Aufrufsignatur noch einmal ändern muss. */
export function skillBlock(skills: readonly SkillMeta[]): SystemPromptBlock;
```

`SystemPromptBlock` ist der bestehende Typ aus `systemprompt.ts:28-40` (geprüft §14
Beleg 17), keine Neuerfindung. P1 liefert `skillBlock()` + einen Node-Test, der die
Signatur gegen ein Fixture-Array prüft — **keinen** Aufrufer in `chat.ts`/`KosmoPanel.tsx`
(das ist P7, W2, §6.7 Nachbau-Referenz weiter unten).

---

## 6 · E6 — KosmoData

### 6.1 · (a) Geteilter `state/referenz-index.ts`

Neue Datei `apps/kosmo-orbit/src/state/referenz-index.ts`. Nutzt `bm25Scores` aus
`apps/kosmo-orbit/src/modules/prepare/knowledge.ts` (bereits pur & getestet, importiert von
`quellen.ts:4` und dort viermal aufgerufen — Zeilen 90/104/136/157, geprüft §14 Beleg 18).
`referenz-index.ts` baut EINEN gecachten BM25-Index über die 112(+N)-Referenzbibliothek
(`loadReferences()`) und exportiert eine `sucheReferenzen(query, limit?)`-Funktion, die
**sowohl** `quellen.ts`s bestehendem `[Qn]`-Weg **als auch** dem `referenzen_suchen`-Tool
zur Verfügung steht — ersetzt dort den heute naiven `.includes()`-Treffer
(`KosmoPanel.tsx:816-827`, konkret `hay.includes(q)` Zeile 825, geprüft §14 Beleg 19).
Caching: der Index wird einmal pro `loadReferences()`-Ergebnis gebaut (Memoisierung über
Referenz auf das geladene Array), nicht bei jeder Suche neu.

### 6.2 · (b) `referenzen_suchen` mit `[Qn]`-Belegen

Das Tool (`KosmoPanel.tsx:805-836`) wird auf `sucheReferenzen()` (§6.1) umgestellt UND
bekommt dieselbe `[Qn]`-Marken-Mechanik wie `quellen_suchen`
(`quellenMap`/`quellenZaehler`, deklariert `KosmoPanel.tsx:597-598`, genutzt in
`quellen_suchen`s `execute` Zeilen 858-864 — **Korrektur gegenüber der Ultraplan-
Kurzfassung**: `quellenMap` lebt in `KosmoPanel.tsx`, nicht in `state/quellen.ts`, geprüft
§14 Beleg 20). Jeder Referenztreffer bekommt eine `[Qn]`-Marke über denselben
`quellenZaehler.current`-Zähler wie `quellen_suchen` — EIN gemeinsamer Zähler, keine
Parallel-Nummerierung.

### 6.3 · (c) `shell/RefKarte.tsx`

Neue Chat-seitige Komponente `apps/kosmo-orbit/src/shell/RefKarte.tsx`, die `RefHeroBild`
(`apps/kosmo-orbit/src/modules/data/RefHeroBild.tsx`, bereits vorhanden, genutzt in
`DataWorkspace.tsx:1081` — **Korrektur gegenüber der Ultraplan-Kurzfassung `:1068`**,
tatsächliche Zeile 1081, geprüft §14 Beleg 21) und die `tuschePfade`-Silhouetten
wiederverwendet, im Dossier-Kartenmuster von `DataWorkspace.tsx` (Referenzkarte mit
Signet/Bild/Kurztext). `RefKarte` rendert im `KosmoPanel`-Chatverlauf, wenn ein
`[Qn]`-Klick (bestehende Mechanik `KosmoPanel.tsx:1924/1953`) auf eine Referenz statt eine
Quellen-Ref zeigt.

### 6.4 · (d) Additive `extraBloecke?`-Schnittstelle in `chat.ts` — **sanktioniert**

Ist-Stand: `ChatSession.send()` baut den Systemprompt jeden Zug frisch
(`chat.ts:177-183`, geprüft §14 Beleg 22):

```ts
const suffixText = typeof this.systemSuffix === 'function' ? this.systemSuffix() : this.systemSuffix;
const system = baueSystemprompt(persona.systemPrompt, [
  { label: 'kritik-journal', text: suffixText },
  { label: 'dossier-nogo', text: dossierBlock(this.doc) },
  { label: 'rolle', text: rolleBlock(this.doc) },
  { label: 'kontext', text: projektKontextBlock(this.doc) },
]);
```

**Soll (additiv, diese Spez sanktioniert die Änderung ausdrücklich):** ein neuer,
optionaler Konstruktor-Parameter `extraBloecke?: () => readonly SystemPromptBlock[]`
(dasselbe Funktions-Muster wie `systemSuffix`, §6.4 Kopfkommentar `chat.ts:126-134`:
«String bleibt erlaubt … eine Funktion `() => string` wird JEDEN Zug frisch aufgerufen»).
In `send()` wird das Array-Literal um `...(this.extraBloecke?.() ?? [])` **nach dem
`kontext`-Block** ergänzt (Priorität: kritik-journal > dossier-nogo > rolle > kontext >
datenKontext/skills, «Priorität nach kontext», Ultraplan E6d). `STANDARD_TOKEN_BUDGET =
1500` (`systemprompt.ts:45`) bleibt unverändert — ein Block, der nicht mehr passt, fällt
ersatzlos weg (bestehende `baueSystemprompt()`-Regel, `systemprompt.ts:52`), kein neues
Budget-Sonderfeld. Diese Datei-Änderung ist die EINE additive Zeile, die §11 (Sanktions-
liste) ausdrücklich erlaubt — `turn()` (Zeilen 193ff) und `resolveApplied`/
`resolveRejected` bleiben unangetastet.

Der konkrete Konsument (ein `datenKontext`-Block ≤300 Token, aus KosmoData gespeist) wird
in P2 gebaut, aber **nicht in `chat.ts` verdrahtet** — P2 liefert die Block-Bau-Funktion,
der tatsächliche Aufrufer-Draht (wo `extraBloecke` an `ChatSession` übergeben wird) ist
Sache des Aufrufers `KosmoPanel.tsx`, additiv, disjunkt zu P1s `skills.ts`.

### 6.5 · (e) Import eigener Referenzen

Neuer Import-Weg im Referenzen-Tab (`DataWorkspace.tsx`): JSON-Datei hochladen, Merge mit
dem bestehenden 112er-Seed, jede importierte Referenz trägt ein `quelle: 'eigen'`-Flag
(oder äquivalent) zur Unterscheidung vom kuratierten Seed. **Laufzeit ≠ Modell**
(CLAUDE.md-Regel, Abschnitt «Eigenheiten») — der Import landet in einem Laufzeit-Store,
nicht im Yjs-Doc.

---

## 7 · E7 — Commands-SFT

### 7.1 · Generator `tools/training/generiere-commands-sft.mts`

Neu, nach dem Vorbild `tools/training/generiere-grundriss-sft.mts` (bereits vorhanden,
geprüft §14 Beleg 23 — seeded via `mulberry32`, `SftZeile`-Typ, Qualitätsfilter,
Ablehn-Fälle, Statistikbericht, Doppellauf-Byte-Beweis als Test). Quelle:
`allCommands()`+`toolNameFor()` (`packages/kosmo-ai/src/tools.ts:22-62`, geprüft §14
Beleg 24 — `toolNameFor` Zeilen 22-24, `commandTools()` bis Zeile 62, Plan-Referenz
`tools.ts:22-62` **bestätigt exakt**) + die Playbook-Regeln aus `wissen/training/claude/
playbooks/zod-zu-command-beispielen.md` (bereits vorhanden aus v0.8.2, referenziert in
`REGISTRY.md`).

### 7.2 · Ziel

`wissen/training/sft/kosmo-zeichner-commands/commands-v1.jsonl` (Zielverzeichnis existiert
bereits, heute nur mit `README.md`, geprüft §14 Beleg 25 — `ls` liefert ausschliesslich
`README.md`, Registry-Status «leer»). E7 befüllt es erstmals und aktualisiert die
`REGISTRY.md`-Zeile `kosmo-zeichner-commands` von Status `leer` auf `reproduzierbar` (oder
`wächst`, je nach Ausgang des Qualitätsfilters).

### 7.3 · Schema

`kosmo-sft/v1` (Schema aus `docs/V082-SPEZ.md` §3.1, unverändert übernommen) — jede Zeile
`meta.adapter: 'kosmo-zeichner-commands'`, `meta.quelle: command:<id>`.

---

## 8 · E8 — Flakes

### 8.1 · Statusleiste `nowrap`+Kappung

Ist-Stand `design.css:405-421` (`.dw-statusleiste`, geprüft §14 Beleg 26 — Plan-Referenz
`design.css (:405-435)` **bestätigt**, Block reicht bis `.dw-modus-chip-wrap` Zeile 428):
`flex-wrap: wrap` (Zeile 412) erlaubt der Statusleiste, bei vielen Chips (Werkzeug/
Geschoss/LOD/Fläche/Phase/Modus-Chip — künftig plus Kommentar/Messen-Kurzinfo, E1/E2) auf
mehrere Zeilen zu wachsen. `NavLeiste` (`apps/kosmo-orbit/src/modules/design/
NavLeiste.tsx`, keine eigene CSS-Datei, Inline-`position:absolute`, `left:12, bottom:50`,
geprüft §14 Beleg 27) sitzt nur 8px über der Statusleisten-Oberkante (`dw-statusleiste`:
`bottom:12`, `min-height:30px` → Oberkante bei `bottom:42`). Wächst die Statusleiste durch
Wrap auf eine zweite Zeile, ragt sie in die `NavLeiste`-Zone. **Fix:** `.dw-statusleiste`
bekommt `flex-wrap: nowrap` + `overflow-x: hidden`/Textkappung auf den letzten Chip statt
freiem Umbruch — die Leiste wächst nie über ihre feste Höhe hinaus, unabhängig davon, wie
viele Chips künftig dazukommen.

### 8.2 · `.dw-modus-chip-wrap` z-index über NavLeiste

`.dw-modus-chip-wrap` (`design.css:428-432`, geprüft §14 Beleg 28) trägt heute **keinen**
eigenen `z-index` (nur `position: relative`); `NavLeiste` trägt ebenfalls keinen
expliziten `z-index` (Inline-Style, kein `z-index`-Feld, geprüft §14 Beleg 27) — beide
sind `position:absolute`-Geschwister im selben Stacking-Context, die Malreihenfolge folgt
damit der DOM-Reihenfolge. `NavLeiste` rendert im JSX **nach** dem Modus-Chip-Bereich
(`DesignWorkspace.tsx`, Statusleiste-Block endet vor dem NavLeiste-Aufruf weiter unten im
Baum) und liegt daher heute optisch/klickbar ÜBER dem Modus-Chip-Popup, sobald sich beide
Zonen überlappen (die B0.1-Flake-Ursache). **Fix:** `.dw-modus-chip-wrap { z-index: 6; }`
explizit gesetzt; `NavLeiste`s Container bekommt (falls nötig für den Beweis) einen
expliziten `z-index: 5` in seinem Inline-Style, damit die Rangfolge **6 > 5** dokumentiert
und nicht nur zufällige DOM-Reihenfolge ist. Beweis: `elementFromPoint`-Probe an der
Überlappungszone liefert nach dem Fix den Modus-Chip-Popup-Knoten, nicht die NavLeiste.

### 8.3 · Wrap-Flake

Mit §8.1 (kein Umbruch mehr) ist die separat gemeldete «Wrap-Flake» (Statusleiste
verschiebt sich bei Fenstergrössenwechsel sichtbar) strukturell miterledigt — kein
zusätzlicher Codepfad nötig, nur ein gemeinsamer Beweis (N Wiederholungen des betroffenen
Specs bei variabler Viewport-Breite).

---

## 9 · E9 — HomeStation

### 9.1 · `lora_empfaenger.py`

Neu in `tools/homestation-bridge/kosmo_bridge/lora_empfaenger.py` (Verzeichnis enthält
heute `main.py`, `lizenz.py`, `sicherheits_log.py`, `__pycache__`, geprüft §14 Beleg 29 —
kein `lora_empfaenger.py`). Nimmt ein `kosmo.lora-train/v1`-Manifest entgegen
(`packages/kosmo-contracts/src/lora-train.ts`, `LoraTrainManifest`-Schema Zeilen 65-93,
geprüft §14 Beleg 30 — Felder `schema`/`adapter`/`erzeugt_um`/`dateien`/`rezept`/
`evalSuite?`/`visibility`/`hinweis?`, `superRefine`-Guard Zeilen 82-91 erzwingt
`visibility:'private'`, sobald eine Datei privat ist), prüft je Datei
`LoraTrainDatei.sha256` (64-Hex-Regex, Zeile 54) gegen den tatsächlichen Dateiinhalt und
erzeugt bei Erfolg ein Unsloth-Skript-Template (Platzhalter-Pfade, kein echter Lauf).

### 9.2 · `--fake`-Konvention

Der bestehende Bridge-Server (`main.py`) kennt das Flag `--fake-worker`
(`main.py:1253`, geprüft §14 Beleg 31 — **Präzisierung gegenüber der Ultraplan-
Kurzfassung**, die verkürzt «`--fake`» schreibt: der volle Flag-Name ist
`--fake-worker`; `--fake` funktioniert nur, weil Pythons `argparse` mit `allow_abbrev`
eindeutige Präfixe akzeptiert und kein zweites `--fake*`-Flag existiert — CLAUDE.md
selbst nutzt im Setup-Abschnitt bereits die Kurzform `--fake --port 8600`). Im Container
läuft `lora_empfaenger.py` **ehrlich im `--fake-worker`-Modus** — kein echter Unsloth-/GPU-
Lauf, nur die Manifest-Entgegennahme + sha256-Prüfung + Skript-Template-Erzeugung wird
demonstriert.

### 9.3 · Selbsttest

Ein Node- oder Python-Selbsttest prüft: (a) gültiges Manifest + passende Hashes →
Skript-Template erzeugt; (b) ein Hash-Bruch (Datei geändert, Manifest-Hash veraltet) →
harter Fehler, kein Skript-Template.

### 9.4 · `HOMESTATION-AUFTRAG.md` §2 nachführen

Die bestehende Tabellenzeile «Trainer-Contract» (`docs/HOMESTATION-AUFTRAG.md:77`, geprüft
§14 Beleg 32) wird um einen Satz ergänzt: der Empfänger-Teil (`lora_empfaenger.py`) ist
jetzt container-seitig gebaut (Manifest-Validierung), der GPU-Lauf selbst bleibt
HomeStation-Grenze.

---

## 10 · E10 — iPad/Touch

### 10.1 · Island-Popups viewport-clampen

Alle Mini-Popups (Stufe 2/3 der Island-UI, `apps/kosmo-orbit/src/modules/design/island/
inhalte/*.tsx`) bekommen eine Positions-Klammer, die verhindert, dass ein Popup nahe am
Viewport-Rand über die sichtbare Fläche hinausragt (Bounding-Box-Clamping analog zu
bestehenden Dropdown-Positionierungen, `design.css:186-198`-Kommentar zur `.dw-dropdown`-
Scroll-statt-Überlapp-Strategie als Präzedenzfall). Beweis: eine Bounding-Box-Probe über
alle **29 Werkzeuge** (Ist-Zahl bestätigt, §14 Beleg 13 — `island-katalog.ts` enthält
exakt 29 `werkzeug(...)`-Einträge neben der Fabrikfunktion selbst) bei einer kleinen
Viewport-Grösse (z.B. 1024×768) zeigt: kein Popup-`getBoundingClientRect()` verlässt den
Viewport.

### 10.2 · Zwei-Finger-Doppeltipp-Undo hinter Einstellung, Default AUS

Neue Einstellung (Projekt-Store oder `localStorage`-Flag, Muster `kosmo.texturen`/
`kosmo.onboarded`) `kosmo.touch-undo-geste`, Default `false`. Ist die Einstellung aktiv,
löst ein Zwei-Finger-Doppeltipp auf dem Viewport `history.undo()` aus (nur additiv, kein
bestehender Touch-Handler verändert). **§8-1 (Undo/Redo aufs iPad) bleibt formal
Owner-offen** (`ISLAND-UI-SPEZ.md` §8 Punkt 1: «Ungeklärt») — diese Geste ist ein
AUS-per-Default-Vorschlag, **kein** Owner-Entscheid wird hiermit vorweggenommen.

---

## 11 · Sanktionsliste (abschliessend)

Erwartet **eng begrenzt**, ausschliesslich:

1. **`chat.ts`-Additive** (§6.4/E6d) — der neue optionale `extraBloecke?`-Konstruktor-
   Parameter + eine ergänzte Zeile im `baueSystemprompt()`-Array-Literal in `send()`
   (`chat.ts:178-183`). `turn()` (Zeilen 193ff), `resolveApplied`/`resolveRejected`
   bleiben **byte-gleich**.
2. **`TOOL_IDS` 10→13** (§3.1/E3) + der `ToolId`-Union-Typ additiv um `'oeffnung'|
   'messen'|'kommentar'` erweitert (`ui-zustand.ts:31-44`).
3. **Neues Golden** `masskette-plan.svg` (36. Golden, §0.5) — die 35 bestehenden bleiben
   byte-gleich.
4. **`CLAUDE.md`-Punkt 6** (§5.2) — additiver sechster Punkt in «Was du zuerst liest».
5. **Hook-Hinweiszeile** (§5.3) — additive, nie abbrechende Ausgabezeile in
   `.claude/hooks/session-start.sh`.
6. **Additive `testid`s** — neue, rein additive `data-testid`-Attribute aus P1-P9
   (Kommentar-/Mess-Werkzeug-UI, Skills-Referenzen, Referenz-Import-UI) — additiv, nie
   eine Streichung/Umbenennung bestehender `testid`s; einzeln zu listen, sobald das
   jeweilige Paket gebaut ist (P0 kann sie noch nicht vorwegnehmen).
7. **`design.eigenschaftSetzen`s `allowed`-Record** (§1.3/E1) — eine additive Zeile
   `kommentar: [...]`.
8. **`island-katalog.ts`** (§3.3/E3, §1.4/E1, §2.x/E2) — drei bestehende Platzhalter-
   Einträge (Zeilen 107/115/146) wechseln von `hinweis` auf `toolId`+`'vorhanden'`.
9. **`design.css:405-435`** (§8/E8) — `.dw-statusleiste` `nowrap` statt `wrap`,
   `.dw-modus-chip-wrap` neuer `z-index:6`.
10. **`island/inhalte/{zeichnen,projekt}.tsx`** (§1.4/§3.2/E1/E3) — die drei
    dokumentierten «noch nicht gebaut»-Interimstexte (`OeffnungVorgabe`-Vorgabewerte-
    Hinweis Zeilen 362-370, `MessenStufe2`-Hinweis Zeile 1200, `KommentareStufe2/3`-
    Leerfähigkeits-Text Zeilen 305-328) werden durch echte Inhalte ersetzt.
11. **`docs/HOMESTATION-AUFTRAG.md` §2** (§9.4/E9) — ein ergänzter Satz in der
    bestehenden Tabellenzeile «Trainer-Contract».
12. **`docs/ISLAND-UI-SPEZ.md` §8** (§4.2/E4) — Nachtrag-Absatz zu Punkt 4, keine
    Streichung.
13. **Neue Docs** — `docs/V083-SPEZ.md` (dieses Dokument), `docs/GOLDEN-WECHSEL-083.md`,
    `.claude/skills/**`, `wissen/training/claude/lehren/v0.8.3.md` (Release-Ritual, W3).

**Alles andere** — insbesondere `design.oeffnungSetzen`, `design.bemassungSetzen`,
`design.mangelErfassen`, `dock-kern.ts`s Solver-Kern, die 35 bestehenden Goldens, alle
bestehenden `testid`s/aria-labels, `systemSuffix`/`dossierBlock`/`rolleBlock`/
`projektKontextBlock` in `chat.ts` — bleibt byte-gleich.

---

## 12 · Vollständigkeits-Matrix (Abnahme-Grundlage W3/P10)

> **P10-Abnahme 18.07.2026 (adversarial, Fable):** alle 25 Zeilen live nachgemessen —
> Belege in ROADMAP 436–447 (je Paket-Gate) und im P10-Protokoll: u. a. TOOL_IDS==13
> (`ui-zustand.ts:52`), 35 Alt-Goldens byte-gleich seit `602e25a` (git diff: nur
> `masskette-plan.svg` neu), Quergate 59 passed auf :5183, `release-gate` Exit 0,
> `lora_empfaenger`-Selbsttest «Alle Prüfungen grün» (inkl. sha-Bruch), Hook-Exit 0.
> Drei P10-Funde als Mini-Nachträge behoben: §8-5/6/7-Nachträge in `ISLAND-UI-SPEZ.md`
> fehlten (E1–E3 waren gebaut, aber dort nicht dokumentiert), zwei tote «noch nicht
> verdrahtet»-Hinweise in `island-katalog.ts`, `vite.config.ts`-`APP_VERSION` stand seit
> dem v0.8.2-Release auf '0.8.1' (Kopf zeigte falsche Version — im 0.8.3-Bump behoben).

Jeder der sieben Owner-Punkte, jeder der zehn Entscheide E1-E10 und die Golden-Politik sind
unten einzeln erfasst, mit Ziel-Paket und der messbaren Abnahme aus den W1/W2-Gate-
Kriterien des Ultraplans.

### 12.1 · Owner-Punkt (1) KosmoData

- [x] **C-1** BM25-Index geteilt für `quellen.ts` UND `referenzen_suchen` → **P2** ·
  Abnahme: `state/referenz-index.ts` existiert, `referenzen_suchen` nutzt `bm25Scores`
  statt `.includes()` (§6.1); Gate: BM25-Parität-Test (beide Konsumenten liefern
  konsistente Rangfolge für dieselbe Query).
- [x] **C-2** `[Qn]`-Belege für Referenzen → **P2** · Abnahme: `[Qn]`-Anzahl im
  Chatverlauf == Anzahl gerenderter `[Qn]`-Chips (Mengen-Beweis «[Qn]==Chip-Anzahl»,
  Ultraplan-Gate).
- [x] **C-3** `RefKarte.tsx` im Chat → **P2** · Abnahme: Klick auf eine Referenz-`[Qn]`-
  Marke rendert `RefKarte` mit `RefHeroBild`, E2E-Beweis auf Port 5174.
- [x] **C-4** proaktiver Daten-Kontext-Block ≤300 Token via `extraBloecke?` → **P2** ·
  Abnahme: Budget-Beweis (Block + alle anderen Blöcke bleiben ≤1500 Token gesamt),
  Prompt-Snapshot-Test; Verdrahtung selbst erst P7/W2 (§6.4).
- [x] **C-5** Import eigener Referenzen als JSON → **P9 (W2)** · Abnahme: Merge mit dem
  112er-Seed nachweisbar (112+N-Mengen-Beweis), Seed-Datei selbst unverändert, neue
  `kosmodata-import.spec`.

### 12.2 · Owner-Punkt (2) Skills

- [x] **C-6** `.claude/skills/**` mit sechs kuratierten, deutsch adaptierten Skills +
  Attribution + `QUELLEN.md` → **P1** · Abnahme: sechs `SKILL.md`-Dateien existieren,
  jede trägt die Attributionszeile, `QUELLEN.md` vorhanden.
- [x] **C-7** CLAUDE.md-Leseliste Punkt 6 + nie abbrechende Hook-Hinweiszeile → **P1** ·
  Abnahme: `CLAUDE.md` hat sechs nummerierte Punkte, Hook-Exit-Code bleibt bei jedem
  Testlauf 0 unabhängig vom Skills-Zustand.
- [x] **C-8** `kosmo-ai/src/skills.ts` mit eingefrorener `skillBlock()`-Signatur → **P1** ·
  Abnahme: Datei + Node-Test existieren, Signatur entspricht §5.4 exakt, **kein**
  Aufrufer in `chat.ts` (Trennschärfe-Beweis: `grep skillBlock chat.ts` liefert nichts in
  W1).
- [x] **C-9** `skillBlock`-Verdrahtung in `chat.ts` (Reihenfolge dossier > rolle > skills >
  kontext > datenKontext) → **P7 (W2)** · Abnahme: eine Block-Zeile in `chat.ts`, Budget-
  Beweis 1500, Prompt-Snapshot-Test.

### 12.3 · Owner-Punkt (3) Island §8-Freigaben

- [x] **C-10** §8-6 Kommentar-Entität + Command + UI → **P3** · Abnahme: `Kommentar`-
  Entity + `design.kommentarSetzen`/`-StatusSetzen` + `eigenschaftSetzen`-Zeile +
  `island-katalog.ts`-Eintrag `toolId:'kommentar'` + `KommentareStufe2/3` mit echtem
  Inhalt, Undo-Roundtrip bewiesen.
- [x] **C-11** §8-7 Mess-Werkzeug + Daten-Guard + Golden → **P3** · Abnahme: `MassKette`-
  Entity + `design.massKetteSetzen` + Klickmodus (§2.4) + `masskette-plan.svg` (36.
  Golden) + Byte-Beweis der 35 alten + `bemassungSetzen` unverändert.
- [x] **C-12** §8-5 Öffnung-ToolId + Klickmodus, Skizze-Geste bleibt → **P3** · Abnahme:
  `TOOL_IDS.length === 13`, Wand-Treffer → `design.oeffnungSetzen` über den neuen
  Klickmodus, `onSketchWandOeffnung` unverändert lauffähig.
- [x] **C-13** §8-4 Deep-Link als entschieden dokumentiert → **P0 (diese Spez, §4) / P3
  (Doku-Nachführung)** · Abnahme: `ISLAND-UI-SPEZ.md` §8 Punkt 4 trägt den Nachtrag,
  keine verbliebene «noch nicht verdrahtet»-Formulierung im Code-Kommentar-Sweep.
- [x] **C-14** Hartes Gate 29-Werkzeuge-DOM-Probe (kein Werkzeug ohne Stufe 2+3) →
  **P3** · Abnahme: Bounding-Box-/DOM-Probe über alle 29 `island-katalog.ts`-Einträge,
  0 Ausnahmen.

### 12.4 · Owner-Punkt (4) Commands-SFT

- [x] **C-15** `generiere-commands-sft.mts` seeded, Doppellauf byte-gleich → **P4** ·
  Abnahme: sha256-Doppellauf-Beweis, 100% zod-valide Ausgabe, `validiere-sft.mjs` grün.
- [x] **C-16** `commands-v1.jsonl` + REGISTRY-Zeile → **P4** · Abnahme:
  `wissen/training/sft/kosmo-zeichner-commands/commands-v1.jsonl` existiert und ist
  nicht leer, `REGISTRY.md`-Zeile `kosmo-zeichner-commands`-Status ≠ `leer`,
  `release-gate` grün.

### 12.5 · Owner-Punkt (5) Alt-Flakes

- [x] **C-17** Statusleiste wächst nie in die NavLeiste-Zone → **P5** · Abnahme:
  `.dw-statusleiste` `nowrap`+Kappung, `elementFromPoint`-Probe an der
  Überlappungszone liefert nach dem Fix konsistent den Modus-Chip statt der NavLeiste.
- [x] **C-18** `.dw-modus-chip-wrap` z-index über NavLeiste (6>5) → **P5** · Abnahme:
  CSS-Wert-Beweis (`z-index:6` gesetzt, gemessen `>` NavLeiste-Stapelwert) + ALLE
  Design-Chrome-Specs grün (nicht nur `arbeitsmodi.spec`).
- [x] **C-19** Wrap-Flake miterledigt → **P5** · Abnahme: N Wiederholungen des
  betroffenen Specs bei variabler Viewport-Breite grün.

### 12.6 · Owner-Punkt (6) iPad/Touch-Polish

- [x] **C-20** Island-Popups viewport-clampen → **P8 (W2)** · Abnahme: Bounding-Box-
  Sweep über 29 Popups @1024×768, 0 Popup verlässt den Viewport.
- [x] **C-21** Zwei-Finger-Doppeltipp-Undo hinter Einstellung, Default AUS → **P8 (W2)** ·
  Abnahme: Default-Zustand deaktiviert (Regressionstest), Geste funktioniert NUR bei
  aktivierter Einstellung, §8-1 bleibt im Text als offen markiert.

### 12.7 · Owner-Punkt (7) HomeStation

- [x] **C-22** `lora_empfaenger.py` Manifest-Validierung (gültig/sha-Bruch) → **P6** ·
  Abnahme: Selbsttest deckt beide Fälle, kein GPU-Vortäuschen (`--fake-worker`-Modus
  bleibt ehrlich gekennzeichnet).
- [x] **C-23** `HOMESTATION-AUFTRAG.md` §2 nachgeführt → **P6** · Abnahme: die
  Tabellenzeile «Trainer-Contract» trägt den ergänzten Satz.

### 12.8 · Golden-Politik

- [x] **C-24** 35 Alt-Goldens byte-gleich, +1 neues Golden (35→36) → **P3 (Bau) / P10
  (Abnahme)** · Abnahme: `npm run svg-qa` 36/0 harte Fehler, Byte-Diff der 35 alten
  Dateien leer, `docs/GOLDEN-WECHSEL-083.md` dokumentiert den Wechsel.

### 12.9 · Abschluss

- [x] **C-25** W3/P10 Matrix-Abnahme (adversarial gegen diese Matrix) → Muss-Fixes →
  Release v0.8.3 → **P10** · Abnahme: jede Zeile C-1…C-24 mit Beleg abgehakt; volle
  Suiten grün (Basis 2736 + alle in W1-W2 neu hinzugekommenen); `svg-qa` 36/0; Typecheck
  8 Workspaces; `release-gate` Exit 0; `wissen/training/claude/lehren/v0.8.3.md`
  (Release-Ritual, Selbstanwendung); ROADMAP-Eintrag; Version-Bump 0.8.3; Rundgang-PDF;
  Push.

**25 Matrix-Zeilen gesamt** (C-1…C-25), jede mit Paket-Zuordnung und einer im Ultraplan
selbst benannten oder daraus direkt abgeleiteten messbaren Abnahme.

---

## 13 · Ehrliche Nicht-Ziele

Wörtlich aus dem Ultraplan übernommen, hier bindend bestätigt:

- **Keine Bridge-Embeddings im Container** — die KosmoData-Suche bleibt de facto BM25
  (§6.1), nichts wird als semantische Suche simuliert.
- **Kein GPU-/Unsloth-Echtlauf** — `lora_empfaenger.py` (§9) ist nur ein
  Empfänger-Gerüst, der echte Trainingslauf bleibt HomeStation-Grenze
  (`docs/HOMESTATION-AUFTRAG.md`).
- **Kein Vision-OCR** — Atlanten/GoodNotes-Digitalisierung bleibt HomeStation-Aufgabe
  (unverändert seit `docs/HOMESTATION-AUFTRAG.md` §2, Zeilen 80-81).
- **Kein Mehrschicht-Ebenen-System** — ausserhalb des Scopes dieser Version.
- **§8-1 (Undo-Geste aufs iPad) bleibt Vorschlag hinter Einstellung** — Default AUS
  (§10.2), **kein** Owner-Entscheid wird durch den blossen Bau vorweggenommen; die
  übrigen fünf offenen `ISLAND-UI-SPEZ.md` §8-Punkte (§8-2 Tastaturkürzel-Overlay, §8-3
  4er-Screen-Kollisionsregeln, §8-8 Papier-Glas-Ausnahme, §8-9 Radius-Theme, §8-10
  Stationen-Orb-Konsolidierung — Letzterer durch PD3c faktisch bereits beantwortet, aber
  nicht Gegenstand dieser Spez) bleiben ebenfalls unberührt.
- **Kein Stacking-Automatismus für LoRA-Adapter** — unverändert aus v0.8.2, Owner-
  Entscheid 2 dort bleibt in Kraft (`REGISTRY.md` «Stacking» Abschnitt).

---

## 14 · Geprüfte Belege (Gegenprüfung gegen den Code, Repo-Stand `ce8b16c`)

1. `.claude/` (Repo-Root, `ls`) — enthält nur `hooks/`, `settings.json`,
   `settings.local.json`, **kein** `skills/`-Verzeichnis — **bestätigt** (§0.1/§5.1,
   E5-Ausgangslage).
2. `packages/kosmo-kernel/test/golden/*.svg` (`ls … | wc -l`) — **35 Dateien** —
   **bestätigt** (§0.5, Golden-Politik-Basiszahl).
3. `docs/GOLDEN-WECHSEL-{074,075,080,081,D1,D4,S4}.md` (`ls docs/ | grep GOLDEN`) —
   Namensmuster `GOLDEN-WECHSEL-<Kürzel>.md` — **bestätigt** (§0.5, `GOLDEN-WECHSEL-083.md`
   folgt demselben Muster).
4. `packages/kosmo-kernel/src/model/entities.ts:599-620` — `Mangel`-Interface: `kind`,
   kein Bauteil-Host (Kommentar Zeilen 589-598), `status:'offen'|'behoben'`,
   `erfasstAm`/`behobenAm` vorformatiert — **bestätigt exakt** (§1.1, Plan-Referenz
   `entities.ts:599` bestätigt).
5. `packages/kosmo-kernel/src/commands/design.ts:3026-3057` — `design.mangelErfassen`:
   zod-Parameter, `erfasstAm` als String-Parameter (kein `Date.now()`), `newId('mangel')`
   + `added()`-Rückgabe — **bestätigt**, dient als Command-Vorbild für E1 (§1.2).
6. `packages/kosmo-kernel/src/commands/design.ts:638-664` — `design.eigenschaftSetzen`,
   `allowed`-Record Zeile 652 (`const allowed: Record<string, readonly string[]> = {`) —
   **bestätigt exakt**, Plan-Referenz `design.ts:652` trifft die Zeile des Records selbst
   (§1.3).
7. `apps/kosmo-orbit/src/modules/design/island/inhalte/projekt.tsx:297-337` —
   `KommentareStufe2`/`KommentareStufe3`/`registriereInhalt('kommentare', …)` — Text
   wörtlich «kein `comment`/`annotation`-Entity … Owner-Frage §8-6 … bleibt offen» —
   **bestätigt**, Ist-Zustand vor E1 (§1.4).
8. `apps/kosmo-orbit/src/modules/design/DesignWorkspace.tsx:1104-1127` —
   `punktSetzen()`-Funktion, `tool === 'wand'`-Zweig — **Korrektur** gegenüber
   Ultraplan-Kurzfassung (`:1040/:1077`): der tatsächliche Klick-Commit-Mechanismus liegt
   bei Zeile 1108-1127, nicht 1040 (das ist `history.beginGroup()` in `onSketchAccept`)
   oder 1077 (`previewLine`-Feld) (§2.4).
9. `e2e/mass-eingabe.spec.ts` (Existenzprüfung) — vorhanden, behandelt die numerische
   Direkteingabe über `punktSetzen()` — **bestätigt** (§2.5).
10. `apps/kosmo-orbit/src/state/ui-zustand.ts:44` — `TOOL_IDS` mit exakt **10** Einträgen
    (`'auswahl','wand','volumen','zone','dach','treppe','stuetze','schnitt','skizze',
    'mesh'`) — **bestätigt**, Ist-Zahl vor E3 (§3.1).
11. `apps/kosmo-orbit/src/modules/design/island/inhalte/zeichnen.tsx:335-370` —
    `OeffnungVorgabe`/`oeffnungVorgabe`/`useOeffnungVorgabe()`/`VorgabeHinweis` — Text
    wörtlich «KEIN neuer ToolId/Platzier-Modus (§8-5 bleibt Owner-Frage)» — **bestätigt**,
    Ist-Zustand vor E3 (§3.2).
12. `packages/kosmo-kernel/src/commands/design.ts:242-266` — `design.oeffnungSetzen`:
    `wallId`/`openingType`/`center`/`width`/`height`/`sill`/`swing`-Parameter —
    **bestätigt exakt** (§3.2, Zielaufruf des neuen Klickmodus).
13. `apps/kosmo-orbit/src/modules/design/island/island-katalog.ts` — exakt **29**
    `werkzeug(...)`-Einträge (30 Treffer für `werkzeug(` minus die Fabrikfunktions-
    definition selbst Zeile 80); Platzhalter `oeffnung` Zeile 107
    (`NOCH_NICHT_GEBAUT-5)`), `messen` Zeile 115 (`-7)`), `kommentare` Zeile 146 (`-6)`)
    — **bestätigt exakt**, inkl. der Fussnoten-Verweise auf §8-5/§8-7/§8-6 (§3.3/§10.1).
14. `apps/kosmo-orbit/src/modules/design/DesignWorkspace.tsx:740-752` —
    `registriereStationsWeg(onStationOeffnen)` in `useEffect`, Kopfkommentar zitiert §8-4
    bereits als «verdrahtet» — **bestätigt exakt**, Plan-Referenz `DesignWorkspace:750`
    trifft die Zeile punktgenau (§4.1).
15. `kosmo-orbit/CLAUDE.md`, Abschnitt «Was du zuerst liest» — **5** nummerierte Punkte
    (ROADMAP.md, V2-AUFTAKT.md, GESTALTUNGSKONZEPT/OWNER-MANDAT, HOMESTATION-AUFTRAG.md,
    `lehren/`) — **bestätigt**, Punkt 6 ist additiv neu (§5.2).
16. `packages/kosmo-ai/src/` (`ls … | grep -i skill`) — kein Treffer, `skills.ts`
    existiert noch nicht — **bestätigt** (§5.4).
17. `packages/kosmo-ai/src/systemprompt.ts:28-64` — `SystemPromptBlock`-Interface Zeile
    28, `STANDARD_TOKEN_BUDGET = 1500` Zeile 45, `baueSystemprompt()` Zeile 59 —
    **bestätigt exakt** (§5.4/§6.4).
18. `apps/kosmo-orbit/src/state/quellen.ts:4,90,104,136,157` — Import + vier
    `bm25Scores(...)`-Aufrufe — **bestätigt** (§6.1).
19. `apps/kosmo-orbit/src/shell/KosmoPanel.tsx:805-836` — `referenzen_suchen`-Tool,
    `hay.includes(q)` Zeile 825 (naiver Treffer) — **bestätigt exakt** (§6.1/§6.2).
20. `apps/kosmo-orbit/src/shell/KosmoPanel.tsx:597-598,858-864` — `quellenMap`/
    `quellenZaehler` als `useRef` deklariert, genutzt in `quellen_suchen`s `execute` —
    **Korrektur** gegenüber Ultraplan-Kurzfassung: die Map lebt in `KosmoPanel.tsx`, nicht
    in `state/quellen.ts` (§6.2).
21. `apps/kosmo-orbit/src/modules/data/DataWorkspace.tsx:1081` — `<RefHeroBild
    entry={selected} … />` — **Korrektur** gegenüber Ultraplan-Kurzfassung (`:1068`):
    tatsächliche Zeile 1081 (§6.3).
22. `packages/kosmo-ai/src/chat.ts:126-183` — Konstruktor-Kommentar zu `systemSuffix`
    (Zeilen 126-134), `send()`-Blockaufbau (Zeilen 177-183) — **bestätigt exakt** (§6.4).
23. `wissen/training/sft/` (`ls`) — Verzeichnisse `kosmo-buero`, `kosmo-zeichner-
    commands`, `kosmo-zeichner-grundriss` bereits vorhanden; `kosmo-zeichner-commands/`
    enthält nur `README.md` — **bestätigt**, Registry-Status «leer» konsistent (§7.2).
24. `packages/kosmo-ai/src/tools.ts:22-62` — `toolNameFor()` Zeilen 22-24,
    `commandTools()` bis Zeile 62 — **bestätigt exakt**, Plan-Referenz `tools.ts:22-62`
    trifft den vollen Block (§7.1).
25. `wissen/training/sft/kosmo-zeichner-commands/` (`ls -la`) — genau eine Datei
    (`README.md`, 904 Bytes) — **bestätigt** (§7.2).
26. `apps/kosmo-orbit/src/modules/design/design.css:403-433` — `.dw-statusleiste`
    (Zeilen 405-421, `flex-wrap: wrap` Zeile 412), `.dw-modus-chip-wrap` (Zeilen 428-432,
    kein `z-index`) — **bestätigt exakt**, Plan-Referenz `design.css (:405-435)`
    **bestätigt** (§8.1/§8.2).
27. `apps/kosmo-orbit/src/modules/design/NavLeiste.tsx:18-40` — `position:'absolute'`,
    `left:12, bottom:50`, kein `z-index`-Feld im Inline-Style — **bestätigt** (§8.2).
28. `apps/kosmo-orbit/src/modules/design/design.css:428-432` — `.dw-modus-chip-wrap`
    (`position: relative`, kein `z-index`) — **bestätigt** (§8.2).
29. `tools/homestation-bridge/kosmo_bridge/` (`ls`) — `main.py`, `lizenz.py`,
    `sicherheits_log.py`, `__pycache__`; kein `lora_empfaenger.py` — **bestätigt** (§9.1).
30. `packages/kosmo-contracts/src/lora-train.ts:1-100` — `LoraTrainAdapterId`,
    `LoraTrainDateiFormat`, `LoraTrainDatei` (sha256-Regex Zeile 54),
    `LoraTrainManifest` inkl. `superRefine`-Visibility-Guard (Zeilen 82-91) —
    **bestätigt exakt** (§9.1).
31. `tools/homestation-bridge/kosmo_bridge/main.py:1253` —
    `ap.add_argument("--fake-worker", action="store_true", …)` — **Präzisierung**
    gegenüber der Ultraplan-Kurzfassung «`--fake`»: der volle Flag-Name ist
    `--fake-worker`, `--fake` funktioniert nur als `argparse`-Präfix-Abkürzung (§9.2).
32. `docs/HOMESTATION-AUFTRAG.md:72-82` — Abschnitt «2. Training / Wissen», Zeile 77
    (Trainer-Contract-Tabellenzeile) — **bestätigt** (§9.4).

---

*Ende der Spezifikation. Diese Datei wird NICHT während der Umsetzung (W1–W3) verändert —
findet ein Paket einen Widerspruch zu dieser Spez, ist das ein Fall für ein kurzes
Owner-/Fable-Review, kein stiller Re-Interpretationsspielraum im Code.*
