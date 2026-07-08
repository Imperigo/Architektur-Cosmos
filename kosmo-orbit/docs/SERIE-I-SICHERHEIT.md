# Serie I — Cybersecurity, Kopierschutz & Härtung (Owner-Auftrag, V2/Fable, ultracode)

> Owner (06.07.2026): «Baue mir eine intelligente (ultracode) Cybersecurity und
> Sicherheitsmassnahmen, Anti-Copy-System für die Software. Baue Konzepte und
> Strategien wie wir eine Firewall aufbauen und das System unhackable machen.»

## Ehrliche Vorbemerkung (Prinzip: Ehrlichkeit vor Politur)
**«Unhackbar» gibt es nicht.** Jedes System, das ein Nutzer auf seiner Maschine
ausführt, ist prinzipiell analysierbar; jeder Kopierschutz auf Client-Seite ist
umgehbar, gegeben genug Aufwand. Realistisches Ziel: **so hart wie sinnvoll** —
die Kosten eines Angriffs/einer Raubkopie deutlich über den Nutzen heben,
Angriffsfläche minimieren, Einbrüche früh erkennen, Schaden begrenzen. Alles
Folgende ist **defensiv** (eigene Software des Büros, legitimer Kopier-/
Missbrauchsschutz) — keine Angriffswerkzeuge.

Serie I ist ein **ultracode-Mehrstufen-Auftrag**: Fable urteilt über
Bedrohungsmodell & Härteste, Opus orchestriert, Sonnet setzt um. Jede Stufe: erst
Konzept, dann verifizierte Umsetzung, ehrlich benannte Restrisiken.

## I1 — Bedrohungsmodell (zuerst, sonst blind)
Bevor irgendeine Massnahme: **wogegen** verteidigen wir? KosmoOrbit ist lokal-first
(Browser/PWA + Tauri-Desktop + Yjs-Sync + optionale Cloud/Bridge). Assets:
- **Code/IP** (der TS-Kernel, Command-Ebene, Kosmo-Prompts/Personas).
- **Büro-Daten** (Referenzen, Wissen, Training, Gedächtnis, HDD-Archiv — teils
  `visibility:'private'`, dürfen NIE ungewollt an die Website/nach aussen).
- **Schlüssel/Token** (Anthropic-Key/OAuth, Sync-Token, künftige Lizenz).
- **Verfügbarkeit** (HomeStation/Bridge, Sync-Server).
Angreifer-Klassen: neugieriger Nutzer/Raubkopierer · Netzwerk-Angreifer (VPN/Cloud)
· kompromittiertes Abhängigkeits-Paket (Supply-Chain) · Datenabfluss durch
Fehlkonfiguration. Ergebnis: priorisierte Risiko-Matrix (Eintritt × Schaden).

## I2 — Härtung der bestehenden Angriffsfläche (grösster Sofort-Nutzen)
Konkret an KosmoOrbits realer Fläche — vieles ist billig und wirkt sofort:
- **Secrets nie im Repo/Build** (bereits Owner-Regel): Token nur zur Laufzeit,
  Audit-Skript, das Builds/Artefakte auf Schlüsselmuster scannt (CI-Gate).
- **CSP / Tauri-Allowlist**: strikte Content-Security-Policy in der PWA; Tauri-v2
  Capabilities minimal (nur benötigte Commands/FS-Pfade freigeben).
- **Sync-Härtung** (Yjs/Hocuspocus): Token-Pflicht existiert (ROADMAP D4) —
  ergänzen um Raum-Autorisierung, TLS-Pflicht im Remote-Modus, Rate-Limit,
  Nachricht-Grössen-Deckel gegen Speicher-DoS.
- **`visibility`-Wall härten**: automatisierter Test/Gate, der beweist, dass
  `private`-Daten (Wissen/Training/Gedächtnis/Archiv) NIE in den Website-/Export-/
  Publish-Pfad gelangen — der wichtigste Datenabfluss-Riegel.
- **Dependency-Supply-Chain**: `npm audit`/Lockfile-Integrity im CI, gepinnte
  Versionen, minimale Rechte, `npm ci` gegen manipulierte Lockfiles absichern.
- **Eingaben validieren**: alle `.kosmo`-/IFC-/GLB-/Splat-Importe laufen schon durch
  zod/Parser — auf robuste Fehlerbehandlung (kein Crash/keine Prototype-Pollution
  bei bösartigen Dateien) prüfen, Fuzz-Tests für die Parser.

## I3 — Anti-Copy / Lizenzierung (ehrlich: erschweren, nicht verunmöglichen)
Client-seitiger Kopierschutz ist grundsätzlich umgehbar — Ziel ist **Reibung +
Nachweisbarkeit**, nicht Unmöglichkeit:
- **Lizenz-Modell**: signierte Lizenzdatei (asymmetrisch, öffentlicher Schlüssel im
  Build, privater beim Owner) mit Inhaber/Gültigkeit/Edition; offline verifizierbar,
  online optional gegengeprüft. Ehrlich: der öffentliche Schlüssel im Client ist
  patchbar — deshalb zusätzlich (nicht stattdessen):
