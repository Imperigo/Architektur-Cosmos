import type { ModuleId } from '@kosmo/ui';

/**
 * «Funktionen & Neues» — kuratierte Release-Notizen fürs zentrale
 * Einstellungs-Panel (Serie K / Batch A4, Owner-Befund K14: «Einstellungsmenüs
 * … Funktionen & Neues»). Reine Datentabelle (unit-testbar), die Darstellung
 * lebt in `Einstellungen.tsx`.
 *
 * Ehrlichkeitsregel (Owner-Mandat): jeder Punkt ist gegen einen ROADMAP.md-
 * Beleg geprüft — kein Wunsch, kein Plan, keine Konzept-Recherche (die
 * reinen Doku-Batches wie Vorform-/Finch-/LoRA-Konzept oder die Notion-Scan-
 * Auswertung sind bewusst NICHT hier drin, sie sind kein Produktivcode).
 * `station` markiert Punkte, die auf eine einzelne Werkstation zutreffen
 * (für die stationsgefilterte Ansicht des Einstellungs-Panels); allgemeine
 * App-Änderungen bleiben ohne `station`.
 */

export interface NeuigkeitPunkt {
  /** Kurzer, ehrlicher Satz — was wirklich gebaut wurde. */
  text: string;
  /** Nur gesetzt, wenn der Punkt einer einzelnen Station zuzuordnen ist. */
  station?: ModuleId;
}

export interface NeuigkeitenEintrag {
  /** Semver-Kurzform, z.B. "0.6.2". */
  version: string;
  /** ISO-Datum (YYYY-MM-DD). */
  datum: string;
  /** true = diese Version ist noch nicht ausgeliefert («in dieser Version»). */
  inArbeit?: boolean;
  punkte: NeuigkeitPunkt[];
}

