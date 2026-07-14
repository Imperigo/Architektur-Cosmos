# iPad-Touch-Drehbuch — «Intelligente Werkzeugtabs» auf echtem Gerät

> Owner-Drehbuch für v0.7.9 / B1 («Echtes iPad-Touch-Testen»). Prüft **nur** die
> neue Dock-/Touch-Schicht aus v0.7.8 Wellen 1–3 (`state/dock-kern.ts`,
> `shell/dock/*`, ROADMAP 353–359) — bisher ausschliesslich mit synthetischen
> Playwright-Pointer-Events geprüft, nie mit einem echten Finger auf echtem
> Glas. Das ist **keine** volle Abnahme (dafür: `docs/ABNAHME-DREHBUCH.md`),
> sondern ein gezielter Härtungs-Test einer einzelnen, neuen Schicht.
> Beleg der Lücke: ROADMAP 356 («Touch nur synthetisch (echtes iPad steht
> aus)»), `docs/V079-VORSCHLAG.md` Gruppe B/B1. Dauer: ~30–40 Minuten.
>
> **Ehrlich vorweg:** dieses Drehbuch selbst braucht **keine** HomeStation —
> reines UI-/Touch-Testen läuft vollständig mit dem Mock-Kosmo-Provider.
> Die einzige Ausnahme steht am Ende («Was ohne HomeStation nicht testbar
> ist»).

## Vorbereitung (einmalig, ~10 Minuten)

1. **App-Zugang vom iPad** — zwei Wege (Muster `docs/ABNAHME-DREHBUCH.md`
   Vorbereitung Punkt 1):
   - Gehostete PWA im Safari öffnen → Teilen-Menü → **„Zum Home-Bildschirm“**
     (danach startet die App wie eine native App, ohne Safari-Chrome).
   - Oder lokal im selben Netz: auf dem Büro-Rechner
     `npm run preview -w @kosmo/orbit-app -- --host` (der `--host`-Zusatz
     macht den Server im LAN erreichbar), danach auf dem iPad
     `http://<Rechner-IP>:<Port>` im Safari öffnen.
2. **Nur nötig, falls Desktop+iPad gleichzeitig synchron zeichnen sollen**
   (nicht Voraussetzung für die zehn Testblöcke unten): Sync-Server
   `cd kosmo-orbit/tools/sync-server && npm ci && npm start`, in der App
   oben «Sync» → gleiche URL + gleicher Raumname auf beiden Geräten
   (`docs/ABNAHME-DREHBUCH.md` Punkt 4). Alternativ die QR-Kopplung im
   Onboarding-Schritt «Kosmo-Zentrale koppeln» (ROADMAP 346) verwenden.
3. **Version prüfen**: Kosmo-Symbol → Zahnrad → Einstellungen →
   «Funktionen & Neues» → der oberste Eintrag muss **Version 0.7.8** zeigen
   (`data-testid="neuigkeiten-version-0.7.8"`). Zeigt er noch 0.7.7, ist das
   0.7.8-Finale auf diesem Stand noch nicht durchgelaufen — Test verschieben
   oder mit dem Koordinator klären, bevor Befunde notiert werden.
4. **Thema auf „Kosmos“ stellen**: Einstellungen → Darstellung →
   Thema-Wähler → **„Kosmos“** antippen (`[data-theme='orbit']`, das dunkle
   Glass-Theme, in dem die ganze Dock-/HUD-Schicht entworfen wurde — im
   Papier-Thema sind Farben/Kontraste anders, aber die Touch-Mechanik ist
   identisch).
5. **Ein Projekt mit genug Inhalt laden**: Zentrale → «Beispielprojekt laden
   — TKB Bibliothek Hönggerberg» (`data-testid="load-tkb"`) — genug Panels
   und Geometrie, damit Splitter/Docking/Kollisionen realistisch zu prüfen
   sind (ein leeres Projekt zeigt zu wenige gleichzeitig offene Panels).
6. **Für Block 9 (Kosmo ordnet)**: Einstellungen → Kosmo → Provider
   «Demo/Mock» reicht, um die Dock-Steuerung selbst zu beweisen — kein
   HomeStation-Server nötig. Nur wer zusätzlich die Sprachqualität eines
   echten Modells mittesten will, braucht Ollama an der HomeStation
   (`docs/HOMESTATION-AUFTRAG.md`).

---

## Die zehn Testblöcke

Jeder Block: **Schritte** → **Erwartung** → **notiere:** (freies Feld für den
Befund — auch «alles wie erwartet» ist ein gültiger Eintrag, nicht nur
Probleme).

### 1 · Splitter ziehen mit dem Finger (Spalte + Zeile, Klemmen spürbar?)

*Kontext:* `DockSplitter.tsx`, 14px-Griffe, `touch-action:none` sitzt
**nur** auf dem Griff selbst (`data-testid="dock-splitter-<id>"`).

