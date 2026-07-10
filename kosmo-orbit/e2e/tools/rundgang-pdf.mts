/**
 * Rundgang-PDF «0.6.6» («Bewegung & Anpassung», 10.07.) — Teil 2: HTML → PDF.
 * Baut aus den Bildern von `rundgang.mts` ein Kommentier-Dokument: je
 * Station/Feature eine A4-Seite mit Screenshot, kurzem Beschrieb und einer
 * grossen linierten Notiz-Box zum Reinschreiben im PDF-Reader. Diese Runde
 * ist BEWEGUNGSKONZEPT-066 — die zehn Punkte stehen in
 * `apps/kosmo-orbit/src/shell/neuigkeiten.ts` (Version 0.6.6); das ist die
 * ehrliche Quelle für die Texte unten. Wie beim 0.6.5-PDF: ein
 * «Vorher / Nachher»-Kapitel direkt nach dem Deckblatt — die Vorher-Bilder
 * kommen pinned aus Git (Commit 922a9eb = 0.6.5-Release-Stand) und werden
 * beim Bauen nach docs/rundgang/vorher-066/ extrahiert; es braucht dafür
 * KEINE neuen Screenshots. Die Notizen zu DIESEM PDF werden die
 * Auftragsliste der 0.6.7-Runde.
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const DIR = new URL('../../docs/rundgang/', import.meta.url).pathname;
const OUT = new URL('../../abgabe/RUNDGANG-NOTIZEN-0.6.6.pdf', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });

// ── Vorher-Bilder aus Git extrahieren (pinned, reproduzierbar) ────────────
// 922a9eb = «v0.6.5 / Finale — Release des Fable-Intelligenz-Tags» (der
// releaste 0.6.5-Stand, unmittelbar vor der 0.6.6-Runde) — dieselben drei
// Testids/Stationen, wie sie `rundgang.mts` diese Runde erneut fotografiert.
const VORHER = `${DIR}vorher-066/`;
mkdirSync(VORHER, { recursive: true });
const ausGit = (ref: string, ziel: string) =>
  writeFileSync(`${VORHER}${ziel}`, execSync(`git show ${ref}`, { cwd: DIR, maxBuffer: 32 * 1024 * 1024 }));
ausGit('922a9eb:kosmo-orbit/docs/rundgang/bilder/05-design-uebersicht.png', 'design-kopf-065.png');
// Der 0.6.5-Release-Baum hat KEIN bilder/17-vis-graph.png (das 0.6.5-PDF
// nutzte als Nachher-Bild den Kritik-Runde-2-Stand p-06-vis-graph.png) —
// genau dieses Bild IST der releaste 0.6.5-Vis-Graph und dient hier als
// ehrliches Vorher.
ausGit('922a9eb:kosmo-orbit/docs/rundgang/kritik-065/p-06-vis-graph.png', 'vis-graph-065.png');
ausGit('922a9eb:kosmo-orbit/docs/rundgang/bilder/01-orbit-faecher-design.png', 'zentrale-faecher-065.png');

interface Seite {
  /** Fehlt bei reinen Textseiten (Bewegungs-Grenzen — siehe unten). */
  bild?: string;
  titel: string;
  neu?: boolean;
  text: string;
  /** Zusätzliche Bilder (kleiner, nebeneinander). */
  extra?: string[];
  /** Für Vergleichspaare (z.B. LOD nah/fern, Knopfdruck ruhe/gedrückt): beide Bilder gleich gross. */
  paar?: boolean;
}

/** Vorher/Nachher-Gegenüberstellung (eigenes Kapitel nach dem Deckblatt). */
interface Vergleich {
  titel: string;
  /** Bildpfade relativ zu docs/rundgang/. */
  alt: string;
  neu: string;
  /** Beschriftung unter dem Vorher-Bild (woher es stammt — Ehrlichkeit). */
  altLabel: string;
  text: string;
}

