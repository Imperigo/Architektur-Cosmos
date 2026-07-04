# Betriebsarten & Werkzeuge (V2-B1/B2)

Der Owner wollte drei Versionen von KosmoOrbit und eine Software, die — wenn der
Heim-PC aus ist — direkt die Cloud anbietet, plus alle nötigen Werkzeuge «im
Installer zur Auswahl». So ist es umgesetzt.

## Die drei Betriebsarten

Eine reine Abbildung (`packages/kosmo-ai/src/betrieb.ts`, `betriebKonfig()`) setzt
Provider und alle Dienst-Adressen kohärent — im Kosmo-Panel (⚙) umschaltbar:

| Betriebsart | LLM (Kosmos Gehirn) | Bridge/Sync | Für wen |
| --- | --- | --- | --- |
| **Standard** | Ollama auf `localhost:11434` | `localhost:8600/8700` | am Heim-PC |
| **Remote** | Ollama über die VPN-Adresse | derselbe Host über VPN | Laptop unterwegs |
| **Cloud** | Claude, **mind. Opus 4.8** | — (Browser-Fallbacks) | Heim-PC aus |

`bereinigeHost()` macht aus getippten Adressen (`http://kosmo.local:11434/`) den
blossen Host. `mindestensOpus()` hebt ein zu schwaches Cloud-Modell (Haiku/Sonnet)
auf **Opus 4.8** an — der Owner-Boden. Die Installer-Edition
(`VITE_KOSMO_EDITION`) bestimmt nur die Erststart-Voreinstellung.

## Cloud-Fallback

Erreicht Kosmo das lokale Modell nicht (Ollama/LM-Studio-Fehler), erscheint sofort:

> **HomeStation nicht erreichbar** — Mit Claude Cloud (Opus 4.8) weiterarbeiten?

Mit hinterlegtem Schlüssel wird umgeschaltet und die letzte Frage nachgesendet;
ohne Schlüssel führen die Einstellungen zum Eintragen (der Schlüssel bleibt auf
dem Gerät).

## Werkzeuge (Setup-Assistent)

Kosmo (⚙) → **Werkzeuge einrichten …** zeigt aus dem Manifest
(`apps/kosmo-orbit/src/state/werkzeuge.ts`) die für die aktive Betriebsart nötigen
Tools, prüft die erreichbaren live (Ollama `/api/tags`, Bridge `/health`, Sync
`/raeume`) und gibt für den Rest den copy-fertigen Hol-Befehl.

| Werkzeug | Betriebsart | Kern? | Grösse |
| --- | --- | --- | --- |
| Ollama (LLM-Server) | Standard/Remote | ja | ~50 MB |
| LLM-Modell (qwen3-coder:30b / :8b) | Standard/Remote | ja | ~20 GB / ~5 GB |
| HomeStation-Bridge (Render/STT/TTS) | Standard/Remote | ja | Python |
| Sync-Server (Gerätekopplung) | Standard/Remote | optional | Node |
| Blender (Render/Sim-Worker, V2) | Standard/Remote | optional | ~300 MB |
| ComfyUI + PyTorch (Diffusion-Render) | Standard/Remote | optional | mehrere GB |
| Whisper-Modell (Schweizerdeutsch) | Standard/Remote | optional | ~1–3 GB |
| VPN (Tailscale/WireGuard) | Remote | ja | ~40 MB |
| Claude-API-Schlüssel | Cloud | ja | — |

### Ehrlich: warum die Tools nicht *in* der .exe stecken

Die App ist ~44 MB. Die schweren Werkzeuge zusammen sind zweistellige Gigabyte
(LLM-Gewichte allein ~20 GB) mit eigenen Lizenzen und Update-Zyklen. Niemand lädt
einen 20-GB-Installer, und Modelle gehören nicht in ein Git/Binary. Deshalb ist der
Weg — wie bei den grossen Suiten — ein **Setup-Assistent, der gezielt holt/prüft**,
statt alles einzubacken. Das fühlt sich an wie «alles im Installer», ohne die
Riesendatei.
