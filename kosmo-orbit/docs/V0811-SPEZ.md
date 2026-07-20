# V0811-SPEZ — «Inselgleich»

> **Status: verbindlich.** Diese Spez ist Owner-Sache (Muster `V083-SPEZ.md`,
> Schlusszeile): kein stiller Re-Interpretationsspielraum im Bau — jeder
> Widerspruch geht zurück an Fable/Owner. Owner-Entscheide vom 20.07.2026
> (AskUserQuestion-Runde nach dem Ultraplan, §1).
>
> Basis: v0.8.10 «Inselrein» released (ROADMAP 551, 🚀-Commit 0dff918). Alle
> Datei:Zeile-Belege gegen HEAD 0dff918 geprüft (§10).

## §1 Owner-Entscheide (20.07.2026)

- **E-Name:** Die Version heisst **«Inselgleich»** — die Inseln ziehen mit
  dem Manuell-Chrome gleich.
- **E-Vis:** Insel-Äquivalente für **Gespeicherte Ansichten + vis-Legende**
  (Owner-Wahl «Ansichten + Legende»; VisOnboarding und Vis-Dock-Panels
  bleiben Manuell-Konzepte und fallen 0.9.0 mit dem Codepfad).
- **E-Tour:** Die geführte Design-Tour (dock-tour) wird **ehrlich als
  bewusst Manuell-only dokumentiert** (dieser §, Nicht-Ziele) — eine
  Island-Tour ist ein 0.9.0-Kandidat, kein 0.8.11-Bau.
- **E-Kapazität:** Bei Zeitreserve am Ende von Tag B: **Treppen-z-Griff**
  (Geschosshöhen-Editing, Viewport3D). Fällt bei Zeitmangel ersatzlos.

## §2 Pakete

### E1 · P-A1 «Publish-Insel-Parität» (Sonnet, Tag A)

Die BLATT-Insel (`apps/kosmo-orbit/src/modules/publish/island/inhalte/
blatt.tsx:69-95`) kann Blätter wählen und anlegen, aber weder umbenennen
noch entfernen — beides existiert nur im Manuell-Chrome
(`PublishWorkspace.tsx:824-856` Klick-zu-Edit aus ROADMAP 547 bzw.
`:857-868` Entfernen-Knopf).

1. **Umbenennen** in der BLATT-Insel: Klick-zu-Edit nach dem 547-Muster
   (KInput autoFocus/Vorselektion, Enter/Blur committet via
   `design.eigenschaftSetzen` `feld:'name'`, Escape bricht per Ref-Guard
   ab), testid `blattisl-name-<i>`. Der Kernel-Weg existiert seit 547 —
   **KEINE Kernel-Änderung**; findet das Paket doch eine Lücke: Stopp +
   Fable-Meldung.
2. **Entfernen** in der BLATT-Insel: `publish.blattEntfernen`, testid
   `blattisl-entfernen-<i>`, mit demselben Bestätigungs-Muster wie das
   Manuell-Chrome (falls dort eines existiert — sonst direkt, wie dort).
3. NEUE E2E-Spec (island-only, OHNE Manuell-Seed für publish? NEIN —
   publish behält den globalen Manuell-Seed; die Spec setzt per
   `test.use` einen Island-publish-Seed lokal, Muster
   `blender-bridge.spec.ts:49`): Umbenennen + Verzeichnis-Nachweis
   (Blattverzeichnis zeigt neuen Namen), Entfernen, Escape-Abbruch.

**Dateikreis:** `publish/island/inhalte/blatt.tsx` + NEUE E2E-Spec.
**TABU:** PublishWorkspace.tsx, Inspector.tsx, commands/design.ts,
commands/publish.ts.

### E2 · P-A2 «Line-Art als Node-Parameter» (Sonnet, Tag A) — Z4-Schuld

Ein-Quellen-Entscheid (V0810-SPEZ:151-155): Die Line-Art-Entscheidung lebt
heute als flüchtiger Insel-useState (`vis/island/inhalte/austausch.tsx:32`,
KSwitch `:44-49`) und fliesst transient via `sendeGraphRenderAuftrag` →
`vis-jobs.ts:155-177` (`style.mode:'lineart'`, erzwingt `vis.skip:true`).
Nicht persistent, nicht undo-bar, geht beim Remount verloren.

1. `node.params.lineart` als persistenter Parameter des Render-Nodes,
   gesetzt über den BESTEHENDEN Command `vis.nodeParametrieren`
   (Anwendungs-Muster: `derive/render-presets.ts:7-8`). **Beleg-geprüft:
   das Param-Schema ist ein offenes Record (`commands/vis.ts:78-82`,
   `z.record(z.string(), ParamWert)`) — `lineart` ist heute schon
   zulässig, es braucht DEFINITIV keine Kernel-Schema-Änderung.
