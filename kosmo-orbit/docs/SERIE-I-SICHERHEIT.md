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

## Grenzen (ehrlich, verbindlich)
- Kein «unhackbar» — jede Massnahme wird mit ihrem realen Schutzgrad und ihrer
  Umgehbarkeit benannt.
- Client-seitiger Kopierschutz = Reibung, nicht Garantie; der wirksame Hebel ist
  Server-Bindung wertvoller Funktionen.
- Keine Angriffs-/Umgehungs-Werkzeuge, keine Detection-Evasion — rein defensiv.
