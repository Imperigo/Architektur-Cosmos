# V0.7.2 «Visuelles Update» — Bauprotokoll (Opus-Leiter)

> Fortlaufendes Integrations- und Gate-Protokoll des Opus-Leiters. Gedächtnis-
> stütze für den Leiter, Lesegrundlage für Fable. Ehrlichkeit vor Politur:
> Grenzen werden benannt, nichts vorgetäuscht.
>
> Branch: `claude/kosmo-orbit-v1-build-pzxkbj` · Version bleibt 0.7.1 bis zum
> Finale (Bump 0.7.2 = Fable). Muster je Welle: cherry-pick + amend/reset-author,
> Gates (Kernel/App/UI-Units, typecheck, Vertragswächter-E2E 2×), Push je Batch,
> Worktree-Hygiene sofort.

## Vertragswächter (brechen NIE unbemerkt)
`e2e/oberflaeche-minimal.spec.ts` (Mehr-Menü 18, tool-*-Aria, tool-treppe/dach
TEXT) · `e2e/orbit-start.spec.ts` (4 orbit-haupt, Animationsnamen, Untertools
immer im DOM, reduced-motion→none) · `e2e/kosmo-symbol.spec.ts` (Symbol↔Panel-
DOM) · Kernel-Goldens byte-identisch.

## Umgebungs-Notizen
- Bridge :8600 (`--fake`) und Sync :8700 laufen als Dauerprozesse; bei Tod mit
  `setsid` neu starten (Container-Eigenheit).
- Haupt-Gate-Preview: :5183 (Bundle == dist prüfen; Preview separat killen —
  Exit 144 killt Ketten!). Agenten: 5174/5175.
- Vor Journeys `rm -rf /tmp/kosmo-jobs*`. `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`.

---

## Chronik

### §0 + W1-A (bereits auf origin, Stand Übernahme)
- `9ebcb76` §0: Bau-Spezifikation (`docs/V072-VISUELLES-UPDATE-SPEZ.md`) +
  Scan-Erstlauf.
- `0c54c1b` W1-A (Paket 01 + Token-Fundament): orbit-Theme, Logo 6a, Splash,
  self-hosted Fonts, App-Icons. Gates grün, Papier-Regression sauber (laut
  Übergabe).
- origin HEAD bei Übernahme = `0c54c1b`.

### Tag 1 — Fundament (Opus-Leiter übernimmt)
- **W1-B «Icon-Familie»** (Fable-Agent, Branch `worktree-agent-a032596d0324d06e6`):
  bei Übernahme noch nicht committet (Branch-HEAD = 9ebcb76). Integration =
  erste Handlung des Leiters, sobald Fable den Abschluss-Hash meldet.
- **W1-B «Icon-Familie» integriert** als `b721924` (cherry-pick `f42738b`
  vom Agent-Branch, konfliktfrei — Dateien disjunkt zu W1-A). Inhalt: NEU
  `shell/werkzeug-glyphen.tsx` (14 Glyphen, STATION_GLYPHE, GLYPHEN_PUNKT),
  orbit-icons.tsx, design/werkzeug-icons.tsx (sw 1.17 im 16er-Raster),
  EntwurfsDock (7 Icons + Rollen-Punkt; Kontrast-Eigenfix: aktiver
  Accent-Knopf setzt --k-ink lokal auf --k-accent-ink), Unit-Test, 4 Shots.
- **Gates nach Integration:** Kernel 728 · App 749 (739+10 neue) · kosmo-ui
  25 · typecheck sauber · Wächter oberflaeche-minimal/orbit-start/
  kosmo-symbol **2× grün** (14 passed je Lauf) · faehigkeiten-phasen +
  module.spec 75 grün. Der module.spec-Einzelfail des Agenten (Vis→Blatt)
  war Umgebung: die alte Bridge-Instanz :8600 kannte CORS nur für 5183;
  Bridge neu gestartet (aktueller Code, Ports 5174–5177), Fail weg.
- Umgebung: Preview :5183 neu aufgesetzt (Bundle == dist, index-DXZKTcHe);
  Worktrees agent-a032596d0324d06e6 + agent-a57fd714bc53e576a entfernt
  (Disk 54 % → 44 %).
- **Offene Befunde für Kritik-Runde 1:** (a) Rollen-Punkte hängen an
  --k-rolle-*/--k-signal aus W1-A — real in orbit UND paper prüfen;
  (b) `packages/kosmo-ui/src/icons.tsx` (KIcon-Registry, ~30 Zeichen)
  bleibt im alten 16/1.5-Stil — Frage an Fable: app-weite Icon-Norm in
  W4-H nachziehen oder ehrlich 0.7.3? (c) evtl. tote Dock-Icon-Exporte in
  werkzeug-icons.tsx (DesignWorkspace war nicht W1-B-Besitz) — prüfen,
  ggf. W4-H-Restfix.
