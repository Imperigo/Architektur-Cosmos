# Serie I — Sicherheitsarchitektur & Build-Order (Bauplan V2, Fable-Urteil 06.07.2026)

> Basis: `docs/SERIE-I-SICHERHEIT.md` (I1–I5), geschärft an der **realen** Code-Fläche.
> Leitplanke (verbindlich): **«Unhackbar» gibt es nicht.** Jede Massnahme unten
> trägt ihre ehrliche Restgrenze. Alles rein defensiv. Chefdenker-Urteil (Fable),
> Orchestrierung (Opus), Ausführung (Sonnet) — `docs/KI-MODELL-GUIDELINE.md`.

## 0 · Befund — was die Sichtung ergeben hat (Ist-Zustand)

| Nahtstelle | Datei | Befund |
|---|---|---|
| Sync-Server | `tools/sync-server/src/server.mjs` | Token **optional** (ein geteilter Token für alle Räume), kein Rate-Limit, kein Nachricht-Grössen-Deckel, `GET /raeume` **unauthentifiziert** mit `Access-Control-Allow-Origin: *` (verrät alle Raumnamen), Token-Vergleich nicht timing-sicher, nur `ws://` (Klartext) |
| Sync-Client | `packages/kosmo-sync/src/client.ts` | `pushPatches` spiegelt **alle** Entities in den Raum — auch `private`-Daten wandern übers Netz (in Ordnung im Büro, muss aber benannt sein); Token via Hocuspocus über Klartext-`ws://` |
| Betriebsarten | `packages/kosmo-ai/src/betrieb.ts` | `betriebKonfig()` baut fix `ws://host:8700` / `http://host:8600|11434` — kein `wss/https`-Weg für Remote |
| Bridge | `tools/homestation-bridge/kosmo_bridge/main.py` | CORS `*`, Token optional, **keine Upload-Grössen-Deckel** (model.glb/frames/audio → Platten-DoS), **`scene_obj.setdefault("out", …)` übernimmt ein Client-geliefertes `out` → Schreibziel ausserhalb des Job-Stores möglich** (echter Bug), `get_artifact`-Pfadprüfung per `startswith` (Nachbarordner `/tmp/kosmo-jobs-evil` schlüpft durch), `get_job` ohne resolve-Prüfung, Token-Vergleich `!=` statt `secrets.compare_digest`, bindet `0.0.0.0` |
| Tauri | `apps/kosmo-orbit/src-tauri/tauri.conf.json` | **`"csp": null`** — gar keine CSP |
| Tauri | `src-tauri/capabilities/default.json` | `fs:allow-read-text-file` + `write` für **`$HOME/**`** — maximal breiter FS-Zugriff |
| PWA | `apps/kosmo-orbit/index.html`, `vite.config.ts` | keine CSP-Meta, keine Header |
| Secrets | `KosmoPanel.tsx` (`kosmo.llm`), `App.tsx` (`kosmo.sync.token`) | Anthropic-Key + OAuth-Token + Sync-Token in **localStorage** (XSS-lesbar); rein clientseitig, per Design so gewollt |
| KI-Provider | `packages/kosmo-ai/src/anthropic.ts` | `anthropic-dangerous-direct-browser-access` — Key geht direkt aus dem Browser raus (dokumentiert) |
| visibility-Wall | `state/kosmodata-dach.ts`, `knowledge.ts`, `memory.ts`, `archiv.ts` | Default-`private` beim Lesen konsequent; **Website-Redaktion existiert real** in `tools/build-kosmodata-seed.mjs` (`scrubDeep`, Privatpfad-Muster) — aber **kein CI-Gate/Test**, der Publish-Pfade laufend gegen Leaks prüft |
| Live-Sync | `packages/kosmo-data/src/live.ts` | nur **lesend** von `architekturkosmos.ch/api/entries.json`; Schreiben Richtung Website bewusst NICHT gebaut → geringe Leck-Fläche |
| SVG-Export | `packages/kosmo-kernel/src/derive/plansvg.ts` | `escapeXml()` konsequent verwendet — sauber |
| CI/Supply-Chain | `.github/workflows/kosmo-orbit-ci.yml` | `npm ci` vorhanden; **kein `npm audit`, kein Secret-Scan-Gate**; Lockfiles existieren |
| Updates | `CLAUDE.md` | «Keine Signing-Keys — Update = neuer Installer» → unsignierte Desktop-Updates |

