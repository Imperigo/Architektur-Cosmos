# Incident-Playbook — Betrieb & Notfall (Serie I / Batch B9)

> Ehrlich vorab: dies ist ein **Handlungsleitfaden für den Owner am
> HomePC/HomeStation**, keine Automatisierung. Rotation, Widerruf und
> Forensik sind hier Schritt für Schritt beschrieben — ausgeführt werden sie
> von Hand, mit den Werkzeugen, die die vorherigen Batches (B3/B4/B5/B6)
> bereits gebaut haben. Kein Punkt hier täuscht einen automatischen
> Reaktionsmechanismus vor, den es nicht gibt.

Drei Szenarien, jedes mit Erkennungszeichen → Sofortmassnahme → Nacharbeit.

## 1 · Schlüssel-Leak (Anthropic-Key, Sync-/Bridge-Token) → Rotation

**Erkennungszeichen:** ein Schlüssel/Token taucht ausserhalb des vorgesehenen
Orts auf (versehentlich committet, in einem Screenshot, in einem geteilten
Chat) — oder das Sicherheits-Log (siehe Abschnitt 3) zeigt `auth_fehlgeschlagen`-
Zeilen von einer IP/zu einer Zeit, die niemand aus dem Büro erklären kann.

### 1a. Anthropic-API-Key

1. Schlüssel im Anthropic-Konsolen-Dashboard **sofort widerrufen** (nicht nur
   lokal löschen — ein widerrufener Key ist am Server gesperrt, ein nur lokal
   entfernter Key bleibt anderswo gültig).
2. Neuen Key ausstellen, in der App unter **KosmoPanel → Betrieb** eintragen
   (`packages/kosmo-ai/src/betrieb.ts`, `AnthropicConfig.apiKey` /
   `anthropicAuthHeader()` in `packages/kosmo-ai/src/anthropic.ts`) — der Key
   lebt nur im lokalen Browser-/App-Zustand, nie im Repo, nie im Sync-Doc
   (er läuft nicht durch Yjs).
3. Prüfen, ob der alte Key in Git-Historie, Logs oder Exporten auftaucht
   (`tools/secret-scan.mjs`, Serie I / B2) — falls ja, zusätzlich dort
   bereinigen (History-Rewrite ist ausserhalb dieses Playbooks, siehe
   GitHub-Doku zu `git filter-repo`).

### 1b. Sync-Token (`KOSMO_SYNC_TOKEN`) / Bridge-Token (`KOSMO_BRIDGE_TOKEN`)

1. Neuen, zufälligen Token setzen (z.B. `openssl rand -hex 32`).
2. Sync-Server neu starten mit dem neuen `KOSMO_SYNC_TOKEN`
   (`tools/sync-server/README.md`); Bridge neu starten mit dem neuen
   `KOSMO_BRIDGE_TOKEN` (`tools/homestation-bridge/README.md`). Der
   timing-sichere Vergleich (`tokenGleich`/`secrets.compare_digest`) ändert
   sich nicht — nur der Wert.
3. Alle Clients (Desktop/iPad) im KosmoPanel auf den neuen Token umstellen.
4. Alten Token in keinem Backup/Notizzettel weiterverwenden.

### 1c. Lizenz-Widerruf (Serie I / Batch B6) — wenn eine Lizenz kompromittiert ist

Eine signierte Lizenz selbst ist **kein Geheimnis, das rotiert werden muss**
(der öffentliche Schlüssel ist ohnehin öffentlich) — aber eine geleakte
Lizenz-**Datei** kann von einem Dritten für Sync/Render missbraucht werden,
solange sie gültig ist. Der wirksame Hebel ist die **Widerrufsliste**:

1. Die `lizenzId` der betroffenen Lizenz ermitteln (steht im Lizenztext selbst,
   z.B. über `KosmoPanel → Betrieb → Lizenz` oder durch Verify mit
   `@kosmo/lizenz`).
