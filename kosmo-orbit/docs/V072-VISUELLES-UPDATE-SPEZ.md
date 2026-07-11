# V0.7.2 «Visuelles Update» — Verbindliche Bau-Spezifikation

> Quelle: ClaudeDesign-Handoff (ZIP, 11.07.2026) — README + Canvas-Logikblock.
> **Diese Spec ist die EINZIGE Quelle für die Bau-Streams.** Das Handoff-HTML
> referenziert eine fiktive Codebasis (NavRail/Tailwind/framer-motion/--ak-*)
> und wird von Agenten NICHT gelesen. Owner-Entscheide (11.07.): orbit-Theme
> = neuer Standard · alle 8 Pakete in 3 Tagen · Sounds Default AUS · **Hub
> statt Boden-Dock**. Plan: /root/.claude/plans/…wiggly-bumblebee.md.

## 0 · Verbindliche Grundregeln (überall)

1. **Rund statt Block:** Akzent-«Pixel» sind Kreise (`<circle>`), Werkzeug-
   Kacheln/Dock-/App-Icons sind Kreise, Balken sind Pills (999px). Einzige
   Ausnahme: das Neun-Quadrat im Logo behält weiche Ecken (rx ≈ 30 %).
2. **Kanten-Regel:** Animationen am Bildschirmrand docken an Kante/Ecke an;
   freie Animationen sind zentrisch.
3. **80 % Ruhe · 15 % Linie · 5 % Signal.** Farbe nur mit Bedeutung;
   Rollenfarben nur, wenn Agenten/Werkzeuge beteiligt sind.
4. **prefers-reduced-motion:** statischer Zustand voll lesbar; Feedback
   < 700 ms, Ambient-Loops 1.8–7 s. Der globale Riegel (aura.css:265) gilt;
   JS-Animationen (rAF) prüfen matchMedia selbst.
5. Schweizer Deutsch (ss statt ß); UI-Labels UPPERCASE Mono mit Tracking.
6. **Morph-Regel:** Symbole wechseln nie hart und bekommen keine Anhängsel —
   sie verwandeln sich selbst, immer über den Signal-Punkt als Zwischenform.

## 1 · Tokens (aura.css)

**Neues drittes Theme `[data-theme='orbit']`** — 'paper' und 'ink' bleiben
byte-identisch. orbit überschreibt NUR bestehende Variablen:

