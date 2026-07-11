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

## Blick Cloud — echt (v0.7.1)

E1 aus `docs/V071-KONZEPT.md` härtet genau den oben benannten Rest: der
Anthropic-Bild-Block-Weg existierte technisch bereits seit 0.6.8, aber es gab
weder Downscale noch einen bildspezifischen Fehlerpfad noch einen bewiesenen
echten Bildcall. v0.7.1 liefert die Härtung (`packages/kosmo-ai/src/bild-budget.ts`,
`anthropic.ts`) und den Beweis (`e2e/kosmo-blick-cloud.spec.ts`) — der **letzte
Meter**, der echte Call gegen die echte Anthropic-API mit einem echten
Owner-Schlüssel, bleibt **Owner-Abnahme**. Dieses Drehbuch ist genau dafür.

### Abnahme-Drehbuch (Schritt für Schritt, für den Owner)

1. **Betriebsart Cloud setzen**: Kosmo (⚙) → Betriebsart **Cloud** wählen.
2. **Anthropic-Schlüssel eintragen**: im selben Panel unter «Cloud-Anmeldung»
   den eigenen `sk-ant-…`-Schlüssel ins Feld «API-Schlüssel (bleibt auf diesem
   Gerät)» eintragen (oder — Desktop-Build — «Mit Claude-Abo anmelden»
   nutzen, s. `docs/CLOUD-LOGIN-ABO.md`). Der Status wechselt auf «API-Schlüssel
   hinterlegt» bzw. «angemeldet als Abo».
3. **Blick aktivieren**: Häkchen «Kosmo sieht mit» setzen (bei Anthropic per
   Default bereits AN).
4. **Bild anhängen**: eine Station öffnen, die ein Bild liefert (KosmoDesign:
   3D-Viewport, Grundriss oder Schnitt; KosmoVis: Node-Fläche oder ein
   fertiger Render-Lauf) und im Kosmo-Chat eine Frage senden, z.B. «Was siehst
   du im Grundriss?».
5. **Was der Owner sehen MUSS**:
   - Die Blick-Zeile «Kosmo sieht: ‹Station›» mit Mini-Thumbnail erscheint —
     das Bild ist tatsächlich erfasst und verkleinert worden.
   - **Mit `ScriptedProvider`** (Testskript, kein echtes Netz): die Antwort
     trägt wörtlich den Beweis-Marker **«[Blick empfangen: n Bild(er)]»**
     (`packages/kosmo-ai/src/scripted.ts`) — das beweist, dass das Bild den
     `images`-Weg tatsächlich durchlaufen hat, ohne dass ein echtes Modell
     geantwortet hätte.
   - **Mit echtem Anthropic-Schlüssel + Provider `anthropic`**: statt des
     Markers antwortet das echte Claude-Modell inhaltlich auf das Bild (z.B.
     «ich sehe einen Grundriss mit …») — das ist der Teil, den diese
     Container-Umgebung nicht prüfen kann (kein Netzzugang zu
     `api.anthropic.com`, kein echter Schlüssel hier hinterlegt).
6. **Fehlt der Schlüssel** (Provider `anthropic`, Feld leer): der reale
   401-Fehlerpfad aus `anthropic.ts` erscheint ehrlich im Chat — «Anthropic
   antwortet mit 401. API-Schlüssel prüfen (Einstellungen ⚙).» — keine
   stille Falle, keine erfundene Erfolgsmeldung.

### Budget, Downscale, Fehlerpfade (die Fakten aus dem Code)

