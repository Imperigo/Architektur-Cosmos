# v0.8.0B — Adversariale Kritik (Gegenprüfung zur Design-Synthese)

*Dieses Dokument ist der wörtliche Text der adversarialen Gegenprüfung vom 15.07.2026, die
zusammen mit `docs/V080B-DESIGN-SPEZ.md` (Synthese + Vollständigkeits-Matrix) die Grundlage des
v0.8.0B-Wellenplans bildet. Es wird hier unverändert übernommen (nur diese Kopfnotiz ist neu).*

## Kopfnotiz: Owner-Entscheide zu den 3 Owner-Fragen (§5)

Die Kritik schliesst mit «Genau 3 Fragen, die NUR der Owner entscheiden kann» (Abschnitt 5 unten).
Der Owner hat am 15.07.2026 zu allen dreien entschieden — die Entscheide sind in
`docs/V080B-DESIGN-SPEZ.md` §0 wörtlich als Owner-Entscheide 4, 5 und 6 festgehalten:

| Kritik-Frage (§5) | Beantwortet durch Owner-Entscheid | Ergebnis in Kurzform |
|---|---|---|
| 1. Viz-Shell-Identität — eigene dunkle «KOSMO VIZ»-Glass-Shell oder Papier/Kosmos-Themenpaar? | **Owner-Entscheid 4** | Vis bleibt im Themenpaar, übernimmt aber die Viz-**Anatomie** des 0.7.5-Handoffs (Statuszeile, HUD-Ecken, Rollen→Modus-Mapping) — keine eigene Dark-Shell, kein zweites Designsystem neben `aura.css`. |
| 2. Golden-Kontingent dieser Runde — deklarierter Sammelwechsel erlaubt oder «alle 33 byte-identisch» hart? | **Owner-Entscheid 5** | «Alle 33 Goldens byte-identisch» ist hartes Abnahmekriterium; die D1/D4-Plangrafik-Nachschärfungen aus dem 0.7.3-Paket sind damit automatisch **vertagt** («GOLDEN-CHURN: MITTEL» kommt später als eigene, separat deklarierte Runde). |
| 3. 0.7.2-Resterwartungen — Schwarm-Orbs (§11b), Schliessen-Choreografie (§8d), Viz-Viewport-Vollausbau Teil dieser Runde oder vertagt? | **Owner-Entscheid 6** | Alle drei sind **vertagt** — deklarierte spätere Runden, nicht Teil von v0.8.0B. |

Alle drei Antworten sind damit bindend in die Vollständigkeits-Matrix (`docs/V080B-DESIGN-SPEZ.md`
§9) eingeflossen: Viz-Zeilen zielen auf **W5** mit Anatomie-Übernahme statt eigener Shell,
D1/D4-Zeilen sind als **Vertagt** markiert, 0.7.2-Rest-Zeilen (Schwarm, Schliessen-Choreografie,
Viz-Viewport-Vollausbau) ebenso.

---

# v080b-Kritik (adversarialer Gegenprüfer, 15.07.2026)

> **Zielpfad laut Auftrag:** `/tmp/claude-0/-home-user-Architektur-Cosmos/73575e4c-8c15-5ba3-bb9d-fac6053abfff/scratchpad/v080b-kritik.md` — konnte nicht geschrieben werden (Session im Plan-Modus, nur diese Plan-Datei ist beschreibbar). Inhalt hier vollständig; identisch als Text an den Orchestrator zurückgegeben.

## 0 · BLOCKER: Die Synthese existiert nicht

`/tmp/…/scratchpad/v080b-design-synthese.md` **fehlt** — über ~10 Minuten gepollt (mehrere Runden à 15 s), nie erschienen. Im Scratchpad liegt nur die ALTE Runde (`v080-design.md`, `v080-kritik.md`, beide 15.07. 00:27 — das war der bereits **ausgelieferte** v0.8.0-Plankopf-Plan, ROADMAP 381). Punkt (1) ist deshalb als **hartes Prüfraster** geliefert: die Verträge, gegen die jede Synthese-Zeile zu halten ist, plus die konkreten Widerspruchs-Fallen, die aus den v080b-Originalpaketen zwingend entstehen. Punkte (2)–(5) sind synthese-unabhängig am Repo verifiziert.