- **Schritte:** In der Design-Station zwei nebeneinander offene Panels
  suchen (z. B. Raster/Varianten links, Kennzahlen rechts) → den schmalen
  Griffstreifen zwischen zwei Spalten mit dem Finger fassen und ziehen
  (Spalten-Splitter) → dieselbe Probe an einer Zeilen-Trennung (z. B. im
  B-Streifen, Einstellungen → Darstellung → Werkzeug-Anordnung → «Raster-
  Kachel (B)») → bis an den min-/max-Anschlag weiterziehen.
- **Erwartung:** Griff reagiert sofort auf den ersten Touch (kein
  Doppel-Tap nötig), folgt dem Finger ohne Sprung, klemmt spürbar am
  min-/max-Wert (kein Überschiessen, keine Panel-Überlappung), der neue
  Wert übersteht einen Reload (Persistenz, `kosmo.dock.v1`).
- **notiere:** Trefferbreite ausreichend? Spürbarer Anschlag oder „weich“?
  Ruckeln/Lag beim Ziehen?

### 2 · Panel-Kopf greifen & umdocken (erscheinen Snap-Zonen? treffsicher?)

*Kontext:* Header-Drag (P4/ROADMAP 356), `DockSnapZonen.tsx`
(`dock-snap-links` / `dock-snap-rechts` / `dock-snap-schwebend`), gestrichelte
Zonen mit Teal-Hervorhebung + Geist.

- **Schritte:** Ein offenes Panel **am Titel-Kopf** (nicht am Inhalt!) mit
  dem Finger fassen, langsam Richtung linkem/rechtem Bildschirmrand ziehen,
  beobachten, ob die Zonen erscheinen, dann auf einer Zone loslassen.
- **Erwartung:** Zonen erscheinen rechtzeitig (nicht erst kurz vorm Rand),
  sind mit dem Finger (nicht nur mit Maus-Präzision) treffsicher, das Panel
  dockt beim Loslassen sauber an der gewählten Seite an.
- **notiere:** Zonen rechtzeitig sichtbar? Mit dem Finger treffsicher oder
  zu schmal? Falsches Ziel erwischt?

### 3 · Pop-out + frei ziehen + Magnet + Snap-zurück

*Kontext:* Pop-out-Knopf (`dock-panel-<id>-popout`), schwebende Panels frei
ziehbar mit Feld-Klemmung, Magnet **T=16** an Kanten/Mitte, Snap-zurück
**<30px** zur echten `placeFloats()`-Ankerposition, Re-Dock-Knopf
(`dock-panel-<id>-redock`).

- **Schritte:** Ein Panel per Pop-out lösen (wird schwebend) → frei über den
  Bildschirm ziehen → nah an eine Kante/Mitte heranführen (Magnet sollte
  einrasten) → weit wegziehen und dann wieder nah an die ursprüngliche
  Ankerposition heranführen (<30px, sollte zurückschnappen) → den
  Re-Dock-Knopf antippen.
- **Erwartung:** Panel folgt dem Finger ohne Ruckeln, Magnet-Einrasten ist
  spür-/sichtbar an Kanten/Mitte, Snap-zurück löst beim Annähern an die alte
  Position aus, Re-Dock-Knopf funktioniert mit einem Tap.
- **notiere:** Magnet spürbar? Snap-zurück-Distanz gefühlt richtig (zu früh
  / zu spät)? Re-Dock-Knopf gut treffbar?

### 4 · Chevron/Tab tippen (Trefferfläche gross genug?)

*Kontext:* eingeklappte Panels werden zum 34px-Tab
(`dock-panel-<id>-tab`), Chevron im Kopf klappt ein
(`dock-panel-<id>-einklappen`).

- **Schritte:** Ein Panel über den Chevron einklappen (wird zum 34px-Tab)
  → den Tab antippen, um es wieder zu öffnen → mit 2–3 verschiedenen Panels
  wiederholen.
- **Erwartung:** Die 34px-Trefferfläche genügt für einen zuverlässigen
  Finger-Tap (kein Fehltreffer auf Nachbar-Tab/-Panel), Öffnen/Schliessen
  ohne spürbare Verzögerung.
- **notiere:** Trefferfläche gross genug? Fehltreffer auf Nachbarelemente?

### 5 · Pin

*Kontext:* Pin-Knopf (`dock-panel-<id>-pin`) schützt ein Panel vor
automatischem Einklappen (Pin-Kappung 66 %/60 % je Konzept).

- **Schritte:** Ein Panel anpinnen → ein weiteres Panel öffnen, das
  normalerweise Platz verlangt (z. B. ein grösseres Studien-/Varianten-Panel)
  → prüfen, ob das gepinnte Panel offen bleibt statt einzuklappen.