const VERGLEICHE: Vergleich[] = [
  {
    titel: 'KosmoDesign — Statuszeile mit Modus-Chip',
    alt: 'vorher-066/design-kopf-065.png',
    altLabel: 'Vorher — 0.6.5 (Release-Stand)',
    neu: 'bilder/30-design-modus-zeichnen.png',
    text: 'Vorher endete die Statuszeile nach Werkzeug/Geschoss/LOD/Fläche/Phase — kein Hinweis darauf, wofür die Oberfläche gerade eingerichtet ist. Neu: ein Modus-Chip («Modus: Zeichnen · festgehalten») macht sichtbar, welchen der neun Arbeitsmodi die Automatik erkannt hat (oder ein Mensch von Hand gewählt/festgehalten hat) — ein Klick öffnet die Modusliste samt Festhalten/Automatik-Schaltern. Die zweite, hier nicht bebilderbare Hälfte des Umbaus: sobald ein Modus feststeht, treten Export/Fähigkeiten aus dem Hauptband zurück (bleiben vollständig unter «Mehr…» erreichbar) — der Vergleich zeigt bewusst den Voll-UI-Vorher- gegen den Zeichnen-Modus-Nachher-Zustand, nicht zwei identische Werkzeugzeilen.',
  },
  {
    titel: 'KosmoVis — Node-Graph mit Minimap und entzerrten Ketten',
    alt: 'vorher-066/vis-graph-065.png',
    altLabel: 'Vorher — 0.6.5 (Release-Stand)',
    neu: 'bilder/35-vis-minimap-entzerrt.png',
    text: 'Vorher endete die Werkzeugausstattung des Node-Graphen bei Zoom-Leiste, Legende und dem V-H4-Render-Formular — bei mehreren «Drei Stimmungen»-Ketten überlagerten sich Karten dort, wo zwei Ketten zusammenstiessen (im 0.6.5-PDF als offener Befund benannt). Neu: eine Minimap unten links (ab 5 Nodes automatisch sichtbar, Klick/Drag verschiebt den Viewport direkt) und eine Entzerrung, die eine zweite «Drei Stimmungen»-Kette versetzt unter die erste legt statt über sie — im Nachher-Bild sichtbar an der Minimap: der Rahmen markiert den Ausschnitt, die zweite Ketten-Wolke liegt frei darunter. Nicht im Bild, aber ebenfalls neu: eine kategorisierte Node-Palette und eine Kuratier-Fläche für fertige Renderbilder (siehe eigene Seiten).',
  },
  {
    titel: 'Zentrale — Fächer mit sichtbarem Bezug zum Planeten',
    alt: 'vorher-066/zentrale-faecher-065.png',
    altLabel: 'Vorher — 0.6.5 (Release-Stand)',
    neu: 'bilder/01-orbit-faecher-design.png',
    text: 'Vorher öffnete der Fächer beim Hover ohne erkennbaren Bezug zu seinem Planeten-Kreis — er stand einfach daneben. Neu: der Fächer öffnet federnd AUS dem Kreis heraus (das Federn selbst ist Bewegung und in einem Standbild nicht seriös zeigbar), landet aber in einem Zustand mit sichtbarem Akzent-Rahmen und einer Verbindungslinie zum Ursprungs-Planeten — der Bezug bleibt auch im Standbild ablesbar. Die Werkzeug-Icons sind ausserdem auf die einheitliche Tusche-Norm nachgezeichnet (in diesem engen Bildausschnitt kaum sichtbar, aber Teil desselben Commits).',
  },
];