## 1 · Unantastbare Verträge (Prüfraster mit Belegen) + bekannte Widerspruchs-Fallen

**Die Verträge:**

- **testids:** 953 `data-testid` in `apps/kosmo-orbit/src`, **3523** Locator-Zugriffe in `e2e/` (gemessen). Hotspots: `e2e/module.spec.ts` (155), `dock-interaktion.spec.ts` (82), `dock-layout.spec.ts` (81), `vis-oberflaeche.spec.ts` (57). Jede Umbenennung/Umhängung reisst Suites; Bestand muss byte-gleich bleiben, Neues additiv (Muster v0.8.0: `plankopf-*`).
- **E2E-Texte wörtlich:** z. B. `e2e/module.spec.ts:488` `toContainText('1:500')` am `sheet-canvas`; 37 `getByText/getByRole`-Asserts insgesamt. Versal-/Mono-Konventionen sind testrelevant — «schönere» Beschriftungen sind Vertragsbruch.
- **`window.__kosmo*`-Brücken:** `apps/kosmo-orbit/src/state/kosmo-status.ts:117–130` (`__kosmoStatus`), Muster `__kosmoBlick`/`__kosmoChat` in `shell/KosmoPanel.tsx`; **611** `__kosmo`-Treffer in `e2e/*.spec.ts`. Jede State-Neuarchitektur muss diese Hooks unverändert bedienen (Modul-Singleton, gemountet oder nicht).
- **dock-kern-Solver:** `apps/kosmo-orbit/src/state/dock-kern.ts:1–25` — dokumentierter **1:1-Verhaltens-Port** aus `Werkzeug-Dock.dc.html` Z. ~574–694; Z. 18–24: TOP/BOT bewusst KEINE Konstanten (Feld wird vermessen übergeben); Z. 33–50: bestehende Anker «byte-identisch». 67 Tests in `apps/kosmo-orbit/test/dock-kern.test.ts`. Ein Dock-Redesign darf `solve()/waterfill()/placeFloats()/separate()` nicht «vereinfachen».
- **Goldens:** 33 SVG + 1 IFC in `packages/kosmo-kernel/test/golden/`; `CLAUDE.md:74–76`: byte-identisch, Neues hinter Daten-Guards; Änderungen nur als **deklarierter Sammelwechsel** (Präzedenz `docs/GOLDEN-WECHSEL-080.md`, ROADMAP 381: svg-qa 33/0).
- **exactOptionalPropertyTypes:** `tsconfig.base.json:10`, `CLAUDE.md:72–73`. Prototyp-JS aus den `.dc.html` ist NICHT darunter geschrieben — naive Ports scheitern im Typecheck (8 Workspaces).
- **Token-Wächter:** `packages/kosmo-ui/test/token-spiegel.test.ts` parst `aura.css` (149 Custom-Properties) gegen `tokens.ts` — Token-Änderungen sind **test-erzwungen dreifach synchron** (aura.css + tokens.ts + Test).
- **«Papier ist Papier»:** `docs/GESTALTUNGSKONZEPT.md` (Owner-Entscheide 02./10.07.) — Planblatt theme-invariant weiss; Akzent färbt NUR Primär-Buttons/aktive Zustände/Auswahl/Links/Modul-Punkt, «nie Flächen, nie Text im Lauftext».

**Widerspruchs-Fallen, an denen die Synthese zu prüfen ist (Paket-Original ≠ Repo-Vertrag):**

