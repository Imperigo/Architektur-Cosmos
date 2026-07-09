/**
 * Rundgang-PDF «0.6.5» (Fable-Intelligenz-Tag, 09.07.) — Teil 2: HTML → PDF.
 * Baut aus den Bildern von `rundgang.mts` ein Kommentier-Dokument: je
 * Station/Feature eine A4-Seite mit Screenshot, kurzem Beschrieb und einer
 * grossen linierten Notiz-Box zum Reinschreiben im PDF-Reader. Diese Runde
 * ist die UI/UX-Gesamtüberarbeitung — die 11 Punkte stehen in
 * `apps/kosmo-orbit/src/shell/neuigkeiten.ts` (Version 0.6.5), die zwei
 * Kritik-Runden in `docs/UI-SELBSTKRITIK-065.md`; beides ist die ehrliche
 * Quelle für die Texte unten. NEU: ein «Vorher / Nachher»-Kapitel direkt
 * nach dem Deckblatt — die Vorher-Bilder kommen pinned aus Git
 * (Commit 4eb6965 = 0.6.4-Rundgang, Commit 0ee01f6 = Kritik-Runde-1-Stand
 * vom Morgen) und werden beim Bauen nach docs/rundgang/vorher-065/
 * extrahiert; es braucht dafür KEINE neuen Screenshots. Die Notizen zu
 * DIESEM PDF werden die Auftragsliste der 0.6.6-Runde.
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const DIR = new URL('../../docs/rundgang/', import.meta.url).pathname;
const OUT = new URL('../../abgabe/RUNDGANG-NOTIZEN-0.6.5.pdf', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });

// ── Vorher-Bilder aus Git extrahieren (pinned, reproduzierbar) ────────────
// 0ee01f6 = «Kritik-Runde 1»-Screenshots (Morgen des 09.07., nach dem
// grossen Umbau, VOR den zwei Fix-Runden); 4eb6965 = Rundgang-Bilder 0.6.4.
const VORHER = `${DIR}vorher-065/`;
mkdirSync(VORHER, { recursive: true });
const ausGit = (ref: string, ziel: string) =>
  writeFileSync(`${VORHER}${ziel}`, execSync(`git show ${ref}`, { cwd: DIR, maxBuffer: 32 * 1024 * 1024 }));
ausGit('4eb6965:kosmo-orbit/docs/rundgang/bilder/05-design-uebersicht.png', 'design-kopf-064.png');
ausGit('0ee01f6:kosmo-orbit/docs/rundgang/kritik-065/p-06-vis-graph.png', 'vis-graph-runde1.png');
ausGit('0ee01f6:kosmo-orbit/docs/rundgang/kritik-065/p-07-data-referenzen.png', 'data-referenzen-runde1.png');
ausGit('0ee01f6:kosmo-orbit/docs/rundgang/kritik-065/p-02-zentrale-faecher.png', 'zentrale-faecher-runde1.png');

interface Seite {
  bild: string;
  titel: string;
  neu?: boolean;
  text: string;
  /** Zusätzliche Bilder (kleiner, nebeneinander). */
  extra?: string[];
  /** Für Vergleichspaare (z.B. LOD nah/fern): beide Bilder gleich gross. */
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
    titel: 'KosmoDesign — Werkzeugkopf',
    alt: 'vorher-065/design-kopf-064.png',
    altLabel: 'Vorher — 0.6.4 (gestern)',
    neu: 'bilder/05-design-uebersicht.png',
    text: 'Vorher stapelten sich DREI Werkzeugzeilen übereinander (Werkzeuge, Export-Knopfreihe, Ansicht/Fähigkeiten). Neu: EINE Hauptzeile mit den Zeichenwerkzeugen plus eine Kontextzeile, in der der Export als aufklappbare gerahmte Gruppe lebt; die Geschossleiste ist eine gerahmte Karte am linken Rand, Statusleiste und Navigation teilen sich keine Ecke mehr. Ausserdem im neuen Bild sichtbar: die früher rätselhafte leere Zonenfläche im Plan trägt jetzt Name und Warnzeichen («⚠ Foyer / Ausleihe»).',
  },
  {
    titel: 'KosmoVis — Node-Graph («Drei Stimmungen»)',
    alt: 'vorher-065/vis-graph-runde1.png',
    altLabel: 'Vorher — Kritik-Runde 1 (Morgen des 09.07.)',
    neu: 'kritik-065/p-06-vis-graph.png',
    text: 'Das Vorher-Bild ist der Stand vom Morgen: der neue Node-Look (Kategorie-Zeichen, Farbton, Legende) stand schon, aber die Kritik-Runde fand blockierende Befunde — die Zweitfelder des V-H4-Formulars (Fassade/Szene, Jahreszeit/Personen) waren am Kartenrand abgeschnitten, der aktive Tab war eine Vollfüllung statt eines Unterstrichs, Portbeschriftungen zu blass. Neu: die Formularfelder sitzen vollständig in zwei Spalten in der Karte, Tab mit Unterstrich, Portlabels in voller Tusche.',
  },
  {
    titel: 'KosmoData — Referenzkarten',
    alt: 'vorher-065/data-referenzen-runde1.png',
    altLabel: 'Vorher — Kritik-Runde 1 (Morgen des 09.07.)',
    neu: 'bilder/19-data-referenzen.png',
    text: 'Vorher: Karten ohne Foto waren stumme leere Farbflächen — das gezeichnete Leerbild-Signet fehlte auf ~108 von 112 Karten (Kritik-Befund A8); «Sync» und «Oberfläche zurücksetzen» standen als nackte Textlinks neben einem doppelten Zahnrad. Neu: jede fotolose Karte trägt das Signet mit «kein Bild hinterlegt», Sync/Zurücksetzen/Stations-Einstellungen sind klare beschriftete Knöpfe, und die Karten heben sich über Linienstärke statt Schatten.',
  },
  {
    titel: 'Zentrale — Orbit mit offenem Fächer',
    alt: 'vorher-065/zentrale-faecher-runde1.png',
    altLabel: 'Vorher — Kritik-Runde 1 (Morgen des 09.07.)',
    neu: 'bilder/01-orbit-faecher-design.png',
    text: 'Vorher schnitten die Werkzeug-Namen den Kreisrand (Kritik-Befund A6, «KosmoDesign» klebt im Kreis), in der Mitte kreiste ein unbeschrifteter Knoten mit dupliziertem Kosmo-Zeichen (A7), und «Katalog ↓ / Katalog ↑» waren verwirrende Textlinks im Fliesstext. Neu: die Titel sitzen frei UNTER den Kreisen, der Duplikat-Knoten ist weg, Katalog sichern/laden sind klare Knöpfe — der Fächer besteht weiterhin aus echten Karteikarten.',
  },
];