const SEITEN: Seite[] = [
  {
    bild: '00-erste-start-frage.png',
    titel: 'Erster Start — «Neu hier?»',
    text: 'Aus 0.6.3, unverändert diese Runde: beim allerersten Start fragt Kosmo in der Zentrale, ob ein Rundgang gewünscht ist. «Nein» heisst nie wieder — die Frage lässt sich über das «?» in der Kopfleiste jederzeit erneut auslösen.',
  },
  {
    bild: '01-orbit-start.png',
    titel: 'Orbit-Startmenü — Fächer mit sichtbarem Bezug',
    neu: true,
    extra: ['01-orbit-faecher-design.png'],
    text: 'Die aufgeräumte Zentrale ist aus 0.6.5 (Werkzeug-Namen unter den Kreisen, echte Karteikarten, klare Katalog-Knöpfe) — unverändert. NEU 0.6.6: der Fächer öffnet jetzt federnd aus seinem Planeten heraus statt einfach zu erscheinen, und trägt einen Akzent-Rahmen plus eine Verbindungslinie zum Ursprungs-Kreis (Extra-Bild) — im Standbild ist nur der Endzustand mit Rahmen/Linie zu sehen, das Federn selbst nicht (siehe Vorher/Nachher-Kapitel). Die Werkzeug-Icons sind zudem auf die einheitliche Tusche-Norm nachgezeichnet.',
  },
  {
    bild: '02-kosmo-symbol-mini.png',
    titel: 'Kosmo — Symbol statt Dauerchat',
    text: 'Aus 0.6.3, unverändert diese Runde: Kosmo bleibt ein schwebendes Symbol statt eines dauerhaft offenen Panels. Hover zeigt ein Mini-Popup mit der letzten Aktivität, ein Klick entfaltet bei Bedarf das grosse Panel. NEU 0.6.6 (nicht auf diesem Bild): Kosmo gibt sich in der Cloud-Betriebsart nicht mehr als Basismodell aus — auf direkte Nachfrage antwortet sie ehrlich (Anthropic Claude).',
  },
  {
    bild: '03-einstellungen.png',
    titel: 'Einstellungs-Panel — jetzt mit den 0.6.6-Neuigkeiten oben',
    extra: ['03-einstellungen-neuigkeiten.png', '03-einstellungen-leistung.png'],
    text: 'Kopf, Schliessen-Zeichen und sichtbarer Scrollbalken sind aus 0.6.5, unverändert. «Funktionen & Neues» (mittleres Extra-Bild) führt jetzt die zehn 0.6.6-Punkte zuoberst. Die Sektionen Darstellung/Leistung (rechtes Extra-Bild) bleiben inhaltlich unverändert — NEU dort ist einzig der Renderloop-on-demand-Schalter (siehe Leistungs-Sektion, textlich, kein eigenes Bild: der 3D-Viewport rendert nur noch bei Kamerabewegung/Änderungen statt dauernd, im Leerlauf 0 statt ~16 Bilder/s — abschaltbar, falls das «ruckelig» wirkt).',
  },
  {
    bild: '04-kurztasten-uebersicht.png',
    titel: 'Werkzeug-Kurztasten + «?»-Übersicht',
    text: 'Aus 0.6.4, unverändert diese Runde: «?» blendet die Kurzbefehl-Übersicht ein, der Abschnitt «Zeichnen» zeigt die Werkzeug-Kurztasten (A Auswahl, W Wand, Z Zone, V Volumen, D Dach, T Treppe, C Stütze, S Schnitt, F Freihand-Skizze) plus «Leertaste halten + ziehen» fürs Verschieben im 2D-Plan.',
  },
  {
    bild: '05-design-uebersicht.png',
    titel: 'KosmoDesign — Werkzeugkopf (Struktur aus 0.6.5)',
    extra: ['05-design-4er.png'],
    text: 'Die entrümpelte Struktur (eine Hauptzeile + Kontextzeile, Export als aufklappbare Gruppe, gerahmte Geschossleiste) ist aus 0.6.5, unverändert. NEU 0.6.6 sitzt am ANDEREN Ende der Oberfläche, in der Statuszeile: der Modus-Chip (eigene Seite «Arbeitsmodi») — dieses Bild zeigt bewusst den Voll-UI-Zustand ohne aktiven Modus, damit der 0.6.5-Kopf 1:1 mit dem Vorgänger-PDF vergleichbar bleibt. Der 4er-Splitscreen (Extra-Bild) bleibt unverändert nutzbar.',
  },
  {
    bild: '06-mass-eingabe.png',
    titel: 'Masszahl am Cursor — «Zahlen zur Hand»',
    text: 'Aus 0.6.4, unverändert diese Runde: beim Zeichnen läuft eine Live-Masszahl am Cursor mit (hier «3.5 m ⏎» nach dem Tippen von «3.5»); Enter setzt den nächsten Punkt exakt in dieser Länge.',
  },
  {
    bild: '07-element-fang.png',
    titel: 'Element-Fang — Fangpunkt-Marker beim Zeichnen',
    text: 'Aus 0.6.4, unverändert diese Runde: das Quadrat am Wandende ist der Fangpunkt-Marker (Typ «endpunkt»), er erscheint erst innerhalb des Fangradius und zieht den nächsten Klick exakt auf die Bauteilgeometrie statt aufs 250er-Raster.',
  },
  {
    bild: '08-plan-lod-voll.png',
    titel: 'Plan-LOD — Detailstufe aus der Distanz',
    extra: ['08-plan-lod-fern.png'],
    paar: true,
    text: 'Aus 0.6.3, unverändert diese Runde: nah dran (links) zeigt Bemassung, Raster und Möbel; weit weg (rechts) bleiben nur Poché und Fenstersymbole.',
  },
  {
    bild: '09-skizzieren-annaeherungen.png',
    titel: 'Skizzieren — drei Annäherungen',
    text: 'Aus 0.6.3, unverändert diese Runde: ein Freihand-Strich im Skizzieren-Modus ergibt am Übergabe-Moment drei Karten (u.a. eine orthogonalisierte Variante), als EIN atomarer Undo-Schritt.',
  },
  {
    bild: '10-kosmo-vorschlag-vorschau.png',
    titel: 'Kosmo-Vorschlagskarte — mit Vorschau',
    text: 'Aus 0.6.3, unverändert diese Runde: die Diff-Karte zeigt einen Vorher/Nachher-Mini-Grundriss statt nur Text. NEU 0.6.6 (nicht auf diesem Bild): Kosmo kann Aktionen auch DIREKT ausführen (Modus setzen, Panel öffnen …) — dieser Weg läuft dann NICHT über die Diff-Karte, sondern über eine eigene, sofort sichtbare Chat-Zeile (siehe Seite «Kosmo-UI-Brücke»), damit die beiden Wege ehrlich unterscheidbar bleiben.',
  },
  {
    bild: '11-phasen-preset-banner.png',
    titel: 'Phasen-Presets — Angebot, nie stumm',
    text: 'Aus 0.6.3, unverändert diese Runde: wechselt die SIA-Teilphase, bietet Kosmo passende Fähigkeits-Icons als Fokus an. «Nicht jetzt» lässt alles unverändert.',
  },
  {
    bild: '12-kv-panel.png',
    titel: 'KV-Grobschätzung',
    text: 'Aus 0.6.3, unverändert diese Runde: Richtwert-Kostenvoranschlag auf GF-Basis mit stets sichtbarem Ehrlichkeits-Hinweis («kein Devis, keine NPK-Positionen»).',
  },
  {
    bild: '13-bauablauf-panel.png',
    titel: 'Bauablaufplan',
    text: 'Aus 0.6.3, unverändert diese Runde: abgeleiteter Grob-Terminplan mit fester Gewerke-Reihenfolge, Export als druckfähiges SVG-Blatt.',
  },
  {
    bild: '14-maengel-panel.png',
    titel: 'Mängel & Abnahme',
    text: 'Aus 0.6.3, unverändert diese Runde: Mängel erfassen, Status umschalten, Abnahmeprotokoll als SVG exportieren — kein rechtsgültiges SIA-118-Protokoll.',
  },
  {
    bild: '15-baugesuch.png',
    titel: 'Baugesuch-Blattsatz — Publish',
    text: 'Aus 0.6.5, unverändert diese Runde: gemeinsame Formensprache (eine klare Knopf-Hierarchie, gerahmte Export-Gruppen), ein Klick erzeugt mehrere Blätter plus ein Set «Baugesuch»; fehlende Grundlagen werden als ehrliche Lücken-Meldung benannt.',
  },
  {
    bild: '16-blatt-fuellen.png',
    titel: 'Blatt füllen',
    text: 'Aus 0.6.3, unverändert diese Runde: platziert Grundriss, Axonometrie, Kennzahlen-Textblock und Render-Platzhalter atomar und meldet ehrlich, was im Modell fehlt.',
  },
  {
    bild: '17-vis-graph.png',
    titel: 'KosmoVis — Node-Graph (Grundausstattung aus 0.6.5)',
    text: 'Kategorie-Zeichen, Zoom-Leiste, Legende und das V-H4-Render-Formular (Fassade/Szene/Jahreszeit/Personen, sichtbarer finaler Prompt) sind aus 0.6.5, unverändert — die Ansicht ist auf die ganze «Drei Stimmungen»-Kette eingepasst (Morgenlicht/Abendstimmung/Weissmodell samt Bildvergleich-Node); die Formular-Details in Gross zeigt die Minimap-Seite weiter hinten. Einzige 0.6.6-Zutat in diesem Bild: die Minimap unten links, die ab 5 Nodes automatisch erscheint. Ebenfalls neu in 0.6.6, auf den Folgeseiten: Node-Palette, Kuratier-Fläche und die Entzerrung mehrfacher «Drei Stimmungen»-Ketten.',
  },
  {
    bild: '17-vis-automatik.png',
    titel: 'KosmoVis — Automatik (Auto-Kamera, Presets, Render)',
    text: 'Aus 0.6.3/0.6.4, unverändert diese Runde: «Kamera vorschlagen» erzeugt Kamera-Standpunkte, Cycles-Presets wählen die Render-Qualität, «Ausführen» schickt den Job an die (hier Fake-)Bridge. NEU 0.6.6: derselbe Render-Weg ist jetzt zusätzlich direkt aus dem 3D-Viewport erreichbar, ohne den Umweg über den Node-Graphen (siehe Seiten «Viewport-Render-Knopf»).',
  },
  {
    bild: '18-material-wuerfel.png',
    titel: 'Materialbibliothek — Würfel-Vorschau',
    text: 'Aus 0.6.3, unverändert diese Runde: jedes Material zeigt einen 3D-Würfel (echte Canvas-Vorschau), echte Dimensionen und eine Pflicht-Quelle.',
  },
  {
    bild: '19-data-referenzen.png',
    titel: 'KosmoData — Leerbild-Signete',
    extra: ['19-data-bauteile.png'],
    text: 'Aus 0.6.5, unverändert diese Runde: gezeichnetes Signet «kein Bild hinterlegt» statt leerer Farbfläche, Karten heben sich über Linienstärke statt Schatten, klare beschriftete Knöpfe für Sync/Zurücksetzen. Rechtes Extra-Bild: der CH-Bauteilkatalog unter demselben Dach.',
  },
  {
    bild: '20-dev-auftragsbuch.png',
    titel: 'KosmoDev — Auftragsbuch',
    text: 'Aus 0.6.5, unverändert diese Runde: Aufträge erfassen, priorisieren, als Workorder exportieren — genau hier landet auch die 0.6.7-Auftragsliste aus diesem PDF.',
  },
  {
    bild: '21-prepare.png',
    titel: 'KosmoPrepare / KosmoDoc / KosmoTrain',
    extra: ['21-doc.png', '21-train.png'],
    text: 'Aus 0.6.5, unverändert diese Runde: gemeinsame Formensprache (ein Primärknopf je Bereich, gerahmte Export-Gruppen, gezeichnete Leerzustände, gruppierte Werkzeugzeilen). Der Doc-Tab «Tech-Radar» hat eine eigene Seite (nächste Seite).',
  },
  {
    bild: '21-doc-tech-radar.png',
    titel: 'KosmoDoc — Tech-Radar',
    text: 'Aus 0.6.4, unverändert diese Runde: worauf die Software technisch steht (Adopt/Selbst/Reject je Baustein) und was noch beobachtet wird, in einer kuratierten Liste. Einträge aus dem Notion-Scan sind ehrlich mit ⚠ markiert, weil noch nicht selbst verifiziert.',
  },
  {
    bild: '22-draw.png',
    titel: 'KosmoDraw — Modellbaum · Mengen · Ausmass',
    extra: ['22-sketch.png'],
    text: 'Aus 0.6.3/0.6.4, unverändert diese Runde: Mengen, Ausmass und Berechnungsliste aus dem Modell; daneben KosmoSketch fürs freie Zeichnen (Extra-Bild).',
  },
  {
    bild: '23-umbau-werkplan.png',
    titel: 'Umbau — Bestand / Abbruch / Neu',
    text: 'Bestand einheitlich grau, kein Diagonalkreuz, SIA-saubere Umbau-Blätter — aus 0.6.2, unverändert diese Runde.',
  },
  {
    bild: '24-studien-panel.png',
    titel: 'Volumenstudien — Zonenregel-gespeist',
    text: 'Zonenregel speist die Studie, Geschosshöhe mit Herkunft, Besonnungs-Richtwert und Raumprogramm-Erfüllung je Extremvariante — aus 0.6.1/0.6.2, unverändert diese Runde.',
  },
  {
    bild: '25-bericht.svg',
    titel: 'Grundlagenstudie-Bericht',
    text: 'Empfehlung mit Begründung zuerst, dann die Vergleichstabelle mit echten Zahlen, dann die Grenzen der Studie als eigener Block — aus 0.6.2, unverändert diese Runde.',
  },
  {
    bild: '26-unternehmerplan-pdf.png',
    titel: 'Unternehmerplan — ehrlicher PDF-Pfad',
    text: 'Datei ins Fenster ziehen genügt; ein hochgeladenes PDF wird ehrlich erkannt statt in den DXF-Import zu laufen — aus 0.6.1/0.6.2, unverändert diese Runde.',
  },
  {
    bild: '27-claude-modell.png',
    titel: 'Claude-Modellwahl',
    text: 'Aus 0.6.4, unverändert diese Runde: im Kosmo-Panel (Zahnrad → Betriebsart Cloud) steht ein Modell-Select mit den aktuellen Claude-Modellen plus Freitext-Override. NEU 0.6.6 (nicht auf diesem Bild): in dieser Betriebsart gibt sich Kosmo nicht mehr als Basismodell aus — auf Nachfrage antwortet sie ehrlich, welches Modell sie ist.',
  },
  {
    bild: '28-deinstallieren.png',
    titel: 'App deinstallieren — in den Einstellungen',
    text: 'Aus 0.6.4, unverändert diese Runde: der Einstieg wohnt nur in den Einstellungen (Sektion «System»). Der Dialog bleibt ehrlich: KosmoOrbit kann sich als Tauri-App nicht selbst deinstallieren.',
  },
  {
    bild: '29-knopfdruck-ruhe.png',
    titel: 'Knopfdruck spürbar — Ruhe / gedrückt',
    neu: true,
    extra: ['29-knopfdruck-gedrueckt.png'],
    paar: true,
    text: 'Jeder Knopf in der App reagiert jetzt beim Drücken sichtbar: kurzes Einsinken (Skalierung 0.97) plus Tusche-Abdunklung, federndes Loslassen. Bewegung selbst zeigt kein Standbild — aber der GEDRÜCKTE Zwischenzustand lässt sich fotografieren (Maustaste gehalten, ohne loszulassen): beide Bilder zeigen denselben Knopf («Beispielprojekt laden» in der Zentrale) UNTER der Maus — links in Ruhe, rechts im gedrückten Moment, minimal kleiner und dunkler. Der Effekt ist bewusst dezent (3% Skalierung, 80ms) — er soll spürbar sein, nicht theatralisch; entsprechend fein ist auch der Unterschied im Standbild. Das Federn beim Loslassen bleibt unbebildert — dafür gibt es keinen ehrlichen Standbild-Beweis.',
  },
  {
    bild: '30-design-modus-zeichnen.png',
    titel: 'Arbeitsmodi — Design im Modus «Zeichnen»',
    neu: true,
    text: 'Die Oberfläche folgt jetzt der Tätigkeit statt dem Menü: KosmoDesign erkennt aus Werkzeug/Ansicht/Panels/Eingabegerät/Bauphase einen von neun Arbeitsmodi (Entwerfen, Zeichnen, iPad-Skizzieren, Varianten vergleichen, PDF exportieren, 3D modellieren — die übrigen drei sind vorerst nur als Stations-Zuordnung wirksam, Feinrollout ehrlich auf 0.6.7 vertagt). Der Modus-Chip in der Statuszeile zeigt «Modus: Zeichnen · festgehalten» — in der Live-Erkennung braucht ein Moduswechsel 5s Signal-Stabilität (Hysterese, hier durch einen gesetzten Zustand übersprungen, damit das Bild ohne Zeitsprung entsteht). Ausgeblendete Gruppen (Export/Fähigkeiten) bleiben vollständig unter «Mehr…» erreichbar (nächste Seite).',
  },
  {
    bild: '30-design-modus-chip-menu.png',
    titel: 'Arbeitsmodi — Chip-Menü (Modus wählen, Festhalten, Automatik)',
    neu: true,
    text: 'Ein Klick auf den Modus-Chip öffnet die Liste aller sechs vollständig ausgerollten Modi (Entwerfen/Zeichnen/iPad-Skizzieren/Varianten vergleichen/PDF exportieren/3D modellieren) plus zwei Schalter: «Festhalten» friert den aktuellen Modus ein (die Automatik greift dann nicht mehr ein, auch nicht bei starken neuen Signalen), «Automatik aus» schaltet die Erkennung ganz ab — dann zeigt die Oberfläche sofort wieder alles (Voll-UI), ohne auf einen weiteren Signalwechsel zu warten. Der Tooltip auf dem Chip nennt die Begründung («2D-Plan aktiv», «Zeichenwerkzeug aktiv…») — Ehrlichkeits-UI, keine stille Entscheidung.',
  },
  {
    bild: '31-design-mehr-faecher.png',
    titel: 'Arbeitsmodi — «Mehr…» hält alles erreichbar',
    neu: true,
    text: 'Sobald ein Modus feststeht, treten Gruppen zurück, die dort nicht zur Tätigkeit passen — im Modus «Zeichnen» z.B. Export und «Fähigkeiten» (redundanter Zweitzugang zu «Ebenen»). Zurücktreten heisst NICHT verschwinden: das «Mehr…»-Überlaufmenü listet beide Gruppen vollständig und vollständig anklickbar auf — ein Eintrag darin funktioniert exakt wie der Original-Knopf (One-Click, kein zweiter Umweg). Nichts wird unerreichbar, nur unprominent.',
  },
  {
    bild: '32-viewport-render-knopf.png',
    titel: '3D-Viewport — Render-Knopf',
    neu: true,
    text: 'Ein Rendern-Knopf sitzt jetzt direkt im 3D-Viewport (rechts unten, über der Orbit/Pan/Zoom/Fit-Leiste) und stösst DIESELBE KosmoVis-Render-Kette an wie der Node-Graph — kein Umweg über KosmoVis nötig, um schnell ein Bild vom aktuellen Modellstand zu bekommen. Ohne verbundene HomeStation bleibt der Knopf mit einer ehrlichen Meldung deaktiviert («Kein HomeStation-Server verbunden…») statt eines stillen Fehlschlags.',
  },
  {
    bild: '32-viewport-render-fertig.png',
    titel: '3D-Viewport — Render fertig, direkt aufs Blatt',
    neu: true,
    text: 'Nach dem Klick läuft derselbe Status-Zyklus wie in KosmoVis (gesendet → wartet auf GPU-Leerlauf/Freigabe → rendert → fertig); das Ergebnisbild erscheint im selben Eck-Panel, «Aufs Blatt legen» schiebt es direkt in KosmoPublish weiter. Dieses Bild ist ein ECHTER Durchlauf über die Fake-Worker-Bridge — kein Platzhalter.',
  },
  {
    bild: '33-vis-palette.png',
    titel: 'KosmoVis — kategorisierte Node-Palette',
    neu: true,
    text: 'Eine eigene Palette (oben links im Node-Graphen) listet alle verfügbaren Node-Typen nach Kategorie geordnet, statt sie nur über ein einzelnes Auswahlmenü zugänglich zu machen — dieselbe Kategorie-Farbcodierung wie die Nodes selbst und die Legende. Ergänzt das bestehende Auswahlmenü, ersetzt es nicht.',
  },
  {
    bild: '34-vis-kuratier.png',
    titel: 'KosmoVis — Kuratier-Fläche',
    neu: true,
    text: 'Eine eigene Fläche sammelt fertige Renderbilder als Karten: merken, verwerfen, zwei Bilder direkt vergleichen — statt fertige Ergebnisse nur lose im Graphen verstreut zu lassen. Auf diesem Bild ist die Fläche im Leerzustand (frischer Graph, noch kein Render gelaufen) — die Funktion selbst ist bewiesen (E2E), das Bild zeigt ehrlich den Startzustand statt eines nachträglich befüllten Musters.',
  },
  {
    bild: '35-vis-minimap-entzerrt.png',
    titel: 'KosmoVis — Minimap + entzerrte Ketten',
    neu: true,
    text: 'Eine kleine Übersichtskarte (unten links, Papier-Stil) erscheint automatisch ab 5 Nodes im Graphen, lässt sich per Klick/Drag direkt zum Verschieben des Viewports nutzen und per eigenem Knopf ein-/ausblenden. Im Bild: nach zweifachem «+ Drei Stimmungen» (24 Nodes) zeigt der Viewport-Rahmen in der Minimap den sichtbaren Ausschnitt, und die zweite Kette liegt als Rechteck-Wolke VERSETZT darunter statt über der ersten — der im 0.6.5-PDF benannte Befund («wo Ketten zusammenstossen, überlagern sich Karten noch») ist damit behoben (die E2E-Suite prüft die paarweise Überlappungsfreiheit aller 24 Node-Boxen). Bewusst nicht herausgezoomt fotografiert: im herausgezoomten Headless-Screenshot malt der Software-Renderer die Karteninhalte unskaliert übereinander (reines Aufnahme-Artefakt, im echten Betrieb ohne Befund) — bei 1:1 zeigt das Bild den ehrlichen Zustand.',
  },
  {
    bild: '36-kosmo-ui-aktion-modus.png',
    titel: 'Kosmo-UI-Brücke — Kosmo stellt die Oberfläche selbst',
    neu: true,
    text: 'Kosmo kann die Oberfläche jetzt lesen UND einstellen: Modus, Panels, Ansicht, Werkzeug sind als eigene Werkzeuge für die KI freigegeben (`ui.*`-Registry). Auf die Bitte «Stell den Modus auf exportieren» setzt Kosmo den Arbeitsmodus direkt — sichtbar an zwei Stellen zugleich: der Modus-Chip wechselt auf «PDF exportieren», UND eine eigene Chat-Zeile («‹PDF exportieren› … auf Wunsch») quittiert die Aktion. Bewusst KEIN Diff-Karten-Weg (keine `proposal-card`) — schreibende Vorschläge am Modell bleiben Diff-Karten, aber reine Oberflächen-Aktionen sind sofortige, sichtbar quittierte Taten. Nichts passiert still.',
  },
  {
    bild: '37-gesten-kontextmenu.png',
    titel: 'Gesten mit Schwung — Kontextmenü per langem Drücken',
    neu: true,
    text: 'Vier Gesten kamen diese Runde dazu: schnelles Pan-Loslassen im 2D-Plan läuft mit Schwung aus (Momentum), Doppeltipp zoomt auf die Berührungsstelle, langes Drücken öffnet das Kontextmenü, auf Geräten mit Vibration gibt es feine haptische Ticks. Von den vieren ist NUR das Kontextmenü ein STATISCHER Endzustand und damit ehrlich fotografierbar — das Bild zeigt sein Desktop-Äquivalent (Rechtsklick auf ein Bauteil öffnet denselben Kontextmenü-Code wie der 3D-Viewport). Momentum, Doppeltipp-Zoom und Haptik-Ticks SIND Bewegung/Berührungssensorik und bleiben bewusst unbebildert (nächste Seite).',
  },
  {
    titel: 'Bewegung, die sich nicht fotografieren lässt',
    text: 'Ein Standbild-PDF hat eine harte Grenze: Bewegung selbst zeigt es nicht. Drei 0.6.6-Punkte sind darum NUR textlich hier vertreten, nicht weil sie unwichtig wären, sondern weil ein Screenshot sie unehrlich behaupten würde: (1) Stationswechsel gleiten — beim Wechsel zwischen Stationen weicht das alte Blatt, das neue setzt federnd auf (abschaltbar über «Bewegung reduzieren» in den Einstellungen). (2) Momentum-Pan/Doppeltipp-Zoom/Haptik-Ticks im 2D-Plan (siehe vorherige Seite — nur das Kontextmenü als Endzustand ist bebildert). (3) Renderloop on-demand: der 3D-Viewport rendert im Leerlauf jetzt 0 statt ~16 Bilder/s — das lässt sich in einem einzelnen Foto nicht von einem eingefrorenen Dauerbetrieb unterscheiden, beweisbar ist es nur per Framezähler/Profiler (siehe E2E-Suite, nicht in diesem PDF). Bitte diese drei Punkte beim Probieren in der echten App direkt erleben, nicht am Bild beurteilen — Notizen dazu gerne trotzdem in die Box unten.',
  },
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const seiteHtml = (s: Seite) => `
<section class="seite">
  <header>
    <h2>${esc(s.titel)}${s.neu ? ' <span class="neu">NEU</span>' : ''}</h2>
  </header>
  ${
    s.bild
      ? `<div class="bildzeile${s.extra ? ' mit-extra' : ''}${s.paar ? ' paar' : ''}">
    <img class="haupt" src="bilder/${s.bild}" alt="${esc(s.titel)}" />
    ${(s.extra ?? []).map((e) => `<img class="extra" src="bilder/${e}" alt="" />`).join('')}
  </div>`
      : ''
  }
  <p class="beschrieb">${esc(s.text)}</p>
  <div class="notiz">
    <div class="notiz-label">✍️ Verbesserungen / Befunde:</div>
  </div>
</section>`;

const vergleichHtml = (v: Vergleich) => `
  <div class="vgl">
    <h3>${esc(v.titel)}</h3>
    <div class="vgl-zeile">
      <figure><img src="${v.alt}" alt="Vorher" /><figcaption>${esc(v.altLabel)}</figcaption></figure>
      <figure><img src="${v.neu}" alt="Nachher" /><figcaption>Nachher — 0.6.6 (Release-Stand)</figcaption></figure>
    </div>
    <p class="vgl-text">${esc(v.text)}</p>
  </div>`;

/** Vorher/Nachher-Kapitel: 2 Gegenüberstellungen je A4-Seite. */
const vergleichSeiten = (() => {
  const seiten: string[] = [];
  for (let i = 0; i < VERGLEICHE.length; i += 2) {
    const teil = VERGLEICHE.slice(i, i + 2);
    seiten.push(`
<section class="seite">
  <header><h2>Vorher / Nachher — was diese Runde umgebaut hat (${i / 2 + 1}/${Math.ceil(VERGLEICHE.length / 2)})</h2></header>
  ${teil.map(vergleichHtml).join('\n')}
  <div class="notiz">
    <div class="notiz-label">✍️ Verbesserungen / Befunde:</div>
  </div>
</section>`);
  }
  return seiten.join('\n');
})();

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>KosmoOrbit 0.6.6 — Rundgang</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2b2924; }
  .seite { page-break-after: always; display: flex; flex-direction: column; height: 262mm; }
  h2 { font-size: 17pt; font-weight: 600; letter-spacing: 0.01em; border-bottom: 2px solid #2b2924; padding-bottom: 4px; margin-bottom: 10px; }
  .neu { display: inline-block; font-size: 9pt; font-weight: 700; color: #fff; background: #c96a1e; border-radius: 4px; padding: 2px 7px; vertical-align: 3px; margin-left: 6px; }
  .bildzeile { display: flex; gap: 6px; align-items: flex-start; }
  .bildzeile img.haupt { width: 100%; border: 1px solid #b9b2a4; border-radius: 4px; }
  .bildzeile.mit-extra img.haupt { width: 58%; }
  .bildzeile.mit-extra img.extra { width: 20%; flex: 1; border: 1px solid #b9b2a4; border-radius: 4px; }
  .bildzeile.paar img.haupt { width: 49%; }
  .bildzeile.paar img.extra { width: 49%; flex: none; border: 1px solid #b9b2a4; border-radius: 4px; }
  .beschrieb { font-size: 10.5pt; line-height: 1.5; margin: 9px 0 10px; color: #3d3a33; }
  .notiz { flex: 1; border: 1.5px solid #8a857a; border-radius: 8px; padding: 8px 12px;
    background: repeating-linear-gradient(to bottom, transparent 0, transparent 27px, #dcd6c8 27px, #dcd6c8 28px);
    background-origin: content-box; min-height: 40mm; }
  .notiz-label { font-size: 9.5pt; color: #8a857a; font-weight: 600; }
  .vgl { margin-bottom: 7mm; }
  .vgl h3 { font-size: 12.5pt; font-weight: 600; margin-bottom: 4px; }
  .vgl-zeile { display: flex; gap: 6px; }
  .vgl-zeile figure { width: 49.5%; margin: 0; }
  .vgl-zeile img { width: 100%; border: 1px solid #b9b2a4; border-radius: 4px; display: block; }
  .vgl-zeile figcaption { font-size: 8pt; color: #8a857a; margin-top: 2px; font-family: Menlo, monospace; }
  .vgl-text { font-size: 9.5pt; line-height: 1.45; margin-top: 5px; color: #3d3a33; }
  .deckblatt { justify-content: center; align-items: flex-start; padding: 0 8mm; }
  .deckblatt h1 { font-size: 30pt; font-weight: 700; margin-bottom: 4mm; }
  .deckblatt .version { font-size: 13pt; color: #8a857a; margin-bottom: 12mm; }
  .deckblatt ol { font-size: 12pt; line-height: 1.9; padding-left: 6mm; margin-bottom: 10mm; }
  .deckblatt .kasten { border: 1.5px solid #2b2924; border-radius: 8px; padding: 6mm; font-size: 11pt; line-height: 1.6; }
  .deckblatt .kasten b { display: block; margin-bottom: 2mm; }
</style></head><body>

<section class="seite deckblatt">
  <h1>KosmoOrbit — Rundgang zum Kommentieren</h1>
  <div class="version">Stand 0.6.6 · 10.07.2026 · ${SEITEN.length} Stationen &amp; Funktionen + ${VERGLEICHE.length} Vorher/Nachher-Vergleiche</div>
  <ol>
    <li>PDF im Reader öffnen (Adobe Acrobat, Microsoft Edge, Vorschau …).</li>
    <li>Seite für Seite durchgehen — zuerst «Vorher / Nachher», dann je Seite eine Station oder Funktion.</li>
    <li>Mit dem Kommentar-/Textwerkzeug direkt in die linierte Box schreiben: was stört, was fehlt, was anders soll. Auch Handschrift/Stift geht.</li>
    <li>Das kommentierte PDF hier in den Chat zurückschicken.</li>
  </ol>
  <div class="kasten">
    <b>Was diese Runde ist — und was mit deinen Notizen passiert</b>
    0.6.6 heisst «Bewegung &amp; Anpassung»: der Knopfdruck ist jetzt spürbar
    (jeder Knopf sinkt beim Drücken sichtbar ein und federt beim Loslassen),
    eine Arbeitsmodi-Automatik lässt die Oberfläche der Tätigkeit statt dem
    Menü folgen (Modus-Chip, «Mehr…» hält alles erreichbar), Kosmo kann die
    Oberfläche jetzt nicht nur lesen, sondern auch selbst stellen — sichtbar
    quittiert in einer eigenen Chat-Zeile, nie still — und der 3D-Viewport
    rendert nur noch bei Bedarf statt im Dauerbetrieb (0 statt ~16 Bilder/s
    im Leerlauf). Dazu: ein Render-Knopf direkt im 3D-Viewport, eine
    KosmoVis-Kuratier-Fläche für fertige Renderbilder, eine kategorisierte
    Node-Palette, eine Minimap und entzerrte Node-Ketten. Die zehn Punkte
    stehen in <code>neuigkeiten.ts</code> (Version 0.6.6). Seiten mit «NEU»
    zeigen, was seit dem 0.6.5-PDF dazugekommen ist; das Kapitel
    «Vorher / Nachher» direkt nach dieser Seite stellt drei Umbauten Bild
    gegen Bild — mehr gaben die vorhandenen 0.6.5-Bilder ehrlich nicht her
    (eine vierte Gegenüberstellung hätte einen sauberen Vorher-Screenshot
    gebraucht, den es für den 3D-Viewport in dieser Form 0.6.5 noch nicht
    gab). Eine eigene Seite («Bewegung, die sich nicht fotografieren lässt»)
    benennt offen, was ein Standbild-PDF grundsätzlich nicht zeigen kann.
    Deine Notizen zu <b style="display:inline">diesem</b> PDF werden die
    <b style="display:inline">0.6.7-Auftragsliste</b>.
  </div>
</section>
${vergleichSeiten}
${SEITEN.map(seiteHtml).join('\n')}
</body></html>`;

writeFileSync(`${DIR}RUNDGANG.html`, html);

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});
const page = await browser.newPage();
await page.goto(new URL('../../docs/rundgang/RUNDGANG.html', import.meta.url).href, { waitUntil: 'networkidle' });
await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="width:100%;text-align:center;font-size:8px;color:#8a857a;font-family:Menlo,monospace;">KosmoOrbit 0.6.6 — Rundgang &amp; Notizen · Seite <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: '12mm', bottom: '16mm', left: '13mm', right: '13mm' },
});
await browser.close();
console.log(`PDF: ${OUT}`);
