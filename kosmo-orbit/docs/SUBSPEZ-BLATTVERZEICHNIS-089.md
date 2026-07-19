# Subspez Blattverzeichnis + Sammellegende (v0.8.9 E3 / PB3)

Fable-Subspez nach 083-Muster (`docs/V089-SPEZ.md` E3, D4, Matrix C-5):
Dateikreis, Funktionssignaturen und Golden-Namen sind hier **eingefroren** —
kein Bauagent-Ermessen über den Scope. Wo dieses Dokument enger ist als die
grobe Paketliste der Spez (z. B. «kein neuer Command»), gilt dieses Dokument.

## 1 · Ziel

Zwei Lücken aus RE-ARCHICAD, beide als **pure Ableitungen** über die Blätter
eines Publikations-Sets (`derive/publikation.ts`-Familie, Vorbild
`transmittalCsv`):

1. **Blattverzeichnis** — ein druckfähiges A4-hoch-Blatt (SVG), das die
   Blätter eines Sets tabellarisch listet (Nr · Blattname · Format ·
   Massstäbe · letzte Revision · Plancode). Das ist die Plan-Inhaltsliste,
   die als erstes Blatt eines Plansatzes mitgeht.
2. **Sammellegende** — die Verallgemeinerung der bestehenden PRO-BLATT-
   Legenden aus `sheet.ts:315-347` (Themenplan-Farbkästchen + Keynotes)
   über ALLE Blätter des Sets: welche Themen-Regeln und welche Keynotes
   kommen im Satz überhaupt vor. Sie erscheint als Abschnitt UNTER der
   Verzeichnis-Tabelle auf demselben Blatt — nur wenn es etwas zu legen
   gibt (Guard, §5).

**Architektur-Entscheid (bindend):** Hausmuster «eigenständiges Blatt»
(`kvBlattSvg`/`bauablaufBlattSvg`), NICHT `SheetPlacement.view`-Erweiterung
und NICHT Sheet-Entity. Begründung: null Kontakt mit `sheetToSvg`-
Bestandspfaden (E3: «kein Umbau von sheetToSvg»), null Golden-Risiko im
Bestand, «aktualisiert bei Blatt-Änderung» (C-5) ist als pure Ableitung
trivial erfüllt.

## 2 · Dateikreis (eingefroren)

- `packages/kosmo-kernel/src/derive/publikation.ts` — additiv: alle neuen
  Funktionen aus §3. KEINE Änderung an `setDateiname`/`setBlaetter`/
  `transmittalCsv`/`sheetPlancode`.
- `packages/kosmo-kernel/src/index.ts` — Re-Exporte der neuen Funktionen
  (nur falls `derive/publikation.ts` nicht ohnehin per `export *` läuft —
  prüfen, Bestandsmuster übernehmen).
- `packages/kosmo-kernel/test/blattverzeichnis.test.ts` — NEU (Unit +
  beide Goldens, `pruefeGolden`-Helfer).
- `packages/kosmo-kernel/test/golden/blattverzeichnis.svg` +
  `packages/kosmo-kernel/test/golden/blattverzeichnis-legende.svg` — NEU
  (+2, §6).
- `apps/kosmo-orbit/src/modules/publish/PublishWorkspace.tsx` — ein
  Export-Knopf «Blattverzeichnis (SVG)» je Set, direkt neben dem
  bestehenden Transmittal-Knopf (:938-Umgebung), gleicher Download-Weg.
- `apps/kosmo-orbit/src/modules/publish/island/inhalte/austausch.tsx` —
  dieselbe Aktion in der Publish-Insel, analog Transmittal (:148-Umgebung).
  (Das ist die PUBLISH-Insel — nicht zu verwechseln mit der vis-Insel
  gleichen Namens aus PBL2.)
- `e2e/blattverzeichnis.spec.ts` — NEU (§7).
- ROADMAP nur durch Fable.