- **Server-gebundene Funktionen**: was echten Wert hat und ohnehin Server braucht
  (Cloud-KI, Sync, künftige Render-/Splat-Jobs), an eine **konto-/lizenzgebundene
  Server-Autorisierung** knüpfen — das ist der wirksamste Anti-Copy-Hebel, weil er
  nicht rein client-seitig umgehbar ist.
- **Wasserzeichen/Fingerprint**: dezente, nachweisbare Kennung in Exporten (Pläne/
  .kosmo) zur Herkunftsverfolgung geleakter Kopien — datenschutzkonform, dokumentiert.
- **Anti-Tamper leichtgewichtig**: Integritätsprüfung der eigenen Kern-Bundles
  (Hash), ehrlich als «erhöht die Hürde», nicht als Bollwerk.

## I4 — Firewall & Netzarchitektur (die drei Betriebsarten absichern)
KosmoOrbit hat Standard(HomePC)/Remote(VPN)/Cloud (ROADMAP B1). Je Modus ein
klares Netz-Sicherheitsprofil:
- **Standard/HomeStation**: Bridge/Sync nur im LAN, Host-Firewall-Regeln
  (nur benötigte Ports, nur lokale/VPN-Quellen), kein offener Port ins Internet.
- **Remote/VPN**: Zugang ausschliesslich über VPN (WireGuard o.ä.), keine direkte
  Port-Freigabe; mTLS zwischen Client und HomeStation.
- **Cloud**: nur ausgehende TLS-Verbindungen, Least-Privilege-Token, keine
  eingehenden Ports; Secrets in einem Tresor, nicht im Klartext.
- **Konzept-Deliverable**: `docs/FIREWALL-KONZEPT.md` mit konkreten Regelsätzen je
  Modus + eine HomeStation-Checkliste (die Firewall selbst läuft auf der
  HomeStation/dem Router — Umsetzung dort, hier das Konzept + Prüfskripte).

## I5 — Erkennung, Betrieb & Notfall
- **Logging/Monitoring**: sicherheitsrelevante Ereignisse (fehlgeschlagene Auth,
  ungewöhnliche Sync-Muster, Lizenz-Fehlschläge) strukturiert protokollieren.
- **Backup/Recovery**: die Büro-Daten (Wissen/Archiv) versioniert & verschlüsselt
  sichern; getesteter Wiederherstellungsweg.
- **Incident-Playbook**: was tun bei Key-Leak / verdächtigem Zugriff / geleakter
  Kopie (Rotation, Widerruf, Forensik über Fingerprint).
- **Update-Sicherheit**: signierte Desktop-Updates (Tauri-Updater braucht
  Owner-Signing-Keys — HomeStation-Punkt) statt unsignierter Installer.

## Reihenfolge (Vorschlag)
I1 (Bedrohungsmodell) → I2 (Härtung, grösster Sofort-Nutzen, viel davon Cloud-
baubar) → I4-Konzept (Firewall-Doku) → I3 (Lizenz/Anti-Copy) → I5 (Betrieb/Notfall).
Vieles aus I2 ist **jetzt** in der Cloud baubar (CSP, visibility-Gate,
Secret-Scan-CI, Sync-Härtung, Parser-Fuzzing); I3/I4/I5 haben HomeStation-/
Konto-/Router-Anteile, die ehrlich dorthin gehören.

## I2-Nachtrag (08.07.2026) — Sicherer-Standard-Batch (Bridge-Bind)

Fable-Befund aus dem Nachtbetrieb: `main.py` druckte beim Fehlen von
`KOSMO_BRIDGE_TOKEN` unbedingt «Bridge ist im Netz offen» — unabhängig vom
tatsächlichen Bind-Host. **Ehrlicher Ist-Zustand-Check (Prinzip: Ehrlichkeit
vor Politur):** der reale Befund war **kleiner als der Wortlaut nahelegte**.
Batch B4 (siehe oben) hatte den `--host`-Default bereits auf `127.0.0.1`
gesetzt — die Bridge band nie standardmässig `0.0.0.0`. Der Bug war die
**Meldung**, nicht der Bind: eine rein lokale Bridge (`127.0.0.1`) meldete
sich fälschlich als «im Netz offen», was Owner/Admins in die Irre führen
konnte (entweder unnötig beunruhigend, oder — schlimmer — abstumpfend für den
Fall, dass wirklich mal `--host 0.0.0.0` gesetzt ist).

Prinzip dieses Nachtrags: **sichere Standards, laute Ausnahmen.**

- **Meldung präzisiert**: Ohne Token + lokaler Host → «Bind bleibt bei
  127.0.0.1 (nur diese Maschine erreicht die Bridge, kein Netzzugriff)» statt
  der pauschalen «im Netz offen»-Zeile.