- Befund (c) geklärt: `DesignWorkspace.tsx` Z.50–53 importiert
  IconDockDraw/Vis/Publish/Prepare ohne Verwendung (EntwurfsDock rendert
  seit W1-B selbst via STATION_GLYPHE) → toter Import, W4-H-Restfix.
- **Kritik-Runde 1:** 8 Shots (`e2e/tools/kritik-shots-072-r1.mts`, :5183,
  Bundle==dist) → `docs/rundgang/kritik-072/r1-{orbit,paper}-0{1..4}-*.png`.
  Eigenbefund vor Verdikt: Papier-Welt regressionsfrei; orbit-Zentrale/
  Design/Einstellungen stimmig; Hub-Glyphen-Punkte erben die MODUL-
  Akzentfarbe (design=orange) statt Spec-§3-Rollenfarbe (draw=mint) —
  bewusster W1-B-Entscheid («einfarbig-fähig», akzent-Prop), als
  Gestaltungsfrage an Fable eskaliert; KIcon-Registry (kosmo-ui/icons.tsx)
  noch alter 16/1.5-Stil — ebenfalls Fable-Frage (W4-H vs. 0.7.3).
- **Welle 2 dispatcht** (parallel zur Kritik-Runde): W2-C «Phasen &
  Ordnung» (Sonnet, Port 5174, Basis 0ae35b5) + W2-D «Kosmo-Zustände +
  Feedback» (Sonnet, Port 5175, Basis 0ae35b5). EntwurfsDock-Aufwertung
  (Glas/Pop/Hover, Keyframes in orbit-065.css) liegt bei W2-C;
  kosmo-feedback.css als Bibliothek bei W2-D — disjunkt.

- **Kritik-1-Verdikt (Fable) + Umsetzung:**
  1. Hub-Punkte → ROLLENFARBEN (Spec §3 verbindlich; Modul-Orange las sich
     als Generator-Familie). Direktfix orbit-icons.tsx: Punkt + Puls-Ring
     aus STATION_GLYPHE (design→manuell, data→pn, kosmo→speak→signal;
     office per Spec-Zeile «Hauptwerkzeug office» → --k-rolle-office);
     akzent bleibt Signatur-Fallback (einfarbig-fähig). Auflage an W2-C
     nachgereicht: Top-3-Border/Glow aus DERSELBEN Quelle.
  2. KIcon-Registry (kosmo-ui/icons.tsx) → ehrlich 0.7.3; in Neuigkeiten-
     ENTWURF + ROADMAP benennen; W4-H NICHT damit belasten.
  3. Dock-Punkte → lesbar machen, nicht lauter: WerkzeugGlyphe rendert in
     Klein-Kontexten (size ≤ 20) r 2.2 statt 1.7 (voll deckend, kein
     Glow/Ring; Prop `punktRadius` als expliziter Override) —
     EntwurfsDock.tsx selbst unangetastet (liegt gerade bei W2-C).
  Beweis: App-Units 749→751 (2 neue: Klein-Kontext-Radius, Hub-Rollen-
  farben), typecheck sauber, Wächter-Trio 1× grün (14 passed), r1-Shots
  neu erzeugt (Design-Punkt mint, Dock-Punkte erkennbar).

### Tag 2 — Oberfläche & Zustand
- **W2-D «Kosmo-Zustände + Feedback» integriert** als `4acec53`
  (cherry-pick `2d67ad4`, konfliktfrei). Inhalt: kosmo-status.ts mit
  9-Zustände-State-Machine (`beschaeftigt` abgeleitet; setzeBeschaeftigt(
  false) überschreibt frisches done/error/takeover bewusst NICHT — 
  ChatSession schiesst onBusy(false) nach onError nach; Auto-Decay 2 s/4 s;
  Test-Hook window.__kosmoStatus) · NEU KosmoOrb.tsx (alle 9 §6-
  Darstellungen inkl. Takeover-Fensterrahmen) · NEU kosmo-feedback.css
  (§5-Bibliothek, je Klasse eigene reduced-motion-Regel) · NEU sounds.ts
  (Default AUS) · KosmoSymbol nur Innenleben · KosmoPanel Verdrahtung +
  onAbspielStart?-No-op für W3-E.
- **Gates nach Integration:** App 770 (768 Stream + 2 Kritik-1-Fixe) ·
  Kernel 728 · kosmo-ui 25 · typecheck sauber · Wächter-Trio +
  kosmo-zustaende **2× grün** (23 passed je Lauf) · Build + Preview :5183
  Bundle==dist. Worktree agent-a638a4f4a4900d62e entfernt.
