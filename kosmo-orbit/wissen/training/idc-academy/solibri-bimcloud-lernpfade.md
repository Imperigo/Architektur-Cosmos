# IDC ACADEMY — Lernpfade Solibri + BIMcloud (Erfassung Teil 2/3)

## 1 · Kopf: Quelle, Datum, Zugriffslage

- **Quelle:** https://academy.idc.ch (IDC ACADEMY, Lernplattform der IDC AG,
  Schweiz — Anbieter für ArchiCAD/Solibri/BIMcloud-Schulungen)
- **Erfasst am:** 22.07.2026, per `WebFetch` (automatisierte HTML→Markdown-
  Zusammenfassung durch ein Hilfsmodell, keine manuelle Sichtprüfung jeder
  Rohseite)
- **Erfasste Übersichtsseiten:**
  `/lernpfade` (Gesamtübersicht), `/lernpfade/solibri`, `/lernpfade/bimcloud`
  sowie alle 7 darunterliegenden Teil-Lernpfad-Seiten (siehe Kap. 2/3) und
  6 Stichproben-Modulseiten (Kap. 4).
- **Zugriffslage:** Es wurde **kein Login versucht und kein Konto verwendet**.
  Alle erfassten Seiten (Lernpfad-Übersichten, Teil-Lernpfad-Seiten,
  Modul-Landingpages) waren **ohne Anmeldung öffentlich lesbar** — Titel,
  Kurzbeschreibung, Dauer, Modul-ID und (teils) Publikationsdatum sind
  öffentliche Metadaten. Der **Voll-Inhalt der Module** (Lernvideos/-texte,
  Übungen, Zertifikatsprüfung) ist auf allen sechs stichprobenartig
  geöffneten Modulseiten ausdrücklich als **"Content restricted to
  registered users; login required"** markiert — dort endet die Erfassung.
  Drei Solibri-Module («Programmstart», «Modellnavigation»,
  «Modellstruktur») sind laut Übersichtsseite mit **«Free»** markiert und
  damit vermutlich auch inhaltlich ohne Login zugänglich; das wurde nicht
  verifiziert (keine Free-Modulseite war in der Stichprobe).
- **Eine Unstimmigkeit, ehrlich vermerkt:** Bei zwei der sechs
  Stichproben-Modulseiten (BIMcloud «Reservieren», «Projekte - Teams») wies
  die automatisierte Zusammenfassung einen Status **«Gelesen»** aus, obwohl
  dieselbe Zusammenfassung im selben Atemzug meldet, der Inhalt sei
  login-pflichtig. Das wurde **nicht** durch einen eigenen Login geprüft —
  es könnte ein Anzeige-Detail sein, das auch anonym sichtbar ist (z.B. ein
  generischer UI-Baustein), oder eine Ungenauigkeit der automatisierten
  Zusammenfassung selbst. Als reine Fussnote aufgeführt, nicht als
  gesicherter Fakt.
- **Struktur-Überraschung:** Die zwei vom Auftrag genannten URLs
  (`/lernpfade/solibri`, `/lernpfade/bimcloud`) sind selbst noch keine
  Modullisten, sondern **Übersichten über mehrere Teil-Lernpfade**
  (Solibri: 2, BIMcloud: 5 unter «Management» und «Teamwork»). Die
  eigentlichen Module hängen jeweils eine Ebene tiefer.

## 2 · Lernpfad Solibri

Übersicht `/lernpfade/solibri`: 2 Teil-Lernpfade, beide zertifizierbar.

### 2.1 Teil-Lernpfad «Erste Schritte» — 13 Module, ~4h10min

`/lernpfade/solibri/erste-schritte`