Der Owner-Wunsch «Firewall» ist zu **80 % Betriebs-/Netzarchitektur** (Host-Firewall, VPN, TLS-Terminierung auf HomeStation/Router) — davon ist in der Cloud nur **Konzept + Prüfskript** baubar. Grösster *sofort baubarer* Nutzen: Server-/Bridge-Härtung, CSP/Allowlist, visibility-Gate.

## 1 · Bedrohungsmodell & Risiko-Matrix

**Assets:** A1 Büro-Daten (`private`) · A2 Schlüssel/Token · A3 Code/IP · A4 Verfügbarkeit · A5 Integrität.
**Angreiferklassen:** K1 Nutzer/Raubkopierer · K2 Netzwerk-Angreifer (LAN/VPN/offener Port) · K3 bösartige Eingabedatei · K4 Supply-Chain · K5 Fehlkonfiguration/Datenabfluss. Risiko = Eintritt × Schaden (1–3).

| # | Szenario | Nahtstelle | E | S | R | Batch |
|---|---|---|---|---|---|---|
| R1 | Private Daten leaken in Website-Publish/Seed | `build-kosmodata-seed.mjs` | 2 | 3 | 6 | B1 |
| R2 | Offener Sync-Server: fremder Client liest/schreibt, Raumnamen-Leak | `server.mjs` | 3 | 3 | **9** | B3 |
| R3 | Secret im Build/Repo/Artefakt | CI, `dist/` | 2 | 3 | 6 | B2 |
| R4 | Bridge-Pfad-Ausbruch + Upload-DoS | `main.py` `out`/`get_artifact` | 2 | 3 | 6 | B4 |
| R5 | Bösartige `.kosmo`/GLB crasht/verseucht App | Kernel-Parser, Import | 2 | 2 | 4 | B7 |
| R6 | Fehlende CSP: injizierter Content exfiltriert localStorage-Token | Tauri `csp:null`, PWA | 2 | 3 | 6 | B2 |
| R7 | Zu breite Tauri-FS-Rechte | `capabilities/default.json` | 2 | 2 | 4 | B2 |
| R8 | Raubkopie/geleakter Build ohne Herkunftsnachweis | kein Lizenz/Fingerprint | 3 | 2 | 6 | B5/B6 |
| R9 | Supply-Chain: manipuliertes Dep | CI, Lockfiles | 1 | 3 | 3 | B2 |
| R10 | Remote-Betrieb über Klartext abgehört | `betrieb.ts` | 2 | 3 | 6 | B8 |
| R11 | Unsigniertes Update untergeschoben | Tauri-Updater fehlt | 1 | 3 | 3 | B9 |

**Priorität:** R2 (9) zuerst, dann das Feld der 6er, danach 4er/3er. Build-Order nach «Nutzen pro Aufwand»: billige Härtungen (B1–B4) vor Anti-Copy (B5/B6) vor Firewall/Betrieb (B8/B9).

## 2 · Build-Order (Batches)

Jeder Batch: Feature → Tests(+E2E) → ROADMAP-Eintrag → deutscher Commit mit Trailern → Push. `exactOptionalPropertyTypes` (konditionale Spreads). **Kein Batch darf ein Golden verändern.**

### B1 — visibility-Leak-Gate · S · R1
Ziel: `private`-Daten gelangen NIE in Publish-/Export-/Seed-Pfad — als laufendes Test-Gate.
Nahtstellen: `tools/build-kosmodata-seed.mjs` · `packages/kosmo-data/` (Test).
Schritte: (1) reine Funktion `enthaeltPrivatspur(value): string[]` aus den Mustern in `build-kosmodata-seed.mjs` nach `@kosmo/data` extrahieren (`/\/mnt/`, `/\/home/`, `source-root`, `private-library`, `visibility:'private'`, absolute Windows-/OneDrive-Pfade). (2) Test: (a) jeder Eintrag des generierten `kosmodata-seed.json` → `enthaeltPrivatspur()==[]`; (b) synthetischer `private`-Eintrag wird vom Builder entfernt/redigiert; (c) kein Seed-Eintrag mit `visibility!=='public'`. (3) npm-Skript `test:leak` in `npm run test`.
Tests: neue `@kosmo/data`-Unit. Golden: unberührt.
Restgrenze: deckt bekannte Muster + Seed-Pfad; neuer Publish-Weg muss den Test einbinden.