const SEITEN: Seite[] = [
  {
    bild: '00-erste-start-frage.png',
    titel: 'Erster Start — «Neu hier?»',
    text: 'Aus 0.6.3, Funktion unverändert diese Runde: beim allerersten Start fragt Kosmo in der Zentrale, ob ein Rundgang gewünscht ist. «Nein» heisst nie wieder — die Frage lässt sich über das «?» in der Kopfleiste jederzeit erneut auslösen.',
  },
  {
    bild: '01-orbit-start.png',
    titel: 'Orbit-Startmenü — aufgeräumte Zentrale',
    neu: true,
    extra: ['01-orbit-faecher-design.png'],
    text: 'Das Orbit-Startmenü kam in 0.6.4; diese Runde hat es aufgeräumt: die Werkzeug-Namen sitzen jetzt UNTER den Kreisen statt darin (vorher schnitten sie den Kreisrand), der Fächer besteht aus echten Karteikarten mit Titel und Kurzbeschrieb (Extra-Bild: KosmoDesign mit Draw/Prepare/Vis/Publish/Modellbaum), «Katalog sichern/laden» sind klare Knöpfe statt ↓/↑-Textlinks, und der unbeschriftete Duplikat-Knoten in der Ringmitte ist entfernt. Die Fächer-Reserve ist statisch — beim Hover springt das Layout nicht mehr; die dadurch bleibende Leerfläche im Ruhezustand ist ein ehrlich dokumentierter 0.6.6-Punkt.',
  },
  {
    bild: '02-kosmo-symbol-mini.png',
    titel: 'Kosmo — Symbol statt Dauerchat',
    text: 'Aus 0.6.3, Funktion unverändert diese Runde: Kosmo bleibt ein schwebendes Symbol statt eines dauerhaft offenen Panels. Hover zeigt ein Mini-Popup mit der letzten Aktivität, ein Klick entfaltet bei Bedarf das grosse Panel.',
  },
  {
    bild: '03-einstellungen.png',
    titel: 'Einstellungs-Panel — gestalteter Dialog',
    neu: true,
    extra: ['03-einstellungen-neuigkeiten.png', '03-einstellungen-leistung.png'],
    text: 'Die Einstellungen haben jetzt einen gestalteten Kopf mit Schliessen-Zeichen (gezeichnetes ✕ aus der neuen Icon-Bibliothek statt Emoji) und einen sichtbaren Scrollbalken — vorher scrollte der Inhalt zwar, wirkte aber hart abgeschnitten (Runde-2-Nachzügler). «Funktionen & Neues» führt die elf 0.6.5-Punkte zuoberst (mittleres Extra-Bild). Die Sektionen System (Deinstallieren, siehe letzte Seite), Darstellung (Farbpalette) und Leistung (rechtes Extra-Bild) bleiben inhaltlich wie in 0.6.4.',
  },
  {
    bild: '04-kurztasten-uebersicht.png',
    titel: 'Werkzeug-Kurztasten + «?»-Übersicht',
    text: 'Aus 0.6.4 (F5/F9, «wie ArchiCAD»), Funktion unverändert diese Runde: «?» blendet die Kurzbefehl-Übersicht ein, der Abschnitt «Zeichnen» zeigt die Werkzeug-Kurztasten (A Auswahl, W Wand, Z Zone, V Volumen, D Dach, T Treppe, C Stütze, S Schnitt, F Freihand-Skizze) plus «Leertaste halten + ziehen» fürs Verschieben im 2D-Plan. Die Kurztasten wirken nie, solange ein Eingabefeld den Fokus hat.',
  },
  {
    bild: '05-design-uebersicht.png',
    titel: 'KosmoDesign — entrümpelter Kopf',
    neu: true,
    extra: ['05-design-4er.png'],
    text: 'Der Werkzeugkopf schrumpfte von drei gestapelten Zeilen auf EINE Hauptzeile (Zeichenwerkzeuge) plus eine Kontextzeile: der Export ist dort eine aufklappbare gerahmte Gruppe (im Bild offen: PDF/SVG/DXF/IFC …) und verdrängt Rückgängig/Wiederholen nicht mehr, die Geschossleiste ist eine gerahmte Karte am linken Rand, Statusleiste und Navigation teilen sich keine Ecke mehr. Ebenfalls neu und im Bild: die früher rätselhafte leere Zonenfläche im Plan trägt Name und Warnzeichen («⚠ Foyer / Ausleihe») und behält ihren Rahmen in jeder Zoomstufe. Der 4er-Splitscreen (Extra-Bild) bleibt unverändert nutzbar. Vergleich mit 0.6.4: Seite «Vorher / Nachher» vorne.',
  },
  {
    bild: '06-mass-eingabe.png',
    titel: 'Masszahl am Cursor — «Zahlen zur Hand»',
    text: 'Aus 0.6.4 (F5), Funktion unverändert diese Runde: beim Zeichnen läuft eine Live-Masszahl am Cursor mit (hier «3.5 m ⏎» nach dem Tippen von «3.5»); Enter setzt den nächsten Punkt exakt in dieser Länge, ohne erneutes Raster-Snapping — die Zahl ist die Absicht.',
  },
  {
    bild: '07-element-fang.png',
    titel: 'Element-Fang — Fangpunkt-Marker beim Zeichnen',
    text: 'Aus 0.6.4 (F4), Funktion unverändert diese Runde: das Quadrat am Wandende ist der Fangpunkt-Marker (Typ «endpunkt»), er erscheint erst innerhalb des Fangradius und zieht den nächsten Klick exakt auf die Bauteilgeometrie statt aufs 250er-Raster. Ausserhalb des Radius bleibt der Marker weg — der Fang drängt sich nicht auf.',
  },
  {
    bild: '08-plan-lod-voll.png',
    titel: 'Plan-LOD — Detailstufe aus der Distanz',
    extra: ['08-plan-lod-fern.png'],
    paar: true,
    text: 'Aus 0.6.3, unverändert diese Runde: nah dran (links) zeigt Bemassung, Raster und Möbel; weit weg (rechts) bleiben nur Poché und Fenstersymbole. Reine Anzeige-Umschaltung, der Plansatz-Export bleibt unverändert.',
  },
  {
    bild: '09-skizzieren-annaeherungen.png',
    titel: 'Skizzieren — drei Annäherungen',
    text: 'Aus 0.6.3, unverändert diese Runde: ein Freihand-Strich im Skizzieren-Modus ergibt am Übergabe-Moment drei Karten (u.a. eine orthogonalisierte Variante), als EIN atomarer Undo-Schritt.',
  },
  {
    bild: '10-kosmo-vorschlag-vorschau.png',
    titel: 'Kosmo-Vorschlagskarte — mit Vorschau',
    text: 'Aus 0.6.3, unverändert diese Runde: die Diff-Karte zeigt einen Vorher/Nachher-Mini-Grundriss statt nur Text — ehrlich nur dort, wo die Vorschau tatsächlich berechenbar ist.',
  },
  {
    bild: '11-phasen-preset-banner.png',
    titel: 'Phasen-Presets — Angebot, nie stumm',
    text: 'Aus 0.6.3, unverändert diese Runde: wechselt die SIA-Teilphase, bietet Kosmo passende Fähigkeits-Icons als Fokus an. «Nicht jetzt» lässt alles unverändert.',
  },
  {
    bild: '12-kv-panel.png',
    titel: 'KV-Grobschätzung',
    text: 'Aus 0.6.3, Funktion unverändert diese Runde: Richtwert-Kostenvoranschlag auf GF-Basis mit stets sichtbarem Ehrlichkeits-Hinweis («kein Devis, keine NPK-Positionen»).',
  },
  {
    bild: '13-bauablauf-panel.png',
    titel: 'Bauablaufplan',
    text: 'Aus 0.6.3, Funktion unverändert diese Runde: abgeleiteter Grob-Terminplan mit fester Gewerke-Reihenfolge, Export als druckfähiges SVG-Blatt. Hinweis «ersetzt keine Bauleitung» steht permanent im Panel.',
  },
  {
    bild: '14-maengel-panel.png',
    titel: 'Mängel & Abnahme',
    text: 'Aus 0.6.3, Funktion unverändert diese Runde: Mängel erfassen, Status umschalten, Abnahmeprotokoll als SVG exportieren — kein rechtsgültiges SIA-118-Protokoll.',
  },
  {
    bild: '15-baugesuch.png',
    titel: 'Baugesuch-Blattsatz — Publish in der neuen Sprache',
    neu: true,
    text: 'Funktion aus 0.6.3 unverändert: ein Klick erzeugt mehrere Blätter plus ein Set «Baugesuch»; fehlende Grundlagen werden als ehrliche Lücken-Meldung benannt statt eines stillen Teilerfolgs. NEU 0.6.5: KosmoPublish spricht dieselbe Formensprache wie die übrigen Stationen — eine klare Knopf-Hierarchie statt dreier konkurrierender Füllflächen (Baugesuch/Plansatz PDF/Blatt füllen), gerahmte Export-Gruppen, und das Set-Namensfeld schneidet seinen Platzhalter nicht mehr ab (Kritik-Befund A10).',
  },
  {
    bild: '16-blatt-fuellen.png',
    titel: 'Blatt füllen',
    text: 'Aus 0.6.3, Funktion unverändert diese Runde: platziert Grundriss, Axonometrie, Kennzahlen-Textblock und Render-Platzhalter atomar und meldet ehrlich, was im Modell fehlt.',
  },
  {
    bild: '17-vis-graph.png',
    titel: 'KosmoVis — Node-Graph neu gedacht',
    neu: true,
    text: 'Der Node-Editor wurde grundüberholt: jeder Node trägt ein Kategorie-Zeichen und einen Farbton, lange Texte klappen («… mehr») statt überzulaufen, die Zoom-Knöpfe unten rechts haben ein «Einpassen», und die Legende unten links erklärt die Anschlussfarben (Szene, Material, Bild, Prompt, Zahl, Kameras). NEU auch «Rendern in Architektensprache»: der Render-Node fragt Fassade, Szene, Jahreszeit und Personen als Formular ab (V-H4) — der daraus gebaute Prompt bleibt als Text im Node sichtbar, nichts passiert im Verborgenen. Das Bild zeigt den Zustand nach «+ Drei Stimmungen» (Morgenlicht/Abendstimmung/Weissmodell) samt der Default-Kette und dem Bildvergleich-Node. Ehrlicher Befund im Bild: wo die Default-Kette und die dritte Stimmungs-Kette zusammenstossen, überlagern sich Karten noch — Mehrfachauswahl/Ausrichten im Node-Editor steht auf der 0.6.6-Liste.',
  },
  {
    bild: '17-vis-automatik.png',
    titel: 'KosmoVis — Automatik (Auto-Kamera, Presets, Render)',
    text: 'Aus 0.6.3/0.6.4, Funktion unverändert diese Runde: «Kamera vorschlagen» erzeugt Kamera-Standpunkte, Cycles-Presets wählen die Render-Qualität, «Ausführen» schickt den Job an die (hier Fake-)Bridge — das Ergebnisbild hängt am Render-Node. Der 0.6.4-Auto-Fit beim Öffnen bleibt.',
  },
  {
    bild: '18-material-wuerfel.png',
    titel: 'Materialbibliothek — Würfel-Vorschau',
    text: 'Aus 0.6.3, Funktion unverändert diese Runde: jedes Material zeigt einen 3D-Würfel (echte Canvas-Vorschau), echte Dimensionen und eine Pflicht-Quelle. Die Werkzeugzeile der Asset-Station folgt neu der gemeinsamen 0.6.5-Formensprache.',
  },
  {
    bild: '19-data-referenzen.png',
    titel: 'KosmoData — Leerbild-Signete statt leerer Flächen',
    neu: true,
    extra: ['19-data-bauteile.png'],
    text: 'KosmoData zeigt Ehrlichkeit jetzt auch im Bild: Referenzkarten ohne hinterlegtes Foto tragen ein gezeichnetes Signet mit «kein Bild hinterlegt» statt einer leeren Farbfläche (vorher fehlte das Signet auf ~108 von 112 Karten), und Karten heben sich über Linienstärke statt Schatten. Sync, «Oberfläche zurücksetzen» und die Stations-Einstellungen sind klare beschriftete Knöpfe. Der ehrliche Offline-Badge («Offline — eingebaute Referenzdaten, Stand vom Build») bleibt aus 0.6.4. Rechtes Extra-Bild: der CH-Bauteilkatalog unter demselben Dach.',
  },
  {
    bild: '20-dev-auftragsbuch.png',
    titel: 'KosmoDev — Auftragsbuch',
    text: 'Funktion unverändert diese Runde: deine Aufträge an die Software-Werkstatt erfassen, priorisieren, als Workorder exportieren — genau hier landen auch deine Notizen aus diesem PDF. Die Werkzeugzeile folgt neu der gemeinsamen Formensprache (ein Primärknopf je Bereich).',
  },
  {
    bild: '21-prepare.png',
    titel: 'KosmoPrepare / KosmoDoc / KosmoTrain',
    extra: ['21-doc.png', '21-train.png'],
    text: 'Wissens-Ingest, Diagnose/Hilfe/Berichte und Kosmos Lernstand mit Kuration — Funktion unverändert diese Runde. NEU 0.6.5 an allen dreien: dieselbe Formensprache wie überall (ein Primärknopf je Bereich, gerahmte Export-Gruppen, gezeichnete Leerzustände statt leerer Flächen, gruppierte Werkzeugzeilen). Der Doc-Tab «Tech-Radar» hat eine eigene Seite (nächste Seite).',
  },
  {
    bild: '21-doc-tech-radar.png',
    titel: 'KosmoDoc — Tech-Radar',
    text: 'Aus 0.6.4, Inhalt unverändert diese Runde: worauf die Software technisch steht (Adopt/Selbst/Reject je Baustein) und was noch beobachtet wird, in einer kuratierten Liste (mind. 20 Posten). Einträge aus dem Notion-Scan sind ehrlich mit ⚠ markiert, weil noch nicht selbst verifiziert — verifizierter Bestand (z.B. camera-controls) trägt kein Warnzeichen.',
  },
  {
    bild: '22-draw.png',
    titel: 'KosmoDraw — Modellbaum · Mengen · Ausmass',
    extra: ['22-sketch.png'],
    text: 'Aus 0.6.3/0.6.4, Funktion unverändert diese Runde: Mengen, Ausmass und Berechnungsliste aus dem Modell; daneben KosmoSketch fürs freie Zeichnen (Extra-Bild), dessen «Übergeben»-Knopf seit dem 0.6.4-Fix frei liegt.',
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
    text: 'Aus 0.6.4 (F1), Funktion unverändert diese Runde: im Kosmo-Panel (Zahnrad → Betriebsart Cloud) steht ein Modell-Select mit den aktuellen Claude-Modellen (Opus 4.8 als Owner-Default, Sonnet, Haiku) plus Freitext-Override — die Wahl übersteht einen Reload. Fehlt die Anthropic-CLI für die Abo-Anmeldung, erklärt ein bleibender Hinweis Installation und den API-Schlüssel-Weg.',
  },
  {
    bild: '28-deinstallieren.png',
    titel: 'App deinstallieren — in den Einstellungen',
    text: 'Aus 0.6.4 (F2, «eine Funktion, ein Ort»), Funktion unverändert diese Runde: der Einstieg wohnt nur in den Einstellungen (Sektion «System»). Der Dialog bleibt ehrlich: KosmoOrbit kann sich als Tauri-App nicht selbst deinstallieren, das Panel zeigt die OS-Kurzanleitung (Windows/macOS/Linux) und den Link auf die Website.',
  },
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const seiteHtml = (s: Seite) => `
<section class="seite">
  <header>
    <h2>${esc(s.titel)}${s.neu ? ' <span class="neu">NEU</span>' : ''}</h2>
  </header>
  <div class="bildzeile${s.extra ? ' mit-extra' : ''}${s.paar ? ' paar' : ''}">
    <img class="haupt" src="bilder/${s.bild}" alt="${esc(s.titel)}" />
    ${(s.extra ?? []).map((e) => `<img class="extra" src="bilder/${e}" alt="" />`).join('')}
  </div>
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
      <figure><img src="${v.neu}" alt="Nachher" /><figcaption>Nachher — 0.6.5 (Release-Stand)</figcaption></figure>
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
<html lang="de"><head><meta charset="utf-8"><title>KosmoOrbit 0.6.5 — Rundgang</title>
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
  <div class="version">Stand 0.6.5 · 09.07.2026 · ${SEITEN.length} Stationen &amp; Funktionen + ${VERGLEICHE.length} Vorher/Nachher-Vergleiche</div>
  <ol>
    <li>PDF im Reader öffnen (Adobe Acrobat, Microsoft Edge, Vorschau …).</li>
    <li>Seite für Seite durchgehen — zuerst «Vorher / Nachher», dann je Seite eine Station oder Funktion.</li>
    <li>Mit dem Kommentar-/Textwerkzeug direkt in die linierte Box schreiben: was stört, was fehlt, was anders soll. Auch Handschrift/Stift geht.</li>
    <li>Das kommentierte PDF hier in den Chat zurückschicken.</li>
  </ol>
  <div class="kasten">
    <b>Was diese Runde ist — und was mit deinen Notizen passiert</b>
    0.6.5 ist die Gesamtüberarbeitung der Oberfläche («Fable-Intelligenz-Tag»):
    ein Guss statt Flickwerk — neue Abstands- und Schrift-Skalen, gestylte
    Auswahlfelder/Tabs/Menüs/Dialoge/Chips, eine eigene Zeichen-Bibliothek mit
    30 Tusche-Icons (die Emoji-Bedienelemente sind ersetzt), KosmoVis neu
    gedacht (Kategorie-Zeichen, Zoom mit «Einpassen», Legende, Render-Formular
    in Architektensprache), der KosmoDesign-Kopf entrümpelt, beschriftete
    verletzte Zonen, Leerbild-Signete in KosmoData, aufgeräumte Zentrale und
    Einstellungen — die elf Punkte stehen in <code>neuigkeiten.ts</code>
    (Version 0.6.5). Dazu liefen zwei Runden maschineller Selbstkritik mit
    Nachprüfung (11 blockierende + 12 sichtbare Befunde behoben, Restliste =
    0.6.6-Arbeitsliste, siehe <code>docs/UI-SELBSTKRITIK-065.md</code>).
    Seiten mit «NEU» zeigen, was seit dem 0.6.4-PDF dazugekommen ist; das
    Kapitel «Vorher / Nachher» direkt nach dieser Seite stellt vier Umbauten
    Bild gegen Bild. Deine Notizen zu <b style="display:inline">diesem</b>
    PDF werden die <b style="display:inline">0.6.6-Auftragsliste</b>.
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
    '<div style="width:100%;text-align:center;font-size:8px;color:#8a857a;font-family:Menlo,monospace;">KosmoOrbit 0.6.5 — Rundgang &amp; Notizen · Seite <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: '12mm', bottom: '16mm', left: '13mm', right: '13mm' },
});
await browser.close();
console.log(`PDF: ${OUT}`);