| # | Titel | Dauer | Modul-ID | Frei? | Kurzbeschreibung (Zitat) |
|---|---|---|---|---|---|
| 1 | Programmstart | ~15 min | 380 | Free | «Beim Programmstart beginnen die ersten Schritte mit Solibri. Wir zeigen das Vorgehen und geben Tipps zu den wichtigsten Grundeinstellungen.» |
| 2 | Rolle laden | ~20 min | 268 | | «Was sind Rollen und was ist deren Funktion? In diesem Modul lernen Sie, wie Sie Rollen korrekt verwenden.» |
| 3 | Kurzname, Disziplin und Kategorie | ~30 min | 357 | | Strukturierung von Projekten via Kurzname/Disziplin/Kategorie im Koordinationsmodell. |
| 4 | Modellnavigation | ~15 min | 376 | Free | Navigationstechniken inkl. Rotation und «Play»-Modus. |
| 5 | Layouts und Ansichten | ~10 min | 375 | | Anpassung von Arbeitsbereich-Layouts und Ansichten. |
| 6 | Modellstruktur | ~30 min | 373 | Free | Arbeiten mit der Modellstruktur zur Anzeige von Bauteilen/Informationen. |
| 7 | Informationsfenster - Struktur und Aufbau | ~15 min | 361 | | Einführung ins Informations-Werkzeug/-fenster. |
| 8 | Informationsfenster - Mengen | ~10 min | 270 | | «Hier erfahren Sie, wie Mengenwerte in Solibri berechnet werden und wo sie zu finden sind.» |
| 9 | Informationsfenster - Beziehungen | ~10 min | 271 | | Nutzung von Bauteilbeziehungen im Informationsfenster. |
| 10 | Kontextmenü im Informationsfenster | ~20 min | 272 | | Filter, Klassifikationen, Auswertungen und Favoriten per Kontextmenü. |
| 11 | Modellprüfung ausführen | ~15 min | 378 | | «Dieses Modul erklärt Schritt für Schritt, wie Sie Ihre erste Modellprüfung in Solibri durchführen.» |
| 12 | Prüfergebnisse analysieren | ~40 min | 377 | | Auswertung von Prüfergebnissen als Basis für die Kommunikation von Modellproblemen. |
| 13 | Präsentationen erstellen | ~20 min | 379 | | Erstellung von Präsentationen zur Strukturierung/Priorisierung relevanter Probleme. |

### 2.2 Teil-Lernpfad «IDS-Workflow» — 5 Module, ~2h10min

`/lernpfade/solibri/ids-workflow`