| Token | orbit-Wert |
|---|---|
| --k-field | #0B0D12 |
| --k-surface | #14171F |
| --k-raised | #1A1E27 |
| --k-ink | #F4F6FA |
| --k-ink-soft | #B6BDCB |
| --k-ink-faint | #6E7686 |
| --k-technik | #444B59 |
| --k-line | #222732 |
| --k-line-strong | #2A3140 |
| --k-accent / -hover | #57B6C2 / heller (~#6cc4cf) |
| --k-accent-ink | #06141A |
| --k-accent-wash | rgba(87,182,194,.12) |
| --k-danger / --k-success | #CD7670 / #74C2A0 |
| --k-radius-sm/md/lg | 8 / 12 / 16 px (paper/ink behalten 2/4/6) |
| --k-font-ui | 'Lato', dann bisheriger Stack |
| --k-font-titel | 'PT Sans Narrow', dann bisheriger Stack (Tracking .26–.3em bei Wordmark) |
| --k-plan-paper / --k-viewport-sky | = ink-Werte (#16150f / #101012) — Plan-Welt bleibt |
| color-scheme | dark |

**NEU global in `:root` (alle Themes):**
- `--k-radius-pill: 999px`
- Signal (theme-invariant, Marke): `--k-signal:#57B6C2 · --k-signal-hell:#EAF6F8 · --k-signal-tinte:#06141A`
- Rollenfarben: `--k-rolle-manuell:#74C2A0 · --k-rolle-pn:#6F9BCF · --k-rolle-pna:#C082B4 · --k-rolle-agent:#CBB06A · --k-rolle-memory:#CF9466 · --k-rolle-generator:#CD7670 · --k-rolle-ak:#B08A6E · --k-rolle-office:#8A7B5A`
- Easings (additiv, --k-motion-*/--k-feder bleiben): `--k-ease-standard: cubic-bezier(0.4,0,0.2,1) · --k-ease-entrance: cubic-bezier(0.16,1,0.3,1) · --k-ease-bounce: cubic-bezier(0.34,1.4,0.64,1)`

**Fonts:** self-hosted woff2 (OFL): Lato 400/700, IBM Plex Mono 400/500,
PT Sans Narrow 400/700 — latin-Subset, Summe ≤ 250 KB, `public/fonts/` +
`apps/kosmo-orbit/src/fonts.css` (@font-face, font-display swap; Import in
main.tsx NACH aura.css). Kein CDN (CSP font-src 'self' data:).

**Default:** `ThemeName = 'paper'|'ink'|'orbit'` (tokens.ts:179); App.tsx:125
Default `'orbit'` (localStorage-Wahl bestehender Nutzer bleibt respektiert);
Einstellungen: 3-Segment-Wähler `einstellung-thema-{paper,ink,orbit}`;
PWA-Manifest theme_color/background_color #0B0D12 (vite.config.ts).

## 2 · Logo «6a» (Paket 01)

Exakte Vollversion (48er-ViewBox) — Satellit + Mittelpunkt gemäss Rund-Regel
als Kreise (Handoff-Rects mit rx=50 % ⇒ Kreis; Zentren beibehalten):

```svg
<svg viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="17" stroke="#F4F6FA" stroke-width="1.5" stroke-dasharray="2 4" stroke-linecap="round" opacity=".5"/>
  <path d="M 24 7 A 17 17 0 0 1 41 24" stroke="#57B6C2" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="40.3" cy="9.9" r="1.7" fill="#57B6C2"/>
  <rect x="17.5" y="17.5" width="13" height="13" rx="4" stroke="#F4F6FA" stroke-width="1.4"/>
  <path d="M 21.8 17.5 V 30.5 M 26.2 17.5 V 30.5 M 17.5 21.8 H 30.5 M 17.5 26.2 H 30.5" stroke="#F4F6FA" stroke-width="1" opacity=".7"/>
  <circle cx="24" cy="24" r="1.6" fill="#57B6C2"/>
</svg>
```
Farben in der Komponente über Tokens: Weiss = `var(--k-ink)` (in paper/ink
dunkler = korrekt), Teal = `var(--k-signal)`.

**Klein ≤ 22 px:** Rasterlinien weg → Ring (dash 2.4 4, sw 2) + Quadrat
13×13 rx 4 (sw 1.8–2) + Mittelpunkt r 2.1. Im Shell-Kontext ≤ 22 px:
Quadrat 14×14 rx 4.5 sw 2, Punkt r 2.5.

**Zustände (Props der neuen `logo-6a.tsx`):** `bereit` statisch ohne
Segment-Farbe · `laeuft` Signal-Viertel rotiert (1.4–1.8 s linear) ·
`fertig` Ring voll `--k-success` + Haken · `fehler` Punkt `--k-danger`,
blinkt 1.2 s. `Logo.tsx/OrbitMark` behält API + Nutzung; intern 6a.

**App-Icons (Kreise, 4 Varianten):** Standard = dunkler Verlauf 155°
`#171B24→#0B0D12`, Border #2A3140 · Tint = Voll-Teal, Zeichnung #06141A ·
Glas = rgba(244,246,250,.06)+blur 20 · Light = #F2F5FA, Zeichnung #0B0D12.
Standard-Variante → neue PNGs `public/icons/icon-{512,512-maskable,192,180}.png`
(COMMITTET; maskable mit Safe-Zone ~80 %); CI `npx tauri icon` bleibt wörtlich.

**Splash (Inline in index.html, VOR #root):** `#splash`-Div, zentriert:
6a-Marke 64 px (Segment+Satellit rotieren 1.8 s), Wordmark KOSMO ORBIT
(PT Sans Narrow, Tracking .28em), Zeile `V0.7.2 · ● LOKAL` (Mono, klein),
Lade-Pill 180×2 px mit wanderndem Teal-Segment (kScan 1.6 s). CSS inline im
`<style>`-Block (kein Bundle-Wait — genau der Sinn). `pointer-events:none`;
App entfernt `#splash` synchron im ersten Mount-Effect. Reduced-motion:
statisch. E2E-Beweis: e2e/splash.spec.ts (existiert im DOM vor App-Mount-Ende
nicht mehr blockierend; kein Klick-Fänger).

## 3 · Werkzeug-Glyphen (Paket 02) — exakte Pfade

Norm: 24er-ViewBox, Stroke `var(--k-ink)` opacity .9, sw 1.75, runde
Kappen/Joins, fill none — plus **genau EIN Punkt** `<circle r="1.7">` in der
Rollenfarbe (Zentren unten = Canvas-Rect-Position + 1.7). Einfarbig-fähig
(Punkt erbt currentColor, wenn keine Rolle übergeben).

| Art | Grundform (d/Attribute) | Punkt-Zentrum |
|---|---|---|
| chat | `M12 4 v5 M12 15 v5 M4 12 h5 M15 12 h5` + circle 12,12 r2.4 | 17.9, 5.9 |
| pipeline | circle 6,6 r2.4 + circle 18,12 r2.4 + `M8 7.5 L15.6 11 M8 17 L15.6 13` | 5.9, 17.3 |
| draw | `M5 19 L15.5 8.5 M5 19 l1-4 M5 19 l4-1` | 17.5, 6.5 |
| data | ellipse 12,7 rx7 ry2.8 + `M5 7 v10 c0 1.6 3.1 2.8 7 2.8 s7-1.2 7-2.8 V7` | 16.2, 12.9 |
| viz | rect 4,5.5 16×13 rx2 + `M4 15.5 l5-5 4 4 3-3 4 4` | 16.5, 9.3 |
| publish | `M7 20 h10 a2 2 0 0 0 2-2 V8 l-4-4 H7 a2 2 0 0 0-2 2 v12 a2 2 0 0 0 2 2 Z M15 4 v4 h4` | 10.1, 15.3 |
| prepare | circle 12,12 r8 + `M15 9 l-2 4.4 L9 15 l2-4.4 Z` | 12, 12 |
| connect | `M4 9 h13 m0 0 -3-3 m3 3 -3 3 M20 15 H7 m0 0 3-3 m-3 3 3 3` | 18.7, 17.7 |
| office | `M4 8 a2 2 0 0 1 2-2 h4 l2 2.5 h6 a2 2 0 0 1 2 2 V17 a2 2 0 0 1-2 2 H6 a2 2 0 0 1-2-2 Z` | 17.5, 13.7 |
| zentrale | rect 5,4.5 14×6.4 rx1.6 + rect 5,13.1 14×6.4 rx1.6 + `M8 7.7 h3 M8 16.3 h3` | 16.5, 16.3 |
| odysseus | circle 12,12 r3 + `M12 4.5 v2.6 M12 16.9 v2.6 M4.5 12 h2.6 M16.9 12 h2.6 M6.7 6.7 l1.8 1.8 M15.5 15.5 l1.8 1.8 M17.3 6.7 l-1.8 1.8 M8.5 15.5 l-1.8 1.8` | 12, 12 |
| orbit | circle 12,12 r8.5 dash `1.5 3` + Teal-Viertel `M12 3.5 A 8.5 8.5 0 0 1 20.5 12` (sw 2, `var(--k-signal)`) + rect 10.4,10.4 3.2×3.2 rx1 stroke ink | — (Quadrat statt Punkt) |

**Erweiterung (Fable-Zuordnung, im Handoff-Stil):** 2 zusätzliche Glyphen im
selben Strich für fehlende Stationen: `skizze` (Freihand-Welle
`M4 16 C8 8, 12 20, 20 9` + Punkt 17.5,15.5) und `lernen` (drei aufsteigende
Pill-Balken 6/12/18 Höhe 6/10/14 + Punkt 18.5,6.5).

**Station→Glyphe→Rollenfarbe** (Rollenfarben nur wo Agenten/Werkzeuge —
Regel 3):

| Station | Glyphe | Rolle |
|---|---|---|
| design | draw | --k-rolle-manuell |
| sketch | skizze | --k-rolle-manuell |
| draw (Modellbaum/Mengen) | zentrale | --k-rolle-pn |
| data | data | --k-rolle-pn |
| vis | viz | --k-rolle-generator |
| publish | publish | --k-rolle-agent |
| prepare | prepare | --k-rolle-memory |
| asset | office | --k-rolle-ak |
| dev | pipeline | --k-rolle-pna |
| speak/kosmo | chat | --k-signal |
| doc | odysseus | --k-rolle-office |
| train | lernen | --k-rolle-memory |
| Sync/Koppeln (Header) | connect | --k-rolle-ak |
| Hauptwerkzeug orbit/Logo | orbit | — |
| Hauptwerkzeug office | office | --k-rolle-office |

**Verträge:** `tool-{auswahl,wand,volumen,zone}` (Design-Leiste) bleiben wie
sie sind (aria + leerer innerText); `tool-treppe/dach` bleiben TEXT;
`werkzeug-glyphen.tsx` ist eine NEUE Bibliothek, verdrahtet nur an
orbit-icons.tsx (4 Hauptwerkzeuge), design/werkzeug-icons.tsx (bestehende 4)
und EntwurfsDock (Icons + Rollen-Punkt; testids/title/DOM exakt belassen).

## 4 · Phasen & Ordnung (Pakete 03 + 05)

**SIA-112-Gruppen:** `sia112Gruppe(siaPhase)`: strategie→1 · wettbewerb→2 ·
vorprojekt/bauprojekt/bewilligung→3 · ausschreibung→4 · ausfuehrung/abnahme→5.
**Additiv neu:** `'strategie'` in `SiaPhase` (kernel doc.ts) + Label
«Strategische Planung (SIA 112 Ph. 1)» + zod-Settings + phasen-presets-Preset
(aus BASE-Zeile 1: prepare/data/chat-lastig). Bewusste Anpassung von
e2e/faehigkeiten-phasen.spec IM Stream C.

**PhasenLeiste.tsx (Header, Segmented-Pill):** Labels `1 STRATEGIE ·
2 VORSTUDIE · 3 PROJEKTIERUNG · 4 AUSSCHREIBUNG · 5 REALISIERUNG` (Mono,
UPPERCASE, Tracking); aktives Segment Chip `var(--k-raised)` + Signal-Punkt;
Klick → `design.siaPhaseSetzen` mit repräsentativer Phase
(strategie/wettbewerb/bauprojekt/ausschreibung/ausfuehrung); feinere echte
Phase → Segment aktiv + title=siaPhaseLabel. Testids `phasen-leiste`,
`phasen-leiste-{1..5}`. `sia-phase-select` + `statusleiste-phase` unverändert.

**BASE-Matrix (Minuten, Index = SIA-112-Phase 1..5):**
```ts
export const BASE: Record<ToolId, number>[] = [
  { prepare:46, data:38, chat:30, publish:12, pipeline:10, draw:8,  connect:6, viz:4  },
  { draw:34, prepare:30, data:26, chat:22, viz:18, pipeline:12, publish:8, connect:5 },
  { draw:52, viz:30, pipeline:26, data:20, chat:18, publish:14, prepare:8, connect:6 },
  { publish:44, data:30, pipeline:22, chat:16, draw:12, viz:10, connect:8, prepare:6 },
  { data:36, publish:30, connect:26, chat:22, pipeline:18, viz:12, draw:10, prepare:4 },
];
```
ToolId hier = die 8 Canvas-Tools; Abbildung auf Stationen:
draw→design · viz→vis · data→data · pipeline→dev · chat→speak ·
publish→publish · prepare→prepare · connect→(Sync, zählt für Rang nicht als
Station). **Rang:** `rang(t) = 0.6·norm(BASE[phase][t]) + 0.4·norm(nutzung7T)`;
Nutzung über den BESTEHENDEN Adaption-Kern (`nutzungMelden('orbit:'+toolId)`,
1 Klick ≈ 6 min-Gewicht, 7-Tage-Halbwertszeit vorhanden). **Hysterese:**
Umsortieren nur bei Δrang > 0.08 UND Anti-Nerv-Wache (`darfUmordnen`), max
1 Umsortierung pro Phasenwechsel bzw. Sitzungsminute.

**Wirkung (Hub statt Boden-Dock, Owner-Entscheid):**
- **OrbitStart-Hub:** Untertool-Kreise nach Rang — Top-3 innen (64 px,
  Rollenfarben-Border + Glow), Mitte 54, aussen 46; FLIP (240–500 ms
  --k-ease-standard) bei Umsortierung. HARTE VERTRÄGE: genau 4
  `orbit-haupt-*`, Animationsnamen `k-orbit-drehen`/`k-orbit-gegendrehen`
  bleiben, Untertools bleiben IMMER im DOM (nur Reihenfolge/Grösse/Transform).
- **EntwurfsDock:** Glas-Optik (rgba(20,23,31,.55) + blur 22 + 1px-Highlight
  — nur im orbit-Theme via Token/Attribut), kreisrunde Buttons, Rollen-Punkt,
  Nutzungs-Pop (kPop 450 ms) bei Klick, Hover-Sog scale 1.22/translateY −8
  (180 ms, nur Nachbarn). Alle testids/titles bleiben.
- **Hierarchie-Stack** (STACK-Subtools) = bestehender Fächer im Hub; Pills
  mit Stagger 55 ms (kRise 320 ms); max. eine Ebene offen (ist heute so).
STACK: draw→[Skizze, Volumen, BIM-Layer, IFC-Export] · viz→[Render,
Varianten, Vergleich] · data→[RAG-Index, Memories, Referenzen] ·
pipeline→[Rezepte, Knoten, Läufe] (auf bestehende Untertool-Einträge mappen,
nichts erfinden — nur Beschriftungs-/Ordnungs-Referenz).

## 5 · Interaktions-Feedback (Paket 04)

Alle Keyframes NEU in `apps/kosmo-orbit/src/shell/kosmo-feedback.css`
(aura.css gehört Stream A):
- **Erfolgs-Pop:** scale 1→1.22→.94→1, 450 ms --k-ease-bounce + Ring-Burst
  550 ms + Chip «+1 · SERIE n» steigt 900 ms. Knöpfe mit 3D-Schatten
  `0 4px 0` (dunklerer Ton), Press translateY 3.
- **Punkt-Burst** bei Werkzeug-Auswahl: 8 Punkte radial, 600 ms, Stagger 25 ms.
- **Orbit-Loader:** Kreisprogress in 5 Segmenten (dash-basiert), Abschluss
  Haken-Draw 400 ms (stroke-dashoffset).
- **Sounds** (`state/sounds.ts`, Vorbild state/haptik.ts): WebAudio-Oscillator
  klick/snap/plopp/wusch (30–120 ms, Gain ≤ 0.08, Sine/Triangle, resume nach
  Nutzergeste, feature-detected). Einstellung `kosmo.sounds`, **Default AUS**.

## 6 · Kosmo-Zustände (Paket 06) — State-Machine + Orb

`state/kosmo-status.ts` additiv: `zustand: 'idle'|'thinking'|'listening'|
'speaking'|'writing'|'dispatching'|'done'|'error'|'takeover'` +
`setzeZustand()`; **`beschaeftigt` bleibt abgeleitet**
(`!['idle','done','error'].includes(z)`); `setzeBeschaeftigt(true|false)`
mappt auf thinking|idle (Rückwärtskompatibilität aller Aufrufer). done→idle
Auto-Decay 2 s, error→idle 4 s (Timer im Store). Verdrahtung KosmoPanel:
Mic-Aufnahme→listening · TTS-Wiedergabe→speaking · onText-Streaming→writing ·
applyPaket/Auftrag-Übergabe→dispatching · onError→error.

**KosmoOrb.tsx** (im KosmoSymbol + Charakter-Fenster wiederverwendet):
`data-zustand`-Attribut, Darstellung pro Zustand (CSS-Attribut-Selektoren):
1. idle/**Überlegen:** lose Punkte driften ±10 px um stabiles Raster (Loops
   3.4–5 s), Kern pulsiert — ambient, nie blockierend.
2. **Zuhören:** Kern atmet (scale 1→1.1, 2.4 s), 4 Punkte laufen im
   Uhrzeigersinn auf; stoppt sofort bei Input.
3. **Sprechen:** Equalizer aus Pill-Säulen, Höhe `steps(4)`, 0.7–1.05 s.
4. **Schreiben:** Wort-Pills fallen zeilenweise (Drop 90 ms/Block, Overshoot
   1.4), aktuelles Wort teal.
5. **Losschicken:** Punkte schiessen in Rollenfarbe raus (2-stufig),
   Kern-Rückstoss scale .86→1.07→1, Stagger 350 ms.
6. **Fertig:** 4 Punkte fallen ins Raster, doppeltes Nachfedern (550 ms,
   Stagger 140 ms), Signal-Punkt zuletzt; Sound «klick» (falls an).
7. **Fehler:** Raster ruckt (Shake 300 ms), EIN roter Punkt bricht heraus,
   fällt mit Rotation, setzt sich wieder — nie nur Farbe.
8. **takeover (Stufe 1 = Fensterrahmen, Web-Overlay):** Punkte laufen dem
   App-Rahmen entlang (radial-gradient-Dots, Umlauf 1.1 s), 4 Ecken pulsieren
   versetzt (Delay .27 s); Chip «KOSMO ARBEITET · ESC BRICHT AB» unten Mitte;
   Bildschirm bleibt sichtbar. (Stufe 2 Desktoprahmen = 0.7.3.)
KosmoSymbol behält Testids/DOM-Vertrag (`kosmo-symbol`, `kosmo-mini`,
Symbol↔Panel); der Orb ersetzt nur das Innere; `k-kosmo-arbeitet` bleibt als
Fallback bestehen.

## 7 · «Kosmo zeichnet sichtbar» (Paket 06.8, Stufe 1)

Architektur **Overlay-Vorspiel VOR atomarem Apply**:
1. «Anwenden» (Paket) startet bei aktiver Einstellung `kosmo.abspielen`
   (Default AN, aber: `navigator.webdriver` ODER reduced-motion ⇒ direkt
   Apply — dokumentierter Testpfad) die Abspiel-Ebene: pro Schritt SVG-Pfade
   aus params/proposal-vorschau → stroke-dasharray/-dashoffset-Draw im
   Overlay über PlanView; Orb (Teal-Kern r7 + Halo) folgt via rAF +
   `getPointAtLength`; Tempo ≤ 3000 px/s (Bildschirm); **120 ms Snap-Pause +
   Einmal-Puls je Element**; Kometen-Schweif (3 Punkte); **Etikett-Chip 8 px
   daneben** zeigt `summarize()` («WAND 24 CM · BETON»). Leertaste = Pause,
   ESC = Stopp (⇒ sofort Apply).
2. Danach der UNVERÄNDERTE synchrone `applyPaket` (eine Undo-Gruppe, atomar).
   Overlay blendet aus, sobald die Doc-Geometrie da ist.
`state/abspiel-ebene.ts` mehrspurig angelegt (Schwarm-API für 0.7.3), Stufe 1
= genau 1 Orb. Schnittstelle: KosmoPanel reicht `onAbspielStart?(schritte)`
(von Stream D vorbereitet) — Stream E fasst KosmoPanel.tsx NICHT an.

## 8 · Cursor-System (Paket 08)

Grundform SVG 32er-ViewBox `M16 4 L25 26 Q16 21.5 7 26 Z`, Füllung
`var(--k-signal-hell)`, Stroke `var(--k-signal)` 1.5 round, Glow
drop-shadow(0 2px 8px rgba(87,182,194,.35)); Spitze = Hotspot; Light-Variante
Füllung #0B0D12 (in paper-Theme automatisch via Token). Drei Schachteln:
Wrapper (rAF-translate) → Rotor (rotate, transition 140 ms
--k-ease-entrance, Winkel akkumuliert, Δ auf ±180° normalisiert, Update ab
3 px) → SVG (Klick-Feder-Pop 400 ms — Pop nie auf dem Rotor!).
**Morph:** Kollaps 140 ms → Signal-Punkt (Feder scale 1.6) → Entfalten
180 ms Overshoot 1.12; gesamt ≈ 320 ms --k-ease-bounce. Zustände: default
Pfeil · loading rotierender Teal-Ring (dash 8 6, 1.6–1.8 s) · kosmo Orb
(Teal-Kern r7 + gepunkteter Ring) · tool Werkzeug-Glyphe + Rollen-Punkt ·
precision Fadenkreuz (Kreis r13 + Teal-Ticks + Mittelpunkt).
`cursor:none` nur `[data-eigencursor='an']`; Ausnahmen: Inputs/textarea/
select/contenteditable ⇒ auto + Layer versteckt; PlanView/SketchOverlay/
NodeCanvas ⇒ `data-cursor-zone="praezision"|"eigen"` (precision-Morph bzw.
Layer aus, eigener cursorStil bleibt). Default AN nur bei `pointer:fine`;
Einstellung `kosmo.eigencursor`; reduced-motion: keine Rotations-Transition,
Morph = harter Wechsel.

## 9 · System & Charakter (Paket 07)

**Tauri:** Cargo `tauri = { version="2", features=["tray-icon","image-png"] }`.
Zweitfenster in tauri.conf.json: label `kosmo-charakter`, ~200×220,
`decorations:false, transparent:true, alwaysOnTop:true, skipTaskbar:true,
resizable:false, visible:false, url "index.html?fenster=charakter"`.
`capabilities/charakter.json` (windows:["kosmo-charakter"], core:default +
window show/hide/set-position) + Event-Permissions beidseitig (Haupt emittet
`kosmo-zustand`, Charakter lauscht). Tray in lib.rs (TrayIconBuilder, Menü
Öffnen/Beenden; Klick zeigt Hauptfenster). Position: Ecke unten rechts
(Monitor − Fenster − 24 px Rand) zur Laufzeit.
**Charakter-Orb:** gepunkteter Teal-Ring (r 20, dash 2 4.4), Kern #12151D +
Teal-Punkt (Puls 2 s), Satellit kreist 7 s, atmet 3 s; Meldungs-Chips (Pill,
Glas) links vom Orb; spielt die Zustände aus §6. **Aufstarten:** 2 Punkte
kreisen gegenläufig (1.8 s / 2.7 s reverse) + Lade-Pill; danach wandert Kosmo
in die Ecke. **Schliessen:** Hauptfenster-Inhalt skaliert zur Ecke unten
rechts (450 ms, transform-origin Ecke), Orb «schluckt» mit Pop
(scale 1.16→.95→1), Sound «plopp» (falls an).
**Web/PWA:** kein Fenster — Fallback ist der KosmoOrb im Hauptfenster;
Einstellung «Kosmo-Charakter (nur Desktop)». Ehrlich: im Container nicht
lauffähig; Beleg = cargo check + Desktop-CI + Owner-Rundgang; macOS/Linux-
Transparenz-Grenzen im Rundgang-PDF benennen.

## 10 · Companion minimal (PWA, `#companion`)

Hash-Weiche (in main/App, von W1 als No-op vorbereitet): eigene, schmale
Ansicht — Phasen-Ring (Kreisprogress n/5 aus `sia112Gruppe`), Job-/Freigabe-
Karten (Status-Punkt + Mono-Label; Quellen: auftragsbuch + vis-runtime;
Freigabe über bestehende Bridge-approve-Route), 4er-Kreis-Dock
(design/data/kosmo/office als Links zurück in die Voll-App). Ehrlich:
Lese-/Freigabe-Companion, kein Zeichnen; via bestehendem QR-Pairing
erreichbar. Testids `companion`, `companion-phasenring`, `companion-job-*`.

## 11 · Harte Verträge (Schutzliste — Bruch = Stream-Fehler)

`oberflaeche-minimal.spec` (Mehr-Menü **18**, tool-*-Aria/innerText,
tool-treppe/dach TEXT, statusleiste-*) · `orbit-start.spec` (4 orbit-haupt,
Animationsnamen, Untertools immer im DOM, reduced-motion→none) ·
`kosmo-symbol.spec` (Symbol↔Panel-DOM) · `orbit-werkzeuge.test`
(4 Hauptwerkzeuge Reihenfolge/Titel) · `neuigkeiten.test` · ~40 Specs
klicken `module-design` direkt · Bootstrap `kosmo.onboarded`/
`starterGuide.done` · Kernel-Goldens byte-identisch · Werkzeugzähler-,
Seed-112/19-, token-spiegel-, waehleOption-, Leak-Gates-Verträge.
**Bewusste Änderungen (nur Stream C):** faehigkeiten-phasen.spec-Labels
(+strategie), zod-SiaPhase.

## 12 · Stream-Schnittstellen (Merge-Gesetz)

- App.tsx gehört W2-C; C hinterlässt `{/* v072: cursor-ebene */}` — W3-F
  ersetzt exakt diese Zeile.
- main.tsx/index.html gehören W1-A; A legt `?fenster=charakter`- und
  `#companion`-Weichen als No-op an (Kommentar-Anker) — W3-F/W4-G füllen nur
  die Komponenten.
- KosmoPanel.tsx gehört W2-D; D legt `onAbspielStart?`-Aufruf an — W3-E
  implementiert die Ebene ohne KosmoPanel-Änderung.
- aura.css gehört W1-A exklusiv; alle neuen Keyframes anderer Streams in
  eigene CSS-Dateien (kosmo-feedback.css, cursor-ebene.css, kosmo-zeichnet.css).
- Einstellungen.tsx gehört W1-A (Thema-Wähler); die Schalter Sounds/Cursor/
  Abspielen/Charakter kommen erst in W4-H (dann ist die Datei frei).