- **Downscale vor dem Versand** (`apps/kosmo-orbit/src/state/kosmo-blick.ts`):
  jedes Blick-Bild (3D-Viewport UND SVG-Wege) wird vor dem Encode auf
  **≤ ~1.15 Megapixel** herunterskaliert (Seitenverhältnis erhalten, kleinere
  Bilder bleiben unangetastet, `downscaleGroesse()`) und als **JPEG mit
  Qualität ≈0.8** neu encodiert (`BLICK_MAX_MEGAPIXEL`, `BLICK_JPEG_QUALITAET`)
  statt eines ungebremsten PNG in Bildschirm-Naturgrösse. In der
  Einstellungen-Anzeige steht dazu in Betriebsart Cloud der dezente Hinweis
  «Blick geht als Bild an Claude (Cloud) — verkleinert auf ~1 MP»
  (`data-testid="kosmo-blick-cloud-hinweis"`, NUR in Cloud sichtbar).
- **4-MB-Budget VOR dem Netz-Roundtrip** (`packages/kosmo-ai/src/bild-budget.ts`,
  `bildBudget()`): Anthropic erlaubt rund 5 MB je Bild (Rohbytes) API-seitig;
  Kosmo kappt konservativ bei **4 MB codierter (base64-Text-)Länge** — das
  entspricht rund 3 MB Rohbytes und lässt Reserve für den Rest des
  Request-Bodies (System-Prompt, Verlauf, Tool-Schemas). Der
  `AnthropicProvider` prüft das für ALLE Bilder in ALLEN Nachrichten
  (nicht nur die letzte) BEVOR ein `fetch` läuft — bei Verstoss die deutsche
  Meldung «Bild zu gross — Kosmo verkleinert Blicke automatisch; dieses Bild
  überschreitet trotzdem das Limit (X.X MB codiert, Kosmo-Grenze 4 MB je
  Bild).», ohne einen Netzcall zu riskieren, der ohnehin nur mit derselben
  Botschaft scheitern würde.
- **Bildspezifischer Fehlerpfad bei der echten API** (`packages/kosmo-ai/src/anthropic.ts`):
  antwortet Anthropic trotz Downscale/Budget mit **413** (Payload zu gross)
  oder mit **400**, dessen Fehlertext auf ein Bildproblem hindeutet
  (Heuristik: Text enthält `image` UND eines von `exceeds`/`maximum`/`too
  large`), erscheint «Bild zu gross — Kosmo verkleinert Blicke automatisch;
  dieses Bild überschreitet trotzdem das Limit.» statt eines generischen
  Fehlers. 401 → «API-Schlüssel prüfen (Einstellungen ⚙).», 429 → der
  bestehende Rate-Limit-Hinweis.

### Ehrlich benannte Grenze

Alles oben ist per `e2e/kosmo-blick-cloud.spec.ts` bewiesen — **den
Request-Bau**, nicht die Antwort des echten Dienstes: die Spec fängt
`https://api.anthropic.com/v1/messages` per `page.route` ab und prüft, dass
der Request-Body tatsächlich einen `{type:'image', source:{media_type:
'image/jpeg', …}}`-Block trägt, dann liefert sie eine gefakte SSE-Antwort.
Ob ein echter `images`-Zug bei Anthropic tatsächlich ankommt und ein echtes
Modell sinnvoll antwortet, ist **hier nicht getestet** — diese
Container-Umgebung hat weder einen Anthropic-Owner-Schlüssel noch Netzzugang
zur echten API. Der erste echte Beweis ist Owner-Arbeit: Schritte 1–5 oben
selbst durchspielen und beobachten, ob die Antwort inhaltlich zum
angehängten Bild passt.

### Ehrlich: warum die Tools nicht *in* der .exe stecken

Die App ist ~44 MB. Die schweren Werkzeuge zusammen sind zweistellige Gigabyte
(LLM-Gewichte allein ~20 GB) mit eigenen Lizenzen und Update-Zyklen. Niemand lädt
einen 20-GB-Installer, und Modelle gehören nicht in ein Git/Binary. Deshalb ist der
Weg — wie bei den grossen Suiten — ein **Setup-Assistent, der gezielt holt/prüft**,
statt alles einzubacken. Das fühlt sich an wie «alles im Installer», ohne die
Riesendatei.
