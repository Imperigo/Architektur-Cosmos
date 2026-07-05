# Serie G — Kosmo als Benutzer-Guide (Owner-Ergänzung 05.07.2026)

**Für V2-Build aufgenommen**, wie Serie E (Erlebnis) und Serie F (Rollenprofile).

## Owner-Auftrag (wörtlich)

> «ich möchte das kosmo auch zum benutzerguide wird wenn man das programm
> kennenlernt bis hin zum experten»

## Idee

Kosmo führt den Menschen **aktiv durch die Software** — vom ersten Start
(«ich kenne KosmoOrbit noch nicht») **schrittweise bis zum Experten**. Kosmo
ist nicht nur die steuernde Intelligenz und der Architektur-Berater, sondern
auch der **eingebaute Lernbegleiter/Guide** für die Bedienung von KosmoOrbit
selbst. Der Guide wächst mit: je mehr man kann, desto knapper und tiefer wird
Kosmos Führung — bis er nur noch auf Wunsch hilft.

## Warum das jetzt gut andockt

Das Fundament steht bereits:

- **Software-Selbstwissen (Serie D / Batch D3):** Kosmo kennt seine eigenen
  **Commands** (`allCommands()` → Titel + Beschreibung) und die **Doku**
  (ROADMAP/CLAUDE/Gestaltungskonzept …) als Trainings-/Wissenskorpus
  (`state/training-korpus.ts`, `public/training/software-korpus.json`). Genau
  dieses Selbstwissen ist die Faktenbasis für einen verlässlichen Guide —
  Kosmo erklärt Werkzeuge aus der echten Command-/Doku-Quelle, nicht geraten.
- **Erfahrungsstufen (Serie F):** die drei Stufen **simple · ausgewogen ·
  experte** steuern schon die Oberflächen-Dichte. Der Guide ist die **aktive,
  begleitende Seite** derselben Achse: F legt fest, *wie viel* sichtbar ist,
  Serie G legt fest, *wie* Kosmo einen dort hinführt.
- **Rollen-Keim & Personas:** `rollePromptBlock` und die Persona-Ebene in
  `shell/KosmoPanel.tsx` können den Guide-Ton je Rolle/Stufe färben (Lehrling:
  viel erklärend & Schritt-für-Schritt; Architekt: knapp & auf Abruf).
- **Lernjournal/Gedächtnis (D4):** Kosmo merkt sich, was der Nutzer schon kann
  bzw. wo er hängen bleibt — der Guide passt sich über die Zeit an (Fortschritt
  statt fixe Tour).

## Was Serie G bauen soll (Grobzuschnitt, Detailplan bei Start)

1. **Onboarding-Bogen statt Einmal-Tour.** Nicht nur der bestehende
   `kosmo.onboarded`-Erststart, sondern ein **fortlaufender Lernpfad** mit
   Stationen/Meilensteinen («erstes Geschoss gezeichnet», «erste Referenz
   gefunden», «erster Render-Graph», «erstes Blatt gedruckt»). Kosmo schlägt
   den nächsten sinnvollen Schritt vor.
2. **Kosmo erklärt jede Station & jedes Werkzeug auf Nachfrage** — «Was kann
   ich hier?», «Wie zeichne ich eine Wand?» — beantwortet aus dem
   Software-Selbstwissen (D3-Korpus), mit direktem Sprung/Absetzen (Kosmo kann
   das Werkzeug ausführen, weil jedes Command ein Kosmo-Tool ist).
3. **Erfahrungsstufe wächst mit (Kopplung an Serie F).** Stufe kann fix je
   Person sein **oder** mit den erreichten Meilensteinen mitwachsen
   (Lehrling → Zeichner → Architekt). Der Guide wird mit steigender Stufe
   knapper; Experten schalten ihn ganz aus oder auf «nur auf Abruf».
4. **Kontextsensitive Mikro-Hilfe** statt Handbuch-Wall: kurze, bedeutungsvolle
   Hinweise am richtigen Ort (kein Zappeln — «Papier flattert nicht»,
   respektiert `prefers-reduced-motion`, Serie-E-Motion-Regeln).
5. **Nichts erfinden:** wo eine Funktion die HomeStation/einen Schlüssel
   braucht, sagt der Guide das ehrlich (gleiche Regel wie überall im UI).

## Verhältnis zum gedruckten Handbuch

Das **Handbuch-PDF** (`docs/handbuch/`, V1-P6) bleibt die *statische*
Referenz (ArchiCAD-Stil, Full-HD-Screenshots). Serie G ist die *lebendige,
interaktive* Ergänzung **im Programm** — beide speisen sich aus derselben
Wahrheit (Commands + Doku), damit sie nie auseinanderlaufen.

## Reihenfolge

V2-Build, zusammen mit / nach Serie E und F. Muster wie immer: erst
erkunden/planen (Fable/Opus), dann bauen (Sonnet), grün getestet. Kernbezug:
`state/training-korpus.ts` (D3-Selbstwissen), `shell/KosmoPanel.tsx`
(`rollePromptBlock`, Personas), die Erfahrungsstufen aus Serie F.
