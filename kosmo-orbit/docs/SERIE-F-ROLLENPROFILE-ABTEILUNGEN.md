# Serie F — Rollenprofile & neue Abteilungen (Owner-Ideen 05.07.2026)

**Für späteres V2-Build aufgenommen** (nach Codex-Übernahme, Serie D, Serie E).
Zwei neue Achsen: (1) **neue Abteilungen/Stationen** fürs Architekturbüro,
(2) **Rollenprofile + Erfahrungsstufen** — die Oberfläche passt sich an, je
nachdem wer am PC sitzt.

## Achse 1 — Neue Abteilungen (Stationen)

Neben den bestehenden (KosmoDesign, Kosmo, KosmoData, KosmoVis, KosmoAsset,
KosmoDev, KosmoPublish, KosmoPrepare/Doc/Train, Draw/Sketch/Speak) kommen dazu:

| Idee (Owner) | Zweck | Namensvorschlag |
| --- | --- | --- |
| **Geschäftsleitungstool** | Chefabteilung: Büro-Übersicht, Auslastung, Projekte-Portfolio, Kennzahlen, Entscheide | **KosmoLead** |
| **HR & Buchhaltung** | Personal, Zeit, Löhne, Rechnungen, Honorare (SIA), Projektkosten | **KosmoBüro** (o. KosmoOffice) |
| **Lehrling & Praktikant** | Lern-/Aufgaben-Tool, geführte Abläufe, Nachschlagen, Feedback | **KosmoLehre** |
| **Bauleitungstool** | Baustelle: Termine, Mängel, Begehungen, Ausschreibung/Vergabe, Protokolle | **KosmoBau** (o. KosmoSite) |

(Namen sind Vorschläge — Owner entscheidet beim Bau.)

## Achse 2 — Rollenprofile + Erfahrungsstufen

**Benutzerprofile für jeden Job im Büro.** Wer am PC sitzt, bestimmt, welche
Abteilungen/Werkzeuge sichtbar sind, wie komplex die Oberfläche ist und wo die
**Schwerpunkte** liegen.

**Die Jobs (Owner):**
Geschäftsleitung · HR & Buchhaltung · Projektleiter Architekt · Entwurfs-
Architekt · Zeichner:in Architektur · Praktikant · Lehrling · Bauleiter.

**Drei Erfahrungsstufen (quer zu den Jobs):** **simple · ausgewogen · experte.**
Nach Position + Fachwissen wird die Oberfläche einfacher oder voller. Beispiel:
ein Lehrling im 1. Jahr sieht eine **simple** Oberfläche (weniger Werkzeuge,
mehr Führung), ein vollausgebildeter Architekt die **Experten**-Fläche (volle
Werkzeugtiefe, Tastaturkürzel, Dichte).

### Wie ein Profil wirkt

Ein Profil = **Job × Erfahrungsstufe** und steuert:
- **Sichtbare Abteilungen/Stationen** (z.B. Bauleiter → KosmoBau/Publish im
  Vordergrund; Geschäftsleitung → KosmoLead/Büro; Zeichner → KosmoDesign),
- **Werkzeugtiefe & Dichte** (simple/ausgewogen/experte),
- **Schwerpunkte & Startbild** (was zuerst kommt),
- **Kosmos Ton/Hilfe** (Lehrling: mehr erklärend; Architekt: knapp).

## Anknüpfung an Bestehendes

- Es gibt schon einen **Rollen-Keim**: `rollePromptBlock` in `shell/KosmoPanel.tsx`
  kennt heute `entwurf | ausfuehrung | admin` und färbt Kosmos Fokus. Serie F
  baut das zu vollen Job-Profilen + Erfahrungsstufen aus.
- **Komposition mit Serie E:** Serie E gestaltet die *Abteilungs-Erlebnisse*
  (Kosmo/KosmoDesign/KosmoData-Feel). Serie F legt die *Rollen-/Erfahrungs-
  Ebene* darüber. Endergebnis: **Oberfläche = Abteilungs-Erlebnis (E) × Rolle ×
  Erfahrungsstufe (F).**

## Offene Fragen (beim Serie-F-Start)

1. Profil-Wahl: pro Gerät fix, oder Login/Umschalter (mehrere Nutzer an einem PC)?
2. Wer legt Profile an — Geschäftsleitung (zentral) oder jeder selbst?
3. Erfahrungsstufe: fix je Person, oder mit der Zeit „mitwachsend" (Lehrling →
   Zeichner → Architekt)?
4. Rechte: sehen alle alles nur anders, oder sind Daten je Rolle begrenzt (HR/
   Löhne nur Geschäftsleitung)?

## Reihenfolge

V2-Build, nach den laufenden Serien. Muster wie immer: erst erkunden/planen
(Fable/Opus), dann bauen (Sonnet), grün getestet.