| # | Titel | Dauer | Modul-ID | Kurzbeschreibung (Zitat) |
|---|---|---|---|---|
| 1 | Solibri IDS-Editor | ~40 min | 396 | «Mit dem IDS-Editor definieren Sie Anforderungen an ein BIM-Modell, die in der Modellierungssoftware umgesetzt und in Solibri geprüft werden können.» |
| 2 | IDS-Import in ArchiCAD | ~15 min | 397 | «Der Import einer IDS-Datei konfiguriert Eigenschaften und Klassifizierungen, sowie IFC-Übersetzereinstellungen.» (Hinweis: ArchiCAD 28+) |
| 3 | IDS-Validierung mit Solibri | ~15 min | 398 | «In Solibri Office können Sie eine IDS-Datei per Drag & Drop importieren und IFC-Modelle gegen die definierten Anforderungen prüfen.» |
| 4 | Prüfergebnisse analysieren | ~40 min | 377 | (identisch mit 2.1 #12 — dasselbe Modul, in beide Teil-Lernpfade eingehängt) |
| 5 | Präsentationen erstellen | ~20 min | 379 | (identisch mit 2.1 #13) |

**Solibri gesamt:** 2 Teil-Lernpfade, 18 Modul-Einträge, davon 2 doppelt
verlinkt (377, 379) → **16 einzigartige Module**.

## 3 · Lernpfad BIMcloud

Übersicht `/lernpfade/bimcloud`: 5 Teil-Lernpfade in zwei Gruppen
(«Management»: 3, «Teamwork»: 2), alle zertifizierbar.

### 3.1 Gruppe «Management»

#### 3.1.1 «Allgemeines & Server» — 8 Module, ~33 min

`/lernpfade/bimcloud/allgemeines-server`

| # | Titel | Dauer | Modul-ID | Kurzbeschreibung (Zitat) |
|---|---|---|---|---|
| 1 | Login Fenster und Startseite | ~3 min | 276 | «Nach erfolgreicher Anmeldung an der BIMcloud Weboberfläche gelangt man als erstes zur Startseite» |
| 2 | Dashboard | ~4 min | 277 | «Das Dashboard ist die Informations-Seite der BIMcloud, auf welcher verschiedene Meldungen aufzufinden sein können» |
| 3 | Server - Einleitung und Einstellungen | ~8 min | 278 | «Im Menü Server der BIMcloud erhalten Server-Administratoren Einblick in die Installations- und Konfigurations-Einstellungen» |
| 4 | Server - LDAP | ~5 min | 280 | «In der BIMcloud besteht die Möglichkeit, eine LDAP-Anbindung einzurichten, über welche Benutzer automatisch synchronisiert werden» |
| 5 | Server - Lizenzen | ~3 min | 282 | «Im Reiter Lizenzen gibt es einen Überblick über die aktuell verwendeten Lizenzen» |
| 6 | Server - Backups | ~4 min | 283 | «Anhand dem Disaster Recovery Backup wird eine BIMcloud für Notfälle oder geplante Migrationen optimal gesichert» |
| 7 | Server - Aktivitäten | ~3 min | 284 | «Im Reiter Aktivitäten des Server-Menüs wird die Serverauslastung, sowie Teamwork-Aktivitäten der Nutzer dargestellt» |
| 8 | Server - Projekte und Bibliotheken | ~3 min | 285 | «Bei Projekte und Bibliotheken auf der Server-Komponente gibt es einen Überblick über gespeicherte Projekte und deren Eigenschaften» |

#### 3.1.2 «Nutzer & Berechtigungen» — 5 Module, ~23 min

`/lernpfade/bimcloud/nutzer-berechtigungen`

| # | Titel | Dauer | Modul-ID | Kurzbeschreibung (Zitat) |
|---|---|---|---|---|
| 1 | Rollen | ~4 min | 287 | «Die Rollen dienen als Grundlage für die verschiedenen Benutzerberechtigungen und können individuell angepasst werden.» |
| 2 | Nutzer - Manuelle Nutzer Erstellung | ~3 min | 288 | «Nebst den automatischen LDAP-Nutzern können BIMcloud Nutzer auch manuell erstellt und verwaltet werden.» |
| 3 | Nutzer - Gruppen | ~3 min | 289 | «Für eine vereinfachte Organisation lassen sich Nutzer in verschiedene Gruppen unterteilen.» |
| 4 | Projekte - Berechtigungen | ~5 min | 291 | Zugriffsrechte für Nutzer/Gruppen auf Ordner und Dateien. |
| 5 | Projekte - Teams | ~8 min | 295 | «In einem BIMcloud-Projekt gibt es sogenannte Teams, um projektbezogene Benutzergruppen definieren und gezielt Berechtigungen verwalten zu können.» |

#### 3.1.3 «Alles rund um Projekte» — 6 Module, ~35 min

`/lernpfade/bimcloud/alles-rund-um-projekte`

| # | Titel | Dauer | Modul-ID | Kurzbeschreibung (Zitat) |
|---|---|---|---|---|
| 1 | Meine Anhänger | ~5 min | 286 | «Im BIMcloud Manager können Projekte, Bibliotheken usw. mit persönlichen Anhängern (Tags) organisiert und gefiltert werden.» |
| 2 | Projekte - Einleitung und Einstellungen | ~5 min | 290 | «Das Menü Projekte beinhaltet alle Einstellungen zu Projekten, Bibliotheken und Dateien, an welchen in Teamwork gearbeitet wird.» |
| 3 | Projekte - Snapshots | ~7 min | 293 | «Projekt-Snapshots werden in der BIMcloud automatisch erstellt und die Projekte können so auf einen früheren Stand zurückgesetzt werden.» |
| 4 | Projekte - Versionen | ~5 min | 294 | «Die BIMcloud beinhaltet eine Versionisierung sämtlicher Dateien und Ordner, anhand welcher bei Bedarf Dateien wiederhergestellt werden können.» |
| 5 | Projekte - Berechtigungen | ~5 min | 291 | (identisch mit 3.1.2 #4 — doppelt verlinktes Modul) |
| 6 | Projekte - Teams | ~8 min | 295 | (identisch mit 3.1.2 #5 — doppelt verlinktes Modul) |

### 3.2 Gruppe «Teamwork»

#### 3.2.1 «Arbeiten mit Teamwork» — 4 Module, ~14 min

`/lernpfade/bimcloud/arbeiten-mit-teamwork`

| # | Titel | Dauer | Modul-ID | Kurzbeschreibung (Zitat) |
|---|---|---|---|---|
| 1 | Öffnen / Beitreten eines Teamwork-Projektes | ~3 min | 298 | «Um die Zusammenarbeit in einem bereits bestehenden Teamwork-Projekt zu starten, muss in das Projekt beigetreten werden.» |
| 2 | Teamwork-Palette | ~3 min | 299 | «In einem Teamwork-Projekt ist die Teamwork-Palette von zentraler Bedeutung und anhand dieser werden die Arbeitsschritte gesteuert.» |
| 3 | Senden und Empfangen | ~3 min | 300 | «Der Befehl Senden und Empfangen ermöglicht, Änderungen in Teamwork-Projekten zu speichern und zu synchronisieren.» |
| 4 | Reservieren | ~5 min | 301 | «Mit dem Befehl Reservieren können Arbeitsbereiche reserviert und anschliessend bearbeitet werden.» |

#### 3.2.2 «Organisation von Teamwork-Daten» — 4 Module, ~14 min

`/lernpfade/bimcloud/organisation-von-teamwork-daten`

| # | Titel | Dauer | Modul-ID | Kurzbeschreibung (Zitat) |
|---|---|---|---|---|
| 1 | Eröffnung eines Teamwork-Projektes | ~3 min | 297 | «Um die Zusammenarbeit im Team starten können, muss ein ArchiCAD-Soloprojekt als Teamwork-Projekt auf die BIMcloud freigegeben werden.» |
| 2 | Bibliotheken verwalten | ~4 min | 302 | «Mit dem Bibliotheken-Manager in ArchiCAD werden die Bibliotheken auf die BIMcloud hochgeladen und verwaltet.» |
| 3 | Direktes Publizieren aus ArchiCAD auf die BIMcloud | ~4 min | 303 | «Dateien können direkt aus ArchiCAD auf die BIMcloud publiziert werden und so am selben Ort wie die Teamwork-Projekte abgelegt werden.» |
| 4 | Datei-Verlinkungen aus BIMcloud | ~3 min | 304 | «Dateien können direkt aus der BIMcloud als Hotlink oder Zeichnung in Teamwork-Projekte verknüpft werden.» |

**BIMcloud gesamt:** 5 Teil-Lernpfade, 27 Modul-Einträge, davon 2 doppelt
verlinkt (291, 295) → **25 einzigartige Module**.

## 4 · Stichprobe Modul-Metadaten (je 3 pro Lernpfad, Voll-Inhalt gesperrt)

Alle sechs Seiten zeigten übereinstimmend: kein Autor, keine Versionsnummer,
keine Tags/Voraussetzungen öffentlich sichtbar; Publikationsdatum wo
vorhanden meist «01.08.2025» (BIMcloud-Serie) bzw. gestaffelt bei Solibri.

| Modul | ID | Dauer | Publikationsdatum | Zertifiziert | Voll-Inhalt |
|---|---|---|---|---|---|
| Solibri: Programmstart | 380 | ~15 min | 01.08.2025 | ja | **frei zugänglich** (Free-Badge) |
| Solibri: Modellprüfung ausführen | 378 | ~15 min | 01.08.2025 | ja | login-pflichtig |
| Solibri: Solibri IDS-Editor | 396 | ~40 min | 21.10.2025 | ja | login-pflichtig |
| BIMcloud: Reservieren | 301 | ~5 min | 01.08.2025 | ja | login-pflichtig (Statusanzeige «Gelesen», siehe Fussnote Kap. 1) |
| BIMcloud: Server - LDAP | 280 | ~5 min | 01.08.2025 | (Lernpfad zertifiziert) | login-pflichtig |
| BIMcloud: Projekte - Teams | 295 | ~8 min | 01.08.2025 | ja | login-pflichtig (Statusanzeige «Gelesen», siehe Fussnote Kap. 1) |

Keine Versionsnummer war auf irgendeiner der sechs Seiten öffentlich
angegeben — nur bei «IDS-Import in ArchiCAD» (Kap. 2.2 #2) war indirekt eine
Software-Versionsanforderung («ArchiCAD 28+») aus der Kurzbeschreibung
ersichtlich.

## 5 · Anhang: öffentlich lesbare Struktur über die drei Lernpfade hinaus

Geprüft wie beauftragt: `/kurse`, `/module`, zusätzlich `/lernpfade`
(Hauptübersicht) — alle drei **ohne Login lesbar**, nur Titel/Struktur
erfasst, kein Fliesstext.

- **`/lernpfade` (Hauptübersicht):** Genau **drei** Lernpfad-Familien:
  ArchiCAD, Solibri, BIMcloud (`/lernpfade/archicad`, `/lernpfade/solibri`,
  `/lernpfade/bimcloud`) — die beiden erfassten sind also 2 von 3, ArchiCAD
  wurde auftragsgemäss nicht vertieft.
- **`/kurse`:** Öffentliche Kursliste mit 4 Kategorien — ArchiCAD, Solibri,
  BIM, Coaching. Sichtbare Kurstitel: A1 Einführung, A2 Organisation,
  A3 Ausführung (ArchiCAD), B1 Grundlagen, B2 Modellieren, B3 Koordination,
  B4 Management (BIM-Methodik-Kurse, hersteller-/software-übergreifend),
  S1 Grundlagen, S2 Vertiefung (Solibri). Zusätzlich Hinweise auf
  «Kursgutscheine» und «Lernpfade» als eigene Angebotsformen.
- **`/module`:** Durchsuchbarer Gesamtkatalog über alle drei Plattformen
  (ArchiCAD, Solibri, BIMcloud), mit Themengruppen wie «Alles rund um
  Treppen», «Alles rund um Geländer», «Alles rund um Fassaden»,
  Import/Export, Visualisierung, Detaillierung; Dauerangaben grob 5–120 min;
  einzelne Module mit «Free»-Badge. Titel/Dauer sind öffentlich, der
  Zugriff auf den Modulinhalt läuft über denselben Login wie bei den
  Lernpfad-Modulen.

## 6 · Analyse für KosmoOrbit

Getrennt nach Fakten (was IDC ACADEMY zeigt), was **KosmoOrbit bereits
selbst hat**, was ein Kandidat **zum Nachbauen** vorfinden würde, und wo
KosmoOrbit **bewusst anders** gebaut ist. Keine Code-Auszüge der IDC-Seiten
— nur eigene Beobachtung des KosmoOrbit-Repos, referenziert mit Dateipfad.

### 6.1 Solibri ↔ KosmoOrbit-Prüfwerkzeuge

**Solibri, laut den öffentlichen Modulbeschreibungen:** BIM-Modellprüfung
läuft über Rollen (vordefinierte Regelsätze), Kurzname/Disziplin/Kategorie
zur Modellzuordnung, eine Modellprüfung mit anschliessender
Prüfergebnis-Analyse und Präsentationen zur Priorisierung von Problemen;
der IDS-Workflow ergänzt das um einen eigenen IDS-Editor (Anforderungen
definieren), IDS-Import in die Modellierungssoftware (ArchiCAD) und
IDS-Validierung in Solibri selbst — also ein klassischer
Anforderung-definieren → modellieren → gegenprüfen-Kreislauf mit
Klassifikation als Bindeglied.

**Das hat KosmoOrbit bereits, strukturell ähnlich:**
`packages/kosmo-kernel/src/derive/checks.ts` — `pruefeGrundriss(doc,
storeyId)` liefert `PruefBefund[]` mit dreistufiger Schwere (`fehler` /
`warnung` / `hinweis`), stabiler `regelId` fürs UI-Filtern und Freitext.
Das ist regelbasierte Modellprüfung **auf der Parametrik, nicht auf
Pixeln** — laut Kommentar im Code ausdrücklich «Q12, Finch-Essenz» genannt
und damit erkennbar bereits mit dem Solibri-Muster (Regeln statt visueller
Prüfung) im Hinterkopf entworfen. Ergänzend gibt es
`pruefeBewegungsflaechen` (`derive/moebel.ts`) und Fluchtwege-Checks
(`derive/raumgraph.ts`) als weitere Regelmodule im selben Muster.

**Was ein Solibri-erfahrener Kandidat zum Nachbauen vorfinden würde:**
Die Rollen-/Regelsatz-Idee (Solibri «Rolle laden») hat in KosmoOrbit
**kein direktes Gegenstück** — es gibt keine ladbaren, pluggable
Regelsätze; die Regeln in `checks.ts` sind hart codierte TS-Funktionen, kein
konfigurierbares Regelwerk, das ein Nutzer selbst zusammenstellen könnte.
Ebenso fehlt ein IDS-Äquivalent (ein maschinenlesbares
Anforderungs-Austauschformat) komplett — KosmoOrbit prüft nur gegen die
eigenen, im Kernel fest verdrahteten CH-Wohnbau-Regeln, nicht gegen extern
importierte Anforderungskataloge.

**Bewusst anders gelöst:** Solibri ist ein **Nachgelagerter Prüf-Schritt**
auf einem bereits exportierten IFC-Modell (separate Software, separater
Import). KosmoOrbit prüft **live auf dem eigenen Doc-Modell**, während
modelliert wird — kein Export/Re-Import-Zyklus, keine zweite Anwendung.
Das ist eine bewusste Architekturentscheidung des Repos (`derive/`-Kommentar:
«Regeln laufen live auf der Parametrik»), keine zufällige Lücke.

Der im Auftrag erwähnte Begriff **«Wächter»** ist in KosmoOrbit **kein
einzelnes benanntes Prüf-Subsystem**, sondern ein durchgängig verwendetes
Namensmuster für Guard-Funktionen an ganz verschiedenen Stellen (Budget-
Wächter bei FreeMesh-Vertexlimiten, Token-Spiegel-Wächter für Design-Tokens,
Timeout-Wächter bei Renderjobs, Scan-Wächter, u.a. — siehe `ROADMAP.md`,
mehrfach). Es gibt also viele kleine, lokale Wächter statt eines
Solibri-artigen zentralen Prüf-Reports mit Rollen/Klassifikation.

### 6.2 BIMcloud ↔ KosmoSync/HomeServer

**BIMcloud, laut den öffentlichen Modulbeschreibungen:** Ein
Server-zentrierter Kollaborationsdienst mit Web-Management (Dashboard,
LDAP-Anbindung, Lizenzen, Backups, Aktivitätsübersicht), granularen
Rollen/Nutzern/Gruppen und projektbezogenen Teams mit Berechtigungen auf
Ordner-/Dateiebene, Projekt-Snapshots und Datei-Versionierung, sowie einem
expliziten Teamwork-Arbeitsablauf mit **Reservieren** (Arbeitsbereiche vor
der Bearbeitung sperren) und «Senden und Empfangen» als manuellem
Sync-Kommando.

**Das hat KosmoOrbit bereits, aber architektonisch anders:**
`packages/kosmo-sync/src/client.ts` (`SyncClient`) + `tools/sync-server/`
(Node, Yjs/Hocuspocus, Port **:8700**, siehe `docs/FIREWALL-KONZEPT.md`).
KosmoSync ist ein **CRDT-Ansatz** (Yjs `Y.Map<Entity>`, Entity-genaues
Last-Write-Wins) statt eines Lock-/Reservierungs-Modells: jede lokale
Änderung wird automatisch per `ydoc.transact` gespiegelt, entfernte
Änderungen fliessen ohne Undo-History direkt ins Doc, ein Offline-Puffer
läuft über `y-indexeddb` und merged beim Reconnect automatisch nach. Es
gibt einen optionalen Token (`tools/sync-server/src/lizenz-auth.mjs`) und
ein Sicherheits-Log (`sicherheits-log.mjs`), aber keine granularen
Rollen/Teams/Ordner-Berechtigungen wie BIMcloud — ein Raum (`room`) ist
entweder erreichbar (mit gültigem Token) oder nicht.

**Was ein BIMcloud-erfahrener Kandidat zum Nachbauen vorfinden würde:**
Kein Reservieren/Locking (Yjs braucht das konzeptionell nicht — CRDT löst
Konflikte automatisch statt sie durch Sperren zu verhindern), keine
Teams/Rollen/Berechtigungsmatrix pro Projekt/Ordner, keine LDAP-Anbindung,
kein Snapshot-/Versionierungs-Menü auf Serverseite, kein Web-Dashboard mit
Server-Aktivitäten-Reiter. Das ist bei einem Yjs-basierten Single-Doc-Sync
für ein Ein-Büro-Setup (siehe `docs/FIREWALL-KONZEPT.md`: «Standard
(HomePC)», alles auf einem Rechner, kein Internet-Inbound) auch fachlich
nicht zwingend nötig — würde aber bei Mehrbüro-/Mehrprojekt-Skalierung
fehlen.

**Bewusst anders gelöst:** BIMcloud ist explizit **Multi-Tenant/
Multi-Projekt mit Server-Administration** als eigenes Produkt gedacht (LDAP,
Lizenzverwaltung, Backups). KosmoOrbit/HomeServer (`docs/HOMESERVER-STATUS.md`,
`docs/HOMESTATION-AUFTRAG.md`) ist bewusst **lokal-first, ein Yjs-Raum je
Projekt/Doc, keine öffentliche Portfreigabe** (nur LAN/VPN/Tailscale laut
Firewall-Konzept) — die HomeStation ist als eigener Rechner des Büros
gedacht, nicht als gehosteter Multi-Kunden-Server wie BIMcloud. Das ist ein
bewusster Scope-Unterschied (Ein-Büro-Werkzeug vs. Multi-Projekt-Plattform),
keine fehlende Funktion.

### 6.3 Kurzfazit

Solibri-Bezug: KosmoOrbit hat den **Kern** (regelbasierte, parametrische
Prüfung mit gestufter Schwere) bereits — es fehlt der **konfigurierbare
Regelsatz/IDS-Import-Kreislauf**, den Solibri als eigenständiges Produkt
bietet; das ist im Kernel aktuell fest codiert statt austauschbar.

BIMcloud-Bezug: KosmoOrbit löst Team-Sync **strukturell anders** (CRDT statt
Lock/Reservieren) und bewusst kleiner im Scope (Ein-Büro-HomeStation statt
Multi-Tenant-Server) — Rollen/Teams/Berechtigungen pro Projekt/Ordner sind
das grösste tatsächliche Lücken-Feld, falls KosmoOrbit je mehrere Büros/
Kunden auf einem gemeinsamen Server bedienen sollte.
