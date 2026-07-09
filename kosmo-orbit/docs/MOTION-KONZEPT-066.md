# MOTION-KONZEPT 0.6.6 — Bewegungssprache für Papier & Tusche

**Status: verbindliche Spec für alle 0.6.6-Streams.** Referenz ist die
Android-17-Benutzererfahrung — aber nur ihre *Physik*: Snappiness, spürbare
Knopfdrucksimulation, Gesten mit Impuls, choreografierte Systemübergänge.
Ihr *Aussehen* (Material, Ripple, Farbwellen) wird NICHT übernommen. KosmoOrbit
bleibt Papier & Tusche: Bewegung fühlt sich an wie Papier, das man anfasst —
leicht, sofort, ohne Gummi-Effekthascherei.

## 1. Haltung (drei Sätze, die jede Entscheidung schlagen)

1. **Eingabe reagiert in <100ms sichtbar** — der Druck selbst ist die erste
   Animation, nicht das Ergebnis.
2. **Papier flattert nicht** — nichts springt unter dem Zeiger, Layout-Shifts
   sind verboten, Austritt ist schneller als Eintritt.
3. **Jede Bewegung hat einen Aus-Schalter** — `prefers-reduced-motion`
   reduziert auf Opacity-Schnitte; das ist zugleich der E2E-Stabilitätsvertrag.

## 2. Token-Ordnung (aura.css = Wahrheit, tokens.ts = Spiegel)

Bestand (bleibt): `--k-motion-fast` 120ms · `--k-motion-base` 200ms ·
`--k-motion-settle` 320ms.

Neu:

```css
/* Federkurve: schnelles Anreissen, weiches Setzen mit minimalem Überschwung
   (~2%). linear()-Approximation einer Feder (Steifigkeit hoch, Dämpfung ~0.8);
   Fallback für alte Engines: cubic-bezier mit leichtem Overshoot. */
--k-feder: 260ms linear(0, 0.32 12%, 0.72 28%, 0.95 46%, 1.02 64%, 1 82%, 1);
--k-feder-fallback: 260ms cubic-bezier(0.3, 1.25, 0.4, 1);
/* Druck: die Knopfdruck-Simulation — kürzer als fast, weil sie auf
   pointerdown antwortet und NIE nachhinken darf. */
--k-druck-dauer: 80ms;
--k-druck-skala: 0.97;
```

Regeln: Dauer-Anzahl bleibt bei diesen fünf Werten — keine Ad-hoc-Millisekunden
in Komponenten. Wer eine sechste Dauer braucht, ändert das Konzept, nicht den
Einzelfall.

## 3. Knopfdrucksimulation («komplette Knopfdrucksimulation»)

**`.k-druck`** — universelle Pressklasse in aura.css, Vorbild ist der
Orbit-Hauptknopf (aura.css `.k-orbit-hauptknopf`):

- `:hover` → `border-color: var(--k-accent)`-Andeutung bzw. Ton-Anhebung
  (`--k-raised`), Übergang `--k-motion-fast`.
- `:active` → `transform: scale(var(--k-druck-skala))` + Tusche-Abdunklung
  (`filter: brightness(0.96)` auf Papier, `brightness(1.08)` im ink-Theme),
  Übergang `--k-druck-dauer` — **ohne Verzögerung beim Niederdrücken**,
  das Loslassen federt mit `--k-feder` zurück.
- `:focus-visible` → bestehender Fokusring, unverändert.
- Bei `prefers-reduced-motion`: scale entfällt, nur Ton-Wechsel.

**KButton** wird von Inline-Styles auf CSS-Klassen umgestellt
(`.k-btn.k-btn-accent|quiet|ghost|danger.k-btn-sm|md` + `.k-druck`) — DOM,
Props, testids, sichtbare Texte bleiben byte-identisch; nur die Style-Quelle
wandert. Danach gilt: **jedes klickbare Element trägt `.k-druck`** — Rollout
je Stream in seinem Gebiet (Shell, Design, Vis, Panels).

## 4. Systemanimationen (Choreografie)

- **Stationswechsel** (App.tsx): `mitUebergang()` aus
  `@kosmo/ui` `motion.ts` — kapselt `document.startViewTransition` mit
  Feature-Detection; ohne Support oder bei reduced-motion wird der Callback
  direkt ausgeführt (No-op-Übergang). Wechsel-Gefühl: altes Blatt weicht sofort
  (Opacity 120ms), neues Blatt setzt mit `--k-feder` auf.
- **Eintritt gestaffelt, Austritt sofort**: Listen/Fächer/Paletten staffeln
  Kinder mit 24ms Versatz (max. 8 Kinder, Rest gleichzeitig); Schliessen
  kennt KEINE Staffelung (ein Schnitt, `--k-motion-fast`).
- **`.k-einblenden`** wird konsistent: jede Station nutzt beim Erstaufbau
  dieselbe Einblend-Klasse (Design und Vis fehlen heute — nachziehen).
- **Overlays** (KMenu/KDialog/Sheet): öffnen mit `--k-feder` (Translation
  4–8px + Opacity), schliessen mit `--k-motion-fast` Opacity. Kein Backdrop-Blur.

## 5. Gesten (Touch + Maus, ein Kern)

`modules/design/eingabe-3d.ts` ist der bestehende, reine Gesten-Kern
(KLICK_RADIUS 4px · DOPPELTAP 300ms · LONGPRESS 500ms) — er wird erweitert,
nicht dupliziert:

- **Swipe**: Richtung + Mindestgeschwindigkeit (0.5 px/ms über 40px).
- **Fling/Momentum** (PlanView-Pan): Loslass-Geschwindigkeit wird mit
  exponentieller Dämpfung (Faktor 0.95 je Frame, Stopp unter 0.02 px/ms)
  fortgeschrieben; `requestAnimationFrame`, abbrechbar durch jede neue Eingabe.
- **Doppeltap** (2D): Zoom auf Zeigerposition (Faktor 2, `--k-feder`-Gefühl
  über animierten Zoomwert); **Longpress** (2D): Kontextmenü — beides über die
  bestehenden Detektor-Konstanten.
- **Maus erbt die Touch-Physik**: Fling gilt auch für schnelles Maus-Ziehen;
  Mausrad bleibt ohne Momentum (Präzision schlägt Show).

## 6. Haptik

`state/haptik.ts`: `tick()` = `navigator.vibrate(10)` bei Werkzeugwechsel,
Fang-Einrasten, Longpress-Auslösung; `bestaetigt()` = `vibrate([12, 30, 12])`
bei abgeschlossener Aktion. Streng feature-detected, still ohne Support
(Desktop/Tauri: bewusst nichts — kein Fake).

## 7. Verbindlichkeit & Beweis

- Reduced-Motion-Vertrag gilt für JEDE neue Animation (Review-Kriterium).
- E2E läuft mit erzwungener reduced-motion (Fixture) — Bewegung darf nie
  Testflakiness erzeugen; wer eine Animation testet, testet sie explizit
  in einer eigenen Spec ohne die Fixture.
- Snappiness-Beweis im Rundgang-PDF: Druck-Zustände als Bildpaare
  (Ruhe/gedrückt), Stationswechsel als Sequenz.