### B2 — Secret-Scan-CI + CSP + Tauri-Allowlist · M · R3,R6,R7,R9
Nahtstellen: `.github/workflows/kosmo-orbit-ci.yml` · neues `tools/secret-scan.mjs` · `src-tauri/tauri.conf.json` · `src-tauri/capabilities/default.json` · `vite.config.ts`/`index.html`.
Schritte: (1) `tools/secret-scan.mjs` (Node, keine Dep) scannt `dist/` + Quelltext gegen `sk-ant-`, `AKIA`, `x-api-key:\s*\S`, generische 40+-Hex/Base64, `.env`-Leichen; CI-Step nach Build, bricht bei Treffer ab. (2) `npm audit --audit-level=high` als sichtbares Warngate (`|| true`). (3) CSP in Tauri statt `null`: `default-src 'self'; connect-src 'self' https://api.anthropic.com http://localhost:* https://architekturkosmos.ch ws://localhost:* wss://*; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'` — **vor dem Zunageln real gegen `tauri dev` prüfen**, sonst weisse App. (4) Tauri-FS `$HOME/**` → real genutzte Unterpfade. (5) PWA-CSP-Meta in `index.html`.
Tests: volle Suite + volle Playwright dürfen NICHT brechen; Unit für `secret-scan.mjs`. Golden: unberührt.
Restgrenze: CSP erschwert Exfiltration, verhindert sie nicht bei nativem Zugriff; `npm audit` nur bekannte CVEs.

### B3 — Sync-Server-Härtung · M · R2 (höchstes Risiko)
Nahtstellen: `tools/sync-server/src/server.mjs` · `e2e/sync-haerte.spec.ts`.
Schritte: (1) `crypto.timingSafeEqual`-Token-Vergleich. (2) `GET /raeume` bei Token-Pflicht ebenfalls Token verlangen; `Access-Control-Allow-Origin` aus Env `KOSMO_SYNC_ORIGIN` (Default `*` nur ohne Token). (3) Nachricht-Grössen-Deckel `maxPayload` (Env `KOSMO_SYNC_MAX_BYTES`, ~8 MB). (4) Rate-Limit pro IP (Map+Zeitfenster, kein Dep). (5) TLS-Hinweis in README/Startlog. (6) Startlog bleibt ehrlich.
Tests: `sync-haerte.spec.ts` erweitern (`/raeume`-Schutz, Übergrossen-Verwurf); bestehende Sync-E2E grün; Specs skippen ehrlich ohne `sync-server/node_modules`. Golden: unberührt.
Restgrenze: ein geteilter Token pro Server (keine Pro-Raum-ACL); ohne TLS (B8) Token im LAN abhörbar.

### B4 — Bridge-Härtung (echte Bugs + Deckel) · M · R4
Nahtstellen: `tools/homestation-bridge/kosmo_bridge/main.py` · Bridge-README.
Schritte: (1) **`out` serverseitig erzwingen** (nicht `setdefault`) → immer `job_dir/out`, Client-`out` ignorieren. (2) `get_artifact`/`get_job` Pfad-Prüfung: `p.resolve().relative_to(STORE.resolve())` in try/except + Ablehnung von `name` mit `/` oder `..`. (3) Upload-Grössen-Deckel (`KOSMO_BRIDGE_MAX_UPLOAD`, model ~200 MB, Frame ~500 KB) → `413`; Frame-Anzahl deckeln. (4) `secrets.compare_digest`-Token. (5) `--host` Default `127.0.0.1` (0.0.0.0 nur explizit). (6) CORS aus Env `KOSMO_BRIDGE_ORIGIN`, Default eng.
Tests: Fake-Worker-E2E grün; leichte Python-Prüfung/Smoke für Pfad-Ausbruch + Deckel; Bind-Default `127.0.0.1` E2E-kompatibel (Playwright gegen `localhost:8600`). Golden: unberührt.
Restgrenze: Bridge bleibt im vertrauenswürdigen Büronetz; ohne Token offen (ehrlich im Log).

### B5 — Anti-Copy Stufe 1: Fingerprint in Exporten · M · R8
Nahtstellen: `.kosmo`-Export (`state/project-vault.ts`) · `modules/publish/export-sheets.ts` · **NICHT** `plansvg.ts` (Golden-Schutz!).
Schritte: (1) `.kosmo`-Export additiv `herkunft: {editionId, exportedAt, docHash}` im **Export-Wrapper** (nicht im Doc-Modell). (2) PDF/SVG-Set-Export dezente Kennung nur in `export-sheets.ts` (PDF-Metadaten bzw. SVG-`<metadata>`), nie im Golden-Pfad. (3) datenschutzkonform dokumentieren.
Tests: Unit für Wrapper-Feld + Hash-Stabilität; **Beweis-Test `plansvg`-Golden byte-identisch**. Golden: **muss unberührt bleiben**.
Restgrenze: clientseitig entfernbar → Nachweis bei fahrlässigem Leak, nicht gegen entschlossene Entfernung.

