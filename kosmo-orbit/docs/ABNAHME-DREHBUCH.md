# V1-Abnahme-Drehbuch (Owner-Q26)

> Schritt für Schritt durch den vollen Entwurfs-Loop — genau in der Reihenfolge,
> die als Abnahme-Kriterium vereinbart ist. Spalte «Stand» sagt ehrlich, was in
> der Cloud bereits maschinell verifiziert ist und was erst mit der HomeStation
> live wird. Dauer der reinen Abnahme: ~20 Minuten.

## Vorbereitung (einmalig, ~15 Minuten)

1. **App starten** — eine der drei Varianten:
   - Desktop-Installer aus der CI laden (Actions → «KosmoOrbit Desktop» → Artefakte:
     `.dmg` macOS universal, AppImage/deb/rpm Linux, MSI/EXE Windows) und installieren.
   - Oder Dev-Variante: `cd kosmo-orbit && npm ci && npm run dev` → Browser.
   - iPad: die gehostete PWA öffnen und «Zum Home-Bildschirm» (oder lokal per
     `npm run preview` im selben Netz).
2. **HomeStation-Bridge starten** (auf dem Büro-PC mit der 5090):
   ```
   cd kosmo-orbit/tools/homestation-bridge
   pip install -e . && kosmo-bridge --token GEHEIM
   ```
   Ohne GPU-Dienste zum Testen: `kosmo-bridge --fake-worker` (liefert
   deterministische Fake-Renders/-Stimme/-Embeddings).
   In der App unter KosmoVis die Bridge-URL eintragen (`http://<pc>:8600`).
3. **Ollama** auf der HomeStation: `ollama pull qwen3-coder:30b` (oder Wunschmodell),
   in den Kosmo-Einstellungen (Zahnrad im Kosmo-Panel) URL + Modell setzen.
   Ohne HomeStation: Provider «Demo» — der Loop funktioniert mit dem Mock.
4. **Sync-Server** (für den iPad-Test): `cd kosmo-orbit/tools/sync-server && npm ci && npm start`,
   in der App oben «Sync» → URL + Raumname auf beiden Geräten gleich.

## Der Abnahme-Loop

| # | Schritt | So geht's | Stand |
|---|---|---|---|
| 1 | Projekt öffnen | Zentrale → «Beispielprojekt laden — TKB Bibliothek Hönggerberg» (oder eigenes Projekt anlegen; Autosave läuft) | ✅ maschinell verifiziert (E2E) |
| 2 | Modellieren mit der Maus | KosmoDesign → Werkzeug «Wand», Aufbau wählen, klicken; Fenster/Türen ins Wand-Segment; Dach/Treppe/Zone analog | ✅ verifiziert |
| 3 | Modellieren per Skizze | «✎ Skizze» → Freihand-Striche → Kosmo schlägt Wände als Diff-Karte vor → Übernehmen | ✅ verifiziert (gated) |
| 4 | Modellieren per Sprache | Mikrofon-Knopf im Kosmo-Panel (Push-to-Talk) → Bridge-STT (Whisper, CH-Deutsch) → Vorschlag → Übernehmen | ⏳ Ablauf steht; Whisper-Qualität erst an der echten Bridge hörbar |
| 5 | Modellieren per Chat | Kosmo: «Zeichne eine Wand von 0,0 bis 6,0» → Diff-Karte → Übernehmen (Undo jederzeit) | ✅ verifiziert (Mock + Ollama-Pfad) |
| 6 | SIA-Pläne live | Ansicht «4er»: 3D, Grundriss, Schnitt (Werkzeug «Schnitt» setzt die Linie), Ansicht Süd — alles lebt beim Editieren; Ansichten rechnen Hidden-Line | ✅ verifiziert (Golden-SVGs) |
| 7 | Flächenreport | Kennzahlen-Panel: HNF/FF/NGF, aGF-Ziel ×1.28, GF-Schätzung ×1.1 (Faktoren einstellbar); TKB: NGF 2'814 m² | ✅ verifiziert |
| 8 | IFC-Export | Toolbar «IFC» → Datei beginnt mit `ISO-10303-21;`, enthält IFCWALL etc. (ifcopenshell-geprüft) | ✅ verifiziert |
| 9 | Render-Job an HomeStation | KosmoVis → Stil-Prompt + Geometrie-Treue → «Render-Job senden» → Monitor zeigt Status | ⏳ gegen `--fake-worker` verifiziert; echtes ComfyUI-Rendern = HomeStation |
| 10 | QA-Verdikt zurück | Ergebnis erscheint mit Doppel-QA-Verdikt (Geometrie/Stil) im Monitor | ⏳ wie 9 |
| 11 | iPad synchron | Beide Geräte im selben Sync-Raum → Wand am Desktop zeichnen → erscheint live auf dem iPad (und umgekehrt) | ✅ 2-Client-Test maschinell; Gefühl auf echtem iPad = Abnahme |

## Kette scharf — HomeStation-Job-Lebenszyklus (V2-Technik Block 1, ROADMAP 177–183)

Dieser Ablauf nimmt die **echte** GPU-Kette ab — nicht den `--fake-worker`.
Voraussetzung: der echte Render-Worker (ComfyUI/Cycles) hängt an der
Job-Schleife (Nahtstelle `_fake_worker_step` ersetzen, normatives Protokoll in
`tools/homestation-bridge/README.md` «Worker andocken»).

