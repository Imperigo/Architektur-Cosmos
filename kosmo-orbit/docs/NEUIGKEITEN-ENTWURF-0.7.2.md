# Neuigkeiten-Entwurf 0.7.2 — «Visuelles Update»

Entwurf für den Finale-Block in `apps/kosmo-orbit/src/shell/neuigkeiten.ts`
(Serie K / Batch A4, «Funktionen & Neues» im zentralen Einstellungs-Panel).
Diese Datei ist bewusst NUR der Entwurf — die TS-Datei selbst bleibt in
diesem Stream unangetastet (fremder Besitz, Muster
`NEUIGKEITEN-ENTWURF-0.7.1.md`). Tonalität und Format folgen demselben
0.7.1-Muster: kurze, ehrliche Sätze, was wirklich gebaut wurde — kein
Wunsch, kein Plan. Quelle: `docs/V072-VISUELLES-UPDATE-SPEZ.md` +
`docs/V072-BAUPROTOKOLL.md` (die vollständige Chronik aller acht Wellen,
W1-A bis W4-H, inkl. beider Kritik-Runden).

## Vorschlag für den Eintrag

```ts
{
  version: '0.7.2',
  datum: '2026-07-11',
  // Bau abgeschlossen am 11.07. über acht Streams (W1-A…W4-H); der
  // eigentliche Versions-Bump in package.json/tauri.conf.json bleibt beim
  // Fable-Leiter (Bauprotokoll-Kopf: «Version bleibt 0.7.1 bis zum
  // Finale») — bis dahin ehrlich «in dieser Version».
  inArbeit: true,
  punkte: [
    {
      text: 'Neues drittes Thema «Orbit» (dunkel, Teal-Akzent) ist jetzt der Standard — «Papier» und «Tinte» bleiben unverändert wählbar (3-Segment-Wähler in den Einstellungen), eine bereits getroffene eigene Wahl wird respektiert.',
    },
    {
      text: 'Neues Marken-Logo («6a», Satellit + Mittelpunkt), ein animierter Startbildschirm vor dem ersten App-Rendern und ein neues App-Icon (dunkle Standard-Variante mit Teal-Signal) für Startbildschirm, Taskleiste und PWA-Installation — die weiteren Handoff-Varianten (Tint/Glas/Hell) sind nicht gebaut.',
    },
    {
      text: '14 handgezeichnete Werkzeug-Glyphen (u. a. Entwerfen, Skizzieren, Daten, Visualisieren, Publizieren, Vorbereiten, Sprechen) mit je einem Rollen-Punkt in der jeweiligen Werkzeugfamilie-Farbe — sichtbar im Zentrale-Hub und im Entwurfs-Dock. Ehrlich vertagt: die ältere, app-weite Icon-Sammlung (`packages/kosmo-ui` KIcon-Registry, rund 30 Zeichen) trägt diesen Strichstil noch nicht — das folgt mit 0.7.3.',
    },
    {
      text: 'App-weite Phasen-Leiste im Kopfbereich (5 SIA-112-Gruppen: Strategie/Vorstudie/Projektierung/Ausschreibung/Realisierung) als Schnellzugriff neben der bestehenden, feineren Phasenwahl in KosmoDesign — ein Klick schreibt dieselbe Projektphase, auf beiden Wegen. Unter schmalem Fenster kollabiert die Leiste auf reine Ziffern (1…5), das volle Label bleibt als Tooltip.',
    },
    {
      text: 'Die Werkzeuge im Design-Fächer sortieren sich seither selbst um — nach einer Mischung aus «typisch für die aktuelle Phase» und «zuletzt tatsächlich genutzt», mit einer Sperre gegen Umsortier-«Nervosität». Ehrlich vertagt: diese Rang-Logik zeigt sich bisher nur im Design-Fächer (die anderen Stationen haben zu wenige Plätze, um Ränge sichtbar zu machen) — ein hub-weiter Ausbau ist für 0.7.3 vorgesehen.',
    },
    {
      text: 'Kosmo zeigt jetzt neun klar unterscheidbare Zustände (u. a. Zuhören, Sprechen, Schreiben, Losschicken, Fertig, Fehler) durch eine eigene, punktbasierte Darstellung statt nur eines Beschäftigt-Indikators — dazu eine vorbereitete Vollbild-Rahmen-Darstellung für den Takeover-Modus (Punkte laufen dem Fensterrand entlang, Hinweis-Chip) — in 0.7.2 löst sie noch kein realer Ablauf aus; Trigger und ESC-Abbruch folgen mit dem Desktop-Takeover in 0.7.3.',
    },
    {
      text: '«Kosmo zeichnet sichtbar»: bevor eine von Kosmo vorgeschlagene Änderung endgültig übernommen wird, zieht ein Orb den Vorschlag sichtbar auf dem Plan nach — Stufe 1 zeigt genau einen Orb (ein Schwarm mehrerer Orbs für grosse Pakete ist als Stufe 2 für 0.7.3 vorbereitet, aber nicht gebaut). Abschaltbar in den Einstellungen, per Default an; automatisch übersprungen bei reduzierter Bewegung.',
    },
    {
      text: 'Ein eigener, gezeichneter Mauszeiger (Pfeil mit Teal-Glow) ersetzt den Systemzeiger auf Geräten mit Maus/Trackpad — er verwandelt sich je nach Kontext (z. B. Fadenkreuz beim präzisen Zeichnen) und ist über eine eigene Einstellung abschaltbar, systemseitig per Default aus auf reinen Touch-Geräten.',
    },
    {
      text: 'Nur in der Desktop-App: ein schwebendes Kosmo-Charakter-Fenster (unaufdringlich, immer über anderen Fenstern, unten rechts) plus ein Symbol in der System-Ablage (Tray) zum schnellen Öffnen der App. Ehrlich vertagt: eine choreografierte Übergangs-Animation beim Schliessen ist noch nicht verdrahtet (bräuchte einen Rust-seitigen Vorlauf, der heute nicht existiert); das Zusammenspiel beider Fenster liess sich in der Container-Umgebung nicht automatisiert prüfen (kein echtes Betriebssystem-Fenstersystem) — ein echter Desktop-Rundgang steht noch aus.',
    },
    {
      text: 'Neue, schmale Companion-Ansicht — erreichbar auf jedem per QR gekoppelten Gerät, indem man an die App-Adresse «#companion» anhängt (einen eigenen Link im Koppeln-Dialog gibt es noch nicht, der folgt mit 0.7.3): zeigt den Phasen-Fortschritt als Ring sowie Job-/Freigabe-Karten zum Mitlesen und Freigeben, ohne selbst zu zeichnen. Ehrlich benannt: Visualisierungs-Freigaben sind an die jeweilige Sitzung gebunden — ein frisch geöffneter Tab sieht keine fremden, bereits gerenderten Karten.',
    },
    {
      text: 'Dezente Klick-/Bestätigungstöne stehen bereit, sind aber per Default AUS (Owner-Entscheid) — eine eigene Einstellung schaltet sie bei Bedarf ein.',
    },
    {
      text: 'Untertool-Zugriff läuft jetzt über einen runden Hub (Zentrale-Kachel + Entwurfs-Dock) statt über ein durchgängiges Boden-Dock über die ganze App — ein app-weites Boden-Dock ist als Kandidat für 0.7.3 offen, nicht Teil dieser Version.',
    },
  ],
}
```

