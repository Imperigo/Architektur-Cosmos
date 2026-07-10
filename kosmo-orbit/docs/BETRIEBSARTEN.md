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

## Kosmo sieht mit — lokal (v0.6.9 Stream D)

«Kosmo sieht mit» (⚙ → Häkchen «Kosmo sieht mit») hängt der Nachricht das
aktuell erfasste Stationsbild an (3D-Viewport, Grundriss/Schnitt, KosmoVis-
Node-Canvas oder ein fertiger Render-Lauf — `state/kosmo-blick.ts`). Damit ein
**lokales** Modell das Bild tatsächlich versteht, statt es nur mitzuschleppen,
braucht Ollama ein vision-fähiges Modell:

1. **Modell pullen** (Terminal am Heim-PC, Ollama muss laufen):
   ```
   ollama pull qwen2.5vl:7b
   ```
   Für schwächere Hardware gibt es kleinere Varianten (`qwen2.5vl:3b`); für
   mehr VRAM `qwen2.5vl:32b`. Grössenordnung: `qwen2.5vl:7b` ~ 6 GB.
2. **Kosmo-Einstellungen** (⚙): Provider bleibt **Ollama**, das Feld **Modell**
   auf `qwen2.5vl:7b` (oder die gepullte Variante) umstellen — dasselbe
   Freitextfeld wie für `qwen3-coder:30b`, es gibt keinen separaten
   «Vision-Modell»-Schalter. Danach das Häkchen **«Kosmo sieht mit»** setzen
   (bei Ollama per Default bereits AN, s. Tabelle oben `istVisionFaehig`).
3. **Was zu erwarten ist**: bei jeder gesendeten Nachricht erscheint zuerst
   die dezente Zeile «Kosmo sieht: ‹Station›» mit einem Mini-Thumbnail
   (anklickbar für die Vollbild-Vorschau) — danach reagiert Kosmo inhaltlich
   auf das Bild (z.B. «ich sehe zwei Aussenwände und eine Türöffnung»). Ein
   reines Text-Modell (`qwen3-coder:30b` o.ä.) bekäme dasselbe Bild zwar
   ebenfalls mitgeschickt, würde es aber ignorieren oder halluzinieren —
   deshalb der ausdrückliche Modellwechsel.

**Ehrlich zur Cloud-Betriebsart:** der Anthropic-Provider (Claude) unterstützt
denselben `images`-Weg (`packages/kosmo-ai/src/anthropic.ts`) technisch
genauso — ein echter Cloud-Bildcall braucht aber den **Owner-eigenen
Anthropic-API-Schlüssel** (⚙ → Cloud-Zugang) und ist in dieser
Container-Umgebung **unerprobt**: das CI/E2E-Setup hier hat keinen echten
Anthropic-Schlüssel und keinen Netzzugang zur Anthropic-API, es kann also nur
`ScriptedProvider`/`MockProvider` end-to-end beweisen (`e2e/kosmo-blick*.spec.ts`),
nie den echten Cloud-Bildcall selbst. Der erste echte Beweis, dass ein
`images`-Zug bei Anthropic tatsächlich ankommt und sinnvoll beantwortet wird,
ist HomeStation-/Owner-Arbeit (Abnahmepunkt: `docs/HOMESTATION-AUFTRAG.md`).

### Ehrlich: warum die Tools nicht *in* der .exe stecken

Die App ist ~44 MB. Die schweren Werkzeuge zusammen sind zweistellige Gigabyte
(LLM-Gewichte allein ~20 GB) mit eigenen Lizenzen und Update-Zyklen. Niemand lädt
einen 20-GB-Installer, und Modelle gehören nicht in ein Git/Binary. Deshalb ist der
Weg — wie bei den grossen Suiten — ein **Setup-Assistent, der gezielt holt/prüft**,
statt alles einzubacken. Das fühlt sich an wie «alles im Installer», ohne die
Riesendatei.
