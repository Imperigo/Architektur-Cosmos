# V086-SPEZ — v0.8.6 «Verlässlich» (eingefroren 19.07.2026)

> Owner-Auftrag 19.07.: Ultraplan A/B/C über drei Tage, EIN Release am Ende
> von Tag C (AskUserQuestion-Entscheide: Raumtyp-Toggle JA · Standort-Kette
> JA · ein Release). Adversarial gegengeprüfter Schnitt (Plan-Agent-Bericht,
> Fundstellen in §2). Arbeitsmodell: Fable = Spez/Urteil/Gates/Commits,
> Sonnet = Ausführung in disjunkten Dateikreisen; Dispatch-Disziplin aus
> `wissen/training/claude/lehren/v0.8.4.md` + `v0.8.5.md`.

## 1 · Auftrag

Drei Tagespläne EINER Version:
- **Tag 1 / Plan A «Substanz & Schulden»** — die ehrlichen Lücken aus
  v0.8.5 an der Wurzel schliessen (Wand-Griff verliert Öffnungen,
  `zonenArt:'nachbar'`, Raumtyp-Toggle, §0-Wächter, Eval-Format).
- **Tag 2 / Plan B «Kosmo führt»** — der Autopilot bekommt seinen
  Dialog-Einstieg + die Lauf-Bibliothek; 3D-Shift-Klick; Öffnungs-Griffe.
- **Tag 3 / Plan C «Standort & Release»** — Standort-Persistenz ins Doc,
  Matrix-Abnahme, Release-Ritual, Installer.

## 2 · Diagnosen (verifiziert 19.07.2026)

- **D1 Wand-Griff-Drag verliert Substanz:** `onGriffEnd` läuft als
  `wandZeichnen`+`loeschen` (DesignWorkspace.tsx:1252-1266);
  `design.loeschen` kaskadiert Öffnungen weg (commands/design.ts:523-525).
  Re-Setzen per `design.oeffnungSetzen` wäre NICHT verlustfrei — das
  Schema kennt `fensterTyp`/`teilung`/`fluegelTyp`/`anschlag`/
  `absturzsicherung`/`beschlaege`/`typeId` nicht und `leibung` gar nicht
  (model/entities.ts:167-243, design.ts:246-254). Auch Wand-`height` geht
  heute verloren (`wandZeichnen` kennt kein height, design.ts:125-131).
  Kernel-Präzedenz für verlustfreies Öffnungs-Handling: `wandKopieren`
  kopiert Openings als vollen Spread (design.ts:1340).
- **D2 zonenArt:** `design.zoneErstellen` kennt nur `'parzelle'`
  (design.ts:556) — Nachbar-Zonen verlieren beim Eck-Zug den Marker
  (ROADMAP 482, bewusst dokumentiert in DesignWorkspace.tsx:1286-1291).
- **D3 Raumtyp-Füllungen unadressierbar:** die `raumtyp-*`-Klassen aus
  plan.ts:744 landen NICHT im SVG; Füllungen entstehen über Poché-Tint
  (derive/poche.ts:105-116, plansvg.ts:200-215). `planInnerSvg` hat
  bereits einen `opts`-Parameter (plansvg.ts:116-121, `opts.thema`) —
  ein zusätzliches Opt-in-Feld ist der etablierte Guard-Weg.
- **D4 Autopilot ohne UI-Einstieg:** Start heute NUR über den
  `__kosmoLauf`-Testhook (lauf-runtime.ts:16-18, ROADMAP 477). Fundament
  für den Dialog-Weg existiert doppelt: Aktionskette/Diff-Karten
  (kosmo-ai/src/chat.ts:35-36, 340-360; `applyPaket` KosmoPanel.tsx:1554)
  und Nicht-Command-Tool-Präzedenz `modell_lesen` (tools.ts:145).
  @ref-Platzhalter-Auflösung lebt bewusst nur im Prüfcode
  (pruefe-laufplaene.mts:69-90) — App-Übernahme ist eine Vertragsänderung.
- **D5 3D-Auswahl-Vertrag halb verdrahtet:** Viewport3D deklariert
  `onPick(id, opts?)`/`onMarqueeAuswahl` seit PA1 (Viewport3D.tsx:184,
  188), ruft aber `onPick` ohne opts und feuert nie Marquee (1740-1747).
  Plain THREE.Raycaster, kein three-mesh-bvh.