- **Erwartung:** Pin-Zustand mit dem Finger klar erkennbar und zuverlässig
  togglebar; das gepinnte Panel bleibt offen, auch wenn der Platz knapp
  wird.
- **notiere:** Pin-Symbol auf dem iPad gut lesbar/klein genug zum Treffen?
  Verhalten wie erwartet?

### 6 · HUD-Floats am Griffstreifen ziehen

*Kontext:* `ViewportChromeHuds.tsx` — Modus-Leiste, Massing-Karte,
Werkzeug-Rail, Orientierung — `floatChrome:'schlank'` (dünner Griffstreifen
statt vollem Titel-Kopf, Inhalt bringt sein eigenes Glass mit).

- **Schritte:** In die 3D- oder Split-Ansicht wechseln → eines der HUD-Floats
  (z. B. die Werkzeug-Rail) am dünnen Griffstreifen fassen und verschieben.
- **Erwartung:** Der schlanke Griffstreifen ist trotz geringer Höhe
  zuverlässig mit dem Finger greifbar (kein Vertippen in den Inhalt
  darunter); Zieh-/Magnet-/Klemmverhalten sonst wie Block 2/3.
- **notiere:** Griffstreifen dünn genug, um zu stören? Trefferfläche
  ausreichend?

### 7 · Scroll IN Panels vs. Drag am Kopf (Geste-Konflikte, touch-action-Grenzen)

*Kontext:* `touch-action:none` sitzt **nur** am Kopf/Griff (`DockPanel.tsx`,
`DockSplitter.tsx`), der übrige Panel-Inhalt trägt `touch-action:
manipulation` — das Gegenstück, damit Inhalte normal scrollen können.

- **Schritte:** Ein Panel mit langem/scrollbarem Inhalt öffnen (z. B.
  Bauablauf-Tabelle oder Berechnungsliste) → **im Inhalt** mit dem Finger
  nach oben/unten scrollen (nicht am Kopf) → danach **am Kopf selbst**
  wischen und prüfen, dass dort **nicht** gescrollt, sondern gedraggt wird.
- **Erwartung:** Scrollen im Inhalt fühlt sich nativ an (kein Ruckeln, kein
  versehentliches Drag), Drag am Kopf startet zuverlässig, ohne dass ein
  Scroll-Versuch den Drag „stiehlt“ oder umgekehrt.
- **notiere:** Gab es einen Moment, in dem Scrollen zum Drag wurde (oder
  umgekehrt)? Wenn ja: wie nah am Kopf/Griff?

### 8 · B-Modus am Tablet

*Kontext:* Einstellungen → Darstellung → «Werkzeug-Anordnung»
(`einstellungen-dock-modus`) — **„Orbit-Zonen (A, Standard)“** /
**„Raster-Kachel (B)“**, derselbe Solver, zwei Layouts.

- **Schritte:** Werkzeug-Anordnung auf **„Raster-Kachel (B)“** umschalten →
  zur Design- oder Vis-Station wechseln, die gekachelten Panels antippen und
  scrollen → zurück auf **„Orbit-Zonen (A)“** wechseln.
- **Erwartung:** Umschalten reagiert sofort mit einem Tap, die Kacheln
  lassen sich in B sauber bedienen (keine zu kleinen Trefferflächen durch
  die bekannte „eng, aber korrekt“-Stauchung, ROADMAP 358), Zurückschalten
  funktioniert genauso.
- **notiere:** B-Modus auf dem iPad brauchbar oder zu eng? Bestätigt sich
  der bekannte Palette-Stauch-Befund (`docs/V079-VORSCHLAG.md` A4)?

### 9 · Kosmo-Ordnet-Sequenz beobachten (Orb sichtbar? STOPP tippbar?)

*Kontext:* der goldene Orb (`dock-kosmo-orb`) wandert zum Kopf des zuletzt
bedienten Panels, «KOSMO»-Badge am Kopf/Tab, Chip **„KOSMO ORDNET · STOPP“**
(`dock-kosmo-stopp`) beendet Orb/Badge sofort.

- **Schritte:** Kosmo-Symbol antippen, Panel öffnen → im Chat eine
  Dock-Aktion anstossen (z. B. bitten, ein bestimmtes Panel einzuklappen,
  zu öffnen oder das Layout zurückzusetzen) → beobachten, was am Bildschirm
  passiert → während die Sequenz läuft, den STOPP-Chip antippen.
- **Erwartung:** Der goldene Orb ist auf dem iPad klar sichtbar und
  wandert nachvollziehbar zum richtigen Panel, die «KOSMO»-Badge erscheint
  am Kopf bzw. am eingeklappten Tab, der STOPP-Chip ist gross genug zum
  Antippen und beendet Orb/Badge sofort.