/** Liste bleibt absteigend nach Version — die neuste zuerst (Test bewiesen). */
export const NEUIGKEITEN: NeuigkeitenEintrag[] = [
  {
    version: '0.9.2',
    datum: '2026-07-23',
    punkte: [
      { text: 'Die automatische Aussenbemassung erscheint im gedruckten Plan jetzt mit der vollen Masslinien-Grammatik: Hilfslinien an jedem Messpunkt, feste Papier-Schrift und Verdichtung zu Punktsymbolen bei engen Segmenten — Druck und Bildschirm versprechen dieselbe Lesbarkeit (der eine Golden-Zug dieser Version, 20 Referenzpläne bewusst erneuert).', station: 'design' },
      { text: 'Profil-Manager: eigene Profile (Rechteck, Rund, Stahl-I, Stahl-U) projektweit anlegen, ändern und löschen (mit ehrlichem Referenz-Hinweis); Stützen und Unterzüge können ein Profil tragen — ohne Profil bleibt alles exakt wie bisher.', station: 'design' },
      { text: 'Geländer-Arten wirken jetzt in 3D: Staketen als senkrechte Stäbe, «Voll» als geschlossene Brüstungsplatte; Rampen-Breite, -Höhe und Podest sind im Inspector editierbar — mit derselben ehrlichen SIA-Ablehnung wie beim Zeichnen.', station: 'design' },
      { text: 'Detail-Werkzeug v1: Detailbereich mit zwei Klicks im Plan aufziehen (Name + Massstab, z.B. 1:5), der Ausschnitt erscheint als eigene read-only-Karte in KosmoPublish; das Zeichnen IM Detail folgt in 0.9.3.', station: 'design' },
      { text: 'Raumstempel-Beschriftungen blenden beim Rauszoomen aus, statt sich überlagernd aufzublasen — feste Papiergrösse je Massstab, wie in ArchiCAD.', station: 'design' },
      { text: '«Mit Claude-Abo anmelden» funktioniert jetzt wirklich: Die Desktop-App nutzt die lokal installierte claude-CLI als Motor (kein 401 mehr); Web/iPad sagen ehrlich, dass der Abo-Weg die Desktop-App braucht. Werkzeug-Aufrufe/Diff-Karten im Abo-Modus folgen später — die App weist einmalig darauf hin.' },
      { text: '3D-Geometrie-Grundaudit nach Owner-Befund «innen hohl»: Volumen, Decken, Dächer, Rampen und Treppen sind jetzt geschlossene, korrekt orientierte Körper; ein neuer Invarianten-Test wacht dauerhaft über alle Zerlegungen.', station: 'design' },
      { text: 'Der Home-Bildschirm wurde aufgeräumt: Projekte tragen automatisch Namen, «Neues Projekt» ist ohne Scrollen erreichbar, die vier Kosmo-Werkzeuge sitzen unter dem Logo, und der Kosmo-Orb rechts unten übernimmt per Rechtsklick die acht Unter-Stationen (die Kachel entfällt).' },
      { text: 'Inseln öffnen mit sanfter Animation (Dynamic-Island-Gefühl), und offene Insel-Menüs liegen immer VOR den Nachbar-Inseln — Auswahllisten klappen als eigenes Popup auf, bei Platzmangel nach oben.' },
      { text: 'Der Kosmo-Zeiger ist gespiegelt (Windows-Schräge), reagiert auf die rohe Mausposition (weniger Verzögerung) und verschwindet nicht mehr hinter Einstellungsfenstern.' },
      { text: 'Beim Koppeln mit der Kosmo-Zentrale scannt das Onboarding die festgelegten HomeServer-Adressen automatisch, statt eine alte Bridge-Adresse vorzuschlagen.' },
      { text: 'Neue Beschnitt-Sonde als Prüf-Skript (npm run beschnitt-sonde) — ab 0.9.3 fester Bestandteil des Release-Gates.' },
    ],
  },
  {
    version: '0.9.1',
    datum: '2026-07-23',
    punkte: [
      { text: 'Geländer als echtes Werkzeug: Klickkette im Plan (Doppelklick/Enter/Esc schliesst ab), Höhe 700–1500 mm mit ehrlicher SIA-Ablehnung statt stiller Korrektur, Arten Staketen/Handlauf/Voll, Pfosten an jedem Knick, 3D mit Pfosten und Handlauf-Band.', station: 'design' },
      { text: 'Rampe als echtes Werkzeug: zwei Klicks Fuss→Kopf, Steigung immer live aus den Rohwerten; über 6 % kommt der ehrliche Hinweis «nicht hindernisfrei (SIA 500)», über 15 % lehnt der Kern ab (Tiefgaragen-Grenze) — auch beim Nachziehen am Griff.', station: 'design' },
      { text: 'Geländer und Rampe im gedruckten Plan (der eine Golden-Zug dieser Version): Polylinie mit Pfosten-Strichen bzw. Kontur mit Lauflinie, bergauf-Pfeil und %-Angabe — alle 40 Bestands-Referenzpläne blieben byte-identisch.', station: 'design' },
      { text: 'Beide Werkzeuge in der ZEICHNEN-Insel (13 Werkzeuge) mit Mini-Popups und Inspector-Feldern; die Rampe zeigt dort ehrlich nur an, was der Kern heute editieren kann.', station: 'design' },
      { text: '«Mit Claude-Abo anmelden» repariert: Die App suchte eine CLI namens «ant», die es nicht gibt — jetzt nutzt sie die echte claude-CLI, der Klick öffnet das Anmelde-Fenster im Browser (Desktop-App).' },
      { text: 'Kosmo-Zeiger in Windows-Schräge (linke Kante senkrecht), minimale Klick-Reaktion statt Gummi-Bounce, und spürbar flüssiger: keine Dauer-Rechenschleife mehr, Positions-Update direkt im Mausereignis.' },
      { text: 'UI-Beschnitt-Audit nach Owner-Screenshots: Die Kosmo-Einstellungen ragten 49 px über den Fensterrand («Clou…») — gefixt; eine neue Beschnitt-Sonde prüft alle Stationen automatisch auf abgeschnittene Inhalte.' },
      { text: 'Die drei Standard-Dienstadressen (Ollama/Bridge/Sync) leben jetzt genau einmal im Code statt als 14 verstreute Kopien — ein Port-Wechsel kann keine Stelle mehr vergessen.' },
      { text: 'KosmoTrain-Ingest (IDC/ETH-Auswertung) bewusst verschoben: der Home-PC-Worker-Bericht ist noch nicht eingetroffen — deklarierter Entfall nach Spez, kein stiller Ausfall.' },
    ],
  },
  {
    version: '0.9.0',
    datum: '2026-07-22',
    punkte: [
      { text: 'Plan-Schrift bleibt beim Zoomen immer im Lesebereich (1.8–5 mm wie in ArchiCAD); zu enge Masse verdichten zu einem Punktsymbol statt sich zu überlagern; Messketten erscheinen am Bildschirm als echte Masslinien mit Hilfslinien.', station: 'design' },
      { text: 'Massketten im Druck/Export mit Verlängerungslinien und sauberem Papier-Abstand (der eine Golden-Zug dieser Version).', station: 'design' },
      { text: 'HomeServer-Verbindung repariert: die App blockierte Tailnet-Adressen bisher selbst (CSP) — Bridge (:8600), Sync (:8700) und Ollama (:11434) sind jetzt von jedem Gerät erreichbar.' },
      { text: 'Ehrliche LLM-Rollen-Anzeige in den Einstellungen: Meister/Leiter/Zeichner je mit vorhanden/fehlt und deklariertem Meister→Leiter-Fallback statt Pauschalurteil.' },
      { text: 'Die Kosmo-Maus dreht sich nicht mehr mit der Bewegungsrichtung und gilt jetzt überall — der System-Zeiger erscheint nur noch in Eingabefeldern.' },
      { text: 'Fehlermeldeweg: App-Fehlermeldungen fliessen gebündelt an die HomeStation-Bridge und von dort ins Repo — jeder Eintrag wird vor dem nächsten Release gefixt oder benannt verschoben.' },
      { text: 'ComfyUI-Render-Worker für den Home-PC: Claim→Render→Result mit GPU-Leerlauf-Fenster; der ehrliche «kein Render-Worker»-Status erreicht jetzt sichtbar die App.', station: 'vis' },
      { text: 'Manuell-Oberflächen für Entwerfen/Publizieren/Vorbereiten per Schalter in den Einstellungen — ein Mechanismus, ein Speicherort.' },
    ],
  },
  {
    version: '0.8.12',
    datum: '2026-07-21',
    punkte: [
      {
        text: 'KosmoOrbit startet mit einer ehrlichen Boot-Sequenz: fünf Zeilen (Kern, Kosmo-LLM, Projektgraph, Bridge, Stationen) binden an echte Signale — «BRIDGE — VERBUNDEN» erscheint nur, wenn die Verbindung wirklich steht. Ein Satellit umkreist das Logo als Ladeanzeige, alles ist per Klick oder Escape überspringbar.',
      },
      {
        text: 'Die Zentrale zeigt Projekte jetzt als horizontale Tab-Leiste: ein Tab je Projekt, das aktive klar markiert, Wechsel per Klick, «+ Neues Projekt» als letzter Tab; Katalog sichern/laden in einer ruhigen Zeile darunter. Die Werkzeug-Fächer sind gerade, nüchterne Blöcke mit ganzen Logos.',
      },
      {
        text: 'Neu in den Einstellungen: «Mit Home-PC verbinden» — EIN Knopf stellt Bridge, Projekt-Sync und Kosmo-LLM in einem Zug auf deinen Home-Server um und prüft alle drei Kanäle ehrlich (VERBUNDEN erscheint nur nach echter Antwort). Ist das Tailscale-VPN aus, sagt es die App offen und öffnet die VPN-App per Link.',
      },
      {
        text: 'Die SIA-Phase ist jetzt eine Projekt-Eigenschaft: Die Phasen-Tableiste ist aus der Kopfzeile in die Projekt-Einstellungen umgezogen, dazu der neue «Transformieren»-Schritt (z. B. Wettbewerb → Vorprojekt) mit Bestätigung — per Rückgängig umkehrbar.',
      },
      {
        text: 'Werkzeuge folgen der Phase: eine deklarative Phasen-Matrix blendet Werkzeuge ausserhalb ihrer SIA-Phase hart aus — im Wettbewerb siehst du Volumen- und Mesh-Werkzeuge, ab der Ausschreibung nicht mehr; ein Phasenwechsel ändert den Bestand sofort und beweisbar.',
        station: 'design',
      },
      {
        text: 'Werkplan-Tusche statt reinem Schwarz: alle Planlinien zeichnen jetzt in der Tusche #1A1815 (Gestaltungskonzept) — 26 Referenzpläne wurden dafür kontrolliert neu gezogen, reine Farbsubstitution ohne Geometrieänderung.',
        station: 'publish',
      },
      {
        text: 'Blätter tragen standardmässig den einheitlichen 10-mm-Rahmen rundum; der ISO-838-Heftrand bleibt als bewusste Option. Und die Dämmschraffur folgt jetzt der Bauteilachse: In der Wand steht die Welle, im Dach folgt sie der Neigung — Beton bleibt bei der 45°-Diagonale.',
        station: 'publish',
      },
      {
        text: 'Das 3D-Bodenraster ist im Nahbereich wieder sichtbar (segmentierte Linien statt langer Einzellinien) und ein unter Last flackernder 3D-Auswahl-Test wurde mit gemessener Ursache gehärtet — Bestätigungsdialoge liegen ausserdem jetzt immer über offenen Panels.',
        station: 'design',
      },
    ],
  },
  {
    version: '0.8.11',
    datum: '2026-07-20',
    punkte: [
      {
        text: 'Die Blatt-Insel in KosmoPublish kann jetzt, was bisher nur die manuelle Ansicht konnte: Blätter direkt in der Insel umbenennen (Klick auf den Namen, Enter bestätigt, Escape bricht ab) und entfernen — das Blattverzeichnis zieht sofort nach. Die Insel-Bedienung ist damit für die Blattverwaltung vollwertig, kein Umweg mehr über die manuelle Ansicht.',
        station: 'publish',
      },
      {
        text: 'Die Line-Art-Einstellung fürs Rendern lebt jetzt am Render-Node selbst statt in einem flüchtigen Schalter: sie überlebt Neuladen und Projektwechsel, lässt sich mit Rückgängig zurücknehmen, und Insel-Schalter wie Node-Ansicht zeigen immer denselben Stand — eine Quelle statt zwei, die auseinanderlaufen konnten.',
        station: 'vis',
      },
      {
        text: 'Die Vis-Insel bekommt zwei neue Werkzeuge, die bisher nur in der manuellen Ansicht existierten: gespeicherte Ansichten (Kamerastandpunkte sichern und wieder anfahren) und die Legende der Node-Farben — beides direkt in der Insel-Werkzeugwahl, die manuelle Ansicht bleibt unverändert.',
        station: 'vis',
      },
      {
        text: 'Decken und Unterzüge lassen sich jetzt im 2D-Plan an Griffen ziehen: Decken an ihren Ecken, Unterzüge an beiden Enden — in einem Zug, ohne Löschen und Neuzeichnen. Aussparungen in der Decke und Etiketten am Unterzug bleiben dabei erhalten, und ein einziges Rückgängig stellt den alten Stand wieder her.',
        station: 'design',
      },
      {
        text: 'Gesperrte Bauteile zeigen im Plan jetzt ein kleines Vorhängeschloss am Element — bisher war eine Sperre unsichtbar und fiel erst auf, wenn ein Klick nichts bewegte. Entsperren räumt das Symbol wieder weg; alle bestehenden Pläne bleiben byte-identisch, das Symbol erscheint nur bei tatsächlich gesperrten Elementen.',
        station: 'design',
      },
      {
        text: 'Die Geschosshöhe lässt sich jetzt direkt im 3D-Viewport einstellen: wer eine Treppe auswählt, sieht neu einen vierten Griff auf der Geschoss-Oberkante und zieht die Höhe einfach vertikal — die Treppe rechnet ihre Steigungen live nach, und ein Zug unter die Geschossunterkante wird mit einer ehrlichen Fehlermeldung verworfen statt still geschluckt.',
        station: 'design',
      },
    ],
  },
  {
    version: '0.8.10',
    datum: '2026-07-20',
    punkte: [
      {
        text: 'KosmoVis bekennt sich zur Insel-Bedienung: das «Manuell»-Werkzeug in der AUSTAUSCH-Insel ist weg, und die komplette Vis-Testsuite läuft jetzt gegen genau den Insel-Standard, den du wirklich siehst — was hier grün ist, ist der echte Auslieferungszustand. Wer die klassische, vollständige Oberfläche lieber mag, findet sie weiterhin unter Einstellungen → «Manuelle Ansicht (KosmoVis)»: ein bewusster Schalter statt eines Zufallsfunds, kein Funktionsverlust.',
        station: 'vis',
      },
      {
        text: 'Ein stiller Fehler ist behoben, der seit der Island-Umstellung (v0.8.2) bestand: Kosmo bekam im Standard-Modus bei jeder Nachricht weder ein Bild noch den Text-Kontext der gerade aktiven Werkstation mit — die Stationserkennung suchte nach Ankern der alten Werkzeugleiste, die es im Insel-Modus gar nicht mehr gibt. Betroffen waren alle vier Stationen gleichermassen; Kosmo sieht jetzt wieder, was auf dem Bildschirm passiert, wenn du ihn fragst.',
      },
      {
        text: 'Das Blattverzeichnis zeigt lange Plancodes jetzt sauber: statt einer engen Spalte, die bei sechsteiligen Codes über den Blattrahmen lief, steht der Plancode als kleine zweite Zeile unter dem Blattnamen — beliebig lang, ohne den Rahmen zu sprengen. Und Blätter lassen sich in der Blattliste endlich direkt umbenennen (Klick auf den Namen, Enter bestätigt, Escape bricht ab) — vorher ging das nur über Löschen und Neuanlegen.',
        station: 'publish',
      },
      {
        text: 'Der Inspector kann jetzt mehr Bauteile wirklich bearbeiten: Stützen (Material, Breite, Tiefe, Drehung), Unterzüge (Breite, Höhe, Material) und die Drehung von Möbeln sind neu editierbar, dazu fehlende Felder bei Zonen (Nutzung, Raumnummer, Raumtyp), Volumen, Wänden und Freiform-Netzen — überall mit derselben Wurf-Sicherung wie der Rest: ein ungültiger Wert kommt gar nicht erst ins Dokument.',
        station: 'design',
      },
      {
        text: 'Möbel, Unterzüge, Grundstücksgrenzen und Etiketten lassen sich jetzt direkt im Plan anklicken und verschieben — bisher liess das Verschieben-Werkzeug diese vier Arten technisch schon zu, im 2D-Plan waren sie aber gar nicht erst anwählbar. Jede Art bekommt dabei die passende Trefferzone (Etikett am Anker, Unterzug an der Achse, Möbel am Korpus, Grundstücksgrenze nur an der Linie, nicht in der Fläche) — Gruppieren, Sperren und Undo funktionieren wie bei jedem anderen Bauteil.',
        station: 'design',
      },
      {
        text: 'Ehrlich als Gerätevorlage: ein eigenständiger Python-Worker-Runner kann jetzt ausserhalb der App an einer HomeStation laufen und Render-Aufträge abholen — im Repository steckt bewusst kein Blender-Python-Code (bpy) und keine echte Physik. Ohne den Fake-Modus startet der Runner gar nicht erst; sein einziger eingebauter Rechner liefert markierte Vorschau-Bilder, nie erfundene Zahlen oder ein als «gebackt» ausgegebenes unverändertes Modell.',
      },
    ],
  },
  {
    version: '0.8.9',
    datum: '2026-07-19',
    punkte: [
      {
        text: 'Elemente können gesperrt und für den CAD-Austausch beschriftet werden: «Sperren» schützt ein Element überall — Inspector-Löschen, Delete-Taste, Verschieben und Griff-Ziehen greifen nicht mehr, das Element bleibt aber sichtbar, anwählbar und jederzeit entsperrbar. «Ebene setzen» vergibt einen CAD-Layernamen, der NUR im DXF-Export wirkt (AutoCAD/Rhino/Vectorworks) — bewusst kein Ebenen-System im Plan: Sichtbarkeit folgt weiterhin der Semantik.',
        station: 'design',
      },
      {
        text: 'Der Schnitt verschneidet jetzt auch Wand↔Wand: T-Stoss- und Eck-Überlappungen im Schnittband werden nach Materialpriorität zurückgeschnitten (Beton stösst durch, Dämmung weicht). Knoten mit mehr als zwei Wänden bleiben bewusst unangetastet — kein stilles Falschbild. Treppen sind in 3D an Antritt/Austritt (und Eckpunkt beim L-Lauf) ziehbar, und Massketten-Punkte wandern beim Griff-Zug in place: dieselbe Kette, ein Undo-Schritt.',
        station: 'design',
      },
      {
        text: 'Blattverzeichnis + Sammellegende: je Publikations-Set entsteht auf Klick ein druckfähiges A4-Blatt mit der Plan-Inhaltsliste (Nr/Blatt/Format/Massstab/Revision/Plancode) und darunter der über den ganzen Satz gesammelten Legende (Themenplan-Farben + Keynotes, ohne Duplikate) — als reine Ableitung immer aktuell, an beiden Export-Stellen (Werkstatt + Insel).',
        station: 'publish',
      },
      {
        text: 'Blender-Werkbank, ehrlich verdrahtet: Renderings lassen sich als Strichzeichnung (Line-Art) bestellen, die neue SONNE-Insel fragt Sonnenstunden für den Projektstandort an, und in der Asset-Bibliothek gibt es «Modell backen» (Textur-/Polygon-Optimierung). ALLE drei Wege brauchen einen echten Blender-Worker an der HomeStation-Bridge — ohne ihn endet jeder Auftrag offen als «kein-blender-worker» mit klarer Meldung: Bilder dürfen markierte Fakes sein, Physik-Zahlen und Geometrie-Optimierungen werden nie erfunden. Bild-Beschriftungen sind jetzt durchgängig ehrlich: «Vorschau (Fake-Render)», «Aufnahme (Viewport)» oder «Strichzeichnung (Line-Art)».',
        station: 'vis',
      },
      {
        text: 'Der Node-Editor ist im Dunkeltheme besser lesbar: die sechs Port-Farben liegen neu auf einem einheitlichen Kontrastband (Owner-Wahl «K2 Ausgewogen» aus drei gerechneten Kandidaten), das helle Papier-Theme bleibt unverändert. Der Einklapp-Knopf am Node-Kopf hat eine echte Trefferfläche (kein Pixel-Zielen mehr).',
        station: 'vis',
      },
      {
        text: 'Der glTF-Export trägt jetzt Geschoss-Hierarchie, Element-Identität (entityId/Art/Geschoss als extras) und doppelseitige Materialien — Downstream-Werkzeuge (Blender & Co.) sehen die Struktur statt einer flachen Mesh-Liste. UV/Texturen bleiben bewusst Worker-Aufgabe.',
      },
    ],
  },
  {
    version: '0.8.8',
    datum: '2026-07-19',
    punkte: [
      {
        text: 'Verschieben kann jetzt ALLE Elementarten: Massketten, Kommentare, Möbel, Unterzüge, Grundstücksgrenzen und Etiketten wandern als ein einziger Befehl mit — sie behalten dabei ihre Identität (kein verstecktes Löschen+Neusetzen mehr), Etiketten bleiben an ihrem Ziel verankert, und ein Undo stellt alles byte-genau wieder her. Das Eigenschaften-Setzen kennt neue Felder (Raumnummer, Raumtyp, Möbel-/Stützen-Drehung, Stützen- und Unterzug-Masse, Fenster-Details) — falsche Werte werden mit einer Meldung abgewiesen, die die erlaubten Felder nennt, bevor irgendetwas am Dokument passiert.',
        station: 'design',
      },
      {
        text: 'Das 3D-Aufziehrechteck sieht nicht mehr durch Wände: überwiegend verdeckte Elemente bleiben draussen, teilsichtbare kommen mit rein (ehrliche Grenze: was mehrheitlich hinter anderem liegt, wird ausgelassen — die Vorschau während des Aufziehens bleibt ein reines Bildschirm-Rechteck). Esc bricht dabei nur noch die Geste ab, die bestehende Auswahl bleibt stehen.',
        station: 'design',
      },
      {
        text: 'Der SIA-416-Flächennachweis lässt sich als CSV exportieren (HNF/NNF/VF/FF/KF je Geschoss, NGF-Summen, aGF-Ziel und GF-Schätzung — dieselben Zahlen wie im Kennzahlen-Panel, im Schweizer Format).',
        station: 'publish',
      },
      {
        text: 'Fake-Renderings können aufs Blatt: «Aufs Blatt legen» bringt die Vorschau-Aufnahme nach KosmoPublish — zwingend beschriftet mit «Vorschau (Fake-Render)» (auf ALLEN Wegen, auch dem älteren Manuell-Tab), mit hartem Grössen-Deckel (~1 MB, darüber kommt eine ehrliche Fehlermeldung statt eines aufgeblähten Dokuments), und ein Undo räumt Bild samt Speicher wieder weg. Echte HomeStation-Renderings bleiben ein späteres Kapitel.',
        station: 'vis',
      },
      {
        text: 'Der Autopilot ist nach Fehlern fortsetzbar: «Ab Schritt N fortsetzen» führt genau die offenen Schritte aus, «Schritt N wiederholen» genau einen — beides nur auf Klick und nur im Fehler-/Abbruch-Zustand. Die zugrunde liegende Lauf-Maschinerie ist gegen veraltete Läufe abgeriegelt (die Ursache eines seltenen Test-Flackerns, jetzt an der Wurzel behoben).',
      },
      {
        text: 'Unter der Haube: die Vis-Portfarben und Stimmungs-Verläufe hängen an Design-Tokens statt an festen Hex-Werten (eigene Farbpaletten je Thema folgen später), die Zeichner-Eval prüft jetzt Mehr-Zug-Dialoge mit echtem Byte-Vergleich (45 Prüffälle, 45 bestanden), und die letzten geschätzten Wartezeiten in den UI-Tests sind echten Zustands-Prüfungen gewichen. Die Release-Matrix lief mit 13 unabhängigen Prüfern: 10 sofort bestanden, der eine echte Fund (Manuell-Weg ohne Pflicht-Label) ist gefixt, zwei sind als dokumentierte Grenzen benannt.',
      },
    ],
  },
  {
    version: '0.8.7',
    datum: '2026-07-19',
    punkte: [
      {
        text: 'Der Projektstandort wird auskunftsfähig: nach der Adress-Suche holt die App die ÖREB-Betroffenheit der Parzelle (welche öffentlich-rechtlichen Eigentumsbeschränkungs-Themen betroffen sind) und zeigt sie als Liste im Standort-Panel und als Zeile in KosmoData — persistent im Dokument, ein eigener Undo-Schritt. Ehrlich beschriftet: «Auszug light — kein rechtsgültiger ÖREB-Auszug», Netz- und API-Fehler werden sichtbar gemeldet statt still verschluckt.',
        station: 'data',
      },
      {
        text: 'Auch Treppen haben jetzt Griffe: Antritt und Austritt lassen sich ziehen, bei L-Treppen zusätzlich das Eckpodest — die Treppe behält dabei Identität, Breite und Form, ein Undo stellt alles wieder her, und unmögliche Züge (zu kurzer Lauf, zu steile Steigung) werden mit sichtbarer Meldung abgewiesen, ohne die Treppe anzutasten.',
        station: 'design',
      },
      {
        text: 'Die 3D-Ansicht zieht nach: Shift-Aufziehen wählt ganze Gruppen im Sichtkegel (das Gegenstück zum 2D-Aufziehrechteck; ehrliche Grenze: es sieht durch Wände — auch verdeckte Elemente werden gewählt), das Auswahl-Leuchten ist jetzt deutlich sichtbar (kräftiger Kantenrahmen statt nur schwachem Glühen), und die KAMERA-Anzeige folgt der Bewegung sofort statt mit bis zu 0.4 Sekunden Verzögerung.',
        station: 'design',
      },
      {
        text: 'Unter der Haube aufgeräumt: die Öffnungs-Projektionsformel lebt nur noch EINMAL im Kern statt doppelt in zwei Dateien (millimetergenau unverändert, per Regressionsnetz bewiesen), und die Raumgraph-Diagnosefarbe hängt am neuen theme-invarianten Design-Token statt an verstreuten Hex-Werten.',
      },
      {
        text: 'Die Zeichner-Eval prüft jetzt auch das echte Lauf-Vorschlagsformat des Autopiloten (Karte statt Ausführung, erfundene Befehls-IDs werden abgewiesen) — 41 Prüffälle, 41 bestanden. Die Release-Matrix lief mit 13 unabhängigen Prüfern: 11 sofort bestanden, die zwei Funde (hängengebliebene Marquee-Geste über der Statuskarte, Graph-Knopf mit fester Farbe) sind vor dem Release gefixt und regressionsgetestet.',
      },
    ],
  },
  {
    version: '0.8.6',
    datum: '2026-07-19',
    punkte: [
      {
        text: 'Griffe sind jetzt verlustfrei: Wer einen Wand-Endpunkt zieht, behält die Wand — Identität, Umbau-Status, Auswahl und alle eingesetzten Fenster und Türen überleben den Zug als EIN Undo-Schritt (neues Kernel-Kommando statt Löschen+Neusetzen). Wird die Wand zu kurz für eine Öffnung, rückt diese nach, wenn es geht, sonst wird sie mit sichtbarer Meldung entfernt — nie still. Auch Öffnungen selbst haben jetzt einen Griff und lassen sich entlang der Wandachse schieben (begrenzt auf die Wandlänge), und Nachbar-Zonen behalten beim Eck-Zug ihre Kennzeichnung.',
        station: 'design',
      },
      {
        text: 'Kosmo schlägt Läufe jetzt im Gespräch vor: auf eine Bau-Anfrage antwortet Kosmo mit einer Vorschlagskarte (Titel, Schrittliste mit Begründungen) — «Lauf starten» oder «Ablehnen» entscheidet der Architekt, nie Kosmo selbst. Eine kleine Lauf-Bibliothek macht die drei kuratierten Drehbücher per Klick startbar, Schritt-Verweise auf gerade erst erzeugte Elemente werden zur Laufzeit aufgelöst, erfundene Befehls-IDs werden VOR der Karte abgewiesen, und der Abbrechen-Knopf greift jetzt beweisbar während eines echten Laufs (per Klick getestet, nicht nur per API). Die Zeichner-Eval wuchs von 35 auf 38 Prüffälle (38/38 bestanden).',
      },
      {
        text: 'Auf dem Publish-Blatt lassen sich Raumtypen ein- und ausblenden (dritter Schalter im Sichtbarkeits-Werkzeug der DARSTELLUNG-Insel): Grundriss-Räume tragen ihren Raumtyp jetzt als Daten-Attribut im Blatt — rein als Anzeige-Schalter, alle 36 abgeleiteten Plan-Goldens blieben byte-identisch.',
        station: 'publish',
      },
      {
        text: 'Die 3D-Ansicht wählt jetzt wie der Plan: Shift-Klick nimmt Elemente in die Auswahl auf oder wieder heraus, Esc leert sie — dieselben Regeln in beiden Welten.',
        station: 'design',
      },
      {
        text: 'Der Projekt-Standort bleibt: die Adress-Suche (geo.admin.ch) schreibt Adresse und LV95-Koordinaten jetzt als Projekt-Einstellung ins Dokument — ein Undo-Schritt, überlebt Speichern und Neuladen, läuft über Sync mit — und KosmoData zeigt den Standort als eigene Zeile im Projektkopf.',
        station: 'data',
      },
      {
        text: 'Unter der Haube: Der Scan-Auswertungs-Wächter prüft jetzt rückwärts alle Releases (Lücken können nicht mehr still passieren), ein seit v0.8.4 still roter Simulations-Test wurde gefunden und gefixt, und die Release-Matrix wurde von 16 unabhängigen Prüfern adversarial abgenommen — 14 sofort bestanden, die zwei Funde (Abbrechen-Knopf real unerreichbar, erfundene Befehls-IDs) sind vor dem Release gefixt.',
      },
    ],
  },
  {
    version: '0.8.5',
    datum: '2026-07-19',
    punkte: [
      {
        text: 'Der Plan ist jetzt greifbar: Shift-Klick nimmt Elemente in die Auswahl auf oder wieder heraus, ein Aufziehrechteck (Rubber-Band) wählt ganze Gruppen — mit Shift additiv, nur voll umschlossene Elemente zählen —, Esc leert die Auswahl, und der Inspector zeigt bei Mehrfach-Auswahl «N Elemente» mit «Alle löschen». Löschen und Verschieben über die ganze Gruppe laufen als EIN Undo-Schritt.',
        station: 'design',
      },
      {
        text: 'Einzeln gewählte Wände, Massketten, Zonen, Volumen und Dächer zeigen schmale Griffe an Endpunkten und Ecken: Anfassen und Ziehen ändert genau diesen einen Punkt (mit Gummiband-Vorschau), ein Undo stellt alles wieder her — und wenn ein Zug geometrisch unmöglich ist (etwa ein nicht-konvexes Dach), bleibt das Original unangetastet stehen statt zu verschwinden. Esc schliesst eine laufende Masskette jetzt auch in der reinen 2D-Ansicht ab, und Kommentare lassen sich im klassischen Modus direkt am Klickpunkt erfassen (Kurztaste K).',
        station: 'design',
      },
      {
        text: 'Kosmo kann jetzt ganze Läufe fahren: Ein «Kosmo-Lauf» ist eine geplante Folge von Befehlen (LaufPlan), die Schritt für Schritt über denselben geprüften Command-Weg läuft wie jede Handbedienung — mit sichtbarer Schrittliste samt Begründungen im Kosmo-Panel, Abbrechen-Knopf, Stopp beim ersten Fehler und einem Undo-Schritt pro Lauf-Schritt. Kein Lauf startet je von selbst. Drei kuratierte Drehbücher liegen bei (Rohbau-Grundriss, Vis-Demolauf, Publish-Blatt), und die Zeichner-Eval wuchs von 25 auf 35 Prüffälle (35/35 bestanden).',
      },
      {
        text: 'Auf dem Blatt lassen sich Bemassung und Zonen-Kontext jetzt ein- und ausblenden (DARSTELLUNG-Insel, Werkzeug «Sichtbarkeit») — rein als Anzeige-Schalter, die abgeleiteten Pläne bleiben byte-identisch. PDF-Export-Fehler werden sichtbar gemeldet statt still verschluckt, und die Werkzeuge der Vis-, Publish- und Prepare-Inseln zeigen echte gezeichnete Symbole statt Buchstaben-Kürzeln (34 neue Icons nach der Design-Bauvorschrift).',
      },
      {
        text: 'Unter der Haube: Ein lange als «Flake» abgetaner Auswahl-Fehler entpuppte sich als echter Browser-Bug-Auslöser (Zieh-Gesten bauten unbemerkt eine Text-Selektion auf, die die nächste Geste einfrieren liess) und ist an der Wurzel gefixt. Die Release-Matrix wurde von 21 unabhängigen Prüfern adversarial am laufenden System abgenommen (20 von 21 sofort bestanden, der eine Fund — das Dach-Verlust-Risiko — ist gefixt), und die Design-Token-Familie wuchs um fünf kanonische Werte (Print-Tönung, zweite Warnstufe, Diagnose-Blau, Glas-Tinte).',
      },
    ],
  },
  {
    version: '0.8.4',
    datum: '2026-07-18',
    punkte: [
      {
        text: 'KosmoOrbit ist jetzt aus einem Guss: das Island-UI läuft in allen vier Werkstationen (Design, Vis, Publish, Prepare — je eigene Inseln mit echten Werkzeugen), und der Kosmo-Orb verhält sich überall gleich — Hover zeigt ein Mini-Popup, Einfachklick öffnet die Konversationskarte, Doppelklick das volle Kosmo-Panel, Esc oder ein Klick daneben schliesst. Die Orb-Hülle ist neutral-glasig statt gold, Insel-Pillen und Werkzeuge zeigen durchgehend gezeichnete Symbole statt Buchstaben.',
      },
      {
        text: 'Die Maus stimmt jetzt: die eigene Kosmo-Cursor-Ebene versteckt sich nicht mehr über Werkzeug-Zonen, sondern wechselt die Form (Greifen, Fadenkreuz, Spalten-/Zeilen-Resize, Gesperrt) — die Windows-Maus bleibt in der ganzen App unsichtbar. Dazu startet die Desktop-App maximiert (abschaltbar in den Einstellungen), das Hauptmenü ist statisch, zentriert und scrollfrei mit der Kachel-Reihe unten, und die Claude-Anmeldung führt ehrlich durch beide Wege: Abo-Login über die ant-CLI-Brücke oder API-Schlüssel mit echtem Validierungs-Ping.',
      },
      {
        text: 'Zeichnen wie in ArchiCAD, eine Stufe tiefer: Delete/Backspace löscht die Auswahl, Enter und Doppelklick schliessen jedes Mehrpunkt-Werkzeug ab, Rechtsklick bringt Auswählen/Eigenschaften/Löschen bzw. Abschliessen/Abbrechen, die Auswahl leuchtet deutlich. Massketten sind erstmals im Plan sichtbar und wie Kommentare wähl-, verschieb- und löschbar; ein Filter blendet Kommentare aus, und O/M/K/N rufen Öffnung, Messen, Kommentar und Mesh direkt auf (im ?-Overlay dokumentiert).',
        station: 'design',
      },
      {
        text: 'KosmoVis spricht die dunkle Designsprache (Canvas dunkel, Nodes hell), die Zoom-Leiste wohnt in der ANSICHT-Insel, Stimmungen sind echte Bild-Kacheln (prozedural erzeugt, ehrlich ohne HDRI-Downloads), und der komplette Demolauf Kamera→Material→Render(--fake)→KI-Slot fährt über Kernel-Commands — Kosmo kann ihn damit selbst auslösen.',
        station: 'vis',
      },
      {
        text: 'KosmoPublish zoomt (Mausrad, Fit, Pan auf dem Blatt), KosmoPrepare hat sein eigenes Island-Design ohne Fremd-Dock, und eigene KosmoData-Referenzen tragen jetzt Bilder: Upload mit ehrlicher Typ-/Grössen-Ablehnung, Anzeige im Dossier und als Tabellen-Thumb, Persistenz über Reload — der 112er-Seed bleibt unberührt. Ein Website-Sync-Wächter im Release-Gate hält architekturkosmos.ch und die eingebauten Referenzdaten beweisbar synchron.',
      },
    ],
  },
  {
    version: '0.8.3',
    datum: '2026-07-18',
    punkte: [
      {
        text: 'KosmoData ist jetzt Kosmos echtes Wissensfundament: die Referenz-Suche läuft über denselben BM25-Index wie die Wissens-Suche (ein geteilter Index statt zweier Wahrheiten), Referenz-Treffer im Chat tragen [Qn]-Belege und rendern als richtige Referenz-Karten mit Bild, und Kosmo bekommt pro Zug einen kompakten Daten-Kontext-Block in den Systemprompt (Token-Budget-bewiesen, nie über 1500 gesamt). Neu lassen sich eigene Referenzen als JSON importieren — mit zeilengenauer Ablehnliste statt Alles-oder-Nichts, «Eigene Referenz»-Kennzeichnung, Entfernen-Knopf und sofortiger Durchsuchbarkeit; der eingebaute 112er-Seed bleibt dabei byte-unverändert.',
      },
      {
        text: 'Drei Island-Werkzeuge, die in v0.8.2 noch ehrliche Rahmen waren, sind jetzt echt (Owner-Freigabe §8): Öffnungen platzieren per Klick auf eine Wand (die Skizze-Geste bleibt als zweiter Weg), ein Punkt-zu-Punkt-Mess-Werkzeug mit eigener MassKette-Entität im Kern (Undo/Sync inklusive, die 35 bestehenden Plan-Goldens blieben byte-identisch, ein 36. kam dazu) und Kommentare als vollwertige Kernel-Entität mit Setzen/Erledigen/Löschen, Plan-Overlay und Insel-Verwaltung. Der Deep-Link von Rendern/Blättern zur jeweiligen Station ist als entschieden dokumentiert.',
      },
      {
        text: 'iPad-Feinschliff: Island-Popups und Einstellungsfenster klammern sich jetzt beweisbar in den Viewport (Bounding-Box-Sweep über alle 29 Werkzeuge bei 1024×768) — und weichen dabei der eigenen Werkzeugleiste aus, statt sie zu überdecken; die Aufklapp-Animationen springen nicht mehr. Dazu ein Vorschlag hinter einer Einstellung (Standard AUS): Zwei-Finger-Doppeltipp macht rückgängig — die Konvention selbst bleibt bewusst eine offene Owner-Frage. Zwei alte Test-Flakes (Statusleiste wächst in die Navigation, verdeckter Modus-Chip im 3D|Plan-Split) sind an der Wurzel gefixt.',
      },
      {
        text: 'Fundament-Arbeit, ehrlich benannt: sechs kuratierte Arbeits-Skills (adaptiert aus dem Owner-markierten `claude-code-best-practice`-Repo, MIT-Attribution) liegen jetzt versioniert im Repo und fliessen als eigener Block in Kosmos Systemprompt; ein reproduzierbarer Commands-Trainingsdatensatz (372 seeded Beispiele über ALLE Kosmo-Befehle, inkl. 13% Ablehn-Fällen) füllt die bisher leere Registry-Zeile; die HomeStation-Bridge hat einen LoRA-Trainingspaket-Empfänger mit Manifest-/Hash-Prüfung — der echte GPU-/Unsloth-Lauf bleibt offen HomeStation-Sache, im Container läuft nur der gekennzeichnete Probemodus. Bridge-Embeddings, Vision-OCR und Mehrschicht-Ebenen sind bewusst NICHT Teil dieser Version.',
      },
    ],
  },
  {
    version: '0.8.2',
    datum: '2026-07-17',
    punkte: [
      {
        text: 'Selbstverbesserung, ehrlich zweigeteilt: Claude selbst ist nicht LoRA-trainierbar (Cloud-API, keine eigenen Gewichte) — dafür gibt es jetzt eine git-erfasste Lernschleife (`wissen/training/claude/lehren/`), die jede Version ihre Gates/Konventionen/Fehler/Owner-Entscheide belegt zurückschreibt, bevor die nächste beginnt. Parallel dazu wächst der echte Trainingsdatenraum für Kosmos eigene LoRA-Adapter: ein neu geordneter `wissen/training/`-Baum mit Schema-Validator (jetzt Teil von `release-gate`), ein reproduzierbarer Grundriss-Generator (925 seeded Beispiele, dreifach byte-gleich nachgewiesen), ein Trainer-Vertrag («Trainingspaket schnüren» mit Manifest-Hash-Beweis) und eine erste Signal-Erfassung, die Ablehnungen, Reparaturen und Layout-Entscheidungen nicht mehr im RAM verpuffen lässt, sondern sauber mit Sichtbarkeitsregel exportiert.',
      },
      {
        text: 'Die Rollen-Staffelung (Kosmo-Meister/-Leiter/-Zeichner) ist verdrahtet: jede Kosmo-Antwort trägt jetzt ein Badge, das die automatisch klassifizierte Aufgabenklasse zeigt — ehrlich mit «Ein-Modell-Betrieb» beschriftet, solange keine echte Mehr-Modell-Karte konfiguriert ist. Dazu ein Kuratier-Flow im Trainingsbereich: aussortierte Journal-Einträge zeigen ihren Grund, ein Fake-Probelauf bleibt sichtbar als Übung ohne echtes Training.',
      },
      {
        text: 'Neue Standard-Oberfläche in KosmoDesign: vier schwebende «Islands» an den Bildschirmrändern (Zeichnen/Ansicht/Projekt/Austausch) ersetzen die klassische Werkzeugleiste, das EntwurfsDock und die Statusleiste als Erststart-Default — jedes Werkzeug läuft eine feste Stufenkette (Pille → Leiste → Mini-Popup → Einstellungsfenster) durch. Die bisherige, vollständige Oberfläche bleibt als «Manuell» einen Klick entfernt vollwertig erhalten, inklusive Rückweg. Ein neuer, echter animierter Kosmo-Orb (derselbe Companion-Kern wie das bisherige Kosmo-Symbol) sitzt eigenständig zwischen den Islands und öffnet eine kompakte Konversationskarte mit echtem Vorschlag statt eines Platzhaltertexts.',
      },
      {
        text: 'Ehrlich offen: 11 von 29 Island-Werkzeugen sind noch reine Rahmen mit sichtbarem Hinweis statt echter Wirkung (u. a. Öffnung, Messen, Kommentare, Peers-Anzeige) — jeweils als offene Owner-Frage in `docs/ISLAND-UI-SPEZ.md` §8 dokumentiert, nicht stillschweigend vorgetäuscht. Der `kosmo-zeichner-commands`-Trainingsdatensatz ist bewusst noch leer (der Kurations-Weg existiert, nur ungenutzt). Reales Touch-Verhalten auf Hardware bleibt eine Owner-Prüfung ausserhalb des Containers.',
      },
    ],
  },
  {
    version: '0.8.1',
    datum: '2026-07-17',
    punkte: [
      {
        text: 'Drei Owner-Aufträge umgesetzt: das lokale LLM-Framework ist entlang vier Paketen ausgebaut (KI1 echte Vektor-Suche/Hybrid-Suche statt reinem Stichwort-Treffer, KI2 ein Systemprompt-Bauer mit Token-Budget statt hartem 40-Wände-Deckel + Anthropic-Prompt-Caching, KI3 Timeout/Retry für alle Chat-Provider-Streams, KI4 die Meister/Leiter/Zeichner-Modell-Staffelung als testbare Abstraktion — echte Mehr-Modell-Verifikation bleibt HomeStation-Sache). Die Werkzeugleisten sind umgebaut: eine feste Hauptzeile + höchstens eine Kontextzeile in KosmoDesign, das EntwurfsDock trägt neu einen «Skizze»-Knopf, die NavLeiste sitzt jetzt links unten statt mittig, und Splat-Import/-Werkzeug sind zu einem Knopf verschmolzen.',
      },
      {
        text: 'Zwei-Stufen-Popups: Werkzeugpanels können jetzt zusätzlich zu offen/eingeklappt eine dritte, kompakte Stufe zeigen (Kopf mit Titel + einer Kernkennzahl, ohne den vollen Körper) — als Erstes auf KennzahlenPanel und DrawPanel eingeführt, danach systematisch auf die übrigen Werkzeugpanels ausgerollt; wo sinnvoll wandert Tabelleninhalt dabei in Reiter statt zu scrollen.',
      },
      {
        text: 'Sechs grosse Ausbauten («D-Brocken»): der Design-Einzelexport zeichnet jetzt den vollen Plankopf (bisher nur der Blattsatz-Export) und Einzelblätter lassen sich mit Plancode im Dateinamen als eigenes PDF exportieren; ein neuer Auto-Pack-Layout-Editor zeigt die Blatt-Platzierung als echte, umordenbare Vorschau statt eines blinden Knopfs; das Rollen-Format (1600×594 mm) kommt mit Leporello-Faltlinien dazu; ein neuer KosmoPackage-Screen bündelt alle sechs echten Exportformate (PDF/SVG/DXF/IFC/Splat/Büro-Logo) plus `.kxp` ehrlich mit Status je Kachel — keine Kachel-Wand aus erfundenen Formaten; das neue `.kxp`-Dateiformat mit dem KosmoTrust-Viewer bringt ein Freigabe-Gerüst (Entwurf→Zur Freigabe→Freigegeben/Abgelehnt) mit Verlaufsprotokoll, unsigniert und mit offen benannter Konten-/HomeStation-Grenze; und der Orbit-Hub, die mobile Companion-Ansicht sowie ein neues Nutzungszeit-Panel in den Einstellungen (mit echten Klickgewichten aus dem bestehenden Adaptions-Speicher, keinen erfundenen Zahlen) sind fertig ausgebaut.',
      },
      {
        text: 'Eine vier Releases alte, unbemerkte Regression ist behoben: seit v0.7.8 rutschte das Volumenstudien-Panel nicht mehr zuverlässig unter die Geschossleiste — jetzt per Bisect gefunden und mit einem gezielten dritten Solver-Lauf für genau diesen Fall repariert.',
      },
      {
        text: 'Ehrlich offen: die GPU-Telemetrie zeigt im Container mangels echter GPU einen klar beschrifteten «nicht verfügbar»-Zustand statt einer erfundenen Zahl; die Tauri-Zweitfenster-Schliessen-Choreografie bleibt eine Rust-Baustelle; reales Touch-Verhalten auf echter Mobil-Hardware sowie eine echte Mehrbenutzer-Freigabe für KosmoTrust bleiben Owner-Aktionen ausserhalb des Containers; der AF-Stempel aus dem Publish-Auftrag ist wegen eines Konflikts mit einem eingefrorenen Golden-Test formal vertagt.',
      },
    ],
  },
  {
    version: '0.8.0B',
    datum: '2026-07-16',
    punkte: [
      {
        text: 'Die komplette visuelle Schicht ist neu gebaut — streng nach den 7 ClaudeDesign-Paketen (v0.7.1–v0.8.0), der Software-Kern (Commands, Undo, Yjs-Sync, Solver) bleibt byte-gleich unangetastet. Fundament: additive Design-Tokens (Abstände bis 96px, eine Typo-Leiter bis «display», eine Schatten-Skala) und der Alpha-Border-Umstieg im dunklen Thema (Linien werden halbtransparent statt Volltonfarbe — ruhiger, aber ohne Kontrastverlust).',
      },
      {
        text: 'Eine komplett neue Komponentenschicht (KButton, KField, KTabs, KPill, KKeyValue, KCard, KSwitch und mehr) ersetzt rund 2100 einzelne Inline-Styles durch ein einziges, konsistentes Regelwerk — beide Farbwelten (dunkel/hell) durchgehend.',
      },
      {
        text: 'Das Dock-Chrome (schwebende Werkzeug-Panels) und die BodenDock-Pille unten in der Mitte haben ihre endgültige Gestalt bekommen: Panels tragen ihre Rollenfarbe nur noch als schmale Kopflinie statt als Fläche, die Pille sortiert ihre Werkzeuge nach einer Rang-Formel aus Planungsphase und tatsächlicher Nutzung.',
      },
      {
        text: 'Alle 9 Werkstationen (Design, Vis, Data, Publish, Prepare, Asset, Doc, Dev, Train) und alle 13 Design-Werkzeugpanels (Berechnungsliste, Zeichnen, Varianten, Splat, Kennzahlen, Raster, Mängel, Bauablauf, Unternehmerplan, Skizzen-Overlay, Modul-Editor, Ausschreibungs-Check, Vorhangfassade) sind auf die neue Gestaltungsgrammatik umgestellt — Funktionen, Tastenkürzel und Testanker (testids) sind dabei überall byte-gleich geblieben.',
      },
      {
        text: 'Jede Ansicht zeigt jetzt genau eine gefüllte Signal-Fläche (die eine Haupt-Aktion, z. B. «Plansatz PDF») statt mehrerer gleichrangig wirkender Knöpfe — das war das grösste Einzelmerkmal von «unaufgeräumt» und ist jetzt durchgängig behoben.',
      },
      {
        text: 'Die Erststart-Presets Fokus/Arbeiten/Prüfen aus v0.8.0 (Design, Vis, Publish) sind vom Neubau unberührt geblieben und funktionieren weiter über dieselben Knöpfe.',
      },
      {
        text: 'Ehrlich offen: der OnboardingWizard und der Rest des StarterGuide warten noch auf ihre eigene Umbau-Runde; die GovernanceGate-Optik bleibt bewusst beim Bestand (die eingefrorene Datei bräuchte eine Owner-Freigabe zur Auftauung, bevor sie Klassen statt Inline-Styles bekommen kann); die seit v0.8.0B/P1 offene Linien-Skala-Token-Frage (B-135) ist mit diesem Release formell geschlossen — ohne eigenen Bauauftrag, weil ihr bis zuletzt ein echter Verbraucher fehlte; und die BodenDock-Kreisgrössen weichen bewusst von der ursprünglichen Design-Vorlage ab (64/54/46px statt 44/36px), weil die kleineren Masse den bestehenden, getesteten Abstands-Vertrag der Pille gebrochen hätten — der Owner kann das jederzeit als eigenen Entscheid zurückholen.',
      },
    ],
  },
  {
    version: '0.8.0',
    datum: '2026-07-15',
    punkte: [
      {
        text: 'KosmoPublish hat ein vollständiges Blattlayout-Framework bekommen: ein normgerechter 180×55-mm-Plankopf, Faltmarken nach DIN 824, Lochung nach ISO 838 und eine sechsstufige Phasen-Matrix (Vorstudie bis Ausführung) mit passendem Wasserzeichen — in der Ausführungsphase ersetzt ein Freigabe-Stempel das Wasserzeichen. Bestehende Blätter sind automatisch auf das neue Framework umgestellt; einzige Ausnahme ist das A0-Plakat, das den vollen Plankopf, aber bewusst keinen 20-mm-Heftrand trägt.',
        station: 'publish',
      },
      {
        text: 'Jedes Blatt bekommt einen automatischen Plancode (Büro-Kürzel · Projekt-Code · Phasen-Stufe · Disziplin · Geschoss · Plan-Nummer) — er erscheint im Plankopf, im Export-Dateinamen und in der Transmittal-Liste, sobald die nötigen Stammdaten stehen; ohne sie bleibt der bisherige Dateiname unverändert.',
        station: 'publish',
      },
      {
        text: 'Neues Plankopf-Panel: Plankopf-Felder, Büro-Stammdaten samt PNG-Logo, Projekt-Code und fünf Layout-Schalter (Heftrand/Faltmarken/Wasserzeichen/Massstabsbalken/Nordpfeil) an einem Ort — inklusive Massstab-Empfehlungen als anklickbare Chips je Planungsphase.',
        station: 'publish',
      },
      {
        text: 'Aufgeräumte Standard-Oberflächen: KosmoDesign, KosmoVis und KosmoPublish bieten je drei benannte Ansichten — Fokus (nur das Nötigste), Arbeiten (der kuratierte Alltag) und Prüfen (Kennzahlen und Kontrolle im Vordergrund). Ein echter Erststart landet automatisch bei Fokus; wer die Oberfläche bereits selbst eingerichtet hat, bleibt unangetastet. Kosmo räumt auf Zuruf auf («Räum die Oberfläche auf»).',
      },
      {
        text: 'Die untere Werkzeug-Pille schwebte bisher stationsblind über dem Inhalt — in KosmoPublish lag sie mitten auf dem Blatt. Sie hält jetzt überall sauber Abstand, und Dossier sowie Plankopf sind als vollwertige, automatisch ausweichende Dock-Panels in KosmoPublish angekommen.',
        station: 'publish',
      },
      {
        text: 'Ehrlich offen: das eigenständige .kxp-Hyper-Modell samt Viewer und Freigabe-Workflow, ein grösserer Auto-Layout-Editor fürs Blatt und Büro-Logos als SVG/JPG (heute nur PNG) bleiben spätere Runden — nichts davon ist vorgetäuscht.',
      },
    ],
  },
  {
    version: '0.7.9',
    datum: '2026-07-14',
    punkte: [
      {
        text: 'Die letzte feste Fläche ist ins Dock gezogen: die Viewport-Statuskarte und die Eigenschaften-Säule sind jetzt schwebende Panels, die automatisch ausweichen — damit ist die letzte bekannte Überlappungs-Klasse geschlossen; die Kollisions-Ausnahmeliste der Tests ist leer.',
        station: 'design',
      },
      {
        text: 'Eingeklappte Panel-Tabs lassen sich jetzt greifen und umdocken (Klick öffnet weiterhin), und schwebende Panels docken per Ziehen in die Seiten-Zonen an. Ein frisch geöffnetes Panel klappt ausserdem nie mehr sofort selbst ein.',
        station: 'design',
      },
      {
        text: 'Die Geschossleiste endet bei vielen Geschossen jetzt sauber über dem Entwurfs-Dock (sie scrollt einfach früher) — die letzte Alt-Überlappung ist behoben.',
        station: 'design',
      },
      {
        text: 'Testpflege, ehrlich: sieben schlummernde Fehlalarme derselben Klasse (Gross-/Kleinschreibung gegen versal gesetzte Blatt-Titel) wurden durchgekämmt und behoben — zwei davon waren bereits rot, ohne dass es auffiel. Dazu zwei echte kleine Bugs aus dem Dock-Bestand (Stapelordnung frei abgelegter Panels, ein Drag-Rennfenster).',
      },
      {
        text: 'Fürs echte iPad liegt ein Test-Drehbuch bereit (Einstellungen-Doku) — die Touch-Gesten sind bisher nur synthetisch bewiesen; der Test am Gerät ist eine offene Owner-Aktion.',
      },
    ],
  },
  {
    version: '0.7.8',
    datum: '2026-07-14',
    punkte: [
      {
        text: 'Die Werkzeug-Panels überlappen sich nicht mehr: ein neues Dock-System gibt jedem Panel seinen Platz — links, rechts oder schwebend im Viewport. Öffnet ein Panel, schrumpfen die Nachbarn automatisch; wird es zu eng, klappt das unwichtigste zu einem Tab ein (ein Klick öffnet es wieder). Ein kurzer Hinweis erklärt jede automatische Umordnung.',
        station: 'design',
      },
      {
        text: 'Alles ist von Hand übersteuerbar — mit Maus und Finger: Trennbalken ziehen, Panels am Kopf greifen und neu andocken, anheften (behält seine Grösse), herauslösen als schwebendes Fenster mit magnetischem Einrasten, und «Layout zurücksetzen» stellt das schlaue Standard-Layout wieder her. Die Anordnung überlebt den Neustart.',
        station: 'design',
      },
      {
        text: 'Auch die Visualisierungs-Station ist gedockt: Node-Palette, Ausrichten-Leiste, Minimap und Legende folgen denselben Regeln.',
        station: 'vis',
      },
      {
        text: 'Neu wählbar in den Einstellungen: «Raster-Kachel» — die zweite Anordnungs-Art, bei der nichts schwebt und sich alle Flächen den Platz teilen. «Orbit-Zonen» bleibt der Standard.',
      },
      {
        text: 'Kosmo ordnet selbst: sieben neue Werkzeuge lassen Kosmo Panels docken, anheften, einklappen und zurücksetzen — jede Aktion sichtbar quittiert im Chat, mit einem goldenen Orb und «KOSMO»-Ring am bedienten Panel und jederzeit STOPP.',
      },
      {
        text: 'Eine geführte 7-Schritte-Tour erklärt die Dock-Regeln am lebenden Layout (Einstellungen → «Werkzeug-Dock kennenlernen») und stellt danach alles exakt wieder her; ein Regeln-Panel zeigt die Rangfolge.',
      },
      {
        text: 'Governance ehrlicher: Eine Vis-Freigabe endet jetzt automatisch, sobald ihr Lauf wirklich abgeschlossen ist (sichtbar quittiert); einen ganzen Auftrag beendet der neue Knopf «Auftrag beendet». Kein erfundenes Verfallsdatum.',
      },
      {
        text: 'Der Kosmos-Look reicht jetzt in die Inhalte von Publish, Grundlagen, Bibliothek, Training und Diagnose (Glass-Karten mit Stations-Tönung) — rein optisch.',
      },
      {
        text: 'Aufgeräumt & ehrlich: die zwei früher als «headless-WebGL-Grenze» geführten Render-Tests laufen nachweislich grün (die alte Diagnose war falsch — der Export braucht gar kein WebGL); mehrere schlummernde Test-Fehlalarme und echte kleine Bugs (Icon-Drag, Dialog-Stapelordnung, verschluckte Fehlermeldungen) wurden dabei gefunden und behoben.',
      },
    ],
  },
  {
    version: '0.7.7',
    datum: '2026-07-13',
    punkte: [
      {
        text: 'Das Projekt-Dossier aus 0.7.6 ist jetzt direkt erreichbar: ein neuer Knopf «Dossier» in der Publish-Werkzeugleiste öffnet das mehrteilige Blatt und exportiert es als SVG oder PDF (aktiv, sobald ein Projekt geladen ist).',
        station: 'publish',
      },
      {
        text: 'Kosmos gibt jetzt dauerhaft frei: Wenn du im Companion oder im Kosmo-Panel «Für den Job erlauben» wählst, überlebt diese Erlaubnis einen Neustart. Sie endet ehrlich nur, wenn du sie ausdrücklich widerrufst — es wird kein automatisches Verfallsdatum vorgetäuscht.',
      },
      {
        text: 'Der Erststart-Schritt «Kosmo-Zentrale koppeln» ist echt geworden: ein QR-Code zum Koppeln eines Zweitgeräts und ehrliche Zustände (suche / gefunden / nicht gefunden — manuell koppeln / im Cloud-Betrieb keine eigene Zentrale nötig), die aus dem echten Verbindungstest kommen — keine erfundenen Gerätezeilen.',
      },
      {
        text: 'Die dunkle «Kosmos»-Oberfläche zieht sich jetzt durch alle Stationen: Publish, Grundlagen, Bibliothek, Training und Diagnose tragen denselben dezenten Glass-Kopf mit Modul-Tönung wie Entwerfen, Visualisieren und Daten. Rein optisch — Inhalte und Bedienung bleiben unverändert.',
      },
      {
        text: 'Testpflege: ein hartnäckiger Fehlalarm im Blatt-Test (Gross-/Kleinschreibung) wurde behoben. Ehrlich offen: zwei Render-Tests (Viewport-Render, Vis→Blatt) lassen sich in der reinen Server-Testumgebung ohne echte Grafikkarte nicht abschliessen — das ist eine Umgebungsgrenze, kein Fehler in der App, und offen als nächster Punkt notiert.',
      },
    ],
  },
  {
    version: '0.7.6',
    datum: '2026-07-13',
    punkte: [
      {
        text: 'Der 3D-Viewport hat eine neue Bedienschale bekommen: drei Bearbeitungsmodi (Modellieren, Kamera, Review) mit eigener Rollenfarbe, ein Glass-HUD mit Live-Werten (Ansicht, Raster, Kamera-Azimut/Neigung/Distanz, Brennweite), ein Orientierungs-Kreuz mit echtem Kompass-Label und eine Zoom-Steuerung. Alle Anzeigen sind aus echten Laufzeitwerten abgeleitet — keine erfundene Telemetrie.',
        station: 'design',
      },
      {
        text: 'Die KosmoVis-Kuratierung ist von einem kleinen Einblend-Fenster zu einer vollen Fläche gewachsen: Varianten als 3-spaltiges Kartenraster, Filter (Alle/Favoriten/Verworfen), Umschalter Raster/Vergleich, eine A/B-Parameter-Diff-Tabelle und ein Inspektor mit Herkunfts-Kette und Bewertung. Ehrlich: es gibt keine erfundene «Seed»-Nummer und die Sterne kommen aus den vorhandenen Qualitäts-Werten, nicht aus einem Handrating.',
        station: 'vis',
      },
      {
        text: 'Die Companion-Ansicht ist jetzt orb-zentriert: der grosse Kosmo-Orb mit seinen neun echten Zuständen steht im Mittelpunkt, daneben die laufenden Agenten und Aufträge. Neu ist ein abgestuftes Freigabe-Gate mit vier Stufen (Einmal erlauben / Für den Job erlauben / Nachfragen / Ablehnen) — jede Stufe mit echter Wirkung, auch das bisher gar nicht ansteuerbare Abbrechen eines Vis-Jobs.',
      },
      {
        text: 'Die Datenstationen zeigen den Referenzkatalog jetzt als Tabelle (ID, Objekt, Quelle, Epoche, Material, Status) mit einer Quellen- und Epochen-Leiste zum Filtern. Ehrlich: Epoche wird aus dem Baujahr abgeleitet und der Status (Indexiert/Sync/Lokal) aus den vorhandenen Feldern konstruiert — nichts davon ist erfunden.',
        station: 'data',
      },
      {
        text: 'Der Erststart ist jetzt ein 4-Schritt-Assistent (Konto & Büro, Kosmo-Zentrale koppeln, Modelle & Core laden, erstes Projekt) mit klickbarem Fortschritts-Stepper. Ehrlich: die Hardware-Kopplung und der Modell-Download benennen offen, was erst mit einer angeschlossenen Zentrale kommt, statt einen Fortschritt vorzutäuschen.',
      },
      {
        text: 'Neu im Druck: ein mehrteiliges Projekt-Dossier (A4, Übersicht, Kennzahlen, Bild-Slots, Herkunfts-Kette, Grenzen-Block) als eigenständiges Blatt mit SVG- und PDF-Export. Es kommt additiv dazu — die bestehenden Report-Blätter bleiben unverändert.',
        station: 'publish',
      },
      {
        text: 'Unter der Haube: die dunkle «Kosmos»-Oberfläche hat ein additives Gestaltungs-Fundament bekommen (Glass-Flächen, dezenter Glow, Rollen-Tönungen) — die Grundlage für die neue Bedienschale in Viewport, Kuratierung und Companion. Das helle «Papier» und der Plandruck bleiben davon unberührt.',
      },
    ],
  },
  {
    version: '0.7.5',
    datum: '2026-07-12',
    punkte: [
      {
        text: 'Beschlag-Katalog Stufe 2: die 12 Beschlagtypen aus 0.7.4 lassen sich jetzt konkret an Türen und Fenstern zuweisen (Auswahl im Inspector, nach Kategorie gruppiert). Zugewiesene Beschläge erscheinen im Werkplan als Piktogramm, im DXF als Texteintrag auf dem Layer BESCHLAG und im IFC-Export als eigenes Zubehör-Element (IFCDISCRETEACCESSORY). Ehrlich: die Zuweisung hängt an der Öffnung; frei platzierbare Beschlag-Instanzen bleiben ein späterer Ausbauweg.',
        station: 'design',
      },
      {
        text: 'Neu: Projekt-Stammdaten — Bauherr, Adresse, Parzellennummer und Verfasser:in lassen sich im Projekt-Menü erfassen und erscheinen (Bauherr/Verfasser) automatisch im Plankopf jedes Plans. Ehrlich offen: diese Angaben werden wie jede Projekteinstellung über Undo und den Projekt-Export gespeichert, aber (noch) nicht live zwischen zwei gleichzeitig geöffneten Sitzungen desselben Projekts synchronisiert — das folgt in einer späteren Runde.',
        station: 'design',
      },
      {
        text: 'Die in 0.7.4 offen benannte PDF-Lücke ist geschlossen: der Plankopf-Untertitel und das Nordpfeil-«N» erscheinen im PDF-Export jetzt in der richtigen Schrift (Lato Regular) statt in einer Sans-Ersatztype — der eingebettete Font-Satz wurde um den fehlenden Schnitt ergänzt.',
        station: 'design',
      },
    ],
  },
  {
    version: '0.7.4',
    datum: '2026-07-12',
    punkte: [
      {
        text: 'Der hochgestellte mm-Rest der SIA-Bemassung (z.B. «361⁵») überlebt jetzt auch im PDF-Export. Bisher setzte der Export ein Sonderzeichen, das die Druck-Fonts für die Reste 4–9 gar nicht kennen — «361⁵» wurde still zu «361». Neu wird der Rest als normale, klein hochgestellt positionierte Ziffer gezeichnet; alle Reste 1–9 kommen mit.',
        station: 'design',
      },
      {
        text: 'Plankopf-Feinschliff: Untertitel-Zeile und Nordpfeil-«N» stehen jetzt in der Titel-Schrift. Ehrlich offen: im PDF-Export fällt die Regular-Nebenzeile noch auf eine Sans-Ersatztype zurück (der Schnitt Lato 400 ist für den PDF-Pfad nicht eingebettet, nur Lato 900) — lesbar, aber nicht identisch zum Bildschirm; das Nachziehen ist als kleiner Folgepunkt dokumentiert.',
        station: 'design',
      },
      {
        text: 'Gedruckte Pläne: die Projektionslinien tragen jetzt ihren eigenen Grauton (#666) statt des Schnitt-Tons, und die Abbruch-/Soll-Linien folgen der SIA-Kadenz — beides schliesst die zwei ausdrücklich auf 0.7.4 vertagten Punkte aus der 0.7.3-Strich-Matrix.',
        station: 'design',
      },
      {
        text: 'Live-Plan: die Nachbarbebauung folgt jetzt der Bauphase wie der Druckweg — im Werkplan ausgeblendet, im Bauprojekt nur als Umriss, im Wettbewerb/Vorprojekt gefüllt. Die Parzellengrenze bleibt phasenunabhängig strichpunktiert.',
        station: 'design',
      },
      {
        text: 'Der Kosmo-Orb sitzt in einer Modul-Ansicht jetzt rechts im Boden-Dock (statt frei zu überlappen); auf der Zentrale bleibt er frei unten rechts. Er erscheint immer genau einmal — nie doppelt, nie verschwunden.',
      },
      {
        text: 'Plan-Navigation: das Verschieben (Pan) hat jetzt eine Grenze — die Zeichnung kann nicht mehr versehentlich aus dem sichtbaren Fenster geschoben und «verloren» werden.',
        station: 'design',
      },
      {
        text: 'Wenn Kosmo selbstständig ein grosses Paket (ab 8 Schritten) anwendet, legt sich ein Vollbild-Rahmen «Kosmo arbeitet» über den Bildschirm, solange sichtbar gezeichnet wird. ESC überspringt die Schau — die Anwendung selbst läuft trotzdem atomar durch und bleibt wie immer per Rückgängig umkehrbar.',
      },
      {
        text: 'Die Companion-Ansicht (Phasen-Ring, Job-/Freigabe-Karten fürs Zweitgerät) ist jetzt regulär über die Einstellungen auffindbar, statt nur über die von Hand ergänzte Adresse.',
      },
      {
        text: 'Kleinere Politur: das Unterlabel im Orbit-Startmenü bricht bei Enge um, statt den Nachbarn zu überlagern.',
      },
      {
        text: 'Beschlag-Katalog Stufe 1: 12 architektonische Beschläge (Türdrücker, Band/Scharnier, Einsteckschloss, Bodentürschliesser, Profilzylinder, Panikstange, Fenstergriff u.a.) sind als Katalog mit Plan-Symbol und IFC-Zuordnung angelegt. Ehrlich: das eigentliche Platzieren im Plan und die Bedienoberfläche folgen in Stufe 2 — Stufe 1 ist die Datengrundlage.',
        station: 'design',
      },
    ],
  },
  {
    version: '0.7.3',
    datum: '2026-07-12',
    punkte: [
    {
      text: 'Alle gedruckten Pläne folgen jetzt EINER Strich-Matrix aus Stiftstärke × Grauton × Linientyp: geschnitten #111, gesehen #3A3A3A, Projektionen #666, Kontext #8a8a8a — und die Fassaden-Sichtkante liegt neu bei 0.25 mm (vorher 0.35, ein Holdover aus der Zeit, als diese Kante noch schwarz war). Ehrlich offen: die Linientyp-Kadenzen sind noch nicht auf das volle SIA-Vokabular normalisiert und die Grundriss-Projektionsflächen tragen weiterhin den geschnitten-Ton — beides ist auf 0.7.4 vertagt.',
      station: 'design',
    },
    {
      text: 'Fensterflügel zeigen jetzt die Öffnungsrichtung: nach innen öffnend durchgezogen, nach aussen öffnend gestrichelt (2–1-mm-Kadenz), in Grundriss und Ansicht. Dazu bekommt ab der Vorprojekt-Phase JEDE Öffnung (Fenster und Türen) eine echte Leibungslinie — im Werkplan zusätzlich die Rahmenlinie —, womit die früher konturlosen Lochungen geschlossen sind. Grenze wie beim Bestand: keine Hidden-Line-Verdeckung, geschnittene Öffnungen erhalten keine Leibung (sie sind Schnitt, nicht Ansicht).',
      station: 'design',
    },
    {
      text: 'Der Nachbar-/Parzellen-Kontext im Grundriss folgt jetzt der Bauphase (LOD-Treppe): Wettbewerb/Vorprojekt gefüllt grau, Bauprojekt/Baueingabe nur als Umriss, im Werkplan ganz aus — die Parzellengrenze bleibt in jeder Phase strichpunktiert. Ehrlich offen: diese Phasen-Treppe greift bisher nur im Druck-/PDF-Weg; am Bildschirm (Live-Plan) bleiben die Nachbarn vorerst immer sichtbar — die Verdrahtung der Phasen-Weiche in die Live-Ansicht folgt mit 0.7.4.',
      station: 'design',
    },
    {
      text: 'Blätter sprechen jetzt mit «zwei Stimmen»: Titel in Lato (versal, leicht gesperrt), alles Messbare (Masse, Koten, Tabellen, Plankopf-Meta) in IBM Plex Mono mit echten Tabellenziffern — durchgängig über Blatt-Module, Plan/Schnitt/Ansicht und Plankopf; die Schriften sind fürs PDF fest eingebettet. Ehrlich benannt: das Soll nennt «Lato Heavy 800», die es frei nicht gibt — gewählt ist Lato 900 (Black), das dem kräftigen Soll-Strich empirisch am nächsten kommt (bewusst nicht als «800» ausgegeben).',
      station: 'publish',
    },
    {
      text: 'Zwei ehrliche Grenzen der neuen Blatt-Typografie: der DXF-Export trägt weiterhin die CAD-Standardschrift (keine Web-Fonts im DXF), und der hochgestellte SIA-mm-Rest zeigt im PDF-eingebetteten Font nur die Ziffern 1–3 (¹²³) — für den Rest 4–9 fehlt sowohl Lato als auch IBM Plex Mono die Hochzahl-Glyphe, «361⁵» wird im PDF still zu «361». Der Glyphen-Weg dafür ist auf 0.7.4 vertagt.',
      station: 'publish',
    },
    {
      text: '3D-Modusregel «Phase entscheidet»: bis zur Baueingabe zeigt der Viewport das Weissmodell, ab Ausschreibung Materialien — und für den amtlichen Charakter zwingt die Regel Visualisierungs-Aufnahmen in den zur Phase passenden Modus, damit kein Textur-Rendering eine Wettbewerbs- oder Vorprojektphase vortäuscht.',
      station: 'vis',
    },
    {
      text: 'Neuer Beschlag-Katalog im Werkplan: Fenster und Türen können Band, Griffseite, Antrieb (z. B. Motor «M») und Absturzsicherung tragen, dazu die aus Sturz/Brüstung etikettierte Brüstungshöhe — als Katalogsymbole, die NUR im Werkplan erscheinen (Daten-Guard). Ehrlich als Stufe S0 benannt: erst 6 Symbole, reine Linien-/Text-Piktogramme (keine pixelgenauen Katalogzeichen), nur im Werkplan — die volle 12-Symbol-Stufe S1 und die IFC-Abbildung des Beschlags folgen später.',
      station: 'design',
    },
    {
      text: 'Die Themenwahl ist auf ein klares Paar reduziert: «Papier» (hell) und «Kosmos» (dunkel) — das alte «Tinte»-Theme ist entfernt. Eine bereits getroffene eigene Theme-Wahl wird respektiert; die Papier-ist-Papier-Invarianz (identische Struktur in beiden Welten) ist per Regressionswache abgesichert.',
    },
    {
      text: 'Neu ein app-weites Boden-Dock in den Arbeitsansichten — der Schnellzugriff auf die Werkzeuge sitzt jetzt durchgängig am unteren Rand statt nur im runden Zentrale-Hub. Ehrlich vertagt: der Kosmo-Orb sitzt vorerst NEBEN dem Dock, nicht darin — die Integration ins Dock folgt mit 0.7.4, wobei das freie Kosmo-Symbol überall verfügbar bleiben muss.',
    },
    ],
  },
  {
    version: '0.7.2',
    datum: '2026-07-11',
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
  },
  {
    version: '0.7.1',
    datum: '2026-07-11',
    punkte: [
      {
        text: 'Kosmo-Blick in der Cloud gehärtet: jedes Bild wird vor dem Versand auf ~1.15 Megapixel verkleinert und als JPEG neu encodiert, ein 4-MB-Budget prüft die Bildgrösse VOR dem Netz-Roundtrip, und ein zu grosses Bild bekommt eine konkrete deutsche Meldung statt eines generischen Fehlers — bewiesen per abgefangenem Anthropic-Request (Bild-Block im Request-Body); der echte Modell-Call mit einem echten Owner-Schlüssel bleibt Owner-Abnahme (Drehbuch in docs/BETRIEBSARTEN.md).',
      },
      {
        text: 'Cloud-Anmeldung: ein «Abmelden»-Knopf löscht das Abo-Token gezielt (der API-Schlüssel bleibt unangetastet), und ein neu eingetragener API-Schlüssel räumt jetzt auch ein liegengebliebenes Alt-Token auf.',
      },
      {
        text: 'Nachbargebäude amtlich: «Nachbarn übernehmen» im Standort-Panel holt echte Gebäude-Polygone von geo.admin.ch (VECTOR25, der einzige identify-fähige Layer mit Gebäude-Polygonen) und zeigt sie im Situationsplan als graue Footprints neben der eigenen, schwarzen Zone — offen benannt: der Datenstand ist ~2008, amtlich aber nicht tagesaktuell, neuere Gebäude können fehlen. Parzelle und Nachbarn erscheinen jetzt auch im Grundriss als eigener Kontext-Layer.',
        station: 'design',
      },
      {
        text: 'DXF-Export konsolidiert: es gibt jetzt nur noch EINEN Exporter, und er zeichnet Bemassungsketten (Mass, Ticks, Beschriftung) auf einem eigenen Layer mit — bewusster Verhaltenswechsel: Publish-DXF ist ab jetzt y-gespiegelt und trägt semantische Layer, konsistent mit dem Design-Export/Import (vorher unterschieden sich die beiden DXF-Wege).',
        station: 'publish',
      },
      {
        text: '3D-Referenzmodelle laden jetzt auch remote nach, wenn kein lokales Modell vorliegt (ehrlicher Fehler, falls das Archiv nicht erreichbar ist — dessen Inhalt kann derzeit noch leer sein); dazu ein erstes Gelände-Mesh im 3D-Viewport, wo ein Terrain-Profil erfasst ist.',
        station: 'data',
      },
      {
        text: 'Fenster bekommen echtes Glas in 3D (auch die bisher blossen Löcher der nicht-parametrischen Fenster) und eine SIA-gerechte Öffnungssymbolik in Ansicht UND Live-Schnittvorschau (Dreh-/Kipp-/Drehkipp-Dreieck mit Angelseite, Schiebe-Pfeil) — im Grundriss ergänzt Kipp ein kurzes Doppelstrich-Symbol; ohne gewählten Flügeltyp bleibt jedes Blatt byte-identisch zum bisherigen Bild.',
        station: 'design',
      },
    ],
  },
  {
    version: '0.7.0',
    datum: '2026-07-11',
    punkte: [
      { text: 'SIA-Planungsphasen komplett im Plan: Wettbewerb, Vorprojekt, Bauprojekt, Baueingabe und Werkplan sind wählbare Darstellungsphasen — bis und mit Baueingabe erscheinen geschnittene Bauteile SIA-gemäss schwarz (Wettbewerb/Vorprojekt als EIN Poché, Bauprojekt/Baueingabe mit Schichten: tragend schwarz, nichttragend grau, Dämmung weiss); Umbau-Farben (rot/gelb) behalten Vorrang, der Werkplan bleibt unverändert.', station: 'design' },
      { text: '3D folgt der Phase: bis zur Baueingabe zeigt der Viewport ein Weissmodell, ab Ausschreibung Materialien — im Projekt-Menü übersteuerbar (auto/Material/weiss/schwarz), Fenster behalten ihre Transparenz.', station: 'design' },
      { text: 'Situationsplan v1 (Schwarzplan): eigene Gebäude-Footprints schwarz, echte Parzellengrenze strichpunktiert, Nordpfeil und Massstabsbalken — als neuer Blatt-Typ in der Publikation; Nachbargebäude werden ehrlich weggelassen, solange keine erfassten Kontext-Polygone existieren.', station: 'publish' },
      { text: 'Blätter füllen sich selbst: «Blatt füllen» ergänzt fehlende Ansichten, Schnitte und den Situationsplan automatisch aus dem Modell — ein Rückgängig-Schritt, nichts wird doppelt platziert.', station: 'publish' },
      { text: 'Varianten in Echtzeit: das neue Varianten-Panel durchsucht Wohnungs-Aufteilungen live (vier Gewichte-Regler, fester Seed = reproduzierbar), zeigt die Top-8 mit Teilscores und Kennzahl-Matrix; «Übernehmen» schreibt über das bestehende Segmentier-Kommando — EIN Rückgängig-Schritt.', station: 'design' },
      { text: 'Kosmo-Präzisier: drei neue Präzisions-Kommandos — Türen exakt platzieren, drei klar automatisierbare Grundriss-Befunde in einem Zug beheben, Wohnungstyp einer Einheit konsistent aktualisieren (jeweils EIN Rückgängig-Schritt).' },
      { text: 'Zonen-Vorlagen lernen dazu: pro Achse fest oder dehnbar (Locks überleben das Absetzen mit Stretch), und Vorlagen können Regel-Sätze mitbringen, die beim Instanziieren aktiv werden.', station: 'design' },
      { text: 'Fenster und Türen sind im Grundriss direkt klickbar (Öffnung vor Wand, 40 mm Toleranz); die Fenster-Aufschlagbögen lassen sich projektweit abschalten; das Inspector-Panel überdeckt bei schmalen Fenstern nicht mehr die Navigation.', station: 'design' },
      { text: 'BIM-Brücke belegt: IFC- und DXF-Roundtrip-Tests beweisen den Weg nach Rhino/Revit/Grasshopper ohne Neuzeichnen; docs/INTEROP.md beschreibt die ehrlichen Grenzen (kein .rvt-Direktexport, DXF ohne Bemassungs-Layer).' },
      { text: 'Unter der Haube: Parzellen-Zonen zählen nicht mehr in NGF-/Raumtyp-Kennzahlen; die 3D-Referenzlade-Prüfung misst jetzt echte Geometrie (die alte Test-Fixture war eine leere Szene); der 3D-Modus ist am Container per data-Attribut beweisbar.' },
    ],
  },
  {
    version: '0.6.9',
    datum: '2026-07-10',
    punkte: [
      { text: 'Fenster werden parametrisch: Einflügel, Zweiflügel, Festverglasung oder Fensterband mit Teilung (n×m) und Rahmenbreite — einstellbar im Inspector, als Kosmo-Kommando und sichtbar in 3D, Grundriss, Schnitt und Ansicht.', station: 'design' },
      { text: 'Curtain-Wall v1: «Fassadenband setzen» belegt eine ganze Fassadenseite (Süd/Nord/West/Ost) in einem Zug mit Fensterband-Öffnungen im Pfostenraster — EIN Rückgängig-Schritt, ausgelassene Segmente werden ehrlich gemeldet.', station: 'design' },
      { text: 'Wissen antwortet mit Beleg: per Docling importierte Dokumente lassen sich in die Wissensbasis laden und fliessen dann in Kosmos Quellensuche — Antworten zitieren die eigene Import-Notiz als [Q]-Quelle.', station: 'data' },
      { text: 'Echte Auswahlmenüs: die Dropdowns der App sind jetzt eigene Menüs im Werkplan-Stil (Tastatur ↑↓/Enter/Esc, Tipp-Suche, Fokusring) statt der Browser-Standardliste — das native Menü bleibt als Fluchtweg erhalten.' },
      { text: 'Kosmo-Blick fertig bewiesen: der Mitschau-Beweis gilt jetzt auch für Grundriss/Schnitt, die Node-Fläche und echte Renderbilder; der «Kosmo sieht»-Chip öffnet per Klick eine Vollbild-Vorschau, die letzten Blicke sind in den Einstellungen sichtbar.' },
      { text: 'Werkpläne mit Dach-Hierarchie: First, Traufe und Ortgang/Grat tragen jetzt differenzierte Strichstärken; ein neuer SVG-Prüflauf rastert alle Golden-Pläne automatisch und prüft Sichtbarkeit, Passung und Text-Überlappungen.', station: 'draw' },
      { text: 'Tusche-Piktogramme variieren jetzt auch bei Objekten und unbestimmten Typologien (vorher wirkten Nachbarkarten identisch); die Render-Bridge isoliert parallele Läufe pro Instanz.', station: 'data' },
      { text: 'Unter der Haube: der Repo-CI-Lauf (Typecheck, Tests, Build, Secret-Scan, E2E) war seit Tagen durch einen YAML-Fehler still tot — repariert und erstmals grün; Kosmos Begrüssung beherrscht den Singular («steht 1 Wand»).' },
    ],
  },
  {
    version: '0.6.8',
    datum: '2026-07-10',
    punkte: [
      { text: 'Weisses Papier: die Oberfläche kehrt vom Sandton zur weissen Palette zurück (Karten reinweiss, Grund hell) — die feine Papier-Korntextur bleibt.' },
      { text: 'Das Dach erscheint endlich im 2D-Plan (Aufsicht mit First, Traufe und Ortgang; im Geschoss darunter gestrichelt) und im Schnitt (geschnittene Dachflächen mit Schraffur, sauber mit Wand und Decke verschnitten).', station: 'design' },
      { text: 'Kosmo sieht mit: beim Senden einer Nachricht erfasst die App automatisch, was du gerade siehst (3D-Viewport, Plan, Schnitt oder Node-Fläche), und gibt es vision-fähigen Modellen als Bild mit — sichtbar als «Kosmo sieht: ‹Station›»-Zeile mit Miniatur, abschaltbar; ohne Vision-Modell steht ehrlich «Kosmo liest».' },
      { text: 'Kosmo erinnert sich an die letzten Blicke (Stationswechsel) und kann per Werkzeug «ereignisse_lesen» die letzten ~20 Kommandos nachlesen — auch Nicht-Visuelles entgeht ihm nicht.' },
      { text: 'KosmoData zeigt Referenzen ohne Internet ehrlich: statt kaputter Bild-Links gezeichnete Tusche-Piktogramme je Typologie plus «Bild nicht lokal — Quelle: …»; online lädt das Bild erst, wenn die Karte sichtbar wird (abschaltbar).', station: 'data' },
      { text: 'Das Referenz-Dossier zeigt die bisher verborgenen Tiefen des Datenbestands: Programm, Kontext, Einordnung, kapitelweiser Architektur-Text, 3D-Modelle, Quellen und Datenbankprofil — aufklappbar gruppiert; dazu Querverweise ins Gedächtnis und Wissen.', station: 'data' },
      { text: 'Wissens-Import per Docling: `tools/docling-ingest` wandelt PDFs lokal in Markdown-Notizen (mit ehrlichem Fehlpfad ohne Installation und klar markierter Test-Fixture); der Wissen-Tab zeigt Importe mit Herkunftszeile.', station: 'data' },
      { text: 'Grundriss-Checks ohne Deckel: alle Befunde sichtbar, nach Schwere gruppiert und filterbar; jeder Befund trägt eine stabile Regel-Kennung.', station: 'design' },
      { text: 'Decke zeichnen hat jetzt einen Knopf (Geschossleiste), das Schnitt-Werkzeug läuft über ein echtes Kommando (Rückgängig, Sync und Kosmo gelten — die Schnittlinie bleibt beim Projekt), und «Geschoss erstellen» warnt bei doppeltem Namen statt still zu duplizieren.', station: 'design' },
      { text: 'Der Wohnungs-Segmentierer ist ein Kosmo-Kommando geworden (ein Vorschlag, EIN Rückgängig-Schritt statt Teilanwendung); Fassadenmodule funktionieren neu auch auf reinen Wandbauten ohne Volumenkörper.', station: 'design' },
      { text: 'KosmoData-Facetten für Bauteilkatalog und Archiv; die Render-Formular-Auswahl (Szene/Jahreszeit/Personen) speichert stabile Schlüssel statt Langtexte.', station: 'vis' },
      { text: 'Unter der Haube: die täglichen AI-Scan-Auswertungen sind jetzt fester Release-Schritt (Wächter-Skript verweigert einen Release ohne Auswertung) — dieser Release enthält den ersten Lauf, mit Docling als direkt eingebautem Scan-Fund.' },
    ],
  },
  {
    version: '0.6.7',
    datum: '2026-07-10',
    punkte: [
      { text: 'KosmoVis-Node-Editor auf Werkzeug-Niveau: Mehrfachauswahl (Shift-Klick oder Shift-Aufziehen), Gruppen-Verschieben mit EINEM Rückgängig-Schritt, echtes 24px-Raster-Einrasten (abschaltbar) und eine Ausrichten-Leiste (links, oben, verteilen).', station: 'vis' },
      { text: 'Kanten wahlweise orthogonal: ein Umschalter zeichnet die Node-Verbindungen als rechtwinklige Pfade mit weichen Ecken statt Kurven — für dichte Graphen deutlich lesbarer.', station: 'vis' },
      { text: 'Nodes lassen sich einklappen (nur Kopf und Anschlüsse bleiben sichtbar); ein Render mit laufendem Auftrag verweigert das Einklappen mit ehrlicher Meldung.', station: 'vis' },
      { text: 'Render-Formular repariert: mit gesetzter Szene/Jahreszeit blieb das fertige Bild bisher fälschlich «veraltet» und unsichtbar — jetzt erscheint es zuverlässig.', station: 'vis' },
      { text: 'Die Kuratier-Fläche sammelt neben Renderbildern jetzt auch Viewport-Aufnahmen; ihr Leerzustand erklärt ehrlich, wie Bilder entstehen.', station: 'vis' },
      { text: 'Neue Dachform Satteldach: «Dach erstellen» kann jetzt Walm ODER Sattel mit wählbarer Firstrichtung — auch als Kosmo-Kommando.', station: 'design' },
      { text: 'Kosmo kann das aktive Geschoss wechseln («wechsle ins Dachgeschoss») — vorher landeten Chat-Bauten nach dem Geschoss-Stapeln stumm im Erdgeschoss.' },
      { text: 'Kosmo schlägt keine Abriss-Kommandos mehr vor (Löschen bleibt Handgriff im Programm); Vorschlags-Pakete tragen eine Zusammenfassung «Kosmo schlägt 7 Schritte vor: 4× Wand, 2× Fenster …».' },
      { text: 'Scheitert ein «Anwenden», bleibt die Spur sichtbar: eine Chat-Zeile nennt den Grund und die Karte zeigt den Fehler — nichts verschwindet mehr lautlos.' },
      { text: 'Das Modus-Chip-Menü begründet jede Empfehlung («erkannt: 2D-Plan aktiv · Zeichenwerkzeug aktiv»), der Modusname ohne Anpassung heisst jetzt ehrlich «Alle Werkzeuge».', station: 'design' },
      { text: 'Befehlspalette und Kurzbefehle schliessen mit derselben federnden Bewegung, mit der sie öffnen (respektiert «Bewegung reduzieren»).' },
      { text: 'Unter der Haube: zwei vollständige Benutzersimulationen (Einfamilien- und Mehrfamilienhaus, komplett über den Kosmo-Chat gebaut) laufen jetzt als bleibende Tests mit — die Software wird an ihrem eigenen Anspruch gemessen.' },
    ],
  },
  {
    version: '0.6.6',
    datum: '2026-07-10',
    punkte: [
      { text: 'Knopfdruck spürbar: jeder Knopf reagiert beim Drücken sichtbar (kurzes Einsinken, federndes Loslassen) — überall in der App.' },
      { text: 'Stationswechsel gleiten: beim Wechsel zwischen Stationen weicht das alte Blatt und das neue setzt federnd auf (abschaltbar über die System-Einstellung «Bewegung reduzieren»).' },
      { text: 'Die Oberfläche folgt der Tätigkeit: KosmoDesign erkennt Arbeitsmodi (Entwerfen, Zeichnen, iPad-Skizzieren, Varianten vergleichen, PDF exportieren, 3D modellieren) und zeigt die passenden Werkzeuge prominent — alles Ausgeblendete bleibt vollständig unter «Mehr…» erreichbar.', station: 'design' },
      { text: 'Modus-Chip in der Statuszeile zeigt ehrlich, welcher Modus aktiv ist und warum; ein Klick wechselt, hält fest oder schaltet die Automatik ganz aus.', station: 'design' },
      { text: 'Kosmo kann die Oberfläche jetzt lesen und einstellen (Modus, Panels, Ansicht, Werkzeug) — jede Aktion erscheint sichtbar quittiert im Chat, nichts passiert still.' },
      { text: 'Kosmo bleibt Kosmo: in der Cloud-Betriebsart gibt sich die KI nicht mehr als Basismodell aus; auf direkte Nachfrage antwortet sie weiterhin ehrlich (Anthropic Claude).' },
      { text: 'Gesten mit Schwung: schnelles Pan-Loslassen im 2D-Plan läuft aus (Momentum), Doppeltipp zoomt auf die Stelle, langes Drücken öffnet das Kontextmenü; auf Geräten mit Vibration gibt es feine haptische Ticks.', station: 'design' },
      { text: 'Rendern direkt aus dem 3D-Viewport: ein Knopf stösst die bestehende KosmoVis-Render-Kette an — mit ehrlicher Meldung, wenn keine HomeStation verbunden ist.', station: 'design' },
      { text: 'Der 3D-Viewport rendert nur noch bei Bedarf (Kamerabewegung, Änderungen) statt dauernd — im Leerlauf null statt ~16 Bilder pro Sekunde, spürbar leichter für Akku und Lüfter (abschaltbar in Einstellungen → Leistung).', station: 'design' },
      { text: 'KosmoVis: Kuratier-Fläche sammelt fertige Renderbilder als Karten (merken, verwerfen, zwei vergleichen), eine kategorisierte Node-Palette ergänzt das Auswahlmenü, und «Drei Stimmungen» überlappt bestehende Ketten nicht mehr.', station: 'vis' },
      { text: 'Fächer der Zentrale öffnen federnd aus ihrem Planeten heraus, mit sichtbarem Bezug (Akzent-Rahmen + Verbindungslinie); die Werkzeug-Icons sind auf die einheitliche Tusche-Norm nachgezeichnet.' },
    ],
  },
  {
    version: '0.6.5',
    datum: '2026-07-09',
    punkte: [
      {
        text: 'Ein Guss statt Flickwerk: neue Abstands- und Schrift-Skalen, gestylte Auswahlfelder, Tabs, Menüs, Dialoge, Chips und eine eigene Zeichen-Bibliothek mit 30 Tusche-Icons — die Emoji-Bedienelemente (👍 ⚙ ✕ …) sind ersetzt.',
      },
      {
        text: 'KosmoVis neu gedacht: Nodes mit Kategorie-Zeichen und Farbton, lange Texte klappen statt überzulaufen, Karten überlappen sich nie mehr, Zoom-Knöpfe mit «Einpassen», Kanten heben sich beim Zeigen, eine Legende erklärt die Anschlussfarben.',
        station: 'vis',
      },
      {
        text: 'Rendern in Architektensprache: der Render-Node fragt Fassade, Szene, Jahreszeit und Personen ab — der daraus gebaute Prompt bleibt sichtbar.',
        station: 'vis',
      },
      {
        text: 'KosmoDesign-Kopf entrümpelt: eine Hauptzeile + eine Kontextzeile statt drei gestapelter, Export als aufklappbare Gruppe, Geschossleiste als gerahmte Karte, Statusleiste und Navigation teilen sich keine Ecke mehr.',
        station: 'design',
      },
      {
        text: 'Verletzte Zonen sind jetzt beschriftet: die früher rätselhafte leere Fläche im Plan trägt Name und Warnzeichen und behält ihren Rahmen in jeder Zoomstufe.',
        station: 'design',
      },
      {
        text: 'KosmoData zeigt Ehrlichkeit auch im Bild: Karten ohne Foto tragen ein gezeichnetes Signet mit «kein Bild hinterlegt» statt leerer Farbfläche; Karten heben sich über Linienstärke statt Schatten.',
        station: 'data',
      },
      {
        text: 'Zentrale aufgeräumt: Werkzeug-Namen sitzen unter den Kreisen statt darin, der Fächer besteht aus echten Karteikarten, Katalog sichern/laden sind klare Knöpfe.',
      },
      {
        text: 'Einstellungen mit gestaltetem Kopf, Schliessen-Zeichen und sichtbarem Scrollbalken — nichts wirkt mehr abgeschnitten.',
      },
      {
        text: 'Dunkles Thema deutlich lesbarer: zurückgenommene Beschriftungen sind heller gesetzt und bleiben auch gedimmt über der Lesbarkeitsschwelle.',
      },
      {
        text: 'Publish/Doc/Asset/Prepare/Train/Dev auf dieselbe Sprache gebracht: ein Primärknopf je Bereich, gerahmte Export-Gruppen, gezeichnete Leerzustände, gruppierte Werkzeugzeilen.',
      },
      {
        text: 'Zwei Runden maschineller Selbstkritik mit Nachprüfung: 11 blockierende und 12 sichtbare Befunde behoben; die Restliste ist als 0.6.6-Arbeitsliste dokumentiert.',
      },
    ],
  },
  {
    version: '0.6.4',
    datum: '2026-07-09',
    punkte: [
      {
        text: 'Neues Orbit-Startmenü: die vier Hauptwerkzeuge (KosmoDesign, KosmoData, Kosmo, KosmoOffice «kommend») kreisen ganz langsam um das Kosmos-Zeichen — Hover zeigt die Unterwerkzeuge mit Beschrieb.',
      },
      {
        text: 'Element-Fang beim Zeichnen: die Maus rastet auf Wandenden, Wandmitten, Stützen und Ecken bestehender Bauteile ein — mit sichtbarem Fangpunkt (Quadrat/Kreis/Kreuz) wie in ArchiCAD.',
        station: 'design',
      },
      {
        text: 'Zahlen zur Hand: beim Zeichnen läuft die Masszahl am Cursor mit; eine Zahl tippen + Enter setzt den Punkt exakt in dieser Länge.',
        station: 'design',
      },
      {
        text: 'ArchiCAD-Navigation im Grundriss: Leertaste halten + ziehen = verschieben; Werkzeug-Kurztasten (A Auswahl, W Wand, Z Zone …) mit Tooltips und «?»-Übersicht.',
        station: 'design',
      },
      {
        text: 'Die Maus reagiert auf die Umgebung: Fadenkreuz beim Zeichnen, Zeiger über treffbaren Bauteilen, Verschieben über Gewähltem, Greifhand beim Pan.',
        station: 'design',
      },
      {
        text: 'KosmoVis: der Absturz beim Verschieben des Node-Trees ist behoben; der Graph passt sich beim Öffnen jetzt ins Bild ein.',
        station: 'vis',
      },
      {
        text: '3D-Skizzieren funktioniert wieder zuverlässig: die Rundgang-Karte verdeckte den «Übergeben»-Knopf — sie sitzt jetzt daneben.',
        station: 'design',
      },
      {
        text: 'KosmoData sagt ehrlich, was Sache ist: statt «Offline-Seed» steht «Offline — eingebaute Referenzdaten», die Kataloge sind offline voll da, Ladefehler haben einen Wiederholen-Knopf.',
        station: 'data',
      },
      {
        text: 'Claude-Anmeldung: fehlt die Anthropic-CLI, erklärt ein bleibender Hinweis die Installation und den API-Schlüssel-Weg; das Claude-Modell ist jetzt wählbar (Opus/Sonnet/Haiku oder eigenes).',
      },
      {
        text: 'Aufgeräumt: Deinstallieren und Farbpalette leben nur noch in den Einstellungen (neue Sektion «System») — eine Funktion, ein Ort.',
      },
      {
        text: 'KosmoDoc: neuer Tab «Tech-Radar» zeigt, worauf die Software technisch steht und was beobachtet wird — Scan-Posten ehrlich mit ⚠ markiert.',
        station: 'doc',
      },
      {
        text: 'Beilage: beide Vorform-Demovideos komplett zerlegt (270 Szenen, Transkript) als PDF, mit Analyse-Konzept für die nächsten Oberflächen-Schritte.',
      },
    ],
  },
  {
    version: '0.6.3',
    datum: '2026-07-09',
    punkte: [
      {
        text: 'Neues Feld «Teilphase» (SIA-Projektstand Wettbewerb…Abnahme) im Projekt-Menü — getrennt vom Plan-Detaillierungsgrad, koppelt bewusst nicht automatisch.',
        station: 'design',
      },
      {
        text: 'Kosmo ist jetzt ein schwebendes Symbol statt eines dauerhaft offenen Chat-Panels — ein Klick öffnet das grosse Panel bei Bedarf.',
      },
      {
        text: 'Zentrale: Kacheln zeigen bei Hover die enthaltenen Werkzeuge, ein Info-Icon je Kachel erklärt die Station.',
      },
      {
        text: 'Erster Start: Kosmo fragt «Neu hier?» — der Rundgang startet nur noch auf Wunsch, nie mehr automatisch.',
      },
      {
        text: 'Zentrales Einstellungs-Panel (dieses hier): Darstellung, Rundgang, Kosmo/Werkzeuge und Oberflächen-Anpassung an einem Ort, dazu je Station erreichbar.',
      },
      {
        text: 'KosmoDesign: linkes Entwurfs-Dock (Sprechen · Skizzieren mit 3 Annäherungs-Vorschauen · CAD), Fähigkeiten-Icons, Werkzeug-Icons mit Mehr-Menü und Zero-Click-Statusleiste.',
        station: 'design',
      },
      {
        text: 'Plan mit Zoom-Detailstufen: aus der Distanz bleibt nur, was lesbar ist — Öffnungen und Umbau-Farbcode immer sichtbar.',
        station: 'design',
      },
      {
        text: 'Bauphasen-Presets: beim Teilphasen-Wechsel bietet Kosmo passende Fähigkeiten an — anwenden oder ablehnen, nie stumm umgebaut.',
        station: 'design',
      },
      {
        text: 'Vollprojekt-Werkzeuge: KV-Grobschätzung (Richtwert, kein Devis), Bauablauf-Balkenplan, Baugesuch-Blattsatz mit Ausnützungsnachweis, Mängel & Abnahmeprotokoll.',
        station: 'design',
      },
      {
        text: 'KosmoPublish: «Blatt füllen» belegt Blätter automatisch mit fehlenden Plänen und meldet ehrlich, was im Modell fehlt.',
        station: 'publish',
      },
      {
        text: 'KosmoVis: Auto-Kamera aus dem Modell, Cycles-Presets und Bildkomposition am Render-Node.',
        station: 'vis',
      },
      {
        text: 'Kosmo-Vorschläge zeigen Vorher/Nachher-Mini-Grundrisse mit farbiger Diff-Hervorhebung.',
      },
      {
        text: 'Leistung: auf Wunsch prüft Kosmo die Systemleistung (nur echte Browser-Werte) und drosselt die Render-Qualität passend — manuell übersteuerbar.',
      },
      {
        text: 'Material-Programm Stufe 1: Quelle als Pflichtfeld, echte Dimensionen, 3D-Würfel-Vorschau.',
        station: 'asset',
      },
    ],
  },
  {
    version: '0.6.2',
    datum: '2026-07-08',
    punkte: [
      {
        text: 'Grundlagenstudie-Bericht v2: Empfehlung mit Begründung zuerst, Vergleichstabelle mit markierter Bestzelle, «Grenzen der Studie» als eigener Abschnitt.',
        station: 'design',
      },
      {
        text: 'Umbau-Pläne: Bestand konsequent grau, kein Diagonalkreuz mehr, keine Rasterachsen mehr auf dem Blatt.',
        station: 'design',
      },
      {
        text: 'Studien-Panel überdeckt die Geschossleiste nicht mehr — Popup-Kollision behoben.',
        station: 'design',
      },
      {
        text: 'Geschosshöhe wählbar mit Herkunft (Wettbewerb/Architekt/SIA-Minimum/Standard), wirkt auch aufs Gewerbe-Erdgeschoss.',
        station: 'design',
      },
      {
        text: 'Doppelte «KosmoDesign»-Beschriftung in der Werkzeugleiste entfernt.',
        station: 'design',
      },
      {
        text: 'Unternehmerplan-Import per Drag & Drop, Erklärtexte einklappbar hinter «?».',
        station: 'publish',
      },
      {
        text: '«App deinstallieren…» als eigener Menüpunkt in der Kopfleiste, mit ehrlicher Anleitung je Betriebssystem.',
      },
      {
        text: 'Website: Download-Bereich und Deinstallations-Anleitung für alle Editionen und Plattformen.',
      },
    ],
  },
  {
    version: '0.6.1',
    datum: '2026-07-08',
    punkte: [
      {
        text: 'Volumenstudie: Regler starten aus der Zonenregel (Höhe, Ziel-Geschossfläche, Grenzabstand) statt aus festen Zahlen.',
        station: 'design',
      },
      {
        text: 'Studien-Vergleich zeigt einen Besonnungs-Richtwert (Wintersonnenwende) je Extremvariante.',
        station: 'design',
      },
      {
        text: 'Studien-Vergleich zeigt die Raumprogramm-Erfüllung je Extremvariante.',
        station: 'design',
      },
      {
        text: 'Kosmo kann die Volumenstudie jetzt selbst auslösen und die gewählte Variante als Baukörper übernehmen.',
        station: 'design',
      },
      {
        text: 'Neuer Studienbericht als druckfähiges SVG-Blatt mit den Kennwerten aller Varianten.',
        station: 'design',
      },
      {
        text: 'Die adaptive Werkzeugleiste (lernt genutzte Werkzeuge) läuft jetzt auch in KosmoData, nicht mehr nur in KosmoDesign.',
        station: 'data',
      },
      {
        text: 'Unternehmerpläne als PDF werden erkannt und ehrlich zurückgemeldet, statt in den DXF-Import zu laufen.',
        station: 'publish',
      },
    ],
  },
];

/** Alle Punkte einer Station über ALLE Versionen, neuste zuerst — für die
 *  stationsgefilterte Ansicht des Einstellungs-Panels. */
export function neuigkeitenFuerStation(
  station: ModuleId,
): { version: string; inArbeit?: boolean; punkt: NeuigkeitPunkt }[] {
  const treffer: { version: string; inArbeit?: boolean; punkt: NeuigkeitPunkt }[] = [];
  for (const eintrag of NEUIGKEITEN) {
    for (const punkt of eintrag.punkte) {
      if (punkt.station === station) {
        treffer.push({
          version: eintrag.version,
          ...(eintrag.inArbeit !== undefined ? { inArbeit: eintrag.inArbeit } : {}),
          punkt,
        });
      }
    }
  }
  return treffer;
}
