# Architecture Cosmos Benutzerhandbuch und Projektvision

Stand: 2026-05-19

## 1. Grundidee

Architecture Cosmos ist ein zoombarer Wissensraum fuer Architekturgeschichte, Gegenwartsarchitektur, Landschaft, Stadt, Theorie, Quellen und spaetere 3D-Referenzmodelle.

Die Website soll Architektur nicht als lineare Liste zeigen, sondern als raeumlich-zeitlichen Atlas. Der zentrale Metapher ist ein Wurmloch: Beim Scrollen bewegt sich die Kamera durch eine tiefe historische Tube. Jahresringe, Projekte, Quellen, Stile und Relationen erscheinen als Schichten in diesem Raum.

Die Plattform soll langfristig gleichzeitig sein:

- Referenzbibliothek;
- Studienwerkzeug;
- visuelles Archiv;
- Rechercheinterface;
- kuratierter Architekturatlas;
- 3D-Referenzdatenbank fuer Blender, ArchiCAD und KI-Workflows;
- persoenliches und spaeter teilweise oeffentliches Wissensnetzwerk.

## 2. Website-Design

Das Interface bleibt bewusst architektonisch, dunkel, ruhig und technisch:

- schwarzer Grundraum;
- feine weisse und graue Linien;
- dezente, aber lebendige Farbakzente aus Stil- und Quellenlogik;
- keine Marketing-Landingpage, sondern direkt der Atlas als Hauptinterface;
- UI-Elemente wie `Lenses`, `Search`, `Database` und Zeitnavigation bleiben klein, klar und konsistent;
- die Detailseiten sind objektbezogen gestaltet und duerfen Materialfarbe, Bildstimmung und Komposition des jeweiligen Projekts aufnehmen.

Die wichtigste visuelle Regel:

> Immersion zuerst, aber Lesbarkeit und Bedienbarkeit gewinnen immer gegen visuelle Ueberladung.

## 3. Atlas und Navigation

Der Atlas basiert aktuell auf SVG/React und ist technisch konservativ gehalten. Er nutzt:

- Wurmloch-Geometrie;
- Jahresringe bis ca. 9000 v. Chr.;
- Projektpunkte mit Hauptbild-Miniaturen, falls vorhanden;
- Lens-Filter nach Stil und Quellwebseite;
- Relations-Netzwerk;
- Search;
- Database-/Draft-Zugang.

Der Wurmloch-Atlas soll langfristig eine semantische Zoom-Logik behalten:

- weit weg: Zeit, Stil, Punkte, Struktur;
- naeher: Projektidentitaet und Medien;
- Detail: Dossier, Quellen, Analyse, 3D, Material, Tragwerk, Tektonik.

## 4. Datenbank-Vision

Die Datenbank ist nicht nur fuer die Website gedacht. Sie wird die Grundlage fuer ein groesseres AI-Referenzarchiv:

- jedes Objekt hat Text, Quellen, Medien, Plan-/Schnittslots, Tags und Relationen;
- jedes wichtige Objekt soll spaeter ein 3D-Modellpaket haben;
- 3D-Modelle werden in Layern abgelegt: `full`, `structure`, `facade`, `interior`, `site`, `mass`, `materials`;
- Material, Tragwerk, Tektonik, Raumordnung und Kontext werden filterbar;
- Blender/ArchiCAD sollen spaeter Abfragen stellen koennen, z.B. Schweizer Holzbauten des 18. Jahrhunderts mit Satteldach.

Public und Private bleiben getrennt:

- public: eigene Texte, Metadaten, rechteklare Medien, Links, public-domain/licensed/own-work Assets;
- private/dev: persoenliche Recherche, nicht freigegebene Bilder/Plaene, private Modellrekonstruktionen;
- unklare Rechte: link-only oder private, niemals automatisch public.

## 5. AI- und Automation-Vision

Das Ziel ist ein zentrales `Architecture Cosmos Brain`.

Dieses Brain soll langfristig:

- Datenfluss in die Datenbank pruefen;
- neue Quellen und Projekte erkennen;
- Mails, Uploads, PDFs und Bilder in Review-Drafts uebersetzen;
- Copyright- und Rechte-Gates anwenden;
- Material-, Tragwerks- und Tektonikanalysen vorbereiten;
- 3D-Modell-Layer planen;
- UI- und Website-Health ueberwachen;
- Aufgaben priorisieren;
- nach Bestaetigung Code/Daten aendern, testen, committen und publishen.

Wichtig:

> Das Brain darf autonom beobachten, pruefen, diagnostizieren, Reports erzeugen und sichere Checks wiederholen. Grosse Aenderungen fragt es vorher an.

Aktuelle lokale Commands:

```bash
npm run brain:review
npm run brain:doctor
```

Naechster grosser Schritt:

```text
Brain V2: Cloudflare Scheduled Brain
```

Das soll unabhaengig vom Laptop laufen.

## 6. 3D- und Analyse-Werkzeug

Der 3D-Viewer ist ein zentraler Bestandteil der Zukunft. Er soll nicht nur ein Modell anzeigen, sondern Analyse-Schichten steuerbar machen:

- realistische Ansicht;
- Analyse-Ansicht;
- Material-Ansicht;
- Ghost/Transparenz-Ansicht;
- Tragwerk ein/aus;
- Huelle ein/aus;
- Zirkulation ein/aus;
- Site ein/aus;
- Materialfilter wie Beton, Holz, Glas, Stein, Vegetation.

Langfristig sollen Gaussian Splats, Photogrammetrie und KI-generierte Modelle nur genutzt werden, wenn Quelle, Rechte und Genauigkeit klar markiert sind.

## 7. Sicherheit

Security ist Grundarchitektur, nicht Zusatz.

Regeln:

- keine echten Uploads ohne Quarantine;
- keine Public-Datenbank-Writes ohne Rechte- und Security-Gate;
- keine Auth-Funktion ohne Cloudflare Access/Turnstile/Rate-Limit-Konzept;
- keine privaten Assets oeffentlich;
- Secrets niemals ins Repo;
- Cloud-Brain darf ohne Freigabe nicht publishen.

Bestehende Checks:

```bash
npm run security:check
npm run brain:doctor
```

## 8. Arbeitsweise

Standardablauf:

1. Idee oder Quelle entsteht.
2. Brain/Research erzeugt Review Pack.
3. Rechte und Quellen werden bewertet.
4. Public-safe Felder gehen in Datenbank/Website.
5. Private Medien/Modelle bleiben privat oder link-only.
6. Tests laufen.
7. Nach Freigabe wird committed und gepublished.

## 9. Wichtigste offene Tracks

1. Brain V2 als Cloud-Version.
2. Mobile UI gruendlich weiter verbessern.
3. Database/Profile-Coverage fuer alle wichtigen Eintraege erhoehen.
4. Pilotobjekte weiter verfeinern: Villa Savoye, Ingenbohl, MFO Park, High Line, Goebekli Tepe.
5. 3D-Viewer und Blender-Layer tiefer ausbauen.
6. Rechte- und Public/Private-Gate produktionsreif machen.
7. Spaeter: User Private Library mit sicherem Upload- und Review-Prozess.

## 10. Projektidentitaet

Architecture Cosmos ist kein reines Archiv und keine reine Visualisierung. Es ist ein entstehendes Wissensinstrument:

> Ein raeumliches, kuratiertes, lernendes Architekturgedaechtnis, das Website, Datenbank, Quellenarbeit, 3D-Analyse und Entwurfswerkzeug miteinander verbindet.