- **Neues Gate für den unauthentifizierten LAN-Fall**: `--host` ungleich
  `127.0.0.1`/`localhost` **ohne** `KOSMO_BRIDGE_TOKEN` verweigert den Start
  (`BridgeBindFehler`, Exit-Code 1), sofern nicht **explizit** bestätigt via
  `--offen-ohne-token` bzw. `KOSMO_BRIDGE_OFFEN=1` — dann startet die Bridge
  mit einer unübersehbaren Warnzeile (`!`×70 + `⚠⚠⚠`-Banner). Kein stilles
  Offen mehr; vorher liess sich `--host 0.0.0.0` ohne Token kommentarlos
  starten.
- **Mit Token bleibt alles wie in B4**: Host frei konfigurierbar (LAN-Betrieb
  ist der Sinn der Bridge), nur ein informativer Hinweis im Log.
- **`--fake-worker`-Testbetrieb (CI/E2E/Container, `127.0.0.1:8600`)
  unverändert**: Default-Host + kein Token → kein Token nötig, keine
  Ablehnung, nur die präzisierte Meldung. `.github/workflows/kosmo-orbit-ci.yml`
  und `CLAUDE.md` starten die Bridge ohne `--host`, treffen also immer den
  lokalen, nie den Ablehnungs-Zweig.

**Betriebsmatrix:**

| Modus | Host | Token | `--offen-ohne-token`/`KOSMO_BRIDGE_OFFEN` | Ergebnis |
|---|---|---|---|---|
| Lokal (Default, auch `--fake-worker`) | `127.0.0.1`/`localhost` | egal | egal | startet, präzise Meldung, kein Netzzugriff |
| LAN + Token (empfohlener Büronetz-Betrieb) | z.B. `0.0.0.0` | gesetzt | egal | startet, Token-Pflicht wie B4 |
| Offen-bewusst | z.B. `0.0.0.0` | **nicht** gesetzt | gesetzt | startet, unübersehbare Warnung |
| Silentes Offen (neu blockiert) | z.B. `0.0.0.0` | **nicht** gesetzt | **nicht** gesetzt | **Start verweigert** (Exit 1) |

**Tests**: `tools/homestation-bridge/test_bridge_haerte.py` §9 (6 neue Prüfungen:
lokal ohne Token → präzise Meldung; LAN mit Token → kein Fehlschlag; LAN ohne
Token/ohne Flag → `BridgeBindFehler`; LAN ohne Token/mit Flag → laute Warnung;
`--fake-worker`-Default unverändert; Token-Header weiterhin verlangt wenn
gesetzt). Zusätzlich echte Prozessläufe verifiziert (`python3 main.py --host
0.0.0.0 …` ohne Flag → Exit 1 mit Fehlertext; mit `--offen-ohne-token` bzw.
`KOSMO_BRIDGE_OFFEN=1` → startet mit Warnbanner; Default → startet lokal).

**Secret-Scan-Lücke geschlossen**: `tools/secret-scan.mjs` scannte nur
`kosmoOrbitRoot` (= `kosmo-orbit/`) — `wissen/vault/` und `wissen/training/`
(Obsidian-Vault + LoRA-Trainingskorpus, Geschwister-Verzeichnis im selben
Repo, siehe I1 «Büro-Daten» als Asset) lagen **ausserhalb** des Scan-Bereichs
und wurden nie geprüft. Jetzt zusätzlich per `scanWissen()` erfasst (dieselben
drei präzisen Regeln wie bei `dist/`, keine generische Hoch-Entropie-Regel —
Prosa/Trainingsdaten hätten dort zu viele Falsch-Treffer erzeugt). Fehlt
`wissen/` in einer Umgebung (z.B. isolierter Checkout), wird ehrlich
übersprungen statt zu crashen. Test: `tools/secret-scan.test.mjs` §7 (4 neue
Prüfungen inkl. Regression gegen den echten `wissen/`-Baum — aktuell 0 Funde).

**Tauri-CSP/Allowlist (nur verifiziert, keine Änderung nötig)**: die neuen
DXF-/PDF-Importe (`DesignWorkspace.tsx`) lesen ausschliesslich über die
Browser-File-API (natives `<input type="file">`, `File.arrayBuffer()`/
`.text()`) — kein `@tauri-apps/plugin-fs`, kein `@tauri-apps/plugin-dialog`,
kein Netzwerk-Fetch. Lokale Datei-/Blob-Reads sind kein CSP-relevanter
Netzwerkzugriff und brauchen keine Tauri-Capability; `tauri.conf.json`
(CSP) und `capabilities/default.json` (FS-Allowlist) wurden im Zuge dieser
Importe nachweislich nicht verändert (git-history-Check).

**`npm audit --omit=dev`**: 0 Findings (verifiziert 08.07.2026) — nichts zu
reparieren, was nicht kaputt ist.

## Grenzen (ehrlich, verbindlich)
- Kein «unhackbar» — jede Massnahme wird mit ihrem realen Schutzgrad und ihrer
  Umgehbarkeit benannt.
- Client-seitiger Kopierschutz = Reibung, nicht Garantie; der wirksame Hebel ist
  Server-Bindung wertvoller Funktionen.
- Keine Angriffs-/Umgehungs-Werkzeuge, keine Detection-Evasion — rein defensiv.