### B6 — Anti-Copy Stufe 2: signierte Lizenz + Server-Bindung (der wirksame Hebel) · L · R8
Nahtstellen: `tools/sync-server/src/server.mjs` (`onAuthenticate`) · `tools/homestation-bridge/main.py` (`token_guard`) · neues `packages/kosmo-lizenz/` (reine Verify) · `betrieb.ts`/`KosmoPanel.tsx`.
Schritte: (1) Lizenz `{inhaber, edition, gueltigBis, ausgestelltAm}` + Ed25519-Signatur; privater Key **beim Owner**, Public Key im Build; Verify in `@kosmo/lizenz` (Web Crypto). (2) Offline-Verify beim Start = Reibung (kein hartes Aussperren lokaler Arbeit). (3) **Server-Bindung**: Sync `onAuthenticate` + Bridge `token_guard` akzeptieren signierte Lizenz, prüfen `gueltigBis` + Widerrufsliste → Sync/Render nur mit gültiger Lizenz. (4) Widerrufsliste (Lizenz-IDs).
Tests: `@kosmo/lizenz`-Unit (gültig/abgelaufen/manipuliert/falscher Key); Sync-/Bridge-Auth erweitern; E2E mit gültiger Test-Lizenz grün, ohne Lizenz ehrlicher Hinweis. Golden: unberührt.
Restgrenze (ehrlich): Public Key im Client patchbar → Offline-Verify allein umgehbar (nur Reibung); nur **Server-Bindung** ist hart und schützt nur server-abhängige Funktionen. Braucht Owner-Signing-Key-Verwahrung.

### B7 — Parser-Robustheit / Import-Fuzzing · S · R5 (früh/parallel möglich)
Nahtstellen: `.kosmo`-Laden (`project-vault.ts`) · GLB/Splat-Import (`modules/vis`, kernel `gltf.ts`) · JSON-Parse.
Schritte: (1) `.kosmo`-Laden durch zod/Guard; `__proto__`/`constructor`-Keys ablehnen. (2) Fuzz-Units: abgeschnittene/übergrosse/fehlerhafte GLB & `.kosmo` → definierter Fehler, kein Crash/State-Write. (3) Grössen-/Tiefen-Deckel beim Parse.
Tests: neue Kernel-/App-Units mit Korpus kaputter Dateien; Import-E2E grün. Golden: unberührt.
Restgrenze: deckt bekannte Fehlklassen; valide-aber-bösartige Geometrie bleibt Rechenlast-Frage.

### B8 — Firewall- & Netzarchitektur-Konzept + Prüfskripte · M (Doku+Skript) · R10
Nahtstellen: neues `docs/FIREWALL-KONZEPT.md` · `betrieb.ts` · neues `tools/netz-check.mjs`.
Schritte: (1) Regelsätze je Modus (Standard: Bridge/Sync nur localhost/LAN; Remote: nur WireGuard + `wss`/mTLS; Cloud: nur ausgehend TLS) + HomeStation-Checkliste (ufw/nftables, Ports 8600/8700/11434 nur LAN/VPN). (2) `betrieb.ts` optional `remoteTls?: boolean` → `wss`/`https` (konditionaler Spread; Default unverändert). (3) `tools/netz-check.mjs` prüft, dass Standard-Konfig keine Ports übers Internet öffnet.
Tests: `betrieb.ts`-Unit (TLS-Adressbau, Default unverändert); `netz-check.mjs`-Smoke. Golden: unberührt.
Restgrenze: reale Firewall/VPN/TLS = HomeStation-/Router-Arbeit; R10 erst mit HomeStation-Umsetzung geschlossen.