- **Ehrliche Grenzen W2-D (für Kritik-2/W4-H):** chip-serie/punkt-burst/
  orbit-loader sind Bibliotheks-Klassen OHNE Verdrahtung (bewusst W4-H) ·
  Sounds ohne echten Browser-Audio-Smoke · dispatching hängt an
  applyCard/applyPaket, nicht an auftrag_erfassen (dokumentierte
  Interpretation).
- W2-C «Phasen & Ordnung» läuft noch (Worktree bei Basis 0ae35b5;
  Kritik-1-Auflage «Top-3-Rollenfarben aus STATION_GLYPHE» nachgereicht).

- **Leiter-Direktfix `82aed3d`:** W2-Ds `onAbspielStart` war fire-and-
  forget (Vorspiel wäre PARALLEL zum Apply gelaufen) und App.tsx mountet
  das Panel ohne Prop → Prop await-fähig + NEU `state/abspiel-anschluss.ts`
  (registrierbarer Anschluss; W3-E meldet sich dort an, ohne KosmoPanel/
  App.tsx anzufassen). Vorspiel verzögert den Apply nur, verhindert nie.
- **W2-C «Phasen & Ordnung» integriert** als `6a0df3c` (cherry-pick
  `573eef1`, konfliktfrei). PhasenLeiste (Header), orbit-rang.ts (BASE,
  sia112Gruppe, Hysterese + Anti-Nerv), kosmo-ui/flip.ts, OrbitStart-Hub
  (Top-3 64 px Rollenfarben-Border/Glow aus STATION_GLYPHE — Kritik-1-
  Auflage erfüllt), EntwurfsDock Glas/Pop/Hover (nur orbit-Theme), Kernel
  +'strategie' (doc.ts, commands/design.ts zod, Preset). Deklarierte
  Ripples verifiziert: poche.test/phasen-presets.test (Record<SiaPhase>),
  kosmo-ui/index.ts (flip-Export), design.ts (zod-Enum — im Commit
  deklariert). App.tsx trägt den Anker `{/* v072: cursor-ebene */}`.
- **Gates W2-C:** Kernel 728 (Goldens byte-identisch) · App 797 · UI 31 ·
  typecheck · Wächter+kosmo-zustaende+faehigkeiten-phasen+phasen-leiste
  **2× grün** (34 je Lauf) · **Journeys EFH/MFH grün** (Wellen-Gate).
  Worktree agent-ad125be entfernt.
- **W2-C-Vormerkungen für Kritik 2:** (a) Rang-Tiers sichtbar nur im
  Design-Fächer (andere Fächer zu wenige Slots); (b) strategie-Preset nur
  ['volumenstudien'] (Notlösung); (c) Dock-Pop/Hover ohne eigenen E2E —
  Shots zeigen es; (d) Hover-Sog endet an der Hairline.

### Tag 3 — Bühne & System
- **W3-F «Cursor & Desktop-Charakter» dispatcht** (Sonnet, Port 5177,
  Basis 6a0df3c) — cargo check als Gate (Toolchain vorhanden), Zonen-
  Attribute in fremden Dateien bewusst W4-H, webdriver-Schutz für den
  Cursor-Layer vorgeschrieben.
- **W3-E «Kosmo zeichnet sichtbar» integriert** als `e0c816f` (cherry-pick
  `f385b45`, Fable-Stream, konfliktfrei; DesignWorkspace-Diff = 1 Import +
  1 Mount-Zeile). Abspiel-Ebene mehrspurig (Stufe 1 = 1 Orb), Abbruch-
  Pfade webdriver/reduced-motion/kosmo.abspielen, Sicherheits-Wache
  (8 s + 5 s/Schritt, Deckel 45 s — Apply hängt nie), Overlay mit
  getScreenCTM-Welt-Abbildung, Orb + Schweif + Etikett-Chip, ESC/Leertaste.
- **Gates W3-E:** App 819 (+22) · Kernel 728 · typecheck · Build ·
  kosmo-zeichnet+Wächter-Trio+journey-efh **2× grün** (19/18). Worktree
  agent-a8e0eb8 entfernt.
- **Ehrliche Grenzen W3-E:** Geometrie nur für a/b-Achsen-, outline- und
  at-Commands; sonst Vorschau-Umkreisung bzw. Orb-Puls (nie vorgetäuscht) ·
  3D-only-Modus zentriert eingepasst (nicht plandeckungsgleich) ·
  Pan/Zoom während Abspiel verschiebt die Abbildung nicht mit · Pause in
  Snap-Pause läuft als Timer weiter (Wache gilt absolut).