1. **Bridge scharf starten** — OHNE `--fake-worker`, mit Freigabe-Pflicht:
   `KOSMO_BRIDGE_APPROVAL_PFLICHT=1 kosmo-bridge --store /mnt/data/render-jobs --host 0.0.0.0`
   (Token setzen, GPU-Idle-Fenster im Worker konfigurieren). In der App unter
   KosmoVis die Bridge-URL + den Token eintragen.
2. **Job senden** → am Render-Node erscheint **«wartet auf Freigabe»** (der
   teure Render läuft NICHT ungefragt an). Der Knopf **«Freigeben»** ist da.
3. **Freigeben** → Status wechselt auf **«wartet auf GPU-Leerlauf …»**, sobald
   die GPU belegt ist; im Leerlauf-Fenster nimmt der Worker den Job und der
   Node zeigt **Worker + Fortschritt** (`fake-worker` darf hier NICHT stehen —
   es muss der echte Worker-Name mit `progress`-Prozenten sein).
4. **Abbrechen (Gegenprobe)** → ein zweiter Job, «Abbrechen» im Wartezustand →
   Status **«abgebrochen»**, es entsteht **kein** `render-result.json`.
5. **Echtes Bild aufs Blatt** → der fertige Job liefert ein echtes ComfyUI-/
   Cycles-Bild; «Aufs Blatt» bettet es in ein KosmoPublish-Blatt ein.
   **Abnahme-Beweis:** `GET /jobs/{id}` zeigt `worker` ≠ `"fake-worker"` und
   `qa.geometry.method` ≠ `"fake-worker"`.
6. **«Nur Cycles» prüfen** → Checkbox «nur Cycles» am Node an → der Job trägt
   `vis.skip: true` / `requested_engine: "cycles"`; das Ergebnis ist ein reiner
   Cycles-Render (keine KI-Veredelung).
7. **Blender-Simulation** → eine Wind-/Sonnenstunden-/Gebäude-Energie-Sim
   auslösen (`/jobs/blender-sim`). **Abnahme-Beweis:** der Job liefert **echte
   Werte**, nicht `kein-blender-worker` — und keine erfundene Platzhalterzahl.

Solange ein Punkt scheitert, ist er ehrlich «⏳ HomeStation», nicht «✅».

## Kreis schliessen — Auftragsbuch → Ausführung (V2-Technik Block 2)

Dieser Ablauf nimmt den **zweiten** Kreis ab: KosmoDev sammelt Aufträge,
Claude Code an der HomeStation setzt sie um. Voraussetzung: die Bridge läuft
(gegen den echten oder den `--fake-worker` — Schritt 6 ist die Fake-Gegenprobe,
Schritt 3–5 brauchen den echten Dev-Worker).

1. **Auftrag erfassen** — im Kosmo-Panel «⚑» drücken oder «@kosmodev» sagen,
   was besser werden soll, oder direkt in KosmoDev tippen (Feld «⚑ Erfassen»).
   Der Auftrag erscheint im Auftragsbuch mit Status `offen`.
2. **«An HomeStation übergeben»** → KosmoDev schickt die offenen Aufträge als
   Workorder an `POST /jobs/dev`; die Statuszeile zeigt sofort **«wartet auf
   Worker — an der HomeStation Claude Code andocken»**.
3. **An der HomeStation Claude Code als Dev-Worker starten** — nach dem
   normativen Protokoll in `tools/homestation-bridge/README.md`
   («Dev-Worker andocken»): offene Workorder holen, claimen, umsetzen, Result
   melden.
4. **Worker claimt** → die Statuszeile in KosmoDev wechselt auf **«Worker
   ‹Name› arbeitet …»**.
5. **Worker setzt um + meldet Result mit Commit** → die betroffene
   Auftrags-Karte springt auf **«erledigt»** mit Commit-Beleg (Worker-Name +
   Commit-Hash + Notiz an der Karte, `auftrag-ergebnis`).
6. **Gegenprobe Fake** — gegen `--fake-worker` claimt und meldet die Bridge
   selbst (`_fake_dev_worker_step`): die Karte springt ebenfalls auf
   «erledigt», aber mit dem Badge **«fake-worker · Simulation»** und **OHNE**
   Commit-Hash — kein erfundener Beleg, die Notiz sagt offen «Simulation —
   keine echte Umsetzung».
7. **Offline-Gegenprobe** — ohne erreichbare Bridge (oder falscher Token)
   meldet KosmoDev die ehrliche Zeile «Bridge nicht erreichbar — Status
   unbekannt (Offline)» bzw. «Bridge lehnt ab — Token fehlt oder ist falsch»;
   die Aufträge bleiben unangetastet `offen`, es wird kein Ergebnis
   vorgetäuscht.

Solange (3)–(5) nicht live an der HomeStation gelaufen sind, ist der Punkt
ehrlich «⏳ HomeStation», nicht «✅».

## Wenn etwas klemmt

- **Kosmo-Panel → Zahnrad → Diagnose**: prüft Kern, Ableitung, LLM, Bridge,
  Wissensbasis, Speicher und sagt konkret, was fehlt.
- Bridge nicht erreichbar? Firewall-Port 8600, Token identisch, `--fake-worker`
  als Gegenprobe.
- Alles Weitere: `kosmo-orbit/ROADMAP.md` (Stand) und `docs/TAGESBERICHT-*.md`
  (was wann warum).

## Nach der Abnahme

Erklärt der Owner die V1-Abnahme, wird PR #2 gemergt (der Branch enthält
ausschliesslich `kosmo-orbit/` + die zwei CI-Workflows — die Website bleibt
unberührt). Danach: HomeStation-Testlauf-Protokoll als erster V1.1-Punkt.
