# HOMEPC-MODELLE-PROMPT — Ollama-Staffelung + automatische Modell-Updates

**Zweck:** In eine lokale Claude-Code-Session auf dem Home-PC kopieren
(`claude` in `~/Architektur-Cosmos`). Richtet die Kosmo-Modell-Staffelung
ein und hält die Modelle automatisch aktuell. Owner-Auftrag 22.07.2026
(«richte ein das qwen updates miteinbezogen werden»).

---

Du bist Claude Code, lokal auf «andrins-workstation» (Ubuntu, Benutzer
andrin-baumann). Der KosmoOrbit-Server ist bereits eingerichtet
(kosmo-orbit/docs/HOMESERVER-STATUS.md lesen). Ollama läuft als
System-Dienst aus /mnt/data/tools/ollama, OLLAMA_HOST=0.0.0.0. Antworte
deutsch (Schweizer Schreibung, kein ß).

## Harte Regeln
1. NICHTS im Repo committen/pushen; keine Modelle LÖSCHEN.
2. Vor jedem sudo kurz erklären. Ehrlicher Abschlussbericht mit rohen
   Ausgaben.
3. KRITISCH: `kosmo-qwen3-coder:30b-a3b-q4km` ist ein angepasstes
   Kosmo-Modell. Sein Alias `qwen3-coder:30b` darf NIEMALS in eine
   automatische Pull-Liste — `ollama pull qwen3-coder:30b` würde das
   Kosmo-Modell unter diesem Tag durch das Upstream-Modell ERSETZEN.
   Updates dieses Modells sind ein bewusster Owner-Handgriff.

## Auftrag A — Staffelung sicherstellen (Ist-Abgleich, Owner pullt evtl. parallel!)
Kosmo erwartet (packages/kosmo-ai/src/staffelung.ts): Zeichner
`qwen3-coder:30b` · Leiter `qwen3:30b` · Meister `qwen3:72b`.
1. `ollama list` — Ist-Stand erheben. Falls der Owner gerade pullt
   (laufende Downloads), NICHT parallel dieselben Modelle ziehen — warten
   oder überspringen und im Bericht vermerken.
2. Alias, falls noch nicht vorhanden:
   `ollama cp kosmo-qwen3-coder:30b-a3b-q4km qwen3-coder:30b`
3. `qwen3:30b` vorhanden? Sonst `ollama pull qwen3:30b`.
4. `qwen3:72b` BEWUSST NICHT ziehen (Owner-Entscheid: erst nach E-L/0.9.0
   — 45 GB, passt nicht ganz in 32 GB VRAM; im Bericht als offen führen).

## Auftrag B — Automatische Modell-Updates (systemd-Timer)
1. `/etc/kosmo/modelle.txt` anlegen (root:andrin-baumann 644), eine
   Modellzeile je Update-Kandidat, Kommentare mit #:
   ```
   # Kosmo-Staffelung — automatisch aktuell gehalten (wöchentlich)
   qwen3:30b
   llama3.2
   # BEWUSST NICHT hier (kritische Regel 3):
   # qwen3-coder:30b  -> Alias auf Kosmo-Spezialmodell, nur manuell
   # qwen3:72b        -> erst nach Owner-Entscheid E-L
   ```
2. `/usr/local/bin/kosmo-modelle-update.sh`: liest modelle.txt (Zeilen
   ohne #), je Modell `ollama pull <modell>`; VOR dem Lauf prüfen, ob
   gerade ein Render-Job läuft (kosmo-render-worker aktiv/GPU belastet →
   Lauf verschieben, nächster Timer-Schlag) — Modell-Pulls sind zwar
   Netz/Disk-lastig, aber ein Pull, der ein GERADE BENUTZTES Modell
   ersetzt, soll nicht mitten in einer Kosmo-Antwort passieren. Log nach
   `~/kosmo-modelle-update.log` (Zeitstempel, je Modell alt→neu-Digest
   aus `ollama list`).
3. `kosmo-modelle-update.timer`: wöchentlich (So 03:00, Persistent=true)
   + zugehörige oneshot-Unit. `daemon-reload`, `enable --now` NUR den
   Timer (kein Sofortlauf, falls der Owner noch pullt).
4. Einmaliger PROBELAUF des Skripts, sobald keine Owner-Pulls mehr
   laufen — rohe Logausgabe in den Bericht.

## Auftrag C — Verifikation + Bericht
1. `ollama list` nachher (Staffelung vollständig bis auf 72b?).
2. `systemctl list-timers | grep kosmo` (beide Timer sichtbar:
   autoupdate + modelle-update).
3. Vom PC gegen die Tailnet-IP: `curl -s http://100.88.48.73:11434/api/tags`
   enthält qwen3:30b UND qwen3-coder:30b.
4. Abschlussbericht: Ist/Soll-Tabelle der Modelle, Timer-Status,
   Probelauf-Log, offene Punkte (72b). Owner kopiert ihn in den
   Cloud-Chat.