1. **Viz-Handoff-Shell vs. aura.css:** Der 0.7.5-Viz-Handoff (`design_handoff_kosmo_viz/README.md` §3) definiert eine EIGENE dunkle Shell (`--ink-1000`-Statusbar, Glass-HUD mit `blur(20px) saturate(1.4)`, `--glow-cyan-sm`, Wortmarke «KOSMO VIZ», «GPU 41% · 24 GB») auf einem ANDEREN Token-Set (`--surface-sunken`, `--glass-fill` …) als die Papier-Palette der App. Eine Synthese, die das 1:1 «übernimmt», baut ein zweites Designsystem neben `aura.css` — Vertragsbruch gegen token-spiegel + GESTALTUNGSKONZEPT.
2. **Prototyp-Konstanten vs. Solver-Vertrag:** `Werkzeug-Dock.dc.html` rechnet mit fester 1440×900-Bühne; `dock-kern.ts` verbietet genau das (Feld wird vermessen). Jede Synthese-Aussage «Masse aus dem Prototyp übernehmen» ist an dieser Datei zu brechen.
3. **Prototyp-Hexwerte vs. Token-Entscheid:** Präzedenz v0.8.0 (`v080-design.md` §3): «agent #A8893F — Token gewinnt über Prototyp-#9A7C34». Streu-Hexwerte aus den .dc.html sind nie zu übernehmen.
4. **Phasen-Empfehlung ≠ Sperre:** harte Massstab-/Phasen-Sperren aus den Paketen brechen `module.spec.ts:488` (1:500 jederzeit wählbar) — im Produkt bewusst nur Empfehlung.
5. **Golden-Naivität:** jede Aussage «Strichstärken/Grau/Typo anpassen» (D1/D4-Nachschärfungen aus dem 0.7.3-Paket) bedeutet Golden-Churn (im Paket selbst als «GOLDEN-CHURN: MITTEL» deklariert!) und braucht das Sammelwechsel-Ritual — «nur Darstellung» gibt es im derive-Weg nicht.

## 2 · Umbauaufwand: die 10 riskantesten gemischten Logik/Darstellungs-Dateien

Gemessen (Zeilen / testids / Hooks / runCommand / Inline-Styles):

