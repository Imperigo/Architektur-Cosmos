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

## Wie der Owner hilft (offene Punkte, beim Start zu klären)

1. **Referenzen/Inspiration:** Apps/Tools, deren *Gefühl* du liebst — Namen,
   Screen-Recordings, Figma-/Dribbble-Links. (Für den Node-Tree war es Figma
   Weave; was ist es je Profil?)
2. **Gefühl je Profil in einem Satz:** Was heisst «satisfying» für Kosmo vs.
   KosmoDesign vs. KosmoData? (z.B. Kosmo = ruhig/gesprächig, KosmoDesign =
   präzise/taktil, KosmoData = archiv-souverän.)
3. **Figma-Zugang:** Wenn ich Mockups in Figma iterieren soll — ein Figma-File/
   Team freigeben; dann lege ich Explorationen dorthin, du kommentierst.
4. **Prioritäten:** Welche Momente MÜSSEN sich grossartig anfühlen (die «Hero»-
   Interaktionen)?
5. **Grenzen:** Wie viel Animation ist «innovativ» vs. zu viel — im Sinne deiner
   Zurückhaltungs-Regel.
6. **Assets:** Schriften, Sound-Wunsch (subtiles Audio-Feedback?), Markenelemente.

## Reihenfolge

Nach Batch 6 (Codex-Übernahme) und Serie D (KosmoData-Dach). Dann Serie E als
nächster grosser Auftrag — Konzept (Figma/Design-Skills) → Owner-Freigabe →
Umsetzung je Profil (Sonnet), grün getestet, Motion-Regeln eingehalten.
