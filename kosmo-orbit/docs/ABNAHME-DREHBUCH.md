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