**Tabu (Sanktion analog V089 §8):** `derive/sheet.ts`, `derive/
blattlayout.ts`, `model/entities.ts`, `commands/publish.ts`, sämtliche
Bestands-Goldens, NodeCanvas/DesignWorkspace/PlanView/Viewport3D. Es gibt
**keinen neuen Command** und **kein neues Doc-/Entity-Feld** — das
Verzeichnis ist ein Export-Artefakt wie das Transmittal-CSV, kein
Dokumentzustand. (Die grobe Paketliste nannte sheet.ts/blattlayout.ts/
commands/publish.ts als möglichen Kreis; dieses Dokument friert den
engeren Schnitt ein.)

## 3 · Signaturen (eingefroren)

```ts
// derive/publikation.ts — alle additiv, alle pur.

export interface BlattverzeichnisZeile {
  nr: number;              // 1-basierte Position (Set- bzw. index-Reihenfolge)
  name: string;
  format: string;          // «A1 quer (841×594)» — exakt wie transmittalCsv
  massstaebe: string;      // «1:50 · 1:100» oder '—'
  revision: string;        // «B · 12.03.2026» oder '—'
  plancode?: string;       // nur wenn sheetPlancode() einen Wert liefert
}

/** Zeilen des Verzeichnisses — ohne `set` alle Blätter in
 *  Plansatz-Reihenfolge (a.index - b.index), exakt die
 *  transmittalCsv-Semantik. Gelöschte Set-Blätter fallen via
 *  setBlaetter() ehrlich raus. */
export function blattverzeichnisZeilen(doc: KosmoDoc, set?: PublikationsSet): BlattverzeichnisZeile[];

export interface SammellegendeDaten {
  /** Nur Themen, die auf mindestens einer Platzierung der Verzeichnis-
   *  Blätter vorkommen (pl.thema → doc.settings.themen-Match), in
   *  Erst-Vorkommens-Reihenfolge; regeln in settings-Reihenfolge. */
  themen: { name: string; regeln: { label: string; farbe: string }[] }[];
  /** Keynote-Nummern aller platzierten Geschosse der Verzeichnis-Blätter
   *  (Etikett-Filter EXAKT wie sheet.ts:331-339: storeyId der Platzierung,
   *  inhalt==='keynote', keynote gesetzt, Eintrag in settings.keynotes
   *  vorhanden), dedupliziert, localeCompare('de-CH', numeric) sortiert. */
  keynotes: { nr: string; text: string }[];
}

export function sammellegende(doc: KosmoDoc, set?: PublikationsSet): SammellegendeDaten;

export interface BlattverzeichnisOptionen {
  projectName: string;
  /** Anzeige-Datum — vom Aufrufer übergeben, derive bleibt pur (kein
   *  new Date() im Kernel). Fehlt es, entfällt die Datumszeile. */
  datum?: string;
  /** Set-Name für den Untertitel; fehlt er: «Alle Blätter». */
  setName?: string;
}

/** Eigenständiges A4-HOCH-Blatt (210×297, viewBox 0 0 210 297) nach dem
 *  kvBlattSvg-Muster: stilblatt-Konstanten (BLATT, TITEL_STIL, versal,
 *  messbarAttr, escapeXml), Rahmen 10 mm rundum, Titel «BLATTVERZEICHNIS»,
 *  Untertitel projectName · setName · datum. KEIN Plankopf-Framework,
 *  KEINE blattlayout.ts-Abhängigkeit (Blatt ist kein Sheet-Entity). */
export function blattverzeichnisSvg(
  doc: KosmoDoc,
  set: PublikationsSet | undefined,
  opts: BlattverzeichnisOptionen,
): string;
```

`blattverzeichnisSvg` ruft intern `blattverzeichnisZeilen` + `sammellegende`
— die beiden sind separat exportiert, damit Unit-Tests die Datenebene ohne
SVG-String-Parsing prüfen können.

## 4 · Tabellen-Layout (Rahmenwerte, bindend)

- Spalten (x-Anker in mm, linksbündig ausser Nr): Nr 14 · Blatt 24 ·
  Format 80 · Massstab 130 · Revision 158 · Plancode 182. Plancode-Spalte
  erscheint NUR, wenn mindestens ein Blatt einen Plancode hat (dieselbe
  Daten-Guard-Logik wie die Transmittal-Spalte).