- **Suiteweiter Befund (W3-E):** `playwright.config.ts` Z.30
  `reducedMotion:'reduce'` kommt in dieser Umgebung NICHT im Browser an
  (matchMedia false in frischen Kontexten); nur explizites
  `page.emulateMedia()` wirkt. Bestands-Specs emulieren selbst — aber die
  Config-Absicht ist derzeit wirkungslos. → Kritik-2-Punkt/Finale.
- **Kritik-Runde 2:** Shots via `e2e/tools/kritik-shots-072-r2.mts`
  (:5183, Bundle==dist): 9 Zustände (Symbol 4× Pixeldichte, takeover
  Vollbild), Phasen-Leiste default/Segment 4, Hub-Fächer Phase 2 vs. 4
  (BASE-Umsortierung sichtbar: Draw→Publish an der Spitze), Dock
  Glas/Hover orbit+paper. Eigenbefunde: Header wird in der Design-Station
  eng (SYNC AUS/KOSMO ÖFFNEN brechen zweizeilig um) · takeover-Chip
  überlappt die Statusleiste unten Mitte.

- **Kritik-2-Verdikt (Fable) + Umsetzung:**
  1. Rang nur im Design-Fächer → REICHT für 0.7.2; hub-weit = 0.7.3
     («Dock/Hub-Ausbau»). Auflage: ehrlich in Neuigkeiten-ENTWURF + ROADMAP.
  2. strategie-Preset → Direktfix: ['volumenstudien','kv'] (SIA Ph. 1 =
     Machbarkeit + Kostenrahmen); faehigkeiten-phasen.spec bewusst
     angepasst (kv opacity 1, sonne neu als 0.6-Anker).
  3. Header-Enge → Auflage an W4-H: SYNC/KOSMO nie umbrechen (nowrap);
     unter ~1500 px kollabiert die Phasen-Leiste auf Nummern-Pills 1–5
     (Label als title).
  4. takeover-Chip → Direktfix: bottom 52 px (über der Statusleiste,
     Modus/Status lesbar; kosmo-feedback.css).
  5. Dock-Pop/Hover ohne eigenen E2E → AKZEPTIERT (bewusste Testlücke:
     Animations-E2E flake-anfällig; Shots + laufende Specs genügen).
  reducedMotion-Config → Finale-Prüfpunkt + SIM-BEFUNDE-Notiz.
  Beweis: Preset-Units 11 grün, Wächter+faehigkeiten-phasen+kosmo-
  zustaende 1× grün (28 passed), takeover-Shot neu (Statusleiste frei).

- **W4-G «Companion minimal» integriert** als `7c81b99` (cherry-pick
  `785450d`, konfliktfrei). #companion-Weiche, SVG-Phasenring aus
  sia112Gruppe, Job-/Freigabe-Karten (companion-daten.ts pure, 9 Units),
  4er-Glyphen-Dock. Gates: App 828 · Kernel 728 · Wächter+companion+splash
  2× grün (20 je Lauf). Ehrliche Grenzen: Vis-Freigabe-Karten
  sitzungsgebunden (frischer Tab sieht fremde Renders nicht — ehrlicher
  Leerzustand; Neuigkeiten-Punkt) · Dock-Link = Hash weg + reload (Start
  an der Zentrale) · QR-Pairing mit Zweitgerät nur im Owner-Rundgang.
- **W3-F «Cursor & Desktop-Charakter» integriert** als `c1ed9d4`
  (cherry-pick `74ff278`; EIN gelöster Konflikt in main.tsx — beide
  Weichen kombiniert, Vorrang ?fenster=charakter > #companion > App).
  CursorEbene (3 Schachteln, webdriver-Default-AUS + Test-Hook
  __kosmoCursor), cursor-zustand.ts, KosmoCharakterFenster (nutzt KosmoOrb
  wieder), kosmo-zustand-bruecke.ts (subscribe von aussen), Tauri:
  Zweitfenster kosmo-charakter + Tray + capabilities/charakter.json.
  **cargo check grün** (0 Warnungen, auch auf dem Merge-Stand). Gates:
  App 847 · Kernel 728 · 32 E2E 2× grün (inkl. cursor-ebene, companion,
  kosmo-zeichnet). Ehrliche Grenzen W3-F: Zonen-Attribute noch nirgends
  gesetzt (Heuristik über computed cursor; W4-H verdrahtet) ·
  pointer:coarse nicht per Playwright emulierbar (Vitest-Beweis statt
  E2E, test.skip dokumentiert) · Schliessen-Choreografie des
  Charakter-Fensters NICHT verdrahtet (bräuchte Rust-Vorlauf-Event —
  ehrlich vertagt).

<!-- Weitere Einträge folgen je Welle -->
