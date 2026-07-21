# V090-VORPLAN — Skizze «HomeStation scharf» (Stand 21.07.2026, nach 0.8.12)

**Status: VORPLAN, keine Spez.** Geschrieben im ruhigen Wach-Fenster nach dem
«Zentralwerk»-Release. Die verbindliche V090-SPEZ entsteht erst nach den
Owner-Entscheiden unten. Rahmen: Kurswechsel «grössere Sprünge»
(OWNER-KOMPASS 20.07., F8) + Owner-Entscheid 21.07.: «wir können ab jetzt
mit vollständiger hardware weiterarbeiten» (HOMESTATION-AUFTRAG-Kopfblock).

## Hauptstrang-Kandidat A — HomeStation scharf schalten
Die Einsteck-Liste aus `HOMESTATION-AUFTRAG.md` der Reihe nach live nehmen;
alles Client-/Bridge-seitige ist gebaut, es fehlt je der echte Worker:
1. **Echte Renders:** ComfyUI/Cycles an die Bridge-Jobschleife
   (`tools/homestation-bridge/README.md` «Worker andocken»; der Fake-Worker
   ist die normative Vorlage). Danach füllen sich KosmoVis-Serien und die
   Publish-Bildslots real. Beweis: Owner sieht ein echtes Render auf dem
   iPad, angestossen über die App.
2. **Kosmo-LLM auf Ollama als Remote-Default:** Ein-Klick-HomeServer (596)
   setzt den Kanal schon — 0.9.0 macht Ollama zum Standard-Provider der
   Betriebsart Remote und misst Latenz/Qualität ehrlich (Eval-Bestand).
3. **bge-m3 in `/embed`:** KosmoPrepare-Suche wird semantisch (Client-Pfad
   `prepare/knowledge.ts` wartet).
4. **Whisper/Piper hören:** STT/TTS am Gerät, CH-Wortliste nachziehen.
Arbeitsteilung fix: Cloud-Worker baut/spezifiziert, der lokale
Home-PC-Worker (HOMEPC-WORKER-PROMPT-Muster) macht Maschinenseite, Owner
verifiziert im Rundgang — Cloud erreicht das Tailnet nicht (ehrliche
Grenze, dokumentiert).

## Weitere Kandidaten (Owner-Priorisierung nötig)
- **KosmoSpez-Station** — WARTET auf R5 (ETH-OneDrive); K37c-Token/Screens
  liegen bereit (`docs/owner-packages/2026-07-21-kosmospez-k37c/`).
- **K15 Vis-Manuell-Ausbau** — Owner 21.07.: eigener Posten.
- **K18 Massketten-Defaults** (Verlängerungslinien + Abstand) — EIGENER
  deklarierter Golden-Zug (Klarstellung in Register-K18, ROADMAP 593).
- **K27 Zoom-Text** — Cluster B (Fable-exklusiv), L-Aufwand.
- **K21/K24 Werkzeugtiefe** (ArchiCAD-Parität) — XL-Strang, braucht
  R8–R12-Antworten; erster Schritt bleibt das Lückeninventar.
- **Hardware-Gegenproben-Rundgang** (fester neuer Ritual-Punkt): Raster-Fix
  594 auf echter GPU · Ein-Klick-HomeServer am Mac/iPad · Startsequenz
  «BRIDGE — VERBUNDEN» gegen den systemd-Server.

## Offene Owner-Fragen für die V090-SPEZ
1. Hauptstrang A (HomeStation) als Rückgrat von 0.9.0 — ja/nein?
2. Reihenfolge der Einsteck-Punkte (Renders zuerst oder LLM zuerst?).
3. Welche 1–2 Zweitstränge daneben (K18-Golden-Zug? K15? KosmoSpez falls
   R5 eintrifft?).
4. R5 (ETH-OneDrive) und R8–R12 (Phasen-/Werkzeugfragen) — Stand?

## Nicht vergessen (aus 0.8.12 mitgenommen)
package-lock.json ist der siebte Bump-Träger (0013eb1) — STAND.md-Liste
beim 0.9.0-Release nachführen · sync.spec bleibt Lastflake-Kandidat
(unter 1.5h-Volllast 60s-Timeout, isoliert 21s — ggf. eigener
serial-Slot) · kritik-shots-072-r2.mts veraltet (Aufräumkandidat) ·
R-Marker in phasen-matrix.ts auf Kurzform bringen (Formatfeinschliff).