2. Auf die Widerrufsliste setzen — entweder per Env
   (`KOSMO_SYNC_LIZENZ_WIDERRUF=lz-...` / `KOSMO_BRIDGE_LIZENZ_WIDERRUF=lz-...`,
   Komma-Liste) oder in der Widerrufsdatei
   (`KOSMO_SYNC_LIZENZ_WIDERRUF_DATEI` / `KOSMO_BRIDGE_LIZENZ_WIDERRUF_DATEI`,
   eine ID pro Zeile oder JSON-Array).
3. Sync-Server **und** Bridge neu starten, damit `ladeWiderrufsliste()` /
   `lade_widerrufsliste()` die neue Liste einliest (kein Hot-Reload).
4. Betroffenem Inhaber eine neu ausgestellte Lizenz (neue `lizenzId`, neu
   signiert mit dem beim Owner verwahrten privaten Ed25519-Schlüssel) geben.
5. **Restgrenze, ehrlich:** der Widerruf wirkt nur, solange `KOSMO_SYNC_
   LIZENZ_PFLICHT`/`KOSMO_BRIDGE_LIZENZ_PFLICHT` aktiv ist — ohne Server-
   Bindung eingeschaltet läuft die rein lokale Standard-Edition unabhängig
   von der Widerrufsliste weiter (siehe `docs/SERIE-I-BUILDPLAN.md` §3). Rein
   lokale Arbeit (kein Sync/Cloud-Render) lässt sich durch einen Widerruf
   grundsätzlich nicht stoppen — nur die serverabhängigen Funktionen.

## 2 · Geleakte Kopie → Fingerprint-Forensik (Serie I / Batch B5)

**Erkennungszeichen:** eine `.kosmo`-Datei, ein exportiertes PDF-Planset oder
ein SVG-Export taucht ausserhalb des Büros auf (weitergegeben, online
gefunden, bei einem Dritten entdeckt).

1. **`.kosmo`-Export:** das Wrapper-Feld `herkunft` öffnen (liegt im
   Export-Manifest, NICHT im `DocJson` selbst — siehe
   `apps/kosmo-orbit/src/state/herkunft.ts`). Es enthält `editionId`
   (Betriebsart zum Export-Zeitpunkt), `exportedAt` (ISO-Zeitstempel) und
   `docHash` (deterministischer Streuwert über den Doc-Inhalt,
   `docHashVon()`).
2. **PDF-Export:** PDF-Metadaten öffnen (Eigenschaften/„Stichwörter“ im
   PDF-Betrachter) — `export-sheets.ts` trägt dieselbe Herkunftskennung über
   `herkunftKennzeichnung(herkunft)` in `pdf.setProperties({ keywords })` ein.
3. **SVG-Export:** das `<metadata>`-Element im SVG-Quelltext öffnen
   (`svgMitHerkunft()`) — enthält dieselben drei Felder als lesbaren Text.
4. Mit dem Fund abgleichen: `exportedAt` gibt den Export-Zeitpunkt, `docHash`
   lässt sich mit dem Projektstand zum vermuteten Zeitpunkt vergleichen (bei
   gleichem Inhalt identischer Hash) — das grenzt ein, **wann** und aus
   **welchem Betriebsart-Kontext** die Kopie stammt.
5. **Ehrliche Restgrenze (siehe `docs/SERIE-I-BUILDPLAN.md` §3):** die
   Kennung ist ein **Nachweis, keine Verhinderung** — ein entschlossener
   Angreifer entfernt das Wrapper-Feld oder die PDF-/SVG-Metadaten leicht.
   Fehlt die Kennung im gefundenen Dokument, heisst das NICHT, dass die Kopie
   nicht aus KosmoOrbit stammt — nur, dass sie (absichtlich oder durch ein
   Fremdwerkzeug) bereinigt wurde. Der real wirksame Hebel bleibt die
   Server-Bindung (Abschnitt 1c).

## 3 · Verdächtiger Zugriff → Sicherheits-Log prüfen (Serie I / Batch B9)

**Erkennungszeichen:** ungewöhnliche Aktivität vermutet (unerwarteter
Verbindungsversuch, Render-Auftrag ausserhalb der Bürozeiten, Meldung eines
Nutzers über eine Fehlermeldung, die er nicht ausgelöst hat).