2. `vis-jobs.ts` liest den Node-Param statt des Funktionsarguments; der
   transiente Pfad fällt.
3. Anzeige/Edit im Render-Node-Körper (`NodeCanvas.tsx`) nach dem Muster
   der bestehenden Param-Felder.
4. Der Insel-KSwitch in `austausch.tsx` schreibt/liest den Node — der
   lokale useState `:32` fällt ersatzlos.
5. Beweise: Unit (Param-Fluss), E2E (Setzen → Reload → Wert steht; Undo
   hebt auf), grep-Beweis «kein lineart-useState».

**Dateikreis:** `vis/island/inhalte/austausch.tsx`, `vis/vis-jobs.ts`,
`vis/NodeCanvas.tsx`, Kernel-visgraph-Dateien NUR falls der Param
durchfliessen muss, + Tests/Spec.
**TABU:** VisWorkspace.tsx, vis-island-katalog.ts,
island/inhalte/registry.ts, alle übrigen inhalte/*.

### E3 · P-A3 «Plan-Griffe Runde 2» (FABLE — Cluster B, Tag A)

slab hat als einziges outline-Element keine Ecken-Griffe (zone/mass/roof
haben sie: `PlanView.tsx` griffe-Builder, `griffFaehig`
`DesignWorkspace.tsx`), beam hat keine a/b-Griffe (wall/stair haben sie).

1. slab-Outline-Ecken-Griffe (Muster zone), inkl. holes-Erhalt beim
   Ecken-Zug.
2. beam-a/b-Griffe (Muster wall).
3. boundary-Ecken NUR bei Restzeit.
4. Tests: Unit (griffFaehig/griffe-Builder), E2E-Griffzug je Kind.

**Dateikreis:** PlanView.tsx, DesignWorkspace.tsx, plan-hit-test.ts +
Tests/Spec. Goldens: 0 (reine Interaktions-Ebene).

### E4 · P-B1 «Vis-Insel-Äquivalente: Ansichten + Legende» (Sonnet, Tag B, NACH P-A2-Gate)

Owner-Wahl E-Vis. Schaltet die 0.9.0-Löschung des toten Manuell-Codepfads
frei (~600 Zeilen VisWorkspace :459-603/VisTabs/EinfachAnsicht, Inventar in
der 0.8.10-Planung).

1. NEUE Insel-Inhalte: `vis/island/inhalte/ansichten.tsx`
   (GespeicherteAnsichten-LOGIK als Import wiederverwenden, NICHT
   kopieren) und Legende als NEUE Datei (kein Anbau an graph.tsx/
   austausch.tsx — sonst Fable-Stopp).
2. Katalog-Einträge (`vis-island-katalog.ts`) + `registry.ts`.
3. E2E: beide Features island-only bedienbar; Manuell-Weg unverändert
   grün; `git diff` beweist die Manuell-Zweige byte-still.

**Dateikreis:** vis-island-katalog.ts, registry.ts, NEUE inhalte-Dateien,
+ Tests/Spec.
**TABU:** NodeCanvas.tsx, vis-jobs.ts, austausch.tsx, VisWorkspace-
Manuell-Zweige (lesen ja, ändern NEIN — KEIN Rückbau in 0.8.11).

### E5 · P-B3 «Schloss-Symbol im Plan-SVG» (FABLE, Tag B) — der EINE Golden-Zug

V089-Nicht-Ziel wird eingelöst: gesperrte Elemente (`meta.locked`, 0.8.9
E2) sind im Plan-SVG unsichtbar gesperrt.

1. derive-Plan-Zweig zeichnet ein kleines Schloss-Symbol am Element NUR
   wenn `meta.locked === true` (Daten-Guard — ohne locked-Daten bleibt
   jedes Bestands-SVG byte-identisch).
2. **Golden-Politik (strengste Form):** 0 bewegte Bestands-Goldens,
   **+1 NEUER Golden** (`plan-schloss.svg`, locked-Fixture):
   39→40 Golden-Dateien, svg-qa 38→39/0, aggregierte sha256 der 38
   Bestands-SVG vor/nach identisch.

**Dateikreis:** derive-Plan-Datei(en) + neuer Golden + Test + svg-qa-Liste.
Fable-solo.

### E6 · P-B2 «Flake-Härtung» (Sonnet, Tag B)

dock-tour «7 Schritte» (V-NAECHSTE-KANDIDATEN:104-106, Worktree-bewiesen
vorbestehend) + dock-interaktion «Tab (c)» (:53-56).

1. **Vorbestehend-Beweis VOR dem Fix** (Repro auf Basis-HEAD dokumentiert
   im Bericht) — ohne ihn ist das Paket ungültig (ein «Fix» ohne Beweis
   maskiert sonst eine 0.8.11-Regression).
2. Fix nach der bewährten Härtungsklasse (Poll-expects, ehrliche
   Wartebedingungen) — KEINE Assertion-Abschwächung.
3. Beweis: 5× solo + 1× Suite grün.

**Dateikreis:** NUR die zwei Spec-Dateien (+ ggf. Warte-Helfer).

### E7 · Z-Kapazität «Treppen-z-Griff» (Fable — NUR bei Zeitreserve)

Geschosshöhen-Editing am 3D-Treppen-Griff (Viewport3D, stairHandleGroup).
Ausserhalb aller 0.8.11-Dateikreise; fällt bei Zeitmangel ersatzlos auf
die 0.9.0-Kandidatenliste.

## §3 Nicht-Ziele (mit Begründung)

- **>2-Wand-Knoten im Schnitt** — wäre ein zweiter Golden-Zug (verletzt
  die Ein-Zug-Regel) → 0.9.0.
- **Eval-Breitenausbau (~85 Commands) / Coverage-Report** — L, eigener
  Strom.
- **Alles GPU-/Geräte-gebundene** — echter bpy-Worker, ComfyUI,
  LoRA-Training, Dev-Worker-Live-Lauf, iPad-Drehbuch (Owner-Termin).
- **Serie H/I/J, prepare-Wettbewerbsdossier/OneDrive, Data-Islands** —
  bewusst nicht im Insel-Dualismus bzw. eigene Grossaufträge.
- **Kein weiterer Manuell-Rückbau** (design/publish/prepare) — der
  Owner-Auftrag war NUR KosmoVis (V0810-SPEZ:158-159). 0.8.11 baut
  Insel-PARITÄT, keinen Rückbau.
- **Dock-Tour bleibt bewusst Manuell-only** (Owner-Entscheid E-Tour) —
  sie bindet ans Dock-System, das im Island-Modus nicht existiert;
  Island-Tour = 0.9.0-Kandidat.
- **Vis-Manuell-Codepfad-Löschung** — bleibt 0.9.0 (E4 schaltet sie frei).
- **Figma-Weave als KosmoVis-Vorlage** (Owner-Notiz 20.07., wörtlich: «für
  KosmoVis gilt vorlage/referenz/reverse engineering von figma weave») —
  in 0.8.11 NICHT behandelt; fester 0.9.0-Posten: Recherche/Reverse-
  Engineering der Weave-Bedienmuster (Node-Editor-UX) als Referenz für
  den KosmoVis-Ausbau, VOR der Line-Art-Node-UI-Weiterarbeit einplanen.

## §4 Sanktionen

1. Bewegter Bestands-Golden irgendwo = Paket ungültig (E5 fügt NUR +1 neu).
2. P-A1 fasst PublishWorkspace/Inspector/design.ts/publish.ts an =
   Scope-Bruch.
3. P-A2 fasst VisWorkspace/Katalog/registry an = Scope-Bruch.
4. P-B1 ändert NodeCanvas/vis-jobs/austausch oder die Manuell-Zweige =
   ungültig.
5. Flake-Fix ohne dokumentierten Vorbestehend-Beweis oder mit
   Assertion-Abschwächung = ungültig.
6. Cluster-B-Commit (PlanView/DesignWorkspace/plan-hit-test) von einem
   Sonnet-Agenten = Mandats-Bruch.
7. PDF/Installer-Zustellung = Ritualverstoss; Build-Request nicht
   gepusht = Matrix rot.
8. Kernel-Golden-Probelauf fehlt in einem Sonnet-Gate = Gate unvollständig.

## §5 Vollständigkeits-Matrix

| C | Entscheid | Paket | Abnahme (messbar) |
|---|---|---|---|
| C-1 | Blatt umbenennen island-only | P-A1 | E2E: blattisl-name-Edit + Blattverzeichnis zeigt neuen Namen |
| C-2 | Blatt entfernen island-only | P-A1 | E2E: blattisl-entfernen, Blatt weg, Undo bringt es zurück |
| C-3 | lineart als Node-Param | P-A2 | Kernel/E2E: Setzen→Reload persistiert, Undo hebt auf; grep: kein lineart-useState |
| C-4 | transienter lineart-Pfad weg | P-A2 | Diff-Nachweis vis-jobs.ts liest node.params |
| C-5 | slab+beam griff-ziehbar | P-A3 | E2E-Griffzug je Kind; nur Fable-Commits in Cluster B |
| C-6 | Ansichten+Legende island-only | P-B1 | E2E beide Inseln; git diff: Manuell-Zweige byte-still |
| C-7 | Flake-Fixe beweisgestützt | P-B2 | Vorbestehend-Repro VOR Fix dokumentiert; 5× solo + Suite grün |
| C-8 | Schloss-Golden | E5 | +1 neuer Golden, 38 Bestands-sha identisch, svg-qa 39/0 |
| C-9 | GOLDEN-WECHSEL-0811 | Fable | Teil 1 vor Landungen committet; Teil 2 Ist==Prognose |
| C-10 | Verschlanktes Release | Fable | kein PDF/Zustellung; Build-Request gepusht; lehren/v0.8.11.md; Sechs-Träger-Bump; release-gate Exit 0 |

## §6 Betriebsregeln

- Worktree je Sonnet-Paket (`git worktree add … HEAD` + npm install),
  eigener KOSMO_E2E_PORT (P-A1: 5174, P-A2: 5176, P-B1: 5177, P-B2: 5179),
  Fable :5183. Bridge :8600/Sync :8700 geteilt.
- Copy-back per cp mit Zielpfaden ab Repo-Root (`kosmo-orbit/…`) — benannte
  Falle. cmp vor rm bei Doppelbeständen.
- Playwright im Vordergrund bzw. aktives Pollen — NIE auf Notifications
  warten.
- Sequenz-Regel: P-B1 startet erst nach dem P-A2-Gate (geteilte
  vis-Nachbarschaft; zusätzlich disjunkte Kreise + registry.ts fest bei
  P-B1).
- Jedes Sonnet-Gate enthält einen frühen `GOLDEN_UPDATE=1`-Probelauf mit
  Prognose 0 bewegt / 0 neu.

## §7 GOLDEN-WECHSEL-0811 (separat als docs/GOLDEN-WECHSEL-0811.md, Teil 1 vor allen Landungen)

Prognose: **0 bewegte Bestands-Goldens, +1 neuer** (`plan-schloss.svg`,
nur E5). Referenzbasis nach v0.8.10 (beleg-geprüft): **39 Dateien**
(38 SVG + 1 IFC), svg-qa zählt dynamisch (`pruefe-goldens.mts:356-361`)
→ Ziel nach E5: 40 Dateien, svg-qa 39/0, aggregierte sha256 der 38
Bestands-SVG vor/nach identisch. Teil 2 am Tag C: Ist == Prognose, jede
Abweichung = Hard-Stop mit Fable-Klassifikation.

## §8 Belege (Auswahl, geprüft am 0dff918)

Alle am 20.07. gegen HEAD `7fbf849` verifiziert (Explorer-Protokoll):
1. `blatt.tsx:69-95` — Insel wählt (`island-blatt-eintrag-*` :74) und
   legt an (`island-blatt-format` :85, `island-blatt-anlegen` :93),
   kein Umbenennen/Entfernen im Block. STIMMT.
2. `PublishWorkspace.tsx:824-856` Klick-zu-Edit (`sheet-name-*` :829/
   :847) · `:857-868` Entfernen (`blatt-entfernen-*` :859,
   `publish.blattEntfernen` :862). STIMMT.
3. `austausch.tsx:32` `const [lineArt, setLineArt] = useState(false);` ·
   `:44-49` KSwitch `island-render-lineart`. STIMMT.
4. `vis-jobs.ts:155-177` — `mode?: 'none'|'lineart'` :155, transientes
   `style.mode` :173, `vis.skip: lineArt || …` :177. STIMMT.
5. `render-presets.ts:7-8` — «Angewandt wird ein Preset über den
   bestehenden vis.nodeParametrieren-Weg … kein neuer Command nötig».
   STIMMT.
6. `PlanView.tsx:636-688` griffe-Builder (wall :644-645, masskette :649,
   zone/mass/roof :651-652, opening :660-668, stair :675-685) ·
   `DesignWorkspace.tsx:1212-1225` griffFaehig — **slab und beam fehlen
   in beiden Zweigen**. STIMMT. (Nach 0.8.10-Release-Bumps Zeilen ggf.
   ±, vor P-A3-Start nachschlagen.)
7. `V-NAECHSTE-KANDIDATEN.md:53-56` (dock-interaktion Tab (c)) ·
   `:104-106` (dock-tour 7 Schritte, Worktree-bewiesen vorbestehend).
   STIMMT.
8. `V0810-SPEZ.md:151-161` — Z4-Verschub inkl. Ein-Quellen-Begründung
   :151-155, Codepfad-Löschung 0.9.0 :156-157, kein weiterer
   Manuell-Rückbau :158-159. STIMMT.
9. `commands/vis.ts:78-82` — `params: z.record(z.string(), ParamWert)`
   mit `ParamWert = z.union([z.string(), z.number(), z.boolean()])`
   (:14): offenes Record, keine Whitelist → `lineart` heute zulässig.
10. Golden-Basis: 39 Dateien (38 SVG + 1 IFC), svg-qa dynamisch
    (`pruefe-goldens.mts:356-361`).