- **notiere:** Orb/Badge gut sichtbar (Kontrast/Grösse auf dem iPad-Display)?
  STOPP treffsicher? Wirkt die Bewegung auf Touch so flüssig wie am
  Desktop?

### 10 · Geste-Konflikte mit Safari (Edge-Swipes, Pinch)

*Kontext:* Safari/PWA-eigene Systemgesten (Zurück/Vorwärts-Edge-Swipe,
Pinch-Zoom der Seite) können mit App-internen Touch-Gesten am Bildschirmrand
kollidieren — im Container nie geprüft (kein echtes Safari).

- **Schritte:** Am linken/rechten Bildschirmrand (dort, wo evtl.
  Panels/Splitter/Floats sitzen) einen Edge-Swipe probieren → mit zwei
  Fingern über die App pinch-zoomen → prüfen, ob dabei versehentlich ein
  Splitter/Panel reagiert oder Safari stattdessen die Seite verlässt/zoomt.
- **Erwartung:** Im PWA-Modus («Zum Home-Bildschirm») sollten Safari-Edge-
  Gesten grösstenteils entfallen; im normalen Safari-Tab-Modus können sie
  mit randnahen Splittern/Floats kollidieren — das ehrlich festhalten, wo
  genau es passiert (nicht pauschal «geht» oder «geht nicht»).
- **notiere:** Wurde eine App-Geste von Safari „gestohlen“ (oder
  umgekehrt)? PWA-Modus oder normaler Safari-Tab getestet?

---

## Ergebnis zurückmelden

Jeder Block bekommt einen kurzen Ist-Zustand (grün/gelb/rot) plus die freie
Notiz aus dem Feld oben — ein «alles wie erwartet» ist genauso ein Ergebnis
wie ein Befund. Screenshots/Screen-Recordings vom iPad (Seitentaste +
Lautstärke-hoch) sind hilfreich, aber kein Muss.

Die Befunde fliessen so in die nächste Runde:

- **A3 («Tabs als Drag-Handles + Snap-Zonen», `docs/V079-VORSCHLAG.md`
  Gruppe A)** — Block 4 (Chevron/Tab) ist der direkte Vorher-Zustand: zeigt
  er zu kleine Trefferflächen, ist das ein konkretes Argument für A3, statt
  nur eine Vermutung.
- **B2 (die zwei bekannten Alt-Kollisionen, ROADMAP 355)** — falls in Block
  1/2/6 auf echtem Gerät zusätzliche Überlappungen sichtbar werden, die im
  Container nicht auftauchten, gehören sie hier dazu, nicht als neuer Punkt.
- **Direkte Dock-/HUD-Befunde** (Blöcke 1–3, 6, 7) referenzieren
  ROADMAP 353–359 (die Wellen, die die jeweilige Mechanik gebaut haben) —
  ein neuer Befund bekommt beim Einpflegen eine neue ROADMAP-Nummer, keine
  stille Korrektur einer alten.
- **Block 8/9** referenzieren ROADMAP 358 (B-Modus) bzw. 359 («Kosmo
  ordnet») direkt.
- **Kein Befund wird aus diesem Drehbuch heraus selbst gefixt** — das
  Drehbuch liefert nur die Beobachtung; Fix-Entscheidungen laufen über die
  normale v0.7.9-Priorisierung (`docs/V079-VORSCHLAG.md`).

## Was ohne HomeStation nicht testbar ist

Ehrlich benannt, damit kein Testergebnis als „vollständig“ missverstanden
wird, das es nicht ist:

- **Alle zehn Blöcke oben** brauchen **keine** HomeStation — reines
  Touch-/UI-Verhalten, läuft vollständig mit dem Mock-Kosmo-Provider und
  ohne Bridge.
- **Einzige Ausnahme in Block 9:** wer zusätzlich zur Dock-Steuerung selbst
  auch die **Sprachqualität/Antwortgüte** eines echten LLM (statt des
  deterministischen Mocks) mitbeurteilen will, braucht Ollama an der
  HomeStation (`docs/HOMESTATION-AUFTRAG.md`) — das ist aber eine andere
  Prüfung als die hier verlangte (Dock-Steuerung funktioniert/funktioniert
  nicht), und für B1 nicht erforderlich.
- **Ausserhalb dieses Drehbuchs** (nicht Teil der zehn Blöcke, aber
  angrenzend): ein echter Mehrgeräte-Sync-Test mit **gleichzeitigem**
  Render-Auftrag an KosmoVis, oder ein echter GPU-Render als Teil eines
  Docking-Tests, bräuchte die reale HomeStation-Bridge
  (`docs/ABNAHME-DREHBUCH.md`, Abschnitt «Kette scharf») — das ist bewusst
  **nicht** Gegenstand dieses Touch-Drehbuchs.