1. **Wo die Logs liegen:** Sync-Server und Bridge schreiben je eine
   JSON-Zeile pro sicherheitsrelevantem Ereignis auf **stderr**
   (`tools/sync-server/src/sicherheits-log.mjs`,
   `tools/homestation-bridge/kosmo_bridge/sicherheits_log.py`) — beim
   Starten mit `node src/server.mjs 2> sync-sicherheit.log` bzw.
   `kosmo-bridge ... 2> bridge-sicherheit.log` in eine Datei umleiten, sonst
   verschwindet die Zeile im Terminal-Scrollback.
2. **Format:** `{"ts", "ereignis", "quelle", "detail"}` — eine Zeile pro
   Ereignis, mit `grep`/`jq` durchsuchbar, z.B.
   `grep '"ereignis":"auth_fehlgeschlagen"' sync-sicherheit.log`.
3. **Ereignis-Typen, die heute geloggt werden:**
   - `auth_fehlgeschlagen` — falscher/fehlender Token (Sync `onAuthenticate`
     + `/raeume`; Bridge `token_guard`, je `quelle` mit dem betroffenen Pfad).
   - `lizenz_fehlgeschlagen` — Lizenz fehlt/abgelaufen/manipuliert/widerrufen/
     Prüfung nicht konfiguriert (`detail` nennt den Grund-Code, z.B.
     `signatur_ungueltig`, `abgelaufen`, `lizenz_widerrufen`).
   - `rate_limit_abgelehnt` — Sync-Server: zu viele Verbindungen/Anfragen
     einer IP innerhalb einer Sekunde (WebSocket-Aufbau **und** `/raeume`).
   - `upload_deckel_abgelehnt` — Bridge: ein Upload (Modell/Audio) über dem
     konfigurierten Grössendeckel wurde verworfen, bevor er auf Platte kam.
4. **Was NICHT im Log steht (Absicht, kein Versehen):** nie ein Token- oder
   Signaturwert im Klartext — nur ehrliche Kurzbeschreibungen. Eine
   Lizenz-ID darf erscheinen (kein Geheimnis, steht auch auf der
   Widerrufsliste offen).
5. **Auswertung:** viele `auth_fehlgeschlagen`/`rate_limit_abgelehnt`-Zeilen
   von derselben IP in kurzer Zeit → mutmasslicher Brute-Force-Versuch, Token
   rotieren (Abschnitt 1b). `lizenz_fehlgeschlagen` mit Grund
   `signatur_ungueltig` oder `lizenz_widerrufen` wiederholt von aussen →
   jemand versucht, eine ungültige/widerrufene Lizenz zu verwenden — prüfen,
   ob sie aus einer bekannten geleakten Kopie stammt (Abschnitt 2).
6. **Restgrenze, ehrlich:** der WebSocket-Nachrichten-Grössendeckel
   (`maxPayload`/`KOSMO_SYNC_MAX_BYTES`) wird von der zugrunde liegenden
   `ws`-Bibliothek durchgesetzt, BEVOR ein Hocuspocus-Hook feuert — eine
   überlange Sync-Nachricht schliesst die Verbindung (Code 1009), erscheint
   aber **nicht** als eigene Log-Zeile (kein öffentlicher Hook dafür
   verfügbar, siehe Kommentar in `server.mjs`). Ein gehäuftes,
   unerklärliches Verbindungsabbrechen ohne zugehörige Log-Zeile kann ein
   Hinweis auf genau diesen Fall sein.

## Kein SIEM, kein Alerting — bewusst

Dieses Playbook liefert **strukturierte Logs zum Nachschauen**, kein
automatisches Alerting (E-Mail/Push bei Anomalie), kein zentrales SIEM, keine
Log-Rotation/-Aufbewahrungsrichtlinie. Das ist Betriebsinfrastruktur, die auf
der HomeStation eingerichtet werden müsste (z.B. `logrotate`, ein einfacher
`journalctl`/`systemd`-Dienst statt eines Vordergrundprozesses, optional ein
Cron-Job, der die Logs auf auffällige Muster grept) — hier bewusst nicht
vorgetäuscht, siehe `docs/HOMESTATION-AUFTRAG.md`.