### B9 — Betrieb & Notfall · S–M · R11, Incident
Nahtstellen: Sync/Bridge (Sicherheits-Logging) · neues `docs/INCIDENT-PLAYBOOK.md` · `docs/HOMESTATION-AUFTRAG.md`.
Schritte: (1) fehlgeschlagene Auth / Lizenz-Fehlschläge / verworfene Übergrossen strukturiert (JSON-Zeile) loggen. (2) Incident-Playbook: Key-Leak → Rotation; geleakte Kopie → Fingerprint-Forensik (B5); verdächtiger Zugriff → Log-Prüfung. (3) Update-Sicherheit + Backup als HomeStation-Punkte ehrlich benennen (Tauri-Updater braucht Owner-Signing-Keys).
Tests: Logging-Unit. Golden: unberührt.
Restgrenze: signierte Updates + Backup-Verschlüsselung + Key-Verwahrung = Infrastruktur, nicht in der Cloud baubar.

## 3 · Anti-Copy — ehrliches Urteil
- **Clientseitig grundsätzlich umgehbar:** Offline-Lizenzprüfung (Public Key patchbar), Anti-Tamper-Hash, Wasserzeichen → Reibung + Nachweisbarkeit, nie Garantie. Rein lokale Standard-Edition ist prinzipiell kopierbar — ehrlich sagen.
- **Real wirksam:** **Server-Bindung** (B6 Stufe 2). Cloud-KI/Sync/Render laufen ohnehin über Server → lizenzgebundene, server-durchgesetzte Autorisierung ist der einzige Client-Patch-feste Hebel.
- **Empfehlung:** B5 (Fingerprint, billig) + B6 (Server-Bindung, echter Hebel); Offline-Verify nur als benannte Reibung. Anti-Tamper-Hash NICHT priorisieren.

## 4 · Was bewusst NICHT geht / offen benannt
Kein «unhackbar». Signierte Desktop-Updates brauchen Owner-Signing-Keys (Infrastruktur). TLS/VPN/Firewall terminieren auf HomeStation/Router (B8 liefert Konzept + App-`wss` + Prüfskript). Lizenz-Signing-Key-Verwahrung ist Owner-Infrastruktur. Echte Raum-ACL braucht Nutzerkonten (L, ausgeklammert). Verschlüsseltes Büro-Backup läuft auf der HomeStation.

## 5 · Abnahmekriterien je Batch

| Batch | Grün wenn |
|---|---|
| B1 | Leak-Test in `npm test`; synthetischer `private`-Eintrag nachweislich redigiert; Seed 0 Privatspuren, alle `public` |
| B2 | Secret-Scan bricht bei Test-Key ab, grün bei sauberem `dist/`; CSP gesetzt & App startet in `tauri dev` sichtbar; FS ohne `$HOME/**`; volle Suite + E2E grün |
| B3 | `sync-haerte.spec.ts` beweist `/raeume`-Schutz + Grössen-Deckel + Rate-Limit; bestehende Sync-E2E grün |
| B4 | Client-`out` ignoriert (Test); Nachbarordner-Trick abgewiesen; Upload über Deckel → 413; Fake-Worker-E2E grün; Bind `127.0.0.1` E2E-kompatibel |
| B5 | Export-Wrapper/PDF trägt Fingerprint; **`plansvg`-Goldens byte-identisch**; Doku |
| B6 | `@kosmo/lizenz`-Verify besteht 4 Fälle; Sync/Bridge lehnen ungültige ab, akzeptieren gültige; App offline nutzbar mit Hinweis; Widerruf greift |
| B7 | Korpus kaputter Dateien → definierte Fehlermeldung, kein Crash/State-Write; Import-E2E grün |
| B8 | `FIREWALL-KONZEPT.md` mit Regelsätzen je Modus; `betrieb.ts` `wss`/`https` unit-getestet, Default unverändert; `netz-check.mjs` läuft |
| B9 | Sicherheits-Ereignisse strukturiert geloggt (Unit); `INCIDENT-PLAYBOOK.md` deckt Key-Leak/Kopie/Zugriff; HomeStation-Punkte offen benannt |

**Reihenfolge:** B1 → B2 → B3 → B4 (billige Härtung, grösster Sofort-Nutzen, Cloud-baubar) → B5 → B6 (Anti-Copy) → B8 → B9 (Firewall/Betrieb). B7 früh/parallel (klein, isoliert).

**Zwei reale Bugs, die B4 schliesst:** (1) Bridge `create_job` übernimmt client-`out` via `setdefault` → Schreibziel-Injektion; (2) `get_artifact`-`startswith`-Pfadprüfung lässt Nachbarordner durch. Beide ausnutzbar, sobald die Bridge im Netz erreichbar ist.