- Zeilenhöhe 6 mm, Kopfzeile fett, Trennlinie unter dem Kopf
  (`BLATT.kastenStift`), Schriftgrössen aus `BLATT_TYPO_MM`-Leiter.
- **Überlauf ehrlich:** maximal so viele Zeilen, wie zwischen Kopf und
  Legende/Blattrand passen (fixe Rechnung im Code, Konstante mit
  Kommentar); darüber EINE Schlusszeile «… +M weitere Blätter». Kein
  Mehrseiten-Support (dokumentiertes Nicht-Ziel, im Funktions-Kommentar
  benannt).
- Sammellegende darunter: Zwischentitel «LEGENDE», je Thema eine Zeile
  (Farbkästchen 4×3 wie sheet.ts:323, Label), danach Keynote-Zeilen
  (Nr fett + Text, wie sheet.ts:344-346). Abschnitt entfällt komplett,
  wenn `themen` UND `keynotes` leer sind (§5-Guard).

## 5 · Guards / Additivität (Sanktionsstoff)

1. **0 Bestands-Goldens bewegen sich.** Kein Bestandspfad wird berührt;
   `GOLDEN-WECHSEL-089.md` prognostiziert für PB3 exakt +2 (§6). Bruch =
   Hard-Stop (V089 E5).
2. Leeres Doc / Set ohne Blätter → gültiges SVG mit Kopf + Zeile «Keine
   Blätter» (kein Wurf, kein leerer String).
3. Sammellegende nur bei Daten (leere Themen+Keynotes → Abschnitt fehlt,
   auch die Überschrift).
4. Kein `new Date()`/`Math.random()` im derive (Golden-Determinismus);
   Datum kommt via `opts.datum` vom Aufrufer (App: `new Date()` im
   Workspace, exakt wie die Transmittal-/KV-Aufrufer).

## 6 · Goldens (Namen eingefroren, +2)

| Datei | Fixture | zeigt |
|---|---|---|
| `blattverzeichnis.svg` | Fixture-Doc mit 2 Blättern (A1 quer Grundriss 1:50 mit Revision; A3 hoch Schnitt 1:100 ohne Revision) in einem Set «Werkplansatz», ohne Themen/Keynotes, ohne Plankopf-Stammdaten | Tabelle 5 Spalten (ohne Plancode), '—'-Platzhalter, KEINE Legende |
| `blattverzeichnis-legende.svg` | dasselbe + Büro/Projekt/planNummer-Stammdaten (→ Plancode-Spalte) + 1 Thema mit 2 Regeln auf einer Platzierung + 2 Keynote-Etiketten | 6 Spalten + Sammellegende mit beiden Abschnitten |

Fixtures deterministisch im Test aufbauen (Muster `kernel.test.ts:5405`-
Transmittal-Test bzw. `test/fixtures.ts`), `pruefeGolden()`-Helfer,
`GOLDEN_UPDATE=1`-Regenerationsweg im Testkommentar. svg-qa muss beide
neuen Goldens ohne harte Fehler schlucken (Referenz wird 38).

## 7 · E2E (`e2e/blattverzeichnis.spec.ts`, NEU)

Eigener Preview-Port des Bauagenten. Drei Tests:

1. **Export + Inhalt:** Projekt mit 2 benannten Blättern + Set seeden
   (bestehende Seed-/Command-Helfer), Blattverzeichnis-Knopf klicken,
   Download abfangen (Playwright `download`-Event bzw. das Muster des
   bestehenden Transmittal-E2E, falls vorhanden — vorher greppen), SVG-Text
   enthält beide Blattnamen + «BLATTVERZEICHNIS».
2. **C-5-Aktualisierung:** Blatt umbenennen (bestehender Command/UI-Weg),
   erneut exportieren, neuer Name im SVG, alter weg.
3. **Insel-Weg:** derselbe Export aus der Publish-Insel (austausch.tsx)
   liefert identischen Inhalt.

## 8 · Gate (zusätzlich zum Standard-Gate)

Kernel-Suite voll + svg-qa (38/0) + `git diff --stat` beweist: kein
Bestands-Golden im Diff. Screenshot des Verzeichnis-SVGs (im Browser
geöffnet oder aus dem E2E) wird von Fable gesichtet.
