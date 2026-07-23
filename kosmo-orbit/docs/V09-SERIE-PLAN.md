# 0.9er-Serie — ArchiCAD-Nachbau-Fahrplan (Owner-Entscheid 23.07.2026)

> Owner (23.07., nach der Lücken-Inventur in v0.9.2): **«wir packen alles in
> die 0.9er serie»** — alle sechs identifizierten ArchiCAD-Lücken werden VOR
> v1.0 gebaut. Präzisierung Owner (23.07.): **die Serie wird LANG** — v1.0
> kommt erst in ~einem Monat, die 0.9er-Serie läuft «sicherlich bis z.B.
> 0.9.50». Die Zuschnitte unten sind darum nur die NÄCHSTEN Slots, kein
> Serienende: danach geht es im selben Takt weiter (laufendes
> Owner-Feedback im jeweils offenen Batch + weitere Posten je W0).
> Rahmenregeln unverändert: genau EIN deklarierter Golden-Zug pro Version
> (Golden-Beweger nach 089-Regime mit Erwartungsliste), Betriebsregime für
> die GANZE Serie (release-gate light, kein Voll-E2E, keine Installer —
> beides kehrt erst für v1.0 zurück, `../STAND.md`).

## Versionszuschnitt (Fable-Vorschlag, je Version revidierbar beim W0)

**v0.9.3** — Detail v2 + Treppe/Geländer-Vertiefung
- Detail-Zeichnen im Ausschnitt + Detail-Marker-Symbol im Druck
  (= **der EINE Golden-Zug**, seit 0.9.2 deklariert; dazu Griffe/hit-test
  für die Marker + Editier-UI name/massstab).
- Treppen-Vollausbau: L-/U-Läufe, Podeste (Wendelung nur wenn der
  Zerlegungs-Aufwand es hergibt — sonst ehrlich 0.9.4). Bestands-Fixtures
  bleiben gerade Läufe → Goldens byte-still (Daten-Guard).
- Assoziatives Geländer AUF Treppe/Rampe (Bauteil-Bindung statt freier
  Polylinie; ohne Bindungs-Feld exakt heutiges Verhalten — Golden-Guard).
- Beschnitt-Sonde wird fester release-gate-Schritt (Beschluss 0.9.2 P-U).

**v0.9.4** — Bemassungs-Vollausbau + Normprofile
- Höhenkoten im Grundriss + Winkel-/Radialmass
  (= **der EINE Golden-Zug**: Koten/Winkel im Druckweg, Masskette-Grammatik).
- Normprofil-Katalog HEA/HEB/IPE/UNP als Datenposten für den
  Profil-Manager (reine Daten + Auswahl-UI, Goldens 0).

**v0.9.5** — Fassade v2
- Echtes Fassadenraster (Pfosten/Riegel-Raster mit Paneel-Typen) auf der
  Fensterband-/Curtain-Wall-v1-Basis
  (= **der EINE Golden-Zug**: Fassadendarstellung im Plan/Schnitt).

**v0.9.6** — Solid-Operationen (SEO)
- Boolesches Abziehen/Verschneiden zwischen Bauteilen (ArchiCAD-SEO-Kern);
  Zuschnitt des Golden-Zugs beim W0 (vermutlich Schnitt-Darstellung).

**v0.9.7 … v0.9.x** — Serie läuft weiter (Owner: bis ~0.9.50 denkbar):
laufendes Owner-Feedback, Werkzeug-Vertiefungen, KosmoSpez/Sonnenstudien-
Kandidaten, HomeStation-Posten — je Version ein W0 mit Owner-Entscheiden,
gleiche Gates, gleicher Takt.

**v1.0** (~in einem Monat, Owner 23.07.) — Rückkehr von
Voll-E2E-Komplettlauf + Installer-Zustellung (Regime-Ende),
Konsolidierung, keine neuen Werkzeuge.

## Nicht Teil dieses Entscheids
Laufendes Owner-Feedback wird weiterhin im jeweils offenen Versions-Batch
miterledigt (stehende Regel 23.07.); KosmoTrain-Ingest bleibt bedingt
(Worker-Bericht); Sonnenstudien/HDD-Index/Serie H/I/J unverändert offen.