## Ehrliche Grenzen dieses Entwurfs

- **KIcon-Registry** (`packages/kosmo-ui/src/icons.tsx`, ~30 Zeichen): bleibt
  im alten 16px/1.5-Strichstil — bewusst NICHT auf den neuen Glyphen-Stil
  nachgezogen (Fable-Entscheid Kritik-Runde 1: «ehrlich 0.7.3», damit dieser
  Auftrag nicht zusätzlich anschwillt).
- **Rang-Logik**: nur im Design-Fächer sichtbar, weil andere Stationen zu
  wenige Slots für eine sichtbare Umsortierung haben (Fable-Entscheid
  Kritik-Runde 2: «reicht für 0.7.2», hub-weiter Ausbau = 0.7.3).
- **«Kosmo zeichnet sichtbar»**: Stufe 1 zeichnet genau einen Orb; die
  mehrspurige Schwarm-Darstellung für grosse Pakete ist im Store bereits
  strukturell vorbereitet (`state/abspiel-ebene.ts`), aber nicht gebaut.
  Zusätzlich: nur Achsen-/Umriss-/Punkt-Commands bekommen echte Geometrie
  nachgezeichnet, alle anderen zeigen eine ehrliche Vorschau-Umkreisung statt
  einer erfundenen Zeichnung. Und: wer während des Abspielens pant oder
  zoomt, verschiebt die Overlay-Abbildung nicht mit — sie ist auf den
  Viewport-Stand beim Start fixiert (Kritik-3-Befund, 0.7.3-Kandidat).