- **D6 Öffnungs-`center` unvalidiert bei eigenschaftSetzen:**
  `design.eigenschaftSetzen('center')` prüft NICHT gegen die Wandlänge
  (design.ts:676-682) — `oeffnungSetzen` prüft wohl (259-264).
- **D7 Standort nur Session-State:** `parzellenZentrum` lebt im
  React-State (DesignWorkspace.tsx:4742-4746) — Reload verliert den
  Projektstandort; StandortSuche (4735-4850), `design.nachbarnUebernehmen`
  (design.ts:2303) und CSP-Freigabe api3.geo.admin.ch
  (tauri.conf.json:39) existieren; E2E-Fixture-Muster:
  e2e/nachbarn-import.spec.ts:36-60.
- **D8 §0-Wächter prüft nur die aktuelle Version** (ai-scan-delta.mjs) —
  die Auswertungs-Lücke 0.7.4–0.8.4 blieb dadurch unbemerkt
  (lehren/v0.8.5.md §4).
- **D9 Eval kennt nur Ein-Zug-Erwartungen:** pruefe-eval.mts hat kein
  LaufPlan-Erwartungsformat (ROADMAP 481, ehrliche Lücke).

## 3 · Entscheide (eingefroren)

- **E1 `design.wandGeometrieSetzen` (Kernel, neu):**
  `{ entityId, a?, b? }` patcht die Wand IN PLACE — Identität, `height`,
  Umbau-/Phasen-Status, `assemblyId`, `alignment` und ALLE gehosteten
  Öffnungen bleiben. Öffnungs-Regel bei kürzerer Wand, in dieser
  Reihenfolge: (1) passt `center±width/2` noch → unverändert;
  (2) passt die Öffnung nach CLAMP von `center` (Breite unverändert,
  bündig an die nähere Wandkante) → clampen; (3) ist die Öffnung breiter
  als die neue Wand → Öffnung im selben Command mit entfernen, und der
  Command meldet das im `summarize`-Text («… 1 Öffnung entfernt») — die
  App zeigt es via bestehender Meldung. Alles EIN Command = EIN
  Undo-Schritt. Null-Länge (a≈b) wirft VOR jedem Patch. Der Griff-Zweig
  in `onGriffEnd` stellt auf dieses Command um (kein Löschen+Neusetzen
  mehr für Wände; Masskette/Zone/Volumen/Dach behalten das
  Erst-erstellen-dann-löschen aus 484).
- **E2 `zonenArt`-Erweiterung:** `zoneErstellen.zonenArt` wird
  `'parzelle' | 'nachbar'`; der Zonen-Griff-Zweig reicht den Ist-Wert
  durch (der Sonderfall-Kommentar DesignWorkspace.tsx:1286-1291 fällt).
- **E3 Raumtyp-Sichtbarkeit als Opt-in:** `planInnerSvg`-`opts` bekommt
  `datenAttribute?: boolean` (Default **aus** → alle Goldens byte-still,
  sha256-Beweis Pflicht). Bei `true` tragen Raumtyp-Füllungen
  `data-raumtyp="<typ>"`; `derive/sheet.ts` reicht das Flag durch, NUR
  der Publish-Blatt-Renderpfad aktiviert es. `publish.css` blendet über
  die bestehende `data-zonen`-Mechanik zusätzlich `[data-raumtyp]` aus;
  ein dritter KSwitch «Raumtypen» (getrennt von «Zonen» =
  Parzellen-Kontext) kommt in die Sichtbarkeits-Stufe2. KEIN
  Golden-Sammelwechsel in dieser Version.