| # | Datei | Messwerte | Warum riskant |
|---|---|---|---|
| 1 | `modules/design/DesignWorkspace.tsx` | 4460 Z · 123 testids · ~90 Hooks · 39 runCommand · 139 style={{ | Werkzeuglogik, Fang, Overlays, HUD-Verdrahtung und Markup interleaved; von >20 Specs getrieben. Jeder «Darstellungs»-Eingriff verschiebt testid-Bäume. |
| 2 | `modules/data/DataWorkspace.tsx` | 3472 Z · 116 testids · 101 Hooks · **258** style={{ | Höchste Inline-Style-Dichte des Repos; die ganze kosmodata-*-Spec-Familie hängt dran. |
| 3 | `modules/design/Viewport3D.tsx` | 2471 Z · 40 Hooks | three.js-Szenenaufbau + Interaktion + Capture-Weg (D5: «Captures zwingend im offiziellen Modus») in einer Datei; kein derive-Schnitt. |
| 4 | `modules/vis/NodeCanvas.tsx` | 2258 Z · 54 testids · 80 style={{ | Graph-Layout-Logik + Kartendarstellung verwoben; `visgraph`/`vis-editor`-Specs (31/47 Locator). Erste Kandidatin für die Viz-Shell → höchstes Kollisionsrisiko. |
| 5 | `shell/KosmoPanel.tsx` | 2205 Z · 39 testids · 48 Hooks · Audio (Z. 311) | Trägt die `__kosmoChat`/`__kosmoBlick`-Testbrücken; Chat-Session-Logik + Darstellung. Panel-Redesign ohne Brückenerhalt killt die kosmo-*-Suites. |
| 6 | `modules/design/PlanView.tsx` | 1620 Z · 40 Hooks | SVG-Pointer-Interaktion, Fang, LOD live im Markup; plan-interaktion/plan-lod/element-fang-Specs. |
| 7 | `modules/publish/PublishWorkspace.tsx` | 1416 Z · 48 testids · 33 runCommand | mm-Offset-Geometrie IM UI (min()-Formel); frisch v0.8.0 umgebaut, `plankopf.spec.ts` (41 Locator) neu; bekannter 1400px-Umbruch-Bug (ROADMAP 381 «offen») verführt zu «gleich mit anfassen». |
| 8 | `App.tsx` | 1243 Z · 28 testids · 42 Hooks | Shell-Orchestrierung (Splash, OrbitStart, Dock, CursorEbene, Takeover-Wächter) — jede Shell-Neuordnung geht hier durch; quer von fast allen Specs berührt. |
| 9 | `shell/dock/DockFlaeche.tsx` | 986 Z · 34 Hooks · 0 style={{ | Täuschend «sauber»: misst den DOM und füttert den unantastbaren Solver; dock-*.spec.ts >240 Locator. Layout-Redesign hier = Solver-Vertragsrisiko. |
| 10 | `shell/Einstellungen.tsx` | 726 Z · 39 testids | Jedes neue Design-Setting (Akzent, Theme, Sounds `einstellung-sounds` Z. 460) landet hier; einstellungen.spec.ts textnah. |

Ehrenvolle Nennungen: `AssetWorkspace.tsx` (841), `VisWorkspace.tsx` (835 · 13 runCommand), `Companion.tsx` (804), `Inspector.tsx` (692 · 16 runCommand · nur 2 Hooks — der EINE saubere Kandidat).

**Kernbefund:** «Darstellung neu, Logik bleibt» existiert als Schnittlinie in diesen Dateien nicht. Realistischer Preis pro Station: Umbau + testid-Gegenprobe + stations-eigener E2E-Batch + Screenshot-Abnahme (Muster ROADMAP 355/361). Eine Synthese, die Stationen als «CSS-Durchgang» taxiert, unterschätzt um Faktor 3–5.

## 3 · Owner-Erwartungen aus den Originalpaketen, die eine Synthese leicht verliert

Stichprobe gelesen: `KosmoOrbit v0.7.2 Gestaltungskonzept.dc.html`, `Kosmodesign v0.7.3 Gestaltungspaket.dc.html`, `design_handoff_kosmo_viz/README.md` + `Kosmo Viz Viewport.dc.html`.

- **0.7.2 §11b «Schwarm»** (max. 3 Orbs parallel, Rollenfarben, Klick=Fokus): im Repo **explizit nicht gebaut** — `shell/neuigkeiten.ts:301` («Stufe 2 … vorbereitet, aber nicht gebaut»); `state/abspiel-ebene.ts:12` hält die Mehrspurigkeit nur vor. Offene Owner-Erwartung.
- **0.7.2 §8d Schliessen-Choreografie** («Fenster saugt sich zur Ecke, Orb schluckt mit Pop, Sound plopp»): `shell/KosmoCharakterFenster.tsx:29–31` dokumentiert das als «Ehrliche Grenze» — nicht gebaut (der `plopp()`-Sound existiert, `state/sounds.ts:123`, die Choreografie nicht).
- **Kosmo Viz Viewport**: «Gespeicherte Ansichten ISO/NORD/DETAIL», Autosave-Badge «AUTOSAVE · v001», Review-Modus mit Kommentar-Pins (`c.who/c.txt`), Statusbar-Telemetrie «GPU 41 % · 24 GB» — im vis-Modul **kein Treffer** für gespeicherte Ansichten/Review-Kommentare (grep über `modules/vis/`). Kuratierung/A-B-Diff existieren (`KuratierFlaeche.tsx`, `varianten-diff.ts`), der Viewport-Teil des Handoffs ist grösstenteils offen.
- **Viz-README §8** enthält einen fertigen **Welle-2-Prompt** (Report Dossier, Onboarding, Companion, Datenstationen als Soll-Bilder): die Synthese muss deklarieren, was davon Produkt-Scope wird und was Soll-Bild bleibt — sonst programmierte Erwartungslücke.
- **0.7.3 R2/D5**: «Captures zwingend im offiziellen Modus» — jede neue Screenshot-/Render-Pipeline im Redesign muss das erhalten (Viewport3D-Umbau!).
- **GPU/Telemetrie-Ehrlichkeit**: `docs/OWNER-MANDAT.md`-Linie «Ehrlichkeit vor Politur» (CLAUDE.md:100–101) — die «GPU 41 %»-Statusbar des Viz-Handoffs darf nur mit echter HomeStation-Telemetrie erscheinen, nie als Attrappe.

## 4 · Realistische Wellen-Struktur

- **W0 · Spez + Owner-Entscheide** (inkl. Golden-Kontingent und Token-Delta-Liste, bevor irgendwer Code anfasst).
- **W1 · Token-Fundament zuerst — aber eng definiert:** `aura.css` + `tokens.ts` + `token-spiegel.test.ts` synchron; `stilblatt.ts` strikt additiv (sonst sofort Sammelwechsel-Pflicht). Token-Flips wirken global → visuelle Abnahme per Screenshots je Station, KEINE derive-Beteiligung in dieser Welle.
- **W2…Wn · Station für Station**, dateidisjunkt, je Welle: eine Station + testid-Gegenprobe + stations-eigener E2E-Batch + sofortiger Push (Muster der Dock-Migration ROADMAP 353–367). Reihenfolge nach Risiko aufsteigend: publish (frisch, klein) → vis (Viz-Handoff) → data → design zuletzt (grösste Datei, meiste Specs). Dock/Shell als EIGENE Welle mit voller dock-Suite; `dock-kern.ts` bleibt tabu.
- **Big-Bang-Risiken (harte Ausschlüsse):**
  - Token-Flip + Stationsumbau im selben Commit → nicht bisektierbar, Screenshot-Abnahme wertlos.
  - stilblatt-/derive-Beteiligung «nebenbei» → reisst bis zu 33 Goldens ohne deklarierten Wechsel (CLAUDE.md:74–76).
  - «Alle Stationen in einer Welle» → E2E-Vollsuite braucht Helferserver (CLAUDE.md:36–44, sterben im Container) — nur Batch je Station ist realistisch, Release-Gate einmal am Ende.
  - Parallel-Pakete, die `state/` teilen (DesignWorkspace/Viewport3D/PlanView ↔ ui-zustand/dock-*) → nicht parallelisierbar, anders als die kernel-seitigen v0.8.0-Wellen.

## 5 · Genau 3 Fragen, die NUR der Owner entscheiden kann

1. **Viz-Shell-Identität:** Bekommt die Vis-Station die dunkle «KOSMO VIZ»-Glass-Shell des 0.7.5-Handoffs (eigene Wortmarke, `--ink-1000`-Statusbar, dark-only) — oder bleibt sie im Papier/Kosmos-Themenpaar (D7, GESTALTUNGSKONZEPT)? Beides zugleich = zweites Designsystem neben `aura.css`; ohne Entscheid ist jede Viz-Welle blockiert.
2. **Golden-Kontingent dieser Runde:** Ist ein deklarierter Sammelwechsel erlaubt (welche der 33 Goldens, mit Erwartungsliste nach 080er-Ritual) — oder ist «alle 33 byte-identisch» hartes Abnahmekriterium? (Dann sind die D1/D4-Nachschärfungen aus dem 0.7.3-Paket automatisch vertagt — das Paket selbst deklariert dort «GOLDEN-CHURN: MITTEL».)
3. **0.7.2-Resterwartungen:** Sind Schwarm-Orbs (§11b), die Schliessen-Choreografie (§8d) und der Viz-Viewport-Vollausbau (gespeicherte Ansichten, Review-Kommentare, echte GPU-Telemetrie) Teil dieser Runde oder offiziell vertagt? Alle drei sind teuer, teils Tauri-/HomeStation-gebunden und im Repo als «ehrliche Grenze» bzw. «Stufe 2, nicht gebaut» dokumentiert.
