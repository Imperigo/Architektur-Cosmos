# HOMEPC-KOSMOTRAIN-PROMPT — IDC-Übungen + ETH-OneDrive erfassen

> **An den lokalen Claude-Code-Worker auf der HomeStation.** Owner-Auftrag
> 22.07.2026: «bei archicad solibri und bimcloud jede einzelne übung komplett
> durchlesen und erfassen, analysieren und verständnis aufbauen … diese
> informationen nutzen wir für die datenbank aber auch als grundlage zum
> nachbauen unserer eigenen tools in kosmoorbit» + ETH-Master-Unterlagen
> aus OneDrive «vor allem für Kosmo als Train verständnis».
>
> Der Repo-Agent (Claude Web) hat die ÖFFENTLICHE Ebene bereits erfasst:
> `wissen/training/idc-academy/*.md` (alle Lernpfade/Module mit Titeln,
> Dauern, Beschreibungen + KosmoOrbit-Zuordnung). DEINE Aufgabe ist die
> login-pflichtige Tiefe — du sitzt an Andrins eingeloggtem Gerät.

## Grundregeln (verbindlich)

1. **Eigene Worte statt Kopien.** Die IDC-Inhalte sind urheberrechtlich
   geschützt und für Andrins registrierten Zugang lizenziert. Ins Repo
   kommen NUR deine eigenen strukturierten Zusammenfassungen/Analysen für
   den internen Gebrauch — keine 1:1-Textkopien ganzer Lektionen, keine
   Video-Downloads, keine Screenshot-Serien. Kurzzitate (1–2 Sätze) mit
   Quellenangabe sind ok.
2. **Rohmaterial bleibt lokal.** Heruntergeladene Quelldateien (OneDrive-
   ZIPs, PDFs) nach `~/KosmoTrain-Quellen/` — NIE ins Repo (Grösse +
   Fremdrechte). Ins Repo nur `wissen/training/...`-Markdown.
3. **Schweizer Schreibung, kein ß.** Ehrlichkeit: was du nicht lesen
   kannst (defekte Datei, reines Video ohne Text), als Lücke vermerken —
   nie Inhalt erfinden.
4. **Push:** erst nach Einrichtung der Push-Rechte (Deploy-Key, Worker-
   Punkt vom 23.07.). Bis dahin lokal committen und Andrin melden.

## Teil A — IDC ACADEMY Übungs-Tiefe (academy.idc.ch)

Voraussetzung: Andrin ist im Browser angemeldet (er bestätigt den Zugang).
Arbeite die Lernpfade in dieser Reihenfolge ab: **ArchiCAD Grundlagen (6)
→ ArchiCAD Spezialisierung (3) → ArchiCAD Workflow (3) → Solibri (2) →
BIMcloud (5)**. Die vollständigen Modullisten mit URLs stehen in
`wissen/training/idc-academy/archicad-lernpfade.md` und
`…/solibri-bimcloud-lernpfade.md`.

Je Modul EINE Datei
`wissen/training/idc-academy/inhalte/<lernpfad>/<modul-slug>.md` nach
diesem Schema:

```markdown
# <Modultitel> (<Lernpfad>, Modul-ID <id>, ArchiCAD-Version <v>)
Quelle: academy.idc.ch/module/<slug> · erfasst <Datum> · Dauer lt. IDC <min>

## Lernziele (eigene Worte)
## Behandelte Werkzeuge/Funktionen (exakte Menü-/Werkzeugnamen sind Fakten — vollständig auflisten)
## Ablauf-Essenz (die didaktischen Schritte als eigene Kurzfassung, 5–15 Punkte)
## Übungsdaten/Voraussetzungen (welche Projektdatei/Vorlage die Übung nutzt)
## Kosmo-Bezug
- Datenbank-Tags (für KosmoTrain): …
- KosmoOrbit hat: … (mit Command-/Datei-Verweis, wenn du ihn kennst)
- Nachbau-Kandidat: … (was das Modul lehrt, das KosmoOrbit fehlt)
- Bewusst anders: …
```

Nach jedem abgeschlossenen Lernpfad: Sammel-Update in
`wissen/training/idc-academy/FORTSCHRITT.md` (Tabelle: Lernpfad, Module
erfasst/total, Auffälligkeiten). Etappenweise lokal committen (ein Commit
je Lernpfad, deutsche Commit-Botschaft).

## Teil B0 — ZUERST: bestehende OneDrive-Analyse auf der HDD suchen

Andrin erinnert sich (22.07.2026), dass auf dem Server/der HDD schon einmal
eine Analyse seines ganzen OneDrive gelaufen ist. BEVOR du in Teil B etwas
neu analysierst: suchen und wiederverwenden.

```bash
find /mnt/data ~ -maxdepth 6 \( -iname '*onedrive*' -o -iname '*eth*master*' \
  -o -iname '*analyse*' -o -iname '*inventar*' \) \
  -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -50
```

Zusätzlich prüfen: (a) Kosmos lokale Wissensbasis in der App (PREPARE-
Station → Wissensbasis — dort landen KosmoPrepare-OneDrive-Importe, App-
Speicher, nicht im Dateisystem sichtbar), (b) alte Worker-/Analyse-Ordner
unter `/mnt/data/ArchitekturKosmos/`. FUND: im Bericht dokumentieren
(Pfad, Umfang, Datum), Brauchbares nach `wissen/training/eth-master/`
überführen (eigene Strukturierung, Regeln von oben gelten) und in Teil B
nur noch die Lücken neu analysieren. KEIN FUND: ehrlich vermerken, Teil B
komplett fahren.

## Teil B — ETH-Master-Unterlagen (OneDrive)

Pfad in Andrins OneDrive: `Documents/02 Geschäftlich/00 Ausbildungen/
04 Master in Architecture ETH` (alle Unterordner).

1. Im eingeloggten Browser den Ordner als ZIP herunterladen (Ordnerebene →
   «Herunterladen»), nach `~/KosmoTrain-Quellen/eth-master/` entpacken.
   Bei sehr grossen Ordnern: unterordnerweise.
2. Inventar ZUERST: `wissen/training/eth-master/INVENTAR.md` — Baum aller
   Ordner/Dateien (Name, Typ, Grösse), damit nichts still verloren geht.
3. Dann je Themenordner eine Analyse-Datei
   `wissen/training/eth-master/<ordner-slug>.md`: Worum geht es (Fach,
   Semester), Kernkonzepte in eigenen Worten, welche Dokumente die
   tragenden sind, Kosmo-Bezug (was davon gehört in KosmoTrain-Wissen,
   was ist KosmoSpez-Trainingsfutter [R5], was ist privat/irrelevant).
   PDFs liest du direkt; reine Bilder/CAD-Dateien nur inventarisieren.
4. **Privatspur beachten:** persönliche Dokumente (Zeugnisse, Verträge,
   Korrespondenz) NUR inventarisieren, nicht inhaltlich ins Repo ziehen.

## Bericht an den Repo-Agenten

Am Ende (oder bei Abbruch) einen ehrlichen ABSCHLUSSBERICHT an Andrin zum
Weiterleiten: erfasste Module/Ordner mit Zahlen, Lücken (login-gescheitert,
unlesbar, Video-only), die 10 wichtigsten Nachbau-Kandidaten für KosmoOrbit
aus deiner Sicht, und ob committet/gepusht wurde.
