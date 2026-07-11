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
