# Serie E — Erlebnis- & Gestaltungskonzept (Owner-Auftrag 05.07.2026)

**Der dritte grosse Auftrag**, nach (1) Codex-Übernahme und (2) Serie D
(KosmoData-Wissens-/Trainings-Dach). Hier aufgenommen, damit er beim vollen
V1-Endprodukt umgesetzt wird. Gebaut nach `KI-MODELL-GUIDELINE.md` (Fable/Opus
für Konzept, Sonnet für Umsetzung) — mit **Figma-MCP** und den **Claude-Design-
Skills** als Werkzeugen.

## Vision

Das Gestaltungskonzept wird **erweitert** — nicht nur Symbole, Farben, Design,
sondern die **Erlebnis-/Satisfaction-Ebene**: eine **pure, flüssige, satisfying
Benutzererfahrung** durch
- **innovative Animationen** (bedeutungsvoll, nicht dekorativ),
- durchdachten **Software-Aufbau**: Menüs, Dropdowns, Panels,
- **Grössen-Hierarchie & Rhythmus** (Dinge gross / Dinge klein),
- **Mikro-Interaktionen** mit Feedback, das sich richtig anfühlt.

Baut auf dem Bestehenden auf: `docs/GESTALTUNGSKONZEPT.md`, `aura.css`, die
`--k-motion-*`-Tokens, Owner-Regel **«Papier flattert nicht»** (Zurückhaltung),
`prefers-reduced-motion` respektieren, 60 fps.

## Drei Profile — je ein eigener, innovativer Aufbau in KosmoOrbit

Jedes Profil bekommt eine **individuelle, innovative Oberflächen-Architektur**,
passend zur Funktion der Abteilung:

1. **Kosmo** — die ganze **LLM-Abteilung** (KI, Chat, Agenten, Vorschläge,
   Personas). Erlebnis: die steuernde Intelligenz.
2. **KosmoDesign** — die **Entwurfs-/Zeichnungsabteilung** (BIM, Pläne,
   Werkzeuge, Viewport). Erlebnis: das taktile Zeichenbrett/Werkstatt.
3. **KosmoData** — die **Wissens-/Daten-/Archiv-Abteilung** (Referenzen, Assets,
   Wissen, Training, Gedächtnis — siehe Serie D). Erlebnis: die ruhige,
   souveräne Bibliothek/Datenbank.

## Werkzeuge (Anthropic-/Design-Ressourcen)

- **Figma-MCP** (verbunden): Design-Explorationen erzeugen/synchronisieren,
  Mockups in ein Figma-File legen, das der Owner ansehen/kommentieren kann;
  Design ↔ Code in beide Richtungen.
- **Claude-Design-Skills** (`artifact-design`, Motion): hochwertige UI-Artefakte
  und Interaktions-Prototypen.
- Umsetzung im Code über `@kosmo/ui`/`aura.css` (Design-System-only, konsistent).

## Owner-Input (05.07.2026 — verbindliche Richtung)

**Referenzen / Inspiration:**
- **KosmoDesign:** die vom Owner bereits geschickten Screenshots (Design-
  Referenz; beim Start erneut heranziehen/verlinken).
- **Betriebssystem-Gefühl:** **macOS** und **iPadOS** — deren Oberflächen-
  Politur/Übergänge als Messlatte.
- **Apps mit hohem Satisfaction-Level:** **Duolingo** (qualitativ hochwertige,
  sehr schöne Animationen), **Kurzgesagt**-Animationsstil; weitere Owner-Nennungen
  «pew / die pies / odysseus» — Namen/Links beim Start bestätigen.
- **Kosmo erscheint im Bild:** die **Rand-/Rim-Animation von Google Gemini**
  (Handy) als Vorbild dafür, wie Kosmo als Overlay ins Bild kommt.

**Gefühl je Profil (Owner):**
- **Kosmo** — **smooth, farbig** (lebendig, die steuernde Intelligenz).
- **KosmoDesign** — **professionell** (Werkstatt/Zeichenbrett, präzise).
- **KosmoData** — **archiv-souverän** (ruhige, souveräne Bibliothek).

**Hero-Momente (dürfen länger/aufwändiger sein):**
- **Start jeder Abteilung + App-Start**.
- **Kosmo kommt ins Bild** (Overlay-Auftritt, Gemini-Rim-Referenz).
- **Zeichnen & Modellieren**, **Renderings** — die Kernhandwerke.
- **3D-Bedienung des Modells** — cool & smooth, «fliegt».

**Animations-Prinzip (Owner):** frei in der Gestaltung, ABER Animationen dürfen
**Effizienz nie stören, nie laggen, nie zu lang** sein. Hero-Momente dürfen
länger sein; sonst gilt **cool, simple, knackig, sportlich** — die Software soll
sich anfühlen, **als würde sie fliegen**. (Deckt sich mit «Papier flattert
nicht»: Wirkung durch Präzision, nicht durch Zappeln.)

## Schriften (Opus-Entscheid, einheitlich überall)

Owner: «schlag Schriften vor, überall aber einheitlich, entscheide selber.»
Entscheid — ein **Zwei-Schrift-System**, self-hosted (offline-first, CSP-konform,
kein CDN):

- **UI/Sans (überall): Inter** — Schweizer Neo-Grotesk-Arbeitspferd, variabel
  (volle Gewichtsspanne für die Gross/Klein-Hierarchie), exzellente
  **Tabellenziffern** (tabular figures), neutral & präzise — passt zum
  Architekturbüro.
- **Mono (Ziffern & technische Labels): IBM Plex Mono** — technisch, tabellarisch,
  paart sauber mit Inter, trägt die Werkplan-Ästhetik (Messrahmen, VERSAL-Labels).
- **Hero/Display:** kein dritter Font — Inter in schweren Gewichten mit engem
  Tracking. Hält es **einheitlich**.

Alternative (frischer/«2025»): **Geist + Geist Mono** als Paar. Default bleibt
Inter + IBM Plex Mono; final beim Serie-E-Start fixieren (leicht tauschbar, da
ein Token in `aura.css`).

## Figma — Empfehlung (Antwort auf «was meinst du?»)

**Start ohne Figma-Zwang, Figma optional zum Polieren.** Konkret: ich baue die
ersten Erlebnis-Prototypen als **interaktive Claude-Artefakte** (HTML, sofort im
Browser ansehbar) — du siehst Animation/Feel live, ohne Setup, und wir iterieren
schnell. Gefällt die Richtung, richten wir ein **Figma-File** ein für saubere
Mockups/Handoff (Figma-MCP ist verbunden). Wenn du früh ein Figma-File freigibst,
lege ich Explorationen auch direkt dorthin — schadet nie, ist aber kein Blocker.

## Reihenfolge

Nach Batch 6 (Codex-Übernahme) und Serie D (KosmoData-Dach). Dann Serie E als
nächster grosser Auftrag — Konzept (Figma/Design-Skills) → Owner-Freigabe →
Umsetzung je Profil (Sonnet), grün getestet, Motion-Regeln eingehalten.