- **Kosmo-Charakter-Fenster**: die Schliessen-Choreografie aus der Spec
  (Hauptfenster skaliert zur Ecke, Orb «schluckt») ist NICHT verdrahtet — sie
  bräuchte ein Rust-seitiges Vorlauf-Event vor dem Verstecken, das
  `src-tauri/src/lib.rs` heute nicht sendet. Das Zusammenspiel Haupt-/
  Charakter-Fenster (inkl. macOS/Linux-Transparenz) liess sich in dieser
  Container-Umgebung nicht per E2E prüfen (kein echtes Fenstersystem,
  `cargo check` ist der einzige Compile-Beweis) — ein Owner-Rundgang auf
  echter Desktop-Hardware steht noch aus.
- **Companion**: reine Lese-/Freigabe-Ansicht, kein Zeichnen; die
  Visualisierungs-Freigabekarten sind an den Browser-Tab/die Sitzung
  gebunden (Laufzeit-Store, kein Yjs-Sync) — ein zweites Gerät sieht nur,
  was in DIESER Sitzung gerendert wurde.
- **Sounds**: bewusst Default AUS (Owner-Entscheid), rein synthetisch
  (WebAudio-Oszillator, keine Audio-Assets) — ein echter Browser-Audio-
  Smoke-Test (tatsächlich hörbarer Ton) ist in der Container-CI nicht
  möglich, nur der Feature-Detection-/Envelope-Code ist unit-getestet.
- **Hub statt Boden-Dock**: Owner-Entscheid vom 11.07. — ein app-weites,
  durchgängiges Boden-Dock (wie ursprünglich im Handoff skizziert) ist kein
  Bestandteil von 0.7.2, sondern ein offener Kandidat für 0.7.3.

## Herkunft der Fakten

Ausschliesslich aus `docs/V072-VISUELLES-UPDATE-SPEZ.md` und
`docs/V072-BAUPROTOKOLL.md` (Chronik aller acht Streams W1-A…W4-H inkl.
beider Kritik-Runden) sowie den jeweils genannten Quelldateien geprüft —
u. a. `packages/kosmo-ui/src/logo-6a.tsx`, `apps/kosmo-orbit/src/shell/werkzeug-glyphen.tsx`,
`shell/PhasenLeiste.tsx`, `state/orbit-rang.ts`, `shell/KosmoOrb.tsx`,
`state/kosmo-status.ts`, `state/abspiel-ebene.ts`, `shell/CursorEbene.tsx`,
`state/cursor-zustand.ts`, `shell/KosmoCharakterFenster.tsx`,
`src-tauri/src/lib.rs`, `state/sounds.ts`, `shell/companion-daten.ts` — nichts
davon ist erfunden oder aus einem Plan vorweggenommen.