- **E4 `lauf_planen` (Nicht-Command-Tool):** Signatur nach
  `modell_lesen`-Präzedenz, `params = laufPlanSchema` (zod). Der
  Tool-Call wird NIE ausgeführt, sondern als **Lauf-Vorschlagskarte**
  gerendert (Schrittliste mit Begründungen, «Lauf starten»/«Ablehnen»).
  «Lauf starten» ruft `lauf-runtime.starte()` — derselbe Weg wie der
  Testhook. KEIN Auto-Start (E4-Vertrag v0.8.5 bleibt Sanktion).
  Ungültiges JSON/Schema → zod weist ab, Kosmo bekommt den Fehler als
  Tool-Ergebnis (jsonrepair-Pfad chat.ts:44 bleibt davor). Die
  **Lauf-Bibliothek** macht die 3 kuratierten Drehbücher im KosmoPanel
  wählbar; die @ref-Auflösung zieht als exportierte, unit-getestete
  Funktion nach `@kosmo/ai` (`loeseLaufPlanRefs(plan, doc)`), der
  Prüfcode konsumiert sie fortan von dort (eine Wahrheit).
- **E5 Öffnungs-Griff:** Öffnung einzeln gewählt → EIN Griff auf dem
  Öffnungs-Mittelpunkt; Schieben = `design.eigenschaftSetzen('center')`
  (EIN Command, keine Identitätsänderung). Die App CLAMPT das Ziel gegen
  `width/2 … wandLaenge−width/2` (D6: Kernel validiert nicht — der Clamp
  ist Pflicht, ein Kernel-Nachzug der Validierung ist erlaubt, aber
  nicht Bedingung). Griff-Hit-Vorrang wie C-17.
- **E6 Standort-Persistenz:** neues Doc-Setting `standort`
  (`{ adresse, lv95: {e, n}, quelle: 'geoadmin', abgerufenAm }`) über
  einen SettingsPatch-Command `design.standortSetzen` — Undo/Sync/
  `.kosmo`-Paket inklusive. StandortSuche schreibt es nach erfolgreicher
  Suche; KosmoData zeigt den Projekt-Standort als Zeile (LV95 +
  Adresse, ehrlicher Leer-Zustand «Kein Standort gesetzt»). ÖREB ist
  NICHT Teil dieser Version (Kandidatenliste).
- **E7 Wächter rückwärts:** `ai-scan-delta.mjs` listet ALLE
  Release-Versionen aus der ROADMAP («🚀 Release vX.Y»-Einträge) und
  meldet jede ohne `AI-SCAN-AUSWERTUNG-<v>.md` als Lücke (bestehende
  Lücken 0.7.4–0.8.4 werden als «historisch, durch 0.8.5 abgedeckt»
  einmalig dokumentiert statt rot).
- **E8 Eval-LaufPlan-Format:** `pruefe-eval.mts` versteht
  `erwartung.typ: 'laufplan'` (erwarteter Plan als Schritt-Folge,
  Vergleich commandId+Kernparameter); mindestens 3 neue Prompts nutzen
  es (Beweis für B1s Weg «Bitte → Plan»).

## 4 · Wellen + Hotspot-Matrix (bindend)

- **Tag 1 (A):** PA1 Kernel (`commands/design.ts` + Kernel-Tests —
  EXKLUSIV, A1+A2 gebündelt wegen gemeinsamen Kreises) ‖ PA3
  (`derive/plansvg.ts`+`sheet.ts` additiv-optional + `publish/**`) ‖
  PA4 (`tools/ai-scan-delta.mjs` + `wissen/training/eval/**`). Danach
  PA2 (Fable: DesignWorkspace-Griffzweig + griffe.spec).
- **Tag 2 (B):** PB1 (kosmo-ai + KosmoPanel.tsx + lauf-runtime.ts —
  EIN Paket) ‖ PB2 (Viewport3D.tsx) ‖ PB3 (PlanView.tsx +
  DesignWorkspace-Griffzweig — startet NACH PA2-Landung).
- **Tag 3 (C):** PC1 (DesignWorkspace-StandortSuche + kosmo-kernel
  Settings-Command + KosmoData-Anzeige) · PC2 Puffer · PC3 Fable.
- App.tsx/ui-zustand: nur Fable. Ports: Agenten 5174–5177, Fable 5183.

## 5 · Golden-Politik

Komplett golden-still (36/36 + svg-qa, sha256-Beweis wie PB6/PB3).
E3 ist opt-in-additiv; E1/E2 berühren kein derive.

## 6 · Sanktionen

1. Kernel-Golden-Diff ≠ leer = Paket ungültig (E3-Opt-in verletzt).
2. Autopilot-Start ohne explizite Nutzeraktion = Paket ungültig (E4).
3. `lauf_planen` führt selbst Commands aus = Paket ungültig (Vorschlag ≠
   Ausführung).
4. Wand-Griff-Drag verliert irgendein Öffnungs-/Wand-Feld = Paket
   ungültig (E1; Kernel-Test zwingend).
5. Fremde Hotspot-Dateien anfassen = Paket ungültig; Nachzüge macht
   Fable atomar.
6. Neue Hexes statt Token = Paket ungültig (E7-Politik v0.8.5 gilt fort).
7. Hintergrund-Warten («Notification») = Weckruf + Protokollvermerk.

## 7 · Vollständigkeits-Matrix (Abnahme Tag 3)

- [x] **C-1** Wand-Endpunkt-Drag: Öffnung samt fensterTyp/teilung/typeId bleibt; Wand-ID und height bleiben; EIN Undo → PA1/PA2
- [x] **C-2** Kürzer-Wand-Regel: passt → bleibt; clampbar → geclampt; zu breit → entfernt MIT sichtbarer Meldung → PA1
- [x] **C-3** Null-Länge wirft VOR jedem Patch (Wand unverändert) → PA1
- [x] **C-4** nachbar-Zone behält `zonenArt` beim Eck-Zug → PA1/PA2
- [x] **C-5** Goldens byte-still (sha256-Vergleich HEAD↔Arbeitsbaum) trotz E1/E2/E3 → alle
- [x] **C-6** `data-raumtyp` erscheint NUR im Publish-Blatt-SVG, nie im Golden-/Design-Pfad → PA3
- [x] **C-7** KSwitch «Raumtypen» blendet Raumtyp-Füllungen aus, «Zonen» weiterhin Parzellen-Kontext — unabhängig schaltbar → PA3
- [x] **C-8** Wächter meldet fehlende Auswertung JEDER Release-Version; 0.8.6 selbst wird verlangt → PA4
- [x] **C-9** Eval: ≥3 LaufPlan-Erwartungs-Prompts, Prüfer vergleicht Schritt-Folge, Gesamtquote grün → PA4
- [x] **C-10** Kosmo-Chat «zeichne mir …» → `lauf_planen`-Vorschlagskarte mit Schrittliste + Begründungen, KEIN Command lief → PB1
- [x] **C-11** «Lauf starten» fährt den Lauf über runtime.starte(); Schrittliste FERTIG; EIN Undo je Schritt → PB1
- [x] **C-12** «Ablehnen» verwirft; ungültiger Plan (kaputte commandId/Schema) wird abgewiesen, kein halber Lauf → PB1
- [x] **C-13** Lauf-Bibliothek: 3 Drehbücher wählbar, @ref-Auflösung via `@kosmo/ai`-Funktion (Unit-Tests; Prüfcode nutzt dieselbe) → PB1
- [x] **C-14** 3D-Shift-Klick toggelt (Mehrfach-Auswahl im 3D sichtbar), Esc leert auch dort; 2D-Verhalten unverändert → PB2
- [x] **C-15** Öffnungs-Griff: sichtbar bei Einzel-Auswahl, Schieben per EINEM eigenschaftSetzen, App-Clamp an Wandkanten → PB3
- [x] **C-16** Öffnungs-Griff-Vorrang vor Wand-Hit (C-17-Muster) → PB3
- [x] **C-17** Standort überlebt Reload/Save-Load (`.kosmo`), Undo entfernt ihn; KosmoData zeigt LV95+Adresse bzw. ehrlichen Leer-Zustand → PC1
- [ ] **C-18** Release: Matrix adversarial (Fan-out, PE3-Lehren), lehren/v0.8.6.md, Sechs-Träger-Bump, Neuigkeiten, §0-Delta, Release-Notiz, Rundgang-PDF gesichtet, release-gate 0, Installer+sha256+Zustellung, Owner-Smoke-Punkt → PC3

## 8 · Ehrliche Nicht-Ziele

3D-Marquee (Frustum/Occlusion — Kandidat), Treppen-Griffe, ÖREB-Abruf,
Golden-Sammelwechsel, HomeStation-Posten (VectorGym/HiVG/Render-Kette),
kein Autopilot-Auto-Start, kein Gizmo-Framework, keine
Kernel-Mengen-Commands.
